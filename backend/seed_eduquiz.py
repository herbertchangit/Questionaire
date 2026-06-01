"""
Monster Huddle - Database Seed Script
Seeds levels, stages, and sample questions for the quiz app
Subjects are just categories for questions, not tied to levels
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import os
import uuid
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Subjects (just categories for questions, not tied to levels)
SUBJECTS = [
    {"id": "subj_accounting",        "name_en": "Accounting",        "name_zh": "会计",       "icon": "calculator",     "color": "#0EA5E9"},
    {"id": "subj_bahasa_melayu",     "name_en": "Bahasa Melayu",     "name_zh": "马来文",     "icon": "book-open",      "color": "#8B5CF6"},
    {"id": "subj_biology",           "name_en": "Biology",           "name_zh": "生物",       "icon": "leaf",           "color": "#10B981"},
    {"id": "subj_business",          "name_en": "Business",          "name_zh": "商业",       "icon": "briefcase",      "color": "#0891B2"},
    {"id": "subj_chemistry",         "name_en": "Chemistry",         "name_zh": "化学",       "icon": "flask-conical",  "color": "#F59E0B"},
    {"id": "subj_chinese",           "name_en": "Chinese",           "name_zh": "华文",       "icon": "languages",      "color": "#DC2626"},
    {"id": "subj_computer",          "name_en": "Computer",          "name_zh": "电脑",       "icon": "monitor",        "color": "#6366F1"},
    {"id": "subj_economics",         "name_en": "Economics",         "name_zh": "经济",       "icon": "trending-up",    "color": "#059669"},
    {"id": "subj_english",           "name_en": "English",           "name_zh": "英文",       "icon": "languages",      "color": "#2563EB"},
    {"id": "subj_geography",         "name_en": "Geography",         "name_zh": "地理",       "icon": "globe",          "color": "#0D9488"},
    {"id": "subj_history",           "name_en": "History",           "name_zh": "历史",       "icon": "landmark",       "color": "#B45309"},
    {"id": "subj_malay_literature",  "name_en": "Malay Literature",  "name_zh": "马来文文学", "icon": "book",           "color": "#9333EA"},
    {"id": "subj_mathematics",       "name_en": "Mathematics",       "name_zh": "数学",       "icon": "sigma",          "color": "#EC4899"},
    {"id": "subj_moral",             "name_en": "Moral",             "name_zh": "道德教育",   "icon": "heart",          "color": "#F472B6"},
    {"id": "subj_physics",           "name_en": "Physics",           "name_zh": "物理",       "icon": "atom",           "color": "#7C3AED"},
    {"id": "subj_science",           "name_en": "Science",           "name_zh": "科学",       "icon": "flask-conical",  "color": "#22C55E"},
]

# Levels (Game progression - independent of subjects)
LEVELS = [
    {"id": "level_1", "level_num": 1, "name_en": "Determination", "name_zh": "决心", "icon": "flame", "color": "#EF4444", "unlock_points": 0, "stages_count": 5},
    {"id": "level_2", "level_num": 2, "name_en": "Discipline", "name_zh": "自律", "icon": "target", "color": "#F59E0B", "unlock_points": 100, "stages_count": 5},
    {"id": "level_3", "level_num": 3, "name_en": "Perseverance", "name_zh": "毅力", "icon": "mountain", "color": "#10B981", "unlock_points": 300, "stages_count": 5},
    {"id": "level_4", "level_num": 4, "name_en": "Hard-working", "name_zh": "勤劳", "icon": "hammer", "color": "#3B82F6", "unlock_points": 600, "stages_count": 5},
    {"id": "level_5", "level_num": 5, "name_en": "Breakthrough", "name_zh": "突破", "icon": "rocket", "color": "#8B5CF6", "unlock_points": 1000, "stages_count": 5}
]

# Sample questions (mixed subjects per stage)
QUESTIONS = [
    # Level 1, Stage 1 - Mixed subjects
    {"level_num": 1, "stage_num": 1, "subject_id": "subj_bahasa_melayu", "text_en": "What is the meaning of 'Selamat Pagi'?", "text_zh": "'Selamat Pagi' 是什么意思?", "options_en": ["Good morning", "Good night", "Good afternoon", "Goodbye"], "options_zh": ["早安", "晚安", "下午好", "再见"], "correct_answer": 0},
    {"level_num": 1, "stage_num": 1, "subject_id": "subj_history", "text_en": "When did Malaysia gain independence?", "text_zh": "马来西亚何时获得独立?", "options_en": ["1957", "1963", "1945", "1969"], "options_zh": ["1957年", "1963年", "1945年", "1969年"], "correct_answer": 0},
    {"level_num": 1, "stage_num": 1, "subject_id": "subj_science", "text_en": "What is the chemical symbol for water?", "text_zh": "水的化学符号是什么?", "options_en": ["H2O", "CO2", "NaCl", "O2"], "options_zh": ["H2O", "CO2", "NaCl", "O2"], "correct_answer": 0},
    
    # Level 1, Stage 2
    {"level_num": 1, "stage_num": 2, "subject_id": "subj_bahasa_melayu", "text_en": "What does 'Terima Kasih' mean?", "text_zh": "'Terima Kasih' 是什么意思?", "options_en": ["Thank you", "Sorry", "Please", "Welcome"], "options_zh": ["谢谢", "对不起", "请", "欢迎"], "correct_answer": 0},
    {"level_num": 1, "stage_num": 2, "subject_id": "subj_history", "text_en": "Who was the first Prime Minister of Malaysia?", "text_zh": "谁是马来西亚第一任首相?", "options_en": ["Tunku Abdul Rahman", "Tun Razak", "Tun Hussein Onn", "Dr. Mahathir"], "options_zh": ["东姑阿都拉曼", "敦拉萨", "敦乌森翁", "马哈迪医生"], "correct_answer": 0},
    {"level_num": 1, "stage_num": 2, "subject_id": "subj_science", "text_en": "Which planet is known as the Red Planet?", "text_zh": "哪颗行星被称为红色星球?", "options_en": ["Mars", "Venus", "Jupiter", "Saturn"], "options_zh": ["火星", "金星", "木星", "土星"], "correct_answer": 0},
    
    # Level 1, Stage 3
    {"level_num": 1, "stage_num": 3, "subject_id": "subj_bahasa_melayu", "text_en": "Which word means 'school' in Bahasa Malaysia?", "text_zh": "哪个词在马来语中表示 '学校'?", "options_en": ["Sekolah", "Rumah", "Kedai", "Hospital"], "options_zh": ["Sekolah", "Rumah", "Kedai", "Hospital"], "correct_answer": 0},
    {"level_num": 1, "stage_num": 3, "subject_id": "subj_history", "text_en": "What is the name of Malaysia's national flag?", "text_zh": "马来西亚国旗的名称是什么?", "options_en": ["Jalur Gemilang", "Sang Saka", "Bendera Kebangsaan", "Panji Negara"], "options_zh": ["辉煌条纹", "Sang Saka", "国旗", "国家旗帜"], "correct_answer": 0},
    {"level_num": 1, "stage_num": 3, "subject_id": "subj_science", "text_en": "What is the largest organ in the human body?", "text_zh": "人体最大的器官是什么?", "options_en": ["Skin", "Liver", "Heart", "Brain"], "options_zh": ["皮肤", "肝脏", "心脏", "大脑"], "correct_answer": 0},
    
    # Level 1, Stage 4
    {"level_num": 1, "stage_num": 4, "subject_id": "subj_bahasa_melayu", "text_en": "What is the Malay word for 'water'?", "text_zh": "'水' 的马来语是什么?", "options_en": ["Air", "Api", "Angin", "Awan"], "options_zh": ["Air", "Api", "Angin", "Awan"], "correct_answer": 0},
    {"level_num": 1, "stage_num": 4, "subject_id": "subj_history", "text_en": "Which ancient kingdom was located in Kedah?", "text_zh": "哪个古代王国位于吉打?", "options_en": ["Langkasuka", "Majapahit", "Srivijaya", "Malacca"], "options_zh": ["狼牙修", "满者伯夷", "室利佛逝", "马六甲"], "correct_answer": 0},
    {"level_num": 1, "stage_num": 4, "subject_id": "subj_science", "text_en": "What gas do plants absorb from the atmosphere?", "text_zh": "植物从大气中吸收什么气体?", "options_en": ["Carbon dioxide", "Oxygen", "Nitrogen", "Hydrogen"], "options_zh": ["二氧化碳", "氧气", "氮气", "氢气"], "correct_answer": 0},
    
    # Level 1, Stage 5
    {"level_num": 1, "stage_num": 5, "subject_id": "subj_bahasa_melayu", "text_en": "Choose the correct spelling:", "text_zh": "选择正确的拼写:", "options_en": ["Kerajaan", "Karajaan", "Kerajann", "Karajann"], "options_zh": ["Kerajaan", "Karajaan", "Kerajann", "Karajann"], "correct_answer": 0},
    {"level_num": 1, "stage_num": 5, "subject_id": "subj_history", "text_en": "The Malacca Sultanate was founded in which year?", "text_zh": "马六甲苏丹国成立于哪一年?", "options_en": ["1400", "1511", "1824", "1957"], "options_zh": ["1400年", "1511年", "1824年", "1957年"], "correct_answer": 0},
    {"level_num": 1, "stage_num": 5, "subject_id": "subj_science", "text_en": "What is the boiling point of water in Celsius?", "text_zh": "水的沸点是多少摄氏度?", "options_en": ["100°C", "0°C", "50°C", "212°C"], "options_zh": ["100°C", "0°C", "50°C", "212°C"], "correct_answer": 0},
]

# Welcome messages
WELCOME_MESSAGES = [
    {"id": str(uuid.uuid4()), "message_en": "Welcome back! Ready to learn something new today?", "message_zh": "欢迎回来!准备好今天学习新东西了吗?", "condition": "returning_user", "priority": 1},
    {"id": str(uuid.uuid4()), "message_en": "Great job on your progress! Keep it up!", "message_zh": "你的进步很棒!继续加油!", "condition": "has_progress", "priority": 2},
    {"id": str(uuid.uuid4()), "message_en": "Welcome to Monster Huddle! Let's start your learning journey!", "message_zh": "欢迎来到Monster Huddle!让我们开始你的学习之旅!", "condition": "new_user", "priority": 1}
]

# Notices
NOTICES = [
    {"id": str(uuid.uuid4()), "title_en": "Welcome to Monster Huddle!", "title_zh": "欢迎来到Monster Huddle!", "content_en": "Start your learning journey with our interactive quizzes. Complete stages to earn points and level up!", "content_zh": "通过我们的互动测验开始您的学习之旅。完成阶段以获得积分并升级!", "type": "announcement", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
    {"id": str(uuid.uuid4()), "title_en": "LIVE Competition Coming Soon!", "title_zh": "实时竞赛即将推出!", "content_en": "Get ready to compete with your classmates in real-time quiz battles!", "content_zh": "准备好与同学们进行实时测验比赛!", "type": "upcoming", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()}
]

async def seed_database():
    print("🌱 Starting database seed...")
    
    # Clear existing data
    await db.subjects.delete_many({})
    await db.levels.delete_many({})
    await db.stages.delete_many({})
    await db.edu_questions.delete_many({})
    await db.welcome_messages.delete_many({})
    await db.notices.delete_many({})
    
    # Seed subjects (just categories)
    print("📚 Seeding subjects...")
    await db.subjects.insert_many(SUBJECTS)
    
    # Backfill: rename legacy subj_bm references on existing questions to new ID
    await db.edu_questions.update_many({"subject_id": "subj_bahasa_melayu"}, {"$set": {"subject_id": "subj_bahasa_melayu"}})
    
    # Seed levels
    print("🎮 Seeding levels...")
    await db.levels.insert_many(LEVELS)
    
    # Seed stages (5 per level = 25 total, NOT per subject)
    print("📊 Seeding stages...")
    stages = []
    for level in LEVELS:
        for stage_num in range(1, 6):
            stage = {
                "id": f"stage_level_{level['level_num']}_{stage_num}",
                "level_id": level["id"],
                "level_num": level["level_num"],
                "stage_num": stage_num,
                "name_en": f"Stage {stage_num}",
                "name_zh": f"第{stage_num}阶段",
                "questions_count": 3,
                "time_limit": 120,
                "points_reward": 10 * stage_num * level["level_num"]
            }
            stages.append(stage)
    await db.stages.insert_many(stages)
    
    # Seed questions
    print("❓ Seeding questions...")
    questions = []
    for q in QUESTIONS:
        stage_id = f"stage_level_{q['level_num']}_{q['stage_num']}"
        question = {
            "id": str(uuid.uuid4()),
            "subject_id": q["subject_id"],
            "level_num": q["level_num"],
            "stage_num": q["stage_num"],
            "stage_id": stage_id,
            "text_en": q["text_en"],
            "text_zh": q["text_zh"],
            "options_en": q["options_en"],
            "options_zh": q["options_zh"],
            "correct_answer": q["correct_answer"],
            "points": 10,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        questions.append(question)
    await db.edu_questions.insert_many(questions)
    
    # Seed welcome messages & notices
    print("👋 Seeding welcome messages...")
    await db.welcome_messages.insert_many(WELCOME_MESSAGES)
    print("📢 Seeding notices...")
    await db.notices.insert_many(NOTICES)
    
    # Update existing users
    print("👤 Updating users...")
    await db.users.update_many({}, {"$set": {
        "language": "en",
        "total_points": 0,
        "current_level": 1,
        "stages_completed": [],
        "total_time_spent": 0,
        "quizzes_completed": 0
    }})
    
    print("✅ Database seeded successfully!")
    print(f"   - {len(SUBJECTS)} subjects (categories)")
    print(f"   - {len(LEVELS)} levels")
    print(f"   - {len(stages)} stages (5 per level)")
    print(f"   - {len(questions)} questions")

if __name__ == "__main__":
    asyncio.run(seed_database())

# Update seed to add test users with new schema
async def seed_test_users():
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    # Delete existing test users
    await db.users.delete_many({"username": {"$in": ["demo", "admin"]}})
    
    test_users = [
        {
            "id": str(uuid.uuid4()),
            "username": "demo",
            "password": pwd_context.hash("demo123"),
            "full_name": "Demo Student",
            "school_name": "SMK Taman Desa",
            "town": "Kuala Lumpur",
            "current_grade": 3,
            "date_of_birth": "2010-05-15",
            "latest_marks": {"bm": 75, "sejarah": 68, "science": 82},
            "role": "user",
            "language": "en",
            "total_points": 0,
            "current_level": 1,
            "stages_completed": [],
            "total_time_spent": 0,
            "quizzes_completed": 0,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "username": "admin",
            "password": pwd_context.hash("admin123"),
            "full_name": "Admin User",
            "school_name": "Monster Huddle Admin",
            "town": "Kuala Lumpur",
            "current_grade": 6,
            "date_of_birth": "2005-01-01",
            "latest_marks": {"bm": 90, "sejarah": 95, "science": 88},
            "role": "admin",
            "language": "en",
            "total_points": 500,
            "current_level": 3,
            "stages_completed": [],
            "total_time_spent": 0,
            "quizzes_completed": 0,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.users.insert_many(test_users)
    print("✅ Test users created: demo/demo123, admin/admin123")

if __name__ == "__main__":
    async def main():
        await seed_database()
        await seed_test_users()
    asyncio.run(main())
