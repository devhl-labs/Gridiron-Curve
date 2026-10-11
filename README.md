# Gridiron Curve

Gridiron Curve is a college-football resume model based on wins, losses, and
the connected network of opponents.

## Model v0.11

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
   network percentile. Those values are averaged across wins; FCS wins receive
   zero. Until an FBS opponent has played an FBS game, its preseason network
   percentile remains its win value so FCS-only results cannot distort it.
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

## Prerelease model versions

The rankings selector can reproduce model versions `v0.7` through `v0.11`.
All are prerelease iterations of Gridiron Curve; `v0.11` is the default. Each
selection rebuilds the complete chronological prior chain with that version so
historical rankings are never mixed across models.

Each version keeps its defining parameters in its own directory under
`src/lib/ranking/models/` and explicitly selects a calculation engine. Versions
v0.7 through v0.11 are pinned to `src/lib/ranking/engines/v1/ranking.ts`.
`src/lib/ranking/index.ts` is a compatibility dispatcher that resolves the selected
model and invokes its engine, so a future structural algorithm change can add a
new engine without changing historical model behavior.

- `v0.7` retains the full inherited prior throughout the season.
- `v0.8` fades the inherited prior in both published ratings and game
  expectations.
- `v0.9` fades the inherited prior in published ratings while retaining full
  inherited strength for game expectations.
- `v0.10` retains the v0.9 rating updates and replaces the ordinal network
  percentile in the final blend with a magnitude-aware 1300–1700 network score.
- `v0.11` blends 25% ordinal network percentile with 75% rating magnitude.

Until CFBD inputs are cached, the landing page uses a small, clearly labeled
illustrative dataset. The sync command retrieves the FBS season and caches
normalized provider inputs locally. Rankings are calculated in memory and are
never written as a generated view.

## Ranking share images

Every cached season and week has an on-demand 1080x1350 Top 25 JPEG. The
rankings page can copy its image URL or download the file. The endpoint is:

```text
/api/rankings-image?season=2026&week=6&model=v0.11
```

The `model` parameter accepts any supported prerelease version and defaults to
`v0.11`.

Add `&download=1` to return the image as an attachment. Share images use the
same historical prior chain and active ranking model as the visible table.

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
after every raw response file has been written. The site loads the selected
raw files, normalizes and joins them in memory, and calculates the ranking view
for each request. CFBD requests are restricted to the regular season;
postseason games are not cached or ranked.

CFBD requires game-level team statistics to be requested one week at a time.
A sync therefore uses `week + 3` API calls: one each for games, polls, and team
metadata, plus one box-score request for every week through the snapshot.

## Always-on server

Build once when application code changes, then keep the production server
running:

```bash
npm install
npm run build
npm run start
```

Refreshing football data does not require a build or restart:

```bash
npm run sync -- 2025 15
```

The next request sees the new cache. For unattended operation, schedule the
sync command with cron, systemd timers, or the host operating system's task
scheduler. Keep `.env` readable only by the service account.

When deploying new application code without downtime, build in a separate
release directory and switch the running service after the build succeeds.

## Commands

```bash
npm run dev
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
