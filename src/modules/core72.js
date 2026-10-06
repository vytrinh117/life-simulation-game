
// =====================================================================
// v7.2 LIFECYCLE CORE
// Central rule: nothing important stays pending forever, and one
// transition updates every related record (exam ↔ calendar ↔ context ↔
// notifications ↔ log ↔ consequences).
// =====================================================================
const TERMINAL_STATUSES=['Completed','Attended','Missed','Excused','Cancelled','Expired','Resolved','Superseded','No-show','Withdrew'];
function isTerminal(status){return TERMINAL_STATUSES.includes(status)}
const SIM={skipping:false,sleeping:false,summary:null,excuse:null};
function pad4(n){return String(Math.max(0,Math.min(1439,Math.round(Number(n)||0)))).padStart(4,'0')}
function stamp(dateISO,minute){return `${dateISO}T${pad4(minute)}`}
function nowStamp(){return stamp(currentDate(),currentMinute())}
function endOfDay(dateISO=currentDate()){return {dateISO,minute:1439}}
function stampOf(x){return x&&x.dateISO?stamp(x.dateISO,x.minute??1439):null}
function ordinal(n){const s=['th','st','nd','rd'],v=n%100;return n+(s[(v-20)%10]||s[v]||s[0])}
function ensureLifecycleContainers(){
 S.archive=Object.assign({pending:[],calendar:[],events:[],exams:[],homework:[]},S.archive||{});
 for(const k of Object.keys(S.archive))if(!Array.isArray(S.archive[k]))S.archive[k]=[];
 S.followUps=Array.isArray(S.followUps)?S.followUps:[];
 S.family.restrictions=Object.assign({groundedUntil:null,reason:null},S.family.restrictions||{});
 S.schoolHistory=Array.isArray(S.schoolHistory)?S.schoolHistory:[];
 S.healthState=S.healthState||{fitness:50,sleep:80,illness:null};
}

// ---------- School calendar ----------
const SCHOOL_DAY={start:480,tardyAfter:495,cutoff:660,end:900};
function isWeekend(dateISO){const d=parseISO(dateISO).getUTCDay();return d===0||d===6}
function gradeNumber(){const m=/Grade (\d+)/.exec(S.school?.grade||'');return m?Number(m[1]):0}
function freshSchoolRecord(){return {daysAttended:0,absences:0,excused:0,tardies:0,examsCompleted:0,examsMissed:0,examsExcused:0,submittedHomework:0,lateHomework:0,missingHomework:0,meetingHeld:false}}
function ensureSchoolRecord(){if(!S.school)return null;S.school.record=Object.assign(freshSchoolRecord(),S.school.record||{});return S.school.record}
function isGrounded(){const g=S.family?.restrictions?.groundedUntil;return S.age<18&&!!g&&g>=currentDate()}
function ground(days,reason){if(S.age>=18)return;const until=addDays(currentDate(),days);const cur=S.family.restrictions.groundedUntil;if(!cur||until>cur)S.family.restrictions.groundedUntil=until;S.family.restrictions.reason=reason;notify('Grounded',`No outings or social plans until ${formatDate(until)}.`,{sourceType:'restriction',sourceId:'grounded-'+until,tab:'family'})}

// ---------- Obligation registry (calendar events ARE obligations) ----------
const OBLIGATION_DEFS={
 schoolDay:{category:'School',icon:'🏫',start:480,end:900,grace:660,required:true,importance:2,location:'School'},
 exam:{category:'Exam',icon:'📝',start:540,end:615,grace:660,required:true,importance:3,location:'School'},
 clubSession:{category:'Club',icon:'🎨',start:930,end:1020,grace:960,required:false,importance:1,location:'School'},
 schoolEvent:{category:'Competition',icon:'🏆',start:600,end:780,grace:690,required:true,importance:2,location:'School hall'},
 party:{category:'Social',icon:'🎉',start:1020,end:1200,grace:1080,required:false,importance:1,location:''},
 tryout:{category:'Club',icon:'🏅',start:930,end:1020,grace:945,required:true,importance:2,location:'School'},
 plan:{category:'Social',icon:'🤝',start:960,end:1080,grace:990,required:true,importance:2,location:''},
 prom:{category:'Social',icon:'💃',start:1140,end:1380,grace:1230,required:false,importance:2,location:''},
 medicalFollowUp:{category:'Health',icon:'🩺',start:960,end:1020,grace:990,required:true,importance:2,location:'Clinic'},
 workDay:{category:'Work',icon:'💼',start:540,end:1020,grace:555,required:true,importance:3,location:'Work'},
 wedding:{category:'Family',icon:'💒',start:900,end:1380,grace:1380,required:false,importance:3,location:''},
 program:{category:'Activity',icon:'☀️',start:540,end:900,grace:570,required:true,importance:2,location:'Program'},
 trip:{category:'Family',icon:'🧳',start:420,end:1439,grace:1439,required:false,importance:1,location:''},
 conference:{category:'School',icon:'👪',start:960,end:1080,grace:1080,required:false,importance:1,location:'School'},
 election:{category:'Club',icon:'🗳️',start:870,end:900,grace:900,required:false,importance:1,location:'School'},
 generic:{category:'Other',icon:'🗓️',start:0,end:60,grace:60,required:false,importance:0,location:''}
};
function obDef(type){return OBLIGATION_DEFS[type]||OBLIGATION_DEFS.generic}
function normalizeCalendarEvent(ev){
 const d=obDef(ev.type);ev.id=ev.id||uid('cal');ev.type=ev.type||'generic';ev.payload=ev.payload||{};ev.status=ev.status||'Scheduled';
 const start=Number.isFinite(Number(ev.startMinute))?Number(ev.startMinute):Number.isFinite(Number(ev.minute))?Number(ev.minute):d.start;
 ev.startMinute=start;ev.minute=start;
 if(!Number.isFinite(Number(ev.endMinute)))ev.endMinute=Math.min(1439,start+(d.end-d.start));
 if(!Number.isFinite(Number(ev.graceMinute)))ev.graceMinute=Math.min(1439,start+(d.grace-d.start));
 ev.category=ev.category||d.category;ev.required=ev.required??d.required;ev.importance=ev.importance??d.importance;ev.location=ev.location??d.location;
 ev.participants=Array.isArray(ev.participants)?ev.participants:[];ev.sourceId=ev.sourceId||ev.payload.examId||ev.payload.clubId||ev.payload.contestId||null;
 ev.attendanceStatus=ev.attendanceStatus||null;ev.history=Array.isArray(ev.history)?ev.history:[];
 return ev
}
function createCalendarEvent(ev){
 const e=normalizeCalendarEvent(Object.assign({id:uid('cal'),type:'generic',title:'Scheduled event',dateISO:currentDate(),status:'Scheduled',payload:{},source:'system',createdDate:currentDate()},ev||{}));
 const existing=S.calendar.find(x=>x.id===e.id);if(existing)return existing;S.calendar.push(e);return e
}
function setCalendarStatus(ev,status,reason=''){
 if(!ev||ev.status===status)return;ev.history=ev.history||[];ev.history.push({from:ev.status,to:status,dateISO:currentDate(),minute:currentMinute(),reason});if(ev.history.length>8)ev.history.shift();ev.status=status;
 if(isTerminal(status)){ev.resolvedAt={dateISO:currentDate(),minute:currentMinute()};ev.resolutionReason=reason;resolveNotificationsFor(ev.id)}
}
function completeCalendarEvent(ev,status='Completed',reason=''){setCalendarStatus(ev,status,reason);clearCurrentContextIfSourceResolved()}
function expireCalendarEvent(ev,reason='Window passed'){setCalendarStatus(ev,'Expired',reason)}

// ---------- Central obligation processing ----------
function processCalendar(){tierTick();curfewCallCheck();
 ensureLifecycleContainers();const now=nowStamp();
 for(const ev of [...S.calendar]){
  if(isTerminal(ev.status))continue;normalizeCalendarEvent(ev);
  if(now<stamp(ev.dateISO,ev.startMinute))continue;
  if(SIM.skipping){simulateObligation(ev);continue}
  if(ev.type==='schoolEvent'&&ev.status==='Scheduled'&&isSchoolDay(ev.dateISO)&&ev.startMinute===600&&now<stamp(ev.dateISO,ev.graceMinute)){Object.assign(ev,contestSlot(ev.dateISO));ev.minute=ev.startMinute;continue}
  if(ev.status==='Attending'){if(ev.type==='schoolDay'&&now>=stamp(ev.dateISO,ev.endMinute))finishSchoolDay(ev);continue}
  if(now>stamp(ev.dateISO,ev.graceMinute)){missObligation(ev);continue}
  if(ev.status==='Scheduled'){setCalendarStatus(ev,'Due','Window opened');onObligationDue(ev)}
 }
 processPendingDecisions();checkConditionalRequests();expireEvents();processFollowUps();if(S.plans)plansTick();
}
function onObligationDue(ev){
 if(SIM.skipping)return;
 if(ev.type==='exam'){const exam=S.exams.find(x=>x.id===ev.payload?.examId);if(!examIsOpen(exam)){setCalendarStatus(ev,calStatusForExam(exam)||'Cancelled','Reconciled');return}exam.status='Due';notify('Assessment today',`${exam.subject} ${exam.type.toLowerCase()} • ${timeLabel(exam.minute)}. Late sitting closes at ${timeLabel(exam.graceMinute)}.`,{sourceType:'exam',sourceId:exam.id,tab:'school'});offerContext(examContext(exam));return}
 if(ev.type==='clubSession'){const c=clubById(ev.payload?.clubId);if(!c||c.status!=='Active'){setCalendarStatus(ev,'Cancelled','Club inactive');return}notify('Club session now',`${c.name} started at ${timeLabel(ev.startMinute)}.`,{sourceType:'club',sourceId:ev.id,tab:'school'});offerContext(calendarContext(ev));return}
 if(ev.type==='schoolEvent'){const c=contestById(ev.payload?.contestId);if(!c||c.status!=='Registered'){setCalendarStatus(ev,'Cancelled','Not registered');return}notify('Event today',`${c.name} • arrive by ${timeLabel(ev.graceMinute)}.`,{sourceType:'contest',sourceId:ev.id,tab:'school'});offerContext(calendarContext(ev));return}
 if(['tryout','plan'].includes(ev.type)){notify(ev.type==='tryout'?'Tryout now':'Plans now',`${ev.title} • ${timeLabel(ev.startMinute)}.`,{sourceType:ev.type,sourceId:ev.id,tab:ev.type==='tryout'?'school':'people'});offerContext(calendarContext(ev));return}
 if(ev.type==='election'||ev.type==='conference'||ev.type==='trip'||ev.type==='wedding')return;
 if(ev.type==='medicalFollowUp'){notify('Doctor follow-up','Today at '+timeLabel(ev.startMinute),{sourceType:'calendar',sourceId:ev.id,tab:'health'});return}
 if(ev.type==='workDay'){offerContext({sourceType:'calendar',sourceId:ev.id,priority:5,title:`Work • ${ev.location}`,text:'9:00–5:00. On time until 9:15.',expiresAt:{dateISO:ev.dateISO,minute:660}});return}
 if(ev.type==='program'){notify(ev.title,`${timeLabel(ev.startMinute)} • ${ev.location}`,{sourceType:'program',sourceId:ev.id,tab:'places'});offerContext({sourceType:'calendar',sourceId:ev.id,priority:4,title:ev.title,text:`Starts at ${timeLabel(ev.startMinute)}.`,expiresAt:{dateISO:ev.dateISO,minute:ev.graceMinute}});return}
 if(ev.type==='prom'){if(S.school?.prom?.plan!=='skip'){notify('Prom tonight',`${ev.location} • 7:00 PM`,{sourceType:'prom',sourceId:ev.id,tab:'home'});offerContext({sourceType:'calendar',sourceId:ev.id,priority:5,title:'Prom tonight',text:`${ev.location}. Doors at 7:00 PM.`,expiresAt:{dateISO:ev.dateISO,minute:ev.graceMinute}})}return}
 if(ev.type==='party'){const host=ev.payload?.hostId||ev.payload?.personId||(S.plans||[]).find(x=>x.id===ev.payload?.planId)?.personId;queueEvent({type:'party',title:ev.title,text:ev.text||'A social event you were expecting has arrived.',participants:host&&personById(host)?[host]:[],payload:{...(ev.payload||{}),hostId:host||null},choices:[{id:'go',label:'Go'},{id:'skip',label:'Skip'}]});setCalendarStatus(ev,'Resolved','Converted to invitation');return}
 if(ev.type!=='schoolDay')setCalendarStatus(ev,'Resolved','Reached')
}
function missObligation(ev){
 const sick=!!S.healthState?.illness,excuse=SIM.excuse||(sick?'Illness':null);
 if(ev.type==='exam'){const exam=S.exams.find(x=>x.id===ev.payload?.examId);if(!examIsOpen(exam)){setCalendarStatus(ev,calStatusForExam(exam)||'Cancelled','Reconciled');return}finalizeExam(exam.id,{status:excuse?'Excused':'Missed',reason:excuse||'Did not attend the assessment window'});return}
 if(ev.type==='schoolDay'){markSchoolAbsence(ev,{excused:!!excuse,reason:excuse||''});return}
 if(ev.type==='clubSession'){resolveClubSession(ev,excuse?'Excused':'Missed',excuse||'No-show');return}
 if(ev.type==='schoolEvent'){resolveContestAttendance(ev,excuse?'Withdrew':'No-show');return}
 if(ev.type==='tryout'){tryoutMissed(ev);return}
 if(ev.type==='conference'||ev.type==='trip'||ev.type==='wedding')return;
 if(ev.type==='program'){programMissed(ev);return}
 if(ev.type==='medicalFollowUp'){setCalendarStatus(ev,'Missed','Missed the follow-up');return}
 if(ev.type==='workDay'){if(currentMinute()>=660||ev.dateISO<currentDate())workNoShow(ev);return}
 if(ev.type==='prom'){promMissed(ev);return}
 if(ev.type==='plan'){planNoShow(ev);return}
 if(ev.type==='election'){const el=S.elections?.find(x=>x.id===ev.payload?.electionId);if(el&&el.status==='Campaign')decideElection(el);setCalendarStatus(ev,'Completed','Votes counted');return}
 setCalendarStatus(ev,'Expired','Time passed')
}
function attendTendency(type){
 const base={schoolDay:96,exam:95,clubSession:80,schoolEvent:90}[type]??85;
 const resp=(S.family?.responsibility||0)*.06,stress=Math.max(0,S.stress-50)*.15,health=S.health<50?8:0;
 const pers=(S.personality.includes('Responsible')?3:0)-(S.personality.includes('Stubborn')||S.personality.includes('Bold')?2:0);
 return clamp(base+resp-stress-health+pers-(S.age>=15&&S.age<=17?2:0),50,99.5)
}
function simulateObligation(ev){
 if(ev.type==='conference'||ev.type==='trip'||ev.type==='wedding')return;
 if(ev.type==='medicalFollowUp'){setCalendarStatus(ev,'Attended','Simulated');const c=condition();if(c)c.supported=true;return}
 if(ev.type==='workDay'){const j=careerJob();if(!j){setCalendarStatus(ev,'Cancelled','No job');return}if(chance(92)){setCalendarStatus(ev,'Attended','Simulated');j.monthLog.worked++;j.points=clamp(j.points+3);S.career.performance=clamp(S.career.performance+.4)}else workNoShow(ev);return}
 if(ev.type==='program'){if(chance(85))attendProgram(ev.id,{simulated:true});else programMissed(ev);return}
 const attend=chance(attendTendency(ev.type)),sick=chance(ev.type==='schoolDay'?2.5:1.5);
 if(ev.type==='exam'){const exam=S.exams.find(x=>x.id===ev.payload?.examId);if(!examIsOpen(exam)){setCalendarStatus(ev,calStatusForExam(exam)||'Cancelled','Reconciled');return}if(attend&&!sick)performExam(exam,{simulated:true});else finalizeExam(exam.id,{status:sick?'Excused':'Missed',reason:sick?'Illness':'Skipped',simulated:true});return}
 if(ev.type==='schoolDay'){if(SIM.excuse)markSchoolAbsence(ev,{excused:true,reason:SIM.excuse,simulated:true});else if(sick)markSchoolAbsence(ev,{excused:true,reason:'Sick day',simulated:true});else if(attend)markSchoolAttendance(ev,{tardy:chance(4),simulated:true});else markSchoolAbsence(ev,{simulated:true});return}
 if(ev.type==='clubSession'){const c=clubById(ev.payload?.clubId);if(!c||c.status!=='Active'){setCalendarStatus(ev,'Cancelled','Club inactive');return}if(attend&&!sick)clubSessionAttended(ev,{simulated:true});else resolveClubSession(ev,sick?'Excused':'Missed',sick?'Sick':'Skipped',{simulated:true});return}
 if(ev.type==='schoolEvent'){const c=contestById(ev.payload?.contestId);if(!c||c.status!=='Registered'){setCalendarStatus(ev,'Cancelled','Not registered');return}if(attend&&!sick){resolveContest(c,{simulated:true});setCalendarStatus(ev,'Attended','Simulated attendance')}else resolveContestAttendance(ev,sick?'Withdrew':'No-show',{simulated:true});return}
 if(ev.type==='tryout'){const t=S.school?.tryouts?.find(x=>x.id===ev.payload?.tryoutId);if(t&&t.status==='Scheduled'&&attend){t.prep=Math.max(t.prep,25+Math.random()*30);evaluateTryout(t,{simulated:true});setCalendarStatus(ev,'Attended','Simulated')}else tryoutMissed(ev);return}
 if(ev.type==='prom'){const pr=S.school?.prom;if(!pr||pr.plan==='skip'||!attend){promMissed(ev);return}pr.status='Done';setCalendarStatus(ev,'Attended','Simulated');const pp=pr.partnerId?personById(pr.partnerId):null;if(pp)pp.rel=clamp(pp.rel+4);S.milestones.unshift({dateISO:currentDate(),age:S.age,title:'💃 Prom',text:pp?`You went to prom with ${displayName(pp,'formal')}.`:'You went to prom with friends.'});if(SIM.summary)SIM.summary.notable.push('Went to prom');return}
 if(ev.type==='plan'){const plan=S.plans?.find(x=>x.id===ev.payload?.planId);if(plan&&attend){plan.status='Attended';const p=personById(plan.personId);if(p)p.rel=clamp(p.rel+3);setCalendarStatus(ev,'Attended','Simulated')}else planNoShow(ev);return}
 if(ev.type==='election'){const el=S.elections?.find(x=>x.id===ev.payload?.electionId);if(el)decideElection(el);setCalendarStatus(ev,'Completed','Simulated');return}
 setCalendarStatus(ev,'Expired','Skipped ahead')
}

// ---------- Notifications ----------
function notify(title,text,opts={}){
 S.notifications=S.notifications||[];
 if(opts.sourceId&&S.notifications.some(x=>x.sourceId===opts.sourceId&&x.title===title&&['Unread','Read'].includes(x.status)))return null;
 const n={id:uid('note'),dateISO:currentDate(),minute:currentMinute(),title,text,read:false,status:'Unread',sourceType:opts.sourceType||null,sourceId:opts.sourceId||null,tab:opts.tab||null};
 S.notifications.unshift(n);if(S.notifications.length>60)S.notifications.length=60;return n
}
function resolveNotificationsFor(sourceId,status='Resolved'){if(!sourceId)return;for(const n of S.notifications||[])if(n.sourceId===sourceId&&['Unread','Read'].includes(n.status)){n.status=status;n.read=true;n.resolvedDate=currentDate()}}
function activeNotifications(){return (S.notifications||[]).filter(n=>['Unread','Read'].includes(n.status))}

// ---------- Exams ----------
function examIsOpen(e){return !!e&&['Scheduled','Due','In progress'].includes(e.status)}
function examSubject(exam){return S.school?.subjects?.find(x=>x.name===exam?.subject)||null}
function ensureTeacher(sub){if(!sub)return null;sub.teacher=sub.teacher||{name:teacherName(sub.name),rel:55};sub.teacher.style=sub.teacher.style||rand(['Strict','Fair','Fair','Warm']);return sub.teacher}
function normalizeExam(x){
 x.id=x.id||uid('exam');x.type=x.type||'Assessment';if(!x.dateISO)x.dateISO=addDays(currentDate(),Math.max(1,safeNum(x.days,10)));
 if(!x.status)x.status=x.score==null?'Scheduled':'Completed';if(x.score!=null&&['Scheduled','Due','In progress'].includes(x.status))x.status='Completed';
 x.minute=safeNum(x.minute,540,0,1439);x.endMinute=safeNum(x.endMinute,Math.min(1439,x.minute+75),0,1439);x.graceMinute=safeNum(x.graceMinute,x.minute>=SCHOOL_DAY.end?Math.min(1439,x.minute+60):SCHOOL_DAY.cutoff,0,1439);x.prep=safeNum(x.prep,0,0,100);return x
}
function calStatusForExam(exam){if(!exam)return null;if(exam.status==='Completed'||exam.status==='Replaced by make-up')return 'Completed';if(exam.status==='Excused')return 'Excused';if(exam.status==='Make-up scheduled')return exam.excused?'Excused':'Missed';if(exam.status==='Missed')return 'Missed';if(exam.status==='Cancelled')return 'Cancelled';return null}
function examCalendarEvents(exam){return S.calendar.filter(e=>e.type==='exam'&&e.payload?.examId===exam.id)}
function addExamRecord(exam){normalizeExam(exam);S.exams.push(exam);createCalendarEvent({id:'cal-'+exam.id,type:'exam',title:`${exam.subject} • ${exam.type}`,dateISO:exam.dateISO,startMinute:exam.minute,endMinute:exam.endMinute,graceMinute:exam.graceMinute,payload:{examId:exam.id},source:'school'});return exam}
function ensureRollingAssessments(){
 if(!needsFormalSchool())return;if(S.exams.filter(examIsOpen).length>=2)return;
 const subs=S.school.subjects.slice(0,6);if(!subs.length)return;
 const last=n=>S.exams.filter(e=>e.subject===n).map(e=>e.dateISO).sort().pop()||'0000';
 const sub=[...subs].sort((a,b)=>last(a.name).localeCompare(last(b.name))||Math.random()-.5)[0];
 const types=S.age<=11?['Class assessment','Quiz']:['Quiz','Unit test','Project / final'];
 const rollDate=nextSchoolDay(addDays(currentDate(),7+Math.floor(Math.random()*12)));if(!semesterEnd()||rollDate>semesterEnd())return;
 addExamRecord({id:uid('exam'),subject:sub.name,dateISO:rollDate,minute:540,type:rand(types),score:null,status:'Scheduled',prep:0})
}
function syncExamCalendar(){
 if(!S.school)return;
 for(const exam of S.exams||[]){
  normalizeExam(exam);exam.days=daysBetween(currentDate(),exam.dateISO);
  let evs=examCalendarEvents(exam);
  if(evs.length>1){const keep=evs.find(e=>e.id==='cal-'+exam.id)||evs[0];S.calendar=S.calendar.filter(e=>!(e.type==='exam'&&e.payload?.examId===exam.id&&e!==keep));evs=[keep]}
  if(!evs.length&&examIsOpen(exam))evs=[createCalendarEvent({id:'cal-'+exam.id,type:'exam',title:`${exam.subject} • ${exam.type}`,dateISO:exam.dateISO,startMinute:exam.minute,endMinute:exam.endMinute,graceMinute:exam.graceMinute,payload:{examId:exam.id},source:'school'})];
  for(const ev of evs){
   const target=calStatusForExam(exam);
   if(target){if(!isTerminal(ev.status)||ev.status!==target)setCalendarStatus(ev,target,'Synced with assessment record')}
   else{if(examIsOpen(exam)){ev.dateISO=exam.dateISO;ev.startMinute=ev.minute=exam.minute;ev.endMinute=exam.endMinute;ev.graceMinute=exam.graceMinute;if(isTerminal(ev.status))ev.status='Scheduled';if(ev.status==='Due'&&stamp(exam.dateISO,exam.minute)>nowStamp())ev.status='Scheduled'}}
  }
 }
}
function examScore(exam,{late=0,cheat=false,simulated=false}={}){
 const sub=examSubject(exam);if(!sub)return 60;
 if(simulated){const prep=clamp(Math.max(sub.prep,45+(S.family?.responsibility||0)*.3+Math.random()*20-Math.max(0,S.stress-55)*.3));return clamp(Math.round(sub.skill*.4+sub.score*.45+prep*.15+(S.luck-50)*.08+(Math.random()*14-7)))}
 const prep=sub.prep;
 const talent=(traitBoost(['subject:'+sub.name,'exam']).mult-1)*12,mood=simulated?0:(S.happiness-55)*.12,hungry=simulated?0:Math.max(0,S.needs.hunger-70)*.15;
 const sleep=simulated?0:(S.needs.sleep-50)*.08+talent+mood-hungry,stress=simulated?0:Math.max(0,S.stress-45)*.12,luck=(S.luck-50)*.08,latePenalty=late>0?Math.min(18,late/4):0;
 return clamp(Math.round(sub.skill*.42+prep*.35+sub.score*.23+sleep-stress+luck+(Math.random()*14-7)+(cheat?10:0)-latePenalty))
}
function examStory(exam,score,late){
 const sub=examSubject(exam),t=ensureTeacher(sub)?.name||'The teacher',prep=sub?.prep||0,tired=S.needs.sleep<40,nervous=S.stress>60;
 const lateLine=late>0?rand([`You slipped in ${late} minutes late and had to start while everyone else was already writing.`,`${t} let you sit down late, but the clock did not wait for you.`]):'';
 let core;
 if(score>=85)core=rand([`The questions felt familiar from the first page${prep>=60?' — the preparation paid off':''}. You finished with time to check your work.`,`You worked steadily and only hesitated on one question. Walking out, you already suspect it went well.`,`${exam.subject} clicked today. Even the last section felt manageable.`]);
 else if(score>=70)core=rand([`Most of it went smoothly. One section slowed you down, but you worked through it.`,`You knew more than you expected, though a couple of questions caught you off guard.`,`It was solid work. Not perfect, but you were not guessing much.`]);
 else if(score>=55)core=rand([`You recognized some questions and guessed on others. ${tired?'Being tired made it harder to focus.':nervous?'Nerves kept getting in the way.':'More preparation would have helped.'}`,`Half of it made sense. The other half you had to reason out on the spot.`]);
 else core=rand([`The questions blurred together. ${tired?'You could barely keep your eyes open.':prep<30?'You had not prepared enough for this one.':'Your mind went blank on the hardest section.'}`,`You stared at the second page longer than you would like to admit. It was a hard day.`]);
 return [lateLine,core].filter(Boolean).join(' ')
}
function performExam(exam,{cheat=false,simulated=false,lateMinutes=0}={}){
 if(!examIsOpen(exam))return null;const sub=examSubject(exam);
 exam.status='In progress';examCalendarEvents(exam).forEach(ev=>setCalendarStatus(ev,'Attending','Sitting the assessment'));
 if(cheat&&!simulated){
  const caught=chance(28+(S.stress/5)-(S.luck-50)*.1);
  if(caught){const t=ensureTeacher(sub);if(t)t.rel=clamp(t.rel-20);S.school.behavior=clamp(S.school.behavior-18);S.family.tension=clamp(S.family.tension+8);setEmotion('Embarrassed','You were caught cheating.',75);advanceTime(60,{silent:true});finalizeExam(exam.id,{status:'Completed',score:0,reason:'Caught cheating',narrative:`${t?.name||'The teacher'} quietly takes your paper halfway through. The score is a zero, and a note goes home.`});if(S.age<18)scheduleFollowUp('cheatingParent',{examId:exam.id},{minute:1080});return exam}
 }
 const score=examScore(exam,{late:lateMinutes,cheat,simulated});
 if(!simulated){S.stress=clamp(S.stress+5);S.happiness=clamp(S.happiness+(score>=75?5:score<55?-5:0));advanceTime(Math.max(30,(exam.endMinute-exam.minute)-lateMinutes),{silent:true})}
 finalizeExam(exam.id,{status:'Completed',score,reason:lateMinutes?'Completed late':'Completed',narrative:simulated?'':examStory(exam,score,lateMinutes),simulated});
 return exam
}
function finalizeExam(examId,{status='Completed',score=null,reason='',narrative='',simulated=false}={}){
 const exam=S.exams.find(x=>x.id===examId);if(!exam)return null;if(!examIsOpen(exam))return exam;
 const sub=examSubject(exam),t=ensureTeacher(sub),rec=ensureSchoolRecord()||freshSchoolRecord(),sum=SIM.summary?.school;
 exam.status=status;exam.resolvedAt={dateISO:currentDate(),minute:currentMinute()};exam.reason=reason;
 if(status==='Completed'){
  exam.score=clamp(Math.round(score??0));
  if(sub){const before=sub.score;sub.score=clamp(sub.score+(exam.score-sub.score)*.16);exam.subjectDelta=sub.score-before;sub.prep=clamp(sub.prep*.35)}
  if(exam.makeupOf){const orig=S.exams.find(x=>x.id===exam.makeupOf)||S.archive.exams.find(x=>x.id===exam.makeupOf);if(orig){orig.status='Replaced by make-up';orig.replacedBy=exam.id}}
  rec.examsCompleted++;if(sum){sum.examsCompleted++;sum.scores.push(exam.score)}if(exam.score>=85)addRep('academic',1.5);else if(exam.score<50)addRep('academic',-.5);if(reason==='Caught cheating')addRep('troublemaker',8);
  if(!simulated){log(`${exam.subject} ${exam.type} • ${exam.score}%`,narrative||'You completed the assessment.',exam.score>=95);toast(`${exam.subject}: ${exam.score}%`)}
 }else if(status==='Missed'){
  exam.score=0;exam.incomplete=true;
  if(!exam.consequencesApplied){if(sub){const before=sub.score;sub.score=clamp(sub.score-Math.max(3,sub.score*.1));exam.subjectDelta=sub.score-before}if(t)t.rel=clamp(t.rel-(t.style==='Strict'?7:4));S.school.attendance=clamp(S.school.attendance-1);S.stress=clamp(S.stress+4);rec.examsMissed++;if(sum)sum.examsMissed++}
  if(!simulated){log(`Missed ${exam.subject}`,`The ${exam.type.toLowerCase()} happened without you. For now it counts as a zero and an incomplete.`);queueMissedExamEvent(exam)}
  else if(chance(35+(t?.rel||50)*.3)){scheduleMakeupExam(exam);if(sum)sum.makeups++}
 }else if(status==='Excused'){
  exam.excused=true;exam.score=null;rec.examsExcused++;if(sum)sum.examsExcused++;
  const mk=scheduleMakeupExam(exam);if(!simulated)log(`${exam.subject} excused`,`Because of ${String(reason||'a recorded absence').toLowerCase()}, ${t?.name||'your teacher'} excuses the ${exam.type.toLowerCase()}.${mk?` A make-up is set for ${formatDate(mk.dateISO)}.`:''}`)
 }
 exam.consequencesApplied=true;
 for(const ev of examCalendarEvents(exam))setCalendarStatus(ev,calStatusForExam(exam)||'Resolved',reason||status);
 resolveNotificationsFor(exam.id);clearCurrentContextIfSourceResolved();
 return exam
}
function scheduleMakeupExam(exam){
 if(!exam||exam.makeupOf||exam.makeupId)return null;
 const sub=examSubject(exam),dateISO=nextSchoolDay(addDays(currentDate(),2+Math.floor(Math.random()*3)));
 const mk=addExamRecord({id:uid('exam'),subject:exam.subject,type:`${exam.type} (make-up)`,dateISO,minute:930,endMinute:1005,graceMinute:990,score:null,status:'Scheduled',prep:0,makeupOf:exam.id});
 exam.makeupId=mk.id;exam.status='Make-up scheduled';
 if(sub&&exam.subjectDelta<0&&!exam.penaltyReverted){sub.score=clamp(sub.score-exam.subjectDelta);exam.penaltyReverted=true}
 for(const ev of examCalendarEvents(exam))if(!isTerminal(ev.status))setCalendarStatus(ev,calStatusForExam(exam),'Make-up scheduled');
 return mk
}
function queueMissedExamEvent(exam){
 const sub=examSubject(exam),t=ensureTeacher(sub)?.name||'your teacher';
 queueEvent({type:'missedExam',title:`You missed ${exam.subject}`,text:`${t} noticed your empty seat during the ${exam.type.toLowerCase()}. ${S.age<10?'Your caregiver will probably hear about it too.':'What you say next matters.'}`,payload:{examId:exam.id},priority:4,expiresDays:3,choices:[{id:'honest',label:'Explain honestly'},{id:'sick',label:'Claim you were sick'},{id:'makeup',label:'Ask for a make-up'},{id:'ignore',label:'Ignore it'}]})
}
function takeExam(examId,cheat=false){
 const exam=S.exams.find(e=>e.id===examId)||S.exams.find(e=>e.subject===examId&&examIsOpen(e));
 if(!exam){toast('Assessment not found.');return}
 if(!examIsOpen(exam)){toast(exam.status==='Completed'?`Already completed • ${exam.score}%`:`This assessment is ${String(exam.status).toLowerCase()}.`);return}
 if(exam.dateISO>currentDate()){toast(`${exam.subject} is in ${daysBetween(currentDate(),exam.dateISO)} days.`);return}
 if(exam.dateISO<currentDate()||currentMinute()>exam.graceMinute){processCalendar();toast('The assessment window has closed.');return}
 const sd=schoolDayEvent();
 if(exam.minute<SCHOOL_DAY.end&&sd&&!isTerminal(sd.status)&&sd.status!=='Attending'){attendSchool(cheat?{cheatExamId:exam.id}:{examId:exam.id});return}
 if(currentMinute()<exam.minute){if(exam.minute-currentMinute()>240){toast(`It starts at ${timeLabel(exam.minute)}.`);return}advanceTime(exam.minute-currentMinute(),{silent:true})}
 performExam(exam,{cheat,lateMinutes:Math.max(0,currentMinute()-exam.minute)})
}
function nextExam(){return [...(S.exams||[])].filter(examIsOpen).sort((a,b)=>a.dateISO.localeCompare(b.dateISO)||a.minute-b.minute)[0]}

// ---------- School days ----------
function schoolDayEvent(dateISO=currentDate()){return S.calendar.find(e=>e.type==='schoolDay'&&e.dateISO===dateISO)}
function ensureSchoolDayObligation(dateISO=currentDate()){
 if(!needsFormalSchool()||!isSchoolDay(dateISO))return null;
 return schoolDayEvent(dateISO)||createCalendarEvent({id:`school-${dateISO}`,type:'schoolDay',title:`School • ${S.school.name}`,dateISO,startMinute:480,endMinute:900,graceMinute:660,payload:{school:S.school.name},source:'school'})
}
function schoolDayStatus(){
 if(!S.school)return 'Not enrolled';if(S.school.grade==='Kindergarten')return isSchoolDay()?'Kindergarten day':'Kindergarten closed';
 if(!isSchoolDay())return noSchoolReason();
 const ev=schoolDayEvent(),m=currentMinute();
 if(ev&&ev.status==='Attended')return ev.attendanceStatus==='Tardy'?'Attended (late)':'Attended';
 if(ev&&ev.status==='Excused')return 'Excused absence';if(ev&&ev.status==='Missed')return 'Absent';
 return m<SCHOOL_DAY.start?'Before school':m<=SCHOOL_DAY.tardyAfter?'School starting':m<=SCHOOL_DAY.cutoff?'Late — tardy if you go now':m<SCHOOL_DAY.end?'Attendance cutoff passed':'School finished'
}
function markSchoolAttendance(ev,{tardy=false,simulated=false}={}){
 const rec=ensureSchoolRecord();ev.attendanceStatus=tardy?'Tardy':'Present';setCalendarStatus(ev,'Attended',tardy?'Arrived late':'On time');rec.daysAttended++;
 if(tardy){rec.tardies++;if(simulated)recordLateReason(rand(['overslept','bus','traffic','stomach']));S.school.attendance=clamp(S.school.attendance-.3)}else S.school.attendance=clamp(S.school.attendance+.05);
 if(simulated)for(const sub of [...S.school.subjects].sort(()=>Math.random()-.5).slice(0,2))sub.skill=clamp(sub.skill+.16);
 if(SIM.summary){SIM.summary.school.days++;SIM.summary.school.attended++;if(tardy)SIM.summary.school.tardies++}
}
function markSchoolAbsence(ev,{excused=false,reason='',simulated=false}={}){
 const rec=ensureSchoolRecord();ev.attendanceStatus=excused?'Excused absence':'Absent';setCalendarStatus(ev,excused?'Excused':'Missed',reason||(excused?'Excused':'Did not arrive by the attendance cutoff'));
 if(SIM.summary){SIM.summary.school.days++;SIM.summary.school[excused?'excused':'absences']++}
 if(excused){rec.excused++;S.school.attendance=clamp(S.school.attendance-.2);if(!simulated)log('Absence excused',`School records ${formatDate(ev.dateISO)} as an excused absence (${String(reason||'excused').toLowerCase()}).`);return}
 rec.absences++;S.school.attendance=clamp(S.school.attendance-1.2);if(S.age>=12)addRep('troublemaker',1);if(S.age>=10)S.school.behavior=clamp(S.school.behavior-1);
 const n=rec.absences;
 if(simulated){if(n%4===0)S.family.tension=clamp(S.family.tension+2);return}
 log('Marked absent',S.age<10?`You never made it to school by ${timeLabel(SCHOOL_DAY.cutoff)}. The school records an unexplained absence, and your family will be asked about it.`:`School started without you. By ${timeLabel(SCHOOL_DAY.cutoff)} your homeroom teacher marks you absent${n>1?` — the ${ordinal(n)} time this year`:''}.`);
 absenceEscalation(n,ev)
}
function schoolDayStory(tardy,examLines){
 const subs=S.school.subjects,s1=rand(subs)?.name||'class',s2=rand(subs)?.name||'class',t=ensureTeacher(rand(subs))?.name||'your teacher',friend=bestNonFamily(),fn=firstName(friend);
 const opening=tardy?rand([`You slip into class after the bell, and ${t} gives you a look before carrying on.`,`You arrive late and have to sign in at the front office first.`,`The hallway is already empty when you get there. You walk in mid-sentence.`]):rand([`The day opens with ${s1}.`,`You make it in a few minutes before the bell.`,`Morning announcements run long, as usual.`]);
 const middle=rand([`${s2} drags a little, but one explanation finally clicks.`,`There is a surprise question in ${s2}; you get it ${chance(55)?'right':'half right'}.`,`${t} goes off on a tangent that turns out to be the most interesting part of the day.`,`Group work in ${s2} is chaotic, but your group finishes.`]);
 const social=friend?rand([`At lunch, ${fn} saves you a seat.`,`${fn} spends lunch telling you about ${rand(['a strange dream','their weekend','a new game','a rumor about a teacher'])}.`,`You and ${fn} trade snacks at lunch.`]):rand(['Lunch is quiet.','You spend lunch people-watching.']);
 return [opening,...examLines,middle,social].filter(Boolean).join(' ')
}

// ---------- Homework ----------
const HW_OPEN=['Assigned','Late'];
function homeworkLabel(hw){
 if(!hw||hw.status==='None')return 'No homework';
 if(hw.status==='Assigned'){const d=daysBetween(currentDate(),hw.dueDate);return d<0?'Late':d===0?'Due today':d===1?'Due tomorrow':`Due in ${d} days`}
 if(hw.status==='Late'){const d=daysBetween(hw.dueDate,currentDate());return `Late • ${d} day${d===1?'':'s'}`}
 return hw.status
}
function archiveHomework(sub){const hw=sub.homework;if(hw&&hw.status&&hw.status!=='None'){sub.homeworkHistory=sub.homeworkHistory||[];sub.homeworkHistory.unshift({...hw,subject:sub.name});if(sub.homeworkHistory.length>8)sub.homeworkHistory.length=8}}
function generateHomework(force=false){
 if(!needsFormalSchool())return;let active=S.school.subjects.filter(s=>HW_OPEN.includes(s.homework?.status)).length;
 for(const sub of [...S.school.subjects].sort(()=>Math.random()-.5)){
  if(active>=3)break;const hw=sub.homework||{status:'None'};
  const free=hw.status==='None'||(!HW_OPEN.includes(hw.status)&&(hw.resolvedDate||'0000')<currentDate());
  if(!free)continue;if(force?chance(45):chance(28)){archiveHomework(sub);sub.homework={id:uid('hw'),status:'Assigned',progress:0,assignedDate:currentDate(),dueDate:nextSchoolDay(addDays(currentDate(),2+Math.floor(Math.random()*3)))};active++}
 }
}
function simulateHomework(sub){
 const hw=sub.homework,p=clamp(72+(S.family?.responsibility||0)*.15-Math.max(0,S.stress-40)*.2,35,96),r=Math.random()*100,sum=SIM.summary?.school,rec=ensureSchoolRecord();
 if(r<p){hw.status='Submitted';hw.progress=100;sub.score=clamp(sub.score+1);rec.submittedHomework++;if(sum)sum.hwOnTime++}
 else if(r<p+(100-p)*.6){hw.status='Submitted late';hw.progress=100;rec.lateHomework++;if(sum)sum.hwLate++}
 else{hw.status='Missing';sub.score=clamp(sub.score-3);ensureTeacher(sub).rel=clamp(sub.teacher.rel-3);rec.missingHomework++;if(sum)sum.hwMissing++}
 hw.resolvedDate=currentDate()
}
function processHomeworkDeadlines(){
 if(!needsFormalSchool())return;const rec=ensureSchoolRecord();
 for(const sub of S.school.subjects){
  const hw=sub.homework;if(!hw||!HW_OPEN.includes(hw.status)||!hw.dueDate)continue;
  if(hw.status==='Assigned'&&hw.dueDate<currentDate()){if(SIM.skipping){simulateHomework(sub);continue}hw.status='Late';rec.lateHomework++;sub.score=clamp(sub.score-1);log('Homework late',`${sub.name} homework was due ${formatDate(hw.dueDate)}. ${ensureTeacher(sub).name} will still take it for a few days, for reduced credit.`)}
  else if(hw.status==='Late'&&daysBetween(hw.dueDate,currentDate())>3){hw.status='Missing';hw.resolvedDate=currentDate();rec.missingHomework++;sub.score=clamp(sub.score-3);ensureTeacher(sub).rel=clamp(sub.teacher.rel-3);if(SIM.summary)SIM.summary.school.hwMissing++;if(!SIM.skipping){log('Homework missing',`${sub.name} homework is now recorded as missing.${rec.missingHomework===1?' One missed assignment is not a disaster, but it is noted.':''}`);escalateHomework()}}
 }
}
function escalateHomework(){
 const rec=ensureSchoolRecord(),n=rec.missingHomework;if(S.age>=18)return;
 if(n===3)scheduleFollowUp('homeworkNote',{count:n},{minute:Math.max(currentMinute()+60,1050)});
 if(n>=6&&!rec.meetingHeld){rec.meetingHeld=true;scheduleFollowUp('parentTeacherMeeting',{count:n},{days:1,minute:960})}
}
function doHomework(name){
 const sub=S.school?.subjects?.find(x=>x.name===name),hw=sub?.homework;
 if(!sub||!hw||!HW_OPEN.includes(hw.status)){toast('There is no active homework for that subject.');return}
 const nb=findUsable('notebook'),gain=Math.min(100-(hw.progress||0),nb?60:50);if(nb){const u=openOne(nb);u.remaining=clamp(u.remaining-1.25);if(u.remaining<=0.5)removeItem(u.id)}hw.progress=(hw.progress||0)+gain;advanceTime(60);S.energy=clamp(S.energy-5);
 const t=ensureTeacher(sub),rec=ensureSchoolRecord();
 if(hw.progress>=100){
  const late=hw.status==='Late';hw.status=late?'Submitted late':'Submitted';recordTraitEvidence('Responsible',{source:late?'homework (late)':'homework on time',system:'school',eventId:'hw-'+sub.name+'-'+(hw.dueDate||hw.assignedDate||currentDate()),context:sub.name,quality:late?.5:1});hw.submittedDate=currentDate();hw.resolvedDate=currentDate();
  if(late){sub.score=clamp(sub.score+.5);rec.lateHomework=rec.lateHomework;feedback(`${sub.name} homework submitted late`,rand([`${t.name} accepts it with a short note about deadlines. Partial credit.`,`It is late, but it is done. ${t.name} takes it without much comment.`]),60)}
  else{sub.score=clamp(sub.score+2);t.rel=clamp(t.rel+2);rec.submittedHomework++;feedback(`${sub.name} homework submitted`,rand([`You finish the last question and put it in your bag. One less thing to worry about.`,`It took longer than expected, but the work is solid.`,`Done before the deadline — ${t.name} will notice.`]),60)}
 }else feedback(`${sub.name} homework`,`Progress ${hw.progress}% • ${homeworkLabel(hw)}`,60)
}

// ---------- Clubs as commitments ----------
function clubById(id){return S.school?.clubs?.find(x=>x.id===id)||null}
function ensureClub(c){return Object.assign(c,Object.assign({attended:0,missedSessions:0,excusedSessions:0,consecutiveMissed:0,leaderRel:60,warnings:0,recent:[],position:'New member',leader:teacherName(c.name)},c))}
function nextClubDate(fromISO){let d=addDays(fromISO,7);for(let i=0;i<20&&!isSchoolDay(d);i++)d=addDays(d,7);return isSchoolDay(d)?d:nextSchoolDay(d)}
function scheduleClubSession(c,dateISO){c.nextSessionDate=dateISO;return createCalendarEvent({id:`club-${c.id}-${dateISO}`,type:'clubSession',title:`${c.name} session`,dateISO,startMinute:930,endMinute:1020,graceMinute:960,payload:{clubId:c.id},source:'club',participants:c.members||[]})}
function clubSessionEvent(c){return S.calendar.filter(e=>e.type==='clubSession'&&e.payload?.clubId===c.id&&!isTerminal(e.status)).sort((a,b)=>a.dateISO.localeCompare(b.dateISO))[0]||null}
function clubAttendanceRate(c){const t=(c.attended||0)+(c.missedSessions||0);return t?Math.round(100*(c.attended||0)/t):100}
function activateClub(o){
 o.status='Joined';const club=ensureClub({id:uid('club'),name:o.name,status:'Active',joinedDate:currentDate(),skill:12,sessions:0,members:[rand(D.names),rand(D.names)]});
 S.school.clubs.push(club);scheduleClubSession(club,nextSchoolDay(addDays(currentDate(),2)));
 log('Joined '+club.name,`It is a real commitment now: sessions every week at ${timeLabel(930)}, led by ${club.leader}. Showing up matters.`,true)
}
function attendClubSession(clubId){
 const c=clubById(clubId);if(!c||c.status!=='Active')return;ensureClub(c);const ev=clubSessionEvent(c);
 if(!ev){toast('No session is scheduled.');return}
 if(ev.dateISO>currentDate()){toast(`Next session ${formatDate(ev.dateISO)} at ${timeLabel(ev.startMinute)}.`);return}
 if(currentMinute()>ev.graceMinute){processCalendar();toast('The session already started without you.');return}
 const sd=schoolDayEvent();if(sd&&sd.status==='Scheduled'||sd&&sd.status==='Due'){toast('School comes first — club starts after classes.');return}
 if(currentMinute()<ev.startMinute){if(ev.startMinute-currentMinute()>180){toast(`The session starts at ${timeLabel(ev.startMinute)}.`);return}advanceTime(ev.startMinute-currentMinute(),{silent:true})}
 if(isTerminal(ev.status))return;setCalendarStatus(ev,'Attending','Arrived');const late=Math.max(0,currentMinute()-ev.startMinute);
 advanceTime(Math.max(30,ev.endMinute-currentMinute()),{silent:true});clubSessionAttended(ev,{late})
}
function clubSessionStory(c,late){
 const m=rand(c.members||[])||'another member',L=c.leader;
 const lines={'Art Club':[`${L} sets up a still life and challenges everyone to draw it in ten minutes. Yours is lopsided but lively.`,`You and ${m} share a jar of paint water and accidentally invent a new color.`],'Chess Club':[`${m} beats you in a game you thought you were winning. You replay the final moves twice.`,`${L} shows a trap that you immediately want to try on someone.`],'Football':[`Drills, then a scrimmage. You make one good pass that ${L} actually notices.`,`It rains halfway through practice; nobody stops.`],'Drama':[`You run lines with ${m} until the scene finally lands.`,`An improv game goes wildly off the rails, in the best way.`]};
 const pool=lines[c.name]||[`${L} runs a focused session and you pick up something new.`,`You spend part of the session working alongside ${m}, which turns out to be fun.`,`It is a slow session, but you get real practice in.`];
 return `${late>5?'You arrive a few minutes late. ':''}${rand(pool)}`
}
function clubSessionAttended(ev,{simulated=false,late=0}={}){
 const c=clubById(ev.payload?.clubId);if(!c){setCalendarStatus(ev,'Cancelled','Club missing');return}ensureClub(c);
 const dim=c.skill>80?.5:c.skill>60?.75:1;c.sessions=(c.sessions||0)+1;c.attended++;c.consecutiveMissed=0;c.recent=[...c.recent,'A'].slice(-8);c.skill=clamp(c.skill+(late>15?3:5)*dim);c.leaderRel=clamp(c.leaderRel+1);

 setCalendarStatus(ev,'Attended',late?'Arrived late':'Attended');
 if(SIM.summary){const s=SIM.summary.clubs[c.id]=SIM.summary.clubs[c.id]||{name:c.name,attended:0,missed:0,excused:0};s.attended++}
 addRep(clubInfo(c.name).rep,.25);addRep('club',.3);if(!simulated&&chance(10))meetNewPeople(c.name);checkClubPromotion(c);if(chance(8))maybeOfferElection(c);
 if(!simulated){S.needs.social=clamp(S.needs.social+10);S.needs.fun=clamp(S.needs.fun+8);S.energy=clamp(S.energy-6);log(`${c.name} session`,clubSessionStory(c,late));toast(`${c.name} • skill ${Math.round(c.skill)}%`)}
 if(c.status==='Active')scheduleClubSession(c,nextClubDate(ev.dateISO))
}
function resolveClubSession(ev,status,reason,{simulated=false}={}){
 const c=clubById(ev.payload?.clubId);if(!c){setCalendarStatus(ev,'Cancelled','Club missing');return}ensureClub(c);
 if(status==='Excused'){c.excusedSessions++;c.recent=[...c.recent,'E'].slice(-8);if(c.recent.filter(x=>x==='E').length>=4)c.leaderRel=clamp(c.leaderRel-2)}
 else{c.missedSessions++;c.consecutiveMissed++;c.recent=[...c.recent,'M'].slice(-8);c.leaderRel=clamp(c.leaderRel-(reason==='Skipped'?2:4))}
 setCalendarStatus(ev,status,reason);
 if(SIM.summary){const s=SIM.summary.clubs[c.id]=SIM.summary.clubs[c.id]||{name:c.name,attended:0,missed:0,excused:0};s[status==='Excused'?'excused':'missed']++}
 if(!simulated)log(status==='Excused'?`${c.name}: excused`:`${c.name}: missed`,status==='Excused'?`You let ${c.leader} know ahead of time. "Thanks for telling me," they say.`:reason==='Skipped'?`You decide not to go to ${c.name} today.`:`${c.name} met without you. Nobody heard from you.`);
 if(status==='Missed')checkClubDiscipline(c,{simulated});
 if(c.status==='Active')scheduleClubSession(c,nextClubDate(ev.dateISO));
 if(!simulated&&status==='Missed'&&c.status==='Active'&&chance(45))scheduleFollowUp('teammateComment',{clubId:c.id},{days:1,minute:720})
}
function checkClubDiscipline(c,{simulated=false}={}){
 const missedRecent=c.recent.filter(x=>x==='M').length;
 if(c.consecutiveMissed>=4||(c.warnings>=2&&missedRecent>=4)||(c.warnings>=1&&missedRecent>=5)){
  c.status='Removed';c.removedDate=currentDate();for(const e of S.calendar)if(e.type==='clubSession'&&e.payload?.clubId===c.id&&!isTerminal(e.status))setCalendarStatus(e,'Cancelled','Removed from club');
  if(SIM.summary)SIM.summary.notable.push(`Removed from ${c.name} after repeated absences`);
  log('Removed from '+c.name,`After ${c.consecutiveMissed>=4?`${c.consecutiveMissed} missed sessions in a row`:'repeated absences despite a warning'}, ${c.leader} takes you off the roster. You could try joining again next term.`,true);return
 }
 if(missedRecent>=3&&c.warnings===0){
  c.warnings=1;if(simulated){c.leaderRel=clamp(c.leaderRel-3);if(SIM.summary)SIM.summary.notable.push(`${c.leader} warned you about missing ${c.name}`);return}
  queueEvent({type:'clubWarning',title:`${c.leader} wants a word`,text:`"You've missed ${missedRecent} of the last ${c.recent.length} ${c.name} sessions. The others are noticing. Can I count on you?"`,payload:{clubId:c.id},priority:3,expiresDays:2,choices:[{id:'commit',label:'Apologize and commit'},{id:'explain',label:"Explain what's going on"},{id:'shrug',label:'Shrug it off'}]})
 }
}
function skipClubSession(clubId){const c=clubById(clubId),ev=c&&clubSessionEvent(c);if(!ev||ev.dateISO!==currentDate()||currentMinute()<ev.startMinute-120){toast('There is no session to skip right now.');return}resolveClubSession(ev,'Missed','Skipped')}
function excuseClubSession(clubId){const c=clubById(clubId),ev=c&&clubSessionEvent(c);if(!ev){toast('No session scheduled.');return}if(ev.dateISO===currentDate()&&currentMinute()>=ev.startMinute){toast('It already started — telling them now is not "beforehand".');return}resolveClubSession(ev,'Excused','Told the leader beforehand')}

// ---------- Contests require attendance ----------
function contestById(id){return S.school?.contests?.find(x=>x.id===id)||null}
function contestSlot(dateISO){return isSchoolDay(dateISO)?{startMinute:780,endMinute:900,graceMinute:810,location:'School hall (during school)'}:{startMinute:600,endMinute:780,graceMinute:690,location:'School hall'}}
function contestCalendar(c){return createCalendarEvent(Object.assign({id:`contest-${c.id}`,type:'schoolEvent',title:c.name,dateISO:c.eventDate,payload:{contestId:c.id},source:'school'},contestSlot(c.eventDate)))}
function registerContest(c){c.status='Registered';const ev=contestCalendar(c);log('Registered • '+c.name,`The event is ${formatDate(c.eventDate)} at ${timeLabel(ev.startMinute)}${isSchoolDay(c.eventDate)?' in the school hall, during the school day — you will miss class to go':''}. You need to actually show up — preparation now matters.`)}
function contestEvent(c){return S.calendar.find(e=>e.type==='schoolEvent'&&e.payload?.contestId===c.id&&!isTerminal(e.status))||null}
function attendContest(contestId){
 const c=contestById(contestId);if(!c||c.status!=='Registered')return;const ev=contestEvent(c)||contestCalendar(c);
 if(ev.dateISO===currentDate()&&isSchoolDay(ev.dateISO)&&ev.startMinute<SCHOOL_DAY.end){const sd=schoolDayEvent();if(sd&&isTerminal(sd.status)&&sd.status!=='Attended'){toast('You are absent from school today, so you cannot take part.');return}if(sd&&sd.status!=='Attending'&&sd.status!=='Attended'){if(currentMinute()>SCHOOL_DAY.cutoff){toast('Too late to check in at school.');return}checkInToSchool()}}
 if(ev.dateISO>currentDate()){toast(`${c.name} is on ${formatDate(ev.dateISO)}.`);return}
 if(currentMinute()>ev.graceMinute){processCalendar();toast('Check-in has closed.');return}
 if(currentMinute()<ev.startMinute){if(ev.startMinute-currentMinute()>180){toast(`Check-in opens at ${timeLabel(ev.startMinute)}.`);return}advanceTime(ev.startMinute-currentMinute(),{silent:true})}
 if(S.age<13&&!caregiverApproval(30)){log('No ride',`${primaryCaregiver()} cannot get you to ${c.name} in time.`);resolveContestAttendance(ev,'Withdrew');return}
 setCalendarStatus(ev,'Attending','Checked in');const late=Math.max(0,currentMinute()-ev.startMinute);advanceTime(Math.max(45,ev.endMinute-currentMinute()),{silent:true});resolveContest(c,{late});setCalendarStatus(ev,'Attended',late?'Arrived late':'Attended')
}
function resolveContest(c,{late=0,simulated=false}={}){
 if(c.status==='Completed')return;
 const avg=schoolAverage(),club=Math.max(0,...(S.school?.clubs||[]).filter(x=>x.status==='Active').map(x=>x.skill||0)),score=clamp(avg*.38+c.prep*.35+club*.1+S.luck*.12+(Math.random()*18-9)-Math.min(10,late/4));
 c.status='Completed';c.result=score>=82?'Winner / top result':score>=68?'Strong result / finalist':'Participated';devContestResult(c,score);if(score>=68)addRep(/art|music|drama|show/i.test(c.name)?'creative':/sport|race|run/i.test(c.name)?'athletic':'academic',score>=82?6:3);S.happiness=clamp(S.happiness+(score>=82?10:score>=68?6:2));
 if(SIM.summary)SIM.summary.contests.push({name:c.name,result:c.result});
 if(simulated)return;
 const story=score>=82?rand([`When they read the results, your name comes first. For a second you think you misheard.`,`Your entry draws a small crowd. By the end of the day, you have a certificate and a story.`]):score>=68?rand([`You make the final round and hold your own against people who clearly practiced for weeks.`,`A judge stops to ask about your work. You do not win, but you place well.`]):rand([`It is not your day — others were more prepared — but you saw what the top entries looked like.`,`You get through it. The experience is worth more than the ribbon you do not get.`]);
 log(score>=82?'🏆 '+c.name:score>=68?'⭐ '+c.name:'🎖️ '+c.name,`${late>5?'You arrive late and rush to set up. ':''}${story} (${c.result})`,score>=82)
}
function resolveContestAttendance(ev,status,{simulated=false}={}){
 const c=contestById(ev.payload?.contestId);setCalendarStatus(ev,status,status==='No-show'?'Did not check in':'Withdrew');if(!c)return;
 c.status=status;c.result=status==='No-show'?'Did not attend':'Withdrew';
 if(SIM.summary)SIM.summary.contests.push({name:c.name,result:c.result});
 if(status==='No-show'&&sessionEvent()){S.stress=clamp(S.stress+1);if(!simulated)log(`Missed • ${c.name}`,`You stay in class while ${c.name} goes on in the hall without you. The organizers cross your name off.`);return}
 if(status==='No-show'){S.social.reputation=clamp(S.social.reputation-2);S.stress=clamp(S.stress+3);if(S.age<13)S.family.tension=clamp(S.family.tension+2);if(!simulated)log(`No-show • ${c.name}`,`Your name is called at check-in and nobody answers. The organizers move on, and ${S.age<13?'your caregiver, who signed the form, is not thrilled':'a teacher mentions it the next day'}.`)}
 else if(!simulated)log(`Withdrew • ${c.name}`,'You could not take part this time.')
}

// ---------- Pending decisions lifecycle ----------
const PENDING_RULES={
 kindergarten:{minAge:3,maxAge:null,expireStatus:'Superseded',expireReason:'Primary school age reached',autoDays:14},
 clubApproval:{maxDays:10,needsSchool:true},contestApproval:{maxDays:10,needsSchool:true},
 purchaseConsideration:{maxDays:21},jobApplication:{maxDays:21},
 conditionalPurchase:{maxDays:180,expireStatus:'Expired',expireReason:'The offer quietly lapsed'}
};
function sixthBirthday(){const b=parseISO(S.dob);b.setUTCFullYear(b.getUTCFullYear()+6);return isoDate(b)}
function normalizePending(x){
 const rule=PENDING_RULES[x.type]||{};
 Object.assign(x,Object.assign({id:uid('pending'),createdDate:currentDate(),status:'Pending',detail:'',resolved:false,resolveDate:null,expiresDate:null,minAge:rule.minAge??null,maxAge:rule.maxAge??null,resolvedDate:null,resolutionReason:null,supersededBy:null},x));
 if(x.type==='purchaseConsideration'&&x.status==='Conditional'&&!x.resolveDate){x.type='conditionalPurchase';x.expiresDate=addDays(currentDate(),180)}
 if(x.type==='kindergarten'){x.maxAge=null;x.expiresDate=null}
 if(!x.expiresDate&&!x.resolved){if(x.type==='kindergarten'){}else if(rule.maxDays)x.expiresDate=addDays(x.createdDate||currentDate(),rule.maxDays)}
 if(x.type==='kindergarten'&&!x.resolved&&!x.resolveDate&&!x.autoDecideDate)x.autoDecideDate=addDays(currentDate(),x.createdDate&&daysBetween(x.createdDate,currentDate())>14?3:rule.autoDays||14);
 return x
}
function createPending(p){const x=normalizePending(Object.assign({createdDate:currentDate()},p));S.pendingDecisions.push(x);return x}
function normalizeRequests(){S.pendingDecisions=(S.pendingDecisions||[]).map(x=>normalizePending(x));S.giftRequests=(S.giftRequests||[]).map(x=>Object.assign({id:uid('giftreq'),begging:1,chancePenalty:0,resolved:false,status:`Waiting for ${x.occasion||'occasion'}`},x))}
function resolvePendingDecision(p,status,reason,{title=null,text=null,important=false,supersededBy=null}={}){
 if(!p)return null;if(p.resolved&&p.resolvedDate)return p;p.status=status;p.resolved=true;p.resolvedDate=currentDate();p.resolutionReason=reason;if(supersededBy)p.supersededBy=supersededBy;resolveNotificationsFor(p.id);if(text)log(title||p.title,text,important);return p
}
function pendingLifecycleCheck(p){
 if(p.resolved)return;const rule=PENDING_RULES[p.type]||{};
 if(p.type==='kindergarten'){if(needsFormalSchool()||S.age>=7){const k=S.development.kindergarten;if(!k.decision)k.decision='Not needed — primary school began';resolvePendingDecision(p,'Superseded','Primary school age reached',{title:'Kindergarten question closed',text:`The kindergarten decision was never settled before primary school began, so it is closed. You started ${S.school?.grade||'primary school'} instead.`,supersededBy:S.school?.grade||'Primary school'})}return}
 if(p.maxAge!=null&&S.age>p.maxAge){
  if(p.type==='kindergarten'){const k=S.development.kindergarten;if(!k.decision)k.decision='Not needed — primary school began';resolvePendingDecision(p,'Superseded','Primary school age reached',{title:'Kindergarten question closed',text:`The kindergarten decision was never settled before primary school began, so it is closed. You started ${S.school?.grade||'primary school'} instead.`,supersededBy:S.school?.grade||'Primary school'});return}
  resolvePendingDecision(p,rule.expireStatus||'Expired',rule.expireReason||'No longer relevant at this age',{text:`${p.title} is no longer relevant at your age.`});return
 }
 if(rule.needsSchool&&!S.school){resolvePendingDecision(p,'Cancelled','No longer enrolled');return}
 if(p.expiresDate&&p.expiresDate<currentDate()&&!(p.resolveDate&&p.resolveDate>=currentDate()))resolvePendingDecision(p,rule.expireStatus||'Expired',rule.expireReason||'Expired',{text:`${p.title}: ${rule.expireReason||'this request expired without a final answer'}.`})
}
function processPendingDecisions(){
 for(const p of S.pendingDecisions){
  if(p.resolved)continue;normalizePending(p);pendingLifecycleCheck(p);if(p.resolved)continue;
  if(p.type==='kindergarten'&&!p.resolveDate&&p.autoDecideDate&&p.autoDecideDate<=currentDate()){p.status='Family discussing';p.resolveDate=addDays(currentDate(),2);p.detail=`You never gave a clear answer, so your caregivers are deciding on their own by ${formatDate(p.resolveDate)}.`;if(!SIM.skipping)log('Family discussing kindergarten','A three-year-old cannot be asked forever. Your caregivers start weighing schedules, money and childcare without waiting for your answer.');continue}
  if(!p.resolveDate||p.resolveDate>currentDate())continue;
  if(p.type==='purchaseConsideration')resolvePurchaseDecision(p);else if(p.type==='jobApplication')resolveJobDecision(p);else if(p.type==='kindergarten')resolveKindergartenDecision(p);else if(p.type==='clubApproval')resolveClubApproval(p);else if(p.type==='contestApproval')resolveContestApproval(p);else resolvePendingDecision(p,'Resolved','Reached decision date',{title:'Decision resolved',text:p.title});
  if(p.resolved&&!p.resolvedDate){p.resolvedDate=currentDate();p.resolutionReason=p.resolutionReason||p.status;resolveNotificationsFor(p.id)}
 }
}
function resolveKindergartenDecision(p){
 if(S.age>5){pendingLifecycleCheck(p);return}
 const pref=p.payload?.preference;const r=familyRules(),careNeed=(S.home==='Busy but loving'||['Struggling','Modest'].includes(S.wealth))?15:0,score=(pref===true?r.respect*.35:pref===false?-r.respect*.18:0)+careNeed+(55-r.strictness)*.18+50;
 const enrolled=score>=50||(pref===false&&r.strictness>75);S.development.kindergarten.enrolled=enrolled;S.development.kindergarten.preference=pref??null;S.development.kindergarten.decision=enrolled?'Enrolled':'Alternative care / home';
 resolvePendingDecision(p,enrolled?'Enrolled':'Alternative care',pref==null?'Family decided without a preference':'Family decided',{title:'Kindergarten decision',important:true,text:enrolled?`Your caregivers decide you will attend.${pref==null?' You never really answered, so they went with what worked for the family.':' Your preference mattered, but schedules, money and parenting style mattered too.'}`:'Your family chooses home, relative care or another arrangement for now.'});
 S.school=buildSchool(S.age,S.school)
}
function setKindergartenPreference(pref){
 if(S.age>5){toast('Primary school has already begun.');return}
 let p=S.pendingDecisions.find(x=>!x.resolved&&x.type==='kindergarten');
 if(!p){if(S.development.kindergarten.decision){toast('Your family already decided.');return}p=createPending({type:'kindergarten',title:'Kindergarten decision',status:'Waiting for your preference',payload:{preference:null},detail:'Your family is discussing early education.'})}
 if(p.status!=='Waiting for your preference'){toast('Your caregivers are already deciding.');return}
 p.payload.preference=!!pref;p.status='Family discussing';p.resolveDate=addDays(currentDate(),2);p.detail=`Your caregivers will decide by ${formatDate(p.resolveDate)}.`;log('Your kindergarten preference',pref?'You say you want to go.':'You say you would rather not go.');toast('Your caregivers will decide in 2 days')
}

// ---------- Events: response windows & expiry ----------
const INVITE_TYPES=['friendInvite','party','birthdayInvite','invitation'];
function defaultEventExpiry(e){
 const m=currentMinute();if(e.expiresDays)return {dateISO:addDays(currentDate(),e.expiresDays),minute:1260};
 if(INVITE_TYPES.includes(e.type)){if(m<1020)return {dateISO:currentDate(),minute:1080};return {dateISO:addDays(currentDate(),1),minute:720}}
 return {dateISO:addDays(currentDate(),1),minute:1260}
}
function eventExpired(e){return !!e?.expiresAt&&nowStamp()>stampOf(e.expiresAt)}
function queueEvent(ev){
 ensureLifecycleContainers();
 if(actorMissing(ev)){console.warn('Interpersonal event missing actor:',ev.type,ev.title);return null}
 const e=Object.assign({id:uid('event'),dateISO:currentDate(),minute:currentMinute(),status:'Open',participants:[],choices:[],priority:3},ev);if(!e.expiresAt)e.expiresAt=defaultEventExpiry(e);
 S.events.unshift(e);
 if(S.events.length>30){const open=S.events.filter(x=>x.status==='Open'),closed=S.events.filter(x=>x.status!=='Open');S.archive.events.unshift(...closed.slice(Math.max(0,30-open.length)));if(S.archive.events.length>120)S.archive.events.length=120;S.events=[...open,...closed.slice(0,Math.max(0,30-open.length))]}
 if(!SIM.skipping)offerContext({sourceType:'event',sourceId:e.id,priority:e.priority,title:e.title,text:e.text,expiresAt:e.expiresAt});
 return e
}
function expireEvent(e){
 if(!e||e.status!=='Open')return;e.status='Expired';e.resolvedAt={dateISO:currentDate(),minute:currentMinute()};resolveNotificationsFor(e.id,'Expired');
 if(SIM.skipping){if(e.type==='missedExam'){const exam=S.exams.find(x=>x.id===e.payload?.examId);const t=ensureTeacher(examSubject(exam));if(t)t.rel=clamp(t.rel-2)}return}
 const p=personById(e.participants?.[0]);
 if(INVITE_TYPES.includes(e.type)){if(p){p.rel=clamp(p.rel-1);rememberPerson(p,'You never answered their invitation.')}log('Invitation expired',p?`${firstName(p)} stopped waiting for an answer and made other plans.`:'Nobody heard back from you, so the plan moved on without you.')}
 else if(e.type==='missedExam'){const exam=S.exams.find(x=>x.id===e.payload?.examId),t=ensureTeacher(examSubject(exam));if(t)t.rel=clamp(t.rel-3);log('Silence about the missed assessment',`${t?.name||'Your teacher'} waited for you to say something. You never did, and the zero stays.`);if(S.age<18&&chance(55))scheduleFollowUp('missedExamParent',{examId:e.payload?.examId},{minute:Math.min(1439,currentMinute()+120)})}
 else if(e.type==='birthdayParty'){S.family.closeness=clamp(S.family.closeness+1);log('A quiet birthday','Nobody heard a plan from you, so your family does something small and simple instead.')}
 else if(['absenceTalk','examTalk','homeworkTalk','ptMeeting','parentSchool','parentGrades','cheatTalk'].includes(e.type)){S.family.tension=clamp(S.family.tension+2);log('The conversation moved on','You avoided the talk. It did not go away — it just got a little colder.')}
 else if(e.type==='clubWarning'){const c=clubById(e.payload?.clubId);if(c){c.leaderRel=clamp(c.leaderRel-3);c.warnings=Math.max(c.warnings,2)}log('No reply',`${c?.leader||'The club leader'} takes your silence as an answer.`)}
 else log('The moment passed',`${e.title} — you did not respond in time.`)
}
function expireEvents(){for(const e of S.events||[])if(e.status==='Open'){if(!e.expiresAt)e.expiresAt={dateISO:addDays(e.dateISO||currentDate(),1),minute:1260};if(eventExpired(e))expireEvent(e)}}

// ---------- Delayed consequences (follow-ups) ----------
function scheduleFollowUp(type,payload={},{dateISO=null,days=0,minute=null}={}){S.followUps=S.followUps||[];const d=dateISO||addDays(currentDate(),days);S.followUps.push({id:uid('fu'),type,payload,dateISO:d,minute:minute??Math.min(1439,currentMinute()+60),status:'Scheduled',createdDate:currentDate()})}
function processFollowUps(){
 const now=nowStamp();
 for(const f of S.followUps||[]){if(f.status!=='Scheduled'||now<stamp(f.dateISO,f.minute))continue;f.status='Triggered';f.triggeredDate=currentDate();try{runFollowUp(f)}catch(err){console.error('Follow-up failed',f,err)}}
 S.followUps=(S.followUps||[]).filter(f=>f.status==='Scheduled'||f.dateISO>=addDays(currentDate(),-14))
}
function caregiverPerson(){return householdCaregiver()}
function runFollowUp(f){
 if(uniFollowUp(f))return;if(rstFollowUp(f))return;if(lmpqFollowUp(f))return;if(knxFollowUp(f))return;if(worldFollowUp(f))return;if(hijFollowUp(f))return;if(f.type==='weatherAsk'){weatherMorningCheck();return}
 const cg=caregiverPerson(),name=cg?firstName(cg):'Your caregiver',quiet=SIM.skipping||S.age>=18;
 if(f.type==='absenceNotice'){const n=f.payload.count||1;if(quiet){if(S.age<18)S.family.tension=clamp(S.family.tension+(n>=3?3:1));return}if(n<=1){S.family.tension=clamp(S.family.tension+1);log('Absence notice',`The school sends home a routine note about ${formatDate(f.payload.dateISO)}. ${name} frowns at it, but lets it go — this time.`);return}queueEvent({type:'absenceTalk',title:`${name} heard from school`,text:n>=5?`This is your ${ordinal(n)} unexplained absence this year. ${name} is not asking casually anymore.`:`The school called about your absence on ${formatDate(f.payload.dateISO)}. ${name} wants to know what happened.`,payload:{count:n},participants:cg?[cg.id]:[],priority:4,expiresDays:1,choices:[{id:'apologize',label:'Apologize'},{id:'lie',label:'Make up an excuse'},{id:'argue',label:'Argue'},{id:'explain',label:'Explain what really happened'}]});return}
 if(f.type==='missedExamParent'||f.type==='cheatingParent'){if(quiet){S.family.tension=clamp(S.family.tension+2);return}const exam=S.exams.find(x=>x.id===f.payload.examId);queueEvent({type:f.type==='cheatingParent'?'cheatTalk':'examTalk',title:f.type==='cheatingParent'?`${name} got a note from school`:`${name} found out about ${exam?.subject||'the assessment'}`,text:f.type==='cheatingParent'?'The note says you were caught cheating. The kitchen goes very quiet.':`A message from school says you missed the ${exam?.subject||''} ${String(exam?.type||'assessment').toLowerCase()}.`,participants:cg?[cg.id]:[],priority:4,expiresDays:1,choices:[{id:'apologize',label:'Apologize'},{id:'lie',label:'Make up an excuse'},{id:'argue',label:'Argue'},{id:'explain',label:'Explain what really happened'}]});return}
 if(f.type==='npcAnswer'){const plan=S.plans?.find(x=>x.id===f.payload.planId),p=plan&&personById(plan.personId);if(!plan||plan.status!=='Maybe'||plan.playerMaybe)return;const yes=chance(55+(p?(p.rel-55)*.5:0));const th=thread('plan',plan.id,plan.title);if(yes){plan.status='Accepted';schedulePlanCalendar(plan);threadStep(th,'Accepted','They said yes after all');if(!SIM.skipping){log(`${firstName(p)} is in`,`"Okay, I can come!" ${plan.title} is on.`);notify('Plans confirmed',plan.title,{sourceType:'plan',sourceId:plan.id,tab:'people'})}}else{plan.status='Declined';threadStep(th,'Declined','They could not make it',{resolve:true});recordOutcome('Plan',plan.title,'Declined','They checked and could not make it.');if(!SIM.skipping)log(`${firstName(p)} can't`,`"Sorry, I checked — I can't make it."`)}return}
 if(f.type==='planNoShowTalk'){const plan=S.plans?.find(x=>x.id===f.payload.planId),p=plan&&personById(plan.personId);if(!p||SIM.skipping)return;queueEvent({type:'planNoShowTalk',title:`${firstName(p)} is upset`,text:`"I waited for you yesterday. You said you'd come." They want to know what happened.`,participants:[p.id],payload:{planId:plan.id},priority:3,expiresDays:2,choices:[{id:'explain',label:'Explain what happened'},{id:'apologize',label:'Apologize sincerely'},{id:'brush',label:'Brush it off'}]});return}
 if(f.type==='friendAsks'){const p=personById(f.payload.personId);if(!p||SIM.skipping)return;queueEvent({type:'friendAsks',title:`${firstName(p)} asks about ${f.payload.club}`,text:`"So? How did the ${f.payload.club} thing go?" They remembered.`,participants:[p.id],payload:f.payload,priority:2,expiresDays:1,choices:[{id:'share',label:'Tell them honestly'},{id:'brush',label:'Change the subject'}]});return}
 if(f.type==='waitlist'){const t=S.school?.tryouts?.find(x=>x.id===f.payload.tryoutId);if(!t||t.result!=='Waitlisted')return;const th=thread('tryout',`tryout-${t.club}`,`Making the ${t.club}`);if(chance(50)){t.result='Selected from waitlist';const o=S.school.activityOffers.find(x=>x.id===f.payload.offerId)||{name:t.club};activateClub(o);const c=S.school.clubs.find(x=>x.name===t.club&&x.status==='Active');if(c)c.leader=t.coach;threadStep(th,'Made it (waitlist)','A spot opened',{resolve:true});recordOutcome('Club tryout',t.club,'Selected from waitlist','Someone dropped out and you were next.');if(!SIM.skipping)log(`${t.club}: a spot opened!`,`${t.coach} calls: someone dropped out, and you were first on the list.`,true)}else{t.result='Not selected';t.nextDate=nextSchoolDay(addDays(currentDate(),21));threadStep(th,'No spot opened','Try again next time');if(!SIM.skipping)log(`${t.club}: no spot this time`,`The waitlist did not move. ${t.coach} says to try again on ${formatDate(t.nextDate)}.`)}return}
 if(f.type==='electionResult'){const el=S.elections?.find(x=>x.id===f.payload.electionId);if(el&&el.status==='Campaign')decideElection(el);return}
 if(f.type==='promiseCheck'){const el=S.elections?.find(x=>x.id===f.payload.electionId);if(!el||SIM.skipping){addRep('leadership',-2);return}queueEvent({type:'promiseCheck',title:`People remember your promise`,text:`During the campaign you promised ${el.promise}. A classmate asks how it is going.`,payload:{electionId:el.id},priority:3,expiresDays:3,choices:[{id:'work',label:'Push hard to deliver it'},{id:'honest',label:'Admit it is harder than you thought'},{id:'dodge',label:'Dodge the question'}]});return}
 if(f.type==='npcInitiative'){if(!SIM.skipping&&currentMinute()>=420&&currentMinute()<1290&&!atSchool())npcInitiative();return}
 if(f.type==='npcSchool'){if(atSchool())npcSchoolInitiative();return}
 if(f.type==='teammateComment'){const c=clubById(f.payload.clubId);if(!c||c.status!=='Active'||quiet)return;const m=rand(c.members||[])||'A teammate';log(`${m} noticed`,rand([`"Where were you yesterday? ${c.leader} asked about you."`,`${m} mentions ${c.name} felt short-handed without you.`,`"We could have used you at ${c.name}," ${m} says — half joking.`]));return}
 if(f.type==='homeworkNote'){if(quiet){S.family.tension=clamp(S.family.tension+2);return}queueEvent({type:'homeworkTalk',title:`A note about missing homework`,text:`Three assignments are now recorded as missing. ${name} has the teacher's email open on their phone.`,participants:cg?[cg.id]:[],priority:3,expiresDays:1,choices:[{id:'apologize',label:'Apologize and catch up'},{id:'lie',label:'Say it was a mistake'},{id:'argue',label:'Argue'},{id:'explain',label:'Explain what is going on'}]});return}
 if(f.type==='parentTeacherMeeting'){if(quiet){S.family.tension=clamp(S.family.tension+5);if(SIM.summary)SIM.summary.notable.push('Parent–teacher meeting about missing homework');return}queueEvent({type:'ptMeeting',title:'Parent–teacher meeting',text:`Six missing assignments. ${name} and your teachers sit across the table from you. Everyone is waiting for you to say something.`,participants:cg?[cg.id]:[],priority:5,expiresDays:1,choices:[{id:'plan',label:'Commit to a homework plan'},{id:'promise',label:'Promise to do better'},{id:'blame',label:'Blame the teachers'},{id:'silent',label:'Stay quiet'}]});return}
}

// ---------- Lifecycle event choices ----------
function handleLifecycleEventChoice(e,id,label){
 const un=uniEventChoice(e,id);if(un)return un;const rs=rstEventChoice(e,id);if(rs)return rs;const lq=lmpqEventChoice(e,id);if(lq)return lq;const kx=knxEventChoice(e,id);if(kx)return kx;const w=worldEventChoice(e,id);if(w)return w;const hj=hijEventChoice(e,id);if(hj)return hj;
 if(e.type==='newPhone')return handlePhoneChoice(e,id);
 if(e.type==='invitation'&&e.payload?.planId)return handlePlanInvite(e,id);
 if(e.type==='electionLost')return handleElectionLost(e,id);
 if(e.type==='electionOffer')return handleElectionOffer(e,id);
 if(e.type==='planNoShowTalk'){const p=personById(e.participants?.[0]);if(!p)return true;let story;if(id==='explain'){const ok=chance(50+(p.trust-50)*.6);p.rel=clamp(p.rel+(ok?4:1));p.conflict=clamp(p.conflict-(ok?6:2));story=ok?`${firstName(p)} listens. "Okay. Just tell me next time." It is going to be fine.`:`${firstName(p)} does not quite buy it, but at least you talked.`}else if(id==='apologize'){p.rel=clamp(p.rel+5);p.trust=clamp(p.trust+2);p.conflict=clamp(p.conflict-8);story=`You do not make excuses. ${firstName(p)} softens. "Thanks for saying that."`}else{p.rel=clamp(p.rel-4);p.conflict=clamp(p.conflict+6);story=`"It's not a big deal," you say. To ${firstName(p)}, it clearly was.`}rememberPerson(p,story,2);log(e.title,story);return true}
 if(e.type==='friendAsks'){const p=personById(e.participants?.[0]);if(!p)return true;const good=(e.payload?.place??-2)>=0;if(id==='share'){p.rel=clamp(p.rel+3);p.trust=clamp(p.trust+3);log(`Told ${firstName(p)}`,good?`${firstName(p)} is genuinely happy for you. "I knew you'd get in!"`:`You admit you did not make it. ${firstName(p)} says, "Their loss. Next time — I'll practice with you."`)}else{p.rel=clamp(p.rel-1);log('Changed the subject',`${firstName(p)} lets it go, a little confused.`)}rememberPerson(p,`Asked how your ${e.payload?.club} ${good?'success':'tryout'} went.`);return true}
 if(e.type==='promiseCheck'){const el=S.elections?.find(x=>x.id===e.payload?.electionId);let story;if(id==='work'){advanceTime(120,{silent:true});const ok=chance(45+ensureRep().leadership*.4);addRep('leadership',ok?6:2);story=ok?`After weeks of meetings, ${el?.promise||'your promise'} actually happens. People notice.`:'You push hard, but the school says no for now. People respect that you tried.'}else if(id==='honest'){addRep('leadership',1);addRep('kindness',1);story='You explain what is realistic. Most people appreciate the honesty.'}else{addRep('leadership',-5);addRep('social',-2);story='You change the subject. Word gets around that you made empty promises.'}if(el)recordOutcome('Election',`Promise: ${el.promise}`,id==='work'?'Worked on it':id==='honest'?'Honest update':'Dodged',story);log('Campaign promise',story);return true}
 const cg=personById(e.participants?.[0])||caregiverPerson(),name=cg?firstName(cg):'Your caregiver',strict=familyRules().strictness;
 if(INVITE_TYPES.includes(e.type)&&/Accept|Go/i.test(label)&&atSchool()){const p=personById(e.participants?.[0]);if(p){p.rel=clamp(p.rel+1);rememberPerson(p,'You agreed to meet after school.')}log('After school, then',`You are in school until ${timeLabel(SCHOOL_DAY.end)}, so you tell ${p?firstName(p):'them'} you will catch up after.`);return true}
 if(INVITE_TYPES.includes(e.type)&&/Accept|Go/i.test(label)&&S.age<16&&(currentMinute()<360||currentMinute()>=1290)){log('Too late',`It is ${timeLabel(currentMinute())}. Your caregivers are not letting you go out now.`);return true}
 if(INVITE_TYPES.includes(e.type)&&/Accept|Go/i.test(label)&&isGrounded()){const p=personById(e.participants?.[0]);if(p){p.rel=clamp(p.rel-1);rememberPerson(p,'You had to cancel because you were grounded.')}log('Grounded',`You want to go, but you are grounded until ${formatDate(S.family.restrictions.groundedUntil)}. You tell ${p?firstName(p):'them'} you cannot make it.`);return true}
 if(e.type==='missedExam'){
  const exam=S.exams.find(x=>x.id===e.payload?.examId),sub=examSubject(exam),t=ensureTeacher(sub);if(!exam||!t){log('Missed assessment','The moment passes.');return true}
  const mod=t.style==='Warm'?15:t.style==='Strict'?-15:0,rep=(S.school?.record?.examsMissed||1)-1,rel=t.rel;let story;
  if(id==='honest'){t.rel=clamp(t.rel+2);if(chance(clamp(30+rel*.45+mod-rep*8,5,92))){const mk=scheduleMakeupExam(exam);story=`You tell ${t.name} what actually happened. They are quiet for a moment, then nod. "Thank you for being straight with me. Make-up is ${formatDate(mk?.dateISO||currentDate())} after school."`}else story=`${t.name} appreciates the honesty, but the zero stands. "Next time, tell me before — not after."`}
  else if(id==='sick'){const real=!!S.healthState?.illness;if(real||chance(clamp(55+rel*.2+mod-rep*12,5,85))){const mk=scheduleMakeupExam(exam);if(!real)S.flags.examLies=(S.flags.examLies||0)+1;story=`${t.name} believes you${real?'':', though you feel a small twist of guilt'}. A make-up is set for ${formatDate(mk?.dateISO||currentDate())}.`}else{t.rel=clamp(t.rel-10);S.school.behavior=clamp(S.school.behavior-6);if(S.age<18)scheduleFollowUp('missedExamParent',{examId:exam.id},{minute:Math.min(1439,currentMinute()+180)});story=`${t.name} checks the attendance office. There is no sick note. "I would rather you had just told me the truth." The zero stays, and they will be contacting home.`}}
  else if(id==='makeup'){if(chance(clamp(20+rel*.5+mod-rep*10,5,85))){const mk=scheduleMakeupExam(exam);story=`${t.name} sighs, then opens their planner. "One chance. ${formatDate(mk?.dateISO||currentDate())}, after school."`}else{t.rel=clamp(t.rel-1);story=`${t.name} says no. "The date was on the board for weeks." You leave with the zero still on your record.`}}
  else{t.rel=clamp(t.rel-3);if(S.age<18&&chance(60))scheduleFollowUp('missedExamParent',{examId:exam.id},{days:1,minute:1080});story=`You say nothing. ${t.name} notices you avoiding eye contact for the rest of the week.`}
  log(`${exam.subject}: ${label}`,story);return true
 }
 if(['absenceTalk','examTalk','homeworkTalk','cheatTalk'].includes(e.type)){
  const n=e.payload?.count||S.school?.record?.absences||1,heavy=e.type==='cheatTalk'||n>=5;let story;
  if(id==='apologize'){S.family.tension=clamp(S.family.tension+(heavy?3:1));if(cg){cg.trust=clamp(cg.trust+1)}if(heavy){ground(3,'School problems');story=`You apologize. ${name} accepts it, but you are grounded for three days anyway. "Actions, not words."`}else story=`You apologize. ${name} lets out a breath. "Okay. Don't make me hear about this again."`}
  else if(id==='lie'){if(chance(clamp(55-n*8-(strict-50)*.3,5,80))){S.flags.liesToParents=(S.flags.liesToParents||0)+1;story=`${name} seems to believe you. It worked — this time.`}else{S.family.tension=clamp(S.family.tension+8);S.family.closeness=clamp(S.family.closeness-4);if(cg)cg.trust=clamp(cg.trust-8);ground(5,'Lying about school');story=`${name} already talked to the school. The lie makes everything worse: five days grounded, and a lot less trust.`}}
  else if(id==='argue'){S.family.tension=clamp(S.family.tension+6);S.family.closeness=clamp(S.family.closeness-3);if(strict>65||heavy)ground(4,'Arguing about school');story=`It turns into a real argument. Doors are closed a little too hard.${strict>65||heavy?' You end up grounded.':''}`}
  else{S.family.tension=clamp(S.family.tension+1);S.family.closeness=clamp(S.family.closeness+2);S.stress=clamp(S.stress-3);if(cg)cg.trust=clamp(cg.trust+3);story=`You tell ${name} what was really going on. It is uncomfortable, but they listen, and the conversation ends with a plan instead of a punishment.`}
  if(cg)rememberPerson(cg,`A conversation about school: ${label.toLowerCase()}.`,2);log(e.title,story);return true
 }
 if(e.type==='ptMeeting'){
  let story;const subs=(S.school?.subjects||[]).filter(s=>s.homework?.status==='Missing'||(s.homeworkHistory||[]).some(h=>h.status==='Missing'));
  if(id==='plan'){S.family.tension=clamp(S.family.tension+1);S.family.responsibility=clamp((S.family.responsibility||0)+4);subs.forEach(s=>ensureTeacher(s).rel=clamp(s.teacher.rel+3));if(S.school)S.school.record.missingHomework=Math.max(0,S.school.record.missingHomework-2);story='You agree to a written homework plan: a set time every school day, checked weekly. The teachers seem genuinely relieved.'}
  else if(id==='promise'){S.family.tension=clamp(S.family.tension+3);story='"I\'ll do better." Everyone has heard that before. They will be watching.'}
  else if(id==='blame'){S.family.tension=clamp(S.family.tension+5);subs.forEach(s=>ensureTeacher(s).rel=clamp(s.teacher.rel-4));ground(5,'Parent–teacher meeting');story='You blame the teachers. The room goes cold. You leave grounded for five days.'}
  else{S.family.tension=clamp(S.family.tension+4);story='You stay quiet while the adults talk about you as if you are not there. It is the longest half hour of the year.'}
  log('Parent–teacher meeting',story,true);return true
 }
 if(e.type==='clubWarning'){
  const c=clubById(e.payload?.clubId);if(!c)return true;let story;
  if(id==='commit'){c.leaderRel=clamp(c.leaderRel+4);story=`${c.leader} nods. "Good. Show me."`}
  else if(id==='explain'){c.leaderRel=clamp(c.leaderRel+2);story=S.stress>60?`You explain how much is going on. ${c.leader} softens: "Tell me ahead of time when you can't make it. That's all I ask."`:`${c.leader} listens. "Fair enough. Just keep me in the loop."`}
  else{c.leaderRel=clamp(c.leaderRel-5);c.warnings=2;story=`${c.leader}'s expression flattens. "Then I'll plan without you." One more slip and you are off the roster.`}
  log(`${c.name}: ${label}`,story);return true
 }
 return false
}

// ---------- Current context (hero) lifecycle ----------
function setCurrentContext(ctx){S.current=Object.assign({id:uid('ctx'),sourceType:'general',sourceId:null,createdAt:{dateISO:currentDate(),minute:currentMinute()},expiresAt:endOfDay(),priority:1,title:'',text:'',actions:[]},ctx);return S.current}
function offerContext(ctx){const cur=S.current;if(!contextIsActive(cur)||(ctx.priority??1)>=(cur.priority??0))setCurrentContext(ctx)}
function contextIsActive(c){
 if(!c||!c.title||!c.createdAt)return false;if(c.expiresAt&&nowStamp()>stampOf(c.expiresAt))return false;
 if(c.sourceType==='exam'){const e=S.exams.find(x=>x.id===c.sourceId);return examIsOpen(e)&&e.dateISO===currentDate()&&currentMinute()<=e.graceMinute}
 if(c.sourceType==='event'){const e=S.events.find(x=>x.id===c.sourceId);return !!e&&e.status==='Open'&&!eventExpired(e)}
 if(c.sourceType==='calendar'){const e=S.calendar.find(x=>x.id===c.sourceId);return !!e&&!isTerminal(e.status)&&e.dateISO===currentDate()&&currentMinute()<=e.graceMinute}
 if(c.sourceType==='schoolSession'){const p=periodAt();return atSchool()&&!!p&&c.title.includes(p.kind==='lunch'?'Lunch':p.subject)}
 if(c.sourceType==='schoolDay'){const e=schoolDayEvent();return !!e&&!isTerminal(e.status)&&e.status!=='Attending'&&currentMinute()<=SCHOOL_DAY.cutoff}
 if(c.sourceType==='daily')return false;
 if(c.sourceType==='scene')return !!S.scene;
 if(c.sourceType==='holiday'){const x=holidayWindow().find(w=>w.h.id===c.sourceId);return !!x&&availableActivities(x).length>0&&x.days<=0}
 return true
}
function examContext(exam){return {sourceType:'exam',sourceId:exam.id,priority:5,title:`${exam.subject.toUpperCase()} ${exam.type.toUpperCase()}`,text:currentMinute()<exam.minute?`Today at ${timeLabel(exam.minute)}. Preparation, sleep and stress will all matter.`:currentMinute()<=exam.endMinute?'The assessment is happening right now.':`It started at ${timeLabel(exam.minute)}. You can still sit it late until ${timeLabel(exam.graceMinute)}, with less time.`,expiresAt:{dateISO:exam.dateISO,minute:exam.graceMinute}}}
function calendarContext(ev){if(['tryout','plan'].includes(ev.type))return {sourceType:'calendar',sourceId:ev.id,priority:ev.type==='tryout'?4:3,title:ev.title,text:ev.type==='tryout'?`${timeLabel(ev.startMinute)} • check in by ${timeLabel(ev.graceMinute)}.`:`${timeLabel(ev.startMinute)} at ${ev.location}. Arrive by ${timeLabel(ev.graceMinute)}.`,expiresAt:{dateISO:ev.dateISO,minute:ev.graceMinute}};const c=ev.type==='clubSession'?clubById(ev.payload?.clubId):contestById(ev.payload?.contestId);return {sourceType:'calendar',sourceId:ev.id,priority:ev.type==='schoolEvent'?4:3,title:ev.title,text:ev.type==='clubSession'?`${timeLabel(ev.startMinute)}–${timeLabel(ev.endMinute)} with ${ensureClub(c||{name:'the club'}).leader||'the club'}. You can still arrive until ${timeLabel(ev.graceMinute)}.`:`Check-in ${timeLabel(ev.startMinute)}–${timeLabel(ev.graceMinute)}. Preparation ${Math.round(c?.prep||0)}%.`,expiresAt:{dateISO:ev.dateISO,minute:ev.graceMinute}}}
function partOfDay(m=currentMinute()){return m<300?'Late night':m<720?'Morning':m<1020?'Afternoon':m<1260?'Evening':'Night'}
function computeNextContext(){
 const today=currentDate(),m=currentMinute();
 if(S.scene)return {sourceType:'scene',sourceId:S.scene.id,priority:6,title:S.scene.kind==='prom'?'Prom night is still going':'Your date is still going',text:'You stepped away for a moment.',expiresAt:null};
 const exam=S.exams.filter(e=>examIsOpen(e)&&e.dateISO===today&&m<=e.graceMinute).sort((a,b)=>a.minute-b.minute)[0];if(exam)return examContext(exam);
 const live=sessionEvent();if(live&&m<SCHOOL_DAY.end){const p=periodAt(m),{contests}=dueAtSchoolNow();if(contests.length)return calendarContext(contests[0]);return {sourceType:'schoolSession',sourceId:live.id,priority:4,title:p?(p.kind==='lunch'?'Lunch break':`${p.label} • ${p.subject}`):'At school',text:p?(p.kind==='lunch'?'Eat, see friends, study in the library or visit a teacher.':`${ensureTeacher(S.school.subjects.find(s=>s.name===p.subject))?.name||'Class'} until ${timeLabel(p.end)}. How do you spend it?`):'Between classes.',expiresAt:{dateISO:today,minute:SCHOOL_DAY.end}}}
 const due=S.calendar.filter(ev=>!isTerminal(ev.status)&&ev.dateISO===today&&['clubSession','schoolEvent','tryout','plan'].includes(ev.type)&&m>=ev.startMinute-90&&m<=ev.graceMinute).sort((a,b)=>b.importance-a.importance)[0];if(due)return calendarContext(due);
 const e=(S.events||[]).filter(x=>x.status==='Open'&&!eventExpired(x)).sort((a,b)=>(b.priority||3)-(a.priority||3))[0];if(e)return {sourceType:'event',sourceId:e.id,priority:e.priority||3,title:e.title,text:e.text,expiresAt:e.expiresAt};
 const sd=schoolDayEvent();if(sd&&!isTerminal(sd.status)&&sd.status!=='Attending'&&m<=SCHOOL_DAY.cutoff&&m>=300)return {sourceType:'schoolDay',sourceId:sd.id,priority:2,title:m<=SCHOOL_DAY.tardyAfter?'School day':'You are late for school',text:m<SCHOOL_DAY.start?`Classes start at ${timeLabel(SCHOOL_DAY.start)}. The attendance cutoff is ${timeLabel(SCHOOL_DAY.cutoff)}.`:m<=SCHOOL_DAY.tardyAfter?'The bell is about to ring.':`You can still go and be marked tardy until ${timeLabel(SCHOOL_DAY.cutoff)}.`,expiresAt:{dateISO:today,minute:SCHOOL_DAY.cutoff}};
 const hol=holidaysOn(today).find(x=>availableActivities(Object.assign({},x,{days:-(x.day-1)})).length);if(hol&&m>=420&&m<1320)return {sourceType:'holiday',sourceId:hol.h.id,priority:1,title:`${hol.h.icon} ${hol.h.name}`,text:hol.day>1?`Day ${hol.day}. There is still time to celebrate.`:'Celebrate however feels right — nothing is required.',expiresAt:endOfDay()};
 const next=todayAgenda().find(a=>!a.done&&a.minute>=m);
 const vacation=S.school&&!isSchoolDay(today)&&!isWeekend(today)?' • school break':'';
 return {sourceType:'daily',sourceId:null,priority:0,title:`${weekday()} ${partOfDay(m).toLowerCase()}${vacation}`,text:next?`Nothing urgent right now. Next: ${next.title} at ${timeLabel(next.minute)}.`:m>=1200?'The day is winding down. Sleep will carry you into tomorrow.':'Nothing else is scheduled today. Your time is your own.',expiresAt:null}
}
function clearCurrentContextIfSourceResolved(){
 if(!S)return;const cur=S.current,active=contextIsActive(cur),next=computeNextContext();
 if(!active||cur.sourceType==='daily'||(next.priority>(cur.priority??0)&&!(next.sourceType===cur.sourceType&&next.sourceId===cur.sourceId)))setCurrentContext(next)
}

// ---------- Today agenda ----------
function todayAgenda(dateISO=currentDate()){
 const items=[];
 for(const ev of S.calendar.filter(e=>e.dateISO===dateISO)){const d=obDef(ev.type);items.push({id:ev.id,type:ev.type,icon:d.icon,minute:ev.startMinute??ev.minute??0,title:ev.type==='schoolDay'?'School':ev.title,status:ev.status,done:isTerminal(ev.status),required:ev.required})}
 if(needsFormalSchool())for(const s of S.school.subjects){const hw=s.homework;if(hw&&HW_OPEN.includes(hw.status)&&hw.dueDate===dateISO)items.push({id:hw.id,type:'homework',icon:'📒',minute:480,title:`${s.name} homework due`,status:`${hw.progress||0}% done`,done:false,required:true})}
 for(const p of S.pendingDecisions.filter(x=>!x.resolved&&x.resolveDate===dateISO))items.push({id:p.id,type:'decision',icon:'⏳',minute:1080,title:p.title,status:p.status,done:false})
 for(const x of holidaysOn(dateISO))items.push({id:'hol-'+x.h.id,type:'holiday',icon:x.h.icon,minute:0,title:x.h.name,status:'',done:false});
 if(sameMonthDay(S.dob,dateISO))items.push({id:'bday',type:'birthday',icon:'🎂',minute:0,title:'Your birthday',status:'',done:false});
 return items.sort((a,b)=>a.minute-b.minute)
}

// ---------- Reconciliation ----------
function reconcileState(reason='tick'){
 if(!S)return;ensureLifecycleContainers();
 reconcileSchoolStage();reconcileEducationHistory();socialReconcile();
 for(const p of S.pendingDecisions){normalizePending(p);pendingLifecycleCheck(p)}
 if(needsFormalSchool()){ensureSchoolRecord();ensureSchoolDayObligation(currentDate())}
 reconcileExams();reconcileCalendar();expireEvents();reconcileNotifications();reconcileOffers();archiveOldRecords();clearCurrentContextIfSourceResolved()
}
function compactExam(e){return {id:e.id,subject:e.subject,type:e.type,dateISO:e.dateISO,minute:e.minute,status:e.status,score:e.score,reason:e.reason||null,makeupOf:e.makeupOf||null,makeupId:e.makeupId||null,replacedBy:e.replacedBy||null}}
function closeSchoolYear(old,{leaving=false}={}){
 if(!old)return;awardsCeremony(old);const rec=old.record||null;
 for(const exam of S.exams||[]){if(examIsOpen(exam)){exam.status='Cancelled';exam.reason=leaving?'Left school':'School year ended';for(const ev of examCalendarEvents(exam))setCalendarStatus(ev,'Cancelled',exam.reason)}}
 S.archive.exams.unshift(...(S.exams||[]).map(compactExam));if(S.archive.exams.length>150)S.archive.exams.length=150;S.exams=[];
 for(const ev of S.calendar)if(['schoolDay'].includes(ev.type)&&!isTerminal(ev.status)&&ev.dateISO>currentDate())setCalendarStatus(ev,'Cancelled','School year ended');
 if(old.grade==='Kindergarten'&&S.development?.kindergarten)S.development.kindergarten.schoolName=old.name;
 if(rec||old.grade==='Kindergarten')S.schoolHistory.unshift({grade:old.grade,school:old.name,endedDate:currentDate(),average:Math.round(old.subjects?.reduce((a,s)=>a+safeNum(s.score,0),0)/Math.max(1,old.subjects?.length||1)),attendance:Math.round(old.attendance||0),record:rec});
 if(S.schoolHistory.length>20)S.schoolHistory.length=20
}
function reconcileExams(){
 S.exams=Array.isArray(S.exams)?S.exams:[];S.exams.forEach(normalizeExam);
 if(!needsFormalSchool()){for(const exam of S.exams)if(examIsOpen(exam)){exam.status='Cancelled';exam.reason='Not enrolled in formal school'}}
 for(const exam of S.exams){
  if(!examIsOpen(exam))continue;
  if(exam.dateISO<currentDate()||(exam.dateISO===currentDate()&&currentMinute()>exam.graceMinute)){
   if(SIM.skipping)performExam(exam,{simulated:true});else finalizeExam(exam.id,{status:'Missed',reason:'Assessment window passed',simulated:true});continue
  }
  if(exam.status==='Due'&&stamp(exam.dateISO,exam.minute)>nowStamp())exam.status='Scheduled';
  if(exam.status==='In progress'&&!examCalendarEvents(exam).some(e=>e.status==='Attending'))exam.status=exam.dateISO===currentDate()?'Due':'Scheduled';
  if(!isSchoolDay(exam.dateISO)&&!exam.makeupOf){const d=nextSchoolDay(exam.dateISO);if(d!==exam.dateISO){exam.dateISO=d;exam.days=daysBetween(currentDate(),d)}}
 }
 if(S.school){spreadExamDates();syncExamCalendar()}else for(const exam of S.exams)for(const ev of examCalendarEvents(exam)){const t=calStatusForExam(exam);if(t&&ev.status!==t)setCalendarStatus(ev,t,'Synced')}
}
function reconcileCalendar(){
 const seen=new Set();S.calendar=(S.calendar||[]).filter(e=>{if(!e||!e.id||seen.has(e.id))return false;seen.add(e.id);return true});
 const allExams=[...(S.exams||[]),...(S.archive?.exams||[])],seenClub=new Set();
 for(const ev of [...S.calendar].sort((a,b)=>a.dateISO.localeCompare(b.dateISO))){
  normalizeCalendarEvent(ev);if(isTerminal(ev.status))continue;
  if(ev.type==='exam'){const exam=allExams.find(x=>x.id===ev.payload?.examId);if(!exam){setCalendarStatus(ev,'Cancelled','Assessment record no longer exists');continue}const t=calStatusForExam(exam);if(t){setCalendarStatus(ev,t,'Synced with assessment record');continue}}
  if(ev.type==='clubSession'){const c=clubById(ev.payload?.clubId);if(!c||c.status!=='Active'){setCalendarStatus(ev,'Cancelled','Club is no longer active');continue}if(seenClub.has(c.id)){setCalendarStatus(ev,'Cancelled','Duplicate session');continue}seenClub.add(c.id)}
  if(ev.type==='schoolEvent'){const c=contestById(ev.payload?.contestId);if(!c||c.status!=='Registered'){setCalendarStatus(ev,c?.status==='Completed'?'Completed':'Cancelled','Contest no longer registered');continue}}
  if(ev.type==='schoolDay'&&!needsFormalSchool()){setCalendarStatus(ev,'Cancelled','Not enrolled');continue}
  if(ev.dateISO<addDays(currentDate(),-1)&&!SIM.skipping){setCalendarStatus(ev,'Expired','Reconciled from an older save');continue}
  if(ev.status==='Due'&&stamp(ev.dateISO,ev.startMinute)>nowStamp())ev.status='Scheduled';
 }
 if(S.school)for(const c of S.school.clubs||[]){if(c.status==='Active'){ensureClub(c);if(!clubSessionEvent(c))scheduleClubSession(c,nextSchoolDay(addDays(currentDate(),c.nextSessionDate&&c.nextSessionDate>currentDate()?daysBetween(currentDate(),c.nextSessionDate):1)))}}
 if(S.school)for(const c of S.school.contests||[])if(c.status==='Registered'&&!contestEvent(c)&&!S.calendar.some(e=>e.type==='schoolEvent'&&e.payload?.contestId===c.id)){if(c.eventDate>=currentDate())createCalendarEvent({id:`contest-${c.id}`,type:'schoolEvent',title:c.name,dateISO:c.eventDate,startMinute:600,endMinute:780,graceMinute:690,payload:{contestId:c.id},source:'school'});else{c.status='No-show';c.result='Did not attend'}}
}
function reconcileNotifications(){
 S.notifications=(S.notifications||[]).map(n=>Object.assign({id:uid('note'),status:n.read?'Read':'Unread',sourceType:null,sourceId:null,tab:null},n));
 for(const n of S.notifications){
  if(!['Unread','Read'].includes(n.status))continue;
  if(n.dateISO&&daysBetween(n.dateISO,currentDate())>10){n.status='Expired';continue}
  if(!n.sourceId&&/Exam today|Club session|Assessment today/.test(n.title)&&n.dateISO<currentDate()){n.status='Expired';continue}
  if(n.sourceType==='exam'){const e=S.exams.find(x=>x.id===n.sourceId);if(!examIsOpen(e))n.status='Resolved'}
  if(['club','contest'].includes(n.sourceType)){const e=S.calendar.find(x=>x.id===n.sourceId);if(!e||isTerminal(e.status))n.status='Resolved'}
 }
}
function reconcileOffers(){
 if(!S.school)return;
 for(const o of S.school.activityOffers||[])if(o.status==='Waiting'&&!S.pendingDecisions.some(p=>!p.resolved&&p.type==='clubApproval'&&p.payload?.offerId===o.id)){const p=S.pendingDecisions.find(p=>p.type==='clubApproval'&&p.payload?.offerId===o.id);o.status=p?.status==='Approved'?'Joined':p?.status==='Denied'?'Denied':'Expired'}
 for(const c of S.school.contests||[])if(c.status==='Waiting'&&!S.pendingDecisions.some(p=>!p.resolved&&p.type==='contestApproval'&&p.payload?.contestId===c.id)){const p=S.pendingDecisions.find(p=>p.type==='contestApproval'&&p.payload?.contestId===c.id);if(!p||!['Approved','Denied'].includes(p.status)){c.status='Registration Closed';c.closedDate=c.closedDate||currentDate()}}
 for(const c of S.school.clubs||[])if(c.status==='Active')ensureClub(c)
}
function archiveOldRecords(){
 const cutoff=addDays(currentDate(),-30),calCut=addDays(currentDate(),-21);
 const old=S.pendingDecisions.filter(p=>p.resolved&&(p.resolvedDate||p.createdDate||'0')<cutoff);if(old.length){S.archive.pending.unshift(...old);S.pendingDecisions=S.pendingDecisions.filter(p=>!old.includes(p));if(S.archive.pending.length>150)S.archive.pending.length=150}
 const oldCal=S.calendar.filter(e=>isTerminal(e.status)&&e.dateISO<calCut);if(oldCal.length){S.archive.calendar.unshift(...oldCal.filter(e=>e.type!=='schoolDay').map(e=>({id:e.id,type:e.type,title:e.title,dateISO:e.dateISO,status:e.status,attendanceStatus:e.attendanceStatus,resolutionReason:e.resolutionReason})));if(S.archive.calendar.length>300)S.archive.calendar.length=300;S.calendar=S.calendar.filter(e=>!oldCal.includes(e))}
 if(S.exams.length>40){const done=S.exams.filter(e=>!examIsOpen(e)).sort((a,b)=>a.dateISO.localeCompare(b.dateISO));const move=done.slice(0,S.exams.length-40);S.archive.exams.unshift(...move.map(compactExam));S.exams=S.exams.filter(e=>!move.includes(e));if(S.archive.exams.length>150)S.archive.exams.length=150}
 S.notifications=(S.notifications||[]).filter(n=>['Unread','Read'].includes(n.status)||daysBetween(n.resolvedDate||n.dateISO||currentDate(),currentDate())<=14)
}

// ---------- Sleep, bedtime and Next Day ----------
function bedtimeMinute(){const a=S.age;return a<4?1170:a<6?1200:a<10?1230:a<13?1260:a<16?1320:a<18?1350:1380}
function sleepNeedHours(){const a=S.age;return a<=1?13:a<=4?11.5:a<=12?10:a<=17?8.75:7.75}
function wakeMinuteFor(dateISO){if(needsFormalSchool()&&isSchoolDay(dateISO))return 390;if(S.school?.grade==='Kindergarten'&&isSchoolDay(dateISO))return 420;if(S.career?.job&&!S.career.retired&&!isWeekend(dateISO))return 420;return null}
function checkBedtime(){
 if(S.age>=18||S.age<3)return;const m=currentMinute(),bed=bedtimeMinute(),late=m>=bed+30||m<300;if(!late)return;
 const night=m<300?addDays(currentDate(),-1):currentDate(),key=`bedtime-${night}`;if(S.flags[key])return;S.flags[key]=true;
 const strict=familyRules().strictness,p=clamp(30+strict*.5-(S.age-8)*3,10,88);if(!chance(p))return;
 const cg=caregiverPerson(),name=cg?firstName(cg):'A caregiver';
 if(S.age<13){S.family.tension=clamp(S.family.tension+1);log('Past bedtime',`${name} finds you still awake. "It's way past your bedtime." You get sent to bed${chance(40)?' with a sigh and a glass of water':''}.`)}
 else if(strict>65&&chance(45)){S.family.tension=clamp(S.family.tension+3);log('Caught up late',`${name} sees the light under your door. It turns into an argument about sleep, school and screens.`)}
 else{S.family.tension=clamp(S.family.tension+1);log('Past bedtime',`${name} knocks: "Lights out soon, okay?"`)}
}
function sleepThroughNight(){
 SIM.sleeping=true;
 try{
  const m=currentMinute(),wakeDate=m<300?currentDate():addDays(currentDate(),1),need=sleepNeedHours()*60,alarm=wakeMinuteFor(wakeDate);
  const start=m<300?m:m-1440;let wake=alarm!=null?alarm:Math.max(360,Math.min(600,Math.round(start+need+(Math.random()*50-25))));
  let quality=1,note='slept well',overslept=false;const r=Math.random()*100;
  if(S.stress>65&&r<35){quality=.72;note='restless night'}else if(r<5){quality=.85;note='bad dream'}else if(r<11){quality=.9;note='woke during the night'}
  if(alarm!=null){if(chance((S.needs.sleep<25?14:5)+(S.age>=13&&S.age<18?6:0)+(S.stress>70?4:0))){wake=alarm+30+Math.floor(Math.random()*70);note='overslept';overslept=true}}
  else if(chance(7)){wake=Math.max(330,wake-60-Math.floor(Math.random()*40));note='woke early'}
  if(wake<start+90)wake=start+90;
  const minutes=Math.round(wake-start),hours=minutes/60;
  advanceTime(minutes,{skipNeeds:true,silent:true});
  const ratio=clamp(hours/(need/60),.2,1.15)*quality;
  S.needs.sleep=clamp(20+76*ratio,0,98);S.energy=clamp(15+80*ratio);S.stress=clamp(S.stress-12*ratio);S.healthState.sleep=clamp(S.healthState.sleep+(ratio>=.9?3:-4));
  S.needs.hunger=clamp(S.needs.hunger+hours*1.2);S.needs.toilet=clamp(S.needs.toilet+hours*2.4);S.needs.hygiene=clamp(S.needs.hygiene-hours*.5);S.needs.comfort=clamp(S.needs.comfort+8);S.location='Home';
  const story={'slept well':'You slept through the night.','restless night':'You tossed and turned, thoughts looping.','bad dream':'A strange dream left you uneasy for a few minutes after waking.','woke during the night':'You woke once in the dark and took a while to drift off again.','woke early':'You woke before you needed to and lay there listening to the house.','overslept':`You slept straight through the alarm and woke at ${timeLabel(wake)}.`}[note];
  log('Slept',`${Math.floor(hours)}h ${Math.round((hours%1)*60)}m • ${story}`);
  return {hours,minutes,note,overslept,story,wake}
 }finally{SIM.sleeping=false;clearCurrentContextIfSourceResolved()}
}
function sleepAction(){
 const m=currentMinute(),night=m>=Math.min(1200,bedtimeMinute()-60)||m<300;
 if(!night){basicAction('nap');return}
 const before=snapshotForSummary(),r=sleepThroughNight();showMorningSummary(before,r)
}
function todayWarnings(){
 const w=[],today=currentDate(),m=currentMinute();
 for(const e of S.exams.filter(x=>examIsOpen(x)&&x.dateISO===today&&m<=x.graceMinute))w.push({icon:'📝',text:`You still have a ${e.subject} ${e.type.toLowerCase()} due today (${timeLabel(e.minute)}).`,result:'It will be recorded as missed.'});
 const sd=schoolDayEvent();if(sd&&!isTerminal(sd.status)&&sd.status!=='Attending'&&m<=SCHOOL_DAY.cutoff)w.push({icon:'🏫',text:'You have not gone to school today.',result:'You will be marked absent.'});
 for(const ev of S.calendar.filter(e=>e.dateISO===today&&!isTerminal(e.status)&&['clubSession','schoolEvent','tryout','plan'].includes(e.type)&&m<=e.graceMinute))w.push({icon:obDef(ev.type).icon,text:`${ev.title} at ${timeLabel(ev.startMinute)}.`,result:ev.type==='clubSession'?'It counts as a missed session.':ev.type==='plan'?'They will be waiting for you.':'You will be a no-show.'});
 if(needsFormalSchool())for(const s of S.school.subjects)if(s.homework?.status==='Assigned'&&s.homework.dueDate===today)w.push({icon:'📒',text:`${s.name} homework is due today (${s.homework.progress||0}% done).`,result:'It becomes late.'});
 for(const e of S.events.filter(x=>x.status==='Open'&&x.expiresAt&&x.expiresAt.dateISO<=addDays(today,1)&&INVITE_TYPES.includes(x.type)))w.push({icon:'💬',text:`${e.title} — still waiting for your answer.`,result:'The invitation will expire.'});
 return w
}
function snapshotForSummary(){return {energy:S.energy,stress:S.stress,happiness:S.happiness,sleep:S.needs.sleep,logId:S.log[0]?.id||null,unread:unreadMessages()}}
function nextDay(force=false){
 if(!S)return;const w=todayWarnings();
 if(w.length&&!force){openModal('Before you move on',`<p class="muted-text">Moving to the next day now has consequences:</p><div class="warning-list">${w.map(x=>`<div class="warning-row"><span>${x.icon}</span><div><b>${esc(x.text)}</b><small>${esc(x.result)}</small></div></div>`).join('')}</div><div class="modal-action-grid"><button data-close-modal="1">Return</button><button class="primary" data-next-day-confirm="1">Advance anyway</button></div>`);return}
 performNextDay()
}
function performNextDay(){
 closeChoiceModal();const before=snapshotForSummary(),m=currentMinute(),bed=bedtimeMinute();
 if(m>=300&&m<bed){const hrs=(bed-m)/60;advanceTime(bed-m,{silent:true,skipNeeds:true});S.needs.hunger=clamp(Math.min(S.needs.hunger+hrs*1.5,50));S.needs.hygiene=clamp(S.needs.hygiene-hrs*.8);S.needs.fun=clamp(S.needs.fun-hrs*.4);S.needs.toilet=clamp(Math.min(S.needs.toilet+hrs,40));S.needs.sleep=clamp(S.needs.sleep-hrs*1.4);S.energy=clamp(S.energy-hrs*1.6)}
 const r=sleepThroughNight();showMorningSummary(before,r);save();render()
}
function showMorningSummary(before,r){
 const agenda=todayAgenda().filter(a=>!a.done),delta=(k,a,b)=>{const d=Math.round(a-b);return d?`${k} ${d>0?'+':''}${d}`:''};
 const newLogs=[];for(const l of S.log){if(l.id===before.logId)break;if(l.title!=='Slept')newLogs.push(l);if(newLogs.length>=4)break}
 const unread=unreadMessages(),fromMsg=S.messages.find(x=>!x.read);
 openModal(formatDate(currentDate()).toUpperCase(),`<div class="morning-summary"><p class="summary-lead">You slept <b>${Math.floor(r.hours)}h ${Math.round((r.hours%1)*60)}m</b>. ${esc(r.story)}</p><h4>Overnight</h4><p>${[delta('Energy',S.energy,before.energy),delta('Stress',S.stress,before.stress)].filter(Boolean).map(esc).join(' • ')||'No big changes.'}</p><h4>Today</h4>${agenda.length?agenda.map(a=>`<div class="agenda-row"><span>${a.icon}</span><b>${esc(a.title)}</b><small>${a.type==='homework'||a.type==='birthday'?esc(a.status||''):timeLabel(a.minute)}</small></div>`).join(''):'<p class="muted-text">Nothing scheduled. A free day.</p>'}${r.overslept&&needsFormalSchool()&&isSchoolDay()?'<p class="urgent-text">You overslept — school has already started.</p>':''}${unread?`<h4>Messages</h4><p>${esc(fromMsg?.from||'Someone')} sent you a message${unread>1?` (+${unread-1} more)`:''}.</p>`:''}${newLogs.length?`<h4>While you were busy</h4>${newLogs.map(l=>`<p><b>${esc(l.title)}</b> — ${esc(l.text)}</p>`).join('')}`:''}<div class="modal-action-grid single"><button class="primary" data-close-modal="1">Start the day</button></div></div>`)
}

// ---------- Age Up: simulate a year, then summarize ----------
function freshSummary(){return {school:{days:0,attended:0,absences:0,excused:0,tardies:0,examsCompleted:0,examsMissed:0,examsExcused:0,makeups:0,scores:[],hwOnTime:0,hwLate:0,hwMissing:0},clubs:{},contests:[],notable:[]}}
function yearSnapshot(){return {itemCond:Object.fromEntries(S.inventoryItems.filter(i=>hasCondition(i.lifecycleType)).map(i=>[i.id,i.condition])),money:availableFunds(),rel:Object.fromEntries(S.people.map(p=>[p.id,p.rel])),avg:S.school?schoolAverage():null,items:S.inventoryItems.length,age:S.age,tension:S.family.tension}}
function ageUp(){
 if(!S)return;const target=nextBirthday(),days=daysBetween(currentDate(),target),snap=yearSnapshot();
 SIM.skipping=true;SIM.summary=freshSummary();
 try{advanceTime(days*1440-currentMinute()+420,{skipNeeds:true,silent:true,skipRoutine:true})}finally{SIM.skipping=false}
 const summary=SIM.summary;SIM.summary=null;reconcileState('ageUp');processCalendar();render();save();showYearSummary(snap,summary);toast(`Age ${S.age}!`)
}
function showYearSummary(snap,sum){
 const sc=sum.school,total=sc.attended+sc.absences+sc.excused,att=total?Math.round(100*sc.attended/total):null,avgScore=sc.scores.length?Math.round(sc.scores.reduce((a,b)=>a+b,0)/sc.scores.length):null;
 const school=total||sc.examsCompleted||sc.examsMissed?[att!=null?`Attendance ${att}% (${sc.absences} unexcused absence${sc.absences===1?'':'s'}, ${sc.excused} excused, ${sc.tardies} late)`:'',`${sc.examsCompleted} assessment${sc.examsCompleted===1?'':'s'} completed${avgScore!=null?` • average ${avgScore}%`:''}`,sc.examsMissed?`${sc.examsMissed} assessment${sc.examsMissed===1?'':'s'} missed${sc.makeups?` (${sc.makeups} make-up${sc.makeups===1?'':'s'} granted)`:''}`:'',sc.examsExcused?`${sc.examsExcused} excused`:'',sc.hwOnTime+sc.hwLate+sc.hwMissing?`Homework: ${sc.hwOnTime} on time, ${sc.hwLate} late, ${sc.hwMissing} missing`:''].filter(Boolean):['No formal school this year.'];
 const clubs=Object.values(sum.clubs).map(c=>{const t=c.attended+c.missed;return `${c.name} attendance ${t?Math.round(100*c.attended/t):100}% (${c.attended}/${t} sessions${c.excused?`, ${c.excused} excused`:''})`}).concat(sum.contests.map(c=>`${c.name}: ${c.result}`));
 const changes=S.people.filter(p=>snap.rel[p.id]!=null).map(p=>({p,d:p.rel-snap.rel[p.id]})).filter(x=>Math.abs(x.d)>=3).sort((a,b)=>Math.abs(b.d)-Math.abs(a.d)).slice(0,4).map(x=>`${firstName(x.p)} ${x.d>0?'became closer':'drifted away'} (${x.d>0?'+':''}${Math.round(x.d)})`);
 const newPeople=S.people.filter(p=>snap.rel[p.id]==null).map(p=>`Met ${firstName(p)}`);
 const m=availableFunds()-snap.money,items=S.inventoryItems.length-snap.items,itemNotes=S.inventoryItems.filter(i=>snap.itemCond?.[i.id]!=null).map(i=>{const a=snap.itemCond[i.id],b=i.condition;if(conditionLabel(a)!==conditionLabel(b))return `${i.name} wore down to ${conditionLabel(b).toLowerCase()} (${Math.round(b)}%)`;if(a-b>=8)return `${i.name} condition dropped to ${Math.round(b)}%`;return null}).filter(Boolean).slice(0,4);
 const sec=(t,arr)=>`<section class="summary-section"><h4>${t}</h4>${arr.length?arr.map(x=>`<p>${esc(x)}</p>`).join(''):'<p class="muted-text">Nothing notable.</p>'}</section>`;
 openModal(`Year summary • Age ${S.age}`,`<div class="summary-grid">${sec('School',school)}${sec('Activities',clubs)}${sec('Relationships',[...changes,...newPeople.slice(0,3)])}${sec('Money & items',[`${m>=0?'Saved / gained':'Spent'} ${money(Math.abs(m))}`,items?`${items>0?'+':''}${items} item${Math.abs(items)===1?'':'s'}`:'',...itemNotes].filter(Boolean))}${sum.notable.length?sec('Notable',sum.notable.slice(0,6)):''}</div><div class="modal-action-grid single"><button class="primary" data-close-modal="1">Continue</button></div>`)
}
