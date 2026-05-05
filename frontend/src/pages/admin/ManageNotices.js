import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useLanguage } from '../../context/LanguageContext';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

function ManageNotices() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title_en: '',
    title_zh: '',
    content_en: '',
    content_zh: '',
    type: 'announcement'
  });
  const navigate = useNavigate();
  const { language, t } = useLanguage();

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get(`${API_URL}/api/admin/notices`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotices(response.data);
    } catch (error) {
      toast.error('Failed to load notices');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    try {
      await axios.post(`${API_URL}/api/admin/notices`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Notice created');
      setShowForm(false);
      setFormData({ title_en: '', title_zh: '', content_en: '', content_zh: '', type: 'announcement' });
      fetchNotices();
    } catch (error) {
      toast.error('Failed to create notice');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this notice?')) return;
    const token = localStorage.getItem('token');
    
    try {
      await axios.delete(`${API_URL}/api/admin/notices/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Notice deleted');
      fetchNotices();
    } catch (error) {
      toast.error('Failed to delete notice');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-pink-50" data-testid="manage-notices">
      <header className="bg-white/80 backdrop-blur-md border-b-2 border-zinc-200 py-6 px-4">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2 text-zinc-600 hover:text-zinc-900 mb-4 font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            {t('back')}
          </button>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-black text-zinc-900">{t('manage_notices')}</h1>
            <button
              onClick={() => setShowForm(true)}
              className="bg-violet-500 text-white font-bold px-4 py-2 rounded-xl hover:bg-violet-600 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Notice
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : notices.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">No notices</div>
        ) : (
          <div className="space-y-3">
            {notices.map((notice) => (
              <motion.div
                key={notice.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-xl p-4 border-2 border-zinc-200"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className={`text-xs font-bold px-2 py-1 rounded ${
                      notice.type === 'announcement' ? 'bg-violet-100 text-violet-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {notice.type}
                    </span>
                    <h3 className="font-bold text-zinc-900 mt-2">
                      {language === 'zh' ? notice.title_zh : notice.title_en}
                    </h3>
                    <p className="text-sm text-zinc-500 mt-1">
                      {language === 'zh' ? notice.content_zh : notice.content_en}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(notice.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 w-full max-w-lg"
          >
            <h2 className="text-2xl font-black mb-4">Add Notice</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1">Title (English)</label>
                <input
                  value={formData.title_en}
                  onChange={(e) => setFormData({ ...formData, title_en: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border-2 border-zinc-200"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Title (中文)</label>
                <input
                  value={formData.title_zh}
                  onChange={(e) => setFormData({ ...formData, title_zh: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border-2 border-zinc-200"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Content (English)</label>
                <textarea
                  value={formData.content_en}
                  onChange={(e) => setFormData({ ...formData, content_en: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border-2 border-zinc-200"
                  rows={3}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Content (中文)</label>
                <textarea
                  value={formData.content_zh}
                  onChange={(e) => setFormData({ ...formData, content_zh: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border-2 border-zinc-200"
                  rows={3}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border-2 border-zinc-200"
                >
                  <option value="announcement">Announcement</option>
                  <option value="upcoming">Upcoming</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-3 rounded-xl border-2 border-zinc-200 font-bold hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-violet-500 text-white font-bold hover:bg-violet-600"
                >
                  Save
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default ManageNotices;
