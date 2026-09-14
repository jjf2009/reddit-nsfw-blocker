# Reddit NSFW Lock documentation

Reddit NSFW Lock is a free, open-source Chrome extension that blocks NSFW posts and 18+ subreddits on Reddit, with a 10-minute cooldown before any temporary unlock.

## Start here

| Guide | Read it when |
|-------|--------------|
| [How to block NSFW on Reddit in Chrome](./how-to-block-nsfw-on-reddit-chrome.md) | You want step-by-step install and troubleshooting |
| [Reddit NSFW Lock vs alternatives](./alternatives.md) | You're choosing between this, Reddit's setting, uBlock Origin, or a site blocker |
| [FAQ](../README.md#faq) | You have a quick question |
| [Hardening guide](../HARDENING.md) | You want Remove greyed out on `chrome://extensions` |

## For contributors

| Document | Covers |
|----------|--------|
| [CONTRIBUTING.md](../CONTRIBUTING.md) | Design rules, reporting detection bugs safely, PR checklist |
| [agent.md](../agent.md) | Full design spec and reasoning |
| [DISCOVERABILITY.md](./DISCOVERABILITY.md) | How the project gets found in search and AI answers |

## Suggested future pages

If the docs grow, or move to GitHub Pages or a wiki, this structure keeps each page focused on one question:

```text
docs/
  README.md                              index (this page)
  how-to-block-nsfw-on-reddit-chrome.md  install and troubleshooting
  alternatives.md                        comparisons
  how-it-works.md                        detection layers and timer design
  selectors.md                           Reddit markup signals, with the date each was last verified
  firefox.md                             port status, once started
```
