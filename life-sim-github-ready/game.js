(() => {
"use strict";

const $ = id => document.getElementById(id);
const STORAGE_KEY = "lifeSim_v1_autosave";
const SLOTS_KEY = "lifeSim_v1_slots";
const VERSION = 1;

const personalityList = ["Kind","Ambitious","Curious","Calm","Bold","Funny","Romantic","Practical","Creative","Competitive","Shy","Social","Stubborn","Empathetic","Independent","Adventurous"];
const talentList = ["Music","Writing","Art","Sports","Math","Science","Programming","Business","Languages","Acting","Fashion","Cooking","Photography","Gaming","Leadership","Dance"];
const names = ["Mina","Lena","Sofia","Emma","Ari","Nora","Maya","Iris","Lina","Elena","Avery","Jade","Theo","Noah","Leo","Eli","Kai","Lucas","Julian","Alex"];
const places = ["Ho Chi Minh City, Vietnam","Seoul, South Korea","Tokyo, Japan","London, UK","Paris, France","New York City, USA","Vancouver, Canada","Singapore","Bangkok, Thailand","Sydney, Australia","a small town in northern Spain","a coastal village in Greece","a mountain town in Switzerland","a quiet suburb outside Melbourne"];
const genders = ["Girl","Boy","Non-binary","Other"];
const attractions = ["Men","Women","All genders","Not sure yet","Asexual / romantic"];
const wealth = ["Struggling","Modest","Middle class","Comfortable","Wealthy","Extremely wealthy"];
const homes = ["Warm and stable","Busy but loving","Strict","Chaotic","Quiet","Highly privileged","Unpredictable"];
const zodiac = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];

let S = null;
let selected = { personality: [], talents: [] };
let currentMode = "custom";

function rand(a){ return a[Math.floor(Math.random()*a.length)]; }
function clamp(n,a=0,b=100){ return Math.max(a,Math.min(b,n)); }
function money(n){ return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(n); }
function esc(s){ return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m])); }
function toast(msg){ const t=$("toast"); t.textContent=msg; t.classList.add("show"); setTimeout(()=>t.classList.remove("show"),1800); }

function zodiacFromDate(date){
  if(!date) return rand(zodiac);
  const m=Number(date.slice(5,7)), d=Number(date.slice(8,10));
  if((m==3&&d>=21)||(m==4&&d<=19))return"Aries";
  if((m==4&&d>=20)||(m==5&&d<=20))return"Taurus";
  if((m==5&&d>=21)||(m==6&&d<=20))return"Gemini";
  if((m==6&&d>=21)||(m==7&&d<=22))return"Cancer";
  if((m==7&&d>=23)||(m==8&&d<=22))return"Leo";
  if((m==8&&d>=23)||(m==9&&d<=22))return"Virgo";
  if((m==9&&d>=23)||(m==10&&d<=22))return"Libra";
  if((m==10&&d>=23)||(m==11&&d<=21))return"Scorpio";
  if((m==11&&d>=22)||(m==12&&d<=21))return"Sagittarius";
  if((m==12&&d>=22)||(m==1&&d<=19))return"Capricorn";
  if((m==1&&d>=20)||(m==2&&d<=18))return"Aquarius";
  return"Pisces";
}

function randomDate(){
  const year = 1980 + Math.floor(Math.random()*35);
  const month = String(1+Math.floor(Math.random()*12)).padStart(2,"0");
  const day = String(1+Math.floor(Math.random()*28)).padStart(2,"0");
  return `${year}-${month}-${day}`;
}

function makeChips(){
  $("personality").innerHTML = personalityList.map(x=>`<button class="chip" data-chip="personality" data-value="${esc(x)}">${esc(x)}</button>`).join("");
  $("talents").innerHTML = talentList.map(x=>`<button class="chip" data-chip="talents" data-value="${esc(x)}">${esc(x)}</button>`).join("");
}

function updateChips(){
  document.querySelectorAll(".chip").forEach(c=>{
    c.classList.toggle("selected", selected[c.dataset.chip].includes(c.dataset.value));
  });
}

function pickMany(kind){
  const list = kind==="personality" ? personalityList : talentList;
  const count = 2 + Math.floor(Math.random()*4);
  return [...list].sort(()=>Math.random()-.5).slice(0,count);
}

function fillRandom(field){
  const map = {
    name: ["c-name",rand(names)], dob:["c-dob",randomDate()], place:["c-place",rand(places)],
    zodiac:["c-zodiac",rand(zodiac)], gender:["c-gender",rand(genders)], attraction:["c-attraction",rand(attractions)],
    wealth:["c-wealth",rand(wealth)], home:["c-home",rand(homes)]
  };
  if(!map[field])return;
  $(map[field][0]).value=map[field][1];
  if(field==="dob" && $("c-zodiac").value==="auto"){}
}

function randomAll(){
  Object.keys({name:1,dob:1,place:1,zodiac:1,gender:1,attraction:1,wealth:1,home:1}).forEach(fillRandom);
  selected.personality=pickMany("personality");
  selected.talents=pickMany("talents");
  updateChips();
  toast("Character randomized.");
}

function readCreator(){
  const dob = $("c-dob").value || randomDate();
  let z = $("c-zodiac").value;
  if(z==="auto") z=zodiacFromDate(dob);
  return {
    name: $("c-name").value.trim() || rand(names),
    dob, place:$("c-place").value.trim() || rand(places), zodiac:z,
    gender:$("c-gender").value, attraction:$("c-attraction").value,
    wealth:$("c-wealth").value, home:$("c-home").value,
    personality:[...selected.personality], talents:[...selected.talents]
  };
}

function familyMoney(w){
  return ({Struggling:800,Modest:3500,"Middle class":12000,Comfortable:35000,Wealthy:180000,"Extremely wealthy":1000000}[w]||12000);
}

function peopleInit(c){
  const mother = rand(["Maya","Anna","Sofia","Nina","Elena","Grace"])+" (mother)";
  const father = rand(["Daniel","David","Michael","James","Alex","Leo"])+" (father)";
  const siblingChance = Math.random();
  const people = [
    {id:"mom",name:mother,role:"Parent",closeness:75,history:[]},
    {id:"dad",name:father,role:"Parent",closeness:72,history:[]}
  ];
  if(siblingChance>.25) people.push({id:"sib",name:rand(["Lily","Noah","Mia","Evan","Sora","Max"]),role:"Sibling",closeness:60,history:[]});
  return people;
}

function logEvent(title,text){
  if(!S) return;
  S.log.unshift({day:S.day,title,text});
  S.log=S.log.slice(0,150);
}

function save(){
  if(!S)return false;
  S.updatedAt=new Date().toISOString();
  localStorage.setItem(STORAGE_KEY,JSON.stringify(S));
  $("save-status").textContent="Saved "+new Date().toLocaleTimeString();
  return true;
}

function saveSlot(slot){
  if(!S)return;
  const slots=JSON.parse(localStorage.getItem(SLOTS_KEY)||"{}");
  slots[slot]=S;
  localStorage.setItem(SLOTS_KEY,JSON.stringify(slots));
  toast(`Save slot ${slot} updated.`);
  save();
}

function loadSave(data){
  if(!data || data.version!==VERSION || !data.character) throw new Error("This save is not compatible with this version.");
  S=JSON.parse(JSON.stringify(data));
  renderGame();
  $("creator").classList.add("hidden"); $("game").classList.remove("hidden");
  toast("Save loaded.");
}

function startGame(){
  try{
    const c=readCreator();
    S={
      version:VERSION, character:c, age:0, day:1, year:0, money:familyMoney(c.wealth),
      health:100, happiness:70, energy:100, stress:10, school:{grade:null,gpa:null},
      people:peopleInit(c), log:[], flags:{}, updatedAt:null
    };
    logEvent("Born",`You were born in ${c.place}. Your family is ${c.wealth.toLowerCase()}.`);
    logEvent("A new story begins",`Your zodiac is ${c.zodiac}. Some traits may subtly shape your tendencies, but nothing determines your fate.`);
    save();
    renderGame();
    $("creator").classList.add("hidden");
    $("game").classList.remove("hidden");
    $("overlay").classList.add("hidden");
    window.scrollTo(0,0);
    toast("Your life has begun.");
  }catch(err){
    $("creator-error").hidden=false;
    $("creator-error").textContent="The game couldn't start: "+err.message;
    console.error(err);
  }
}

function familyText(){
  return S.character.wealth;
}

function renderGame(){
  const c=S.character;
  $("life-name").textContent=c.name;
  $("life-subtitle").textContent=`Age ${S.age} • ${c.gender} • ${c.zodiac}`;
  $("s-age").textContent=S.age;
  $("s-money").textContent=money(S.money);
  $("s-health").textContent=Math.round(S.health);
  $("s-happy").textContent=Math.round(S.happiness);
  $("s-energy").textContent=Math.round(S.energy);
  $("s-stress").textContent=Math.round(S.stress);
  $("i-place").textContent=c.place;
  $("i-dob").textContent=c.dob;
  $("i-zodiac").textContent=c.zodiac;
  $("i-family").textContent=familyText();

  $("people").innerHTML=S.people.map(p=>`<div class="person"><b>${esc(p.name)}</b><small>${esc(p.role)} • closeness ${p.closeness}</small></div>`).join("");
  const last=S.log[0]||{title:"Your story begins.",text:""};
  $("event-meta").textContent=`AGE ${S.age} • DAY ${S.day}`;
  $("event-title").textContent=last.title;
  $("event-text").textContent=last.text;
  $("log").innerHTML=S.log.map(e=>`<div class="log-entry"><div class="log-date">DAY ${e.day}</div><b>${esc(e.title)}</b><p>${esc(e.text)}</p></div>`).join("");

  renderActions();
}

function advance(days=1){
  for(let i=0;i<days;i++){
    S.day++;
    S.energy=clamp(S.energy+8);
    S.stress=clamp(S.stress-2);
    if(S.day%365===0){
      S.age++;
      S.year++;
      S.energy=100;
      S.happiness=clamp(S.happiness+4);
      birthday();
    }
    randomWorldTick();
  }
  save();
  renderGame();
}

function birthday(){
  const age=S.age;
  const birthdayEvents = {
    1:"You are learning to walk, speak, and understand the people around you.",
    5:"Your personality is becoming clearer. Small childhood friendships start to matter.",
    6:"School begins. There are teachers, classmates, homework and an entirely new social world.",
    13:"Your teenage years begin. Friendships, identity and emotions become more complicated.",
    16:"More independence is possible now. Depending on where you live, part-time work may be available.",
    18:"Adulthood opens a new set of choices: study, work, travel, relationships and independence.",
    21:"You are settling into adult life. The choices you make now can echo for years.",
    30:"A new decade. Careers, relationships, money and identity may all be changing.",
    40:"Life is becoming less about proving yourself and more about deciding what matters.",
    50:"You look back on choices that once felt small.",
    60:"Retirement, family, health and long-term plans begin to take a different shape.",
    70:"Old friends, memories and family history become increasingly meaningful."
  };
  logEvent(`Birthday — age ${age}`, birthdayEvents[age] || `You turn ${age}. Another year of life has passed, with possibilities you cannot yet see.`);
}

function randomWorldTick(){
  const r=Math.random();
  if(r<.012 && S.age>=6){
    const events=[
      ["A new person enters your orbit",`Someone named ${rand(names)} starts appearing around your school, neighborhood or work.`],
      ["A small coincidence",`A completely ordinary choice puts you in the right place at an unexpected moment.`],
      ["Nothing dramatic happens","Today is simply an ordinary day. Not every moment needs to become a story."]
    ];
    const e=rand(events); logEvent(e[0],e[1]);
  }
  if(r<.006 && S.age>=16){
    S.money+=Math.floor(Math.random()*500);
    logEvent("Unexpected money", "A small financial opportunity, gift or refund lands in your life.");
  }
}

function action(id){
  if(!S)return;
  const age=S.age;
  if(id==="observe"){ advance(7); return; }
  if(id==="sleep"){ S.energy=clamp(S.energy+35); S.stress=clamp(S.stress-10); advance(1); logEvent("Rest", "You sleep and recover some energy."); renderGame(); return; }
  if(id==="family"){ S.happiness=clamp(S.happiness+6); S.people.forEach(p=>{if(p.role==="Parent")p.closeness=clamp(p.closeness+3,0,100)}); advance(1); logEvent("Family time","You spend time with your family. One small conversation may be remembered for years."); renderGame(); return; }
  if(id==="play"){ S.happiness=clamp(S.happiness+8); S.energy=clamp(S.energy-8); advance(1); logEvent("Play","You play, explore or entertain yourself."); renderGame(); return; }
  if(id==="school"){
    S.happiness=clamp(S.happiness+2); S.energy=clamp(S.energy-12); S.stress=clamp(S.stress+4);
    if(!S.school.grade) S.school.grade=rand(["A","B","B+","A-"]);
    advance(1); logEvent("School","You attend school. Teachers, classmates and your reputation are slowly taking shape."); renderGame(); return;
  }
  if(id==="study"){
    S.energy=clamp(S.energy-15); S.stress=clamp(S.stress+5); S.happiness=clamp(S.happiness-1);
    advance(1); logEvent("Study","You put in extra effort. It may pay off later."); renderGame(); return;
  }
  if(id==="friend"){
    S.happiness=clamp(S.happiness+10); S.energy=clamp(S.energy-8);
    advance(1);
    if(S.age>=6 && !S.flags.childhoodFriend){
      S.flags.childhoodFriend=true;
      const p={id:"friend",name:rand(names),role:"Childhood friend",closeness:70,history:["Met during childhood"]};
      S.people.push(p);
      logEvent("A friendship begins",`${p.name} becomes someone you keep seeing. You don't know yet how important this person will become.`);
    } else logEvent("Time with a friend","You hang out, talk and make another memory together.");
    renderGame(); return;
  }
  if(id==="work"){
    const income=30+Math.floor(Math.random()*120);
    S.money+=income; S.energy=clamp(S.energy-20); S.stress=clamp(S.stress+5);
    advance(1); logEvent("Work",`You work a shift and earn ${money(income)}.`); renderGame(); return;
  }
  if(id==="business"){
    const cost=150;
    if(S.money<cost){toast("You need more money.");return}
    S.money-=cost; S.flags.business=true; S.energy=clamp(S.energy-20); S.stress=clamp(S.stress+8);
    advance(1); logEvent("Business experiment","You spend money on a small business idea. It might become something—or quietly disappear."); renderGame(); return;
  }
  if(id==="travel"){
    const cost=100+Math.floor(Math.random()*600);
    if(S.money<cost){toast(`Travel costs about ${money(cost)} right now.`);return}
    S.money-=cost; S.energy=clamp(S.energy-15); S.happiness=clamp(S.happiness+14);
    advance(3); logEvent("Travel",`You travel somewhere new. Prices, people and opportunities are never completely predictable.`); renderGame(); return;
  }
  if(id==="phone"){
    const chance=Math.random();
    if(chance<.25){S.happiness=clamp(S.happiness+7);logEvent("A message","A message from someone you haven't heard from in a while changes the tone of your day.");}
    else if(chance<.5){S.stress=clamp(S.stress+5);logEvent("Group chat","A conversation gets unexpectedly complicated.");}
    else logEvent("Phone","You scroll through messages, social media and the little digital world surrounding you.");
    advance(1); renderGame(); return;
  }
}

function renderActions(){
  const age=S.age;
  let a=[];
  if(age<5){
    a=[["observe","Observe the world","Let a week pass"],["family","Family time","Bond with the people raising you"],["play","Play","Explore your little world"],["sleep","Sleep","Recover and let time pass"]];
  } else if(age<13){
    a=[["school","Go to school","Classes, teachers and classmates"],["study","Study","Improve your academic habits"],["friend","See a friend","Build memories"],["family","Family time","Talk, eat and spend time together"],["play","Play","Games, hobbies and exploration"],["phone","Check phone","Messages and social world"],["sleep","Sleep","Recover"]];
  } else if(age<16){
    a=[["school","Go to school","Classes, exams and social life"],["study","Study","Assignments and exams"],["friend","See a friend","Friendship, crushes and drama can emerge"],["phone","Check phone","Messages, posts and group chats"],["family","Family time","Family relationships"],["travel","Take a trip","If you can afford it"],["sleep","Sleep","Recover"]];
  } else if(age<18){
    a=[["school","Go to school","Classes, exams and school life"],["study","Study","Grades and opportunities"],["friend","See a friend","Relationships evolve"],["work","Part-time work","Earn money and gain independence"],["phone","Check phone","Social media, dating and messages"],["travel","Travel","Chance encounters happen"],["business","Try a business","Start small"],["sleep","Sleep","Recover"]];
  } else {
    a=[["work","Work","Career, money and coworkers"],["business","Build a business","Risk money for an idea"],["friend","See someone","Friends and relationships"],["phone","Check phone","Messages, social media and opportunities"],["travel","Travel","Go somewhere new"],["family","Family time","People you love"],["study","Learn something","Education never has to end"],["sleep","Sleep","Recover"]];
  }
  $("actions").innerHTML=a.map(x=>`<button class="action" data-action="${x[0]}"><strong>${x[1]}</strong><small>${x[2]}</small></button>`).join("");
  $("action-hint").textContent=age===0?"At birth, the world moves around you.":"Every action can create small or lasting consequences.";
}

function openMenu(){ $("overlay").classList.remove("hidden"); }
function closeMenu(){ $("overlay").classList.add("hidden"); }

function exportSave(){
  if(!S)return;
  save();
  const blob=new Blob([JSON.stringify(S,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a"); a.href=url; a.download=`life-sim-${S.character.name.replace(/[^a-z0-9]/gi,"_")}.json`; a.click();
  URL.revokeObjectURL(url); toast("Save exported.");
}

function importSaveFile(){
  $("import-file").click();
}

$("personality").addEventListener("click",e=>{
  const c=e.target.closest(".chip"); if(!c)return;
  const k=c.dataset.chip,v=c.dataset.value,arr=selected[k];
  if(arr.includes(v)) selected[k]=arr.filter(x=>x!==v);
  else if(arr.length<5) arr.push(v);
  else toast("Choose up to 5.");
  updateChips();
});
$("talents").addEventListener("click",e=>{
  const c=e.target.closest(".chip"); if(!c)return;
  const k=c.dataset.chip,v=c.dataset.value,arr=selected[k];
  if(arr.includes(v)) selected[k]=arr.filter(x=>x!==v);
  else if(arr.length<5) arr.push(v);
  else toast("Choose up to 5.");
  updateChips();
});
document.addEventListener("click",e=>{
  const r=e.target.closest("[data-random]"); if(r)fillRandom(r.dataset.random);
  const mode=e.target.closest(".mode");
  if(mode){currentMode=mode.dataset.mode;document.querySelectorAll(".mode").forEach(x=>x.classList.remove("active"));mode.classList.add("active");if(currentMode!=="custom")randomAll();}
  const ac=e.target.closest("[data-action]"); if(ac)action(ac.dataset.action);
});
$("random-all").onclick=randomAll;
$("begin").onclick=startGame;
$("save").onclick=()=>{save();toast("Game saved.");};
$("export").onclick=exportSave;
$("pause").onclick=openMenu;
$("close-menu").onclick=closeMenu;
$("menu-save").onclick=()=>{save();toast("Game saved.");};
$("menu-export").onclick=exportSave;
$("menu-import").onclick=importSaveFile;
$("menu-new").onclick=()=>{
  if(confirm("Start a completely new life? Your current autosave will remain until you overwrite it.")){
    closeMenu(); $("game").classList.add("hidden"); $("creator").classList.remove("hidden"); $("creator-error").hidden=true; window.scrollTo(0,0);
  }
};
$("load-last").onclick=()=>{
  try{
    const data=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null");
    if(!data) return toast("No autosave found.");
    loadSave(data);
  }catch(e){toast("Could not load autosave.");}
};
$("import-file").onchange=async e=>{
  const file=e.target.files[0]; if(!file)return;
  try{loadSave(JSON.parse(await file.text()));}catch(err){toast("Invalid save file.");}
  e.target.value="";
};
$("clear-log").onclick=()=>{if(S){S.log=[];save();renderGame();}};
document.addEventListener("keydown",e=>{
  if(e.key==="Escape"){
    if(!$("game").classList.contains("hidden")){
      $("overlay").classList.toggle("hidden");
    }
  }
});
setInterval(()=>{if(S && !$("game").classList.contains("hidden"))save();},30000);

makeChips();
$("c-dob").value=randomDate();
})();
