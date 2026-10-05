from harness import *
async def C(pg,fn,*a): return await T(pg,"call("+",".join([json.dumps(fn)]+[json.dumps(x) for x in a])+")")
async def M(pg,code): return await pg.evaluate("c=>__LIFE_SIM_TEST__.mutate(c)",code)
async def life(b,age,friends=True):
    pg=await new_page(b); await new_life(pg); await T(pg,f"setAge({age})"); yr=int((await st(pg))['clock']['dateISO'][:4])
    if friends:
        await M(pg,f"S.people.filter(p=>!['parent','sibling','grandparent'].includes(p.role)&&p.role==='friend').forEach((p,i)=>{{p.rel=i<2?80:10;p.age={age};if(i<2){{p.firstName=['Chloe','Jade'][i];p.name=p.firstName}};const n=S.npcs.find(x=>x.id===p.npcId);if(n)n.birthYear={yr}-{age}}})")
    else: await M(pg,"S.people.filter(p=>p.role==='friend').forEach(p=>{p.rel=5})")
    await M(pg,"S.events.forEach(e=>{if(e.status==='Open')e.status='Resolved'})"); return pg
async def opts(pg): return {o['id']:o['label'] for o in await C(pg,'birthdayCelebrationOptions')}
async def choose(pg,id,roll=None):
    await M(pg,f"S.events.unshift({{id:'bpx{id}',type:'birthdayParty',title:'Birthday',text:'',status:'Open',priority:3,choices:[{{id:'{id}',label:'x'}}],createdAt:{{dateISO:S.clock.dateISO,minute:S.clock.minute}}}})")
    if roll is not None: await pg.evaluate(f"()=>{{window.__r=Math.random;Math.random=()=>{roll}}}")
    try: await T(pg,f"eventChoice('bpx{id}','{id}')")
    finally:
        if roll is not None: await pg.evaluate("()=>{Math.random=window.__r}")
    return await st(pg)
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path=CHROME); errs=[]
    pg=await life(b,2); o=await opts(pg); check('H1 age 2: family-only options, no friend outing', not any('friend' in l.lower() for l in o.values()) and 'familyHome' in o, o); errs+=pg.errs; await pg.close()
    pg=await life(b,5); o=await opts(pg)
    check('H1 age 5: no "Go out with friends"; friends only via caregiver-organized plans', not any('go out' in l.lower() for l in o.values()) and 'friendOuting' not in o and 'playdate' in o, o)
    s=await choose(pg,'friendOuting'); check('H1 age 5: forcing an outing id is refused (not an option at this age)', not any('celebrate out with' in l['text'] for l in s['log'][:3]))
    s=await choose(pg,'playdate',0.01); t=s['log'][0]['text']
    check('H1 age 5 regression: never "You celebrate out with Chloe, Jade — karaoke"; a caregiver organizes it', 'You celebrate out with' not in t and 'karaoke' not in t and any(w in t for w in ['invites','sets up','family']) , t)
    errs+=pg.errs; await pg.close()
    pg=await life(b,7); o=await opts(pg); check('H1 age 7: a friend outing exists only as "ask your parents to organize"', 'caregiverOuting' in o and 'parents' in o['caregiverOuting'].lower() and 'friendOuting' not in o, o)
    s=await choose(pg,'caregiverOuting',0.01); t=s['log'][0]['text']
    check('H1 age 7: the outing narrative includes the caregiver arranging and supervising, with an age-appropriate activity', ('arranges' in t and 'nearby' in t) and 'karaoke' not in t and 'laser tag' not in t, t)
    check('H1: the celebration takes real time and ends at home', s['location']=='Home')
    errs+=pg.errs; await pg.close()
    pg=await life(b,8,friends=False); o=await opts(pg)
    check('H1 age 8 with no suitable friends: no friend options at all', not any(k in o for k in ('caregiverOuting','friendOuting','playdate','sleepover')), o)
    s=await choose(pg,'big'); check('H1 age 8 no friends: a family party, no invented friends', 'with family' in s['log'][0]['text'], s['log'][0]['text'])
    errs+=pg.errs; await pg.close()
    pg=await life(b,10); await M(pg,"S.familyRules=Object.assign(S.familyRules||{},{strictness:95});S.family.trust=30")
    s=await choose(pg,'friendOuting',0.99); alt=[e for e in s['events'] if e['type']=='birthdayAlt' and e['status']=='Open']
    check('H1 age 10: a strict caregiver refuses → you do NOT go; alternatives offered (another celebration / talk it over / accept)', not any('drops you' in l['text'] for l in s['log'][:3]) and alt and {c['id'] for c in alt[0]['choices']}=={'alt','negotiate','accept'}, alt and alt[0]['choices'])
    await T(pg,f"eventChoice('{alt[0]['id']}','accept')"); s=await st(pg); check('H1 age 10: accepting gives a family celebration instead', 'family dinner' in s['log'][0]['text'].lower(), s['log'][0]['text'])
    errs+=pg.errs; await pg.close()
    pg=await life(b,11); s=await choose(pg,'friendOuting',0.01); t=s['log'][0]['text']
    check('H1 age 11: with approval, an outing with friends — dropped off and picked up by a caregiver', 'drops you' in t and 'picks you up' in t, t); errs+=pg.errs; await pg.close()
    pg=await life(b,15); o=await opts(pg); check('H1 age 15: "Go out with friends" is available (still subject to house rules)', o.get('friendOuting')=='Go out with friends', o); errs+=pg.errs; await pg.close()
    pg=await life(b,18); o=await opts(pg); s=await choose(pg,'friendOuting',0.01)
    check('H1 age 18: independent celebration, no permission needed', 'friendOuting' in o and not any(e['type']=='birthdayAlt' for e in s['events']) and 'celebrate at' in s['log'][0]['text'], s['log'][0]['text'])
    errs+=pg.errs
    pg2=await life(b,12); s=await choose(pg2,'big',0.99); t=s['log'][0]['text']
    check('H1: invited friends can decline with a reason (not everyone is available)', any(r in t for r in ['has plans','away','sick','permission']) or 'with family' in t, t); errs+=pg2.errs
    check('H1: no JS errors', not errs, errs[:3]); await b.close()
asyncio.run(main())
