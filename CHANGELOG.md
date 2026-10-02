# Life Simulator Update Log

## v7.2 (phase 2) — Item lifecycles, inventory & store

### Item lifecycle system
- Every catalog item declares a `lifecycleType`: **consumable**, **finite** (limited supply), **durable**, **wearable**, **device**, **container**, **progress**, **perishable** or **gift**. Behavior comes from catalog data (`uses`, `effects`, `skills`, `consume`, `wear`, `progress`, `prep`, `battery`, `slot`, `capacity`, `freshnessDays`, `agingPerYear`, `repairable`, `maxQuantity`) instead of a hardcoded `useInventoryItem()` switch.
- 44 items across 13 categories (food & drinks, books, toys & games, arts & crafts, school supplies, clothes, beauty & care, sports, electronics, gifts, weather & outdoors, furniture, transport). Every item has a real gameplay use; there is no decorative filler.

### Food, drinks & containers
- Partial eating/drinking: **Eat a little** (25%), **Eat half** (half of what remains), **Eat all** (exactly what remains). Hunger/comfort scale with the amount actually eaten.
- Stacks: identical unopened items stack (Snack pack ×3). Eating opens one unit: ×2 unopened + 1 opened at 75%. Only the opened unit disappears when finished.
- Perishables (sandwich, fruit, flowers) go Fresh → Eat soon → Stale → Spoiled. Eating spoiled food can upset your stomach, and long-spoiled food gets thrown out.
- Water bottle: 600 ml capacity with tracked contents. Drink a little / half / finish, Refill (needs a tap at home or school), Clean. An empty bottle stays; it never produces water by itself. A badly worn bottle leaks and cannot be filled all the way.

### Condition, aging & repair
- Condition labels: Excellent (90+) / Good / Worn / Poor / Nearly broken / Broken. Durable use causes probabilistic wear (toys slowly, bikes per ride, devices very slowly), worn clothes lose condition daily, and everything ages slightly per year even when unused (less when stored).
- Broken items: Repair, Sell for parts, or Discard. Repair cost scales with damage; minors need caregiver approval.
- Value is always derived from price, condition, remaining amount and device age (`itemValue()`), never a stale stored number.

### Phone (desync fixed)
- The inventory item is the single source of truth. `S.phone` is a mirror synced by `syncPhoneState()` / `setItemCondition()`, so the Phone page and Inventory always show the same condition and battery.
- Phone use drains battery and slightly wears the phone (rare cracked-screen accidents). It charges overnight or via Charge.
- A second phone triggers a choice: switch / keep current / switch and sell old / switch and give old away. Spares can be switched to later.

### Ownership, slots & skills
- Multiple ownership: several books, toys, clothes, gifts and devices are separate instances; consumables stack, with a sensible `maxQuantity`.
- Equipment slots: top, bottom, outerwear, shoes, eyewear, head, accessory, bag. A sweater, raincoat, sunglasses and backpack can all be worn at once; wearing a hoodie replaces only the sweater.
- New hobby skills: art, creativity, fitness, sports, cycling, music, programming, writing, knowledge, imagination, gaming, style (reading continues to use the existing skill). Shown in Daily Life → Skills & hobbies.
- Anti-farming: the same skill practiced repeatedly in one day gives 100% → 75% → 50% → 30% → 15% → 7%; higher levels gain more slowly; using the same item many times in a day gets boring (smaller fun gains); every use costs time, and energy where relevant.
- Books/puzzles/games track progress (Unread → % → Finished → Rereading); rereading gives reduced skill gains. Laptops and tablets offer different uses (study / programming / write / game / watch) with different outcomes.

### Daily life connections
- Rain: an umbrella or worn raincoat prevents soaked, shortened outings. Cold: a worn sweater/hoodie improves comfort. Sun: sunglasses or a cap help.
- Desk lamp boosts study; a notebook speeds homework and uses pages; a worn backpack makes school days less tiring; worn sneakers add fitness when exercising.
- Daily Life gets a **Use your things** section. Basic actions (drink water at home, eat a meal) never require owning anything.

### Memories & gifts
- Meaningful items record their origin ("Your first phone, at age 15.", "A Christmas gift when you were 9."). Selling or discarding them stings a little.
- Gifts give one unit from a stack. Reactions consider price, personal items (a greeting card builds trust), wear, spoilage, and whether it meant something to you.

### UI
- **Your things**: category filter, a worn-items strip, and cards showing only the fields that matter (a snack shows its portion and never "Condition"; makeup shows % remaining and uses left; a phone shows condition and battery). Primary actions are up front; secondary ones sit under **More**.
- **Shop**: product cards with icon, description, effects, type (Reusable / 15 sessions / 600 ml • refillable / Fresh for 2 days…), owned count, caregiver-permission note, quantity picker for cheap consumables, and Buy / Ask caregiver / Birthday wish / Christmas wish.
- The Age Up year summary reports item wear ("Bicycle wore down to good (88%)").


## v7.2 (phase 1) — State lifecycle, obligations, Next Day & consequences

Central rule: **nothing important stays pending forever**, and one transition updates every related record.

### Confirmed bugs fixed
- **Stale kindergarten decision.** Pending decisions now have a lifecycle (`createdDate`, `resolveDate`, `expiresDate`, `minAge`, `maxAge`, `resolved`, `resolvedDate`, `resolutionReason`, `supersededBy`). At age 6 an unanswered kindergarten question is resolved as `Superseded` ("Primary school age reached") and leaves the active list; a journal entry is kept. If a 3-year-old never answers, the family moves to "Family discussing" after 14 days and decides on its own.
- **Exam ↔ calendar desync / stale "assessment today" banner.** All assessment outcomes go through `finalizeExam()`, which updates the exam record, its calendar event, subject grade, notifications, the hero context and the life log in one step. `exam = Completed` with `calendar = Due` can no longer happen; existing v7.1 saves are repaired on load.
- `normalizeSchool()` used to overwrite exam statuses on every render (it even turned a missed exam with score 0 into "Completed").
- A new school year wiped `S.exams` but left the old calendar events "Scheduled" forever. Old assessments are now archived and their events cancelled.
- Exams could be scheduled on weekends; they now land on school days.
- A caregiver "conditional" purchase answer (save half) kept the wrong type and could never be completed. It now becomes a real conditional request with a 180-day lifecycle.
- Homework finished once per year never regenerated (status `Done` ≠ `None`). Homework now cycles.

### New systems
- **`reconcileState()`** runs after migrate, on game entry, at birthdays, every day and after major transitions. It repairs impossible school stages, out-of-age pending decisions, exam/calendar mismatches, past obligations with active statuses, stale hero banners, expired events, outdated club/contest approvals, duplicate calendar entries and missing lifecycle fields. History is moved into `S.archive` instead of being deleted.
- **Obligation engine.** Calendar events are now obligations with `startMinute`, `endMinute`, `graceMinute` (arrival cutoff), `required`, `importance`, `location`, `attendanceStatus` and a status history. Lifecycle: Scheduled → Due → Attending → Attended/Completed, or → Missed / Excused / No-show / Withdrew / Cancelled / Expired. Obligations are resolved at 11:59 PM before the date changes.
- **School days** are real obligations (weekdays, 8:00–3:00, on time by 8:15, absent after 11:00, winter and summer breaks). "Attend school" at 11 PM gives no credit. Taking an assessment during school hours includes going to school for the day.
- **Missed assessments**: score 0 / incomplete, a teacher relationship hit (stronger for strict teachers) and attendance loss, applied exactly once. A follow-up event, "You missed Mathematics", offers four choices: Explain honestly / Claim you were sick / Ask for a make-up / Ignore it. The outcome depends on teacher personality, relationship and repeat offences. Make-ups are scheduled after school, and the grade penalty is reverted if a make-up is granted. Excused absences get an automatic make-up.
- **Homework deadlines**: Assigned → Due tomorrow / Due today → Late (reduced credit, up to 3 days) → Missing. Finishing gives Submitted or Submitted late. Escalation: 1 missing = minor note, 3 = caregiver conversation, 6 = parent–teacher meeting.
- **Clubs are commitments**: weekly sessions at 3:30 PM with Attend / Skip / "Tell the leader you can't come" (excused). Tracked: attendance %, attended/missed/excused, consecutive misses, leader relationship, position and warnings. Three misses in recent sessions → warning event. Four in a row (or repeated misses after a warning) → removed from the club. Teammates may comment the next day.
- **Contests require attendance**: registering creates an obligation; the result is only produced if you check in (10:00–11:30). Otherwise the outcome is No-show (reputation and stress consequences), or Withdrew if sick.
- **Delayed consequence chains (`S.followUps`)**: absence → school notice that evening → caregiver conversation on repeat offences (Apologize / Make up an excuse / Argue / Explain). Lying can be caught. Grounding blocks outings, trips and invitations.
- **Event response windows**: invitations must be answered by 6 PM (or the next day at noon if they arrive late). Other events expire after about a day. Expired events have contextual reactions and can no longer be acted on.
- **Notifications** have status (Unread / Read / Resolved / Expired) and source IDs. They resolve automatically with their source and are shown on the home screen.
- **Hero context lifecycle**: `S.current` is now an object with `sourceType`, `sourceId`, `priority`, `createdAt` and `expiresAt`. It is validated before every render and replaced by the next most relevant context (exam → club/contest → event → school day → today's agenda). Assessments show Preparation / Skill / Sleep / Stress and a direct **Take Assessment** button. Quiet moments show today's agenda instead of empty space.
- **NEXT DAY** button (separate from Age Up). It warns about today's unresolved obligations (Return / Advance anyway), finishes the day, sleeps and shows a morning summary (sleep, overnight changes, today's agenda, messages, what happened).
- **Sleep → morning**: sleeping in the evening/night carries you into the next morning (school-day alarm 6:30). Outcomes include slept well / restless / bad dream / woke at night / woke early / overslept. Sleeping in the afternoon is a nap.
- **Bedtimes by age** (7:30 PM toddlers → 10:30 PM older teens). Staying up late may be noticed, depending on household strictness.
- **Age Up simulates the year**: school days, assessments, homework and club sessions are attended or missed by probability (responsibility, stress, health, personality). The result is a **Year summary** (attendance %, assessments, make-ups, homework, club attendance, contests, relationship changes, money, notable events) instead of hundreds of popups.

### UI
- Education cards: structured header (subject / teacher · relationship / grade) and spaced metadata. This fixes "MathematicsMs. Kim" and "Skill100%Prep100%". A due assessment gets a high-priority callout with its own button; Study is a compact menu (30 min / 1 h / 3 h).
- Home: Today agenda, Notifications, open events with "respond by" times.
- Calendar: Today, attendance record, upcoming items with status/location/required flag, and "Recently resolved".
- Upcoming strip: terminal items disappear immediately; items happening now are highlighted.


## v7.1 — Developmental Activities, Household Permissions & UI Cleanup
- Reworked Daily Life personal activities by developmental stage.
- Infants now get sensory play, caregiver story time, radio music and babbling/interaction instead of independent reading/journaling/screens.
- Toddlers get toys, picture books with caregiver, simple art, radio and optional caregiver-approved TV; no independent journal/computer/phone actions.
- Independent reading starts around young-child age; journaling starts later as picture journal before full journaling.
- Added radio music as a no-screen alternative and radio news only when communication/age is sufficient.
- Added one centralized per-day caregiver permission system for TV, shared electronics/tablets/computers/game consoles, phone use and stove/cooking appliances while under 18.
- Electronic inventory items now enforce the same permission rule when used.
- Phone messaging/calls/apps/social posting now enforce household permission in addition to ownership + phone-age rules.
- Stove/cooking now enforces caregiver permission for minors.
- Removed the duplicate Recent life log from World & Journal; the chronological Life log now appears only once.
- Reduced the visible Life log to the latest 40 entries while preserving older history in save data.
- Fixed desktop sidebar overlap: the entire left column is sticky as one unit instead of the nav floating over Identity while scrolling.
- Mobile sidebar remains non-sticky and horizontally scrollable.


## v7 — Full Core Simulation & UI/UX Overhaul

### Architecture / stabilization
- Audited and refactored the existing v6.3 project rather than replacing it with a stripped-down demo.
- Save schema upgraded to **v7** with migration from v6.x/local legacy saves.
- Replaced scattered timing assumptions with a real simulation clock: **date + minute of day**.
- Added structured calendar events, pending decisions, cooldowns, notifications, milestones and richer inventory records.
- Kept static HTML/CSS/JavaScript deployment for GitHub Pages.
- Removed duplicate pending-decision resolver logic and cleaned long-skip handling.
- Age Up now jumps to the next actual birthday while processing promises, holidays, calendar deadlines and yearly transitions without producing hundreds of routine daily events.

### Basic needs & everyday life
- Needs remain visible in the main header and are clickable.
- Added compact labels/meters for Hunger, Hygiene, Toilet, Fun, Social, Comfort and Sleep.
- Core actions stay available at every age but change form appropriately:
  - caregiver feeding → self-feeding practice → independent meals,
  - diaper/toileting care → potty training → bathroom use,
  - caregiver bath → supervised washing → independent shower/bath,
  - age-appropriate sleep/nap durations,
  - brush teeth, wash hands, wash face, dress, rest and drink water.
- Added time costs to daily actions.
- Added logical, recoverable consequences for severe hunger, toilet pressure, low hygiene, exhaustion and loneliness.
- Added categorized Daily Life UI instead of one giant button wall.

### Time, calendar & delayed outcomes
- Current weekday/date/time is visible in the header and Calendar panel.
- Added upcoming-event strip and countdowns.
- Calendar now supports exams, club sessions, school events, parties and future decisions.
- Parent "Considering" decisions always have a resolution date.
- Conditional purchase promises support saving half, chores and school-grade targets.
- Birthday/Christmas gift requests do **not** resolve early.
- Christmas requests were tested to resolve once on Christmas Day.
- Lunar New Year lucky money is supported as a simplified contextual holiday event.

### Family / childhood
- Added household strictness, respect, generosity, reliability, responsibility and curfew tendencies.
- Added parents, grandparent, possible older sibling and extended-family caregiver context.
- Fixed family-role classification so relatives can never leak into romance matching.
- Kindergarten is a family decision with child preference + delayed caregiver resolution.
- Added chores and possible allowance.
- Added birthday celebrations, birthday invitations, family baby-shower events and neighborhood events.
- Gift reactions can be thankful, excited, privately disappointed, affectionate or openly negative, and affect family relationships/memory.

### Requests, shopping, money & possessions
- Added Cash, Savings and Parent-managed Savings.
- Fixed parent-managed childhood savings so they can actually contribute toward later purchases with permission.
- Added stores/categories for electronics, clothing, weather gear, beauty, school, food, toys, hobbies, sports, furniture, gifts and vehicles.
- Items have condition, original price, approximate current value, acquisition date/source and sentimental value.
- Inventory actions: **Use, Wear, Gift, Sell, Repair, Store/Unstore, Discard**.
- Added cheap/used/standard/flagship phone options.
- Minors may need permission even when they personally have enough money.
- Parent requests can resolve as yes, no, consideration, birthday/Christmas, save-half, chores or grade condition.

### Phone
- Phone ownership and phone access are separate concepts.
- A character may save/request/own a phone early, but independent phone use is gated to the high-school stage.
- Phone apps unlock by age: messages, calls, camera/photos, music, games, maps, shopping and school portal; later food delivery, transport, jobs, banking; adult-only dating app.
- Social posting, followers/fame and online-friend events are functional.

### School
- Kindergarten uses play-based development instead of GPA/exams/clubs.
- Primary/secondary school track subject scores, skills, preparation, teachers, teacher relationships, homework, attendance and behavior.
- Real exam dates/countdowns are stored on the calendar.
- Study options consume 30 min / 1 hr / 3 hrs, plus study-with-friend and ask-teacher variants.
- Exam outcomes use preparation, subject skill, current score, sleep, stress and luck.
- Cheating is possible but can fail and damage behavior/trust.
- Clubs are real commitments with signup decisions, caregiver approval when young, weekly sessions and club-specific actions.
- School competitions have registration deadlines, event dates, preparation and one-time results.
- Duplicate active school-event opportunities are blocked.

### Relationships / NPC world
- NPCs track closeness, trust, fun, conflict, jealousy, mood and shared history.
- People can be talked to, played/hung out with, confided in, gossiped with, argued with, apologized to, gifted, messaged/called when phone access exists, and approached romantically only when age/relationship rules allow.
- NPCs can initiate family/school/friend interactions without the player pressing a button first.
- Event cooldowns reduce repeat spam.
- Added childhood-to-later-life memory persistence.

### Weather / world / travel
- Daily weather and 5-day forecast affect outdoor comfort and small-business performance.
- Umbrella, raincoat, sweater, sunglasses, water bottle, fan, A/C and fireplace have practical uses/context.
- Travel changes by age: caregiver outing → family trip → permission-based teen trip → independent adult travel.
- Local destinations include park, playground, library, mall, cafe, restaurant, cinema, gym, supermarket, beach and friend’s house.
- Transport descriptions and permissions adapt to age and possessions.

### Work / life progression
- Part-time work unlocks at the teen stage with applications that resolve after a delay.
- Jobs have pay, shift length, manager/coworkers, performance, reputation, raises, quitting and retirement.
- Older adulthood supports retirement and age-related annual transitions.
- Age Up processes NPC aging, school progression, family/world changes and birthday outcomes instead of only incrementing a number.

### UI/UX
- Kept the contextual side-navigation concept; visible sections change by age.
- Needs and wants remain in the main HUD beside the current-life card.
- Added upcoming-event strip, contextual home prompts, pending-decision panel and responsive category panels.
- Added decision/person/message/gift modals for meaningful choices.
- Tested no page-level horizontal overflow at 1920×1080, 1440×900, 1366×768, 768×1024 and 390×844.

## v6.3 and earlier
Previous v6.x functionality is migrated where compatible rather than intentionally discarded. See `MIGRATION_NOTES.md` and `AUDIT.md` for details.