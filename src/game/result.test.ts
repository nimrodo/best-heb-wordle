import { describe, expect, test } from "vitest";
import { resultCopy } from "./result";

describe("resultCopy", () => {
  test.each([
    [1, "בול בפגז!"],
    [2, "מדהים!"],
    [3, "יפה מאוד!"],
    [4, "כל הכבוד!"],
    [5, "הצלחת!"],
    [6, "ברגע האחרון!"],
  ])("a win in %i Guesses gets its own headline", (used, headline) => {
    expect(resultCopy("won", used).headline).toBe(headline);
  });

  test("a win in one Guess uses the singular sub-line", () => {
    expect(resultCopy("won", 1).sub).toBe("מצאת את המילה בניחוש אחד");
  });

  test.each([2, 3, 6])("a win in %i Guesses names the count", (used) => {
    expect(resultCopy("won", used).sub).toBe(`מצאת את המילה ב־${used} ניחושים`);
  });

  test("a loss is gentle and has no sub-line of its own", () => {
    expect(resultCopy("lost", 6)).toEqual({ headline: "לא הפעם", sub: null });
  });
});
