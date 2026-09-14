# How to Block NSFW on Reddit in Chrome (2026)

**Last updated:** 2026-09-14  
**Tool:** [Reddit NSFW Lock](https://github.com/jjf2009/reddit-nsfw-blocker) — open-source Reddit NSFW blocker for Chrome

## TL;DR

1. Install [Reddit NSFW Lock](https://github.com/jjf2009/reddit-nsfw-blocker) as an unpacked Chrome extension.  
2. Write a personal reminder note on first run.  
3. NSFW posts are hidden; temporary unlock needs breathing + a 10-minute wait.  
4. Re-lock is always instant.

This is the practical answer if you searched **how to block NSFW on Reddit Chrome**, **reddit nsfw blocker**, or **hide adult content on Reddit**.

---

## Prerequisites

- Chrome, Edge, Brave, or another Chromium browser  
- Ability to load unpacked extensions (Developer mode)

---

## Step-by-step: install the Reddit NSFW blocker

1. Open the repo: [github.com/jjf2009/reddit-nsfw-blocker](https://github.com/jjf2009/reddit-nsfw-blocker).  
2. Click **Code → Download ZIP** (or `git clone https://github.com/jjf2009/reddit-nsfw-blocker.git`).  
3. Unzip if needed so you can see `manifest.json` in the folder root.  
4. Go to `chrome://extensions`.  
5. Enable **Developer mode** (top right).  
6. Click **Load unpacked** and choose that folder.  
7. When onboarding opens, write a short note to yourself (shown again during unlock).  
8. Visit [reddit.com](https://www.reddit.com) and confirm NSFW posts are blocked.

---

## What gets blocked

| Content | Behavior |
|---------|----------|
| NSFW posts in feeds | Hidden, replaced with “NSFW post blocked” |
| Age-gated / 18+ subreddit interstitial | Redirect to blocked page |
| Single NSFW post URL | Redirect (avoids a blank page) |
| Custom subreddits you list | Fully blocked regardless of tags |

---

## Temporary unlock (when you really need it)

1. Click the extension icon → **Request unlock**.  
2. Complete the breathing screen (cannot skip).  
3. Read your reminder.  
4. Wait **10 minutes** (timer continues if you close the tab).  
5. Content unblocks for about **30 minutes**, then locks again.  
6. Or click **Re-lock now** anytime — no wait.

---

## Common issues

### “Load unpacked is greyed out / missing”

Turn on **Developer mode** on `chrome://extensions` first.

### “NSFW still shows briefly”

Hard-refresh Reddit (`Ctrl+Shift+R`). The CSS layer runs at `document_start`; if Reddit changed markup, open an issue on the repo with the page type (new/old Reddit).

### “Extension doesn’t run in Incognito”

Open extension details → enable **Allow in Incognito**. Otherwise Incognito is an easy bypass.

### “I want harder uninstall protection”

Chrome forbids extensions from blocking their own removal. Optional OS policy steps: [HARDENING.md](../HARDENING.md).

### “Does this work on the Reddit app?”

No. Browser only. For mobile, use OS screen-time or network filters — out of scope for this extension.

---

## Why this beats Reddit’s built-in NSFW setting

Reddit’s setting is a preference. Mid-urge, one click restores everything. A dedicated **reddit nsfw chrome extension** with a forced wait matches how cravings work: they peak and pass. The 10 minutes are space, not a penalty.

---

## Next steps

- Add high-risk subreddits to the custom blocklist in the popup.  
- Read [HARDENING.md](../HARDENING.md) if you want force-install policy.  
- Compare other options in [Reddit NSFW Lock vs alternatives](./alternatives.md).  
- Browse the [FAQ](../README.md#faq).  
- Star the repo so others searching for a **Reddit NSFW blocker** can find it:  
  https://github.com/jjf2009/reddit-nsfw-blocker
