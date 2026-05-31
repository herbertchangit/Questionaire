// Shared gameplay configuration mirroring /app/backend/gameplay.py

export const LEVEL_NAMES = {
  1: { en: 'Determination', zh: '决心' },
  2: { en: 'Discipline',    zh: '自律' },
  3: { en: 'Perseverance',  zh: '毅力' },
  4: { en: 'Hard-Working',  zh: '勤劳' },
  5: { en: 'Breakthrough',  zh: '突破' },
};

export const LEVEL_REQUIREMENTS = {
  1: { apprentice: 3, master: 0,  legend: 0 },
  2: { apprentice: 3, master: 2,  legend: 0 },
  3: { apprentice: 3, master: 5,  legend: 2 },
  4: { apprentice: 3, master: 7,  legend: 5 },
  5: { apprentice: 3, master: 10, legend: 7 },
};

export const LEVEL_REWARDS = {
  1: { coins: 100,  xp: 50,  badge: 'Determination' },
  2: { coins: 200,  xp: 75,  badge: 'Discipline' },
  3: { coins: 350,  xp: 100, badge: 'Perseverance' },
  4: { coins: 500,  xp: 150, badge: 'Hard-Working' },
  5: { coins: 1000, xp: 250, badge: 'Breakthrough' },
};

export const DIFFICULTY_META = {
  apprentice: { label_en: 'Apprentice', label_zh: '学徒',   color: 'emerald',   from: 'from-emerald-400', to: 'to-emerald-600' },
  master:     { label_en: 'Master',     label_zh: '高手',   color: 'violet',    from: 'from-violet-400',  to: 'to-violet-600' },
  legend:     { label_en: 'Legend',     label_zh: '传奇',   color: 'amber',     from: 'from-amber-400',   to: 'to-orange-500' },
};

export function levelName(num, lang = 'en') {
  return LEVEL_NAMES[num]?.[lang] || `Level ${num}`;
}
