import "@fontsource/rubik/hebrew-400.css";
import "@fontsource/rubik/hebrew-600.css";
import "@fontsource/rubik/hebrew-800.css";
import "./style.css";
import { isHardSolution, type SolutionEntry } from "./game/draw";
import {
  abandonOutcome,
  type GameEvent,
  type GameState,
  isOpeningCombo,
  newPuzzle,
  reduce,
  restorePuzzle,
} from "./game/game";
import { eventFromKeyboard, eventFromKeyName } from "./game/keyboard";
import { currentStats, drawFromStorage, type EndResult, loadStore, saveStore } from "./game/persistence";
import { checkSendWord, decodeLinkId, decodeWord, encodeWord, newLinkId } from "./game/sent";
import { recordLoss, recordWin } from "./game/stats";
import { canShare, type EndView, type Overlay, render, revealDuration, showHeart, showToast } from "./ui";
import { loadDefinitions, loadGuesses, loadSolutions } from "./words";

const root = document.querySelector<HTMLDivElement>("#app")!;

const solutions = await loadSolutions();
// Until the full Guess list arrives, only Solutions are known words.
let words: ReadonlySet<string> = new Set(solutions.map((s: SolutionEntry) => s.word));
let loading = true;

let store = loadStore(localStorage);

// Names the Puzzle in progress, so its result counts once even when it is finished in several tabs.
let puzzleId: string;
const newPuzzleId = (): string => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

const guessesLoaded = loadGuesses();

type SentLink = { word: string; linkId: string | null };

// A Sent Puzzle is neither drawn from the Solution list nor marked in the played pool;
// the list is only read to tell whether its word is Hard.
// A link with an id counts once however often it is opened; one without (sent before ids) counts each time.
function sentPuzzle({ word, linkId }: SentLink): GameState {
  puzzleId = linkId === null ? newPuzzleId() : `link-${linkId}`;
  return newPuzzle(word, words, { hard: isHardSolution(word, solutions), loading, sent: true });
}

function randomPuzzle(): GameState {
  const drawn = drawFromStorage(localStorage, store, solutions, Math.random);
  store = drawn.store;
  puzzleId = newPuzzleId();
  const { entry } = drawn;
  return newPuzzle(entry.word, words, { hard: entry.hard, loading });
}

const LINK_PARAM = "w";
const LINK_ID_PARAM = "i";
const TOAST_BAD_LINK = "הקישור אינו תקין, מתחילים חידה רגילה";
const TOAST_COPIED = "הקישור הועתק";
const TOAST_COPY_FAILED = "ההעתקה לא הצליחה";
const SHARE_TEXT = "הכנתי לך חידה בוורדל";

// A link is consumed on arrival: it leaves the address bar, so a reload does not replay it.
// Its word is only trusted once it is checked against the full Guess list, so that is awaited.
// Returns the sent link, null when there is no link, or "bad" when the link is unusable.
async function takeLink(): Promise<SentLink | null | "bad"> {
  const url = new URL(location.href);
  const payload = url.searchParams.get(LINK_PARAM);
  if (payload === null) return null;
  const linkId = decodeLinkId(url.searchParams.get(LINK_ID_PARAM));
  url.searchParams.delete(LINK_PARAM);
  url.searchParams.delete(LINK_ID_PARAM);
  history.replaceState(null, "", url);
  const word = decodeWord(payload);
  if (word === null) return "bad";
  try {
    words = await guessesLoaded;
    loading = false;
  } catch (error) {
    console.error("Failed to load the Guess list", error);
    return "bad";
  }
  return words.has(word) ? { word, linkId } : "bad";
}

const incoming = await takeLink();
let pendingSent: SentLink | null = null;

// A finished Puzzle's result waits here for the next persist(), which adds it to the freshly read stats.
let endResult: EndResult | undefined;

// The Puzzle in progress is saved after every change, so a reload restores it.
function persist(): void {
  const { solution, hard, sent, guesses, current } = state;
  const puzzle = { id: puzzleId, solution, hard, sent, guesses: guesses.map((g) => g.word), current };
  store = saveStore(localStorage, { ...store, puzzle }, endResult);
  endResult = undefined;
}

const restored = store.puzzle ? restorePuzzle(store.puzzle, words, { loading }) : null;
// A restored Puzzle keeps its id, so the tabs that restored it share one result.
puzzleId = store.puzzle?.id ?? newPuzzleId();
const sentWord = incoming && incoming !== "bad" ? incoming : null;
// A link replaces a finished, missing or untouched Puzzle at once; one with Guesses waits for the abandon question.
const askFirst = sentWord !== null && restored?.status === "playing" && restored.guesses.length > 0;
let state: GameState = askFirst || !sentWord ? (restored ?? randomPuzzle()) : sentPuzzle(sentWord);
if (incoming === "bad") state = { ...state, toast: TOAST_BAD_LINK };
// Input is ignored while a submitted Guess is being revealed.
let revealing = false;

// The end sheet opens this long after the last tile settles.
const END_SHEET_DELAY_MS = 600;
const freshView = (): EndView => ({ sheet: "pending", meaning: null, overlay: null });
let view = freshView();
let sheetTimer: ReturnType<typeof setTimeout> | undefined;

function openEndSheet(): void {
  view = { ...view, sheet: "open", meaning: null };
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

// Stats are saved with the next persist(), in the same write as the finished Puzzle.
function recordEnd(): void {
  // Copied now: the closure runs in persist(), by which time `state` may already be the next Puzzle.
  const { status, hard } = state;
  const guessesUsed = state.guesses.length;
  endResult = {
    id: puzzleId,
    apply: (stats) => (status === "won" ? recordWin(stats, guessesUsed, hard) : recordLoss(stats, hard)),
  };
}

function startPuzzle(): void {
  clearTimeout(sheetTimer);
  state = pendingSent ? sentPuzzle(pendingSent) : randomPuzzle();
  pendingSent = null;
  view = freshView();
  persist();
  draw();
}

function dispatch(event: GameEvent): void {
  if (revealing || view.overlay) return;
  const before = state;
  state = reduce(state, event);
  if (before.status === "playing" && state.status !== "playing") recordEnd();
  persist();
  if (state.guesses.length > before.guesses.length) {
    revealing = true;
    // Show the board and keys as they were, with only the new row animating.
    render(root, { ...state, keys: before.keys, status: before.status }, view, { onKey, onSendWord: sendWord }, true);
    setTimeout(() => {
      revealing = false;
      draw();
      if (isOpeningCombo(state.guesses)) showHeart();
      if (state.status !== "playing") sheetTimer = setTimeout(openEndSheet, END_SHEET_DELAY_MS);
    }, revealDuration());
  } else draw();
}

function onKey(key: string): void {
  if (revealing) return;
  if (key === "new") askBeforeNewPuzzle();
  else if (key === "abandon") abandonPuzzle();
  else if (key === "dismiss") dismissEndSheet();
  else if (key === "send" || key === "send-again") setOverlay({ kind: "send", input: "", error: null, link: null });
  else if (key === "share") void shareLink();
  else if (key === "stats") openStats();
  else if (key === "how" || key === "about") setOverlay({ kind: key });
  else if (key === "close") setOverlay(null);
  else dispatch(eventFromKeyName(key));
}

// Other tabs may have saved results since this tab last did.
function openStats(): void {
  setOverlay({ kind: "stats", stats: currentStats(localStorage, store) });
}

// A Puzzle in progress is only given up after the player confirms.
function askBeforeNewPuzzle(): void {
  if (state.status === "playing") setOverlay({ kind: "confirm" });
  else startPuzzle();
}

// Closing the about sheet closes the whole help flow; "how" is the way back to the rules.
function setOverlay(overlay: Overlay | null): void {
  if (!overlay) pendingSent = null;
  view = { ...view, overlay };
  draw();
}

function sendWord(input: string): void {
  const check = checkSendWord(input, words);
  if (!check.ok) {
    setOverlay({ kind: "send", input, error: check.message, link: null });
    return;
  }
  const link = `${location.origin}${import.meta.env.BASE_URL}?${LINK_PARAM}=${encodeWord(check.word)}&${LINK_ID_PARAM}=${newLinkId()}`;
  setOverlay({ kind: "send", input, error: null, link });
}

async function shareLink(): Promise<void> {
  if (view.overlay?.kind !== "send" || !view.overlay.link) return;
  const { link } = view.overlay;
  try {
    if (canShare()) await navigator.share({ text: SHARE_TEXT, url: link });
    else {
      await navigator.clipboard.writeText(link);
      showToast(TOAST_COPIED);
    }
  } catch (error) {
    // Closing the share sheet rejects with AbortError; that is not a failure.
    if (error instanceof DOMException && error.name === "AbortError") return;
    showToast(TOAST_COPY_FAILED);
  }
}

function abandonPuzzle(): void {
  if (abandonOutcome(state) === "lost") recordEnd();
  startPuzzle();
}

function dismissEndSheet(): void {
  view = { ...view, sheet: "dismissed" };
  draw();
}

function draw(): void {
  render(root, state, view, { onKey, onSendWord: sendWord });
}

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (view.overlay) return setOverlay(null);
    if (view.sheet === "open") return dismissEndSheet();
  }
  // Typing in the send sheet's word field is not Puzzle input.
  if (e.target instanceof HTMLInputElement) return;
  const event = eventFromKeyboard(e);
  if (!event) return;
  e.preventDefault();
  dispatch(event);
});

// The how-to-play sheet opens by itself on the first visit only.
if (!store.seenHowToPlay) {
  view = { ...view, overlay: { kind: "how" } };
  store = { ...store, seenHowToPlay: true };
}
persist();
// A link opened over a Puzzle in progress asks before replacing it.
if (askFirst) {
  pendingSent = sentWord;
  view = { ...view, overlay: { kind: "confirm" } };
}
// A restored Puzzle that had already ended shows its sheet at once.
if (state.status === "playing") draw();
else openEndSheet();

// Play starts at once; the Guess list swaps into the running Puzzle when it arrives.
guessesLoaded.then(
  (guesses) => {
    words = guesses;
    loading = false;
    state = { ...state, words, loading };
    if (!revealing) draw();
  },
  (error) => console.error("Failed to load the Guess list", error),
);
