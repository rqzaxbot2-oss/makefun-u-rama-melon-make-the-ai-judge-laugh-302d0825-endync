export type JudgeAxisKey = "truth" | "turn" | "tightness" | "freshness";

export interface JudgeMetrics {
  truth: number;
  turn: number;
  tightness: number;
  freshness: number;
}

export interface JokeEntry {
  id: string;
  author: string;
  joke: string;
  category: string;
  chars: number;
  metrics: JudgeMetrics;
  wins: number;
  losses: number;
  rating: number;
}

export interface SnapshotData {
  bountyId: string;
  title: string;
  round: number;
  generatedAt: string;
  source: string;
  entries: JokeEntry[];
}

export interface RadarPoint {
  axis: JudgeAxisKey;
  label: string;
  score: number;
  x: number;
  y: number;
}

export interface RankedJoke extends JokeEntry {
  rank: number;
  composite: number;
  winRate: number;
  pairwiseWins: number;
  pairwiseLosses: number;
  marginAvg: number;
  underLimit: boolean;
  singleLine: boolean;
  points: RadarPoint[];
  svgPolygon: string;
}

export interface RadarAxisSummary {
  key: JudgeAxisKey;
  label: string;
  weight: number;
  mean: number;
  min: number;
  max: number;
  leaderId: string;
  leaderScore: number;
}

export interface PairwiseDuel {
  aId: string;
  bId: string;
  winnerId: string;
  margin: number;
  decidingAxis: JudgeAxisKey;
}

export interface RadarModel {
  bountyId: string;
  title: string;
  round: number;
  generatedAt: string;
  maxChars: number;
  axes: RadarAxisSummary[];
  rankings: RankedJoke[];
  champion: RankedJoke;
  duels: PairwiseDuel[];
  summary: {
    totalEntries: number;
    underLimitCount: number;
    avgChars: number;
    avgComposite: number;
    topComposite: number;
    spread: number;
  };
}

export interface BoardAlert {
  level: "info" | "warn" | "error";
  code: string;
  entryId?: string;
  message: string;
}

export interface BoardIssue {
  issueNumber: number;
  edition: string;
  bountyId: string;
  title: string;
  generatedAt: string;
  headline: string;
  champion: RankedJoke;
  rankings: RankedJoke[];
  axes: RadarAxisSummary[];
  alerts: BoardAlert[];
  highlights: string[];
  valid: boolean;
  markdown: string;
  plainText: string;
}

export interface BoardIssueOptions {
  issueNumber?: number;
  edition?: string;
}

export interface DataScriptOptions {
  globalName?: string;
  wrapTag?: boolean;
}

const DEFAULT_BOUNTY_ID = "u-rama-melon-make-the-ai-judge-laugh-302d0825";
const DEFAULT_TITLE = "Make the AI Judge Laugh";
const DEFAULT_TIMESTAMP = "2026-01-01T00:00:00.000Z";
const MAX_JOKE_CHARS = 200;

const AXIS_SPEC: ReadonlyArray<{
  key: JudgeAxisKey;
  label: string;
  weight: number;
  angleDeg: number;
}> = [
  { key: "truth", label: "Office Truth", weight: 0.3, angleDeg: -90 },
  { key: "turn", label: "Surprising Turn", weight: 0.3, angleDeg: 0 },
  { key: "tightness", label: "Line Tightness", weight: 0.2, angleDeg: 90 },
  { key: "freshness", label: "Freshness", weight: 0.2, angleDeg: 180 },
];

const OFFICE_TERMS = [
  "calendar", "meeting", "slack", "email", "manager", "boss", "sync",
  "roadmap", "slide", "hr", "burnout", "mute", "policy", "wellness",
  "all-hands", "vp", "salaried", "family", "raise", "break room",
  "focus time", "pre-meeting", "alignment", "standup", "sprint",
  "deadline", "quarterly", "inbox", "office", "corporate", "webinar",
  "survey", "invite", "coworker", "screenshot", "deck", "retro",
];

const PIVOT_TERMS = [
  "because", "which", "so", "before", "until", "except", "actually",
  "explained", "instead", "naturally", "translates", "translating",
  "promoted", "celebrated", "cur", "hope",
];

const CLICHE_TERMS = [
  "case of the mondays", "working hard or hardly working", "hump day",
  "tgif", "living the dream", "another day another dollar",
];

const DEFAULT_JOKES: ReadonlyArray<{
  id: string;
  author: string;
  category: string;
  joke: string;
}> = [
  {
    id: "joke-01",
    author: "desk-oracle",
    category: "calendar",
    joke: "I marked my calendar 'Focus Time,' so naturally my manager booked a 30-minute sync to ask what I'm focusing on.",
  },
  {
    id: "joke-02",
    author: "slide-smith",
    category: "strategy",
    joke: "My job is mostly translating 'we have no idea' into a 14-slide roadmap with three phases and a bold arrow pointing northeast.",
  },
  {
    id: "joke-03",
    author: "slack-survivor",
    category: "messaging",
    joke: "I put 'Quick Question' in the Slack message so my coworker has three seconds of hope before the four-paragraph screenshot arrives.",
  },
  {
    id: "joke-04",
    author: "open-plan",
    category: "management",
    joke: "Our company calls it an 'open-door policy' because removing the wall saved $400 and now my manager can ask if I saw his Slack before he finishes typing it.",
  },
  {
    id: "joke-05",
    author: "wellness-bot",
    category: "hr",
    joke: "HR sent a survey asking how to cure burnout and attached a mandatory reminder to complete it before our unpaid wellness webinar.",
  },
  {
    id: "joke-06",
    author: "mute-toggle",
    category: "meetings",
    joke: "Our quarterly all-hands celebrated record efficiency by putting 400 salaried adults on mute to watch one VP unmute himself for nine minutes.",
  },
  {
    id: "joke-07",
    author: "inbox-zero",
    category: "meetings",
    joke: "Every meeting that 'could have been an email' is actually an email nobody read, promoted to a calendar invite with stale muffins.",
  },
  {
    id: "joke-08",
    author: "culture-fit",
    category: "culture",
    joke: "My boss said 'we're a family,' which explained why nobody gets a raise and Q4 ends with someone crying in the break room.",
  },
];

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function compareAscii(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(obj: Record<string, unknown>, keys: string[], fallback: string): string {
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === "string" && val.trim().length > 0) {
      return val.trim();
    }
  }
  return fallback;
}

function readNumber(obj: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === "number" && Number.isFinite(val)) {
      return val;
    }
    if (typeof val === "string" && val.trim().length > 0) {
      const parsed = Number(val);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return undefined;
}

function normalizeScore(raw: number): number {
  const scaled = raw <= 1 ? raw * 100 : raw <= 10 ? raw * 10 : raw;
  return round2(clamp(scaled, 0, 100));
}

function scoreJokeText(joke: string): JudgeMetrics {
  const clean = joke.trim();
  const lower = clean.toLowerCase();
  const words = lower.match(/[a-z0-9'-]+/g) ?? [];
  const wordCount = Math.max(1, words.length);
  const uniqueWords = new Set(words).size;
  const charLen = clean.length;

  let officeHits = 0;
  for (const term of OFFICE_TERMS) {
    if (lower.includes(term)) {
      officeHits += 1;
    }
  }
  const truth = round2(clamp(54 + officeHits * 11 + (clean.includes("'") ? 4 : 0), 35, 98));

  let pivotHits = 0;
  for (const term of PIVOT_TERMS) {
    if (lower.includes(term)) {
      pivotHits += 1;
    }
  }
  const hasCommaOrDash = clean.includes(",") || clean.includes("—") || clean.includes(":");
  const hasSpecificNumber = /\d/.test(clean);
  const half = Math.floor(words.length / 2);
  const firstHalf = new Set(words.slice(0, half));
  const secondNovel = words.slice(half).filter((w) => !firstHalf.has(w)).length;
  const noveltyRatio = half > 0 ? secondNovel / Math.max(1, words.length - half) : 0.5;
  const turn = round2(
    clamp(
      50 + pivotHits * 10 + (hasCommaOrDash ? 8 : 0) + (hasSpecificNumber ? 7 : 0) + noveltyRatio * 18,
      35,
      98,
    ),
  );

  const singleLine = !clean.includes("\n") && !clean.includes("\r");
  let lengthScore = 96;
  if (charLen >= MAX_JOKE_CHARS) {
    lengthScore = Math.max(15, 52 - (charLen - MAX_JOKE_CHARS) * 1.2);
  } else if (charLen < 45) {
    lengthScore = 72 + (charLen / 45) * 14;
  } else if (charLen <= 140) {
    lengthScore = 96 - Math.abs(charLen - 118) * 0.14;
  } else {
    lengthScore = 90 - (charLen - 140) * 0.35;
  }
  const tightness = round2(clamp(lengthScore - (singleLine ? 0 : 25), 10, 99));

  let clichePenalty = 0;
  for (const cliche of CLICHE_TERMS) {
    if (lower.includes(cliche)) {
      clichePenalty += 18;
    }
  }
  const ttr = uniqueWords / wordCount;
  const avgWordLen = words.reduce((sum, w) => sum + w.length, 0) / wordCount;
  const freshness = round2(
    clamp(42 + ttr * 38 + (hasSpecificNumber ? 8 : 0) + clamp(avgWordLen - 4, 0, 3) * 4 - clichePenalty, 25, 98),
  );

  return { truth, turn, tightness, freshness };
}

function normalizeEntry(raw: unknown, index: number): JokeEntry | null {
  if (typeof raw === "string") {
    const joke = raw.trim();
    if (!joke) return null;
    const metrics = scoreJokeText(joke);
    return {
      id: `joke-${String(index + 1).padStart(2, "0")}`,
      author: `entrant-${index + 1}`,
      joke,
      category: "office",
      chars: joke.length,
      metrics,
      wins: 0,
      losses: 0,
      rating: 1500,
    };
  }
  if (!isRecord(raw)) return null;

  const joke = readString(raw, ["joke", "text", "line", "entry", "content"], "");
  if (!joke) return null;

  const id = readString(raw, ["id", "slug", "key"], `joke-${String(index + 1).padStart(2, "0")}`);
  const author = readString(raw, ["author", "entrant", "handle", "name"], `entrant-${index + 1}`);
  const category = readString(raw, ["category", "topic", "tag"], "office");

  const metricSource = isRecord(raw.metrics)
    ? raw.metrics
    : isRecord(raw.scores)
      ? raw.scores
      : isRecord(raw.radar)
        ? raw.radar
        : raw;

  const derived = scoreJokeText(joke);
  const rawTruth = readNumber(metricSource, ["truth", "observation", "relatability"]);
  const rawTurn = readNumber(metricSource, ["turn", "surprise", "punchline", "twist"]);
  const rawTight = readNumber(metricSource, ["tightness", "brevity", "economy", "craft"]);
  const rawFresh = readNumber(metricSource, ["freshness", "originality", "novelty"]);

  const metrics: JudgeMetrics = {
    truth: rawTruth !== undefined ? normalizeScore(rawTruth) : derived.truth,
    turn: rawTurn !== undefined ? normalizeScore(rawTurn) : derived.turn,
    tightness: rawTight !== undefined ? normalizeScore(rawTight) : derived.tightness,
    freshness: rawFresh !== undefined ? normalizeScore(rawFresh) : derived.freshness,
  };

  return {
    id,
    author,
    joke,
    category,
    chars: joke.length,
    metrics,
    wins: Math.max(0, Math.round(readNumber(raw, ["wins", "winCount"]) ?? 0)),
    losses: Math.max(0, Math.round(readNumber(raw, ["losses", "lossCount"]) ?? 0)),
    rating: round2(readNumber(raw, ["rating", "elo", "score"]) ?? 1500),
  };
}

function defaultEntries(): JokeEntry[] {
  return DEFAULT_JOKES.map((item, idx) => normalizeEntry(item, idx) as JokeEntry);
}

export function parseSnapshot(raw?: unknown): SnapshotData {
  let parsed: unknown = raw;
  let source = "default";

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed.length > 0) {
      try {
        parsed = JSON.parse(trimmed);
        source = "json";
      } catch {
        const lines = trimmed
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter((line) => line.length > 0 && !line.startsWith("#"));
        parsed = lines;
        source = "lines";
      }
    } else {
      parsed = undefined;
    }
  } else if (raw !== undefined && raw !== null) {
    source = "object";
  }

  if (Array.isArray(parsed)) {
    const entries = parsed
      .map((item, idx) => normalizeEntry(item, idx))
      .filter((item): item is JokeEntry => item !== null);
    return {
      bountyId: DEFAULT_BOUNTY_ID,
      title: DEFAULT_TITLE,
      round: 1,
      generatedAt: DEFAULT_TIMESTAMP,
      source,
      entries: entries.length > 0 ? entries : defaultEntries(),
    };
  }

  if (isRecord(parsed)) {
    const rawList =
      (Array.isArray(parsed.entries) && parsed.entries) ||
      (Array.isArray(parsed.jokes) && parsed.jokes) ||
      (Array.isArray(parsed.items) && parsed.items) ||
      (Array.isArray(parsed.rankings) && parsed.rankings) ||
      (Array.isArray(parsed.board) && parsed.board) ||
      [];

    const entries = rawList
      .map((item, idx) => normalizeEntry(item, idx))
      .filter((item): item is JokeEntry => item !== null);

    return {
      bountyId: readString(parsed, ["bountyId", "bounty_id", "slug"], DEFAULT_BOUNTY_ID),
      title: readString(parsed, ["title", "name", "bounty"], DEFAULT_TITLE),
      round: Math.max(1, Math.round(readNumber(parsed, ["round", "edition", "issue"]) ?? 1)),
      generatedAt: readString(parsed, ["generatedAt", "generated_at", "timestamp"], DEFAULT_TIMESTAMP),
      source: readString(parsed, ["source"], source),
      entries: entries.length > 0 ? entries : defaultEntries(),
    };
  }

  return {
    bountyId: DEFAULT_BOUNTY_ID,
    title: DEFAULT_TITLE,
    round: 1,
    generatedAt: DEFAULT_TIMESTAMP,
    source: "default",
    entries: defaultEntries(),
  };
}

function computeComposite(metrics: JudgeMetrics, chars: number, singleLine: boolean): number {
  const weighted = AXIS_SPEC.reduce((sum, axis) => sum + metrics[axis.key] * axis.weight, 0);
  const limitPenalty = chars >= MAX_JOKE_CHARS ? 12 : 0;
  const linePenalty = singleLine ? 0 : 10;
  return round2(clamp(weighted - limitPenalty - linePenalty, 0, 100));
}

function buildRadarPoints(metrics: JudgeMetrics, cx = 120, cy = 120, radius = 88): RadarPoint[] {
  return AXIS_SPEC.map((axis) => {
    const score = metrics[axis.key];
    const rad = (axis.angleDeg * Math.PI) / 180;
    const dist = (score / 100) * radius;
    return {
      axis: axis.key,
      label: axis.label,
      score,
      x: round2(cx + Math.cos(rad) * dist),
      y: round2(cy + Math.sin(rad) * dist),
    };
  });
}

function isRadarModel(value: unknown): value is RadarModel {
  return isRecord(value) && Array.isArray(value.rankings) && Array.isArray(value.axes) && isRecord(value.summary);
}

export function buildRadar(input?: SnapshotData | unknown): RadarModel {
  const snapshot = isRecord(input) && Array.isArray(input.entries) && typeof input.bountyId === "string"
    ? (input as unknown as SnapshotData)
    : parseSnapshot(input);

  const entries = [...snapshot.entries].sort((a, b) => compareAscii(a.id, b.id));
  const stats = new Map<string, { wins: number; losses: number; marginSum: number; matches: number }>();
  for (const entry of entries) {
    stats.set(entry.id, { wins: 0, losses: 0, marginSum: 0, matches: 0 });
  }

  const duels: PairwiseDuel[] = [];
  for (let i = 0; i < entries.length; i += 1) {
    for (let j = i + 1; j < entries.length; j += 1) {
      const a = entries[i];
      const b = entries[j];
      const aSingle = !a.joke.includes("\n") && !a.joke.includes("\r");
      const bSingle = !b.joke.includes("\n") && !b.joke.includes("\r");
      const aScore = computeComposite(a.metrics, a.chars, aSingle);
      const bScore = computeComposite(b.metrics, b.chars, bSingle);

      let decidingAxis: JudgeAxisKey = "truth";
      let maxDelta = -1;
      for (const axis of AXIS_SPEC) {
        const delta = Math.abs(a.metrics[axis.key] - b.metrics[axis.key]) * axis.weight;
        if (delta > maxDelta) {
          maxDelta = delta;
          decidingAxis = axis.key;
        }
      }

      const diff = round2(aScore - bScore);
      const aWins = diff > 0 || (diff === 0 && compareAscii(a.id, b.id) < 0);
      const winner = aWins ? a : b;
      const loser = aWins ? b : a;
      const margin = round2(Math.abs(diff));

      duels.push({
        aId: a.id,
        bId: b.id,
        winnerId: winner.id,
        margin,
        decidingAxis,
      });

      const wStat = stats.get(winner.id)!;
      const lStat = stats.get(loser.id)!;
      wStat.wins += 1;
      wStat.marginSum += margin;
      wStat.matches += 1;
      lStat.losses += 1;
      lStat.marginSum -= margin;
      lStat.matches += 1;
    }
  }

  const unranked: RankedJoke[] = entries.map((entry) => {
    const singleLine = !entry.joke.includes("\n") && !entry.joke.includes("\r");
    const underLimit = entry.chars < MAX_JOKE_CHARS;
    const composite = computeComposite(entry.metrics, entry.chars, singleLine);
    const duelStat = stats.get(entry.id)!;
    const totalWins = duelStat.wins + entry.wins;
    const totalLosses = duelStat.losses + entry.losses;
    const totalMatches = totalWins + totalLosses;
    const winRate = totalMatches > 0 ? round2((totalWins / totalMatches) * 100) : 0;
    const marginAvg = duelStat.matches > 0 ? round2(duelStat.marginSum / duelStat.matches) : 0;
    const points = buildRadarPoints(entry.metrics);
    const svgPolygon = points.map((pt) => `${pt.x},${pt.y}`).join(" ");

    return {
      ...entry,
      rank: 0,
      composite,
      winRate,
      pairwiseWins: duelStat.wins,
      pairwiseLosses: duelStat.losses,
      marginAvg,
      underLimit,
      singleLine,
      points,
      svgPolygon,
    };
  });

  unranked.sort((a, b) => {
    if (b.composite !== a.composite) return b.composite - a.composite;
    if (b.winRate !== a.winRate) return b.winRate - a.winRate;
    if (b.metrics.tightness !== a.metrics.tightness) return b.metrics.tightness - a.metrics.tightness;
    return compareAscii(a.id, b.id);
  });

  const rankings = unranked.map((item, idx) => ({ ...item, rank: idx + 1 }));

  const axes: RadarAxisSummary[] = AXIS_SPEC.map((axis) => {
    let sum = 0;
    let min = 100;
    let max = 0;
    let leader = rankings[0];
    for (const item of rankings) {
      const score = item.metrics[axis.key];
      sum += score;
      if (score < min) min = score;
      if (score > max || (score === max && compareAscii(item.id, leader.id) < 0)) {
        max = score;
        leader = item;
      }
    }
    return {
      key: axis.key,
      label: axis.label,
      weight: axis.weight,
      mean: round2(sum / Math.max(1, rankings.length)),
      min: round2(min),
      max: round2(max),
      leaderId: leader.id,
      leaderScore: round2(leader.metrics[axis.key]),
    };
  });

  const totalEntries = rankings.length;
  const underLimitCount = rankings.filter((item) => item.underLimit && item.singleLine).length;
  const avgChars = round2(rankings.reduce((sum, item) => sum + item.chars, 0) / Math.max(1, totalEntries));
  const avgComposite = round2(rankings.reduce((sum, item) => sum + item.composite, 0) / Math.max(1, totalEntries));
  const topComposite = rankings[0].composite;
  const bottomComposite = rankings[rankings.length - 1].composite;

  return {
    bountyId: snapshot.bountyId,
    title: snapshot.title,
    round: snapshot.round,
    generatedAt: snapshot.generatedAt,
    maxChars: MAX_JOKE_CHARS,
    axes,
    rankings,
    champion: rankings[0],
    duels,
    summary: {
      totalEntries,
      underLimitCount,
      avgChars,
      avgComposite,
      topComposite,
      spread: round2(topComposite - bottomComposite),
    },
  };
}

export function boardIssue(
  input?: RadarModel | SnapshotData | unknown,
  options: BoardIssueOptions = {},
): BoardIssue {
  const radar = isRadarModel(input) ? input : buildRadar(input);
  const issueNumber = Math.max(1, Math.round(options.issueNumber ?? radar.round));
  const edition = options.edition ?? `Issue #${String(issueNumber).padStart(2, "0")}`;
  const alerts: BoardAlert[] = [];
  const seenTexts = new Map<string, string>();

  for (const item of radar.rankings) {
    if (!item.underLimit) {
      alerts.push({
        level: "error",
        code: "OVER_CHAR_LIMIT",
        entryId: item.id,
        message: `${item.id} is ${item.chars} chars (must stay under ${radar.maxChars}).`,
      });
    }
    if (!item.singleLine) {
      alerts.push({
        level: "error",
        code: "MULTILINE_JOKE",
        entryId: item.id,
        message: `${item.id} contains a line break; entries must be one line.`,
      });
    }
    const normalized = item.joke.toLowerCase().replace(/\s+/g, " ").trim();
    const prior = seenTexts.get(normalized);
    if (prior) {
      alerts.push({
        level: "warn",
        code: "DUPLICATE_JOKE",
        entryId: item.id,
        message: `${item.id} duplicates text from ${prior}.`,
      });
    } else {
      seenTexts.set(normalized, item.id);
    }
  }

  if (radar.rankings.length >= 2) {
    const gap = round2(radar.rankings[0].composite - radar.rankings[1].composite);
    if (gap < 1.5) {
      alerts.push({
        level: "info",
        code: "CLOSE_RACE",
        entryId: radar.rankings[0].id,
        message: `Top two entries (${radar.rankings[0].id} vs ${radar.rankings[1].id}) are separated by ${gap} pts.`,
      });
    }
  }

  const champion = radar.champion;
  const headline = `${edition}: ${champion.id} leads with ${champion.composite}/100 (${champion.chars} chars)`;
  const highlights = [
    `Champion line: "${champion.joke}"`,
    `Pairwise record: ${champion.pairwiseWins}W-${champion.pairwiseLosses}L (${champion.winRate}% win rate).`,
    `Field compliance: ${radar.summary.underLimitCount}/${radar.summary.totalEntries} valid single-line entries under ${radar.maxChars} chars.`,
    `Strongest radar axis across field: ${[...radar.axes].sort((a, b) => b.mean - a.mean)[0].label}.`,
  ];

  const mdLines = [
    `# ${radar.title} — ${edition}`,
    "",
    `> ${champion.joke}`,
    "",
    `| Rank | Entry | Score | Win% | Chars | Truth | Turn | Tight | Fresh |`,
    `| ---: | :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |`,
    ...radar.rankings.map(
      (r) =>
        `| ${r.rank} | ${r.id} (${r.author}) | ${r.composite} | ${r.winRate}% | ${r.chars} | ${r.metrics.truth} | ${r.metrics.turn} | ${r.metrics.tightness} | ${r.metrics.freshness} |`,
    ),
  ];

  const plainLines = [
    `${radar.title} (${edition})`,
    `Champion: ${champion.joke}`,
    ...radar.rankings.map(
      (r) => `#${r.rank} ${r.id} [${r.composite} pts, ${r.chars} chars] ${r.joke}`,
    ),
  ];

  return {
    issueNumber,
    edition,
    bountyId: radar.bountyId,
    title: radar.title,
    generatedAt: radar.generatedAt,
    headline,
    champion,
    rankings: radar.rankings,
    axes: radar.axes,
    alerts,
    highlights,
    valid: alerts.every((alert) => alert.level !== "error"),
    markdown: mdLines.join("\n") + "\n",
    plainText: plainLines.join("\n") + "\n",
  };
}

function escapeScriptJson(value: unknown): string {
  return JSON.stringify(value, null, 2)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function dataScript(
  primary: RadarModel | BoardIssue | SnapshotData | unknown,
  secondary?: string | DataScriptOptions | BoardIssue,
): string {
  let globalName = "__OFFICE_JOKE_RADAR__";
  let wrapTag = false;
  let payload: unknown;

  if (typeof secondary === "string" && secondary.trim().length > 0) {
    globalName = secondary.trim();
    payload = primary;
  } else if (isRecord(secondary) && ("globalName" in secondary || "wrapTag" in secondary)) {
    const opts = secondary as DataScriptOptions;
    if (typeof opts.globalName === "string" && opts.globalName.trim().length > 0) {
      globalName = opts.globalName.trim();
    }
    wrapTag = opts.wrapTag === true;
    payload = primary;
  } else if (secondary !== undefined) {
    const radar = isRadarModel(primary) ? primary : buildRadar(primary);
    payload = { radar, issue: secondary };
  } else if (isRadarModel(primary)) {
    payload = { radar: primary, issue: boardIssue(primary) };
  } else {
    payload = primary;
  }

  const serialized = escapeScriptJson(payload);
  const body = `globalThis[${JSON.stringify(globalName)}] = ${serialized};\n`;
  return wrapTag ? `<script>\n${body}</script>\n` : body;
}