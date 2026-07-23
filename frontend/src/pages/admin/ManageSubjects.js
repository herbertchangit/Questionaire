import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { ArrowLeft, BookMarked, Edit3, Layers, Plus, School, Trash2, X } from 'lucide-react';

import { useLanguage } from '../../context/LanguageContext';
import { API_URL } from '../../lib/api';

const emptySubject = {
  name_en: '',
  name_zh: '',
  school_id: '',
  form_name: '',
  chapters: [''],
  icon: 'book-open',
  color: '#8B5CF6',
  is_active: true
};

function authHeaders() {
  return { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };
}

function cleanChapters(chapters) {
  return (chapters || []).map((chapter) => String(chapter).trim()).filter(Boolean);
}

function schoolForms(school) {
  if (!school) return [];
  if (Array.isArray(school.form_classes) && school.form_classes.length > 0) {
    return school.form_classes.map((group) => group.form_name).filter(Boolean);
  }
  return (school.forms || []).filter(Boolean);
}

function ManageSubjects() {
  const [subjects, setSubjects] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [formData, setFormData] = useState(emptySubject);
  const navigate = useNavigate();
  const { language, t } = useLanguage();

  const copy = useMemo(() => {
    const zh = language === 'zh';
    return {
      title: zh ? '管理科目' : 'Manage Subjects',
      subtitle: zh ? '按学校、年级和章节管理科目' : 'Manage subjects by school, form and chapter',
      add: zh ? '添加科目' : 'Add Subject',
      edit: zh ? '编辑科目' : 'Edit Subject',
      empty: zh ? '暂无科目' : 'No subjects yet',
      loading: zh ? '加载中...' : 'Loading...',
      subjectEn: zh ? '科目名称 (English)' : 'Subject Name (English)',
      subjectZh: zh ? '科目名称 (中文)' : 'Subject Name (Chinese)',
      school: zh ? '学校' : 'School',
      form: zh ? '年级' : 'Form',
      chapter: zh ? '章节' : 'Chapter',
      chapters: zh ? '章节' : 'Chapters',
      selectSchool: zh ? '请选择学校' : 'Select school',
      selectForm: zh ? '请选择年级' : 'Select form',
      noForms: zh ? '此学校暂无年级' : 'This school has no forms',
      active: zh ? '启用' : 'Active',
      inactive: zh ? '停用' : 'Inactive',
      cancel: zh ? '取消' : 'Cancel',
      save: zh ? '保存' : 'Save',
      update: zh ? '更新' : 'Update',
      deleteConfirm: zh ? '删除这个科目？' : 'Delete this subject?',
      loadError: zh ? '无法加载科目' : 'Failed to load subjects',
      saveError: zh ? '无法保存科目' : 'Failed to save subject',
      deleteError: zh ? '无法删除科目' : 'Failed to delete subject',
      saved: zh ? '科目已保存' : 'Subject saved',
      deleted: zh ? '科目已删除' : 'Subject deleted'
    };
  }, [language]);

  const selectedSchool = schools.find((school) => school.id === formData.school_id);
  const formOptions = schoolForms(selectedSchool);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [subjectsRes, schoolsRes] = await Promise.all([
        axios.get(`${API_URL}/api/admin/subjects`, authHeaders()),
        axios.get(`${API_URL}/api/admin/schools`, authHeaders())
      ]);
      setSubjects(subjectsRes.data || []);
      setSchools(schoolsRes.data || []);
    } catch (error) {
      toast.error(copy.loadError);
    } finally {
      setLoading(false);
    }
  };

  const openAddForm = () => {
    const firstSchool = schools[0];
    const forms = schoolForms(firstSchool);
    setEditingSubject(null);
    setFormData({
      ...emptySubject,
      school_id: firstSchool?.id || '',
      form_name: forms[0] || ''
    });
    setShowForm(true);
  };

  const openEditForm = (subject) => {
    setEditingSubject(subject);
    setFormData({
      name_en: subject.name_en || '',
      name_zh: subject.name_zh || '',
      school_id: subject.school_id || '',
      form_name: subject.form_name || '',
      chapters: subject.chapters?.length ? subject.chapters : [''],
      icon: subject.icon || 'book-open',
      color: subject.color || '#8B5CF6',
      is_active: subject.is_active !== false
    });
    setShowForm(true);
  };

  const updateSchool = (schoolId) => {
    const school = schools.find((item) => item.id === schoolId);
    const forms = schoolForms(school);
    setFormData((current) => ({
      ...current,
      school_id: schoolId,
      form_name: forms[0] || ''
    }));
  };

  const updateChapter = (index, value) => {
    setFormData((current) => ({
      ...current,
      chapters: current.chapters.map((chapter, chapterIndex) => (
        chapterIndex === index ? value : chapter
      ))
    }));
  };

  const addChapter = () => {
    setFormData((current) => ({ ...current, chapters: [...current.chapters, ''] }));
  };

  const removeChapter = (index) => {
    setFormData((current) => {
      const chapters = current.chapters.filter((_, chapterIndex) => chapterIndex !== index);
      return { ...current, chapters: chapters.length ? chapters : [''] };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const payload = {
      ...formData,
      name_zh: formData.name_zh || formData.name_en,
      chapters: cleanChapters(formData.chapters)
    };

    try {
      if (editingSubject) {
        await axios.put(`${API_URL}/api/admin/subjects/${editingSubject.id}`, payload, authHeaders());
      } else {
        await axios.post(`${API_URL}/api/admin/subjects`, payload, authHeaders());
      }
      toast.success(copy.saved);
      setShowForm(false);
      await fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || copy.saveError);
    }
  };

  const handleDelete = async (subjectId) => {
    if (!window.confirm(copy.deleteConfirm)) return;
    try {
      await axios.delete(`${API_URL}/api/admin/subjects/${subjectId}`, authHeaders());
      toast.success(copy.deleted);
      await fetchData();
    } catch (error) {
      toast.error(copy.deleteError);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-pink-50" data-testid="manage-subjects">
      <header className="border-b-2 border-zinc-200 bg-white/80 px-4 py-6 backdrop-blur-md">
        <div className="mx-auto max-w-5xl">
          <button
            onClick={() => navigate('/dashboard')}
            className="mb-4 flex items-center gap-2 font-medium text-zinc-600 hover:text-zinc-900"
            data-testid="subjects-back-btn"
          >
            <ArrowLeft className="h-5 w-5" />
            {t('back')}
          </button>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-zinc-900">{copy.title}</h1>
              <p className="mt-1 text-sm font-medium text-zinc-500">{copy.subtitle}</p>
            </div>
            <button
              onClick={openAddForm}
              className="flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-2 font-bold text-white hover:bg-violet-600"
              data-testid="add-subject-btn"
            >
              <Plus className="h-5 w-5" />
              {copy.add}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {loading ? (
          <div className="py-12 text-center text-zinc-500">{copy.loading}</div>
        ) : subjects.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-zinc-200 bg-white py-12 text-center text-zinc-500">
            {copy.empty}
          </div>
        ) : (
          <div className="grid gap-3">
            {subjects.map((subject, index) => (
              <motion.div
                key={subject.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="rounded-xl border-2 border-zinc-200 bg-white p-4"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-3">
                      <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                        style={{ backgroundColor: `${subject.color || '#8B5CF6'}20` }}
                      >
                        <BookMarked className="h-6 w-6" style={{ color: subject.color || '#8B5CF6' }} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-xl font-black text-zinc-900">
                            {language === 'zh' ? subject.name_zh : subject.name_en}
                          </h2>
                          <span className={`rounded-full px-2 py-1 text-xs font-black ${
                            subject.is_active === false
                              ? 'bg-zinc-100 text-zinc-500'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {subject.is_active === false ? copy.inactive : copy.active}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-sm font-bold text-zinc-500">
                          <span className="flex items-center gap-1">
                            <School className="h-4 w-4" />
                            {subject.school_name || '-'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Layers className="h-4 w-4" />
                            {subject.form_name || '-'}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {(subject.chapters || []).map((chapter) => (
                            <span
                              key={chapter}
                              className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700"
                            >
                              {chapter}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditForm(subject)}
                      className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"
                      title={copy.edit}
                    >
                      <Edit3 className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(subject.id)}
                      className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                      title="Delete"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6"
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="text-2xl font-black text-zinc-900">
                {editingSubject ? copy.edit : copy.add}
              </h2>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100"
                title={copy.cancel}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-bold text-zinc-700">{copy.subjectEn}</label>
                  <input
                    value={formData.name_en}
                    onChange={(event) => setFormData({ ...formData, name_en: event.target.value })}
                    className="w-full rounded-lg border-2 border-zinc-200 px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-bold text-zinc-700">{copy.subjectZh}</label>
                  <input
                    value={formData.name_zh}
                    onChange={(event) => setFormData({ ...formData, name_zh: event.target.value })}
                    className="w-full rounded-lg border-2 border-zinc-200 px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-bold text-zinc-700">{copy.school}</label>
                  <select
                    value={formData.school_id}
                    onChange={(event) => updateSchool(event.target.value)}
                    className="w-full rounded-lg border-2 border-zinc-200 px-3 py-2"
                    required
                  >
                    <option value="" disabled>{copy.selectSchool}</option>
                    {schools.map((school) => (
                      <option key={school.id} value={school.id}>
                        {school.school_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-bold text-zinc-700">{copy.form}</label>
                  <select
                    value={formData.form_name}
                    onChange={(event) => setFormData({ ...formData, form_name: event.target.value })}
                    className="w-full rounded-lg border-2 border-zinc-200 px-3 py-2"
                    disabled={formOptions.length === 0}
                    required
                  >
                    {formOptions.length === 0 ? (
                      <option value="">{copy.noForms}</option>
                    ) : (
                      <>
                        <option value="" disabled>{copy.selectForm}</option>
                        {formOptions.map((formName) => (
                          <option key={formName} value={formName}>{formName}</option>
                        ))}
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-[1fr_160px_140px]">
                <div>
                  <label className="mb-1 block text-sm font-bold text-zinc-700">Icon</label>
                  <input
                    value={formData.icon}
                    onChange={(event) => setFormData({ ...formData, icon: event.target.value })}
                    className="w-full rounded-lg border-2 border-zinc-200 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-bold text-zinc-700">Color</label>
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(event) => setFormData({ ...formData, color: event.target.value })}
                    className="h-[42px] w-full rounded-lg border-2 border-zinc-200 px-2 py-1"
                  />
                </div>
                <label className="flex items-end gap-2 pb-2 text-sm font-bold text-zinc-700">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(event) => setFormData({ ...formData, is_active: event.target.checked })}
                    className="h-5 w-5 rounded border-zinc-300 text-violet-600"
                  />
                  {copy.active}
                </label>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="block text-sm font-bold text-zinc-700">{copy.chapters}</label>
                  <button
                    type="button"
                    onClick={addChapter}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-bold text-violet-600 hover:bg-violet-50"
                  >
                    <Plus className="h-4 w-4" />
                    {copy.chapter}
                  </button>
                </div>
                <div className="grid gap-2">
                  {formData.chapters.map((chapter, index) => (
                    <div key={`chapter-${index}`} className="flex gap-2">
                      <input
                        value={chapter}
                        onChange={(event) => updateChapter(index, event.target.value)}
                        className="min-w-0 flex-1 rounded-lg border-2 border-zinc-200 px-3 py-2"
                        placeholder={`${copy.chapter} ${index + 1}`}
                      />
                      <button
                        type="button"
                        onClick={() => removeChapter(index)}
                        className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                        title="Remove"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 rounded-xl border-2 border-zinc-200 py-3 font-bold hover:bg-zinc-50"
                >
                  {copy.cancel}
                </button>
                <button
                  type="submit"
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-violet-500 py-3 font-bold text-white hover:bg-violet-600"
                >
                  {editingSubject ? copy.update : copy.save}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default ManageSubjects;
