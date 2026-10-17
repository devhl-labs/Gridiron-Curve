import { access } from "node:fs/promises";
import {
  type CfbdGame,
  type CfbdGameTeamStats,
  type CfbdPollWeek,
  type CfbdTeam,
} from "../../../src/lib/cfbd/client";
import { getCfbdCacheRoot } from "../../../src/lib/cfbd/cache";
import { writeSeasonCache } from "../../../scripts/cfbd/write-season-cache";

const schools = [
  "Alpha University",
  "Bravo Tech",
  "Charlie State",
  "Delta A&M",
  "Echo Institute",
  "Foxtrot University",
] as const;

const teams: CfbdTeam[] = schools.map((school, index) => ({
  id: 9001 + index,
  school,
  mascot: ["Astronauts", "Beacons", "Comets", "Deltas", "Engineers", "Foxes"][
    index
  ],
  abbreviation: ["ALP", "BRV", "CHA", "DEL", "ECH", "FOX"][index],
  color: ["#173f5f", "#7a1f2b", "#2f6b3b", "#6a4c93", "#a14d16", "#355070"][
    index
  ],
  alternateColor: "#f4f0e7",
  logos: [],
}));

function game(
  id: number,
  week: number,
  homeTeam: string,
  awayTeam: string,
  homePoints: number | null,
  awayPoints: number | null,
  options: {
    completed?: boolean;
    neutralSite?: boolean;
    awayClassification?: string;
  } = {},
): CfbdGame {
  return {
    id,
    week,
    startDate: `${String(Math.floor(id / 100))}-09-${String(
      week * 7,
    ).padStart(2, "0")}T19:00:00.000Z`,
    seasonType: "regular",
    completed: options.completed ?? true,
    neutralSite: options.neutralSite ?? false,
    homeTeam,
    homePoints,
    awayTeam,
    awayPoints,
    homeClassification: "fbs",
    awayClassification: options.awayClassification ?? "fbs",
  };
}

function teamStats(
  id: number,
  homeTeam: string,
  awayTeam: string,
  homeYards: number,
  awayYards: number,
): CfbdGameTeamStats {
  function stats(totalYards: number, turnovers: number) {
    return [
      { category: "totalYards", stat: String(totalYards) },
      { category: "rushingAttempts", stat: "34" },
      { category: "completionAttempts", stat: "18-29" },
      { category: "turnovers", stat: String(turnovers) },
    ];
  }
  return {
    id,
    teams: [
      { homeAway: "home", team: homeTeam, stats: stats(homeYards, 1) },
      { homeAway: "away", team: awayTeam, stats: stats(awayYards, 2) },
    ],
  };
}

function polls(season: number, order: readonly string[]): CfbdPollWeek[] {
  return [1, 2, 3].map(
    (week): CfbdPollWeek => ({
      season,
      week,
      polls: [
        {
          poll: "AP Top 25",
          ranks: order.map((school, index) => ({
            rank: index + 1,
            school,
          })),
        },
        {
          poll: "Coaches Poll",
          ranks: [...order].reverse().map((school, index) => ({
            rank: index + 1,
            school,
          })),
        },
      ],
    }),
  );
}

const season2098Games = [
  game(209801, 1, schools[0], schools[1], 28, 21),
  game(209802, 1, schools[2], schools[3], 35, 14),
  game(209803, 1, schools[4], schools[5], 31, 10),
  game(209804, 2, schools[1], schools[2], 24, 17),
  game(209805, 2, schools[3], schools[0], 20, 17),
  game(209806, 2, schools[5], "Example College", 27, 3, {
    awayClassification: "fcs",
  }),
];

const season2099Games = [
  game(209901, 1, schools[0], schools[4], 21, 24),
  game(209902, 1, schools[1], schools[3], 30, 13),
  game(209903, 1, schools[2], schools[5], 20, 20, { neutralSite: true }),
  game(209904, 2, schools[0], schools[2], 34, 31),
  game(209905, 2, schools[4], schools[1], 17, 10),
  game(209906, 2, schools[3], schools[5], null, null, {
    completed: false,
  }),
];

async function assertCacheIsAbsent() {
  try {
    await access(getCfbdCacheRoot());
  } catch {
    return;
  }
  throw new Error(
    "Synthetic fixture installation requires an empty .cache/cfbd/v1 directory.",
  );
}

async function main() {
  await assertCacheIsAbsent();
  await writeSeasonCache({
    year: 2098,
    throughWeek: 2,
    games: season2098Games,
    pollWeeks: polls(2098, schools),
    teams,
    teamStatsByWeek: [
      [
        teamStats(209801, schools[0], schools[1], 410, 355),
        teamStats(209802, schools[2], schools[3], 475, 280),
        teamStats(209803, schools[4], schools[5], 390, 240),
      ],
      [
        teamStats(209804, schools[1], schools[2], 365, 330),
        teamStats(209805, schools[3], schools[0], 315, 300),
        teamStats(209806, schools[5], "Example College", 440, 190),
      ],
    ],
  });
  await writeSeasonCache({
    year: 2099,
    throughWeek: 2,
    games: season2099Games,
    pollWeeks: polls(2099, [
      schools[0],
      schools[4],
      schools[1],
      schools[2],
      schools[3],
      schools[5],
    ]),
    teams,
    teamStatsByWeek: [
      [
        teamStats(209901, schools[0], schools[4], 350, 370),
        teamStats(209902, schools[1], schools[3], 425, 260),
        teamStats(209903, schools[2], schools[5], 340, 340),
      ],
      [
        teamStats(209904, schools[0], schools[2], 455, 430),
        teamStats(209905, schools[4], schools[1], 320, 290),
      ],
    ],
  });
  console.log("Installed wholly synthetic CFBD cache fixtures for 2098-2099.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
