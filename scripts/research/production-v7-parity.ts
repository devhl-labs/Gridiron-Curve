import { writeFileSync } from "node:fs";
import path from "node:path";
import {
  listCfbdCacheManifests,
  readCfbdSourceCache,
  type CfbdSourceCache,
} from "../../src/lib/cfbd/cache";
import {
  calculateRankings,
  CONSENSUS_V7_COMPONENT_SYSTEM_IDS,
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
  combineCompositeV7Rankings,
  resultNetworkScheduleRanks,
  strongestDefeatedOpponentEvidence,
  type CompositeV7Ranking,
} from "./composite-v7";

const OUTPUT_PATH = path.join(
  process.cwd(),
  "shawn",
  "production-v7-parity-results.json",
);
const SELECTED_CANDIDATE_ID =
  "earned-record-rank-scaled-loss-pressure.V40-P14-L1-4-2-E12";
const CURRENT_KEY_TEAMS = [
  "Miami",
  "BYU",
  "UCLA",
  "Notre Dame",
  "Alabama",
  "Ohio State",
  "LSU",
  "James Madison",
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
    rankingSystemId: "RecordValue.2.0",
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
  expected: CompositeV7Ranking[],
  actual: TeamRanking[],
  mismatches: Mismatch[],
) {
  if (expected.length !== actual.length) {
    mismatches.push({
      season: source.season,
      week,
      scope: "Consensus.7.0",
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
        scope: "Consensus.7.0.order",
        team: expected[index].team,
        expected: `${expected[index].rank}:${expected[index].team}`,
        actual: `${actual[index].rank}:${actual[index].team}`,
      });
      return;
    }
    if (expected[index].score !== actual[index].networkRating) {
      mismatches.push({
        season: source.season,
        week,
        scope: "Consensus.7.0.score",
        team: expected[index].team,
        expected: expected[index].score,
        actual: actual[index].networkRating,
      });
      return;
    }
    if (
      expected[index].preliminaryRank !==
      actual[index].consensusPreliminaryRank
    ) {
      mismatches.push({
        season: source.season,
        week,
        scope: "Consensus.7.0.preliminary-rank",
        team: expected[index].team,
        expected: expected[index].preliminaryRank,
        actual: actual[index].consensusPreliminaryRank ?? null,
      });
      return;
    }
    if (
      JSON.stringify(expected[index].adjudication) !==
      JSON.stringify(actual[index].consensusAdjudication)
    ) {
      mismatches.push({
        season: source.season,
        week,
        scope: "Consensus.7.0.adjudication",
        team: expected[index].team,
        expected: JSON.stringify(expected[index].adjudication ?? null),
        actual: JSON.stringify(
          actual[index].consensusAdjudication ?? null,
        ),
      });
      return;
    }
  }
}

function main() {
  const sources = loadSources();
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
      CONSENSUS_V7_COMPONENT_SYSTEM_IDS.map((rankingSystemId) => [
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

      const strongestWinEvidence =
        strongestDefeatedOpponentEvidence(
          source,
          week,
          researchFamilies[0].rankings,
        );
      const researchComposite = combineCompositeV7Rankings(
        source,
        week,
        researchFamilies[0].rankings,
        researchFamilies[1].rankings,
        researchFamilies[2].rankings,
        {
          scheduleRanks: resultNetworkScheduleRanks(
            source,
            week,
            researchFamilies[0].rankings,
          ),
          bestWinRanks: strongestWinEvidence.bestWinRanks,
          topTwoWinAverageRanks:
            strongestWinEvidence.topTwoWinAverageRanks,
          fbsGamesPlayed: strongestWinEvidence.fbsGamesPlayed,
        },
      );
      const productionComposite = calculateRankings(
        source.games,
        week,
        {},
        "Consensus.7.0",
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
    throw new Error("No current Computer Composite 7 ranking was produced.");
  }
  const currentRanks = new Map(
    currentRankings.map(({ team, rank }) => [team, rank]),
  );
  const result = {
    generatedAt: new Date().toISOString(),
    productionSystemId: "Consensus.7.0",
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
      `Computer Composite 7 has ${mismatches.length} production/research parity mismatches.`,
    );
  }
}

main();
