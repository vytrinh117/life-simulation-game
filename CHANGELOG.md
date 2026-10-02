# Life Simulator Update Log

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
