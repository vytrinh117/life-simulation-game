
// =====================================================================
// v7.3 PHASE 1B (part 2) — FAST FORWARD SESSION
// The original destination survives interruptions. HARD interrupts (exams, events you registered for, tryouts, prom,
// weddings, big family/relationship decisions) offer Play / Simulate & continue / Cancel. SOFT interrupts
// (invitations, minor social moments) offer Respond / Decline & continue / Let your character decide.
// BACKGROUND things never stop the clock; they go into the summary. Routine preferences shape the skipped days.
// =====================================================================
const HARD_CAL=['exam','schoolEvent','tryout','prom','wedding','election','plan'];
const HARD_EVENTS=['medicalEmergency','vacationProposal','vacationAgain','promInvite','expulsionTalk','meetingAftermath','gradSpeech','triangle','absenceTalk','sneakTalk','counselor'];
const DEFAULT_ROUTINE={study:'normal',exercise:'normal',social:'normal',spending:'balanced',bedtime:'normal',free:'mixed'};
function routine(){S.routine=Object.assign({},DEFAULT_ROUTINE,S.routine||{});return S.routine}
function routineBedShift(){return {early:-60,normal:0,late:60}[routine().bedtime]||0}
function lowestSubject(){return needsFormalSchool()?[...S.school.subjects].sort((a,b)=>a.score-b.score)[0]?.name:null}
// ---------- one simulated evening following the routine (needs are simulated, not frozen) ----------
function routineDay(){
 const r=routine(),ff=S.ffSession;
 // meals happen; hunger and hygiene come from routine, not fixed values
 S.needs.hunger=clamp(20+Math.random()*20);S.needs.toilet=clamp(Math.min(S.needs.toilet,35+Math.random()*15));S.needs.hygiene=clamp(55+Math.random()*30);
 const study={low:0,normal:1,high:2}[r.study]||0;if(study&&isSchoolTermActive()&&lowestSubject())for(let i=0;i<study;i++){const before=currentMinute();studySubject(lowestSubject(),60,'solo');if(ff&&currentMinute()!==before)ff.stats.study++}
 const ex={low:5,normal:30,high:75}[r.exercise]||0;if(S.age>=7&&chance(ex)){const k=S.age>=9?'run':'dance';casualPractice(k);if(ff)ff.stats.exercise++}
 const soc={low:10,normal:30,high:60}[r.social]||0;if(chance(soc)){const fr=S.people.filter(p=>!isFamilyPerson(p)&&p.rel>=40&&!p.movedAway);const p=rand(fr);if(p){p.rel=clamp(p.rel+1.2);S.needs.social=clamp(S.needs.social+15);if(ff){ff.stats.social[p.id]=(ff.stats.social[p.id]||0)+1}}}
 const free=r.free==='mixed'?rand(['friends','hobbies','rest']):r.free;if(free==='rest'){S.stress=clamp(S.stress-4);S.energy=clamp(S.energy+4)}else if(free==='hobbies'){S.needs.fun=clamp(S.needs.fun+10);practiceSkill(rand(['art','music','gaming','writing']),.3)}else S.needs.social=clamp(S.needs.social+6);
 if(S.age>=10&&r.spending!=='save'){const spend=r.spending==='spend'?4+Math.random()*10:Math.random()<.3?2+Math.random()*4:0;if(spend&&S.money>=spend){S.money=Math.round((S.money-spend)*100)/100;S.needs.fun=clamp(S.needs.fun+3);if(ff)ff.stats.spent+=spend}}
}
// ---------- targets ----------
function ffTargets(){const t=currentDate(),a=academicInfo(),out=[['week','Next week',addDays(t,7)],['month','Next month',(()=>{const d=parseISO(t);return isoDate(new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,Math.min(d.getUTCDate(),28))))})()]];
 if(S.school&&S.age>=3){const inBreak=isSchoolBreak(t);if(inBreak)out.push(['endBreak',`End of ${(breakName(t)||'break').toLowerCase()} (classes resume)`,nextSchoolDay(addDays(t,1))]);
  const nextSem=a.semester===1?a.sem2Start:academicInfo(addDays(a.end,60)).start;if(nextSem>t&&!(inBreak&&nextSem===nextSchoolDay(addDays(t,1))))out.push(['nextTerm','Next school term',nextSem]);
  const nyStart=(()=>{let y=a.key+1;for(let i=0;i<3;i++){const s=academicInfo(`${y}-12-31`).start;if(s>t)return s;y++}return null})();if(nyStart&&nyStart!==nextSem)out.push(['yearStart','Start of next school year',nyStart])}
 for(let i=1;i<=150;i++){const d=addDays(t,i);if(importantToday(d,true).length){out.push(['major',`Next major event: ${importantToday(d,true)[0]}`,d]);break}}
 out.push(['birthday','Next birthday (Age up)',nextBirthday()]);return out}
function ffTarget(kind){return (ffTargets().find(x=>x[0]===kind)||[])[2]||addDays(currentDate(),7)}
function ffLabel(kind){const d=ffTarget(kind);return `${formatDate(d)} (${daysBetween(currentDate(),d)} days)`}
function routineHtml(){const r=routine(),sel=(k,opts)=>`<label>${k[0].toUpperCase()+k.slice(1)}<select data-routine="${k}">${opts.map(o=>`<option ${r[k]===o?'selected':''}>${o}</option>`).join('')}</select></label>`;return `<details class="routine-box"><summary>Routine while skipping: study ${r.study} • exercise ${r.exercise} • social ${r.social} • ${r.spending} spending • ${r.bedtime} bedtime • free time ${r.free} <small>(review)</small></summary><div class="routine-grid">${sel('study',['low','normal','high'])}${sel('exercise',['low','normal','high'])}${sel('social',['low','normal','high'])}${sel('spending',['save','balanced','spend'])}${sel('bedtime',['early','normal','late'])}${sel('free',['friends','hobbies','rest','mixed'])}</div></details>`}
function openFastForward(){const ff=S.ffSession;
 openModal('Fast forward',`${ff&&ff.status==='paused'?`<div class="ff-resume"><b>Paused on the way to ${esc(ff.label)}</b> (${formatDate(ff.target)}) <button class="primary small" data-ff-continue="1">Continue</button> <button class="ghost small" data-ffp="cancel">Cancel it</button></div>`:''}<p class="muted-text">Routine days run on autopilot. Exams, events you signed up for, tryouts, prom and big decisions stop the clock; invitations ask what you want to do; everything else goes into the summary.</p>${routineHtml()}<div class="ff-list">${ffTargets().map(([k,l,d])=>`<button class="ff-opt" data-ff="${k}"><b>${esc(l)}</b><small>${k==='birthday'?`${formatDate(d)} • year summary`:`${formatDate(d)} (${daysBetween(currentDate(),d)} days)`}</small></button>`).join('')}</div>`)}
// ---------- session ----------
function snapshot(){return {skills:{...(S.skills||{})},money:S.money,log:S.log[0]?.id,date:currentDate(),rels:Object.fromEntries(S.people.map(p=>[p.id,p.rel])),people:S.people.length}}
function fastForward(kind){closeChoiceModal();if(kind==='birthday'){S.ffSession=null;ageUp();return}if(S.scene){toast('Finish what you are doing first.');return}
 const pending=S.events.find(e=>e.status==='Open'&&!eventExpired(e)&&e.choices?.length);if(pending){toast('Something is waiting for your answer first.');return}
 const opt=ffTargets().find(x=>x[0]===kind);S.ffSession={id:uid('ff'),kind,label:opt?opt[1]:kind,target:opt?opt[2]:addDays(currentDate(),7),start:currentDate(),status:'running',days:0,snap:snapshot(),stats:{study:0,exercise:0,social:{},spent:0},interrupts:[],background:[],known:S.events.filter(e=>e.status==='Open').map(e=>e.id)};runFF()}
function ffContinue(){const ff=S.ffSession;closeChoiceModal();if(!ff||ff.status==='done')return;if(S.events.some(e=>e.status==='Open'&&!eventExpired(e)&&e.choices?.length&&HARD_EVENTS.includes(e.type))){toast('Answer the important decision first.');return}ff.status='running';ff.pause=null;ff.known=S.events.filter(e=>e.status==='Open').map(e=>e.id);ff.skipToday=true;runFF()}
const SOFT_EVENTS=['talentNotice','invitation','friendInvite','birthdayInvite','party','schoolSocial','helpRequest','loveAdvice','surpriseParty','campusConcert','incomingCall','homeAloneParty','groupOuting'];
function classifyEvent(e){return HARD_EVENTS.includes(e.type)?'hard':SOFT_EVENTS.includes(e.type)&&!S.ffSession?.autoSoft?'soft':'background'}
function hardCalToday(){return S.calendar.filter(ev=>ev.dateISO===currentDate()&&!isTerminal(ev.status)&&HARD_CAL.includes(ev.type)&&(ev.type!=='schoolEvent'||contestById(ev.payload?.contestId)?.status==='Registered')&&(ev.type!=='plan'||S.plans?.find(p=>p.id===ev.payload?.planId)?.status==='Accepted'))}
function runFF(){
 const ff=S.ffSession;if(!ff)return;
 for(let guard=0;guard<200&&currentDate()<ff.target;guard++){
  if(!ff.skipToday){const cal=hardCalToday();if(cal.length){pauseFF('hard',{cal:cal.map(e=>e.id),title:cal.map(e=>e.title).join(', ')});return}}ff.skipToday=false;
  autopilotDay();ff.days++;
  for(const be of S.events.filter(e=>e.status==='Open'&&!eventExpired(e)&&!ff.known.includes(e.id)&&e.choices?.length&&classifyEvent(e)==='background')){ff.known.push(be.id);const id=pickChoice(be,'auto');resolveEventChoice(be.id,id);ff.background.push(`${formatDate(currentDate())}: ${be.title} — ${(be.choices.find(c=>c.id===id)||{}).label||id}`)}
  const ne=S.events.find(e=>e.status==='Open'&&!eventExpired(e)&&!ff.known.includes(e.id)&&e.choices?.length);
  if(ne){ff.known.push(ne.id);pauseFF(classifyEvent(ne),{event:ne.id,title:ne.title});return}
  if(S.scene){pauseFF('hard',{title:'Something started that needs you'});return}
 }
 finishFF('reached')
}
function pauseFF(tier,info){const ff=S.ffSession;ff.status='paused';ff.pause={tier,...info,dateISO:currentDate()};ff.interrupts.push({tier,title:info.title,dateISO:currentDate()});save();render();
 const opts=tier==='hard'?[['play','Stop & play it'],['simulate','Simulate & continue'],['cancel','Cancel fast forward']]:[['respond','Stop & respond'],['decline','Decline politely & continue'],['auto','Let your character decide & continue'],['autoAll','Decide for me for the rest of this fast forward']];
 openModal(tier==='hard'?'Important — fast forward paused':'Fast forward paused',`<p><b>${esc(info.title)}</b> • ${formatDate(currentDate())}</p><p class="muted-text">Heading to: ${esc(ff.label)} (${formatDate(ff.target)}) • ${ff.days} day${ff.days===1?'':'s'} so far.</p><div class="modal-action-grid">${opts.map(([k,l],i)=>`<button class="${i===0?'primary':''}" data-ffp="${k}">${l}</button>`).join('')}</div>`)}
const DECLINE_IDS=['decline','no','skip','stay','later','ignore','out','walk','inside','home','wait'];
function pickChoice(e,mode){const ids=e.choices.map(c=>c.id);if(mode==='decline')return ids.find(i=>DECLINE_IDS.includes(i))||ids[ids.length-1];const s=routine().social;const yes=ids.find(i=>!DECLINE_IDS.includes(i))||ids[0];if(s==='high')return yes;if(s==='low')return ids.find(i=>DECLINE_IDS.includes(i))||yes;return chance(55)?yes:(ids.find(i=>DECLINE_IDS.includes(i))||yes)}
function ffPauseChoice(k){const ff=S.ffSession;if(!ff)return;const p=ff.pause||{};closeChoiceModal();
 if(k==='cancel'){finishFF('cancelled');return}
 if(k==='autoAll'){ff.autoSoft=true;k='auto'}
 if(k==='play'||k==='respond'){toast(`Fast forward paused. Use "Continue" to keep going to ${ff.label}.`);save();render();return}
 if(k==='simulate'&&p.cal){const was=SIM.skipping;SIM.skipping=true;try{for(const id of p.cal){const ev=S.calendar.find(e=>e.id===id);if(ev&&!isTerminal(ev.status))simulateObligation(ev)}}finally{SIM.skipping=was}ff.interrupts[ff.interrupts.length-1].outcome='simulated';ff.status='running';ff.skipToday=true;runFF();return}
 if(p.event){const e=S.events.find(x=>x.id===p.event);if(e&&e.status==='Open'){const id=k==='simulate'?e.choices[0].id:pickChoice(e,k==='decline'?'decline':'auto');resolveEventChoice(e.id,id);ff.interrupts[ff.interrupts.length-1].outcome=`${k==='decline'?'declined':'decided'}: ${(e.choices.find(c=>c.id===id)||{}).label||id}`}ff.status='running';ff.known=S.events.filter(x=>x.status==='Open').map(x=>x.id);runFF();return}
 ff.status='running';runFF()}
function finishFF(why){const ff=S.ffSession;if(!ff)return;ff.status='done';S.ffSession=null;save();render();openModal(why==='cancelled'?'Fast forward cancelled':'Fast forward complete',ffSummaryHtml(ff,why))}
function ffSummaryHtml(ff,why){
 const s0=ff.snap,sk=Object.entries(S.skills||{}).map(([k,v])=>[k,v-(s0.skills[k]||0)]).filter(([,d])=>d>=.5).sort((a,b)=>b[1]-a[1]).slice(0,6),lbl=SKILL_KEY_LABEL||{};
 const progs={};for(const e of S.calendar)if(e.type==='program'&&e.status==='Attended'&&e.dateISO>=ff.start&&e.dateISO<=currentDate())progs[e.title.split(':')[0]]=(progs[e.title.split(':')[0]]||0)+1;
 const soc=Object.entries(ff.stats.social).map(([id,n])=>[personById(id),n]).filter(([p])=>p).sort((a,b)=>b[1]-a[1]).slice(0,3);
 const logs=[];for(const l of S.log){if(l.id===s0.log)break;logs.push(l)}const tierUps=logs.filter(l=>/: (Good Friend|Close Friend|Best Friend)$/.test(l.title)).map(l=>l.title);const fam=logs.filter(l=>/Family|trip|grand|Mom|Dad/i.test(l.title)).slice(0,3).map(l=>l.title);
 const dm=Math.round((S.money-s0.money)*100)/100,newPeople=S.people.length-s0.people;
 const soon=[];for(const p of S.people)if(p.bday&&(isFamilyPerson(p)||p.rel>=60)){let d=`${currentDate().slice(0,4)}-${p.bday}`;if(d<currentDate())d=`${Number(currentDate().slice(0,4))+1}-${p.bday}`;if(daysBetween(currentDate(),d)<=30)soon.push(`${displayName(p)}'s birthday ${formatDate(d)}`)}
 for(const e of (S.exams||[]))if(!['Completed','Missed','Cancelled','Excused'].includes(e.status)&&e.dateISO>=currentDate()&&daysBetween(currentDate(),e.dateISO)<=14)soon.push(`${e.subject} ${e.type.toLowerCase()} ${formatDate(e.dateISO)}`);
 const sec=(t,items)=>items.length?`<h4>${t}</h4>${items.map(x=>`<p>• ${esc(x)}</p>`).join('')}`:'';
 return `<p class="summary-lead">${ff.days} day${ff.days===1?'':'s'} • ${formatDate(ff.start)} → ${formatDate(currentDate())}${why==='reached'?` • reached: ${esc(ff.label)}`:''}</p>
 ${sec('Programs',Object.entries(progs).map(([k,n])=>`${k} — ${n} session${n===1?'':'s'}`))}${sec('Skills',sk.map(([k,d])=>`${lbl[k]||k} +${d.toFixed(1)}`))}
 ${sec('Routine',[ff.stats.study?`Studied ${ff.stats.study} time${ff.stats.study===1?'':'s'}`:'',ff.stats.exercise?`Exercised ${ff.stats.exercise} time${ff.stats.exercise===1?'':'s'}`:''].filter(Boolean))}
 ${sec('Social',[...soc.map(([p,n])=>`Time with ${displayName(p)} ×${n}`),...tierUps,newPeople>0?`Met ${newPeople} new ${newPeople===1?'person':'people'}`:''].filter(Boolean))}${sec('Family',fam)}
 ${sec('Money',[`${dm>=0?'+':''}${money(dm)}${ff.stats.spent?` (spent about ${money(Math.round(ff.stats.spent))})`:''}`])}
 ${sec('Interruptions',ff.interrupts.map(i=>`${formatDate(i.dateISO)}: ${i.title}${i.outcome?` — ${i.outcome}`:i.tier==='hard'?' — played':''}`))}${sec('Health',ff.health||[])}${sec('Handled by your character',(ff.background||[]).slice(-6))}${sec('Coming up',soon.slice(0,5))}
 <div class="modal-action-grid single"><button class="primary" data-close-modal="1">OK</button></div>`}
function ffClick(b){const d=b.dataset;if(d.ffContinue){ffContinue();return true}if(d.ffp){ffPauseChoice(d.ffp);return true}return false}
function ffChange(t){if(t?.dataset?.routine){routine()[t.dataset.routine]=t.value;save();return true}return false}
function ffBadge(){const ff=S?.ffSession,btn=document.getElementById('ff-btn');if(!btn)return;const paused=!!(ff&&ff.status==='paused');btn.classList.toggle('ff-paused',paused);let tag=btn.querySelector('.ff-cont');if(paused){if(!tag){tag=document.createElement('span');tag.className='ff-cont';btn.appendChild(tag)}tag.textContent=` → ${formatDate(ff.target)}`;btn.title=`Fast forward paused — continue to ${ff.label}`}else if(tag)tag.remove()}
