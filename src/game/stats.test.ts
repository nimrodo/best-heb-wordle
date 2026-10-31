import { describe, expect, test } from "vitest";
import { emptyStats, hardLine, recordLoss, recordWin, summarise, type Stats } from "./stats";

const play = (stats: Stats, results: (number | "L")[], hard = false): Stats =>
  results.reduce((s, r) => (r === "L" ? recordLoss(s, hard) : recordWin(s, r, hard)), stats);

describe("stats", () => {
  test("a fresh player has nothing played and no win rate", () => {
    expect(summarise(emptyStats())).toEqual({
      played: 0,
      winRate: 0,
      streak: 0,
      bestStreak: 0,
      distribution: [0, 0, 0, 0, 0, 0],
      losses: 0,
    });
  });

  test("distribution counts wins by Guesses used, and losses apart", () => {
    const s = summarise(play(emptyStats(), [3, 3, 1, 6, "L"]));
    expect(s.distribution).toEqual([1, 0, 2, 0, 0, 1]);
    expect(s.losses).toBe(1);
    expect(s.played).toBe(5);
  });

  test("win rate is a rounded percentage of played", () => {
    expect(summarise(play(emptyStats(), [2, "L", "L"])).winRate).toBe(33);
    expect(summarise(play(emptyStats(), [2, 2, "L"])).winRate).toBe(67);
  });

  test("Streak counts consecutive wins and a loss resets it", () => {
    const s = summarise(play(emptyStats(), [1, 2, 3, "L", 4]));
    expect(s.streak).toBe(1);
    expect(s.bestStreak).toBe(3);
  });

  test("best Streak survives a reset and grows when beaten", () => {
    expect(summarise(play(emptyStats(), [1, 1, "L"])).bestStreak).toBe(2);
    expect(summarise(play(emptyStats(), [1, 1, "L", 1, 1, 1])).bestStreak).toBe(3);
  });

  test("the Hard-word line is Hard word Puzzles won out of Hard word Puzzles played", () => {
    let s = play(emptyStats(), [3, "L"], true);
    s = play(s, [2, 4, "L"], false);
    expect(hardLine(s)).toBe("מילים קשות: 1 מתוך 2");
  });

  test("recording does not mutate the previous stats", () => {
    const before = emptyStats();
    recordWin(before, 2, true);
    expect(before).toEqual(emptyStats());
  });
});
