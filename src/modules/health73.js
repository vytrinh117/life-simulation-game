
// =====================================================================
// v7.3+ PHASE 2A.1 — Health from birth, Looks, Smart (player + NPC foundations)
// v7.3+ PHASE 2A.2 — Centralized illness engine: risk, onset, symptoms, severity, progression, recovery
// Game abstractions only: no real-world diagnosis, treatment or dosing information.
// =====================================================================
const LOOKS_LABELS=[[90,'Striking'],[78,'Very attractive'],[64,'Attractive'],[50,'Good-looking'],[30,'Normal'],[0,'Plain']];
const SMART_LABELS=[[90,'Brilliant'],[75,'Very bright'],[60,'Bright'],[40,'Average'],[20,'Below average'],[0,'Struggles']];
function labelFor(v,table){return (table.find(([t])=>v>=t)||table[table.length-1])[1]}
function looksLabel(v){return labelFor(v??50,LOOKS_LABELS)}
function smartLabel(v){return labelFor(v??50,SMART_LABELS)}
function stableRoll(seed,lo=30,hi=85){let h=0;for(const ch of String(seed))h=(h*31+ch.charCodeAt(0))>>>0;const a=(h%1000)/1000,b=((h>>>10)%1000)/1000;return Math.round(lo+(a+b)/2*(hi-lo))}
function ensurePlayerTraits(){if(S.looks==null)S.looks=stableRoll((S.name||'')+(S.birthDate||S.dob||'')+'looks');if(S.smart==null)S.smart=stableRoll((S.name||'')+(S.birthDate||S.dob||'')+'smart');if(!S.surname)S.surname=S.familyName||'';S.firstName=S.firstName||S.name}
function ensureNpcTraits(o){if(!o)return o;if(o.looks==null)o.looks=stableRoll((o.id||o.firstName)+'looks',20,92);if(o.smart==null)o.smart=stableRoll((o.id||o.firstName)+'smart',20,92);return o}
function smartLearnFactor(){return 0.85+(S.smart??50)/100*0.3} // 0.85 … 1.15 — aptitude helps, never decides
// ---------- Illness library (gameplay abstractions) ----------
const ILLNESSES={
 cold:{label:'Common cold',symptoms:['Cough','Runny nose','Sore throat','Sneezing','Fatigue'],days:[4,7],sev:['mild','mild','moderate'],seasons:['autumn','winter'],energy:8},
 flu:{label:'Flu-like illness',symptoms:['Fever','Body aches','Fatigue','Headache','Cough'],days:[5,9],sev:['moderate','moderate','severe'],seasons:['winter'],energy:18},
 stomach:{label:'Stomach bug',symptoms:['Nausea','Stomach pain','Fatigue'],days:[2,4],sev:['mild','moderate'],energy:12,appetite:true},
 foodPoisoning:{label:'Food poisoning',symptoms:['Nausea','Stomach pain','Fever'],days:[1,3],sev:['moderate','severe'],energy:15,appetite:true},
 headache:{label:'Headache episode',symptoms:['Headache','Fatigue'],days:[1,2],sev:['mild','moderate'],energy:6},
 allergy:{label:'Seasonal allergy',symptoms:['Sneezing','Runny nose'],days:[5,10],sev:['mild'],seasons:['spring'],energy:3},
 fever:{label:'Minor fever',symptoms:['Fever','Fatigue'],days:[2,3],sev:['mild','moderate'],energy:10},
 respiratory:{label:'Minor respiratory infection',symptoms:['Cough','Sore throat','Fever'],days:[5,8],sev:['moderate'],energy:12},
 sprain:{label:'Sprained ankle',injury:true,symptoms:['Pain','Swelling'],days:[5,10],sev:['mild','moderate'],energy:4},
 scrape:{label:'Cut / scrape',injury:true,symptoms:['Pain'],days:[2,4],sev:['mild'],energy:0}
};
const SEV_RANK={mild:1,moderate:2,severe:3,emergency:4};
function hs(){S.healthState=Object.assign({fitness:50,sleep:80,illness:null},S.healthState||{});S.healthState.history=S.healthState.history||[];return S.healthState}
function condition(){return hs().condition||null}
function isSick(){return !!condition()}
function seasonNow(){const m=parseISO(currentDate()).getUTCMonth()+1,south=['Australia'].includes(calendarProfile?.().country);const n=m<=2||m===12?'winter':m<=5?'spring':m<=8?'summer':'autumn';return south?{winter:'summer',summer:'winter',spring:'autumn',autumn:'spring'}[n]:n}
function calculateIllnessRisk(){
 const h=hs();let r=0.55; // % per day at baseline
 r*=1.9-1.4*(S.health/100);               // health 100 → ×0.5, 40 → ×1.34
 if(h.sleep<50)r*=1.5;if(S.stress>70)r*=1.35;if((S.needs?.hygiene??70)<30)r*=1.3;
 if(seasonNow()==='winter')r*=1.5;if(S.age<6)r*=1.3;if(S.energy<15)r*=1.2;
 return Math.min(r,6)}
function onIllnessCooldown(){const h=hs();return h.lastRecovered&&daysBetween(h.lastRecovered,currentDate())<14}
function pickIllness(){const s=seasonNow(),pool=Object.entries(ILLNESSES).filter(([k,v])=>!v.injury);const w=pool.map(([k,v])=>(v.seasons?.includes(s)?3:1)*(k==='cold'?3:k==='flu'?(s==='winter'?2:.4):1));let x=Math.random()*w.reduce((a,b)=>a+b,0);for(let i=0;i<pool.length;i++){x-=w[i];if(x<=0)return pool[i][0]}return 'cold'}
function startIllness(type,opts={}){
 const d=ILLNESSES[type];if(!d||isSick())return null;const sev=opts.severity||rand(d.sev),[lo,hi]=d.days,total=lo+Math.floor(Math.random()*(hi-lo+1))+(sev==='severe'?2:0);
 const symptoms=opts.symptoms||d.symptoms.filter((_,i)=>i<2||chance(60));
 const c={id:uid('ill'),type,label:d.label,injury:!!d.injury,severity:sev,symptoms,started:currentDate(),totalDays:total,progress:0,known:!!d.injury,relief:null,rested:0,care:[],trend:'New'};
 hs().condition=c;hs().illness=d.injury?d.label:'Unwell';
 if(!SIM.skipping&&!opts.quiet){log(d.injury?`Hurt: ${d.label}`:'Not feeling well',d.injury?`It hurts. ${c.symptoms.join(', ')}.`:`You wake up with ${c.symptoms.map(x=>x.toLowerCase()).join(', ')}. ${sev==='mild'?'Not terrible — just off.':sev==='moderate'?'You feel genuinely rough.':'You feel awful.'}`,true);notify(d.injury?d.label:'You feel sick',`${c.symptoms.join(', ')} • ${cap(sev)}`,{sourceType:'illness',sourceId:c.id,tab:'health'})}
 return c}
function cap(s){return String(s||'').replace(/^./,x=>x.toUpperCase())}
function tryStartIllness(){if(isSick()||onIllnessCooldown())return null;if(chance(calculateIllnessRisk()))return startIllness(pickIllness());return null}
function illnessSeverityRank(){return SEV_RANK[condition()?.severity]||0}
function illnessFocusFactor(){const c=condition();if(!c)return 1;const base={mild:.88,moderate:.72,severe:.5,emergency:.3}[c.severity]||1;return Math.min(1,base+(reliefActive()?.1:0))}
function reliefActive(){const c=condition();return !!(c?.relief&&(c.relief.dateISO>currentDate()||(c.relief.dateISO===currentDate()&&c.relief.until>=currentMinute())))}
function progressIllness(){
 const c=condition();if(!c)return;const d=ILLNESSES[c.type]||{};
 let rate=100/c.totalDays*(0.7+S.health/100*0.5);
 if(c.rested>=2)rate*=1.35;else if(c.rested===1)rate*=1.15;if(hs().sleep>=70)rate*=1.1;if(c.supported)rate*=1.1;if(c.wentOutSick&&SEV_RANK[c.severity]>=2)rate*=.75;if(c.prescription)rate*=1.2;
 const before=c.severity;
 if(SEV_RANK[c.severity]===2&&!c.rested&&S.health<55&&chance(12))c.severity='severe';
 if(c.severity==='severe'&&!c.injury&&S.health<35&&!c.rested&&chance(4)){c.severity='emergency';if(!SIM.skipping||S.ffSession)queueEvent({type:'medicalEmergency',title:'You are seriously unwell',text:'You can barely stand up. This needs urgent medical care.',priority:6,expiresDays:1,choices:[{id:'er',label:'Get emergency care now'},{id:'tell',label:'Tell someone right away'}]})}
 c.progress=Math.min(100,c.progress+rate);c.trend=c.severity!==before?'Worse':c.progress>=60?'Improving':c.progress>=25?'About the same':'Just started';
 c.rested=0;c.supported=false;c.wentOutSick=false;
 if(c.progress>=100)recoverIllness();
 else if(c.progress>=55&&SEV_RANK[c.severity]>=2&&c.severity!=='emergency')c.severity=c.severity==='severe'?'moderate':'mild';
}
function recoverIllness(){const c=condition();if(!c)return;cancelFollowUpsOnRecovery();const h=hs();h.history.unshift({label:c.known?c.label:'Illness',type:c.type,start:c.started,end:currentDate(),severity:c.severity,care:c.care});h.history=h.history.slice(0,20);h.condition=null;h.illness=null;h.lastRecovered=currentDate();resolveNotificationsFor(c.id);S.health=clamp(S.health+1);if(S.ffSession)S.ffSession.health=[...(S.ffSession.health||[]),`Had ${c.known?c.label.toLowerCase():'an illness'} for ${daysBetween(c.started,currentDate())} days, then recovered.`];if(!SIM.skipping)log('Feeling better',c.injury?`Your ${c.label.toLowerCase()} has healed.`:'You wake up and realize you feel normal again.',true)}
// effects applied once per day (morning) — illness changes energy, mood, appetite; not every illness the same way
function illnessMorningEffects(){const c=condition();if(!c)return;const d=ILLNESSES[c.type]||{},sev=SEV_RANK[c.severity]||1;S.energy=clamp(S.energy-(d.energy||5)*sev*.6);if(d.appetite)S.needs.hunger=clamp(Math.max(S.needs.hunger,45));S.stress=clamp(S.stress+sev);if(typeof setEmotion==='function')setEmotion(sev>=3?'Miserable':'Unwell',c.injury?c.label:'feeling sick');S.happiness=clamp((S.happiness??60)-3*sev)}
// slow long-term health drift (Health is wellbeing, not energy)
function healthDaily(){const h=hs();let d=0;d+=h.sleep>=70?.15:h.sleep<45?-.35:0;d+=(h.fitness-50)/250;d+=S.stress>75?-.3:0;const nd=S.needs||{};if((nd.hunger??50)>85||(nd.hygiene??60)<15)d-=.25;if(isSick())d-=.2*illnessSeverityRank();S.health=clamp(S.health+Math.max(-1.2,Math.min(.6,d)))}
// ---------- sick actions ----------
function sickRest(){const c=condition();if(!c){toast('You feel fine — no need to rest in bed.');return}advanceTime(60,{silent:true});c.rested=(c.rested||0)+1;S.energy=clamp(S.energy+10);S.stress=clamp(S.stress-3);log('Resting',rand(['You curl up under a blanket and doze.','You lie down and let your body do its thing.','An hour of rest. It helps a little.']))}
function sickDrink(){const c=condition();if(!c){toast('You are not thirsty for anything special.');return}if(c.lastDrink&&c.lastDrink===currentDate()+':'+Math.floor(currentMinute()/120)){toast('You just had something to drink.');return}c.lastDrink=currentDate()+':'+Math.floor(currentMinute()/120);c.supported=true;S.needs.comfort=clamp((S.needs.comfort??50)+6);advanceTime(5,{silent:true});log('A glass of water','Small sips. Your throat thanks you.')}
function sickLightMeal(){const c=condition();if(!c){toast('You are not sick — eat normally.');return}if(S.needs.hunger<25){toast('You are not hungry right now.');return}c.supported=true;S.needs.hunger=clamp(S.needs.hunger-30);advanceTime(20,{silent:true});log('Something light',ILLNESSES[c.type]?.appetite?'A few bites of toast. That is all your stomach can handle.':'Warm soup. Simple, and exactly right.')}
function sickTellParent(){const c=condition();if(!c){toast('Nothing to tell — you feel fine.');return}if(!livesWithParents()){toast('Your parents do not live with you — you could call them.');return}const p=caregiverPerson(),n=p?firstName(p):'Your caregiver';c.toldParent=currentDate();advanceTime(10,{silent:true});
 if(!c.known&&SEV_RANK[c.severity]>=1){c.known=c.injury||chance(60);}
 log(`Telling ${n}`,`${n} feels your forehead and listens. ${c.known?`"Sounds like ${c.label.toLowerCase()}."`:'"Let\'s keep an eye on it."'} ${SEV_RANK[c.severity]>=2?'"You should rest today."':'"Drink some water and take it easy."'}`)}
function healthStatusLine(){const c=condition();if(!c)return null;return `🤒 ${c.known?c.label:'Feeling sick'} — ${cap(c.severity)}`}
function careOptions(){const c=condition();if(!c)return [];const r=SEV_RANK[c.severity];const o=['rest','water','lightMeal'];if(livesWithParents()&&S.age<18)o.push('tellParent','askMedicine');if(r>=2||c.progress<30&&daysBetween(c.started,currentDate())>=4)o.push('clinic');if(r>=3)o.push('hospital');if(r>=4)o.push('emergency');return o}
// ---------- Health panel (shown at every age, age-appropriate) ----------
function conditionCardHtml(){const c=condition();if(!c)return '<p class="muted-text">No current illness or injury.</p>';const opts=careOptions(),btn=(k,l)=>`<button class="small" data-sick="${k}">${l}</button>`;
 return `<div class="condition-card sev-${c.severity}"><b>${esc(c.known?c.label:'Not checked yet — you just feel unwell')}</b><small class="muted-text">${cap(c.severity)} • since ${formatDate(c.started)} • ${esc(c.trend)}</small><p>Symptoms: ${c.symptoms.map(esc).join(', ')}</p>${reliefActive()?'<p class="muted-text">Medicine is easing your symptoms for now.</p>':''}<div class="inline-actions">${btn('rest','Rest (1 h)')}${btn('water','Drink water')}${btn('lightMeal','Eat something light')}${opts.includes('tellParent')?btn('tellParent','Tell your parent'):''}${opts.includes('askMedicine')?btn('askMedicine','Ask your parent for medicine'):''}${opts.includes('clinic')?btn('clinic','See a doctor (clinic)'):''}${opts.includes('hospital')?btn('hospital','Go to the hospital'):''}${opts.includes('emergency')?btn('emergencyCare','Emergency care'):''}</div></div>`}
function healthPanel73(){const a=S.age,h=hs(),c=condition(),rows=[statRow('Health',`${Math.round(S.health)}%`)];
 if(a<5)rows.push(statRow('Sleep quality',`${Math.round(h.sleep)}%`));else{rows.push(statRow('Energy',`${Math.round(S.energy)}%`),statRow('Sleep quality',`${Math.round(h.sleep)}%`))}
 if(a>=13)rows.push(statRow('Fitness',`${Math.round(h.fitness)}%`),statRow('Stress',`${Math.round(S.stress)}%`));
 const hist=h.history.slice(0,5).map(x=>`<p class="muted-text">${formatDate(x.start)}–${formatDate(x.end)}: ${esc(x.label)}${x.care?.length?` (${esc(x.care.join(', '))})`:''}</p>`).join('');
 return `<div class="dashboard"><section class="card"><h3>Health</h3>${rows.join('')}<p class="muted-text">Health is long-term wellbeing — different from energy, sleep, mood or stress.</p></section><section class="card"><h3>Current condition</h3>${conditionCardHtml()}${followUpTodayHtml()}</section>${a>=18?`<section class="card"><h3>Care</h3><div class="action-grid">${actionButton('healthCheck','🩺 Checkup','Costs $25')}${actionButton('mentalCare','🧠 Mental wellbeing','Stress support')}${actionButton('exercise','🏃 Exercise','Fitness and stress')}</div></section>`:''}${hist?`<section class="card"><h3>Recent illnesses</h3>${hist}</section>`:''}</div>`}
function emergencyCare(){const c=condition();if(!c)return;const cg=caregiverPerson();advanceTime(240,{silent:true});c.severity='severe';c.known=true;c.care.push('Emergency care');c.rested=2;S.location='Home';const cost=S.age<18?0:({Struggling:0,Modest:40,'Middle class':120,Comfortable:150,Wealthy:200}[S.wealth]??120);if(cost)S.money=Math.max(0,S.money-cost);log('Emergency care',`${S.age<18&&cg?`${firstName(cg)} rushes you to the emergency room. `:''}Doctors check you over and treat you. "${c.label}. You will need rest at home — and a follow-up." ${cost?`(${money(cost)} out of pocket.)`:'(Covered for you.)'}`,true);S.milestones.unshift({dateISO:currentDate(),age:S.age,title:'🏥 Emergency room',text:c.label})}
function healthEventChoice(e,id){if(e.type!=='medicalEmergency')return false;emergencyCare();return true}
function healthClick(b){const k=b.dataset.sick;if(!k)return false;if(k==='rest')sickRest();else if(k==='water')sickDrink();else if(k==='lightMeal')sickLightMeal();else if(k==='tellParent')sickTellParent();else if(k==='askMedicine')sickAskMedicine();else if(k==='clinic')visitCare('clinic');else if(k==='community')visitCare('clinic',{community:true});else if(k==='hospital')visitCare('hospital');else if(k==='emergencyCare'){emergencyCare();}else if(k==='followUp')attendFollowUp();save();render();return true}
function healthDailyTick(){progressIllness();tryStartIllness();illnessMorningEffects();healthDaily();wellbeingDaily()}
// ---------- 2A.3a — Medicine model (game abstraction: symptom categories only, no dosing) ----------
const MEDICINES={
 coldRelief:{label:'Cold Relief',helps:['Cough','Runny nose','Sore throat','Sneezing','Headache'],uses:6,price:9},
 feverPain:{label:'Fever/Pain Relief',helps:['Fever','Headache','Body aches','Pain'],uses:8,price:8},
 allergyRelief:{label:'Allergy Relief',helps:['Sneezing','Runny nose'],uses:10,price:10},
 coughRelief:{label:'Cough Relief',helps:['Cough','Sore throat'],uses:6,price:8},
 stomachRelief:{label:'Stomach Relief',helps:['Nausea','Stomach pain'],uses:6,price:9},
 firstAid:{label:'Bandages / First Aid',helps:['Pain','Swelling'],uses:10,price:7,injuryOnly:true}
};
const MED_SELF_AGE=12; // younger children need a caregiver (or the school nurse) to give medicine
function medicineHelps(kind){const m=MEDICINES[kind],c=condition();if(!m||!c)return [];if(m.injuryOnly&&!c.injury)return [];return c.symptoms.filter(s=>m.helps.includes(s))}
// by: 'self' | 'caregiver' | 'nurse'. Returns {ok, why}. Relief lasts ~6 hours and supports recovery; it never ends the illness.
function applyMedicine(kind,by='self'){const m=MEDICINES[kind],c=condition();if(!m)return {ok:false,why:'Unknown medicine.'};
 if(!c)return {ok:false,why:"You don't need this right now."};
 if(by==='self'&&S.age<MED_SELF_AGE)return {ok:false,why:'Ask a parent — kids should not take medicine on their own.'};
 const h=medicineHelps(kind);if(!h.length)return {ok:false,why:`${m.label} doesn't help with what you have.`};
 if(reliefActive())return {ok:false,why:'The last dose is still working — wait a few hours.'};
 const end=currentMinute()+360;c.relief={kind,dateISO:end>=1440?addDays(currentDate(),1):currentDate(),until:end%1440,helps:h};c.supported=true;c.care.push(m.label);
 return {ok:true,why:`${m.label} eases ${h.map(x=>x.toLowerCase()).join(', ')} for a while.`}}

// ---------- 2A.3b — Pharmacy items in the existing inventory ----------
function useMedicineItem(it,d){const kind=d.medKind;if(!kind)return;const child=S.age<MED_SELF_AGE,cg=caregiverPerson();
 if(child&&!(livesWithParents()&&cg)){toast('Ask a grown-up to help with medicine.');return}
 const r=applyMedicine(kind,child?'caregiver':'self');if(!r.ok){toast(r.why);return}
 it.remaining=clamp((it.remaining??100)-100/d.units);it.timesUsed=(it.timesUsed||0)+1;const left=medicineUsesLeft(it,d);advanceTime(5,{silent:true});
 log(child?`${firstName(cg)} gives you ${d.name}`:`Took ${d.name}`,`${r.why} (${left} use${left===1?'':'s'} left.)`);
 if(left<=0){removeItem(it.id,true);log(`${d.name} is empty`,'You throw away the empty package.')}}
function medicineUsesLeft(it,d=catalogItem(it.key)){return Math.max(0,Math.round((it.remaining??100)/100*(d?.units||1)))}
function medicineItemsFor(){return (S.inventoryItems||[]).filter(i=>catalogItem(i.key)?.medKind)}
// ---------- 2A.4 — School nurse, nurse pass (excused periods), going home sick ----------
function schoolNurse(){const sc=S.school;if(!sc)return null;if(!sc.nurse){const n=generateName({});sc.nurse={first:n.firstName,last:n.surname,trust:50}}return sc.nurse}
function nurseName(){const n=schoolNurse();return n?`Nurse ${n.last}`:'The nurse'}
function nurseState(){const ev=sessionEvent();return ev?(ev.nurse=ev.nurse||{}):null}
function canSeeNurse(){return needsFormalSchool()&&!!sessionEvent()&&atSchool()}
function coveredPeriods(n){const m=currentMinute(),tt=timetableFor(),i=tt.findIndex(p=>m>=p.start&&m<p.end);const out=[];for(let k=Math.max(0,i);k<tt.length&&out.length<n;k++){if(tt[k].end<=m)continue;out.push(tt[k])}return out}
function examsInWindow(from,to){return (S.exams||[]).filter(e=>examIsOpen(e)&&e.dateISO===currentDate()&&e.minute>=from-5&&e.minute<to)}
function issueNursePass(periods,reason){const ev=sessionEvent(),ns=nurseState();if(!ev||!periods.length)return null;const until=periods[periods.length-1].end;
 const pass={id:uid('pass'),start:currentMinute(),until,periods:periods.map(p=>p.id),excused:periods.filter(p=>p.kind==='class').map(p=>p.subject),reason,status:'Active'};ns.pass=pass;
 for(const p of periods)ev.periods[p.id]='excused';for(const e of examsInWindow(pass.start,until))scheduleMakeupExam(e);
 S.school.nursePasses=[...(S.school.nursePasses||[]).slice(-19),{date:currentDate(),...pass}];return pass}
function visitNurse(){
 if(!canSeeNurse()){toast(S.location==='Home'?'The school nurse is at school — you are at home.':'You can only see the school nurse while you are at school.');return}
 const ns=nurseState();if(ns.inOffice){toast('You are already in the nurse\'s office.');return}
 const p=periodAt(),c=condition(),sub=p?.kind==='class'?S.school.subjects.find(s=>s.name===p.subject):null,t=sub?ensureTeacher(sub):null;
 ns.inOffice=true;ns.visits=(ns.visits||0)+1;advanceTime(5,{silent:true});
 const ask=t?`You raise your hand and ask ${t.name} if you can see the nurse. ${t.name} nods and writes you a note. `:'';
 if(!c){ns.inOffice=false;S.school.nurseTrust=clamp((schoolNurse().trust||50)-2);advanceTime(15,{silent:true});log('School nurse',`${ask}${nurseName()} checks your temperature and asks a few questions. "You seem fine — head back to class, and come back if it gets worse."`);return}
 c.known=true;c.care.push('School nurse');const r=SEV_RANK[c.severity];
 if(r>=4){emergencyCare();ns.inOffice=false;finishSickDay('emergency');return}
 const n=c.injury?1:r>=3?0:r===2?2:1,periods=coveredPeriods(n),pass=r>=3?null:issueNursePass(periods,c.injury?'Injury':'Illness');
 if(c.injury&&MEDICINES.firstAid)applyMedicine('firstAid','nurse');
 ns.recommend=r>=3?'home':null;
 log('School nurse',`${ask}You tell ${nurseName()} ${c.injury?`about your ${c.label.toLowerCase()}`:`that you have ${c.symptoms.map(x=>x.toLowerCase()).join(' and ')}`}. ${nurseName()} checks you over: "${c.label}." ${r>=3?'"You need to go home. Let me call your family."':`"Lie down for a while and we'll see how you feel."`}${pass?` Nurse pass until ${timeLabel(pass.until)} — excused: ${pass.excused.length?pass.excused.join(', '):'this period'}.`:''}`,true)}
function nurseRest(){const ns=nurseState(),c=condition();if(!ns?.inOffice){toast('You are not in the nurse\'s office.');return}const pass=ns.pass;const mins=pass&&pass.until>currentMinute()?pass.until-currentMinute():30;
 if(c&&!c.injury&&!reliefActive()&&!ns.gaveMedicine){const kind=Object.keys(MEDICINES).find(k=>!MEDICINES[k].injuryOnly&&medicineHelps(k).length);if(kind&&applyMedicine(kind,'nurse').ok)ns.gaveMedicine=kind}
 advanceTime(mins,{silent:true});S.energy=clamp(S.energy+8);if(c){c.rested=(c.rested||0)+1}if(pass)pass.status='Used';
 const better=!c||c.severity==='mild';ns.recommend=better?'class':'home';
 log('Resting in the nurse\'s office',`You lie on the narrow bed behind the curtain${ns.gaveMedicine?` (${nurseName()} gives you some ${MEDICINES[ns.gaveMedicine].label.toLowerCase()})`:''}. ${better?'After a while you feel steady enough to go back.':`An hour later you still feel awful. ${nurseName()}: "I think you should go home."`}`)}
function returnToClass(){const ns=nurseState();if(!ns?.inOffice){toast('You are not in the nurse\'s office.');return}ns.inOffice=false;if(ns.pass)ns.pass.status='Closed';S.location='School';advanceTime(3,{silent:true});log('Back to class','You slip back into your seat with the nurse\'s note.')}
function householdAdults(){return householdCaregivers()}
function nurseCallCaregiver(){const ns=nurseState();if(!ns?.inOffice){toast('Ask the nurse first.');return}const adults=householdAdults();let picked=null,tried=[];
 for(const a of adults){tried.push(firstName(a));if(chance(tried.length===1?85:70)){picked=a;break}}
 advanceTime(10,{silent:true});
 if(!picked){log('School nurse',`${nurseName()} calls ${tried.join(', then ')||'home'} — nobody can come right now. You rest in the office until the end of the day; it counts as excused.`);const ev=sessionEvent();for(const p of coveredPeriods(9))ev.periods[p.id]='excused';for(const e of examsInWindow(currentMinute(),SCHOOL_DAY.end))scheduleMakeupExam(e);advanceTime(Math.max(0,SCHOOL_DAY.end-currentMinute()),{silent:true});finishSickDay('rested at school');return}
 const wait=25+Math.floor(Math.random()*30);log('School nurse',`${nurseName()} calls ${firstName(picked)}. "${firstName(picked)} is on the way." You wait in the nurse's office.`);advanceTime(wait,{silent:true});ns.pickedUpBy=picked.id;
 finishSickDay('picked up',picked)}
function finishSickDay(how,picked=null){const ev=sessionEvent()||schoolDayEvent();if(!ev)return;const ns=ev.nurse||{};ns.inOffice=false;if(ns.pass)ns.pass.status='Closed';
 for(const p of timetableFor())if(p.end>currentMinute()&&!ev.periods[p.id])ev.periods[p.id]='excused';
 for(const e of examsInWindow(currentMinute(),SCHOOL_DAY.end+1))scheduleMakeupExam(e);
 ev.attendanceStatus='Sent home sick';setCalendarStatus(ev,'Excused','Sent home sick by the nurse');const rec=ensureSchoolRecord();rec.excusedSick=(rec.excusedSick||0)+1;
 for(const cs of S.calendar.filter(x=>x.type==='clubSession'&&x.dateISO===currentDate()&&!isTerminal(x.status)))resolveClubSession(cs,'Excused','Sent home sick');
 S.location='Home';if(picked)log(`${firstName(picked)} takes you home`,`${firstName(picked)} signs you out at the front desk and drives you home. The rest of your school day is excused.`,true)}
function sickAskMedicine(){const c=condition();if(!c){toast('You do not need medicine.');return}if(!livesWithParents()||S.age>=18){toast('There is no one at home to ask.');return}const cg=caregiverPerson();if(!cg){toast('Nobody is home right now.');return}
 if(reliefActive()){log(`${firstName(cg)}`,`"You already had something for that today. Let's wait a few hours before anything else."`);return}
 const own=medicineItemsFor().find(i=>medicineHelps(catalogItem(i.key).medKind).length);
 if(own){const d=catalogItem(own.key),r=applyMedicine(d.medKind,'caregiver');if(!r.ok){toast(r.why);return}own.remaining=clamp((own.remaining??100)-100/d.units);if(medicineUsesLeft(own,d)<=0)removeItem(own.id,true);log(`${firstName(cg)} gets the medicine`,`${firstName(cg)} finds ${d.name} in the cabinet. ${r.why}`);return}
 const kind=Object.keys(MEDICINES).find(k=>!MEDICINES[k].injuryOnly&&medicineHelps(k).length)||(c.injury?'firstAid':null);if(!kind){log(`${firstName(cg)}`,'"Medicine won\'t help with that one. Rest is the best thing."');return}
 const it=addItem(kind,'parent');if(it){it.source='parent'}advanceTime(40,{silent:true});const d=catalogItem(kind),r=applyMedicine(kind,'caregiver');const inv=(S.inventoryItems||[]).find(i=>i.key===kind);if(r.ok&&inv){inv.remaining=clamp((inv.remaining??100)-100/d.units)}
 log(`${firstName(cg)} goes to the pharmacy`,`${firstName(cg)} comes back with ${d.name} (the household pays). ${r.ok?r.why:''}`)}
function nurseHtml(){if(!canSeeNurse())return '';const ns=nurseState()||{},c=condition();
 if(!ns.inOffice)return `<section class="card"><h3>Health</h3>${c?`<p>You aren't feeling well${c.known?` (${esc(c.label)})`:''}.</p>`:'<p class="muted-text">The school nurse\'s office is down the hall.</p>'}<div class="inline-actions"><button class="small" data-nurse="visit">${c?'Visit the school nurse':'See the nurse'}</button></div></section>`;
 const p=ns.pass;return `<section class="card nurse-card"><h3>Nurse's office — ${esc(nurseName())}</h3>${p?`<div class="nurse-pass"><b>NURSE PASS</b> ${timeLabel(p.start)}–${timeLabel(p.until)}<br>Excused: ${esc(p.excused.join(', ')||'this period')}<br>Reason: ${esc(p.reason)}</div>`:''}${ns.recommend==='home'?'<p class="urgent-text">The nurse recommends going home.</p>':ns.recommend==='class'?'<p>You feel well enough to go back.</p>':''}<div class="inline-actions"><button class="small" data-nurse="rest">Rest on the nurse bed</button><button class="small" data-nurse="call">Ask to call your parent</button><button class="small ghost" data-nurse="back">Return to class</button></div></section>`}
function nurseClick(b){const k=b.dataset.nurse;if(!k)return false;if(k==='visit')visitNurse();else if(k==='rest')nurseRest();else if(k==='call')nurseCallCaregiver();else if(k==='back')returnToClass();save();render();return true}
// ---------- 2A.5 — Medical care levels, costs, follow-ups ----------
const CARE={clinic:{label:'Clinic / doctor',minutes:120,base:60},hospital:{label:'Hospital',minutes:300,base:400},emergency:{label:'Emergency care',minutes:240,base:900},checkup:{label:'Routine checkup',minutes:90,base:40}};
function coverageTier(){return {Struggling:'Covered',Modest:'Mostly covered','Middle class':'Mostly covered',Comfortable:'Mostly covered',Wealthy:'Out-of-pocket','Extremely wealthy':'Out-of-pocket'}[S.wealth]||'Mostly covered'}
function careCost(kind){const base=CARE[kind].base,t=coverageTier();const share=t==='Covered'?0:t==='Mostly covered'?.15:.6;return {tier:t,total:Math.round(base*share),payer:S.age<18||livesWithParents()&&S.age<20?'household':'you'}}
function payCare(kind){const c=careCost(kind);if(!c.total)return {ok:true,text:`${c.tier} — no cost to ${c.payer==='household'?'your family':'you'}.`};
 if(c.payer==='household'){S.family.finance=(S.family.finance||0)-c.total;return {ok:true,text:`${c.tier} — your family pays ${money(c.total)}.`}}
 if(S.money>=c.total){S.money-=c.total;return {ok:true,text:`${c.tier} — you pay ${money(c.total)}.`}}
 if(kind==='emergency'||kind==='hospital'){S.finance.medicalDebt=(S.finance.medicalDebt||0)+c.total-S.money;S.money=0;return {ok:true,text:`You cannot pay ${money(c.total)} now — it becomes a bill to pay later. Care is never refused.`}}
 return {ok:false,text:`It costs ${money(c.total)}. A free community clinic is available instead (longer wait).`}}
function scheduleFollowUp2(days=6){const d=nextSchoolDay(addDays(currentDate(),days-1));const ev=createCalendarEvent({id:`followup-${d}-${uid('f').slice(-4)}`,type:'medicalFollowUp',title:'Doctor follow-up',dateISO:isWeekend(d)?addDays(d,2):d,startMinute:960,endMinute:1020,graceMinute:990,required:true,location:'Clinic',payload:{conditionId:condition()?.id}});return ev}
function visitCare(kind,opts={}){const c=condition();
 if(kind!=='checkup'&&!c){toast('You are not sick — a routine checkup is enough.');return}
 if(kind==='hospital'&&SEV_RANK[c.severity]<3&&!c.injury){toast(`The hospital is for serious problems. ${c.known?c.label:'This'} can be handled at a clinic or at home.`);return}
 if(kind==='hospital'&&c.injury&&c.severity==='mild'){toast('A clinic can look at this.');return}
 if(atSchool()){toast('Talk to the school nurse first.');return}
 if(S.age<16&&!livesWithParents()){toast('A caregiver needs to take you.');return}
 let pay=payCare(kind),community=false;if(!pay.ok){if(!opts.community){toast(pay.text);return}community=true;pay={ok:true,text:'Community clinic — free, long wait.'}}
 const cg=caregiverPerson(),with_=S.age<18&&cg?`${firstName(cg)} takes you to the ${kind==='clinic'?(community?'community clinic':'clinic'):kind==='hospital'?'hospital':'doctor'}. `:'';
 advanceTime(CARE[kind].minutes+(community?90:0),{silent:true});S.location='Home';
 if(kind==='checkup'){S.health=clamp(S.health+2);hs().lastCheckup=currentDate();log('Routine checkup',`${with_}Height, weight, a few questions. "Everything looks fine." ${pay.text}`);return}
 c.known=true;c.care.push(CARE[kind].label);c.supported=true;let extra='';
 if(kind==='clinic'){if(['flu','respiratory'].includes(c.type)||c.injury&&c.severity!=='mild'){c.prescription=true;extra=c.injury?' They wrap it properly and tell you to keep weight off it.':' The doctor writes a prescription to help you recover.'}}
 if(kind==='hospital'){c.prescription=true;c.rested=2;if(c.severity==='severe')c.severity='moderate';extra=' After tests and treatment you are sent home to recover.'}
 let fu='';if(SEV_RANK[c.severity]>=2||kind==='hospital'){const ev=scheduleFollowUp2(kind==='hospital'?5:7);fu=` Follow-up booked for ${formatDate(ev.dateISO)} at ${timeLabel(ev.startMinute)}.`}
 log(kind==='hospital'?'Hospital visit':'Doctor visit',`${with_}The doctor examines you: "${c.label}."${extra} "Rest, fluids, and give it time."${fu} ${pay.text}`,true)}
function attendFollowUp(){const ev=S.calendar.find(e=>e.type==='medicalFollowUp'&&e.dateISO===currentDate()&&!isTerminal(e.status));if(!ev){toast('No appointment today.');return}const c=condition();advanceTime(60,{silent:true});setCalendarStatus(ev,'Attended','Follow-up');if(c){c.supported=true;c.progress=Math.min(99,c.progress+8)}else S.health=clamp(S.health+1);log('Follow-up appointment',c?`"Healing as expected. Keep resting."`:'"All clear — you are fully recovered."')}
function cancelFollowUpsOnRecovery(){for(const e of S.calendar.filter(x=>x.type==='medicalFollowUp'&&!isTerminal(x.status)&&x.dateISO>currentDate()))setCalendarStatus(e,'Cancelled','Recovered — no longer needed')}
// ---------- 2A.5 — Morning: genuinely sick vs pretending ----------
function morningSickDecision(when='today'){const r=familyRules(),c=condition(),trust=S.family.trust??60,examToday=(S.exams||[]).some(e=>examIsOpen(e)&&e.dateISO===currentDate());
 if(c){const base={mild:72,moderate:93,severe:99,emergency:100}[c.severity]||80;return {genuine:true,ok:chance(base-(examToday?12:0)),caught:false}}
 const believe=clamp(15+(100-r.strictness)*.3+(trust-50)*.4-(examToday?15:0),3,70);const ok=chance(believe);const caught=ok&&chance(clamp(15+r.strictness*.3,10,50));return {genuine:false,ok,caught}}

function healthFollowUp(f){if(f.type!=='fakeSickCaught')return false;const cg=caregiverPerson();S.family.trust=clamp((S.family.trust??60)-8);S.family.tension=clamp(S.family.tension+4);if(!SIM.skipping)log('Caught',`${cg?firstName(cg):'Your parent'} saw you laughing at videos all afternoon. "So you weren't sick." Trust takes a hit.`,true);return true}
function followUpTodayHtml(){const ev=S.calendar.find(e=>e.type==='medicalFollowUp'&&e.dateISO===currentDate()&&!isTerminal(e.status));return ev?`<p>Doctor follow-up today at ${timeLabel(ev.startMinute)}. <button class="small" data-sick="followUp">Go to the appointment</button></p>`:''}

// ---------- 2A.6 — Happiness (long-term) vs Mood (current); Troublemaker as a reputation, not a level ----------
// Compatibility note: the existing field S.happiness is the CURRENT MOOD (fast; events and illness move it, it drifts back
// quickly). S.wellbeing is long-term HAPPINESS: it follows mood very slowly, so one bad sick day barely moves it.
function happinessLabel(v=S.wellbeing??S.happiness){return v>=80?'Thriving':v>=62?'Content':v>=45?'Getting by':v>=28?'Unhappy':'Struggling'}
const TROUBLE_LABELS=[[80,'Notorious'],[60,'Troublemaker'],[40,'Known for trouble'],[20,'Mischievous'],[0,'Clean reputation']];
function troubleLabel(v){return (TROUBLE_LABELS.find(([t])=>v>=t)||TROUBLE_LABELS[TROUBLE_LABELS.length-1])[1]}
function wellbeingDaily(){if(S.wellbeing==null)S.wellbeing=S.happiness??60;S.wellbeing=clamp(S.wellbeing+((S.happiness??60)-S.wellbeing)*.04);
 const rep=typeof ensureRep==='function'?ensureRep():null;if(rep&&rep.troublemaker>0&&(!S.lastTroubleDate||daysBetween(S.lastTroubleDate,currentDate())>=14))rep.troublemaker=clamp(rep.troublemaker-.15)}
