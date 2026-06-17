"""Leaderboard, welcome message, and public notices routes."""
from typing import Optional

from fastapi import APIRouter, Depends

from core import db, get_current_user
from models import User

router = APIRouter(tags=["community"])


@router.get("/leaderboard")
async def get_leaderboard(subject_id: Optional[str] = None, limit: int = 20):
    if subject_id:
        pipeline = [
            {
                "$project": {
                    "_id": 0,
                    "id": 1,
                    "name": 1,
                    "points": f"$subject_progress.{subject_id}.total_points",
                }
            },
            {"$match": {"points": {"$gt": 0}}},
            {"$sort": {"points": -1}},
            {"$limit": limit},
        ]
    else:
        pipeline = [
            {
                "$project": {
                    "_id": 0,
                    "id": 1,
                    "name": 1,
                    "points": "$total_points",
                    "level": "$current_level",
                }
            },
            {"$sort": {"points": -1}},
            {"$limit": limit},
        ]

    users = await db.users.aggregate(pipeline).to_list(limit)
    for i, user in enumerate(users):
        user["rank"] = i + 1
    return users


@router.get("/welcome-message")
async def get_welcome_message(current_user: User = Depends(get_current_user)):
    condition = "returning_user"
    if current_user.quizzes_completed == 0:
        condition = "new_user"
    elif current_user.total_points > 0:
        condition = "has_progress"

    return await db.welcome_messages.find_one({"condition": condition}, {"_id": 0})


@router.get("/notices")
async def get_notices():
    return (
        await db.notices.find({"is_active": True}, {"_id": 0})
        .sort("created_at", -1)
        .limit(10)
        .to_list(10)
    )
