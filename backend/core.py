"""
Shared core: database client, JWT, password hashing, and dependency helpers
for the Monster Huddle backend.

All route modules import their `db`, security, and current-user dependencies
from this module so that there is exactly one MongoDB connection per process.
"""
from datetime import datetime, timezone, timedelta
from pathlib import Path
import logging
import os
import uuid

from dotenv import load_dotenv
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import jwt

# --- Environment ---
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# --- MongoDB ---
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# --- Security primitives ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

JWT_SECRET = os.environ.get("JWT_SECRET", "default_secret")
JWT_ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")

# --- Logging ---
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("monster_huddle")


def create_token(user_id: str, username: str, role: str, remember_me: bool = False) -> str:
    """Issue a JWT. 30 days when remember_me=True, otherwise 24h."""
    hours = 720 if remember_me else 24
    exp = datetime.now(timezone.utc) + timedelta(hours=hours)
    payload = {"user_id": user_id, "username": username, "role": role, "exp": exp}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


# Import inside function to avoid circular import of `User` at module load time.
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    from models import User  # local import — models also imports nothing from core

    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return User(**user)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_admin_user(current_user=Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


async def log_activity(user_id: str, action: str, metadata: dict | None = None):
    await db.activity_logs.insert_one(
        {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "action": action,
            "metadata": metadata or {},
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    )
