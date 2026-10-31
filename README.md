# Hebrew Wordle

A Wordle-style word-guessing game in Hebrew, made for one player to enjoy as many puzzles per day as she likes.

Play it: https://nimrodo.github.io/best-heb-wordle/

## How it plays

- Each Puzzle hides a five-letter Hebrew Solution; you get six Guesses. Tiles show whether a letter is in the right place, in the word elsewhere, or absent, by shape as well as colour.
- There is no daily limit. A new Puzzle starts whenever you ask, and every Solution is used once before any repeats.
- Some Solutions are marked **Hard**: valid but uncommon words, flagged so the player is not surprised.
- Any real word is accepted as a Guess, including forms with a Prefix letter attached (לבית), but a Solution is never a Prefix-attached form.
- Letters are typed in their normal form; final letters (ך ם ן ף ץ) appear only in the last tile.
- When a Puzzle ends, a sheet shows the result and, for some words, a short Meaning.
- Stats and the win Streak are kept on your device only (`localStorage`). A Puzzle in progress survives a reload. There is no account, server or tracking.
- Wrong or mislabelled words can be reported from the game through a prefilled GitHub issue.

The project's terms (Puzzle, Solution, Guess, Hard word, Streak, …) are defined in [`GLOSSARY.md`](GLOSSARY.md).

## Word lists

All lists are static files in `public/`, built offline by the [`pipeline/`](pipeline) and committed. The pipeline is not run in CI.

| File | What it holds | Source |
|---|---|---|
| `guesses.txt` | Every accepted Guess | Hspell 1.4 with prefix rules, plus common spelling variants |
| `solutions.json` | The Solution pool, each flagged Hard or Common | Hspell forms filtered by OpenSubtitles frequency, a blocklist, and prefix and variant checks; plus a hand-checked list of extra Hard words (`pipeline/book_hard.txt`) |
| `definitions.json` | Meanings for some Solutions | Hebrew Wiktionary (CC BY-SA 4.0) |

See [`pipeline/README.md`](pipeline/README.md) for the exact rules and how to rebuild.

## Development

Requires Node.js and npm. The pipeline additionally uses [`uv`](https://docs.astral.sh/uv/).

```sh
npm install
npm run dev        # start the Vite dev server
npm test           # run tests (Vitest)
npm run typecheck  # TypeScript only
npm run build      # typecheck and build to dist/
```

```text
src/game/   game rules as pure functions: scoring, input, stats, persistence, drawing a Puzzle
src/ui.ts   renders state and owns animation timing
src/main.ts wires events and holds the single mutable state
public/     the word lists above
pipeline/   Python (uv) scripts that build them
```

Pushes to `main` deploy to GitHub Pages via `.github/workflows/deploy.yml`, which also runs the tests on pull requests. Review standards are in [`CODING_STANDARDS.md`](CODING_STANDARDS.md); notes for contributors and agents are in [`docs/`](docs).

## Licence

The code is [AGPL-3.0-only](LICENSE). `public/definitions.json` is derived from Hebrew Wiktionary and is licensed [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/); see [`pipeline/README.md`](pipeline/README.md#licence) for the attribution.
