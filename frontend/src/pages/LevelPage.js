import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useLanguage } from '../context/LanguageContext';
import { ArrowLeft, Lock, CheckCircle, Play, Star, Flame, Target, Mountain, Hammer, Rocket } from 'lucide-react';

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

function LevelPage() {
  const { levelNum } = useParams();
  const [level, setLevel] = useState(null);
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { language, t } = useLanguage();

  useEffect(() => {
    fetchStages();
  }, [levelNum]);

  const fetchStages = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await axios.get(
        `${API_URL}/api/levels/${levelNum}/stages`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setLevel(response.data.level);
      setStages(response.data.stages);
    } catch (error) {
      if (error.response?.status === 403) {
        toast.error(language === 'zh' ? '等级未解锁' : 'Level not unlocked yet');
      } else {
        toast.error('Failed to load stages');
      }
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 to-pink-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-violet-500"></div>
      </div>
    );
  }

  const Icon = levelIcons[level?.icon] || Flame;

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-pink-50" data-testid="level-page">
      {/* Header */}
      <header 
        className="py-8 px-4"
        style={{ backgroundColor: `${level?.color}15` }}
      >
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-zinc-600 hover:text-zinc-900 mb-4 font-medium"
            data-testid="back-btn"
          >
            <ArrowLeft className="w-5 h-5" />
            {t('back')}
          </button>
          
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4"
          >
            <div 
              className="p-4 rounded-xl"
              style={{ backgroundColor: `${level?.color}20` }}
            >
              <Icon className="w-10 h-10" style={{ color: level?.color }} />
            </div>
            <div>
              <p className="text-sm font-bold text-zinc-500">{t('level')} {levelNum}</p>
              <h1 
                className="text-3xl font-black"
                style={{ color: level?.color }}
                data-testid="level-title"
              >
                {levelNames[language][parseInt(levelNum)]}
              </h1>
            </div>
          </motion.div>
        </div>
      </header>

      {/* Stages Grid */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-black text-zinc-900 mb-6">{t('stages')}</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stages.map((stage, index) => {
            const isLocked = !stage.is_unlocked;
            const isCompleted = stage.is_completed;
            
            return (
              <motion.div
                key={stage.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 * index }}
                onClick={() => !isLocked && navigate(`/play/${stage.id}`)}
                className={`
                  bg-white rounded-2xl p-6 border-2 transition-all text-center
                  ${isLocked 
                    ? 'border-zinc-200 opacity-60 cursor-not-allowed' 
                    : isCompleted
                      ? 'border-green-300 bg-green-50 cursor-pointer hover:shadow-md'
                      : 'border-zinc-200 hover:border-violet-300 hover:shadow-md cursor-pointer'
                  }
                `}
                data-testid={`stage-card-${stage.stage_num}`}
              >
                <div className={`
                  w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4
                  ${isLocked 
                    ? 'bg-zinc-100' 
                    : isCompleted 
                      ? 'bg-green-500' 
                      : 'bg-gradient-to-br from-violet-500 to-pink-500'
                  }
                `}>
                  {isLocked ? (
                    <Lock className="w-8 h-8 text-zinc-400" />
                  ) : isCompleted ? (
                    <CheckCircle className="w-8 h-8 text-white" />
                  ) : (
                    <Play className="w-8 h-8 text-white ml-1" />
                  )}
                </div>
                
                <h3 className="text-xl font-black text-zinc-900 mb-2">
                  {language === 'zh' ? stage.name_zh : stage.name_en}
                </h3>
                
                <div className="flex items-center justify-center gap-2 text-sm text-zinc-500">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span>{stage.points_reward} {t('points')}</span>
                </div>
                
                {isCompleted && (
                  <span className="inline-block mt-3 px-3 py-1 bg-green-100 text-green-700 text-sm font-bold rounded-full">
                    {t('completed')}
                  </span>
                )}
                
                {!isLocked && !isCompleted && (
                  <button className="mt-4 w-full bg-violet-500 text-white font-bold py-2 px-4 rounded-xl hover:bg-violet-600 transition-colors">
                    {t('start_stage')}
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

export default LevelPage;
