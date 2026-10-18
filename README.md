# Gridiron Curve

Gridiron Curve publishes college-football resume and computer rankings based
on wins, losses, and the connected network of opponents.

## Gridiron Consensus.4.0

Gridiron Consensus.4.0 is the latest selectable Computer Composite. It uses
three prior-aware evidence families:

1. **25% Canonical Result Network:** `ResultNetwork.1.0`
2. **25% Record Value:** `RecordValue.1.0`
3. **50% Capped-Margin Performance:** `CappedMarginPerformance.1.0`

Result Network equally averages tie-safe positions from canonical Colley,
regularized Bradley-Terry, and binary Massey. Record Value equally averages
Opponent Value, Wins Above Expectation, and Poisson-binomial Strength of
Record. Those two related families form one equally weighted Outcome Block.
Performance equally averages opponent-adjusted Massey positions using 14-,
21-, and 28-point scoring-margin caps.

Computer Composite 4 therefore uses:

```text
Outcome = 50% Result Network + 50% Record Value
Composite = 50% Outcome + 50% Performance
```

Raw scores are never mixed. Exact component-score ties receive their average
full-field position before the positions are combined.

All three families start from the same preseason AP/Coaches consensus plus the
previous final Curve order. The shared prior regularizes early team and
opponent estimates and stabilizes the published positions. Its influence
fades linearly to zero after six completed weeks, at which point only
current-season games affect the families.

Consensus.4.0 is the selectable Computer Composite. Consensus.3.0 remains
registered for archived publications and direct historical links, but is not
shown in ranking dropdowns.

## Gridiron Blend.3.0

Gridiron Blend.3.0 balances the three-family Computer Composite with the AP
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

## Gridiron Consensus.1.0

Gridiron Consensus combines six independently calculated full-field rankings:

1. `Curve.5.0`
2. `RecordMatrix.1.0`
3. `Pairwise.1.0`
4. `Sequence.1.0`
5. `LeastSquares.1.0`
6. `VictoryPaths.1.0`

For each team, the systems are ordered from its best rank to its worst rank.
The best and worst positions are discarded, and the remaining four are
averaged. The lowest middle-four average ranks first. An exact tie is resolved
by the untrimmed six-system average, then strength of schedule, then team name.
Published consensus rows retain all six component ranks and identify the four
that were included.

Raw model scores are never averaged because their scales have different
meanings. All components rank the same complete FBS field from the same
completed-game snapshot.

## Gridiron Consensus.2.0

Gridiron Consensus.2.0 is the archived five-component composite. It retains
`Curve.5.0`, `RecordMatrix.1.0`, `Sequence.1.0`, `LeastSquares.1.0`, and
`VictoryPaths.1.0`. It removes each team's best and worst positions and
averages the middle three. Pairwise Odds remains published as an individual
ranking but does not vote in this composite.

## Gridiron Consensus.3.0

Gridiron Consensus.3.0 is the archived third Computer Composite. It balances three
evidence families on one full-field rank scale:

1. **20% Graded Résumé:** `Curve.5.0`
2. **60% Schedule-Adjusted Record:** `ScheduleRecord.1.0`
3. **20% Neutral Computer Family:** `NeutralFamily.1.0`

Schedule-Adjusted Record first fits neutral current-season opponent strengths
from completed wins and losses. It converts the FBS field to percentiles, gives
a win the defeated opponent's percentile, gives a tie half that value, and
gives a loss zero result credit. The values are averaged across every
completed game. Lower-division opponents sit below the FBS percentile scale,
so a lower-division win receives zero opponent-quality credit.

The Neutral Computer Family equally averages the full-field positions from
Record Matrix, Result Sequence, Least Squares, and Victory Paths, then reranks
that average. Those four related algorithms therefore contribute one 20%
family vote rather than four separate votes.

Computer Composite 3 orders teams by:

```text
20% Graded Résumé rank
60% Schedule-Adjusted Record rank
20% Neutral Computer Family rank
```

Exact ties use the unweighted three-family average, then strength of schedule,
then team name. Published rows expose all three family positions and weights.

The five new computer systems use generic descriptive names and independently
written implementations of established mathematical techniques. They do not
claim to reproduce, represent, or be affiliated with any historical or
commercial ranking provider:

- **Record Matrix** solves a connected win-loss schedule matrix.
- **Pairwise Odds** fits regularized pairwise win probabilities.
- **Result Sequence** applies chronological expectation-adjusted updates.
- **Least Squares** fits constant win/loss result differences.
- **Victory Paths** recursively transfers graph value from defeated teams to
  winners.

All five begin each season evenly and exclude scoring margin, venue, polls,
previous seasons, recruiting, conference, and brand. Lower-division opponents
remain graph nodes when they play an FBS team, but the cache does not contain
their complete schedules; the systems are therefore documented as FBS
adaptations. Curve.5 retains its separately documented historical prior.

Curve.5 remains the default ranking method.

## Ranking Curve.5.0

1. **60% expectation-adjusted network foundation:** every team starts from the
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
2. **40% quality-of-wins foundation:** Curve first creates a provisional
   opponent grade by averaging network, achievement, and four-best-win quality
   valued from current network percentiles. Each Curve.5 win then receives the
   defeated opponent's percentile on that provisional grade. This two-pass
   calculation reflects the opponent's current complete resume without making
   the final score circular. The four strongest FBS win values are averaged,
   with zero used for each unfilled slot. Repeated strong wins therefore
   solidify the resume, while a weak additional victory can never reduce the
   score. FCS wins receive zero.
3. **Bounded achievement modifier:** achievement points are averaged per game
   and placed on a fixed `50 + 15 x average` scale capped from 0 to 100. The
   final adjustment is `(achievement - 50) / 10`, so margin can move a resume
   by at most five points but cannot independently create one. Wins earn
   points and losses deduct points based on margin and the opponent's
   previous-week network percentile. A clear win over a weaker opponent earns
   zero, and a close win over a weaker opponent earns `-1`; merely surviving a
   poor opponent can therefore reduce achievement.
4. **Achievement bands:** margins are close (1-6), clear (7-16), or dominant
   (17+). Opponents at least five network-percentile points higher are stronger;
   opponents at least five points lower are weaker; the rest are peers.
5. **Context timing:** achievement points use ratings from before the game, so
   a result cannot change the expectation used to grade itself. Quality of wins
   uses current ratings because a resume should change as opponents reveal
   their strength.
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

## Versioned ranking systems

The rankings selector presents Blend.3.0 as **Computer + AP/Coaches**,
Consensus.4.0 as **Computer Composite**, and Curve.5.0 as **Résumé Ranking**.
Curve.5.0, Schedule-Adjusted Record, and the five earlier standalone methods
appear under **Individual Models**. Stable system identifiers and direct links
remain unchanged.

The complete publication can reproduce Curve.0.7 through Curve.5.0, the five
neutral-start computer systems, Schedule-Adjusted Record, the Neutral Computer
Family, Gridiron Consensus.1.0 through 3.0, and Gridiron Blend.1.0 through 3.0.
The Curve systems are prerelease iterations of the Gridiron Curve resume
model. Consensus.4.0 is the default when a URL does not specify a ranking,
while Curve.5.0 remains available as the dedicated résumé ranking. Each Curve
selection rebuilds its complete chronological prior chain so historical
rankings are never mixed across configurations. Each computer system uses
only that season's results.
Each consensus supplies Curve.5 with its own chronological prior while the
neutral computer components remain neutral. Blend.3.0 uses Consensus.3.0;
earlier versions remain directly addressable for comparison.

Curve.0.7 through Curve.4.0 remain registered, generated, and available by
their stable `?ranking=` URLs for historical learning, but they are hidden from
the normal selector. Curve.5.0 is the only Curve iteration shown in the menu.

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
- `Curve.2.0` revalues Curve.1.0 win quality using each defeated opponent's
  current network strength.
- `Curve.3.0` assigns negative achievement to close wins over weaker opponents
  and shifts the final blend to 40% network, 30% win quality, and 30%
  achievement.
- `Curve.4.0` replaces diminishing win quality with the average value of the
  four strongest FBS wins, using zero for each unfilled slot, and averages the
  network, win-quality, and achievement components equally.
- `Curve.5.0` values those four wins from a same-week provisional resume grade,
  builds a 60% network and 40% win-quality foundation, and limits achievement
  to a five-point adjustment.

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
/generated/v3/images/2026/week-06/Curve.5.0.jpg
/generated/v3/images/2026/week-06/Consensus.1.0.jpg
/generated/v3/images/2026/week-06/Consensus.2.0.jpg
/generated/v3/images/2026/week-06/Consensus.3.0.jpg
/generated/v3/images/2026/week-06/ScheduleRecord.1.0.jpg
/generated/v3/images/2026/week-06/NeutralFamily.1.0.jpg
/generated/v3/images/2026/week-06/Blend.1.0.jpg
/generated/v3/images/2026/week-06/Blend.2.0.jpg
/generated/v3/images/2026/week-06/Blend.3.0.jpg
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
