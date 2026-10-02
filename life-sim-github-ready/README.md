# Life Sim

A static browser life-simulation game designed for GitHub Pages.

## Run locally

Open `index.html` in a browser, or serve the folder with any static server.

## GitHub Pages

1. Create a GitHub repository.
2. Upload `index.html`, `style.css`, and `game.js`.
3. In GitHub: **Settings → Pages**.
4. Select **Deploy from a branch**, choose your main branch and `/ (root)`.
5. Save. GitHub will give you the Pages URL.

## Saves

- **Autosave:** localStorage, every 30 seconds and after actions.
- **Save:** manual local save.
- **Export:** downloads a `.json` save file.
- **Import:** restores an exported `.json` file.
- **Esc:** opens/closes the pause menu.
- **Restart / New Life:** returns to character creation.
- The autosave is tied to the browser/site. Clearing browser site data can erase it, so use Export for a portable backup.

## Next expansion ideas

The architecture is intentionally simple so the simulation can grow: richer NPC memory, school systems, careers, businesses, relationships, phone apps, travel, health, family inheritance, events, and a deeper world simulation can be added without requiring a server.
