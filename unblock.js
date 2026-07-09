/**
 * Unblock flow tab: breathing → reminder → cooldown.
 * Cooldown is owned by background.js (chrome.alarms); this page only displays it.
 */

const CYCLES = 5;
const INHALE_MS = 4000;
const EXHALE_MS = 6000;

function $(id) {
  return document.getElementById(id);
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

function formatDuration(ms) {
  if (ms <= 0) return "0:00";
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return m + ":" + String(s).padStart(2, "0");
}

function showStep(id) {
  ["stepBreath", "stepReminder", "stepCooldown", "stepDone", "stepIdle"].forEach((s) => {
    $(s).hidden = s !== id;
  });
}

let pollTimer = null;
let breathAbort = false;

async function getState() {
  const res = await send("GET_STATE");
  if (!res || !res.ok) throw new Error("state_failed");
  return res.state;
}

function startPolling(handler) {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(handler, 1000);
}

// ── Breathing ────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runBreathing() {
  showStep("stepBreath");
  const circle = $("breathCircle");
  const label = $("breathLabel");
  const count = $("breathCount");

  // Force initial small size without transition
  circle.classList.remove("inhale", "exhale");
  circle.style.transition = "none";
  circle.style.transform = "scale(0.55)";
  void circle.offsetWidth;
  circle.style.transition = "";

  for (let i = 1; i <= CYCLES; i++) {
    if (breathAbort) return;
    count.textContent = "Cycle " + i + " of " + CYCLES;

    label.textContent = "Inhale";
    circle.classList.remove("exhale");
    circle.classList.add("inhale");
    await sleep(INHALE_MS);
    if (breathAbort) return;

    label.textContent = "Exhale";
    circle.classList.remove("inhale");
    circle.classList.add("exhale");
    await sleep(EXHALE_MS);
  }
}

// ── Reminder ─────────────────────────────────────────────────────

function showReminder(state) {
  showStep("stepReminder");
  const note = (state.reminderNote || "").trim();
  $("reminderText").textContent = note
    ? note
    : "You haven't written a reminder yet. You can add one anytime from the popup.";
}

// ── Cooldown display ─────────────────────────────────────────────

function showCooldown(state) {
  showStep("stepCooldown");
  const update = () => {
    const now = Date.now();
    const readyAt = state.pendingReadyAt;
    if (!readyAt) return;
    const left = readyAt - now;
    $("cooldownTimer").textContent = formatDuration(left);
    if (left <= 0) {
      // Unlock should fire via alarm; refresh
      routeFromState();
    }
  };
  // Keep state.pendingReadyAt fresh via polling
  startPolling(async () => {
    try {
      const s = await getState();
      state = s;
      if (!s.blockingActive) {
        showDone(s);
        return;
      }
      if (!s.pendingReadyAt) {
        routeFromState();
        return;
      }
      update();
    } catch (_) {
      /* ignore transient */
    }
  });
  update();
}

function showDone(state) {
  showStep("stepDone");
  const update = () => {
    const left = (state.unblockUntil || 0) - Date.now();
    $("unlockTimer").textContent = formatDuration(left);
    if (left <= 0) {
      routeFromState();
    }
  };
  startPolling(async () => {
    try {
      const s = await getState();
      state = s;
      if (s.blockingActive) {
        showStep("stepIdle");
        if (pollTimer) clearInterval(pollTimer);
        return;
      }
      update();
    } catch (_) {
      /* ignore */
    }
  });
  update();
}

// ── Routing based on persisted state ─────────────────────────────

async function routeFromState() {
  const state = await getState();
  const now = Date.now();

  if (!state.blockingActive && state.unblockUntil && state.unblockUntil > now) {
    showDone(state);
    return "done";
  }
  if (state.pendingReadyAt && state.pendingReadyAt > now) {
    showCooldown(state);
    return "cooldown";
  }
  return "fresh";
}

async function beginFlow() {
  breathAbort = false;
  // If already mid-flow (cooldown/unlock), skip ahead
  const existing = await routeFromState();
  if (existing !== "fresh") return;

  await runBreathing();
  if (breathAbort) return;

  const state = await getState();
  showReminder(state);
}

document.addEventListener("DOMContentLoaded", async () => {
  $("btnContinueCooldown").addEventListener("click", async () => {
    // Start cooldown only after breathing + reminder
    const res = await send("START_COOLDOWN");
    if (res && res.ok) {
      showCooldown(res.state || (await getState()));
    }
  });

  $("btnCloseTab").addEventListener("click", () => window.close());
  $("btnDoneClose").addEventListener("click", () => window.close());

  $("btnRelock").addEventListener("click", async () => {
    await send("RELOCK");
    showStep("stepIdle");
    if (pollTimer) clearInterval(pollTimer);
  });

  $("btnStart").addEventListener("click", () => beginFlow());

  // Resume correctly if tab was reopened mid-cooldown
  const mode = await routeFromState();
  if (mode === "fresh") {
    beginFlow();
  }
});
