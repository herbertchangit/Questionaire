import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useLanguage } from '../context/LanguageContext';
import { ArrowLeft, Lock, CheckCircle, Play, Star } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

function LevelPage() {
  const { subjectId, levelNum } = useParams();
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { language, t } = useLanguage();

  useEffect(() => {
    fetchStages();
  }, [subjectId, levelNum]);

  const fetchStages = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await axios.get(
        `${API_URL}/api/subjects/${subjectId}/levels/${levelNum}/stages`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStages(response.data);
    } catch (error) {
      toast.error('Failed to load stages');
      navigate(`/subject/${subjectId}`);
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
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-pink-50" data-testid="level-page">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b-2 border-zinc-200 py-6 px-4">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate(`/subject/${subjectId}`)}
            className="flex items-center gap-2 text-zinc-600 hover:text-zinc-900 mb-4 font-medium"
            data-testid="back-btn"
          >
            <ArrowLeft className="w-5 h-5" />
            {t('back')}
          </button>
          
          <h1 className="text-3xl font-black text-zinc-900" data-testid="level-title">
            {t('level')} {levelNum} - {t('stages')}
          </h1>
        </div>
      </header>

      {/* Stages Grid */}
      <main className="max-w-4xl mx-auto px-4 py-8">
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
