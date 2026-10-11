import type { RankingView } from "./view";

export const RANKING_IMAGE_WIDTH = 1080;
export const RANKING_IMAGE_HEIGHT = 1350;

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function cardColor(color: string | null) {
  return color && /^#[0-9a-f]{6}$/i.test(color) ? color : "#26352d";
}

function textColor(background: string) {
  const red = Number.parseInt(background.slice(1, 3), 16);
  const green = Number.parseInt(background.slice(3, 5), 16);
  const blue = Number.parseInt(background.slice(5, 7), 16);
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
  return luminance > 0.62 ? "#17221c" : "#f7f3e9";
}

function teamFontSize(team: string) {
  if (team.length > 19) return 13;
  if (team.length > 15) return 15;
  return 17;
}

function movementLabel(movement: number | null) {
  if (movement === null) return "NEW";
  if (movement > 0) return `▲ ${movement}`;
  if (movement < 0) return `▼ ${Math.abs(movement)}`;
  return "—";
}

function teamInitials(team: string) {
  return team
    .split(/[\s()-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function rankingCard(
  team: RankingView["rankings"][number],
  index: number,
  logos: ReadonlyMap<string, string>,
) {
  const column = index % 5;
  const row = Math.floor(index / 5);
  const x = 30 + column * 206;
  const y = 174 + row * 224;
  const background = cardColor(team.color);
  const foreground = textColor(background);
  const muted = foreground === "#17221c" ? "#17221ca8" : "#f7f3e9b8";
  const logo = logos.get(team.team);
  const mark = logo
    ? `
      <circle cx="97" cy="97" r="50" fill="#f7f3e9" fill-opacity=".94"/>
      <image href="${logo}" x="55" y="55" width="84" height="84" preserveAspectRatio="xMidYMid meet"/>
    `
    : `
      <circle cx="97" cy="97" r="50" fill="#f7f3e9" fill-opacity=".94"/>
      <text x="97" y="113" fill="#17221c" font-family="Arial, sans-serif" font-size="42" font-weight="800" text-anchor="middle">${escapeXml(teamInitials(team.team))}</text>
    `;

  return `
    <g transform="translate(${x} ${y})">
      <rect width="194" height="212" rx="12" fill="${background}" stroke="#ffffff45" stroke-width="2"/>
      <text x="13" y="37" fill="${foreground}" font-family="Arial, sans-serif" font-size="29" font-weight="800">${team.rank}</text>
      ${mark}
      <text x="97" y="164" fill="${foreground}" font-family="Arial, sans-serif" font-size="${teamFontSize(team.team)}" font-weight="800" text-anchor="middle">${escapeXml(team.team)}</text>
      <text x="13" y="198" fill="${muted}" font-family="monospace" font-size="11">${escapeXml(team.record)}</text>
      <text x="181" y="198" fill="${muted}" font-family="monospace" font-size="10" font-weight="700" text-anchor="end">${movementLabel(team.movement)}</text>
    </g>
  `;
}

export function createRankingShareSvg(
  view: RankingView,
  logos: ReadonlyMap<string, string> = new Map(),
  rankingUrl = "localhost:3000",
) {
  const cards = view.rankings
    .slice(0, 25)
    .map((team, index) => rankingCard(team, index, logos))
    .join("");

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${RANKING_IMAGE_WIDTH}" height="${RANKING_IMAGE_HEIGHT}" viewBox="0 0 ${RANKING_IMAGE_WIDTH} ${RANKING_IMAGE_HEIGHT}">
      <rect width="1080" height="1350" fill="#111713"/>
      <rect x="30" y="31" width="52" height="52" fill="#dc5f31"/>
      <text x="56" y="69" fill="#fff" font-family="Georgia, serif" font-size="35" font-weight="700" text-anchor="middle">G</text>
      <text x="101" y="66" fill="#f4f0e7" font-family="Arial, sans-serif" font-size="30" font-weight="800" letter-spacing="4">GRIDIRON CURVE</text>
      <text x="30" y="126" fill="#f4f0e7" font-family="Arial, sans-serif" font-size="30" font-weight="800">TOP 25</text>
      <text x="1050" y="124" fill="#9aa69e" font-family="monospace" font-size="16" font-weight="600" text-anchor="end">${view.season} SEASON · WEEK ${view.week} · ${view.modelVersion.toUpperCase()}</text>
      <line x1="30" y1="148" x2="1050" y2="148" stroke="#dc5f31" stroke-width="3"/>
      ${cards}
      <text x="540" y="1322" fill="#8d9a90" font-family="monospace" font-size="15" letter-spacing="1" text-anchor="middle">${escapeXml(rankingUrl)}</text>
    </svg>
  `;
}
