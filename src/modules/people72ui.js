// ---------- v7.2 PHASE 5a UI: people, plans, rules ----------
function peoplePanel(){
 // HOTFIX P1.2 — People is the social hub: People (filters) | Friend Groups | Plans. The filter is UI-only state.
 const counts={};for(const p of S.people)counts[peopleCategory(p)]=(counts[peopleCategory(p)]||0)+1;let f=UI.peopleFilter||'all';if(f!=='all'&&!counts[f])f='all';
 const list=peopleOrder().filter(p=>f==='all'||peopleCategory(p)===f);
 const bar=`<div class="people-filters" role="tablist">${PEOPLE_FILTERS.filter(([k])=>k==='all'||counts[k]).map(([k,l])=>`<button class="small ${k===f?'primary':'ghost'}" data-people-filter="${k}" aria-pressed="${k===f}">${l}${k==='all'?'':` <em>${counts[k]}</em>`}</button>`).join('')}</div>`;
 const extra=f==='family'?familyOverviewHtml():(f==='all'||f==='bonds')?loveLifeHtml():'';
 return `<div class="dashboard"><section class="card wide people-hub" data-sub="people"><h3>${S.age<6?'Your social world':'People'}</h3><p class="muted-text">People have their own schedules, goals and limits.</p>${bar}${extra}<div class="people-grid">${list.map(peopleCardCompact).join('')||'<p class="muted-text">Nobody here yet.</p>'}</div></section>${S.age>=13&&(S.rivals||[]).length?`<section class="card" data-sub="people"><h3>Rivals</h3>${S.rivals.map(r=>{const p=S.people.find(x=>x.npcId===r.npcId);return p?`<p>${esc(p.fullName||p.name)} <small class="muted-text">• ${esc(r.domain)} • ${esc(r.type)}</small></p>`:''}).join('')}</section>`:''}${S.age>=8?`<section class="card wide" data-sub="groups"><h3>Friend groups</h3>${groupHtml()}</section>`:''}<section class="card wide" data-sub="plans"><h3>Plans & invitations</h3>${plansHtml()}</section></div>`
}
PANEL_TABS.people=[['people','People'],['groups','Friend Groups'],['plans','Plans']];
SECTION_RULES.people=[[/plans/i,'plans'],[/friend group/i,'groups'],[/.*/,'people']];
SECTION_RULES.world=[[/journal|milestone|education|life log|story|outcome|awards/i,'journal'],[/.*/,'world']];
function offerButtons(o){const i=clubInfo(o.name);if(o.status!=='Offered')return statusTag(o.status==='Tryout'?'Tryout scheduled':o.status);const lab=i.kind==='open'?(S.age<13?'Ask to join':'Sign up'):i.kind==='elected'?'Run for class rep':i.entry==='tryout'?(S.age<13?'Ask to try out':'Sign up for tryout'):(S.age<13?'Ask to audition':'Sign up for audition');return `<div class="inline-actions"><button class="small" data-activity-signup="${o.id}">${lab}</button><button class="small ghost" data-activity-info="${o.id}">Learn more</button><button class="small ghost" data-activity-decline="${o.id}">Decline</button></div>`}
