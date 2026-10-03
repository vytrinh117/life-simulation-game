from harness import *
import datetime as dt
async def join_club(pg):
    await T(pg,"call('exploreSchoolActivity')"); s=await st(pg)
    o=[x for x in s['school']['activityOffers'] if x['status']=='Offered'][0]
    await T(pg,f"call('decideActivity','{o['id']}',true)"); s=await st(pg)
    return [c for c in s['school']['clubs'] if c['status']=='Active'][-1]
def sess(s,cid): 
    x=[e for e in s['calendar'] if e['type']=='clubSession' and e['payload']['clubId']==cid and e['status'] not in ('Attended','Missed','Excused','Cancelled','Expired')]
    return sorted(x,key=lambda e:e['dateISO'])[0] if x else None
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path=CHROME)
    # ---- clubs ----
    pg=await new_page(b); await new_life(pg); await T(pg,"setAge(14)"); c=await join_club(pg); s=await st(pg)
    ev=sess(s,c['id']); check('9: joining schedules a real session', ev and ev['startMinute']==930, ev and ev['dateISO'])
    await T(pg,f"setClock('{ev['dateISO']}',920)"); await T(pg,"advanceMinutes(15)")
    hero=await pg.inner_text('#event-title'); check('9: due session takes the hero', c['name'] in hero, hero)
    await T(pg,f"clubAttend('{c['id']}')"); s=await st(pg); cl=[x for x in s['school']['clubs'] if x['id']==c['id']][0]
    check('9: attended counted, next session scheduled', cl['attended']==1 and sess(s,c['id']) and sess(s,c['id'])['dateISO']>ev['dateISO'], (cl['attended'],))
    # tell leader beforehand
    ev=sess(s,c['id']); await T(pg,f"setClock('{ev['dateISO']}',600)"); await T(pg,f"clubExcuse('{c['id']}')"); s=await st(pg); cl=[x for x in s['school']['clubs'] if x['id']==c['id']][0]
    check('9: told leader beforehand = Excused', cl['excusedSessions']==1 and cl['missedSessions']==0)
    # no-shows -> warning then removal
    warned=False
    for i in range(4):
        s=await st(pg); ev=sess(s,c['id'])
        if not ev: break
        await T(pg,f"setClock('{ev['dateISO']}',900)"); await T(pg,"advanceMinutes(120)"); s=await st(pg)
        if any(e['type']=='clubWarning' for e in s['events']): warned=True
    s=await st(pg); cl=[x for x in s['school']['clubs'] if x['id']==c['id']][0]
    check('9: repeated no-shows trigger a warning', warned)
    check('9: 4 consecutive no-shows -> removed', cl['status']=='Removed', (cl['status'],cl['consecutiveMissed']))
    check('9: removed club has no live sessions', sess(s,c['id']) is None)
    await pg.reload(); await pg.click('#load-last'); s=await st(pg)
    check('9: club state persists after reload', [x for x in s['school']['clubs'] if x['id']==c['id']][0]['status']=='Removed')
    check('9: no JS errors', not pg.errs, pg.errs); await pg.close()

    # ---- contests ----
    pg=await new_page(b); await new_life(pg); await T(pg,"setAge(14)")
    await T(pg,"call('exploreSchoolEvent')"); await T(pg,"call('exploreSchoolEvent')"); s=await st(pg)
    cs=[x for x in s['school']['contests'] if x['status']=='Open'][:2]
    for c in cs: await T(pg,f"call('contestAction','{c['id']}','enter')")
    s=await st(pg); reg=[x for x in s['school']['contests'] if x['status']=='Registered']
    check('10: registered contests have calendar obligations', len(reg)==2 and all(any(e['type']=='schoolEvent' and e['payload']['contestId']==r['id'] for e in s['calendar']) for r in reg))
    a,bb=sorted(reg,key=lambda x:x['eventDate'])
    await T(pg,f"setClock('{a['eventDate']}',470)")
    s=await st(pg); check('10: registration alone does not produce a result', [x for x in s['school']['contests'] if x['id']==a['id']][0]['result'] is None)
    ev=[e for e in s['calendar'] if e['type']=='schoolEvent' and e['payload']['contestId']==a['id']][0]
    school=await T(pg,f"call('isSchoolDay','{a['eventDate']}')")
    check('10/28: school-day contest is held inside school hours', (ev['startMinute']==780) if school else (ev['startMinute']==600), (school,ev['startMinute']))
    if school:
        await T(pg,"attendSchool()"); await T(pg,"call('skipToDismissal')"); s=await st(pg)
        check('10: skipping ahead stops when the event is on', s['clock']['minute']>=780 and s['clock']['minute']<810, s['clock']['minute'])
    else: await T(pg,f"setClock('{a['eventDate']}',590)")
    await T(pg,f"contestAttend('{a['id']}')"); s=await st(pg); ca=[x for x in s['school']['contests'] if x['id']==a['id']][0]
    check('10: attending runs the competition', ca['status']=='Completed' and ca['result'], ca['result'])
    await T(pg,f"setClock('{bb['eventDate']}',560)"); await T(pg,"advanceMinutes(420)"); s=await st(pg); cb=[x for x in s['school']['contests'] if x['id']==bb['id']][0]
    check('10: absent -> No-show, not a result', cb['status']=='No-show' and cb['result']=='Did not attend', (cb['status'],cb['result']))
    check('10: no JS errors', not pg.errs, pg.errs); await pg.close()

    # ---- §46 absence consequence chain ----
    pg=await new_page(b); await new_life(pg); await T(pg,"setAge(12)"); s=await st(pg)
    d=dt.date.fromisoformat(s['clock']['dateISO']); missed=0
    while missed<2:
        if await T(pg,f"call('isSchoolDay','{d.isoformat()}')"):
            await T(pg,f"setClock('{d.isoformat()}',700)"); await T(pg,"advanceMinutes(500)"); missed+=1
        d+=dt.timedelta(days=1)
    s=await st(pg)
    talk=[e for e in s['events'] if e['type']=='absenceTalk']
    check('46: 2nd absence -> caregiver conversation (later, not instantly)', talk and talk[0]['minute']>=1050, talk and talk[0]['minute'])
    if talk:
        await T(pg,f"eventChoice('{talk[0]['id']}','lie')"); s=await st(pg)
        check('46: choice resolved with narrative', [e for e in s['events'] if e['id']==talk[0]['id']][0]['status']=='Resolved' and any('heard from school' in l['title'] for l in s['log'][:3]))
    check('46: no JS errors', not pg.errs, pg.errs); await pg.close()

    # ---- §11 Age Up simulates the year ----
    pg=await new_page(b); await new_life(pg); await T(pg,"setAge(9)"); c0=await st(pg)
    await T(pg,"ageUp()"); s=await st(pg)
    title=await pg.inner_text('#choice-title'); body=await pg.inner_text('#choice-content')
    check('11: age advanced', s['age']==10, s['age'])
    check('11: year summary modal', 'Year summary' in title and 'Attendance' in body, title)
    open_past=[e for e in s['calendar'] if e['dateISO']<s['clock']['dateISO'] and e['status'] in ('Scheduled','Due','Attending')]
    check('11: no stale past obligations', not open_past, [(e['type'],e['dateISO'],e['status']) for e in open_past][:5])
    arch=s['archive']['exams']+s['exams']
    done=[e for e in arch if e['status'] in ('Completed','Missed','Excused','Make-up scheduled','Replaced by make-up','Cancelled')]
    check('11: last year assessments all resolved', all(e['status']!='Scheduled' for e in arch if e['dateISO']<s['clock']['dateISO']), len(done))
    hist=s['schoolHistory'][0] if s['schoolHistory'] else None
    total=(hist['record']['daysAttended'] if hist else 0)+(s['school']['record']['daysAttended'] if s.get('school') else 0)
    check('11: a full year of school days simulated across the September rollover', total>140, (total, hist and hist['record'], s.get('school') and s['school']['record']))
    print('   summary:', body.replace('\n',' | ')[:600])
    check('11: no JS errors', not pg.errs, pg.errs)
    # run several age-ups for robustness / performance
    import time; t=time.time()
    for _ in range(4): await T(pg,"ageUp()")
    s=await st(pg); check('11: 4 more Age Ups ok', s['age']==14 and not pg.errs, (s['age'],pg.errs[:2]))
    print('   4 age-ups took %.1fs; calendar=%d archiveCal=%d exams=%d archiveExams=%d saveKB=%d'%(time.time()-t,len(s['calendar']),len(s['archive']['calendar']),len(s['exams']),len(s['archive']['exams']),len(json.dumps(s))//1024))
    await pg.close(); await b.close()
asyncio.run(main())
