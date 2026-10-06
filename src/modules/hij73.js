
// =====================================================================
// v7.3 H + I + J — school–home communication, real weather, fast forward
// =====================================================================

// ---------- I. Climate-aware weather ----------
// Monthly mean temperatures (°C) and wet-season months per climate profile.
const CLIMATES={
 continental:{t:[0,2,6,12,18,23,26,25,21,15,8,2],wet:[],rain:.3,snow:true,storms:[5,6,7,8]},
 cold:{t:[-7,-5,0,7,14,19,22,21,16,9,2,-4],wet:[],rain:.28,snow:true,storms:[6,7,8]},
 oceanic:{t:[5,6,8,10,13,16,18,18,16,12,8,6],wet:[10,11,12,1,2],rain:.42,snow:false,storms:[11,12,1]},
 mediterranean:{t:[14,15,16,17,19,21,24,24,23,20,17,14],wet:[12,1,2],rain:.12,snow:false,storms:[]},
 subtropical:{t:[12,14,18,21,25,28,29,29,27,22,17,13],wet:[5,6,7,8,9],rain:.3,snow:false,storms:[6,7,8,9],hurricane:[8,9]},
 tropical:{t:[27,28,29,30,30,29,29,29,28,28,27,27],wet:[5,6,7,8,9,10],rain:.32,snow:false,storms:[5,6,7,8,9,10],typhoon:[]},
 northVN:{t:[17,18,21,25,28,30,30,29,28,26,22,18],wet:[5,6,7,8,9],rain:.32,snow:false,storms:[6,7,8,9],typhoon:[7,8,9]},
 centralVN:{t:[21,22,24,27,29,30,30,30,28,26,24,21],wet:[9,10,11,12],rain:.3,snow:false,storms:[9,10,11],typhoon:[9,10,11]},
 eastAsia:{t:[-2,1,6,13,18,23,26,27,22,15,7,0],wet:[6,7,8],rain:.28,snow:true,storms:[7,8],typhoon:[8,9]},
 tokyo:{t:[6,7,10,15,19,22,26,27,24,18,13,8],wet:[6,7,9],rain:.32,snow:true,storms:[8,9],typhoon:[8,9,10]},
 shanghai:{t:[5,7,11,16,21,25,29,29,25,19,13,7],wet:[6,7,8],rain:.32,snow:true,storms:[7,8,9],typhoon:[8,9]},
 south:{t:[23,23,22,19,16,14,13,14,16,18,20,22],wet:[2,3,6],rain:.3,snow:false,storms:[12,1,2]}
};
function climateKey(){const p=String(S.place||''),r=calendarProfile().region;
 if(/Los Angeles/i.test(p))return 'mediterranean';if(/Houston|Miami/i.test(p))return 'subtropical';if(/Seattle|Vancouver|London|Manchester|Birmingham|Edinburgh|Cardiff|Paris|Lyon|Toulouse/i.test(p))return 'oceanic';if(/Marseille|Nice/i.test(p))return 'mediterranean';
 if(/Toronto|Montreal|Calgary/i.test(p))return 'cold';if(/Sapporo/i.test(p))return 'cold';if(/Tokyo|Osaka|Kyoto|Fukuoka/i.test(p))return 'tokyo';if(/Shanghai/i.test(p))return 'shanghai';if(/Guangzhou|Shenzhen/i.test(p))return 'northVN';
 if(/Hanoi|Hai Phong/i.test(p))return 'northVN';if(/Hue|Da Nang/i.test(p))return 'centralVN';if(/Chiang Mai/i.test(p))return 'northVN';
 return {VN:'tropical',TH:'tropical',SG:'tropical',KR:'eastAsia',JP:'tokyo',CN:'eastAsia',AU:'south',UK:'oceanic',FR:'oceanic',CA:'cold',US:'continental'}[r]||'continental'}
const SEVERITY={Sunny:0,Cloudy:0,Cool:0,Windy:1,Rainy:1,Hot:1,Cold:1,Snowy:1,Stormy:2,Heatwave:2,Blizzard:3,Typhoon:3,Hurricane:3};
function weatherIcon(t){return ({Sunny:'☀️',Cloudy:'☁️',Rainy:'🌧️',Stormy:'⛈️',Cool:'🧥',Hot:'🥵',Windy:'💨',Cold:'🥶',Snowy:'🌨️',Blizzard:'❄️',Heatwave:'🔥',Typhoon:'🌀',Hurricane:'🌀'})[t]||'🌤️'}
function rollWeather(dateISO,prev){
 const c=CLIMATES[climateKey()],m=parseISO(dateISO).getUTCMonth(),mon=m+1,base=c.t[m]+(Math.random()*8-4),wet=c.wet.includes(mon),pRain=Math.min(.75,c.rain*(wet?1.8:1));
 let type,temp=Math.round(base+(prev&&chance(45)?(prev.temp-base)*.5:0));
 if(chance(pRain*100)){
  if(c.snow&&temp<=1)type=chance(['continental','cold','eastAsia'].includes(climateKey())&&[12,1,2].includes(mon)?4:0)?'Blizzard':'Snowy';
  else if((c.typhoon||[]).includes(mon)&&chance(5))type='Typhoon';
  else if((c.hurricane||[]).includes(mon)&&chance(3))type='Hurricane';
  else type=c.storms.includes(mon)&&chance(28)?'Stormy':'Rainy';
 } else type=temp>=37?(chance(60)?'Heatwave':'Hot'):temp>=32?'Hot':temp<=2?'Cold':temp<=12?'Cool':rand(['Sunny','Sunny','Cloudy','Windy']);
 return {dateISO,type,temp,humidity:Math.round(40+(type==='Rainy'||type==='Stormy'||type==='Typhoon'?35:Math.random()*35)),severity:SEVERITY[type]??0}
}
function setWeather(){
 const today=currentDate(),fc=(S.weather?.forecast||[]).filter(f=>f.dateISO>=today&&f.severity!=null);
 let w=fc.find(f=>f.dateISO===today);if(!w||chance(10))w=rollWeather(today,S.weather);   // forecasts are usually, not always, right
 const rest=[];let prev=w;for(let i=1;i<=5;i++){const d=addDays(today,i),ex=fc.find(f=>f.dateISO===d);const x=ex||rollWeather(d,prev);rest.push(x);prev=x}
 S.weather={type:w.type,temp:w.temp,humidity:w.humidity,severity:w.severity,dateISO:today,forecast:rest};
 if(w.severity>=3)declareClosure(today,w.type);
 if(w.severity===2&&S.age<18)scheduleFollowUp('weatherAsk',{},{minute:400});
}
function weatherForecastHtml(){const w=S.weather;if(!w)return '';return `<div class="wx-now"><span class="wx-icon">${weatherIcon(w.type)}</span><div><b>${esc(w.type)} • ${w.temp}°C</b><small>${w.severity>=3?'Extreme — school closed':w.severity>=2?'Severe weather':esc(weatherAdvice())}</small></div></div><div class="wx-row">${(w.forecast||[]).slice(0,4).map(f=>`<div class="wx-day ${f.severity>=2?'severe':''}"><small>${new Date(f.dateISO+'T00:00:00Z').toLocaleDateString(undefined,{weekday:'short',timeZone:'UTC'})}</small><span>${weatherIcon(f.type)}</span><b>${f.temp}°</b></div>`).join('')}</div>`}
// Universal school closure (everyone, not just you) + rescheduling
function declareClosure(dateISO,why){
 S.closures=S.closures||{};if(S.closures[dateISO])return;
 delete _sdCache[schoolRegion()+dateISO];if(!isSchoolDay(dateISO))return;
 S.closures[dateISO]=why;delete _sdCache[schoolRegion()+dateISO];
 for(const e of S.exams||[])if(examIsOpen(e)&&e.dateISO===dateISO){e.dateISO=nextSchoolDay(addDays(dateISO,1));e.rescheduled=why}
 if(S.exams)syncExamCalendar();
 for(const ev of S.calendar.filter(x=>x.dateISO===dateISO&&!isTerminal(x.status))){
  if(ev.type==='schoolDay')setCalendarStatus(ev,'Cancelled',`School closed (${why})`);
  else if(ev.type==='clubSession'){setCalendarStatus(ev,'Cancelled',`School closed (${why})`);const c=clubById(ev.payload?.clubId);if(c&&c.status==='Active')scheduleClubSession(c,nextClubDate(dateISO))}
  else if(ev.type==='schoolEvent'){const c=contestById(ev.payload?.contestId);const nd=nextSchoolDay(addDays(dateISO,7));ev.dateISO=nd;Object.assign(ev,contestSlot(nd));if(c)c.eventDate=nd}
  else if(ev.type==='tryout'){const t=S.school?.tryouts?.find(x=>x.id===ev.payload?.tryoutId);const nd=nextSchoolDay(addDays(dateISO,2));ev.dateISO=nd;if(t)t.dateISO=nd}
 }
 if(!SIM.skipping){log(`${weatherIcon(why)} School closed today`,`Every school in the area is closed because of the ${why.toLowerCase()}. Assessments and events are moved to later dates.`,true);notify('School closed',`${why} — all schools closed today.`,{sourceType:'closure',sourceId:'closure-'+dateISO,tab:'calendar'})}
}
function closureReason(dateISO){return S.closures?.[dateISO]||null}
// Severe (not extreme) weather on a school day: parents ask
function weatherMorningCheck(){
 if(SIM.skipping||S.age>=18||!needsFormalSchool())return;const w=S.weather;if(!w||w.severity!==2||!isSchoolDay())return;
 const ev=schoolDayEvent();if(ev&&isTerminal(ev.status))return;const cg=caregiverPerson();
 queueEvent({type:'weatherSchool',title:`${w.type} this morning`,text:`It is ${w.type.toLowerCase()} outside. ${cg?firstName(cg):'Your caregiver'} asks: "Do you want to go to school today, or stay home?"`,participants:cg?[cg.id]:[],priority:4,expiresAt:{dateISO:currentDate(),minute:SCHOOL_DAY.cutoff},choices:[{id:'stay',label:'Stay home'},{id:'go',label:'Go anyway'}]})
}
// ---------- H. Lateness with reasons ----------
function lateReasons(){const r=[['overslept','You overslept by twenty minutes.'],['stomach','A stomach ache slowed you down this morning.']];
 if(S.age<16)r.push(['bus','The school bus was late.']);else r.push(['traffic','Traffic was terrible.']);
 if(S.people.some(p=>/sibling/.test(p.role)))r.push(['sibling','You had to help your sibling get ready.']);
 if(needsFormalSchool()&&S.school.subjects.some(s=>s.homework?.status==='Assigned'&&s.homework.dueDate===currentDate()))r.push(['homework','You forgot your homework and ran back home for it.']);
 if((S.weather?.severity||0)>=1)r.push(['weather',`The ${String(S.weather.type).toLowerCase()} made everything slower.`]);return r}
function morningDelay(){
 const sev=S.weather?.severity||0,p=6+(sev>=1?10:0)+(sev>=2?12:0)+(S.needs.sleep<30?8:0);if(!chance(p))return null;
 const [key,text]=rand(lateReasons()),mins=10+Math.floor(Math.random()*35);advanceTime(mins,{silent:true});return {key,text,mins}
}
function recordLateReason(key){const rec=ensureSchoolRecord();rec.lateReasons=rec.lateReasons||{};rec.lateReasons[key]=(rec.lateReasons[key]||0)+1}
// ---------- H. Absence thresholds ----------
function absenceEscalation(n,ev){
 if(S.age>=18)return;const when=ev.dateISO>=currentDate()?{dateISO:ev.dateISO,minute:1050}:{minute:Math.min(1439,currentMinute()+30)};
 if(n===1||n===4||n===7)scheduleFollowUp('absenceNotice',{dateISO:ev.dateISO,count:n},when);
 if(n===10)scheduleFollowUp('teacherCallAbsence',{count:n},when);
 if(n===20)scheduleFollowUp('parentMeeting20',{count:n},{days:1,minute:1080});
 if(n===35)scheduleFollowUp('expulsionWarning',{count:n},{days:1,minute:1020});
 if(n>=45&&!ensureSchoolRecord().expulsionHearing){ensureSchoolRecord().expulsionHearing=true;scheduleFollowUp('expulsionHearing',{count:n},{days:2,minute:960})}
}
function transferSchool(reason){const old=S.school;if(!old)return;const st=stageOfSchool(old),pool=(SCHOOL_NAMES[st]||SCHOOL_NAMES.primary).filter(n=>n!==old.name);old.name=rand(pool)||old.name;old.clubs.forEach(c=>{if(c.status==='Active')c.status='Left'});for(const e of S.calendar)if(e.type==='schoolDay'&&!isTerminal(e.status))e.title=`School • ${old.name}`;ensureSchoolRecord().absences=0;ensureSchoolRecord().expulsionHearing=false;addRep('troublemaker',10);S.family.tension=clamp(S.family.tension+15);log('Transferred to a new school',`${reason} You start over at ${old.name}.`,true)}
// ---------- H. Behavior watch & parent–teacher conferences ----------
function semKey(a=academicInfo()){return `${a.key}-${a.semester||0}`}
function schoolHomeTick(){
 if(!needsFormalSchool()||S.age>=18)return;const a=academicInfo(),sc=S.school;if(!a.semester||sc.yearKey!==a.key)return;
 sc.behaviorCalls=sc.behaviorCalls||{};sc.conf=sc.conf||{};const k=semKey(a);
 if(S.school.behavior<30&&!sc.behaviorCalls[k]){sc.behaviorCalls[k]=currentDate();scheduleFollowUp('behaviorCall',{},{minute:1080})}
 const prevK=a.semester===2?`${a.key}-1`:`${a.key-1}-2`;
 if(sc.behaviorCalls[prevK]&&!sc.behaviorCalls[k+'-meeting']&&S.school.behavior<40&&daysBetween(a.semester===2?a.sem2Start:a.start,currentDate())>=3){sc.behaviorCalls[k+'-meeting']=currentDate();scheduleFollowUp('behaviorMeeting',{},{minute:1110})}
 const semStart=a.semester===1?a.start:a.sem2Start;
 if(!sc.conf[k]&&daysBetween(semStart,currentDate())>=21&&isSchoolDay()){const date=nextSchoolDay(addDays(currentDate(),7));sc.conf[k]={date,choice:null,noticeDate:currentDate()};
  createCalendarEvent({id:`conf-${k}`,type:'conference',title:'Parent–teacher conference',dateISO:date,startMinute:960,endMinute:1080,graceMinute:1080,required:false,location:'School',payload:{key:k},source:'school'});
  if(SIM.skipping){sc.conf[k].choice=chance(80)?'mom':'forgot'}else queueEvent({type:'ptcNotice',title:'A note for your parents',text:`Your teacher hands out notices: parent–teacher conferences are on ${formatDate(date)} at 4:00 PM. What do you do with yours?`,payload:{key:k},priority:3,expiresDays:3,choices:[{id:'mom',label:'Give it to Mom'},{id:'dad',label:'Give it to Dad'},{id:'forget',label:'Leave it in your bag'},{id:'hide',label:'Hide it (you are worried)'}]});
  scheduleFollowUp('conference',{key:k},{dateISO:date,minute:1085})}
}
function conferenceOutcome(k){
 const sc=S.school,c=sc?.conf?.[k];if(!c)return;if(SIM.skipping){const ev=S.calendar.find(e=>e.id===`conf-${k}`);if(ev)setCalendarStatus(ev,'Completed','Conference held');if(schoolAverage()<62||sc.behavior<40)S.family.tension=clamp(S.family.tension+3);return}const avg=schoolAverage(),beh=sc.behavior,good=avg>=75&&beh>=55,bad=avg<62||beh<40,strict=familyRules().strictness;
 const ev=S.calendar.find(e=>e.id===`conf-${k}`);if(ev)setCalendarStatus(ev,'Completed','Conference held');
 const parent=c.choice==='dad'?S.people.find(p=>p.name==='Dad'):S.people.find(p=>p.name==='Mom')||caregiverPerson();const pn=parent?firstName(parent):'Your parent';
 if(c.choice==='mom'||c.choice==='dad'){if(good){if(parent)parent.rel=clamp(parent.rel+3);S.happiness=clamp(S.happiness+3);log('Parent–teacher conference',`${pn} comes home smiling. "Your teacher only had good things to say."`)}else if(bad){S.family.tension=clamp(S.family.tension+4);queueEvent({type:'absenceTalk',title:`${pn} is back from the conference`,text:`Your teacher was honest about your ${avg<62?'grades':'behavior'}. ${pn} wants to talk.`,participants:parent?[parent.id]:[],payload:{count:2},priority:3,expiresDays:1,choices:[{id:'apologize',label:'Apologize'},{id:'explain',label:'Explain what is going on'},{id:'argue',label:'Argue'},{id:'lie',label:'Make excuses'}]})}else log('Parent–teacher conference',`${pn} went. "Room to improve, but your teacher likes you."`);return}
 const caught=chance(c.choice==='hide'?75:60);
 if(!caught){log('Conference day','Nobody from your family showed up. Nobody seems to have noticed… yet.');return}
 if(c.choice==='hide'){S.family.trust=clamp((S.family.trust??60)-10);S.family.tension=clamp(S.family.tension+6);if(bad&&strict>40)ground(3,'Hid the conference notice');log('The teacher called home',`Your teacher called to ask why nobody came to the conference. ${pn} found out you hid the notice. That hurts their trust more than the grades.${bad&&strict>40?' Grounded for three days.':''}`,true)}
 else{S.family.tension=clamp(S.family.tension+2);log('The teacher called home',`Your teacher called about the missed conference. ${pn} sighs: "You have to give us these notes." A new conference time is arranged.`)}
}
// ---------- H. Asking to stay home ----------
function canAskStayHome(when){if(S.age>=18||!needsFormalSchool())return false;const d=when==='today'?currentDate():addDays(currentDate(),1),m=currentMinute();if(!isSchoolDay(d))return false;if(when==='today'){if(m<300||m>510||atSchool())return false;const ev=schoolDayEvent();if(ev&&(isTerminal(ev.status)||ev.status==='Attending'))return false}else if(m<1020)return false;return !(S.school.stayHome||{})[d]}
function askStayHome(when,reason){
 if(!canAskStayHome(when)){toast('Not possible right now.');return}const d=when==='today'?currentDate():addDays(currentDate(),1),cg=caregiverPerson(),cn=cg?firstName(cg):'Your caregiver',r=familyRules(),rec=ensureSchoolRecord();
 rec.stayHomeAsks=(rec.stayHomeAsks||[]).filter(x=>daysBetween(x,currentDate())<=14);const recent=rec.stayHomeAsks.length;rec.stayHomeAsks.push(currentDate());
 const reallySick=S.health<70||!!S.healthState?.illness||S.needs.sleep<25,struggling=S.stress>=65||(S.happiness??60)<35;let ok,story;
 if(reason==='sick'){const dec=morningSickDecision(when),c=condition();ok=dec.ok;
  if(dec.genuine){if(c){c.toldParent=currentDate();c.known=c.known||chance(50)}story=ok?`${cn} feels your forehead and looks at you properly. "Yeah — you're staying home today."`:`${cn} frowns. "It's mild. Try school, and call me if it gets worse."`}
  else if(ok){story=`${cn} looks at you for a long moment. "Fine. Rest, though — no screens all day."`;if(dec.caught)scheduleFollowUp('fakeSickCaught',{},{minute:1080})}
  else{story=`${cn} checks your temperature. "You're fine. Get dressed."`;if(chance(r.strictness*.5)){S.family.trust=clamp((S.family.trust??60)-4);story+=' They clearly know you were faking.'}}}
 else if(reason==='mental'){ok=struggling?chance(clamp(60+(S.family.closeness-50)*.6-recent*10,20,92)):chance(clamp(25-recent*8,3,40));story=ok?`${cn} sits on your bed. "Okay. One day to reset. Then we talk about what's going on."`:`${cn} is gentle but firm: "I hear you. But let's try today, and talk tonight."`;if(ok)S.stress=clamp(S.stress-8)}
 else{ok=chance(clamp(10+(100-r.strictness)*.15-recent*8,2,30));story=ok?`${cn} shrugs. "Just this once."`:`"Nice try," ${cn} says. "Bus leaves in twenty minutes."`;if(!ok)S.family.tension=clamp(S.family.tension+1)}
 S.school.stayHome=S.school.stayHome||{};
 if(ok){S.school.stayHome[d]=reason;const ev=ensureSchoolDayObligation(d);if(ev&&!isTerminal(ev.status))markSchoolAbsence(ev,{excused:true,reason:reason==='sick'?'Sick day (parent approved)':reason==='mental'?'Personal day (parent approved)':'Stayed home (parent approved)'})}
 else S.school.stayHome[d]='denied';
 log(ok?'Staying home':'Asked to stay home',story);
}
// ---------- J. Fast forward ----------
function importantToday(dateISO=currentDate(),major=false){
 const items=[];for(const e of S.exams||[])if(examIsOpen(e)&&e.dateISO===dateISO)items.push(`${e.subject} ${e.type.toLowerCase()}`);
 for(const ev of S.calendar)if(ev.dateISO===dateISO&&!isTerminal(ev.status)&&['schoolEvent','tryout','plan','prom','conference','election'].includes(ev.type))items.push(ev.title);
 if(major){for(const x of holidaysOn(dateISO))if(x.day===1)items.push(x.h.name);for(const m of academicMarkers())if(m.dateISO===dateISO)items.push(m.title);if(sameMonthDay(S.dob,dateISO))items.push('Your birthday')}
 return items
}
function quietNight(shift=0){const m=currentMinute(),bed=bedtimeMinute()+shift;if(m>=300&&m<bed){const hrs=(bed-m)/60;advanceTime(bed-m,{silent:true,skipNeeds:true});S.needs.hunger=clamp(Math.min(S.needs.hunger+hrs*1.5,50));S.needs.hygiene=clamp(S.needs.hygiene-hrs*.8);S.needs.fun=clamp(S.needs.fun-hrs*.4);S.needs.toilet=clamp(Math.min(S.needs.toilet+hrs,40));S.needs.sleep=clamp(S.needs.sleep-hrs*1.4);S.energy=clamp(S.energy-hrs*1.6)}sleepThroughNight()}
function autopilotDay(){
 const sd=schoolDayEvent();if(sd&&!isTerminal(sd.status)&&sd.status!=='Attending'&&currentMinute()<=SCHOOL_DAY.cutoff){attendSchool();if(sessionEvent())skipToDismissal()}
 if(sessionEvent())skipToDismissal();
 {const wd=isCareer()&&workdayEvent();if(wd&&!isTerminal(wd.status)&&currentMinute()<=660)goToWork('normal')}
 for(const ev of S.calendar.filter(e=>e.type==='program'&&e.dateISO===currentDate()&&!isTerminal(e.status)))if(currentMinute()<=ev.graceMinute)attendProgram(ev.id);
 for(const c of (S.school?.clubs||[]).filter(c=>c.status==='Active')){const ev=clubSessionEvent(c);if(ev&&ev.dateISO===currentDate()&&currentMinute()<=ev.graceMinute)attendClubSession(c.id)}
 if(needsFormalSchool())for(const s of S.school.subjects){const hw=s.homework;if(hw&&HW_OPEN.includes(hw.status)&&daysBetween(currentDate(),hw.dueDate)<=1){for(let i=0;i<2&&HW_OPEN.includes(s.homework.status);i++)doHomework(s.name)}}
 routineDay();
 quietNight(routineBedShift())
}
function hijEventChoice(e,id){
 if(e.type==='weatherSchool'){if(id==='stay'){const ev=ensureSchoolDayObligation();if(ev&&!isTerminal(ev.status))markSchoolAbsence(ev,{excused:true,reason:`Bad weather (${S.weather.type}), parent approved`});log('Staying in',`You watch the ${S.weather.type.toLowerCase()} from the window. School logs it as an excused absence.`)}else{S.flags.weatherBrave=currentDate();log('Braving it',`You head out into the ${S.weather.type.toLowerCase()}. It is going to be a long morning.`)}return true}
 if(e.type==='ptcNotice'){const k=e.payload?.key,c=S.school?.conf?.[k];if(!c)return true;c.choice=id==='forget'?'forgot':id;const pn=id==='dad'?'Dad':'Mom';log('Conference notice',{mom:`You give the notice to ${pn}. They put it on the calendar.`,dad:`You give the notice to ${pn}. They put it on the calendar.`,forget:'The notice sinks to the bottom of your bag under three granola bar wrappers.',hide:'You fold the notice into a tiny square and hide it. Your heart beats a little faster.'}[id]);return true}
 if(e.type==='meetingAftermath'||e.type==='expulsionTalk'){const cg=caregiverPerson(),cn=cg?firstName(cg):'Your caregiver';let s;if(id==='apologize'){S.family.tension=clamp(S.family.tension+2);if(cg)cg.trust=clamp(cg.trust+2);s=`You apologize and agree to a plan. ${cn} holds you to it.`}else if(id==='explain'){S.stress=clamp(S.stress-3);if(cg)cg.trust=clamp(cg.trust+4);s=`You explain what has really been going on. ${cn} listens — and arranges help instead of only punishment.`}else{S.family.tension=clamp(S.family.tension+6);ground(5,'School problems');s=`It turns into a fight. You are grounded for five days.`}log(e.title,s);return true}
 return false
}
function hijFollowUp(f){
 const quiet=SIM.skipping,cg=caregiverPerson(),cn=cg?firstName(cg):'Your caregiver';
 if(f.type==='teacherCallAbsence'){if(quiet){S.family.tension=clamp(S.family.tension+4);return true}queueEvent({type:'absenceTalk',title:`Your teacher called ${cn}`,text:`"Ten unexcused absences this year," the teacher said on the phone. ${cn} is waiting for you in the kitchen.`,participants:cg?[cg.id]:[],payload:{count:10},priority:4,expiresDays:1,choices:[{id:'apologize',label:'Apologize'},{id:'explain',label:'Explain what really happened'},{id:'argue',label:'Argue'},{id:'lie',label:'Make up an excuse'}]});return true}
 if(f.type==='parentMeeting20'){if(quiet){S.family.tension=clamp(S.family.tension+8);return true}log('A meeting you were not invited to',`Today ${cn} went to school for a one-on-one meeting with your teacher about 20 unexcused absences. You only find out when they come home very quiet.`,true);queueEvent({type:'meetingAftermath',title:`${cn} met your teacher`,text:'"Twenty days. Twenty. What is going on?"',participants:cg?[cg.id]:[],priority:5,expiresDays:1,choices:[{id:'apologize',label:'Apologize and agree to a plan'},{id:'explain',label:'Tell them what is really going on'},{id:'argue',label:'Get defensive'}]});return true}
 if(f.type==='expulsionWarning'){if(!quiet)log('⚠️ Formal warning from school',`A letter arrives: with 35 unexcused absences you are at risk of expulsion. At 45, the school will hold a hearing.`,true);S.family.tension=clamp(S.family.tension+6);return true}
 if(f.type==='expulsionHearing'){const keep=chance(clamp(40+(S.school?.behavior||50)*.3+(schoolAverage()-60)*.4,10,85));if(keep){S.school.probation=true;if(!quiet)log('Expulsion hearing',`${cn} sits next to you at the hearing. The school decides: final warning and probation. One more slide and you are out.`,true)}else{transferSchool('After the hearing, the school expels you.');if(!quiet)queueEvent({type:'expulsionTalk',title:'Expelled',text:`${cn} drives you home in silence. Tomorrow you start at a new school.`,participants:cg?[cg.id]:[],priority:5,expiresDays:1,choices:[{id:'apologize',label:'Apologize'},{id:'explain',label:'Explain'},{id:'argue',label:'Blame the school'}]})}return true}
 if(f.type==='behaviorCall'){S.family.tension=clamp(S.family.tension+3);if(quiet)return true;queueEvent({type:'absenceTalk',title:`Your teacher called ${cn}`,text:`The teacher said your behavior has been a problem and asked ${cn} to be more involved. ${cn} wants to talk.`,participants:cg?[cg.id]:[],payload:{count:3},priority:4,expiresDays:1,choices:[{id:'apologize',label:'Apologize'},{id:'explain',label:'Explain what is going on'},{id:'argue',label:'Argue'},{id:'lie',label:'Deny it'}]});return true}
 if(f.type==='behaviorMeeting'){S.family.tension=clamp(S.family.tension+5);if(quiet)return true;log('Behavior meeting',`Without telling you, ${cn} met your teacher because your behavior has not improved since the last call. You notice they are watching you more closely.`,true);queueEvent({type:'meetingAftermath',title:`${cn} knows about the meeting`,text:'"We need to fix this together."',participants:cg?[cg.id]:[],priority:4,expiresDays:1,choices:[{id:'apologize',label:'Agree to a plan'},{id:'explain',label:'Explain'},{id:'argue',label:'Get defensive'}]});return true}
 if(f.type==='conference'){conferenceOutcome(f.payload.key);return true}
 return false
}
function hijClick(b){const d=b.dataset;if(d.ff){document.querySelectorAll('[data-routine]').forEach(x=>{routine()[x.dataset.routine]=x.value});fastForward(d.ff);return true}if(d.ffOpen){openFastForward();return true}if(d.stayHome){askStayHome(d.stayHome,d.reason);save();render();return true}return false}
function stayHomeHtml(){const t=canAskStayHome('today'),n=canAskStayHome('tomorrow');if(!t&&!n)return '';const w=t?'today':'tomorrow';return `<div class="stayhome"><small>${t?'Before school':'This evening'} you can ask ${esc(caregiverPerson()?firstName(caregiverPerson()):'a caregiver')} to stay home ${w}:</small><div class="inline-actions"><button class="small ghost" data-stay-home="${w}" data-reason="sick">"I feel sick"</button><button class="small ghost" data-stay-home="${w}" data-reason="mental">"I need a day"</button><button class="small ghost" data-stay-home="${w}" data-reason="none">"I don't want to go"</button></div></div>`}
