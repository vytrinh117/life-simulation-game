# PHASE 3A PROGRESS — People cards & profiles, Relationship Log & Milestones, friendship model, active-friend cap, conversation continuity

**Status: IN PROGRESS — PHASE 3A INCOMPLETE. Resume from checkpoint: 3A.3 (friendship model, tier gating, 50 active friends)**

## Scope (master spec 50–54, 60; plus the H2 note about calendar `party` events without a host)
- 3A.1 Compact People card + full Profile (age, gender, birthday, zodiac, looks, smart, health, happiness, reputation, interests, relationship, love interest if known, where/how met, introduced by, known since; Unknown for private info)
- 3A.2 Relationship Log (wide, left) + Milestones (compact, right, typed important moments only), migration from existing history
- 3A.3 Friendship model: add respect; tier promotion needs shared time (no three-click Best Friend); max 50 active friends — fading friends become Old Friend / Former Friend / Contact, never deleted; reconnect
- 3A.4 Conversation continuity: things you tell people become threads they follow up on ("How did tryouts go?")
- 3A.5 Calendar `party` conversion keeps its host; QC, full regression, fuzz

## Checklist
- [x] 3A.1  - [x] 3A.2  - [ ] 3A.3  - [ ] 3A.4  - [ ] 3A.5

## Findings before coding (verified)
- People cards showed all numeric bars plus several text lines; no profile view. NPCs had no interests, no "where/how met", no introducer.
- Friend tiers are computed purely from closeness thresholds (40/60/75/88) → a new acquaintance can reach Best Friend after a few intense days (to fix in 3A.3 without breaking systems that need a tier, e.g. birthday invitations need Close Friend).
- The person window used "History together" / "Shared memories"; memories were any history line with importance ≥ 2.
- Person-modal stat tiles had **four overlapping `.modal-stats` rules** and a global `.row:last-child{border-bottom:0}` that removed the last tile's bottom border; tiles lacked `box-sizing`/`min-width:0` (right edge clipped). Spec 218.

## Done (3A.1–3A.2)
- `people73.js` (new): `ensureInterests` (2–3 interests + a dislike, seeded once), `closenessLabel`, `moodEmoji`, `metLine`, `peopleCardCompact`, `peopleOrder` (family first, then by closeness), `profileHtml` / `openProfile` (Unknown until known: interests from 40 closeness, smart/dislikes from 60, health from 75, birthday/zodiac from 40; looks visible; love interest per P3; all six relationship stats incl. respect/reliability/conflict), `MILESTONE_TYPES`, `addPersonMilestone` (typed, once per type), `migrateMilestones` (old importance-3 moments once, excluding "Relationship:" lines), `milestonesHtml`, `people3aClick`.
- Wiring: People panel uses compact cards; person window "Relationship log" + "Milestones"; `tierTick` adds friendship milestones; `setLoveStage` adds first date / official / engaged / married milestones; `migrateFamily` migrates milestones at load; `migrateIdentity` adds NPC interests; CSS consolidated to one `.modal-stats` rule (+ one narrow-screen rule) with a selector that beats `.row:last-child`.
- Tests: `t_people` 14 (compact card, no numbers on card, ordering, Unknown private info, core profile fields, revealed when close, friend/close-friend/official milestones without duplicates, renamed window columns, milestones exclude routine, Conflict tile fully inside with all four borders, persistence).
- Test updates (intended changes or older flaky checks): `t_rst` S-checks renamed (log/milestones) and simulate an old save for the legacy-moment check; `t_rst` R40 logic fixed (a rejected confession legitimately gives a one-sided crush, which also sets `romanceStage='crush'`; the test mis-read that as mutual); `t_ident` card check moved to the profile; `t_ident` low-trust ask made deterministic (15% rule).
- Re-run: `t_ui`, `t_theme`, `t_knx`, `t_social`, `t_rst`, `t_romance`, `t_o`, `t_h2`, `t_family`, `t_family2`, `t_ident`, `t_jordan`, `t_regress` — all pass.

## Exact next task
3A.3: (1) add `respect` (lazy default 50) with sensible gains (helping, keeping promises, competence) and losses (lying, no-shows); (2) tier promotion needs shared time: cap `friendTier` by time known and shared days **only for people met during play** (`p.metDate` set when someone new is met; people without `metDate` — classmates from stage changes, legacy, fixtures — keep the current behaviour) — Good ≥ 7 days known, Close ≥ 21 days + 6 shared days, Best ≥ 60 days + 15 shared days; (3) 50 active-friend cap: when more than 50 non-family people are Friend+, the least-recent drift to "Old Friend" status (`p.friendStatus`), shown on the card, never deleted; a "Reconnect" action on Old/Former friends; (4) tests `t_friend`. Then 3A.4 conversation threads, 3A.5 calendar party host + full QC.
