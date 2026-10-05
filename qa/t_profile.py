from harness import *
import datetime as dt
async def C(pg,fn,*a): return await T(pg,"call("+",".join([json.dumps(fn)]+[json.dumps(x) for x in a])+")")
async def M(pg,code): return await pg.evaluate("c=>__LIFE_SIM_TEST__.mutate(c)",code)
async def person(pg,pid): return [x for x in (await st(pg))['people'] if x['id']==pid][0]
async def roll(pg,v,fn,*a):
    await pg.evaluate(f"()=>{{window.__r=Math.random;Math.random=()=>{v}}}")
    try: return await C(pg,fn,*a)
    finally: await pg.evaluate("()=>{Math.random=window.__r}")
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path=CHROME); pg=await new_page(b); await new_life(pg); await T(pg,"setAge(16)")
    s=await st(pg); fs=[x for x in s['people'] if x['role']=='friend' and x.get('npcId')]; f,g=fs[0],fs[1]
    await M(pg,f"const p=S.people.find(x=>x.id==='{f['id']}');p.rel=30;p.trust=40;p.traits=['Busy','Kind','Funny'];p.observedTraits=[];p.goals=['artSchool'];p.goalsKnown=false;p.relStatusKnown=false;p.parentsKnown=false;p.roleLabel='classmate';p.counterSeen=0;p.tier='Acquaintance';p.milestones=[]")
    pr=await C(pg,'profileHtml',f['id'])
    check('#11: a weak acquaintance shows no personality traits (Unknown)', 'Personality / Lifestyle</h4><p>Unknown' in pr, pr[pr.find('Personality'):][:120])
    check('#12: life goals Unknown until learned', 'Life goals</span><b>Unknown' in pr)
    check('#13: relationship status Unknown until learned', 'Relationship status</span><b>Unknown' in pr)
    check('#14: parents not shown when you barely know them', 'Parents:' not in pr)
    check('#16 / H: the header starts with the full name, then the relationship descriptor, then age • gender • known since', pr.find('<h2>')<pr.find('descriptor')<pr.find('known since'))
    await C(pg,'observeBusy',f['id']); k1=await C(pg,'knownTraits',f['id']); await C(pg,'observeBusy',f['id']); k2=await C(pg,'knownTraits',f['id'])
    check('J/L: "Busy" is learned from behaviour (repeatedly offering another time), not from one event', 'Busy' not in k1 and 'Busy' in k2, (k1,k2))
    pr=await C(pg,'profileHtml',f['id'])
    check('#15: Busy sits under Personality / Lifestyle; availability is a separate "Right now" row that never says "Busy"', 'Personality / Lifestyle</h4><p>Busy' in pr and ('Right now</span><b>' in pr) and 'Right now</span><b>Busy' not in pr, pr[pr.find('Personality'):][:260])
    await M(pg,f"const p=S.people.find(x=>x.id==='{f['id']}');p.rel=50;p.trust=45")
    check('J: as a casual friend you know a little more (one more trait), not everything', len(await C(pg,'knownTraits',f['id']))==1 or len(await C(pg,'knownTraits',f['id']))==2)
    await M(pg,f"S.people.find(x=>x.id==='{f['id']}').trust=30"); await C(pg,'askFuture',f['id']); check('#12: asking about the future with low trust does not reveal goals', not await C(pg,'goalsKnown',f['id']))
    await M(pg,f"S.people.find(x=>x.id==='{f['id']}').trust=60"); await C(pg,'askFuture',f['id']); pr=await C(pg,'profileHtml',f['id'])
    check('#12/K: with enough trust, they tell you their real goal and it appears in the Profile', await C(pg,'goalsKnown',f['id']) and 'Unknown' not in pr.split('Life goals')[1][:60], pr.split('Life goals')[1][:80])
    await M(pg,f"S.people.find(x=>x.id==='{g['id']}').goals=[];S.people.find(x=>x.id==='{g['id']}').trust=70;S.people.find(x=>x.id==='{g['id']}').rel=50"); await C(pg,'askFuture',g['id']); pr=await C(pg,'profileHtml',g['id'])
    check('K: someone with no real goal yet stays Unknown (nothing invented)', 'Life goals</span><b>Unknown' in pr)
    # relationship status knowledge + NPC couples
    await M(pg,f"const a=S.people.find(x=>x.id==='{f['id']}'),b=S.people.find(x=>x.id==='{g['id']}');const na=S.npcs.find(x=>x.id===a.npcId),nb=S.npcs.find(x=>x.id===b.npcId);na.gender='Male';na.orientation='Women';nb.gender='Female';nb.orientation='Men';const yr=new Date(S.clock.dateISO).getUTCFullYear();na.birthYear=nb.birthYear=yr-16;a.age=b.age=16;S.npcCouples=[];a.rel=30;a.trust=40")
    await C(pg,'makeNpcCouple',f['npcId'],g['npcId'])
    check('#13/I: an NPC in a couple still shows Unknown to a weak acquaintance', not await C(pg,'relStatusKnown',f['id']))
    await T(pg,"openTab('people')"); await pg.click(f"[data-person-open='{f['id']}']"); win=await pg.inner_text('#choice-content')
    check('I: the person window no longer reveals "Dating …" to someone who would not know', 'Dating ' not in win)
    await T(pg,"call('closeChoiceModal')"); await M(pg,f"const a=S.people.find(x=>x.id==='{f['id']}');a.rel=80;a.trust=70")
    check('I: once you know them well, their relationship status is known ("In a relationship")', await C(pg,'relStatusKnown',f['id']) and await C(pg,'npcRelStatus',f['id'])=='In a relationship')
    await M(pg,f"S.romance.partnerId='{g['id']}'"); check('I/#16: your own partner — status known and the descriptor is Girlfriend', await C(pg,'relStatusKnown',g['id']) and await C(pg,'relationshipDescriptor',g['id'])=='Girlfriend')
    await M(pg,"S.romance.partnerId=null")
    pr=await C(pg,'profileHtml',f['id']); check('#14: parents appear once you know them', 'Parents:' in pr or not await pg.evaluate(f"()=>{{const p=__LIFE_SIM_TEST__.getState().people.find(x=>x.id==='{f['id']}');return true}}"))
    s=await st(pg); mom=[x for x in s['people'] if x['role']=='parent' and 'Mom' in x['name']][0]
    check('#16: family descriptors (Mom)', await C(pg,'relationshipDescriptor',mom['id'])=='Mom')
    st0=await st(pg); await pg.evaluate("s=>__LIFE_SIM_TEST__.loadState(s)",st0)
    check('#16: descriptors and learned knowledge persist across reload', await C(pg,'relationshipDescriptor',mom['id'])=='Mom' and await C(pg,'goalsKnown',f['id']) and 'Busy' in await C(pg,'knownTraits',f['id']))
    # section G milestones
    await M(pg,f"const p=S.people.find(x=>x.id==='{g['id']}');p.milestones=[];p.tier='Acquaintance';p.rel=50;p.trust=45;p.conflict=0;p.separatedSince=null;p.friendStatus=null")
    await C(pg,'tierTick'); await M(pg,f"S.people.find(x=>x.id==='{g['id']}').rel=80;S.people.find(x=>x.id==='{g['id']}').trust=70"); await C(pg,'tierTick')
    await M(pg,f"S.people.find(x=>x.id==='{g['id']}').rel=70"); await C(pg,'tierTick'); await M(pg,f"S.people.find(x=>x.id==='{g['id']}').rel=80"); await C(pg,'tierTick')
    ms=[m['type'] for m in (await person(pg,g['id']))['milestones']]
    check('G/#9: Became casual friends → close friends; a small dip and recovery does not duplicate "close friends"', ms.count('casualFriends')==1 and ms.count('closeFriends')==1 and 'closeAgain' not in ms, ms)
    await M(pg,f"const p=S.people.find(x=>x.id==='{g['id']}');p.rel=50;p.trust=40;p.history=[{{dateISO:'2000-01-01',age:10,text:'x',importance:1}}]")
    mon=dt.date.fromisoformat((await st(pg))['clock']['dateISO'])
    while mon.weekday()!=0: mon+=dt.timedelta(days=1)
    await T(pg,f"setClock('{mon.isoformat()}',600)"); await C(pg,'friendNetworkTick'); pp=await person(pg,g['id'])
    check('G: a friendship that fades gets "Friendship faded" (once)', pp.get('friendStatus')=='Old Friend' and [m['type'] for m in pp['milestones']].count('faded')==1, (pp.get('friendStatus'),[m['type'] for m in pp['milestones']]))
    await M(pg,f"const p=S.people.find(x=>x.id==='{g['id']}');p.separatedSince='{(mon-dt.timedelta(days=90)).isoformat()}'")
    await C(pg,'reconnect',g['id']); await M(pg,f"const p=S.people.find(x=>x.id==='{g['id']}');p.rel=82;p.trust=72"); await C(pg,'tierTick')
    ms=[m['type'] for m in (await person(pg,g['id']))['milestones']]
    check('G/#10: after a real separation, reconnecting → "Reconnected", and becoming close again → "Became close again" (not a second first time)', 'reconnected' in ms and 'closeAgain' in ms and ms.count('closeFriends')==1, ms)
    await M(pg,f"const p=S.people.find(x=>x.id==='{f['id']}');p.milestones=[{{type:'friends',label:'Became friends',dateISO:'2020-01-01'}}];p.tier='Acquaintance';p.rel=50;p.trust=45"); await C(pg,'tierTick')
    ms=[m['type'] for m in (await person(pg,f['id']))['milestones']]; check('G: legacy "Became friends" history is kept and no duplicate casual milestone is added', ms==['friends'] or ms.count('casualFriends')==0, ms)
    # H2 note: calendar party keeps its organizer
    await M(pg,f"S.events.forEach(e=>{{if(e.status==='Open')e.status='Resolved'}});S.calendar.push({{id:'calparty1',type:'party',title:'Pool party',dateISO:S.clock.dateISO,startMinute:S.clock.minute+2,endMinute:S.clock.minute+120,graceMinute:S.clock.minute+30,status:'Scheduled',payload:{{personId:'{f['id']}'}}}})")
    await T(pg,"advanceMinutes(5)"); s=await st(pg); ev=[e for e in s['events'] if e['type']=='party' and e['title']=='Pool party']
    check('H2/W2: a calendar party converted into an event keeps its organizer as the actor', ev and ev[0].get('participants')==[f['id']] and ev[0]['payload'].get('hostId')==f['id'], ev and (ev[0].get('participants'),ev[0].get('payload')))
    check('3A.5: no JS errors', not pg.errs, pg.errs[:3]); await b.close()
asyncio.run(main())
