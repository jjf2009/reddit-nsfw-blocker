#!/usr/bin/env node
/**
 * Runs background.js against a stubbed chrome API with controllable time.
 * Covers the behaviors that are hard to eyeball: timers surviving a service
 * worker restart, auto-relock, streak arithmetic, and stat write races.
 *
 * Run: node tools/test-background.js
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SRC = fs.readFileSync(path.join(__dirname, "..", "background.js"), "utf8");
const DAY = 24 * 60 * 60 * 1000;

let failures = 0;
function check(name, cond, extra) {
  if (cond) {
    console.log("  ok   " + name);
  } else {
    failures++;
    console.log("  FAIL " + name + (extra ? "  → " + extra : ""));
  }
}

/** A world: persistent storage + alarms, into which a worker can be booted. */
function makeWorld(storage = {}) {
  const world = {
    now: Date.UTC(2026, 0, 10, 12, 0, 0),
    storage,
    alarms: new Map(),
    tabsCreated: [],
    listeners: null,
  };

  world.boot = function boot() {
    const listeners = { message: [], installed: [], startup: [], alarm: [] };
    const chrome = {
      storage: {
        local: {
          async get() {
            return JSON.parse(JSON.stringify(world.storage));
          },
          async set(obj) {
            Object.assign(world.storage, JSON.parse(JSON.stringify(obj)));
          },
        },
      },
      alarms: {
        create(name, opts) {
          world.alarms.set(name, opts.when);
        },
        async clear(name) {
          world.alarms.delete(name);
        },
        onAlarm: { addListener: (fn) => listeners.alarm.push(fn) },
      },
      runtime: {
        onMessage: { addListener: (fn) => listeners.message.push(fn) },
        onInstalled: { addListener: (fn) => listeners.installed.push(fn) },
        onStartup: { addListener: (fn) => listeners.startup.push(fn) },
        getURL: (p) => "chrome-extension://test/" + p,
      },
      tabs: { create: (o) => world.tabsCreated.push(o.url) },
    };

    const sandbox = {
      chrome,
      console,
      setTimeout,
      clearTimeout,
      Promise,
      JSON,
      Object,
      Array,
      Math,
      String,
      Number,
      Boolean,
      Set,
      Error,
      Date: new Proxy(Date, {
        get: (t, p) => (p === "now" ? () => world.now : t[p]),
        construct: (t, a) => (a.length ? new t(...a) : new t(world.now)),
      }),
    };
    vm.createContext(sandbox);
    vm.runInContext(SRC, sandbox, { filename: "background.js" });
    world.listeners = listeners;
    return listeners;
  };

  world.send = (message) =>
    new Promise((resolve) => {
      world.listeners.message[0](message, {}, resolve);
    });

  world.install = async () => {
    for (const fn of world.listeners.installed) await fn({ reason: "install" });
  };

  /** Advance the clock and fire any alarm that has come due. */
  world.advance = async (ms) => {
    world.now += ms;
    for (const [name, when] of [...world.alarms]) {
      if (world.now >= when) {
        world.alarms.delete(name);
        for (const fn of world.listeners.alarm) await fn({ name });
      }
    }
    await new Promise((r) => setTimeout(r, 0));
  };

  return world;
}

(async () => {
  console.log("state machine");
  const w = makeWorld();
  w.boot();
  await w.install();
  await new Promise((r) => setTimeout(r, 0));

  check("starts locked", w.storage.blockingActive === true);
  check("onboarding opens on install", w.tabsCreated.some((u) => u.includes("onboarding.html")));

  // Cooldown
  await w.send({ type: "START_COOLDOWN" });
  const readyAt = w.storage.pendingReadyAt;
  check("cooldown is 10 minutes", readyAt - w.now === 10 * 60 * 1000, String(readyAt - w.now));
  check("cooldown alarm scheduled", w.alarms.has("cooldown-ready"));
  check("still locked during cooldown", w.storage.blockingActive === true);

  // Service worker dies 4 minutes in; storage and alarms persist.
  await w.advance(4 * 60 * 1000);
  w.boot();
  await new Promise((r) => setTimeout(r, 0));
  let res = await w.send({ type: "GET_STATE" });
  const remaining = res.state.pendingReadyAt - res.state.now;
  check(
    "timer survives worker restart (6 min left, not reset)",
    remaining === 6 * 60 * 1000,
    Math.round(remaining / 1000) + "s"
  );

  // Cooldown completes
  await w.advance(6 * 60 * 1000);
  check("unlocks when cooldown ends", w.storage.blockingActive === false);
  check("unlock window is 30 minutes", w.storage.unblockUntil - w.now === 30 * 60 * 1000);
  check("relock alarm scheduled", w.alarms.has("auto-relock"));

  res = await w.send({ type: "GET_STATE" });
  check("streak is 0 during an open window", res.state.streak === 0);

  // Auto-relock
  await w.advance(30 * 60 * 1000);
  check("auto-relocks with no user action", w.storage.blockingActive === true);
  check("unblockUntil cleared", w.storage.unblockUntil === null);

  console.log("worker asleep through the whole window");
  const w2 = makeWorld();
  w2.boot();
  await w2.install();
  await new Promise((r) => setTimeout(r, 0));
  await w2.send({ type: "START_COOLDOWN" });
  w2.now += 10 * 60 * 1000 + 45 * 60 * 1000; // no alarms fire at all
  w2.alarms.clear();
  w2.boot();
  const st = (await w2.send({ type: "GET_STATE" })).state;
  check("catches up to LOCKED on next wake", st.blockingActive === true && st.unblockUntil === null);

  console.log("re-lock is free");
  const w3 = makeWorld();
  w3.boot();
  await w3.install();
  await new Promise((r) => setTimeout(r, 0));
  await w3.send({ type: "START_COOLDOWN" });
  await w3.advance(10 * 60 * 1000);
  check("unlocked", w3.storage.blockingActive === false);
  const relocked = await w3.send({ type: "RELOCK" });
  check("one message relocks, no wait", relocked.state.blockingActive === true);
  check("no pending cooldown left behind", w3.storage.pendingReadyAt === null);
  check("alarms cleared", w3.alarms.size === 0);

  console.log("streak");
  const w4 = makeWorld();
  w4.boot();
  await w4.install();
  await new Promise((r) => setTimeout(r, 0));
  w4.storage.lastUnblockAt = w4.now - 3 * DAY - 1000;
  const s4 = (await w4.send({ type: "GET_STATE" })).state;
  check("counts days since last unlock", s4.streak === 3, String(s4.streak));
  w4.storage.lastUnblockAt = w4.now - 60 * 1000;
  const s4b = (await w4.send({ type: "GET_STATE" })).state;
  check("resets to 0 right after an unlock", s4b.streak === 0);

  console.log("stats");
  const w5 = makeWorld();
  w5.boot();
  await w5.install();
  await new Promise((r) => setTimeout(r, 0));
  await Promise.all(
    Array.from({ length: 50 }, () => w5.send({ type: "INCREMENT_BLOCKED", count: 1 }))
  );
  await new Promise((r) => setTimeout(r, 10));
  check(
    "50 concurrent reports all land (no lost writes)",
    w5.storage.stats.totalBlocked === 50,
    String(w5.storage.stats.totalBlocked)
  );

  console.log("blocklist normalizing");
  const w6 = makeWorld();
  w6.boot();
  await w6.install();
  await new Promise((r) => setTimeout(r, 0));
  const subs = await w6.send({ type: "SET_CUSTOM_SUBS", subs: ["r/Example", "example", " Other "] });
  check(
    "strips r/, lowercases, dedupes",
    JSON.stringify(subs.customBlockedSubs) === JSON.stringify(["example", "other"]),
    JSON.stringify(subs.customBlockedSubs)
  );

  console.log(failures ? `\n${failures} failing` : "\nall passing");
  process.exit(failures ? 1 : 0);
})();
