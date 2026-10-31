import {
  MAX_GUESSES,
  TOAST_TOO_SHORT,
  WORD_LENGTH,
  displayLetter,
  type GameState,
  type Mark,
} from "./game/game";
import { KEY_ROWS } from "./game/keyboard";
import { resultCopy } from "./game/result";
import { hardLine, summarise, type Stats } from "./game/stats";
import { reportUrl } from "./report";

export type Handlers = { onKey: (key: string) => void };

// The end sheet: "pending" while the last tile settles, "open", then "dismissed" (the board
// stays visible and a new-Puzzle button replaces the keyboard). The Meaning is null when the
// Solution has none, or until definitions.json arrives.
// `overlay` is the one sheet open over the board and end sheet, if any: the abandon-Puzzle
// question over a Puzzle in progress, the stats snapshot, or the how-to-play sheet and the
// about sheet reached from it.
export type Overlay = { kind: "confirm" } | { kind: "stats"; stats: Stats } | { kind: "how" } | { kind: "about" };
export type EndView = {
  sheet: "pending" | "open" | "dismissed";
  meaning: string | null;
  overlay: Overlay | null;
};

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

type Row = { word: string; marks?: readonly (Mark | undefined)[]; reveal?: boolean; shake?: boolean; win?: boolean };

function tile(letter: string, index: number, row: Row): string {
  const text = letter ? displayLetter(letter, index) : "";
  const mark = row.marks?.[index];
  // Empty tiles carry no information, so screen readers skip them.
  const ariaAttrs = letter ? `role="img" aria-label="${describe(text, mark)}"` : 'aria-hidden="true"';
  const delay = reducedMotion() ? 0 : index * STEP_MS;
  if (row.reveal) {
    // The mark class is added mid-pop by startReveal; until then the tile looks like a typed one.
    return `<div class="tile filled reveal" style="--d:${delay}ms" data-mark="${mark}" ${ariaAttrs}>${text}</div>`;
  }
  const state = mark ?? (letter ? "filled" : "");
  const cls = row.win ? `${state} win` : state;
  const style = row.win ? ` style="--d:${index * WIN_STEP_MS}ms"` : "";
  return `<div class="tile ${cls}"${style} ${ariaAttrs}>${text}</div>`;
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

// Visible text of the special keys. Enter's text is its accessible name; the ⌫ symbol needs a spoken one.
const KEY_LABEL: Record<string, string> = { enter: "שליחה", backspace: "⌫" };
const KEY_NAME: Record<string, string> = { backspace: "מחיקה" };

// Screen-reader names for a Mark.
const MARK_NAME: Record<Mark, string> = { correct: "נכון", present: "במקום אחר", absent: "לא במילה" };

function describe(letter: string, mark?: Mark): string {
  if (!letter) return "ריק";
  return mark ? `${letter}, ${MARK_NAME[mark]}` : letter;
}

function keyboard(state: GameState): string {
  return KEY_ROWS.map((row) => {
    const keys = row.map((k) => {
      const label = KEY_NAME[k] ?? KEY_LABEL[k] ?? describe(k, state.keys[k]);
      return `<button class="key ${state.keys[k] ?? ""}" data-key="${k}" aria-label="${label}">${KEY_LABEL[k] ?? k}</button>`;
    });
    return `<div class="kb-row">${keys.join("")}</div>`;
  }).join("");
}

// Visible text of the Solution, with sofit letters restored.
const solutionText = (state: GameState) => [...state.solution].map(displayLetter).join("");

function announcement(state: GameState): string {
  if (state.status === "playing") return "";
  const { headline, sub } = resultCopy(state.status, state.guesses.length);
  return sub ? `${headline} ${sub}` : `${headline} המילה הייתה: ${solutionText(state)}`;
}

// Every sheet shares a backdrop that closes it, and (unless `closable` is false) a close button.
// `dismiss` is the key both send; `title` is the heading the dialog is labelled by, with element id `id`.
type Shell = { id: string; title: string; dismiss: string; cls?: string; role?: "dialog" | "alertdialog"; closable?: boolean };

function sheet({ id, title, dismiss, cls = "", role = "dialog", closable = true }: Shell, content: string): string {
  return `
    <div class="backdrop" data-key="${dismiss}"></div>
    <section class="${`sheet ${cls}`.trim()}" role="${role}" aria-modal="true" aria-labelledby="${id}">
      ${closable ? `<button class="sheet-close" data-key="${dismiss}" aria-label="סגירה">✕</button>` : ""}
      <h2 id="${id}">${title}</h2>
      ${content}
    </section>`;
}

function abandonDialog(): string {
  return sheet(
    { id: "confirm-title", title: "להתחיל חידה חדשה?", dismiss: "close", role: "alertdialog", closable: false },
    `<p class="sheet-sub">החידה הנוכחית תיחשב כהפסד.</p>
      <button class="new-puzzle" data-key="abandon">כן, חידה חדשה</button>
      <button class="secondary" data-key="close">להמשיך לשחק</button>`,
  );
}

function statsSheet(stats: Stats): string {
  const sum = summarise(stats);
  const tile = (value: number | string, label: string) =>
    `<div class="stat"><b>${value}</b><span>${label}</span></div>`;
  const most = Math.max(1, ...sum.distribution, sum.losses);
  const bar = (label: string, count: number, lost = false) =>
    `<div class="dist-row"><span>${label}</span><div class="dist-bar${lost ? " lost" : ""}" style="width:${Math.max(8, (count / most) * 100)}%">${count}</div></div>`;
  return sheet(
    { id: "stats-title", title: "הסטטיסטיקה שלי", dismiss: "close" },
    `<div class="stat-tiles">
        ${tile(sum.played, "חידות")}${tile(`${sum.winRate}%`, "אחוז הצלחה")}${tile(sum.streak, "רצף נוכחי")}${tile(sum.bestStreak, "רצף שיא")}
      </div>
      <div class="dist" aria-label="התפלגות הצלחות לפי מספר ניחושים">
        ${sum.distribution.map((n, i) => bar(String(i + 1), n)).join("")}${bar("✕", sum.losses, true)}
      </div>
      <p class="sheet-sub">${hardLine(stats)}</p>`,
  );
}

// Meanings are third-party text and go into innerHTML, so markup characters are escaped.
const escapeHtml = (text: string) =>
  text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

const SOURCE_URL = "https://github.com/nimrodo/best-heb-wordle";

// Example words are stored in normal form like every other letter; tile() restores the sofit.
const EXAMPLES: { word: string; index: number; mark: Mark; text: string }[] = [
  { word: "ספרימ", index: 0, mark: "correct", text: "האות ס במילה, ובמקום הנכון." },
  { word: "ילדימ", index: 1, mark: "present", text: "האות ל במילה, אבל במקום אחר." },
  { word: "פרחימ", index: 2, mark: "absent", text: "האות ח לא במילה." },
];

function exampleRow({ word, index, mark }: (typeof EXAMPLES)[number]): string {
  const marks = Array.from({ length: word.length }, (_, i) => (i === index ? mark : undefined));
  const tiles = [...word].map((letter, i) => tile(letter, i, { word, marks }));
  return `<div class="row example-row">${tiles.join("")}</div>`;
}

function howToPlaySheet(): string {
  return sheet(
    { id: "help-title", title: "איך משחקים", dismiss: "close", cls: "help" },
    `<ul class="rules">
        <li>לנחש את המילה הנסתרת בשישה ניחושים.</li>
        <li>כל ניחוש הוא מילה אמיתית בת חמש אותיות.</li>
        <li>אחרי כל ניחוש, האריחים מראים כמה קרוב הוא.</li>
      </ul>
      ${EXAMPLES.map((e) => `<div class="example">${exampleRow(e)}<p>${e.text}</p></div>`).join("")}
      <p class="sheet-note"><span class="hard-badge">מילה קשה</span> מילה נדירה יותר, והיא מסומנת מעל הלוח.</p>
      <button class="new-puzzle" data-key="close">הבנתי, מתחילים</button>
      <button class="link" data-key="about">אודות</button>`,
  );
}

function aboutSheet(): string {
  return sheet(
    { id: "about-title", title: "אודות", dismiss: "close", cls: "about" },
    `<p class="sheet-sub">קוד המקור פתוח ברישיון AGPL-3.0:<br><a href="${SOURCE_URL}" target="_blank" rel="noopener">github.com/nimrodo/best-heb-wordle</a></p>
      <ul class="credits">
        <li>רשימת המילים: Hspell</li>
        <li>שכיחות המילים: OpenSubtitles (CC BY-SA)</li>
        <li>הפירושים: ויקימילון העברי (CC BY-SA)</li>
      </ul>
      <button class="secondary" data-key="how">חזרה להסבר</button>`,
  );
}

const MEANING_CREDIT = "מקור: ויקימילון";

function endSheet(state: GameState, meaning: string | null): string {
  if (state.status === "playing") return "";
  const { headline, sub } = resultCopy(state.status, state.guesses.length);
  const solutionTiles = [...state.solution]
    .map((letter, i) => `<div class="tile correct" aria-hidden="true">${displayLetter(letter, i)}</div>`)
    .join("");
  const lost = state.status === "lost";
  return sheet(
    { id: "sheet-title", title: headline, dismiss: "dismiss" },
    `${sub ? `<p class="sheet-sub">${sub}</p>` : ""}
      ${lost ? `<p class="sheet-sub">המילה הייתה:</p>` : ""}
      ${lost ? `<div class="row solution-row" role="img" aria-label="${solutionText(state)}">${solutionTiles}</div>` : ""}
      ${state.hard ? '<span class="hard-badge">מילה קשה</span>' : ""}
      ${meaning ? `<p class="meaning">${escapeHtml(meaning)}</p><p class="credit">${MEANING_CREDIT}</p>` : ""}
      <button class="new-puzzle" data-key="new">חידה חדשה</button>
      <button class="link" data-key="stats">הסטטיסטיקה שלי</button>
      <a class="report" href="${reportUrl(solutionText(state))}" target="_blank" rel="noopener">דיווח על המילה</a>`,
  );
}

// The toast is a live region that outlives re-renders (it sits outside the app root), so
// screen readers announce each new message instead of seeing a fresh element every time.
function showToast(message: string | null): void {
  const toast = document.getElementById("toast")!;
  toast.classList.remove("show");
  toast.textContent = message ?? "";
  if (message) {
    void toast.offsetWidth; // restart the fade animation
    toast.classList.add("show");
  }
}

// The end-of-Puzzle result is announced through its own persistent live region; the visible
// sheet is re-rendered, so it cannot be one. Only a change of text is announced.
function announceResult(message: string): void {
  const region = document.getElementById("result")!;
  if (region.textContent !== message) region.textContent = message;
}

function overlayHtml(overlay: Overlay): string {
  switch (overlay.kind) {
    case "confirm":
      return abandonDialog();
    case "stats":
      return statsSheet(overlay.stats);
    case "how":
      return howToPlaySheet();
    case "about":
      return aboutSheet();
  }
}

// The safe choice gets focus in the abandon question; the end sheet focuses its new-Puzzle button.
function focusSelector(overlay: Overlay | null): string {
  switch (overlay?.kind) {
    case "confirm":
      return ".sheet .secondary";
    case "stats":
      return ".sheet .sheet-close";
    case "how":
    case "about":
      return ".sheet .new-puzzle, .sheet .secondary";
    default:
      return ".sheet .new-puzzle";
  }
}

// While a Guess is being revealed the caller passes the state from before it, with that
// Guess's row marked as revealing: the keys, lives and end sheet only catch up afterwards.
export function render(
  root: HTMLElement,
  state: GameState,
  view: EndView,
  handlers: Handlers,
  revealing = false,
): void {
  const spent = state.guesses.length - (revealing ? 1 : 0);
  root.innerHTML = `
    <header><div class="lives" aria-hidden="true">${lives(spent)}</div><h1>וורדל</h1><div class="header-end"><button class="icon" data-key="how" aria-label="איך משחקים"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="M9.2 9.3a2.9 2.9 0 1 1 4.2 2.6c-.9.5-1.4 1-1.4 2"/><circle cx="12" cy="17.3" r=".6" fill="currentColor"/></svg></button><button class="icon" data-key="stats" aria-label="סטטיסטיקה"><svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><rect x="3" y="12" width="4" height="9" rx="1"/><rect x="10" y="4" width="4" height="17" rx="1"/><rect x="17" y="9" width="4" height="12" rx="1"/></svg></button>${state.status === "playing" ? '<button class="icon" data-key="new" aria-label="חידה חדשה"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20 4v4.5h-4.5"/></svg></button>' : ""}</div></header>
    <div class="hard-slot">${state.hard ? '<span class="hard-badge">מילה קשה</span>' : ""}</div>
    <div class="board">${board(state, revealing)}</div>
    ${view.sheet === "dismissed" ? '<button class="new-puzzle bar" data-key="new">חידה חדשה</button>' : `<div class="keyboard">${keyboard(state)}</div>`}
    ${view.overlay ? overlayHtml(view.overlay) : view.sheet === "open" ? endSheet(state, view.meaning) : ""}`;
  showToast(state.toast);
  announceResult(announcement(state));
  if (revealing) startReveal(root);
  root.querySelector<HTMLElement>(focusSelector(view.overlay))?.focus();
  root.querySelectorAll<HTMLButtonElement>("[data-key]").forEach((button) => {
    button.addEventListener("click", () => {
      handlers.onKey(button.dataset.key!);
      button.blur();
    });
  });
}
