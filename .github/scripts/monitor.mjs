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
  { id: "fastly", name: "Game list · jsDelivr Fastly",     url: "https://fastly.jsdelivr.net/gh/freebuisness/assets@main/zones.json" },
  { id: "gcore",  name: "Game list · jsDelivr G-Core",     url: "https://gcore.jsdelivr.net/gh/freebuisness/assets@main/zones.json" },
  { id: "tcf",    name: "Game list · jsDelivr Cloudflare", url: "https://testingcf.jsdelivr.net/gh/freebuisness/assets@main/zones.json" },
  { id: "orig",   name: "GN Originals list",       url: "https://cdn.jsdelivr.net/gh/SCHSwork/GN-originals@main/games.json" },
  // GN 2.0's other game collections: one small file from every repo each loads from (the lists' "probes")
  { id: "ubzfiles", name: "UBZone games",     url: "https://cdn.jsdelivr.net/", probes: "https://schswork.github.io/math/config/ubzone-games.json" },
  { id: "selfiles", name: "Selenite games",   url: "https://cdn.jsdelivr.net/", probes: "https://schswork.github.io/math/config/selenite-games.json" },
  { id: "g55files", name: "55GMS games",      url: "https://cdn.jsdelivr.net/", probes: "https://schswork.github.io/math/config/55gms-games.json" },
  { id: "bchsfiles", name: "BCHS Flash games", url: "https://cdn.jsdelivr.net/", probes: "https://schswork.github.io/math/config/bchs-games.json" },
  { id: "radfiles", name: "Radon games",      url: "https://cdn.jsdelivr.net/", probes: "https://schswork.github.io/math/config/radon-games.json" },
  { id: "fb",     name: "Accounts (Firebase SDK)", url: "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js" },
  { id: "fs",     name: "Saves & live updates (Firestore)", url: "https://firestore.googleapis.com/", any: true },
  { id: "auth",   name: "Sign-in (Firebase Auth)", url: "https://identitytoolkit.googleapis.com/", any: true },
  { id: "famobi", name: "Partner games (Famobi)",  url: "https://img.cdn.famobi.com/favicon.ico" },
  { id: "pg",     name: "Partner games (Playgama)", url: "https://playgama.com/favicon.ico", any: true },
  // Lincoln's own server (cloud saves, Live Save, online counts). Tracked on its own:
  // the site keeps working without it, so it isn't part of "all services".
  { id: "home",   name: "GN 2.0 Server", url: "https://data.learnresearch.org/health", separate: true },
  // GN Craft, the Minecraft server (Java address, through playit): a real Minecraft
  // server-list ping from outside, so this checks what players see.
  { id: "mc",     name: "GN Craft (Minecraft)", mc: "mc.learnresearch.org", separate: true }
];
// jsDelivr blocks every repo of these accounts; GN 2.0 loads them from GitHub (JSD_REFUSED_OWNERS in SCHSwork/math)
const JSD_BLOCKED_OWNERS = ["genizy", "gn-math", "tty67hlt6jf6"];
const probeUrl = (repo, sha, p) => JSD_BLOCKED_OWNERS.includes(repo.split("/")[0].toLowerCase())
  ? `https://raw.githubusercontent.com/${repo}/${sha}/${p}` : `https://cdn.jsdelivr.net/gh/${repo}@${sha}/${p}`;
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

// Game collections: one small file from every repo the games load from, at its pinned commit.
async function checkProbes(s) {
  const t0 = performance.now();
  const list = await check({ url: s.probes });
  if (list.s === 2) return { s: 2, ms: list.ms, e: "no games list" };
  let probes = [];
  try { probes = Object.entries(JSON.parse(list.body).probes || {}).filter(([k, p]) => /^[\w.-]+\/[\w.-]+@[0-9a-f]{40}$/.test(k) && /^[\w./-]+$/.test(p)); } catch {}
  if (!probes.length) return { s: 2, ms: 0, e: "no repos listed" };
  const res = await Promise.all(probes.map(([key, p]) => { const [repo, sha] = key.split("@"); return check({ url: probeUrl(repo, sha, p) }).then(r => ({ ...r, repo })); }));
  const bad = res.filter(r => r.s === 2), ms = Math.round(performance.now() - t0);
  if (bad.length === probes.length) return { s: 2, ms, e: "all repos unreachable" };
  if (bad.length) return { s: 1, ms, e: `${bad.length} of ${probes.length} down: ${bad.map(r => r.repo).slice(0, 3).join(", ")}` };
  return { s: ms > SLOW_MS * 2 ? 1 : 0, ms };
}

// Minecraft "server list ping" (looks up the _minecraft._tcp SRV record first, like the game)
async function checkMc(s) {
  const { default: net } = await import("node:net");
  const { promises: dns } = await import("node:dns");
  let host = s.mc, port = 25565;
  try { const r = await dns.resolveSrv("_minecraft._tcp." + s.mc); if (r[0]) { host = r[0].name; port = r[0].port; } } catch {}
  const t0 = performance.now();
  return new Promise(resolve => {
    const sock = net.connect(port, host); let buf = Buffer.alloc(0), done = false;
    const finish = r => { if (!done) { done = true; sock.destroy(); resolve(r); } };
    const varint = n => { const o = []; do { let b = n & 0x7f; n >>>= 7; if (n) b |= 0x80; o.push(b); } while (n); return Buffer.from(o); };
    const packet = b => Buffer.concat([varint(b.length), b]);
    sock.setTimeout(TIMEOUT_MS, () => finish({ s: 2, ms: TIMEOUT_MS, e: "timeout" }));
    sock.on("error", e => finish({ s: 2, ms: Math.round(performance.now() - t0), e: e.code || "unreachable" }));
    sock.on("connect", () => {
      const a = Buffer.from(host), p = Buffer.alloc(2); p.writeUInt16BE(port);
      sock.write(packet(Buffer.concat([varint(0), varint(767), varint(a.length), a, p, varint(1)])));
      sock.write(packet(varint(0)));
    });
    sock.on("data", d => {
      buf = Buffer.concat([buf, d]);
      if (buf.length > 5 && buf.includes(0x7b)) { const ms = Math.round(performance.now() - t0); finish({ s: ms > SLOW_MS ? 1 : 0, ms }); }
    });
  });
}
async function check(s) {
  if (s.probes) return checkProbes(s);
  if (s.mc) return checkMc(s);
  const t0 = performance.now();
  try {
    const r = await fetch(s.url + (s.url.includes("?") ? "&" : "?") + "_=" + Date.now(),
      { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { "user-agent": "GN-Status-Monitor", "cache-control": "no-cache" } });
    const body = await r.text();
    const ms = Math.round(performance.now() - t0);
    // any: an API root that answers 404 when it's up (Firestore, Firebase Auth)
    if (!r.ok && !(s.any && r.status < 500)) return { s: 2, ms, e: "HTTP " + r.status };
    return { s: ms > SLOW_MS ? 1 : 0, ms, body };
  } catch (e) {
    return { s: 2, ms: TIMEOUT_MS, e: e.name === "TimeoutError" ? "timeout" : "unreachable" };
  }
}

function rollup(checks, id) {
  const pts = checks.map(c => c[1][id]).filter(Boolean);
  if (!pts.length) return null;
  // 3 = down for planned maintenance: not an outage, but no response time either
  const okMs = pts.filter(p => p[0] !== 2 && p[0] !== 3).map(p => p[1]).sort((a, b) => a - b);
  const q = f => okMs.length ? okMs[Math.min(okMs.length - 1, Math.floor(f * okMs.length))] : null;
  return {
    n: pts.length, up: pts.filter(p => p[0] !== 2).length, maint: pts.filter(p => p[0] === 3).length, slow: pts.filter(p => p[0] === 1).length,
    avg: okMs.length ? Math.round(okMs.reduce((a, b) => a + b, 0) / okMs.length) : null,
    min: okMs[0] ?? null, max: okMs[okMs.length - 1] ?? null, p50: q(0.5), p95: q(0.95)
  };
}

const now = Date.now();
const results = await Promise.all(SERVICES.map(check));

// Planned maintenance (set in GN 2.0's Owner Panel, Firestore siteStatus/maintenance):
// the GN 2.0 Server being off then is recorded as 3 (maintenance), not as down.
try {
  const r = await fetch("https://firestore.googleapis.com/v1/projects/gn-math-dfd85/databases/(default)/documents/siteStatus/maintenance?key=AIzaSyCVUtHKcMZCs7aaCcO_Gp8fmy41MZnjqcs", { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (r.ok) {
    const f = (await r.json()).fields || {};
    const start = Date.parse(f.start?.timestampValue || 0) || 0, until = Date.parse(f.until?.timestampValue || 0) || 0;
    const t = Date.now();
    SERVICES.forEach((s, i) => { if (s.separate && results[i].s === 2 && t >= start && t <= until + 30 * 60000) results[i] = { ...results[i], s: 3, e: "maintenance" }; });
  }
} catch {}

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

// GN 2.0 Server stats, saved here (off Lincoln's PC) so the server page can
// still show the last known numbers when the server is off.
//   server-latest.json  the newest status, last 24 h in 10-minute buckets, game health, today's plays
//   server-daily.json   one summary per day, kept forever
const homeIdx = SERVICES.findIndex(s => s.id === "home");
if (homeIdx >= 0 && results[homeIdx].s !== 2) {
  const get = async p => {
    try { const r = await fetch("https://data.learnresearch.org" + p, { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { "user-agent": "GN-Status-Monitor" } }); return r.ok ? await r.json() : null; }
    catch { return null; }
  };
  const [status, hist, gameHealth, plays] = await Promise.all(["/api/status", "/api/history", "/api/game-health", "/api/plays?period=day"].map(get));
  if (status) {
    // Per-minute history added up into 10-minute buckets (keeps this file small)
    const buckets = {};
    for (const p of (hist && hist.points) || []) {
      const t = Math.floor(p.t / 600000) * 600000, b = buckets[t] ||= { t, req: 0, saves: 0, gh: 0, plays: 0, beats: 0, bytes: 0, errors: 0, msSum: 0, online: 0 };
      for (const k of ["req", "saves", "gh", "plays", "beats", "bytes", "errors"]) b[k] += p[k] || 0;
      b.msSum += (p.ms || 0) * (p.req || 0); b.online = Math.max(b.online, p.online || 0);
    }
    const points = Object.values(buckets).sort((a, b) => a.t - b.t).map(({ msSum, ...b }) => ({ ...b, ms: b.req ? Math.round(msSum / b.req) : 0 }));
    write("server-latest.json", { at: now, status, history: { interval: 600000, points }, gameHealth, plays });
    const sd = read("server-daily.json", {});
    const d = sd[day(now)] || {};
    Object.assign(d, {
      onlineMax: Math.max(d.onlineMax || 0, status.online || 0),
      players: status.players, saveMB: Math.round((status.saveBytes || 0) / 1e5) / 10,
      plays: status.playsToday, liveSaves: status.liveSaves ? status.liveSaves.today : null,
      toFirebase: status.liveSaves ? status.liveSaves.toFirebase : null,
      flagged: Math.max(d.flagged || 0, status.gamesFlagged || 0), version: status.version
    });
    sd[day(now)] = d;
    write("server-daily.json", sd);
  }
}

const meta = read("meta.json", {});
write("meta.json", { first: meta.first || now, last: now, runs: (meta.runs || 0) + 1,
  names: Object.fromEntries(SERVICES.map(s => [s.id, s.name])) });

console.log(SERVICES.map((s, i) => `${s.id}: ${["ok", "slow", "DOWN"][results[i].s]} ${results[i].ms}ms ${results[i].e || ""}`).join("\n"));
