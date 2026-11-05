import { describe, expect, test } from "vitest";
import { TOAST_NOT_IN_LIST, TOAST_TOO_SHORT } from "./game";
import {
  checkSendWord,
  decodeLinkId,
  decodeWord,
  encodeWord,
  newLinkId,
  TOAST_BAD_CHARACTER,
  TOAST_TOO_LONG,
} from "./sent";

const words = new Set(["שלום", "אשלגנ", "ולבית", "זריחת", "ספרימ"]);

describe("link payload", () => {
  test("round-trips a Hebrew word", () => {
    expect(decodeWord(encodeWord("ספרימ"))).toBe("ספרימ");
  });

  test("round-trips a word ending in a letter that has a final form", () => {
    expect(decodeWord(encodeWord("אשלגנ"))).toBe("אשלגנ");
  });

  // Links already sent live in chats and bookmarks, so the format must never change: these
  // literals were produced by the first release and have to keep decoding to the same word.
  test.each([
    ["ספרימ", "S9cPh2M"],
    ["אשלגנ", "WtobjH0"],
    ["ולבית", "X88Wh3c"],
    ["זריחת", "XNseiXc"],
  ])("the link payload for %s stays %s", (word, payload) => {
    expect(encodeWord(word)).toBe(payload);
    expect(decodeWord(payload)).toBe(word);
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

  test.each(["שלומי1", "שלו מי", "שלום!", "shalom", "שלום "])("rejects stray character in %j", (input) => {
    expect(checkSendWord(input, words)).toEqual({ ok: false, message: TOAST_BAD_CHARACTER });
  });

  test("rejects a word longer than five letters", () => {
    expect(checkSendWord("שלומיים", words)).toEqual({ ok: false, message: TOAST_TOO_LONG });
  });

  test("accepts a niqqud-marked word", () => {
    expect(checkSendWord("שָׁלוֹם", words)).toEqual({ ok: false, message: TOAST_TOO_SHORT });
    expect(checkSendWord("אַשְׁלָגָן", words)).toEqual({ ok: true, word: "אשלגנ" });
  });
});

describe("link id", () => {
  test("a new id is url-safe and differs each time", () => {
    const id = newLinkId();
    expect(id).toMatch(/^[A-Za-z0-9_-]{8,32}$/);
    expect(newLinkId()).not.toBe(id);
  });

  test("a made id is read back as it is", () => {
    const id = newLinkId();
    expect(decodeLinkId(id)).toBe(id);
  });

  // Links sent before ids existed have none and must still open; they just count each time.
  test.each([null, "", "has space", "a/b", "x".repeat(33)])("a missing or unusable id %j reads as null", (raw) => {
    expect(decodeLinkId(raw)).toBeNull();
  });
});
