import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Trophy, Star, Clock, Home, TrendingUp } from 'lucide-react';

function ResultPage() {
  const navigate = useNavigate();
  const [result, setResult] = useState(null);

  useEffect(() => {
    const storedResult = localStorage.getItem('quiz_result');
    if (storedResult) {
      const parsedResult = JSON.parse(storedResult);
      setResult(parsedResult);
      
      if (parsedResult.level_up) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#8B5CF6', '#FF4785', '#FACC15']
        });
      }
    } else {
      navigate('/dashboard');
    }
  }, [navigate]);

  if (!result) return null;

  const percentage = (result.correct_count / result.result.total_questions) * 100;

  return (
    <div className="min-h-screen p-4 md:p-8 flex items-center justify-center" data-testid="result-page">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        <div className="bg-white neo-border neo-shadow-deep rounded-2xl p-8 md:p-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400 rounded-full blur-3xl opacity-20"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-500 rounded-full blur-3xl opacity-20"></div>
          
          <div className="relative z-10">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring' }}
              className="flex justify-center mb-8"
            >
              <div className="bg-gradient-to-br from-yellow-400 to-yellow-500 neo-border neo-shadow-deep p-8 rounded-full">
                <Trophy className="w-20 h-20 text-zinc-950" data-testid="trophy-icon" />
              </div>
            </motion.div>

            <h1 className="text-4xl md:text-6xl font-black text-center mb-4 text-zinc-950" data-testid="result-title">
              Quiz Complete!
            </h1>

            {result.level_up && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-gradient-to-r from-violet-500 to-pink-500 neo-border neo-shadow rounded-2xl p-6 mb-8 text-center"
                data-testid="level-up-banner"
              >
                <div className="flex items-center justify-center gap-3 mb-2">
                  <TrendingUp className="w-8 h-8 text-white" />
                  <p className="text-3xl font-black text-white">LEVEL UP!</p>
                </div>
                <p className="text-white font-bold text-xl">
                  You're now Level {result.new_level}! 🎉
                </p>
              </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-violet-50 neo-border rounded-2xl p-6 text-center"
                data-testid="score-card"
              >
                <Star className="w-8 h-8 text-violet-500 mx-auto mb-2" />
                <p className="text-sm font-bold uppercase tracking-widest text-zinc-600 mb-1">Score</p>
                <p className="text-4xl font-black text-zinc-950">{result.result.score}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="bg-pink-50 neo-border rounded-2xl p-6 text-center"
                data-testid="accuracy-card"
              >
                <Trophy className="w-8 h-8 text-pink-500 mx-auto mb-2" />
                <p className="text-sm font-bold uppercase tracking-widest text-zinc-600 mb-1">Accuracy</p>
                <p className="text-4xl font-black text-zinc-950">{Math.round(percentage)}%</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="bg-yellow-50 neo-border rounded-2xl p-6 text-center"
                data-testid="time-card"
              >
                <Clock className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                <p className="text-sm font-bold uppercase tracking-widest text-zinc-600 mb-1">Time</p>
                <p className="text-4xl font-black text-zinc-950">
                  {Math.floor(result.result.time_taken / 60)}:{(result.result.time_taken % 60).toString().padStart(2, '0')}
                </p>
              </motion.div>
            </div>

            <div className="bg-zinc-50 neo-border rounded-2xl p-6 mb-8 text-center">
              <p className="text-2xl font-black text-zinc-950 mb-2">
                You got {result.correct_count} out of {result.result.total_questions} questions correct!
              </p>
              <p className="text-zinc-600 font-bold">
                {percentage >= 80 ? 'Excellent work! 🌟' : percentage >= 60 ? 'Good job! Keep it up! 🚀' : 'Keep practicing! You\'ll get there! 💪'}
              </p>
            </div>

            <button
              onClick={() => {
                localStorage.removeItem('quiz_result');
                navigate('/dashboard');
              }}
              className="w-full bg-violet-500 text-white font-black text-lg py-4 rounded-xl neo-border neo-shadow hover:translate-y-1 hover:shadow-none uppercase flex items-center justify-center gap-2"
              data-testid="back-to-dashboard-button"
            >
              <Home className="w-6 h-6" />
              Back to Dashboard
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default ResultPage;