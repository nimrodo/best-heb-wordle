import { MAX_GUESSES, WORD_LENGTH } from "./game";
import { emptyStats, isStats, type Stats } from "./stats";

// The version lives in the key too, so a future format change starts from a clean slate.
export const KEY = "hebwordle:v1";
const VERSION = 1;

export type SavedPuzzle = {
  solution: string;
  hard: boolean;
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

function isSavedPuzzle(v: any): v is SavedPuzzle {
  return (
    isFullWord(v?.solution) &&
    typeof v.hard === "boolean" &&
    Array.isArray(v.guesses) &&
    v.guesses.length <= MAX_GUESSES &&
    v.guesses.every(isFullWord) &&
    isWord(v.current)
  );
}

function isStore(v: any): v is Store {
  return (
    v?.version === VERSION &&
    Array.isArray(v.played) &&
    v.played.every((w: unknown) => typeof w === "string") &&
    (v.puzzle === null || isSavedPuzzle(v.puzzle)) &&
    isStats(v.stats) &&
    typeof v.seenHowToPlay === "boolean"
  );
}

// Anything unreadable (no storage, corrupt JSON, other version) quietly starts fresh.
export function loadStore(storage: Storage): Store {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(KEY) ?? "null");
    return isStore(parsed) ? parsed : emptyStore();
  } catch {
    return emptyStore();
  }
}

export function saveStore(storage: Storage, store: Store): void {
  try {
    storage.setItem(KEY, JSON.stringify(store));
  } catch {
    // Private mode or a full quota: the game still plays, it just won't be remembered.
  }
}
