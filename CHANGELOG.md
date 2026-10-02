# Life Sim — Update Log

## v4 — QC / Living World Expansion

### Critical fixes
- Fixed the **Begin Life** crash. New-character creation previously called the mentality calculator before the new game state existed.
- Reworked mentality initialization so it uses the character's selected personality directly and has no dependency on global state during creation.
- Added guarded startup error reporting so future initialization errors are shown in the creator instead of silently making the game appear frozen.
- Added v4 save migration defaults for all newly introduced simulation systems.
- Corrected People-panel interactions so **Spend time** and **Message** act on the person actually clicked.
- Replaced the yard-sale negotiation placeholder with a real offer/sale outcome.
- Removed an unused duplicate weather-purchase action path.
- Updated the save-storage key to v4 so broken experimental v3 state cannot poison a fresh v4 game.

### Simulation expansion
- Added **Family & Love** panel with family closeness/tension and emergent relationship possibilities.
- Added **Health** panel with overall health, fitness, sleep, checkups and mental-wellbeing actions.
- Added **Career & Money** panel with jobs, skill building, cash, savings and adult investing.
- Added **Travel & Social** panel with trip history, travel costs, online posts, followers and reputation.
- Expanded social interactions so NPC-specific messages and memories persist.
- Preserved and integrated weather, gear, school subjects/scores, exam countdowns, contests, clubs, luck, mentality, stands and yard sales.
- Selling now includes buyer offers, failed deals, price effects, quality, stock, luck and negotiation outcomes.

### QC
- `game.js` passes `node --check` after the rebuild.
- Added a `?smoke=1` startup hook that attempts to begin a new life and marks the page with `data-smoke=pass|fail` for browser-based regression testing.
- GitHub Pages workflow and `.nojekyll` remain included.

### Known development direction
The simulation is designed to keep expanding toward persistent NPC schedules, deeper romance/family histories, university, illness/hospital events, richer careers, businesses, property, inheritance, travel booking, entertainment/celebrity routes and long-running consequence chains.
