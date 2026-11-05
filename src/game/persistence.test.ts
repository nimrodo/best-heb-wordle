import { describe, expect, test } from "vitest";
import {
  currentStats,
  drawFromStorage,
  type EndResult,
  emptyStore,
  KEY,
  loadStore,
  type Store,
  saveStore,
} from "./persistence";
import { emptyStats, recordWin } from "./stats";

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
  recorded: [],
  puzzle: { solution: "אבגדה", hard: true, guesses: ["שלומי"], current: "של" },
  stats: { ...emptyStats(), wins: [0, 2, 1, 0, 0, 0], streak: 3, bestStreak: 3 },
  seenHowToPlay: true,
};

// Each call is a different Puzzle unless an id is given.
let nextId = 0;
const win = (guessesUsed: number, id = `p${nextId++}`): EndResult => ({
  id,
  apply: (stats) => recordWin(stats, guessesUsed, false),
});

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

  test("a Puzzle saved without an id loads as it was saved", () => {
    expect(loadStore(memoryStorage({ [KEY]: JSON.stringify(store) })).puzzle?.id).toBeUndefined();
    const bad = JSON.stringify({ ...store, puzzle: { ...store.puzzle, id: 7 } });
    expect(loadStore(memoryStorage({ [KEY]: bad }))).toEqual(emptyStore());
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
    saveStore(storage, stale, win(2));

    const saved = saveStore(storage, stale, win(3));

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

    const saved = saveStore(failing, withWins([0, 2, 0, 0, 0, 0]), win(1));

    expect(saved.stats.wins).toEqual([1, 2, 0, 0, 0, 0]);
  });

  test("corrupt stored JSON is replaced, keeping the tab's own stats plus its result", () => {
    const storage = memoryStorage({ [KEY]: "{not json" });

    const saved = saveStore(storage, withWins([0, 2, 0, 0, 0, 0]), win(1));

    expect(saved.stats.wins).toEqual([1, 2, 0, 0, 0, 0]);
    expect(loadStore(storage).stats).toEqual(saved.stats);
  });
});

describe("tabs sharing played and results", () => {
  const pool = [
    { word: "אבגדה", hard: false },
    { word: "שלומי", hard: false },
  ];
  const first = () => 0;

  test("a draw in a stale tab does not draw the Solution another tab drew", () => {
    const storage = memoryStorage();
    const staleB = saveStore(storage, emptyStore());
    const a = drawFromStorage(storage, emptyStore(), pool, first);

    const b = drawFromStorage(storage, staleB, pool, first);

    expect(b.entry.word).not.toBe(a.entry.word);
    expect(loadStore(storage).played).toEqual([a.entry.word, b.entry.word]);
  });

  test("saving the Puzzle in progress in a stale tab keeps another tab's draw", () => {
    const storage = memoryStorage();
    const stale = saveStore(storage, emptyStore());
    const drawn = drawFromStorage(storage, emptyStore(), pool, first);

    saveStore(storage, { ...stale, puzzle: store.puzzle });

    expect(loadStore(storage).played).toEqual([drawn.entry.word]);
  });

  test("the cycle reset still works with played read from storage", () => {
    const storage = memoryStorage();
    saveStore(storage, { ...emptyStore(), played: pool.map((s) => s.word) });
    const stale = emptyStore();

    const drawn = drawFromStorage(storage, stale, pool, first);

    expect(loadStore(storage).played).toEqual([drawn.entry.word]);
    expect(drawn.store.played).toEqual([drawn.entry.word]);
  });

  test("a draw still works when nothing can be read from storage", () => {
    const broken = {
      getItem: () => null,
      setItem: () => {
        throw new Error("full");
      },
    } as unknown as Storage;

    const drawn = drawFromStorage(broken, emptyStore(), pool, first);

    expect(drawn.store.played).toEqual([drawn.entry.word]);
  });

  test("the same Puzzle finished in two tabs adds one result, the first", () => {
    const storage = memoryStorage();
    const staleB = saveStore(storage, emptyStore());
    saveStore(storage, emptyStore(), win(2, "same"));

    const saved = saveStore(storage, staleB, win(5, "same"));

    expect(saved.stats.wins).toEqual([0, 1, 0, 0, 0, 0]);
    expect(loadStore(storage).stats.wins).toEqual([0, 1, 0, 0, 0, 0]);
  });

  test("a Puzzle already recorded is still recognised after another Puzzle was recorded", () => {
    const storage = memoryStorage();
    saveStore(storage, emptyStore(), win(2, "one"));
    saveStore(storage, emptyStore(), win(3, "two"));
    const saved = saveStore(storage, emptyStore(), win(4, "one"));

    expect(saved.stats.wins).toEqual([0, 1, 1, 0, 0, 0]);
  });

  test("the stats overlay reads what another tab saved", () => {
    const storage = memoryStorage();
    const stale = saveStore(storage, emptyStore());
    saveStore(storage, emptyStore(), win(1));

    expect(currentStats(storage, stale).wins).toEqual([1, 0, 0, 0, 0, 0]);
  });

  test("the stats overlay falls back to the tab's own stats when storage is unreadable", () => {
    const own = { ...emptyStore(), stats: { ...emptyStats(), losses: 4 } };

    expect(currentStats(memoryStorage({ [KEY]: "{not json" }), own).losses).toBe(4);
  });

  test("a store saved before results were tracked loads with none recorded", () => {
    const { recorded: _, ...old } = store;

    expect(loadStore(memoryStorage({ [KEY]: JSON.stringify(old) })).recorded).toEqual([]);
  });
});
