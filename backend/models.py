"""
Pydantic models shared across the Monster Huddle API.

This module purposefully has no runtime dependency on `core` so it can be
imported anywhere without triggering circular imports.
"""
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class LatestMarks(BaseModel):
    bm: int = Field(ge=0, le=100, default=0)
    sejarah: int = Field(ge=0, le=100, default=0)
    science: int = Field(ge=0, le=100, default=0)


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=100)
    email: EmailStr
    password: str = Field(min_length=6, max_length=100)
    full_name: str = Field(min_length=2, max_length=100)
    school_id: Optional[str] = None
    school_name: str = Field(min_length=2, max_length=200)
    town: str = Field(min_length=2, max_length=100)
    current_grade: int = Field(ge=1, le=6)
    date_of_birth: str  # YYYY-MM-DD
    latest_marks: LatestMarks
    language: str = "en"


class UserLogin(BaseModel):
    username: str  # accepts either username OR email
    password: str
    remember_me: bool = False


class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    username: str
    email: Optional[str] = None
    full_name: str
    school_id: Optional[str] = None
    school_name: str
    town: str
    current_grade: int
    date_of_birth: str
    latest_marks: Dict[str, int] = {}
    role: str = "user"
    language: str = "en"
    profile_picture: Optional[str] = None  # base64 data URL
    total_points: int = 0
    current_level: int = 1
    stages_completed: List[str] = []
    total_time_spent: int = 0
    quizzes_completed: int = 0
    # Apprentice / Master / Legend progression
    apprentice_completed: int = 0
    master_completed: int = 0
    legend_completed: int = 0
    total_questions_answered: int = 0
    total_correct_answers: int = 0
    level_up_date: Optional[str] = None
    coins: int = 0
    xp: int = 0
    badges: List[str] = []
    last_login_at: Optional[str] = None
    previous_login_at: Optional[str] = None
    created_at: str
    # Legacy / optional bag for older docs (e.g. `subject_progress`)
    subject_progress: Dict[str, Any] = {}


class ProfilePictureUpdate(BaseModel):
    profile_picture: Optional[str] = None  # base64 data URL or null to clear


class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    school_name: Optional[str] = None
    town: Optional[str] = None
    current_grade: Optional[int] = None
    date_of_birth: Optional[str] = None
    latest_marks: Optional[LatestMarks] = None
    language: Optional[str] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


class LanguageUpdate(BaseModel):
    language: str


class QuizSubmission(BaseModel):
    answers: Dict[str, int]
    time_spent: int


class QuestionCreate(BaseModel):
    subject_id: str
    level_num: int
    stage_num: int
    text_en: str
    text_zh: str
    options_en: List[str]
    options_zh: List[str]
    correct_answer: int
    points: int = 10
    difficulty: str = "apprentice"  # apprentice | master | legend
    sequence_number: int = 0
    story_board_en: Optional[str] = None
    story_board_zh: Optional[str] = None
    image: Optional[str] = None  # data:image/... base64
    audio: Optional[str] = None  # data:audio/... base64


class QuestionSequenceUpdate(BaseModel):
    sequence_number: int


class NoticeCreate(BaseModel):
    title_en: str
    title_zh: str
    content_en: str
    content_zh: str
    type: str = "announcement"


class SchoolCreate(BaseModel):
    school_name: str = Field(min_length=2, max_length=200)
    address: str = Field(min_length=2, max_length=500)
    education_level: str = Field(min_length=2, max_length=100)
    school_logo: Optional[str] = None
