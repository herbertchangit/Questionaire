import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { 
  ArrowLeft, Users, TrendingUp, Target, BarChart3, 
  Calendar, Award, Activity, RefreshCw 
} from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';

import { API_URL } from '../../lib/api';

function Analytics() {
  const [summary, setSummary] = useState(null);
  const [detailed, setDetailed] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    const token = localStorage.getItem('token');
    try {
      const [summaryRes, detailedRes] = await Promise.all([
        axios.get(`${API_URL}/api/admin/analytics/summary`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/api/admin/analytics/detailed`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setSummary(summaryRes.data);
      setDetailed(detailedRes.data);
    } catch (error) {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-violet-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8" data-testid="analytics-page">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-violet-500 to-pink-500 neo-border neo-shadow-deep rounded-2xl p-6 md:p-8 mb-8"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-white neo-border neo-shadow p-4 rounded-2xl">
                <BarChart3 className="w-10 h-10 text-violet-500" />
              </div>
              <div>
                <h1 className="text-3xl md:text-5xl font-black text-white" data-testid="analytics-title">
                  Analytics Dashboard
                </h1>
                <p className="text-white/80 font-bold">Track your app's performance</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="bg-white text-zinc-950 font-bold px-6 py-3 rounded-xl neo-border neo-shadow hover:translate-y-1 hover:shadow-none flex items-center gap-2 disabled:opacity-50"
                data-testid="refresh-button"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="bg-white text-zinc-950 font-bold px-6 py-3 rounded-xl neo-border neo-shadow hover:translate-y-1 hover:shadow-none flex items-center gap-2"
                data-testid="back-button"
              >
                <ArrowLeft className="w-5 h-5" />
                Back
              </button>
            </div>
          </div>
        </motion.div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white neo-border neo-shadow rounded-2xl p-6"
            data-testid="dau-card"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-violet-500 neo-border p-3 rounded-xl">
                <Users className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-bold uppercase tracking-widest text-zinc-600">DAU</span>
            </div>
            <p className="text-4xl font-black text-zinc-950">{summary?.dau || 0}</p>
            <p className="text-sm text-zinc-500 mt-1">of {summary?.total_users || 0} total users</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white neo-border neo-shadow rounded-2xl p-6"
            data-testid="completion-rate-card"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-green-500 neo-border p-3 rounded-xl">
                <Target className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-bold uppercase tracking-widest text-zinc-600">Completion</span>
            </div>
            <p className="text-4xl font-black text-zinc-950">{summary?.completion_rate || 0}%</p>
            <p className="text-sm text-zinc-500 mt-1">quiz completion rate</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white neo-border neo-shadow rounded-2xl p-6"
            data-testid="avg-score-card"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-yellow-400 neo-border p-3 rounded-xl">
                <Award className="w-6 h-6 text-zinc-950" />
              </div>
              <span className="text-sm font-bold uppercase tracking-widest text-zinc-600">Avg Score</span>
            </div>
            <p className="text-4xl font-black text-zinc-950">{summary?.avg_score || 0}</p>
            <p className="text-sm text-zinc-500 mt-1">points per quiz</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white neo-border neo-shadow rounded-2xl p-6"
            data-testid="retention-card"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-pink-500 neo-border p-3 rounded-xl">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-bold uppercase tracking-widest text-zinc-600">7-Day Retention</span>
            </div>
            <p className="text-4xl font-black text-zinc-950">{summary?.retention_7d || 0}%</p>
            <p className="text-sm text-zinc-500 mt-1">users returning</p>
          </motion.div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* DAU Trend Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white neo-border neo-shadow rounded-2xl p-6"
            data-testid="dau-chart"
          >
            <h3 className="text-xl font-black text-zinc-950 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-violet-500" />
              Daily Active Users (14 days)
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={detailed?.dau_trend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#71717a" />
                <YAxis tick={{ fontSize: 12 }} stroke="#71717a" />
                <Tooltip 
                  contentStyle={{ 
                    background: '#fff', 
                    border: '2px solid #18181b',
                    borderRadius: '8px',
                    fontWeight: 'bold'
                  }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="users" 
                  stroke="#8b5cf6" 
                  strokeWidth={3}
                  dot={{ fill: '#8b5cf6', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Quiz Completions Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white neo-border neo-shadow rounded-2xl p-6"
            data-testid="completions-chart"
          >
            <h3 className="text-xl font-black text-zinc-950 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-green-500" />
              Quiz Completions (14 days)
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={detailed?.completion_trend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#71717a" />
                <YAxis tick={{ fontSize: 12 }} stroke="#71717a" />
                <Tooltip 
                  contentStyle={{ 
                    background: '#fff', 
                    border: '2px solid #18181b',
                    borderRadius: '8px',
                    fontWeight: 'bold'
                  }} 
                />
                <Bar dataKey="completions" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Score Trend Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-white neo-border neo-shadow rounded-2xl p-6"
            data-testid="score-chart"
          >
            <h3 className="text-xl font-black text-zinc-950 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-yellow-500" />
              Average Score Trend (14 days)
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={detailed?.score_trend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#71717a" />
                <YAxis tick={{ fontSize: 12 }} stroke="#71717a" />
                <Tooltip 
                  contentStyle={{ 
                    background: '#fff', 
                    border: '2px solid #18181b',
                    borderRadius: '8px',
                    fontWeight: 'bold'
                  }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="avgScore" 
                  stroke="#eab308" 
                  strokeWidth={3}
                  dot={{ fill: '#eab308', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Category Performance */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-white neo-border neo-shadow rounded-2xl p-6"
            data-testid="category-chart"
          >
            <h3 className="text-xl font-black text-zinc-950 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-pink-500" />
              Performance by Category
            </h3>
            {detailed?.category_performance?.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={detailed.category_performance} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="#71717a" />
                  <YAxis dataKey="category" type="category" tick={{ fontSize: 12 }} stroke="#71717a" width={100} />
                  <Tooltip 
                    contentStyle={{ 
                      background: '#fff', 
                      border: '2px solid #18181b',
                      borderRadius: '8px',
                      fontWeight: 'bold'
                    }} 
                  />
                  <Legend />
                  <Bar dataKey="avgScore" name="Avg Score" fill="#ec4899" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="attempts" name="Attempts" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-zinc-500 font-bold">
                No category data available yet
              </div>
            )}
          </motion.div>
        </div>

        {/* Retention & Improvement Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="bg-white neo-border neo-shadow rounded-2xl p-6"
          data-testid="retention-section"
        >
          <h3 className="text-xl font-black text-zinc-950 mb-6 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-violet-500" />
            Retention & Improvement Metrics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-violet-50 neo-border rounded-xl p-4 text-center">
              <p className="text-sm font-bold text-violet-600 uppercase mb-2">3-Day Retention</p>
              <p className="text-4xl font-black text-violet-700">{detailed?.retention?.day3 || 0}%</p>
            </div>
            <div className="bg-pink-50 neo-border rounded-xl p-4 text-center">
              <p className="text-sm font-bold text-pink-600 uppercase mb-2">7-Day Retention</p>
              <p className="text-4xl font-black text-pink-700">{detailed?.retention?.day7 || 0}%</p>
            </div>
            <div className="bg-green-50 neo-border rounded-xl p-4 text-center">
              <p className="text-sm font-bold text-green-600 uppercase mb-2">Avg Score Improvement</p>
              <p className="text-4xl font-black text-green-700">
                {detailed?.avg_improvement > 0 ? '+' : ''}{detailed?.avg_improvement || 0}
              </p>
              <p className="text-xs text-green-600 mt-1">points (first vs last quiz)</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default Analytics;
