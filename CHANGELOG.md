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
