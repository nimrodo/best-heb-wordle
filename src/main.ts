import "@fontsource/rubik/hebrew-400.css";
import "@fontsource/rubik/hebrew-600.css";
import "@fontsource/rubik/hebrew-800.css";
import "./style.css";
import { newPuzzle, reduce, type GameEvent, type GameState } from "./game/game";
import { eventFromKeyName, eventFromKeyboard } from "./game/keyboard";
import { render, revealDuration } from "./ui";
import { solutions, validWords } from "./words";

const root = document.querySelector<HTMLDivElement>("#app")!;

const randomPuzzle = () => newPuzzle(solutions[Math.floor(Math.random() * solutions.length)], validWords);

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
