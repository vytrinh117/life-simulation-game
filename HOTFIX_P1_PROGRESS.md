# HOTFIX P1 PROGRESS

**Status: HOTFIX-P1 INCOMPLETE — P1.2 COMPLETE. Resume from checkpoint: P1.3.** (Phase 3A COMPLETE status unchanged.)

## REQUIREMENTS — PART 1 OF 3 (recorded in full — section D was completed by a follow-up message)

### P1.1 — People card + Profile UI

**A. People card height bug**
- A People card can become abnormally tall when it shares a grid row with a taller Friend Group card. Fix the **root layout issue**: a dedicated People grid/section with appropriate alignment so People cards and Friend Group cards never stretch each other. **No large fixed height** for all cards; normal People cards stay compact and consistent.

**B. Name casing**
- Non-family names are shown in ALL CAPS, family names in normal case. Use the canonical/full display name with **normal casing for everyone**; never uppercase ordinary names (section headings may keep intentional heading styles).

**C. People card identity format** (one design language for family and non-family)
- Line 1: **Full Name (Age) | Relationship to Player** — e.g. "Chloe Brown (14) | Best Friend", "Grace Taylor (42) | Mother", "Steven Taylor (20) | Older Brother". The relationship label uses the existing accent treatment; the name itself is not coloured.
- Line 2 (compact): **Gender · Love interest** — e.g. "Female · Love interest: Men"; only what the player legitimately knows; omit love interest before the age/system allows it or when inappropriate for the NPC's age; no meaningless placeholders.
- Line 3 (compact metadata): known connection context — e.g. "Neighbor · known since age 3", "Met at school · introduced by Maya · known since age 11". Do not force every fact onto its own line.

**D. Family relationship labels**
- Do not show vague role text (parent / grandparent / sibling) when the real relationship can be determined. Use specific labels from real family data: Mother, Father, Grandmother, Grandfather, Older Sister, Older Brother, Younger Sister, Younger Brother, Sister, Brother, Daughter, Son. Use the current canonical family structure.
- **Do not infer Mother/Father by checking whether the person's name contains "Mom" or "Dad".** Relationship derivation must come from **actual role/relationship data**.
- **Audit family detection** so the player's own children (role `child`) are treated as Family.
- Do **not** redesign the family simulation here.

**E. Profile header**
- The profile currently shows the name twice (modal title + content heading). Keep **one** primary identity header: **Full Name (Age) | Relationship to Player** -> Gender · Love interest -> known connection context -> parents/guardians only when legitimately known. Never the same full name twice at the top of the modal.

**F. Profile information density**
- Replace the one-field-per-full-width-row layout with a **responsive two-column** information layout where appropriate. Compact fields: Birthday, Zodiac, Looks, Smart, Health, Mood, Right now, Romantic status, Interests, Dislikes. Spanning both columns: Life goals, Parents, Where/How met, Introduced by.
- Relationship metrics (Closeness, Trust, Fun, Respect, Reliability, Conflict) in a **compact grid** instead of six full-width rows when width allows. Readable spacing; not cramped.

**G. Terminology**
- Distinguish **Relationship to Player** (Best Friend / Mother / Partner ...) from **Romantic status** (Unknown / Single / Seeing someone / In a relationship ...). Never label both "Relationship status". Phase 3B owns romance-progression expansion.

### Findings in the current source (verified, for later implementation)
- **B:** the compact card (`peopleCardCompact`, `src/modules/people73.js`, Phase 3A.1) uppercases non-family names with `.toUpperCase()`.
- **D:** `relationshipDescriptor` (`people73.js`, Phase 3A.5) decides Mom/Dad with `/Mom/.test(p.name)` / `/Dad/.test(p.name)`; the generated `game.js` contains **5** such name-based checks in total (other modules too, e.g. family generation / baby logic) — all need review against the rest of D once received. Family members currently carry `role` ('parent', 'grandparent', 'older sibling', …), `gender` (siblings; parents via identity), `branch` and `roleLabel` (e.g. "Dad's mother").
- **A:** the Friend Group section (`groupHtml`) is rendered in the same People panel grid as the person cards.
- **D (child audit):** the player's own children are created by `babyArrives` (`src/modules/rst73.js`) with `makePerson(name,'child',0,S.age)` (role **`child`**, roleLabel "your child"; no gender set). `isFamilyPerson` does **not** include `'child'` → the player's children are currently not treated as Family (confirmed bug).
- **E/G:** the Profile modal title is the person's name and `profileHtml` repeats it in `.profile-head h2`; the romance field is labelled "Relationship status" while the descriptor is labelled "Relationship" elsewhere.

## REQUIREMENTS — PART 2 OF 3 (recorded; Part 1 confirmed present and complete before recording)

### P1.2 — People hub consolidation

**A. People becomes the social hub**
- Remove the separate sidebar destination **Family & Relationships**; consolidate its useful content into **People**. Do not delete family data/systems (navigation/UI consolidation only). Keep compatibility for internal routes/calls that opened the old view where practical.

**B. People structure** (categories; hide empty ones; never create people to fill them)
- **All**
- **Family** — parents, siblings, the player's children, immediate household family where appropriate
- **Relatives** — grandparents, aunts/uncles, cousins, extended family
- **Closest Bonds** — current boyfriend/girlfriend/partner, Best Friends
- **Friends** — Close Friend, Casual Friend
- **Acquaintances** — Acquaintance
- **Past Connections** — Old Friend, Former Friend (+ a compatible hook for past romantic relationships)

**C. Family content inside People** — People › Family has a compact **Family Overview** with the useful existing content: family dynamics, family events/memories, family interaction entry points. The old page is not kept just to duplicate it. Family dynamics compact (closeness, tension, responsibility, household strictness, generosity …), not one full-width row per small stat.

**D. Family conversation** — move **"Have a real conversation"** into People › Family (as a family action and/or inside a selected family member's Interact flow). When it concerns one family member, use that person's **stable personId**; never swap in another caregiver at random. Do not rewrite the decision/permission system in this hotfix.

**E. Friend Groups remain** — do **not** remove them; they stay accessible and interactive, but never share the layout grid with individual People cards. Preferred top-level subnavigation: **People | Friend Groups**. Friend Groups shows the actual existing groups (stable group data) and preserves current functionality (members, existing history/details, inside jokes/memory, Plan a group outing, other current working interactions). No Phase 3C group messaging; no invented new group simulation.

**F. Friend Group card** — compact: group name; member count · since date; member names; inside joke / shared note when available; actions only where real functionality exists (e.g. Interact / Plan outing / View details) — **no dead buttons**.

### Findings in the current source for Part 2 (verified)
- Sidebar item for the Family view: `['family',S.age>=13?'❤️':'👨‍👩‍👧',S.age>=13?'Family & Relationships':'Family']`.
- Current Friend Group card (`groupHtml`) exposes these action hooks: group-plan — i.e. only "Plan a group outing" is a real group action today; any Interact / View details buttons must be backed by real functionality before being shown.
- "Have a real conversation" exists in the current source (Family view); no code calls `openTab('family')` directly (navigation goes through the sidebar item).

## REQUIREMENTS — PART 3 OF 3 (recorded; Parts 1 and 2 confirmed present)

### P1.3 — Boundaries
- UI / navigation consolidation only. **No H3 logic**: not purchase approval authority, sibling approval reroll, parent-permission decision memory, request ledger, romance-rejection reroll, contest-prepare limits, birthday acknowledgment logic, medicine correctness. No Phase 3B (no new romance progression). No Phase 3C messaging / group chat.

### Source of truth / build
- Phase 3A ships reproducible source. **Edit the real source** (`src/modules/*.js`, `src/style_before_theme.css`, `tools/theme.py` for theme rules), never only the generated root `game.js` / `style.css`. Rebuild with the shipped workflow (`BUILD.md`: `python3 tools/splice.py`; `cp src/style_before_theme.css style.css && python3 tools/theme.py`) and verify the generated files correspond to the source. Do not assume filenames from documentation — check the actual tree.
- Verified now: `BUILD.md`, `tools/splice.py`, `tools/theme.py`, `src/base/game.js`, `src/style_before_theme.css` and 41 modules are present in the shipped project.
- **Working note:** the development workspace also keeps copies of the modules and tools outside the project (used for every build so far). For P1, the shipped `src/` + `tools/` must be the source of truth: edits go into the shipped source (or are synced into it), and every checkpoint ends with a rebuild from the shipped tools plus a byte comparison against the delivered `game.js` / `style.css`.

### Hotfix checkpoints (one per run; do not combine unless authorized)
- **P1.1** People card + Profile UI → STOP
- **P1.2** People navigation consolidation + Family migration + Friend Groups → STOP
- **P1.3** Final regression / visual QA / documentation → STOP

### P1 final acceptance (verify at P1.3)
1. Normal People cards no longer stretch because of Friend Group cards. 2. Consistent name casing. 3. Same visual identity language for family and non-family cards. 4. Card header can show **Full Name (Age) | Relationship**. 5. Known gender / love interest compact and correctly gated. 6. Specific family labels (Mother / Father / Older Sister …) instead of generic parent / sibling when data supports it. 7. Player children recognized as Family. 8. Profile does not repeat the full name at the top. 9. Denser responsive Profile layout. 10. Compact, readable relationship metrics. 11. Relationship-to-Player and Romantic status distinct. 12. Family & Relationships no longer duplicated in the sidebar. 13. Family data still accessible under People › Family. 14. "Have a real conversation" still works. 15. Friend Groups still exist. 16. Existing Friend Group actions still work. 17. Friend Groups no longer stretch individual People cards. 18. Existing People / Profile / Family / Group saves load correctly. 19. Phase 3A friendship / profile / narrative / personality / talent behaviour intact. 20. No new JS errors or obvious overflow at normal desktop widths.

### Testing
- Add/update focused tests for every changed behaviour; run People, Profile, Family UI/navigation and Friend Group tests plus directly relevant Phase 3A suites; never weaken existing tests just to pass; P1.3 runs broader regression appropriate for the hotfix.

## Checkpoints
- [x] P1.1
- [x] P1.2
- [ ] P1.3

Each checkpoint record: actual source files changed, generated files rebuilt, tests added/updated, test counts, known limitations, exact next checkpoint.

## P1.1 — People card + Profile UI — COMPLETE
**Implementation**
- **A (stretch):** individual People cards now live in their own `.people-grid` (auto-fill columns, `align-items:start`); the Friend Group section is outside that grid, so cards never stretch to a group card's height. No fixed heights.
- **B (casing):** the `.toUpperCase()` on non-family names was removed; every card shows the canonical full name in normal case.
- **C (identity):** one card language for everyone — **Full Name (Age) | Relationship** (relationship in the accent colour; the name is not coloured), then **Gender · Love interest** (love interest only when visible for the age and actually known; omitted otherwise — no placeholder on the card), then one **context line** (Met … · introduced by … · known since age …; family: Lives with you / Lives elsewhere · Dad's/Mom's side / Your child), then Closeness · Right now.
- **D (family labels from data):** new canonical **`p.relation`** (+ `p.gender`) set when the family is generated (mother, father, grandmother, grandfather, sibling, aunt, uncle; player children: child). `familyRelationLabel` → Mother / Father / Grandmother / Grandfather / Older Sister / Older Brother / Younger Sister / Younger Brother / Sister / Brother (same age) / Daughter / Son / Child / Aunt / Uncle. **All 8 name-based checks were replaced** (`family73` ×3, `holidays72` Mother's/Father's Day, `people73` descriptor, `social72` family naming, `ident73` `familyGender`) with `familyByRelation` / relation data. `isFamilyPerson` now includes role **`child`** (and children default to living at home).
- **Legacy saves:** old saves stored the relationship only as the v7.1 generator's label in `p.name` ("Mom", "Dad", "Grandmother", "Grandfather"). `migrateRelations` converts those **exact labels once** into `relation` + `gender` (not a "contains" test; a renamed person keeps the label). Idempotent; runs before family naming so Mom always receives a female name.
- **E (profile header):** the modal title is now "Profile"; one identity header (Full Name (Age) | Relationship → Gender · Love interest (Unknown shown here when not known) → context + met date → Parents when known). The name appears once.
- **F (density):** two-column `.profile-grid` (Personality, Life goals, Where met, How met, Introduced by span both columns); one column under 640 px. Relationship metrics in a 3-column `.metrics-grid` (2 on narrow screens) under "Relationship to you".
- **G (terminology):** "Romantic status" (Unknown / Single / Seeing someone / In a relationship) is separate from the relationship-to-player descriptor; no "Relationship status" label remains.

**Regression found and fixed during P1.1 (own code):** the helper used to replace functions in `people73.js` cut everything up to the next `function`, deleting `const MILESTONE_TYPES` and the `Object.assign(MILESTONE_TYPES, …)` line (plus 3 comments) → `ReferenceError` in milestones and in P3's confession flow (`t_people`, `t_profile`, `t_ident` failures). Restored in place by diffing against the pre-hotfix module; verified that no top-level line is missing.

**Files actually changed (shipped source tree)**
- `src/modules/people73.js` (card, profile, descriptor, identity helpers), `src/modules/people72ui.js` (separate People grid), `src/modules/family73.js` (relation data, `migrateRelations`, `familyByRelation`, `familyRelationLabel`, sibling labels, child residence), `src/modules/holidays72.js`, `src/modules/social72.js`, `src/modules/ident73.js`, `src/modules/rst73.js` (player child gets `relation`), `tools/splice.py` (`isFamilyPerson` includes `child`; test hooks), `tools/theme.py` (people grid, identity line, profile grid, metrics grid).
- **Generated with the shipped tools:** `game.js`, `style.css`. Verified: an isolated rebuild from `src/` + `tools/` is byte-identical to the delivered files. The development workspace copies of the modules were synced from `src/modules/` afterwards.

**Tests**
- Added `qa/t_p1.py` — 22 checks (passed twice): unified card header for all cards; canonical names with no uppercase transform; Mother / Father / Older Sister; gender + context lines; unknown love interest omitted on the card; label survives renaming Mom (data, not name); child is Family with a data-based label (Daughter / Son / Child) and never a friend; profile name shown once; Romantic status separate; 2-column profile and 3-column metrics; knowledge gating kept; at **1280 / 1366 / 1440 px**: own People grid, no stretched card (max ≤ 1.35× median), no page overflow, no Profile modal overflow; legacy Jordan save → relation + gender, female name for Mom, idempotent.
- Updated to the recorded P1 requirements (intent preserved, not weakened): `t_people` (card format "(16) |"; header separator; the close-friend milestone step now also sets trust and low conflict — required since 3A.3; the earlier failing value could not be reconstructed), `t_profile` ("Romantic status"; "Mother"), `t_family` ("Older Sister" / "Younger Brother"), `t_ident` (card format), `t_rst` (partner card shows Girlfriend/Boyfriend/Partner with no conflicting tier label **and** the love stage is still shown in the person window — one check became two).
- Run on this checkpoint: `t_p1` 22, `t_people` 14, `t_profile` 24, `t_family` 13, `t_family2` 22, `t_ident` 20, `t_holidays` 57, `t_friend` 17, `t_narrative` 20, `t_dev` 22, `t_3a7` 13, `t_social` 52, `t_rst` 44, `t_ui` 50, `t_jordan` 13, `t_regress` 16, `t_h2` 22, `t_bday` 16 — **18 suites, 457 checks, 0 failures**.

**Known limitations**
- The person window (Interact) keeps its own header style (unchanged in P1.1); only the Profile was in scope.
- Player children created before this hotfix get `relation:'child'` but no gender until the identity system assigns one; the label follows whatever gender data exists.
- `parentsKnown` still uses the NPC household record (no visit-based learning yet).

## P1.2 — People hub consolidation — COMPLETE
**Implementation**
- **Navigation (A):** the sidebar item "Family & Relationships" / "Family" is removed (a `rep` in `tools/splice.py` drops the base script's `a.push(['family',…])`). Family data and simulation are untouched.
- **Subnavigation:** People | **Friend Groups** | Plans (`PANEL_TABS.people`; Plans is preserved). The People subtab is one `section[data-sub="people"]` containing the filters and the people grid — this also **fixes a P1.1 side effect**: the P1.1 grid sat outside `.dashboard`, so person cards were not assigned to a subtab and stayed visible under Plans.
- **Filters (B):** All / Family / Relatives / Closest Bonds / Friends / Acquaintances / Past Connections (`PEOPLE_FILTERS`, `peopleCategory`), UI-only state `UI.peopleFilter` (no save change), empty categories hidden, counts shown. Rules: current partner → Closest Bonds (even if also a Best Friend; shown once); Family = mother / father / parent / siblings / the player's children (by `relation` / role); Relatives = grandparents, aunts, uncles, other relatives — **regardless of residence** (a grandparent at home stays a Relative); Best Friend → Closest Bonds; Close / Casual Friend → Friends; Acquaintance / Stranger / Contact → Acquaintances; Old / Former Friend (and a future `formerPartner` flag) → Past Connections.
- **Family content (C, D):** People › Family shows a compact **Family overview**: five dynamics tiles (Closeness, Tension, Responsibility, Household strictness, Generosity — the same values the old page showed), the existing **"Have a real conversation"** button (same `familyTalk` action — generic family conversation, unchanged; no per-person action was invented), Household + Family tree, housing, family trip, and **Family events & memories**. The old page's "Caregivers" list and "Romance status" card were not carried over (caregivers are the family cards themselves; romance is in Love life). **Love life** (incl. the romance on/off toggle and "Relationship steps") was split out of `familyExtrasHtml` into `loveLifeHtml()` and appears under People › All and Closest Bonds (13+). `familyExtrasHtml()` still exists for compatibility.
- **Friend Groups (E, F):** rendered in their own subtab from the existing `S.groups` data via the existing `groupHtml()` (name, since date, members, inside jokes). The only real group action — **Plan a group outing** — is kept; no Interact / Profile / Chat buttons were added (no dead buttons). Group cards are never inside `.people-grid`.
- **P1.1 audit cleanup:** `social72` (keeping her own surname in VN/KR/CN) now uses `relation` (mother / grandmother) instead of `/Mom|Grandmother/.test(p.name)`; `hij73` parent-teacher conference now finds the parent with `familyByRelation('father' / 'mother')` instead of `p.name==='Dad'/'Mom'` — **only the lookup changed**, not the decision/authority logic. No runtime family logic in `game.js` depends on the literal names Mom / Dad / Grandmother any more; legacy labels are read only by `migrateRelations`.

**Compatibility for the old Family navigation**
- `renderHeader()` used to send any tab that is not in the sidebar to Home **before** the panel rendered, so a saved/old `active='family'` would have landed on Home. A `rep` now maps `active==='family'` → People with the People subtab and the Family filter, before that check. The `renderPanel` `case 'family'` also redirects to People › Family as a second safety net. There is no separate Family page any more.

**Own mistakes caught during P1.2**
- The first edit built the new `peoplePanel` in memory but then ran a helper that re-read the file from disk, so only the subtab config was saved (three new subtabs over the old panel). Caught by `t_p12`; rewritten and verified in the file.
- The P1.1 People grid outside `.dashboard` broke subtab hiding (above) — not caught by `t_p1`; now covered by `t_p12`.
- Every module edit was diffed against a pre-P1.2 copy: no top-level line was lost.

**Files actually changed (shipped source tree)**
- `src/modules/people72ui.js` (People hub panel, subtabs), `src/modules/people73.js` (`PEOPLE_FILTERS`, `peopleCategory`, `familyOverviewHtml`, `peopleHubClick`), `src/modules/rst73.js` (`loveLifeHtml`, `familyTripHtml`), `src/modules/ui72.js` (click chain), `src/modules/hij73.js` (parent lookup), `src/modules/social72.js` (surname lookup), `tools/splice.py` (sidebar item removed, legacy `family` tab redirect in `renderHeader` and `renderPanel`, test hooks), `tools/theme.py` (filters, overview tiles, nested cards).
- **Generated with the shipped tools:** `game.js`, `style.css` — isolated rebuild from `src/` + `tools/` is byte-identical. Workspace module copies synced from `src/modules/`.

**Tests**
- Added `qa/t_p12.py` — 24 checks, passed twice: no Family sidebar item (age 30 and 8); classification of mother/sibling/child (Family), grandparent at home (Relatives), partner-who-is-a-best-friend and Best Friend (Closest Bonds), Close/Casual (Friends), Acquaintance, Old/Former (Past); All shows everyone exactly once; each filter shows exactly its people; Family overview with dynamics, family tree and events; "Have a real conversation" works; subtabs People | Friend Groups | Plans; groups in their own subtab, outside the grid, only real buttons, "Plan a group outing" works; Plans works and hides person cards; old Family route → People › Family (no duplicate page); Love life reachable under All; no name-based family lookups left in `game.js`.
- Updated (intent preserved): `t_o` — the romance toggle check now looks in People › All (Love life card) instead of the removed Family page; `t_rst` — "Love life lives in People (All / Closest Bonds); House rules in the left dashboard".
- Run on this checkpoint: `t_p12` 24, `t_p1` 22, `t_people` 14, `t_profile` 24, `t_family` 13, `t_family2` 22, `t_rst` 44, `t_social` 52, `t_knx` 44, `t_o` 14, `t_ui` 50, `t_hij` 40, `t_holidays` 57, `t_ident` 20, `t_friend` 17, `t_narrative` 20, `t_3a7` 13, `t_jordan` 13, `t_regress` 16 — **19 suites, 519 checks, 0 failures in the final runs.**
- Intermittent failures seen and **not** attributed to P1.2 (each passed on two re-runs; recorded, not claimed fixed): `t_hij` J ("End of break" fast-forward stopped at 8:04 instead of before 8:00 — same family as the known FF attendance flake) and `t_o` "neighborhood events say who…" (the random loop generated no neighborhood event in that run).

**Known limitations**
- "Have a real conversation" remains the existing generic family conversation (no per-family-member conversation exists yet; none was invented).
- The person window (Interact) header style is unchanged (out of scope for P1).
- Visual QA of the hub at several widths is reserved for P1.3.

## Exact next task
**P1.3 — Final regression / visual QA / documentation:** broader regression appropriate for the hotfix, visual check of People (all filters), Friend Groups, Plans, Profile at ~1280 / 1366 / 1440 px, verify P1 final acceptance #1–20, update docs. Stop after P1.3.
