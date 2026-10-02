# QC Report — Life Simulator v7.2 (phase 1)

## Method
The v7.1 report marked features PASS when buttons were wired. Real play still exposed lifecycle bugs, so this QC was redone **from the player's perspective**. Every check drives the real game in headless Chromium (`index.html` + `game.js`) and follows the full lifecycle: **create → display → interact → resolve → leave the active UI → persist after reload → never reappear**.

The two confirmed bugs were reproduced with the **original v7.1 code**, and those exact saves are used as fixtures (`qa/fixture_*_v71.json`).

**Result: 156 checks passed, 0 failed, 0 JavaScript errors** on the final build.

| Suite | Checks | Covers |
|---|---|---|
| `t_regress.py` | 16 | §50 kindergarten regression, v7.1 exam/calendar mismatch repair |
| `t_exam.py` | 29 | §51 take exam, §52 missed exam, make-up grant/deny branches |
| `t_day.py` | 29 | §121 Next Day, sleep/nap, school-day windows, homework lifecycle, kindergarten auto-decision, invitation expiry |
| `t_commit.py` | 24 | Club attendance/warnings/removal, contest attendance/no-show, absence → caregiver chain, Age Up year simulation |
| `t_balance.py` | 1 | Six consecutive Age Ups: grades/attendance stay plausible |
| `t_ui.py` | 50 | Education screen at 7 viewports, hero content, modals |
| `t_fuzz.py` | 7 | 840 random player clicks (ages 3–17) with reloads, Next Day and Age Up; cross-system invariants checked every 10 steps |

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

## Bugs found during this QC and fixed
- Age Up marked every school day absent (end-of-day processing took the "missed" path instead of simulation).
- "Attend school" at 11 PM left the day "Scheduled" until time passed.
- Simulated exams dragged grades down every year; they now assume a typical year of study, and attendance slowly builds skill.

## Known limitations
- Nothing in the game currently makes the character ill, so "excused for illness" only occurs in Age Up simulation and on approved family trips.
- School breaks are fixed (Dec 23–Jan 2, Jun 12–Aug 24, northern-hemisphere style). Regional calendars come with the holiday engine.
- Not yet implemented (later phases): inventory/item lifecycles (§12–23, 42–45), holiday engine and month calendar (§24–28, 48–49, 89–90), light/dark/auto themes and icon system (§29–31, 35), schedule-conflict choices (§28), and the social/story systems (§60–123).
- Tests use a QC-only clock jump (`setClock`). In normal play time always passes through the processors; a few test-only artifacts (e.g. homework shown "Late" right after a jump) do not occur in real play.

## Running QC
Install Playwright with Chromium (`pip install playwright && playwright install chromium`), then from `qa/` run e.g. `python3 t_exam.py`. If needed, change `URL` and `CHROME` in `qa/harness.py` to match your setup.
