import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useLanguage } from '../context/LanguageContext';
import { User, Lock, LogIn, Globe, Award, Eye, EyeOff } from 'lucide-react';
import InstallPwaBanner from '../components/InstallPwaBanner';

import { API_URL } from '../lib/api';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  const { language, toggleLanguage, t, setLanguage } = useLanguage();

  // Load saved username if remember me was checked
  useEffect(() => {
    const savedUsername = localStorage.getItem('rememberedUsername');
    if (savedUsername) {
      setUsername(savedUsername);
      setRememberMe(true);
    }
  }, []);

  const validateForm = () => {
    const newErrors = {};
    
    if (!username.trim()) {
      newErrors.username = language === 'zh' ? '请输入用户名或电子邮件' : 'Username or email is required';
    } else if (username.trim().length < 3) {
      newErrors.username = language === 'zh' ? '至少3个字符' : 'Must be at least 3 characters';
    }
    
    if (!password) {
      newErrors.password = language === 'zh' ? '请输入密码' : 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = language === 'zh' ? '密码至少6个字符' : 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    setErrors({});

    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        username: username.trim().toLowerCase(),
        password,
        remember_me: rememberMe
      });
      
      // Save or clear remembered username
      if (rememberMe) {
        localStorage.setItem('rememberedUsername', username.trim().toLowerCase());
      } else {
        localStorage.removeItem('rememberedUsername');
      }
      
      const { token, user } = response.data;
      if (!token || !user) {
        throw new Error('Login response missing session data');
      }

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      onLogin?.({ token, user });
      
      // Apply user's saved language as the default
      if (user?.language && ['en', 'zh'].includes(user.language)) {
        setLanguage(user.language);
      }
      
      toast.success(response.data.message || (language === 'zh' ? '登录成功!' : 'Login successful!'));
      
      navigate('/dashboard', { replace: true });
    } catch (error) {
      const errorMsg = error.response?.data?.detail || (language === 'zh' ? '登录失败' : 'Login failed');
      setErrors({ form: errorMsg });
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
      {/* Language Toggle */}
      <button
        onClick={toggleLanguage}
        className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-white/30 transition-colors"
        data-testid="language-toggle"
      >
        <Globe className="w-5 h-5" />
        {language === 'en' ? '中文' : 'EN'}
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-28 h-28 mb-4">
            <img
              src="/monster-huddle-logo.png?v=3"
              alt="Monster Huddle logo"
              className="w-full h-full object-contain drop-shadow-xl"
              data-testid="login-logo"
            />
          </div>
          <h1 className="text-4xl font-black text-white mb-2">Monster Huddle</h1>
          <p className="text-white/80 font-medium">
            {language === 'zh' ? '学习变得有趣' : 'Learning Made Fun'}
          </p>
        </div>

        {/* PWA install nudge — only fires on mobile devices that support it */}
        <InstallPwaBanner language={language} role="user" />

        {/* Login Form */}
        <div className="bg-white rounded-3xl p-8 shadow-xl">
          <h2 className="text-2xl font-black text-zinc-900 mb-2">{t('login_title')}</h2>
          <p className="text-zinc-500 mb-6">{t('login_subtitle')}</p>

          {errors.form && (
            <div className="mb-4 p-3 bg-red-50 border-2 border-red-200 rounded-xl text-red-600 text-sm font-medium">
              {errors.form}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-2">
                {language === 'zh' ? '用户名或电子邮件' : 'Username or Email'}
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={`w-full pl-12 pr-4 py-3 rounded-xl border-2 focus:outline-none font-medium ${
                    errors.username ? 'border-red-300 focus:border-red-500' : 'border-zinc-200 focus:border-violet-500'
                  }`}
                  placeholder={language === 'zh' ? '用户名或邮箱' : 'Username or email'}
                  data-testid="username-input"
                />
              </div>
              {errors.username && (
                <p className="text-red-500 text-sm mt-1">{errors.username}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-2">
                {t('password')}
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full pl-12 pr-12 py-3 rounded-xl border-2 focus:outline-none font-medium ${
                    errors.password ? 'border-red-300 focus:border-red-500' : 'border-zinc-200 focus:border-violet-500'
                  }`}
                  placeholder="••••••••"
                  data-testid="password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password}</p>
              )}
            </div>

            {/* Remember Me */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-300 text-violet-500 focus:ring-violet-500"
                data-testid="remember-me"
              />
              <label htmlFor="rememberMe" className="text-sm font-medium text-zinc-600 cursor-pointer">
                {language === 'zh' ? '记住我' : 'Remember me'}
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-violet-500 to-pink-500 text-white font-bold py-4 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              data-testid="login-btn"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  {t('login')}
                </>
              )}
            </button>
          </form>

          <p className="text-center mt-6 text-zinc-600">
            {t('no_account')}{' '}
            <Link to="/register" className="text-violet-600 font-bold hover:underline">
              {t('register')}
            </Link>
          </p>
        </div>

        {/* Demo Credentials */}
        <div className="mt-6 bg-white/10 backdrop-blur-sm rounded-xl p-4 text-white/80 text-sm">
          <p className="font-bold mb-2">{language === 'zh' ? '演示账户:' : 'Demo Accounts:'}</p>
          <p>User: demo / demo123</p>
          <p>Admin: admin / admin123</p>
        </div>
      </motion.div>
    </div>
  );
}

export default Login;
