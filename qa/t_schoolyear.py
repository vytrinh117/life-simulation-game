from harness import *
async def C(pg,fn,*a): return await T(pg,"call("+",".join([repr(fn)]+[repr(x) for x in a])+")")
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path=CHROME); pg=await new_page(b)
    await pg.evaluate('v=>{document.getElementById("c-place").value=v}','London, UK'); await new_life(pg,dob='2002-07-23')
    for age,grade,prom,junior in [(12,7,False,None),(13,8,True,True),(14,9,True,True),(15,10,True,False),(16,11,True,False),(17,12,True,False)]:
        await T(pg,f"setAge({age})"); s=await st(pg); pr=s['school'].get('prom'); ev=[e for e in s['calendar'] if e['type']=='prom' and e['status']=='Scheduled']
        check(f'Grade {grade} (age {age}): prom {"planned on the calendar from day one" if prom else "not offered"}', (bool(pr) and len(ev)==1)==prom, (s['school']['grade'],pr and pr['dateISO']))
        if prom:
            import datetime as dt; d=dt.date.fromisoformat(pr['dateISO'])
            check(f'Grade {grade}: prom on a late-April Saturday (mid second half)', d.month==4 and d.weekday()==5 and d.day>=24, pr['dateISO'])
            check(f'Grade {grade}: {"Junior Prom" if junior else "Prom"} naming', pr['junior']==junior and ev[0]['title']==('Junior Prom' if junior else 'Prom'))
        ok=await pg.evaluate("__LIFE_SIM_TEST__.getState().school&&true")
        await C(pg,'startElection',{'scope':'council','name':'Student Council','position':'Class representative'}); s=await st(pg)
        live=[e for e in s.get('elections',[]) if e['status']=='Campaign']
        allowed=grade==8 or grade>=10
        check(f'Grade {grade}: elections {"open" if allowed else "closed"}', bool(live)==allowed, len(live))
        await M(pg,"S.elections=[]") if False else await pg.evaluate("c=>__LIFE_SIM_TEST__.mutate(c)","S.elections=[];S.calendar=S.calendar.filter(e=>e.type!=='election');S.followUps=S.followUps.filter(f=>f.type!=='electionResult')")
    await T(pg,"setAge(18)"); s=await st(pg)
    check('No repeated Grade 12: school ends at 18 with a high-school graduation', s['school'] is None and any(g['stage']=='high' for g in s.get('education',{}).get('graduations',[])))
    await pg.close()
    for dob in ['2002-04-20','2002-04-29','2002-05-01','2002-01-10','2002-10-05','2002-12-31']:
        pg=await new_page(b); await new_life(pg,dob=dob); await T(pg,"setAge(16)"); s=await st(pg); pr=s['school'].get('prom')
        check(f'Birthday {dob[5:]}: grade 11 still gets a prom inside the school year', pr and s['school']['yearStarted']<pr['dateISO'], pr and (s['school']['yearStarted'],pr['dateISO']))
        await pg.close()
    pg=await new_page(b); await new_life(pg); await T(pg,"setAge(15)")
    await T(pg,"openTab('school')"); tabs=await pg.evaluate("[...document.querySelectorAll('.subtab')].map(x=>x.dataset.subtab)")
    check('Attendance is its own Education tab', 'attendance' in tabs, tabs)
    await pg.click("[data-subtab='attendance']"); txt=await pg.inner_text('#panel-host')
    check('Attendance tab shows this year + history', 'Days attended' in txt and 'Unexcused' in txt and ('ATTENDANCE HISTORY' in txt.upper()))
    await T(pg,"openTab('calendar')"); await pg.click("[data-subtab='history']"); txt=await pg.inner_text('#panel-host')
    check('Calendar History no longer contains attendance', 'Days attended' not in txt)
    s=await st(pg); end=await pg.evaluate("(()=>{const S=__LIFE_SIM_TEST__.getState();return S.school.yearStarted})()")
    check('no JS errors', not pg.errs, pg.errs[:2]); await b.close()
asyncio.run(main())
