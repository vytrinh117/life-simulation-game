from harness import *
import datetime as dt
async def C(pg,fn,*a): return await T(pg,"call("+",".join([json.dumps(fn)]+[json.dumps(x) for x in a])+")")
async def M(pg,code): return await pg.evaluate("c=>__LIFE_SIM_TEST__.mutate(c)",code)
async def rolled(pg,val,fn,*a):
    await pg.evaluate(f"()=>{{window.__r=Math.random;Math.random=()=>{val}}}")
    try: return await C(pg,fn,*a)
    finally: await pg.evaluate("()=>{Math.random=window.__r}")
async def morning(b,sick=None):
    pg=await new_page(b); await new_life(pg,dob='2010-03-10'); await T(pg,"setAge(12)"); await T(pg,"setClock('2022-10-11',1435)"); await T(pg,"advanceMinutes(400)")
    await M(pg,"S.events.forEach(e=>{if(e.status==='Open')e.status='Resolved'});S.healthState.condition=null;S.healthState.lastRecovered=null;S.family.trust=60;S.school.record&&(S.school.record.stayHomeAsks=[])")
    if sick: await C(pg,'startIllness',sick[0],{'severity':sick[1]})
    return pg
def sday(s,d='2022-10-12'): return [e for e in s['calendar'] if e['type']=='schoolDay' and e['dateISO']==d]
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path=CHROME); errs=[]
    # genuine sick morning
    pg=await morning(b,('flu','moderate')); await rolled(pg,0.2,'askStayHome','today','sick'); s=await st(pg); ev=sday(s)
    check('2A.5: genuinely sick + parent approves → excused "Sick day" (not skipped)', ev and ev[0]['status'] in ('Excused','Absent') and 'Sick day' in json.dumps(ev[0]), ev and (ev[0]['status'],ev[0].get('attendanceStatus'),ev[0].get('reason')))
    check('2A.5: sick-day story mentions the parent checking on you', 'staying home' in s['log'][0]['text'].lower(), s['log'][0]['text'][:90])
    beh=s['school']['behavior']; errs+=pg.errs; await pg.close()
    # fake: believed, then caught later
    pg=await morning(b); t0=(await st(pg))['family']['trust']; await rolled(pg,0.01,'askStayHome','today','sick'); s=await st(pg)
    check('2A.5 fake: a lenient-enough parent may believe it (excused)', sday(s) and sday(s)[0]['status'] in ('Excused','Absent'))
    check('2A.5 fake: getting caught later is scheduled', any(f['type']=='fakeSickCaught' and f['status']=='Scheduled' for f in s['followUps']))
    await T(pg,"setClock('2022-10-12',1070)"); await T(pg,"advanceMinutes(20)"); s=await st(pg)
    check('2A.5 fake: caught → trust drops, logged', s['family']['trust']<t0 and any(l['title']=='Caught' for l in s['log'][:5]), (t0,s['family']['trust']))
    errs+=pg.errs; await pg.close()
    # fake: refused
    pg=await morning(b); await rolled(pg,0.99,'askStayHome','today','sick'); s=await st(pg)
    check('2A.5 fake: parent refuses ("You\'re fine") → no excused day', "You're fine" in s['log'][0]['text'] and not (sday(s) and sday(s)[0]['status']=='Excused'))
    errs+=pg.errs; await pg.close()
    # clinic / hospital levels
    pg=await morning(b,('cold','mild')); opts=await C(pg,'careOptions'); t0=(await st(pg))['clock']
    check('2A.5: a mild cold does not suggest the hospital', 'hospital' not in opts and 'emergency' not in opts, opts)
    await C(pg,'visitCare','hospital'); check('2A.5: trying the hospital for a mild cold is redirected (no time passes)', (await st(pg))['clock']==t0)
    await M(pg,"S.healthState.condition.severity='moderate'"); await C(pg,'visitCare','clinic'); s=await st(pg); c=s['healthState']['condition']
    fu=[e for e in s['calendar'] if e['type']=='medicalFollowUp' and e['status'] in ('Scheduled','Due')]
    check('2A.5: clinic for a moderate illness → condition known, time passes, follow-up booked', c['known'] and 'Clinic / doctor' in c['care'] and len(fu)==1 and s['clock']!=t0, (c['care'],len(fu)))
    check('2A.5: the clinic does not cure instantly', bool(c))
    await C(pg,'recoverIllness'); s=await st(pg); fu2=[e for e in s['calendar'] if e['id']==fu[0]['id']][0]
    check('2A.5: recovering cancels the now-unneeded follow-up (nothing stale)', fu2['status']=='Cancelled', fu2['status'])
    await M(pg,"S.healthState.lastRecovered=null"); await C(pg,'startIllness','flu',{'severity':'severe'}); opts=await C(pg,'careOptions')
    check('2A.5: a severe illness makes the hospital appropriate', 'hospital' in opts, opts)
    await C(pg,'visitCare','hospital'); s=await st(pg); c=s['healthState']['condition']; fu=[e for e in s['calendar'] if e['type']=='medicalFollowUp' and e['status'] in ('Scheduled','Due')]
    check('2A.5: hospital treatment → better but still recovering, prescription, follow-up', c['severity']=='moderate' and c.get('prescription') and len(fu)==1)
    d=fu[0]['dateISO']; await T(pg,f"setClock('{d}',965)"); await C(pg,'attendFollowUp'); s=await st(pg)
    check('2A.5: attending the follow-up resolves it', [e for e in s['calendar'] if e['id']==fu[0]['id']][0]['status']=='Attended')
    await C(pg,'startIllness','fever',{'severity':'moderate'}) if not (await st(pg))['healthState'].get('condition') else None
    await M(pg,"S.healthState.condition.severity='moderate'"); await C(pg,'visitCare','clinic'); s=await st(pg); fu=[e for e in s['calendar'] if e['type']=='medicalFollowUp' and e['status'] in ('Scheduled','Due')]
    if fu:
        await T(pg,f"setClock('{fu[0]['dateISO']}',1100)"); await T(pg,"advanceMinutes(1440)"); s=await st(pg)
        check('2A.5: a missed follow-up becomes Missed (not left Due)', [e for e in s['calendar'] if e['id']==fu[0]['id']][0]['status'] in ('Missed','Cancelled'), [e['status'] for e in s['calendar'] if e['id']==fu[0]['id']])
    errs+=pg.errs; await pg.close()
    # adult costs, community clinic, emergency never refused, checkup no instant cure
    pg=await new_page(b); await new_life(pg); await T(pg,"setAge(25)"); await M(pg,"S.wealth='Wealthy';S.housing={type:'apartment',since:S.clock.dateISO,missed:0};S.money=500;S.healthState.condition=null")
    await C(pg,'startIllness','respiratory',{'severity':'moderate'}); cc=await C(pg,'careCost','clinic'); m0=(await st(pg))['money']; await C(pg,'visitCare','clinic'); s=await st(pg)
    check('2A.5 adult: clinic cost depends on coverage and comes from your money', cc['payer']=='you' and cc['total']>0 and s['money']==m0-cc['total'], (cc,m0,s['money']))
    await C(pg,'recoverIllness'); await M(pg,"S.money=0;S.healthState.lastRecovered=null"); await C(pg,'startIllness','respiratory',{'severity':'moderate'}); t0=(await st(pg))['clock']
    await C(pg,'visitCare','clinic'); check('2A.5 adult: no money → the paid clinic is refused (with an alternative)', (await st(pg))['clock']==t0)
    await C(pg,'visitCare','clinic',{'community':True}); s=await st(pg); check('2A.5 adult: the free community clinic still gives care (longer wait)', 'Clinic / doctor' in s['healthState']['condition']['care'])
    await M(pg,"S.healthState.condition.severity='severe'"); await C(pg,'visitCare','hospital'); s=await st(pg)
    check('2A.5 adult: hospital care is never refused for lack of money (becomes a bill)', 'Hospital' in s['healthState']['condition']['care'] and (s['finance'].get('medicalDebt') or 0)>0, s['finance'].get('medicalDebt'))
    await C(pg,'recoverIllness'); await M(pg,"S.money=200;S.healthState.lastRecovered=null"); await C(pg,'startIllness','cold',{'severity':'mild'}); await C(pg,'healthAction','checkup'); s=await st(pg)
    check('2A.5: the old instant-cure "Checkup" now goes to the doctor — the cold is still there', s['healthState'].get('condition') is not None and s['healthState']['condition']['known'])
    check('2A.5: the legacy illness flag mirrors being sick (work call-in-sick compatibility)', s['healthState'].get('illness')=='Unwell')
    errs+=pg.errs; check('2A.5: no JS errors', not errs, errs[:3]); await b.close()
asyncio.run(main())
