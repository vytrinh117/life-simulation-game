
// ---------- v7.2 time advancement (end-of-day obligations resolve before the date changes) ----------
function advanceTime(minutes,{skipNeeds=false,silent=false,skipRoutine=false}={}){
 minutes=Math.max(0,Math.round(minutes)||0);if(!minutes)return;if(!skipNeeds)driftNeeds(minutes);
 let remaining=minutes;
 while(remaining>0){
  const untilMidnight=1440-S.clock.minute;
  if(remaining<untilMidnight){S.clock.minute+=remaining;remaining=0;processCalendar()}
  else{remaining-=untilMidnight;S.clock.minute=1439;processCalendar();S.clock.minute=0;S.clock.dateISO=addDays(S.clock.dateISO,1);S.day++;dailyTick({skipRoutine});processCalendar()}
 }
 if(!skipNeeds)applyNeedConsequences();if(!silent&&!skipRoutine)maybeRandomEvent();checkConditionalRequests();
 if(!SIM.skipping&&!SIM.sleeping)checkBedtime();
 moodDrift(minutes);
 if(!SIM.skipping)clearCurrentContextIfSourceResolved()
}
function dailyTick({skipRoutine=false}={}){
 setWeather();ageSync();itemDailyTick();academicTick();schoolDailyTick(skipRoutine);schoolActivityTick();holidayTick();
 if(!skipRoutine){worldTick();const sd=needsFormalSchool()&&isSchoolDay();scheduleFollowUp('npcInitiative',{},{minute:(sd?940:600)+Math.floor(Math.random()*(sd?200:540))});applyNeedConsequences(true);if(S.stall?.active&&chance(35))runStall(false)}
 if(!skipRoutine)repDailyTick();
 promTick();npcAgencyTick();knxDaily();lmpqDaily();rstDaily();bizDaily();uniDaily();workDaily();identityTick();eventsDaily();healthDailyTick();familyGrowthTick();siblingRequestTick();friendNetworkTick();threadTick();devWeeklyTick();if(!skipRoutine){neighborhoodTick();groupTick()}
 reconcileState('daily')
}
function schoolDailyTick(skipRoutine=false){
 if(!S.school)return;normalizeSchool();if(S.school.grade==='Kindergarten')return;
 ensureSchoolRecord();ensureSchoolDayObligation(currentDate());processHomeworkDeadlines();ensureRollingAssessments();
 if(isSchoolDay()&&chance(SIM.skipping?35:25))generateHomework(false);
 if(!skipRoutine&&isSchoolDay()&&chance(18))scheduleFollowUp('npcSchool',{},{minute:690+Math.floor(Math.random()*20)})
}
function normalizeSchool(){
 if(!S.school)return;ensureLifecycleContainers();
 S.school.attendance=clamp(S.school.attendance??96);S.school.behavior=clamp(S.school.behavior??70);
 S.school.subjects=(S.school.subjects||[]).map((sub,i)=>{const s=Object.assign(makeSubject(sub.name||`Subject ${i+1}`,i),sub,{teacher:Object.assign({name:teacherName(sub.name),rel:55},sub.teacher||{}),homework:Object.assign({status:'None',progress:0,dueDate:null},sub.homework||{})});if(s.homework.status==='Done'){s.homework.status='Submitted';s.homework.resolvedDate=s.homework.resolvedDate||currentDate()}if(s.homework.status==='Archived'){s.homework.status='None'}if(HW_OPEN.includes(s.homework.status)&&!s.homework.id)s.homework.id=uid('hw');ensureTeacher(s);return s});
 S.school.clubs=(S.school.clubs||[]).map(c=>ensureClub(typeof c==='string'?{id:uid('club'),name:c,status:'Active',joinedDate:currentDate(),skill:15,sessions:0,members:[]}:Object.assign({id:c.id||uid('club'),status:'Active',joinedDate:currentDate(),skill:15,sessions:0,members:[]},c)));
 S.school.activityOffers=S.school.activityOffers||[];
 const seen=new Set();
 S.school.contests=(S.school.contests||[]).filter(c=>c&&c.name&&!seen.has(c.id||c.name)&&seen.add(c.id||c.name)).map(c=>{
  const decisionDate=c.decisionDate||(Number.isFinite(Number(c.decisionBy))?addDays(currentDate(),Math.max(0,Number(c.decisionBy)-safeNum(S.day,1))):addDays(currentDate(),4));
  const eventDate=c.eventDate||(Number.isFinite(Number(c.eventDay))?addDays(currentDate(),Math.max(1,Number(c.eventDay)-safeNum(S.day,1))):addDays(currentDate(),14));
  return Object.assign({id:c.id||uid('contest'),status:c.status==='Considering'?'Open':c.status||'Open',prep:0,result:null},c,{decisionDate,eventDate});
 });
 ensureSchoolRecord();
 if(S.school.grade==='Kindergarten'){if(S.exams?.length){S.archive.exams.unshift(...S.exams);S.exams=[]}return}
 S.exams=Array.isArray(S.exams)?S.exams:[];S.exams.forEach(normalizeExam);syncExamCalendar()
}
function initializeNewLife(){S=makeState();migrate();setWeather();ensureCalendarBasics();setCurrentContext({sourceType:'general',priority:1,title:'Welcome to the world.',text:'At first, almost everything happens through caregivers. Your independence will grow with age, skills, trust and circumstances.'});log('Life begins',S.current.text,true);enterGame()}
function enterGame(){migrate();schoolActivityTick();processCalendar();reconcileState('enter');$('creator').classList.add('hidden');$('game').classList.remove('hidden');render();save()}
