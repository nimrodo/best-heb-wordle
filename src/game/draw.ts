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
