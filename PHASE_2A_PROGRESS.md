# PHASE 2A PROGRESS — Health, Illness, Medicine, School Nurse & Medical Care

**Status: COMPLETE** — all six checkpoints done; final acceptance scenario passes (`t_nurse` + `t_2a6`); full regression 35 suites / 1,013 checks; fuzz ages 6, 11, 16, 25.

## Phase goal
Health from birth; Looks and Smart; a centralized illness engine (symptoms, severity, recovery); a pharmacy with finite-use medicine in the existing inventory; school nurse with nurse passes that excuse specific periods; clinic/hospital/emergency distinction; excused sick days; Happiness vs Mood cleanup; Troublemaker as a reputation (no levels). Fast Forward and calendar integration. Final acceptance: the age-11 nurse → pickup → medicine → recovery scenario works end to end.

## Findings before coding (verified in code)
- `S.health` (0–100) already exists from birth, but the Health tab is only shown from 18 (`navItems`).
- `S.healthState = {fitness, sleep, illness}`; `illness` is a plain string that **nothing in the game ever sets** → there is no illness system yet. "I feel sick" (batch H) and "Call in sick" (V2) only look at low health.
- "Checkup" (`healthAction`) clears illness instantly (to be replaced: no instant cures).
- `S.familyName` already exists (phase 5a), derived once and stable; the creator only has a single name field.
- No medicine items in the catalog.

## Checklist
- [x] 2A.1 Health core + Looks + Smart + surname field + migration + Health visible by age
- [x] 2A.2 Illness / symptom / severity / recovery engine (+ sick actions, needs effects, known vs unknown condition)
- [x] 2A.3 Pharmacy + medicine items (2A.3a model/rules, 2A.3b store + inventory)
- [x] 2A.4 School nurse + nurse pass (excused periods) + go home sick + exams/clubs excused
- [x] 2A.5 Stay home / fake sick; clinic / hospital / emergency; costs by household; follow-up appointments
- [x] 2A.6 Happiness vs Mood; Troublemaker reputation; health UI; Fast Forward integration; full QC + final acceptance scenario

## Completed checkpoint
**2A.2** (2A.1 and 2A.2 done; ZIP `life-sim-v7_3-phase2A-checkpoint-2A2.zip`)

## Current checkpoint
2A.3 — not started

## Files changed
- `health73.js` (new): Looks/Smart helpers and labels, `ensurePlayerTraits`, `ensureNpcTraits`, `smartLearnFactor` (helper only, not applied yet — later phases), illness library `ILLNESSES` (10 types), `calculateIllnessRisk`, `tryStartIllness`, `startIllness`, `progressIllness`, `recoverIllness`, `illnessMorningEffects`, `healthDaily` (slow drift), `illnessFocusFactor`, `reliefActive` (used by medicine in 2A.3), sick actions (`sickRest`, `sickDrink`, `sickLightMeal`, `sickTellParent`), `careOptions`, `healthPanel73`, `conditionCardHtml`, `emergencyCare` (minimal; refine in 2A.5), `healthEventChoice`, `healthClick`, `healthDailyTick`.
- `growth73.js`: `concentration()` multiplied by `illnessFocusFactor()` (floor lowered to 0.3).
- `ident73.js`: `migrateIdentity` also runs `ensurePlayerTraits` and `ensureNpcTraits` (every reconcile, once-only values).
- `ff73.js`: `medicalEmergency` is a HARD interrupt; summary has a "Health" section (`ff.health`).
- `uni73.js`: event-choice chain routes `medicalEmergency` to health.
- `misc72.js`: daily chain calls `healthDailyTick` (progress → maybe start → morning effects → slow drift).
- `ui72.js`: click chain `healthClick`.
- `creator73.js` + `index.html`: Surname, Looks (0–100), Smart (0–100) fields with independent Random buttons; Identity card shows Looks, Smart, Health/condition.
- `tools/splice.py`: Health tab for every age; `healthPanel73`; creator values (surname → familyName, looks, smart) into the new life; Identity fill.

## Save migration completed?
Partially (2A.1): player `looks`, `smart`, `surname`/`firstName` and NPC `looks`/`smart` are generated once from a stable seed (never re-rolled). `S.healthState.condition/history/lastRecovered` are created lazily. Medicine migration: n/a until 2A.3.

## Tests added / passed
- `t_health.py` (23 checks) — passes (2 runs).
- Re-run on this checkpoint: `t_creator` 35, `t_growth` 28, `t_exam` 29, `t_ui` 50, `t_hij` 40, `t_work` 27, `t_jordan` 13, `t_regress` 16, `t_ff2` 18 — all pass.
- `t_ff2` "next month … every school day attended or excused" failed once (1 of 4 runs) right after it was tightened; three later runs passed. The test now prints the offending days' statuses if it happens again. Cause not confirmed.
- Not yet re-run on this checkpoint: the other 20 suites; no fuzz run on this checkpoint.

## Known remaining work
- 2A.3 Pharmacy: store category, medicine catalog items (finite uses, symptom categories, caregiver rules, prescription flag), `useMedicine` giving temporary relief (`condition.relief`) + `supported`, never curing; wrong/unneeded medicine = no benefit; minors: ask parent / parent gives.
- 2A.4 School nurse: location action at school only; assessment; nurse bed; **nurse pass** with excused periods; return to class / call caregiver / go home; exams → Excused/make-up; clubs → excused; no behavior/troublemaker effects.
- 2A.5 Morning "I feel sick" flow + fake sick using the real condition; clinic / hospital / emergency by severity; household cost tiers (covered / mostly / out-of-pocket, never blocking emergency care); follow-up appointment on the calendar; replace the instant-cure "Checkup".
- 2A.6 Happiness vs Mood cleanup; Troublemaker reputation without levels; health status in the hero; Fast Forward: illness summary lines verified + emergency hard interrupt test; full regression + fuzz; final acceptance scenario (age 11).

## 2A.3a (done in session 3, small due to session limit)
- `health73.js`: `MEDICINES` (Cold Relief, Fever/Pain Relief, Allergy Relief, Cough Relief, Stomach Relief, Bandages/First Aid — symptom categories, uses, price; no dosing), `MED_SELF_AGE=12`, `medicineHelps(kind)`, `applyMedicine(kind, by='self'|'caregiver'|'nurse')` → `{ok, why}`: relief ~6 h (`condition.relief`) + `supported` + care log; never ends the illness; refuses when not sick, wrong symptoms, a child self-medicating, or while the last dose still works.
- `tools/splice.py`: test hooks `applyMedicine`, `medicineHelps`, `reliefActive`.
- Test `t_med.py` (8 checks) passes; `t_health` re-run (23) passes.

## 2A.3b (done in session 4)
- `data.js`: six catalog items in a new **Pharmacy** category (`lifecycleType:'finite'`, `units` = uses, `medKind`, one use `takeMedicine` flagged `medicine:true`). Store shows the category automatically; minors buy through the existing permission flow.
- `inv72.js` `performItemUse`: a `medicine` use is routed to `useMedicineItem` (no generic effects).
- `health73.js`: `useMedicineItem(it,d)` — under 12 a caregiver at home gives it; `applyMedicine` decides; a use is consumed **only when it helped** (existing `remaining` % model: 100/units per use; `medicineUsesLeft`); the empty package is removed; `medicineItemsFor`.
- Tests: `t_med` 15 checks (pharmacy category; buy → money and 6 uses; not sick → nothing consumed; sick → relief, one use consumed, not cured; immediate reuse refused; last use removes the item; an 8-year-old's parent gives it). Re-run: `t_items` 50, `t_balance` 1, `t_health` 23, `t_jordan` 13, `t_regress` 16, `t_ui` 50 — all pass.
- Lesson: the inventory stores finite amounts as `remaining` (0–100 %), not unit counts; the first draft assumed a `units` field and was corrected to reuse the existing model.

## 2A.4 (done in session 4)
- `health73.js`: persistent school nurse staff record (`S.school.nurse`, "Nurse <surname>"); `canSeeNurse` (only while attending school and physically at school); `visitNurse` (asks the current teacher during class; not sick → back to class, no pass; assessment makes the condition known; emergency → emergency care; severe → recommend home; injury → first aid); `issueNursePass` (start, until, period ids, excused subjects, reason; marks periods `'excused'`; exams inside the window → `scheduleMakeupExam`); `nurseRest` (real time to the end of the pass, nurse may give a suitable medicine once, re-evaluates: mild → back to class, otherwise recommend home); `returnToClass`; `nurseCallCaregiver` (household adults by availability; nobody → rest at school, still excused); `finishSickDay` (remaining periods excused, later exams → make-up, school day `Excused` / "Sent home sick", today's club sessions `Excused`, location Home — never the penalized "left early"/skip paths); `sickAskMedicine` (parent gives owned medicine or buys it — household pays; waits if a dose is still working); `nurseHtml` + `nurseClick`.
- `tools/splice.py`: nurse card on the Education panel; test hooks. `ui72.js`: `nurseClick`.
- Found by `t_nurse`: the parent bought medicine even when the nurse's dose was still working (now waits).
- Tests: `t_nurse` 23 checks (core of the final acceptance scenario at age 11, plus nurse refused at home and not-sick → back to class). Re-run: `t_day` 30, `t_commit` 26, `t_exam` 30, `t_regress` 16, `t_jordan` 13, `t_health` 23, `t_med` 15, `t_ui` 50, `t_hij` 40, `t_items` 50 — all pass.

## 2A.5 (done in session 5)
- `health73.js`: care levels `CARE` (clinic 2 h, hospital 5 h, emergency 4 h, routine checkup), `coverageTier` (Covered / Mostly covered / Out-of-pocket by household wealth), `careCost`, `payCare` (minors/young adults at home → household pays; adults pay; no money → paid clinic refused but a free **community clinic** is offered; **hospital/emergency never refused** — unpaid amount becomes `S.finance.medicalDebt`), `visitCare(kind,{community})` (hospital refused for mild illness; condition known; clinic may give an abstract prescription — recovery ×1.2; hospital lowers severity; moderate+ books a follow-up), `scheduleFollowUp2`, `attendFollowUp`, `cancelFollowUpsOnRecovery` (called from `recoverIllness`), `morningSickDecision` (genuine: approval by severity, −12 if an exam is today; fake: belief from strictness/trust/exam, may be caught later), `healthFollowUp` (`fakeSickCaught` → trust −8, tension +4), `followUpTodayHtml`, care buttons in the condition card.
- `hij73.js`: `askStayHome` sick branch uses the real condition (`morningSickDecision`); excused reason "Sick day (parent approved)".
- `core72.js`: obligation type `medicalFollowUp` (due notification, missed → Missed, simulated → Attended).
- `sch73.js`: follow-up chain routes `fakeSickCaught`.
- `tools/splice.py`: the old instant-cure "Checkup" now calls `visitCare` (clinic when sick, routine checkup otherwise); hooks.
- Tests: `t_care` 22 (genuine sick day; fake believed → caught later; fake refused; mild → no hospital; clinic for moderate with follow-up; not cured; recovery cancels follow-up; severe → hospital; follow-up attended; missed follow-up resolves; adult cost; community clinic; hospital never refused → bill; checkup no instant cure; legacy flag). Test update: `t_hij` "really sick" now uses an actual illness instead of low health (the new rule). Re-run: `t_hij` 40, `t_health` 23, `t_nurse` 23, `t_med` 15, `t_work` 27, `t_regress` 16, `t_jordan` 13, `t_ui` 50, `t_day` 30, `t_exam` 31 — all pass.

## 2A.6 (done in session 6)
- **Findings (verified in code):** long-term Happiness and current Mood were already separate — `S.wellbeing` is long-term Happiness (moves ~4%/day toward mood) and `S.happiness` is current Mood (drifts every 2 h toward a baseline built from named reasons, now including "Feeling sick"). **Troublemaker already has no levels**: it is shown as 0–100 with a label, and level-up notices exclude it. The Phase 0 audit statement "Troublemaker shown as a skill level (verified)" was wrong; corrected in AUDIT.md. No data was renamed (renaming `S.happiness` would touch hundreds of call sites for no behavioural gain).
- Tests: `t_2a6` 13 checks — sickness is a named mood reason; a sick day lowers Mood clearly and Happiness only slightly; recovering removes the reason and raises the Mood target; Mood card shows both; Troublemaker 0–100 with a label, no "Lv"; a legitimate sick day changes neither Troublemaker nor Behavior; a medical emergency is a HARD Fast Forward interrupt; a mild cold during a skipped month appears under "Health" in the summary, recovered, nothing stale; acceptance start (age 11, wakes mildly unwell, may still go to school, lower focus).
- Test-hook fix during this checkpoint: the hook list already held most 2A.6 hooks from an earlier session; `repHtml`, `moodFactors`, `moodBaseline` were added.
- **Full regression:** 35 suites, 1,013 checks, 0 failures. **Fuzz:** ages 6, 11, 16, 25 with new health invariants (valid severity and progress, no negative medicine, no active nurse pass on a past day, no stale follow-up) — all held.

## Exact next task
None in Phase 2A. Next phase only on approval ("Proceed Phase 2B").
