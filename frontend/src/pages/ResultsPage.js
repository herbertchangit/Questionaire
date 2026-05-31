import React, { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { Trophy, Star, Clock, CheckCircle, XCircle, ArrowRight, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';
import LevelUpModal from '../components/LevelUpModal';

function ResultsPage() {
  const { stageId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const { result, stage } = location.state || {};
  const [showLevelUp, setShowLevelUp] = useState(Boolean(result?.level_up_info));

  React.useEffect(() => {
    if (result?.score === result?.total) {
      // Perfect score celebration
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [result]);

  if (!result) {
    navigate('/dashboard');
    return null;
  }

  const percentage = Math.round((result.score / result.total) * 100);
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-pink-50 py-8 px-4" data-testid="results-page">
      <LevelUpModal
        levelUpInfo={result.level_up_info}
        open={showLevelUp}
        onClose={() => setShowLevelUp(false)}
        language={language}
      />

      <div className="max-w-2xl mx-auto">
        {/* Level Up Banner (compact, persists after modal closed) */}
        {result.level_up_info && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setShowLevelUp(true)}
            className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl p-4 mb-6 text-center text-white cursor-pointer hover:scale-[1.01] transition-transform"
            data-testid="level-up-banner"
          >
            <Trophy className="w-8 h-8 mx-auto mb-1" />
            <h2 className="text-lg font-black">{t('level_up')}</h2>
            <p className="text-sm font-bold opacity-90">
              {language === 'zh' ? '点击查看奖励' : 'Tap to view rewards'}
            </p>
          </motion.div>
        )}

        {/* Main Result Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl p-8 border-2 border-zinc-200 shadow-lg text-center mb-6"
        >
          <div className={`
            w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6
            ${percentage >= 80 
              ? 'bg-gradient-to-br from-green-400 to-green-600' 
              : percentage >= 50 
                ? 'bg-gradient-to-br from-yellow-400 to-orange-500'
                : 'bg-gradient-to-br from-red-400 to-red-600'
            }
          `}>
            {percentage >= 80 ? (
              <Trophy className="w-12 h-12 text-white" />
            ) : percentage >= 50 ? (
              <Star className="w-12 h-12 text-white" />
            ) : (
              <RotateCcw className="w-12 h-12 text-white" />
            )}
          </div>

          <h1 className="text-3xl font-black text-zinc-900 mb-2">
            {percentage >= 80 
              ? (language === 'zh' ? '太棒了!' : 'Excellent!') 
              : percentage >= 50 
                ? (language === 'zh' ? '做得好!' : 'Good Job!')
                : (language === 'zh' ? '继续努力!' : 'Keep Trying!')
            }
          </h1>

          <p className="text-zinc-600 mb-8">
            {language === 'zh' 
              ? `你完成了 ${stage?.name_zh || 'Stage'}` 
              : `You completed ${stage?.name_en || 'Stage'}`
            }
          </p>

          {/* Score Display */}
          <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-pink-600 mb-2">
            {percentage}%
          </div>
          <p className="text-zinc-500 font-medium mb-8">
            {result.score} / {result.total} {t('correct_answers')}
          </p>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-violet-50 rounded-xl p-4">
              <Star className="w-6 h-6 text-violet-500 mx-auto mb-2" />
              <p className="text-2xl font-black text-violet-700">{result.points_earned}</p>
              <p className="text-xs text-violet-600 font-medium">{t('points_earned')}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4">
              <Clock className="w-6 h-6 text-blue-500 mx-auto mb-2" />
              <p className="text-2xl font-black text-blue-700">{formatTime(result.time_spent)}</p>
              <p className="text-xs text-blue-600 font-medium">{t('time_taken')}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4">
              <Trophy className="w-6 h-6 text-green-500 mx-auto mb-2" />
              <p className="text-2xl font-black text-green-700">{result.new_total_points}</p>
              <p className="text-xs text-green-600 font-medium">{t('total_points')}</p>
            </div>
          </div>

          {/* Answer Summary */}
          <div className="text-left bg-zinc-50 rounded-xl p-4 mb-6">
            <h3 className="font-bold text-zinc-700 mb-3">{t('results')}</h3>
            <div className="flex flex-wrap gap-2">
              {result.results?.map((r, i) => (
                <div
                  key={i}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    r.is_correct ? 'bg-green-100' : 'bg-red-100'
                  }`}
                >
                  {r.is_correct ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => navigate(`/play/${stageId}`)}
            className="flex-1 bg-white border-2 border-zinc-200 text-zinc-700 font-bold py-4 px-6 rounded-xl hover:bg-zinc-50 transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            {t('try_again')}
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex-1 bg-gradient-to-r from-violet-500 to-pink-500 text-white font-bold py-4 px-6 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            {t('dashboard')}
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default ResultsPage;
