// Single source of truth for all subjects across the Monster Huddle app.
// Each subject has a slug ID, English + Chinese names.
// Legacy IDs (subj_bm, subj_history, subj_science) remain valid so existing
// questions and the user's latest_marks (bm/sejarah/science) continue working.

export const SUBJECTS = [
  { id: 'subj_accounting',        name_en: 'Accounting',        name_zh: '会计' },
  { id: 'subj_bahasa_melayu',     name_en: 'Bahasa Melayu',     name_zh: '马来文' },
  { id: 'subj_biology',           name_en: 'Biology',           name_zh: '生物' },
  { id: 'subj_business',          name_en: 'Business',          name_zh: '商业' },
  { id: 'subj_chemistry',         name_en: 'Chemistry',         name_zh: '化学' },
  { id: 'subj_chinese',           name_en: 'Chinese',           name_zh: '华文' },
  { id: 'subj_computer',          name_en: 'Computer',          name_zh: '电脑' },
  { id: 'subj_economics',         name_en: 'Economics',         name_zh: '经济' },
  { id: 'subj_english',           name_en: 'English',           name_zh: '英文' },
  { id: 'subj_geography',         name_en: 'Geography',         name_zh: '地理' },
  { id: 'subj_history',           name_en: 'History',           name_zh: '历史' },
  { id: 'subj_malay_literature',  name_en: 'Malay Literature',  name_zh: '马来文文学' },
  { id: 'subj_mathematics',       name_en: 'Mathematics',       name_zh: '数学' },
  { id: 'subj_moral',             name_en: 'Moral',             name_zh: '道德教育' },
  { id: 'subj_physics',           name_en: 'Physics',           name_zh: '物理' },
  { id: 'subj_science',           name_en: 'Science',           name_zh: '科学' },
];

// Legacy aliases — map old subject IDs to canonical entries
const LEGACY_ALIAS = {
  subj_bm: 'subj_bahasa_melayu',
};

export function getSubject(id) {
  if (!id) return null;
  const resolvedId = LEGACY_ALIAS[id] || id;
  return SUBJECTS.find((s) => s.id === resolvedId) || null;
}

export function getSubjectName(id, language = 'en') {
  const s = getSubject(id);
  if (!s) return id || '';
  return language === 'zh' ? s.name_zh : s.name_en;
}
