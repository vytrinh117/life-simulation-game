from harness import *
import datetime as dt
async def C(pg,fn,*a): return await T(pg,"call("+",".join([json.dumps(fn)]+[json.dumps(x) for x in a])+")")
async def M(pg,code): return await pg.evaluate("c=>__LIFE_SIM_TEST__.mutate(c)",code)
async def person(pg,pid): return [x for x in (await st(pg))['people'] if x['id']==pid][0]
async def nextday(pg): await T(pg,"advanceMinutes(1440)")
async def fu(pg,pid):
    s=await st(pg); return [e for e in s['events'] if e['type']=='threadFollowUp' and e['status']=='Open' and pid in (e.get('participants') or [])]
async def topic_idx(pg,pred):
    tps=await C(pg,'upcomingTopics')
    for i,t in enumerate(tps):
        if pred(t): return i,t
    return None,tps
async def setup(b):
    pg=await new_page(b); await new_life(pg); await T(pg,"setAge(15)"); s=await st(pg); f=[x for x in s['people'] if x['role']=='friend'][0]
    await M(pg,f"S.events.forEach(e=>{{if(e.status==='Open')e.status='Resolved'}});S.threads=[];S.exams=(S.exams||[]).filter(e=>e.id&&!String(e.id).startsWith('qx'));const p=S.people.find(x=>x.id==='{f['id']}');p.convThreads=[];p.rel=60;p.trust=55;p.supportEvidence=0;S.threadAskedOn=null")
    return pg,f['id']
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path=CHROME); errs=[]
    pg,fid=await setup(b)
    # 30–33 with a real tryout (existing story-thread system)
    await C(pg,'thread','tryout','tryout-Basketball','Making the Basketball team')
    i,t=await topic_idx(pg,lambda t:t['kind']=='storyThread'); check('3A.4: an upcoming real tryout appears as something on your mind', i is not None, t)
    await C(pg,'shareTopic',fid,i); pp=await person(pg,fid); th=pp['convThreads'][0]
    check('3A.4 (#30): telling a friend stores a structured thread tied to the person and the real event', th['status']=='open' and th['kind']=='storyThread' and th['ref']=='tryout-Basketball' and 'nervous' in pp['history'][0]['text'])
    await C(pg,'shareTopic',fid,i); check('3A.4: telling the same friend about the same thing again is not duplicated', len((await person(pg,fid))['convThreads'])==1)
    await nextday(pg); check('3A.4: no follow-up before the real outcome exists', not await fu(pg,fid) and (await person(pg,fid))['convThreads'][0]['status']=='open')
    await M(pg,"const t=S.threads.find(x=>x.key==='tryout-Basketball');t.stage='Not selected';t.resolved=true;t.resolvedDate=S.clock.dateISO")
    await nextday(pg); await nextday(pg); ev=await fu(pg,fid)
    check('3A.4 (#31): later, the friend follows up ("How did tryouts … go?") — a real person event', ev and 'How did tryouts for' in ev[0]['text'] and ev[0]['participants']==[fid], ev and ev[0]['text'])
    check('3A.4: the answers fit the real (bad) result', ev and any('rough' in c['label'] for c in ev[0]['choices']))
    tr0=(await person(pg,fid))['trust']; await T(pg,f"eventChoice('{ev[0]['id']}','share')"); s=await st(pg); pp=await person(pg,fid)
    check('3A.4 (#32): the follow-up uses the REAL outcome ("not selected")', 'not selected' in s['log'][0]['text'], s['log'][0]['text'])
    check('3A.4 (#33): the thread is resolved after the follow-up; support shows up as trust and a log entry', pp['convThreads'][0]['status']=='resolved' and pp['trust']>tr0 and 'not selected' in pp['history'][0]['text'])
    await nextday(pg); check('3A.4: a resolved thread is never asked about again', not await fu(pg,fid))
    errs+=pg.errs; await pg.close()
    # exam (good) — and one follow-up per day at most
    pg,fid=await setup(b); s=await st(pg); d=(dt.date.fromisoformat(s['clock']['dateISO'])+dt.timedelta(days=5)).isoformat()
    await M(pg,f"S.exams.push({{id:'qx1',subject:'Mathematics',type:'Test',dateISO:'{d}',minute:600,endMinute:650,graceMinute:610,score:null,status:'Scheduled',prep:0}});S.exams.push({{id:'qx2',subject:'English',type:'Quiz',dateISO:'{d}',minute:700,endMinute:740,graceMinute:710,score:null,status:'Scheduled',prep:0}})")
    i,_=await topic_idx(pg,lambda t:t['kind']=='exam' and t['ref']=='qx1'); await C(pg,'shareTopic',fid,i)
    i2,_=await topic_idx(pg,lambda t:t['kind']=='exam' and t['ref']=='qx2'); await C(pg,'shareTopic',fid,i2)
    await M(pg,"for(const e of S.exams)if(['qx1','qx2'].includes(e.id)){e.status='Completed';e.score=e.id==='qx1'?91:74}")
    await nextday(pg); await nextday(pg); ev=await fu(pg,fid); s=await st(pg)
    check('3A.4: only one follow-up per day even when two threads are ready', len([e for e in s['events'] if e['type']=='threadFollowUp' and e['status']=='Open'])==1)
    await T(pg,f"eventChoice('{ev[0]['id']}','share')"); s=await st(pg)
    check('3A.4: an exam follow-up quotes the real score', ('you got 91' in s['log'][0]['text']) or ('you got 74' in s['log'][0]['text']), s['log'][0]['text'])
    await nextday(pg); ev=await fu(pg,fid); check('3A.4: the second thread is followed up on a later day', bool(ev))
    errs+=pg.errs; await pg.close()
    # contest: missed / withdrawn; postponed exam stays pending
    pg,fid=await setup(b); s=await st(pg); d=(dt.date.fromisoformat(s['clock']['dateISO'])+dt.timedelta(days=6)).isoformat()
    await M(pg,f"S.school.contests=S.school.contests||[];S.school.contests.unshift({{id:'qc1',name:'Science Fair',status:'Registered',eventDate:'{d}',decisionDate:'{d}',createdDate:S.clock.dateISO,prep:0,result:null}},{{id:'qc2',name:'Poetry Slam',status:'Registered',eventDate:'{d}',decisionDate:'{d}',createdDate:S.clock.dateISO,prep:0,result:null}});S.exams.push({{id:'qx3',subject:'History',type:'Test',dateISO:'{d}',minute:600,endMinute:650,graceMinute:610,score:null,status:'Scheduled',prep:0}})")
    for ref in ('qc1','qc2','qx3'):
        i,_=await topic_idx(pg,lambda t,r=ref:t['ref']==r); await C(pg,'shareTopic',fid,i)
    pp=await person(pg,fid); check('3A.4: up to 3 open threads per person', len([x for x in pp['convThreads'] if x['status']=='open'])==3)
    await M(pg,"S.school.contests.find(c=>c.id==='qc1').status='No-show';S.school.contests.find(c=>c.id==='qc2').status='Withdrawn';S.exams.find(e=>e.id==='qx3').status='Make-up scheduled'")
    await nextday(pg); pp=await person(pg,fid); stv={x['ref']:x['status'] for x in pp['convThreads']}
    check('3A.4: missed and withdrawn contests become ready; a postponed exam stays open (no fake result)', stv.get('qc1')=='ready' and stv.get('qc2')=='ready' and stv.get('qx3')=='open', stv)
    oc={x['ref']:x['outcome'] for x in pp['convThreads'] if x.get('outcome')}
    check('3A.4: outcomes are the real ones (missed / withdrew)', oc['qc1']['state']=='missed' and 'withdrew' in oc['qc2']['text'], oc)
    st0=await st(pg); await pg.evaluate("s=>__LIFE_SIM_TEST__.loadState(s)",st0); pp2=await person(pg,fid)
    check('3A.4: threads persist across save/reload', pp2['convThreads']==pp['convThreads'])
    await M(pg,f"const p=S.people.find(x=>x.id==='{fid}');const t=p.convThreads.find(x=>x.ref==='qx3');t.dateISO='2000-01-01'")
    await nextday(pg); pp=await person(pg,fid); check('3A.4: a thread that never resolves expires when stale', [x['status'] for x in pp['convThreads'] if x['ref']=='qx3']==['expired'])
    await T(pg,"openTab('people')"); await pg.click(f"[data-person-open='{fid}']"); win=await pg.inner_text('#choice-content')
    check('3A.4: the person window shows what is on your mind / what they know', 'ON YOUR MIND' in win.upper())
    errs+=pg.errs; await pg.close()
    # support evidence → milestone after repeated hard moments
    pg,fid=await setup(b)
    for k in range(2):
        await C(pg,'thread','tryout',f'tryout-X{k}',f'Making the Team {k}'); i,_=await topic_idx(pg,lambda t,kk=k:t['ref']==f'tryout-X{kk}'); await C(pg,'shareTopic',fid,i)
        await M(pg,f"const t=S.threads.find(x=>x.key==='tryout-X{k}');t.stage='Not selected';t.resolved=true")
        for dd in range(3):
            await nextday(pg); ev=await fu(pg,fid)
            if ev: await T(pg,f"eventChoice('{ev[0]['id']}','share')"); break
    pp=await person(pg,fid); check('3A.4: a friend who supports you through hard moments earns a "Helped during a hard time" milestone', 'helped' in [m['type'] for m in pp.get('milestones',[])] and pp.get('supportEvidence',0)>=2, (pp.get('supportEvidence'),[m['type'] for m in pp.get('milestones',[])]))
    errs+=pg.errs; check('3A.4: no JS errors', not errs, errs[:3]); await b.close()
asyncio.run(main())
