import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useLanguage } from '../context/LanguageContext';
import {
  ArrowLeft, Lock, Save, User, School, MapPin, Calendar,
  GraduationCap, BookOpen, UserCircle, Edit3, X
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

function Settings() {
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState(null);
  const [profileErrors, setProfileErrors] = useState({});

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { language, persistLanguage, t } = useLanguage();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    try {
      const r = await axios.get(`${API_URL}/api/user/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(r.data);
      setProfileForm({
        full_name: r.data.full_name || '',
        school_name: r.data.school_name || '',
        town: r.data.town || '',
        current_grade: r.data.current_grade || 1,
        date_of_birth: r.data.date_of_birth || '',
        language: r.data.language || 'en',
        latest_marks: {
          bm: r.data.latest_marks?.bm ?? 0,
          sejarah: r.data.latest_marks?.sejarah ?? 0,
          science: r.data.latest_marks?.science ?? 0
        }
      });
    } catch (e) {
      toast.error('Failed to load profile');
    }
  };

  const grades = [
    { value: 1, label: language === 'zh' ? '中一 (Form 1)' : 'Form 1' },
    { value: 2, label: language === 'zh' ? '中二 (Form 2)' : 'Form 2' },
    { value: 3, label: language === 'zh' ? '中三 (Form 3)' : 'Form 3' },
    { value: 4, label: language === 'zh' ? '中四 (Form 4)' : 'Form 4' },
    { value: 5, label: language === 'zh' ? '中五 (Form 5)' : 'Form 5' },
    { value: 6, label: language === 'zh' ? '中六 (Form 6)' : 'Form 6' }
  ];

  const updateProfileField = (field, value) => {
    setProfileForm((prev) => ({ ...prev, [field]: value }));
    if (profileErrors[field]) setProfileErrors((prev) => ({ ...prev, [field]: null }));
  };

  const updateMark = (subject, value) => {
    const num = value === '' ? '' : Math.min(100, Math.max(0, parseInt(value) || 0));
    setProfileForm((prev) => ({
      ...prev,
      latest_marks: { ...prev.latest_marks, [subject]: num }
    }));
  };

  const validateProfile = () => {
    const errs = {};
    if (!profileForm.full_name?.trim() || profileForm.full_name.length < 2)
      errs.full_name = language === 'zh' ? '至少2个字符' : 'At least 2 characters';
    if (!profileForm.school_name?.trim() || profileForm.school_name.length < 2)
      errs.school_name = language === 'zh' ? '至少2个字符' : 'At least 2 characters';
    if (!profileForm.town?.trim() || profileForm.town.length < 2)
      errs.town = language === 'zh' ? '至少2个字符' : 'At least 2 characters';
    if (!profileForm.date_of_birth) {
      errs.date_of_birth = language === 'zh' ? '请选择' : 'Required';
    } else {
      const dob = new Date(profileForm.date_of_birth);
      const age = Math.floor((new Date() - dob) / (365.25 * 24 * 60 * 60 * 1000));
      if (age < 10 || age > 20)
        errs.date_of_birth = language === 'zh' ? '年龄须在10-20岁' : 'Age must be 10-20';
    }
    ['bm', 'sejarah', 'science'].forEach((s) => {
      const v = profileForm.latest_marks[s];
      if (v === '' || v < 0 || v > 100)
        errs[s] = language === 'zh' ? '0-100' : '0-100';
    });
    setProfileErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (!validateProfile()) return;

    setSavingProfile(true);
    const token = localStorage.getItem('token');
    try {
      await axios.put(
        `${API_URL}/api/user/profile`,
        {
          full_name: profileForm.full_name.trim(),
          school_name: profileForm.school_name.trim(),
          town: profileForm.town.trim(),
          current_grade: profileForm.current_grade,
          date_of_birth: profileForm.date_of_birth,
          language: profileForm.language,
          latest_marks: {
            bm: parseInt(profileForm.latest_marks.bm) || 0,
            sejarah: parseInt(profileForm.latest_marks.sejarah) || 0,
            science: parseInt(profileForm.latest_marks.science) || 0
          }
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Apply newly-saved language across the app
      persistLanguage(profileForm.language);
      toast.success(language === 'zh' ? '个人资料已更新' : 'Profile updated');
      await fetchProfile();
      setEditing(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || (language === 'zh' ? '更新失败' : 'Update failed'));
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) return;
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      await axios.post(
        `${API_URL}/api/user/change-password`,
        { current_password: currentPassword, new_password: newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(language === 'zh' ? '密码已更新' : 'Password changed');
      setCurrentPassword('');
      setNewPassword('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  if (!profile || !profileForm) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 to-pink-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-violet-500"></div>
      </div>
    );
  }

  const subjectField = (key, labelEn, labelZh, color) => (
    <div>
      <label className="block text-sm font-bold text-zinc-700 mb-1">
        {language === 'zh' ? labelZh : labelEn}
      </label>
      <div className="relative">
        <BookOpen className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-${color}-500`} />
        <input
          type="number"
          min="0"
          max="100"
          value={profileForm.latest_marks[key]}
          onChange={(e) => updateMark(key, e.target.value)}
          disabled={!editing}
          data-testid={`marks-${key}-input`}
          className={`w-full pl-10 pr-4 py-2.5 rounded-xl border-2 focus:outline-none text-sm ${
            profileErrors[key] ? 'border-red-300' : 'border-zinc-200 focus:border-violet-500'
          } ${!editing ? 'bg-zinc-50 text-zinc-600' : ''}`}
        />
      </div>
      {profileErrors[key] && <p className="text-red-500 text-xs mt-1">{profileErrors[key]}</p>}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-pink-50" data-testid="settings-page">
      <header className="bg-white/80 backdrop-blur-md border-b-2 border-zinc-200 py-6 px-4">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-zinc-600 hover:text-zinc-900 mb-4 font-medium"
            data-testid="settings-back-btn"
          >
            <ArrowLeft className="w-5 h-5" />
            {t('back')}
          </button>
          <h1 className="text-3xl font-black text-zinc-900">{t('settings')}</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Profile */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 border-2 border-zinc-200"
          data-testid="profile-section"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <UserCircle className="w-6 h-6 text-violet-500" />
              <h2 className="text-xl font-bold text-zinc-900">
                {language === 'zh' ? '个人资料' : 'Profile'}
              </h2>
            </div>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1 text-sm font-bold text-violet-600 hover:text-violet-800"
                data-testid="edit-profile-btn"
              >
                <Edit3 className="w-4 h-4" />
                {language === 'zh' ? '编辑' : 'Edit'}
              </button>
            ) : (
              <button
                onClick={() => {
                  setEditing(false);
                  setProfileErrors({});
                  fetchProfile();
                }}
                className="flex items-center gap-1 text-sm font-bold text-zinc-500 hover:text-zinc-700"
                data-testid="cancel-edit-btn"
              >
                <X className="w-4 h-4" />
                {t('cancel')}
              </button>
            )}
          </div>

          <form onSubmit={handleProfileSave} className="space-y-4">
            {/* Username (read-only) */}
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-1">
                {language === 'zh' ? '用户名' : 'Username'}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input
                  type="text"
                  value={profile.username}
                  disabled
                  data-testid="profile-username"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-zinc-200 bg-zinc-50 text-zinc-500 text-sm"
                />
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                {language === 'zh' ? '用户名无法修改' : 'Username cannot be changed'}
              </p>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-1">
                {language === 'zh' ? '全名' : 'Full Name'} *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input
                  type="text"
                  value={profileForm.full_name}
                  onChange={(e) => updateProfileField('full_name', e.target.value)}
                  disabled={!editing}
                  data-testid="profile-full-name-input"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border-2 focus:outline-none text-sm ${
                    profileErrors.full_name ? 'border-red-300' : 'border-zinc-200 focus:border-violet-500'
                  } ${!editing ? 'bg-zinc-50 text-zinc-600' : ''}`}
                />
              </div>
              {profileErrors.full_name && (
                <p className="text-red-500 text-xs mt-1">{profileErrors.full_name}</p>
              )}
            </div>

            {/* School */}
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-1">
                {language === 'zh' ? '学校名称' : 'School Name'} *
              </label>
              <div className="relative">
                <School className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input
                  type="text"
                  value={profileForm.school_name}
                  onChange={(e) => updateProfileField('school_name', e.target.value)}
                  disabled={!editing}
                  data-testid="profile-school-input"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border-2 focus:outline-none text-sm ${
                    profileErrors.school_name ? 'border-red-300' : 'border-zinc-200 focus:border-violet-500'
                  } ${!editing ? 'bg-zinc-50 text-zinc-600' : ''}`}
                />
              </div>
              {profileErrors.school_name && (
                <p className="text-red-500 text-xs mt-1">{profileErrors.school_name}</p>
              )}
            </div>

            {/* Town & Grade */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-1">
                  {language === 'zh' ? '城镇' : 'Town'} *
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                  <input
                    type="text"
                    value={profileForm.town}
                    onChange={(e) => updateProfileField('town', e.target.value)}
                    disabled={!editing}
                    data-testid="profile-town-input"
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border-2 focus:outline-none text-sm ${
                      profileErrors.town ? 'border-red-300' : 'border-zinc-200 focus:border-violet-500'
                    } ${!editing ? 'bg-zinc-50 text-zinc-600' : ''}`}
                  />
                </div>
                {profileErrors.town && (
                  <p className="text-red-500 text-xs mt-1">{profileErrors.town}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-1">
                  {language === 'zh' ? '年级' : 'Current Grade'} *
                </label>
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                  <select
                    value={profileForm.current_grade}
                    onChange={(e) => updateProfileField('current_grade', parseInt(e.target.value))}
                    disabled={!editing}
                    data-testid="profile-grade-select"
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-zinc-200 focus:border-violet-500 focus:outline-none text-sm appearance-none ${
                      !editing ? 'bg-zinc-50 text-zinc-600' : ''
                    }`}
                  >
                    {grades.map((g) => (
                      <option key={g.value} value={g.value}>{g.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* DOB */}
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-1">
                {language === 'zh' ? '出生日期' : 'Date of Birth'} *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input
                  type="date"
                  value={profileForm.date_of_birth}
                  onChange={(e) => updateProfileField('date_of_birth', e.target.value)}
                  disabled={!editing}
                  data-testid="profile-dob-input"
                  max={new Date(new Date().setFullYear(new Date().getFullYear() - 10)).toISOString().split('T')[0]}
                  min={new Date(new Date().setFullYear(new Date().getFullYear() - 20)).toISOString().split('T')[0]}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border-2 focus:outline-none text-sm ${
                    profileErrors.date_of_birth ? 'border-red-300' : 'border-zinc-200 focus:border-violet-500'
                  } ${!editing ? 'bg-zinc-50 text-zinc-600' : ''}`}
                />
              </div>
              {profileErrors.date_of_birth && (
                <p className="text-red-500 text-xs mt-1">{profileErrors.date_of_birth}</p>
              )}
            </div>

            {/* Language (part of profile) */}
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-1">
                {language === 'zh' ? '语言' : 'Language'} *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={!editing}
                  onClick={() => updateProfileField('language', 'en')}
                  data-testid="profile-lang-en"
                  className={`py-2.5 px-4 rounded-xl font-bold border-2 transition-colors text-sm ${
                    profileForm.language === 'en'
                      ? 'bg-violet-500 text-white border-violet-500'
                      : 'bg-white text-zinc-700 border-zinc-200 hover:border-violet-300'
                  } ${!editing ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  English
                </button>
                <button
                  type="button"
                  disabled={!editing}
                  onClick={() => updateProfileField('language', 'zh')}
                  data-testid="profile-lang-zh"
                  className={`py-2.5 px-4 rounded-xl font-bold border-2 transition-colors text-sm ${
                    profileForm.language === 'zh'
                      ? 'bg-violet-500 text-white border-violet-500'
                      : 'bg-white text-zinc-700 border-zinc-200 hover:border-violet-300'
                  } ${!editing ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  中文
                </button>
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                {language === 'zh' ? '下次登录时自动使用所选语言' : 'Will be your default language on next login'}
              </p>
            </div>

            {/* Latest Marks */}
            <div className="pt-2 border-t border-zinc-100">
              <p className="text-sm font-bold text-zinc-700 mb-3">
                {language === 'zh' ? '最近成绩 (0-100)' : 'Latest Marks (0-100)'}
              </p>
              <div className="grid grid-cols-3 gap-3">
                {subjectField('bm', 'BM', 'BM', 'violet')}
                {subjectField('sejarah', 'Sejarah', '历史', 'amber')}
                {subjectField('science', 'Science', '科学', 'emerald')}
              </div>
            </div>

            {editing && (
              <button
                type="submit"
                disabled={savingProfile}
                className="w-full bg-gradient-to-r from-violet-500 to-pink-500 text-white font-bold py-3 rounded-xl hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                data-testid="save-profile-btn"
              >
                <Save className="w-5 h-5" />
                {savingProfile ? t('loading') : (language === 'zh' ? '保存更改' : 'Save Changes')}
              </button>
            )}
          </form>
        </motion.div>

        {/* Password Change */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-6 border-2 border-zinc-200"
        >
          <div className="flex items-center gap-3 mb-4">
            <Lock className="w-6 h-6 text-violet-500" />
            <h2 className="text-xl font-bold text-zinc-900">{t('change_password')}</h2>
          </div>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-2">
                {t('current_password')}
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-zinc-200 focus:border-violet-500 focus:outline-none"
                required
                data-testid="current-password-input"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-2">
                {t('new_password')}
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-zinc-200 focus:border-violet-500 focus:outline-none"
                required
                data-testid="new-password-input"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-violet-500 text-white font-bold py-3 rounded-xl hover:bg-violet-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              data-testid="change-password-btn"
            >
              <Save className="w-5 h-5" />
              {loading ? t('loading') : t('save')}
            </button>
          </form>
        </motion.div>
      </main>
    </div>
  );
}

export default Settings;
