# Existing Project Audit — v6.3 → v7

## Existing systems preserved and extended
- Character creator, random modes, zodiac, personality and talents
- Needs/HUD and age-aware developmental actions
- Money, savings, small stands and yard sales
- Family rules and deferred birthday/Christmas requests
- School subjects, exams, clubs and competitions
- NPC relationships and life log
- Phone ownership gate and early social systems
- Weather, travel, luck, mentality and health
- LocalStorage autosave/manual export/import/restart
- GitHub Pages static deployment workflow

## Major defects / structural problems found
- `day`-only timing could not represent realistic action durations or dated events.
- Delayed outcomes existed in several incompatible forms instead of one queue/calendar.
- Age Up could process a skipped year as hundreds of noisy routine days.
- Parent-managed childhood savings did not count toward purchases the child had saved for.
- Ownership existed simultaneously as counters, strings and phone state without a canonical detailed item record.
- Legacy contest timing could be ambiguous after save migration.
- Permission rules were partly duplicated across travel/purchases/phone/selling.
- Some long-term systems had visually correct UI but shallow/no scheduled consequences.
- Family relatives required a central classifier to prevent them from entering non-family romance/social matching.
- Inventory lifecycle lacked discard and several item-use categories.
- Holiday/request logic needed exact-date and one-time trigger testing.

## Approach
v7 keeps compatibility fields where useful but introduces structured canonical records for time, calendar, pending decisions and inventory. UI gating is paired with logic validation. Systems are connected through time costs, needs, money, relationships, memories, weather, calendar and delayed outcomes.


## Phase 0 audit (master specification) and Phase 1A status
A full requirement-traceability audit of the master specification was produced before coding (see the conversation record). Summary of confirmed issues and their status:

| Issue (verified in code during Phase 0) | Status |
|---|---|
| Fast Forward "Continue" only closed the dialog | **Fixed in 1B** (sessions keep the original target) |
| Parents sent household commands after moving out | **Fixed in 1A** |
| Studying with a teacher had no location/time/break check (found in 1A verification) | **Fixed in 1A** |
| School-event discovery worked during summer (found in 1A verification) | **Fixed in 1A** |
| Grandmother created in every family | Open — Phase 2B |
| Troublemaker shown as a skill level | **Phase 0 finding was wrong** — re-checked in 2A.6: Troublemaker is already 0–100 with labels and excluded from levels; now locked by `t_2a6` |
| Health tab only from 18 | **Fixed in 2A** (visible at every age, age-appropriate) |
| No social-invitation throttle | **Fixed in 1B** |
| Major bonus multiplies with the talent bonus (above the ~×1.5 cap) | Open — Phase 8 |
| School homework/assessments/clubs/contests during breaks | Verified correct; now covered by `t_context` |

| Unregistered contests marked "Missed" (3 places) | **Fixed in 1B** |

| No illness system (illness field never set) — found in 2A | **Fixed in 2A** (central illness engine) |
| "Checkup" cured illness instantly — found in 2A | **Fixed in 2A** (routine checkup or doctor visit; no instant cures) |
| Happiness vs Mood | Already separate (`S.wellbeing` long-term, `S.happiness` mood) — verified in 2A.6 |
