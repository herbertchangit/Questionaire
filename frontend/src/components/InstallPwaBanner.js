/**
 * InstallPwaBanner — student-only banner that nudges users to install
 * Monster Huddle onto their phone home screen.
 *
 * Render rules (all must be true):
 *   - User role is NOT admin (passed in by parent).
 *   - The app is not already installed (`!isStandalone`).
 *   - The user hasn't dismissed the banner in the last 30 days.
 *   - Either Chrome/Android has fired `beforeinstallprompt`
 *     OR the device is iOS (we show a static instruction).
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Share, X } from 'lucide-react';

import usePwaInstall from '../hooks/usePwaInstall';

export default function InstallPwaBanner({ language = 'en', role = 'user' }) {
  const {
    canInstall,
    shouldShowIOSHint,
    isStandalone,
    dismissed,
    promptInstall,
    dismissBanner,
  } = usePwaInstall();

  const [showIOSDetail, setShowIOSDetail] = useState(false);
  const [busy, setBusy] = useState(false);

  if (role === 'admin') return null;
  if (isStandalone || dismissed) return null;
  if (!canInstall && !shouldShowIOSHint) return null;

  const labels = {
    en: {
      title: 'Get the Monster Huddle app',
      subtitleAndroid: 'Install it for a full-screen, faster experience.',
      subtitleIOS: 'Add to your Home Screen for a full-screen experience.',
      install: 'Install',
      showHow: 'Show me how',
      dismiss: 'Not now',
      iosStep1: '1. Tap the Share icon',
      iosStep2: '2. Choose “Add to Home Screen”',
      iosStep3: '3. Tap Add — done!',
    },
    zh: {
      title: '获取 Monster Huddle 应用',
      subtitleAndroid: '安装后享受全屏、流畅的体验',
      subtitleIOS: '添加到主屏幕,享受全屏体验',
      install: '立即安装',
      showHow: '查看步骤',
      dismiss: '稍后再说',
      iosStep1: '1. 点击分享按钮',
      iosStep2: '2. 选择「添加到主屏幕」',
      iosStep3: '3. 点击「添加」即可!',
    },
  };
  const L = labels[language] || labels.en;

  const handleInstall = async () => {
    setBusy(true);
    try {
      const outcome = await promptInstall();
      if (outcome === 'dismissed') dismissBanner(7); // shorter snooze if they declined the native prompt
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        key="pwa-banner"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="relative mb-4 rounded-2xl border-2 border-violet-200 bg-gradient-to-r from-violet-100 via-pink-50 to-white p-3 sm:p-4 shadow-sm"
        data-testid="install-pwa-banner"
      >
        <div className="flex items-start gap-3">
          <div className="hidden sm:flex shrink-0 w-12 h-12 rounded-xl bg-white items-center justify-center overflow-hidden p-1">
            <img src="/monster-huddle-logo.png" alt="" className="w-full h-full object-contain" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-black text-violet-900 text-sm sm:text-base">{L.title}</p>
            <p className="text-xs sm:text-sm text-zinc-600 mt-0.5">
              {shouldShowIOSHint ? L.subtitleIOS : L.subtitleAndroid}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {canInstall && (
                <button
                  type="button"
                  onClick={handleInstall}
                  disabled={busy}
                  data-testid="install-pwa-btn"
                  className="inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-bold px-3.5 py-1.5 rounded-lg"
                >
                  <Download className="w-4 h-4" />
                  {L.install}
                </button>
              )}
              {shouldShowIOSHint && !canInstall && (
                <button
                  type="button"
                  onClick={() => setShowIOSDetail((s) => !s)}
                  data-testid="ios-show-how-btn"
                  className="inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold px-3.5 py-1.5 rounded-lg"
                >
                  <Share className="w-4 h-4" />
                  {L.showHow}
                </button>
              )}
              <button
                type="button"
                onClick={() => dismissBanner(30)}
                data-testid="dismiss-pwa-btn"
                className="text-xs font-bold text-zinc-500 hover:text-zinc-800"
              >
                {L.dismiss}
              </button>
            </div>

            {showIOSDetail && shouldShowIOSHint && (
              <motion.ol
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-3 ml-1 text-sm text-zinc-700 space-y-1 list-none"
                data-testid="ios-install-steps"
              >
                <li>{L.iosStep1}</li>
                <li>{L.iosStep2}</li>
                <li>{L.iosStep3}</li>
              </motion.ol>
            )}
          </div>

          <button
            type="button"
            onClick={() => dismissBanner(30)}
            aria-label={L.dismiss}
            className="shrink-0 p-1 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-white/60"
            data-testid="close-pwa-banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
