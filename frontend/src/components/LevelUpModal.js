import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Coins, Sparkles, Award, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { levelName } from '../constants/gameplay';

/**
 * Level-Up celebration modal.
 *
 * Props:
 *   levelUpInfo: {from_level, to_level, level_name_en, level_name_zh, rewards}
 *   open: bool
 *   onClose: fn
 *   language: 'en'|'zh'
 */
function LevelUpModal({ levelUpInfo, open, onClose, language = 'en' }) {
  const lang = language === 'zh' ? 'zh' : 'en';

  useEffect(() => {
    if (!open) return;
    // Multi-burst confetti celebration
    const launch = (delay, opts) => setTimeout(() => {
      confetti({ particleCount: 120, spread: 75, origin: { y: 0.5 }, ...opts });
    }, delay);
    launch(150, { angle: 60, origin: { x: 0, y: 0.5 } });
    launch(350, { angle: 120, origin: { x: 1, y: 0.5 } });
    launch(700, { particleCount: 200, spread: 100, origin: { y: 0.3 } });
  }, [open]);

  if (!levelUpInfo) return null;
  const rewards = levelUpInfo.rewards || {};
  const newLevelName = levelName(levelUpInfo.to_level, lang);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          data-testid="level-up-modal"
        >
          <motion.div
            initial={{ scale: 0.7, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 18 }}
            className="bg-white rounded-3xl w-full max-w-sm overflow-hidden relative"
          >
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-white/30 hover:bg-white/60 text-white z-10"
              data-testid="close-level-up"
              aria-label="close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="bg-gradient-to-br from-yellow-400 via-orange-500 to-pink-500 p-8 text-center text-white">
              <motion.div
                animate={{ rotate: [0, -10, 10, -8, 8, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 1 }}
              >
                <Trophy className="w-20 h-20 mx-auto drop-shadow-lg" />
              </motion.div>
              <h2 className="text-3xl font-black mt-3" data-testid="level-up-title">
                {lang === 'zh' ? '🎉 恭喜!' : '🎉 Congratulations!'}
              </h2>
              <p className="text-sm mt-2 opacity-95">
                {lang === 'zh' ? '你已完成所有要求' : 'You have completed all requirements'}
              </p>
              <div className="mt-4 inline-block bg-white/20 backdrop-blur-sm rounded-2xl px-5 py-2">
                <p className="text-xs font-bold uppercase tracking-wider opacity-90">
                  {lang === 'zh' ? '关卡升级!' : 'Level Up Achieved!'}
                </p>
                <p className="text-2xl font-black" data-testid="level-up-new-level">
                  {newLevelName}
                </p>
              </div>
            </div>

            <div className="p-6">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3 text-center">
                {lang === 'zh' ? '获得奖励' : 'Rewards Earned'}
              </p>
              <div className="grid grid-cols-3 gap-3" data-testid="level-up-rewards">
                <RewardCard icon={Coins}    value={rewards.coins ?? 0} label={lang === 'zh' ? '金币' : 'Coins'} colorFrom="from-amber-400" colorTo="to-amber-600" />
                <RewardCard icon={Sparkles} value={rewards.xp ?? 0}    label="XP" colorFrom="from-violet-400" colorTo="to-violet-600" />
                <RewardCard icon={Award}    value={rewards.badge || '—'} label={lang === 'zh' ? '徽章' : 'Badge'} colorFrom="from-pink-400" colorTo="to-pink-600" small />
              </div>

              <button
                onClick={onClose}
                className="mt-5 w-full py-3 rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 text-white font-black hover:opacity-90"
                data-testid="level-up-continue"
              >
                {lang === 'zh' ? '继续' : 'Continue'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function RewardCard({ icon: Icon, value, label, colorFrom, colorTo, small }) {
  return (
    <div className="text-center">
      <div className={`mx-auto w-12 h-12 rounded-2xl bg-gradient-to-br ${colorFrom} ${colorTo} flex items-center justify-center text-white shadow-md mb-1`}>
        <Icon className="w-6 h-6" />
      </div>
      <p className={`font-black text-zinc-900 ${small ? 'text-sm' : 'text-lg'}`}>{value}</p>
      <p className="text-xs text-zinc-500 font-bold">{label}</p>
    </div>
  );
}

export default LevelUpModal;
