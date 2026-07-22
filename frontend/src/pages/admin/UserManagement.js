import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { ArrowLeft, Users, Trash2, Key, RotateCcw, Mail, AlertTriangle } from 'lucide-react';

import { API_URL } from '../../lib/api';

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [resetPasswordData, setResetPasswordData] = useState(null);
  const navigate = useNavigate();

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

  const handleDeleteUser = async () => {
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`${API_URL}/api/admin/users/${selectedUser.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`User ${selectedUser.name} deleted successfully`);
      setShowDeleteModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete user');
    }
  };

  const handleResetPassword = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.post(
        `${API_URL}/api/admin/users/${selectedUser.id}/reset-password`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setResetPasswordData(response.data);
      setShowPasswordModal(true);
      setShowDeleteModal(false);
      
      if (response.data.email_sent) {
        toast.success(`Password reset email sent to ${response.data.user_email}`);
      } else {
        toast.warning('Password reset but email failed to send. Copy password below.');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to reset password');
    }
  };

  const handleResetProgress = async () => {
    const token = localStorage.getItem('token');
    try {
      await axios.post(
        `${API_URL}/api/admin/users/${selectedUser.id}/reset-progress`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Progress reset for ${selectedUser.name}`);
      setShowResetModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to reset progress');
    }
  };

  const copyPassword = () => {
    navigator.clipboard.writeText(resetPasswordData.new_password);
    toast.success('Password copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-violet-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8" data-testid="user-management-page">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-violet-500 to-pink-500 neo-border neo-shadow-deep rounded-2xl p-6 md:p-8 mb-8"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-white neo-border neo-shadow p-4 rounded-2xl">
                <Users className="w-10 h-10 text-violet-500" data-testid="users-icon" />
              </div>
              <div>
                <h1 className="text-3xl md:text-5xl font-black text-white" data-testid="page-title">
                  User Management
                </h1>
                <p className="text-white font-bold">{users.length} total users</p>
              </div>
            </div>
            
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-white text-zinc-950 font-bold px-6 py-3 rounded-xl neo-border neo-shadow hover:translate-y-1 hover:shadow-none flex items-center gap-2"
              data-testid="back-to-admin-button"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
          </div>
        </motion.div>

        <div className="bg-white neo-border neo-shadow-deep rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-black uppercase tracking-widest text-zinc-950 neo-border">Name</th>
                  <th className="px-6 py-4 text-left text-sm font-black uppercase tracking-widest text-zinc-950 neo-border">Email</th>
                  <th className="px-6 py-4 text-center text-sm font-black uppercase tracking-widest text-zinc-950 neo-border">Level</th>
                  <th className="px-6 py-4 text-center text-sm font-black uppercase tracking-widest text-zinc-950 neo-border">Points</th>
                  <th className="px-6 py-4 text-center text-sm font-black uppercase tracking-widest text-zinc-950 neo-border">Completed</th>
                  <th className="px-6 py-4 text-center text-sm font-black uppercase tracking-widest text-zinc-950 neo-border">Role</th>
                  <th className="px-6 py-4 text-center text-sm font-black uppercase tracking-widest text-zinc-950 neo-border">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, index) => (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * index }}
                    className="hover:bg-violet-50"
                    data-testid={`user-row-${user.id}`}
                  >
                    <td className="px-6 py-4 neo-border">
                      <span className="font-bold text-zinc-950">{user.name}</span>
                    </td>
                    <td className="px-6 py-4 neo-border">
                      <span className="text-zinc-600 font-medium">{user.email}</span>
                    </td>
                    <td className="px-6 py-4 text-center neo-border">
                      <span className="inline-block bg-violet-100 text-violet-700 font-black px-3 py-1 rounded-full text-sm neo-border">
                        {user.level}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center neo-border">
                      <span className="inline-block bg-yellow-100 text-yellow-700 font-black px-3 py-1 rounded-full text-sm neo-border">
                        {user.points}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center neo-border">
                      <span className="inline-block bg-pink-100 text-pink-700 font-black px-3 py-1 rounded-full text-sm neo-border">
                        {user.completed_quizzes?.length || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center neo-border">
                      <span className={`inline-block font-black px-3 py-1 rounded-full text-sm neo-border ${
                        user.role === 'admin' ? 'bg-yellow-100 text-yellow-700' : 'bg-zinc-100 text-zinc-700'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 neo-border">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            handleResetPassword();
                          }}
                          className="bg-blue-500 text-white p-2 rounded-lg neo-border hover:translate-y-1 hover:shadow-none"
                          title="Reset Password"
                          data-testid={`reset-password-button-${user.id}`}
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowResetModal(true);
                          }}
                          className="bg-orange-500 text-white p-2 rounded-lg neo-border hover:translate-y-1 hover:shadow-none"
                          title="Reset Progress"
                          data-testid={`reset-progress-button-${user.id}`}
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        {user.role !== 'admin' && (
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowDeleteModal(true);
                            }}
                            className="bg-red-500 text-white p-2 rounded-lg neo-border hover:translate-y-1 hover:shadow-none"
                            title="Delete User"
                            data-testid={`delete-user-button-${user.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white neo-border neo-shadow-deep rounded-2xl p-8 max-w-md w-full"
            data-testid="delete-modal"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-red-100 neo-border p-4 rounded-full">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-zinc-950">Delete User?</h2>
                <p className="text-zinc-600 font-medium">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-zinc-700 font-medium mb-6">
              Are you sure you want to delete <strong>{selectedUser?.name}</strong>? All their quiz results will be permanently deleted.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedUser(null);
                }}
                className="flex-1 bg-zinc-200 text-zinc-950 font-bold py-3 rounded-xl neo-border neo-shadow hover:translate-y-1 hover:shadow-none"
                data-testid="cancel-delete-button"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                className="flex-1 bg-red-500 text-white font-bold py-3 rounded-xl neo-border neo-shadow hover:translate-y-1 hover:shadow-none"
                data-testid="confirm-delete-button"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Reset Progress Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white neo-border neo-shadow-deep rounded-2xl p-8 max-w-md w-full"
            data-testid="reset-progress-modal"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-orange-100 neo-border p-4 rounded-full">
                <RotateCcw className="w-8 h-8 text-orange-500" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-zinc-950">Reset Progress?</h2>
                <p className="text-zinc-600 font-medium">Reset to Level 1</p>
              </div>
            </div>
            <p className="text-zinc-700 font-medium mb-6">
              Reset <strong>{selectedUser?.name}</strong>'s progress? This will:
            </p>
            <ul className="list-disc list-inside mb-6 text-zinc-700 font-medium space-y-2">
              <li>Set level back to 1</li>
              <li>Reset points to 0</li>
              <li>Clear all completed quizzes</li>
              <li>Delete all quiz results</li>
            </ul>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowResetModal(false);
                  setSelectedUser(null);
                }}
                className="flex-1 bg-zinc-200 text-zinc-950 font-bold py-3 rounded-xl neo-border neo-shadow hover:translate-y-1 hover:shadow-none"
                data-testid="cancel-reset-button"
              >
                Cancel
              </button>
              <button
                onClick={handleResetProgress}
                className="flex-1 bg-orange-500 text-white font-bold py-3 rounded-xl neo-border neo-shadow hover:translate-y-1 hover:shadow-none"
                data-testid="confirm-reset-button"
              >
                Reset Progress
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Password Reset Success Modal */}
      {showPasswordModal && resetPasswordData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white neo-border neo-shadow-deep rounded-2xl p-8 max-w-md w-full"
            data-testid="password-reset-modal"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-green-100 neo-border p-4 rounded-full">
                <Mail className="w-8 h-8 text-green-500" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-zinc-950">Password Reset!</h2>
                <p className="text-zinc-600 font-medium">
                  {resetPasswordData.email_sent ? 'Email Sent' : 'Copy Password'}
                </p>
              </div>
            </div>
            
            {resetPasswordData.email_sent ? (
              <p className="text-zinc-700 font-medium mb-4">
                ✅ Password reset email sent to <strong>{resetPasswordData.user_email}</strong>
              </p>
            ) : (
              <p className="text-orange-600 font-medium mb-4">
                ⚠️ Email failed to send. Please copy the password below and share it with the user.
              </p>
            )}
            
            <div className="bg-violet-50 neo-border rounded-xl p-4 mb-4">
              <p className="text-sm font-bold text-zinc-600 mb-2">New Password:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white neo-border px-4 py-3 rounded-lg font-mono text-lg font-bold text-violet-600">
                  {resetPasswordData.new_password}
                </code>
                <button
                  onClick={copyPassword}
                  className="bg-violet-500 text-white font-bold px-4 py-3 rounded-lg neo-border neo-shadow hover:translate-y-1 hover:shadow-none"
                  data-testid="copy-password-button"
                >
                  Copy
                </button>
              </div>
            </div>
            
            <button
              onClick={() => {
                setShowPasswordModal(false);
                setResetPasswordData(null);
                setSelectedUser(null);
              }}
              className="w-full bg-violet-500 text-white font-bold py-3 rounded-xl neo-border neo-shadow hover:translate-y-1 hover:shadow-none"
              data-testid="close-password-modal-button"
            >
              Close
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default UserManagement;
