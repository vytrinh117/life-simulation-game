from harness import *
import datetime as dt
async def C(pg,fn,*a): return await T(pg,"call("+",".join([repr(fn)]+[repr(x) for x in a])+")")
async def M(pg,code): return await pg.evaluate("c=>__LIFE_SIM_TEST__.mutate(c)",code)
async def play_scene(pg,pick=0,limit=12):
    for _ in range(limit):
        s=await st(pg)
        if not s.get('scene'): return True
        btns=await pg.query_selector_all('#choice-content [data-scene-choice]')
        if not btns: await pg.evaluate("__LIFE_SIM_TEST__.call('sceneChoice','x')"); continue
        await btns[min(pick,len(btns)-1)].click()
    return not (await st(pg)).get('scene')
async def prom_setup(pg,age=16):
    await new_life(pg); await T(pg,"setAge(%d)"%age); await T(pg,"setMoney(800,0,0)"); s=await st(pg)
    pr=await C(pg,'ensureProm')
    if not pr: return None
    d=(dt.date.fromisoformat(pr['dateISO'])-dt.timedelta(days=20)).isoformat()
    await T(pg,f"setClock('{d}',600)"); await C(pg,'promTick'); s=await st(pg)
    peers=[p for p in s['people'] if p['role']=='friend' and 15<=p['age']<=19]
    while len(peers)<3:
        await M(pg,"const n=S.npcs.find(x=>!S.people.some(p=>p.npcId===x.id)&&Math.abs((new Date(S.clock.dateISO).getUTCFullYear()-x.birthYear)-S.age)<=1);if(n){const p={id:'npc_'+n.id,name:n.fullName,fullName:n.fullName,firstName:n.firstName,surname:n.surname,npcId:n.id,role:'friend',roleLabel:'classmate',age:S.age,rel:60,trust:60,fun:50,conflict:0,history:[],memory:'',traits:['Kind'],mood:'good',knownSince:S.age};S.people.push(p)}")
        s=await st(pg); peers=[p for p in s['people'] if p['role']=='friend' and 15<=p['age']<=19]
    return s,pr,peers
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path=CHROME)
    # ======== SAFETY ========
    pg=await new_page(b); await new_life(pg); await T(pg,"setAge(16)")
    await M(pg,"S.people.push({id:'adult1',name:'Adult Person',fullName:'Adult Person',firstName:'Adult',surname:'Person',role:'friend',roleLabel:'acquaintance',age:26,rel:90,trust:90,fun:50,conflict:0,history:[],memory:'',traits:['Kind'],mood:'good',knownSince:10})")
    check('SAFETY: 16-year-old cannot romance a 26-year-old', await C(pg,'eligibleRomance','adult1') is False)
    await T(pg,"openTab('people')"); await pg.click("[data-person-open='adult1']"); m=await pg.inner_text('#choice-content')
    check('SAFETY: no romance button for an adult when the player is a minor', 'Romance' not in m)
    await T(pg,"call('closeChoiceModal')")
    s=await st(pg); f=[x for x in s['people'] if x['role']=='friend' and x.get('npcId')][0]
    await M(pg,f"const p=S.people.find(x=>x.id==='{f['id']}');p.age=16;p.rel=90;p.trust=90;p.romanceInit=true;p.attraction=95;p.romanceOpen=true;p.romanceStage='partner';p.boundaries=[];S.romance.partnerId=p.id;S.romance.partner=p.fullName")
    await M(pg,f"const p=S.people.find(x=>x.id==='{f['id']}');const n=S.npcs.find(x=>x.id===p.npcId);if(n)n.birthYear=new Date(S.clock.dateISO).getUTCFullYear()-16")
    await C(pg,'romanceAction',f['id'],'intimate'); s=await st(pg)
    check('SAFETY: intimacy action does nothing for minors (logic-level)', not any('intimate' in l['text'].lower() or 'fade to black' in l['text'] for l in s['log'][:3]))
    await pg.evaluate(f"__LIFE_SIM_TEST__.call('romanceAction','{f['id']}','x')")
    check('robustness: unknown romance action is ignored safely', not pg.errs, pg.errs[:1])
    await T(pg,"call('closeChoiceModal')")
    await pg.evaluate(f"(id)=>{{const b=document.createElement('button');b.dataset.romanceOpen=id;document.getElementById('panel-host').appendChild(b);b.click()}}",f['id'])
    menu=await pg.inner_text('#choice-content'); check('SAFETY: minor romance menu has no intimate option', 'intimate' not in menu.lower() and 'Plan a date' in menu, menu[:160])
    await T(pg,"call('closeChoiceModal')")
    await T(pg,f"setClock('{s['clock']['dateISO']}',1000)"); await C(pg,'startDate',f['id']); ok=await play_scene(pg,0,2)
    for _ in range(3):
        btns=await pg.query_selector_all('#choice-content [data-scene-choice]')
        if btns: await btns[0].click()
    txt=await pg.inner_text('#choice-content') if await pg.is_visible('#choice-overlay') else ''
    check('SAFETY: a minor date ends without kiss/invite-in choices', 'Kiss' not in txt and 'come in' not in txt.lower(), txt[:200])
    await play_scene(pg,0)
    await T(pg,f"setClock('{s['clock']['dateISO']}',1400)")
    await pg.evaluate("(id)=>{const b=document.createElement('button');b.dataset.sneak='over';b.dataset.personId=id;document.getElementById('panel-host').appendChild(b);b.click()}",f['id'])
    s=await st(pg); check('SAFETY: a minor cannot sneak a romantic partner over', not any('snuck them over' in (h.get('text') or '') for x in s['people'] for h in x.get('history',[])))
    check('safety: no JS errors', not pg.errs, pg.errs[:3]); await pg.close()
    # adult consent
    pg=await new_page(b); await new_life(pg); await T(pg,"setAge(24)")
    await M(pg,"S.people.push({id:'part1',name:'Sam Rivera',fullName:'Sam Rivera',firstName:'Sam',surname:'Rivera',role:'friend',roleLabel:'partner',age:25,rel:80,trust:70,fun:60,conflict:0,history:[],memory:'',traits:['Kind'],mood:'good',knownSince:22,romanceInit:true,attraction:80,romanceOpen:true,romanceStage:'partner',boundaries:['needsTime']});S.romance.partnerId='part1';S.romance.partner='Sam Rivera'")
    await M(pg,"S.people.find(x=>x.id==='part1').attraction=0;S.people.find(x=>x.id==='part1').trust=0")
    s0=await st(pg); t0=[x for x in s0['people'] if x['id']=='part1'][0]
    await C(pg,'romanceAction','part1','intimate'); s=await st(pg); t1=[x for x in s['people'] if x['id']=='part1'][0]
    check('81: adults can be asked; a "no" is respected (trust up, no penalty)', t1['trust']>=t0['trust'] and t1['rel']>=t0['rel'] and 'not tonight' in s['log'][0]['text'].lower(), s['log'][0]['text'][:120])
    await M(pg,"const p=S.people.find(x=>x.id==='part1');p.attraction=100;p.trust=100;p.rel=100;p.boundaries=[];S.stress=0")
    await C(pg,'romanceAction','part1','intimate'); s=await st(pg)
    check('81: mutual yes fades to black (no explicit content)', 'fade to black' in s['log'][0]['text'] and len(s['log'][0]['text'])<260, s['log'][0]['text'])
    await pg.close()
    # ======== §119 PROM ========
    pg=await new_page(b); r=await prom_setup(pg)
    check('63: prom scheduled for a high-schooler, season starts 4 weeks before', r is not None and (await st(pg))['school']['prom']['status']=='Season')
    s,pr,peers=r; a,bb,c=peers[0],peers[1],peers[2]
    await M(pg,f"const P=id=>S.people.find(x=>x.id===id);[['{a['id']}',100,100],['{bb['id']}',10,25],['{c['id']}',90,80]].forEach(([id,at,rel])=>{{const p=P(id);p.romanceInit=true;p.attraction=at;p.rel=rel;p.trust=60;p.conflict=0;p.romanceOpen=true;p.boundaries=[];p.traits=['Kind'];p.promWith=null;p.datingNpc=null;p.notGoingProm=false;p.age=S.age}});S.npcs.forEach(n=>n.birthYear=new Date(S.clock.dateISO).getUTCFullYear()-S.age)")
    await C(pg,'askToProm',bb['id'],'casual'); s=await st(pg); ask=s['school']['prom']['asked'][-1]
    check('119: ask → rejects, with a reason', ask['result']=='Rejected' and ask['reason'], (ask['result'],ask['reason']))
    check('119: rejection reason shown in outcome history', s['outcomes'][0]['reason']==ask['reason'])
    await M(pg,f"S.people.find(x=>x.id==='{c['id']}').promWith='Taylor Brooks'")
    await C(pg,'askToProm',c['id'],'private'); s=await st(pg); ask=s['school']['prom']['asked'][-1]
    check('119: NPC already has a date → tactful refusal naming them', ask['reason']=='Already has a date' and 'Taylor Brooks' in s['log'][0]['text'], s['log'][0]['text'][:100])
    await C(pg,'askToProm',a['id'],'private'); s=await st(pg); ask=s['school']['prom']['asked'][-1]
    check('119: ask another person afterward → crush accepts', ask['result']=='Accepted' and s['school']['prom']['partnerId']==a['id'], (ask['result'],ask['reason']))
    # prep + prom night
    for k in ['ticket','outfitBorrow','hairDiy','rideParents','dinnerHome','photos']: await C(pg,'promPrep',k)
    s=await st(pg); check('68: free/affordable prep options work', s['school']['prom']['ticketBought'] and s['school']['prom']['prep'].get('outfit')=='borrowed')
    await T(pg,f"setClock('{pr['dateISO']}',1100)"); await T(pg,"advanceMinutes(45)")
    hero=await pg.inner_text('#event-title'); check('69: prom night takes the hero', 'Prom' in hero, hero)
    await C(pg,'attendProm'); done=await play_scene(pg,0); s=await st(pg)
    check('69: multi-stage prom night resolves', done and s['school']['prom']['status']=='Done', s['school']['prom']['status'])
    check('70: prom memory recorded', any('Prom' in m['title'] and 'attended prom with' in m['text'] for m in s['milestones']))
    ev=[e for e in s['calendar'] if e['type']=='prom']; check('119: no prom event remains Due afterwards', ev and ev[0]['status'] not in ('Due','Scheduled','Attending'), ev and ev[0]['status'])
    check('prom: no JS errors', not pg.errs, pg.errs[:3]); await pg.close()
    # NPC asks / maybe / expiry ; alone ; friends ; skip
    pg=await new_page(b); s,pr,peers=await prom_setup(pg); a=peers[0]
    await C(pg,'npcAsksToProm',a['id']); s=await st(pg); inv=[e for e in s['events'] if e['type']=='promInvite' and e['status']=='Open']
    check('119: NPC asks player', bool(inv))
    await T(pg,f"eventChoice('{inv[0]['id']}','time')"); await T(pg,"advanceMinutes(3500)"); s=await st(pg)
    pa=[x for x in s['people'] if x['id']==a['id']][0]
    check('119: player says "need time" → response expires, NPC asks someone else', pa.get('promWith') and pa['promWith']!=s['name'], pa.get('promWith'))
    await C(pg,'setPromPlan','alone'); await C(pg,'promPrep','ticket'); await T(pg,f"setClock('{pr['dateISO']}',1150)"); await C(pg,'attendProm'); await play_scene(pg,1); s=await st(pg)
    check('119: player attends alone → resolves with memory', s['school']['prom']['status']=='Done' and any('on your own' in m['text'] for m in s['milestones']))
    await pg.close()
    pg=await new_page(b); s,pr,peers=await prom_setup(pg)
    await C(pg,'setPromPlan','friends'); await C(pg,'promPrep','waiver'); await C(pg,'promPrep','ticket'); await T(pg,f"setClock('{pr['dateISO']}',1150)"); await C(pg,'attendProm'); await play_scene(pg,2); s=await st(pg)
    check('119: player goes with friends → resolves', s['school']['prom']['status']=='Done' and any('with your friends' in m['text'] for m in s['milestones']))
    await pg.close()
    pg=await new_page(b); s,pr,peers=await prom_setup(pg)
    await C(pg,'setPromPlan','skip'); await T(pg,f"setClock('{pr['dateISO']}',1150)"); await T(pg,"advanceMinutes(200)"); s=await st(pg)
    sk=[e for e in s['events'] if e['type']=='promSkipNight' and e['status']=='Open']
    check('119: player skips → alternative evening offered', bool(sk))
    await T(pg,f"eventChoice('{sk[0]['id']}','gaming')"); s=await st(pg)
    check('70: "skipped prom and spent the evening gaming" memory', any('gaming' in m['text'] for m in s['milestones']))
    ev=[e for e in s['calendar'] if e['type']=='prom']; check('119: skipped prom not left Due', ev[0]['status']=='Completed', ev[0]['status'])
    check('prom variants: no JS errors', not pg.errs, pg.errs[:3]); await pg.close()
    # ======== Dates, Valentine, gifts, neighborhood, groups, rivals, awards, sneaking, agency, stories ========
    pg=await new_page(b); await new_life(pg); await T(pg,"setAge(17)"); await T(pg,"setMoney(500,0,0)"); s=await st(pg)
    f=[x for x in s['people'] if x['role']=='friend'][0]
    await M(pg,f"const p=S.people.find(x=>x.id==='{f['id']}');p.age=17;p.rel=100;p.trust=100;p.conflict=0;p.romanceInit=true;p.attraction=100;p.romanceOpen=true;p.boundaries=[];p.datingNpc=null;p.romanceStage='none';const n=S.npcs.find(x=>x.id===p.npcId);if(n)n.birthYear=new Date(S.clock.dateISO).getUTCFullYear()-17")
    await C(pg,'romanceAction',f['id'],'askOut'); s=await st(pg)
    check('64/83: asking out a willing peer works with a story', s['romance'].get('partnerId')==f['id'], s['log'][0]['text'][:80])
    await T(pg,"setClock('2021-02-14',1000)"); await C(pg,'holidaysOn','2021-02-14')
    await pg.evaluate("__LIFE_SIM_TEST__.call('closeChoiceModal')")
    await C(pg,'doHolidayActivity','valentines:coupleDate'); s=await st(pg)
    check("80: Valentine couple activity opens a date scene", s.get('scene') and s['scene']['data'].get('valentine'))
    await play_scene(pg,0); s=await st(pg); o=[x for x in s['outcomes'] if x['category']=='Date']
    check('83: date resolves with a tier and narrated reasons', o and o[0]['result'].endswith('date') and len(o[0]['reason'])>40, o and (o[0]['result'],o[0]['reason'][:80]))
    # gifts
    await M(pg,f"const p=S.people.find(x=>x.id==='{f['id']}');p.traits=['Studious'];p.rel=70;p.giftsReceived=[]")
    for k in ['book','book','laptop']: await C(pg,'addItem',k,'QC')
    s=await st(pg); books=[i for i in s['inventoryItems'] if i['key']=='book']
    await C(pg,'giveInventoryItem',books[0]['id'],f['id']); s=await st(pg)
    check('108: interest-matched gift is loved, with the reason', s['outcomes'][0]['result']=='Loved it', s['outcomes'][0])
    await C(pg,'giveInventoryItem',books[1]['id'],f['id']); s=await st(pg)
    check('108: same gift again → "already have one"', s['outcomes'][0]['result']=='Already had one')
    s=await st(pg); other=[x for x in s['people'] if x['role']=='friend' and x['id']!=f['id']][0]
    await M(pg,f"S.people.find(x=>x.id==='{other['id']}').rel=30")
    lap=[i for i in s['inventoryItems'] if i['key']=='laptop'][0]; await C(pg,'giveInventoryItem',lap['id'],other['id']); s=await st(pg)
    check('108: expensive gift from a near-stranger is awkward', s['outcomes'][0]['result']=='Awkward', s['outcomes'][0]['result'])
    # neighborhood
    got=None
    for i in range(80):
        await M(pg,"S.neighborhood.cooldown=null"); await C(pg,'neighborhoodTick'); s=await st(pg)
        nb=[e for e in s['events'] if e['type']=='nbh' and e['status']=='Open']
        if nb: got=nb[0]; break
    nbh=[h for h in s['households'] if h['id'] in s['neighborhood']['households']]
    check('91: neighborhood events happen, with persistent named neighbor households', got and got['payload']['kind'] and len(nbh)>=4 and all(h['surname'] for h in nbh), got and (got['payload']['kind'],len(nbh)))
    if got:
        await T(pg,f"eventChoice('{got['id']}','{got['choices'][0]['id']}')"); s=await st(pg)
        check('91: neighborhood choice produces a narrated outcome', s['log'][0]['title']==got['title'] and len(s['log'][0]['text'])>25, s['log'][0]['text'][:90])
    check('93: neighborhood reputation tracked', 'rep' in s['neighborhood'] and len(s['neighborhood']['rep'])>=6)
    # groups, rivals, agency, stories
    await M(pg,"S.people.filter(p=>p.role==='friend').forEach(p=>p.rel=70);S.groups=[];while(S.people.filter(p=>p.role==='friend').length<3){const n=S.npcs.find(x=>!S.people.some(p=>p.npcId===x.id));S.people.push({id:'g'+n.id,npcId:n.id,name:n.fullName,fullName:n.fullName,firstName:n.firstName,surname:n.surname,role:'friend',roleLabel:'classmate',age:S.age,rel:70,trust:60,fun:50,conflict:0,history:[],memory:'',traits:['Funny'],mood:'good',knownSince:S.age})}")
    await C(pg,'groupTick'); s=await st(pg); check('106: a friend group forms from close friends', len(s.get('groups',[]))==1 and len(s['groups'][0]['members'])>=3)
    known={x.get('npcId') for x in s['people']}; rv=[n for n in s['npcs'] if n['id'] not in known][-1]['id']; await C(pg,'maybeRival',rv,'basketball'); s=await st(pg)
    ev=[e for e in s['events'] if e['type']=='rivalMoment' and e['status']=='Open']
    check('114: rivalry created with a person record', ev and any(x.get('npcId')==rv and x.get('roleLabel')=='rival' for x in s['people']))
    await T(pg,f"eventChoice('{ev[0]['id']}','shake')"); s=await st(pg); check('114: sportsmanship turns rivalry toward respect', s['rivals'][0]['type'] in ('respect','friendly competition','friendship'))
    for _ in range(150): await C(pg,'npcAgencyTick')
    s=await st(pg); elig=[(x['name'],x.get('age'),x.get('datingNpc')) for x in s['people'] if x['role']=='friend']
    check('62: NPCs date other NPCs on their own', any(x.get('datingNpc') for x in s['people']), elig)
    await C(pg,'personAction',other['id'],'talk'); s=await st(pg)
    check('123: relationship action narrates what happened (not just stats)', len(s['log'][0]['text'])>40 and not s['log'][0]['text'].startswith('Closeness'), s['log'][0]['text'][:90])
    # awards
    await M(pg,"S.school.subjects.forEach(x=>x.score=96);S.school.record.absences=0;S.school.record.tardies=0;S.school.record.daysAttended=150")
    await T(pg,"setAge(18)"); s=await st(pg)
    check('115: end-of-year awards (Honor Roll + Perfect Attendance)', any(a['name']=='Honor Roll' for a in s.get('awards',[])) and any(a['name']=='Perfect Attendance' for a in s.get('awards',[])), [a['name'] for a in s.get('awards',[])])
    check('misc: no JS errors', not pg.errs, pg.errs[:3]); await pg.close()
    # sneaking discovery
    pg=await new_page(b); await new_life(pg); await T(pg,"setAge(15)"); s=await st(pg); f=[x for x in s['people'] if x['role']=='friend'][0]
    caught=False;okfun=False
    for i in range(12):
        await M(pg,"S.family.rules.strictness=100;S.family.restrictions.groundedUntil=null;S.family.trust=60;S.romance.partnerId=null")
        await T(pg,f"setClock('2020-0{1+i%8}-1{i%9}',1395)"); t0=(await st(pg))['family']['trust']
        await C(pg,'sneakOut',f['id'],'meet'); s=await st(pg)
        if s['family']['trust']<t0 or s['family']['restrictions'].get('groundedUntil') or any(e['type'] in ('sneakSibling',) for e in s['events']) or any(fu['type']=='sneakFound' for fu in s['followUps']): caught=True
        if 'without a sound' in s['log'][0]['text'] or 'Probably nobody' in s['log'][0]['text']: okfun=True
    check('82: sneaking out can be discovered (strict household)', caught)
    check('82: sneaking out narrates the night (friends only for minors)', any('streets at night' in l['text'] or 'say no' in l['title'].lower() for l in (await st(pg))['log'][:40]))
    check('sneak: no JS errors', not pg.errs, pg.errs[:3]); await pg.close()
    await b.close()
asyncio.run(main())
