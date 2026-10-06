// =====================================================================
// v7.3 O — Every invitation shows who / what / where / when / answer-by; romance toggle; several friend groups
// =====================================================================
const INVITE_META_TYPES=['invitation','friendInvite','birthdayInvite','promInvite','vacationProposal','vacationAgain','nbh','party','schoolSocial','surpriseParty','incomingCall','ptcNotice','meetPeople','helpRequest','loveAdvice','weatherSchool','homeAloneParty','counselor'];
function whenLabel(dateISO,minute){if(!dateISO)return 'Right now';const t=currentDate(),near=dateISO===t&&minute!=null&&minute-currentMinute()<=30;if(near)return `Right now (${timeLabel(minute)})`;const day=dateISO===t?'Today':dateISO===addDays(t,1)?'Tomorrow':formatDate(dateISO);return minute!=null?`${day}, ${timeLabel(minute)}`:day}
function inviteMeta(e){
 if(!INVITE_META_TYPES.includes(e.type))return null;if(actorMissing(e))console.warn('Interpersonal event missing actor:',e.id,e.type);const p=personById(e.participants?.[0]),who=p?`${p.fullName||p.name}${friendTier(p)?` • ${friendTier(p)}`:p.role&&isFamilyPerson(p)?` • ${p.roleLabel||p.role}`:''}`:null;
 const by=e.expiresAt?whenLabel(e.expiresAt.dateISO,e.expiresAt.minute):null;let m={from:who,what:e.title,where:null,when:'Right now',by};
 if(e.type==='invitation'){const pl=S.plans?.find(x=>x.id===e.payload?.planId);if(pl){m.what=pl.title||PLAN_TYPES[pl.type]?.label;m.where=pl.location||PLAN_TYPES[pl.type]?.loc;m.when=whenLabel(pl.dateISO,pl.startMinute)+(pl.endMinute?`–${timeLabel(Math.min(pl.endMinute,1439))}`:'');if(pl.answerBy)m.by=whenLabel(pl.answerBy.dateISO,pl.answerBy.minute)}}
 else if(e.type==='promInvite'){const pr=S.school?.prom;m.what=pr?.junior?'Junior Prom (as their date)':'Prom (as their date)';if(pr){m.where=pr.venue;m.when=whenLabel(pr.dateISO,1140)}}
 else if(e.type==='vacationProposal'||e.type==='vacationAgain'){const o=S.tripOffer,cg=caregiverPerson();m.from=cg?`${displayName(cg)} (family)`:'Your parents';if(o){m.what=`Family trip (${o.len} days, by ${o.transport})`;m.where=o.dest;m.when=`${formatDate(o.start)} – ${formatDate(o.end)}`}}
 else if(e.type==='nbh'){const h=S.households?.find(x=>x.id===e.payload?.hhId);m.from=h?`The ${h.surname} family (neighbors)`:'Your neighborhood';m.where={festival:'The square',market:'The square',watch:'Community center',garden:'Community garden',blockParty:'Your street'}[e.payload?.kind]||'Your street';m.when=['festival'].includes(e.payload?.kind)?'This weekend':'Right now'}
 else if(e.type==='ptcNotice'){const c=S.school?.conf?.[e.payload?.key];m.from='Your teacher';m.what='Parent–teacher conference (for your parents)';m.where='School';if(c)m.when=whenLabel(c.date,960)}
 else if(e.type==='counselor'){m.from='School counselor';m.where='Counselor\'s office'}
 else if(e.type==='incomingCall'){m.what='Phone call';m.where='Your phone'}
 else if(e.type==='surpriseParty'){m.from=(e.participants||[]).map(personById).filter(Boolean).map(firstName).join(', ')||'Your friends';m.where='School cafeteria'}
 else if(e.type==='weatherSchool'){const cg=caregiverPerson();m.from=cg?displayName(cg):'Your caregiver';m.what='Go to school today?';m.where='Home'}
 return m}
function inviteMetaHtml(e){const m=inviteMeta(e);if(!m)return '';const row=(k,v)=>v?`<div><span>${k}</span><b>${esc(String(v).replace(/^./,c=>c.toUpperCase()))}</b></div>`:'';return `<div class="invite-meta">${row('From',m.from)}${row('What',m.what)}${row('Where',m.where)}${row('When',m.when)}${row('Answer by',m.by)}</div>`}
// ---------- romance on/off ----------
function toggleRomance(){if(!S.romance.optOut&&S.romance.partnerId){toast('You are in a relationship — end it first if you want romance content off.');return}S.romance.optOut=!S.romance.optOut;log(S.romance.optOut?'Romance content off':'Romance content on',S.romance.optOut?'Crushes, dates and romantic events will not appear. You can turn this back on any time in Family & Relationships.':'Romance options are available again where they fit your age.')}
// ---------- several friend groups (up to 3) ----------
const GROUP_NAMES=['the lunch table crew','the after-school gang','the back-row group','the group chat','the weekend squad','the study circle','the corner table'];
function groupsOf(pid){return (S.groups||[]).filter(g=>g.members.includes(pid))}
function formGroups(){S.groups=S.groups||[];if(S.groups.length>=3)return;const inG=new Set(S.groups.flatMap(g=>g.members)),free=S.people.filter(p=>!isFamilyPerson(p)&&p.rel>=55&&!p.movedAway&&!inG.has(p.id));if(free.length<3)return;
 const used=new Set(S.groups.map(g=>g.name)),g={id:uid('grp'),name:rand(GROUP_NAMES.filter(n=>!used.has(n)))||'another friend group',members:free.slice(0,4).map(p=>p.id),jokes:[],formed:currentDate()};S.groups.push(g);if(!SIM.skipping)log(S.groups.length===1?'A friend group forms':'Another friend group',`You, ${g.members.map(id=>firstName(personById(id))).join(', ')} became "${g.name}".`,true)}
function oClick(b){const d=b.dataset;if(d.romanceToggle){toggleRomance();save();render();return true}return false}
// =====================================================================
// HOTFIX H2 — Interpersonal events must have a real, persistent actor
// =====================================================================
const ACTOR_REQUIRED=new Set(['threadFollowUp','siblingRequest','siblingNegotiate','invitation','friendInvite','birthdayInvite','promInvite','incomingCall','helpRequest','loveAdvice','schoolSocial','surpriseParty']);
function eventActor(e){return (e?.participants||[]).map(personById).find(Boolean)||null}
function actorMissing(e){return !!e&&ACTOR_REQUIRED.has(e.type)&&!eventActor(e)}
function supersedeEvent(e,why){e.status='Superseded';e.resolution=why;e.resolvedAt={dateISO:currentDate(),minute:currentMinute()};resolveNotificationsFor(e.id);if(S.current&&(S.current.sourceId===e.id||(!S.current.sourceId&&S.current.title===e.title)))S.current=null}
// Old saves: actor-less invitations are bound to a real birthday when one truly matches, otherwise retired without any relationship effect.
function repairActorlessEvents(){if(!S?.events)return;for(const e of S.events){if(e.status!=='Open'||!actorMissing(e))continue;
 if(e.type==='birthdayInvite'){const t=currentDate(),y=t.slice(0,4),cand=S.people.find(p=>p.bday&&!isFamilyPerson(p)&&!p.movedAway&&tierRank(p)>=1&&(()=>{const d=`${y}-${p.bday}`;return d>=addDays(t,-1)&&d<=addDays(t,7)})()&&!(p.bdayInviteYear||{})[y]);
  if(cand){const d=`${y}-${cand.bday}`;if(daysBetween(t,d)>=1)npcBirthdayInviteFor(cand,d)}}
 supersedeEvent(e,'Invalid legacy event (no real person)')}}
function npcBirthdayInviteFor(p,partyDay){const y=partyDay.slice(0,4);p.bdayInviteYear=p.bdayInviteYear||{};if(p.bdayInviteYear[y])return null;return npcBirthdayInvite(p,partyDay)}
