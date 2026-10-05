# Life Simulator Update Log

## v7.3+ Phase 3A — checkpoint 3A.3 (Phase 3A INCOMPLETE)
- **New friendship ladder: Stranger → Acquaintance → Casual Friend → Close Friend → Best Friend.** Old "Friend" and "Good Friend" became Casual Friend (history kept).
- **Friendship is more than closeness**: trust, respect, reliability and unresolved conflict matter, and for people you meet during play so do time and real shared days — nobody becomes your best friend after a few button presses. High fun alone does not make a friendship.
- **About 50 active friendships**: no "too many friends" wall; when the network gets too big, only the weakest, least-contacted casual friendships drift to **Old Friend** or **Contact**. Close and best friends are never demoted for that. A casual friend you have not talked to in months becomes an Old Friend; a friendship that went sour becomes a **Former Friend**. Nobody is deleted — **Reconnect** brings them back.
- **Respect** is a real measure now: keeping plans earns it, no-shows lose it.

- **Compact People cards**: name, age • gender, relationship tier, where you met, a mood face and a closeness word (Friendly / Good / Close…), with **Interact · Plans · Profile**. No number bars on the card. Family first, then friends by closeness.
- **Profile**: full name, age, gender, birthday and zodiac, looks, how smart, health, mood, interests and dislikes, relationship with all six measures (closeness, trust, fun, respect, reliability, conflict), love interest (when known, 13+), where and how you met, who introduced you, known since. Private things show **Unknown** until you are close enough.
- **Relationship log** (everything that happened) and **Milestones** (only the big, typed moments: became friends / good / close / best friends, first date, became official, engagement, marriage — and important moments from older saves).
- Fixed the person window's **Conflict tile** (missing right/bottom border): four overlapping CSS rules were consolidated into one.


## v7.3+ Phase 2B — COMPLETE (family tree, household, siblings, house rules)
- **New siblings over time:** when the family wants more children and it fits (parents' ages, how many children they have, spacing, circumstances, chance), your parents may share the news at dinner — and months later a **baby brother or sister** arrives as a real family member who grows up with you.
- **Younger siblings ask things:** to go to the park, come to the mall, borrow something of yours, or tag along with you and your friends. Answer **Yes / No / Ask Mom or Dad / Maybe later**. Easygoing siblings accept a reasonable no; stubborn or dramatic ones **negotiate** ("I'll do your chores tomorrow!"). Lent items come back (sometimes a little sticky); a "later" you forget is remembered.
- **House rules** now sit in the **left dashboard under Identity** (bedtime, curfew, going out, sleepovers, strictness, trust); living on your own shows "your rules".
- **Family tree vs household:** every relative now has a place to live. **Grandparents are no longer in every household** — both sides of the family exist, but they live at home only sometimes (more often in some regions and in struggling families). Aunts and uncles live elsewhere.
- **Varied siblings:** 0–3 brothers and/or sisters, older or younger, with names that match their gender; how many depends on the family's preference for a small/medium/large family and chance, not on wealth.
- **Mom's side carries her family name** (e.g. Robinson grandparents on Dad's side, Carter on Mom's).
- **Caregivers are the adults who actually live with you** (and siblings 16+); a relative who lives elsewhere no longer gives permission or picks you up.
- **Family & Relationships** shows **Household** (who lives with you) and a **Family tree** (Dad's side, Mom's side), with each person's age and relationship.
- Old saves keep their families exactly (an existing grandmother keeps living at home).


## Hotfix H2 — Interpersonal events always have a real person
- **Root cause fixed:** two parallel birthday invitation systems existed. The legacy random event `birthdayInvite` ("Someone your age invites you to a birthday party.") was created with no person, no plan and no place, so the invitation box had no FROM/WHERE. The legacy `friendInvite` ("Someone you know wants to spend time together soon.") had the same problem. Both are now **deprecated** (`deprecated:true`, filtered out of random-event selection). Birthday invitations come only from the real NPC birthday system (`birthdayTick → npcBirthdayInvite`), and friend invitations from `npcInvitesPlayer` (real person, plan, place, time and RSVP deadline). Other random events (coins, neighborhood, family…) are unchanged.
- **No person, no interpersonal event:** `queueEvent` refuses invitations, calls, prom invitations, help requests, relationship advice, school social events and surprise parties that have no real person, and logs a console warning ("Interpersonal event missing actor").
- **Consequences go to the right person:** the old fallback that applied an invitation's effects to "your best non-family friend" when the inviter was missing is removed; with no person there are no relationship effects.
- **Birthday invitations show who and where**: FROM *Olivier Fournier • Close Friend*, WHAT *Olivier's Birthday Party*, WHERE *Olivier's house*, WHEN date and time, ANSWER BY deadline. The party date is the friend's real birthday, and **one invitation per friend per year** (`bdayInviteYear` guard). The FROM row now shows the full name and the relationship tier.
- **Old saves:** an open anonymous `birthdayInvite` is turned into a proper invitation only if a known friend's real birthday falls in the next week; otherwise it is retired as Superseded. Anonymous `friendInvite` and invitations whose person no longer exists are retired too. No relationship penalty, the stale hero/notification is cleared, and they do not return after reload.


## Hotfix H1 — Age-appropriate birthday celebrations (after Phase 2A)
- **Fixed:** young children could choose "Go out with friends" and get e.g. "You celebrate out with Chloe, Jade — karaoke and food after." at age 5, with no caregiver, permission, supervision or transport involved.
- Birthday options now come from one helper by age: **0–2** family celebration / family outing; **3–5** party at home organized by the family, a small playdate party (only with suitable friends), family restaurant, indoor play center with a grown-up, family outing; **6–9** party at home, **ask your parents to organize** an outing with friends, family dinner, family activity day, sleepover (7+); **10–12** ask to celebrate out with friends (caregiver approval), **13–17** go out with friends (still household approval), **18+** independent.
- Friend options appear only when there are suitable friends (Friend tier or closer, similar age, still around); otherwise only family choices — no invented friends.
- Invited friends answer for themselves (some have plans, are away, sick, or cannot get permission).
- Caregiver approval uses the existing approval logic; a refusal does **not** take you anyway — you can choose another celebration, talk it over (once, if trust is decent), or accept.
- Activities match age (no karaoke or laser tag for young kids), take real time, and the story includes the caregiver arranging, supervising, dropping off or picking up where the age calls for it.
- **One authoritative resolver**: every birthday choice (`birthdayParty` and the refusal follow-up) goes through `ownBirthdayChoice`; the old label-based branch in `resolveEventChoice` is no longer reachable for birthdays.
- The full occasion engine (preparation, gifts, surprises, guest lists) remains Phase 6.


## v7.3+ Phase 2A — COMPLETE (Health, illness, medicine, school nurse, medical care)

### 2A.6 Happiness vs Mood, Troublemaker, Fast Forward, final QC
- Verified and locked by tests: **long-term Happiness** (slow) and **current Mood** (fast, with named reasons) are separate; being sick is a named mood reason, a sick day hurts Mood but barely moves Happiness, and Mood recovers quickly after you get better.
- **Troublemaker** is a 0–100 reputation with labels (no levels); sick days and nurse passes never change it or Behavior.
- **Fast Forward**: a mild illness while skipping is summarized under **Health** ("Had a common cold for N days, then recovered"); a medical emergency is a hard interruption.
- Full regression (35 suites, 1,013 checks) and fuzz across childhood, teen and adult ages.

### 2A.5 Staying home sick, medical care and costs
- **Asking to stay home uses your real condition**: genuinely ill → usually approved ("Sick day", excused), a little less likely if there is an exam today. **Pretending** → your parent may believe you, refuse ("You're fine. Get dressed."), or **catch you later** that day (trust drops) — depending on how strict they are and how much they trust you.
- **Levels of care**: home care → school nurse → **clinic/doctor** (moderate or lingering illness, injuries; may write a prescription that helps recovery) → **hospital** (serious only — a mild cold is redirected) → **emergency** (rare). Visits take real time and make the condition known.
- **Costs** by household coverage: **Covered / Mostly covered / Out-of-pocket**. Children's care is paid by the family. Adults without money get a free **community clinic** (longer wait); **hospital and emergency care are never refused** — what you cannot pay becomes a bill.
- **Follow-up appointments** go on the calendar; attend, miss, or they are cancelled automatically if you recover first.
- The old "Checkup" no longer cures instantly: it is a routine checkup, or a doctor visit when you are sick.

### 2A.4 School nurse and nurse passes
- At school (only there) you can **see the school nurse** — during class you ask the teacher first. The nurse is a persistent staff member who checks you over, so your condition becomes known.
- Not sick: back to class. Mild/moderate: a **NURSE PASS** (times, excused classes, reason) and rest on the nurse bed (real time passes; the nurse may give a suitable medicine). Severe: the nurse recommends going home. Injuries get first aid.
- **Excused periods are never counted as skipped**: no behavior or troublemaker change, no truancy.
- Not better after resting → the nurse **calls a caregiver**; whoever is available comes to pick you up (if nobody can, you rest in the office and the day is still excused). The **rest of the school day is medically excused**, any later assessment becomes a **make-up** (no duplicate, never "missed"), and **today's club session is excused**.
- At home you can **ask your parent for medicine**: they use what is in the cabinet or buy it at the pharmacy (the household pays) — but not if a dose is still working.

### 2A.3 Pharmacy and medicine

### 2A.3 Pharmacy and medicine
- New **Pharmacy** category in the store: **Cold Relief, Fever/Pain Relief, Allergy Relief, Cough Relief, Stomach Relief, Bandages/First Aid** — game items that ease symptom categories (no real dosing information).
- Medicine lives in your normal inventory with a limited number of uses. A suitable medicine **eases matching symptoms for a few hours** (better focus, a small boost to recovery) but **never cures the illness**. Not sick, the wrong medicine, or taking it again while the last one still works: no effect, and no use is spent. The empty package is thrown away.
- **Children under 12 do not take medicine on their own**: a parent at home gives it. Kids buying medicine go through the usual caregiver permission.

### 2A.1 Health from birth, Looks, Smart, surname
- **The Health tab is available at every age**, showing what fits the age: 0–4 health, sleep quality and current sickness; children add energy; teens add fitness and stress. Health is described as long-term wellbeing, separate from energy, sleep, mood and stress.
- **Health changes slowly**: good sleep and fitness help a little each day; poor sleep, severe stress, neglected needs and illness lower it (capped to small daily changes — a skipped meal does not wreck it).
- **Looks (0–100) and Smart (0–100)** for the player and for persistent NPCs, with labels (Plain … Striking; Struggles … Brilliant). The creator has fields with their own Random buttons; existing characters get stable values once. Shown in the Identity card. (Their gameplay effects come in later phases; Smart is aptitude, not grades.)
- **Surname field** in the character creator (Random draws from the chosen country's name pool); it becomes the family name.

### 2A.2 Illness engine
- One central system: daily risk from health, sleep, stress, hygiene, season, age and exhaustion (high health lowers it but never to zero), a **14-day cooldown** after recovering, and season-weighted illnesses: **common cold, flu-like illness, stomach bug, food poisoning, headache episode, seasonal allergy, minor fever, minor respiratory infection**, plus injuries (**sprained ankle, cut/scrape**).
- Each condition has **symptoms, a severity (mild / moderate / severe; emergency is rare), a recovery bar and a trend**. You only know your symptoms until someone checks you.
- Illness **drains energy** (differently per illness), can **reduce appetite**, raises stress, sets a "Unwell"/"Miserable" mood and **lowers focus** for studying, class and exams.
- **Recovery takes days**: faster with rest, good sleep and looking after yourself; going out while moderately sick slows it; moderate illness can worsen if you push through with low health. A rare emergency is a hard Fast Forward interruption.
- Sick actions: **Rest (1 h)**, **Drink water**, **Eat something light**, **Tell your parent**.


## v7.3+ Phase 1B (part 2 of 2) — Fast Forward sessions: original target kept, interruption tiers, real Continue, routine, summaries

### The destination survives interruptions
- Choosing a Fast Forward target starts a **session** that remembers where you were going. If something stops the clock, you answer it and then **Continue** — straight on to the **original** target. The Fast Forward button shows "→ date" while a session is paused, and paused sessions survive save/reload.
- **Context-aware targets**: Next week • Next month • **Next school term** (start of the next semester) • **End of summer/winter break (classes resume)** (only during a break) • **Start of next school year** • Next major event • Next birthday. No generic "next season".

### Three interruption tiers
- **Hard** — exams, school events you registered for, tryouts, prom, weddings, elections, accepted plans, and big decisions (family trip offers, prom invitations, discipline talks, the counselor…): **Stop & play it / Simulate & continue / Cancel fast forward**. "Simulate" resolves it the way a skipped day would and carries on.
- **Soft** — invitations and social moments (friends' invitations, birthday parties, help requests, relationship advice, campus concerts, calls…): **Stop & respond / Decline politely & continue / Let your character decide & continue / Decide for me for the rest of this fast forward**.
- **Background** — routine NPC and neighborhood events never stop the clock; your character handles them by your routine, and they are listed in the summary under "Handled by your character".

### Skipped days are simulated, not frozen
- **Routine while skipping** (shown in the Fast Forward menu, editable): Study low/normal/high • Exercise low/normal/high • Socialize low/normal/high • Spending save/balanced/spend • Bedtime early/normal/late • Free time friends/hobbies/rest/mixed.
- Each skipped day really happens: meals and hygiene vary, school and clubs are attended, study sessions happen during term (to your weakest subject), exercise, time with friends, hobbies or rest, small spending, and bedtime shifts sleep.

### Grouped summary
- Days and dates; **Programs** (sessions per program); **Skills** gained; **Routine** (study and exercise counts); **Social** (who you spent time with, friendships that leveled up, new people); **Family**; **Money** (change and spending); **Interruptions** and how each was handled; **Handled by your character**; **Coming up** (birthdays of people you care about, exams in the next two weeks).


## v7.3+ Phase 1B (part 1 of 2) — School-event registration lifecycle, annual school events, invitation throttle

### Annual school events publish themselves
- Nine major events now appear automatically once per school year, at realistic points in the semester, by grade: **Sports Day, School Play Auditions, Math Olympiad (semester 1, ~week 9), Debate Competition, Art Exhibition, Science Fair (semester 2, ~week 7), Music Festival, Talent Show, Coding Challenge**. No more "Find event" needed for them, and no random repeats (Math Olympiad once a year).
- "Find event" now offers smaller events instead (Spelling Bee, Poetry Slam, Photography Contest, Chess Tournament, Quiz Bowl, Short Film Contest, Robotics Mini-Challenge…).

### A real registration lifecycle
- **Upcoming → Registration open** (one notification, ~3 weeks before) **→ Registered / Not participating → Registration closed** (a week before) **→ Withdrawn / attended / No-show**.
- **Fixed: someone who never registered was marked "Missed".** Late registration attempts, letting the deadline pass, or a caregiver decision that never came now give **"Registration closed"** — no penalty. **"No-show" only applies when you registered and did not attend.**
- **Withdraw** from an event you registered for; it cancels its calendar entry. Withdrawing within 3 days of the event disappoints the teacher.
- When registration closes, there is **exactly one** "Registration for … has closed" notification, and it **leaves the active list after about 2 days** (the record stays in history).
- Old saves: contests previously marked "Missed" without registering become "Registration closed".

### Social-invitation throttle
- Unsolicited invitations from friends are capped: **at most 3 per 7 days overall**, **the same friend at most once every 5 days**, and a **cooldown per type** (hangout/study ~6 days, mall/movie ~8, game night ~10, picnic ~12, party ~21, sleepover ~25). Birthday parties, prom and other special occasions are not counted.


## v7.3+ Phase 1A — Life Context Engine, school-break gating, moved-out household gating, location rules

### Life Context Engine (new `context73` layer)
- One authoritative source for: **term vs break** (`termPhase`, `isSchoolTermActive`, `isSchoolBreak`, `isSummerBreak`, `breakName`, with weekends inside term counted as term), **household** (`livesWithParents`, `currentHouseholdId`: family / own / partner / dorm), **location** (`isAtHome`, `isAtSchool`, `teacherAvailable`) and **whether an action is possible now** (`canPerformAction(id)` → `{ok, why}`, `requireAction(id)` shows the reason).
- Systems now ask this layer instead of guessing on their own (first users: studying with a teacher, school-event discovery, household chores, parents' messages). Later phases will move more checks onto it.

### Fixes
- **Studying with a teacher** was possible anywhere at any time (e.g. at home at 9 PM, or in summer). Now only on school days, at school, 7:45 AM–4:30 PM, never during a break, and the refusal says why ("Summer break — teachers are not at school. Classes resume …").
- **"Find a school event"** worked during summer and other breaks. It is now blocked in breaks, with the date classes resume.
- **After moving out, parents stopped sending household commands** ("Dinner is ready in 20 minutes", "Don't forget your homework tonight"). Instead they keep in touch socially: dinner invitations, "how is the new place?", asking you to visit. Replying warmly brings the family closer.
- **Found by the new fuzz invariant:** a household message scheduled earlier in the day (while still living at home) could still arrive after moving out. Message type is now decided when it arrives, not when it was scheduled.
- **House chores** for your parents' household are no longer offered after moving out.

### Verified (already correct, now locked by tests)
- Over a full summer walked day by day: no school-day attendance, no homework assigned, no regular assessments, no club sessions, no new school contests. Summer programs still work.


## v7.3 (phase P3) — Age, gender and love interest on people cards

- **Every people card and person window shows age and gender**, e.g. "16 • Female". Gender comes from the person's name, classified for every name pool (English, Vietnamese, Korean, Japanese, Chinese, French, Thai). Unisex names (e.g. Minh, An, Khánh, Jordan, Camille) can be either, and a small share of people are non-binary. Moms, grandmothers and aunts are female; dads, grandfathers and uncles are male. Existing characters keep their names; genders are derived to match them.
- **Love interest** ("Interested in: Men / Women / All genders / Not interested in romance / Not sure yet") is **Unknown until you find out**:
  - It is revealed naturally once you are Good Friends (closeness 60+), with a short story.
  - Or use **"Ask about their love life"**: with enough trust they tell you; with low trust they say it is personal.
  - Younger teens may be "Not sure yet" and figure it out by 17.
- **Hidden entirely when you or they are under 13** (age and gender only).
- **It matters for romance**:
  - If someone is not interested in your gender, a confession or date request gets a kind "I really like you — just not like that", and you learn who they are into. Going to prom as friends still works.
  - NPC couples only form when both are into each other's gender; incompatible couples in old saves split up once (with a reason).
  - Your current partner is never affected.


## v7.3 (phase B2) — Majors with talent and school-strength bonuses, degrees that matter for careers

- **16 majors**: Computer Science, Engineering, Business, Economics, Law & Politics, Fine Arts, Design, Music, Communications & Media, Literature, Education, Psychology, Biology, Nursing, Sports Science, Culinary Arts.
- **Declare your major** in Education → University (a reminder appears on your first day). **You can change it once, during your first year.**
- **Study bonuses**: **+30% if the major matches one of your talents** (e.g. Programming → Computer Science, Art → Fine Arts, Cooking → Culinary Arts), **+10% if it is one of your university's strengths** (from the brochure's "Known for"). Bonuses stack (+40%), raise both the major's skill and your semester GPA, and are shown on every study session. Talent matches are marked ★ in the major list.
- **Your degree records your major.** A matching degree makes job offers more likely (+15%, on top of +8% for any degree) and **starts you one career level higher** (e.g. a CS degree for a developer job).


## v7.3 (phase B1) — University brochures, a unique price for every school, campus life that matters

- **Every university has its own tuition and application fee** (no more identical prices), and its own admission bar, even within the same tier. Prices still follow prestige: Elite $54,900–$58,400 → Top $38,900–$46,200 → Strong $26,800–$31,300 → State $10,900–$14,200 → Community college $4,300.
- **"Learn more" opens a brochure** for each school: setting and city, **distance from the city center**, campus size, style and number of students, tuition and fee, **dorms** (with that school's monthly price, or none), **Greek life** (none → big), how often there are **campus events**, **facilities** (cafeteria, gym, pool, stadium, 24/7 library, labs, makerspace, theater, art studios, concert hall, boathouse — missing ones are shown crossed out), **signature clubs**, what the school is **known for**, and **big events** (e.g. an annual concert headlined by a famous alumnus or alumna).
- **Facilities depend on the school, as in real life**: elite schools have almost everything; the art school has studios, a theater and a concert hall but no stadium or gym; the tech institute has labs, a makerspace and hackathons but little Greek life; the community college has no dorms or fraternities.
- **It matters once you study there**:
  - Campus gym and pool (fitness, stress relief), only where they exist.
  - Greek Row parties in the evening (more likely to meet people at big-Greek schools).
  - Campus clubs come from that school's signature clubs.
  - Dorm rent is that school's price; no dorm at commuter schools.
  - Random campus events, more often at lively schools.
  - The **annual concert or festival** (with a memory if you go).
  - The University panel adds a **Campus guide**.


## v7.3 (phase O + loose ends) — Clear invitation details, several friend groups, romance toggle, adult fuzzing

### O. Every invitation says who / what / where / when / answer by
- Invitations and interruptions now show a details box on the hero and on "Waiting for you" cards: **From** (name and relationship tier, or family role), **What**, **Where**, **When** (date and time, or "Right now"), **Answer by**.
- Covered: friends' invitations and group outings, birthday parties, prom invitations (venue and date), family trip proposals (destination and dates), neighborhood events (which family, where, now or this weekend), parent–teacher conference notices, the counselor, incoming calls ("Right now, your phone"), surprise parties, severe-weather questions, and more.

### Several friend groups (up to 3)
- New groups form from close friends who are not yet in a group (no one is in two groups at once). Each group has its own inside jokes and its own "Plan a group outing" button, which invites that group's members.

### Romance content on/off
- Family & Relationships → Love life → **Turn romance content off / on**. When off, crushes, dates and romantic events do not appear. It cannot be turned off while you are in a relationship (end it first).


## v7.3 (phase V3) — Scholarships: senior-year awards for all years, class-rank awards with ties, per-semester university scholarships

### Senior-year scholarship (apply in the middle of semester 2)
- Opens together with the student loan. You write a **separate scholarship essay**.
- Judged on grades, the essay, achievements (awards, club leadership, contests, finished summer programs), teacher recommendations and **graduation honors** (Valedictorian / Salutatorian count strongly).
- Results arrive with the university decisions, **even if you applied to no university**: **100% (full) / 75% / 50% / 25% of tuition for every year of university**, or not awarded — always with the reason (including your weakest part).
- **Keep a GPA of 3.0+**: below that, the award drops one tier per year (100 → 75 → 50 → 25) instead of disappearing at once.

### Class rank awards (per year, for all years)
- **#1 in class $15,000, #2 $12,000, #3 $10,000**; otherwise **top 10 in the school $5,000** (unchanged). Only the highest one applies.
- **Ties use competition ranking** (two people tied for #1 are both #1 and the next person is #3); tied students all get that rank's award, shown as "(tied)".
- **Valedictorian** (#1) and **Salutatorian** (#2), "Co-" when tied, become a graduation milestone with a speech you choose (heartfelt, funny, short).

### University: semesters and per-semester scholarships
- University now runs in **two semesters a year** (Freshman, Sophomore, Junior, Senior). Tuition is charged each semester. **Semester GPA** comes from your study sessions that semester; the cumulative GPA is their average.
- **After every semester (8 times in total)**, a **2-week window** opens to apply for: **Dean's List award** ($1,000, semester GPA ≥ 3.7), **Department scholarship** ($2,500, GPA ≥ 3.5, better with effort), **Leadership & activities** ($1,500, join a campus club), **Financial-need grant** ($3,000, by family situation). **Results after 2 weeks**; awards reduce the next semester's tuition.

### Stacking
- Order: **scholarships → parents → student loan → your money**, so scholarships reduce the loan first.
- Total aid never exceeds tuition. **With a full scholarship, other awards become a living stipend** (up to $3,000/year, paid each semester).

### Bug fixed
- Senior-scholarship results were only sent together with university decisions, so a student who applied for the scholarship but to no university never got a result. Found by a test.


## v7.3 (phase V2, final) — Adult careers: workdays, manager & coworkers, Intern → CEO, promotions, raises, monthly salary

- **Full-time careers from 18** (office, developer, designer, and other adult jobs). A job offer for an adult becomes a real career at a named company. Teen part-time jobs keep the hourly shift system.
- **Starting level depends on education**: Intern without a degree, Junior with one, Associate with a degree from an Elite or Top university.
- **10 levels**: Intern → Junior → Associate → Senior → Lead → Manager → Senior Manager → Director → VP → **CEO**, each with a higher monthly salary.
- **Workdays on the calendar** (Monday–Friday, 9:00–5:00; public holidays off). The workday takes the hero at 9:00:
  - **Go to work**: focus (more job points, more stress), normal, or socialize (closer to coworkers).
  - **Late** after 9:15 (your manager notices).
  - **Call in sick**: 5 paid sick days a year; faking may be noticed.
  - **Take today off** (short notice costs a little goodwill) or **request tomorrow off** (12 paid leave days a year).
  - **No-show** if you are not there by 11:00: performance −10, a cold call from your manager. **3 no-shows in 30 days, or very low performance, gets you fired.**
- **Your manager and two coworkers are real people** (in People, with closeness/trust bars); the work panel shows those bars.
- **Job points** fill from workdays (scaled by performance and focus). With a full bar you can **request a promotion**: success depends on performance, your manager relationship and tenure. It brings a new title and a salary jump; if refused, you get a reason and a 60-day cooldown.
- **Ask for a raise** every 6 months (3–8% when performance and your manager relationship are good).
- **Monthly salary on the 1st**, prorated for unpaid days (no-shows and days off beyond your allowance), with a payslip. **Student loans are repaid automatically** (5% of salary, interest-free) until cleared.
- Quitting cancels upcoming workdays and records the outcome. Fast Forward goes to work on autopilot.


## v7.3 (phase V1) — Living arrangements, university applications in senior year, scholarships & loans, university years

### Where you live (18+)
- Family & Relationships → **Where you live**: live with your parents (free), rent an apartment (~$1,020/month with bills), rent a condo (~$1,780/month), or a university **dorm** ($650/month, enrolled students only). Living with your partner comes from the love progression.
- Moving out needs a deposit of one month's rent. Rent and bills are charged on the 1st of each month. After **two missed months you are evicted** and move back in with your parents. No moving out before 18.

### University applications (all within high-school senior year, Grade 12)
- **Semester 1**: a meeting with the **school counselor** (a balanced list of reach, match and safe schools), and you build a list of **up to 10 schools** (Education → University).
- **12 schools in 5 tiers** (Elite / Top / Strong / State / Community college), each with an application fee (higher for more prestigious schools; caregivers may pay) and tuition.
- **Start of semester 2**: a **2-month application window**, at most 10 applications. **Work on your essay** to strengthen them.
- **Middle of semester 2**: apply for the **interest-free student loan**.
- **Late semester 2**: decisions (Accepted / Waitlisted / Rejected) arrive **by email** (if you own a laptop), **on your phone**, or **as letters in the mailbox**. Waitlists resolve two weeks later.
- Admission depends on your grade average, clubs, awards and leadership, essay quality, teacher relationships and a bit of luck, against each tier's bar.
- **Family reaction**: an acceptance brings a celebration. If you are rejected everywhere, a close family comforts you, a very strict one is angry, otherwise there is silence.

### Paying for it
- **Parents** contribute by family wealth (from nothing when struggling to everything when wealthy).
- **Merit scholarships**: $10,000/year for the **top 3 in your class**, or $5,000/year for the **top 10 in the school** (class rank is computed against your classmates). Elite and top schools add aid for near-perfect averages.
- **Interest-free loan** for the remaining gap, then **your own money**. The loan balance is tracked.
- **Enroll** at a school that accepted you (you need to cover year one).

### University years
- University starts on the first day of the next school year, after you graduate from high school. Tuition is charged each year.
- Study to raise your GPA (max 4.00). After **4 years** you graduate with a bachelor's degree (milestone), and leaving the dorm returns you home.
- **Education stays in the menu after high school** to show university (it used to disappear).


## v7.3 (phase U) — Small businesses: choose from a dropdown, up to 3 at once, open/close any time

- **Pick a business type from a dropdown**: Lemonade stand, Cookie stand, Cupcake stand, Bead jewelry (8+), Art prints & crafts, Yard sale (8+). Choose a location (outside home, near the park, community event, school fundraiser — by age), price and starting stock.
- **Run up to 3 at once** (one of each type). Each card shows location, stock, price, quality, revenue, profit and reputation.
- **Open / close any time**, and **retire** one to free a slot; retiring records the final tally in your outcome history.
- **Work a 2-hour shift** to sell (costs time and energy). Open businesses also make a few sales on their own some days.
- **Restock** for the cost of supplies. Under 16, a caregiver may pay or say no; from 12 you can pay yourself.
- **Sales depend on**: weather (lemonade loves hot days), location traffic, price versus the usual price, quality (your Baking or Art skill raises it), reputation, the Social/Shy personality, the Business talent, and luck. Severe weather stops outdoor selling.
- **Yard sale** uses your real items: put up to 8 things from Your things on the table (priced at 80% of their value). Sold items leave your inventory and pay you.
- The old single stand is converted into one of your businesses (stock, revenue and reputation kept).


## v7.3 (batch R + S + T) — Full love progression, real NPC couples & families, two-column person window, UI reorganization

### R. Love progression (every step needs both of you; a "no" is never punished)
- **Stages, each with its own progress bar**: Noticing → One-sided crush → Mutual crush → Going out / getting to know each other → Boyfriend/girlfriend → In love → Super in love → Serious (promise ring, 16+).
- **Adult-only stages** (both people 18+): Living together → Engaged (proposal with or without a ring, or eloping) → wedding planning (courthouse / small / medium / big, on the calendar) → Married → Starting a family (have a baby or adopt; non-explicit, months later the child joins the family).
- **How it moves**:
  - Admitting you like someone → at least a one-sided crush (mutual when they like you back).
  - A yes to going out → Going out.
  - Good dates, time together, gifts they love and talking about the relationship fill the bar.
  - Neglect (7+ days without contact) slowly drains it.
  - In love and Super in love happen on their own when the bond is strong; the other steps are questions you ask.
- **Breaking up** resets the stage. If you gave a promise ring, you choose whether to ask for it back. A ring that was turned down is kept for later.
- **Safety in logic**: adult steps are refused for minors even if triggered directly; no promise ring under 16. The fuzz run checks that no minor is ever in an adult stage.

### R. NPCs, families and NPC couples
- **More people your age**: about 28 peers (was 18).
- **NPCs have families**: who they live with, their siblings (with ages) and pets, shown in the person window.
- **NPC couples are real**:
  - two-way, with a strength that changes over time;
  - breakups with reasons (and a heartbroken friend may need you);
  - couples go to prom together;
  - age rules always apply (minors only with minors within 2 years, adults with adults).
  - Old name-only "dating" data is converted.
- **You can get involved**:
  - a friend asks for relationship advice (it changes how their relationship goes);
  - **matchmaking** ("Set them up with someone" — both single and close in age, and it is their choice);
  - when your crush starts dating someone else, you choose how to react (including confessing anyway).

### S. Person window
- **Two columns**: **History together** on the left (the full log, up to 60 entries), **Shared memories** on the right (only milestones and moments that changed the relationship; generic lines filtered out).
- A love-stage bar and the NPC's family line at the top.
- Your partner's card shows the love stage instead of a tier label. There is no "set them up" button on your own partner.

### T. UI reorganization
- **The "Growing Up" tab is gone.** Self-care skills and early education now live in **Daily Life → Independence**.
- **House rules** moved from People to **Family & Relationships**, together with a **Love life** card (stage, progress, relationship steps) and the current **Family trip**.
- People now holds People, Plans and (when relevant) Rivals.


## v7.3 (batch L + M + P + Q) — Teen autonomy, summer programs & jobs, baking/wrapping/Valentine's, family outings & trips

### L. Teen autonomy (13–17)
- **Curfew**: 10:30 PM (strict parents), 11:00 PM, or midnight (easygoing). Under 13 is unchanged.
- **Sleepovers, parties and game nights need no permission from 13** — you tell your parents instead ("Letting them know", a little trust). Plans that would break curfew still need an OK, and sneaking out still exists.
- Teens already joined clubs without a caregiver's approval. Club/activity offers must now be answered within **2 days** (was 4).

### M. Summer & holiday activities
- **Casual practice** (Daily Life → Activities): shoot hoops, run, sketch, music, library, coding, dance, try a recipe. Free and flexible, but slower skill growth.
- **Formal programs**, open from about 3 weeks before summer break: basketball camp, soccer league, swim lessons, art class, music lessons, theater camp, coding camp, science camp, baking class, summer school.
  - Each has a cost (a caregiver may pay), a real schedule of sessions on the calendar, coaching (much faster skill growth), 1–2 teammates on day one, and a final event (tournament, show, exhibition, recital, demo day…) with a result, a milestone and reputation.
  - Missing 3 sessions in a row drops you (no refund).
  - Summer school also lifts your weakest subject.
- **Summer jobs**: babysitting (13+), mowing lawns (12+), café (16+), lifeguard (16+, needs fitness), paid per shift.
- Fast Forward attends program sessions on autopilot.

### P. Baking, wrapping, Valentine's
- **Baking at home**: cookies, cupcakes, and heart cookies in Valentine season.
  - New **Baking** skill (boosted by the Cooking talent).
  - Kitchen rules by age: under 8 with a caregiver, under 12 supervised.
  - Quality depends on skill. Makes a batch of perishable homemade treats.
- **Gift wrapping is a real action** (Money & Items → Your things → More → "Wrap as gift"). It uses gift wrap or the new **heart wrapping paper**; the recipient opens it when you give it. You can also unwrap.
- **One main Valentine's plan** per year (partner date, friends, singles mixer or treating yourself); cards and small gestures are still separate.
- **Secret admirer note or baked treats in someone's locker/desk** (Valentine season, school, 10+, an age-appropriate peer), signed or anonymous, once per person per year. Anonymous gifts may be guessed. Signed ones from 13+ can start a crush; under 13 they stay friendly.

### Q. Family outings & trips
- **Family outing** (replaces the old "Trip" action for under-18s, which jumped 1–3 days instantly): a few hours to the park, zoo, museum, beach (warm days), hiking trail or amusement park (by wealth). Costs energy and needs, not allowed during school hours, and outdoor options depend on the weather.
- **Vacations are proposed by your parents only on occasions**: their wedding anniversary, a family member's birthday, sometimes your birthday, before a break or summer, or time off work. There is a cooldown of at least 120 days, so not daily or monthly. Each proposal shows the destination (near / far / abroad by wealth), transport (plane, cruise, car, camper van, camping), dates and length (≤ 30 days).
- You answer **Yes / No / Tell you tomorrow** (asked again the next evening).
  - **Yes**: school days on the trip are logged as excused, and plans in that period are cancelled.
  - **No**: your parents may go anyway. You stay **home alone (13+)** or with an older sibling, or **a grandparent/relative looks after you (under 13)**. Home alone at 13+ may bring a party temptation, which neighbors may report.
- On the trip, your location is the trip and outings are blocked. Coming home brings a souvenir and a milestone.

### Bugs fixed
- **The store listed homemade treats for $0.** The store now respects items that are not for sale.
- **"Homemade" gift reactions only partly worked.** Items record where they came from in `source`, but the reaction only checked `origin` (which is set only in some cases) or the name. It now checks all three.


## v7.3 (batch K + N + X) — Scheduling with real answers, relationship tiers, birthdays, chats & calls

### K. Free time & scheduling
- **Named relationship tiers**: Acquaintance → Friend (40) → Good Friend (60) → Close Friend (75) → Best Friend (88); partners show Dating / Serious. Level-ups and drifting down are announced; Close and Best Friend become milestones. The tier is shown on every person card.
- **Free-time blocks on the calendar** ("Free 3:30–9:00 PM"), computed from school, clubs, plans, events, curfew/bedtime and sleep.
- **Make plans in 3 steps**: what → which day (today or up to 10 days ahead, each showing your free time) → **offer two times** (from 9:00, only inside your free time). When you know their schedule (closeness 50+), shared free times are marked ✓ and **"Find a time we're both free"** picks them. **"Let them pick"** gives them the choice (more likely yes, a little trust).
- **Free does not mean willing.** Answers: enthusiastic yes / yes / **reluctant yes** (the outing goes worse) / **counter-offer** (accepting adds closeness, declining costs some) / maybe / no with a reason.
- What shapes the answer: closeness, trust, their **social battery** (drained by recent time together, faster for shy/quiet people), how often you asked this week, lead time (same-day asks are harder unless you are close), **reciprocity**, your **reliability** with them (show-ups up, lateness and cancellations down, a no-show −15), personality, goals and boundaries.
- **"I'm busy" can be found out**: declining with "I'm busy" while actually free, then being seen out at that time, may be discovered (trust and closeness drop).
- **Group outings** from the friend-group card pick the time most can make; anyone who could not make it feels a bit left out.

### N. Birthdays
- **Everyone has a birthday.** People you care about (Good Friend+, family, partner) show on the calendar and in Next up.
- **Reminders**: 3 days before and on the day.
- On their birthday you can **wish them happy birthday** in person or by text, and give a gift.
- **Close friends invite you to their birthday party** 5 days ahead, with an RSVP.
- **Forgetting costs closeness**, scaled by how close you are (partner −10, best friend −8, close friend −5, good friend −2, parent −3).
- **Your birthday**:
  - possible **surprise party at school** from your friends (on a school day);
  - **gifts** from close friends;
  - **happy-birthday texts**;
  - **invitations** to celebrate;
  - your **partner** gives a gift and plans something.
- More ways to celebrate your own birthday: **party at home, go out with friends, small family dinner, sleepover (7–17), nothing special**.

### X. Phone: chats & calls
- **Per-person chat threads** with real messages that arrive through the day. How many depends on your age, friends and closeness. Parents text too ("Dinner in 20", "grab milk").
- **Reply with 3–4 options that fit the message** (chitchat, homework help, gossip, a friend asking for advice, parents). Or **write your own** reply and pick what you mean (Warm / Joke / Agree / Comfort / Ask) so the game knows how it lands.
- Advice conversations continue into a second turn when handled well. Sending your homework answers can be noticed.
- **Response time matters with close friends**: replying after 6+ hours is noticed; leaving them "on read" costs a little.
- **Incoming calls**: Answer / Decline / Text "call you later":
  - **a parent calls if you are out past curfew**;
  - a close friend in distress may call;
  - missed calls go to a **call log with voicemail**;
  - calls during class are missed automatically (phone on silent).
- **Outgoing calls respect people**: asleep, in class or busy means no answer (voicemail); late-night calls annoy anyone who is not close.
- **Phone in class can be confiscated** until the end of the day (behavior −2).
- **Kids**: a **kids' smartwatch** (family-only calls and messages) is a common Grade 1 gift from 2025 on. Under 13, you can **video-call grandparents and relatives on a parent's phone**.

### Bugs fixed
- **Old messages were never moved into chats.** The migration of pre-chat messages ran before old messages were linked to their senders, so exactly the "Mia • neighbor"-style messages were skipped. Found by the regression suite.
- **The Games app created "online friends" in the old name format** ("Mia • online friend"), with no surname or NPC record. They are now real, age-appropriate people.


## v7.3 (batch H + I + J) — School–home communication, real weather, Fast Forward

### H. Attendance, behavior & school–home communication
- **Late arrivals happen occasionally, always with a reason**: overslept, the school bus was late (under 16) or traffic (16+), helping a sibling, running back for forgotten homework, a stomach ache, or bad weather. It is more likely on rainy/stormy days and after poor sleep. The reason is shown on check-in and tracked in the attendance record.
- **Unexcused absence thresholds**: a light notice at 1, caregiver talks at 4 and 7, the **teacher phones home at 10**, a **1:1 parent–teacher meeting at 20** (you find out only from your parents' reaction), a **formal warning letter at 35**, and an **expulsion hearing at 45** (final warning and probation, or expulsion and a transfer to another school).
- **Behavior below 30%** → the teacher calls home once per semester. If behavior is still under 40% next semester, your parents meet the teacher without telling you, and you learn about it from them.
- **Parent–teacher conference every semester** (on the calendar). You choose what to do with the notice: give it to Mom, give it to Dad, leave it in your bag, or hide it. If nobody comes, the teacher may call home (more likely if you hid it), and hiding it costs a lot of trust.
- **Asking to stay home** (the evening before or in the morning before school): "I feel sick" (parents check your health; faking may be noticed), "I need a day" (approved more often when you are really stressed or low), or "I don't want to go" (usually refused by strict parents). Approved days are logged as excused absences, and asking too often lowers the chance.

### I. Weather
- **Climate-aware and seasonal**: 12 climate profiles chosen by city (e.g. New York continental, Chicago/Toronto cold, London/Paris oceanic, Los Angeles Mediterranean, Houston/Miami subtropical, Ho Chi Minh/Singapore/Bangkok tropical, Hanoi monsoon, Da Nang/Huế central-VN storm season, Seoul/Beijing, Tokyo, Shanghai, Sydney). Temperatures follow monthly averages; snow only where and when it can happen; typhoons and hurricanes only in their seasons.
- New conditions: Cold, Snowy, **Blizzard**, **Heatwave**, **Typhoon**, **Hurricane**, each with a severity level.
- **The forecast is real**: tomorrow usually matches it (forecasts are right most, not all, of the time).
- **The weather and forecast moved to the Life Planner** (right side, below the mini calendar). The separate World weather card was removed.
- **Severe weather** on a school morning: your caregiver asks whether you want to go (staying home is an excused absence). Outdoor outings are blocked while it is dangerous.
- **Extreme weather closes every school in the area** for that day: no attendance obligation, assessments moved to a later date, club sessions cancelled, contests postponed a week, tryouts moved, and an announcement for everyone.

### J. Fast Forward
- Controls are **Next day | Fast forward ▾ | Age up**. Fast forward offers **Next week, Next month, End of break / next term (or "until the next break" during term), Next major event, Next birthday (Age up)**, each showing its target date.
- Routine days run on autopilot: school days attended, club sessions, homework due soon. It **stops early** for anything that needs you: a new invitation or decision, an assessment, a contest, plans, a tryout, prom, a conference or an election. It will not start while something is still waiting for your answer.
- A summary lists the days passed, why it stopped, and what happened along the way.


## v7.3 (batch B–F) — Talents that matter, levels 1–10, study rules, mood with reasons, one anti-farming rule

### B. Talents & personality have real, visible effects
- Each **talent** gives **+25%** to its skills, subjects and reputation (e.g. Sports → sports, fitness, Physical Education, athletic reputation; Math → Mathematics and knowledge; Leadership → leadership reputation).
- **Personality traits** give smaller targeted bonuses (e.g. Curious +15% knowledge/reading; Responsible → homework).
- It is always explained:
  - a ★ next to boosted skills and subjects;
  - the bonus named in the result line ("+25% from your Sports talent");
  - a **Traits & talents** card in Daily Life → Your things listing every effect.

### C. Levels 1–10
- Skills and school reputation dimensions are shown as **Lv 1–10**, each level with its own progress bar.
- Higher levels fill more slowly (Level 10 gains about half as fast as Level 1, never zero).
- Each level-up shows a notification and records a milestone.

### D. Study & exams
- **Max 3 study sessions per subject per day**; 30 min, 1 h and 3 h each count as one. Other subjects are unaffected.
- **Longer sessions give more.** Grade gain is capped at **2.0 per session** and stored to **one decimal** (e.g. 80.6). The skill/status bar gains 1–5 per session.
- **Desk lamp, workbook and notebook** add a stated bonus.
- **Advanced exercises**: optional, once per day per subject, for faster progress.
- **The real exam score is not the displayed grade.** It also depends on preparation, sleep, hunger, mood, stress and lateness, so the same grade can score very differently on different days.

### E. Mood
- Mood moves toward what your life feels like right now. It is pulled down by hunger, exhaustion, loneliness, stress and recent failures, and lifted by being well rested, relaxed, recent successes, time with people and good weather.
- A **Mood card** (My Life → Today) shows the current mood, the reasons with their weights, and your **focus %**. Focus affects studying, class, exams and social moments.

### F. One anti-farming rule
- Any non-need action that raises a stat can be done at most **3 times per day per target**, with diminishing returns (100% → 65% → 40%; the 4th is blocked with an explanation). This covers relationship actions per person, hobbies, club extras, skill practice and study.
- Needs and wants (eating, sleeping, bathroom, washing…) are exempt.


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