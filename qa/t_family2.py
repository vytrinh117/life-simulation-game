from harness import *
import datetime as dt
async def C(pg,fn,*a): return await T(pg,"call("+",".join([json.dumps(fn)]+[json.dumps(x) for x in a])+")")
async def M(pg,code): return await pg.evaluate("c=>__LIFE_SIM_TEST__.mutate(c)",code)
async def roll(pg,v,code):
    await pg.evaluate(f"()=>{{window.__r=Math.random;Math.random=()=>{v}}}")
    try: return await T(pg,code)
    finally: await pg.evaluate("()=>{Math.random=window.__r}")
async def withSib(b,trait,age=12):
    pg=await new_page(b); await new_life(pg); await T(pg,f"setAge({age})")
    await M(pg,f"S.people=S.people.filter(p=>!['older sibling','younger sibling'].includes(p.role));S.people.push({{id:'sib1',name:'Younger brother',firstName:'Leo',fullName:'Leo Test',role:'younger sibling',age:6,gender:'Male',residence:'home',rel:60,trust:60,history:[],traits:['{trait}']}});S.family.lastSibReq=null;S.events.forEach(e=>{{if(e.status==='Open')e.status='Resolved'}})")
    return pg
async def openReq(pg,kind=None):
    for i in range(30):
        await M(pg,"S.family.lastSibReq=null;S.events.filter(e=>e.type==='siblingRequest'&&e.status==='Open').forEach(e=>e.status='Resolved')")
        await roll(pg,0.01,"call('siblingRequestTick')"); s=await st(pg); e=[x for x in s['events'] if x['type']=='siblingRequest' and x['status']=='Open']
        if e and (kind is None or e[0]['payload']['kind']==kind): return e[0]
    return None
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path=CHROME); errs=[]
    # ---------- 2B.3 future sibling ----------
    pg=await new_page(b); await new_life(pg); await T(pg,"setAge(5)")
    await M(pg,"S.people=S.people.filter(p=>!['older sibling','younger sibling'].includes(p.role));const m=S.people.find(p=>p.role==='parent'&&/Mom/.test(p.name));m.age=32;S.family.sizePref='large';S.family.expecting=null;S.family.lastBaby=null")
    check('2B.3: a family that wants more children (and fits) can expect a baby', await C(pg,'babyEligible'))
    due=await C(pg,'announceBaby'); s=await st(pg)
    check('2B.3: the parents share the news (non-explicit) with a due date months away', s['family']['expecting'] and any('Big family news' in l['title'] for l in s['log'][:2]) and (dt.date.fromisoformat(due)-dt.date.fromisoformat(s['clock']['dateISO'])).days>=180)
    await T(pg,f"setClock('{(dt.date.fromisoformat(due)-dt.timedelta(days=1)).isoformat()}',1435)"); await T(pg,"advanceMinutes(20)"); await T(pg,"advanceMinutes(1440)"); s=await st(pg)
    baby=[x for x in s['people'] if x['role']=='younger sibling']
    check('2B.3: the baby arrives on time as a real younger sibling living at home, with a milestone', baby and baby[0]['age']<=1 and baby[0]['residence']=='home' and any('A new' in m['title'] for m in s['milestones'][:5]), baby and (baby[0]['name'],baby[0]['age']))
    ng=await C(pg,'nameGender',baby[0].get('firstName') or '') if baby else None
    check('2B.3: the baby gets a real name that matches their gender', baby and baby[0].get('fullName') and (ng is None or ng==baby[0]['gender']), baby and (baby[0].get('fullName'),baby[0]['gender'],ng))
    check('2B.3: no second baby right away (spacing / already at target)', not await C(pg,'babyEligible'))
    errs+=pg.errs; await pg.close()
    pg=await new_page(b); await new_life(pg); await T(pg,"setAge(9)"); await M(pg,"S.people=S.people.filter(p=>!['older sibling','younger sibling'].includes(p.role));S.people.push({id:'s2',name:'Older sister',role:'older sibling',age:12,gender:'Female',residence:'home',rel:50,history:[]});S.family.sizePref='small';S.family.expecting=null")
    check('2B.3: a family that already has the children it wants does not expect more', not await C(pg,'babyEligible'))
    await M(pg,"S.family.sizePref='large';S.people.find(p=>p.role==='parent'&&/Mom/.test(p.name)).age=46")
    check('2B.3: not when the parents are past the age range', not await C(pg,'babyEligible'))
    errs+=pg.errs; await pg.close()
    # ---------- 2B.4 sibling requests ----------
    pg=await withSib(b,'Kind'); e=await openReq(pg,'park')
    check('2B.4: a younger sibling at home asks you something (a real person, four answers)', e and e['participants']==['sib1'] and {c['id'] for c in e['choices']}=={'yes','no','askParent','later'}, e and e['text'])
    t0=(await st(pg))['clock']; await T(pg,f"eventChoice('{e['id']}','yes')"); s=await st(pg); sib=[x for x in s['people'] if x['id']=='sib1'][0]
    check('2B.4: yes → you take them to the park (time passes), they like you more', sib['rel']>60 and s['clock']!=t0)
    e=await openReq(pg); r0=[x for x in (await st(pg))['people'] if x['id']=='sib1'][0]['rel']; await T(pg,f"eventChoice('{e['id']}','no')"); s=await st(pg)
    check('2B.4: a kind sibling takes a reasonable "no" without losing closeness', [x for x in s['people'] if x['id']=='sib1'][0]['rel']>=r0 and not any(x['type']=='siblingNegotiate' and x['status']=='Open' for x in s['events']))
    e=await openReq(pg); await T(pg,f"eventChoice('{e['id']}','later')"); await T(pg,"advanceMinutes(1500)"); s=await st(pg)
    check('2B.4: "Maybe later" → they remember and remind you the next day', any('remembers' in l['title'] for l in s['log'][:12]))
    errs+=pg.errs; await pg.close()
    pg=await withSib(b,'Stubborn'); e=await openReq(pg); r0=60
    await roll(pg,0.01,f"eventChoice('{e['id']}','no')"); s=await st(pg); neg=[x for x in s['events'] if x['type']=='siblingNegotiate' and x['status']=='Open']
    check('2B.4: a stubborn sibling negotiates after a "no"', neg and {c['id'] for c in neg[0]['choices']}=={'deal','no'}, neg and neg[0]['text'])
    await T(pg,f"eventChoice('{neg[0]['id']}','deal')"); s=await st(pg)
    check('2B.4: taking the deal → closer, and they owe you help with chores', [x for x in s['people'] if x['id']=='sib1'][0]['rel']>r0 and s['family'].get('sibChoreHelp',0)>=1)
    e=await openReq(pg); await roll(pg,0.01,f"eventChoice('{e['id']}','no')"); s=await st(pg); neg=[x for x in s['events'] if x['type']=='siblingNegotiate' and x['status']=='Open']; r1=[x for x in s['people'] if x['id']=='sib1'][0]['rel']
    await T(pg,f"eventChoice('{neg[0]['id']}','no')"); s=await st(pg); check('2B.4: still no → a stubborn sibling is a bit hurt', [x for x in s['people'] if x['id']=='sib1'][0]['rel']<r1)
    e=await openReq(pg); await roll(pg,0.01,f"eventChoice('{e['id']}','askParent')"); s=await st(pg)
    check('2B.4: ask a parent → the parent can say yes (you take them)', 'take' in s['log'][0]['text'].lower() or 'Yes' in s['log'][0]['text'], s['log'][0]['text'][:120])
    e=await openReq(pg); await roll(pg,0.99,f"eventChoice('{e['id']}','askParent')"); s=await st(pg)
    check('2B.4: ask a parent → or say not today', 'Not today' in s['log'][0]['text'], s['log'][0]['text'][:120])
    await C(pg,'addItem','boardGame','QC')
    await M(pg,"S.family.lastSibReq=null;S.events.filter(e=>e.type==='siblingRequest'&&e.status==='Open').forEach(e=>e.status='Resolved')")
    await pg.evaluate("()=>{window.__r=Math.random;const seq=[0.01,0.0,0.99];let i=0;Math.random=()=>i<seq.length?seq[i++]:window.__r()}")
    try: await T(pg,"call('siblingRequestTick')")
    finally: await pg.evaluate("()=>{Math.random=window.__r}")
    s=await st(pg); ev=[x for x in s['events'] if x['type']=='siblingRequest' and x['status']=='Open']; e=ev[0] if ev and ev[0]['payload']['kind']=='borrow' else None
    if e:
        await T(pg,f"eventChoice('{e['id']}','yes')"); s=await st(pg); it=[i for i in s['inventoryItems'] if i['id']==e['payload']['itemId']][0]
        check('2B.4: lending an item marks it as lent', it.get('loanedTo')=='sib1')
        await T(pg,"advanceMinutes(3300)"); s=await st(pg); it=[i for i in s['inventoryItems'] if i['id']==e['payload']['itemId']][0]
        check('2B.4: ... and it comes back a couple of days later', not it.get('loanedTo'))
    else: check('2B.4: a borrow request is possible when you own something to lend', False)
    errs+=pg.errs; await pg.close()
    # ---------- 2B.5 house rules in the left dashboard ----------
    pg=await new_page(b); await new_life(pg); await T(pg,"setAge(12)"); await T(pg,"openTab('home')"); side=await pg.inner_text('.house-rules-mini')
    check('2B.5: House rules sit in the left dashboard under Identity (bedtime, curfew, going out, sleepovers)', all(k in side for k in ['Bedtime','Curfew','Going out','Sleepovers']), side[:120])
    await T(pg,"openTab('family')"); html=await pg.inner_html('#panel-host'); check('2B.5: the House rules card no longer sits in Family', '<h3>House rules</h3>' not in html)
    await T(pg,"setAge(19)"); await M(pg,"S.money=5000"); await C(pg,'moveTo','apartment'); await T(pg,"openTab('home')"); side=await pg.inner_text('.house-rules-mini')
    check('2B.5: living on your own → "your rules"', 'own' in side.lower(), side)
    errs+=pg.errs; check('2B.3–2B.5: no JS errors', not errs, errs[:3]); await b.close()
asyncio.run(main())
