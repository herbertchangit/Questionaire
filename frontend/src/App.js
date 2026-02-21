import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import QuizPage from './pages/QuizPage';
import ResultPage from './pages/ResultPage';
import UserSettings from './pages/UserSettings';
import AdminDashboard from './pages/admin/AdminDashboard';
import CreateQuiz from './pages/admin/CreateQuiz';
import ManageQuestions from './pages/admin/ManageQuestions';
import UserManagement from './pages/admin/UserManagement';
import './App.css';

function App() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/login" element={!token ? <Login /> : <Navigate to="/dashboard" />} />
          <Route path="/register" element={!token ? <Register /> : <Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={token ? <Dashboard /> : <Navigate to="/login" />} />
          <Route path="/quiz/:id" element={token ? <QuizPage /> : <Navigate to="/login" />} />
          <Route path="/results/:id" element={token ? <ResultPage /> : <Navigate to="/login" />} />
          
          <Route path="/admin" element={token && user?.role === 'admin' ? <AdminDashboard /> : <Navigate to="/login" />} />
          <Route path="/admin/quiz/create" element={token && user?.role === 'admin' ? <CreateQuiz /> : <Navigate to="/login" />} />
          <Route path="/admin/quiz/:id/questions" element={token && user?.role === 'admin' ? <ManageQuestions /> : <Navigate to="/login" />} />
          <Route path="/admin/users" element={token && user?.role === 'admin' ? <UserManagement /> : <Navigate to="/login" />} />
          
          <Route path="/" element={<Navigate to={token ? "/dashboard" : "/login"} />} />
        </Routes>
        <Toaster position="top-center" richColors />
      </div>
    </Router>
  );
}

export default App;