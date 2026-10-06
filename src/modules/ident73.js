
// =====================================================================
// v7.3 P3 — NPC age, gender and love interest on people cards; love interest revealed by closeness or asking;
// romance and NPC couples respect who people are interested in. Hidden entirely when either person is under 13.
// =====================================================================
const NAME_FEMALE=new Set(['Olivia','Emma','Ava','Sophia','Isabella','Mia','Amelia','Harper','Evelyn','Abigail','Ella','Chloe','Grace','Zoe','Lily','Nora','Hannah','Aria','Layla','Maya','Stella','Aurora','Naomi','Ruby','Priya','Fatima','Sofia','Aisha','Alexandra','Katherine','Elizabeth','Margaret',
 'Châu','Hà','Hạnh','Hoa','Hương','Lan','Linh','Mai','My','Ngọc','Nhi','Phương','Quỳnh','Thảo','Thu','Trang','Uyên','Vy','Yến','Nhung',
 'Seoyeon','Haeun','Yuna','Hayoon','Jiyu','Chaewon','Minseo','Yejin','Dahyun','Sumin','Jisoo','Yerin','Soojin','Hana','Nayeon',
 'Yui','Hina','Sakura','Mei','Akari','Mio','Koharu','Nanami','Emi',
 'Jing','Yan','Ling','Ting','Ning',
 'Jade','Louise','Alice','Chloé','Léa','Manon','Inès','Lina','Zoé','Juliette','Yasmine',
 'Malee','Ploy','Kanya','Ratana','Pim','Fon','Mali','Siriporn']);
const NAME_MALE_EXPLICIT=new Set();
const NAME_UNISEX=new Set(['Riley','Jordan','An','Bảo','Giang','Khánh','Minh','Tâm','Tú','Anh','Jiwoo','Aoi','Rin','Hinata','Sora','Xin','Hui','Qing','Yi','Rui','Xuan','Yu','Camille','Bee','Nong','Tawan','Win']);
// family-name pools (phase 5a) are part of the classification too — female/male lists are explicit there
if(typeof FAMILY_NAMES!=='undefined')for(const v of Object.values(FAMILY_NAMES)){for(const n of v.f||[])NAME_FEMALE.add(n);for(const n of v.m||[])NAME_MALE_EXPLICIT.add(n)}
function nameGender(first){if(NAME_MALE_EXPLICIT.has(first)&&!NAME_FEMALE.has(first)&&!NAME_UNISEX.has(first))return 'Male';if(!first)return null;if(NAME_FEMALE.has(first))return 'Female';if(NAME_UNISEX.has(first))return null;return 'Male'}
function hashOf(s){let h=0;for(const ch of String(s))h=(h*31+ch.charCodeAt(0))>>>0;return h}
function rollOrientation(gender,seed,age){const r=hashOf(seed+'or')%1000;if(age<16&&r<100)return 'Not sure yet';const x=r%100;if(gender==='Non-binary')return x<70?'All genders':x<85?'Women':x<95?'Men':'Not interested in romance';if(x<84)return gender==='Female'?'Men':'Women';if(x<89)return gender==='Female'?'Women':'Men';if(x<97)return 'All genders';return 'Not interested in romance'}
function ensureIdentity(o,first,age){if(!o)return o;if(!o.gender){const g=nameGender(first||o.firstName);o.gender=hashOf(o.id||first)%100<3?'Non-binary':g||(hashOf((o.id||first)+'g')%2?'Female':'Male')}if(!o.orientation)o.orientation=rollOrientation(o.gender,o.id||first,age??30);return o}
function familyGender(p){if(!p.relation&&isFamilyPerson(p))migrateRelations();if(p.gender)return p.gender;return RELATION_GENDER[p.relation]||null}
function personIdentity(p){if(!p)return {};const n=npcById(p.npcId);if(n){ensureIdentity(n,n.firstName,npcAge(n));return {gender:n.gender,orientation:n.orientation}}if(!p.gender){p.gender=familyGender(p)||nameGender(p.firstName||String(p.name).split(' ')[0])||(hashOf(p.id)%2?'Female':'Male')}if(!p.orientation)p.orientation=rollOrientation(p.gender,p.id,personAge(p));return {gender:p.gender,orientation:p.orientation}}
function playerGender(){const g=String(S.gender||'');return /girl|woman|female/i.test(g)?'Female':/boy|\bman\b|male/i.test(g)?'Male':'Non-binary'}
function orientationIncludes(orient,gender,seed){if(orient==='All genders')return true;if(orient==='Not interested in romance')return false;if(orient==='Not sure yet')return hashOf(seed+'ns')%2===0;if(gender==='Non-binary')return hashOf(seed+'nb')%3===0;return (orient==='Men'&&gender==='Male')||(orient==='Women'&&gender==='Female')}
function npcInterestedInPlayer(p){const id=personIdentity(p);return orientationIncludes(id.orientation,playerGender(),p.id)}
function npcsCompatible(a,b){ensureIdentity(a,a.firstName,npcAge(a));ensureIdentity(b,b.firstName,npcAge(b));return orientationIncludes(a.orientation,b.gender,a.id)&&orientationIncludes(b.orientation,a.gender,b.id)}
function loveInterestVisible(p){return S.age>=13&&personAge(p)>=13&&!isFamilyPerson(p)}
function loveInterestKnown(p){return loveInterestVisible(p)&&(p.loveKnown||p.rel>=60||p.id===S.romance?.partnerId)}
function identityLine(p){const id=personIdentity(p),a=personAge(p);let line=`${a} • ${id.gender}`;if(loveInterestVisible(p))line+=` • Interested in: ${loveInterestKnown(p)?id.orientation:'Unknown'}`;return line}
function askLoveLife(personId){const p=personById(personId);if(!p||!loveInterestVisible(p))return;if(loveInterestKnown(p)){toast(`You already know: ${personIdentity(p).orientation}.`);return}const r=p.trust>=55||p.rel>=55?85:p.trust<40?15:50;advanceTime(15,{silent:true});
 if(chance(r)){p.loveKnown=true;p.rel=clamp(p.rel+1);const o=personIdentity(p).orientation;log(`Talking with ${firstName(p)}`,{'Not sure yet':`"Honestly? I'm still figuring that out." It feels good that they told you.`,'Not interested in romance':`"I'm just not really into dating or romance. Never have been." They seem relieved you asked kindly.`}[o]||`${firstName(p)} tells you they are into ${o==='All genders'?'people of any gender':o.toLowerCase()}. They seem glad you asked.`)}
 else{p.rel=clamp(p.rel-1);log(`Talking with ${firstName(p)}`,`"That's kind of personal," ${firstName(p)} says, changing the subject. Maybe once you know each other better.`)}}
function identityTick(){for(const n of S.npcs||[]){if(!n.gender||!n.orientation)ensureIdentity(n,n.firstName,npcAge(n));if(n.orientation==='Not sure yet'&&npcAge(n)>=17)n.orientation=rollOrientation(n.gender,n.id+'later',30)}for(const p of S.people||[]){if(!loveInterestVisible(p))continue;if(!p.loveKnown&&p.rel>=60){p.loveKnown=true;if(!SIM.skipping&&p.id!==S.romance?.partnerId)log(`Getting closer to ${firstName(p)}`,`At some point ${firstName(p)} mentions who they are into: ${personIdentity(p).orientation==='All genders'?'any gender':personIdentity(p).orientation.toLowerCase()}.`)}}}
function migrateIdentity(){ensurePlayerTraits();migrateFamily();repairActorlessEvents();for(const n of S.npcs||[]){ensureIdentity(n,n.firstName,npcAge(n));ensureNpcTraits(n);ensureInterests(n)}for(const p of S.people||[])personIdentity(p);if(S.identityMigrated||!(S.npcs||[]).length)return;S.identityMigrated=true;for(const p of S.people||[]){if(p.romanceInit&&p.id!==S.romance?.partnerId&&loveInterestVisible(p)&&!npcInterestedInPlayer(p)){p.romanceOpen=false;p.orientationMismatch=true}}for(const c of S.npcCouples||[])if(c.status==='dating'){const a=npcById(c.a),b=npcById(c.b);if(a&&b&&!npcsCompatible(a,b))breakNpcCouple(c,'they realized they wanted different things')}}
function identClick(b){if(b.dataset.askLove){askLoveLife(b.dataset.askLove);save();render();return true}return false}
