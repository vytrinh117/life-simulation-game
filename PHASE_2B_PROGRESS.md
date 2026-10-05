# PHASE 2B PROGRESS — Family tree, household, siblings, house rules

**Status: COMPLETE** — 2B.1–2B.6 done; full regression 40 suites / 1,087 checks; fuzz ages 8, 14, 25.

## Scope (master spec 44–49)
Family tree separate from current household; grandparents not in every household (co-residence by culture/context/chance); multiple siblings (older/younger brother/sister) whose number depends on more than wealth; future siblings (a new baby) who age and develop; younger-sibling requests with negotiation; House Rules in the left dashboard under Identity.

## Findings before coding (verified in code)
- `makePeople(age)` gives every life the same family: Mom, Dad, **Grandmother always** (implicitly living at home), 62% exactly one "older sibling" with a name from 4 fixed names (no gender), 48% one aunt/uncle. No younger siblings, no concept of residence.
- Caregiver helpers (`caregiverNames`, `primaryCaregiver`, `caregiverPerson`) include aunts, uncles, older siblings and grandparents **regardless of where they live**.
- Family members without an NPC record use `p.age`.

## Checklist
- [x] 2B.1 Family tree vs household: residence per relative, household helpers, caregivers = household adults, new-life family generation (grandparents by branch, co-residence by context, varied siblings with gender-matched names), migration that preserves old families
- [x] 2B.2 Family UI: Household + Family tree sections; siblings shown with age and type
- [x] 2B.3 Future siblings: a new baby by family context; siblings age and grow up
- [x] 2B.4 Younger-sibling requests (come along / borrow item / come with friends) with Yes / No / Ask a parent / Maybe later, negotiation, personality-based reactions
- [x] 2B.5 House Rules in the left dashboard under Identity
- [x] 2B.6 QC (spec B), full regression, fuzz

## Completed checkpoint
**2B.2** (ZIP `life-sim-v7_3-phase2B-checkpoint-2B2.zip`)

## Files / functions (2B.1–2B.2)
- `family73.js` (new): `defaultResidence`, `inHousehold`, `householdMembers`, `householdCaregivers` (parents, grandparents/aunts/uncles living at home, siblings 16+ older than you), `householdCaregiver`, `isSibling`, `siblingLabel` (by real age), `creatorContext` (region/wealth from the creator — **must not use `S`**, see bug below), `grandCoResidenceChance` (~32% in VN/KR/JP/CN/TH, ~9% elsewhere, +10 struggling, −4 wealthy), `rollSiblingCount` (family-size preference small/medium/large + chance), `generateFamily(age)` (parents; paternal/maternal grandparents each 75–85% present, elsewhere unless co-resident; 0–3 siblings with gender, older or younger by start age; 0–2 aunts/uncles elsewhere, by branch), `applyBranchSurnames` (Mom's side carries the maternal family name, once), `migrateFamily` (residence once for old saves; old grandmother stays at home; sibling gender once; `S.family.sizePref`), `familyPersonLine`, `familyTreeHtml` (Household + Family tree: Dad's side / Mom's side / other).
- `tools/splice.py`: `makePeople` → `generateFamily`; `isFamilyPerson` and `caregiverNames` include `younger sibling` / household only. `core72.js`: `caregiverPerson()` → `householdCaregiver()`. `health73.js`: `householdAdults()` → household caregivers. `social72.js`: family naming also names younger siblings. `ident73.js`: `migrateIdentity` runs `migrateFamily`; `nameGender` also knows the phase-5a family-name pools (unisex names stay unisex). `rst73.js`: Family panel shows the family tree. CSS `.fam-row`, `.linklike`.

## Bugs found during 2B.1–2B.2
- **Own bug, caught by `t_family`:** the first `generateFamily` read the country through `poolKey()` while the new life's state did not exist yet (`S` null) → **every new life failed to start**. Fixed by reading the creator's inputs (`creatorContext`).
- **Own P3 gap:** `nameGender` did not know the family-name pools, so names like Laura/Michelle/Jennifer were classified male. Fixed; the first fix broke the unisex rule ("Minh"), caught by `t_ident`, and was corrected.

## Tests
- `t_family` 13 (30 new families: grandparents at home only in some, still in the tree otherwise; 0/1/2+ siblings; brothers and sisters; gender-matched names; aunts/uncles never at home; maternal surnames; caregiver always in the household; sibling identities persist; Household/Family tree UI; old save keeps grandmother at home and every member; old sibling gets a gender once).
- Re-run: `t_jordan`, `t_regress`, `t_ident`, `t_creator`, `t_lmpq`, `t_bday`, `t_hij`, `t_nurse`, `t_care`, `t_social`, `t_knx`, `t_ui`, `t_holidays`, `t_rst`, `t_items`, `t_day` — all pass.

## 2B.3–2B.6 (done in session 2)
- `family73.js`: `childrenAtHome`, `familyTarget` (small 2 / medium 3 / large 4 children), `babyEligible` (both parents, mother 22–43, below the family's target, youngest child 2+, nothing expected, 2+ years since the last baby, living at home), `babyChancePct` (monthly ~3.5%, less when struggling or tense), `announceBaby` (parents share the news at dinner — non-explicit — due in ~7 months), `siblingBabyArrives` (younger sibling, gender, home, milestone; named by the family naming pass), `familyGrowthTick`; sibling personalities (`SIB_TRAITS`, `sibTraits`, `easygoing`); `siblingRequestTick` (younger siblings 4–15 at home, every few days at most: park, mall at 13+, borrow an item you own, tag along with an accepted plan today/tomorrow), `siblingRequestChoice` (Yes / No / Ask Mom or Dad / Maybe later; easygoing siblings accept a no; stubborn ones negotiate → deal or still no), `siblingYes`, `familyFollowUp` (lent items come back, "later" is remembered), `houseRulesMiniHtml`.
- Wiring: daily chain (`familyGrowthTick`, `siblingRequestTick`), event chain (`siblingRequestChoice`), follow-up chain (`familyFollowUp`), `siblingRequest`/`siblingNegotiate` require a real person (H2 rule), House rules moved from the Family panel to the left dashboard under Identity (`index.html` + fill in the Identity render).
- Own issues caught by tests: a duplicate function name (`babyArrives` already existed for the player's own child — renamed `siblingBabyArrives`); the borrow request filtered on a non-existent inventory `category` field (category lives in the catalog).
- Test updates (older tests vs. new rules, not game bugs): `t_rst` T-check now expects House rules in the left dashboard; `t_rst` R40 peer now explicitly is interested in the player (it could randomly hit the P3 orientation rule); `t_ident` "high trust → they tell you" is now deterministic (the rule is 85%).
- Tests: `t_family2` 22 (baby eligible → news → born on time as a named, gender-matched sibling with a milestone, no immediate second baby; not when the family is complete or parents are past the age range; sibling request with four answers; yes → time passes, closer; kind sibling accepts no; later → reminder; stubborn sibling negotiates → deal (closer, chore help) / still no (hurt); ask a parent → yes / not today; lend → lent → returned; House rules in the left dashboard, not in Family, "your rules" when living alone).
- Full regression: 40 suites, 1,087 checks, 0 failures. Fuzz: ages 8, 14, 25 with family invariants (unique ids, no negative ages, expecting has a due date, a child at home always has a caregiver at home) — held. (One age-14 run produced no output and was re-run.)

## Exact next task
None in Phase 2B. Next phase only on approval.
