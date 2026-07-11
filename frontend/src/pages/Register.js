import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useLanguage } from '../context/LanguageContext';
import { 
  User, Lock, UserPlus, Globe, Award, Eye, EyeOff, 
  School, MapPin, Calendar, BookOpen, GraduationCap, Mail
} from 'lucide-react';

import { API_URL } from '../lib/api';

function Register({ onRegister }) {
  const [step, setStep] = useState(1); // Multi-step form
  const initialFormState = {
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    school_id: '',
    school_name: '',
    town: '',
    current_grade: 1,
    date_of_birth: '',
    latest_marks: {
      bm: '',
      sejarah: '',
      science: ''
    }
  };
  const [formData, setFormData] = useState(initialFormState);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [schools, setSchools] = useState([]);
  const [schoolsLoading, setSchoolsLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  const { language, toggleLanguage, t } = useLanguage();

  // Always start with a fresh form when landing on the page
  useEffect(() => {
    setStep(1);
    setFormData(initialFormState);
    setErrors({});
    setShowPassword(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchSchools = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/schools`);
        if (!cancelled) {
          setSchools(response.data || []);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(language === 'zh' ? '无法加载学校列表' : 'Failed to load school list');
        }
      } finally {
        if (!cancelled) {
          setSchoolsLoading(false);
        }
      }
    };

    fetchSchools();

    return () => {
      cancelled = true;
    };
  }, [language]);

  const grades = [
    { value: 1, label: language === 'zh' ? '中一 (Form 1)' : 'Form 1' },
    { value: 2, label: language === 'zh' ? '中二 (Form 2)' : 'Form 2' },
    { value: 3, label: language === 'zh' ? '中三 (Form 3)' : 'Form 3' },
    { value: 4, label: language === 'zh' ? '中四 (Form 4)' : 'Form 4' },
    { value: 5, label: language === 'zh' ? '中五 (Form 5)' : 'Form 5' },
    { value: 6, label: language === 'zh' ? '中六 (Form 6)' : 'Form 6' }
  ];

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const updateMarks = (subject, value) => {
    const numValue = value === '' ? '' : Math.min(100, Math.max(0, parseInt(value) || 0));
    setFormData(prev => ({
      ...prev,
      latest_marks: { ...prev.latest_marks, [subject]: numValue }
    }));
  };

  const updateSchoolSelection = (schoolId) => {
    const selectedSchool = schools.find((school) => school.id === schoolId);
    setFormData(prev => ({
      ...prev,
      school_id: schoolId,
      school_name: selectedSchool?.school_name || ''
    }));
    if (errors.school_name) {
      setErrors(prev => ({ ...prev, school_name: null }));
    }
  };

  const validateStep1 = () => {
    const newErrors = {};
    const PLAIN_RE = /^[a-zA-Z0-9_]{3,30}$/;
    const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    // Username validation - allow plain or email format
    const u = formData.username.trim();
    if (!u) {
      newErrors.username = language === 'zh' ? '请输入用户名' : 'Username is required';
    } else if (!PLAIN_RE.test(u) && !EMAIL_RE.test(u)) {
      newErrors.username = language === 'zh'
        ? '用户名必须是 3-30 个字母/数字/下划线,或有效的电子邮件'
        : 'Use 3-30 letters/numbers/underscores OR a valid email address';
    }
    
    // Email validation - always required
    const e = formData.email.trim();
    if (!e) {
      newErrors.email = language === 'zh' ? '请输入电子邮件' : 'Email is required';
    } else if (!EMAIL_RE.test(e)) {
      newErrors.email = language === 'zh' ? '请输入有效的电子邮件' : 'Enter a valid email address';
    } else if (EMAIL_RE.test(u) && u.toLowerCase() !== e.toLowerCase()) {
      // If username is email-format, it must equal the email field
      newErrors.username = language === 'zh'
        ? '用户名为电子邮件时必须与电子邮件字段相同'
        : 'When username is an email, it must match the Email field';
    }
    
    // Password validation
    if (!formData.password) {
      newErrors.password = language === 'zh' ? '请输入密码' : 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = language === 'zh' ? '密码至少6个字符' : 'Password must be at least 6 characters';
    }
    
    // Confirm password
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = language === 'zh' ? '密码不匹配' : 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};
    
    if (!formData.full_name.trim()) {
      newErrors.full_name = language === 'zh' ? '请输入全名' : 'Full name is required';
    }
    
    if (schoolsLoading) {
      newErrors.school_name = language === 'zh' ? '学校列表仍在加载' : 'School list is still loading';
    } else if (schools.length === 0) {
      newErrors.school_name = language === 'zh' ? '暂无可选择的学校，请联系管理员' : 'No schools available. Please contact an administrator.';
    } else if (!formData.school_id || !formData.school_name.trim()) {
      newErrors.school_name = language === 'zh' ? '请选择学校' : 'Please select a school';
    }
    
    if (!formData.town.trim()) {
      newErrors.town = language === 'zh' ? '请输入城镇' : 'Town is required';
    }
    
    if (!formData.date_of_birth) {
      newErrors.date_of_birth = language === 'zh' ? '请选择出生日期' : 'Date of birth is required';
    } else {
      const dob = new Date(formData.date_of_birth);
      const age = Math.floor((new Date() - dob) / (365.25 * 24 * 60 * 60 * 1000));
      if (age < 10 || age > 20) {
        newErrors.date_of_birth = language === 'zh' ? '年龄必须在10-20岁之间' : 'Age must be between 10-20 years';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors = {};
    const marks = formData.latest_marks;
    
    if (marks.bm === '' || marks.bm < 0 || marks.bm > 100) {
      newErrors.bm = language === 'zh' ? 'BM分数必须在0-100之间' : 'BM marks must be between 0-100';
    }
    if (marks.sejarah === '' || marks.sejarah < 0 || marks.sejarah > 100) {
      newErrors.sejarah = language === 'zh' ? '历史分数必须在0-100之间' : 'History marks must be between 0-100';
    }
    if (marks.science === '' || marks.science < 0 || marks.science > 100) {
      newErrors.science = language === 'zh' ? '科学分数必须在0-100之间' : 'Science marks must be between 0-100';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateStep3()) return;
    
    setLoading(true);
    setErrors({});

    try {
      const response = await axios.post(`${API_URL}/api/auth/register`, {
        username: formData.username.toLowerCase().trim(),
        email: formData.email.toLowerCase().trim(),
        password: formData.password,
        full_name: formData.full_name,
        school_id: formData.school_id,
        school_name: formData.school_name,
        town: formData.town,
        current_grade: formData.current_grade,
        date_of_birth: formData.date_of_birth,
        latest_marks: {
          bm: parseInt(formData.latest_marks.bm) || 0,
          sejarah: parseInt(formData.latest_marks.sejarah) || 0,
          science: parseInt(formData.latest_marks.science) || 0
        },
        language
      });
      
      const { token, user } = response.data;
      if (!token || !user) {
        throw new Error('Registration response missing session data');
      }

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      onRegister?.({ token, user });
      
      toast.success(response.data.message || (language === 'zh' ? '注册成功!' : 'Registration successful!'));
      
      navigate('/dashboard', { replace: true });
    } catch (error) {
      const errorMsg = error.response?.data?.detail || (language === 'zh' ? '注册失败' : 'Registration failed');
      setErrors({ form: errorMsg });
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
      {/* Language Toggle */}
      <button
        onClick={toggleLanguage}
        className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-white/30 transition-colors"
        data-testid="language-toggle"
      >
        <Globe className="w-5 h-5" />
        {language === 'en' ? '中文' : 'EN'}
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-24 h-24 mb-3">
            <img
              src="/monster-huddle-transparent.png"
              alt="Monster Huddle logo"
              className="w-full h-full object-contain drop-shadow-xl"
              data-testid="register-logo"
            />
          </div>
          <h1 className="text-3xl font-black text-white mb-1">Monster Huddle</h1>
          <p className="text-white/80 font-medium text-sm">
            {language === 'zh' ? '学习变得有趣' : 'Learning Made Fun'}
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`w-3 h-3 rounded-full transition-all ${
                s === step ? 'bg-white scale-125' : s < step ? 'bg-white/80' : 'bg-white/30'
              }`}
            />
          ))}
        </div>

        {/* Register Form */}
        <div className="bg-white rounded-3xl p-6 shadow-xl">
          <h2 className="text-xl font-black text-zinc-900 mb-1">
            {step === 1 && (language === 'zh' ? '创建账户' : 'Create Account')}
            {step === 2 && (language === 'zh' ? '个人信息' : 'Personal Info')}
            {step === 3 && (language === 'zh' ? '学业成绩' : 'Academic Marks')}
          </h2>
          <p className="text-zinc-500 text-sm mb-4">
            {step === 1 && (language === 'zh' ? '设置您的登录信息' : 'Set up your login credentials')}
            {step === 2 && (language === 'zh' ? '告诉我们关于您的信息' : 'Tell us about yourself')}
            {step === 3 && (language === 'zh' ? '输入您最近的考试成绩' : 'Enter your latest exam marks')}
          </p>

          {errors.form && (
            <div className="mb-4 p-3 bg-red-50 border-2 border-red-200 rounded-xl text-red-600 text-sm font-medium">
              {errors.form}
            </div>
          )}

          <form onSubmit={handleSubmit} autoComplete="off">
            {/* Step 1: Account */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-1">
                    {language === 'zh' ? '用户名' : 'Username'} *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => updateFormData('username', e.target.value)}
                      autoComplete="off"
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl border-2 focus:outline-none text-sm ${
                        errors.username ? 'border-red-300' : 'border-zinc-200 focus:border-violet-500'
                      }`}
                      placeholder={language === 'zh' ? '用户名或电子邮件' : 'Username or email'}
                      data-testid="username-input"
                    />
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">
                    {language === 'zh' ? '可以是字母数字组合或电子邮件地址' : 'Letters/numbers/underscore OR an email address'}
                  </p>
                  {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username}</p>}
                </div>

                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-1">
                    {language === 'zh' ? '电子邮件' : 'Email'} *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateFormData('email', e.target.value)}
                      autoComplete="off"
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl border-2 focus:outline-none text-sm ${
                        errors.email ? 'border-red-300' : 'border-zinc-200 focus:border-violet-500'
                      }`}
                      placeholder="you@school.edu"
                      data-testid="email-input"
                    />
                  </div>
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-1">
                    {t('password')} *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => updateFormData('password', e.target.value)}
                      autoComplete="new-password"
                      className={`w-full pl-10 pr-10 py-2.5 rounded-xl border-2 focus:outline-none text-sm ${
                        errors.password ? 'border-red-300' : 'border-zinc-200 focus:border-violet-500'
                      }`}
                      placeholder="••••••••"
                      data-testid="password-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                </div>

                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-1">
                    {language === 'zh' ? '确认密码' : 'Confirm Password'} *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                    <input
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => updateFormData('confirmPassword', e.target.value)}
                      autoComplete="new-password"
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl border-2 focus:outline-none text-sm ${
                        errors.confirmPassword ? 'border-red-300' : 'border-zinc-200 focus:border-violet-500'
                      }`}
                      placeholder="••••••••"
                    />
                  </div>
                  {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
                </div>
              </div>
            )}

            {/* Step 2: Personal Info */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-1">
                    {language === 'zh' ? '全名' : 'Full Name'} *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                    <input
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => updateFormData('full_name', e.target.value)}
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl border-2 focus:outline-none text-sm ${
                        errors.full_name ? 'border-red-300' : 'border-zinc-200 focus:border-violet-500'
                      }`}
                      placeholder={language === 'zh' ? '您的全名' : 'Your full name'}
                    />
                  </div>
                  {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-1">
                    {language === 'zh' ? '学校名称' : 'School Name'} *
                  </label>
                  <div className="relative">
                    <School className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                    <select
                      value={formData.school_id}
                      onChange={(e) => updateSchoolSelection(e.target.value)}
                      disabled={schoolsLoading || schools.length === 0}
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl border-2 focus:outline-none text-sm ${
                        errors.school_name ? 'border-red-300' : 'border-zinc-200 focus:border-violet-500'
                      } disabled:bg-zinc-100 disabled:text-zinc-400`}
                      data-testid="school-select"
                    >
                      <option value="">
                        {schoolsLoading
                          ? (language === 'zh' ? '正在加载学校...' : 'Loading schools...')
                          : schools.length === 0
                            ? (language === 'zh' ? '暂无可选择的学校' : 'No schools available')
                            : (language === 'zh' ? '请选择学校' : 'Select your school')}
                      </option>
                      {schools.map((school) => (
                        <option key={school.id} value={school.id}>
                          {school.school_name}
                          {school.education_level ? ` - ${school.education_level}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  {errors.school_name && <p className="text-red-500 text-xs mt-1">{errors.school_name}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-bold text-zinc-700 mb-1">
                      {language === 'zh' ? '城镇' : 'Town'} *
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                      <input
                        type="text"
                        value={formData.town}
                        onChange={(e) => updateFormData('town', e.target.value)}
                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl border-2 focus:outline-none text-sm ${
                          errors.town ? 'border-red-300' : 'border-zinc-200 focus:border-violet-500'
                        }`}
                        placeholder={language === 'zh' ? '城镇' : 'Town'}
                      />
                    </div>
                    {errors.town && <p className="text-red-500 text-xs mt-1">{errors.town}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-zinc-700 mb-1">
                      {language === 'zh' ? '年级' : 'Grade'} *
                    </label>
                    <div className="relative">
                      <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                      <select
                        value={formData.current_grade}
                        onChange={(e) => updateFormData('current_grade', parseInt(e.target.value))}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-zinc-200 focus:border-violet-500 focus:outline-none text-sm appearance-none"
                      >
                        {grades.map(g => (
                          <option key={g.value} value={g.value}>{g.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-1">
                    {language === 'zh' ? '出生日期' : 'Date of Birth'} *
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                    <input
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => updateFormData('date_of_birth', e.target.value)}
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl border-2 focus:outline-none text-sm ${
                        errors.date_of_birth ? 'border-red-300' : 'border-zinc-200 focus:border-violet-500'
                      }`}
                      max={new Date(new Date().setFullYear(new Date().getFullYear() - 10)).toISOString().split('T')[0]}
                      min={new Date(new Date().setFullYear(new Date().getFullYear() - 20)).toISOString().split('T')[0]}
                    />
                  </div>
                  {errors.date_of_birth && <p className="text-red-500 text-xs mt-1">{errors.date_of_birth}</p>}
                </div>
              </div>
            )}

            {/* Step 3: Marks */}
            {step === 3 && (
              <div className="space-y-4">
                <p className="text-sm text-zinc-500 mb-2">
                  {language === 'zh' 
                    ? '输入您最近考试的成绩 (0-100)' 
                    : 'Enter your latest exam marks (0-100)'}
                </p>
                
                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-1">
                    Bahasa Malaysia (BM) *
                  </label>
                  <div className="relative">
                    <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-violet-500" />
                    <input
                      type="number"
                      value={formData.latest_marks.bm}
                      onChange={(e) => updateMarks('bm', e.target.value)}
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl border-2 focus:outline-none text-sm ${
                        errors.bm ? 'border-red-300' : 'border-zinc-200 focus:border-violet-500'
                      }`}
                      placeholder="0-100"
                      min="0"
                      max="100"
                    />
                  </div>
                  {errors.bm && <p className="text-red-500 text-xs mt-1">{errors.bm}</p>}
                </div>

                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-1">
                    {language === 'zh' ? '历史 (Sejarah)' : 'History (Sejarah)'} *
                  </label>
                  <div className="relative">
                    <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-yellow-500" />
                    <input
                      type="number"
                      value={formData.latest_marks.sejarah}
                      onChange={(e) => updateMarks('sejarah', e.target.value)}
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl border-2 focus:outline-none text-sm ${
                        errors.sejarah ? 'border-red-300' : 'border-zinc-200 focus:border-violet-500'
                      }`}
                      placeholder="0-100"
                      min="0"
                      max="100"
                    />
                  </div>
                  {errors.sejarah && <p className="text-red-500 text-xs mt-1">{errors.sejarah}</p>}
                </div>

                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-1">
                    {language === 'zh' ? '科学 (Science)' : 'Science'} *
                  </label>
                  <div className="relative">
                    <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                    <input
                      type="number"
                      value={formData.latest_marks.science}
                      onChange={(e) => updateMarks('science', e.target.value)}
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl border-2 focus:outline-none text-sm ${
                        errors.science ? 'border-red-300' : 'border-zinc-200 focus:border-violet-500'
                      }`}
                      placeholder="0-100"
                      min="0"
                      max="100"
                    />
                  </div>
                  {errors.science && <p className="text-red-500 text-xs mt-1">{errors.science}</p>}
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex gap-3 mt-6">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="flex-1 py-3 rounded-xl border-2 border-zinc-200 font-bold text-zinc-600 hover:bg-zinc-50"
                >
                  {t('back')}
                </button>
              )}
              
              {step < 3 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 text-white font-bold hover:opacity-90"
                >
                  {t('next')}
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 text-white font-bold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                  data-testid="register-btn"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5" />
                      {t('register')}
                    </>
                  )}
                </button>
              )}
            </div>
          </form>

          <p className="text-center mt-4 text-zinc-600 text-sm">
            {t('have_account')}{' '}
            <Link to="/login" className="text-violet-600 font-bold hover:underline">
              {t('login')}
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default Register;
