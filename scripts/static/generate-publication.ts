import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {
  listCfbdCacheManifests,
  readCfbdSourceCache,
  type CfbdSourceCache,
} from "../../src/lib/cfbd/cache";
import {
  DEFAULT_RANKING_SYSTEM_ID,
  RANKING_SYSTEM_IDS,
} from "../../src/lib/ranking";
import { createSampleView } from "../../src/lib/ranking/sample-data";
import {
  createRankingShareSvg,
  RANKING_IMAGE_HEIGHT,
  RANKING_IMAGE_WIDTH,
} from "../../src/lib/ranking/share-image";
import { createRankingView, type RankingView } from "../../src/lib/ranking/view";
import {
  PUBLICATION_FORMAT_VERSION,
  PUBLICATION_BASE_PATH,
  rankingDataPath,
  seasonDataPath,
  shareImagePath,
  type PublicationManifest,
  type PublishedSeason,
} from "../../src/lib/publication/types";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");
const generatedRoot = path.join(
  repositoryRoot,
  "public",
  "generated",
);
const outputRoot = path.join(
  generatedRoot,
  `v${PUBLICATION_FORMAT_VERSION}`,
);
const logoPromises = new Map<string, Promise<string | null>>();

async function writeJson(relativePath: string, value: unknown) {
  const outputPath = path.join(outputRoot, relativePath);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(value)}\n`, "utf8");
}

function outputRelativePath(publicPath: string) {
  const prefix = `${PUBLICATION_BASE_PATH}/`;
  if (!publicPath.startsWith(prefix)) {
    throw new Error(`Unexpected publication path: ${publicPath}`);
  }
  return publicPath.slice(prefix.length);
}

function loadLogo(url: string) {
  const cached = logoPromises.get(url);
  if (cached) return cached;
  const pending = fetch(url, {
    headers: { Accept: "image/*" },
    signal: AbortSignal.timeout(10_000),
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const contentType = response.headers.get("content-type");
      if (!contentType?.startsWith("image/")) {
        throw new Error(`Unexpected content type ${contentType ?? "unknown"}`);
      }
      const image = Buffer.from(await response.arrayBuffer()).toString("base64");
      return `data:${contentType};base64,${image}`;
    })
    .catch((error: unknown) => {
      console.warn(`Unable to include ranking logo ${url}.`, error);
      return null;
    });
  logoPromises.set(url, pending);
  return pending;
}

async function createShareImage(view: RankingView) {
  const logoEntries = await Promise.all(
    view.rankings.slice(0, 25).map(async ({ team, logo }) => [
      team,
      logo ? await loadLogo(logo) : null,
    ] as const),
  );
  const logos = new Map(
    logoEntries.flatMap(([team, logo]) =>
      logo ? [[team, logo] as const] : [],
    ),
  );
  return sharp(
    Buffer.from(
      createRankingShareSvg(
        view,
        logos,
        process.env.PUBLIC_SITE_HOST ?? "gridiron-curve",
      ),
    ),
  )
    .resize(RANKING_IMAGE_WIDTH, RANKING_IMAGE_HEIGHT)
    .jpeg({ quality: 90, chromaSubsampling: "4:4:4" })
    .toBuffer();
}

function loadSources() {
  return listCfbdCacheManifests()
    .toSorted((a, b) => a.season - b.season)
    .flatMap(({ season }) => {
      const source = readCfbdSourceCache(season);
      return source ? [source] : [];
    });
}

async function writeSource(source: CfbdSourceCache) {
  const published: PublishedSeason = {
    season: source.season,
    throughWeek: source.throughWeek,
    games: source.games,
    teams: source.teams,
  };
  await writeJson(outputRelativePath(seasonDataPath(source.season)), published);
}

function createPublishedView(view: RankingView) {
  return {
    ...view,
    rankings: view.rankings.map(
      ({
        team,
        rank,
        rating,
        record,
        networkScore,
        achievementScore,
        qualityOfWins,
        logo,
        color,
        movement,
        lastResult,
        scheduleRank,
        upcomingScheduleRank,
        consensusAverageRank,
        consensusRanks,
        blendScore,
        blendComponents,
        blendHeadToHeadRecord,
      }) => ({
        team,
        rank,
        rating,
        record,
        networkScore,
        achievementScore,
        qualityOfWins,
        logo,
        color,
        movement,
        lastResult,
        scheduleRank,
        upcomingScheduleRank,
        consensusAverageRank,
        consensusRanks,
        blendScore,
        blendComponents,
        blendHeadToHeadRecord,
      }),
    ),
  };
}

async function generateFromSources(sources: CfbdSourceCache[]) {
  const latestSource = sources.at(-1);
  if (!latestSource) throw new Error("No CFBD source cache is available.");

  await Promise.all(sources.map(writeSource));
  const shareImages: PublicationManifest["shareImages"] = [];

  for (const rankingSystemId of RANKING_SYSTEM_IDS) {
    for (const source of sources) {
      const historicalSources = sources.filter(
        ({ season }) => season < source.season,
      );
      for (let week = 1; week <= source.throughWeek; week += 1) {
        const view = createRankingView(
          { ...source, throughWeek: week },
          historicalSources,
          rankingSystemId,
        );
        await writeJson(
          outputRelativePath(
            rankingDataPath(source.season, week, rankingSystemId),
          ),
          createPublishedView(view),
        );

        if (
          source.season === latestSource.season &&
          week === latestSource.throughWeek
        ) {
          const imagePath = shareImagePath(
            source.season,
            week,
            rankingSystemId,
          );
          const outputPath = path.join(
            outputRoot,
            outputRelativePath(imagePath),
          );
          await mkdir(path.dirname(outputPath), { recursive: true });
          await writeFile(outputPath, await createShareImage(view));
          shareImages.push({
            season: source.season,
            week,
            rankingSystemId,
            path: imagePath,
          });
        }
      }
    }
  }

  return {
    latest: {
      season: latestSource.season,
      week: latestSource.throughWeek,
    },
    seasons: sources.map(({ season, throughWeek }) => ({
      season,
      throughWeek,
    })),
    shareImages,
  };
}

async function generateSamplePublication() {
  await Promise.all(
    RANKING_SYSTEM_IDS.map((rankingSystemId) => {
      const sampleView = createSampleView(rankingSystemId);
      return writeJson(
          outputRelativePath(
            rankingDataPath(
              sampleView.season,
              sampleView.week,
              rankingSystemId,
            ),
          ),
          sampleView,
        );
    }),
  );
  const sampleView = createSampleView();
  return {
    latest: { season: sampleView.season, week: sampleView.week },
    seasons: [{ season: sampleView.season, throughWeek: sampleView.week }],
    shareImages: [],
  };
}

async function main() {
  await rm(generatedRoot, { recursive: true, force: true });
  await mkdir(outputRoot, { recursive: true });

  const sources = loadSources();
  const publication =
    sources.length > 0
      ? await generateFromSources(sources)
      : await generateSamplePublication();
  const manifest: PublicationManifest = {
    formatVersion: PUBLICATION_FORMAT_VERSION,
    generatedAt: new Date().toISOString(),
    defaultRankingSystemId: DEFAULT_RANKING_SYSTEM_ID,
    rankingSystemIds: [...RANKING_SYSTEM_IDS],
    ...publication,
  };
  await writeJson("manifest.json", manifest);
  console.log(
    `Generated static publication v${PUBLICATION_FORMAT_VERSION} for ${publication.seasons.length} season(s).`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
