"""Admin routes: questions, notices, users, reports."""
import csv
import io
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Body, Depends, File, HTTPException, UploadFile

from core import db, get_admin_user
from models import NoticeCreate, QuestionCreate, QuestionSequenceUpdate, User

router = APIRouter(tags=["admin"])


# ---------------- Questions ----------------

@router.get("/admin/questions")
async def get_admin_questions(
    subject_id: Optional[str] = None,
    level_num: Optional[int] = None,
    admin: User = Depends(get_admin_user),
):
    query: dict = {}
    if subject_id:
        query["subject_id"] = subject_id
    if level_num:
        query["level_num"] = level_num
    return await db.edu_questions.find(query, {"_id": 0}).limit(500).to_list(500)


@router.patch("/admin/questions/{question_id}/sequence")
async def update_question_sequence(
    question_id: str,
    payload: QuestionSequenceUpdate,
    admin: User = Depends(get_admin_user),
):
    if payload.sequence_number < 0:
        raise HTTPException(status_code=400, detail="Sequence number must be >= 0")
    result = await db.edu_questions.update_one(
        {"id": question_id}, {"$set": {"sequence_number": payload.sequence_number}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Question not found")
    return {"message": "Sequence updated", "sequence_number": payload.sequence_number}


def _validate_question_media(image: Optional[str], audio: Optional[str]):
    """Validate data-URL image/audio against size caps."""
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


@router.post("/admin/questions")
async def create_question(question: QuestionCreate, admin: User = Depends(get_admin_user)):
    _validate_question_media(question.image, question.audio)
    if question.difficulty not in ("apprentice", "master", "legend"):
        raise HTTPException(
            status_code=400, detail="Difficulty must be apprentice, master, or legend"
        )

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
        "created_by": admin.id,
    }
    await db.edu_questions.insert_one(question_doc)
    return {"message": "Question created", "id": question_doc["id"]}


@router.put("/admin/questions/{question_id}")
async def update_question(
    question_id: str, question: QuestionCreate, admin: User = Depends(get_admin_user)
):
    _validate_question_media(question.image, question.audio)
    if question.difficulty not in ("apprentice", "master", "legend"):
        raise HTTPException(
            status_code=400, detail="Difficulty must be apprentice, master, or legend"
        )
    result = await db.edu_questions.update_one(
        {"id": question_id},
        {
            "$set": {
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
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        },
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Question not found")
    return {"message": "Question updated"}


@router.delete("/admin/questions/{question_id}")
async def delete_question(question_id: str, admin: User = Depends(get_admin_user)):
    result = await db.edu_questions.delete_one({"id": question_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Question not found")
    return {"message": "Question deleted"}


@router.post("/admin/questions/bulk-delete")
async def bulk_delete_questions(
    payload: dict = Body(...), admin: User = Depends(get_admin_user)
):
    """Delete multiple questions by id. Body: { "ids": [str, ...] }"""
    ids = payload.get("ids") or []
    if not isinstance(ids, list) or not ids:
        raise HTTPException(status_code=400, detail="`ids` must be a non-empty list")
    ids = [str(i) for i in ids if i]
    result = await db.edu_questions.delete_many({"id": {"$in": ids}})
    return {"message": "Questions deleted", "deleted": result.deleted_count}


@router.post("/admin/questions/bulk")
async def bulk_upload_questions(
    file: UploadFile = File(...), admin: User = Depends(get_admin_user)
):
    """
    Upload questions via CSV.

    Accepts the Export CSV schema (option_a_en ... option_d_zh) and the legacy
    schema (option1_en ... option4_zh). option_a_en / option_b_en are required.
    Chinese options auto-fall-back to their English counterpart per slot.
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="File is empty")

    try:
        decoded = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        decoded = content.decode("utf-8", errors="replace")

    reader = csv.DictReader(io.StringIO(decoded))

    def col(row: dict, *names: str) -> str:
        for n in names:
            if n in row and row[n] is not None and str(row[n]).strip() != "":
                return str(row[n]).strip()
            for k, v in row.items():
                if k and k.strip().lower() == n.lower() and v is not None and str(v).strip() != "":
                    return str(v).strip()
        return ""

    questions: list = []
    errors: list = []
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
            if not text_zh:
                text_zh = text_en

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
            if not options_en[0] or not options_en[1]:
                errors.append(f"Row {row_num}: option_a_en and option_b_en are required")
                continue
            options_zh = [zh or en for en, zh in zip(options_en, options_zh_raw)]

            correct_answer = int(col(row, "correct_answer") or 0)
            if correct_answer < 0 or correct_answer > 3:
                errors.append(f"Row {row_num}: correct_answer must be 0-3")
                continue
            if not options_en[correct_answer]:
                errors.append(
                    f"Row {row_num}: correct_answer points to empty option "
                    f"{chr(65 + correct_answer)}"
                )
                continue

            points = int(col(row, "points") or 10)
            sequence_number = int(col(row, "sequence_number") or 0)

            difficulty = (col(row, "difficulty") or "apprentice").lower()
            if difficulty not in ("apprentice", "master", "legend"):
                difficulty = "apprentice"

            stage_id = f"stage_{subject_id}_level_{level_num}_{stage_num}"
            questions.append(
                {
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
                    "created_by": admin.id,
                }
            )
        except Exception as e:  # noqa: BLE001 — surface the row error
            errors.append(f"Row {row_num}: {str(e)}")

    if not questions and not errors:
        raise HTTPException(
            status_code=400, detail="CSV contains no rows. Expected header row + data rows."
        )

    if questions:
        await db.edu_questions.insert_many(questions)

    return {
        "message": f"Uploaded {len(questions)} questions"
        + (f", {len(errors)} skipped" if errors else ""),
        "uploaded": len(questions),
        "errors": errors[:25],
        "error_count": len(errors),
    }


# ---------------- Notices ----------------

@router.post("/admin/notices")
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
        "created_by": admin.id,
    }
    await db.notices.insert_one(notice_doc)
    return {"message": "Notice created", "id": notice_doc["id"]}


@router.get("/admin/notices")
async def get_admin_notices(admin: User = Depends(get_admin_user)):
    return (
        await db.notices.find({}, {"_id": 0})
        .sort("created_at", -1)
        .limit(50)
        .to_list(50)
    )


@router.delete("/admin/notices/{notice_id}")
async def delete_notice(notice_id: str, admin: User = Depends(get_admin_user)):
    result = await db.notices.delete_one({"id": notice_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notice not found")
    return {"message": "Notice deleted"}


# ---------------- Users ----------------

@router.get("/admin/users")
async def get_admin_users(admin: User = Depends(get_admin_user)):
    return await db.users.find({}, {"_id": 0, "password": 0}).limit(200).to_list(200)


@router.get("/admin/users/{user_id}")
async def get_admin_user_detail(user_id: str, admin: User = Depends(get_admin_user)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    quiz_count = await db.quiz_history.count_documents({"user_id": user_id})
    recent = (
        await db.quiz_history.find({"user_id": user_id}, {"_id": 0, "results": 0})
        .sort("completed_at", -1)
        .limit(5)
        .to_list(5)
    )
    user["recent_quiz_history"] = recent
    user["quiz_history_count"] = quiz_count
    return user


@router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, admin: User = Depends(get_admin_user)):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted"}


# ---------------- Reports ----------------

@router.get("/admin/reports")
async def get_admin_reports(admin: User = Depends(get_admin_user)):
    total_users = await db.users.count_documents({})
    total_quizzes = await db.quiz_history.count_documents({})

    subject_stats = []
    subjects = await db.subjects.find({}, {"_id": 0}).to_list(100)
    for subject in subjects:
        count = await db.quiz_history.count_documents({"subject_id": subject["id"]})
        avg_pipeline = [
            {"$match": {"subject_id": subject["id"]}},
            {
                "$group": {
                    "_id": None,
                    "avg_score": {"$avg": {"$divide": ["$score", "$total"]}},
                }
            },
        ]
        avg_result = await db.quiz_history.aggregate(avg_pipeline).to_list(1)
        avg_score = round(avg_result[0]["avg_score"] * 100, 1) if avg_result else 0
        subject_stats.append(
            {
                "subject": subject,
                "quizzes_completed": count,
                "average_score_pct": avg_score,
            }
        )

    seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    active_users = await db.activity_logs.distinct(
        "user_id", {"timestamp": {"$gte": seven_days_ago}}
    )

    return {
        "total_users": total_users,
        "total_quizzes_completed": total_quizzes,
        "active_users_7d": len(active_users),
        "subject_stats": subject_stats,
    }
