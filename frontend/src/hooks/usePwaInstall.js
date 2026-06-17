/**
 * usePwaInstall — exposes everything a banner needs to decide whether to
 * show "Install Monster Huddle" and how to trigger the prompt.
 *
 * Detection rules:
 *   - `isStandalone`: the app is already installed (display-mode: standalone)
 *       OR Safari's legacy `navigator.standalone` flag is true.
 *   - `isIOS`: device is iOS/iPadOS (no programmatic prompt available, must
 *       show the static "Share → Add to Home Screen" hint).
 *   - `canInstall`: Android/Chrome has fired `beforeinstallprompt`.
 *   - `promptInstall()`: triggers the saved deferred event.
 *   - Dismissal is persisted in localStorage for 30 days.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';

const DISMISS_KEY = 'mh_pwa_banner_dismissed_until';

const isStandaloneNow = () => {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true;
  // iOS Safari legacy
  return Boolean(window.navigator && window.navigator.standalone);
};

const detectIOS = () => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  // iPad on iPadOS 13+ reports as Mac but has touch; tolerate both
  const iosUA = /iPad|iPhone|iPod/.test(ua);
  const macTouch = ua.includes('Macintosh') && (navigator.maxTouchPoints || 0) > 1;
  return iosUA || macTouch;
};

const dismissedNow = () => {
  if (typeof localStorage === 'undefined') return false;
  const until = parseInt(localStorage.getItem(DISMISS_KEY) || '0', 10);
  return until > Date.now();
};

export default function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [standalone, setStandalone] = useState(() => isStandaloneNow());
  const [dismissed, setDismissed] = useState(() => dismissedNow());
  const isIOS = useMemo(() => detectIOS(), []);

  useEffect(() => {
    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const onInstalled = () => {
      setDeferredPrompt(null);
      setStandalone(true);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return 'unavailable';
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return outcome; // 'accepted' | 'dismissed'
  }, [deferredPrompt]);

  const dismissBanner = useCallback((days = 30) => {
    const until = Date.now() + days * 24 * 60 * 60 * 1000;
    localStorage.setItem(DISMISS_KEY, String(until));
    setDismissed(true);
  }, []);

  const canInstall = Boolean(deferredPrompt) && !standalone;
  const shouldShowIOSHint = isIOS && !standalone;

  return {
    isStandalone: standalone,
    isIOS,
    canInstall,
    shouldShowIOSHint,
    dismissed,
    promptInstall,
    dismissBanner,
  };
}
