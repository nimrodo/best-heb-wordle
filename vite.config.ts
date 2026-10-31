import { configDefaults, defineConfig } from "vitest/config";

// GitHub Pages serves the project at /best-heb-wordle/, so assets need that base.
export default defineConfig({
  base: "/best-heb-wordle/",
  // Agent worktrees under .claude/ hold full copies of the repo; their tests are not ours.
  test: { exclude: [...configDefaults.exclude, ".claude/**"] },
});
