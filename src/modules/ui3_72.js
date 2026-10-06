
// ---------- v7.2 navigation: numbered sub-tabs instead of long scrolling pages ----------
// UI preferences are stored separately from the simulation save.
const UI_KEY='lifeSim_ui';
function loadUI(){try{return Object.assign({subTab:{},logOpen:false,theme:'light'},JSON.parse(localStorage.getItem(UI_KEY)||'{}'))}catch(e){return {subTab:{},logOpen:false,theme:'light'}}}
let UI=loadUI();
function saveUI(){try{localStorage.setItem(UI_KEY,JSON.stringify(UI))}catch(e){}}
const PANEL_TABS={
 home:[['now','Now'],['today','Today'],['inbox','Inbox']],
 places:[['care','Care'],['independence','Independence'],['activities','Activities'],['things','Your things'],['out','Go out']],
 school:[['today','Today'],['subjects','Subjects'],['exams','Assessments'],['attendance','Attendance'],['activities','Clubs & events'],['university','University']],
 business:[['things','Your things'],['shop','Shop'],['money','Money & chores'],['selling','Selling']],
 calendar:[['month','Month'],['today','Today'],['upcoming','Upcoming'],['history','History']],
 world:[['world','World'],['journal','Journal']]
};
const SECTION_RULES={
 home:[[/attention|happening|gift|holiday|prom/i,'now'],[/today|right now|mood/i,'today'],[/notification|pending/i,'inbox']],
 places:[[/independence|early education/i,'independence'],[/daily life/i,'care'],[/use your things|skills|traits/i,'things'],[/go out|weather/i,'out'],[/.*/,'activities']],
 school:[[/^university/i,'university'],[/attendance/i,'attendance'],[/assessment/i,'exams'],[/subjects/i,'subjects'],[/clubs|competitions/i,'activities'],[/.*/,'today']],
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
 if(d.extraEx){extraExercise(d.extraEx);save();render();return true}
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
 return `<div class="dashboard"><section class="card"><h3>Travel</h3>${statRow('Trips / outings',S.travel.trips)}${statRow('Current rule',esc(t.label))}<p class="muted-text">${esc(t.note)}</p><button data-act="trip">${esc(t.label)}</button></section><section class="card"><h3>Milestones</h3>${S.milestones.slice(0,12).map(m=>`<div class="timeline-entry"><span>${formatDate(m.dateISO||currentDate())} • Age ${m.age}</span><b>${esc(m.title)}</b><p>${esc(m.text)}</p></div>`).join('')||'<p class="muted-text">Important milestones will collect here over time.</p>'}</section><section class="card"><h3>Education history</h3>${educationHistoryHtml()}</section><section class="card"><h3>Neighborhood</h3>${neighborhoodHtml()}</section><section class="card"><h3>Awards</h3>${(S.awards||[]).slice(0,10).map(a=>`<div class="timeline-entry"><span>${a.year} • ${esc(a.grade)}</span><b>🏅 ${esc(a.name)}</b></div>`).join('')||'<p class="muted-text">End-of-year awards appear here.</p>'}</section><section class="card"><h3>Story threads</h3>${threadsHtml()}</section><section class="card"><h3>Outcome history</h3>${outcomesHtml()}</section><section class="card wide"><h3>Life log</h3><div class="log">${S.log.slice(0,60).map(e=>`<div class="log-entry"><div class="log-date">${e.dateISO?formatDate(e.dateISO):'DAY '+e.day} • ${timeLabel(e.minute||0)} • AGE ${e.age}</div><b>${esc(e.title)}</b><p>${esc(e.text)}</p></div>`).join('')}</div></section></div>`
}
function placesPanel(){
 const places=D.placesOutside.filter(p=>S.age>=p.minAge&&(!p.maxAge||S.age<=p.maxAge)),things=yourThingsHtml();
 return `<div class="dashboard"><section class="card wide"><div class="section-heading"><div><h3>Daily Life • ${lifeStage()}</h3><p class="muted-text">Core physiological actions stay accessible; the method changes with age and development.</p></div><span class="tag">${timeLabel(currentMinute())}</span></div>${careCards()}</section><section class="card wide">${personalCards()}</section><section class="card wide">${things||'<h3>Use your things</h3><p class="muted-text">Items you own (books, art supplies, a bike, a ball…) add better versions of everyday activities here.</p>'}</section><section class="card"><h3>Skills & hobbies</h3>${skillsHtml()}</section>${independenceHtml()}<section class="card wide"><h3>Summer programs & practice</h3>${programsHtml()}</section>${S.age>=5?`<section class="card"><h3>Baking & treats</h3>${bakingHtml()}<p class="muted-text">Homemade treats make great gifts. Wrap them from Your things.</p></section>`:''}<section class="card"><h3>Traits & talents</h3>${traitsHtml()}${devStatusHtml()}</section><section class="card wide"><h3>Go out</h3><p class="muted-text">Transport: ${esc(localTransport())}. Children and teens use supervision/permission rules automatically.</p><div class="place-grid">${places.map(p=>`<button class="place-card" data-place="${p.id}"><b>${esc(p.name)}</b><small>${p.minutes>=120?Math.round(p.minutes/60)+'h':p.minutes+' min'}${p.cost?` • about ${money(S.age<13?0:p.cost)}`:' • free'}</small></button>`).join('')}</div></section><section class="card"><h3>Weather comfort</h3><p class="muted-text">${esc(weatherAdvice())}</p><div class="inline-actions">${S.homeAmenities.fan?'<button data-act="comfort" data-arg="fan">Use fan</button>':''}${S.homeAmenities.ac?'<button data-act="comfort" data-arg="ac">Use A/C</button>':''}${S.homeAmenities.fireplace?'<button data-act="comfort" data-arg="fireplace">Use fireplace</button>':''}</div></section></div>`
}
