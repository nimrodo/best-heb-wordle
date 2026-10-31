import "@fontsource/rubik/hebrew-400.css";
import "@fontsource/rubik/hebrew-600.css";
import "@fontsource/rubik/hebrew-800.css";
import "./style.css";
import { newPuzzle, reduce, type GameEvent, type GameState } from "./game/game";
import { eventFromKeyName, eventFromKeyboard } from "./game/keyboard";
import { render, revealDuration } from "./ui";
import { drawSolution, type SolutionEntry } from "./game/draw";
import { loadGuesses, loadSolutions } from "./words";

const root = document.querySelector<HTMLDivElement>("#app")!;

const solutions = await loadSolutions();
// Until the full Guess list arrives, only Solutions are known words.
let words: ReadonlySet<string> = new Set(solutions.map((s: SolutionEntry) => s.word));
let loading = true;

const randomPuzzle = () => {
  const { word, hard } = drawSolution(solutions, Math.random);
  return newPuzzle(word, words, { hard, loading });
};

let state: GameState = randomPuzzle();
// Input is ignored while a submitted Guess is being revealed.
let revealing = false;

function dispatch(event: GameEvent): void {
  if (revealing) return;
  const before = state;
  state = reduce(state, event);
  if (state.guesses.length > before.guesses.length) {
    revealing = true;
    // Show the board and keys as they were, with only the new row animating.
    render(root, { ...state, keys: before.keys, status: before.status }, { onKey }, true);
    setTimeout(() => {
      revealing = false;
      draw();
    }, revealDuration());
  } else draw();
}

function onKey(key: string): void {
  if (revealing) return;
  if (key === "new") {
    state = randomPuzzle();
    draw();
  } else dispatch(eventFromKeyName(key));
}

function draw(): void {
  render(root, state, { onKey });
}

window.addEventListener("keydown", (e) => {
  const event = eventFromKeyboard(e);
  if (!event) return;
  e.preventDefault();
  dispatch(event);
});

draw();

// Play starts at once; the Guess list swaps into the running Puzzle when it arrives.
loadGuesses().then(
  (guesses) => {
    words = guesses;
    loading = false;
    state = { ...state, words, loading };
    if (!revealing) draw();
  },
  (error) => console.error("Failed to load the Guess list", error),
);
