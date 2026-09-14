/**
 * Popup — status, streak, stats, unlock entry, re-lock, settings.
 */

function $(id) {
  return document.getElementById(id);
}

function formatDuration(ms) {
  if (ms <= 0) return "0:00";
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return m + ":" + String(s).padStart(2, "0");
}

function send(type, payload = {}) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type, ...payload }, (res) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(res);
    });
  });
}

let tickTimer = null;
let lastState = null;

function render(state) {
  lastState = state;
  const pill = $("statusPill");
  const btnUnlock = $("btnUnlock");
  const btnRelock = $("btnRelock");
  const timerRow = $("timerRow");
  const timerLabel = $("timerLabel");
  const timerValue = $("timerValue");
  const hint = $("actionHint");

  $("streakNum").textContent = String(state.streak ?? 0);
  $("blockedToday").textContent = String(state.stats?.blockedToday ?? 0);
  $("blockedTotal").textContent = String(state.stats?.totalBlocked ?? 0);

  if ($("reminderNote") !== document.activeElement) {
    $("reminderNote").value = state.reminderNote || "";
  }
  if ($("subInput") !== document.activeElement) {
    $("subInput").value = (state.customBlockedSubs || []).join("\n");
  }

  const now = state.now || Date.now();
  const pending = state.pendingReadyAt && state.pendingReadyAt > now;
  const unlocked = !state.blockingActive && state.unblockUntil && state.unblockUntil > now;

  if (unlocked) {
    pill.className = "status-pill open";
    pill.textContent = "Open window";
    btnUnlock.hidden = true;
    btnRelock.hidden = false;
    timerRow.hidden = false;
    timerLabel.textContent = "Locks again in";
    timerValue.textContent = formatDuration(state.unblockUntil - now);
    hint.textContent = "Re-lock is instant. No steps, no wait.";
  } else if (pending) {
    pill.className = "status-pill locked";
    pill.textContent = "Cooldown";
    btnUnlock.hidden = false;
    btnUnlock.textContent = "Open unlock tab";
    btnRelock.hidden = true;
    timerRow.hidden = false;
    timerLabel.textContent = "Ready in";
    timerValue.textContent = formatDuration(state.pendingReadyAt - now);
    hint.textContent = "Cooldown is running even if you close tabs. It will unlock when the timer hits zero.";
  } else {
    pill.className = "status-pill locked";
    pill.textContent = "Locked";
    btnUnlock.hidden = false;
    btnUnlock.textContent = "Request unlock";
    btnRelock.hidden = true;
    timerRow.hidden = true;
    hint.textContent = "Unlock takes a short breath and a ten-minute wait. Re-locking is always free.";
  }
}

async function refresh() {
  try {
    const res = await send("GET_STATE");
    if (res && res.ok) render(res.state);
  } catch (_) {
    /* popup may open before SW is ready */
  }
}

function startTick() {
  if (tickTimer) clearInterval(tickTimer);
  tickTimer = setInterval(() => {
    if (!lastState) return;
    // Local countdown between full refreshes
    const now = Date.now();
    lastState.now = now;
    if (lastState.pendingReadyAt || lastState.unblockUntil) {
      render(lastState);
      // Re-fetch when timers cross zero
      if (
        (lastState.pendingReadyAt && now >= lastState.pendingReadyAt) ||
        (lastState.unblockUntil && now >= lastState.unblockUntil)
      ) {
        refresh();
      }
    }
  }, 1000);
  // Full state every few seconds
  setInterval(refresh, 4000);
}

document.addEventListener("DOMContentLoaded", () => {
  $("btnUnlock").addEventListener("click", () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("unblock.html") });
  });

  $("btnRelock").addEventListener("click", async () => {
    const res = await send("RELOCK");
    if (res && res.ok) render(res.state);
  });

  $("btnSaveNote").addEventListener("click", async () => {
    await send("SET_REMINDER", { note: $("reminderNote").value });
    const el = $("noteSaved");
    el.hidden = false;
    setTimeout(() => {
      el.hidden = true;
    }, 1500);
  });

  $("btnSaveSubs").addEventListener("click", async () => {
    const lines = $("subInput").value
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    await send("SET_CUSTOM_SUBS", { subs: lines });
    const el = $("subsSaved");
    el.hidden = false;
    setTimeout(() => {
      el.hidden = true;
    }, 1500);
    refresh();
  });

  // Open the rendered page, not the raw .md (Chrome downloads unknown types)
  $("hardeningLink").addEventListener("click", (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: chrome.runtime.getURL("hardening.html") });
  });

  refresh();
  startTick();
});
