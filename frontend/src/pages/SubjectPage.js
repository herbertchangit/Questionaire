import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useLanguage } from '../context/LanguageContext';
import { 
  ArrowLeft, Lock, CheckCircle, Flame, Target, Mountain, 
  Hammer, Rocket, Star, ChevronRight
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
  en: {
    1: 'Determination',
    2: 'Discipline', 
    3: 'Perseverance',
    4: 'Hard-working',
    5: 'Breakthrough'
  },
  zh: {
    1: '决心',
    2: '自律',
    3: '毅力',
    4: '勤劳',
    5: '突破'
  }
};

function SubjectPage() {
  const { subjectId } = useParams();
  const [subject, setSubject] = useState(null);
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { language, t } = useLanguage();

  useEffect(() => {
    fetchData();
  }, [subjectId]);

  const fetchData = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await axios.get(
        `${API_URL}/api/subjects/${subjectId}/levels`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSubject(response.data.subject);
      setLevels(response.data.levels);
    } catch (error) {
      toast.error('Failed to load data');
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-pink-50" data-testid="subject-page">
      {/* Header */}
      <header 
        className="py-8 px-4"
        style={{ backgroundColor: `${subject?.color}15` }}
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
          >
            <h1 
              className="text-4xl font-black mb-2"
              style={{ color: subject?.color }}
              data-testid="subject-title"
            >
              {language === 'zh' ? subject?.name_zh : subject?.name_en}
            </h1>
            <p className="text-zinc-600">
              {language === 'zh' ? subject?.description_zh : subject?.description_en}
            </p>
          </motion.div>
        </div>
      </header>

      {/* Levels Grid */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-black text-zinc-900 mb-6">{t('levels')}</h2>
        
        <div className="space-y-4">
          {levels.map((level, index) => {
            const Icon = levelIcons[level.icon] || Flame;
            const isLocked = !level.is_unlocked;
            
            return (
              <motion.div
                key={level.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
                onClick={() => !isLocked && navigate(`/subject/${subjectId}/level/${level.level_num}`)}
                className={`
                  bg-white rounded-2xl p-5 border-2 transition-all
                  ${isLocked 
                    ? 'border-zinc-200 opacity-60 cursor-not-allowed' 
                    : 'border-zinc-200 hover:border-violet-300 hover:shadow-md cursor-pointer'
                  }
                `}
                data-testid={`level-card-${level.level_num}`}
              >
                <div className="flex items-center gap-4">
                  <div 
                    className={`p-4 rounded-xl ${isLocked ? 'bg-zinc-100' : ''}`}
                    style={{ backgroundColor: isLocked ? undefined : `${level.color}20` }}
                  >
                    {isLocked ? (
                      <Lock className="w-8 h-8 text-zinc-400" />
                    ) : (
                      <Icon className="w-8 h-8" style={{ color: level.color }} />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-zinc-400">
                        {t('level')} {level.level_num}
                      </span>
                      {level.stages_completed === 5 && (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                    <h3 className="text-xl font-black text-zinc-900">
                      {levelNames[language][level.level_num]}
                    </h3>
                    
                    {isLocked ? (
                      <p className="text-sm text-zinc-500 mt-1">
                        {t('unlock_at')} {level.unlock_points} {t('points')}
                      </p>
                    ) : (
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1 text-sm text-zinc-600">
                          <Star className="w-4 h-4 text-yellow-500" />
                          <span>{level.stages_completed}/5 {t('stages')}</span>
                        </div>
                        <div className="flex-1 h-2 bg-zinc-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all"
                            style={{ 
                              width: `${(level.stages_completed / 5) * 100}%`,
                              backgroundColor: level.color
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {!isLocked && (
                    <ChevronRight className="w-6 h-6 text-zinc-400" />
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

export default SubjectPage;
