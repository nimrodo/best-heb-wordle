import { expect, test } from "vitest";
import { KEY_ROWS, eventFromKeyboard } from "./keyboard";

const press = (key: string, code = "", mods: Partial<KeyboardEvent> = {}) =>
  eventFromKeyboard({ key, code, ctrlKey: false, metaKey: false, altKey: false, ...mods });

test("the on-screen keyboard has the 22 SI-1452 letters and no sofit keys", () => {
  const letters = KEY_ROWS.flat().filter((k) => k !== "enter" && k !== "backspace");
  expect(letters).toHaveLength(22);
  expect(letters.join("")).not.toMatch(/[ךםןףץ]/);
});

test("row 3 has Enter and Backspace at opposite ends", () => {
  const row3 = KEY_ROWS[2];
  expect(row3[0]).toBe("enter");
  expect(row3[row3.length - 1]).toBe("backspace");
});

test("a Hebrew key press becomes a letter event", () => {
  expect(press("ש", "KeyA")).toEqual({ type: "letter", letter: "ש" });
});

test("a sofit key press is passed through for folding by the core", () => {
  expect(press("ן", "KeyI")).toEqual({ type: "letter", letter: "ן" });
});

test("an English layout falls back to the Hebrew letter on the same physical key", () => {
  expect(press("a", "KeyA")).toEqual({ type: "letter", letter: "ש" });
  expect(press("t", "KeyT")).toEqual({ type: "letter", letter: "א" });
  expect(press(",", "Comma")).toEqual({ type: "letter", letter: "ת" });
});

test("Enter and Backspace map to their events", () => {
  expect(press("Enter", "Enter")).toEqual({ type: "enter" });
  expect(press("Backspace", "Backspace")).toEqual({ type: "backspace" });
});

test("other keys and shortcuts are ignored", () => {
  expect(press("Shift", "ShiftLeft")).toBeNull();
  expect(press("a", "KeyA", { metaKey: true })).toBeNull();
});
