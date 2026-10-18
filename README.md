# Gridiron Curve

Gridiron Curve publishes college-football computer rankings based on outcomes,
record value, opponent-adjusted performance, and the connected schedule graph.

## Gridiron Consensus.5.0

Gridiron Consensus.5.0 is the latest selectable Computer Composite. It uses
three prior-aware evidence families:

1. **Résumé evidence:** `ResultNetwork.1.0`
2. **40% Record Value:** `RecordValue.1.0`
3. **60% Capped-Margin Performance:** `CappedMarginPerformance.1.0`

Result Network equally averages tie-safe positions from canonical Colley,
regularized Bradley-Terry, and binary Massey. Record Value equally averages
Opponent Value, Wins Above Expectation, and Poisson-binomial Strength of
Record. Performance equally averages opponent-adjusted Massey positions using
14-, 21-, and 28-point scoring-margin caps.

Computer Composite 5 therefore starts with:

```text
Base = 40% Record Value + 60% Performance
```

Result Network receives no separate direct vote. It supplies schedule ranks
and defeated-opponent ranks for recursive Top-25 résumé certification. Teams
with below-median schedules and weak best-two wins can receive up to eight
positions of downward pressure. That pressure is zero through two completed
FBS games, rises linearly, and reaches full strength after eight. FCS games do
not advance résumé maturity.

Raw scores are never mixed. Exact component-score ties receive their average
full-field position before Record Value and Performance are combined. Every
provisional Top-25 team and each replacement entrant is résumé-checked.

All three families start from the same preseason AP/Coaches consensus plus the
previous final Curve order. The shared prior regularizes early team and
opponent estimates and stabilizes the published positions. Its influence
fades linearly to zero after six completed weeks, at which point only
current-season games affect the families.

Consensus.5.0 is the selectable Computer Composite and the default ranking
when a URL does not choose another system.

## Gridiron Blend.5.0

Gridiron Blend.5.0 balances Computer Composite 5 with the AP
and Coaches polls:

```text
50% Gridiron Consensus
25% AP Poll
25% Coaches Poll
```

Each input receives 25 points for No. 1, 24 for No. 2, through one point for
No. 25. Unranked teams receive zero points. Raw ratings are never mixed.
Consensus positions below No. 25 receive a descending fraction below one
point, preserving the full FBS order without giving any such position the
value of a Top-25 vote. Poll-unranked teams still receive zero poll points.

Teams with exactly equal blended points are first ordered by win percentage in
completed head-to-head games among that tied group. If those results cannot
separate them, the complete Gridiron Consensus rank decides.

A ranking through Week W targets AP and Coaches polls labeled Week W+1. For
incomplete historical poll data, each poll uses its latest available release
at or before that target, never a future release. If a poll is entirely
unavailable, its weight becomes zero and the visible available-source weights
are proportionally renormalized.

## Published ranking systems

The rankings selector presents Blend.5.0 as **Computer + AP/Coaches**,
Consensus.5.0 as **Computer Composite**, and the three Composite 5 inputs under
**Composite Components**:

- `ResultNetwork.1.0`
- `RecordValue.1.0`
- `CappedMarginPerformance.1.0`

The static publication generates only these five live systems. Consensus.5.0
is the default when a URL does not specify a ranking, and Blend.5.0 uses it as
the computer input. Removed development and standalone systems fall back to
the current default instead of adding publication work to every season and
week. The internal Curve calculation remains only to extend the shared
preseason prior across seasons; it is not published as a ranking.

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
/generated/v4/images/2026/week-06/Consensus.5.0.jpg
/generated/v4/images/2026/week-06/ResultNetwork.1.0.jpg
/generated/v4/images/2026/week-06/RecordValue.1.0.jpg
/generated/v4/images/2026/week-06/CappedMarginPerformance.1.0.jpg
/generated/v4/images/2026/week-06/Blend.5.0.jpg
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
`public/generated/v4/`, then Next.js exports the site to `out/`.

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
global Node.js or npm installation. The setup and updater prepend the local
runtime only to their own process PATH so npm lifecycle scripts can resolve
`node`; they do not modify the user or machine PATH.

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
Uploads skip immutable blobs that are already present, so repeated daily runs
transfer only new snapshots and season pointers.

To replace or repair only the unattended scheduled task later:

```powershell
.\scripts\windows\install-cfbd-cache-task.ps1
```

The installer prompts for the Windows account that will run while logged out.
It creates a `CFBD` folder in Task Scheduler, replaces any task with the same
name inside that folder, and schedules six daily pulls at 1 AM, 6 AM, 3 PM,
4 PM, 8 PM, and 11:59 PM Eastern. The Windows host must use the
`Eastern Standard Time` time zone so Task Scheduler follows Eastern daylight
saving changes. Automatic season selection allows the same task to remain
installed across calendar years. Pass `-TaskPath` to the setup or installer
only if a different Task Scheduler folder is desired.

The deployed site never receives the CFBD API key, reads the raw cache, runs
ranking calculations, or generates images at request time.

## GitHub Pages publication

GitHub Pages hosts the exported site at
`https://devhl-labs.github.io/Gridiron-Curve/`. The scheduled workflow in
`.github/workflows/pages.yml` rebuilds ten minutes after each scheduled data
pull using the native `America/New_York` timezone. Daily publication times are
12:09 AM, 1:10 AM, 6:10 AM, 3:10 PM, 4:10 PM, and 8:10 PM Eastern; the
12:09 AM publication follows the prior day's 11:59 PM pull. Scheduled runs
follow the updater's active-season window: January through February and
August 15 through December. The workflow can also be started manually at any
time.

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
registered ranking systems, and verifies the static manifest and latest JPEG.
No fixture value was copied from CollegeFootballData.

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
