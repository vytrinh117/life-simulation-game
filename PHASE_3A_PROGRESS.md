# PHASE 3A PROGRESS — People cards & profiles, Relationship Log & Milestones, friendship model, active-friend cap, conversation continuity

**Status: IN PROGRESS — PHASE 3A INCOMPLETE. Resume from checkpoint: 3A.4 (conversation continuity)**

## Scope (master spec 50–54, 60; plus the H2 note about calendar `party` events without a host)
- 3A.1 Compact People card + full Profile (age, gender, birthday, zodiac, looks, smart, health, happiness, reputation, interests, relationship, love interest if known, where/how met, introduced by, known since; Unknown for private info)
- 3A.2 Relationship Log (wide, left) + Milestones (compact, right, typed important moments only), migration from existing history
- 3A.3 Friendship model: add respect; tier promotion needs shared time (no three-click Best Friend); max 50 active friends — fading friends become Old Friend / Former Friend / Contact, never deleted; reconnect
- 3A.4 Conversation continuity: things you tell people become threads they follow up on ("How did tryouts go?")
- 3A.5 Calendar `party` conversion keeps its host; QC, full regression, fuzz

## Checklist
- [x] 3A.1  - [x] 3A.2  - [x] 3A.3  - [ ] 3A.4  - [ ] 3A.5

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

## REQUIREMENT UPDATE (received before 3A.3 — supersedes older 3A assumptions)
- A. Ladder is now **Stranger → Acquaintance → Casual Friend → Close Friend → Best Friend** (one canonical code label "Casual Friend"; "social companion" only as explanatory text). Legacy Friend / Good Friend → Casual Friend; historical milestone text stays; no duplicate milestones.
- B. Stranger = encountered, little real relationship; Acquaintance = actually interacted. No persistent records for background people.
- C. Tiers are multi-dimensional (closeness, trust, respect, reliability, conflict, time known, shared days, shared milestones, recent contact); Fun alone never makes a Best Friend; not grindy.
- D. ~50 active non-family friendships; no "cannot have more friends" wall; new people can still become Acquaintances; stale low-investment friendships drift to Old Friend / Former Friend / Contact; strong Close/Best friends are not demoted because #51 exists; nobody deleted; Reconnect keeps the same id.
- E. Soft normal ranges (Best ~1–3, Close ~5–10) — not hard caps; no random demotion.
- F. Friendship is fluid across life stages (e.g. "Best Friend in high school → Close Friend in university → …"). **The requirement document was cut off at this point; the rest of F and anything after it was not received.** Implemented here: natural drift from lack of contact, so friendships change across life stages without forced demotions.

## 3A.3 (done) — under the updated requirements A–F
- `friends73.js` (new): `friendshipTier` — Stranger (met during play, no shared days, low closeness) → Acquaintance → **Casual Friend** (closeness ≥ 40, trust ≥ 30, conflict < 60, ≥ 2 shared days) → **Close Friend** (closeness ≥ 72, trust ≥ 55, conflict < 45, known ≥ 21 days, ≥ 6 shared days) → **Best Friend** (closeness ≥ 86, trust ≥ 72, respect ≥ 45, reliability ≥ 55, conflict < 30, known ≥ 60 days, ≥ 15 shared days, ≥ 1 shared non-friendship milestone). Fun is not part of the ladder. Time/shared-day gates apply to people **met during play** (`metDate`); classmates added in bulk at stage changes, legacy saves and fixtures have no `metDate`, so only the relationship-quality conditions apply to them (no mass demotion). `sharedDays`, `knownDays`, `sharedMoments`, `lastContact`, statuses **Old Friend / Former Friend / Contact** (`friendStatusLabel`, `setFriendStatus`), `friendNetworkTick` (weekly: high conflict + low closeness → Former Friend; Casual Friend with 120+ days without contact → Old Friend; Close/Best with 240+ days fade slowly instead of flipping; more than 50 active → only the weakest Casual Friends drift to Old Friend / Contact), `reconnect` (same id, status cleared, logged; Former Friend → reconciliation milestone), `adjustRespect` (driven by `adjustReliability`: showing up / no-shows), `migrateFriendTiers` (stored Friend / Good Friend → Casual Friend; respect default 50).
- Wiring: `TIER_RANK` extended (Casual Friend = 2 keeps every old ≥1 / ≥2 check working; Close 3; Best 4; Old Friend 1; Stranger/Acquaintance/Contact/Former 0); `friendTier` → status or `friendshipTier`; `personFromNpc` records `metDate` / `metVia` / `metAt` / respect; `addStagePeople` clears `metDate`; card shows status + Reconnect; profile explains "Casual Friend (social companion)"; weekly tick in the daily chain.
- Soft ranges (Best ~1–3, Close ~5–10) are **not** enforced as caps (requirement E).
- Tests: `t_friend` 17 (legacy migration without duplicate milestones; Stranger; no day-one Best/Close friend; month of shared days → Close; months + shared milestone → Best; low respect blocks Best; conflict blocks Close; high Fun alone is not friendship; 57 friends → ~50 active, nobody deleted, Close Friends untouched, weakest casual ones drift; new people can still become Acquaintances; 4 months without contact → Old Friend; Reconnect button; same id after reconnect). `t_knx` K40/N49 updated to the new ladder (they asserted the old Friend/Good Friend labels and a closeness-only "best friend").
- Re-run: `t_knx`, `t_social`, `t_h2`, `t_bday`, `t_people`, `t_rst`, `t_romance`, `t_o`, `t_family2`, `t_ident`, `t_lmpq`, `t_friend` (×2), `t_ui`, `t_jordan`, `t_regress`, `t_holidays`, `t_campus` — all pass.

## Exact next task
3A.4 Conversation continuity: when you confide/talk about something specific (tryouts, an exam, a competition, a date, being sick, a family problem), store a thread on that person {topic, eventRef/date, status open}; after the related event resolves, that person may follow up in conversation or chat ("How did tryouts go?") with replies that react to the actual outcome; threads close after the follow-up or expire. Then 3A.5 (calendar party host, full regression, fuzz).
