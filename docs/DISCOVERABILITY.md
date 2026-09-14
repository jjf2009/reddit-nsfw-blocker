# Discoverability playbook — get found for “reddit nsfw blocker”

Repo SEO alone is necessary but not sufficient. Google and GitHub both need a **public** repo plus external signals.

## Done in this repository

| Asset | Purpose |
|-------|---------|
| Repo name `reddit-nsfw-blocker` | Exact-match URL/title for GitHub + Google |
| README title, one-line summary, "What is Reddit NSFW Lock?" | Quotable definition for search snippets and AI answers |
| README FAQ + comparison table | Natural-language questions AI assistants surface directly |
| `docs/alternatives.md` | "X vs Y" comparison intent |
| `docs/how-to-block-nsfw-on-reddit-chrome.md` | "How to block NSFW on Reddit Chrome" intent |
| `llms.txt` | Machine-readable summary, in llmstxt.org format |
| `package.json` keywords, description, repository | Metadata for code search and package indexes |
| CONTRIBUTING.md, CODE_OF_CONDUCT.md, MIT LICENSE, CI badge | Project maturity signals |

## GitHub settings

- **Description:** `Free, open-source Chrome extension that blocks NSFW posts and 18+ subreddits on Reddit. Unlocking takes a 10-minute cooldown; re-locking is one click. Local-only, no tracking. Works in Chrome, Edge, Brave and other Chromium browsers.`
- **Topics:** `reddit`, `nsfw`, `nsfw-blocker`, `reddit-nsfw`, `chrome-extension`, `browser-extension`, `manifest-v3`, `content-blocker`, `adult-content-blocker`, `self-control`, `digital-wellbeing`, `productivity`, `privacy`, `nofap`, `javascript`
- **Homepage:** the repo README, or a GitHub Pages site if one is added

Apply with:

```bash
gh repo edit jjf2009/reddit-nsfw-blocker \
  --description "Free, open-source Chrome extension that blocks NSFW posts and 18+ subreddits on Reddit. Unlocking takes a 10-minute cooldown; re-locking is one click. Local-only, no tracking. Works in Chrome, Edge, Brave and other Chromium browsers." \
  --add-topic nsfw-blocker,browser-extension,adult-content-blocker,productivity,nofap,javascript
```

## After the repo is public (you should do these)

### Week 1

1. Confirm Google can see it:  
   `https://www.google.com/search?q=site:github.com/jjf2009/reddit-nsfw-blocker`
2. Request indexing (optional): [Google Search Console](https://search.google.com/search-console) → URL inspection → `https://github.com/jjf2009/reddit-nsfw-blocker`
3. Answer one real question on Reddit/Stack Overflow/Quora about blocking NSFW on Reddit and link the repo **only if it genuinely solves the ask** (no spam).

### Ongoing (high leverage)

| Channel | Why it helps |
|---------|----------------|
| Authentic replies in r/nosurf, r/productivity, r/chrome_extensions | Reddit is heavily cited by AI + Google |
| Chrome Web Store listing (optional later) | New discovery surface; link back to GitHub |
| Product Hunt / alternative.to / awesome-lists | Backlinks |
| Short demo GIF in README | Higher dwell time → better engagement signals |

### Queries to track monthly

- `reddit nsfw blocker`
- `block nsfw reddit chrome`
- `hide nsfw reddit extension`
- `reddit nsfw chrome extension`
- `how to block nsfw on reddit`

Search each in Google, GitHub, ChatGPT, and Perplexity. Note whether this repo appears.

## What will not work

- Keyword-stuffed READMEs with no install path  
- Fake “cannot uninstall” claims  
- Mass-posting the same link in forums  
- Expecting page-1 Google ranking in 24 hours with zero external links  

Realistic timeline: **days** for GitHub search if topics/name match; **weeks–months** for competitive Google queries as links and stars accumulate.

## Optional: GitHub Pages

If you later add a simple site under `docs/` with Pages enabled, Google may rank the landing page faster than the raw repo for some queries. README remains the minimum viable surface.
