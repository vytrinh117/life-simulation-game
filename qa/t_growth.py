from harness import *
async def C(pg,fn,*a): return await T(pg,"call("+",".join([repr(fn)]+[repr(x) for x in a])+")")
async def M(pg,code): return await pg.evaluate("c=>__LIFE_SIM_TEST__.mutate(c)",code)
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path=CHROME); pg=await new_page(b); await new_life(pg); await T(pg,"setAge(12)")
    await T(pg,"setMoney(500,0,0)"); s=await st(pg)
    # ---------- B: talents & traits ----------
    await M(pg,"S.talents=['Sports'];S.personality=['Curious'];S.skills.sports=5;S.farm=null")
    tb=await C(pg,'traitBoost','skill:sports'); check('B: Sports talent gives +25% to sports', abs(tb['mult']-1.25)<1e-9 and any('Sports talent' in n for n in tb['notes']), tb)
    tc=await C(pg,'traitBoost','skill:knowledge'); check('B: Curious personality boosts knowledge', tc['mult']>1 and any('Curious' in n for n in tc['notes']), tc)
    await M(pg,"S.happiness=60;S.needs.sleep=80;S.needs.hunger=30")
    g1=await C(pg,'practiceSkill','sports',2); await M(pg,"S.talents=[];S.farm=null;S.skills.sports=5"); g0=await C(pg,'practiceSkill','sports',2)
    check('B: talent makes the same practice grow faster', g1>g0*1.2, (round(g1,2),round(g0,2)))
    await M(pg,"S.talents=['Sports']"); await T(pg,"openTab('places')"); await pg.click("[data-subtab='things']"); txt=await pg.inner_text('#panel-host')
    check('B: Traits & talents card explains effects', 'TRAITS & TALENTS' in txt.upper() and '+25%' in txt)
    check('B: ★ marks boosted skills', '★' in txt)
    await C(pg,'addItem','sportsBall','QC'); s=await st(pg); ball=[i for i in s['inventoryItems'] if i['key']=='sportsBall'][0]
    await M(pg,"S.farm=null"); await C(pg,'performItemUse',ball['id'],'practice'); s=await st(pg)
    check('B: the result line names the talent bonus', 'Sports talent' in s['log'][0]['text'] or 'Sports talent' in json.dumps(s.get('lastBoostNote','')), s['log'][0]['text'][:160])
    # ---------- C: levels ----------
    await M(pg,"S.skills.art=9.8;S.farm=null;S.talents=[]")
    await C(pg,'practiceSkill','art',3); s=await st(pg)
    check('C: crossing 10 points → Level 2 with a notification + milestone', any('Level 2' in m['title'] and 'Art' in m['title'] for m in s['milestones']) and any('Level 2' in n['title'] for n in s['notifications']))
    await M(pg,"S.farm=null;S.skills.music=5"); lo=await C(pg,'practiceSkill','music',3)
    await M(pg,"S.farm=null;S.skills.music=85"); hi=await C(pg,'practiceSkill','music',3)
    check('C: higher levels fill more slowly (never zero)', 0<hi<lo*0.7, (round(lo,2),round(hi,2)))
    await M(pg,"S.skills.writing=100;S.farm=null"); txt=await pg.evaluate("document.body.innerText")
    await T(pg,"openTab('places')"); await pg.click("[data-subtab='things']"); t2=await pg.inner_text('#panel-host')
    check('C: skills shown as Lv 1–10 with a per-level bar', 'Lv ' in t2)
    await T(pg,"openTab('school')"); t3=await pg.inner_text('#panel-host'); check('C: school reputation shown in levels', 'Lv ' in t3)
    # ---------- D: study rules ----------
    s=await st(pg); sub=s['school']['subjects'][0]['name']
    await M(pg,"S.farm=null;S.energy=100;S.happiness=60;S.needs.sleep=80;S.needs.hunger=30;S.inventoryItems=S.inventoryItems.filter(i=>!['deskLamp','workbook','notebook'].includes(i.key))")
    res={}
    for mins in [30,60,180]:
        await M(pg,"S.farm=null;S.energy=100;S.stress=10")
        b0=[x for x in (await st(pg))['school']['subjects'] if x['name']==sub][0]
        await C(pg,'studySubject',sub,mins); b1=[x for x in (await st(pg))['school']['subjects'] if x['name']==sub][0]
        res[mins]=(round(b1['score']-b0['score'],1),round(b1['skill']-b0['skill'],1))
    check('D: longer sessions give more (30m < 1h < 3h)', res[30][0]<=res[60][0]<=res[180][0] and res[30][1]<res[60][1]<res[180][1], res)
    check('D: grade gain ≤ 2.0 per session, one decimal', all(0<v[0]<=2.0 for v in res.values()), res)
    check('D: status-bar (skill) gain between 1 and 5 per session', all(1<=v[1]<=5 for v in res.values()), res)
    sc=[x for x in (await st(pg))['school']['subjects'] if x['name']==sub][0]['score']
    check('D: grade stored with one decimal (e.g. 75.1)', abs(sc*10-round(sc*10))<1e-6, sc)
    await M(pg,"S.farm=null;S.energy=100")
    for i in range(3): await C(pg,'studySubject',sub,30)
    b0=[x for x in (await st(pg))['school']['subjects'] if x['name']==sub][0]; await C(pg,'studySubject',sub,30); b1=[x for x in (await st(pg))['school']['subjects'] if x['name']==sub][0]
    check('D: max 3 study sessions per subject per day (4th blocked)', b1['score']==b0['score'] and b1['prep']==b0['prep'])
    other=s['school']['subjects'][1]['name']; o0=[x for x in (await st(pg))['school']['subjects'] if x['name']==other][0]
    await C(pg,'studySubject',other,30); o1=[x for x in (await st(pg))['school']['subjects'] if x['name']==other][0]
    check('D: the cap is per subject (another subject still works)', o1['score']>o0['score'])
    await M(pg,"S.farm=null;S.energy=100;S.stress=10"); a0=[x for x in (await st(pg))['school']['subjects'] if x['name']==other][0]
    await C(pg,'studySubject',other,60); a1=[x for x in (await st(pg))['school']['subjects'] if x['name']==other][0]
    for k in ['deskLamp','workbook']: await C(pg,'addItem',k,'QC')
    await M(pg,"S.farm=null;S.energy=100;S.stress=10"); c0=[x for x in (await st(pg))['school']['subjects'] if x['name']==other][0]
    await C(pg,'studySubject',other,60); c1=[x for x in (await st(pg))['school']['subjects'] if x['name']==other][0]; s=await st(pg)
    check('D: desk lamp + workbook add bonus gain and say so', (c1['skill']-c0['skill'])>(a1['skill']-a0['skill']) and 'desk lamp' in s['log'][0]['text'], (round(a1['skill']-a0['skill'],2),round(c1['skill']-c0['skill'],2)))
    await M(pg,"S.farm=null;S.energy=100"); await T(pg,"openTab('school')"); await pg.click("[data-subtab='subjects']")
    await pg.click(f"[data-extra-ex='{sub}']"); s=await st(pg)
    check('D: Advanced exercises button works (optional, real effect)', 'Advanced' in s['log'][0]['title'], s['log'][0]['title'])
    dis=await pg.evaluate(f"document.querySelector(\"[data-extra-ex='{sub}']\").disabled"); check('D: Advanced exercises once per day per subject', dis)
    # exam result depends on mood/needs, not just the displayed grade
    ex=[e for e in s['exams'] if e['status']=='Scheduled'][0]
    async def avg(code,n=40):
        await M(pg,code); t=0
        for _ in range(n): t+=await C(pg,'examScoreOf',ex['id'])
        return t/n
    good=await avg("S.happiness=90;S.needs.sleep=90;S.needs.hunger=20;S.stress=10")
    bad=await avg("S.happiness=15;S.needs.sleep=20;S.needs.hunger=90;S.stress=85")
    check('D: same grade, different day: mood/sleep/hunger/stress change the real exam score', good-bad>=8, (round(good,1),round(bad,1)))
    # ---------- E: mood ----------
    await M(pg,"S.needs.hunger=95;S.needs.social=10;S.stress=85")
    f=await C(pg,'moodFactors'); labels=[x['label'] for x in f]
    check('E: mood explains itself (Hungry / Lonely / Stressed)', all(l in labels for l in ['Hungry','Lonely','Stressed']), labels)
    c_low=await C(pg,'concentration'); await M(pg,"S.happiness=90;S.needs.hunger=20;S.needs.social=80;S.stress=10;S.needs.sleep=90"); c_hi=await C(pg,'concentration')
    check('E: low mood/needs lower focus', c_low<c_hi, (c_low,c_hi))
    await M(pg,"S.happiness=90;S.needs.hunger=95;S.needs.social=5;S.stress=90;S.needs.sleep=15"); h0=(await st(pg))['happiness']
    await T(pg,"advanceMinutes(600)"); h1=(await st(pg))['happiness']
    check('E: mood drifts toward what your life looks like (down when hungry, lonely, stressed)', h1<h0, (h0,h1))
    await T(pg,"openTab('home')"); await pg.click("[data-subtab='today']"); t4=await pg.inner_text('#panel-host')
    check('E: Mood card with reasons and focus on Home', 'focus' in t4.lower() and ('Hungry' in t4 or 'Lonely' in t4 or 'Stressed' in t4), t4[:200])
    # ---------- F: global anti-farming ----------
    s=await st(pg); fr=[x for x in s['people'] if x['role']=='friend'][0]
    await M(pg,f"S.farm=null;S.people.find(x=>x.id==='{fr['id']}').rel=40;S.clock.minute=900")
    rels=[]
    for i in range(4):
        r0=[x for x in (await st(pg))['people'] if x['id']==fr['id']][0]['rel']; await M(pg,"S.clock.minute=900;S.energy=100")
        await C(pg,'personAction',fr['id'],'talk'); r1=[x for x in (await st(pg))['people'] if x['id']==fr['id']][0]['rel']; rels.append(round(r1-r0,2))
    check('F: relationship gains shrink and stop after 3 per day per person+action', rels[3]==0 and rels[0]>=rels[2], rels)
    s=await st(pg); e0=s['needs']['hunger']
    await M(pg,"S.needs.hunger=80")
    for i in range(5): await T(pg,"action('eat')")
    s=await st(pg); check('F: needs are exempt (eat 5 times still works)', s['needs']['hunger']<80, s['needs']['hunger'])
    await M(pg,"S.farm=null;S.skills.art=20"); g=[]
    for i in range(4): g.append(round(await C(pg,'practiceSkill','art',3),2))
    check('F: same skill: 100% → 65% → 40% → 0 (4th time)', g[3]==0 and g[0]>g[1]>g[2]>0, g)
    check('no JS errors', not pg.errs, pg.errs[:3]); await b.close()
asyncio.run(main())
