from harness import *
import datetime as dt
async def C(pg,fn,*a): return await T(pg,"call("+",".join([json.dumps(fn)]+[json.dumps(x) for x in a])+")")
async def M(pg,code): return await pg.evaluate("c=>__LIFE_SIM_TEST__.mutate(c)",code)
async def life(b,place,dob='2010-03-10',age=12,w=1366,h=860):
    pg=await new_page(b,w,h); await pg.evaluate('v=>{document.getElementById("c-place").value=v}',place); await new_life(pg,dob=dob); await T(pg,f"setAge({age})"); return pg
async def school_day_after(pg,d):
    d=dt.date.fromisoformat(d)
    while not await T(pg,f"call('isSchoolDay','{d.isoformat()}')"): d+=dt.timedelta(days=1)
    return d.isoformat()
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path=CHROME)
    # ---------- I. climate ----------
    pg=await life(b,'New York City, USA')
    jan=[await C(pg,'rollWeather',f'2025-01-{d:02d}',None) for d in range(1,29)]; jul=[await C(pg,'rollWeather',f'2025-07-{d:02d}',None) for d in range(1,29)]
    mt=lambda a:sum(x['temp'] for x in a)/len(a)
    check('I: New York is cold in January and warm in July', mt(jan)<7 and mt(jul)>20, (round(mt(jan),1),round(mt(jul),1)))
    jan2=[await C(pg,'rollWeather',f'202{y}-01-{d:02d}',None) for y in range(3) for d in range(1,29)]
    check('I: snow happens in a New York winter', any(x['type'] in ('Snowy','Blizzard') for x in jan+jan2), sum(x['type'] in ('Snowy','Blizzard') for x in jan+jan2))
    check('I: never snow in a New York July', not any(x['type'] in ('Snowy','Blizzard') for x in jul))
    await pg.close()
    for place,label in [('Miami, Florida, USA','Miami'),('Ho Chi Minh City, Vietnam','Ho Chi Minh City')]:
        pg=await life(b,place); ws=[await C(pg,'rollWeather',f'2025-{m:02d}-15',None) for m in range(1,13) for _ in range(6)]
        check(f'I: no snow in {label}', not any(x['type'] in ('Snowy','Blizzard','Cold') for x in ws), [x['type'] for x in ws if x['type'] in ('Snowy','Blizzard','Cold')][:3]); await pg.close()
    pg=await life(b,'Hanoi, Vietnam'); ty=[]
    for m in range(1,13):
        for d in range(1,29): ty.append((m,(await C(pg,'rollWeather',f'2025-{m:02d}-{d:02d}',None))['type']))
    tm={m for m,t in ty if t=='Typhoon'}; check('I: typhoons only in the Hanoi storm season (Jul–Sep)', tm<= {7,8,9}, tm)
    # forecast consistency
    hits=0
    for i in range(25):
        s=await st(pg); f0=s['weather']['forecast'][0]; await T(pg,"advanceMinutes(1440)"); s=await st(pg); hits+=s['weather']['type']==f0['type']
    check('I: tomorrow usually matches the forecast (forecasts are mostly right)', hits>=18, hits)
    await pg.close()
    # planner placement
    pg=await life(b,'New York City, USA',w=1920,h=1080); txt=await pg.inner_text('#planner')
    check('I: weather + forecast live in the Life Planner', 'weather' in txt.lower() and '°' in txt)
    await T(pg,"openTab('world')"); check('I: World tab no longer has a separate weather card', 'Humidity' not in await pg.inner_text('#panel-host'))
    await pg.close()
    # ---------- I. universal closure ----------
    pg=await life(b,'Chicago, Illinois, USA'); s=await st(pg)
    d=await school_day_after(pg,(dt.date.fromisoformat(s['clock']['dateISO'])+dt.timedelta(days=2)).isoformat())
    await T(pg,f"setClock('{(dt.date.fromisoformat(d)-dt.timedelta(days=1)).isoformat()}',1300)")
    await M(pg,f"const e=S.exams.find(x=>['Scheduled','Due'].includes(x.status));if(e){{e.dateISO='{d}'}};S.weather.forecast=[{{dateISO:'{d}',type:'Blizzard',temp:-8,humidity:80,severity:3}},...S.weather.forecast.slice(1)]")
    await T(pg,"reconcile()"); s0=await st(pg); ex=[e for e in s0['exams'] if e['dateISO']==d and e['status'] in ('Scheduled','Due')]
    await T(pg,"advanceMinutes(300)"); s=await st(pg)
    if s['weather']['type']!='Blizzard':
        print('   (forecast missed this time — by design ~10%; declaring the closure directly)'); await C(pg,'declareClosure',d,'Blizzard'); await M(pg,"S.weather.type='Blizzard';S.weather.severity=3"); s=await st(pg)
    check('I: extreme weather closes school for everyone', s['weather']['type']=='Blizzard' and s.get('closures',{}).get(d)=='Blizzard' and not await T(pg,f"call('isSchoolDay','{d}')"))
    check('I: no attendance obligation on a closure day', not any(c['type']=='schoolDay' and c['dateISO']==d and c['status'] not in ('Cancelled',) for c in s['calendar']))
    if ex:
        moved=[e for e in s['exams'] if e['id']==ex[0]['id']][0]; check('I: assessment on the closure day is rescheduled', moved['dateISO']>d and moved['status'] in ('Scheduled','Due'), moved['dateISO'])
    check('I: closure announced', any('School closed' in l['title'] for l in s['log'][:10]))
    # severe (not extreme): parents ask in the morning
    d2=await school_day_after(pg,(dt.date.fromisoformat(d)+dt.timedelta(days=1)).isoformat())
    await T(pg,f"setClock('{(dt.date.fromisoformat(d2)-dt.timedelta(days=1)).isoformat()}',1300)")
    await M(pg,f"S.weather.forecast=[{{dateISO:'{d2}',type:'Stormy',temp:12,humidity:90,severity:2}},...S.weather.forecast.slice(1)]")
    await T(pg,"advanceMinutes(560)"); s=await st(pg); ask=[e for e in s['events'] if e['type']=='weatherSchool' and e['status']=='Open']
    check('I: severe weather → caregiver asks if you want to go', bool(ask) and s['weather']['type']=='Stormy', s['weather']['type'])
    if ask:
        await T(pg,f"eventChoice('{ask[0]['id']}','stay')"); s=await st(pg); sd=[c for c in s['calendar'] if c['type']=='schoolDay' and c['dateISO']==d2][0]
        check('I: staying home in a storm is an excused absence', sd['status']=='Excused', sd['status'])
    sens=await pg.evaluate("(()=>{const S=__LIFE_SIM_TEST__.getState();return null})()")
    pid=await pg.evaluate("(()=>{const ids=[...document.querySelectorAll('[data-place]')].map(b=>b.dataset.place);return ids})()")
    await T(pg,"openTab('places')"); await pg.click("[data-subtab='out']")
    await M(pg,"S.weather.severity=2;S.weather.type='Stormy'")
    ids=await pg.evaluate("[...document.querySelectorAll('[data-place]')].map(b=>b.dataset.place)")
    park=[i for i in ids if 'park' in i.lower()] or ids
    t0=(await st(pg))['clock']; await pg.click(f"[data-place='{park[0]}']"); t1=(await st(pg))['clock']
    check('I: an outdoor outing is blocked in a storm (no time passes)', t0==t1, (park[0],t0,t1))
    check('weather: no JS errors', not pg.errs, pg.errs[:3]); await pg.close()
    # ---------- H. lateness with reasons ----------
    pg=await life(b,'New York City, USA',age=13); s=await st(pg); d=s['clock']['dateISO']; tardy=0; reasons=0
    for i in range(30):
        d=await school_day_after(pg,(dt.date.fromisoformat(d)+dt.timedelta(days=1)).isoformat())
        await M(pg,"S.weather.severity=1;S.weather.type='Rainy'")
        await T(pg,f"setClock('{d}',470)"); await T(pg,"attendSchool()"); s=await st(pg)
        sd=[c for c in s['calendar'] if c['type']=='schoolDay' and c['dateISO']==d][0]
        if sd.get('attendanceStatus')=='Tardy': tardy+=1; reasons+=bool(sd.get('lateReason'))
        await T(pg,"call('skipToDismissal')")
    check('H: random lateness happens sometimes (not always) on rainy days', 1<=tardy<=20, tardy)
    check('H: every random late arrival has a reason', reasons==tardy, (reasons,tardy))
    s=await st(pg); check('H: late reasons are tracked on the attendance record', bool(s['school']['record'].get('lateReasons')))
    # absence thresholds
    async def absent_day(dd):
        await T(pg,f"setClock('{dd}',600)"); await T(pg,"advanceMinutes(120)")
    for n,ftype in [(9,'teacher called'),(19,'meeting you were not invited'),(34,'Formal warning')]:
        now=(await st(pg))['clock']['dateISO']; d=await school_day_after(pg,(dt.date.fromisoformat(now)+dt.timedelta(days=1)).isoformat())
        await M(pg,f"S.school.record.absences={n}"); await absent_day(d); await T(pg,"advanceMinutes(2400)"); s=await st(pg)
        hit=any(ftype.lower() in (l['title']+l['text']).lower() for l in s['log'][:40]) or any(ftype.lower() in e['title'].lower() for e in s['events'])
        check(f'H: {n+1} unexcused absences → {ftype}', hit, [l['title'] for l in s['log'][:6]])
        for e in s['events']:
            if e['status']=='Open': await T(pg,f"eventChoice('{e['id']}','{e['choices'][0]['id']}')")
    name0=(await st(pg))['school']['name']
    now=(await st(pg))['clock']['dateISO']; d=await school_day_after(pg,(dt.date.fromisoformat(now)+dt.timedelta(days=1)).isoformat())
    await M(pg,"S.school.record.expulsionHearing=false;S.school.record.absences=44;S.school.behavior=5;S.school.subjects.forEach(x=>x.score=30)"); await absent_day(d); await T(pg,"advanceMinutes(3500)"); s=await st(pg)
    check('H: 45 absences → expulsion hearing (probation or transfer)', s['school'].get('probation') or s['school']['name']!=name0, (s['school'].get('probation'),name0,s['school']['name']))
    check('absences: no JS errors', not pg.errs, pg.errs[:3]); await pg.close()
    # behavior + conference + stay home
    pg=await life(b,'New York City, USA',age=13); s=await st(pg)
    await M(pg,"S.school.behavior=20;S.school.behaviorCalls={}"); await T(pg,"call('schoolHomeTick')"); await T(pg,"advanceMinutes(600)"); s=await st(pg)
    check('H: behavior below 30% → the teacher calls home', any('teacher called' in e['title'].lower() for e in s['events']) or any('teacher called' in l['title'].lower() for l in s['log'][:20]))
    a=await C(pg,'academicInfo',s['clock']['dateISO']); start=a['sem2Start'] if a['semester']==2 else a['start']
    d=await school_day_after(pg,(dt.date.fromisoformat(start)+dt.timedelta(days=22)).isoformat()); await T(pg,f"setClock('{d}',600)"); await T(pg,"advanceMinutes(30)"); s=await st(pg)
    note=[e for e in s['events'] if e['type']=='ptcNotice' and e['status']=='Open']; conf=[c for c in s['calendar'] if c['type']=='conference']
    check('H: parent–teacher conference notice + calendar entry each semester', bool(note) and bool(conf), (len(note),len(conf)))
    if note:
        await T(pg,f"eventChoice('{note[0]['id']}','hide')"); cd=conf[0]['dateISO']; await T(pg,f"setClock('{cd}',1000)"); await T(pg,"advanceMinutes(200)"); s=await st(pg)
        c2=[c for c in s['calendar'] if c['id']==conf[0]['id']][0]
        check('H: hidden notice → conference resolves (caught or not), never left open', c2['status']=='Completed' and any(k in (l['title']) for l in s['log'][:10] for k in ['called home','Conference day']), c2['status'])
    # stay home
    await M(pg,"S.health=55;S.needs.sleep=20"); s=await st(pg)
    tm=await school_day_after(pg,(dt.date.fromisoformat(s['clock']['dateISO'])+dt.timedelta(days=1)).isoformat())
    await T(pg,f"setClock('{(dt.date.fromisoformat(tm)-dt.timedelta(days=1)).isoformat()}',1140)")
    ok=await C(pg,'canAskStayHome','tomorrow'); check('H: you can ask the night before', ok)
    appr=0;day=tm
    for i in range(4):
        await M(pg,"S.health=55;S.needs.sleep=20")
        await T(pg,f"setClock('{(dt.date.fromisoformat(day)-dt.timedelta(days=1)).isoformat()}',1140)"); await C(pg,'askStayHome','tomorrow','sick'); s=await st(pg)
        sd=[c for c in s['calendar'] if c['type']=='schoolDay' and c['dateISO']==day]; appr+=bool(sd and sd[0]['status']=='Excused')
        day=await school_day_after(pg,(dt.date.fromisoformat(day)+dt.timedelta(days=2)).isoformat())
    check('H: really sick → parents usually approve → excused absence logged for that day', appr>=3, appr)
    tm=day
    await M(pg,"S.health=100;S.needs.sleep=95;S.stress=5;S.happiness=80;S.family.rules.strictness=100"); den=0
    for i in range(10):
        d=await school_day_after(pg,(dt.date.fromisoformat(tm)+dt.timedelta(days=1+i*2)).isoformat())
        await T(pg,f"setClock('{(dt.date.fromisoformat(d)-dt.timedelta(days=1)).isoformat()}',1140)"); await C(pg,'askStayHome','tomorrow','none'); s=await st(pg)
        den+=(s['school'].get('stayHome',{}).get(d)=='denied')
    check('H: healthy + "don\'t want to go" with strict parents → usually refused', den>=7, den)
    check('home/school: no JS errors', not pg.errs, pg.errs[:3]); await pg.close()
    # ---------- J. fast forward ----------
    pg=await life(b,'New York City, USA',age=10); s=await st(pg)
    await pg.click('#ff-btn'); opts=await pg.evaluate("[...document.querySelectorAll('#choice-content [data-ff]')].map(x=>x.dataset.ff)")
    check('J: Fast forward menu offers week / month / term / major / birthday', set(opts)=={'week','month','term','major','birthday'}, opts)
    await pg.click('[data-close-modal], #close-choice') if await pg.query_selector('#close-choice') else None
    await T(pg,"call('closeChoiceModal')")
    await M(pg,"S.events.forEach(e=>{if(e.status==='Open')e.status='Resolved'})")
    d0=s['clock']['dateISO']; ex=sorted([e for e in s['exams'] if e['status']=='Scheduled'],key=lambda e:e['dateISO'])
    await C(pg,'fastForward','week'); s=await st(pg); txt=await pg.inner_text('#choice-content')
    moved=(dt.date.fromisoformat(s['clock']['dateISO'])-dt.date.fromisoformat(d0)).days
    check('J: fast forward moves time and shows a summary', moved>=1 and 'passed' in txt, (moved,txt[:80]))
    if ex and ex[0]['dateISO']<=(dt.date.fromisoformat(d0)+dt.timedelta(days=7)).isoformat():
        check('J: stops on the morning of an assessment day', s['clock']['dateISO']==ex[0]['dateISO'] and 'Stopped' in txt, (s['clock']['dateISO'],ex[0]['dateISO']))
    rec=s['school']['record']; sdays=0; x=dt.date.fromisoformat(d0)
    while x.isoformat()<s['clock']['dateISO']:
        sdays+=bool(await T(pg,f"call('isSchoolDay','{x.isoformat()}')")); x+=dt.timedelta(days=1)
    check('J: every school day passed on autopilot was attended (none turned into absences)', rec['daysAttended']>=sdays-1 and rec['absences']==0, (rec['daysAttended'],sdays,rec['absences']))
    await T(pg,"call('closeChoiceModal')")
    await C(pg,'npcInvitesPlayer',[x for x in s['people'] if x['role']=='friend'][0]['id']); d1=(await st(pg))['clock']['dateISO']
    await C(pg,'fastForward','month'); s=await st(pg)
    check('J: refuses to skip ahead while an invitation waits for an answer', s['clock']['dateISO']==d1)
    check('J: no JS errors', not pg.errs, pg.errs[:3]); await pg.close()
    # summer → next term
    pg=await life(b,'New York City, USA',dob='2010-03-10',age=12); await T(pg,"setClock('2022-07-01',600)"); await M(pg,"S.events.forEach(e=>{if(e.status==='Open')e.status='Resolved'})")
    target=await C(pg,'ffTarget','term'); stops=0
    for i in range(25):
        await M(pg,"S.events.forEach(e=>{if(e.status==='Open')e.status='Resolved'})"); await C(pg,'fastForward','term'); await T(pg,"call('closeChoiceModal')"); s=await st(pg)
        if s['clock']['dateISO']>=target: break
        stops+=1
    check('J: "End of break" from summer reaches the first school day (stopping for decisions on the way)', s['clock']['dateISO']==target and s['clock']['minute']<480, (s['clock'],target,stops))
    check('J (summer): no JS errors', not pg.errs, pg.errs[:3]); await b.close()
asyncio.run(main())
