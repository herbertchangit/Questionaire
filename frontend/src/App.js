import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import { LanguageProvider } from './context/LanguageContext';

// Auth Pages
import Login from './pages/Login';
import Register from './pages/Register';

// Main Pages
import Dashboard from './pages/Dashboard';
import SubjectPage from './pages/SubjectPage';
import LevelPage from './pages/LevelPage';
import PlayPage from './pages/PlayPage';
import ResultsPage from './pages/ResultsPage';
import Leaderboard from './pages/Leaderboard';
import History from './pages/History';
import Settings from './pages/Settings';
import Notices from './pages/Notices';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import ManageQuestions from './pages/admin/ManageQuestions';
import ManageNotices from './pages/admin/ManageNotices';
import AdminUsers from './pages/admin/AdminUsers';
import AdminReports from './pages/admin/AdminReports';

import './App.css';

function App() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  return (
    <LanguageProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Auth Routes */}
            <Route path="/login" element={!token ? <Login /> : <Navigate to="/dashboard" />} />
            <Route path="/register" element={!token ? <Register /> : <Navigate to="/dashboard" />} />
            
            {/* Main Routes */}
            <Route path="/dashboard" element={token ? <Dashboard /> : <Navigate to="/login" />} />
            <Route path="/subject/:subjectId" element={token ? <SubjectPage /> : <Navigate to="/login" />} />
            <Route path="/subject/:subjectId/level/:levelNum" element={token ? <LevelPage /> : <Navigate to="/login" />} />
            <Route path="/play/:stageId" element={token ? <PlayPage /> : <Navigate to="/login" />} />
            <Route path="/results/:stageId" element={token ? <ResultsPage /> : <Navigate to="/login" />} />
            <Route path="/leaderboard" element={token ? <Leaderboard /> : <Navigate to="/login" />} />
            <Route path="/history" element={token ? <History /> : <Navigate to="/login" />} />
            <Route path="/settings" element={token ? <Settings /> : <Navigate to="/login" />} />
            <Route path="/notices" element={token ? <Notices /> : <Navigate to="/login" />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={token && user?.role === 'admin' ? <AdminDashboard /> : <Navigate to="/login" />} />
            <Route path="/admin/questions" element={token && user?.role === 'admin' ? <ManageQuestions /> : <Navigate to="/login" />} />
            <Route path="/admin/notices" element={token && user?.role === 'admin' ? <ManageNotices /> : <Navigate to="/login" />} />
            <Route path="/admin/users" element={token && user?.role === 'admin' ? <AdminUsers /> : <Navigate to="/login" />} />
            <Route path="/admin/reports" element={token && user?.role === 'admin' ? <AdminReports /> : <Navigate to="/login" />} />
            
            {/* Default Route */}
            <Route path="/" element={<Navigate to={token ? "/dashboard" : "/login"} />} />
          </Routes>
          <Toaster position="top-center" richColors />
        </div>
      </Router>
    </LanguageProvider>
  );
}

export default App;
