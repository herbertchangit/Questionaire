import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Building2,
  ChevronRight,
  Edit3,
  GraduationCap,
  MapPin,
  Plus,
  Save,
  School,
  Trash2,
  Upload,
  X
} from 'lucide-react';

import { useLanguage } from '../../context/LanguageContext';
import { API_URL } from '../../lib/api';

const emptyForm = {
  school_name: '',
  address: '',
  education_level: '',
  school_logo: ''
};

const organizationItems = [
  {
    label: 'Campus',
    children: ['Academic Year', 'Grades', 'Classes', 'Teachers', 'Students', 'Facilities']
  },
  { label: 'Departments' },
  { label: 'Subjects' },
  { label: 'Fees' },
  { label: 'Settings' }
];

function labels(language) {
  const zh = language === 'zh';
  return {
    title: zh ? '管理学校' : 'Manage Schools',
    subtitle: zh ? '设置学校资料、徽标和组织架构' : 'Set up school profiles, logos and structure',
    add: zh ? '添加学校' : 'Add School',
    edit: zh ? '编辑学校' : 'Edit School',
    empty: zh ? '暂无学校' : 'No schools yet',
    loading: zh ? '加载中...' : 'Loading...',
    schoolName: zh ? '学校名称' : 'School Name',
    address: zh ? '地址' : 'Address',
    educationLevel: zh ? '教育阶段' : 'Education Level',
    logo: zh ? '学校徽标' : 'School Logo',
    upload: zh ? '上传徽标' : 'Upload Logo',
    removeLogo: zh ? '移除徽标' : 'Remove Logo',
    organization: zh ? '组织架构' : 'Organization',
    cancel: zh ? '取消' : 'Cancel',
    save: zh ? '保存' : 'Save',
    update: zh ? '更新' : 'Update',
    deleteConfirm: zh ? '删除这所学校？' : 'Delete this school?',
    created: zh ? '学校已创建' : 'School created',
    updated: zh ? '学校已更新' : 'School updated',
    deleted: zh ? '学校已删除' : 'School deleted',
    loadError: zh ? '无法加载学校' : 'Failed to load schools',
    saveError: zh ? '无法保存学校' : 'Failed to save school',
    deleteError: zh ? '无法删除学校' : 'Failed to delete school',
    logoError: zh ? '请选择图片文件' : 'Please choose an image file',
    logoTooLarge: zh ? '图片太大，请使用 1MB 以下的图片' : 'Image too large. Please use a file under 1MB.',
    organizationRoot: zh ? '组织' : 'Organization',
    schoolRoot: zh ? '学校' : 'School'
  };
}

function authHeaders() {
  return {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  };
}

function OrganizationTree({ copy }) {
  return (
    <div className="rounded-xl border-2 border-zinc-200 bg-zinc-50 p-4">
      <div className="flex items-center gap-2 font-black text-zinc-900">
        <Building2 className="h-5 w-5 text-violet-500" />
        {copy.organizationRoot}
      </div>
      <div className="ml-3 mt-3 border-l-2 border-zinc-200 pl-4">
        <div className="flex items-center gap-2 font-bold text-zinc-800">
          <School className="h-4 w-4 text-blue-500" />
          {copy.schoolRoot}
        </div>
        <div className="mt-3 space-y-2">
          {organizationItems.map((item) => (
            <div key={item.label}>
              <div className="flex items-center gap-2 text-sm font-bold text-zinc-700">
                <ChevronRight className="h-4 w-4 text-zinc-400" />
                {item.label}
              </div>
              {item.children && (
                <div className="ml-6 mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
                  {item.children.map((child) => (
                    <span key={child} className="text-sm text-zinc-500">
                      {child}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ManageSchools() {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSchool, setEditingSchool] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const copy = useMemo(() => labels(language), [language]);

  const fetchSchools = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/schools`, authHeaders());
      setSchools(response.data);
    } catch (error) {
      toast.error(copy.loadError);
    } finally {
      setLoading(false);
    }
  }, [copy.loadError]);

  useEffect(() => {
    fetchSchools();
  }, [fetchSchools]);

  const openCreate = () => {
    setEditingSchool(null);
    setFormData(emptyForm);
    setShowForm(true);
  };

  const openEdit = (schoolRecord) => {
    setEditingSchool(schoolRecord);
    setFormData({
      school_name: schoolRecord.school_name || '',
      address: schoolRecord.address || '',
      education_level: schoolRecord.education_level || '',
      school_logo: schoolRecord.school_logo || ''
    });
    setShowForm(true);
  };

  const handleLogoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error(copy.logoError);
      return;
    }
    if (file.size > 1_000_000) {
      toast.error(copy.logoTooLarge);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFormData((current) => ({ ...current, school_logo: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      if (editingSchool) {
        await axios.put(`${API_URL}/api/admin/schools/${editingSchool.id}`, formData, authHeaders());
        toast.success(copy.updated);
      } else {
        await axios.post(`${API_URL}/api/admin/schools`, formData, authHeaders());
        toast.success(copy.created);
      }
      setShowForm(false);
      setEditingSchool(null);
      setFormData(emptyForm);
      fetchSchools();
    } catch (error) {
      toast.error(error.response?.data?.detail || copy.saveError);
    }
  };

  const handleDelete = async (schoolId) => {
    if (!window.confirm(copy.deleteConfirm)) return;
    try {
      await axios.delete(`${API_URL}/api/admin/schools/${schoolId}`, authHeaders());
      toast.success(copy.deleted);
      fetchSchools();
    } catch (error) {
      toast.error(copy.deleteError);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-pink-50" data-testid="manage-schools">
      <header className="border-b-2 border-zinc-200 bg-white/80 px-4 py-6 backdrop-blur-md">
        <div className="mx-auto max-w-5xl">
          <button
            onClick={() => navigate('/admin')}
            className="mb-4 flex items-center gap-2 font-medium text-zinc-600 hover:text-zinc-900"
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
              onClick={openCreate}
              className="flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-2 font-bold text-white hover:bg-violet-600"
            >
              <Plus className="h-5 w-5" />
              {copy.add}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-6 px-4 py-6 lg:grid-cols-[1fr_320px]">
        <section>
          {loading ? (
            <div className="py-12 text-center text-zinc-500">{copy.loading}</div>
          ) : schools.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-zinc-200 bg-white py-12 text-center text-zinc-500">
              {copy.empty}
            </div>
          ) : (
            <div className="space-y-3">
              {schools.map((schoolRecord, index) => (
                <motion.div
                  key={schoolRecord.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className="rounded-xl border-2 border-zinc-200 bg-white p-4"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex gap-4">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-zinc-200 bg-zinc-50">
                        {schoolRecord.school_logo ? (
                          <img
                            src={schoolRecord.school_logo}
                            alt=""
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <School className="h-8 w-8 text-zinc-400" />
                        )}
                      </div>
                      <div>
                        <h2 className="text-xl font-black text-zinc-900">{schoolRecord.school_name}</h2>
                        <div className="mt-2 flex flex-wrap gap-3 text-sm text-zinc-500">
                          <span className="flex items-center gap-1">
                            <GraduationCap className="h-4 w-4" />
                            {schoolRecord.education_level}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {schoolRecord.address}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(schoolRecord)}
                        className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"
                        title={copy.edit}
                      >
                        <Edit3 className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(schoolRecord.id)}
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
        </section>

        <aside>
          <OrganizationTree copy={copy} />
        </aside>
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
                {editingSchool ? copy.edit : copy.add}
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
              <div>
                <label className="mb-1 block text-sm font-bold text-zinc-700">{copy.schoolName}</label>
                <input
                  value={formData.school_name}
                  onChange={(event) => setFormData({ ...formData, school_name: event.target.value })}
                  className="w-full rounded-lg border-2 border-zinc-200 px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold text-zinc-700">{copy.address}</label>
                <textarea
                  value={formData.address}
                  onChange={(event) => setFormData({ ...formData, address: event.target.value })}
                  className="w-full rounded-lg border-2 border-zinc-200 px-3 py-2"
                  rows={3}
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold text-zinc-700">{copy.educationLevel}</label>
                <input
                  value={formData.education_level}
                  onChange={(event) => setFormData({ ...formData, education_level: event.target.value })}
                  className="w-full rounded-lg border-2 border-zinc-200 px-3 py-2"
                  placeholder="Primary, Secondary, International..."
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-zinc-700">{copy.logo}</label>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border-2 border-zinc-200 bg-zinc-50">
                    {formData.school_logo ? (
                      <img src={formData.school_logo} alt="" className="h-full w-full object-contain" />
                    ) : (
                      <School className="h-9 w-9 text-zinc-400" />
                    )}
                  </div>
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border-2 border-zinc-200 px-4 py-2 font-bold text-zinc-700 hover:bg-zinc-50">
                    <Upload className="h-5 w-5" />
                    {copy.upload}
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                  </label>
                  {formData.school_logo && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, school_logo: '' })}
                      className="rounded-xl px-3 py-2 font-bold text-red-500 hover:bg-red-50"
                    >
                      {copy.removeLogo}
                    </button>
                  )}
                </div>
              </div>

              <OrganizationTree copy={copy} />

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
                  <Save className="h-5 w-5" />
                  {editingSchool ? copy.update : copy.save}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default ManageSchools;
