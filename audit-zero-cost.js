const fs = require("node:fs");
const path = require("node:path");

const root = __dirname;
const runtimeFiles = new Set([
  "_headers",
  "app.js",
  "bootstrap.mjs",
  "pdf-engine.mjs",
  "workspace.mjs",
  "workspace-model.mjs",
  "tool-catalog.mjs",
  "workspace.css",
  "index.html",
  "manifest.webmanifest",
  "privacy.html",
  "styles.css",
  "sw.js",
]);

const blockedRuntimePatterns = [
  /https:\/\/unpkg\.com/i,
  /https:\/\/cdn\.jsdelivr\.net/i,
  /https:\/\/api\./i,
  /openai/i,
  /stripe/i,
  /supabase/i,
  /firebase/i,
  /vercel/i,
  /netlify\.toml/i,
  /wrangler\.toml/i,
];

const ignoredDirs = new Set([".git", ".ruflo", "graphify-out", "node_modules", "dist"]);
const files = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else files.push(full);
  }
}

walk(root);

const textExtensions = new Set([".html", ".js", ".mjs", ".css", ".md", ".json", ".webmanifest", ".txt", ""]);
const failures = [];
let totalBytes = 0;

for (const file of files) {
  const stat = fs.statSync(file);
  totalBytes += stat.size;
  const rel = path.relative(root, file).replace(/\\/g, "/");
  if (stat.size > 25 * 1024 * 1024) failures.push(`${rel}: file oltre 25 MB`);
  if (!runtimeFiles.has(rel)) continue;
  if (!textExtensions.has(path.extname(file))) continue;
  const content = fs.readFileSync(file, "utf8");
  for (const pattern of blockedRuntimePatterns) {
    if (pattern.test(content)) failures.push(`${rel}: pattern bloccato ${pattern}`);
  }
}

if (files.length > 20000) failures.push(`troppi file per Cloudflare Pages Free: ${files.length}`);
if (totalBytes > 20 * 1024 * 1024) failures.push(`deploy troppo grande per MVP statico: ${totalBytes} bytes`);

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures, files: files.length, totalBytes }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, files: files.length, totalBytes }, null, 2));
}
