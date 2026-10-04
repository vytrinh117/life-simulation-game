# Life Simulator — Living World v7.2

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


## v7.1 focused fixes
Daily Life now uses developmental activity sets for infants/toddlers/children, minors require caregiver permission for household electronics and stove use, radio provides a non-screen music/news option, the duplicate World-panel log was removed, and the desktop sidebar now scrolls/sticks as one unit without overlapping Identity.


## v7.2 (phases 1–5b)
State-lifecycle overhaul: pending decisions, assessments, homework, school days, club sessions, contests, events and notifications all reach a final state, and related UI/state always agree. Adds **Next Day** (separate from Age Up), sleep-into-morning, bedtimes, missed-obligation consequences with delayed follow-ups, and an Age Up year summary. Phase 2 adds item lifecycles (portions, supplies, containers, condition/aging, devices with battery, progress items, perishables), stacks and multiple ownership, equipment slots, practice skills with diminishing returns, a canonical phone record, and a redesigned inventory and shop. See `CHANGELOG.md`, `MIGRATION_NOTES.md` and `QC_REPORT.md`. The automated QC scripts and v7.1 bug fixtures are in `qa/` (not needed for deployment).

Phase 3 adds the interactive school day (check in, then period-by-period choices), graduation milestones, numbered sub-tabs (keys 1–4, N = next day), a month calendar with a Life Planner, and a region-aware holiday engine with real activities.

Phase 4 adds Light (default) / Dark / Auto / Life themes built on semantic CSS tokens, and a local SVG icon set for navigation, needs and top-bar controls.

Phase 5a gives NPCs unique, culturally-appropriate full names, households, schedules and goals; adds invitations/RSVP with deadlines and consequences, house rules (curfew, permission, trust), club tryouts/auditions with reasons and recovery, position ladders, elections against NPCs, multi-dimensional school reputation, story threads and outcome history.

Phase 5b adds prom (multi-stage, with reasons, second chances and NPC agency), dates as scenes, age-gated romance with boundaries and consent (adult intimacy fades to black), sneaking out (friends only for minors), neighborhood households and events, friend groups, rivals, end-of-year awards, personality-aware gift reactions and narrated relationship actions.

## v7.3 complete
All v7.3 items are implemented: creator fixes, real school years with semesters and regional calendars, talents/levels/study rules/mood/anti-farming, school–home communication, climate weather and school closures, Fast Forward, scheduling with real answers and relationship tiers, birthdays, chats and calls, teen autonomy, summer programs and jobs, baking/wrapping/Valentine, family outings and trips, the full love progression, real NPC couples and families, the two-column person window, UI reorganization, small businesses, housing, university applications and funding, and adult careers. See CHANGELOG.md and QC_REPORT.md.
