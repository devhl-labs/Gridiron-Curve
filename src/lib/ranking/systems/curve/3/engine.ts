import { createCurveEngine } from "../engine";

export { hasUsableBoxScore } from "../engine";

export const {
  buildPollPrior,
  buildFullPreseasonPrior,
  calculateExpectedStrengthRatings,
  calculateAchievementPoints,
  calculateRankings,
} = createCurveEngine("current-diminishing", {
  achievementStrategy: "signed-weak-wins",
  finalWeights: {
    network: 0.4,
    qualityOfWins: 0.3,
    achievement: 0.3,
  },
});
