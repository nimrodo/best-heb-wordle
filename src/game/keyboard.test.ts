import { expect, test } from "vitest";
import { eventFromKeyboard, eventFromKeyName, KEY_ROWS } from "./keyboard";

const press = (key: string, code = "", mods: Partial<KeyboardEvent> = {}) =>
  eventFromKeyboard({ key, code, ctrlKey: false, metaKey: false, altKey: false, ...mods });

test("the on-screen keyboard has the 22 SI-1452 letters and no sofit keys", () => {
  const letters = KEY_ROWS.flat().filter((k) => k !== "enter" && k !== "backspace");
  expect(letters).toHaveLength(22);
  expect(letters.join("")).not.toMatch(/[ךםןףץ]/);
});

// Rows are listed in the order they are drawn, left to right (the keyboard rows are forced ltr in CSS).
test("rows read left to right like the physical Hebrew keyboard", () => {
  expect(KEY_ROWS[0]).toEqual([..."קראטופ", "backspace"]);
  expect(KEY_ROWS[1]).toEqual([..."שדגכעיחל"]);
  expect(KEY_ROWS[2]).toEqual([..."זסבהנמצת", "enter"]);
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
