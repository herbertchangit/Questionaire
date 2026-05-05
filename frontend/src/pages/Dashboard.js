import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useLanguage } from '../context/LanguageContext';
import { 
  Trophy, Star, Clock, Target, LogOut, Settings, Crown, Bell, Award, TrendingUp,
  ChevronRight, Globe, Flame, Mountain, Hammer, Rocket, Lock
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const levelIcons = {
  'flame': Flame,
  'target': Target,
  'mountain': Mountain,
  'hammer': Hammer,
  'rocket': Rocket
};

const levelNames = {
  en: { 1: 'Determination', 2: 'Discipline', 3: 'Perseverance', 4: 'Hard-working', 5: 'Breakthrough' },
  zh: { 1: '决心', 2: '自律', 3: '毅力', 4: '勤劳', 5: '突破' }
};

function Dashboard() {
  const [user, setUser] = useState(null);
  const [levels, setLevels] = useState([]);
  const [stats, setStats] = useState(null);
  const [welcomeMsg, setWelcomeMsg] = useState(null);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { language, toggleLanguage, t } = useLanguage();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [userRes, levelsRes, statsRes, welcomeRes, noticesRes] = await Promise.all([
        axios.get(`${API_URL}/api/auth/me`, { headers }),
        axios.get(`${API_URL}/api/levels`, { headers }),
        axios.get(`${API_URL}/api/progress/stats`, { headers }),
        axios.get(`${API_URL}/api/welcome-message`, { headers }),
        axios.get(`${API_URL}/api/notices`)
      ]);

      setUser(userRes.data);
      setLevels(levelsRes.data);
      setStats(statsRes.data);
      setWelcomeMsg(welcomeRes.data);
      setNotices(noticesRes.data);
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.clear();
        navigate('/login');
      } else {
        toast.error('Failed to load data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    toast.success(language === 'zh' ? '退出成功' : 'Logged out successfully');
    setTimeout(() => {
      window.location.href = '/login';
    }, 500);
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 to-pink-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-violet-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-pink-50" data-testid="dashboard">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b-2 border-zinc-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-violet-500 to-pink-500 p-2 rounded-xl">
              <Award className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-black text-zinc-900">EduQuiz</span>
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
            
            {user?.role === 'admin' && (
              <button
                onClick={() => navigate('/admin')}
                className="p-2 rounded-lg hover:bg-yellow-100 transition-colors"
                data-testid="admin-btn"
              >
                <Crown className="w-5 h-5 text-yellow-600" />
              </button>
            )}
            
            <button
              onClick={() => navigate('/settings')}
              className="p-2 rounded-lg hover:bg-zinc-100 transition-colors"
              data-testid="settings-btn"
            >
              <Settings className="w-5 h-5" />
            </button>
            
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-red-100 transition-colors"
              data-testid="logout-btn"
            >
              <LogOut className="w-5 h-5 text-red-500" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-black text-zinc-900 mb-2" data-testid="welcome-title">
            {t('welcome_back')}, {user?.full_name || user?.username}! 👋
          </h1>
          {welcomeMsg && (
            <p className="text-zinc-600 font-medium">
              {language === 'zh' ? welcomeMsg.message_zh : welcomeMsg.message_en}
            </p>
          )}
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-4 border-2 border-zinc-200 shadow-sm"
            data-testid="total-points-card"
          >
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-5 h-5 text-yellow-500" />
              <span className="text-xs font-bold text-zinc-500 uppercase">{t('total_points')}</span>
            </div>
            <p className="text-3xl font-black text-zinc-900">{stats?.total_points || 0}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl p-4 border-2 border-zinc-200 shadow-sm"
            data-testid="level-card"
          >
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-5 h-5 text-violet-500" />
              <span className="text-xs font-bold text-zinc-500 uppercase">{t('current_level')}</span>
            </div>
            <p className="text-3xl font-black text-zinc-900">{stats?.current_level || 1}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl p-4 border-2 border-zinc-200 shadow-sm"
            data-testid="time-card"
          >
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-blue-500" />
              <span className="text-xs font-bold text-zinc-500 uppercase">{t('time_spent')}</span>
            </div>
            <p className="text-3xl font-black text-zinc-900">{formatTime(stats?.total_time_spent || 0)}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl p-4 border-2 border-zinc-200 shadow-sm"
            data-testid="quizzes-card"
          >
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-green-500" />
              <span className="text-xs font-bold text-zinc-500 uppercase">{t('quizzes_done')}</span>
            </div>
            <p className="text-3xl font-black text-zinc-900">{stats?.quizzes_completed || 0}</p>
          </motion.div>
        </div>

        {/* Levels Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-black text-zinc-900 mb-4">{t('levels')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {levels.map((level, index) => {
              const Icon = levelIcons[level.icon] || Flame;
              const isLocked = !level.is_unlocked;
              
              return (
                <motion.div
                  key={level.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                  onClick={() => !isLocked && navigate(`/level/${level.level_num}`)}
                  className={`bg-white rounded-2xl p-6 border-2 transition-all ${
                    isLocked 
                      ? 'border-zinc-200 opacity-60 cursor-not-allowed' 
                      : 'border-zinc-200 hover:border-violet-300 hover:shadow-md cursor-pointer group'
                  }`}
                  data-testid={`level-card-${level.level_num}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div 
                      className={`p-3 rounded-xl ${isLocked ? 'bg-zinc-100' : ''}`}
                      style={{ backgroundColor: isLocked ? undefined : `${level.color}20` }}
                    >
                      {isLocked ? (
                        <Lock className="w-8 h-8 text-zinc-400" />
                      ) : (
                        <Icon className="w-8 h-8" style={{ color: level.color }} />
                      )}
                    </div>
                    {!isLocked && <ChevronRight className="w-5 h-5 text-zinc-400 group-hover:text-violet-500 transition-colors" />}
                  </div>
                  
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-zinc-400">{t('level')} {level.level_num}</span>
                  </div>
                  <h3 className="text-xl font-black text-zinc-900 mb-2">
                    {levelNames[language][level.level_num]}
                  </h3>
                  
                  {isLocked ? (
                    <p className="text-sm text-zinc-500">
                      {t('unlock_at')} {level.unlock_points} {t('points')}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-600">{level.stages_completed || 0}/5 {t('stages')}</span>
                        <span className="font-bold" style={{ color: level.color }}>
                          {((level.stages_completed || 0) / 5 * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all"
                          style={{ 
                            width: `${((level.stages_completed || 0) / 5) * 100}%`,
                            backgroundColor: level.color
                          }}
                        />
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            onClick={() => navigate('/leaderboard')}
            className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white rounded-2xl p-4 font-bold flex items-center gap-3 hover:scale-105 transition-transform"
            data-testid="leaderboard-btn"
          >
            <Trophy className="w-6 h-6" />
            <span>{t('leaderboard')}</span>
          </motion.button>

          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            onClick={() => navigate('/history')}
            className="bg-gradient-to-br from-blue-400 to-blue-600 text-white rounded-2xl p-4 font-bold flex items-center gap-3 hover:scale-105 transition-transform"
            data-testid="history-btn"
          >
            <Clock className="w-6 h-6" />
            <span>{t('history_title')}</span>
          </motion.button>

          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            onClick={() => navigate('/live')}
            className="bg-gradient-to-br from-pink-500 to-red-500 text-white rounded-2xl p-4 font-bold flex items-center gap-3 hover:scale-105 transition-transform col-span-2 md:col-span-2"
            data-testid="live-btn"
          >
            <TrendingUp className="w-6 h-6" />
            <span>{language === 'zh' ? '实时竞赛' : 'LIVE Competition'}</span>
          </motion.button>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
