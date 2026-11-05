import { normalise, TOAST_NOT_IN_LIST, TOAST_TOO_SHORT, WORD_LENGTH } from "./game";

// Obfuscation only: the key ships in the bundle, so this just keeps the word from being
// readable in the URL. Each letter becomes a byte (its offset from א), XORed with a key byte.
const KEY = [0x5a, 0xc3, 0x17, 0x8e, 0x6d];
const ALEF = 0x5d0;

// Expects a word from checkSendWord, so letters are already in normal form.
export function encodeWord(word: string): string {
  const bytes = [...word].map((letter, i) => (letter.charCodeAt(0) - ALEF) ^ KEY[i]);
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

// null for anything that is not a payload encodeWord could have made.
export function decodeWord(payload: string): string | null {
  if (!/^[A-Za-z0-9_-]*$/.test(payload)) return null;
  let raw: string;
  try {
    raw = atob(payload.replaceAll("-", "+").replaceAll("_", "/"));
  } catch {
    return null;
  }
  if (raw.length !== WORD_LENGTH) return null;
  const word = [...raw].map((c, i) => String.fromCharCode(ALEF + (c.charCodeAt(0) ^ KEY[i]))).join("");
  return /^[א-ת]+$/.test(word) ? word : null;
}

export const TOAST_BAD_CHARACTER = "המילה יכולה להכיל רק אותיות בעברית";
export const TOAST_TOO_LONG = "יש יותר מדי אותיות";

export type SendCheck = { ok: true; word: string } | { ok: false; message: string };

// Any Guess list word may be sent, Prefix-attached and Construct forms included.
export function checkSendWord(input: string, words: ReadonlySet<string>): SendCheck {
  // Niqqud and cantillation marks are dropped as normalise does; anything else must be a letter.
  const letters = [...input.replace(/[\u0591-\u05C7]/g, "")].map(normalise);
  if (letters.includes(null)) return { ok: false, message: TOAST_BAD_CHARACTER };
  if (letters.length > WORD_LENGTH) return { ok: false, message: TOAST_TOO_LONG };
  if (letters.length < WORD_LENGTH) return { ok: false, message: TOAST_TOO_SHORT };
  const word = letters.join("");
  return words.has(word) ? { ok: true, word } : { ok: false, message: TOAST_NOT_IN_LIST };
}
