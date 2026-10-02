from harness import *
async def life(b,place,dob='2003-04-10',w=1440,h=900):
    pg=await new_page(b,w,h); await pg.fill('#c-place',place); await new_life(pg,dob=dob); return pg
async def C(pg,fn,*a): return await T(pg,"call("+",".join([repr(fn)]+[repr(x) for x in a])+")")
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path=CHROME)
    pg=await life(b,'Ho Chi Minh City, Vietnam')
    lny={2010:'2010-02-14',2011:'2011-02-03',2024:'2024-02-10',2025:'2025-01-29'}
    for y,d in lny.items(): check(f'54 Lunar New Year {y} (VN)', await C(pg,'lunarNewYearDate',y,'VN')==d)
    check('54 Lunar 2007 regional difference VN/CN', await C(pg,'lunarNewYearDate',2007,'VN')=='2007-02-17' and await C(pg,'lunarNewYearDate',2007,'CN')=='2007-02-18')
    import datetime as dt
    approx=await C(pg,'lunarNewYearDate',2051,'CN'); check('54 Lunar fallback outside table within ±1 day (2051-02-11)', abs((dt.date.fromisoformat(approx)-dt.date(2051,2,11)).days)<=1, approx)
    for y,d in {2011:'2011-04-24',2024:'2024-03-31',2025:'2025-04-20',2019:'2019-04-21'}.items(): check(f'54 Easter {y}', await C(pg,'easterDate',y)==d)
    s=await st(pg); check('54 VN profile detected', s['calendarProfile']['region']=='VN')
    names=lambda arr:[x['h']['name'] for x in arr]
    on=await C(pg,'holidaysOn','2011-11-20'); check("54 Teachers' Day Nov 20 (VN)", "Teachers' Day" in names(on))
    on=await C(pg,'holidaysOn','2011-11-24'); check('54 VN family does not get Thanksgiving forced on it', 'Thanksgiving' not in names(on))
    on=await C(pg,'holidaysOn','2011-02-04'); check('54 Lunar New Year lasts 3 days (day 2)', any(x['h']['name']=='Lunar New Year' and x['day']==2 for x in on))
    for d,n in [('2011-01-01','New Year'),('2011-02-14',"Valentine's Day"),('2011-03-08',"International Women's Day"),('2011-10-20',"Vietnamese Women's Day")]:
        check(f'54 {n} on {d}', n in names(await C(pg,'holidaysOn',d)))
    check('VN: no JS errors', not pg.errs, pg.errs[:2]); await pg.close()
    # ---- US profile ----
    pg=await life(b,'New York City, USA')
    for d,n in [('2011-05-08',"Mother's Day"),('2011-06-19',"Father's Day"),('2011-11-24','Thanksgiving'),('2011-10-31','Halloween'),('2011-05-03',"Teachers' Day")]:
        check(f'54 US {n} on {d}', n in names(await C(pg,'holidaysOn',d)))
    check('54 US: Lunar New Year not forced (unless family tradition)', ('Lunar New Year' in names(await C(pg,'holidaysOn','2011-02-03')))==bool((await st(pg))['traditions']['lunarNewYear']))
    await pg.close()
    for place,d,n in [('London, UK','2011-04-03',"Mother's Day"),('Sydney, Australia','2011-09-04',"Father's Day"),('Vancouver, Canada','2011-10-10','Thanksgiving'),('Seoul, South Korea','2011-05-15',"Teachers' Day")]:
        pg=await life(b,place); check(f'54 {place.split(",")[-1].strip()} {n} {d}', n in names(await C(pg,'holidaysOn',d))); await pg.close()
    # ---- Halloween gameplay (US, age 8) ----
    pg=await life(b,'New York City, USA',dob='2003-04-10'); await T(pg,"setAge(8)")
    await T(pg,"setClock('2011-10-30',1430)"); await T(pg,"advanceMinutes(20)"); s=await st(pg)
    trig=[l for l in s['log'] if 'Halloween' in l['title']]
    check('54 Halloween triggers once at the date change', len(trig)==1, [l['title'] for l in trig])
    await T(pg,"reconcile()"); await T(pg,"advanceMinutes(30)"); s=await st(pg)
    check('54 no duplicate trigger', len([l for l in s['log'] if l['title']=='🎃 Halloween'])==1)
    await T(pg,"setClock('2011-10-31',1000)"); await T(pg,"openTab('home')")
    html=await pg.inner_text('#panel-host'); check('25 Halloween activities offered on Home', 'trick-or-treating' in html.lower(), html[:150])
    hero=await pg.inner_text('#event-title'); check('34 hero adapts to the holiday', 'Halloween' in hero, hero)
    await C(pg,'doHolidayActivity','halloween:trickOrTreat'); s=await st(pg)
    candy=sum(i['quantity'] for i in s['inventoryItems'] if i['key']=='candyBag')
    check('25 trick-or-treat gives candy + a story', candy>=2 and 'trick-or-treat' in s['log'][0]['title'].lower(), (candy,s['log'][0]['title']))
    await C(pg,'doHolidayActivity','halloween:trickOrTreat'); s2=await st(pg)
    check('25 an activity happens once per holiday', sum(i['quantity'] for i in s2['inventoryItems'] if i['key']=='candyBag')==candy)
    await T(pg,"openTab('business')"); await pg.click("[data-subtab='shop']"); shop=await pg.inner_text('#panel-host')
    check('48 seasonal items appear before/at the holiday (not required)', 'Costume' in shop)
    await T(pg,"setClock('2011-12-01',600)"); await T(pg,"openTab('business')"); await pg.click("[data-subtab='shop']"); shop=await pg.inner_text('#panel-host')
    check('48 out-of-season costume is not sold in December', 'Costume' not in shop)
    # month calendar
    await T(pg,"openTab('calendar')"); await pg.click("[data-subtab='month']")
    cells=await pg.query_selector_all('.cal-grid:not(.mini) .cal-cell:not(.is-empty)'); check('26 month grid has 31 day cells (Dec)', len(cells)==31, len(cells))
    await pg.click("[data-cal-month='1']"); title=await pg.inner_text('.cal-nav h3'); check('26 next month navigation', 'January' in title and '2012' in title, title)
    await pg.click("[data-cal-today]"); await pg.click("[data-cal-month='-1']"); await pg.click("[data-cal-day='2011-11-24']")
    ag=await pg.inner_text('.cal-agenda'); check('26 clicking a date shows its agenda (Thanksgiving)', 'Thanksgiving' in ag, ag[:120])
    hasIcon=await pg.evaluate("!!document.querySelector(\"[data-cal-day='2011-11-24'] .cal-hol\")"); check('54 month grid marker for the holiday', hasIcon)
    # forgotten Mother's Day
    await T(pg,"setClock('2012-05-12',1300)"); s0=await st(pg); mom=[x for x in s0['people'] if x['name']=='Mom'][0]['rel']
    await T(pg,"advanceMinutes(1440*2)"); s=await st(pg); mom2=[x for x in s['people'] if x['name']=='Mom'][0]['rel']
    check("25 forgetting Mother's Day is noticed (gently)", any("Forgot Mother's Day" in l['title'] for l in s['log']), mom2-mom)
    check('holidays: no JS errors', not pg.errs, pg.errs[:3]); await pg.close()
    # ---- Planner & sub-tabs ----
    pg=await life(b,'New York City, USA',w=1920,h=1080); await T(pg,"setAge(9)")
    vis=await pg.is_visible('#planner'); txt=await pg.inner_text('#planner')
    check('27 planner visible on 1920 wide (Today/Next up/Holidays)', vis and 'today' in txt.lower() and 'holidays' in txt.lower())
    check('36 upcoming strip hidden where planner shows', not await pg.is_visible('#upcoming-strip'))
    await pg.screenshot(path='/home/claude/tests/shot_planner_1920.png'); await pg.close()
    pg=await life(b,'New York City, USA',w=1366,h=768); await T(pg,"setAge(9)")
    check('27 planner hidden at 1366, button shown', not await pg.is_visible('#planner') and await pg.is_visible('#planner-btn'))
    await pg.click('#planner-btn'); check('27 planner opens as slide-over', await pg.is_visible('#planner'))
    await pg.click('#planner .planner-close'); await T(pg,"openTab('school')")
    await pg.keyboard.press('2'); a=await pg.evaluate("document.querySelector('.subtab.active')?.dataset.subtab"); check('UX: key 2 switches to second sub-tab', a=='subjects', a)
    sh=await pg.evaluate("document.documentElement.scrollHeight"); check('UX: Education page height reduced (< 2.6 screens)', sh<768*2.6, sh)
    await pg.keyboard.press('1'); await pg.screenshot(path='/home/claude/tests/shot_school_tabs.png')
    await T(pg,"openTab('calendar')"); await pg.screenshot(path='/home/claude/tests/shot_calendar.png')
    check('UI: no overflow 1366', not await pg.evaluate("document.documentElement.scrollWidth>window.innerWidth+1"))
    check('planner/tabs: no JS errors', not pg.errs, pg.errs[:3]); await pg.close()
    pg=await life(b,'New York City, USA',w=390,h=844); await T(pg,"setAge(9)")
    for tab in ['home','school','calendar','business','places']:
        await T(pg,f"openTab('{tab}')"); ov=await pg.evaluate("document.documentElement.scrollWidth>window.innerWidth+1"); check(f'UI 390 {tab}: no overflow', not ov)
    await T(pg,"openTab('calendar')"); await pg.screenshot(path='/home/claude/tests/shot_calendar_mobile.png')
    check('mobile: no JS errors', not pg.errs, pg.errs[:3]); await b.close()
asyncio.run(main())
