# Life Sim — Living World v4

A browser-based life simulation built as a static site for GitHub Pages.

## Start
Open `index.html` locally, or deploy the repository root with GitHub Pages. Click **BEGIN LIFE AT BIRTH** after creating a character.

## Save system
The game autosaves in browser local storage. Use Export Save for a portable JSON backup and Import Save to restore one.

## Main systems
School and exams, NPC relationships and memories, weather and gear, health, family/romance, career and money, travel/social media, luck/mentality, small-business stands, yard sales and negotiation, contextual events, and a persistent life log.

## QC note
The v4 rebuild fixes the v3 Begin Life runtime crash. `game.js` is syntax-checked before packaging. A `?smoke=1` query hook is included for automated browser startup checks.

See `CHANGELOG.md` for the detailed update history.

## v5 developmental simulation
Early-life actions are dependency-aware. Babies and toddlers receive caregiver-led actions; autonomy is learned through developmental skills. Kindergarten, playdates, household permission and childhood events are contextual rather than automatic.
See `CHANGELOG.md` for the full update log.
