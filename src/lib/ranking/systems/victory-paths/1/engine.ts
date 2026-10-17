import { createComputerEngine } from "../../computer/engine";

export const {
  buildPollPrior,
  buildFullPreseasonPrior,
  calculateExpectedStrengthRatings,
  calculateAchievementPoints,
  calculateRankings,
} = createComputerEngine("victory-paths");
