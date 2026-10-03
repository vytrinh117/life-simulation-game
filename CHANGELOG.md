# Life Simulator Update Log

## v7.3 (batch G) — Real school year with 2 semesters, regional calendars, prom & elections Grades 8–12, more people to meet

### School year (§G)
- **School years start on a fixed date per country** instead of on the character's birthday: US late Aug; UK, US-style INTL, VN, FR, CN early Sept; CA after Labour Day; KR March; JP April; AU late Jan; SG early Jan; TH mid-May.
- **Two semesters** per year, each with its own assessments (and Semester finals from Grade 6), a semester break, and a **report card** at the end of each semester. Education → Today shows the current semester, its end date and the next break.
- **Real breaks per country**:
  - US: Thanksgiving, winter, spring break.
  - UK: half-terms, Christmas, Easter.
  - FR: Toussaint, Christmas, winter, spring.
  - VN: New Year, **Tết week (lucky money stays)**, 30/4–1/5.
  - CN: National Day, Spring Festival.
  - KR / JP / AU / SG / TH: their own vacations.
  - New Year's Day, Christmas, US/CA Thanksgiving and Lunar New Year (VN/KR/CN/SG) are days off.
- **Grades follow the country's age cutoff**, not birthdays (e.g. a child born after Sept 1 in the US starts Grade 1 a year later). Classes move up on the **first day of the new school year**. Summer is a real gap between grades.
- **High school ends after Grade 12** with a graduation at the end of that school year.
- **The calendar plans 2 school years ahead**: first days of school, Semester 2 starts, breaks, last days, graduation day, and future proms marked "(planned)".
- **Old saves keep their current grade** until the next first day of school, then move up exactly one grade (no repeat, no skip).

### Prom & elections
- Prom every year from **Grade 8 to Grade 12** (Junior Prom in Grades 8–9), on the Saturday nearest the **middle of semester 2**, on the calendar from the first day of the school year.
- **School elections are open in Grades 8–12** (all five grades). Batch A2 had wrongly excluded Grade 9 by reading "8th grade and 10–12th grade" literally.

### Prom fixes from playtesting
- **No more prom "chains".** Previously one NPC could say they were going with Sam, while Sam said he was going with Maya. Pairings are now always two-way and stored on both people (and on the underlying NPC record), so every refusal names a consistent partner. NPC couples who are dating go together.
- **You can ask neighbors near your age**, even ones you have not formally met; they appear in the ask list.
- **Fewer rejections**: a lower acceptance threshold, a bonus close to prom night (people still looking say yes more easily) and a bonus for members of your friend group. Friends at closeness 45+ often accept "as friends". NPCs pair up gradually instead of almost everyone being taken early.

### More people in your life
- **Meeting new people when you go out** (mall, café, library, park…): sometimes nobody, often one person, occasionally two, all age-appropriate. Chat with one, say hi to both, or keep to yourself; chatting adds them to People with a short story about how you met. It happens a little less once you already know many people.
- **New classmates each school year** (1–2 introduced on the first day).


## v7.3 (batch A2) — Prom for Grades 8–12, election grades, attendance tab, Grade 12 fix

- **Prom is planned from the first day of the school year** and appears on the calendar immediately. Before, it was only created at the first midnight after turning 16, so it was missing on the birthday and in Grades 8–10.
- **Prom every year from Grade 8 to Grade 12.** Grades 8–9 have a **Junior Prom**; Grades 10–12 have **Prom**. It falls on the **last Saturday of April** (the middle of the second half of the school year), and every birthday gets a prom inside its school year. Prom candidates are age-appropriate peers (within 2 years, 13–18).
- **School elections only in Grade 8 and Grades 10–12** (Student Council and club leadership). Grade 9 and younger see a clear message instead.
- **Attendance moved to its own Education tab** (Today / Subjects / Assessments / **Attendance** / Clubs & events), with this year's record, warning highlights and attendance history by past grade. The Calendar → History tab no longer duplicates it.
- **Fixed: "Grade 12" was repeated at age 18.** High school now ends after Grade 12 (age 17). At 18 the school year closes with end-of-year awards and a high-school graduation milestone. Existing saves still in school at 18 graduate on load.
- **Fixed: assessments were scheduled after the school year ended** and then showed up as "Cancelled • School year ended". Rolling assessments now stay inside the current school year.


## v7.3 (batch A) — Character creator fixes, zodiac fix, phone at 13, message reply fix, layout

### Character creator
- **Random buttons now change only their own field.** Previously all 8 per-field buttons called the same `randomize()` function, which re-rolled every field. Personality and Talents also get their own Random buttons.
- **Horoscope is automatic.** The manual dropdown and its Random button are gone; the sign is shown read-only and updates as you change the birth date.
- **Modes simplified.** MIXED, TRUE RANDOM and SURPRISE ME all did the same thing. Now there are two: **Surprise me** (everything) and **Fill the rest** (only empty fields; what you typed is kept). Fields start empty ("Choose…"), and anything still empty when you begin is filled randomly.
- **Birthplace is chosen from dropdowns**: Country → City/State (11 countries, 46 cities). No free text. The calendar region, name pools and holidays follow the choice.
- **New lives begin in the real current year** (from the device clock: 2026 now). The date picker is limited to that year, and a typed date from another year is moved into the current year. The QA harness can still use historical dates with `?qa=1`.

### Bugs fixed
- **Zodiac was wrong for about a third of birthdays.** The table returned *Capricorn* for every date after a sign's cutoff day (e.g. Jul 23 → Capricorn instead of Leo). Rewritten and verified at the cutoffs. Existing saves get their sign recalculated from the birth date.
- **Replying to older messages did nothing.** After the phase 5a renaming, replies looked people up by their old "Mia • neighbor" name. Messages now store the sender's ID; old messages are linked on load, preferring non-family people with the matching role, because a parent can share a first name with a friend.
- **Person window layout**: memory dates no longer run into the text ("age 6Hang out"), and the Closeness / Trust / Fun / Conflict tiles sit on one row.

### Changes
- Personal phone use now starts at **13** (was 15).


## v7.2 (phase 5b) — Prom, dates as scenes, romance with safety rules, neighborhood, friend groups, rivals, awards, gift reactions

### Safety rules (enforced in game logic, not just hidden in the UI)
- **Fixed a real issue:** the old "romance" action did not check the other person's age, so a teen could "flirt" with an adult acquaintance. Romance now requires the player to be 13+ and an age-appropriate partner: minors only with other minors aged 13–17 within two years; adults only with adults.
- Teen romance stays wholesome (hanging out, holding hands, hugs, slow dances). Kissing goodnight and any intimacy options exist only when **both** people are adults, and the logic refuses them otherwise, even if called directly.
- **Adult intimacy** (§81) needs mutual consent every time and fades to black with no explicit description. A "no" is always respected and never punished: trust goes up, closeness does not drop, and there is no "push" option.
- **Sneaking out** (§82) for minors is about friends and parties only. Sneaking a romantic partner over is blocked for minors.
- Players can opt out of romance content (`S.romance.optOut`).

### Romance & dates (§83, §107)
- Each NPC has an attraction level, a stage (none → crush → dating → partner → ex), whether they are open to romance, and **boundaries** (no public affection, no expensive gifts, needs time, no big parties, not ready). Ignoring a boundary costs trust; once you know someone well, you learn their boundaries.
- **Dates are multi-step scenes**: pick a place (picnic, café, movie, walk, arcade; dinner and cooking together for adults; beach 16+) → choose a conversation topic (fit depends on their personality and trust) → a random moment (spill, run-in, perfect view, buzzing phone…) → how you say goodbye. The result (great / good / awkward / rough date) is narrated with the reasons. Weather and money matter; a very bad date can end a new relationship.
- NPC partners break up if the relationship is neglected (with a reason); relationships can be made official or ended.

### Prom (§63–70)
- For high-schoolers 16+, prom is scheduled each school year (a Saturday evening, with venue, formal dress code and ticket). Prom season opens 4 weeks before.
- **Ask someone** with an approach (casual, private, promposal, text, in front of friends, with a gift, jokingly); what works depends on their personality. Responses always come with a reason: accepted (crush, hoping you would ask, impressed by the promposal), accepted **as friends**, "let me think" (decided later), or rejected (already has a date, dating someone, not going, embarrassed by a public ask, recent argument, no attraction, low relationship).
- **Second chances**: ask someone else, go with friends, go alone, or skip. Asking several people in one week starts gossip, and others may mention it.
- **NPCs act on their own**: they pair up, decide not to go, and ask you (accept / as friends / need time / decline / "I already have a date"). If you take too long, they ask someone else.
- **Preparation** with free alternatives: ticket or waiver; buy / borrow / wear your own outfit; salon or DIY hair; makeup if owned; corsage where it is a tradition; ride (caregiver / carpool / split a limo); dinner; photos; prom committee work (leadership).
- **Prom night** is a 6-stage scene: getting ready (possible outfit mishap) → meeting up (date may be late) → arrival and dancing (crush with someone else, a friend in trouble, a compliment) → slow song (possible confession) → prom court (based on reputation) → after (diner / home / after-party with a curfew check). Drama is not guaranteed; good nights happen.
- **Memories**: "You attended prom with …", "You skipped prom and spent the evening gaming with friends." No prom record ever stays Due.

### Valentine's (§79–80)
- Couples (13+) get a Valentine date scene and a card exchange. Singles can hang out with friends, treat themselves, go to a singles mixer (18+, may meet someone new), or receive a secret-admirer card (teens). Nothing is forced.

### Neighborhood (§91–93)
- Four persistent named neighbor households (some with pets), plus ~20 event types: a new family moves in, neighbors move away, block party, garage sale (real bargains), cleanup, lost pet, misdelivered package, power and water outages, street repairs, festival, fundraiser, lemonade stand, noise complaint, neighbor argument, kids playing, snow (cold regions in winter), community garden, market, and neighborhood watch (18+). Every choice is narrated and can introduce new people.
- **Neighborhood reputation** has 7 dimensions (helpful, friendly, quiet, social, troublemaker, local business, well-known), shown in World.

### Friend groups, rivals, NPC agency (§62, §106, §114)
- With 3+ close friends, a **friend group** forms with a name. It develops inside jokes, group-chat banter, someone feeling left out, internal arguments (mediate or take sides), new members and group outings.
- **Rivals** come from competitions (tryouts, elections): handshake, trash talk or ignore. Rivalries can become respect, resentment, or friendship.
- NPCs date other NPCs and break up (they may need comfort), ask for favors, and occasionally send you small gifts.

### Gifts (§108)
- Gift reactions consider personality and club interests, occasion, price versus closeness, the "no expensive gifts" boundary, handmade or sentimental value, duplicates ("already have one from you!"), wear and spoilage. Results: loved / liked / appreciated the effort / awkward / already had one / not their thing, always explained, and recorded in outcome history.

### Awards (§115)
- At the end of each school year: Honor Roll, Perfect Attendance, Competition Winner, Club Leadership, Art & Creativity, Athlete of the Year, Student Government Service, and Kindness. Awards update reputation; parents and friends react; they appear in milestones and the Journal.

### Story coverage (§60, §123)
- Everyday relationship actions (talk, hang out, play, confide, gossip, argue, apologize, message, call) now narrate what happened, using traits, shared memories and group jokes, instead of only listing stat changes.


## v7.2 (phase 5a) — People with real names and lives, plans/RSVP, house rules, tryouts, elections, school reputation

### Names (§97–101)
- Every persistent NPC has `firstName`, `surname`, `fullName`, an optional `nickname` and a unique ID. Name pools are regional (English-speaking, Vietnamese, Korean, Japanese, Chinese/Singaporean, French, Thai). Vietnamese, Korean, Japanese and Chinese names use family-name-first order; Vietnamese names keep their diacritics.
- Before assigning a name the game checks every existing NPC and person and retries, so unrelated people never share a full name. Names never change after creation.
- **Households** follow cultural conventions: siblings share a surname; VN/KR/CN parents keep their own surnames; other regions mix shared, hyphenated and separate parent surnames.
- **Nicknames** (Alexandra → Alex, Benjamin → Ben…): close friends are shown by nickname, others by full name, family as Mom/Dad.
- **Migration**: legacy "Mia • neighbor" people keep their given name (Mia), get a surname, and keep their role. Parents and grandparents get gender-appropriate full names in the family's convention. Existing people count as filled social slots (no duplicate classmates).
- A persistent **school roster** of peers (with households, traits, goals and interests) provides classmates, rivals, election opponents and tryout competition.

### NPCs with their own lives (§62, §102–103)
- **Availability**: friends sleep, go to school, have practice on their club day, eat dinner with family, study for tests and occasionally travel. Asking a busy friend gives the real reason ("Leo can't hang out right now because basketball practice starts in 30 minutes") with *Ask later / Schedule something / Message instead*.
- **Goals** (make a team, good grades, class president, music/art, more friends, university, save money) shape their decisions: studious friends decline outings before a test; savers decline paid plans; shy friends avoid parties. Goals are visible once trust is high enough.
- NPCs invite you to future plans, sometimes cancel themselves (with a reason), and run in elections against you.

### Invitations, RSVP & plans (§94–95)
- **Make plans** with anyone (hang out, study together, movie, picnic, game night, mall, sleepover, party; age-gated) for later today, tomorrow after school or the weekend. The NPC answers **Accepted / Maybe / Declined** with a contextual reason; a Maybe resolves later.
- NPC invitations show the date, time, place and an **answer-by** deadline: *Accept / Maybe / Decline politely*. An unanswered Maybe expires ("they take your silence as a no").
- Accepted plans go on the calendar as obligations: **Go** (late arrival is noticed), **Cancel early** (small hit), **cancel last minute** (bigger), or **no-show** (closeness/trust loss, conflict, and a confrontation the next afternoon: explain / apologize / brush it off). Plans tell a story, with outcomes from great to awkward depending on closeness, lateness and weather.

### House rules (§96)
- Minors have a **curfew** by age (adjusted by strictness), bedtime, and rules for going out, sleepovers and parties. Asking first can be met with *Negotiate (home by curfew)*, *Accept the answer*, or *Go anyway (disobey)*. Disobeying risks being caught (grounding, a large trust loss).
- New **household trust** (shown in People → House rules): asking first and obeying build it; lying and disobeying cost it; trust shifts future approvals.

### Clubs: sign-up, tryouts, progression (§72–75)
- Three kinds of clubs. **Open** (Art, Reading, Chess, Science, Coding, Photography, Volunteer, School Newspaper, Recreational League…): sign up. **Selective** (Drama, Debate, Music): **audition**. **Sports** (Football, Basketball, Swimming, Volleyball, Track): **tryout**. Plus **Student Council** (by election). *Learn more* shows the entry method, judged components, spots, relevant skills and the position ladder.
- **Preparation** before a tryout: practice alone, with a friend, lessons ($25) or a weekend camp ($60), with diminishing returns per day.
- **Tryouts** score each component (e.g. Dribbling / Shooting / Fitness / Teamwork) from skills, fitness, confidence, preparation and luck against competition from roster peers who share the interest. Outcomes: starting lineup, reserve, **waitlisted** (a spot may open a week later) or **not selected**, always with a reason ("Coach Lee liked your fitness, but your shooting (31) is not strong enough yet").
- **Recovery paths**: practice and try again (next tryout ~4 weeks later, keeping part of your preparation), or join the Recreational League.
- **Club-specific ladders**: Sports (Reserve → Starter → Vice Captain → Captain), Drama, Council, Newspaper, Debate, Music, and a generic ladder. The leader promotes you through the lower ranks based on sessions, attendance, skill and relationship.

### Elections (§76–77)
- The top club positions and Student Council roles are **elected**, against named NPC opponents. A one-week campaign offers: write a message, talk to classmates, ask friends, posters, speech (quality matters), online campaign (13+, can backfire) and **promise an initiative** (popular, but you must deliver later). Results come from reputation, friends, effort, speech, opponents and luck, with vote shares. You can lose; NPCs win and lead. Losing offers *congratulate the winner* (kindness and a new relationship), *lead elsewhere*, *run again next year*, or *keep your distance*.

### School reputation & identity (§71, §78)
- Eight dimensions (academic, athletic, creative, leadership, social, kindness, troublemaker, clubs) driven by real behavior: exam results, participation, skipping, tryouts, club sessions, contests, elections, lunch with friends, volunteering, cheating and absences. They drift slowly back to a baseline.
- Emergent **identities** (Star Athlete, Theatre Kid, Student Leader, Academic Competitor, Art Student, Debate Kid, Musician, Popular, Kind Classmate, Known Troublemaker) are never permanent. Occasional **recognition moments** ("A younger student recognizes you from the last game").

### Continuity, threads & outcome history (§109–112)
- **Story threads** track multi-step stories (tryout attempts, campaigns, plans) from start to resolution. **Outcome history** records each result with its reason. Both appear in World → Journal.
- Friends remember: a friend who knew about your tryout asks the next day how it went.


## v7.2 (phase 4) — Light / Dark / Auto / Life themes & a consistent icon set

### Themes
- The forced dark-only design is gone: `<meta name="color-scheme" content="dark">` became `light dark`, and the global `color-scheme: dark` was removed.
- Four appearances: **Light** (new default; warm canvas, white elevated cards, soft shadows), **Dark** (the previous look, now token-based), **Auto** (follows the OS and switches live when the OS changes), and **Life** (warm, colorful light variant).
- Switch from the top-bar button (cycles Light → Dark → Auto → Life) or Menu → Appearance. The choice is stored in the UI preferences (`lifeSim_ui`), separately from the life save, and survives Restart / New Life. A tiny inline script in `<head>` applies the theme before first paint (no dark flash on light), and transitions are suppressed for one frame while switching (no color "fade" flash).
- **Semantic tokens**: every hardcoded color was converted by an auditable script (`tools/theme.py` mapping table; not shipped). This covers ~60 literals, including the `#11151c / #10141a / #12171e / #1a2029`-style surfaces and all `rgba(255,255,255,…)` / accent `rgba(…)` overlays, which became `color-mix()` on tokens: `--bg, --panel, --card, --card2, --surface, --surface-raised, --surface-sunken, --surface-modal, --input, --control, --control-hover, --secondary, --track, --line, --line-strong, --text, --text-2, --muted, --soft, --accent, --accent-hover, --accent-tint, --accent2, --on-accent, --good, --warn, --bad, --info, --backdrop, --shadow, --shadow-card, --glow` plus `--tone-*` for item categories and calendar dots. No literal hex colors remain outside the theme token blocks.
- Light/Life use darker, text-safe variants of every semantic and category color (e.g. teal #0d8576, warning #9a5c00) instead of pastel-on-white.
- Elevation: cards, item/product cards and subject cards get a subtle shadow in light themes (none in dark). Reduced-motion users get no transitions or animations.

### Icons
- A local inline **SVG sprite** (no external dependency; works offline on GitHub Pages) replaces platform-dependent emoji in the side navigation, the needs HUD and the top-bar controls (Next day, Age up, Planner, Appearance). Icons are stroke-based, use `currentColor`, and follow the theme. Holiday and item emoji remain as flavor, as the spec allows.


## v7.2 (phase 3) — Interactive school day, less scrolling, calendar & holidays

### Bugs reported from a real save (fixed)
- **School event overlapped the school day.** A registered contest at 10:00 on a school day was marked *No-show* while the character was at school, because "Go to school" jumped from 8:00 to 15:00. The school day is now interactive (below), and school-day contests take place **in the school hall at 13:00 during school**. Going means missing class (a real choice), and staying in class gives a softer "missed the event" outcome instead of a no-show penalty. Existing saves with a 10:00 school-day contest are moved to the in-school slot.
- **Primary-school child at a "Secondary School".** School names now follow the stage (primary 6–11, middle 12–14, high 15–18), and saves with a mismatched name are corrected.
- **Invitations at 1:30 AM.** NPC initiatives were firing at midnight. They now arrive during waking hours (after school on school days), random events never fire between 9:30 PM and 6:30 AM or during class, and young characters cannot accept invitations late at night.
- **Four assessments on one day** (summer dates collapsed onto the first school day). Assessments are spread to at most one per school day.

### Interactive school day
- **Check in** records attendance (on time by 8:15, tardy until 11:00, absent after). Time then runs normally through a weekly timetable: Periods 1–3, Lunch, Periods 4–6, dismissal at 3:00 PM.
- In class: **Pay attention**, **Participate** (more learning, teacher relationship, costs energy), **Chat with a friend** (social, less learning, strict teachers may catch you), **Skip this class** (risk of being caught, delayed notice home).
- At lunch: **Eat in the cafeteria**, **Sit with friends**, **Study in the library**, **Visit a teacher**.
- Assessments and school events appear in their time slot with direct buttons. **Skip ahead to dismissal** auto-attends the remaining periods but stops when an assessment or event is due. **Leave school early** is available from age 10 and counts against attendance.
- Home-only actions (shower, TV, outings, trips, most items) are blocked while at school; eating, drinking and the bathroom still work. The hero shows the current period with its actions.

### Graduations & education history
- Moving between stages records a milestone: 🎓 *Finished kindergarten / primary / middle / high school — School name, year*. Older saves receive their missing kindergarten graduation (year of the 6th birthday). Education history appears in Education → Today and World → Journal.

### Less scrolling
- Every busy screen is split into **numbered sub-tabs** (press **1–4**): My Life (Now / Today / Inbox), Daily Life (Care / Activities / Your things / Go out), Education (Today / Subjects / Assessments / Clubs & events), Money & Items (Your things / Shop / Money & chores / Selling), Calendar (Month / Today / Upcoming / History), World (World / Journal).
- Tabs show badges (unread notifications, assessments due soon, open homework, urgent needs, broken items). The tab bar is sticky, and the last tab used is remembered (UI preferences are stored separately from the save).
- **Next day** (key **N**) and **Age up** live in the top bar. The life log is a collapsible drawer showing the latest entry, and the full log is in World → Journal.

### Calendar & Life Planner
- **Month calendar**: previous/next month, Today, Monday-first 7-column grid, today and selected-day highlights, colored category dots, holiday icons, weekend/break shading, and category filters. Clicking a day shows its agenda (time, title, category, status, location, required/optional, participants, attendance, and holiday activities on the day).
- **Schedule conflicts**: overlapping live obligations are flagged with ⚠ in the grid and agenda ("you can only be at one").
- **Life Planner** (screens ≥ 1500 px): a sticky right column with mini month, Today, Next up, Pending and holiday countdowns. Smaller screens get a **Planner** button with a slide-over. The upcoming strip is hidden when the planner is visible, to avoid duplicates.

### Holiday engine
- `HOLIDAYS` definitions with date resolvers and a **regional calendar profile** (VN, US, UK, CA, AU, KR, JP, FR, SG, TH, CN, INTL), detected from the birthplace plus family traditions.
- **Lunar New Year**: real-date lookup for 1998–2050 (with Vietnam's 2007 difference), and a lunar-cycle approximation outside it (±1 day); it lasts 3 days. **Easter**: computed with the Gregorian (Meeus) algorithm. **Mother's/Father's Day** follow the region (US 2nd Sunday of May; UK Mothering Sunday; FR/TH/KR variants; AU Father's Day in September). **Teachers' Day**: VN Nov 20, KR May 15, CN Sep 10, TH Jan 16, SG, US Teacher Appreciation Day, otherwise World Teachers' Day. **Thanksgiving**: US/CA only. Also New Year, Valentine's, International Women's Day, Vietnamese Women's Day (Oct 20), Halloween and Christmas.
- **Real activities** (age-gated, once per holiday): e.g. Halloween (decorate, make a free costume, trick-or-treat with candy and caregiver for young kids, party for teens, scary movie, give out candy, stay home), Lunar New Year (clean/decorate, new clothes, wishes and lucky money, gathering with possible family drama, visiting relatives, photos), Christmas (decorate, wish list, handmade gift, give gifts, meal, relatives, party), Valentine's (class cards for kids; card for a crush with a kind outcome either way; friends instead; dates only for adults with a partner), parent/teacher days, Easter and Thanksgiving. Forgetting Mother's/Father's Day entirely is noticed gently the next day.
- **Seasonal shop**: costumes, candy, decorations and gift wrap appear only in the 3 weeks before the relevant holiday. They are always optional, with free alternatives. Decorations and gift wrap improve the matching activities.
- Holidays appear in the hero on the day, in the Home "Now" tab, the agenda, the planner and the upcoming lists. Each holiday triggers once.


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