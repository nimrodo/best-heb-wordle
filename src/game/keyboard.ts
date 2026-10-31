import { normalise, type GameEvent } from "./game";

// On-screen key names are the letter itself, or "enter" / "backspace".
// SI-1452 without the sofit keys. Backspace starts row 2 and Enter starts row 3 (both on the right), so rows 2 and 3
// are the same width and row 1's six letters sit centred above them.
export const KEY_ROWS: readonly (readonly string[])[] = [
  [..."קראטופ"],
  ["backspace", ..."שדגכעיחל"],
  ["enter", ..."זסבהנמצת"],
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

export function eventFromKeyName(key: string): GameEvent {
  if (key === "enter" || key === "backspace") return { type: key };
  return { type: "letter", letter: key };
}
