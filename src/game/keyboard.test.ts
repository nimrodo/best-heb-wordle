import { expect, test } from "vitest";
import { KEY_ROWS, eventFromKeyName, eventFromKeyboard } from "./keyboard";

const press = (key: string, code = "", mods: Partial<KeyboardEvent> = {}) =>
  eventFromKeyboard({ key, code, ctrlKey: false, metaKey: false, altKey: false, ...mods });

test("the on-screen keyboard has the 22 SI-1452 letters and no sofit keys", () => {
  const letters = KEY_ROWS.flat().filter((k) => k !== "enter" && k !== "backspace" && k !== "");
  expect(letters).toHaveLength(22);
  expect(letters.join("")).not.toMatch(/[ךםןףץ]/);
});

// Every key is the same width and the empty slots keep the letters in their SI-1452 columns,
// so the rows line up like QWERTY instead of stretching to fill the width.
test("the sofit slots in row 1 stay empty between ו and פ", () => {
  expect(KEY_ROWS[0]).toEqual([..."קראטו", "", "", "פ"]);
});

test("rows 1 and 2 are 8 slots and row 3 fills 10, so every key is one column wide", () => {
  expect(KEY_ROWS.map((row) => row.length)).toEqual([8, 8, 10]);
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

test("on-screen key names map to events", () => {
  expect(eventFromKeyName("enter")).toEqual({ type: "enter" });
  expect(eventFromKeyName("backspace")).toEqual({ type: "backspace" });
  expect(eventFromKeyName("ש")).toEqual({ type: "letter", letter: "ש" });
});
