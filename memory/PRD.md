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
- **User:** demo@quiz.com / demo123
- **Admin:** admin@quiz.com / admin123

## Upcoming Features (Phase 2 & 3)

### Phase 2
- [ ] More sample questions
- [ ] Achievement badges
- [ ] Sound effects

### Phase 3 - LIVE Competition
- [ ] WebSocket real-time gameplay
- [ ] Create/join LIVE rooms

## Changelog
- **2026-02-24**: Restructured - Removed subject-level coupling. Levels are now independent game progression with mixed subject questions per stage.
