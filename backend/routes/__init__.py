"""Route registry for the Monster Huddle API.

`get_api_router()` builds a single APIRouter prefixed with `/api`
that includes every sub-router. `server.py` mounts that into the app.
"""
from fastapi import APIRouter

from routes import admin, auth, leaderboard, quiz, subjects, users


def get_api_router() -> APIRouter:
    api = APIRouter(prefix="/api")
    api.include_router(auth.router)
    api.include_router(users.router)
    api.include_router(subjects.router)
    api.include_router(quiz.router)
    api.include_router(leaderboard.router)
    api.include_router(admin.router)
    return api
