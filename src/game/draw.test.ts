import { describe, expect, test } from "vitest";
import { HARD_SHARE, drawSolution, drawUnplayed, type SolutionEntry } from "./draw";

// mulberry32: a small seeded random source so the draw ratio is reproducible.
function seeded(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Far more Common words than Hard ones, so a uniform draw would give Hard words well under 1 in 5.
const pool: SolutionEntry[] = [
  ...Array.from({ length: 90 }, (_, i) => ({ word: `c${i}`, hard: false })),
  ...Array.from({ length: 10 }, (_, i) => ({ word: `h${i}`, hard: true })),
];

describe("drawSolution", () => {
  test("about 1 in 5 draws is a Hard word, not the pool's own share", () => {
    const random = seeded(42);
    const draws = 10_000;
    const hard = Array.from({ length: draws }, () => drawSolution(pool, random)).filter((s) => s.hard).length;
    expect(hard / draws).toBeCloseTo(HARD_SHARE, 1);
    expect(hard / draws).toBeGreaterThan(0.18);
    expect(hard / draws).toBeLessThan(0.22);
  });

  test("within a kind every word can come up", () => {
    const random = seeded(7);
    const seen = new Set(Array.from({ length: 2_000 }, () => drawSolution(pool, random).word));
    expect(seen.size).toBe(pool.length);
  });

  test("a pool without Hard words still draws", () => {
    const common = pool.filter((s) => !s.hard);
    expect(drawSolution(common, seeded(1)).hard).toBe(false);
  });

  test("a pool without Common words still draws", () => {
    const hard = pool.filter((s) => s.hard);
    expect(drawSolution(hard, seeded(1)).hard).toBe(true);
  });
});

describe("drawUnplayed", () => {
  const small: SolutionEntry[] = [
    { word: "a", hard: false },
    { word: "b", hard: false },
    { word: "c", hard: true },
  ];

  test("never repeats a played Solution until the pool is exhausted", () => {
    const random = seeded(3);
    let played: string[] = [];
    const seen: string[] = [];
    for (let i = 0; i < small.length; i++) {
      const drawn = drawUnplayed(small, played, random);
      seen.push(drawn.entry.word);
      played = drawn.played;
    }
    expect(new Set(seen).size).toBe(small.length);
  });

  test("once exhausted the played list clears and play continues", () => {
    const drawn = drawUnplayed(small, ["a", "b", "c"], seeded(1));
    expect(drawn.played).toEqual([drawn.entry.word]);
  });

  test("played words that left the pool do not block the draw", () => {
    const drawn = drawUnplayed(small, ["gone"], seeded(1));
    expect(drawn.played).toEqual(["gone", drawn.entry.word]);
  });
});
