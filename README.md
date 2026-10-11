# GN Status

Live status and benchmark page for GN 2.0 and GN Light.

- **Services**: checks the sites, the three game-list mirrors (jsDelivr, GitHub, githack), GN Originals, Firebase and Famobi every 60 seconds, with a history sparkline.
- **Benchmark**: GN 2.0 vs GN Light, download time and page weight plus a full-load timing in a hidden frame, median over several rounds.
- **Overview**: uptime % for the sites and all services, average response time, open incidents.
- **Game library**: entry counts for each game-list copy, change since last check, and whether the mirrors are in sync.
- **Incidents**: log of every outage with start time and length.
- **Benchmark history**: chart and table of past benchmark runs.
- **Changelog**: newest commits across all SCHSwork repos.
- **Data**: export history as JSON or reset it.
- **Latest deploys**: newest commit and Actions run for each SCHSwork repo (GitHub public API, cached 5 minutes).

Everything runs in the browser from your own network. Edit `SERVICES`, `SITES` and `REPOS` at the top of the script in `index.html` to change what's tracked.
