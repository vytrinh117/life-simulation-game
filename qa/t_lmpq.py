from harness import *
import datetime as dt
async def C(pg,fn,*a): return await T(pg,"call("+",".join([json.dumps(fn)]+[json.dumps(x) for x in a])+")")
async def M(pg,code): return await pg.evaluate("c=>__LIFE_SIM_TEST__.mutate(c)",code)
async def life(b,age=12,dob='2010-03-10'):
    pg=await new_page(b); await new_life(pg,dob=dob); await T(pg,f"setAge({age})"); await T(pg,"setMoney(900,0,0)"); return pg
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path=CHROME)
    # ---------- L ----------
    pg=await life(b,15)
    for st_,exp in [(90,1350),(55,1380),(20,1439)]:
        await M(pg,f"S.family.rules.strictness={st_}"); check(f'L44: teen curfew (strictness {st_}) = {exp//60}:{exp%60:02d}', await C(pg,'curfewMinute')==exp)
    s=await st(pg); f=[x for x in s['people'] if x['role']=='friend'][0]
    await M(pg,f"const p=S.people.find(x=>x.id==='{f['id']}');p.rel=90;p.battery=90;p.trust=80;S.family.rules.strictness=100")
    await C(pg,'makePlan',f['id'],'sleepover','weekend'); s=await st(pg)
    pl=[x for x in s['plans'] if x['type']=='sleepover']
    check('L43: at 15 a sleepover needs no permission — you tell your parents instead', (not pl or pl[0]['status']!='Accepted') or any('Letting them know' in l['title'] for l in s['log'][:6]), [l['title'] for l in s['log'][:4]])
    s=await st(pg); offs=[o for o in s['school'].get('activityOffers',[]) if o.get('status')=='Offered']
    await M(pg,"S.school.activityOffers=[]"); await T(pg,"setClock('"+s['clock']['dateISO']+"',600)")
    await pg.close()
    pg=await life(b,12)
    await T(pg,"call('closeChoiceModal')")
    g=await pg.evaluate("(()=>{const S=__LIFE_SIM_TEST__.getState();return (S.school.activityOffers||[]).map(o=>[o.createdDate,o.decisionDate])})()")
    ok=all((dt.date.fromisoformat(d2)-dt.date.fromisoformat(d1)).days<=2 for d1,d2 in g if d1 and d2)
    check('L42: every activity offer has a decision window of at most 2 days', ok, g[:3])
    await pg.close()
    # ---------- M ----------
    pg=await life(b,12); await T(pg,"setClock('2022-07-01',600)"); await M(pg,"S.events.forEach(e=>{if(e.status==='Open')e.status='Resolved'});S.wealth='Wealthy'")
    w=await C(pg,'summerWindow'); check('M: summer window is open in July', w['open'])
    await T(pg,"openTab('places')"); await pg.click("[data-subtab='activities']"); txt=await pg.inner_text('#panel-host')
    check('M: Activities shows summer programs and free casual practice', 'Basketball camp' in txt and 'casual practice' in txt.lower())
    m0=(await st(pg))['money']
    for i in range(5):
        await pg.click("[data-program='bballCamp']"); s=await st(pg); rec=[r for r in s.get('programs',[]) if r['progId']=='bballCamp']
        if rec: break
        await pg.click("[data-subtab='activities']")
    check('M46: enrolling creates a schedule of sessions on the calendar', rec and len([e for e in s['calendar'] if e['type']=='program'])==rec[0]['total']==10, rec and rec[0]['total'])
    ev=sorted([e for e in s['calendar'] if e['type']=='program'],key=lambda e:e['dateISO'])
    sk0=s['skills'].get('sports',0); await T(pg,f"setClock('{ev[0]['dateISO']}',535)"); await T(pg,"advanceMinutes(8)")
    hero=await pg.inner_text('#event-title'); check('M: a program session takes the hero with a Go button', 'Basketball' in hero, hero)
    n0=len(s['people']); await pg.click("[data-program-go]"); s=await st(pg); sk1=s['skills'].get('sports',0)
    check('M46: first session introduces 1–2 teammates', 1<=len(s['people'])-n0<=2, len(s['people'])-n0)
    gp=sk1-sk0
    await M(pg,"S.skills.fitness=20;S.farm={date:S.clock.dateISO,c:{}}"); f0=(await st(pg))['skills'].get('fitness',0)
    await T(pg,f"setClock('{ev[0]['dateISO']}',1000)"); await C(pg,'casualPractice','run'); f1=(await st(pg))['skills'].get('fitness',0)
    check('M45: casual practice is free but grows skills more slowly than a coached session', 0<(f1-f0)<gp, (round(f1-f0,2),round(gp,2)))
    # miss 3 in a row → dropped
    for e in ev[1:4]:
        await T(pg,f"setClock('{e['dateISO']}',1000)"); await T(pg,"advanceMinutes(10)")
    s=await st(pg); rec=[r for r in s['programs'] if r['progId']=='bballCamp'][0]
    check('M: missing 3 sessions in a row drops you (no refund)', rec['status']=='Dropped', rec['status'])
    # full program to final
    await M(pg,"S.programs=[];S.calendar=S.calendar.filter(e=>e.type!=='program')")
    await pg.click("[data-subtab='activities']") if await pg.query_selector("[data-subtab='activities']") else None
    await C(pg,'enrollProgram','scienceCamp'); s=await st(pg); ev=sorted([e for e in s['calendar'] if e['type']=='program'],key=lambda e:e['dateISO'])
    for e in ev:
        await T(pg,f"setClock('{e['dateISO']}',530)"); await C(pg,'attendProgram',e['id'])
    s=await st(pg); check('M: the final event resolves with a result and a milestone', any('Science camp' in m['title'] for m in s['milestones']) and any(o['category']=='Program' for o in s['outcomes']))
    await pg.close()
    pg=await life(b,13); await T(pg,"setClock('2023-07-03',600)"); await M(pg,"S.events.forEach(e=>{if(e.status==='Open')e.status='Resolved'})")
    await C(pg,'enrollProgram','babysit'); s=await st(pg); ev=sorted([e for e in s['calendar'] if e['type']=='program'],key=lambda e:e['dateISO']); m0=s['money']
    await T(pg,f"setClock('{ev[0]['dateISO']}',1070)"); await C(pg,'attendProgram',ev[0]['id']); s=await st(pg)
    check('M: a summer job (13+) pays per shift', s['money']==m0+30, (m0,s['money']))
    await T(pg,"setClock('2023-10-10',600)"); w=await C(pg,'summerWindow'); check('M: no summer programs in October', not w['open'])
    await pg.close()
    # ---------- P ----------
    pg=await life(b,12); s=await st(pg); d=s['clock']['dateISO']
    await T(pg,f"setClock('{d}',1080)"); await M(pg,"S.location='Home';S.family.rules.strictness=0"); b0=(await st(pg))['skills'].get('baking',0)
    await C(pg,'bake','cookies'); s=await st(pg); ck=[i for i in s['inventoryItems'] if i['key']=='bakedCookies']
    check('P52: baking at home makes several homemade cookies and grows the baking skill', ck and ck[0]['source']=='Homemade' and ck[0].get('quantity',1)>=3 and s['skills'].get('baking',0)>b0, ck and (ck[0]['source'],ck[0].get('quantity')))
    await C(pg,'bake','heart'); s2=await st(pg); check('P52: heart cookies only in Valentine season', not any(i['key']=='heartCookies' for i in s2['inventoryItems']))
    await C(pg,'addItem','giftWrap','QC'); await C(pg,'addItem','book','QC'); s=await st(pg); bk=[i for i in s['inventoryItems'] if i['key']=='book'][0]
    await T(pg,"openTab('business')"); await pg.click("[data-subtab='things']"); has=await pg.query_selector(f"[data-wrap='{bk['id']}']")
    check('P53: "Wrap as gift" is a real action on items', bool(has))
    await C(pg,'wrapItem',bk['id'],'gift'); s=await st(pg); bk2=[i for i in s['inventoryItems'] if i['id']==bk['id']][0]
    check('P53: the item is now a wrapped gift', (bk2.get('wrapped') or {}).get('paper')=='gift')
    f=[x for x in s['people'] if x['role']=='friend'][0]; await M(pg,f"S.people.find(x=>x.id==='{f['id']}').rel=70")
    await C(pg,'giveInventoryItem',bk['id'],f['id']); s=await st(pg)
    check('P53: the recipient opens the wrapping (bonus + narration)', 'paper' in s['log'][0]['text'], s['log'][0]['text'][:120])
    ck=[i for i in s['inventoryItems'] if i['key']=='bakedCookies'][0]; await M(pg,f"S.people.find(x=>x.id==='{f['id']}').rel=72;S.people.find(x=>x.id==='{f['id']}').giftsReceived=[]")
    await C(pg,'giveInventoryItem',ck['id'],f['id']); s=await st(pg)
    check('P/108: homemade treats for a close friend are loved (handmade detection)', s['outcomes'][0]['result']=='Loved it', s['outcomes'][0])
    await pg.close()
    # Valentine: one main plan, admirer notes
    pg=await life(b,14); await T(pg,"setClock('2024-02-14',1000)"); await C(pg,'holidaysOn','2024-02-14'); await M(pg,"S.events.forEach(e=>{if(e.status==='Open')e.status='Resolved'})")
    await C(pg,'doHolidayActivity','valentines:friends'); await C(pg,'doHolidayActivity','valentines:coupleDate'); s=await st(pg)
    check("P51: only one main Valentine's plan per year", s['flags'].get('valMain-2024')=='friends' and not s.get('scene'))
    s=await st(pg); peers=[x for x in s['people'] if x['role']=='friend' and abs(x['age']-14)<=2]
    await M(pg,f"const p=S.people.find(x=>x.id==='{peers[0]['id']}');p.age=14;p.rel=70;p.romanceInit=true;p.attraction=90;p.romanceOpen=true;p.romanceStage='none';const n=S.npcs.find(x=>x.id===p.npcId);if(n)n.birthYear=2010")
    await C(pg,'leaveAdmirer','note',peers[0]['id'],False); s=await st(pg); pp=[x for x in s['people'] if x['id']==peers[0]['id']][0]
    check('P52: an anonymous secret-admirer note is delivered', pp.get('admirerNotes',0)>=1 and 'secret' in s['log'][0]['title'].lower())
    await C(pg,'leaveAdmirer','note',peers[0]['id'],True); s=await st(pg)
    check('P52: only one note per person per year', s['log'][0]['title']=='A secret delivery' or 'already' in str(s['log'][0]))
    check('valentine: no JS errors', not pg.errs, pg.errs[:3]); await pg.close()
    # ---------- Q ----------
    pg=await life(b,10); s=await st(pg); d=s['clock']['dateISO']
    while not await T(pg,f"call('isSchoolDay','{d}')"): d=(dt.date.fromisoformat(d)+dt.timedelta(days=1)).isoformat()
    await T(pg,f"setClock('{d}',600)"); t0=(await st(pg))['clock']; await C(pg,'familyOuting'); t1=(await st(pg))['clock']
    check('Q54: no family outing during school hours', t0==t1)
    sat=dt.date.fromisoformat(d)
    while sat.weekday()!=5: sat+=dt.timedelta(days=1)
    await T(pg,f"setClock('{sat.isoformat()}',600)"); await M(pg,"S.weather.severity=0;S.weather.type='Sunny';S.weather.temp=26;S.energy=90;S.family.rules.strictness=0;S.family.closeness=60"); e0=(await st(pg))['energy']; t0=(await st(pg))['clock']['minute']
    for i in range(4):
        await C(pg,'familyOuting'); s=await st(pg)
        if s['clock']['minute']!=t0: break
    check('Q54: a family outing takes hours and costs energy (no multi-day jump)', 180<=s['clock']['minute']-t0<=380 and s['energy']<e0 and s['clock']['dateISO']==sat.isoformat(), (s['clock'],s['energy'],e0))
    # vacation proposal → yes
    await M(pg,"S.events.forEach(e=>{if(e.status==='Open')e.status='Resolved'});S.trip=null;S.tripOffer=null")
    await C(pg,'proposeVacation','your parents\' wedding anniversary'); s=await st(pg); ev=[e for e in s['events'] if e['type']=='vacationProposal' and e['status']=='Open']
    o=s['tripOffer']
    check('Q55/56: proposal shows destination, transport, dates and duration (≤ 30 days)', ev and o['dest'] in ev[0]['text'] and o['len']<=30 and {c['id'] for c in ev[0]['choices']}=={'yes','no','tomorrow'}, ev and ev[0]['text'][:140])
    await T(pg,f"eventChoice('{ev[0]['id']}','yes')"); s=await st(pg); tr=s['trip']
    sd=[c for c in s['calendar'] if c['type']=='schoolDay' and tr['start']<=c['dateISO']<=tr['end']]
    check('Q57: school days during the trip are excused automatically', all(c['status']=='Excused' for c in sd), [c['status'] for c in sd][:4])
    await T(pg,f"setClock('{tr['start']}',300)"); await T(pg,"advanceMinutes(1500)"); s=await st(pg)
    check('Q: on the trip you are away (outings blocked)', s['location']=='Trip' and await C(pg,'onTrip'))
    await T(pg,f"setClock('{tr['end']}',1300)"); await T(pg,"advanceMinutes(400)"); s=await st(pg)
    check('Q: coming home — memory, souvenir, location back home', s['trip'] is None and any('Family trip' in m['title'] for m in s['milestones']) and s['location']=='Home')
    await pg.close()
    # decline → parents go; caretaker
    for age,expect in [(9,'relative'),(15,'alone')]:
        pg=await life(b,age); got=None
        for i in range(8):
            await M(pg,"S.events.forEach(e=>{if(e.status==='Open')e.status='Resolved'});S.trip=null;S.tripOffer=null")
            await C(pg,'proposeVacation','time off work'); s=await st(pg); ev=[e for e in s['events'] if e['type']=='vacationProposal' and e['status']=='Open'][0]
            await T(pg,f"eventChoice('{ev['id']}','no')"); s=await st(pg)
            if s.get('trip'): got=s['trip']; break
        ok=got and (got['caretakerLabel']=='yourself' or 'sibling' in got['caretakerLabel']) if expect=='alone' else got and got['caretakerLabel'] not in ('yourself',None)
        check(f'Q58: age {age}, you stay home → {"home alone (13+)" if expect=="alone" else "a relative looks after you (<13)"}', ok, got and got['caretakerLabel'])
        await pg.close()
    # tomorrow → asked again
    pg=await life(b,11); await M(pg,"S.events.forEach(e=>{if(e.status==='Open')e.status='Resolved'})"); await C(pg,'proposeVacation','summer vacation'); s=await st(pg); ev=[e for e in s['events'] if e['type']=='vacationProposal' and e['status']=='Open'][0]
    await T(pg,f"eventChoice('{ev['id']}','tomorrow')"); await T(pg,"advanceMinutes(2900)"); s=await st(pg)
    check('Q57: "Tell you tomorrow" → asked again the next day', any(e['type']=='vacationAgain' for e in s['events']))
    # frequency
    await M(pg,"S.events=[];S.trip=null;S.tripOffer=null;S.family.lastTripOffer=null"); n=0; s=await st(pg); d=dt.date.fromisoformat(s['clock']['dateISO'])
    for i in range(365):
        dd=(d+dt.timedelta(days=i)).isoformat(); await T(pg,f"setClock('{dd}',700)"); await M(pg,"S.trip=null"); before=(await st(pg))['family'].get('lastTripOffer'); await C(pg,'vacationTick'); after=(await st(pg))['family'].get('lastTripOffer')
        if after!=before: n+=1; await M(pg,"S.events.forEach(e=>{if(e.type==='vacationProposal')e.status='Resolved'});S.tripOffer=null")
    check('Q55: vacation proposals are occasional (≤ 3 per year), never daily', 0<=n<=3, n)
    check('Q: no JS errors', not pg.errs, pg.errs[:3]); await b.close()
asyncio.run(main())
