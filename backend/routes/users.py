"""User profile, language, password, and avatar routes."""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException

from core import db, get_current_user, pwd_context
from models import (
    LanguageUpdate,
    PasswordChange,
    ProfilePictureUpdate,
    User,
    UserProfileUpdate,
)

router = APIRouter(tags=["user"])


@router.put("/user/language")
async def update_language(data: LanguageUpdate, current_user: User = Depends(get_current_user)):
    if data.language not in ["en", "zh"]:
        raise HTTPException(status_code=400, detail="Invalid language. Use 'en' or 'zh'")
    await db.users.update_one({"id": current_user.id}, {"$set": {"language": data.language}})
    return {"message": "Language updated", "language": data.language}


@router.put("/user/profile")
async def update_profile(
    profile_data: UserProfileUpdate, current_user: User = Depends(get_current_user)
):
    update_fields: dict = {}

    if profile_data.full_name:
        update_fields["full_name"] = profile_data.full_name
    if profile_data.school_id is not None:
        school_id = profile_data.school_id.strip()
        if school_id:
            school = await db.schools.find_one({"id": school_id}, {"_id": 0})
            if not school:
                raise HTTPException(status_code=400, detail="Selected school was not found")
            update_fields["school_id"] = school_id
            update_fields["school_name"] = school["school_name"]
        elif current_user.role == "admin":
            update_fields["school_id"] = None
            update_fields["school_name"] = "None"
            update_fields["current_form"] = ""
            update_fields["class_name"] = ""
        else:
            raise HTTPException(status_code=400, detail="School is required")
    elif profile_data.school_name:
        update_fields["school_name"] = profile_data.school_name
    if profile_data.town:
        update_fields["town"] = profile_data.town
    if profile_data.current_grade:
        if not (1 <= profile_data.current_grade <= 6):
            raise HTTPException(status_code=400, detail="Grade must be between 1 and 6")
        update_fields["current_grade"] = profile_data.current_grade
    if profile_data.current_form is not None:
        update_fields["current_form"] = profile_data.current_form.strip()
    if profile_data.class_name is not None:
        update_fields["class_name"] = profile_data.class_name.strip()
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
        m = profile_data.latest_marks
        update_fields["latest_marks"] = {"bm": m.bm, "sejarah": m.sejarah, "science": m.science}
    if profile_data.language:
        if profile_data.language not in ["en", "zh"]:
            raise HTTPException(status_code=400, detail="Invalid language. Use 'en' or 'zh'")
        update_fields["language"] = profile_data.language

    if update_fields:
        await db.users.update_one({"id": current_user.id}, {"$set": update_fields})

    return {"message": "Profile updated successfully"}


@router.get("/user/profile")
async def get_profile(current_user: User = Depends(get_current_user)):
    return await db.users.find_one({"id": current_user.id}, {"_id": 0, "password": 0})


@router.put("/user/profile/picture")
async def update_profile_picture(
    payload: ProfilePictureUpdate, current_user: User = Depends(get_current_user)
):
    pic = payload.profile_picture
    if pic:
        if not pic.startswith("data:image/"):
            raise HTTPException(status_code=400, detail="Image must be a data URL")
        if len(pic) > 750_000:
            raise HTTPException(status_code=413, detail="Image too large. Max 500KB.")

    await db.users.update_one({"id": current_user.id}, {"$set": {"profile_picture": pic}})
    return {"message": "Profile picture updated", "profile_picture": pic}


@router.post("/user/change-password")
async def change_password(data: PasswordChange, current_user: User = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user.id}, {"_id": 0})
    if not pwd_context.verify(data.current_password, user["password"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")

    await db.users.update_one(
        {"id": current_user.id}, {"$set": {"password": pwd_context.hash(data.new_password)}}
    )
    return {"message": "Password changed successfully"}
