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

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    language: str = "en"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    email: str
    role: str = "user"
    language: str = "en"
    total_points: int = 0
    current_level: int = 1
    subject_progress: Dict[str, Any] = {}
    total_time_spent: int = 0
    quizzes_completed: int = 0
    created_at: str

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

class NoticeCreate(BaseModel):
    title_en: str
    title_zh: str
    content_en: str
    content_zh: str
    type: str = "announcement"

# ==================== AUTH HELPERS ====================

def create_token(user_id: str, email: str, role: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {"user_id": user_id, "email": email, "role": role, "exp": exp}
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
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    hashed_password = pwd_context.hash(user_data.password)
    
    user_doc = {
        "id": user_id,
        "name": user_data.name,
        "email": user_data.email,
        "password": hashed_password,
        "role": "user",
        "language": user_data.language,
        "total_points": 0,
        "current_level": 1,
        "subject_progress": {
            "subj_bm": {"current_level": 1, "current_stage": 1, "total_points": 0, "stages_completed": []},
            "subj_history": {"current_level": 1, "current_stage": 1, "total_points": 0, "stages_completed": []},
            "subj_science": {"current_level": 1, "current_stage": 1, "total_points": 0, "stages_completed": []}
        },
        "total_time_spent": 0,
        "quizzes_completed": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    token = create_token(user_id, user_data.email, "user")
    
    user_response = {k: v for k, v in user_doc.items() if k != "password"}
    return {"token": token, "user": user_response}

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not pwd_context.verify(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    await log_activity(user["id"], "login")
    
    token = create_token(user["id"], user["email"], user["role"])
    user_response = {k: v for k, v in user.items() if k != "password"}
    return {"token": token, "user": user_response}

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
async def update_profile(name: str, current_user: User = Depends(get_current_user)):
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {"name": name}}
    )
    return {"message": "Profile updated"}

@api_router.post("/user/change-password")
async def change_password(data: PasswordChange, current_user: User = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user.id}, {"_id": 0})
    if not pwd_context.verify(data.current_password, user["password"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
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
    
    # Check which levels are unlocked for user
    for level in levels:
        level["is_unlocked"] = current_user.total_points >= level["unlock_points"]
    
    return levels

@api_router.get("/subjects/{subject_id}/levels")
async def get_subject_levels(subject_id: str, current_user: User = Depends(get_current_user)):
    subject = await db.subjects.find_one({"id": subject_id}, {"_id": 0})
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    levels = await db.levels.find({}, {"_id": 0}).sort("level_num", 1).to_list(100)
    user_progress = current_user.subject_progress.get(subject_id, {})
    stages_completed = user_progress.get("stages_completed", [])
    
    for level in levels:
        level["is_unlocked"] = current_user.total_points >= level["unlock_points"]
        # Count completed stages for this level in this subject
        level_stages = [s for s in stages_completed if f"level_{level['level_num']}" in s]
        level["stages_completed"] = len(level_stages)
    
    return {"subject": subject, "levels": levels}

@api_router.get("/subjects/{subject_id}/levels/{level_num}/stages")
async def get_level_stages(subject_id: str, level_num: int, current_user: User = Depends(get_current_user)):
    stages = await db.stages.find(
        {"subject_id": subject_id, "level_num": level_num},
        {"_id": 0}
    ).sort("stage_num", 1).to_list(100)
    
    user_progress = current_user.subject_progress.get(subject_id, {})
    stages_completed = user_progress.get("stages_completed", [])
    
    for stage in stages:
        stage["is_completed"] = stage["id"] in stages_completed
        # Stage is unlocked if previous stage is completed or it's stage 1
        if stage["stage_num"] == 1:
            stage["is_unlocked"] = True
        else:
            prev_stage_id = f"stage_{subject_id}_level_{level_num}_{stage['stage_num'] - 1}"
            stage["is_unlocked"] = prev_stage_id in stages_completed
    
    return stages

# ==================== QUIZ GAMEPLAY ====================

@api_router.get("/stages/{stage_id}/play")
async def start_stage(stage_id: str, current_user: User = Depends(get_current_user)):
    stage = await db.stages.find_one({"id": stage_id}, {"_id": 0})
    if not stage:
        raise HTTPException(status_code=404, detail="Stage not found")
    
    # Get questions for this stage
    questions = await db.edu_questions.find(
        {"subject_id": stage["subject_id"], "level_num": stage["level_num"], "stage_num": stage["stage_num"]},
        {"_id": 0, "correct_answer": 0}
    ).to_list(100)
    
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
        {"subject_id": stage["subject_id"], "level_num": stage["level_num"], "stage_num": stage["stage_num"]},
        {"_id": 0}
    ).to_list(100)
    
    # Calculate score
    correct_count = 0
    total_points = 0
    results = []
    
    for q in questions:
        user_answer = submission.answers.get(q["id"])
        is_correct = user_answer == q["correct_answer"]
        if is_correct:
            correct_count += 1
            total_points += q["points"]
        results.append({
            "question_id": q["id"],
            "user_answer": user_answer,
            "correct_answer": q["correct_answer"],
            "is_correct": is_correct
        })
    
    # Save quiz history
    history_doc = {
        "id": str(uuid.uuid4()),
        "user_id": current_user.id,
        "subject_id": stage["subject_id"],
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
    
    # Update user progress
    subject_id = stage["subject_id"]
    user_progress = current_user.subject_progress.get(subject_id, {
        "current_level": 1, "current_stage": 1, "total_points": 0, "stages_completed": []
    })
    
    stages_completed = user_progress.get("stages_completed", [])
    if stage_id not in stages_completed:
        stages_completed.append(stage_id)
    
    # Calculate new level/stage
    new_current_stage = stage["stage_num"] + 1 if stage["stage_num"] < 5 else 1
    new_current_level = stage["level_num"] + 1 if new_current_stage == 1 and stage["stage_num"] == 5 else stage["level_num"]
    if new_current_level > 5:
        new_current_level = 5
        new_current_stage = 5
    
    await db.users.update_one(
        {"id": current_user.id},
        {
            "$inc": {
                "total_points": total_points,
                "total_time_spent": submission.time_spent,
                "quizzes_completed": 1
            },
            "$set": {
                f"subject_progress.{subject_id}.current_level": new_current_level,
                f"subject_progress.{subject_id}.current_stage": new_current_stage,
                f"subject_progress.{subject_id}.stages_completed": stages_completed,
            },
            "$inc": {
                f"subject_progress.{subject_id}.total_points": total_points
            }
        }
    )
    
    # Calculate overall level based on total points
    new_total_points = current_user.total_points + total_points
    levels = await db.levels.find({}, {"_id": 0}).sort("unlock_points", -1).to_list(100)
    overall_level = 1
    for level in levels:
        if new_total_points >= level["unlock_points"]:
            overall_level = level["level_num"]
            break
    
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {"current_level": overall_level}}
    )
    
    return {
        "score": correct_count,
        "total": len(questions),
        "points_earned": total_points,
        "time_spent": submission.time_spent,
        "results": results,
        "new_total_points": new_total_points,
        "level_up": overall_level > current_user.current_level
    }

# ==================== PROGRESS & HISTORY ====================

@api_router.get("/progress/stats")
async def get_progress_stats(current_user: User = Depends(get_current_user)):
    # Get fresh user data
    user = await db.users.find_one({"id": current_user.id}, {"_id": 0, "password": 0})
    
    # Get subject details
    subjects = await db.subjects.find({}, {"_id": 0}).to_list(100)
    
    subject_stats = []
    for subject in subjects:
        progress = user.get("subject_progress", {}).get(subject["id"], {})
        stages_completed = progress.get("stages_completed", [])
        
        # Calculate completion percentage (25 total stages per subject: 5 levels x 5 stages)
        total_stages = 25
        completion_pct = round((len(stages_completed) / total_stages) * 100, 1)
        
        subject_stats.append({
            "subject": subject,
            "current_level": progress.get("current_level", 1),
            "current_stage": progress.get("current_stage", 1),
            "total_points": progress.get("total_points", 0),
            "stages_completed": len(stages_completed),
            "total_stages": total_stages,
            "completion_percentage": completion_pct
        })
    
    return {
        "total_points": user.get("total_points", 0),
        "current_level": user.get("current_level", 1),
        "total_time_spent": user.get("total_time_spent", 0),
        "quizzes_completed": user.get("quizzes_completed", 0),
        "subject_stats": subject_stats
    }

@api_router.get("/progress/history")
async def get_quiz_history(
    subject_id: Optional[str] = None,
    limit: int = 20,
    current_user: User = Depends(get_current_user)
):
    query = {"user_id": current_user.id}
    if subject_id:
        query["subject_id"] = subject_id
    
    history = await db.quiz_history.find(
        query,
        {"_id": 0, "results": 0}
    ).sort("completed_at", -1).limit(limit).to_list(limit)
    
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

@api_router.post("/admin/questions")
async def create_question(question: QuestionCreate, admin: User = Depends(get_admin_user)):
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
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": admin.id
    }
    
    await db.edu_questions.insert_one(question_doc)
    return {"message": "Question created", "id": question_doc["id"]}

@api_router.put("/admin/questions/{question_id}")
async def update_question(question_id: str, question: QuestionCreate, admin: User = Depends(get_admin_user)):
    result = await db.edu_questions.update_one(
        {"id": question_id},
        {"$set": {
            "text_en": question.text_en,
            "text_zh": question.text_zh,
            "options_en": question.options_en,
            "options_zh": question.options_zh,
            "correct_answer": question.correct_answer,
            "points": question.points,
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
    Expected columns: subject_id, level_num, stage_num, text_en, text_zh, option1_en, option2_en, option3_en, option4_en, option1_zh, option2_zh, option3_zh, option4_zh, correct_answer, points
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")
    
    content = await file.read()
    decoded = content.decode('utf-8')
    reader = csv.DictReader(io.StringIO(decoded))
    
    questions = []
    errors = []
    row_num = 1
    
    for row in reader:
        row_num += 1
        try:
            stage_id = f"stage_{row['subject_id']}_level_{row['level_num']}_{row['stage_num']}"
            question_doc = {
                "id": str(uuid.uuid4()),
                "subject_id": row["subject_id"],
                "level_num": int(row["level_num"]),
                "stage_num": int(row["stage_num"]),
                "stage_id": stage_id,
                "text_en": row["text_en"],
                "text_zh": row["text_zh"],
                "options_en": [row["option1_en"], row["option2_en"], row["option3_en"], row["option4_en"]],
                "options_zh": [row["option1_zh"], row["option2_zh"], row["option3_zh"], row["option4_zh"]],
                "correct_answer": int(row["correct_answer"]),
                "points": int(row.get("points", 10)),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "created_by": admin.id
            }
            questions.append(question_doc)
        except Exception as e:
            errors.append(f"Row {row_num}: {str(e)}")
    
    if questions:
        await db.edu_questions.insert_many(questions)
    
    return {
        "message": f"Uploaded {len(questions)} questions",
        "uploaded": len(questions),
        "errors": errors
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
