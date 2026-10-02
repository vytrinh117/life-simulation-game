# Life Sim

A static browser life-simulation game designed for GitHub Pages.

## GitHub Pages — recommended setup

This repository includes a GitHub Actions workflow at `.github/workflows/pages.yml`.

1. Put **all files and folders** from this project into the **root of your repository**.
2. Make sure the default branch is named `main` (or change the workflow branch if yours is different).
3. Go to **Settings → Pages**.
4. Under **Build and deployment → Source**, select **GitHub Actions**.
5. Push/commit the files. Open **Actions** and wait for `Deploy Life Sim to GitHub Pages` to finish.
6. GitHub will show the deployed Pages URL in the workflow and Pages settings.

Do not open the ZIP itself as the Pages source. Upload the contents of the ZIP into the repository.

## Alternative: Deploy from branch

If you prefer **Deploy from a branch**, select your `main` branch and `/ (root)`. `index.html` must be directly in the repository root, not inside another folder.

## Saves

- **Autosave:** browser localStorage every 30 seconds and after actions.
- **Save:** manual local save.
- **Export:** downloads a portable `.json` save file.
- **Import:** restores an exported `.json` save file.
- **Esc:** opens/closes the pause menu.
- **Restart / New Life:** returns to character creation.

Browser autosaves are tied to the browser/device. Use Export for a portable backup.
