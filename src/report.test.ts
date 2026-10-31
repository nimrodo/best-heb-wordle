import { describe, expect, it } from "vitest";
import { reportUrl } from "./report";

describe("reportUrl", () => {
  it("opens the word-report form on the repo's issue tracker", () => {
    const url = new URL(reportUrl("שולחן"));
    expect(url.origin + url.pathname).toBe("https://github.com/nimrodo/best-heb-wordle/issues/new");
    expect(url.searchParams.get("template")).toBe("word-report.yml");
  });

  it("prefills the word field and the title", () => {
    const url = new URL(reportUrl("שולחן"));
    expect(url.searchParams.get("word")).toBe("שולחן");
    expect(url.searchParams.get("title")).toBe("דיווח על מילה: שולחן");
  });
});
