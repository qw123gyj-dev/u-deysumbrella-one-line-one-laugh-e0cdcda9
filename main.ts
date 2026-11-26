// One Line, One Laugh
// ======================
// A deterministic picker that holds 14 candidate one-liners and scores each
// one against five fixed criteria to crown the single funniest line.
//
// Design notes
// ------------
// * No network, no randomness, no clock. The same input always produces the
//   same winner, so the result is reproducible on any machine.
// * Every candidate is scored on five criteria, each 0-10:
//     1. economy      - setup/punch economy: how little setup the punch needs
//     2. surprise     - how sharp the twist is
//     3. wordplay     - pun density and double-meaning payoff
//     4. relatability - how many listeners nod before they laugh
//     5. memorability - how quotable the line is after one hearing
// * The weights are fixed constants. Changing a weight changes the winner,
//   so the weights are printed alongside the winner for transparency.
// * Tie-breaks are deterministic: higher total wins; on a tie the earlier
//   candidate in the list wins; a final alphabetical tie-break exists so the
//   ordering is total even if two lines ever score identically.
//
// Usage
// -----
//   node main.ts            print the winning line + score breakdown
//   node main.ts --all      print every candidate, ranked
//   node main.ts --json     print the full ranking as JSON
//   node main.ts --help     print usage

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The five scoring criteria, in display order. */
type Criterion = "economy" | "surprise" | "wordplay" | "relatability" | "memorability";

/** A candidate one-liner. */
interface Joke {
  /** Stable short id, e.g. "j01". */
  id: string;
  /** The one line itself. */
  line: string;
  /** Short human-readable topic tag. */
  topic: string;
  /** Per-criterion scores, each an integer 0-10, hand-assigned by the author. */
  scores: Record<Criterion, number>;
}

/** A scored joke with its computed total and rank metadata. */
interface ScoredJoke {
  joke: Joke;
  /** Weighted total, rounded to two decimals. */
  total: number;
  /** Per-criterion weighted contributions, same order as CRITERIA. */
  contributions: Record<Criterion, number>;
  /** 1-based rank after sorting (ties share the better rank). */
  rank: number;
}

// ---------------------------------------------------------------------------
// Configuration: criteria, weights, thresholds
// ---------------------------------------------------------------------------

/** The criteria in the order they are displayed and weighted. */
const CRITERIA: Criterion[] = [
  "economy",
  "surprise",
  "wordplay",
  "relatability",
  "memorability",
];

/** Human-readable label for each criterion. */
const CRITERION_LABELS: Record<Criterion, string> = {
  economy: "Setup/punch economy",
  surprise: "Surprise",
  wordplay: "Wordplay",
  relatability: "Relatability",
  memorability: "Memorability",
};

/**
 * Fixed weights. They sum to 1.00, so a perfect joke scores 10.00.
 * Surprise and wordplay carry the most weight: a one-liner lives or dies
 * on the twist and on the language trick that delivers it.
 */
const WEIGHTS: Record<Criterion, number> = {
  economy: 0.15,
  surprise: 0.30,
  wordplay: 0.25,
  relatability: 0.15,
  memorability: 0.15,
};

/** Sanity check at load time: the weights must sum to exactly 1. */
function assertWeightsSumToOne(): void {
  const sum = CRITERIA.reduce((acc, c) => acc + WEIGHTS[c], 0);
  if (Math.abs(sum - 1) > 1e-9) {
    throw new Error(`Weights must sum to 1, got ${sum}`);
  }
}

assertWeightsSumToOne();

/** Minimum total a joke needs before it can be crowned winner. */
const WINNER_THRESHOLD = 6.0;

/** Number of characters that counts as "short" for the economy bonus. */
const SHORT_LINE_CHARS = 60;

// ---------------------------------------------------------------------------
// The 14 candidates
// ---------------------------------------------------------------------------
//
// Scoring rubric (each criterion 0-10, hand-assigned):
//   economy:      10 = punch lands in the last three words, no wasted setup.
//                  0 = needs a paragraph of context before the joke works.
//   surprise:     10 = the twist reframes the whole sentence.
//                  0 = the ending is exactly what you expected.
//   wordplay:     10 = a pun or double meaning does real work, not decoration.
//                  0 = no language trick at all.
//   relatability: 10 = almost everyone has lived this exact moment.
//                  0 = only a niche audience gets it.
//   memorability: 10 = you can repeat it verbatim tomorrow.
//                  0 = you forget it before the laugh ends.
//
// Every score below was assigned by reading the line aloud and judging it
// against that rubric, not by any automated metric.

const JOKES: Joke[] = [
  {
    id: "j01",
    topic: "meetings",
    line: "I told my boss I needed a raise because of inflation, so he inflated my workload instead.",
    scores: { economy: 7, surprise: 7, wordplay: 8, relatability: 9, memorability: 7 },
  },
  {
    id: "j02",
    topic: "sleep",
    line: "My bed is a magical place where I suddenly remember everything I forgot to do all day.",
    scores: { economy: 7, surprise: 6, wordplay: 6, relatability: 10, memorability: 8 },
  },
  {
    id: "j03",
    topic: "passwords",
    line: "My password is so strong even I can't log in, which is technically perfect security.",
    scores: { economy: 8, surprise: 6, wordplay: 6, relatability: 9, memorability: 7 },
  },
  {
    id: "j04",
    topic: "gym",
    line: "I joined a gym and immediately felt healthier — mostly because I was too broke to eat after paying for it.",
    scores: { economy: 6, surprise: 7, wordplay: 5, relatability: 8, memorability: 7 },
  },
  {
    id: "j05",
    topic: "wifi",
    line: "The Wi-Fi went down for five minutes, so I had to talk to my family. They seem nice.",
    scores: { economy: 9, surprise: 8, wordplay: 5, relatability: 9, memorability: 9 },
  },
  {
    id: "j06",
    topic: "cooking",
    line: "I cook with wine. Sometimes I even add it to the food.",
    scores: { economy: 10, surprise: 8, wordplay: 7, relatability: 7, memorability: 9 },
  },
  {
    id: "j07",
    topic: "meetings",
    line: "This meeting could have been an email, but then we'd have to read it.",
    scores: { economy: 10, surprise: 7, wordplay: 6, relatability: 10, memorability: 8 },
  },
  {
    id: "j08",
    topic: "alarm",
    line: "I set my alarm for 6 a.m. and my snooze button for 6:01, 6:02, and 6:03, just to be fair.",
    scores: { economy: 7, surprise: 6, wordplay: 5, relatability: 9, memorability: 7 },
  },
  {
    id: "j09",
    topic: "plants",
    line: "I bought a plant to prove I could keep something alive. It filed for divorce.",
    scores: { economy: 8, surprise: 9, wordplay: 6, relatability: 7, memorability: 8 },
  },
  {
    id: "j10",
    topic: "budget",
    line: "My bank account and I have an agreement: it stays empty so I never have to decide what to spend.",
    scores: { economy: 6, surprise: 7, wordplay: 5, relatability: 9, memorability: 6 },
  },
  {
    id: "j11",
    topic: "time",
    line: "I put the 'pro' in procrastination by doing absolutely nothing, professionally.",
    scores: { economy: 9, surprise: 8, wordplay: 9, relatability: 9, memorability: 9 },
  },
  {
    id: "j12",
    topic: "phone",
    line: "My phone battery lasts all day, as long as I never use my phone.",
    scores: { economy: 10, surprise: 7, wordplay: 5, relatability: 9, memorability: 8 },
  },
  {
    id: "j13",
    topic: "laundry",
    line: "I don't fold my laundry. I just put it in a pile called 'the chair' and let it age like fine wine.",
    scores: { economy: 6, surprise: 7, wordplay: 6, relatability: 10, memorability: 8 },
  },
  {
    id: "j14",
    topic: "dating",
    line: "My dating profile says I like long walks, which is true — mostly to the fridge and back.",
    scores: { economy: 7, surprise: 8, wordplay: 6, relatability: 9, memorability: 8 },
  },
];

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** Every score must be an integer in 0..10, and ids must be unique. */
function validateJokes(jokes: Joke[]): void {
  const seen = new Set<string>();
  for (const joke of jokes) {
    if (seen.has(joke.id)) {
      throw new Error(`Duplicate joke id: ${joke.id}`);
    }
    seen.add(joke.id);
    if (!joke.line.trim()) {
      throw new Error(`Joke ${joke.id} has an empty line`);
    }
    for (const criterion of CRITERIA) {
      const value = joke.scores[criterion];
      if (!Number.isInteger(value) || value < 0 || value > 10) {
        throw new Error(
          `Joke ${joke.id} has invalid ${criterion} score: ${value}`
        );
      }
    }
  }
}

validateJokes(JOKES);

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

/** Round a number to two decimal places. */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * The short-line bonus: +0.10 for a line under SHORT_LINE_CHARS characters.
 * Brevity is the soul of a one-liner, but the bonus is deliberately tiny —
 * it can break a near-tie, never rescue a weak joke.
 */
function shortLineBonus(line: string): number {
  return line.length < SHORT_LINE_CHARS ? 0.1 : 0;
}

/**
 * Score one joke: weighted sum of its five criterion scores, plus the
 * short-line bonus, capped so the final total never exceeds 10.00.
 */
function scoreJoke(joke: Joke): ScoredJoke {
  const contributions: Record<Criterion, number> = {
    economy: 0,
    surprise: 0,
    wordplay: 0,
    relatability: 0,
    memorability: 0,
  };
  let total = 0;
  for (const criterion of CRITERIA) {
    const contribution = round2(joke.scores[criterion] * WEIGHTS[criterion]);
    contributions[criterion] = contribution;
    total += contribution;
  }
  const shortBonus = shortLineBonus(joke.line);
  total = Math.min(10, round2(total + shortBonus));
  return { joke, total, contributions, rank: 0 };
}

/**
 * Compare two scored jokes for ranking.
 * Higher total first; on a tie, the earlier candidate in JOKES wins;
 * on a further tie (impossible with distinct ids, but total for safety),
 * the lexicographically smaller id wins.
 */
function compareScored(a: ScoredJoke, b: ScoredJoke): number {
  if (b.total !== a.total) return b.total - a.total;
  const indexA = JOKES.findIndex((j) => j.id === a.joke.id);
  const indexB = JOKES.findIndex((j) => j.id === b.joke.id);
  if (indexA !== indexB) return indexA - indexB;
  return a.joke.id < b.joke.id ? -1 : 1;
}

/** Score every joke and return the list ranked best-first with ranks set. */
function rankJokes(jokes: Joke[]): ScoredJoke[] {
  const scored = jokes.map(scoreJoke);
  scored.sort(compareScored);
  // Assign ranks: equal totals share the better (lower) rank number.
  for (let i = 0; i < scored.length; i++) {
    if (i > 0 && scored[i].total === scored[i - 1].total) {
      scored[i].rank = scored[i - 1].rank;
    } else {
      scored[i].rank = i + 1;
    }
  }
  return scored;
}

/** Pick the winner: the top-ranked joke, if it clears the threshold. */
function pickWinner(ranked: ScoredJoke[]): ScoredJoke {
  const winner = ranked[0];
  if (!winner) {
    throw new Error("No candidates to pick from");
  }
  if (winner.total < WINNER_THRESHOLD) {
    throw new Error(
      `Winner total ${winner.total} is below the threshold ${WINNER_THRESHOLD}`
    );
  }
  return winner;
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

/** Pad a string on the right to a fixed width (for table columns). */
function padRight(text: string, width: number): string {
  if (text.length >= width) return text;
  return text + " ".repeat(width - text.length);
}

/** Format a score as a fixed-width "x.xx" string. */
function fmt(value: number): string {
  return value.toFixed(2);
}

/** One row of the score breakdown table. */
function breakdownRow(scored: ScoredJoke): string {
  const lines: string[] = [];
  for (const criterion of CRITERIA) {
    const raw = scored.joke.scores[criterion];
    const weight = WEIGHTS[criterion];
    const contribution = scored.contributions[criterion];
    lines.push(
      `  ${padRight(CRITERION_LABELS[criterion], 22)} ` +
        `${raw}/10  x ${weight.toFixed(2)}  = ${fmt(contribution)}`
    );
  }
  return lines.join("\n");
}

/** Print the winner, its breakdown, and a one-line summary of the field. */
function printWinner(ranked: ScoredJoke[]): void {
  const winner = pickWinner(ranked);
  console.log("ONE LINE, ONE LAUGH");
  console.log("===================");
  console.log("");
  console.log(`Winner: ${winner.joke.id} (${winner.joke.topic})`);
  console.log("");
  console.log(`  "${winner.joke.line}"`);
  console.log("");
  console.log("Score breakdown:");
  console.log(breakdownRow(winner));
  console.log(`  ${padRight("TOTAL", 22)} ${fmt(winner.total)}/10`);
  console.log("");
  console.log(
    `Picked from ${ranked.length} candidates. Runner-up: ` +
      `"${ranked[1].joke.line}" (${fmt(ranked[1].total)})`
  );
}

/** Print the top N candidates ranked best-first, with totals. */
function printTop(ranked: ScoredJoke[], n: number): void {
  printAll(ranked.slice(0, n));
}
function printAll(ranked: ScoredJoke[]): void {
  console.log("ONE LINE, ONE LAUGH — FULL RANKING");
  console.log("===================================");
  console.log("");
  for (const scored of ranked) {
    const marker = scored.rank === 1 ? " <-- WINNER" : "";
    console.log(
      `#${scored.rank}  ${fmt(scored.total)}  [${scored.joke.id}] ${scored.joke.line}${marker}`
    );
  }
  console.log("");
  console.log(
    `Weights: economy ${WEIGHTS.economy}, surprise ${WEIGHTS.surprise}, ` +
      `wordplay ${WEIGHTS.wordplay}, relatability ${WEIGHTS.relatability}, ` +
      `memorability ${WEIGHTS.memorability}.`
  );
}

/** Print the full ranking as JSON (deterministic key order). */
function printJson(ranked: ScoredJoke[]): void {
  const winner = pickWinner(ranked);
  const payload = {
    winner: {
      id: winner.joke.id,
      topic: winner.joke.topic,
      line: winner.joke.line,
      total: winner.total,
      scores: winner.joke.scores,
      contributions: winner.contributions,
    },
    weights: WEIGHTS,
    ranking: ranked.map((s) => ({
      rank: s.rank,
      id: s.joke.id,
      topic: s.joke.topic,
      line: s.joke.line,
      total: s.total,
    })),
  };
  console.log(JSON.stringify(payload, null, 2));
}

/** Print usage and exit with code 0. */
function printHelp(): void {
  console.log("Usage: node main.ts [options]");
  console.log("");
  console.log("Options:");
  console.log("  (no args)   Print the winning one-liner and its score breakdown");
  console.log("  --all       Print all 14 candidates, ranked best-first");
  console.log("  --top N     Print the top N candidates, ranked best-first");
  console.log("  --json      Print the full ranking as JSON");
  console.log("  --help      Print this help");
  console.log("");
  console.log("Deterministic: no network, no randomness, no clock.");
  console.log("The same run always picks the same winner.");
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

function main(argv: string[]): number {
  const flags = new Set(argv);
  if (flags.has("--help") || flags.has("-h")) {
    printHelp();
    return 0;
  }
  const ranked = rankJokes(JOKES);
  if (flags.has("--json")) {
    printJson(ranked);
    return 0;
  }
  if (flags.has("--all")) {
    printAll(ranked);
    return 0;
  }
  const topIndex = argv.indexOf("--top");
  if (topIndex !== -1) {
    const n = Number(argv[topIndex + 1]);
    if (!Number.isInteger(n) || n < 1 || n > ranked.length) {
      console.error(`--top needs a number between 1 and ${ranked.length}`);
      return 2;
    }
    printTop(ranked, n);
    return 0;
  }
  const unknown = argv.filter((a) => !a.startsWith("--") && a !== "");
  if (unknown.length > 0) {
    console.error(`Unknown argument(s): ${unknown.join(", ")}`);
    console.error("Run with --help for usage.");
    return 2;
  }
  printWinner(ranked);
  return 0;
}

process.exit(main(process.argv.slice(2)));
