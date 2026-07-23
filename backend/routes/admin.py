"""Admin routes: questions, schools, notices, users, reports."""
import csv
import io
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Body, Depends, File, HTTPException, UploadFile

from core import db, get_admin_user
from models import NoticeCreate, QuestionCreate, QuestionSequenceUpdate, SchoolCreate, SubjectCreate, User

router = APIRouter(tags=["admin"])


def _default_school_organization() -> dict:
    return {
        "campus": {
            "academic_year": [],
            "grades": [],
            "classes": [],
            "teachers": [],
            "students": [],
            "facilities": [],
        },
        "departments": [],
        "subjects": [],
        "fees": [],
        "settings": {},
    }


def _clean_school_items(items: list[str]) -> list[str]:
    cleaned: list[str] = []
    seen: set[str] = set()
    for item in items or []:
        value = str(item).strip()
        key = value.lower()
        if value and key not in seen:
            cleaned.append(value)
            seen.add(key)
    return cleaned[:100]


def _clean_school_form_classes(school: SchoolCreate) -> list[dict]:
    cleaned: list[dict] = []
    seen_forms: set[str] = set()

    for group in school.form_classes or []:
        form_name = group.form_name.strip()
        key = form_name.lower()
        if not form_name or key in seen_forms:
            continue
        cleaned.append(
            {
                "form_name": form_name,
                "classes": _clean_school_items(group.classes),
            }
        )
        seen_forms.add(key)

    if cleaned:
        return cleaned[:100]

    return [{"form_name": form, "classes": []} for form in _clean_school_items(school.forms)]


def _flatten_school_forms(form_classes: list[dict]) -> list[str]:
    return [group["form_name"] for group in form_classes]


def _flatten_school_classes(form_classes: list[dict]) -> list[str]:
    flattened: list[str] = []
    seen: set[str] = set()
    for group in form_classes:
        for class_name in group.get("classes", []):
            key = class_name.lower()
            if key not in seen:
                flattened.append(class_name)
                seen.add(key)
    return flattened


def _school_organization(form_classes: list[dict], existing: Optional[dict] = None) -> dict:
    organization = existing or _default_school_organization()
    campus = organization.setdefault("campus", {})
    campus["grades"] = _flatten_school_forms(form_classes)
    campus["classes"] = form_classes
    return organization


def _validate_school_logo(school_logo: Optional[str]):
    if not school_logo:
        return
    if not school_logo.startswith("data:image/"):
        raise HTTPException(status_code=400, detail="School logo must be an image data URL")
    if len(school_logo) > 1_500_000:
        raise HTTPException(status_code=413, detail="School logo too large. Max ~1MB.")


def _clean_subject_chapters(chapters: list[str]) -> list[str]:
    return _clean_school_items(chapters)[:200]


async def _subject_payload(subject: SubjectCreate) -> dict:
    school = await db.schools.find_one({"id": subject.school_id}, {"_id": 0})
    if not school:
        raise HTTPException(status_code=400, detail="Selected school was not found")

    forms = school.get("form_classes") or [
        {"form_name": form_name, "classes": []} for form_name in school.get("forms", [])
    ]
    form_names = {str(group.get("form_name", "")).strip() for group in forms}
    form_name = subject.form_name.strip()
    if form_name not in form_names:
        raise HTTPException(status_code=400, detail="Selected form does not belong to this school")

    return {
        "name_en": subject.name_en.strip(),
        "name_zh": (subject.name_zh or subject.name_en).strip(),
        "school_id": school["id"],
        "school_name": school["school_name"],
        "form_name": form_name,
        "chapters": _clean_subject_chapters(subject.chapters),
        "icon": subject.icon.strip() or "book-open",
        "color": subject.color.strip() or "#8B5CF6",
        "is_active": subject.is_active,
    }


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
        "form_name": (question.form_name or "").strip(),
        "chapter": (question.chapter or "").strip(),
        "branch": (question.branch or "").strip(),
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
                "subject_id": question.subject_id,
                "level_num": question.level_num,
                "stage_num": question.stage_num,
                "stage_id": f"stage_{question.subject_id}_level_{question.level_num}_{question.stage_num}",
                "text_en": question.text_en,
                "form_name": (question.form_name or "").strip(),
                "chapter": (question.chapter or "").strip(),
                "branch": (question.branch or "").strip(),
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
    if result.matched_count == 0:
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
            form_name = col(row, "form_name", "form")
            chapter = col(row, "chapter")
            branch = col(row, "branch")
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
                    "form_name": form_name,
                    "chapter": chapter,
                    "branch": branch,
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


# ---------------- Subjects ----------------

@router.get("/admin/subjects")
async def get_admin_subjects(admin: User = Depends(get_admin_user)):
    return (
        await db.subjects.find({}, {"_id": 0})
        .sort([("school_name", 1), ("form_name", 1), ("name_en", 1)])
        .limit(500)
        .to_list(500)
    )


@router.post("/admin/subjects")
async def create_subject(subject: SubjectCreate, admin: User = Depends(get_admin_user)):
    payload = await _subject_payload(subject)
    now = datetime.now(timezone.utc).isoformat()
    subject_doc = {
        "id": str(uuid.uuid4()),
        **payload,
        "created_at": now,
        "updated_at": now,
        "created_by": admin.id,
    }
    await db.subjects.insert_one(subject_doc)
    return {"message": "Subject created", "id": subject_doc["id"]}


@router.put("/admin/subjects/{subject_id}")
async def update_subject(
    subject_id: str, subject: SubjectCreate, admin: User = Depends(get_admin_user)
):
    existing = await db.subjects.find_one({"id": subject_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Subject not found")

    payload = await _subject_payload(subject)
    payload["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.subjects.update_one({"id": subject_id}, {"$set": payload})
    return {"message": "Subject updated"}


@router.delete("/admin/subjects/{subject_id}")
async def delete_subject(subject_id: str, admin: User = Depends(get_admin_user)):
    result = await db.subjects.delete_one({"id": subject_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Subject not found")
    return {"message": "Subject deleted"}


# ---------------- Schools ----------------

@router.get("/admin/schools")
async def get_admin_schools(admin: User = Depends(get_admin_user)):
    return (
        await db.schools.find({}, {"_id": 0})
        .sort("created_at", -1)
        .limit(200)
        .to_list(200)
    )


@router.post("/admin/schools")
async def create_school(school: SchoolCreate, admin: User = Depends(get_admin_user)):
    _validate_school_logo(school.school_logo)
    now = datetime.now(timezone.utc).isoformat()
    form_classes = _clean_school_form_classes(school)
    forms = _flatten_school_forms(form_classes)
    classes = _flatten_school_classes(form_classes)
    school_doc = {
        "id": str(uuid.uuid4()),
        "school_name": school.school_name.strip(),
        "address": school.address.strip(),
        "education_level": school.education_level.strip(),
        "forms": forms,
        "classes": classes,
        "form_classes": form_classes,
        "school_logo": school.school_logo,
        "organization": _school_organization(form_classes),
        "created_at": now,
        "updated_at": now,
        "created_by": admin.id,
    }
    await db.schools.insert_one(school_doc)
    return {"message": "School created", "id": school_doc["id"]}


@router.put("/admin/schools/{school_id}")
async def update_school(
    school_id: str, school: SchoolCreate, admin: User = Depends(get_admin_user)
):
    _validate_school_logo(school.school_logo)
    existing = await db.schools.find_one({"id": school_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="School not found")

    form_classes = _clean_school_form_classes(school)
    forms = _flatten_school_forms(form_classes)
    classes = _flatten_school_classes(form_classes)
    update_doc = {
        "school_name": school.school_name.strip(),
        "address": school.address.strip(),
        "education_level": school.education_level.strip(),
        "forms": forms,
        "classes": classes,
        "form_classes": form_classes,
        "school_logo": school.school_logo,
        "organization": _school_organization(form_classes, existing.get("organization")),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.schools.update_one({"id": school_id}, {"$set": update_doc})
    return {"message": "School updated"}


@router.delete("/admin/schools/{school_id}")
async def delete_school(school_id: str, admin: User = Depends(get_admin_user)):
    result = await db.schools.delete_one({"id": school_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="School not found")
    return {"message": "School deleted"}


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
    total_questions = await db.edu_questions.count_documents({})
    total_schools = await db.schools.count_documents({})
    total_subjects = await db.subjects.count_documents({})
    active_notices = await db.notices.count_documents({"is_active": True})
    total_tournaments = await db.tournaments.count_documents({})

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
        "total_questions": total_questions,
        "total_schools": total_schools,
        "total_subjects": total_subjects,
        "active_notices": active_notices,
        "total_tournaments": total_tournaments,
        "active_users_7d": len(active_users),
        "subject_stats": subject_stats,
    }
