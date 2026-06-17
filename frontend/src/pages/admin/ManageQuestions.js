import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useLanguage } from '../../context/LanguageContext';
import { ArrowLeft, Plus, Upload, Trash2, Edit, Image as ImageIcon, Music, Download, ArrowUpNarrowWide, ArrowDownWideNarrow, Hash, Copy } from 'lucide-react';
import { SUBJECTS, getSubject } from '../../constants/subjects';
import QuestionForm from './manage-questions/QuestionForm';
import { exportQuestionsCsv } from './manage-questions/csvUtils';

const API_URL = process.env.REACT_APP_BACKEND_URL;

function ManageQuestions() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ subject: '', level: '' });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    subject_id: SUBJECTS[0].id,
    level_num: 1,
    stage_num: 1,
    text_en: '',
    text_zh: '',
    options_en: ['', '', '', ''],
    options_zh: ['', '', '', ''],
    correct_answer: 0,
    points: 10,
    difficulty: 'apprentice',
    sequence_number: 0,
    story_board_en: '',
    story_board_zh: '',
    image: null,
    audio: null
  });
  const [sortBy, setSortBy] = useState('sequence');  // sequence | level | stage
  const [sortDir, setSortDir] = useState('asc');
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
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

  const handleSaved = useCallback(() => {
    setShowForm(false);
    setEditingId(null);
    resetForm();
    fetchQuestions();
  }, []);

  const handleClose = useCallback(() => {
    setShowForm(false);
    setEditingId(null);
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this question?')) return;
    const token = localStorage.getItem('token');
    
    try {
      await axios.delete(`${API_URL}/api/admin/questions/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Question deleted');
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      fetchQuestions();
    } catch (error) {
      toast.error('Failed to delete question');
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (visibleIds) => {
    setSelectedIds((prev) => {
      const allSelected = visibleIds.length > 0 && visibleIds.every((id) => prev.has(id));
      if (allSelected) {
        const next = new Set(prev);
        visibleIds.forEach((id) => next.delete(id));
        return next;
      }
      const next = new Set(prev);
      visibleIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    const msg = language === 'zh'
      ? `确定要删除选中的 ${ids.length} 个问题吗？此操作无法撤销。`
      : `Delete ${ids.length} selected question${ids.length === 1 ? '' : 's'}? This cannot be undone.`;
    if (!window.confirm(msg)) return;
    const token = localStorage.getItem('token');
    setBulkDeleting(true);
    try {
      const res = await axios.post(
        `${API_URL}/api/admin/questions/bulk-delete`,
        { ids },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(
        language === 'zh'
          ? `已删除 ${res.data?.deleted ?? ids.length} 个问题`
          : `Deleted ${res.data?.deleted ?? ids.length} question${(res.data?.deleted ?? ids.length) === 1 ? '' : 's'}`
      );
      setSelectedIds(new Set());
      fetchQuestions();
    } catch (err) {
      toast.error(err.response?.data?.detail || (language === 'zh' ? '批量删除失败' : 'Bulk delete failed'));
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleDuplicate = async (q) => {
    const token = localStorage.getItem('token');
    const suffixEn = ' (copy)';
    const suffixZh = ' (副本)';
    const payload = {
      subject_id: q.subject_id,
      level_num: q.level_num,
      stage_num: q.stage_num,
      text_en: `${q.text_en || ''}${suffixEn}`.trim(),
      text_zh: q.text_zh ? `${q.text_zh}${suffixZh}` : `${q.text_en || ''}${suffixEn}`.trim(),
      options_en: Array.isArray(q.options_en) ? [...q.options_en] : ['', '', '', ''],
      options_zh: Array.isArray(q.options_zh) ? [...q.options_zh] : ['', '', '', ''],
      correct_answer: q.correct_answer ?? 0,
      points: q.points ?? 10,
      difficulty: q.difficulty || 'apprentice',
      sequence_number: (q.sequence_number ?? 0) + 1,
      story_board_en: q.story_board_en || '',
      story_board_zh: q.story_board_zh || '',
      image: q.image || null,
      audio: q.audio || null
    };
    try {
      await axios.post(`${API_URL}/api/admin/questions`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(language === 'zh' ? '问题已复制' : 'Question duplicated');
      fetchQuestions();
    } catch (err) {
      toast.error(err.response?.data?.detail || (language === 'zh' ? '复制失败' : 'Failed to duplicate'));
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
      points: question.points,
      difficulty: question.difficulty || 'apprentice',
      sequence_number: question.sequence_number ?? 0,
      story_board_en: question.story_board_en || '',
      story_board_zh: question.story_board_zh || '',
      image: question.image || null,
      audio: question.audio || null
    });
    setEditingId(question.id);
    setShowForm(true);
  };

  const handleSequenceChange = async (questionId, newSeq) => {
    const token = localStorage.getItem('token');
    const seq = Math.max(0, parseInt(newSeq) || 0);
    try {
      await axios.patch(
        `${API_URL}/api/admin/questions/${questionId}/sequence`,
        { sequence_number: seq },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setQuestions((prev) => prev.map((q) => (q.id === questionId ? { ...q, sequence_number: seq } : q)));
    } catch (err) {
      toast.error(language === 'zh' ? '更新序号失败' : 'Failed to update sequence');
    }
  };

  // Sort questions by selected field & direction
  const sortedQuestions = useMemo(() => {
    const cmp = {
      sequence: (a, b) => (a.sequence_number ?? 0) - (b.sequence_number ?? 0),
      level: (a, b) => (a.level_num ?? 0) - (b.level_num ?? 0) || (a.stage_num ?? 0) - (b.stage_num ?? 0) || (a.sequence_number ?? 0) - (b.sequence_number ?? 0),
      stage: (a, b) => (a.stage_num ?? 0) - (b.stage_num ?? 0) || (a.level_num ?? 0) - (b.level_num ?? 0) || (a.sequence_number ?? 0) - (b.sequence_number ?? 0),
    };
    const fn = cmp[sortBy] || cmp.sequence;
    return [...questions].sort((a, b) => (sortDir === 'asc' ? fn(a, b) : -fn(a, b)));
  }, [questions, sortBy, sortDir]);

  // CSV: trigger browser download via shared util
  const handleExportCsv = () => {
    if (!questions.length) {
      toast.error(language === 'zh' ? '没有可导出的问题' : 'No questions to export');
      return;
    }
    const count = exportQuestionsCsv(questions, language);
    toast.success(language === 'zh' ? `已导出 ${count} 题` : `Exported ${count} questions`);
  };

  const handleBulkUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await axios.post(`${API_URL}/api/admin/questions/bulk`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const { uploaded, error_count, errors } = response.data;
      if (uploaded > 0) {
        toast.success(language === 'zh' ? `已上传 ${uploaded} 题` : `Uploaded ${uploaded} questions`);
      }
      if (error_count > 0) {
        // Show full list (first few inline + count)
        const preview = (errors || []).slice(0, 3).join(' · ');
        toast.error(
          (language === 'zh' ? `${error_count} 行被跳过` : `${error_count} rows skipped`) +
          (preview ? `\n${preview}` : ''),
          { duration: 8000 }
        );
        console.warn('Bulk upload skipped rows:', errors);
      }
      if (uploaded === 0 && error_count === 0) {
        toast.error(language === 'zh' ? 'CSV 没有有效行' : 'CSV had no valid rows');
      }
      fetchQuestions();
    } catch (error) {
      const detail = error.response?.data?.detail || error.message || 'Upload failed';
      toast.error(typeof detail === 'string' ? detail : 'Upload failed');
    }
    e.target.value = '';
  };

  const resetForm = () => {
    setFormData({
      subject_id: SUBJECTS[0].id,
      level_num: 1,
      stage_num: 1,
      text_en: '',
      text_zh: '',
      options_en: ['', '', '', ''],
      options_zh: ['', '', '', ''],
      correct_answer: 0,
      points: 10,
      difficulty: 'apprentice',
      sequence_number: 0,
      story_board_en: '',
      story_board_zh: '',
      image: null,
      audio: null
    });
  };

  const subjects = SUBJECTS.map((s) => ({
    id: s.id,
    name: language === 'zh' ? s.name_zh : s.name_en,
  }));

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
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleExportCsv}
                className="bg-blue-500 text-white font-bold px-4 py-2 rounded-xl hover:bg-blue-600 flex items-center gap-2"
                data-testid="export-csv-btn"
                title={language === 'zh' ? '导出为 CSV' : 'Export to CSV'}
              >
                <Download className="w-5 h-5" />
                {language === 'zh' ? '导出 CSV' : 'Export CSV'}
              </button>
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

        {/* Sort toolbar */}
        <div className="flex items-center gap-2 mb-4 flex-wrap" data-testid="questions-sort-toolbar">
          <label
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 border-zinc-200 hover:border-violet-500 hover:bg-violet-50 text-sm font-bold cursor-pointer select-none"
            title={language === 'zh' ? '全选/取消全选 (当前列表)' : 'Select all / clear (current list)'}
          >
            <input
              type="checkbox"
              data-testid="select-all-checkbox"
              className="w-4 h-4 accent-violet-500 cursor-pointer"
              checked={
                sortedQuestions.length > 0 &&
                sortedQuestions.every((q) => selectedIds.has(q.id))
              }
              ref={(el) => {
                if (!el) return;
                const visible = sortedQuestions.map((q) => q.id);
                const someSelected = visible.some((id) => selectedIds.has(id));
                const allSelected = visible.length > 0 && visible.every((id) => selectedIds.has(id));
                el.indeterminate = someSelected && !allSelected;
              }}
              onChange={() => toggleSelectAll(sortedQuestions.map((q) => q.id))}
            />
            <span>{language === 'zh' ? '全选' : 'Select all'}</span>
          </label>
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              data-testid="bulk-delete-btn"
              className="px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white text-sm font-bold flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              {bulkDeleting
                ? (language === 'zh' ? '删除中…' : 'Deleting…')
                : (language === 'zh'
                    ? `删除 ${selectedIds.size} 个`
                    : `Delete ${selectedIds.size} selected`)}
            </button>
          )}
          <span className="text-sm font-bold text-zinc-700">
            {language === 'zh' ? '排序方式:' : 'Sort by:'}
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            data-testid="questions-sort-by"
            className="px-3 py-1.5 rounded-lg border-2 border-zinc-200 text-sm font-medium bg-white focus:border-violet-500 focus:outline-none"
          >
            <option value="sequence">{language === 'zh' ? '序号' : 'Sequence Number'}</option>
            <option value="level">{language === 'zh' ? '关卡' : 'Level'}</option>
            <option value="stage">{language === 'zh' ? '阶段' : 'Stage'}</option>
          </select>
          <button
            type="button"
            onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
            data-testid="questions-sort-dir"
            className="px-3 py-1.5 rounded-lg border-2 border-zinc-200 hover:border-violet-500 hover:bg-violet-50 text-sm font-bold flex items-center gap-1.5"
            title={sortDir === 'asc' ? (language === 'zh' ? '升序' : 'Ascending') : (language === 'zh' ? '降序' : 'Descending')}
          >
            {sortDir === 'asc' ? <ArrowUpNarrowWide className="w-4 h-4 text-violet-500" /> : <ArrowDownWideNarrow className="w-4 h-4 text-violet-500" />}
            <span className="hidden md:inline">{sortDir === 'asc' ? (language === 'zh' ? '升序' : 'Asc') : (language === 'zh' ? '降序' : 'Desc')}</span>
          </button>
          <span className="text-xs text-zinc-400 ml-auto">
            {language === 'zh' ? `共 ${questions.length} 题` : `${questions.length} questions`}
          </span>
        </div>

        {/* Questions List */}
        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : questions.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">No questions found</div>
        ) : (
          <div className="space-y-3">
            {sortedQuestions.map((q, i) => (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.02 * i }}
                className={`bg-white rounded-xl p-4 border-2 transition-colors ${
                  selectedIds.has(q.id) ? 'border-violet-500 bg-violet-50/40' : 'border-zinc-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <input
                    type="checkbox"
                    data-testid={`select-question-${q.id}`}
                    aria-label={language === 'zh' ? '选择此问题' : 'Select this question'}
                    className="mt-1 w-4 h-4 accent-violet-500 cursor-pointer shrink-0"
                    checked={selectedIds.has(q.id)}
                    onChange={() => toggleSelect(q.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex gap-2 mb-2 flex-wrap items-center">
                      <label
                        className="text-xs font-bold bg-blue-50 text-blue-700 px-2 py-1 rounded flex items-center gap-1"
                        title={language === 'zh' ? '序号 (可编辑)' : 'Sequence number (editable)'}
                      >
                        <Hash className="w-3 h-3" />
                        <input
                          type="number"
                          defaultValue={q.sequence_number ?? 0}
                          min={0}
                          onBlur={(e) => {
                            const newVal = parseInt(e.target.value) || 0;
                            if (newVal !== (q.sequence_number ?? 0)) {
                              handleSequenceChange(q.id, newVal);
                            }
                          }}
                          onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                          data-testid={`seq-input-${q.id}`}
                          className="w-14 bg-transparent text-blue-700 font-bold text-xs text-center focus:outline-none focus:bg-white focus:rounded"
                        />
                      </label>
                      <span className="text-xs font-bold bg-violet-100 text-violet-700 px-2 py-1 rounded">
                        {getSubject(q.subject_id) 
                          ? (language === 'zh' ? getSubject(q.subject_id).name_zh : getSubject(q.subject_id).name_en)
                          : q.subject_id}
                      </span>
                      <span className="text-xs font-bold bg-zinc-100 text-zinc-600 px-2 py-1 rounded">
                        L{q.level_num} S{q.stage_num}
                      </span>
                      {q.difficulty && (
                        <span
                          className={`text-xs font-bold px-2 py-1 rounded ${
                            q.difficulty === 'legend'
                              ? 'bg-amber-100 text-amber-700'
                              : q.difficulty === 'master'
                              ? 'bg-violet-100 text-violet-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                          data-testid={`difficulty-badge-${q.id}`}
                        >
                          {q.difficulty}
                        </span>
                      )}
                      {(q.story_board_en || q.story_board_zh) && (
                        <span
                          className="text-xs font-bold bg-purple-100 text-purple-700 px-2 py-1 rounded"
                          data-testid={`badge-storyboard-${q.id}`}
                          title={(language === 'zh' ? q.story_board_zh : q.story_board_en) || ''}
                        >
                          {language === 'zh' ? '故事板' : 'Story'}
                        </span>
                      )}
                      {q.image && (
                        <span
                          className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded flex items-center gap-1"
                          data-testid={`badge-image-${q.id}`}
                        >
                          <ImageIcon className="w-3 h-3" /> Image
                        </span>
                      )}
                      {q.audio && (
                        <span
                          className="text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded flex items-center gap-1"
                          data-testid={`badge-audio-${q.id}`}
                        >
                          <Music className="w-3 h-3" /> Audio
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-zinc-900">{language === 'zh' ? q.text_zh : q.text_en}</p>
                    {(q.image || q.audio) && (
                      <div className="mt-2 flex items-center gap-3">
                        {q.image && (
                          <img
                            src={q.image}
                            alt="thumb"
                            className="w-16 h-16 object-cover rounded-lg border border-zinc-200"
                          />
                        )}
                        {q.audio && (
                          <audio controls src={q.audio} className="max-w-xs h-8" />
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleEdit(q)}
                      className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"
                      title={language === 'zh' ? '编辑' : 'Edit'}
                      data-testid={`edit-question-${q.id}`}
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDuplicate(q)}
                      className="p-2 text-violet-500 hover:bg-violet-50 rounded-lg"
                      title={language === 'zh' ? '复制问题' : 'Duplicate question'}
                      data-testid={`duplicate-question-${q.id}`}
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(q.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      title={language === 'zh' ? '删除' : 'Delete'}
                      data-testid={`delete-question-${q.id}`}
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
        <QuestionForm
          editingId={editingId}
          formData={formData}
          setFormData={setFormData}
          subjects={subjects}
          language={language}
          t={t}
          onSaved={handleSaved}
          onClose={handleClose}
        />
      )}
    </div>
  );
}

export default ManageQuestions;
