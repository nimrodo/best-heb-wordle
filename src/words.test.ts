import { expect, test } from "vitest";
import guessesText from "../public/guesses.txt?raw";
import solutionsText from "../public/solutions.json?raw";
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

test("the pool has both Common and Hard words", () => {
  expect(solutions.some((s) => s.hard)).toBe(true);
  expect(solutions.some((s) => !s.hard)).toBe(true);
});

test("Prefix-attached forms and male/haser variants are accepted, non-words rejected", () => {
  expect(guesses.has("לבתימ")).toBe(true); // ל + בתים
  expect(guesses.has("קקקקק")).toBe(false);
});
