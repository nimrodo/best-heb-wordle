import { drawUnplayed, type SolutionEntry } from "./draw";
import { MAX_GUESSES, WORD_LENGTH } from "./game";
import { emptyStats, isStats, type Stats } from "./stats";

// The version lives in the key too, so a future format change starts from a clean slate.
export const KEY = "hebwordle:v1";
const VERSION = 1;

export type SavedPuzzle = {
  solution: string;
  hard: boolean;
  // Absent in saves made before results were tracked.
  id?: string;
  // Absent in saves made before Sent Puzzles existed.
  sent?: boolean;
  guesses: string[];
  current: string;
};

export type Store = {
  version: typeof VERSION;
  // Solutions already drawn this cycle, including the one in progress.
  played: string[];
  // Ids of the Puzzles whose result is in `stats`, newest last, so a Puzzle finished in several tabs counts once.
  recorded: string[];
  puzzle: SavedPuzzle | null;
  stats: Stats;
  seenHowToPlay: boolean;
};

export const emptyStore = (): Store => ({
  version: VERSION,
  played: [],
  recorded: [],
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
    (v.id === undefined || typeof v.id === "string") &&
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
    (v.recorded === undefined || (Array.isArray(v.recorded) && v.recorded.every((w: unknown) => typeof w === "string"))) &&
    (v.puzzle === null || isSavedPuzzle(v.puzzle)) &&
    isStats(v.stats) &&
    typeof v.seenHowToPlay === "boolean"
  );
}

function readStore(storage: Storage): Store | null {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(KEY) ?? "null");
    return isStore(parsed) ? { ...parsed, recorded: parsed.recorded ?? [] } : null;
  } catch {
    return null;
  }
}

// Anything unreadable (no storage, corrupt JSON, other version) quietly starts fresh.
export function loadStore(storage: Storage): Store {
  return readStore(storage) ?? emptyStore();
}

// How many finished Puzzles stay remembered; only Puzzles open in several tabs at once need it.
const RECORDED_KEPT = 50;

// A finished Puzzle's result: `apply` adds it to the stats, `id` names the Puzzle so it counts once.
export type EndResult = { id: string; apply: (stats: Stats) => Stats };

// `played` and the stats are shared by every open tab. `played` changes only through a draw, so a save keeps
// the stored one. Stats are read and written back in one synchronous step (the smallest window for another tab
// to slip in), with this tab's result applied on top, unless another tab already recorded that Puzzle.
export function saveStore(storage: Storage, store: Store, endResult?: EndResult): Store {
  const stored = readStore(storage) ?? store;
  const counts = endResult !== undefined && !stored.recorded.includes(endResult.id);
  const saved = {
    ...store,
    played: stored.played,
    stats: counts ? endResult.apply(stored.stats) : stored.stats,
    recorded: counts ? [...stored.recorded, endResult.id].slice(-RECORDED_KEPT) : stored.recorded,
  };
  write(storage, saved);
  return saved;
}

function write(storage: Storage, store: Store): void {
  try {
    storage.setItem(KEY, JSON.stringify(store));
  } catch {
    // Private mode or a full quota: the game still plays, it just won't be remembered.
  }
}

// Draws a Solution from the `played` in storage and saves it there in the same synchronous step,
// so another tab can never draw it again within the cycle. The tab's own `played` is only a fallback.
export function drawFromStorage(
  storage: Storage,
  store: Store,
  pool: readonly SolutionEntry[],
  random: () => number,
): { entry: SolutionEntry; store: Store } {
  const stored = readStore(storage) ?? store;
  const { entry, played } = drawUnplayed(pool, stored.played, random);
  const drawn = { ...store, played, stats: stored.stats, recorded: stored.recorded };
  write(storage, { ...stored, played });
  return { entry, store: drawn };
}

// What the stats overlay shows: whatever the tabs have saved by now.
export function currentStats(storage: Storage, store: Store): Stats {
  return (readStore(storage) ?? store).stats;
}
