import {
  MAX_GUESSES,
  TOAST_TOO_SHORT,
  WORD_LENGTH,
  displayLetter,
  type GameState,
  type Mark,
} from "./game/game";
import { KEY_ROWS } from "./game/keyboard";

export type Handlers = { onKey: (key: string) => void };

// Reveal timing. Tiles pop one after another (index 0 is the rightmost tile in RTL),
// and each tile takes its colour halfway through its own pop.
const STEP_MS = 280;
const POP_MS = 500;
const SWAP_MS = 250;
const REDUCED_FADE_MS = 150;
const WIN_STEP_MS = 80;

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// How long input stays locked while a Guess is revealed.
export function revealDuration(): number {
  return reducedMotion() ? REDUCED_FADE_MS : (WORD_LENGTH - 1) * STEP_MS + POP_MS;
}

type Row = { word: string; marks?: readonly Mark[]; reveal?: boolean; shake?: boolean; win?: boolean };

function tile(letter: string, index: number, row: Row): string {
  const text = letter ? displayLetter(letter, index) : "";
  const mark = row.marks?.[index];
  const delay = reducedMotion() ? 0 : index * STEP_MS;
  if (row.reveal) {
    // The mark class is added mid-pop by startReveal; until then the tile looks like a typed one.
    return `<div class="tile filled reveal" style="--d:${delay}ms" data-mark="${mark}">${text}</div>`;
  }
  const state = mark ?? (letter ? "filled" : "");
  const cls = row.win ? `${state} win` : state;
  const style = row.win ? ` style="--d:${index * WIN_STEP_MS}ms"` : "";
  return `<div class="tile ${cls}"${style}>${text}</div>`;
}

function board(state: GameState, revealing: boolean): string {
  const rows: string[] = [];
  const lastGuess = state.guesses.length - 1;
  for (let r = 0; r < MAX_GUESSES; r++) {
    const guess = state.guesses[r];
    const typing = r === state.guesses.length;
    const row: Row = {
      word: guess?.word ?? (typing ? state.current : ""),
      marks: guess?.marks,
      reveal: revealing && r === lastGuess,
      shake: typing && state.toast === TOAST_TOO_SHORT,
      win: !revealing && state.status === "won" && r === lastGuess,
    };
    const tiles = Array.from({ length: WORD_LENGTH }, (_, i) => tile(row.word[i] ?? "", i, row));
    rows.push(`<div class="row${row.shake ? " shake" : ""}">${tiles.join("")}</div>`);
  }
  return rows.join("");
}

function lives(spent: number): string {
  return Array.from({ length: MAX_GUESSES }, (_, i) => `<i${i < spent ? ' class="spent"' : ""}></i>`).join("");
}

function startReveal(root: HTMLElement): void {
  const instant = reducedMotion();
  root.querySelectorAll<HTMLElement>(".tile.reveal").forEach((el, i) => {
    setTimeout(() => el.classList.add(el.dataset.mark!), instant ? 0 : i * STEP_MS + SWAP_MS);
  });
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

// While a Guess is being revealed the caller passes the state from before it, with that
// Guess's row marked as revealing: the keys, lives and end banner only catch up afterwards.
export function render(root: HTMLElement, state: GameState, handlers: Handlers, revealing = false): void {
  const spent = state.guesses.length - (revealing ? 1 : 0);
  root.innerHTML = `
    <header><div class="lives" aria-hidden="true">${lives(spent)}</div><h1>וורדל</h1></header>
    <div class="toast${state.toast ? " show" : ""}" role="status">${state.toast ?? ""}</div>
    <div class="board">${board(state, revealing)}</div>
    <div class="banner">${banner(state)}${state.status === "playing" ? "" : ' <button data-key="new">משחק חדש</button>'}</div>
    <div class="keyboard">${keyboard(state)}</div>`;
  if (revealing) startReveal(root);
  root.querySelectorAll<HTMLButtonElement>("[data-key]").forEach((button) => {
    button.addEventListener("click", () => {
      handlers.onKey(button.dataset.key!);
      button.blur();
    });
  });
}
