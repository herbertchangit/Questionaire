# EduQuiz - Product Requirements Document

## Original Problem Statement
Build a web/mobile responsive Questionnaire Quiz App for secondary school students.

### Core Objectives:
- Improve student performance in BM, Sejarah (History), and Science
- Provide gamified learning with levels, stages
- Support both solo and LIVE competition modes

### Target Audience:
Secondary school students in Malaysia

## Product Requirements (User Choices)

### Language Support:
- Bilingual: Chinese (中文) and English
- User can switch language anytime via toggle

### Subject Categories (for questions only):
- **Bahasa Malaysia (BM)** - 马来语
- **History (Sejarah)** - 历史
- **Science** - 科学

Note: Subjects are NOT tied to levels. Questions from all subjects are mixed in each stage.

### Level System (5 themed levels - independent of subjects):
1. **Level 1: Determination** (决心) - Unlocked at 0 points
2. **Level 2: Discipline** (自律) - Unlock at 100 points
3. **Level 3: Perseverance** (毅力) - Unlock at 300 points
4. **Level 4: Hard-working** (勤劳) - Unlock at 600 points
5. **Level 5: Breakthrough** (突破) - Unlock at 1000 points

### Stage Structure:
- 5 stages per level = 25 total stages
- Each stage has mixed questions from all subjects
- Progressive point rewards per stage
- 2-minute time limit per stage

### Admin Features:
- Manual question entry
- Bulk CSV upload
- User management
- Notice board management
- Analytics reports

## Navigation Flow
```
Login → Dashboard (shows Levels directly)
         ├→ Select Level → Stages → Play → Results
         ├→ Leaderboard
         ├→ Quiz History
         ├→ Settings
         ├→ Notices
         └→ Admin Panel (if admin)
```

## Implemented Features

### Phase 1 (Core) - ✅ COMPLETE

#### Authentication & Profile
- [x] User registration with language preference
- [x] JWT-based login
- [x] Role-based access (user/admin)
- [x] Language toggle (EN/中文)
- [x] Password change

#### Quiz System
- [x] 5 levels with themed names (independent of subjects)
- [x] 5 stages per level with sequential unlocking
- [x] Mixed subject questions per stage
- [x] Quiz gameplay with timer
- [x] Score calculation and point rewards
- [x] Results page with confetti

#### Progress Tracking
- [x] Stages completed counter
- [x] Total points system
- [x] Level progression based on points
- [x] Quiz history
- [x] Time spent tracking

#### Gamification
- [x] Level unlocking based on points
- [x] Stage unlocking (sequential)
- [x] Global leaderboard
- [x] Progress bars

#### Admin Panel
- [x] Dashboard with quick stats
- [x] Manage Questions (add, edit, delete)
- [x] Bulk upload via CSV
- [x] Manage Users
- [x] Manage Notices
- [x] Reports

## Database Schema

### Collections:
```
- users: { id, name, email, password, role, language, total_points, current_level, stages_completed[], total_time_spent, quizzes_completed }
- subjects: { id, code, name_en, name_zh, icon, color }  -- Just categories
- levels: { id, level_num, name_en, name_zh, icon, color, unlock_points, stages_count }
- stages: { id, level_id, level_num, stage_num, name_en, name_zh, questions_count, time_limit, points_reward }
- edu_questions: { id, subject_id, level_num, stage_num, text_en, text_zh, options_en, options_zh, correct_answer, points }
- quiz_history: { id, user_id, level_num, stage_num, stage_id, score, total, points_earned, time_spent, completed_at }
- activity_logs, notices, welcome_messages
```

## Test Credentials
- **User:** demo / demo123
- **Admin:** admin / admin123

## Phase 3 - LIVE Competition Mode ✅ COMPLETE (2026-05-05)

### Implemented:
- [x] **Host Room Mode**: Host creates room with 6-char code, players join via code (Kahoot-style)
- [x] **Quick Matchmaking**: Auto-pair 2-4 random users by selected level
- [x] **Scheduled Tournaments**: Admin creates tournament events; users join when active (within 2-min start window)
- [x] **WebSocket-based real-time gameplay** (`/api/live/ws/{code}?token=`)
- [x] **Per-question timer** (5-60s, default 15s) + **Total match timer** (30s-30min)
- [x] **Speed-bonus scoring**: 1st correct=2x, 2nd=1.8x, ... min 1x base points (10)
- [x] **Live leaderboard** updated after each question
- [x] **Final results screen** with rank/medals + confetti for top-3
- [x] **Up to 20 players per match** (host configurable)
- [x] **Admin Tournament management page** (`/admin/tournaments`)
- [x] **Live match history** saved per player (`/api/live/history`)
- [x] **Bilingual** (EN/ZH) throughout all live screens

### New API Endpoints:
- `POST /api/live/rooms/create` — Host creates room
- `GET  /api/live/rooms/{code}` — Get room details
- `POST /api/live/matchmaking?level_num=N` — Queue / get match
- `POST /api/live/matchmaking/cancel?level_num=N` — Cancel queue
- `GET  /api/live/tournaments` — List upcoming tournaments
- `POST /api/live/tournaments/{id}/start` — Activate tournament
- `POST /api/live/admin/tournaments` — Admin create tournament
- `DELETE /api/live/admin/tournaments/{id}` — Admin delete
- `GET  /api/live/history` — User's past LIVE matches
- `WS   /api/live/ws/{code}?token=JWT` — Real-time gameplay channel

### New Collections:
- `live_rooms` — { id, code, host_id, level_num, time_per_question, total_time_limit, max_players, mode, status, created_at }
- `tournaments` — { id, title_en, title_zh, level_num, scheduled_at, time_per_question, total_time_limit, max_players, status, room_code }
- `live_match_history` — { id, user_id, room_code, mode, level_num, score, correct_count, rank, completed_at }

### History Page Expansion ✅ (2026-05-05)
- `/api/progress/history` now returns `subject_breakdown` per quiz: `{ subj_bm: {correct, total}, subj_history: {...}, subj_science: {...} }`
- Frontend `/history` displays color-coded subject badges (BM/History/Science) showing per-subject correct/total ratio.

## Upcoming / Backlog
- [ ] **P2: Refactor `server.py`** (~1000 lines) into modular routes (`/routes/auth.py`, `/quiz.py`, `/admin.py`)
- [ ] **P2: Resend email integration** (currently mocked — needs valid `RESEND_API_KEY`)
- [ ] **P3**: Achievement badges, sound effects, more sample questions
- [ ] **P3**: Per-replica scaling for LIVE rooms (currently in-process; use Redis pub/sub for horizontal scaling)

## Changelog
- **2026-02-24**: Restructured — Removed subject-level coupling. Levels are now independent game progression with mixed subject questions per stage.
- **2026-05-05**: **LIVE Competition Mode** shipped (host rooms / matchmaking / tournaments + WebSocket gameplay + speed-bonus scoring). History page expanded with subject breakdown.
