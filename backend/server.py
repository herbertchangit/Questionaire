from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import jwt
import asyncio
import io
import csv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="EduQuiz API", version="2.0")
api_router = APIRouter(prefix="/api")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

JWT_SECRET = os.environ.get('JWT_SECRET', 'default_secret')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
JWT_EXPIRATION_HOURS = int(os.environ.get('JWT_EXPIRATION_HOURS', 720))

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class LatestMarks(BaseModel):
    bm: int = Field(ge=0, le=100, default=0)
    sejarah: int = Field(ge=0, le=100, default=0)
    science: int = Field(ge=0, le=100, default=0)

class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=100)
    email: EmailStr
    password: str = Field(min_length=6, max_length=100)
    full_name: str = Field(min_length=2, max_length=100)
    school_name: str = Field(min_length=2, max_length=200)
    town: str = Field(min_length=2, max_length=100)
    current_grade: int = Field(ge=1, le=6)  # Form 1-6
    date_of_birth: str  # YYYY-MM-DD format
    latest_marks: LatestMarks
    language: str = "en"

class UserLogin(BaseModel):
    username: str  # accepts either username OR email
    password: str
    remember_me: bool = False

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    username: str
    email: Optional[str] = None
    full_name: str
    school_name: str
    town: str
    current_grade: int
    date_of_birth: str
    latest_marks: Dict[str, int] = {}
    role: str = "user"
    language: str = "en"
    profile_picture: Optional[str] = None  # base64 data URL
    total_points: int = 0
    current_level: int = 1
    stages_completed: List[str] = []
    total_time_spent: int = 0
    quizzes_completed: int = 0
    # New progression fields (Apprentice / Master / Legend)
    apprentice_completed: int = 0
    master_completed: int = 0
    legend_completed: int = 0
    total_questions_answered: int = 0
    total_correct_answers: int = 0
    level_up_date: Optional[str] = None
    coins: int = 0
    xp: int = 0
    badges: List[str] = []
    last_login_at: Optional[str] = None
    previous_login_at: Optional[str] = None
    created_at: str

class ProfilePictureUpdate(BaseModel):
    profile_picture: Optional[str] = None  # base64 data URL or null to clear

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    school_name: Optional[str] = None
    town: Optional[str] = None
    current_grade: Optional[int] = None
    date_of_birth: Optional[str] = None
    latest_marks: Optional[LatestMarks] = None
    language: Optional[str] = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class LanguageUpdate(BaseModel):
    language: str

class QuizSubmission(BaseModel):
    answers: Dict[str, int]
    time_spent: int

class QuestionCreate(BaseModel):
    subject_id: str
    level_num: int
    stage_num: int
    text_en: str
    text_zh: str
    options_en: List[str]
    options_zh: List[str]
    correct_answer: int
    points: int = 10
    difficulty: str = "apprentice"  # apprentice | master | legend
    sequence_number: int = 0
    story_board_en: Optional[str] = None
    story_board_zh: Optional[str] = None
    image: Optional[str] = None  # data:image/... base64, max ~1MB
    audio: Optional[str] = None  # data:audio/... base64, max ~3MB

class NoticeCreate(BaseModel):
    title_en: str
    title_zh: str
    content_en: str
    content_zh: str
    type: str = "announcement"

# ==================== AUTH HELPERS ====================

def create_token(user_id: str, username: str, role: str, remember_me: bool = False) -> str:
    # If remember_me, token lasts 30 days; otherwise 24 hours
    hours = 720 if remember_me else 24
    exp = datetime.now(timezone.utc) + timedelta(hours=hours)
    payload = {"user_id": user_id, "username": username, "role": role, "exp": exp}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return User(**user)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_admin_user(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

async def log_activity(user_id: str, action: str, metadata: dict = None):
    await db.activity_logs.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "action": action,
        "metadata": metadata or {},
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    import re
    # Username validation: allow plain (letters/numbers/_) OR email-format
    username_raw = user_data.username.strip()
    plain_re = r'^[a-zA-Z0-9_]{3,30}$'
    email_re = r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$'
    if not (re.match(plain_re, username_raw) or re.match(email_re, username_raw)):
        raise HTTPException(
            status_code=400,
            detail="Username must be 3-30 letters/numbers/underscores OR a valid email address"
        )
    
    username = username_raw.lower()
    email = user_data.email.lower()
    
    # Check uniqueness for username
    existing_username = await db.users.find_one({"username": username}, {"_id": 0})
    if existing_username:
        raise HTTPException(status_code=400, detail="Username already taken")
    
    # Check uniqueness for email (across email field and username field — since username can be email)
    existing_email = await db.users.find_one(
        {"$or": [{"email": email}, {"username": email}]},
        {"_id": 0}
    )
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # If username itself is email-format, ensure it matches the provided email
    if re.match(email_re, username) and username != email:
        raise HTTPException(
            status_code=400,
            detail="When using email as username, it must match your email address"
        )
    
    # Validate date of birth format
    try:
        dob = datetime.strptime(user_data.date_of_birth, "%Y-%m-%d")
        age = (datetime.now() - dob).days // 365
        if age < 10 or age > 20:
            raise HTTPException(status_code=400, detail="Age must be between 10-20 years for secondary school")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    # Validate marks
    marks = user_data.latest_marks
    if not (0 <= marks.bm <= 100 and 0 <= marks.sejarah <= 100 and 0 <= marks.science <= 100):
        raise HTTPException(status_code=400, detail="Marks must be between 0 and 100")
    
    user_id = str(uuid.uuid4())
    hashed_password = pwd_context.hash(user_data.password)
    
    user_doc = {
        "id": user_id,
        "username": username,
        "email": email,
        "password": hashed_password,
        "full_name": user_data.full_name,
        "school_name": user_data.school_name,
        "town": user_data.town,
        "current_grade": user_data.current_grade,
        "date_of_birth": user_data.date_of_birth,
        "latest_marks": {
            "bm": marks.bm,
            "sejarah": marks.sejarah,
            "science": marks.science
        },
        "role": "user",
        "language": user_data.language,
        "total_points": 0,
        "current_level": 1,
        "stages_completed": [],
        "total_time_spent": 0,
        "quizzes_completed": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    token = create_token(user_id, username, "user", False)
    
    user_response = {k: v for k, v in user_doc.items() if k not in ("password", "_id")}
    return {"token": token, "user": user_response, "message": "Registration successful"}

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    # Accept either username or email - look up by both
    identifier = credentials.username.strip().lower()
    user = await db.users.find_one(
        {"$or": [{"username": identifier}, {"email": identifier}]},
        {"_id": 0}
    )
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    if not pwd_context.verify(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    await log_activity(user["id"], "login")
    
    # Track login timestamps: previous_login_at = old last_login_at, last_login_at = now
    now_iso = datetime.now(timezone.utc).isoformat()
    previous_login = user.get("last_login_at")
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"previous_login_at": previous_login, "last_login_at": now_iso}}
    )
    user["previous_login_at"] = previous_login
    user["last_login_at"] = now_iso
    
    token = create_token(user["id"], user["username"], user["role"], credentials.remember_me)
    user_response = {k: v for k, v in user.items() if k != "password"}
    
    return {
        "token": token, 
        "user": user_response,
        "message": "Login successful",
        "remember_me": credentials.remember_me
    }

@api_router.get("/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# ==================== USER ROUTES ====================

@api_router.put("/user/language")
async def update_language(data: LanguageUpdate, current_user: User = Depends(get_current_user)):
    if data.language not in ["en", "zh"]:
        raise HTTPException(status_code=400, detail="Invalid language. Use 'en' or 'zh'")
    
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {"language": data.language}}
    )
    return {"message": "Language updated", "language": data.language}

@api_router.put("/user/profile")
async def update_profile(profile_data: UserProfileUpdate, current_user: User = Depends(get_current_user)):
    update_fields = {}
    
    if profile_data.full_name:
        update_fields["full_name"] = profile_data.full_name
    if profile_data.school_name:
        update_fields["school_name"] = profile_data.school_name
    if profile_data.town:
        update_fields["town"] = profile_data.town
    if profile_data.current_grade:
        if not (1 <= profile_data.current_grade <= 6):
            raise HTTPException(status_code=400, detail="Grade must be between 1 and 6")
        update_fields["current_grade"] = profile_data.current_grade
    if profile_data.date_of_birth:
        try:
            dob = datetime.strptime(profile_data.date_of_birth, "%Y-%m-%d")
            age = (datetime.now() - dob).days // 365
            if age < 10 or age > 20:
                raise HTTPException(status_code=400, detail="Age must be between 10-20 years")
            update_fields["date_of_birth"] = profile_data.date_of_birth
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    if profile_data.latest_marks:
        marks = profile_data.latest_marks
        update_fields["latest_marks"] = {
            "bm": marks.bm,
            "sejarah": marks.sejarah,
            "science": marks.science
        }
    if profile_data.language:
        if profile_data.language not in ["en", "zh"]:
            raise HTTPException(status_code=400, detail="Invalid language. Use 'en' or 'zh'")
        update_fields["language"] = profile_data.language
    
    if update_fields:
        await db.users.update_one(
            {"id": current_user.id},
            {"$set": update_fields}
        )
    
    return {"message": "Profile updated successfully"}

@api_router.get("/user/profile")
async def get_profile(current_user: User = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user.id}, {"_id": 0, "password": 0})
    return user

@api_router.put("/user/profile/picture")
async def update_profile_picture(
    payload: ProfilePictureUpdate,
    current_user: User = Depends(get_current_user)
):
    pic = payload.profile_picture
    if pic:
        if not pic.startswith("data:image/"):
            raise HTTPException(status_code=400, detail="Image must be a data URL")
        # Reject payloads larger than ~700 KB (Mongo doc size + binary safety)
        if len(pic) > 750_000:
            raise HTTPException(status_code=413, detail="Image too large. Max 500KB.")
    
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {"profile_picture": pic}}
    )
    return {"message": "Profile picture updated", "profile_picture": pic}

@api_router.post("/user/change-password")
async def change_password(data: PasswordChange, current_user: User = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user.id}, {"_id": 0})
    if not pwd_context.verify(data.current_password, user["password"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    # Validate new password
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
    
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {"password": pwd_context.hash(data.new_password)}}
    )
    return {"message": "Password changed successfully"}

# ==================== SUBJECTS & LEVELS ====================

@api_router.get("/subjects")
async def get_subjects(current_user: User = Depends(get_current_user)):
    subjects = await db.subjects.find({}, {"_id": 0}).to_list(100)
    
    # Add user progress to each subject
    for subject in subjects:
        progress = current_user.subject_progress.get(subject["id"], {})
        subject["user_progress"] = {
            "current_level": progress.get("current_level", 1),
            "current_stage": progress.get("current_stage", 1),
            "total_points": progress.get("total_points", 0),
            "stages_completed": len(progress.get("stages_completed", []))
        }
    
    return subjects

@api_router.get("/levels")
async def get_levels(current_user: User = Depends(get_current_user)):
    levels = await db.levels.find({}, {"_id": 0}).sort("level_num", 1).to_list(100)
    user = await db.users.find_one({"id": current_user.id}, {"_id": 0})
    stages_completed = user.get("stages_completed", [])
    
    # Check which levels are unlocked and count completed stages
    for level in levels:
        level["is_unlocked"] = current_user.total_points >= level["unlock_points"]
        # Count completed stages for this level
        level_stages = [s for s in stages_completed if f"level_{level['level_num']}_" in s]
        level["stages_completed"] = len(level_stages)
    
    return levels

@api_router.get("/levels/{level_num}/stages")
async def get_level_stages(level_num: int, current_user: User = Depends(get_current_user)):
    # Check if level is unlocked
    level = await db.levels.find_one({"level_num": level_num}, {"_id": 0})
    if not level:
        raise HTTPException(status_code=404, detail="Level not found")
    
    if current_user.total_points < level["unlock_points"]:
        raise HTTPException(status_code=403, detail="Level not unlocked yet")
    
    stages = await db.stages.find(
        {"level_num": level_num},
        {"_id": 0}
    ).sort("stage_num", 1).to_list(100)
    
    user = await db.users.find_one({"id": current_user.id}, {"_id": 0})
    stages_completed = user.get("stages_completed", [])
    
    for stage in stages:
        stage["is_completed"] = stage["id"] in stages_completed
        # Stage is unlocked if previous stage is completed or it's stage 1
        if stage["stage_num"] == 1:
            stage["is_unlocked"] = True
        else:
            prev_stage_id = f"stage_level_{level_num}_{stage['stage_num'] - 1}"
            stage["is_unlocked"] = prev_stage_id in stages_completed
    
    return {"level": level, "stages": stages}

# ==================== QUIZ GAMEPLAY ====================

@api_router.get("/stages/{stage_id}/play")
async def start_stage(stage_id: str, current_user: User = Depends(get_current_user)):
    stage = await db.stages.find_one({"id": stage_id}, {"_id": 0})
    if not stage:
        raise HTTPException(status_code=404, detail="Stage not found")
    
    # Get questions for this stage (mixed subjects), ordered by sequence_number
    questions = await db.edu_questions.find(
        {"level_num": stage["level_num"], "stage_num": stage["stage_num"]},
        {"_id": 0, "correct_answer": 0}
    ).sort("sequence_number", 1).to_list(100)
    
    await log_activity(current_user.id, "quiz_start", {"stage_id": stage_id})
    
    return {
        "stage": stage,
        "questions": questions,
        "time_limit": stage["time_limit"]
    }

@api_router.post("/stages/{stage_id}/submit")
async def submit_stage(stage_id: str, submission: QuizSubmission, current_user: User = Depends(get_current_user)):
    stage = await db.stages.find_one({"id": stage_id}, {"_id": 0})
    if not stage:
        raise HTTPException(status_code=404, detail="Stage not found")
    
    # Get questions with answers
    questions = await db.edu_questions.find(
        {"level_num": stage["level_num"], "stage_num": stage["stage_num"]},
        {"_id": 0}
    ).to_list(100)
    
    # Calculate score + difficulty correct counts
    correct_count = 0
    total_points = 0
    results = []
    difficulty_increments = {"apprentice": 0, "master": 0, "legend": 0}
    
    for q in questions:
        user_answer = submission.answers.get(q["id"])
        is_correct = user_answer == q["correct_answer"]
        diff = q.get("difficulty") or "apprentice"
        if diff not in difficulty_increments:
            diff = "apprentice"
        if is_correct:
            correct_count += 1
            total_points += q["points"]
            difficulty_increments[diff] += 1
        results.append({
            "question_id": q["id"],
            "user_answer": user_answer,
            "correct_answer": q["correct_answer"],
            "is_correct": is_correct,
            "difficulty": diff
        })
    
    # Save quiz history
    history_doc = {
        "id": str(uuid.uuid4()),
        "user_id": current_user.id,
        "level_num": stage["level_num"],
        "stage_num": stage["stage_num"],
        "stage_id": stage_id,
        "score": correct_count,
        "total": len(questions),
        "points_earned": total_points,
        "time_spent": submission.time_spent,
        "results": results,
        "completed_at": datetime.now(timezone.utc).isoformat()
    }
    await db.quiz_history.insert_one(history_doc)
    
    # Update user counters
    user = await db.users.find_one({"id": current_user.id}, {"_id": 0})
    stages_completed = user.get("stages_completed", [])
    if stage_id not in stages_completed:
        stages_completed.append(stage_id)
    
    inc_payload = {
        "total_points": total_points,
        "total_time_spent": submission.time_spent,
        "quizzes_completed": 1,
        "total_questions_answered": len(questions),
        "total_correct_answers": correct_count,
        "apprentice_completed": difficulty_increments["apprentice"],
        "master_completed": difficulty_increments["master"],
        "legend_completed": difficulty_increments["legend"],
    }
    
    await db.users.update_one(
        {"id": current_user.id},
        {
            "$inc": inc_payload,
            "$set": {"stages_completed": stages_completed}
        }
    )
    
    # Re-fetch user to evaluate level-up
    from gameplay import check_level_up, LEVEL_REQUIREMENTS, get_progress
    fresh_user = await db.users.find_one({"id": current_user.id}, {"_id": 0})
    level_up_info = None
    
    # Auto-advance through multiple levels if applicable
    while True:
        lu = check_level_up(fresh_user)
        if not lu:
            break
        # Apply level up
        rewards = lu["rewards"]
        new_badges = list(fresh_user.get("badges") or [])
        badge_name = rewards.get("badge")
        if badge_name and badge_name not in new_badges:
            new_badges.append(badge_name)
        now_iso = datetime.now(timezone.utc).isoformat()
        await db.users.update_one(
            {"id": current_user.id},
            {
                "$set": {
                    "current_level": lu["to_level"],
                    "level_up_date": now_iso,
                    "badges": new_badges,
                },
                "$inc": {
                    "coins": rewards.get("coins", 0),
                    "xp": rewards.get("xp", 0),
                }
            }
        )
        fresh_user = await db.users.find_one({"id": current_user.id}, {"_id": 0})
        # Record first level-up only (for celebration)
        if not level_up_info:
            level_up_info = lu
    
    progression = get_progress(fresh_user)
    
    return {
        "score": correct_count,
        "total": len(questions),
        "points_earned": total_points,
        "time_spent": submission.time_spent,
        "results": results,
        "new_total_points": fresh_user.get("total_points", 0),
        "difficulty_gained": difficulty_increments,
        "level_up": bool(level_up_info),
        "level_up_info": level_up_info,
        "progression": progression,
    }


@api_router.get("/user/progression")
async def get_user_progression(current_user: User = Depends(get_current_user)):
    from gameplay import get_progress
    user = await db.users.find_one({"id": current_user.id}, {"_id": 0, "password": 0})
    return get_progress(user)

# ==================== PROGRESS & HISTORY ====================

@api_router.get("/progress/stats")
async def get_progress_stats(current_user: User = Depends(get_current_user)):
    # Get fresh user data
    user = await db.users.find_one({"id": current_user.id}, {"_id": 0, "password": 0})
    stages_completed = user.get("stages_completed", [])
    
    # Calculate completion percentage (25 total stages: 5 levels x 5 stages)
    total_stages = 25
    completion_pct = round((len(stages_completed) / total_stages) * 100, 1)
    
    # Get level progress
    levels = await db.levels.find({}, {"_id": 0}).sort("level_num", 1).to_list(100)
    level_stats = []
    for level in levels:
        level_stages = [s for s in stages_completed if f"level_{level['level_num']}_" in s]
        level_stats.append({
            "level": level,
            "stages_completed": len(level_stages),
            "is_unlocked": user.get("total_points", 0) >= level["unlock_points"]
        })
    
    return {
        "total_points": user.get("total_points", 0),
        "current_level": user.get("current_level", 1),
        "total_time_spent": user.get("total_time_spent", 0),
        "quizzes_completed": user.get("quizzes_completed", 0),
        "stages_completed": len(stages_completed),
        "total_stages": total_stages,
        "completion_percentage": completion_pct,
        "level_stats": level_stats
    }

@api_router.get("/progress/history")
async def get_quiz_history(
    limit: int = 20,
    current_user: User = Depends(get_current_user)
):
    query = {"user_id": current_user.id}
    
    history = await db.quiz_history.find(
        query,
        {"_id": 0}
    ).sort("completed_at", -1).limit(limit).to_list(limit)
    
    # Enrich each history item with subject breakdown
    for item in history:
        results = item.get("results", [])
        # Build map of question_id -> subject_id for this stage
        if results:
            q_ids = [r["question_id"] for r in results]
            q_docs = await db.edu_questions.find(
                {"id": {"$in": q_ids}},
                {"_id": 0, "id": 1, "subject_id": 1}
            ).to_list(100)
            qmap = {q["id"]: q.get("subject_id") for q in q_docs}
            
            breakdown = {}  # subject_id -> {correct, total}
            for r in results:
                sid = qmap.get(r["question_id"], "unknown")
                b = breakdown.setdefault(sid, {"correct": 0, "total": 0})
                b["total"] += 1
                if r.get("is_correct"):
                    b["correct"] += 1
            item["subject_breakdown"] = breakdown
        else:
            item["subject_breakdown"] = {}
        # Remove heavy results array from response
        item.pop("results", None)
    
    return history

# ==================== LEADERBOARD ====================

@api_router.get("/leaderboard")
async def get_leaderboard(subject_id: Optional[str] = None, limit: int = 20):
    if subject_id:
        # Subject-specific leaderboard
        pipeline = [
            {"$project": {
                "_id": 0,
                "id": 1,
                "name": 1,
                "points": f"$subject_progress.{subject_id}.total_points"
            }},
            {"$match": {"points": {"$gt": 0}}},
            {"$sort": {"points": -1}},
            {"$limit": limit}
        ]
    else:
        # Global leaderboard
        pipeline = [
            {"$project": {
                "_id": 0,
                "id": 1,
                "name": 1,
                "points": "$total_points",
                "level": "$current_level"
            }},
            {"$sort": {"points": -1}},
            {"$limit": limit}
        ]
    
    users = await db.users.aggregate(pipeline).to_list(limit)
    
    # Add rank
    for i, user in enumerate(users):
        user["rank"] = i + 1
    
    return users

# ==================== WELCOME MESSAGES ====================

@api_router.get("/welcome-message")
async def get_welcome_message(current_user: User = Depends(get_current_user)):
    # Determine condition
    condition = "returning_user"
    if current_user.quizzes_completed == 0:
        condition = "new_user"
    elif current_user.total_points > 0:
        condition = "has_progress"
    
    message = await db.welcome_messages.find_one(
        {"condition": condition},
        {"_id": 0}
    )
    
    return message

# ==================== NOTICES ====================

@api_router.get("/notices")
async def get_notices():
    notices = await db.notices.find(
        {"is_active": True},
        {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    return notices

# ==================== ADMIN ROUTES ====================

@api_router.get("/admin/questions")
async def get_admin_questions(
    subject_id: Optional[str] = None,
    level_num: Optional[int] = None,
    admin: User = Depends(get_admin_user)
):
    query = {}
    if subject_id:
        query["subject_id"] = subject_id
    if level_num:
        query["level_num"] = level_num
    
    questions = await db.edu_questions.find(query, {"_id": 0}).limit(500).to_list(500)
    return questions

class QuestionSequenceUpdate(BaseModel):
    sequence_number: int


@api_router.patch("/admin/questions/{question_id}/sequence")
async def update_question_sequence(
    question_id: str,
    payload: QuestionSequenceUpdate,
    admin: User = Depends(get_admin_user)
):
    if payload.sequence_number < 0:
        raise HTTPException(status_code=400, detail="Sequence number must be >= 0")
    result = await db.edu_questions.update_one(
        {"id": question_id},
        {"$set": {"sequence_number": payload.sequence_number}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Question not found")
    return {"message": "Sequence updated", "sequence_number": payload.sequence_number}


def _validate_question_media(image: Optional[str], audio: Optional[str]):
    """Validate that image/audio are data URLs within size limits."""
    if image:
        if not image.startswith("data:image/"):
            raise HTTPException(status_code=400, detail="Image must be a data URL")
        if len(image) > 1_500_000:  # ~1.1 MB binary
            raise HTTPException(status_code=413, detail="Image too large. Max ~1MB.")
    if audio:
        if not audio.startswith("data:audio/"):
            raise HTTPException(status_code=400, detail="Audio must be a data URL")
        if len(audio) > 4_500_000:  # ~3.3 MB binary
            raise HTTPException(status_code=413, detail="Audio too large. Max ~3MB.")

@api_router.post("/admin/questions")
async def create_question(question: QuestionCreate, admin: User = Depends(get_admin_user)):
    # Validate media payloads
    _validate_question_media(question.image, question.audio)
    
    if question.difficulty not in ("apprentice", "master", "legend"):
        raise HTTPException(status_code=400, detail="Difficulty must be apprentice, master, or legend")
    
    stage_id = f"stage_{question.subject_id}_level_{question.level_num}_{question.stage_num}"
    
    question_doc = {
        "id": str(uuid.uuid4()),
        "subject_id": question.subject_id,
        "level_num": question.level_num,
        "stage_num": question.stage_num,
        "stage_id": stage_id,
        "text_en": question.text_en,
        "text_zh": question.text_zh,
        "options_en": question.options_en,
        "options_zh": question.options_zh,
        "correct_answer": question.correct_answer,
        "points": question.points,
        "difficulty": question.difficulty,
        "sequence_number": question.sequence_number,
        "story_board_en": question.story_board_en,
        "story_board_zh": question.story_board_zh,
        "image": question.image,
        "audio": question.audio,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": admin.id
    }
    
    await db.edu_questions.insert_one(question_doc)
    return {"message": "Question created", "id": question_doc["id"]}

@api_router.put("/admin/questions/{question_id}")
async def update_question(question_id: str, question: QuestionCreate, admin: User = Depends(get_admin_user)):
    _validate_question_media(question.image, question.audio)
    if question.difficulty not in ("apprentice", "master", "legend"):
        raise HTTPException(status_code=400, detail="Difficulty must be apprentice, master, or legend")
    result = await db.edu_questions.update_one(
        {"id": question_id},
        {"$set": {
            "text_en": question.text_en,
            "text_zh": question.text_zh,
            "options_en": question.options_en,
            "options_zh": question.options_zh,
            "correct_answer": question.correct_answer,
            "points": question.points,
            "difficulty": question.difficulty,
            "sequence_number": question.sequence_number,
            "story_board_en": question.story_board_en,
            "story_board_zh": question.story_board_zh,
            "image": question.image,
            "audio": question.audio,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Question not found")
    return {"message": "Question updated"}

@api_router.delete("/admin/questions/{question_id}")
async def delete_question(question_id: str, admin: User = Depends(get_admin_user)):
    result = await db.edu_questions.delete_one({"id": question_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Question not found")
    return {"message": "Question deleted"}

@api_router.post("/admin/questions/bulk")
async def bulk_upload_questions(file: UploadFile = File(...), admin: User = Depends(get_admin_user)):
    """
    Upload questions via CSV file.
    Accepts the schema produced by the Export CSV button (option_a_en ... option_d_zh)
    as well as the legacy schema (option1_en ... option4_zh).
    Optional columns: difficulty, story_board_en, story_board_zh, points.
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")
    
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="File is empty")
    
    # utf-8-sig strips Excel/BOM characters so the first column header is clean
    try:
        decoded = content.decode('utf-8-sig')
    except UnicodeDecodeError:
        decoded = content.decode('utf-8', errors='replace')
    
    reader = csv.DictReader(io.StringIO(decoded))
    
    # Normalize column lookups (case + space tolerant)
    def col(row: dict, *names: str) -> str:
        for n in names:
            if n in row and row[n] is not None and str(row[n]).strip() != "":
                return str(row[n]).strip()
            # try lowercased / stripped variants
            for k, v in row.items():
                if k and k.strip().lower() == n.lower() and v is not None and str(v).strip() != "":
                    return str(v).strip()
        return ""
    
    questions = []
    errors = []
    row_num = 1
    
    for row in reader:
        row_num += 1
        try:
            subject_id = col(row, "subject_id")
            if not subject_id:
                errors.append(f"Row {row_num}: missing subject_id")
                continue
            
            level_num = int(col(row, "level_num") or 1)
            stage_num = int(col(row, "stage_num") or 1)
            text_en = col(row, "text_en")
            text_zh = col(row, "text_zh")
            if not text_en:
                errors.append(f"Row {row_num}: text_en is required")
                continue
            # Chinese text optional - fall back to English so quiz still renders in zh mode
            if not text_zh:
                text_zh = text_en
            
            # Accept both column naming conventions
            options_en = [
                col(row, "option_a_en", "option1_en"),
                col(row, "option_b_en", "option2_en"),
                col(row, "option_c_en", "option3_en"),
                col(row, "option_d_en", "option4_en"),
            ]
            options_zh_raw = [
                col(row, "option_a_zh", "option1_zh"),
                col(row, "option_b_zh", "option2_zh"),
                col(row, "option_c_zh", "option3_zh"),
                col(row, "option_d_zh", "option4_zh"),
            ]
            if not all(options_en):
                errors.append(f"Row {row_num}: all four English options are required")
                continue
            # Chinese options optional - fall back to the English option per slot
            options_zh = [zh or en for en, zh in zip(options_en, options_zh_raw)]
            
            correct_answer = int(col(row, "correct_answer") or 0)
            if correct_answer < 0 or correct_answer > 3:
                errors.append(f"Row {row_num}: correct_answer must be 0-3")
                continue
            
            points = int(col(row, "points") or 10)
            
            sequence_number = int(col(row, "sequence_number") or 0)
            
            difficulty = (col(row, "difficulty") or "apprentice").lower()
            if difficulty not in ("apprentice", "master", "legend"):
                difficulty = "apprentice"
            
            stage_id = f"stage_{subject_id}_level_{level_num}_{stage_num}"
            question_doc = {
                "id": str(uuid.uuid4()),
                "subject_id": subject_id,
                "level_num": level_num,
                "stage_num": stage_num,
                "stage_id": stage_id,
                "text_en": text_en,
                "text_zh": text_zh,
                "options_en": options_en,
                "options_zh": options_zh,
                "correct_answer": correct_answer,
                "points": points,
                "difficulty": difficulty,
                "sequence_number": sequence_number,
                "story_board_en": col(row, "story_board_en") or None,
                "story_board_zh": col(row, "story_board_zh") or None,
                "image": None,
                "audio": None,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "created_by": admin.id
            }
            questions.append(question_doc)
        except Exception as e:
            errors.append(f"Row {row_num}: {str(e)}")
    
    if not questions and not errors:
        raise HTTPException(status_code=400, detail="CSV contains no rows. Expected header row + data rows.")
    
    if questions:
        await db.edu_questions.insert_many(questions)
    
    return {
        "message": f"Uploaded {len(questions)} questions" + (f", {len(errors)} skipped" if errors else ""),
        "uploaded": len(questions),
        "errors": errors[:25],  # cap to avoid huge responses
        "error_count": len(errors),
    }

# Admin notices
@api_router.post("/admin/notices")
async def create_notice(notice: NoticeCreate, admin: User = Depends(get_admin_user)):
    notice_doc = {
        "id": str(uuid.uuid4()),
        "title_en": notice.title_en,
        "title_zh": notice.title_zh,
        "content_en": notice.content_en,
        "content_zh": notice.content_zh,
        "type": notice.type,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": admin.id
    }
    await db.notices.insert_one(notice_doc)
    return {"message": "Notice created", "id": notice_doc["id"]}

@api_router.get("/admin/notices")
async def get_admin_notices(admin: User = Depends(get_admin_user)):
    notices = await db.notices.find({}, {"_id": 0}).sort("created_at", -1).limit(50).to_list(50)
    return notices

@api_router.delete("/admin/notices/{notice_id}")
async def delete_notice(notice_id: str, admin: User = Depends(get_admin_user)):
    result = await db.notices.delete_one({"id": notice_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notice not found")
    return {"message": "Notice deleted"}

# Admin users
@api_router.get("/admin/users")
async def get_admin_users(admin: User = Depends(get_admin_user)):
    users = await db.users.find({}, {"_id": 0, "password": 0}).limit(200).to_list(200)
    return users

@api_router.get("/admin/users/{user_id}")
async def get_admin_user_detail(user_id: str, admin: User = Depends(get_admin_user)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Add quiz history summary
    quiz_count = await db.quiz_history.count_documents({"user_id": user_id})
    recent = await db.quiz_history.find(
        {"user_id": user_id},
        {"_id": 0, "results": 0}
    ).sort("completed_at", -1).limit(5).to_list(5)
    user["recent_quiz_history"] = recent
    user["quiz_history_count"] = quiz_count
    return user

@api_router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, admin: User = Depends(get_admin_user)):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted"}

# Admin reports
@api_router.get("/admin/reports")
async def get_admin_reports(admin: User = Depends(get_admin_user)):
    # Total users
    total_users = await db.users.count_documents({})
    
    # Total quizzes completed
    total_quizzes = await db.quiz_history.count_documents({})
    
    # Subject breakdown
    subject_stats = []
    subjects = await db.subjects.find({}, {"_id": 0}).to_list(100)
    for subject in subjects:
        count = await db.quiz_history.count_documents({"subject_id": subject["id"]})
        avg_pipeline = [
            {"$match": {"subject_id": subject["id"]}},
            {"$group": {"_id": None, "avg_score": {"$avg": {"$divide": ["$score", "$total"]}}}}
        ]
        avg_result = await db.quiz_history.aggregate(avg_pipeline).to_list(1)
        avg_score = round(avg_result[0]["avg_score"] * 100, 1) if avg_result else 0
        
        subject_stats.append({
            "subject": subject,
            "quizzes_completed": count,
            "average_score_pct": avg_score
        })
    
    # Active users (last 7 days)
    seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    active_users = await db.activity_logs.distinct("user_id", {"timestamp": {"$gte": seven_days_ago}})
    
    return {
        "total_users": total_users,
        "total_quizzes_completed": total_quizzes,
        "active_users_7d": len(active_users),
        "subject_stats": subject_stats
    }

# ==================== APP SETUP ====================

app.include_router(api_router)

# LIVE Competition module
from live_competition import live_router, init_live_module
init_live_module(db)
app.include_router(live_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
