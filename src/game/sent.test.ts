import { describe, expect, test } from "vitest";
import { TOAST_NOT_IN_LIST, TOAST_TOO_SHORT } from "./game";
import { checkSendWord, decodeWord, encodeWord } from "./sent";

const words = new Set(["שלום", "אשלגנ", "ולבית", "זריחת", "ספרימ"]);

describe("link payload", () => {
  test("round-trips a Hebrew word", () => {
    expect(decodeWord(encodeWord("ספרימ"))).toBe("ספרימ");
  });

  test("round-trips a word ending in a letter that has a final form", () => {
    expect(decodeWord(encodeWord("אשלגנ"))).toBe("אשלגנ");
  });

  test("the payload is url-safe and does not contain the word", () => {
    const payload = encodeWord("ספרימ");
    expect(payload).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(payload).not.toContain("ספרימ");
  });

  test.each(["", "!!!", "abcdefg", "AAAAAA", encodeWord("ספרימ").slice(1), encodeWord("ספרימ") + "AA"])(
    "garbled or wrong-length payload %j decodes to null",
    (payload) => {
      expect(decodeWord(payload)).toBeNull();
    },
  );

  test("a payload that decodes to non-Hebrew bytes is null", () => {
    expect(decodeWord(btoa("hello").replace(/=+$/, ""))).toBeNull();
  });
});

describe("checkSendWord", () => {
  test("accepts a Guess list word and returns it in normal form", () => {
    expect(checkSendWord("אשלגן", words)).toEqual({ ok: true, word: "אשלגנ" });
  });

  test("accepts a Prefix-attached form and a Construct form", () => {
    expect(checkSendWord("ולבית", words)).toEqual({ ok: true, word: "ולבית" });
    expect(checkSendWord("זריחת", words)).toEqual({ ok: true, word: "זריחת" });
  });

  test("rejects a word outside the Guess list", () => {
    expect(checkSendWord("אבגדה", words)).toEqual({ ok: false, message: TOAST_NOT_IN_LIST });
  });

  test("rejects a short word", () => {
    expect(checkSendWord("שלום", words)).toEqual({ ok: false, message: TOAST_TOO_SHORT });
  });
});
