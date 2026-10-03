from harness import *
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path=CHROME)
    # ---- 50: Kindergarten regression from real v7.1 save ----
    pg=await new_page(b); fx=json.load(open('/home/claude/tests/fixture_kinder_v71.json'))
    check('fixture really stale (v7.1)', any(x['type']=='kindergarten' and not x['resolved'] for x in fx['pendingDecisions']) and fx['age']==6)
    await pg.evaluate("s=>__LIFE_SIM_TEST__.loadState(s)",fx)
    s=await st(pg)
    kg=[x for x in s['pendingDecisions']+s['archive']['pending'] if x['type']=='kindergarten']
    check('KG: Grade 1 intact', s['school'] and s['school']['grade']=='Grade 1', s['school'] and s['school']['grade'])
    check('KG: not active', not any(not x['resolved'] for x in kg))
    check('KG: resolved as Superseded w/ reason', kg and kg[0]['status']=='Superseded' and kg[0]['resolutionReason']=='Primary school age reached', kg and (kg[0]['status'],kg[0]['resolutionReason']))
    check('KG: version 7.3', s['version']==7.3)
    check('KG: journal entry kept', any('Kindergarten question closed' in l['title'] for l in s['log']))
    await T(pg,"openTab('home')"); html=await pg.inner_text('#panel-host')
    check('KG: UI pending list clean', 'Kindergarten decision' not in html)
    await T(pg,"openTab('calendar')"); html=await pg.inner_text('#panel-host')
    check('KG: calendar has no active kindergarten wait', 'Waiting for your preference' not in html)
    await pg.reload(); await pg.click('#load-last'); s=await st(pg)
    check('KG: stays resolved after reload', not any(x['type']=='kindergarten' and not x['resolved'] for x in s['pendingDecisions']))
    check('KG: no JS errors', not pg.errs, pg.errs)
    await pg.close()
    # ---- Stale exam/calendar mismatch from real v7.1 save ----
    pg=await new_page(b); fx=json.load(open('/home/claude/tests/fixture_exam_v71.json'))
    ex=[e for e in fx['exams'] if e['score'] is not None][0]
    check('fixture really mismatched (v7.1)', any(c['status']=='Due' for c in fx['calendar'] if c.get('payload',{}).get('examId')==ex['id']) and 'today' in fx['current']['title'])
    await pg.evaluate("s=>__LIFE_SIM_TEST__.loadState(s)",fx); s=await st(pg)
    cal=[c for c in s['calendar'] if c.get('payload',{}).get('examId')==ex['id']]
    check('EXAMFIX: calendar synced Completed', cal and all(c['status']=='Completed' for c in cal), [c['status'] for c in cal])
    hero=await pg.inner_text('#event-title')
    check('EXAMFIX: stale hero gone', ex['subject'].upper() not in hero.upper() or 'ASSESSMENT' not in hero.upper(), hero)
    strip=await pg.inner_text('#upcoming-strip')
    check('EXAMFIX: strip has no completed exam', ex['subject']+' • ' not in strip, strip)
    check('EXAMFIX: no impossible exam/calendar pairs', all(not(c['status']=='Due' and next((e for e in s['exams'] if e['id']==c['payload'].get('examId')),{}).get('status') in ('Completed','Missed')) for c in s['calendar'] if c['type']=='exam'))
    check('EXAMFIX: no JS errors', not pg.errs, pg.errs)
    await b.close()
asyncio.run(main())
