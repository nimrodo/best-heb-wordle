import { expect, test } from "vitest";
import { KEY_ROWS, eventFromKeyName, eventFromKeyboard } from "./keyboard";

const press = (key: string, code = "", mods: Partial<KeyboardEvent> = {}) =>
  eventFromKeyboard({ key, code, ctrlKey: false, metaKey: false, altKey: false, ...mods });

test("the on-screen keyboard has the 22 SI-1452 letters and no sofit keys", () => {
  const letters = KEY_ROWS.flat().filter((k) => k !== "enter" && k !== "backspace");
  expect(letters).toHaveLength(22);
  expect(letters.join("")).not.toMatch(/[ךםןףץ]/);
});

test("row 1 is the six letters with no empty slots", () => {
  expect(KEY_ROWS[0]).toEqual([..."קראטופ"]);
});

// Enter opens row 3 and Backspace closes row 2, so both rows are letters plus one wide key.
test("Backspace ends row 2 and Enter starts row 3", () => {
  expect(KEY_ROWS[1]).toEqual([..."שדגכעיחל", "backspace"]);
  expect(KEY_ROWS[2]).toEqual(["enter", ..."זסבהנמצת"]);
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
