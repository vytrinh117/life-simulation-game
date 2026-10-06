from harness import *
import datetime as dt
async def C(pg,fn,*a): return await T(pg,"call("+",".join([json.dumps(fn)]+[json.dumps(x) for x in a])+")")
async def M(pg,code): return await pg.evaluate("c=>__LIFE_SIM_TEST__.mutate(c)",code)
async def reload(pg): s=await st(pg); await pg.evaluate("s=>__LIFE_SIM_TEST__.loadState(s)",s); return await st(pg)
async def at(pg,d): await T(pg,f"setClock('{d}',600)")
async def fresh(b,traits=('Curious','Kind'),talents=('Science','Music')):
    pg=await new_page(b); await new_life(pg); await T(pg,"setAge(12)")
    await M(pg,f"S.personality={json.dumps(list(traits))};S.talents={json.dumps(list(talents))};S.dev=null;S.events.forEach(e=>{{if(e.status==='Open')e.status='Resolved'}})")
    await reload(pg); return pg
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path=CHROME); errs=[]
    pg=await fresh(b); s=await st(pg)
    check('#1 existing personality survives migration unchanged', s['personality']==['Curious','Kind'] and s['dev']['origin']['trait']=={'Curious':'core','Kind':'core'})
    check('#2 existing talents survive migration unchanged', s['talents']==['Science','Music'] and set(s['dev']['origin']['talent'])=={'Science','Music'})
    tb=await C(pg,'traitBoost','subject:Science'); tb2=await C(pg,'traitBoost','skill:music')
    check('#3 existing bonuses still flow through the canonical lists (Science talent +25% & Curious +15% on Science; Music talent on music)', tb['mult']>=1.39 and any('Science talent' in n for n in tb['notes']) and any('Curious' in n for n in tb['notes']) and tb2['mult']>=1.24, (tb,tb2))
    d0=dt.date.fromisoformat(s['clock']['dateISO'])
    for k in range(0,240,10): await at(pg,(d0+dt.timedelta(days=k)).isoformat()); await C(pg,'evaluateTraits'); await C(pg,'evaluateTalents')
    s=await st(pg)
    check('#4/#5/#6 empty slots are never auto-filled: 8 months with 2 traits / 2 talents and no evidence → still 2 / 2', len(s['personality'])==2 and len(s['talents'])==2)
    # #7 / #8: farming the same action/context
    for i in range(200): await C(pg,'recordTraitEvidence','Responsible',{'source':'chore','context':'washing dishes'})
    for i in range(200): await C(pg,'recordTalentEvidence','Cooking',{'source':'cooking','context':'same omelette','quality':1})
    await C(pg,'evaluateTraits'); await C(pg,'evaluateTalents'); s=await st(pg)
    check('#7 200 repeats of the same action in one day do not create a trait', 'Responsible' not in s['personality'] and (await C(pg,'evStats','trait','Responsible'))['score']<=2, await C(pg,'evStats','trait','Responsible'))
    check('#8 200 repeats of the same action in one day do not create a talent (not even an emerging one)', 'Cooking' not in s['talents'] and 'Cooking' not in s['dev']['emerging'])
    d1=dt.date.fromisoformat(s['clock']['dateISO'])
    for k in range(40): await at(pg,(d1+dt.timedelta(days=k)).isoformat()); [await C(pg,'recordTraitEvidence','Responsible',{'source':'chore','context':'washing dishes'}) for _ in range(3)]
    await C(pg,'evaluateTraits'); s=await st(pg)
    check('#7 even daily for 40 days, the SAME context alone does not make a trait (it may become a developing tendency)', 'Responsible' not in s['personality'], (await C(pg,'evStats','trait','Responsible'), s['dev']['developing']))
    await M(pg,"S.skills=Object.assign(S.skills||{},{baking:100,cooking:100,art:100,sports:100})"); await C(pg,'evaluateTalents'); s=await st(pg)
    check('#9 maxed skills alone do not create a talent', s['talents']==['Science','Music'])
    errs+=pg.errs; await pg.close()
    # #10 emerging strength, #11 recognition needs sustained evidence, #12 canonical, #15 history
    pg=await fresh(b); s=await st(pg); d0=dt.date.fromisoformat(s['clock']['dateISO'])
    await C(pg,'recordTalentEvidence','Art',{'source':'Art Exhibition','context':'Art Exhibition','quality':3,'eventId':'solo-1'}); await C(pg,'evaluateTalents'); s=await st(pg)
    check('#11 one isolated outstanding event does not recognize (or even surface) a talent', 'Art' not in s['talents'] and 'Art' not in s['dev']['emerging'])
    ctxs=['art class','Art Exhibition','sketching club','mural project']
    for k in range(30): await at(pg,(d0+dt.timedelta(days=k)).isoformat()); await C(pg,'recordTalentEvidence','Art',{'source':ctxs[k%4],'context':ctxs[k%4],'quality':2 if k%3==0 else 1})
    await C(pg,'evaluateTalents'); s=await st(pg); notice=[e for e in s['events'] if e['type']=='talentNotice' and e['status']=='Open']
    check('#10 accumulated evidence → Emerging Strength (a story: someone notices), NOT a recognized talent yet', 'Art' in s['dev']['emerging'] and 'Art' not in s['talents'] and notice and {c['id'] for c in notice[0]['choices']}=={'explore','casual','notnow'}, notice and notice[0]['text'])
    check('#10 no farmable meter: the UI shows no percentages for development', '%' not in await C(pg,'devStatusHtml') and 'Emerging strengths' in await C(pg,'devStatusHtml'))
    await T(pg,f"eventChoice('{notice[0]['id']}','explore')")
    for k in range(30,110,2): await at(pg,(d0+dt.timedelta(days=k)).isoformat()); await C(pg,'recordTalentEvidence','Art',{'source':ctxs[k%4],'context':ctxs[k%4],'quality':2})
    await C(pg,'evaluateTalents'); s=await st(pg); before=list(s['talents'])
    await C(pg,'recordTalentEvidence','Art',{'source':'Art Exhibition','context':'Art Exhibition','quality':3,'eventId':'final-1','recognizerId':None}); await C(pg,'evaluateTalents'); s=await st(pg)
    check('#11/#12 only after months of sustained, varied evidence (plus a strong result) → Recognized Talent, added to the canonical S.talents', 'Art' in s['talents'] and s['dev']['origin']['talent']['Art']=='recognized', (before,s['talents']))
    h=s['dev']['talentHistory'][0]; check('#15 recognition history records context (talent, date, age, recognizer, source/event)', h['talent']=='Art' and h['dateISO'] and h['age']==s['age'] and h['recognizer'] and (h['event'] or h['source']), h)
    check('S: official recognition is a milestone (only that)', any('Art talent recognized' in m['title'] for m in s['milestones'][:3]))
    tb=await C(pg,'traitBoost','skill:art'); check('#3 a newly recognized talent gets the existing bonus through the same path', any('Art talent' in n for n in tb['notes']), tb)
    # #16 persistence, #17 idempotent migration
    ev0=json.dumps(s['dev']['ev'],sort_keys=True); s2=await reload(pg)
    check('#16 development evidence survives save/reload', json.dumps(s2['dev']['ev'],sort_keys=True)==ev0 and s2['dev']['talentHistory']==s['dev']['talentHistory'])
    for i in range(3): await C(pg,'migrateDev')
    s3=await reload(pg); s3=await reload(pg)
    check('#17 repeated migration duplicates nothing (traits, talents, evidence, history)', s3['personality']==s['personality'] and s3['talents']==s['talents'] and len(s3['dev']['talentHistory'])==len(s['dev']['talentHistory']) and json.dumps(s3['dev']['ev'],sort_keys=True)==ev0)
    errs+=pg.errs; await pg.close()
    # developed personality through varied sustained behaviour; caps
    pg=await fresh(b); s=await st(pg); d0=dt.date.fromisoformat(s['clock']['dateISO'])
    for k in range(0,52,4): await at(pg,(d0+dt.timedelta(days=k)).isoformat()); await C(pg,'recordTraitEvidence','Responsible',{'source':'homework on time','context':'Mathematics'}); await C(pg,'recordTraitEvidence','Responsible',{'source':'kept a plan','context':'study'})
    await C(pg,'evaluateTraits'); s=await st(pg)
    check('O/N: varied, sustained behaviour over weeks → a Developed trait (Core traits untouched)', 'Responsible' in s['personality'] and s['dev']['origin']['trait']['Responsible']=='developed' and s['dev']['origin']['trait']['Curious']=='core', (s['personality'],s['dev']['origin']['trait']))
    await M(pg,"S.personality=['Curious','Kind','Responsible','Calm','Funny'];S.talents=['Science','Music','Art','Math','Sports'];S.dev.origin.trait.Calm='core';S.dev.origin.trait.Funny='core'")
    for k in range(0,120,3): await at(pg,(d0+dt.timedelta(days=60+k)).isoformat()); await C(pg,'recordTraitEvidence','Empathetic',{'source':'helped','context':['a friend','a sibling'][k%2]}); await C(pg,'recordTalentEvidence','Cooking',{'source':'dinner','context':['family dinner','bake sale'][k%2],'quality':3})
    await C(pg,'evaluateTraits'); await C(pg,'evaluateTalents'); s=await st(pg)
    check('#13 talents never exceed 5', len(s['talents'])==5)
    check('#14 personality never exceeds 5', len(s['personality'])==5)
    # #18 People/Profile intact
    f=[x for x in s['people'] if x['role']=='friend'][0]; pr=await C(pg,'profileHtml',f['id'])
    await T(pg,"openTab('people')"); card=await pg.inner_text('#panel-host')
    check('#18 People cards and Profile still render normally', 'Personality / Lifestyle' in pr and 'Closeness:' in card)
    await T(pg,"openTab('home')"); html=await pg.inner_html('#panel-host') ; await T(pg,"openTab('home')")
    errs+=pg.errs; check('3A.6: no JS errors', not errs, errs[:3]); await b.close()
asyncio.run(main())
