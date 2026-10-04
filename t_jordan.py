from harness import *
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path=CHROME); pg=await new_page(b)
    fx=json.load(open('fixture_player_save_v72.json'))
    await pg.evaluate("s=>__LIFE_SIM_TEST__.loadState(s)",fx); s=await st(pg)
    check('J: loads without errors', not pg.errs, pg.errs[:3])
    check('J: Grade 1 at a primary school (not Secondary)', 'Secondary' not in s['school']['name'] and s['school']['grade']=='Grade 1', s['school']['name'])
    g=s.get('education',{}).get('graduations',[])
    check('J: kindergarten graduation milestone with year', any(x['stage']=='kindergarten' and x['year']==2010 for x in g), g)
    check('J: milestone visible in journal', any('Finished kindergarten' in m['title'] for m in s['milestones']))
    dates=[e['dateISO'] for e in s['exams'] if e['status']=='Scheduled']
    check('J: assessments no longer stacked on one day', len(dates)==len(set(dates)), sorted(dates))
    await T(pg,"openTab('world')"); await pg.click("[data-subtab='journal']"); txt=await pg.inner_text('#panel-host')
    check('J: Journal tab shows education history', 'Finished kindergarten' in txt, txt[:200])
    # next school day: interactive session
    import datetime as dt
    d=dt.date.fromisoformat(s['clock']['dateISO'])+dt.timedelta(days=1)
    while not await T(pg,f"call('isSchoolDay','{d.isoformat()}')"): d+=dt.timedelta(days=1)
    await T(pg,f"setClock('{d.isoformat()}',460)"); await T(pg,"openTab('school')")
    await pg.click("#panel-host [data-act='school']"); s=await st(pg)
    sd=[c for c in s['calendar'] if c['type']=='schoolDay' and c['dateISO']==d.isoformat()][0]
    check('J: check-in records attendance and keeps time running (morning, not 3 PM; a random late arrival has a reason)', sd['status']=='Attending' and 480<=s['clock']['minute']<600 and s['location']=='School' and (s['clock']['minute']<=495 or bool(sd.get('lateReason'))), (sd['status'],s['clock']['minute'],sd.get('lateReason')))
    hero=await pg.inner_text('#event-title'); check('J: hero shows current period', 'Period 1' in hero, hero)
    await pg.click("#panel-host [data-class='participate']"); s=await st(pg)
    check('J: a class period takes one period of time', s['clock']['minute']==540, s['clock']['minute'])
    await T(pg,"action('shower')"); s2=await st(pg)
    check('J: home-only actions are blocked at school', s2['clock']['minute']==540)
    await pg.click("#panel-host [data-class='attend']"); await pg.click("#panel-host [data-class='chat']")
    s=await st(pg); check('J: lunch period reached at 11:00', s['clock']['minute']==660, s['clock']['minute'])
    await pg.click("#panel-host [data-lunch='eat']"); await pg.click("#panel-host [data-lunch='friend']")
    await pg.click("#panel-host [data-school-skip]"); s=await st(pg)
    sd=[c for c in s['calendar'] if c['type']=='schoolDay' and c['dateISO']==d.isoformat()][0]
    check('J: skip to dismissal ends the day as Attended at 3 PM', sd['status']=='Attended' and s['clock']['minute']==900 and s['location']=='Home', (sd['status'],s['clock']['minute']))
    check('J: no JS errors in session', not pg.errs, pg.errs[:3])
    await pg.screenshot(path='/home/claude/tests/shot_j_after.png')
    await b.close()
asyncio.run(main())
