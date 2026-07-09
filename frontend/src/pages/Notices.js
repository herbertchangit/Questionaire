import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useLanguage } from '../context/LanguageContext';
import { ArrowLeft, Bell, Megaphone, Calendar } from 'lucide-react';

import { API_URL } from '../lib/api';

function Notices() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { language, t } = useLanguage();

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/notices`);
      setNotices(response.data);
    } catch (error) {
      toast.error('Failed to load notices');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 to-pink-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-violet-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-pink-50" data-testid="notices-page">
      <header className="bg-gradient-to-r from-violet-500 to-pink-500 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-4 font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            {t('back')}
          </button>
          
          <div className="flex items-center gap-4">
            <Bell className="w-12 h-12 text-white" />
            <div>
              <h1 className="text-3xl font-black text-white">{t('notices')}</h1>
              <p className="text-white/80 font-medium">{t('announcements')}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {notices.length === 0 ? (
          <div className="text-center py-12">
            <Megaphone className="w-16 h-16 text-zinc-300 mx-auto mb-4" />
            <p className="text-zinc-500 font-medium">{t('no_notices')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notices.map((notice, index) => (
              <motion.div
                key={notice.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                className="bg-white rounded-2xl p-6 border-2 border-zinc-200"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    notice.type === 'announcement' 
                      ? 'bg-violet-100 text-violet-700'
                      : 'bg-orange-100 text-orange-700'
                  }`}>
                    {notice.type === 'announcement' 
                      ? (language === 'zh' ? '公告' : 'Announcement')
                      : (language === 'zh' ? '即将推出' : 'Upcoming')
                    }
                  </span>
                  <div className="flex items-center gap-1 text-sm text-zinc-500">
                    <Calendar className="w-4 h-4" />
                    {formatDate(notice.created_at)}
                  </div>
                </div>
                
                <h3 className="text-xl font-bold text-zinc-900 mb-2">
                  {language === 'zh' ? notice.title_zh : notice.title_en}
                </h3>
                <p className="text-zinc-600">
                  {language === 'zh' ? notice.content_zh : notice.content_en}
                </p>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default Notices;
