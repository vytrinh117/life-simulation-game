
// =====================================================================
// v7.3 L + M + P + Q — teen autonomy, summer programs, baking/wrapping/Valentine, family trips
// =====================================================================

// ---------- L. Teen autonomy ----------
// Curfew: under 13 unchanged; teens 13–17 between 22:30 and midnight depending on strictness.
function curfewMinute(){if(S.age>=18)return null;const r=familyRules();if(S.age>=13)return r.strictness>70?1350:r.strictness>=40?1380:1439;const base=S.age<10?1080:1170,adj=r.strictness>70?-30:r.strictness<35?30:0;return base+adj}
const NOTIFY_TYPES=['sleepover','party','gameNight'];
function teenNotify(type){return S.age>=13&&S.age<18&&NOTIFY_TYPES.includes(type)}
function notifyParents(plan){if(!teenNotify(plan.type)||plan.notified)return;plan.notified=true;const cg=caregiverPerson(),cn=cg?firstName(cg):'your caregiver';S.family.trust=clamp((S.family.trust??60)+.5);if(!SIM.skipping)log('Letting them know',`You tell ${cn}: ${PLAN_TYPES[plan.type].label.toLowerCase()} ${plan.dateISO===currentDate()?'tonight':`on ${formatDate(plan.dateISO)}`} at ${plan.location}. ${cn} says "Thanks for telling me — text me when you get there."`)}

// ---------- M. Casual practice & formal programs ----------
const CASUAL={hoops:{label:'Shoot hoops at the park',skill:'sports',outdoor:true,minAge:7},run:{label:'Go for a run',skill:'fitness',outdoor:true,minAge:9},sketch:{label:'Sketch outside',skill:'art',outdoor:true,minAge:5},instrument:{label:'Practice music at home',skill:'music',minAge:6},library:{label:'Read at the library',skill:'knowledge',minAge:7},code:{label:'Code a small project',skill:'programming',minAge:10},dance:{label:'Dance practice',skill:'fitness',minAge:5},bakePractice:{label:'Try a new recipe',skill:'baking',minAge:10}};
function casualPractice(k){const c=CASUAL[k];if(!c||S.age<c.minAge)return;if(atSchool()){toast('After school.');return}if(c.outdoor&&(S.weather?.severity||0)>=2){toast(`Too ${String(S.weather.type).toLowerCase()} to practice outside.`);return}if(S.energy<15){toast('Too tired.');return}
 const g=practiceSkill(c.skill,.8);if(g===0&&S.lastFarmNote){toast(S.lastFarmNote);S.lastFarmNote=null;return}advanceTime(60,{silent:true});S.energy=clamp(S.energy-8);S.needs.fun=clamp(S.needs.fun+5);if(c.outdoor)noteOuting(k);
 log(`Casual practice • ${c.label}`,`${rand(['Free, flexible, and you can stop whenever you want.','No coach, no schedule — just you getting a little better.'])} (Casual practice grows skills more slowly than a coached program.)`)}
const PROGRAMS=[
 {id:'bballCamp',name:'Basketball camp',skill:'sports',rep:'athletic',minAge:8,maxAge:17,cost:250,weeks:2,days:[1,2,3,4,5],start:540,end:900,final:'Camp tournament'},
 {id:'soccerLeague',name:'Summer soccer league',skill:'sports',rep:'athletic',minAge:7,maxAge:17,cost:80,weeks:6,days:[6],start:540,end:660,final:'League final'},
 {id:'swim',name:'Swim lessons',skill:'fitness',rep:'athletic',minAge:5,maxAge:15,cost:90,weeks:4,days:[1,3,5],start:600,end:660,final:'Swim test'},
 {id:'artClass',name:'Art class',skill:'art',rep:'creative',minAge:6,maxAge:17,cost:120,weeks:6,days:[2,4],start:600,end:720,final:'Student exhibition'},
 {id:'music',name:'Music lessons',skill:'music',rep:'creative',minAge:6,maxAge:17,cost:150,weeks:6,days:[3],start:960,end:1020,final:'Recital'},
 {id:'theater',name:'Theater camp',skill:'creativity',rep:'creative',minAge:8,maxAge:17,cost:200,weeks:3,days:[1,2,3,4,5],start:540,end:900,final:'Final show'},
 {id:'codingCamp',name:'Coding camp',skill:'programming',rep:'academic',minAge:10,maxAge:17,cost:300,weeks:2,days:[1,2,3,4,5],start:540,end:900,final:'Demo day'},
 {id:'scienceCamp',name:'Science camp',skill:'knowledge',rep:'academic',minAge:8,maxAge:15,cost:220,weeks:1,days:[1,2,3,4,5],start:540,end:900,final:'Science fair'},
 {id:'bakingClass',name:'Baking class',skill:'baking',rep:'creative',minAge:9,maxAge:17,cost:110,weeks:4,days:[2],start:840,end:960,final:'Bake-off'},
 {id:'summerSchool',name:'Summer school',skill:'knowledge',rep:'academic',minAge:7,maxAge:17,cost:0,weeks:4,days:[1,2,3,4,5],start:540,end:720,final:'Final test',academic:true},
 {id:'babysit',name:'Babysitting (summer job)',job:true,pay:30,skill:'business',minAge:13,maxAge:17,cost:0,weeks:6,days:[2,4],start:1080,end:1260,final:null},
 {id:'lawn',name:'Mowing lawns (summer job)',job:true,pay:20,skill:'fitness',minAge:12,maxAge:17,cost:0,weeks:6,days:[6],start:540,end:660,final:null},
 {id:'cafe',name:'Café job (summer job)',job:true,pay:48,skill:'business',minAge:16,maxAge:17,cost:0,weeks:8,days:[1,3,5],start:600,end:840,final:null},
 {id:'lifeguard',name:'Lifeguard (summer job)',job:true,pay:60,skill:'fitness',minAge:16,maxAge:17,cost:0,weeks:8,days:[2,4,6],start:600,end:900,final:null,req:{skill:'fitness',min:40}}
];
function summerWindow(){const a=academicInfo(),t=currentDate();const sumStart=addDays(a.end,1),next=academicInfo(addDays(a.end,40)),nextStart=next.key!==a.key?next.start:academicInfo(addDays(a.end,120)).start;
 if(t>=sumStart&&t<nextStart)return {from:t,to:addDays(nextStart,-1),open:true};if(daysBetween(t,sumStart)<=21&&t<sumStart)return {from:sumStart,to:addDays(nextStart,-1),open:true};return {open:false}}
function programDates(pg,from){let d=from;while(parseISO(d).getUTCDay()!==1)d=addDays(d,1);const out=[];for(let w=0;w<pg.weeks;w++)for(const wd of pg.days)out.push(addDays(d,w*7+(wd===0?6:wd-1)));return out.sort()}
function programAvailable(pg){const w=summerWindow();if(!w.open||S.age<pg.minAge||S.age>pg.maxAge)return null;if((S.programs||[]).some(x=>x.progId===pg.id&&['Enrolled','Active'].includes(x.status)))return null;const from=addDays(w.from<currentDate()?currentDate():w.from,2),dates=programDates(pg,from);if(!dates.length||dates[dates.length-1]>w.to)return null;return dates}
function enrollProgram(id){
 const pg=PROGRAMS.find(x=>x.id===id),dates=pg&&programAvailable(pg);if(!dates){toast('Not available right now.');return}
 if(pg.req&&(S.skills?.[pg.req.skill]||0)<pg.req.min){toast(`You need ${pg.req.skill} level ${Math.ceil(pg.req.min/10)} for this job.`);return}
 if(S.age<13&&!caregiverYes(pg.cost>150?-10:0)){log('Not this summer',`Your caregiver says no to ${pg.name.toLowerCase()} this year.`);return}
 if(pg.cost){const parentsPay=S.age<18&&caregiverYes(S.wealth==='Struggling'?-30:S.wealth==='Modest'?-12:5);if(parentsPay)log('Your caregiver pays',`${primaryCaregiver()} covers ${money(pg.cost)} for ${pg.name.toLowerCase()}.`);else if(!spendOwn(pg.cost)){toast(`${pg.name} costs ${money(pg.cost)}. Try casual practice — it is free.`);return}}
 S.programs=S.programs||[];const rec={id:uid('prog'),progId:pg.id,name:pg.name,status:'Enrolled',start:dates[0],end:dates[dates.length-1],total:dates.length,attended:0,missed:0,streakMissed:0,teammates:[],coach:50};S.programs.unshift(rec);
 dates.forEach((d,i)=>createCalendarEvent({id:`prog-${rec.id}-${i}`,type:'program',title:i===dates.length-1&&pg.final?`${pg.name}: ${pg.final}`:pg.name,dateISO:d,startMinute:pg.start,endMinute:pg.end,graceMinute:pg.start+30,location:pg.job?'Work':'Program',payload:{recId:rec.id,i,last:i===dates.length-1},required:true,source:'program'}));
 log(pg.job?`Hired: ${pg.name}`:`Enrolled: ${pg.name}`,`${dates.length} sessions from ${formatDate(dates[0])} to ${formatDate(rec.end)}${pg.job?` • ${money(pg.pay)} per shift`:''}. ${pg.job?'Show up on time.':'Coaching, teammates and a structured plan — faster progress than practicing alone.'}`,true)
}
function programRec(ev){return (S.programs||[]).find(x=>x.id===ev.payload?.recId)}
function attendProgram(evId,{simulated=false}={}){
 const ev=S.calendar.find(e=>e.id===evId);if(!ev||isTerminal(ev.status))return;const rec=programRec(ev),pg=rec&&PROGRAMS.find(x=>x.id===rec.progId);if(!rec||!pg)return;
 if(!simulated){if(ev.dateISO!==currentDate()){toast('That session is on another day.');return}if(currentMinute()>ev.graceMinute){processCalendar();return}const m=currentMinute();if(m<pg.start)advanceTime(pg.start-m,{silent:true})}
 rec.status='Active';rec.attended++;rec.streakMissed=0;rec.coach=clamp(rec.coach+2);setCalendarStatus(ev,'Attended',simulated?'Simulated':'Attended');
 const mult=pg.academic?1:1.6;practiceSkill(pg.skill,mult*1.4);if(pg.rep)addRep(pg.rep,.6);
 if(pg.academic&&needsFormalSchool()){const low=[...S.school.subjects].sort((a,b)=>a.score-b.score)[0];low.score=Math.min(100,Math.round((low.score+.6)*10)/10);low.skill=clamp(low.skill+1)}
 if(pg.job){S.money+=pg.pay;S.finance.earned=(S.finance.earned||0)+pg.pay}
 if(!simulated){advanceTime(pg.end-currentMinute(),{silent:true});S.energy=clamp(S.energy-12)}
 if(rec.attended===1&&!pg.job){const tm=freshPeers(chance(60)?1:2);for(const n of tm){const p=personFromNpc(n,'friend',`${pg.name} teammate`);p.rel=46;S.people.push(p);rec.teammates.push(p.id)}if(!simulated&&tm.length)log(`New faces at ${pg.name}`,`You meet ${tm.map(n=>n.fullName).join(' and ')} on day one.`)}
 else rec.teammates.map(personById).filter(Boolean).forEach(p=>{p.rel=clamp(p.rel+1)});
 if(ev.payload?.last){finishProgram(rec,pg);return}
 if(!simulated)log(pg.job?`Shift • ${pg.name}`:`${pg.name} • session ${rec.attended}/${rec.total}`,pg.job?`You earn ${money(pg.pay)}. ${rand(['A regular says you are the best one on shift.','Long day, but you are getting faster.','Your manager nods approvingly.'])}`:rand([`The coach makes you repeat the drill until it clicks. It clicks.`,`You notice you are better than on day one.`,`Your teammates cheer when you finally get it right.`]))
}
function finishProgram(rec,pg){
 rec.status='Done';const rate=rec.attended/rec.total,lvl=(S.skills?.[pg.skill]||0)/10;const score=lvl*7+rate*40+Math.random()*25,tier=score>=75?'Top result':score>=55?'Strong finish':score>=35?'Completed':'Struggled';devProgramResult(rec,pg,score);
 if(pg.final){if(pg.rep)addRep(pg.rep,tier==='Top result'?5:2);S.happiness=clamp(S.happiness+(tier==='Struggled'?-2:5));S.milestones.unshift({dateISO:currentDate(),age:S.age,title:`☀️ ${pg.name}`,text:`${pg.final}: ${tier.toLowerCase()} (${Math.round(rate*100)}% attendance).`});recordOutcome('Program',`${pg.name} — ${pg.final}`,tier,`Attendance ${Math.round(rate*100)}%, ${pg.skill} level ${Math.max(1,Math.ceil(lvl))}.`)}
 else recordOutcome('Summer job',pg.name,'Finished',`${rec.attended} shifts • earned about ${money(rec.attended*pg.pay)}.`);
 if(!SIM.skipping)log(pg.final?`☀️ ${pg.final}`:`Last shift • ${pg.name}`,pg.final?{"Top result":'You finish at the very top. The coach shakes your hand like you are a pro.',"Strong finish":'A strong finish. You leave noticeably better than you came.',"Completed":'You make it through to the end. Proud of that.',"Struggled":'It did not go great, but you showed up.'}[tier]:`Summer job done: ${rec.attended} shifts and real money in your pocket.`,true)
}
function programMissed(ev){const rec=programRec(ev);setCalendarStatus(ev,'Missed','Did not go');if(!rec)return;rec.missed++;rec.streakMissed++;rec.coach=clamp(rec.coach-6);
 if(rec.streakMissed>=3&&rec.status!=='Dropped'){rec.status='Dropped';for(const e of S.calendar)if(e.type==='program'&&e.payload?.recId===rec.id&&!isTerminal(e.status))setCalendarStatus(e,'Cancelled','Dropped out');if(!SIM.skipping)log(`Dropped from ${rec.name}`,'Three missed sessions in a row — your spot goes to someone on the waitlist. No refund.');recordOutcome('Program',rec.name,'Dropped','Missed three sessions in a row.')}
 else if(!SIM.skipping)log(`Missed ${rec.name}`,PROGRAMS.find(x=>x.id===rec.progId)?.job?'You did not show up for your shift. Your manager is not happy.':'The coach notes your absence.')}
function programsHtml(){
 const mine=(S.programs||[]).filter(r=>['Enrolled','Active'].includes(r.status)),w=summerWindow(),avail=PROGRAMS.map(pg=>({pg,d:programAvailable(pg)})).filter(x=>x.d);
 const cas=Object.entries(CASUAL).filter(([,c])=>S.age>=c.minAge);
 return `${mine.length?mine.map(r=>`<div class="pl-row"><span>☀️</span><b>${esc(r.name)}</b><small>${r.attended}/${r.total} • until ${formatDate(r.end)}</small></div>`).join(''):''}
 ${w.open?(avail.length?`<h4>Summer programs & jobs</h4><div class="prog-list">${avail.map(({pg,d})=>`<button class="prog-opt" data-program="${pg.id}"><b>${esc(pg.name)}</b><small>${pg.job?`${money(pg.pay)}/shift`:pg.cost?money(pg.cost):'Free'} • ${d.length} sessions • ${formatDate(d[0])}–${formatDate(d[d.length-1])} • ${timeLabel(pg.start)}–${timeLabel(pg.end)}</small></button>`).join('')}</div>`:'<p class="muted-text">No more programs fit before school starts.</p>'):'<p class="muted-text">Summer programs open about three weeks before summer break.</p>'}
 <h4>Casual practice (free)</h4><div class="inline-actions">${cas.map(([k,c])=>`<button class="small ghost" data-casual="${k}">${esc(c.label)}</button>`).join('')}</div>`}

// ---------- P. Baking, wrapping, Valentine's ----------
const BAKES={cookies:{label:'Bake cookies',item:'bakedCookies',minutes:70},cupcakes:{label:'Bake cupcakes',item:'cupcakes',minutes:90},heart:{label:'Bake heart cookies',item:'heartCookies',minutes:80,season:'valentines'}};
function valentineSeason(){const t=currentDate(),y=t.slice(0,4);return t>=`${y}-02-01`&&t<=`${y}-02-14`}
function bake(kind){
 const b=BAKES[kind];if(!b)return;if(b.season==='valentines'&&!valentineSeason()){toast('Heart cookies are a Valentine\'s thing.');return}if(atSchool()||S.location!=='Home'){toast('You need a kitchen — at home.');return}
 if(S.age<5){toast('A bit young to bake.');return}const helped=S.age<8,supervised=S.age<12;if(supervised&&!helped&&!householdAccess('stove'))return;
 const cost=6;if(S.age>=12){if(!spendOwn(cost)){toast(`Ingredients cost about ${money(cost)}.`);return}}
 const lvl=(S.skills?.baking||0)/10;practiceSkill('baking',1);advanceTime(b.minutes,{silent:true});S.needs.fun=clamp(S.needs.fun+8);
 const q=lvl*8+Math.random()*40+(helped?15:0),tier=q>=60?'perfect':q>=35?'good':'lopsided';
 const it=addItem(BAKES[kind].item,'Homemade',null,{quantity:tier==='lopsided'?3:6});if(it)it.quality=tier;
 log(`🍪 ${b.label.replace('Bake ','')}`,`${helped?`You "help" ${primaryCaregiver()} (mostly with the sprinkles). `:supervised?`${primaryCaregiver()} keeps an eye on the oven. `:''}${{perfect:'They come out perfect. The kitchen smells amazing.',good:'Pretty good! A couple are a little dark on the bottom.',lopsided:'Lopsided, a bit burnt, still delicious.'}[tier]}`)}
function wrapItem(itemId,paper){
 const it=S.inventoryItems.find(x=>x.id===itemId);if(!it)return;if(it.wrapped){it.wrapped=null;log('Unwrapped',`You take the paper off the ${it.name.toLowerCase()}.`);return}
 const roll=findUsable(paper==='heart'?'heartWrap':'giftWrap')||findUsable('giftWrap')||findUsable('heartWrap');if(!roll){toast('You need gift wrap (or heart wrapping paper) from the store.');return}
 const u=openOne(roll);u.remaining=clamp(u.remaining-20);const kind=u.key==='heartWrap'?'heart':'gift';if(u.remaining<=.5)removeItem(u.id);
 let target=it;if((it.quantity||1)>1){it.quantity--;target=JSON.parse(JSON.stringify(it));target.id=uid('item');target.quantity=1;S.inventoryItems.push(target)}
 target.wrapped={paper:kind,dateISO:currentDate()};advanceTime(5,{silent:true});log('Wrapped',`You wrap the ${it.name.toLowerCase()} in ${kind==='heart'?'heart-covered':'bright'} paper. It looks like a real present now.`)}
// Secret admirer notes / treats at school (Valentine's, school day, 10+)
function admirerTargets(){return S.people.filter(p=>!isFamilyPerson(p)&&!p.movedAway&&Math.abs(personAge(p)-S.age)<=2&&personAge(p)>=10&&(S.age<18?personAge(p)<18:personAge(p)>=18))}
function openAdmirer(kind){if(!valentineSeason()||currentDate().slice(5)!=='02-14'&&kind!=='note'){}
 const tg=admirerTargets();if(!tg.length){toast('There is nobody to surprise yet.');return}
 if(kind==='treats'&&!S.inventoryItems.some(i=>['bakedCookies','cupcakes','heartCookies'].includes(i.key))){toast('Bake something first (Daily Life → Activities).');return}
 openModal(kind==='note'?'Secret admirer note':'Leave baked treats',`<p class="muted-text">Slip it into their locker or desk. Sign it, or stay anonymous.</p>${tg.slice(0,10).map(p=>`<div class="admirer-row"><b>${esc(displayName(p))}</b><span><button class="small" data-admirer="${kind}" data-person-id="${p.id}" data-signed="0">Anonymous</button><button class="small ghost" data-admirer="${kind}" data-person-id="${p.id}" data-signed="1">Signed</button></span></div>`).join('')}`)}
function leaveAdmirer(kind,personId,signed){
 const p=personById(personId);closeChoiceModal();if(!p)return;const y=currentDate().slice(0,4);S.flags.admirer=S.flags.admirer||{};if(S.flags.admirer[`${y}-${p.id}`]){toast('You already left them something this year.');return}S.flags.admirer[`${y}-${p.id}`]=true;
 let bonus=0;if(kind==='treats'){const it=S.inventoryItems.find(i=>['heartCookies','bakedCookies','cupcakes'].includes(i.key)&&i.wrapped)||S.inventoryItems.find(i=>['heartCookies','bakedCookies','cupcakes'].includes(i.key));if(!it){toast('You have no treats left.');return}bonus=(it.wrapped?.paper==='heart'?3:it.wrapped?2:1)+(it.key==='heartCookies'?1:0);removeItem(it.id,true)}
 advanceTime(5,{silent:true});const romantic=eligibleRomance(p);if(romantic)ensureRomanceProfile(p);
 if(!signed){p.admirerNotes=(p.admirerNotes||0)+1;S.happiness=clamp(S.happiness+3);const guess=p.rel>=65&&chance(35);if(guess){p.rel=clamp(p.rel+2+bonus);if(romantic)p.attraction=clamp((p.attraction||40)+4)}log('A secret delivery',guess?`Later, ${firstName(p)} gives you a long look across the classroom. "Was that… you?" You say nothing. They smile.`:`${firstName(p)} finds it and looks around the room, grinning. Nobody gives anything away.`);return}
 if(romantic){const ok=p.romanceOpen&&chance(20+(p.attraction||40)*.5+(p.rel-50)*.4+bonus*4);p.rel=clamp(p.rel+(ok?4+bonus:1));if(ok){p.attraction=clamp((p.attraction||40)+8);if(p.romanceStage==='none')p.romanceStage='crush'}log(ok?'💌 They liked it':'💌 A kind answer',ok?`${firstName(p)} finds you at lunch, a little red. "Thank you. That was really sweet." Something shifted today.`:`${firstName(p)} thanks you warmly — but clearly as a friend.`)}
 else{p.rel=clamp(p.rel+3+bonus);log('💌 Valentine treat',`${firstName(p)} is delighted and shares the treats with half the class.`)}
}

// ---------- Q. Family outings & vacations ----------
const OUTINGS=[{id:'park',name:'the park',min:180,outdoor:true},{id:'zoo',name:'the zoo',min:240,outdoor:true,cost:'mid'},{id:'museum',name:'a museum',min:180},{id:'beach',name:'the beach',min:300,outdoor:true,warm:true},{id:'amusement',name:'an amusement park',min:360,cost:'high'},{id:'hike',name:'a hiking trail',min:240,outdoor:true}];
function familyOuting(){
 if(atSchool()||(needsFormalSchool()&&isSchoolDay()&&currentMinute()>=SCHOOL_DAY.start-30&&currentMinute()<SCHOOL_DAY.end)){toast('Not during school hours.');return}
 if(currentMinute()>1080){toast('Too late in the day for an outing.');return}if(S.trip?.going&&currentDate()>=S.trip.start&&currentDate()<=S.trip.end){toast('You are already on a trip.');return}
 if(!caregiverApproval(S.age<6?15:5)){log('Not today','Your caregivers are too busy for an outing today.');return}
 const sev=S.weather?.severity||0,warm=(S.weather?.temp||20)>=24,opts=OUTINGS.filter(o=>(!o.outdoor||sev<2)&&(!o.warm||warm)&&(o.cost!=='high'||['Comfortable','Wealthy','Extremely wealthy'].includes(S.wealth)));if(!opts.length){toast('The weather rules out an outing today.');return}
 const o=rand(opts);advanceTime(o.min,{silent:true});S.energy=clamp(S.energy-18);S.needs.hunger=clamp(S.needs.hunger+18);S.needs.fun=clamp(S.needs.fun+24);S.needs.social=clamp(S.needs.social+12);S.needs.hygiene=clamp(S.needs.hygiene-10);S.family.closeness=clamp(S.family.closeness+3);noteOuting(o.id);
 log(`Family outing • ${o.name}`,`${rand(['Someone gets a sunburn, someone gets ice cream, everyone gets tired.','Your family argues about directions for ten minutes, then has a great day.','You come home exhausted and happy.'])} (${Math.round(o.min/60)} hours • energy −18)`)}
const DESTS={near:[{name:'the lake cabin',t:['car','camper']},{name:'a campsite in the hills',t:['camping','camper']},{name:'the coast',t:['car','camper']},{name:'Grandma\'s hometown',t:['car']}],far:[{name:'the mountains',t:['plane','car']},{name:'a beach resort',t:['plane']},{name:'the capital city',t:['plane','car']}],abroad:[{name:'Japan',t:['plane']},{name:'Italy',t:['plane']},{name:'a Caribbean cruise',t:['cruise']},{name:'Thailand',t:['plane']},{name:'Australia',t:['plane']}]};
function vacationTick(){
 if(SIM.skipping||S.age<3||S.age>=18||S.trip&&S.trip.end>=currentDate())return;const f=S.family;f.anniversary=f.anniversary||randomMD();const last=f.lastTripOffer||'1900-01-01';if(daysBetween(last,currentDate())<120)return;
 const t=currentDate(),md=t.slice(5),fam=S.people.filter(p=>isFamilyPerson(p)&&p.bday);let reason=null;
 if(md===f.anniversary)reason='your parents\' wedding anniversary';else if(fam.some(p=>p.bday===md&&p.role!=='grandparent')&&chance(25))reason=`${displayName(fam.find(p=>p.bday===md))}'s birthday`;else if(sameMonthDay(S.dob,t)&&chance(15))reason='your birthday';else{const a=academicInfo();if(a.breaks.some(b=>daysBetween(t,b.from)===10)&&chance(30))reason='the upcoming break';else if(daysBetween(t,addDays(a.end,1))===14&&chance(55))reason='summer vacation';else if(chance(.4))reason='time off work'}
 if(!reason)return;f.lastTripOffer=t;proposeVacation(reason)
}
function proposeVacation(reason){
 const rich=['Wealthy','Extremely wealthy'].includes(S.wealth),poor=['Struggling','Modest'].includes(S.wealth),tier=poor?'near':rich&&chance(55)?'abroad':chance(50)?'far':'near',d=rand(DESTS[tier]),transport=rand(d.t);
 const summer=/summer/.test(reason),len=Math.min(30,summer?7+Math.floor(Math.random()*14):3+Math.floor(Math.random()*6)),start=addDays(currentDate(),summer?14:7+Math.floor(Math.random()*10)),end=addDays(start,len-1);
 let schoolDays=0;for(let i=0;i<len;i++)if(needsFormalSchool()&&isSchoolDay(addDays(start,i)))schoolDays++;
 S.tripOffer={id:uid('trip'),dest:d.name,transport,start,end,len,reason,schoolDays,tier,asked:currentDate()};const cg=caregiverPerson();
 queueEvent({type:'vacationProposal',title:`Family trip to ${d.name}?`,text:`For ${reason}, ${cg?firstName(cg):'your parents'} want to go to ${d.name} by ${transport==='camper'?'camper van':transport==='camping'?'car (camping)':transport}: ${formatDate(start)}–${formatDate(end)} (${len} days).${schoolDays?` That includes ${schoolDays} school day${schoolDays===1?'':'s'} — the school would mark them as excused.`:''} Do you want to come?`,priority:4,expiresAt:{dateISO:addDays(currentDate(),1),minute:1200},choices:[{id:'yes',label:'Yes!'},{id:'no',label:'No, I\'d rather stay'},{id:'tomorrow',label:'Tell you tomorrow'}]})
}
function caretakerFor(){if(S.age>=13){const sib=S.people.find(p=>/older sibling/.test(p.role)&&personAge(p)>=16);return sib?{p:sib,label:`your ${sib.role}`}:{p:null,label:'yourself'}}
 const gp=S.people.find(p=>p.role==='grandparent');if(gp)return {p:gp,label:gp.name};const rel=S.people.find(p=>/aunt|uncle|cousin/i.test(p.role+' '+(p.roleLabel||'')));if(rel)return {p:rel,label:displayName(rel)};
 const n=freshPeers(1)[0];const aunt={...makePerson(`Aunt ${n?.firstName||'Lina'}`,'relative',38,S.age),roleLabel:'aunt'};S.people.push(aunt);return {p:aunt,label:aunt.name}}
function decideVacation(id){
 const o=S.tripOffer;if(!o)return true;const cg=caregiverPerson(),cn=cg?firstName(cg):'Your parents';
 if(id==='tomorrow'){if(o.deferred){toast('They need an answer now.');return false}o.deferred=true;scheduleFollowUp('tripAskAgain',{},{days:1,minute:1140});log('Thinking about it',`"Okay, tell us tomorrow," ${cn} says. "We need to book soon."`);return true}
 S.tripOffer=null;
 if(id==='yes'){startTripPlan(o,true,null);log(`Trip booked: ${o.dest}`,`${o.len} days from ${formatDate(o.start)} by ${o.transport}. ${o.schoolDays?`Your ${o.schoolDays} school day${o.schoolDays===1?'':'s'} will be excused.`:''}`,true);return true}
 const go=chance(55+(o.reason.includes('anniversary')?25:0));if(!go){S.family.closeness=clamp(S.family.closeness-1);log('Trip cancelled',`${cn} decides not to go without you. Maybe another time.`);return true}
 const ct=caretakerFor();startTripPlan(o,false,ct);log('They go without you',`${cn} will go anyway. While they are away, you stay with ${ct.label}${S.age>=13&&!ct.p?' — home alone':''}.`);return true}
function startTripPlan(o,going,ct){
 S.trip={...o,going,caretakerId:ct?.p?.id||null,caretakerLabel:ct?.label||null,status:'Booked'};
 createCalendarEvent({id:`trip-${o.id}`,type:'trip',title:going?`Family trip: ${o.dest}`:`Parents away (${o.dest})`,dateISO:o.start,startMinute:420,endMinute:1439,graceMinute:1439,required:false,location:o.dest,payload:{tripId:o.id},source:'family'});
 if(going){for(let i=0;i<o.len;i++){const d=addDays(o.start,i);if(needsFormalSchool()&&isSchoolDay(d)){const ev=ensureSchoolDayObligation(d);if(ev&&!isTerminal(ev.status))markSchoolAbsence(ev,{excused:true,reason:`Family trip to ${o.dest} (parent-approved)`})}}
  for(const pl of S.plans.filter(x=>x.status==='Accepted'&&x.dateISO>=o.start&&x.dateISO<=o.end))cancelPlan(pl.id)}
}
function onTrip(d=currentDate()){return !!(S.trip&&S.trip.going&&d>=S.trip.start&&d<=S.trip.end)}
function tripDaily(){
 const t=S.trip;if(!t)return;const d=currentDate();
 if(d===t.start){const ev=S.calendar.find(e=>e.id===`trip-${t.id}`);if(ev)setCalendarStatus(ev,'Completed','Started');t.status='Active';if(!SIM.skipping)log(t.going?`✈️ Off to ${t.dest}`:'Parents left',t.going?`${{plane:'An early flight, a window seat, and a lot of snacks.',cruise:'The ship is enormous. You get lost twice on day one.',car:'A long drive and too many playlists arguments.',camper:'The camper van rattles, but the views are worth it.',camping:'You help pitch the tent. It mostly stands.'}[t.transport]||''}`:`${t.caretakerLabel==='yourself'?'The house is very quiet. You are in charge now.':`${t.caretakerLabel} is staying with you.`}`,true);if(!t.going&&S.age>=13&&t.caretakerLabel==='yourself'&&!SIM.skipping&&chance(60))queueEvent({type:'homeAloneParty',title:'Home alone',text:'Your friends find out your parents are away. "Party at your place?"',priority:3,expiresDays:2,choices:[{id:'no',label:'No way'},{id:'small',label:'A few friends, quietly'},{id:'party',label:'Throw a real party'}]})}
 if(d>t.start&&d<=t.end&&t.going){S.location='Trip';S.family.closeness=clamp(S.family.closeness+1);S.needs.fun=clamp(S.needs.fun+6);S.stress=clamp(S.stress-3);if(!SIM.skipping&&chance(45))log(`Trip • ${t.dest}`,rand(['A day you will remember: good food, a new place, a ridiculous family photo.','Rain in the morning, sun in the afternoon, and a long dinner together.','You try something you have never eaten before. Verdict: surprisingly good.','A tiring day of sightseeing. Everyone falls asleep early.']))}
 if(d===addDays(t.end,1)){if(t.going){S.location='Home';addItem(rand(['tshirt','book','greetingCard'].filter(k=>D.catalog[k])),`souvenir from ${t.dest}`);S.milestones.unshift({dateISO:currentDate(),age:S.age,title:'🧳 Family trip',text:`${t.len} days in ${t.dest} (${t.transport}).`});S.travel.trips++;S.travel.lastTrip=currentDate();if(!SIM.skipping)log('Back home',`Suitcases everywhere and a souvenir in your bag. ${t.dest} was worth it.`,true)}else if(!SIM.skipping)log('They are back',`Your parents are home from ${t.dest}${S.flags.partyWhileAway===t.id?'… and they can tell something happened.':' with gifts and a lot of photos.'}`);
  if(S.flags.partyWhileAway===t.id&&chance(60)){S.family.trust=clamp((S.family.trust??60)-15);ground(7,'Party while parents were away');if(!SIM.skipping)log('Busted','A neighbor mentioned the noise. Grounded for a week.')}S.trip=null}
}
function homeAloneChoice(e,id){const t=S.trip;if(id==='no'){S.family.trust=clamp((S.family.trust??60)+2);log('Responsible','You say no. The house stays in one piece.');return true}S.needs.social=clamp(S.needs.social+25);S.needs.fun=clamp(S.needs.fun+25);if(id==='party'){S.flags.loudParty=true;if(t)S.flags.partyWhileAway=t.id;addRep('social',3);log('House party','The music is too loud, someone spills soda on the couch, and it is one of the best nights of the year.')}else{log('A quiet hangout','A few friends, pizza, a movie. Nothing anyone will need to explain later.')}return true}
// ---------- wiring helpers ----------
function lmpqDaily(){vacationTick();tripDaily()}
function lmpqEventChoice(e,id){if(e.type==='vacationProposal'||e.type==='vacationAgain'){const r=decideVacation(id);return r!==false}if(e.type==='homeAloneParty')return homeAloneChoice(e,id);return false}
function lmpqFollowUp(f){if(f.type==='tripAskAgain'){const o=S.tripOffer;if(!o)return true;if(SIM.skipping){decideVacation('yes');return true}queueEvent({type:'vacationAgain',title:`Trip to ${o.dest} — your answer?`,text:`"So? Are you coming to ${o.dest}?"`,priority:4,expiresAt:{dateISO:currentDate(),minute:1430},choices:[{id:'yes',label:'Yes'},{id:'no',label:'No'}]});return true}return false}
function lmpqClick(b){const d=b.dataset;if(d.program){enrollProgram(d.program);save();render();return true}if(d.casual){casualPractice(d.casual);save();render();return true}if(d.bake){bake(d.bake);save();render();return true}if(d.admirerOpen){openAdmirer(d.admirerOpen);return true}if(d.admirer){leaveAdmirer(d.admirer,d.personId,d.signed==='1');save();render();return true}if(d.familyOuting){familyOuting();save();render();return true}if(d.wrap){wrapItem(d.wrap,d.paper);save();render();return true}if(d.programGo){attendProgram(d.programGo);save();render();return true}return false}
function bakingHtml(){if(S.age<5)return '';return `<div class="inline-actions">${Object.entries(BAKES).filter(([,b])=>!b.season||valentineSeason()).map(([k,b])=>`<button class="small" data-bake="${k}">🍪 ${esc(b.label)}</button>`).join('')}${valentineSeason()&&S.age>=10&&needsFormalSchool()?`<button class="small ghost" data-admirer-open="note">💌 Secret admirer note</button><button class="small ghost" data-admirer-open="treats">🍪 Leave treats for someone</button>`:''}</div>`}
