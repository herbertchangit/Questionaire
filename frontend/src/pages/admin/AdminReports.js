import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useLanguage } from '../../context/LanguageContext';
import { ArrowLeft, Users, Target, BookOpen, Landmark, FlaskConical } from 'lucide-react';

import { API_URL } from '../../lib/api';

function AdminReports() {
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

  const icons = {
    'subj_bm': BookOpen,
    'subj_history': Landmark,
    'subj_science': FlaskConical
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 to-pink-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-violet-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-pink-50" data-testid="admin-reports">
      <header className="bg-white/80 backdrop-blur-md border-b-2 border-zinc-200 py-6 px-4">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2 text-zinc-600 hover:text-zinc-900 mb-4 font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            {t('back')}
          </button>
          <h1 className="text-3xl font-black text-zinc-900">{t('reports')}</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 border-2 border-zinc-200"
          >
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-6 h-6 text-violet-500" />
              <span className="text-sm font-bold text-zinc-500">
                {language === 'zh' ? '总用户' : 'Total Users'}
              </span>
            </div>
            <p className="text-4xl font-black text-zinc-900">{reports?.total_users || 0}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-6 border-2 border-zinc-200"
          >
            <div className="flex items-center gap-3 mb-2">
              <Target className="w-6 h-6 text-green-500" />
              <span className="text-sm font-bold text-zinc-500">
                {language === 'zh' ? '完成测验' : 'Quizzes Completed'}
              </span>
            </div>
            <p className="text-4xl font-black text-zinc-900">{reports?.total_quizzes_completed || 0}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl p-6 border-2 border-zinc-200"
          >
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-6 h-6 text-blue-500" />
              <span className="text-sm font-bold text-zinc-500">
                {language === 'zh' ? '7天活跃用户' : 'Active Users (7d)'}
              </span>
            </div>
            <p className="text-4xl font-black text-zinc-900">{reports?.active_users_7d || 0}</p>
          </motion.div>
        </div>

        {/* Subject Performance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-6 border-2 border-zinc-200"
        >
          <h2 className="text-xl font-black text-zinc-900 mb-4">
            {language === 'zh' ? '科目表现' : 'Subject Performance'}
          </h2>
          
          <div className="space-y-4">
            {reports?.subject_stats?.map((stat) => {
              const Icon = icons[stat.subject.id] || BookOpen;
              
              return (
                <div key={stat.subject.id} className="flex items-center gap-4">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${stat.subject.color}20` }}
                  >
                    <Icon className="w-6 h-6" style={{ color: stat.subject.color }} />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-bold text-zinc-900">
                        {language === 'zh' ? stat.subject.name_zh : stat.subject.name_en}
                      </h3>
                      <span className="font-bold text-zinc-600">
                        {stat.average_score_pct}% {language === 'zh' ? '平均分' : 'avg'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-zinc-500">
                      <span>{stat.quizzes_completed} {language === 'zh' ? '次测验' : 'quizzes'}</span>
                    </div>
                    <div className="h-2 bg-zinc-100 rounded-full mt-2 overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all"
                        style={{ 
                          width: `${stat.average_score_pct}%`,
                          backgroundColor: stat.subject.color
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </main>
    </div>
  );
}

export default AdminReports;
