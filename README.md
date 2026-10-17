# Gridiron Curve

Gridiron Curve is a college-football resume model based on wins, losses, and
the connected network of opponents.

## Ranking Curve.1.0

1. **50% expectation-adjusted network score:** every team starts from the
   full preseason order. A result changes both teams by `20 x (actual -
   expected)`, so an expected win adds little while an upset adds much more.
   Updates are applied in weekly batches so games in the same CFBD week all use
   the same pregame strength. Expectations retain the full inherited offset so
   fading confidence does not make established favorites look like coin flips.
   The published resume rating fades that inherited offset from 100% to a 25%
   stability floor over the first six completed weeks; result-driven rating
   changes do not fade. The network component combines 25% ordinal percentile
   with 75% rating magnitude on the inherited 1300–1700 scale. This prevents
   small differences in a compressed field from becoming extreme percentiles
   without allowing the other components to overwhelm actual network order.
2. **30% quality of wins:** each win receives the opponent's previous-week
   network percentile. Wins are ordered from strongest to weakest and weighted
   by `1/2`, `1/4`, `1/8`, and so on. Every additional win therefore adds
   value but contributes less than the wins ahead of it; a weak victory can
   never reduce the score. FCS wins receive zero. Until an FBS opponent has
   played an FBS game, its preseason network percentile remains its win value
   so FCS-only results cannot distort it.
3. **20% achievement score:** achievement points are averaged per game and
   placed on a fixed `50 + 15 x average` scale capped from 0 to 100. Wins earn
   points and losses deduct points based on margin and the opponent's
   previous-week network percentile.
4. **Achievement bands:** margins are close (1-6), clear (7-16), or dominant
   (17+). Opponents at least five network-percentile points higher are stronger;
   opponents at least five points lower are weaker; the rest are peers.
5. **Previous-week context:** quality wins and achievement points always use
   ratings from before the game. This prevents a result from changing the
   context used to grade itself.
6. **Starting ratings:** the available preseason AP/Coaches polls seed the
   first cached season, 2000. Every later season places its preseason poll
   consensus first, then fills the field from the immediately preceding final
   Gridiron Curve ranking. The chronological chain handles changing FBS
   membership and maps each full order to a 1300-1700 expectation scale. The
   inherited portion loses 12.5 percentage points of weight after each
   completed week until 25% remains. This preserves early-season stability
   without allowing the starting order to dominate the full season.
7. **Excluded inputs:** yardage, turnovers, venue, recency, and in-season polls
   do not affect the ranking.
8. **FCS treatment:** the FCS expectation rating is always 100 points below the
   current lowest FBS rating, encoding the assumption that every FBS team is
   stronger than every FCS team. Dominant, clear, and close FCS wins earn 0.25,
   0.1, and 0 achievement points. FCS wins receive zero quality value, and only
   FBS teams are published.
9. **Strength of schedule:** SOS Played and SOS Upcoming average the current
   network percentiles of completed and remaining regular-season opponents.
   FCS opponents contribute zero. SOS is not a weighted component; it breaks an
   exact tie in the final Curve score.

## Prerelease ranking systems

The rankings selector can reproduce Curve.0.7 through Curve.1.0. All are
prerelease iterations of Gridiron Curve; Curve.1.0 is the default. Each
selection rebuilds the complete chronological prior chain with that system so
historical rankings are never mixed across configurations.

Each named engine version and its compatible models are colocated under
`src/lib/ranking/systems/<name>/<engine-version>/`. The Curve engine version 0
implementations select version-specific behavior from
`src/lib/ranking/systems/curve/engine.ts`, with models colocated under each
engine version directory.
`src/lib/ranking/registry.ts` registers complete ranking-system identifiers,
while `src/lib/ranking/index.ts` resolves a system and passes its model
configuration into its engine. Engines depend only on shared contracts and do
not read the global registry.

- `Curve.0.7` retains the full inherited prior throughout the season.
- `Curve.0.8` fades the inherited prior in both published ratings and game
  expectations.
- `Curve.0.9` fades the inherited prior in published ratings while retaining full
  inherited strength for game expectations.
- `Curve.0.10` retains the Curve.0.9 rating updates and replaces the ordinal network
  percentile in the final blend with a magnitude-aware 1300–1700 network score.
- `Curve.0.11` blends 25% ordinal network percentile with 75% rating magnitude.
- `Curve.1.0` retains the Curve.0.11 model and replaces average win quality with
  cumulative, diminishing win value so another victory cannot weaken a resume.

Until CFBD inputs are cached, the landing page uses a small, clearly labeled
illustrative dataset. The sync command retrieves the FBS season and caches
normalized provider inputs locally. The publication build calculates every
season, week, and ranking system into versioned static JSON.

## Ranking share images

The latest cached week receives a build-generated 1080x1350 Top 25 JPEG for
every ranking system. The rankings page can share its stable image URL or
download the
file:

```text
/generated/v3/images/2026/week-06/Curve.1.0.jpg
```

Share images use the same historical prior chain and active ranking system as
the visible table. Historical rankings remain available, but their images are
not retained in the static publication.

## Data source

The MVP uses the
[CollegeFootballData API](https://api.collegefootballdata.com/getting-started)
for completed games and weekly polls. It offers one authenticated interface for
both datasets and can later supply team-level advanced statistics. Request a
key from [CollegeFootballData](https://collegefootballdata.com/key) and review
its current usage and redistribution terms before a public launch.

Do not call undocumented ESPN endpoints for the production data pipeline.
They are unsupported, can change without notice, and do not provide a clear
commercial data license. SportsDataIO or Sportradar are stronger options if the
site later needs live feeds, contractual SLAs, or licensed redistribution.

## Local setup

Requires Node.js 22+.

```bash
npm install
npm run dev
```

Create a private `.env` file containing your CollegeFootballData API key:

```text
CFBD_API_KEY=your-api-key
```

Environment files are ignored by Git. You can instead set `CFBD_API_KEY` in
your shell. Then sync a completed week:

```bash
npm run sync -- 2025 8
```

Omit the week to detect the latest week with completed games:

```bash
npm run sync -- 2025
```

To cache the historical regular seasons without requesting unavailable and
unused historical box scores:

```bash
npm run sync:history -- 2000 2024
```

The historical command fetches games, polls, and team metadata sequentially
for each season. It derives the final regular-season week from the returned
games and writes explicit empty weekly-stat responses so every cache revision
retains the same shape.

The sync command stores each CFBD endpoint response separately and without
merging or normalization:

```text
.cache/cfbd/v1/<season>/
  latest.json
  syncs/<sync-id>/
    games.json
    polls.json
    teams.json
    team-game-stats/week-01.json
```

The entire `.cache/` directory is ignored by Git. The `v1` namespace matches
the manifest format version, preventing a future cache schema from reading or
overwriting incompatible responses. `latest.json` is replaced atomically only
after every raw response file has been written. The publication build loads
the selected raw files, normalizes and joins them, and writes static ranking
views. CFBD requests are restricted to the regular season;
postseason games are not cached or ranked.

CFBD requires game-level team statistics to be requested one week at a time.
A sync therefore uses `week + 3` API calls: one each for games, polls, and team
metadata, plus one box-score request for every week through the snapshot.

### Azure Blob cache storage

Set `CFBD_CONTAINER_SAS_URL` and `CFBD_CONTAINER_SAS_TOKEN` in the private
`.env` file. The SAS credentials must allow Blob create, write, and list
operations. Upload and verify the complete versioned cache with:

```bash
npm run upload:cache
```

Restore and verify the remote cache with read and list credentials:

```bash
npm run download:cache
```

The command preserves the cache namespace as `v1/<season>/...` inside the
configured container. Uploads and downloads run concurrently and fail when
remote operations or verification fail. Credentials and raw cache data remain
ignored by Git.

## Static publication

Gridiron Curve is published as a static site. `npm run build` first reads the
versioned local CFBD cache and writes immutable publication data under
`public/generated/v3/`, then Next.js exports the site to `out/`.

Published ranking JSON is generated for every cached season, week, and ranking
system.
Season schedule data is generated for team pages. The latest week receives
pre-generated share JPEGs for every ranking system. The generated directory is
ignored by Git because it is a build artifact.

Refresh the local source cache, then rebuild to publish a new week:

```bash
npm run sync -- 2025 15
npm run build
```

### Scheduled Windows cache updates

On the Windows computer,create `.env` and configure
`CFBD_API_KEY`, `CFBD_CONTAINER_SAS_URL`, and
`CFBD_CONTAINER_SAS_TOKEN`. Run the one-time host setup from PowerShell:

```powershell
.\scripts\windows\setup-cfbd-cache-host.ps1
```

The setup script downloads the latest Windows x64 release for the Node.js major
in `.nvmrc` directly from `nodejs.org`, verifies its published SHA-256
checksum, installs it under the ignored `.tools\node` directory, runs
`npm ci`, and invokes the scheduled-task installer. It does not require a
global Node.js or npm installation and does not modify the system PATH.

After setup, test an update manually with:

```powershell
.\scripts\windows\update-cfbd-cache.ps1
```

The updater selects the season automatically: January and February use the
previous calendar year, and August 15 through December use the current year.
From March 1 through August 14, the scheduled process exits successfully
before accessing the repository, npm, CFBD, Azure, or update logs. Pass
`-Season` only when manually backfilling a specific season. During the active
season, it detects the latest completed week, creates a new immutable local
snapshot, uploads the complete versioned cache to Azure Blob Storage, verifies
the upload, and keeps its latest 40 logs under
`%LOCALAPPDATA%\GridironCurve\Logs`.
Uploads skip immutable blobs that are already present, so repeated Sunday and
Monday runs transfer only new snapshots and season pointers.

To replace or repair only the unattended scheduled task later:

```powershell
.\scripts\windows\install-cfbd-cache-task.ps1
```

The installer prompts for the Windows account that will run while logged out.
It creates a `CFBD` folder in Task Scheduler, replaces any task with the same
name inside that folder, and schedules five local-time runs: Sunday at 9 AM,
2 PM, and 8 PM, then Monday at 8 AM and 6 PM. Automatic season selection allows
the same task to remain installed across calendar years. Pass `-TaskPath` to
the setup or installer only if a different Task Scheduler folder is desired.

The deployed site never receives the CFBD API key, reads the raw cache, runs
ranking calculations, or generates images at request time.

## GitHub Pages publication

GitHub Pages hosts the exported site at
`https://devhl-labs.github.io/Gridiron-Curve/`. The scheduled workflow in
`.github/workflows/pages.yml` runs at 12:00 UTC every Sunday from August
through December. Scheduled August runs before August 20 exit without
publishing. The workflow can also be started manually at any time.

Each publication:

1. Restores `v1/` from the private Azure Blob container.
2. Builds every static ranking and latest-week share image.
3. Exports the site with the `/Gridiron-Curve` repository base path.
4. Uploads `out/` as a GitHub Pages artifact.
5. Deploys the artifact without committing generated files.

The repository secrets `CFBD_CONTAINER_SAS_URL` and
`CFBD_CONTAINER_SAS_TOKEN` provide read access to the build. Prefer a separate
read-and-list-only SAS token for GitHub Actions; keep create and write
permissions only in the local `.env` used for cache uploads.

Pull requests never receive those credentials. The PR Gate installs the
wholly invented two-season fixture in `test/fixtures/cfbd-cache/`, builds all
five ranking systems, and verifies the static manifest and latest JPEG. No fixture
value was copied from CollegeFootballData.

## Commands

```bash
npm run dev
npm run generate
npm run test
npm run lint
npm run build
```

## License

Copyright (C) 2026 devhl-labs.

Gridiron Curve is licensed under the
[GNU General Public License version 3](./LICENSE), using the
`GPL-3.0-only` SPDX identifier. Distributed derivative works must remain
licensed under GPL v3 and provide corresponding source code as required by the
license.
