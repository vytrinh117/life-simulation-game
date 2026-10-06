from harness import *
async def C(pg,fn,*a): return await T(pg,"call("+",".join([json.dumps(fn)]+[json.dumps(x) for x in a])+")")
async def M(pg,code): return await pg.evaluate("c=>__LIFE_SIM_TEST__.mutate(c)",code)
async def filt(pg,k):
    await T(pg,"openTab('people')"); b=await pg.query_selector(f"[data-people-filter='{k}']")
    if not b: return None
    await b.click(); return await pg.evaluate("[...document.querySelectorAll('.people-grid [data-profile-open]')].map(b=>b.dataset.profileOpen)")
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path=CHROME); errs=[]
    pg=await new_page(b,1366,900); await new_life(pg); await T(pg,"setAge(30)")
    navtxt=await pg.inner_text('nav, .sidebar, aside') if await pg.query_selector('nav, .sidebar, aside') else await pg.inner_text('body')
    has_family_nav=await pg.evaluate("!!document.querySelector('[data-tab=\"family\"]')")
    check('P1.2 #12: the Family & Relationships sidebar item is gone', not has_family_nav and 'Family & Relationships' not in navtxt)
    await M(pg,"""S.people=S.people.filter(p=>['parent','grandparent','aunt','uncle'].includes(p.role));
      const mk=(id,role,extra)=>Object.assign({id,name:id,firstName:id,fullName:id+' Test',role,age:S.age,rel:50,trust:50,respect:50,reliability:70,conflict:0,history:[{dateISO:S.clock.dateISO,age:S.age,text:'x',importance:1}],milestones:[]},extra||{});
      S.people.push(mk('sib','older sibling',{relation:'sibling',gender:'Female',age:S.age+2,residence:'home'}),mk('kid','child',{relation:'child',age:3,residence:'home'}),
        mk('partner','friend',{rel:95,trust:90,respect:70,reliability:80}),mk('best','friend',{rel:92,trust:85,respect:70,reliability:80}),mk('close','friend',{rel:78,trust:70}),mk('casual','friend',{rel:50,trust:40}),
        mk('acq','friend',{rel:25,trust:40}),mk('old','friend',{rel:45,trust:40,friendStatus:'Old Friend'}),mk('former','friend',{rel:20,trust:20,conflict:80,friendStatus:'Former Friend'}),mk('contact','friend',{rel:30,friendStatus:'Contact'}));
      S.romance.partnerId='partner';const g=S.people.find(p=>p.role==='grandparent');if(g)g.residence='home';S.groups=[{id:'g1',name:'The Lunch Table',formed:S.clock.dateISO,members:['best','close','casual'],jokes:['the pigeon']}];S.familyEvents=S.familyEvents||[];S.familyEvents.unshift({text:'Movie night at home',dateISO:S.clock.dateISO})""")
    s=await st(pg); ids={x['id']:x for x in s['people']}; gp=[x['id'] for x in s['people'] if x['role']=='grandparent']; mom=await C(pg,'familyByRelation','mother')
    cat={k:await C(pg,'peopleCategory',k) for k in ['sib','kid','partner','best','close','casual','acq','old','former','contact',mom]+gp[:1]}
    check('P1.2 classification: mother, sibling and the player\'s child → Family', cat[mom]=='family' and cat['sib']=='family' and cat['kid']=='family', cat)
    check('P1.2 classification: a grandparent who lives at home is still Relatives (residence ≠ category)', gp and cat[gp[0]]=='relatives', cat)
    check('P1.2 classification: partner (also a best friend) and Best Friend → Closest Bonds', cat['partner']=='bonds' and cat['best']=='bonds', cat)
    check('P1.2 classification: Close and Casual Friend → Friends; Acquaintance → Acquaintances', cat['close']=='friends' and cat['casual']=='friends' and cat['acq']=='acquaintances', cat)
    check('P1.2 classification: Old / Former Friend → Past Connections', cat['old']=='past' and cat['former']=='past', cat)
    allv=await filt(pg,'all'); check('P1.2: All shows everyone exactly once (partner who is also a best friend appears once)', len(allv)==len(set(allv)) and allv.count('partner')==1 and set(allv)==set(ids), (len(allv),len(set(allv)),len(ids)))
    dad=await C(pg,'familyByRelation','father')
    for k,exp in [('family',{'sib','kid',mom,dad}),('bonds',{'partner','best'}),('friends',{'close','casual'}),('past',{'old','former'})]:
        v=await filt(pg,k); check(f'P1.2 filter "{k}" shows exactly its people', v is not None and set(v)==exp, (k,v))
    v=await filt(pg,'relatives'); check('P1.2 filter "relatives" includes the grandparent', v and gp[0] in v)
    await M(pg,"for(const p of S.people)if(p.role==='aunt'||p.role==='uncle')p.role='__x'"); await T(pg,"openTab('people')")
    await filt(pg,'family'); html=await pg.inner_html('#panel-host')
    check('P1.2 #13: People › Family shows the Family Overview (dynamics, household & family tree, events/memories)', 'Family overview' in html and 'Household strictness' in html and 'Generosity' in html and 'Family tree' in html and 'Movie night at home' in html)
    n0=len((await st(pg))['log']); t0=(await st(pg))['clock']; await pg.click("[data-act='familyTalk']"); s=await st(pg)
    check('P1.2 #14: "Have a real conversation" still works from People › Family', len(s['log'])>n0 or s['clock']!=t0, (n0,len(s['log'])))
    # subtabs
    await T(pg,"openTab('people')"); tabs=await pg.evaluate("[...document.querySelectorAll('.subtab span')].map(s=>s.innerText)")
    check('P1.2: subnavigation is People | Friend Groups | Plans', tabs==['People','Friend Groups','Plans'], tabs)
    await pg.click("[data-subtab='groups']"); vis=await pg.evaluate("()=>({cards:[...document.querySelectorAll('.person-card')].filter(c=>c.offsetParent).length,grp:!!document.querySelector('[data-group-plan]')?.offsetParent,inGrid:!!document.querySelector('.people-grid [data-group-plan], .people-grid .group-block')})")
    check('P1.2 #15/#17: Friend Groups render in their own subtab, outside the People grid (no person cards visible there)', vis['grp'] and vis['cards']==0 and not vis['inGrid'], vis)
    btns=await pg.evaluate("[...document.querySelectorAll('.group-block button')].map(b=>Object.keys(b.dataset))")
    check('P1.2 F: group cards expose only real actions (no dead buttons)', btns and all(k==['groupPlan'] for k in btns), btns)
    np=len((await st(pg)).get('plans',[])); nl=len((await st(pg))['log']); await pg.click("[data-group-plan='g1']"); s=await st(pg)
    check('P1.2 #16: "Plan a group outing" still works', len(s.get('plans',[]))>np or len(s['log'])>nl or any(e['status']=='Open' for e in s['events']), (np,len(s.get('plans',[]))))
    await T(pg,"openTab('people')"); await pg.click("[data-subtab='plans']"); vis=await pg.evaluate("()=>({cards:[...document.querySelectorAll('.person-card')].filter(c=>c.offsetParent).length,plans:[...document.querySelectorAll('section h3')].some(h=>/Plans & invitations/.test(h.innerText)&&h.offsetParent)})")
    check('P1.2: Plans subtab still works and individual people cards are hidden there (fixes a P1.1 grid side effect)', vis['plans'] and vis['cards']==0, vis)
    await pg.click("[data-subtab='people']")
    # compatibility: old route to the Family view
    await T(pg,"openTab('family')"); pressed=await pg.evaluate("document.querySelector('[data-people-filter=\"family\"]')?.getAttribute('aria-pressed')")
    html=await pg.inner_html('#panel-host')
    check('P1.2 compatibility: an old request to open the Family view lands on People › Family (no duplicate Family page)', pressed=='true' and 'Family overview' in html and html.count('Family overview')==1)
    await filt(pg,'all'); html=await pg.inner_html('#panel-host'); check('P1.2: Love life (age 13+) is reachable from People › All', 'Love life' in html)
    errs+=pg.errs; await pg.close()
    # canonical lookups no longer depend on Mom/Dad names
    src=open('/home/claude/proj/game.js').read()
    check('P1.2 audit: no runtime family lookup by the literal names Mom/Dad/Grandmother remains in game.js', all(x not in src for x in ["p.name==='Mom'","p.name==='Dad'","/Mom|Grandmother/.test(p.name)","/Mom/.test(p.name)","/Dad/.test(p.name)"]))
    pg=await new_page(b); await new_life(pg); await T(pg,"setAge(8)")
    check('P1.2 #12 (child age): no Family sidebar item at age 8 either; People reachable', not await pg.evaluate("!!document.querySelector('[data-tab=\"family\"]')") and await pg.evaluate("!!document.querySelector('[data-tab=\"people\"]')"))
    errs+=pg.errs; check('P1.2: no JS errors', not errs, errs[:3]); await b.close()
asyncio.run(main())
