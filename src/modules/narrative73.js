
// =====================================================================
// v7.3+ PHASE 3A.4 — Narrative continuity: structured conversation threads ("who knows what you told them")
// A thread lives on the person you told (p.convThreads) and points at a REAL outcome source:
//   storyThread (S.threads: tryouts, elections, plans) • exam (S.exams) • contest (S.school.contests)
//   uni (S.uniApps decisions) • program (S.programs).  Follow-ups always use the actual result; no invented outcomes.
// Lifecycle: open → ready (real outcome known) → resolved (after the follow-up) | expired (stale / never resolved).
// =====================================================================
const THREAD_MAX_OPEN=3,THREAD_STALE_DAYS=45;
function convThreads(p){p.convThreads=p.convThreads||[];return p.convThreads}
function upcomingTopics(){const out=[],t=currentDate();
 for(const th of (S.threads||[]))if(!th.resolved&&['tryout','election'].includes(th.kind))out.push({kind:'storyThread',ref:th.key,label:th.title.replace(/^Making the /,'tryouts for ').replace(/^Getting into /,'getting into ').replace(/^Running for /,'running for '),topic:th.kind});
 for(const e of (S.exams||[]))if(examIsOpen(e)&&e.dateISO>=t&&daysBetween(t,e.dateISO)<=14)out.push({kind:'exam',ref:e.id,label:`the ${e.subject} ${String(e.type||'test').toLowerCase()}`,topic:'exam'});
 for(const c of (S.school?.contests||[]))if(c.status==='Registered')out.push({kind:'contest',ref:c.id,label:`the ${c.name}`,topic:'competition'});
 if(S.uniApps&&Object.keys(S.uniApps.applied||{}).length&&!S.uniApps.lettersSent)out.push({kind:'uni',ref:S.uniApps.year||'apps',label:'your university applications',topic:'application'});
 for(const r of (S.programs||[]))if(r.status==='Active')out.push({kind:'program',ref:r.id,label:`your ${(PROGRAMS.find(x=>x.id===r.progId)||{}).name||'summer program'}`,topic:'performance'});
 return out.slice(0,6)}
// the real outcome of a thread's source: {state:'pending'|'good'|'ok'|'bad'|'missed'|'cancelled', text}
function threadOutcome(th){const k=th.kind,ref=th.ref;
 if(k==='storyThread'){const s=(S.threads||[]).find(x=>x.key===ref);if(!s)return {state:'cancelled',text:'it never happened'};if(!s.resolved)return {state:'pending'};const st=String(s.stage||'');
  if(/miss/i.test(st))return {state:'missed',text:st.toLowerCase()};if(/cancel|withdr/i.test(st))return {state:'cancelled',text:st.toLowerCase()};if(/not |lost|reject|didn/i.test(st))return {state:'bad',text:st.toLowerCase()};return {state:'good',text:st.toLowerCase()}}
 if(k==='exam'){const e=(S.exams||[]).find(x=>x.id===ref);if(!e)return {state:'cancelled',text:'it was called off'};if(/make-up|resched|excus/i.test(e.status||''))return {state:'pending'};if(e.status==='Missed')return {state:'missed',text:'you missed it'};if(e.score==null||examIsOpen(e))return {state:'pending'};const sc=Math.round(e.score);return {state:sc>=80?'good':sc>=60?'ok':'bad',text:`you got ${sc}`}}
 if(k==='contest'){const c=(S.school?.contests||[]).find(x=>x.id===ref);if(!c)return {state:'cancelled',text:'it was called off'};if(c.status==='No-show')return {state:'missed',text:'you did not make it there'};if(['Withdrawn','Cancelled'].includes(c.status))return {state:'cancelled',text:c.status==='Withdrawn'?'you withdrew':'it was cancelled'};if(!c.result)return {state:'pending'};return {state:/Winner|Strong/.test(c.result)?'good':'ok',text:c.result.toLowerCase()}}
 if(k==='uni'){const u=S.uniApps;if(!u||!u.lettersSent)return {state:'pending'};const acc=Object.values(u.decisions||{}).filter(v=>v==='Accepted').length;return acc?{state:'good',text:`you got into ${acc} school${acc===1?'':'s'}`}:{state:'bad',text:'no acceptances this time'}}
 if(k==='program'){const r=(S.programs||[]).find(x=>x.id===ref);if(!r)return {state:'cancelled',text:'it did not happen'};if(r.status==='Active')return {state:'pending'};if(r.status==='Dropped')return {state:'bad',text:'you dropped out'};return {state:'good',text:r.result?String(r.result).toLowerCase():'you finished it'}}
 return {state:'pending'}}
function shareTopic(personId,idx){const p=personById(personId),topics=upcomingTopics(),tp=topics[idx];if(!p||!tp)return;const open=convThreads(p).filter(x=>['open','ready'].includes(x.status));
 if(open.some(x=>x.kind===tp.kind&&x.ref===tp.ref)){toast(`${firstName(p)} already knows about that.`);return}if(open.length>=THREAD_MAX_OPEN){toast(`You have already told ${firstName(p)} a lot — let them catch up first.`);return}
 convThreads(p).unshift({id:uid('ct'),kind:tp.kind,ref:tp.ref,label:tp.label,topic:tp.topic,dateISO:currentDate(),status:'open',outcome:null});
 p.trust=clamp((p.trust??50)+1.5);p.rel=clamp(p.rel+1);(p.history=p.history||[]).unshift({dateISO:currentDate(),age:S.age,text:`You told them you're nervous about ${tp.label}.`,importance:1});advanceTime(15,{silent:true});
 log(`Talking with ${firstName(p)}`,`You admit you're nervous about ${tp.label}. ${firstName(p)} listens. "${rand(['You\'ll be fine — tell me how it goes.','That\'s a big deal. Let me know what happens?','I get it. I\'d be nervous too.'])}"`)}
function threadTick(){if(!S.people)return;const t=currentDate();let asked=S.threadAskedOn===t;
 for(const p of S.people){if(!p.convThreads?.length)continue;
  for(const th of p.convThreads){
   if(th.status==='open'){const o=threadOutcome(th);if(o.state!=='pending'){th.status='ready';th.outcome=o;th.readyDate=t}else if(daysBetween(th.dateISO,t)>THREAD_STALE_DAYS){th.status='expired';th.closedDate=t}}
   else if(th.status==='ready'&&daysBetween(th.readyDate,t)>14){th.status='expired';th.closedDate=t}}
  p.convThreads=p.convThreads.filter(x=>!['resolved','expired'].includes(x.status)||daysBetween(x.closedDate||x.dateISO,t)<=90)}
 if(asked||SIM.skipping)return;
 for(const p of S.people){const th=(p.convThreads||[]).find(x=>x.status==='ready');if(!th||p.movedAway||friendStatusLabel(p))continue;if(daysBetween(th.readyDate,t)<1)continue;
  if(S.events.some(e=>e.status==='Open'&&e.type==='threadFollowUp'))break;queueThreadFollowUp(p,th);S.threadAskedOn=t;break}}
const FOLLOWUP_ASK={storyThread:l=>`How did ${l} go?`,exam:l=>`How did ${l} go?`,contest:l=>`So… how did ${l} go?`,uni:()=>'Did you hear back from the universities?',program:l=>`How did ${l} end up?`};
function queueThreadFollowUp(p,th){const o=th.outcome||{},ask=(FOLLOWUP_ASK[th.kind]||(l=>`How did ${l} go?`))(th.label);
 const ch=o.state==='good'||o.state==='ok'?[{id:'share',label:'Tell them how it went'},{id:'modest',label:'Play it cool'}]:o.state==='cancelled'?[{id:'share',label:'Explain it got called off'},{id:'skip',label:'Change the subject'}]:[{id:'share',label:'Admit it was rough'},{id:'skip',label:'Change the subject'}];
 th.asked=currentDate();queueEvent({type:'threadFollowUp',title:`${firstName(p)} remembers`,text:`"${ask}"`,participants:[p.id],payload:{threadId:th.id},priority:3,expiresDays:2,choices:ch})}
function threadFollowUpChoice(e,id){if(e.type!=='threadFollowUp')return false;const p=personById(e.participants?.[0]);const th=p&&(p.convThreads||[]).find(x=>x.id===e.payload?.threadId);if(!p||!th)return true;const o=th.outcome||{},n=firstName(p);th.status='resolved';th.closedDate=currentDate();th.reply=id;
 let text,imp=1;
 if(id==='skip'){p.rel=clamp(p.rel-.5);text=`You change the subject. ${n} lets it go.`}
 else if(o.state==='good'||o.state==='ok'){p.rel=clamp(p.rel+(id==='share'?2:1));text=id==='share'?`You tell ${n} — ${o.text}. "${o.state==='good'?'I KNEW it! That\'s amazing.':'Hey, that\'s solid.'}"`:`"It went okay," you shrug — ${o.text}. ${n} grins anyway.`;if(o.state==='good'&&['storyThread','uni','contest'].includes(th.kind))imp=2}
 else if(o.state==='cancelled'){p.rel=clamp(p.rel+1);text=`You explain ${o.text}. "Ugh, after all that worrying?"`}
 else{p.rel=clamp(p.rel+3);p.trust=clamp((p.trust??50)+2);S.stress=clamp(S.stress-3);text=`You admit it — ${o.text}. ${n} doesn't try to fix it, just stays with you for a while. It helps more than you expected.`;imp=2;p.supportEvidence=(p.supportEvidence||0)+1;if(p.supportEvidence>=2&&typeof addPersonMilestone==='function')addPersonMilestone(p,'helped',`after ${th.label}`)}
 (p.history=p.history||[]).unshift({dateISO:currentDate(),age:S.age,text:`They asked how ${th.label} went (${o.text||'no news'}).`,importance:imp});advanceTime(10,{silent:true});log(`${n} remembers`,text);return true}
function narrativeHtml(p){if(isFamilyPerson(p)&&!livesWithParents())return '';const topics=upcomingTopics(),open=(p.convThreads||[]).filter(x=>['open','ready'].includes(x.status));if(!topics.length&&!open.length)return '';
 return `<div class="on-mind"><b>On your mind</b>${open.length?`<small class="muted-text"> • ${esc(firstName(p))} knows about: ${open.map(x=>esc(x.label)).join(', ')}</small>`:''}${topics.length?`<div class="inline-actions">${topics.map((t,i)=>`<button class="small ghost" data-share-topic="${i}" data-person-id="${p.id}">Tell them about ${esc(t.label)}</button>`).join('')}</div>`:''}</div>`}
function narrativeClick(b){if(b.dataset.shareTopic!=null&&b.dataset.personId){shareTopic(b.dataset.personId,Number(b.dataset.shareTopic));save();render();return true}return false}
