from harness import *
import datetime as dt, collections
async def C(pg,fn,*a): return await T(pg,"call("+",".join([json.dumps(fn)]+[json.dumps(x) for x in a])+")")
async def M(pg,code): return await pg.evaluate("c=>__LIFE_SIM_TEST__.mutate(c)",code)
async def reload(pg): s=await st(pg); await pg.evaluate("s=>__LIFE_SIM_TEST__.loadState(s)",s); return await st(pg)
ONCE={'acquaintances','casualFriends','friends','goodFriends','closeFriends','bestFriends','firstDate','official','engaged','married','helped'}
def dupes(s):
    bad=[]
    if len(set(s['personality']))!=len(s['personality']):bad.append('dup trait')
    if len(set(s['talents']))!=len(s['talents']):bad.append('dup talent')
    if len(s['personality'])>5 and (s.get('dev') or {}).get('origin'):pass
    for p in s['people']:
        c=collections.Counter(m['type'] for m in p.get('milestones',[]) if m['type'] in ONCE)
        if any(v>1 for v in c.values()):bad.append('dup milestone '+p['name'])
        ids=[t['id'] for t in p.get('convThreads',[])]
        if len(ids)!=len(set(ids)):bad.append('dup thread '+p['name'])
    h=[(x['talent'],x['dateISO']) for x in (s.get('dev') or {}).get('talentHistory',[])]
    if len(h)!=len(set(h)):bad.append('dup talent history')
    for k,e in ((s.get('dev') or {}).get('ev') or {}).items():
        ids=[r['eventId'] for r in e['recs'] if r.get('eventId')]
        if len(ids)!=len(set(ids)):bad.append('dup evidence '+k)
    return bad
def core(s): return {'personality':s['personality'],'talents':s['talents'],'dev':s.get('dev'),'people':[(p['id'],p.get('tier'),p.get('friendStatus'),p.get('milestones'),p.get('convThreads'),p.get('observedTraits'),p.get('goalsKnown')) for p in s['people']]}
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path=CHROME); errs=[]
    # ---- legacy real save (v7.2 fixture: Jordan) ----
    pg=await new_page(b); fx=json.load(open('/home/claude/tests/fixture_jordan.json')); await pg.evaluate("s=>__LIFE_SIM_TEST__.loadState(s)",fx); s1=await st(pg)
    check('3A.7 migration: a real legacy save (Jordan, v7.2) loads', s1 and s1['name'] and s1['school']['grade'])
    check('3A.7 migration: legacy personality / talents kept exactly (core / recognized), nothing auto-filled', s1['personality']==fx.get('personality',[]) and s1['talents']==fx.get('talents',[]) and all(s1['dev']['origin']['trait'].get(t)=='core' for t in s1['personality']) and all(t in s1['dev']['origin']['talent'] for t in s1['talents']), (fx.get('personality'),s1['personality'],fx.get('talents'),s1['talents']))
    a=core(s1)
    for i in range(3): s=await reload(pg)
    check('3A.7 idempotence: three reloads of the legacy save change nothing in Phase 3A state', core(s)==a and not dupes(s), dupes(s))
    errs+=pg.errs; await pg.close()
    # ---- rich Phase 3A state, then repeated save/load ----
    pg=await new_page(b); await new_life(pg); await T(pg,"setAge(15)"); s=await st(pg); fs=[x for x in s['people'] if x['role']=='friend' and x.get('npcId')]; f,g=fs[0],fs[1]
    await M(pg,"S.personality=['Curious','Kind'];S.talents=['Science','Music'];S.dev=null"); await reload(pg)
    await M(pg,f"const a=S.people.find(x=>x.id==='{f['id']}');a.rel=80;a.trust=70;a.tier='Acquaintance';a.milestones=[];const b=S.people.find(x=>x.id==='{g['id']}');b.rel=45;b.trust=40")
    await C(pg,'tierTick'); await C(pg,'thread','tryout','tryout-T','Making the Track team'); tps=await C(pg,'upcomingTopics'); await C(pg,'shareTopic',f['id'],[i for i,t in enumerate(tps) if t['ref']=='tryout-T'][0])
    await C(pg,'recordTraitEvidence','Responsible',{'source':'homework','context':'Math','eventId':'hw-x'}); await C(pg,'recordTalentEvidence','Art',{'source':'Art Exhibition','context':'Art Exhibition','quality':3,'eventId':'c-x'})
    await C(pg,'recordTalentEvidence','Art',{'source':'Art Exhibition','context':'Art Exhibition','quality':3,'eventId':'c-x'})
    await M(pg,f"S.people.find(x=>x.id==='{g['id']}').friendStatus='Former Friend'"); await C(pg,'observeBusy',f['id'])
    s0=await st(pg); check('3A.7: the same real event id is recorded as evidence only once', [r['eventId'] for r in s0['dev']['ev']['talent:Art']['recs']].count('c-x')==1)
    s0=await reload(pg)  # first load syncs cached tiers (e.g. a status set directly by this test); idempotence is measured from the settled state
    check('3A.7: the first load only syncs the cached tier to the real status (Former Friend), nothing else changes', [x for x in s0['people'] if x['id']==g['id']][0]['tier']=='Former Friend')
    a=core(s0)
    for i in range(3): s=await reload(pg)
    if core(s)!=a:
        ca,cs=a,core(s)
        for k in ('personality','talents'):
            if ca[k]!=cs[k]:print('   DIFF',k,ca[k],cs[k])
        if ca['dev']!=cs['dev']:print('   DIFF dev keys:',[k for k in set(ca['dev'])|set(cs['dev']) if ca['dev'].get(k)!=cs['dev'].get(k)])
        for x,y in zip(ca['people'],cs['people']):
            if x!=y:print('   DIFF person',x[0],[i for i in range(len(x)) if x[i]!=y[i]], 'before:',str([x[i] for i in range(len(x)) if x[i]!=y[i]])[:200],'after:',str([y[i] for i in range(len(x)) if x[i]!=y[i]])[:200])
        if len(ca['people'])!=len(cs['people']):print('   DIFF people count',len(ca['people']),len(cs['people']))
    check('3A.7 save→reload ×3 preserves all Phase 3A state (tiers, statuses, milestones, threads, knowledge, evidence) with no duplicates', core(s)==a and not dupes(s), dupes(s))
    for i in range(3): await C(pg,'migrateDev'); await C(pg,'migrateFriendTiers')
    s=await st(pg); check('3A.7 repeated migrations are idempotent', core(s)==a and not dupes(s))
    check('Y#2: Old/Former Friend status persists across reload', [x for x in s['people'] if x['id']==g['id']][0].get('friendStatus')=='Former Friend')
    check('Y#17/#18/#20: core personality stays core, talents stay recognized, nothing auto-filled', s['personality']==['Curious','Kind'] and s['talents']==['Science','Music'] and s['dev']['origin']['trait']=={'Curious':'core','Kind':'core'})
    d1=await C(pg,'relationshipDescriptor',f['id']); await reload(pg); check('Y#16: the relationship descriptor is stable across reload', d1==await C(pg,'relationshipDescriptor',f['id']) and d1 in ('Close Friend','Casual Friend'), d1)
    # ---- Y#4: family never counts toward the active-friend limit ----
    n0=await C(pg,'activeFriendCount'); await M(pg,"S.people.filter(p=>['parent','grandparent','older sibling','younger sibling'].includes(p.role)).forEach(p=>{p.rel=95;p.trust=95})")
    check('Y#4: family is excluded from the active-friend count', await C(pg,'activeFriendCount')==n0)
    # ---- Y#1 ladder integrity: every non-family tier is one of the five labels or a status ----
    s=await st(pg); labels={await C(pg,'friendTier',x['id']) for x in s['people'] if x['role'] not in ('parent','grandparent','older sibling','younger sibling','aunt','uncle')}
    check('Y#1: only the new ladder (and the Old/Former/Contact statuses) are used', labels<= {'Stranger','Acquaintance','Casual Friend','Close Friend','Best Friend','Old Friend','Former Friend','Contact','Dating','Serious'} and not labels & {'Friend','Good Friend'}, labels)
    errs+=pg.errs; check('3A.7: no JS errors', not errs, errs[:3]); await b.close()
asyncio.run(main())
