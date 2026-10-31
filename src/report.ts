const NEW_ISSUE = "https://github.com/nimrodo/best-heb-wordle/issues/new";

// Link to the "word-report" issue form (.github/ISSUE_TEMPLATE/word-report.yml), with the
// word prefilled. The form's field ids ("word") are the query parameter names GitHub reads.
export function reportUrl(word: string): string {
  const params = new URLSearchParams({
    template: "word-report.yml",
    title: `דיווח על מילה: ${word}`,
    word,
  });
  return `${NEW_ISSUE}?${params}`;
}
