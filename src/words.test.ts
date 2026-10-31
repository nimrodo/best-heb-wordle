import { expect, test } from "vitest";
import guessesText from "../public/guesses.txt?raw";
import definitionsText from "../public/definitions.json?raw";
import solutionsText from "../public/solutions.json?raw";
import extraHardText from "../pipeline/book_hard.txt?raw";
import type { SolutionEntry } from "./game/draw";
import { WORD_LENGTH, normalise } from "./game/game";

const guesses = new Set(guessesText.split("\n").filter(Boolean));
const solutions: SolutionEntry[] = JSON.parse(solutionsText);

const isNormalForm = (word: string) => word.length === WORD_LENGTH && [...word].every((l) => normalise(l) === l);

test("every Solution is in normal letter form and is also a valid Guess", () => {
  for (const { word } of solutions) {
    expect(isNormalForm(word), word).toBe(true);
    expect(guesses.has(word), word).toBe(true);
  }
});

// definitions.json is one line, so a stray entry never shows up in a diff.
test("every Meaning belongs to a Solution", () => {
  const known = new Set(solutions.map((s) => s.word));
  for (const word of Object.keys(JSON.parse(definitionsText))) expect(known.has(word), word).toBe(true);
});

test("every hand-checked extra Hard word is a Solution", () => {
  const known = new Set(solutions.map((s) => s.word));
  const extras = extraHardText.split("\n").filter((l) => l && !l.startsWith("#"));
  for (const word of extras) expect(known.has(word), word).toBe(true);
});

test("the pool has both Common and Hard words", () => {
  expect(solutions.some((s) => s.hard)).toBe(true);
  expect(solutions.some((s) => !s.hard)).toBe(true);
});

test("Prefix-attached forms and male/haser variants are accepted, non-words rejected", () => {
  expect(guesses.has("לבתימ")).toBe(true); // ל + בתים
  expect(guesses.has("קקקקק")).toBe(false);
});
