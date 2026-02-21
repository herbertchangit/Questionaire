import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Zap, Trophy, Star, LogOut, Crown, Play, Lock, CheckCircle } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

function Dashboard() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = localStorage.getItem('token');
    try {
      const [userRes, statsRes, quizzesRes] = await Promise.all([
        axios.get(`${API_URL}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/users/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/quizzes`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      setUser(userRes.data);
      setStats(statsRes.data);
      setQuizzes(quizzesRes.data);
    } catch (error) {
      toast.error('Failed to load data');
      if (error.response?.status === 401) {
        localStorage.clear();
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    toast.success('Logged out successfully');
    setTimeout(() => {
      window.location.href = '/login';
    }, 500);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-violet-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8" data-testid="user-dashboard">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white neo-border neo-shadow-deep rounded-2xl p-6 md:p-8 mb-8 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500 rounded-full blur-3xl opacity-10"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-gradient-to-br from-violet-500 to-pink-500 neo-border neo-shadow p-3 rounded-xl">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-black text-zinc-950" data-testid="user-name">
                    Hey, {user?.name}! 👋
                  </h1>
                  <p className="text-zinc-600 font-bold">Ready for more challenges?</p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              {user?.role === 'admin' && (
                <button
                  onClick={() => navigate('/admin')}
                  className="bg-yellow-400 text-zinc-950 font-bold px-6 py-3 rounded-xl neo-border neo-shadow hover:translate-y-1 hover:shadow-none flex items-center gap-2"
                  data-testid="admin-panel-button"
                >
                  <Crown className="w-5 h-5" />
                  Admin Panel
                </button>
              )}
              <button
                onClick={handleLogout}
                className="bg-white text-zinc-950 font-bold px-6 py-3 rounded-xl neo-border neo-shadow hover:translate-y-1 hover:shadow-none flex items-center gap-2"
                data-testid="logout-button"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white neo-border neo-shadow rounded-2xl p-6 relative overflow-hidden"
            data-testid="level-card"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500 rounded-full blur-2xl opacity-20"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-violet-500 neo-border p-3 rounded-xl">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <span className="text-sm font-bold uppercase tracking-widest text-zinc-600">Level</span>
              </div>
              <p className="text-5xl font-black text-zinc-950">{stats?.level || 1}</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white neo-border neo-shadow rounded-2xl p-6 relative overflow-hidden"
            data-testid="points-card"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400 rounded-full blur-2xl opacity-20"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-yellow-400 neo-border p-3 rounded-xl">
                  <Star className="w-6 h-6 text-zinc-950" />
                </div>
                <span className="text-sm font-bold uppercase tracking-widest text-zinc-600">Points</span>
              </div>
              <p className="text-5xl font-black text-zinc-950">{stats?.points || 0}</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white neo-border neo-shadow rounded-2xl p-6 relative overflow-hidden"
            data-testid="progress-card"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500 rounded-full blur-2xl opacity-20"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-pink-500 neo-border p-3 rounded-xl">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <span className="text-sm font-bold uppercase tracking-widest text-zinc-600">Completed</span>
              </div>
              <p className="text-5xl font-black text-zinc-950">{stats?.completed_quizzes || 0}<span className="text-2xl text-zinc-400">/{stats?.total_quizzes || 0}</span></p>
            </div>
          </motion.div>
        </div>

        <div>
          <h2 className="text-3xl md:text-4xl font-black text-zinc-950 mb-6">Available Quizzes</h2>
          
          {quizzes.length === 0 ? (
            <div className="bg-white neo-border neo-shadow rounded-2xl p-12 text-center">
              <p className="text-xl font-bold text-zinc-600">No quizzes available yet. Check back soon!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {quizzes.map((quiz, index) => (
                <motion.div
                  key={quiz.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className="bg-white neo-border neo-shadow rounded-2xl p-6 hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(24,24,27,1)] cursor-pointer group"
                  onClick={() => !quiz.completed && navigate(`/quiz/${quiz.id}`)}
                  data-testid={`quiz-card-${quiz.id}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <span className="inline-block bg-violet-100 text-violet-700 text-xs font-bold px-3 py-1 rounded-full neo-border mb-3">
                        {quiz.category}
                      </span>
                      <h3 className="text-2xl font-black text-zinc-950 mb-2 group-hover:text-violet-500">
                        {quiz.title}
                      </h3>
                      <p className="text-zinc-600 font-medium mb-4">{quiz.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mb-4 text-sm font-bold text-zinc-600">
                    <span>📊 Level {quiz.level_required}</span>
                    <span>⏱️ {quiz.duration_minutes} min</span>
                    <span>📝 {quiz.questions_count} Qs</span>
                  </div>

                  {quiz.completed ? (
                    <div className="bg-green-100 neo-border text-green-700 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      Completed
                    </div>
                  ) : quiz.level_required > (user?.level || 1) ? (
                    <div className="bg-zinc-100 neo-border text-zinc-500 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 cursor-not-allowed">
                      <Lock className="w-5 h-5" />
                      Locked (Reach Level {quiz.level_required})
                    </div>
                  ) : (
                    <button
                      className="w-full bg-violet-500 text-white font-black py-3 px-4 rounded-xl neo-border neo-shadow hover:translate-y-1 hover:shadow-none flex items-center justify-center gap-2 uppercase"
                      data-testid={`start-quiz-button-${quiz.id}`}
                    >
                      <Play className="w-5 h-5" />
                      Start Quiz
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;