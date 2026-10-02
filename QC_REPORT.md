# QC Report — Life Simulator v7.2 (phases 1–3)

## Method
The v7.1 report marked features PASS when buttons were wired. Real play still exposed lifecycle bugs, so this QC was redone **from the player's perspective**. Every check drives the real game in headless Chromium (`index.html` + `game.js`) and follows the full lifecycle: **create → display → interact → resolve → leave the active UI → persist after reload → never reappear**.

The two confirmed bugs were reproduced with the **original v7.1 code**, and those exact saves are used as fixtures (`qa/fixture_*_v71.json`).

**Result: 271 deterministic checks passed, 0 failed, plus the fuzz run (all invariants held over 840 random steps at six starting ages), with 0 JavaScript errors** on the final build. All earlier suites were re-run after phase 3; assertions that encoded the old "jump to 3 PM" school behavior or single-page layout were updated to the new design (listed below).

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

**Phase 3 fuzz invariants:** `Attending` only for today's school day during school hours while at School; no NPC event created between 9:30 PM and 6:30 AM.

## Bugs found during this QC and fixed
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
- Not yet implemented (later phases): light/dark/auto themes and icon system (§29–31, 35), and the social/story systems (§60–123).
- Tests use a QC-only clock jump (`setClock`). In normal play time always passes through the processors; a few test-only artifacts (e.g. homework shown "Late" right after a jump) do not occur in real play.

## Running QC
Install Playwright with Chromium (`pip install playwright && playwright install chromium`), then from `qa/` run e.g. `python3 t_exam.py`. If needed, change `URL` and `CHROME` in `qa/harness.py` to match your setup.
