# Life Simulator — Living World v7

A static browser life simulator with age-aware everyday actions, real simulation time, calendar/deadlines, family permission and delayed decisions, school/exams/clubs, relationships/memories, shopping/inventory, phone ownership, weather, small business, work and aging.

## Run locally
Open `index.html` in a browser. For best storage behavior, serve the folder with any basic static server.

## GitHub Pages
Upload the **contents of this folder to the repository root** so `index.html`, `style.css`, `data.js` and `game.js` sit beside `.nojekyll`.

This build includes:

```text
index.html
data.js
game.js
style.css
.nojekyll
.github/
  workflows/
    pages.yml
```

In GitHub repository settings, set **Pages → Source = GitHub Actions**. Push to `main`; the included workflow publishes the repository root.

All runtime asset paths are relative, so project-site URLs such as `https://username.github.io/repository/` do not require hard-coded root paths.

## Saves
- Autosave uses browser `localStorage`.
- Manual Save writes immediately.
- Export creates a portable JSON save.
- Import accepts JSON saves.
- v7 attempts to migrate prior v6.x Life Simulator autosaves.
- Restart removes known Life Simulator save keys only after confirmation.

## Documentation
- `CHANGELOG.md` — feature/fix log
- `AUDIT.md` — findings from the v6.3 audit
- `AGE_ACTION_RULES.md` — life-stage eligibility design
- `MIGRATION_NOTES.md` — legacy save handling
- `QC_REPORT.md` — tests and known limitations
