import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useLanguage } from '../context/LanguageContext';
import { ArrowLeft, Trophy, Medal, Star } from 'lucide-react';

import { API_URL } from '../lib/api';

function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/leaderboard?limit=50`);
      setLeaderboard(response.data);
    } catch (error) {
      toast.error('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return <Trophy className="w-6 h-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />;
    if (rank === 3) return <Medal className="w-6 h-6 text-amber-600" />;
    return <span className="w-6 h-6 flex items-center justify-center font-bold text-zinc-500">{rank}</span>;
  };

  const getRankBg = (rank) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-300';
    if (rank === 2) return 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-300';
    if (rank === 3) return 'bg-gradient-to-r from-amber-50 to-amber-100 border-amber-300';
    return 'bg-white border-zinc-200';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 to-pink-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-violet-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-pink-50" data-testid="leaderboard-page">
      {/* Header */}
      <header className="bg-gradient-to-r from-yellow-400 to-orange-500 py-8 px-4">
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
            <Trophy className="w-12 h-12 text-white" />
            <div>
              <h1 className="text-3xl font-black text-white">{t('leaderboard')}</h1>
              <p className="text-white/80 font-medium">{t('global_ranking')}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Leaderboard List */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        {leaderboard.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">
            No data available yet
          </div>
        ) : (
          <div className="space-y-3">
            {leaderboard.map((user, index) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * index }}
                className={`rounded-xl p-4 border-2 ${getRankBg(user.rank)} flex items-center gap-4`}
                data-testid={`rank-${user.rank}`}
              >
                <div className="w-10 flex justify-center">
                  {getRankIcon(user.rank)}
                </div>
                
                <div className="flex-1">
                  <p className="font-bold text-zinc-900">{user.name}</p>
                  <p className="text-sm text-zinc-500">Level {user.level || 1}</p>
                </div>
                
                <div className="flex items-center gap-1 bg-violet-100 px-3 py-1 rounded-lg">
                  <Star className="w-4 h-4 text-violet-500" />
                  <span className="font-bold text-violet-700">{user.points || 0}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default Leaderboard;
