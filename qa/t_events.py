from harness import *
import datetime as dt
async def C(pg,fn,*a): return await T(pg,"call("+",".join([json.dumps(fn)]+[json.dumps(x) for x in a])+")")
async def M(pg,code): return await pg.evaluate("c=>__LIFE_SIM_TEST__.mutate(c)",code)
async def go(pg,d,m=600):
    prev=(dt.date.fromisoformat(d)-dt.timedelta(days=1)).isoformat(); await T(pg,f"setClock('{prev}',1435)"); await T(pg,f"advanceMinutes({5+m})")
def find(s,name): return [c for c in s['school']['contests'] if c['name']==name]
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path=CHROME); pg=await new_page(b); await new_life(pg,dob='2008-03-10'); await T(pg,"setAge(14)")
    await go(pg,'2022-09-06'); s=await st(pg)
    mo=find(s,'Math Olympiad'); check('1B: major annual events publish themselves (no "Find event" needed)', len(mo)==1 and mo[0]['annual'] and len([c for c in s['school']['contests'] if c.get('annual')])>=6, [c['name'] for c in s['school']['contests'] if c.get('annual')])
    check('1B: they start as Upcoming with an opening date', mo[0]['status']=='Upcoming' and mo[0]['openDate']<mo[0]['decisionDate']<mo[0]['eventDate'])
    ev=dt.date.fromisoformat(mo[0]['eventDate']); a=await C(pg,'academicInfo',mo[0]['eventDate'])
    check('1B: Math Olympiad falls in semester 1 around week 9, on a school day', a['semester']==1 and 50<=(ev-dt.date.fromisoformat(a['start'])).days<=65 and await C(pg,'isSchoolDay',mo[0]['eventDate']), (mo[0]['eventDate'],a['start']))
    for i in range(3): await C(pg,'publishAnnualEvents')
    s=await st(pg); check('1B: once per school year (no duplicates)', len(find(s,'Math Olympiad'))==1)
    await T(pg,"setClock('2022-09-20',1000)"); n0=len(s['school']['contests']); await C(pg,'exploreSchoolEvent'); s=await st(pg)
    newn=[c['name'] for c in s['school']['contests'][:len(s['school']['contests'])-n0]]
    check('1B: "Find event" no longer creates the big annual events at random', not any(n in ('Math Olympiad','Science Fair','Debate Tournament','Talent Show','Coding Challenge') for n in newn), newn)
    # H: open → not participating → no penalty
    op=dt.date.fromisoformat(mo[0]['openDate']); await go(pg,op.isoformat()); s=await st(pg); mo=find(s,'Math Olympiad')[0]
    check('H: registration opens on schedule (with one notification)', mo['status']=='Open' and sum(1 for n in s['notifications'] if 'Math Olympiad' in n['title'])==1)
    beh=s['school']['behavior']; await C(pg,'contestAction',mo['id'],'decline'); s=await st(pg); mo=find(s,'Math Olympiad')[0]
    check('H: "Not participating" → Declined, no penalty', mo['status']=='Declined' and s['school']['behavior']==beh)
    await go(pg,mo['eventDate'],1000); await T(pg,"advanceMinutes(300)"); s=await st(pg); mo=find(s,'Math Olympiad')[0]
    check('H: someone who never registered did NOT "miss" it', mo['status']=='Declined' and not any(e['type']=='schoolEvent' and e['payload'].get('contestId')==mo['id'] and e['status'] in ('Missed','No-show') for e in s['calendar']))
    # do nothing → registration closed, one notice, cleared after ~2 days
    sf=[c for c in s['school']['contests'] if c.get('annual') and c['status'] in ('Upcoming','Open')]; t=sf[0]
    await go(pg,t['openDate']); await go(pg,(dt.date.fromisoformat(t['decisionDate'])+dt.timedelta(days=1)).isoformat()); s=await st(pg); t2=[c for c in s['school']['contests'] if c['id']==t['id']][0]
    closed=[n for n in s['notifications'] if n['title']=='Registration closed' and t['name'] in n['text']]
    check('H: doing nothing → "Registration Closed" (not Missed) with exactly one notification', t2['status']=='Registration Closed' and len(closed)==1, (t2['status'],len(closed)))
    await go(pg,(dt.date.fromisoformat(t['decisionDate'])+dt.timedelta(days=4)).isoformat()); s=await st(pg)
    active=[n for n in s['notifications'] if n['title']=='Registration closed' and t['name'] in n['text'] and n.get('status') not in ('Resolved','Expired')]
    check('H: the closed notice leaves the active list after ~2 days; the record stays', not active and any(c['id']==t['id'] and c['status']=='Registration Closed' for c in s['school']['contests']), [n.get('status') for n in s['notifications'] if t['name'] in n.get('text','')])
    # register → withdraw (no stale), register → no-show
    check('events (part 1): no JS errors', not pg.errs, pg.errs[:3]); await pg.close()
    pg=await new_page(b); await new_life(pg,dob='2008-03-10'); await T(pg,"setAge(14)"); await go(pg,'2023-01-26'); s=await st(pg)
    rest=sorted([c for c in s['school']['contests'] if c.get('annual') and c['status'] in ('Upcoming','Open')],key=lambda c:c['eventDate'])
    check('H setup: semester-2 events are waiting to open', len(rest)>=2, [c['name'] for c in rest])
    w,ns=rest[0],rest[1]
    await go(pg,w['openDate']); await C(pg,'contestAction',w['id'],'enter'); s=await st(pg)
    check('H: register', [c for c in s['school']['contests'] if c['id']==w['id']][0]['status']=='Registered')
    await C(pg,'withdrawContest',w['id']); s=await st(pg); w2=[c for c in s['school']['contests'] if c['id']==w['id']][0]; wev=[e for e in s['calendar'] if e['type']=='schoolEvent' and e['payload'].get('contestId')==w['id']]
    check('H: withdraw → Withdrawn, its calendar event cancelled (nothing stale)', w2['status']=='Withdrawn' and wev and all(e['status']=='Cancelled' for e in wev), (w2['status'],[e['status'] for e in wev]))
    if ns['openDate']>s['clock']['dateISO']: await go(pg,ns['openDate'])
    await C(pg,'contestAction',ns['id'],'enter'); s=await st(pg)
    nev=[e for e in s['calendar'] if e['type']=='schoolEvent' and e['payload'].get('contestId')==ns['id']][0]
    await go(pg,nev['dateISO'],420); await M(pg,"S.location='Home'"); await T(pg,"advanceMinutes(700)"); s=await st(pg)
    nev2=[e for e in s['calendar'] if e['id']==nev['id']][0]; ns2=[c for c in s['school']['contests'] if c['id']==ns['id']][0]
    check('H: registered but absent → No-show (now a real consequence)', nev2['status'] in ('No-show','Missed') or ns2['status']=='No-show', (nev2['status'],ns2['status']))
    # legacy 'Missed' for an unregistered contest is converted
    await M(pg,"S.school.contests.unshift({id:'old1',name:'Old Fair',status:'Missed',createdDate:S.clock.dateISO,decisionDate:S.clock.dateISO,eventDate:S.clock.dateISO,prep:0,result:null})"); await C(pg,'eventLifecycleTick'); s=await st(pg)
    check('1B migration: an old unregistered "Missed" becomes "Registration Closed"', [c for c in s['school']['contests'] if c['id']=='old1'][0]['status']=='Registration Closed')
    check('events: no JS errors', not pg.errs, pg.errs[:3]); await pg.close()
    # invitation throttle over 60 days
    pg=await new_page(b); await new_life(pg); await T(pg,"setAge(14)"); await M(pg,"S.people.filter(p=>p.role==='friend').forEach(p=>{p.rel=80;p.battery=90});S.inviteLog=[]")
    s=await st(pg); fr=[x for x in s['people'] if x['role']=='friend']; start=s['clock']['dateISO']
    for d in range(60):
        await T(pg,"advanceMinutes(1440)")
        for x in fr: await C(pg,'npcInvitesPlayer',x['id'])
    s=await st(pg); L=s.get('inviteLog',[])
    days=lambda a,b:(dt.date.fromisoformat(b)-dt.date.fromisoformat(a)).days
    weeks=max(len([x for x in L if 0<=days(x['dateISO'],y['dateISO'])<7]) for y in L) if L else 0
    check('1B: even with every friend trying every day, at most 3 invitations in any 7 days', 0<len(L) and weeks<=3, (len(L),weeks))
    same=any(a['personId']==b2['personId'] and a is not b2 and 0<=days(a['dateISO'],b2['dateISO'])<5 for a in L for b2 in L if a['dateISO']<=b2['dateISO'] and a!=b2)
    check('1B: the same friend does not invite again within 5 days', not same)
    sl=[x['dateISO'] for x in L if x['type']=='sleepover']; check('1B: sleepover invitations at least ~25 days apart', all(days(sl[i],sl[i+1])>=25 for i in range(len(sl)-1)), sl)
    check('1B: invitations over 60 days look natural (~4–26)', 4<=len(L)<=26, len(L))
    check('throttle: no JS errors', not pg.errs, pg.errs[:3]); await b.close()
asyncio.run(main())
