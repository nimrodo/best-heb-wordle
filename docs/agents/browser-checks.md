# Checking the UI in a browser

- Start the dev server with `nohup npm run dev -- --port 5199 > "$SCRATCHPAD/vite.log" 2>&1 &`. The app is served under `/best-heb-wordle/`.
- Playwright's `keyboard.press` rejects Hebrew keys. Click the on-screen keys instead: `page.click('[data-key="מ"]')`, plus `[data-key="enter"]` and `[data-key="backspace"]`.
- Check phone layout at 360x740, and compare `document.documentElement.scrollWidth` with 360 to catch horizontal scroll.
- macOS `sed -i` needs a suffix argument: `sed -i '' ...`.
