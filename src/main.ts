import "@fontsource/rubik/hebrew-400.css";
import "@fontsource/rubik/hebrew-700.css";
import "./style.css";
import { newPuzzle, reduce, type GameEvent, type GameState } from "./game/game";
import { eventFromKeyName, eventFromKeyboard } from "./game/keyboard";
import { render } from "./ui";
import { solutions, validWords } from "./words";

const root = document.querySelector<HTMLDivElement>("#app")!;

const randomPuzzle = () => newPuzzle(solutions[Math.floor(Math.random() * solutions.length)], validWords);

let state: GameState = randomPuzzle();

function dispatch(event: GameEvent): void {
  state = reduce(state, event);
  draw();
}

function onKey(key: string): void {
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
