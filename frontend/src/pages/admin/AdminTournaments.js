import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useLanguage } from '../../context/LanguageContext';
import { ArrowLeft, Trophy, Plus, Trash2, Calendar, Clock } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

function AdminTournaments() {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title_en: '',
    title_zh: '',
    level_num: 1,
    scheduled_at: '',
    time_per_question: 15,
    total_time_limit: 600,
    max_players: 20
  });

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    const token = localStorage.getItem('token');
    try {
      const r = await axios.get(`${API_URL}/api/live/tournaments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTournaments(r.data);
    } catch (e) {
      toast.error('Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const createTournament = async () => {
    const token = localStorage.getItem('token');
    if (!form.title_en || !form.title_zh || !form.scheduled_at) {
      toast.error(language === 'zh' ? '请填写所有字段' : 'Fill all fields');
      return;
    }
    try {
      const iso = new Date(form.scheduled_at).toISOString();
      await axios.post(
        `${API_URL}/api/live/admin/tournaments`,
        { ...form, scheduled_at: iso },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(language === 'zh' ? '锦标赛已创建' : 'Tournament created');
      setShowForm(false);
      setForm({ title_en: '', title_zh: '', level_num: 1, scheduled_at: '', time_per_question: 15, total_time_limit: 600, max_players: 20 });
      fetchTournaments();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    }
  };

  const deleteTournament = async (id) => {
    const token = localStorage.getItem('token');
    if (!window.confirm(language === 'zh' ? '确定删除?' : 'Delete this tournament?')) return;
    try {
      await axios.delete(`${API_URL}/api/live/admin/tournaments/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Deleted');
      fetchTournaments();
    } catch (e) {
      toast.error('Failed');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 to-orange-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-yellow-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-orange-50" data-testid="admin-tournaments">
      <header className="bg-gradient-to-r from-yellow-400 to-orange-500 py-6 px-4">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-3 font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            {t('back')}
          </button>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trophy className="w-10 h-10 text-white" />
              <div>
                <h1 className="text-2xl font-black text-white">
                  {language === 'zh' ? '锦标赛管理' : 'Tournament Management'}
                </h1>
                <p className="text-white/80 text-sm">
                  {language === 'zh' ? '安排实时多人比赛' : 'Schedule live multiplayer matches'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-white text-orange-600 font-bold px-4 py-2 rounded-xl flex items-center gap-2"
              data-testid="toggle-tournament-form"
            >
              <Plus className="w-5 h-5" />
              {language === 'zh' ? '新建' : 'New'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-5 border-2 border-zinc-200 mb-6 space-y-3"
          >
            <h3 className="font-black text-zinc-900">
              {language === 'zh' ? '新锦标赛' : 'New Tournament'}
            </h3>
            <input
              type="text"
              placeholder="Title (English)"
              value={form.title_en}
              onChange={(e) => setForm({ ...form, title_en: e.target.value })}
              className="w-full px-3 py-2 border-2 border-zinc-200 rounded-xl"
              data-testid="form-title-en"
            />
            <input
              type="text"
              placeholder="标题 (中文)"
              value={form.title_zh}
              onChange={(e) => setForm({ ...form, title_zh: e.target.value })}
              className="w-full px-3 py-2 border-2 border-zinc-200 rounded-xl"
              data-testid="form-title-zh"
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={form.level_num}
                onChange={(e) => setForm({ ...form, level_num: parseInt(e.target.value) })}
                className="px-3 py-2 border-2 border-zinc-200 rounded-xl"
                data-testid="form-level"
              >
                {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>Level {n}</option>)}
              </select>
              <input
                type="datetime-local"
                value={form.scheduled_at}
                onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                className="px-3 py-2 border-2 border-zinc-200 rounded-xl"
                data-testid="form-scheduled"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <input
                type="number"
                placeholder="Sec/Q"
                value={form.time_per_question}
                onChange={(e) => setForm({ ...form, time_per_question: parseInt(e.target.value) || 15 })}
                className="px-3 py-2 border-2 border-zinc-200 rounded-xl"
              />
              <input
                type="number"
                placeholder="Total (s)"
                value={form.total_time_limit}
                onChange={(e) => setForm({ ...form, total_time_limit: parseInt(e.target.value) || 600 })}
                className="px-3 py-2 border-2 border-zinc-200 rounded-xl"
              />
              <input
                type="number"
                placeholder="Max Players"
                value={form.max_players}
                onChange={(e) => setForm({ ...form, max_players: parseInt(e.target.value) || 20 })}
                className="px-3 py-2 border-2 border-zinc-200 rounded-xl"
              />
            </div>
            <button
              onClick={createTournament}
              className="w-full bg-orange-500 text-white font-bold py-2 rounded-xl"
              data-testid="submit-tournament-btn"
            >
              {language === 'zh' ? '创建' : 'Create'}
            </button>
          </motion.div>
        )}

        <div className="space-y-3" data-testid="admin-tournaments-list">
          {tournaments.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 border-2 border-zinc-200 text-center">
              <Trophy className="w-12 h-12 text-zinc-300 mx-auto mb-2" />
              <p className="text-zinc-500 font-medium">
                {language === 'zh' ? '暂无锦标赛' : 'No tournaments scheduled'}
              </p>
            </div>
          ) : (
            tournaments.map(t => (
              <div
                key={t.id}
                className="bg-white rounded-2xl p-4 border-2 border-zinc-200 flex items-start gap-3"
              >
                <div className="flex-1">
                  <h3 className="font-black text-zinc-900">{t.title_en}</h3>
                  <p className="text-sm text-zinc-600">{t.title_zh}</p>
                  <div className="flex items-center gap-3 mt-2 text-sm text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(t.scheduled_at).toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" /> {Math.round(t.total_time_limit / 60)}m
                    </span>
                    <span className="px-2 py-0.5 bg-violet-100 text-violet-700 rounded-md text-xs font-bold">
                      Level {t.level_num}
                    </span>
                    {t.status && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-md text-xs font-bold">
                        {t.status}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => deleteTournament(t.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  data-testid={`delete-tournament-${t.id}`}
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

export default AdminTournaments;
