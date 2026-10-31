import "@fontsource/rubik/hebrew-400.css";
import "@fontsource/rubik/hebrew-700.css";
import "./style.css";
import { newPuzzle, reduce, type GameEvent, type GameState } from "./game/game";
import { eventFromKeyboard } from "./game/keyboard";
import { render } from "./ui";
import { guesses, solutions } from "./words";

const root = document.querySelector<HTMLDivElement>("#app")!;

const randomPuzzle = () => newPuzzle(solutions[Math.floor(Math.random() * solutions.length)], guesses);

let state: GameState = randomPuzzle();

function dispatch(event: GameEvent): void {
  state = reduce(state, event);
  draw();
}

function onKey(key: string): void {
  if (key === "new") {
    state = randomPuzzle();
    draw();
  } else if (key === "enter" || key === "backspace") dispatch({ type: key });
  else dispatch({ type: "letter", letter: key });
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
