"""
Gameplay progression rules for EduQuiz.
Source of truth for level names, requirements per difficulty, and rewards.
"""

LEVEL_NAMES = {
    1: "Determination",
    2: "Discipline",
    3: "Perseverance",
    4: "Hard-Working",
    5: "Breakthrough",
}

LEVEL_NAMES_ZH = {
    1: "决心",
    2: "自律",
    3: "毅力",
    4: "勤劳",
    5: "突破",
}

# Per-level requirements: apprentice / master / legend correct counts
LEVEL_REQUIREMENTS = {
    1: {"apprentice": 3, "master": 0, "legend": 0},
    2: {"apprentice": 3, "master": 2, "legend": 0},
    3: {"apprentice": 3, "master": 5, "legend": 2},
    4: {"apprentice": 3, "master": 7, "legend": 5},
    5: {"apprentice": 3, "master": 10, "legend": 7},
}

# Rewards granted on completing each level (and unlocking the next)
LEVEL_REWARDS = {
    1: {"coins": 100, "xp": 50,  "badge": "Determination"},
    2: {"coins": 200, "xp": 75,  "badge": "Discipline"},
    3: {"coins": 350, "xp": 100, "badge": "Perseverance"},
    4: {"coins": 500, "xp": 150, "badge": "Hard-Working"},
    5: {"coins": 1000,"xp": 250, "badge": "Breakthrough"},
}

DIFFICULTIES = ("apprentice", "master", "legend")
MAX_LEVEL = 5


def get_level_name(level_num: int, language: str = "en") -> str:
    table = LEVEL_NAMES_ZH if language == "zh" else LEVEL_NAMES
    return table.get(level_num, str(level_num))


def get_progress(user_doc: dict) -> dict:
    """
    Compute progression payload for a user.
    user_doc should contain: current_level (int), apprentice_completed,
    master_completed, legend_completed, level_up_date.
    """
    current_level = max(1, min(MAX_LEVEL, int(user_doc.get("current_level") or 1)))
    is_max = current_level >= MAX_LEVEL and _meets_requirements(user_doc, current_level)
    
    reqs = LEVEL_REQUIREMENTS.get(current_level, {"apprentice": 0, "master": 0, "legend": 0})
    
    current = {
        "apprentice": int(user_doc.get("apprentice_completed") or 0),
        "master": int(user_doc.get("master_completed") or 0),
        "legend": int(user_doc.get("legend_completed") or 0),
    }
    
    # Per-difficulty percentages capped at 100
    per_diff = {}
    fulfilled_required = 0
    total_required = 0
    for d in DIFFICULTIES:
        required = reqs[d]
        done = current[d]
        pct = 100.0 if required == 0 else min(100.0, (done / required) * 100.0)
        per_diff[d] = {
            "current": done,
            "required": required,
            "percent": round(pct, 1),
            "complete": required == 0 or done >= required,
        }
        # Only count categories that actually require something
        if required > 0:
            total_required += required
            fulfilled_required += min(done, required)
    
    overall = 100.0 if total_required == 0 else round((fulfilled_required / total_required) * 100.0, 1)
    
    can_advance = all(per_diff[d]["complete"] for d in DIFFICULTIES)
    
    next_level_num = current_level + 1 if current_level < MAX_LEVEL else None
    
    return {
        "current_level_num": current_level,
        "current_level_name_en": LEVEL_NAMES.get(current_level),
        "current_level_name_zh": LEVEL_NAMES_ZH.get(current_level),
        "requirements": reqs,
        "progress": per_diff,
        "overall_percent": overall,
        "can_advance": can_advance and not is_max,
        "is_max_level": current_level >= MAX_LEVEL,
        "next_level_num": next_level_num,
        "next_level_name_en": LEVEL_NAMES.get(next_level_num) if next_level_num else None,
        "next_level_name_zh": LEVEL_NAMES_ZH.get(next_level_num) if next_level_num else None,
        "next_level_rewards": LEVEL_REWARDS.get(next_level_num) if next_level_num else None,
        "total_questions_answered": int(user_doc.get("total_questions_answered") or 0),
        "total_correct_answers": int(user_doc.get("total_correct_answers") or 0),
        "level_up_date": user_doc.get("level_up_date"),
        "coins": int(user_doc.get("coins") or 0),
        "xp": int(user_doc.get("xp") or 0),
        "badges": user_doc.get("badges") or [],
    }


def _meets_requirements(user_doc: dict, level_num: int) -> bool:
    reqs = LEVEL_REQUIREMENTS.get(level_num)
    if not reqs:
        return False
    return all(
        int(user_doc.get(f"{d}_completed") or 0) >= reqs[d]
        for d in DIFFICULTIES
    )


def check_level_up(user_doc: dict) -> dict | None:
    """
    Returns dict {from_level, to_level, rewards, level_name_en, level_name_zh}
    if a level-up should happen, else None.
    Does not mutate the user_doc.
    """
    current_level = max(1, min(MAX_LEVEL, int(user_doc.get("current_level") or 1)))
    if current_level >= MAX_LEVEL:
        return None
    if not _meets_requirements(user_doc, current_level):
        return None
    next_level = current_level + 1
    return {
        "from_level": current_level,
        "to_level": next_level,
        "level_name_en": LEVEL_NAMES.get(next_level),
        "level_name_zh": LEVEL_NAMES_ZH.get(next_level),
        "rewards": LEVEL_REWARDS.get(next_level, {}),
    }
