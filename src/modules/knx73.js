
// =====================================================================
// v7.3 K + N + X — free time & scheduling, birthdays, phone chats & calls
// =====================================================================

// ---------- K40. Named relationship tiers ----------
const FRIEND_TIERS=[[0,'Acquaintance'],[40,'Friend'],[60,'Good Friend'],[75,'Close Friend'],[88,'Best Friend']];
const TIER_RANK={Stranger:0,Acquaintance:0,Contact:0,'Former Friend':0,'Old Friend':1,Friend:2,'Good Friend':2,'Casual Friend':2,'Close Friend':3,'Best Friend':4,Dating:3,Serious:4};
function friendTier(p){if(!p||isFamilyPerson(p))return null;if(S.romance?.partnerId===p.id)return p.romanceStage==='partner'?'Serious':'Dating';return friendStatusLabel(p)||friendshipTier(p)}
function tierRank(p){return TIER_RANK[friendTier(p)]??-1}
function tierTick(){
 for(const p of S.people||[]){const t=friendTier(p);if(!t)continue;if(p.tier&&p.tier!==t&&!SIM.skipping){const up=(TIER_RANK[t]||0)>(TIER_RANK[p.tier]||0);if(up)friendshipMilestone(p,t);else if((TIER_RANK[p.tier]||0)>=3&&(TIER_RANK[t]||0)<=1)noteSeparation(p);
   log(up?`${displayName(p)}: ${t}`:`${displayName(p)}: now ${t}`,up?`You and ${firstName(p)} are ${/^[AEIOU]/.test(t)?'an':'a'} ${t.toLowerCase()} now.`:`You and ${firstName(p)} have drifted to ${t.toLowerCase()}.`,up&&TIER_RANK[t]>=3);
   notify(up?'Relationship level up':'Relationship level down',`${displayName(p)} → ${t}`,{sourceType:'tier',sourceId:`tier-${p.id}-${t}`,tab:'people'});
   if(up&&TIER_RANK[t]>=3)S.milestones.unshift({dateISO:currentDate(),age:S.age,title:`💛 ${t}`,text:`${displayName(p,'formal')} became your ${t.toLowerCase()}.`})}
  p.tier=t}
}
// ---------- K36. Social battery, reciprocity, reliability ----------
function ensureSocial(p){p.battery=p.battery??70;p.invites=Object.assign({byMe:0,byThem:0,myAsks:[]},p.invites||{});p.reliability=p.reliability??70;return p}
function introvert(p){return (p.traits||[]).some(t=>['Shy','Quiet'].includes(t))}
function batteryTick(){for(const p of S.people||[]){if(isFamilyPerson(p))continue;ensureSocial(p);p.battery=clamp(p.battery+(introvert(p)?10:15))}}
function drainBattery(p,amt=25){ensureSocial(p);p.battery=clamp(p.battery-(introvert(p)?amt*1.4:amt))}
function adjustReliability(p,d){if(!p)return;ensureSocial(p);p.reliability=clamp(p.reliability+d);adjustRespect(p,d*.4)}
// ---------- K33. Free-time blocks ----------
function busyIntervals(dateISO){
 const busy=[];const wake=420,night=S.age<18?Math.min(bedtimeMinute(),curfewMinute()||1439):1380;busy.push([0,wake],[night,1440]);
 if(needsFormalSchool()&&isSchoolDay(dateISO))busy.push([SCHOOL_DAY.start-30,SCHOOL_DAY.end+20]);
 if(S.age>=18&&S.career?.job&&!isWeekend(dateISO))busy.push([540,1020]);
 for(const ev of S.calendar)if(ev.dateISO===dateISO&&!isTerminal(ev.status)&&ev.type!=='schoolDay'&&ev.startMinute!=null)busy.push([ev.startMinute,Math.max(ev.endMinute??ev.startMinute+60,ev.startMinute+30)]);
 return busy.sort((a,b)=>a[0]-b[0])
}
function freeBlocks(dateISO,min=60){
 const busy=busyIntervals(dateISO),out=[];let cur=0;for(const [a,b] of busy){if(a>cur&&a-cur>=min)out.push({from:cur,to:a});cur=Math.max(cur,b)}if(1440-cur>=min)out.push({from:cur,to:1440});
 const now=dateISO===currentDate()?currentMinute()+30:0;return out.map(b=>({from:Math.max(b.from,now),to:b.to})).filter(b=>b.to-b.from>=min)
}
function freeLabel(b){return `Free ${timeLabel(b.from)}–${timeLabel(Math.min(b.to,1439))}`}
function slotsIn(dateISO,minutes){const out=[];for(const b of freeBlocks(dateISO,Math.min(minutes,120)))for(let m=Math.max(540,Math.ceil(b.from/30)*30);m+Math.min(minutes,180)<=b.to;m+=30)out.push(m);return out}
function knowsSchedule(p){return p.rel>=50||!!p.sharedSchedule}
function npcFreeAt(p,dateISO,m){return npcStatusAt(p,dateISO,m).free||npcStatusAt(p,dateISO,m).atSchool&&false}
function sharedSlots(p,dateISO,minutes){return slotsIn(dateISO,minutes).filter(m=>npcFreeAt(p,dateISO,m)&&npcFreeAt(p,dateISO,Math.min(1439,m+Math.min(minutes,120)-1)))}
// ---------- K34–38. Make plans: day → two time options → NPC response spectrum ----------
let planDraft=null;
function planDays(){const out=[];for(let i=0;i<10;i++){const d=addDays(currentDate(),i);if(i===0&&!freeBlocks(d).length)continue;out.push(d)}return out}
function openPlanModal(personId,step=1){
 const p=personById(personId);if(!p)return;if(S.age<6){toast('At this age, caregivers arrange playdates.');return}ensureSocial(p);
 if(step===1||!planDraft||planDraft.personId!==personId)planDraft={personId,type:null,day:null,times:[]};const d=planDraft,tier=friendTier(p);
 const head=`<p class="muted-text">${esc(displayName(p))} • ${esc(tier||'')}${S.age<18?` • home by ${timeLabel(curfewMinute())}`:''}${knowsSchedule(p)?' • you know their schedule':''}</p>`;
 if(!d.type){const types=Object.entries(PLAN_TYPES).filter(([,t])=>S.age>=t.minAge&&S.age<=(t.maxAge??200));openModal(`Make plans with ${displayName(p)}`,head+`<h4>1. What?</h4><div class="modal-action-grid">${types.map(([k,t])=>`<button data-plan-step="type" data-v="${k}" data-person-id="${p.id}">${esc(t.label)}${t.cost?` • ${money(t.cost)}`:''}</button>`).join('')}</div>`);return}
 if(!d.day){openModal(`Make plans with ${displayName(p)}`,head+`<h4>2. Which day?</h4><div class="day-pick">${planDays().map(x=>{const fb=freeBlocks(x);return `<button data-plan-step="day" data-v="${x}" data-person-id="${p.id}" ${fb.length?'':'disabled'}><b>${x===currentDate()?'Today':x===addDays(currentDate(),1)?'Tomorrow':new Date(x+'T00:00:00Z').toLocaleDateString(undefined,{weekday:'short',timeZone:'UTC'})}</b><small>${formatDate(x)}</small><small>${fb.length?esc(freeLabel(fb[0])):'No free time'}</small></button>`}).join('')}</div>`);return}
 const t=PLAN_TYPES[d.type],slots=slotsIn(d.day,t.overnight?120:t.minutes),shared=knowsSchedule(p)?sharedSlots(p,d.day,t.minutes):null;
 openModal(`Make plans with ${displayName(p)}`,head+`<h4>3. Offer two times on ${formatDate(d.day)}</h4><p class="muted-text">${freeBlocks(d.day).map(freeLabel).join(' • ')||'No free time that day.'}</p><div class="time-chips">${slots.slice(0,14).map(m=>`<button class="small ${d.times.includes(m)?'active':''} ${shared&&shared.includes(m)?'shared':''}" data-plan-step="time" data-v="${m}" data-person-id="${p.id}">${timeLabel(m)}${shared&&shared.includes(m)?' ✓':''}</button>`).join('')||'<p class="muted-text">Nothing fits — pick another day.</p>'}</div>${shared?'<small class="muted-text">✓ = you are both free (you know their schedule).</small>':'<small class="muted-text">You do not know their schedule yet — get closer (50+) or ask.</small>'}<div class="modal-action-grid">${shared?`<button data-plan-step="both" data-person-id="${p.id}">Find a time we're both free</button>`:''}<button data-plan-step="pick" data-person-id="${p.id}">Let them pick a time</button><button class="primary" data-plan-step="send" data-person-id="${p.id}" ${d.times.length===2?'':'disabled'}>Send these two times</button><button class="ghost" data-plan-step="back" data-person-id="${p.id}">Back</button></div>`)
}
function planStep(b){
 const p=personById(b.dataset.personId),d=planDraft;if(!p||!d)return;const k=b.dataset.planStep,v=b.dataset.v;
 if(k==='type')d.type=v;else if(k==='day')d.day=v;else if(k==='back'){if(d.day)d.day=null;else d.type=null;d.times=[]}
 else if(k==='time'){const m=Number(v);d.times=d.times.includes(m)?d.times.filter(x=>x!==m):[...d.times,m].slice(-2)}
 else if(k==='both'){const sh=sharedSlots(p,d.day,PLAN_TYPES[d.type].minutes);d.times=[sh[0],sh[Math.min(sh.length-1,Math.max(1,Math.floor(sh.length/2)))]].filter(x=>x!=null).filter((x,i,a)=>a.indexOf(x)===i);if(d.times.length<1){toast('No shared free time that day.');return}if(d.times.length===1)d.times.push(d.times[0])}
 else if(k==='send'||k==='pick'){sendPlanRequest(p,k==='pick'?'pick':'two');return}
 openPlanModal(p.id,2)
}
function npcPlanResponse(p,type,day,times,mode){
 ensureSocial(p);ensureRomanceProfile(p);const t=PLAN_TYPES[type],tr=p.traits||[],goals=p.goals||[],tier=friendTier(p),rank=TIER_RANK[tier]||0;
 const recent=(p.invites.myAsks||[]).filter(x=>daysBetween(x,currentDate())<=7).length,lead=daysBetween(currentDate(),day);
 if(p.boundaries?.includes('noParties')&&type==='party')return {kind:'no',why:'"Big parties really aren\'t my thing. Something smaller?"'};
 if(t.cost&&goals.includes('saveMoney')&&chance(45))return {kind:'no',why:'"I\'m saving up right now — maybe something free?"'};
 const okTimes=(mode==='pick'?slotsIn(day,t.minutes):times).filter(m=>npcFreeAt(p,day,m));
 if(!okTimes.length){const alt=sharedSlots(p,day,t.minutes)[0]??null,alt2=alt==null?sharedSlots(p,addDays(day,1),t.minutes)[0]:null;if(alt!=null)return observeBusy(p),{kind:'counter',day,time:alt,why:`"I can't at those times — ${timeLabel(alt)} works for me though?"`};if(alt2!=null)return observeBusy(p),{kind:'counter',day:addDays(day,1),time:alt2,why:`"That day is packed for me. What about ${formatDate(addDays(day,1))} at ${timeLabel(alt2)}?"`};const st=npcStatusAt(p,day,times[0]||960);return {kind:'no',why:st.why?st.why.replace(/right now|tonight/,'then'):'"I\'m busy all day, sorry."'}}
 const score=p.rel*.55+p.trust*.2+(p.battery-50)*.3+(p.invites.byThem>=2?4:0)-(recent>=2?8*(recent-1):0)+(lead===0&&rank<3?-8:lead>=2?5:0)+(mode==='pick'?8:3)+(p.reliability-70)*.4+(tr.includes('Outgoing')?6:0)-(tr.includes('Shy')&&type==='party'?12:0)-(p.conflict||0)*.4+(type==='study'&&goals.includes('goodGrades')?12:0)+Math.random()*20-10;
 const time=mode==='pick'?okTimes[Math.floor(Math.random()*Math.min(okTimes.length,4))]:okTimes[0];
 if(score>=78)return {kind:'enthusiastic',day,time,why:rand(['"YES. Finally — I was hoping you\'d ask!"','"Absolutely, I\'m so in."'])};
 if(score>=62)return {kind:'yes',day,time,why:rand(['"Sure, sounds good!"','"Yeah, let\'s do it."'])};
 if(score>=50)return {kind:'reluctant',day,time,why:p.battery<40?'"…Yeah, okay. I\'m kind of tired this week, but okay."':'"Uh, sure, I guess."'};
 if(score>=42)return chance(50)?{kind:'maybe',day,time,why:`"Maybe? Let me check — I'll tell you by ${timeLabel(Math.min(1290,currentMinute()+180))}."`}:{kind:'counter',day:addDays(day,lead<2?2:1),time:time,why:`"Not then — how about ${formatDate(addDays(day,lead<2?2:1))}, same time?"`};
 return {kind:'no',why:recent>=3?'"You\'ve asked a lot this week… I need a little space."':(p.conflict||0)>20?'"Honestly, I\'m still annoyed about last time."':rand(['"I already have plans, sorry."','"Not this time — maybe another day?"'])}
}
function makePlanRecord(p,type,day,start,{status='Accepted',reason='',mood=null,groupIds=null,host='player'}={}){
 const t=PLAN_TYPES[type],plan={id:uid('plan'),type,title:groupIds?`Group ${t.label.toLowerCase()} (${groupIds.length+1})`:`${t.label} with ${displayName(p)}`,personId:p.id,groupIds,hostIsPlayer:host==='player',dateISO:day,startMinute:start,endMinute:t.overnight?1439:Math.min(1439,start+t.minutes),location:t.loc,status,createdDate:currentDate(),reason,mood};
 S.plans.unshift(plan);if(S.plans.length>60)S.plans.length=60;if(status==='Accepted')schedulePlanCalendar(plan);return plan
}
function sendPlanRequest(p,mode){
 const d=planDraft;closeChoiceModal();if(!d?.type||!d.day){toast('Pick an activity and a day.');return}ensureSocial(p);p.invites.byMe++;p.invites.myAsks=[...(p.invites.myAsks||[]),currentDate()].slice(-8);
 const slot={dateISO:d.day,start:(d.times[0]??960)},perm=needsPermission(d.type,slot);if(perm.need&&!caregiverYes(PLAN_TYPES[d.type].overnight?-8:0)){log('Your caregiver says no',`You ask first (${perm.reasons.join(', ')}). The answer is no, so you do not send the invite.`);planDraft=null;return}
 const r=npcPlanResponse(p,d.type,d.day,d.times,mode);const t=PLAN_TYPES[d.type],th=()=>thread('plan',`plan-${p.id}-${d.day}`,`${t.label} with ${displayName(p)}`,[p.id]);
 if(['enthusiastic','yes','reluctant'].includes(r.kind)){const plan=makePlanRecord(p,d.type,r.day,r.time,{reason:r.why,mood:r.kind});p.rel=clamp(p.rel+(r.kind==='enthusiastic'?2:r.kind==='yes'?1:0));if(mode==='pick')p.trust=clamp(p.trust+1);threadStep(th(),'Accepted',r.why);log(r.kind==='reluctant'?`${firstName(p)} agreed… reluctantly`:`${firstName(p)} said yes`,`${r.why} ${t.label} on ${formatDate(plan.dateISO)} at ${timeLabel(plan.startMinute)}.${r.kind==='reluctant'?' They might not be at their best.':''}`)}
 else if(r.kind==='counter'){openModal(`${displayName(p)} suggests another time`,`<p>${esc(r.why)}</p><div class="modal-action-grid"><button class="primary" data-counter="yes" data-person-id="${p.id}" data-type="${d.type}" data-day="${r.day}" data-time="${r.time}">Accept ${formatDate(r.day)} ${timeLabel(r.time)}</button><button data-counter="no" data-person-id="${p.id}">Decline</button></div>`);return}
 else if(r.kind==='maybe'){const plan=makePlanRecord(p,d.type,r.day,r.time,{status:'Maybe',reason:r.why});plan.answerBy={dateISO:currentDate(),minute:Math.min(1290,currentMinute()+180)};scheduleFollowUp('npcAnswer',{planId:plan.id},plan.answerBy);log(`${firstName(p)} might come`,r.why)}
 else{recordOutcome('Plan',`${t.label} with ${displayName(p,'formal')}`,'Declined',r.why);log(`${firstName(p)} can't make it`,r.why)}
 planDraft=null;advanceTime(5,{silent:true})
}
function counterReply(b){const p=personById(b.dataset.personId);closeChoiceModal();if(!p)return;if(b.dataset.counter==='yes'){makePlanRecord(p,b.dataset.type,b.dataset.day,Number(b.dataset.time),{reason:'Their suggested time'});p.rel=clamp(p.rel+2);log('Plans made',`You take ${firstName(p)}'s suggestion: ${formatDate(b.dataset.day)} at ${timeLabel(Number(b.dataset.time))}.`)}else{p.rel=clamp(p.rel-2);log('No plans this time',`You turn down ${firstName(p)}'s suggestion. They seem a little let down.`)}}
// K39. Group plans
function planGroupOuting(type,day,times,gid=null){
 const g=(S.groups||[]).find(x=>x.id===gid)||(S.groups||[])[0];if(!g){toast('You do not have a friend group yet.');return}const mem=g.members.map(personById).filter(Boolean),res=mem.map(p=>({p,r:npcPlanResponse(p,type,day,times,'two')}));
 const tally={};for(const x of res)if(['enthusiastic','yes','reluctant'].includes(x.r.kind)&&x.r.day===day)tally[x.r.time]=(tally[x.r.time]||0)+1;const best=Object.entries(tally).sort((a,b)=>b[1]-a[1])[0];
 if(!best){log('Group plans fell through',`Nobody in ${g.name} could make those times.`);return}const time=Number(best[0]),going=res.filter(x=>['enthusiastic','yes','reluctant'].includes(x.r.kind)&&x.r.time===time).map(x=>x.p),left=res.filter(x=>!going.includes(x.p)&&['enthusiastic','yes','reluctant'].includes(x.r.kind)).map(x=>x.p);
 const plan=makePlanRecord(going[0],type,day,time,{groupIds:going.slice(1).map(p=>p.id),reason:'Group outing'});left.forEach(p=>{p.rel=clamp(p.rel-1);rememberPerson(p,'The group picked a time you could not make.')});
 log('Group plans',`${going.map(firstName).join(', ')} can make ${formatDate(day)} at ${timeLabel(time)}.${left.length?` ${left.map(firstName).join(' and ')} can't — and feel a bit left out.`:''}`)
}
// K38. "I'm busy" white lies
function noteOuting(where){devNewPlace(where);S.outings=(S.outings||[]).filter(o=>daysBetween(o.dateISO,currentDate())<=3);S.outings.push({dateISO:currentDate(),minute:currentMinute(),where})}
function lieCheck(){
 const lies=(S.whiteLies||[]).filter(l=>!l.resolved);for(const l of lies){if(l.dateISO>=currentDate())continue;l.resolved=true;const seen=(S.outings||[]).some(o=>o.dateISO===l.dateISO&&o.minute>=l.start-60&&o.minute<=l.end+60),p=personById(l.personId);if(!p)continue;
  if((seen&&chance(45))||chance(8)){p.trust=clamp(p.trust-8);p.rel=clamp(p.rel-4);rememberPerson(p,'Found out you were not actually busy.',2);if(!SIM.skipping)log(`${firstName(p)} found out`,seen?`${firstName(p)} saw that you were out ${l.dateISO===addDays(currentDate(),-1)?'yesterday':'that day'} — after you said you were busy. "You could have just said no."`:`Word gets back to ${firstName(p)} that you were not really busy.`)}}
 S.whiteLies=(S.whiteLies||[]).filter(l=>!l.resolved||daysBetween(l.dateISO,currentDate())<=7)
}
// ---------- N. Birthdays ----------
function randomMD(){const m=1+Math.floor(Math.random()*12),d=1+Math.floor(Math.random()*28);return `${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`}
function ensureBirthdays(){for(const n of S.npcs||[])n.bday=n.bday||randomMD();for(const p of S.people||[]){if(p.bday)continue;const n=npcById(p.npcId);p.bday=n?.bday||randomMD()}}
function birthdayPeopleOn(dateISO){const md=dateISO.slice(5);return (S.people||[]).filter(p=>p.bday===md&&!p.movedAway)}
function careAboutBirthday(p){return isFamilyPerson(p)||tierRank(p)>=2}
function birthdayTick(){
 ensureBirthdays();const today=currentDate(),y=today.slice(0,4);
 for(const p of S.people){if(!careAboutBirthday(p)||p.movedAway)continue;const soon=addDays(today,3).slice(5),age=personAge(p)+1;
  if(p.bday===soon&&!SIM.skipping)notify('Birthday coming up',`${displayName(p)}'s birthday is in 3 days${isFamilyPerson(p)?'':` (turning ${age})`}. Gift? Card?`,{sourceType:'bday',sourceId:`bday-soon-${p.id}-${y}`,tab:'people'});
  if(p.bday===today.slice(5)&&!SIM.skipping){notify("It's a birthday",`Today is ${displayName(p)}'s birthday.`,{sourceType:'bday',sourceId:`bday-${p.id}-${y}`,tab:'people'})}
  if(p.bday===addDays(today,5).slice(5)&&!isFamilyPerson(p)&&tierRank(p)>=3&&S.age>=6&&!SIM.skipping&&chance(70))npcBirthdayInvite(p);
  const yday=addDays(today,-1);if(p.bday===yday.slice(5)){p.bdayWished=p.bdayWished||{};if(!p.bdayWished[yday.slice(0,4)]&&S.age>=5){const pen=S.romance?.partnerId===p.id?10:{4:8,3:5,2:2}[tierRank(p)]||(p.role==='parent'?3:0);if(pen){p.rel=clamp(p.rel-pen);rememberPerson(p,'You forgot their birthday.',2);if(!SIM.skipping)log(`You forgot ${firstName(p)}'s birthday`,`${firstName(p)} does not say anything about it. That is somehow worse.`)}}}}
}
function wishBirthday(personId,how){const p=personById(personId);if(!p)return;const y=currentDate().slice(0,4);p.bdayWished=p.bdayWished||{};if(p.bdayWished[y]){toast('You already wished them a happy birthday.');return}if(how==='message'&&!canUsePhone()){toast('You need a phone to message.');return}
 p.bdayWished[y]=true;p.rel=clamp(p.rel+(how==='inperson'?3:2));rememberPerson(p,'You wished them a happy birthday.');if(how==='message')chatAdd(p.id,'me','Happy birthday!! 🎉','wish');advanceTime(how==='inperson'?10:3,{silent:true});log(`Happy birthday, ${firstName(p)}`,how==='inperson'?`${firstName(p)} grins. "You remembered!"`:`You send a birthday message. ${firstName(p)} replies with a row of hearts.`)}
function npcBirthdayInvite(p,partyDay=null){const yk=(partyDay||addDays(currentDate(),5)).slice(0,4);p.bdayInviteYear=p.bdayInviteYear||{};if(p.bdayInviteYear[yk])return null;p.bdayInviteYear[yk]=true;const day=partyDay||addDays(currentDate(),5),start=isWeekend(day)?840:1020,plan=makePlanRecord(p,'party',day,start,{status:'Pending',host:'npc'});plan.title=`${firstName(p)}'s Birthday Party`;plan.location=`${firstName(p)}'s house`;plan.birthdayOf=p.id;plan.answerBy={dateISO:addDays(currentDate(),2),minute:1200};
 queueEvent({type:'invitation',title:`${p.fullName||p.name}'s Birthday Party`,text:`${formatDate(day)} at ${timeLabel(start)}. RSVP by ${formatDate(plan.answerBy.dateISO)}.`,participants:[p.id],payload:{planId:plan.id},priority:3,expiresAt:plan.answerBy,choices:[{id:'accept',label:'Accept'},{id:'maybe',label:'Maybe'},{id:'decline',label:'Decline politely'},{id:'busy',label:"Say you're busy"}]});chatAdd(p.id,'them',`My birthday party is ${formatDate(day)}! You coming? 🎂`,'invite')}
// N47. The player's own birthday: surprise party, gifts, invitations, partner
function playerBirthdayExtras(){
 if(S.age<4)return;const friends=S.people.filter(p=>!isFamilyPerson(p)&&tierRank(p)>=1&&!p.movedAway),close=friends.filter(p=>tierRank(p)>=2);
 if(needsFormalSchool()&&isSchoolDay()&&friends.length>=2&&chance(45))scheduleFollowUp('surpriseParty',{ids:friends.slice(0,5).map(p=>p.id)},{minute:705});
 for(const p of close)if(chance(60)){const k=giftFor(p);if(k){addItem(k,`from ${displayName(p,'formal')}`);if(!SIM.skipping)log(`🎁 From ${firstName(p)}`,`${firstName(p)} gives you a ${D.catalog[k].name.toLowerCase()} for your birthday.`)}}
 if(canUsePhone())for(const p of friends.slice(0,4))chatAdd(p.id,'them',rand(['Happy birthday!! 🎉','HBD!!! 🥳 have the best day','happy birthday!! old now lol']),'bdayWish');
 const inv=close.filter(p=>chance(35)).slice(0,2);for(const p of inv)if(!SIM.skipping)npcInvitesPlayer(p);
 const pp=partnerPerson();if(pp&&eligibleRomance(pp)&&!SIM.skipping){const k=giftFor(pp)||'greetingCard';addItem(k,`from ${displayName(pp,'formal')}`);log(`💝 ${firstName(pp)}`,`${firstName(pp)} gives you ${D.catalog[k].name.toLowerCase()} and plans something just for the two of you.`);makePlanRecord(pp,S.age>=18?'movie':'hangout',addDays(currentDate(),isWeekend(currentDate())?0:1),1080,{reason:'Your birthday'})}
}
function giftFor(p){const pool=['book','comicBook','boardGame','puzzle','artSupplies','headphones','sportsBall','greetingCard','snackPack'].filter(k=>D.catalog[k]&&S.age>=D.catalog[k].minAge);return pool.length?rand(pool):null}
// ---------- X. Phone: chats ----------
function chatOf(id){S.chats=S.chats||{};return S.chats[id]=S.chats[id]||{msgs:[]}}
function chatAdd(id,from,text,kind='chat',extra={}){const c=chatOf(id),m=Object.assign({id:uid('cm'),from,text,kind,dateISO:currentDate(),minute:currentMinute(),read:from==='me'},extra);c.msgs.push(m);if(c.msgs.length>60)c.msgs.splice(0,c.msgs.length-60);return m}
function unreadChats(){return Object.values(S.chats||{}).reduce((a,c)=>a+c.msgs.filter(m=>m.from==='them'&&!m.read).length,0)}
const CHAT_KINDS={
 chitchat:{texts:['lol did you see what happened in class today','ok this song is stuck in my head forever','what are you doing rn','i just saw the funniest video'],opts:[['warm','Reply warmly'],['joke','Send a meme back'],['short','"k"']]},
 homework:{texts:['do you get the math homework??','wait what pages were we supposed to read','help me with question 4 pls 😭'],opts:[['explain','Explain it'],['answers','Send your answers'],['stuck','"I\'m stuck too"']],minAge:7,school:true},
 gossip:{texts:['ok you will NOT believe what i heard','so apparently…','don\'t tell anyone but'],opts:[['join','Join in'],['defend','Defend the person'],['change','Change the subject']],minAge:10},
 advice:{texts:['can i ask you something kind of serious','i need advice. it\'s about my family','i don\'t know what to do about something'],opts:[['listen','Listen and ask questions'],['direct','Give direct advice'],['joke','Make a joke'],['later','"Can we talk later?"']],minAge:10},
 parent:{texts:['Dinner is ready in 20 minutes.','Can you grab milk on the way home?','Don\'t forget your homework tonight.','Call me when you can.'],opts:[['ok','"Okay! 👍"'],['onmyway','"On my way"'],['ignore','Ignore it']]}
};
function incomingMessage(p,kind){const k=CHAT_KINDS[kind];if(!k)return;const m=chatAdd(p.id,'them',rand(k.texts),kind,{turn:1});if(!SIM.skipping)notify(`💬 ${displayName(p)}`,m.text,{sourceType:'chat',sourceId:m.id,tab:'phone'});return m}
function scheduleMessages(){
 if(SIM.skipping)return;const watch=!!findUsable('kidsWatch'),phone=S.age>=D.ageRules.phone&&S.phone.owned;if(!phone&&!watch)return;
 const fam=S.people.filter(p=>p.role==='parent'),fr=phone?S.people.filter(p=>!isFamilyPerson(p)&&tierRank(p)>=1&&!p.movedAway):[];
 const n=Math.min(5,Math.round(fr.length*.35+(chance(40)?1:0)+(Math.random()*1.5)));
 for(let i=0;i<n&&fr.length;i++){const p=rand(fr),pool=Object.entries(CHAT_KINDS).filter(([k,x])=>k!=='parent'&&S.age>=(x.minAge||0)&&(!x.school||needsFormalSchool())).map(([k])=>k);scheduleFollowUp('incomingMsg',{personId:p.id,kind:rand(['chitchat','chitchat',...pool])},{minute:600+Math.floor(Math.random()*720)})}
 if(fam.length&&chance(55))scheduleFollowUp('incomingMsg',{personId:rand(fam).id,kind:parentMessageKind()},{minute:900+Math.floor(Math.random()*240)});
 if(phone&&fr.length&&chance(18)){const p=rand(fr.filter(x=>tierRank(x)>=2).concat(fr));scheduleFollowUp('incomingCall',{personId:p.id,why:tierRank(p)>=3&&chance(25)?'distress':'chat'},{minute:960+Math.floor(Math.random()*240)})}
}
function replyChat(personId,msgId,intent,custom=''){
 const p=personById(personId),c=chatOf(personId),m=c.msgs.find(x=>x.id===msgId);if(!p||!m||m.replied)return;m.replied=true;m.read=true;
 const delay=daysBetween(m.dateISO,currentDate())*1440+(currentMinute()-m.minute),rank=tierRank(p);let rel=0,trust=0,line='',reply='';
 const k=m.kind;
 if(k==='chitchat'||k==='bdayWish'||k==='wish'){if(intent==='warm'||intent==='agree'||intent==='comfort'){rel=1.5;reply=rand(['haha yes!!','omg same','😂😂'])}else if(intent==='joke'){rel=1;S.needs.fun=clamp(S.needs.fun+3);reply='LMAO'}else{rel=rank>=3?-0.5:0;reply='…ok'}}
 else if(k==='homework'){if(intent==='explain'){rel=2;practiceSkill('knowledge',.6);advanceTime(20,{silent:true});reply='OHHH that makes sense thank you!!'}else if(intent==='answers'){rel=2;addRep('troublemaker',1);reply='lifesaver 🙏';if(chance(10)){S.school.behavior=clamp(S.school.behavior-4);line=' Later, the teacher notices two identical answers. Awkward.'}}else{rel=.5;reply='ugh ok same'}}
 else if(k==='gossip'){if(intent==='join'){rel=1;addRep('social',.3);addRep('troublemaker',.5);reply='RIGHT??'}else if(intent==='defend'){rel=-0.5;trust=2;addRep('kindness',1);reply='…fair, i guess'}else{reply='ok anyway'}}
 else if(k==='advice'){if(m.turn===1){if(intent==='later'){rel=-1;reply='oh. ok.'}else{const good=intent==='listen'||intent==='comfort'||(intent==='direct'&&(p.traits||[]).includes('Ambitious'));rel=good?3:intent==='joke'?-1:1;trust=good?4:0;reply=good?'thank you. i didn\'t know who else to tell.':intent==='joke'?'…i was being serious':'yeah… maybe you\'re right';if(good){const n=chatAdd(p.id,'them','can we hang out this week? i feel better already','advice',{turn:2})}}}else{rel=intent==='agree'||intent==='warm'?2:0;reply='🙂'}}
 else if(k==='parentSocial'){if(intent==='ignore'){p.rel=clamp(p.rel-1);reply=''}else{p.rel=clamp(p.rel+1.5);S.family.closeness=clamp(S.family.closeness+1);reply='❤️'}}
 else if(k==='parent'){const cg=p;if(intent==='ignore'){S.family.tension=clamp(S.family.tension+1);reply=''}else{cg.rel=clamp(cg.rel+.5);reply='👍'}}
 else if(k==='invite'){rel=0}
 if(rank>=3&&delay>360&&k!=='parent'){rel-=1;line+=' (They noticed you took a while to reply.)'}
 p.rel=clamp(p.rel+rel);p.trust=clamp(p.trust+trust);chatAdd(p.id,'me',custom||({warm:'❤️ haha',joke:'[meme]',short:'k',explain:'Ok so basically…',answers:'[photo of answers]',stuck:'I\'m stuck too 😭',join:'NO WAY',defend:'Hey, that\'s not fair to them',change:'Anyway, did you see…',listen:'I\'m here. What happened?',direct:'Honestly? Talk to them directly.',later:'Can we talk later?',ok:'Okay! 👍',onmyway:'On my way',agree:'Yes!',comfort:'I\'m here for you',ask:'Wait, what do you mean?'}[intent]||'…'),'reply',{intent});
 if(reply&&!((k==='parent'||k==='parentSocial')&&intent==='ignore'))chatAdd(p.id,'them',reply,'auto',{read:false,auto:true});advanceTime(3,{silent:true});if(line)log(`Messages • ${firstName(p)}`,line.trim())
}
function leftOnReadTick(){for(const [id,c] of Object.entries(S.chats||{})){const p=personById(id);if(!p)continue;for(const m of c.msgs)if(m.from==='them'&&m.read&&!m.replied&&!m.auto&&!m.lorChecked&&m.readAt&&daysBetween(m.readAt,currentDate())>=1&&['chitchat','advice','homework'].includes(m.kind)){m.lorChecked=true;const pen=tierRank(p)>=3?2:tierRank(p)>=2?1:0;if(pen){p.rel=clamp(p.rel-pen);rememberPerson(p,'You left them on read.')}}}}
// Messages app UI
let chatView=null;
function openMessagesModal(){
 chatView=null;
 const ids=Object.keys(S.chats||{}).filter(id=>personById(id)).sort((a,b)=>{const la=chatOf(a).msgs.slice(-1)[0],lb=chatOf(b).msgs.slice(-1)[0];return stamp(lb?.dateISO||'0000-01-01',lb?.minute||0).localeCompare(stamp(la?.dateISO||'0000-01-01',la?.minute||0))});
 openModal('Messages',`${ids.length?ids.map(id=>{const p=personById(id),c=chatOf(id),last=c.msgs.slice(-1)[0],un=c.msgs.filter(m=>m.from==='them'&&!m.read).length;return `<button class="chat-row" data-chat-open="${id}"><b>${esc(displayName(p))}</b><small>${esc(friendTier(p)||p.role)} • ${esc((last?.from==='me'?'You: ':'')+(last?.text||''))}</small>${un?`<em class="subtab-badge">${un}</em>`:''}</button>`}).join(''):'<p class="muted-text">No conversations yet.</p>'}<h4>Start a conversation</h4><div class="modal-action-grid">${S.people.filter(p=>!isFamilyPerson(p)||p.role==='parent').slice(0,10).map(p=>`<button class="small" data-chat-open="${p.id}">${esc(displayName(p))}</button>`).join('')}</div>`)
}
function openThread(id){
 chatView=id;const p=personById(id),c=chatOf(id);for(const m of c.msgs)if(m.from==='them'&&!m.read){m.read=true;m.readAt=currentDate();resolveNotificationsFor(m.id)}
 const pending=[...c.msgs].reverse().find(m=>m.from==='them'&&!m.replied&&!m.auto&&CHAT_KINDS[m.kind]),opts=pending?(pending.kind==='advice'&&pending.turn===2?[['agree','"Yes, let\'s!"'],['warm','"Anytime ❤️"']]:CHAT_KINDS[pending.kind].opts):[];
 openModal(`${displayName(p)} • ${friendTier(p)||p.role}`,`<div class="chat-thread">${c.msgs.slice(-14).map(m=>`<div class="bubble ${m.from}"><span>${esc(m.text)}</span><small>${timeLabel(m.minute)}${m.from==='me'?'':''}</small></div>`).join('')||'<p class="muted-text">Say something.</p>'}</div>${pending?`<div class="chat-replies">${opts.map(([i,l])=>`<button class="small" data-chat-reply="${i}" data-msg="${pending.id}" data-person-id="${id}">${esc(l)}</button>`).join('')}</div><div class="chat-custom"><input id="chat-text" maxlength="160" placeholder="Write your own…" aria-label="Write your own reply"><div class="intent-row">${['warm','joke','agree','comfort','ask'].map(i=>`<button class="small ghost" data-chat-custom="${i}" data-msg="${pending.id}" data-person-id="${id}">${{warm:'Warm',joke:'Joke',agree:'Agree',comfort:'Comfort',ask:'Ask'}[i]}</button>`).join('')}</div><small class="muted-text">Type anything, then pick what you mean so the game knows how it lands.</small></div>`:`<div class="modal-action-grid"><button class="small" data-chat-send="hi" data-person-id="${id}">Say hi</button><button class="small" data-chat-send="funny" data-person-id="${id}">Share something funny</button><button class="small" data-chat-send="how" data-person-id="${id}">Ask how they are</button></div>`}<div class="modal-action-grid"><button class="ghost small" data-chat-back="1">All messages</button></div>`)
}
function sendFirst(id,kind){const p=personById(id);if(!p)return;if(!canUsePhone()&&!(findUsable('kidsWatch')&&isFamilyPerson(p))){toast(phoneLockReason());return}if(classConfiscation())return;chatAdd(id,'me',{hi:'hey!',funny:'[sends a ridiculous video]',how:'how are you doing?'}[kind]);p.rel=clamp(p.rel+.5);const st=npcStatusAt(p);scheduleFollowUp('npcReply',{personId:id},{minute:Math.min(1439,currentMinute()+(st.free?5+Math.floor(Math.random()*40):90+Math.floor(Math.random()*120)))});advanceTime(2,{silent:true})}
// X. Calls
function incomingCall(p,why){
 if(!p)return;if(atSchool()&&periodAt()?.kind==='class'){logMissedCall(p,why,'Your phone was on silent in class.');return}
 const t=why==='parentLate'?`${firstName(p)} is calling. It is past your curfew.`:why==='distress'?`${firstName(p)} is calling. They sound upset.`:`${firstName(p)} is calling.`;
 queueEvent({type:'incomingCall',title:`📞 ${displayName(p)}`,text:t,participants:[p.id],payload:{why},priority:why==='chat'?3:5,expiresAt:{dateISO:currentDate(),minute:Math.min(1439,currentMinute()+15)},choices:[{id:'answer',label:'Answer'},{id:'decline',label:'Decline'},{id:'later',label:'Text "call you later"'}]})
}
function logMissedCall(p,why,note=''){S.callLog=(S.callLog||[]);S.callLog.unshift({personId:p.id,dateISO:currentDate(),minute:currentMinute(),missed:true,voicemail:why==='distress'?'"Hey… call me back when you can. It\'s kind of important."':why==='parentLate'?'"Where are you? Call me NOW."':'"Hey, just calling to talk. Call me back!"'});if(S.callLog.length>30)S.callLog.length=30;if(why==='distress'&&tierRank(p)>=3){p.rel=clamp(p.rel-1)}if(why==='parentLate'){S.family.tension=clamp(S.family.tension+4);S.family.trust=clamp((S.family.trust??60)-4)}if(!SIM.skipping)log(`Missed call • ${firstName(p)}`,`${note?note+' ':''}Voicemail: ${S.callLog[0].voicemail}`)}
function handleIncomingCall(e,id){const p=personById(e.participants?.[0]),why=e.payload?.why;if(!p)return true;
 if(id==='answer'){if(why==='parentLate'){S.family.tension=clamp(S.family.tension+2);log('Mom/Dad on the phone',`"You were supposed to be home already. Come home. Now." You head back.`);S.location='Home'}else if(why==='distress'){advanceTime(40,{silent:true});p.rel=clamp(p.rel+5);p.trust=clamp(p.trust+5);rememberPerson(p,'You picked up when they needed someone.',3);log(`On the phone with ${firstName(p)}`,`${firstName(p)} is crying about ${rand(['a fight at home','a breakup','feeling left out','a bad grade'])}. You mostly listen. By the end they are laughing a little.`)}else{advanceTime(25,{silent:true});p.rel=clamp(p.rel+2);S.needs.social=clamp(S.needs.social+8);log(`Call with ${firstName(p)}`,relationshipStory(p,'call'))}}
 else if(id==='later'){chatAdd(p.id,'me','can\'t talk rn, call you later!');if(why==='parentLate'){S.family.tension=clamp(S.family.tension+3)}log('Call you later',`You text ${firstName(p)} that you will call back.`)}
 else{logMissedCall(p,why,'You declined the call.');if(why!=='parentLate')p.rel=clamp(p.rel-(tierRank(p)>=3?1:0))}
 S.callLog=(S.callLog||[]);if(id==='answer')S.callLog.unshift({personId:p.id,dateISO:currentDate(),minute:currentMinute(),missed:false});return true}
function curfewCallCheck(){if(S.age>=18||SIM.skipping||S.location==='Home'||S.location==='School')return;const cf=curfewMinute(),m=currentMinute();if(!cf||m<cf+15||(S.flags.curfewCall===currentDate()))return;S.flags.curfewCall=currentDate();const cg=S.people.find(x=>x.role==='parent')||caregiverPerson();if(cg)incomingCall(cg,'parentLate')}
// X. Class confiscation
function classConfiscation(){if(!atSchool()||periodAt()?.kind!=='class')return false;if(!chance(25))return false;S.phone.confiscatedUntil=currentDate();S.school.behavior=clamp(S.school.behavior-2);addRep('troublemaker',1);log('Phone confiscated','Your teacher sees your phone under the desk and holds out a hand. You get it back after school.');toast('Phone confiscated until the end of the day');return true}
// X. Kids: smartwatch & video calls with grandparents
function maybeGradeOneWatch(){if(S.education?.watchGiven||parseISO(currentDate()).getUTCFullYear()<2025||S.wealth==='Struggling'||!chance(60))return;S.education.watchGiven=true;addItem('kidsWatch','from your parents (starting Grade 1)');if(!SIM.skipping)log('⌚ A smartwatch for Grade 1','Your parents give you a kids\' smartwatch: you can call and message Mom, Dad and grandparents — nobody else.',true)}
function videoCallFamily(personId){const p=personById(personId);if(!p)return;if(S.age>=13&&canUsePhone()){personAction(personId,'call');return}const cg=caregiverPerson();advanceTime(20,{silent:true});p.rel=clamp(p.rel+3);S.needs.social=clamp(S.needs.social+8);S.needs.fun=clamp(S.needs.fun+4);rememberPerson(p,'Video call on your parent\'s phone.');log(`Video call with ${p.name}`,`${cg?firstName(cg):'A parent'} holds the phone while you show ${p.name} ${rand(['your drawing','a loose tooth','your new toy','what you learned at school'])}. ${p.name} is delighted.`)}
// ---------- Wiring helpers ----------
function knxDaily(){ensureBirthdays();batteryTick();lieCheck();leftOnReadTick();birthdayTick();scheduleMessages();if(sameMonthDay(S.dob,currentDate()))playerBirthdayExtras()}
function knxFollowUp(f){
 if(f.type==='incomingMsg'){const p=personById(f.payload.personId);let k=f.payload.kind;if(k==='parent'&&!livesWithParents())k='parentSocial';if(p&&!SIM.skipping)incomingMessage(p,k);return true}
 if(f.type==='incomingCall'){const p=personById(f.payload.personId);if(p&&!SIM.skipping&&S.phone.owned)incomingCall(p,f.payload.why);return true}
 if(f.type==='npcReply'){const p=personById(f.payload.personId);if(p&&!SIM.skipping)incomingMessage(p,'chitchat');return true}
 if(f.type==='surpriseParty'){if(SIM.skipping||!atSchool())return true;const ps=(f.payload.ids||[]).map(personById).filter(Boolean);queueEvent({type:'surpriseParty',title:'🎉 SURPRISE!',text:`At lunch, ${ps.map(firstName).join(', ')} jump out with a cake and a terrible handmade banner.`,participants:ps.map(p=>p.id),priority:5,expiresDays:1,choices:[{id:'hug',label:'Laugh and hug everyone'},{id:'shy',label:'Turn bright red'},{id:'speech',label:'Make a dramatic speech'}]});return true}
 return false
}
function knxEventChoice(e,id){
 if(e.type==='incomingCall')return handleIncomingCall(e,id);
 if(e.type==='surpriseParty'){const ps=(e.participants||[]).map(personById).filter(Boolean);ps.forEach(p=>{p.rel=clamp(p.rel+4);rememberPerson(p,'Threw you a surprise birthday party at school.',3)});S.happiness=clamp(S.happiness+8);S.needs.social=clamp(S.needs.social+20);addRep('social',2);log('Surprise party',{hug:'You laugh, hug everyone and get frosting on your sleeve. Best lunch of the year.',shy:'You go bright red. Everyone loves it.',speech:'You give a dramatic speech thanking "the academy". Your friends will quote it for weeks.'}[id]||'A great surprise.',true);S.milestones.unshift({dateISO:currentDate(),age:S.age,title:'🎉 Surprise party',text:`Your friends surprised you at school on your ${ordinal(S.age)} birthday.`});return true}
 if(e.type==='invitation'&&id==='busy'){const plan=S.plans.find(x=>x.id===e.payload?.planId),p=personById(e.participants?.[0]);if(plan){plan.status='Declined';const free=freeBlocks(plan.dateISO).some(b=>b.from<=plan.startMinute&&b.to>=plan.startMinute+60);if(free){S.whiteLies=(S.whiteLies||[]);S.whiteLies.push({personId:p?.id,dateISO:plan.dateISO,start:plan.startMinute,end:plan.endMinute})}}if(p)p.rel=clamp(p.rel-.5);log("You said you're busy",`You tell ${p?firstName(p):'them'} you already have plans.`);return true}
 if(e.type==='birthdayParty'||e.type==='birthdayAlt')return ownBirthdayChoice(id,e);
 return false
}
// ---------- HOTFIX H1 — age-appropriate birthday celebrations (single authoritative resolver) ----------
function birthdayFriends(){const a=S.age,span=a<13?2:a<18?3:8;return S.people.filter(p=>!isFamilyPerson(p)&&!p.movedAway&&tierRank(p)>=1&&Math.abs(personAge(p)-a)<=span).sort((x,y)=>y.rel-x.rel)}
function birthdayCelebrationOptions(age=S.age){const fr=birthdayFriends().length>0,o=[];
 if(age<=2){o.push({id:'familyHome',label:'Family celebration at home'},{id:'familyOuting',label:'Family outing'},{id:'skip',label:'Nothing special'});return o}
 if(age<=5){o.push({id:'big',label:'Party at home (your family organizes it)'});if(fr)o.push({id:'playdate',label:'Small playdate party with friends'});o.push({id:'familyRestaurant',label:'Family restaurant'},{id:'playCenter',label:'Indoor play center with a grown-up'},{id:'familyOuting',label:'Family outing'},{id:'skip',label:'Nothing special'});return o}
 if(age<=9){o.push({id:'big',label:'Party at home'});if(fr)o.push({id:'caregiverOuting',label:'Ask your parents to organize an outing with friends'});o.push({id:'dinner',label:'Family dinner'},{id:'familyActivity',label:'Family activity day'});if(age>=7&&fr)o.push({id:'sleepover',label:'Sleepover'});o.push({id:'skip',label:'Nothing special'});return o}
 if(age<=17){o.push({id:'big',label:'Party at home'});if(fr)o.push({id:'friendOuting',label:age<=12?'Ask to celebrate out with friends':'Go out with friends'});o.push({id:'dinner',label:'Small family dinner'});if(fr)o.push({id:'sleepover',label:'Sleepover'});o.push({id:'skip',label:'Nothing special'});return o}
 o.push({id:'big',label:'Host a party'});if(fr)o.push({id:'friendOuting',label:'Go out with friends'});o.push({id:'dinner',label:'Dinner with family'},{id:'skip',label:'Nothing special'});return o}
function birthdayActivity(age){const pool=age<=5?['the indoor play center','the playground','a family restaurant']:age<=9?['bowling','the arcade','a movie','the activity center','the park']:age<=12?['bowling','the arcade','a movie','karaoke','the mall']:['bowling','karaoke','a movie','the arcade','a café','laser tag'];return rand(pool)}
// invited friends answer for themselves (lightweight availability, not a full occasion engine)
function birthdayRsvp(guests){const yes=[],no=[];for(const p of guests){const roll=Math.random()*100,keen=clamp(45+p.rel*.45);if(roll<keen)yes.push(p);else no.push([p,rand(['already has plans','is away that day','is sick','could not get permission from home'])])}return {yes,no}}
function ownBirthdayChoice(id,e){
 const a=S.age,cg=caregiverPerson(),cn=cg?firstName(cg):'Your family',fr=birthdayFriends(),allowed=new Set(birthdayCelebrationOptions(a).map(x=>x.id).concat(['negotiate','accept','alt']));
 if(!allowed.has(id)){toast('That is not an option at your age.');return true}
 const kids=a<13,invite=n=>birthdayRsvp(fr.slice(0,n)),names=ps=>ps.map(firstName).join(', '),declines=no=>no.length?` (${no.map(([p,r])=>`${firstName(p)} ${r}`).join('; ')}.)`:'';let s,mins=90;
 const outingId=a<=9?'caregiverOuting':'friendOuting';
 if(id==='alt'||id==='accept'){id=id==='alt'?'big':'dinner'}
 if(id==='negotiate'){const ok=(S.family.trust??60)>=60&&caregiverApproval(15);if(!ok){log('Birthday plans',`${cn} hears you out but still says no. "Let's do something at home instead."`);id='dinner'}else{log('Birthday plans',`You explain who is coming and how you will get home. ${cn} thinks about it… "Okay. Text me when you get there."`);id=outingId;e={approved:true}}}
 if(id==='friendOuting'||id==='caregiverOuting'){
  const needs=a<18;if(needs&&!(e&&e.approved)){const ok=caregiverApproval(a>=15?20:a>=13?8:0);if(!ok){queueEvent({type:'birthdayAlt',title:'Birthday plans: not this time',text:`${cn} says no to going out ${a<=12?'without more adults around':'this time'}.`,priority:3,expiresDays:1,choices:[{id:'alt',label:'Choose another celebration (party at home)'},...(a>=10?[{id:'negotiate',label:'Talk it over'}]:[]),{id:'accept',label:'Accept the decision'}]});log('Birthday plans',`${cn} says no to going out ${a<=12?'without more adults around':'this time'}.`);return true}}
  const r=invite(4),act=birthdayActivity(a);mins=180;
  if(!r.yes.length){S.family.closeness=clamp(S.family.closeness+2);s=`None of your friends can make it${declines(r.no)}, so ${a<18?`${cn} takes you to ${act} as a family instead`:`you have a quiet dinner out instead`}.`}
  else{r.yes.forEach(p=>{p.rel=clamp(p.rel+3);(p.history=p.history||[]).unshift({dateISO:currentDate(),age:S.age,text:`Celebrated your birthday at ${act}.`,importance:2})});S.needs.fun=clamp(S.needs.fun+20);S.location='Out';
   s=a<=9?`${cn} arranges a birthday trip to ${act} with ${names(r.yes)} and stays nearby the whole time${declines(r.no)}. ${cn} drives everyone home afterwards.`:a<=12?`${cn} drops you and ${names(r.yes)} at ${act} and picks you up after${declines(r.no)}.`:`You celebrate at ${act} with ${names(r.yes)}${declines(r.no)}.${a<18?` Home before curfew.`:''}`}
  noteOuting('birthday outing')}
 else if(id==='playdate'){const r=invite(3);mins=150;r.yes.forEach(p=>{p.rel=clamp(p.rel+3)});s=r.yes.length?`${cn} invites ${names(r.yes)} over for a small playdate party — balloons, cake, and a game everyone gets wrong${declines(r.no)}.`:`Your friends cannot come${declines(r.no)}, so it becomes a cozy family party.`}
 else if(id==='big'){const r=invite(a<=5?4:6);mins=180;r.yes.forEach(p=>{p.rel=clamp(p.rel+3)});S.family.closeness=clamp(S.family.closeness+2);S.needs.social=clamp(S.needs.social+25);if(a>=13)S.flags.loudParty=chance(30);s=r.yes.length?`${a<13?`${cn} sets up a party at home with ${names(r.yes)}`:`A party at home with ${names(r.yes)}`}${declines(r.no)}. Too much cake and a photo everyone will remember.`:`A party at home with family${declines(r.no)}. Small, loud and happy.`}
 else if(id==='sleepover'){const r=invite(3);mins=60;r.yes.forEach(p=>{p.rel=clamp(p.rel+4)});s=r.yes.length?`A sleepover with ${names(r.yes)}${declines(r.no)}: snacks, a movie, and talking way past bedtime${kids?` (${cn} checks in twice)`:''}.`:`Nobody can stay over${declines(r.no)} — movie night with family instead.`}
 else if(['familyHome','familyRestaurant','familyOuting','playCenter','familyActivity','dinner','small'].includes(id)){S.family.closeness=clamp(S.family.closeness+4);mins=id==='familyHome'||id==='dinner'?90:180;
  s={familyHome:'Your family sings, there is cake, and you get frosting everywhere.',familyRestaurant:`${cn} takes the family to your favorite restaurant.`,familyOuting:`${cn} plans a family outing to ${a<=5?'the zoo':'the park'} for your birthday.`,playCenter:`${cn} takes you to the indoor play center and watches from the bench.`,familyActivity:`A family day out: ${birthdayActivity(a)} with ${cn}.`,dinner:'A small family dinner with your favorite food. Quiet, warm, exactly enough.',small:'A small family dinner. Quiet and warm.'}[id]}
 else s='You keep it low-key this year. Some people prefer it that way.';
 advanceTime(mins,{silent:true});if(S.location==='Out')S.location='Home';S.happiness=clamp(S.happiness+(id==='skip'?1:6));log(`🎂 ${ordinal(S.age)} birthday`,s,id!=='skip');return true
}
function knxClick(b){const d=b.dataset;
 if(d.planStep){planStep(b);return true}if(d.counter){counterReply(b);save();render();return true}
 if(d.chatOpen){chatView=null;openThread(d.chatOpen);return true}if(d.chatBack){chatView=null;openMessagesModal();return true}
 if(d.chatReply){if(classConfiscation()){closeChoiceModal();save();render();return true}replyChat(d.personId,d.msg,d.chatReply);openThread(d.personId);save();return true}
 if(d.chatCustom){const t=(document.getElementById('chat-text')?.value||'').trim().slice(0,160);if(!t){toast('Write something first.');return true}replyChat(d.personId,d.msg,d.chatCustom,t);openThread(d.personId);save();return true}
 if(d.chatSend){sendFirst(d.personId,d.chatSend);openThread(d.personId);save();return true}
 if(d.wish){wishBirthday(d.personId,d.wish);save();render();return true}if(d.videoCall){videoCallFamily(d.videoCall);save();render();return true}
 if(d.groupPlan){const g=(S.groups||[]).find(x=>x.id===d.groupPlan)||(S.groups||[])[0];if(!g)return true;const day=nextSchoolDay(currentDate())===currentDate()?addDays(currentDate(),isWeekend(currentDate())?0:(6-weekdayIndex(currentDate()))):currentDate();const dd=isWeekend(day)?day:addDays(currentDate(),Math.max(1,6-weekdayIndex(currentDate())-1));planGroupOuting('hangout',dd,[840,960],g.id);save();render();return true}
 return false}
