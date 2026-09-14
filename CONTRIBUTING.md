# Contributing to Reddit NSFW Lock

Thanks for helping. The most valuable contributions are fixes for NSFW detection when Reddit changes its page markup, followed by accessibility, documentation, and browser compatibility.

## Contents

- [Design rules](#design-rules)
- [Reporting a detection problem](#reporting-a-detection-problem)
- [Development setup](#development-setup)
- [Making a change](#making-a-change)
- [Pull request checklist](#pull-request-checklist)
- [Writing copy](#writing-copy)

## Design rules

These come from [agent.md](./agent.md) and aren't negotiable in pull requests:

1. **Never fake uninstall protection.** Chrome gives extensions no way to block their own removal. Don't add toggles, scripts, or messages that suggest otherwise.
2. **Never add friction to re-locking.** Re-locking stays one click. Friction only applies to unlocking.
3. **Never keep a timer only in a tab.** Cooldowns and unlock windows live in `background.js` with `chrome.alarms`, so closing a tab can't reset them.
4. **Stay local.** No network requests, analytics, remote fonts, or CDN scripts.
5. **Keep permissions minimal.** Don't add a permission without tying it to a specific requirement.
6. **No build step.** The folder must load unpacked as-is.

## Reporting a detection problem

If NSFW content gets through, or a safe page is blocked by mistake, [open an issue](https://github.com/jjf2009/reddit-nsfw-blocker/issues) with:

- **Where:** new Reddit (`www.reddit.com`) or old Reddit (`old.reddit.com`), and the page type: home feed, subreddit feed, single post, search, or profile.
- **What happened:** post shown, page blank, wrong redirect, and so on.
- **Browser and version.**
- **Markup, not content:** in DevTools, right-click the post element → **Copy → Copy element**, then remove titles, usernames, links, and image URLs before pasting. The tag name and attributes are what matter, for example:

  ```html
  <shreddit-post nsfw="" post-type="image" ...>
  ```

**Please don't post screenshots of explicit content, or links to NSFW posts or subreddits.** Describe them instead.

## Development setup

You need a Chromium browser. Node.js 18+ is only required for the checks.

```bash
git clone https://github.com/jjf2009/reddit-nsfw-blocker.git
cd reddit-nsfw-blocker
npm run check
```

Load the folder in `chrome://extensions` with **Developer mode → Load unpacked**. After editing:

- **`content.js` or `content.css`:** reload the extension, then reload the Reddit tab.
- **`background.js`:** reload the extension. To inspect it, click **service worker** on the extension card.
- **Popup or unblock pages:** reopen them.

To test the unlock flow quickly, temporarily lower `cooldownMs` and `unlockWindowMs` in `background.js`. Don't commit those changes.

## Making a change

| Area | File | Notes |
|------|------|-------|
| Pre-paint hiding | `content.css` | Must work before any JavaScript runs. Scope every rule under `html:not([data-rnswfl-off])`. |
| Detection, placeholders, redirects | `content.js` | Use several independent signals. Avoid selectors that also match ordinary pages. |
| State and timers | `background.js` | Add a case to `tools/test-background.js` for any state change. |
| Popup | `popup.html`, `popup.js`, `popup.css` | |
| Unlock flow | `unblock.html`, `unblock.js`, `unblock.css` | |

Extension pages run under Manifest V3's content security policy: no inline `<script>` blocks and no inline `onclick` handlers. `tools/validate.js` checks for both.

## Pull request checklist

- [ ] `npm run check` passes
- [ ] You loaded the extension unpacked and tried the change on Reddit
- [ ] For detection changes: tested on both new and old Reddit, and confirmed ordinary safe-for-work pages still load normally
- [ ] No new permissions, network requests, or remote assets
- [ ] If you bumped the version, `manifest.json` and `package.json` match
- [ ] User-facing text follows [Writing copy](#writing-copy)

Keep pull requests focused on one change. Describe what you changed, why, and how you tested it.

## Writing copy

People often open this extension in a difficult moment. Text should read like a calm, steady friend:

- Use second person, present tense, and short sentences.
- Never call the user weak, or say they failed, slipped, or gave in.
- Show no "welcome back" or streak-lost scolding after an unlock ends.
- Frame the wait as space for an urge to pass, never as a punishment.
- Be honest about what the extension can't do.

By contributing, you agree that your contributions are licensed under the [MIT License](./LICENSE) and that you'll follow the [Code of Conduct](./CODE_OF_CONDUCT.md).
