from harness import *
async def setup_math(pg,age=8):
    await new_life(pg); await T(pg,f"setAge({age})"); s=await st(pg)
    m=[e for e in s['exams'] if e['subject']=='Mathematics' and e['status']=='Scheduled'][0]
    return s,m
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path=CHROME)
    # ---------------- §51 take exam ----------------
    pg=await new_page(b); s,m=await setup_math(pg)
    check('51: exam lands on a school day', await T(pg,f"call('isSchoolDay','{m['dateISO']}')"), m['dateISO'])
    await T(pg,f"setClock('{m['dateISO']}',530)"); await T(pg,"advanceMinutes(12)"); s=await st(pg)
    cal=[c for c in s['calendar'] if c['payload'].get('examId')==m['id']][0]
    hero=await pg.inner_text('#event-title')
    check('51 before: hero shows Math assessment','MATHEMATICS' in hero, hero)
    check('51 before: calendar Due', cal['status']=='Due', cal['status'])
    btn=await pg.query_selector(f"#event-actions [data-exam-take='{m['id']}']")
    check('51 before: hero has Take Assessment CTA', btn is not None)
    await btn.click(); s=await st(pg)
    e=[x for x in s['exams'] if x['id']==m['id']][0]; cal=[c for c in s['calendar'] if c['payload'].get('examId')==m['id']]
    check('51 after: exam Completed + score', e['status']=='Completed' and isinstance(e['score'],int), (e['status'],e['score']))
    check('51 after: calendar Completed', all(c['status']=='Completed' for c in cal), [c['status'] for c in cal])
    hero=await pg.inner_text('#event-title'); strip=await pg.inner_text('#upcoming-strip')
    check('51 after: hero no longer says due', 'MATHEMATICS' not in hero, hero)
    check('51 after: not in upcoming strip', 'Mathematics' not in strip)
    notes=[n for n in s['notifications'] if n.get('sourceId')==m['id']]
    check('51 after: notification resolved', notes and all(n['status']=='Resolved' for n in notes), [n['status'] for n in notes])
    sd=[c for c in s['calendar'] if c['type']=='schoolDay' and c['dateISO']==m['dateISO']][0]
    check('51 after: taking exam counted as attending school', sd['status']=='Attended', sd['status'])
    score=e['score']; await T(pg,f"takeExam('{m['id']}')"); s=await st(pg)
    e2=[x for x in s['exams'] if x['id']==m['id']][0]
    check('51: cannot take twice', e2['score']==score and e2['status']=='Completed')
    await T(pg,"advanceMinutes(1440)"); s=await st(pg)
    e3=[x for x in s['exams'] if x['id']==m['id']][0]
    check('51: does not reappear next day', e3['status']=='Completed' and 'MATHEMATICS' not in (await pg.inner_text('#event-title')))
    await pg.reload(); await pg.click('#load-last'); s=await st(pg)
    e4=[x for x in s['exams'] if x['id']==m['id']][0]
    check('51: persists after reload', e4['status']=='Completed' and e4['score']==score)
    check('51: no JS errors', not pg.errs, pg.errs); await pg.close()

    # ---------------- §52 missed exam ----------------
    pg=await new_page(b); s,m=await setup_math(pg)
    await T(pg,f"setClock('{m['dateISO']}',420)")
    sub0=[x for x in s['school']['subjects'] if x['name']=='Mathematics'][0]
    await T(pg,"advanceMinutes(300)")   # 7:00 -> 12:00, past 11:00 cutoff, did nothing
    s=await st(pg); e=[x for x in s['exams'] if x['id']==m['id']][0]
    cal=[c for c in s['calendar'] if c['payload'].get('examId')==m['id']]
    sub1=[x for x in s['school']['subjects'] if x['name']=='Mathematics'][0]
    check('52: left Due -> Missed', e['status']=='Missed', e['status'])
    check('52: calendar not Due', all(c['status']=='Missed' for c in cal), [c['status'] for c in cal])
    hero=await pg.inner_text('#event-title')
    check('52: hero no longer "assessment today"', 'ASSESSMENT' not in hero.upper(), hero)
    check('52: follow-up "You missed Mathematics" offered', 'You missed Mathematics' in hero, hero)
    check('52: teacher consequence applied', sub1['teacher']['rel']<sub0['teacher']['rel'], (sub0['teacher']['rel'],sub1['teacher']['rel']))
    check('52: school record counts it once', s['school']['record']['examsMissed']==1)
    sd=[c for c in s['calendar'] if c['type']=='schoolDay' and c['dateISO']==m['dateISO']][0]
    check('52: school day also marked absent', sd['status']=='Missed' and sd['attendanceStatus']=='Absent', (sd['status'],sd['attendanceStatus']))
    score_after=sub1['score']; rel_after=sub1['teacher']['rel']
    await T(pg,"advanceMinutes(1440*3)"); s=await st(pg)
    evmid=[x for x in s['events'] if x['type']=='missedExam'][0]
    check('52: follow-up still answerable inside its 3-day window', evmid['status']=='Open')
    await T(pg,"advanceMinutes(1440)"); s=await st(pg)
    sub2=[x for x in s['school']['subjects'] if x['name']=='Mathematics'][0]
    check('52: no repeated consequence over days', s['school']['record']['examsMissed']==1 and [x for x in s['exams'] if x['id']==m['id']][0]['status'] in ('Missed','Make-up scheduled'))
    ev=[x for x in s['events'] if x['type']=='missedExam'][0]
    check('52: ignored follow-up expired (not open forever)', ev['status']=='Expired', ev['status'])
    check('52: no JS errors', not pg.errs, pg.errs); await pg.close()

    # ---------------- §52b make-up branch ----------------
    got_makeup=False; denied=False
    for i in range(8):
        pg=await new_page(b); s,m=await setup_math(pg)
        await T(pg,f"setClock('{m['dateISO']}',420)"); await T(pg,"advanceMinutes(300)"); s=await st(pg)
        ev=[x for x in s['events'] if x['type']=='missedExam' and x['status']=='Open'][0]
        await T(pg,f"eventChoice('{ev['id']}','makeup')"); s=await st(pg)
        e=[x for x in s['exams'] if x['id']==m['id']][0]
        if e['status']=='Make-up scheduled':
            mk=[x for x in s['exams'] if x.get('makeupOf')==m['id']][0]
            await T(pg,f"setClock('{mk['dateISO']}',925)"); await T(pg,f"takeExam('{mk['id']}')"); s=await st(pg)
            mk2=[x for x in s['exams'] if x['id']==mk['id']][0]; o=[x for x in s['exams'] if x['id']==m['id']][0]
            check('52b: make-up taken & original replaced', mk2['status']=='Completed' and o['status']=='Replaced by make-up', (mk2['status'],o['status']))
            got_makeup=True
        else: denied=True
        check(f'52b run {i}: no JS errors', not pg.errs, pg.errs); await pg.close()
        if got_makeup and denied: break
    check('52b: both grant and deny branches occurred', got_makeup and denied, (got_makeup,denied))
    await b.close()
asyncio.run(main())
