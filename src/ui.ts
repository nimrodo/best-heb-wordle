import {
  MAX_GUESSES,
  WORD_LENGTH,
  displayLetter,
  type GameState,
  type Mark,
} from "./game/game";
import { KEY_ROWS } from "./game/keyboard";

export type Handlers = { onKey: (key: string) => void };

function tile(letter: string, index: number, mark?: Mark): string {
  const text = letter ? displayLetter(letter, index) : "";
  return `<div class="tile ${mark ?? (letter ? "filled" : "")}">${text}</div>`;
}

function board(state: GameState): string {
  const rows: string[] = [];
  for (let r = 0; r < MAX_GUESSES; r++) {
    const guess = state.guesses[r];
    const word = guess?.word ?? (r === state.guesses.length ? state.current : "");
    const tiles = Array.from({ length: WORD_LENGTH }, (_, i) => tile(word[i] ?? "", i, guess?.marks[i]));
    rows.push(`<div class="row">${tiles.join("")}</div>`);
  }
  return rows.join("");
}

const KEY_LABEL: Record<string, string> = { enter: "Enter", backspace: "⌫" };

function keyboard(state: GameState): string {
  return KEY_ROWS.map((row) => {
    const keys = row.map(
      (k) => `<button class="key ${state.keys[k] ?? ""}" data-key="${k}">${KEY_LABEL[k] ?? k}</button>`,
    );
    return `<div class="kb-row">${keys.join("")}</div>`;
  }).join("");
}

function banner(state: GameState): string {
  if (state.status === "won") return "כל הכבוד!";
  if (state.status === "lost") return `המילה הייתה: ${[...state.solution].map(displayLetter).join("")}`;
  return "";
}

export function render(root: HTMLElement, state: GameState, handlers: Handlers): void {
  root.innerHTML = `
    <h1>וורדל</h1>
    <div class="toast" role="status">${state.toast ?? ""}</div>
    <div class="board">${board(state)}</div>
    <div class="banner">${banner(state)}${state.status === "playing" ? "" : ' <button data-key="new">משחק חדש</button>'}</div>
    <div class="keyboard">${keyboard(state)}</div>`;
  root.querySelectorAll<HTMLButtonElement>("[data-key]").forEach((button) => {
    button.addEventListener("click", () => {
      handlers.onKey(button.dataset.key!);
      button.blur();
    });
  });
}
