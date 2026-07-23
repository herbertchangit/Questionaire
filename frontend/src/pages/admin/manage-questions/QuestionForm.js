/**
 * Add / Edit Question modal — extracted from ManageQuestions.js.
 *
 * Owns no business state itself: the parent passes `formData` / `setFormData`,
 * `onSubmit` (final POST/PUT call), `onClose`, and a list of selectable subjects.
 * Media uploads (image + audio) live here because they only mutate formData.
 */
import React from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Image as ImageIcon, Music, Upload, X } from 'lucide-react';

import { compressImage, fileToDataUrl } from './mediaUtils';

import { API_URL } from '../../../lib/api';

const DIFFICULTY_OPTS = [
  { v: 'apprentice', en: 'Apprentice', zh: '学徒', activeCls: 'bg-emerald-500 border-emerald-500 text-white', hoverCls: 'hover:border-emerald-300' },
  { v: 'master',     en: 'Master',     zh: '高手', activeCls: 'bg-violet-500 border-violet-500 text-white',   hoverCls: 'hover:border-violet-300' },
  { v: 'legend',     en: 'Legend',     zh: '传奇', activeCls: 'bg-amber-500 border-amber-500 text-white',     hoverCls: 'hover:border-amber-300' },
];

export default function QuestionForm({
  editingId,
  formData,
  setFormData,
  subjects,
  language,
  t,
  onSaved,
  onClose,
}) {
  const selectedForm = String(formData.form_name || '1').replace(/^Form\s*/i, '');

  const handleSave = async () => {
    // Validate: at least 2 English options (A & B) required
    const optsEn = formData.options_en.map((o) => (o || '').trim());
    if (!optsEn[0] || !optsEn[1]) {
      toast.error(language === 'zh' ? '至少需要选项 A 和 B (英文)' : 'Options A and B (English) are required');
      return;
    }
    if (formData.correct_answer > 3 || formData.correct_answer < 0) {
      toast.error('Correct answer must be 0-3');
      return;
    }
    if (!optsEn[formData.correct_answer]) {
      toast.error(
        language === 'zh'
          ? '正确答案必须指向已填写的选项'
          : `Correct answer (Option ${String.fromCharCode(65 + formData.correct_answer)}) must be a filled option`
      );
      return;
    }

    // Fallbacks: missing Chinese text/options inherit their English counterparts
    const textZh = (formData.text_zh || '').trim() || formData.text_en;
    const optsZh = formData.options_zh.map((o, i) => {
      const v = (o || '').trim();
      return v || optsEn[i] || '';
    });

    const payload = {
      ...formData,
      form_name: selectedForm || '1',
      chapter: (formData.chapter || '').trim(),
      branch: (formData.branch || '').trim(),
      text_en: formData.text_en.trim(),
      text_zh: textZh,
      options_en: optsEn,
      options_zh: optsZh,
    };

    const token = localStorage.getItem('token');
    try {
      if (editingId) {
        await axios.put(`${API_URL}/api/admin/questions/${editingId}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Question updated');
      } else {
        await axios.post(`${API_URL}/api/admin/questions`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Question created');
      }
      onSaved();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save question');
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image');
      return;
    }
    try {
      const dataUrl = await compressImage(file);
      setFormData((prev) => ({ ...prev, image: dataUrl }));
    } catch (err) {
      toast.error('Image processing failed');
    }
  };

  const handleAudioUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('audio/')) {
      toast.error('Please select an audio file');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error('Audio too large (max 3MB). Please compress it.');
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      setFormData((prev) => ({ ...prev, audio: dataUrl }));
    } catch (err) {
      toast.error('Audio read failed');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <h2 className="text-2xl font-black mb-4">
          {editingId ? 'Edit Question' : 'Add Question'}
        </h2>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-bold mb-1">
                {language === 'zh' ? '序号' : 'Sequence Number'}
              </label>
              <input
                type="number"
                value={formData.sequence_number}
                onChange={(e) => setFormData({ ...formData, sequence_number: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-lg border-2 border-zinc-200"
                min={0}
                data-testid="form-sequence-number"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Subject</label>
              <select
                value={formData.subject_id}
                onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border-2 border-zinc-200"
              >
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Form</label>
              <select
                value={selectedForm || '1'}
                onChange={(e) => setFormData({ ...formData, form_name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border-2 border-zinc-200"
                data-testid="question-form-select"
              >
                {[1, 2, 3, 4, 5, 6].map((form) => (
                  <option key={form} value={`${form}`}>{form}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Chapter</label>
              <input
                type="text"
                value={formData.chapter || ''}
                onChange={(e) => setFormData({ ...formData, chapter: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border-2 border-zinc-200"
                placeholder={language === 'zh' ? '章节' : 'Chapter'}
                data-testid="question-chapter-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold mb-1">Level</label>
              <select
                value={formData.level_num}
                onChange={(e) => setFormData({ ...formData, level_num: parseInt(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border-2 border-zinc-200"
              >
                {[1, 2, 3, 4, 5].map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Stage</label>
              <select
                value={formData.stage_num}
                onChange={(e) => setFormData({ ...formData, stage_num: parseInt(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border-2 border-zinc-200"
              >
                {[1, 2, 3, 4, 5].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Branch</label>
              <input
                type="text"
                value={formData.branch || ''}
                onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border-2 border-zinc-200"
                placeholder={language === 'zh' ? '分支' : 'Branch'}
                data-testid="question-branch-input"
              />
            </div>
          </div>

          {/* Story Board */}
          <div className="border-t border-zinc-100 pt-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-bold text-zinc-700">
                {language === 'zh' ? '故事板 (可选)' : 'Story Board (optional)'}
              </span>
              <span className="text-xs text-zinc-400">
                {language === 'zh' ? '为问题提供故事背景或阅读理解段落' : 'Add a story / reading passage shown above the question'}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <textarea
                value={formData.story_board_en}
                onChange={(e) => setFormData({ ...formData, story_board_en: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border-2 border-zinc-200 text-sm"
                rows={3}
                placeholder="Story Board (English)"
                data-testid="story-board-en-input"
              />
              <textarea
                value={formData.story_board_zh}
                onChange={(e) => setFormData({ ...formData, story_board_zh: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border-2 border-zinc-200 text-sm"
                rows={3}
                placeholder="故事板 (中文)"
                data-testid="story-board-zh-input"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">
              Question (English) <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.text_en}
              onChange={(e) => setFormData({ ...formData, text_en: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border-2 border-zinc-200"
              rows={2}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-1 text-zinc-600">
              Question (中文) <span className="text-xs text-zinc-400">(optional)</span>
            </label>
            <textarea
              value={formData.text_zh}
              onChange={(e) => setFormData({ ...formData, text_zh: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border-2 border-zinc-200"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-1">
                Options (English) <span className="text-xs font-normal text-zinc-400">(A & B required)</span>
              </label>
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
                  placeholder={`Option ${String.fromCharCode(65 + i)}${i < 2 ? ' *' : ' (optional)'}`}
                  required={i < 2}
                  data-testid={`option-en-${i}`}
                />
              ))}
            </div>
            <div>
              <label className="block text-sm font-bold mb-1 text-zinc-600">
                Options (中文) <span className="text-xs text-zinc-400">(optional)</span>
              </label>
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
                  placeholder={`选项 ${String.fromCharCode(65 + i)} (optional)`}
                  data-testid={`option-zh-${i}`}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-1">Correct Answer</label>
              <select
                value={formData.correct_answer}
                onChange={(e) => setFormData({ ...formData, correct_answer: parseInt(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border-2 border-zinc-200"
              >
                {[0, 1, 2, 3].map((i) => <option key={i} value={i}>Option {String.fromCharCode(65 + i)}</option>)}
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

          {/* Difficulty */}
          <div>
            <label className="block text-sm font-bold mb-1">
              {language === 'zh' ? '难度' : 'Difficulty'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {DIFFICULTY_OPTS.map(({ v, en, zh, activeCls, hoverCls }) => {
                const active = formData.difficulty === v;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setFormData({ ...formData, difficulty: v })}
                    data-testid={`difficulty-${v}`}
                    className={`py-2 rounded-lg font-bold text-sm border-2 transition-colors ${
                      active ? activeCls : `bg-white border-zinc-200 text-zinc-700 ${hoverCls}`
                    }`}
                  >
                    {language === 'zh' ? zh : en}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Media attachments */}
          <div className="border-t border-zinc-100 pt-4">
            <p className="text-sm font-bold text-zinc-700 mb-3">
              {language === 'zh' ? '媒体附件 (可选)' : 'Media Attachments (optional)'}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Image */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold mb-2 text-zinc-700">
                  <ImageIcon className="w-4 h-4" />
                  {language === 'zh' ? '图片' : 'Image'}
                </label>
                {formData.image ? (
                  <div className="relative border-2 border-zinc-200 rounded-lg overflow-hidden">
                    <img
                      src={formData.image}
                      alt="preview"
                      className="w-full h-40 object-contain bg-zinc-50"
                      data-testid="question-image-preview"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, image: null })}
                      className="absolute top-1 right-1 bg-white/90 hover:bg-white p-1 rounded shadow"
                      data-testid="remove-question-image"
                    >
                      <X className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-zinc-300 rounded-lg h-40 flex flex-col items-center justify-center cursor-pointer hover:border-violet-400 hover:bg-violet-50 transition-colors">
                    <Upload className="w-6 h-6 text-zinc-400 mb-1" />
                    <span className="text-sm font-medium text-zinc-500">
                      {language === 'zh' ? '点击上传图片' : 'Click to upload image'}
                    </span>
                    <span className="text-xs text-zinc-400 mt-1">Max ~1MB · auto-compressed</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                      data-testid="question-image-input"
                    />
                  </label>
                )}
              </div>

              {/* Audio */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold mb-2 text-zinc-700">
                  <Music className="w-4 h-4" />
                  {language === 'zh' ? '音频' : 'Audio'}
                </label>
                {formData.audio ? (
                  <div className="border-2 border-zinc-200 rounded-lg p-3 bg-zinc-50">
                    <audio
                      controls
                      src={formData.audio}
                      className="w-full"
                      data-testid="question-audio-preview"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, audio: null })}
                      className="mt-2 text-xs font-bold text-red-500 hover:text-red-700 flex items-center gap-1"
                      data-testid="remove-question-audio"
                    >
                      <X className="w-3 h-3" /> Remove audio
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-zinc-300 rounded-lg h-40 flex flex-col items-center justify-center cursor-pointer hover:border-violet-400 hover:bg-violet-50 transition-colors">
                    <Music className="w-6 h-6 text-zinc-400 mb-1" />
                    <span className="text-sm font-medium text-zinc-500">
                      {language === 'zh' ? '点击上传音频' : 'Click to upload audio'}
                    </span>
                    <span className="text-xs text-zinc-400 mt-1">MP3/WAV · Max 3MB</span>
                    <input
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={handleAudioUpload}
                      data-testid="question-audio-input"
                    />
                  </label>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
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
  );
}
