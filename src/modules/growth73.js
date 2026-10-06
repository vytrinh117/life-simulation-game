
// =====================================================================
// v7.3 B–F — TALENTS & TRAITS THAT MATTER, LEVELS 1–10, STUDY RULES,
// MOOD WITH REASONS, AND ONE GLOBAL ANTI-FARMING RULE
// =====================================================================
// ---------- B. Talents & personality multipliers (always explained) ----------
const TALENT_TARGETS={Music:['skill:music','subject:Music'],Writing:['skill:writing','subject:English / Language','subject:Literature'],Art:['skill:art','skill:creativity','subject:Art'],Sports:['skill:sports','skill:fitness','subject:Physical Education','rep:athletic'],Math:['subject:Mathematics','subject:Numbers & patterns'],Science:['subject:Science','subject:Biology','subject:Chemistry','subject:Physics','skill:knowledge'],Programming:['skill:programming','subject:Technology','subject:Computer Science'],Business:['skill:business'],Languages:['subject:English / Language','subject:Foreign Language','subject:Language & stories','skill:reading'],Acting:['skill:creativity','rep:creative'],Fashion:['skill:style'],Cooking:['skill:cooking'],Photography:['skill:art'],Gaming:['skill:gaming'],Leadership:['rep:leadership'],Dance:['skill:fitness','skill:creativity','subject:Movement']};
const TRAIT_TARGETS={Curious:[['skill:knowledge',.15],['skill:reading',.15],['subject:Science',.15]],Creative:[['skill:art',.15],['skill:creativity',.15],['rep:creative',.1]],Athletic:[['skill:sports',.15],['skill:fitness',.15],['rep:athletic',.1]],Competitive:[['skill:sports',.1],['rep:athletic',.1],['exam',.05]],Social:[['rep:social',.15],['relationship',.1]],Funny:[['rep:social',.1],['relationship',.05]],Shy:[['rep:social',-.1],['trust',.1]],Responsible:[['study',.1],['homework',.15]],Ambitious:[['rep:leadership',.15],['study',.05]],Bold:[['rep:leadership',.1]],Kind:[['rep:kindness',.15],['relationship',.05]],Empathetic:[['rep:kindness',.15],['trust',.1]],Stubborn:[['rep:troublemaker',.1]],Calm:[['stressGain',-.2]],Practical:[['skill:cooking',.1],['skill:business',.1]],Adventurous:[['skill:fitness',.1]],Romantic:[['relationship',.05]],Independent:[['study',.05]]};
const TALENT_BONUS=.25;
function traitBoost(targets){
 targets=Array.isArray(targets)?targets:[targets];let mult=1;const notes=[];
 for(const t of S.talents||[])if((TALENT_TARGETS[t]||[]).some(x=>targets.includes(x))){mult+=TALENT_BONUS;notes.push(`+25% from your ${t} talent`)}
 for(const p of S.personality||[])for(const [x,v] of TRAIT_TARGETS[p]||[])if(targets.includes(x)){mult+=v;notes.push(`${v>0?'+':''}${Math.round(v*100)}% (${p})`)}
 return {mult:Math.max(.5,mult),notes}
}
function boostedKeys(){const s=new Set();for(const t of S.talents||[])(TALENT_TARGETS[t]||[]).forEach(x=>s.add(x));for(const p of S.personality||[])for(const [x,v] of TRAIT_TARGETS[p]||[])if(v>0)s.add(x);return s}
// ---------- C. Levels 1–10 on a 0–100 scale (10 points per level) ----------
function levelOf(v){return Math.min(10,Math.floor(clamp(v)/10)+1)}
function levelPct(v){const l=levelOf(v);return l>=10&&v>=100?100:Math.round((clamp(v)-(l-1)*10)*10)}
function levelFactor(v){return 1.12-levelOf(v)*.065} // L1 ≈ 1.06 … L10 ≈ 0.47: higher levels fill more slowly
function noteLevelUp(kind,key,label,before,after){
 const a=levelOf(before),b=levelOf(after);if(b<=a||SIM.skipping&&b<5)return;
 const title=`⬆️ ${label} • Level ${b}`;if(!SIM.skipping){notify(title,`${kind==='rep'?'School reputation':'Skill'} levelled up.`,{sourceType:'level',sourceId:`${key}-${b}`});log(title,b>=10?`${label} is maxed out at Level 10.`:`${label} moved up to Level ${b}. The next level will take a bit longer.`,b>=5)}
 S.milestones.unshift({dateISO:currentDate(),age:S.age,title,text:`${label} reached Level ${b}.`});if(S.milestones.length>200)S.milestones.length=200;S.happiness=clamp(S.happiness+2)
}
// ---------- F. One global anti-farming rule ----------
function dayCounts(){if(!S.farm||S.farm.date!==currentDate())S.farm={date:currentDate(),c:{}};return S.farm.c}
const FARM_MULT=[1,.65,.4];
function farmGuard(key){const c=dayCounts(),n=c[key]||0;if(n>=3)return {mult:0,n,blocked:true};c[key]=n+1;return {mult:FARM_MULT[n],n:n+1,blocked:false}}
function farmLeft(key){return Math.max(0,3-(dayCounts()[key]||0))}
// ---------- Skills (overrides) ----------
const SKILL_KEY_LABEL=()=>Object.assign({},SKILL_LABEL,{cooking:'Cooking',business:'Business',baking:'Baking'});
function practiceSkill(k,base){
 ensureSkills();const g=farmGuard('skill:'+k);if(g.blocked){S.lastFarmNote=`${SKILL_KEY_LABEL()[k]||k} already practiced 3 times today — no more gain until tomorrow.`;return 0}
 const level=skillValue(k),boost=traitBoost('skill:'+k),gain=Math.max(0,base*g.mult*levelFactor(level)*boost.mult*concentration());
 if(k==='reading')S.development.skills.reading=clamp(level+gain);else if(k==='cooking')S.development.skills.cooking=clamp(level+gain);else S.skills[k]=clamp(level+gain);
 if(k==='fitness')S.healthState.fitness=clamp(S.healthState.fitness+gain*.6);
 if(boost.notes.length)S.lastBoostNote=boost.notes.join(', ');
 noteLevelUp('skill',k,SKILL_KEY_LABEL()[k]||k,level,level+gain);return gain
}
function skillValue(k){return k==='reading'?S.development.skills.reading:k==='cooking'?S.development.skills.cooking:ensureSkills()[k]||0}
function addRep(dim,amt){const r=ensureRep();if(!(dim in r))return;let v=amt;if(v>0&&dim!=='troublemaker'){const b=traitBoost('rep:'+dim);v=v*b.mult*levelFactor(r[dim])}const before=r[dim];r[dim]=clamp(before+v);if(v>0&&dim!=='troublemaker')noteLevelUp('rep',dim,`${REP_DIMS[dim]} reputation`,before,r[dim]);if(v>0&&dim==='troublemaker')S.lastTroubleDate=currentDate()}
// ---------- E. Mood with reasons ----------
function moodFactors(){
 const f=[],n=S.needs,add=(label,v)=>{if(Math.abs(v)>=1)f.push({label,v:Math.round(v)})};
 if(typeof condition==='function'&&condition())add('Feeling sick',-6*illnessSeverityRank());if(n.hunger>=70)add('Hungry',-(n.hunger-60)*.4);if(n.sleep<=30)add('Exhausted',-(35-n.sleep)*.5);else if(n.sleep>=80)add('Well rested',4);
 if(n.social<=25)add('Lonely',-(30-n.social)*.4);else if(n.social>=75)add('Time with people',4);if(n.fun<=25)add('Bored',-(30-n.fun)*.3);if(n.comfort<=25)add('Uncomfortable',-5);
 if(S.stress>=70)add('Stressed',-(S.stress-60)*.35);else if(S.stress<=20)add('Relaxed',3);
 if(S.family.tension>=60)add('Tension at home',-(S.family.tension-50)*.2);if(isGrounded())add('Grounded',-6);
 const recent=S.log.slice(0,30).filter(l=>l.dateISO&&daysBetween(l.dateISO,currentDate())<=2);
 if(recent.some(l=>/Level \d|🏆|🎉|won|Loved it|said yes|• (8[5-9]|9\d|100)%/.test(l.title)))add('Recent success',6);
 if(recent.some(l=>/not selected|Missed|Rejected|Caught|Grounded|Breakup|lost/i.test(l.title)))add('A recent setback',-5);
 if(recent.some(l=>/gift|Birthday|💌|Present/i.test(l.title)))add('Someone thought of you',3);
 if(['Rainy','Stormy'].includes(S.weather?.type)&&!hasWeatherGear('rain'))add('Gloomy weather',-2);if(S.weather?.type==='Sunny')add('Sunny day',2);
 const partner=partnerPerson?.();if(partner&&partner.rel>=70)add('In a happy relationship',3);
 return f.sort((a,b)=>Math.abs(b.v)-Math.abs(a.v))
}
function moodBaseline(){return clamp(60+moodFactors().reduce((a,x)=>a+x.v,0),5,98)}
function moodDrift(minutes){if(!S||SIM.skipping)return;S.moodClock=(S.moodClock||0)+minutes;if(S.moodClock<120)return;const steps=Math.floor(S.moodClock/120);S.moodClock%=120;const base=moodBaseline();for(let i=0;i<Math.min(steps,12);i++)S.happiness=clamp(S.happiness+(base-S.happiness)*.08)}
function concentration(){const m=S.happiness??60,sleep=S.needs?.sleep??80,hunger=S.needs?.hunger??30;return Math.max(.3,Math.min(1.08,(.78+m/400+(sleep<30?-.1:0)+(hunger>75?-.08:0))*illnessFocusFactor()))}
function moodLabel(v=S.happiness){return v>=80?'Great':v>=62?'Good':v>=45?'Okay':v>=28?'Low':'Very low'}
function moodHtml(){const f=moodFactors(),c=Math.round(concentration()*100);return `<p class="muted-text">Happiness (long-term): <b>${Math.round(S.wellbeing??S.happiness)}</b> ${happinessLabel()}</p><p class="mood-big">Mood <b>${Math.round(S.happiness)}</b> ${moodLabel()} <small>• focus ${c}%</small></p>${f.length?f.slice(0,6).map(x=>`<div class="pl-row"><span>${x.v>0?'▲':'▼'}</span><b>${esc(x.label)}</b><small class="${x.v>0?'':'urgent-text'}">${x.v>0?'+':''}${x.v}</small></div>`).join(''):'<p class="muted-text">Nothing in particular is pulling your mood up or down.</p>'}<p class="muted-text">Mood slowly moves toward what your life feels like right now. It changes how well you focus when studying, in class and in exams, and how social moments go.</p>`}
// ---------- D. Study rules ----------
function studySubject(name,minutes=60,mode='solo'){if(mode==='teacher'&&!requireAction('teacherStudy'))return;
 const sub=S.school?.subjects?.find(x=>x.name===name);if(!sub){toast('Subject not found.');return}if(atSchool()){toast('You are in class — use the school options.');return}
 const key='study:'+sub.name;if(farmLeft(key)<=0){toast(`You already studied ${sub.name} 3 times today. Your brain needs a break.`);return}
 minutes=[30,60,180].includes(Number(minutes))?Number(minutes):60;if(S.energy<10){toast('You are too tired to study.');return}
 const g=farmGuard(key),b=traitBoost(['subject:'+sub.name,'study']),conc=concentration(),items=[];
 let itemMult=1;if(findUsable('deskLamp')){itemMult+=.2;items.push('desk lamp')}if(findUsable('workbook')){itemMult+=.15;items.push('workbook')}const nb=findUsable('notebook');if(nb){itemMult+=.1;items.push('notebook');const u=openOne(nb);u.remaining=clamp(u.remaining-1.25);if(u.remaining<=.5)removeItem(u.id)}
 const methodMult=mode==='friend'?1.1:mode==='teacher'?1.25:1,m=g.mult*b.mult*conc*itemMult*methodMult;
 const prep=Math.round((minutes===30?4:minutes===60?8:15)*m),skill=Math.round(Math.min(5,Math.max(1,(minutes===30?1.4:minutes===60?2.6:4.3)*m))*10)/10,grade=Math.round(Math.min(2,(minutes===30?.4:minutes===60?.8:1.6)*m)*10)/10;
 sub.prep=clamp(sub.prep+prep);sub.skill=clamp(sub.skill+skill);sub.score=Math.round(clamp(sub.score+grade)*10)/10;sub.lastStudyDate=currentDate();
 if(mode==='friend'){const p=bestNonFamily();if(p){p.rel=clamp(p.rel+2);p.trust=clamp(p.trust+1);rememberPerson(p,`You studied ${sub.name} together.`)}S.needs.social=clamp(S.needs.social+7)}
 if(mode==='teacher')ensureTeacher(sub).rel=clamp(sub.teacher.rel+3);
 const stressMult=traitBoost('stressGain').mult;S.energy=clamp(S.energy-(minutes/30)*3);S.stress=clamp(S.stress+(minutes===180?6:2)*stressMult);advanceTime(minutes);
 const notes=[...b.notes,...(items.length?[`+${Math.round((itemMult-1)*100)}% from your ${items.join(' & ')}`]:[]),...(g.n>1?[`session ${g.n}/3 today (${Math.round(g.mult*100)}%)`]:[]),...(conc<.9?[`focus ${Math.round(conc*100)}% (mood/needs)`]:conc>1?[`focus ${Math.round(conc*100)}%`]:[])];
 feedback(`Studied ${sub.name} • ${minutes===180?'3 hours':minutes===60?'1 hour':'30 min'}${mode==='friend'?' with a friend':mode==='teacher'?' with the teacher':''}`,`Grade +${grade.toFixed(1)} • Skill +${skill.toFixed(1)} • Prep +${prep}${notes.length?` (${notes.join('; ')})`:''}. ${farmLeft(key)} study session${farmLeft(key)===1?'':'s'} left for ${sub.name} today.`,minutes)
}
function extraExercise(name){
 const sub=S.school?.subjects?.find(x=>x.name===name);if(!sub)return;if(atSchool()){toast('After class.');return}
 const key='extra:'+sub.name,c=dayCounts();if(c[key]){toast(`You already did extra ${sub.name} exercises today.`);return}if(S.energy<15){toast('Too tired for hard exercises.');return}c[key]=1;
 const b=traitBoost(['subject:'+sub.name,'study']),conc=concentration(),success=chance(clamp(25+sub.skill*.6+(b.mult-1)*60+(conc-.9)*80,10,92));
 const grade=Math.round((success?1.2+Math.random()*.8:.3+Math.random()*.4)*b.mult*10)/10,skill=Math.round((success?3:1.5)*b.mult*10)/10,prep=success?8:4;
 sub.score=Math.round(clamp(sub.score+Math.min(2,grade))*10)/10;sub.skill=clamp(sub.skill+Math.min(5,skill));sub.prep=clamp(sub.prep+prep);S.stress=clamp(S.stress+3*traitBoost('stressGain').mult);S.energy=clamp(S.energy-8);advanceTime(45);
 feedback(`Advanced ${sub.name} exercises`,`${success?rand(['You crack the hardest problem on the sheet. It feels great.','Tough, but you get through all of it.']):rand(['Half of it is beyond you for now — but you learn from the answers.','You get stuck, check the solutions, and slowly understand.'])} (Grade +${Math.min(2,grade).toFixed(1)} • Skill +${Math.min(5,skill).toFixed(1)} • Prep +${prep}${b.notes.length?` • ${b.notes.join(', ')}`:''})`,45)
}
// ---------- F. Wrappers: relationship / club / hobby gains capped at 3 per target per day ----------
function snapshotGains(){const s={skills:Object.assign({},S.skills),dev:Object.assign({},S.development.skills),fit:S.healthState.fitness,people:Object.fromEntries(S.people.map(p=>[p.id,[p.rel,p.trust]])),clubs:Object.fromEntries((S.school?.clubs||[]).map(c=>[c.id,[c.skill||0,c.leaderRel||0]]))};return s}
function scaleGains(before,mult){
 const sc=(a,b)=>b>a?a+(b-a)*mult:b;
 for(const k of Object.keys(S.skills))S.skills[k]=sc(before.skills[k]??0,S.skills[k]);for(const k of Object.keys(S.development.skills))S.development.skills[k]=sc(before.dev[k]??0,S.development.skills[k]);S.healthState.fitness=sc(before.fit,S.healthState.fitness);
 for(const p of S.people){const b=before.people[p.id];if(b){p.rel=sc(b[0],p.rel);p.trust=sc(b[1],p.trust)}}
 for(const c of S.school?.clubs||[]){const b=before.clubs[c.id];if(b){c.skill=sc(b[0],c.skill||0);c.leaderRel=sc(b[1],c.leaderRel||0)}}
}
const NEED_ACTIONS=['eat','snack','drink','toilet','washHands','washFace','shower','bath','sleep','nap','rest'];
function guarded(key,fn){const g=farmGuard(key);if(g.blocked){toast('You have already done that 3 times today — no more gain until tomorrow, but you can still do it for fun.');}const before=snapshotGains();fn();if(g.mult<1||g.blocked)scaleGains(before,g.blocked?0:g.mult)}
function personAction(personId,action){if(['message','call','giveGift','romance'].includes(action))return personActionRaw(personId,action);const g0=farmLeft(`rel:${personId}:${action}`);if(g0<=0){toast(`You've already done that with them 3 times today. Try something else, or tomorrow.`);return}const b=traitBoost('relationship'),before=snapshotGains();guarded(`rel:${personId}:${action}`,()=>personActionRaw(personId,action));const p=personById(personId);if(p&&b.mult!==1){const prev=before.people[p.id];if(prev&&p.rel>prev[0])p.rel=clamp(prev[0]+(p.rel-prev[0])*b.mult)}}
function clubAction(clubId,kind){if(kind==='leave')return clubActionRaw(clubId,kind);guarded(`club:${clubId}:${kind}`,()=>clubActionRaw(clubId,kind))}
function hobbyAction(kind){guarded(`hobby:${kind}`,()=>hobbyActionRaw(kind))}
// ---------- UI ----------
function skillsHtml(){
 const s=ensureSkills(),boosted=boostedKeys(),rows=[['reading',S.development.skills.reading],['cooking',S.development.skills.cooking],...Object.entries(s)].filter(([,v])=>v>=1).sort((a,b)=>b[1]-a[1]),L=SKILL_KEY_LABEL();
 return rows.length?rows.map(([k,v])=>`<div class="skill-line lvl"><span>${boosted.has('skill:'+k)?'<em class="star" title="Boosted by your talent or personality">★</em> ':''}${esc(L[k]||k)}</span><div class="progress"><i style="width:${levelPct(v)}%"></i></div><b>Lv ${levelOf(v)}</b></div>`).join(''):'<p class="muted-text">Skills grow when you practice with books, supplies, sports gear and devices.</p>'
}
function repHtml(){const r=ensureRep(),ids=schoolIdentities(),boosted=boostedKeys();return `${ids.length?`<div class="fx-row identity-row">${ids.map(i=>`<span class="tag ok">${esc(i)}</span>`).join('')}</div>`:'<p class="muted-text">No strong school identity yet — it emerges from what you actually do.</p>'}${Object.entries(REP_DIMS).map(([k,l])=>`<div class="skill-line lvl"><span>${boosted.has('rep:'+k)?'<em class="star">★</em> ':''}${l}</span><div class="progress ${k==='troublemaker'?'dangerbar':''}"><i style="width:${k==='troublemaker'?Math.round(r[k]):levelPct(r[k])}%"></i></div><b>${k==='troublemaker'?`${Math.round(r[k])} • ${troubleLabel(r[k])}`:`Lv ${levelOf(r[k])}`}</b></div>`).join('')}`}
function traitsHtml(){
 const t=(S.talents||[]).map(x=>`<div class="trait-row"><b>★ ${esc(x)}</b><small>+25% to ${esc((TALENT_TARGETS[x]||[]).map(y=>y.split(':')[1]).join(', '))}</small></div>`).join(''),p=(S.personality||[]).filter(x=>TRAIT_TARGETS[x]).map(x=>`<div class="trait-row"><b>${esc(x)}</b><small>${esc(TRAIT_TARGETS[x].map(([k,v])=>`${v>0?'+':''}${Math.round(v*100)}% ${k.replace(/^.*:/,'').replace('stressGain','stress from studying').replace('relationship','closeness gains').replace('trust','trust gains').replace('study','study gains').replace('homework','homework')}`).join(', '))}</small></div>`).join('');
 return `${t||'<p class="muted-text">No talents chosen.</p>'}${p?`<h4>Personality</h4>${p}`:''}<p class="muted-text">★ marks skills and subjects that grow faster for you. Every result shows the bonus it used.</p>`
}
