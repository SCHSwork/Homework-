// Is the GN 2.0 Server running the newest code? Its version is the first 7
// characters of the SHA-1 of server/server.js, so the same is worked out here
// from the newest server.js on GitHub (SCHSwork/math, main) and compared.
// The server checks for updates every 5 minutes and installs them itself.
let latestServerVer = null;
async function loadLatestServerVer() {
  try {
    const c = JSON.parse(localStorage.getItem("gn-latest-ver") || "null");
    if (c && Date.now() - c.at < 60000) { latestServerVer = c.v; return c.v; }
  } catch {}
  try {
    const r = await fetch("https://raw.githubusercontent.com/SCHSwork/math/main/server/server.js?_=" + Math.floor(Date.now() / 60000), { cache: "no-store" });
    if (!r.ok) return latestServerVer;
    const h = await crypto.subtle.digest("SHA-1", await r.arrayBuffer());
    latestServerVer = [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 7);
    try { localStorage.setItem("gn-latest-ver", JSON.stringify({ at: Date.now(), v: latestServerVer })); } catch {}
  } catch {}
  return latestServerVer;
}
// { ok, text, color } for a running version (null when it can't be told)
function versionState(running) {
  if (!running) return null;
  if (!latestServerVer) return { ok: null, text: "v" + running, color: "" };
  if (running === latestServerVer) return { ok: true, text: "Up to date", color: "var(--ok)" };
  return { ok: false, text: "Update waiting", color: "var(--warn)" };
}
