
// =====================================================================
// v7.3 PHASE 1B (part 1) — Annual school events with a real registration lifecycle; social-invitation throttle
// Contest statuses: Upcoming → Open (registration open) → Registered | Declined (not participating)
//   → Registration Closed (never registered — NOT "missed") | Withdrawn | Attended… | No-show (registered, absent)
// =====================================================================
const ANNUAL_EVENTS=[
 {name:'Sports Day',minGrade:1,sem:1,week:5},{name:'School Play Auditions',minGrade:4,sem:1,week:4},{name:'Math Olympiad',minGrade:6,sem:1,week:9},{name:'Debate Competition',minGrade:7,sem:1,week:11},
 {name:'Art Exhibition',minGrade:1,sem:2,week:4},{name:'Science Fair',minGrade:3,sem:2,week:7},{name:'Music Festival',minGrade:3,sem:2,week:9},{name:'Talent Show',minGrade:1,sem:2,week:11},{name:'Coding Challenge',minGrade:7,sem:2,week:13}];
const ANNUAL_NAMES=new Set(ANNUAL_EVENTS.map(e=>e.name).concat(['Math Challenge','Debate Tournament','School Sports Meet','Art Showcase','Mini Sports Day','Class Science Showcase']));
function annualEventDate(e,a){const start=e.sem===1?a.start:a.sem2Start;return nextSchoolDay(addDays(start,(e.week-1)*7-1))}
function publishAnnualEvents(){
 if(!needsFormalSchool()||!S.school.yearKey)return;const a=academicInfo(),sc=S.school;sc.annual=sc.annual||{};const g=gradeNumber();
 for(const e of ANNUAL_EVENTS){if(g<e.minGrade)continue;const key=`${sc.yearKey}:${e.name}`;if(sc.annual[key])continue;const ev=annualEventDate(e,a);if(ev<=addDays(currentDate(),8))continue;
  sc.annual[key]=true;const c={id:uid('contest'),name:e.name,annual:true,status:'Upcoming',openDate:addDays(ev,-21),createdDate:currentDate(),decisionDate:addDays(ev,-7),eventDate:ev,prep:0,result:null};sc.contests.unshift(c)}
}
function eventLifecycleTick(){
 if(!S.school?.contests)return;const t=currentDate();
 for(const c of S.school.contests){
  if(c.status==='Missed'&&!c.registered){c.status='Registration Closed';c.closedDate=c.closedDate||t;c.closedNoticeCleared=true}
  if(c.status==='Upcoming'&&t>=c.openDate){c.status='Open';if(!SIM.skipping)notify(`Registration open: ${c.name}`,`Register by ${formatDate(c.decisionDate)} • event ${formatDate(c.eventDate)}.`,{sourceType:'contest',sourceId:'reg-'+c.id,tab:'school'})}
  if(c.status==='Open'&&t>c.decisionDate){c.status='Registration Closed';c.closedDate=t}
  if(c.status==='Registration Closed'&&!c.closedNotified&&!c.closedNoticeCleared){c.closedNotified=true;c.closedDate=c.closedDate||t;resolveNotificationsFor('reg-'+c.id);if(!SIM.skipping)notify('Registration closed',`Registration for ${c.name} has closed.`,{sourceType:'contest',sourceId:'closed-'+c.id,tab:'school'})}
  if(c.status==='Registration Closed'&&c.closedDate&&daysBetween(c.closedDate,t)>=2&&!c.closedNoticeCleared){c.closedNoticeCleared=true;resolveNotificationsFor('closed-'+c.id)}
 }
}
function withdrawContest(id){const c=S.school?.contests?.find(x=>x.id===id);if(!c||c.status!=='Registered')return;const late=daysBetween(currentDate(),c.eventDate)<=3;c.status='Withdrawn';c.withdrawnDate=currentDate();const ev=S.calendar.find(e=>e.type==='schoolEvent'&&e.payload?.contestId===c.id&&!isTerminal(e.status));if(ev)setCalendarStatus(ev,'Cancelled','Withdrew');
 if(late){const sub=S.school.subjects?.[0];if(sub)ensureTeacher(sub).rel=clamp(sub.teacher.rel-3);log(`Withdrew from ${c.name}`,`So close to the event, your teacher is disappointed: "I had you on the list already."`)}else log(`Withdrew from ${c.name}`,'You let the organizer know in good time. No hard feelings.')}
// ---------- social-invitation throttle ----------
const INVITE_COOLDOWN={hangout:6,study:6,mall:8,movie:8,gameNight:10,picnic:12,party:21,sleepover:25};
const INVITE_WEEKLY_BUDGET=3,INVITE_SAME_NPC_DAYS=5;
function inviteLog(){S.inviteLog=(S.inviteLog||[]).filter(x=>daysBetween(x.dateISO,currentDate())<=40);return S.inviteLog}
function inviteTypeAllowed(type){const cd=INVITE_COOLDOWN[type]??7;return !inviteLog().some(x=>x.type===type&&daysBetween(x.dateISO,currentDate())<cd)}
function inviteAllowed(p){const L=inviteLog(),week=L.filter(x=>daysBetween(x.dateISO,currentDate())<7).length;if(week>=INVITE_WEEKLY_BUDGET)return false;if(L.some(x=>x.personId===p.id&&daysBetween(x.dateISO,currentDate())<INVITE_SAME_NPC_DAYS))return false;return true}
function logInvite(p,type){inviteLog().push({dateISO:currentDate(),personId:p.id,type})}
function eventsDaily(){publishAnnualEvents();eventLifecycleTick()}
function eventsClick(b){if(b.dataset.contestWithdraw){withdrawContest(b.dataset.contestWithdraw);save();render();return true}return false}
const MINOR_EVENTS={young:['Reading Challenge','School Art Day','Spelling Bee','Class Quiz'],middle:['Spelling Bee','Poetry Slam','Photography Contest','Chess Tournament','Quiz Bowl','Robotics Mini-Challenge'],high:['Poetry Slam','Photography Contest','Chess Tournament','Quiz Bowl','Short Film Contest','Robotics Mini-Challenge','Charity Bake-Off']};
function minorEventOptions(){const pool=S.age<10?MINOR_EVENTS.young:S.age<15?MINOR_EVENTS.middle:MINOR_EVENTS.high;return [...new Set([...eventOptions().filter(n=>!ANNUAL_NAMES.has(n)),...pool])]}
