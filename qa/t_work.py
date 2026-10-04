from harness import *
import datetime as dt
async def C(pg,fn,*a): return await T(pg,"call("+",".join([json.dumps(fn)]+[json.dumps(x) for x in a])+")")
async def M(pg,code): return await pg.evaluate("c=>__LIFE_SIM_TEST__.mutate(c)",code)
async def go(pg,d,m=480):
    prev=(dt.date.fromisoformat(d)-dt.timedelta(days=1)).isoformat(); await T(pg,f"setClock('{prev}',1435)"); await T(pg,f"advanceMinutes({5+m})")
def weekday(d0,skip=0):
    d=dt.date.fromisoformat(d0)+dt.timedelta(days=1)
    while d.weekday()>=5 or skip>0:
        if d.weekday()<5: skip-=1
        d+=dt.timedelta(days=1)
    return d.isoformat()
async def job(pg): return (await st(pg))['career']['job']
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path=CHROME); pg=await new_page(b); await new_life(pg,dob='2000-03-10'); await T(pg,"setAge(23)"); await T(pg,"setMoney(100,0,0)")
    await M(pg,"S.education.degree={school:'Marlow University',gpa:3.5,dateISO:S.clock.dateISO};S.finance.uniDebt=10000;S.events.forEach(e=>{if(e.status==='Open')e.status='Resolved'})")
    await C(pg,'startCareer','developer'); j=await job(pg); s=await st(pg)
    check('V2: with a degree from a top school you start above Intern', j['level']==2 and j['title'].startswith('Associate'), j['title'])
    boss=[x for x in s['people'] if x['id']==j['bossId']][0]; check('V2: your manager and coworkers are real people with relationship bars', boss['roleLabel'].startswith('your manager') and len(j['coworkerIds'])==2)
    d=weekday(s['clock']['dateISO']); await go(pg,d,470); ev=await C(pg,'ensureWorkday',d)
    check('V2: a workday on the calendar (9:00–5:00) on weekdays', ev and ev['startMinute']==540 and ev['endMinute']==1020)
    sat=dt.date.fromisoformat(d)
    while sat.weekday()!=5: sat+=dt.timedelta(days=1)
    check('V2: no work on weekends', await C(pg,'ensureWorkday',sat.isoformat()) is None)
    await T(pg,"advanceMinutes(72)"); hero=await pg.inner_text('#event-title'); btn=await pg.query_selector("[data-work='normal']")
    check('V2: at 9:00 the workday takes the hero with a Go to work button', 'Work' in hero and btn is not None, hero)
    s=await st(pg); b0=[x for x in s['people'] if x['id']==j['bossId']][0]['rel']; p0=j['points']
    await C(pg,'goToWork','focus'); s=await st(pg); j=await job(pg); ev=[e for e in s['calendar'] if e['id']==f'work-{d}'][0]
    check('V2: going to work → attended, job points and manager closeness up, time to 5 PM', ev['status']=='Attended' and j['points']>p0 and [x for x in s['people'] if x['id']==j['bossId']][0]['rel']>b0 and s['clock']['minute']>=1020)
    d2=weekday(d); await go(pg,d2,600); b0=[x for x in (await st(pg))['people'] if x['id']==j['bossId']][0]['rel']; await C(pg,'goToWork','normal'); s=await st(pg); ev=[e for e in s['calendar'] if e['id']==f'work-{d2}'][0]
    check('V2: arriving after 9:15 counts as late (manager notices)', ev['attendanceStatus']=='Tardy' and [x for x in s['people'] if x['id']==j['bossId']][0]['rel']<b0)
    d3=weekday(d2); await go(pg,d3,420); await C(pg,'callInSick'); j=await job(pg); s=await st(pg)
    check('V2: calling in sick uses a sick day and is excused', j['sickLeft']==4 and [e for e in s['calendar'] if e['id']==f'work-{d3}'][0]['status']=='Excused')
    d4=weekday(d3); await go(pg,d4,420); await C(pg,'takeLeave','today'); j=await job(pg); check('V2: taking the day off uses paid leave', j['leaveLeft']==11)
    await C(pg,'takeLeave','tomorrow'); j=await job(pg); d5=weekday(d4); s=await st(pg)
    check('V2: requesting tomorrow off in advance', j['leaveLeft']==10 and [e for e in s['calendar'] if e['id']==f'work-{d5}'][0]['status']=='Excused')
    d6=weekday(d5); pf=(await st(pg))['career']['performance']; await go(pg,d6,700); s=await st(pg); ev=[e for e in s['calendar'] if e['id']==f'work-{d6}'][0]
    check('V2: not showing up by 11:00 → no-show (performance −10)', ev['status']=='Missed' and s['career']['performance']<=pf-9, (ev['status'],pf,s['career']['performance']))
    # promotion & raise
    await C(pg,'requestPromotion'); j=await job(pg); check('V2: no promotion request before the job-points bar is full', j['level']==2)
    await M(pg,f"S.career.job.points=100;S.career.performance=95;const b=S.people.find(x=>x.id==='{j['bossId']}');b.rel=95;b.trust=95;S.career.job.start='2000-01-01'")
    sal=j['salary']; await C(pg,'requestPromotion'); j=await job(pg); check('V2: a full bar + strong performance + a good manager relationship → promotion and a raise in salary', j['level']==3 and j['salary']>sal and j['title'].startswith('Senior'), (j['level'],j['title']))
    await M(pg,"S.career.job.points=100"); await C(pg,'requestPromotion'); j=await job(pg); check('V2: promotion requests have a 60-day cooldown', j['level']==3)
    await C(pg,'requestRaise'); s1=(await job(pg))['salary']; check('V2: raises only every 6 months', s1==j['salary'])
    await M(pg,"S.career.job.lastRaise='2000-01-01';S.career.performance=100"); raised=False
    for i in range(4):
        await M(pg,"S.career.job.lastRaise='2000-01-01'"); before=(await job(pg))['salary']; await C(pg,'requestRaise')
        if (await job(pg))['salary']>before: raised=True; break
    check('V2: asking for a raise after 6 months can raise the salary (3–8%)', raised)
    await M(pg,f"S.career.job.level=8;S.career.job.points=100;S.career.job.lastPromoAsk=null;S.career.performance=100;const b=S.people.find(x=>x.id==='{j['bossId']}');b.rel=100;b.trust=100")
    for i in range(4):
        await M(pg,"S.career.job.lastPromoAsk=null;S.career.job.points=100"); await C(pg,'requestPromotion')
        if (await job(pg))['level']==9: break
    j=await job(pg); check('V2: the ladder tops out at CEO', j['level']==9 and j['title']=='CEO', j['title'])
    # payday
    await M(pg,"S.career.job.monthLog={worked:18,paidOff:2,unpaid:2};S.money=0;S.finance.uniDebt=10000"); s=await st(pg); first=(dt.date.fromisoformat(s['clock']['dateISO']).replace(day=1)+dt.timedelta(days=32)).replace(day=1).isoformat()
    await go(pg,first,300); s=await st(pg); j=await job(pg)
    exp=round(j['salary']*20/22); loan=min(10000,round(exp*.05))
    check('V2: monthly salary on the 1st, minus unpaid days', abs(s['money']-(exp-loan))<=2, (s['money'],exp,loan))
    check('V2: student loan repaid from salary (interest-free)', s['finance']['uniDebt']==10000-loan)
    await T(pg,"openTab('career')"); txt=await pg.inner_text('#panel-host'); check('V2: work panel shows level, salary, job points, manager & coworkers', 'Level' in txt and '/month' in txt and 'Job points' in txt and 'Manager' in txt)
    # 3 no-shows → fired
    await M(pg,"S.career.job.noShows=[S.clock.dateISO,S.clock.dateISO];S.career.performance=60")
    dd=weekday((await st(pg))['clock']['dateISO']); await go(pg,dd,700); s=await st(pg)
    check('V2: three no-shows in a month → fired', s['career']['job'] is None and s['outcomes'][0]['result']=='Fired')
    check('V2: no JS errors', not pg.errs, pg.errs[:3]); await pg.close()
    # quit + FF autopilot + teen part-time unchanged
    pg=await new_page(b); await new_life(pg,dob='2000-03-10'); await T(pg,"setAge(22)"); await M(pg,"S.events.forEach(e=>{if(e.status==='Open')e.status='Resolved'})")
    await C(pg,'startCareer','office'); j=await job(pg); check('V2: without a degree you start as an Intern', j['level']==0 and j['title'].startswith('Intern'))
    d=weekday((await st(pg))['clock']['dateISO']); await go(pg,d,300); w0=(await job(pg))['monthLog']['worked']
    await M(pg,"S.events.forEach(e=>{if(e.status==='Open')e.status='Resolved'})"); await C(pg,'fastForward','week'); w1=(await job(pg))['monthLog']['worked']
    check('V2: Fast Forward goes to work on autopilot', w1>w0, (w0,w1))
    await T(pg,"call('closeChoiceModal')"); await T(pg,"openTab('career')"); await pg.click("[data-act='quitJob']"); s=await st(pg)
    check('V2: quitting cancels upcoming workdays', s['career']['job'] is None and not any(e['type']=='workDay' and e['status'] in ('Scheduled','Due') for e in s['calendar']))
    await pg.close()
    pg=await new_page(b); await new_life(pg); await T(pg,"setAge(16)")
    await M(pg,"S.career.job={id:'cafe',title:'Cafe assistant',pay:14,hours:4,performance:50,manager:'Morgan',coworkers:[]}")
    await T(pg,"openTab('career')"); txt=await pg.inner_text('#panel-host'); check('V2: teen part-time jobs keep the hourly shift system', 'Work shift' in txt and '/hr' in txt)
    check('teen: no JS errors', not pg.errs, pg.errs[:3]); await b.close()
asyncio.run(main())
