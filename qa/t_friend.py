from harness import *
import datetime as dt
async def C(pg,fn,*a): return await T(pg,"call("+",".join([json.dumps(fn)]+[json.dumps(x) for x in a])+")")
async def M(pg,code): return await pg.evaluate("c=>__LIFE_SIM_TEST__.mutate(c)",code)
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path=CHROME); pg=await new_page(b); await new_life(pg); await T(pg,"setAge(16)")
    s=await st(pg); f=[x for x in s['people'] if x['role']=='friend' and x.get('npcId')][0]; today=s['clock']['dateISO']
    # legacy migration
    await M(pg,f"const p=S.people.find(x=>x.id==='{f['id']}');p.tier='Good Friend';p.rel=62;p.trust=55;p.milestones=[{{type:'goodFriends',label:'Became good friends',text:'',dateISO:S.clock.dateISO}}]")
    await C(pg,'migrateFriendTiers'); await C(pg,'tierTick'); s=await st(pg); pp=[x for x in s['people'] if x['id']==f['id']][0]
    check('3A.3: legacy "Good Friend" migrates to "Casual Friend" (history kept, no duplicate friendship milestone)', pp['tier']=='Casual Friend' and await C(pg,'friendTier',f['id'])=='Casual Friend' and [m['type'] for m in pp['milestones']].count('goodFriends')==1 and 'friends' not in [m['type'] for m in pp['milestones']], (pp['tier'],[m['type'] for m in pp['milestones']]))
    # a person met during play: time & shared days gate the ladder
    await M(pg,"const n=S.npcs.find(x=>!S.people.some(p=>p.npcId===x.id));const p=personFromNpcQ(n);p.id='newA';S.people.push(p)".replace('personFromNpcQ(n)',"Object.assign(JSON.parse(JSON.stringify(S.people[0])),{id:'newA',npcId:n.id,role:'friend',roleLabel:'met at a party',history:[],milestones:[],metDate:S.clock.dateISO,rel:10,trust:50,respect:50,reliability:70,conflict:0,friendStatus:null,tier:null})"))
    check('3A.3: someone you just met is a Stranger', await C(pg,'friendTier','newA')=='Stranger')
    await M(pg,"const p=S.people.find(x=>x.id==='newA');p.rel=95;p.trust=95;p.fun=100;p.history=[{dateISO:S.clock.dateISO,age:S.age,text:'Talked',importance:1}]")
    check('3A.3: maxed closeness/trust on day one does NOT make a Best or Close Friend (no button-press best friends)', await C(pg,'friendTier','newA') in ('Acquaintance','Stranger'), await C(pg,'friendTier','newA'))
    d0=dt.date.fromisoformat(today)
    def hist(n,span): return ','.join("{dateISO:'%s',age:S.age,text:'Hung out',importance:1}"%(d0-dt.timedelta(days=int(i*span/n))).isoformat() for i in range(n))
    await M(pg,f"const p=S.people.find(x=>x.id==='newA');p.metDate='{(d0-dt.timedelta(days=30)).isoformat()}';p.history=[{hist(8,29)}]")
    check('3A.3: after a month with real shared days → Close Friend (not yet Best)', await C(pg,'friendTier','newA')=='Close Friend', await C(pg,'friendTier','newA'))
    await M(pg,f"const p=S.people.find(x=>x.id==='newA');p.metDate='{(d0-dt.timedelta(days=90)).isoformat()}';p.history=[{hist(18,89)}];p.milestones=[{{type:'trip',label:'First trip together',dateISO:'{today}'}}]")
    check('3A.3: months of shared history + a shared milestone → Best Friend', await C(pg,'friendTier','newA')=='Best Friend', await C(pg,'friendTier','newA'))
    await M(pg,"S.people.find(x=>x.id==='newA').respect=30"); check('3A.3: low respect blocks Best Friend', await C(pg,'friendTier','newA')!='Best Friend')
    await M(pg,"const p=S.people.find(x=>x.id==='newA');p.respect=60;p.conflict=55"); check('3A.3: unresolved conflict blocks Close/Best', await C(pg,'friendTier','newA')=='Casual Friend', await C(pg,'friendTier','newA'))
    await M(pg,"const p=S.people.find(x=>x.id==='newA');p.conflict=0;p.rel=55;p.trust=15;p.fun=100"); check('3A.3: high Fun alone (low trust) is not a friendship', await C(pg,'friendTier','newA')=='Acquaintance')
    # network size: 55 casual friends + 2 close friends
    await M(pg,"for(let i=0;i<55;i++)S.people.push({id:'cf'+i,name:'Casual '+i,firstName:'Casual',fullName:'Casual '+i,role:'friend',roleLabel:'classmate',age:S.age,rel:45+(i%10),trust:40,respect:50,reliability:70,conflict:0,fun:50,history:[{dateISO:S.clock.dateISO,age:S.age,text:'Hi',importance:1}],milestones:[],knownSince:S.age});for(let i=0;i<2;i++)S.people.push({id:'cl'+i,name:'Close '+i,firstName:'Close',fullName:'Close '+i,role:'friend',roleLabel:'classmate',age:S.age,rel:82,trust:75,respect:60,reliability:80,conflict:0,fun:60,history:[{dateISO:'2000-01-01',age:S.age,text:'Long ago',importance:1}],milestones:[],knownSince:S.age})")
    n0=len((await st(pg))['people']); before=await C(pg,'activeFriendCount')
    mon=d0
    while mon.weekday()!=0: mon+=dt.timedelta(days=1)
    await T(pg,f"setClock('{mon.isoformat()}',600)"); await C(pg,'friendNetworkTick'); s=await st(pg)
    check('3A.3: with 50+ active friendships, the network settles at about 50', before>50 and await C(pg,'activeFriendCount')<=50, (before,await C(pg,'activeFriendCount')))
    check('3A.3: nobody is deleted (people count unchanged)', len(s['people'])==n0)
    cl=[x for x in s['people'] if x['id'] in ('cl0','cl1')]; check('3A.3: strong Close Friends are not demoted just because there are too many friends', all(not x.get('friendStatus') for x in cl), [x.get('friendStatus') for x in cl])
    drifted=[x for x in s['people'] if x.get('friendStatus') in ('Old Friend','Contact')]; check('3A.3: the weakest casual friendships drift to Old Friend / Contact', len(drifted)>=5 and all(x['id'].startswith('cf') for x in drifted), len(drifted))
    await M(pg,"const n=S.npcs.find(x=>!S.people.some(p=>p.npcId===x.id));S.people.push({id:'newB',npcId:n?n.id:null,name:'New B',firstName:'New',fullName:'New B',role:'friend',roleLabel:'met at the mall',age:S.age,rel:30,trust:50,respect:50,conflict:0,history:[{dateISO:S.clock.dateISO,age:S.age,text:'Chatted',importance:1}],milestones:[],metDate:S.clock.dateISO})")
    check('3A.3: a new person can still become an Acquaintance (no "too many friends" wall)', await C(pg,'friendTier','newB')=='Acquaintance')
    # drift by time + reconnect keeps the same person
    await M(pg,f"S.people.forEach(p=>{{if(p.id.startsWith('cf'))p.friendStatus='Contact'}});const p=S.people.find(x=>x.id==='cf3');p.friendStatus=null;p.rel=50;p.history=[{{dateISO:'{(mon-dt.timedelta(days=130)).isoformat()}',age:S.age,text:'Last time',importance:1}}]")
    await C(pg,'friendNetworkTick'); s=await st(pg); cf3=[x for x in s['people'] if x['id']=='cf3'][0]
    check('3A.3: a casual friend you have not talked to in 4+ months becomes an Old Friend', cf3.get('friendStatus')=='Old Friend', cf3.get('friendStatus'))
    await T(pg,"openTab('people')"); btn=await pg.query_selector("[data-reconnect='cf3']"); check('3A.3: Old Friends show a Reconnect button on their card', btn is not None)
    await C(pg,'reconnect','cf3'); s=await st(pg); cf3=[x for x in s['people'] if x['id']=='cf3'][0]
    check('3A.3: Reconnect reuses the same person (same id), clears the status and logs it', not cf3.get('friendStatus') and cf3['history'][0]['text'].startswith('You reconnected'))
    check('3A.3: no JS errors', not pg.errs, pg.errs[:3]); await b.close()
asyncio.run(main())
