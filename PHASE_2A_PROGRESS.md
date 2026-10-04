# PHASE 2A PROGRESS — Health, Illness, Medicine, School Nurse & Medical Care

**Status: IN PROGRESS — PHASE 2A INCOMPLETE. Resume from checkpoint: 2A.3b (Pharmacy store + inventory integration)**

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
- [~] 2A.3 Pharmacy + medicine items — split: **2A.3a done** (medicine model + rules, `t_med`), **2A.3b next** (store category + catalog items + inventory uses + caregiver purchase)
- [ ] 2A.4 School nurse + nurse pass (excused periods) + go home sick + exams/clubs excused
- [ ] 2A.5 Stay home / fake sick; clinic / hospital / emergency; costs by household; follow-up appointments
- [ ] 2A.6 Happiness vs Mood; Troublemaker reputation; health UI; Fast Forward integration; full QC + final acceptance scenario

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

## Exact next task
2A.3b: add the six medicines to the `data.js` catalog as finite-use items (`lifecycleType` consumable, `uses` from `MEDICINES`, category "Pharmacy", `medKind`), a "Pharmacy" store category, and a `useMedicine(itemId)` item action that calls `applyMedicine`, decrements uses and removes the item at 0. Minors: buying goes through the existing caregiver permission; under 12 the action becomes "Ask a parent to give it" (`applyMedicine(kind,'caregiver')` when a caregiver is home). Then extend `t_med` (buy → uses → money → relief → not cured → empty item removed) and re-run the store/item suites (`t_items`, `t_balance`).
