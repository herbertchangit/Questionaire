import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Zap, Mail, Lock, Sparkles } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('Attempting login to:', `${API_URL}/api/auth/login`);
      const response = await axios.post(`${API_URL}/api/auth/login`, { email, password });
      console.log('Login response:', response.data);
      
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      toast.success('Welcome back! 🎉');
      
      // Force page reload after setting localStorage
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 500);
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-white neo-border neo-shadow-deep rounded-2xl p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500 rounded-full blur-3xl opacity-20"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-pink-500 rounded-full blur-3xl opacity-20"></div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-center mb-8">
              <div className="bg-violet-500 neo-border neo-shadow p-4 rounded-2xl">
                <Zap className="w-12 h-12 text-white" data-testid="login-icon" />
              </div>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-black text-center mb-2 text-zinc-950" data-testid="login-title">
              QuizPop
            </h1>
            <p className="text-center text-zinc-600 font-bold mb-8 flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-500" />
              The Anti-Boring Quiz App
            </p>

            <form onSubmit={handleSubmit} className="space-y-6" data-testid="login-form">
              <div>
                <label className="block text-sm font-bold uppercase tracking-widest text-zinc-950 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full h-12 pl-12 pr-4 rounded-xl neo-border bg-white text-lg font-medium placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
                    placeholder="your@email.com"
                    data-testid="login-email-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold uppercase tracking-widest text-zinc-950 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full h-12 pl-12 pr-4 rounded-xl neo-border bg-white text-lg font-medium placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
                    placeholder="••••••••"
                    data-testid="login-password-input"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-violet-500 text-white font-black text-lg px-8 py-4 rounded-xl neo-border neo-shadow hover:translate-y-1 hover:shadow-none active:translate-y-1 active:shadow-none uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="login-submit-button"
              >
                {loading ? 'Logging in...' : 'Start Playing'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-zinc-600 font-medium">
                New here?{' '}
                <Link to="/register" className="text-violet-500 font-bold hover:underline" data-testid="register-link">
                  Create Account
                </Link>
              </p>
            </div>

            <div className="mt-6 p-4 bg-yellow-50 neo-border rounded-xl">
              <p className="text-sm font-bold text-zinc-700 text-center">
                🎮 Demo Admin: admin@quiz.com / admin123
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default Login;