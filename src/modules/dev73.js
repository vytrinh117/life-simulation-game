
// =====================================================================
// v7.3+ PHASE 3A.6 — Personality & Talent Development Foundation (sections M–V, W3)
// ONE canonical system. Effective lists stay S.personality / S.talents (read by traitBoost / TRAIT_TARGETS /
// TALENT_TARGETS — unchanged). Metadata lives in S.dev: origin (core/developed, initial/recognized), evidence
// aggregates per target, developing tendencies, emerging strengths, recognition history.
// Future systems submit evidence ONLY through recordTraitEvidence / recordTalentEvidence.
// =====================================================================
const DEV_MAX=5;
const TRAIT_CONFLICT={Social:'Shy',Shy:'Social',Calm:'Bold',Bold:'Calm'};
const TALENT_RARITY=[1,1,1,1.5,2.2,99]; // threshold multiplier by how many talents you already have (index = count)
function devState(){const d=S.dev=S.dev||{};d.v=1;d.origin=d.origin||{trait:{},talent:{}};d.ev=d.ev||{};d.today=d.today||{date:null,counts:{}};d.emerging=d.emerging||{};d.developing=d.developing||[];d.talentHistory=d.talentHistory||[];d.traitHistory=d.traitHistory||[];return d}
// ---------- migration (idempotent): existing traits = Core, existing talents = recognized; nothing filled or rerolled ----------
function migrateDev(){if(!S)return;const d=devState();
 S.personality=[...new Set(S.personality||[])];S.talents=[...new Set(S.talents||[])];
 for(const t of S.personality)if(!d.origin.trait[t])d.origin.trait[t]='core';
 for(const t of S.talents)if(!d.origin.talent[t])d.origin.talent[t]='initial';
 d.developing=[...new Set(d.developing)].filter(t=>!S.personality.includes(t))}
// ---------- evidence (context, quality, anti-farming) ----------
function devDayWeight(key){const d=devState(),t=currentDate();if(d.today.date!==t)d.today={date:t,counts:{}};const c=d.today.counts[key]||0;d.today.counts[key]=c+1;return [1,.5,.25,0][Math.min(c,3)]}
function recordEvidence(kind,target,{source='',system='',eventId=null,context='',quality=1,recognizerId=null}={}){
 if(!S||!target)return 0;if(kind==='trait'&&!D.personalities.includes(target))return 0;if(kind==='talent'&&!D.talents.includes(target))return 0;
 const d=devState(),key=`${kind}:${target}`,e=d.ev[key]=d.ev[key]||{score:0,days:[],first:currentDate(),last:null,contexts:{},strong:0,top:0,recs:[]};
 const ctx=String(context||source||'general').slice(0,60);if(eventId&&e.recs.some(r=>r.eventId===eventId))return 0; // same real event never counts twice
 const dayW=devDayWeight(key),cn=e.contexts[ctx]||0,sameCtxToday=devDayWeight(key+'|'+ctx)>=1?0:1,ctxW=sameCtxToday?.4:1;/* anti-farming: per-day repetition of the same thing decays; sustained behaviour across days is NOT penalised (variety and days are required at evaluation) */let w=dayW*ctxW*Math.max(.5,Math.min(3,quality));
 if(kind==='talent'){const em=d.emerging[target];if(em?.response==='explore')w*=1.3;else if(em?.response==='casual')w*=.8;else if(em?.response==='notnow')w*=.6}
 if(w<=0)return 0;e.score=Math.round((e.score+w)*100)/100;e.contexts[ctx]=cn+1;const t=currentDate();if(!e.days.includes(t)){e.days.push(t);if(e.days.length>240)e.days.shift()}e.last=t;if(quality>=2)e.strong++;if(quality>=3)e.top++;
 e.recs.unshift({dateISO:t,age:S.age,source,system,eventId,context:ctx,quality,recognizerId});if(e.recs.length>10)e.recs.length=10;return w}
function recordTraitEvidence(target,info={}){return recordEvidence('trait',target,info)}
function recordTalentEvidence(target,info={}){return recordEvidence('talent',target,info)}
function evStats(kind,target){const e=devState().ev[`${kind}:${target}`];if(!e)return null;return {score:e.score,days:e.days.length,span:e.first?daysBetween(e.first,currentDate()):0,contexts:Object.keys(e.contexts).length,strong:e.strong,top:e.top}}
// ---------- evaluation (weekly; also callable) ----------
function evaluateTraits(){const d=devState();for(const t of D.personalities){if(S.personality.includes(t))continue;const s=evStats('trait',t);if(!s)continue;
 if(s.score>=6&&s.days>=4&&!d.developing.includes(t))d.developing.push(t);
 const conflict=TRAIT_CONFLICT[t]&&S.personality.includes(TRAIT_CONFLICT[t]);
 if(!conflict&&S.personality.length<DEV_MAX&&s.score>=18&&s.days>=12&&s.contexts>=2&&s.span>=45)recognizeTrait(t)}}
function recognizeTrait(t){const d=devState();if(S.personality.includes(t)||S.personality.length>=DEV_MAX)return false;S.personality.push(t);d.origin.trait[t]='developed';d.developing=d.developing.filter(x=>x!==t);const s=evStats('trait',t);d.traitHistory.unshift({trait:t,dateISO:currentDate(),age:S.age,evidenceDays:s?.days||0});
 if(!SIM.skipping)log('You are changing',`Lately people have started to see you as ${t.toLowerCase()} — and honestly, so do you.`,true);return true}
const TALENT_RECOGNIZER={Music:'your music teacher',Art:'your art teacher',Writing:'your English teacher',Math:'your math teacher',Science:'your science teacher',Programming:'your technology teacher',Sports:'your coach',Dance:'your dance instructor',Acting:'the drama teacher',Cooking:'your family',Business:'a regular customer',Leadership:'a teacher',Languages:'your language teacher',Photography:'a mentor',Fashion:'a friend',Gaming:'a friend'};
const TALENT_LINE={Music:'"You have a real ear for music."',Art:'"You have a natural eye for composition."',Sports:'"You read the game faster than most people your age."',Leadership:'"You\'re actually really good at getting everyone organized."',Business:'"You seem to understand people and pricing naturally."',Cooking:'"How did you learn to cook like this?"'};
function evaluateTalents(){const d=devState(),n=S.talents.length;if(n>=DEV_MAX)return;const k=TALENT_RARITY[n]||99;
 for(const t of D.talents){if(S.talents.includes(t))continue;const s=evStats('talent',t);if(!s)continue;const em=d.emerging[t];
  if(!em&&s.score>=8*k&&s.days>=6&&s.strong>=2&&s.span>=21){d.emerging[t]={since:currentDate(),response:null,noticed:false};}
  const e2=d.emerging[t];if(e2&&!e2.noticed&&!(e2.quietUntil&&currentDate()<e2.quietUntil)){e2.noticed=true;if(!SIM.skipping)queueEvent({type:'talentNotice',title:`Someone notices your ${t.toLowerCase()}`,text:`${cap(TALENT_RECOGNIZER[t]||'Someone')} pulls you aside: ${TALENT_LINE[t]||'"You pick this up unusually quickly."'}`,payload:{talent:t},priority:3,expiresDays:3,choices:[{id:'explore',label:'Explore this seriously'},{id:'casual',label:'Keep it casual'},{id:'notnow',label:'Not pursue it right now'}]});else e2.response='casual'}
  if(e2&&e2.response&&e2.response!=='notnow'&&s.score>=22*k&&s.days>=15&&s.span>=90&&s.contexts>=2&&s.top>=1)recognizeTalent(t,{source:'accumulated evidence',recognizer:TALENT_RECOGNIZER[t]})}}
function recognizeTalent(t,{source='',recognizer='',recognizerId=null,event=''}={}){const d=devState();if(S.talents.includes(t)||S.talents.length>=DEV_MAX)return false;S.talents.push(t);d.origin.talent[t]='recognized';delete d.emerging[t];
 const last=(d.ev[`talent:${t}`]?.recs||[]).find(r=>r.quality>=3)||{};d.talentHistory.unshift({talent:t,dateISO:currentDate(),age:S.age,source:source||last.source||'',recognizer:recognizer||'',recognizerId:recognizerId||last.recognizerId||null,event:event||last.context||''});
 S.milestones.unshift({dateISO:currentDate(),age:S.age,title:`🌟 ${t} talent recognized`,text:`${cap(recognizer||'Someone')} recognized it${last.context?` after ${last.context}`:''}.`});if(!SIM.skipping)log(`🌟 ${t} is a talent`,`It is official now — ${recognizer||'people'} see it too. Learning ${t.toLowerCase()} comes naturally to you.`,true);return true}
function respondTalentNotice(e,id){if(e.type!=='talentNotice')return false;const d=devState(),t=e.payload?.talent,em=d.emerging[t];if(!em)return true;em.response=id;
 if(id==='notnow')em.quietUntil=addDays(currentDate(),60);
 log(`About your ${t.toLowerCase()}`,id==='explore'?'You decide to take it seriously and see where it goes.':id==='casual'?'You keep it as something you enjoy, no pressure.':'Not right now. Maybe some other time.');return true}
function devWeeklyTick(){if(!S||parseISO(currentDate()).getUTCDay()!==0)return;evaluateTraits();evaluateTalents()}
// ---------- display (no percentages, no meters) ----------
function devStatusHtml(){const d=devState(),core=S.personality.filter(t=>d.origin.trait[t]!=='developed'),dev=S.personality.filter(t=>d.origin.trait[t]==='developed'),em=Object.keys(d.emerging);
 return `<div class="dev-status"><p><b>Core personality:</b> ${core.map(esc).join(', ')||'—'}</p>${dev.length?`<p><b>Developed:</b> ${dev.map(esc).join(', ')}</p>`:''}${d.developing.length?`<p class="muted-text"><b>Developing tendencies:</b> ${d.developing.map(esc).join(', ')}</p>`:''}${em.length?`<p class="muted-text"><b>Emerging strengths:</b> ${em.map(esc).join(', ')}</p>`:''}<p class="muted-text">Traits and talents can develop through what you keep doing — slowly, and not always. Empty slots are fine.</p></div>`}
// ---------- wiring helpers for EXISTING gameplay sources ----------
const SKILL_TALENT={music:'Music',writing:'Writing',art:'Art',sports:'Sports',fitness:'Sports',swimming:'Sports',programming:'Programming',business:'Business',acting:'Acting',baking:'Cooking',cooking:'Cooking',photography:'Photography',dance:'Dance',gaming:'Gaming',leadership:'Leadership',languages:'Languages'};
function contestTalent(name){const n=String(name||'');return /math/i.test(n)?'Math':/coding|robot/i.test(n)?'Programming':/science/i.test(n)?'Science':/photo/i.test(n)?'Photography':/art/i.test(n)?'Art':/music/i.test(n)?'Music':/talent show|play|drama|film/i.test(n)?'Acting':/debate|poetry|spelling/i.test(n)?'Writing':/sport/i.test(n)?'Sports':/bake/i.test(n)?'Cooking':null}
function devContestResult(c,score){const t=contestTalent(c.name);recordTraitEvidence('Ambitious',{source:'competition',system:'school events',eventId:'contest-'+c.id,context:c.name,quality:1});if(t)recordTalentEvidence(t,{source:c.name,system:'school events',eventId:'contest-'+c.id,context:c.name,quality:score>=82?3:score>=68?2:1})}
function devProgramResult(rec,pg,score){const t=SKILL_TALENT[pg?.skill];recordTraitEvidence('Responsible',{source:'finished a program',system:'summer programs',eventId:'prog-'+rec.id,context:pg?.name||'program'});if(t)recordTalentEvidence(t,{source:pg?.name||'program',system:'summer programs',eventId:'prog-'+rec.id,context:pg?.name||'program',quality:score>=80?3:score>=60?2:1})}
function devNewPlace(where){const d=devState();d.places=d.places||[];const k=String(where||'').toLowerCase();if(!k||d.places.includes(k))return;d.places.push(k);recordTraitEvidence('Adventurous',{source:'somewhere new',system:'outings',context:k})}
