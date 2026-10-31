import type { SolutionEntry } from "./game/draw";

const url = (file: string) => `${import.meta.env.BASE_URL}${file}`;

async function fetchOk(file: string): Promise<Response> {
  const response = await fetch(url(file));
  if (!response.ok) throw new Error(`${file}: ${response.status}`);
  return response;
}

export async function loadSolutions(): Promise<SolutionEntry[]> {
  return (await fetchOk("solutions.json")).json();
}

// One word per line, already in normal letter form (no sofit).
export async function loadGuesses(): Promise<Set<string>> {
  const text = await (await fetchOk("guesses.txt")).text();
  return new Set(text.split("\n").filter((w) => w.length > 0));
}

// Meanings by Solution; fetched on the end screen only. A Solution may have none.
export async function loadDefinitions(): Promise<Record<string, string>> {
  return (await fetchOk("definitions.json")).json();
}
