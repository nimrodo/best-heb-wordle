import "@fontsource/rubik/hebrew-400.css";
import "@fontsource/rubik/hebrew-600.css";
import "@fontsource/rubik/hebrew-800.css";
import "./style.css";
import { newPuzzle, reduce, restorePuzzle, type GameEvent, type GameState } from "./game/game";
import { eventFromKeyName, eventFromKeyboard } from "./game/keyboard";
import { render, revealDuration, type EndView } from "./ui";
import { drawUnplayed, type SolutionEntry } from "./game/draw";
import { loadStore, saveStore } from "./game/persistence";
import { loadDefinitions, loadGuesses, loadSolutions } from "./words";

const root = document.querySelector<HTMLDivElement>("#app")!;

const solutions = await loadSolutions();
// Until the full Guess list arrives, only Solutions are known words.
let words: ReadonlySet<string> = new Set(solutions.map((s: SolutionEntry) => s.word));
let loading = true;

let store = loadStore(localStorage);

function randomPuzzle(): GameState {
  const { entry, played } = drawUnplayed(solutions, store.played, Math.random);
  store = { ...store, played };
  return newPuzzle(entry.word, words, { hard: entry.hard, loading });
}

// The Puzzle in progress is saved after every change, so a reload restores it.
function persist(): void {
  const { solution, hard, guesses, current } = state;
  const puzzle = { solution, hard, guesses: guesses.map((g) => g.word), current };
  store = { ...store, puzzle };
  saveStore(localStorage, store);
}

let state: GameState = store.puzzle ? restorePuzzle(store.puzzle, words, { loading }) : randomPuzzle();
// Input is ignored while a submitted Guess is being revealed.
let revealing = false;

// The end sheet opens this long after the last tile settles.
const END_SHEET_DELAY_MS = 600;
let view: EndView = { sheet: "pending", meaning: null };
let sheetTimer: ReturnType<typeof setTimeout> | undefined;

function openEndSheet(): void {
  view = { sheet: "open", meaning: null };
  draw();
  // Definitions are fetched on first need; a failed fetch just means no Meaning line.
  const { solution } = state;
  loadDefinitions().then(
    (all) => {
      if (state.solution !== solution) return;
      view = { ...view, meaning: all[solution] ?? null };
      draw();
    },
    (error) => console.error("Failed to load the Meanings", error),
  );
}

function startPuzzle(): void {
  clearTimeout(sheetTimer);
  state = randomPuzzle();
  view = { sheet: "pending", meaning: null };
  persist();
  draw();
}

function dispatch(event: GameEvent): void {
  if (revealing) return;
  const before = state;
  state = reduce(state, event);
  persist();
  if (state.guesses.length > before.guesses.length) {
    revealing = true;
    // Show the board and keys as they were, with only the new row animating.
    render(root, { ...state, keys: before.keys, status: before.status }, view, { onKey }, true);
    setTimeout(() => {
      revealing = false;
      draw();
      if (state.status !== "playing") sheetTimer = setTimeout(openEndSheet, END_SHEET_DELAY_MS);
    }, revealDuration());
  } else draw();
}

function onKey(key: string): void {
  if (revealing) return;
  if (key === "new") startPuzzle();
  else if (key === "dismiss") dismissEndSheet();
  else dispatch(eventFromKeyName(key));
}

function dismissEndSheet(): void {
  view = { ...view, sheet: "dismissed" };
  draw();
}

function draw(): void {
  render(root, state, view, { onKey });
}

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && view.sheet === "open") return dismissEndSheet();
  const event = eventFromKeyboard(e);
  if (!event) return;
  e.preventDefault();
  dispatch(event);
});

persist();
// A restored Puzzle that had already ended shows its sheet at once.
if (state.status === "playing") draw();
else openEndSheet();

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
