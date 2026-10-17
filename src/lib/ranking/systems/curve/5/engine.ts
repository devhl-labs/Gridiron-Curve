import { createCurveEngine } from "../engine";

export { hasUsableBoxScore } from "../engine";

export const {
  buildPollPrior,
  buildFullPreseasonPrior,
  calculateExpectedStrengthRatings,
  calculateAchievementPoints,
  calculateRankings,
} = createCurveEngine("current-resume-best-four", {
  achievementStrategy: "signed-weak-wins",
  finalScoreStrategy: "resume-foundation",
});
