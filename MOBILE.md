# Monster Huddle — Mobile (Android / iOS)

Monster Huddle ships in **two flavours** of mobile support:

1. **PWA (installable web app)** — already live, zero extra work for users.
2. **Native shells (Android `.apk` / iOS `.ipa`)** — built via [Capacitor](https://capacitorjs.com), publishable to Play Store & App Store.

---

## 1. PWA — Already enabled ✅

Users can install Monster Huddle from any modern mobile browser:

- **Android (Chrome)**: visit the preview/prod URL → tap the ⋮ menu → **"Install app"** / **"Add to Home screen"**.
- **iOS (Safari)**: visit the URL → tap the **Share** icon → **"Add to Home Screen"**.

What this gives users:

- Standalone app icon (the Monster Huddle mascot).
- Full-screen launch (no browser chrome).
- Offline-cached app shell (the page still loads when network is poor; API calls obviously still need connectivity).
- Splash screen using the theme color `#7c3aed`.
- Custom app shortcuts on long-press: "Continue learning" and "LIVE Competition".

Files involved:
- `/app/frontend/public/manifest.json` — PWA metadata + icons.
- `/app/frontend/public/sw.js` — service worker (network-first, never caches `/api/*` or `/ws/*`).
- `/app/frontend/public/index.html` — manifest link, `apple-touch-icon`, iOS meta tags, SW registration.
- Icons: `icon-192.png`, `icon-384.png`, `icon-512.png`, `icon-192-maskable.png`, `icon-512-maskable.png`, `apple-touch-icon.png`, `favicon-32.png`, `favicon-64.png`.

> ⚠️ The service worker only registers when the page is **not** running inside the Emergent visual-editor iframe, so the editor experience stays untouched.

---

## 2. Native builds with Capacitor

Capacitor wraps the existing React build in a native WebView and produces real Android Studio / Xcode projects you can sign and publish.

### Pre-requisites (on your dev machine — **not** in this container)

| Target  | You need |
|---------|----------|
| Android | Node 20+, JDK 21, Android Studio (Iguana or newer), Android SDK 34 |
| iOS     | macOS, Xcode 15+, CocoaPods (`sudo gem install cocoapods`) |

### One-time setup

```bash
cd frontend

# Build the React bundle that Capacitor will ship inside the native app
yarn build

# Add the native platforms (creates ./android and ./ios folders)
npx cap add android
npx cap add ios

# Copy the web build into both native projects
npx cap sync
```

### Day-to-day workflow

After every code change in React you want to ship to the native app:

```bash
cd frontend
yarn build
npx cap sync
```

Then open the IDE:

```bash
npx cap open android   # Android Studio
npx cap open ios       # Xcode
```

…and use the IDE's Run / Archive / Sign workflow to deploy to a device or upload to the Play Store / App Store.

### Important — backend URL

The compiled React bundle bakes in whatever `REACT_APP_BACKEND_URL` is set when you run `yarn build`. For native builds you almost certainly want the **production** backend URL, e.g. `https://api.monsterhuddle.com` — not the preview URL.

Before running `yarn build` for a release:

```bash
# in /app/frontend/.env (or .env.production)
REACT_APP_BACKEND_URL=https://your-production-backend.example.com
```

### Branding assets already wired

| Use | File |
|---|---|
| Android app icon (foreground) | `public/icon-512-maskable.png` (Capacitor's icon generator will pick this up) |
| iOS app icon | `public/icon-1024.png` is not auto-generated yet — see "Generating iOS icon" below |
| Splash screen | Uses `theme_color: #7c3aed` from `manifest.json` plus the mascot |

#### Generating the iOS 1024 icon (optional)

iOS requires a 1024×1024 marketing icon. To produce one from the existing mascot:

```bash
cd /app/frontend/public
python3 - <<'PY'
from PIL import Image
src = Image.open('monster-huddle-logo.png').convert('RGBA')
canvas = Image.new('RGBA', (1024, 1024), (245, 243, 255, 255))
src.thumbnail((900, 900), Image.LANCZOS)
canvas.paste(src, ((1024-src.width)//2, (1024-src.height)//2), src)
canvas.convert('RGB').save('icon-1024.png', quality=92)
PY
```

Then in Xcode set this as the App Icon → 1024pt slot, or use a tool like `cordova-res` / `@capacitor/assets` to auto-generate every size.

### App identity (already set)

`capacitor.config.json` is pre-configured with:

```json
{
  "appId": "com.monsterhuddle.app",
  "appName": "Monster Huddle",
  "webDir": "build"
}
```

Change `appId` only **before** the first `npx cap add` — once a platform is added you should keep the bundle identifier stable for store updates.

---

## Common gotchas

- **Don't commit `/app/frontend/android` or `/app/frontend/ios` from this container.** The native platforms must be added on your dev machine where Android Studio / Xcode are installed.
- **CORS**: the backend must allow the WebView's origin. The current backend allows `*` by default (see `CORS_ORIGINS` env in `/app/backend/.env`); tighten to a specific list for production.
- **WebSockets** (LIVE Competition): work over `wss://` from the native shell as long as the backend URL uses HTTPS.
- **Push notifications**: not yet wired. Add `@capacitor/push-notifications` later if you want real push instead of in-app countdowns.

---

## TL;DR

| You want… | Do this |
|---|---|
| Mobile users to install today | Already done — PWA is live, just share the URL. |
| Play Store listing | `yarn build && npx cap add android && npx cap sync && npx cap open android` |
| App Store listing | `yarn build && npx cap add ios && npx cap sync && npx cap open ios` |
