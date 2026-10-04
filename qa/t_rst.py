from harness import *
async def C(pg,fn,*a): return await T(pg,"call("+",".join([json.dumps(fn)]+[json.dumps(x) for x in a])+")")
async def M(pg,code): return await pg.evaluate("c=>__LIFE_SIM_TEST__.mutate(c)",code)
async def person(pg,pid): return [x for x in (await st(pg))['people'] if x['id']==pid][0]
async def step(pg,pid,s,target):
    for i in range(4):
        await C(pg,'loveStep',pid,s); st_=(await person(pg,pid))['love']['stage']
        if st_==target: return st_
        await C(pg,'addLove',pid,100)
    return st_
async def peer(pg,age,attr=100,rel=100,trust=100):
    s=await st(pg); f=[x for x in s['people'] if x['role']=='friend' and x.get('npcId')][0]
    await M(pg,f"const p=S.people.find(x=>x.id==='{f['id']}');p.age={age};p.rel={rel};p.trust={trust};p.conflict=0;p.romanceInit=true;p.attraction={attr};p.romanceOpen=true;p.boundaries=[];p.romanceStage='none';p.love=null;p.datingNpc=null;const n=S.npcs.find(x=>x.id===p.npcId);if(n)n.birthYear=new Date(S.clock.dateISO).getUTCFullYear()-{age};S.romance.partnerId=null")
    return f['id']
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path=CHROME)
    # ---------- R40: love progression (teen) ----------
    pg=await new_page(b); await new_life(pg); await T(pg,"setAge(16)"); await T(pg,"setMoney(500,0,0)"); fid=await peer(pg,16)
    await pg.evaluate("id=>{const b=document.createElement('button');b.dataset.romance='admire';b.dataset.personId=id;document.getElementById('panel-host').appendChild(b);b.click()}",fid)
    pp=await person(pg,fid); check('R40: admitting you like them → at least a one-sided crush; mutual only when they like you back', pp['love']['stage']=='crushMutual' if pp.get('romanceStage')=='crush' else pp['love']['stage']=='crushOne', (pp.get('love'),pp.get('romanceStage')))
    await pg.evaluate("id=>{const b=document.createElement('button');b.dataset.romance='askOut';b.dataset.personId=id;document.getElementById('panel-host').appendChild(b);b.click()}",fid)
    pp=await person(pg,fid); check('R40: they say yes to going out → "Going out / getting to know each other"', pp['love']['stage']=='goingOut', pp['love'])
    check('R40: "make it official" only once you have spent some time together', await C(pg,'nextLoveStep',fid) is None)
    await C(pg,'addLove',fid,70); nx=await C(pg,'nextLoveStep',fid); check('R40: after enough good time together → ask to be boyfriend/girlfriend', nx and nx['id']=='official', nx)
    await step(pg,fid,'official','official'); pp=await person(pg,fid); check('R40: they agree → Boyfriend / girlfriend (official, with a milestone)', pp['love']['stage']=='official' and any('Boyfriend' in m['title'] for m in (await st(pg))['milestones']), pp['love'])
    await C(pg,'addLove',fid,100); pp=await person(pg,fid); check('R40: with enough love, closeness and trust → In love (automatic)', pp['love']['stage']=='inLove', pp['love'])
    await C(pg,'addLove',fid,100); pp=await person(pg,fid); check('R40: → Super in love', pp['love']['stage']=='superInLove', pp['love'])
    await C(pg,'addLove',fid,70); nx=await C(pg,'nextLoveStep',fid); check('R40: at 16+ a promise ring becomes possible', nx and nx['id']=='ring', nx)
    await step(pg,fid,'ring','serious'); s=await st(pg); pp=await person(pg,fid)
    check('R40: promise ring → Serious', pp['love']['stage']=='serious' and s['romance'].get('promiseRing',{}).get('personId')==fid, pp['love'])
    await C(pg,'addLove',fid,100); nx=await C(pg,'nextLoveStep',fid); check('SAFETY: a minor at "Serious" gets no adult step (no moving in / proposal)', nx is None, nx)
    await C(pg,'loveStep',fid,'moveIn'); await C(pg,'loveStep',fid,'proposeSimple'); await C(pg,'loveStep',fid,'baby'); pp=await person(pg,fid)
    check('SAFETY: adult steps are refused in logic for minors (even if called directly)', pp['love']['stage']=='serious' and not (await st(pg))['romance'].get('livingTogether'))
    await pg.evaluate("id=>{const b=document.createElement('button');b.dataset.romance='breakUp';b.dataset.personId=id;document.getElementById('panel-host').appendChild(b);b.click()}",fid)
    s=await st(pg); pp=await person(pg,fid)
    check('R40: breaking up resets the stage and asks about the promise ring', pp['love']['stage']=='noticing' and any(e['type']=='ringBack' for e in s['events']))
    await pg.close()
    pg=await new_page(b); await new_life(pg); await T(pg,"setAge(15)"); fid=await peer(pg,15)
    await C(pg,'setLoveStage',fid,'superInLove'); await C(pg,'addLove',fid,90); check('R40: no promise ring under 16', await C(pg,'nextLoveStep',fid) is None)
    await pg.close()
    # ---------- R40: adult stages ----------
    pg=await new_page(b); await new_life(pg); await T(pg,"setAge(24)"); await T(pg,"setMoney(40000,0,0)")
    await M(pg,"S.people.push({id:'adult1',name:'Sam Rivera',fullName:'Sam Rivera',firstName:'Sam',surname:'Rivera',role:'friend',roleLabel:'partner',age:25,rel:95,trust:95,fun:60,conflict:0,history:[],memory:'',traits:['Kind'],mood:'good',knownSince:22,romanceInit:true,attraction:95,romanceOpen:true,romanceStage:'partner',boundaries:[]});S.romance.partnerId='adult1';S.romance.partner='Sam Rivera'")
    await C(pg,'setLoveStage','adult1','serious'); await C(pg,'addLove','adult1',90)
    nx=await C(pg,'nextLoveStep','adult1'); check('R40 (adults): Serious → ask to move in together', nx and nx['id']=='moveIn', nx)
    await step(pg,'adult1','moveIn','livingTogether'); s=await st(pg); check('R40: moved in together', s['people'][-1]['love']['stage']=='livingTogether' and s['romance'].get('livingTogether'))
    await C(pg,'addLove','adult1',90); await step(pg,'adult1','proposeRing','engaged'); s=await st(pg); st_=[x for x in s['people'] if x['id']=='adult1'][0]['love']['stage']
    check('R40: proposal with a ring → engaged', st_=='engaged', st_)
    await C(pg,'loveStep','adult1','wed-small'); s=await st(pg); ev=[e for e in s['calendar'] if e['type']=='wedding']
    check('R40: wedding planned on the calendar (~2 months ahead)', ev and ev[0]['status']=='Scheduled', ev and ev[0]['dateISO'])
    await T(pg,f"setClock('{ev[0]['dateISO']}',950)"); await T(pg,"advanceMinutes(30)"); s=await st(pg); st_=[x for x in s['people'] if x['id']=='adult1'][0]['love']['stage']
    check('R40: wedding day → married (milestone)', st_=='married' and any('Married' in m['title'] for m in s['milestones']), st_)
    await C(pg,'addLove','adult1',80); await step(pg,'adult1','adopt','family'); s=await st(pg); fu=[f for f in s['followUps'] if f['type']=='babyArrives']
    check('R40: starting a family (adoption) is scheduled months ahead', fu and [x for x in s['people'] if x['id']=='adult1'][0]['love']['stage']=='family')
    await M(pg,"S.followUps.filter(f=>f.type==='babyArrives').forEach(f=>{f.dateISO=S.clock.dateISO;f.minute=0;if(f.at){f.at.dateISO=S.clock.dateISO;f.at.minute=0}})"); await T(pg,"advanceMinutes(5)"); s=await st(pg)
    check('R40: the baby arrives and joins the family', any(x['role']=='child' for x in s['people']), [x['role'] for x in s['people']][-3:])
    check('adult: no JS errors', not pg.errs, pg.errs[:3]); await pg.close()
    # ---------- R59/60: NPC families & couples ----------
    pg=await new_page(b); await new_life(pg); await T(pg,"setAge(15)"); s=await st(pg)
    yr=int(s['clock']['dateISO'][:4]); peers=[n for n in s['npcs'] if abs(yr-n['birthYear']-15)<=1]
    check('R59: more NPCs at your age (≥ 28 peers)', len(peers)>=28, len(peers))
    f=[x for x in s['people'] if x['role']=='friend' and x.get('npcId')][0]
    await T(pg,"openTab('people')"); await pg.click(f"[data-person-open='{f['id']}']"); txt=await pg.inner_text('#choice-content')
    check('R59: NPCs have families (who they live with, siblings)', 'Lives with' in txt, txt[:200])
    check('S: person window has "History together" and "Shared memories" side by side', 'HISTORY TOGETHER' in txt.upper() and 'SHARED MEMORIES' in txt.upper())
    cols=await pg.evaluate("(()=>{const c=document.querySelector('#choice-content .person-cols');if(!c)return null;const [a,b]=c.children;return [a.getBoundingClientRect().left,b.getBoundingClientRect().left,a.getBoundingClientRect().width,b.getBoundingClientRect().width]})()")
    check('S: history on the left (wider), memories on the right (narrower)', cols and cols[0]<cols[1] and cols[2]>cols[3], cols)
    await T(pg,"call('closeChoiceModal')"); await M(pg,f"S.romance.partnerId='{f['id']}';const p=S.people.find(x=>x.id==='{f['id']}');p.age=15;p.romanceStage='partner';p.love={{stage:'inLove',progress:20}};const n=S.npcs.find(x=>x.id===p.npcId);if(n)n.birthYear={yr-15}")
    await T(pg,"openTab('people')"); card=await pg.inner_text('#panel-host')
    check('S/R: your partner\'s card shows the love stage (no conflicting tier label)', 'In love' in card)
    await pg.click(f"[data-person-open='{f['id']}']"); check('R: no "set them up" button on your own partner', not await pg.query_selector("#choice-content [data-matchmake-open]"))
    await T(pg,"call('closeChoiceModal')"); await M(pg,"S.romance.partnerId=null")
    await M(pg,f"const p=S.people.find(x=>x.id==='{f['id']}');p.history=[{{dateISO:S.clock.dateISO,age:S.age,text:'You had a real conversation.',importance:1}},{{dateISO:S.clock.dateISO,age:S.age,text:'Became your Close Friend.',importance:3}},{{dateISO:S.clock.dateISO,age:S.age,text:'Something changed in their life while you were elsewhere.',importance:2}}]")
    await T(pg,"call('closeChoiceModal')"); await pg.click(f"[data-person-open='{f['id']}']")
    mem=await pg.inner_text('#choice-content .pm-list'); hist=await pg.inner_text('#choice-content .ph-list')
    check('S: memories keep only important moments (no generic filler)', 'Close Friend' in mem and 'real conversation' not in mem and 'Something changed' not in mem, mem)
    check('S: the full action log stays on the left', 'real conversation' in hist)
    await T(pg,"call('closeChoiceModal')")
    # couples
    singles=[x for x in s['people'] if x['role']=='friend' and x.get('npcId')]
    a,bq=singles[0],singles[1]
    await M(pg,f"[['{a['id']}','Female','Men'],['{bq['id']}','Male','Women']].forEach(([id,g,o])=>{{const p=S.people.find(x=>x.id===id);const n=S.npcs.find(x=>x.id===p.npcId);n.birthYear={yr-15};n.gender=g;n.orientation=o;p.age=15;p.rel=80;p.datingNpc=null}});S.npcCouples=[]")
    check('P3: two NPCs whose love interests match each other are compatible', await C(pg,'npcsCompatible',a['npcId'],bq['npcId']))
    ok=False
    for i in range(12):
        await C(pg,'matchmake',a['id'],bq['id']); s=await st(pg)
        if any(c['status']=='dating' for c in s.get('npcCouples',[])): ok=True; break
    check('R60: matchmaking two single friends can create a real couple', ok)
    s=await st(pg); pa=await person(pg,a['id']); pb=await person(pg,bq['id'])
    check('R60: both friends now show who they are dating (two-way)', pa.get('datingNpc')==pb['fullName'] and pb.get('datingNpc')==pa['fullName'], (pa.get('datingNpc'),pb.get('datingNpc')))
    c=[c for c in s['npcCouples'] if c['status']=='dating'][0]
    await C(pg,'breakNpcCouple',c['id'],'they wanted different things'); s=await st(pg); pa=await person(pg,a['id'])
    check('R60: breakups have a reason and clear both sides', any(x['status']=='broken' and x.get('reason') for x in s['npcCouples']) and not pa.get('datingNpc'))
    # prom together
    await M(pg,"S.npcCouples=[]"); await C(pg,'makeNpcCouple',(await person(pg,a['id']))['npcId'],(await person(pg,bq['id']))['npcId'])
    await M(pg,"S.people.forEach(p=>{p.promWith=null});S.npcs.forEach(n=>n.promWith=null)")
    pr=await C(pg,'ensureProm')
    if pr:
        import datetime as dt
        d=(dt.date.fromisoformat(pr['dateISO'])-dt.timedelta(days=20)).isoformat(); await T(pg,f"setClock('{d}',600)")
        for i in range(25): await C(pg,'promTick')
        pa=await person(pg,a['id']); pb=await person(pg,bq['id'])
        check('R60: a couple goes to prom together', pa.get('promWith')==pb['fullName'] and pb.get('promWith')==pa['fullName'], (pa.get('promWith'),pb.get('promWith')))
    # triangle
    s=await st(pg); cr=[x for x in s['people'] if x['role']=='friend' and x.get('npcId') and x['id'] not in (a['id'],bq['id'])][0]
    await M(pg,f"const p=S.people.find(x=>x.id==='{cr['id']}');const n=S.npcs.find(x=>x.id===p.npcId);n.birthYear={yr-15};p.age=15;p.love={{stage:'crushOne',progress:0}};p.datingNpc='Someone Else';p.romanceInit=true;p.attraction=60")
    await C(pg,'loveTriangleCheck',cr['id']); s=await st(pg); ev=[e for e in s['events'] if e['type']=='triangle' and e['status']=='Open']
    check('R60: your crush dating someone else is a real situation with choices', bool(ev))
    if ev: await T(pg,f"eventChoice('{ev[0]['id']}','happy')"); s=await st(pg); check('R60: choosing how to feel resolves it with a story', s['log'][0]['title']=='Happy for them')
    check('couples: no JS errors', not pg.errs, pg.errs[:3]); await pg.close()
    # ---------- T: UI reorganization ----------
    pg=await new_page(b); await new_life(pg); await T(pg,"setAge(5)")
    nav=await pg.inner_text('#nav') if await pg.query_selector('#nav') else await pg.evaluate("document.body.innerText")
    check('T: no separate "Growing Up" tab', 'Growing Up' not in nav)
    await T(pg,"openTab('places')"); tabs=await pg.evaluate("[...document.querySelectorAll('.subtab')].map(x=>x.dataset.subtab)")
    check('T: Daily Life has an "Independence" tab instead', 'independence' in tabs, tabs)
    await pg.click("[data-subtab='independence']"); txt=await pg.inner_text('#panel-host'); check('T: Independence shows self-care skills', 'INDEPENDENCE' in txt.upper() and '%' in txt)
    await pg.close()
    pg=await new_page(b); await new_life(pg); await T(pg,"setAge(15)")
    await T(pg,"openTab('people')"); tabs=await pg.evaluate("[...document.querySelectorAll('.subtab')].map(x=>x.dataset.subtab)")
    check('T: House rules no longer under People', 'rules' not in tabs, tabs)
    await T(pg,"openTab('family')"); txt=await pg.inner_text('#panel-host'); check('T: House rules and Love life live under Family & Relationships', 'HOUSE RULES' in txt.upper() and 'LOVE LIFE' in txt.upper())
    check('T: no JS errors', not pg.errs, pg.errs[:3]); await b.close()
asyncio.run(main())
