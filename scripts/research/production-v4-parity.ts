import { writeFileSync } from "node:fs";
import path from "node:path";
import {
  listCfbdCacheManifests,
  readCfbdSourceCache,
  type CfbdSourceCache,
} from "../../src/lib/cfbd/cache";
import {
  calculateRankings,
  CONSENSUS_V4_COMPONENT_SYSTEM_IDS,
  type RankingPriorMap,
  type RankingSystemId,
  type TeamRanking,
} from "../../src/lib/ranking";
import {
  createChainedStartingPrior,
} from "../../src/lib/ranking/view";
import {
  cappedMarginPerformanceFamilyEngine,
  calculatePublishedEvidenceRankings,
  recordValueFamilyEngine,
  resultNetworkFamilyEngine,
  type CandidateEngine,
  type CandidateRanking,
} from "./candidate-engines";
import {
  COMPOSITE_CANDIDATES,
  combineFamilyRankings,
} from "./composite-tournament";

const OUTPUT_PATH = path.join(
  process.cwd(),
  "shawn",
  "production-v4-parity-results.json",
);
const SELECTED_CANDIDATE_ID = "block-arithmetic.O50-P50";
const CURRENT_KEY_TEAMS = [
  "James Madison",
  "SMU",
  "Ohio State",
  "Tennessee",
  "Utah",
] as const;

const FAMILY_DEFINITIONS: ReadonlyArray<{
  rankingSystemId: RankingSystemId;
  engine: CandidateEngine;
}> = [
  {
    rankingSystemId: "ResultNetwork.1.0",
    engine: resultNetworkFamilyEngine,
  },
  {
    rankingSystemId: "RecordValue.1.0",
    engine: recordValueFamilyEngine,
  },
  {
    rankingSystemId: "CappedMarginPerformance.1.0",
    engine: cappedMarginPerformanceFamilyEngine,
  },
];

type Mismatch = {
  season: number;
  week: number;
  scope: string;
  team: string | null;
  expected: string | number | null;
  actual: string | number | null;
};

function loadSources() {
  return listCfbdCacheManifests()
    .toSorted((left, right) => left.season - right.season)
    .map(({ season }) => {
      const source = readCfbdSourceCache(season);
      if (!source) throw new Error(`Missing source cache for ${season}.`);
      return source;
    });
}

function compareFamily(
  source: CfbdSourceCache,
  week: number,
  scope: string,
  expected: CandidateRanking[],
  actual: TeamRanking[],
  mismatches: Mismatch[],
) {
  if (expected.length !== actual.length) {
    mismatches.push({
      season: source.season,
      week,
      scope,
      team: null,
      expected: expected.length,
      actual: actual.length,
    });
    return;
  }
  for (let index = 0; index < expected.length; index += 1) {
    const expectedRow = expected[index];
    const actualRow = actual[index];
    if (
      expectedRow.team !== actualRow.team ||
      expectedRow.rank !== actualRow.rank
    ) {
      mismatches.push({
        season: source.season,
        week,
        scope: `${scope}.order`,
        team: expectedRow.team,
        expected: `${expectedRow.rank}:${expectedRow.team}`,
        actual: `${actualRow.rank}:${actualRow.team}`,
      });
      return;
    }
    if (expectedRow.score !== actualRow.networkRating) {
      mismatches.push({
        season: source.season,
        week,
        scope: `${scope}.score`,
        team: expectedRow.team,
        expected: expectedRow.score,
        actual: actualRow.networkRating,
      });
      return;
    }
  }
}

function compareComposite(
  source: CfbdSourceCache,
  week: number,
  expected: CandidateRanking[],
  actual: TeamRanking[],
  mismatches: Mismatch[],
) {
  if (expected.length !== actual.length) {
    mismatches.push({
      season: source.season,
      week,
      scope: "Consensus.4.0",
      team: null,
      expected: expected.length,
      actual: actual.length,
    });
    return;
  }
  for (let index = 0; index < expected.length; index += 1) {
    if (
      expected[index].team !== actual[index].team ||
      expected[index].rank !== actual[index].rank
    ) {
      mismatches.push({
        season: source.season,
        week,
        scope: "Consensus.4.0.order",
        team: expected[index].team,
        expected: `${expected[index].rank}:${expected[index].team}`,
        actual: `${actual[index].rank}:${actual[index].team}`,
      });
      return;
    }
  }
}

function main() {
  const sources = loadSources();
  const selectedCandidate = COMPOSITE_CANDIDATES.find(
    ({ id }) => id === SELECTED_CANDIDATE_ID,
  );
  if (!selectedCandidate) {
    throw new Error(`Missing composite candidate ${SELECTED_CANDIDATE_ID}.`);
  }

  const mismatches: Mismatch[] = [];
  let snapshotsCompared = 0;
  let familyRowsCompared = 0;
  let compositeRowsCompared = 0;
  let currentRankings: TeamRanking[] | null = null;

  for (const source of sources) {
    const history = sources.filter(
      (candidate) => candidate.season < source.season,
    );
    const starting = createChainedStartingPrior(
      source,
      history,
    );
    const componentPriors = Object.fromEntries(
      CONSENSUS_V4_COMPONENT_SYSTEM_IDS.map((rankingSystemId) => [
        rankingSystemId,
        starting.prior,
      ]),
    ) as RankingPriorMap;

    for (let week = 1; week <= source.throughWeek; week += 1) {
      const researchFamilies = FAMILY_DEFINITIONS.map(
        ({ rankingSystemId, engine }) => ({
          rankingSystemId,
          rankings: calculatePublishedEvidenceRankings(
            engine,
            source.games,
            week,
            starting.prior,
          ),
        }),
      );
      for (const researchFamily of researchFamilies) {
        const production = calculateRankings(
          source.games,
          week,
          starting.prior,
          researchFamily.rankingSystemId,
        );
        compareFamily(
          source,
          week,
          researchFamily.rankingSystemId,
          researchFamily.rankings,
          production,
          mismatches,
        );
        familyRowsCompared += production.length;
      }

      const researchComposite = combineFamilyRankings(
        selectedCandidate,
        researchFamilies[0].rankings,
        researchFamilies[1].rankings,
        researchFamilies[2].rankings,
      );
      const productionComposite = calculateRankings(
        source.games,
        week,
        {},
        "Consensus.4.0",
        componentPriors,
      );
      compareComposite(
        source,
        week,
        researchComposite,
        productionComposite,
        mismatches,
      );
      compositeRowsCompared += productionComposite.length;
      snapshotsCompared += 1;

      if (
        source === sources.at(-1) &&
        week === source.throughWeek
      ) {
        currentRankings = productionComposite;
      }
    }
  }

  if (!currentRankings) {
    throw new Error("No current Computer Composite 4 ranking was produced.");
  }
  const currentRanks = new Map(
    currentRankings.map(({ team, rank }) => [team, rank]),
  );
  const result = {
    generatedAt: new Date().toISOString(),
    productionSystemId: "Consensus.4.0",
    researchCandidateId: SELECTED_CANDIDATE_ID,
    seasonsCompared: sources.length,
    snapshotsCompared,
    familyRowsCompared,
    compositeRowsCompared,
    mismatchCount: mismatches.length,
    mismatches: mismatches.slice(0, 100),
    current: {
      season: sources.at(-1)?.season ?? null,
      week: sources.at(-1)?.throughWeek ?? null,
      keyTeams: Object.fromEntries(
        CURRENT_KEY_TEAMS.map((team) => [
          team,
          currentRanks.get(team) ?? null,
        ]),
      ),
    },
  };
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));

  if (mismatches.length > 0) {
    throw new Error(
      `Computer Composite 4 has ${mismatches.length} production/research parity mismatches.`,
    );
  }
}

main();
