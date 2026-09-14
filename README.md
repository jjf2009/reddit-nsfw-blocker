# Reddit NSFW Blocker for Chrome — Reddit NSFW Lock

**Free, open-source Chrome extension that blocks NSFW posts and 18+ subreddits on Reddit, for people who want Reddit without adult content and need more than a one-click setting to stay that way.**

[![Checks](https://github.com/jjf2009/reddit-nsfw-blocker/actions/workflows/checks.yml/badge.svg)](https://github.com/jjf2009/reddit-nsfw-blocker/actions/workflows/checks.yml)
[![Version](https://img.shields.io/github/manifest-json/v/jjf2009/reddit-nsfw-blocker?label=version)](./manifest.json)
[![License: MIT](https://img.shields.io/github/license/jjf2009/reddit-nsfw-blocker)](./LICENSE)
[![Chrome Manifest V3](https://img.shields.io/badge/Chrome-Manifest%20V3-4285F4?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3)
[![Last commit](https://img.shields.io/github/last-commit/jjf2009/reddit-nsfw-blocker)](https://github.com/jjf2009/reddit-nsfw-blocker/commits)
[![GitHub stars](https://img.shields.io/github/stars/jjf2009/reddit-nsfw-blocker?style=social)](https://github.com/jjf2009/reddit-nsfw-blocker/stargazers)

**Last updated:** 2026-09-14

---

## Table of contents

- [What is Reddit NSFW Lock?](#what-is-reddit-nsfw-lock)
- [Who it is for](#who-it-is-for)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [How it works](#how-it-works)
- [Reddit NSFW Lock vs alternatives](#reddit-nsfw-lock-vs-alternatives)
- [FAQ](#faq)
- [Privacy and permissions](#privacy-and-permissions)
- [Limitations](#limitations)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

---

## What is Reddit NSFW Lock?

Reddit NSFW Lock is a free, open-source browser extension for Chrome and other Chromium browsers that blocks NSFW (18+) content on Reddit. It hides NSFW-tagged posts in feeds, redirects age-gated subreddits and NSFW post links to a block page, and lets you add your own list of subreddits to block. Ordinary, safe-for-work Reddit keeps working.

What makes it different from Reddit's own mature-content setting is that it is hard to switch off in a weak moment. Turning blocking off takes a one-minute breathing exercise, a note you wrote to yourself, and a 10-minute wait. After that, Reddit is unblocked for 30 minutes and then locks again on its own. Turning blocking back on is always one click.

It runs entirely in your browser: no account, no server, no tracking.

## Who it is for

- **People quitting or cutting back on adult content** who still want to use Reddit for everything else.
- **Anyone whose Reddit habit keeps drifting into NSFW subreddits** and who finds that Reddit's setting is too easy to flip back.
- **Privacy-conscious users** who want a blocker that sends nothing anywhere.

It is **not** a parental-control or monitoring tool. It is built for one person to install on their own browser, for themselves.

## Features

- Hides NSFW posts on **new Reddit** (`www.reddit.com`) and **old Reddit** (`old.reddit.com`), replaced by a small "NSFW post blocked" placeholder
- Hides content before the page paints, so there is no flash of the post
- Catches posts loaded later by infinite scroll and in-page navigation
- Redirects **age-gated / quarantined subreddits** and **single NSFW post pages** to a block page
- **Custom subreddit blocklist** for communities you want blocked even if they aren't tagged NSFW
- **Unlock flow with real friction:** breathing exercise → your own reminder note → 10-minute cooldown
- The cooldown runs in the background: **closing the tab doesn't reset it**
- **Auto re-lock** after a 30-minute window, and **instant re-lock** at any time
- Streak counter and local "posts blocked" stats
- **Zero network requests**, no analytics, no remote code
- Manifest V3, plain JavaScript, no build step

## Installation

Reddit NSFW Lock is not on the Chrome Web Store yet, so you install it as an unpacked extension. It takes about a minute and works the same on Windows, macOS, Linux and ChromeOS.

### 1. Get the code

With Git:

```bash
git clone https://github.com/jjf2009/reddit-nsfw-blocker.git
```

Without Git: on the [repository page](https://github.com/jjf2009/reddit-nsfw-blocker), click **Code → Download ZIP** and unzip it. You should see `manifest.json` in the folder.

### 2. Load it in your browser

| Browser | Extensions page | Steps |
|---------|-----------------|-------|
| Google Chrome | `chrome://extensions` | Turn on **Developer mode** (top right) → **Load unpacked** → select the folder |
| Microsoft Edge | `edge://extensions` | Turn on **Developer mode** (left sidebar) → **Load unpacked** → select the folder |
| Brave | `brave://extensions` | Turn on **Developer mode** → **Load unpacked** → select the folder |
| Opera | `opera://extensions` | Turn on **Developer mode** → **Load unpacked** → select the folder |
| Vivaldi | `vivaldi://extensions` | Turn on **Developer mode** → **Load unpacked** → select the folder |
| Arc | `chrome://extensions` | Same as Chrome |

### 3. Finish setup

1. A welcome tab opens. Write a short note to your future self: it's shown to you whenever you ask to unlock.
2. Pin the extension icon to your toolbar.
3. **Recommended:** open the extension's details and turn on **Allow in Incognito**. Otherwise a private window skips the blocker.

### Firefox, Safari and mobile

- **Firefox:** not supported yet. A port is planned but not started.
- **Safari:** not supported.
- **Reddit apps for iPhone and Android:** not supported. Browser extensions can't reach apps; use your phone's screen-time or content filter settings instead.

### Updating

```bash
cd reddit-nsfw-blocker
git pull
```

Then click the reload icon on the extension card in `chrome://extensions`. Your note, blocklist and streak are kept.

## Usage

### Check it's working

1. Open a Reddit feed that mixes safe and NSFW posts. NSFW posts show as "NSFW post blocked".
2. Open the link to a post marked NSFW. You land on the extension's block page.
3. Click the extension icon. The popup shows **Locked**, your streak, and how many posts were blocked today.

### Block specific subreddits

In the popup, under **Custom blocked subreddits**, enter one subreddit per line and click **Save list**. Names are case-insensitive and the `r/` prefix is optional:

```text
examplesub
r/AnotherSub
```

Any page under those subreddits redirects to the block page while you're locked.

### Unlock temporarily

1. Click the extension icon → **Request unlock**. A new tab opens.
2. Follow the breathing circle for five slow breaths (about 50 seconds). It can't be skipped.
3. Read your reminder note, then click **Continue to the wait**.
4. Wait 10 minutes. You can close the tab; the timer keeps running.
5. Reddit is unblocked for 30 minutes, then locks again by itself.

### Re-lock early

Click the extension icon → **Re-lock now**. It's instant, with no steps.

### Change the timings

The defaults live in [`background.js`](./background.js). Edit them, then reload the extension:

```js
const DEFAULTS = {
  // ...
  cooldownMs: 10 * 60 * 1000,     // wait before an unlock starts
  unlockWindowMs: 30 * 60 * 1000, // how long the unlock lasts
};
```

The breathing pace (`CYCLES`, `INHALE_MS`, `EXHALE_MS`) is at the top of [`unblock.js`](./unblock.js).

### Make it harder to uninstall (optional)

Chrome doesn't let any extension stop its own removal. What does work is a browser policy that pins the extension so Remove is greyed out. On Linux, for example:

```json
// /etc/opt/chrome/policies/managed/reddit_nsfw_lock.json
{
  "ExtensionInstallForcelist": [
    "YOUR_EXTENSION_ID;https://clients2.google.com/service/update2/crx"
  ]
}
```

Force-install needs a packed extension with an update URL. Windows and macOS steps, and the honest caveats, are in [HARDENING.md](./HARDENING.md).

## How it works

1. **CSS layer** — [`content.css`](./content.css) is injected before Reddit renders. It hides elements carrying Reddit's NSFW markers (`shreddit-post[nsfw]` on new Reddit, `.thing.over18` on old Reddit) the moment they're parsed.
2. **JavaScript layer** — [`content.js`](./content.js) watches the page with a `MutationObserver`, swaps hidden posts for a placeholder, and checks each page for age gates, NSFW post pages and blocklisted subreddits.
3. **Background state** — [`background.js`](./background.js) is the single source of truth. The cooldown and unlock window are `chrome.alarms` stored with the extension, not timers in a tab, so they survive closed tabs, a restarted service worker and a restarted browser.
4. **Unlock flow** — [`unblock.html`](./unblock.html) runs breathing → reminder → cooldown in its own tab.
5. **Fail closed** — if a Reddit page loads before the extension can read its state, blocking stays on.

Design rationale: [agent.md](./agent.md).

## Reddit NSFW Lock vs alternatives

| Option | Blocks only NSFW (rest of Reddit usable) | Effort to undo mid-urge | Free and open source | Data stays local |
|--------|:---:|---|:---:|:---:|
| **Reddit NSFW Lock** | Yes | 1-minute breathing + 10-minute wait | Yes | Yes |
| Reddit's mature-content setting | Yes | One click | — | Stored in your Reddit account |
| uBlock Origin + custom filter | Yes, if you write the filter | Disable the filter or extension | Yes | Yes |
| General site blockers (LeechBlock NG, StayFocusd, BlockSite) | No — blocks whole sites or URLs | Varies by tool and settings | Varies | Varies |
| Desktop blockers (Cold Turkey and similar) | No — blocks whole sites or apps | Can be very high | Mostly no | Yes |
| DNS or hosts filtering | No — blocks domains, often all of Reddit | Change a network setting | Varies | Varies |

**Reddit NSFW Lock vs Reddit's setting:** both hide NSFW posts, but Reddit's setting is a preference you can reverse in one click. This extension adds a deliberate wait before content comes back.

**Reddit NSFW Lock vs a uBlock Origin filter:** a cosmetic filter such as `www.reddit.com##shreddit-post[nsfw]` can hide NSFW posts too. It doesn't redirect age-gated subreddits, keep a blocklist, or add any friction to turning it off.

**Reddit NSFW Lock vs general site blockers:** tools like LeechBlock NG block whole sites or URL patterns and are good at that. They can't tell a safe-for-work post from an NSFW one on the same subreddit feed.

More detail: [docs/alternatives.md](./docs/alternatives.md).

## FAQ

### What is the best way to block NSFW content on Reddit?

In a desktop browser, use an extension that hides NSFW-tagged posts and makes the block hard to reverse on impulse. Reddit NSFW Lock does both, for free, and keeps the rest of Reddit usable. On the Reddit mobile app, use your phone's content or screen-time controls, because browser extensions can't affect apps.

### How do I block NSFW posts on Reddit in Chrome?

Install Reddit NSFW Lock: download it from GitHub, open `chrome://extensions`, turn on Developer mode, click **Load unpacked**, and choose the folder. NSFW posts are hidden from then on. Full steps are in [Installation](#installation).

### Is there a free Reddit NSFW blocker extension?

Yes. Reddit NSFW Lock is free and open source under the MIT license. There's no paid tier and no account.

### How is this different from Reddit's "show mature content" setting?

Reddit's setting can be turned back on in one click. Reddit NSFW Lock requires a short breathing exercise, your own reminder, and a 10-minute wait before content comes back, and it re-locks automatically after 30 minutes.

### Can I still use Reddit normally?

Yes. Only NSFW-tagged posts, age-gated subreddits, and subreddits you add to your blocklist are blocked.

### Does it block entire subreddits?

It blocks age-gated and quarantined subreddits automatically. For any other subreddit, add it to **Custom blocked subreddits** in the popup.

### Does it hide NSFW comments?

No. It works on posts and subreddits that Reddit tags as NSFW. Comments inside a safe-for-work post aren't filtered.

### Does it work on old.reddit.com?

Yes. Old Reddit marks NSFW posts with a stable `over18` class, which the extension uses.

### Does it work in Incognito mode?

Only if you allow it. Open the extension's details and turn on **Allow in Incognito**.

### Does it work on Firefox, Safari, iPhone or Android?

Not currently. It supports Chrome and Chromium browsers (Edge, Brave, Opera, Vivaldi, Arc) on desktop.

### Why is there a 10-minute wait to unlock?

Urges peak and pass, usually within minutes. The wait gives that time to happen. It isn't a punishment, and there's no shaming message after an unlock.

### What happens if I close the tab during the wait?

Nothing changes. The timer lives in the extension's background worker, so it keeps counting and unlocks when it reaches zero. Reopening the popup shows the correct time left.

### Can I shorten or skip the wait?

There's no skip button. You can change the durations in `background.js` (see [Change the timings](#change-the-timings)), which takes deliberate effort rather than a click.

### Can I stop myself from uninstalling it?

No extension can block its own removal; Chrome doesn't allow it. You can pin it with Chrome's `ExtensionInstallForcelist` policy so Remove is greyed out. See [HARDENING.md](./HARDENING.md).

### Does it collect or send any data?

No. Everything is stored in `chrome.storage.local` in your browser. The extension makes no network requests.

### Is it on the Chrome Web Store?

Not yet. Install it unpacked from GitHub.

### Can I use this to monitor my child or partner?

No. It's designed for self-installed, self-chosen use. It has no reporting or remote features.

## Privacy and permissions

| Permission | Why it's needed |
|------------|-----------------|
| `storage` | Saves your lock state, note, blocklist and stats locally |
| `alarms` | Runs the cooldown and auto re-lock timers in the background |
| Host access to `*://*.reddit.com/*` | Hides NSFW content on Reddit pages; no other sites |

No remote scripts, fonts or analytics. No accounts.

## Limitations

- **Desktop browsers only.** It does nothing for the Reddit mobile apps.
- **Not bypass-proof.** Another browser, DevTools, or disabling the extension still works. It's built to stop impulsive moments, not someone determined to get around their own tool.
- **Reddit changes its markup.** Detection may need updating when Reddit changes its page structure. Please [open an issue](https://github.com/jjf2009/reddit-nsfw-blocker/issues) if NSFW content gets through.
- **Can't block its own uninstall.** See [HARDENING.md](./HARDENING.md) for the browser policy that can.

## Development

No dependencies and no build step. You need Node.js 18+ only to run the checks:

```bash
npm test            # service worker state machine tests
npm run validate    # manifest, file references, MV3 CSP, zero network calls
npm run check       # both
npm run pack        # build dist/reddit-nsfw-lock.zip
```

Without npm, run the scripts directly:

```bash
node tools/validate.js
node tools/test-background.js
```

The tests cover the service worker. Detection in `content.js` depends on Reddit's live markup, so verify it by hand using [Check it's working](#check-its-working).

### Project layout

```text
manifest.json             Chrome MV3 manifest
background.js             State and timers (single source of truth)
content.css               Pre-paint NSFW hiding
content.js                Observer, placeholders, redirects
popup.*                   Status, streak, unlock / re-lock, settings
unblock.*                 Breathing → reminder → cooldown tab
blocked.html, blocked.js  Full-page block screen
onboarding.*              First-run note
hardening.html            In-extension hardening guide
HARDENING.md              Hardening guide for GitHub readers
tools/                    Validator and tests
docs/                     Guides and comparisons
```

## Contributing

Bug reports and pull requests are welcome, especially fixes for NSFW detection when Reddit changes its markup. Read [CONTRIBUTING.md](./CONTRIBUTING.md) first; it covers the design rules and how to report detection problems without sharing explicit content. This project follows a [Code of Conduct](./CODE_OF_CONDUCT.md).

## License

[MIT](./LICENSE) © jjf2009

---

**Links:** [Install guide](./docs/how-to-block-nsfw-on-reddit-chrome.md) · [Alternatives](./docs/alternatives.md) · [Hardening](./HARDENING.md) · [Docs index](./docs/README.md) · [llms.txt](./llms.txt)
