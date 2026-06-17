/**
 * CSV helpers for the Manage Questions screen.
 * Pure functions — no React, no axios.
 */
import { getSubject } from '../../../constants/subjects';

const escapeCsv = (val) => {
  if (val === null || val === undefined) return '';
  const s = String(val).replace(/\r?\n/g, ' ');
  if (s.includes(',') || s.includes('"') || s.includes(';')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

const HEADERS = [
  'id', 'sequence_number', 'subject_id', 'subject_name', 'level_num', 'stage_num', 'difficulty',
  'story_board_en', 'story_board_zh',
  'text_en', 'text_zh',
  'option_a_en', 'option_b_en', 'option_c_en', 'option_d_en',
  'option_a_zh', 'option_b_zh', 'option_c_zh', 'option_d_zh',
  'correct_answer', 'points',
  'has_image', 'has_audio', 'created_at',
];

/**
 * Build a CSV string from a list of questions, then trigger a browser download.
 * Returns the row count exported (caller can show a toast).
 */
export function exportQuestionsCsv(rows, language = 'en') {
  if (!rows || !rows.length) return 0;
  const lines = [HEADERS.join(',')];
  rows.forEach((q) => {
    const subj = getSubject(q.subject_id);
    const subjName = subj ? (language === 'zh' ? subj.name_zh : subj.name_en) : q.subject_id;
    const optsEn = (q.options_en || []).slice(0, 4).concat(['', '', '', '']).slice(0, 4);
    const optsZh = (q.options_zh || []).slice(0, 4).concat(['', '', '', '']).slice(0, 4);
    const row = [
      q.id,
      q.sequence_number ?? 0,
      q.subject_id,
      subjName,
      q.level_num,
      q.stage_num,
      q.difficulty || 'apprentice',
      q.story_board_en || '',
      q.story_board_zh || '',
      q.text_en,
      q.text_zh,
      ...optsEn,
      ...optsZh,
      q.correct_answer,
      q.points,
      q.image ? 'yes' : 'no',
      q.audio ? 'yes' : 'no',
      q.created_at || '',
    ].map(escapeCsv);
    lines.push(row.join(','));
  });

  // UTF-8 BOM so Excel renders Chinese correctly
  const csv = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `monster_huddle_questions_${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return rows.length;
}
