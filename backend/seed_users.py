import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import os
import uuid
from datetime import datetime, timezone
from passlib.context import CryptContext

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def seed_test_users():
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
    asyncio.run(seed_test_users())
