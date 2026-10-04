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


## v7.2 phase 3
- `S.education.graduations` is added. Saves aged 6+ that attended kindergarten get a kindergarten graduation (year of the 6th birthday) as a milestone.
- School names that do not match the current stage are renamed (e.g. a primary pupil at "Sunrise Secondary School" → "Sunrise Primary School"). Clubs and teachers carry over only within the same school.
- Open future assessments that share a date are spread to separate school days.
- Registered school-day contests still at the old 10:00 slot move to the 13:00 in-school slot before they start.
- `S.calendarProfile` (region + per-holiday overrides) and `S.holidayLog` are added. Old `holiday-*` flags still prevent re-triggering.
- UI preferences (sub-tab per screen, log drawer open) live under a separate localStorage key `lifeSim_ui`, not in the save.


## v7.2 phase 4
- No save changes. The appearance preference lives in `lifeSim_ui.theme` (`light` | `dark` | `auto` | `life`; default `light`). Existing players without a stored preference start in Light and can switch back to Dark in one click.


## v7.2 phase 5a
- People: `firstName`, `surname`, `fullName`, `nickname`, `roleLabel`, `npcId`, `goals` are added. Legacy names like "Mia • neighbor" keep the given name (Mia) and gain a surname; `name` becomes the full name. Mom/Dad/Grandmother keep their `name` (used for address) and gain a gender-appropriate full name.
- New containers: `S.npcs` (school roster), `S.households`, `S.plans`, `S.elections`, `S.threads`, `S.outcomes`, `S.schoolRep`, `S.family.trust` (default 60), `S.school.tryouts`, `S.familyName`.
- Existing friends count as filled social slots (no duplicate "classmate" is added on load). Existing club positions not on the new ladders are mapped on the next promotion check.


## v7.2 phase 5b
- People gain romance fields lazily (`attraction`, `romanceStage`, `romanceOpen`, `boundaries`), plus `promWith`, `datingNpc`, `giftsReceived` and `movedAway` as they come up. `S.romance.partnerId` is added; the legacy `S.romance.partner` name string is kept for display.
- New containers: `S.neighborhood` (households and reputation, created on load for ages 3+), `S.groups`, `S.rivals`, `S.awards`, `S.scene` (a date or prom night in progress; resumable from the hero), `S.school.prom`, and `S.family.ruleBreaks`.
- The old romance action (which had no partner-age check) is replaced; any existing `S.romance.status` text is preserved.


## v7.3 batch A
- `S.version` → 7.3. `S.zodiac` is recalculated from `S.dob` on load, because the old calculation was wrong for many dates and the sign is now always automatic.
- Messages gain `fromId`. Older messages are linked to the sender by name and role, preferring non-family people; their `from` becomes the person's full name.
- Existing characters keep their birth year. Only new lives start in the current year.


## v7.3 batch A2
- Saves aged 18+ that are still enrolled close the school year on load: awards, a high-school graduation, and `S.school = null`.
- A prom record (`S.school.prom`) is created for the current school year on load for Grades 8–12, if its late-April date is still ahead.


## v7.3 batch G
- The school record gains `yearKey` (the academic year), `reports`, and `semExams`. A save without `yearKey` is tagged with the current academic year and keeps its grade; `S.education.gradeOffset` is stored so the next school year is exactly one grade higher.
- `S.education.highSchoolDone` marks graduation; no school is created afterwards.
- Prom pairings are stored on the NPC records as well as on people, and existing one-way pairings are kept as they are.


## v7.3 batch B–F
- New fields: `S.farm` (today's per-target action counts, reset daily), mood bookkeeping (`S.moodClock` and related), and per-subject study/advanced-exercise day markers. Existing skill and reputation values (0–100) are kept and simply displayed as levels (10 points per level).
- Grades become one-decimal numbers as soon as you study; older integer grades are unchanged.


## v7.3 batch H + I + J
- `S.weather` gains `severity` and a real 5-day `forecast`; old saves get a new forecast at the next day change. New: `S.closures` (closure dates with reasons).
- The school record gains `lateReasons`, `stayHomeAsks`, `expulsionHearing` and `probation`; the school gains `behaviorCalls`, `conf` (conference per semester) and `stayHome`.
- Per-absence caregiver talks now follow the threshold schedule (1 notice, 4 and 7 talks, 10 call, 20 meeting, 35 warning, 45 hearing) instead of a talk after every absence.


## v7.3 batch K + N + X
- People gain `tier`, `battery`, `invites`, `reliability`, `bday` (NPCs get `bday` too), `bdayWished` and `giftsReceived` lazily. New: `S.chats`, `S.callLog`, `S.whiteLies`, `S.outings`.
- Old `S.messages` are copied once into `S.chats` (`S.chatsMigrated`), after being linked to their senders.


## v7.3 batch L + M + P + Q
- New: `S.programs`, `S.trip`, `S.tripOffer`, `S.family.anniversary` and `lastTripOffer`, item `wrapped`, skill `baking`. Catalog additions: bakedCookies, cupcakes, heartCookies (not sold in the store) and heartWrap (Valentine's seasonal).
- The teen curfew changes on load (22:30–24:00 by strictness). Existing plans are unchanged.


## v7.3 batch R + S + T
- People gain `love` ({stage, progress, since}). It is derived from the existing `romanceStage` on first use: crush → one-sided/mutual by attraction, dating → Going out, partner → Boyfriend/girlfriend.
- New: `S.npcCouples` (old `datingNpc` name strings are converted when both NPCs exist and fit the age rules; otherwise cleared), `S.romance.promiseRing / spareRing / livingTogether / married`, `S.housing` (when living together), and child people from starting a family.
- The person history cap is raised from 30 to 60. The UI preference for the removed "development" tab still renders safely.
