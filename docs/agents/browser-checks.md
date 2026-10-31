# Checking the UI in a browser

- Playwright is not an npm dependency; use the `mcp__plugin_playwright_playwright__*` tools (load them with ToolSearch). `browser_run_code_unsafe` runs a whole scripted check in one call.
- Start the dev server with `nohup npm run dev -- --port 5199 > <scratchpad>/vite.log 2>&1 &`, where `<scratchpad>` is the scratchpad directory from the environment. The app is served under `/best-heb-wordle/`.
- Playwright's `keyboard.press` rejects Hebrew keys. Click the on-screen keys instead: `page.click('[data-key="מ"]')`, plus `[data-key="enter"]` and `[data-key="backspace"]`.
- Check phone layout at 360x740, and compare `document.documentElement.scrollWidth` with 360 to catch horizontal scroll.
- Start from a clean slate with `localStorage.clear()` and a reload. The how-to-play sheet then opens over the board and blocks every click, so press `Escape` before the first key.
- Keys carry the normal-form letter, so the sofit key is `[data-key="נ"]`, not `ן`; type words as stored (אשלגנ).
- After `enter`, input is locked while the Guess is revealed. Wait 2.5 s before the next key, or the letters are dropped without an error.
