// Planned maintenance for the GN 2.0 Server. Set in GN 2.0's Owner Panel and
// kept in Firebase (siteStatus/maintenance, anyone can read it), so it still
// shows while the server is off. While it's on, a server that isn't answering
// shows amber "Down for maintenance" instead of red, and doesn't count as an
// outage. If the server still isn't back 30 minutes after the expected time,
// it shows as down again.
let gnMaint = null;
const MAINT_GRACE_MS = 30 * 60000;
async function loadMaint() {
  // Reused for 45 seconds, so refreshing doesn't use up Firestore reads
  try {
    const c = JSON.parse(localStorage.getItem("gn-maint-cache") || "null");
    if (c && Date.now() - c.at < 45000) { gnMaint = c.m; return; }
  } catch {}
  try {
    const r = await fetch("https://firestore.googleapis.com/v1/projects/gn-math-dfd85/databases/(default)/documents/siteStatus/maintenance?key=AIzaSyCVUtHKcMZCs7aaCcO_Gp8fmy41MZnjqcs", { cache: "no-store" });
    if (r.status === 404) { gnMaint = null; try { localStorage.setItem("gn-maint-cache", JSON.stringify({ at: Date.now(), m: null })); } catch {} return; }
    if (!r.ok) return;
    const f = (await r.json()).fields || {};
    const start = Date.parse(f.start?.timestampValue || 0) || 0, until = Date.parse(f.until?.timestampValue || 0) || 0;
    gnMaint = until > start ? { start, until, note: f.note?.stringValue || "" } : null;
    try { localStorage.setItem("gn-maint-cache", JSON.stringify({ at: Date.now(), m: gnMaint })); } catch {}
  } catch {}
}
function maintNow() { const m = gnMaint; return m && Date.now() >= m.start && Date.now() <= m.until + MAINT_GRACE_MS ? m : null; }
function maintUpcoming() { const m = gnMaint; return m && Date.now() < m.start && m.start - Date.now() < 7 * 864e5 ? m : null; }
function maintBackIn(m) { const left = m.until - Date.now(); return left > 60000 ? `should be back in about ${Math.ceil(left / 60000)} min` : "should be back any minute"; }
function maintWhen(m) {
  const t = new Date(m.start), today = t.toDateString() === new Date().toDateString();
  return (today ? "today " : t.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }) + " ") + t.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) + `, for about ${Math.round((m.until - m.start) / 60000)} min`;
}
