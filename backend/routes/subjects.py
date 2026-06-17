"""Subject + level + stage catalog routes."""
from fastapi import APIRouter, Depends, HTTPException

from core import db, get_current_user
from models import User

router = APIRouter(tags=["catalog"])


@router.get("/subjects")
async def get_subjects(current_user: User = Depends(get_current_user)):
    subjects = await db.subjects.find({}, {"_id": 0}).to_list(100)

    # Attach legacy per-subject user progress if present on the user document
    for subject in subjects:
        progress = current_user.subject_progress.get(subject["id"], {})
        subject["user_progress"] = {
            "current_level": progress.get("current_level", 1),
            "current_stage": progress.get("current_stage", 1),
            "total_points": progress.get("total_points", 0),
            "stages_completed": len(progress.get("stages_completed", [])),
        }

    return subjects


@router.get("/levels")
async def get_levels(current_user: User = Depends(get_current_user)):
    levels = await db.levels.find({}, {"_id": 0}).sort("level_num", 1).to_list(100)
    user = await db.users.find_one({"id": current_user.id}, {"_id": 0})
    stages_completed = user.get("stages_completed", [])

    for level in levels:
        level["is_unlocked"] = current_user.total_points >= level["unlock_points"]
        level_stages = [s for s in stages_completed if f"level_{level['level_num']}_" in s]
        level["stages_completed"] = len(level_stages)

    return levels


@router.get("/levels/{level_num}/stages")
async def get_level_stages(level_num: int, current_user: User = Depends(get_current_user)):
    level = await db.levels.find_one({"level_num": level_num}, {"_id": 0})
    if not level:
        raise HTTPException(status_code=404, detail="Level not found")
    if current_user.total_points < level["unlock_points"]:
        raise HTTPException(status_code=403, detail="Level not unlocked yet")

    stages = (
        await db.stages.find({"level_num": level_num}, {"_id": 0})
        .sort("stage_num", 1)
        .to_list(100)
    )

    user = await db.users.find_one({"id": current_user.id}, {"_id": 0})
    stages_completed = user.get("stages_completed", [])

    for stage in stages:
        stage["is_completed"] = stage["id"] in stages_completed
        if stage["stage_num"] == 1:
            stage["is_unlocked"] = True
        else:
            prev_stage_id = f"stage_level_{level_num}_{stage['stage_num'] - 1}"
            stage["is_unlocked"] = prev_stage_id in stages_completed

    return {"level": level, "stages": stages}
