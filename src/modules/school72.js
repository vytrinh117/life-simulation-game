
// =====================================================================
// v7.2 SCHOOL STAGES, GRADUATION & THE INTERACTIVE SCHOOL DAY
// Checking in records attendance; time then runs period by period and
// the player chooses what to do in each one.
// =====================================================================
const SCHOOL_NAMES={primary:['Riverside Primary School','Maple Grove Elementary','Sunrise Primary School','Westside Elementary','Lakeview Primary School'],middle:['Riverside Middle School','Central Middle School','Sunrise Junior High','Westside Middle School'],high:['Riverside High School','Central International High School','Sunrise Secondary School','Westside High School']};
const STAGE_LABEL={kindergarten:'kindergarten',primary:'primary school',middle:'middle school',high:'high school'};
function stageForAge(age){return age<=5?'kindergarten':age<=11?'primary':age<=14?'middle':'high'}
function stageOfSchool(sc){if(!sc)return null;if(sc.grade==='Kindergarten')return 'kindergarten';if(/Middle/.test(sc.grade))return 'middle';if(/High/.test(sc.grade))return 'high';return 'primary'}
function nameMatchesStage(name,stage){if(stage==='primary')return !/Secondary|High|Middle|Junior/i.test(name);if(stage==='middle')return /Middle|Junior/i.test(name);if(stage==='high')return /High|Secondary/i.test(name);return true}
function schoolNameFor(stage,prev=null){const base=prev?String(prev).split(' ')[0]:null,pool=SCHOOL_NAMES[stage]||SCHOOL_NAMES.primary;return pool.find(n=>base&&n.startsWith(base))||rand(pool)}
function buildSchool(age,carry=null){
 if(age>=3&&age<=5&&S.development.kindergarten.enrolled)return {name:carry?.grade==='Kindergarten'?carry.name:rand(['Little Steps Kindergarten','Sunflower Early Learning','Neighborhood Kindergarten']),grade:'Kindergarten',className:carry?.className||rand(['Sun','Moon','Rainbow','Bears']),attendance:carry?.attendance??96,behavior:72,gpa:null,rank:null,subjects:[makeSubject('Language & stories',0),makeSubject('Numbers & patterns',1),makeSubject('Movement',2),makeSubject('Social skills',3)],clubs:[],activityOffers:[],contests:[],friends:[],rivals:[],yearStarted:currentDate(),startedDate:carry?.startedDate||currentDate()};
 if(age<6||age>17)return null;
 const stage=stageForAge(age),same=!!carry&&stageOfSchool(carry)===stage;
 return {name:same?carry.name:schoolNameFor(stage,carry&&carry.grade!=='Kindergarten'?carry.name:null),grade:gradeLabel(age),className:`${Math.max(1,age-5)}-${String.fromCharCode(65+Math.floor(Math.random()*4))}`,attendance:carry?.attendance??96,behavior:carry?.behavior??70,gpa:age>=12?(carry?.gpa??3.1):null,rank:age>=12?(carry?.rank??Math.floor(8+Math.random()*22)):null,
  subjects:subjectNames(age).map((n,i)=>{const old=carry?.subjects?.find(s=>s.name===n);if(!old)return makeSubject(n,i);const s=Object.assign(makeSubject(n,i),old,{prep:0,homework:{status:'None',progress:0,dueDate:null}});if(!same)s.teacher={name:teacherName(n),rel:50+Math.floor(Math.random()*15)};return s}),
  clubs:same?(carry?.clubs||[]).filter(c=>c.status==='Active'):[],activityOffers:[],contests:[],friends:carry?.friends||[],rivals:carry?.rivals||[],yearStarted:currentDate(),startedDate:same?(carry.startedDate||currentDate()):currentDate(),stage}
}
function recordGraduation(stage,schoolName,{year=null,silent=false}={}){
 S.education=S.education||{graduations:[]};if(S.education.graduations.some(g=>g.stage===stage))return;
 const y=year||parseISO(currentDate()).getUTCFullYear(),g={stage,school:schoolName||STAGE_LABEL[stage],year:y,age:S.age,dateISO:currentDate()};S.education.graduations.push(g);
 const title=`🎓 Finished ${STAGE_LABEL[stage]}`,text=`You graduated from ${g.school} in ${y}.`;
 S.development.milestones=S.development.milestones||[];S.development.milestones.unshift(`${title} — ${g.school}, ${y}`);
 if(silent){S.milestones.unshift({dateISO:currentDate(),age:S.age,title,text})}else log(title,text+(stage==='kindergarten'?' Next stop: real school, with a timetable and homework.':stage==='high'?' A whole new part of life begins.':' A new school, new hallways and new people are next.'),true)
}
function reconcileEducationHistory(){
 S.education=Object.assign({graduations:[]},S.education||{});
 const k=S.development?.kindergarten;
 if(S.age>=6&&k?.enrolled&&!S.education.graduations.some(g=>g.stage==='kindergarten')){const y=parseISO(sixthBirthday()).getUTCFullYear();recordGraduation('kindergarten',k.schoolName||'kindergarten',{year:y,silent:true})}
 if(S.school&&S.school.grade!=='Kindergarten'){const st=stageForAge(gradeNumber()+5);S.school.stage=st;if(!nameMatchesStage(S.school.name,st)){const old=S.school.name;S.school.name=schoolNameFor(st,old);for(const e of S.calendar)if(e.type==='schoolDay'&&!isTerminal(e.status))e.title=`School • ${S.school.name}`}}
}

// ---------- Timetable ----------
const SCHOOL_PERIODS=[{id:'p1',start:480,end:540,label:'Period 1'},{id:'p2',start:540,end:600,label:'Period 2'},{id:'p3',start:600,end:660,label:'Period 3'},{id:'lunch',start:660,end:720,label:'Lunch'},{id:'p4',start:720,end:780,label:'Period 4'},{id:'p5',start:780,end:840,label:'Period 5'},{id:'p6',start:840,end:900,label:'Period 6'}];
function weekdayIndex(dateISO){return (parseISO(dateISO).getUTCDay()+6)%7}
function timetableFor(dateISO=currentDate()){
 const subs=S.school?.subjects||[];if(!subs.length)return [];const w=weekdayIndex(dateISO);let k=0;
 return SCHOOL_PERIODS.map(p=>p.id==='lunch'?{...p,kind:'lunch'}:{...p,kind:'class',subject:subs[(w*6+(k++))%subs.length].name})
}
function periodAt(m=currentMinute()){return timetableFor().find(p=>m>=p.start&&m<p.end)||null}
function atSchool(){const sd=schoolDayEvent();return !!sd&&sd.status==='Attending'&&currentMinute()<SCHOOL_DAY.end&&S.location==='School'}
function sessionEvent(){const sd=schoolDayEvent();return sd&&sd.status==='Attending'?sd:null}
function dueAtSchoolNow(){const m=currentMinute(),today=currentDate();const exams=S.exams.filter(e=>examIsOpen(e)&&e.dateISO===today&&e.minute<SCHOOL_DAY.end&&m>=e.minute-5&&m<=e.graceMinute);const contests=S.calendar.filter(e=>e.type==='schoolEvent'&&e.dateISO===today&&!isTerminal(e.status)&&e.startMinute<SCHOOL_DAY.end&&m>=e.startMinute-5&&m<=e.graceMinute);return {exams,contests}}

// ---------- Session flow ----------
function checkInToSchool(opts={}){
 const ev=ensureSchoolDayObligation();if(!ev)return false;
 let m=currentMinute();if(m<SCHOOL_DAY.start)advanceTime(SCHOOL_DAY.start-m,{silent:true});m=currentMinute();const delay=m<=SCHOOL_DAY.tardyAfter?morningDelay():null;m=currentMinute();
 const tardy=m>SCHOOL_DAY.tardyAfter;if(delay&&tardy){ev.lateReason=delay.text;recordLateReason(delay.key)}setCalendarStatus(ev,'Attending',tardy?'Arrived late':'Checked in');ev.attendanceStatus=tardy?'Tardy':'Present';ev.checkIn=m;ev.periods=ev.periods||{};S.location='School';
 const t=ensureTeacher(S.school.subjects[0])?.name||'your homeroom teacher';
 log(tardy?'Checked in late':'Checked in at school',(delay&&tardy?delay.text+' ':'')+(tardy?rand([`You sign in at the front office at ${timeLabel(m)}. The secretary hands you a late slip without looking up.`,`You slip into homeroom after the bell. ${t} marks you tardy.`]):rand([`You make it in before the bell. ${t} takes attendance.`,`Homeroom. Announcements, attendance, a lot of yawning.`])));
 toast(tardy?'Checked in • tardy':'Checked in • on time');return true
}
function sessionGain(sub,minutes,{focus=1,social=0,teacher=0}={}){const f=minutes/60*traitBoost('subject:'+sub.name).mult*concentration();sub.skill=clamp(sub.skill+(1.2*focus*f)*Math.max(.2,1-sub.skill/140));sub.prep=clamp(sub.prep+(3*focus*f));if(teacher)ensureTeacher(sub).rel=clamp(sub.teacher.rel+teacher);if(social)S.needs.social=clamp(S.needs.social+social*f)}
function classAction(kind){
 const ev=sessionEvent();if(!ev||!atSchool()){toast('You are not at school right now.');return}
 const p=periodAt();if(!p||p.kind!=='class'){toast('There is no class right now.');return}
 const {exams}=dueAtSchoolNow();if(exams.length&&kind!=='skip'){toast(`Your ${exams[0].subject} assessment is now — take it first.`);return}
 const sub=S.school.subjects.find(s=>s.name===p.subject);if(!sub)return;const t=ensureTeacher(sub),mins=Math.max(5,p.end-currentMinute()),friend=bestNonFamily(),fn=firstName(friend);
 let story;ev.periods[p.id]=kind;
 if(kind==='attend'){sessionGain(sub,mins,{focus:S.needs.sleep<35?.6:1});story=rand([`${sub.name} with ${t.name}. You take decent notes.`,`You follow along in ${sub.name}. One idea finally makes sense.`,`${t.name} runs ${sub.name} at full speed; you keep up, mostly.`])+(S.needs.sleep<35?' You are tired, so less of it sticks.':'')}
 else if(kind==='participate'){if(S.energy<15){toast('You are too tired to participate actively.');return}sessionGain(sub,mins,{focus:1.4,teacher:1.5});addRep('academic',.3);S.energy=clamp(S.energy-4);const right=chance(40+sub.skill*.5);story=right?`You raise your hand in ${sub.name} and get it right. ${t.name} looks pleased.`:`You answer a question in ${sub.name} and get it wrong, but ${t.name} walks you through it. You remember it now.`}
 else if(kind==='chat'){sessionGain(sub,mins,{focus:.35,social:10});if(chance(20))setTimeout(()=>{},0),meetNewPeople('school');if(friend){friend.rel=clamp(friend.rel+2);rememberPerson(friend,`You chatted during ${sub.name}.`)}addRep('social',.3);if(chance(t.style==='Strict'?45:22)){t.rel=clamp(t.rel-3);addRep('troublemaker',1);story=`You and ${fn||'a classmate'} whisper through ${sub.name} until ${t.name} stops mid-sentence and stares at you both.`}else story=`You and ${fn||'a classmate'} pass notes through ${sub.name}. Fun — but you missed most of the lesson.`}
 else if(kind==='skip'){ev.skipped=(ev.skipped||0)+1;S.needs.fun=clamp(S.needs.fun+6);S.stress=clamp(S.stress+2);const rec=ensureSchoolRecord();rec.classesSkipped=(rec.classesSkipped||0)+1;addRep('troublemaker',2);
  if(chance(30+ev.skipped*15)){t.rel=clamp(t.rel-5);S.school.behavior=clamp(S.school.behavior-3);story=`You hide out in the stairwell during ${sub.name}. A hall monitor finds you. ${t.name} will hear about it.`;if(S.age<18)scheduleFollowUp('absenceNotice',{dateISO:currentDate(),count:Math.max(2,rec.absences+1)},{minute:1050})}else story=`You skip ${sub.name} and wander the empty corridors. Nobody notices — this time.`;}
 advanceTime(mins,{silent:true});log(`${p.label} • ${sub.name}`,story)
}
function lunchAction(kind,arg){
 const ev=sessionEvent();if(!ev||!atSchool()){toast('You are not at school right now.');return}
 const p=periodAt();if(!p||p.kind!=='lunch'){toast('It is not lunch time.');return}
 const friend=bestNonFamily(),fn=firstName(friend);let mins=25,story;
 if(kind==='eat'){if(ev.ateLunch){toast('You already ate.');return}ev.ateLunch=true;S.needs.hunger=clamp(S.needs.hunger-50);S.energy=clamp(S.energy+5);story=rand(['Cafeteria lunch: pasta that is better than it looks.','You eat quickly so you have time for other things.','The lunch line is long, but the food is warm.']);mins=20}
 else if(kind==='friend'){addRep('social',.5);if(friend){friend.rel=clamp(friend.rel+4);friend.fun=clamp(friend.fun+3);rememberPerson(friend,'You spent lunch together.')}S.needs.social=clamp(S.needs.social+16);if(!ev.ateLunch){ev.ateLunch=true;S.needs.hunger=clamp(S.needs.hunger-40)}story=friend?rand([`You and ${fn} share lunch and a long, ridiculous conversation.`,`${fn} saves you a seat. You talk about everything except school.`]):'You sit with some classmates and slowly join the conversation.'}
 else if(kind==='library'){const sub=S.school.subjects.find(s=>s.name===arg)||bestPrepSubject();if(!sub)return;sub.prep=clamp(sub.prep+(findUsable('deskLamp')?6:5));sub.skill=clamp(sub.skill+1);sub.lastStudyDate=currentDate();story=`You spend lunch in the library working on ${sub.name}. Quiet, focused, a little lonely.`;mins=30}
 else if(kind==='teacher'){const sub=S.school.subjects.find(s=>s.name===arg)||bestPrepSubject();if(!sub)return;const t=ensureTeacher(sub);t.rel=clamp(t.rel+3);sub.prep=clamp(sub.prep+6);story=`You visit ${t.name} at lunch with questions about ${sub.name}. ${t.style==='Warm'?'They are delighted.':t.style==='Strict'?'They seem surprised, then genuinely helpful.':'They take the time to explain.'}`;mins=20}
 mins=Math.min(mins,p.end-currentMinute());advanceTime(Math.max(5,mins),{silent:true});log(`Lunch • ${kind==='eat'?'cafeteria':kind==='friend'?'with friends':kind==='library'?'library':'teacher visit'}`,story)
}
function finishSchoolDay(ev,{early=false,quiet=false}={}){
 if(!ev||ev.status!=='Attending')return;const tardy=ev.attendanceStatus==='Tardy',rec=ensureSchoolRecord();
 const done=Object.keys(ev.periods||{}).length,skipped=ev.skipped||0;
 if(early){rec.leftEarly=(rec.leftEarly||0)+1;S.school.attendance=clamp(S.school.attendance-.6)}
 markSchoolAttendance(ev,{tardy});if(early)ev.attendanceStatus=tardy?'Tardy, left early':'Left early';
 S.location='Home';S.energy=clamp(S.energy-(equippedIn('bag')?5:7));if(chance(40))generateHomework(false);
 if(!quiet)log(early?'Left school early':'School day over',early?`You leave before the final bell at ${timeLabel(currentMinute())}.${S.age<18?' The school will note it.':''}`:`The final bell rings. ${done?`You went through ${done} part${done===1?'':'s'} of the day yourself`:'The day passed in a blur'}${skipped?`, skipped ${skipped} class${skipped===1?'':'es'}`:''}${tardy?', and arrived late':''}.`);
 if(early&&S.age<18&&chance(45))scheduleFollowUp('absenceNotice',{dateISO:currentDate(),count:Math.max(2,rec.absences+1)},{minute:Math.max(currentMinute()+60,1050)});
 clearCurrentContextIfSourceResolved()
}
function skipToDismissal(){
 const ev=sessionEvent();if(!ev||!atSchool()){toast('You are not at school right now.');return}
 const {exams}=dueAtSchoolNow();if(exams.length){toast(`Take your ${exams[0].subject} assessment first, or skip it explicitly.`);return}
 for(const p of timetableFor()){if(p.end<=currentMinute())continue;if(ev.periods[p.id])continue;
  const {exams:ex}=dueAtSchoolNow();if(ex.length)break;
  if(p.kind==='class'){const sub=S.school.subjects.find(s=>s.name===p.subject);if(sub)sessionGain(sub,Math.max(5,p.end-Math.max(p.start,currentMinute())),{focus:.8});ev.periods[p.id]='auto'}
  else{if(!ev.ateLunch){ev.ateLunch=true;S.needs.hunger=clamp(S.needs.hunger-45)}ev.periods[p.id]='auto'}
  advanceTime(Math.max(1,p.end-currentMinute()),{silent:true});if(sessionEvent()==null)break;
  const nx=dueAtSchoolNow();if(nx.exams.length||nx.contests.length)break
 }
 const left=sessionEvent();if(left&&currentMinute()>=SCHOOL_DAY.end)finishSchoolDay(left)
}
function leaveSchoolEarly(){const ev=sessionEvent();if(!ev){toast('You are not at school.');return}if(S.age<10){toast('A young child cannot just walk out of school.');return}finishSchoolDay(ev,{early:true})}
function attendSchool(opts={}){
 if(!S.school){toast('You are not currently enrolled in school.');return}
 if(S.school.grade==='Kindergarten'){
  if(!isSchoolDay()){toast(isWeekend(currentDate())?'Kindergarten is closed on weekends.':'Kindergarten is on break.');return}
  const m=currentMinute();if(m<420||m>=900){toast(m<420?'Kindergarten opens at 8:00 AM.':'Kindergarten has finished for today.');return}
  if(m<480)advanceTime(480-m,{silent:true});const mins=Math.max(60,Math.min(240,900-currentMinute()));advanceTime(mins,{silent:true});S.school.attendance=clamp(S.school.attendance+.05);S.needs.fun=clamp(S.needs.fun+10);S.needs.social=clamp(S.needs.social+12);
  feedback('Kindergarten day',rand(['Circle time, a story about a lost bear, and a long turn on the slide.','You paint something that is mostly blue and very proud of it.','A classmate shares their blocks with you after some negotiation.']),mins);return
 }
 if(!isSchoolDay()){toast(isWeekend(currentDate())?'There is no school on weekends.':'School is on break today.');return}
 const ev=ensureSchoolDayObligation();if(!ev){toast('No school day is scheduled.');return}
 if(ev.status==='Attending'){if(opts.cheatExamId){const e=S.exams.find(x=>x.id===opts.cheatExamId);if(e)performExam(e,{cheat:true,lateMinutes:Math.max(0,currentMinute()-e.minute)})}else toast('You are already at school.');return}
 if(ev.status==='Attended'){toast('You already went to school today.');return}
 if(isTerminal(ev.status)){toast(ev.status==='Excused'?'You are marked as staying home today.':`You were marked absent after ${timeLabel(SCHOOL_DAY.cutoff)}.`);return}
 const m=currentMinute();
 if(m<300){toast('It is the middle of the night. School starts at 8:00 AM — sleep first.');return}
 if(m>SCHOOL_DAY.cutoff){processCalendar();toast(m>=SCHOOL_DAY.end?'School is finished for today — you were marked absent.':`The attendance cutoff (${timeLabel(SCHOOL_DAY.cutoff)}) has passed.`);return}
 checkInToSchool(opts);
 if(opts.cheatExamId){const e=S.exams.find(x=>x.id===opts.cheatExamId);if(e&&currentMinute()<e.minute)advanceTime(e.minute-currentMinute(),{silent:true});if(e)performExam(e,{cheat:true,lateMinutes:Math.max(0,currentMinute()-e.minute)})}
 if(opts.examId){const e=S.exams.find(x=>x.id===opts.examId);if(e&&examIsOpen(e)){if(currentMinute()<e.minute){advanceTime(e.minute-currentMinute(),{silent:true})}if(examIsOpen(e))performExam(e,{lateMinutes:Math.max(0,currentMinute()-e.minute)})}}
}
const SCHOOL_ALLOWED_ACTS=['eat','snack','drink','toilet','washHands','washFace','rest','school','nextDay','ageUp','giftThank','giftExcited','giftHide','giftComplain','giftHug'];
function atSchoolBlocks(id){if(!atSchool())return false;if(SCHOOL_ALLOWED_ACTS.includes(id))return false;toast(`You are at school until ${timeLabel(SCHOOL_DAY.end)}. Use the school options — or leave early.`);return true}

// ---------- Session UI ----------
function schoolSessionHtml(){
 if(!needsFormalSchool())return '';const sd=schoolDayEvent(),m=currentMinute(),tt=isSchoolDay()?timetableFor():[];
 if(!isSchoolDay())return `<p class="muted-text">${isWeekend(currentDate())?'Weekend — no classes.':'School break — no classes.'}</p>`;
 const ttHtml=`<ol class="timetable">${tt.map(p=>{const exam=S.exams.find(e=>e.dateISO===currentDate()&&e.minute>=p.start&&e.minute<p.end&&e.minute<SCHOOL_DAY.end),contest=S.calendar.find(e=>e.type==='schoolEvent'&&e.dateISO===currentDate()&&e.startMinute>=p.start&&e.startMinute<p.end),now=m>=p.start&&m<p.end&&sd?.status==='Attending',past=m>=p.end,did=sd?.periods?.[p.id];
  return `<li class="${now?'is-now':''} ${past?'is-past':''}"><span class="tt-time">${timeLabel(p.start)}</span><b>${p.kind==='lunch'?'Lunch':esc(p.subject)}</b>${exam?`<em class="tt-flag">${esc(exam.type)}${examIsOpen(exam)?'':' • '+esc(exam.status==='Completed'?exam.score+'%':exam.status)}</em>`:''}${contest?`<em class="tt-flag">${esc(contest.title)}</em>`:''}${did?`<small>${did==='auto'?'attended':did==='skip'?'skipped':did}</small>`:''}</li>`}).join('')}</ol>`;
 if(!sd||!['Attending'].includes(sd.status)){
  const can=sd&&!isTerminal(sd.status)&&m<=SCHOOL_DAY.cutoff&&m>=300;
  return `<div class="session-card"><div class="session-head"><div><b>${esc(schoolDayStatus())}</b><small>${can?(m>SCHOOL_DAY.tardyAfter?`You can still check in late until ${timeLabel(SCHOOL_DAY.cutoff)}.`:`Check in by ${timeLabel(SCHOOL_DAY.tardyAfter)} to be on time.`):sd?.status==='Attended'?`Attendance: ${esc(sd.attendanceStatus||'Present')}`:''}</small></div>${can?`<button class="primary" data-act="school">${m<SCHOOL_DAY.start?'Go to school':'Check in now'}</button>`:''}</div>${ttHtml}</div>`
 }
 const p=periodAt(),{exams,contests}=dueAtSchoolNow(),btn=(attrs,label,cls='')=>`<button class="${cls}" ${attrs}>${esc(label)}</button>`;let now='',actions=[];
 if(exams.length){const e=exams[0];now=`<b>${esc(e.subject)} ${esc(e.type)}</b><small>${m<=e.endMinute?`Now • until ${timeLabel(e.endMinute)}`:`Late sitting allowed until ${timeLabel(e.graceMinute)}`}</small>`;actions.push(btn(`data-exam-take="${e.id}"`,'Take assessment','primary'),btn(`data-exam-cheat="${e.id}"`,'Attempt cheat','ghost'))}
 else if(contests.length){const c=contests[0],ct=contestById(c.payload?.contestId);now=`<b>${esc(c.title)}</b><small>In the hall • check in by ${timeLabel(c.graceMinute)}. Going means missing class.</small>`;actions.push(btn(`data-contest-attend="${ct?.id}"`,'Go to the event','primary'))}
 if(p&&p.kind==='class'&&!exams.length){now+=`${now?'<hr>':''}<b>${esc(p.label)} • ${esc(p.subject)}</b><small>${esc(ensureTeacher(S.school.subjects.find(s=>s.name===p.subject))?.name||'')} • until ${timeLabel(p.end)}</small>`;actions.push(btn('data-class="attend"','Pay attention',contests.length?'':'primary'),btn('data-class="participate"','Participate'),btn('data-class="chat"','Chat with a friend','ghost'),btn('data-class="skip"','Skip this class','ghost'))}
 if(p&&p.kind==='lunch'){now+=`${now?'<hr>':''}<b>Lunch break</b><small>Until ${timeLabel(p.end)}${sd.ateLunch?' • you have eaten':''}</small>`;const sub=bestPrepSubject()?.name||'';actions.push(...(sd.ateLunch?[]:[btn('data-lunch="eat"','Eat in the cafeteria','primary')]),btn('data-lunch="friend"','Sit with friends'),btn(`data-lunch="library" data-arg="${esc(sub)}"`,`Library: study ${sub}`,'ghost'),btn(`data-lunch="teacher" data-arg="${esc(sub)}"`,`Visit ${sub} teacher`,'ghost'))}
 return `<div class="session-card is-live"><div class="session-head"><div class="session-now">${now||'<b>Between classes</b>'}</div><span class="tag ok">At school • ${esc(sd.attendanceStatus||'Present')}</span></div><div class="session-actions">${actions.join('')}</div><div class="session-foot"><button class="small ghost" data-school-skip="1">Skip ahead to dismissal</button>${S.age>=10?'<button class="small ghost" data-school-leave="1">Leave school early</button>':''}</div>${ttHtml}</div>`
}
function handleSchoolClick(b){
 const d=b.dataset;
 if(d.class){classAction(d.class);save();render();return true}
 if(d.lunch){lunchAction(d.lunch,d.arg);save();render();return true}
 if(d.schoolSkip){skipToDismissal();save();render();return true}
 if(d.schoolLeave){leaveSchoolEarly();save();render();return true}
 return false
}
function spreadExamDates(){
 const byDate={};for(const e of S.exams.filter(x=>examIsOpen(x)&&!x.makeupOf&&x.dateISO>currentDate()).sort((a,b)=>a.dateISO.localeCompare(b.dateISO))){let d=e.dateISO;while((byDate[d]||0)>=1)d=nextSchoolDay(addDays(d,1));if(d!==e.dateISO)e.dateISO=d;byDate[d]=(byDate[d]||0)+1}
}
