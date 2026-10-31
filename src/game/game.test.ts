import { describe, expect, test } from "vitest";
import { TOAST_LOADING, abandonOutcome, isOpeningCombo, TOAST_NOT_IN_LIST, newPuzzle, reduce, restorePuzzle, type GameEvent, type GameState } from "./game";

const words = new Set(["שולחנ", "מחברת", "ספרימ", "ילדימ", "שמיימ", "מקלדת"]);

function play(state: GameState, ...events: GameEvent[]): GameState {
  return events.reduce(reduce, state);
}

function type(state: GameState, text: string): GameState {
  return play(state, ...[...text].map((letter): GameEvent => ({ type: "letter", letter })));
}

function submit(state: GameState, word: string): GameState {
  return play(type(state, word), { type: "enter" });
}

const fresh = (solution = "שולחנ") => newPuzzle(solution, words);

describe("Puzzle setup", () => {
  test("a Puzzle is not Hard unless said so", () => {
    expect(fresh().hard).toBe(false);
    expect(newPuzzle("שולחנ", words, { hard: true }).hard).toBe(true);
  });
});

describe("while the Guess list is still loading", () => {
  const loading = () => newPuzzle("שולחנ", words, { loading: true });

  test("an unknown word gets a loading toast, not 'not in list'", () => {
    const state = submit(loading(), "קקקקק");
    expect(state.toast).toBe(TOAST_LOADING);
    expect(state.guesses).toHaveLength(0);
  });

  test("a word already known is accepted", () => {
    expect(submit(loading(), "מקלדת").guesses).toHaveLength(1);
  });

  test("once loaded, an unknown word is simply not in the list", () => {
    expect(submit(fresh(), "קקקקק").toast).toBe(TOAST_NOT_IN_LIST);
  });
});

describe("scoring", () => {
  test("marks correct, present and absent letters", () => {
    const state = submit(fresh("שולחנ"), "מחברת");
    expect(state.guesses[0].marks).toEqual(["absent", "present", "absent", "absent", "absent"]);
  });

  test("a repeated guess letter is present only as many times as the solution holds it", () => {
    // Solution has one מ (matched exactly at the end), so the guess's earlier מ is absent.
    // Solution has two י; one matches exactly (index 3), the other makes index 2 present.
    const state = submit(fresh("ילדימ"), "שמיימ");
    expect(state.guesses[0].marks).toEqual(["absent", "absent", "present", "correct", "correct"]);
  });

  test("two copies in the guess against one in the solution mark only one present", () => {
    // Solution מחברת has one מ; the guess has two, neither in the right place.
    const state = submit(fresh("מחברת"), "שמיימ");
    expect(state.guesses[0].marks).toEqual(["absent", "present", "absent", "absent", "absent"]);
  });

  test("marks exact matches as correct", () => {
    const state = submit(fresh("מחברת"), "מקלדת");
    expect(state.guesses[0].marks).toEqual(["correct", "absent", "absent", "absent", "correct"]);
  });
});

describe("keyboard key states", () => {
  test("keeps the best state seen for each letter", () => {
    let state = submit(fresh("ילדימ"), "שמיימ"); // י: present then correct in one guess
    expect(state.keys["י"]).toBe("correct");
    expect(state.keys["מ"]).toBe("correct");
    expect(state.keys["ש"]).toBe("absent");
    state = submit(state, "שולחנ");
    expect(state.keys["ש"]).toBe("absent");
    expect(state.keys["ל"]).toBe("present");
  });

  test("a later worse result does not downgrade a key", () => {
    let state = submit(fresh("מחברת"), "מקלדת"); // מ correct
    state = submit(state, "שמיימ"); // מ present/absent positions
    expect(state.keys["מ"]).toBe("correct");
  });
});

describe("input", () => {
  test("sofit letters are folded to their normal form", () => {
    const state = type(fresh(), "ךםןףץ");
    expect(state.current).toBe("כמנפצ");
  });

  test("niqqud and non-Hebrew characters are ignored", () => {
    const state = type(fresh(), "שָׁa1ו");
    expect(state.current).toBe("שו");
  });

  test("niqqud attached to a letter in one event is dropped, keeping the letter", () => {
    const state = play(fresh(), { type: "letter", letter: "שָׁ" });
    expect(state.current).toBe("ש");
  });

  test("letters beyond five are ignored", () => {
    expect(type(fresh(), "שולחנא").current).toBe("שולחנ");
  });

  test("backspace removes the last letter", () => {
    const state = play(type(fresh(), "שול"), { type: "backspace" });
    expect(state.current).toBe("שו");
  });
});

describe("toasts", () => {
  test("a short guess shows a toast and spends no guess", () => {
    const state = play(type(fresh(), "שול"), { type: "enter" });
    expect(state.toast).toBe("אין מספיק אותיות");
    expect(state.guesses).toHaveLength(0);
    expect(state.current).toBe("שול");
  });

  test("an unknown word shows a toast and spends no guess", () => {
    const state = submit(fresh(), "אאבדה");
    expect(state.toast).toBe("המילה לא ברשימה");
    expect(state.guesses).toHaveLength(0);
    expect(state.current).toBe("אאבדה");
  });

  test("the toast clears on the next event", () => {
    const state = play(submit(fresh(), "אאבדה"), { type: "backspace" });
    expect(state.toast).toBeNull();
  });
});

describe("win and loss", () => {
  test("guessing the solution wins", () => {
    const state = submit(fresh(), "שולחנ");
    expect(state.status).toBe("won");
    expect(state.current).toBe("");
  });

  test("six wrong guesses lose", () => {
    let state = fresh();
    for (let i = 0; i < 5; i++) state = submit(state, "מחברת");
    expect(state.status).toBe("playing");
    state = submit(state, "מחברת");
    expect(state.status).toBe("lost");
  });

  test("winning on the sixth guess is a win", () => {
    let state = fresh();
    for (let i = 0; i < 5; i++) state = submit(state, "מחברת");
    expect(submit(state, "שולחנ").status).toBe("won");
  });

  test("events after the puzzle ends are ignored", () => {
    const won = submit(fresh(), "שולחנ");
    expect(type(won, "שול")).toEqual(won);
  });
});

describe("restorePuzzle", () => {
  const words = new Set(["שלום", "אבגדה", "שלומי"]);

  test("rebuilds the board, keys and status from saved Guesses", () => {
    const state = restorePuzzle({ solution: "שלומי", hard: true, guesses: ["אבגדה", "שלומי"], current: "" }, words);
    expect(state.guesses.map((g) => g.word)).toEqual(["אבגדה", "שלומי"]);
    expect(state.guesses[1].marks).toEqual(Array(5).fill("correct"));
    expect(state.keys["ש"]).toBe("correct");
    expect(state.status).toBe("won");
    expect(state.hard).toBe(true);
  });

  test("keeps the half-typed Guess and stays in play", () => {
    const state = restorePuzzle({ solution: "שלומי", hard: false, guesses: ["אבגדה"], current: "של" }, words);
    expect(state.current).toBe("של");
    expect(state.status).toBe("playing");
  });

  test("six wrong Guesses restore as lost", () => {
    const six = Array(6).fill("אבגדה");
    expect(restorePuzzle({ solution: "שלומי", hard: false, guesses: six, current: "" }, words).status).toBe("lost");
  });
});

describe("abandoning a Puzzle", () => {
  test("with Guesses it counts as a loss", () => {
    expect(abandonOutcome(submit(fresh(), "מחברת"))).toBe("lost");
  });

  test("with no Guesses nothing is recorded, even with a partly typed word", () => {
    expect(abandonOutcome(fresh())).toBeNull();
    expect(abandonOutcome(type(fresh(), "מחב"))).toBeNull();
  });
});

describe("the opening three Guesses", () => {
  const guesses = (...words: string[]) => words.map((word) => ({ word, marks: [] }));

  test("fires for מיוחד, אשלגן, התקרב in that order", () => {
    expect(isOpeningCombo(guesses("מיוחד", "אשלגנ", "התקרב"))).toBe(true);
  });

  test("not for a different order, a prefix, or a different Guess count", () => {
    expect(isOpeningCombo(guesses("אשלגנ", "מיוחד", "התקרב"))).toBe(false);
    expect(isOpeningCombo(guesses("מיוחד", "אשלגנ"))).toBe(false);
    expect(isOpeningCombo(guesses("מיוחד", "אשלגנ", "התקרב", "שולחנ"))).toBe(false);
    expect(isOpeningCombo(guesses("מיוחד", "אשלגנ", "שולחנ"))).toBe(false);
  });
});
