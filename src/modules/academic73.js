
// =====================================================================
// v7.3 G — REAL ACADEMIC CALENDAR
// School years start on a fixed date per country, have 2 semesters and real
// breaks. Grades follow an age cutoff (not birthdays). Classes move up on the
// first day of the new school year. Old saves keep their grade until then.
// =====================================================================
const D_=(Y,md)=>`${Y}-${md}`;
const SCHOOL_CAL={
 US:{start:Y=>D_(Y,'08-27'),sem1End:Y=>D_(Y+1,'01-16'),sem2Start:Y=>D_(Y+1,'01-21'),end:Y=>D_(Y+1,'06-12'),cutoff:Y=>D_(Y,'09-01'),breaks:Y=>{const tg=nthWeekday(Y,11,4,4),sb=nthWeekday(Y+1,3,1,2);return [['Thanksgiving break',addDays(tg,-1),addDays(tg,1)],['Winter break',D_(Y,'12-21'),D_(Y+1,'01-02')],['Spring break',sb,addDays(sb,4)]]}},
 CA:{start:Y=>addDays(nthWeekday(Y,9,1,1),1),sem1End:Y=>D_(Y+1,'01-31'),sem2Start:Y=>D_(Y+1,'02-03'),end:Y=>D_(Y+1,'06-27'),cutoff:Y=>D_(Y,'12-31'),breaks:Y=>{const tg=nthWeekday(Y,10,1,2),mb=nthWeekday(Y+1,3,1,3);return [['Thanksgiving',tg,tg],['Winter break',D_(Y,'12-21'),D_(Y+1,'01-04')],['March break',mb,addDays(mb,4)]]}},
 UK:{start:Y=>D_(Y,'09-04'),sem1End:Y=>D_(Y+1,'01-31'),sem2Start:Y=>D_(Y+1,'02-02'),end:Y=>D_(Y+1,'07-19'),cutoff:Y=>D_(Y,'09-01'),breaks:Y=>{const oh=lastWeekday(Y,10,1),fh=nthWeekday(Y+1,2,1,3),e=easterDate(Y+1),mh=lastWeekday(Y+1,5,1);return [['October half-term',oh,addDays(oh,4)],['Christmas holidays',D_(Y,'12-20'),D_(Y+1,'01-03')],['February half-term',fh,addDays(fh,4)],['Easter holidays',addDays(e,-7),addDays(e,7)],['May half-term',mh,addDays(mh,4)]]}},
 FR:{start:Y=>D_(Y,'09-02'),sem1End:Y=>D_(Y+1,'01-24'),sem2Start:Y=>D_(Y+1,'01-27'),end:Y=>D_(Y+1,'07-04'),cutoff:Y=>D_(Y,'12-31'),breaks:Y=>[['Toussaint holidays',D_(Y,'10-19'),D_(Y,'11-03')],['Christmas holidays',D_(Y,'12-21'),D_(Y+1,'01-05')],['Winter holidays',D_(Y+1,'02-15'),D_(Y+1,'03-02')],['Spring holidays',D_(Y+1,'04-12'),D_(Y+1,'04-27')]]},
 VN:{start:Y=>D_(Y,'09-05'),sem1End:Y=>D_(Y+1,'01-10'),sem2Start:Y=>D_(Y+1,'01-13'),end:Y=>D_(Y+1,'05-25'),cutoff:Y=>D_(Y,'12-31'),breaks:Y=>{const t=lunarNewYearDate(Y+1,'VN');return [['New Year holiday',D_(Y+1,'01-01'),D_(Y+1,'01-01')],['Tết holiday',addDays(t,-3),addDays(t,5)],['Reunification & Labour Day',D_(Y+1,'04-30'),D_(Y+1,'05-01')]]}},
 CN:{start:Y=>D_(Y,'09-01'),sem1End:Y=>D_(Y+1,'01-15'),sem2Start:Y=>addDays(lunarNewYearDate(Y+1,'CN'),16),end:Y=>D_(Y+1,'07-05'),cutoff:Y=>D_(Y,'08-31'),breaks:Y=>[['National Day holiday',D_(Y,'10-01'),D_(Y,'10-07')]]},
 KR:{start:Y=>D_(Y,'03-02'),sem1End:Y=>D_(Y,'07-19'),sem2Start:Y=>D_(Y,'08-19'),end:Y=>D_(Y+1,'02-10'),cutoff:Y=>D_(Y-1,'12-31'),breaks:Y=>[['Winter vacation',D_(Y,'12-24'),D_(Y+1,'02-02')]]},
 JP:{start:Y=>D_(Y,'04-07'),sem1End:Y=>D_(Y,'09-30'),sem2Start:Y=>D_(Y,'10-07'),end:Y=>D_(Y+1,'03-20'),cutoff:Y=>D_(Y,'04-01'),breaks:Y=>[['Golden Week',D_(Y,'04-29'),D_(Y,'05-05')],['Summer vacation',D_(Y,'07-20'),D_(Y,'08-31')],['Winter vacation',D_(Y,'12-25'),D_(Y+1,'01-07')]]},
 AU:{start:Y=>D_(Y,'01-30'),sem1End:Y=>D_(Y,'06-27'),sem2Start:Y=>D_(Y,'07-14'),end:Y=>D_(Y,'12-18'),cutoff:Y=>D_(Y,'07-31'),breaks:Y=>[['Term 1 holidays',D_(Y,'04-11'),D_(Y,'04-27')],['Term 3 holidays',D_(Y,'09-20'),D_(Y,'10-06')]]},
 SG:{start:Y=>D_(Y,'01-02'),sem1End:Y=>D_(Y,'05-29'),sem2Start:Y=>D_(Y,'06-29'),end:Y=>D_(Y,'11-14'),cutoff:Y=>D_(Y-1,'12-31'),breaks:Y=>{const t=lunarNewYearDate(Y,'SG');return [['March holidays',D_(Y,'03-14'),D_(Y,'03-22')],['Chinese New Year',t,addDays(t,1)],['September holidays',D_(Y,'09-06'),D_(Y,'09-14')]]}},
 TH:{start:Y=>D_(Y,'05-16'),sem1End:Y=>D_(Y,'09-30'),sem2Start:Y=>D_(Y,'11-01'),end:Y=>D_(Y+1,'03-15'),cutoff:Y=>D_(Y,'05-16'),breaks:Y=>[['New Year holiday',D_(Y,'12-31'),D_(Y+1,'01-02')]]},
 INTL:{start:Y=>D_(Y,'09-01'),sem1End:Y=>D_(Y+1,'01-20'),sem2Start:Y=>D_(Y+1,'01-25'),end:Y=>D_(Y+1,'06-20'),cutoff:Y=>D_(Y,'09-01'),breaks:Y=>[['Winter break',D_(Y,'12-21'),D_(Y+1,'01-03')],['Spring break',D_(Y+1,'04-06'),D_(Y+1,'04-10')]]}
};
const DAY_OFF_HOLIDAYS={newYear:'all',christmas:'all',thanksgiving:['US','CA'],lunarNewYear:['VN','KR','CN','SG']};
function weekdayOnOrBefore(d){let x=d;for(let i=0;i<7&&isWeekend(x);i++)x=addDays(x,-1);return x}
function weekdayOnOrAfter(d){let x=d;for(let i=0;i<7&&isWeekend(x);i++)x=addDays(x,1);return x}
function schoolRegion(){const r=calendarProfile().region;return SCHOOL_CAL[r]?r:'INTL'}
const _acCache={},_sdCache={};
function academicYear(Y){const r=schoolRegion(),k=r+Y;if(_acCache[k])return _acCache[k];const c=SCHOOL_CAL[r];return _acCache[k]={key:Y,region:r,start:weekdayOnOrAfter(c.start(Y)),sem1End:weekdayOnOrBefore(c.sem1End(Y)),sem2Start:weekdayOnOrAfter(c.sem2Start(Y)),end:weekdayOnOrBefore(c.end(Y)),cutoff:c.cutoff(Y),breaks:c.breaks(Y).map(([name,from,to])=>({name,from,to}))}}
function academicInfo(date=currentDate()){let Y=parseISO(date).getUTCFullYear(),a=academicYear(Y);if(date<a.start){Y--;a=academicYear(Y)}const phase=date<=a.sem1End?'sem1':date<a.sem2Start?'semBreak':date<=a.end?'sem2':'summer';return Object.assign({},a,{phase,semester:phase==='sem1'?1:phase==='sem2'?2:null})}
function breakOn(date,a=academicInfo(date)){return a.breaks.find(b=>date>=b.from&&date<=b.to)||null}
function dayOffHoliday(date,region){for(const x of holidaysOn(date)){const r=DAY_OFF_HOLIDAYS[x.h.id];if(r==='all'||(Array.isArray(r)&&r.includes(region)))return x.h.name}return null}
function isSchoolDay(date=currentDate()){const k=schoolRegion()+date;if(k in _sdCache)return _sdCache[k];let v=!isWeekend(date);if(v){const a=academicInfo(date);v=!!a.semester&&!breakOn(date,a)&&!dayOffHoliday(date,a.region)&&!closureReason(date)}if(Object.keys(_sdCache).length>4000)for(const x in _sdCache)delete _sdCache[x];return _sdCache[k]=v}
function noSchoolReason(date=currentDate()){if(isWeekend(date))return 'Weekend';if(closureReason(date))return `School closed (${closureReason(date)})`;const a=academicInfo(date);if(a.phase==='summer')return a.region==='KR'||a.region==='JP'||a.region==='AU'||a.region==='SG'||a.region==='TH'?'Between school years':'Summer break';if(a.phase==='semBreak')return 'Semester break';const b=breakOn(date,a);if(b)return b.name;return dayOffHoliday(date,a.region)||'No school'}
function nextSchoolDay(dateISO){let d=dateISO;for(let i=0;i<200&&!isSchoolDay(d);i++)d=addDays(d,1);return d}
function ageOn(dateISO){const b=parseISO(S.dob),d=parseISO(dateISO);let a=d.getUTCFullYear()-b.getUTCFullYear();if(d.getUTCMonth()<b.getUTCMonth()||(d.getUTCMonth()===b.getUTCMonth()&&d.getUTCDate()<b.getUTCDate()))a--;return a}
function baseGradeFor(Y){return ageOn(academicYear(Y).cutoff)-5}
function gradeForYear(Y){return baseGradeFor(Y)+(S.education?.gradeOffset||0)}
function gradeLabelFor(g){return g<=6?`Grade ${g}`:g<=9?`Middle school • Grade ${g}`:`High school • Grade ${g}`}
function needsFormalSchool(){return !!S.school&&S.school.grade!=='Kindergarten'&&gradeNumber()>=1&&!S.education?.highSchoolDone}
function electionGradeOK(){const g=gradeNumber();return g>=8&&g<=12}
function schoolYearEnd(){return S.school?academicYear(S.school.yearKey??academicInfo().key).end:null}
function semesterEnd(){const a=academicInfo();return a.phase==='sem1'?a.sem1End:a.phase==='sem2'?a.end:null}
function semesterLabel(){const a=academicInfo(),d=currentDate();if(a.phase==='sem1'||a.phase==='sem2'){const end=a.phase==='sem1'?a.sem1End:a.end,nb=a.breaks.filter(b=>b.from>=d&&b.from<=end).sort((x,y)=>x.from.localeCompare(y.from))[0];return `Semester ${a.semester} • ends ${formatDate(end)}${nb?` • next: ${nb.name} (${formatDate(nb.from)})`:''}`}if(a.phase==='semBreak')return `Semester break • Semester 2 starts ${formatDate(a.sem2Start)}`;const nx=academicYear(a.key+1);return `School year over • next year starts ${formatDate(nx.start)}`}
// ---------- Exams per semester ----------
function scheduleSemesterExams(sem){
 if(!needsFormalSchool())return;const a=academicInfo(),start=sem===1?a.start:a.sem2Start,end=sem===1?a.sem1End:a.end,from=addDays(currentDate()>start?currentDate():start,7),to=addDays(end,-10);if(from>=to)return;
 const span=daysBetween(from,to),subs=S.school.subjects.slice(0,6);
 subs.forEach((sub,i)=>{const d=nextSchoolDay(addDays(from,Math.round(span*(i+1)/(subs.length+2))));if(d<=end)addExamRecord({id:uid('exam'),subject:sub.name,dateISO:d,minute:540,type:S.age<=11?'Class assessment':i%2?'Quiz':'Midterm',score:null,status:'Scheduled',prep:0})});
 if(gradeNumber()>=6)subs.slice(0,3).forEach((sub,i)=>{const d=nextSchoolDay(addDays(end,-8+i));if(d<=end&&d>currentDate())addExamRecord({id:uid('exam'),subject:sub.name,dateISO:d,minute:540,type:`Semester ${sem} final`,score:null,status:'Scheduled',prep:0})});
 spreadExamDates();syncExamCalendar()
}
function scheduleExams(){const a=academicInfo();if(a.semester){scheduleSemesterExams(a.semester);if(S.school){S.school.semExams=S.school.semExams||{};S.school.semExams[a.semester]=true}}}
// ---------- Year rollover, report cards, graduation ----------
function graduateHighSchool(){graduationHonors();
 const old=S.school;if(!old)return;closeSchoolYear(old,{leaving:true});recordGraduation('high',old.name);S.education.highSchoolDone=true;S.school=null;
 if(!SIM.skipping){const p=S.people.find(x=>x.role==='parent');log('🎓 High school graduation',`Caps in the air. ${p?`${firstName(p)} cries a little and denies it.`:''} Twelve years of school, done.`,true)}
}
function reportCard(sem){
 const subs=S.school?.subjects||[];if(!subs.length)return null;const avg=Math.round(10*subs.reduce((a,s)=>a+s.score,0)/subs.length)/10,lines=subs.map(s=>`${s.name} ${Math.round(s.score*10)/10}`).join(' • ');
 const parent=S.people.find(x=>x.role==='parent');
 if(avg>=85){if(parent)parent.rel=clamp(parent.rel+2);S.happiness=clamp(S.happiness+3)}else if(avg<60){S.family.tension=clamp(S.family.tension+3);S.stress=clamp(S.stress+3)}
 if(!SIM.skipping)log(`📄 Semester ${sem} report card`,`Average ${avg}. ${lines}. ${avg>=85?`${parent?firstName(parent):'Your family'} puts it on the fridge.`:avg<60?'Your caregivers want to talk about it.':'Solid, with room to grow.'} Behavior ${Math.round(S.school.behavior)}% • attendance ${Math.round(S.school.attendance)}%.`,avg>=90);
 return {avg,dateISO:currentDate()}
}
function ensureSchoolForDate(){
 ensureLifecycleContainers();S.education=Object.assign({graduations:[]},S.education||{});
 if(S.age===3&&!S.development.kindergarten.asked){S.development.kindergarten.asked=true;createPending({type:'kindergarten',title:'Kindergarten decision',resolveDate:null,status:'Waiting for your preference',payload:{preference:null},autoDecideDate:addDays(currentDate(),14),detail:'Your caregivers want to hear whether you want to attend before they decide. If you do not answer, they will decide within two weeks.'});log('Kindergarten becomes a question','Your family starts discussing preschool/kindergarten, childcare, money, schedules and your preferences.')}
 if(S.age<3){S.school=null;return}
 if(S.education.highSchoolDone){if(S.school){closeSchoolYear(S.school,{leaving:true});S.school=null}return}
 const a=academicInfo(),carry=S.school;
 if(carry&&carry.yearKey==null){carry.yearKey=a.key;carry.yearStarted=a.start;if(carry.grade!=='Kindergarten'&&S.education.gradeOffset==null)S.education.gradeOffset=gradeNumber()-baseGradeFor(a.key);return}
 if(carry&&carry.yearKey>=a.key)return;
 const g=gradeForYear(a.key);
 if(g>=13){if(carry&&carry.grade!=='Kindergarten')graduateHighSchool();else{S.school=null;if(S.age>=18)S.education.highSchoolDone=true}return}
 if(g>=1){
  closeSchoolYear(carry);const fromStage=stageOfSchool(carry),toStage=stageForAge(g+5);if(carry&&fromStage&&fromStage!==toStage)recordGraduation(fromStage,carry.name);
  S.school=buildSchool(g+5,carry);if(g===1)maybeGradeOneWatch();S.school.yearKey=a.key;S.school.yearStarted=a.start;S.school.record=freshSchoolRecord();S.school.reports={};S.school.semExams={};
  S.school.clubs.forEach(c=>{ensureClub(c);if(!clubSessionEvent(c))scheduleClubSession(c,nextSchoolDay(addDays(currentDate(),3)))});
  if(a.semester){scheduleExams();if(a.semester===2)S.school.semExams[1]=true}generateHomework(true);ensureProm();
  if(carry&&!SIM.skipping)log(`🎒 New school year • ${S.school.grade}`,`${S.school.name}. ${a.phase==='summer'||a.phase==='semBreak'?'':`Semester ${a.semester||1} starts now.`} New class, new timetable${carry.name!==S.school.name?', new building':''}.`,true);
  meetNewClassmates(chance(60)?2:1,{silent:SIM.skipping});return
 }
 if(carry&&carry.grade==='Kindergarten'){carry.yearKey=a.key;return}
 if(S.development.kindergarten.decision&&S.development.kindergarten.enrolled){S.school=buildSchool(Math.min(5,Math.max(3,S.age)),carry);if(S.school)S.school.yearKey=a.key}else S.school=null
}
function progressSchoolForAge(){ensureSchoolForDate()}
function reconcileSchoolStage(){ensureSchoolForDate();const k=S.development?.kindergarten;if(S.school&&S.school.grade==='Kindergarten'&&!(k?.enrolled))S.school=null}
function academicTick(){
 if(S.age<3)return;const a=academicInfo(),sc=S.school;
 if(needsFormalSchool()&&sc.yearKey===a.key){sc.reports=sc.reports||{};sc.semExams=sc.semExams||{};
  if(!sc.reports[1]&&currentDate()>a.sem1End)sc.reports[1]=reportCard(1);
  if(!sc.reports[2]&&currentDate()>a.end)sc.reports[2]=reportCard(2);
  if(a.semester===2&&!sc.semExams[2]){sc.semExams[2]=true;scheduleSemesterExams(2);if(!SIM.skipping)log('📘 Semester 2 begins',`New semester, new assessments. ${semesterLabel()}.`)}
  if(gradeNumber()===12&&currentDate()>a.end){graduateHighSchool();return}}
 schoolHomeTick();ensureSchoolForDate()
}
// ---------- Calendar markers (planned 2 school years ahead) ----------
function academicMarkers(){
 if(S.age<2||S.education?.highSchoolDone)return [];const cur=academicInfo().key,out=[];
 for(let Y=cur;Y<=cur+2;Y++){const a=academicYear(Y),g=gradeForYear(Y);const kg=g<=0&&S.school?.grade==='Kindergarten';if(!(g>=1&&g<=12)&&!kg)continue;
  const lab=g>=1?gradeLabelFor(g):'Kindergarten';out.push({id:`term-${Y}-start`,dateISO:a.start,title:`First day of school • ${lab}`,icon:'🎒',type:'term'});
  if(g>=1)out.push({id:`term-${Y}-s2`,dateISO:a.sem2Start,title:'Semester 2 begins',icon:'📘',type:'term'});
  for(const b of a.breaks)if(b.from>=a.start&&b.from<=a.end)out.push({id:`brk-${Y}-${b.name}`,dateISO:b.from,title:`${b.name}${b.to!==b.from?` (until ${formatDate(b.to)})`:''}`,icon:'🏖️',type:'term'});
  out.push({id:`term-${Y}-end`,dateISO:a.end,title:g===12?'High school graduation day':'Last day of school',icon:g===12?'🎓':'🏁',type:'term'});
  if(g>=8&&g<=12&&!(S.school?.prom&&S.school.prom.year===Y))out.push({id:`prom-plan-${Y}`,dateISO:promDateFor(Y),title:`${g<=9?'Junior Prom':'Prom'} (planned)`,icon:'💃',type:'term'})}
 return out
}
// ---------- Meeting new people (0–2 at a time) ----------
function peerAgeOK(n){const a=npcAge(n);return S.age<18?(a>=Math.max(4,S.age-2)&&a<=S.age+2&&a<18):a>=18&&Math.abs(a-S.age)<=10}
function freshPeers(k){const known=new Set(S.people.map(p=>p.npcId).filter(Boolean)),pool=(S.npcs||[]).filter(n=>!known.has(n.id)&&peerAgeOK(n)&&!n.movedAway).sort(()=>Math.random()-.5);while(pool.length<k){const made=generateHousehold({kids:1,childAge:S.age<18?S.age+rand([-1,0,1]):S.age+rand([-4,-2,0,2,4])});pool.push(...made.filter(peerAgeOK))}return pool.slice(0,k)}
function meetNewClassmates(k,{silent=false}={}){if(S.age<6)return;for(const n of freshPeers(k)){const p=personFromNpc(n,'friend','classmate');p.rel=40;p.knownSince=S.age;S.people.push(p);if(!silent)rememberPerson(p,'You met on the first day of the school year.')}}
function meetNewPeople(where){
 if(S.age<6||SIM.skipping)return;const r=Math.random(),crowd=S.people.filter(p=>!isFamilyPerson(p)).length,k=r<(crowd>=30?.06:.15)?2:r<(crowd>=30?.3:.55)?1:0;if(!k)return;
 const ns=freshPeers(k),line=ns.map(n=>`${n.fullName} (${npcAge(n)})`).join(' and ');
 queueEvent({type:'meetPeople',title:k===2?'You meet two new people':'You meet someone new',text:`At ${where} you get talking with ${line}.`,payload:{npcIds:ns.map(n=>n.id),where},priority:2,expiresDays:1,choices:[...ns.map(n=>({id:'chat:'+n.id,label:`Chat with ${n.firstName}`})),{id:'hi',label:k===2?'Say hi to both':'Say hi'},{id:'skip',label:'Keep to yourself'}]})
}
function handleMeetPeople(e,id){
 const ids=e.payload?.npcIds||[],where=e.payload?.where||'there';if(id==='skip'){log('Kept to yourself',`You smile politely and keep to yourself at ${where}.`);return true}
 const add=(nid,rel)=>{const n=npcById(nid);if(!n)return null;let p=S.people.find(x=>x.npcId===nid);if(!p){p=personFromNpc(n,'friend',`met at ${where}`);p.rel=rel;p.knownSince=S.age;S.people.push(p)}else p.rel=clamp(p.rel+3);rememberPerson(p,`You met at ${where}.`,2);return p};
 if(id==='hi'){const ps=ids.map(x=>add(x,36)).filter(Boolean);log('New acquaintances',`You say hi to ${ps.map(firstName).join(' and ')}. Maybe you will see them again.`);return true}
 const nid=id.slice(5),p=add(nid,47);if(!p)return true;p.trust=clamp(p.trust+3);advanceTime(30,{silent:true});S.needs.social=clamp(S.needs.social+8);
 const tr=p.traits||[],shared=tr.includes('Funny')?'they make you laugh twice in five minutes':tr.includes('Curious')?'they ask surprisingly good questions':tr.includes('Sporty')?'you end up talking about sports for ages':tr.includes('Artsy')?'they show you a drawing on their phone':'the conversation is easy';
 log(`Met ${firstName(p)}`,`You chat with ${p.name} at ${where} — ${shared}. You leave knowing each other's names, and maybe a bit more.`);return true
}
