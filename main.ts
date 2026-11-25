import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

interface ValidationChecks {
  singleLine: boolean;
  underCharLimit: boolean;
  nonEmpty: boolean;
  charCount: number;
  wordCount: number;
  maxChars: number;
  passed: boolean;
}

interface RubricCriterion {
  id: string;
  label: string;
  weight: number;
  mechanism: string;
}

interface BoardPayload {
  schema: string;
  bounty: string;
  category: string;
  title: string;
  entry: string;
  validation: ValidationChecks;
  artifacts: string[];
}

interface DossierPayload {
  schema: string;
  entry: string;
  anatomy: {
    setup: string;
    pivot: string;
    punchline: string;
  };
  criteria: RubricCriterion[];
  validation: ValidationChecks;
}

const BOUNTY_ID = "u-rama-melon-make-the-ai-judge-laugh-302d0825";
const CATEGORY = "Growth";
const ENTRY_TITLE = "Radical Transparency on Zoom";
const MAX_CHARS = 200;
const MAX_TITLE_CHARS = 200;

const JOKE =
  "My VP spent twenty minutes on Zoom preaching 'radical transparency' behind a background blur thick enough for witness protection.";

const ARTIFACT_PATHS = [
  "entry.txt",
  "joke.txt",
  "board.json",
  "dossier.json",
  "data.js",
  "index.html",
  "screenshots/dashboard.svg",
] as const;

type ArtifactPath = (typeof ARTIFACT_PATHS)[number];

function validateJoke(text: string): ValidationChecks {
  const hasLineBreak = /[\r\n\u2028\u2029]/.test(text);
  const hasControlChars = /[\u0000-\u001f\u007f]/.test(text);
  const singleLine = !hasLineBreak && !hasControlChars;
  const trimmed = text.trim();
  const nonEmpty = trimmed.length > 0 && trimmed === text;
  const charCount = text.length;
  const underCharLimit = charCount > 0 && charCount < MAX_CHARS;
  const wordCount = trimmed.length > 0 ? trimmed.split(/\s+/).length : 0;

  return {
    singleLine,
    underCharLimit,
    nonEmpty,
    charCount,
    wordCount,
    maxChars: MAX_CHARS,
    passed: singleLine && underCharLimit && nonEmpty,
  };
}

function validateTitle(title: string): void {
  const trimmed = title.trim();
  if (trimmed.length === 0 || trimmed !== title || title.length > MAX_TITLE_CHARS) {
    throw new Error(`Invalid entry title length: ${title.length}`);
  }
  if (/[\r\n\u2028\u2029\u0000-\u001f\u007f]/.test(title)) {
    throw new Error("Entry title must be a single line without control characters");
  }
  if (/<[a-z/!][^>]*>/i.test(title)) {
    throw new Error("Entry title must not contain HTML markup");
  }
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function serializeForJs(value: unknown): string {
  return JSON.stringify(value, null, 2)
    .replaceAll("<", "\\u003c")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}

function wrapLines(text: string, maxWidth: number): string[] {
  if (!Number.isInteger(maxWidth) || maxWidth <= 0) {
    throw new RangeError(`maxWidth must be a positive integer, received ${maxWidth}`);
  }

  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (word.length > maxWidth) {
      if (current) {
        lines.push(current);
        current = "";
      }
      for (let i = 0; i < word.length; i += maxWidth) {
        lines.push(word.slice(i, i + maxWidth));
      }
      continue;
    }

    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines;
}

function buildDossier(validation: ValidationChecks): DossierPayload {
  const anatomy = {
    setup: "My VP spent twenty minutes on Zoom preaching 'radical transparency'",
    pivot: "behind a background blur",
    punchline: "thick enough for witness protection.",
  };

  const reconstructed = `${anatomy.setup} ${anatomy.pivot} ${anatomy.punchline}`;
  if (reconstructed !== JOKE) {
    throw new Error("Dossier anatomy does not match the entry text");
  }

  const criteria: RubricCriterion[] = [
    {
      id: "office_truth",
      label: "True to Office Life",
      weight: 0.25,
      mechanism:
        "Captures executive buzzword monologues on video calls paired with aggressive virtual background blurring.",
    },
    {
      id: "surprising_turn",
      label: "Surprising Turn",
      weight: 0.25,
      mechanism:
        "Reframes corporate 'transparency' literally through video blur and escalates abruptly into witness protection.",
    },
    {
      id: "tightness",
      label: "Line Tightness",
      weight: 0.25,
      mechanism: `Single-clause sentence at ${validation.charCount} characters with zero filler and the punch word landing on the final phrase.`,
    },
    {
      id: "freshness",
      label: "Freshness",
      weight: 0.25,
      mechanism:
        "Avoids overused meeting-could-be-an-email and printer clichés in favor of a sharp visual hypocrisy joke.",
    },
  ];

  const totalWeight = criteria.reduce((sum, item) => sum + item.weight, 0);
  if (Math.abs(totalWeight - 1) > 1e-9) {
    throw new Error(`Rubric weights must sum to 1.0, received ${totalWeight}`);
  }

  return {
    schema: "office-humor-dossier/v1",
    entry: JOKE,
    anatomy,
    criteria,
    validation,
  };
}

function buildBoard(validation: ValidationChecks): BoardPayload {
  return {
    schema: "office-humor-board/v1",
    bounty: BOUNTY_ID,
    category: CATEGORY,
    title: ENTRY_TITLE,
    entry: JOKE,
    validation,
    artifacts: [...ARTIFACT_PATHS],
  };
}

function renderDashboardSvg(board: BoardPayload): string {
  const lines = wrapLines(board.entry, 46);
  const lineHeight = lines.length > 4 ? 38 : 46;
  const startY = lines.length > 4 ? 236 : 262;
  const jokeTspans = lines
    .map(
      (line, idx) =>
        `<tspan x="88" y="${startY + idx * lineHeight}">${escapeXml(line)}</tspan>`
    )
    .join("");

  const passed = board.validation.passed;
  const statusText = passed ? "ALL CHECKS PASSED" : "CHECK FAILED";
  const pillFill = passed ? "#064e3b" : "#7f1d1d";
  const pillStroke = passed ? "#10b981" : "#ef4444";
  const pillText = passed ? "#6ee7b7" : "#fca5a5";
  const lineLabel = board.validation.singleLine ? "1 line" : "multi-line";
  const metrics = `${board.validation.charCount}/${board.validation.maxChars} chars | ${board.validation.wordCount} words | ${lineLabel}`;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="${escapeXml(board.title)}">`,
    `  <defs>`,
    `    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">`,
    `      <stop offset="0%" stop-color="#0f172a"/>`,
    `      <stop offset="100%" stop-color="#1e293b"/>`,
    `    </linearGradient>`,
    `    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">`,
    `      <stop offset="0%" stop-color="#38bdf8"/>`,
    `      <stop offset="100%" stop-color="#a78bfa"/>`,
    `    </linearGradient>`,
    `  </defs>`,
    `  <rect width="1200" height="630" fill="url(#bg)"/>`,
    `  <rect x="48" y="48" width="1104" height="534" rx="24" fill="#111827" stroke="#334155" stroke-width="2"/>`,
    `  <rect x="48" y="48" width="1104" height="8" rx="4" fill="url(#accent)"/>`,
    `  <text x="88" y="116" fill="#38bdf8" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="18" letter-spacing="2">MAKE THE AI JUDGE LAUGH // OFFICE LIFE ONE-LINER</text>`,
    `  <text x="88" y="166" fill="#f8fafc" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="34" font-weight="700">${escapeXml(board.title)}</text>`,
    `  <text fill="#e2e8f0" font-family="Georgia, Cambria, serif" font-size="34" font-style="italic">${jokeTspans}</text>`,
    `  <rect x="88" y="458" width="236" height="40" rx="20" fill="${pillFill}" stroke="${pillStroke}" stroke-width="1.5"/>`,
    `  <text x="206" y="484" text-anchor="middle" fill="${pillText}" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="15" font-weight="700">${statusText}</text>`,
    `  <text x="348" y="484" fill="#94a3b8" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="17">${escapeXml(metrics)}</text>`,
    `  <text x="88" y="544" fill="#64748b" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="14">Bounty: ${escapeXml(board.bounty)}</text>`,
    `</svg>`,
    "",
  ].join("\n");
}

function renderDashboardHtml(board: BoardPayload, dossier: DossierPayload): string {
  const criteriaCards = dossier.criteria
    .map(
      (item) =>
        `      <article class="card"><h3>${escapeXml(item.label)}</h3><p>${escapeXml(item.mechanism)}</p></article>`
    )
    .join("\n");

  const pillClass = board.validation.passed ? "pill pill-pass" : "pill pill-fail";
  const lineValue = board.validation.singleLine ? "1" : "multi-line";

  return [
    `<!doctype html>`,
    `<html lang="en">`,
    `<head>`,
    `  <meta charset="utf-8" />`,
    `  <meta name="viewport" content="width=device-width, initial-scale=1" />`,
    `  <title>${escapeXml(board.title)}</title>`,
    `  <style>`,
    `    :root { color-scheme: dark; font-family: system-ui, -apple-system, Segoe UI, sans-serif; }`,
    `    body { margin: 0; background: #0f172a; color: #e2e8f0; padding: 32px 20px; }`,
    `    main { max-width: 920px; margin: 0 auto; }`,
    `    .hero { background: #111827; border: 1px solid #334155; border-radius: 18px; padding: 28px; }`,
    `    .eyebrow { color: #38bdf8; font: 600 12px/1.4 ui-monospace, monospace; letter-spacing: .12em; text-transform: uppercase; }`,
    `    h1 { margin: 10px 0 18px; font-size: 28px; color: #f8fafc; }`,
    `    blockquote { margin: 0 0 20px; padding: 20px; border-left: 4px solid #38bdf8; background: #1e293b; border-radius: 10px; font: italic 24px/1.45 Georgia, serif; color: #f8fafc; }`,
    `    .meta { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; font: 13px/1.4 ui-monospace, monospace; color: #94a3b8; }`,
    `    .pill { padding: 6px 12px; border-radius: 999px; }`,
    `    .pill-pass { background: #064e3b; color: #6ee7b7; border: 1px solid #10b981; }`,
    `    .pill-fail { background: #7f1d1d; color: #fca5a5; border: 1px solid #ef4444; }`,
    `    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-top: 22px; }`,
    `    .card { background: #111827; border: 1px solid #334155; border-radius: 14px; padding: 18px; }`,
    `    .card h3 { margin: 0 0 8px; font-size: 16px; color: #38bdf8; }`,
    `    .card p { margin: 0; font-size: 14px; line-height: 1.5; color: #cbd5e1; }`,
    `    figure { margin: 24px 0 0; background: #111827; border: 1px solid #334155; border-radius: 14px; padding: 14px; }`,
    `    figure img { width: 100%; height: auto; display: block; border-radius: 10px; }`,
    `  </style>`,
    `</head>`,
    `<body>`,
    `  <main>`,
    `    <section class="hero">`,
    `      <div class="eyebrow">Make the AI Judge Laugh // Office Life Entry</div>`,
    `      <h1>${escapeXml(board.title)}</h1>`,
    `      <blockquote id="joke-text">${escapeXml(board.entry)}</blockquote>`,
    `      <div class="meta">`,
    `        <span class="${pillClass}">Validated: ${board.validation.passed ? "PASS" : "FAIL"}</span>`,
    `        <span>Characters: ${board.validation.charCount}/${board.validation.maxChars}</span>`,
    `        <span>Words: ${board.validation.wordCount}</span>`,
    `        <span>Lines: ${lineValue}</span>`,
    `      </div>`,
    `    </section>`,
    `    <section class="grid" aria-label="Rubric Breakdown">`,
    criteriaCards,
    `    </section>`,
    `    <figure>`,
    `      <img src="screenshots/dashboard.svg" alt="${escapeXml(board.title)} visual preview" />`,
    `    </figure>`,
    `  </main>`,
    `  <script src="data.js"></script>`,
    `</body>`,
    `</html>`,
    "",
  ].join("\n");
}

function resolveOutputDir(): string {
  const configured = process.env.MAKEFUN_OUTPUT_DIR?.trim();
  const outDir = resolve(
    configured && configured.length > 0 ? configured : join(process.cwd(), "out")
  );
  const existing = statSync(outDir, { throwIfNoEntry: false });
  if (existing && !existing.isDirectory()) {
    throw new Error(`Output path exists and is not a directory: ${outDir}`);
  }
  return outDir;
}

function writeArtifact(outDir: string, relativePath: ArtifactPath, content: string): void {
  const targetPath = join(outDir, relativePath);
  mkdirSync(dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, content, "utf8");
}

function main(): void {
  validateTitle(ENTRY_TITLE);

  const validation = validateJoke(JOKE);
  if (!validation.passed) {
    throw new Error(
      `Entry failed validation: chars=${validation.charCount}/${validation.maxChars}, singleLine=${validation.singleLine}, nonEmpty=${validation.nonEmpty}`
    );
  }

  const outDir = resolveOutputDir();
  const board = buildBoard(validation);
  const dossier = buildDossier(validation);
  const dataBundle = { board, dossier };

  const artifacts: Record<ArtifactPath, string> = {
    "entry.txt": `${JOKE}\n`,
    "joke.txt": `${JOKE}\n`,
    "board.json": `${JSON.stringify(board, null, 2)}\n`,
    "dossier.json": `${JSON.stringify(dossier, null, 2)}\n`,
    "data.js": `window.__MAKEFUN_DATA__ = ${serializeForJs(dataBundle)};\n`,
    "index.html": renderDashboardHtml(board, dossier),
    "screenshots/dashboard.svg": renderDashboardSvg(board),
  };

  for (const relativePath of ARTIFACT_PATHS) {
    writeArtifact(outDir, relativePath, artifacts[relativePath]);
  }

  process.stdout.write(`${JOKE}\n`);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Error: ${message}\n`);
  process.exitCode = 1;
}