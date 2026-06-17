"""
Monster Huddle API — application entry point.

server.py is intentionally slim: it only wires the FastAPI app, CORS,
the LIVE Competition module, and the modular `/api` router defined in
`routes/__init__.py`. All endpoint logic lives in its own module.
"""
import os

from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from core import client, db, logger
from live_competition import init_live_module, live_router
from routes import get_api_router

app = FastAPI(title="Monster Huddle API", version="2.0")

# Modular /api router (auth, users, catalog, quiz, community, admin)
app.include_router(get_api_router())

# LIVE Competition (WebSockets + tournaments) — has its own /api/live prefix
init_live_module(db)
app.include_router(live_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    logger.info("Closing MongoDB connection")
    client.close()
