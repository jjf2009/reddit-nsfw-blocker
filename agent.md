# AGENTS.md — Reddit NSFW Lock

## 0. Mission

Build a Manifest V3 Chrome/Chromium extension called **Reddit NSFW Lock**. It's a personal commitment device: Reddit's own NSFW toggle is a preference that takes one click to reverse, so it has no real enforcement. This extension is the enforcement layer — content is actually hidden, and getting it back requires deliberately riding out an urge, not just flipping a switch.

Built for one person to install on their own browser, for themselves. Not a monitoring tool for restricting someone else without their knowledge.

**If anything below is ambiguous, resolve it in this priority order:**
1. Never fake or half-implement the uninstall-resistance requirement (Module C) — it either works or it's clearly documented as out of scope. No placebo code.
2. Never add friction to re-locking. Friction only ever applies to loosening the restriction.
3. Never let a timer live only in a tab. If closing a tab or the popup can cancel or reset a countdown, that's a bug.
4. Everything else (exact wait times, window durations, copy wording) is a tunable default, not a hard constraint — sensible defaults are given below, adjust freely.

---

## 1. Design philosophy

- **Asymmetric friction.** Tightening the restriction (re-locking) is always free and instant. Loosening it (unlocking) is always effortful. Never build a version of this where relocking has a cost.
- **Urge-surfing, not punishment.** Cravings are time-limited physiological events — they peak and pass. The 10-minute wait exploits that fact; it isn't a penalty, and copy should never frame it as one.
- **Self-authored motivation beats generic copy.** The user writes their own reminder once, while calm, and reads it back mid-urge. Don't replace this with generic stock text like "stay strong."
- **No shame, ever.** This is the single most important tone rule. Shame is a documented relapse trigger, not a deterrent. After an unblock window ends and the extension auto-relocks, there is no "you slipped" messaging — it just quietly returns to LOCKED.
- **Visible progress, gently held.** A streak counter is fine and genuinely effective (loss aversion is a real lever) — but losing it on an unblock should never be paired with scolding copy.
- **Local-only.** No backend, no telemetry, no analytics, nothing leaves the browser. This is sensitive personal data by nature.
- **Minimal permissions.** Only what's functionally required — resist adding permissions speculatively.
- **Be honest with the user about what this tool can and can't do.** Don't imply protection it doesn't deliver.

---

## 2. Non-goals

- Not a parental-control or partner-monitoring tool. Single user, self-installed, self-consented.
- Not attempting true technical prevention of extension removal in code — see Module C for why, and what to build instead.
- Not covering the Reddit mobile app or any non-Reddit site in this version — flag this to the user rather than hiding it.
- Not implementing multi-tier escalating friction (math problems, growing wait times) in v1 — deliberately simplified to one fixed 10-minute cooldown. Leave a hook in the state model (Section 9) for this later, but don't wire up behavior now.

---

## 3. Tech stack & constraints

- Manifest V3, vanilla JS/HTML/CSS. No framework, no bundler, no build step — must run directly as an unpacked extension.
- Zero runtime network calls. No remote fonts, no CDN scripts, no analytics pings. Everything ships bundled.
- Primary target: Chrome/Chromium (covers Edge, Brave, Opera unmodified). Firefox port is a plausible future task, not now.
- Permissions: `storage`, `alarms`, `host_permissions` for `*://*.reddit.com/*`. Nothing beyond this without a specific reason tied back to a requirement in this doc.

---

## 4. Architecture / file map

| File | Responsibility |
|---|---|
| `manifest.json` | MV3 manifest |
| `background.js` | Service worker. **Single source of truth for all state.** Content scripts and UI pages always query this rather than caching their own copy — that's what makes timers survive a closed tab. |
| `content.css` | Injected at `document_start`. Selector-based hiding so NSFW elements are gone before first paint — no flash of content. |
| `content.js` | Isolated-world content script. MutationObserver confirms/replaces CSS-layer hits with a placeholder, watches infinite scroll, handles full-page redirects. |
| `popup.html/js/css` | At-a-glance status, streak, stats, entry point to the unblock flow. |
| `unblock.html/js` | The breathing → reminder → cooldown flow. Its own tab, not the popup — a multi-minute flow can't live somewhere that closes on click-away. |
| `blocked.html` | Shown on full-page redirects (gated subreddit, single NSFW post, custom-blocklisted subreddit). |
| `onboarding.html/js` | First-run only. Captures the user's reminder note. |
| `HARDENING.md` | Documentation, not code. See Module C. |
| `icons/` | Extension icons. |

---

## 5. Module A — Content blocking

Layered and redundant, so one Reddit markup change doesn't break everything at once:

1. **CSS layer** (`content.css`, `document_start`): attribute/class selectors hide matching elements the instant they're parsed into the DOM — this is what prevents any flash of content before JS even runs.
2. **JS layer** (`content.js`): a `MutationObserver` catches content injected later (infinite scroll, in-page SPA navigation). Confirms CSS-layer matches and swaps them for a small, calm placeholder ("NSFW post blocked") rather than leaving a blank gap. Use multiple independent detection signals per post — don't rely on one selector (see Section 14 for the starting set).
3. **Subreddit-level hard block**: Reddit renders its own 18+ interstitial for gated/quarantined subreddits as a distinct element. Detect its presence and redirect straight to `blocked.html` — don't let the click-through interaction render at all.
4. **Single-post pages**: if the one post on a `/comments/...` page is itself NSFW, hiding it just leaves a blank page. Redirect to `blocked.html` instead.
5. **Custom subreddit blocklist**: user-maintained list (editable from the popup), for subreddits the user wants fully blocked regardless of individual tagging.
6. This module only checks one piece of state: skip all blocking while `blockingActive === false` (i.e., during an active unblock window).

---

## 6. Module B — Unblock flow

This is the actual enforcement mechanism. Each step gates the next; all state lives in `background.js` so nothing resets from closing a tab.

1. **Entry** — "Request Unlock" in the popup opens `unblock.html` in a new tab.
2. **Breathing screen** — paced visual (expanding/contracting shape), 4s inhale / 6s exhale, 5 cycles (~50 seconds total). Can't be skipped or sped up. This is a physiological reset, not the main friction — keep it short enough that people don't just learn to tab away and ignore it.
3. **Reminder screen** — shows the note the user wrote once at onboarding, in their own words. No retyping each time; the friction lives in the wait, not in data entry.
4. **10-minute cooldown** — starts only once steps 2–3 are complete. Set via `chrome.alarms` in `background.js`, not a `setInterval` in the tab, so it survives the tab or browser closing and shows the correct remaining time if reopened later. No skip, no fast-forward, ever.
5. **Unlock** — timer hits zero, content unblocks automatically for a fixed window (default **30 minutes**, easy to tune), then `background.js` auto-relocks with no action needed from the user.
6. **Re-lock early** — always available, always instant, one click, zero friction.
7. **(Off by default)** a config flag for escalating the cooldown on repeated same-day unblocks. Leave the hook in the state model; don't wire up the behavior unless asked.

---

## 7. Module C — Tamper / uninstall resistance — read this before writing anything for it

This is the one requirement that **cannot be built as extension code**, and it matters that this gets documented rather than faked.

**Verified fact (checked directly against Chrome's extension API reference):** there is no API, permission, or manifest key that lets an extension prevent or intercept its own removal from `chrome://extensions`. `chrome.management` only lets an extension enable/disable *other* extensions (with the `management` permission) or voluntarily uninstall *itself* (`uninstallSelf()`) — nothing runs in the other direction. This is deliberate on Chrome's part; it's the same protection that stops adware from locking itself onto a machine. Notably, the developer of StayFocusd (a well-known site-blocker extension) requested exactly this capability from the Chromium team years ago — it was never added, and still doesn't exist.

**Do not:**
- Build a fake "disable protection" toggle
- Try to intercept or block navigation to `chrome://extensions`
- Add a `beforeunload`-style trick or any JS that pretends to stop removal

None of that is possible, and code that pretends otherwise is either dead weight or actively misleading to the person relying on it.

**Do build instead:**
- `HARDENING.md` — a plain-language setup guide (documentation, not code) covering the one mechanism that genuinely works: Chrome's `ExtensionInstallForcelist` enterprise policy (a Windows registry key or macOS configuration profile) that greys out the Remove/Disable controls for a specific extension ID at the browser level — outside the extension's own sandbox entirely. Include: how to find the extension's ID once loaded, the registry path / profile steps, and an honest caveat that on a personal device where the user has their own admin access, this raises the bar significantly (deliberate multi-step setup beats an impulsive click) but isn't a true guarantee — that only exists if someone *else* (an accountability partner) holds the admin credentials.
- In the popup/onboarding copy: be upfront that the extension's real defense is the friction in Module B, and point to `HARDENING.md` for anyone who wants a harder guarantee.

---

## 8. State model (`chrome.storage.local`, one object)

- `blockingActive` — boolean
- `unblockUntil` — timestamp | null
- `pendingReadyAt` — timestamp | null (cooldown finish time, set once breathing + reminder steps are done)
- `lastUnblockAt` — timestamp | null, **never trimmed** — drives the streak counter
- `unblockHistory` — timestamp[], rolling window, reserved for the optional future escalation hook (not acted on in v1)
- `reminderNote` — string, captured at onboarding, freely editable later from the popup (people's reasons change — don't gate editing your own note behind friction, that's not where the mechanism lives)
- `customBlockedSubs` — string[]
- `stats` — `{ totalBlocked, blockedToday, lastCountDate }`
- `installedAt` — timestamp

---

## 9. Onboarding / first run

Triggered once via `chrome.runtime.onInstalled`. Briefly explains the philosophy (why a forced wait works, why re-locking is always free), then asks the user to write their reminder note — whatever they want future-them to read mid-urge. Store it; make it editable later from the popup.

---

## 10. Copy & tone rules

- Second person, present tense, calm register throughout.
- Never use words like "failed," "gave in," or "weak" about the user.
- No "welcome back, you slipped" messaging after an auto-relock — it just quietly returns to LOCKED.
- The cooldown/breathing copy should read like a steady friend, not an alarm. Acceptable: *"This will peak and pass, same as always. Ten minutes, that's it."* Avoid anything in the direction of *"You need to control yourself."*

---

## 11. Acceptance checklist

- [ ] Loads unpacked in `chrome://extensions` with no manifest errors
- [ ] NSFW post in a feed is hidden with no visible flash, replaced by a calm placeholder
- [ ] Visiting a fully gated/NSFW subreddit redirects to `blocked.html` before content renders
- [ ] Visiting a single NSFW post's permalink redirects instead of showing a blank page
- [ ] Infinite scroll: posts loaded after the initial page load are still caught
- [ ] Closing the `unblock.html` tab mid-cooldown, then reopening the popup later, shows the correct remaining time — not a reset timer
- [ ] Re-lock is one click, instant, no steps
- [ ] Streak counter resets to 0 on unblock and counts up correctly afterward
- [ ] Zero network requests from the extension at runtime (check the Network tab)
- [ ] `HARDENING.md` exists and is accurate; no code anywhere claims to block extension removal

---

## 12. Known limitations — disclose these to the user, don't bury them

- Browser-only. Does nothing for the Reddit mobile app — that's a different technical problem (OS-level screen-time / VPN-based filtering) and out of scope here.
- A technically determined user can still route around detection (incognito with the extension disabled there, DevTools, a different browser entirely). The design goal is deterrence against impulsive relapse, not an adversarial-proof lock against someone actively trying to defeat their own tool.
- Reddit's DOM changes over time; detection selectors need periodic re-verification (see Section 13).

---

## 13. Reference: Reddit DOM signals verified during planning (July 2026)

- **New Reddit**: the `shreddit-post` custom element reflects post metadata directly as HTML attributes (confirmed pattern via `permalink`, `comment-count`, etc.). NSFW state is expected on an `nsfw` attribute following the same pattern — **verify against a live page before relying on it**, this wasn't checked byte-for-byte.
- **Old Reddit** (`old.reddit.com`): `.thing.over18` class on post containers. This markup is effectively frozen/legacy and has been stable for years — lowest-risk selector in this whole list.
- **Subreddit-level 18+ interstitial**: rendered via a `shreddit-experience-tree` element.
- Treat all three as a verified starting point, not gospel. Confirm against current markup at build time and adjust Section 5's selector list if Reddit has changed something.