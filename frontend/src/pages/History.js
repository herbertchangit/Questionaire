import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useLanguage } from '../context/LanguageContext';
import { ArrowLeft, Clock, Star, CheckCircle, Calendar } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { language, t } = useLanguage();

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/api/progress/history?limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistory(response.data);
    } catch (error) {
      toast.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getLevelName = (levelNum) => {
    const names = {
      en: { 1: 'Determination', 2: 'Discipline', 3: 'Perseverance', 4: 'Hard-working', 5: 'Breakthrough' },
      zh: { 1: '决心', 2: '自律', 3: '毅力', 4: '勤劳', 5: '突破' }
    };
    return names[language][levelNum] || `Level ${levelNum}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 to-pink-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-violet-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-pink-50" data-testid="history-page">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-500 to-blue-600 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-4 font-medium"
            data-testid="back-btn"
          >
            <ArrowLeft className="w-5 h-5" />
            {t('back')}
          </button>
          
          <div className="flex items-center gap-4">
            <Clock className="w-12 h-12 text-white" />
            <div>
              <h1 className="text-3xl font-black text-white">{t('history_title')}</h1>
              <p className="text-white/80 font-medium">{t('your_progress')}</p>
            </div>
          </div>
        </div>
      </header>

      {/* History List */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        {history.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-16 h-16 text-zinc-300 mx-auto mb-4" />
            <p className="text-zinc-500 font-medium">{t('no_history')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((item, index) => {
              const percentage = Math.round((item.score / item.total) * 100);
              
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * index }}
                  className="bg-white rounded-xl p-4 border-2 border-zinc-200"
                  data-testid={`history-item-${index}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="text-sm font-bold text-violet-600">
                        {getLevelName(item.level_num)}
                      </span>
                      <h3 className="font-bold text-zinc-900">
                        Stage {item.stage_num}
                      </h3>
                    </div>
                    <div className={`
                      px-3 py-1 rounded-lg font-bold text-sm
                      ${percentage >= 80 
                        ? 'bg-green-100 text-green-700' 
                        : percentage >= 50 
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }
                    `}>
                      {percentage}%
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-zinc-500">
                    <div className="flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      <span>{item.score}/{item.total}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span>{item.points_earned} pts</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{formatTime(item.time_spent)}</span>
                    </div>
                    <div className="flex items-center gap-1 ml-auto">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(item.completed_at)}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default History;
