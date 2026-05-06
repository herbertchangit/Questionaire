import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useLanguage } from '../context/LanguageContext';
import { Clock, ChevronRight, CheckCircle } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

function PlayPage() {
  const { stageId } = useParams();
  const [stage, setStage] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [startTime] = useState(Date.now());
  const navigate = useNavigate();
  const { language, t } = useLanguage();

  useEffect(() => {
    fetchQuiz();
  }, [stageId]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const fetchQuiz = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await axios.get(
        `${API_URL}/api/stages/${stageId}/play`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStage(response.data.stage);
      setQuestions(response.data.questions);
      setTimeLeft(response.data.time_limit);
    } catch (error) {
      toast.error('Failed to load quiz');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (questionId, answerIndex) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answerIndex
    }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);

    const token = localStorage.getItem('token');
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);

    try {
      const response = await axios.post(
        `${API_URL}/api/stages/${stageId}/submit`,
        { answers, time_spent: timeSpent },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      navigate(`/results/${stageId}`, { 
        state: { 
          result: response.data,
          stage: stage
        } 
      });
    } catch (error) {
      toast.error('Failed to submit quiz');
      setSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 to-pink-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-violet-500"></div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const isAnswered = answers[currentQuestion?.id] !== undefined;
  const allAnswered = questions.every(q => answers[q.id] !== undefined);

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-pink-50" data-testid="play-page">
      {/* Header with Timer */}
      <header className="bg-white/80 backdrop-blur-md border-b-2 border-zinc-200 py-4 px-4 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <span className="text-sm font-bold text-zinc-500">{t('question')}</span>
            <span className="text-2xl font-black text-zinc-900 ml-2">
              {currentIndex + 1} / {questions.length}
            </span>
          </div>
          
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold ${
            timeLeft < 30 ? 'bg-red-100 text-red-600' : 'bg-violet-100 text-violet-600'
          }`}>
            <Clock className="w-5 h-5" />
            <span data-testid="timer">{formatTime(timeLeft)}</span>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="h-1 bg-zinc-200">
        <div 
          className="h-full bg-violet-500 transition-all"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="bg-white rounded-2xl p-6 border-2 border-zinc-200 shadow-sm mb-6">
              <h2 className="text-xl md:text-2xl font-bold text-zinc-900 mb-4" data-testid="question-text">
                {language === 'zh' ? currentQuestion?.text_zh : currentQuestion?.text_en}
              </h2>

              {/* Attached media */}
              {currentQuestion?.image && (
                <img
                  src={currentQuestion.image}
                  alt=""
                  className="w-full max-h-72 object-contain rounded-xl bg-zinc-50 mb-4"
                  data-testid="question-image"
                />
              )}
              {currentQuestion?.audio && (
                <audio
                  controls
                  src={currentQuestion.audio}
                  className="w-full mb-4"
                  data-testid="question-audio"
                />
              )}

              <div className="space-y-3">
                {(language === 'zh' ? currentQuestion?.options_zh : currentQuestion?.options_en)?.map((option, index) => {
                  const isSelected = answers[currentQuestion?.id] === index;
                  
                  return (
                    <button
                      key={index}
                      onClick={() => handleAnswer(currentQuestion.id, index)}
                      className={`
                        w-full p-4 rounded-xl border-2 text-left font-medium transition-all
                        ${isSelected 
                          ? 'border-violet-500 bg-violet-50 text-violet-700' 
                          : 'border-zinc-200 hover:border-violet-300 hover:bg-violet-50/50'
                        }
                      `}
                      data-testid={`option-${index}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`
                          w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                          ${isSelected 
                            ? 'bg-violet-500 text-white' 
                            : 'bg-zinc-100 text-zinc-600'
                          }
                        `}>
                          {String.fromCharCode(65 + index)}
                        </div>
                        <span>{option}</span>
                        {isSelected && <CheckCircle className="w-5 h-5 text-violet-500 ml-auto" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="px-6 py-3 rounded-xl font-bold text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('back')}
          </button>

          {/* Question dots */}
          <div className="flex gap-2">
            {questions.map((q, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`
                  w-3 h-3 rounded-full transition-all
                  ${i === currentIndex 
                    ? 'bg-violet-500 scale-125' 
                    : answers[q.id] !== undefined 
                      ? 'bg-green-500' 
                      : 'bg-zinc-300'
                  }
                `}
              />
            ))}
          </div>

          {currentIndex === questions.length - 1 ? (
            <button
              onClick={handleSubmit}
              disabled={!allAnswered || submitting}
              className="px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-violet-500 to-pink-500 text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              data-testid="submit-btn"
            >
              {submitting ? t('loading') : t('submit_answers')}
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-6 py-3 rounded-xl font-bold bg-violet-500 text-white hover:bg-violet-600 flex items-center gap-2"
            >
              {t('next')}
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

export default PlayPage;
