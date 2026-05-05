import React, { createContext, useContext, useState, useEffect } from 'react';

const translations = {
  en: {
    // Common
    app_name: "EduQuiz",
    loading: "Loading...",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    back: "Back",
    next: "Next",
    submit: "Submit",
    logout: "Logout",
    settings: "Settings",
    
    // Auth
    login: "Login",
    register: "Register",
    email: "Email",
    password: "Password",
    name: "Name",
    confirm_password: "Confirm Password",
    login_title: "Welcome Back!",
    login_subtitle: "Sign in to continue your learning journey",
    register_title: "Join EduQuiz",
    register_subtitle: "Start your learning adventure today",
    no_account: "Don't have an account?",
    have_account: "Already have an account?",
    
    // Dashboard
    dashboard: "Dashboard",
    welcome_back: "Welcome back",
    choose_subject: "Choose a Subject",
    your_progress: "Your Progress",
    total_points: "Total Points",
    current_level: "Current Level",
    time_spent: "Time Spent",
    quizzes_done: "Quizzes Done",
    continue_learning: "Continue Learning",
    
    // Subjects
    subjects: "Subjects",
    bm: "Bahasa Malaysia",
    history: "History", 
    science: "Science",
    
    // Levels
    levels: "Levels",
    level: "Level",
    determination: "Determination",
    discipline: "Discipline",
    perseverance: "Perseverance",
    hardworking: "Hard-working",
    breakthrough: "Breakthrough",
    locked: "Locked",
    unlocked: "Unlocked",
    unlock_at: "Unlock at",
    points: "points",
    
    // Stages
    stages: "Stages",
    stage: "Stage",
    completed: "Completed",
    start_stage: "Start",
    
    // Quiz
    quiz: "Quiz",
    question: "Question",
    time_remaining: "Time Remaining",
    submit_answers: "Submit Answers",
    
    // Results
    results: "Results",
    congratulations: "Congratulations!",
    your_score: "Your Score",
    points_earned: "Points Earned",
    time_taken: "Time Taken",
    correct_answers: "Correct Answers",
    try_again: "Try Again",
    next_stage: "Next Stage",
    back_to_levels: "Back to Levels",
    level_up: "Level Up!",
    
    // Leaderboard
    leaderboard: "Leaderboard",
    rank: "Rank",
    player: "Player",
    global_ranking: "Global Ranking",
    
    // History
    history_title: "Quiz History",
    no_history: "No quiz history yet",
    date: "Date",
    score: "Score",
    
    // Notices
    notices: "Notices",
    announcements: "Announcements",
    no_notices: "No announcements",
    
    // Admin
    admin_panel: "Admin Panel",
    manage_questions: "Manage Questions",
    manage_users: "Manage Users",
    manage_notices: "Manage Notices",
    reports: "Reports",
    upload_questions: "Upload Questions",
    add_question: "Add Question",
    bulk_upload: "Bulk Upload (CSV)",
    
    // Settings
    language: "Language",
    change_password: "Change Password",
    current_password: "Current Password",
    new_password: "New Password",
    
    // Misc
    minutes: "minutes",
    seconds: "seconds",
    of: "of",
    hours: "hours"
  },
  zh: {
    // Common
    app_name: "EduQuiz",
    loading: "加载中...",
    save: "保存",
    cancel: "取消",
    delete: "删除",
    edit: "编辑",
    back: "返回",
    next: "下一步",
    submit: "提交",
    logout: "退出登录",
    settings: "设置",
    
    // Auth
    login: "登录",
    register: "注册",
    email: "电子邮件",
    password: "密码",
    name: "姓名",
    confirm_password: "确认密码",
    login_title: "欢迎回来!",
    login_subtitle: "登录以继续您的学习之旅",
    register_title: "加入EduQuiz",
    register_subtitle: "今天开始您的学习冒险",
    no_account: "还没有账户?",
    have_account: "已有账户?",
    
    // Dashboard
    dashboard: "仪表板",
    welcome_back: "欢迎回来",
    choose_subject: "选择科目",
    your_progress: "您的进度",
    total_points: "总积分",
    current_level: "当前等级",
    time_spent: "花费时间",
    quizzes_done: "完成测验",
    continue_learning: "继续学习",
    
    // Subjects
    subjects: "科目",
    bm: "马来语",
    history: "历史",
    science: "科学",
    
    // Levels
    levels: "等级",
    level: "等级",
    determination: "决心",
    discipline: "自律",
    perseverance: "毅力",
    hardworking: "勤劳",
    breakthrough: "突破",
    locked: "已锁定",
    unlocked: "已解锁",
    unlock_at: "解锁需要",
    points: "积分",
    
    // Stages
    stages: "阶段",
    stage: "阶段",
    completed: "已完成",
    start_stage: "开始",
    
    // Quiz
    quiz: "测验",
    question: "问题",
    time_remaining: "剩余时间",
    submit_answers: "提交答案",
    
    // Results
    results: "结果",
    congratulations: "恭喜!",
    your_score: "您的分数",
    points_earned: "获得积分",
    time_taken: "用时",
    correct_answers: "正确答案",
    try_again: "再试一次",
    next_stage: "下一阶段",
    back_to_levels: "返回等级",
    level_up: "升级了!",
    
    // Leaderboard
    leaderboard: "排行榜",
    rank: "排名",
    player: "玩家",
    global_ranking: "全球排名",
    
    // History
    history_title: "测验历史",
    no_history: "暂无测验历史",
    date: "日期",
    score: "分数",
    
    // Notices
    notices: "通知",
    announcements: "公告",
    no_notices: "暂无公告",
    
    // Admin
    admin_panel: "管理面板",
    manage_questions: "管理问题",
    manage_users: "管理用户",
    manage_notices: "管理通知",
    reports: "报告",
    upload_questions: "上传问题",
    add_question: "添加问题",
    bulk_upload: "批量上传 (CSV)",
    
    // Settings
    language: "语言",
    change_password: "修改密码",
    current_password: "当前密码",
    new_password: "新密码",
    
    // Misc
    minutes: "分钟",
    seconds: "秒",
    of: "/",
    hours: "小时"
  }
};

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('language');
    return saved || 'en';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const t = (key) => {
    return translations[language]?.[key] || translations['en'][key] || key;
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'zh' : 'en');
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export default LanguageContext;
