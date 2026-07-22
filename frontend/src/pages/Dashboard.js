import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import {
  BarChart3,
  Bell,
  BookOpen,
  Cake,
  Clock,
  FileQuestion,
  Globe,
  LogOut,
  Megaphone,
  Radio,
  School,
  Settings,
  Star,
  Target,
  Trophy,
  Users,
  X,
  Menu
} from 'lucide-react';

import Avatar from '../components/Avatar';
import InstallPwaBanner from '../components/InstallPwaBanner';
import LevelProgressionCard from '../components/LevelProgressionCard';
import { useLanguage } from '../context/LanguageContext';
import { API_URL } from '../lib/api';

function Dashboard({ onSessionExpired }) {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [progression, setProgression] = useState(null);
  const [welcomeMsg, setWelcomeMsg] = useState(null);
  const [notices, setNotices] = useState([]);
  const [schoolLogo, setSchoolLogo] = useState('');
  const [loading, setLoading] = useState(true);
  const [showBirthday, setShowBirthday] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { language, toggleLanguage, t } = useLanguage();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!user?.date_of_birth) return;
    const today = new Date();
    const todayKey = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const dobKey = user.date_of_birth.slice(5);
    if (todayKey !== dobKey) return;

    const seenKey = `birthday_seen_${user.id}_${today.getFullYear()}`;
    const alreadyCelebrated = localStorage.getItem(seenKey);
    setShowBirthday(true);
    if (!alreadyCelebrated) {
      const fire = (delay, opts) => setTimeout(() => {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.4 }, ...opts });
      }, delay);
      fire(300, { angle: 60, origin: { x: 0, y: 0.5 } });
      fire(600, { angle: 120, origin: { x: 1, y: 0.5 } });
      fire(900, { particleCount: 120, spread: 100, origin: { y: 0.3 } });
      localStorage.setItem(seenKey, '1');
    }
  }, [user]);

  const fetchData = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [userRes, statsRes, welcomeRes, noticesRes, progressionRes, schoolsRes] = await Promise.all([
        axios.get(`${API_URL}/api/auth/me`, { headers }),
        axios.get(`${API_URL}/api/progress/stats`, { headers }),
        axios.get(`${API_URL}/api/welcome-message`, { headers }),
        axios.get(`${API_URL}/api/notices`),
        axios.get(`${API_URL}/api/user/progression`, { headers }),
        axios.get(`${API_URL}/api/schools`)
      ]);

      setUser(userRes.data);
      setStats(statsRes.data);
      setWelcomeMsg(welcomeRes.data);
      setNotices(noticesRes.data);
      setProgression(progressionRes.data);
      const school = (schoolsRes.data || []).find((item) => (
        (userRes.data.school_id && item.id === userRes.data.school_id) ||
        item.school_name === userRes.data.school_name
      ));
      setSchoolLogo(school?.school_logo || '');
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        onSessionExpired?.();
        navigate('/login', { replace: true });
      } else {
        toast.error(language === 'zh' ? '无法加载数据' : 'Failed to load data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    onSessionExpired?.();
    toast.success(language === 'zh' ? '退出成功' : 'Logged out successfully');
    setTimeout(() => navigate('/login', { replace: true }), 500);
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  const navGroups = [
    {
      title: language === 'zh' ? '学习' : 'Learning',
      items: [
        { label: language === 'zh' ? '等级' : 'Level', icon: BookOpen, path: '/levels', testId: 'side-levels' }
      ]
    },
    {
      title: language === 'zh' ? '管理' : 'Management',
      adminOnly: true,
      items: [
        { label: language === 'zh' ? '题目' : 'Questions', icon: FileQuestion, path: '/admin/questions', testId: 'side-admin-questions' },
        { label: language === 'zh' ? '用户' : 'Users', icon: Users, path: '/admin/users', testId: 'side-admin-users' },
        { label: language === 'zh' ? '学校' : 'Schools', icon: School, path: '/admin/schools', testId: 'side-admin-schools' },
        { label: language === 'zh' ? '公告' : 'Notices', icon: Megaphone, path: '/admin/notices', testId: 'side-admin-notices' }
      ]
    },
    {
      title: language === 'zh' ? '成绩与报告' : 'Results',
      items: [
        { label: t('leaderboard'), icon: Trophy, path: '/leaderboard', testId: 'side-leaderboard' },
        { label: t('history_title'), icon: Clock, path: '/history', testId: 'side-history' },
        { label: language === 'zh' ? '报告' : 'Reports', icon: BarChart3, path: '/admin/reports', adminOnly: true, testId: 'side-admin-reports' }
      ]
    },
    {
      title: language === 'zh' ? '竞赛' : 'Competition',
      items: [
        { label: language === 'zh' ? '实时竞赛' : 'LIVE Competition', icon: Radio, path: '/live', testId: 'side-live' }
      ]
    },
    {
      title: language === 'zh' ? '账户' : 'Account',
      items: [
        { label: language === 'zh' ? '个人资料' : 'Profile', icon: Settings, path: '/settings', testId: 'side-settings' },
        { label: language === 'zh' ? '退出登录' : 'Logout', icon: LogOut, action: handleLogout, danger: true, testId: 'side-logout' }
      ]
    }
  ];

  const statCards = [
    { label: t('total_points'), value: stats?.total_points || 0, icon: Star, color: 'text-yellow-500', testId: 'total-points-card' },
    { label: t('current_level'), value: stats?.current_level || 1, icon: Trophy, color: 'text-violet-500', testId: 'level-card' },
    { label: t('time_spent'), value: formatTime(stats?.total_time_spent || 0), icon: Clock, color: 'text-blue-500', testId: 'time-card' },
    { label: t('quizzes_done'), value: stats?.quizzes_completed || 0, icon: Target, color: 'text-green-500', testId: 'quizzes-card' }
  ];

  const renderMenuGroups = (testPrefix = 'side') => (
    navGroups
      .filter((group) => !group.adminOnly || user?.role === 'admin')
      .map((group) => {
        const items = group.items.filter((item) => !item.adminOnly || user?.role === 'admin');
        if (items.length === 0) return null;

        return (
          <div key={group.title}>
            <p className="mb-2 px-2 text-xs font-black uppercase tracking-wide text-zinc-400">
              {group.title}
            </p>
            <div className="space-y-1">
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.path || item.testId}
                    onClick={() => {
                      setMobileMenuOpen(false);
                      if (item.action) {
                        item.action();
                      } else {
                        navigate(item.path);
                      }
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold ${
                      item.danger
                        ? 'text-red-600 hover:bg-red-50'
                        : 'text-zinc-700 hover:bg-violet-50 hover:text-violet-700'
                    }`}
                    data-testid={testPrefix === 'mobile' ? item.testId.replace('side-', 'mobile-') : item.testId}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="min-w-0 truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 to-pink-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-violet-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-pink-50" data-testid="dashboard">
      <header className="bg-white/80 backdrop-blur-md border-b-2 border-zinc-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center">
              <img
                src="/monster-huddle-transparent.png"
                alt="Monster Huddle"
                className="w-full h-full object-contain drop-shadow-sm"
                data-testid="header-logo"
              />
            </div>
            <span className="text-xl font-black text-zinc-900">Monster Huddle</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleLanguage}
              className="p-2 rounded-lg hover:bg-zinc-100 transition-colors flex items-center gap-1"
              data-testid="language-toggle"
            >
              <Globe className="w-5 h-5" />
              <span className="text-sm font-bold">{language === 'en' ? '中文' : 'EN'}</span>
            </button>

            <button
              onClick={() => navigate('/notices')}
              className="p-2 rounded-lg hover:bg-zinc-100 transition-colors relative"
              data-testid="notices-btn"
            >
              <Bell className="w-5 h-5" />
              {notices.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                  {notices.length}
                </span>
              )}
            </button>

            <button
              onClick={() => navigate('/settings')}
              className="ml-1 hover:scale-105 transition-transform"
              title={language === 'zh' ? '个人资料' : 'Profile'}
              data-testid="header-avatar-btn"
            >
              {schoolLogo ? (
                <img
                  src={schoolLogo}
                  alt={user?.school_name || 'School'}
                  className="h-9 w-9 rounded-full object-contain bg-white ring-2 ring-violet-200"
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 ring-2 ring-violet-200">
                  <School className="h-5 w-5 text-violet-600" />
                </div>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="relative mb-4 lg:hidden" data-testid="dashboard-mobile-menu">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="flex w-full items-center justify-between rounded-2xl border-2 border-zinc-200 bg-white px-4 py-3 font-black text-zinc-900 shadow-sm"
            aria-expanded={mobileMenuOpen}
            aria-controls="dashboard-mobile-menu-panel"
            data-testid="dashboard-mobile-menu-btn"
          >
            <span className="flex items-center gap-2">
              <Menu className="h-5 w-5 text-violet-600" />
              {language === 'zh' ? '菜单' : 'Menu'}
            </span>
            <span className="max-w-[45vw] truncate text-xs font-bold text-zinc-400">{user?.username}</span>
          </button>

          {mobileMenuOpen && (
            <div
              id="dashboard-mobile-menu-panel"
              className="absolute left-0 right-0 top-full z-40 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border-2 border-zinc-200 bg-white p-4 shadow-xl"
              data-testid="dashboard-mobile-menu-panel"
            >
              <div className="mb-4 flex items-center gap-3 border-b border-zinc-100 pb-4">
                <Avatar
                  src={user?.profile_picture}
                  name={user?.full_name || user?.username}
                  size={44}
                  className="ring-2 ring-violet-200"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-zinc-900">{user?.full_name || user?.username}</p>
                  <p className="truncate text-xs font-bold text-zinc-400">@{user?.username}</p>
                </div>
              </div>
              <nav className="space-y-4">
                {renderMenuGroups('mobile')}
              </nav>
            </div>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="hidden lg:block lg:sticky lg:top-24 lg:self-start" data-testid="dashboard-side-menu">
            <div className="rounded-2xl border-2 border-zinc-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center gap-3 border-b border-zinc-100 pb-4">
                <Avatar
                  src={user?.profile_picture}
                  name={user?.full_name || user?.username}
                  size={44}
                  className="ring-2 ring-violet-200"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-zinc-900">{user?.full_name || user?.username}</p>
                  <p className="truncate text-xs font-bold text-zinc-400">@{user?.username}</p>
                </div>
              </div>

              <nav className="space-y-4">
                {renderMenuGroups()}
              </nav>
            </div>
          </aside>

          <section className="min-w-0">
            <InstallPwaBanner language={language} role={user?.role || 'user'} />

            <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex justify-center md:w-56 lg:w-64 shrink-0"
                data-testid="dashboard-mascot"
              >
                <Avatar
                  src={user?.profile_picture}
                  name={user?.full_name || user?.username}
                  size={190}
                  className="ring-4 ring-white shadow-xl"
                />
              </motion.div>

              <div className="flex-1 min-w-0">
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <h1 className="text-3xl md:text-4xl font-black text-zinc-900 mb-2" data-testid="welcome-title">
                    {t('welcome_back')}, {user?.full_name || user?.username}!
                  </h1>
                  {welcomeMsg && (
                    <p className="text-zinc-600 font-medium">
                      {language === 'zh' ? welcomeMsg.message_zh : welcomeMsg.message_en}
                    </p>
                  )}
                  {user?.previous_login_at && (
                    <div className="mt-3 flex items-center gap-1.5 text-sm font-medium text-zinc-500" data-testid="last-login-display">
                      <Clock className="w-4 h-4 text-zinc-400" />
                      <span>
                        {language === 'zh' ? '上次登录:' : 'Last login:'}{' '}
                        <span className="text-zinc-700">
                          {new Date(user.previous_login_at).toLocaleString(
                            language === 'zh' ? 'zh-CN' : 'en-US',
                            { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }
                          )}
                        </span>
                      </span>
                    </div>
                  )}
                </motion.div>
              </div>
            </div>

            {showBirthday && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, type: 'spring' }}
                className="relative mb-6 overflow-hidden rounded-2xl border-2 border-pink-300 bg-gradient-to-r from-pink-100 via-yellow-100 to-violet-100 p-5 shadow-md"
                data-testid="birthday-banner"
              >
                <button
                  onClick={() => setShowBirthday(false)}
                  className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/60 transition-colors"
                  data-testid="close-birthday-btn"
                  aria-label="dismiss"
                >
                  <X className="w-4 h-4 text-zinc-600" />
                </button>
                <div className="flex items-center gap-4">
                  <div className="bg-white rounded-2xl p-3 shadow-sm shrink-0">
                    <Cake className="w-12 h-12 text-pink-500" data-testid="birthday-cake-icon" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl md:text-2xl font-black text-pink-600">
                      {language === 'zh' ? '生日快乐!' : 'Happy Birthday!'}
                    </h3>
                    <p className="text-sm md:text-base font-medium text-zinc-700 mt-0.5">
                      {language === 'zh'
                        ? `${user?.full_name || user?.username}, 祝你今天过得开心, 继续加油学习!`
                        : `Have an amazing day, ${user?.full_name || user?.username}! Keep crushing your quizzes!`}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {progression && (
              <div className="mb-6">
                <LevelProgressionCard progression={progression} language={language} />
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {statCards.map((card, index) => {
                const Icon = card.icon;
                return (
                  <motion.div
                    key={card.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                    className="bg-white rounded-2xl p-4 border-2 border-zinc-200 shadow-sm"
                    data-testid={card.testId}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={`w-5 h-5 ${card.color}`} />
                      <span className="text-xs font-bold text-zinc-500 uppercase">{card.label}</span>
                    </div>
                    <p className="text-3xl font-black text-zinc-900">{card.value}</p>
                  </motion.div>
                );
              })}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
