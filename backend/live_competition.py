"""
LIVE Competition Module - Real-time multiplayer quiz battles
- Host-created rooms (join via code)
- Quick matchmaking
- Scheduled tournaments
- WebSocket-based real-time gameplay with per-question + total timers
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone, timedelta
import uuid
import asyncio
import random
import string
import jwt
import os
import logging

logger = logging.getLogger(__name__)

# ==================== ROUTER ====================
live_router = APIRouter(prefix="/api/live")

# Will be set from server.py during init
_db = None
_security = HTTPBearer()
JWT_SECRET = os.environ.get('JWT_SECRET', 'default_secret')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')


def init_live_module(db):
    global _db
    _db = db


# ==================== AUTH HELPER ====================
async def get_user_from_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if not user_id:
            return None
        user = await _db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        return user
    except Exception:
        return None


async def get_current_user_dep(credentials: HTTPAuthorizationCredentials = Depends(_security)):
    user = await get_user_from_token(credentials.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user


# ==================== MODELS ====================
class CreateRoomRequest(BaseModel):
    level_num: int = Field(ge=1, le=5)
    time_per_question: int = Field(ge=5, le=60, default=15)
    total_time_limit: int = Field(ge=30, le=1800, default=300)  # seconds, total round
    max_players: int = Field(ge=2, le=20, default=10)
    mode: str = Field(default="host")  # host | matchmaking | tournament


class JoinRoomRequest(BaseModel):
    code: str


class CreateTournamentRequest(BaseModel):
    title_en: str
    title_zh: str
    level_num: int = Field(ge=1, le=5)
    scheduled_at: str  # ISO datetime
    time_per_question: int = Field(ge=5, le=60, default=15)
    total_time_limit: int = Field(ge=60, le=1800, default=600)
    max_players: int = Field(ge=2, le=50, default=20)


# ==================== CONNECTION MANAGER ====================
class RoomState:
    """In-memory state for an active room (game logic)."""

    def __init__(self, code: str, room_doc: dict):
        self.code = code
        self.room_doc = room_doc
        self.connections: Dict[str, WebSocket] = {}  # user_id -> ws
        self.players: Dict[str, dict] = {}  # user_id -> { username, full_name, score, answers, joined_at }
        self.questions: List[dict] = []
        self.current_q_index: int = -1
        self.q_started_at: Optional[datetime] = None
        self.game_started_at: Optional[datetime] = None
        self.status: str = "lobby"  # lobby | in_progress | ended
        self.host_id: str = room_doc["host_id"]
        self.task: Optional[asyncio.Task] = None
        self.answers_for_q: Dict[str, dict] = {}  # user_id -> {answer, time_ms}
        self.lock = asyncio.Lock()

    async def broadcast(self, message: dict):
        dead = []
        for uid, ws in self.connections.items():
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(uid)
        for uid in dead:
            self.connections.pop(uid, None)

    def lobby_snapshot(self):
        return {
            "type": "lobby_update",
            "code": self.code,
            "host_id": self.host_id,
            "status": self.status,
            "players": [
                {
                    "user_id": uid,
                    "username": p["username"],
                    "full_name": p["full_name"],
                    "score": p.get("score", 0),
                    "is_host": uid == self.host_id,
                }
                for uid, p in self.players.items()
            ],
            "level_num": self.room_doc.get("level_num"),
            "time_per_question": self.room_doc.get("time_per_question"),
            "total_time_limit": self.room_doc.get("total_time_limit"),
            "max_players": self.room_doc.get("max_players"),
            "mode": self.room_doc.get("mode"),
        }

    def leaderboard(self):
        return sorted(
            [
                {
                    "user_id": uid,
                    "username": p["username"],
                    "full_name": p["full_name"],
                    "score": p.get("score", 0),
                    "correct_count": p.get("correct_count", 0),
                }
                for uid, p in self.players.items()
            ],
            key=lambda x: x["score"],
            reverse=True,
        )


# Global registry of active rooms
ROOMS: Dict[str, RoomState] = {}
MATCHMAKING_QUEUE: Dict[int, List[str]] = {}  # level_num -> [user_ids waiting]
MATCHMAKING_LOCK = asyncio.Lock()


def gen_code(length: int = 6) -> str:
    chars = string.ascii_uppercase + string.digits
    return "".join(random.choices(chars, k=length))


# ==================== ROOM REST ENDPOINTS ====================
@live_router.post("/rooms/create")
async def create_room(req: CreateRoomRequest, current_user: dict = Depends(get_current_user_dep)):
    # generate unique code
    for _ in range(10):
        code = gen_code()
        if code not in ROOMS:
            break
    else:
        raise HTTPException(status_code=500, detail="Could not generate room code")

    # Pre-fetch questions for the chosen level (mix all 5 stages)
    questions = await _db.edu_questions.find(
        {"level_num": req.level_num},
        {"_id": 0}
    ).to_list(200)

    if len(questions) < 3:
        raise HTTPException(status_code=400, detail="Not enough questions for this level")

    # Shuffle and limit to up to 15
    random.shuffle(questions)
    questions = questions[:15]

    room_doc = {
        "id": str(uuid.uuid4()),
        "code": code,
        "host_id": current_user["id"],
        "host_username": current_user["username"],
        "level_num": req.level_num,
        "time_per_question": req.time_per_question,
        "total_time_limit": req.total_time_limit,
        "max_players": req.max_players,
        "mode": req.mode,
        "status": "lobby",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await _db.live_rooms.insert_one(room_doc)
    # strip _id for safety
    room_doc.pop("_id", None)

    state = RoomState(code, room_doc)
    state.questions = questions
    ROOMS[code] = state

    return {"code": code, "room": room_doc}


@live_router.get("/rooms/{code}")
async def get_room(code: str, current_user: dict = Depends(get_current_user_dep)):
    code = code.upper()
    state = ROOMS.get(code)
    if not state:
        # Not active in memory - check db
        room = await _db.live_rooms.find_one({"code": code}, {"_id": 0})
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")
        return {"room": room, "active": False}
    return {"room": state.room_doc, "active": True, "lobby": state.lobby_snapshot()}


@live_router.post("/matchmaking")
async def matchmaking(level_num: int = Query(..., ge=1, le=5), current_user: dict = Depends(get_current_user_dep)):
    """Add user to matchmaking queue. If 2+ users waiting, create a room and return its code."""
    user_id = current_user["id"]
    async with MATCHMAKING_LOCK:
        queue = MATCHMAKING_QUEUE.setdefault(level_num, [])
        # Remove duplicates
        if user_id in queue:
            queue.remove(user_id)
        queue.append(user_id)

        # If 2+ users, pop up to 4 and create a room
        if len(queue) >= 2:
            participants = []
            while queue and len(participants) < 4:
                uid = queue.pop(0)
                u = await _db.users.find_one({"id": uid}, {"_id": 0, "password": 0})
                if u:
                    participants.append(u)

            if len(participants) < 2:
                queue.extend([p["id"] for p in participants])
                return {"status": "waiting", "queue_size": len(queue)}

            # Create room with first user as host
            host = participants[0]
            for _ in range(10):
                code = gen_code()
                if code not in ROOMS:
                    break

            questions = await _db.edu_questions.find(
                {"level_num": level_num},
                {"_id": 0}
            ).to_list(200)
            if len(questions) < 3:
                return {"status": "error", "detail": "Not enough questions"}
            random.shuffle(questions)
            questions = questions[:10]

            room_doc = {
                "id": str(uuid.uuid4()),
                "code": code,
                "host_id": host["id"],
                "host_username": host["username"],
                "level_num": level_num,
                "time_per_question": 15,
                "total_time_limit": 300,
                "max_players": 4,
                "mode": "matchmaking",
                "status": "lobby",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "matched_users": [p["id"] for p in participants],
            }
            await _db.live_rooms.insert_one(room_doc)
            room_doc.pop("_id", None)

            state = RoomState(code, room_doc)
            state.questions = questions
            ROOMS[code] = state

            # If current user not in participants (shouldn't happen) re-queue
            if user_id not in [p["id"] for p in participants]:
                queue.append(user_id)
                return {"status": "waiting", "queue_size": len(queue)}

            return {
                "status": "matched",
                "code": code,
                "matched_with": [{"user_id": p["id"], "username": p["username"]} for p in participants if p["id"] != user_id],
            }

        return {"status": "waiting", "queue_size": len(queue)}


@live_router.post("/matchmaking/cancel")
async def matchmaking_cancel(level_num: int = Query(..., ge=1, le=5), current_user: dict = Depends(get_current_user_dep)):
    user_id = current_user["id"]
    async with MATCHMAKING_LOCK:
        queue = MATCHMAKING_QUEUE.get(level_num, [])
        if user_id in queue:
            queue.remove(user_id)
    return {"status": "cancelled"}


# ==================== TOURNAMENT ENDPOINTS ====================
@live_router.get("/tournaments")
async def list_tournaments(current_user: dict = Depends(get_current_user_dep)):
    # Show upcoming + recently active (within last 1h)
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    tournaments = await _db.tournaments.find(
        {"scheduled_at": {"$gte": cutoff}},
        {"_id": 0}
    ).sort("scheduled_at", 1).limit(50).to_list(50)
    return tournaments


@live_router.post("/tournaments/{tournament_id}/start")
async def start_tournament(tournament_id: str, current_user: dict = Depends(get_current_user_dep)):
    """Activate a tournament: create a live room from the tournament config (only allowed at/after scheduled time)."""
    t = await _db.tournaments.find_one({"id": tournament_id}, {"_id": 0})
    if not t:
        raise HTTPException(status_code=404, detail="Tournament not found")

    # If a room already exists for this tournament, return it
    if t.get("room_code") and t["room_code"] in ROOMS:
        return {"code": t["room_code"]}

    scheduled = datetime.fromisoformat(t["scheduled_at"].replace("Z", "+00:00"))
    if datetime.now(timezone.utc) < scheduled - timedelta(minutes=2):
        raise HTTPException(status_code=400, detail="Tournament has not started yet")

    # Create room
    for _ in range(10):
        code = gen_code()
        if code not in ROOMS:
            break

    questions = await _db.edu_questions.find(
        {"level_num": t["level_num"]},
        {"_id": 0}
    ).to_list(200)
    if len(questions) < 3:
        raise HTTPException(status_code=400, detail="Not enough questions")
    random.shuffle(questions)
    questions = questions[:15]

    room_doc = {
        "id": str(uuid.uuid4()),
        "code": code,
        "host_id": current_user["id"],
        "host_username": current_user["username"],
        "level_num": t["level_num"],
        "time_per_question": t.get("time_per_question", 15),
        "total_time_limit": t.get("total_time_limit", 600),
        "max_players": t.get("max_players", 20),
        "mode": "tournament",
        "tournament_id": tournament_id,
        "status": "lobby",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await _db.live_rooms.insert_one(room_doc)
    room_doc.pop("_id", None)
    state = RoomState(code, room_doc)
    state.questions = questions
    ROOMS[code] = state

    await _db.tournaments.update_one(
        {"id": tournament_id},
        {"$set": {"room_code": code, "status": "active"}}
    )
    return {"code": code}


# ==================== ADMIN: TOURNAMENTS ====================
@live_router.post("/admin/tournaments")
async def admin_create_tournament(req: CreateTournamentRequest, current_user: dict = Depends(get_current_user_dep)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    doc = {
        "id": str(uuid.uuid4()),
        "title_en": req.title_en,
        "title_zh": req.title_zh,
        "level_num": req.level_num,
        "scheduled_at": req.scheduled_at,
        "time_per_question": req.time_per_question,
        "total_time_limit": req.total_time_limit,
        "max_players": req.max_players,
        "status": "scheduled",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["id"],
    }
    await _db.tournaments.insert_one(doc)
    doc.pop("_id", None)
    return doc


@live_router.delete("/admin/tournaments/{tournament_id}")
async def admin_delete_tournament(tournament_id: str, current_user: dict = Depends(get_current_user_dep)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    result = await _db.tournaments.delete_one({"id": tournament_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tournament not found")
    return {"message": "Deleted"}


# ==================== GAME LOOP ====================
async def run_question(state: RoomState, q_index: int):
    """Send question, wait for timer, send results, advance."""
    state.current_q_index = q_index
    state.q_started_at = datetime.now(timezone.utc)
    state.answers_for_q = {}
    q = state.questions[q_index]
    time_per_q = state.room_doc["time_per_question"]

    # Send question without correct_answer
    payload = {
        "type": "question",
        "index": q_index,
        "total": len(state.questions),
        "question": {
            "id": q["id"],
            "text_en": q["text_en"],
            "text_zh": q["text_zh"],
            "options_en": q["options_en"],
            "options_zh": q["options_zh"],
            "subject_id": q.get("subject_id"),
            "points": q.get("points", 10),
        },
        "time_per_question": time_per_q,
        "started_at": state.q_started_at.isoformat(),
    }
    await state.broadcast(payload)

    # Wait time_per_q seconds OR until everyone answered
    end = datetime.now(timezone.utc) + timedelta(seconds=time_per_q)
    while datetime.now(timezone.utc) < end:
        await asyncio.sleep(0.5)
        # all online players answered?
        online_ids = list(state.connections.keys())
        if online_ids and all(uid in state.answers_for_q for uid in online_ids):
            break

    # Compute scores - fastest correct gets up to 2x base points
    base_points = q.get("points", 10)
    correct = q["correct_answer"]

    # Sort answers by time
    sorted_answers = sorted(
        state.answers_for_q.items(), key=lambda kv: kv[1]["time_ms"]
    )
    correct_rank = 0
    for uid, ans in sorted_answers:
        if ans["answer"] == correct:
            correct_rank += 1
            # Speed bonus: faster = more points (1st=2x, decreasing to 1x)
            multiplier = max(1.0, 2.0 - (correct_rank - 1) * 0.2)
            earned = int(base_points * multiplier)
            p = state.players.get(uid)
            if p:
                p["score"] = p.get("score", 0) + earned
                p["correct_count"] = p.get("correct_count", 0) + 1
                p.setdefault("answers_log", []).append({
                    "q_id": q["id"],
                    "answer": ans["answer"],
                    "is_correct": True,
                    "earned": earned,
                    "time_ms": ans["time_ms"],
                })
        else:
            p = state.players.get(uid)
            if p:
                p.setdefault("answers_log", []).append({
                    "q_id": q["id"],
                    "answer": ans["answer"],
                    "is_correct": False,
                    "earned": 0,
                    "time_ms": ans["time_ms"],
                })

    # Reveal result + leaderboard
    await state.broadcast({
        "type": "question_result",
        "index": q_index,
        "correct_answer": correct,
        "leaderboard": state.leaderboard(),
        "answers_summary": {
            uid: {"answer": v["answer"], "is_correct": v["answer"] == correct}
            for uid, v in state.answers_for_q.items()
        },
    })


async def game_loop(state: RoomState):
    state.status = "in_progress"
    state.game_started_at = datetime.now(timezone.utc)
    await state.broadcast({"type": "game_started", "total_questions": len(state.questions)})

    total_end = state.game_started_at + timedelta(seconds=state.room_doc["total_time_limit"])

    for i in range(len(state.questions)):
        if datetime.now(timezone.utc) >= total_end:
            break
        if not state.connections:  # everyone left
            break
        await run_question(state, i)
        await asyncio.sleep(2)  # short break between questions

    # End game
    state.status = "ended"
    final_leaderboard = state.leaderboard()
    await state.broadcast({
        "type": "game_ended",
        "leaderboard": final_leaderboard,
        "total_questions_played": state.current_q_index + 1,
    })

    # Save match history per player
    for uid, p in state.players.items():
        try:
            await _db.live_match_history.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": uid,
                "room_code": state.code,
                "mode": state.room_doc.get("mode"),
                "level_num": state.room_doc.get("level_num"),
                "score": p.get("score", 0),
                "correct_count": p.get("correct_count", 0),
                "total_questions": state.current_q_index + 1,
                "rank": next((i + 1 for i, lb in enumerate(final_leaderboard) if lb["user_id"] == uid), 0),
                "completed_at": datetime.now(timezone.utc).isoformat(),
            })
        except Exception as e:
            logger.error(f"Failed saving live match history: {e}")

    # Update room doc
    await _db.live_rooms.update_one(
        {"code": state.code},
        {"$set": {"status": "ended", "ended_at": datetime.now(timezone.utc).isoformat()}}
    )


# ==================== WEBSOCKET ====================
@live_router.websocket("/ws/{code}")
async def live_ws(websocket: WebSocket, code: str, token: str = Query(...)):
    code = code.upper()
    user = await get_user_from_token(token)
    if not user:
        await websocket.close(code=4401, reason="Invalid token")
        return

    state = ROOMS.get(code)
    if not state:
        # try load from db (might not be active anymore)
        room = await _db.live_rooms.find_one({"code": code}, {"_id": 0})
        if not room:
            await websocket.close(code=4404, reason="Room not found")
            return
        if room.get("status") == "ended":
            await websocket.close(code=4410, reason="Room ended")
            return
        # Re-create state (rare path)
        state = RoomState(code, room)
        questions = await _db.edu_questions.find(
            {"level_num": room["level_num"]}, {"_id": 0}
        ).to_list(200)
        random.shuffle(questions)
        state.questions = questions[:10]
        ROOMS[code] = state

    if state.status == "ended":
        await websocket.close(code=4410, reason="Room ended")
        return

    if len(state.players) >= state.room_doc.get("max_players", 10) and user["id"] not in state.players:
        await websocket.close(code=4403, reason="Room full")
        return

    await websocket.accept()

    user_id = user["id"]
    state.connections[user_id] = websocket
    if user_id not in state.players:
        state.players[user_id] = {
            "username": user["username"],
            "full_name": user.get("full_name", user["username"]),
            "score": 0,
            "correct_count": 0,
            "joined_at": datetime.now(timezone.utc).isoformat(),
        }

    # Send join confirmation
    await websocket.send_json({
        "type": "joined",
        "user_id": user_id,
        "is_host": user_id == state.host_id,
    })
    await state.broadcast(state.lobby_snapshot())

    try:
        while True:
            msg = await websocket.receive_json()
            mtype = msg.get("type")

            if mtype == "start" and user_id == state.host_id and state.status == "lobby":
                if state.task is None or state.task.done():
                    state.task = asyncio.create_task(game_loop(state))

            elif mtype == "answer" and state.status == "in_progress":
                # Validate question index
                if msg.get("q_index") != state.current_q_index:
                    continue
                if user_id in state.answers_for_q:
                    continue  # already answered
                ans = msg.get("answer")
                if not isinstance(ans, int):
                    continue
                elapsed_ms = int(
                    (datetime.now(timezone.utc) - state.q_started_at).total_seconds() * 1000
                ) if state.q_started_at else 0
                state.answers_for_q[user_id] = {"answer": ans, "time_ms": elapsed_ms}
                # Acknowledge to sender
                await websocket.send_json({"type": "answer_ack", "q_index": state.current_q_index})

            elif mtype == "leave":
                break

            elif mtype == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"WS error: {e}")
    finally:
        state.connections.pop(user_id, None)
        # Keep player in players dict so score persists if they rejoin
        if state.status == "lobby":
            # Remove from lobby if they leave before game starts
            state.players.pop(user_id, None)
        try:
            await state.broadcast(state.lobby_snapshot())
        except Exception:
            pass
        # Clean up empty rooms in lobby
        if state.status == "lobby" and not state.connections:
            # Schedule cleanup after 60s
            async def _cleanup(code_):
                await asyncio.sleep(60)
                s = ROOMS.get(code_)
                if s and s.status == "lobby" and not s.connections:
                    ROOMS.pop(code_, None)
            asyncio.create_task(_cleanup(code))


# ==================== USER LIVE HISTORY ====================
@live_router.get("/history")
async def live_history(limit: int = 20, current_user: dict = Depends(get_current_user_dep)):
    history = await _db.live_match_history.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("completed_at", -1).limit(limit).to_list(limit)
    return history
