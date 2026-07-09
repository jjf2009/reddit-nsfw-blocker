/**
 * Reddit NSFW Lock — service worker.
 * Single source of truth for all state. Content scripts and UI always query here.
 */

const DEFAULTS = {
  blockingActive: true,
  unblockUntil: null,
  pendingReadyAt: null,
  lastUnblockAt: null,
  unblockHistory: [],
  reminderNote: "",
  customBlockedSubs: [],
  stats: { totalBlocked: 0, blockedToday: 0, lastCountDate: null },
  installedAt: null,
  // Tunables (easy to change)
  cooldownMs: 10 * 60 * 1000, // 10 minutes
  unlockWindowMs: 30 * 60 * 1000, // 30 minutes
  // Hook for future escalating cooldown (off; not wired in v1)
  escalateCooldown: false,
  onboardingComplete: false,
};

const ALARM_COOLDOWN = "cooldown-ready";
const ALARM_RELOCK = "auto-relock";

// ── Storage helpers ──────────────────────────────────────────────

async function getState() {
  const data = await chrome.storage.local.get(null);
  return { ...DEFAULTS, ...data };
}

async function setState(partial) {
  await chrome.storage.local.set(partial);
  return getState();
}

// ── Stats ────────────────────────────────────────────────────────

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

async function incrementBlocked(count = 1) {
  const state = await getState();
  const today = todayKey();
  let { totalBlocked, blockedToday, lastCountDate } = state.stats || {};
  totalBlocked = (totalBlocked || 0) + count;
  if (lastCountDate !== today) {
    blockedToday = count;
    lastCountDate = today;
  } else {
    blockedToday = (blockedToday || 0) + count;
  }
  await setState({
    stats: { totalBlocked, blockedToday, lastCountDate },
  });
}

// ── Streak ───────────────────────────────────────────────────────

function computeStreak(lastUnblockAt, installedAt, blockingActive, unblockUntil) {
  // During an active unlock window, streak is 0 (just used an unblock)
  if (!blockingActive || (unblockUntil && Date.now() < unblockUntil)) {
    return 0;
  }
  const anchor = lastUnblockAt || installedAt;
  if (!anchor) return 0;
  const ms = Date.now() - anchor;
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
}

// ── Alarms ───────────────────────────────────────────────────────

async function clearAlarm(name) {
  await chrome.alarms.clear(name);
}

async function scheduleCooldown(readyAt) {
  await clearAlarm(ALARM_COOLDOWN);
  chrome.alarms.create(ALARM_COOLDOWN, { when: readyAt });
}

async function scheduleRelock(until) {
  await clearAlarm(ALARM_RELOCK);
  chrome.alarms.create(ALARM_RELOCK, { when: until });
}

// ── Core state transitions ───────────────────────────────────────

async function ensureConsistentState() {
  const state = await getState();
  const now = Date.now();

  // Cooldown finished while SW was asleep
  if (state.pendingReadyAt && now >= state.pendingReadyAt && state.blockingActive) {
    await activateUnlock(state);
    return getState();
  }

  // Unlock window expired while SW was asleep
  if (state.unblockUntil && now >= state.unblockUntil && !state.blockingActive) {
    await relock({ quiet: true });
    return getState();
  }

  // Unlock window still active — ensure alarm
  if (state.unblockUntil && now < state.unblockUntil && !state.blockingActive) {
    await scheduleRelock(state.unblockUntil);
  }

  // Cooldown still pending
  if (state.pendingReadyAt && now < state.pendingReadyAt && state.blockingActive) {
    await scheduleCooldown(state.pendingReadyAt);
  }

  return getState();
}

async function activateUnlock(state) {
  const now = Date.now();
  const until = now + (state.unlockWindowMs || DEFAULTS.unlockWindowMs);
  const history = [...(state.unblockHistory || []), now].slice(-100);

  await setState({
    blockingActive: false,
    unblockUntil: until,
    pendingReadyAt: null,
    lastUnblockAt: now,
    unblockHistory: history,
  });
  await clearAlarm(ALARM_COOLDOWN);
  await scheduleRelock(until);
}

async function relock({ quiet = true } = {}) {
  await setState({
    blockingActive: true,
    unblockUntil: null,
    pendingReadyAt: null,
  });
  await clearAlarm(ALARM_RELOCK);
  await clearAlarm(ALARM_COOLDOWN);
  // quiet: no messaging — just return to LOCKED
  void quiet;
}

async function startCooldown() {
  const state = await getState();
  // Already unlocked or already in cooldown
  if (!state.blockingActive) {
    return { ok: false, reason: "already_unlocked", state: await ensureConsistentState() };
  }
  if (state.pendingReadyAt && Date.now() < state.pendingReadyAt) {
    return { ok: true, state: await ensureConsistentState() };
  }

  const readyAt = Date.now() + (state.cooldownMs || DEFAULTS.cooldownMs);
  await setState({ pendingReadyAt: readyAt });
  await scheduleCooldown(readyAt);
  return { ok: true, state: await getState() };
}

async function cancelPending() {
  // Only used if we need to abort before unlock — not exposed as "easy cancel"
  await setState({ pendingReadyAt: null });
  await clearAlarm(ALARM_COOLDOWN);
}

// ── Install / first run ──────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    const now = Date.now();
    await setState({
      ...DEFAULTS,
      installedAt: now,
      blockingActive: true,
      onboardingComplete: false,
    });
    chrome.tabs.create({ url: chrome.runtime.getURL("onboarding.html") });
  } else if (details.reason === "update") {
    // Merge any missing defaults without wiping user data
    const current = await chrome.storage.local.get(null);
    const merged = { ...DEFAULTS, ...current };
    await chrome.storage.local.set(merged);
  }
  await ensureConsistentState();
});

chrome.runtime.onStartup.addListener(async () => {
  await ensureConsistentState();
});

// ── Alarm handlers ───────────────────────────────────────────────

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_COOLDOWN) {
    const state = await getState();
    if (state.pendingReadyAt && Date.now() >= state.pendingReadyAt - 1000) {
      await activateUnlock(state);
    }
  } else if (alarm.name === ALARM_RELOCK) {
    const state = await getState();
    if (!state.blockingActive) {
      await relock({ quiet: true });
    }
  }
});

// ── Messaging ────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message)
    .then(sendResponse)
    .catch((err) => sendResponse({ ok: false, error: String(err && err.message ? err.message : err) }));
  return true; // async
});

async function handleMessage(message) {
  const { type } = message || {};

  switch (type) {
    case "GET_STATE": {
      const state = await ensureConsistentState();
      const streak = computeStreak(
        state.lastUnblockAt,
        state.installedAt,
        state.blockingActive,
        state.unblockUntil
      );
      return {
        ok: true,
        state: {
          ...state,
          streak,
          now: Date.now(),
        },
      };
    }

    case "START_COOLDOWN": {
      // Called after breathing + reminder are done
      return startCooldown();
    }

    case "RELOCK": {
      await relock({ quiet: true });
      const state = await getState();
      return {
        ok: true,
        state: {
          ...state,
          streak: computeStreak(
            state.lastUnblockAt,
            state.installedAt,
            state.blockingActive,
            state.unblockUntil
          ),
          now: Date.now(),
        },
      };
    }

    case "SET_REMINDER": {
      const note = typeof message.note === "string" ? message.note.trim() : "";
      await setState({ reminderNote: note });
      return { ok: true };
    }

    case "COMPLETE_ONBOARDING": {
      const note = typeof message.note === "string" ? message.note.trim() : "";
      await setState({
        reminderNote: note,
        onboardingComplete: true,
        installedAt: (await getState()).installedAt || Date.now(),
      });
      return { ok: true };
    }

    case "SET_CUSTOM_SUBS": {
      const subs = Array.isArray(message.subs)
        ? message.subs
            .map((s) => String(s).toLowerCase().replace(/^r\//, "").trim())
            .filter(Boolean)
        : [];
      await setState({ customBlockedSubs: [...new Set(subs)] });
      return { ok: true, customBlockedSubs: (await getState()).customBlockedSubs };
    }

    case "INCREMENT_BLOCKED": {
      await incrementBlocked(message.count || 1);
      return { ok: true };
    }

    case "IS_BLOCKING": {
      const state = await ensureConsistentState();
      return {
        ok: true,
        blockingActive: !!state.blockingActive,
        customBlockedSubs: state.customBlockedSubs || [],
      };
    }

    default:
      return { ok: false, error: "unknown_type" };
  }
}

// Warm state on SW start
ensureConsistentState().catch(() => {});
