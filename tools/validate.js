#!/usr/bin/env node
/**
 * Static checks for the unpacked extension. No dependencies, no build step.
 * Run: node tools/validate.js
 *
 * Catches the failure classes that only show up after Chrome loads the
 * extension: missing file references, inline script (blocked by MV3 CSP),
 * remote resources, and manifest/permission drift.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const errors = [];
const warnings = [];

const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const exists = (f) => fs.existsSync(path.join(ROOT, f));

function err(msg) {
  errors.push(msg);
}
function warn(msg) {
  warnings.push(msg);
}

// ── manifest ─────────────────────────────────────────────────────
let manifest;
try {
  manifest = JSON.parse(read("manifest.json"));
} catch (e) {
  err("manifest.json is not valid JSON: " + e.message);
  report();
}

if (manifest.manifest_version !== 3) err("manifest_version must be 3");

const ALLOWED_PERMS = ["storage", "alarms"];
for (const p of manifest.permissions || []) {
  if (!ALLOWED_PERMS.includes(p)) {
    warn(`permission "${p}" is beyond the documented minimum set`);
  }
}

const manifestFiles = [
  manifest.background?.service_worker,
  manifest.action?.default_popup,
  ...Object.values(manifest.action?.default_icon || {}),
  ...Object.values(manifest.icons || {}),
  ...(manifest.content_scripts || []).flatMap((cs) => [
    ...(cs.js || []),
    ...(cs.css || []),
  ]),
].filter(Boolean);

for (const f of manifestFiles) {
  if (!exists(f)) err(`manifest references missing file: ${f}`);
}

// web_accessible_resources must cover anything a content script navigates to
const war = (manifest.web_accessible_resources || []).flatMap((r) => r.resources || []);
if (!war.includes("blocked.html")) {
  err("blocked.html must be in web_accessible_resources — content.js redirects to it");
}

// package.json carries repo metadata only; its version must match the manifest
if (exists("package.json")) {
  try {
    const pkg = JSON.parse(read("package.json"));
    if (pkg.version !== manifest.version) {
      err(`package.json version ${pkg.version} does not match manifest.json version ${manifest.version}`);
    }
    if (pkg.dependencies && Object.keys(pkg.dependencies).length) {
      err("package.json has runtime dependencies — the extension must ship with no build step");
    }
  } catch (e) {
    err("package.json is not valid JSON: " + e.message);
  }
}

// ── HTML pages ───────────────────────────────────────────────────
const htmlFiles = fs
  .readdirSync(ROOT)
  .filter((f) => f.endsWith(".html"));

for (const file of htmlFiles) {
  const html = read(file);

  // MV3 extension pages forbid inline script and inline event handlers
  const inlineScript = /<script(?![^>]*\ssrc=)[^>]*>[\s\S]*?<\/script>/i.exec(html);
  if (inlineScript && inlineScript[0].replace(/<\/?script[^>]*>/gi, "").trim()) {
    err(`${file}: inline <script> is blocked by the MV3 page CSP — move it to a .js file`);
  }
  const handler = /\son(click|load|change|submit|input)\s*=/i.exec(html);
  if (handler) err(`${file}: inline on${handler[1]}= handler is blocked by the MV3 page CSP`);

  // Every local asset reference must resolve
  const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
  for (const ref of refs) {
    if (/^(https?:|mailto:|data:|#)/.test(ref)) {
      if (/^https?:/.test(ref) && !/^https?:\/\/(www\.)?reddit\.com/.test(ref)) {
        err(`${file}: remote resource "${ref}" — the extension must ship everything it uses`);
      }
      continue;
    }
    if (!exists(ref.split("?")[0])) err(`${file}: missing local file "${ref}"`);
  }
}

// ── JS: no network calls, no remote fonts ────────────────────────
const jsFiles = fs.readdirSync(ROOT).filter((f) => f.endsWith(".js"));
for (const file of jsFiles) {
  const js = read(file);
  if (/\bfetch\s*\(|XMLHttpRequest|navigator\.sendBeacon|new\s+WebSocket/.test(js)) {
    err(`${file}: contains a network call — this extension must make zero requests`);
  }
  if (/\beval\s*\(|new\s+Function\s*\(/.test(js)) {
    err(`${file}: eval/new Function is blocked by the MV3 CSP`);
  }
}

for (const file of fs.readdirSync(ROOT).filter((f) => f.endsWith(".css"))) {
  const css = read(file);
  if (/@import\s+url\(\s*['"]?https?:/.test(css) || /url\(\s*['"]?https?:/.test(css)) {
    err(`${file}: remote CSS resource — fonts and images must be bundled`);
  }
}

// ── message contract: every type the UI sends must be handled ─────
const bg = read("background.js");
const handled = new Set(
  [...bg.matchAll(/case\s+"([A-Z_]+)"\s*:/g)].map((m) => m[1])
);
const senders = ["popup.js", "unblock.js", "onboarding.js", "content.js"];
for (const file of senders) {
  const js = read(file);
  const sent = [
    ...js.matchAll(/type:\s*"([A-Z_]+)"/g),
    ...js.matchAll(/send\(\s*"([A-Z_]+)"/g),
  ].map((m) => m[1]);
  for (const t of new Set(sent)) {
    if (!handled.has(t)) err(`${file} sends message "${t}" that background.js does not handle`);
  }
}

// ── docs promised by the spec ────────────────────────────────────
for (const doc of ["HARDENING.md", "README.md", "hardening.html"]) {
  if (!exists(doc)) err(`missing ${doc}`);
}
if (/prevent.*uninstall|block.*removal/i.test(read("HARDENING.md").split("\n").slice(0, 12).join("\n"))) {
  warn("HARDENING.md opening should not read as a claim to prevent removal — check wording");
}

report();

function report() {
  for (const w of warnings) console.log("WARN  " + w);
  for (const e of errors) console.log("FAIL  " + e);
  if (!errors.length) {
    console.log(`PASS  ${htmlFiles.length} pages, ${jsFiles.length} scripts checked`);
  }
  process.exit(errors.length ? 1 : 0);
}
