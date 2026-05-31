import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, ChevronRight, Coins, Sparkles, Award, CheckCircle2 } from 'lucide-react';
import { LEVEL_NAMES, DIFFICULTY_META, levelName } from '../constants/gameplay';

/**
 * Level Progression card — shows current level, per-difficulty progress bars,
 * overall %, next-level preview, and reward preview.
 *
 * Props:
 *   progression: object returned by GET /api/user/progression
 *   language: 'en' | 'zh'
 */
function LevelProgressionCard({ progression, language = 'en' }) {
  if (!progression) return null;

  const {
    current_level_num,
    progress,
    overall_percent,
    is_max_level,
    next_level_num,
    next_level_rewards,
    total_questions_answered,
    total_correct_answers,
  } = progression;

  const lang = language === 'zh' ? 'zh' : 'en';
  const currentName = levelName(current_level_num, lang);
  const nextName = next_level_num ? levelName(next_level_num, lang) : null;

  return (
    <div
      className="bg-white rounded-2xl border-2 border-zinc-200 overflow-hidden"
      data-testid="level-progression-card"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-500 via-pink-500 to-orange-500 p-5 text-white">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <CircularProgress percent={overall_percent} />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider opacity-90">
                {lang === 'zh' ? '当前关卡' : 'Current Level'}
              </p>
              <h2 className="text-2xl font-black" data-testid="current-level-name">
                {currentName}
              </h2>
              <p className="text-sm opacity-90">
                {overall_percent}% {lang === 'zh' ? '已完成' : 'Complete'}
              </p>
            </div>
          </div>
          <div className="text-right text-sm">
            <div className="flex items-center gap-1 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              {total_correct_answers}
              <span className="opacity-70">/</span>
              {total_questions_answered}
            </div>
            <p className="text-xs opacity-80">
              {lang === 'zh' ? '答对/已答' : 'Correct / Answered'}
            </p>
          </div>
        </div>
      </div>

      {/* Per-difficulty progress */}
      <div className="p-5 space-y-4">
        {['apprentice', 'master', 'legend'].map((diff) => (
          <DifficultyRow
            key={diff}
            diff={diff}
            data={progress[diff]}
            lang={lang}
          />
        ))}
      </div>

      {/* Next-level preview */}
      {!is_max_level && nextName && (
        <div className="border-t-2 border-zinc-100 bg-gradient-to-br from-zinc-50 to-violet-50 p-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                {lang === 'zh' ? '下一关卡' : 'Next Level'}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <ChevronRight className="w-5 h-5 text-violet-500" />
                <h3 className="text-xl font-black text-zinc-900" data-testid="next-level-name">
                  {nextName}
                </h3>
              </div>
            </div>
            {next_level_rewards && (
              <div className="flex gap-2 flex-wrap" data-testid="next-level-rewards">
                <RewardChip
                  icon={Coins}
                  label={`${next_level_rewards.coins} ${lang === 'zh' ? '金币' : 'Coins'}`}
                  color="amber"
                />
                <RewardChip
                  icon={Sparkles}
                  label={`${next_level_rewards.xp} XP`}
                  color="violet"
                />
                {next_level_rewards.badge && (
                  <RewardChip
                    icon={Award}
                    label={`${next_level_rewards.badge} ${lang === 'zh' ? '徽章' : 'Badge'}`}
                    color="pink"
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {is_max_level && (
        <div className="border-t-2 border-zinc-100 bg-gradient-to-br from-yellow-50 to-orange-50 p-5 text-center">
          <Trophy className="w-8 h-8 text-yellow-500 mx-auto mb-1" />
          <p className="font-black text-zinc-900">
            {lang === 'zh' ? '已达最高关卡!' : 'Max Level Achieved!'}
          </p>
        </div>
      )}
    </div>
  );
}

function DifficultyRow({ diff, data, lang }) {
  const meta = DIFFICULTY_META[diff];
  const complete = data?.complete;
  return (
    <div data-testid={`progress-${diff}`}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className={`inline-block w-2.5 h-2.5 rounded-full bg-gradient-to-br ${meta.from} ${meta.to}`} />
          <span className="font-bold text-sm text-zinc-700">
            {lang === 'zh' ? meta.label_zh : meta.label_en}
          </span>
          {complete && <CheckCircle2 className="w-4 h-4 text-green-500" />}
        </div>
        <span className="text-sm font-black text-zinc-900">
          {data.current}<span className="text-zinc-400 font-medium"> / {data.required}</span>
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-zinc-100 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${data.percent}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className={`h-full bg-gradient-to-r ${meta.from} ${meta.to}`}
        />
      </div>
    </div>
  );
}

function RewardChip({ icon: Icon, label, color = 'violet' }) {
  const colors = {
    amber: 'bg-amber-100 text-amber-700',
    violet: 'bg-violet-100 text-violet-700',
    pink: 'bg-pink-100 text-pink-700',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${colors[color]}`}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </span>
  );
}

function CircularProgress({ percent = 0 }) {
  const size = 60;
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, percent) / 100) * circumference;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.25)"
          strokeWidth={stroke}
          fill="none"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="white"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          strokeDasharray={circumference}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center font-black text-xs">
        {Math.round(percent)}%
      </div>
    </div>
  );
}

export default LevelProgressionCard;
