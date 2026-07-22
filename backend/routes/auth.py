"""Authentication routes: register, login, me."""
import re
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from core import create_token, db, get_current_user, log_activity, pwd_context
from models import User, UserCreate, UserLogin

router = APIRouter(tags=["auth"])


@router.get("/schools")
async def list_registration_schools():
    return (
        await db.schools.find(
            {},
            {
                "_id": 0,
                "id": 1,
                "school_name": 1,
                "address": 1,
                "education_level": 1,
                "school_logo": 1,
                "forms": 1,
                "classes": 1,
                "form_classes": 1,
            },
        )
        .sort("school_name", 1)
        .limit(500)
        .to_list(500)
    )


@router.post("/auth/register")
async def register(user_data: UserCreate):
    username_raw = user_data.username.strip()
    plain_re = r"^[a-zA-Z0-9_]{3,30}$"
    email_re = r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$"
    if not (re.match(plain_re, username_raw) or re.match(email_re, username_raw)):
        raise HTTPException(
            status_code=400,
            detail="Username must be 3-30 letters/numbers/underscores OR a valid email address",
        )

    username = username_raw.lower()
    email = user_data.email.lower()

    if await db.users.find_one({"username": username}, {"_id": 0}):
        raise HTTPException(status_code=400, detail="Username already taken")

    if await db.users.find_one(
        {"$or": [{"email": email}, {"username": email}]}, {"_id": 0}
    ):
        raise HTTPException(status_code=400, detail="Email already registered")

    if re.match(email_re, username) and username != email:
        raise HTTPException(
            status_code=400,
            detail="When using email as username, it must match your email address",
        )

    # Validate DOB & age
    try:
        dob = datetime.strptime(user_data.date_of_birth, "%Y-%m-%d")
        age = (datetime.now() - dob).days // 365
        if age < 10 or age > 20:
            raise HTTPException(
                status_code=400,
                detail="Age must be between 10-20 years for secondary school",
            )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    marks = user_data.latest_marks
    if not (0 <= marks.bm <= 100 and 0 <= marks.sejarah <= 100 and 0 <= marks.science <= 100):
        raise HTTPException(status_code=400, detail="Marks must be between 0 and 100")

    school_id = user_data.school_id
    school_name = user_data.school_name.strip()
    if school_id:
        school = await db.schools.find_one({"id": school_id}, {"_id": 0})
        if not school:
            raise HTTPException(status_code=400, detail="Selected school was not found")
        school_name = school["school_name"]

    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "username": username,
        "email": email,
        "password": pwd_context.hash(user_data.password),
        "full_name": user_data.full_name,
        "school_id": school_id,
        "school_name": school_name,
        "town": user_data.town,
        "current_grade": user_data.current_grade,
        "current_form": user_data.current_form,
        "class_name": user_data.class_name,
        "date_of_birth": user_data.date_of_birth,
        "latest_marks": {"bm": marks.bm, "sejarah": marks.sejarah, "science": marks.science},
        "role": "user",
        "language": user_data.language,
        "total_points": 0,
        "current_level": 1,
        "stages_completed": [],
        "total_time_spent": 0,
        "quizzes_completed": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user_doc)
    token = create_token(user_id, username, "user", False)
    user_response = {k: v for k, v in user_doc.items() if k not in ("password", "_id")}
    return {"token": token, "user": user_response, "message": "Registration successful"}


@router.post("/auth/login")
async def login(credentials: UserLogin):
    identifier = credentials.username.strip().lower()
    user = await db.users.find_one(
        {"$or": [{"username": identifier}, {"email": identifier}]}, {"_id": 0}
    )
    if not user or not pwd_context.verify(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    await log_activity(user["id"], "login")

    now_iso = datetime.now(timezone.utc).isoformat()
    previous_login = user.get("last_login_at")
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"previous_login_at": previous_login, "last_login_at": now_iso}},
    )
    user["previous_login_at"] = previous_login
    user["last_login_at"] = now_iso

    token = create_token(user["id"], user["username"], user["role"], credentials.remember_me)
    user_response = {k: v for k, v in user.items() if k != "password"}
    return {
        "token": token,
        "user": user_response,
        "message": "Login successful",
        "remember_me": credentials.remember_me,
    }


@router.get("/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user
