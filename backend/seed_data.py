import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import uuid
from datetime import datetime, timezone
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def seed_database():
    print("🌱 Seeding database...")
    
    # Clear existing data
    await db.users.delete_many({})
    await db.quizzes.delete_many({})
    await db.questions.delete_many({})
    await db.categories.delete_many({})
    await db.quiz_results.delete_many({})
    
    # Create admin user
    admin_id = str(uuid.uuid4())
    admin = {
        "id": admin_id,
        "name": "Admin",
        "email": "admin@quiz.com",
        "password": pwd_context.hash("admin123"),
        "level": 100,
        "points": 0,
        "completed_quizzes": [],
        "role": "admin",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(admin)
    print("✅ Admin user created: admin@quiz.com / admin123")
    
    # Create demo user
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "name": "Demo User",
        "email": "demo@quiz.com",
        "password": pwd_context.hash("demo123"),
        "level": 1,
        "points": 0,
        "completed_quizzes": [],
        "role": "user",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user)
    print("✅ Demo user created: demo@quiz.com / demo123")
    
    # Create categories
    categories = [
        {"id": str(uuid.uuid4()), "name": "Programming", "description": "Test your coding knowledge", "icon": "💻"},
        {"id": str(uuid.uuid4()), "name": "Science", "description": "Explore the world of science", "icon": "🔬"},
        {"id": str(uuid.uuid4()), "name": "History", "description": "Journey through time", "icon": "📚"},
        {"id": str(uuid.uuid4()), "name": "Geography", "description": "Discover the world", "icon": "🌍"},
    ]
    await db.categories.insert_many(categories)
    print("✅ Categories created")
    
    # Create quizzes
    quiz1_id = str(uuid.uuid4())
    quiz1 = {
        "id": quiz1_id,
        "title": "JavaScript Fundamentals",
        "description": "Test your basic JavaScript knowledge",
        "category": "Programming",
        "level_required": 1,
        "duration_minutes": 5,
        "questions_count": 4,
        "created_by": admin_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_published": True
    }
    await db.quizzes.insert_one(quiz1)
    
    quiz2_id = str(uuid.uuid4())
    quiz2 = {
        "id": quiz2_id,
        "title": "React Basics",
        "description": "Learn the fundamentals of React",
        "category": "Programming",
        "level_required": 2,
        "duration_minutes": 5,
        "questions_count": 3,
        "created_by": admin_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_published": True
    }
    await db.quizzes.insert_one(quiz2)
    
    quiz3_id = str(uuid.uuid4())
    quiz3 = {
        "id": quiz3_id,
        "title": "World Capitals",
        "description": "How well do you know world capitals?",
        "category": "Geography",
        "level_required": 1,
        "duration_minutes": 3,
        "questions_count": 3,
        "created_by": admin_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_published": True
    }
    await db.quizzes.insert_one(quiz3)
    print("✅ Quizzes created")
    
    # Create questions for JavaScript quiz
    questions1 = [
        {
            "id": str(uuid.uuid4()),
            "quiz_id": quiz1_id,
            "text": "What is the correct syntax for referring to an external script called 'app.js'?",
            "type": "text",
            "media_url": None,
            "options": [
                "<script href='app.js'>",
                "<script name='app.js'>",
                "<script src='app.js'>",
                "<script file='app.js'>"
            ],
            "correct_answer": 2,
            "points": 10
        },
        {
            "id": str(uuid.uuid4()),
            "quiz_id": quiz1_id,
            "text": "Which company developed JavaScript?",
            "type": "text",
            "media_url": None,
            "options": [
                "Microsoft",
                "Netscape",
                "Google",
                "Apple"
            ],
            "correct_answer": 1,
            "points": 10
        },
        {
            "id": str(uuid.uuid4()),
            "quiz_id": quiz1_id,
            "text": "How do you write 'Hello World' in an alert box?",
            "type": "text",
            "media_url": None,
            "options": [
                "msg('Hello World');",
                "alert('Hello World');",
                "msgBox('Hello World');",
                "alertBox('Hello World');"
            ],
            "correct_answer": 1,
            "points": 10
        },
        {
            "id": str(uuid.uuid4()),
            "quiz_id": quiz1_id,
            "text": "How do you create a function in JavaScript?",
            "type": "text",
            "media_url": None,
            "options": [
                "function = myFunction()",
                "function:myFunction()",
                "function myFunction()",
                "create myFunction()"
            ],
            "correct_answer": 2,
            "points": 10
        }
    ]
    await db.questions.insert_many(questions1)
    
    # Create questions for React quiz
    questions2 = [
        {
            "id": str(uuid.uuid4()),
            "quiz_id": quiz2_id,
            "text": "What is React?",
            "type": "text",
            "media_url": None,
            "options": [
                "A JavaScript library for building user interfaces",
                "A database management system",
                "A CSS framework",
                "A backend framework"
            ],
            "correct_answer": 0,
            "points": 10
        },
        {
            "id": str(uuid.uuid4()),
            "quiz_id": quiz2_id,
            "text": "What are React components?",
            "type": "text",
            "media_url": None,
            "options": [
                "Reusable pieces of UI",
                "Database tables",
                "CSS classes",
                "API endpoints"
            ],
            "correct_answer": 0,
            "points": 10
        },
        {
            "id": str(uuid.uuid4()),
            "quiz_id": quiz2_id,
            "text": "What is JSX?",
            "type": "text",
            "media_url": None,
            "options": [
                "A database query language",
                "A syntax extension for JavaScript",
                "A CSS preprocessor",
                "A backend framework"
            ],
            "correct_answer": 1,
            "points": 10
        }
    ]
    await db.questions.insert_many(questions2)
    
    # Create questions for Geography quiz
    questions3 = [
        {
            "id": str(uuid.uuid4()),
            "quiz_id": quiz3_id,
            "text": "What is the capital of France?",
            "type": "text",
            "media_url": None,
            "options": [
                "London",
                "Berlin",
                "Paris",
                "Madrid"
            ],
            "correct_answer": 2,
            "points": 10
        },
        {
            "id": str(uuid.uuid4()),
            "quiz_id": quiz3_id,
            "text": "What is the capital of Japan?",
            "type": "text",
            "media_url": None,
            "options": [
                "Seoul",
                "Beijing",
                "Tokyo",
                "Bangkok"
            ],
            "correct_answer": 2,
            "points": 10
        },
        {
            "id": str(uuid.uuid4()),
            "quiz_id": quiz3_id,
            "text": "What is the capital of Australia?",
            "type": "text",
            "media_url": None,
            "options": [
                "Sydney",
                "Melbourne",
                "Canberra",
                "Brisbane"
            ],
            "correct_answer": 2,
            "points": 10
        }
    ]
    await db.questions.insert_many(questions3)
    print("✅ Questions created")
    
    print("\n🎉 Database seeded successfully!")
    print("\n📝 Test Accounts:")
    print("   Admin: admin@quiz.com / admin123")
    print("   User:  demo@quiz.com / demo123")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_database())
