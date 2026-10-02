# Update Log

## v6.2 — Young-Age Action & Permission QC
- Re-audited visible and indirect actions by life stage.
- Travel is no longer an independent "Plan a short trip" action for babies/children.
  - Infant/toddler: caregiver/family outing.
  - Child: ask for an outing/day trip.
  - Young teen: caregiver permission required.
  - Older teen: can help plan, but caregiver approval remains required.
  - Adult: independent travel planning.
- Young characters no longer pay personal travel costs for caregiver-led family outings.
- People panel hides Message unless the character is high-school age AND owns a phone.
- Direct message actions are also centrally blocked, preventing hidden UI/event bypasses.
- Random events no longer generate phone messages for characters who cannot use a phone.
- Family panel no longer exposes romance controls to young children.
- Ages 10–12 can have naturally emerging crushes/close bonds without a dating action.
- Kindergarten no longer shows formal clubs, contests, GPA, rankings or exams.
- Primary school no longer shows GPA/class rank; assessments are age-appropriate.
- Clubs/contests now draw from age-appropriate option pools.
- Restored missing Growing Up and My Money renderer functions that could cause runtime crashes.
- Restored safe legacy Weather/Needs panel renderers so stale UI state cannot call undefined functions.
- Fixed v6.1 developmental need-actions writing potty/bathing/self-feeding progress to the wrong object level.
- My Money remains available from age 6; stands and yard sales require caregiver approval before 16.
- Investing is hidden until age 18 rather than showing a button that only errors.
- Outside/walk actions now enforce caregiver supervision/permission for children and teens.
- Added `AGE_ACTION_RULES.md` and `QC_REPORT.md`.


## v6.1 — Needs Interaction Hotfix
- Fixed a v6 regression where Hunger, Toilet, Hygiene and Sleep were visible but not actionable.
- Need cards in the main HUD are now clickable/tappable; no extra Needs tab was reintroduced.
- Hunger now resolves by life stage: caregiver feeding → assisted self-feeding → eating independently.
- Toilet now resolves by life stage: caregiver toileting → potty practice → independent bathroom use.
- Hygiene now resolves by life stage: caregiver bath → supervised washing → independent shower.
- Sleep now resolves as caregiver-settled naps/bedtime for very young children and independent sleep later.
- Fun, Social and Comfort needs are also actionable from the HUD.
- Developmental skill progress is updated during self-feeding, potty and bathing practice.
- Need actions advance time and write to Life History.


## v6 — Contextual UI, Phone Milestone & Deferred Gifts
- Replaced long horizontal tabs with age-responsive side navigation.
- Needs & Wants now live beside Age/current context.
- Weather is contextual rather than a permanent top-level tab.
- Toddler UI hides adult systems.
- Phone appears at high school (age 15 in current school model) and requires ownership.
- First phone costs $600; cash + savings can be combined.
- Birthday/Christmas requests remain pending until the actual occasion.
- Repeated begging is remembered and can affect family tension/outcomes.
- Birthday requests resolve on birthdays; Christmas requests on Christmas.
- Added Christmas presents and private-feeling vs outward-reaction choices.
- Added Lunar New Year lucky money for relevant/generated traditions.
- Existing developmental, school, family, weather, business, NPC, health, career and travel systems retained.

# Life Sim — Update Log

## v5 — Developmental Life Stages
- Reworked early life around dependency, caregivers, learned autonomy and permissions.
- Added life stages: infant, toddler, early childhood, child, young teen, older teen, adult and older adult.
- Added developmental skills: self-feeding, potty training, bathing, dressing, cooking, money handling and safety.
- Feeding, toileting, bathing and dressing now change behavior based on age and learned skill instead of exposing adult actions to babies/toddlers.
- Added Needs & Wants side panel with hunger, hygiene, toilet, fun, social, comfort and sleep pressures plus contextual wants.
- Added Development side panel showing autonomy, learned skills, kindergarten decision and family/childhood events.
- Added kindergarten decision around age 3. The child can express a preference, while caregivers make the final decision using household strictness, respect for the child, family circumstances and childcare needs.
- Added playdates and early-childhood family events, including birthday invitations, baby-shower/relative events and grandparent visits.
- Added play-based kindergarten panel for enrolled ages 3–5 rather than academic exams/GPA.
- Added age-aware cooking and daily routines.
- Added caregiver permission requirements for lemonade/baking stands and yard sales before age 16.
- Added richer birthday event logging and childhood celebration scheduling.
- Retained weather, school, NPC, family/love, health, career, money, travel/social, luck and mentality systems from v4.
- Migrated to a new v5 save key so incompatible experimental saves do not corrupt a fresh life.

## v4 — QC / Living World Expansion
- Fixed Begin Life startup crash caused by state-dependent mentality initialization.
- Added startup guards, save migration defaults and QC checks.
- Expanded family/love, health, career/money, travel/social, weather, school, NPC memories, small business and negotiation systems.

## Design rule going forward
Actions should be contextual consequences of age, development, relationships, place, time, weather, household rules and resources — not a static list of repetitive verbs.
