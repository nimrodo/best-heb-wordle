# Why the stats screen stays at 2 wins / 2 losses


> Resolved in #86: Sent Puzzles now count, once per link. The "by design" statements below describe the code at `201aba9`, before that change.
Date: 2026-11-05. Method: static read of the code at `201aba9` (main), git history, GitHub issues #78 and #80 via `gh`.
I did not reproduce the report in a browser, and I did not have the user's actual `localStorage` contents.
There is no `docs/adr/` directory, so the only domain sources are `GLOSSARY.md` and the issues.

## Finding in one paragraph

In a single tab, playing ordinary random Puzzles, the current code should increment stats on every finish.
Every Puzzle gets a fresh, unique id, so the "first finish stands" check cannot swallow a different Puzzle's result.
So the code alone does not explain "many solved, still 2/2".
The likeliest explanations are the cases below, ranked by how well the code supports them.
None can be confirmed without the user's answers (see Open questions).

## How a result is recorded (end to end)

1. A Puzzle ends in `dispatch()` when `before.status === "playing" && state.status !== "playing"`, which calls `recordEnd()` (`src/main.ts:150`).
2. `recordEnd()` returns immediately for a Sent Puzzle (`src/main.ts:127`). Otherwise it builds `endResult = { id: puzzleId, apply }`, where `apply` is `recordWin(...)` for "won" and `recordLoss(...)` otherwise (`src/main.ts:129-134`).
3. Abandoning a Puzzle that has at least one Guess also calls `recordEnd()` (`src/main.ts:222-224`). `abandonOutcome` returns "lost" only if `status === "playing" && guesses.length > 0 && !sent` (`src/game/game.ts:104-106`).
4. The next `persist()` passes `endResult` to `saveStore` (`src/main.ts:86-91`).
5. `saveStore` re-reads storage, then counts the result only if `!stored.recorded.includes(endResult.id)` (`src/game/persistence.ts:95-103`). It keeps the stored `played`, applies the result to the stored stats, and appends the id to `recorded` (capped at 50, `persistence.ts:87`).
6. Storage is one JSON blob under the key `hebwordle:v1` (`persistence.ts:6`). `write()` swallows any `setItem` error (`persistence.ts:108-114`).
7. The stats screen reads `currentStats(localStorage, store)` when it is opened (`src/main.ts:179-181`, `persistence.ts:132-134`). "Played" is derived as wins plus losses (`src/game/stats.ts:47-48`).

## Do random or replayed Puzzles share an id?

No. `newPuzzleId()` is `Date.now().toString(36)-Math.random()...` (`src/main.ts:33`).
It is called for every new random Puzzle (`main.ts:47`), every Sent Puzzle (`main.ts:40`), and as a fallback at startup (`main.ts:95`).
A new Puzzle on "new" or abandon goes through `startPuzzle()` to `randomPuzzle()`, which assigns a new id before `persist()` (`main.ts:137-143`).
The abandon path captures the old id inside the `endResult` closure before the id changes (`main.ts:128-134`).
So the dedupe never merges two different Puzzles in one tab.

An id is shared only when a stored Puzzle is restored. The restore keeps the stored id: `puzzleId = store.puzzle?.id ?? newPuzzleId()` (`main.ts:95`).
This is how two tabs end up holding the same Puzzle. That is the case the dedupe is meant for (`GLOSSARY.md:8`, issue #80).

## Candidate root causes

### A. Sent Puzzles never count (by design)

Sent Puzzles are skipped on purpose (`main.ts:127`, `game.ts:105`).
`GLOSSARY.md:12` says they "do not count toward Streak or stats, even when abandoned".
If the user mostly solved links sent to them, or sent-word links they opened, the screen would legitimately stay unchanged.
Nothing in the UI says that the stats skip these Puzzles; I did not check the end sheet text.
This is the most likely cause if the user was playing sent words.

### B. Stale deployed build or a different origin (not a code bug now)

- The history shows stats bugs fixed very recently. #78 (`fa4c25d`) fixed one tab overwriting another tab's stats with a stale copy (issue #78 body, steps 1-3). #80 (`3d37772`, merged in PR #84 at 19:20 on 2026-11-05) added the "first finish stands" id check.
- The local `dist/` build was produced at 17:06 on 2026-11-05 (`ls -la dist`), before PR #84 merged. `dist/` is untracked, so I cannot tell what is deployed. Deploy runs on push to main (`.github/workflows/deploy.yml`), so Pages should be current if that run succeeded. I did not check the Actions run.
- A build from before #78 with several tabs open would lose results through last-write-wins. That would look like stats that do not move.
- `localStorage` is per origin. Playing on `localhost:5173`, `127.0.0.1`, and `https://nimrodo.github.io/best-heb-wordle/` keeps separate stats ([MDN: Window.localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage), "The keys and the values stored with localStorage are always in the UTF-16 string format... Data is specific to the origin"; [WHATWG HTML, Web storage](https://html.spec.whatwg.org/multipage/webstorage.html)). Solving on one origin and opening stats on another would show different numbers.

### C. Storage not persisting

- `write()` swallows quota and private-mode errors (`persistence.ts:108-114`, comment: "the game still plays, it just won't be remembered").
- If `setItem` fails every time, `readStore` returns null and `saveStore` falls back to the in-memory `store` (`persistence.ts:96`). Stats then grow within the session but are lost on reload.
- Stats are loaded from storage on startup (`main.ts:29`) and re-read when the stats screen opens (`main.ts:180`).
- A reload would then show the old numbers (here, 2/2). MDN documents that storage can be unavailable or cleared in private or restricted contexts ([MDN: Using the Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API)).
- A blob that fails validation (`isStore` / `isStats`, `persistence.ts:58-70`, `stats.ts:62-70`) is silently replaced with an empty store (`persistence.ts:81-84`). That would reset the stats to 0, not freeze them at 2/2.

### D. Same Puzzle finished in a second tab was already counted (by design)

Tab B restores the same Puzzle (same id). If tab B records it (finish or abandon with Guesses), tab A's later finish of that id is ignored (`persistence.ts:97`).
This is the "first finish stands" rule. It costs at most one result per shared Puzzle. It cannot explain "many" missing solves unless many Puzzles were each handled in two tabs.

### E. Not found

I found no code path that skips recording a random Puzzle finished in one tab. Cases I checked:

- Winning on the last Guess.
- A restored finished Puzzle (it is not re-recorded, and it is not counted twice).
- `endResult` being consumed by an earlier `persist()`. The `startPuzzle()` persist happens after the finish persist, and the closure copies the status and id first (`main.ts:128-130`).

I could not run a vitest simulation (running outside the repo root fails on a cache directory). Existing tests passed in the repo, 7 of 7 in the run I started.
This is a read-only review, so I did not add a regression test.

## By design or bug?

- Rules A and D are by design: `GLOSSARY.md:8` (Puzzle: "counts once ... the first finish stands") and `GLOSSARY.md:12` (Sent Puzzle).
- Issue #80 acceptance criteria require that "The first finish stands" and that "Sent Puzzles still never count".
- Nothing in the code or the issues I read says a random Puzzle finished in a single tab should be skipped, so if that is what happened it is a bug I could not locate.
- B and C are environment issues, not code logic bugs, but C is a UX gap: failures are silent.

## What the user likely expects

Every finished random Puzzle, win or loss, to bump "חידות" (played) and the distribution.
The user may also expect a Sent Puzzle to count; the glossary says it does not.

## Open questions for the user

1. Were the solved Puzzles random Puzzles or links sent by someone (Sent Puzzles)? Do you expect Sent Puzzles to count?
2. Which URL are you playing on (localhost, a preview, or the github.io site)? Is the stats screen opened on that same URL?
3. Are you playing in a private or incognito window, or with site data cleared on exit? Do the numbers reset after a reload?
4. Did the numbers stay at exactly 2 and 2 across reloads, or do they rise during a session and drop back on reload?
5. Is more than one tab open while you play? Which tab do you finish Puzzles in?
6. Was the deployed site updated after PR #84 (merged 2026-11-05 19:20)? Can you confirm the last Pages run succeeded?
7. Can you paste `localStorage["hebwordle:v1"]` (DevTools, Application, Local Storage)? The `stats`, `recorded` and `puzzle` fields would settle the question: `recorded` shows which Puzzle ids were counted.
