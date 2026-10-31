import { describe, expect, test } from "vitest";
import { newPuzzle, reduce, type GameEvent, type GameState } from "./game";

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
