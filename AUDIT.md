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
