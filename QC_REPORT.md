# QC Report — Life Simulator v7.3 (batch A on top of v7.2 phases 1–5b)

## Method
The v7.1 report marked features PASS when buttons were wired. Real play still exposed lifecycle bugs, so this QC was redone **from the player's perspective**. Every check drives the real game in headless Chromium (`index.html` + `game.js`) and follows the full lifecycle: **create → display → interact → resolve → leave the active UI → persist after reload → never reappear**.

The two confirmed bugs were reproduced with the **original v7.1 code**, and those exact saves are used as fixtures (`qa/fixture_*_v71.json`).

**Result: 468 deterministic checks passed, 0 failed, plus the fuzz run (all invariants held over 840 random steps at six starting ages), with 0 JavaScript errors.** The QA harness runs with `?qa=1` so historical test dates remain valid; `t_creator.py` runs in normal player mode.

| Suite | Checks | Covers |
|---|---|---|
| `t_regress.py` | 16 | §50 kindergarten regression, v7.1 exam/calendar mismatch repair |
| `t_exam.py` | 34 | §51 take exam, §52 missed exam, make-up grant/deny branches |
| `t_day.py` | 29 | §121 Next Day, sleep/nap, school-day windows, homework lifecycle, kindergarten auto-decision, invitation expiry |
| `t_commit.py` | 24 | Club attendance/warnings/removal, contest attendance/no-show, absence → caregiver chain, Age Up year simulation |
| `t_balance.py` | 1 | Six consecutive Age Ups: grades/attendance stay plausible |
| `t_ui.py` | 50 | Education screen at 7 viewports, hero content, modals |
| `t_items.py` | 50 | §53 item tests, phone sync, slots, multiple ownership, books/rereading, diminishing returns, perishables, gifts, store, card fields, v7.1 item migration |
| `t_jordan.py` | 13 | Player's real v7.2 save: loads cleanly, primary-school name fixed, kindergarten graduation 2010, assessments de-stacked, interactive school day (check-in at 8:00, period timing, blocked home actions, lunch, dismissal) |
| `t_holidays.py` | 57 | §54 holiday dates by region (incl. Lunar 2007 VN/CN, fallback 2051, Easter ×4, UK/AU/CA/KR variants), one-time triggers, Halloween activities, seasonal shop, month grid/navigation/agenda/markers, forgotten Mother's Day, planner at 1920/1366, key switching, page height, no overflow at 1366/390 |
| `t_theme.py` | 30 | §55 default Light; Light/Dark/Life × 4 screens: no neutral-dark hardcoded surfaces in light themes and WCAG contrast ≥ 4.5:1 for body, headings, muted text, buttons, primary, active tab, tags, nav, needs, hero; persistence across reload (creator and in game); not stored in the save; quick toggle; Auto follows OS dark/light; nav and needs use the SVG icon set |
| `t_social.py` | 50 | §122 111-NPC name stress test (unique IDs, no duplicate full names, ≥35 distinct first names, sibling surnames, varied conventions, persistence after reload); VN family-first order and parents' own surnames; player-save name migration; §102 availability (school, night, busy modal with alternatives); §94–95 RSVP (accept with reason, calendar, attend with story, early cancel vs no-show, next-day confrontation, NPC invitation with deadline, Maybe expiry); §96 strict household denial with negotiate/defy; §120 club QC (open sign-up, decline, tryout scheduled, weak fail with component reason, recovery date, retry, diminishing practice, strong success with ladder rank, reputation, outcome history, resolved thread, election opponents, campaign, win sets Captain, loss with NPC winner and recovery, reload persistence, Journal, identity) |
| `t_romance.py` | 48 | **Safety**: 16-year-old cannot romance a 26-year-old (logic and UI), intimacy refused for minors at the logic level, minor romance menu without intimate options, minor date endings without kiss/invite, minors cannot sneak a partner over, unknown actions ignored safely; adult consent: a "no" is respected with trust up and no penalty, a mutual yes fades to black. **§119 Prom**: season, reject with reason, reason in outcome history, already-has-a-date refusal, ask another → crush accepts, free prep, hero on prom night, 6-stage night resolves, memory, no Due afterwards, NPC asks, "need time" expires and they ask someone else, alone / friends / skip (with alternative evening) all resolve. Dates/Valentine scenes; gifts (loved / already had one / awkward); neighborhood events with households and reputation; friend group; rival creation and evolution; NPC–NPC dating; narrated relationship actions; end-of-year awards; sneaking discovery |
| `t_creator.py` | 35 | Player mode: Surprise me fills all; each per-field Random changes only its field (name, birth date, place, gender, attraction, wealth, home, personality, talents); horoscope has no manual input, follows the birth date, and is correct at 6 cutoff dates; birth date limited to the current year, random dates in the current year, a typed 2005 date starts in the current year; city disabled until a country is chosen; country fills its cities; place stored as "City, Country"; no free-text birthplace; Fill the rest keeps typed values; Hanoi → VN profile; phone usable at 13; legacy message linked by ID and reply affects that friend (via the real Messages app path); person-window tiles on one row and memory dates on their own line. Run 4× consecutively to check stability |
| `t_schoolyear.py` | 33 | Grades 7–12: no prom in Grade 7; Junior Prom (Grades 8–9) and Prom (10–12) on the calendar from the first day, on a late-April Saturday; elections closed in Grades 7 and 9 and open in 8 and 10–12; school ends at 18 with a high-school graduation (no repeated Grade 12); six birthdays (incl. Apr 20, Apr 29, Dec 31) all get a prom inside the school year; Attendance is its own Education tab and is gone from Calendar History |
| `t_fuzz.py` | 7 | 840 random player clicks (ages 3–17, run per age pair) with reloads, Next Day, Age Up and heavy Money & Items use; cross-system + inventory invariants every 10 steps |

## Scenarios (selected)
**§50 Kindergarten.** v7.1 save: age 6, Grade 1, "Waiting for your preference". After load: Grade 1 intact; record `Superseded` / "Primary school age reached"; absent from Home and Calendar pending lists; journal entry kept; still resolved after reload; no errors. Normal flow: a 3-year-old who never answers → "Family discussing" after 14 days → family decides 2 days later.

**§51 Exam.** At 9:00 the hero shows the Math assessment with Preparation/Skill/Sleep/Stress and a Take Assessment button, and the calendar shows `Due`. After taking it: exam `Completed` with a score, calendar `Completed`, hero cleared, gone from the upcoming strip, notification `Resolved`, school day counted as attended. It cannot be taken twice, does not reappear the next day, and persists after reload.

**§52 Missed exam.** Doing nothing from 7:00 to 12:00 gives: exam `Missed`, calendar `Missed`, hero switches to "You missed Mathematics", teacher relationship reduced, `examsMissed = 1` and the school day marked absent. After three more days the consequence has **not** repeated; the follow-up is answerable during its 3-day window and expires afterwards. A make-up exam was both granted and denied across runs; a granted make-up replaces the original record.

**§121 Next Day.** A free Saturday advances with no warnings and shows the morning summary. On an exam day, a warning modal appears; Return keeps the day, and Advance anyway gives exam `Missed` and one absence, counted exactly once, waking the next morning. Reload keeps the state. Sleeping at 9 PM reaches the next morning; sleeping at 2 PM is a nap on the same day.

**School-day windows.** "Attend" at 11 PM gives no credit (day marked Missed). Arriving at 9:20 is marked `Tardy` and returns home at 3 PM. Absences schedule a delayed school notice.

**Homework.** Assigned → Late after the due date → Missing after the late window (not Late forever). Finishing it gives Submitted / Submitted late.

**Clubs.** Joining schedules a real session; a due session takes the hero; attending counts and schedules the next one. Telling the leader beforehand is `Excused`. Repeated no-shows → warning event; 4 in a row → `Removed` with no live sessions; persists after reload.

**Contests.** Registration alone gives no result; checking in runs the competition; absence gives `No-show` / "Did not attend".

**§46 Consequence chain.** The second absence → a caregiver conversation that evening (not instantly). The choice resolves with a narrative.

**§11 Age Up.** The year summary shows realistic attendance (91–97% across runs, with unexcused/excused/late days), completed and missed assessments, make-ups and homework. No past obligation is left active.

**UI** (1920×1080, 1440×900, 1366×768, 1180×820, 820×1180, 768×1024, 390×844): no horizontal overflow; subject name and teacher never touch; Skill/Prep/Exam spaced; subject buttons never overlap; due-assessment CTA in both the card and the hero; hero never empty.

**Fuzz invariants (never violated).** Exam/calendar status always agree; no active past calendar entries; no dangling "Attending"; no exam stuck "In progress"; no active kindergarten at 6+; no open event past expiry; no active notification for a resolved exam; no homework Late for more than 4 days; the hero never points at a resolved source; no duplicate or orphaned club sessions.

**Deployment.** `?smoke=1` passes; all paths relative; `.nojekyll` and the Pages workflow unchanged; localStorage save/reload verified in tests.

**Phase 2 items (§53 and related).** Buying 3 snack packs gives one stack ×3. Eating 25% leaves 2 unopened + 1 opened at 75%; half of what remains → 37.5%; "all" eats only the 37.5% (≈11 hunger, not a full serving); only the opened unit disappears. A toy survives 120 plays, loses under 15 points in the first 10, and eventually goes Good → Worn. Art supplies decrease per session, raise art skill and fun, and are removed at 0%. The water bottle drops 600 → 500 ml, stays when empty, an empty bottle gives no water, and Refill restores 600. Phone: after 25 uses inventory and Phone page match (97/97), and still match after repair (95/95); battery drains and charges. A second phone triggers the switch/keep/sell/give choice. Two books and two bikes can be owned. Sweater + raincoat + sunglasses + backpack can be worn together; a hoodie replaces only the sweater. Reading gains over six sessions in one day: 2.5 → 1.84 → 1.21 → 0.72 → 0.18 → 0.08. A book finishes after 4 sessions and rereading yields ~half. A sandwich goes stale, then is thrown out. Giving one greeting card from a stack of 2 raises trust. Store: category filter and a quantity purchase of 3 juice boxes. Cards: snack shows "2 unopened" (no condition), phone shows condition + battery, bottle shows ml. No overflow at 1440 and 390 px. The v7.1 item save (generated with the original code) migrates to: snacks ×3 stack, makeup 84% remaining, phone 83% = 83% (was 83 vs 100), one top equipped, all items with lifecycle metadata. Unused items age over years.

**Fuzz inventory invariants (never violated).** Phone item condition = phone page; at most one item per slot; quantities ≥ 1; no used-up supplies lingering; container contents within capacity; every item has a lifecycle.

**Phase 3 assertion updates (new design, not regressions):** taking an exam now leaves you checked in at school (`Attending`) instead of at 3 PM; arriving at 9:20 leaves the clock at 9:20 (tardy) and dismissal at 3 PM finalizes attendance; school-day contests run 13:00–15:00, so the attend/absent tests reach that slot; the shop, inventory and "Use your things" sections are reached through their sub-tabs; the calendar test checks that nothing is still *waiting* (the resolved kindergarten record legitimately shows in the day agenda as history).

**Phase 5b fuzz invariants:** a romantic partner is always age-appropriate (minor ↔ minor within 2 years, adult ↔ adult); prom never stuck in season after its date; neighborhood exists for ages 3+.

**Unreproduced flake:** in one of ~6 fuzz runs at ages 14→17, the state read immediately after a scripted page reload + "Load last" returned no life. Four instrumented reruns (step-level checks) did not reproduce it; save size was ~73 KB (far below quota). It is most likely a harness timing race around reload, but it is listed here rather than claimed fixed.

**Phase 5a fuzz invariants:** accepted plans always have a calendar entry and are never in the past; no election stuck in campaign after its date; no tryout stuck scheduled after its date; no duplicate NPC full names.

**Phase 3 fuzz invariants:** `Attending` only for today's school day during school hours while at School; no NPC event created between 9:30 PM and 6:30 AM.

## Bugs found during this QC and fixed
- v7.3 A2: high school repeated "Grade 12" at ages 17 and 18; school now ends after age 17.
- v7.3 A2: rolling assessments could land after the school year ended (seen as cancelled future exams in Recently resolved).
- v7.3 A2: an early version of the prom date rule ("at least 30 days after the year starts") left some birthdays with no prom that year; caught by the multi-birthday test.

**A2 test updates (new rules, not regressions):** the social suite's club and election scenario now runs in Grade 10 (Grade 9 cannot run). In the romance suite, the rival test picks an NPC you have not met (an existing neighbor correctly keeps their label), and the neighborhood check verifies the event kind and named households instead of matching keywords in the text.
- v7.3 A: the zodiac calculation (from the original code) returned Capricorn for every date after a sign's cutoff day; found while testing the new automatic horoscope.
- v7.3 A: the first version of legacy-message linking matched by first name only and attached a friend's message to Dad when they shared a first name; it now prefers non-family people with the matching role.
- Phase 5b (safety): the legacy romance action had no partner-age check. It was replaced by an age-gated system and covered by tests and a fuzz invariant.
- Phase 5b: the new NPC gift-reaction function initially had the same name as the existing player gift-reaction function (`giftReaction`) and would have silently overwritten it. It was renamed `npcGiftReaction`.
- Phase 5b: the neighborhood state was only created on the first neighborhood event; it is now created during reconciliation, including for old saves.
- Phase 5b: `romanceAction` crashed on an unknown action kind; it now ignores it safely.
- Phase 5a: name migration replaced a known friend's given name ("Mia" → "Léo") when it was not in the regional pool. Given names are now always kept.
- Phase 5a: parents could get cross-gender names (Mom "Nathan"); family members now use gendered family-name lists.
- Phase 5a: `addStagePeople` ran before name migration and added duplicate neighbors/classmates to old saves; migration now runs first.
- Phase 5a: retrying a failed tryout returned the old record instead of scheduling a new attempt.
- Phase 5a: `minutesUntil` was referenced but never defined (plan cancellation crashed).
- Phase 4: the Life theme's pink primary button measured **4.19:1** (below AA); the accent was darkened to #c2336d (≈5.3:1).
- Phase 4: switching themes briefly showed the previous theme's colors on buttons (CSS transitions); transitions are now suppressed for one frame during a switch.
- Phase 4: the SVG sprite's `i-family` id collided with the Identity panel's `i-family` element, which blanked the Family field and hid the nav icon. Sprite ids now use the `ico-` prefix.
- Phase 3: reordering the Education screen initially targeted the kindergarten branch (identical markup), which produced a `rec` initialization error for 3-year-olds. The fuzzer caught it; it is fixed and covered.
- Age Up marked every school day absent (end-of-day processing took the "missed" path instead of simulation).
- "Attend school" at 11 PM left the day "Scheduled" until time passed.
- Simulated exams dragged grades down every year; they now assume a typical year of study, and attendance slowly builds skill.

## Known limitations
- Nothing in the game currently makes the character ill, so "excused for illness" only occurs in Age Up simulation and on approved family trips.
- School breaks are fixed (Dec 23–Jan 2, Jun 12–Aug 24, northern-hemisphere style). Regional calendars come with the holiday engine.
- Inventory: the gift reaction system is basic (price/personal/wear/sentiment). NPC interests and occasion-awareness come with the social phase. Item uses are not yet tied to clubs/tryouts.
- Holidays: school breaks are still a fixed northern-hemisphere schedule; Thanksgiving/Lunar New Year days off are not yet school holidays. A family cannot yet change which holidays it observes from the UI (the profile supports overrides).
- School: kindergarten days still resolve in one step; the interactive timetable starts in Grade 1.
- Themes: contrast was measured on the main screens; rarely seen modals and phone apps were reviewed visually but not measured. Item/holiday emoji remain (by design).
- Romance/social: NPCs date each other abstractly (by name) rather than as fully simulated couples. Friend groups are limited to one group. Adult characters do not yet have a housing system, so adult sneaking-in is not modeled. The romance opt-out exists in the save (`S.romance.optOut`) but has no settings toggle yet.
- All spec phases (1–5b) are now implemented. Remaining work is depth and balance tuning rather than missing systems.
- Tests use a QC-only clock jump (`setClock`). In normal play time always passes through the processors; a few test-only artifacts (e.g. homework shown "Late" right after a jump) do not occur in real play.

## Running QC
Install Playwright with Chromium (`pip install playwright && playwright install chromium`), then from `qa/` run e.g. `python3 t_exam.py`. If needed, change `URL` and `CHROME` in `qa/harness.py` to match your setup.
