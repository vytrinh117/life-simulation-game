from harness import *
import datetime as dt
async def C(pg,fn,*a): return await T(pg,"call("+",".join([json.dumps(fn)]+[json.dumps(x) for x in a])+")")
async def M(pg,code): return await pg.evaluate("c=>__LIFE_SIM_TEST__.mutate(c)",code)
async def newest(pg,typ):
    s=await st(pg); ev=[e for e in s['events'] if e['type']==typ and e['status']=='Open']; return ev[-1] if ev else None
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path=CHROME); pg=await new_page(b); await new_life(pg); await T(pg,"setAge(15)")
    await M(pg,"S.events.forEach(e=>{if(e.status==='Open')e.status='Resolved'});S.people.filter(p=>p.role==='friend').forEach(p=>{p.rel=72;p.battery=90})")
    s=await st(pg); f=[x for x in s['people'] if x['role']=='friend'][0]
    await C(pg,'npcInvitesPlayer',f['id']); e=await newest(pg,'invitation'); m=await C(pg,'inviteMeta',e['id'])
    check('O: a friend\'s invitation shows who (with tier), what, where, when and answer-by', m and (f['firstName'] in m['from'] or (f.get('nickname') or '§') in m['from']) and 'Friend' in m['from'] and m['what'] and m['where'] and m['when'] and m['by'], m)
    await T(pg,"openTab('home')"); html=await pg.inner_text('body'); check('O: the details are visible on screen (From / What / Where / When / Answer by)', all(k in html.upper() for k in ['FROM','WHAT','WHERE','WHEN','ANSWER BY']))
    await M(pg,"S.events.forEach(e=>{if(e.status==='Open')e.status='Resolved'})")
    await M(pg,f"S.people.find(x=>x.id==='{f['id']}').rel=85")
    await pg.evaluate("id=>__LIFE_SIM_TEST__.call('incomingCall',id,'chat')",f['id']); e=await newest(pg,'incomingCall'); m=await C(pg,'inviteMeta',e['id'])
    check('O: an incoming call says it is happening right now, on your phone', m and m['when'].startswith('Right now') and m['where']=='Your phone', m)
    await M(pg,"S.events.forEach(e=>{if(e.status==='Open')e.status='Resolved'});S.neighborhood.cooldown=null")
    got=None
    for i in range(60):
        await M(pg,"S.neighborhood.cooldown=null"); await C(pg,'neighborhoodTick'); got=await newest(pg,'nbh')
        if got: break
    m=await C(pg,'inviteMeta',got['id']) if got else None
    check('O: neighborhood events say who (family/neighborhood), where and when', m and m['from'] and m['where'] and m['when'], m)
    await M(pg,"S.events.forEach(e=>{if(e.status==='Open')e.status='Resolved'});S.trip=null;S.tripOffer=null")
    await C(pg,'proposeVacation','summer vacation'); e=await newest(pg,'vacationProposal'); m=await C(pg,'inviteMeta',e['id']); s=await st(pg)
    check('O: a family trip proposal shows destination, dates and answer-by', m and m['where']==s['tripOffer']['dest'] and '–' in m['when'] and m['by'], m)
    await pg.close()
    # prom invite
    pg=await new_page(b); await new_life(pg); await T(pg,"setAge(16)"); pr=await C(pg,'ensureProm')
    if pr:
        d=(dt.date.fromisoformat(pr['dateISO'])-dt.timedelta(days=20)).isoformat(); await T(pg,f"setClock('{d}',600)"); await C(pg,'promTick'); s=await st(pg); f=[x for x in s['people'] if x['role']=='friend'][0]
        await C(pg,'npcAsksToProm',f['id']); e=await newest(pg,'promInvite'); m=await C(pg,'inviteMeta',e['id'])
        mon=dt.date.fromisoformat(pr['dateISO']).strftime('%b')
        check('O: a prom invitation shows the venue and the prom date', bool(m) and m['where']==pr['venue'] and mon in m['when'], m)
    await pg.close()
    # groups
    pg=await new_page(b); await new_life(pg); await T(pg,"setAge(15)")
    await M(pg,"S.groups=[];while(S.people.filter(p=>p.role==='friend').length<10){const n=S.npcs.find(x=>!S.people.some(p=>p.npcId===x.id));S.people.push({id:'x'+n.id,npcId:n.id,name:n.fullName,fullName:n.fullName,firstName:n.firstName,surname:n.surname,role:'friend',roleLabel:'classmate',age:S.age,rel:70,trust:60,fun:50,conflict:0,history:[],memory:'',traits:['Funny'],mood:'good',knownSince:S.age})};S.people.filter(p=>p.role==='friend').forEach(p=>{p.rel=70;p.battery=90})")
    for i in range(5): await C(pg,'formGroups')
    s=await st(pg); g=s['groups']; members=[m for x in g for m in x['members']]
    check('O/106: several friend groups form (max 3), no one in two groups at once', 2<=len(g)<=3 and len(members)==len(set(members)), [len(x['members']) for x in g])
    await T(pg,"openTab('people')"); btns=await pg.query_selector_all("[data-group-plan]"); check('O/106: each group has its own "plan a group outing" button', len(btns)==len(g))
    wk=dt.date.fromisoformat(s['clock']['dateISO'])+dt.timedelta(days=2)
    while wk.weekday()<5: wk+=dt.timedelta(days=1)
    await C(pg,'planGroupOuting','hangout',wk.isoformat(),[840,960],g[1]['id']); s=await st(pg); gp=[x for x in s['plans'] if x.get('groupIds') is not None]
    inv=set([gp[0]['personId']]+gp[0]['groupIds']) if gp else set()
    check('O/106: a group outing uses that group\'s members', gp and inv<=set(g[1]['members']), (inv,g[1]['members']))
    # romance toggle
    fid=[x for x in s['people'] if x['role']=='friend'][0]['id']; await M(pg,f"const p=S.people.find(x=>x.id==='{fid}');p.age=15;const n=S.npcs.find(x=>x.id===p.npcId);if(n)n.birthYear=new Date(S.clock.dateISO).getUTCFullYear()-15")
    check('O: romance is available by default for teens', await C(pg,'eligibleRomance',fid))
    await C(pg,'toggleRomance'); check('O: turning romance content off removes romance options', not await C(pg,'eligibleRomance',fid))
    await T(pg,"openTab('people')"); await pg.click("[data-people-filter='all']"); txt=await pg.inner_text('#panel-host'); check('O (moved by Hotfix P1.2): the romance toggle lives in the Love life card under People › All', 'Turn romance content on' in txt)
    await C(pg,'toggleRomance'); await M(pg,f"S.romance.partnerId='{fid}'"); await C(pg,'toggleRomance'); s=await st(pg)
    check('O: cannot turn romance off while in a relationship (end it first)', not s['romance'].get('optOut'))
    check('O: no JS errors', not pg.errs, pg.errs[:3]); await b.close()
asyncio.run(main())
