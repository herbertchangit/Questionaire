import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useLanguage } from '../../context/LanguageContext';
import { ArrowLeft, Plus, Upload, Trash2, Edit, Search } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

function ManageQuestions() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ subject: '', level: '' });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    subject_id: 'subj_bm',
    level_num: 1,
    stage_num: 1,
    text_en: '',
    text_zh: '',
    options_en: ['', '', '', ''],
    options_zh: ['', '', '', ''],
    correct_answer: 0,
    points: 10
  });
  const navigate = useNavigate();
  const { language, t } = useLanguage();

  useEffect(() => {
    fetchQuestions();
  }, [filter]);

  const fetchQuestions = async () => {
    const token = localStorage.getItem('token');
    try {
      let url = `${API_URL}/api/admin/questions`;
      const params = new URLSearchParams();
      if (filter.subject) params.append('subject_id', filter.subject);
      if (filter.level) params.append('level_num', filter.level);
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQuestions(response.data);
    } catch (error) {
      toast.error('Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    try {
      if (editingId) {
        await axios.put(`${API_URL}/api/admin/questions/${editingId}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Question updated');
      } else {
        await axios.post(`${API_URL}/api/admin/questions`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Question created');
      }
      setShowForm(false);
      setEditingId(null);
      resetForm();
      fetchQuestions();
    } catch (error) {
      toast.error('Failed to save question');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this question?')) return;
    const token = localStorage.getItem('token');
    
    try {
      await axios.delete(`${API_URL}/api/admin/questions/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Question deleted');
      fetchQuestions();
    } catch (error) {
      toast.error('Failed to delete question');
    }
  };

  const handleEdit = (question) => {
    setFormData({
      subject_id: question.subject_id,
      level_num: question.level_num,
      stage_num: question.stage_num,
      text_en: question.text_en,
      text_zh: question.text_zh,
      options_en: question.options_en,
      options_zh: question.options_zh,
      correct_answer: question.correct_answer,
      points: question.points
    });
    setEditingId(question.id);
    setShowForm(true);
  };

  const handleBulkUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await axios.post(`${API_URL}/api/admin/questions/bulk`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      toast.success(`Uploaded ${response.data.uploaded} questions`);
      if (response.data.errors?.length > 0) {
        toast.error(`${response.data.errors.length} errors occurred`);
      }
      fetchQuestions();
    } catch (error) {
      toast.error('Upload failed');
    }
    e.target.value = '';
  };

  const resetForm = () => {
    setFormData({
      subject_id: 'subj_bm',
      level_num: 1,
      stage_num: 1,
      text_en: '',
      text_zh: '',
      options_en: ['', '', '', ''],
      options_zh: ['', '', '', ''],
      correct_answer: 0,
      points: 10
    });
  };

  const subjects = [
    { id: 'subj_bm', name: language === 'zh' ? '马来语' : 'Bahasa Malaysia' },
    { id: 'subj_history', name: language === 'zh' ? '历史' : 'History' },
    { id: 'subj_science', name: language === 'zh' ? '科学' : 'Science' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-pink-50" data-testid="manage-questions">
      <header className="bg-white/80 backdrop-blur-md border-b-2 border-zinc-200 py-6 px-4">
        <div className="max-w-5xl mx-auto">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2 text-zinc-600 hover:text-zinc-900 mb-4 font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            {t('back')}
          </button>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-black text-zinc-900">{t('manage_questions')}</h1>
            <div className="flex gap-2">
              <label className="bg-green-500 text-white font-bold px-4 py-2 rounded-xl cursor-pointer hover:bg-green-600 flex items-center gap-2">
                <Upload className="w-5 h-5" />
                {t('bulk_upload')}
                <input type="file" accept=".csv" onChange={handleBulkUpload} className="hidden" />
              </label>
              <button
                onClick={() => { setShowForm(true); setEditingId(null); resetForm(); }}
                className="bg-violet-500 text-white font-bold px-4 py-2 rounded-xl hover:bg-violet-600 flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                {t('add_question')}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <select
            value={filter.subject}
            onChange={(e) => setFilter({ ...filter, subject: e.target.value })}
            className="px-4 py-2 rounded-xl border-2 border-zinc-200 font-medium"
          >
            <option value="">{language === 'zh' ? '所有科目' : 'All Subjects'}</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select
            value={filter.level}
            onChange={(e) => setFilter({ ...filter, level: e.target.value })}
            className="px-4 py-2 rounded-xl border-2 border-zinc-200 font-medium"
          >
            <option value="">{language === 'zh' ? '所有等级' : 'All Levels'}</option>
            {[1,2,3,4,5].map(l => <option key={l} value={l}>Level {l}</option>)}
          </select>
        </div>

        {/* Questions List */}
        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : questions.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">No questions found</div>
        ) : (
          <div className="space-y-3">
            {questions.map((q, i) => (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.02 * i }}
                className="bg-white rounded-xl p-4 border-2 border-zinc-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex gap-2 mb-2">
                      <span className="text-xs font-bold bg-violet-100 text-violet-700 px-2 py-1 rounded">
                        {subjects.find(s => s.id === q.subject_id)?.name}
                      </span>
                      <span className="text-xs font-bold bg-zinc-100 text-zinc-600 px-2 py-1 rounded">
                        L{q.level_num} S{q.stage_num}
                      </span>
                    </div>
                    <p className="font-medium text-zinc-900">{language === 'zh' ? q.text_zh : q.text_en}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(q)}
                      className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(q.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-2xl font-black mb-4">
              {editingId ? 'Edit Question' : 'Add Question'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-1">Subject</label>
                  <select
                    value={formData.subject_id}
                    onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border-2 border-zinc-200"
                  >
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">Level</label>
                  <select
                    value={formData.level_num}
                    onChange={(e) => setFormData({ ...formData, level_num: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border-2 border-zinc-200"
                  >
                    {[1,2,3,4,5].map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">Stage</label>
                  <select
                    value={formData.stage_num}
                    onChange={(e) => setFormData({ ...formData, stage_num: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border-2 border-zinc-200"
                  >
                    {[1,2,3,4,5].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">Question (English)</label>
                <textarea
                  value={formData.text_en}
                  onChange={(e) => setFormData({ ...formData, text_en: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border-2 border-zinc-200"
                  rows={2}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-1">Question (中文)</label>
                <textarea
                  value={formData.text_zh}
                  onChange={(e) => setFormData({ ...formData, text_zh: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border-2 border-zinc-200"
                  rows={2}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-1">Options (English)</label>
                  {formData.options_en.map((opt, i) => (
                    <input
                      key={i}
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...formData.options_en];
                        newOpts[i] = e.target.value;
                        setFormData({ ...formData, options_en: newOpts });
                      }}
                      className="w-full px-3 py-2 rounded-lg border-2 border-zinc-200 mb-2"
                      placeholder={`Option ${String.fromCharCode(65 + i)}`}
                      required
                    />
                  ))}
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">Options (中文)</label>
                  {formData.options_zh.map((opt, i) => (
                    <input
                      key={i}
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...formData.options_zh];
                        newOpts[i] = e.target.value;
                        setFormData({ ...formData, options_zh: newOpts });
                      }}
                      className="w-full px-3 py-2 rounded-lg border-2 border-zinc-200 mb-2"
                      placeholder={`选项 ${String.fromCharCode(65 + i)}`}
                      required
                    />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-1">Correct Answer</label>
                  <select
                    value={formData.correct_answer}
                    onChange={(e) => setFormData({ ...formData, correct_answer: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border-2 border-zinc-200"
                  >
                    {[0,1,2,3].map(i => <option key={i} value={i}>Option {String.fromCharCode(65 + i)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">Points</label>
                  <input
                    type="number"
                    value={formData.points}
                    onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border-2 border-zinc-200"
                    min={1}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditingId(null); }}
                  className="flex-1 py-3 rounded-xl border-2 border-zinc-200 font-bold hover:bg-zinc-50"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-violet-500 text-white font-bold hover:bg-violet-600"
                >
                  {t('save')}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default ManageQuestions;
