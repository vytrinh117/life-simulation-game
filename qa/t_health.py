from harness import *
async def C(pg,fn,*a): return await T(pg,"call("+",".join([json.dumps(fn)]+[json.dumps(x) for x in a])+")")
async def M(pg,code): return await pg.evaluate("c=>__LIFE_SIM_TEST__.mutate(c)",code)
ERR=[]
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path=CHROME)
    # ---------- 2A.1 health from birth, by age ----------
    for age,must,mustnot in [(3,['Health','Sleep quality'],['Energy','Fitness']),(6,['Health','Energy','Sleep quality'],['Fitness']),(12,['Health','Energy','Sleep quality'],['Fitness']),(16,['Health','Energy','Fitness','Stress'],[])]:
        pg=await new_page(b); await new_life(pg); await T(pg,f"setAge({age})"); nav=await pg.inner_text('#tabs'); await T(pg,"openTab('health')"); txt=await pg.inner_text('#panel-host')
        check(f'2A.1: Health tab exists and is age-appropriate at age {age}', 'Health' in nav and all(m in txt for m in must) and not any(f'\n{x}' in '\n'+txt.split('Current condition')[0].replace('Health is long-term','') for x in mustnot), [l for l in txt.split('\n')[:8]])
        ERR.extend(pg.errs); await pg.close()
    pg=await new_page(b); await new_life(pg); await T(pg,"setAge(10)"); s=await st(pg)
    check('2A.1: Looks and Smart exist for the player (0–100) and show in Identity', 0<=s['looks']<=100 and 0<=s['smart']<=100 and 'Looks' in await pg.inner_text('.identity-mini'), (s.get('looks'),s.get('smart')))
    npc=[n for n in s['npcs'] if n.get('looks') is not None and n.get('smart') is not None]
    check('2A.1: persistent NPCs get Looks and Smart', len(npc)==len(s['npcs'])>0)
    await pg.evaluate("s=>__LIFE_SIM_TEST__.loadState(s)",s); s2=await st(pg)
    check('2A.1: Looks/Smart (player and NPCs) are stable across save/reload — not re-rolled', s2['looks']==s['looks'] and s2['smart']==s['smart'] and all(a['looks']==b2['looks'] for a,b2 in zip(s['npcs'],s2['npcs'])))
    check('2A.1: Health and Energy are separate stats', 'health' in s and 'energy' in s)
    # creator: each Random changes only its own field (20×)
    vals=lambda: pg.evaluate("['c-name','c-surname','c-looks','c-smart','c-dob','c-gender','c-wealth'].map(id=>document.getElementById(id)?.value)")
    ok=True
    for k,idx in [('surname',1),('looks',2),('smart',3)]:
        for i in range(20):
            v0=await vals(); await pg.evaluate("k=>document.querySelector(`[data-random=\"${k}\"]`).click()",k); v1=await vals()
            if any(v0[j]!=v1[j] for j in range(len(v0)) if j!=idx) or v1[idx] in ('',None): ok=False
    check('2A.1: Random Surname / Looks / Smart each change ONLY their own field (20× each)', ok)
    await pg.close()
    # creator values flow into the new life
    pg=await new_page(b); await pg.evaluate("()=>{document.getElementById('c-surname').value='Nguyen';document.getElementById('c-looks').value='77';document.getElementById('c-smart').value='66'}")
    await new_life(pg); s=await st(pg)
    check('2A.1: creator Surname / Looks / Smart are used by the new life (surname = family name)', s.get('surname')=='Nguyen' and s.get('familyName')=='Nguyen' and s['looks']==77 and s['smart']==66, (s.get('surname'),s.get('familyName'),s.get('looks'),s.get('smart')))
    ERR.extend(pg.errs); await pg.close()
    # ---------- 2A.2 illness engine ----------
    pg=await new_page(b); await new_life(pg); await T(pg,"setAge(11)"); await M(pg,"S.health=85;S.energy=90")
    c=await C(pg,'startIllness','cold',{'severity':'mild'}); s=await st(pg); cond=s['healthState'].get('condition')
    check('2A.2: a deterministic mild cold appears with symptoms', cond and cond['type']=='cold' and cond['severity']=='mild' and len(cond['symptoms'])>=2)
    check('2A.2: the player does not know the diagnosis yet (only symptoms)', cond and not cond['known'])
    f=await C(pg,'concentration'); check('2A.2: illness lowers focus', f<1.0, f)
    e0=s['energy']; await T(pg,"advanceMinutes(1440)"); s=await st(pg); check('2A.2: illness drains energy in the morning', s['energy']<e0+5 and s['healthState']['condition']['progress']>0, (e0,s['energy']))
    t0=s['clock']; await C(pg,'sickRest'); s=await st(pg); check('2A.2: Rest passes real time and counts as resting', s['clock']['minute']==(t0['minute']+60)%1440 and s['healthState']['condition']['rested']==1)
    await C(pg,'sickTellParent'); s=await st(pg); check('2A.2: telling a parent is logged and can reveal what it is', any('Telling' in l['title'] for l in s['log'][:3]))
    m0=await pg.evaluate("()=>__LIFE_SIM_TEST__.getState().healthState.condition.progress")
    st0=await st(pg); await pg.evaluate("s=>__LIFE_SIM_TEST__.loadState(s)",st0); s=await st(pg)
    check('2A.2: the illness survives save/reload mid-way', s['healthState']['condition'] and s['healthState']['condition']['progress']==m0)
    await T(pg,"openTab('health')"); txt=await pg.inner_text('#panel-host'); check('2A.2: the health panel shows the current condition with care actions', 'Symptoms' in txt and 'Rest (1 h)' in txt)
    for i in range(14):
        await T(pg,"advanceMinutes(1440)")
        if not (await st(pg))['healthState'].get('condition'): break
    s=await st(pg); check('2A.2: recovery completes after several days (not instantly)', not s['healthState'].get('condition') and i>=2 and s['healthState']['history'] and s['healthState']['history'][0]['type']=='cold', i)
    got=False
    for i in range(300):
        if await C(pg,'tryStartIllness'): got=True; break
    check('2A.2: no new illness during the 14-day cooldown after recovering', not got)
    await M(pg,"S.health=95;S.healthState.sleep=85;S.stress=10"); hi=await C(pg,'calculateIllnessRisk'); await M(pg,"S.health=30;S.healthState.sleep=35;S.stress=85"); lo=await C(pg,'calculateIllnessRisk')
    check('2A.2: risk depends on health/sleep/stress (high health = lower, never zero)', 0<hi<lo and lo/hi>2, (hi,lo))
    ERR.extend(pg.errs); await pg.close()
    # realistic frequency over 120 simulated days for a healthy child
    pg=await new_page(b); await new_life(pg); await T(pg,"setAge(9)"); await M(pg,"S.health=88;S.healthState.sleep=80;S.healthState.history=[]")
    for i in range(120): await M(pg,"S.health=88;S.healthState.sleep=80;S.stress=20"); await C(pg,'healthDailyTick')
    s=await st(pg); n=len(s['healthState']['history'])+(1 if s['healthState'].get('condition') else 0)
    check('2A.2: a healthy child is sick only occasionally (0–3 illnesses in 120 days)', 0<=n<=3, n)
    ERR.extend(pg.errs); await pg.close()
    check('2A.1/2A.2: no JS errors on any page', not ERR, ERR[:3]); await b.close()
asyncio.run(main())
