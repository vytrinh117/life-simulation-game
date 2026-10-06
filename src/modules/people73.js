
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
function howYouKnowThem(p){/* HOTFIX P1.3 — one readable summary composed from the stored meeting data (metAt, metVia, introducedBy, knownSince); unknown parts are omitted, nothing is flattened */
 if(isFamilyPerson(p))return personContextLine(p);const parts=[];const role=String(p.roleLabel||p.role||'');
 let place=p.metAt?String(p.metAt).replace(/^(at|in|on|during)\s+(a |an |the )?/i,''):/classmate/i.test(role)?'school':/neighbor/i.test(role)?'neighborhood':/(club|team)/i.test(role)?role.replace(/^.*?((?:\w+\s)?(?:club|team)).*$/i,'$1'):null;if(place)parts.push(cap(place));
 const esc_re=x=>String(x).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),via=p.metVia&&!/^(classmate|neighbor|friend)$/i.test(p.metVia)&&(!place||!new RegExp(esc_re(place),'i').test(p.metVia))?String(p.metVia):null;/* metVia is shown unless it only repeats the place (e.g. 'met at a party' when the place is 'party') */if(via)parts.push(via);
 const intro=p.introducedBy&&personById(p.introducedBy);if(intro)parts.push(`introduced by ${intro.fullName||intro.name}`);parts.push(`known since age ${p.knownSince??S.age}`);return parts.join(' · ')}
function profileHtml(p){/* HOTFIX P1.3 — Profile in the selected A2 layout: one header with a relationship badge, Personal details (3×2 tiles), Social & lifestyle, Life goals strip, How you know them strip, Relationship to you (3×2 metric tiles) */
 const n=npcById(p.npcId)||p,ints=personInterests(p),U='Unknown',fam=isFamilyPerson(p);ensureNpcTraits(n);
 const bday=p.bday&&knowsWell(p,40)?formatDate(`${currentDate().slice(0,4)}-${p.bday}`).replace(/, \d{4}$/,''):U;
 const parents=p.npcId&&parentsKnown(p)?npcParentsLine(p):null,traits=knownTraits(p),hidden=(p.traits||[]).length>traits.length,avail=availabilityNow(p);
 const tile=(ic,label,val,cls='')=>`<div class="pf-tile ${cls}">${icon(ic)}<div><small>${label}</small><b>${val}</b></div></div>`;
 const social=[avail?tile('clock','Right now',esc(avail)):'',!fam?tile('heart','Romantic status',esc(relStatusKnown(p)?npcRelStatus(p):U)):'',tile('target','Interests',esc(knowsWell(p,40)?ints.interests.join(', '):U)),tile('thumbs-down','Dislikes',esc(knowsWell(p,60)?ints.dislikes.join(', '):U))].filter(Boolean);
 const goal=goalsKnown(p)&&goalsText(p)?esc(goalsText(p)):U,canAsk=!fam&&!goalsKnown(p)&&tierRank(p)>=2;
 const metric=(ic,label,v,cls)=>`<div class="pf-metric ${cls}">${icon(ic)}<div class="pf-metric-body"><small>${label}</small><div class="pf-metric-row"><b>${Math.round(v)}</b><i class="pf-bar"><em style="width:${clamp(v)}%"></em></i></div></div></div>`;
 return `<div class="profile pf">
 <header class="profile-head pf-head"><div class="pf-title"><h2 class="pc-ident"><span class="pc-name">${esc(p.fullName||p.name)}</span> <span class="pc-age">(${personAge(p)})</span></h2><span class="rel-badge descriptor">${esc(relationshipDescriptor(p))}</span></div>
  <p class="pf-line">${esc(personGenderLove(p,{showUnknown:true}))}</p><p class="pf-line muted-text">${esc(personContextLine(p))}</p>${parents?`<p class="pf-line muted-text pf-parents">${icon('users')}<span>Parents: ${esc(parents)}</span></p>`:''}</header>
 <section class="pf-sec"><h4 class="pf-h">Personal details</h4><div class="pf-grid pf-3">${tile('calendar','Birthday',esc(bday))}${tile('moon','Zodiac',esc(bday!==U?(zodiacOf(p)||U):U))}${tile('sparkle','Looks',esc(looksLabel(n.looks)))}${tile('health','Health',esc(knowsWell(p,75)?(n.health!=null?`${Math.round(n.health)}%`:'Seems healthy'):U))}${tile('book','Smart',esc(knowsWell(p,60)?smartLabel(n.smart):U))}${tile('smile','Mood',`${moodEmoji(p.mood)} ${esc(cap(p.mood||'okay'))}`)}</div></section>
 <section class="pf-sec"><h4 class="pf-h">Social &amp; lifestyle</h4><div class="pf-grid pf-2 ${social.length%2?'pf-odd':''}">${social.join('')}</div>
  <div class="pf-tile pf-wide">${icon('sprout')}<div><small>Personality / Lifestyle</small><b>${traits.length?traits.map(esc).join(', '):U}</b>${hidden&&traits.length?'<span class="muted-text pf-note">There may be more you have not noticed yet.</span>':''}</div></div></section>
 <div class="pf-strip">${icon('flag')}<span class="pf-strip-label">Life goals</span><span class="pf-strip-val">${goal}</span>${canAsk?`<button class="small pf-ask" data-ask-future="${p.id}">${icon('smile')}<span>Ask about their plans for the future</span></button>`:''}</div>
 <div class="pf-strip">${icon('users')}<span class="pf-strip-label">How you know them</span><span class="pf-strip-val">${esc(howYouKnowThem(p))}${p.metDate?` <span class="muted-text">(met ${esc(formatDate(p.metDate))})</span>`:''}</span></div>
 <section class="pf-sec"><h4 class="pf-h">Relationship to you</h4><div class="pf-grid pf-3 pf-metrics">${metric('heart','Closeness',p.rel??0,'m-close')}${metric('handshake','Trust',p.trust??50,'m-trust')}${metric('star','Fun',p.fun??50,'m-fun')}${metric('shield','Respect',p.respect??50,'m-respect')}${metric('gear','Reliability',p.reliability??70,'m-rely')}${metric('bolt','Conflict',p.conflict??0,'m-conflict')}</div></section></div>`}
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

// =====================================================================
// HOTFIX P1.2 — People hub categories (relationship category is separate from household residence)
// =====================================================================
const PEOPLE_FILTERS=[['all','All'],['family','Family'],['relatives','Relatives'],['bonds','Closest Bonds'],['friends','Friends'],['acquaintances','Acquaintances'],['past','Past Connections']];
const FAMILY_CORE_RELATIONS=['mother','father','parent','sibling','child'];
function peopleCategory(p){if(!p)return 'acquaintances';if(S.romance?.partnerId===p.id)return 'bonds';
 if(isFamilyPerson(p)){if(!p.relation)migrateRelations();return FAMILY_CORE_RELATIONS.includes(p.relation)||['parent','older sibling','younger sibling','sibling','child'].includes(p.role)?'family':'relatives'}
 const st=friendStatusLabel(p);if(st==='Old Friend'||st==='Former Friend'||p.formerPartner)return 'past';const t=friendTier(p);
 if(t==='Best Friend')return 'bonds';if(t==='Close Friend'||t==='Casual Friend')return 'friends';return 'acquaintances'}
function familyOverviewHtml(){const fr=familyRules(),d=[['Closeness',S.family.closeness],['Tension',S.family.tension],['Responsibility',S.family.responsibility],['Household strictness',fr.strictness],['Generosity',fr.generosity]];
 return `<div class="family-overview"><h4>Family overview</h4><div class="fam-dyn">${d.map(([k,v])=>`<div><small>${k}</small><b>${Math.round(v??0)}%</b></div>`).join('')}</div>
 <div class="inline-actions"><button class="small primary" data-act="familyTalk">${S.age<3?'Connect with caregiver':S.age<6?'Talk / express yourself':'Have a real conversation'}</button></div>
 ${familyTreeHtml()}${housingHtml()}${familyTripHtml()}
 <div class="fam-events"><h4>Family events & memories</h4>${S.familyEvents.slice(0,8).map(e=>`<div class="row"><span>${esc(e.text)}</span><small>${e.dateISO?formatDate(e.dateISO):'Age '+S.age}</small></div>`).join('')||'<p class="muted-text">No recent special family event.</p>'}</div></div>`}
function peopleHubClick(b){if(b.dataset.peopleFilter){UI.peopleFilter=b.dataset.peopleFilter;saveUI();renderPanel();return true}return false}
