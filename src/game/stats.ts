import { MAX_GUESSES } from "./game";

// Everything else (played, win rate, losses) is derived, so the stored numbers cannot disagree.
export type Stats = {
  // Wins by Guesses used: index 0 is a win in one Guess.
  wins: number[];
  losses: number;
  streak: number;
  bestStreak: number;
  hardPlayed: number;
  hardWon: number;
};

export const emptyStats = (): Stats => ({
  wins: Array<number>(MAX_GUESSES).fill(0),
  losses: 0,
  streak: 0,
  bestStreak: 0,
  hardPlayed: 0,
  hardWon: 0,
});

export function recordWin(stats: Stats, guessesUsed: number, hard: boolean): Stats {
  const streak = stats.streak + 1;
  return {
    ...stats,
    wins: stats.wins.map((n, i) => (i === guessesUsed - 1 ? n + 1 : n)),
    streak,
    bestStreak: Math.max(stats.bestStreak, streak),
    hardPlayed: stats.hardPlayed + (hard ? 1 : 0),
    hardWon: stats.hardWon + (hard ? 1 : 0),
  };
}

// An abandoned Puzzle with Guesses is recorded the same way as a lost one.
export function recordLoss(stats: Stats, hard: boolean): Stats {
  return {
    ...stats,
    losses: stats.losses + 1,
    streak: 0,
    hardPlayed: stats.hardPlayed + (hard ? 1 : 0),
  };
}

export function summarise(stats: Stats) {
  const won = stats.wins.reduce((a, b) => a + b, 0);
  const played = won + stats.losses;
  return {
    played,
    winRate: played === 0 ? 0 : Math.round((won / played) * 100),
    streak: stats.streak,
    bestStreak: stats.bestStreak,
    distribution: stats.wins,
    losses: stats.losses,
  };
}

export const hardLine = (stats: Stats): string => `מילים קשות: ${stats.hardWon} מתוך ${stats.hardPlayed}`;

const isCount = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0;

export function isStats(v: any): v is Stats {
  return (
    Array.isArray(v?.wins) &&
    v.wins.length === MAX_GUESSES &&
    v.wins.every(isCount) &&
    [v.losses, v.streak, v.bestStreak, v.hardPlayed, v.hardWon].every(isCount)
  );
}
