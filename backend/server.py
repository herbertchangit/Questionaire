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
from emergentintegrations.llm.openai import OpenAITextToSpeech
import base64
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

JWT_SECRET = os.environ.get('JWT_SECRET', 'default_secret')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
JWT_EXPIRATION_HOURS = int(os.environ.get('JWT_EXPIRATION_HOURS', 720))

tts_client = OpenAITextToSpeech(api_key=os.environ.get('EMERGENT_LLM_KEY'))

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    email: str
    level: int = 1
    points: int = 0
    completed_quizzes: List[str] = []
    role: str = "user"
    created_at: str

class QuizCreate(BaseModel):
    title: str
    description: str
    category: str
    level_required: int
    duration_minutes: int

class Quiz(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    description: str
    category: str
    level_required: int
    duration_minutes: int
    questions_count: int = 0
    created_by: str
    created_at: str
    is_published: bool = True

class QuestionCreate(BaseModel):
    quiz_id: str
    text: str
    type: str
    media_url: Optional[str] = None
    options: List[str]
    correct_answer: int
    points: int = 10

class Question(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    quiz_id: str
    text: str
    type: str
    media_url: Optional[str] = None
    options: List[str]
    correct_answer: int
    points: int

class QuestionPublic(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    quiz_id: str
    text: str
    type: str
    media_url: Optional[str] = None
    options: List[str]
    points: int

class QuizSubmission(BaseModel):
    quiz_id: str
    answers: Dict[str, int]
    time_taken: int

class QuizResult(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    quiz_id: str
    score: int
    total_questions: int
    time_taken: int
    answers: Dict[str, int]
    completed_at: str

class TTSRequest(BaseModel):
    text: str
    voice: str = "alloy"

class Category(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    description: str
    icon: str

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
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
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
        "level": 1,
        "points": 0,
        "completed_quizzes": [],
        "role": "user",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    token = create_token(user_id, user_data.email, "user")
    
    return {"token": token, "user": User(**{k: v for k, v in user_doc.items() if k != "password"})}

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not pwd_context.verify(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"], user["email"], user["role"])
    return {"token": token, "user": User(**{k: v for k, v in user.items() if k != "password"})}

@api_router.get("/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@api_router.get("/users/stats")
async def get_user_stats(current_user: User = Depends(get_current_user)):
    total_quizzes = await db.quizzes.count_documents({"is_published": True})
    completed = len(current_user.completed_quizzes)
    
    results = await db.quiz_results.find({"user_id": current_user.id}, {"_id": 0}).to_list(1000)
    total_score = sum(r["score"] for r in results)
    
    return {
        "level": current_user.level,
        "points": current_user.points,
        "completed_quizzes": completed,
        "total_quizzes": total_quizzes,
        "total_score": total_score
    }

@api_router.get("/categories")
async def get_categories():
    categories = await db.categories.find({}, {"_id": 0}).to_list(100)
    return categories

@api_router.get("/quizzes")
async def get_quizzes(current_user: User = Depends(get_current_user)):
    quizzes = await db.quizzes.find(
        {"is_published": True, "level_required": {"$lte": current_user.level}},
        {"_id": 0}
    ).to_list(1000)
    
    for quiz in quizzes:
        quiz["completed"] = quiz["id"] in current_user.completed_quizzes
    
    return quizzes

@api_router.get("/quizzes/{quiz_id}")
async def get_quiz(quiz_id: str, current_user: User = Depends(get_current_user)):
    quiz = await db.quizzes.find_one({"id": quiz_id}, {"_id": 0})
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    if quiz["level_required"] > current_user.level:
        raise HTTPException(status_code=403, detail="Level requirement not met")
    
    questions = await db.questions.find({"quiz_id": quiz_id}, {"_id": 0}).to_list(1000)
    public_questions = [QuestionPublic(**{k: v for k, v in q.items() if k != "correct_answer"}) for q in questions]
    
    return {**quiz, "questions": public_questions}

@api_router.post("/quizzes/{quiz_id}/submit")
async def submit_quiz(quiz_id: str, submission: QuizSubmission, current_user: User = Depends(get_current_user)):
    quiz = await db.quizzes.find_one({"id": quiz_id}, {"_id": 0})
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    questions = await db.questions.find({"quiz_id": quiz_id}, {"_id": 0}).to_list(1000)
    
    correct_count = 0
    total_points = 0
    
    for q in questions:
        user_answer = submission.answers.get(q["id"])
        if user_answer is not None and user_answer == q["correct_answer"]:
            correct_count += 1
            total_points += q["points"]
    
    result_id = str(uuid.uuid4())
    result_doc = {
        "id": result_id,
        "user_id": current_user.id,
        "quiz_id": quiz_id,
        "score": total_points,
        "total_questions": len(questions),
        "time_taken": submission.time_taken,
        "answers": submission.answers,
        "completed_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.quiz_results.insert_one(result_doc)
    
    if quiz_id not in current_user.completed_quizzes:
        new_level = current_user.level + 1
        await db.users.update_one(
            {"id": current_user.id},
            {
                "$push": {"completed_quizzes": quiz_id},
                "$set": {"level": new_level},
                "$inc": {"points": total_points}
            }
        )
        level_up = True
    else:
        await db.users.update_one(
            {"id": current_user.id},
            {"$inc": {"points": total_points}}
        )
        level_up = False
    
    return {
        "result": QuizResult(**result_doc),
        "correct_count": correct_count,
        "level_up": level_up,
        "new_level": current_user.level + 1 if level_up else current_user.level
    }

@api_router.post("/admin/quizzes")
async def create_quiz(quiz_data: QuizCreate, admin: User = Depends(get_admin_user)):
    quiz_id = str(uuid.uuid4())
    quiz_doc = {
        "id": quiz_id,
        "title": quiz_data.title,
        "description": quiz_data.description,
        "category": quiz_data.category,
        "level_required": quiz_data.level_required,
        "duration_minutes": quiz_data.duration_minutes,
        "questions_count": 0,
        "created_by": admin.id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_published": True
    }
    
    await db.quizzes.insert_one(quiz_doc)
    return Quiz(**quiz_doc)

@api_router.get("/admin/quizzes")
async def get_admin_quizzes(admin: User = Depends(get_admin_user)):
    quizzes = await db.quizzes.find({}, {"_id": 0}).to_list(1000)
    return quizzes

@api_router.delete("/admin/quizzes/{quiz_id}")
async def delete_quiz(quiz_id: str, admin: User = Depends(get_admin_user)):
    result = await db.quizzes.delete_one({"id": quiz_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    await db.questions.delete_many({"quiz_id": quiz_id})
    return {"message": "Quiz deleted successfully"}

@api_router.post("/admin/questions")
async def create_question(question_data: QuestionCreate, admin: User = Depends(get_admin_user)):
    question_id = str(uuid.uuid4())
    question_doc = {
        "id": question_id,
        "quiz_id": question_data.quiz_id,
        "text": question_data.text,
        "type": question_data.type,
        "media_url": question_data.media_url,
        "options": question_data.options,
        "correct_answer": question_data.correct_answer,
        "points": question_data.points
    }
    
    await db.questions.insert_one(question_doc)
    await db.quizzes.update_one(
        {"id": question_data.quiz_id},
        {"$inc": {"questions_count": 1}}
    )
    
    return Question(**question_doc)

@api_router.get("/admin/questions/{quiz_id}")
async def get_admin_questions(quiz_id: str, admin: User = Depends(get_admin_user)):
    questions = await db.questions.find({"quiz_id": quiz_id}, {"_id": 0}).to_list(1000)
    return questions

@api_router.delete("/admin/questions/{question_id}")
async def delete_question(question_id: str, admin: User = Depends(get_admin_user)):
    question = await db.questions.find_one({"id": question_id}, {"_id": 0})
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    await db.questions.delete_one({"id": question_id})
    await db.quizzes.update_one(
        {"id": question["quiz_id"]},
        {"$inc": {"questions_count": -1}}
    )
    
    return {"message": "Question deleted successfully"}

@api_router.post("/admin/questions/tts")
async def generate_tts(tts_request: TTSRequest, admin: User = Depends(get_admin_user)):
    try:
        audio_bytes = await tts_client.generate_speech(
            text=tts_request.text,
            model="tts-1",
            voice=tts_request.voice
        )
        audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
        return {"audio_data": f"data:audio/mp3;base64,{audio_base64}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS generation failed: {str(e)}")

@api_router.post("/admin/categories")
async def create_category(category_data: Category, admin: User = Depends(get_admin_user)):
    category_doc = category_data.model_dump()
    category_doc["id"] = str(uuid.uuid4())
    await db.categories.insert_one(category_doc)
    return Category(**category_doc)

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()