import { describe, expect, test } from "vitest";
import { emptyStats } from "./stats";
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
