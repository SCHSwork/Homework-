// GN Status monitor: runs from GitHub Actions every 10 minutes and saves history.
// Usage: node monitor.mjs <data-dir>
import fs from "node:fs";
import path from "node:path";

const DIR = process.argv[2] || "data";
// Keep ids in sync with SERVICES in index.html.
const SERVICES = [
  { id: "site",   name: "GN 2.0 site",             url: "https://schswork.github.io/math/" },
  { id: "light",  name: "GN Light site",           url: "https://schswork.github.io/gn-light/" },
  { id: "jsd",    name: "Game list · jsDelivr",    url: "https://cdn.jsdelivr.net/gh/freebuisness/assets@main/zones.json" },
  { id: "gh",     name: "Game list · GitHub",      url: "https://raw.githubusercontent.com/freebuisness/assets/main/zones.json" },
  { id: "hack",   name: "Game list · githack",     url: "https://rawcdn.githack.com/freebuisness/assets/HEAD/zones.json" },
  { id: "orig",   name: "GN Originals list",       url: "https://cdn.jsdelivr.net/gh/SCHSwork/GN-originals@main/games.json" },
  { id: "fb",     name: "Accounts (Firebase SDK)", url: "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js" },
  { id: "famobi", name: "Partner games (Famobi)",  url: "https://img.cdn.famobi.com/favicon.ico" }
];
const LISTS = ["jsd", "gh", "hack", "orig"];
const SLOW_MS = 1500, TIMEOUT_MS = 15000, RAW_DAYS = 7, MAX_INCIDENTS = 2000;

fs.mkdirSync(DIR, { recursive: true });
const read = (f, d) => { try { return JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8")); } catch { return d; } };
const write = (f, v) => fs.writeFileSync(path.join(DIR, f), JSON.stringify(v));
const day = t => new Date(t).toISOString().slice(0, 10);

function countEntries(j) {
  if (Array.isArray(j)) return j.length;
  if (j && typeof j === "object") {
    const arrs = Object.values(j).filter(Array.isArray);
    return arrs.length ? arrs.reduce((a, x) => a + x.length, 0) : Object.keys(j).length;
  }
  return 0;
}

async function check(s) {
  const t0 = performance.now();
  try {
    const r = await fetch(s.url + (s.url.includes("?") ? "&" : "?") + "_=" + Date.now(),
      { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { "user-agent": "GN-Status-Monitor", "cache-control": "no-cache" } });
    const body = await r.text();
    const ms = Math.round(performance.now() - t0);
    if (!r.ok) return { s: 2, ms, e: "HTTP " + r.status };
    return { s: ms > SLOW_MS ? 1 : 0, ms, body };
  } catch (e) {
    return { s: 2, ms: TIMEOUT_MS, e: e.name === "TimeoutError" ? "timeout" : "unreachable" };
  }
}

function rollup(checks, id) {
  const pts = checks.map(c => c[1][id]).filter(Boolean);
  if (!pts.length) return null;
  const okMs = pts.filter(p => p[0] !== 2).map(p => p[1]).sort((a, b) => a - b);
  const q = f => okMs.length ? okMs[Math.min(okMs.length - 1, Math.floor(f * okMs.length))] : null;
  return {
    n: pts.length, up: okMs.length, slow: pts.filter(p => p[0] === 1).length,
    avg: okMs.length ? Math.round(okMs.reduce((a, b) => a + b, 0) / okMs.length) : null,
    min: okMs[0] ?? null, max: okMs[okMs.length - 1] ?? null, p50: q(0.5), p95: q(0.95)
  };
}

const now = Date.now();
const results = await Promise.all(SERVICES.map(check));

// Raw checks (last 7 days): [time, { id: [state 0 ok/1 slow/2 down, ms] }]
const raw = read("raw.json", { checks: [] });
raw.checks.push([now, Object.fromEntries(SERVICES.map((s, i) => [s.id, [results[i].s, results[i].ms]]))]);
raw.checks = raw.checks.filter(c => c[0] > now - RAW_DAYS * 864e5);
write("raw.json", raw);

// Daily rollups, kept forever. Today and yesterday are recomputed (both fully inside the raw window).
const daily = read("daily.json", {});
for (const d of [day(now), day(now - 864e5)]) {
  const cs = raw.checks.filter(c => day(c[0]) === d);
  if (!cs.length) continue;
  daily[d] = Object.fromEntries(SERVICES.map(s => [s.id, rollup(cs, s.id)]).filter(x => x[1]));
}
write("daily.json", daily);

// Incidents, kept forever (capped).
const inc = read("incidents.json", []);
SERVICES.forEach((s, i) => {
  const open = inc.find(x => x.id === s.id && !x.end);
  if (results[i].s === 2 && !open) inc.push({ id: s.id, name: s.name, start: now, why: results[i].e });
  if (results[i].s !== 2 && open) open.end = now;
});
write("incidents.json", inc.slice(-MAX_INCIDENTS));

// Game library size per day.
const lib = read("library.json", {});
const today = lib[day(now)] || {};
SERVICES.forEach((s, i) => {
  if (!LISTS.includes(s.id) || !results[i].body) return;
  try { today[s.id] = countEntries(JSON.parse(results[i].body)); } catch {}
});
lib[day(now)] = today;
write("library.json", lib);

const meta = read("meta.json", {});
write("meta.json", { first: meta.first || now, last: now, runs: (meta.runs || 0) + 1,
  names: Object.fromEntries(SERVICES.map(s => [s.id, s.name])) });

console.log(SERVICES.map((s, i) => `${s.id}: ${["ok", "slow", "DOWN"][results[i].s]} ${results[i].ms}ms ${results[i].e || ""}`).join("\n"));
