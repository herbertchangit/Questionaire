# EduQuiz - Product Requirements Document

## Original Problem Statement
Build a web/mobile responsive Questionnaire Quiz App for secondary school students.

### Core Objectives:
- Improve student performance in BM, Sejarah (History), and Science
- Provide gamified learning with levels, stages, medals, and leaderboard
- Support both solo and LIVE competition modes

### Target Audience:
Secondary school students in Malaysia

## Product Requirements (User Choices)

### Language Support:
- Bilingual: Chinese (中文) and English
- User can switch language anytime via toggle

### Subject Structure:
- **Bahasa Malaysia (BM)** - 马来语
- **History (Sejarah)** - 历史
- **Science** - 科学

### Level System (5 themed levels):
1. **Level 1: Determination** (决心) - Unlocked at 0 points
2. **Level 2: Discipline** (自律) - Unlock at 100 points
3. **Level 3: Perseverance** (毅力) - Unlock at 300 points
4. **Level 4: Hard-working** (勤劳) - Unlock at 600 points
5. **Level 5: Breakthrough** (突破) - Unlock at 1000 points

### Stage Structure:
- 5 stages per level per subject
- 75 total stages (3 subjects × 5 levels × 5 stages)
- Progressive point rewards per stage
- 2-minute time limit per stage

### Admin Features:
- Manual question entry
- Bulk CSV upload
- User management
- Notice board management
- Analytics reports

## Tech Stack
- **Backend:** FastAPI, Python, MongoDB
- **Frontend:** React, Tailwind CSS, Shadcn UI, Recharts
- **Authentication:** JWT with bcrypt password hashing
- **Charts:** Recharts, Canvas Confetti

## Implemented Features

### Phase 1 (Core) - ✅ COMPLETE

#### Authentication & Profile
- [x] User registration with language preference
- [x] JWT-based login
- [x] Role-based access (user/admin)
- [x] Language toggle (EN/中文)
- [x] Password change

#### Quiz System
- [x] 3 subjects with distinct colors/icons
- [x] 5 levels with themed names (bilingual)
- [x] 5 stages per level with progressive unlocking
- [x] Quiz gameplay with timer
- [x] Multiple choice questions (4 options)
- [x] Score calculation and point rewards
- [x] Results page with confetti celebration

#### Progress Tracking
- [x] Subject-wise progress tracking
- [x] Stages completed counter
- [x] Total points system
- [x] Level progression based on points
- [x] Quiz history with details
- [x] Time spent tracking

#### Gamification
- [x] Level unlocking based on points
- [x] Stage unlocking (sequential)
- [x] Global leaderboard
- [x] Progress bars and completion percentages

#### Admin Panel
- [x] Dashboard with quick stats
- [x] Manage Questions (add, edit, delete)
- [x] Bulk upload via CSV
- [x] Manage Users (view, delete)
- [x] Manage Notices
- [x] Reports with subject statistics

#### Notice Board
- [x] Admin can create announcements
- [x] Bilingual notices
- [x] Active/Upcoming types

#### Welcome Messages
- [x] Personalized based on user status
- [x] Bilingual support

## Database Schema

### Collections:
```
- users: User accounts with progress
- subjects: BM, History, Science
- levels: 5 themed levels
- stages: 75 stages (5 per level per subject)
- edu_questions: Quiz questions (bilingual)
- quiz_history: User quiz attempts
- activity_logs: User activity tracking
- notices: Announcements
- welcome_messages: Dynamic welcome messages
```

## API Endpoints

### Auth
- POST `/api/auth/register`
- POST `/api/auth/login`
- GET `/api/auth/me`

### User
- PUT `/api/user/language`
- POST `/api/user/change-password`

### Quiz
- GET `/api/subjects`
- GET `/api/levels`
- GET `/api/subjects/{id}/levels`
- GET `/api/subjects/{id}/levels/{num}/stages`
- GET `/api/stages/{id}/play`
- POST `/api/stages/{id}/submit`

### Progress
- GET `/api/progress/stats`
- GET `/api/progress/history`
- GET `/api/leaderboard`

### Admin
- GET/POST/PUT/DELETE `/api/admin/questions`
- POST `/api/admin/questions/bulk`
- GET/POST/DELETE `/api/admin/notices`
- GET/DELETE `/api/admin/users`
- GET `/api/admin/reports`

## Test Credentials
- **User:** demo@quiz.com / demo123
- **Admin:** admin@quiz.com / admin123

## Upcoming Features (Phase 2 & 3)

### Phase 2 - Enhancements
- [ ] More sample questions per stage
- [ ] Question difficulty levels
- [ ] Achievement badges
- [ ] User profile avatars
- [ ] Sound effects

### Phase 3 - LIVE Competition
- [ ] WebSocket real-time gameplay
- [ ] Create/join LIVE rooms
- [ ] Real-time multiplayer quiz battles
- [ ] Time-based challenges
- [ ] LIVE leaderboard

## File Structure
```
/app/
├── backend/
│   ├── server.py (Main API)
│   ├── seed_eduquiz.py (Database seeder)
│   ├── requirements.txt
│   └── .env
└── frontend/
    ├── src/
    │   ├── App.js
    │   ├── context/
    │   │   └── LanguageContext.js (Bilingual support)
    │   ├── pages/
    │   │   ├── Login.js
    │   │   ├── Register.js
    │   │   ├── Dashboard.js
    │   │   ├── SubjectPage.js
    │   │   ├── LevelPage.js
    │   │   ├── PlayPage.js
    │   │   ├── ResultsPage.js
    │   │   ├── Leaderboard.js
    │   │   ├── History.js
    │   │   ├── Settings.js
    │   │   ├── Notices.js
    │   │   └── admin/
    │   │       ├── AdminDashboard.js
    │   │       ├── ManageQuestions.js
    │   │       ├── ManageNotices.js
    │   │       ├── AdminUsers.js
    │   │       └── AdminReports.js
    │   └── components/ui/
    ├── package.json
    └── .env
```

## Changelog
- **2026-02-24**: Initial upgrade from QuizPop to EduQuiz
  - Implemented bilingual support (EN/中文)
  - Created 3-subject structure (BM, History, Science)
  - Built 5-level progression system with themed names
  - Implemented stage-based quiz gameplay
  - Added admin panel with question management
  - Added leaderboard and quiz history
  - Added notice board system
