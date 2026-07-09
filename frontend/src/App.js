import React, { useCallback, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { Toaster } from './components/ui/sonner';
import { LanguageProvider } from './context/LanguageContext';
import { API_URL } from './lib/api';
import { readStoredJson } from './lib/storage';

// Auth Pages
import Login from './pages/Login';
import Register from './pages/Register';

// Main Pages
import Dashboard from './pages/Dashboard';
import LevelPage from './pages/LevelPage';
import PlayPage from './pages/PlayPage';
import ResultsPage from './pages/ResultsPage';
import Leaderboard from './pages/Leaderboard';
import History from './pages/History';
import Settings from './pages/Settings';
import Notices from './pages/Notices';
import LiveLobby from './pages/LiveLobby';
import LiveRoom from './pages/LiveRoom';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import ManageQuestions from './pages/admin/ManageQuestions';
import ManageNotices from './pages/admin/ManageNotices';
import AdminUsers from './pages/admin/AdminUsers';
import AdminReports from './pages/admin/AdminReports';
import AdminTournaments from './pages/admin/AdminTournaments';

import './App.css';

function getInitialAuth() {
  const token = localStorage.getItem('token');
  const user = readStoredJson('user');

  if (token && !user) {
    localStorage.removeItem('token');
  }

  return { token: user ? token : null, user };
}

function App() {
  const [auth, setAuth] = useState(getInitialAuth);
  const { token, user } = auth;
  const isAuthenticated = Boolean(token && user);

  const handleAuthenticated = ({ token: nextToken, user: nextUser }) => {
    setAuth({ token: nextToken, user: nextUser });
  };

  const handleSessionExpired = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setAuth({ token: null, user: null });
  }, []);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    axios.get(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then((response) => {
      if (cancelled) return;
      const savedLanguage = localStorage.getItem('language');
      const nextUser = ['en', 'zh'].includes(savedLanguage)
        ? { ...response.data, language: savedLanguage }
        : response.data;
      localStorage.setItem('user', JSON.stringify(nextUser));
      setAuth({ token, user: nextUser });
    }).catch((error) => {
      if (!cancelled && error.response?.status === 401) {
        handleSessionExpired();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [handleSessionExpired, token]);

  return (
    <LanguageProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Auth Routes */}
            <Route path="/login" element={!isAuthenticated ? <Login onLogin={handleAuthenticated} /> : <Navigate to="/dashboard" />} />
            <Route path="/register" element={!isAuthenticated ? <Register onRegister={handleAuthenticated} /> : <Navigate to="/dashboard" />} />
            
            {/* Main Routes */}
            <Route path="/dashboard" element={isAuthenticated ? <Dashboard onSessionExpired={handleSessionExpired} /> : <Navigate to="/login" />} />
            <Route path="/level/:levelNum" element={isAuthenticated ? <LevelPage /> : <Navigate to="/login" />} />
            <Route path="/play/:stageId" element={isAuthenticated ? <PlayPage /> : <Navigate to="/login" />} />
            <Route path="/results/:stageId" element={isAuthenticated ? <ResultsPage /> : <Navigate to="/login" />} />
            <Route path="/leaderboard" element={isAuthenticated ? <Leaderboard /> : <Navigate to="/login" />} />
            <Route path="/history" element={isAuthenticated ? <History /> : <Navigate to="/login" />} />
            <Route path="/settings" element={isAuthenticated ? <Settings /> : <Navigate to="/login" />} />
            <Route path="/notices" element={isAuthenticated ? <Notices /> : <Navigate to="/login" />} />
            <Route path="/live" element={isAuthenticated ? <LiveLobby /> : <Navigate to="/login" />} />
            <Route path="/live/room/:code" element={isAuthenticated ? <LiveRoom /> : <Navigate to="/login" />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={isAuthenticated && user?.role === 'admin' ? <AdminDashboard /> : <Navigate to="/login" />} />
            <Route path="/admin/questions" element={isAuthenticated && user?.role === 'admin' ? <ManageQuestions /> : <Navigate to="/login" />} />
            <Route path="/admin/notices" element={isAuthenticated && user?.role === 'admin' ? <ManageNotices /> : <Navigate to="/login" />} />
            <Route path="/admin/users" element={isAuthenticated && user?.role === 'admin' ? <AdminUsers /> : <Navigate to="/login" />} />
            <Route path="/admin/reports" element={isAuthenticated && user?.role === 'admin' ? <AdminReports /> : <Navigate to="/login" />} />
            <Route path="/admin/tournaments" element={isAuthenticated && user?.role === 'admin' ? <AdminTournaments /> : <Navigate to="/login" />} />
            
            {/* Default Route */}
            <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
          </Routes>
          <Toaster position="top-center" richColors />
        </div>
      </Router>
    </LanguageProvider>
  );
}

export default App;
