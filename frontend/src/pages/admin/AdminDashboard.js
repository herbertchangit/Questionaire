import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Crown, Plus, Trash2, ArrowLeft, FileQuestion, Users, BarChart3, TrendingUp, Target, Activity } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

function AdminDashboard() {
  const [quizzes, setQuizzes] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = localStorage.getItem('token');
    try {
      const [quizzesRes, analyticsRes] = await Promise.all([
        axios.get(`${API_URL}/api/admin/quizzes`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/api/admin/analytics/summary`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setQuizzes(quizzesRes.data);
      setAnalytics(analyticsRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (quizId) => {
    if (!window.confirm('Are you sure you want to delete this quiz?')) return;

    const token = localStorage.getItem('token');
    try {
      await axios.delete(`${API_URL}/api/admin/quizzes/${quizId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Quiz deleted successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete quiz');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-violet-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8" data-testid="admin-dashboard">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-yellow-400 to-yellow-500 neo-border neo-shadow-deep rounded-2xl p-6 md:p-8 mb-8"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-zinc-950 neo-border neo-shadow p-4 rounded-2xl">
                <Crown className="w-10 h-10 text-yellow-400" data-testid="admin-crown-icon" />
              </div>
              <div>
                <h1 className="text-3xl md:text-5xl font-black text-zinc-950" data-testid="admin-title">
                  Admin Panel
                </h1>
                <p className="text-zinc-950 font-bold">Manage quizzes and questions</p>
              </div>
            </div>
            
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-white text-zinc-950 font-bold px-6 py-3 rounded-xl neo-border neo-shadow hover:translate-y-1 hover:shadow-none flex items-center gap-2"
              data-testid="back-to-user-button"
            >
              <ArrowLeft className="w-5 h-5" />
              User View
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white neo-border neo-shadow rounded-2xl p-6 mb-8"
        >
          <div className="flex flex-col md:flex-row gap-4">
            <button
              onClick={() => navigate('/admin/quiz/create')}
              className="flex-1 bg-violet-500 text-white font-black px-8 py-4 rounded-xl neo-border neo-shadow hover:translate-y-1 hover:shadow-none flex items-center justify-center gap-2 uppercase"
              data-testid="create-quiz-button"
            >
              <Plus className="w-6 h-6" />
              Create New Quiz
            </button>
            <button
              onClick={() => navigate('/admin/users')}
              className="flex-1 bg-pink-500 text-white font-black px-8 py-4 rounded-xl neo-border neo-shadow hover:translate-y-1 hover:shadow-none flex items-center justify-center gap-2 uppercase"
              data-testid="manage-users-button"
            >
              <Users className="w-6 h-6" />
              Manage Users
            </button>
            <button
              onClick={() => navigate('/admin/analytics')}
              className="flex-1 bg-gradient-to-r from-violet-500 to-pink-500 text-white font-black px-8 py-4 rounded-xl neo-border neo-shadow hover:translate-y-1 hover:shadow-none flex items-center justify-center gap-2 uppercase"
              data-testid="analytics-button"
            >
              <BarChart3 className="w-6 h-6" />
              Analytics
            </button>
          </div>
        </motion.div>

        {/* Quick Stats */}
        {analytics && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
          >
            <div className="bg-white neo-border neo-shadow rounded-xl p-4" data-testid="quick-dau">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-violet-500" />
                <span className="text-xs font-bold text-zinc-500 uppercase">DAU</span>
              </div>
              <p className="text-3xl font-black text-zinc-950">{analytics.dau}</p>
            </div>
            <div className="bg-white neo-border neo-shadow rounded-xl p-4" data-testid="quick-completion">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5 text-green-500" />
                <span className="text-xs font-bold text-zinc-500 uppercase">Completion</span>
              </div>
              <p className="text-3xl font-black text-zinc-950">{analytics.completion_rate}%</p>
            </div>
            <div className="bg-white neo-border neo-shadow rounded-xl p-4" data-testid="quick-score">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-5 h-5 text-yellow-500" />
                <span className="text-xs font-bold text-zinc-500 uppercase">Avg Score</span>
              </div>
              <p className="text-3xl font-black text-zinc-950">{analytics.avg_score}</p>
            </div>
            <div className="bg-white neo-border neo-shadow rounded-xl p-4" data-testid="quick-retention">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-5 h-5 text-pink-500" />
                <span className="text-xs font-bold text-zinc-500 uppercase">7d Retention</span>
              </div>
              <p className="text-3xl font-black text-zinc-950">{analytics.retention_7d}%</p>
            </div>
          </motion.div>
        )}

        <div>
          <h2 className="text-3xl font-black text-zinc-950 mb-6">All Quizzes</h2>
          
          {quizzes.length === 0 ? (
            <div className="bg-white neo-border neo-shadow rounded-2xl p-12 text-center">
              <p className="text-xl font-bold text-zinc-600">No quizzes created yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {quizzes.map((quiz, index) => (
                <motion.div
                  key={quiz.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className="bg-white neo-border neo-shadow rounded-2xl p-6 hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(24,24,27,1)]"
                  data-testid={`admin-quiz-card-${quiz.id}`}
                >
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="inline-block bg-violet-100 text-violet-700 text-xs font-bold px-3 py-1 rounded-full neo-border">
                          {quiz.category}
                        </span>
                        <span className="text-sm font-bold text-zinc-600">
                          Level {quiz.level_required}
                        </span>
                      </div>
                      <h3 className="text-2xl font-black text-zinc-950 mb-1">{quiz.title}</h3>
                      <p className="text-zinc-600 font-medium mb-2">{quiz.description}</p>
                      <p className="text-sm font-bold text-zinc-500">
                        {quiz.questions_count} questions • {quiz.duration_minutes} minutes
                      </p>
                      <p className="text-xs font-medium text-zinc-400 mt-1" data-testid={`admin-quiz-date-${quiz.id}`}>
                        📅 Created: {new Date(quiz.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    
                    <div className="flex gap-3">
                      <button
                        onClick={() => navigate(`/admin/quiz/${quiz.id}/questions`)}
                        className="bg-violet-500 text-white font-bold px-6 py-3 rounded-xl neo-border neo-shadow hover:translate-y-1 hover:shadow-none flex items-center gap-2"
                        data-testid={`manage-questions-button-${quiz.id}`}
                      >
                        <FileQuestion className="w-5 h-5" />
                        Questions
                      </button>
                      <button
                        onClick={() => handleDelete(quiz.id)}
                        className="bg-red-500 text-white font-bold px-6 py-3 rounded-xl neo-border neo-shadow hover:translate-y-1 hover:shadow-none flex items-center gap-2"
                        data-testid={`delete-quiz-button-${quiz.id}`}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;