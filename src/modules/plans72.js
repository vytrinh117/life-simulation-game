
// ---------- v7.2 PHASE 5a: invitations / RSVP, plans and household rules ----------
const PLAN_TYPES={
 hangout:{label:'Hang out',minutes:120,minAge:6,loc:'the park',text:['You walk around the park and end up talking for ages.','You do nothing in particular together, and it is great.']},
 study:{label:'Study together',minutes:90,minAge:8,loc:'the library',study:true,text:['You quiz each other until the answers come quickly.','Half studying, half laughing — but you both feel readier.']},
 movie:{label:'See a movie',minutes:150,minAge:10,cost:10,loc:'the cinema',text:['The movie is fine; arguing about the ending afterwards is better.','You both jump at the same scene and laugh about it all the way home.']},
 picnic:{label:'Picnic',minutes:150,minAge:7,outdoor:true,loc:'the park',text:['Sandwiches on a blanket and a sky full of clouds shaped like nothing.','Ants find the snacks first. You relocate twice and still have a great time.']},
 gameNight:{label:'Game night',minutes:150,minAge:8,loc:'their place',text:['A board game turns fiercely competitive. Rematch demanded.','You play until someone\'s parent says it is time to go home.']},
 mall:{label:'Go to the mall',minutes:150,minAge:12,cost:15,loc:'the mall',text:['You try on ridiculous hats and buy nothing.','Bubble tea, window shopping and gossip.']},
 sleepover:{label:'Sleepover',minutes:780,minAge:7,maxAge:17,start:1140,overnight:true,permission:true,loc:'their place',text:['Snacks, a movie and whispering long after lights out.','You stay up telling stories until one of you falls asleep mid-sentence.']},
 party:{label:'Party',minutes:180,minAge:13,start:1140,permission:true,loc:'a friend\'s house',text:['Music, too many people in one kitchen, and one great conversation on the stairs.','You meet a few new people and stay later than planned.']}
};
const WHEN_OPTIONS=[['today','Later today'],['tomorrow','Tomorrow after school'],['weekend','This weekend']];
function planSlot(when,type){
 const t=PLAN_TYPES[type],start=t.start??(S.age<10?900:960);let d=currentDate();
 if(when==='today'){let m=Math.max(currentMinute()+60,start);if(isSchoolDay(d)&&needsFormalSchool()&&m<SCHOOL_DAY.end+30)m=SCHOOL_DAY.end+30;if(m+Math.min(t.minutes,240)>1380)return null;return {dateISO:d,start:Math.round(m/15)*15}}
 if(when==='tomorrow'){d=addDays(d,1);return {dateISO:d,start:isSchoolDay(d)&&needsFormalSchool()?Math.max(start,SCHOOL_DAY.end+30):Math.max(start,840)}}
 d=addDays(d,1);while(!isWeekend(d))d=addDays(d,1);return {dateISO:d,start:t.start??840}
}
function needsPermission(type,slot){if(S.age>=18)return {need:false};const t=PLAN_TYPES[type],cf=curfewMinute(),end=slot.start+t.minutes;const reasons=[];if(t.permission&&!teenNotify(type))reasons.push(t.overnight?'a sleepover needs a caregiver\'s OK':'parties need a caregiver\'s OK');if(!t.overnight&&cf!=null&&end>cf)reasons.push(`it ends after your ${timeLabel(cf)} curfew`);if(S.age<10&&!t.overnight)reasons.push('young kids need an adult to arrange plans');return {need:reasons.length>0,reasons}}
function caregiverYes(extra=0){const trust=S.family.trust??60;return caregiverApproval(extra+(trust-60)*.4)}
function npcRsvp(p,type,slot){
 const t=PLAN_TYPES[type],st=npcStatusAt(p,slot.dateISO,slot.start),traits=p.traits||[],goals=p.goals||[];
 if(!st.free&&!st.atSchool)return {answer:'Declined',why:st.why.replace(/right now|tonight/,'then')};
 if(goals.includes('goodGrades')&&type!=='study'&&dayHash(p.id+slot.dateISO+'x')<25)return {answer:'Declined',why:`"I have a test the day after. I really need to study — can we do something after?"`};
 if(type==='party'&&p.boundaries?.includes('noParties'))return {answer:'Declined',why:`"Big parties really aren't my thing. Something smaller?"`};
 if(type==='party'&&traits.includes('Shy')&&chance(60))return {answer:'Declined',why:`"Parties are not really my thing… could we do something smaller?"`};
 if(t.cost&&goals.includes('saveMoney')&&chance(50))return {answer:'Declined',why:`"I'm trying to save money right now. Something free?"`};
 const score=p.rel*.6+p.trust*.25+p.fun*.15-(p.conflict||0)*.5+(type==='study'&&goals.includes('goodGrades')?15:0)+(traits.includes('Outgoing')?8:0)+Math.random()*20-10;
 if(score>=55)return {answer:'Accepted',why:rand([`"Yes! That sounds fun."`,`"I was hoping you'd ask."`,`"Count me in."`])};
 if(score>=42)return {answer:'Maybe',why:`"Maybe — let me check and I'll tell you by ${timeLabel(Math.min(1260,currentMinute()+180))}."`};
 return {answer:'Declined',why:p.conflict>20?`"Honestly, I'm still a bit annoyed about last time."`:rand([`"I already have plans, sorry."`,`"Not this time — maybe another day?"`])}
}
function makePlan(personId,type,when){
 const p=personById(personId),t=PLAN_TYPES[type];if(!p||!t)return;const slot=planSlot(when,type);if(!slot){toast('There is not enough time left today.');return}
 if(slot.dateISO===currentDate()&&isGrounded()||isGrounded()&&slot.dateISO<=S.family.restrictions.groundedUntil){closeChoiceModal();toast(`You are grounded until ${formatDate(S.family.restrictions.groundedUntil)}.`);return}
 const perm=needsPermission(type,slot);
 if(perm.need){const ok=caregiverYes(type==='study'?10:t.overnight?-8:0);if(!ok){const cf=curfewMinute(),canNeg=!t.overnight&&!t.permission&&cf&&slot.start+60<=cf;openModal('Your caregiver says no',`<p>You ask permission because ${esc(perm.reasons.join(' and '))}. The answer is no.</p><div class="modal-action-grid">${canNeg?`<button data-plan-negotiate="${p.id}" data-plan-type="${type}" data-plan-when="${when}">Negotiate: home by ${timeLabel(cf)}</button>`:''}<button data-close-modal="1" data-plan-obey="1">Accept the answer</button>${S.age>=12?`<button class="ghost" data-plan-defy="${p.id}" data-plan-type="${type}" data-plan-when="${when}">Go anyway (disobey)</button>`:''}</div>`);return}
  S.family.trust=clamp((S.family.trust??60)+1);log('Permission granted',`You ask first. ${primaryCaregiver()} says yes${t.overnight?' — call if anything changes':` — home by ${timeLabel(curfewMinute())}`}.`)}
 createPlan(p,type,slot,{})
}
function createPlan(p,type,slot,{defy=false,endBy=null}={}){
 const t=PLAN_TYPES[type],r=npcRsvp(p,type,slot);closeChoiceModal();
 const end=endBy?Math.min(endBy,slot.start+t.minutes):slot.start+t.minutes;
 const plan={id:uid('plan'),type,title:`${t.label} with ${displayName(p)}`,personId:p.id,hostIsPlayer:true,dateISO:slot.dateISO,startMinute:slot.start,endMinute:t.overnight?1439:Math.min(1439,end),location:t.loc,status:r.answer==='Accepted'?'Accepted':r.answer==='Maybe'?'Maybe':'Declined',defy,createdDate:currentDate(),reason:r.why};
 S.plans.unshift(plan);if(S.plans.length>60)S.plans.length=60;
 const th=thread('plan',plan.id,plan.title,[p.id]);
 if(plan.status==='Accepted'){schedulePlanCalendar(plan);threadStep(th,'Accepted',r.why);log(`${displayName(p)} said yes`,`${r.why} ${t.label} on ${formatDate(slot.dateISO)} at ${timeLabel(slot.start)}.`);p.rel=clamp(p.rel+1)}
 else if(plan.status==='Maybe'){plan.answerBy={dateISO:currentDate(),minute:Math.min(1290,currentMinute()+180)};threadStep(th,'Waiting for an answer',r.why);scheduleFollowUp('npcAnswer',{planId:plan.id},plan.answerBy);log(`${displayName(p)} might come`,r.why)}
 else{threadStep(th,'Declined',r.why,{resolve:true});recordOutcome('Plan',plan.title,'Declined',r.why);log(`${displayName(p)} can't make it`,r.why)}
}
function schedulePlanCalendar(plan){notifyParents(plan);const p=personById(plan.personId);createCalendarEvent({id:`plan-${plan.id}`,type:'plan',title:plan.title,dateISO:plan.dateISO,startMinute:plan.startMinute,endMinute:plan.endMinute,graceMinute:Math.min(1439,plan.startMinute+30),payload:{planId:plan.id},location:plan.location,participants:p?[displayName(p)]:[],required:true,source:'social'})}
function planEvent(plan){return S.calendar.find(e=>e.type==='plan'&&e.payload?.planId===plan.id)}
function attendPlan(planId){
 const plan=S.plans.find(x=>x.id===planId),p=plan&&personById(plan.personId);if(!plan||plan.status!=='Accepted'){toast('That plan is not active.');return}recordTraitEvidence('Responsible',{source:'kept a plan',system:'plans',eventId:'plan-'+plan.id,context:plan.type||'plan'});recordTraitEvidence('Social',{source:'spent time with someone',system:'plans',eventId:'plan-'+plan.id,context:plan.type||'plan'});
 const ev=planEvent(plan);if(!ev||isTerminal(ev.status)){toast('That plan already happened.');return}
 if(plan.dateISO>currentDate()){toast(`That is on ${formatDate(plan.dateISO)}.`);return}
 if(atSchool()){toast('You are at school.');return}
 if(currentMinute()<plan.startMinute){if(plan.startMinute-currentMinute()>120){toast(`It starts at ${timeLabel(plan.startMinute)}.`);return}advanceTime(plan.startMinute-currentMinute(),{silent:true})}
 if(currentMinute()>ev.graceMinute){processCalendar();toast('You are too late — they have moved on.');return}
 const t=PLAN_TYPES[plan.type],late=Math.max(0,currentMinute()-plan.startMinute);if(t.cost&&S.age>=12&&!spendOwn(t.cost)){toast(`You need ${money(t.cost)}.`);return}
 setCalendarStatus(ev,'Attending','Arrived');
 const dur=t.overnight?Math.max(60,(24*60-currentMinute())+540):Math.max(30,plan.endMinute-currentMinute());advanceTime(dur,{silent:true});
 noteOuting('plan');if(p){drainBattery(p);adjustReliability(p,late>10?-3:3)}(plan.groupIds||[]).map(personById).filter(Boolean).forEach(g=>{g.rel=clamp(g.rel+3);drainBattery(g)});
 const roll=Math.random()*100+(p?p.rel-50:0)*.4-(late>10?10:0)+(S.weather.type==='Rainy'&&t.outdoor?-20:0)-(plan.mood==='reluctant'?20:plan.mood==='enthusiastic'?-8:0);
 let story=rand(t.text),rel=4,tier;
 if(roll>70){tier='great';rel=7;story+=` ${rand(['It turns into one of those days you remember.','You both agree to do this again soon.'])}`}
 else if(roll<15){tier='awkward';rel=1;story=rand([`The conversation keeps stalling. ${firstName(p)} checks their phone a lot.`,`You end up disagreeing about something small, and it lingers.`])}
 else tier='good';
 if(late>10)story=`You show up ${late} minutes late. ${firstName(p)} noticed. `+story;
 if(t.outdoor&&S.weather.type==='Rainy')story+=' The rain does not help.';
 if(p){p.rel=clamp(p.rel+rel);p.fun=clamp(p.fun+4);p.trust=clamp(p.trust+(late>10?-1:1));rememberPerson(p,`${t.label} on ${formatDate(plan.dateISO)}${tier==='great'?' — a great time':tier==='awkward'?' — a bit awkward':''}.`,tier==='great'?2:1)}
 S.needs.social=clamp(S.needs.social+18);S.needs.fun=clamp(S.needs.fun+14);addRep('social',.6);if(t.study){const sub=bestPrepSubject();if(sub)sub.prep=clamp(sub.prep+8)}
 setCalendarStatus(ev,'Attended',late?'Arrived late':'Attended');plan.status='Attended';
 const th=thread('plan',plan.id,plan.title,[plan.personId]);threadStep(th,'Happened',tier,{resolve:true});recordOutcome('Plan',plan.title,tier==='great'?'Great time':tier==='awkward'?'Awkward':'Good time',story.slice(0,140));
 if(plan.defy)defyCheck(plan);
 log(`${t.label} with ${firstName(p)}`,story)
}
function cancelPlan(planId){
 const plan=S.plans.find(x=>x.id===planId),p=plan&&personById(plan.personId);if(!plan||!['Accepted','Maybe'].includes(plan.status))return;if(p)adjustReliability(p,minutesUntil(plan.dateISO,plan.startMinute)<240?-5:-1);
 const ev=planEvent(plan),mins=minutesUntil(plan.dateISO,plan.startMinute),late=mins<180;
 plan.status='Cancelled by you';if(ev)setCalendarStatus(ev,'Cancelled',late?'Cancelled last minute':'Cancelled in advance');resolveNotificationsFor(plan.id);
 if(p){p.rel=clamp(p.rel-(late?3:1));p.trust=clamp(p.trust-(late?2:0));rememberPerson(p,late?'You cancelled on them at the last minute.':'You cancelled a plan, but told them early.')}
 const th=thread('plan',plan.id,plan.title,[plan.personId]);threadStep(th,'Cancelled',late?'last minute':'in advance',{resolve:true});
 log('Plans cancelled',late?`You message ${firstName(p)} that you can't make it after all. "Oh… okay," comes the reply, a little flat.`:`You let ${firstName(p)} know well ahead of time. "No worries — another time!"`)
}
function planNoShow(ev){
 const plan=S.plans.find(x=>x.id===ev.payload?.planId),p=plan&&personById(plan.personId);setCalendarStatus(ev,'No-show','Did not show up');if(!plan)return;if(p)adjustReliability(p,-15);plan.status='No-show';
 if(p){p.rel=clamp(p.rel-7);p.trust=clamp(p.trust-6);p.conflict=clamp((p.conflict||0)+8);rememberPerson(p,'You said yes, then never showed up.',2)}
 const th=thread('plan',plan.id,plan.title,[plan.personId]);threadStep(th,'No-show','You never showed up');recordOutcome('Plan',plan.title,'No-show','You said yes and did not show up.');
 if(SIM.skipping)return;log(`Stood ${firstName(p)} up`,`${firstName(p)} waited at ${plan.location} for a while, then went home.`);
 scheduleFollowUp('planNoShowTalk',{planId:plan.id},{days:1,minute:Math.max(960,currentMinute())})
}
function defyCheck(plan){const r=familyRules(),p=clamp(25+r.strictness*.4+(plan.endMinute>(curfewMinute()||1439)?15:0)-(S.family.trust-60)*.2,10,85);if(chance(p)){S.family.trust=clamp(S.family.trust-15);S.family.tension=clamp(S.family.tension+8);ground(7,'Went out without permission');log('Caught',`${primaryCaregiver()} finds out you went anyway. The trust you had built takes a real hit — and you are grounded for a week.`)}else{S.family.trust=clamp(S.family.trust-2);log('Got away with it','Nobody noticed this time. It does not feel as good as you expected.')}}
function npcInvitesPlayer(p){
 if(S.age<6)return;const types=Object.entries(PLAN_TYPES).filter(([,t])=>S.age>=t.minAge&&S.age<=(t.maxAge??200)&&(p.age||S.age)>=t.minAge),[type,t]=rand(types.filter(([k])=>inviteTypeAllowed(k)))||[];if(!type||!inviteAllowed(p))return;logInvite(p,type);
 const slot=planSlot(rand(['tomorrow','weekend']),type);if(!slot)return;
 const plan={id:uid('plan'),type,title:`${t.label} with ${displayName(p)}`,personId:p.id,hostIsPlayer:false,dateISO:slot.dateISO,startMinute:slot.start,endMinute:t.overnight?1439:Math.min(1439,slot.start+t.minutes),location:t.loc,status:'Pending',createdDate:currentDate()};
 plan.answerBy=minutesUntil(slot.dateISO,slot.start)>1800?{dateISO:addDays(currentDate(),1),minute:1080}:{dateISO:slot.dateISO,minute:Math.max(0,slot.start-120)};
 S.plans.unshift(plan);thread('plan',plan.id,plan.title,[p.id]);
 queueEvent({type:'invitation',title:`${displayName(p)} invites you: ${t.label.toLowerCase()}`,text:`${formatDate(slot.dateISO)} at ${timeLabel(slot.start)}, ${t.loc}. Answer by ${timeLabel(plan.answerBy.minute)}${plan.answerBy.dateISO!==currentDate()?' '+formatDate(plan.answerBy.dateISO):''}.`,participants:[p.id],payload:{planId:plan.id},priority:3,expiresAt:plan.answerBy,choices:[{id:'accept',label:'Accept'},{id:'maybe',label:'Maybe'},{id:'decline',label:'Decline politely'},{id:'busy',label:"Say you're busy"}]})
}
function handlePlanInvite(e,id){
 const plan=S.plans.find(x=>x.id===e.payload?.planId),p=plan&&personById(plan.personId);if(!plan||!p){log('Invitation','The plan fell through.');return true}
 const th=thread('plan',plan.id,plan.title,[p.id]);
 if(id==='decline'){plan.status='Declined';p.rel=clamp(p.rel-.5);threadStep(th,'Declined','You said no',{resolve:true});log('Declined',`You tell ${firstName(p)} you can't. "Okay, next time!"`);return true}
 if(id==='maybe'){plan.status='Maybe';plan.playerMaybe=true;threadStep(th,'Maybe','You said maybe');log('Maybe',`You tell ${firstName(p)} you will let them know by ${timeLabel(plan.answerBy.minute)}. They are waiting on you.`);notify('Answer pending',`${plan.title} — answer by ${timeLabel(plan.answerBy.minute)}.`,{sourceType:'plan',sourceId:plan.id,tab:'calendar'});return true}
 const perm=needsPermission(plan.type,{dateISO:plan.dateISO,start:plan.startMinute});
 if(perm.need&&!caregiverYes(0)){plan.status='Declined';threadStep(th,'Declined','Caregiver said no',{resolve:true});log('Not allowed',`You ask, but ${primaryCaregiver()} says no (${perm.reasons.join(', ')}). You tell ${firstName(p)}, who understands.`);return true}
 plan.status='Accepted';schedulePlanCalendar(plan);p.rel=clamp(p.rel+2);threadStep(th,'Accepted','You said yes');log('Plans made',`You say yes. ${plan.title} on ${formatDate(plan.dateISO)} at ${timeLabel(plan.startMinute)}.`);return true
}
function answerMaybe(planId,yes){const plan=S.plans.find(x=>x.id===planId);if(!plan||plan.status!=='Maybe'||!plan.playerMaybe)return;const fake={payload:{planId}};handlePlanInvite(fake,yes?'accept':'decline');resolveNotificationsFor(planId);save();render()}
function plansTick(){
 const now=nowStamp();
 for(const plan of S.plans){
  if(plan.status==='Maybe'&&plan.playerMaybe&&plan.answerBy&&now>stampOf(plan.answerBy)){plan.status='Expired';const p=personById(plan.personId);if(p){p.rel=clamp(p.rel-1);rememberPerson(p,'You never gave a real answer about plans.')}resolveNotificationsFor(plan.id);if(!SIM.skipping)log('Never answered',`${firstName(p)} takes your silence as a no and makes other plans.`)}
  if(plan.status==='Accepted'&&plan.dateISO>currentDate()&&!plan.npcCancelChecked){plan.npcCancelChecked=true;if(chance(6)){const p=personById(plan.personId);plan.status='Cancelled by them';const ev=planEvent(plan);if(ev)setCalendarStatus(ev,'Cancelled','They cancelled');const why=rand(['a family thing came up','they are sick','they forgot they had a test to study for']);if(!SIM.skipping){log(`${firstName(p)} cancelled`,`"I'm so sorry — ${why}. Rain check?"`);notify('Plans cancelled',`${firstName(p)} cancelled: ${why}.`,{sourceType:'plan',sourceId:plan.id})}}}
 }
 S.plans=S.plans.filter(x=>['Accepted','Maybe','Pending'].includes(x.status)||x.dateISO>=addDays(currentDate(),-30))
}
function plansHtml(){const live=S.plans.filter(x=>['Accepted','Maybe','Pending'].includes(x.status)).sort((a,b)=>a.dateISO.localeCompare(b.dateISO));if(!live.length)return '<p class="muted-text">No plans yet. Open someone and choose "Make plans".</p>';return live.map(x=>{const ev=planEvent(x),today=x.dateISO===currentDate(),can=today&&ev&&!isTerminal(ev.status)&&currentMinute()<=ev.graceMinute&&currentMinute()>=x.startMinute-120;return `<div class="calendar-row"><div><b>${esc(x.title)}</b><small>${formatDate(x.dateISO)} • ${timeLabel(x.startMinute)} • ${esc(x.location)}${x.status==='Maybe'?` • answer by ${timeLabel(x.answerBy?.minute||0)}`:''}${x.defy?' • without permission':''}</small></div><div class="inline-actions">${statusTag(x.status)}${can?`<button class="small primary" data-plan-go="${x.id}">Go</button>`:''}${x.status==='Maybe'&&x.playerMaybe?`<button class="small" data-plan-yes="${x.id}">Yes</button><button class="small ghost" data-plan-no="${x.id}">No</button>`:''}${x.status==='Accepted'?`<button class="small ghost" data-plan-cancel="${x.id}">Cancel</button>`:''}</div></div>`}).join('')}
function houseRulesHtml(){if(S.age>=18)return '<p class="muted-text">You set your own rules now.</p>';const r=familyRules();return `${statRow('Bedtime',timeLabel(bedtimeMinute()))}${statRow('Curfew',timeLabel(curfewMinute()))}${statRow('Going out',S.age<10?'Only with an adult':S.age<13?'Nearby, with permission':'With permission')}${statRow('Sleepovers & parties','Ask first')}${statRow('Strictness',Math.round(r.strictness)+'%')}${statRow('Trust',Math.round(S.family.trust??60)+'%')}${isGrounded()?`<p class="urgent-text">Grounded until ${formatDate(S.family.restrictions.groundedUntil)}.</p>`:''}<p class="muted-text">Asking first and keeping promises builds trust; trust makes future yeses more likely.</p>`}
function handlePlanClick(b){
 const d=b.dataset;
 if(d.planOpen){openPlanModal(d.planOpen);return true}
 if(d.planMake){makePlan(d.planMake,d.planType,d.planWhen);save();render();return true}
 if(d.planNegotiate){const p=personById(d.planNegotiate),slot=planSlot(d.planWhen,d.planType);if(p&&slot){S.family.trust=clamp((S.family.trust??60)+1);log('Negotiated','You agree to be home by curfew. That works.');createPlan(p,d.planType,slot,{endBy:curfewMinute()})}save();render();return true}
 if(d.planDefy){const p=personById(d.planDefy),slot=planSlot(d.planWhen,d.planType);if(p&&slot){S.family.trust=clamp((S.family.trust??60)-3);createPlan(p,d.planType,slot,{defy:true})}save();render();return true}
 if(d.planObey){S.family.trust=clamp((S.family.trust??60)+2);log('You accept the answer','It is annoying, but you let it go. Your caregivers notice.');closeChoiceModal();save();render();return true}
 if(d.planGo){attendPlan(d.planGo);save();render();return true}
 if(d.planCancel){cancelPlan(d.planCancel);save();render();return true}
 if(d.planYes){answerMaybe(d.planYes,true);return true}
 if(d.planNo){answerMaybe(d.planNo,false);return true}
 return false
}
