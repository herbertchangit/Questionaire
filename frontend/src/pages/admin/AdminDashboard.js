import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useLanguage } from '../../context/LanguageContext';
import { 
  ArrowLeft, Crown, FileQuestion, Users, Bell, BarChart3, 
  BookMarked, BookOpen, Landmark, FlaskConical, Trophy, Clock, School
} from 'lucide-react';

import { API_URL } from '../../lib/api';

function AdminDashboard() {
  const [reports, setReports] = useState(null);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { language, t } = useLanguage();

  useEffect(() => {
    fetchReports();
    fetchMe();
  }, []);

  const fetchMe = async () => {
    const token = localStorage.getItem('token');
    try {
      const r = await axios.get(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMe(r.data);
    } catch (e) {}
  };

  const fetchReports = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get(`${API_URL}/api/admin/reports`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReports(response.data);
    } catch (error) {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const countLabel = (count, singular, plural, singularZh, pluralZh = singularZh) => {
    const value = Number(count || 0);
    if (language === 'zh') {
      return `${value} ${value === 1 ? singularZh : pluralZh}`;
    }
    return `${value} ${value === 1 ? singular : plural}`;
  };

  const cardColors = {
    violet: {
      hover: 'hover:border-violet-300',
      iconBg: 'bg-violet-100',
      iconText: 'text-violet-500',
      statBg: 'bg-violet-50',
      statText: 'text-violet-600'
    },
    blue: {
      hover: 'hover:border-blue-300',
      iconBg: 'bg-blue-100',
      iconText: 'text-blue-500',
      statBg: 'bg-blue-50',
      statText: 'text-blue-600'
    },
    cyan: {
      hover: 'hover:border-cyan-300',
      iconBg: 'bg-cyan-100',
      iconText: 'text-cyan-500',
      statBg: 'bg-cyan-50',
      statText: 'text-cyan-600'
    },
    indigo: {
      hover: 'hover:border-indigo-300',
      iconBg: 'bg-indigo-100',
      iconText: 'text-indigo-500',
      statBg: 'bg-indigo-50',
      statText: 'text-indigo-600'
    },
    pink: {
      hover: 'hover:border-pink-300',
      iconBg: 'bg-pink-100',
      iconText: 'text-pink-500',
      statBg: 'bg-pink-50',
      statText: 'text-pink-600'
    },
    green: {
      hover: 'hover:border-green-300',
      iconBg: 'bg-green-100',
      iconText: 'text-green-500',
      statBg: 'bg-green-50',
      statText: 'text-green-600'
    },
    yellow: {
      hover: 'hover:border-yellow-300',
      iconBg: 'bg-yellow-100',
      iconText: 'text-yellow-500',
      statBg: 'bg-yellow-50',
      statText: 'text-yellow-700'
    }
  };

  const menuItems = [
    { 
      icon: FileQuestion, 
      title: language === 'zh' ? '管理问题' : 'Manage Questions',
      desc: language === 'zh' ? '添加、编辑或删除测验问题' : 'Add, edit or delete quiz questions',
      path: '/admin/questions',
      color: 'violet',
      stat: countLabel(reports?.total_questions, 'question', 'questions', '题')
    },
    { 
      icon: Users, 
      title: language === 'zh' ? '管理用户' : 'Manage Users',
      desc: language === 'zh' ? '查看和管理用户账户' : 'View and manage user accounts',
      path: '/admin/users',
      color: 'blue',
      stat: countLabel(reports?.total_users, 'user', 'users', '用户')
    },
    { 
      icon: School, 
      title: language === 'zh' ? '管理学校' : 'Manage Schools',
      desc: language === 'zh' ? '管理学校资料、徽标和组织架构' : 'Manage school profiles, logos and structure',
      path: '/admin/schools',
      color: 'cyan',
      stat: countLabel(reports?.total_schools, 'school', 'schools', '学校')
    },
    {
      icon: BookMarked,
      title: language === 'zh' ? '管理科目' : 'Manage Subjects',
      desc: language === 'zh' ? '按学校、年级和章节管理科目' : 'Manage subjects by school, form and chapter',
      path: '/admin/subjects',
      color: 'indigo',
      stat: countLabel(reports?.total_subjects, 'subject', 'subjects', '科目')
    },
    { 
      icon: Bell, 
      title: language === 'zh' ? '管理通知' : 'Manage Notices',
      desc: language === 'zh' ? '创建公告和通知' : 'Create announcements and notices',
      path: '/admin/notices',
      color: 'pink',
      stat: countLabel(reports?.active_notices, 'active', 'active', '有效')
    },
    { 
      icon: BarChart3, 
      title: language === 'zh' ? '报告' : 'Reports',
      desc: language === 'zh' ? '查看详细分析' : 'View detailed analytics',
      path: '/admin/reports',
      color: 'green',
      stat: countLabel(reports?.total_quizzes_completed, 'quiz', 'quizzes', '测验')
    },
    { 
      icon: Trophy, 
      title: language === 'zh' ? '锦标赛' : 'Tournaments',
      desc: language === 'zh' ? '安排实时锦标赛' : 'Schedule live tournaments',
      path: '/admin/tournaments',
      color: 'yellow',
      stat: countLabel(reports?.total_tournaments, 'event', 'events', '赛事')
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 to-pink-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-violet-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-pink-50" data-testid="admin-dashboard">
      {/* Header */}
      <header className="bg-gradient-to-r from-yellow-400 to-orange-500 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-4 font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            {t('back')}
          </button>
          
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-4">
              <Crown className="w-12 h-12 text-white" />
              <div>
                <h1 className="text-3xl font-black text-white">{t('admin_panel')}</h1>
                <p className="text-white/80 font-medium">
                  {language === 'zh' ? '管理您的测验应用' : 'Manage your quiz application'}
                </p>
              </div>
            </div>
            {me?.previous_login_at && (
              <div
                className="flex items-center gap-1.5 text-sm md:text-base text-white/90 bg-white/15 backdrop-blur-sm px-3 py-2 rounded-xl"
                data-testid="admin-last-login-display"
              >
                <Clock className="w-4 h-4" />
                <span>
                  {language === 'zh' ? '上次登录:' : 'Last login:'}{' '}
                  <span className="font-bold">
                    {new Date(me.previous_login_at).toLocaleString(
                      language === 'zh' ? 'zh-CN' : 'en-US',
                      { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }
                    )}
                  </span>
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Menu Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {menuItems.map((item, index) => {
            const tone = cardColors[item.color];

            return (
              <motion.button
                key={item.path}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                onClick={() => navigate(item.path)}
                className={`bg-white rounded-2xl p-6 border-2 border-zinc-200 text-left ${tone.hover} hover:shadow-md transition-all group`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className={`w-12 h-12 rounded-xl ${tone.iconBg} flex items-center justify-center mb-4`}>
                      <item.icon className={`w-6 h-6 ${tone.iconText}`} />
                    </div>
                    <h3 className="text-xl font-bold text-zinc-900 mb-1">{item.title}</h3>
                    <p className="text-sm text-zinc-500">{item.desc}</p>
                  </div>
                  <div className={`shrink-0 rounded-xl ${tone.statBg} px-3 py-2 text-right`}>
                    <p className={`text-sm font-black ${tone.statText} whitespace-nowrap`}>{item.stat}</p>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Subject Stats */}
        {reports?.subject_stats && (
          <div className="bg-white rounded-2xl p-6 border-2 border-zinc-200">
            <h3 className="text-xl font-bold text-zinc-900 mb-4">
              {language === 'zh' ? '科目统计' : 'Subject Statistics'}
            </h3>
            <div className="space-y-4">
              {reports.subject_stats.map((stat) => {
                const icons = {
                  'subj_bm': BookOpen,
                  'subj_history': Landmark,
                  'subj_science': FlaskConical
                };
                const Icon = icons[stat.subject.id] || BookOpen;
                
                return (
                  <div key={stat.subject.id} className="flex items-center gap-4">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${stat.subject.color}20` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: stat.subject.color }} />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-zinc-900">
                        {language === 'zh' ? stat.subject.name_zh : stat.subject.name_en}
                      </p>
                      <p className="text-sm text-zinc-500">
                        {stat.quizzes_completed} {language === 'zh' ? '次测验' : 'quizzes'} • 
                        {stat.average_score_pct}% {language === 'zh' ? '平均分' : 'avg score'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminDashboard;
