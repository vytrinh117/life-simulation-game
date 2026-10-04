from harness import *
import datetime as dt
async def C(pg,fn,*a): return await T(pg,"call("+",".join([json.dumps(fn)]+[json.dumps(x) for x in a])+")")
async def M(pg,code): return await pg.evaluate("c=>__LIFE_SIM_TEST__.mutate(c)",code)
async def sess(pg): return (await st(pg)).get('ffSession')
async def drive(pg,soft='decline',hard='simulate',limit=40,log=None):
    seen=[]
    for i in range(limit):
        s=await sess(pg)
        if not s: break
        if s['status']!='paused': break
        seen.append((s['pause']['tier'],s['pause']['title'],s['target']))
        btns=await pg.evaluate("[...document.querySelectorAll('#choice-content [data-ffp]')].map(b=>b.dataset.ffp)")
        if log is not None: log.append((s['pause']['tier'],btns))
        nsoft=sum(1 for x in seen if x[0]=='soft')
        await C(pg,'ffPauseChoice',(soft if nsoft<=1 else 'autoAll') if s['pause']['tier']=='soft' else hard)
    return seen
async def setup(b,date='2022-10-03',age=12):
    pg=await new_page(b); await new_life(pg,dob='2010-03-10'); await T(pg,f"setAge({age})"); await T(pg,f"setClock('{date}',1200)")
    await M(pg,"S.events.forEach(e=>{if(e.status==='Open')e.status='Resolved'});S.inviteLog=[];S.people.filter(p=>p.role==='friend').forEach(p=>{p.rel=82;p.battery=95})"); return pg
ERR=[]
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path=CHROME)
    # targets are context-aware
    pg=await setup(b); tg={k:(l,d) for k,l,d in await C(pg,'ffTargets')}
    check('F: during term the menu offers Next school term and Start of next school year (no generic "season")', 'nextTerm' in tg and 'yearStart' in tg and 'endBreak' not in tg and not any('eason' in l for l,_ in tg.values()), list(tg))
    await T(pg,"setClock('2022-07-12',1200)"); tg2={k:(l,d) for k,l,d in await C(pg,'ffTargets')}
    check('F: in summer it offers "End of summer break (classes resume)" on the first school day', 'endBreak' in tg2 and 'summer break' in tg2['endBreak'][0] and await C(pg,'isSchoolDay',tg2['endBreak'][1]), tg2.get('endBreak'))
    ERR.extend(pg.errs); await pg.close()
    # F: soft → decline & continue; hard → simulate & continue; reach the ORIGINAL target
    pg=await setup(b); target=dict((k,d) for k,l,d in await C(pg,'ffTargets'))['nextTerm']
    await C(pg,'fastForward','nextTerm'); opts=[]; seen=await drive(pg,log=opts); s=await st(pg)
    check('F: the run paused at least once on the way (real interruptions happened)', len(seen)>=1, len(seen))
    check('F: every pause kept the ORIGINAL destination', all(x[2]==target for x in seen), set(x[2] for x in seen))
    check('F: after handling pauses it reaches the original target (Next school term)', s['clock']['dateISO']>=target and not s.get('ffSession'), (s['clock']['dateISO'],target))
    soft=[o for t,o in opts if t=='soft']; hard=[o for t,o in opts if t=='hard']
    check('F: soft interrupts offer Respond / Decline & continue / Let your character decide / Decide for the rest', soft and all(set(o)=={'respond','decline','auto','autoAll'} for o in soft), soft[:1])
    check('F: after "decide for the rest", invitations stop pausing the run (no bombardment)', sum(1 for x in seen if x[0]=='soft')<=3, [x[0] for x in seen])
    check('F: hard interrupts offer Play / Simulate & continue / Cancel', not hard or all(set(o)=={'play','simulate','cancel'} for o in hard), hard[:1])
    txt=await pg.inner_text('#choice-content'); check('F: a grouped summary at the end (reached target, money, interruptions)', 'Fast forward complete' in await pg.inner_text('#choice-title') and 'reached' in txt and 'MONEY' in txt.upper() and 'INTERRUPTIONS' in txt.upper(), txt[:150])
    check('F: hard pauses that were simulated left nothing due/stale', not any(e['status']=='Due' and e['dateISO']<s['clock']['dateISO'] and e['type'] in ('exam','schoolEvent','tryout','prom') for e in s['calendar']))
    ERR.extend(pg.errs); await pg.close()
    # respond → session stays paused → Continue resumes to the original target; survives save/reload
    pg=await setup(b); await C(pg,'fastForward','month'); s0=await sess(pg); tries=0
    while s0 and s0['status']=='paused' and s0['pause']['tier']!='soft' and tries<15: await C(pg,'ffPauseChoice','simulate'); s0=await sess(pg); tries+=1
    if s0 and s0['status']=='paused':
        tgt=s0['target']; await C(pg,'ffPauseChoice','respond'); s1=await sess(pg)
        check('F: "Stop & respond" keeps the session paused (not lost)', s1 and s1['status']=='paused' and s1['target']==tgt)
        await T(pg,"openTab('home')"); cls=await pg.evaluate("document.getElementById('ff-btn').className+'|'+document.getElementById('ff-btn').textContent")
        check('F: the Fast forward button shows the paused destination', 'ff-paused' in cls and '→' in cls, cls)
        state=await st(pg); await pg.evaluate("s=>__LIFE_SIM_TEST__.loadState(s)",state); s2=await sess(pg)
        check('F: the paused session survives save/reload', s2 and s2['target']==tgt and s2['status']=='paused')
        e=[x for x in (await st(pg))['events'] if x['id']==s1['pause'].get('event')]
        if e and e[0]['status']=='Open': await T(pg,f"eventChoice('{e[0]['id']}','{e[0]['choices'][0]['id']}')")
        await C(pg,'ffContinue'); await drive(pg); s=await st(pg)
        check('F: Continue really continues to the original destination (not just closing the dialog)', s['clock']['dateISO']>=tgt and not s.get('ffSession'), (s['clock']['dateISO'],tgt))
    else: check('F: (no soft interruption occurred this month to test Respond/Continue)', False, s0)
    ERR.extend(pg.errs); await pg.close()
    # cancel
    pg=await setup(b); tgt=dict((k,d) for k,l,d in await C(pg,'ffTargets'))['nextTerm']; await C(pg,'fastForward','nextTerm'); s0=await sess(pg)
    if s0 and s0['status']=='paused':
        await C(pg,'ffPauseChoice','cancel'); s=await st(pg); check('F: Cancel ends the session before the target', not s.get('ffSession') and s['clock']['dateISO']<tgt and 'cancelled' in (await pg.inner_text('#choice-title')).lower())
    ERR.extend(pg.errs); await pg.close()
    # Next month simulates real days; routine shapes them
    res={}
    for lvl in ['low','high']:
        pg=await setup(b); await M(pg,f"S.routine={{study:'{lvl}',exercise:'{lvl}',social:'normal',spending:'balanced',bedtime:'normal',free:'mixed'}};S.people.filter(p=>p.role==='friend').forEach(p=>{{p.rel=30}})")
        d0=(await st(pg))['clock']['dateISO']; await C(pg,'fastForward','month'); await drive(pg,soft='decline',hard='simulate')
        s=await st(pg); txt=await pg.inner_text('#choice-content')
        sdays=[e for e in s['calendar'] if e['type']=='schoolDay' and d0<e['dateISO']<s['clock']['dateISO']]
        att=[e for e in sdays if e['status'] in ('Attended','Late','Tardy','Excused')]
        res[lvl]=(txt,len(att) if len(att)==len(sdays) else str([(e['dateISO'],e['status'],e.get('attendanceStatus')) for e in sdays if e not in att]),(dt.date.fromisoformat(s['clock']['dateISO'])-dt.date.fromisoformat(d0)).days); ERR.extend(pg.errs); await pg.close()
    check('F: Next month really simulates ~a month of days, and every school day in it was attended or excused (none skipped/left due)', res['high'][2]>=27 and res['high'][1]>=10, res['high'][1:])
    check('F: routine matters — "high" study/exercise appears in the summary, "low" does not', 'Studied' in res['high'][0] and 'Studied' not in res['low'][0], (res['high'][0][:200],))
    check('F: no JS errors on any page in this suite', not ERR, ERR[:3]); await b.close()
asyncio.run(main())
