import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useLanguage } from '../../context/LanguageContext';
import { 
  ArrowLeft, Crown, FileQuestion, Users, Bell, BarChart3, 
  BookOpen, Landmark, FlaskConical, Trophy
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

function AdminDashboard() {
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { language, t } = useLanguage();

  useEffect(() => {
    fetchReports();
  }, []);

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

  const menuItems = [
    { 
      icon: FileQuestion, 
      title: language === 'zh' ? '管理问题' : 'Manage Questions',
      desc: language === 'zh' ? '添加、编辑或删除测验问题' : 'Add, edit or delete quiz questions',
      path: '/admin/questions',
      color: 'violet'
    },
    { 
      icon: Users, 
      title: language === 'zh' ? '管理用户' : 'Manage Users',
      desc: language === 'zh' ? '查看和管理用户账户' : 'View and manage user accounts',
      path: '/admin/users',
      color: 'blue'
    },
    { 
      icon: Bell, 
      title: language === 'zh' ? '管理通知' : 'Manage Notices',
      desc: language === 'zh' ? '创建公告和通知' : 'Create announcements and notices',
      path: '/admin/notices',
      color: 'pink'
    },
    { 
      icon: BarChart3, 
      title: language === 'zh' ? '报告' : 'Reports',
      desc: language === 'zh' ? '查看详细分析' : 'View detailed analytics',
      path: '/admin/reports',
      color: 'green'
    },
    { 
      icon: Trophy, 
      title: language === 'zh' ? '锦标赛' : 'Tournaments',
      desc: language === 'zh' ? '安排实时锦标赛' : 'Schedule live tournaments',
      path: '/admin/tournaments',
      color: 'yellow'
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
          
          <div className="flex items-center gap-4">
            <Crown className="w-12 h-12 text-white" />
            <div>
              <h1 className="text-3xl font-black text-white">{t('admin_panel')}</h1>
              <p className="text-white/80 font-medium">
                {language === 'zh' ? '管理您的测验应用' : 'Manage your quiz application'}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 border-2 border-zinc-200">
            <p className="text-sm font-bold text-zinc-500 mb-1">
              {language === 'zh' ? '总用户' : 'Total Users'}
            </p>
            <p className="text-3xl font-black text-zinc-900">{reports?.total_users || 0}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border-2 border-zinc-200">
            <p className="text-sm font-bold text-zinc-500 mb-1">
              {language === 'zh' ? '完成测验' : 'Quizzes Done'}
            </p>
            <p className="text-3xl font-black text-zinc-900">{reports?.total_quizzes_completed || 0}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border-2 border-zinc-200">
            <p className="text-sm font-bold text-zinc-500 mb-1">
              {language === 'zh' ? '7天活跃' : 'Active (7d)'}
            </p>
            <p className="text-3xl font-black text-zinc-900">{reports?.active_users_7d || 0}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border-2 border-zinc-200">
            <p className="text-sm font-bold text-zinc-500 mb-1">
              {language === 'zh' ? '科目数' : 'Subjects'}
            </p>
            <p className="text-3xl font-black text-zinc-900">3</p>
          </div>
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {menuItems.map((item, index) => (
            <motion.button
              key={item.path}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
              onClick={() => navigate(item.path)}
              className={`bg-white rounded-2xl p-6 border-2 border-zinc-200 text-left hover:border-${item.color}-300 hover:shadow-md transition-all group`}
            >
              <div className={`w-12 h-12 rounded-xl bg-${item.color}-100 flex items-center justify-center mb-4`}>
                <item.icon className={`w-6 h-6 text-${item.color}-500`} />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 mb-1">{item.title}</h3>
              <p className="text-sm text-zinc-500">{item.desc}</p>
            </motion.button>
          ))}
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
