"""Quiz gameplay, progression, history, and stats routes."""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from core import db, get_current_user, log_activity
from gameplay import check_level_up, get_progress
from models import QuizSubmission, User

router = APIRouter(tags=["quiz"])


@router.get("/stages/{stage_id}/play")
async def start_stage(stage_id: str, current_user: User = Depends(get_current_user)):
    stage = await db.stages.find_one({"id": stage_id}, {"_id": 0})
    if not stage:
        raise HTTPException(status_code=404, detail="Stage not found")

    questions = (
        await db.edu_questions.find(
            {"level_num": stage["level_num"], "stage_num": stage["stage_num"]},
            {"_id": 0, "correct_answer": 0},
        )
        .sort("sequence_number", 1)
        .to_list(100)
    )

    await log_activity(current_user.id, "quiz_start", {"stage_id": stage_id})

    return {"stage": stage, "questions": questions, "time_limit": stage["time_limit"]}


@router.post("/stages/{stage_id}/submit")
async def submit_stage(
    stage_id: str,
    submission: QuizSubmission,
    current_user: User = Depends(get_current_user),
):
    stage = await db.stages.find_one({"id": stage_id}, {"_id": 0})
    if not stage:
        raise HTTPException(status_code=404, detail="Stage not found")

    questions = await db.edu_questions.find(
        {"level_num": stage["level_num"], "stage_num": stage["stage_num"]}, {"_id": 0}
    ).to_list(100)

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
        results.append(
            {
                "question_id": q["id"],
                "user_answer": user_answer,
                "correct_answer": q["correct_answer"],
                "is_correct": is_correct,
                "difficulty": diff,
            }
        )

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
        "completed_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.quiz_history.insert_one(history_doc)

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
        {"$inc": inc_payload, "$set": {"stages_completed": stages_completed}},
    )

    fresh_user = await db.users.find_one({"id": current_user.id}, {"_id": 0})
    level_up_info = None

    # Auto-advance through multiple levels if applicable
    while True:
        lu = check_level_up(fresh_user)
        if not lu:
            break
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
                },
            },
        )
        fresh_user = await db.users.find_one({"id": current_user.id}, {"_id": 0})
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


@router.get("/user/progression")
async def get_user_progression(current_user: User = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user.id}, {"_id": 0, "password": 0})
    return get_progress(user)


@router.get("/progress/stats")
async def get_progress_stats(current_user: User = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user.id}, {"_id": 0, "password": 0})
    stages_completed = user.get("stages_completed", [])

    total_stages = 25  # 5 levels x 5 stages
    completion_pct = round((len(stages_completed) / total_stages) * 100, 1)

    levels = await db.levels.find({}, {"_id": 0}).sort("level_num", 1).to_list(100)
    level_stats = []
    for level in levels:
        level_stages = [s for s in stages_completed if f"level_{level['level_num']}_" in s]
        level_stats.append(
            {
                "level": level,
                "stages_completed": len(level_stages),
                "is_unlocked": user.get("total_points", 0) >= level["unlock_points"],
            }
        )

    return {
        "total_points": user.get("total_points", 0),
        "current_level": user.get("current_level", 1),
        "total_time_spent": user.get("total_time_spent", 0),
        "quizzes_completed": user.get("quizzes_completed", 0),
        "stages_completed": len(stages_completed),
        "total_stages": total_stages,
        "completion_percentage": completion_pct,
        "level_stats": level_stats,
    }


@router.get("/progress/history")
async def get_quiz_history(limit: int = 20, current_user: User = Depends(get_current_user)):
    query = {"user_id": current_user.id}
    history = (
        await db.quiz_history.find(query, {"_id": 0})
        .sort("completed_at", -1)
        .limit(limit)
        .to_list(limit)
    )

    for item in history:
        results = item.get("results", [])
        if results:
            q_ids = [r["question_id"] for r in results]
            q_docs = await db.edu_questions.find(
                {"id": {"$in": q_ids}}, {"_id": 0, "id": 1, "subject_id": 1}
            ).to_list(100)
            qmap = {q["id"]: q.get("subject_id") for q in q_docs}

            breakdown: dict = {}
            for r in results:
                sid = qmap.get(r["question_id"], "unknown")
                b = breakdown.setdefault(sid, {"correct": 0, "total": 0})
                b["total"] += 1
                if r.get("is_correct"):
                    b["correct"] += 1
            item["subject_breakdown"] = breakdown
        else:
            item["subject_breakdown"] = {}
        item.pop("results", None)

    return history
