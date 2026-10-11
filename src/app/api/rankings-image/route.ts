import sharp from "sharp";
import {
  listCfbdCacheManifests,
  readCfbdSourceCache,
} from "@/lib/cfbd/cache";
import {
  createRankingShareSvg,
  RANKING_IMAGE_HEIGHT,
  RANKING_IMAGE_WIDTH,
} from "@/lib/ranking/share-image";
import {
  isModelVersion,
  parseModelVersion,
} from "@/lib/ranking";
import { createRankingView } from "@/lib/ranking/view";

const logoCache = new Map<string, Promise<string>>();

function loadLogo(url: string) {
  const cached = logoCache.get(url);
  if (cached) return cached;

  const pending = fetch(url, {
    headers: { Accept: "image/*" },
    signal: AbortSignal.timeout(5000),
  }).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Logo request failed with HTTP ${response.status}: ${url}`);
    }
    const contentType = response.headers.get("content-type");
    if (!contentType?.startsWith("image/")) {
      throw new Error(`Logo response is not an image: ${url}`);
    }
    const image = Buffer.from(await response.arrayBuffer()).toString("base64");
    return `data:${contentType};base64,${image}`;
  });
  logoCache.set(url, pending);
  pending.catch(() => logoCache.delete(url));
  return pending;
}

async function loadRankingLogos(view: ReturnType<typeof createRankingView>) {
  const entries = await Promise.all(
    view.rankings.slice(0, 25).map(async ({ team, logo }) => {
      if (!logo) return [team, null] as const;
      try {
        return [team, await loadLogo(logo)] as const;
      } catch (error) {
        console.warn(`Using initials for ${team} in ranking share image.`, error);
        return [team, null] as const;
      }
    }),
  );
  return new Map(
    entries.flatMap(([team, logo]) => (logo ? [[team, logo] as const] : [])),
  );
}

function parsePositiveInteger(value: string | null) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const season = parsePositiveInteger(url.searchParams.get("season"));
  const week = parsePositiveInteger(url.searchParams.get("week"));
  const requestedModel = url.searchParams.get("model");
  if (requestedModel !== null && !isModelVersion(requestedModel)) {
    return new Response("The requested model version is unavailable.", {
      status: 400,
    });
  }
  const modelVersion = parseModelVersion(requestedModel);
  if (season === null || week === null) {
    return new Response("A valid season and week are required.", {
      status: 400,
    });
  }

  const manifests = listCfbdCacheManifests();
  const manifest = manifests.find((candidate) => candidate.season === season);
  if (!manifest || week > manifest.throughWeek) {
    return new Response("The requested ranking is unavailable.", {
      status: 404,
    });
  }

  const source = readCfbdSourceCache(season);
  if (!source) {
    return new Response("The requested ranking cache is unavailable.", {
      status: 404,
    });
  }
  const historicalSources = manifests
    .filter((candidate) => candidate.season < season)
    .toSorted((a, b) => a.season - b.season)
    .flatMap(({ season: historicalSeason }) => {
      const historical = readCfbdSourceCache(historicalSeason);
      return historical ? [historical] : [];
    });
  const view = createRankingView(
    { ...source, throughWeek: week },
    historicalSources,
    modelVersion,
  );
  const logos = await loadRankingLogos(view);
  const rankingUrl = url.host;
  const image = await sharp(
    Buffer.from(createRankingShareSvg(view, logos, rankingUrl)),
  )
    .resize(RANKING_IMAGE_WIDTH, RANKING_IMAGE_HEIGHT)
    .jpeg({ quality: 90, chromaSubsampling: "4:4:4" })
    .toBuffer();
  const download = url.searchParams.get("download") === "1";

  return new Response(new Uint8Array(image), {
    headers: {
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="gridiron-curve-${season}-week-${week}-${modelVersion}.jpg"`,
      "Content-Length": String(image.byteLength),
      "Content-Type": "image/jpeg",
    },
  });
}
