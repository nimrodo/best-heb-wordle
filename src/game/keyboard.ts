import { normalise, type GameEvent } from "./game";

export type KeyName = string | "enter" | "backspace";

// SI-1452 without the sofit keys. Row 3 puts Enter and Backspace at opposite ends.
export const KEY_ROWS: readonly (readonly KeyName[])[] = [
  [..."קראטופ"],
  [..."שדגכעיחל"],
  ["enter", ..."זסבהנמצת", "backspace"],
];

// Hebrew letter on each physical key of the standard Hebrew layout, used when the
// player's keyboard is set to English.
const LETTER_BY_CODE: Record<string, string> = {
  KeyE: "ק", KeyR: "ר", KeyT: "א", KeyY: "ט", KeyU: "ו", KeyI: "ן", KeyO: "ם", KeyP: "פ",
  KeyA: "ש", KeyS: "ד", KeyD: "ג", KeyF: "כ", KeyG: "ע", KeyH: "י", KeyJ: "ח", KeyK: "ל",
  KeyL: "ך", Semicolon: "ף",
  KeyZ: "ז", KeyX: "ס", KeyC: "ב", KeyV: "ה", KeyB: "נ", KeyN: "מ", KeyM: "צ",
  Comma: "ת", Period: "ץ",
};

type KeyInput = Pick<KeyboardEvent, "key" | "code" | "ctrlKey" | "metaKey" | "altKey">;

export function eventFromKeyboard(e: KeyInput): GameEvent | null {
  if (e.ctrlKey || e.metaKey || e.altKey) return null;
  if (e.key === "Enter") return { type: "enter" };
  if (e.key === "Backspace") return { type: "backspace" };
  if (normalise(e.key) !== null) return { type: "letter", letter: e.key };
  const letter = LETTER_BY_CODE[e.code];
  return letter ? { type: "letter", letter } : null;
}
