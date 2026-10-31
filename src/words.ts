import { normalise } from "./game/game";

// Placeholder lists until the real pipeline output is wired in.
const SOLUTIONS = ["שולחן", "מחברת", "מקלדת", "ספרים", "ילדים", "שמיים", "מדינה", "תמונה", "ארצות", "פרחים", "מסלול"];
const EXTRA_GUESSES = ["מחשבה", "אהבתי", "חופשה"];

const fold = (word: string) => [...word].map((l) => normalise(l) ?? l).join("");

export const solutions = SOLUTIONS.map(fold);
export const validWords: ReadonlySet<string> = new Set([...solutions, ...EXTRA_GUESSES.map(fold)]);
