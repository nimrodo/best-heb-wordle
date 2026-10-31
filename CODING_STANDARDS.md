# Coding standards

Read during review. TypeScript: `npm run typecheck` and `npm test` must pass.

- Game rules live in `src/game/` as pure, DOM-free functions. `src/ui.ts` renders state and owns animation timing; `src/main.ts` wires events and holds the single mutable state.
- Letters are stored in normal form; sofit is a display matter (`displayLetter`).
- Use the `GLOSSARY.md` terms in names, comments and copy (Puzzle, Solution, Guess).
- Hebrew copy avoids gendered imperatives (spec #15).
- Timing values live in one named constant; if CSS must repeat one, say so in a comment next to it.
- Game logic changes are test-first (`src/game/*.test.ts`). Render, CSS and animation are checked by hand.
