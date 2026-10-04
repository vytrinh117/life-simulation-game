from harness import *
async def C(pg,fn,*a): return await T(pg,"call("+",".join([json.dumps(fn)]+[json.dumps(x) for x in a])+")")
async def M(pg,code): return await pg.evaluate("c=>__LIFE_SIM_TEST__.mutate(c)",code)
async def enroll(pg,uid):
    x=await C(pg,'uniById',uid)
    await M(pg,f"const x={json.dumps({'name':x['name'],'tier':x['tier'],'tuition':x['tuition']})};S.uni={{enrolled:true,school:x.name,tier:x.tier,tuition:x.tuition,year:1,yearKey:2028,semKey:'2028-1',gpa:0,semGpas:[],semStudy:0,rankAward:0,tierAid:false,nextSemAid:0}};S.money=5000;S.education.highSchoolDone=true;S.school=null")
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path=CHROME); pg=await new_page(b); await new_life(pg,dob='2008-03-10'); await T(pg,"setAge(18)")
    unis=[await C(pg,'uniById',f'uni{i}') for i in range(12)]
    check('B1: every school has its own tuition (no two the same)', len({u['tuition'] for u in unis})==12, sorted(u['tuition'] for u in unis))
    check('B1: application fees differ (community college free)', len({u['fee'] for u in unis})>=10 and unis[11]['fee']==0)
    same=[u for u in unis if u['tier']=='top']; check('B1: schools in the same tier differ in tuition and admission bar', len({u['tuition'] for u in same})==3 and len({u['need'] for u in same})==3)
    check('B1: tuition follows prestige (elite > top > strong > state > community)', min(u['tuition'] for u in unis if u['tier']=='elite')>max(u['tuition'] for u in unis if u['tier']=='top')>0 and min(u['tuition'] for u in unis if u['tier']=='strong')>max(u['tuition'] for u in unis if u['tier']=='state'))
    el=unis[0]; check('B1: an elite school has nearly everything (pool, stadium, labs, concert hall)', all(k in el['fac'] for k in ['pool','stadium','labs','concertHall']))
    check('B1: the art school has studios and a theater but no stadium', 'artStudio' in unis[6]['fac'] and 'stadium' not in unis[6]['fac'])
    check('B1: the community college has no dorms and no Greek life', unis[11]['dorm']==0 and unis[11]['greek']=='none')
    await C(pg,'openBrochure','uni2'); txt=await pg.inner_text('#choice-content')
    check('B1: the brochure shows location (km from center), campus, dorms, Greek life, events, facilities, clubs, strengths', all(k in txt for k in ['km from the city center','Dorms','Greek life','Campus events','Robotics Team','Computer Science']) and 'FACILITIES' in txt.upper(), txt[:200])
    check('B1: missing facilities are shown as missing (✕)', '✕' in txt)
    await T(pg,"call('closeChoiceModal')")
    # enrolled at Riverside (gym, no pool, big Greek life)
    await enroll(pg,'uni8'); await T(pg,"setClock('2028-09-12',1000)"); f0=(await st(pg))['skills'].get('fitness',0)
    await C(pg,'campusWorkout','gym'); f1=(await st(pg))['skills'].get('fitness',0); check('B1: the campus gym builds fitness where it exists', f1>f0)
    t0=(await st(pg))['clock']; await C(pg,'campusWorkout','pool'); t1=(await st(pg))['clock']; check('B1: no pool at this school → refused', t0==t1)
    await C(pg,'syncDormRent'); await C(pg,'moveTo','dorm'); s=await st(pg); check('B1: dorm rent is the school\'s own price', s['housing']['type']=='dorm' and s['money']==5000-640, s['money'])
    n0=len(s['people']); met=False
    for i in range(4):
        await T(pg,f"setClock('2028-09-{13+i}',1170)"); await C(pg,'greekParty'); s=await st(pg)
        if len(s['people'])>n0: met=True; break
    check('B1: Greek Row parties (evenings) can introduce new people at big-Greek schools', met)
    await C(pg,'joinCampusClub'); s=await st(pg); check('B1: campus clubs come from the school\'s signature clubs', s['uni']['club'] in unis[8]['clubs'])
    await T(pg,"openTab('school')"); await pg.click("[data-subtab='university']") if await pg.query_selector("[data-subtab='university']") else None; txt=await pg.inner_text('#panel-host')
    check('B1: the University panel offers campus actions that match the school', 'Campus gym' in txt and 'Swim laps' not in txt and 'Greek Row' in txt and 'Campus guide' in txt)
    # community college: no dorm
    await enroll(pg,'uni11'); await M(pg,"S.housing={type:'parents',since:S.clock.dateISO,missed:0}"); await C(pg,'moveTo','dorm'); s=await st(pg)
    check('B1: no dorm at a commuter college', s['housing']['type']=='parents')
    # annual concert
    await enroll(pg,'uni0'); await M(pg,"S.uni.concerts={};S.events.forEach(e=>{if(e.status==='Open')e.status='Resolved'})"); await T(pg,"setClock('2028-10-14',1435)"); await T(pg,"advanceMinutes(30)"); s=await st(pg)
    ev=[e for e in s['events'] if e['type']=='campusConcert' and e['status']=='Open']; check('B1: the annual concert with a famous alumna happens', ev and 'Ava Sterling' in ev[0]['title'])
    if ev: await T(pg,f"eventChoice('{ev[0]['id']}','go')"); s=await st(pg); check('B1: going to the concert is a memory', any('Campus concert' in m['title'] for m in s['milestones']))
    check('B1: no JS errors', not pg.errs, pg.errs[:3]); await pg.close()
    # applications panel: Learn more on every school
    pg=await new_page(b); await new_life(pg,dob='2010-03-10'); await T(pg,"setAge(17)"); await T(pg,"setClock('2027-09-21',1000)")
    await T(pg,"openTab('school')"); await pg.click("[data-subtab='university']"); n=len(await pg.query_selector_all("[data-uni-brochure]"))
    check('B1: every school in the application list has a Learn more button', n==12, n)
    check('applications: no JS errors', not pg.errs, pg.errs[:3]); await b.close()
asyncio.run(main())
