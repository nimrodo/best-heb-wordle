export type SolutionEntry = { word: string; hard: boolean };

// Hard words are a minority of the pool, so a uniform draw would show them too rarely;
// the kind is chosen first, then a word of that kind.
export const HARD_SHARE = 0.2;

const pick = <T>(items: readonly T[], random: () => number): T => items[Math.floor(random() * items.length)];

export function drawSolution(pool: readonly SolutionEntry[], random: () => number): SolutionEntry {
  const hard = pool.filter((s) => s.hard);
  const common = pool.filter((s) => !s.hard);
  const wantHard = random() < HARD_SHARE;
  const kind = hard.length === 0 ? common : common.length === 0 ? hard : wantHard ? hard : common;
  return pick(kind, random);
}

// Draws a Solution not yet played. Once every Solution in the pool has been played the
// played list clears, so play never stalls. Words that left the pool stay in the list
// until then; they cost nothing.
export function drawUnplayed(
  pool: readonly SolutionEntry[],
  played: readonly string[],
  random: () => number,
): { entry: SolutionEntry; played: string[] } {
  const seen = new Set(played);
  let unplayed = pool.filter((s) => !seen.has(s.word));
  let history = [...played];
  if (unplayed.length === 0) {
    unplayed = [...pool];
    history = [];
  }
  const entry = drawSolution(unplayed, random);
  return { entry, played: [...history, entry.word] };
}
