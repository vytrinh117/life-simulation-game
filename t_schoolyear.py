from harness import *
import datetime as dt
async def C(pg,fn,*a): return await T(pg,"call("+",".join([repr(fn)]+[repr(x) for x in a])+")")
async def M(pg,code): return await pg.evaluate("c=>__LIFE_SIM_TEST__.mutate(c)",code)
async def life(b,place,dob):
    pg=await new_page(b); await pg.evaluate('v=>{document.getElementById("c-place").value=v}',place); await new_life(pg,dob=dob); return pg
async def go(pg,date,minute=600): await T(pg,f"setClock('{date}',{minute})"); await T(pg,"advanceMinutes(1440)")
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path=CHROME)
    # ---------- US: cutoff, rollover, semesters, breaks ----------
    pg=await life(b,'New York City, USA','2010-03-10'); await T(pg,"setAge(6)")
    s=await st(pg); check('G: born March, age 6 in March → not yet Grade 1 (waits for the school year)', not s['school'] or s['school']['grade']=='Kindergarten', s['school'] and s['school']['grade'])
    kg=[x for x in s['pendingDecisions']+s['archive']['pending'] if x['type']=='kindergarten']
    check('G: kindergarten question not closed with "you started Grade 1" before Grade 1 actually starts', not kg or kg[0]['status']!='Superseded', kg and kg[0]['status'])
    await go(pg,'2016-08-25'); s=await st(pg); check('G: no school just before the first day (summer)', not s['school'] or s['school']['grade'] in ('Kindergarten',), s['school'] and s['school']['grade'])
    await go(pg,'2016-08-29'); s=await st(pg)
    check('G: Grade 1 starts on the first day of the school year (not a birthday)', s['school'] and s['school']['grade']=='Grade 1' and s['school']['yearKey']==2016, s['school'] and (s['school']['grade'],s['school'].get('yearKey')))
    sem=await pg.evaluate("__LIFE_SIM_TEST__.call('semesterLabel')") if False else None
    await T(pg,"openTab('school')"); txt=await pg.inner_text('#panel-host'); check('G: Education shows the current semester', 'Semester 1' in txt)
    for d,exp,why in [('2016-11-23',False,'Thanksgiving break'),('2016-12-27',False,'Winter break'),('2017-01-02',False,'New Year'),('2017-01-18',False,'semester break'),('2017-03-15',False,'Spring break'),('2017-03-21',True,'normal school day'),('2017-07-10',False,'summer')]:
        v=await C(pg,'isSchoolDay',d); check(f'G: US {d} school day = {exp} ({why})', v==exp, v)
    await go(pg,'2017-01-17'); s=await st(pg); check('G: Semester 1 report card after semester 1 ends', any('Semester 1 report card' in l['title'] for l in s['log'][:15]))
    await go(pg,'2017-01-23'); s=await st(pg); check('G: Semester 2 begins (logged, new exams)', any('Semester 2 begins' in l['title'] for l in s['log'][:15]) and any(e['dateISO']>'2017-01-23' and 'final' in e['type'].lower() or e['dateISO']>'2017-01-23' for e in s['exams']))
    await go(pg,'2017-08-28'); s=await st(pg); check('G: next school year → Grade 2 (one grade per year)', s['school']['grade']=='Grade 2' and s['school']['yearKey']==2017, s['school']['grade'])
    check('G: no JS errors (US)', not pg.errs, pg.errs[:2]); await pg.close()
    pg=await life(b,'New York City, USA','2010-10-20'); await T(pg,"setAge(7)"); await go(pg,'2017-08-29'); s=await st(pg)
    check('G: born after the Sept 1 cutoff → starts Grade 1 a year later (age 6 turning 7)', s['school'] and s['school']['grade']=='Grade 1', s['school'] and s['school']['grade']); await pg.close()
    # ---------- other countries ----------
    for place,dob,date,expect in [('Seoul, South Korea','2010-05-01','2017-03-06','Grade 1'),('Tokyo, Japan','2010-05-01','2017-04-10','Grade 1'),('Sydney, Australia','2010-05-01','2017-02-01','Grade 2'),('Hanoi, Vietnam','2010-05-01','2016-09-07','Grade 1')]:
        pg=await life(b,place,dob); y,m,d=map(int,date.split('-')); await T(pg,f"setAge({y-2010-(1 if (m,d)<(5,1) else 0)})"); await go(pg,addd(date,-3) if False else date); s=await st(pg)
        check(f'G: {place.split(",")[-1].strip()} school year has started by {date} with {expect}', s['school'] and s['school']['grade']==expect, s['school'] and s['school']['grade']); await pg.close()
    pg=await life(b,'Hanoi, Vietnam','2010-05-01')
    tet=await C(pg,'lunarNewYearDate',2018,'VN'); check('G: VN Tết week is a school holiday (lucky money still on the holiday)', not await C(pg,'isSchoolDay',tet) and not await C(pg,'isSchoolDay',(dt.date.fromisoformat(tet)+dt.timedelta(days=2)).isoformat()), tet); await pg.close()
    # ---------- prom, elections, 2-year plan, graduation ----------
    pg=await life(b,'New York City, USA','2008-03-10')
    for age,grade in [(12,7),(13,8),(14,9),(15,10),(16,11),(17,12)]:
        await T(pg,f"setAge({age})"); y=2008+age; await go(pg,f'{y}-08-28'); s=await st(pg)
        check(f'Grade {grade}: grade is correct on the first school day', s['school'] and s['school']['grade'].endswith(f'Grade {grade}'), s['school'] and s['school']['grade'])
        pr=s['school'].get('prom'); ev=[e for e in s['calendar'] if e['type']=='prom' and e['status']=='Scheduled']
        if grade>=8:
            d=dt.date.fromisoformat(pr['dateISO']) if pr else None
            check(f'Grade {grade}: {"Junior Prom" if grade<=9 else "Prom"} on the calendar from day one, mid semester 2 (Saturday)', pr and len(ev)==1 and d.weekday()==5 and dt.date(y+1,3,20)<=d<=dt.date(y+1,4,25) and pr['junior']==(grade<=9), pr and pr['dateISO'])
        else: check('Grade 7: no prom', not pr)
        await C(pg,'startElection',{'scope':'council','name':'Student Council','position':'Class representative'}); s=await st(pg)
        live=[e for e in s.get('elections',[]) if e['status']=='Campaign']; check(f'Grade {grade}: elections {"open" if grade>=8 else "closed"}', bool(live)==(grade>=8))
        await M(pg,"S.elections=[];S.calendar=S.calendar.filter(e=>e.type!=='election');S.followUps=S.followUps.filter(f=>f.type!=='electionResult')")
        if grade==10:
            await T(pg,"openTab('calendar')"); await pg.click("[data-subtab='upcoming']")
            ag=await C(pg,'agendaFor',f'{y+1}-08-27'); nxt=await C(pg,'agendaFor',[x for x in [f'{y+1}-08-{dd:02d}' for dd in range(24,31)]][3])
            mk=await pg.evaluate("__LIFE_SIM_TEST__.call('academicMarkers')") if False else None
            marks=[i for d in [f'{y+1}-08-{dd:02d}' for dd in range(24,31)]+[f'{y+2}-08-{dd:02d}' for dd in range(24,31)] for i in await C(pg,'agendaFor',d) if i['type']=='term']
            check('G: calendar plans 2 years ahead (next two first days of school)', len([m for m in marks if 'First day' in m['title']])>=2, [m['title'] for m in marks])
            pl=[i for dd in range(1,31) for i in await C(pg,'agendaFor',f'{y+2}-04-{dd:02d}') if 'Prom (planned)' in i['title']]
            check('G: next year\'s prom is already visible as planned', bool(pl))
    await go(pg,'2026-06-13'); s=await st(pg)
    check('G: Grade 12 ends with a high-school graduation (school ends, no repeated Grade 12)', s['school'] is None and s['education'].get('highSchoolDone') and any(g['stage']=='high' for g in s['education']['graduations']))
    check('prom/elections: no JS errors', not pg.errs, pg.errs[:2]); await pg.close()
    # ---------- migration of an old save keeps its grade, then moves up ----------
    pg=await new_page(b); fx=json.load(open('fixture_player_save_v72.json')); await pg.evaluate("s=>__LIFE_SIM_TEST__.loadState(s)",fx); s=await st(pg)
    check('G migration: old save keeps its current grade', s['school']['grade']=='Grade 1')
    await go(pg,'2010-09-06'); s=await st(pg); check('G migration: next school year → Grade 2 (no repeat, no skip)', s['school']['grade']=='Grade 2', s['school']['grade']); await pg.close()
    # ---------- prom pairs are consistent; neighbors; meeting people; acceptance ----------
    pg=await life(b,'New York City, USA','2008-03-10'); await T(pg,"setAge(16)"); await go(pg,'2024-08-28'); await T(pg,"setMoney(400,0,0)")
    for _ in range(4): await C(pg,'meetNewPeople','the mall')
    s=await st(pg); pr=s['school']['prom']; await T(pg,f"setClock('{(dt.date.fromisoformat(pr['dateISO'])-dt.timedelta(days=27)).isoformat()}',700)")
    for _ in range(60): await C(pg,'promTick')
    s=await st(pg); npc={n['fullName']:n for n in s['npcs']}; people={x.get('fullName') or x['name']:x for x in s['people']}
    bad=[]
    for n in s['npcs']:
        w=n.get('promWith')
        if w and w in npc and npc[w].get('promWith')!=n['fullName']: bad.append((n['fullName'],w,npc[w].get('promWith')))
    for x in s['people']:
        if x.get('npcId') and x.get('promWith') and x['promWith']!=s['name']:
            o=npc.get(x['promWith'])
            if o and o.get('promWith')!=(x.get('fullName') or x['name']): bad.append((x['name'],x['promWith'],o.get('promWith')))
    pairs=sum(1 for n in s['npcs'] if n.get('promWith'))
    check('Prom pairs are always two-way (no Miles→Sam→Maya chains)', pairs>=4 and not bad, (pairs,bad[:3]))
    nbs=await pg.evaluate("__LIFE_SIM_TEST__.call('neighborPromCandidates')") if False else None
    await T(pg,"openTab('home')"); html=await pg.inner_html('#panel-host')
    check('Prom: neighbors near your age can be asked', 'data-prom-ask="npc:' in html or not any(1 for _ in [0]))
    for _ in range(25): await T(pg,"call('closeChoiceModal')")
    s=await st(pg)
    # acceptance: friends with decent closeness, close to prom
    acc=0;tot=0
    for i in range(30):
        await M(pg,"const pr=S.school.prom;pr.partnerId=null;pr.plan=null;pr.asked=[];S.people.forEach(p=>{if(p.promWith===S.name)p.promWith=null})")
        await M(pg,f"const c=S.people.filter(p=>p.role==='friend'&&p.npcId);const p=c[{i}%c.length];p.rel=60;p.trust=55;p.conflict=0;p.promWith=null;p.datingNpc=null;p.notGoingProm=false;p.romanceInit=true;p.romanceOpen=true;p.attraction=50;p.boundaries=[];const n=S.npcs.find(x=>x.id===p.npcId);if(n)n.promWith=null;S.__t=p.id")
        pid=await pg.evaluate("__LIFE_SIM_TEST__.getState().__t"); await T(pg,f"setClock('{(dt.date.fromisoformat(pr['dateISO'])-dt.timedelta(days=6)).isoformat()}',700)")
        await C(pg,'askToProm',pid,'private'); s=await st(pg); r=s['school']['prom']['asked'][-1]['result']; tot+=1; acc+=r.startsWith('Accepted') if False else r.startswith('Accepted')
    check('Prom: a close-ish friend near prom night usually (not always) says yes (45–97%)', .45<=acc/tot<=.97, f'{acc}/{tot}')
    check('pairs/acceptance: no JS errors', not pg.errs, pg.errs[:2]); await pg.close()
    pg=await life(b,'New York City, USA','2008-03-10'); await T(pg,"setAge(14)")
    sizes=[];n_ev=0
    for i in range(40):
        await M(pg,"S.events=S.events.filter(e=>e.type!=='meetPeople')"); await C(pg,'meetNewPeople','the mall'); s=await st(pg)
        ev=[e for e in s['events'] if e['type']=='meetPeople' and e['status']=='Open']
        if ev: n_ev+=1; sizes.append(len(ev[0]['payload']['npcIds']))
    check('Meet people: about half of outings introduce someone (1–2 people, sometimes none)', 8<=n_ev<=32 and all(1<=k<=2 for k in sizes) and 2 in sizes and 1 in sizes, (n_ev,sizes.count(1),sizes.count(2)))
    await M(pg,"S.events=S.events.filter(e=>e.type!=='meetPeople');S.money=500;S.permissions.dailyAccess={dateISO:S.clock.dateISO,phone:true,tv:true,sharedDevice:true,stove:false};S.family.rules.strictness=0;S.family.trust=100")
    got=None
    for i in range(12):
        await T(pg,f"setClock('2022-07-{10+i}',600)"); await pg.evaluate("__LIFE_SIM_TEST__.call('closeChoiceModal')")
        await T(pg,"openTab('places')"); await pg.click("[data-subtab='out']"); await pg.click("[data-place='mall']")
        s=await st(pg); ev=[e for e in s['events'] if e['type']=='meetPeople' and e['status']=='Open']
        if ev: got=ev[0]; break
    check('Meet people: a real trip to the mall can introduce someone', got is not None and 'mall' in got['text'], got and got['text'])
    if got:
        await T(pg,f"eventChoice('{got['id']}','{got['choices'][0]['id']}')"); s=await st(pg)
        met=[x for x in s['people'] if str(x.get('roleLabel','')).startswith('met at')]
        check('Meet people: chatting adds them to People, age-appropriate', met and all(abs(x['age']-s['age'])<=2 for x in met), [(x['name'],x['age']) for x in met][:3])
    await T(pg,"openTab('school')"); tabs=await pg.evaluate("[...document.querySelectorAll('.subtab')].map(x=>x.dataset.subtab)"); check('Attendance is its own Education tab', 'attendance' in tabs)
    check('meeting: no JS errors', not pg.errs, pg.errs[:2]); await b.close()
asyncio.run(main())
