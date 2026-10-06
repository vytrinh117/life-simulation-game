
// =====================================================================
// v7.3+ PHASE 3A.1 — Compact People card + full Profile (private info stays "Unknown" until you know them)
// v7.3+ PHASE 3A.2 — Relationship Log (routine) + Milestones (typed important moments)
// =====================================================================
const INTEREST_POOL=['Basketball','Soccer','Drawing','Music','Video games','Reading','Cooking','Dancing','Coding','Movies','Animals','Fashion','Science','Swimming','Photography','Skateboarding','Theater','Chess'];
function ensureInterests(o){if(!o)return o;if(!o.interests){const h=hashOf((o.id||o.firstName)+'int');const pick=k=>INTEREST_POOL[(h>>>(k*5))%INTEREST_POOL.length];const set=[...new Set([pick(0),pick(1),pick(2)])].slice(0,2+(h%2));o.interests=set;o.dislikes=[INTEREST_POOL.find((x,i)=>!set.includes(x)&&(h+i)%7===0)||'Crowds']}return o}
function personInterests(p){const n=npcById(p.npcId);return ensureInterests(n||p)}
function closenessLabel(v){return v>=88?'Very close':v>=75?'Close':v>=60?'Good':v>=40?'Friendly':v>=20?'Distant':'Cold'}
const MOOD_EMOJI={great:'😄',good:'😊',okay:'🙂',meh:'😐',low:'😕',bad:'😞',sad:'😢',angry:'😠',stressed:'😣',excited:'🤩'};
function moodEmoji(m){return MOOD_EMOJI[String(m||'good').toLowerCase()]||'🙂'}
function metLine(p){if(p.metAt)return `Met ${p.metAt}`;if(isFamilyPerson(p))return isSibling(p)?siblingLabel(p):(p.roleLabel||p.role);const r=String(p.roleLabel||p.role||'');return /classmate/i.test(r)?'Met at school':/neighbor/i.test(r)?'Neighbor':/team|club/i.test(r)?`Met through ${r.replace(/^.*?(club|team)/i,'$1')}`:`Known since age ${p.knownSince??S.age}`}
// HOTFIX P1.1 — one identity language for everyone: Full Name (Age) | Relationship; normal name casing
function personGenderLove(p,{showUnknown=false}={}){const id=personIdentity(p),parts=[id.gender||'Unknown'];if(!isFamilyPerson(p)&&loveInterestVisible(p)){if(loveInterestKnown(p))parts.push(`Love interest: ${id.orientation}`);else if(showUnknown)parts.push('Love interest: Unknown')}return parts.join(' · ')}
function personContextLine(p){const parts=[];if(isFamilyPerson(p)){parts.push(inHousehold(p)&&livesWithParents()?'Lives with you':p.role==='child'?'Your child':'Lives elsewhere');if(p.branch)parts.push(p.branch==='paternal'?"Dad's side":"Mom's side");return parts.join(' · ')}
 if(p.metAt)parts.push(`Met ${p.metAt}`);else{const m=metLine(p);if(!/^Known since/.test(m))parts.push(m)}const intro=p.introducedBy&&personById(p.introducedBy);if(intro)parts.push(`introduced by ${firstName(intro)}`);parts.push(`known since age ${p.knownSince??S.age}`);return parts.join(' · ')}
function personIdentityHead(p,tag='h3'){return `<${tag} class="pc-ident"><span class="pc-name">${esc(p.fullName||p.name)}</span> <span class="pc-age">(${personAge(p)})</span> <span class="pc-sep">|</span> <span class="rel-tag descriptor">${esc(relationshipDescriptor(p))}</span></${tag}>`}
function peopleCardCompact(p){const fam=isFamilyPerson(p),av=availabilityNow(p);
 return `<section class="person-card compact"><div class="pc-head">${personIdentityHead(p)}<span class="pc-mood" title="${esc(p.mood||'')}">${moodEmoji(p.mood)}</span></div>
 <p class="pc-line">${esc(personGenderLove(p))}</p><p class="pc-line muted-text">${esc(personContextLine(p))}</p>
 <p class="pc-line">Closeness: <b>${closenessLabel(p.rel)}</b>${av?` <span class="avail">· Right now: ${esc(av)}</span>`:''}</p>
 <div class="inline-actions"><button class="small primary" data-person-open="${p.id}">Interact</button>${S.age>=6&&!['parent','grandparent'].includes(p.role)?`<button class="small" data-plan-open="${p.id}">Plans</button>`:''}<button class="small ghost" data-profile-open="${p.id}">Profile</button>${!fam&&friendStatusLabel(p)?`<button class="small" data-reconnect="${p.id}">Reconnect</button>`:''}</div></section>`}
function peopleOrder(){const fam=S.people.filter(isFamilyPerson),rest=S.people.filter(p=>!isFamilyPerson(p)).sort((a,b)=>b.rel-a.rel);return [...fam,...rest]}
function knowsWell(p,lvl){return isFamilyPerson(p)||p.rel>=lvl}
function zodiacOf(p){if(!p.bday)return null;try{return zodiacFromDate(`2000-${p.bday}`)}catch(e){return null}}
function openProfile(id){const p=personById(id);if(!p)return;openModal('Profile',profileHtml(p))}
// ---------- milestones ----------
const MILESTONE_TYPES={friends:'Became friends',goodFriends:'Became good friends',closeFriends:'Became close friends',bestFriends:'Became best friends',rivals:'Became rivals',helped:'Helped during a hard time',firstDate:'First date',holdingHands:'First time holding hands',firstKiss:'First kiss',prom:'Prom together',official:'Became official',anniversary:'Dating anniversary',trip:'First trip together',engaged:'Engagement',married:'Marriage',reconciled:'Major reconciliation',concert:'Concert together',moment:'Big moment'};
function addPersonMilestone(p,type,text=null,opts={}){if(!p)return;p.milestones=p.milestones||[];if(opts.once!==false&&type!=='moment'&&type!=='anniversary'&&p.milestones.some(m=>m.type===type))return;p.milestones.unshift({type,label:MILESTONE_TYPES[type]||cap(type),text:text||'',dateISO:currentDate(),age:S.age});if(p.milestones.length>40)p.milestones.length=40}
function migrateMilestones(p){if(p.milestonesMigrated)return;p.milestonesMigrated=true;p.milestones=p.milestones||[];for(const h of (p.history||[]).slice().reverse())if((h.importance||1)>=3&&!GENERIC_MEMO.test(h.text)&&!/^Relationship:/.test(h.text))p.milestones.unshift({type:'moment',label:'Big moment',text:h.text,dateISO:h.dateISO,age:h.age})}
const TIER_MILESTONE={'Casual Friend':'friends','Friend':'friends','Good Friend':'goodFriends','Close Friend':'closeFriends','Best Friend':'bestFriends'};
function milestonesHtml(p){migrateMilestones(p);const m=p.milestones||[];return m.length?m.slice(0,14).map(x=>`<div class="pm-row"><small>${formatDate(x.dateISO||currentDate())}</small><span><b>${esc(x.label)}</b>${x.text?` — ${esc(x.text)}`:''}</span></div>`).join(''):'<p class="muted-text">Important moments — becoming friends, firsts, big events — appear here.</p>'}
function people3aClick(b){if(b.dataset.profileOpen){openProfile(b.dataset.profileOpen);return true}return false}
// =====================================================================
// v7.3+ PHASE 3A.5 — Profile / knowledge (W2): nothing is omniscient
// =====================================================================
function relationshipDescriptor(p){if(!p)return '';if(S.romance?.partnerId===p.id){const g=personIdentity(p).gender;return g==='Male'?'Boyfriend':g==='Female'?'Girlfriend':'Partner'}
 if(isFamilyPerson(p))return familyRelationLabel(p);return friendTier(p)||'Acquaintance'}
// --- romantic availability (knowledge state; 3B will add Talking / Engaged / Married sources) ---
function npcRelStatus(p){if(S.romance?.partnerId===p.id)return 'In a relationship (with you)';const cp=p.npcId&&partnerNpcOf(p.npcId);if(cp)return personAge(p)<16?'Seeing someone':'In a relationship';return 'Single'}
function relStatusKnown(p){return S.romance?.partnerId===p.id||!!p.relStatusKnown||tierRank(p)>=3||((p.rel??0)>=60&&(p.trust??50)>=55)}
function learnRelStatus(p,how){if(!p||p.relStatusKnown)return;p.relStatusKnown=how||true}
// --- parents / household ---
function parentsKnown(p){return !p.npcId?false:(p.parentsKnown||/neighbor/i.test(p.roleLabel||'')||tierRank(p)>=2||(p.rel??0)>=40)}
function npcParentsLine(p){const n=npcById(p.npcId);if(!n)return '';const hh=(S.households||[]).find(h=>h.id===n.householdId);return hh&&(hh.parents||[]).length?hh.parents.join(' and '):''}
// --- personality: only what you have observed or learned ---
function knownTraits(p){const all=(p.traits||[]);if(isFamilyPerson(p))return all;const r=tierRank(p),byTier=r>=4?all.length:r>=3?2:r>=2?1:0,obs=(p.observedTraits||[]).filter(t=>all.includes(t));const out=[...obs];for(const t of all){if(out.length>=Math.max(byTier,obs.length))break;if(!out.includes(t))out.push(t)}return out}
function observeTrait(p,t,why){if(!p||!(p.traits||[]).includes(t))return;p.observedTraits=p.observedTraits||[];if(p.observedTraits.includes(t))return;p.observedTraits.push(t);(p.history=p.history||[]).unshift({dateISO:currentDate(),age:S.age,text:why||`You realize ${firstName(p)} is ${t.toLowerCase()}.`,importance:1})}
function observeBusy(p){const c=(p.counterSeen=(p.counterSeen||0)+1);if(c>=2)observeTrait(p,'Busy',`${firstName(p)} always seems to be juggling plans — they keep offering another time.`)}
// --- life goals: shown only when learned; never invented ---
function goalsKnown(p){return isFamilyPerson(p)||!!p.goalsKnown}
function goalsText(p){return (p.goals||[]).map(g=>GOAL_LABEL[g]||g).join(', ')}
function askFuture(id){const p=personById(id);if(!p)return;if(goalsKnown(p)){toast('You already know what they hope for.');return}advanceTime(15,{silent:true});p.goalsAsked=currentDate();
 if((p.trust??50)<45){log(`Talking with ${firstName(p)}`,`"The future? Ugh, don't ask me that," ${firstName(p)} laughs, changing the subject.`);return}
 if(!(p.goals||[]).length){log(`Talking with ${firstName(p)}`,`"Honestly? No idea yet." ${firstName(p)} seems relieved to admit it.`);return}
 p.goalsKnown=true;p.rel=clamp(p.rel+1);(p.history=p.history||[]).unshift({dateISO:currentDate(),age:S.age,text:`They told you about their dreams: ${goalsText(p)}.`,importance:2});log(`Talking with ${firstName(p)}`,`${firstName(p)} opens up: they want to ${goalsText(p)}.`)}
// --- right-now availability (schedule) — different from the "Busy" personality trait ---
function availabilityNow(p){if(isFamilyPerson(p))return null;const a=npcStatusAt(p);return a.free?'Free now':a.atSchool?'At school':'Occupied right now'}
function profileHtml(p){const n=npcById(p.npcId)||p,ints=personInterests(p),U='Unknown',row=(k,v)=>statRow(k,esc(v??U)),wide=(k,v)=>`<div class="span2">${row(k,v)}</div>`;ensureNpcTraits(n);
 const bday=p.bday&&knowsWell(p,40)?formatDate(`${currentDate().slice(0,4)}-${p.bday}`).replace(/, \d{4}$/,''):U;
 const parents=p.npcId&&parentsKnown(p)?npcParentsLine(p):null,traits=knownTraits(p),hidden=(p.traits||[]).length>traits.length,avail=availabilityNow(p),fam=isFamilyPerson(p);
 const met=p.metAt||(fam?'Family':metLine(p)),intro=p.introducedBy?(personById(p.introducedBy)?.fullName||p.introducedBy):null;
 const bar=(k,v,cls='')=>`<label class="${cls}">${k} <span>${Math.round(v)}</span><i class="${cls==='conflict'?'dangerbar':''}"><em style="width:${clamp(v)}%"></em></i></label>`;
 return `<div class="profile"><div class="profile-head">${personIdentityHead(p,'h2')}<p>${esc(personGenderLove(p,{showUnknown:true}))}</p><p class="muted-text">${esc(personContextLine(p))}${p.metDate?` (${esc(formatDate(p.metDate))})`:''}</p>${parents?`<p class="muted-text">Parents: ${esc(parents)}</p>`:''}</div>
 <div class="profile-grid">
  <div class="span2"><h4>Personality / Lifestyle</h4><p>${traits.length?traits.map(esc).join(', '):U}${hidden&&traits.length?' <small class="muted-text">(there may be more you have not noticed yet)</small>':''}</p></div>
  ${row('Birthday',bday)}${row('Zodiac',bday!==U?(zodiacOf(p)||U):U)}${row('Looks',looksLabel(n.looks))}${row('Smart',knowsWell(p,60)?smartLabel(n.smart):U)}${row('Health',knowsWell(p,75)?(n.health!=null?`${Math.round(n.health)}%`:'Seems healthy'):U)}${row('Mood',`${moodEmoji(p.mood)} ${cap(p.mood||'okay')}`)}
  ${avail?row('Right now',avail):''}${!fam?row('Romantic status',relStatusKnown(p)?npcRelStatus(p):U):''}
  ${row('Interests',knowsWell(p,40)?ints.interests.join(', '):U)}${row('Dislikes',knowsWell(p,60)?ints.dislikes.join(', '):U)}
  ${wide('Life goals',goalsKnown(p)&&goalsText(p)?goalsText(p):U)}${!fam&&!goalsKnown(p)&&tierRank(p)>=2?`<div class="span2 inline-actions"><button class="small ghost" data-ask-future="${p.id}">Ask about their plans for the future</button></div>`:''}
  ${wide('Where met',met)}${wide('How met',p.metVia||U)}${intro?wide('Introduced by',intro):''}
 </div>
 <h4>Relationship to you</h4><div class="relationship-bars metrics-grid">${bar('Closeness',p.rel??0)}${bar('Trust',p.trust??50)}${bar('Fun',p.fun??50)}${bar('Respect',p.respect??50)}${bar('Reliability',p.reliability??70)}${bar('Conflict',p.conflict??0,'conflict')}</div></div>`}
// --- friendship milestones (section G): no duplicates on threshold wobble; contextual after real separation ---
Object.assign(MILESTONE_TYPES,{acquaintances:'Became acquaintances',casualFriends:'Became casual friends',reconnected:'Reconnected',closeAgain:'Became close again',faded:'Friendship faded'});
function hasMs(p,...types){return (p.milestones||[]).some(m=>types.includes(m.type))}
function friendshipMilestone(p,t){if(isFamilyPerson(p))return;
 if(t==='Acquaintance'){if(p.metDate&&!hasMs(p,'acquaintances'))addPersonMilestone(p,'acquaintances');return}
 if(t==='Casual Friend'){if(!hasMs(p,'casualFriends','friends','goodFriends','closeFriends','bestFriends'))addPersonMilestone(p,'casualFriends');return}
 if(t==='Close Friend'||t==='Best Friend'){const sep=p.separatedSince&&daysBetween(p.separatedSince,currentDate())>=60;
  if(hasMs(p,'closeFriends','bestFriends')&&sep){addPersonMilestone(p,'closeAgain','',{once:false});p.separatedSince=null;return}
  if(t==='Close Friend'&&!hasMs(p,'closeFriends'))addPersonMilestone(p,'closeFriends');if(t==='Best Friend'&&!hasMs(p,'bestFriends'))addPersonMilestone(p,'bestFriends');p.separatedSince=null}}
function noteSeparation(p){if(!p.separatedSince)p.separatedSince=currentDate()}
function people3a5Click(b){if(b.dataset.askFuture){askFuture(b.dataset.askFuture);save();render();return true}return false}
