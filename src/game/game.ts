export const WORD_LENGTH = 5;
export const MAX_GUESSES = 6;

export type Mark = "correct" | "present" | "absent";
export type Status = "playing" | "won" | "lost";

export type Guess = { word: string; marks: Mark[] };

export type GameState = {
  readonly solution: string;
  readonly words: ReadonlySet<string>;
  // True while `words` is only a partial list (the full Guess list is still downloading).
  readonly loading: boolean;
  readonly hard: boolean;
  readonly guesses: readonly Guess[];
  readonly current: string;
  readonly keys: Readonly<Record<string, Mark>>;
  readonly toast: string | null;
  readonly status: Status;
};

export type GameEvent =
  | { type: "letter"; letter: string }
  | { type: "backspace" }
  | { type: "enter" };

export const TOAST_TOO_SHORT = "אין מספיק אותיות";
export const TOAST_NOT_IN_LIST = "המילה לא ברשימה";
export const TOAST_LOADING = "הרשימה עדיין נטענת";

const SOFIT_TO_NORMAL: Record<string, string> = { ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" };
const NORMAL_TO_SOFIT = Object.fromEntries(Object.entries(SOFIT_TO_NORMAL).map(([s, n]) => [n, s]));

// Letters are stored in normal form; the sofit is only a display matter of position.
export function normalise(letter: string): string | null {
  // Strip niqqud and cantillation marks (U+0591–U+05C7) so "שָׁ" counts as ש.
  const bare = letter.replace(/[\u0591-\u05C7]/g, "");
  const folded = SOFIT_TO_NORMAL[bare] ?? bare;
  return /^[א-ת]$/.test(folded) ? folded : null;
}

export function displayLetter(letter: string, index: number): string {
  return index === WORD_LENGTH - 1 ? (NORMAL_TO_SOFIT[letter] ?? letter) : letter;
}

const RANK: Record<Mark, number> = { absent: 0, present: 1, correct: 2 };

export function score(word: string, solution: string): Mark[] {
  const marks: Mark[] = Array(WORD_LENGTH).fill("absent");
  const remaining: Record<string, number> = {};
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (word[i] === solution[i]) marks[i] = "correct";
    else remaining[solution[i]] = (remaining[solution[i]] ?? 0) + 1;
  }
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (marks[i] !== "correct" && remaining[word[i]] > 0) {
      marks[i] = "present";
      remaining[word[i]]--;
    }
  }
  return marks;
}

function mergeKeys(keys: GameState["keys"], guess: Guess): GameState["keys"] {
  const merged = { ...keys };
  [...guess.word].forEach((letter, i) => {
    const mark = guess.marks[i];
    if (!(letter in merged) || RANK[mark] > RANK[merged[letter]]) merged[letter] = mark;
  });
  return merged;
}

export function newPuzzle(
  solution: string,
  words: ReadonlySet<string>,
  { hard = false, loading = false } = {},
): GameState {
  return { solution, words, loading, hard, guesses: [], current: "", keys: {}, toast: null, status: "playing" };
}

// Rebuilds a Puzzle in progress from its saved Guesses. Saved Guesses were valid when
// played, so they are scored without consulting the word list.
export function restorePuzzle(
  saved: { solution: string; hard: boolean; guesses: readonly string[]; current: string },
  words: ReadonlySet<string>,
  { loading = false } = {},
): GameState {
  const guesses = saved.guesses.map((word): Guess => ({ word, marks: score(word, saved.solution) }));
  const status: Status = guesses.some((g) => g.word === saved.solution)
    ? "won"
    : guesses.length >= MAX_GUESSES
      ? "lost"
      : "playing";
  return {
    ...newPuzzle(saved.solution, words, { hard: saved.hard, loading }),
    guesses,
    current: status === "playing" ? saved.current : "",
    keys: guesses.reduce(mergeKeys, {}),
    status,
  };
}

function submit(state: GameState): GameState {
  if (state.current.length < WORD_LENGTH) return { ...state, toast: TOAST_TOO_SHORT };
  if (!state.words.has(state.current)) {
    // A partial list cannot reject a word, only ask the player to retry once it is complete.
    return { ...state, toast: state.loading ? TOAST_LOADING : TOAST_NOT_IN_LIST };
  }
  const guess: Guess = { word: state.current, marks: score(state.current, state.solution) };
  const guesses = [...state.guesses, guess];
  const status: Status =
    guess.word === state.solution ? "won" : guesses.length >= MAX_GUESSES ? "lost" : "playing";
  return { ...state, guesses, current: "", keys: mergeKeys(state.keys, guess), status };
}

export function reduce(state: GameState, event: GameEvent): GameState {
  if (state.status !== "playing") return state;
  const cleared = { ...state, toast: null };
  switch (event.type) {
    case "letter": {
      const letter = normalise(event.letter);
      if (letter === null || state.current.length >= WORD_LENGTH) return cleared;
      return { ...cleared, current: state.current + letter };
    }
    case "backspace":
      return { ...cleared, current: state.current.slice(0, -1) };
    case "enter":
      return submit(cleared);
  }
}
