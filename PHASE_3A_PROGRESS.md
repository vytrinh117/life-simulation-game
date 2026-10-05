# PHASE 3A PROGRESS — People cards & profiles, Relationship Log & Milestones, friendship model, active-friend cap, conversation continuity

**Status: PHASE 3A INCOMPLETE — 3A.5 COMPLETE. Resume from checkpoint: 3A.6 (Personality & talent development, W3)**

## Scope (master spec 50–54, 60; plus the H2 note about calendar `party` events without a host)
- 3A.1 Compact People card + full Profile (age, gender, birthday, zodiac, looks, smart, health, happiness, reputation, interests, relationship, love interest if known, where/how met, introduced by, known since; Unknown for private info)
- 3A.2 Relationship Log (wide, left) + Milestones (compact, right, typed important moments only), migration from existing history
- 3A.3 Friendship model: add respect; tier promotion needs shared time (no three-click Best Friend); max 50 active friends — fading friends become Old Friend / Former Friend / Contact, never deleted; reconnect
- 3A.4 Conversation continuity: things you tell people become threads they follow up on ("How did tryouts go?")
- 3A.5 Calendar `party` conversion keeps its host; QC, full regression, fuzz

## Checklist
- [x] 3A.1  - [x] 3A.2  - [x] 3A.3  - [x] 3A.4  - [x] 3A.5 (W2)  - [ ] 3A.6 (W3)  - [ ] 3A.7 (W4)  - [ ] 3A.4  - [ ] 3A.5

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
- F. Friendship is fluid across life stages — **full text received in continuation Part 1 (see below)**. 3A.3 implemented only contact-based drift; the rest of F is recorded below as pending work.

## 3A.3 (done) — under the updated requirements A–F
- `friends73.js` (new): `friendshipTier` — Stranger (met during play, no shared days, low closeness) → Acquaintance → **Casual Friend** (closeness ≥ 40, trust ≥ 30, conflict < 60, ≥ 2 shared days) → **Close Friend** (closeness ≥ 72, trust ≥ 55, conflict < 45, known ≥ 21 days, ≥ 6 shared days) → **Best Friend** (closeness ≥ 86, trust ≥ 72, respect ≥ 45, reliability ≥ 55, conflict < 30, known ≥ 60 days, ≥ 15 shared days, ≥ 1 shared non-friendship milestone). Fun is not part of the ladder. Time/shared-day gates apply to people **met during play** (`metDate`); classmates added in bulk at stage changes, legacy saves and fixtures have no `metDate`, so only the relationship-quality conditions apply to them (no mass demotion). `sharedDays`, `knownDays`, `sharedMoments`, `lastContact`, statuses **Old Friend / Former Friend / Contact** (`friendStatusLabel`, `setFriendStatus`), `friendNetworkTick` (weekly: high conflict + low closeness → Former Friend; Casual Friend with 120+ days without contact → Old Friend; Close/Best with 240+ days fade slowly instead of flipping; more than 50 active → only the weakest Casual Friends drift to Old Friend / Contact), `reconnect` (same id, status cleared, logged; Former Friend → reconciliation milestone), `adjustRespect` (driven by `adjustReliability`: showing up / no-shows), `migrateFriendTiers` (stored Friend / Good Friend → Casual Friend; respect default 50).
- Wiring: `TIER_RANK` extended (Casual Friend = 2 keeps every old ≥1 / ≥2 check working; Close 3; Best 4; Old Friend 1; Stranger/Acquaintance/Contact/Former 0); `friendTier` → status or `friendshipTier`; `personFromNpc` records `metDate` / `metVia` / `metAt` / respect; `addStagePeople` clears `metDate`; card shows status + Reconnect; profile explains "Casual Friend (social companion)"; weekly tick in the daily chain.
- Soft ranges (Best ~1–3, Close ~5–10) are **not** enforced as caps (requirement E).
- Tests: `t_friend` 17 (legacy migration without duplicate milestones; Stranger; no day-one Best/Close friend; month of shared days → Close; months + shared milestone → Best; low respect blocks Best; conflict blocks Close; high Fun alone is not friendship; 57 friends → ~50 active, nobody deleted, Close Friends untouched, weakest casual ones drift; new people can still become Acquaintances; 4 months without contact → Old Friend; Reconnect button; same id after reconnect). `t_knx` K40/N49 updated to the new ladder (they asserted the old Friend/Good Friend labels and a closeness-only "best friend").
- Re-run: `t_knx`, `t_social`, `t_h2`, `t_bday`, `t_people`, `t_rst`, `t_romance`, `t_o`, `t_family2`, `t_ident`, `t_lmpq`, `t_friend` (×2), `t_ui`, `t_jordan`, `t_regress`, `t_holidays`, `t_campus` — all pass.

## REQUIREMENT CONTINUATION — PART 1 OF 5 (recorded, not yet implemented)

### F. Friendship changes across life stages (full)
- Tiers are not permanent labels; relationships change naturally across life stages **without** betrayal, a fight, a dramatic breakup or arbitrary forced demotion. Example: Best Friend in high school → Close Friend in university → **Old Close Friend** in adulthood.
- New people can gradually become more important (e.g. Coworker → Acquaintance → Casual Friend → Close Friend).
- A difficult life period can deepen an existing friendship **when that person genuinely supports the player** (parent illness, moving city, breakup, university transition, job loss, major competition, grief, major success). Consistent support = meaningful friendship evidence.
- **No automatic promotion from one dramatic event.**
- Evolution considers combinations of: closeness, trust, respect, reliability, meaningful support, time known, shared history, current life stage, recent contact, unresolved conflict.
- **No simplistic decay** ("30 days → tier drops"). Time and distance may contribute, but drift is gradual and contextual; strong relationships are resilient.
- Gap vs. current code (3A.3): drift is contact-gap based only; there is no "support evidence", no life-stage context, no "Old Close Friend" status. To be reviewed against this text before 3A.4 work is finalized.

### G. Friendship milestone rules
- Milestones for the new ladder: **Became Acquaintances, Became Casual Friends, Became Close Friends, Became Best Friends, Reconnected, Became Close Again, Friendship Faded, Reconciled**.
- **No duplicate milestones when a number crosses a threshold again.** A temporary dip and recovery must not create another "Became Close Friends".
- After a **real, meaningful period of separation** and rebuilding, use contextual milestones (**Reconnected**, **Became Close Again**) instead of a second "first time".
- Legacy milestone wording stays as history (no rewriting to make labels uniform); no duplicate migration milestones.
- Gap vs. current code: `addPersonMilestone` already blocks repeated types (once per type), but "Became Close Again" / "Friendship Faded" / "Became Acquaintances" do not exist, and the current label for Casual Friend is "Became friends".

## REQUIREMENT CONTINUATION — PART 2 OF 5 (recorded, not yet implemented)

### H. Profile header / information hierarchy
- Extend the existing Profile surgically (do not rebuild). Top of Profile: **FULL NAME**, then the **current relationship descriptor to the player** when applicable (Boyfriend / Girlfriend / Partner / Best Friend / Close Friend / Casual Friend / Sibling / Older Sister / Younger Brother / Mom / Dad…), then **Age, Gender, Known since** directly underneath.
- **Parents / guardians** near the identity section when legitimately known (e.g. "Benjamin Thomas — Dad", "Amelia Thomas — Mom").
- Boyfriend/Girlfriend is a **descriptor**, not a numeric romance level; Phase 3B redesigns romance stages — 3A only needs a stable descriptor/display hook.
- Gap vs. current code: the Profile starts with a "Full name" row and shows Relationship further down; no descriptor header; an NPC's parents are only shown in the person window (`npcFamilyLine`), not in the Profile, and not gated by knowledge.

### I. Relationship availability is knowledge
- NPC romantic status is **not omniscient**: newly met / weakly known → **Relationship status: Unknown**. Later learnable as Single / Talking to someone / Seeing someone / In a relationship / Engaged / Married (depending on age and future systems).
- 3A needs only: a knowledge state, Profile display, persistence, clean hooks for 3B.
- The player's own partner: status obviously known. Never hide what the player logically knows; never reveal what they have no legitimate way to know.
- Gap vs. current code: NPC couples exist (`npcCouples`, `partnerNpcOf`) and the person window shows "Dating X" to anyone; there is no knowledge state.

### J. Personality in Profile
- Add Personality / Lifestyle to the Profile, **not fully exposed** for strangers / weak acquaintances.
- Traits become known through repeated interaction, observed behaviour, conversation, shared activities, familiarity, family knowledge, strong relationship (e.g. repeatedly declining spontaneous plans but offering another time → Busy; repeatedly helping others → Kind; quiet in groups but open one-on-one → Shy).
- **Do not fabricate traits**; unknown → "Unknown" or omitted cleanly.
- Gap vs. current code: NPC `traits` exist but the compact card no longer shows them and the Profile does not; there is no per-trait knowledge state.

## REQUIREMENT CONTINUATION — PART 3 OF 5 (recorded, not yet implemented)

### K. Life goals / aspirations in Profile
- Show Life Goals in the Profile only when legitimately learned (deeper conversation, Confide, "Ask about the future", enough trust, shared activity, school/career talk, a story event). E.g. "Get into art school", "Become a doctor", "Travel the world", "Start a business", "Become a professional athlete".
- Not known → **Life goals: Unknown**. **Do not generate random goals to fill the field**; if the NPC data has no meaningful goal, keep Unknown.
- Gap vs. current code: NPC `goals` already exist (`GOAL_LABEL`, 8 uses; the old card showed "Wants to …" when trust ≥ 55). The 3A.1 compact card dropped that line and the Profile does not show goals; there is no explicit "learned" state (only a trust threshold).

### L. "Busy" (personality) vs "Free now" (availability)
- These are different kinds of information; someone can be **Personality: Busy** and **Availability: Free now** at the same time — not a contradiction, and the UI must make that clear.
- Busy belongs under **Personality / Lifestyle**, never beside availability badges.
- Busy must be a **real trait with hooks**: more commitments, lower spontaneous-plan acceptance, preference for planning ahead, more counter-proposals for another time, possibly slower replies, higher stress risk when overloaded, fewer spontaneous invitations. **Busy ≠ never available.**
- Do not deeply implement dating/messaging behaviour here (Phase 3B / 3C consume the hooks).
- Gap vs. current code: `'Busy'` is an NPC trait (3 references, e.g. in plan responses); the pre-3A card showed traits next to the "Free now / Busy" schedule badge (the ambiguity). The 3A.1 compact card shows neither the traits nor the availability badge; the Profile shows no traits.

### M. Personality & talent development foundation
- Keep the creator maximums (5 personality traits, 5 talents). Unused capacity must **not** be permanently closed: the player **may** later develop/discover traits or talents — optional, uncommon, evidence-based, contextual, hard to farm. Empty slots are **not** a checklist; a whole life with 2 talents / 3 traits is fine.
- Gap vs. current code: no trait/talent development exists (no origin metadata, no discovery logic).

### N. Core vs developed personality
- Creator-selected traits are **Core** (stable, resistant to change). Gameplay may add **Developed** traits and optionally **Developing** tendencies (metadata: Core / Developed / Developing). E.g. Core: Curious, Kind • Developed: Responsible • Developing: Adventurous.
- Core traits are never removed because of a few days of different behaviour; developed traits may strengthen or soften over long periods when behaviour genuinely changes. **No overcomplicated psychology simulator** — believable life development.
- Gap vs. current code: player traits are a flat list without origin metadata.

## REQUIREMENT CONTINUATION — PART 4 OF 5 (recorded, not yet implemented; section S re-sent separately in 4 parts)

### O. Personality must emerge from behaviour
- **No grind buttons** ("Train Kindness", "Become Responsible", "Unlock Adventurous"). Traits emerge from repeated behaviour and meaningful experience. **One action never grants a trait.**
- Evidence examples: **Responsible** — completing obligations, keeping promises, finishing homework, chores, punctuality, no no-shows, caring for responsibilities. **Empathetic** — comforting, listening in hard moments, supporting friends/family, sensitive responses. **Adventurous** — repeatedly trying new activities, travel, camping, outdoor challenges, exploration, reasonable new opportunities. **Social** — initiating conversations, maintaining relationships, social events, meeting people. **Calm** — constructive conflict handling, healthy stress responses, composure. **Ambitious** — long-term goals, competitions, leadership, sustained academic/career effort, major personal goals.

### P. Talent is not the same as skill
- Talent ≠ skill level 10; high skill does **not** automatically mean talent. Without a talent you can still become excellent through effort.
- Talent = natural aptitude, unusually fast learning, strong instinct, repeated evidence of potential. Skill = learned proficiency. Keep them separate.
- Conceptual progression: **No recognized talent → Emerging strength → Recognized talent**. **No farmable talent progress bar** ("Music Talent 82/100"); the player must not be able to tell that N more sessions unlock a talent.

### Q. New talent discovery must be difficult
- Requires a **combination** of evidence: sustained involvement over significant time, consistently strong performance, repeated fast-learning evidence, meaningful achievement, recognition by teacher/coach/mentor, competition/performance results, project quality, repeated positive feedback, relevant milestones, remaining talent capacity.
- Examples: **Music** (long-term practice, unusually fast improvement, successful performance, teacher/mentor recognition — not "played piano five times"); **Leadership** (real responsibilities, coordination, conflict resolution, repeated outcomes, recognition — not "won one election"); **Cooking** (sustained cooking, repeated good results, family/event success, feedback, fast learning); **Photography** (long-term practice, strong images, portfolio/showcase, mentor feedback, recognition); **Business** (real selling, customer handling, pricing, negotiation, planning, repeated success — future Phase 5D Side Hustles may provide evidence; **do not** implement the side-hustle overhaul now).

### R. Talent capacity
- Max recognized talents stays **5**. Starting with 2 → up to 3 more **may** be discovered — a possibility, not an expectation. Later talents progressively rarer (#3 possible, #4 much rarer, #5 exceptional; exact odds need not be hard-coded). **Empty talent slots must not become a grind target.**

### S. Talent recognition story (Section S, part 1 of 4 — received in full; replaces the truncated text)
- A talent must **never** be added silently (no bare `S.talents.push(...)`); it is surfaced through a **recognition / development event** in believable story context, **after accumulated evidence** — one compliment is not enough.
- Recognizers: teacher, coach, mentor, parent, sibling, friend, club advisor, later a supervisor or business customer. Examples: Teacher "You pick this up unusually quickly." • Coach "You read the court faster than most players your age." • Friend "You're actually really good at getting everyone organized." • Parent "You've always had an ear for music." • Mentor "You have a natural eye for composition." • Customer/supervisor "You seem to understand people and pricing naturally."
- **Player response** to an emerging talent: **Explore this seriously** (more future opportunities, more investment, may progress to recognized) / **Keep it casual** (keeps aptitude evidence, slower progression, no commitment) / **Not pursue it right now** (does not erase evidence, does not unlock, possible rediscovery later). None of these means "unlock now"; the recognition scene is part of progression, not necessarily the final unlock.
- **Emerging Strength** comes before **Recognized Talent**: enough evidence to notice unusual aptitude, not yet a full talent. It does **not** grant the full talent bonus (a smaller temporary effect only if the architecture explicitly supports it). Evidence may be tracked internally but **no visible percentage/meter**; the player experiences it through story.
- **Talent history** on official recognition: talent type, recognition date, age, recognition source, recognizer `personId` if any, source event/activity (e.g. "Music Talent recognized at age 14 — recognized by Ms. Nguyen — after the Spring Recital"). May appear in character history, Profile, milestones, Life Log. **Only official recognition** is milestone-worthy, not minor updates.
- Section S's continuation series continues below (part 2 = Section T).

### T. Central personality / talent evidence system (continuation series part 2 of 4)
- **No scattered grants** (`S.personality.push('Responsible')`, `S.talents.push('Leadership')` inside unrelated functions). **One canonical Character Development system** (names may differ, e.g. `addTraitEvidence`, `addTalentEvidence`, `recordCharacterDevelopmentEvidence`, `evaluateEmergingTraits`, `evaluateEmergingTalents`, `recognizeTrait`, `recognizeTalent`) — the architectural principle is mandatory.
- **Evidence records** carry context: target trait/talent, source action, source system, source event id, date, player age, context text, quality/strength, recognizer id, repeated-context protection (e.g. Leadership — source: Student Council project — quality: strong — "coordinated 5 students"; never a bare "Leadership +1").
- **Anti-farming**: repeated identical actions have diminishing/capped evidence (50 conversations in a day ≠ Social; the same chore repeatedly ≠ Responsible; piano all afternoon ≠ Music talent). Evaluation considers unique days, varied contexts, sustained time, meaningful outcomes, actual performance, recognition, milestones. Different traits/talents may use different evidence profiles.
- **Future integration**: later phases submit evidence to this API — 3B (social / communication / romantic behaviour), 4B (leadership, council, team roles, responsibility), 4D (competition outcomes, performance, academic aptitude), 5B (summer programs, coaching, sustained practice), 5D (business, sales, negotiation, customer service), university (academics, organizations, projects, research), career (performance, leadership, communication, specialization). **Do not implement those systems now — only the foundation/API.**
- **Personality evidence ≠ talent evidence** (no single generic score): personality = repeated behaviour, choices, social patterns, life experience; talent = aptitude, performance, learning speed, recognition, outcomes. E.g. studying Math every day supports Responsible/Ambitious evidence but does **not** prove Math talent.
- Gap vs. current code: no evidence system exists; player traits/talents are only set in the creator.

### U. Existing personality / talent effects must remain (continuation series part 3 of 4)
- Preserve the current functional effects — verified names in the current source: `traitBoost()` (1 definition), `TALENT_TARGETS` (4 uses), `TRAIT_TARGETS` (5 uses), player data in `S.personality` (14 uses) and `S.talents` (8 uses). **Do not replace working effects with decorative Profile labels.** Core personality and recognized talents keep affecting gameplay.
- **Behavioural hooks** (foundation only in 3A; later phases consume them): Responsible → reliability, obligations, keeping plans • Social → willingness to initiate • Shy → less spontaneous initiation, later stronger one-on-one comfort • Calm → stress response, conflict handling • Busy → scheduling preference, spontaneous-plan behaviour • Empathetic → support/comfort responses • Ambitious → long-term goal pursuit.

### V. Save migration (continuation series part 3 of 4)
- Existing `S.personality` / `S.talents` are **preserved**: existing personality entries = **Core** traits (unless more specific metadata already exists); existing talents = **recognized** talents. **No reroll, no removal, no auto-fill of empty capacity.**
- Migration guarantees: no duplicate traits/talents, no random new traits/talents on load, no lost trait/talent bonuses, development evidence persists, old saves stay playable. **Idempotent**: loading the same save repeatedly creates no new traits/talents, no duplicate evidence, milestones or recognition history.
- **Development metadata** added lazily and safely (conceptually: core / developed personality, developing traits, trait and talent evidence, emerging talents, talent recognition history), matching the existing architecture, with **one canonical source of truth** (no duplicate representations of the same data — `S.personality` / `S.talents` stay the lists of effective traits/talents).
- **Capacity** stays 5 traits / 5 recognized talents; never auto-filled. E.g. a save with Curious, Kind / Science, Music keeps exactly those, plus empty development capacity.


## REQUIREMENT CONTINUATION — S4A-1 (recorded, not yet implemented)

### W1. Checkpoint 3A.4 — Narrative continuity (structured threads)
- When the player shares a concern (e.g. tells Ella "I'm nervous about basketball tryouts"), store a **structured temporary thread** tied to: the person's id, the player, the **real event id** when available, topic, date, state (unresolved / resolved).
- After the **real** event, that person may follow up ("How did tryouts go?") using the **actual result**: made the team / did not make it / missed the tryout / postponed or cancelled. **Never invent a random outcome.**
- Same architecture for: exams, competitions, interviews, family issues, important plans, applications, performances, relationship concerns.
- **No free-form AI dialogue engine** — structured narrative memory only.
- Thread lifecycle: relevant while unresolved → eligible for follow-up after the real outcome → resolved after the follow-up → **expires when stale**.
- Meaningful outcomes may create Relationship Log entries or Milestones when appropriate; **small concerns are not milestones**.
- Relation to the previously planned 3A.4 note in "Exact next task": W1 supersedes it as the specification for 3A.4.

## REQUIREMENT CONTINUATION — S4A-2 (recorded, not yet implemented)

### W2. Checkpoint 3A.5 — Profile / knowledge
- Completes the remaining People/Profile work (specified earlier in H, I, J, K, L, G and the H2 note):
  - relationship-availability **knowledge** state + display hooks for Single / Talking / Seeing someone / In a relationship;
  - parents / guardians shown when legitimately known;
  - Personality / Lifestyle display (only observed/learned traits);
  - Life goals / aspirations display;
  - **Busy (personality) vs Free now (availability)** distinction;
  - friendship milestone refinements (section G);
  - **H2 note:** calendar-converted `party` events keep their organizer (host person id);
  - migration integration where needed.
- **Knowledge is never omniscient**: a weak acquaintance shows Relationship status: Unknown, Life goals: Unknown, Personality: only legitimately observed/learned traits. The player's own current partner's status is obviously known.
- **Not in 3A:** the full romance system — Phase 3B owns romance progression, exclusivity, NPC date invitations, the full dating lifecycle, matchmaking and blind dates. 3A builds only the Profile/knowledge foundation.
- Planning note: earlier "3A.5" in this file meant "calendar party host + full QC"; W2 now defines 3A.5 as the Profile/knowledge checkpoint (which includes the party-host fix). Where the full regression/fuzz and the character-development system (sections M–V) sit will follow from the remaining sub-parts.

## REQUIREMENT CONTINUATION — S4A-3 (recorded, not yet implemented)

### W3. Checkpoint 3A.6 — Personality & talent
- Implement the recorded foundation (sections M–V): Core personality, Developed personality, Developing tendencies where useful, Emerging Strength, Recognized Talent, **central evidence API**, max 5 personality traits, max 5 talents, no forced filling, difficult talent discovery, anti-farming, story-based recognition, save persistence, migration safety.
- **Only connect evidence sources that already exist** — do not build future systems just to generate evidence.

### W4. Checkpoint 3A.7 — Final QA
- Only after 3A.4–3A.6 are complete: all Phase 3A focused tests, relevant prior regression suites, **full regression**, save/reload tests, **migration idempotence** tests, required fuzz.
- **Phase 3A is not complete before this.**

### Resulting checkpoint plan for the rest of Phase 3A
- 3A.4 = W1 narrative continuity • 3A.5 = W2 profile / knowledge (incl. section G milestones, H2 party organizer) • 3A.6 = W3 personality & talent development • 3A.7 = W4 final QA.
- Section F (life-stage friendship evolution, support evidence) has no explicit checkpoint in W1–W4; it fits with 3A.5 (friendship refinements) or 3A.6 (evidence system) — to be confirmed by the remaining sub-parts or at implementation time.

## REQUIREMENT CONTINUATION — S4A-4 (recorded — scope boundary)

### X. NOT in Phase 3A (belongs to later phases)
- **H3 / fixes:** Decision Memory / Request Ledger; parent-permission reroll fix; romance-rejection reroll fix; Contest "Prepare" max-three-per-day fix; medicine correctness refinement.
- **Romance (3B):** NPCs asking the player on dates; full date overhaul; matchmaking; blind dates; date payment logic; teen romance expansion; sneak-out romance overhaul.
- **Communication (3C):** phone, messaging and smartwatch overhauls.
- **School organization:** multi-school; school organization registry; unique Captain / President role logic; election expansion; competition expansion.
- **Occasions / seasonal:** seasonal expansion; side-hustle overhaul; prom overhaul; universal birthday-gift / occasion system.
- Implementation rule for 3A.4–3A.7: when a 3A change touches code in these areas, only add hooks/data needed by 3A — do not change the behaviour these items own.

## REQUIREMENT CONTINUATION — S4A-5 (recorded — final acceptance criteria)

### Y. Phase 3A final acceptance (all must be verified in 3A.7)
**Friendship** — 1 ladder Stranger → Acquaintance → Casual Friend → Close Friend → Best Friend • 2 Old Friend / Former Friend persist • 3 Reconnect keeps the same person id • 4 family never counts toward the active-friend limit • 5 strong Close/Best friends are not demoted because the network exceeds ~50 • 6 Best Friend not reachable through a few repeated clicks • 7 Fun alone cannot create a Best Friend • 8 tier progression is multi-dimensional • 9 friendship milestones do not duplicate on small threshold changes • 10 a real reconnection may create "Reconnected" or "Became Close Again".
**Profile / knowledge** — 11 personality not fully visible to weak acquaintances • 12 life goals Unknown until learned • 13 relationship availability Unknown until learned • 14 parents/guardians shown correctly when known • 15 Busy and Free now clearly separate • 16 the current relationship descriptor stays stable.
**Personality / talent** — 17 existing Core personality survives migration • 18 existing talents survive • 19 existing bonuses still work • 20 empty capacity not auto-filled • 21 one repeated action cannot create a trait • 22 skill level alone cannot create a talent • 23 talent needs accumulated evidence • 24 recognition uses believable context/story • 25 development evidence survives save/reload • 26 migration duplicates nothing • 27 max 5 personality • 28 max 5 talents • 29 the player may permanently stay below both maximums.
**Narrative memory** — 30 a thread can remember a real future event • 31 a friend can follow up later • 32 the follow-up uses the real outcome • 33 resolved threads expire.
**Regression** — 34 H1 passes • 35 H2 passes • 36 Phase 2A health passes • 37 Phase 2B household/family passes.

### Documentation accuracy — verified source structure (finding while recording S4A-5)
- **The delivered project does NOT contain separate module files.** The ZIP contains `index.html`, `game.js`, `data.js`, `style.css`, `qa/` tests and the docs. Files such as `people73.js`, `friends73.js`, `family73.js`, `health73.js` (41 module files) exist **only in the build workspace**; they are concatenated into `game.js` by the build script (`tools/splice.py`, also not in the ZIP). Inside the shipped `game.js` each module appears as a section with a header comment (e.g. `// v7.3+ PHASE 3A.3 — Friendship ladder …`).
- Therefore earlier doc wording like "`friends73.js` (new)" in this file, CHANGELOG, QC_REPORT, AUDIT and the Phase 2A/2B progress files is **misleading for a reader of the repository**.
- Correction to do in execution mode (3A.7 documentation, or earlier): either (a) ship the module sources and build script in the ZIP (e.g. `src/` + `tools/`) with a short build note, or (b) reword every reference to "section *PHASE x.y* in `game.js`". Default plan: **(a)** — it makes the references true and keeps the project rebuildable — plus a README note explaining that `game.js` is generated. Until then, treat module names in the docs as "section names inside `game.js`".

### Status of the continuation
- Parts 1–3 recorded in full; Part 4 sections O–R recorded; **Section S continuation series parts 1–3 of 4 recorded (S, T, U–V)**. Series part 4 is arriving in sub-parts: **S4A-1 (W1), S4A-2 (W2), S4A-3 (W3–W4), S4A-4 (X), S4A-5 (Y acceptance) recorded.** Next: execution mode on instruction. **No implementation until all parts are recorded and the user says to proceed.**

## 3A.4 — Narrative continuity (W1) — COMPLETE
**Design.** Not a second event tracker: a conversation thread lives on the person you told (`p.convThreads`) and **points at an existing real outcome source** — the existing story-thread system `S.threads` (tryouts, elections; its resolved `stage` text such as "Not selected" / "Missed the tryout"), `S.exams` (real score / Missed / make-up), `S.school.contests` (result / No-show / Withdrawn / Cancelled), university decisions (`S.uniApps`), summer programs (`S.programs`). No outcome is ever invented.
- Lifecycle: **open** (told) → **ready** (real outcome exists; a postponed/make-up exam stays open) → **resolved** (after the follow-up) or **expired** (open > 45 days with no outcome, or ready > 14 days without a follow-up); resolved/expired pruned after 90 days. Max 3 open threads per person; the same topic is not stored twice; at most one follow-up per day across everyone.
- Telling someone: person window → **"On your mind"** lists real upcoming items (tryouts, elections, exams within 14 days, registered contests, pending university applications, active summer programs) → "Tell them about …" (small trust/closeness gain, Relationship log line). The window also shows what that person already knows.
- Follow-up: event `threadFollowUp` (real person required — added to the H2 actor-required set): "How did tryouts for … go?" / "How did the Mathematics test go?" / "Did you hear back from the universities?"; answers depend on the real result (good/ok → tell them / play it cool; bad or missed → admit it was rough / change the subject; called off → explain / change the subject). Effects are applied only to that person. Honest support after a bad result adds trust, lowers stress and counts as **support evidence** (`p.supportEvidence`); after two such moments the person gets the **"Helped during a hard time"** milestone (section F evidence). Good big outcomes are logged with higher importance; small concerns never become milestones.
- Not done in 3A.4 (by scope): interviews/job applications, family issues and relationship concerns as thread sources — the architecture supports them (`threadOutcome` kinds), but no existing system currently provides a resolvable outcome record for them; they will plug in when those systems exist (phase X boundary).

**Files actually changed** (see "Documentation accuracy": module files are build sources, not in the ZIP)
- Build sources (workspace only): `narrative73.js` (new — `upcomingTopics`, `threadOutcome`, `shareTopic`, `threadTick`, `queueThreadFollowUp`, `threadFollowUpChoice`, `narrativeHtml`, `narrativeClick`); `misc72.js` (daily chain calls `threadTick`); `uni73.js` (event chain routes `threadFollowUp`); `o73.js` (`threadFollowUp` requires a real person); `rst73.js` (person window shows "On your mind"); `ui72.js` (click chain); `tools/splice.py` (module order + test hooks); `tools/theme.py` (`.on-mind`).
- Shipped files: `game.js` (section "PHASE 3A.4 — Narrative continuity"), `style.css`, `qa/t_narrative.py` (new), this file.

**Tests**
- Added: `t_narrative.py` — 20 checks, passed twice (tryout via the existing story thread: topic listed, structured thread stored, no duplicate, no follow-up before the outcome, follow-up by that person, answers fit the result, real "not selected" quoted, thread resolved with trust + log, never asked again; exam: one follow-up per day, real score quoted, second thread on a later day; contests: missed / withdrew outcomes, postponed exam stays open, persistence across reload, stale expiry, person-window UI; two supportive follow-ups → "Helped during a hard time").
- Directly relevant regression run: `t_people` 14, `t_rst` 43, `t_friend` 17, `t_h2` 22, `t_ff2` 18, `t_knx` 44, `t_social` 52, `t_ui` 50, `t_jordan` 13, `t_regress` 16 — **all pass (0 failures)**. Full regression and fuzz reserved for 3A.7 as instructed.

**Known limitations**: follow-ups happen in person as events (not as phone messages — the phone/messaging overhaul is Phase 3C); thread sources limited to systems that already record real outcomes; in Fast Forward a follow-up is a background event answered by the character.

## 3A.5 — Profile / knowledge (W2) — COMPLETE
- **Profile header (H):** full name → **relationship descriptor** (`relationshipDescriptor`: Boyfriend / Girlfriend / Partner by the partner's gender; Mom / Dad / Older sister / Younger brother…; otherwise the friendship tier or status) → age • gender • known since (+ met date) → **Parents** (NPC household parents) only when known (`parentsKnown`: neighbours, Casual Friend or closer, closeness ≥ 40). The descriptor is a display hook; 3B will own romance stages.
- **Relationship availability knowledge (I):** `relStatusKnown` (your own partner; learned flag `relStatusKnown`; Close Friend or closer; closeness ≥ 60 + trust ≥ 55) and `npcRelStatus` (Single / Seeing someone (under 16) / In a relationship, from real NPC couples). Unknown otherwise. `learnRelStatus` is the hook for 3B sources (Talking / Engaged / Married). The person window no longer shows "Dating …" or the household line to people who would not know.
- **Personality / Lifestyle (J):** `knownTraits` — none for strangers/acquaintances, one at Casual Friend, two at Close Friend, all at Best Friend or for family, plus traits **observed from behaviour** (`observeTrait`). First behavioural source: an NPC who offers another time twice (`observeBusy`, both counter-offer paths in plan responses) reveals **Busy**. No trait is invented; "(there may be more…)" shows when not everything is known.
- **Life goals (K):** shown only when learned (`goalsKnown`); "Ask about their plans for the future" (Casual Friend or closer): low trust → deflects; enough trust → their real goal (from existing NPC `goals`) + a Relationship log entry; **no goal in the data → stays Unknown** (nothing generated).
- **Busy vs Free now (L):** Busy lives under Personality / Lifestyle; the schedule appears as a separate **"Right now"** row (Free now / At school / Occupied right now) on the Profile and the compact card — the availability text no longer uses the word "Busy". Busy's gameplay hooks (plan acceptance, counter-proposals) already existed in plan responses and are kept.
- **Friendship milestones (G):** `friendshipMilestone` — Became acquaintances (people met during play), Became casual friends (not added when legacy "friends"/"good friends" exists), Became close / best friends once; threshold wobble never duplicates; a real separation (`noteSeparation`: dropping from Close+ to ≤ Old Friend rank, or a faded status) of ≥ 60 days followed by becoming close again → **Became close again**; fading to Old/Former Friend → **Friendship faded** (once per fade); Reconnect → **Reconnected** (Former Friend → Major reconciliation). Legacy milestone wording kept.
- **H2 note:** calendar `party` events converted to invitations now carry their organizer (`participants` + `payload.hostId` from the event's person or plan) when there is one.

**Files actually changed**
- Build sources (workspace only — see "Documentation accuracy"): `people73.js` (3A.5 section; the old `profileHtml` was replaced, not duplicated), `friends73.js` (`setFriendStatus` / `reconnect` milestones), `knx73.js` (tier-up → `friendshipMilestone`, separation tracking, `observeBusy` on both counter-offers), `rst73.js` (knowledge-gated family / dating line), `core72.js` (party organizer), `ui72.js` (click chain), `tools/splice.py` (hooks), `tools/theme.py` (`.profile-head`, `.avail`).
- Shipped: `game.js`, `style.css`, `qa/t_profile.py` (new), `qa/t_people.py` (updated), this file, CHANGELOG / QC_REPORT / MIGRATION_NOTES.

**Tests**
- Added `t_profile.py` — 24 checks, passed twice (acceptance #11–16 plus G and the party organizer).
- Modified `t_people.py`: two checks updated to the intended 3A.5 changes (core fields now in the header; the casual-friend milestone type is `casualFriends`).
- Relevant regression on this checkpoint: `t_people` 14, `t_friend` 17, `t_narrative` 20, `t_rst` 43, `t_knx` 44, `t_social` 52, `t_ident` 20, `t_h2` 22, `t_ui` 50, `t_regress` 16, `t_jordan` 13, `t_holidays` 57, `t_lmpq` 36, `t_family2` 22 — **all pass, 0 failures**.

**Known limitations**: Talking / Engaged / Married availability states and gossip-based learning are hooks only (3B); Busy is the only trait with a behavioural observation source so far (others are learned through familiarity) — more sources come with 3A.6's evidence system and later phases; parents are shown from the NPC household record (the player cannot yet "visit" a home to learn it).

## Exact next task
**3A.6 — Personality & talent development (W3, sections M–V):** central evidence API (trait + talent evidence records with context/quality/anti-farming), Core vs Developed vs Developing personality metadata, Emerging Strength → Recognized Talent with story-based recognition and Explore / Casual / Not now responses, talent history, capacity 5/5 never auto-filled, migration (existing `S.personality` = Core, `S.talents` = recognized; idempotent), keep `traitBoost` / `TRAIT_TARGETS` / `TALENT_TARGETS` effects; connect only existing evidence sources. Stop after 3A.6.
