import { MAX_GUESSES, WORD_LENGTH } from "./game";
import { emptyStats, isStats, type Stats } from "./stats";

// The version lives in the key too, so a future format change starts from a clean slate.
export const KEY = "hebwordle:v1";
const VERSION = 1;

export type SavedPuzzle = {
  solution: string;
  hard: boolean;
  // Absent in saves made before Sent Puzzles existed.
  sent?: boolean;
  guesses: string[];
  current: string;
};

export type Store = {
  version: typeof VERSION;
  // Solutions already drawn this cycle, including the one in progress.
  played: string[];
  puzzle: SavedPuzzle | null;
  stats: Stats;
  seenHowToPlay: boolean;
};

export const emptyStore = (): Store => ({
  version: VERSION,
  played: [],
  puzzle: null,
  stats: emptyStats(),
  seenHowToPlay: false,
});

const isWord = (v: unknown, max = WORD_LENGTH): v is string =>
  typeof v === "string" && v.length <= max && /^[א-ת]*$/.test(v);
const isFullWord = (v: unknown): v is string => isWord(v) && v.length === WORD_LENGTH;

function isSavedPuzzle(value: unknown): value is SavedPuzzle {
  const v = value as Partial<Record<keyof SavedPuzzle, unknown>> | null | undefined;
  return (
    isFullWord(v?.solution) &&
    typeof v.hard === "boolean" &&
    (v.sent === undefined || typeof v.sent === "boolean") &&
    Array.isArray(v.guesses) &&
    v.guesses.length <= MAX_GUESSES &&
    v.guesses.every(isFullWord) &&
    isWord(v.current)
  );
}

function isStore(value: unknown): value is Store {
  const v = value as Partial<Record<keyof Store, unknown>> | null | undefined;
  return (
    v?.version === VERSION &&
    Array.isArray(v.played) &&
    v.played.every((w: unknown) => typeof w === "string") &&
    (v.puzzle === null || isSavedPuzzle(v.puzzle)) &&
    isStats(v.stats) &&
    typeof v.seenHowToPlay === "boolean"
  );
}

function readStore(storage: Storage): Store | null {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(KEY) ?? "null");
    return isStore(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

// Anything unreadable (no storage, corrupt JSON, other version) quietly starts fresh.
export function loadStore(storage: Storage): Store {
  return readStore(storage) ?? emptyStore();
}

// Stats are shared by every open tab, so they are read and written back in one synchronous step
// (the smallest window for another tab to slip in), with this tab's result applied on top.
// `endResult` is that result; without one, the stored stats are kept as they are.
export function saveStore(storage: Storage, store: Store, endResult: (stats: Stats) => Stats = (s) => s): Store {
  const saved = { ...store, stats: endResult(readStore(storage)?.stats ?? store.stats) };
  try {
    storage.setItem(KEY, JSON.stringify(saved));
  } catch {
    // Private mode or a full quota: the game still plays, it just won't be remembered.
  }
  return saved;
}
