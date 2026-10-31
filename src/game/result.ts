import type { Status } from "./game";

// Headline by Guesses used (index 0 is a win in one Guess).
const WIN_HEADLINES = ["בול בפגז!", "מדהים!", "יפה מאוד!", "כל הכבוד!", "הצלחת!", "ברגע האחרון!"];

// The sub-line says "found the word in N Guesses" with a singular form for 1. The past tense
// "מצאת" is the same for any gender when written without niqqud, so the copy stays neutral.
export function resultCopy(
  status: Exclude<Status, "playing">,
  guessesUsed: number,
): { headline: string; sub: string | null } {
  if (status === "lost") return { headline: "לא הפעם", sub: null };
  const sub = guessesUsed === 1 ? "מצאת את המילה בניחוש אחד" : `מצאת את המילה ב־${guessesUsed} ניחושים`;
  return { headline: WIN_HEADLINES[guessesUsed - 1], sub };
}
