import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useLanguage } from '../context/LanguageContext';
import { ArrowLeft, Globe, Lock, Save } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

function Settings() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();

  const handleLanguageChange = async (newLang) => {
    const token = localStorage.getItem('token');
    try {
      await axios.put(
        `${API_URL}/api/user/language`,
        { language: newLang },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setLanguage(newLang);
      toast.success(language === 'zh' ? '语言已更新' : 'Language updated');
    } catch (error) {
      toast.error('Failed to update language');
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) return;
    
    setLoading(true);
    const token = localStorage.getItem('token');
    
    try {
      await axios.post(
        `${API_URL}/api/user/change-password`,
        { current_password: currentPassword, new_password: newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(language === 'zh' ? '密码已更新' : 'Password changed');
      setCurrentPassword('');
      setNewPassword('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-pink-50" data-testid="settings-page">
      <header className="bg-white/80 backdrop-blur-md border-b-2 border-zinc-200 py-6 px-4">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-zinc-600 hover:text-zinc-900 mb-4 font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            {t('back')}
          </button>
          <h1 className="text-3xl font-black text-zinc-900">{t('settings')}</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Language Setting */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 border-2 border-zinc-200"
        >
          <div className="flex items-center gap-3 mb-4">
            <Globe className="w-6 h-6 text-violet-500" />
            <h2 className="text-xl font-bold text-zinc-900">{t('language')}</h2>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => handleLanguageChange('en')}
              className={`flex-1 py-3 px-4 rounded-xl font-bold border-2 transition-colors ${
                language === 'en'
                  ? 'bg-violet-500 text-white border-violet-500'
                  : 'bg-white text-zinc-700 border-zinc-200 hover:border-violet-300'
              }`}
            >
              English
            </button>
            <button
              onClick={() => handleLanguageChange('zh')}
              className={`flex-1 py-3 px-4 rounded-xl font-bold border-2 transition-colors ${
                language === 'zh'
                  ? 'bg-violet-500 text-white border-violet-500'
                  : 'bg-white text-zinc-700 border-zinc-200 hover:border-violet-300'
              }`}
            >
              中文
            </button>
          </div>
        </motion.div>

        {/* Password Change */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-6 border-2 border-zinc-200"
        >
          <div className="flex items-center gap-3 mb-4">
            <Lock className="w-6 h-6 text-violet-500" />
            <h2 className="text-xl font-bold text-zinc-900">{t('change_password')}</h2>
          </div>
          
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-2">
                {t('current_password')}
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-zinc-200 focus:border-violet-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-2">
                {t('new_password')}
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-zinc-200 focus:border-violet-500 focus:outline-none"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-violet-500 text-white font-bold py-3 rounded-xl hover:bg-violet-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              {loading ? t('loading') : t('save')}
            </button>
          </form>
        </motion.div>
      </main>
    </div>
  );
}

export default Settings;
