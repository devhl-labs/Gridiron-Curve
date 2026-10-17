import { createCurveEngine } from "../engine";

export { hasUsableBoxScore } from "../engine";

export const {
  buildPollPrior,
  buildFullPreseasonPrior,
  calculateExpectedStrengthRatings,
  calculateAchievementPoints,
  calculateRankings,
} = createCurveEngine("current-best-four", {
  achievementStrategy: "signed-weak-wins",
  finalWeights: {
    network: 1 / 3,
    qualityOfWins: 1 / 3,
    achievement: 1 / 3,
  },
});
