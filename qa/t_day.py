from harness import *
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path=CHROME)
    # ---- §121 Next Day ----
    pg=await new_page(b); await new_life(pg); await T(pg,"setAge(9)"); s=await st(pg)
    # find a weekend day with no obligations
    sat=s['clock']['dateISO']
    import datetime as dt
    d=dt.date.fromisoformat(sat)
    while d.weekday()!=5: d+=dt.timedelta(days=1)
    await T(pg,f"setClock('{d.isoformat()}',600)")
    w=await T(pg,"todayWarnings()"); check('121: no-obligation day has no warnings', w==[], w)
    await T(pg,"nextDay()"); s=await st(pg)
    check('121: Next Day advanced one date', s['clock']['dateISO']==(d+dt.timedelta(days=1)).isoformat(), s['clock'])
    check('121: morning summary shown', 'SUN' in (await pg.inner_text('#choice-title')).upper(), await pg.inner_text('#choice-title'))
    await T(pg,"call('closeChoiceModal')")
    # due exam today -> warning, Return, then Advance anyway
    m=[e for e in s['exams'] if e['status']=='Scheduled'][0]
    await T(pg,f"setClock('{m['dateISO']}',420)")
    w=await T(pg,"todayWarnings()"); check('121: exam/school warnings present', any('due today' in x['text'] for x in w) and any('school' in x['text'] for x in w), [x['text'] for x in w])
    await pg.click('#next-day'); vis=await pg.is_visible('#choice-overlay')
    check('121: warning modal opened (not blocked silently)', vis and 'Before you move on' in await pg.inner_text('#choice-title'))
    await pg.click('[data-close-modal]'); s=await st(pg)
    check('121: Return keeps the day', s['clock']['dateISO']==m['dateISO'] and s['clock']['minute']==420)
    await pg.click('#next-day'); await pg.click('[data-next-day-confirm]'); s=await st(pg)
    e=[x for x in s['exams'] if x['id']==m['id']][0]
    check('121: Advance anyway -> exam Missed', e['status']=='Missed', e['status'])
    check('121: missed exactly once', s['school']['record']['examsMissed']==1 and s['school']['record']['absences']==1, s['school']['record'])
    check('121: woke next morning', s['clock']['dateISO']==(dt.date.fromisoformat(m['dateISO'])+dt.timedelta(days=1)).isoformat() and s['clock']['minute']<720, s['clock'])
    await pg.reload(); await pg.click('#load-last'); s2=await st(pg)
    check('121: reload next morning keeps state', s2['school']['record']==s['school']['record'] and s2['clock']==s['clock'])
    # sleep at 21:00 -> next morning; sleep at 14:00 -> nap
    await T(pg,"call('closeChoiceModal')"); day=s2['clock']['dateISO']
    await T(pg,f"setClock('{day}',1260)"); await T(pg,"action('sleep')"); s=await st(pg)
    check('121: sleep 9 PM reaches next morning', s['clock']['dateISO']==(dt.date.fromisoformat(day)+dt.timedelta(days=1)).isoformat() and 330<=s['clock']['minute']<=720, s['clock'])
    await T(pg,"call('closeChoiceModal')"); day=s['clock']['dateISO']
    await T(pg,f"setClock('{day}',840)"); await T(pg,"action('sleep')"); s=await st(pg)
    check('121: sleep 2 PM is a nap (same day)', s['clock']['dateISO']==day and s['clock']['minute']<1000, s['clock'])
    check('121: no JS errors', not pg.errs, pg.errs); await pg.close()

    # ---- §8 school-day windows ----
    pg=await new_page(b); await new_life(pg); await T(pg,"setAge(10)"); s=await st(pg)
    d=dt.date.fromisoformat(s['clock']['dateISO'])
    while not await T(pg,f"call('isSchoolDay','{d.isoformat()}')"): d+=dt.timedelta(days=1)
    await T(pg,f"setClock('{d.isoformat()}',1380)")
    await T(pg,"attendSchool()"); s=await st(pg)
    sd=[c for c in s['calendar'] if c['type']=='schoolDay' and c['dateISO']==d.isoformat()][0]
    check('8: 11 PM "attend" gives no credit', sd['status']=='Missed' and s['school']['record']['daysAttended']==0, (sd['status'],s['school']['record']['daysAttended']))
    d2=d+dt.timedelta(days=1)
    while not await T(pg,f"call('isSchoolDay','{d2.isoformat()}')"): d2+=dt.timedelta(days=1)
    await T(pg,f"setClock('{d2.isoformat()}',560)"); await T(pg,"attendSchool()"); s=await st(pg)
    sd=[c for c in s['calendar'] if c['type']=='schoolDay' and c['dateISO']==d2.isoformat()][0]
    check('8: 9:20 arrival = tardy', sd['status']=='Attended' and sd['attendanceStatus']=='Tardy' and s['clock']['minute']==900, (sd['attendanceStatus'],s['clock']['minute']))
    check('8: absence produced a delayed parent notice', any(f['type']=='absenceNotice' for f in s['followUps']) or any('Absence notice' in l['title'] for l in s['log']))
    check('8: no JS errors', not pg.errs, pg.errs); await pg.close()

    # ---- §7 homework lifecycle ----
    pg=await new_page(b); await new_life(pg); await T(pg,"setAge(11)"); s=await st(pg)
    sub=[x for x in s['school']['subjects'] if x['homework']['status']=='Assigned']
    if not sub:
        await T(pg,"call('generateHomework',true)"); s=await st(pg); sub=[x for x in s['school']['subjects'] if x['homework']['status']=='Assigned']
    hw=sub[0]['homework']; name=sub[0]['name']; due=hw['dueDate']
    n=days(s['clock']['dateISO'],due)+1
    await T(pg,f"advanceMinutes({n*1440})"); s=await st(pg)
    h=[x for x in s['school']['subjects'] if x['name']==name][0]['homework']
    check('7: Assigned -> Late after due date', h['status']=='Late', h['status'])
    await T(pg,f"advanceMinutes({4*1440})"); s=await st(pg)
    h=[x for x in s['school']['subjects'] if x['name']==name][0]['homework']
    check('7: Late -> Missing (not Late forever)', h['status']=='Missing', h['status'])
    other=[x for x in s['school']['subjects'] if x['homework']['status'] in('Assigned','Late')]
    if not other:
        await T(pg,"call('generateHomework',true)"); s=await st(pg); other=[x for x in s['school']['subjects'] if x['homework']['status']=='Assigned']
    if other:
        nm=other[0]['name']; await T(pg,f"doHomework('{nm}')"); await T(pg,f"doHomework('{nm}')"); s=await st(pg)
        h=[x for x in s['school']['subjects'] if x['name']==nm][0]['homework']
        check('7: finishing gives Submitted / Submitted late', h['status'] in ('Submitted','Submitted late'), h['status'])
    check('7: no JS errors', not pg.errs, pg.errs); await pg.close()

    # ---- §1 kindergarten normal flow (no answer) ----
    pg=await new_page(b); await new_life(pg); await T(pg,"setAge(3)"); s=await st(pg)
    kg=[x for x in s['pendingDecisions'] if x['type']=='kindergarten'][0]
    check('1: KG created with lifecycle fields', kg['maxAge']==5 and kg['autoDecideDate'] and kg['expiresDate'], {k:kg.get(k) for k in('maxAge','autoDecideDate','expiresDate')})
    await T(pg,"advanceMinutes(1440*15)"); s=await st(pg); kg=[x for x in s['pendingDecisions']+s['archive']['pending'] if x['type']=='kindergarten'][0]
    check('1: no answer -> Family discussing', kg['status']=='Family discussing', kg['status'])
    await T(pg,"advanceMinutes(1440*3)"); s=await st(pg); kg=[x for x in s['pendingDecisions']+s['archive']['pending'] if x['type']=='kindergarten'][0]
    check('1: family decides on its own', kg['resolved'] and kg['status'] in('Enrolled','Alternative care'), kg['status'])
    check('1: no JS errors', not pg.errs, pg.errs); await pg.close()

    # ---- §37 invitation expiry ----
    pg=await new_page(b); await new_life(pg); await T(pg,"setAge(10)"); s=await st(pg)
    friend=[x for x in s['people'] if x['role']=='friend'][0]
    await T(pg,f"setClock('{s['clock']['dateISO']}',600)")
    ev=await T(pg,f"call('queueEvent',{{type:'friendInvite',title:'{friend['name'].split(' • ')[0]} wants to see you',text:'Park?',participants:['{friend['id']}'],choices:[{{id:'accept',label:'Accept'}},{{id:'decline',label:'Decline'}}]}})")
    check('37: invitation has response window', ev['expiresAt']['minute']==1080, ev['expiresAt'])
    await T(pg,"advanceMinutes(540)"); s=await st(pg); e=[x for x in s['events'] if x['id']==ev['id']][0]
    check('37: ignored invitation expires at 6 PM', e['status']=='Expired', e['status'])
    await T(pg,f"eventChoice('{ev['id']}','accept')"); s=await st(pg); e=[x for x in s['events'] if x['id']==ev['id']][0]
    check('37: cannot accept after expiry', e['status']=='Expired')
    check('37: no JS errors', not pg.errs, pg.errs); await pg.close()
    await b.close()
asyncio.run(main())
