# Save Migration Notes

## v6.x → v7

The game first looks for the v7 autosave key and then checks legacy Life Simulator keys. A loaded legacy save is migrated in memory and saved back as v7.

Migration adds safe defaults for:
- simulation `clock` (date + minute),
- calendar and pending decisions,
- event cooldowns and notifications,
- emotional state and milestones,
- structured inventory items,
- parent-managed savings,
- richer NPC fields,
- phone app unlocks,
- richer career/health/social fields,
- school teachers/homework/exam calendar dates.

Legacy possession arrays and weather-gear counters are converted to structured inventory records. Legacy school `Considering` contest entries are converted to actionable `Open` entries with v7 decision/event dates. Existing people, relationships, money, needs, school scores, phone ownership and history are retained wherever the old data is usable.

The original legacy browser key is not silently deleted during migration. Restart/New Life removes only known Life Simulator keys after confirmation.


## v7 → v7.1
- Save key remains `lifeSim_v7_world`; existing v7 saves migrate in place.
- `version` becomes 7.1.
- `homeAmenities` gains safe defaults for `tv`, `radio`, and `sharedComputer`.
- `permissions.dailyAccess` is added with per-day flags for TV, shared electronics, phone, and stove. Old saves without these fields receive safe defaults.
- No existing inventory, relationships, school, money, calendar, pending decisions, or life history are discarded.


## v7.1 → v7.2
- Save key stays `lifeSim_v7_world`; `version` becomes 7.2. v6.x and v7/v7.1 saves remain loadable.
- `migrate()` ends with `reconcileState('migrate')`, which repairs:
  - **Stale kindergarten decisions** at age 6+ → `Superseded` (reason "Primary school age reached"), with a journal entry. Unanswered records at ages 3–5 get an `autoDecideDate`.
  - **Exam/calendar mismatches** → the calendar follows the exam record; duplicate exam events are removed; open exams in the past are closed as Missed (silently, without a retroactive popup); future open exams on weekends move to the next school day.
  - **Orphaned calendar events** (exams wiped by the old year rollover, sessions for clubs you left, contests no longer registered) → `Cancelled`. Past active events older than yesterday → `Expired`.
  - **Legacy `S.current`** text banners → replaced by a validated context object.
  - **Events** without `expiresAt` get a response window; **notifications** get status and source fields; old exam notices expire.
  - **Homework** `Done` → `Submitted`, `Archived` → `None`. **Clubs** get attendance, leader, warnings and position fields, plus a scheduled session if missing.
  - Mis-typed conditional purchase answers → `conditionalPurchase` with a 180-day expiry.
- New containers: `S.archive` (pending / calendar / events / exams), `S.followUps`, `S.school.record`, `S.schoolHistory` and `S.family.restrictions`. Nothing in existing history is deleted. Resolved records older than ~3–4 weeks move to `S.archive`, and finished school-day records are summarized into `S.school.record`.


## v7.2 phase 2 — inventory records
`normalizeInventory()` upgrades old item records in place, deriving defaults from `data.js`:
- Adds `lifecycleType`, `quantity`, `opened`, `remaining`, `slot`, `battery`, `capacity`/`contents`, `progress`/`completions`, `freshUntil`, `timesUsed`, `useLog` and `origin` where relevant.
- Finite items that used "condition" as an amount (e.g. makeup) keep that number as `remaining`; their condition is reset to 100.
- Separate legacy records of stackable items (e.g. three snack packs) merge into one stack.
- Only one equipped item per slot is kept (the old category-based rule could leave two tops equipped).
- **Phone:** the phone inventory item becomes canonical; `S.phone.condition/model/owned/battery` are re-derived from it, and an active phone is chosen (`S.phone.activeItemId`). An owned phone with no item record gets one.
- The stale stored `currentValue` field is removed; value is computed live.
- `S.skills` and `S.practiceLog` are added with zeros. Nothing is deleted from ownership history.
