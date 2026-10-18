# GN Status

Live status and benchmark page for GN 2.0 and GN Light.

- **Services**: checks the sites, the three game-list mirrors (jsDelivr, GitHub, githack) plus the backup jsDelivr addresses (Fastly, G-Core, Cloudflare), GN Originals, the UBZone games list and every repo UBZone games load from, Firebase and Famobi every 60 seconds, with a history sparkline. The UBZone repo list comes from `probes` in `config/ubzone-games.json` on GN 2.0, so it updates itself; one row goes yellow if some repos are down and names them.
- **Benchmark**: GN 2.0 vs GN Light, download time and page weight plus a full-load timing in a hidden frame, median over several rounds.
- **Overview**: uptime % for the sites and all services, average response time, open incidents.
- **Game library**: entry counts for each game-list copy, change since last check, and whether the mirrors are in sync.
- **Incidents**: log of every outage with start time and length.
- **Benchmark history**: chart and table of past benchmark runs.
- **Changelog**: newest commits across all SCHSwork repos.
- **Long-term history**: 90-day uptime bars, per-service uptime (24h / 7d / 30d / all time), p50/p95 response, response-time charts, speed by hour of day, records (up streak, longest outage, time to recover, downtime), and library size over time. Switch between the server monitor and this browser's own history.
- **Data**: export, import (merge) or reset this browser's history.

## Server monitor

`.github/workflows/monitor.yml` runs every 10 minutes and saves results to the `status-data` branch: raw checks for 7 days, daily summaries forever, every incident, and daily library counts. To start it right away: **Actions → Status monitor → Run workflow**. GitHub pauses scheduled workflows if a repo has no activity for 60 days; the monitor's own commits keep it active, but if it ever stops, re-enable it from the Actions tab.
- **Latest deploys**: newest commit and Actions run for each SCHSwork repo (GitHub public API, cached 5 minutes).

Everything runs in the browser from your own network. Edit `SERVICES`, `SITES` and `REPOS` at the top of the script in `index.html` to change what's tracked.
