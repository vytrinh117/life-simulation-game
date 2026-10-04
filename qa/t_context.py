from harness import *
import datetime as dt
async def C(pg,fn,*a): return await T(pg,"call("+",".join([json.dumps(fn)]+[json.dumps(x) for x in a])+")")
async def M(pg,code): return await pg.evaluate("c=>__LIFE_SIM_TEST__.mutate(c)",code)
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path=CHROME); pg=await new_page(b); await new_life(pg,dob='2010-03-10'); await T(pg,"setAge(12)")
    # ---------- context engine basics ----------
    a=await C(pg,'academicInfo','2022-07-10')
    check('1A: July is summer break (term phase = summer)', await C(pg,'termPhase','2022-07-10')=='summer' and await C(pg,'isSummerBreak','2022-07-10'))
    check('1A: a normal October weekday is term time', await C(pg,'isSchoolTermActive','2022-10-12'))
    check('1A: winter break is a named break period, not term', await C(pg,'termPhase','2022-12-27')=='break' and 'Winter' in (await C(pg,'breakName','2022-12-27') or ''))
    check('1A: a weekend inside term is still term time (not a break)', await C(pg,'isSchoolTermActive','2022-10-15'))
    # ---------- G. Summer: walk day by day through the whole summer ----------
    await T(pg,"setClock('2022-06-20',600)"); await M(pg,"S.events.forEach(e=>{if(e.status==='Open')e.status='Resolved'})")
    s=await st(pg); hw0={x['name']:(x.get('homework') or {}).get('assignedDate') for x in s['school']['subjects']}
    ex0={e['id'] for e in s['exams']}; ct0={c['id'] for c in s['school'].get('contests',[])}
    for i in range(60): await T(pg,"advanceMinutes(1440)")
    s=await st(pg); summer=lambda d: d and '2022-06-13'<=d<='2022-08-26'
    new_hw=[x['name'] for x in s['school']['subjects'] if summer((x.get('homework') or {}).get('assignedDate')) and (x.get('homework') or {}).get('assignedDate')!=hw0.get(x['name'])]
    check('G: no normal homework is assigned during summer break (60 days walked)', not new_hw, new_hw)
    new_ex=[e for e in s['exams'] if e['id'] not in ex0 and summer(e['dateISO'])]
    check('G: no regular assessments are scheduled during summer break', not new_ex, [(e['subject'],e['dateISO']) for e in new_ex])
    check('G: no school-day attendance obligations in summer', not any(e['type']=='schoolDay' and summer(e['dateISO']) for e in s['calendar']))
    check('G: no club sessions in summer', not any(e['type']=='clubSession' and summer(e['dateISO']) for e in s['calendar']))
    new_ct=[c for c in s['school'].get('contests',[]) if c['id'] not in ct0]
    check('G: no regular school contests appear during summer', not new_ct, [c['name'] for c in new_ct])
    await T(pg,"setClock('2022-07-12',1000)"); n0=len((await st(pg))['school'].get('contests',[])); await C(pg,'exploreSchoolEvent'); s=await st(pg)
    check('G: "find a school event" is blocked in summer, with the reason', len(s['school'].get('contests',[]))==n0)
    r=await C(pg,'canPerformAction','exploreSchoolEvent'); check('G: the reason names the break and when school resumes', r['ok'] is False and 'Summer break' in r['why'] and 'resume' in r['why'], r)
    t0=(await st(pg))['clock']; await C(pg,'studySubject','Mathematics',60,'teacher'); t1=(await st(pg))['clock']
    check('G: no "study with teacher" in summer', t0==t1)
    await M(pg,"S.wealth='Wealthy'"); ok=False
    for i in range(5):
        await C(pg,'enrollProgram','swim'); s=await st(pg)
        if any(r['progId']=='swim' for r in s.get('programs',[])): ok=True; break
    check('G: summer programs still work during the break', ok)
    # ---------- teacher availability by location & time (term) ----------
    d='2022-10-12'; await T(pg,f"setClock('{d}',1260)"); await M(pg,"S.location='Home'")
    r=await C(pg,'canPerformAction','teacherStudy'); check('1A: at home at 9 PM → no studying with a teacher (reason given)', not r['ok'] and 'school' in r['why'].lower(), r)
    t0=(await st(pg))['clock']; await C(pg,'studySubject','Mathematics',60,'teacher'); check('1A: the action is really blocked (no time passes)', (await st(pg))['clock']==t0)
    await T(pg,f"setClock('{d}',470)"); await T(pg,"attendSchool()"); await T(pg,"advanceMinutes(60)")
    r=await C(pg,'canPerformAction','teacherStudy'); check('1A: at school during school hours → teacher available', r['ok'], r)
    await T(pg,f"setClock('{d}',1010)"); await M(pg,"S.location='School'"); r=await C(pg,'canPerformAction','teacherStudy'); check('1A: after 4:30 PM the teacher has gone home', not r['ok'], r)
    check('1A summer/term: no JS errors', not pg.errs, pg.errs[:3]); await pg.close()
    # ---------- moved-out household ----------
    pg=await new_page(b); await new_life(pg,dob='2005-03-10'); await T(pg,"setAge(19)"); await T(pg,"setMoney(5000,0,0)"); await C(pg,'addItem','phone','QC')
    check('1A: an adult at home still lives with parents', await C(pg,'livesWithParents') and await C(pg,'currentHouseholdId')=='family')
    await M(pg,"S.chats={};S.followUps=[]")
    for i in range(20):
        await M(pg,"S.followUps=S.followUps.filter(f=>f.type!=='incomingMsg')"); await C(pg,'scheduleMessages')
        await M(pg,"S.followUps.filter(f=>f.type==='incomingMsg').forEach(f=>{f.dateISO=S.clock.dateISO;f.minute=0;if(f.at){f.at.dateISO=S.clock.dateISO;f.at.minute=0}})"); await T(pg,"advanceMinutes(2)")
    s=await st(pg); kinds=[m['kind'] for c in s['chats'].values() for m in c['msgs']]
    check('1A: living at home, parents send household messages ("Dinner is ready…")', 'parent' in kinds, set(kinds))
    await M(pg,"S.followUps=S.followUps.filter(f=>f.type!=='incomingMsg');S.chats={}"); pid=[x for x in (await st(pg))['people'] if x['role']=='parent'][0]['id']
    m0=(await st(pg))['clock']['minute']; await C(pg,'scheduleFollowUp','incomingMsg',{'personId':pid,'kind':'parent'},{'minute':min(1439,m0+30)})
    await C(pg,'moveTo','apartment'); await T(pg,"advanceMinutes(40)"); s=await st(pg); qk=[m['kind'] for c in s['chats'].values() for m in c['msgs']]
    check('1A (fuzz finding): a household message queued before moving out arrives as a social message instead', 'parent' not in qk and 'parentSocial' in qk, qk)
    s=await st(pg); check('1A: after moving out, household = own place', not await C(pg,'livesWithParents') and await C(pg,'currentHouseholdId')=='own' and s['housing']['type']=='apartment')
    await M(pg,"S.chats={}")
    for i in range(25):
        await M(pg,"S.followUps=S.followUps.filter(f=>f.type!=='incomingMsg')"); await C(pg,'scheduleMessages')
        await M(pg,"S.followUps.filter(f=>f.type==='incomingMsg').forEach(f=>{f.dateISO=S.clock.dateISO;f.minute=0;if(f.at){f.at.dateISO=S.clock.dateISO;f.at.minute=0}})"); await T(pg,"advanceMinutes(2)")
    s=await st(pg); par=[m for c in s['chats'].values() for m in c['msgs'] if m['kind'] in ('parent','parentSocial')]
    check('1A: moved out → no more "Dinner is ready in 20 minutes" household commands', not any(m['kind']=='parent' for m in par) and not any('Dinner is ready' in m['text'] for m in par), [m['text'] for m in par][:3])
    check('1A: moved out → parents still keep in touch socially (invite, call, ask to visit)', any(m['kind']=='parentSocial' for m in par), len(par))
    m0=s['money']; c0=s['clock']; await C(pg,'doChore','dishes'); s=await st(pg); check('1A: moved out → no household chores for your parents\' house (no pay, no time passes)', s['money']==m0 and s['clock']==c0)
    r=await C(pg,'canPerformAction','householdChore'); check('1A: chore refusal explains why', not r['ok'] and 'no longer live' in r['why'], r)
    fam=[c for pid,c in s['chats'].items() if any(m['kind']=='parentSocial' for m in c['msgs'])]
    if fam:
        pid=[pid for pid,c in s['chats'].items() if any(m['kind']=='parentSocial' for m in c['msgs'])][0]; mid=[m for m in s['chats'][pid]['msgs'] if m['kind']=='parentSocial'][-1]['id']
        await C(pg,'replyChat',pid,mid,'warm'); s2=await st(pg); check('1A: replying warmly to a parent\'s social message brings you closer', s2['family']['closeness']>=s['family']['closeness'])
    check('1A household: no JS errors', not pg.errs, pg.errs[:3]); await b.close()
asyncio.run(main())
