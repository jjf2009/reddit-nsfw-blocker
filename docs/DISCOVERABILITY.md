# Discoverability playbook — get found for “reddit nsfw blocker”

Repo SEO alone is necessary but not sufficient. Google and GitHub both need a **public** repo plus external signals.

## Done in this repository

| Asset | Purpose |
|-------|---------|
| Repo name `reddit-nsfw-blocker` | Exact-match URL/title for GitHub + Google |
| README H1 + first paragraph | Primary keywords + clear definition |
| `docs/how-to-block-nsfw-on-reddit-chrome.md` | “How to block NSFW on Reddit Chrome” intent |
| `llms.txt` | Machine-readable summary for AI search |
| GitHub topics (set on push) | GitHub search facets |
| MIT LICENSE | Trust / adoption signal |

## GitHub settings (set automatically on publish)

- **Description:** `Chrome extension Reddit NSFW blocker — hide NSFW posts with a 10-minute unlock cooldown. Local-only commitment device.`
- **Topics:** `reddit`, `nsfw`, `chrome-extension`, `blocker`, `self-control`, `manifest-v3`, `privacy`, `content-blocker`, `reddit-nsfw`, `digital-wellbeing`
- **Homepage:** can point at the repo README or GitHub Pages later

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
