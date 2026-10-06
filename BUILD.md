# Building game.js and style.css

`game.js` and `style.css` in the project root are **generated files** — they are what GitHub Pages serves.
Their sources are included so the build can be reproduced:

- `src/base/game.js` — the original v7.1 game script that the build patches.
- `src/modules/*.js` — the v7.2 / v7.3 / v7.3+ feature modules (e.g. `people73.js`, `friends73.js`, `narrative73.js`, `dev73.js`, `health73.js`, `family73.js`, `core72.js` …). Inside the generated `game.js` each module appears as a section with a header comment such as `// v7.3+ PHASE 3A.3 — Friendship ladder …`.
- `tools/splice.py` — applies targeted replacements to the base script, removes superseded functions, appends the modules in order and writes `game.js`.
- `src/style_before_theme.css` + `tools/theme.py` — produce `style.css`.

Rebuild (Python 3, from the project root):

```
python3 tools/splice.py
cp src/style_before_theme.css style.css && python3 tools/theme.py
node --check game.js      # optional syntax check
```

`data.js` and `index.html` are edited directly (not generated).
Edit `src/modules/` (or the build tools), then rebuild — do not hand-edit the generated `game.js`, or the next build will overwrite it.
