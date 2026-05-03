# QuizPop - Product Requirements Document

## Original Problem Statement
Design an Online Quiz App (web & mobile friendly) with three criteria:
1. **Questionnaire:** Support for text, audio, and video questions.
2. **Upgrade level system:** Users can upgrade their level.
3. **Login access:** Secure login for users.

## Product Requirements (User Choices)
- **Questionnaire Media:** Both user-uploaded media and system-generated TTS audio
- **Level System:** Quiz completion-based progression
- **Quiz Features:** Basic functionality (take quiz, view score) + multiple categories
- **Design Style:** Gamified, colorful neo-brutalist aesthetic
- **Admin Panel:** Full admin panel for quiz/user management
- **User Management (Admin):** List, remove, reset passwords (with email), reset progress
- **User Settings:** Password change, theme selection
- **Success Metrics:** DAU, Quiz completion rate, Average score improvement, Retention (3-day/7-day)

## Tech Stack
- **Backend:** FastAPI, Python, MongoDB
- **Frontend:** React, Tailwind CSS, Shadcn UI, Recharts
- **Authentication:** JWT with bcrypt password hashing
- **Integrations:** OpenAI TTS (Emergent LLM Key), Resend (user API key required)

## Core Features Implemented

### Authentication
- [x] JWT-based user/admin login
- [x] User registration
- [x] Role-based access (user/admin)
- [x] Activity logging for analytics

### User Dashboard
- [x] Display user stats (level, points, completed quizzes)
- [x] Quiz listing with level-based access control
- [x] Quiz completion tracking
- [x] Quiz creation date display
- [x] Theme selection (Default, Ocean, Sunset)
- [x] Password change functionality

### Quiz System
- [x] Text, audio, and video question types
- [x] Quiz timer
- [x] Score calculation and results display
- [x] Level progression on quiz completion

### Admin Panel
- [x] Quiz CRUD (Create, View, Delete)
- [x] Question CRUD (Create, View, Delete, Edit)
- [x] OpenAI TTS integration for audio generation
- [x] User management (list, delete, reset password, reset progress)
- [x] Email notifications via Resend
- [x] Quick stats cards (DAU, Completion, Avg Score, 7D Retention)

### Analytics Dashboard (NEW)
- [x] Summary metrics API endpoint
- [x] Detailed analytics API endpoint with 14-day trends
- [x] Daily Active Users (DAU) tracking and trend chart
- [x] Quiz completion rate with bar chart
- [x] Average score trend line chart
- [x] Category performance horizontal bar chart
- [x] 3-day and 7-day retention metrics
- [x] Average score improvement tracking (first vs last quiz)
- [x] Refresh functionality
- [x] Activity logging on login and quiz start

## Database Schema

### Users Collection
```json
{
  "id": "uuid",
  "name": "string",
  "email": "string",
  "password": "hashed",
  "level": "int",
  "points": "int",
  "completed_quizzes": ["quiz_id"],
  "role": "user|admin",
  "created_at": "datetime"
}
```

### Quizzes Collection
```json
{
  "id": "uuid",
  "title": "string",
  "description": "string",
  "category": "string",
  "level_required": "int",
  "duration_minutes": "int",
  "questions_count": "int",
  "created_by": "user_id",
  "created_at": "datetime",
  "is_published": "boolean"
}
```

### Activity Logs Collection (NEW)
```json
{
  "id": "uuid",
  "user_id": "string",
  "action": "login|quiz_start",
  "metadata": {},
  "timestamp": "datetime"
}
```

## API Endpoints

### Analytics Endpoints (NEW)
- `GET /api/admin/analytics/summary` - Quick stats (DAU, completion rate, avg score, retention)
- `GET /api/admin/analytics/detailed` - Full analytics with 14-day trends and charts data

## Test Credentials
- **User:** demo@quiz.com / demo123
- **Admin:** admin@quiz.com / admin123

## Configuration Notes
- Resend API Key required for email notifications (set RESEND_API_KEY in backend/.env)
- OpenAI TTS uses Emergent LLM Key (pre-configured)

## Backlog / Future Enhancements
- Refactor navigation to use proper React state management instead of window.location.href workaround
- Add quiz search/filter functionality
- Add leaderboard feature
- Export analytics data to CSV
- Add more granular time period selection for analytics
