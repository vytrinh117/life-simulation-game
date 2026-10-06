
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
  {id:'friends',main:true,label:'Hang out with friends instead',minAge:12,minutes:120,on:true,fx:{fun:12,social:14},rel:{target:'friend',amount:3},text:['No romance required: pizza, bad movies and a lot of laughing.']},
  {id:'coupleDate',main:true,label:'Valentine date with your partner',minAge:13,minutes:0,on:true,scene:'date',text:[]},
  {id:'cardPartner',label:'Exchange cards with your partner',minAge:13,minutes:20,on:true,needsPartner:true,fx:{happiness:6},text:['You both pretend not to care about the cards, then read them three times.']},
  {id:'singles',main:true,label:'Go to a singles mixer',minAge:18,minutes:150,on:true,cost:15,meet:true,fx:{fun:8,social:12},text:['Name tags, awkward icebreakers, and one genuinely fun conversation.']},
  {id:'self',main:true,label:'Treat yourself',minAge:16,minutes:60,on:true,cost:12,fx:{happiness:5,stress:-5},text:['A quiet evening, your favorite food and zero expectations.']}]},
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
function relTarget(kind){if(kind==='mother')return familyByRelation('mother')||S.people.find(p=>p.role==='parent');if(kind==='father')return familyByRelation('father')||S.people.find(p=>p.role==='parent');if(kind==='friend')return bestNonFamily();return null}
function doHolidayActivity(key,arg){
 const [hid,aid]=String(key).split(':'),x=holidayWindow().find(w=>w.h.id===hid);if(!x){toast('That holiday is not happening right now.');return}
 const a=availableActivities(x).find(z=>z.id===aid);if(!a){toast('You already did that, or it is not available now.');return}
 if(atSchool()){toast('You are at school right now.');return}
 if(a.evening&&currentMinute()<960){toast('That happens in the evening.');return}
 if(a.outdoor&&S.weather.type==='Stormy'){toast('A storm cancels outdoor plans today.');return}
 if(a.cost&&S.age>=13){if(!spendOwn(a.cost)){toast(`You need about ${money(a.cost)}.`);return}}
 if(a.jump){S.flags[holidayFlag(x,a)]=true;active=a.jump;log(`${x.h.icon} ${a.label}`,rand(a.text));return}
 if(a.main&&x.h.id==='valentines'){const k=`valMain-${x.year}`;if(S.flags[k]&&S.flags[k]!==a.id){toast(`You already have Valentine's plans: ${x.h.activities.find(z=>z.id===S.flags[k])?.label||'something else'}.`);return}S.flags[k]=a.id}
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
