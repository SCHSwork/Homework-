# GN Status

Live status and benchmark page for GN 2.0 and GN Light.

- **Services**: checks the sites, the three game-list mirrors (jsDelivr, GitHub, githack), GN Originals, Firebase and Famobi every 60 seconds, with a history sparkline.
- **Benchmark**: GN 2.0 vs GN Light, download time and page weight plus a full-load timing in a hidden frame, median over several rounds.
- **Latest deploys**: newest commit and Actions run for each SCHSwork repo (GitHub public API, cached 5 minutes).

Everything runs in the browser from your own network. Edit `SERVICES`, `SITES` and `REPOS` at the top of the script in `index.html` to change what's tracked.
