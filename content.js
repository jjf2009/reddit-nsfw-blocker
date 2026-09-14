/**
 * Reddit NSFW Lock — content script (isolated world).
 * MutationObserver layer: confirms CSS hits, injects placeholders,
 * watches infinite scroll / SPA nav, handles full-page redirects.
 */

(function () {
  "use strict";

  let blockingActive = true;
  let customBlockedSubs = [];
  let lastCounted = new WeakSet();
  let redirecting = false;
  let ready = false;

  const PLACEHOLDER_CLASS = "rnswfl-placeholder";
  const MARKED = "data-rnswfl-processed";
  const HIDDEN = "data-rnswfl-hidden";

  // ── State from background ──────────────────────────────────────

  function refreshState() {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ type: "IS_BLOCKING" }, (res) => {
          if (chrome.runtime.lastError || !res) {
            // Fail closed: keep blocking
            blockingActive = true;
            applyBlockingFlag();
            resolve();
            return;
          }
          blockingActive = !!res.blockingActive;
          customBlockedSubs = res.customBlockedSubs || [];
          applyBlockingFlag();
          resolve();
        });
      } catch (_) {
        blockingActive = true;
        applyBlockingFlag();
        resolve();
      }
    });
  }

  function applyBlockingFlag() {
    if (blockingActive) {
      document.documentElement.removeAttribute("data-rnswfl-off");
    } else {
      document.documentElement.setAttribute("data-rnswfl-off", "1");
      // Reveal anything we hid and remove placeholders
      document.querySelectorAll("[" + HIDDEN + "]").forEach((el) => {
        el.removeAttribute(HIDDEN);
        // Clear the processed mark too — otherwise these elements are skipped
        // on the next lock and stay visible.
        el.removeAttribute(MARKED);
        el.style.removeProperty("display");
        el.style.removeProperty("visibility");
        el.style.removeProperty("max-height");
        el.style.removeProperty("overflow");
        el.style.removeProperty("margin");
        el.style.removeProperty("padding");
        el.style.removeProperty("pointer-events");
      });
      document.querySelectorAll("[" + MARKED + "]").forEach((el) => el.removeAttribute(MARKED));
      document.querySelectorAll("." + PLACEHOLDER_CLASS).forEach((el) => el.remove());
      lastCounted = new WeakSet();
    }
  }

  // ── Detection signals (multiple independent) ───────────────────

  function isNsfwElement(el) {
    if (!el || el.nodeType !== 1) return false;

    // New Reddit shreddit-post attributes
    if (el.tagName === "SHREDDIT-POST") {
      if (
        el.hasAttribute("nsfw") ||
        el.getAttribute("nsfw") === "true" ||
        el.hasAttribute("is-nsfw") ||
        el.getAttribute("is-nsfw") === "true"
      ) {
        return true;
      }
      // Some builds use over-18 / is-nsfw property-like attrs
      if (el.getAttribute("over-18") === "true" || el.hasAttribute("over-18")) {
        return true;
      }
    }

    // Old Reddit
    if (el.classList && el.classList.contains("thing") && el.classList.contains("over18")) {
      return true;
    }

    // Generic data attributes
    if (
      el.getAttribute("data-nsfw") === "true" ||
      el.getAttribute("data-is-nsfw") === "true"
    ) {
      return true;
    }

    // Nested NSFW badge / stamp (check within post containers only)
    if (el.tagName === "SHREDDIT-POST" || (el.classList && el.classList.contains("thing"))) {
      if (
        el.querySelector(
          '.nsfw-stamp, [data-nsfw="true"], span[class*="nsfw"], [aria-label*="NSFW" i]'
        )
      ) {
        return true;
      }
    }

    return false;
  }

  function findPostContainers(root) {
    const nodes = [];
    if (!root || root.nodeType !== 1) return nodes;

    if (
      root.tagName === "SHREDDIT-POST" ||
      (root.classList && root.classList.contains("thing") && root.classList.contains("over18"))
    ) {
      nodes.push(root);
    }

    if (root.querySelectorAll) {
      root.querySelectorAll("shreddit-post, .thing.over18, [data-nsfw='true']").forEach((n) => {
        nodes.push(n);
      });
    }
    return nodes;
  }

  // ── Placeholder ────────────────────────────────────────────────

  function makePlaceholder() {
    const div = document.createElement("div");
    div.className = PLACEHOLDER_CLASS;
    div.setAttribute("role", "status");
    div.textContent = "NSFW post blocked";
    return div;
  }

  function hideAndPlaceholder(el) {
    if (!blockingActive || !el || el.getAttribute(MARKED) === "1") return;
    if (el.closest && el.closest("." + PLACEHOLDER_CLASS)) return;

    el.setAttribute(MARKED, "1");
    el.setAttribute(HIDDEN, "1");
    el.style.setProperty("display", "none", "important");

    // Insert placeholder before the hidden element
    const parent = el.parentNode;
    if (parent) {
      // Avoid double placeholders next to siblings
      const prev = el.previousElementSibling;
      if (!(prev && prev.classList && prev.classList.contains(PLACEHOLDER_CLASS))) {
        parent.insertBefore(makePlaceholder(), el);
      }
    }

    if (!lastCounted.has(el)) {
      lastCounted.add(el);
      queueBlockedCount();
    }
  }

  // Counting is batched: a feed can hide dozens of posts in one mutation
  // batch, and one storage write per post both spams the service worker and
  // races with itself.
  let pendingCount = 0;
  let flushTimer = null;

  function flushBlockedCount() {
    flushTimer = null;
    const count = pendingCount;
    pendingCount = 0;
    if (count <= 0) return;
    try {
      chrome.runtime.sendMessage({ type: "INCREMENT_BLOCKED", count });
    } catch (_) {
      /* service worker may be restarting; the count is not critical */
    }
  }

  function queueBlockedCount() {
    pendingCount += 1;
    if (!flushTimer) flushTimer = setTimeout(flushBlockedCount, 800);
  }

  window.addEventListener("pagehide", flushBlockedCount);

  // ── Redirects ──────────────────────────────────────────────────

  function blockedUrl(reason) {
    const base = chrome.runtime.getURL("blocked.html");
    const params = new URLSearchParams({
      reason: reason || "nsfw",
      from: location.href,
    });
    return base + "?" + params.toString();
  }

  function redirectToBlocked(reason) {
    if (redirecting || !blockingActive) return;
    redirecting = true;
    location.replace(blockedUrl(reason));
  }

  function currentSubreddit() {
    // /r/name/… or old.reddit.com/r/name
    const m = location.pathname.match(/^\/r\/([^/]+)/i);
    return m ? m[1].toLowerCase() : null;
  }

  function isCommentsPage() {
    return /\/comments\//i.test(location.pathname);
  }

  function isSubredditPage() {
    // /r/sub or /r/sub/… but not user profiles
    return /^\/r\/[^/]+\/?$/i.test(location.pathname) ||
      /^\/r\/[^/]+\/(hot|new|top|rising|controversial|gilded)/i.test(location.pathname);
  }

  // Strong signals: these elements only exist on a gate/interstitial.
  const GATE_SELECTORS = [
    'xpromo-nsfw-blocking-modal',
    '[data-testid="age-gate"]',
    '[data-testid="nsfw-interstitial"]',
    "#quarantine-header",
    ".interstitial.quarantine",
    ".quarantine-notice",
    'form[action*="over18"]',
    'button[name="over18"]',
    "shreddit-forbidden",
  ].join(", ");

  // Weak signal: shreddit-experience-tree is part of new Reddit's general
  // experience framework and appears on ordinary pages too. Redirecting on it
  // alone would blank all of Reddit, so it only counts with corroboration.
  function hasGateText() {
    const title = (document.title || "").toLowerCase();
    if (title.includes("over 18") || title.includes("must be 18")) return true;
    const body = document.body;
    if (!body) return false;
    // Cheap scan: gate screens are tiny, so only look at short pages.
    const text = (body.innerText || "").slice(0, 2000).toLowerCase();
    return (
      text.includes("you must be 18") ||
      text.includes("are you over 18") ||
      text.includes("this community is only for people over 18") ||
      (text.includes("sensitive content") && text.includes("continue"))
    );
  }

  function detectAgeGate() {
    if (document.querySelector(GATE_SELECTORS)) return true;
    if (document.querySelector("shreddit-experience-tree") && hasGateText()) {
      return true;
    }
    return false;
  }

  function detectSingleNsfwPost() {
    if (!isCommentsPage()) return false;

    // New Reddit: main post
    const post =
      document.querySelector("shreddit-post[id], shreddit-post") ||
      document.querySelector("#siteTable .thing.link, .thing.link");

    if (post && isNsfwElement(post)) return true;

    // Comments page post may carry nsfw on the article wrapper
    const article = document.querySelector('[data-testid="post-container"], article');
    if (article && isNsfwElement(article)) return true;

    // Permalink path with nsfw flag in shreddit-app state is rare; check any shreddit-post
    const all = document.querySelectorAll("shreddit-post");
    if (all.length === 1 && isNsfwElement(all[0])) return true;

    return false;
  }

  let lastHardCheck = 0;

  function checkHardBlocks(force) {
    if (!blockingActive || redirecting) return;
    const now = Date.now();
    if (!force && now - lastHardCheck < 400) return;
    lastHardCheck = now;

    const sub = currentSubreddit();
    if (sub && customBlockedSubs.includes(sub)) {
      redirectToBlocked("blocklist");
      return;
    }

    if (detectAgeGate()) {
      redirectToBlocked("gated");
      return;
    }

    if (detectSingleNsfwPost()) {
      redirectToBlocked("post");
    }
  }

  // ── Scan ───────────────────────────────────────────────────────

  function scan(root) {
    if (!blockingActive || !ready) return;
    const scope = root && root.nodeType === 1 ? root : document.documentElement;
    const containers = findPostContainers(scope);
    // Also check root itself
    if (scope !== document.documentElement && isNsfwElement(scope)) {
      containers.push(scope);
    }
    for (const el of containers) {
      if (isNsfwElement(el)) hideAndPlaceholder(el);
    }
    checkHardBlocks();
  }

  // ── SPA navigation ─────────────────────────────────────────────

  let lastHref = location.href;

  function onNavigate() {
    if (location.href === lastHref) return;
    lastHref = location.href;
    redirecting = false;
    lastCounted = new WeakSet();
    // Brief delay for new DOM
    setTimeout(() => {
      refreshState().then(() => {
        scan(document.documentElement);
        checkHardBlocks(true);
      });
    }, 50);
    setTimeout(() => scan(document.documentElement), 400);
  }

  // ── Observer ───────────────────────────────────────────────────

  const observer = new MutationObserver((mutations) => {
    if (!blockingActive) return;
    for (const m of mutations) {
      if (m.type === "childList") {
        m.addedNodes.forEach((node) => {
          if (node.nodeType === 1) scan(node);
        });
      } else if (m.type === "attributes") {
        if (m.target && isNsfwElement(m.target)) hideAndPlaceholder(m.target);
      }
    }
    // SPA URL change without full reload
    if (location.href !== lastHref) onNavigate();
  });

  // ── Init ───────────────────────────────────────────────────────

  // Fail closed before state arrives: leave CSS rules active (no data-rnswfl-off)
  applyBlockingFlag();

  async function init() {
    await refreshState();
    ready = true;
    scan(document.documentElement);
    checkHardBlocks(true);

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["nsfw", "is-nsfw", "over-18", "data-nsfw", "data-is-nsfw", "class"],
    });

    // React immediately to lock/unlock changes written by the service worker.
    // The poll below stays as a fallback for missed events.
    try {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== "local") return;
        if (!("blockingActive" in changes) && !("customBlockedSubs" in changes)) return;
        refreshState().then(() => {
          if (blockingActive) {
            scan(document.documentElement);
            checkHardBlocks(true);
          }
        });
      });
    } catch (_) {
      /* storage events unavailable; poll below covers it */
    }

    // Poll state periodically (unlock window ends, relock from popup)
    setInterval(() => {
      refreshState().then(() => {
        if (blockingActive) scan(document.documentElement);
      });
    }, 5000);

    // History API
    const wrap = (fn) =>
      function () {
        const r = fn.apply(this, arguments);
        queueMicrotask(onNavigate);
        return r;
      };
    try {
      history.pushState = wrap(history.pushState);
      history.replaceState = wrap(history.replaceState);
    } catch (_) {
      /* some environments seal history */
    }
    window.addEventListener("popstate", onNavigate);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  // Also run as early as possible for redirects
  refreshState().then(() => {
    ready = true;
    checkHardBlocks(true);
  });
})();
