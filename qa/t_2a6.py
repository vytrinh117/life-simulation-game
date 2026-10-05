from harness import *
import datetime as dt
async def C(pg,fn,*a): return await T(pg,"call("+",".join([json.dumps(fn)]+[json.dumps(x) for x in a])+")")
async def M(pg,code): return await pg.evaluate("c=>__LIFE_SIM_TEST__.mutate(c)",code)
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path=CHROME); errs=[]
    # Happiness (long-term, S.wellbeing) vs Mood (current, S.happiness)
    pg=await new_page(b); await new_life(pg); await T(pg,"setAge(12)"); await M(pg,"S.happiness=70;S.wellbeing=70;S.healthState.condition=null;S.healthState.lastRecovered=null")
    await C(pg,'startIllness','flu',{'severity':'moderate'}); f=await C(pg,'moodFactors')
    check('2A.6: being sick is a named reason in the mood breakdown', any('sick' in x['label'].lower() and x['v']<0 for x in f), f[:4])
    for i in range(8): await T(pg,"advanceMinutes(180)")
    s=await st(pg); dm=70-s['happiness']; dw=70-s['wellbeing']
    check('2A.6: a sick day lowers Mood clearly but long-term Happiness only slightly', dm>=5 and abs(dw)<=3 and dm>abs(dw)*2, (round(dm,1),round(dw,1)))
    b0=await C(pg,'moodBaseline'); await C(pg,'recoverIllness'); b1=await C(pg,'moodBaseline'); f=await C(pg,'moodFactors')
    check('2A.6: recovering removes the "sick" reason and raises the Mood target right away (mood recovers fast)', b1>b0 and not any('sick' in x['label'].lower() for x in f), (b0,b1))
    await T(pg,"openTab('home')"); html=await pg.inner_html('#panel-host'); check('2A.6: the Mood card shows long-term Happiness and current Mood separately', 'Happiness (long-term)' in html and 'Mood' in html)
    errs+=pg.errs; await pg.close()
    # Troublemaker: reputation 0–100, no levels; sick days / nurse never change it
    pg=await new_page(b); await new_life(pg,dob='2010-03-10'); await T(pg,"setAge(12)"); html=await C(pg,'repHtml')
    import re
    tm=re.search(r'Troublemaker[^<]*</span>.*?<b>([^<]*)</b>',html)
    check('2A.6: Troublemaker shows 0–100 with a label — no "Lv" level', tm and 'Lv' not in tm.group(1), tm and tm.group(1))
    await T(pg,"setClock('2022-10-11',1435)"); await T(pg,"advanceMinutes(400)"); await M(pg,"S.events.forEach(e=>{if(e.status==='Open')e.status='Resolved'});S.healthState.condition=null;S.healthState.lastRecovered=null")
    s=await st(pg); tr0=s['school']['rep']['troublemaker'] if s['school'].get('rep') else None; beh0=s['school']['behavior']
    await C(pg,'startIllness','flu',{'severity':'moderate'})
    await pg.evaluate("()=>{window.__r=Math.random;Math.random=()=>0.2}"); await C(pg,'askStayHome','today','sick'); await pg.evaluate("()=>{Math.random=window.__r}")
    await T(pg,"advanceMinutes(1440)"); s=await st(pg); tr1=s['school']['rep']['troublemaker'] if s['school'].get('rep') else None
    check('2A.6: a legitimate sick day does not raise Troublemaker or lower Behavior', (tr1 is None or tr1<=tr0) and s['school']['behavior']>=beh0, (tr0,tr1,beh0,s['school']['behavior']))
    errs+=pg.errs; await pg.close()
    # Fast Forward + health
    pg=await new_page(b); await new_life(pg,dob='2010-03-10'); await T(pg,"setAge(12)"); await T(pg,"setClock('2022-10-03',1200)")
    check('2A.6 FF: a medical emergency is a HARD interruption', await C(pg,'classifyEvent','medicalEmergency')=='hard')
    await M(pg,"S.events.forEach(e=>{if(e.status==='Open')e.status='Resolved'});S.healthState.condition=null;S.healthState.lastRecovered=null;S.health=90")
    await C(pg,'startIllness','cold',{'severity':'mild'}); await C(pg,'fastForward','month')
    for i in range(30):
        s=await st(pg); ses=s.get('ffSession')
        if not ses or ses['status']!='paused': break
        await C(pg,'ffPauseChoice','autoAll' if ses['pause']['tier']=='soft' else 'simulate')
    txt=await pg.inner_text('#choice-content'); s=await st(pg)
    check('2A.6 FF: a mild cold during a skipped month is summarized under Health (not an interruption)', 'HEALTH' in txt.upper() and 'recovered' in txt.lower() and not s['healthState'].get('condition'), txt[txt.upper().find('HEALTH'):][:120] if 'HEALTH' in txt.upper() else txt[:120])
    check('2A.6 FF: no stale medical items after the month', not any(e['type']=='medicalFollowUp' and e['status'] in ('Due','Scheduled') and e['dateISO']<s['clock']['dateISO'] for e in s['calendar']))
    errs+=pg.errs; await pg.close()
    # Final acceptance — the morning start: wakes slightly unwell, decides to go to school anyway
    pg=await new_page(b); await new_life(pg,dob='2010-03-10'); await T(pg,"setAge(11)"); await T(pg,"setClock('2021-10-12',1435)"); await T(pg,"advanceMinutes(400)")
    await M(pg,"S.events.forEach(e=>{if(e.status==='Open')e.status='Resolved'});S.healthState.condition=null;S.healthState.lastRecovered=null")
    await C(pg,'startIllness','headache',{'severity':'mild','symptoms':['Headache','Fatigue']}); s=await st(pg)
    check('Acceptance: age 11, health exists, wakes slightly unwell', s['age']==11 and s['health']>0 and s['healthState']['condition']['severity']=='mild')
    await T(pg,"setClock('2021-10-13',470)"); await T(pg,"attendSchool()"); s=await st(pg); sd=[e for e in s['calendar'] if e['type']=='schoolDay' and e['dateISO']=='2021-10-13']
    check('Acceptance: going to school while mildly sick is allowed (not forced home)', sd and sd[0]['status']=='Attending' and s['location']=='School')
    f=await C(pg,'concentration'); check('Acceptance: being unwell at school lowers focus', f<1.0)
    errs+=pg.errs; check('2A.6: no JS errors', not errs, errs[:3]); await b.close()
asyncio.run(main())
