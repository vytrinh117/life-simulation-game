from harness import *
import datetime as dt
async def C(pg,fn,*a): return await T(pg,"call("+",".join([json.dumps(fn)]+[json.dumps(x) for x in a])+")")
async def M(pg,code): return await pg.evaluate("c=>__LIFE_SIM_TEST__.mutate(c)",code)
async def life(b,age=14,dob='2010-03-10',w=1366,h=860):
    pg=await new_page(b,w,h); await new_life(pg,dob=dob); await T(pg,f"setAge({age})"); return pg
async def friend(pg,rel=70,extra=''):
    s=await st(pg); f=[x for x in s['people'] if x['role']=='friend' and x.get('npcId')][0]
    await M(pg,f"const p=S.people.find(x=>x.id==='{f['id']}');p.rel={rel};p.trust=60;p.conflict=0;p.battery=80;p.reliability=70;p.boundaries=[];p.goals=[];p.traits=['Kind'];p.invites={{byMe:0,byThem:0,myAsks:[]}};{extra}")
    return f['id']
async def weekend_after(pg,n=1):
    s=await st(pg); d=dt.date.fromisoformat(s['clock']['dateISO'])+dt.timedelta(days=n)
    while d.weekday()<5: d+=dt.timedelta(days=1)
    return d.isoformat()
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path=CHROME)
    # ---------- K: tiers ----------
    pg=await life(b); fid=await friend(pg,59)
    check('K40 (3A ladder): closeness 59 with ordinary trust → Casual Friend', await C(pg,'friendTier',fid)=='Casual Friend', await C(pg,'friendTier',fid))
    await T(pg,"advanceMinutes(1)"); await M(pg,f"const q=S.people.find(x=>x.id==='{fid}');q.rel=80;q.trust=70;q.conflict=0"); await C(pg,'tierTick'); s=await st(pg)
    pp=[x for x in s['people'] if x['id']==fid][0]
    check('K40 (3A ladder): reaching Close Friend (closeness + trust) gives a level-up notice', pp.get('tier')=='Close Friend' and any('Close Friend' in l['title'] for l in s['log'][:5]), (pp.get('tier'),[l['title'] for l in s['log'][:3]]))
    await M(pg,f"S.people.find(x=>x.id==='{fid}').rel=36"); await T(pg,"advanceMinutes(1)"); s=await st(pg); pp=[x for x in s['people'] if x['id']==fid][0]
    check('K40: drifting down is announced too', pp['tier']=='Acquaintance' and any('now Acquaintance' in l['title'] for l in s['log'][:5]))
    await T(pg,"openTab('people')"); txt=await pg.inner_text('#panel-host'); check('K40: tier shown on people cards', 'Acquaintance' in txt or 'Friend' in txt)
    # ---------- K: free time ----------
    s=await st(pg); d=s['clock']['dateISO']
    while not await T(pg,f"call('isSchoolDay','{d}')"): d=(dt.date.fromisoformat(d)+dt.timedelta(days=1)).isoformat()
    await T(pg,f"setClock('{(dt.date.fromisoformat(d)-dt.timedelta(days=1)).isoformat()}',1200)")
    fb=await C(pg,'freeBlocks',d,60)
    check('K33: no free time during school hours', all(x['to']<=450 or x['from']>=920 for x in fb), fb)
    check('K33: free after school', any(x['from']>=920 and x['to']-x['from']>=60 for x in fb), fb)
    ag=await C(pg,'agendaFor',d); check('K33: calendar day shows "Free …" blocks', any(i['type']=='free' and i['title'].startswith('Free ') for i in ag))
    # ---------- K: response spectrum ----------
    fid=await friend(pg,90); wk=await weekend_after(pg,2)
    kinds=[]
    for i in range(6):
        await M(pg,f"const p=S.people.find(x=>x.id==='{fid}');p.rel=90;p.battery=90;p.invites.myAsks=[]")
        kinds.append((await C(pg,'npcPlanResponse',fid,'hangout',wk,[840,900],'two'))['kind'])
    check('K35: a close, rested friend with lead time mostly says yes / enthusiastic', sum(k in ('enthusiastic','yes') for k in kinds)>=5, kinds)
    kinds=[]
    for i in range(10):
        await M(pg,f"const p=S.people.find(x=>x.id==='{fid}');p.rel=58;p.battery=5;p.invites.myAsks=[]")
        kinds.append((await C(pg,'npcPlanResponse',fid,'hangout',wk,[840,900],'two'))['kind'])
    check('K35/36: a drained social battery gives reluctant yes / maybe / no instead', any(k in ('reluctant','maybe','no','counter') for k in kinds) and kinds.count('enthusiastic')<=1, kinds)
    await M(pg,f"const p=S.people.find(x=>x.id==='{fid}');p.rel=62;p.battery=70;p.invites.myAsks=[S.clock.dateISO,S.clock.dateISO,S.clock.dateISO,S.clock.dateISO]")
    r=await C(pg,'npcPlanResponse',fid,'hangout',wk,[840,900],'two'); check('K36: asking too often in one week backfires', r['kind'] in ('no','maybe','counter','reluctant'), r)
    r=await C(pg,'npcPlanResponse',fid,'hangout',wk,[60,90],'two'); check('K35: times when they are unavailable → counter-offer (or no)', r['kind'] in ('counter','no'), r)
    # ---------- K: UI flow with two times ----------
    await M(pg,f"const p=S.people.find(x=>x.id==='{fid}');p.rel=85;p.battery=90;p.invites.myAsks=[];S.plans=[]")
    await T(pg,"openTab('people')"); await pg.click(f"[data-person-open='{fid}']"); await pg.click("#choice-content [data-person-action='plan'], #choice-content button:has-text('Make plans')")
    await pg.click("#choice-content [data-plan-step='type'][data-v='hangout']"); await pg.click(f"#choice-content [data-plan-step='day'][data-v='{wk}']")
    chips=await pg.query_selector_all("#choice-content [data-plan-step='time']"); check('K34: day → time chips from your free time', len(chips)>=2, len(chips))
    await chips[0].click(); chips=await pg.query_selector_all("#choice-content [data-plan-step='time']"); await chips[2].click()
    shared=await pg.query_selector("#choice-content [data-plan-step='both']"); check('K34: "Find a time we\'re both free" offered when you know their schedule', bool(shared))
    await pg.click("#choice-content [data-plan-step='send']"); s=await st(pg)
    check('K34/35: sending two times creates a plan (or a counter-offer)', any(x['personId']==fid for x in s['plans']) or await pg.is_visible('#choice-overlay'))
    if await pg.is_visible('#choice-overlay') and await pg.query_selector("[data-counter='yes']"):
        r0=[x for x in s['people'] if x['id']==fid][0]['rel']; await pg.click("[data-counter='yes']"); s=await st(pg)
        check('K37: accepting a counter-offer adds closeness', [x for x in s['people'] if x['id']==fid][0]['rel']>r0)
    # reliability / no-show
    s=await st(pg); pl=[x for x in s['plans'] if x['personId']==fid and x['status']=='Accepted']
    if pl:
        r0=[x for x in s['people'] if x['id']==fid][0].get('reliability',70); await T(pg,f"setClock('{pl[0]['dateISO']}',{min(1439,pl[0]['startMinute']+40)})"); await T(pg,"advanceMinutes(1)"); s=await st(pg)
        check('K36: a no-show drops your reliability with them', [x for x in s['people'] if x['id']==fid][0].get('reliability',70)<=r0-15, ([x for x in s['people'] if x['id']==fid][0].get('reliability'),r0))
    # white lie
    caught=0
    for i in range(8):
        await M(pg,"S.whiteLies=[];S.outings=[]"); s=await st(pg); d=s['clock']['dateISO']
        await M(pg,f"S.whiteLies=[{{personId:'{fid}',dateISO:'{d}',start:900,end:1020}}];S.outings=[{{dateISO:'{d}',minute:930,where:'mall'}}];S.people.find(x=>x.id==='{fid}').trust=80")
        await T(pg,"advanceMinutes(1500)"); s=await st(pg); caught+=[x for x in s['people'] if x['id']==fid][0]['trust']<80
    check('K38: "I\'m busy" while seen out can be discovered (trust drops)', 1<=caught<=8, caught)
    await pg.close()
    # group plans
    pg=await life(b,15)
    await M(pg,"S.people.filter(p=>p.role==='friend').forEach(p=>{p.rel=80;p.battery=90});S.groups=[]")
    await C(pg,'groupTick'); wk=await weekend_after(pg,2); await C(pg,'planGroupOuting','hangout',wk,[840,960]); s=await st(pg)
    gp=[x for x in s['plans'] if x.get('groupIds')]
    check('K39: group outing picks the time most can make, with group members', bool(gp) and len(gp[0]['groupIds'])>=1, [x['title'] for x in s['plans'][:3]])
    await pg.close()
    # ---------- N: birthdays ----------
    pg=await life(b,14); fid=await friend(pg,80); s=await st(pg)
    check('N48: every person has a birthday', all(x.get('bday') for x in s['people']))
    in3=(dt.date.fromisoformat(s['clock']['dateISO'])+dt.timedelta(days=3)).isoformat()[5:]
    await M(pg,f"S.people.find(x=>x.id==='{fid}').bday='{in3}';S.notifications=[]"); await C(pg,'birthdayTick'); s=await st(pg)
    check('N48: reminder 3 days before a close friend\'s birthday', any('in 3 days' in n['text'] for n in s['notifications']))
    await T(pg,"setClock('"+(dt.date.fromisoformat(s['clock']['dateISO'])+dt.timedelta(days=3)).isoformat()+"',900)"); await T(pg,"advanceMinutes(1)")
    await T(pg,"openTab('people')"); await pg.click(f"[data-person-open='{fid}']"); has=await pg.query_selector("#choice-content [data-wish='inperson']")
    check('N48: "Wish happy birthday" appears on their birthday', bool(has))
    r0=[x for x in (await st(pg))['people'] if x['id']==fid][0]['rel']
    if has: await has.click()
    s=await st(pg); pp=[x for x in s['people'] if x['id']==fid][0]
    check('N48: wishing them adds closeness and is remembered', pp['rel']>r0 and pp.get('bdayWished'))
    # forgetting
    s=await st(pg); yd=(dt.date.fromisoformat(s['clock']['dateISO'])-dt.timedelta(days=1)).isoformat()[5:]
    await M(pg,f"const p=S.people.find(x=>x.id==='{fid}');p.bday='{yd}';p.bdayWished={{}};p.rel=90;p.trust=85;p.respect=60;p.reliability=80;p.conflict=0"); await C(pg,'birthdayTick'); s=await st(pg); pp=[x for x in s['people'] if x['id']==fid][0]
    check('N49: forgetting a best friend\'s birthday costs closeness (−8)', pp['rel']<=82.1, pp['rel'])
    # NPC party invite 5 days ahead
    in5=(dt.date.fromisoformat(s['clock']['dateISO'])+dt.timedelta(days=5)).isoformat()[5:]
    got=False
    for i in range(6):
        await M(pg,f"const p=S.people.find(x=>x.id==='{fid}');p.bday='{in5}';p.rel=82"); await C(pg,'birthdayTick'); s=await st(pg)
        if any('birthday party' in e['title'].lower() for e in s['events'] if e['status']=='Open'): got=True; break
    check('N48: close friends invite you to their birthday party (with RSVP)', got)
    # player birthday extras
    await C(pg,'addItem','phone','QC')
    await M(pg,"S.people.filter(p=>p.role==='friend').forEach(p=>p.rel=80);S.chats={}")
    n0=len((await st(pg))['inventoryItems']); await C(pg,'playerBirthdayExtras'); s=await st(pg)
    check('N47: friends give you birthday gifts', len(s['inventoryItems'])>n0 or any(l['title'].startswith('🎁') for l in s['log'][:6]))
    check('N47: friends text happy birthday', any(m['kind']=='bdayWish' for c in s.get('chats',{}).values() for m in c['msgs']))
    # own celebration options
    await pg.evaluate("()=>{}")
    await M(pg,"S.events.forEach(e=>{if(e.status==='Open')e.status='Resolved'})")
    opts=[o['id'] for o in await pg.evaluate("()=>__LIFE_SIM_TEST__.call('birthdayCelebrationOptions')")]
    check('N47 (updated by H1): own-birthday options depend on age and include family/home choices', 'big' in opts and 'skip' in opts and 'outing' not in opts, opts)
    check('birthdays: no JS errors', not pg.errs, pg.errs[:3]); await pg.close()
    # ---------- X: phone ----------
    pg=await life(b,14); await C(pg,'addItem','phone','QC'); await M(pg,"S.people.filter(p=>p.role==='friend').forEach(p=>p.rel=70);S.chats={};S.permissions.dailyAccess={dateISO:S.clock.dateISO,phone:true,tv:false,sharedDevice:false,stove:false}")
    fid=await friend(pg,80); await C(pg,'incomingMessage',fid,'advice'); s=await st(pg)
    msg=[m for m in s['chats'][fid]['msgs'] if m['from']=='them'][-1]
    check('X: incoming message lands in a per-person thread', msg['kind']=='advice' and not msg['read'])
    await T(pg,"openTab('phone')"); await pg.click("#panel-host button:has-text('Messages')"); await pg.click(f"[data-chat-open='{fid}']")
    btns=await pg.query_selector_all("#choice-content [data-chat-reply]"); check('X: contextual reply options (3+) and a "write your own" box', len(btns)>=3 and await pg.query_selector('#chat-text') is not None, len(btns))
    r0=[x for x in s['people'] if x['id']==fid][0]['rel']; await pg.click("#choice-content [data-chat-reply='listen']"); s=await st(pg)
    pp=[x for x in s['people'] if x['id']==fid][0]; th=s['chats'][fid]['msgs']
    check('X: listening to a friend\'s problem helps (closeness/trust up) and they reply', pp['rel']>r0 and th[-1]['from']=='them', (pp['rel'],r0,th[-1]['text']))
    check('X: an advice talk continues into a second turn', any(m.get('turn')==2 for m in th))
    await pg.fill('#chat-text','Of course! Saturday?'); await pg.click("#choice-content [data-chat-custom='agree']"); s=await st(pg)
    check('X: custom text is sent as written, intent decides the effect', any(m['from']=='me' and m['text']=='Of course! Saturday?' for m in s['chats'][fid]['msgs']))
    # left on read
    await C(pg,'incomingMessage',fid,'chitchat'); await T(pg,"call('closeChoiceModal')"); await pg.click("#panel-host button:has-text('Messages')"); await pg.click(f"[data-chat-open='{fid}']"); await T(pg,"call('closeChoiceModal')")
    await M(pg,f"S.people.find(x=>x.id==='{fid}').rel=80"); await T(pg,"advanceMinutes(2000)"); s=await st(pg)
    check('X: leaving a close friend on read costs a little', [x for x in s['people'] if x['id']==fid][0]['rel']<80, [x for x in s['people'] if x['id']==fid][0]['rel'])
    # calls
    await M(pg,"S.events.forEach(e=>{if(e.status==='Open')e.status='Resolved'})"); await T(pg,"setClock('"+(await st(pg))['clock']['dateISO']+"',1140)")
    await C(pg,'incomingCall',fid,'distress'); s=await st(pg); ev=[e for e in s['events'] if e['type']=='incomingCall' and e['status']=='Open']
    check('X: incoming call with Answer / Decline / Call you later', ev and {c['id'] for c in ev[0]['choices']}=={'answer','decline','later'})
    r0=[x for x in s['people'] if x['id']==fid][0]['rel']; await T(pg,f"eventChoice('{ev[0]['id']}','answer')"); s=await st(pg)
    check('X: answering a friend in distress matters', [x for x in s['people'] if x['id']==fid][0]['rel']>=r0+4)
    await C(pg,'incomingCall',fid,'chat'); s=await st(pg); ev=[e for e in s['events'] if e['type']=='incomingCall' and e['status']=='Open']
    await T(pg,f"eventChoice('{ev[0]['id']}','decline')"); s=await st(pg)
    check('X: declining → missed call with voicemail in the call log', s.get('callLog') and s['callLog'][0]['missed'] and s['callLog'][0].get('voicemail'))
    # curfew call
    await M(pg,"S.flags.curfewCall=null;S.location='Mall'"); cf=await pg.evaluate("(()=>{return 0})()")
    await M(pg,"S.family.rules.strictness=90"); cfm=await C(pg,'curfewMinute')
    await T(pg,"setClock('"+(await st(pg))['clock']['dateISO']+f"',{cfm+16})"); await M(pg,"S.location='Mall';S.flags.curfewCall=null"); await T(pg,"advanceMinutes(5)"); s=await st(pg)
    check('X: out past curfew → a parent calls', any(e['type']=='incomingCall' and e['payload'].get('why')=='parentLate' for e in s['events']), s['location'])
    # outgoing calls: asleep → no answer
    await M(pg,"S.events.forEach(e=>{if(e.status==='Open')e.status='Resolved'});S.location='Home';S.family.rules.strictness=50"); await T(pg,"setClock('"+(await st(pg))['clock']['dateISO']+"',1420)")
    await M(pg,"S.permissions.dailyAccess={dateISO:S.clock.dateISO,phone:true,tv:false,sharedDevice:false,stove:false}")
    await C(pg,'personAction',fid,'call'); s=await st(pg); check('X: calling someone asleep → no answer, voicemail', 'No answer' in s['log'][0]['title'] or 'late call' in s['log'][0]['title'].lower(), s['log'][0]['title'])
    check('phone: no JS errors', not pg.errs, pg.errs[:3]); await pg.close()
    # class confiscation
    pg=await life(b,14); await C(pg,'addItem','phone','QC'); fid=await friend(pg,70); s=await st(pg); d=s['clock']['dateISO']
    while not await T(pg,f"call('isSchoolDay','{d}')"): d=(dt.date.fromisoformat(d)+dt.timedelta(days=1)).isoformat()
    await T(pg,f"setClock('{d}',470)"); await T(pg,"attendSchool()"); await T(pg,"advanceMinutes(80)"); conf=False
    for i in range(20):
        r=await C(pg,'classConfiscation')
        if r: conf=True; break
    s=await st(pg); check('X: using the phone in class can get it confiscated until the end of the day', conf and s['phone'].get('confiscatedUntil')==d)
    await T(pg,"openTab('phone')"); txt=await pg.inner_text('#panel-host'); await pg.click("#panel-host button:has-text('Messages')") if await pg.query_selector("#panel-host button:has-text('Messages')") else None
    check('X: a confiscated phone cannot be used until the end of the day', not await pg.is_visible('#choice-overlay') or 'Messages' not in await pg.inner_text('#choice-content'))
    await pg.close()
    # kids: smartwatch + video call
    pg=await life(b,7,dob='2019-03-10'); got=False
    for i in range(10):
        await M(pg,"S.education.watchGiven=false"); await C(pg,'maybeGradeOneWatch'); s=await st(pg)
        if any(x['key']=='kidsWatch' for x in s['inventoryItems']): got=True; break
    check('X: a kids\' smartwatch is a common Grade 1 gift (2025+)', got)
    s=await st(pg); gp=[x for x in s['people'] if x['role']=='grandparent']
    if gp:
        r0=gp[0]['rel']; await C(pg,'videoCallFamily',gp[0]['id']); s=await st(pg)
        check('X: video call with grandparents on a parent\'s phone', [x for x in s['people'] if x['id']==gp[0]['id']][0]['rel']>r0)
    check('kids: no JS errors', not pg.errs, pg.errs[:3]); await b.close()
asyncio.run(main())
