(()=>{'use strict';

const D=window.LS_DATA;
const $=id=>document.getElementById(id);
const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,Number.isFinite(Number(n))?Number(n):0));
const money=n=>'$'+Math.round(Number(n)||0).toLocaleString();
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const rand=a=>a&&a.length?a[Math.floor(Math.random()*a.length)]:null;
const chance=p=>Math.random()*100<clamp(p,0,100);
const uid=(p='id')=>`${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
const KEY='lifeSim_v7_world';
const LEGACY_KEYS=['lifeSim_v6_contextualWorld','lifeSim_v5_developmentalWorld','lifeSim_v1_autosave'];

let S=null,active='home',mode='custom',selectedP=[],selectedT=[],modalContext=null;

function parseISO(value){
 const m=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
 if(!m)return new Date(Date.UTC(2010,0,1));
 return new Date(Date.UTC(Number(m[1]),Number(m[2])-1,Number(m[3])));
}
function isoDate(d){return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`}
function addDays(dateISO,n){const d=parseISO(dateISO);d.setUTCDate(d.getUTCDate()+Number(n||0));return isoDate(d)}
function daysBetween(a,b){return Math.round((parseISO(b)-parseISO(a))/86400000)}
function sameMonthDay(a,b){const x=parseISO(a),y=parseISO(b);return x.getUTCMonth()===y.getUTCMonth()&&x.getUTCDate()===y.getUTCDate()}
function formatDate(dateISO){return parseISO(dateISO).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric',year:'numeric',timeZone:'UTC'})}
function timeLabel(minute){const m=((Math.round(minute)||0)%1440+1440)%1440,h=Math.floor(m/60),mm=m%60;return new Date(Date.UTC(2000,0,1,h,mm)).toLocaleTimeString([], {hour:'numeric',minute:'2-digit',timeZone:'UTC'})}
function currentDate(){return S?.clock?.dateISO||S?.dob||'2010-01-01'}
function currentMinute(){return S?.clock?.minute??480}
function weekday(){return parseISO(currentDate()).toLocaleDateString(undefined,{weekday:'long',timeZone:'UTC'})}
function season(){const m=parseISO(currentDate()).getUTCMonth()+1;return [12,1,2].includes(m)?'Winter':[3,4,5].includes(m)?'Spring':[6,7,8].includes(m)?'Summer':'Autumn'}
function ageFromDate(dob,dateISO){const b=parseISO(dob),d=parseISO(dateISO);let a=d.getUTCFullYear()-b.getUTCFullYear();const before=d.getUTCMonth()<b.getUTCMonth()||(d.getUTCMonth()===b.getUTCMonth()&&d.getUTCDate()<b.getUTCDate());return Math.max(0,a-(before?1:0))}
function lifeStage(age=S?.age??0){return age<=1?'Infant':age<=4?'Toddler':age<=7?'Young child':age<=12?'Child':age<=15?'Early teen':age<=17?'Teen':age<=22?'Young adult':age<=39?'Adult':age<=59?'Middle age':'Older adult'}
function mentalityFor(p){const map={Calm:'Steady',Bold:'Bold',Ambitious:'Driven',Curious:'Curious',Funny:'Playful',Romantic:'Romantic',Competitive:'Competitive',Shy:'Reserved',Social:'Social',Independent:'Independent',Empathetic:'Empathetic',Responsible:'Grounded',Creative:'Creative'};return map[(p||[])[0]]||'Balanced'}

function toast(text){const n=$('toast');if(!n)return;n.textContent=text;n.classList.add('show');clearTimeout(window.__lifeToast);window.__lifeToast=setTimeout(()=>n.classList.remove('show'),2300)}
function safeNum(v,fallback=0,a=-Infinity,b=Infinity){v=Number(v);return Number.isFinite(v)?Math.max(a,Math.min(b,v)):fallback}
function log(title,text,important=false){if(!S)return;S.log=S.log||[];S.log.unshift({id:uid('log'),dateISO:currentDate(),minute:currentMinute(),day:S.day,age:S.age,title:String(title),text:String(text),important:!!important});if(S.log.length>600)S.log.length=600;if(important){S.milestones=S.milestones||[];S.milestones.unshift({dateISO:currentDate(),age:S.age,title:String(title),text:String(text)})}}
function feedback(title,detail,minutes=0){log(title,detail);toast(`${title}${minutes?` • ${minutes>=60?Math.round(minutes/60)+'h':minutes+' min'}`:''}`)}
function setEmotion(name,reason='',intensity=55){S.emotion={current:name,reason,intensity:clamp(intensity)}}

function chips(id,list,selected){const host=$(id);if(host)host.innerHTML=list.map(x=>`<button type="button" class="chip ${selected.includes(x)?'selected':''}" data-chip="${esc(x)}">${esc(x)}</button>`).join('')}

function familyRuleSeed(home,wealth){const strict=/Strict/.test(home)?78:/Chaotic|Unpredictable/.test(home)?46:45;const warm=/Warm|loving/.test(home)?82:/Quiet/.test(home)?64:58;const generosity={Struggling:38,Modest:48,'Middle class':58,Comfortable:70,Wealthy:80,'Extremely wealthy':88}[wealth]||58;return {strictness:strict,respect:warm,generosity,reliability:clamp(55+(warm-50)*.35),curfew:strict>65?19:21}}
function familyRules(){return S.family.rules}
function isFamilyPerson(p){return !!p&&['parent','grandparent','older sibling','sibling','aunt','uncle','relative'].includes(p.role)}
function caregiverNames(){return S.people.filter(p=>['parent','grandparent','older sibling','aunt','uncle'].includes(p.role)).map(p=>p.name)}
function primaryCaregiver(){return rand(caregiverNames())||'a caregiver'}
function dailyAccess(){
 S.permissions=S.permissions||{};
 const fresh={dateISO:currentDate(),tv:false,sharedDevice:false,phone:false,stove:false};
 const old=S.permissions.dailyAccess||{};
 if(old.dateISO!==currentDate())S.permissions.dailyAccess=fresh;
 else S.permissions.dailyAccess=Object.assign(fresh,old);
 return S.permissions.dailyAccess
}
function accessNeedsPermission(kind){return S.age<18&&['tv','sharedDevice','phone','stove'].includes(kind)}
function accessLabel(kind){return ({tv:'TV',sharedDevice:'shared electronic device',phone:'phone',stove:'stove / cooking appliance'})[kind]||kind}
function householdAccess(kind,{quiet=false}={}){
 if(!accessNeedsPermission(kind))return true;
 const access=dailyAccess();if(access[kind])return true;
 const r=familyRules(),late=currentMinute()>=(r.curfew||21)*60;
 const ageBonus=Math.min(18,S.age*1.15),responsibility=(S.family.responsibility||0)*.18;
 const base={tv:78,sharedDevice:70,phone:72,stove:64}[kind]||70;
 const score=clamp(base+ageBonus+responsibility+(r.respect-50)*.2-(r.strictness-50)*.32-(S.family.tension||0)*.12-(late?30:0),8,96);
 const ok=chance(score),label=accessLabel(kind);
 if(ok){access[kind]=true;log('Permission granted',`${primaryCaregiver()} says yes to using the ${label} today${late?' despite the late hour':''}.`);if(!quiet)toast(`${label} approved for today.`)}
 else{log('Permission denied',`${primaryCaregiver()} says no to using the ${label} right now${late?' because it is late':''}.`);if(!quiet)toast(`Caregiver permission denied for ${label} right now.`)}
 return ok
}
function accessStatus(kind,verb){if(S.age>=18)return verb;return dailyAccess()[kind]?`${verb} • approved today`:`Ask caregiver to ${verb}`}
function canUnderstandRadioNews(){return S.age>=8||(S.age>=6&&(S.development?.skills?.communication||0)>=45)}
function makePerson(name,role,age,knownSince=0){return {id:uid('npc'),name,role,age,rel:clamp(role==='parent'?78:role==='grandparent'?72:52+Math.random()*22),trust:clamp(role==='parent'?70:50+Math.random()*20),fun:clamp(45+Math.random()*30),jealousy:clamp(Math.random()*12),conflict:clamp(Math.random()*10),mood:rand(D.moods),lastSeen:0,knownSince,history:[],memory:'A relationship with room to grow.',traits:[rand(['Kind','Busy','Funny','Quiet','Strict','Generous','Competitive','Curious'])]}}
function makePeople(age){
 const people=[makePerson('Mom','parent',28+age,0),makePerson('Dad','parent',30+age,0),makePerson('Grandmother','grandparent',55+age,0)];
 if(chance(62))people.push(makePerson(rand(['Avery','Mia','Noah','Jade'])+' • older sibling','older sibling',3+Math.floor(Math.random()*7)+age,0));
 if(chance(48))people.push(makePerson(rand(['Aunt Lina','Aunt Maya','Uncle Theo','Uncle Alex']),'aunt',30+Math.floor(Math.random()*12)+age,0));
 return people
}
function normalizePeople(){S.people=(S.people||[]).map((p,i)=>Object.assign({id:p.id||uid('npc'),role:/Mom|Dad/.test(p.name)?'parent':/Grand/.test(p.name)?'grandparent':'friend',age:Math.max(S.age,(p.age??S.age)+(p.role==='parent'?25:0)),rel:50,trust:50,fun:50,jealousy:0,conflict:0,mood:'good',lastSeen:0,knownSince:Math.max(0,S.age-1),history:[],memory:'A shared history is forming.',traits:[]},p));}
function rememberPerson(p,text,importance=1){if(!p)return;p.history=p.history||[];p.history.unshift({dateISO:currentDate(),age:S.age,text,importance});if(p.history.length>30)p.history.length=30;p.memory=text}

function needDefaults(){return {hunger:30,hygiene:82,toilet:25,fun:72,social:68,comfort:82,sleep:86}}
function skillDefaults(){return {selfFeeding:0,potty:0,bathing:0,dressing:0,cooking:0,money:0,safety:0,reading:0,communication:0}}
function initialWeather(){return {type:rand(D.weatherTypes),temp:24+Math.floor(Math.random()*8),humidity:55+Math.floor(Math.random()*25),forecast:[]}}
function initialAmenities(wealth){return {fan:true,ac:['Comfortable','Wealthy','Extremely wealthy'].includes(wealth),fireplace:Math.random()<.3,tv:true,radio:true,sharedComputer:!['Struggling'].includes(wealth)}}
function initialFinance(){return {savings:0,parentSavings:0,debt:0,investments:0}}
function initialCareer(){return {job:null,applications:[],skills:0,reputation:0,performance:50,retired:false}}
function initialSchool(){return null}
function initialTraditions(place){return {christmas:Math.random()<.72,lunarNewYear:/Vietnam|Korea|Singapore|China|Taiwan/i.test(place)||Math.random()<.28,newYear:true}}

function makeState(){
 const personality=selectedP.length?[...selectedP]:[rand(D.personalities)],talents=selectedT.length?[...selectedT]:[rand(D.talents)];
 const dob=creatorDob($('c-dob').value),place=$('c-place').value.trim()||rand(D.places),wealth=$('c-wealth').value||'Middle class',home=$('c-home').value||'Warm and stable';
 const moneyStart=['Struggling','Modest'].includes(wealth)?0:wealth==='Middle class'?10:25;
 return {version:7.3,name:$('c-name').value.trim()||rand(D.names),dob,place,zodiac:$('c-zodiac').value==='auto'?zodiacFromDate(dob):$('c-zodiac').value,gender:$('c-gender').value||rand(CREATOR_OPTIONS.gender),attraction:$('c-attraction').value||rand(CREATOR_OPTIONS.attraction),wealth,home,personality,talents,age:0,day:1,clock:{dateISO:dob,minute:480},location:'Home',money:moneyStart,health:100,happiness:75,energy:95,stress:5,luck:clamp(35+Math.random()*30),mentality:mentalityFor(personality),emotion:{current:'Calm',reason:'Life is just beginning.',intensity:30},needs:needDefaults(),development:{skills:skillDefaults(),kindergarten:{asked:false,enrolled:false,preference:null,decision:null},milestones:[]},family:{closeness:72,tension:6,responsibility:0,allowance:0,rules:familyRuleSeed(home,wealth)},people:makePeople(0),school:initialSchool(),exams:[],calendar:[],pendingDecisions:[],events:[],eventCooldowns:{},messages:[],notifications:[],log:[],milestones:[],flags:{},weather:initialWeather(),homeAmenities:initialAmenities(wealth),inventory:{umbrella:0,raincoat:0,sweater:0,firewood:0,sunglasses:0,waterBottle:0},inventoryItems:[],possessions:[],phone:{owned:false,model:null,price:600,condition:100,appsUnlocked:[]},finance:initialFinance(),permissions:{stand:null,yardSale:null,dailyAccess:{dateISO:dob,tv:false,sharedDevice:false,phone:false,stove:false}},stall:null,purchaseHistory:[],giftRequests:[],giftHistory:[],traditions:initialTraditions(place),familyEvents:[],choresDone:0,career:initialCareer(),healthState:{fitness:50,sleep:80,illness:null},social:{followers:0,reputation:50,posts:0,fame:0},romance:{status:'Single',partner:null,history:[]},travel:{trips:0,lastTrip:null,passport:false},current:{title:'Welcome to the world.',text:'At first, almost everything happens through caregivers. Your independence will grow with age, skills, trust and circumstances.'}}
}

function legacyClock(){const dob=parseISO(S.dob||'2010-01-01');dob.setUTCFullYear(dob.getUTCFullYear()+safeNum(S.age,0,0,120));const within=Math.max(0,((safeNum(S.day,1,1)-1)%365));dob.setUTCDate(dob.getUTCDate()+within);return {dateISO:isoDate(dob),minute:480}}
function migrate(){
 if(!S||typeof S!=='object')throw new Error('Save data is not an object.');
 S.version=7.3;S.name=String(S.name||'Unnamed');S.dob=/^\d{4}-\d{2}-\d{2}$/.test(S.dob||'')?S.dob:'2010-01-01';S.place=S.place||'Unknown';S.age=safeNum(S.age,0,0,120);S.day=safeNum(S.day,1,1);S.clock=S.clock&&/^\d{4}-\d{2}-\d{2}$/.test(S.clock.dateISO||'')?{dateISO:S.clock.dateISO,minute:safeNum(S.clock.minute,480,0,1439)}:legacyClock();
 S.money=safeNum(S.money,0,0);S.health=clamp(S.health??100);S.happiness=clamp(S.happiness??70);S.energy=clamp(S.energy??90);S.stress=clamp(S.stress??10);S.luck=clamp(S.luck??50);S.personality=Array.isArray(S.personality)?S.personality:[];S.talents=Array.isArray(S.talents)?S.talents:[];S.mentality=S.mentality||mentalityFor(S.personality);S.emotion=Object.assign({current:'Calm',reason:'',intensity:30},S.emotion||{});
 S.needs=Object.assign(needDefaults(),S.needs||{});Object.keys(S.needs).forEach(k=>S.needs[k]=clamp(S.needs[k]));S.development=S.development||{};S.development.skills=Object.assign(skillDefaults(),S.development.skills||{});S.development.kindergarten=Object.assign({asked:false,enrolled:false,preference:null,decision:null},S.development.kindergarten||{});S.development.milestones=S.development.milestones||[];
 S.family=Object.assign({closeness:65,tension:10,responsibility:0,allowance:0,rules:familyRuleSeed(S.home||'',S.wealth||'Middle class')},S.family||{});S.family.rules=Object.assign(familyRuleSeed(S.home||'',S.wealth||'Middle class'),S.family.rules||{});normalizePeople();
 S.exams=Array.isArray(S.exams)?S.exams:[];S.calendar=Array.isArray(S.calendar)?S.calendar:[];S.pendingDecisions=Array.isArray(S.pendingDecisions)?S.pendingDecisions:[];S.events=Array.isArray(S.events)?S.events:[];S.eventCooldowns=S.eventCooldowns||{};S.messages=Array.isArray(S.messages)?S.messages:[];S.notifications=Array.isArray(S.notifications)?S.notifications:[];S.log=Array.isArray(S.log)?S.log:[];S.milestones=Array.isArray(S.milestones)?S.milestones:[];S.flags=S.flags||{};
 S.weather=Object.assign(initialWeather(),S.weather||{});S.homeAmenities=Object.assign(initialAmenities(S.wealth||'Middle class'),S.homeAmenities||{});S.inventory=Object.assign({umbrella:0,raincoat:0,sweater:0,firewood:0,sunglasses:0,waterBottle:0},S.inventory||{});S.inventoryItems=Array.isArray(S.inventoryItems)?S.inventoryItems:[];S.possessions=Array.isArray(S.possessions)?S.possessions:[];S.purchaseHistory=Array.isArray(S.purchaseHistory)?S.purchaseHistory:[];
 S.phone=Object.assign({owned:false,model:null,price:600,condition:100,appsUnlocked:[]},S.phone||{});S.finance=Object.assign(initialFinance(),S.finance||{});S.permissions=Object.assign({stand:null,yardSale:null,dailyAccess:{}},S.permissions||{});S.permissions.dailyAccess=Object.assign({dateISO:currentDate(),tv:false,sharedDevice:false,phone:false,stove:false},S.permissions.dailyAccess||{});S.giftRequests=Array.isArray(S.giftRequests)?S.giftRequests:[];S.giftHistory=Array.isArray(S.giftHistory)?S.giftHistory:[];S.traditions=Object.assign(initialTraditions(S.place),S.traditions||{});S.familyEvents=Array.isArray(S.familyEvents)?S.familyEvents:[];S.choresDone=safeNum(S.choresDone,0,0);
 if(typeof S.career?.job==='string'&&S.career.job)S.career.job={title:S.career.job,pay:16,hours:4,performance:50};S.career=Object.assign(initialCareer(),S.career||{});S.healthState=Object.assign({fitness:50,sleep:80,illness:null},S.healthState||{});S.social=Object.assign({followers:0,reputation:50,posts:0,fame:0},S.social||{});S.romance=Object.assign({status:'Single',partner:null,history:[]},S.romance||{});S.travel=Object.assign({trips:0,lastTrip:null,passport:false},S.travel||{});S.location=S.location||'Home';S.current=S.current||{title:'Your life continues.',text:'The world is still moving.'};
 ensureLifecycleContainers();normalizeInventory();normalizeSchool();normalizeRequests();addStagePeople();ensurePhoneApps();ensureCalendarBasics();reconcileState('migrate');
}

function save(){if(!S)return;try{localStorage.setItem(KEY,JSON.stringify(S));const el=$('save-status');if(el)el.textContent='Saved '+new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}catch(e){console.error('Save failed',e);toast('Could not save this life.')}}
function loadRaw(){let raw=localStorage.getItem(KEY);if(raw)return raw;for(const k of LEGACY_KEYS){raw=localStorage.getItem(k);if(raw)return raw}return null}
function exportSave(){if(!S)return;const blob=new Blob([JSON.stringify(S,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`life-${S.name.replace(/\s+/g,'-').toLowerCase()}-v7.3.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function importFile(){$('import-file').click()}
function restart(){if(!confirm('Start a new life? This clears only this Life Simulator autosave. Export first if you want to keep it.'))return;S=null;localStorage.removeItem(KEY);LEGACY_KEYS.forEach(k=>localStorage.removeItem(k));closeAllModals();$('game').classList.add('hidden');$('creator').classList.remove('hidden');$('creator-error').hidden=true;toast('Ready for a new life')}

// ---------- Inventory / ownership ----------
function catalogItem(key){return D.catalog[key]||null}
function itemKeyFromLegacyName(x){const s=String(x||'').toLowerCase();return Object.keys(D.catalog).find(k=>D.catalog[k].name.toLowerCase()===s)||null}
function availableFunds(){return S.money+(S.finance.savings||0)+(S.finance.parentSavings||0)}
function spendOwn(amount){
 amount=Math.max(0,Number(amount)||0);if(availableFunds()<amount)return false;
 const cash=Math.min(S.money,amount);S.money-=cash;amount-=cash;
 if(amount>0){const bank=Math.min(S.finance.savings||0,amount);S.finance.savings-=bank;amount-=bank}
 if(amount>0){const managed=Math.min(S.finance.parentSavings||0,amount);S.finance.parentSavings-=managed;amount-=managed}
 return amount<=0
}
function purchaseScore(d,parentPays=false){const r=familyRules(),wealth={Struggling:-25,Modest:-12,'Middle class':0,Comfortable:10,Wealthy:22,'Extremely wealthy':34}[S.wealth]||0;const grade=S.school?schoolAverage()-70:0;const needBonus=/School|weather|Everyday/i.test(d.category+' '+d.description)?8:0;const pricePenalty=Math.min(38,d.price/22);return clamp(58+(S.family.closeness-50)*.25+(S.family.responsibility||0)*.25+(r.respect-50)*.2+(r.generosity-50)*.22+grade*.18+needBonus+(parentPays?wealth-pricePenalty:8-pricePenalty*.35)-S.family.tension*.12)}
function caregiverRequestOptions(key){
 const d=catalogItem(key);if(!d)return;
 const score=purchaseScore(d,true),r=Math.random()*100;
 if(score>=78||r<Math.max(5,score-58)){
  addItem(key,'caregiver purchase');S.family.closeness=clamp(S.family.closeness+2);
  feedback(`${primaryCaregiver()} said yes`,`${d.name} was bought for you.`,5);return;
 }
 if(score>=55||r<55){
  const days=2+Math.floor(Math.random()*5),resolveDate=addDays(currentDate(),days);
  createPending({type:'purchaseConsideration',title:`${d.name} request`,resolveDate,payload:{key},status:'Considering',detail:`Your caregivers are thinking about it. Decision expected ${formatDate(resolveDate)}.`});
  log('They will think about it',`${d.name}: a real decision is scheduled in ${days} days.`);return;
 }
 if(score>=38){
  const variants=[];
  if(S.traditions.christmas)variants.push('Christmas');
  variants.push('Birthday','saveHalf','chores');
  if(S.school&&S.age>=6)variants.push('grades');
  const v=rand(variants);
  if(v==='Birthday'||v==='Christmas'){requestFutureGift(key,v);return}
  if(v==='saveHalf'){
   createPending({type:'conditionalPurchase',title:`Save toward ${d.name}`,resolveDate:null,payload:{key,condition:'saveHalf',target:Math.ceil(d.price/2)},status:'Conditional',detail:`Save ${money(Math.ceil(d.price/2))}; your caregivers may cover the rest.`});
   log('A compromise',`Your caregivers ask you to save half the price of ${d.name}.`);return;
  }
  if(v==='grades'){
   const target=Math.min(92,Math.max(72,Math.round(schoolAverage()+5)));
   createPending({type:'conditionalPurchase',title:`Grades for ${d.name}`,resolveDate:null,payload:{key,condition:'grades',target},status:'Conditional',detail:`Raise your academic average to ${target}% or higher.`});
   log('A school condition',`Your caregivers say they will reconsider ${d.name} if your academic average reaches ${target}%.`);return;
  }
  createPending({type:'conditionalPurchase',title:`Earn ${d.name}`,resolveDate:null,payload:{key,condition:'chores',target:(S.choresDone||0)+4},status:'Conditional',detail:'Complete 4 more household chores, then ask again.'});
  log('Earn it first',`Your caregivers want to see responsibility before buying ${d.name}.`);return;
 }
 log('Caregiver said no',`The answer to ${d.name} is no for now. Price, finances, mood, household rules and your history all mattered.`);setEmotion('Disappointed',`You were told no about ${d.name}.`,40)
}
function requestFutureGift(key,occasion){const d=catalogItem(key);if(!d)return;const old=S.giftRequests.find(r=>!r.resolved&&r.itemKey===key&&r.occasion===occasion);if(old){old.begging=(old.begging||1)+1;if(old.begging>=3){S.family.tension=clamp(S.family.tension+2);old.chancePenalty=(old.chancePenalty||0)+4}log('Asked again',`You mention ${d.name} again for ${occasion}. The outcome still waits until that day.`);return}S.giftRequests.push({id:uid('giftreq'),itemKey:key,item:d.name,occasion,requestedDate:currentDate(),requestedAge:S.age,begging:1,chancePenalty:0,resolved:false,status:`Waiting for ${occasion}`});log('Future gift request',`You ask for ${d.name} for ${occasion}. It will not resolve before that occasion.`)}
function resolveFutureGifts(occasion){for(const r of S.giftRequests.filter(x=>!x.resolved&&x.occasion===occasion)){r.resolved=true;const d=catalogItem(r.itemKey);if(!d)continue;const reliability=(familyRules().reliability-50)*.25,score=purchaseScore(d,true)+reliability-(r.chancePenalty||0)+(S.luck-50)*.12;const roll=Math.random()*100;if(roll<score*.72){let key=r.itemKey;if(d.phone&&roll<12&&r.itemKey!=='phoneFlagship')key='phoneFlagship';addItem(key,`${occasion} gift`);S.giftHistory.unshift({id:uid('gift'),dateISO:currentDate(),age:S.age,item:catalogItem(key).name,occasion,reaction:null,requested:true});log(`🎁 ${occasion}`,`You receive ${catalogItem(key).name}${key!==r.itemKey?'—an unexpected upgrade':''}.`,true)}else if(d.phone&&roll<score*.9){addItem('phoneUsed',`${occasion} gift`);S.giftHistory.unshift({id:uid('gift'),dateISO:currentDate(),age:S.age,item:'Used smartphone',occasion,reaction:null,requested:true});log(`🎁 ${occasion}`,`You asked for ${d.name}, but receive a cheaper used phone instead.`,true)}else if(roll<score+14){const cash=Math.max(10,Math.round(d.price*(.15+.2*Math.random())));S.money+=cash;S.giftHistory.unshift({id:uid('gift'),dateISO:currentDate(),age:S.age,item:money(cash)+' cash',occasion,reaction:null,requested:true});log(`🎁 ${occasion}`,`You do not receive ${d.name}; you receive ${money(cash)} instead.`)}else{log(`🎁 ${occasion}`,`You hoped for ${d.name}, but it does not happen this time. Family finances, reliability, luck and past asking all contributed.`)}}}
function nextOccurrence(month,day,from=currentDate()){const f=parseISO(from),y=f.getUTCFullYear();let d=new Date(Date.UTC(y,month-1,day));if(d<=f)d=new Date(Date.UTC(y+1,month-1,day));return isoDate(d)}
function nextBirthday(){const b=parseISO(S.dob),f=parseISO(currentDate());let d=new Date(Date.UTC(f.getUTCFullYear(),b.getUTCMonth(),b.getUTCDate()));if(d<=f)d=new Date(Date.UTC(f.getUTCFullYear()+1,b.getUTCMonth(),b.getUTCDate()));return isoDate(d)}
function ensureCalendarBasics(){S.calendar=S.calendar||[];if(S.school)syncExamCalendar()}
function createConsideringDecision(key){const d=catalogItem(key),days=2+Math.floor(Math.random()*5);createPending({type:'purchaseConsideration',title:`${d.name} request`,resolveDate:addDays(currentDate(),days),payload:{key},status:'Considering',detail:`Decision expected ${formatDate(addDays(currentDate(),days))}.`})}
function resolvePurchaseDecision(p){const d=catalogItem(p.payload?.key);if(!d){p.resolved=true;p.status='Cancelled';return}const score=purchaseScore(d,true)+(S.luck-50)*.08;const r=Math.random()*100;if(r<score){addItem(p.payload.key,'caregiver purchase after consideration');p.status='Approved';log('Request approved',`After thinking it over, your caregivers buy ${d.name}.`,true)}else if(r<score+18){p.type='conditionalPurchase';p.status='Conditional';p.resolveDate=null;p.expiresDate=addDays(currentDate(),180);p.payload.condition='saveHalf';p.payload.target=Math.ceil(d.price/2);p.detail=`Save ${money(p.payload.target)}; your caregivers will reconsider.`;log('A conditional answer',`Your caregivers will help with ${d.name} if you save ${money(p.payload.target)}.`);return}else{p.status='Denied';log('Request denied',`After considering ${d.name}, your caregivers decide against it for now.`)}p.resolved=true}
function resolveJobDecision(p){const job=p.payload?.job;if(!job){p.resolved=true;p.status='Cancelled';return}const chanceVal=clamp(48+S.career.skills*4+(S.family.responsibility||0)*.2+(S.luck-50)*.18);if(chance(chanceVal)){S.career.job={id:job.id,title:job.title,pay:job.pay,hours:job.hours,performance:50,manager:rand(['Morgan','Taylor','Casey','Riley']),coworkers:[rand(D.names),rand(D.names)]};p.status='Offer';log('Job offer',`You are offered a position as ${job.title} at ${money(job.pay)}/hour.`,true)}else{p.status='Rejected';log('Job application',`The ${job.title} application does not turn into an offer this time.`)}p.resolved=true}
function checkConditionalRequests(){for(const p of S.pendingDecisions.filter(x=>!x.resolved&&x.type==='conditionalPurchase')){const d=catalogItem(p.payload?.key);if(!d)continue;if(p.payload.condition==='saveHalf'&&availableFunds()>=p.payload.target){if(spendOwn(p.payload.target)){addItem(p.payload.key,'shared purchase');p.resolved=true;p.status='Completed';log('You saved your share',`You pay ${money(p.payload.target)} toward ${d.name}; your caregivers cover the rest.`,true)}}else if(p.payload.condition==='chores'&&(S.choresDone||0)>=p.payload.target){addItem(p.payload.key,'earned through chores');p.resolved=true;p.status='Completed';log('You earned it',`After following through on chores, your caregivers buy ${d.name}.`,true)}else if(p.payload.condition==='grades'&&S.school&&schoolAverage()>=p.payload.target){addItem(p.payload.key,'grade reward');p.resolved=true;p.status='Completed';log('Grade reward',`You meet the academic condition and receive ${d.name}.`,true)}}}

function driftNeeds(minutes){const h=Math.max(0,minutes)/60;if(!S.needs)return;S.needs.hunger=clamp(S.needs.hunger+h*2.4);S.needs.toilet=clamp(S.needs.toilet+h*2);S.needs.hygiene=clamp(S.needs.hygiene-h*.8);S.needs.fun=clamp(S.needs.fun-h*.5);S.needs.social=clamp(S.needs.social-h*.25);S.needs.comfort=clamp(S.needs.comfort-h*.15);S.needs.sleep=clamp(S.needs.sleep-h*1.45);S.energy=clamp(S.energy-h*1.8)}
function advance(days){advanceTime(Math.max(0,days)*1440,{skipNeeds:true,silent:true,skipRoutine:true})}
function ageSync(){const derived=ageFromDate(S.dob,currentDate());if(derived>S.age){for(let a=S.age+1;a<=derived;a++)birthday(a)}}
function annualLifeTransition(){
 const ds=S.development.skills;if(S.age<=7){ds.communication=clamp(ds.communication+(S.age<=2?18:S.age<=4?14:10));if(S.age>=4)ds.reading=clamp(ds.reading+(S.age<=5?9:14))}
 for(const p of S.people){if(!isFamilyPerson(p)){p.rel=clamp(p.rel+(Math.random()*6-3));p.trust=clamp(p.trust+(Math.random()*4-2));if(chance(18))rememberPerson(p,rand(['Their routines changed over the year.','They became busier with their own life.','You stayed connected despite changing routines.','You drifted slightly as life changed around you.']))}}
 if(S.age>=40&&chance(Math.min(35,(S.age-38)*1.2)))S.health=clamp(S.health-(1+Math.random()*3));
 if(S.age>=60&&!S.career.retired)notify('Retirement is available','You can choose retirement when it fits your life.');
 if(chance(20)){const text=rand(['A relative changes jobs.','A family member starts a new hobby.','Someone in the extended family moves.','Family routines shift as everyone gets older.']);S.familyEvents.unshift({dateISO:currentDate(),text})}
 if(S.career.job&&chance(18)){S.career.reputation=clamp(S.career.reputation+2);S.career.skills=safeNum(S.career.skills,0)+1}
}
function birthday(newAge){S.age=newAge;S.energy=clamp(Math.max(S.energy,75));S.stress=clamp(S.stress-5);S.people.forEach(p=>p.age=(p.age||S.age)+1);addStagePeople();resolveFutureGifts('Birthday');const cashGift=S.age>=5&&chance(45)?Math.round(10+Math.random()*Math.min(140,S.age*5)):0;if(cashGift){S.money+=cashGift;S.giftHistory.unshift({id:uid('gift'),dateISO:currentDate(),age:S.age,item:money(cashGift)+' birthday cash',occasion:'Birthday',reaction:null})}progressSchoolForAge();annualLifeTransition();setCurrentContext({sourceType:'birthday',priority:2,title:`Happy ${S.age}${S.age===1?'st':S.age===2?'nd':S.age===3?'rd':'th'} birthday`,text:'A new year of life begins. People, permissions, school, health and opportunities may all change.'});log('🎂 Birthday',`You turn ${S.age}.${cashGift?` You also receive ${money(cashGift)} in birthday money.`:''}`,true);setEmotion('Excited','It is your birthday.',65);if(S.age>=3&&chance(S.age<=18?68:35))queueEvent({type:'birthdayParty',title:'How do you want to celebrate?',text:S.age<13?'Your family asks what kind of birthday celebration sounds good.':'People close to you are making birthday plans.',choices:[{id:'big',label:'Celebrate with people'},{id:'small',label:'Keep it small'},{id:'skip',label:'No party'}]});reconcileState('birthday')}

// ---------- Weather / needs ----------
function setWeather(){const old=S.weather?.type;let type=rand(D.weatherTypes);if(old&&chance(38))type=old;const mon=parseISO(currentDate()).getUTCMonth()+1,cold=[12,1,2].includes(mon),hot=[6,7,8].includes(mon);const ranges={Sunny:hot?[28,38]:cold?[18,29]:[23,34],Cloudy:[18,30],Rainy:[18,29],Stormy:[18,28],Cool:cold?[10,22]:[15,25],Hot:[31,40],Windy:[17,30]},r=ranges[type];S.weather={type,temp:r[0]+Math.floor(Math.random()*(r[1]-r[0]+1)),humidity:40+Math.floor(Math.random()*55),forecast:Array.from({length:5},(_,i)=>{const t=rand(D.weatherTypes),rr=ranges[t]||[20,30];return {dateISO:addDays(currentDate(),i+1),type:t,temp:rr[0]+Math.floor(Math.random()*(rr[1]-rr[0]+1))}})}}
function weatherIcon(t){return ({Sunny:'☀️',Cloudy:'☁️',Rainy:'🌧️',Stormy:'⛈️',Cool:'🧥',Hot:'🥵',Windy:'💨'})[t]||'🌤️'}
function needUrgency(k,v){return ['hunger','toilet'].includes(k)?v:100-v}
function needLabel(k,v){const u=needUrgency(k,v);return u>=86?'Critical':u>=68?'Needs attention':u>=42?'Okay':'Comfortable'}
function needsDeltaText(before){const parts=[];for(const k of Object.keys(S.needs)){const d=Math.round(S.needs[k]-(before[k]??S.needs[k]));if(Math.abs(d)>=3)parts.push(`${k} ${d>0?'+':''}${d}`)}return parts.slice(0,3).join(' • ')}
function applyNeedConsequences(daily=false){const once=(key)=>{const k=`need-${key}-${currentDate()}`;if(S.flags[k])return false;S.flags[k]=true;return true};if(S.needs.hunger>=88&&once('hunger')){S.energy=clamp(S.energy-8);S.happiness=clamp(S.happiness-4);S.stress=clamp(S.stress+3);notify('Very hungry','Food should be a priority.')}if(S.needs.toilet>=92&&once('toilet')){if(S.age<=7&&chance(45)){S.needs.toilet=35;S.needs.hygiene=clamp(S.needs.hygiene-28);S.happiness=clamp(S.happiness-6);setEmotion('Embarrassed','You had a bathroom accident.',70);log('Bathroom accident','You could not hold it. It is recoverable, but uncomfortable and embarrassing.')}else notify('Bathroom needed','Your bladder is making it hard to focus.')}if(S.needs.hygiene<=20&&once('hygiene')){S.happiness=clamp(S.happiness-2);if(S.age<18)log('Hygiene reminder',`${primaryCaregiver()} notices you need to wash up.`);else notify('Hygiene','You feel overdue for a shower or wash.')}if(S.needs.sleep<=16&&once('sleep')){S.energy=clamp(S.energy-12);S.stress=clamp(S.stress+5);notify('Exhausted','Performance and mood are starting to suffer.')}if(S.needs.social<=12&&once('social')){S.happiness=clamp(S.happiness-4);setEmotion('Lonely','You have been socially disconnected.',55)}if(daily&&S.health<35&&once('health'))notify('Health','You are not feeling well. Consider rest or care.')}
function basicAction(type){if(!S)return;const before={...S.needs};if(type==='eat'){const mins=S.age<=1?30:S.age<=4?35:40;if(S.age<=1){S.needs.hunger=clamp(S.needs.hunger-58);S.development.skills.selfFeeding=clamp(S.development.skills.selfFeeding+5);advanceTime(mins);feedback('Fed by caregiver',`${primaryCaregiver()} feeds you safely. ${needsDeltaText(before)}`,mins)}else if(S.age<=4&&S.development.skills.selfFeeding<65){S.needs.hunger=clamp(S.needs.hunger-52);S.development.skills.selfFeeding=clamp(S.development.skills.selfFeeding+9);advanceTime(mins);feedback('Practiced self-feeding',`${primaryCaregiver()} helps while you eat. Self-feeding ${Math.round(S.development.skills.selfFeeding)}%.`,mins)}else{S.needs.hunger=clamp(S.needs.hunger-56);S.energy=clamp(S.energy+7);advanceTime(mins);feedback('Ate a meal',`${needsDeltaText(before)}${S.age<13?' • family food available':''}`,mins)}return}if(type==='snack'){S.needs.hunger=clamp(S.needs.hunger-24);advanceTime(12);feedback('Had a snack',needsDeltaText(before),12);return}if(type==='drink'){S.needs.comfort=clamp(S.needs.comfort+9);S.needs.toilet=clamp(S.needs.toilet+4);advanceTime(5);feedback('Drank water','Comfort +9',5);return}if(type==='toilet'){if(S.age<=1){S.needs.toilet=20;S.needs.hygiene=clamp(S.needs.hygiene+3);advanceTime(10);feedback('Caregiver toileting',`${primaryCaregiver()} takes care of your diaper/toileting needs.`,10)}else if(S.age<=4&&S.development.skills.potty<70){S.needs.toilet=15;S.development.skills.potty=clamp(S.development.skills.potty+10);advanceTime(12);feedback('Potty practice',`Potty skill ${Math.round(S.development.skills.potty)}%.`,12)}else{S.needs.toilet=10;advanceTime(8);feedback('Used the bathroom','Bladder relieved.',8)}return}if(type==='shower'||type==='bath'){const mins=type==='bath'?30:20;if(S.age<=3){S.needs.hygiene=95;S.development.skills.bathing=clamp(S.development.skills.bathing+5);advanceTime(mins);feedback('Bath with caregiver',`${primaryCaregiver()} handles safety and washing.`,mins)}else if(S.age<=7&&S.development.skills.bathing<65){S.needs.hygiene=92;S.development.skills.bathing=clamp(S.development.skills.bathing+8);advanceTime(mins);feedback('Washed with supervision',`Bathing skill ${Math.round(S.development.skills.bathing)}%.`,mins)}else{S.needs.hygiene=96;advanceTime(mins);feedback(type==='bath'?'Took a bath':'Took a shower','Hygiene restored.',mins)}return}if(type==='brush'){S.needs.hygiene=clamp(S.needs.hygiene+8);advanceTime(7);feedback('Brushed teeth','Hygiene +8',7);return}if(type==='washHands'){S.needs.hygiene=clamp(S.needs.hygiene+4);advanceTime(3);feedback('Washed hands','Hygiene +4',3);return}if(type==='washFace'){S.needs.hygiene=clamp(S.needs.hygiene+6);advanceTime(5);feedback('Washed face','Hygiene +6',5);return}if(type==='dress'){if(S.age<=3){S.development.skills.dressing=clamp(S.development.skills.dressing+6);advanceTime(12);feedback('Dressed by caregiver',`${primaryCaregiver()} helps you get dressed.`,12)}else if(S.age<=7&&S.development.skills.dressing<65){S.development.skills.dressing=clamp(S.development.skills.dressing+9);advanceTime(12);feedback('Practiced dressing',`Dressing skill ${Math.round(S.development.skills.dressing)}%.`,12)}else{advanceTime(10);feedback('Got dressed','You choose and put on your clothes.',10)}return}if(type==='sleep'){sleepAction();return}if(type==='nap'){const mins=S.age<=4?120:S.age<=12?75:45;advanceTime(mins,{silent:true});S.needs.sleep=clamp(S.needs.sleep+32);S.energy=clamp(S.energy+26);S.stress=clamp(S.stress-5);feedback('Took a nap','Energy +26',mins);return}if(type==='rest'){advanceTime(30,{silent:true});S.energy=clamp(S.energy+12);S.stress=clamp(S.stress-4);feedback('Rested','Energy +12 • Stress -4',30)}}

// ---------- School / education ----------
function schoolAverage(){if(!S.school?.subjects?.length)return 0;return S.school.subjects.reduce((a,s)=>a+safeNum(s.score,0),0)/S.school.subjects.length}
function gradeLabel(age){const g=Math.max(1,age-5);return age<=11?`Grade ${g}`:age<=14?`Middle school • Grade ${g}`:`High school • Grade ${Math.min(12,g)}`}
function subjectNames(age){const base=['Mathematics','English / Language','Science','History','Geography','Art','Music','Physical Education','Technology'];if(age>=13)base.push('Elective');return base}
function teacherName(subject){return `${rand(['Ms.','Mr.','Mx.'])} ${rand(['Morgan','Lee','Nguyen','Kim','Patel','Garcia','Smith','Tan','Brown'])}`}
function makeSubject(name,i){return {name,score:68+Math.floor(Math.random()*22),skill:50+Math.floor(Math.random()*20),prep:0,trend:i%3===0?'↑':'→',teacher:{name:teacherName(name),rel:50+Math.floor(Math.random()*20)},homework:{status:'None',progress:0,dueDate:null},lastStudyDate:null}}
function studySubject(name,minutes=60,mode='solo'){const sub=S.school?.subjects?.find(x=>x.name===name);if(!sub){toast('Subject not found.');return}minutes=[30,60,180].includes(Number(minutes))?Number(minutes):60;let gain=minutes===30?4:minutes===60?7:13;if(mode==='friend'){const p=bestNonFamily();if(p){p.rel=clamp(p.rel+2);p.trust=clamp(p.trust+1);rememberPerson(p,`You studied ${sub.name} together.`)}gain+=2;S.needs.social=clamp(S.needs.social+7)}if(mode==='teacher'){sub.teacher.rel=clamp(sub.teacher.rel+3);gain+=3}if(findUsable('deskLamp'))gain=Math.round(gain*1.2);sub.prep=clamp(sub.prep+gain);sub.skill=clamp(sub.skill+Math.ceil(gain*.55));sub.score=clamp(sub.score+Math.max(1,Math.floor(gain*.18)));sub.lastStudyDate=currentDate();S.energy=clamp(S.energy-(minutes/30)*3);S.stress=clamp(S.stress+(minutes===180?6:2));advanceTime(minutes);feedback(`Studied ${sub.name}`,`Preparation +${gain} • Skill ${Math.round(sub.skill)}%${mode==='friend'?' • studied with a friend':''}`,minutes)}
function hireTutor(name){const sub=S.school?.subjects?.find(x=>x.name===name);if(!sub)return;const cost=35;if(['Struggling','Modest'].includes(S.wealth)&&S.age<18&&!caregiverApproval(-10)){toast('Your household cannot justify a tutor right now.');return}if(S.age>=18&&!spendOwn(cost)){toast('Not enough money.');return}sub.prep=clamp(sub.prep+15);sub.skill=clamp(sub.skill+9);advanceTime(90);feedback('Tutor session',`${sub.name} preparation +15${S.age>=18?` • ${money(cost)}`:' • household paid'}`,90)}
function eventOptions(){return S.age<10?D.schoolEvents.young:S.age<15?D.schoolEvents.middle:D.schoolEvents.high}
function exploreSchoolActivity(){if(!S.school||S.age<6){toast('Formal clubs are not part of this life stage.');return}const blocked=new Set([...(S.school.clubs||[]).filter(c=>c.status==='Active').map(c=>c.name),...(S.school.activityOffers||[]).filter(o=>o.status==='Offered').map(o=>o.name)]),choices=activityOptions().filter(n=>!blocked.has(n));if(!choices.length){toast('No new activities are available right now.');return}const name=rand(choices),offer={id:uid('offer'),name,status:'Offered',createdDate:currentDate(),decisionDate:addDays(currentDate(),4)};S.school.activityOffers.unshift(offer);log('Activity opportunity',`${name} has space. Decide by ${formatDate(offer.decisionDate)}${S.age<13?'; caregiver approval is required':''}.`)}
function decideActivity(id,join){const o=S.school?.activityOffers?.find(x=>x.id===id);if(!o||o.status!=='Offered')return;if(o.decisionDate<currentDate()){o.status='Expired';toast('The signup window closed.');return}if(!join){o.status='Declined';log('Activity declined',`You decide not to join ${o.name}.`);return}if(S.age<13){o.status='Waiting';createPending({type:'clubApproval',title:`Join ${o.name}`,resolveDate:addDays(currentDate(),1),payload:{offerId:o.id},status:'Waiting for caregiver',detail:'Your caregiver will decide tomorrow.'});log('Asked to join',`You ask to join ${o.name}. A caregiver decision is scheduled for tomorrow.`);return}activateClub(o)}
function clubAction(clubId,kind){const c=S.school?.clubs?.find(x=>x.id===clubId);if(!c||c.status!=='Active')return;const def=D.clubDefs[c.name]||{actions:[['practice','Practice',60],['special','Special activity',90],['social','Talk with members',45]]},action=def.actions.find(x=>x[0]===kind)||def.actions[0],minutes=action[2];if(kind==='leave'){c.status='Left';log('Left '+c.name,'You leave the club; the memories and skills remain.');return}if(kind==='social'){const p=bestNonFamily();if(p){p.rel=clamp(p.rel+4);p.trust=clamp(p.trust+2);rememberPerson(p,`You spent time together through ${c.name}.`)}S.needs.social=clamp(S.needs.social+12);S.needs.fun=clamp(S.needs.fun+5)}if(kind==='practice'){c.skill=clamp(c.skill+7);S.energy=clamp(S.energy-6)}if(kind==='special'){const result=clamp(c.skill*.65+S.luck*.2+Math.random()*20);c.skill=clamp(c.skill+4);S.happiness=clamp(S.happiness+(result>=70?7:2));log(`${c.name} • ${action[1]}`,result>=70?'It goes well and people notice your effort.':'It is imperfect, but it becomes experience.')}c.sessions++;advanceTime(minutes);feedback(`${c.name} • ${action[1]}`,`Club skill ${Math.round(c.skill)}% • ${c.sessions} sessions`,minutes)}
function exploreSchoolEvent(){if(!S.school||S.age<6){toast('Formal school events are not part of this life stage.');return}const active=new Set((S.school.contests||[]).filter(c=>['Open','Registered'].includes(c.status)).map(c=>c.name)),choices=eventOptions().filter(n=>!active.has(n));if(!choices.length){toast('No new school events are available.');return}const name=rand(choices),c={id:uid('contest'),name,status:'Open',createdDate:currentDate(),decisionDate:addDays(currentDate(),4),eventDate:addDays(currentDate(),12+Math.floor(Math.random()*10)),prep:0,result:null};S.school.contests.unshift(c);log('School event opportunity',`${name}: register by ${formatDate(c.decisionDate)} • event ${formatDate(c.eventDate)}.`)}
function contestAction(id,kind){const c=S.school?.contests?.find(x=>x.id===id);if(!c)return;if(kind==='decline'&&c.status==='Open'){c.status='Declined';log('Event declined',`You decide not to enter ${c.name}.`);return}if(kind==='enter'&&c.status==='Open'){if(c.decisionDate<currentDate()){c.status='Missed';toast('Registration closed.');return}if(S.age<13){c.status='Waiting';createPending({type:'contestApproval',title:`Enter ${c.name}`,resolveDate:addDays(currentDate(),1),payload:{contestId:c.id},status:'Waiting for caregiver',detail:'Decision tomorrow.'});log('Asked to enter',`You ask to enter ${c.name}.`);return}registerContest(c);return}if(kind==='practice'&&c.status==='Registered'){c.prep=clamp(c.prep+10);S.energy=clamp(S.energy-7);S.stress=clamp(S.stress+2);advanceTime(75);feedback(`Prepared for ${c.name}`,`Preparation ${c.prep}%`,75)}}
function resolveContestApproval(p){const c=S.school?.contests?.find(x=>x.id===p.payload?.contestId);if(!c){p.resolved=true;p.status='Cancelled';return}if(caregiverApproval(5)){registerContest(c);p.status='Approved'}else{c.status='Denied';p.status='Denied';log('Event permission denied',`Your caregiver says no to ${c.name}.`)}p.resolved=true}
function schoolActivityTick(){if(!S.school)return;for(const o of S.school.activityOffers||[]){if(o.status==='Offered'&&o.decisionDate<currentDate()){o.status='Expired';log('Activity signup closed',`${o.name} closed before you decided.`)}}for(const c of S.school.contests||[]){if(c.status==='Open'&&c.decisionDate<currentDate()){c.status='Missed';log('Registration closed',`${c.name} closed before you registered.`)}}}

// ---------- Family, requests, chores ----------
function caregiverApproval(extra=0){const r=familyRules(),wealth={Struggling:-10,Modest:-4,'Middle class':2,Comfortable:8,Wealthy:12,'Extremely wealthy':15}[S.wealth]||0;return chance(clamp(62-r.strictness*.28+r.respect*.25+(S.family.closeness-50)*.25+(S.family.responsibility||0)*.2+wealth+extra))}
function doChore(id){const c=D.chores.find(x=>x.id===id);if(!c||S.age<c.minAge){toast('That chore is not appropriate for your age yet.');return}const payMin=c.pay[0],payMax=c.pay[1],householdPays=chance(42+familyRules().generosity*.35);const pay=householdPays?payMin+Math.floor(Math.random()*(payMax-payMin+1)):0;S.choresDone=(S.choresDone||0)+1;S.family.responsibility=clamp((S.family.responsibility||0)+c.responsibility);S.family.closeness=clamp(S.family.closeness+1);if(pay)S.money+=pay;advanceTime(c.minutes);feedback(c.name,pay?`Responsibility +${c.responsibility} • earned ${money(pay)}`:`Responsibility +${c.responsibility} • no allowance this time`,c.minutes);checkConditionalRequests()}
function askAgainPending(id){const p=S.pendingDecisions.find(x=>x.id===id&&!x.resolved);if(!p)return;p.askCount=(p.askCount||0)+1;if(p.askCount>=2)S.family.tension=clamp(S.family.tension+2);if(p.resolveDate){const days=daysBetween(currentDate(),p.resolveDate);log('Asked again',`${p.title} is still pending${days>=0?` for ${days} more day${days===1?'':'s'}`:''}. Repeated asking can affect patience.`)}else log('Asked again',`${p.title} still depends on its condition.`)}
function familyTalk(){const before=S.family.closeness;S.family.closeness=clamp(S.family.closeness+4);S.family.tension=clamp(S.family.tension-2);S.needs.social=clamp(S.needs.social+8);advanceTime(S.age<5?20:35);feedback(S.age<3?'Caregiver connection':'Family conversation',`Closeness +${Math.round(S.family.closeness-before)} • tension eased`,S.age<5?20:35)}
function giftReaction(kind){const g=S.giftHistory.find(x=>!x.reaction);if(!g){toast('There is no unreplied gift moment.');return}if(kind==='thank'){g.reaction='Said thank you';S.family.closeness=clamp(S.family.closeness+2);setEmotion('Grateful',`You thanked the giver for ${g.item}.`,55)}else if(kind==='excited'){g.reaction='Acted excited';S.family.closeness=clamp(S.family.closeness+3);setEmotion('Excited',`You showed excitement about ${g.item}.`,70)}else if(kind==='hide'){g.reaction='Hid disappointment';setEmotion('Disappointed',`You wanted something different from ${g.item}.`,55)}else if(kind==='complain'){g.reaction='Complained';S.family.tension=clamp(S.family.tension+6);S.family.closeness=clamp(S.family.closeness-3);setEmotion('Disappointed',`You complained about ${g.item}.`,70)}else if(kind==='hug'){g.reaction='Hugged giver';S.family.closeness=clamp(S.family.closeness+4);setEmotion('Grateful',`You hugged the giver after receiving ${g.item}.`,65)}log('Gift reaction',`${g.reaction} after receiving ${g.item}. The giver may remember that reaction.`)}

// ---------- Relationships / NPC initiative ----------
function bestNonFamily(){return [...S.people].filter(p=>!isFamilyPerson(p)).sort((a,b)=>b.rel-a.rel)[0]||null}
function personById(id){return S.people.find(p=>p.id===id)}
function personAction(personId,action){const p=personById(personId);if(!p)return;if(['hangout','play'].includes(action)&&!availabilityGate(p))return;let minutes=20;if(action==='talk'){p.rel=clamp(p.rel+2);p.trust=clamp(p.trust+2);S.needs.social=clamp(S.needs.social+8);minutes=25;rememberPerson(p,'You had a real conversation.');setEmotion('Calm',`You talked with ${p.name}.`,35)}else if(action==='hangout'){p.rel=clamp(p.rel+5);p.fun=clamp(p.fun+4);p.trust=clamp(p.trust+2);S.needs.social=clamp(S.needs.social+18);S.needs.fun=clamp(S.needs.fun+15);minutes=S.age<10?90:150;rememberPerson(p,`You spent time together on ${formatDate(currentDate())}.`)}else if(action==='play'){p.rel=clamp(p.rel+5);p.fun=clamp(p.fun+7);S.needs.fun=clamp(S.needs.fun+18);S.needs.social=clamp(S.needs.social+12);minutes=75;rememberPerson(p,'You played together.')}else if(action==='confide'){if(p.trust<45){toast('You do not trust each other enough yet.');return}p.trust=clamp(p.trust+6);p.rel=clamp(p.rel+3);S.stress=clamp(S.stress-5);minutes=40;rememberPerson(p,'You trusted them with something personal.',2)}else if(action==='gossip'){p.fun=clamp(p.fun+3);p.trust=clamp(p.trust-2);p.conflict=clamp(p.conflict+2);minutes=25;rememberPerson(p,'You gossiped together; it was entertaining but risky.')}else if(action==='argue'){p.conflict=clamp(p.conflict+12);p.rel=clamp(p.rel-6);S.stress=clamp(S.stress+7);minutes=20;rememberPerson(p,'You had an argument.',2);setEmotion('Angry',`You argued with ${p.name}.`,65)}else if(action==='apologize'){if(p.conflict<5){toast('There is not much conflict to repair.');return}p.conflict=clamp(p.conflict-10);p.trust=clamp(p.trust+4);p.rel=clamp(p.rel+3);minutes=20;rememberPerson(p,'You apologized and tried to repair things.',2)}else if(action==='message'){if(!canUsePhone()){toast(phoneLockReason());return}if(!householdAccess('phone'))return;drainActivePhone();S.messages.unshift({id:uid('msg'),from:S.name,to:p.name,text:'You reached out.',dateISO:currentDate(),minute:currentMinute(),read:true});p.rel=clamp(p.rel+1);minutes=5;rememberPerson(p,'You exchanged messages.')}else if(action==='call'){if(!canUsePhone()){toast(phoneLockReason());return}if(!householdAccess('phone'))return;drainActivePhone();p.rel=clamp(p.rel+2);p.trust=clamp(p.trust+2);S.needs.social=clamp(S.needs.social+9);minutes=30;rememberPerson(p,'You talked on the phone.')}else if(action==='romance'){romanceMenu(p.id);return}else if(action==='giveGift'){openGiftPersonModal(p.id);return}else return;advanceTime(minutes);feedback(relationshipTitle(p,action),`${relationshipStory(p,action)} (Closeness ${Math.round(p.rel)} • trust ${Math.round(p.trust)})`,minutes)}
function npcInitiative(){if(!S.people.length||!chance(28))return;const p=rand(S.people);if(!p)return;if(p.role==='parent'&&S.school&&chance(45)){queueEvent({type:'parentSchool',title:`${p.name} asks about school`,text:'They want to know how grades, homework and stress are going.',participants:[p.id],choices:[{id:'honest',label:'Be honest'},{id:'hide',label:'Downplay problems'},{id:'help',label:'Ask for help'}]});return}if(p.role==='friend'&&S.age>=6){if(canUsePhone()&&chance(50)){S.messages.unshift({id:uid('msg'),from:p.name,fromId:p.id,text:rand(['Want to hang out?','I need your advice.','Did you hear what happened?','Are you free later?']),dateISO:currentDate(),minute:currentMinute(),read:false});notify('New message',`${p.name} messaged you.`)}else npcInvitesPlayer(p)}}
function worldTick(){for(const p of S.people){p.mood=rand(D.moods);p.lastSeen=(p.lastSeen||0)+1;if(chance(8)){p.memory='Something changed in their life while you were elsewhere.';rememberPerson(p,p.memory)}if(chance(4)&&p.role==='friend')p.rel=clamp(p.rel+(chance(55)?1:-1))}if(chance(12))S.luck=clamp(S.luck+(chance(50)?1:-1));if(S.social.fame>20&&chance(Math.min(12,S.social.fame/8)))notify('Attention online','Someone outside your usual circle noticed your public work.')}
function npcSchoolInitiative(){const p=rand(S.people.filter(x=>x.role==='friend'));if(!p)return;queueEvent({type:'schoolSocial',title:`Something happens with ${p.name}`,text:'A school-day interaction could strengthen or strain the relationship.',participants:[p.id],choices:[{id:'talk',label:'Talk it out'},{id:'joke',label:'Make a joke'},{id:'ignore',label:'Ignore it'}]})}

// ---------- Events / cooldowns ----------
function eligibleEventDefs(){return D.eventDefs.filter(e=>S.age>=e.minAge&&S.age<=e.maxAge&&(!e.school||S.school)&&(!e.weather||e.weather.includes(S.weather.type))&&(!S.eventCooldowns[e.id]||daysBetween(S.eventCooldowns[e.id],currentDate())>=e.cooldown))}
function weightedPick(items){const total=items.reduce((a,x)=>a+(x.weight||1),0);let r=Math.random()*total;for(const x of items){r-=x.weight||1;if(r<=0)return x}return items[0]}
function maybeRandomEvent(force=false){if(!force&&!chance(16))return;if(currentMinute()<390||currentMinute()>=1290)return;if(atSchool()&&!force)return;if(S.events.filter(e=>e.status==='Open').length>=2)return;const defs=eligibleEventDefs();if(!defs.length)return;const d=weightedPick(defs);S.eventCooldowns[d.id]=currentDate();queueEvent({type:d.id,title:d.title,text:d.text,choices:d.choices.map((x,i)=>({id:String(i),label:x}))})}
function resolveEventChoice(eventId,choiceId){
 const e=S.events.find(x=>x.id===eventId);if(!e||e.status!=='Open'){toast('That moment has already passed.');render();return}
 if(eventExpired(e)){expireEvent(e);toast('Too late — that moment has passed.');save();render();return}
 const choice=e.choices.find(x=>String(x.id)===String(choiceId)),label=choice?.label||String(choiceId);
 e.status='Resolved';e.choice=label;e.resolvedAt={dateISO:currentDate(),minute:currentMinute()};resolveNotificationsFor(e.id);
 if(handleLifecycleEventChoice(e,String(choice?.id??choiceId),label)){clearCurrentContextIfSourceResolved();save();render();return}
 if(e.type==='findCoins'){
  if(/Pick/i.test(label)){const amt=1+Math.floor(Math.random()*12);S.money+=amt;log('Found money',`You pick up ${money(amt)}.`)}else log('Left it there','You decide the money might belong to someone else.');
 }else if(['friendInvite','party','birthdayInvite'].includes(e.type)){
  const p=personById(e.participants?.[0])||bestNonFamily();
  if(/Accept|Go/i.test(label)){if(S.age<13&&!caregiverApproval(8)){log('Could not go','Your caregiver does not approve the plan this time.');setEmotion('Disappointed','You could not attend.',45)}else{if(p){p.rel=clamp(p.rel+5);p.trust=clamp(p.trust+2);rememberPerson(p,'You accepted an invitation and spent time together.')}S.needs.social=clamp(S.needs.social+15);S.needs.fun=clamp(S.needs.fun+10);advanceTime(120);log('Invitation accepted',p?`You spend time with ${p.name}.`:'You attend and spend time with people.')}}
  else if(/Ask caregiver|make a plan/i.test(label)){const ok=caregiverApproval(10);log('Asked about the invitation',ok?'Your caregiver agrees and helps with the plan.':'Your caregiver says no this time.');if(ok){S.needs.social=clamp(S.needs.social+10);advanceTime(120)}}
  else if(/later/i.test(label)&&p){p.rel=clamp(p.rel-1);log('Maybe later',`You do not commit to ${p.name}'s invitation.`)}else{if(p)p.rel=clamp(p.rel-2);log('Invitation declined',p?`You turn down ${p.name}.`:'You decide not to go.')}
 }else if(e.type==='birthdayParty'){
  if(/people|big/i.test(label)){const cost=S.age<18?0:35;if(cost&&S.money<cost){log('Birthday plan adjusted','A large celebration is too expensive right now, so the plan becomes smaller.')}else{if(cost)S.money-=cost;S.needs.social=clamp(S.needs.social+22);S.needs.fun=clamp(S.needs.fun+20);S.happiness=clamp(S.happiness+7);advanceTime(180);log('Birthday celebration','You celebrate with people close to you.',true)}}
  else if(/small/i.test(label)){S.needs.fun=clamp(S.needs.fun+10);S.family.closeness=clamp(S.family.closeness+3);advanceTime(90);log('Small birthday','You keep the celebration intimate and low-key.',true)}
  else log('No birthday party','You choose not to have a party this year.');
 }else if(e.type==='relativeBabyShower'){
  if(/Attend/i.test(label)){S.family.closeness=clamp(S.family.closeness+4);S.needs.social=clamp(S.needs.social+10);advanceTime(120);S.familyEvents.unshift({dateISO:currentDate(),text:'Attended a relative’s baby shower.'});log('Family baby shower','You attend with family and become part of the celebration.')}
  else if(/gift/i.test(label)){let cost=S.age<13?0:Math.min(15,S.money);if(cost)S.money-=cost;S.family.closeness=clamp(S.family.closeness+3);advanceTime(40);log('Helped choose a baby gift',cost?`You contribute ${money(cost)} and help pick something thoughtful.`:'You help your family choose a gift.')}
  else log('Stayed home','You do not attend the baby shower.');
 }else if(e.type==='neighborhoodDay'){
  if(/Go see/i.test(label)){S.needs.social=clamp(S.needs.social+10);S.needs.fun=clamp(S.needs.fun+7);advanceTime(90);if(chance(25)){const p=makePerson(`${rand(D.names)} • neighbor`,'friend',Math.max(S.age,S.age+Math.floor(Math.random()*3)-1),S.age);S.people.push(p);log('Met a neighbor',`${p.name} enters your social world.`)}else log('Neighborhood event','You spend some time around the neighborhood gathering.')}
  else if(/Help/i.test(label)){S.family.responsibility=clamp(S.family.responsibility+3);S.social.reputation=clamp(S.social.reputation+2);advanceTime(90);log('Helped nearby','People remember that you volunteered to help.')}
  else log('Stayed home','You skip the neighborhood event.');
 }else if(e.type==='familyOrdinary'){
  if(/Lean/i.test(label)){S.family.closeness=clamp(S.family.closeness+3);S.needs.social=clamp(S.needs.social+7);advanceTime(25);log('A warm family moment','You stay present in the little moment.')}else{S.needs.fun=clamp(S.needs.fun+6);advanceTime(20);log('Kept playing','The family moment passes while you stay absorbed in play.')}
 }else if(e.type==='rainPlan'){
  if(/Adapt/i.test(label)){S.needs.fun=clamp(S.needs.fun+4);S.family.closeness=clamp(S.family.closeness+1);advanceTime(45);log('Changed the plan','You find an indoor or rain-friendly alternative.')}else{S.needs.comfort=clamp(S.needs.comfort+8);advanceTime(30);log('Stayed home','You wait out the bad weather.')}
 }else if(['parentSchool','parentGrades'].includes(e.type)){
  if(/honest|Show everything/i.test(label)){S.family.closeness=clamp(S.family.closeness+3);S.family.tension=clamp(S.family.tension-1);log('Talked about school','You share the real situation with your caregiver.')}
  else if(/hide|Downplay/i.test(label)){S.family.tension=clamp(S.family.tension+2);log('Downplayed school problems','For now the conversation ends, but hidden problems can resurface.')}
  else{S.family.closeness=clamp(S.family.closeness+4);S.stress=clamp(S.stress-5);log('Asked for help','Your caregiver becomes more involved in supporting school.')}
 }else if(e.type==='schoolRumor'){
  if(/Pass/i.test(label)){const p=bestNonFamily();if(p){p.trust=clamp(p.trust-4);p.conflict=clamp(p.conflict+3)}S.social.reputation=clamp(S.social.reputation-2);log('Rumor spread','You pass the story along. It may come back to you.')}
  else if(/Ask/i.test(label))log('Asked questions','You try to understand the situation instead of assuming.');else log('Stayed out of it','You let the rumor move without adding to it.');
 }else if(e.type==='creativeNotice'){
  if(/Share/i.test(label)){const gain=3+Math.floor(Math.random()*14);S.social.followers+=gain;S.social.fame=clamp(S.social.fame+2);log('Shared creative work',`${gain} new people notice your work.`)}else log('Kept it private','You choose privacy over attention.');
 }else if(e.type==='celebritySighting'){
  if(/hello/i.test(label)){const good=chance(30+(S.luck-50)*.2);log('Brief encounter',good?'You exchange a short, respectful hello. It remains a small memorable moment.':'The person is busy and the moment passes quickly.')}else log('Celebrity sighting','You keep the encounter low-key.');
 }else if(e.type==='schoolSocial'){
  const p=personById(e.participants?.[0]);if(p){if(/Talk/i.test(label)){p.trust=clamp(p.trust+4);p.rel=clamp(p.rel+3)}else if(/joke/i.test(label)){p.fun=clamp(p.fun+5);p.rel=clamp(p.rel+2)}else p.rel=clamp(p.rel-1);rememberPerson(p,`School interaction: ${label}.`)}
 }else if(e.type==='neighborMoves'){
  if(/Pay attention/i.test(label)){const p=makePerson(`${rand(D.names)} • neighbor`,'friend',Math.max(S.age,S.age+Math.floor(Math.random()*5)-2),S.age);S.people.push(p);log('New neighbor',`${p.name} moves nearby. You may or may not become close.`)}else log('New neighbor','Someone new moves nearby, but you do not get involved yet.');
 }else log('Event choice',`${e.title}: ${label}.`);
 setEmotion('Thoughtful',`You chose: ${label}.`,35);clearCurrentContextIfSourceResolved();save();render()
}

// ---------- Phone ecosystem ----------
function ensurePhoneApps(){if(!S.phone)return;const apps=['Messages','Calls','Camera','Photos','Music','Games','Maps','Shopping','School portal'];if(S.age>=16)apps.push('Food delivery','Transport','Job finder','Banking');if(S.age>=18)apps.push('Dating');S.phone.appsUnlocked=[...new Set(apps)]}
function phoneApp(name){if(!canUsePhone()){toast(phoneLockReason());return}if(!householdAccess('phone'))return;drainActivePhone();ensurePhoneApps();if(!S.phone.appsUnlocked.includes(name)){toast(`${name} is locked at your current age.`);return}if(name==='Messages'){openMessagesModal();return}if(name==='Calls'){openPeopleChooser('call');return}if(name==='Camera'||name==='Photos'){advanceTime(10);S.needs.fun=clamp(S.needs.fun+3);feedback(name==='Camera'?'Took photos':'Looked through photos','A small memory captured.',10);return}if(name==='Music'){advanceTime(30);S.needs.fun=clamp(S.needs.fun+8);S.stress=clamp(S.stress-3);feedback('Listened to music','Fun +8 • Stress -3',30);return}if(name==='Games'){advanceTime(60);S.needs.fun=clamp(S.needs.fun+14);if(chance(12)){const p=makePerson(`${rand(D.names)} • online friend`,'friend',S.age,S.age);S.people.push(p);log('Met someone in a game',`${p.name} becomes part of your online social world.`)}feedback('Played a game','Fun +14',60);return}if(name==='Maps'){active='places';render();return}if(name==='Shopping'){active='business';render();return}if(name==='School portal'){active='school';render();return}if(name==='Food delivery'){if(S.money<15){toast('You need at least $15.');return}if(S.age<18&&!caregiverApproval(5)){toast('A caregiver says no to ordering food right now.');return}S.money-=15;S.needs.hunger=clamp(S.needs.hunger-50);advanceTime(35);feedback('Food delivery','Spent $15 • Hunger improved',35);return}if(name==='Transport'){active='places';render();return}if(name==='Job finder'){active='career';render();return}if(name==='Banking'){active='business';render();return}if(name==='Dating'){datingApp();return}}
function openMessagesModal(){const rows=S.messages.slice(0,12).map(m=>`<div class="message-row"><b>${esc(m.from)}</b><span>${esc(m.text)}</span><small>${formatDate(m.dateISO||currentDate())}</small>${!m.read?`<button class="small" data-message-reply="${esc(m.id)}">Reply</button>`:''}</div>`).join('')||'<p class="muted-text">No messages yet.</p>';openModal('Messages',rows)}
function socialPost(){if(!canUsePhone()){toast(phoneLockReason());return}if(!householdAccess('phone'))return;drainActivePhone();const gain=Math.max(0,Math.floor(Math.random()*7+(S.luck-50)/14+(S.social.reputation-50)/20));S.social.posts++;S.social.followers+=gain;if(chance(2+S.social.fame*.05)){const viral=15+Math.floor(Math.random()*60);S.social.followers+=viral;S.social.fame=clamp(S.social.fame+4);log('A post travels farther than usual',`${viral} new followers arrive from one post.`)}advanceTime(20);feedback('Posted online',gain?`${gain} new followers`:'Quiet response',20)}
function datingApp(){if(S.age<18){toast('Dating apps are adult-only in this simulation.');return}const p=makePerson(`${rand(D.names)} • dating app`,'friend',S.age+Math.floor(Math.random()*5)-2,S.age);p.rel=48;p.trust=35;S.people.push(p);advanceTime(25);log('Dating app match',`You match with ${p.name}. It may become a conversation, a date, a friendship, or nothing.`);openPersonModal(p.id)}

// ---------- Work / career ----------
function jobPool(){return S.age<18?D.jobs.teen:D.jobs.adult}
function applyForJob(jobId){if(S.age<D.ageRules.partTimeWork){toast('Regular paid work is not available yet.');return}if(S.career.job){toast('You already have a current job.');return}const job=jobPool().find(j=>j.id===jobId)||rand(jobPool());if(!job)return;const already=S.pendingDecisions.some(p=>!p.resolved&&p.type==='jobApplication');if(already){toast('You already have a job application pending.');return}const resolveDate=addDays(currentDate(),2+Math.floor(Math.random()*3));createPending({type:'jobApplication',title:`${job.title} application`,resolveDate,payload:{job},status:'Application pending',detail:`Response expected ${formatDate(resolveDate)}.`});advanceTime(30);feedback('Job application sent',`${job.title} • response expected ${formatDate(resolveDate)}`,30)}
function workShift(){const j=S.career.job;if(!j){toast('You do not have a job.');return}if(S.career.retired){toast('You are retired from this job.');return}const hours=j.hours||4,pay=(j.pay||15)*hours,performanceDelta=Math.round((S.energy-50)/25+(S.luck-50)/30+(Math.random()*4-2));S.money+=pay;S.career.performance=clamp((S.career.performance??50)+performanceDelta);S.career.reputation=clamp(S.career.reputation+(performanceDelta>1?1:0));S.energy=clamp(S.energy-hours*5);S.stress=clamp(S.stress+hours*1.5);advanceTime(hours*60);feedback('Work shift',`Earned ${money(pay)} • performance ${Math.round(S.career.performance)}%`,hours*60);if(S.career.performance<25&&chance(18)){log('Manager warning',`${j.manager||'Your manager'} warns you that performance needs to improve.`)}if(S.career.performance>82&&chance(8)){j.pay=Math.round(j.pay*1.08);log('Raise',`Your pay increases to ${money(j.pay)}/hour.`,true)}}
function quitJob(){if(!S.career.job){return}const title=S.career.job.title;S.career.job=null;S.career.performance=50;log('Left job',`You leave your role as ${title}.`,true)}
function buildCareerSkill(){S.career.skills=safeNum(S.career.skills,0,0)+1;S.energy=clamp(S.energy-8);advanceTime(75);feedback('Built a career skill',`General career skill level ${S.career.skills}`,75)}
function retire(){if(S.age<60){toast('Retirement is not yet a normal option at your age.');return}if(S.career.retired){toast('You are already retired.');return}S.career.retired=true;const title=S.career.job?.title;S.career.job=null;log('Retirement',title?`You retire from ${title} and enter a new life phase.`:'You formally settle into retirement.',true);setEmotion('Reflective','Retirement changes the rhythm of life.',55)}

// ---------- Small business / selling ----------
function requestSellingPermission(kind){if(S.age<D.ageRules.smallBusiness){toast('A caregiver must lead selling at this age.');return false}if(S.age>=16){S.permissions[kind]=true;return true}const ok=caregiverApproval(kind==='yardSale'?3:7);S.permissions[kind]=ok;log('Asked for selling permission',ok?`Your caregiver approves the ${kind==='yardSale'?'yard sale':'small stand'} with supervision.`:`Your caregiver says no to the ${kind==='yardSale'?'yard sale':'small stand'} for now.`);return ok}
function startConfiguredStand(cfg){if(S.age<D.ageRules.smallBusiness){toast('You are too young to organize a stand.');return}if(S.age<16&&S.permissions.stand!==true&&!requestSellingPermission('stand'))return;const prod=D.standProducts.find(p=>p.id===cfg.product)||D.standProducts[0],loc=D.standLocations.find(l=>l.id===cfg.location)||D.standLocations[0],stock=Math.max(3,Math.min(40,Math.round(cfg.stock||10))),price=Math.max(1,Math.min(50,Number(cfg.price)||prod.basePrice)),quality=clamp(cfg.quality??70,20,100),hours=Math.max(1,Math.min(5,Number(cfg.hours)||2)),signQuality=clamp(cfg.signQuality??60,0,100),parentHelp=S.age<13?true:!!cfg.parentHelp,ingredientCost=prod.baseCost*stock*(quality/70);if(S.age>=16){if(S.money<ingredientCost){toast(`Ingredients cost about ${money(ingredientCost)}.`);return}S.money-=ingredientCost}else if(['Struggling'].includes(S.wealth)&&!caregiverApproval(-8)&&S.money<ingredientCost){toast('Your family cannot cover the ingredients right now.');return}else if(S.money>=ingredientCost&&chance(35)){S.money-=ingredientCost}
 S.stall={id:uid('stall'),active:true,type:'Stand',product:prod.id,location:loc.id,items:[{name:prod.name,price,stock,quality,cost:prod.baseCost}],revenue:0,profit:0,visitors:0,day:S.day,dateISO:currentDate(),exaggeration:clamp(cfg.exaggeration??20),hours,signQuality,parentHelp,reputation:S.stall?.reputation||50};log('Stand opened',`${prod.name} at ${money(price)} each • ${loc.name} • ${hours}h planned${parentHelp?' • caregiver helps':''}.`);runStall(true)}
function runStall(manual=true){const st=S.stall;if(!st?.active||st.type!=='Stand')return;const item=st.items[0],prod=D.standProducts.find(x=>x.id===st.product)||D.standProducts[0],loc=D.standLocations.find(x=>x.id===st.location)||D.standLocations[0];if(item.stock<=0){st.active=false;toast('Sold out.');return}const hours=manual?st.hours||2:1,weather=prod.weatherBonus?.[S.weather.type]||0,pricePenalty=(item.price-prod.basePrice)*9,quality=(item.quality-50)*.35,sign=(st.signQuality-50)*.18,help=st.parentHelp?6:0,charisma=S.personality.includes('Social')?8:S.personality.includes('Shy')?-3:0,luck=(S.luck-50)*.15,base=loc.traffic+weather-pricePenalty+quality+sign+help+charisma+luck;const visitors=Math.max(0,Math.round(hours*(1+loc.traffic/30)+Math.random()*4)),sales=Math.min(item.stock,Math.max(0,Math.round(visitors*clamp(base,5,95)/100))),revenue=sales*item.price;item.stock-=sales;st.visitors+=visitors;st.revenue+=revenue;st.profit+=revenue;S.money+=revenue;st.reputation=clamp(st.reputation+(sales>0?1:0)-(st.exaggeration>70&&chance(25)?4:0));if(S.weather.type==='Rainy'&&prod.id==='lemonade'&&chance(35)){st.active=false;log('Rain closes the stand','Rain reduces traffic enough that the stand closes early.')}if(item.stock<=0)st.active=false;advanceTime(hours*60);feedback('Stand session',`${visitors} visitors • ${sales} sold • ${money(revenue)} revenue${st.active?'':' • closed'}`,hours*60);if(chance(5+S.luck*.03)){const tip=2+Math.floor(Math.random()*10);S.money+=tip;log('Generous neighbor',`A customer leaves an extra ${money(tip)} tip.`)}}
function startYardSale(itemId,price){if(S.age<D.ageRules.smallBusiness){toast('A caregiver would have to lead a yard sale at this age.');return}if(S.age<16&&S.permissions.yardSale!==true&&!requestSellingPermission('yardSale'))return;const it=S.inventoryItems.find(x=>x.id===itemId);if(!it){toast('Choose one of your possessions to sell.');return}price=Math.max(1,Math.round(Number(price)||itemValue(it)/(it.quantity||1)));S.stall={id:uid('yard'),active:true,type:'Yard Sale',yardItemId:it.id,items:[{name:it.name,price,stock:1,quality:it.condition}],revenue:0,profit:0,visitors:0,dateISO:currentDate(),exaggeration:20};log('Yard sale opened',`${it.name} is listed at ${money(price)}. Buyers may negotiate.`)}
function negotiateYardSale(strategy='counter'){const st=S.stall;if(!st?.active||st.type!=='Yard Sale'){toast('Open a yard sale first.');return}const it=S.inventoryItems.find(x=>x.id===st.yardItemId);if(!it){st.active=false;toast('That item is no longer available.');return}const ask=st.items[0].price,offer=Math.max(1,Math.round(ask*(.5+Math.random()*.35)));let accepted=false,final=offer;if(strategy==='accept')accepted=true;else if(strategy==='hold'){accepted=chance(22+(S.luck-50)*.1);final=ask}else{final=Math.round((ask+offer)/2);accepted=chance(55+(S.luck-50)*.12)}advanceTime(15);if(accepted){removeItem(it.id,true);S.money+=final;st.revenue+=final;st.active=false;feedback('Yard-sale deal',`Buyer offered ${money(offer)} • final price ${money(final)}`,15)}else feedback('No deal',`Buyer offered ${money(offer)} and walked away.`,15)}

// ---------- Travel / outside ----------
function travelMode(){if(S.age<3)return {kind:'caregiver',label:'Caregiver outing',note:'A caregiver chooses and handles everything.'};if(S.age<8)return {kind:'family',label:'Family outing',note:'A caregiver decides destination, transport and timing.'};if(S.age<13)return {kind:'ask',label:'Ask about a trip',note:'You suggest it; caregivers control permission and logistics.'};if(S.age<16)return {kind:'permission',label:'Ask permission for a trip',note:'Trips require an adult-approved plan.'};if(S.age<18)return {kind:'supervised',label:'Plan a trip with permission',note:'You can help plan and contribute money, but caregiver approval is required.'};return {kind:'independent',label:'Plan a trip',note:'You control destination, budget and transport.'}}
function localTransport(){if(S.age<8)return 'caregiver drives / walks with you';if(S.age<13)return ownsItem('bicycle')?'bike or caregiver':'school bus / caregiver';if(S.age<16)return 'bus, bike, caregiver or walking';if(S.age<18)return 'bus, train, ride with permission';return 'walk, bike, transit, taxi/ride-share or car where available'}
function visitPlace(placeId){const p=D.placesOutside.find(x=>x.id===placeId);if(!p)return;if(atSchool()){toast(`You are at school until ${timeLabel(SCHOOL_DAY.end)}.`);return}if(isGrounded()){toast(`You are grounded until ${formatDate(S.family.restrictions.groundedUntil)}.`);return}if(S.age<p.minAge||p.maxAge&&S.age>p.maxAge){toast('That place is not relevant at this age.');return}if(S.age<13&&!caregiverApproval(p.id==='friend'?5:12)){log('Outing denied',`A caregiver says no to ${p.name} right now.`);return}if(S.age<18&&S.age>=13&&!caregiverApproval(10)){log('Permission denied',`Household rules or timing prevent the ${p.name} plan.`);return}let cost=p.cost;if(S.age<13)cost=0;else if(S.age<18&&chance(55))cost=Math.round(cost*.5);if(S.money<cost&&cost>0){toast(`You need ${money(cost)} for this outing.`);return}S.money-=cost;S.location=p.name;let mins=p.minutes;mins=applyWeatherGear(p,mins);S.needs.fun=clamp(S.needs.fun+8);S.needs.social=clamp(S.needs.social+(p.id==='friend'?15:3));advanceTime(mins);if(!['friend','school','home'].includes(p.id))meetNewPeople(`the ${p.name.toLowerCase()}`);feedback(`Went to ${p.name}`,`${localTransport()}${cost?` • spent ${money(cost)}`:''}`,mins);S.location='Home';if(chance(22))maybeRandomEvent(true)}
function takeTrip(){const m=travelMode();if(atSchool()){toast('You are at school right now.');return}if(isGrounded()){toast(`You are grounded until ${formatDate(S.family.restrictions.groundedUntil)}.`);return}if(['caregiver','family','ask','permission','supervised'].includes(m.kind)&&!caregiverApproval(m.kind==='caregiver'?15:0)){log('Trip does not happen','Your caregivers decide against the trip because of time, cost, safety or other obligations.');return}const adult=S.age>=18,cost=adult?80+Math.floor(Math.random()*180):S.age>=16?30+Math.floor(Math.random()*80):0;if(adult&&S.money<cost){toast(`The trip costs about ${money(cost)}.`);return}if(S.age>=16&&S.age<18&&S.money<Math.round(cost*.4)&&!['Wealthy','Extremely wealthy'].includes(S.wealth)){toast('The trip is approved, but your contribution is not ready yet.');return}if(adult)S.money-=cost;else if(S.age>=16){const share=Math.min(S.money,Math.round(cost*.4));S.money-=share}S.travel.trips++;S.travel.lastTrip=currentDate();const days=adult?1+Math.floor(Math.random()*3):1;SIM.excuse=S.age<18?'Away on a family-approved trip':null;try{advanceTime(days*1440,{skipNeeds:true,silent:true})}finally{SIM.excuse=null}S.needs.fun=clamp(S.needs.fun+25);S.happiness=clamp(S.happiness+8);log(m.kind==='independent'?'Independent trip':'Family / approved trip',`${m.note} ${cost?`Approximate cost ${money(cost)}.`:''}`,true);if(chance(28))maybeRandomEvent(true)}

// ---------- Daily-life actions / validation ----------
function canAction(id){if(!S)return {ok:false,reason:'No active life.'};
 if(['phoneApp','socialPost','messagePerson'].includes(id)&&!canUsePhone())return {ok:false,reason:phoneLockReason()};
 const minAge={read:5,journal:6,tv:2,computer:5,exercise:4,draw:2,radioNews:6};
 if(minAge[id]!=null&&S.age<minAge[id])return {ok:false,reason:`${id==='read'?'Independent reading':id==='journal'?'Journaling':id==='tv'?'TV screen time':id==='computer'?'Computer use':id==='draw'?'Independent drawing':'That activity'} is not appropriate at this life stage.`};
 if(id==='radioNews'&&!canUnderstandRadioNews())return {ok:false,reason:'You are not yet able to understand enough of the news for this activity.'};
 if(id==='workShift'&&!S.career.job)return {ok:false,reason:'You do not have a job.'};if(id==='invest'&&S.age<18)return {ok:false,reason:'Independent investing unlocks at adulthood.'};return {ok:true}}
function hobbyAction(kind){
 if(kind==='babyPlay'){S.needs.fun=clamp(S.needs.fun+14);S.needs.social=clamp(S.needs.social+6);S.development.skills.communication=clamp(S.development.skills.communication+2);advanceTime(35);feedback('Sensory play',`${primaryCaregiver()} plays with you using age-appropriate toys and interaction.`,35)}
 else if(kind==='toyPlay'){S.needs.fun=clamp(S.needs.fun+16);S.development.skills.communication=clamp(S.development.skills.communication+1);advanceTime(50);feedback('Played with toys','Fun +16 • imagination and coordination practice',50)}
 else if(kind==='story'){S.needs.fun=clamp(S.needs.fun+7);S.needs.social=clamp(S.needs.social+5);S.development.skills.communication=clamp(S.development.skills.communication+3);S.development.skills.reading=clamp(S.development.skills.reading+2);advanceTime(25);feedback('Story time',`${primaryCaregiver()} reads and talks through a book with you.`,25)}
 else if(kind==='babble'){S.needs.social=clamp(S.needs.social+10);S.development.skills.communication=clamp(S.development.skills.communication+4);advanceTime(20);feedback(S.age<=1?'Babbled & interacted':'Talked & asked questions',`Communication ${Math.round(S.development.skills.communication)}%`,20)}
 else if(kind==='read'){S.needs.fun=clamp(S.needs.fun+7);S.stress=clamp(S.stress-3);S.development.skills.reading=clamp(S.development.skills.reading+(S.age<8?4:2));advanceTime(45);feedback(S.age<8?'Read with some help':'Read','Fun +7 • Stress -3',45)}
 else if(kind==='radioMusic'){S.needs.fun=clamp(S.needs.fun+9);S.stress=clamp(S.stress-2);advanceTime(30);feedback(S.age<5?'Listened to radio music with caregiver':'Listened to radio music','No screen required • Fun +9',30)}
 else if(kind==='radioNews'){if(!canUnderstandRadioNews()){toast('You do not understand enough of the news yet.');return}S.development.skills.communication=clamp(S.development.skills.communication+2);if(S.school){const sub=S.school.subjects.find(x=>/History|Language|English|Geography/.test(x.name));if(sub)sub.skill=clamp(sub.skill+1)}advanceTime(25);feedback('Listened to radio news','Communication/general knowledge practice • no screen required',25)}
 else if(kind==='draw'){S.needs.fun=clamp(S.needs.fun+12);S.happiness=clamp(S.happiness+4);advanceTime(S.age<5?35:60);feedback(S.age<5?'Scribbled & made simple art':'Created art','Creative growth • Fun +12',S.age<5?35:60);if(S.age>=10&&chance(4))queueEvent({type:'creativeNotice',title:'Someone notices your work',text:'A drawing or creative piece gets unexpected attention.',choices:[{id:'share',label:'Share more'},{id:'private',label:'Keep it private'}]})}
 else if(kind==='journal'){S.stress=clamp(S.stress-8);S.development.skills.reading=clamp(S.development.skills.reading+1);advanceTime(S.age<8?20:30);feedback(S.age<8?'Made a picture journal':'Journaled','Stress -8 • thoughts organized',S.age<8?20:30)}
 else if(kind==='tv'){if(!householdAccess('tv'))return;S.needs.fun=clamp(S.needs.fun+(S.age<5?7:10));advanceTime(S.age<5?30:60);feedback(S.age<5?'Watched a short TV program with caregiver':'Watched TV',S.age<18?'Caregiver-approved screen time':'Fun +10',S.age<5?30:60)}
 else if(kind==='computer'){if(!householdAccess('sharedDevice'))return;S.needs.fun=clamp(S.needs.fun+8);advanceTime(60);feedback('Used a computer',S.age<18?'Caregiver-approved household/school computer time':'School, games or creative work filled the hour.',60)}
 else if(kind==='game'){S.needs.fun=clamp(S.needs.fun+14);advanceTime(60);feedback(S.age<6?'Played':'Played a game','Fun +14',60)}
 else if(kind==='exercise'){const mins=S.age<10?45:60;S.healthState.fitness=clamp(S.healthState.fitness+4+(catalogItem(equippedIn('shoes')?.key)?.exerciseBonus||0));practiceSkill('fitness',1.2);S.health=clamp(S.health+2);S.stress=clamp(S.stress-5);S.energy=clamp(S.energy-10);advanceTime(mins);feedback('Exercise','Fitness +4 • Stress -5',mins)}
}
function cook(){if(S.age<D.ageRules.cookingHelp){toast('You can help a caregiver instead of cooking independently.');return}if(!householdAccess('stove'))return;const supervised=S.age<13;S.development.skills.cooking=clamp(S.development.skills.cooking+(supervised?5:8));S.needs.hunger=clamp(S.needs.hunger-48);S.energy=clamp(S.energy+4);advanceTime(50);feedback(supervised?'Cooked with supervision':'Cooked a meal',`Cooking skill ${Math.round(S.development.skills.cooking)}% • Hunger improved`,50)}
function familyMeal(){S.needs.hunger=clamp(S.needs.hunger-52);S.needs.social=clamp(S.needs.social+10);S.family.closeness=clamp(S.family.closeness+2);advanceTime(45);feedback('Ate with family','Hunger improved • family closeness +2',45)}
function homeComfort(kind){if(kind==='ac'&&!S.homeAmenities.ac){toast('This home does not currently have A/C.');return}if(kind==='fireplace'&&!S.homeAmenities.fireplace){toast('There is no fireplace available.');return}if(kind==='fan'&&!S.homeAmenities.fan){toast('No fan is available.');return}S.needs.comfort=clamp(S.needs.comfort+25);S.stress=clamp(S.stress-3);advanceTime(15);feedback(kind==='ac'?'Used A/C':kind==='fan'?'Used fan':'Sat by the fireplace','Comfort +25 • Stress -3',15)}
function saveMoney(amount=25){amount=Math.min(S.money,Math.max(1,Number(amount)||25));if(!amount){toast('No cash available to save.');return}S.money-=amount;if(S.age<13){S.finance.parentSavings+=amount;feedback('Saved money',`${money(amount)} moved to parent-managed savings.`,5)}else{S.finance.savings+=amount;feedback('Saved money',`${money(amount)} moved to savings.`,5)}checkConditionalRequests()}
function invest(){if(S.age<18){toast('Investing is an adult action.');return}const amount=Math.min(S.money,50);if(!amount){toast('No cash available.');return}S.money-=amount;S.finance.investments+=amount;advanceTime(10);feedback('Invested',`${money(amount)} invested • future value is uncertain`,10)}
function healthAction(kind){if(kind==='checkup'){const cost=S.age<18?0:25;if(cost&&S.money<cost){toast('You cannot cover the checkup cost.');return}S.money-=cost;S.health=clamp(S.health+6);S.healthState.illness=null;advanceTime(90);feedback('Health checkup',`${S.age<18?'Caregiver/household handled the cost':money(cost)+' spent'} • Health +6`,90)}else if(kind==='mental'){const cost=S.age<18?0:30;if(cost&&S.money<cost){toast('You cannot cover the cost.');return}S.money-=cost;S.stress=clamp(S.stress-16);S.happiness=clamp(S.happiness+5);advanceTime(60);feedback('Mental wellbeing','Stress -16 • Mood improved',60)}}

// ---------- Pending resolver override ----------

// ---------- Action router ----------
function act(id,arg){if(!S)return;if(atSchoolBlocks(id))return;const gate=canAction(id);if(!gate.ok){toast(gate.reason);return}try{
 if(id==='eat')basicAction('eat');else if(id==='snack')basicAction('snack');else if(id==='drink')basicAction('drink');else if(id==='toilet')basicAction('toilet');else if(id==='shower')basicAction('shower');else if(id==='bath')basicAction('bath');else if(id==='brush')basicAction('brush');else if(id==='washHands')basicAction('washHands');else if(id==='washFace')basicAction('washFace');else if(id==='dress')basicAction('dress');else if(id==='sleep')basicAction('sleep');else if(id==='nap')basicAction('nap');else if(id==='rest')basicAction('rest');
 else if(id==='familyMeal')familyMeal();else if(id==='cook')cook();else if(id==='familyTalk')familyTalk();else if(id==='babyPlay')hobbyAction('babyPlay');else if(id==='toyPlay')hobbyAction('toyPlay');else if(id==='story')hobbyAction('story');else if(id==='babble')hobbyAction('babble');else if(id==='play')hobbyAction(S.age<5?'toyPlay':'game');else if(id==='read')hobbyAction('read');else if(id==='radioMusic'||id==='music')hobbyAction('radioMusic');else if(id==='radioNews')hobbyAction('radioNews');else if(id==='draw')hobbyAction('draw');else if(id==='journal')hobbyAction('journal');else if(id==='tv')hobbyAction('tv');else if(id==='computer')hobbyAction('computer');else if(id==='game')hobbyAction('game');else if(id==='exercise')hobbyAction('exercise');
 else if(id==='school')attendSchool();else if(id==='exploreClub')exploreSchoolActivity();else if(id==='exploreContest')exploreSchoolEvent();else if(id==='saveMoney')saveMoney(arg||25);else if(id==='invest')invest();else if(id==='workShift')workShift();else if(id==='careerSkill')buildCareerSkill();else if(id==='quitJob')quitJob();else if(id==='retire')retire();else if(id==='trip')takeTrip();else if(id==='socialPost')socialPost();else if(id==='healthCheck')healthAction('checkup');else if(id==='mentalCare')healthAction('mental');else if(id==='comfort')homeComfort(arg);else if(id==='kindergartenYes')setKindergartenPreference(true);else if(id==='kindergartenNo')setKindergartenPreference(false);else if(id==='giftThank')giftReaction('thank');else if(id==='giftExcited')giftReaction('excited');else if(id==='giftHide')giftReaction('hide');else if(id==='giftComplain')giftReaction('complain');else if(id==='giftHug')giftReaction('hug');else if(id==='ageUp')ageUp();else if(id==='nextDay')nextDay();
 save();render();
 }catch(err){console.error('Action failed',id,arg,err);toast('That action could not finish. The save was kept safe.')}}


// =====================================================================
// v7.2 LIFECYCLE CORE
// Central rule: nothing important stays pending forever, and one
// transition updates every related record (exam ↔ calendar ↔ context ↔
// notifications ↔ log ↔ consequences).
// =====================================================================
const TERMINAL_STATUSES=['Completed','Attended','Missed','Excused','Cancelled','Expired','Resolved','Superseded','No-show','Withdrew'];
function isTerminal(status){return TERMINAL_STATUSES.includes(status)}
const SIM={skipping:false,sleeping:false,summary:null,excuse:null};
function pad4(n){return String(Math.max(0,Math.min(1439,Math.round(Number(n)||0)))).padStart(4,'0')}
function stamp(dateISO,minute){return `${dateISO}T${pad4(minute)}`}
function nowStamp(){return stamp(currentDate(),currentMinute())}
function endOfDay(dateISO=currentDate()){return {dateISO,minute:1439}}
function stampOf(x){return x&&x.dateISO?stamp(x.dateISO,x.minute??1439):null}
function ordinal(n){const s=['th','st','nd','rd'],v=n%100;return n+(s[(v-20)%10]||s[v]||s[0])}
function ensureLifecycleContainers(){
 S.archive=Object.assign({pending:[],calendar:[],events:[],exams:[],homework:[]},S.archive||{});
 for(const k of Object.keys(S.archive))if(!Array.isArray(S.archive[k]))S.archive[k]=[];
 S.followUps=Array.isArray(S.followUps)?S.followUps:[];
 S.family.restrictions=Object.assign({groundedUntil:null,reason:null},S.family.restrictions||{});
 S.schoolHistory=Array.isArray(S.schoolHistory)?S.schoolHistory:[];
 S.healthState=S.healthState||{fitness:50,sleep:80,illness:null};
}

// ---------- School calendar ----------
const SCHOOL_DAY={start:480,tardyAfter:495,cutoff:660,end:900};
function isWeekend(dateISO){const d=parseISO(dateISO).getUTCDay();return d===0||d===6}
function gradeNumber(){const m=/Grade (\d+)/.exec(S.school?.grade||'');return m?Number(m[1]):0}
function freshSchoolRecord(){return {daysAttended:0,absences:0,excused:0,tardies:0,examsCompleted:0,examsMissed:0,examsExcused:0,submittedHomework:0,lateHomework:0,missingHomework:0,meetingHeld:false}}
function ensureSchoolRecord(){if(!S.school)return null;S.school.record=Object.assign(freshSchoolRecord(),S.school.record||{});return S.school.record}
function isGrounded(){const g=S.family?.restrictions?.groundedUntil;return S.age<18&&!!g&&g>=currentDate()}
function ground(days,reason){if(S.age>=18)return;const until=addDays(currentDate(),days);const cur=S.family.restrictions.groundedUntil;if(!cur||until>cur)S.family.restrictions.groundedUntil=until;S.family.restrictions.reason=reason;notify('Grounded',`No outings or social plans until ${formatDate(until)}.`,{sourceType:'restriction',sourceId:'grounded-'+until,tab:'family'})}

// ---------- Obligation registry (calendar events ARE obligations) ----------
const OBLIGATION_DEFS={
 schoolDay:{category:'School',icon:'🏫',start:480,end:900,grace:660,required:true,importance:2,location:'School'},
 exam:{category:'Exam',icon:'📝',start:540,end:615,grace:660,required:true,importance:3,location:'School'},
 clubSession:{category:'Club',icon:'🎨',start:930,end:1020,grace:960,required:false,importance:1,location:'School'},
 schoolEvent:{category:'Competition',icon:'🏆',start:600,end:780,grace:690,required:true,importance:2,location:'School hall'},
 party:{category:'Social',icon:'🎉',start:1020,end:1200,grace:1080,required:false,importance:1,location:''},
 tryout:{category:'Club',icon:'🏅',start:930,end:1020,grace:945,required:true,importance:2,location:'School'},
 plan:{category:'Social',icon:'🤝',start:960,end:1080,grace:990,required:true,importance:2,location:''},
 prom:{category:'Social',icon:'💃',start:1140,end:1380,grace:1230,required:false,importance:2,location:''},
 election:{category:'Club',icon:'🗳️',start:870,end:900,grace:900,required:false,importance:1,location:'School'},
 generic:{category:'Other',icon:'🗓️',start:0,end:60,grace:60,required:false,importance:0,location:''}
};
function obDef(type){return OBLIGATION_DEFS[type]||OBLIGATION_DEFS.generic}
function normalizeCalendarEvent(ev){
 const d=obDef(ev.type);ev.id=ev.id||uid('cal');ev.type=ev.type||'generic';ev.payload=ev.payload||{};ev.status=ev.status||'Scheduled';
 const start=Number.isFinite(Number(ev.startMinute))?Number(ev.startMinute):Number.isFinite(Number(ev.minute))?Number(ev.minute):d.start;
 ev.startMinute=start;ev.minute=start;
 if(!Number.isFinite(Number(ev.endMinute)))ev.endMinute=Math.min(1439,start+(d.end-d.start));
 if(!Number.isFinite(Number(ev.graceMinute)))ev.graceMinute=Math.min(1439,start+(d.grace-d.start));
 ev.category=ev.category||d.category;ev.required=ev.required??d.required;ev.importance=ev.importance??d.importance;ev.location=ev.location??d.location;
 ev.participants=Array.isArray(ev.participants)?ev.participants:[];ev.sourceId=ev.sourceId||ev.payload.examId||ev.payload.clubId||ev.payload.contestId||null;
 ev.attendanceStatus=ev.attendanceStatus||null;ev.history=Array.isArray(ev.history)?ev.history:[];
 return ev
}
function createCalendarEvent(ev){
 const e=normalizeCalendarEvent(Object.assign({id:uid('cal'),type:'generic',title:'Scheduled event',dateISO:currentDate(),status:'Scheduled',payload:{},source:'system',createdDate:currentDate()},ev||{}));
 const existing=S.calendar.find(x=>x.id===e.id);if(existing)return existing;S.calendar.push(e);return e
}
function setCalendarStatus(ev,status,reason=''){
 if(!ev||ev.status===status)return;ev.history=ev.history||[];ev.history.push({from:ev.status,to:status,dateISO:currentDate(),minute:currentMinute(),reason});if(ev.history.length>8)ev.history.shift();ev.status=status;
 if(isTerminal(status)){ev.resolvedAt={dateISO:currentDate(),minute:currentMinute()};ev.resolutionReason=reason;resolveNotificationsFor(ev.id)}
}
function completeCalendarEvent(ev,status='Completed',reason=''){setCalendarStatus(ev,status,reason);clearCurrentContextIfSourceResolved()}
function expireCalendarEvent(ev,reason='Window passed'){setCalendarStatus(ev,'Expired',reason)}

// ---------- Central obligation processing ----------
function processCalendar(){
 ensureLifecycleContainers();const now=nowStamp();
 for(const ev of [...S.calendar]){
  if(isTerminal(ev.status))continue;normalizeCalendarEvent(ev);
  if(now<stamp(ev.dateISO,ev.startMinute))continue;
  if(SIM.skipping){simulateObligation(ev);continue}
  if(ev.type==='schoolEvent'&&ev.status==='Scheduled'&&isSchoolDay(ev.dateISO)&&ev.startMinute===600&&now<stamp(ev.dateISO,ev.graceMinute)){Object.assign(ev,contestSlot(ev.dateISO));ev.minute=ev.startMinute;continue}
  if(ev.status==='Attending'){if(ev.type==='schoolDay'&&now>=stamp(ev.dateISO,ev.endMinute))finishSchoolDay(ev);continue}
  if(now>stamp(ev.dateISO,ev.graceMinute)){missObligation(ev);continue}
  if(ev.status==='Scheduled'){setCalendarStatus(ev,'Due','Window opened');onObligationDue(ev)}
 }
 processPendingDecisions();checkConditionalRequests();expireEvents();processFollowUps();if(S.plans)plansTick();
}
function onObligationDue(ev){
 if(SIM.skipping)return;
 if(ev.type==='exam'){const exam=S.exams.find(x=>x.id===ev.payload?.examId);if(!examIsOpen(exam)){setCalendarStatus(ev,calStatusForExam(exam)||'Cancelled','Reconciled');return}exam.status='Due';notify('Assessment today',`${exam.subject} ${exam.type.toLowerCase()} • ${timeLabel(exam.minute)}. Late sitting closes at ${timeLabel(exam.graceMinute)}.`,{sourceType:'exam',sourceId:exam.id,tab:'school'});offerContext(examContext(exam));return}
 if(ev.type==='clubSession'){const c=clubById(ev.payload?.clubId);if(!c||c.status!=='Active'){setCalendarStatus(ev,'Cancelled','Club inactive');return}notify('Club session now',`${c.name} started at ${timeLabel(ev.startMinute)}.`,{sourceType:'club',sourceId:ev.id,tab:'school'});offerContext(calendarContext(ev));return}
 if(ev.type==='schoolEvent'){const c=contestById(ev.payload?.contestId);if(!c||c.status!=='Registered'){setCalendarStatus(ev,'Cancelled','Not registered');return}notify('Event today',`${c.name} • arrive by ${timeLabel(ev.graceMinute)}.`,{sourceType:'contest',sourceId:ev.id,tab:'school'});offerContext(calendarContext(ev));return}
 if(['tryout','plan'].includes(ev.type)){notify(ev.type==='tryout'?'Tryout now':'Plans now',`${ev.title} • ${timeLabel(ev.startMinute)}.`,{sourceType:ev.type,sourceId:ev.id,tab:ev.type==='tryout'?'school':'people'});offerContext(calendarContext(ev));return}
 if(ev.type==='election')return;
 if(ev.type==='prom'){if(S.school?.prom?.plan!=='skip'){notify('Prom tonight',`${ev.location} • 7:00 PM`,{sourceType:'prom',sourceId:ev.id,tab:'home'});offerContext({sourceType:'calendar',sourceId:ev.id,priority:5,title:'Prom tonight',text:`${ev.location}. Doors at 7:00 PM.`,expiresAt:{dateISO:ev.dateISO,minute:ev.graceMinute}})}return}
 if(ev.type==='party'){queueEvent({type:'party',title:ev.title,text:ev.text||'A social event you were expecting has arrived.',choices:[{id:'go',label:'Go'},{id:'skip',label:'Skip'}]});setCalendarStatus(ev,'Resolved','Converted to invitation');return}
 if(ev.type!=='schoolDay')setCalendarStatus(ev,'Resolved','Reached')
}
function missObligation(ev){
 const sick=!!S.healthState?.illness,excuse=SIM.excuse||(sick?'Illness':null);
 if(ev.type==='exam'){const exam=S.exams.find(x=>x.id===ev.payload?.examId);if(!examIsOpen(exam)){setCalendarStatus(ev,calStatusForExam(exam)||'Cancelled','Reconciled');return}finalizeExam(exam.id,{status:excuse?'Excused':'Missed',reason:excuse||'Did not attend the assessment window'});return}
 if(ev.type==='schoolDay'){markSchoolAbsence(ev,{excused:!!excuse,reason:excuse||''});return}
 if(ev.type==='clubSession'){resolveClubSession(ev,excuse?'Excused':'Missed',excuse||'No-show');return}
 if(ev.type==='schoolEvent'){resolveContestAttendance(ev,excuse?'Withdrew':'No-show');return}
 if(ev.type==='tryout'){tryoutMissed(ev);return}
 if(ev.type==='prom'){promMissed(ev);return}
 if(ev.type==='plan'){planNoShow(ev);return}
 if(ev.type==='election'){const el=S.elections?.find(x=>x.id===ev.payload?.electionId);if(el&&el.status==='Campaign')decideElection(el);setCalendarStatus(ev,'Completed','Votes counted');return}
 setCalendarStatus(ev,'Expired','Time passed')
}
function attendTendency(type){
 const base={schoolDay:96,exam:95,clubSession:80,schoolEvent:90}[type]??85;
 const resp=(S.family?.responsibility||0)*.06,stress=Math.max(0,S.stress-50)*.15,health=S.health<50?8:0;
 const pers=(S.personality.includes('Responsible')?3:0)-(S.personality.includes('Stubborn')||S.personality.includes('Bold')?2:0);
 return clamp(base+resp-stress-health+pers-(S.age>=15&&S.age<=17?2:0),50,99.5)
}
function simulateObligation(ev){
 const attend=chance(attendTendency(ev.type)),sick=chance(ev.type==='schoolDay'?2.5:1.5);
 if(ev.type==='exam'){const exam=S.exams.find(x=>x.id===ev.payload?.examId);if(!examIsOpen(exam)){setCalendarStatus(ev,calStatusForExam(exam)||'Cancelled','Reconciled');return}if(attend&&!sick)performExam(exam,{simulated:true});else finalizeExam(exam.id,{status:sick?'Excused':'Missed',reason:sick?'Illness':'Skipped',simulated:true});return}
 if(ev.type==='schoolDay'){if(SIM.excuse)markSchoolAbsence(ev,{excused:true,reason:SIM.excuse,simulated:true});else if(sick)markSchoolAbsence(ev,{excused:true,reason:'Sick day',simulated:true});else if(attend)markSchoolAttendance(ev,{tardy:chance(4),simulated:true});else markSchoolAbsence(ev,{simulated:true});return}
 if(ev.type==='clubSession'){const c=clubById(ev.payload?.clubId);if(!c||c.status!=='Active'){setCalendarStatus(ev,'Cancelled','Club inactive');return}if(attend&&!sick)clubSessionAttended(ev,{simulated:true});else resolveClubSession(ev,sick?'Excused':'Missed',sick?'Sick':'Skipped',{simulated:true});return}
 if(ev.type==='schoolEvent'){const c=contestById(ev.payload?.contestId);if(!c||c.status!=='Registered'){setCalendarStatus(ev,'Cancelled','Not registered');return}if(attend&&!sick){resolveContest(c,{simulated:true});setCalendarStatus(ev,'Attended','Simulated attendance')}else resolveContestAttendance(ev,sick?'Withdrew':'No-show',{simulated:true});return}
 if(ev.type==='tryout'){const t=S.school?.tryouts?.find(x=>x.id===ev.payload?.tryoutId);if(t&&t.status==='Scheduled'&&attend){t.prep=Math.max(t.prep,25+Math.random()*30);evaluateTryout(t,{simulated:true});setCalendarStatus(ev,'Attended','Simulated')}else tryoutMissed(ev);return}
 if(ev.type==='prom'){const pr=S.school?.prom;if(!pr||pr.plan==='skip'||!attend){promMissed(ev);return}pr.status='Done';setCalendarStatus(ev,'Attended','Simulated');const pp=pr.partnerId?personById(pr.partnerId):null;if(pp)pp.rel=clamp(pp.rel+4);S.milestones.unshift({dateISO:currentDate(),age:S.age,title:'💃 Prom',text:pp?`You went to prom with ${displayName(pp,'formal')}.`:'You went to prom with friends.'});if(SIM.summary)SIM.summary.notable.push('Went to prom');return}
 if(ev.type==='plan'){const plan=S.plans?.find(x=>x.id===ev.payload?.planId);if(plan&&attend){plan.status='Attended';const p=personById(plan.personId);if(p)p.rel=clamp(p.rel+3);setCalendarStatus(ev,'Attended','Simulated')}else planNoShow(ev);return}
 if(ev.type==='election'){const el=S.elections?.find(x=>x.id===ev.payload?.electionId);if(el)decideElection(el);setCalendarStatus(ev,'Completed','Simulated');return}
 setCalendarStatus(ev,'Expired','Skipped ahead')
}

// ---------- Notifications ----------
function notify(title,text,opts={}){
 S.notifications=S.notifications||[];
 if(opts.sourceId&&S.notifications.some(x=>x.sourceId===opts.sourceId&&x.title===title&&['Unread','Read'].includes(x.status)))return null;
 const n={id:uid('note'),dateISO:currentDate(),minute:currentMinute(),title,text,read:false,status:'Unread',sourceType:opts.sourceType||null,sourceId:opts.sourceId||null,tab:opts.tab||null};
 S.notifications.unshift(n);if(S.notifications.length>60)S.notifications.length=60;return n
}
function resolveNotificationsFor(sourceId,status='Resolved'){if(!sourceId)return;for(const n of S.notifications||[])if(n.sourceId===sourceId&&['Unread','Read'].includes(n.status)){n.status=status;n.read=true;n.resolvedDate=currentDate()}}
function activeNotifications(){return (S.notifications||[]).filter(n=>['Unread','Read'].includes(n.status))}

// ---------- Exams ----------
function examIsOpen(e){return !!e&&['Scheduled','Due','In progress'].includes(e.status)}
function examSubject(exam){return S.school?.subjects?.find(x=>x.name===exam?.subject)||null}
function ensureTeacher(sub){if(!sub)return null;sub.teacher=sub.teacher||{name:teacherName(sub.name),rel:55};sub.teacher.style=sub.teacher.style||rand(['Strict','Fair','Fair','Warm']);return sub.teacher}
function normalizeExam(x){
 x.id=x.id||uid('exam');x.type=x.type||'Assessment';if(!x.dateISO)x.dateISO=addDays(currentDate(),Math.max(1,safeNum(x.days,10)));
 if(!x.status)x.status=x.score==null?'Scheduled':'Completed';if(x.score!=null&&['Scheduled','Due','In progress'].includes(x.status))x.status='Completed';
 x.minute=safeNum(x.minute,540,0,1439);x.endMinute=safeNum(x.endMinute,Math.min(1439,x.minute+75),0,1439);x.graceMinute=safeNum(x.graceMinute,x.minute>=SCHOOL_DAY.end?Math.min(1439,x.minute+60):SCHOOL_DAY.cutoff,0,1439);x.prep=safeNum(x.prep,0,0,100);return x
}
function calStatusForExam(exam){if(!exam)return null;if(exam.status==='Completed'||exam.status==='Replaced by make-up')return 'Completed';if(exam.status==='Excused')return 'Excused';if(exam.status==='Make-up scheduled')return exam.excused?'Excused':'Missed';if(exam.status==='Missed')return 'Missed';if(exam.status==='Cancelled')return 'Cancelled';return null}
function examCalendarEvents(exam){return S.calendar.filter(e=>e.type==='exam'&&e.payload?.examId===exam.id)}
function addExamRecord(exam){normalizeExam(exam);S.exams.push(exam);createCalendarEvent({id:'cal-'+exam.id,type:'exam',title:`${exam.subject} • ${exam.type}`,dateISO:exam.dateISO,startMinute:exam.minute,endMinute:exam.endMinute,graceMinute:exam.graceMinute,payload:{examId:exam.id},source:'school'});return exam}
function ensureRollingAssessments(){
 if(!needsFormalSchool())return;if(S.exams.filter(examIsOpen).length>=2)return;
 const subs=S.school.subjects.slice(0,6);if(!subs.length)return;
 const last=n=>S.exams.filter(e=>e.subject===n).map(e=>e.dateISO).sort().pop()||'0000';
 const sub=[...subs].sort((a,b)=>last(a.name).localeCompare(last(b.name))||Math.random()-.5)[0];
 const types=S.age<=11?['Class assessment','Quiz']:['Quiz','Unit test','Project / final'];
 const rollDate=nextSchoolDay(addDays(currentDate(),7+Math.floor(Math.random()*12)));if(!semesterEnd()||rollDate>semesterEnd())return;
 addExamRecord({id:uid('exam'),subject:sub.name,dateISO:rollDate,minute:540,type:rand(types),score:null,status:'Scheduled',prep:0})
}
function syncExamCalendar(){
 if(!S.school)return;
 for(const exam of S.exams||[]){
  normalizeExam(exam);exam.days=daysBetween(currentDate(),exam.dateISO);
  let evs=examCalendarEvents(exam);
  if(evs.length>1){const keep=evs.find(e=>e.id==='cal-'+exam.id)||evs[0];S.calendar=S.calendar.filter(e=>!(e.type==='exam'&&e.payload?.examId===exam.id&&e!==keep));evs=[keep]}
  if(!evs.length&&examIsOpen(exam))evs=[createCalendarEvent({id:'cal-'+exam.id,type:'exam',title:`${exam.subject} • ${exam.type}`,dateISO:exam.dateISO,startMinute:exam.minute,endMinute:exam.endMinute,graceMinute:exam.graceMinute,payload:{examId:exam.id},source:'school'})];
  for(const ev of evs){
   const target=calStatusForExam(exam);
   if(target){if(!isTerminal(ev.status)||ev.status!==target)setCalendarStatus(ev,target,'Synced with assessment record')}
   else{if(examIsOpen(exam)){ev.dateISO=exam.dateISO;ev.startMinute=ev.minute=exam.minute;ev.endMinute=exam.endMinute;ev.graceMinute=exam.graceMinute;if(isTerminal(ev.status))ev.status='Scheduled';if(ev.status==='Due'&&stamp(exam.dateISO,exam.minute)>nowStamp())ev.status='Scheduled'}}
  }
 }
}
function examScore(exam,{late=0,cheat=false,simulated=false}={}){
 const sub=examSubject(exam);if(!sub)return 60;
 if(simulated){const prep=clamp(Math.max(sub.prep,45+(S.family?.responsibility||0)*.3+Math.random()*20-Math.max(0,S.stress-55)*.3));return clamp(Math.round(sub.skill*.4+sub.score*.45+prep*.15+(S.luck-50)*.08+(Math.random()*14-7)))}
 const prep=sub.prep;
 const sleep=simulated?0:(S.needs.sleep-50)*.08,stress=simulated?0:Math.max(0,S.stress-45)*.12,luck=(S.luck-50)*.08,latePenalty=late>0?Math.min(18,late/4):0;
 return clamp(Math.round(sub.skill*.42+prep*.35+sub.score*.23+sleep-stress+luck+(Math.random()*14-7)+(cheat?10:0)-latePenalty))
}
function examStory(exam,score,late){
 const sub=examSubject(exam),t=ensureTeacher(sub)?.name||'The teacher',prep=sub?.prep||0,tired=S.needs.sleep<40,nervous=S.stress>60;
 const lateLine=late>0?rand([`You slipped in ${late} minutes late and had to start while everyone else was already writing.`,`${t} let you sit down late, but the clock did not wait for you.`]):'';
 let core;
 if(score>=85)core=rand([`The questions felt familiar from the first page${prep>=60?' — the preparation paid off':''}. You finished with time to check your work.`,`You worked steadily and only hesitated on one question. Walking out, you already suspect it went well.`,`${exam.subject} clicked today. Even the last section felt manageable.`]);
 else if(score>=70)core=rand([`Most of it went smoothly. One section slowed you down, but you worked through it.`,`You knew more than you expected, though a couple of questions caught you off guard.`,`It was solid work. Not perfect, but you were not guessing much.`]);
 else if(score>=55)core=rand([`You recognized some questions and guessed on others. ${tired?'Being tired made it harder to focus.':nervous?'Nerves kept getting in the way.':'More preparation would have helped.'}`,`Half of it made sense. The other half you had to reason out on the spot.`]);
 else core=rand([`The questions blurred together. ${tired?'You could barely keep your eyes open.':prep<30?'You had not prepared enough for this one.':'Your mind went blank on the hardest section.'}`,`You stared at the second page longer than you would like to admit. It was a hard day.`]);
 return [lateLine,core].filter(Boolean).join(' ')
}
function performExam(exam,{cheat=false,simulated=false,lateMinutes=0}={}){
 if(!examIsOpen(exam))return null;const sub=examSubject(exam);
 exam.status='In progress';examCalendarEvents(exam).forEach(ev=>setCalendarStatus(ev,'Attending','Sitting the assessment'));
 if(cheat&&!simulated){
  const caught=chance(28+(S.stress/5)-(S.luck-50)*.1);
  if(caught){const t=ensureTeacher(sub);if(t)t.rel=clamp(t.rel-20);S.school.behavior=clamp(S.school.behavior-18);S.family.tension=clamp(S.family.tension+8);setEmotion('Embarrassed','You were caught cheating.',75);advanceTime(60,{silent:true});finalizeExam(exam.id,{status:'Completed',score:0,reason:'Caught cheating',narrative:`${t?.name||'The teacher'} quietly takes your paper halfway through. The score is a zero, and a note goes home.`});if(S.age<18)scheduleFollowUp('cheatingParent',{examId:exam.id},{minute:1080});return exam}
 }
 const score=examScore(exam,{late:lateMinutes,cheat,simulated});
 if(!simulated){S.stress=clamp(S.stress+5);S.happiness=clamp(S.happiness+(score>=75?5:score<55?-5:0));advanceTime(Math.max(30,(exam.endMinute-exam.minute)-lateMinutes),{silent:true})}
 finalizeExam(exam.id,{status:'Completed',score,reason:lateMinutes?'Completed late':'Completed',narrative:simulated?'':examStory(exam,score,lateMinutes),simulated});
 return exam
}
function finalizeExam(examId,{status='Completed',score=null,reason='',narrative='',simulated=false}={}){
 const exam=S.exams.find(x=>x.id===examId);if(!exam)return null;if(!examIsOpen(exam))return exam;
 const sub=examSubject(exam),t=ensureTeacher(sub),rec=ensureSchoolRecord()||freshSchoolRecord(),sum=SIM.summary?.school;
 exam.status=status;exam.resolvedAt={dateISO:currentDate(),minute:currentMinute()};exam.reason=reason;
 if(status==='Completed'){
  exam.score=clamp(Math.round(score??0));
  if(sub){const before=sub.score;sub.score=clamp(sub.score+(exam.score-sub.score)*.16);exam.subjectDelta=sub.score-before;sub.prep=clamp(sub.prep*.35)}
  if(exam.makeupOf){const orig=S.exams.find(x=>x.id===exam.makeupOf)||S.archive.exams.find(x=>x.id===exam.makeupOf);if(orig){orig.status='Replaced by make-up';orig.replacedBy=exam.id}}
  rec.examsCompleted++;if(sum){sum.examsCompleted++;sum.scores.push(exam.score)}if(exam.score>=85)addRep('academic',1.5);else if(exam.score<50)addRep('academic',-.5);if(reason==='Caught cheating')addRep('troublemaker',8);
  if(!simulated){log(`${exam.subject} ${exam.type} • ${exam.score}%`,narrative||'You completed the assessment.',exam.score>=95);toast(`${exam.subject}: ${exam.score}%`)}
 }else if(status==='Missed'){
  exam.score=0;exam.incomplete=true;
  if(!exam.consequencesApplied){if(sub){const before=sub.score;sub.score=clamp(sub.score-Math.max(3,sub.score*.1));exam.subjectDelta=sub.score-before}if(t)t.rel=clamp(t.rel-(t.style==='Strict'?7:4));S.school.attendance=clamp(S.school.attendance-1);S.stress=clamp(S.stress+4);rec.examsMissed++;if(sum)sum.examsMissed++}
  if(!simulated){log(`Missed ${exam.subject}`,`The ${exam.type.toLowerCase()} happened without you. For now it counts as a zero and an incomplete.`);queueMissedExamEvent(exam)}
  else if(chance(35+(t?.rel||50)*.3)){scheduleMakeupExam(exam);if(sum)sum.makeups++}
 }else if(status==='Excused'){
  exam.excused=true;exam.score=null;rec.examsExcused++;if(sum)sum.examsExcused++;
  const mk=scheduleMakeupExam(exam);if(!simulated)log(`${exam.subject} excused`,`Because of ${String(reason||'a recorded absence').toLowerCase()}, ${t?.name||'your teacher'} excuses the ${exam.type.toLowerCase()}.${mk?` A make-up is set for ${formatDate(mk.dateISO)}.`:''}`)
 }
 exam.consequencesApplied=true;
 for(const ev of examCalendarEvents(exam))setCalendarStatus(ev,calStatusForExam(exam)||'Resolved',reason||status);
 resolveNotificationsFor(exam.id);clearCurrentContextIfSourceResolved();
 return exam
}
function scheduleMakeupExam(exam){
 if(!exam||exam.makeupOf||exam.makeupId)return null;
 const sub=examSubject(exam),dateISO=nextSchoolDay(addDays(currentDate(),2+Math.floor(Math.random()*3)));
 const mk=addExamRecord({id:uid('exam'),subject:exam.subject,type:`${exam.type} (make-up)`,dateISO,minute:930,endMinute:1005,graceMinute:990,score:null,status:'Scheduled',prep:0,makeupOf:exam.id});
 exam.makeupId=mk.id;exam.status='Make-up scheduled';
 if(sub&&exam.subjectDelta<0&&!exam.penaltyReverted){sub.score=clamp(sub.score-exam.subjectDelta);exam.penaltyReverted=true}
 for(const ev of examCalendarEvents(exam))if(!isTerminal(ev.status))setCalendarStatus(ev,calStatusForExam(exam),'Make-up scheduled');
 return mk
}
function queueMissedExamEvent(exam){
 const sub=examSubject(exam),t=ensureTeacher(sub)?.name||'your teacher';
 queueEvent({type:'missedExam',title:`You missed ${exam.subject}`,text:`${t} noticed your empty seat during the ${exam.type.toLowerCase()}. ${S.age<10?'Your caregiver will probably hear about it too.':'What you say next matters.'}`,payload:{examId:exam.id},priority:4,expiresDays:3,choices:[{id:'honest',label:'Explain honestly'},{id:'sick',label:'Claim you were sick'},{id:'makeup',label:'Ask for a make-up'},{id:'ignore',label:'Ignore it'}]})
}
function takeExam(examId,cheat=false){
 const exam=S.exams.find(e=>e.id===examId)||S.exams.find(e=>e.subject===examId&&examIsOpen(e));
 if(!exam){toast('Assessment not found.');return}
 if(!examIsOpen(exam)){toast(exam.status==='Completed'?`Already completed • ${exam.score}%`:`This assessment is ${String(exam.status).toLowerCase()}.`);return}
 if(exam.dateISO>currentDate()){toast(`${exam.subject} is in ${daysBetween(currentDate(),exam.dateISO)} days.`);return}
 if(exam.dateISO<currentDate()||currentMinute()>exam.graceMinute){processCalendar();toast('The assessment window has closed.');return}
 const sd=schoolDayEvent();
 if(exam.minute<SCHOOL_DAY.end&&sd&&!isTerminal(sd.status)&&sd.status!=='Attending'){attendSchool(cheat?{cheatExamId:exam.id}:{examId:exam.id});return}
 if(currentMinute()<exam.minute){if(exam.minute-currentMinute()>240){toast(`It starts at ${timeLabel(exam.minute)}.`);return}advanceTime(exam.minute-currentMinute(),{silent:true})}
 performExam(exam,{cheat,lateMinutes:Math.max(0,currentMinute()-exam.minute)})
}
function nextExam(){return [...(S.exams||[])].filter(examIsOpen).sort((a,b)=>a.dateISO.localeCompare(b.dateISO)||a.minute-b.minute)[0]}

// ---------- School days ----------
function schoolDayEvent(dateISO=currentDate()){return S.calendar.find(e=>e.type==='schoolDay'&&e.dateISO===dateISO)}
function ensureSchoolDayObligation(dateISO=currentDate()){
 if(!needsFormalSchool()||!isSchoolDay(dateISO))return null;
 return schoolDayEvent(dateISO)||createCalendarEvent({id:`school-${dateISO}`,type:'schoolDay',title:`School • ${S.school.name}`,dateISO,startMinute:480,endMinute:900,graceMinute:660,payload:{school:S.school.name},source:'school'})
}
function schoolDayStatus(){
 if(!S.school)return 'Not enrolled';if(S.school.grade==='Kindergarten')return isSchoolDay()?'Kindergarten day':'Kindergarten closed';
 if(!isSchoolDay())return noSchoolReason();
 const ev=schoolDayEvent(),m=currentMinute();
 if(ev&&ev.status==='Attended')return ev.attendanceStatus==='Tardy'?'Attended (late)':'Attended';
 if(ev&&ev.status==='Excused')return 'Excused absence';if(ev&&ev.status==='Missed')return 'Absent';
 return m<SCHOOL_DAY.start?'Before school':m<=SCHOOL_DAY.tardyAfter?'School starting':m<=SCHOOL_DAY.cutoff?'Late — tardy if you go now':m<SCHOOL_DAY.end?'Attendance cutoff passed':'School finished'
}
function markSchoolAttendance(ev,{tardy=false,simulated=false}={}){
 const rec=ensureSchoolRecord();ev.attendanceStatus=tardy?'Tardy':'Present';setCalendarStatus(ev,'Attended',tardy?'Arrived late':'On time');rec.daysAttended++;
 if(tardy){rec.tardies++;S.school.attendance=clamp(S.school.attendance-.3)}else S.school.attendance=clamp(S.school.attendance+.05);
 if(simulated)for(const sub of [...S.school.subjects].sort(()=>Math.random()-.5).slice(0,2))sub.skill=clamp(sub.skill+.16);
 if(SIM.summary){SIM.summary.school.days++;SIM.summary.school.attended++;if(tardy)SIM.summary.school.tardies++}
}
function markSchoolAbsence(ev,{excused=false,reason='',simulated=false}={}){
 const rec=ensureSchoolRecord();ev.attendanceStatus=excused?'Excused absence':'Absent';setCalendarStatus(ev,excused?'Excused':'Missed',reason||(excused?'Excused':'Did not arrive by the attendance cutoff'));
 if(SIM.summary){SIM.summary.school.days++;SIM.summary.school[excused?'excused':'absences']++}
 if(excused){rec.excused++;S.school.attendance=clamp(S.school.attendance-.2);if(!simulated)log('Absence excused',`School records ${formatDate(ev.dateISO)} as an excused absence (${String(reason||'excused').toLowerCase()}).`);return}
 rec.absences++;S.school.attendance=clamp(S.school.attendance-1.2);if(S.age>=12)addRep('troublemaker',1);if(S.age>=10)S.school.behavior=clamp(S.school.behavior-1);
 const n=rec.absences;
 if(simulated){if(n%4===0)S.family.tension=clamp(S.family.tension+2);return}
 log('Marked absent',S.age<10?`You never made it to school by ${timeLabel(SCHOOL_DAY.cutoff)}. The school records an unexplained absence, and your family will be asked about it.`:`School started without you. By ${timeLabel(SCHOOL_DAY.cutoff)} your homeroom teacher marks you absent${n>1?` — the ${ordinal(n)} time this year`:''}.`);
 if(S.age<18)scheduleFollowUp('absenceNotice',{dateISO:ev.dateISO,count:n},ev.dateISO>=currentDate()?{dateISO:ev.dateISO,minute:1050}:{minute:Math.min(1439,currentMinute()+30)})
}
function schoolDayStory(tardy,examLines){
 const subs=S.school.subjects,s1=rand(subs)?.name||'class',s2=rand(subs)?.name||'class',t=ensureTeacher(rand(subs))?.name||'your teacher',friend=bestNonFamily(),fn=firstName(friend);
 const opening=tardy?rand([`You slip into class after the bell, and ${t} gives you a look before carrying on.`,`You arrive late and have to sign in at the front office first.`,`The hallway is already empty when you get there. You walk in mid-sentence.`]):rand([`The day opens with ${s1}.`,`You make it in a few minutes before the bell.`,`Morning announcements run long, as usual.`]);
 const middle=rand([`${s2} drags a little, but one explanation finally clicks.`,`There is a surprise question in ${s2}; you get it ${chance(55)?'right':'half right'}.`,`${t} goes off on a tangent that turns out to be the most interesting part of the day.`,`Group work in ${s2} is chaotic, but your group finishes.`]);
 const social=friend?rand([`At lunch, ${fn} saves you a seat.`,`${fn} spends lunch telling you about ${rand(['a strange dream','their weekend','a new game','a rumor about a teacher'])}.`,`You and ${fn} trade snacks at lunch.`]):rand(['Lunch is quiet.','You spend lunch people-watching.']);
 return [opening,...examLines,middle,social].filter(Boolean).join(' ')
}

// ---------- Homework ----------
const HW_OPEN=['Assigned','Late'];
function homeworkLabel(hw){
 if(!hw||hw.status==='None')return 'No homework';
 if(hw.status==='Assigned'){const d=daysBetween(currentDate(),hw.dueDate);return d<0?'Late':d===0?'Due today':d===1?'Due tomorrow':`Due in ${d} days`}
 if(hw.status==='Late'){const d=daysBetween(hw.dueDate,currentDate());return `Late • ${d} day${d===1?'':'s'}`}
 return hw.status
}
function archiveHomework(sub){const hw=sub.homework;if(hw&&hw.status&&hw.status!=='None'){sub.homeworkHistory=sub.homeworkHistory||[];sub.homeworkHistory.unshift({...hw,subject:sub.name});if(sub.homeworkHistory.length>8)sub.homeworkHistory.length=8}}
function generateHomework(force=false){
 if(!needsFormalSchool())return;let active=S.school.subjects.filter(s=>HW_OPEN.includes(s.homework?.status)).length;
 for(const sub of [...S.school.subjects].sort(()=>Math.random()-.5)){
  if(active>=3)break;const hw=sub.homework||{status:'None'};
  const free=hw.status==='None'||(!HW_OPEN.includes(hw.status)&&(hw.resolvedDate||'0000')<currentDate());
  if(!free)continue;if(force?chance(45):chance(28)){archiveHomework(sub);sub.homework={id:uid('hw'),status:'Assigned',progress:0,assignedDate:currentDate(),dueDate:nextSchoolDay(addDays(currentDate(),2+Math.floor(Math.random()*3)))};active++}
 }
}
function simulateHomework(sub){
 const hw=sub.homework,p=clamp(72+(S.family?.responsibility||0)*.15-Math.max(0,S.stress-40)*.2,35,96),r=Math.random()*100,sum=SIM.summary?.school,rec=ensureSchoolRecord();
 if(r<p){hw.status='Submitted';hw.progress=100;sub.score=clamp(sub.score+1);rec.submittedHomework++;if(sum)sum.hwOnTime++}
 else if(r<p+(100-p)*.6){hw.status='Submitted late';hw.progress=100;rec.lateHomework++;if(sum)sum.hwLate++}
 else{hw.status='Missing';sub.score=clamp(sub.score-3);ensureTeacher(sub).rel=clamp(sub.teacher.rel-3);rec.missingHomework++;if(sum)sum.hwMissing++}
 hw.resolvedDate=currentDate()
}
function processHomeworkDeadlines(){
 if(!needsFormalSchool())return;const rec=ensureSchoolRecord();
 for(const sub of S.school.subjects){
  const hw=sub.homework;if(!hw||!HW_OPEN.includes(hw.status)||!hw.dueDate)continue;
  if(hw.status==='Assigned'&&hw.dueDate<currentDate()){if(SIM.skipping){simulateHomework(sub);continue}hw.status='Late';rec.lateHomework++;sub.score=clamp(sub.score-1);log('Homework late',`${sub.name} homework was due ${formatDate(hw.dueDate)}. ${ensureTeacher(sub).name} will still take it for a few days, for reduced credit.`)}
  else if(hw.status==='Late'&&daysBetween(hw.dueDate,currentDate())>3){hw.status='Missing';hw.resolvedDate=currentDate();rec.missingHomework++;sub.score=clamp(sub.score-3);ensureTeacher(sub).rel=clamp(sub.teacher.rel-3);if(SIM.summary)SIM.summary.school.hwMissing++;if(!SIM.skipping){log('Homework missing',`${sub.name} homework is now recorded as missing.${rec.missingHomework===1?' One missed assignment is not a disaster, but it is noted.':''}`);escalateHomework()}}
 }
}
function escalateHomework(){
 const rec=ensureSchoolRecord(),n=rec.missingHomework;if(S.age>=18)return;
 if(n===3)scheduleFollowUp('homeworkNote',{count:n},{minute:Math.max(currentMinute()+60,1050)});
 if(n>=6&&!rec.meetingHeld){rec.meetingHeld=true;scheduleFollowUp('parentTeacherMeeting',{count:n},{days:1,minute:960})}
}
function doHomework(name){
 const sub=S.school?.subjects?.find(x=>x.name===name),hw=sub?.homework;
 if(!sub||!hw||!HW_OPEN.includes(hw.status)){toast('There is no active homework for that subject.');return}
 const nb=findUsable('notebook'),gain=Math.min(100-(hw.progress||0),nb?60:50);if(nb){const u=openOne(nb);u.remaining=clamp(u.remaining-1.25);if(u.remaining<=0.5)removeItem(u.id)}hw.progress=(hw.progress||0)+gain;advanceTime(60);S.energy=clamp(S.energy-5);
 const t=ensureTeacher(sub),rec=ensureSchoolRecord();
 if(hw.progress>=100){
  const late=hw.status==='Late';hw.status=late?'Submitted late':'Submitted';hw.submittedDate=currentDate();hw.resolvedDate=currentDate();
  if(late){sub.score=clamp(sub.score+.5);rec.lateHomework=rec.lateHomework;feedback(`${sub.name} homework submitted late`,rand([`${t.name} accepts it with a short note about deadlines. Partial credit.`,`It is late, but it is done. ${t.name} takes it without much comment.`]),60)}
  else{sub.score=clamp(sub.score+2);t.rel=clamp(t.rel+2);rec.submittedHomework++;feedback(`${sub.name} homework submitted`,rand([`You finish the last question and put it in your bag. One less thing to worry about.`,`It took longer than expected, but the work is solid.`,`Done before the deadline — ${t.name} will notice.`]),60)}
 }else feedback(`${sub.name} homework`,`Progress ${hw.progress}% • ${homeworkLabel(hw)}`,60)
}

// ---------- Clubs as commitments ----------
function clubById(id){return S.school?.clubs?.find(x=>x.id===id)||null}
function ensureClub(c){return Object.assign(c,Object.assign({attended:0,missedSessions:0,excusedSessions:0,consecutiveMissed:0,leaderRel:60,warnings:0,recent:[],position:'New member',leader:teacherName(c.name)},c))}
function nextClubDate(fromISO){let d=addDays(fromISO,7);for(let i=0;i<20&&!isSchoolDay(d);i++)d=addDays(d,7);return isSchoolDay(d)?d:nextSchoolDay(d)}
function scheduleClubSession(c,dateISO){c.nextSessionDate=dateISO;return createCalendarEvent({id:`club-${c.id}-${dateISO}`,type:'clubSession',title:`${c.name} session`,dateISO,startMinute:930,endMinute:1020,graceMinute:960,payload:{clubId:c.id},source:'club',participants:c.members||[]})}
function clubSessionEvent(c){return S.calendar.filter(e=>e.type==='clubSession'&&e.payload?.clubId===c.id&&!isTerminal(e.status)).sort((a,b)=>a.dateISO.localeCompare(b.dateISO))[0]||null}
function clubAttendanceRate(c){const t=(c.attended||0)+(c.missedSessions||0);return t?Math.round(100*(c.attended||0)/t):100}
function activateClub(o){
 o.status='Joined';const club=ensureClub({id:uid('club'),name:o.name,status:'Active',joinedDate:currentDate(),skill:12,sessions:0,members:[rand(D.names),rand(D.names)]});
 S.school.clubs.push(club);scheduleClubSession(club,nextSchoolDay(addDays(currentDate(),2)));
 log('Joined '+club.name,`It is a real commitment now: sessions every week at ${timeLabel(930)}, led by ${club.leader}. Showing up matters.`,true)
}
function attendClubSession(clubId){
 const c=clubById(clubId);if(!c||c.status!=='Active')return;ensureClub(c);const ev=clubSessionEvent(c);
 if(!ev){toast('No session is scheduled.');return}
 if(ev.dateISO>currentDate()){toast(`Next session ${formatDate(ev.dateISO)} at ${timeLabel(ev.startMinute)}.`);return}
 if(currentMinute()>ev.graceMinute){processCalendar();toast('The session already started without you.');return}
 const sd=schoolDayEvent();if(sd&&sd.status==='Scheduled'||sd&&sd.status==='Due'){toast('School comes first — club starts after classes.');return}
 if(currentMinute()<ev.startMinute){if(ev.startMinute-currentMinute()>180){toast(`The session starts at ${timeLabel(ev.startMinute)}.`);return}advanceTime(ev.startMinute-currentMinute(),{silent:true})}
 if(isTerminal(ev.status))return;setCalendarStatus(ev,'Attending','Arrived');const late=Math.max(0,currentMinute()-ev.startMinute);
 advanceTime(Math.max(30,ev.endMinute-currentMinute()),{silent:true});clubSessionAttended(ev,{late})
}
function clubSessionStory(c,late){
 const m=rand(c.members||[])||'another member',L=c.leader;
 const lines={'Art Club':[`${L} sets up a still life and challenges everyone to draw it in ten minutes. Yours is lopsided but lively.`,`You and ${m} share a jar of paint water and accidentally invent a new color.`],'Chess Club':[`${m} beats you in a game you thought you were winning. You replay the final moves twice.`,`${L} shows a trap that you immediately want to try on someone.`],'Football':[`Drills, then a scrimmage. You make one good pass that ${L} actually notices.`,`It rains halfway through practice; nobody stops.`],'Drama':[`You run lines with ${m} until the scene finally lands.`,`An improv game goes wildly off the rails, in the best way.`]};
 const pool=lines[c.name]||[`${L} runs a focused session and you pick up something new.`,`You spend part of the session working alongside ${m}, which turns out to be fun.`,`It is a slow session, but you get real practice in.`];
 return `${late>5?'You arrive a few minutes late. ':''}${rand(pool)}`
}
function clubSessionAttended(ev,{simulated=false,late=0}={}){
 const c=clubById(ev.payload?.clubId);if(!c){setCalendarStatus(ev,'Cancelled','Club missing');return}ensureClub(c);
 const dim=c.skill>80?.5:c.skill>60?.75:1;c.sessions=(c.sessions||0)+1;c.attended++;c.consecutiveMissed=0;c.recent=[...c.recent,'A'].slice(-8);c.skill=clamp(c.skill+(late>15?3:5)*dim);c.leaderRel=clamp(c.leaderRel+1);

 setCalendarStatus(ev,'Attended',late?'Arrived late':'Attended');
 if(SIM.summary){const s=SIM.summary.clubs[c.id]=SIM.summary.clubs[c.id]||{name:c.name,attended:0,missed:0,excused:0};s.attended++}
 addRep(clubInfo(c.name).rep,.25);addRep('club',.3);if(!simulated&&chance(10))meetNewPeople(c.name);checkClubPromotion(c);if(chance(8))maybeOfferElection(c);
 if(!simulated){S.needs.social=clamp(S.needs.social+10);S.needs.fun=clamp(S.needs.fun+8);S.energy=clamp(S.energy-6);log(`${c.name} session`,clubSessionStory(c,late));toast(`${c.name} • skill ${Math.round(c.skill)}%`)}
 if(c.status==='Active')scheduleClubSession(c,nextClubDate(ev.dateISO))
}
function resolveClubSession(ev,status,reason,{simulated=false}={}){
 const c=clubById(ev.payload?.clubId);if(!c){setCalendarStatus(ev,'Cancelled','Club missing');return}ensureClub(c);
 if(status==='Excused'){c.excusedSessions++;c.recent=[...c.recent,'E'].slice(-8);if(c.recent.filter(x=>x==='E').length>=4)c.leaderRel=clamp(c.leaderRel-2)}
 else{c.missedSessions++;c.consecutiveMissed++;c.recent=[...c.recent,'M'].slice(-8);c.leaderRel=clamp(c.leaderRel-(reason==='Skipped'?2:4))}
 setCalendarStatus(ev,status,reason);
 if(SIM.summary){const s=SIM.summary.clubs[c.id]=SIM.summary.clubs[c.id]||{name:c.name,attended:0,missed:0,excused:0};s[status==='Excused'?'excused':'missed']++}
 if(!simulated)log(status==='Excused'?`${c.name}: excused`:`${c.name}: missed`,status==='Excused'?`You let ${c.leader} know ahead of time. "Thanks for telling me," they say.`:reason==='Skipped'?`You decide not to go to ${c.name} today.`:`${c.name} met without you. Nobody heard from you.`);
 if(status==='Missed')checkClubDiscipline(c,{simulated});
 if(c.status==='Active')scheduleClubSession(c,nextClubDate(ev.dateISO));
 if(!simulated&&status==='Missed'&&c.status==='Active'&&chance(45))scheduleFollowUp('teammateComment',{clubId:c.id},{days:1,minute:720})
}
function checkClubDiscipline(c,{simulated=false}={}){
 const missedRecent=c.recent.filter(x=>x==='M').length;
 if(c.consecutiveMissed>=4||(c.warnings>=2&&missedRecent>=4)||(c.warnings>=1&&missedRecent>=5)){
  c.status='Removed';c.removedDate=currentDate();for(const e of S.calendar)if(e.type==='clubSession'&&e.payload?.clubId===c.id&&!isTerminal(e.status))setCalendarStatus(e,'Cancelled','Removed from club');
  if(SIM.summary)SIM.summary.notable.push(`Removed from ${c.name} after repeated absences`);
  log('Removed from '+c.name,`After ${c.consecutiveMissed>=4?`${c.consecutiveMissed} missed sessions in a row`:'repeated absences despite a warning'}, ${c.leader} takes you off the roster. You could try joining again next term.`,true);return
 }
 if(missedRecent>=3&&c.warnings===0){
  c.warnings=1;if(simulated){c.leaderRel=clamp(c.leaderRel-3);if(SIM.summary)SIM.summary.notable.push(`${c.leader} warned you about missing ${c.name}`);return}
  queueEvent({type:'clubWarning',title:`${c.leader} wants a word`,text:`"You've missed ${missedRecent} of the last ${c.recent.length} ${c.name} sessions. The others are noticing. Can I count on you?"`,payload:{clubId:c.id},priority:3,expiresDays:2,choices:[{id:'commit',label:'Apologize and commit'},{id:'explain',label:"Explain what's going on"},{id:'shrug',label:'Shrug it off'}]})
 }
}
function skipClubSession(clubId){const c=clubById(clubId),ev=c&&clubSessionEvent(c);if(!ev||ev.dateISO!==currentDate()||currentMinute()<ev.startMinute-120){toast('There is no session to skip right now.');return}resolveClubSession(ev,'Missed','Skipped')}
function excuseClubSession(clubId){const c=clubById(clubId),ev=c&&clubSessionEvent(c);if(!ev){toast('No session scheduled.');return}if(ev.dateISO===currentDate()&&currentMinute()>=ev.startMinute){toast('It already started — telling them now is not "beforehand".');return}resolveClubSession(ev,'Excused','Told the leader beforehand')}

// ---------- Contests require attendance ----------
function contestById(id){return S.school?.contests?.find(x=>x.id===id)||null}
function contestSlot(dateISO){return isSchoolDay(dateISO)?{startMinute:780,endMinute:900,graceMinute:810,location:'School hall (during school)'}:{startMinute:600,endMinute:780,graceMinute:690,location:'School hall'}}
function contestCalendar(c){return createCalendarEvent(Object.assign({id:`contest-${c.id}`,type:'schoolEvent',title:c.name,dateISO:c.eventDate,payload:{contestId:c.id},source:'school'},contestSlot(c.eventDate)))}
function registerContest(c){c.status='Registered';const ev=contestCalendar(c);log('Registered • '+c.name,`The event is ${formatDate(c.eventDate)} at ${timeLabel(ev.startMinute)}${isSchoolDay(c.eventDate)?' in the school hall, during the school day — you will miss class to go':''}. You need to actually show up — preparation now matters.`)}
function contestEvent(c){return S.calendar.find(e=>e.type==='schoolEvent'&&e.payload?.contestId===c.id&&!isTerminal(e.status))||null}
function attendContest(contestId){
 const c=contestById(contestId);if(!c||c.status!=='Registered')return;const ev=contestEvent(c)||contestCalendar(c);
 if(ev.dateISO===currentDate()&&isSchoolDay(ev.dateISO)&&ev.startMinute<SCHOOL_DAY.end){const sd=schoolDayEvent();if(sd&&isTerminal(sd.status)&&sd.status!=='Attended'){toast('You are absent from school today, so you cannot take part.');return}if(sd&&sd.status!=='Attending'&&sd.status!=='Attended'){if(currentMinute()>SCHOOL_DAY.cutoff){toast('Too late to check in at school.');return}checkInToSchool()}}
 if(ev.dateISO>currentDate()){toast(`${c.name} is on ${formatDate(ev.dateISO)}.`);return}
 if(currentMinute()>ev.graceMinute){processCalendar();toast('Check-in has closed.');return}
 if(currentMinute()<ev.startMinute){if(ev.startMinute-currentMinute()>180){toast(`Check-in opens at ${timeLabel(ev.startMinute)}.`);return}advanceTime(ev.startMinute-currentMinute(),{silent:true})}
 if(S.age<13&&!caregiverApproval(30)){log('No ride',`${primaryCaregiver()} cannot get you to ${c.name} in time.`);resolveContestAttendance(ev,'Withdrew');return}
 setCalendarStatus(ev,'Attending','Checked in');const late=Math.max(0,currentMinute()-ev.startMinute);advanceTime(Math.max(45,ev.endMinute-currentMinute()),{silent:true});resolveContest(c,{late});setCalendarStatus(ev,'Attended',late?'Arrived late':'Attended')
}
function resolveContest(c,{late=0,simulated=false}={}){
 if(c.status==='Completed')return;
 const avg=schoolAverage(),club=Math.max(0,...(S.school?.clubs||[]).filter(x=>x.status==='Active').map(x=>x.skill||0)),score=clamp(avg*.38+c.prep*.35+club*.1+S.luck*.12+(Math.random()*18-9)-Math.min(10,late/4));
 c.status='Completed';c.result=score>=82?'Winner / top result':score>=68?'Strong result / finalist':'Participated';if(score>=68)addRep(/art|music|drama|show/i.test(c.name)?'creative':/sport|race|run/i.test(c.name)?'athletic':'academic',score>=82?6:3);S.happiness=clamp(S.happiness+(score>=82?10:score>=68?6:2));
 if(SIM.summary)SIM.summary.contests.push({name:c.name,result:c.result});
 if(simulated)return;
 const story=score>=82?rand([`When they read the results, your name comes first. For a second you think you misheard.`,`Your entry draws a small crowd. By the end of the day, you have a certificate and a story.`]):score>=68?rand([`You make the final round and hold your own against people who clearly practiced for weeks.`,`A judge stops to ask about your work. You do not win, but you place well.`]):rand([`It is not your day — others were more prepared — but you saw what the top entries looked like.`,`You get through it. The experience is worth more than the ribbon you do not get.`]);
 log(score>=82?'🏆 '+c.name:score>=68?'⭐ '+c.name:'🎖️ '+c.name,`${late>5?'You arrive late and rush to set up. ':''}${story} (${c.result})`,score>=82)
}
function resolveContestAttendance(ev,status,{simulated=false}={}){
 const c=contestById(ev.payload?.contestId);setCalendarStatus(ev,status,status==='No-show'?'Did not check in':'Withdrew');if(!c)return;
 c.status=status;c.result=status==='No-show'?'Did not attend':'Withdrew';
 if(SIM.summary)SIM.summary.contests.push({name:c.name,result:c.result});
 if(status==='No-show'&&sessionEvent()){S.stress=clamp(S.stress+1);if(!simulated)log(`Missed • ${c.name}`,`You stay in class while ${c.name} goes on in the hall without you. The organizers cross your name off.`);return}
 if(status==='No-show'){S.social.reputation=clamp(S.social.reputation-2);S.stress=clamp(S.stress+3);if(S.age<13)S.family.tension=clamp(S.family.tension+2);if(!simulated)log(`No-show • ${c.name}`,`Your name is called at check-in and nobody answers. The organizers move on, and ${S.age<13?'your caregiver, who signed the form, is not thrilled':'a teacher mentions it the next day'}.`)}
 else if(!simulated)log(`Withdrew • ${c.name}`,'You could not take part this time.')
}

// ---------- Pending decisions lifecycle ----------
const PENDING_RULES={
 kindergarten:{minAge:3,maxAge:null,expireStatus:'Superseded',expireReason:'Primary school age reached',autoDays:14},
 clubApproval:{maxDays:10,needsSchool:true},contestApproval:{maxDays:10,needsSchool:true},
 purchaseConsideration:{maxDays:21},jobApplication:{maxDays:21},
 conditionalPurchase:{maxDays:180,expireStatus:'Expired',expireReason:'The offer quietly lapsed'}
};
function sixthBirthday(){const b=parseISO(S.dob);b.setUTCFullYear(b.getUTCFullYear()+6);return isoDate(b)}
function normalizePending(x){
 const rule=PENDING_RULES[x.type]||{};
 Object.assign(x,Object.assign({id:uid('pending'),createdDate:currentDate(),status:'Pending',detail:'',resolved:false,resolveDate:null,expiresDate:null,minAge:rule.minAge??null,maxAge:rule.maxAge??null,resolvedDate:null,resolutionReason:null,supersededBy:null},x));
 if(x.type==='purchaseConsideration'&&x.status==='Conditional'&&!x.resolveDate){x.type='conditionalPurchase';x.expiresDate=addDays(currentDate(),180)}
 if(x.type==='kindergarten'){x.maxAge=null;x.expiresDate=null}
 if(!x.expiresDate&&!x.resolved){if(x.type==='kindergarten'){}else if(rule.maxDays)x.expiresDate=addDays(x.createdDate||currentDate(),rule.maxDays)}
 if(x.type==='kindergarten'&&!x.resolved&&!x.resolveDate&&!x.autoDecideDate)x.autoDecideDate=addDays(currentDate(),x.createdDate&&daysBetween(x.createdDate,currentDate())>14?3:rule.autoDays||14);
 return x
}
function createPending(p){const x=normalizePending(Object.assign({createdDate:currentDate()},p));S.pendingDecisions.push(x);return x}
function normalizeRequests(){S.pendingDecisions=(S.pendingDecisions||[]).map(x=>normalizePending(x));S.giftRequests=(S.giftRequests||[]).map(x=>Object.assign({id:uid('giftreq'),begging:1,chancePenalty:0,resolved:false,status:`Waiting for ${x.occasion||'occasion'}`},x))}
function resolvePendingDecision(p,status,reason,{title=null,text=null,important=false,supersededBy=null}={}){
 if(!p)return null;if(p.resolved&&p.resolvedDate)return p;p.status=status;p.resolved=true;p.resolvedDate=currentDate();p.resolutionReason=reason;if(supersededBy)p.supersededBy=supersededBy;resolveNotificationsFor(p.id);if(text)log(title||p.title,text,important);return p
}
function pendingLifecycleCheck(p){
 if(p.resolved)return;const rule=PENDING_RULES[p.type]||{};
 if(p.type==='kindergarten'){if(needsFormalSchool()||S.age>=7){const k=S.development.kindergarten;if(!k.decision)k.decision='Not needed — primary school began';resolvePendingDecision(p,'Superseded','Primary school age reached',{title:'Kindergarten question closed',text:`The kindergarten decision was never settled before primary school began, so it is closed. You started ${S.school?.grade||'primary school'} instead.`,supersededBy:S.school?.grade||'Primary school'})}return}
 if(p.maxAge!=null&&S.age>p.maxAge){
  if(p.type==='kindergarten'){const k=S.development.kindergarten;if(!k.decision)k.decision='Not needed — primary school began';resolvePendingDecision(p,'Superseded','Primary school age reached',{title:'Kindergarten question closed',text:`The kindergarten decision was never settled before primary school began, so it is closed. You started ${S.school?.grade||'primary school'} instead.`,supersededBy:S.school?.grade||'Primary school'});return}
  resolvePendingDecision(p,rule.expireStatus||'Expired',rule.expireReason||'No longer relevant at this age',{text:`${p.title} is no longer relevant at your age.`});return
 }
 if(rule.needsSchool&&!S.school){resolvePendingDecision(p,'Cancelled','No longer enrolled');return}
 if(p.expiresDate&&p.expiresDate<currentDate()&&!(p.resolveDate&&p.resolveDate>=currentDate()))resolvePendingDecision(p,rule.expireStatus||'Expired',rule.expireReason||'Expired',{text:`${p.title}: ${rule.expireReason||'this request expired without a final answer'}.`})
}
function processPendingDecisions(){
 for(const p of S.pendingDecisions){
  if(p.resolved)continue;normalizePending(p);pendingLifecycleCheck(p);if(p.resolved)continue;
  if(p.type==='kindergarten'&&!p.resolveDate&&p.autoDecideDate&&p.autoDecideDate<=currentDate()){p.status='Family discussing';p.resolveDate=addDays(currentDate(),2);p.detail=`You never gave a clear answer, so your caregivers are deciding on their own by ${formatDate(p.resolveDate)}.`;if(!SIM.skipping)log('Family discussing kindergarten','A three-year-old cannot be asked forever. Your caregivers start weighing schedules, money and childcare without waiting for your answer.');continue}
  if(!p.resolveDate||p.resolveDate>currentDate())continue;
  if(p.type==='purchaseConsideration')resolvePurchaseDecision(p);else if(p.type==='jobApplication')resolveJobDecision(p);else if(p.type==='kindergarten')resolveKindergartenDecision(p);else if(p.type==='clubApproval')resolveClubApproval(p);else if(p.type==='contestApproval')resolveContestApproval(p);else resolvePendingDecision(p,'Resolved','Reached decision date',{title:'Decision resolved',text:p.title});
  if(p.resolved&&!p.resolvedDate){p.resolvedDate=currentDate();p.resolutionReason=p.resolutionReason||p.status;resolveNotificationsFor(p.id)}
 }
}
function resolveKindergartenDecision(p){
 if(S.age>5){pendingLifecycleCheck(p);return}
 const pref=p.payload?.preference;const r=familyRules(),careNeed=(S.home==='Busy but loving'||['Struggling','Modest'].includes(S.wealth))?15:0,score=(pref===true?r.respect*.35:pref===false?-r.respect*.18:0)+careNeed+(55-r.strictness)*.18+50;
 const enrolled=score>=50||(pref===false&&r.strictness>75);S.development.kindergarten.enrolled=enrolled;S.development.kindergarten.preference=pref??null;S.development.kindergarten.decision=enrolled?'Enrolled':'Alternative care / home';
 resolvePendingDecision(p,enrolled?'Enrolled':'Alternative care',pref==null?'Family decided without a preference':'Family decided',{title:'Kindergarten decision',important:true,text:enrolled?`Your caregivers decide you will attend.${pref==null?' You never really answered, so they went with what worked for the family.':' Your preference mattered, but schedules, money and parenting style mattered too.'}`:'Your family chooses home, relative care or another arrangement for now.'});
 S.school=buildSchool(S.age,S.school)
}
function setKindergartenPreference(pref){
 if(S.age>5){toast('Primary school has already begun.');return}
 let p=S.pendingDecisions.find(x=>!x.resolved&&x.type==='kindergarten');
 if(!p){if(S.development.kindergarten.decision){toast('Your family already decided.');return}p=createPending({type:'kindergarten',title:'Kindergarten decision',status:'Waiting for your preference',payload:{preference:null},detail:'Your family is discussing early education.'})}
 if(p.status!=='Waiting for your preference'){toast('Your caregivers are already deciding.');return}
 p.payload.preference=!!pref;p.status='Family discussing';p.resolveDate=addDays(currentDate(),2);p.detail=`Your caregivers will decide by ${formatDate(p.resolveDate)}.`;log('Your kindergarten preference',pref?'You say you want to go.':'You say you would rather not go.');toast('Your caregivers will decide in 2 days')
}

// ---------- Events: response windows & expiry ----------
const INVITE_TYPES=['friendInvite','party','birthdayInvite','invitation'];
function defaultEventExpiry(e){
 const m=currentMinute();if(e.expiresDays)return {dateISO:addDays(currentDate(),e.expiresDays),minute:1260};
 if(INVITE_TYPES.includes(e.type)){if(m<1020)return {dateISO:currentDate(),minute:1080};return {dateISO:addDays(currentDate(),1),minute:720}}
 return {dateISO:addDays(currentDate(),1),minute:1260}
}
function eventExpired(e){return !!e?.expiresAt&&nowStamp()>stampOf(e.expiresAt)}
function queueEvent(ev){
 ensureLifecycleContainers();
 const e=Object.assign({id:uid('event'),dateISO:currentDate(),minute:currentMinute(),status:'Open',participants:[],choices:[],priority:3},ev);if(!e.expiresAt)e.expiresAt=defaultEventExpiry(e);
 S.events.unshift(e);
 if(S.events.length>30){const open=S.events.filter(x=>x.status==='Open'),closed=S.events.filter(x=>x.status!=='Open');S.archive.events.unshift(...closed.slice(Math.max(0,30-open.length)));if(S.archive.events.length>120)S.archive.events.length=120;S.events=[...open,...closed.slice(0,Math.max(0,30-open.length))]}
 if(!SIM.skipping)offerContext({sourceType:'event',sourceId:e.id,priority:e.priority,title:e.title,text:e.text,expiresAt:e.expiresAt});
 return e
}
function expireEvent(e){
 if(!e||e.status!=='Open')return;e.status='Expired';e.resolvedAt={dateISO:currentDate(),minute:currentMinute()};resolveNotificationsFor(e.id,'Expired');
 if(SIM.skipping){if(e.type==='missedExam'){const exam=S.exams.find(x=>x.id===e.payload?.examId);const t=ensureTeacher(examSubject(exam));if(t)t.rel=clamp(t.rel-2)}return}
 const p=personById(e.participants?.[0]);
 if(INVITE_TYPES.includes(e.type)){if(p){p.rel=clamp(p.rel-1);rememberPerson(p,'You never answered their invitation.')}log('Invitation expired',p?`${firstName(p)} stopped waiting for an answer and made other plans.`:'Nobody heard back from you, so the plan moved on without you.')}
 else if(e.type==='missedExam'){const exam=S.exams.find(x=>x.id===e.payload?.examId),t=ensureTeacher(examSubject(exam));if(t)t.rel=clamp(t.rel-3);log('Silence about the missed assessment',`${t?.name||'Your teacher'} waited for you to say something. You never did, and the zero stays.`);if(S.age<18&&chance(55))scheduleFollowUp('missedExamParent',{examId:e.payload?.examId},{minute:Math.min(1439,currentMinute()+120)})}
 else if(e.type==='birthdayParty'){S.family.closeness=clamp(S.family.closeness+1);log('A quiet birthday','Nobody heard a plan from you, so your family does something small and simple instead.')}
 else if(['absenceTalk','examTalk','homeworkTalk','ptMeeting','parentSchool','parentGrades','cheatTalk'].includes(e.type)){S.family.tension=clamp(S.family.tension+2);log('The conversation moved on','You avoided the talk. It did not go away — it just got a little colder.')}
 else if(e.type==='clubWarning'){const c=clubById(e.payload?.clubId);if(c){c.leaderRel=clamp(c.leaderRel-3);c.warnings=Math.max(c.warnings,2)}log('No reply',`${c?.leader||'The club leader'} takes your silence as an answer.`)}
 else log('The moment passed',`${e.title} — you did not respond in time.`)
}
function expireEvents(){for(const e of S.events||[])if(e.status==='Open'){if(!e.expiresAt)e.expiresAt={dateISO:addDays(e.dateISO||currentDate(),1),minute:1260};if(eventExpired(e))expireEvent(e)}}

// ---------- Delayed consequences (follow-ups) ----------
function scheduleFollowUp(type,payload={},{dateISO=null,days=0,minute=null}={}){S.followUps=S.followUps||[];const d=dateISO||addDays(currentDate(),days);S.followUps.push({id:uid('fu'),type,payload,dateISO:d,minute:minute??Math.min(1439,currentMinute()+60),status:'Scheduled',createdDate:currentDate()})}
function processFollowUps(){
 const now=nowStamp();
 for(const f of S.followUps||[]){if(f.status!=='Scheduled'||now<stamp(f.dateISO,f.minute))continue;f.status='Triggered';f.triggeredDate=currentDate();try{runFollowUp(f)}catch(err){console.error('Follow-up failed',f,err)}}
 S.followUps=(S.followUps||[]).filter(f=>f.status==='Scheduled'||f.dateISO>=addDays(currentDate(),-14))
}
function caregiverPerson(){return S.people.find(p=>p.role==='parent')||S.people.find(p=>['grandparent','aunt','uncle','older sibling'].includes(p.role))||null}
function runFollowUp(f){
 if(worldFollowUp(f))return;
 const cg=caregiverPerson(),name=cg?firstName(cg):'Your caregiver',quiet=SIM.skipping||S.age>=18;
 if(f.type==='absenceNotice'){const n=f.payload.count||1;if(quiet){if(S.age<18)S.family.tension=clamp(S.family.tension+(n>=3?3:1));return}if(n<=1){S.family.tension=clamp(S.family.tension+1);log('Absence notice',`The school sends home a routine note about ${formatDate(f.payload.dateISO)}. ${name} frowns at it, but lets it go — this time.`);return}queueEvent({type:'absenceTalk',title:`${name} heard from school`,text:n>=5?`This is your ${ordinal(n)} unexplained absence this year. ${name} is not asking casually anymore.`:`The school called about your absence on ${formatDate(f.payload.dateISO)}. ${name} wants to know what happened.`,payload:{count:n},participants:cg?[cg.id]:[],priority:4,expiresDays:1,choices:[{id:'apologize',label:'Apologize'},{id:'lie',label:'Make up an excuse'},{id:'argue',label:'Argue'},{id:'explain',label:'Explain what really happened'}]});return}
 if(f.type==='missedExamParent'||f.type==='cheatingParent'){if(quiet){S.family.tension=clamp(S.family.tension+2);return}const exam=S.exams.find(x=>x.id===f.payload.examId);queueEvent({type:f.type==='cheatingParent'?'cheatTalk':'examTalk',title:f.type==='cheatingParent'?`${name} got a note from school`:`${name} found out about ${exam?.subject||'the assessment'}`,text:f.type==='cheatingParent'?'The note says you were caught cheating. The kitchen goes very quiet.':`A message from school says you missed the ${exam?.subject||''} ${String(exam?.type||'assessment').toLowerCase()}.`,participants:cg?[cg.id]:[],priority:4,expiresDays:1,choices:[{id:'apologize',label:'Apologize'},{id:'lie',label:'Make up an excuse'},{id:'argue',label:'Argue'},{id:'explain',label:'Explain what really happened'}]});return}
 if(f.type==='npcAnswer'){const plan=S.plans?.find(x=>x.id===f.payload.planId),p=plan&&personById(plan.personId);if(!plan||plan.status!=='Maybe'||plan.playerMaybe)return;const yes=chance(55+(p?(p.rel-55)*.5:0));const th=thread('plan',plan.id,plan.title);if(yes){plan.status='Accepted';schedulePlanCalendar(plan);threadStep(th,'Accepted','They said yes after all');if(!SIM.skipping){log(`${firstName(p)} is in`,`"Okay, I can come!" ${plan.title} is on.`);notify('Plans confirmed',plan.title,{sourceType:'plan',sourceId:plan.id,tab:'people'})}}else{plan.status='Declined';threadStep(th,'Declined','They could not make it',{resolve:true});recordOutcome('Plan',plan.title,'Declined','They checked and could not make it.');if(!SIM.skipping)log(`${firstName(p)} can't`,`"Sorry, I checked — I can't make it."`)}return}
 if(f.type==='planNoShowTalk'){const plan=S.plans?.find(x=>x.id===f.payload.planId),p=plan&&personById(plan.personId);if(!p||SIM.skipping)return;queueEvent({type:'planNoShowTalk',title:`${firstName(p)} is upset`,text:`"I waited for you yesterday. You said you'd come." They want to know what happened.`,participants:[p.id],payload:{planId:plan.id},priority:3,expiresDays:2,choices:[{id:'explain',label:'Explain what happened'},{id:'apologize',label:'Apologize sincerely'},{id:'brush',label:'Brush it off'}]});return}
 if(f.type==='friendAsks'){const p=personById(f.payload.personId);if(!p||SIM.skipping)return;queueEvent({type:'friendAsks',title:`${firstName(p)} asks about ${f.payload.club}`,text:`"So? How did the ${f.payload.club} thing go?" They remembered.`,participants:[p.id],payload:f.payload,priority:2,expiresDays:1,choices:[{id:'share',label:'Tell them honestly'},{id:'brush',label:'Change the subject'}]});return}
 if(f.type==='waitlist'){const t=S.school?.tryouts?.find(x=>x.id===f.payload.tryoutId);if(!t||t.result!=='Waitlisted')return;const th=thread('tryout',`tryout-${t.club}`,`Making the ${t.club}`);if(chance(50)){t.result='Selected from waitlist';const o=S.school.activityOffers.find(x=>x.id===f.payload.offerId)||{name:t.club};activateClub(o);const c=S.school.clubs.find(x=>x.name===t.club&&x.status==='Active');if(c)c.leader=t.coach;threadStep(th,'Made it (waitlist)','A spot opened',{resolve:true});recordOutcome('Club tryout',t.club,'Selected from waitlist','Someone dropped out and you were next.');if(!SIM.skipping)log(`${t.club}: a spot opened!`,`${t.coach} calls: someone dropped out, and you were first on the list.`,true)}else{t.result='Not selected';t.nextDate=nextSchoolDay(addDays(currentDate(),21));threadStep(th,'No spot opened','Try again next time');if(!SIM.skipping)log(`${t.club}: no spot this time`,`The waitlist did not move. ${t.coach} says to try again on ${formatDate(t.nextDate)}.`)}return}
 if(f.type==='electionResult'){const el=S.elections?.find(x=>x.id===f.payload.electionId);if(el&&el.status==='Campaign')decideElection(el);return}
 if(f.type==='promiseCheck'){const el=S.elections?.find(x=>x.id===f.payload.electionId);if(!el||SIM.skipping){addRep('leadership',-2);return}queueEvent({type:'promiseCheck',title:`People remember your promise`,text:`During the campaign you promised ${el.promise}. A classmate asks how it is going.`,payload:{electionId:el.id},priority:3,expiresDays:3,choices:[{id:'work',label:'Push hard to deliver it'},{id:'honest',label:'Admit it is harder than you thought'},{id:'dodge',label:'Dodge the question'}]});return}
 if(f.type==='npcInitiative'){if(!SIM.skipping&&currentMinute()>=420&&currentMinute()<1290&&!atSchool())npcInitiative();return}
 if(f.type==='npcSchool'){if(atSchool())npcSchoolInitiative();return}
 if(f.type==='teammateComment'){const c=clubById(f.payload.clubId);if(!c||c.status!=='Active'||quiet)return;const m=rand(c.members||[])||'A teammate';log(`${m} noticed`,rand([`"Where were you yesterday? ${c.leader} asked about you."`,`${m} mentions ${c.name} felt short-handed without you.`,`"We could have used you at ${c.name}," ${m} says — half joking.`]));return}
 if(f.type==='homeworkNote'){if(quiet){S.family.tension=clamp(S.family.tension+2);return}queueEvent({type:'homeworkTalk',title:`A note about missing homework`,text:`Three assignments are now recorded as missing. ${name} has the teacher's email open on their phone.`,participants:cg?[cg.id]:[],priority:3,expiresDays:1,choices:[{id:'apologize',label:'Apologize and catch up'},{id:'lie',label:'Say it was a mistake'},{id:'argue',label:'Argue'},{id:'explain',label:'Explain what is going on'}]});return}
 if(f.type==='parentTeacherMeeting'){if(quiet){S.family.tension=clamp(S.family.tension+5);if(SIM.summary)SIM.summary.notable.push('Parent–teacher meeting about missing homework');return}queueEvent({type:'ptMeeting',title:'Parent–teacher meeting',text:`Six missing assignments. ${name} and your teachers sit across the table from you. Everyone is waiting for you to say something.`,participants:cg?[cg.id]:[],priority:5,expiresDays:1,choices:[{id:'plan',label:'Commit to a homework plan'},{id:'promise',label:'Promise to do better'},{id:'blame',label:'Blame the teachers'},{id:'silent',label:'Stay quiet'}]});return}
}

// ---------- Lifecycle event choices ----------
function handleLifecycleEventChoice(e,id,label){
 const w=worldEventChoice(e,id);if(w)return w;
 if(e.type==='newPhone')return handlePhoneChoice(e,id);
 if(e.type==='invitation'&&e.payload?.planId)return handlePlanInvite(e,id);
 if(e.type==='electionLost')return handleElectionLost(e,id);
 if(e.type==='electionOffer')return handleElectionOffer(e,id);
 if(e.type==='planNoShowTalk'){const p=personById(e.participants?.[0]);if(!p)return true;let story;if(id==='explain'){const ok=chance(50+(p.trust-50)*.6);p.rel=clamp(p.rel+(ok?4:1));p.conflict=clamp(p.conflict-(ok?6:2));story=ok?`${firstName(p)} listens. "Okay. Just tell me next time." It is going to be fine.`:`${firstName(p)} does not quite buy it, but at least you talked.`}else if(id==='apologize'){p.rel=clamp(p.rel+5);p.trust=clamp(p.trust+2);p.conflict=clamp(p.conflict-8);story=`You do not make excuses. ${firstName(p)} softens. "Thanks for saying that."`}else{p.rel=clamp(p.rel-4);p.conflict=clamp(p.conflict+6);story=`"It's not a big deal," you say. To ${firstName(p)}, it clearly was.`}rememberPerson(p,story,2);log(e.title,story);return true}
 if(e.type==='friendAsks'){const p=personById(e.participants?.[0]);if(!p)return true;const good=(e.payload?.place??-2)>=0;if(id==='share'){p.rel=clamp(p.rel+3);p.trust=clamp(p.trust+3);log(`Told ${firstName(p)}`,good?`${firstName(p)} is genuinely happy for you. "I knew you'd get in!"`:`You admit you did not make it. ${firstName(p)} says, "Their loss. Next time — I'll practice with you."`)}else{p.rel=clamp(p.rel-1);log('Changed the subject',`${firstName(p)} lets it go, a little confused.`)}rememberPerson(p,`Asked how your ${e.payload?.club} ${good?'success':'tryout'} went.`);return true}
 if(e.type==='promiseCheck'){const el=S.elections?.find(x=>x.id===e.payload?.electionId);let story;if(id==='work'){advanceTime(120,{silent:true});const ok=chance(45+ensureRep().leadership*.4);addRep('leadership',ok?6:2);story=ok?`After weeks of meetings, ${el?.promise||'your promise'} actually happens. People notice.`:'You push hard, but the school says no for now. People respect that you tried.'}else if(id==='honest'){addRep('leadership',1);addRep('kindness',1);story='You explain what is realistic. Most people appreciate the honesty.'}else{addRep('leadership',-5);addRep('social',-2);story='You change the subject. Word gets around that you made empty promises.'}if(el)recordOutcome('Election',`Promise: ${el.promise}`,id==='work'?'Worked on it':id==='honest'?'Honest update':'Dodged',story);log('Campaign promise',story);return true}
 const cg=personById(e.participants?.[0])||caregiverPerson(),name=cg?firstName(cg):'Your caregiver',strict=familyRules().strictness;
 if(INVITE_TYPES.includes(e.type)&&/Accept|Go/i.test(label)&&atSchool()){const p=personById(e.participants?.[0]);if(p){p.rel=clamp(p.rel+1);rememberPerson(p,'You agreed to meet after school.')}log('After school, then',`You are in school until ${timeLabel(SCHOOL_DAY.end)}, so you tell ${p?firstName(p):'them'} you will catch up after.`);return true}
 if(INVITE_TYPES.includes(e.type)&&/Accept|Go/i.test(label)&&S.age<16&&(currentMinute()<360||currentMinute()>=1290)){log('Too late',`It is ${timeLabel(currentMinute())}. Your caregivers are not letting you go out now.`);return true}
 if(INVITE_TYPES.includes(e.type)&&/Accept|Go/i.test(label)&&isGrounded()){const p=personById(e.participants?.[0]);if(p){p.rel=clamp(p.rel-1);rememberPerson(p,'You had to cancel because you were grounded.')}log('Grounded',`You want to go, but you are grounded until ${formatDate(S.family.restrictions.groundedUntil)}. You tell ${p?firstName(p):'them'} you cannot make it.`);return true}
 if(e.type==='missedExam'){
  const exam=S.exams.find(x=>x.id===e.payload?.examId),sub=examSubject(exam),t=ensureTeacher(sub);if(!exam||!t){log('Missed assessment','The moment passes.');return true}
  const mod=t.style==='Warm'?15:t.style==='Strict'?-15:0,rep=(S.school?.record?.examsMissed||1)-1,rel=t.rel;let story;
  if(id==='honest'){t.rel=clamp(t.rel+2);if(chance(clamp(30+rel*.45+mod-rep*8,5,92))){const mk=scheduleMakeupExam(exam);story=`You tell ${t.name} what actually happened. They are quiet for a moment, then nod. "Thank you for being straight with me. Make-up is ${formatDate(mk?.dateISO||currentDate())} after school."`}else story=`${t.name} appreciates the honesty, but the zero stands. "Next time, tell me before — not after."`}
  else if(id==='sick'){const real=!!S.healthState?.illness;if(real||chance(clamp(55+rel*.2+mod-rep*12,5,85))){const mk=scheduleMakeupExam(exam);if(!real)S.flags.examLies=(S.flags.examLies||0)+1;story=`${t.name} believes you${real?'':', though you feel a small twist of guilt'}. A make-up is set for ${formatDate(mk?.dateISO||currentDate())}.`}else{t.rel=clamp(t.rel-10);S.school.behavior=clamp(S.school.behavior-6);if(S.age<18)scheduleFollowUp('missedExamParent',{examId:exam.id},{minute:Math.min(1439,currentMinute()+180)});story=`${t.name} checks the attendance office. There is no sick note. "I would rather you had just told me the truth." The zero stays, and they will be contacting home.`}}
  else if(id==='makeup'){if(chance(clamp(20+rel*.5+mod-rep*10,5,85))){const mk=scheduleMakeupExam(exam);story=`${t.name} sighs, then opens their planner. "One chance. ${formatDate(mk?.dateISO||currentDate())}, after school."`}else{t.rel=clamp(t.rel-1);story=`${t.name} says no. "The date was on the board for weeks." You leave with the zero still on your record.`}}
  else{t.rel=clamp(t.rel-3);if(S.age<18&&chance(60))scheduleFollowUp('missedExamParent',{examId:exam.id},{days:1,minute:1080});story=`You say nothing. ${t.name} notices you avoiding eye contact for the rest of the week.`}
  log(`${exam.subject}: ${label}`,story);return true
 }
 if(['absenceTalk','examTalk','homeworkTalk','cheatTalk'].includes(e.type)){
  const n=e.payload?.count||S.school?.record?.absences||1,heavy=e.type==='cheatTalk'||n>=5;let story;
  if(id==='apologize'){S.family.tension=clamp(S.family.tension+(heavy?3:1));if(cg){cg.trust=clamp(cg.trust+1)}if(heavy){ground(3,'School problems');story=`You apologize. ${name} accepts it, but you are grounded for three days anyway. "Actions, not words."`}else story=`You apologize. ${name} lets out a breath. "Okay. Don't make me hear about this again."`}
  else if(id==='lie'){if(chance(clamp(55-n*8-(strict-50)*.3,5,80))){S.flags.liesToParents=(S.flags.liesToParents||0)+1;story=`${name} seems to believe you. It worked — this time.`}else{S.family.tension=clamp(S.family.tension+8);S.family.closeness=clamp(S.family.closeness-4);if(cg)cg.trust=clamp(cg.trust-8);ground(5,'Lying about school');story=`${name} already talked to the school. The lie makes everything worse: five days grounded, and a lot less trust.`}}
  else if(id==='argue'){S.family.tension=clamp(S.family.tension+6);S.family.closeness=clamp(S.family.closeness-3);if(strict>65||heavy)ground(4,'Arguing about school');story=`It turns into a real argument. Doors are closed a little too hard.${strict>65||heavy?' You end up grounded.':''}`}
  else{S.family.tension=clamp(S.family.tension+1);S.family.closeness=clamp(S.family.closeness+2);S.stress=clamp(S.stress-3);if(cg)cg.trust=clamp(cg.trust+3);story=`You tell ${name} what was really going on. It is uncomfortable, but they listen, and the conversation ends with a plan instead of a punishment.`}
  if(cg)rememberPerson(cg,`A conversation about school: ${label.toLowerCase()}.`,2);log(e.title,story);return true
 }
 if(e.type==='ptMeeting'){
  let story;const subs=(S.school?.subjects||[]).filter(s=>s.homework?.status==='Missing'||(s.homeworkHistory||[]).some(h=>h.status==='Missing'));
  if(id==='plan'){S.family.tension=clamp(S.family.tension+1);S.family.responsibility=clamp((S.family.responsibility||0)+4);subs.forEach(s=>ensureTeacher(s).rel=clamp(s.teacher.rel+3));if(S.school)S.school.record.missingHomework=Math.max(0,S.school.record.missingHomework-2);story='You agree to a written homework plan: a set time every school day, checked weekly. The teachers seem genuinely relieved.'}
  else if(id==='promise'){S.family.tension=clamp(S.family.tension+3);story='"I\'ll do better." Everyone has heard that before. They will be watching.'}
  else if(id==='blame'){S.family.tension=clamp(S.family.tension+5);subs.forEach(s=>ensureTeacher(s).rel=clamp(s.teacher.rel-4));ground(5,'Parent–teacher meeting');story='You blame the teachers. The room goes cold. You leave grounded for five days.'}
  else{S.family.tension=clamp(S.family.tension+4);story='You stay quiet while the adults talk about you as if you are not there. It is the longest half hour of the year.'}
  log('Parent–teacher meeting',story,true);return true
 }
 if(e.type==='clubWarning'){
  const c=clubById(e.payload?.clubId);if(!c)return true;let story;
  if(id==='commit'){c.leaderRel=clamp(c.leaderRel+4);story=`${c.leader} nods. "Good. Show me."`}
  else if(id==='explain'){c.leaderRel=clamp(c.leaderRel+2);story=S.stress>60?`You explain how much is going on. ${c.leader} softens: "Tell me ahead of time when you can't make it. That's all I ask."`:`${c.leader} listens. "Fair enough. Just keep me in the loop."`}
  else{c.leaderRel=clamp(c.leaderRel-5);c.warnings=2;story=`${c.leader}'s expression flattens. "Then I'll plan without you." One more slip and you are off the roster.`}
  log(`${c.name}: ${label}`,story);return true
 }
 return false
}

// ---------- Current context (hero) lifecycle ----------
function setCurrentContext(ctx){S.current=Object.assign({id:uid('ctx'),sourceType:'general',sourceId:null,createdAt:{dateISO:currentDate(),minute:currentMinute()},expiresAt:endOfDay(),priority:1,title:'',text:'',actions:[]},ctx);return S.current}
function offerContext(ctx){const cur=S.current;if(!contextIsActive(cur)||(ctx.priority??1)>=(cur.priority??0))setCurrentContext(ctx)}
function contextIsActive(c){
 if(!c||!c.title||!c.createdAt)return false;if(c.expiresAt&&nowStamp()>stampOf(c.expiresAt))return false;
 if(c.sourceType==='exam'){const e=S.exams.find(x=>x.id===c.sourceId);return examIsOpen(e)&&e.dateISO===currentDate()&&currentMinute()<=e.graceMinute}
 if(c.sourceType==='event'){const e=S.events.find(x=>x.id===c.sourceId);return !!e&&e.status==='Open'&&!eventExpired(e)}
 if(c.sourceType==='calendar'){const e=S.calendar.find(x=>x.id===c.sourceId);return !!e&&!isTerminal(e.status)&&e.dateISO===currentDate()&&currentMinute()<=e.graceMinute}
 if(c.sourceType==='schoolSession'){const p=periodAt();return atSchool()&&!!p&&c.title.includes(p.kind==='lunch'?'Lunch':p.subject)}
 if(c.sourceType==='schoolDay'){const e=schoolDayEvent();return !!e&&!isTerminal(e.status)&&e.status!=='Attending'&&currentMinute()<=SCHOOL_DAY.cutoff}
 if(c.sourceType==='daily')return false;
 if(c.sourceType==='scene')return !!S.scene;
 if(c.sourceType==='holiday'){const x=holidayWindow().find(w=>w.h.id===c.sourceId);return !!x&&availableActivities(x).length>0&&x.days<=0}
 return true
}
function examContext(exam){return {sourceType:'exam',sourceId:exam.id,priority:5,title:`${exam.subject.toUpperCase()} ${exam.type.toUpperCase()}`,text:currentMinute()<exam.minute?`Today at ${timeLabel(exam.minute)}. Preparation, sleep and stress will all matter.`:currentMinute()<=exam.endMinute?'The assessment is happening right now.':`It started at ${timeLabel(exam.minute)}. You can still sit it late until ${timeLabel(exam.graceMinute)}, with less time.`,expiresAt:{dateISO:exam.dateISO,minute:exam.graceMinute}}}
function calendarContext(ev){if(['tryout','plan'].includes(ev.type))return {sourceType:'calendar',sourceId:ev.id,priority:ev.type==='tryout'?4:3,title:ev.title,text:ev.type==='tryout'?`${timeLabel(ev.startMinute)} • check in by ${timeLabel(ev.graceMinute)}.`:`${timeLabel(ev.startMinute)} at ${ev.location}. Arrive by ${timeLabel(ev.graceMinute)}.`,expiresAt:{dateISO:ev.dateISO,minute:ev.graceMinute}};const c=ev.type==='clubSession'?clubById(ev.payload?.clubId):contestById(ev.payload?.contestId);return {sourceType:'calendar',sourceId:ev.id,priority:ev.type==='schoolEvent'?4:3,title:ev.title,text:ev.type==='clubSession'?`${timeLabel(ev.startMinute)}–${timeLabel(ev.endMinute)} with ${ensureClub(c||{name:'the club'}).leader||'the club'}. You can still arrive until ${timeLabel(ev.graceMinute)}.`:`Check-in ${timeLabel(ev.startMinute)}–${timeLabel(ev.graceMinute)}. Preparation ${Math.round(c?.prep||0)}%.`,expiresAt:{dateISO:ev.dateISO,minute:ev.graceMinute}}}
function partOfDay(m=currentMinute()){return m<300?'Late night':m<720?'Morning':m<1020?'Afternoon':m<1260?'Evening':'Night'}
function computeNextContext(){
 const today=currentDate(),m=currentMinute();
 if(S.scene)return {sourceType:'scene',sourceId:S.scene.id,priority:6,title:S.scene.kind==='prom'?'Prom night is still going':'Your date is still going',text:'You stepped away for a moment.',expiresAt:null};
 const exam=S.exams.filter(e=>examIsOpen(e)&&e.dateISO===today&&m<=e.graceMinute).sort((a,b)=>a.minute-b.minute)[0];if(exam)return examContext(exam);
 const live=sessionEvent();if(live&&m<SCHOOL_DAY.end){const p=periodAt(m),{contests}=dueAtSchoolNow();if(contests.length)return calendarContext(contests[0]);return {sourceType:'schoolSession',sourceId:live.id,priority:4,title:p?(p.kind==='lunch'?'Lunch break':`${p.label} • ${p.subject}`):'At school',text:p?(p.kind==='lunch'?'Eat, see friends, study in the library or visit a teacher.':`${ensureTeacher(S.school.subjects.find(s=>s.name===p.subject))?.name||'Class'} until ${timeLabel(p.end)}. How do you spend it?`):'Between classes.',expiresAt:{dateISO:today,minute:SCHOOL_DAY.end}}}
 const due=S.calendar.filter(ev=>!isTerminal(ev.status)&&ev.dateISO===today&&['clubSession','schoolEvent','tryout','plan'].includes(ev.type)&&m>=ev.startMinute-90&&m<=ev.graceMinute).sort((a,b)=>b.importance-a.importance)[0];if(due)return calendarContext(due);
 const e=(S.events||[]).filter(x=>x.status==='Open'&&!eventExpired(x)).sort((a,b)=>(b.priority||3)-(a.priority||3))[0];if(e)return {sourceType:'event',sourceId:e.id,priority:e.priority||3,title:e.title,text:e.text,expiresAt:e.expiresAt};
 const sd=schoolDayEvent();if(sd&&!isTerminal(sd.status)&&sd.status!=='Attending'&&m<=SCHOOL_DAY.cutoff&&m>=300)return {sourceType:'schoolDay',sourceId:sd.id,priority:2,title:m<=SCHOOL_DAY.tardyAfter?'School day':'You are late for school',text:m<SCHOOL_DAY.start?`Classes start at ${timeLabel(SCHOOL_DAY.start)}. The attendance cutoff is ${timeLabel(SCHOOL_DAY.cutoff)}.`:m<=SCHOOL_DAY.tardyAfter?'The bell is about to ring.':`You can still go and be marked tardy until ${timeLabel(SCHOOL_DAY.cutoff)}.`,expiresAt:{dateISO:today,minute:SCHOOL_DAY.cutoff}};
 const hol=holidaysOn(today).find(x=>availableActivities(Object.assign({},x,{days:-(x.day-1)})).length);if(hol&&m>=420&&m<1320)return {sourceType:'holiday',sourceId:hol.h.id,priority:1,title:`${hol.h.icon} ${hol.h.name}`,text:hol.day>1?`Day ${hol.day}. There is still time to celebrate.`:'Celebrate however feels right — nothing is required.',expiresAt:endOfDay()};
 const next=todayAgenda().find(a=>!a.done&&a.minute>=m);
 const vacation=S.school&&!isSchoolDay(today)&&!isWeekend(today)?' • school break':'';
 return {sourceType:'daily',sourceId:null,priority:0,title:`${weekday()} ${partOfDay(m).toLowerCase()}${vacation}`,text:next?`Nothing urgent right now. Next: ${next.title} at ${timeLabel(next.minute)}.`:m>=1200?'The day is winding down. Sleep will carry you into tomorrow.':'Nothing else is scheduled today. Your time is your own.',expiresAt:null}
}
function clearCurrentContextIfSourceResolved(){
 if(!S)return;const cur=S.current,active=contextIsActive(cur),next=computeNextContext();
 if(!active||cur.sourceType==='daily'||(next.priority>(cur.priority??0)&&!(next.sourceType===cur.sourceType&&next.sourceId===cur.sourceId)))setCurrentContext(next)
}

// ---------- Today agenda ----------
function todayAgenda(dateISO=currentDate()){
 const items=[];
 for(const ev of S.calendar.filter(e=>e.dateISO===dateISO)){const d=obDef(ev.type);items.push({id:ev.id,type:ev.type,icon:d.icon,minute:ev.startMinute??ev.minute??0,title:ev.type==='schoolDay'?'School':ev.title,status:ev.status,done:isTerminal(ev.status),required:ev.required})}
 if(needsFormalSchool())for(const s of S.school.subjects){const hw=s.homework;if(hw&&HW_OPEN.includes(hw.status)&&hw.dueDate===dateISO)items.push({id:hw.id,type:'homework',icon:'📒',minute:480,title:`${s.name} homework due`,status:`${hw.progress||0}% done`,done:false,required:true})}
 for(const p of S.pendingDecisions.filter(x=>!x.resolved&&x.resolveDate===dateISO))items.push({id:p.id,type:'decision',icon:'⏳',minute:1080,title:p.title,status:p.status,done:false})
 for(const x of holidaysOn(dateISO))items.push({id:'hol-'+x.h.id,type:'holiday',icon:x.h.icon,minute:0,title:x.h.name,status:'',done:false});
 if(sameMonthDay(S.dob,dateISO))items.push({id:'bday',type:'birthday',icon:'🎂',minute:0,title:'Your birthday',status:'',done:false});
 return items.sort((a,b)=>a.minute-b.minute)
}

// ---------- Reconciliation ----------
function reconcileState(reason='tick'){
 if(!S)return;ensureLifecycleContainers();
 reconcileSchoolStage();reconcileEducationHistory();socialReconcile();
 for(const p of S.pendingDecisions){normalizePending(p);pendingLifecycleCheck(p)}
 if(needsFormalSchool()){ensureSchoolRecord();ensureSchoolDayObligation(currentDate())}
 reconcileExams();reconcileCalendar();expireEvents();reconcileNotifications();reconcileOffers();archiveOldRecords();clearCurrentContextIfSourceResolved()
}
function compactExam(e){return {id:e.id,subject:e.subject,type:e.type,dateISO:e.dateISO,minute:e.minute,status:e.status,score:e.score,reason:e.reason||null,makeupOf:e.makeupOf||null,makeupId:e.makeupId||null,replacedBy:e.replacedBy||null}}
function closeSchoolYear(old,{leaving=false}={}){
 if(!old)return;awardsCeremony(old);const rec=old.record||null;
 for(const exam of S.exams||[]){if(examIsOpen(exam)){exam.status='Cancelled';exam.reason=leaving?'Left school':'School year ended';for(const ev of examCalendarEvents(exam))setCalendarStatus(ev,'Cancelled',exam.reason)}}
 S.archive.exams.unshift(...(S.exams||[]).map(compactExam));if(S.archive.exams.length>150)S.archive.exams.length=150;S.exams=[];
 for(const ev of S.calendar)if(['schoolDay'].includes(ev.type)&&!isTerminal(ev.status)&&ev.dateISO>currentDate())setCalendarStatus(ev,'Cancelled','School year ended');
 if(old.grade==='Kindergarten'&&S.development?.kindergarten)S.development.kindergarten.schoolName=old.name;
 if(rec||old.grade==='Kindergarten')S.schoolHistory.unshift({grade:old.grade,school:old.name,endedDate:currentDate(),average:Math.round(old.subjects?.reduce((a,s)=>a+safeNum(s.score,0),0)/Math.max(1,old.subjects?.length||1)),attendance:Math.round(old.attendance||0),record:rec});
 if(S.schoolHistory.length>20)S.schoolHistory.length=20
}
function reconcileExams(){
 S.exams=Array.isArray(S.exams)?S.exams:[];S.exams.forEach(normalizeExam);
 if(!needsFormalSchool()){for(const exam of S.exams)if(examIsOpen(exam)){exam.status='Cancelled';exam.reason='Not enrolled in formal school'}}
 for(const exam of S.exams){
  if(!examIsOpen(exam))continue;
  if(exam.dateISO<currentDate()||(exam.dateISO===currentDate()&&currentMinute()>exam.graceMinute)){
   if(SIM.skipping)performExam(exam,{simulated:true});else finalizeExam(exam.id,{status:'Missed',reason:'Assessment window passed',simulated:true});continue
  }
  if(exam.status==='Due'&&stamp(exam.dateISO,exam.minute)>nowStamp())exam.status='Scheduled';
  if(exam.status==='In progress'&&!examCalendarEvents(exam).some(e=>e.status==='Attending'))exam.status=exam.dateISO===currentDate()?'Due':'Scheduled';
  if(!isSchoolDay(exam.dateISO)&&!exam.makeupOf){const d=nextSchoolDay(exam.dateISO);if(d!==exam.dateISO){exam.dateISO=d;exam.days=daysBetween(currentDate(),d)}}
 }
 if(S.school){spreadExamDates();syncExamCalendar()}else for(const exam of S.exams)for(const ev of examCalendarEvents(exam)){const t=calStatusForExam(exam);if(t&&ev.status!==t)setCalendarStatus(ev,t,'Synced')}
}
function reconcileCalendar(){
 const seen=new Set();S.calendar=(S.calendar||[]).filter(e=>{if(!e||!e.id||seen.has(e.id))return false;seen.add(e.id);return true});
 const allExams=[...(S.exams||[]),...(S.archive?.exams||[])],seenClub=new Set();
 for(const ev of [...S.calendar].sort((a,b)=>a.dateISO.localeCompare(b.dateISO))){
  normalizeCalendarEvent(ev);if(isTerminal(ev.status))continue;
  if(ev.type==='exam'){const exam=allExams.find(x=>x.id===ev.payload?.examId);if(!exam){setCalendarStatus(ev,'Cancelled','Assessment record no longer exists');continue}const t=calStatusForExam(exam);if(t){setCalendarStatus(ev,t,'Synced with assessment record');continue}}
  if(ev.type==='clubSession'){const c=clubById(ev.payload?.clubId);if(!c||c.status!=='Active'){setCalendarStatus(ev,'Cancelled','Club is no longer active');continue}if(seenClub.has(c.id)){setCalendarStatus(ev,'Cancelled','Duplicate session');continue}seenClub.add(c.id)}
  if(ev.type==='schoolEvent'){const c=contestById(ev.payload?.contestId);if(!c||c.status!=='Registered'){setCalendarStatus(ev,c?.status==='Completed'?'Completed':'Cancelled','Contest no longer registered');continue}}
  if(ev.type==='schoolDay'&&!needsFormalSchool()){setCalendarStatus(ev,'Cancelled','Not enrolled');continue}
  if(ev.dateISO<addDays(currentDate(),-1)&&!SIM.skipping){setCalendarStatus(ev,'Expired','Reconciled from an older save');continue}
  if(ev.status==='Due'&&stamp(ev.dateISO,ev.startMinute)>nowStamp())ev.status='Scheduled';
 }
 if(S.school)for(const c of S.school.clubs||[]){if(c.status==='Active'){ensureClub(c);if(!clubSessionEvent(c))scheduleClubSession(c,nextSchoolDay(addDays(currentDate(),c.nextSessionDate&&c.nextSessionDate>currentDate()?daysBetween(currentDate(),c.nextSessionDate):1)))}}
 if(S.school)for(const c of S.school.contests||[])if(c.status==='Registered'&&!contestEvent(c)&&!S.calendar.some(e=>e.type==='schoolEvent'&&e.payload?.contestId===c.id)){if(c.eventDate>=currentDate())createCalendarEvent({id:`contest-${c.id}`,type:'schoolEvent',title:c.name,dateISO:c.eventDate,startMinute:600,endMinute:780,graceMinute:690,payload:{contestId:c.id},source:'school'});else{c.status='No-show';c.result='Did not attend'}}
}
function reconcileNotifications(){
 S.notifications=(S.notifications||[]).map(n=>Object.assign({id:uid('note'),status:n.read?'Read':'Unread',sourceType:null,sourceId:null,tab:null},n));
 for(const n of S.notifications){
  if(!['Unread','Read'].includes(n.status))continue;
  if(n.dateISO&&daysBetween(n.dateISO,currentDate())>10){n.status='Expired';continue}
  if(!n.sourceId&&/Exam today|Club session|Assessment today/.test(n.title)&&n.dateISO<currentDate()){n.status='Expired';continue}
  if(n.sourceType==='exam'){const e=S.exams.find(x=>x.id===n.sourceId);if(!examIsOpen(e))n.status='Resolved'}
  if(['club','contest'].includes(n.sourceType)){const e=S.calendar.find(x=>x.id===n.sourceId);if(!e||isTerminal(e.status))n.status='Resolved'}
 }
}
function reconcileOffers(){
 if(!S.school)return;
 for(const o of S.school.activityOffers||[])if(o.status==='Waiting'&&!S.pendingDecisions.some(p=>!p.resolved&&p.type==='clubApproval'&&p.payload?.offerId===o.id)){const p=S.pendingDecisions.find(p=>p.type==='clubApproval'&&p.payload?.offerId===o.id);o.status=p?.status==='Approved'?'Joined':p?.status==='Denied'?'Denied':'Expired'}
 for(const c of S.school.contests||[])if(c.status==='Waiting'&&!S.pendingDecisions.some(p=>!p.resolved&&p.type==='contestApproval'&&p.payload?.contestId===c.id)){const p=S.pendingDecisions.find(p=>p.type==='contestApproval'&&p.payload?.contestId===c.id);if(!p||!['Approved','Denied'].includes(p.status))c.status='Missed'}
 for(const c of S.school.clubs||[])if(c.status==='Active')ensureClub(c)
}
function archiveOldRecords(){
 const cutoff=addDays(currentDate(),-30),calCut=addDays(currentDate(),-21);
 const old=S.pendingDecisions.filter(p=>p.resolved&&(p.resolvedDate||p.createdDate||'0')<cutoff);if(old.length){S.archive.pending.unshift(...old);S.pendingDecisions=S.pendingDecisions.filter(p=>!old.includes(p));if(S.archive.pending.length>150)S.archive.pending.length=150}
 const oldCal=S.calendar.filter(e=>isTerminal(e.status)&&e.dateISO<calCut);if(oldCal.length){S.archive.calendar.unshift(...oldCal.filter(e=>e.type!=='schoolDay').map(e=>({id:e.id,type:e.type,title:e.title,dateISO:e.dateISO,status:e.status,attendanceStatus:e.attendanceStatus,resolutionReason:e.resolutionReason})));if(S.archive.calendar.length>300)S.archive.calendar.length=300;S.calendar=S.calendar.filter(e=>!oldCal.includes(e))}
 if(S.exams.length>40){const done=S.exams.filter(e=>!examIsOpen(e)).sort((a,b)=>a.dateISO.localeCompare(b.dateISO));const move=done.slice(0,S.exams.length-40);S.archive.exams.unshift(...move.map(compactExam));S.exams=S.exams.filter(e=>!move.includes(e));if(S.archive.exams.length>150)S.archive.exams.length=150}
 S.notifications=(S.notifications||[]).filter(n=>['Unread','Read'].includes(n.status)||daysBetween(n.resolvedDate||n.dateISO||currentDate(),currentDate())<=14)
}

// ---------- Sleep, bedtime and Next Day ----------
function bedtimeMinute(){const a=S.age;return a<4?1170:a<6?1200:a<10?1230:a<13?1260:a<16?1320:a<18?1350:1380}
function sleepNeedHours(){const a=S.age;return a<=1?13:a<=4?11.5:a<=12?10:a<=17?8.75:7.75}
function wakeMinuteFor(dateISO){if(needsFormalSchool()&&isSchoolDay(dateISO))return 390;if(S.school?.grade==='Kindergarten'&&isSchoolDay(dateISO))return 420;if(S.career?.job&&!S.career.retired&&!isWeekend(dateISO))return 420;return null}
function checkBedtime(){
 if(S.age>=18||S.age<3)return;const m=currentMinute(),bed=bedtimeMinute(),late=m>=bed+30||m<300;if(!late)return;
 const night=m<300?addDays(currentDate(),-1):currentDate(),key=`bedtime-${night}`;if(S.flags[key])return;S.flags[key]=true;
 const strict=familyRules().strictness,p=clamp(30+strict*.5-(S.age-8)*3,10,88);if(!chance(p))return;
 const cg=caregiverPerson(),name=cg?firstName(cg):'A caregiver';
 if(S.age<13){S.family.tension=clamp(S.family.tension+1);log('Past bedtime',`${name} finds you still awake. "It's way past your bedtime." You get sent to bed${chance(40)?' with a sigh and a glass of water':''}.`)}
 else if(strict>65&&chance(45)){S.family.tension=clamp(S.family.tension+3);log('Caught up late',`${name} sees the light under your door. It turns into an argument about sleep, school and screens.`)}
 else{S.family.tension=clamp(S.family.tension+1);log('Past bedtime',`${name} knocks: "Lights out soon, okay?"`)}
}
function sleepThroughNight(){
 SIM.sleeping=true;
 try{
  const m=currentMinute(),wakeDate=m<300?currentDate():addDays(currentDate(),1),need=sleepNeedHours()*60,alarm=wakeMinuteFor(wakeDate);
  const start=m<300?m:m-1440;let wake=alarm!=null?alarm:Math.max(360,Math.min(600,Math.round(start+need+(Math.random()*50-25))));
  let quality=1,note='slept well',overslept=false;const r=Math.random()*100;
  if(S.stress>65&&r<35){quality=.72;note='restless night'}else if(r<5){quality=.85;note='bad dream'}else if(r<11){quality=.9;note='woke during the night'}
  if(alarm!=null){if(chance((S.needs.sleep<25?14:5)+(S.age>=13&&S.age<18?6:0)+(S.stress>70?4:0))){wake=alarm+30+Math.floor(Math.random()*70);note='overslept';overslept=true}}
  else if(chance(7)){wake=Math.max(330,wake-60-Math.floor(Math.random()*40));note='woke early'}
  if(wake<start+90)wake=start+90;
  const minutes=Math.round(wake-start),hours=minutes/60;
  advanceTime(minutes,{skipNeeds:true,silent:true});
  const ratio=clamp(hours/(need/60),.2,1.15)*quality;
  S.needs.sleep=clamp(20+76*ratio,0,98);S.energy=clamp(15+80*ratio);S.stress=clamp(S.stress-12*ratio);S.healthState.sleep=clamp(S.healthState.sleep+(ratio>=.9?3:-4));
  S.needs.hunger=clamp(S.needs.hunger+hours*1.2);S.needs.toilet=clamp(S.needs.toilet+hours*2.4);S.needs.hygiene=clamp(S.needs.hygiene-hours*.5);S.needs.comfort=clamp(S.needs.comfort+8);S.location='Home';
  const story={'slept well':'You slept through the night.','restless night':'You tossed and turned, thoughts looping.','bad dream':'A strange dream left you uneasy for a few minutes after waking.','woke during the night':'You woke once in the dark and took a while to drift off again.','woke early':'You woke before you needed to and lay there listening to the house.','overslept':`You slept straight through the alarm and woke at ${timeLabel(wake)}.`}[note];
  log('Slept',`${Math.floor(hours)}h ${Math.round((hours%1)*60)}m • ${story}`);
  return {hours,minutes,note,overslept,story,wake}
 }finally{SIM.sleeping=false;clearCurrentContextIfSourceResolved()}
}
function sleepAction(){
 const m=currentMinute(),night=m>=Math.min(1200,bedtimeMinute()-60)||m<300;
 if(!night){basicAction('nap');return}
 const before=snapshotForSummary(),r=sleepThroughNight();showMorningSummary(before,r)
}
function todayWarnings(){
 const w=[],today=currentDate(),m=currentMinute();
 for(const e of S.exams.filter(x=>examIsOpen(x)&&x.dateISO===today&&m<=x.graceMinute))w.push({icon:'📝',text:`You still have a ${e.subject} ${e.type.toLowerCase()} due today (${timeLabel(e.minute)}).`,result:'It will be recorded as missed.'});
 const sd=schoolDayEvent();if(sd&&!isTerminal(sd.status)&&sd.status!=='Attending'&&m<=SCHOOL_DAY.cutoff)w.push({icon:'🏫',text:'You have not gone to school today.',result:'You will be marked absent.'});
 for(const ev of S.calendar.filter(e=>e.dateISO===today&&!isTerminal(e.status)&&['clubSession','schoolEvent','tryout','plan'].includes(e.type)&&m<=e.graceMinute))w.push({icon:obDef(ev.type).icon,text:`${ev.title} at ${timeLabel(ev.startMinute)}.`,result:ev.type==='clubSession'?'It counts as a missed session.':ev.type==='plan'?'They will be waiting for you.':'You will be a no-show.'});
 if(needsFormalSchool())for(const s of S.school.subjects)if(s.homework?.status==='Assigned'&&s.homework.dueDate===today)w.push({icon:'📒',text:`${s.name} homework is due today (${s.homework.progress||0}% done).`,result:'It becomes late.'});
 for(const e of S.events.filter(x=>x.status==='Open'&&x.expiresAt&&x.expiresAt.dateISO<=addDays(today,1)&&INVITE_TYPES.includes(x.type)))w.push({icon:'💬',text:`${e.title} — still waiting for your answer.`,result:'The invitation will expire.'});
 return w
}
function snapshotForSummary(){return {energy:S.energy,stress:S.stress,happiness:S.happiness,sleep:S.needs.sleep,logId:S.log[0]?.id||null,unread:unreadMessages()}}
function nextDay(force=false){
 if(!S)return;const w=todayWarnings();
 if(w.length&&!force){openModal('Before you move on',`<p class="muted-text">Moving to the next day now has consequences:</p><div class="warning-list">${w.map(x=>`<div class="warning-row"><span>${x.icon}</span><div><b>${esc(x.text)}</b><small>${esc(x.result)}</small></div></div>`).join('')}</div><div class="modal-action-grid"><button data-close-modal="1">Return</button><button class="primary" data-next-day-confirm="1">Advance anyway</button></div>`);return}
 performNextDay()
}
function performNextDay(){
 closeChoiceModal();const before=snapshotForSummary(),m=currentMinute(),bed=bedtimeMinute();
 if(m>=300&&m<bed){const hrs=(bed-m)/60;advanceTime(bed-m,{silent:true,skipNeeds:true});S.needs.hunger=clamp(Math.min(S.needs.hunger+hrs*1.5,50));S.needs.hygiene=clamp(S.needs.hygiene-hrs*.8);S.needs.fun=clamp(S.needs.fun-hrs*.4);S.needs.toilet=clamp(Math.min(S.needs.toilet+hrs,40));S.needs.sleep=clamp(S.needs.sleep-hrs*1.4);S.energy=clamp(S.energy-hrs*1.6)}
 const r=sleepThroughNight();showMorningSummary(before,r);save();render()
}
function showMorningSummary(before,r){
 const agenda=todayAgenda().filter(a=>!a.done),delta=(k,a,b)=>{const d=Math.round(a-b);return d?`${k} ${d>0?'+':''}${d}`:''};
 const newLogs=[];for(const l of S.log){if(l.id===before.logId)break;if(l.title!=='Slept')newLogs.push(l);if(newLogs.length>=4)break}
 const unread=unreadMessages(),fromMsg=S.messages.find(x=>!x.read);
 openModal(formatDate(currentDate()).toUpperCase(),`<div class="morning-summary"><p class="summary-lead">You slept <b>${Math.floor(r.hours)}h ${Math.round((r.hours%1)*60)}m</b>. ${esc(r.story)}</p><h4>Overnight</h4><p>${[delta('Energy',S.energy,before.energy),delta('Stress',S.stress,before.stress)].filter(Boolean).map(esc).join(' • ')||'No big changes.'}</p><h4>Today</h4>${agenda.length?agenda.map(a=>`<div class="agenda-row"><span>${a.icon}</span><b>${esc(a.title)}</b><small>${a.type==='homework'||a.type==='birthday'?esc(a.status||''):timeLabel(a.minute)}</small></div>`).join(''):'<p class="muted-text">Nothing scheduled. A free day.</p>'}${r.overslept&&needsFormalSchool()&&isSchoolDay()?'<p class="urgent-text">You overslept — school has already started.</p>':''}${unread?`<h4>Messages</h4><p>${esc(fromMsg?.from||'Someone')} sent you a message${unread>1?` (+${unread-1} more)`:''}.</p>`:''}${newLogs.length?`<h4>While you were busy</h4>${newLogs.map(l=>`<p><b>${esc(l.title)}</b> — ${esc(l.text)}</p>`).join('')}`:''}<div class="modal-action-grid single"><button class="primary" data-close-modal="1">Start the day</button></div></div>`)
}

// ---------- Age Up: simulate a year, then summarize ----------
function freshSummary(){return {school:{days:0,attended:0,absences:0,excused:0,tardies:0,examsCompleted:0,examsMissed:0,examsExcused:0,makeups:0,scores:[],hwOnTime:0,hwLate:0,hwMissing:0},clubs:{},contests:[],notable:[]}}
function yearSnapshot(){return {itemCond:Object.fromEntries(S.inventoryItems.filter(i=>hasCondition(i.lifecycleType)).map(i=>[i.id,i.condition])),money:availableFunds(),rel:Object.fromEntries(S.people.map(p=>[p.id,p.rel])),avg:S.school?schoolAverage():null,items:S.inventoryItems.length,age:S.age,tension:S.family.tension}}
function ageUp(){
 if(!S)return;const target=nextBirthday(),days=daysBetween(currentDate(),target),snap=yearSnapshot();
 SIM.skipping=true;SIM.summary=freshSummary();
 try{advanceTime(days*1440-currentMinute()+420,{skipNeeds:true,silent:true,skipRoutine:true})}finally{SIM.skipping=false}
 const summary=SIM.summary;SIM.summary=null;reconcileState('ageUp');processCalendar();render();save();showYearSummary(snap,summary);toast(`Age ${S.age}!`)
}
function showYearSummary(snap,sum){
 const sc=sum.school,total=sc.attended+sc.absences+sc.excused,att=total?Math.round(100*sc.attended/total):null,avgScore=sc.scores.length?Math.round(sc.scores.reduce((a,b)=>a+b,0)/sc.scores.length):null;
 const school=total||sc.examsCompleted||sc.examsMissed?[att!=null?`Attendance ${att}% (${sc.absences} unexcused absence${sc.absences===1?'':'s'}, ${sc.excused} excused, ${sc.tardies} late)`:'',`${sc.examsCompleted} assessment${sc.examsCompleted===1?'':'s'} completed${avgScore!=null?` • average ${avgScore}%`:''}`,sc.examsMissed?`${sc.examsMissed} assessment${sc.examsMissed===1?'':'s'} missed${sc.makeups?` (${sc.makeups} make-up${sc.makeups===1?'':'s'} granted)`:''}`:'',sc.examsExcused?`${sc.examsExcused} excused`:'',sc.hwOnTime+sc.hwLate+sc.hwMissing?`Homework: ${sc.hwOnTime} on time, ${sc.hwLate} late, ${sc.hwMissing} missing`:''].filter(Boolean):['No formal school this year.'];
 const clubs=Object.values(sum.clubs).map(c=>{const t=c.attended+c.missed;return `${c.name} attendance ${t?Math.round(100*c.attended/t):100}% (${c.attended}/${t} sessions${c.excused?`, ${c.excused} excused`:''})`}).concat(sum.contests.map(c=>`${c.name}: ${c.result}`));
 const changes=S.people.filter(p=>snap.rel[p.id]!=null).map(p=>({p,d:p.rel-snap.rel[p.id]})).filter(x=>Math.abs(x.d)>=3).sort((a,b)=>Math.abs(b.d)-Math.abs(a.d)).slice(0,4).map(x=>`${firstName(x.p)} ${x.d>0?'became closer':'drifted away'} (${x.d>0?'+':''}${Math.round(x.d)})`);
 const newPeople=S.people.filter(p=>snap.rel[p.id]==null).map(p=>`Met ${firstName(p)}`);
 const m=availableFunds()-snap.money,items=S.inventoryItems.length-snap.items,itemNotes=S.inventoryItems.filter(i=>snap.itemCond?.[i.id]!=null).map(i=>{const a=snap.itemCond[i.id],b=i.condition;if(conditionLabel(a)!==conditionLabel(b))return `${i.name} wore down to ${conditionLabel(b).toLowerCase()} (${Math.round(b)}%)`;if(a-b>=8)return `${i.name} condition dropped to ${Math.round(b)}%`;return null}).filter(Boolean).slice(0,4);
 const sec=(t,arr)=>`<section class="summary-section"><h4>${t}</h4>${arr.length?arr.map(x=>`<p>${esc(x)}</p>`).join(''):'<p class="muted-text">Nothing notable.</p>'}</section>`;
 openModal(`Year summary • Age ${S.age}`,`<div class="summary-grid">${sec('School',school)}${sec('Activities',clubs)}${sec('Relationships',[...changes,...newPeople.slice(0,3)])}${sec('Money & items',[`${m>=0?'Saved / gained':'Spent'} ${money(Math.abs(m))}`,items?`${items>0?'+':''}${items} item${Math.abs(items)===1?'':'s'}`:'',...itemNotes].filter(Boolean))}${sum.notable.length?sec('Notable',sum.notable.slice(0,6)):''}</div><div class="modal-action-grid single"><button class="primary" data-close-modal="1">Continue</button></div>`)
}

// ---------- v7.2 time advancement (end-of-day obligations resolve before the date changes) ----------
function advanceTime(minutes,{skipNeeds=false,silent=false,skipRoutine=false}={}){
 minutes=Math.max(0,Math.round(minutes)||0);if(!minutes)return;if(!skipNeeds)driftNeeds(minutes);
 let remaining=minutes;
 while(remaining>0){
  const untilMidnight=1440-S.clock.minute;
  if(remaining<untilMidnight){S.clock.minute+=remaining;remaining=0;processCalendar()}
  else{remaining-=untilMidnight;S.clock.minute=1439;processCalendar();S.clock.minute=0;S.clock.dateISO=addDays(S.clock.dateISO,1);S.day++;dailyTick({skipRoutine});processCalendar()}
 }
 if(!skipNeeds)applyNeedConsequences();if(!silent&&!skipRoutine)maybeRandomEvent();checkConditionalRequests();
 if(!SIM.skipping&&!SIM.sleeping)checkBedtime();
 if(!SIM.skipping)clearCurrentContextIfSourceResolved()
}
function dailyTick({skipRoutine=false}={}){
 setWeather();ageSync();itemDailyTick();academicTick();schoolDailyTick(skipRoutine);schoolActivityTick();holidayTick();
 if(!skipRoutine){worldTick();const sd=needsFormalSchool()&&isSchoolDay();scheduleFollowUp('npcInitiative',{},{minute:(sd?940:600)+Math.floor(Math.random()*(sd?200:540))});applyNeedConsequences(true);if(S.stall?.active&&chance(35))runStall(false)}
 if(!skipRoutine)repDailyTick();
 promTick();npcAgencyTick();if(!skipRoutine){neighborhoodTick();groupTick()}
 reconcileState('daily')
}
function schoolDailyTick(skipRoutine=false){
 if(!S.school)return;normalizeSchool();if(S.school.grade==='Kindergarten')return;
 ensureSchoolRecord();ensureSchoolDayObligation(currentDate());processHomeworkDeadlines();ensureRollingAssessments();
 if(isSchoolDay()&&chance(SIM.skipping?35:25))generateHomework(false);
 if(!skipRoutine&&isSchoolDay()&&chance(18))scheduleFollowUp('npcSchool',{},{minute:690+Math.floor(Math.random()*20)})
}
function normalizeSchool(){
 if(!S.school)return;ensureLifecycleContainers();
 S.school.attendance=clamp(S.school.attendance??96);S.school.behavior=clamp(S.school.behavior??70);
 S.school.subjects=(S.school.subjects||[]).map((sub,i)=>{const s=Object.assign(makeSubject(sub.name||`Subject ${i+1}`,i),sub,{teacher:Object.assign({name:teacherName(sub.name),rel:55},sub.teacher||{}),homework:Object.assign({status:'None',progress:0,dueDate:null},sub.homework||{})});if(s.homework.status==='Done'){s.homework.status='Submitted';s.homework.resolvedDate=s.homework.resolvedDate||currentDate()}if(s.homework.status==='Archived'){s.homework.status='None'}if(HW_OPEN.includes(s.homework.status)&&!s.homework.id)s.homework.id=uid('hw');ensureTeacher(s);return s});
 S.school.clubs=(S.school.clubs||[]).map(c=>ensureClub(typeof c==='string'?{id:uid('club'),name:c,status:'Active',joinedDate:currentDate(),skill:15,sessions:0,members:[]}:Object.assign({id:c.id||uid('club'),status:'Active',joinedDate:currentDate(),skill:15,sessions:0,members:[]},c)));
 S.school.activityOffers=S.school.activityOffers||[];
 const seen=new Set();
 S.school.contests=(S.school.contests||[]).filter(c=>c&&c.name&&!seen.has(c.id||c.name)&&seen.add(c.id||c.name)).map(c=>{
  const decisionDate=c.decisionDate||(Number.isFinite(Number(c.decisionBy))?addDays(currentDate(),Math.max(0,Number(c.decisionBy)-safeNum(S.day,1))):addDays(currentDate(),4));
  const eventDate=c.eventDate||(Number.isFinite(Number(c.eventDay))?addDays(currentDate(),Math.max(1,Number(c.eventDay)-safeNum(S.day,1))):addDays(currentDate(),14));
  return Object.assign({id:c.id||uid('contest'),status:c.status==='Considering'?'Open':c.status||'Open',prep:0,result:null},c,{decisionDate,eventDate});
 });
 ensureSchoolRecord();
 if(S.school.grade==='Kindergarten'){if(S.exams?.length){S.archive.exams.unshift(...S.exams);S.exams=[]}return}
 S.exams=Array.isArray(S.exams)?S.exams:[];S.exams.forEach(normalizeExam);syncExamCalendar()
}
function initializeNewLife(){S=makeState();migrate();setWeather();ensureCalendarBasics();setCurrentContext({sourceType:'general',priority:1,title:'Welcome to the world.',text:'At first, almost everything happens through caregivers. Your independence will grow with age, skills, trust and circumstances.'});log('Life begins',S.current.text,true);enterGame()}
function enterGame(){migrate();schoolActivityTick();processCalendar();reconcileState('enter');$('creator').classList.add('hidden');$('game').classList.remove('hidden');render();save()}

// ---------- v7.2 UI: hero, upcoming, panels ----------
function upcomingEvents(limit=7,{includeRoutine=false}={}){
 const today=currentDate(),now=nowStamp(),arr=[];
 arr.push({id:'birthday',title:`${S.name}'s birthday`,dateISO:nextBirthday(),type:'birthday',icon:'🎂'});
 for(const x of upcomingHolidays(4))arr.push({id:'hol-'+x.h.id,title:x.h.name,dateISO:x.dateISO,type:'holiday',icon:x.h.icon});
 for(const mk of academicMarkers().filter(x=>x.dateISO>=today).slice(0,40).sort((a,b)=>a.dateISO.localeCompare(b.dateISO)).slice(0,4))arr.push(mk);
 for(const e of S.calendar){if(isTerminal(e.status))continue;if(!includeRoutine&&e.type==='schoolDay')continue;if(e.dateISO<today)continue;if(e.dateISO===today&&stamp(e.dateISO,e.graceMinute??e.minute??0)<now)continue;arr.push(e)}
 if(needsFormalSchool())for(const s of S.school.subjects){const hw=s.homework;if(hw&&HW_OPEN.includes(hw.status)&&hw.dueDate>=today)arr.push({id:hw.id,title:`${s.name} homework`,dateISO:hw.dueDate,minute:480,type:'homework',status:homeworkLabel(hw)})}
 for(const p of S.pendingDecisions.filter(x=>!x.resolved&&x.resolveDate&&x.resolveDate>=today))arr.push({id:p.id,title:p.title,dateISO:p.resolveDate,type:'decision'});
 return arr.sort((a,b)=>a.dateISO.localeCompare(b.dateISO)||(a.minute||0)-(b.minute||0)).slice(0,limit)
}
function typeIcon(t){return ({prom:'💃',tryout:'🏅',plan:'🤝',election:'🗳️',decision:'⏳',birthday:'🎂',exam:'📝',homework:'📒',holiday:'🎉',schoolDay:'🏫',clubSession:'🎨',schoolEvent:'🏆',party:'🎉'})[t]||'🗓️'}
function renderUpcomingCompact(){const host=$('upcoming-strip');if(!host)return;const list=upcomingEvents(6);host.innerHTML=list.length?list.map(e=>{const d=daysBetween(currentDate(),e.dateISO),now=e.status==='Due';return `<div class="upcoming-chip ${now?'is-now':d===0?'is-today':''}"><span>${e.icon||typeIcon(e.type)}</span><b>${esc(e.title)}</b><small>${now?'Now':d===0?(e.minute!=null&&e.type!=='homework'?timeLabel(e.minute):'Today'):d===1?'Tomorrow':d+'d'}</small></div>`}).join(''):'<span class="muted-text">No upcoming deadlines.</span>'}
function meter(label,value,inverse=false){const v=Math.round(clamp(value)),good=inverse?v<=35:v>=65,bad=inverse?v>=65:v<=35;return `<div class="hero-stat ${good?'good':bad?'bad':''}"><span>${esc(label)}</span><b>${v}%</b><i><em style="width:${v}%"></em></i></div>`}
function heroParts(c){
 const agenda=()=>{const a=todayAgenda().filter(x=>x.type!=='birthday').slice(0,4);return a.length?`<div class="hero-agenda">${a.map(x=>`<div class="${x.done?'done':''}"><span>${x.icon}</span><b>${esc(x.title)}</b><small>${x.done?esc(x.status):x.type==='homework'?esc(x.status):timeLabel(x.minute)}</small></div>`).join('')}</div>`:''};
 if(c.sourceType==='exam'){const e=S.exams.find(x=>x.id===c.sourceId),sub=examSubject(e);if(!e)return {detail:'',actions:''};
  const phase=currentMinute()<e.minute?`Today • ${timeLabel(e.minute)}`:currentMinute()<=e.endMinute?'In progress now':`Late sitting until ${timeLabel(e.graceMinute)}`;
  return {detail:`<div class="hero-when urgent">${phase}</div><div class="hero-stats">${meter('Preparation',sub?.prep||0)}${meter('Skill',sub?.skill||0)}${meter('Sleep',S.needs.sleep)}${meter('Stress',S.stress,true)}</div>`,actions:`<button class="primary" data-exam-take="${e.id}">Take Assessment</button>${e.minute<SCHOOL_DAY.end&&schoolDayEvent()&&!isTerminal(schoolDayEvent().status)?'<small class="muted-text">Includes going to school for the day.</small>':''}`}}
 if(c.sourceType==='event'){const e=S.events.find(x=>x.id===c.sourceId);if(!e)return {detail:'',actions:''};const by=e.expiresAt?`Respond by ${e.expiresAt.dateISO===currentDate()?'':formatDate(e.expiresAt.dateISO)+' '}${timeLabel(e.expiresAt.minute)}`:'';return {detail:by?`<div class="hero-when">${by}</div>`:'',actions:e.choices.map(ch=>`<button data-event-id="${e.id}" data-event-choice="${esc(ch.id)}">${esc(ch.label)}</button>`).join('')}}
 if(c.sourceType==='calendar'){const ev=S.calendar.find(x=>x.id===c.sourceId);if(!ev)return {detail:'',actions:''};
  if(ev.type==='clubSession'){const cl=clubById(ev.payload?.clubId);return {detail:`<div class="hero-when">${currentMinute()<ev.startMinute?`Starts ${timeLabel(ev.startMinute)}`:`Started ${timeLabel(ev.startMinute)} • arrive by ${timeLabel(ev.graceMinute)}`}</div><div class="hero-stats">${meter('Attendance',clubAttendanceRate(cl||{}))}${meter('Club skill',cl?.skill||0)}${meter('Energy',S.energy)}</div>`,actions:`<button class="primary" data-club-attend="${cl?.id}">Attend session</button><button class="ghost" data-club-skip="${cl?.id}">Skip</button>${currentMinute()<ev.startMinute?`<button class="ghost" data-club-excuse="${cl?.id}">Tell ${esc(cl?.leader||'the leader')} you can't come</button>`:''}`}}
  if(ev.type==='tryout'){const t=S.school?.tryouts?.find(x=>x.id===ev.payload?.tryoutId);return {detail:`<div class="hero-when urgent">Check in by ${timeLabel(ev.graceMinute)}</div><div class="hero-stats">${meter('Preparation',t?.prep||0)}${meter('Energy',S.energy)}${meter('Stress',S.stress,true)}</div>`,actions:`<button class="primary" data-tryout-go="${t?.id}">Go to ${esc(clubInfo(t?.club).entry||'tryout')}</button>`}}
  if(ev.type==='prom')return {detail:`<div class="hero-when urgent">Doors 7:00 PM • ${esc(ev.location||'')}</div>`,actions:`<button class="primary" data-prom-go="1">Go to prom</button>`};
  if(ev.type==='plan'){const pl=S.plans?.find(x=>x.id===ev.payload?.planId);return {detail:`<div class="hero-when">${timeLabel(ev.startMinute)} • ${esc(ev.location||'')}</div>`,actions:`<button class="primary" data-plan-go="${pl?.id}">Go</button><button class="ghost" data-plan-cancel="${pl?.id}">Cancel (last minute)</button>`}}
  const ct=contestById(ev.payload?.contestId);return {detail:`<div class="hero-when urgent">Check-in ${timeLabel(ev.startMinute)}–${timeLabel(ev.graceMinute)}</div><div class="hero-stats">${meter('Preparation',ct?.prep||0)}${meter('Energy',S.energy)}${meter('Stress',S.stress,true)}</div>`,actions:`<button class="primary" data-contest-attend="${ct?.id}">Go to the event</button>`}}
 if(c.sourceType==='scene')return {detail:'',actions:'<button class="primary" data-scene-resume="1">Continue</button>'};
 if(c.sourceType==='schoolSession'){const p=periodAt(),sd=sessionEvent(),sub=bestPrepSubject()?.name||'';if(p?.kind==='lunch')return {detail:'',actions:`${sd&&!sd.ateLunch?'<button class="primary" data-lunch="eat">Eat in the cafeteria</button>':''}<button data-lunch="friend">Sit with friends</button><button class="ghost" data-lunch="library" data-arg="${esc(sub)}">Library</button><button class="ghost" data-tab-jump="school">More school options</button>`};return {detail:`<div class="hero-stats">${meter('Energy',S.energy)}${meter('Sleep',S.needs.sleep)}${meter('Social',S.needs.social)}</div>`,actions:'<button class="primary" data-class="attend">Pay attention</button><button data-class="participate">Participate</button><button class="ghost" data-class="chat">Chat</button><button class="ghost" data-school-skip="1">Skip to dismissal</button>'}}
 if(c.sourceType==='schoolDay')return {detail:`<div class="hero-when">${timeLabel(SCHOOL_DAY.start)}–${timeLabel(SCHOOL_DAY.end)} • attendance cutoff ${timeLabel(SCHOOL_DAY.cutoff)}</div>${agenda()}`,actions:`<button class="primary" data-act="school">Go to school</button>`};
 if(c.sourceType==='holiday'){const x=holidayWindow().find(w=>w.h.id===c.sourceId),acts=x?availableActivities(x).slice(0,4):[];return {detail:agenda(),actions:acts.map((a,i)=>`<button class="${i?'':'primary'}" data-holiday-act="${x.h.id}:${a.id}">${esc(a.label)}</button>`).join('')+(x?'<button class="ghost" data-tab-jump="home">All holiday options</button>':'')}}
 const evening=currentMinute()>=Math.min(1200,bedtimeMinute()-60)||currentMinute()<300;
 return {detail:agenda(),actions:evening?`<button data-act="sleep">Go to sleep</button>`:''}
}
function renderHero(){clearCurrentContextIfSourceResolved();const c=S.current,{detail,actions}=heroParts(c);$('event-title').textContent=c.title;$('event-text').textContent=c.text||'';const d=$('event-detail');if(d)d.innerHTML=detail;$('event-actions').innerHTML=actions;document.querySelector('.hud-story')?.setAttribute('data-kind',c.sourceType||'daily')}

function statusTag(status){const cls=['Completed','Attended','Submitted','Enrolled','Approved'].includes(status)?'ok':['Missed','No-show','Missing','Absent','Late','Denied','Removed'].includes(status)?'bad':['Due','Due today','Attending','In progress','Make-up scheduled','Submitted late','Excused','Superseded','Expired'].includes(status)?'warn':'';return `<span class="tag ${cls}">${esc(status)}</span>`}
function pendingHtml(){const p=pendingOpen();if(!p.length)return '<p class="muted-text">Nothing is waiting on a future decision.</p>';return p.slice(0,7).map(x=>`<div class="pending-row"><div><b>${esc(x.title)}</b><small>${esc(x.detail||x.status)}${x.resolveDate?` • decision ${formatDate(x.resolveDate)}`:x.autoDecideDate?` • family decides by ${formatDate(x.autoDecideDate)}`:x.expiresDate?` • expires ${formatDate(x.expiresDate)}`:''}</small></div><div class="inline-actions">${statusTag(x.status)}${['purchaseConsideration','conditionalPurchase'].includes(x.type)?`<button class="small ghost" data-pending-again="${x.id}">Ask again</button>`:''}${x.type==='kindergarten'&&x.status==='Waiting for your preference'?'<button class="small" data-act="kindergartenYes">I want to go</button><button class="small ghost" data-act="kindergartenNo">I don\'t want to</button>':''}</div></div>`).join('')}
function eventHtml(){const shown=S.current?.sourceType==='event'?S.current.sourceId:null,list=S.events.filter(x=>x.status==='Open'&&x.id!==shown&&!eventExpired(x));if(!list.length)return `<p class="muted-text">${shown?'The current moment is shown at the top of the page.':'No major interruption right now. Ordinary life is still moving.'}</p>`;return list.slice(0,3).map(e=>`<div class="event-card"><div class="event-kicker">WAITING FOR YOU${e.expiresAt?` • RESPOND BY ${esc(timeLabel(e.expiresAt.minute))}${e.expiresAt.dateISO!==currentDate()?' '+esc(formatDate(e.expiresAt.dateISO)):''}`:''}</div><h3>${esc(e.title)}</h3><p>${esc(e.text)}</p><div class="event-actions">${e.choices.map(c=>`<button data-event-id="${e.id}" data-event-choice="${esc(c.id)}">${esc(c.label)}</button>`).join('')}</div></div>`).join('')}
function notificationsHtml(){const n=activeNotifications().slice(0,6);if(!n.length)return '<p class="muted-text">No active notifications.</p>';return n.map(x=>`<button class="note-row ${x.status==='Unread'?'unread':''}" data-note-open="${x.id}"><b>${esc(x.title)}</b><small>${esc(x.text)} • ${formatDate(x.dateISO)}</small></button>`).join('')+`<div class="inline-actions"><button class="small ghost" data-notes-read="1">Mark all read</button></div>`}
function agendaHtml(){const a=todayAgenda();if(!a.length)return '<p class="muted-text">Nothing scheduled today.</p>';return a.map(x=>`<div class="agenda-row ${x.done?'done':''}"><span>${x.icon}</span><b>${esc(x.title)}</b><small>${x.type==='homework'||x.type==='birthday'?esc(x.status||''):timeLabel(x.minute)}</small>${x.type!=='homework'&&x.type!=='birthday'&&x.status?statusTag(x.status):''}</div>`).join('')}
function homePanel(){const q=quickContextActions(),gift=S.giftHistory.find(x=>!x.reaction);return `<div class="dashboard home-dashboard"><section class="card wide"><div class="section-heading"><div><h3>What needs your attention?</h3><p class="muted-text">The game surfaces context instead of making you hunt through menus.</p></div><span class="tag">${esc(S.emotion.current)}</span></div><div class="context-grid">${q.map(x=>`<button class="context-action" data-tab-jump="${x[0]}"><b>${x[1]}</b><small>${x[2]}</small></button>`).join('')}</div></section><section class="card"><h3>Today • ${esc(weekday())}</h3>${agendaHtml()}${isGrounded()?`<p class="urgent-text">Grounded until ${formatDate(S.family.restrictions.groundedUntil)}.</p>`:''}</section><section class="card"><h3>Notifications</h3>${notificationsHtml()}</section>${promHtml()?`<section class="card wide"><h3>Prom</h3>${promHtml()}</section>`:''}${holidayWindow().length?`<section class="card wide"><h3>Holidays</h3>${holidayHtml()}</section>`:''}<section class="card wide"><h3>What's happening?</h3>${eventHtml()}</section><section class="card"><h3>Right now</h3>${statRow('Location',esc(S.location))}${statRow('Weather',`${weatherIcon(S.weather.type)} ${esc(S.weather.type)} • ${S.weather.temp}°C`)}${statRow('Emotion',esc(S.emotion.current))}<p class="muted-text">${esc(S.emotion.reason||weatherAdvice())}</p></section><section class="card"><h3>Pending decisions</h3>${pendingHtml()}</section>${gift?`<section class="card wide"><h3>🎁 A gift reaction is still yours to choose</h3><p>You received <b>${esc(gift.item)}</b> for ${esc(gift.occasion)}. Your private feeling and outward behavior do not have to match.</p><div class="inline-actions"><button data-act="giftThank">Say thank you</button><button data-act="giftExcited">Act excited</button><button data-act="giftHide">Hide disappointment</button><button data-act="giftHug">Hug giver</button><button class="ghost" data-act="giftComplain">Complain</button></div></section>`:''}</div>`}
function quickContextActions(){const a=[];const exam=nextExam();if(exam){const d=daysBetween(currentDate(),exam.dateISO);if(d<=3)a.push(['school','📝 '+exam.subject,d<=0?`Assessment today • ${timeLabel(exam.minute)}`:`Assessment in ${d} day${d===1?'':'s'} • prep ${Math.round(examSubject(exam)?.prep||0)}%`])}const sd=schoolDayEvent();if(sd&&!isTerminal(sd.status)&&currentMinute()<=SCHOOL_DAY.cutoff)a.push(['school','🏫 School today',schoolDayStatus()]);if(needsFormalSchool()){const hw=S.school.subjects.find(s=>s.homework?.status==='Late'||(s.homework?.status==='Assigned'&&daysBetween(currentDate(),s.homework.dueDate)<=1));if(hw)a.push(['school','📒 '+hw.name+' homework',homeworkLabel(hw.homework)])}if(S.needs.hunger>=60)a.push(['places','🍽️ Eat',S.age<=1?'Signal caregiver / be fed':'Take care of hunger']);if(S.needs.toilet>=65)a.push(['places','🚽 Bathroom',S.age<=4?'Age-appropriate toileting help':'Relieve yourself']);if(S.needs.sleep<=35||S.energy<=30)a.push(['places','😴 Sleep','You are running low on rest']);if(unreadMessages())a.push(['phone','💬 Messages',`${unreadMessages()} unread`]);if(pendingOpen().length)a.push(['calendar','⏳ Pending decision',`${pendingOpen().length} unresolved`]);if(!a.length)a.push(['places','🧭 Choose an activity','Your immediate needs are stable'],['people','👥 See someone','Relationships keep moving']);return a.slice(0,6)}
function developmentPanel(){const k=S.development.kindergarten,p=S.pendingDecisions.find(x=>!x.resolved&&x.type==='kindergarten');return `<div class="dashboard"><section class="card"><h3>Development & autonomy</h3><p class="stage-note"><b>${lifeStage()}</b> • skills grow through actual care routines.</p>${Object.entries(S.development.skills).map(([key,v])=>`<div class="skill-line"><span>${esc(key.replace(/([A-Z])/g,' $1'))}</span><div class="progress"><i style="width:${clamp(v)}%"></i></div><b>${Math.round(v)}%</b></div>`).join('')}</section><section class="card"><h3>Early education</h3>${statRow('Kindergarten',esc(k.decision||(p?p.status:'Not decided')))}${p&&p.status==='Waiting for your preference'?`<p>Your family is discussing kindergarten. Your preference matters, but caregivers still make the final decision${p.autoDecideDate?` — by ${formatDate(p.autoDecideDate)} at the latest`:''}.</p><div class="inline-actions"><button data-act="kindergartenYes">I want to go</button><button class="ghost" data-act="kindergartenNo">I don't want to go</button></div>`:p?`<p class="muted-text">${esc(p.detail)}</p>`:''}<h4>Milestones</h4>${S.development.milestones.slice(0,6).map(x=>`<p>${esc(x)}</p>`).join('')||'<p class="muted-text">Milestones appear as skills develop.</p>'}</section></div>`}
function examStatusLabel(e){const d=daysBetween(currentDate(),e.dateISO);if(e.status==='Completed')return `${e.score}%`;if(e.status==='Replaced by make-up')return 'Replaced';if(e.status==='Make-up scheduled'){const mk=S.exams.find(x=>x.id===e.makeupId);return mk?`Make-up ${formatDate(mk.dateISO)}`:'Make-up'}if(!examIsOpen(e))return e.status;return d===0?`TODAY ${timeLabel(e.minute)}`:`${d} day${d===1?'':'s'}`}
function schoolPanel(){
 if(!S.school)return `<div class="dashboard"><section class="card wide"><h3>No school right now</h3><p class="muted-text">Education appears when it is part of your current stage or family decision.</p></section></div>`;normalizeSchool();
 if(S.school.grade==='Kindergarten')return `<div class="dashboard"><section class="card"><h3>${esc(S.school.name)}</h3>${statRow('Group',esc(S.school.className))}${statRow('Attendance',Math.round(S.school.attendance)+'%')}${statRow('Today',esc(schoolDayStatus()))}${actionButton('school','🎒 Go to kindergarten','Weekdays 8:00 AM–3:00 PM')}<p class="muted-text">Kindergarten is play-based. No GPA, rank, formal exams or competitive club system.</p></section><section class="card wide"><h3>Learning through play</h3><div class="action-grid">${S.school.subjects.map(s=>`<button class="action" data-early-learn="${esc(s.name)}"><strong>${esc(s.name)}</strong><small>Development ${Math.round(s.score)}% • stories, games and guided activity</small></button>`).join('')}</div></section></div>`;
 const primary=S.age<=11,rec=ensureSchoolRecord(),offers=(S.school.activityOffers||[]).filter(o=>['Offered','Waiting','Denied','Waitlisted'].includes(o.status)).slice(0,6),clubs=(S.school.clubs||[]).filter(c=>c.status==='Active'),removed=(S.school.clubs||[]).filter(c=>c.status==='Removed'),events=(S.school.contests||[]).filter(c=>!['Declined'].includes(c.status)).slice(0,8);
 const sd=schoolDayEvent(),sdOpen=sd&&!isTerminal(sd.status)&&currentMinute()<=SCHOOL_DAY.cutoff;
 const subjectHtml=S.school.subjects.map(s=>{const t=ensureTeacher(s),exam=S.exams.filter(e=>e.subject===s.name&&examIsOpen(e)).sort((a,b)=>a.dateISO.localeCompare(b.dateISO))[0],due=exam?daysBetween(currentDate(),exam.dateISO):null,live=exam&&due===0&&currentMinute()<=exam.graceMinute,hw=s.homework||{},hwOpen=HW_OPEN.includes(hw.status);
  return `<div class="subject-card ${live?'is-due':''}"><div class="subject-head"><div class="subject-title"><b class="subject-name">${esc(s.name)}</b><span class="subject-teacher">${esc(t.name)} · Relationship ${Math.round(t.rel)}%</span></div><div class="subject-grade"><small>Grade</small><strong>${Math.round(s.score)}</strong></div></div><div class="progress"><i style="width:${clamp(s.score)}%"></i></div><div class="mini-meta"><span>Skill ${Math.round(s.skill)}%</span><span>Prep ${Math.round(s.prep)}%</span>${hw.status&&hw.status!=='None'?`<span class="${['Late','Missing'].includes(hw.status)||homeworkLabel(hw)==='Due today'?'urgent-text':''}">Homework: ${esc(homeworkLabel(hw))}${hwOpen?` ${hw.progress||0}%`:''}</span>`:''}${exam&&!live?`<span class="${due<=3?'urgent-text':''}">${esc(exam.type)} ${due===0?'today':`in ${due}d`}</span>`:''}</div>${live?`<div class="assessment-callout"><div><b>ASSESSMENT TODAY • ${timeLabel(exam.minute)}</b><small>${currentMinute()>exam.endMinute?`Late sitting until ${timeLabel(exam.graceMinute)}`:esc(exam.type)}</small></div><button class="primary small" data-exam-take="${exam.id}">Take Assessment</button></div>`:''}<div class="subject-actions"><details class="study-menu"><summary class="${live?'ghost':''}">Study ▾</summary><div><button class="small" data-study="${esc(s.name)}" data-minutes="30">30 min</button><button class="small" data-study="${esc(s.name)}" data-minutes="60">1 hour</button><button class="small" data-study="${esc(s.name)}" data-minutes="180">3 hours</button></div></details><button class="small ghost" data-study-friend="${esc(s.name)}">Study with friend</button><button class="small ghost" data-study-teacher="${esc(s.name)}">Ask teacher</button>${hwOpen?`<button class="small" data-homework="${esc(s.name)}">Do homework</button>`:''}</div></div>`}).join('');
 const examList=[...S.exams].sort((a,b)=>a.dateISO.localeCompare(b.dateISO)||a.minute-b.minute);
 const examHtml=examList.map(e=>{const d=daysBetween(currentDate(),e.dateISO),can=examIsOpen(e)&&d===0&&currentMinute()<=e.graceMinute;return `<div class="exam-row ${examIsOpen(e)?'':'is-done'}"><div><b>${esc(e.subject)}</b><small>${esc(e.type)} • ${formatDate(e.dateISO)} ${timeLabel(e.minute)}${e.reason&&!examIsOpen(e)?` • ${esc(e.reason)}`:''}</small></div><div class="inline-actions">${examIsOpen(e)?`<span class="countdown">${esc(examStatusLabel(e))}</span>`:statusTag(e.status==='Completed'?`Completed ${e.score}%`:examStatusLabel(e))}${can?`<button class="small primary" data-exam-take="${e.id}">Take assessment</button><button class="small ghost" data-exam-cheat="${e.id}">Attempt cheat</button>`:''}</div></div>`}).join('')||'<p class="muted-text">No assessments scheduled.</p>';
 const offerHtml=offers.length?offers.map(o=>`<div class="opportunity-row"><div><b>${esc(o.name)}</b><small>${o.status==='Offered'?`Decide by ${formatDate(o.decisionDate)}${S.age<13?' • caregiver approval required':''}`:o.status==='Waiting'?'Waiting for caregiver decision':o.status==='Denied'?'Caregiver said no this time':esc(o.status)}</small></div>${offerButtons(o)}</div>`).join(''):'<p class="muted-text">No activity offers waiting.</p>';
 const clubHtml=clubs.length?clubs.map(c=>{ensureClub(c);const def=D.clubDefs[c.name]||{actions:[['practice','Practice',60],['special','Special activity',90],['social','Talk with members',45]]},ev=clubSessionEvent(c),today=ev&&ev.dateISO===currentDate(),open=today&&currentMinute()<=ev.graceMinute,before=ev&&(ev.dateISO>currentDate()||(today&&currentMinute()<ev.startMinute));
  return `<div class="commitment-card club-card"><div><b>${esc(c.name)} <span class="tag">${esc(c.position)}</span>${(()=>{const L=ladderFor(c),i=L.indexOf(c.position);return i>=0&&i<L.length-1?` <small class="muted-text">next: ${esc(L[i+1])}</small>`:''})()}${c.leaderNpc?` <small class="muted-text">• led by ${esc(c.leaderNpc)}</small>`:''}${c.warnings?' <span class="tag bad">Warning</span>':''}</b><small>Led by ${esc(c.leader)} · relationship ${Math.round(c.leaderRel)}% • attendance ${clubAttendanceRate(c)}% (${c.attended} attended, ${c.missedSessions} missed${c.excusedSessions?`, ${c.excusedSessions} excused`:''}) • skill ${Math.round(c.skill||0)}%</small><small>${ev?`Next session ${today?'<b>today</b>':formatDate(ev.dateISO)} ${timeLabel(ev.startMinute)}–${timeLabel(ev.endMinute)}${ev.status==='Due'?' • happening now':''}`:'No session scheduled'}</small><div class="progress"><i style="width:${clamp(c.skill||0)}%"></i></div></div><div class="inline-actions">${open?`<button class="small primary" data-club-attend="${c.id}">Attend session</button><button class="small ghost" data-club-skip="${c.id}">Skip</button>`:''}${before?`<button class="small ghost" data-club-excuse="${c.id}">Tell leader you can't come</button>`:''}${def.actions.map(a=>`<button class="small ghost" data-club-action="${c.id}" data-kind="${a[0]}">${esc(a[1])}</button>`).join('')}<button class="small ghost" data-club-action="${c.id}" data-kind="leave">Leave</button></div></div>`}).join(''):'<p class="muted-text">You have not joined a club yet.</p>';
 const eventHtml=events.length?events.map(c=>{const d=daysBetween(currentDate(),c.eventDate);if(c.status==='Open')return `<div class="opportunity-row"><div><b>${esc(c.name)}</b><small>Register by ${formatDate(c.decisionDate)} • event ${formatDate(c.eventDate)}</small></div><div class="inline-actions"><button class="small" data-contest-enter="${c.id}">${S.age<13?'Ask to enter':'Register'}</button><button class="small ghost" data-contest-decline="${c.id}">Decline</button></div></div>`;if(c.status==='Waiting')return `<div class="opportunity-row"><div><b>${esc(c.name)}</b><small>Waiting for caregiver approval</small></div>${statusTag('Waiting')}</div>`;if(c.status==='Registered'){const ev=contestEvent(c),live=ev&&ev.dateISO===currentDate()&&currentMinute()<=ev.graceMinute;return `<div class="commitment-card"><div><b>${esc(c.name)}</b><small>${d<=0?`Today • check-in ${timeLabel(ev?.startMinute??600)}–${timeLabel(ev?.graceMinute??690)}`:`Event in ${d} day${d===1?'':'s'} • ${formatDate(c.eventDate)}`} • preparation ${Math.round(c.prep||0)}%</small><div class="progress"><i style="width:${clamp(c.prep||0)}%"></i></div></div><div class="inline-actions">${live?`<button class="small primary" data-contest-attend="${c.id}">Go to the event</button>`:''}<button class="small ghost" data-contest-practice="${c.id}">Prepare 75m</button></div></div>`}return `<div class="opportunity-row"><div><b>${esc(c.name)}</b><small>${esc(c.result||c.status)}</small></div>${statusTag(c.status)}</div>`}).join(''):'<p class="muted-text">No current event opportunities.</p>';
 return `<div class="dashboard"><section class="card wide"><h3>Today at school</h3>${schoolSessionHtml()}<p class="muted-text">On time by ${timeLabel(SCHOOL_DAY.tardyAfter)}, absent after ${timeLabel(SCHOOL_DAY.cutoff)}. This year: ${rec.daysAttended} days • ${rec.absences} absent • ${rec.tardies} late${rec.classesSkipped?` • ${rec.classesSkipped} classes skipped`:''}.</p></section><section class="card"><h3>${esc(S.school.name)}</h3>${statRow('Grade',esc(S.school.grade))}${statRow('Semester',esc(semesterLabel()))}${statRow('Class',esc(S.school.className))}${statRow('Academic average',Math.round(schoolAverage())+'%')}${statRow('Attendance',Math.round(S.school.attendance)+'%')}${statRow('Behavior',Math.round(S.school.behavior)+'%')}${!primary&&S.school.gpa!=null?statRow('GPA',Number(S.school.gpa).toFixed(2)):''}</section><section class="card"><h3>School reputation</h3>${repHtml()}</section><section class="card"><h3>Education history</h3>${educationHistoryHtml()}</section><section class="card wide"><h3>Subjects, teachers & homework</h3><div class="subject-grid">${subjectHtml}</div></section><section class="card wide"><h3>Assessments</h3>${examHtml}</section>${attendanceHtml()}<section class="card wide"><div class="section-heading"><div><h3>Clubs & activities</h3><p class="muted-text">Sessions are weekly commitments. Missing them has consequences; telling the leader beforehand is understood.</p></div><button class="small" data-act="exploreClub">Explore activities</button></div>${electionHtml()}${tryoutsHtml()?`<h4>Tryouts & auditions</h4>${tryoutsHtml()}`:''}<h4>Offers</h4>${offerHtml}${electionGradeOK()&&!(S.school.clubs||[]).some(c=>c.name==='Student Council'&&c.status==='Active')&&!(S.elections||[]).some(e=>e.status==='Campaign'&&e.scope==='council')?'<div class="inline-actions"><button class="small ghost" data-run-council="1">Run for class representative</button></div>':''}<h4>Your commitments</h4>${clubHtml}${removed.length?`<p class="muted-text">Removed: ${removed.map(c=>esc(c.name)).join(', ')}</p>`:''}</section><section class="card wide"><div class="section-heading"><div><h3>Competitions & school events</h3><p class="muted-text">Registering is not enough — you have to show up on the day.</p></div><button class="small" data-act="exploreContest">Find event</button></div>${eventHtml}</section></div>`
}
function handleLifecycleClick(b){
 if(handleInventoryClick(b))return true;if(promClick(b))return true;if(worldClick(b))return true;if(handleSchoolClick(b))return true;if(handlePlanClick(b))return true;if(handleClubClick(b))return true;if(handleUIClick(b))return true;
 const d=b.dataset;
 if(d.nextDayConfirm){performNextDay();return true}
 if(d.closeModal){closeChoiceModal();render();return true}
 if(d.clubAttend){attendClubSession(d.clubAttend);save();render();return true}
 if(d.clubSkip){skipClubSession(d.clubSkip);save();render();return true}
 if(d.clubExcuse){excuseClubSession(d.clubExcuse);save();render();return true}
 if(d.contestAttend){attendContest(d.contestAttend);save();render();return true}
 if(d.noteOpen){const n=S.notifications.find(x=>x.id===d.noteOpen);if(n){n.read=true;if(n.status==='Unread')n.status='Read';if(n.tab)active=n.tab}save();render();return true}
 if(d.notesRead){for(const n of activeNotifications()){n.read=true;n.status='Read'}save();render();return true}
 return false
}

function attendanceHtml(){if(!needsFormalSchool())return '';const r=ensureSchoolRecord(),past=(S.schoolHistory||[]).filter(h=>h.record&&h.grade!=='Kindergarten').slice(0,4);const row=(l,v,warn)=>statRow(l,warn?`<span class="urgent-text">${v}</span>`:v);
 return `<section class="card"><h3>Attendance this year</h3>${row('Days attended',r.daysAttended)}${row('Unexcused absences',r.absences,r.absences>=5)}${row('Excused absences',r.excused)}${row('Late arrivals',r.tardies,r.tardies>=8)}${row('Classes skipped',r.classesSkipped||0,(r.classesSkipped||0)>=3)}${row('Left early',r.leftEarly||0)}${row('Missed assessments',r.examsMissed,r.examsMissed>0)}${row('Missing homework',r.missingHomework,r.missingHomework>=3)}${row('Attendance rate',Math.round(S.school.attendance)+'%')}<p class="muted-text">On time by ${timeLabel(SCHOOL_DAY.tardyAfter)}, absent after ${timeLabel(SCHOOL_DAY.cutoff)}.</p></section><section class="card"><h3>Attendance history</h3>${past.length?past.map(h=>`<div class="timeline-entry"><span>${esc(h.grade)} • ${esc(h.school)}</span><b>${h.attendance}% attendance • average ${h.average}%</b><p>${h.record.absences} unexcused • ${h.record.excused} excused • ${h.record.tardies} late${h.record.classesSkipped?` • ${h.record.classesSkipped} classes skipped`:''}</p></div>`).join(''):'<p class="muted-text">Past school years appear here.</p>'}</section>`}

// =====================================================================
// v7.2 PHASE 2 — ITEM LIFECYCLES, INVENTORY & STORE
// Every catalog item declares its lifecycle. Behavior comes from the
// catalog (uses/effects/consume/wear/progress), not from a giant switch.
// =====================================================================
const LIFECYCLE_LABEL={consumable:'Single-use',finite:'Limited supply',durable:'Reusable',wearable:'Wearable',device:'Device',container:'Container',progress:'Progress',perishable:'Perishable',gift:'Gift'};
const SLOT_LABEL={top:'Top',bottom:'Bottom',outerwear:'Outerwear',shoes:'Shoes',eyewear:'Eyewear',head:'Head',accessory:'Accessory',bag:'Bag'};
const SKILL_LABEL={reading:'Reading',art:'Art',creativity:'Creativity',fitness:'Fitness',sports:'Sports',cycling:'Cycling',music:'Music',programming:'Programming',writing:'Writing',knowledge:'Knowledge',imagination:'Imagination',gaming:'Gaming',style:'Style'};
function lifecycleOf(d){return d?.lifecycleType||(d?.wearable?'wearable':d?.durable===false?'finite':'durable')}
function hasCondition(lt){return ['durable','wearable','device','container'].includes(lt)}
function conditionLabel(c){c=Math.round(c);return c>=90?'Excellent':c>=70?'Good':c>=45?'Worn':c>=20?'Poor':c>=1?'Nearly broken':'Broken'}
function freshDaysLeft(it){return it.freshUntil?daysBetween(currentDate(),it.freshUntil):99}
function freshnessLabel(it){const d=freshDaysLeft(it);return d>=2?'Fresh':d>=0?'Eat soon':d>=-2?'Stale':'Spoiled'}
function isSpoiled(it){return it.lifecycleType==='perishable'&&freshDaysLeft(it)<-2}
function unitCount(key){return S.inventoryItems.filter(i=>i.key===key).reduce((a,i)=>a+(i.quantity||1),0)}
function findUsable(key){return S.inventoryItems.find(i=>i.key===key&&!i.stored&&(!hasCondition(i.lifecycleType)||i.condition>0)&&(i.lifecycleType!=='finite'||i.remaining>0))||null}
function ownsItem(key){if(D.catalog[key]?.phone)return !!S.phone.owned;return unitCount(key)>0}
function equippedIn(slot){return S.inventoryItems.find(i=>i.equipped&&i.slot===slot&&i.condition>0)||null}
function hasWeatherGear(kind){
 if(kind==='rain')return !!findUsable('umbrella')||S.inventoryItems.some(i=>i.equipped&&catalogItem(i.key)?.weather==='rain'&&i.condition>0);
 return S.inventoryItems.some(i=>i.equipped&&i.condition>0&&catalogItem(i.key)?.weather===kind)
}
function ensureSkills(){S.skills=Object.assign({art:0,creativity:0,fitness:0,sports:0,cycling:0,music:0,programming:0,writing:0,knowledge:0,imagination:0,gaming:0,style:0},S.skills||{});if(!S.practiceLog||S.practiceLog.date!==currentDate())S.practiceLog={date:currentDate(),counts:{}};return S.skills}
function skillValue(k){return k==='reading'?S.development.skills.reading:ensureSkills()[k]||0}
// Diminishing returns: repeated practice of one skill on the same day, and higher levels, both shrink gains.
function practiceSkill(k,base){
 ensureSkills();const n=S.practiceLog.counts[k]||0,mult=[1,.75,.5,.3,.15,.07][Math.min(5,n)];S.practiceLog.counts[k]=n+1;
 const level=skillValue(k),gain=Math.max(0,base*mult*Math.max(.15,1-level/130));
 if(k==='reading')S.development.skills.reading=clamp(level+gain);else S.skills[k]=clamp(level+gain);
 if(k==='fitness')S.healthState.fitness=clamp(S.healthState.fitness+gain*.6);
 return gain
}
function originText(source,d){
 const age=S.age,lt=lifecycleOf(d);if(['consumable','perishable'].includes(lt)&&!d.gift)return null;
 if(d.phone&&!S.inventoryItems.some(x=>catalogItem(x.key)?.phone))return `Your first phone, at age ${age}.`;
 if(/Christmas/i.test(source))return `A Christmas gift when you were ${age}.`;if(/Birthday/i.test(source))return `A present for your ${ordinal(age)} birthday.`;
 if(/^from /i.test(source))return `Given to you by ${source.slice(5)} at age ${age}.`;
 if(/caregiver/i.test(source))return `${primaryCaregiver()} bought this for you at age ${age}.`;
 if(/chores/i.test(source))return 'Earned through chores.';if(/grade/i.test(source))return 'A reward for your grades.';
 if(source==='own money'&&d.price>=50)return `Bought with your own savings at age ${age}.`;return null
}
function makeItemInstance(key,source='purchase',cond=null){
 const d=catalogItem(key),lt=lifecycleOf(d);
 const it={id:uid('item'),key,name:d.name,category:d.category,lifecycleType:lt,quantity:1,opened:false,remaining:100,condition:hasCondition(lt)?clamp(cond??d.condition??100):100,originalPrice:d.price,acquiredDate:currentDate(),acquiredAge:S.age,source,sentimental:/gift|Christmas|Birthday|^from /i.test(source)?35:8,equipped:false,stored:false,timesUsed:0,useLog:{date:null,count:0}};
 if(lt==='container'){it.capacity=d.capacity||500;it.contents=it.capacity}
 if(lt==='progress'){it.progress=0;it.completions=0}
 if(lt==='perishable')it.freshUntil=addDays(currentDate(),d.freshnessDays||3);
 if(d.battery)it.battery=100;if(d.slot)it.slot=d.slot;
 it.origin=originText(source,d);if(it.origin&&/first phone/.test(it.origin))it.sentimental=40;
 return it
}
function addItem(key,source='purchase',condition=null,{quantity=1}={}){
 const d=catalogItem(key);if(!d)return null;quantity=Math.max(1,Math.round(quantity)||1);let it=null;
 if(d.stackable&&condition==null){const fresh=lifecycleOf(d)==='perishable'?addDays(currentDate(),d.freshnessDays||3):null;it=S.inventoryItems.find(x=>x.key===key&&!x.opened&&!x.stored&&(!fresh||x.freshUntil===fresh))}
 if(it)it.quantity=(it.quantity||1)+quantity;
 else{it=makeItemInstance(key,source,condition);if(d.stackable)it.quantity=quantity;S.inventoryItems.push(it);if(!d.stackable)for(let i=1;i<quantity;i++)S.inventoryItems.push(makeItemInstance(key,source,condition))}
 if(d.phone)onPhoneAcquired(it);
 syncLegacyInventory();S.purchaseHistory.unshift({dateISO:currentDate(),minute:currentMinute(),key,source,quantity,price:source==='own money'?d.price*quantity:0});if(S.purchaseHistory.length>200)S.purchaseHistory.length=200;
 return it
}
function openOne(it){if((it.quantity||1)>1&&!it.opened){it.quantity--;const n=Object.assign(JSON.parse(JSON.stringify(it)),{id:uid('item'),quantity:1,opened:true});S.inventoryItems.push(n);return n}it.opened=true;return it}
function removeItem(id,one=false){
 const i=S.inventoryItems.findIndex(x=>x.id===id);if(i<0)return null;const it=S.inventoryItems[i];
 if(one&&(it.quantity||1)>1){it.quantity--;syncLegacyInventory();return Object.assign({},it,{quantity:1})}
 S.inventoryItems.splice(i,1);if(catalogItem(it.key)?.phone){if(S.phone.activeItemId===it.id)S.phone.activeItemId=null;syncPhoneState()}syncLegacyInventory();return it
}
function syncLegacyInventory(){S.possessions=[...new Set(S.inventoryItems.filter(i=>!catalogItem(i.key)?.phone).map(i=>i.key))];S.inventory=S.inventory||{};for(const k of ['umbrella','raincoat','sweater','sunglasses','waterBottle'])S.inventory[k]=unitCount(k)}
function itemValue(it){
 const d=catalogItem(it.key);if(!d)return 0;const lt=it.lifecycleType,q=it.quantity||1;
 let v=['consumable','perishable','gift'].includes(lt)?d.price*.45*(it.remaining/100):lt==='finite'?d.price*.55*(it.remaining/100):lt==='progress'?d.price*.5:d.price*.65*Math.pow(clamp(it.condition)/100,1.3);
 if(lt==='device')v*=Math.max(.25,1-daysBetween(it.acquiredDate,currentDate())/365*.18);
 if(hasCondition(lt)&&it.condition<=0)v=d.price*.06;
 return Math.max(0,Math.round(v*q))
}
// ---------- Canonical phone state: the inventory item is the source of truth ----------
function phoneItems(){return S.inventoryItems.filter(i=>catalogItem(i.key)?.phone)}
function activePhoneItem(){const all=phoneItems();let p=all.find(i=>i.id===S.phone.activeItemId);if(!p){p=all.filter(i=>!i.stored).sort((a,b)=>b.condition-a.condition)[0]||null;S.phone.activeItemId=p?.id||null}return p}
function syncPhoneState(){const p=activePhoneItem();S.phone.owned=!!p&&p.condition>0;S.phone.model=p?p.name:null;S.phone.price=p?p.originalPrice:600;S.phone.condition=p?Math.round(p.condition):100;S.phone.battery=p?Math.round(p.battery??100):100;if(p)p.isSpare=false;for(const o of phoneItems())if(o!==p)o.isSpare=true;ensurePhoneApps()}
function setItemCondition(it,value){if(!it)return;const before=conditionLabel(it.condition);it.condition=clamp(value);if(it.condition<=0&&it.equipped)it.equipped=false;if(catalogItem(it.key)?.phone)syncPhoneState();return before!==conditionLabel(it.condition)?conditionLabel(it.condition):null}
function canUsePhone(){if(S.age<D.ageRules.phone)return false;const p=activePhoneItem();return !!p&&p.condition>0&&(p.battery??100)>0}
function phoneLockReason(){if(S.age<D.ageRules.phone)return `Independent phone use starts around high school (age ${D.ageRules.phone} in this simulation).`;const p=activePhoneItem();if(!p)return 'You do not own a phone yet.';if(p.condition<=0)return `Your ${p.name} is broken. Repair or replace it.`;if((p.battery??100)<=0)return 'Your phone battery is dead. Charge it first.';return ''}
function drainActivePhone(){const p=activePhoneItem();if(!p)return;p.battery=clamp((p.battery??100)-(3+Math.random()*5));p.timesUsed=(p.timesUsed||0)+1;let note=setItemCondition(p,p.condition-.12);if(chance(.4)){note=setItemCondition(p,p.condition-15);log('Cracked screen',`Your ${p.name} slips out of your hand and hits the floor. A crack runs across the corner of the screen.`)}if(p.battery<=0)toast('Your phone just died.');syncPhoneState()}
function onPhoneAcquired(it){
 const cur=phoneItems().find(i=>i.id===S.phone.activeItemId&&i!==it);
 if(!cur||cur.condition<=0||SIM.skipping){if(!cur||it.condition>=cur.condition)S.phone.activeItemId=it.id;syncPhoneState();return}
 syncPhoneState();
 queueEvent({type:'newPhone',title:`A new ${it.name}`,text:`You now have two phones: your current ${cur.name} (${Math.round(cur.condition)}%) and the new ${it.name}. What do you do with them?`,payload:{newId:it.id,oldId:cur.id},priority:3,expiresDays:3,choices:[{id:'switch',label:'Switch to the new one'},{id:'keep',label:'Keep using the current one'},{id:'sell',label:'Switch and sell the old one'},{id:'give',label:'Switch and give the old one away'}]})
}
function handlePhoneChoice(e,id){
 const nw=S.inventoryItems.find(x=>x.id===e.payload?.newId),old=S.inventoryItems.find(x=>x.id===e.payload?.oldId);if(!nw){log('New phone','The phone situation sorted itself out.');return true}
 if(id==='keep'){S.phone.activeItemId=old?.id||nw.id;syncPhoneState();log('Kept your phone',`The ${nw.name} goes in a drawer as a spare.`);return true}
 S.phone.activeItemId=nw.id;syncPhoneState();
 if(id==='sell'&&old){if(S.age<18&&!caregiverApproval(10)){log('Switched phones',`You switch to the ${nw.name}. Your caregiver wants to keep the old one as a backup.`);return true}const v=Math.max(5,Math.round(itemValue(old)*(.8+Math.random()*.3)));removeItem(old.id);S.money+=v;log('Sold the old phone',`You move everything to the ${nw.name} and sell the old ${old.name} for ${money(v)}.${old.sentimental>=40?' It was your first phone — it feels strange to see it go.':''}`);return true}
 if(id==='give'&&old){log('Switched phones',`You switch to the ${nw.name}. Now — who gets the old one?`);setTimeout(()=>openGiftPersonModal(null,old.id),0);return true}
 log('Switched phones',`You move your photos and messages to the ${nw.name}. The ${old?.name||'old phone'} becomes a spare.`);return true
}
// ---------- Aging (daily) ----------
function itemDailyTick(){
 for(const it of [...S.inventoryItems]){
  const d=catalogItem(it.key);if(!d)continue;const lt=it.lifecycleType;
  if(hasCondition(lt)&&d.agingPerYear)setItemCondition(it,it.condition-d.agingPerYear/365*(it.stored?.4:1));
  if(lt==='wearable'&&it.equipped)setItemCondition(it,it.condition-(d.wearPerDay||.2));
  if(d.battery&&!it.stored&&it.condition>0)it.battery=100;
  if(lt==='perishable'&&freshDaysLeft(it)<-6){removeItem(it.id);if(!SIM.skipping)log('Threw something out',`The ${it.name.toLowerCase()} had gone bad, so it went in the trash.`)}
 }
 const p=activePhoneItem();if(p)syncPhoneState()
}
// ---------- Using items ----------
function itemUses(it){const d=catalogItem(it.key);return (d?.uses||[]).filter(u=>(u.minAge??0)<=S.age&&(u.maxAge==null||S.age<=u.maxAge))}
function boredomFactor(it){if(it.useLog?.date!==currentDate())it.useLog={date:currentDate(),count:0};return [1,1,.8,.6,.4,.25][Math.min(5,it.useLog.count)]}
function bestPrepSubject(){if(!S.school?.subjects?.length)return null;const next=nextExam();return (next&&examSubject(next))||[...S.school.subjects].sort((a,b)=>a.prep-b.prep)[0]}
function performItemUse(itemId,useId){
 let it=S.inventoryItems.find(x=>x.id===itemId);if(!it)return;const d=catalogItem(it.key);if(!d)return;
 if(it.stored){toast('Take it out of storage first.');return}
 const use=itemUses(it).find(u=>u.id===useId);if(!use){toast(S.age<(d.minAge||0)?'That is not for your age yet.':'You cannot do that with this item right now.');return}
 if(hasCondition(it.lifecycleType)&&it.condition<=0){toast(`${it.name} is broken. Repair or replace it.`);return}
 if(it.lifecycleType==='finite'&&it.remaining<=0){toast(`${it.name} is used up.`);return}
 if(d.requires&&!findUsable(d.requires)){toast(`You need a working ${catalogItem(d.requires).name} for this.`);return}
 if(use.outdoor&&S.weather.type==='Stormy'){toast('It is storming outside — not now.');return}
 if(use.battery&&(it.battery??100)<use.battery){toast(`${it.name} needs charging first.`);return}
 if(S.energy<12&&(use.effects?.energy||0)<0){toast('You are too tired for that right now.');return}
 if(atSchool()&&!['book','comicBook','notebook','workbook','sketchbook'].includes(it.key)){toast('You are at school — that will have to wait.');return}
 if(d.permission&&!householdAccess(d.permission))return;
 if(it.lifecycleType==='finite'||(it.lifecycleType==='progress'&&(it.quantity||1)>1))it=openOne(it);
 let rereading=false;if(it.lifecycleType==='progress'&&it.progress>=100){it.progress=0;it.rereading=true}rereading=!!it.rereading;
 const bored=boredomFactor(it);it.useLog.count++;it.timesUsed=(it.timesUsed||0)+1;it.lastUsedDate=currentDate();
 const ef=use.effects||{},out=[];
 const needMap={fun:'fun',social:'social',comfort:'comfort',hygiene:'hygiene'};
 for(const [k,v0] of Object.entries(ef)){const v=(k==='fun'||k==='stress'&&v0<0)?v0*bored:v0;if(needMap[k])S.needs[k]=clamp(S.needs[k]+v);else if(k==='happiness')S.happiness=clamp(S.happiness+v);else if(k==='stress')S.stress=clamp(S.stress+v);else if(k==='energy')S.energy=clamp(S.energy+v);if(Math.abs(v)>=1)out.push(`${k[0].toUpperCase()+k.slice(1)} ${v>0?'+':''}${Math.round(v)}`)}
 const rereadMult=rereading?Math.pow(.5,Math.min(4,it.completions||1)):1;
 for(const [k,b] of Object.entries(use.skills||{})){const g=practiceSkill(k,b*rereadMult*(d.studyBonus?1:1));if(g>=.05)out.push(`${SKILL_LABEL[k]||k} +${g.toFixed(g<1?1:0)}`)}
 if(use.prep&&S.school){const sub=bestPrepSubject();if(sub){const g=Math.round(use.prep*(findUsable('deskLamp')?1.25:1)*bored);sub.prep=clamp(sub.prep+g);out.push(`${sub.name} prep +${g}`)}}
 if(use.family){S.family.closeness=clamp(S.family.closeness+use.family);S.needs.social=clamp(S.needs.social+4)}
 if(use.confidence)setEmotion('Confident',`You took time on your look with ${it.name}.`,55);
 let note='';
 if(use.consume){it.remaining=clamp(it.remaining-use.consume);out.push(`${Math.round(it.remaining)}% left`)}
 if(use.progress){const p=use.progress*(S.age<8?.7:1);it.progress=Math.min(100,(it.progress||0)+p);if(it.progress>=100){it.completions=(it.completions||0)+1;it.rereading=false;note=` You finish ${it.name.toLowerCase()==='book'?'the book':'it'}${it.completions>1?' again':''}.`}else out.push(`${Math.round(it.progress)}% through`)}
 if(use.wear&&chance(use.wear[0])){const loss=use.wear[1]+Math.random()*(use.wear[2]-use.wear[1]);const changed=setItemCondition(it,it.condition-loss);if(changed)note+=changed==='Broken'?` The ${it.name.toLowerCase()} finally breaks.`:` The ${it.name.toLowerCase()} is starting to look ${changed.toLowerCase()}.`}
 if(use.battery)it.battery=clamp((it.battery??100)-use.battery);
 advanceTime(use.minutes||30);
 const story=rand(use.text||[`You use the ${it.name.toLowerCase()} for a while.`])+(bored<.7?' It is starting to feel repetitive today.':'')+note;
 log(`${use.label} • ${it.name}`,`${story} ${out.length?'('+out.join(' • ')+')':''}`.trim());toast(`${use.label} • ${it.name}`);
 if(it.lifecycleType==='finite'&&it.remaining<=0.5){removeItem(it.id);log(`${it.name} used up`,`The last of the ${it.name.toLowerCase()} is gone.`)}
}
function eatPortion(itemId,portion){
 let it=S.inventoryItems.find(x=>x.id===itemId);if(!it)return;const d=catalogItem(it.key);if(!d||!['consumable','perishable'].includes(it.lifecycleType)||d.gift){toast('That is not food.');return}
 if(it.stored){toast('Take it out of storage first.');return}
 it=openOne(it);const rem=it.remaining,amt=portion==='little'?Math.min(25,rem):portion==='half'?rem/2:rem;if(amt<=0)return;
 const f=amt/100,spoiled=isSpoiled(it),stale=!spoiled&&freshDaysLeft(it)<0;
 if(d.drink){S.needs.comfort=clamp(S.needs.comfort+(d.comfort||10)*f);S.needs.toilet=clamp(S.needs.toilet+6*f)}
 S.needs.hunger=clamp(S.needs.hunger-(d.hunger||20)*f*(spoiled?.6:1));if(d.healthy)S.health=clamp(S.health+.8*f);if(it.key==='snackPack')S.needs.fun=clamp(S.needs.fun+4*f);if(it.key==='sandwich')S.energy=clamp(S.energy+6*f);
 it.remaining=Math.max(0,rem-amt);
 let story=d.drink?rand(portion==='all'?['You finish it in a few long sips.','You drain the carton and flatten it.']:['A few sips.','You drink some and save the rest.']):rand(portion==='little'?['You nibble a little.','Just a bite or two to take the edge off.']:portion==='half'?['You eat about half and put the rest aside.','Half now, half later.']:['You finish the whole thing.','Every last crumb.']);
 if(spoiled&&chance(60)){S.health=clamp(S.health-4);S.happiness=clamp(S.happiness-3);setEmotion('Uncomfortable','Something you ate had gone off.',55);story+=' It tasted off — your stomach complains for the next hour.'}else if(stale)story+=' It is a bit stale, but fine.';
 advanceTime(Math.max(3,Math.round(4+10*f)));
 if(it.remaining<=0.5){removeItem(it.id);story+=d.drink?' The empty carton goes in the recycling.':' You throw away the empty wrapper.'}
 log(`${d.drink?'Drank':'Ate'} ${it.name.toLowerCase()}`,`${story} (${d.drink?'Comfort':'Hunger'} ${d.drink?'+':'-'}${Math.round((d.drink?(d.comfort||10):(d.hunger||20))*f)}${it.remaining>0.5?` • ${Math.round(it.remaining)}% left`:''})`);toast(`${d.drink?'Drank':'Ate'} • ${Math.round(amt)}%`)
}
function drinkFromContainer(itemId,portion){
 const it=S.inventoryItems.find(x=>x.id===itemId);if(!it||it.lifecycleType!=='container')return;if(it.stored){toast('Take it out of storage first.');return}
 if((it.contents||0)<=0){toast(`The ${it.name.toLowerCase()} is empty. Refill it first.`);return}
 const ml=Math.round(portion==='little'?Math.min(100,it.contents):portion==='half'?it.contents/2:it.contents);
 it.contents=Math.max(0,it.contents-ml);S.needs.comfort=clamp(S.needs.comfort+ml/600*24);S.needs.toilet=clamp(S.needs.toilet+ml/600*10);it.timesUsed=(it.timesUsed||0)+1;if(chance(4))setItemCondition(it,it.condition-1);
 advanceTime(3);log('Drank water',`You drink ${ml} ml from your ${it.name.toLowerCase()}. ${it.contents>0?`${Math.round(it.contents)} ml left.`:'Now it is empty.'} (Comfort +${Math.round(ml/600*24)})`);toast(`Water • ${Math.round(it.contents)}/${it.capacity} ml`)
}
function refillContainer(itemId){
 const it=S.inventoryItems.find(x=>x.id===itemId);if(!it||it.lifecycleType!=='container')return;
 if(!['Home','School'].includes(S.location)){toast('There is no tap here to refill it.');return}
 const cap=Math.round(it.capacity*(it.condition<20?.75:1));if(it.contents>=cap){toast('It is already full.');return}
 it.contents=cap;advanceTime(2);log('Refilled your bottle',`${cap} ml of water.${it.condition<20?' It leaks a little now, so you cannot fill it all the way.':''}`);toast('Bottle refilled')
}
function cleanItem(itemId){const it=S.inventoryItems.find(x=>x.id===itemId);if(!it)return;it.lastCleaned=currentDate();setItemCondition(it,Math.min(100,it.condition+2));advanceTime(5);log(`Cleaned ${it.name.toLowerCase()}`,'Rinsed and scrubbed. It looks better cared for.')}
function chargeDevice(itemId){const it=S.inventoryItems.find(x=>x.id===itemId);if(!it||it.battery==null)return;if(it.battery>=98){toast('Already charged.');return}advanceTime(Math.round((100-it.battery)*.6));it.battery=100;if(catalogItem(it.key)?.phone)syncPhoneState();toast(`${it.name} charged`)}
function toggleWear(itemId){
 const it=S.inventoryItems.find(x=>x.id===itemId);if(!it)return;const d=catalogItem(it.key);if(!d?.slot){toast('You cannot wear that.');return}
 if(!it.equipped&&it.condition<=0){toast(`${it.name} is too worn out to wear.`);return}
 if(it.equipped){it.equipped=false;advanceTime(2);feedback(`Took off ${it.name.toLowerCase()}`,'',2);return}
 const prev=equippedIn(d.slot);if(prev)prev.equipped=false;it.equipped=true;it.stored=false;advanceTime(3);
 feedback(`Wearing ${it.name.toLowerCase()}`,`${SLOT_LABEL[d.slot]} slot${prev?` (instead of ${prev.name.toLowerCase()})`:''}.`,3)
}
function repairItem(itemId){
 const it=S.inventoryItems.find(x=>x.id===itemId);if(!it)return;const d=catalogItem(it.key);
 if(!hasCondition(it.lifecycleType)){toast('There is nothing to repair.');return}
 if(!d.repairable&&!['wearable'].includes(it.lifecycleType)){toast('This cannot really be repaired.');return}
 if(it.condition>=90){toast('It does not need repair.');return}
 const cost=Math.max(3,Math.round(d.price*.12*((100-it.condition)/50)));
 if(S.age<18){if(!caregiverApproval(cost>60?-5:6)){toast(`A caregiver does not approve the ${money(cost)} repair.`);return}}else if(!spendOwn(cost)){toast(`The repair costs ${money(cost)}.`);return}
 const before=it.condition;setItemCondition(it,Math.min(before<=0?70:95,before+45));advanceTime(it.lifecycleType==='device'?60:30);
 log(`Repaired ${it.name.toLowerCase()}`,`${it.lifecycleType==='wearable'?'Stitched and patched.':it.lifecycleType==='device'?'A repair shop fixes it up.':'Fixed up and working again.'} Condition ${Math.round(before)}% → ${Math.round(it.condition)}%${S.age<18?' (household paid)':` • ${money(cost)}`}.`);toast(`Repaired • ${Math.round(it.condition)}%`)
}
function sellItem(itemId){
 const it=S.inventoryItems.find(x=>x.id===itemId);if(!it)return;if(S.age<18&&!caregiverApproval(8)){log('Sale permission denied',`A caregiver does not agree to selling ${it.name}.`);return}
 const unit=(it.quantity||1)>1?itemValue(it)/(it.quantity):itemValue(it),value=Math.max(1,Math.round(unit*(.75+Math.random()*.35)));
 const parts=hasCondition(it.lifecycleType)&&it.condition<=0;removeItem(it.id,true);S.money+=value;advanceTime(20);
 let story=parts?`You sell the broken ${it.name.toLowerCase()} for parts.`:`You sell the ${it.name.toLowerCase()}.`;
 if(it.sentimental>=35&&it.origin){setEmotion('Wistful',`You sold ${it.name}.`,45);S.happiness=clamp(S.happiness-2);story+=` ${it.origin} Letting it go stings a little.`}
 log(`Sold ${it.name.toLowerCase()}`,`${story} You get ${money(value)}.`);toast(`Sold • ${money(value)}`)
}
function discardItem(itemId){const it=S.inventoryItems.find(x=>x.id===itemId);if(!it)return;if(!confirm(`Throw away ${it.quantity>1?'one ':''}${it.name}? This cannot be undone.`))return;removeItem(it.id,true);log(`Threw away ${it.name.toLowerCase()}`,it.sentimental>=35&&it.origin?`${it.origin} It is gone now.`:'It is no longer in your things.')}
function useInventoryItem(id,action='use'){
 const it=S.inventoryItems.find(x=>x.id===id);if(!it)return;
 if(action==='wear')return toggleWear(id);if(action==='repair')return repairItem(id);if(action==='sell')return sellItem(id);if(action==='discard')return discardItem(id);
 if(action==='store'){it.stored=!it.stored;if(it.stored)it.equipped=false;if(catalogItem(it.key)?.phone)syncPhoneState();feedback(it.stored?`Stored ${it.name.toLowerCase()}`:`Took out ${it.name.toLowerCase()}`,'',2);return}
 if(action==='charge')return chargeDevice(id);if(action==='refill')return refillContainer(id);if(action==='clean')return cleanItem(id);
 if(action==='activatePhone'){S.phone.activeItemId=it.id;it.stored=false;syncPhoneState();feedback(`Switched to ${it.name}`,'Your messages and apps move over.',10);return}
 if(action==='use'){if(catalogItem(it.key)?.phone){active='phone';return}const u=itemUses(it)[0];if(u)return performItemUse(id,u.id);if(['consumable','perishable'].includes(it.lifecycleType))return eatPortion(id,'all');if(it.lifecycleType==='container')return drinkFromContainer(id,'little');toast(`${it.name} is used automatically when relevant.`)}
}
// ---------- Gifts ----------
function openGiftPersonModal(personId,itemId=null){
 if(itemId){const it=S.inventoryItems.find(x=>x.id===itemId);if(!it)return;openModal(`Give ${it.name} to…`,`<div class="modal-action-grid">${S.people.map(p=>`<button data-gift-item="${it.id}" data-gift-person="${p.id}">${esc(p.name)}</button>`).join('')}</div>`);return}
 const p=personById(personId);if(!p)return;const items=S.inventoryItems.filter(i=>!i.stored&&i.id!==S.phone.activeItemId&&!(i.opened&&['consumable','perishable'].includes(i.lifecycleType)));
 if(!items.length){toast('You do not have a suitable item to gift.');return}
 openModal(`Give something to ${firstName(p)}`,`<div class="modal-action-grid">${items.map(i=>`<button data-gift-item="${i.id}" data-gift-person="${p.id}">${catalogItem(i.key)?.icon||''} ${esc(i.name)}${i.quantity>1?` ×${i.quantity}`:''} <small>${i.sentimental>=35?'means something to you':money(itemValue(i)/(i.quantity||1))}</small></button>`).join('')}</div>`)
}

// ---------- Migration of item records ----------
function normalizeInventory(){
 S.inventoryItems=Array.isArray(S.inventoryItems)?S.inventoryItems:[];S.phone=Object.assign({owned:false,model:null,price:600,condition:100,appsUnlocked:[],activeItemId:null},S.phone||{});ensureSkills();
 const existing=new Set(S.inventoryItems.map(i=>i.key));
 for(const k of S.possessions||[]){const key=D.catalog[k]?k:itemKeyFromLegacyName(k);if(key&&!existing.has(key)){S.inventoryItems.push(makeItemInstance(key,'Legacy possession'));existing.add(key)}}
 for(const [key,count] of Object.entries(S.inventory||{})){if(!D.catalog[key]||count<=0)continue;for(let n=S.inventoryItems.filter(i=>i.key===key).reduce((a,i)=>a+(i.quantity||1),0);n<count;n++)S.inventoryItems.push(makeItemInstance(key,'Legacy inventory'))}
 if(S.phone.owned&&!phoneItems().length){const key=S.phone.price<=300?'phoneUsed':S.phone.price>=900?'phoneFlagship':'phone';const it=makeItemInstance(key,'Existing phone',S.phone.condition??100);it.name=S.phone.model||it.name;S.inventoryItems.push(it)}
 for(const it of S.inventoryItems){
  it.id=it.id||uid('item');const d=catalogItem(it.key);if(!d){it.lifecycleType=it.lifecycleType||'durable';continue}
  const lt=it.lifecycleType||lifecycleOf(d);it.lifecycleType=lt;it.name=it.name||d.name;it.category=d.category;
  it.quantity=Math.max(1,Math.round(it.quantity||1));it.opened=!!it.opened;it.timesUsed=it.timesUsed||0;it.useLog=it.useLog||{date:null,count:0};it.acquiredDate=it.acquiredDate||currentDate();
  if(it.remaining==null)it.remaining=lt==='finite'?clamp(it.condition??100):100;
  if(!hasCondition(lt))it.condition=100;else it.condition=clamp(it.condition??100);
  if(lt==='container'){it.capacity=it.capacity||d.capacity||500;it.contents=it.contents??it.capacity}
  if(lt==='progress'){it.progress=it.progress??0;it.completions=it.completions??0}
  if(lt==='perishable'&&!it.freshUntil)it.freshUntil=addDays(currentDate(),d.freshnessDays||3);
  if(d.battery&&it.battery==null)it.battery=100;
  if(d.slot)it.slot=d.slot;else{it.slot=null;it.equipped=false}
  if(it.origin===undefined)it.origin=/gift|Christmas|Birthday/i.test(it.source||'')?`${it.source.replace(/^./,c=>c.toUpperCase())}.`:null;
  delete it.currentValue
 }
 // merge legacy duplicates of stackable, unopened items into one stack
 const stacks={};S.inventoryItems=S.inventoryItems.filter(it=>{const d=catalogItem(it.key);if(!d?.stackable||it.opened||it.stored)return true;const k=it.key+'|'+(it.freshUntil||'');if(stacks[k]){stacks[k].quantity+=it.quantity;return false}stacks[k]=it;return true});
 // one equipped item per slot
 const used=new Set();for(const it of S.inventoryItems)if(it.equipped){if(!it.slot||used.has(it.slot))it.equipped=false;else used.add(it.slot)}
 if(S.phone.activeItemId&&!phoneItems().some(i=>i.id===S.phone.activeItemId))S.phone.activeItemId=null;
 syncPhoneState();syncLegacyInventory()
}
// ---------- Weather gear in daily life ----------
function weatherAdvice(){const w=S.weather.type;if(['Rainy','Stormy'].includes(w))return hasWeatherGear('rain')?'You have rain protection ready.':'Rain gear (umbrella or raincoat) would make outdoor plans easier.';if(w==='Hot')return S.homeAmenities.ac?'A/C is available at home. Water still matters.':'Use a fan, shade and water to manage the heat.';if(w==='Cool')return hasWeatherGear('cold')?'You are dressed warmly.':S.homeAmenities.fireplace?'The fireplace can warm the house. Wear something warm outside.':'Wear a sweater or hoodie before going out.';if(w==='Sunny')return hasWeatherGear('sun')?'Sunglasses or a cap help in the glare.':'Water and sun protection help outside.';return 'Weather should not block most normal plans.'}
function applyWeatherGear(p,mins){
 const w=S.weather.type;if(!p.weatherSensitive)return mins;
 if(['Rainy','Stormy'].includes(w)){if(hasWeatherGear('rain')){const u=findUsable('umbrella');if(u&&chance(25))setItemCondition(u,u.condition-2);S.needs.comfort=clamp(S.needs.comfort-3);log('Ready for the rain','Your rain gear keeps you mostly dry.');return mins}S.needs.comfort=clamp(S.needs.comfort-15);log('Weather cuts the outing short','You are not prepared for the rain and come home soaked.');return Math.round(mins*.65)}
 if(w==='Cool'){if(hasWeatherGear('cold'))S.needs.comfort=clamp(S.needs.comfort+4);else{S.needs.comfort=clamp(S.needs.comfort-9);log('Underdressed','The wind cuts right through you. You wish you had worn something warmer.')}}
 if(w==='Sunny'||w==='Hot'){if(hasWeatherGear('sun'))S.needs.comfort=clamp(S.needs.comfort+3);else S.needs.comfort=clamp(S.needs.comfort-4)}
 return mins
}
// ---------- Purchasing ----------
function canBuyItem(key,qty=1){
 const d=catalogItem(key);if(!d)return {ok:false,reason:'Unknown item.'};
 if(S.age<d.minAge)return {ok:false,reason:`This item becomes relevant around age ${d.minAge}.`};
 if(d.maxQuantity&&unitCount(key)+qty>d.maxQuantity)return {ok:false,reason:`You already have plenty (${unitCount(key)}).`};
 const total=d.price*qty;if(availableFunds()<total)return {ok:false,reason:`You need ${money(total-availableFunds())} more.`};
 const usingManaged=S.age<13&&S.money+(S.finance.savings||0)<total&&(S.finance.parentSavings||0)>0;
 if(S.age<18&&(total>=d.permissionPrice||usingManaged))return {ok:true,needsPermission:true};
 return {ok:true,needsPermission:false}
}
function buyWithOwnMoney(key,qty=1){
 qty=Math.max(1,Math.min(10,Math.round(Number(qty)||1)));const d=catalogItem(key),check=canBuyItem(key,qty);if(!check.ok){toast(check.reason);return}
 const total=d.price*qty;
 if(check.needsPermission&&S.age<18){const score=purchaseScore(d,false);if(score<45){log('Purchase permission denied',`You ask to spend your own ${money(total)} on ${d.name}, but your caregivers say no for now.`);setEmotion('Disappointed','A purchase request was denied.',45);return}log('Purchase approved',`Your caregivers let you spend your own money on ${d.name}.`)}
 if(!spendOwn(total)){toast('Not enough money.');return}addItem(key,'own money',null,{quantity:qty});advanceTime(15);feedback(`Bought ${qty>1?qty+'× ':''}${d.name}`,`${money(total)} spent`,15)
}

// ---------- v7.2 Inventory & store UI ----------
let shopCat='All',invFilter='All';
const CAT_TONE={'Food & drinks':'food','Books':'books','Toys & games':'toys','Arts & crafts':'arts','School supplies':'school','Clothes':'clothes','Beauty & care':'beauty','Sports':'sports','Electronics':'tech','Gifts':'gifts','Weather & outdoors':'weather','Furniture':'home','Transport':'transport'};
function itemIcon(key){return catalogItem(key)?.icon||'📦'}
function progressLabel(it){const p=Math.round(it.progress||0),t=catalogItem(it.key)?.progressType;if(p>=100)return it.completions>1?`Finished ×${it.completions}`:'Finished';if(p===0&&!it.completions)return t==='reading'?'Unread':'Not started';return `${it.rereading?(t==='reading'?'Rereading':'Replaying')+' • ':''}${p}%`}
function itemStatus(it){
 const d=catalogItem(it.key)||{},lt=it.lifecycleType;
 if(lt==='consumable')return it.opened?{label:`${Math.round(it.remaining)}% remaining`,meter:it.remaining}:{label:it.quantity>1?`${it.quantity} unopened`:'Unopened • 100%',meter:100};
 if(lt==='perishable')return {label:`${freshnessLabel(it)} • ${it.opened?Math.round(it.remaining)+'% remaining':it.quantity>1?it.quantity+' items':'whole'}${freshDaysLeft(it)>=0?` • ${freshDaysLeft(it)}d left`:''}`,meter:it.remaining,tone:isSpoiled(it)?'bad':freshDaysLeft(it)<0?'warn':''};
 if(lt==='finite'){const left=Math.max(0,Math.round((it.remaining/100)*(d.units||100)));return {label:`${Math.round(it.remaining)}% remaining${d.unitLabel?` • ≈${left} ${d.unitLabel} left`:''}${it.quantity>1?` • +${it.quantity-1} unopened`:''}`,meter:it.remaining,tone:it.remaining<20?'warn':''}}
 if(lt==='progress')return {label:progressLabel(it)+(it.quantity>1?` • ×${it.quantity}`:''),meter:it.progress||0};
 if(lt==='gift')return {label:it.quantity>1?`Ready to give • ×${it.quantity}`:'Ready to give'};
 if(lt==='container')return {label:`${conditionLabel(it.condition)} • Condition ${Math.round(it.condition)}% • Water ${Math.round(it.contents)} / ${it.capacity} ml`,meter:100*it.contents/it.capacity};
 const parts=[`${conditionLabel(it.condition)} • Condition ${Math.round(it.condition)}%`];if(it.battery!=null)parts.push(`Battery ${Math.round(it.battery)}%`);
 return {label:parts.join(' • '),meter:it.condition,tone:it.condition<20?'bad':it.condition<45?'warn':''}
}
function effectChips(keyOrD){const d=typeof keyOrD==='string'?catalogItem(keyOrD):keyOrD;return (d?.effectLabels||[]).slice(0,4).map(e=>`<span class="fx-chip">${esc(e)}</span>`).join('')}
function productTypeLabel(d){const lt=lifecycleOf(d);return lt==='consumable'?(d.drink?'1 drink':'1 serving • eat in portions'):lt==='perishable'?`Fresh for ${d.freshnessDays} days`:lt==='finite'?`${d.units} ${d.unitLabel}`:lt==='wearable'?`Wearable • ${SLOT_LABEL[d.slot]||'clothing'}`:lt==='device'?`Device${d.battery?' • battery':''}`:lt==='container'?`${d.capacity} ml • refillable`:lt==='progress'?({reading:'Read at your own pace',story:'Long story game',exercises:'Practice workbook',pieces:'500 pieces'})[d.progressType]||'Progress':lt==='gift'?'Give to someone':'Reusable'}
function itemCardActions(it){
 const d=catalogItem(it.key)||{},lt=it.lifecycleType,b=[],more=[];const btn=(attrs,label,cls='small')=>`<button class="${cls}" ${attrs}>${esc(label)}</button>`;
 if(it.stored)b.push(btn(`data-item-action="store" data-item-id="${it.id}"`,'Take out'));
 else{
  if(['consumable','perishable'].includes(lt)&&!d.gift){b.push(btn(`data-item-portion="little" data-item-id="${it.id}"`,d.drink?'Sip':'Eat a little'),btn(`data-item-portion="half" data-item-id="${it.id}"`,d.drink?'Drink half':'Eat half'),btn(`data-item-portion="all" data-item-id="${it.id}"`,d.drink?'Finish':'Eat all'))}
  if(lt==='container'){b.push(btn(`data-container="little" data-item-id="${it.id}"`,'Drink a little'),btn(`data-container="half" data-item-id="${it.id}"`,'Drink half'),btn(`data-container="all" data-item-id="${it.id}"`,'Finish water'),btn(`data-item-action="refill" data-item-id="${it.id}"`,'Refill','small ghost'));more.push(btn(`data-item-action="clean" data-item-id="${it.id}"`,'Clean','small ghost'))}
  for(const u of itemUses(it).slice(0,4))b.push(btn(`data-item-use="${u.id}" data-item-id="${it.id}"`,u.id==='read'&&it.progress>=100?'Reread':u.label));
  if(d.phone){if(it.id===S.phone.activeItemId)b.push(btn(`data-tab-jump="phone"`,'Open phone'));else b.push(btn(`data-item-action="activatePhone" data-item-id="${it.id}"`,'Switch to this phone'))}
  if(d.slot)b.push(btn(`data-item-action="wear" data-item-id="${it.id}"`,it.equipped?'Take off':'Wear'));
  if(it.battery!=null&&it.battery<98)more.push(btn(`data-item-action="charge" data-item-id="${it.id}"`,'Charge','small ghost'));
  if(hasCondition(lt)&&it.condition<90&&(d.repairable||lt==='wearable'))(it.condition<45?b:more).push(btn(`data-item-action="repair" data-item-id="${it.id}"`,it.condition<=0?'Repair':'Repair','small ghost'));
  more.push(btn(`data-item-action="gift" data-item-id="${it.id}"`,'Gift','small ghost'));
  more.push(btn(`data-item-action="store" data-item-id="${it.id}"`,'Store','small ghost'));
 }
 more.push(btn(`data-item-action="sell" data-item-id="${it.id}"`,hasCondition(lt)&&it.condition<=0?'Sell for parts':`Sell (~${money(itemValue(it)/(it.quantity||1))})`,'small ghost'),btn(`data-item-action="discard" data-item-id="${it.id}"`,'Discard','small ghost'));
 return `<div class="item-actions">${b.join('')}<details class="more-menu"><summary>More</summary><div>${more.join('')}</div></details></div>`
}
function inventoryCard(it){
 const d=catalogItem(it.key)||{},st=itemStatus(it),tone=CAT_TONE[it.category]||'misc';
 const fx=['consumable','perishable','gift'].includes(it.lifecycleType)?'':effectChips(d);
 return `<article class="item-card tone-${tone} ${it.stored?'is-stored':''} ${it.equipped?'is-equipped':''}"><div class="item-icon" aria-hidden="true">${itemIcon(it.key)}</div><div class="item-body"><div class="item-title"><b>${esc(it.name)}${it.quantity>1&&!['finite','progress'].includes(it.lifecycleType)?` ×${it.quantity}`:''}</b>${it.equipped?'<span class="tag ok">Wearing</span>':''}${d.phone&&it.id===S.phone.activeItemId?'<span class="tag ok">In use</span>':d.phone?'<span class="tag">Spare</span>':''}${it.stored?'<span class="tag">Stored</span>':''}</div><small class="item-sub">${esc(it.category)} · ${esc(LIFECYCLE_LABEL[it.lifecycleType]||'Item')}${it.slot?` · ${SLOT_LABEL[it.slot]}`:''}</small><div class="item-status ${st.tone||''}">${esc(st.label)}</div>${st.meter!=null?`<div class="item-meter ${st.tone||''}"><i style="width:${clamp(st.meter)}%"></i></div>`:''}${fx?`<div class="fx-row">${fx}</div>`:''}${it.origin?`<p class="item-origin">${esc(it.origin)}</p>`:''}<small class="item-sub">Since ${formatDate(it.acquiredDate)}${it.timesUsed?` · used ${it.timesUsed}×`:''}</small>${itemCardActions(it)}</div></article>`
}
function inventoryHtml(){
 const items=S.inventoryItems;if(!items.length)return '<p class="muted-text">You do not own any personal items yet.</p>';
 const groups=['All','Wearing',...new Set(items.map(i=>i.category))];if(!groups.includes(invFilter))invFilter='All';
 const shown=items.filter(i=>invFilter==='All'||(invFilter==='Wearing'?i.equipped:i.category===invFilter)).sort((a,b)=>(a.stored-b.stored)||a.category.localeCompare(b.category)||a.name.localeCompare(b.name));
 const worn=Object.keys(SLOT_LABEL).map(s=>{const e=equippedIn(s);return e?`<span class="slot-chip"><em>${SLOT_LABEL[s]}</em> ${itemIcon(e.key)} ${esc(e.name)}</span>`:''}).filter(Boolean).join('');
 return `${worn?`<div class="slot-row">${worn}</div>`:''}<div class="filter-row">${groups.map(g=>`<button class="filter-chip ${invFilter===g?'active':''}" data-inv-filter="${esc(g)}">${esc(g)}</button>`).join('')}</div><div class="item-grid">${shown.map(inventoryCard).join('')||'<p class="muted-text">Nothing here.</p>'}</div>`
}
function storeHtml(){
 const seasonOpen=d=>!d.seasonal||unitCount(Object.keys(D.catalog).find(k=>D.catalog[k]===d))>0||upcomingHolidays(8).some(x=>d.seasonal.includes(x.h.id)&&daysBetween(currentDate(),x.dateISO)<=21),visible=Object.entries(D.catalog).filter(([,d])=>S.age>=Math.max(0,d.minAge-3)&&seasonOpen(d)),cats=['All',...new Set(visible.map(([,d])=>d.category))];if(!cats.includes(shopCat))shopCat='All';
 const list=visible.filter(([,d])=>shopCat==='All'||d.category===shopCat);
 return `<div class="filter-row">${cats.map(c=>`<button class="filter-chip ${shopCat===c?'active':''}" data-shop-cat="${esc(c)}">${esc(c)}</button>`).join('')}</div><div class="product-grid">${list.map(([key,d])=>{
  const owned=unitCount(key),relevant=S.age>=d.minAge,tone=CAT_TONE[d.category]||'misc',qty=d.stackable&&d.price<=20;
  const perm=S.age<18&&d.price>=d.permissionPrice?'<small class="perm-note">Needs caregiver OK</small>':'';
  return `<article class="product-card tone-${tone} ${relevant?'':'is-later'}"><div class="product-art" aria-hidden="true">${d.icon||'📦'}</div><div class="product-body"><div class="product-head"><b>${esc(d.name)}</b><strong>${money(d.price)}</strong></div><p>${esc(d.description)}</p><div class="fx-row">${effectChips(d)}</div>${d.seasonal?'<small class="perm-note">Seasonal • optional</small>':''}<small class="product-type">${esc(productTypeLabel(d))}${owned?` · <b>Owned ×${owned}</b>`:''}</small>${!relevant?`<small class="perm-note">More relevant around age ${d.minAge}</small>`:d.phone&&S.age<D.ageRules.phone?'<small class="perm-note">Can own now • independent use later</small>':perm}${relevant?`<div class="product-actions">${qty?`<select class="qty-select" data-qty-for="${key}" aria-label="Quantity">${[1,2,3,4,5].map(n=>`<option>${n}</option>`).join('')}</select>`:''}<button class="small primary" data-shop-own="${key}">${S.age<18?'Buy with my money':'Buy'}</button>${S.age<18?`<button class="small" data-shop-parent="${key}">Ask caregiver</button><button class="small ghost" data-shop-birthday="${key}">Birthday wish</button>${S.traditions.christmas?`<button class="small ghost" data-shop-christmas="${key}">Christmas wish</button>`:''}`:''}</div>`:''}</div></article>`}).join('')}</div>`
}
function businessPanel(){
 const openReq=S.giftRequests.filter(r=>!r.resolved),pending=pendingOpen().filter(p=>/purchase/i.test(p.type)||p.type==='conditionalPurchase');
 const chores=S.age>=5?D.chores.filter(c=>S.age>=c.minAge).map(c=>`<button class="action compact" data-chore="${c.id}"><strong>${esc(c.name)}</strong><small>${c.minutes} min • allowance may be ${money(c.pay[0])}–${money(c.pay[1])}</small></button>`).join(''):'';
 const sellable=S.inventoryItems.filter(i=>!i.stored&&i.id!==S.phone.activeItemId),st=S.stall;
 return `<div class="dashboard"><section class="card"><h3>Money</h3>${statRow('Cash',money(S.money))}${statRow('Savings',money(S.finance.savings))}${S.age<13?statRow('Parent-managed savings',money(S.finance.parentSavings)):''}${statRow('Things you own',`${S.inventoryItems.reduce((a,i)=>a+(i.quantity||1),0)} items • worth ~${money(S.inventoryItems.reduce((a,i)=>a+itemValue(i),0))}`)}${statRow('Responsibility',Math.round(S.family.responsibility||0)+'%')}<div class="inline-actions"><button data-act="saveMoney" data-arg="25">Save $25</button>${S.age>=18?'<button data-act="invest">Invest $50</button>':''}</div></section><section class="card"><h3>Pending requests</h3>${openReq.length?openReq.slice(0,5).map(r=>`<div class="row"><span><b>${esc(r.item||catalogItem(r.itemKey)?.name)}</b><br><small>${esc(r.status||'Waiting')} • ${esc(r.occasion)}</small></span><button class="small ghost" data-gift-askagain="${r.id}">Ask again</button></div>`).join(''):'<p class="muted-text">No birthday/holiday wishes pending.</p>'}${pending.map(p=>`<div class="row"><span><b>${esc(p.title)}</b><br><small>${esc(p.detail||p.status)}</small></span>${statusTag(p.status)}</div>`).join('')}</section><section class="card wide"><div class="section-heading"><div><h3>Your things</h3><p class="muted-text">Each item shows what matters for it: portions left, supplies left, condition, battery, or progress.</p></div></div>${inventoryHtml()}</section><section class="card wide"><div class="section-heading"><div><h3>Shop</h3><p class="muted-text">${S.age<18?'Your own money still needs a caregiver OK for bigger purchases. You can also ask them, or save a wish for a birthday or holiday.':'Everything here has a real use in daily life.'}</p></div></div>${storeHtml()}</section>${S.age>=5?`<section class="card wide"><h3>Chores & allowance</h3><div class="action-grid">${chores}</div></section>`:''}<section class="card wide"><h3>Small business</h3><p class="muted-text">From age ${D.ageRules.smallBusiness}, small selling can happen with caregiver approval/supervision. Weather, traffic, quality, price, sign, luck and help affect sales.</p>${S.age>=D.ageRules.smallBusiness?`<div class="business-builder"><label>Product<select id="stand-product">${D.standProducts.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select></label><label>Price<input id="stand-price" type="number" min="1" max="50" value="3"></label><label>Stock<input id="stand-stock" type="number" min="3" max="40" value="10"></label><label>Location<select id="stand-location">${D.standLocations.filter(l=>S.age>=l.minAge).map(l=>`<option value="${l.id}">${esc(l.name)}</option>`).join('')}</select></label><label>Hours<input id="stand-hours" type="number" min="1" max="5" value="2"></label><label>Quality<input id="stand-quality" type="range" min="20" max="100" value="70"></label><label>Sign quality<input id="stand-sign" type="range" min="0" max="100" value="60"></label><label>Exaggerate pitch<input id="stand-exaggeration" type="range" min="0" max="100" value="20"></label><label class="check-line"><input id="stand-parent-help" type="checkbox" ${S.age<13?'checked disabled':''}> Parent/caregiver helps</label><button id="open-stand">${S.age<16?'Ask & open stand':'Open stand'}</button></div>`:'<p class="locked-note">You are too young to organize a stand; you may only help a caregiver.</p>'}${st?.active&&st.type==='Stand'?`<div class="stage-note"><b>${esc(st.items[0].name)} stand is open</b> • ${st.items[0].stock} left • ${money(st.revenue)} revenue • reputation ${Math.round(st.reputation)}%<div class="inline-actions"><button data-stall-work="1">Work another session</button><button class="ghost" data-stall-close="1">Close</button></div></div>`:''}</section><section class="card wide"><h3>Yard sale</h3>${S.age>=D.ageRules.smallBusiness?sellable.length?`<div class="business-builder"><label>Item<select id="yard-item">${sellable.map(i=>`<option value="${i.id}">${esc(i.name)} • value ~${money(itemValue(i)/(i.quantity||1))}</option>`).join('')}</select></label><label>Asking price<input id="yard-price" type="number" min="1" value="20"></label><button id="open-yard">${S.age<16?'Ask & list item':'List item'}</button></div>`:'<p class="muted-text">You need a possession to sell.</p>':'<p class="locked-note">A caregiver must lead selling at this age.</p>'}${st?.active&&st.type==='Yard Sale'?`<div class="stage-note"><b>${esc(st.items[0].name)}</b> listed at ${money(st.items[0].price)}<div class="inline-actions"><button data-yard="accept">Accept next offer</button><button data-yard="counter">Counteroffer</button><button data-yard="hold">Hold firm</button></div></div>`:''}</section></div>`
}
function yourThingsHtml(){
 const seen=new Set(),btns=[];
 for(const it of S.inventoryItems){if(it.stored||seen.has(it.key))continue;const d=catalogItem(it.key);if(!d)continue;
  if(hasCondition(it.lifecycleType)&&it.condition<=0)continue;
  if(['consumable','perishable'].includes(it.lifecycleType)&&!d.gift){seen.add(it.key);btns.push(`<button class="action" data-item-portion="all" data-item-id="${it.id}"><strong>${d.icon} ${d.drink?'Drink':'Eat'} ${esc(it.name.toLowerCase())}</strong><small>${esc(itemStatus(it).label)}</small></button>`);continue}
  if(it.lifecycleType==='container'){seen.add(it.key);btns.push(`<button class="action" data-container="little" data-item-id="${it.id}"><strong>${d.icon} Drink from bottle</strong><small>${Math.round(it.contents)} / ${it.capacity} ml</small></button>`);continue}
  const u=itemUses(it)[0];if(!u)continue;seen.add(it.key);btns.push(`<button class="action" data-item-use="${u.id}" data-item-id="${it.id}"><strong>${d.icon} ${esc(u.id==='read'&&it.progress>=100?'Reread':u.label)} • ${esc(it.name.toLowerCase())}</strong><small>${esc(itemStatus(it).label)}</small></button>`)}
 return btns.length?`<div class="action-section"><h3>Use your things</h3><p class="muted-text">Owned items open up better versions of everyday activities. Repeating the same thing in one day gives smaller gains.</p><div class="action-grid">${btns.slice(0,10).join('')}</div></div>`:''
}
function skillsHtml(){const s=ensureSkills(),rows=[['reading',S.development.skills.reading],...Object.entries(s)].filter(([,v])=>v>=1).sort((a,b)=>b[1]-a[1]);return rows.length?rows.map(([k,v])=>`<div class="skill-line"><span>${esc(SKILL_LABEL[k]||k)}</span><div class="progress"><i style="width:${clamp(v)}%"></i></div><b>${Math.round(v)}</b></div>`).join(''):'<p class="muted-text">Skills grow when you practice with books, supplies, sports gear and devices.</p>'}
function handleInventoryClick(b){
 const d=b.dataset;
 if(d.invFilter){invFilter=d.invFilter;render();return true}
 if(d.shopCat){shopCat=d.shopCat;render();return true}
 if(d.itemUse){performItemUse(d.itemId,d.itemUse);save();render();return true}
 if(d.itemPortion){eatPortion(d.itemId,d.itemPortion);save();render();return true}
 if(d.container){drinkFromContainer(d.itemId,d.container);save();render();return true}
 if(d.shopOwn){const sel=document.querySelector(`[data-qty-for="${d.shopOwn}"]`);buyWithOwnMoney(d.shopOwn,sel?Number(sel.value):1);save();render();return true}
 return false
}

// =====================================================================
// v7.2 SCHOOL STAGES, GRADUATION & THE INTERACTIVE SCHOOL DAY
// Checking in records attendance; time then runs period by period and
// the player chooses what to do in each one.
// =====================================================================
const SCHOOL_NAMES={primary:['Riverside Primary School','Maple Grove Elementary','Sunrise Primary School','Westside Elementary','Lakeview Primary School'],middle:['Riverside Middle School','Central Middle School','Sunrise Junior High','Westside Middle School'],high:['Riverside High School','Central International High School','Sunrise Secondary School','Westside High School']};
const STAGE_LABEL={kindergarten:'kindergarten',primary:'primary school',middle:'middle school',high:'high school'};
function stageForAge(age){return age<=5?'kindergarten':age<=11?'primary':age<=14?'middle':'high'}
function stageOfSchool(sc){if(!sc)return null;if(sc.grade==='Kindergarten')return 'kindergarten';if(/Middle/.test(sc.grade))return 'middle';if(/High/.test(sc.grade))return 'high';return 'primary'}
function nameMatchesStage(name,stage){if(stage==='primary')return !/Secondary|High|Middle|Junior/i.test(name);if(stage==='middle')return /Middle|Junior/i.test(name);if(stage==='high')return /High|Secondary/i.test(name);return true}
function schoolNameFor(stage,prev=null){const base=prev?String(prev).split(' ')[0]:null,pool=SCHOOL_NAMES[stage]||SCHOOL_NAMES.primary;return pool.find(n=>base&&n.startsWith(base))||rand(pool)}
function buildSchool(age,carry=null){
 if(age>=3&&age<=5&&S.development.kindergarten.enrolled)return {name:carry?.grade==='Kindergarten'?carry.name:rand(['Little Steps Kindergarten','Sunflower Early Learning','Neighborhood Kindergarten']),grade:'Kindergarten',className:carry?.className||rand(['Sun','Moon','Rainbow','Bears']),attendance:carry?.attendance??96,behavior:72,gpa:null,rank:null,subjects:[makeSubject('Language & stories',0),makeSubject('Numbers & patterns',1),makeSubject('Movement',2),makeSubject('Social skills',3)],clubs:[],activityOffers:[],contests:[],friends:[],rivals:[],yearStarted:currentDate(),startedDate:carry?.startedDate||currentDate()};
 if(age<6||age>17)return null;
 const stage=stageForAge(age),same=!!carry&&stageOfSchool(carry)===stage;
 return {name:same?carry.name:schoolNameFor(stage,carry&&carry.grade!=='Kindergarten'?carry.name:null),grade:gradeLabel(age),className:`${Math.max(1,age-5)}-${String.fromCharCode(65+Math.floor(Math.random()*4))}`,attendance:carry?.attendance??96,behavior:carry?.behavior??70,gpa:age>=12?(carry?.gpa??3.1):null,rank:age>=12?(carry?.rank??Math.floor(8+Math.random()*22)):null,
  subjects:subjectNames(age).map((n,i)=>{const old=carry?.subjects?.find(s=>s.name===n);if(!old)return makeSubject(n,i);const s=Object.assign(makeSubject(n,i),old,{prep:0,homework:{status:'None',progress:0,dueDate:null}});if(!same)s.teacher={name:teacherName(n),rel:50+Math.floor(Math.random()*15)};return s}),
  clubs:same?(carry?.clubs||[]).filter(c=>c.status==='Active'):[],activityOffers:[],contests:[],friends:carry?.friends||[],rivals:carry?.rivals||[],yearStarted:currentDate(),startedDate:same?(carry.startedDate||currentDate()):currentDate(),stage}
}
function recordGraduation(stage,schoolName,{year=null,silent=false}={}){
 S.education=S.education||{graduations:[]};if(S.education.graduations.some(g=>g.stage===stage))return;
 const y=year||parseISO(currentDate()).getUTCFullYear(),g={stage,school:schoolName||STAGE_LABEL[stage],year:y,age:S.age,dateISO:currentDate()};S.education.graduations.push(g);
 const title=`🎓 Finished ${STAGE_LABEL[stage]}`,text=`You graduated from ${g.school} in ${y}.`;
 S.development.milestones=S.development.milestones||[];S.development.milestones.unshift(`${title} — ${g.school}, ${y}`);
 if(silent){S.milestones.unshift({dateISO:currentDate(),age:S.age,title,text})}else log(title,text+(stage==='kindergarten'?' Next stop: real school, with a timetable and homework.':stage==='high'?' A whole new part of life begins.':' A new school, new hallways and new people are next.'),true)
}
function reconcileEducationHistory(){
 S.education=Object.assign({graduations:[]},S.education||{});
 const k=S.development?.kindergarten;
 if(S.age>=6&&k?.enrolled&&!S.education.graduations.some(g=>g.stage==='kindergarten')){const y=parseISO(sixthBirthday()).getUTCFullYear();recordGraduation('kindergarten',k.schoolName||'kindergarten',{year:y,silent:true})}
 if(S.school&&S.school.grade!=='Kindergarten'){const st=stageForAge(gradeNumber()+5);S.school.stage=st;if(!nameMatchesStage(S.school.name,st)){const old=S.school.name;S.school.name=schoolNameFor(st,old);for(const e of S.calendar)if(e.type==='schoolDay'&&!isTerminal(e.status))e.title=`School • ${S.school.name}`}}
}

// ---------- Timetable ----------
const SCHOOL_PERIODS=[{id:'p1',start:480,end:540,label:'Period 1'},{id:'p2',start:540,end:600,label:'Period 2'},{id:'p3',start:600,end:660,label:'Period 3'},{id:'lunch',start:660,end:720,label:'Lunch'},{id:'p4',start:720,end:780,label:'Period 4'},{id:'p5',start:780,end:840,label:'Period 5'},{id:'p6',start:840,end:900,label:'Period 6'}];
function weekdayIndex(dateISO){return (parseISO(dateISO).getUTCDay()+6)%7}
function timetableFor(dateISO=currentDate()){
 const subs=S.school?.subjects||[];if(!subs.length)return [];const w=weekdayIndex(dateISO);let k=0;
 return SCHOOL_PERIODS.map(p=>p.id==='lunch'?{...p,kind:'lunch'}:{...p,kind:'class',subject:subs[(w*6+(k++))%subs.length].name})
}
function periodAt(m=currentMinute()){return timetableFor().find(p=>m>=p.start&&m<p.end)||null}
function atSchool(){const sd=schoolDayEvent();return !!sd&&sd.status==='Attending'&&currentMinute()<SCHOOL_DAY.end&&S.location==='School'}
function sessionEvent(){const sd=schoolDayEvent();return sd&&sd.status==='Attending'?sd:null}
function dueAtSchoolNow(){const m=currentMinute(),today=currentDate();const exams=S.exams.filter(e=>examIsOpen(e)&&e.dateISO===today&&e.minute<SCHOOL_DAY.end&&m>=e.minute-5&&m<=e.graceMinute);const contests=S.calendar.filter(e=>e.type==='schoolEvent'&&e.dateISO===today&&!isTerminal(e.status)&&e.startMinute<SCHOOL_DAY.end&&m>=e.startMinute-5&&m<=e.graceMinute);return {exams,contests}}

// ---------- Session flow ----------
function checkInToSchool(opts={}){
 const ev=ensureSchoolDayObligation();if(!ev)return false;
 let m=currentMinute();if(m<SCHOOL_DAY.start)advanceTime(SCHOOL_DAY.start-m,{silent:true});m=currentMinute();
 const tardy=m>SCHOOL_DAY.tardyAfter;setCalendarStatus(ev,'Attending',tardy?'Arrived late':'Checked in');ev.attendanceStatus=tardy?'Tardy':'Present';ev.checkIn=m;ev.periods=ev.periods||{};S.location='School';
 const t=ensureTeacher(S.school.subjects[0])?.name||'your homeroom teacher';
 log(tardy?'Checked in late':'Checked in at school',tardy?rand([`You sign in at the front office at ${timeLabel(m)}. The secretary hands you a late slip without looking up.`,`You slip into homeroom after the bell. ${t} marks you tardy.`]):rand([`You make it in before the bell. ${t} takes attendance.`,`Homeroom. Announcements, attendance, a lot of yawning.`]));
 toast(tardy?'Checked in • tardy':'Checked in • on time');return true
}
function sessionGain(sub,minutes,{focus=1,social=0,teacher=0}={}){const f=minutes/60;sub.skill=clamp(sub.skill+(1.2*focus*f)*Math.max(.2,1-sub.skill/140));sub.prep=clamp(sub.prep+(3*focus*f));if(teacher)ensureTeacher(sub).rel=clamp(sub.teacher.rel+teacher);if(social)S.needs.social=clamp(S.needs.social+social*f)}
function classAction(kind){
 const ev=sessionEvent();if(!ev||!atSchool()){toast('You are not at school right now.');return}
 const p=periodAt();if(!p||p.kind!=='class'){toast('There is no class right now.');return}
 const {exams}=dueAtSchoolNow();if(exams.length&&kind!=='skip'){toast(`Your ${exams[0].subject} assessment is now — take it first.`);return}
 const sub=S.school.subjects.find(s=>s.name===p.subject);if(!sub)return;const t=ensureTeacher(sub),mins=Math.max(5,p.end-currentMinute()),friend=bestNonFamily(),fn=firstName(friend);
 let story;ev.periods[p.id]=kind;
 if(kind==='attend'){sessionGain(sub,mins,{focus:S.needs.sleep<35?.6:1});story=rand([`${sub.name} with ${t.name}. You take decent notes.`,`You follow along in ${sub.name}. One idea finally makes sense.`,`${t.name} runs ${sub.name} at full speed; you keep up, mostly.`])+(S.needs.sleep<35?' You are tired, so less of it sticks.':'')}
 else if(kind==='participate'){if(S.energy<15){toast('You are too tired to participate actively.');return}sessionGain(sub,mins,{focus:1.4,teacher:1.5});addRep('academic',.3);S.energy=clamp(S.energy-4);const right=chance(40+sub.skill*.5);story=right?`You raise your hand in ${sub.name} and get it right. ${t.name} looks pleased.`:`You answer a question in ${sub.name} and get it wrong, but ${t.name} walks you through it. You remember it now.`}
 else if(kind==='chat'){sessionGain(sub,mins,{focus:.35,social:10});if(chance(20))setTimeout(()=>{},0),meetNewPeople('school');if(friend){friend.rel=clamp(friend.rel+2);rememberPerson(friend,`You chatted during ${sub.name}.`)}addRep('social',.3);if(chance(t.style==='Strict'?45:22)){t.rel=clamp(t.rel-3);addRep('troublemaker',1);story=`You and ${fn||'a classmate'} whisper through ${sub.name} until ${t.name} stops mid-sentence and stares at you both.`}else story=`You and ${fn||'a classmate'} pass notes through ${sub.name}. Fun — but you missed most of the lesson.`}
 else if(kind==='skip'){ev.skipped=(ev.skipped||0)+1;S.needs.fun=clamp(S.needs.fun+6);S.stress=clamp(S.stress+2);const rec=ensureSchoolRecord();rec.classesSkipped=(rec.classesSkipped||0)+1;addRep('troublemaker',2);
  if(chance(30+ev.skipped*15)){t.rel=clamp(t.rel-5);S.school.behavior=clamp(S.school.behavior-3);story=`You hide out in the stairwell during ${sub.name}. A hall monitor finds you. ${t.name} will hear about it.`;if(S.age<18)scheduleFollowUp('absenceNotice',{dateISO:currentDate(),count:Math.max(2,rec.absences+1)},{minute:1050})}else story=`You skip ${sub.name} and wander the empty corridors. Nobody notices — this time.`;}
 advanceTime(mins,{silent:true});log(`${p.label} • ${sub.name}`,story)
}
function lunchAction(kind,arg){
 const ev=sessionEvent();if(!ev||!atSchool()){toast('You are not at school right now.');return}
 const p=periodAt();if(!p||p.kind!=='lunch'){toast('It is not lunch time.');return}
 const friend=bestNonFamily(),fn=firstName(friend);let mins=25,story;
 if(kind==='eat'){if(ev.ateLunch){toast('You already ate.');return}ev.ateLunch=true;S.needs.hunger=clamp(S.needs.hunger-50);S.energy=clamp(S.energy+5);story=rand(['Cafeteria lunch: pasta that is better than it looks.','You eat quickly so you have time for other things.','The lunch line is long, but the food is warm.']);mins=20}
 else if(kind==='friend'){addRep('social',.5);if(friend){friend.rel=clamp(friend.rel+4);friend.fun=clamp(friend.fun+3);rememberPerson(friend,'You spent lunch together.')}S.needs.social=clamp(S.needs.social+16);if(!ev.ateLunch){ev.ateLunch=true;S.needs.hunger=clamp(S.needs.hunger-40)}story=friend?rand([`You and ${fn} share lunch and a long, ridiculous conversation.`,`${fn} saves you a seat. You talk about everything except school.`]):'You sit with some classmates and slowly join the conversation.'}
 else if(kind==='library'){const sub=S.school.subjects.find(s=>s.name===arg)||bestPrepSubject();if(!sub)return;sub.prep=clamp(sub.prep+(findUsable('deskLamp')?6:5));sub.skill=clamp(sub.skill+1);sub.lastStudyDate=currentDate();story=`You spend lunch in the library working on ${sub.name}. Quiet, focused, a little lonely.`;mins=30}
 else if(kind==='teacher'){const sub=S.school.subjects.find(s=>s.name===arg)||bestPrepSubject();if(!sub)return;const t=ensureTeacher(sub);t.rel=clamp(t.rel+3);sub.prep=clamp(sub.prep+6);story=`You visit ${t.name} at lunch with questions about ${sub.name}. ${t.style==='Warm'?'They are delighted.':t.style==='Strict'?'They seem surprised, then genuinely helpful.':'They take the time to explain.'}`;mins=20}
 mins=Math.min(mins,p.end-currentMinute());advanceTime(Math.max(5,mins),{silent:true});log(`Lunch • ${kind==='eat'?'cafeteria':kind==='friend'?'with friends':kind==='library'?'library':'teacher visit'}`,story)
}
function finishSchoolDay(ev,{early=false,quiet=false}={}){
 if(!ev||ev.status!=='Attending')return;const tardy=ev.attendanceStatus==='Tardy',rec=ensureSchoolRecord();
 const done=Object.keys(ev.periods||{}).length,skipped=ev.skipped||0;
 if(early){rec.leftEarly=(rec.leftEarly||0)+1;S.school.attendance=clamp(S.school.attendance-.6)}
 markSchoolAttendance(ev,{tardy});if(early)ev.attendanceStatus=tardy?'Tardy, left early':'Left early';
 S.location='Home';S.energy=clamp(S.energy-(equippedIn('bag')?5:7));if(chance(40))generateHomework(false);
 if(!quiet)log(early?'Left school early':'School day over',early?`You leave before the final bell at ${timeLabel(currentMinute())}.${S.age<18?' The school will note it.':''}`:`The final bell rings. ${done?`You went through ${done} part${done===1?'':'s'} of the day yourself`:'The day passed in a blur'}${skipped?`, skipped ${skipped} class${skipped===1?'':'es'}`:''}${tardy?', and arrived late':''}.`);
 if(early&&S.age<18&&chance(45))scheduleFollowUp('absenceNotice',{dateISO:currentDate(),count:Math.max(2,rec.absences+1)},{minute:Math.max(currentMinute()+60,1050)});
 clearCurrentContextIfSourceResolved()
}
function skipToDismissal(){
 const ev=sessionEvent();if(!ev||!atSchool()){toast('You are not at school right now.');return}
 const {exams}=dueAtSchoolNow();if(exams.length){toast(`Take your ${exams[0].subject} assessment first, or skip it explicitly.`);return}
 for(const p of timetableFor()){if(p.end<=currentMinute())continue;if(ev.periods[p.id])continue;
  const {exams:ex}=dueAtSchoolNow();if(ex.length)break;
  if(p.kind==='class'){const sub=S.school.subjects.find(s=>s.name===p.subject);if(sub)sessionGain(sub,Math.max(5,p.end-Math.max(p.start,currentMinute())),{focus:.8});ev.periods[p.id]='auto'}
  else{if(!ev.ateLunch){ev.ateLunch=true;S.needs.hunger=clamp(S.needs.hunger-45)}ev.periods[p.id]='auto'}
  advanceTime(Math.max(1,p.end-currentMinute()),{silent:true});if(sessionEvent()==null)break;
  const nx=dueAtSchoolNow();if(nx.exams.length||nx.contests.length)break
 }
 const left=sessionEvent();if(left&&currentMinute()>=SCHOOL_DAY.end)finishSchoolDay(left)
}
function leaveSchoolEarly(){const ev=sessionEvent();if(!ev){toast('You are not at school.');return}if(S.age<10){toast('A young child cannot just walk out of school.');return}finishSchoolDay(ev,{early:true})}
function attendSchool(opts={}){
 if(!S.school){toast('You are not currently enrolled in school.');return}
 if(S.school.grade==='Kindergarten'){
  if(!isSchoolDay()){toast(isWeekend(currentDate())?'Kindergarten is closed on weekends.':'Kindergarten is on break.');return}
  const m=currentMinute();if(m<420||m>=900){toast(m<420?'Kindergarten opens at 8:00 AM.':'Kindergarten has finished for today.');return}
  if(m<480)advanceTime(480-m,{silent:true});const mins=Math.max(60,Math.min(240,900-currentMinute()));advanceTime(mins,{silent:true});S.school.attendance=clamp(S.school.attendance+.05);S.needs.fun=clamp(S.needs.fun+10);S.needs.social=clamp(S.needs.social+12);
  feedback('Kindergarten day',rand(['Circle time, a story about a lost bear, and a long turn on the slide.','You paint something that is mostly blue and very proud of it.','A classmate shares their blocks with you after some negotiation.']),mins);return
 }
 if(!isSchoolDay()){toast(isWeekend(currentDate())?'There is no school on weekends.':'School is on break today.');return}
 const ev=ensureSchoolDayObligation();if(!ev){toast('No school day is scheduled.');return}
 if(ev.status==='Attending'){if(opts.cheatExamId){const e=S.exams.find(x=>x.id===opts.cheatExamId);if(e)performExam(e,{cheat:true,lateMinutes:Math.max(0,currentMinute()-e.minute)})}else toast('You are already at school.');return}
 if(ev.status==='Attended'){toast('You already went to school today.');return}
 if(isTerminal(ev.status)){toast(ev.status==='Excused'?'You are marked as staying home today.':`You were marked absent after ${timeLabel(SCHOOL_DAY.cutoff)}.`);return}
 const m=currentMinute();
 if(m<300){toast('It is the middle of the night. School starts at 8:00 AM — sleep first.');return}
 if(m>SCHOOL_DAY.cutoff){processCalendar();toast(m>=SCHOOL_DAY.end?'School is finished for today — you were marked absent.':`The attendance cutoff (${timeLabel(SCHOOL_DAY.cutoff)}) has passed.`);return}
 checkInToSchool(opts);
 if(opts.cheatExamId){const e=S.exams.find(x=>x.id===opts.cheatExamId);if(e&&currentMinute()<e.minute)advanceTime(e.minute-currentMinute(),{silent:true});if(e)performExam(e,{cheat:true,lateMinutes:Math.max(0,currentMinute()-e.minute)})}
 if(opts.examId){const e=S.exams.find(x=>x.id===opts.examId);if(e&&examIsOpen(e)){if(currentMinute()<e.minute){advanceTime(e.minute-currentMinute(),{silent:true})}if(examIsOpen(e))performExam(e,{lateMinutes:Math.max(0,currentMinute()-e.minute)})}}
}
const SCHOOL_ALLOWED_ACTS=['eat','snack','drink','toilet','washHands','washFace','rest','school','nextDay','ageUp','giftThank','giftExcited','giftHide','giftComplain','giftHug'];
function atSchoolBlocks(id){if(!atSchool())return false;if(SCHOOL_ALLOWED_ACTS.includes(id))return false;toast(`You are at school until ${timeLabel(SCHOOL_DAY.end)}. Use the school options — or leave early.`);return true}

// ---------- Session UI ----------
function schoolSessionHtml(){
 if(!needsFormalSchool())return '';const sd=schoolDayEvent(),m=currentMinute(),tt=isSchoolDay()?timetableFor():[];
 if(!isSchoolDay())return `<p class="muted-text">${isWeekend(currentDate())?'Weekend — no classes.':'School break — no classes.'}</p>`;
 const ttHtml=`<ol class="timetable">${tt.map(p=>{const exam=S.exams.find(e=>e.dateISO===currentDate()&&e.minute>=p.start&&e.minute<p.end&&e.minute<SCHOOL_DAY.end),contest=S.calendar.find(e=>e.type==='schoolEvent'&&e.dateISO===currentDate()&&e.startMinute>=p.start&&e.startMinute<p.end),now=m>=p.start&&m<p.end&&sd?.status==='Attending',past=m>=p.end,did=sd?.periods?.[p.id];
  return `<li class="${now?'is-now':''} ${past?'is-past':''}"><span class="tt-time">${timeLabel(p.start)}</span><b>${p.kind==='lunch'?'Lunch':esc(p.subject)}</b>${exam?`<em class="tt-flag">${esc(exam.type)}${examIsOpen(exam)?'':' • '+esc(exam.status==='Completed'?exam.score+'%':exam.status)}</em>`:''}${contest?`<em class="tt-flag">${esc(contest.title)}</em>`:''}${did?`<small>${did==='auto'?'attended':did==='skip'?'skipped':did}</small>`:''}</li>`}).join('')}</ol>`;
 if(!sd||!['Attending'].includes(sd.status)){
  const can=sd&&!isTerminal(sd.status)&&m<=SCHOOL_DAY.cutoff&&m>=300;
  return `<div class="session-card"><div class="session-head"><div><b>${esc(schoolDayStatus())}</b><small>${can?(m>SCHOOL_DAY.tardyAfter?`You can still check in late until ${timeLabel(SCHOOL_DAY.cutoff)}.`:`Check in by ${timeLabel(SCHOOL_DAY.tardyAfter)} to be on time.`):sd?.status==='Attended'?`Attendance: ${esc(sd.attendanceStatus||'Present')}`:''}</small></div>${can?`<button class="primary" data-act="school">${m<SCHOOL_DAY.start?'Go to school':'Check in now'}</button>`:''}</div>${ttHtml}</div>`
 }
 const p=periodAt(),{exams,contests}=dueAtSchoolNow(),btn=(attrs,label,cls='')=>`<button class="${cls}" ${attrs}>${esc(label)}</button>`;let now='',actions=[];
 if(exams.length){const e=exams[0];now=`<b>${esc(e.subject)} ${esc(e.type)}</b><small>${m<=e.endMinute?`Now • until ${timeLabel(e.endMinute)}`:`Late sitting allowed until ${timeLabel(e.graceMinute)}`}</small>`;actions.push(btn(`data-exam-take="${e.id}"`,'Take assessment','primary'),btn(`data-exam-cheat="${e.id}"`,'Attempt cheat','ghost'))}
 else if(contests.length){const c=contests[0],ct=contestById(c.payload?.contestId);now=`<b>${esc(c.title)}</b><small>In the hall • check in by ${timeLabel(c.graceMinute)}. Going means missing class.</small>`;actions.push(btn(`data-contest-attend="${ct?.id}"`,'Go to the event','primary'))}
 if(p&&p.kind==='class'&&!exams.length){now+=`${now?'<hr>':''}<b>${esc(p.label)} • ${esc(p.subject)}</b><small>${esc(ensureTeacher(S.school.subjects.find(s=>s.name===p.subject))?.name||'')} • until ${timeLabel(p.end)}</small>`;actions.push(btn('data-class="attend"','Pay attention',contests.length?'':'primary'),btn('data-class="participate"','Participate'),btn('data-class="chat"','Chat with a friend','ghost'),btn('data-class="skip"','Skip this class','ghost'))}
 if(p&&p.kind==='lunch'){now+=`${now?'<hr>':''}<b>Lunch break</b><small>Until ${timeLabel(p.end)}${sd.ateLunch?' • you have eaten':''}</small>`;const sub=bestPrepSubject()?.name||'';actions.push(...(sd.ateLunch?[]:[btn('data-lunch="eat"','Eat in the cafeteria','primary')]),btn('data-lunch="friend"','Sit with friends'),btn(`data-lunch="library" data-arg="${esc(sub)}"`,`Library: study ${sub}`,'ghost'),btn(`data-lunch="teacher" data-arg="${esc(sub)}"`,`Visit ${sub} teacher`,'ghost'))}
 return `<div class="session-card is-live"><div class="session-head"><div class="session-now">${now||'<b>Between classes</b>'}</div><span class="tag ok">At school • ${esc(sd.attendanceStatus||'Present')}</span></div><div class="session-actions">${actions.join('')}</div><div class="session-foot"><button class="small ghost" data-school-skip="1">Skip ahead to dismissal</button>${S.age>=10?'<button class="small ghost" data-school-leave="1">Leave school early</button>':''}</div>${ttHtml}</div>`
}
function handleSchoolClick(b){
 const d=b.dataset;
 if(d.class){classAction(d.class);save();render();return true}
 if(d.lunch){lunchAction(d.lunch,d.arg);save();render();return true}
 if(d.schoolSkip){skipToDismissal();save();render();return true}
 if(d.schoolLeave){leaveSchoolEarly();save();render();return true}
 return false
}
function spreadExamDates(){
 const byDate={};for(const e of S.exams.filter(x=>examIsOpen(x)&&!x.makeupOf&&x.dateISO>currentDate()).sort((a,b)=>a.dateISO.localeCompare(b.dateISO))){let d=e.dateISO;while((byDate[d]||0)>=1)d=nextSchoolDay(addDays(d,1));if(d!==e.dateISO)e.dateISO=d;byDate[d]=(byDate[d]||0)+1}
}

// ---------- v7.2 navigation: numbered sub-tabs instead of long scrolling pages ----------
// UI preferences are stored separately from the simulation save.
const UI_KEY='lifeSim_ui';
function loadUI(){try{return Object.assign({subTab:{},logOpen:false,theme:'light'},JSON.parse(localStorage.getItem(UI_KEY)||'{}'))}catch(e){return {subTab:{},logOpen:false,theme:'light'}}}
let UI=loadUI();
function saveUI(){try{localStorage.setItem(UI_KEY,JSON.stringify(UI))}catch(e){}}
const PANEL_TABS={
 home:[['now','Now'],['today','Today'],['inbox','Inbox']],
 places:[['care','Care'],['activities','Activities'],['things','Your things'],['out','Go out']],
 school:[['today','Today'],['subjects','Subjects'],['exams','Assessments'],['attendance','Attendance'],['activities','Clubs & events']],
 business:[['things','Your things'],['shop','Shop'],['money','Money & chores'],['selling','Selling']],
 calendar:[['month','Month'],['today','Today'],['upcoming','Upcoming'],['history','History']],
 world:[['world','World'],['journal','Journal']]
};
const SECTION_RULES={
 home:[[/attention|happening|gift|holiday|prom/i,'now'],[/today|right now/i,'today'],[/notification|pending/i,'inbox']],
 places:[[/daily life/i,'care'],[/use your things|skills/i,'things'],[/go out|weather/i,'out'],[/.*/,'activities']],
 school:[[/attendance/i,'attendance'],[/assessment/i,'exams'],[/subjects/i,'subjects'],[/clubs|competitions/i,'activities'],[/.*/,'today']],
 business:[[/your things/i,'things'],[/^shop/i,'shop'],[/money|pending|chores/i,'money'],[/business|yard/i,'selling']],
 calendar:[[/^(?:[A-Z][a-z]+ \d{4})|month/i,'month'],[/upcoming/i,'upcoming'],[/recently|holidays this year/i,'history'],[/.*/,'today']],
 world:[[/journal|milestone|education|life log/i,'journal'],[/.*/,'world']]
};
function subTabBadges(panel){
 const b={};
 if(panel==='home'){const n=activeNotifications().filter(x=>x.status==='Unread').length+pendingOpen().length;if(n)b.inbox=n}
 if(panel==='school'&&S.school){if(sessionEvent()||S.exams.some(e=>examIsOpen(e)&&e.dateISO===currentDate()))b.today='!';const n=S.exams.filter(e=>examIsOpen(e)&&daysBetween(currentDate(),e.dateISO)<=3).length;if(n)b.exams=n;const h=S.school.subjects.filter(s=>HW_OPEN.includes(s.homework?.status)).length;if(h)b.subjects=h}
 if(panel==='places'){const n=Object.entries(S.needs).filter(([k,v])=>needDisplayValue(k,v)<=30).length;if(n)b.care=n}
 if(panel==='business'){const n=S.inventoryItems.filter(i=>(hasCondition(i.lifecycleType)&&i.condition<20)||isSpoiled(i)).length;if(n)b.things=n}
 if(panel==='calendar'){const n=todayAgenda().filter(a=>!a.done).length;if(n)b.today=n}
 return b
}
function applySubTabs(){
 const tabs=PANEL_TABS[active],host=$('panel-host');if(!tabs||!host)return;
 const rules=SECTION_RULES[active]||[],secs=[...host.querySelectorAll('.dashboard > section, .dashboard > .person-card')];
 for(const s of secs){if(s.dataset.sub)continue;const h=(s.querySelector('h3,h4')?.textContent||'').trim();const r=rules.find(([re])=>re.test(h));s.dataset.sub=r?r[1]:tabs[0][0]}
 const present=tabs.filter(([id])=>secs.some(s=>s.dataset.sub===id));if(present.length<2)return;
 let cur=UI.subTab[active];if(!present.some(t=>t[0]===cur))cur=present[0][0];
 const badges=subTabBadges(active),bar=document.createElement('nav');bar.className='subtabs';bar.setAttribute('aria-label','Sections');
 bar.innerHTML=present.map(([id,label],i)=>`<button class="subtab ${id===cur?'active':''}" data-subtab="${id}" aria-pressed="${id===cur}"><kbd>${i+1}</kbd><span>${esc(label)}</span>${badges[id]?`<em class="subtab-badge">${badges[id]}</em>`:''}</button>`).join('');
 host.prepend(bar);for(const s of secs)s.hidden=s.dataset.sub!==cur
}
function switchSubTab(id){UI.subTab[active]=id;saveUI();renderPanel();renderHeader();const h=$('panel-host');if(h&&h.getBoundingClientRect().top<0)h.scrollIntoView({block:'start'})}
function handleUIClick(b){
 const d=b.dataset;
 if(d.subtab){switchSubTab(d.subtab);return true}
 if(d.calMonth){calShift(Number(d.calMonth));render();return true}
 if(d.calToday){calView=null;calSelected=currentDate();render();return true}
 if(d.calDay){calSelected=d.calDay;render();return true}
 if(d.calFilter){calFilter=calFilter===d.calFilter?null:d.calFilter;render();return true}
 if(d.holidayAct){doHolidayActivity(d.holidayAct,d.arg);save();render();return true}
 if(d.plannerToggle){document.body.classList.toggle('planner-open');return true}
 return false
}
document.addEventListener('keydown',e=>{
 if(!S||e.altKey||e.ctrlKey||e.metaKey)return;const tag=(e.target?.tagName||'').toLowerCase();if(['input','select','textarea'].includes(tag))return;
 if(!$('choice-overlay').classList.contains('hidden')||!$('overlay').classList.contains('hidden'))return;
 if(/^[1-9]$/.test(e.key)){const btn=document.querySelectorAll('#panel-host .subtab')[Number(e.key)-1];if(btn){e.preventDefault();switchSubTab(btn.dataset.subtab)}}
 else if(e.key==='n'||e.key==='N'){e.preventDefault();nextDay();save();render()}
});
// ---------- Life log drawer (no longer a long list under every page) ----------
function renderLog(){
 const host=$('log');if(!host)return;const latest=S.log[0];
 const sum=$('log-latest');if(sum)sum.textContent=latest?`${latest.title} — ${timeLabel(latest.minute||0)}`:'';
 host.innerHTML=S.log.slice(0,8).map(e=>`<div class="log-entry"><div class="log-date">${e.dateISO?formatDate(e.dateISO):'DAY '+e.day} • ${timeLabel(e.minute||0)} • AGE ${e.age}</div><b>${esc(e.title)}</b><p>${esc(e.text)}</p></div>`).join('')||'<p class="muted-text">Your life log is empty.</p>';
 const dr=$('log-drawer');if(dr&&dr.open!==!!UI.logOpen)dr.open=!!UI.logOpen
}
function educationHistoryHtml(){
 const g=(S.education?.graduations||[]).slice().sort((a,b)=>a.year-b.year);const h=S.schoolHistory||[];
 const now=S.school?`<div class="timeline-entry"><span>Now</span><b>${esc(S.school.grade)} • ${esc(S.school.name)}</b></div>`:'';
 return `${now}${g.map(x=>`<div class="timeline-entry"><span>${x.year} • age ${x.age}</span><b>🎓 Finished ${esc(STAGE_LABEL[x.stage]||x.stage)}</b><p>${esc(x.school)}</p></div>`).join('')}${h.filter(x=>x.grade!=='Kindergarten').slice(0,6).map(x=>`<div class="timeline-entry"><span>${formatDate(x.endedDate)}</span><b>${esc(x.grade)} • ${esc(x.school)}</b><p>Average ${x.average}% • attendance ${x.attendance}%${x.record?` • ${x.record.absences} absences`:''}</p></div>`).join('')}`||'<p class="muted-text">Education history appears as you move through school.</p>'
}
function worldPanel(){
 const t=travelMode();const weather=S.weather.forecast?.length?S.weather.forecast.map(x=>`<div class="forecast"><span>${weatherIcon(x.type)}</span><b>${esc(x.type)}</b><small>${x.temp}°C<br>${formatDate(x.dateISO)}</small></div>`).join(''):'';
 return `<div class="dashboard"><section class="card"><h3>Travel</h3>${statRow('Trips / outings',S.travel.trips)}${statRow('Current rule',esc(t.label))}<p class="muted-text">${esc(t.note)}</p><button data-act="trip">${esc(t.label)}</button></section><section class="card"><h3>Weather</h3><div class="weather-big">${weatherIcon(S.weather.type)} ${esc(S.weather.type)} • ${S.weather.temp}°C</div><p class="muted-text">Humidity ${S.weather.humidity}% • ${esc(weatherAdvice())}</p><div class="forecast-row">${weather}</div></section><section class="card"><h3>Milestones</h3>${S.milestones.slice(0,12).map(m=>`<div class="timeline-entry"><span>${formatDate(m.dateISO||currentDate())} • Age ${m.age}</span><b>${esc(m.title)}</b><p>${esc(m.text)}</p></div>`).join('')||'<p class="muted-text">Important milestones will collect here over time.</p>'}</section><section class="card"><h3>Education history</h3>${educationHistoryHtml()}</section><section class="card"><h3>Neighborhood</h3>${neighborhoodHtml()}</section><section class="card"><h3>Awards</h3>${(S.awards||[]).slice(0,10).map(a=>`<div class="timeline-entry"><span>${a.year} • ${esc(a.grade)}</span><b>🏅 ${esc(a.name)}</b></div>`).join('')||'<p class="muted-text">End-of-year awards appear here.</p>'}</section><section class="card"><h3>Story threads</h3>${threadsHtml()}</section><section class="card"><h3>Outcome history</h3>${outcomesHtml()}</section><section class="card wide"><h3>Life log</h3><div class="log">${S.log.slice(0,60).map(e=>`<div class="log-entry"><div class="log-date">${e.dateISO?formatDate(e.dateISO):'DAY '+e.day} • ${timeLabel(e.minute||0)} • AGE ${e.age}</div><b>${esc(e.title)}</b><p>${esc(e.text)}</p></div>`).join('')}</div></section></div>`
}
function placesPanel(){
 const places=D.placesOutside.filter(p=>S.age>=p.minAge&&(!p.maxAge||S.age<=p.maxAge)),things=yourThingsHtml();
 return `<div class="dashboard"><section class="card wide"><div class="section-heading"><div><h3>Daily Life • ${lifeStage()}</h3><p class="muted-text">Core physiological actions stay accessible; the method changes with age and development.</p></div><span class="tag">${timeLabel(currentMinute())}</span></div>${careCards()}</section><section class="card wide">${personalCards()}</section><section class="card wide">${things||'<h3>Use your things</h3><p class="muted-text">Items you own (books, art supplies, a bike, a ball…) add better versions of everyday activities here.</p>'}</section><section class="card"><h3>Skills & hobbies</h3>${skillsHtml()}</section><section class="card wide"><h3>Go out</h3><p class="muted-text">Transport: ${esc(localTransport())}. Children and teens use supervision/permission rules automatically.</p><div class="place-grid">${places.map(p=>`<button class="place-card" data-place="${p.id}"><b>${esc(p.name)}</b><small>${p.minutes>=120?Math.round(p.minutes/60)+'h':p.minutes+' min'}${p.cost?` • about ${money(S.age<13?0:p.cost)}`:' • free'}</small></button>`).join('')}</div></section><section class="card"><h3>Weather comfort</h3><p class="muted-text">${esc(weatherAdvice())}</p><div class="inline-actions">${S.homeAmenities.fan?'<button data-act="comfort" data-arg="fan">Use fan</button>':''}${S.homeAmenities.ac?'<button data-act="comfort" data-arg="ac">Use A/C</button>':''}${S.homeAmenities.fireplace?'<button data-act="comfort" data-arg="fireplace">Use fireplace</button>':''}</div></section></div>`
}

// =====================================================================
// v7.2 PHASE 3 — HOLIDAY ENGINE
// holidayDefinitions + date resolvers + regional calendar profiles.
// No holiday is hardcoded to a fixed day when its real date moves.
// =====================================================================
const LUNAR_NEW_YEAR={1998:'01-28',1999:'02-16',2000:'02-05',2001:'01-24',2002:'02-12',2003:'02-01',2004:'01-22',2005:'02-09',2006:'01-29',2007:'02-18',2008:'02-07',2009:'01-26',2010:'02-14',2011:'02-03',2012:'01-23',2013:'02-10',2014:'01-31',2015:'02-19',2016:'02-08',2017:'01-28',2018:'02-16',2019:'02-05',2020:'01-25',2021:'02-12',2022:'02-01',2023:'01-22',2024:'02-10',2025:'01-29',2026:'02-17',2027:'02-06',2028:'01-26',2029:'02-13',2030:'02-03',2031:'01-23',2032:'02-11',2033:'01-31',2034:'02-19',2035:'02-08',2036:'01-28',2037:'02-15',2038:'02-04',2039:'01-24',2040:'02-12',2041:'02-01',2042:'01-22',2043:'02-10',2044:'01-30',2045:'02-17',2046:'02-06',2047:'01-26',2048:'02-14',2049:'02-02',2050:'01-23'};
const LUNAR_OVERRIDES={VN:{2007:'02-17'}};
function lunarNewYearDate(year,region){
 const md=LUNAR_OVERRIDES[region]?.[year]||LUNAR_NEW_YEAR[year];if(md)return `${year}-${md}`;
 // Outside the table: second new moon after the December solstice (mean lunation, UTC+8). Accurate to about ±1 day.
 const ref=Date.UTC(2000,0,6,18,14),syn=29.530588853*86400000,sol=Date.UTC(year-1,11,21,12);
 let n=Math.ceil((sol-ref)/syn),t=ref+n*syn;if(t<=sol)t+=syn;t+=syn;const d=new Date(t+8*3600000);return isoDate(new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate())))
}
function easterDate(y){const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),mo=Math.floor((h+l-7*m+114)/31),da=((h+l-7*m+114)%31)+1;return `${y}-${String(mo).padStart(2,'0')}-${String(da).padStart(2,'0')}`}
function nthWeekday(y,month,weekday,n){const first=new Date(Date.UTC(y,month-1,1)),off=(weekday-first.getUTCDay()+7)%7;return isoDate(new Date(Date.UTC(y,month-1,1+off+(n-1)*7)))}
function lastWeekday(y,month,weekday){const last=new Date(Date.UTC(y,month,0)),off=(last.getUTCDay()-weekday+7)%7;return isoDate(new Date(Date.UTC(y,month-1,last.getUTCDate()-off)))}
const fixed=(m,d)=>y=>`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
function regionOf(place){const p=String(place||'');return /Vietnam/i.test(p)?'VN':/Korea/i.test(p)?'KR':/Japan|Tokyo/i.test(p)?'JP':/UK|London|England|Scotland/i.test(p)?'UK':/France|Paris/i.test(p)?'FR':/Canada|Vancouver|Toronto/i.test(p)?'CA':/USA|New York|America/i.test(p)?'US':/Singapore/i.test(p)?'SG':/Thailand|Bangkok/i.test(p)?'TH':/Australia|Sydney/i.test(p)?'AU':/China|Taiwan|Hong Kong/i.test(p)?'CN':'INTL'}

// Activity schema: id, label, minAge, maxAge, minutes, cost, days (available N days before), on (only on the day),
// fx (fun, social, happiness, stress, family), rel {target, amount}, gives {key,qty}, uses (item key that improves it), text[].
const HOLIDAYS=[
 {id:'newYear',name:'New Year',icon:'🎆',resolve:fixed(1,1),regions:'all',observe:()=>true,activities:[
  {id:'countdown',label:'Stay up for the countdown',minAge:8,minutes:60,fx:{fun:12,happiness:4},sleepCost:true,text:['Ten, nine, eight… the whole room shouts the last three seconds.','You make it to midnight, barely, and the fireworks are worth it.']},
  {id:'resolution',label:'Make a New Year resolution',minAge:7,minutes:15,fx:{stress:-2},responsibility:3,text:['You write one resolution on a sticky note and put it on your mirror.','"This year I will…" You decide to keep it simple and realistic.']},
  {id:'family',label:'New Year meal with family',minAge:0,minutes:90,fx:{social:12,fun:6},family:3,text:['Everyone is a bit tired and very happy. Leftovers for days.']}]},
 {id:'lunarNewYear',name:'Lunar New Year',icon:'🧧',resolve:(y,r)=>lunarNewYearDate(y,r),regions:['VN','KR','SG','CN'],observe:(r,t)=>['VN','KR','SG','CN'].includes(r)||!!t.lunarNewYear,durationDays:3,activities:[
  {id:'clean',label:'Clean & decorate the home',minAge:4,minutes:60,days:5,fx:{stress:-2},family:3,responsibility:2,text:['You scrub, sweep and hang red decorations. The house feels new.','Your job is the windows. You do a surprisingly good job.']},
  {id:'newClothes',label:'Wear new clothes',minAge:2,minutes:15,on:true,needsNew:true,fx:{happiness:5},text:['New clothes for a new year. You feel lucky in them.']},
  {id:'wish',label:'Wish elders a happy new year',minAge:3,minutes:30,on:true,luckyMoney:true,family:3,text:['You bow and say the wishes you practiced. Red envelopes appear.','Grandmother pinches your cheek and presses an envelope into your hand.']},
  {id:'gathering',label:'Family gathering & traditional meal',minAge:0,minutes:150,on:true,fx:{social:18,fun:8},family:4,drama:15,text:['The table is crowded and loud. Somebody tells the same story as last year.','A huge meal, endless refills, cousins everywhere.']},
  {id:'visit',label:'Visit relatives',minAge:0,minutes:180,on:true,fx:{social:14},family:3,text:['A day of visits — tea, snacks and the same questions about school at every house.']},
  {id:'giveMoney',label:'Give lucky money to younger kids',minAge:18,minutes:20,on:true,cost:40,family:3,fx:{happiness:4},text:['Now you are the one handing out red envelopes. The kids are thrilled.']},
  {id:'photos',label:'Take family photos',minAge:6,minutes:20,on:true,fx:{happiness:3},family:2,memory:true,text:['Everyone squeezes into one photo. Someone blinks. You take ten more.']}]},
 {id:'valentines',name:"Valentine's Day",icon:'💌',resolve:fixed(2,14),regions:'all',observe:()=>true,activities:[
  {id:'classCards',label:'Make cards for your class',minAge:5,maxAge:11,minutes:45,days:3,fx:{fun:8,social:6},skills:{art:1},text:['You make a stack of little cards with stickers. One for everyone, so nobody is left out.']},
  {id:'friendGift',label:'Give a friend a small treat',minAge:6,maxAge:17,minutes:15,on:true,rel:{target:'friend',amount:4},cost:3,text:['You hand over a small chocolate. It is small, but it makes them smile.']},
  {id:'crushCard',label:'Give a card to your crush',minAge:13,maxAge:17,minutes:15,on:true,crush:true,text:[]},
  {id:'friends',label:'Hang out with friends instead',minAge:12,minutes:120,on:true,fx:{fun:12,social:14},rel:{target:'friend',amount:3},text:['No romance required: pizza, bad movies and a lot of laughing.']},
  {id:'coupleDate',label:'Valentine date with your partner',minAge:13,minutes:0,on:true,scene:'date',text:[]},
  {id:'cardPartner',label:'Exchange cards with your partner',minAge:13,minutes:20,on:true,needsPartner:true,fx:{happiness:6},text:['You both pretend not to care about the cards, then read them three times.']},
  {id:'singles',label:'Go to a singles mixer',minAge:18,minutes:150,on:true,cost:15,meet:true,fx:{fun:8,social:12},text:['Name tags, awkward icebreakers, and one genuinely fun conversation.']},
  {id:'self',label:'Treat yourself',minAge:16,minutes:60,on:true,cost:12,fx:{happiness:5,stress:-5},text:['A quiet evening, your favorite food and zero expectations.']}]},
 {id:'womensDay',name:"International Women's Day",icon:'🌷',resolve:fixed(3,8),regions:['VN','INTL','FR','CN','KR','UK','AU','SG','TH'],observe:(r)=>['VN','CN','FR','KR','INTL','TH','SG'].includes(r),parentDay:'female',activities:[
  {id:'card',label:'Make a card for the women in your family',minAge:4,minutes:30,family:3,rel:{target:'mother',amount:4},skills:{art:.5},text:['You draw flowers on the card. Mom puts it on the fridge.']},
  {id:'help',label:'Do the housework today',minAge:7,minutes:60,family:3,responsibility:3,rel:{target:'mother',amount:3},text:['You take over the dishes and laundry. Nobody has to ask.']},
  {id:'flowers',label:'Give flowers',minAge:10,minutes:15,uses:'flowers',cost:10,rel:{target:'mother',amount:5},text:['A small bunch of flowers. It goes straight into a vase.']}]},
 {id:'easter',name:'Easter',icon:'🐣',resolve:y=>easterDate(y),regions:['US','UK','CA','AU','FR'],observe:(r,t)=>['US','UK','CA','AU','FR'].includes(r)&&!!t.christmas,activities:[
  {id:'eggHunt',label:'Easter egg hunt',minAge:2,maxAge:11,minutes:60,on:true,fx:{fun:16},gives:{key:'snackPack',qty:1},text:['You find eggs under the bench, in a flowerpot and one in a shoe.','A cousin finds more eggs than you. You find the golden one.']},
  {id:'decorate',label:'Decorate eggs',minAge:3,minutes:45,days:2,fx:{fun:10},skills:{art:1,creativity:1},text:['Dye everywhere, mostly on your hands. The eggs look great anyway.']},
  {id:'meal',label:'Easter lunch with family',minAge:0,minutes:120,on:true,fx:{social:12},family:3,text:['A long lunch with family and too much dessert.']},
  {id:'outing',label:'Spring outing',minAge:4,minutes:150,on:true,fx:{fun:10,stress:-5},family:2,outdoor:true,text:['A walk somewhere green. Spring is finally here.']}]},
 {id:'mothersDay',name:"Mother's Day",icon:'💐',resolve:(y,r)=>r==='UK'?addDays(easterDate(y),-21):r==='FR'?lastWeekday(y,5,0):r==='TH'?`${y}-08-12`:r==='KR'?`${y}-05-08`:nthWeekday(y,5,0,2),regions:'all',observe:()=>true,parentDay:'mother',activities:[
  {id:'card',label:'Make Mom a card',minAge:3,minutes:30,family:3,rel:{target:'mother',amount:5},skills:{art:.5},text:['It is lopsided and full of glitter. Mom says it is the best card she has ever gotten.']},
  {id:'breakfast',label:'Make breakfast for Mom',minAge:7,minutes:45,family:4,rel:{target:'mother',amount:6},skills:{},cooking:true,text:['Slightly burnt toast, very proud delivery.','You plan it the night before. Breakfast in bed goes surprisingly well.']},
  {id:'gift',label:'Give Mom a gift',minAge:6,minutes:15,giftTarget:'mother',text:[]},
  {id:'call',label:'Call or visit Mom',minAge:18,minutes:60,rel:{target:'mother',amount:6},text:['You talk for an hour about nothing and everything.']}]},
 {id:'fathersDay',name:"Father's Day",icon:'👔',resolve:(y,r)=>r==='AU'?nthWeekday(y,9,0,1):r==='KR'?`${y}-05-08`:r==='TH'?`${y}-12-05`:nthWeekday(y,6,0,3),regions:'all',observe:(r)=>r!=='KR',parentDay:'father',activities:[
  {id:'card',label:'Make Dad a card',minAge:3,minutes:30,family:3,rel:{target:'father',amount:5},skills:{art:.5},text:['Dad reads it twice and pretends he is not emotional.']},
  {id:'together',label:'Spend the day with Dad',minAge:3,minutes:120,family:4,rel:{target:'father',amount:6},fx:{fun:8},text:['You do whatever Dad wants today — which turns out to be fun.']},
  {id:'gift',label:'Give Dad a gift',minAge:6,minutes:15,giftTarget:'father',text:[]},
  {id:'call',label:'Call or visit Dad',minAge:18,minutes:60,rel:{target:'father',amount:6},text:['A long call. He tells the same joke as always; you laugh anyway.']}]},
 {id:'teachersDay',name:"Teachers' Day",icon:'🍎',resolve:(y,r)=>r==='VN'?`${y}-11-20`:r==='KR'?`${y}-05-15`:r==='CN'?`${y}-09-10`:r==='TH'?`${y}-01-16`:r==='SG'?nthWeekday(y,9,5,1):r==='US'?addDays(nthWeekday(y,5,1,1),1):`${y}-10-05`,regions:'all',observe:()=>true,school:true,activities:[
  {id:'thank',label:'Thank your teachers',minAge:5,maxAge:18,minutes:15,teacher:2,text:['You say thank you on your way out. Your teacher looks genuinely touched.']},
  {id:'card',label:'Give a teacher a handmade card',minAge:5,maxAge:18,minutes:30,teacher:4,skills:{art:.5},pickTeacher:true,text:['You write what you actually learned this year. Your teacher reads it twice.']},
  {id:'flowers',label:'Bring flowers to school',minAge:6,maxAge:18,minutes:15,cost:10,teacher:4,regions:['VN','CN','KR','TH'],text:['A small bouquet on the teacher\'s desk. The whole class joins in the thank-you.']},
  {id:'celebration',label:'Join the school celebration',minAge:6,maxAge:18,minutes:60,fx:{fun:8,social:8},regions:['VN','CN','TH','SG'],text:['Performances, flowers and speeches in the school yard.']}]},
 {id:'vnWomensDay',name:"Vietnamese Women's Day",icon:'🌺',resolve:fixed(10,20),regions:['VN'],observe:r=>r==='VN',parentDay:'female',activities:[
  {id:'card',label:'Make a card for Mom & Grandma',minAge:4,minutes:30,family:3,rel:{target:'mother',amount:4},text:['A card with careful handwriting. Grandma keeps it in her wallet.']},
  {id:'cook',label:'Help cook dinner',minAge:7,minutes:60,family:3,rel:{target:'mother',amount:4},cooking:true,text:['You take over the cooking tonight. Dinner is a little salty and completely appreciated.']}]},
 {id:'halloween',name:'Halloween',icon:'🎃',resolve:fixed(10,31),regions:['US','CA','UK','AU','INTL'],observe:(r)=>['US','CA','UK','AU'].includes(r),activities:[
  {id:'decorate',label:'Decorate the house',minAge:3,minutes:60,days:7,uses:'decorations',family:2,fx:{fun:8},text:['Paper bats on every window. One falls on the cat.']},
  {id:'diyCostume',label:'Make a costume (free)',minAge:4,minutes:90,days:10,makes:'costume',skills:{creativity:2,art:1},text:['Cardboard, tape and determination. It is not perfect; it is yours.']},
  {id:'trickOrTreat',label:'Go trick-or-treating',minAge:3,maxAge:13,minutes:120,on:true,evening:true,needsCostumeBonus:true,gives:{key:'candyBag',qty:2},fx:{fun:18,social:8},companion:true,text:['Porch lights, doorbells and a pillowcase that gets heavier every house.']},
  {id:'party',label:'Go to a Halloween party',minAge:13,minutes:180,on:true,evening:true,fx:{fun:16,social:16},rel:{target:'friend',amount:4},text:['Someone came as the vice principal. It was uncanny.']},
  {id:'movie',label:'Watch a scary movie',minAge:10,minutes:110,on:true,fx:{fun:10},scare:true,text:['You watch half of it through your fingers.']},
  {id:'giveCandy',label:'Give candy to visitors',minAge:12,minutes:90,on:true,evening:true,uses:'candyBag',fx:{social:6,happiness:4},text:['A parade of tiny superheroes at your door. Very cute.']},
  {id:'stayHome',label:'Stay home this year',minAge:0,minutes:10,on:true,fx:{stress:-2},text:['A quiet night in. You can hear the trick-or-treaters outside.']}]},
 {id:'thanksgiving',name:'Thanksgiving',icon:'🦃',resolve:(y,r)=>r==='CA'?nthWeekday(y,10,1,2):nthWeekday(y,11,4,4),regions:['US','CA'],observe:r=>['US','CA'].includes(r),activities:[
  {id:'dinner',label:'Family dinner',minAge:0,minutes:150,on:true,fx:{social:16},family:4,drama:18,text:['The turkey is late, the pie is perfect, and everyone talks at once.']},
  {id:'cook',label:'Help prepare the meal',minAge:7,minutes:120,on:true,family:3,cooking:true,text:['You are in charge of the potatoes. They are, frankly, excellent.']},
  {id:'thankful',label:'Say what you are thankful for',minAge:4,minutes:10,on:true,family:3,fx:{happiness:4},text:['When it is your turn, you mean it more than you expected to.']},
  {id:'sports',label:'Watch the parade or the game',minAge:3,minutes:120,on:true,fx:{fun:10},family:1,text:['Giant balloons on TV, or a close game — either way, everyone yells.']},
  {id:'volunteer',label:'Volunteer at a food drive',minAge:12,minutes:180,on:true,fx:{happiness:6},kindness:3,text:['You pack boxes for three hours. It is the most meaningful part of the holiday.']},
  {id:'friendsgiving',label:'Friendsgiving',minAge:16,minutes:180,days:3,fx:{fun:12,social:14},rel:{target:'friend',amount:4},cost:10,text:['A potluck with friends. Five people brought chips.']}]},
 {id:'christmas',name:'Christmas',icon:'🎄',resolve:fixed(12,25),regions:'all',observe:(r,t)=>!!t.christmas,gifts:true,activities:[
  {id:'decorate',label:'Decorate the tree',minAge:2,minutes:60,days:20,uses:'decorations',family:3,fx:{fun:10},text:['Lights tangle, ornaments break, the tree ends up beautiful.']},
  {id:'wishList',label:'Write a wish list',minAge:4,maxAge:15,minutes:15,days:30,jump:'business',text:['You write your list carefully. Wishes go in the shop as Christmas wishes.']},
  {id:'makeGift',label:'Make a handmade gift',minAge:5,minutes:60,days:20,makes:'giftBox',skills:{creativity:2,art:1},text:['A handmade present. It took longer than buying one; it means more.']},
  {id:'giveGifts',label:'Give gifts',minAge:5,minutes:20,on:true,jump:'people',text:['Choose who to give something to in People.']},
  {id:'meal',label:'Christmas meal with family',minAge:0,minutes:150,on:true,fx:{social:16,fun:8},family:4,drama:10,text:['Candles, too much food and a game afterwards that gets competitive.']},
  {id:'relatives',label:'Visit relatives',minAge:0,minutes:180,days:1,fx:{social:12},family:3,text:['A long drive, a warm house and cousins you only see once a year.']},
  {id:'party',label:'Christmas party with friends',minAge:14,minutes:180,days:5,fx:{fun:14,social:14},rel:{target:'friend',amount:3},text:['Secret Santa goes slightly wrong and very funny.']}]}
];
const HOLIDAY_STORE={halloween:['costume','candyBag','decorations'],christmas:['decorations','giftWrap','giftBox'],valentines:['greetingCard','flowers'],lunarNewYear:['decorations','tshirt','giftBox'],mothersDay:['flowers','greetingCard'],fathersDay:['greetingCard','giftBox'],teachersDay:['flowers','greetingCard'],womensDay:['flowers','greetingCard']};
function calendarProfile(){S.calendarProfile=Object.assign({region:regionOf(S.place),observe:{}},S.calendarProfile||{});return S.calendarProfile}
function holidayObserved(h){const p=calendarProfile();if(p.observe[h.id]!=null)return !!p.observe[h.id];return h.observe(p.region,S.traditions||{})}
function holidayDate(h,year){return h.resolve(year,calendarProfile().region)}
function holidaysOn(dateISO){const y=parseISO(dateISO).getUTCFullYear(),out=[];for(const h of HOLIDAYS){if(!holidayObserved(h))continue;for(const yy of [y,y-1]){const d=holidayDate(h,yy);if(!d)continue;const span=(h.durationDays||1)-1;if(dateISO>=d&&dateISO<=addDays(d,span))out.push({h,dateISO:d,day:daysBetween(d,dateISO)+1,year:yy})}}return out}
function upcomingHolidays(n=6,from=currentDate()){const y=parseISO(from).getUTCFullYear(),list=[];for(const h of HOLIDAYS){if(!holidayObserved(h))continue;for(const yy of [y,y+1]){const d=holidayDate(h,yy);if(d&&d>=from){list.push({h,dateISO:d,year:yy});break}}}return list.sort((a,b)=>a.dateISO.localeCompare(b.dateISO)).slice(0,n)}
function holidayWindow(){const today=currentDate(),out=[];for(const x of upcomingHolidays(12,addDays(today,-3))){const days=daysBetween(today,x.dateISO),span=(x.h.durationDays||1)-1;const maxBefore=Math.max(0,...x.h.activities.map(a=>a.days||0));if(days<=maxBefore&&days>=-span)out.push(Object.assign({},x,{days}))}return out}
function holidayFlag(x,a){return `hol-${x.h.id}-${x.year}-${a.id}`}
function availableActivities(x){const days=x.days,reg=calendarProfile().region;return x.h.activities.filter(a=>S.age>=(a.minAge||0)&&S.age<=(a.maxAge??200)&&(!a.regions||a.regions.includes(reg))&&(a.on?days<=0&&days>=-((x.h.durationDays||1)-1):days<=(a.days||0)&&days>=-((x.h.durationDays||1)-1))&&!S.flags[holidayFlag(x,a)])}
function relTarget(kind){if(kind==='mother')return S.people.find(p=>p.role==='parent'&&/Mom/.test(p.name))||S.people.find(p=>p.role==='parent');if(kind==='father')return S.people.find(p=>p.role==='parent'&&/Dad/.test(p.name))||S.people.find(p=>p.role==='parent');if(kind==='friend')return bestNonFamily();return null}
function doHolidayActivity(key,arg){
 const [hid,aid]=String(key).split(':'),x=holidayWindow().find(w=>w.h.id===hid);if(!x){toast('That holiday is not happening right now.');return}
 const a=availableActivities(x).find(z=>z.id===aid);if(!a){toast('You already did that, or it is not available now.');return}
 if(atSchool()){toast('You are at school right now.');return}
 if(a.evening&&currentMinute()<960){toast('That happens in the evening.');return}
 if(a.outdoor&&S.weather.type==='Stormy'){toast('A storm cancels outdoor plans today.');return}
 if(a.cost&&S.age>=13){if(!spendOwn(a.cost)){toast(`You need about ${money(a.cost)}.`);return}}
 if(a.jump){S.flags[holidayFlag(x,a)]=true;active=a.jump;log(`${x.h.icon} ${a.label}`,rand(a.text));return}
 if(a.scene==='date'){const pp=partnerPerson();if(!pp||!eligibleRomance(pp)){toast('You are not seeing anyone right now — hang out with friends or treat yourself instead.');return}S.flags[holidayFlag(x,a)]=true;startDate(pp.id,{valentine:true});return}
 if(a.needsPartner){const pp=partnerPerson();if(!pp){toast('You are not seeing anyone right now.');return}pp.rel=clamp(pp.rel+4);rememberPerson(pp,`Valentine's cards ${x.year}.`,2)}
 if(a.meet&&chance(45)){const n=generateHousehold({kids:1,childAge:S.age+rand([-2,0,2])})[0];const np=personFromNpc(n,'friend','met at a mixer');np.rel=50;np.attraction=60;S.people.push(np)}
 if(a.giftTarget){const p=relTarget(a.giftTarget);if(!p){toast('There is no one to give this to.');return}S.flags[holidayFlag(x,a)]=true;openGiftPersonModal(p.id);return}
 let story=rand(a.text)||'',extra=[];const fx=a.fx||{};
 if(a.uses){const it=findUsable(a.uses);if(it){if(['finite','consumable'].includes(it.lifecycleType)){const u=openOne(it);u.remaining=clamp(u.remaining-(it.lifecycleType==='finite'?34:100));if(u.remaining<=.5)removeItem(u.id)}else if(it.lifecycleType==='perishable'||catalogItem(it.key)?.gift)removeItem(it.id,true);extra.push(`Your ${it.name.toLowerCase()} made it better.`);S.happiness=clamp(S.happiness+3)}}
 if(a.needsCostumeBonus){const c=findUsable('costume');if(c){fx.fun=(fx.fun||0)+6;extra.push(`Your ${c.name.toLowerCase()} gets compliments at every door.`);setItemCondition(c,c.condition-8)}else extra.push('You go without a costume; a few neighbors ask what you are supposed to be.')}
 if(a.needsNew){const recent=S.inventoryItems.find(i=>i.lifecycleType==='wearable'&&daysBetween(i.acquiredDate,currentDate())<=30);if(!recent){toast('You have nothing new to wear — you could buy something in the shop.');return}extra.push(`You wear your new ${recent.name.toLowerCase()}.`)}
 if(a.luckyMoney){const amt=S.age>=2?10+Math.floor(Math.random()*Math.max(25,Math.min(180,S.age*10+30))):0;if(amt){S.money+=amt;extra.push(`Red envelopes: ${money(amt)}.`)}}
 if(a.crush){const p=S.people.filter(q=>!isFamilyPerson(q)&&q.age>=S.age-2&&q.age<=S.age+2).sort((m,n)=>n.rel-m.rel)[0];if(!p){story='There is nobody you would give a card to. That is completely fine.'}else{const ok=chance(30+(p.rel-50)*.6+(p.trust-50)*.3);p.rel=clamp(p.rel+(ok?5:-1));rememberPerson(p,ok?'You gave them a Valentine card and they liked it.':'You gave them a Valentine card; it was awkward.',2);story=ok?`You leave a card for ${firstName(p)}. Later they find you and say, a little shyly, "Thanks. I liked it."`:`You give ${firstName(p)} a card. They say thanks, kindly, but it is clear they do not feel the same way. It stings, and it is okay.`;setEmotion(ok?'Excited':'Embarrassed','A Valentine card moment.',55)}}
 if(a.partner){if(!S.romance?.partner){story='You do not have a partner right now, so you plan something for yourself instead.';fx.fun=6}}
 if(a.makes){addItem(a.makes,'handmade');const it=S.inventoryItems.filter(i=>i.key===a.makes).pop();if(it){it.origin=`Handmade for ${x.h.name} ${x.year}.`;it.sentimental=45;it.name=a.makes==='costume'?'Homemade costume':'Handmade gift'}}
 if(a.gives){addItem(a.gives.key,`${x.h.name}`,null,{quantity:a.gives.qty})}
 for(const [k,v] of Object.entries(fx)){if(['fun','social','comfort'].includes(k))S.needs[k]=clamp(S.needs[k]+v);else if(k==='happiness')S.happiness=clamp(S.happiness+v);else if(k==='stress')S.stress=clamp(S.stress+v)}
 for(const [k,v] of Object.entries(a.skills||{}))practiceSkill(k,v);
 if(a.family)S.family.closeness=clamp(S.family.closeness+a.family);if(a.responsibility)S.family.responsibility=clamp((S.family.responsibility||0)+a.responsibility);
 if(a.cooking)S.development.skills.cooking=clamp(S.development.skills.cooking+3);
 if(a.kindness){S.social.reputation=clamp(S.social.reputation+a.kindness);addRep('kindness',a.kindness)}
 if(a.rel){const p=relTarget(a.rel.target);if(p){p.rel=clamp(p.rel+a.rel.amount);rememberPerson(p,`${x.h.name}: ${a.label.toLowerCase()}.`,2)}}
 if(a.teacher&&S.school?.subjects?.length){const subs=a.pickTeacher?[[...S.school.subjects].sort((m,n)=>ensureTeacher(n).rel-ensureTeacher(m).rel)[0]]:S.school.subjects;subs.forEach(s=>ensureTeacher(s).rel=clamp(s.teacher.rel+a.teacher))}
 if(a.scare&&S.age<13&&chance(40)){S.needs.sleep=clamp(S.needs.sleep-10);extra.push('You sleep with the light on tonight.')}
 if(a.sleepCost){S.needs.sleep=clamp(S.needs.sleep-12)}
 if(a.drama&&chance(a.drama)){S.family.tension=clamp(S.family.tension+4);extra.push(rand(['An old argument resurfaces between two relatives. Dessert is quiet.','Someone asks a nosy question about grades, and the mood dips for a while.']))}
 if(a.companion&&S.age<9)extra.push(`${primaryCaregiver()} walks with you and holds the flashlight.`);
 if(a.outdoor&&['Rainy'].includes(S.weather.type)){S.needs.comfort=clamp(S.needs.comfort-8);extra.push('It drizzles the whole time.')}
 S.flags[holidayFlag(x,a)]=true;S.holidayLog=S.holidayLog||{};const k=`${x.h.id}-${x.year}`;(S.holidayLog[k]=S.holidayLog[k]||[]).push(a.id);
 advanceTime(a.minutes||30,{silent:true});
 log(`${x.h.icon} ${a.label}`,[story,...extra].filter(Boolean).join(' '),!!a.memory)
}
function holidayTick(){
 const today=currentDate();
 for(const x of holidaysOn(today)){
  const f=`holiday-${x.h.id}-${x.year}`;if(S.flags[f])continue;S.flags[f]=true;
  if(!SIM.skipping)log(`${x.h.icon} ${x.h.name}`,x.day===1?`${x.h.name} today. ${x.h.activities.some(a=>a.on)?'Check what you want to do — nothing is required.':''}`:`${x.h.name} continues.`);
  if(x.h.id==='christmas'){resolveFutureGifts('Christmas');if(chance(70)){const options=['book','artSupplies','toy','sweater','headphones','bicycle','boardGame','puzzle'].filter(k=>D.catalog[k]&&S.age>=D.catalog[k].minAge&&!ownsItem(k)),key=rand(options);if(key){addItem(key,'Christmas gift');S.giftHistory.unshift({id:uid('gift'),dateISO:today,age:S.age,item:D.catalog[key].name,occasion:'Christmas',reaction:null,requested:false});log('🎄 Christmas present',`You receive ${D.catalog[key].name}. You decide how honestly to show your reaction.`)}}}
  if(x.h.id==='lunarNewYear'&&SIM.skipping&&S.age>=2){const amt=10+Math.floor(Math.random()*Math.max(25,Math.min(180,S.age*10+30)));S.money+=amt}
 if(x.h.id==='valentines'&&S.age>=13&&S.age<18&&!S.romance?.partnerId&&!SIM.skipping&&chance(22)){const ad=S.people.filter(p=>eligibleRomance(p)).map(ensureRomanceProfile).filter(p=>p.attraction>=55)[0];if(ad)log('💌 A secret admirer',`An unsigned card is in your locker. The handwriting looks a little like ${firstName(ad)}'s…`)}
  if(x.h.id==='newYear')S.familyEvents.unshift({dateISO:today,text:'A new calendar year begins.'});
  if(x.h.id==='lunarNewYear'&&x.day===1)S.familyEvents.unshift({dateISO:today,text:'Family gathers for Lunar New Year.'});
 }
 // The day after a parent holiday: forgetting entirely is noticed (gently).
 for(const x of holidaysOn(addDays(today,-1))){const h=x.h;if(!h.parentDay||SIM.skipping||S.age<6)continue;const k=`${h.id}-${x.year}`,did=(S.holidayLog?.[k]||[]).length,f=`holiday-forgot-${k}`;if(did||S.flags[f])continue;S.flags[f]=true;const p=relTarget(h.parentDay==='father'?'father':'mother');if(p){p.rel=clamp(p.rel-2);rememberPerson(p,`You forgot ${h.name}.`);log(`Forgot ${h.name}`,`${firstName(p)} does not say much, but you can tell ${h.parentDay==='father'?'he':'she'} noticed nobody did anything yesterday.`)}}
}
function holidayHtml(){
 const w=holidayWindow();if(!w.length)return '';
 return w.map(x=>{const acts=availableActivities(x),d=x.days,done=(S.holidayLog?.[`${x.h.id}-${x.year}`]||[]).length,shop=(HOLIDAY_STORE[x.h.id]||[]).filter(k=>D.catalog[k]&&S.age>=D.catalog[k].minAge);
  return `<div class="holiday-card"><div class="holiday-head"><span class="holiday-icon">${x.h.icon}</span><div><b>${esc(x.h.name)}</b><small>${d>0?`in ${d} day${d===1?'':'s'} • ${formatDate(x.dateISO)}`:x.h.durationDays>1?`Day ${1-d} of ${x.h.durationDays}`:'Today'}${done?` • ${done} thing${done===1?'':'s'} done`:''}</small></div></div>${acts.length?`<div class="holiday-acts">${acts.map(a=>`<button class="small ${a.on?'primary':''}" data-holiday-act="${x.h.id}:${a.id}">${esc(a.label)}${a.cost&&S.age>=13?` • ${money(a.cost)}`:''}</button>`).join('')}</div>`:'<p class="muted-text">Nothing else to do for this one right now.</p>'}${shop.length&&d>0?`<small class="muted-text">Seasonal items in the shop: ${shop.map(k=>esc(D.catalog[k].name)).join(', ')} — optional, free options exist.</small>`:''}</div>`}).join('')
}

// ---------- v7.2 Month calendar, date agenda & Life Planner ----------
let calView=null,calSelected=null,calFilter=null;
const CAL_CATS={term:'School',prom:'Social',tryout:'Club',plan:'Social',election:'Club',schoolDay:'School',exam:'Exam',homework:'Homework',clubSession:'Club',schoolEvent:'Competition',party:'Social',holiday:'Holiday',birthday:'Birthday',decision:'Decision',generic:'Other'};
const CAL_TONE={School:'school',Exam:'exam',Homework:'homework',Club:'club',Competition:'competition',Social:'social',Holiday:'holiday',Birthday:'birthday',Decision:'decision',Other:'other'};
function calShift(n){const v=calView||currentDate().slice(0,7),[y,m]=v.split('-').map(Number);calView=isoDate(new Date(Date.UTC(y,m-1+n,1))).slice(0,7)}
function monthLabel(ym){const [y,m]=ym.split('-').map(Number);return new Date(Date.UTC(y,m-1,1)).toLocaleDateString(undefined,{month:'long',year:'numeric',timeZone:'UTC'})}
function agendaFor(dateISO){
 const items=[],seen=new Set(),today=currentDate();
 for(const ev of [...S.calendar,...(S.archive?.calendar||[])].filter(e=>e.dateISO===dateISO)){if(seen.has(ev.id))continue;seen.add(ev.id);const d=obDef(ev.type);items.push({id:ev.id,cat:CAL_CATS[ev.type]||'Other',icon:d.icon,title:ev.type==='schoolDay'?'School day':ev.title,minute:ev.startMinute??ev.minute??null,end:ev.endMinute??null,status:ev.status||'Scheduled',location:ev.location||d.location||'',required:ev.required??d.required,participants:ev.participants||[],type:ev.type,attendance:ev.attendanceStatus||null})}
 for(const x of holidaysOn(dateISO))items.push({id:'hol-'+x.h.id,cat:'Holiday',icon:x.h.icon,title:x.h.durationDays>1?`${x.h.name} (day ${x.day})`:x.h.name,minute:null,status:dateISO<today?'Passed':'Holiday',type:'holiday',holiday:x});
 for(const mk of academicMarkers().filter(x=>x.dateISO===dateISO))items.push({id:mk.id,cat:'School',icon:mk.icon,title:mk.title,minute:null,status:'',type:'term'});
 if(sameMonthDay(S.dob,dateISO))items.push({id:'bday',cat:'Birthday',icon:'🎂',title:dateISO.slice(0,4)===S.dob.slice(0,4)?'You were born':`Your ${ordinal(Number(dateISO.slice(0,4))-Number(S.dob.slice(0,4)))} birthday`,minute:null,status:'',type:'birthday'});
 if(S.school?.subjects)for(const s of S.school.subjects){const hw=s.homework;if(hw?.dueDate===dateISO&&hw.status!=='None')items.push({id:hw.id||s.name,cat:'Homework',icon:'📒',title:`${s.name} homework due`,minute:480,status:HW_OPEN.includes(hw.status)?homeworkLabel(hw):hw.status,type:'homework'})}
 for(const p of [...S.pendingDecisions,...(S.archive?.pending||[])].filter(x=>x.resolveDate===dateISO||x.resolvedDate===dateISO&&x.resolved))items.push({id:p.id,cat:'Decision',icon:'⏳',title:p.title,minute:null,status:p.resolved?p.status:'Decision due',type:'decision'});
 // conflicts: two live, timed, non-school-day obligations overlapping (school-internal items are part of the school day)
 const timed=items.filter(i=>i.minute!=null&&i.end!=null&&!isTerminal(i.status)&&i.type!=='schoolDay'&&i.type!=='homework');
 for(const a of timed)for(const b of timed)if(a!==b&&a.minute<b.end&&b.minute<a.end){a.conflict=b.title;b.conflict=a.title}
 return items.sort((a,b)=>(a.minute??-1)-(b.minute??-1))
}
function monthGrid(ym,{mini=false}={}){
 const [y,m]=ym.split('-').map(Number),first=new Date(Date.UTC(y,m-1,1)),lead=(first.getUTCDay()+6)%7,days=new Date(Date.UTC(y,m,0)).getUTCDate(),today=currentDate(),sel=calSelected||today,cells=[];
 for(let i=0;i<lead;i++)cells.push('<div class="cal-cell is-empty"></div>');
 for(let d=1;d<=days;d++){const iso=`${ym}-${String(d).padStart(2,'0')}`,ag=agendaFor(iso).filter(i=>i.type!=='schoolDay'&&(!calFilter||i.cat===calFilter)),cats=[...new Set(ag.map(i=>i.cat))].slice(0,mini?3:4),hol=ag.find(i=>i.cat==='Holiday');
  cells.push(`<button class="cal-cell ${iso===today?'is-today':''} ${iso===sel?'is-selected':''} ${isWeekend(iso)?'is-weekend':''} ${S.school&&!isSchoolDay(iso)&&!isWeekend(iso)?'is-break':''}" data-cal-day="${iso}" aria-label="${formatDate(iso)}${ag.length?`, ${ag.length} item${ag.length===1?'':'s'}`:''}"><span class="cal-num">${d}</span>${!mini&&hol?`<span class="cal-hol">${hol.icon}</span>`:''}<span class="cal-dots">${cats.map(c=>`<i class="dot-${CAL_TONE[c]}"></i>`).join('')}</span>${!mini&&ag.some(i=>i.conflict)?'<span class="cal-warn" title="Schedule conflict">!</span>':''}</button>`)}
 return `<div class="cal-grid ${mini?'mini':''}">${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(w=>`<div class="cal-wd">${mini?w[0]:w}</div>`).join('')}${cells.join('')}</div>`
}
function agendaListHtml(dateISO){
 const ag=agendaFor(dateISO).filter(i=>!calFilter||i.cat===calFilter),d=daysBetween(currentDate(),dateISO);
 const head=`<div class="agenda-head"><b>${formatDate(dateISO)}</b><small>${d===0?'Today':d===1?'Tomorrow':d===-1?'Yesterday':d>0?`in ${d} days`:`${-d} days ago`}${S.school&&isSchoolDay(dateISO)?' • school day':S.school&&!isWeekend(dateISO)?' • no school':''}</small></div>`;
 if(!ag.length)return head+'<p class="muted-text">Nothing on this day.</p>';
 return head+ag.map(i=>`<div class="agenda-item tone-${CAL_TONE[i.cat]}"><span class="agenda-time">${i.minute!=null?timeLabel(i.minute):'All day'}</span><div><b>${i.icon} ${esc(i.title)}</b><small>${esc(i.cat)}${i.location?` • ${esc(i.location)}`:''}${i.required?' • required':i.type==='clubSession'?' • optional (attendance tracked)':''}${i.attendance?` • ${esc(i.attendance)}`:''}${i.participants?.length?` • with ${esc(i.participants.slice(0,3).join(', '))}`:''}</small>${i.conflict?`<small class="urgent-text">⚠ Conflicts with ${esc(i.conflict)} — you can only be at one.</small>`:''}${i.holiday&&d===0?`<div class="holiday-acts">${availableActivities(Object.assign({},i.holiday,{days:0})).slice(0,4).map(a=>`<button class="small" data-holiday-act="${i.holiday.h.id}:${a.id}">${esc(a.label)}</button>`).join('')}</div>`:''}</div>${i.status&&!['Scheduled','Holiday',''].includes(i.status)?statusTag(i.status):''}</div>`).join('')
}
function calendarPanel(){
 const ym=calView||currentDate().slice(0,7),sel=calSelected||currentDate(),up=upcomingEvents(14),rec=S.school?.record;
 const recent=[...S.calendar].filter(e=>isTerminal(e.status)&&e.type!=='schoolDay').sort((a,b)=>stampOf(b.resolvedAt||{dateISO:b.dateISO}).localeCompare(stampOf(a.resolvedAt||{dateISO:a.dateISO}))).slice(0,10);
 const y=parseISO(currentDate()).getUTCFullYear(),hols=HOLIDAYS.filter(holidayObserved).map(h=>({h,d:holidayDate(h,y)})).filter(x=>x.d).sort((a,b)=>a.d.localeCompare(b.d));
 const filters=Object.keys(CAL_TONE).filter(c=>c!=='Other');
 return `<div class="dashboard"><section class="card wide" data-sub="month"><div class="cal-toolbar"><div class="cal-nav"><button class="small ghost" data-cal-month="-1" aria-label="Previous month">‹</button><h3>${esc(monthLabel(ym))}</h3><button class="small ghost" data-cal-month="1" aria-label="Next month">›</button><button class="small" data-cal-today="1">Today</button></div><div class="filter-row">${filters.map(c=>`<button class="filter-chip ${calFilter===c?'active':''}" data-cal-filter="${c}"><i class="dot-${CAL_TONE[c]}"></i>${c}</button>`).join('')}</div></div><div class="cal-layout">${monthGrid(ym)}<div class="cal-agenda">${agendaListHtml(sel)}</div></div></section>
 <section class="card" data-sub="today"><h3>Today • ${esc(weekday())}</h3>${agendaListHtml(currentDate())}</section><section class="card" data-sub="today"><h3>Now</h3>${statRow('Time',timeLabel(currentMinute()))}${statRow('School',esc(schoolDayStatus()))}${statRow('Bedtime',S.age<18?timeLabel(bedtimeMinute()):'Your choice')}${statRow('Calendar profile',esc(calendarProfile().region))}<h4>Pending decisions</h4>${pendingHtml()}</section>
 <section class="card wide" data-sub="upcoming"><h3>Upcoming</h3>${up.map(e=>{const d=daysBetween(currentDate(),e.dateISO);return `<div class="calendar-row"><div><b>${e.icon||typeIcon(e.type)} ${esc(e.title)}</b><small>${formatDate(e.dateISO)}${e.minute!=null&&e.type!=='homework'?` • ${timeLabel(e.minute)}`:''}${e.location?` • ${esc(e.location)}`:''}${e.required?' • required':''}</small></div><div class="inline-actions">${e.status&&e.status!=='Scheduled'?statusTag(e.status):''}<span class="countdown">${d===0?'TODAY':d===1?'TOMORROW':`${d} days`}</span></div></div>`}).join('')||'<p class="muted-text">Nothing scheduled.</p>'}</section>
 <section class="card" data-sub="history"><h3>Recently resolved</h3>${recent.map(e=>`<div class="calendar-row"><div><b>${typeIcon(e.type)} ${esc(e.title)}</b><small>${formatDate(e.dateISO)}${e.resolutionReason?` • ${esc(e.resolutionReason)}`:''}</small></div>${statusTag(e.status)}</div>`).join('')||'<p class="muted-text">Nothing resolved recently.</p>'}</section><section class="card" data-sub="history"><h3>Holidays this year (${calendarProfile().region})</h3>${hols.map(x=>`<div class="calendar-row"><div><b>${x.h.icon} ${esc(x.h.name)}</b><small>${formatDate(x.d)}</small></div><span class="countdown">${x.d<currentDate()?'passed':daysBetween(currentDate(),x.d)+'d'}</span></div>`).join('')}</section></div>`
}
function renderPlanner(){
 const host=$('planner');if(!host||!S)return;const ym=currentDate().slice(0,7),today=agendaFor(currentDate()).filter(i=>i.type!=='birthday'||true),next=upcomingEvents(6).filter(e=>e.dateISO>currentDate()).slice(0,5),pend=pendingOpen().slice(0,3),hol=upcomingHolidays(3);
 host.innerHTML=`<div class="planner-head"><b>${esc(monthLabel(ym))}</b><button class="small ghost planner-close" data-planner-toggle="1" aria-label="Close planner">×</button></div>${monthGrid(ym,{mini:true})}<h4>Today</h4>${today.length?today.slice(0,6).map(i=>`<div class="pl-row ${isTerminal(i.status)?'done':''}"><span>${i.icon}</span><b>${esc(i.title)}</b><small>${i.minute!=null?timeLabel(i.minute):''}</small></div>`).join(''):'<p class="muted-text">Free day.</p>'}<h4>Next up</h4>${next.map(e=>`<div class="pl-row"><span>${e.icon||typeIcon(e.type)}</span><b>${esc(e.title)}</b><small>${daysBetween(currentDate(),e.dateISO)}d</small></div>`).join('')||'<p class="muted-text">Nothing scheduled.</p>'}${pend.length?`<h4>Pending</h4>${pend.map(p=>`<div class="pl-row"><span>⏳</span><b>${esc(p.title)}</b><small>${p.resolveDate?daysBetween(currentDate(),p.resolveDate)+'d':esc(p.status)}</small></div>`).join('')}`:''}<h4>Holidays</h4>${hol.map(x=>`<div class="pl-row"><span>${x.h.icon}</span><b>${esc(x.h.name)}</b><small>${daysBetween(currentDate(),x.dateISO)}d</small></div>`).join('')}`
}
document.addEventListener('click',e=>{const b=e.target.closest('#planner button');if(!b||!S)return;if(b.dataset.calDay){calSelected=b.dataset.calDay;calView=b.dataset.calDay.slice(0,7);active='calendar';UI.subTab.calendar='month';saveUI();document.body.classList.remove('planner-open');render()}else if(b.dataset.plannerToggle)document.body.classList.toggle('planner-open')});
// ---------- v7.2 PHASE 4: themes & icons ----------
// Light (default) / Dark / Auto (follows the OS) / Life (warm, colorful). Stored in the UI prefs, not in the save.
const THEMES=['light','dark','auto','life'],THEME_LABEL={light:'Light',dark:'Dark',auto:'Auto',life:'Life'};
const darkQuery=window.matchMedia?matchMedia('(prefers-color-scheme: dark)'):null;
function resolvedTheme(t=UI.theme){if(t==='auto')return darkQuery&&darkQuery.matches?'dark':'light';return ['light','dark','life'].includes(t)?t:'light'}
function applyTheme(){if(!THEMES.includes(UI.theme))UI.theme='light';const root=document.documentElement;root.classList.add('no-trans');requestAnimationFrame(()=>requestAnimationFrame(()=>root.classList.remove('no-trans')));document.documentElement.setAttribute('data-theme',resolvedTheme());document.documentElement.setAttribute('data-theme-pref',UI.theme);const b=$('theme-btn');if(b){const s=b.querySelector('span');if(s)s.textContent=THEME_LABEL[UI.theme];b.setAttribute('aria-label',`Appearance: ${THEME_LABEL[UI.theme]}`)}document.querySelectorAll('[data-theme-set]').forEach(x=>{x.classList.toggle('active',x.dataset.themeSet===UI.theme);x.setAttribute('aria-pressed',x.dataset.themeSet===UI.theme)})}
function setTheme(t){UI.theme=THEMES.includes(t)?t:'light';saveUI();applyTheme()}
function cycleTheme(){setTheme(THEMES[(THEMES.indexOf(UI.theme)+1)%THEMES.length]);toast(`Appearance: ${THEME_LABEL[UI.theme]}${UI.theme==='auto'?` (${resolvedTheme()})`:''}`)}
if(darkQuery){const f=()=>{if(UI.theme==='auto')applyTheme()};darkQuery.addEventListener?darkQuery.addEventListener('change',f):darkQuery.addListener(f)}
const NAV_ICON={home:'home',places:'compass',people:'users',development:'sprout',school:'book',business:'wallet',phone:'phone',family:'family',career:'briefcase',health:'health',calendar:'calendar',world:'globe'};
const NEED_ICON={hunger:'utensils',hygiene:'droplet',toilet:'bath',fun:'smile',social:'users',comfort:'sofa',sleep:'moon'};
function icon(n){return `<svg class="ico" aria-hidden="true"><use href="#ico-${n}"/></svg>`}
function needIcon(k){return icon(NEED_ICON[k]||'dot')}
document.addEventListener('click',e=>{const b=e.target.closest('#theme-btn,[data-theme-set]');if(!b)return;if(b.id==='theme-btn')cycleTheme();else setTheme(b.dataset.themeSet)});
if(!localStorage.getItem(UI_KEY)||UI.theme==null)UI.theme=UI.theme||'light';
applyTheme();

// =====================================================================
// v7.2 PHASE 5a — PEOPLE WITH NAMES, LIVES, GOALS & REPUTATION
// =====================================================================
const NAME_POOLS={
 EN:{order:'given',first:['Olivia','Liam','Emma','Noah','Ava','Oliver','Sophia','Elijah','Isabella','James','Mia','Lucas','Amelia','Mason','Harper','Ethan','Evelyn','Aiden','Abigail','Logan','Ella','Jackson','Chloe','Sebastian','Grace','Mateo','Zoe','Henry','Lily','Owen','Nora','Daniel','Hannah','Samuel','Aria','Caleb','Layla','Isaac','Maya','Julian','Riley','Gabriel','Stella','Leo','Aurora','Ezra','Naomi','Miles','Ruby','Jordan','Priya','Arjun','Fatima','Omar','Sofia','Diego','Aisha','Kenji','Andre','Alexandra','Benjamin','Nathaniel','Katherine','Theodore','Elizabeth','Christopher','Margaret','Jonathan'],last:['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez','Hernandez','Lopez','Wilson','Anderson','Thomas','Taylor','Moore','Jackson','Martin','Lee','Thompson','White','Harris','Clark','Lewis','Robinson','Walker','Young','Allen','King','Wright','Scott','Torres','Nguyen','Hill','Flores','Green','Adams','Nelson','Baker','Hall','Rivera','Campbell','Mitchell','Carter','Roberts','Patel','Kim','Chen','Okafor','Singh','Murphy','Kowalski','Cohen','Ali','Rossi','Brooks','Reyes','Foster','Hughes']},
 VN:{order:'family',first:['An','Bảo','Châu','Dũng','Đức','Giang','Hà','Hải','Hạnh','Hiếu','Hoa','Hoàng','Hùng','Hương','Khang','Khánh','Khoa','Lan','Linh','Long','Mai','Minh','My','Nam','Ngọc','Nhi','Phong','Phương','Quân','Quang','Quỳnh','Sơn','Tâm','Thảo','Thành','Thu','Trang','Trí','Trung','Tuấn','Tú','Uyên','Việt','Vy','Yến','Anh','Thiện','Kiệt','Nhung','Tiến'],last:['Nguyễn','Trần','Lê','Phạm','Hoàng','Huỳnh','Phan','Vũ','Võ','Đặng','Bùi','Đỗ','Hồ','Ngô','Dương','Lý','Trương','Đinh','Lâm','Mai','Cao','Lưu','Hà','Trịnh','Đoàn','Thái','Châu','Tạ','Quách','Kiều']},
 KR:{order:'family',first:['Minjun','Seoyeon','Jiwoo','Haeun','Doyun','Seojun','Jiho','Yuna','Hayoon','Eunwoo','Siwoo','Jiyu','Chaewon','Minseo','Junho','Yejin','Dahyun','Hyunwoo','Sumin','Taeyang','Jisoo','Yerin','Donghyun','Soojin','Hana','Jaemin','Nayeon','Sungmin'],last:['Kim','Lee','Park','Choi','Jung','Kang','Cho','Yoon','Jang','Lim','Han','Oh','Seo','Shin','Kwon','Hwang','Ahn','Song','Yoo','Hong']},
 JP:{order:'family',first:['Haruto','Yui','Sota','Hina','Ren','Yuna','Minato','Aoi','Riku','Sakura','Yuto','Mei','Kaito','Rin','Hinata','Akari','Sora','Mio','Takumi','Koharu','Daiki','Nanami','Kenta','Emi'],last:['Sato','Suzuki','Takahashi','Tanaka','Watanabe','Ito','Yamamoto','Nakamura','Kobayashi','Kato','Yoshida','Yamada','Sasaki','Yamaguchi','Matsumoto','Inoue','Kimura','Hayashi','Shimizu','Mori']},
 CN:{order:'family',first:['Wei','Jing','Yu','Hao','Xin','Jun','Lei','Mei','Yan','Ming','Ling','Chen','Hui','Jie','Ting','Kai','Yi','Ning','Rui','Xuan','Zhen','Qing','Bo','Lan'],last:['Wang','Li','Zhang','Liu','Chen','Yang','Huang','Zhao','Wu','Zhou','Xu','Sun','Ma','Zhu','Hu','Guo','He','Lin','Luo','Gao','Tan','Lim','Ong','Goh']},
 FR:{order:'given',first:['Louis','Emma','Gabriel','Jade','Raphaël','Louise','Arthur','Alice','Jules','Chloé','Adam','Léa','Hugo','Manon','Lucas','Inès','Nathan','Camille','Léo','Lina','Paul','Zoé','Théo','Juliette','Malik','Yasmine'],last:['Martin','Bernard','Dubois','Thomas','Robert','Richard','Petit','Durand','Leroy','Moreau','Simon','Laurent','Lefebvre','Michel','Garcia','David','Bertrand','Roux','Vincent','Fournier','Morel','Girard','André','Mercier','Blanc','Benali']},
 TH:{order:'given',first:['Somchai','Malee','Niran','Ploy','Anan','Kanya','Chai','Ratana','Kiet','Nong','Arun','Pim','Krit','Fon','Tawan','Mali','Nattapong','Siriporn','Win','Bee'],last:['Saetang','Srisuk','Wongsa','Chaiyaporn','Rattanakorn','Somboon','Thongchai','Kittisak','Phromsri','Boonmee','Jaidee','Suwannarat','Inthavong','Kaewmanee','Prasert','Sukprasert']}
};
const FAMILY_NAMES={EN:{f:['Sarah','Jennifer','Laura','Michelle','Anna','Rachel','Helen','Grace','Maria','Linda'],m:['David','Michael','Robert','Mark','Thomas','Paul','Richard','Peter','Steven','George']},VN:{f:['Lan','Hoa','Mai','Hương','Thu','Hạnh','Ngọc','Phương','Trang','Yến'],m:['Hùng','Dũng','Minh','Tuấn','Quang','Sơn','Hải','Long','Nam','Đức']},KR:{f:['Jiyoung','Sunhee','Mikyung','Eunjung','Hyejin'],m:['Sungho','Jinwoo','Youngsoo','Minho','Dongwook']},JP:{f:['Yuko','Keiko','Naoko','Akiko','Tomoko'],m:['Hiroshi','Takeshi','Kenji','Satoshi','Makoto']},CN:{f:['Mei','Ling','Hui','Yan','Jing'],m:['Wei','Jun','Ming','Hao','Lei']},FR:{f:['Sophie','Nathalie','Isabelle','Claire','Céline'],m:['Nicolas','Julien','Olivier','Laurent','Pierre']},TH:{f:['Malee','Kanya','Ratana','Siriporn','Pim'],m:['Somchai','Anan','Niran','Krit','Arun']}};
function minutesUntil(dateISO,minute){return daysBetween(currentDate(),dateISO)*1440+(minute-currentMinute())}
const NICKNAMES={Alexandra:'Alex',Benjamin:'Ben',Nathaniel:'Nate',Katherine:'Kate',Theodore:'Theo',Elizabeth:'Liz',Christopher:'Chris',Margaret:'Maggie',Jonathan:'Jon',Isabella:'Bella',Abigail:'Abby',Samuel:'Sam',Gabriel:'Gabe',Daniel:'Danny',Sebastian:'Seb',Nattapong:'Nat',Siriporn:'Porn'};
const NPC_TRAITS=['Kind','Funny','Quiet','Competitive','Curious','Ambitious','Shy','Outgoing','Studious','Sporty','Artsy','Generous','Busy','Loyal'];
function poolKey(){const r=calendarProfile().region;return ['VN','KR','JP','CN','FR','TH'].includes(r)?r:r==='SG'?'CN':'EN'}
function nameRegistry(){const set=new Set();for(const p of S.people||[])if(p.fullName)set.add(p.fullName.toLowerCase());for(const n of S.npcs||[])set.add(n.fullName.toLowerCase());if(S.name)set.add(String(S.name).toLowerCase());return set}
function composeName(first,last,key=poolKey()){return NAME_POOLS[key]?.order==='family'?`${last} ${first}`:`${first} ${last}`}
function generateName({surname=null,key=poolKey(),avoid=null}={}){
 const pool=NAME_POOLS[key]||NAME_POOLS.EN,used=avoid||nameRegistry();
 for(let i=0;i<80;i++){const first=rand(pool.first),last=surname||rand(pool.last),full=composeName(first,last,key);if(!used.has(full.toLowerCase())){used.add(full.toLowerCase());return {firstName:first,surname:last,fullName:full,nickname:NICKNAMES[first]||null}}}
 const first=rand(pool.first),last=surname||rand(pool.last),mid=String.fromCharCode(65+Math.floor(Math.random()*26)),full=NAME_POOLS[key]?.order==='family'?`${last} ${mid}. ${first}`:`${first} ${mid}. ${last}`;used.add(full.toLowerCase());return {firstName:first,surname:last,fullName:full,nickname:NICKNAMES[first]||null}
}
function npcGoals(traits,age){const g=[];if(traits.includes('Sporty')||chance(25))g.push('makeTeam');if(traits.includes('Studious')||chance(25))g.push('goodGrades');if(traits.includes('Ambitious')&&age>=10)g.push('classPresident');if(traits.includes('Artsy'))g.push(chance(50)?'musician':'artist');if(traits.includes('Outgoing')||traits.includes('Shy'))g.push('moreFriends');if(age>=15&&chance(35))g.push('university');if(age>=13&&chance(25))g.push('saveMoney');return [...new Set(g)].slice(0,3)}
const GOAL_LABEL={makeTeam:'make a sports team',goodGrades:'get good grades',classPresident:'become class president',musician:'become a musician',artist:'get into art seriously',moreFriends:'make more friends',university:'get into university',saveMoney:'save up for something',partner:'find a partner'};
function generateHousehold({kids=1,childAge=S.age,key=poolKey()}={}){
 const used=nameRegistry(),pool=NAME_POOLS[key]||NAME_POOLS.EN,famSurname=rand(pool.last);
 const style=['VN','KR','CN'].includes(key)?'parentsKeepOwn':chance(70)?'shared':chance(50)?'hyphenated':'separate';
 const motherSurname=style==='shared'?famSurname:rand(pool.last.filter(x=>x!==famSurname));
 const kidSurname=style==='hyphenated'?`${famSurname}-${motherSurname}`:famSurname;
 const hh={id:uid('hh'),surname:famSurname,style,members:[]};S.households=S.households||[];S.households.push(hh);
 const year=parseISO(currentDate()).getUTCFullYear(),out=[];
 for(let i=0;i<kids;i++){const age=Math.max(1,childAge+(i===0?0:rand([-2,-1,1,2,3]))),traits=[rand(NPC_TRAITS),rand(NPC_TRAITS)].filter((v,j,a)=>a.indexOf(v)===j),nm=generateName({surname:kidSurname,key,avoid:used});
  const npc=Object.assign({id:uid('npc'),householdId:hh.id,birthYear:year-age,traits,goals:npcGoals(traits,age),clubDay:1+Math.floor(Math.random()*5),interest:rand(['Football','Basketball','Art Club','Drama','Music','Science Club','Debate','Coding Club','Student Council','Chess Club','Swimming']),reputation:20+Math.floor(Math.random()*40)},nm);S.npcs.push(npc);hh.members.push(npc.id);out.push(npc)}
 hh.parents=[generateName({surname:famSurname,key,avoid:used}),generateName({surname:motherSurname,key,avoid:used})].map(n=>n.fullName);
 return out
}
function npcAge(n){return parseISO(currentDate()).getUTCFullYear()-n.birthYear}
function ensureRoster(){
 S.npcs=Array.isArray(S.npcs)?S.npcs:[];S.households=Array.isArray(S.households)?S.households:[];
 if(S.age<3)return;const peers=S.npcs.filter(n=>Math.abs(npcAge(n)-S.age)<=1);
 let guard=0;while(peers.length<18&&guard++<30){const made=generateHousehold({kids:chance(30)?2:1});peers.push(...made.filter(n=>Math.abs(npcAge(n)-S.age)<=1))}
}
function npcById(id){return (S.npcs||[]).find(n=>n.id===id)||null}
function personFromNpc(npc,role,roleLabel){const p=makePerson(npc.fullName,role,npcAge(npc),S.age);Object.assign(p,{npcId:npc.id,firstName:npc.firstName,surname:npc.surname,fullName:npc.fullName,nickname:npc.nickname,name:npc.fullName,roleLabel,traits:npc.traits,goals:npc.goals});return p}
function firstName(p){if(!p)return '';if(p.role==='parent'||p.role==='grandparent')return p.name;return p.nickname||p.firstName||String(p.name||'').split(' • ')[0].split(' ')[0]}
function displayName(p,ctx='casual'){if(!p)return '';if(['parent','grandparent'].includes(p.role))return p.name;if(ctx==='formal')return p.fullName||p.name;return p.rel>=60?(p.nickname||p.firstName||p.name):(p.fullName||p.name)}
function familySurname(){S.familyName=S.familyName||(String(S.name||'').trim().split(/\s+/).length>1?String(S.name).trim().split(/\s+/).pop():rand((NAME_POOLS[poolKey()]||NAME_POOLS.EN).last));return S.familyName}
function migratePeopleNames(){
 const key=poolKey(),used=nameRegistry(),fam=familySurname();
 for(const p of S.people){
  if(p.fullName)continue;
  if(['parent','grandparent','older sibling','sibling','aunt','uncle','relative'].includes(p.role)){const sur=['VN','KR','CN'].includes(key)&&/Mom|Grandmother/.test(p.name)?rand((NAME_POOLS[key]||NAME_POOLS.EN).last.filter(x=>x!==fam)):fam;const fem=/Mom|Grandmother|Aunt|Sister/i.test(p.name),fn=FAMILY_NAMES[key]||FAMILY_NAMES.EN;let first,full;for(let i=0;i<30;i++){first=rand(fem?fn.f:fn.m);full=composeName(first,sur,key);if(!used.has(full.toLowerCase()))break}used.add(full.toLowerCase());Object.assign(p,{firstName:first,surname:sur,fullName:full,nickname:p.name});continue}
  const parts=String(p.name).split(' • '),given=parts[0].trim(),label=parts[1]||p.role,first=given;let nm,full;for(let i=0;i<40;i++){nm=generateName({key,avoid:new Set()});full=composeName(first,nm.surname,key);if(!used.has(full.toLowerCase()))break}
  used.add(full.toLowerCase());Object.assign(p,{firstName:first,surname:nm.surname,fullName:full,nickname:NICKNAMES[first]||null,roleLabel:label,name:full});
  if(!p.goals)p.goals=npcGoals(p.traits||[],p.age||S.age);
  const npc={id:uid('npc'),firstName:first,surname:nm.surname,fullName:full,nickname:p.nickname,birthYear:parseISO(currentDate()).getUTCFullYear()-(p.age||S.age),traits:p.traits||[],goals:p.goals,clubDay:1+Math.floor(Math.random()*5),interest:rand(['Football','Art Club','Drama','Music','Science Club']),reputation:30};S.npcs.push(npc);p.npcId=npc.id;
  S.flags[`stage-${label.replace(/\s+/g,'')}`]=true
 }
}
function addStagePeople(){
 normalizePeople();S.npcs=Array.isArray(S.npcs)?S.npcs:[];S.households=Array.isArray(S.households)?S.households:[];migratePeopleNames();if(S.people.filter(p=>p.roleLabel==='classmate').length>=2)S.flags['stage-classmate2']=true;ensureRoster();
 const slots=[[3,'neighbor','neighbor'],[6,'classmate','classmate'],[10,'classmate2','classmate'],[13,'schoolfriend','school friend'],[18,'acquaintance','acquaintance']];
 for(const [age,key,label] of slots){if(S.age<age||S.flags[`stage-${key}`])continue;if(key==='classmate2'&&S.flags['stage-classmate']&&S.people.filter(p=>p.roleLabel==='classmate').length>=2){S.flags[`stage-${key}`]=true;continue}
  const taken=new Set(S.people.map(p=>p.npcId).filter(Boolean)),npc=S.npcs.find(n=>!taken.has(n.id)&&Math.abs(npcAge(n)-S.age)<=1)||generateHousehold({kids:1})[0];
  S.people.push(personFromNpc(npc,'friend',label));S.flags[`stage-${key}`]=true}
}
// ---------- Availability: NPCs have their own day ----------
function dayHash(s){let h=0;for(const c of s)h=(h*31+c.charCodeAt(0))>>>0;return h%100}
function npcStatusAt(p,dateISO=currentDate(),m=currentMinute()){
 if(!p||['parent','grandparent'].includes(p.role))return {free:true};
 const npc=npcById(p.npcId),age=p.age||S.age,wd=weekdayIndex(dateISO),bed=age<10?1260:age<13?1290:age<18?1350:1410;
 if(npc?.vacationUntil&&npc.vacationUntil>=dateISO)return {free:false,why:`${firstName(p)} is away on a family trip until ${formatDate(npc.vacationUntil)}.`};
 if(m>=bed||m<420)return {free:false,why:`It is ${timeLabel(m)} — ${firstName(p)} is asleep or not allowed out this late.`};
 if(age>=6&&age<=18&&isSchoolDay(dateISO)&&m>=SCHOOL_DAY.start&&m<SCHOOL_DAY.end)return {free:false,why:`${firstName(p)} is at school until ${timeLabel(SCHOOL_DAY.end)}.`,atSchool:true};
 if(age>=19&&age<65&&wd<5&&m>=540&&m<1020)return {free:false,why:`${firstName(p)} is at work until 5:00 PM.`};
 if(npc&&age>=6&&age<=18&&isSchoolDay(dateISO)&&wd===npc.clubDay-1&&m>=900&&m<1020){const mins=930-m;return {free:false,why:mins>0?`${firstName(p)} can't hang out right now because ${npc.interest.toLowerCase()} practice starts in ${mins} minutes.`:`${firstName(p)} is at ${npc.interest} until 5:00 PM.`}}
 if(m>=1080&&m<1140&&dayHash(p.id+dateISO)<40)return {free:false,why:`${firstName(p)} is having dinner with family right now.`};
 const goalsTest=(p.goals||npc?.goals||[]).includes('goodGrades');if(goalsTest&&m>=1140&&dayHash(p.id+dateISO+'s')<35)return {free:false,why:`${firstName(p)} is studying tonight — they really want good grades this term.`};
 return {free:true}
}
function availabilityGate(p){const a=npcStatusAt(p);if(a.free)return true;openModal(`${displayName(p)} is busy`,`<p>${esc(a.why)}</p><div class="modal-action-grid"><button data-close-modal="1">Ask later</button><button class="primary" data-plan-open="${p.id}">Schedule something</button>${canUsePhone()?`<button data-person-action="message" data-person-id="${p.id}">Message instead</button>`:''}</div>`);return false}
// ---------- School reputation & identity ----------
const REP_DIMS={academic:'Academic',athletic:'Athletic',creative:'Creative',leadership:'Leadership',social:'Social',kindness:'Kindness',troublemaker:'Troublemaker',club:'Clubs'};
function ensureRep(){if(!S.schoolRep){const avg=S.school?schoolAverage():60;S.schoolRep={academic:clamp(avg-45),athletic:12,creative:12,leadership:8,social:clamp((S.social?.reputation||40)-20),kindness:20,troublemaker:4,club:6}}return S.schoolRep}
function addRep(dim,amt){const r=ensureRep();if(!(dim in r))return;r[dim]=clamp(r[dim]+amt)}
function schoolIdentities(){const r=ensureRep(),out=[],has=n=>(S.school?.clubs||[]).some(c=>c.status==='Active'&&c.name===n);
 if(r.athletic>=55)out.push('Star Athlete');if(r.academic>=65)out.push('Academic Competitor');if(r.leadership>=50)out.push('Student Leader');if(r.creative>=50&&has('Drama'))out.push('Theatre Kid');else if(r.creative>=50)out.push('Art Student');if(has('Debate')&&r.leadership+r.academic>=80)out.push('Debate Kid');if(has('Music')&&r.creative>=40)out.push('Musician');if(r.troublemaker>=50)out.push('Known Troublemaker');if(r.kindness>=60)out.push('Kind Classmate');if(r.social>=65)out.push('Popular');return out.slice(0,3)}
function repDailyTick(){const r=ensureRep();for(const k of Object.keys(r)){const base=k==='troublemaker'?4:k==='academic'&&S.school?clamp(schoolAverage()-45):10;r[k]=clamp(r[k]+(base-r[k])*.004)}
 if(!SIM.skipping&&needsFormalSchool()&&chance(6)&&(!S.flags.lastFame||daysBetween(S.flags.lastFame,currentDate())>=14)){const top=Object.entries(r).filter(([k])=>k!=='troublemaker').sort((a,b)=>b[1]-a[1])[0];if(top&&top[1]>=55){S.flags.lastFame=currentDate();const lines={athletic:'A younger student recognizes you from the last game and asks for a high five.',academic:'A classmate asks if you would explain last week\'s lesson — apparently you are "the smart one".',creative:'Your work is displayed near the library. Someone you do not know says it is their favorite.',leadership:'A teacher asks for your opinion on a school decision, like it matters. It does.',social:'People you barely know say hi to you in the hallway now.',kindness:'A younger student thanks you for helping them on their first week. You had forgotten.',club:'Someone asks how to join your club. You are apparently the person to ask.'};log('Recognized at school',lines[top[0]]);S.happiness=clamp(S.happiness+3)}}
}
function repHtml(){const r=ensureRep(),ids=schoolIdentities();return `${ids.length?`<div class="fx-row identity-row">${ids.map(i=>`<span class="tag ok">${esc(i)}</span>`).join('')}</div>`:'<p class="muted-text">No strong school identity yet — it emerges from what you actually do.</p>'}${Object.entries(REP_DIMS).map(([k,l])=>`<div class="skill-line"><span>${l}</span><div class="progress ${k==='troublemaker'?'dangerbar':''}"><i style="width:${clamp(r[k])}%"></i></div><b>${Math.round(r[k])}</b></div>`).join('')}`}
// ---------- Story threads & outcome history ----------
function thread(kind,key,title,participants=[]){S.threads=S.threads||[];let t=S.threads.find(x=>x.key===key&&!x.resolved);if(!t){t={id:uid('thread'),key,kind,title,participants,startedDate:currentDate(),updatedDate:currentDate(),stage:'Started',resolved:false,log:[]};S.threads.unshift(t);if(S.threads.length>40)S.threads.length=40}return t}
function threadStep(t,stage,note,{resolve=false}={}){if(!t)return;t.stage=stage;t.updatedDate=currentDate();t.log.push({dateISO:currentDate(),stage,note});if(t.log.length>12)t.log.shift();if(resolve){t.resolved=true;t.resolvedDate=currentDate()}}
function recordOutcome(category,title,result,reason,detail=''){S.outcomes=S.outcomes||[];S.outcomes.unshift({id:uid('out'),dateISO:currentDate(),age:S.age,category,title,result,reason,detail});if(S.outcomes.length>80)S.outcomes.length=80}
function threadsHtml(){const t=(S.threads||[]).slice(0,10);return t.length?t.map(x=>`<div class="timeline-entry"><span>${formatDate(x.startedDate)} • ${x.resolved?'Resolved':'Ongoing'}</span><b>${esc(x.title)}</b><p>${esc(x.stage)}${x.log.length?` — ${esc(x.log[x.log.length-1].note)}`:''}</p></div>`).join(''):'<p class="muted-text">Story threads appear when something unfolds over time — a tryout, an election, a plan with a friend.</p>'}
function outcomesHtml(){const o=(S.outcomes||[]).slice(0,12);return o.length?o.map(x=>`<div class="timeline-entry"><span>${formatDate(x.dateISO)} • ${esc(x.category)}</span><b>${esc(x.title)} — ${esc(x.result)}</b><p>${esc(x.reason)}${x.detail?` ${esc(x.detail)}`:''}</p></div>`).join(''):'<p class="muted-text">Important outcomes (tryouts, elections, plans) are recorded here with the reason behind them.</p>'}
function personForMessage(m){if(!m)return null;if(m.fromId)return personById(m.fromId);const f=String(m.from||''),[g,role]=f.split(' • ');const exact=S.people.find(x=>x.name===f||x.fullName===f);if(exact)return exact;const cand=S.people.filter(x=>!isFamilyPerson(x)&&x.firstName===g);return cand.find(x=>role&&x.roleLabel===role)||cand[0]||null}
function replyMessage(id){const m=S.messages.find(x=>x.id===id);if(!m)return;m.read=true;const p=personForMessage(m);if(p){m.fromId=p.id;p.rel=clamp(p.rel+2);p.trust=clamp(p.trust+1);rememberPerson(p,'You replied to a message.')}advanceTime(8);closeChoiceModal();feedback('Replied',`You replied to ${p?displayName(p):m.from}.`,8)}
function socialReconcile(){if(S.dob)S.zodiac=zodiacFromDate(S.dob);for(const m of S.messages||[])if(!m.fromId&&m.from!==S.name){const p=personForMessage(m);if(p){m.fromId=p.id;m.from=displayName(p,'formal')}}S.npcs=Array.isArray(S.npcs)?S.npcs:[];S.households=Array.isArray(S.households)?S.households:[];S.plans=Array.isArray(S.plans)?S.plans:[];S.threads=S.threads||[];S.outcomes=S.outcomes||[];S.family.trust=S.family.trust??60;ensureRep();if(S.people?.length)migratePeopleNames();if(S.age>=3){ensureRoster();ensureNeighborhood()}}

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
function curfewMinute(){if(S.age>=18)return null;const r=familyRules(),base=S.age<10?1080:S.age<13?1170:S.age<16?1260:1350,adj=r.strictness>70?-30:r.strictness<35?30:0;return base+adj}
function planSlot(when,type){
 const t=PLAN_TYPES[type],start=t.start??(S.age<10?900:960);let d=currentDate();
 if(when==='today'){let m=Math.max(currentMinute()+60,start);if(isSchoolDay(d)&&needsFormalSchool()&&m<SCHOOL_DAY.end+30)m=SCHOOL_DAY.end+30;if(m+Math.min(t.minutes,240)>1380)return null;return {dateISO:d,start:Math.round(m/15)*15}}
 if(when==='tomorrow'){d=addDays(d,1);return {dateISO:d,start:isSchoolDay(d)&&needsFormalSchool()?Math.max(start,SCHOOL_DAY.end+30):Math.max(start,840)}}
 d=addDays(d,1);while(!isWeekend(d))d=addDays(d,1);return {dateISO:d,start:t.start??840}
}
function needsPermission(type,slot){if(S.age>=18)return {need:false};const t=PLAN_TYPES[type],cf=curfewMinute(),end=slot.start+t.minutes;const reasons=[];if(t.permission)reasons.push(t.overnight?'a sleepover needs a caregiver\'s OK':'parties need a caregiver\'s OK');if(!t.overnight&&cf!=null&&end>cf)reasons.push(`it ends after your ${timeLabel(cf)} curfew`);if(S.age<10&&!t.overnight)reasons.push('young kids need an adult to arrange plans');return {need:reasons.length>0,reasons}}
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
function openPlanModal(personId){
 const p=personById(personId);if(!p)return;if(S.age<6){toast('At this age, caregivers arrange playdates.');return}
 const types=Object.entries(PLAN_TYPES).filter(([,t])=>S.age>=t.minAge&&S.age<=(t.maxAge??200));
 openModal(`Make plans with ${displayName(p)}`,`<p class="muted-text">${S.age<18?`House rules: home by ${timeLabel(curfewMinute())}. Some plans need a caregiver's OK.`:'Pick something and a time.'}</p><div class="plan-grid">${types.map(([k,t])=>`<div class="plan-type"><b>${esc(t.label)}</b><small>${t.cost?money(t.cost)+' • ':''}${t.overnight?'overnight':Math.round(t.minutes/60*10)/10+'h'}</small><div class="inline-actions">${WHEN_OPTIONS.map(([w,l])=>`<button class="small" data-plan-make="${p.id}" data-plan-type="${k}" data-plan-when="${w}">${l}</button>`).join('')}</div></div>`).join('')}</div>`)
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
function schedulePlanCalendar(plan){const p=personById(plan.personId);createCalendarEvent({id:`plan-${plan.id}`,type:'plan',title:plan.title,dateISO:plan.dateISO,startMinute:plan.startMinute,endMinute:plan.endMinute,graceMinute:Math.min(1439,plan.startMinute+30),payload:{planId:plan.id},location:plan.location,participants:p?[displayName(p)]:[],required:true,source:'social'})}
function planEvent(plan){return S.calendar.find(e=>e.type==='plan'&&e.payload?.planId===plan.id)}
function attendPlan(planId){
 const plan=S.plans.find(x=>x.id===planId),p=plan&&personById(plan.personId);if(!plan||plan.status!=='Accepted'){toast('That plan is not active.');return}
 const ev=planEvent(plan);if(!ev||isTerminal(ev.status)){toast('That plan already happened.');return}
 if(plan.dateISO>currentDate()){toast(`That is on ${formatDate(plan.dateISO)}.`);return}
 if(atSchool()){toast('You are at school.');return}
 if(currentMinute()<plan.startMinute){if(plan.startMinute-currentMinute()>120){toast(`It starts at ${timeLabel(plan.startMinute)}.`);return}advanceTime(plan.startMinute-currentMinute(),{silent:true})}
 if(currentMinute()>ev.graceMinute){processCalendar();toast('You are too late — they have moved on.');return}
 const t=PLAN_TYPES[plan.type],late=Math.max(0,currentMinute()-plan.startMinute);if(t.cost&&S.age>=12&&!spendOwn(t.cost)){toast(`You need ${money(t.cost)}.`);return}
 setCalendarStatus(ev,'Attending','Arrived');
 const dur=t.overnight?Math.max(60,(24*60-currentMinute())+540):Math.max(30,plan.endMinute-currentMinute());advanceTime(dur,{silent:true});
 const roll=Math.random()*100+(p?p.rel-50:0)*.4-(late>10?10:0)+(S.weather.type==='Rainy'&&t.outdoor?-20:0);
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
 const plan=S.plans.find(x=>x.id===planId),p=plan&&personById(plan.personId);if(!plan||!['Accepted','Maybe'].includes(plan.status))return;
 const ev=planEvent(plan),mins=minutesUntil(plan.dateISO,plan.startMinute),late=mins<180;
 plan.status='Cancelled by you';if(ev)setCalendarStatus(ev,'Cancelled',late?'Cancelled last minute':'Cancelled in advance');resolveNotificationsFor(plan.id);
 if(p){p.rel=clamp(p.rel-(late?3:1));p.trust=clamp(p.trust-(late?2:0));rememberPerson(p,late?'You cancelled on them at the last minute.':'You cancelled a plan, but told them early.')}
 const th=thread('plan',plan.id,plan.title,[plan.personId]);threadStep(th,'Cancelled',late?'last minute':'in advance',{resolve:true});
 log('Plans cancelled',late?`You message ${firstName(p)} that you can't make it after all. "Oh… okay," comes the reply, a little flat.`:`You let ${firstName(p)} know well ahead of time. "No worries — another time!"`)
}
function planNoShow(ev){
 const plan=S.plans.find(x=>x.id===ev.payload?.planId),p=plan&&personById(plan.personId);setCalendarStatus(ev,'No-show','Did not show up');if(!plan)return;plan.status='No-show';
 if(p){p.rel=clamp(p.rel-7);p.trust=clamp(p.trust-6);p.conflict=clamp((p.conflict||0)+8);rememberPerson(p,'You said yes, then never showed up.',2)}
 const th=thread('plan',plan.id,plan.title,[plan.personId]);threadStep(th,'No-show','You never showed up');recordOutcome('Plan',plan.title,'No-show','You said yes and did not show up.');
 if(SIM.skipping)return;log(`Stood ${firstName(p)} up`,`${firstName(p)} waited at ${plan.location} for a while, then went home.`);
 scheduleFollowUp('planNoShowTalk',{planId:plan.id},{days:1,minute:Math.max(960,currentMinute())})
}
function defyCheck(plan){const r=familyRules(),p=clamp(25+r.strictness*.4+(plan.endMinute>(curfewMinute()||1439)?15:0)-(S.family.trust-60)*.2,10,85);if(chance(p)){S.family.trust=clamp(S.family.trust-15);S.family.tension=clamp(S.family.tension+8);ground(7,'Went out without permission');log('Caught',`${primaryCaregiver()} finds out you went anyway. The trust you had built takes a real hit — and you are grounded for a week.`)}else{S.family.trust=clamp(S.family.trust-2);log('Got away with it','Nobody noticed this time. It does not feel as good as you expected.')}}
function npcInvitesPlayer(p){
 if(S.age<6)return;const types=Object.entries(PLAN_TYPES).filter(([,t])=>S.age>=t.minAge&&S.age<=(t.maxAge??200)&&(p.age||S.age)>=t.minAge),[type,t]=rand(types)||[];if(!type)return;
 const slot=planSlot(rand(['tomorrow','weekend']),type);if(!slot)return;
 const plan={id:uid('plan'),type,title:`${t.label} with ${displayName(p)}`,personId:p.id,hostIsPlayer:false,dateISO:slot.dateISO,startMinute:slot.start,endMinute:t.overnight?1439:Math.min(1439,slot.start+t.minutes),location:t.loc,status:'Pending',createdDate:currentDate()};
 plan.answerBy=minutesUntil(slot.dateISO,slot.start)>1800?{dateISO:addDays(currentDate(),1),minute:1080}:{dateISO:slot.dateISO,minute:Math.max(0,slot.start-120)};
 S.plans.unshift(plan);thread('plan',plan.id,plan.title,[p.id]);
 queueEvent({type:'invitation',title:`${displayName(p)} invites you: ${t.label.toLowerCase()}`,text:`${formatDate(slot.dateISO)} at ${timeLabel(slot.start)}, ${t.loc}. Answer by ${timeLabel(plan.answerBy.minute)}${plan.answerBy.dateISO!==currentDate()?' '+formatDate(plan.answerBy.dateISO):''}.`,participants:[p.id],payload:{planId:plan.id},priority:3,expiresAt:plan.answerBy,choices:[{id:'accept',label:'Accept'},{id:'maybe',label:'Maybe'},{id:'decline',label:'Decline politely'}]})
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

// ---------- v7.2 PHASE 5a: clubs, tryouts, progression & elections ----------
const LADDERS={generic:['New member','Member','Experienced member','Committee member','Vice President','President'],sport:['Reserve','Starter','Vice Captain','Captain'],drama:['Ensemble','Supporting role','Lead role','Stage manager','Club President'],council:['Class representative','Secretary','Vice President','President'],newspaper:['Writer','Senior writer','Editor','Editor-in-Chief'],debate:['Novice','Varsity debater','Vice Captain','Captain'],music:['Section member','Section leader','Concertmaster','Ensemble President']};
const CLUB_INFO={
 'Art Club':{kind:'open',skills:['art','creativity'],rep:'creative',ladder:'generic',leader:'Advisor'},'Reading Club':{kind:'open',skills:['reading'],rep:'academic',ladder:'generic',leader:'Advisor'},'Nature Club':{kind:'open',skills:['knowledge'],rep:'kindness',ladder:'generic',leader:'Advisor'},'Chess Club':{kind:'open',skills:['knowledge'],rep:'academic',ladder:'generic',leader:'Advisor'},'Music Group':{kind:'open',skills:['music'],rep:'creative',ladder:'generic',leader:'Advisor'},'Sports Club':{kind:'open',skills:['sports','fitness'],rep:'athletic',ladder:'generic',leader:'Coach'},
 'Science Club':{kind:'open',skills:['knowledge'],rep:'academic',ladder:'generic',leader:'Advisor'},'Coding Club':{kind:'open',skills:['programming'],rep:'academic',ladder:'generic',leader:'Advisor'},'Photography':{kind:'open',skills:['art'],rep:'creative',ladder:'generic',leader:'Advisor'},'Volunteer Club':{kind:'open',skills:[],rep:'kindness',ladder:'generic',leader:'Advisor'},'School Newspaper':{kind:'open',skills:['writing'],rep:'creative',ladder:'newspaper',leader:'Advisor'},'Recreational League':{kind:'open',skills:['sports','fitness'],rep:'athletic',ladder:'generic',leader:'Coach'},
 'Drama':{kind:'selective',entry:'audition',skills:['creativity','writing'],rep:'creative',ladder:'drama',leader:'Director',parts:['Monologue','Stage presence','Voice','Confidence'],spots:6},
 'Debate':{kind:'selective',entry:'audition',skills:['writing','knowledge'],rep:'leadership',ladder:'debate',leader:'Coach',parts:['Argument','Research','Delivery','Composure'],spots:5},
 'Music':{kind:'selective',entry:'audition',skills:['music'],rep:'creative',ladder:'music',leader:'Conductor',parts:['Technique','Sight-reading','Musicality','Nerves'],spots:6},
 'Football':{kind:'sport',entry:'tryout',skills:['sports','fitness'],rep:'athletic',ladder:'sport',leader:'Coach',parts:['Ball control','Shooting','Fitness','Teamwork'],spots:8},
 'Basketball':{kind:'sport',entry:'tryout',skills:['sports','fitness'],rep:'athletic',ladder:'sport',leader:'Coach',parts:['Dribbling','Shooting','Fitness','Teamwork'],spots:6},
 'Swimming':{kind:'sport',entry:'tryout',skills:['fitness','sports'],rep:'athletic',ladder:'sport',leader:'Coach',parts:['Technique','Endurance','Starts','Focus'],spots:8},
 'Volleyball':{kind:'sport',entry:'tryout',skills:['sports','fitness'],rep:'athletic',ladder:'sport',leader:'Coach',parts:['Serving','Passing','Fitness','Teamwork'],spots:7},
 'Track':{kind:'sport',entry:'tryout',skills:['fitness','sports'],rep:'athletic',ladder:'sport',leader:'Coach',parts:['Speed','Endurance','Technique','Focus'],spots:10},
 'Student Council':{kind:'elected',entry:'election',skills:['writing'],rep:'leadership',ladder:'council',leader:'Advisor'}
};
function clubInfo(name){return CLUB_INFO[name]||{kind:'open',skills:[],rep:'club',ladder:'generic',leader:'Advisor'}}
function activityOptions(){return S.age<10?['Art Club','Reading Club','Music Group','Sports Club','Nature Club','Chess Club']:S.age<15?['Art Club','Science Club','Football','Basketball','Drama','Coding Club','Music','Chess Club','School Newspaper','Volunteer Club','Student Council']:['Art Club','Debate','Science Club','Football','Basketball','Swimming','Volleyball','Track','Drama','Coding Club','Music','Photography','School Newspaper','Volunteer Club','Student Council']}
function ladderFor(c){return LADDERS[clubInfo(c.name).ladder]||LADDERS.generic}
function clubSkillScore(name){const sk=clubInfo(name).skills;if(!sk.length)return 50;return sk.reduce((a,k)=>a+skillValue(k),0)/sk.length}
// ---------- Sign-up / tryout / audition ----------
function signUpForActivity(offerId){
 const o=S.school?.activityOffers?.find(x=>x.id===offerId);if(!o||o.status!=='Offered')return;const info=clubInfo(o.name);
 if(o.decisionDate<currentDate()){o.status='Expired';toast('The signup window closed.');return}
 if(info.kind==='elected'){o.status='Joined';startElection({scope:'council',name:'Student Council',position:'Class representative'});return}
 if(info.kind==='open')return decideActivity(o.id,true);
 if(S.age<13){o.status='Waiting';createPending({type:'clubApproval',title:`${info.entry==='tryout'?'Try out for':'Audition for'} ${o.name}`,resolveDate:addDays(currentDate(),1),payload:{offerId:o.id,tryout:true},status:'Waiting for caregiver',detail:'Your caregiver will decide tomorrow.'});log('Asked permission',`You ask to ${info.entry==='tryout'?'try out for':'audition for'} ${o.name}.`);return}
 scheduleTryout(o)
}
function resolveClubApproval(p){const o=S.school?.activityOffers?.find(x=>x.id===p.payload?.offerId);if(!o){p.resolved=true;p.status='Cancelled';return}if(caregiverYes(8)){p.status='Approved';if(p.payload?.tryout)scheduleTryout(o);else activateClub(o)}else{o.status='Denied';p.status='Denied';log('Club permission denied',`Your caregiver says no to ${o.name} this time.`)}p.resolved=true}
function scheduleTryout(o,{attempt=1}={}){
 const info=clubInfo(o.name),date=nextSchoolDay(addDays(currentDate(),attempt>1?28:5+Math.floor(Math.random()*4)));
 o.status='Tryout';S.school.tryouts=S.school.tryouts||[];
 const prev=S.school.tryouts.find(t=>t.club===o.name&&t.status==='Scheduled');if(prev)return prev;
 const t={id:uid('tryout'),club:o.name,offerId:o.id,entry:info.entry,dateISO:date,prep:0,attempt,status:'Scheduled',coach:teacherName(o.name).replace(/^(Ms\.|Mr\.|Mx\.)/,info.leader),prepLog:{}};
 S.school.tryouts.unshift(t);createCalendarEvent({id:`tryout-${t.id}`,type:'tryout',title:`${o.name} ${info.entry}`,dateISO:date,startMinute:930,endMinute:1020,graceMinute:945,payload:{tryoutId:t.id},location:info.kind==='sport'?'School gym / field':'School auditorium',source:'club'});
 const th=thread('tryout',`tryout-${o.name}`,`${info.entry==='tryout'?'Making the':'Getting into'} ${o.name}${info.kind==='sport'?' team':''}`);threadStep(th,attempt>1?`Attempt ${attempt} scheduled`:'Signed up',`${info.entry} on ${formatDate(date)}`);
 log(`${o.name} ${info.entry} scheduled`,`${formatDate(date)} at ${timeLabel(930)}. ${t.coach} will be watching: ${info.parts.join(', ').toLowerCase()}. Practicing beforehand will help.`);
 const f=bestNonFamily();if(f&&chance(55))f.pendingAsk={kind:'tryout',club:o.name};
 return t
}
const PREP_MODES={alone:{label:'Practice alone',minutes:60,gain:8},friend:{label:'Practice with a friend',minutes:75,gain:10,friend:true},lessons:{label:'Take a lesson',minutes:60,gain:14,cost:25},camp:{label:'Weekend camp',minutes:360,gain:24,cost:60,weekend:true}};
function practiceForTryout(tryoutId,mode){
 const t=S.school?.tryouts?.find(x=>x.id===tryoutId),m=PREP_MODES[mode];if(!t||t.status!=='Scheduled'||!m)return;if(atSchool()){toast('After school.');return}
 if(m.weekend&&!isWeekend(currentDate())){toast('Camps run on weekends.');return}
 if(m.cost){if(S.age<18){if(!caregiverYes(-5)){toast(`Your caregiver will not pay ${money(m.cost)} for that right now.`);return}}else if(!spendOwn(m.cost)){toast(`It costs ${money(m.cost)}.`);return}}
 if(S.energy<15){toast('You are too tired to practice well.');return}
 const n=t.prepLog[currentDate()]||0,mult=[1,.55,.25,.1][Math.min(3,n)];t.prepLog[currentDate()]=n+1;
 const gain=Math.round(m.gain*mult);t.prep=clamp(t.prep+gain);for(const k of clubInfo(t.club).skills)practiceSkill(k,2*mult);S.energy=clamp(S.energy-8);
 let story=mode==='friend'?(()=>{const f=bestNonFamily();if(f){f.rel=clamp(f.rel+3);rememberPerson(f,`Helped you practice for the ${t.club} ${t.entry}.`)}return `${firstName(f)||'A friend'} helps you drill the basics. It is more fun than practicing alone.`})():mode==='lessons'?'A coach breaks down your technique and fixes one habit you did not know you had.':mode==='camp'?'A long, exhausting day of drills. You leave sore and noticeably better.':rand(['You practice until the basics feel automatic.','Rep after rep. Boring, but it works.']);
 advanceTime(m.minutes);log(`${m.label} • ${t.club}`,`${story} (Preparation ${t.prep}%${mult<1?' — diminishing returns today':''})`)
}
function attendTryout(tryoutId){
 const t=S.school?.tryouts?.find(x=>x.id===tryoutId);if(!t||t.status!=='Scheduled')return;const ev=S.calendar.find(e=>e.id===`tryout-${t.id}`);
 if(t.dateISO!==currentDate()){toast(`It is on ${formatDate(t.dateISO)}.`);return}
 if(currentMinute()>ev.graceMinute){processCalendar();toast('Check-in closed.');return}
 if(currentMinute()<ev.startMinute){if(ev.startMinute-currentMinute()>120){toast(`Starts at ${timeLabel(ev.startMinute)}.`);return}advanceTime(ev.startMinute-currentMinute(),{silent:true})}
 setCalendarStatus(ev,'Attending','Checked in');advanceTime(ev.endMinute-currentMinute(),{silent:true});evaluateTryout(t);setCalendarStatus(ev,'Attended','Tried out')
}
function evaluateTryout(t,{simulated=false}={}){
 const info=clubInfo(t.club),base=clubSkillScore(t.club),fit=skillValue('fitness'),conf=clamp(50+(S.happiness-50)*.4-(S.stress-40)*.4),rivals=(S.npcs||[]).filter(n=>n.interest===t.club&&Math.abs(npcAge(n)-S.age)<=2).length;
 const comps=info.parts.map((part,i)=>{let v=base*.55+t.prep*.3+(Math.random()*20-10)+(S.luck-50)*.08;if(/Fitness|Endurance|Speed/.test(part))v=fit*.6+t.prep*.25+(S.energy-50)*.15+(Math.random()*16-8);if(/Teamwork|Composure|Nerves|Focus|Confidence|presence/.test(part))v=conf*.6+t.prep*.2+(Math.random()*20-10);return [part,clamp(Math.round(v))]});
 const score=comps.reduce((a,[,v])=>a+v,0)/comps.length,threshold=48+Math.min(12,rivals*1.5)+(S.age>=15?4:0),weak=[...comps].sort((a,b)=>a[1]-b[1])[0],strong=[...comps].sort((a,b)=>b[1]-a[1])[0];
 let result,place;
 if(score>=threshold+12){result=info.kind==='sport'?'Selected — starting lineup':'Accepted — strong audition';place=1}
 else if(score>=threshold){result=info.kind==='sport'?'Selected — reserve':'Accepted';place=0}
 else if(score>=threshold-6){result='Waitlisted';place=-1}else{result='Not selected';place=-2}
 t.status='Completed';t.result=result;t.components=Object.fromEntries(comps);
 const o=S.school.activityOffers.find(x=>x.id===t.offerId)||{name:t.club,id:uid('offer')};
 const reason=place>=0?`${t.coach} liked your ${strong[0].toLowerCase()} (${strong[1]}).`:`${t.coach} liked your ${strong[0].toLowerCase()}, but your ${weak[0].toLowerCase()} (${weak[1]}) is not strong enough yet.`;
 const th=thread('tryout',`tryout-${t.club}`,`Making the ${t.club}`);recordOutcome(info.entry==='tryout'?'Club tryout':'Audition',`${t.club}${t.attempt>1?` (attempt ${t.attempt})`:''}`,result,reason,`Scores: ${comps.map(([k,v])=>`${k} ${v}`).join(', ')}.`);
 if(place>=0){activateClub(o);const c=S.school.clubs.find(x=>x.name===t.club&&x.status==='Active');if(c){c.position=ladderFor(c)[place===1&&info.kind==='sport'?1:0];c.coachNote=reason}addRep(info.rep,8);threadStep(th,'Made it',result,{resolve:true});if(!simulated){setEmotion('Proud',`You made ${t.club}.`,70);log(`🎉 ${t.club}: ${result}`,`${reason} ${place===1?'You go straight into the starting group.':'You are in — now earn more playing time.'}`,true)}}
 else if(place===-1){threadStep(th,'Waitlisted',reason);o.status='Waitlisted';scheduleFollowUp('waitlist',{tryoutId:t.id,offerId:o.id},{days:7,minute:960});if(!simulated)log(`${t.club}: waitlisted`,`${reason} You are first on the waitlist if a spot opens.`)}
 else{threadStep(th,'Not selected',reason);o.status='Not selected';t.nextDate=nextSchoolDay(addDays(currentDate(),28));if(!simulated){setEmotion('Disappointed',`You did not make ${t.club}.`,60);log(`${t.club}: not selected`,`"${reason.replace(/^\S+ \S+ /,'')}" ${t.coach} suggests practicing and coming back for the next ${info.entry} on ${formatDate(t.nextDate)}.`)}}
 const rv=(S.npcs||[]).find(n=>n.interest===t.club&&Math.abs(npcAge(n)-S.age)<=1);if(rv&&chance(45))maybeRival(rv.id,t.club);
 const f=S.people.find(p=>p.pendingAsk?.club===t.club);if(f&&!simulated){f.pendingAsk=null;scheduleFollowUp('friendAsks',{personId:f.id,club:t.club,result,place},{days:1,minute:720})}
}
function retryTryout(tryoutId){const t=S.school?.tryouts?.find(x=>x.id===tryoutId);if(!t||t.status!=='Completed'||t.result!=='Not selected')return;t.status='Retrying';const o=S.school.activityOffers.find(x=>x.id===t.offerId)||{id:uid('offer'),name:t.club};S.school.activityOffers.includes(o)||S.school.activityOffers.unshift(o);const nt=scheduleTryout(o,{attempt:(t.attempt||1)+1});nt.prep=Math.round(t.prep*.6)}
function joinRecreational(tryoutId){const t=S.school?.tryouts?.find(x=>x.id===tryoutId);if(!t)return;if(S.school.clubs.some(c=>c.name==='Recreational League'&&c.status==='Active')){toast('You are already in the recreational league.');return}activateClub({name:'Recreational League',status:'Offered'});log('Joined the recreational league','No tryouts, no pressure — just games every week. It keeps you playing while you improve.')}
function tryoutMissed(ev){const t=S.school?.tryouts?.find(x=>x.id===ev.payload?.tryoutId);setCalendarStatus(ev,'No-show','Did not attend tryout');if(!t)return;t.status='Completed';t.result='No-show';t.nextDate=nextSchoolDay(addDays(currentDate(),28));const th=thread('tryout',`tryout-${t.club}`,`Making the ${t.club}`);threadStep(th,'Missed the tryout','You did not show up');recordOutcome('Club tryout',t.club,'No-show','You missed the tryout.');if(!SIM.skipping)log(`Missed the ${t.club} ${t.entry}`,`${t.coach} reads your name twice. You are not there. The next chance is ${formatDate(t.nextDate)}.`)}
// ---------- Progression (coach appoints lower ranks) ----------
function checkClubPromotion(c){
 const L=ladderFor(c),i=Math.max(0,L.indexOf(c.position)),info=clubInfo(c.name),elected=Math.max(1,L.length-(info.kind==='sport'?2:2));if(i>=elected-1)return;
 const need=[[8,30],[18,45],[30,58],[45,68]][i]||[60,75],ok=c.attended>=need[0]&&(c.skill||0)>=need[1]&&clubAttendanceRate(c)>=70&&(c.leaderRel||50)>=55;
 if(!ok)return;c.position=L[i+1];addRep(info.rep,3);addRep('club',2);recordOutcome('Club',c.name,`Promoted to ${c.position}`,`${c.attended} sessions, ${clubAttendanceRate(c)}% attendance, skill ${Math.round(c.skill)}.`);if(!SIM.skipping)log(`${c.name}: ${c.position}`,`${c.leader} pulls you aside after practice. "You've earned this." You are now ${c.position}.`,true)
}
// ---------- Elections ----------
function electionCandidates(scope,clubName){const pool=(S.npcs||[]).filter(n=>Math.abs(npcAge(n)-S.age)<=1&&(n.goals.includes('classPresident')||n.traits.includes('Ambitious')||n.interest===clubName));const picks=[...pool].sort(()=>Math.random()-.5).slice(0,scope==='council'?2:1);if(!picks.length)picks.push(generateHousehold({kids:1})[0]);return picks.map(n=>({id:n.id,name:n.fullName,strength:clamp(35+n.reputation*.4+(n.goals.includes('classPresident')?10:0)+Math.random()*20)}))}
function startElection({scope,name,position,clubId=null}){
 if(!electionGradeOK()){toast('School elections are open to Grade 8 and Grades 10–12.');return}
 S.elections=S.elections||[];if(S.elections.some(e=>e.status==='Campaign'&&e.name===name))return;
 const date=nextSchoolDay(addDays(currentDate(),7)),el={id:uid('elec'),scope,name,clubId,position,startDate:currentDate(),date,status:'Campaign',points:0,done:{},opponents:electionCandidates(scope,name),promise:null};
 S.elections.unshift(el);createCalendarEvent({id:`elec-${el.id}`,type:'election',title:`${name} election`,dateISO:date,startMinute:870,endMinute:900,graceMinute:900,payload:{electionId:el.id},required:false,location:'School',source:'school'});
 const th=thread('election',el.id,`Running for ${position}${scope==='club'?` of ${name}`:''}`);threadStep(th,'Campaign started',`Against ${el.opponents.map(o=>o.name).join(' and ')}`);
 scheduleFollowUp('electionResult',{electionId:el.id},{dateISO:date,minute:900});
 log(`Running for ${position}`,`You put your name forward. Election day is ${formatDate(date)}. You are up against ${el.opponents.map(o=>o.name).join(' and ')}.`,true)
}
const CAMPAIGN={message:{label:'Write a campaign message',minutes:45},talk:{label:'Talk to classmates',minutes:60},friends:{label:'Ask friends for support',minutes:30},posters:{label:'Make posters',minutes:75,cost:5},speech:{label:'Practice & give your speech',minutes:60},online:{label:'Campaign online',minutes:30,minAge:13,phone:true},promise:{label:'Promise an initiative',minutes:15}};
function campaignAction(elId,kind,arg){
 const el=S.elections?.find(x=>x.id===elId),c=CAMPAIGN[kind];if(!el||el.status!=='Campaign'||!c)return;if(atSchool()&&kind!=='talk'){toast('Not during class.');return}
 const k=`${kind}-${currentDate()}`;if(el.done[k]){toast('You already did that today.');return}if(c.phone&&!canUsePhone()){toast('You need your phone.');return}if(c.cost&&S.age>=12&&!spendOwn(c.cost)){toast(`Posters cost ${money(c.cost)}.`);return}
 const r=ensureRep();let pts=0,story;
 if(kind==='message'){const g=skillValue('writing');pts=4+g*.08;story=rand(['You write a short, clear message about what you would actually change.','Three drafts later, the message finally sounds like you.'])}
 else if(kind==='talk'){pts=3+r.social*.06;addRep('social',.8);story=rand(['You talk to people you have never really talked to. Most are friendlier than expected.','A few people say they will vote for you. One says "who are you?"'])}
 else if(kind==='friends'){const fs=S.people.filter(p=>!isFamilyPerson(p)&&p.rel>=55);pts=fs.length*2.5;fs.forEach(f=>rememberPerson(f,'Promised to support your campaign.'));story=fs.length?`${fs.map(firstName).slice(0,3).join(', ')} promise to spread the word.`:'You realize you do not have many close friends to ask yet.'}
 else if(kind==='posters'){pts=3+skillValue('art')*.06;practiceSkill('art',1);story='Your posters go up near the cafeteria. One gets a mustache drawn on it by lunch.'}
 else if(kind==='speech'){const q=skillValue('writing')*.4+r.leadership*.3+(S.happiness-S.stress)*.2+Math.random()*25;el.speech=Math.round(q);pts=q*.15;story=q>=55?'Your speech lands. People actually laugh at the joke and clap at the end.':q>=35?'The speech is solid, if a little stiff.':'Your mind goes blank halfway through. You recover, but everyone noticed.'}
 else if(kind==='online'){pts=4+r.social*.05;story=chance(15)?'A post gets mocked in a group chat. It spreads a bit — not in a good way.':'Your post gets shared around. Strangers like it.';if(story.includes('mocked'))pts=-2;drainActivePhone()}
 else if(kind==='promise'){el.promise=arg||rand(['longer lunch breaks','a better school trip','more club funding','a student lounge']);pts=5;story=`You promise ${el.promise}. It is popular — and now you have to deliver if you win.`}
 el.points=Math.round((el.points+pts)*10)/10;el.done[k]=true;addRep('leadership',1);advanceTime(c.minutes);const th=thread('election',el.id,el.name);threadStep(th,'Campaigning',c.label);log(`Campaign • ${c.label}`,`${story} (campaign +${Math.round(pts)})`)
}
function decideElection(el){
 if(!el||el.status!=='Campaign')return;el.status='Decided';const r=ensureRep(),friends=S.people.filter(p=>!isFamilyPerson(p)&&p.rel>=60).length;
 const me=clamp(25+r.leadership*.25+r.social*.2+r.kindness*.1-r.troublemaker*.15+el.points+friends*1.5+(el.speech||0)*.12+Math.random()*12);
 const all=[{id:'player',name:S.name,score:me},...el.opponents.map(o=>({id:o.id,name:o.name,score:o.strength+Math.random()*14}))].sort((a,b)=>b.score-a.score),tot=all.reduce((a,x)=>a+x.score,0);
 all.forEach(x=>x.share=Math.round(100*x.score/tot));const topOpp=[...el.opponents].sort((a,b)=>b.strength-a.strength)[0];if(topOpp&&chance(60))setTimeout(()=>{},0),maybeRival(topOpp.id,'the election');el.results=all;const win=all[0].id==='player',winner=all[0];el.winner=winner.name;
 const th=thread('election',el.id,el.name);const ev=S.calendar.find(e=>e.id===`elec-${el.id}`);if(ev)setCalendarStatus(ev,'Completed','Votes counted');
 const margin=all[0].share-all[1].share,why=win?(el.points>=25?'Your campaign effort clearly paid off.':friends>=3?'Your friends carried a lot of votes.':'It was close, but enough people trusted you.'):(winner.score-me>15?`${winner.name} was simply better known.`:el.speech!=null&&el.speech<35?'The speech hurt you in the end.':'It came down to a handful of votes.');
 recordOutcome('Election',`${el.position}${el.scope==='club'?` • ${el.name}`:''}`,win?'Won':`Lost to ${winner.name}`,`${why} Votes: ${all.map(x=>`${x.id==='player'?'You':x.name} ${x.share}%`).join(', ')}.`);
 if(win){addRep('leadership',15);addRep('social',4);if(el.scope==='club'){const c=S.school?.clubs?.find(x=>x.id===el.clubId);if(c){c.position=el.position;c.leaderNpc=null}}else{S.school.councilRole=el.position;if(!S.school.clubs.some(c=>c.name==='Student Council'&&c.status==='Active'))activateClub({name:'Student Council',status:'Offered'});const sc=S.school.clubs.find(c=>c.name==='Student Council'&&c.status==='Active');if(sc)sc.position=el.position}threadStep(th,'Won',`${all[0].share}% of the vote`,{resolve:true});if(!SIM.skipping){setEmotion('Proud','You won an election.',75);log(`🗳️ You won: ${el.position}`,`${margin<=5?'By a razor-thin margin, ':''}you win with ${all[0].share}% of the vote. ${why}${el.promise?` Now people expect ${el.promise}.`:''}`,true);if(el.promise)scheduleFollowUp('promiseCheck',{electionId:el.id},{days:30,minute:780})}}
 else{addRep('leadership',3);if(el.scope==='club'){const c=S.school?.clubs?.find(x=>x.id===el.clubId);if(c)c.leaderNpc=winner.name}threadStep(th,'Lost',`${winner.name} won with ${winner.share}%`,{resolve:true});if(!SIM.skipping){setEmotion('Disappointed','You lost an election.',55);queueEvent({type:'electionLost',title:`${winner.name} won the election`,text:`You got ${all.find(x=>x.id==='player').share}% of the vote. ${why} What now?`,payload:{electionId:el.id,winnerId:winner.id},priority:3,expiresDays:3,choices:[{id:'support',label:`Congratulate ${winner.name} and offer help`},{id:'elsewhere',label:'Look for leadership elsewhere'},{id:'nextYear',label:'Plan to run again next year'},{id:'sulk',label:'Keep your distance'}]})}}
}
function handleElectionLost(e,id){const el=S.elections?.find(x=>x.id===e.payload?.electionId),npc=npcById(e.payload?.winnerId);let story;
 if(id==='support'){addRep('kindness',4);addRep('leadership',2);if(npc){let p=S.people.find(x=>x.npcId===npc.id);if(!p){p=personFromNpc(npc,'friend','classmate');p.rel=45;S.people.push(p)}p.rel=clamp(p.rel+8);rememberPerson(p,'You congratulated them after the election and offered to help.',2)}story=`You shake ${npc?.fullName||'the winner'}'s hand and offer to help. People notice — and remember.`}
 else if(id==='elsewhere'){story='You start paying attention to other clubs where you could lead.';exploreSchoolActivity()}
 else if(id==='nextYear'){S.flags.runAgain=true;story='You quietly decide you will run again — better prepared.';}
 else{S.happiness=clamp(S.happiness-2);story='You keep your distance from the winner for a while. It does not make you feel better.'}
 if(el)recordOutcome('Election',el.position,'Aftermath',story);log('After the election',story);return true}
function maybeOfferElection(c){if(c.status!=='Active'||!S.school||!electionGradeOK())return;const L=ladderFor(c),i=L.indexOf(c.position);if(i<L.length-3)return;if(S.elections?.some(e=>e.clubId===c.id&&(e.status==='Campaign'||daysBetween(e.startDate,currentDate())<300)))return;if(daysBetween(c.joinedDate||currentDate(),currentDate())<45)return;
 queueEvent({type:'electionOffer',title:`${c.name} is choosing its next ${L[L.length-1]}`,text:`As ${c.position}, you are eligible to run. Campaigning takes a week and you might lose.`,payload:{clubId:c.id},priority:3,expiresDays:3,choices:[{id:'run',label:`Run for ${L[L.length-1]}`},{id:'vp',label:`Run for ${L[L.length-2]}`},{id:'pass',label:'Not this time'}]})}
function handleElectionOffer(e,id){const c=S.school?.clubs?.find(x=>x.id===e.payload?.clubId);if(!c)return true;const L=ladderFor(c);if(id==='pass'){log('Not running',`You let others run for ${c.name} leadership this year.`);return true}startElection({scope:'club',name:c.name,clubId:c.id,position:id==='run'?L[L.length-1]:L[L.length-2]});return true}
function electionHtml(){const live=(S.elections||[]).filter(e=>e.status==='Campaign');if(!live.length)return '';return live.map(el=>{const d=daysBetween(currentDate(),el.date);return `<div class="session-card is-live"><div class="session-head"><div><b>🗳️ Running for ${esc(el.position)}${el.scope==='club'?` • ${esc(el.name)}`:''}</b><small>Election ${d<=0?'today':`in ${d} day${d===1?'':'s'}`} • against ${esc(el.opponents.map(o=>o.name).join(', '))} • campaign strength ${Math.round(el.points)}</small></div></div><div class="session-actions">${Object.entries(CAMPAIGN).filter(([,c])=>S.age>=(c.minAge||0)).map(([k,c])=>`<button class="small ${el.done[`${k}-${currentDate()}`]?'ghost':''}" data-campaign="${el.id}" data-kind="${k}" ${el.done[`${k}-${currentDate()}`]?'disabled':''}>${esc(c.label)}</button>`).join('')}</div>${el.promise?`<small class="muted-text">You promised ${esc(el.promise)}.</small>`:''}</div>`}).join('')}
function tryoutsHtml(){const list=(S.school?.tryouts||[]).filter(t=>t.status==='Scheduled'||(t.status==='Completed'&&['Not selected','No-show','Waitlisted'].includes(t.result)&&daysBetween(t.dateISO,currentDate())<=40));if(!list.length)return '';return list.map(t=>{const info=clubInfo(t.club),today=t.dateISO===currentDate();if(t.status==='Scheduled')return `<div class="commitment-card"><div><b>${esc(t.club)} ${esc(info.entry)} • ${today?'today':formatDate(t.dateISO)} ${timeLabel(930)}</b><small>${esc(t.coach)} looks at: ${esc(info.parts.join(', '))}${t.attempt>1?` • attempt ${t.attempt}`:''}</small><div class="progress"><i style="width:${clamp(t.prep)}%"></i></div><small>Preparation ${t.prep}%</small></div><div class="inline-actions">${today?`<button class="small primary" data-tryout-go="${t.id}">Go to ${esc(info.entry)}</button>`:''}${Object.entries(PREP_MODES).map(([k,m])=>`<button class="small ghost" data-tryout-prep="${t.id}" data-mode="${k}">${esc(m.label)}${m.cost?` • ${money(m.cost)}`:''}</button>`).join('')}</div></div>`;
  return `<div class="commitment-card"><div><b>${esc(t.club)}: ${esc(t.result)}</b><small>${t.components?Object.entries(t.components).map(([k,v])=>`${k} ${v}`).join(' • '):''}</small><small>${t.result==='Waitlisted'?'Waiting to hear if a spot opens.':`Next ${info.entry}: ${formatDate(t.nextDate||currentDate())}`}</small></div>${t.result!=='Waitlisted'?`<div class="inline-actions"><button class="small" data-tryout-retry="${t.id}">Sign up to try again</button>${info.kind==='sport'?`<button class="small ghost" data-tryout-rec="${t.id}">Join the recreational league</button>`:''}</div>`:''}</div>`}).join('')}
function handleClubClick(b){
 const d=b.dataset;
 if(d.activitySignup){signUpForActivity(d.activitySignup);save();render();return true}
 if(d.activityInfo){const o=S.school?.activityOffers?.find(x=>x.id===d.activityInfo),i=clubInfo(o?.name);if(o)openModal(o.name,`<p>${i.kind==='open'?'Open club — anyone can sign up.':i.kind==='sport'?`Sport — requires a tryout. The coach evaluates ${i.parts.join(', ').toLowerCase()}. About ${i.spots} spots.`:i.kind==='elected'?'Student Council — you get in by winning an election.':`Selective — requires an audition: ${i.parts.join(', ').toLowerCase()}.`}</p><p class="muted-text">Relevant skills: ${i.skills.map(k=>SKILL_LABEL[k]||k).join(', ')||'none in particular'}. Your level: ${Math.round(clubSkillScore(o.name))}. Positions: ${(LADDERS[i.ladder]||LADDERS.generic).join(' → ')}.</p><div class="modal-action-grid single"><button data-close-modal="1">Close</button></div>`);return true}
 if(d.tryoutPrep){practiceForTryout(d.tryoutPrep,d.mode);save();render();return true}
 if(d.tryoutGo){attendTryout(d.tryoutGo);save();render();return true}
 if(d.tryoutRetry){retryTryout(d.tryoutRetry);save();render();return true}
 if(d.tryoutRec){joinRecreational(d.tryoutRec);save();render();return true}
 if(d.campaign){campaignAction(d.campaign,d.kind);save();render();return true}
 if(d.runCouncil){startElection({scope:'council',name:'Student Council',position:'Class representative'});save();render();return true}
 return false
}
// ---------- v7.2 PHASE 5a UI: people, plans, rules ----------
function peoplePanel(){
 const status=p=>{const a=npcStatusAt(p);return a.free?'<span class="tag ok">Free now</span>':`<span class="tag" title="${esc(a.why)}">${a.atSchool?'At school':'Busy'}</span>`};
 const goals=p=>(p.goals||[]).length&&p.trust>=55&&!isFamilyPerson(p)?`<small class="person-goals">Wants to ${esc(p.goals.map(g=>GOAL_LABEL[g]||g).join(', '))}</small>`:'';
 return `<div class="dashboard"><section class="card wide"><h3>${S.age<6?'Your social world':'Relationships remember what happened'}</h3><p class="muted-text">People have their own schedules, goals and limits. Close friends go by their nickname; others by their full name.</p></section>${S.people.map(p=>`<section class="person-card"><div class="person-title"><div><h3>${esc(isFamilyPerson(p)?`${p.name}${p.fullName?` (${p.fullName})`:''}`:displayName(p,'formal'))}</h3><small>${esc(p.roleLabel||p.role)} • known since age ${p.knownSince}${(p.traits||[]).length?` • ${esc(p.traits.slice(0,2).join(', '))}`:''}</small>${goals(p)}</div>${isFamilyPerson(p)?`<span class="tag">${esc(p.mood)}</span>`:status(p)}</div><div class="relationship-bars"><label>Closeness <span>${Math.round(p.rel)}</span><i><em style="width:${clamp(p.rel)}%"></em></i></label><label>Trust <span>${Math.round(p.trust)}</span><i><em style="width:${clamp(p.trust)}%"></em></i></label><label>Conflict <span>${Math.round(p.conflict)}</span><i class="dangerbar"><em style="width:${clamp(p.conflict)}%"></em></i></label></div><p class="muted-text">${esc(p.memory)}</p><div class="inline-actions"><button class="small primary" data-person-open="${p.id}">Interact with ${esc(firstName(p))}</button>${S.age>=6&&!['parent','grandparent'].includes(p.role)?`<button class="small" data-plan-open="${p.id}">Make plans</button>`:''}</div></section>`).join('')}${S.age>=8?`<section class="card"><h3>Friend group</h3>${groupHtml()}</section>`:''}${S.age>=13?`<section class="card"><h3>Romance</h3>${(()=>{const pp=partnerPerson();return pp?`<p>${S.age<16?'Going out with':'Dating'} <b>${esc(displayName(pp))}</b> • closeness ${Math.round(pp.rel)}</p>`:'<p class="muted-text">Single. Romance is optional — nothing here is forced.</p>'})()}${(S.rivals||[]).length?`<h4>Rivals</h4>${S.rivals.map(r=>{const p=S.people.find(x=>x.npcId===r.npcId);return p?`<p>${esc(p.name)} <small class="muted-text">• ${esc(r.domain)} • ${esc(r.type)}</small></p>`:''}).join('')}`:''}</section>`:''}<section class="card wide"><h3>Plans & invitations</h3>${plansHtml()}</section>${S.age<18?`<section class="card"><h3>House rules</h3>${houseRulesHtml()}</section>`:''}</div>`
}
PANEL_TABS.people=[['people','People'],['plans','Plans'],['rules','House rules']];
SECTION_RULES.people=[[/plans/i,'plans'],[/house rules/i,'rules'],[/.*/,'people']];
SECTION_RULES.world=[[/journal|milestone|education|life log|story|outcome|awards/i,'journal'],[/.*/,'world']];
function offerButtons(o){const i=clubInfo(o.name);if(o.status!=='Offered')return statusTag(o.status==='Tryout'?'Tryout scheduled':o.status);const lab=i.kind==='open'?(S.age<13?'Ask to join':'Sign up'):i.kind==='elected'?'Run for class rep':i.entry==='tryout'?(S.age<13?'Ask to try out':'Sign up for tryout'):(S.age<13?'Ask to audition':'Sign up for audition');return `<div class="inline-actions"><button class="small" data-activity-signup="${o.id}">${lab}</button><button class="small ghost" data-activity-info="${o.id}">Learn more</button><button class="small ghost" data-activity-decline="${o.id}">Decline</button></div>`}

// =====================================================================
// v7.2 PHASE 5b — ROMANCE, DATES AS SCENES, BOUNDARIES & CONSENT
// Safety rules enforced in logic (not only UI):
//  • Romance needs the player ≥13 and an age-appropriate partner:
//    minors only with other minors aged 13–17 within 2 years; adults only with adults.
//  • Anything beyond hand-holding / a hug is adult-only (18+, both adults).
//  • Adult intimacy requires mutual consent each time, fades to black, and
//    respecting "no" is never punished.
// =====================================================================
function personAge(p){const n=npcById(p?.npcId);return n?npcAge(n):(p?.age??S.age)}
function eligibleRomance(p){if(!p||isFamilyPerson(p)||S.age<13||S.romance?.optOut)return false;const a=personAge(p);if(S.age<18)return a>=13&&a<18&&Math.abs(a-S.age)<=2;return a>=18}
function adultRomance(p){return S.age>=18&&personAge(p)>=18}
const BOUNDARIES={noPublicAffection:'does not like public displays of affection',noExpensiveGifts:'is uncomfortable with expensive gifts',needsTime:'needs time before anything serious',noParties:'does not enjoy big parties',notReady:'is not ready for a relationship right now'};
function ensureRomanceProfile(p){
 if(p.romanceInit)return p;p.romanceInit=true;const h=dayHash(p.id+'attr');
 p.attraction=p.attraction??Math.round(h*.8+Math.random()*20);p.romanceStage=p.romanceStage||'none';p.romanceOpen=p.romanceOpen??(dayHash(p.id+'open')>=18);
 if(!p.boundaries){const t=p.traits||[],b=[];if(t.includes('Shy')||t.includes('Quiet'))b.push('noPublicAffection');if(t.includes('Generous')||chance(20))b.push('noExpensiveGifts');if(chance(25))b.push('needsTime');if(t.includes('Shy')||chance(15))b.push('noParties');if(!p.romanceOpen)b.push('notReady');p.boundaries=[...new Set(b)]}
 return p
}
function partnerPerson(){return S.romance?.partnerId?personById(S.romance.partnerId):null}
function setPartner(p,stage='dating'){S.romance.partnerId=p.id;S.romance.partner=displayName(p,'formal');S.romance.status=stage==='partner'?'In a relationship':S.age<16?'Going out':'Dating';p.romanceStage=stage}
function endRelationship(p,reason,{byNpc=false}={}){if(!p)return;p.romanceStage='ex';p.conflict=clamp((p.conflict||0)+10);if(S.romance.partnerId===p.id){S.romance.partnerId=null;S.romance.partner=null;S.romance.status='Single'}S.romance.history.push({dateISO:currentDate(),age:S.age,name:displayName(p,'formal'),event:`Broke up — ${reason}`});rememberPerson(p,`You broke up: ${reason}.`,2);recordOutcome('Relationship',displayName(p,'formal'),'Broke up',reason);setEmotion(byNpc?'Heartbroken':'Conflicted','A relationship ended.',70)}
function romanceMenu(personId){
 const p=personById(personId);if(!p)return;if(!eligibleRomance(p)){toast(S.age<13?'Romance is not part of this stage of life.':'That would not be appropriate.');return}ensureRomanceProfile(p);
 const st=p.romanceStage,minor=S.age<18,opts=[];
 if(st==='none'||st==='ex'||st==='crush'){opts.push(['admire',minor&&S.age<16?'Admit you like them':'Flirt a little']);opts.push(['askOut',minor?'Ask them to hang out, just you two':'Ask them on a date'])}
 if((st==='dating'||st==='partner')&&adultRomance(p))opts.push(['intimate','Suggest an intimate evening together']);
 if(st==='dating'||st==='partner'){opts.push(['date',minor?'Plan a date (hang out together)':'Plan a date']);if(st==='dating')opts.push(['official',minor?'Ask if you are officially going out':'Make it official']);opts.push(['talkRel','Talk about the relationship']);opts.push(['breakUp','Break up'])}
 openModal(`${displayName(p)} • romance`,`<p class="muted-text">${minor?'Teen romance stays age-appropriate: hanging out, holding hands, slow dances.':'Adult relationships: consent comes first, every time.'} ${p.boundaries?.length&&p.trust>=55?`You know that ${firstName(p)} ${esc(p.boundaries.map(b=>BOUNDARIES[b]).slice(0,2).join(' and '))}.`:''}</p><div class="modal-action-grid">${opts.map(([id,l])=>`<button data-romance="${id}" data-person-id="${p.id}">${esc(l)}</button>`).join('')}<button class="ghost" data-close-modal="1">Not now</button></div>`)
}
function romanceAction(p,kind){
 if(!eligibleRomance(p))return;ensureRomanceProfile(p);closeChoiceModal();const a=p.attraction,minor=S.age<18;let story;
 if(kind==='admire'){const ok=p.romanceOpen&&chance(20+a*.5+(p.rel-50)*.4);p.rel=clamp(p.rel+(ok?3:0));if(ok&&p.romanceStage==='none')p.romanceStage='crush';story=ok?rand([`${firstName(p)} goes a little red, then smiles. "I kind of hoped you'd say something."`,`${firstName(p)} laughs, surprised — but they are clearly pleased.`]):p.romanceOpen?`${firstName(p)} smiles kindly. "That's really sweet… I just see you as a friend." It stings, but it is honest.`:`"I'm not really looking for anything like that right now," ${firstName(p)} says gently.`;if(!ok)S.happiness=clamp(S.happiness-3);setEmotion(ok?'Excited':'Embarrassed','A romantic moment.',55)}
 else if(kind==='askOut'){if(S.romance.partnerId&&S.romance.partnerId!==p.id){story=`You are already seeing ${S.romance.partner}. Asking someone else out would not be fair to anyone.`;log('Not like this',story);return}
  if(p.datingNpc){story=`"I'm actually seeing ${p.datingNpc}," ${firstName(p)} says. "Sorry."`;log('Already taken',story);return}
  if(p.boundaries?.includes('needsTime')&&(p.romanceAsks||0)>=1&&daysBetween(p.lastRomanceAsk||'2000-01-01',currentDate())<21){p.trust=clamp(p.trust-4);story=`${firstName(p)} looks uncomfortable. "I told you I need some time. Please don't keep asking."`;log('Boundary',story);rememberPerson(p,'You pushed after they asked for time.');return}
  p.romanceAsks=(p.romanceAsks||0)+1;p.lastRomanceAsk=currentDate();
  const ok=p.romanceOpen&&chance(10+a*.55+(p.rel-50)*.5+(p.trust-50)*.2-(p.conflict||0)*.5);
  if(ok){setPartner(p,'dating');p.rel=clamp(p.rel+5);story=minor?`${firstName(p)} says yes. You are officially going out — which mostly means hanging out more and texting a lot.`:`${firstName(p)} says yes. A first date is in your future.`;recordOutcome('Relationship',displayName(p,'formal'),'Said yes',`Attraction and closeness were there.`);log(`${firstName(p)} said yes`,story,true);return}
  p.rel=clamp(p.rel-1);story=!p.romanceOpen?`"I really like you — just not like that, and I'm not dating right now," ${firstName(p)} says.`:a<35?`"You're great, but I don't feel that way," ${firstName(p)} says kindly.`:`"Can we stay friends for now? I'm not sure yet."`;recordOutcome('Relationship',displayName(p,'formal'),'Said no',story);log('Not this time',story);setEmotion('Disappointed','Rejected.',50);return}
 else if(kind==='official'){const ok=p.rel>=65&&chance(40+a*.4);if(ok){setPartner(p,'partner');story=`You talk about it, a little awkwardly. You are officially together.`}else story=`${firstName(p)} wants to keep things casual a bit longer.`}
 else if(kind==='talkRel'){p.trust=clamp(p.trust+3);p.conflict=clamp((p.conflict||0)-4);story=rand([`You talk honestly about what is working and what is not. It feels grown-up.`,`${firstName(p)} admits they have been worried about something. Saying it out loud helps.`])}
 else if(kind==='breakUp'){endRelationship(p,'you ended it');story=`You tell ${firstName(p)} it is over. It is not easy for either of you.`}
 else if(kind==='date'){startDate(p.id);return}
 else if(kind==='intimate'){if(!adultRomance(p)||!['dating','partner'].includes(p.romanceStage))return;const yes=chance(30+(p.attraction||50)*.3+(p.trust-50)*.5+(p.rel-50)*.3-(p.boundaries?.includes('needsTime')?35:0)-(S.stress>70?10:0));if(yes){p.rel=clamp(p.rel+4);p.trust=clamp(p.trust+2);S.stress=clamp(S.stress-6);S.happiness=clamp(S.happiness+4);story=`You ask; ${firstName(p)} says yes, clearly and happily. (fade to black) The next morning feels easy and close.`;advanceTime(120,{silent:true})}else{p.trust=clamp(p.trust+2);story=`${firstName(p)} says not tonight. You say "of course" and mean it — you watch a movie instead, and ${firstName(p)} seems to relax even more around you.`}rememberPerson(p,yes?'An intimate evening together (mutual).':'You respected a no without any pressure.',2);log(`${firstName(p)}`,story);return}
 if(!story)return;rememberPerson(p,story.slice(0,90),2);advanceTime(30);log(`${firstName(p)}`,story)
}
// ---------- Scene runner (dates, prom night) ----------
function startScene(kind,data){S.scene={id:uid('scene'),kind,step:0,score:50,lines:[],data};renderScene()}
function sceneDef(){return S.scene?.kind==='date'?DATE_SCENE:S.scene?.kind==='prom'?PROM_SCENE:null}
function renderScene(){const sc=S.scene,def=sceneDef();if(!sc||!def){S.scene=null;return}const st=def.steps[sc.step];if(!st){finishScene();return}const view=st.view(sc);openModal(view.title,`${sc.lines.length?`<div class="scene-lines">${sc.lines.slice(-3).map(l=>`<p>${esc(l)}</p>`).join('')}</div>`:''}<p class="scene-text">${esc(view.text)}</p><div class="modal-action-grid">${view.choices.map(c=>`<button class="${c.primary?'primary':''}" data-scene-choice="${esc(c.id)}">${esc(c.label)}</button>`).join('')}</div>`)}
function sceneChoice(id){const sc=S.scene,def=sceneDef();if(!sc||!def)return;const st=def.steps[sc.step];const r=st.choose(sc,id)||{};if(r.line)sc.lines.push(r.line);if(r.score)sc.score=clamp(sc.score+r.score);if(r.minutes)advanceTime(r.minutes,{silent:true});if(r.end){finishScene(r);return}sc.step=r.goto??sc.step+1;save();renderScene()}
function finishScene(r={}){const sc=S.scene,def=sceneDef();S.scene=null;closeChoiceModal();if(def)def.finish(sc,r);save();render()}
// ---------- Date as a scene (§83) ----------
const DATE_PLACES=[{id:'picnic',label:'Picnic in the park',outdoor:true,cost:6},{id:'cafe',label:'Café',cost:10},{id:'movie',label:'Movie',cost:14},{id:'walk',label:'Long walk',outdoor:true,cost:0},{id:'arcade',label:'Arcade / mini golf',cost:12},{id:'dinner',label:'Dinner out',cost:35,adult:true},{id:'cook',label:'Cook together at home',cost:8,adult:true},{id:'beach',label:'Beach trip',outdoor:true,cost:10,minAge:16}];
const TOPICS={school:'School / work',family:'Family',future:'The future',interests:'Interests',relationship:'Us',gossip:'Gossip',insecurities:'Something personal',jokes:'Jokes'};
function topicFit(p,t){const tr=p.traits||[];let v=0;if(t==='school'||t==='future')v+=tr.includes('Studious')||tr.includes('Ambitious')?10:0;if(t==='jokes')v+=tr.includes('Funny')?12:tr.includes('Quiet')?-2:4;if(t==='interests')v+=tr.some(x=>['Sporty','Artsy','Curious'].includes(x))?10:4;if(t==='gossip')v+=tr.includes('Outgoing')?6:tr.includes('Kind')?-6:0;if(t==='family')v+=tr.includes('Kind')||tr.includes('Loyal')?8:2;if(t==='insecurities')v+=p.trust>=60?12:-8;if(t==='relationship')v+=p.romanceStage==='partner'?8:p.boundaries?.includes('needsTime')?-10:2;return v}
function startDate(personId,{valentine=false}={}){const p=personById(personId);if(!p||!eligibleRomance(p)){toast('Not possible.');return}if(atSchool()){toast('After school.');return}const st=npcStatusAt(p);if(!st.free){toast(st.why);return}if(S.age<18&&curfewMinute()&&currentMinute()+150>curfewMinute()){toast(`That would run past your ${timeLabel(curfewMinute())} curfew.`);return}closeChoiceModal();startScene('date',{personId,valentine})}
const DATE_SCENE={steps:[
 {view:sc=>{const p=personById(sc.data.personId);return {title:`${sc.data.valentine?"Valentine's date":'Date'} with ${firstName(p)}`,text:'Where do you go?',choices:DATE_PLACES.filter(x=>(!x.adult||S.age>=18)&&(!x.minAge||S.age>=x.minAge)).map(x=>({id:x.id,label:`${x.label}${x.cost&&S.age>=13?` • ${money(x.cost)}`:''}`}))}},
  choose:(sc,id)=>{const pl=DATE_PLACES.find(x=>x.id===id);sc.data.place=id;if(pl.cost&&S.age>=13&&!spendOwn(pl.cost)){sc.data.broke=true;return {line:`You realize you cannot afford the ${pl.label.toLowerCase()}, so you suggest a walk instead.`,score:-4}}const p=personById(sc.data.personId);if(pl.outdoor&&['Rainy','Stormy'].includes(S.weather.type)){sc.data.rain=true;return {line:`It is ${S.weather.type.toLowerCase()} — you end up under an awning, laughing.`,score:2,minutes:20}}return {line:rand([`You meet ${firstName(p)} at the ${pl.label.toLowerCase()}. They look happy to see you.`,`${firstName(p)} is already there, waving.`]),minutes:20}}},
 {view:sc=>({title:'Talking',text:'What do you talk about?',choices:Object.entries(TOPICS).map(([id,l])=>({id,label:l}))}),
  choose:(sc,id)=>{const p=personById(sc.data.personId),v=topicFit(p,id)+Math.random()*8-4;sc.data.topic=id;const good=v>=6,bad=v<=-4;const lines={school:good?`You trade stories about your days; ${firstName(p)} is surprisingly funny about it.`:'The conversation drifts into complaints about school. A bit flat.',family:good?`${firstName(p)} tells you about their family. You learn more than you expected.`:'Family talk gets awkward fast.',future:good?'You talk about the future — big dreams, small fears. It feels easy.':'Talk about the future gets a little heavy for this stage.',interests:good?`You discover you both love the same weird thing. ${firstName(p)} lights up.`:'Your interests barely overlap. You try anyway.',relationship:good?'You talk about where this is going. You both smile more than you talk.':`${firstName(p)} goes a bit quiet. Maybe too soon.`,gossip:good?'Light gossip, lots of laughing.':`${firstName(p)} looks uncomfortable gossiping about people.`,insecurities:good?`You share something personal. ${firstName(p)} listens carefully, then shares something back.`:'You open up, but it is a bit much right now.',jokes:good?`You make ${firstName(p)} laugh so hard they snort. That breaks the ice completely.`:'A joke falls flat. Silence. Then you both laugh at how badly it landed.'};return {line:lines[id],score:good?10:bad?-8:2,minutes:40}}},
 {view:sc=>{const ev=sc.data.ev||(sc.data.ev=rand(['spill','friend','view','phone','none','none']));const t={spill:'Someone bumps your table and a drink goes everywhere.',friend:`You run into a classmate who clearly wants to know what is going on.`,view:'The light is perfect right now — the kind of moment people remember.',phone:'Your phone keeps buzzing.',none:'The conversation finds an easy rhythm.'}[ev];return {title:'Something happens',text:t,choices:ev==='spill'?[{id:'laugh',label:'Laugh it off'},{id:'fuss',label:'Get flustered'}]:ev==='friend'?[{id:'introduce',label:'Introduce them'},{id:'wave',label:'Wave and keep going'}]:ev==='phone'?[{id:'silence',label:'Put it away'},{id:'check',label:'Check it'}]:[{id:'enjoy',label:'Enjoy the moment'},{id:'deep',label:'Ask a deeper question'}]}},
  choose:(sc,id)=>{const p=personById(sc.data.personId);const m={laugh:[`You both laugh it off. ${firstName(p)} says it is the best part so far.`,8],fuss:['You get flustered and apologize too much. It takes a while to recover.',-6],introduce:[p.boundaries?.includes('noPublicAffection')?`${firstName(p)} tenses up a little at being "seen" on a date.`:`${firstName(p)} handles it with a grin. No big deal.`,p.boundaries?.includes('noPublicAffection')?-5:4],wave:['You wave and keep the focus on your date. Noted, and appreciated.',5],silence:['You put your phone face-down. They notice.',6],check:[`${firstName(p)} looks away while you scroll. The mood dips.`,-7],enjoy:['You just enjoy it. No need to fill the silence.',6],deep:[p.trust>=55?`${firstName(p)} answers thoughtfully. You feel closer.`:`${firstName(p)} deflects — too soon for that question.`,p.trust>=55?9:-3]}[id]||['…',0];return {line:m[0],score:m[1],minutes:30}}},
 {view:sc=>{const p=personById(sc.data.personId),adult=adultRomance(p);const ch=[{id:'walkHome',label:adult?'Walk them home':'Walk them home / to their ride'},{id:'hug',label:'Hug goodbye'}];if(S.age>=13)ch.push({id:'hands',label:'Hold hands on the way'});if(adult)ch.push({id:'kiss',label:'Kiss goodnight'},{id:'invite',label:'Ask if they want to come in'});ch.push({id:'early',label:'Call it a night'});return {title:'End of the date',text:'How do you say goodbye?',choices:ch}},
  choose:(sc,id)=>{const p=personById(sc.data.personId);if(['kiss','invite'].includes(id)&&!adultRomance(p))return {line:'You say a warm goodbye.',end:true};
   if(id==='invite'){const yes=chance(sc.score*.6+(p.trust-50)*.4+(p.attraction||50)*.2-(p.boundaries?.includes('needsTime')?30:0));sc.data.invite=yes?'yes':'no';return {line:yes?`${firstName(p)} smiles. "I'd like that." (fade to black)`:`${firstName(p)} hesitates. "Not tonight — but I had a really good time." You say goodnight and mean it.`,end:true}}
   if(id==='kiss'){const ok=chance(sc.score*.7+(p.attraction||50)*.3);return {line:ok?'A goodnight kiss — brief and nice.':`${firstName(p)} turns it into a hug. You take the hint, warmly.`,score:ok?5:0,end:true}}
   return {line:{walkHome:`You walk ${firstName(p)} home. Neither of you is in a hurry.`,hug:'A long hug goodbye.',hands:'You hold hands most of the way. Small thing; big feeling.',early:'You call it a night a little early.'}[id],score:{walkHome:4,hug:3,hands:5,early:-3}[id],end:true}}}
],finish(sc){
 const p=personById(sc.data.personId);if(!p)return;const s=sc.score,tier=s>=78?'Great date':s>=58?'Good date':s>=40?'Awkward date':'Rough date',why=sc.lines.slice(1).join(' ');
 p.rel=clamp(p.rel+(s>=78?7:s>=58?4:s>=40?0:-3));p.fun=clamp(p.fun+5);p.attraction=clamp((p.attraction||50)+(s>=58?4:-3));if(sc.data.invite==='yes')p.trust=clamp(p.trust+3);if(sc.data.invite==='no'){p.trust=clamp(p.trust+2)}
 if(s<40&&p.romanceStage==='dating'&&chance(25))endRelationship(p,'the spark was not there',{byNpc:true});
 S.needs.social=clamp(S.needs.social+15);S.needs.fun=clamp(S.needs.fun+12);rememberPerson(p,`${tier}: ${(DATE_PLACES.find(x=>x.id===sc.data.place)||{}).label||'a date'}.`,2);
 recordOutcome('Date',`${sc.data.valentine?"Valentine's date":'Date'} with ${displayName(p,'formal')}`,tier,why.slice(0,180));
 log(`${sc.data.valentine?"💌 Valentine's date":'Date'} with ${firstName(p)} — ${tier.toLowerCase()}`,`${why} ${sc.data.invite==='yes'?'You spend the night together.':''}`.trim(),s>=78)
}};

// ---------- v7.2 PHASE 5b: PROM (§63–70) ----------
function promEligible(){const g=gradeNumber();return needsFormalSchool()&&g>=8&&g<=12}
function promDaysLeft(){const pr=S.school?.prom;return pr?daysBetween(currentDate(),pr.dateISO):null}
function promTick(){
 const pr=ensureProm();if(!pr||['Done','Skipped'].includes(pr.status))return;const d=promDaysLeft();
 if(pr.status==='Upcoming'&&d<=28){pr.status='Season';const th=thread('prom',`prom-${pr.year}`,'Prom season');threadStep(th,'Prom announced',`${formatDate(pr.dateISO)} at ${pr.venue}`);if(!SIM.skipping)log(pr.junior?'💃 Junior Prom is coming':'💃 Prom is coming',`Posters go up everywhere: ${pr.junior?'junior prom':'prom'} is on ${formatDate(pr.dateISO)} at ${pr.venue}. Dress code: formal. Tickets ${money(pr.ticket)}. Suddenly everyone is asking everyone.`,true)}
 if(pr.status!=='Season')return;
 // NPC agency: peers pair up, some decide not to go
 const pool=S.people.filter(p=>!isFamilyPerson(p)&&personAge(p)>=13&&personAge(p)<=18&&Math.abs(personAge(p)-S.age)<=2&&!p.promWith&&p.id!==pr.partnerId);
 for(const p of pool){if(personPromWith(p))continue;const cpl=p.datingNpc&&(S.npcs||[]).find(n=>n.fullName===p.datingNpc);if(cpl&&!cpl.promWith){pairPersonWithNpc(p,cpl);continue}if(chance(3)){const other=freePromNpc([p.npcId],personAge(p));if(other){pairPersonWithNpc(p,other);if(p.rel>=60&&!SIM.skipping)log('Prom news',`${firstName(p)} is going to prom with ${other.fullName}.`)}}else if(chance(.6))p.notGoingProm=true}
 // NPC asks the player
 const dleft=promDaysLeft();if(!SIM.skipping&&!pr.partnerId&&!pr.received.some(r=>r.status==='Pending')&&chance(7+(dleft<=14?8:0))){const c=S.people.filter(p=>eligibleRomance(p)&&!personPromWith(p)&&!p.datingNpc).map(ensureRomanceProfile).filter(p=>(p.attraction>=45&&p.rel>=40)||(dleft<=10&&p.rel>=55)).sort((a,b)=>b.attraction-a.attraction)[0];if(c)npcAsksToProm(c)}
}
function npcAsksToProm(p){const pr=S.school.prom;pr.received.push({personId:p.id,dateISO:currentDate(),status:'Pending'});queueEvent({type:'promInvite',title:`${displayName(p)} asks about prom`,text:`"So… do you have plans for prom? Would you want to go with me?" ${firstName(p)} looks nervous.`,participants:[p.id],priority:4,expiresDays:3,choices:[{id:'accept',label:'Accept'},{id:'friends',label:'Suggest going as friends'},{id:'time',label:'Say you need time'},{id:'decline',label:'Politely decline'},...(pr.partnerId?[{id:'have',label:'Tell them you already have a date'}]:[])]})}
function handlePromInvite(e,id){
 const pr=S.school?.prom,p=personById(e.participants?.[0]);if(!pr||!p)return true;const rec=pr.received.find(r=>r.personId===p.id&&r.status==='Pending');const th=thread('prom',`prom-${pr.year}`,'Prom season');
 if(id==='accept'){if(pr.partnerId){toast('You already have a prom date.');return true}pr.partnerId=p.id;pr.plan='date';pr.asFriends=false;if(rec)rec.status='Accepted';p.rel=clamp(p.rel+6);setPromWithPerson(p,S.name);threadStep(th,'Got a prom date',`${displayName(p)} asked you`);recordOutcome('Prom',`${displayName(p,'formal')} asked you`,'Accepted','You said yes.');log('Prom date!',`You say yes. ${firstName(p)} grins and tries to act casual about it. It is not working.`,true);if(eligibleRomance(p)&&p.romanceStage==='none')p.romanceStage='crush'}
 else if(id==='friends'){pr.partnerId=p.id;pr.plan='date';pr.asFriends=true;if(rec)rec.status='Accepted as friends';p.rel=clamp(p.rel+3);setPromWithPerson(p,S.name);threadStep(th,'Going with a friend',displayName(p));log('Prom — as friends',`"As friends? Sure — honestly that's less pressure," ${firstName(p)} says.`)}
 else if(id==='time'){if(rec){rec.status='Waiting';rec.deadline=addDays(currentDate(),2)}scheduleFollowUp('promTimeout',{personId:p.id},{days:2,minute:1080});log('You need time',`"Can I get back to you?" ${firstName(p)} nods. "Sure… just don't take too long."`)}
 else if(id==='have'){if(rec)rec.status='Declined';log('Already going',`You tell ${firstName(p)} you already have a date. "Oh — right. Of course." It is a little awkward.`)}
 else{if(rec)rec.status='Declined';p.rel=clamp(p.rel-1);log('Declined',`You thank ${firstName(p)} but say no. They take it well, mostly.`);if(chance(70)){const o=freePromNpc([p.npcId],personAge(p));if(o)pairPersonWithNpc(p,o)}}
 return true
}
const PROM_APPROACH={casual:'Ask casually',private:'Ask privately',promposal:'Make a cute promposal',text:'Ask by text',public:'Ask in front of friends',gift:'Ask with a small gift',joke:'Ask jokingly'};
function promCandidates(){return S.people.filter(p=>!isFamilyPerson(p)&&personAge(p)>=13&&personAge(p)<=18&&Math.abs(personAge(p)-S.age)<=2&&!p.movedAway).map(p=>{ensureRomanceProfile(p);return p})}
function promAskTarget(id){if(String(id).startsWith('npc:')){const n=npcById(id.slice(4));if(!n)return null;const p=addNeighborPerson(n,'neighbor');p.rel=Math.max(p.rel,45);ensureRomanceProfile(p);return p}return personById(id)}
function promAskModal(personId){const p=promAskTarget(personId);if(!p)return;openModal(`Ask ${displayName(p)} to prom`,`<p class="muted-text">How you ask matters — and depends on who they are.${p.trust>=55&&p.boundaries?.includes('noPublicAffection')?` You know ${firstName(p)} dislikes public attention.`:''}</p><div class="modal-action-grid">${Object.entries(PROM_APPROACH).filter(([k])=>k!=='text'||canUsePhone()).map(([k,l])=>`<button data-prom-approach="${k}" data-person-id="${p.id}">${esc(l)}${k==='gift'?` • ${money(8)}`:k==='promposal'?` • ${money(10)}`:''}</button>`).join('')}<button class="ghost" data-close-modal="1">Not yet</button></div>`)}
function askToProm(personId,approach){
 const pr=S.school?.prom,p=promAskTarget(personId);if(!pr||!p||pr.status!=='Season'){toast('It is not prom season.');return}closeChoiceModal();if(pr.partnerId){toast('You already have a prom date.');return}
 if(pr.asked.some(a=>a.personId===p.id&&a.result!=='Pending')){toast(`You already asked ${firstName(p)}.`);return}
 if((approach==='gift'||approach==='promposal')&&S.age>=13&&!spendOwn(approach==='gift'?8:10)){toast('You cannot afford that approach.');return}
 const recent=pr.asked.filter(a=>daysBetween(a.dateISO,currentDate())<=7).length,tr=p.traits||[],romantic=eligibleRomance(p),a=p.attraction??40;
 const bonus={casual:0,private:tr.includes('Shy')?8:4,promposal:tr.includes('Outgoing')||tr.includes('Funny')?12:tr.includes('Shy')?-6:8,text:tr.includes('Shy')?4:-2,public:tr.includes('Outgoing')?10:(tr.includes('Shy')||tr.includes('Quiet'))?-20:0,gift:p.boundaries?.includes('noExpensiveGifts')?2:5,joke:tr.includes('Funny')?8:-6}[approach]||0;
 let result,reason,story;const prev=pr.asked[pr.asked.length-1];
 const pw=personPromWith(p);if(pw&&pw!==S.name){result='Rejected';reason='Already has a date';story=`"I really like hanging out with you, but I already told ${pw} I'd go with them. I'm sorry."`}
 else if(p.datingNpc){result='Rejected';reason='Dating someone else';story=`"I'm going with ${p.datingNpc} — we're together. But thank you for asking."`}
 else if(p.notGoingProm){result='Rejected';reason='Not going to prom';story=`"I'm actually not going to prom at all. It's just not my thing."`}
 else if(approach==='public'&&(p.boundaries?.includes('noPublicAffection')||tr.includes('Shy'))){result='Rejected';reason='Embarrassed by the public promposal';story=`Everyone turns to look. ${firstName(p)} goes bright red. "I— can we talk about this later?" Later, quietly: "I'm sorry. I just can't do this when everyone is watching."`;addRep('social',-2)}
 else if((p.conflict||0)>25){result='Rejected';reason='Recent argument';story=`"After everything lately? I don't think that's a good idea."`}
 else if(S.romance.partnerId===p.id){result='Accepted';reason='You are together';story=`"Was that even a question? Of course."`}
 else if(p.rel<35){result='Rejected';reason='Low relationship';story=`"That's… nice of you, but we don't really know each other that well."`}
 else{const dl=promDaysLeft(),late=dl<=7?14:dl<=14?8:0,grp=(S.groups||[]).some(g=>g.members.includes(p.id))?6:0;const score=(romantic?a*.45:15)+p.rel*.35+bonus+late+grp+Math.random()*20-10-(recent>=2?10:0);
  if(score>=55&&romantic&&p.romanceOpen){result='Accepted';reason=a>=70?'Already had a crush on you':approach==='promposal'?'Impressed by the promposal':'Hoping you would ask';story=a>=70?`${firstName(p)} laughs, then covers their face. "Yes. I was literally hoping you'd ask."`:approach==='promposal'?`Your promposal gets a crowd laughing — ${firstName(p)} is laughing hardest. "Okay, okay — YES."`:`"Yes! I'd love to."`}
  else if(chance(12)&&!romantic){result='Rejected';reason='Going with their friend group';story=`"Aww — I already promised my friends we'd all go as a group. Come find us there?"`}
  else if((p.rel>=45||(p.rel>=35&&late>0))&&chance(clamp(35+(p.rel-45)*1.5+late,15,90))){result='Accepted as friends';reason=romantic&&a<45?'No romantic interest, but happy to go as friends':'Strong friendship';story=`"I'd love to go — just as friends, if that's okay?"`}
  else if(tr.includes('Shy')&&chance(50)){result='Pending';reason='Nervous — needs time';story=`"Can I… think about it? I'll tell you by ${formatDate(addDays(currentDate(),2))}."`;scheduleFollowUp('promAnswer',{personId:p.id},{days:2,minute:1020})}
  else{result='Rejected';reason=romantic&&a<35?'Does not share romantic attraction':'Simply not interested';story=`"Thank you for asking — really. But I don't think so."`}}
 if(recent>=1&&prev&&prev.result==='Rejected'&&result!=='Pending'&&chance(40)){const pp=personById(prev.personId);if(pp)story+=` (${firstName(p)} also mentions they heard you asked ${firstName(pp)} first.)`}
 pr.asked.push({personId:p.id,dateISO:currentDate(),approach,result,reason});
 if(recent>=2&&!pr.gossiped){pr.gossiped=true;addRep('social',-3);log('People are talking',`Word gets around that you have asked several people to prom this week. Someone makes a joke about it in the hallway.`)}
 const th=thread('prom',`prom-${pr.year}`,'Prom season');
 if(result.startsWith('Accepted')){pr.partnerId=p.id;pr.plan='date';pr.asFriends=result!=='Accepted';setPromWithPerson(p,S.name);p.rel=clamp(p.rel+(pr.asFriends?3:6));setEmotion('Excited','You have a prom date.',70);threadStep(th,pr.asFriends?'Going with a friend':'Got a prom date',`${displayName(p)} — ${reason}`)}
 else if(result==='Rejected'){p.rel=clamp(p.rel-(reason==='Embarrassed by the public promposal'?5:1));S.happiness=clamp(S.happiness-4);setEmotion('Disappointed','A prom rejection.',55);threadStep(th,'Rejected',`${displayName(p)} — ${reason}`)}
 recordOutcome('Prom',`Asked ${displayName(p,'formal')} (${PROM_APPROACH[approach].toLowerCase()})`,result,reason);rememberPerson(p,`You asked them to prom: ${result.toLowerCase()}.`,2);advanceTime(20);log(`Prom: ${result}`,story,result.startsWith('Accepted'))
}
const PROM_PREP={outfitBuy:['Buy a formal outfit',120,'outfit','bought'],outfitOwn:['Wear something you own',0,'outfit','existing'],outfitBorrow:['Borrow an outfit',0,'outfit','borrowed'],hairSalon:['Get hair styled',30,'hair','salon'],hairDiy:['Do your own hair',0,'hair','diy'],makeup:['Do makeup',0,'makeup','done'],corsage:['Buy a corsage / boutonnière',25,'corsage','yes'],rideParents:['Ask a caregiver to drive',0,'transport','parents'],rideCarpool:['Carpool with friends',0,'transport','carpool'],rideLimo:['Split a limo',40,'transport','limo'],dinnerOut:['Plan dinner out',30,'dinner','restaurant'],dinnerHome:['Dinner at home first',0,'dinner','home'],photos:['Plan pre-prom photos',0,'photos','yes'],ticket:['Buy your ticket',40,'ticket','bought'],waiver:['Ask about a ticket waiver',0,'ticket','waiver']};
function promPrep(key){
 const pr=S.school?.prom,x=PROM_PREP[key];if(!pr||!x||pr.status!=='Season')return;const [label,cost,slot,val]=x;
 if(slot==='outfit'&&val==='existing'&&S.inventoryItems.filter(i=>i.lifecycleType==='wearable'&&i.condition>40).length<2){toast('You do not own anything nice enough — borrow or buy.');return}
 if(slot==='makeup'&&!findUsable('makeup')){toast('You do not own a makeup set.');return}
 if(slot==='corsage'&&!['US','UK','CA','AU'].includes(calendarProfile().region)){toast('Not really a tradition here.');return}
 if(cost){const parentsPay=S.age<18&&['outfit','ticket'].includes(slot)&&caregiverYes(S.wealth==='Struggling'?-25:0);if(parentsPay){log('Caregiver helps',`${primaryCaregiver()} offers to cover it: ${label.toLowerCase()}.`)}else if(!spendOwn(cost)){toast(`${label} costs ${money(cost)}. Try a free option.`);return}}
 if(slot==='ticket'&&val==='waiver'&&!chance(70)){toast('The waiver list is full — ask a caregiver or buy a ticket.');return}
 if(slot==='makeup'){const it=openOne(findUsable('makeup'));it.remaining=clamp(it.remaining-3)}
 pr.prep[slot]=val;if(slot==='ticket')pr.ticketBought=true;advanceTime(slot==='outfit'&&val==='bought'?120:30);log(`Prom prep • ${label}`,{outfit:val==='borrowed'?'It fits — mostly. A safety pin fixes the rest.':val==='existing'?'With a little ironing, something you already own looks great.':'You find something that makes you stand up straighter.',hair:val==='salon'?'The stylist works magic.':'A tutorial, two attempts, and it looks good.',transport:val==='limo'?'The group chat explodes with excitement about the limo.':val==='carpool'?'Your friends work out who drives.':`${primaryCaregiver()} agrees to drive, on the condition of taking photos.`,dinner:val==='restaurant'?'Reservations made.':'Home dinner first — cheaper and calmer.',photos:'Someone volunteers their backyard for photos.',ticket:val==='waiver'?'The school quietly covers your ticket.':'Ticket bought.',corsage:'Ordered, in a color that matches.',makeup:'You practice the look once, just to be sure.'}[slot])
}
function setPromPlan(plan){const pr=S.school?.prom;if(!pr||pr.status!=='Season')return;if(plan==='committee'){if(pr.committee>=3){toast('Planning is done.');return}if(atSchool()){toast('After classes.');return}pr.committee++;addRep('leadership',2);addRep('social',1);advanceTime(60);log('Prom committee',rand(['You argue for twenty minutes about balloon colors. You win.','You help design the decorations. It is going to look good.','You handle the playlist requests — a thankless job.']));return}
 if(plan!=='date'&&pr.partnerId){const p=personById(pr.partnerId);if(p){p.rel=clamp(p.rel-6);p.promWith=null;log('Prom plans changed',`You tell ${firstName(p)} you are not going together after all. They are hurt.`)}pr.partnerId=null}
 pr.plan=plan;const th=thread('prom',`prom-${pr.year}`,'Prom season');threadStep(th,{friends:'Going with friends',alone:'Going alone',skip:'Skipping prom',wait:'Waiting to be asked'}[plan]||plan,'');log('Prom plans',{friends:'You and your friends decide to go as a group. No pressure, all fun.',alone:'You decide to go on your own. Plenty of people do.',skip:'You decide prom is not for you this year.',wait:'You decide to wait and see if someone asks.'}[plan])}
function promHtml(){
 const pr=S.school?.prom;if(!pr||!['Season'].includes(pr.status))return '';const d=promDaysLeft(),partner=pr.partnerId?personById(pr.partnerId):null;
 const cands=promCandidates().filter(p=>p.id!==pr.partnerId&&!pr.asked.some(a=>a.personId===p.id)),nbs=neighborPromCandidates();
 const prepRow=(slot,keys)=>`<div class="prom-prep"><b>${slot}</b>${pr.prep[slot.toLowerCase()]?`<span class="tag ok">${esc(pr.prep[slot.toLowerCase()])}</span>`:keys.map(k=>`<button class="small ${PROM_PREP[k][1]?'':'ghost'}" data-prom-prep="${k}">${esc(PROM_PREP[k][0])}${PROM_PREP[k][1]?` • ${money(PROM_PREP[k][1])}`:''}</button>`).join('')}</div>`;
 return `<div class="holiday-card prom-card"><div class="holiday-head"><span class="holiday-icon">💃</span><div><b>Prom • ${d===0?'tonight':`in ${d} day${d===1?'':'s'}`}</b><small>${formatDate(pr.dateISO)} • ${esc(pr.venue)} • formal${partner?` • going with ${esc(displayName(partner))}${pr.asFriends?' (as friends)':''}`:pr.plan?` • plan: ${esc(pr.plan)}`:''}</small></div></div>
 ${!partner&&pr.plan!=='skip'?`<h4>Ask someone</h4>${cands.length||nbs.length?`<div class="holiday-acts">${cands.slice(0,10).map(p=>`<button class="small" data-prom-ask="${p.id}">${esc(displayName(p))}${personPromWith(p)?' • has a date':''}${eligibleRomance(p)?'':' (as friends)'}</button>`).join('')}${nbs.slice(0,4).map(n=>`<button class="small ghost" data-prom-ask="npc:${n.id}">${esc(n.fullName)} (neighbor)</button>`).join('')}</div>`:'<p class="muted-text">Nobody left to ask right now — meet more people at school, clubs or around town.</p>'}`:''}
 <div class="holiday-acts">${['friends','alone','wait','skip'].filter(x=>x!==pr.plan).map(x=>`<button class="small ghost" data-prom-plan="${x}">${{friends:'Go with friends',alone:'Go alone',wait:'Wait to be asked',skip:'Skip prom'}[x]}</button>`).join('')}${pr.committee<3?`<button class="small ghost" data-prom-plan="committee">Help the prom committee (${pr.committee}/3)</button>`:''}</div>
 ${pr.plan!=='skip'?`<h4>Preparation</h4>${prepRow('Ticket',['ticket','waiver'])}${prepRow('Outfit',['outfitOwn','outfitBorrow','outfitBuy'])}${prepRow('Hair',['hairDiy','hairSalon'])}${findUsable('makeup')?prepRow('Makeup',['makeup']):''}${partner&&['US','UK','CA','AU'].includes(calendarProfile().region)?prepRow('Corsage',['corsage']):''}${prepRow('Transport',['rideParents','rideCarpool','rideLimo'])}${prepRow('Dinner',['dinnerHome','dinnerOut'])}${prepRow('Photos',['photos'])}<small class="muted-text">Nothing expensive is required — free options work.</small>`:''}</div>`
}
// ---------- Prom night as a scene (§69) ----------
const PROM_SCENE={steps:[
 {view:sc=>({title:'Prom night • getting ready',text:sc.data.accident?'Disaster: a seam splits / a stain appears an hour before you leave.':`You get ready${S.school.prom.prep.outfit?` in your ${S.school.prom.prep.outfit==='bought'?'new':S.school.prom.prep.outfit} outfit`:''}. The mirror says: not bad at all.`,choices:sc.data.accident?[{id:'fix',label:'Fix it fast'},{id:'laugh',label:'Laugh and improvise'}]:[{id:'go',label:'Head out',primary:true}]}),
  choose:(sc,id)=>({line:id==='fix'?'A safety pin and some panic later, it is fixed.':id==='laugh'?'You improvise. It almost looks intentional.':'You head out the door.',score:id==='go'?2:id==='laugh'?3:1,minutes:30})},
 {view:sc=>{const pr=S.school.prom,p=pr.partnerId?personById(pr.partnerId):null;const late=p&&sc.data.late;return {title:'Meeting up',text:p?(late?`${firstName(p)} is running late. Twenty minutes and counting.`:`${firstName(p)} arrives looking great. ${pr.prep.photos?'Photos in the backyard: awkward poses, real smiles.':''}`):pr.plan==='friends'?'Your friends pile into the meeting spot, everyone talking at once.':'You arrive on your own. It is less scary than you thought.',choices:late?[{id:'wait',label:'Wait patiently'},{id:'text',label:'Text them'},{id:'annoyed',label:'Get annoyed'}]:[{id:'compliment',label:'Give a compliment',primary:true},{id:'go',label:'Let\'s go'}]}},
  choose:(sc,id)=>{const p=S.school.prom.partnerId?personById(S.school.prom.partnerId):null;return {line:{wait:'You wait. They arrive breathless and grateful you did not make a scene.',text:'"5 min!!" They arrive ten minutes later.',annoyed:'You are annoyed, and it shows. The ride is quiet.',compliment:p?`${firstName(p)} smiles. "You too."`:'Someone compliments you right back.',go:'Off you go.'}[id],score:{wait:5,text:2,annoyed:-8,compliment:6,go:2}[id],minutes:40}}},
 {view:sc=>{const ev=sc.data.ev2||(sc.data.ev2=rand(['none','none','crush','friend','compliment']));return {title:'Arrival & dancing',text:{none:`The venue looks amazing. The music is loud; the dance floor fills up fast.`,crush:'You spot your old crush across the room — with someone else.',friend:'A friend pulls you aside: they had a fight with their date and are upset.',compliment:'Someone you barely know tells you that you look incredible.'}[ev],choices:ev==='crush'?[{id:'shrug',label:'Shrug it off and dance'},{id:'stare',label:'Keep looking over'}]:ev==='friend'?[{id:'help',label:'Help your friend'},{id:'later',label:'Tell them you\'ll talk later'}]:[{id:'dance',label:'Dance',primary:true},{id:'snacks',label:'Hang by the snacks'},{id:'talk',label:'Talk with friends'}]}},
  choose:(sc,id)=>({line:{shrug:'You shrug it off. Tonight is yours.',stare:'You keep glancing over. It takes some shine off the night.',help:'You spend fifteen minutes helping your friend. They will remember that.',later:'"Later" turns into never. Your friend notices.',dance:'You dance until your feet hurt. Worth it.',snacks:'The snack table is where the best gossip happens.',talk:'You and your friends shout conversations over the music.'}[id],score:{shrug:4,stare:-6,help:6,later:-4,dance:8,snacks:2,talk:5}[id],minutes:60})},
 {view:sc=>{const pr=S.school.prom,p=pr.partnerId?personById(pr.partnerId):null;const confess=!p&&chance(18)&&S.people.find(x=>eligibleRomance(x)&&(x.attraction||0)>=65&&!x.promWith);if(confess)sc.data.confessor=confess.id;return {title:'Slow song',text:confess?`During the slow song, ${firstName(confess)} comes over. "Can I tell you something? I've liked you for a while."`:p?`A slow song starts. ${firstName(p)} looks at you.`:'A slow song starts. Couples drift to the floor.',choices:confess?[{id:'feelings',label:'Say you feel the same'},{id:'gentle',label:'Gently say you see them as a friend'},{id:'time',label:'Say you need time to think'}]:p?[{id:'slow',label:'Ask for a slow dance',primary:true},{id:'sit',label:'Sit this one out'}]:[{id:'groupdance',label:'Join a group sway with friends'},{id:'sit',label:'Grab a drink'}]}},
  choose:(sc,id)=>{const c=sc.data.confessor?personById(sc.data.confessor):null;if(id==='feelings'&&c){if(!S.romance.partnerId)setPartner(c,'dating');c.rel=clamp(c.rel+8);sc.data.newCouple=c.id}if(id==='gentle'&&c){c.rel=clamp(c.rel-2);c.attraction=clamp((c.attraction||50)-20)}const p=S.school.prom.partnerId?personById(S.school.prom.partnerId):null;
   return {line:{slow:`You sway together, not very skillfully. ${S.school.prom.asFriends?'It is goofy and sweet.':'It is a moment you will remember.'}`,sit:'You sit it out and watch. Still nice.',groupdance:'A circle of friends swaying badly to a love song. Perfect.',feelings:`You tell ${firstName(c)} you feel the same. The rest of the night is a blur of smiling.`,gentle:`You tell ${firstName(c)} kindly. They nod — it hurts, but they are glad they said it.`,time:`"Can I think about it?" ${firstName(c)} nods.`}[id],score:{slow:9,sit:0,groupdance:6,feelings:10,gentle:1,time:2}[id],minutes:20}}},
 {view:sc=>{const r=ensureRep(),nom=(r.social+r.leadership)/2>=45&&chance(55);sc.data.nominated=nom;return {title:'Prom court',text:nom?'They announce the prom court nominees — and your name is called.':'They announce prom court. Your friends cheer for the winners.',choices:[{id:'ok',label:nom?'Walk up to the stage':'Cheer',primary:true}]}},
  choose:(sc,id)=>{if(!sc.data.nominated)return {line:'You cheer for the court. Someone throws confetti.',score:2,minutes:20};const win=chance(35+ensureRep().social*.3);sc.data.court=win;if(win){addRep('social',6);return {line:'You win. There is a crown or a sash involved, and photos you will never live down.',score:10,minutes:20}}return {line:'You do not win, but being nominated was a nice surprise.',score:4,minutes:20}}},
 {view:sc=>({title:'After prom',text:'The lights come up. What now?',choices:[{id:'diner',label:'Late-night diner with friends'},{id:'home',label:'Go home'},{id:'after',label:'Go to the after-party'}]}),
  choose:(sc,id)=>{if(id==='after'&&S.age<18&&curfewMinute()&&curfewMinute()<1439&&!caregiverYes(-10)){sc.data.defied=true;return {line:'Your curfew says no. You go anyway, a little nervous the whole time.',score:2,end:true,minutes:90}}return {line:{diner:'Pancakes at midnight in formal clothes. The best part of the night, maybe.',home:'You go home and kick your shoes off. Tired and happy.',after:'The after-party is loud and fun, and you leave at a reasonable hour.'}[id],score:{diner:6,home:2,after:4}[id],end:true,minutes:id==='home'?30:90}}}
],finish(sc){
 const pr=S.school?.prom;if(!pr)return;pr.status='Done';const p=pr.partnerId?personById(pr.partnerId):null,s=sc.score,tier=s>=80?'A wonderful night':s>=62?'A good night':s>=45?'A mixed night':'A rough night';
 const ev=S.calendar.find(e=>e.id===`prom-${pr.year}`);if(ev)setCalendarStatus(ev,'Attended','Went to prom');
 if(p){p.rel=clamp(p.rel+(s>=62?6:1));rememberPerson(p,`You went to prom together${pr.asFriends?' as friends':''}: ${tier.toLowerCase()}.`,3)}
 S.needs.social=clamp(S.needs.social+25);S.needs.fun=clamp(S.needs.fun+25);S.happiness=clamp(S.happiness+(s>=62?8:0));addRep('social',3);
 const memory=p?`You attended prom with ${displayName(p,'formal')}${pr.asFriends?' as friends':''}.`:pr.plan==='friends'?'You went to prom with your friends.':'You went to prom on your own.';
 S.milestones.unshift({dateISO:currentDate(),age:S.age,title:'💃 Prom',text:`${memory} ${tier}.${sc.data.court?' You were crowned on prom court.':''}`});
 const th=thread('prom',`prom-${pr.year}`,'Prom season');threadStep(th,'Prom night',tier,{resolve:true});recordOutcome('Prom','Prom night',tier,sc.lines.slice(-3).join(' '));
 if(sc.data.defied)defyCheck({endMinute:1439});
 log(`💃 Prom — ${tier.toLowerCase()}`,`${memory} ${sc.lines.join(' ')}`,true)
}};
function attendProm(){const pr=S.school?.prom;if(!pr||pr.status!=='Season'||pr.dateISO!==currentDate()){toast('Prom is not tonight.');return}if(pr.plan==='skip'){toast('You decided to skip prom.');return}if(!pr.ticketBought){toast('You need a ticket (or a waiver) first.');return}const ev=S.calendar.find(e=>e.id===`prom-${pr.year}`);if(currentMinute()<1080){toast('Prom starts at 7:00 PM.');return}if(ev&&currentMinute()>ev.graceMinute){processCalendar();return}if(ev)setCalendarStatus(ev,'Attending','Getting ready');startScene('prom',{accident:chance(10),late:!!pr.partnerId&&chance(15)})}
function promMissed(ev){const pr=S.school?.prom;if(!pr){setCalendarStatus(ev,'Expired','No prom');return}if(pr.plan==='skip'){setCalendarStatus(ev,'Completed','Skipped by choice');pr.status='Skipped';if(SIM.skipping)return;queueEvent({type:'promSkipNight',title:'Prom night — not going',text:'Everyone is at prom tonight. What do you do instead?',priority:2,expiresDays:1,choices:[{id:'gaming',label:'Game night with other non-prom friends'},{id:'family',label:'Movie night with family'},{id:'alone',label:'Enjoy a quiet evening'}]});return}
 pr.status='Done';setCalendarStatus(ev,'Missed','Did not go');const p=pr.partnerId?personById(pr.partnerId):null;if(p){p.rel=clamp(p.rel-10);p.trust=clamp(p.trust-8);p.conflict=clamp((p.conflict||0)+12);rememberPerson(p,'You were supposed to go to prom together and never showed.',3);if(!SIM.skipping)log('Missed prom',`${firstName(p)} waited, then went in alone. That is going to be hard to fix.`)}recordOutcome('Prom','Prom night','Missed',p?'Your date went without you.':'You did not go.')}
function handlePromSkip(id){const t={gaming:'You skipped prom and spent the evening gaming with friends who also skipped. Zero regrets.',family:'You skipped prom and watched movies with your family. Honestly lovely.',alone:'A quiet night: snacks, a book, no dress code.'}[id];S.milestones.unshift({dateISO:currentDate(),age:S.age,title:'Prom night',text:t});recordOutcome('Prom','Skipped prom','Chose something else',t);log('Prom night',t);return true}
function promClick(b){const d=b.dataset;if(d.promAsk){promAskModal(d.promAsk);return true}if(d.promApproach){askToProm(d.personId,d.promApproach);save();render();return true}if(d.promPrep){promPrep(d.promPrep);save();render();return true}if(d.promPlan){setPromPlan(d.promPlan);save();render();return true}if(d.promGo){attendProm();save();return true}if(d.sceneChoice){sceneChoice(d.sceneChoice);return true}if(d.sceneResume){renderScene();return true}if(d.romance){romanceAction(personById(d.personId),d.romance);save();render();return true}if(d.romanceOpen){romanceMenu(d.romanceOpen);return true}return false}

// v7.3: prom date = middle of semester 2 (moved to the following Saturday); consistent two-way pairs
function promDateFor(yearKey){const a=academicYear(yearKey);let d=addDays(a.sem2Start,Math.floor(daysBetween(a.sem2Start,a.end)/2));while(parseISO(d).getUTCDay()!==6)d=addDays(d,1);return d}
function ensureProm(){
 if(!promEligible())return null;const sc=S.school;if(sc.yearKey==null)return null;if(sc.prom&&sc.prom.year===sc.yearKey)return sc.prom;
 const d=promDateFor(sc.yearKey);if(d<=currentDate())return null;const junior=gradeNumber()<=9;
 sc.prom={year:sc.yearKey,junior,dateISO:d,venue:junior?'the school gym, transformed':rand(['the Grand Hotel ballroom','the school gym, transformed','the riverside event hall','the old city museum']),dress:'Formal',status:'Upcoming',plan:null,partnerId:null,asFriends:false,asked:[],received:[],prep:{},committee:0,ticket:junior?20:40,ticketBought:false};
 createCalendarEvent({id:`prom-${sc.yearKey}`,type:'prom',title:junior?'Junior Prom':'Prom',dateISO:d,startMinute:1140,endMinute:1380,graceMinute:1230,location:sc.prom.venue,payload:{year:sc.yearKey},required:false,source:'school'});return sc.prom
}
function npcPromWith(n){return n?.promWith||null}
function personPromWith(p){return p?.promWith||npcById(p?.npcId)?.promWith||null}
function setPromWithNpc(npcId,name){const n=npcById(npcId);if(n)n.promWith=name;for(const p of S.people)if(p.npcId===npcId)p.promWith=name}
function setPromWithPerson(p,name){p.promWith=name;if(p.npcId)setPromWithNpc(p.npcId,name)}
function freePromNpc(excludeIds,age){return (S.npcs||[]).filter(n=>!excludeIds.includes(n.id)&&!n.promWith&&Math.abs(npcAge(n)-age)<=1&&npcAge(n)>=13&&npcAge(n)<=18&&!n.movedAway).sort(()=>Math.random()-.5)[0]||null}
function pairPersonWithNpc(p,n){if(!p||!n)return;setPromWithPerson(p,n.fullName);setPromWithNpc(n.id,displayName(p,'formal'))}
function neighborPromCandidates(){const ids=new Set(S.people.map(p=>p.npcId).filter(Boolean));return (S.neighborhood?.households||[]).map(id=>S.households.find(h=>h.id===id)).filter(Boolean).flatMap(h=>hhKids(h)).filter(n=>!ids.has(n.id)&&npcAge(n)>=13&&npcAge(n)<=18&&Math.abs(npcAge(n)-S.age)<=2&&!n.movedAway)}

// ---------- v7.2 PHASE 5b: neighborhood, groups, rivals, awards, gifts, sneaking, NPC agency ----------
// ===== Neighborhood (§91–93) =====
function ensureNeighborhood(){
 if(!S.neighborhood)S.neighborhood={households:[],rep:{helpful:15,friendly:20,quiet:50,social:15,troublemaker:4,business:3,known:8},cooldown:null};
 const nb=S.neighborhood;if(S.age>=3&&nb.households.length<4){for(let i=nb.households.length;i<4;i++){const kids=generateHousehold({kids:chance(60)?1:2,childAge:3+Math.floor(Math.random()*14)});const hh=S.households.find(h=>h.id===kids[0].householdId);hh.neighbor=true;hh.pet=rand(['dog','cat',null,null]);hh.petName=hh.pet?rand(['Biscuit','Luna','Max','Mochi','Pepper','Coco','Rocky','Bella']):null;nb.households.push(hh.id)}}
 return nb
}
function nbRep(k,v){const r=ensureNeighborhood().rep;if(k in r)r[k]=clamp(r[k]+v)}
function nbHousehold(){const nb=ensureNeighborhood();return S.households.find(h=>h.id===rand(nb.households))}
function hhKids(hh){return (hh?.members||[]).map(npcById).filter(Boolean)}
function addNeighborPerson(npc,label='neighbor'){if(!npc)return null;let p=S.people.find(x=>x.npcId===npc.id);if(!p){p=personFromNpc(npc,'friend',label);p.rel=48;S.people.push(p)}return p}
const NB_EVENTS={
 newFamily:{title:'A new family moved in',choices:[['introduce','Introduce yourself'],['food','Bring food or a small gift'],['kids','Meet their kids'],['pet','Meet their pet'],['ignore','Leave them be']]},
 movingAway:{title:'Neighbors are moving away',choices:[['goodbye','Say a proper goodbye'],['keepInTouch','Promise to keep in touch'],['avoid','Avoid it']]},
 blockParty:{title:'Block party this afternoon',choices:[['go','Go and mingle'],['bring','Bring something to share'],['skip','Skip it']]},
 garageSale:{title:'Garage sale down the street',choices:[['browse','Browse for bargains'],['help','Help them sell'],['skip','Walk past']]},
 cleanup:{title:'Community cleanup day',choices:[['join','Join in'],['skip','Not today']]},
 lostPet:{title:'A lost pet',choices:[['search','Help search'],['poster','Share the poster'],['skip','Hope they find it']]},
 wrongPackage:{title:'A package delivered to your door — not yours',choices:[['return','Return it next door'],['leave','Leave it for the courier'],['keep','Keep it']]},
 powerOutage:{title:'Power outage',choices:[['candles','Candlelight family time'],['outside','See what the neighbors are doing'],['sleep','Go to bed early']]},
 waterOutage:{title:'Water is off until evening',choices:[['help','Help carry water'],['wait','Wait it out']]},
 streetRepairs:{title:'Street repairs (very loud)',choices:[['earplugs','Find somewhere quieter'],['complain','Complain to the city'],['watch','Watch the machines']]},
 festival:{title:'Local festival this weekend',choices:[['go','Go'],['volunteer','Volunteer at a stall'],['skip','Skip it']]},
 fundraiser:{title:'School fundraiser — neighbors are selling raffle tickets',choices:[['buy','Buy a ticket ($5)'],['sell','Help sell tickets'],['no','Say no']]},
 lemonade:{title:'A neighbor kid has a lemonade stand',choices:[['buy','Buy a cup ($2)'],['tip','Buy two and tip'],['walk','Walk by']]},
 noiseComplaint:{title:'A noise complaint about your house',choices:[['apologize','Apologize'],['argue','Argue']]},
 argument:{title:'Two neighbors are arguing loudly',choices:[['mediate','Try to calm things down'],['stay','Stay out of it'],['gossip','Tell everyone about it']]},
 kidsPlaying:{title:'Kids are playing outside',choices:[['join','Join in'],['watch','Watch for a bit'],['skip','Stay inside']]},
 snow:{title:'It snowed overnight',choices:[['snowman','Build a snowman'],['shovel','Shovel a neighbor\'s path'],['inside','Stay warm inside']]},
 garden:{title:'The community garden needs help',choices:[['help','Help plant'],['skip','Not today']]},
 market:{title:'Weekend market in the square',choices:[['shop','Wander and snack ($6)'],['skip','Skip it']]},
 watch:{title:'Neighborhood watch meeting',choices:[['attend','Attend'],['skip','Skip it']]}
};
function neighborhoodTick(){
 if(SIM.skipping||S.age<4)return;const nb=ensureNeighborhood();if(nb.cooldown&&nb.cooldown>currentDate())return;if(!chance(9))return;
 const month=Number(currentDate().slice(5,7)),cold=['KR','JP','CN','US','CA','UK','FR'].includes(calendarProfile().region)&&(month===12||month<=2);
 const pool=Object.keys(NB_EVENTS).filter(k=>(k!=='snow'||cold)&&(k!=='watch'||S.age>=18)&&(k!=='noiseComplaint'||S.flags.loudParty)&&(k!=='movingAway'||nb.households.length>3)&&(k!=='fundraiser'||S.school));
 const kind=rand(pool),hh=kind==='newFamily'?null:nbHousehold();let payload={kind,hhId:hh?.id};
 if(kind==='newFamily'){const kids=generateHousehold({kids:chance(50)?1:2,childAge:Math.max(3,S.age+rand([-2,-1,0,1,2]))});const h=S.households.find(x=>x.id===kids[0].householdId);h.neighbor=true;h.pet=rand(['dog','cat',null]);h.petName=h.pet?rand(['Biscuit','Luna','Max','Mochi','Pepper']):null;nb.households.push(h.id);payload.hhId=h.id}
 const h=S.households.find(x=>x.id===payload.hhId),fam=h?`the ${h.surname} family`:'a neighbor';
 const text={newFamily:`A moving truck all morning: ${fam} moved in next door${hhKids(h).length?`, with ${hhKids(h).map(n=>n.firstName).join(' and ')}`:''}${h?.pet?` and a ${h.pet} named ${h.petName}`:''}.`,movingAway:`${fam[0].toUpperCase()+fam.slice(1)} is packing up — they are moving to another city.`,blockParty:'Folding tables, music and grills — the whole street is out.',garageSale:`${fam[0].toUpperCase()+fam.slice(1)} is selling everything from lamps to old toys.`,cleanup:'Gloves and bags are being handed out at the corner.',lostPet:`${fam[0].toUpperCase()+fam.slice(1)}'s ${h?.pet||'cat'}${h?.petName?` ${h.petName}`:''} is missing.`,wrongPackage:`The label says ${h?.parents?.[0]||'someone else'}.`,powerOutage:'Everything goes dark and quiet at once.',waterOutage:'A water main is being repaired.',streetRepairs:'Jackhammers from 8 AM.',festival:'Lanterns, food stalls and music in the square.',fundraiser:`${fam[0].toUpperCase()+fam.slice(1)} is selling raffle tickets for the school.`,lemonade:`${hhKids(h)[0]?.firstName||'A kid'} has a hand-painted sign and very serious prices.`,noiseComplaint:'Someone complained about the noise from your last get-together.',argument:`${fam[0].toUpperCase()+fam.slice(1)} and the people across the street are shouting about a fence.`,kidsPlaying:'A game of tag is happening in the street.',snow:'Everything is white and quiet.',garden:'Seedlings need planting before the weekend.',market:'Fresh bread, street food, handmade things.',watch:'A meeting about safety and streetlights.'}[kind];
 nb.cooldown=addDays(currentDate(),3);queueEvent({type:'nbh',title:NB_EVENTS[kind].title,text,payload,priority:2,expiresDays:1,choices:NB_EVENTS[kind].choices.map(([id,label])=>({id,label}))})
}
function handleNeighborhood(e,id){
 const {kind,hhId}=e.payload||{},h=S.households.find(x=>x.id===hhId),kid=hhKids(h).sort((a,b)=>Math.abs(npcAge(a)-S.age)-Math.abs(npcAge(b)-S.age))[0],fam=h?`the ${h.surname}s`:'the neighbors';let s='',mins=30;
 const met=()=>{const p=addNeighborPerson(kid);return p?firstName(p):null};
 switch(kind){
  case 'newFamily':if(id==='introduce'){nbRep('friendly',4);const n=met();s=`You say hello to ${fam}.${n?` ${n} seems nice — about your age.`:''}`}else if(id==='food'){if(S.age>=13)spendOwn(5);nbRep('friendly',6);nbRep('helpful',2);const n=met();const p=n&&S.people.find(x=>x.npcId===kid.id);if(p)p.rel=clamp(p.rel+6);s=`You bring over something homemade. ${fam[0].toUpperCase()+fam.slice(1)} are touched — a great first impression.`}else if(id==='kids'){const n=met();s=n?`You meet ${n}. You end up talking for an hour.`:'They have no kids your age, but they are friendly.';mins=60}else if(id==='pet'){S.needs.fun=clamp(S.needs.fun+8);nbRep('friendly',2);s=h?.pet?`${h.petName} the ${h.pet} immediately decides you are a friend.`:'No pet after all — but a nice chat.'}else s='You leave them to settle in.';break;
  case 'movingAway':{const p=S.people.find(x=>kid&&x.npcId===kid.id);if(id==='goodbye'){nbRep('friendly',3);if(p){p.rel=clamp(p.rel+4);rememberPerson(p,'You said a real goodbye before they moved away.',3)}s=p?`You and ${firstName(p)} say goodbye properly. It is harder than you expected.`:`You help ${fam} load the last boxes and wave them off.`}else if(id==='keepInTouch'){if(p){p.trust=clamp(p.trust+4);rememberPerson(p,'You promised to keep in touch.',2)}s='You swap contacts and promise to keep in touch.'}else{if(p)p.rel=clamp(p.rel-3);s='You stay inside. Later you wish you had gone out.'}if(p)p.movedAway=true;const nb=ensureNeighborhood();nb.households=nb.households.filter(x=>x!==hhId);break}
  case 'blockParty':if(id==='skip'){s='You hear the party all afternoon.';break}nbRep('social',4);nbRep('friendly',3);S.needs.social=clamp(S.needs.social+15);S.needs.fun=clamp(S.needs.fun+10);if(id==='bring'){nbRep('helpful',3);s='Your dish is gone in ten minutes. People ask who made it.'}else s=rand(['You end up in a long conversation with neighbors you had only ever waved at.','Someone brings a speaker; the street becomes a dance floor for an hour.']);mins=150;if(kid&&chance(50))met();break;
  case 'garageSale':if(id==='browse'){const k=rand(['book','toy','boardGame','puzzle','headphones','backpack'].filter(x=>D.catalog[x]&&S.age>=D.catalog[x].minAge));const price=Math.max(1,Math.round(D.catalog[k].price*.25));if(spendOwn(price)){addItem(k,`garage sale (${fam})`,55);s=`You find a used ${D.catalog[k].name.toLowerCase()} for ${money(price)}. A bargain.`}else s='Nothing you can afford today.'}else if(id==='help'){nbRep('helpful',4);nbRep('business',3);S.money+=5;s=`You help ${fam} haggle with customers. They slip you ${money(5)}.`;mins=90}else s='You walk past.';break;
  case 'cleanup':if(id==='join'){nbRep('helpful',6);addRep('kindness',1);S.needs.social=clamp(S.needs.social+8);s='Two hours, eight bags of trash, and a street that looks noticeably better.';mins=120}else s='You skip it this time.';break;
  case 'lostPet':if(id==='search'){mins=90;if(chance(45)){nbRep('helpful',8);nbRep('known',4);const p=kid&&met();s=`You find ${h?.petName||'the pet'} hiding under a car two streets over. ${fam[0].toUpperCase()+fam.slice(1)} are overjoyed.`;if(p){const pp=S.people.find(x=>x.npcId===kid.id);pp.rel=clamp(pp.rel+8)}}else{nbRep('helpful',3);s=`You search for an hour with no luck. Later you hear ${h?.petName||'the pet'} came home on its own.`}}else if(id==='poster'){nbRep('helpful',2);s='You share the poster around. Every bit helps.'}else s='You hope they find it.';break;
  case 'wrongPackage':if(id==='return'){nbRep('helpful',3);nbRep('friendly',2);s=`You return it. ${fam[0].toUpperCase()+fam.slice(1)} had been looking everywhere for it.`}else if(id==='leave')s='You leave it for the courier to sort out.';else{nbRep('troublemaker',8);S.family.tension=clamp(S.family.tension+(S.age<18?3:0));if(chance(40)){nbRep('friendly',-6);s='You keep it. Two days later the neighbors ask about a missing package. It is very awkward.'}else s='You keep it. Nobody asks. It does not feel great.'}break;
  case 'powerOutage':if(id==='candles'){S.family.closeness=clamp(S.family.closeness+3);s='Candles, a card game and stories you have never heard before. Better than TV.'}else if(id==='outside'){nbRep('social',3);s='Half the street is outside comparing flashlights. Strangely fun.'}else{S.needs.sleep=clamp(S.needs.sleep+5);s='You give up and go to bed early.'}mins=120;break;
  case 'waterOutage':s=id==='help'?'You carry water jugs for an older neighbor. They insist on giving you cookies.':'You wait it out. Showers are a luxury tonight.';if(id==='help')nbRep('helpful',4);break;
  case 'streetRepairs':s={earplugs:'You find a quiet café and get a surprising amount done.',complain:'You file a complaint. The jackhammers continue, but you feel heard.',watch:'Honestly, the excavator is kind of mesmerizing.'}[id];break;
  case 'festival':if(id==='skip'){s='You skip the festival.';break}S.needs.fun=clamp(S.needs.fun+15);nbRep('social',3);if(id==='volunteer'){nbRep('helpful',5);nbRep('known',3);s='You work a food stall for three hours. Everyone in the neighborhood now knows your face.';mins=180}else{if(S.age>=13)spendOwn(5);s='Street food, lanterns and music late into the evening.';mins=150}break;
  case 'fundraiser':if(id==='buy'){if(spendOwn(5)){nbRep('friendly',2);s=chance(10)?'You buy a ticket — and win a gift card. Wild.':'You buy a raffle ticket. You do not win, but it was for a good cause.'}else s='You do not have $5 on you.'}else if(id==='sell'){nbRep('helpful',3);nbRep('business',3);addRep('kindness',1);s='You sell raffle tickets door to door. Most neighbors buy one.';mins=90}else s='You say no politely.';break;
  case 'lemonade':if(id==='walk'){s='You walk by. The kid looks crushed.';nbRep('friendly',-1);break}if(spendOwn(id==='tip'?5:2)){nbRep('friendly',id==='tip'?4:2);s=id==='tip'?'You buy two cups and tip. The kid announces you are their best customer ever.':'The lemonade is extremely sweet. You say it is great.'}else s='You do not have change.';break;
  case 'noiseComplaint':S.flags.loudParty=false;if(id==='apologize'){nbRep('friendly',2);nbRep('quiet',5);s='You apologize. They appreciate it, and you keep things quieter.'}else{nbRep('troublemaker',6);nbRep('friendly',-5);s='The argument does not help. Now you have a reputation.'}break;
  case 'argument':if(id==='mediate'){const ok=chance(50);nbRep(ok?'helpful':'social',ok?5:1);s=ok?'You calm things down. Both sides grudgingly agree to talk tomorrow.':'They both turn on you briefly. Lesson learned.'}else if(id==='gossip'){nbRep('troublemaker',3);nbRep('social',2);s='The story spreads. It gets back to them.'}else s='You stay out of it.';break;
  case 'kidsPlaying':if(id==='join'){S.needs.fun=clamp(S.needs.fun+15);S.energy=clamp(S.energy-8);nbRep('friendly',2);if(kid)met();s='You join the game and end up running around until the streetlights come on.';mins=90}else s=id==='watch'?'You watch from the steps for a while.':'You stay in.';break;
  case 'snow':if(id==='snowman'){S.needs.fun=clamp(S.needs.fun+15);s='Your snowman is lopsided and magnificent.';mins=60}else if(id==='shovel'){nbRep('helpful',6);s='You shovel an elderly neighbor\'s path. They wave from the window, beaming.';mins=60}else s='Hot drink, blanket, window view.';break;
  case 'garden':if(id==='help'){nbRep('helpful',5);addRep('kindness',1);practiceSkill('knowledge',.5);s='Dirt under your nails and rows of seedlings. You will come back to see them grow.';mins=90}else s='Maybe next time.';break;
  case 'market':if(id==='shop'){if(spendOwn(6))s='You eat your way through the stalls.';else s='You just wander and smell everything.';S.needs.fun=clamp(S.needs.fun+8);mins=90}else s='You skip it.';break;
  case 'watch':if(id==='attend'){nbRep('known',4);nbRep('helpful',2);s='A long meeting about streetlights. You volunteer for one thing, and people remember your name.';mins=90}else s='You skip the meeting.';break;
 }
 advanceTime(mins,{silent:true});log(e.title,s);return true
}
function neighborhoodHtml(){const nb=ensureNeighborhood(),r=nb.rep,labels={helpful:'Helpful',friendly:'Friendly',quiet:'Quiet',social:'Social',troublemaker:'Troublemaker',business:'Local business',known:'Well-known'};const fams=nb.households.map(id=>S.households.find(h=>h.id===id)).filter(Boolean);return `${Object.entries(labels).map(([k,l])=>`<div class="skill-line"><span>${l}</span><div class="progress ${k==='troublemaker'?'dangerbar':''}"><i style="width:${clamp(r[k])}%"></i></div><b>${Math.round(r[k])}</b></div>`).join('')}<h4>Neighbors</h4>${fams.map(h=>`<div class="pl-row"><span>🏠</span><b>The ${esc(h.surname)} family</b><small>${hhKids(h).map(n=>esc(n.firstName)).join(', ')}${h.pet?` • ${h.pet} ${esc(h.petName)}`:''}</small></div>`).join('')||'<p class="muted-text">You do not know the neighbors yet.</p>'}`}
// ===== Friend groups (§106) =====
function groupTick(){
 if(SIM.skipping||S.age<8)return;const friends=S.people.filter(p=>!isFamilyPerson(p)&&p.rel>=55&&!p.movedAway);S.groups=S.groups||[];
 if(!S.groups.length&&friends.length>=3){const g={id:uid('grp'),name:rand(['the lunch table crew','the after-school gang','the back-row group','the group chat']),members:friends.slice(0,4).map(p=>p.id),jokes:[],formed:currentDate()};S.groups.push(g);log('A friend group forms',`Somewhere along the way, you, ${g.members.map(id=>firstName(personById(id))).join(', ')} became "${g.name}".`,true);return}
 const g=S.groups[0];if(!g||!chance(5))return;g.members=g.members.filter(id=>personById(id));if(g.members.length<2)return;
 const a=personById(rand(g.members)),b=personById(rand(g.members.filter(x=>x!==a.id)));const kind=rand(['joke','excluded','argument','chat','newMember','outing']);
 if(kind==='joke'){const j=rand(['the incident with the vending machine','"the potato thing"','that one teacher\'s catchphrase','the fake band name']);g.jokes.unshift(j);if(g.jokes.length>5)g.jokes.length=5;g.members.forEach(id=>{const p=personById(id);if(p)p.rel=clamp(p.rel+1)});log('Inside joke',`${g.name[0].toUpperCase()+g.name.slice(1)} now has an inside joke about ${j}. Nobody else gets it. That is the point.`);return}
 if(kind==='chat'&&canUsePhone()){S.needs.social=clamp(S.needs.social+6);log('Group chat',`The group chat goes off for an hour: ${firstName(a)} sent a blurry photo and ${firstName(b)} roasted it mercilessly.`);return}
 if(kind==='excluded'){queueEvent({type:'groupExcluded',title:`${firstName(a)} seems left out`,text:`Lately ${firstName(a)} has been quiet in the group — like they are on the outside of every conversation.`,participants:[a.id],priority:2,expiresDays:2,choices:[{id:'include',label:'Make an effort to include them'},{id:'ask',label:'Ask them privately if they are okay'},{id:'ignore',label:'It is probably nothing'}]});return}
 if(kind==='argument'&&b){queueEvent({type:'groupArgument',title:`${firstName(a)} and ${firstName(b)} are fighting`,text:'The group splits into sides over something that started small.',participants:[a.id,b.id],priority:3,expiresDays:2,choices:[{id:'mediate',label:'Try to mediate'},{id:'sideA',label:`Side with ${firstName(a)}`},{id:'sideB',label:`Side with ${firstName(b)}`},{id:'out',label:'Stay out of it'}]});return}
 if(kind==='newMember'){const n=(S.npcs||[]).find(x=>Math.abs(npcAge(x)-S.age)<=1&&!S.people.some(p=>p.npcId===x.id));if(!n)return;const p=personFromNpc(n,'friend','friend of friends');p.rel=52;S.people.push(p);g.members.push(p.id);log('New in the group',`${firstName(a)} brings ${p.name} along. They fit in surprisingly fast.`);return}
 if(kind==='outing'){npcInvitesPlayer(a);const inv=S.events.find(e=>e.type==='invitation'&&e.participants?.[0]===a.id&&e.status==='Open');if(inv){inv.title=`Group outing: ${inv.title.split(': ')[1]||'hang out'}`;inv.text=`${firstName(a)} is organizing something for the whole group. `+inv.text;const pl=S.plans.find(x=>x.id===inv.payload?.planId);if(pl){pl.groupId=g.id;pl.title=`Group outing (${g.name})`}}}
}
function handleGroupEvent(e,id){const [a,b]=(e.participants||[]).map(personById);let s;
 if(e.type==='groupExcluded'){if(id==='include'){a.rel=clamp(a.rel+5);addRep('kindness',2);s=`You make a point of including ${firstName(a)}. By the end of the week they are laughing again.`}else if(id==='ask'){a.trust=clamp(a.trust+6);a.rel=clamp(a.rel+3);s=`${firstName(a)} admits they have felt invisible. Talking helps.`}else{a.rel=clamp(a.rel-3);s=`It was not nothing. ${firstName(a)} drifts a little further away.`}}
 else{if(id==='mediate'){const ok=chance(55);[a,b].forEach(p=>p&&(p.rel=clamp(p.rel+(ok?3:-1))));addRep('leadership',ok?2:0);s=ok?'You get them talking instead of shouting. The group exhales.':'They both get annoyed with you for interfering. It blows over eventually.'}else if(id==='sideA'){a.rel=clamp(a.rel+4);b.rel=clamp(b.rel-6);b.conflict=clamp((b.conflict||0)+8);s=`You back ${firstName(a)}. ${firstName(b)} notices.`}else if(id==='sideB'){b.rel=clamp(b.rel+4);a.rel=clamp(a.rel-6);a.conflict=clamp((a.conflict||0)+8);s=`You back ${firstName(b)}. ${firstName(a)} notices.`}else s='You stay out of it. It burns out in a few days.'}
 log(e.title,s);return true}
function groupHtml(){const g=(S.groups||[])[0];if(!g)return '<p class="muted-text">A friend group forms naturally once you have a few close friends.</p>';return `<p><b>${esc(g.name)}</b> • since ${formatDate(g.formed)}</p><p class="muted-text">${g.members.map(id=>personById(id)).filter(Boolean).map(p=>esc(displayName(p))).join(', ')}</p>${g.jokes.length?`<small class="muted-text">Inside jokes: ${g.jokes.map(esc).join(' • ')}</small>`:''}`}
// ===== Rivalries (§114) =====
function maybeRival(npcId,domain){if(!npcId||S.age<8)return;const n=npcById(npcId);if(!n)return;S.rivals=S.rivals||[];if(S.rivals.length>=3&&!S.rivals.some(r=>r.npcId===npcId))return;let r=S.rivals.find(x=>x.npcId===npcId);if(!r){r={npcId,domain,type:'friendly competition',score:1,since:currentDate()};S.rivals.push(r);let p=S.people.find(x=>x.npcId===npcId);if(!p){p=personFromNpc(n,'friend','rival');p.rel=40;S.people.push(p)}else if(!p.roleLabel||p.roleLabel==='classmate')p.roleLabel='rival'}else r.score++;
 if(SIM.skipping)return;const p=S.people.find(x=>x.npcId===npcId);queueEvent({type:'rivalMoment',title:`${p.name} again`,text:`${p.name} was right there competing with you in ${domain} — again. They catch your eye afterward.`,participants:[p.id],payload:{npcId},priority:2,expiresDays:1,choices:[{id:'shake',label:'Shake hands, good game'},{id:'trash',label:'Trash talk'},{id:'ignore',label:'Ignore them'}]})}
function handleRival(e,id){const p=personById(e.participants?.[0]),r=(S.rivals||[]).find(x=>x.npcId===e.payload?.npcId);if(!p||!r)return true;let s;
 if(id==='shake'){p.rel=clamp(p.rel+5);p.trust=clamp(p.trust+3);r.type=p.rel>=60?'respect':'friendly competition';s=`${firstName(p)} grins. "Next time, I'm winning." It feels like respect.`}else if(id==='trash'){p.rel=clamp(p.rel-6);p.conflict=clamp((p.conflict||0)+8);r.type=r.score>=3?'resentment':'jealous rivalry';addRep('troublemaker',1);s=`You say something cutting. ${firstName(p)} fires back. This is personal now.`}else{s='You ignore them. They notice that too.'}
 if(p.rel>=68&&r.type!=='resentment'){p.roleLabel='friend (former rival)';r.type='friendship';s+=' Somewhere along the way, the rivalry turned into a friendship.'}
 rememberPerson(p,`Rivalry in ${r.domain}: ${r.type}.`);log(e.title,s);return true}
// ===== Awards (§115) =====
function awardsCeremony(old){if(!old||old.grade==='Kindergarten'||!old.record)return;const rec=old.record,avg=old.subjects?.reduce((a,s)=>a+s.score,0)/Math.max(1,old.subjects?.length||1),r=ensureRep(),a=[];
 if(avg>=85)a.push(['Honor Roll','academic']);if(rec.absences===0&&rec.tardies<=2&&rec.daysAttended>=60)a.push(['Perfect Attendance','club']);if((old.contests||[]).some(c=>/Winner/.test(c.result||'')))a.push(['Competition Winner','academic']);if((old.clubs||[]).some(c=>c.status==='Active'&&ladderFor(c).slice(-2).includes(c.position)))a.push(['Club Leadership Award','leadership']);if(r.creative>=60)a.push(['Art & Creativity Award','creative']);if(r.athletic>=60)a.push(['Athlete of the Year','athletic']);if(old.councilRole)a.push(['Student Government Service','leadership']);if(r.kindness>=60)a.push(['Kindness Award','kindness']);
 if(!a.length)return;S.awards=S.awards||[];for(const [name,dim] of a){S.awards.unshift({name,grade:old.grade,year:parseISO(currentDate()).getUTCFullYear(),dateISO:currentDate()});addRep(dim,4);recordOutcome('Award',name,old.grade,'Recognized at the end-of-year ceremony.')}
 const parent=S.people.find(p=>p.role==='parent');if(parent){parent.rel=clamp(parent.rel+3);rememberPerson(parent,`Watched you receive ${a.map(x=>x[0]).join(', ')}.`,2)}const f=bestNonFamily();if(f)f.rel=clamp(f.rel+1);S.happiness=clamp(S.happiness+5);
 if(SIM.summary)SIM.summary.notable.push(`Awards: ${a.map(x=>x[0]).join(', ')}`);
 S.milestones.unshift({dateISO:currentDate(),age:S.age,title:'🏅 End-of-year awards',text:`${a.map(x=>x[0]).join(', ')} (${old.grade}).`});
 if(!SIM.skipping)log('🏅 Awards ceremony',`Your name is called for ${a.map(x=>x[0]).join(', ')}. ${parent?`${parent.name} takes about forty photos.`:''} ${f?`${firstName(f)} cheers louder than anyone.`:''}`,true)}
// ===== Gift reactions (§108) =====
const TRAIT_LIKES={Sporty:['Sports'],Artsy:['Arts & crafts','Books'],Studious:['Books','School supplies'],Curious:['Books','Electronics','Toys & games'],Outgoing:['Beauty & care','Clothes','Gifts'],Funny:['Toys & games'],Kind:['Gifts','Food & drinks'],Competitive:['Sports','Toys & games'],Quiet:['Books'],Generous:['Gifts']};
const INTEREST_LIKES={Football:'Sports',Basketball:'Sports',Swimming:'Sports','Art Club':'Arts & crafts',Drama:'Clothes',Music:'Electronics','Science Club':'Books','Coding Club':'Electronics',Debate:'Books','Chess Club':'Toys & games','Student Council':'School supplies'};
function npcGiftReaction(p,gift,d){
 const likes=new Set([...(p.traits||[]).flatMap(t=>TRAIT_LIKES[t]||[]),INTEREST_LIKES[npcById(p.npcId)?.interest]].filter(Boolean)),cat=d.category||gift.category,price=d.price||0,handmade=/Handmade|homemade/i.test(gift.origin||gift.name||''),occasion=holidayWindow().some(x=>x.days<=0&&['christmas','valentines','lunarNewYear','mothersDay','fathersDay','teachersDay'].includes(x.h.id));
 p.giftsReceived=p.giftsReceived||[];const owns=p.giftsReceived.includes(gift.key);
 if(isSpoiled(gift))return {tier:'dislike',rel:-2,trust:0,why:`${firstName(p)} notices it has gone bad. Awkward.`};
 if(price>=60&&(p.boundaries?.includes('noExpensiveGifts')||p.rel<50))return {tier:'awkward',rel:0,trust:-1,why:`"This is too much — I can't accept something this expensive." ${p.boundaries?.includes('noExpensiveGifts')?`${firstName(p)} really is uncomfortable with big gifts.`:'You do not know each other that well yet.'}`};
 if(owns)return {tier:'alreadyOwn',rel:2,trust:1,why:`"Oh — I actually already have one from you! But thank you."`};
 if(handmade&&p.rel>=55)return {tier:'love',rel:9,trust:4,why:`${firstName(p)} goes quiet, then hugs you. A handmade gift from someone close means more than anything from a store.`};
 if(d.personal)return {tier:p.rel>=55?'love':'effort',rel:p.rel>=55?7:4,trust:4,why:`${firstName(p)} reads what you wrote twice. "You actually mean this."`};
 if(hasCondition(gift.lifecycleType)&&gift.condition<45)return {tier:'effort',rel:1,trust:0,why:`${firstName(p)} thanks you, though the ${gift.name.toLowerCase()} has clearly seen better days.`};
 if(likes.has(cat))return {tier:'love',rel:6+Math.min(3,price/40)+(occasion?2:0),trust:2,why:`${firstName(p)} lights up — it is exactly their kind of thing.${occasion?' Perfect timing, too.':''}`};
 if(p.rel<45&&likes.size&&!likes.has(cat))return {tier:'dislike',rel:0,trust:0,why:`${firstName(p)} says thank you, but it is clearly not their thing.`};
 return {tier:'like',rel:3+Math.min(4,price/40)+(occasion?2:0),trust:1,why:rand([`${firstName(p)} smiles. "That's really thoughtful."`,`"For me? Thanks!"`])}
}
function giveInventoryItem(itemId,personId){
 const it=S.inventoryItems.find(x=>x.id===itemId),p=personById(personId);if(!it||!p)return;const d=catalogItem(it.key)||{};
 if(S.age<13&&d.price>=100&&!caregiverApproval(0)){closeChoiceModal();log('Not allowed',`Your caregiver says the ${it.name.toLowerCase()} is too valuable to give away.`);return}
 const gift=removeItem(it.id,true)||it,r=npcGiftReaction(p,gift,d);let extra='';
 const wrap=findUsable('giftWrap');if(wrap&&!d.personal&&r.tier!=='dislike'){const u=openOne(wrap);u.remaining=clamp(u.remaining-20);if(u.remaining<=.5)removeItem(u.id);r.rel+=1.5;extra=' The wrapping makes it feel special.'}
 p.rel=clamp(p.rel+r.rel);p.trust=clamp(p.trust+r.trust);p.giftsReceived=[...(p.giftsReceived||[]),gift.key].slice(-12);rememberPerson(p,`You gave them ${gift.name.toLowerCase()} — ${r.tier}.`,r.tier==='love'?2:1);
 if(gift.sentimental>=35&&gift.origin)S.happiness=clamp(S.happiness+(r.rel>0?1:-2));
 advanceTime(10);closeChoiceModal();recordOutcome('Gift',`${gift.name} → ${displayName(p,'formal')}`,{love:'Loved it',like:'Liked it',effort:'Appreciated the effort',awkward:'Awkward',alreadyOwn:'Already had one',dislike:'Not their thing'}[r.tier],r.why);
 log(`Gave ${gift.name.toLowerCase()} to ${firstName(p)}`,`${r.why}${extra}`);toast(`Gift • ${firstName(p)}`)
}
// ===== Sneaking out / in (§82). Minors: friends & parties only — never romantic. =====
function canSneak(p){if(S.age<12||S.age>=18||!p||isFamilyPerson(p))return false;const m=currentMinute(),late=m>=Math.min(curfewMinute()||1439,bedtimeMinute())||m<300;return late}
function sneakOut(personId,mode){
 const p=personById(personId);if(!canSneak(p)){toast('That is not something to sneak around for right now.');return}closeChoiceModal();
 if(p.id===S.romance?.partnerId&&S.age<18&&mode==='over'){toast('Not that — keep time with them to daytime plans.');return}
 if(mode==='over'||mode==='meet'){const st=npcStatusAt(p,currentDate(),1000);const refuse=(p.traits||[]).includes('Studious')&&chance(50)||chance(25);if(refuse){log('They say no',`${firstName(p)} texts back: "${rand(["My parents will be home soon — no way.","I'd get in so much trouble. Not tonight.","It's too late, I have school tomorrow."])}"`);return}}
 const r=familyRules(),brk=S.family.ruleBreaks||0,sib=S.people.find(x=>/sibling/.test(x.role));let pCaught=clamp(18+r.strictness*.35+(currentMinute()<300?10:0)+brk*5+Math.random()*15-(S.luck-50)*.1,5,85);
 S.family.ruleBreaks=brk+1;advanceTime(mode==='over'?150:120,{silent:true});S.needs.fun=clamp(S.needs.fun+12);p.rel=clamp(p.rel+3);rememberPerson(p,mode==='over'?'You snuck them over late at night.':'You snuck out to meet them.',2);
 let story=mode==='over'?`You let ${firstName(p)} in through the back. You whisper-laugh through a movie with the volume at 2.`:`You slip out and meet ${firstName(p)}. The empty streets at night feel like another world.`;
 if(sib&&chance(30)){queueEvent({type:'sneakSibling',title:`${firstName(sib)} caught you`,text:`${firstName(sib)} is standing in the hallway. "Where were you?"`,participants:[sib.id],priority:3,expiresDays:1,choices:[{id:'ask',label:'Ask them to keep it secret'},{id:'bribe',label:'Bribe them ($10)'},{id:'let',label:'Let them tell'}]});log('Sneaking',story);return}
 if(chance(pCaught*.5)){S.family.trust=clamp(S.family.trust-12);S.family.tension=clamp(S.family.tension+7);ground(5,'Sneaking out');log('Caught sneaking',`${story} Then the hallway light snaps on. ${primaryCaregiver()} is standing there. Grounded for five days, and trust takes a hit.`);return}
 if(chance(pCaught*.4)){scheduleFollowUp('sneakFound',{how:chance(50)?'neighbor':'parent'},{days:1,minute:1080});log('Sneaking',story+' You make it back in. Probably nobody noticed.');return}
 setEmotion('Excited','You got away with sneaking out.',55);log('Sneaking',story+' You make it back without a sound.')
}
function handleSneakSibling(e,id){const sib=personById(e.participants?.[0]);if(!sib)return true;let s;if(id==='ask'){if(sib.rel>=55&&chance(70)){sib.trust=clamp(sib.trust+2);s=`${firstName(sib)} rolls their eyes. "Fine. You owe me."`}else{scheduleFollowUp('sneakFound',{how:'sibling'},{minute:Math.min(1439,currentMinute()+120)});s=`${firstName(sib)} does not promise anything.`}}else if(id==='bribe'){if(spendOwn(10)){s=`${firstName(sib)} pockets the money. Silence bought.`}else{scheduleFollowUp('sneakFound',{how:'sibling'},{minute:Math.min(1439,currentMinute()+120)});s='You do not have $10. That goes badly.'}}else{scheduleFollowUp('sneakFound',{how:'sibling'},{minute:Math.min(1439,currentMinute()+60)});s='You shrug. Whatever happens, happens.'}log(e.title,s);return true}
// ===== NPC agency (§62): NPCs date, break up, need help, send gifts =====
function npcAgencyTick(){
 if(S.age<10)return;
 for(const p of S.people){if(isFamilyPerson(p)||p.movedAway)continue;const a=personAge(p);
  if(a>=14&&!p.datingNpc&&p.id!==S.romance?.partnerId&&chance(1.2)){const o=(S.npcs||[]).find(n=>n.id!==p.npcId&&Math.abs(npcAge(n)-a)<=1&&!n.datingId&&!S.people.some(x=>x.npcId===n.id&&(x.datingNpc||x.id===S.romance?.partnerId))&&npcAge(n)>=14&&(a<18)===(npcAge(n)<18));if(o){p.datingNpc=o.fullName;o.datingId=p.npcId;const q=S.people.find(x=>x.npcId===o.id);if(q)q.datingNpc=displayName(p,'formal');if(!SIM.skipping&&p.rel>=55)log('News',`${firstName(p)} is dating ${o.fullName} now.`);if(S.romance?.partnerId!==p.id&&(p.attraction||0)>=60)p.attraction=clamp(p.attraction-15)}}
  else if(p.datingNpc&&chance(1)){const ex=(S.npcs||[]).find(n=>n.fullName===p.datingNpc);if(ex){ex.datingId=null;const q=S.people.find(x=>x.npcId===ex.id);if(q)q.datingNpc=null}if(!SIM.skipping&&p.rel>=55)queueEvent({type:'helpRequest',title:`${firstName(p)} had a breakup`,text:`${firstName(p)} and ${p.datingNpc} broke up. They seem upset.`,participants:[p.id],priority:2,expiresDays:1,choices:[{id:'help',label:'Be there for them'},{id:'later',label:'Text them later'}]});p.datingNpc=null}
 }
 const partner=partnerPerson();if(partner&&partner.rel<35&&chance(15)){const why=partner.conflict>25?'too many fights':'they felt you had drifted apart';endRelationship(partner,why,{byNpc:true});if(!SIM.skipping)log('Breakup',`${firstName(partner)} ends things. "${why==='too many fights'?'We just keep fighting. I can\'t do this anymore.':'It feels like we\'re not really together anymore.'}"`,true)}
 if(!SIM.skipping&&chance(2)){const p=rand(S.people.filter(x=>!isFamilyPerson(x)&&x.rel>=50&&!x.movedAway));if(p)queueEvent({type:'helpRequest',title:`${firstName(p)} needs a favor`,text:rand([`${firstName(p)} is stuck on an assignment and asks for help.`,`${firstName(p)} is moving furniture and asks for an extra pair of hands.`,`${firstName(p)} needs someone to talk to.`]),participants:[p.id],priority:2,expiresDays:1,choices:[{id:'help',label:'Help'},{id:'later',label:'Not right now'}]})}
 if(!SIM.skipping&&chance(.6)){const p=rand(S.people.filter(x=>!isFamilyPerson(x)&&x.rel>=70));if(p){const k=rand(['book','snackPack','greetingCard','comicBook'].filter(x=>D.catalog[x]&&S.age>=D.catalog[x].minAge));if(k){addItem(k,`from ${displayName(p,'formal')}`);log('A surprise gift',`${firstName(p)} gives you a ${D.catalog[k].name.toLowerCase()} — "Saw this and thought of you."`)}}}
}
function handleHelpRequest(e,id){const p=personById(e.participants?.[0]);if(!p)return true;if(id==='help'){advanceTime(60,{silent:true});p.rel=clamp(p.rel+5);p.trust=clamp(p.trust+4);addRep('kindness',1);log(e.title,`You show up. ${firstName(p)} will not forget it.`);rememberPerson(p,'You helped them when they needed it.',2)}else{p.rel=clamp(p.rel-1);log(e.title,`You say you can't right now. ${firstName(p)} understands, mostly.`)}return true}
// ===== Relationship action stories (§60, §123) =====
function relationshipTitle(p,action){return `${firstName(p)} • ${{talk:'talked',hangout:'spent time together',play:'played together',confide:'confided',gossip:'gossiped',argue:'argued',apologize:'apologized',message:'messaged',call:'called'}[action]||action}`}
function relationshipStory(p,action){const tr=p.traits||[],fn=firstName(p),j=(S.groups||[])[0]?.jokes?.[0],mem=(p.history||[])[1]?.text;
 const pools={talk:[`You and ${fn} talk about ${rand(['school','a show you both like','something weird that happened today','what you want to do next summer'])}.${tr.includes('Funny')?` ${fn} has you laughing within minutes.`:''}`,`${fn} tells you about ${rand(['a problem at home','a new hobby','someone they cannot stand'])}. You mostly listen.`,mem?`${fn} brings up the time "${mem.slice(0,60)}" — they remember more than you thought.`:`A normal conversation that runs longer than either of you planned.`],
  hangout:[`You and ${fn} ${rand(['wander around town','end up at the park','try a new snack place','do absolutely nothing productive'])}.${j?` Someone mentions ${j} and you both lose it.`:''}`,`${tr.includes('Sporty')?`${fn} talks you into shooting hoops.`:tr.includes('Artsy')?`${fn} drags you to a tiny gallery.`:`You and ${fn} spend the afternoon together.`} It is easy, the way it is with good friends.`],
  play:[`You and ${fn} invent a game with complicated rules that change every five minutes.`,`${fn} wants to play pretend; you are assigned the role of dragon.`],
  confide:[`You tell ${fn} something you have not told anyone. ${p.trust>=65?'They handle it with care.':'They listen, a little unsure what to say.'}`],
  gossip:[`You and ${fn} trade gossip. ${tr.includes('Kind')?`${fn} looks a bit uncomfortable.`:'It is fun, if not exactly kind.'}`],
  argue:[`It starts over something small and gets bigger. ${fn} says something that stings; so do you.`],
  apologize:[`You apologize to ${fn} without excuses. ${p.conflict>20?'They are not ready to let it go completely.':'They soften. "Thanks for saying that."'}`],
  message:[`You send ${fn} a message. ${rand(['They reply with seven emojis.','They answer an hour later with a meme.','A short reply, but warm.'])}`],
  call:[`A long call with ${fn}. You talk until someone's battery complains.`]};
 return rand(pools[action]||[`You spend some time with ${fn}.`])}
// ===== Click & event routing =====
function worldEventChoice(e,id){
 if(e.type==='nbh')return handleNeighborhood(e,id);if(e.type==='meetPeople')return handleMeetPeople(e,id);if(e.type==='promInvite')return handlePromInvite(e,id);if(e.type==='promSkipNight')return handlePromSkip(id);
 if(e.type==='groupExcluded'||e.type==='groupArgument')return handleGroupEvent(e,id);if(e.type==='rivalMoment')return handleRival(e,id);if(e.type==='sneakSibling')return handleSneakSibling(e,id);if(e.type==='helpRequest')return handleHelpRequest(e,id);
 if(e.type==='sneakTalk'){const s={apologize:'You admit it and apologize. Grounded for three days, but some trust is saved.',lie:'You deny it. They do not believe you. That makes it worse.',argue:'You argue that you are old enough. It goes badly.'}[id];if(id==='apologize'){ground(3,'Sneaking out');S.family.trust=clamp(S.family.trust-4)}else{ground(6,'Sneaking out');S.family.trust=clamp(S.family.trust-12);S.family.tension=clamp(S.family.tension+6)}log(e.title,s);return true}
 return false}
function worldFollowUp(f){
 if(f.type==='promTimeout'){const pr=S.school?.prom,p=personById(f.payload.personId),rec=pr?.received?.find(r=>r.personId===p?.id&&r.status==='Waiting');if(!rec)return true;rec.status='Expired';const o2=freePromNpc([p.npcId],personAge(p));if(o2)pairPersonWithNpc(p,o2);else setPromWithPerson(p,'someone else');p.rel=clamp(p.rel-2);if(!SIM.skipping)log('Too slow',`${firstName(p)} got tired of waiting and asked ${personPromWith(p)} instead.`);return true}
 if(f.type==='promAnswer'){const pr=S.school?.prom,p=personById(f.payload.personId),a=pr?.asked?.find(x=>x.personId===p?.id&&x.result==='Pending');if(!a)return true;if(!pr.partnerId&&chance(55)){a.result='Accepted';pr.partnerId=p.id;pr.plan='date';p.promWith=S.name;if(!SIM.skipping)log(`${firstName(p)} said yes!`,`"Okay. Yes. I'd like to go with you." Worth the wait.`,true)}else{a.result='Rejected';a.reason='Decided not to';if(!SIM.skipping)log(`${firstName(p)} decided`,`"I thought about it… I don't think so. Sorry."`)}return true}
 if(f.type==='sneakFound'){if(SIM.skipping){S.family.trust=clamp(S.family.trust-6);return true}const how={neighbor:'A neighbor mentioned seeing you out late',sibling:'Your sibling told',parent:'Something gave you away'}[f.payload.how]||'Someone noticed';queueEvent({type:'sneakTalk',title:'They know you snuck out',text:`${how}. ${primaryCaregiver()} wants to talk — now.`,priority:4,expiresDays:1,choices:[{id:'apologize',label:'Admit it and apologize'},{id:'lie',label:'Deny it'},{id:'argue',label:'Argue'}]});if(f.payload.how==='neighbor')nbRep('troublemaker',2);return true}
 return false}
function worldClick(b){const d=b.dataset;if(d.sneak){sneakOut(d.personId,d.sneak);save();render();return true}return false}

// =====================================================================
// v7.3 CHARACTER CREATOR FIXES
// • Each Random button changes only its own field.
// • Horoscope is derived from the birth date (read-only).
// • Two modes: Surprise me (everything) / Fill the rest (empty fields only).
// • Birthplace = Country dropdown → City/State dropdown (no free text).
// • A new life is born in the real current year (device clock). The QA harness (?qa=1) may use historical dates.
// =====================================================================
const QA_MODE=/[?&]qa=1/.test(location.search);
const CURRENT_YEAR=new Date().getFullYear();
const COUNTRY_CITIES={
 'Vietnam':['Hanoi','Ho Chi Minh City','Da Nang','Hai Phong','Can Tho','Hue','Nha Trang'],
 'USA':['New York City, New York','Los Angeles, California','Chicago, Illinois','Houston, Texas','Seattle, Washington','Miami, Florida','Boston, Massachusetts'],
 'UK':['London, England','Manchester, England','Birmingham, England','Edinburgh, Scotland','Cardiff, Wales'],
 'Canada':['Vancouver, British Columbia','Toronto, Ontario','Montreal, Quebec','Calgary, Alberta'],
 'Australia':['Sydney, New South Wales','Melbourne, Victoria','Brisbane, Queensland','Perth, Western Australia'],
 'South Korea':['Seoul','Busan','Incheon','Daegu'],
 'Japan':['Tokyo','Osaka','Kyoto','Sapporo','Fukuoka'],
 'China':['Beijing','Shanghai','Guangzhou','Shenzhen'],
 'France':['Paris','Lyon','Marseille','Toulouse','Nice'],
 'Singapore':['Singapore'],
 'Thailand':['Bangkok','Chiang Mai','Phuket']
};
const CREATOR_OPTIONS={gender:['Girl','Boy','Non-binary','Other'],attraction:['Men','Women','All genders','Not sure yet','Asexual / romantic'],wealth:['Struggling','Modest','Middle class','Comfortable','Wealthy','Extremely wealthy'],home:['Warm and stable','Busy but loving','Strict','Chaotic','Quiet','Highly privileged','Unpredictable']};
function randomBirthDate(){const start=Date.UTC(CURRENT_YEAR,0,1),days=(Date.UTC(CURRENT_YEAR+1,0,1)-start)/864e5;return isoDate(new Date(start+Math.floor(Math.random()*days)*864e5))}
function placeValue(){const c=$('c-country')?.value,city=$('c-city')?.value;if(!c||!city)return '';return city===c?c:`${city}, ${c}`}
function fillCities(country,keep=null){const sel=$('c-city');if(!sel)return;const list=COUNTRY_CITIES[country]||[];sel.innerHTML=`<option value="">${country?'Choose a city…':'Choose a country first'}</option>`+list.map(c=>`<option>${esc(c)}</option>`).join('');sel.disabled=!country;if(keep&&list.includes(keep))sel.value=keep}
function syncPlace(){$('c-place').value=placeValue()}
function syncZodiac(){const v=$('c-dob').value,out=$('c-zodiac-view');if(out)out.textContent=v?zodiacFromDate(v):'Set a birth date';$('c-zodiac').value='auto'}
function randomField(key){
 if(key==='name')$('c-name').value=rand(D.names);
 else if(key==='dob'){$('c-dob').value=randomBirthDate();syncZodiac()}
 else if(key==='place'){const c=rand(Object.keys(COUNTRY_CITIES));$('c-country').value=c;fillCities(c);$('c-city').value=rand(COUNTRY_CITIES[c]);syncPlace()}
 else if(CREATOR_OPTIONS[key])$(`c-${key}`).value=rand(CREATOR_OPTIONS[key]);
 else if(key==='personality'){selectedP=[rand(D.personalities),rand(D.personalities)].filter((x,i,a)=>a.indexOf(x)===i);chips('personality',D.personalities,selectedP)}
 else if(key==='talents'){selectedT=[rand(D.talents),rand(D.talents)].filter((x,i,a)=>a.indexOf(x)===i);chips('talents',D.talents,selectedT)}
}
const CREATOR_FIELDS=['name','dob','place','gender','attraction','wealth','home','personality','talents'];
function fieldEmpty(key){if(key==='name')return !$('c-name').value.trim();if(key==='dob')return !$('c-dob').value;if(key==='place')return !placeValue();if(key==='personality')return !selectedP.length;if(key==='talents')return !selectedT.length;return !$(`c-${key}`).value}
function randomize(){CREATOR_FIELDS.forEach(randomField);toast('Character randomized')}
function fillRest(){const empty=CREATOR_FIELDS.filter(fieldEmpty);empty.forEach(randomField);toast(empty.length?`Filled ${empty.length} empty field${empty.length===1?'':'s'}`:'Everything is already filled in')}
function setupCreator(){
 const dob=$('c-dob');if(!dob||dob.dataset.ready)return;dob.dataset.ready='1';
 if(!QA_MODE){dob.min=`${CURRENT_YEAR}-01-01`;dob.max=`${CURRENT_YEAR}-12-31`}
 const cs=$('c-country');cs.innerHTML='<option value="">Choose a country…</option>'+Object.keys(COUNTRY_CITIES).map(c=>`<option>${esc(c)}</option>`).join('');fillCities('');
 cs.addEventListener('change',()=>{fillCities(cs.value);syncPlace()});$('c-city').addEventListener('change',syncPlace);
 dob.addEventListener('change',syncZodiac);dob.addEventListener('input',syncZodiac);syncZodiac();
 const fr=$('fill-rest');if(fr)fr.addEventListener('click',fillRest);
}
function creatorDob(v){
 let dob=v||randomBirthDate();
 if(!QA_MODE&&dob.slice(0,4)!==String(CURRENT_YEAR)){dob=`${CURRENT_YEAR}${dob.slice(4)}`;if(!/^\d{4}-\d{2}-\d{2}$/.test(dob)||isNaN(parseISO(dob)))dob=randomBirthDate()}
 return dob
}
setTimeout(setupCreator,0);

// Fix: the original zodiac table returned Capricorn for every date after a sign's cutoff day (e.g. Jul 23 → Capricorn).
function zodiacFromDate(dateISO){const d=parseISO(dateISO),m=d.getUTCMonth()+1,day=d.getUTCDate();const signs=['Capricorn','Aquarius','Pisces','Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius'],cut=[19,18,20,19,20,20,22,22,22,22,21,21];return day<=cut[m-1]?signs[m-1]:signs[m%12]}

// =====================================================================
// v7.3 G — REAL ACADEMIC CALENDAR
// School years start on a fixed date per country, have 2 semesters and real
// breaks. Grades follow an age cutoff (not birthdays). Classes move up on the
// first day of the new school year. Old saves keep their grade until then.
// =====================================================================
const D_=(Y,md)=>`${Y}-${md}`;
const SCHOOL_CAL={
 US:{start:Y=>D_(Y,'08-27'),sem1End:Y=>D_(Y+1,'01-16'),sem2Start:Y=>D_(Y+1,'01-21'),end:Y=>D_(Y+1,'06-12'),cutoff:Y=>D_(Y,'09-01'),breaks:Y=>{const tg=nthWeekday(Y,11,4,4),sb=nthWeekday(Y+1,3,1,2);return [['Thanksgiving break',addDays(tg,-1),addDays(tg,1)],['Winter break',D_(Y,'12-21'),D_(Y+1,'01-02')],['Spring break',sb,addDays(sb,4)]]}},
 CA:{start:Y=>addDays(nthWeekday(Y,9,1,1),1),sem1End:Y=>D_(Y+1,'01-31'),sem2Start:Y=>D_(Y+1,'02-03'),end:Y=>D_(Y+1,'06-27'),cutoff:Y=>D_(Y,'12-31'),breaks:Y=>{const tg=nthWeekday(Y,10,1,2),mb=nthWeekday(Y+1,3,1,3);return [['Thanksgiving',tg,tg],['Winter break',D_(Y,'12-21'),D_(Y+1,'01-04')],['March break',mb,addDays(mb,4)]]}},
 UK:{start:Y=>D_(Y,'09-04'),sem1End:Y=>D_(Y+1,'01-31'),sem2Start:Y=>D_(Y+1,'02-02'),end:Y=>D_(Y+1,'07-19'),cutoff:Y=>D_(Y,'09-01'),breaks:Y=>{const oh=lastWeekday(Y,10,1),fh=nthWeekday(Y+1,2,1,3),e=easterDate(Y+1),mh=lastWeekday(Y+1,5,1);return [['October half-term',oh,addDays(oh,4)],['Christmas holidays',D_(Y,'12-20'),D_(Y+1,'01-03')],['February half-term',fh,addDays(fh,4)],['Easter holidays',addDays(e,-7),addDays(e,7)],['May half-term',mh,addDays(mh,4)]]}},
 FR:{start:Y=>D_(Y,'09-02'),sem1End:Y=>D_(Y+1,'01-24'),sem2Start:Y=>D_(Y+1,'01-27'),end:Y=>D_(Y+1,'07-04'),cutoff:Y=>D_(Y,'12-31'),breaks:Y=>[['Toussaint holidays',D_(Y,'10-19'),D_(Y,'11-03')],['Christmas holidays',D_(Y,'12-21'),D_(Y+1,'01-05')],['Winter holidays',D_(Y+1,'02-15'),D_(Y+1,'03-02')],['Spring holidays',D_(Y+1,'04-12'),D_(Y+1,'04-27')]]},
 VN:{start:Y=>D_(Y,'09-05'),sem1End:Y=>D_(Y+1,'01-10'),sem2Start:Y=>D_(Y+1,'01-13'),end:Y=>D_(Y+1,'05-25'),cutoff:Y=>D_(Y,'12-31'),breaks:Y=>{const t=lunarNewYearDate(Y+1,'VN');return [['New Year holiday',D_(Y+1,'01-01'),D_(Y+1,'01-01')],['Tết holiday',addDays(t,-3),addDays(t,5)],['Reunification & Labour Day',D_(Y+1,'04-30'),D_(Y+1,'05-01')]]}},
 CN:{start:Y=>D_(Y,'09-01'),sem1End:Y=>D_(Y+1,'01-15'),sem2Start:Y=>addDays(lunarNewYearDate(Y+1,'CN'),16),end:Y=>D_(Y+1,'07-05'),cutoff:Y=>D_(Y,'08-31'),breaks:Y=>[['National Day holiday',D_(Y,'10-01'),D_(Y,'10-07')]]},
 KR:{start:Y=>D_(Y,'03-02'),sem1End:Y=>D_(Y,'07-19'),sem2Start:Y=>D_(Y,'08-19'),end:Y=>D_(Y+1,'02-10'),cutoff:Y=>D_(Y-1,'12-31'),breaks:Y=>[['Winter vacation',D_(Y,'12-24'),D_(Y+1,'02-02')]]},
 JP:{start:Y=>D_(Y,'04-07'),sem1End:Y=>D_(Y,'09-30'),sem2Start:Y=>D_(Y,'10-07'),end:Y=>D_(Y+1,'03-20'),cutoff:Y=>D_(Y,'04-01'),breaks:Y=>[['Golden Week',D_(Y,'04-29'),D_(Y,'05-05')],['Summer vacation',D_(Y,'07-20'),D_(Y,'08-31')],['Winter vacation',D_(Y,'12-25'),D_(Y+1,'01-07')]]},
 AU:{start:Y=>D_(Y,'01-30'),sem1End:Y=>D_(Y,'06-27'),sem2Start:Y=>D_(Y,'07-14'),end:Y=>D_(Y,'12-18'),cutoff:Y=>D_(Y,'07-31'),breaks:Y=>[['Term 1 holidays',D_(Y,'04-11'),D_(Y,'04-27')],['Term 3 holidays',D_(Y,'09-20'),D_(Y,'10-06')]]},
 SG:{start:Y=>D_(Y,'01-02'),sem1End:Y=>D_(Y,'05-29'),sem2Start:Y=>D_(Y,'06-29'),end:Y=>D_(Y,'11-14'),cutoff:Y=>D_(Y-1,'12-31'),breaks:Y=>{const t=lunarNewYearDate(Y,'SG');return [['March holidays',D_(Y,'03-14'),D_(Y,'03-22')],['Chinese New Year',t,addDays(t,1)],['September holidays',D_(Y,'09-06'),D_(Y,'09-14')]]}},
 TH:{start:Y=>D_(Y,'05-16'),sem1End:Y=>D_(Y,'09-30'),sem2Start:Y=>D_(Y,'11-01'),end:Y=>D_(Y+1,'03-15'),cutoff:Y=>D_(Y,'05-16'),breaks:Y=>[['New Year holiday',D_(Y,'12-31'),D_(Y+1,'01-02')]]},
 INTL:{start:Y=>D_(Y,'09-01'),sem1End:Y=>D_(Y+1,'01-20'),sem2Start:Y=>D_(Y+1,'01-25'),end:Y=>D_(Y+1,'06-20'),cutoff:Y=>D_(Y,'09-01'),breaks:Y=>[['Winter break',D_(Y,'12-21'),D_(Y+1,'01-03')],['Spring break',D_(Y+1,'04-06'),D_(Y+1,'04-10')]]}
};
const DAY_OFF_HOLIDAYS={newYear:'all',christmas:'all',thanksgiving:['US','CA'],lunarNewYear:['VN','KR','CN','SG']};
function weekdayOnOrBefore(d){let x=d;for(let i=0;i<7&&isWeekend(x);i++)x=addDays(x,-1);return x}
function weekdayOnOrAfter(d){let x=d;for(let i=0;i<7&&isWeekend(x);i++)x=addDays(x,1);return x}
function schoolRegion(){const r=calendarProfile().region;return SCHOOL_CAL[r]?r:'INTL'}
const _acCache={},_sdCache={};
function academicYear(Y){const r=schoolRegion(),k=r+Y;if(_acCache[k])return _acCache[k];const c=SCHOOL_CAL[r];return _acCache[k]={key:Y,region:r,start:weekdayOnOrAfter(c.start(Y)),sem1End:weekdayOnOrBefore(c.sem1End(Y)),sem2Start:weekdayOnOrAfter(c.sem2Start(Y)),end:weekdayOnOrBefore(c.end(Y)),cutoff:c.cutoff(Y),breaks:c.breaks(Y).map(([name,from,to])=>({name,from,to}))}}
function academicInfo(date=currentDate()){let Y=parseISO(date).getUTCFullYear(),a=academicYear(Y);if(date<a.start){Y--;a=academicYear(Y)}const phase=date<=a.sem1End?'sem1':date<a.sem2Start?'semBreak':date<=a.end?'sem2':'summer';return Object.assign({},a,{phase,semester:phase==='sem1'?1:phase==='sem2'?2:null})}
function breakOn(date,a=academicInfo(date)){return a.breaks.find(b=>date>=b.from&&date<=b.to)||null}
function dayOffHoliday(date,region){for(const x of holidaysOn(date)){const r=DAY_OFF_HOLIDAYS[x.h.id];if(r==='all'||(Array.isArray(r)&&r.includes(region)))return x.h.name}return null}
function isSchoolDay(date=currentDate()){const k=schoolRegion()+date;if(k in _sdCache)return _sdCache[k];let v=!isWeekend(date);if(v){const a=academicInfo(date);v=!!a.semester&&!breakOn(date,a)&&!dayOffHoliday(date,a.region)}if(Object.keys(_sdCache).length>4000)for(const x in _sdCache)delete _sdCache[x];return _sdCache[k]=v}
function noSchoolReason(date=currentDate()){if(isWeekend(date))return 'Weekend';const a=academicInfo(date);if(a.phase==='summer')return a.region==='KR'||a.region==='JP'||a.region==='AU'||a.region==='SG'||a.region==='TH'?'Between school years':'Summer break';if(a.phase==='semBreak')return 'Semester break';const b=breakOn(date,a);if(b)return b.name;return dayOffHoliday(date,a.region)||'No school'}
function nextSchoolDay(dateISO){let d=dateISO;for(let i=0;i<200&&!isSchoolDay(d);i++)d=addDays(d,1);return d}
function ageOn(dateISO){const b=parseISO(S.dob),d=parseISO(dateISO);let a=d.getUTCFullYear()-b.getUTCFullYear();if(d.getUTCMonth()<b.getUTCMonth()||(d.getUTCMonth()===b.getUTCMonth()&&d.getUTCDate()<b.getUTCDate()))a--;return a}
function baseGradeFor(Y){return ageOn(academicYear(Y).cutoff)-5}
function gradeForYear(Y){return baseGradeFor(Y)+(S.education?.gradeOffset||0)}
function gradeLabelFor(g){return g<=6?`Grade ${g}`:g<=9?`Middle school • Grade ${g}`:`High school • Grade ${g}`}
function needsFormalSchool(){return !!S.school&&S.school.grade!=='Kindergarten'&&gradeNumber()>=1&&!S.education?.highSchoolDone}
function electionGradeOK(){const g=gradeNumber();return g>=8&&g<=12}
function schoolYearEnd(){return S.school?academicYear(S.school.yearKey??academicInfo().key).end:null}
function semesterEnd(){const a=academicInfo();return a.phase==='sem1'?a.sem1End:a.phase==='sem2'?a.end:null}
function semesterLabel(){const a=academicInfo(),d=currentDate();if(a.phase==='sem1'||a.phase==='sem2'){const end=a.phase==='sem1'?a.sem1End:a.end,nb=a.breaks.filter(b=>b.from>=d&&b.from<=end).sort((x,y)=>x.from.localeCompare(y.from))[0];return `Semester ${a.semester} • ends ${formatDate(end)}${nb?` • next: ${nb.name} (${formatDate(nb.from)})`:''}`}if(a.phase==='semBreak')return `Semester break • Semester 2 starts ${formatDate(a.sem2Start)}`;const nx=academicYear(a.key+1);return `School year over • next year starts ${formatDate(nx.start)}`}
// ---------- Exams per semester ----------
function scheduleSemesterExams(sem){
 if(!needsFormalSchool())return;const a=academicInfo(),start=sem===1?a.start:a.sem2Start,end=sem===1?a.sem1End:a.end,from=addDays(currentDate()>start?currentDate():start,7),to=addDays(end,-10);if(from>=to)return;
 const span=daysBetween(from,to),subs=S.school.subjects.slice(0,6);
 subs.forEach((sub,i)=>{const d=nextSchoolDay(addDays(from,Math.round(span*(i+1)/(subs.length+2))));if(d<=end)addExamRecord({id:uid('exam'),subject:sub.name,dateISO:d,minute:540,type:S.age<=11?'Class assessment':i%2?'Quiz':'Midterm',score:null,status:'Scheduled',prep:0})});
 if(gradeNumber()>=6)subs.slice(0,3).forEach((sub,i)=>{const d=nextSchoolDay(addDays(end,-8+i));if(d<=end&&d>currentDate())addExamRecord({id:uid('exam'),subject:sub.name,dateISO:d,minute:540,type:`Semester ${sem} final`,score:null,status:'Scheduled',prep:0})});
 spreadExamDates();syncExamCalendar()
}
function scheduleExams(){const a=academicInfo();if(a.semester){scheduleSemesterExams(a.semester);if(S.school){S.school.semExams=S.school.semExams||{};S.school.semExams[a.semester]=true}}}
// ---------- Year rollover, report cards, graduation ----------
function graduateHighSchool(){
 const old=S.school;if(!old)return;closeSchoolYear(old,{leaving:true});recordGraduation('high',old.name);S.education.highSchoolDone=true;S.school=null;
 if(!SIM.skipping){const p=S.people.find(x=>x.role==='parent');log('🎓 High school graduation',`Caps in the air. ${p?`${firstName(p)} cries a little and denies it.`:''} Twelve years of school, done.`,true)}
}
function reportCard(sem){
 const subs=S.school?.subjects||[];if(!subs.length)return null;const avg=Math.round(10*subs.reduce((a,s)=>a+s.score,0)/subs.length)/10,lines=subs.map(s=>`${s.name} ${Math.round(s.score*10)/10}`).join(' • ');
 const parent=S.people.find(x=>x.role==='parent');
 if(avg>=85){if(parent)parent.rel=clamp(parent.rel+2);S.happiness=clamp(S.happiness+3)}else if(avg<60){S.family.tension=clamp(S.family.tension+3);S.stress=clamp(S.stress+3)}
 if(!SIM.skipping)log(`📄 Semester ${sem} report card`,`Average ${avg}. ${lines}. ${avg>=85?`${parent?firstName(parent):'Your family'} puts it on the fridge.`:avg<60?'Your caregivers want to talk about it.':'Solid, with room to grow.'} Behavior ${Math.round(S.school.behavior)}% • attendance ${Math.round(S.school.attendance)}%.`,avg>=90);
 return {avg,dateISO:currentDate()}
}
function ensureSchoolForDate(){
 ensureLifecycleContainers();S.education=Object.assign({graduations:[]},S.education||{});
 if(S.age===3&&!S.development.kindergarten.asked){S.development.kindergarten.asked=true;createPending({type:'kindergarten',title:'Kindergarten decision',resolveDate:null,status:'Waiting for your preference',payload:{preference:null},autoDecideDate:addDays(currentDate(),14),detail:'Your caregivers want to hear whether you want to attend before they decide. If you do not answer, they will decide within two weeks.'});log('Kindergarten becomes a question','Your family starts discussing preschool/kindergarten, childcare, money, schedules and your preferences.')}
 if(S.age<3){S.school=null;return}
 if(S.education.highSchoolDone){if(S.school){closeSchoolYear(S.school,{leaving:true});S.school=null}return}
 const a=academicInfo(),carry=S.school;
 if(carry&&carry.yearKey==null){carry.yearKey=a.key;carry.yearStarted=a.start;if(carry.grade!=='Kindergarten'&&S.education.gradeOffset==null)S.education.gradeOffset=gradeNumber()-baseGradeFor(a.key);return}
 if(carry&&carry.yearKey>=a.key)return;
 const g=gradeForYear(a.key);
 if(g>=13){if(carry&&carry.grade!=='Kindergarten')graduateHighSchool();else{S.school=null;if(S.age>=18)S.education.highSchoolDone=true}return}
 if(g>=1){
  closeSchoolYear(carry);const fromStage=stageOfSchool(carry),toStage=stageForAge(g+5);if(carry&&fromStage&&fromStage!==toStage)recordGraduation(fromStage,carry.name);
  S.school=buildSchool(g+5,carry);S.school.yearKey=a.key;S.school.yearStarted=a.start;S.school.record=freshSchoolRecord();S.school.reports={};S.school.semExams={};
  S.school.clubs.forEach(c=>{ensureClub(c);if(!clubSessionEvent(c))scheduleClubSession(c,nextSchoolDay(addDays(currentDate(),3)))});
  if(a.semester){scheduleExams();if(a.semester===2)S.school.semExams[1]=true}generateHomework(true);ensureProm();
  if(carry&&!SIM.skipping)log(`🎒 New school year • ${S.school.grade}`,`${S.school.name}. ${a.phase==='summer'||a.phase==='semBreak'?'':`Semester ${a.semester||1} starts now.`} New class, new timetable${carry.name!==S.school.name?', new building':''}.`,true);
  meetNewClassmates(chance(60)?2:1,{silent:SIM.skipping});return
 }
 if(carry&&carry.grade==='Kindergarten'){carry.yearKey=a.key;return}
 if(S.development.kindergarten.decision&&S.development.kindergarten.enrolled){S.school=buildSchool(Math.min(5,Math.max(3,S.age)),carry);if(S.school)S.school.yearKey=a.key}else S.school=null
}
function progressSchoolForAge(){ensureSchoolForDate()}
function reconcileSchoolStage(){ensureSchoolForDate();const k=S.development?.kindergarten;if(S.school&&S.school.grade==='Kindergarten'&&!(k?.enrolled))S.school=null}
function academicTick(){
 if(S.age<3)return;const a=academicInfo(),sc=S.school;
 if(needsFormalSchool()&&sc.yearKey===a.key){sc.reports=sc.reports||{};sc.semExams=sc.semExams||{};
  if(!sc.reports[1]&&currentDate()>a.sem1End)sc.reports[1]=reportCard(1);
  if(!sc.reports[2]&&currentDate()>a.end)sc.reports[2]=reportCard(2);
  if(a.semester===2&&!sc.semExams[2]){sc.semExams[2]=true;scheduleSemesterExams(2);if(!SIM.skipping)log('📘 Semester 2 begins',`New semester, new assessments. ${semesterLabel()}.`)}
  if(gradeNumber()===12&&currentDate()>a.end){graduateHighSchool();return}}
 ensureSchoolForDate()
}
// ---------- Calendar markers (planned 2 school years ahead) ----------
function academicMarkers(){
 if(S.age<2||S.education?.highSchoolDone)return [];const cur=academicInfo().key,out=[];
 for(let Y=cur;Y<=cur+2;Y++){const a=academicYear(Y),g=gradeForYear(Y);const kg=g<=0&&S.school?.grade==='Kindergarten';if(!(g>=1&&g<=12)&&!kg)continue;
  const lab=g>=1?gradeLabelFor(g):'Kindergarten';out.push({id:`term-${Y}-start`,dateISO:a.start,title:`First day of school • ${lab}`,icon:'🎒',type:'term'});
  if(g>=1)out.push({id:`term-${Y}-s2`,dateISO:a.sem2Start,title:'Semester 2 begins',icon:'📘',type:'term'});
  for(const b of a.breaks)if(b.from>=a.start&&b.from<=a.end)out.push({id:`brk-${Y}-${b.name}`,dateISO:b.from,title:`${b.name}${b.to!==b.from?` (until ${formatDate(b.to)})`:''}`,icon:'🏖️',type:'term'});
  out.push({id:`term-${Y}-end`,dateISO:a.end,title:g===12?'High school graduation day':'Last day of school',icon:g===12?'🎓':'🏁',type:'term'});
  if(g>=8&&g<=12&&!(S.school?.prom&&S.school.prom.year===Y))out.push({id:`prom-plan-${Y}`,dateISO:promDateFor(Y),title:`${g<=9?'Junior Prom':'Prom'} (planned)`,icon:'💃',type:'term'})}
 return out
}
// ---------- Meeting new people (0–2 at a time) ----------
function peerAgeOK(n){const a=npcAge(n);return S.age<18?(a>=Math.max(4,S.age-2)&&a<=S.age+2&&a<18):a>=18&&Math.abs(a-S.age)<=10}
function freshPeers(k){const known=new Set(S.people.map(p=>p.npcId).filter(Boolean)),pool=(S.npcs||[]).filter(n=>!known.has(n.id)&&peerAgeOK(n)&&!n.movedAway).sort(()=>Math.random()-.5);while(pool.length<k){const made=generateHousehold({kids:1,childAge:S.age<18?S.age+rand([-1,0,1]):S.age+rand([-4,-2,0,2,4])});pool.push(...made.filter(peerAgeOK))}return pool.slice(0,k)}
function meetNewClassmates(k,{silent=false}={}){if(S.age<6)return;for(const n of freshPeers(k)){const p=personFromNpc(n,'friend','classmate');p.rel=40;p.knownSince=S.age;S.people.push(p);if(!silent)rememberPerson(p,'You met on the first day of the school year.')}}
function meetNewPeople(where){
 if(S.age<6||SIM.skipping)return;const r=Math.random(),crowd=S.people.filter(p=>!isFamilyPerson(p)).length,k=r<(crowd>=30?.06:.15)?2:r<(crowd>=30?.3:.55)?1:0;if(!k)return;
 const ns=freshPeers(k),line=ns.map(n=>`${n.fullName} (${npcAge(n)})`).join(' and ');
 queueEvent({type:'meetPeople',title:k===2?'You meet two new people':'You meet someone new',text:`At ${where} you get talking with ${line}.`,payload:{npcIds:ns.map(n=>n.id),where},priority:2,expiresDays:1,choices:[...ns.map(n=>({id:'chat:'+n.id,label:`Chat with ${n.firstName}`})),{id:'hi',label:k===2?'Say hi to both':'Say hi'},{id:'skip',label:'Keep to yourself'}]})
}
function handleMeetPeople(e,id){
 const ids=e.payload?.npcIds||[],where=e.payload?.where||'there';if(id==='skip'){log('Kept to yourself',`You smile politely and keep to yourself at ${where}.`);return true}
 const add=(nid,rel)=>{const n=npcById(nid);if(!n)return null;let p=S.people.find(x=>x.npcId===nid);if(!p){p=personFromNpc(n,'friend',`met at ${where}`);p.rel=rel;p.knownSince=S.age;S.people.push(p)}else p.rel=clamp(p.rel+3);rememberPerson(p,`You met at ${where}.`,2);return p};
 if(id==='hi'){const ps=ids.map(x=>add(x,36)).filter(Boolean);log('New acquaintances',`You say hi to ${ps.map(firstName).join(' and ')}. Maybe you will see them again.`);return true}
 const nid=id.slice(5),p=add(nid,47);if(!p)return true;p.trust=clamp(p.trust+3);advanceTime(30,{silent:true});S.needs.social=clamp(S.needs.social+8);
 const tr=p.traits||[],shared=tr.includes('Funny')?'they make you laugh twice in five minutes':tr.includes('Curious')?'they ask surprisingly good questions':tr.includes('Sporty')?'you end up talking about sports for ages':tr.includes('Artsy')?'they show you a drawing on their phone':'the conversation is easy';
 log(`Met ${firstName(p)}`,`You chat with ${p.name} at ${where} — ${shared}. You leave knowing each other's names, and maybe a bit more.`);return true
}

// ---------- UI helpers ----------
function pendingOpen(){return S.pendingDecisions.filter(x=>!x.resolved)}
function unreadMessages(){return canUsePhone()?S.messages.filter(x=>!x.read).length:0}
function navItems(){const a=[['home','🏠','My Life'],['places','🧭','Daily Life'],['people','👥',S.age<6?'People & Play':'People']];if(S.age<=7)a.push(['development','🌱','Growing Up']);if(S.school)a.push(['school','📚','Education']);if(S.age>=5)a.push(['business','💰','Money & Items']);if(S.age>=D.ageRules.phone)a.push(['phone','📱','Phone']);a.push(['family',S.age>=13?'❤️':'👨‍👩‍👧',S.age>=13?'Family & Relationships':'Family']);if(S.age>=D.ageRules.partTimeWork)a.push(['career','💼',S.age>=60?'Work & Retirement':'Work & Career']);if(S.age>=18)a.push(['health','🩺','Health']);a.push(['calendar','🗓️','Calendar'],['world','🌍','World & Journal']);return a}
function needDisplayValue(k,v){return Math.round(['hunger','toilet'].includes(k)?100-v:v)}
function needAction(k){return k==='hunger'?'eat':k==='toilet'?'toilet':k==='hygiene'?'shower':k==='sleep'?'sleep':k==='fun'?'game':k==='social'?'people':'rest'}
function renderNeeds(){
 const host=$('needs-hud');if(!host)return;
 const labels={hunger:'Hunger',hygiene:'Hygiene',toilet:'Toilet',fun:'Fun',social:'Social',comfort:'Comfort',sleep:'Sleep'};
 host.innerHTML=Object.entries(S.needs).map(([k,v])=>{const value=needDisplayValue(k,v),danger=value<=25;return `<button class="need-compact ${danger?'need-danger':''}" data-need="${k}" title="${esc(labels[k]||k)}: ${value}/100"><span>${needIcon(k)} <em>${esc(labels[k]||k)}</em></span><b>${value}</b><i><em style="width:${value}%"></em></i></button>`}).join('');
 const w=[];if(S.needs.hunger>65)w.push('Food');if(S.needs.sleep<40)w.push('Rest');if(S.needs.fun<50)w.push(S.age<8?'Play':'Something fun');if(S.needs.social<45)w.push(S.age<6?'Caregiver attention':'See someone');if(S.age>=12&&!S.phone.owned)w.push('A phone');$('wants-hud').innerHTML=(w.slice(0,3).map(x=>`<span class="want-pill">${esc(x)}</span>`).join('')||'<span class="muted-text">Content for now</span>')
}
function renderHeader(){if(!S)return;$('life-name').textContent=S.name;$('life-subtitle').textContent=`${lifeStage()} • Age ${S.age} • ${formatDate(currentDate())} • ${timeLabel(currentMinute())} • ${S.place}`;$('s-age').textContent=S.age;$('s-money').textContent=money(S.money);$('s-health').textContent=Math.round(S.health);$('s-happy').textContent=Math.round(S.happiness);$('s-energy').textContent=Math.round(S.energy);$('s-stress').textContent=Math.round(S.stress);$('s-luck').textContent=Math.round(S.luck)+'%';$('s-mentality').textContent=S.mentality;$('i-place').textContent=S.place;$('i-dob').textContent=formatDate(S.dob);$('i-zodiac').textContent=S.zodiac;$('i-family').textContent=S.wealth;$('event-meta').textContent=`${weekday().toUpperCase()} • ${timeLabel(currentMinute())} • ${weatherIcon(S.weather.type)} ${S.weather.type.toUpperCase()}`;renderHero();renderNeeds();renderUpcomingCompact();const nav=navItems();if(!nav.some(x=>x[0]===active))active='home';$('tabs').innerHTML=nav.map(x=>`<button class="side-link ${active===x[0]?'active':''}" data-tab="${x[0]}"><span>${icon(NAV_ICON[x[0]]||'dot')}</span><b>${x[2]}</b></button>`).join('')}
function actionButton(id,title,small,arg=''){return `<button class="action" data-act="${id}" ${arg!==''?`data-arg="${esc(arg)}"`:''}><strong>${title}</strong><small>${small}</small></button>`}
function statRow(label,value){return `<div class="row"><span>${label}</span><b>${value}</b></div>`}

function careCards(){return `<div class="action-section"><h3>Care</h3><div class="action-grid">${actionButton('eat','🍽️ Eat',S.age<=1?'Caregiver feeding':S.age<=4?'Eat with help / practice':'Meal')}${actionButton('snack','🍎 Snack','A smaller amount of food')}${actionButton('drink','💧 Drink water','Hydration and comfort')}${actionButton('toilet','🚽 '+(S.age<=1?'Caregiver toileting':S.age<=4?'Potty / toilet':'Use bathroom'),'Age-appropriate bathroom care')}${actionButton('shower','🚿 '+(S.age<=3?'Bath with caregiver':S.age<=7?'Wash with supervision':'Shower'),'Restore hygiene')}${actionButton('brush','🪥 Brush teeth','5–10 minutes')}${actionButton('washHands','🧼 Wash hands','Quick hygiene')}${actionButton('dress','👕 Get dressed',S.age<=7?'Help depends on development':'Choose clothes')}${actionButton('sleep','😴 Sleep','Full sleep based on age')}${actionButton('nap','🛏️ Nap','Shorter recovery')}${actionButton('rest','🫖 Rest','30-minute recovery')}</div></div>`}
function personalCards(){
 const age=S.age,a=[];
 if(age<=1){
  a.push(actionButton('babyPlay','🧸 Sensory play','Toys, faces, sounds and caregiver interaction'));
  a.push(actionButton('story','📚 Story time','A caregiver reads and talks through a book'));
  a.push(actionButton('radioMusic','📻 Listen to music','Caregiver turns on the radio • no screen'));
  a.push(actionButton('babble','🗣️ Babble / interact','Practice communication with a caregiver'));
  return `<div class="action-section"><h3>Play & bonding</h3><p class="muted-text">Infants do not independently read, journal or use screens. Activities happen through play and caregivers.</p><div class="action-grid">${a.join('')}</div></div>`
 }
 if(age<=4){
  a.push(actionButton('toyPlay','🧸 Play with toys','Age-appropriate play and imagination'));
  a.push(actionButton('story','📚 Picture book with caregiver','Shared reading, words and pictures'));
  if(age>=2)a.push(actionButton('draw','🖍️ Scribble / simple art','Motor and creative practice'));
  a.push(actionButton('radioMusic','📻 Radio music','Listen without screen time'));
  a.push(actionButton('babble','💬 Talk / ask questions','Build communication'));
  if(S.homeAmenities.tv)a.push(actionButton('tv','📺 '+accessStatus('tv','watch TV'),'Short caregiver-approved screen time'));
  a.push(actionButton('familyMeal','🥣 Eat with family','Food + family interaction'));
  return `<div class="action-section"><h3>Play & discovery</h3><p class="muted-text">Toddlers do not get independent reading, journaling, phone or computer actions. Screen time requires caregiver permission.</p><div class="action-grid">${a.join('')}</div></div>`
 }
 a.push(actionButton('read',age<8?'📖 Read with help':'📖 Read',age<8?'Early reading skill':'Quiet hobby and stress relief'));
 a.push(actionButton('radioMusic','📻 Radio music','Music without a screen'));
 if(canUnderstandRadioNews())a.push(actionButton('radioNews','📰 Radio news','Only available once communication is developed enough'));
 a.push(actionButton('draw','🎨 Draw / create','Creative growth'));
 if(age>=6)a.push(actionButton('journal',age<8?'📔 Picture journal':'✍️ Journal',age<8?'Pictures and a few words':'Process thoughts'));
 if(S.homeAmenities.tv)a.push(actionButton('tv','📺 '+accessStatus('tv','watch TV'),age<18?'Caregiver permission is checked':'Relax'));
 if(S.homeAmenities.sharedComputer)a.push(actionButton('computer','💻 '+accessStatus('sharedDevice','use computer'),age<18?'Shared electronics require permission':'Computer access'));
 a.push(actionButton('game','🎲 Play / games',age<8?'Toys, board games and recreation':'Recreation; owned consoles use electronic permission'));
 if(age>=4)a.push(actionButton('exercise','🏃 Exercise','Age-appropriate movement'));
 if(age>=D.ageRules.cookingHelp)a.push(actionButton('cook','🍳 '+(age<18?accessStatus('stove',age<13?'cook with caregiver':'use stove / cook'):'Cook'),age<13?'Supervised kitchen practice':age<18?'Caregiver permission is checked':'Cooking skill and food'));
 a.push(actionButton('familyMeal','🥣 Eat with family','Food + family interaction'));
 return `<div class="action-section"><h3>Personal</h3><p class="muted-text">Reading, journaling and devices unlock by development. Household electronics and the stove require caregiver permission while you are a minor.</p><div class="action-grid">${a.join('')}</div></div>`
}




function phonePanel(){if(S.age<D.ageRules.phone)return `<div class="dashboard"><section class="card wide"><h3>📱 Phone milestone</h3><p class="locked-note">${esc(phoneLockReason())}</p><p>You can still save money and ask for phones in <b>Money & Items</b>. Owning a phone early does not grant unrestricted smartphone access early.</p><button data-tab-jump="business">Go to phones & shopping</button></section></div>`;if(!S.phone.owned)return `<div class="dashboard"><section class="card wide"><h3>📱 You don't own a phone yet</h3><p class="muted-text">Browse used, standard and flagship phones in Money & Items. You can save, ask caregivers, or request one for a future occasion.</p><button data-tab-jump="business">Browse phones</button></section></div>`;syncPhoneState();const all=['Messages','Calls','Camera','Photos','Social media','Music','Games','Maps','Shopping','School portal','Food delivery','Transport','Job finder','Banking','Dating'];return `<div class="dashboard"><section class="card wide"><div class="section-heading"><div><h3>📱 ${esc(S.phone.model)}</h3><p class="muted-text">Condition ${Math.round(S.phone.condition)}% (${conditionLabel(S.phone.condition)}) • Battery ${S.phone.battery??100}% • ${unreadMessages()} unread messages • ${esc(S.age<18?(dailyAccess().phone?'caregiver phone permission approved today':'caregiver permission required today'):'independent access')}</p></div><div class="inline-actions"><button class="small ghost" data-item-action="charge" data-item-id="${S.phone.activeItemId}">Charge</button>${phoneItems().length>1?`<button class="small ghost" data-tab-jump="business">Switch phone (${phoneItems().length-1} spare)</button>`:''}<span class="tag ok">In use</span></div></div><div class="phone-grid">${all.map(name=>{const internal=name==='Social media'?'Social':name,unlocked=S.phone.appsUnlocked.includes(name)||name==='Social media'&&S.age>=15,reason=name==='Dating'?'18+':name==='Job finder'?'16+':'Age/ownership rules';return unlocked?`<button class="phone-app" data-phone-app="${esc(internal)}"><b>${esc(name)}</b><small>Open</small></button>`:`<button class="phone-app locked" disabled><b>${esc(name)}</b><small>🔒 ${reason}</small></button>`}).join('')}</div></section><section class="card"><h3>Online presence</h3>${statRow('Followers',S.social.followers)}${statRow('Posts',S.social.posts)}${statRow('Reputation',Math.round(S.social.reputation)+'%')}${statRow('Fame',Math.round(S.social.fame)+'%')}<button data-act="socialPost">Post / interact</button></section><section class="card"><h3>Recent messages</h3>${S.messages.slice(0,5).map(m=>`<div class="row"><span>${esc(m.from)}</span><b>${m.read?'Read':'Unread'}</b></div>`).join('')||'<p class="muted-text">No messages yet.</p>'}</section></div>`}

function familyPanel(){const caregivers=S.people.filter(p=>['parent','grandparent'].includes(p.role));const romance=S.age>=13?`<section class="card"><h3>${S.age<16?'Crushes & close bonds':'Romance'}</h3>${statRow('Status',esc(S.romance.status))}${S.romance.partner?statRow('Partner / interest',esc(S.romance.partner)):''}<p class="muted-text">Use individual People interactions for age-appropriate romantic choices. Dating apps remain adult-only.</p></section>`:'';return `<div class="dashboard"><section class="card"><h3>Family dynamics</h3>${statRow('Closeness',Math.round(S.family.closeness)+'%')}${statRow('Tension',Math.round(S.family.tension)+'%')}${statRow('Responsibility',Math.round(S.family.responsibility)+'%')}${statRow('Household strictness',Math.round(familyRules().strictness)+'%')}${statRow('Generosity',Math.round(familyRules().generosity)+'%')}<button data-act="familyTalk">${S.age<3?'Connect with caregiver':S.age<6?'Talk / express yourself':'Have a real conversation'}</button></section><section class="card"><h3>Caregivers</h3>${caregivers.map(p=>`<div class="row"><span>${esc(p.name)}<br><small>${esc((p.traits||[]).join(', '))}</small></span><b>${Math.round(p.rel)}</b></div>`).join('')}</section>${romance}<section class="card wide"><h3>Family events & memories</h3>${S.familyEvents.slice(0,8).map(e=>`<div class="row"><span>${esc(e.text)}</span><small>${e.dateISO?formatDate(e.dateISO):'Age '+S.age}</small></div>`).join('')||'<p class="muted-text">No recent special family event.</p>'}</section></div>`}


function careerPanel(){const job=S.career.job,pool=jobPool();return `<div class="dashboard"><section class="card"><h3>${S.age>=60?'Work & retirement':'Career / part-time work'}</h3>${job?`${statRow('Role',esc(job.title))}${statRow('Pay',money(job.pay)+'/hr')}${statRow('Performance',Math.round(S.career.performance)+'%')}${statRow('Manager',esc(job.manager||'—'))}<div class="inline-actions"><button data-act="workShift">Work shift</button><button class="ghost" data-act="careerSkill">Build skill</button><button class="ghost" data-act="quitJob">Quit</button></div>`:`<p class="muted-text">${S.age<18?'Part-time jobs can fit around school.':'Applications can lead to interviews/offers after a delay.'}</p><div class="job-grid">${pool.map(j=>`<button class="job-card" data-job="${j.id}"><b>${esc(j.title)}</b><small>${money(j.pay)}/hr • ${j.hours}h shift</small></button>`).join('')}</div>`}${S.age>=60?`<button data-act="retire">${S.career.retired?'Retired':'Retire'}</button>`:''}</section><section class="card"><h3>Career profile</h3>${statRow('General skill',S.career.skills)}${statRow('Reputation',Math.round(S.career.reputation)+'%')}${statRow('Retired',S.career.retired?'Yes':'No')}<button data-act="careerSkill">Practice a career skill</button></section></div>`}

function healthPanel(){return `<div class="dashboard"><section class="card"><h3>Health</h3>${statRow('Overall',Math.round(S.health)+'%')}${statRow('Fitness',Math.round(S.healthState.fitness)+'%')}${statRow('Sleep quality',Math.round(S.healthState.sleep)+'%')}${statRow('Current issue',esc(S.healthState.illness||'None'))}</section><section class="card"><h3>Care</h3><div class="action-grid">${actionButton('healthCheck','🩺 Checkup',S.age<18?'Caregiver/household handles access':'Costs $25')}${actionButton('mentalCare','🧠 Mental wellbeing','Stress support')}${actionButton('exercise','🏃 Exercise','Fitness and stress')}</div></section></div>`}



function renderPanel(){let html;switch(active){case'places':html=placesPanel();break;case'people':html=peoplePanel();break;case'school':html=schoolPanel();break;case'business':html=businessPanel();break;case'phone':html=phonePanel();break;case'family':html=familyPanel();break;case'development':html=developmentPanel();break;case'career':html=careerPanel();break;case'health':html=healthPanel();break;case'calendar':html=calendarPanel();break;case'world':html=worldPanel();break;default:html=homePanel()}$('panel-host').innerHTML=html;applySubTabs()}
function render(){if(!S)return;renderHeader();renderPanel();renderLog();renderPlanner()}

// ---------- Holidays ----------

// ---------- Modal / focused interaction UI ----------
function openModal(title,html){modalContext={title};$('choice-title').textContent=title;$('choice-content').innerHTML=html;$('choice-overlay').classList.remove('hidden')}
function closeChoiceModal(){modalContext=null;$('choice-overlay').classList.add('hidden');$('choice-content').innerHTML=''}
function closeAllModals(){$('overlay').classList.add('hidden');closeChoiceModal()}
function openPersonModal(personId){const p=personById(personId);if(!p)return;const romance=(eligibleRomance(p)?`<button data-romance-open="${p.id}">${['dating','partner'].includes(p.romanceStage)?'Romance & dates':'Romance…'}</button>`:'')+(canSneak(p)?`<button data-sneak="meet" data-person-id="${p.id}">Sneak out to meet them</button>${p.id!==S.romance?.partnerId?`<button data-sneak="over" data-person-id="${p.id}">Sneak them over</button>`:''}`:'');const phone=canUsePhone()?`<button data-person-action="message" data-person-id="${p.id}">Message</button><button data-person-action="call" data-person-id="${p.id}">Call</button>`:'';openModal(displayName(p,'formal'),`<div class="modal-stats">${statRow('Closeness',Math.round(p.rel)+'%')}${statRow('Trust',Math.round(p.trust)+'%')}${statRow('Fun',Math.round(p.fun)+'%')}${statRow('Conflict',Math.round(p.conflict)+'%')}</div><p class="muted-text">${esc(p.memory)}</p><div class="modal-action-grid"><button data-person-action="talk" data-person-id="${p.id}">Talk</button><button data-person-action="${S.age<8?'play':'hangout'}" data-person-id="${p.id}">${S.age<8?'Play':'Hang out'}</button>${p.trust>=45?`<button data-person-action="confide" data-person-id="${p.id}">Confide</button>`:''}<button data-person-action="gossip" data-person-id="${p.id}">Gossip</button><button data-person-action="argue" data-person-id="${p.id}">Argue</button>${p.conflict>=5?`<button data-person-action="apologize" data-person-id="${p.id}">Apologize</button>`:''}${phone}${romance}<button data-person-action="giveGift" data-person-id="${p.id}">Give gift</button>${S.age>=6&&!['parent','grandparent'].includes(p.role)?`<button data-plan-open="${p.id}">Make plans</button>`:''}</div><h4>Shared memories</h4><div class="memory-list">${(p.history||[]).slice(0,8).map(h=>`<p><small>${formatDate(h.dateISO||currentDate())} • age ${h.age??S.age}</small>${esc(h.text)}</p>`).join('')||'<p class="muted-text">No detailed memories yet.</p>'}</div>`)}
function openPeopleChooser(action){openModal(action==='call'?'Who do you want to call?':'Choose someone',`<div class="modal-action-grid">${S.people.map(p=>`<button data-person-action="${action}" data-person-id="${p.id}">${esc(p.name)}</button>`).join('')}</div>`)}

// ---------- Start / load / screen lifecycle ----------
function loadLast(){const raw=loadRaw();if(!raw){toast('No autosave found.');return}try{S=JSON.parse(raw);enterGame();toast('Life loaded')}catch(err){console.error('Load failed',err);toast('Autosave is invalid or incompatible.')}}
function importSaveFile(file){if(!file)return;file.text().then(t=>{try{S=JSON.parse(t);enterGame();toast('Save imported')}catch(err){console.error('Import failed',err);toast('Invalid save file')}})}

// ---------- Main event delegation ----------
function handlePanelClick(e){const b=e.target.closest('button');if(!b||!S)return;if(handleLifecycleClick(b))return;if(b.dataset.tabJump){active=b.dataset.tabJump;render();return}if(b.dataset.act){act(b.dataset.act,b.dataset.arg);return}if(b.dataset.place){visitPlace(b.dataset.place);save();render();return}if(b.dataset.personOpen){openPersonModal(b.dataset.personOpen);return}if(b.dataset.earlyLearn){const sub=S.school?.subjects?.find(x=>x.name===b.dataset.earlyLearn);if(sub){sub.score=clamp(sub.score+3);S.needs.fun=clamp(S.needs.fun+7);advanceTime(45);feedback('Learning through play',`${sub.name} development ${Math.round(sub.score)}%`,45);save();render()}return}if(b.dataset.study){studySubject(b.dataset.study,Number(b.dataset.minutes)||60);save();render();return}if(b.dataset.studyFriend){studySubject(b.dataset.studyFriend,60,'friend');save();render();return}if(b.dataset.studyTeacher){studySubject(b.dataset.studyTeacher,30,'teacher');save();render();return}if(b.dataset.homework){doHomework(b.dataset.homework);save();render();return}if(b.dataset.examTake){takeExam(b.dataset.examTake,false);save();render();return}if(b.dataset.examCheat){takeExam(b.dataset.examCheat,true);save();render();return}if(b.dataset.activityJoin){decideActivity(b.dataset.activityJoin,true);save();render();return}if(b.dataset.activityDecline){decideActivity(b.dataset.activityDecline,false);save();render();return}if(b.dataset.clubAction){clubAction(b.dataset.clubAction,b.dataset.kind);save();render();return}if(b.dataset.contestEnter){contestAction(b.dataset.contestEnter,'enter');save();render();return}if(b.dataset.contestDecline){contestAction(b.dataset.contestDecline,'decline');save();render();return}if(b.dataset.contestPractice){contestAction(b.dataset.contestPractice,'practice');save();render();return}if(b.dataset.chore){doChore(b.dataset.chore);save();render();return}if(b.dataset.shopOwn){buyWithOwnMoney(b.dataset.shopOwn);save();render();return}if(b.dataset.shopParent){caregiverRequestOptions(b.dataset.shopParent);save();render();return}if(b.dataset.shopBirthday){requestFutureGift(b.dataset.shopBirthday,'Birthday');save();render();return}if(b.dataset.shopChristmas){requestFutureGift(b.dataset.shopChristmas,'Christmas');save();render();return}if(b.dataset.giftAskagain){const r=S.giftRequests.find(x=>x.id===b.dataset.giftAskagain&&!x.resolved);if(r){r.begging=(r.begging||1)+1;if(r.begging>=3){r.chancePenalty=(r.chancePenalty||0)+4;S.family.tension=clamp(S.family.tension+2)}log('Asked again',`${r.item} is still waiting for ${r.occasion}.`);save();render()}return}if(b.dataset.itemAction){if(b.dataset.itemAction==='gift'){const it=S.inventoryItems.find(x=>x.id===b.dataset.itemId);if(!it)return;openModal(`Give ${it.name} to…`,`<div class="modal-action-grid">${S.people.map(p=>`<button data-gift-item="${it.id}" data-gift-person="${p.id}">${esc(p.name)}</button>`).join('')}</div>`)}else{useInventoryItem(b.dataset.itemId,b.dataset.itemAction);save();render()}return}if(b.dataset.pendingAgain){askAgainPending(b.dataset.pendingAgain);save();render();return}if(b.dataset.phoneApp){if(b.dataset.phoneApp==='Social')socialPost();else phoneApp(b.dataset.phoneApp);save();render();return}if(b.dataset.job){applyForJob(b.dataset.job);save();render();return}if(b.dataset.stallWork){runStall(true);save();render();return}if(b.dataset.stallClose){S.stall.active=false;log('Stand closed','You pack up the stand for now.');save();render();return}if(b.dataset.yard){negotiateYardSale(b.dataset.yard);save();render();return}if(b.dataset.eventId){resolveEventChoice(b.dataset.eventId,b.dataset.eventChoice);return}}
function handleModalClick(e){const b=e.target.closest('button');if(!b||!S)return;if(handleLifecycleClick(b))return;if(b.dataset.personAction){personAction(b.dataset.personId,b.dataset.personAction);save();render();if(b.dataset.personAction!=='giveGift')closeChoiceModal();return}if(b.dataset.giftItem){giveInventoryItem(b.dataset.giftItem,b.dataset.giftPerson);save();render();return}if(b.dataset.messageReply){replyMessage(b.dataset.messageReply);save();render();return}}

$('personality').addEventListener('click',e=>{const b=e.target.closest('[data-chip]');if(!b)return;const v=b.dataset.chip;if(selectedP.includes(v))selectedP=selectedP.filter(x=>x!==v);else if(selectedP.length<5)selectedP.push(v);chips('personality',D.personalities,selectedP)});
$('talents').addEventListener('click',e=>{const b=e.target.closest('[data-chip]');if(!b)return;const v=b.dataset.chip;if(selectedT.includes(v))selectedT=selectedT.filter(x=>x!==v);else if(selectedT.length<5)selectedT.push(v);chips('talents',D.talents,selectedT)});
document.querySelectorAll('.mode').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.mode;document.querySelectorAll('.mode').forEach(x=>x.classList.toggle('active',x===b));if(mode!=='custom')randomize()}));
document.querySelectorAll('[data-random]').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();randomField(b.dataset.random)}));$('random-all').addEventListener('click',randomize);
$('begin').addEventListener('click',()=>{try{$('creator-error').hidden=true;initializeNewLife()}catch(err){console.error('Start-game error',err);$('creator-error').hidden=false;$('creator-error').textContent='Could not start life: '+(err?.message||err)}});
$('load-last').addEventListener('click',loadLast);$('import-btn').addEventListener('click',importFile);$('import-file').addEventListener('change',e=>importSaveFile(e.target.files?.[0]));
$('save').addEventListener('click',()=>{save();toast('Saved')});$('export').addEventListener('click',exportSave);$('pause').addEventListener('click',()=>$('overlay').classList.remove('hidden'));$('close-menu').addEventListener('click',()=>$('overlay').classList.add('hidden'));$('menu-save').addEventListener('click',()=>{save();toast('Saved')});$('menu-export').addEventListener('click',exportSave);$('menu-import').addEventListener('click',importFile);$('menu-new').addEventListener('click',restart);$('close-choice').addEventListener('click',closeChoiceModal);
$('tabs').addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(!b)return;active=b.dataset.tab;render()});$('panel-host').addEventListener('click',handlePanelClick);$('event-actions').addEventListener('click',handlePanelClick);$('choice-content').addEventListener('click',handleModalClick);$('age-up').addEventListener('click',ageUp);$('next-day').addEventListener('click',()=>{nextDay();save();render()});$('log-drawer').addEventListener('toggle',()=>{UI.logOpen=$('log-drawer').open;saveUI()});$('open-journal').addEventListener('click',()=>{if(!S)return;active='world';UI.subTab.world='journal';saveUI();render()});$('planner-btn').addEventListener('click',()=>document.body.classList.toggle('planner-open'));$('clear-log').addEventListener('click',()=>{if(!S)return;if(confirm('Clear the visible life log? Important milestones remain in the journal.')){S.log=[];save();render()}});
$('needs-hud').addEventListener('click',e=>{const b=e.target.closest('[data-need]');if(!b||!S)return;const k=b.dataset.need;if(k==='social'){active='people';render()}else if(k==='comfort'){active='places';render()}else act(needAction(k))});
$('choice-overlay').addEventListener('click',e=>{if(e.target===$('choice-overlay'))closeChoiceModal()});document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;if(!$('choice-overlay').classList.contains('hidden'))closeChoiceModal();else $('overlay').classList.toggle('hidden')});
$('panel-host').addEventListener('change',()=>{});
$('panel-host').addEventListener('click',e=>{if(e.target.id==='open-stand'){startConfiguredStand({product:$('stand-product').value,price:$('stand-price').value,stock:$('stand-stock').value,location:$('stand-location').value,hours:$('stand-hours').value,quality:$('stand-quality').value,signQuality:$('stand-sign').value,exaggeration:$('stand-exaggeration').value,parentHelp:$('stand-parent-help').checked});save();render()}else if(e.target.id==='open-yard'){startYardSale($('yard-item').value,$('yard-price').value);save();render()}});

setInterval(()=>{if(S)save()},45000);
chips('personality',D.personalities,selectedP);chips('talents',D.talents,selectedT);

// Safe test hook used by QC. It does not alter normal gameplay unless called explicitly.
window.__LIFE_SIM_TEST__={
 getState:()=>S?JSON.parse(JSON.stringify(S)):null,
 setAge:(age)=>{if(!S)return;age=Math.max(0,Math.min(100,Number(age)||0));S.age=age;const b=parseISO(S.dob);b.setUTCFullYear(b.getUTCFullYear()+age);S.clock.dateISO=isoDate(b);S.clock.minute=480;addStagePeople();progressSchoolForAge();ensurePhoneApps();reconcileState('test');render();save()},
 setNeed:(k,v)=>{if(S&&k in S.needs){S.needs[k]=clamp(v);render()}},
 setMoney:(cash=0,savings=0,parentSavings=0)=>{if(!S)return;S.money=Math.max(0,Number(cash)||0);S.finance.savings=Math.max(0,Number(savings)||0);S.finance.parentSavings=Math.max(0,Number(parentSavings)||0);render();save()},
 setFamilyRules:(patch={})=>{if(!S)return;Object.assign(S.family.rules,patch);render();save()},
 grantItem:(key)=>{if(!S||!catalogItem(key))return null;const it=addItem(key,'QC grant');render();save();return it?.id||null},
 requestItem:(key)=>{caregiverRequestOptions(key);render();save()},
 buyItem:(key,qty=1)=>{buyWithOwnMoney(key,qty);render();save()},
 requestGift:(key,occasion)=>{requestFutureGift(key,occasion);render();save()},
 canUsePhone:()=>canUsePhone(),
 action:(id,arg)=>act(id,arg),
 advanceDays:(n,quiet=false)=>{advanceTime(Math.max(0,Number(n)||0)*1440,{skipNeeds:true,silent:true,skipRoutine:!!quiet});render();save()},
 openTab:(tab)=>{active=tab;render()},
 saveNow:()=>save(),
 migrate:()=>migrate(),
 loadState:(obj)=>{S=JSON.parse(JSON.stringify(obj));enterGame();return true},
 mutate:(code)=>{new Function('S',code)(S);render();save();return true},
 setClock:(dateISO,minute)=>{if(!S)return;if(dateISO)S.clock.dateISO=dateISO;if(minute!=null)S.clock.minute=Number(minute);reconcileState('test');render();save()},
 advanceMinutes:(n)=>{advanceTime(Number(n)||0,{silent:true});render();save()},
 nextDay:(force=false)=>{nextDay(!!force);render();save()},
 ageUp:()=>ageUp(),
 takeExam:(id,cheat=false)=>{takeExam(id,!!cheat);render();save()},
 attendSchool:()=>{attendSchool();render();save()},
 doHomework:(name)=>{doHomework(name);render();save()},
 clubAttend:(id)=>{attendClubSession(id);render();save()},
 clubSkip:(id)=>{skipClubSession(id);render();save()},
 clubExcuse:(id)=>{excuseClubSession(id);render();save()},
 contestAttend:(id)=>{attendContest(id);render();save()},
 eventChoice:(id,choice)=>resolveEventChoice(id,choice),
 reconcile:()=>{reconcileState('test');render();save()},
 todayWarnings:()=>todayWarnings(),
 call:(name,...args)=>{const f={meetNewPeople,semesterLabel,academicMarkers,neighborPromCandidates,academicInfo:(d)=>academicInfo(d),romanceAction:(id,k)=>romanceAction(personById(id),k),startDate,sceneChoice,askToProm,promPrep,setPromPlan,attendProm,ensureProm,promTick,npcAsksToProm:(id)=>npcAsksToProm(personById(id)),neighborhoodTick,sneakOut,giveInventoryItem,maybeRival,groupTick,npcAgencyTick,eligibleRomance:(id)=>eligibleRomance(personById(id)),ensureRomanceProfile:(id)=>ensureRomanceProfile(personById(id)),makePlan,attendPlan,cancelPlan,npcInvitesPlayer:(id)=>npcInvitesPlayer(personById(id)),practiceForTryout,attendTryout,signUpForActivity,campaignAction,startElection,decideElection:(id)=>decideElection(S.elections.find(e=>e.id===id)),generateHousehold,npcStatusAt:(id,d,m)=>npcStatusAt(personById(id),d,m),ensureRoster,retryTryout,joinRecreational,personAction,exploreSchoolActivity,answerMaybe,schoolIdentities,skipToDismissal,classAction,lunchAction,leaveSchoolEarly,doHolidayActivity,holidaysOn,upcomingHolidays,lunarNewYearDate,easterDate,agendaFor,performItemUse,eatPortion,drinkFromContainer,refillContainer,toggleWear,repairItem,chargeDevice,useInventoryItem,drainActivePhone,giveInventoryItem,itemDailyTick,addItem,addExamRecord,activateClub,registerContest,ensureSchoolDayObligation,nextSchoolDay,isSchoolDay,queueEvent,closeChoiceModal,setKindergartenPreference,exploreSchoolActivity,exploreSchoolEvent,generateHomework,contestAction,decideActivity}[name];if(!f)throw new Error('Unknown test function '+name);const r=f(...args);render();save();return r===undefined?null:JSON.parse(JSON.stringify(r))}
};

if(new URLSearchParams(location.search).get('smoke')==='1')setTimeout(()=>{try{$('c-name').value='Smoke Test';initializeNewLife();document.body.dataset.smoke=(!$('game').classList.contains('hidden')&&S)?'pass':'fail'}catch(e){console.error(e);document.body.dataset.smoke='fail';document.body.dataset.smokeError=e.message}},30);

})();
