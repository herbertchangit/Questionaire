import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useLanguage } from '../../context/LanguageContext';
import {
  ArrowLeft, Trash2, User, Star, Trophy, Clock, Search, ArrowUpDown,
  Calendar, Mail, School, MapPin, GraduationCap, BookOpen, X, CheckCircle,
  ArrowUpNarrowWide, ArrowDownWideNarrow
} from 'lucide-react';
import Avatar from '../../components/Avatar';

import { API_URL } from '../../lib/api';

const SUBJECT_LABELS = {
  en: { bm: 'BM', sejarah: 'Sejarah', science: 'Science' },
  zh: { bm: '马来语', sejarah: '历史', science: '科学' }
};

function formatDateTime(iso, lang) {
  if (!iso) return null;
  return new Date(iso).toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

function formatDate(iso, lang) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });
}

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('username');
  const [sortDir, setSortDir] = useState('asc'); // 'asc' | 'desc'
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const navigate = useNavigate();
  const { language, t } = useLanguage();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get(`${API_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e, userId, userName) => {
    e.stopPropagation();
    if (!window.confirm(`Delete user ${userName}?`)) return;
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`${API_URL}/api/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('User deleted');
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete user');
    }
  };

  const openUserDetail = async (user) => {
    setDetailLoading(true);
    setSelectedUser({ ...user, _loading: true });
    const token = localStorage.getItem('token');
    try {
      const r = await axios.get(`${API_URL}/api/admin/users/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedUser(r.data);
    } catch (e) {
      toast.error('Failed to load user details');
      setSelectedUser(null);
    } finally {
      setDetailLoading(false);
    }
  };

  // Filter + sort
  const visibleUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    let filtered = users.filter((u) => {
      if (!q) return true;
      return (
        (u.username || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.full_name || '').toLowerCase().includes(q)
      );
    });
    const baseSorters = {
      username: (a, b) => (a.username || '').localeCompare(b.username || ''),
      level: (a, b) => (a.current_level || 0) - (b.current_level || 0),
      points: (a, b) => (a.total_points || 0) - (b.total_points || 0)
    };
    const cmp = baseSorters[sortBy] || baseSorters.username;
    filtered = [...filtered].sort((a, b) => (sortDir === 'asc' ? cmp(a, b) : -cmp(a, b)));
    return filtered;
  }, [users, search, sortBy, sortDir]);

  const sortOptions = [
    { value: 'username', label_en: 'Username', label_zh: '用户名' },
    { value: 'level', label_en: 'Level', label_zh: '等级' },
    { value: 'points', label_en: 'Total Points', label_zh: '总积分' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-pink-50" data-testid="admin-users">
      <header className="bg-white/80 backdrop-blur-md border-b-2 border-zinc-200 py-6 px-4">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2 text-zinc-600 hover:text-zinc-900 mb-4 font-medium"
            data-testid="users-back-btn"
          >
            <ArrowLeft className="w-5 h-5" />
            {t('back')}
          </button>
          <h1 className="text-3xl font-black text-zinc-900">{t('manage_users')}</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {language === 'zh' ? `共 ${users.length} 位用户` : `${users.length} users total`}
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Toolbar: search + sort */}
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={language === 'zh' ? '搜索用户名或邮箱...' : 'Search by username or email...'}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-zinc-200 focus:border-violet-500 focus:outline-none text-sm font-medium"
              data-testid="users-search-input"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-zinc-100"
                data-testid="users-clear-search"
              >
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            )}
          </div>
          <div className="flex gap-2 md:w-auto">
            <div className="relative flex-1 md:w-56">
              <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                data-testid="users-sort-select"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-zinc-200 focus:border-violet-500 focus:outline-none text-sm font-medium appearance-none bg-white"
              >
                {sortOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {language === 'zh' ? `排序: ${opt.label_zh}` : `Sort: ${opt.label_en}`}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
              data-testid="users-sort-direction"
              title={
                sortDir === 'asc'
                  ? (language === 'zh' ? '升序' : 'Ascending')
                  : (language === 'zh' ? '降序' : 'Descending')
              }
              className="px-3 py-2.5 rounded-xl border-2 border-zinc-200 hover:border-violet-500 hover:bg-violet-50 text-zinc-700 font-bold text-sm flex items-center gap-1.5 transition-colors shrink-0"
            >
              {sortDir === 'asc' ? (
                <>
                  <ArrowUpNarrowWide className="w-4 h-4 text-violet-500" />
                  <span className="hidden md:inline">{language === 'zh' ? '升序' : 'Asc'}</span>
                </>
              ) : (
                <>
                  <ArrowDownWideNarrow className="w-4 h-4 text-violet-500" />
                  <span className="hidden md:inline">{language === 'zh' ? '降序' : 'Desc'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-zinc-500">{t('loading')}</div>
        ) : visibleUsers.length === 0 ? (
          <div className="text-center py-12 text-zinc-500" data-testid="users-empty">
            {search
              ? (language === 'zh' ? '没有找到匹配的用户' : 'No users match your search')
              : (language === 'zh' ? '暂无用户' : 'No users')}
          </div>
        ) : (
          <div className="space-y-3" data-testid="users-list">
            {visibleUsers.map((user) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => openUserDetail(user)}
                className="bg-white rounded-xl p-4 border-2 border-zinc-200 hover:border-violet-300 hover:shadow-md cursor-pointer transition-all"
                data-testid={`user-row-${user.username}`}
              >
                <div className="flex items-center gap-4">
                  <Avatar
                    src={user.profile_picture}
                    name={user.full_name || user.username}
                    size={48}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-zinc-900 truncate">{user.full_name || user.username}</h3>
                      {user.role === 'admin' && (
                        <span className="text-xs font-bold bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-500 truncate">
                      @{user.username}{user.email ? ` · ${user.email}` : ''}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-zinc-400 mt-1">
                      <span className="flex items-center gap-1" data-testid={`user-last-login-${user.id}`}>
                        <Clock className="w-3 h-3" />
                        {language === 'zh' ? '上次登录:' : 'Last login:'}{' '}
                        {user.last_login_at
                          ? formatDateTime(user.last_login_at, language)
                          : (language === 'zh' ? '从未' : 'Never')}
                      </span>
                      <span className="flex items-center gap-1" data-testid={`user-signup-${user.id}`}>
                        <Calendar className="w-3 h-3" />
                        {language === 'zh' ? '注册日期:' : 'Sign-up:'}{' '}
                        {formatDate(user.created_at, language) || '—'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-sm shrink-0">
                    <div className="flex items-center gap-1">
                      <Trophy className="w-4 h-4 text-violet-500" />
                      <span className="font-bold">Lv.{user.current_level || 1}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span className="font-bold">{user.total_points || 0}</span>
                    </div>
                  </div>

                  {user.role !== 'admin' && (
                    <button
                      onClick={(e) => handleDelete(e, user.id, user.full_name || user.username)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg shrink-0"
                      data-testid={`delete-user-${user.username}`}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* User Detail Modal */}
      <AnimatePresence>
        {selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedUser(null)}
            data-testid="user-detail-modal"
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-gradient-to-r from-violet-500 to-pink-500 px-5 py-4 flex items-center justify-between rounded-t-2xl z-10">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar
                    src={selectedUser.profile_picture}
                    name={selectedUser.full_name || selectedUser.username}
                    size={48}
                    className="ring-2 ring-white/40"
                  />
                  <div className="min-w-0">
                    <h3 className="font-black text-white text-lg truncate">
                      {selectedUser.full_name || selectedUser.username}
                    </h3>
                    <p className="text-white/80 text-sm truncate">@{selectedUser.username}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="p-2 text-white hover:bg-white/20 rounded-lg shrink-0"
                  data-testid="close-detail-modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {detailLoading || selectedUser._loading ? (
                <div className="p-8 text-center text-zinc-500">{t('loading')}</div>
              ) : (
                <div className="p-5 space-y-4">
                  {/* Stats summary */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-violet-50 rounded-xl p-3 text-center">
                      <Trophy className="w-4 h-4 text-violet-500 mx-auto mb-1" />
                      <p className="text-xs text-zinc-500">{language === 'zh' ? '等级' : 'Level'}</p>
                      <p className="text-lg font-black text-zinc-900">{selectedUser.current_level || 1}</p>
                    </div>
                    <div className="bg-yellow-50 rounded-xl p-3 text-center">
                      <Star className="w-4 h-4 text-yellow-500 mx-auto mb-1" />
                      <p className="text-xs text-zinc-500">{language === 'zh' ? '积分' : 'Points'}</p>
                      <p className="text-lg font-black text-zinc-900">{selectedUser.total_points || 0}</p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-3 text-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mx-auto mb-1" />
                      <p className="text-xs text-zinc-500">{language === 'zh' ? '完成' : 'Quizzes'}</p>
                      <p className="text-lg font-black text-zinc-900">{selectedUser.quizzes_completed || 0}</p>
                    </div>
                  </div>

                  {/* Profile fields */}
                  <DetailRow icon={Mail} label={language === 'zh' ? '电子邮件' : 'Email'} value={selectedUser.email || '—'} />
                  <DetailRow icon={School} label={language === 'zh' ? '学校' : 'School'} value={selectedUser.school_name} />
                  <DetailRow icon={MapPin} label={language === 'zh' ? '城镇' : 'Town'} value={selectedUser.town} />
                  <DetailRow icon={GraduationCap} label={language === 'zh' ? '年级' : 'Grade'} value={`Form ${selectedUser.current_grade}`} />
                  <DetailRow icon={Calendar} label={language === 'zh' ? '出生日期' : 'Date of Birth'} value={formatDate(selectedUser.date_of_birth, language)} />
                  <DetailRow icon={Calendar} label={language === 'zh' ? '注册日期' : 'Sign-up Date'} value={formatDate(selectedUser.created_at, language)} />
                  <DetailRow icon={Clock} label={language === 'zh' ? '上次登录' : 'Last Login'} value={selectedUser.last_login_at ? formatDateTime(selectedUser.last_login_at, language) : (language === 'zh' ? '从未' : 'Never')} />

                  {/* Latest Marks */}
                  {selectedUser.latest_marks && (
                    <div className="bg-zinc-50 rounded-xl p-3">
                      <p className="text-xs font-bold text-zinc-500 uppercase mb-2 flex items-center gap-1">
                        <BookOpen className="w-4 h-4" />
                        {language === 'zh' ? '最近成绩' : 'Latest Marks'}
                      </p>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        {['bm', 'sejarah', 'science'].map((s) => (
                          <div key={s}>
                            <p className="text-xs text-zinc-500">{SUBJECT_LABELS[language][s]}</p>
                            <p className="text-lg font-black text-zinc-900">{selectedUser.latest_marks[s] ?? 0}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent quiz history */}
                  {selectedUser.recent_quiz_history?.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-zinc-500 uppercase mb-2">
                        {language === 'zh' ? '最近测验' : 'Recent Quizzes'} ({selectedUser.quiz_history_count})
                      </p>
                      <div className="space-y-1.5">
                        {selectedUser.recent_quiz_history.map((q) => (
                          <div key={q.id} className="bg-zinc-50 rounded-lg px-3 py-2 flex items-center justify-between text-sm">
                            <span className="font-medium">
                              Lv.{q.level_num} · Stage {q.stage_num}
                            </span>
                            <span className="text-zinc-500 text-xs">
                              {q.score}/{q.total} · {formatDate(q.completed_at, language)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-1.5 border-b border-zinc-100 last:border-0">
      <Icon className="w-4 h-4 text-zinc-400 mt-1 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-zinc-500 uppercase tracking-wide">{label}</p>
        <p className="text-sm font-medium text-zinc-900 truncate">{value || '—'}</p>
      </div>
    </div>
  );
}

export default AdminUsers;
