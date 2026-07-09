# Reddit NSFW Blocker (Chrome) — Reddit NSFW Lock

**Last updated:** 2026-07-09

**Reddit NSFW Lock** is a free, open-source **Chrome / Chromium Reddit NSFW blocker** extension. It hides NSFW posts on Reddit, blocks age-gated subreddits, and makes temporary unlock require a short breathing exercise plus a **10-minute cooldown** — so you cannot reverse the restriction with a single toggle.

> **Search terms this project targets:** reddit nsfw blocker · block nsfw reddit · hide nsfw reddit chrome · reddit adult content blocker · reddit nsfw chrome extension · self-control reddit blocker

---

## What is a Reddit NSFW blocker?

A **Reddit NSFW blocker** is a browser tool that stops adult / 18+ posts from showing in your feed. Reddit’s own “blur NSFW” preference is easy to turn off. This extension is a **commitment device**: content stays blocked until you deliberately complete an unlock flow, then auto-relocks after a short window.

| Feature | Reddit built-in NSFW toggle | Reddit NSFW Lock (this repo) |
|--------|-----------------------------|------------------------------|
| Hides NSFW posts | Partial (blur / preference) | Yes — CSS + JS, minimal flash |
| One-click reverse | Yes | No — 10-minute wait after breathing |
| Re-lock | N/A | Instant, always free |
| Custom subreddit blocklist | No | Yes |
| Network / tracking | Reddit only | **None** — fully local |
| Parental-control / partner spy tool | No | **No** — self-install only |

---

## Quick install (unpacked)

### Prerequisites

- Chrome, Edge, Brave, Opera, or another Chromium browser
- This repository cloned or [downloaded as ZIP](https://github.com/jjf2009/reddit-nsfw-blocker)

### Steps

1. Open `chrome://extensions` (or `edge://extensions`, etc.).
2. Turn on **Developer mode**.
3. Click **Load unpacked**.
4. Select this project folder (the one that contains `manifest.json`).
5. Complete onboarding: write a short **reminder note** for future-you.
6. Browse Reddit — NSFW posts should be hidden or redirected.

### Verify it works

- Open a mixed feed: NSFW cards should show a calm “NSFW post blocked” placeholder, not a flash of content.
- Open a known NSFW post permalink: you should land on the extension’s blocked page.
- Click the extension icon → **Request unlock** → finish the flow → content unblocks only after the cooldown.

---

## How it works

1. **Content blocking** — `content.css` hides NSFW elements at `document_start`; `content.js` watches infinite scroll and SPA navigation with a `MutationObserver`.
2. **Hard redirects** — Age-gated subreddits, single NSFW post pages, and your custom blocklist go to `blocked.html`.
3. **Unlock flow** — Breathing (5 cycles) → your personal reminder → **10-minute** `chrome.alarms` cooldown in the service worker (survives closed tabs).
4. **Open window** — Default **30 minutes** unlocked, then auto re-lock with no shame messaging.
5. **Re-lock now** — Always one click from the popup.

Timers live in `background.js`, not in the popup tab. Closing the unlock page does **not** reset the cooldown.

---

## Why not only use Reddit’s NSFW setting?

People searching for a **reddit nsfw blocker** usually already tried Reddit’s setting. It fails as self-control because:

- Turning NSFW back on is one click mid-urge.
- There is no cooldown, reminder, or commitment friction.
- Blur is not the same as blocked content.

This project is built for **urge-surfing**: the craving peaks and passes; the wait is space for that, not punishment.

---

## Features checklist

- [x] Block NSFW posts in New Reddit and Old Reddit feeds  
- [x] Redirect age-gated / 18+ subreddit interstitials  
- [x] Redirect single NSFW post pages  
- [x] Custom subreddit blocklist  
- [x] Personal reminder note (onboarding + editable later)  
- [x] Breathing + 10-minute unlock cooldown  
- [x] Instant re-lock  
- [x] Streak + local block stats  
- [x] Zero runtime network calls (no analytics, no CDN)  
- [x] Manifest V3, vanilla JS — no build step  

---

## Project layout

```
manifest.json      # Chrome MV3 extension manifest
background.js      # State + chrome.alarms (source of truth)
content.css        # Pre-paint NSFW hide
content.js         # Observer, placeholders, redirects
popup.*            # Status, streak, unlock / re-lock, settings
unblock.*          # Breathing → reminder → cooldown tab
blocked.html       # Full-page block screen
onboarding.*       # First-run note capture
HARDENING.md       # Optional browser policy against impulsive uninstall
```

---

## Configuration (defaults)

| Setting | Default | Where |
|--------|---------|--------|
| Cooldown before unlock | 10 minutes | `background.js` → `cooldownMs` |
| Unlocked window | 30 minutes | `background.js` → `unlockWindowMs` |
| Breathing cycles | 5 × (4s in / 6s out) | `unblock.js` |

---

## Limitations (honest)

- **Browser only** — does not affect the Reddit mobile app.
- **Not adversarial-proof** — another browser, DevTools, or disabling the extension still works. Goal: stop *impulsive* relapse, not defeat a determined adversary.
- **Reddit DOM changes** — selectors may need updates over time.
- **Uninstall** — Chrome does not allow extensions to block their own removal. See [HARDENING.md](./HARDENING.md) for optional OS/browser policy (force-install). Real day-to-day defense is the unlock wait.

---

## FAQ

### Is this a free Reddit NSFW blocker for Chrome?

Yes. Open source, install unpacked for free. No account, no paid tier.

### Does it work on Edge / Brave?

Yes. Any Chromium browser that supports Manifest V3 extensions.

### Can I block specific subreddits even if they are not tagged NSFW?

Yes. Add them under **Custom blocked subreddits** in the popup (one name per line, without `r/`).

### Will closing the unlock tab cancel the timer?

No. The cooldown is stored and scheduled in the background service worker.

### Is my data sent anywhere?

No. State stays in `chrome.storage.local`. No telemetry.

### Is this for parents / partners to monitor someone else?

No. Self-installed, self-consented personal use only.

---

## Comparison: common ways to block NSFW on Reddit

| Approach | Friction to reverse | Offline / private | Notes |
|----------|--------------------|-------------------|--------|
| Reddit NSFW preference | Very low | N/A | Easy mid-urge reverse |
| Generic site blocker | Medium | Depends | Often blocks all of Reddit |
| Hosts / DNS filter | Medium–high | Varies | Breaks legitimate use |
| **Reddit NSFW Lock** | High (timed unlock) | Fully local | Feed stays usable SFW |

---

## Security & privacy

- Permissions: `storage`, `alarms`, host access only to `*://*.reddit.com/*`
- No remote fonts, scripts, or analytics
- No accounts

---

## Contributing

Issues and PRs that improve NSFW detection selectors, accessibility, or docs are welcome. Keep the design rules:

1. Do not fake uninstall protection in code.  
2. Never add friction to re-locking.  
3. Never put unlock timers only in a tab.  

Design notes: [agent.md](./agent.md).

---

## License

[MIT](./LICENSE) — free to use, modify, and share.

---

## Links

- **Repository:** https://github.com/jjf2009/reddit-nsfw-blocker  
- **Hardening guide:** [HARDENING.md](./HARDENING.md)  
- **AI/agents summary:** [llms.txt](./llms.txt)

---

*Chrome extension to block NSFW Reddit content with real unlock friction — not just a blur toggle.*
