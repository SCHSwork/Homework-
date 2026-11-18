# GN Status

Live status and benchmark page for GN 2.0 and GN Light.

- **Services**: checks every 60 seconds, with a history sparkline:
  - the sites (GN 2.0, GN Light)
  - the game-list mirrors (jsDelivr, GitHub, githack) and the backup jsDelivr addresses (Fastly, G-Core, Cloudflare)
  - GN Originals
  - GN 2.0's other game collections: **UBZone, Selenite, 55GMS, BCHS Flash games and Radon**. Each row loads one small file from every repo that collection's games come from, at the commit GN 2.0 uses (`probes` in its `config/*-games.json`, so it updates itself), and goes yellow naming any repo that's down. Repos from GitHub accounts jsDelivr blocks (genizy, gn-math, tty67hlt6jf6) are checked on GitHub, the way GN 2.0 loads them.
  - Firebase: the accounts SDK, Firestore (cloud saves, boots, site modes, live counts) and Firebase Auth (sign-in)
  - partner games (Famobi, Playgama)
- **People online**: GN 2.0's online count and a graph of the last 24 hours (the most people in each 15 minutes, hover for any time), from the `live/now` count GN 2.0 saves every 5 minutes. One read every 5 minutes.
- **Game health**: results of GN 2.0's nightly game check (`config/game-health.json`): how many games work, are slow or froze the test, or are broken, and a list of the ones with problems.
- **Benchmark**: GN 2.0 vs GN Light, download time and page weight plus a full-load timing in a hidden frame, median over several rounds.
- **Overview**: uptime % for the sites and all services, average response time, open incidents.
- **Game library**: entry counts for each game-list copy, change since last check, and whether the mirrors are in sync.
- **Incidents**: log of every outage with start time and length.
- **Benchmark history**: chart and table of past benchmark runs.
- **Changelog**: newest commits across the SCHSwork repos (GN 2.0, GN Light, GN Originals, Single-file GN 2.0, this one).
- **Long-term history**: 90-day uptime bars, per-service uptime (24h / 7d / 30d / all time), p50/p95 response, response-time charts, speed by hour of day, records (up streak, longest outage, time to recover, downtime), and library size over time. Switch between the server monitor and this browser's own history.
- **Data**: export, import (merge) or reset this browser's history.

## Server monitor

`.github/workflows/monitor.yml` runs every 10 minutes and saves results to the `status-data` branch: raw checks for 7 days, daily summaries forever, every incident, and daily library counts. To start it right away: **Actions → Status monitor → Run workflow**. GitHub pauses scheduled workflows if a repo has no activity for 60 days; the monitor's own commits keep it active, but if it ever stops, re-enable it from the Actions tab.
- **Latest deploys**: newest commit and Actions run for each SCHSwork repo (GitHub public API, cached 5 minutes).

Everything runs in the browser from your own network. Edit `SERVICES`, `SITES` and `REPOS` at the top of the script in `index.html` to change what's tracked.
