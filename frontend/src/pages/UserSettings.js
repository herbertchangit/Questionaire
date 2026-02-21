import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { ArrowLeft, Key, Lock, Mail, Palette, Check, Settings as SettingsIcon } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const THEMES = [
  {
    id: 'default',
    name: 'Violet Pop',
    primary: '#8B5CF6',
    secondary: '#FF4785',
    accent: '#FACC15',
    gradient: 'from-violet-500 to-pink-500',
    icon: '💜'
  },
  {
    id: 'ocean',
    name: 'Ocean Breeze',
    primary: '#0EA5E9',
    secondary: '#06B6D4',
    accent: '#10B981',
    gradient: 'from-sky-500 to-cyan-500',
    icon: '🌊'
  },
  {
    id: 'sunset',
    name: 'Sunset Glow',
    primary: '#F59E0B',
    secondary: '#EF4444',
    accent: '#EC4899',
    gradient: 'from-orange-500 to-red-500',
    icon: '🌅'
  },
  {
    id: 'forest',
    name: 'Forest Green',
    primary: '#10B981',
    secondary: '#059669',
    accent: '#84CC16',
    gradient: 'from-emerald-500 to-green-600',
    icon: '🌲'
  },
  {
    id: 'royal',
    name: 'Royal Purple',
    primary: '#7C3AED',
    secondary: '#A855F7',
    accent: '#C084FC',
    gradient: 'from-purple-600 to-purple-500',
    icon: '👑'
  },
  {
    id: 'fire',
    name: 'Fire Blaze',
    primary: '#DC2626',
    secondary: '#F97316',
    accent: '#FBBF24',
    gradient: 'from-red-600 to-orange-500',
    icon: '🔥'
  }
];

function UserSettings() {
  const [user, setUser] = useState(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState('default');
  const navigate = useNavigate();

  useEffect(() => {
    fetchUser();
    const savedTheme = localStorage.getItem('quizpop_theme') || 'default';
    setSelectedTheme(savedTheme);
    applyTheme(savedTheme);
  }, []);

  const fetchUser = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
    } catch (error) {
      toast.error('Failed to load user data');
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const applyTheme = (themeId) => {
    const theme = THEMES.find(t => t.id === themeId);
    if (theme) {
      document.documentElement.style.setProperty('--color-primary', theme.primary);
      document.documentElement.style.setProperty('--color-secondary', theme.secondary);
      document.documentElement.style.setProperty('--color-accent', theme.accent);
    }
  };

  const handleThemeChange = (themeId) => {
    setSelectedTheme(themeId);
    localStorage.setItem('quizpop_theme', themeId);
    applyTheme(themeId);
    toast.success(`Theme changed to ${THEMES.find(t => t.id === themeId).name}! 🎨`);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match!');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setSubmitting(true);
    const token = localStorage.getItem('token');

    try {
      const response = await axios.post(
        `${API_URL}/api/users/change-password`,
        {
          current_password: currentPassword,
          new_password: newPassword
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.email_sent) {
        toast.success('Password changed! Confirmation email sent 📧');
      } else {
        toast.success('Password changed successfully! ✅');
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to change password');
    } finally {
      setSubmitting(false);
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
    <div className="min-h-screen p-4 md:p-8" data-testid="user-settings-page">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`bg-gradient-to-r ${THEMES.find(t => t.id === selectedTheme).gradient} neo-border neo-shadow-deep rounded-2xl p-6 md:p-8 mb-8`}
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="bg-white neo-border neo-shadow p-4 rounded-2xl">
                <SettingsIcon className="w-10 h-10 text-violet-500" data-testid="settings-icon" />
              </div>
              <div>
                <h1 className="text-3xl md:text-5xl font-black text-white" data-testid="settings-title">
                  User Settings
                </h1>
                <p className="text-white font-bold">Customize your account</p>
              </div>
            </div>
            
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-white text-zinc-950 font-bold px-6 py-3 rounded-xl neo-border neo-shadow hover:translate-y-1 hover:shadow-none flex items-center gap-2"
              data-testid="back-button"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
          </div>
        </motion.div>

        {/* Theme Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white neo-border neo-shadow-deep rounded-2xl p-6 md:p-8 mb-8"
          data-testid="theme-section"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-violet-100 neo-border p-3 rounded-xl">
              <Palette className="w-6 h-6 text-violet-600" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-zinc-950">Theme Selection</h2>
              <p className="text-zinc-600 font-medium">Choose your favorite color scheme</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {THEMES.map((theme) => (
              <motion.button
                key={theme.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleThemeChange(theme.id)}
                className={`p-6 rounded-xl neo-border neo-shadow hover:shadow-[6px_6px_0px_0px_rgba(24,24,27,1)] relative ${
                  selectedTheme === theme.id ? 'bg-violet-50 ring-4 ring-violet-500' : 'bg-white'
                }`}
                data-testid={`theme-${theme.id}`}
              >
                {selectedTheme === theme.id && (
                  <div className="absolute top-3 right-3 bg-violet-500 neo-border rounded-full p-1">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
                
                <div className={`w-full h-20 bg-gradient-to-r ${theme.gradient} rounded-lg neo-border mb-4 flex items-center justify-center text-4xl`}>
                  {theme.icon}
                </div>
                
                <h3 className="text-lg font-black text-zinc-950 mb-2">{theme.name}</h3>
                
                <div className="flex gap-2 justify-center">
                  <div className="w-8 h-8 rounded-full neo-border" style={{ backgroundColor: theme.primary }}></div>
                  <div className="w-8 h-8 rounded-full neo-border" style={{ backgroundColor: theme.secondary }}></div>
                  <div className="w-8 h-8 rounded-full neo-border" style={{ backgroundColor: theme.accent }}></div>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Password Change */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white neo-border neo-shadow-deep rounded-2xl p-6 md:p-8"
          data-testid="password-section"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-pink-100 neo-border p-3 rounded-xl">
              <Key className="w-6 h-6 text-pink-600" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-zinc-950">Change Password</h2>
              <p className="text-zinc-600 font-medium">Update your password and receive email confirmation</p>
            </div>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-6" data-testid="password-form">
            <div>
              <label className="block text-sm font-bold uppercase tracking-widest text-zinc-950 mb-2">
                Current Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="w-full h-12 pl-12 pr-4 rounded-xl neo-border bg-white text-lg font-medium placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
                  placeholder="Enter current password"
                  data-testid="current-password-input"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold uppercase tracking-widest text-zinc-950 mb-2">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full h-12 pl-12 pr-4 rounded-xl neo-border bg-white text-lg font-medium placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
                  placeholder="Enter new password (min 6 characters)"
                  data-testid="new-password-input"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold uppercase tracking-widest text-zinc-950 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full h-12 pl-12 pr-4 rounded-xl neo-border bg-white text-lg font-medium placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
                  placeholder="Confirm new password"
                  data-testid="confirm-password-input"
                />
              </div>
            </div>

            <div className="bg-yellow-50 neo-border rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-zinc-950 mb-1">Email Notification</p>
                  <p className="text-sm text-zinc-600 font-medium">
                    After changing your password, you'll receive a confirmation email at <strong>{user?.email}</strong>
                  </p>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-violet-500 text-white font-black text-lg px-8 py-4 rounded-xl neo-border neo-shadow hover:translate-y-1 hover:shadow-none uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              data-testid="change-password-button"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                  Updating...
                </>
              ) : (
                <>
                  <Key className="w-5 h-5" />
                  Change Password
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}

export default UserSettings;
