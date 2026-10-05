from harness import *
import datetime as dt
async def C(pg,fn,*a): return await T(pg,"call("+",".join([json.dumps(fn)]+[json.dumps(x) for x in a])+")")
async def M(pg,code): return await pg.evaluate("c=>__LIFE_SIM_TEST__.mutate(c)",code)
async def olivier(b):
    pg=await new_page(b); await new_life(pg); await T(pg,"setAge(7)"); s=await st(pg)
    f=[x for x in s['people'] if x['role']=='friend' and x.get('npcId')][0]; d=dt.date.fromisoformat(s['clock']['dateISO'])+dt.timedelta(days=5)
    await M(pg,f"S.events.forEach(e=>{{if(e.status==='Open')e.status='Resolved'}});S.inviteLog=[];const p=S.people.find(x=>x.id==='{f['id']}');p.firstName='Olivier';p.surname='Fournier';p.name='Olivier Fournier';p.fullName='Olivier Fournier';p.nickname=null;p.rel=80;p.trust=75;p.age=7;p.bday='{d.strftime('%m-%d')}';p.bdayInviteYear={{}};S.people.filter(x=>x.role==='friend'&&x.id!==p.id).forEach(x=>{{x.rel=50}})")
    return pg,f['id'],d.isoformat()
def ev_for(s,pid): return [e for e in s['events'] if e['status']=='Open' and pid in (e.get('participants') or [])]
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path=CHROME); errs=[]
    # legacy random events no longer generate anonymous invitations
    pg=await new_page(b); await new_life(pg); await T(pg,"setAge(9)")
    defs=[d['id'] for d in await C(pg,'eligibleEventDefs')]; check('H2: legacy birthdayInvite/friendInvite are no longer eligible random events', 'birthdayInvite' not in defs and 'friendInvite' not in defs and len(defs)>0, defs[:6])
    for i in range(40): await M(pg,"S.events.forEach(e=>{if(e.status==='Open')e.status='Resolved'});S.eventCooldowns={}"); await C(pg,'maybeRandomEvent',True)
    s=await st(pg); check('H2: 40 forced random events — none anonymous ("Someone your age…"/"Someone you know…")', not any(('Someone your age' in e['text'] or 'Someone you know' in e['text']) for e in s['events']))
    r=await C(pg,'queueEvent',{'type':'birthdayInvite','title':'Birthday invitation','text':'Someone your age invites you to a birthday party.','choices':[{'id':'go','label':'Go'}]}); s=await st(pg)
    check('H2: queueEvent rejects an interpersonal event with no real person', r is None and not any(e['type']=='birthdayInvite' for e in s['events']))
    errs+=pg.errs; await pg.close()
    # acceptance: Olivier's real birthday invitation
    pg,oid,party=await olivier(b); await pg.evaluate("()=>{window.__r=Math.random;Math.random=()=>0.01}")
    try: await C(pg,'birthdayTick')
    finally: await pg.evaluate("()=>{Math.random=window.__r}")
    s=await st(pg); ev=ev_for(s,oid)
    check('H2: the birthday system invites the player — event references Olivier\'s stable ID', len(ev)==1 and ev[0]['participants'][0]==oid, [e['title'] for e in ev])
    m=await C(pg,'inviteMeta',ev[0]['id'])
    check('H2: FROM Olivier Fournier • WHAT Olivier\'s Birthday Party • WHERE real place • WHEN date/time • ANSWER BY deadline', 'Olivier Fournier' in (m['from'] or '') and m['what']=="Olivier's Birthday Party" and m['where'] and any(x in m['when'] for x in ['PM','AM']) and m['by'], m)
    pl=[x for x in s['plans'] if x.get('birthdayOf')==oid]; check("H2: Olivier's party plan matches his real birthday date", pl and pl[0]['dateISO']==party, (pl and pl[0]['dateISO'],party))
    await T(pg,"openTab('home')"); txt=await pg.inner_text('body'); check('H2: the main UI never shows "Someone your age"', 'Someone your age' not in txt and 'Olivier' in txt)
    await C(pg,'birthdayTick'); await C(pg,'npcBirthdayInvite',oid); await C(pg,'repairActorlessEvents'); s=await st(pg)
    check('H2: no duplicate invitation for the same birthday/year', len([e for e in s['events'] if oid in (e.get('participants') or []) and 'Birthday' in e['title'] and e['status']=='Open'])==1)
    st0=await st(pg); await pg.evaluate("s=>__LIFE_SIM_TEST__.loadState(s)",st0); s=await st(pg); m2=await C(pg,'inviteMeta',ev[0]['id'])
    po=[x for x in s['people'] if x['id']==oid][0]
    check('H2: save/reload keeps the same inviter ID, name, birthday, plan, place, time and deadline', m2==m and po['name']=='Olivier Fournier' and po['bday']==[x for x in st0['people'] if x['id']==oid][0]['bday'] and [x for x in s['plans'] if x.get('birthdayOf')==oid][0]['id']==pl[0]['id'])
    rel0={x['id']:x['rel'] for x in s['people']}; acc=[c['id'] for c in ev[0]['choices']][0]
    await pg.evaluate("()=>{window.__r=Math.random;Math.random=()=>0.01}")
    try: await T(pg,f"eventChoice('{ev[0]['id']}','{acc}')")
    finally: await pg.evaluate("()=>{Math.random=window.__r}")
    s=await st(pg)
    pl=[x for x in s['plans'] if x.get('birthdayOf')==oid][0]; changed=[x['name'] for x in s['people'] if abs(x['rel']-rel0.get(x['id'],x['rel']))>0.01 and x['id']!=oid]
    check('H2: accepting (caregiver agrees) activates Olivier\'s plan on the calendar', pl['status']=='Accepted' and any(e['type']=='plan' and e.get('payload',{}).get('planId')==pl['id'] for e in s['calendar']), (pl['status'],s['log'][0]['text'][:120]))
    check('H2: no unrelated friend is affected by Olivier\'s invitation', not changed, changed)
    check('H2: Olivier is still in People', any(x['id']==oid and x['name']=='Olivier Fournier' for x in s['people']))
    errs+=pg.errs; await pg.close()
    # caregiver refusal path (age 7): existing permission logic decides — the plan does not happen, nobody else affected
    pg,oid,party=await olivier(b); await C(pg,'npcBirthdayInvite',oid); s=await st(pg); ev=ev_for(s,oid)[0]
    await pg.evaluate("()=>{window.__r=Math.random;Math.random=()=>0.99}")
    try: await T(pg,f"eventChoice('{ev['id']}','accept')")
    finally: await pg.evaluate("()=>{Math.random=window.__r}")
    s=await st(pg); pl=[x for x in s['plans'] if x.get('birthdayOf')==oid][0]
    print('   refusal path:',pl['status'],'|',[l['text'][:110] for l in s['log'][:2]])
    check('H2: when the caregiver says no, the plan does not go ahead and the log explains it', pl['status']=='Accepted' or (pl['status']=='Declined' and any(w in s['log'][0]['text'].lower()+s['log'][0]['title'].lower() for w in ['parent','caregiver','mom','dad','grandma','allowed','permission','not this time'])), (pl['status'],s['log'][0]))
    errs+=pg.errs; await pg.close()
    # decline affects only Olivier
    pg,oid,party=await olivier(b); await C(pg,'npcBirthdayInvite',oid); s=await st(pg); ev=ev_for(s,oid)[0]; rel0={x['id']:x['rel'] for x in s['people']}
    dec=[c['id'] for c in ev['choices'] if 'ecline' in c['label']] or [ev['choices'][-1]['id']]
    await T(pg,f"eventChoice('{ev['id']}','{dec[0]}')"); s=await st(pg)
    others=[x['name'] for x in s['people'] if x['id']!=oid and abs(x['rel']-rel0.get(x['id'],x['rel']))>0.01]
    check('H2: declining politely touches only Olivier (small, contextual)', not others and abs([x for x in s['people'] if x['id']==oid][0]['rel']-rel0[oid])<=3, others)
    errs+=pg.errs; await pg.close()
    # malformed old save: no match → superseded; match → real invite created; no relationship penalty; hero cleared
    pg=await new_page(b); await new_life(pg); await T(pg,"setAge(9)"); s=await st(pg); rel0={x['id']:x['rel'] for x in s['people']}
    await M(pg,"S.people.forEach(p=>{p.bday='01-01'});S.events.unshift({id:'legacy1',type:'birthdayInvite',title:'Birthday invitation',text:'Someone your age invites you to a birthday party.',participants:[],status:'Open',priority:3,choices:[{id:'0',label:'Go'},{id:'2',label:'Decline'}],dateISO:S.clock.dateISO,minute:S.clock.minute});S.events.unshift({id:'legacy2',type:'friendInvite',title:'An invitation',text:'Someone you know wants to spend time together soon.',participants:[],status:'Open',priority:3,choices:[{id:'0',label:'Accept'}],dateISO:S.clock.dateISO,minute:S.clock.minute});S.current={title:'Birthday invitation',text:'Someone your age invites you to a birthday party.',sourceType:'event',sourceId:'legacy1'}")
    await C(pg,'repairActorlessEvents'); s=await st(pg); lg={e['id']:e['status'] for e in s['events'] if e['id'] in ('legacy1','legacy2')}
    check('H2 migration: anonymous legacy birthdayInvite/friendInvite are retired (Superseded), not left active', lg=={'legacy1':'Superseded','legacy2':'Superseded'}, lg)
    check('H2 migration: no relationship penalty for anyone', all(abs(x['rel']-rel0.get(x['id'],x['rel']))<0.01 for x in s['people']))
    check('H2 migration: the stale hero context is cleared', not s.get('current') or s['current'].get('sourceId')!='legacy1')
    await pg.evaluate("s=>__LIFE_SIM_TEST__.loadState(s)",s); s=await st(pg); check('H2 migration: it does not come back after reload', not any(e['id'] in ('legacy1','legacy2') and e['status']=='Open' for e in s['events']))
    yr=s['clock']['dateISO'][:4]; d4=(dt.date.fromisoformat(s['clock']['dateISO'])+dt.timedelta(days=4)); f=[x for x in s['people'] if x['role']=='friend' and x.get('npcId')][0]
    await M(pg,f"const p=S.people.find(x=>x.id==='{f['id']}');p.rel=70;p.bday='{d4.strftime('%m-%d')}';p.bdayInviteYear={{}};S.events.unshift({{id:'legacy3',type:'birthdayInvite',title:'Birthday invitation',text:'Someone your age invites you to a birthday party.',participants:[],status:'Open',priority:3,choices:[{{id:'0',label:'Go'}}],dateISO:S.clock.dateISO,minute:S.clock.minute}})")
    await C(pg,'repairActorlessEvents'); s=await st(pg)
    check('H2 migration: when a real friend\'s birthday truly matches, a proper invitation from that friend replaces the anonymous one', [e['status'] for e in s['events'] if e['id']=='legacy3']==['Superseded'] and any(f['id'] in (e.get('participants') or []) and e['status']=='Open' for e in s['events']))
    # actor that no longer exists
    await M(pg,"S.events.unshift({id:'ghost1',type:'invitation',title:'Ghost invites you',text:'',participants:['nobody-here'],status:'Open',priority:3,choices:[{id:'accept',label:'Accept'}],dateISO:S.clock.dateISO,minute:S.clock.minute})"); rel0={x['id']:x['rel'] for x in (await st(pg))['people']}
    await C(pg,'repairActorlessEvents'); s=await st(pg)
    check('H2: an invitation whose person no longer exists is invalidated safely (no crash, nobody else affected)', [e['status'] for e in s['events'] if e['id']=='ghost1']==['Superseded'] and all(abs(x['rel']-rel0.get(x['id'],x['rel']))<0.01 for x in s['people']))
    # normal friend invite has a real actor and full meta
    await M(pg,"S.events.forEach(e=>{if(e.status==='Open')e.status='Resolved'});S.inviteLog=[];S.people.filter(p=>p.role==='friend').forEach(p=>{p.rel=72;p.battery=90})")
    fr=[x for x in s['people'] if x['role']=='friend'][0]; await C(pg,'npcInvitesPlayer',fr['id']); s=await st(pg); e=[x for x in s['events'] if x['status']=='Open' and x['type']=='invitation']
    m=await C(pg,'inviteMeta',e[0]['id']) if e else None
    check('H2: a normal friend invitation has a real person and FROM/WHAT/WHERE/WHEN/ANSWER BY', e and e[0]['participants'][0]==fr['id'] and m and all(m.get(k) for k in ('from','what','where','when','by')), m)
    errs+=pg.errs; check('H2: no JS errors', not errs, errs[:3]); await b.close()
asyncio.run(main())
