import { describe, expect, test } from "vitest";
import { emptyStats, recordWin } from "./stats";
import { KEY, emptyStore, loadStore, saveStore, type Store } from "./persistence";

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(initial));
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => void data.delete(k),
    setItem: (k, v) => void data.set(k, String(v)),
  };
}

const store: Store = {
  version: 1,
  played: ["אבגדה", "שלום"],
  puzzle: { solution: "אבגדה", hard: true, guesses: ["שלומי"], current: "של" },
  stats: { ...emptyStats(), wins: [0, 2, 1, 0, 0, 0], streak: 3, bestStreak: 3 },
  seenHowToPlay: true,
};

describe("store", () => {
  test("uses one versioned key", () => {
    expect(KEY).toBe("hebwordle:v1");
  });

  test("an empty storage loads an empty store", () => {
    expect(loadStore(memoryStorage())).toEqual(emptyStore());
  });

  test("a saved store, including the Puzzle in progress, loads back as saved", () => {
    const storage = memoryStorage();
    saveStore(storage, store);
    expect(loadStore(storage)).toEqual(store);
  });

  test("a Sent Puzzle keeps its marker; a save without one loads as not sent", () => {
    const sent = { ...store, puzzle: { ...store.puzzle!, sent: true } };
    const storage = memoryStorage();
    saveStore(storage, sent);
    expect(loadStore(storage)).toEqual(sent);
    expect(loadStore(memoryStorage({ [KEY]: JSON.stringify(store) })).puzzle).toEqual(store.puzzle);
  });

  test("a sent marker of the wrong type resets quietly", () => {
    const bad = JSON.stringify({ ...store, puzzle: { ...store.puzzle, sent: "yes" } });
    expect(loadStore(memoryStorage({ [KEY]: bad }))).toEqual(emptyStore());
  });

  test("corrupt JSON resets quietly", () => {
    expect(loadStore(memoryStorage({ [KEY]: "{not json" }))).toEqual(emptyStore());
  });

  test("a version mismatch resets quietly", () => {
    const old = JSON.stringify({ ...store, version: 0 });
    expect(loadStore(memoryStorage({ [KEY]: old }))).toEqual(emptyStore());
  });

  test("a store of the wrong shape resets quietly", () => {
    const bad = JSON.stringify({ ...store, played: "nope" });
    expect(loadStore(memoryStorage({ [KEY]: bad }))).toEqual(emptyStore());
    const badPuzzle = JSON.stringify({ ...store, puzzle: { solution: "אב", hard: false, guesses: [], current: "" } });
    expect(loadStore(memoryStorage({ [KEY]: badPuzzle }))).toEqual(emptyStore());
  });

  test("stats of the wrong shape reset quietly", () => {
    const bad = JSON.stringify({ ...store, stats: { wins: [1] } });
    expect(loadStore(memoryStorage({ [KEY]: bad }))).toEqual(emptyStore());
  });

  test("unavailable storage does not break loading or saving", () => {
    const broken = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("full");
      },
    } as unknown as Storage;
    expect(loadStore(broken)).toEqual(emptyStore());
    expect(() => saveStore(broken, store)).not.toThrow();
  });
});

describe("saving stats across tabs", () => {
  const withWins = (wins: number[]): Store => ({ ...store, stats: { ...emptyStats(), wins } });

  test("a result is added to the stats another tab saved meanwhile", () => {
    const storage = memoryStorage();
    saveStore(storage, withWins([1, 0, 0, 0, 0, 0]));
    // This tab still holds the stale copy; another tab then records a win in two Guesses.
    const stale = loadStore(storage);
    saveStore(storage, stale, (stats) => recordWin(stats, 2, false));

    const saved = saveStore(storage, stale, (stats) => recordWin(stats, 3, false));

    expect(saved.stats.wins).toEqual([1, 1, 1, 0, 0, 0]);
    expect(loadStore(storage).stats).toEqual(saved.stats);
  });

  test("a save without a result keeps the stats another tab saved", () => {
    const storage = memoryStorage();
    const stale = withWins([0, 0, 0, 0, 0, 0]);
    saveStore(storage, withWins([0, 0, 5, 0, 0, 0]));

    expect(saveStore(storage, stale).stats.wins).toEqual([0, 0, 5, 0, 0, 0]);
  });

  test("with nothing readable in storage, the tab's own stats carry on", () => {
    const full = memoryStorage();
    const failing: Storage = {
      ...full,
      setItem: () => {
        throw new Error("quota");
      },
    };

    const saved = saveStore(failing, withWins([0, 2, 0, 0, 0, 0]), (stats) => recordWin(stats, 1, false));

    expect(saved.stats.wins).toEqual([1, 2, 0, 0, 0, 0]);
  });

  test("corrupt stored JSON is replaced, keeping the tab's own stats plus its result", () => {
    const storage = memoryStorage({ [KEY]: "{not json" });

    const saved = saveStore(storage, withWins([0, 2, 0, 0, 0, 0]), (stats) => recordWin(stats, 1, false));

    expect(saved.stats.wins).toEqual([1, 2, 0, 0, 0, 0]);
    expect(loadStore(storage).stats).toEqual(saved.stats);
  });
});
