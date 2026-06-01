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
- **2026-05-31**: **Add/Edit Question form — optional fields**. `text_zh`, `option_c_en`, `option_d_en` and all `option_*_zh` made optional in the admin form. Only `text_en` + Options A & B (English) are required. Blank Chinese question/options auto-fallback to their English counterparts on save. Verified end-to-end via admin UI (Question created with only English A/B filled; persisted record shows `options_en=['4','5','','']` and `text_zh` falling back to `text_en`).
- **2026-06-01**: **Manage Questions — multi-select & duplicate**. Added per-row checkbox + "Select all" in the sort toolbar, and a contextual "Delete N selected" button that calls a new backend endpoint `POST /api/admin/questions/bulk-delete` (`{ids:[...]}` → `{deleted:N}`). Added a Duplicate button (Copy icon) on every row that clones the question with " (copy)"/" (副本)" suffix, `sequence_number+1`, preserving image/audio/story board. Verified end-to-end via admin UI.
- **2026-06-01**: **Bulk CSV upload — optional option_c_en / option_d_en**. `/api/admin/questions/bulk` now only requires `option_a_en` & `option_b_en`; C/D may be blank. Added validation that `correct_answer` must point to a filled English option (otherwise the row is skipped with a clear error). Chinese options still auto-fallback to their English slot (blank → blank). Verified via curl (3 rows with A/B only uploaded successfully; bad row with `correct_answer=2` and empty C correctly skipped).
- **2026-06-01**: **Bugfix — LIVE Competition Tournaments tab crash**. `tournaments.map(t => ...)` in `LiveLobby.js` shadowed the `t` translator from `useLanguage()`, so `t('level')` inside the map tried to invoke the tournament object as a function ("t is not a function" runtime error) whenever any tournament existed. Renamed the map param to `tour` (also defensively fixed the same shadowing in `AdminTournaments.js`). Verified end-to-end: seeded 1 tournament, logged in as `demo`, opened LIVE → Tournaments — both cards render cleanly with "Level N" labels and Join/Upcoming buttons. No pageerror in console.
- **2026-06-01**: **Enhancement — live countdown for LIVE tournaments**. Each tournament card in `/live` → Tournaments now shows a ticking "Starts in Xh Ym" badge (down to seconds when < 1 h). Badge turns orange and pulses red when < 2 min remain, and the "Join" button auto-enables in real time without needing a refresh. Interval is gated to only tick while the Tournaments tab is open. Verified with 3 tournaments at 90s / ~41m / ~2h horizons — countdowns ticked correctly each second; Join enabled for the imminent one.
