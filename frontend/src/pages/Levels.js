import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ChevronRight,
  Flame,
  Hammer,
  Lock,
  Mountain,
  Rocket,
  Target
} from 'lucide-react';

import { useLanguage } from '../context/LanguageContext';
import { API_URL } from '../lib/api';

const levelIcons = {
  flame: Flame,
  target: Target,
  mountain: Mountain,
  hammer: Hammer,
  rocket: Rocket
};

const levelNames = {
  en: { 1: 'Determination', 2: 'Discipline', 3: 'Perseverance', 4: 'Hard-working', 5: 'Breakthrough' },
  zh: { 1: '决心', 2: '自律', 3: '毅力', 4: '勤劳', 5: '突破' }
};

function Levels() {
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { language, t } = useLanguage();

  useEffect(() => {
    const fetchLevels = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const response = await axios.get(`${API_URL}/api/levels`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setLevels(response.data);
      } catch (error) {
        toast.error(language === 'zh' ? '无法加载等级' : 'Failed to load levels');
      } finally {
        setLoading(false);
      }
    };

    fetchLevels();
  }, [language, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 to-pink-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-violet-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-pink-50" data-testid="levels-page">
      <header className="bg-white/80 backdrop-blur-md border-b-2 border-zinc-200 py-6 px-4">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-zinc-600 hover:text-zinc-900 mb-4 font-medium"
            data-testid="levels-back-btn"
          >
            <ArrowLeft className="w-5 h-5" />
            {t('back')}
          </button>
          <h1 className="text-3xl font-black text-zinc-900">{t('levels')}</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
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
                  {levelNames[language]?.[level.level_num] || level.title || `Level ${level.level_num}`}
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
                        {(((level.stages_completed || 0) / 5) * 100).toFixed(0)}%
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
      </main>
    </div>
  );
}

export default Levels;
