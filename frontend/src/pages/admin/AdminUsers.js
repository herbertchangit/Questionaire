import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useLanguage } from '../../context/LanguageContext';
import { ArrowLeft, Trash2, User, Star, Trophy, Clock } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
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

  const handleDelete = async (userId, userName) => {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-pink-50" data-testid="admin-users">
      <header className="bg-white/80 backdrop-blur-md border-b-2 border-zinc-200 py-6 px-4">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2 text-zinc-600 hover:text-zinc-900 mb-4 font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            {t('back')}
          </button>
          <h1 className="text-3xl font-black text-zinc-900">{t('manage_users')}</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">No users</div>
        ) : (
          <div className="space-y-3">
            {users.map((user) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-xl p-4 border-2 border-zinc-200"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-zinc-900 truncate">{user.full_name || user.username}</h3>
                      {user.role === 'admin' && (
                        <span className="text-xs font-bold bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-500 truncate">@{user.username}{user.email ? ` · ${user.email}` : ''}</p>
                    <div className="flex items-center gap-1 text-xs text-zinc-400 mt-1" data-testid={`user-last-login-${user.id}`}>
                      <Clock className="w-3 h-3" />
                      <span>
                        {language === 'zh' ? '上次登录:' : 'Last login:'}{' '}
                        {user.last_login_at
                          ? new Date(user.last_login_at).toLocaleString(
                              language === 'zh' ? 'zh-CN' : 'en-US',
                              { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }
                            )
                          : (language === 'zh' ? '从未' : 'Never')}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm">
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
                      onClick={() => handleDelete(user.id, user.full_name || user.username)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
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
    </div>
  );
}

export default AdminUsers;
