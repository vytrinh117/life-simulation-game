// =====================================================================
// v7.3+ PHASE 3A.3 — Friendship ladder: Stranger → Acquaintance → Casual Friend → Close Friend → Best Friend
// Multi-dimensional: closeness, trust, respect, reliability, conflict, time known and shared days (for people met during
// play), shared milestones. Statuses for faded friendships: Old Friend / Former Friend / Contact (never deleted).
// =====================================================================
const FRIEND_STATUSES=['Old Friend','Former Friend','Contact'];
const LEGACY_TIER={Friend:'Casual Friend','Good Friend':'Casual Friend'};
function sharedDays(p){const since=p.metDate||'0000';return new Set((p.history||[]).filter(h=>h.dateISO&&h.dateISO>=since).map(h=>h.dateISO)).size}
function knownDays(p){return p.metDate?daysBetween(p.metDate,currentDate()):99999}
function sharedMoments(p){return (p.milestones||[]).filter(m=>!['friends','goodFriends','closeFriends','bestFriends'].includes(m.type)).length}
function lastContact(p){return (p.history||[])[0]?.dateISO||p.metDate||null}
function friendshipTier(p){const rel=p.rel??0,tr=p.trust??50,rs=p.respect??50,rl=p.reliability??70,cf=p.conflict??0,timed=!!p.metDate,sh=timed?sharedDays(p):999,kn=knownDays(p),ms=timed?sharedMoments(p):9;
 if(timed&&sh<1&&rel<25)return 'Stranger';
 if(rel>=86&&tr>=72&&rs>=45&&rl>=55&&cf<30&&kn>=60&&sh>=15&&ms>=1)return 'Best Friend';
 if(rel>=72&&tr>=55&&cf<45&&kn>=21&&sh>=6)return 'Close Friend';
 if(rel>=40&&tr>=30&&cf<60&&sh>=2)return 'Casual Friend';
 return 'Acquaintance'}
function friendStatusLabel(p){return FRIEND_STATUSES.includes(p.friendStatus)?p.friendStatus:null}
function migrateFriendTiers(){for(const p of S.people||[]){if(LEGACY_TIER[p.tier])p.tier=LEGACY_TIER[p.tier];if(p.respect==null&&!isFamilyPerson(p))p.respect=50}}
// ---------- network size and natural drift (weekly) ----------
function activeFriends(){return S.people.filter(p=>!isFamilyPerson(p)&&!p.movedAway&&!friendStatusLabel(p)&&tierRank(p)>=2&&p.id!==S.romance?.partnerId)}
function setFriendStatus(p,st,why){if(p.friendStatus===st)return;p.friendStatus=st;p.statusSince=currentDate();noteSeparation(p);if(st!=='Contact'&&hasMs(p,'casualFriends','friends','goodFriends','closeFriends','bestFriends')&&p.milestones?.[0]?.type!=='faded')addPersonMilestone(p,'faded',st==='Former Friend'?'after things went sour':'',{once:false});(p.history=p.history||[]).unshift({dateISO:currentDate(),age:S.age,text:why,importance:1});if(!SIM.skipping)log(`${displayName(p)}: ${st}`,why)}
function friendNetworkTick(){if(!S.people||parseISO(currentDate()).getUTCDay()!==1)return;const t=currentDate();
 for(const p of S.people){if(isFamilyPerson(p)||p.id===S.romance?.partnerId)continue;const gap=lastContact(p)?daysBetween(lastContact(p),t):0,tr=friendshipTier(p);
  if(!friendStatusLabel(p)){
   if((p.conflict??0)>=70&&(p.rel??0)<30&&['Casual Friend','Acquaintance'].includes(tr)&&p.tier&&TIER_RANK[p.tier]>=2)setFriendStatus(p,'Former Friend',`Things went sour with ${firstName(p)} — you are not really friends anymore.`);
   else if(tr==='Casual Friend'&&gap>=120)setFriendStatus(p,'Old Friend',`You and ${firstName(p)} have not talked in months. Still friendly, just not in each other's lives right now.`);
   else if((tr==='Close Friend'||tr==='Best Friend')&&gap>=240)p.rel=clamp((p.rel??0)-2)}}   // strong friendships fade slowly instead of flipping status
 const act=activeFriends();if(act.length>50){const cand=act.filter(p=>friendshipTier(p)==='Casual Friend').sort((a,b)=>((a.rel??0)-Math.min(60,daysBetween(lastContact(a)||t,t)/3))-((b.rel??0)-Math.min(60,daysBetween(lastContact(b)||t,t)/3)));
  for(const p of cand.slice(0,act.length-50))setFriendStatus(p,(p.rel??0)>=35?'Old Friend':'Contact',`Life got busy; you and ${firstName(p)} drifted out of touch.`)}}
function reconnect(id){const p=personById(id);if(!p||!friendStatusLabel(p)){toast('You are already in touch.');return}const was=p.friendStatus;p.friendStatus=null;p.rel=clamp((p.rel??30)+3);p.conflict=was==='Former Friend'?clamp((p.conflict??0)-10):p.conflict;(p.history=p.history||[]).unshift({dateISO:currentDate(),age:S.age,text:was==='Former Friend'?'You reached out to make things right.':'You reconnected after a long time.',importance:2});if(was==='Former Friend')addPersonMilestone(p,'reconciled','',{once:false});else if(p.milestones?.[0]?.type!=='reconnected')addPersonMilestone(p,'reconnected','',{once:false});advanceTime(20,{silent:true});log(`Reconnecting with ${firstName(p)}`,was==='Former Friend'?`You message ${firstName(p)} to talk things out. It is awkward, then it is not.`:`You message ${firstName(p)} out of the blue. "Oh my god, hi! It's been forever."`)}
function friends3aClick(b){if(b.dataset.reconnect){reconnect(b.dataset.reconnect);save();render();return true}return false}
// respect: earned by showing up and being dependable, lost by no-shows and lies
function adjustRespect(p,d){if(!p||isFamilyPerson(p))return;p.respect=clamp((p.respect??50)+d)}
