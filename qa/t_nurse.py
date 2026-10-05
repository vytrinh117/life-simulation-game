from harness import *
import datetime as dt
async def C(pg,fn,*a): return await T(pg,"call("+",".join([json.dumps(fn)]+[json.dumps(x) for x in a])+")")
async def M(pg,code): return await pg.evaluate("c=>__LIFE_SIM_TEST__.mutate(c)",code)
async def sure(pg,fn,*a):  # make chance() rolls succeed for this one call (caregiver answers the phone)
    await pg.evaluate("()=>{window.__r=Math.random;Math.random=()=>0.01}")
    try: return await C(pg,fn,*a)
    finally: await pg.evaluate("()=>{Math.random=window.__r}")
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path=CHROME); pg=await new_page(b); await new_life(pg,dob='2010-03-10'); await T(pg,"setAge(11)")
    d='2021-10-13'
    await T(pg,f"setClock('{(dt.date.fromisoformat(d)-dt.timedelta(days=1)).isoformat()}',1435)"); await T(pg,"advanceMinutes(400)")
    await M(pg,"S.events.forEach(e=>{if(e.status==='Open')e.status='Resolved'});S.healthState.condition=null;S.healthState.lastRecovered=null")
    check('setup: an 11-year-old on a school day in term', (await st(pg))['age']==11 and await C(pg,'isSchoolTermActive',d) and await C(pg,'isSchoolDay',d))
    # QC: nurse from home is refused
    await C(pg,'visitNurse'); s=await st(pg); check('2A.4: no nurse visit while at home', not await C(pg,'canSeeNurse'))
    await C(pg,'startIllness','cold',{'severity':'mild','symptoms':['Headache','Sore throat']})
    await M(pg,"S.school.clubs=S.school.clubs||[];S.school.clubs.push({id:'qc',name:'Chess Club',status:'Active',position:'Member',joined:S.clock.dateISO,sessionsAttended:0})")
    await M(pg,f"S.calendar.push({{id:'club-qc-{d}',type:'clubSession',title:'Chess Club session',dateISO:'{d}',startMinute:930,endMinute:1020,graceMinute:960,status:'Scheduled',required:true,payload:{{clubId:'qc'}}}});S.exams.push({{id:'exam-qc',subject:S.school.subjects[0].name,type:'Quiz',dateISO:'{d}',minute:790,endMinute:830,graceMinute:800,score:null,status:'Scheduled',prep:0}})")
    await T(pg,f"setClock('{d}',470)"); await T(pg,"attendSchool()"); beh0=(await st(pg))['school']['behavior']
    await T(pg,f"setClock('{d}',548)"); await M(pg,"S.location='School';S.healthState.condition.severity='moderate'")
    check('A: at school during second period, feeling worse', await C(pg,'canSeeNurse'))
    await C(pg,'visitNurse'); s=await st(pg); sd=[e for e in s['calendar'] if e['type']=='schoolDay' and e['dateISO']==d][0]; ns=sd.get('nurse',{})
    check('A: asking the teacher and going to the nurse is narrated (teacher, symptoms, nurse checks)', 'nurse' in s['log'][0]['text'].lower() and 'checks you over' in s['log'][0]['text'], s['log'][0]['text'][:160])
    check('A: the nurse identifies the condition (now known)', s['healthState']['condition']['known'])
    pas=ns.get('pass') or {}
    check('A: NURSE PASS covers the rest of period 2 and period 3', pas.get('periods')==['p2','p3'] and pas.get('until')==660, pas)
    check('A: those periods are excused (not skipped)', sd['periods'].get('p2')=='excused' and sd['periods'].get('p3')=='excused')
    await T(pg,"openTab('school')"); txt=await pg.inner_text('#panel-host'); check('A: the nurse office shows the pass and actions', 'NURSE PASS' in txt and 'Rest on the nurse bed' in txt)
    await C(pg,'nurseRest'); s=await st(pg); sd=[e for e in s['calendar'] if e['type']=='schoolDay' and e['dateISO']==d][0]
    check('A: resting on the nurse bed passes real time (to the end of the pass)', s['clock']['minute']==660 and s['healthState']['condition'], s['clock'])
    check('A: not better → the nurse recommends going home', sd['nurse'].get('recommend')=='home')
    await sure(pg,'nurseCallCaregiver'); s=await st(pg); sd=[e for e in s['calendar'] if e['type']=='schoolDay' and e['dateISO']==d][0]
    check('A: the nurse calls a caregiver who picks you up; you end up at home', s['location']=='Home' and any('takes you home' in l['title'] for l in s['log'][:5]))
    check('A: the school day is medically excused (not left early, not skipped)', sd['status']=='Excused' and sd['attendanceStatus']=='Sent home sick' and all(v in ('attend','auto','excused') for v in sd['periods'].values()) and not any(l['title']=='Left school early' for l in s['log'][:8]), (sd['status'],sd['periods']))
    check('A/Troublemaker: no behavior loss and no troublemaker change from being sick', s['school']['behavior']>=beh0)
    club=[e for e in s['calendar'] if e['id']==f'club-qc-{d}'][0]; check("A: today's club session is excused, not a no-show", club['status']=='Excused', club['status'])
    ex=[e for e in s['exams'] if e['id']=='exam-qc'][0]; mk=[e for e in s['exams'] if e.get('makeupOf')=='exam-qc']
    check("A: the afternoon quiz becomes 'Make-up scheduled' with exactly one make-up (no duplicates, not Missed)", ex['status']=='Make-up scheduled' and len(mk)==1, (ex['status'],len(mk)))
    await C(pg,'sickAskMedicine'); s=await st(pg)
    check('A: if the nurse already gave medicine, the parent waits instead of buying more', not any(i.get('category')=='Pharmacy' for i in s['inventoryItems']) and 'wait' in s['log'][0]['text'].lower(), s['log'][0]['text'][:100])
    await T(pg,"advanceMinutes(400)"); await C(pg,'sickAskMedicine'); s=await st(pg); meds=[i for i in s['inventoryItems'] if i.get('category')=='Pharmacy']
    check('A: at home a parent gets medicine — it enters the existing inventory with finite uses', meds and meds[0]['remaining']<100, [(i['key'],i['remaining']) for i in meds])
    check('A: the medicine helps but does not cure', await C(pg,'reliefActive') and s['healthState']['condition'])
    await C(pg,'sickRest'); st0=await st(pg); await pg.evaluate("s=>__LIFE_SIM_TEST__.loadState(s)",st0); s=await st(pg)
    check('A: reload mid-illness keeps the condition, the medicine and the excused day', s['healthState']['condition'] and any(i.get('category')=='Pharmacy' for i in s['inventoryItems']) and [e for e in s['calendar'] if e['type']=='schoolDay' and e['dateISO']==d][0]['status']=='Excused')
    for i in range(14):
        await T(pg,"advanceMinutes(1440)")
        if not (await st(pg))['healthState'].get('condition'): break
    s=await st(pg); check('A: after several days the illness ends', not s['healthState'].get('condition') and i>=1, i)
    sds=[e for e in s['calendar'] if e['type']=='schoolDay' and e['dateISO']==d]; active=[e for e in s['calendar'] if e['dateISO']<=d and e['status'] in ('Due','Scheduled','Attending') and e['type'] in ('schoolDay','clubSession')]
    check('A: nothing stale — no active nurse pass, no due school/club item from that day', not active and (sds[0].get('nurse',{}).get('pass',{}).get('status')!='Active'), [(e['type'],e['status']) for e in active])
    errs=list(pg.errs); await pg.close()
    # QC: not sick → nurse sends you back, no pass
    pg=await new_page(b); await new_life(pg,dob='2010-03-10'); await T(pg,"setAge(11)"); await T(pg,"setClock('2021-10-12',1435)"); await T(pg,"advanceMinutes(400)")
    await M(pg,"S.events.forEach(e=>{if(e.status==='Open')e.status='Resolved'});S.healthState.condition=null"); await T(pg,"setClock('2021-10-13',470)"); await T(pg,"attendSchool()"); await T(pg,"setClock('2021-10-13',548)"); await M(pg,"S.location='School'")
    await C(pg,'visitNurse'); s=await st(pg); sd=[e for e in s['calendar'] if e['type']=='schoolDay' and e['dateISO']=='2021-10-13'][0]
    check('2A.4: not sick → the nurse sends you back to class, no pass, nothing excused', not sd.get('nurse',{}).get('pass') and not sd.get('nurse',{}).get('inOffice') and 'excused' not in sd['periods'].values())
    errs+=pg.errs; check('2A.4: no JS errors', not errs, errs[:3]); await b.close()
asyncio.run(main())
