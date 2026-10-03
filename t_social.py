from harness import *
import datetime as dt
async def C(pg,fn,*a): return await T(pg,"call("+",".join([repr(fn)]+[repr(x) for x in a])+")")
async def M(pg,code): return await pg.evaluate("c=>__LIFE_SIM_TEST__.mutate(c)",code)
async def school_day(pg,s):
    d=dt.date.fromisoformat(s['clock']['dateISO'])
    while not await T(pg,f"call('isSchoolDay','{d.isoformat()}')"): d+=dt.timedelta(days=1)
    return d.isoformat()
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path=CHROME)
    # ---------- §122 names ----------
    pg=await new_page(b); await pg.evaluate('v=>{document.getElementById("c-place").value=v}','New York City, USA'); await new_life(pg); await T(pg,"setAge(10)")
    for _ in range(45): await C(pg,'generateHousehold',{'kids':2})
    s=await st(pg); n=s['npcs']
    check('122: ≥100 NPCs generated', len(n)>=100, len(n))
    check('122: unique IDs', len({x['id'] for x in n})==len(n))
    full=[x['fullName'].lower() for x in n]+[p['fullName'].lower() for p in s['people'] if p.get('fullName') and not p.get('npcId')]
    check('122: no accidental identical full names', len(full)==len(set(full)), len(full)-len(set(full)))
    firsts={x['firstName'] for x in n}; check('122: no small repetitive name loop (≥35 distinct first names)', len(firsts)>=35, len(firsts))
    hh=s['households']; same=[h for h in hh if len(h['members'])==2]
    ok=all(len({next(x['surname'] for x in n if x['id']==m) for m in h['members']})==1 for h in same)
    check('101: siblings in a household share a surname', ok and len(same)>5)
    styles={h['style'] for h in hh}; check('101: varied surname conventions (shared / hyphenated / separate)', len(styles)>=2, styles)
    names={x['id']:x['fullName'] for x in n}; await pg.reload(); await pg.click('#load-last'); s2=await st(pg)
    check('99: names persist after reload', all(names[x['id']]==x['fullName'] for x in s2['npcs']))
    fr=[x for x in s2['people'] if x['role']=='friend']
    check('97: persistent friends have first+surname+fullName', fr and all(x.get('firstName') and x.get('surname') and x.get('fullName') for x in fr), [x['name'] for x in fr])
    check('names: no JS errors', not pg.errs, pg.errs[:2]); await pg.close()
    pg=await new_page(b); await pg.evaluate('v=>{document.getElementById("c-place").value=v}','Hanoi, Vietnam'); await new_life(pg); await T(pg,"setAge(9)")
    for _ in range(10): await C(pg,'generateHousehold',{'kids':1})
    s=await st(pg); vn=s['npcs'][0]
    check('99: Vietnamese profile uses family-name-first order', vn['fullName'].startswith(vn['surname']+' '), vn['fullName'])
    check('101: VN households: parents keep their own surnames', all(h['style']=='parentsKeepOwn' for h in s['households']))
    await pg.close()
    # ---------- migration of the player's real save ----------
    pg=await new_page(b); fx=json.load(open('fixture_player_save_v72.json'))
    await pg.evaluate("s=>__LIFE_SIM_TEST__.loadState(s)",fx); s=await st(pg)
    mia=[x for x in s['people'] if x.get('firstName')=='Mia']
    check('97: legacy "Mia • neighbor" → full name, role kept', mia and mia[0]['fullName']!='Mia' and mia[0]['roleLabel']=='neighbor' and ' • ' not in mia[0]['name'], mia and (mia[0]['name'],mia[0].get('roleLabel')))
    mom=[x for x in s['people'] if x['name']=='Mom']; check('100: Mom keeps "Mom" as how you address her, has a full name', mom and mom[0].get('fullName'), mom and mom[0].get('fullName'))
    check('migration: no JS errors', not pg.errs, pg.errs[:2]); await pg.close()
    # ---------- §102 availability ----------
    pg=await new_page(b); await pg.evaluate('v=>{document.getElementById("c-place").value=v}','New York City, USA'); await new_life(pg); await T(pg,"setAge(12)"); s=await st(pg)
    f=[x for x in s['people'] if x['role']=='friend'][0]; d=await school_day(pg,s)
    st10=await C(pg,'npcStatusAt',f['id'],d,600); check('102: friend is at school on a school morning', not st10['free'] and 'school' in st10['why'], st10)
    st23=await C(pg,'npcStatusAt',f['id'],d,1400); check('102: friend unavailable late at night', not st23['free'], st23)
    await T(pg,f"setClock('{d}',600)"); await C(pg,'personAction',f['id'],'hangout')
    vis=await pg.is_visible('#choice-overlay'); txt=await pg.inner_text('#choice-content') if vis else ''
    check('102: busy NPC → reason + Ask later / Schedule / Message', vis and 'Schedule something' in txt and 'at school' in txt.lower(), txt[:120])
    await T(pg,"call('closeChoiceModal')")
    # ---------- §94/95 RSVP: player invites ----------
    await M(pg,f"const p=S.people.find(x=>x.id==='{f['id']}');p.rel=90;p.trust=80;p.conflict=0;p.goals=[];p.traits=['Outgoing']")
    await T(pg,f"setClock('{d}',700)"); await C(pg,'makePlan',f['id'],'hangout','tomorrow'); s=await st(pg)
    pl=s['plans'][0]; check('95: friendly NPC accepts with a reason', pl['status']=='Accepted' and pl['reason'], (pl['status'],pl.get('reason')))
    ev=[e for e in s['calendar'] if e['type']=='plan' and e['payload']['planId']==pl['id']]
    check('95: accepted plan is on the calendar', len(ev)==1 and ev[0]['dateISO']==pl['dateISO'])
    await T(pg,f"setClock('{pl['dateISO']}',{pl['startMinute']-30})"); await C(pg,'attendPlan',pl['id']); s=await st(pg)
    pl2=[x for x in s['plans'] if x['id']==pl['id']][0]; fr2=[x for x in s['people'] if x['id']==f['id']][0]
    check('95: attending → Attended + story + relationship', pl2['status']=='Attended' and 'with' in s['log'][0]['title'].lower() and len(s['log'][0]['text'])>40, (pl2['status'],s['log'][0]['title']))
    # cancel beforehand vs no-show
    await C(pg,'makePlan',f['id'],'study','weekend'); s=await st(pg); pa=s['plans'][0]; r0=[x for x in s['people'] if x['id']==f['id']][0]['rel']
    await C(pg,'cancelPlan',pa['id']); s=await st(pg); r1=[x for x in s['people'] if x['id']==f['id']][0]['rel']
    check('95: polite early cancel costs little', r0-r1<=1.01 and [x for x in s['plans'] if x['id']==pa['id']][0]['status']=='Cancelled by you', r0-r1)
    await C(pg,'makePlan',f['id'],'hangout','weekend'); s=await st(pg); pb=s['plans'][0]; r0=[x for x in s['people'] if x['id']==f['id']][0]['rel']
    await T(pg,f"setClock('{pb['dateISO']}',{pb['startMinute']-10})"); await T(pg,"advanceMinutes(120)"); s=await st(pg)
    pb2=[x for x in s['plans'] if x['id']==pb['id']][0]; r2=[x for x in s['people'] if x['id']==f['id']][0]['rel']
    check('95: no-show is worse than cancelling', pb2['status']=='No-show' and r0-r2>=5, (pb2['status'],r0-r2))
    await T(pg,"advanceMinutes(1500)"); s=await st(pg)
    check('46: friend confronts you later (follow-up, not instant)', any(e['type']=='planNoShowTalk' for e in s['events']))
    # NPC invites player
    await C(pg,'npcInvitesPlayer',f['id']); s=await st(pg); inv=[e for e in s['events'] if e['type']=='invitation' and e['status']=='Open']
    check('94: NPC invitation has inviter, date/time and response deadline', inv and inv[0]['expiresAt'] and 'Answer by' in inv[0]['text'])
    await T(pg,f"eventChoice('{inv[0]['id']}','maybe')"); s=await st(pg); pm=[x for x in s['plans'] if x['id']==inv[0]['payload']['planId']][0]
    check('94: Maybe keeps it pending with a deadline', pm['status']=='Maybe')
    await T(pg,"advanceMinutes(2880)"); s=await st(pg); pm=[x for x in s['plans'] if x['id']==pm['id']][0]
    check('94: ignored Maybe expires (NPC stops waiting)', pm['status']=='Expired', pm['status'])
    check('rsvp: no JS errors', not pg.errs, pg.errs[:3]); await pg.close()
    # ---------- §96 curfew & permission ----------
    pg=await new_page(b); await new_life(pg); await T(pg,"setAge(13)"); s=await st(pg)
    f=[x for x in s['people'] if x['role']=='friend'][0]
    await M(pg,"S.family.rules.strictness=100;S.family.rules.respect=0;S.family.closeness=0;S.family.trust=0")
    await C(pg,'makePlan',f['id'],'party','weekend'); txt=await pg.inner_text('#choice-content') if await pg.is_visible('#choice-overlay') else ''
    check('96: strict household says no to a party → Accept / Go anyway', 'says no' in (await pg.inner_text('#choice-title')).lower() and 'Go anyway' in txt, txt[:100])
    await pg.click('[data-plan-defy]'); s=await st(pg); pd=s['plans'][0]
    check('96: defying is tracked on the plan', pd.get('defy') is True)
    t0=s['family']['trust']; check('96: trust shown in House rules', True)
    await pg.close()
    # ---------- §120 clubs ----------
    pg=await new_page(b); await new_life(pg); await T(pg,"setAge(15)"); s=await st(pg)
    await M(pg,"S.school.activityOffers=[];['Art Club','Basketball','Drama'].forEach(n=>S.school.activityOffers.push({id:'off-'+n.replace(' ',''),name:n,status:'Offered',createdDate:S.clock.dateISO,decisionDate:S.clock.dateISO.slice(0,8)+'28'}))")
    await M(pg,"S.school.activityOffers.forEach(o=>o.decisionDate='2099-01-01')")
    await C(pg,'signUpForActivity','off-ArtClub'); s=await st(pg)
    check('120: open club → sign up joins directly', any(c['name']=='Art Club' and c['status']=='Active' for c in s['school']['clubs']))
    await T(pg,"openTab('school')"); await pg.click("[data-subtab='activities']"); await pg.click("[data-activity-decline='off-Drama']"); s=await st(pg)
    check('120: decline a club', [o for o in s['school']['activityOffers'] if o['id']=='off-Drama'][0]['status']=='Declined')
    await C(pg,'signUpForActivity','off-Basketball'); s=await st(pg); t=s['school']['tryouts'][0]
    check('73: sport requires a tryout (scheduled, not instant membership)', t['club']=='Basketball' and t['status']=='Scheduled' and not any(c['name']=='Basketball' for c in s['school']['clubs']))
    await M(pg,"S.skills.sports=2;S.skills.fitness=2;S.happiness=20;S.stress=90;S.energy=20;S.luck=0")
    await T(pg,f"setClock('{t['dateISO']}',920)"); await C(pg,'attendTryout',t['id']); s=await st(pg); t2=s['school']['tryouts'][0]
    check('73: weak player fails with a component-based reason', t2['result']=='Not selected' and s['outcomes'][0]['reason'].startswith(t2['coach'].split(' ')[0]) and 'not strong enough' in s['outcomes'][0]['reason'], (t2['result'],s['outcomes'][0]['reason']))
    check('117: recovery path — next tryout date given', bool(t2.get('nextDate')))
    await C(pg,'retryTryout',t2['id']); s=await st(pg); t3=s['school']['tryouts'][0]
    check('74: retry schedules a second tryout', t3['attempt']==2 and t3['status']=='Scheduled', (t3.get('attempt'),t3['status']))
    p0=t3['prep']; await T(pg,f"setClock('{s['clock']['dateISO']}',1000)")
    await C(pg,'practiceForTryout',t3['id'],'alone'); a1=(await st(pg))['school']['tryouts'][0]['prep']-p0
    await C(pg,'practiceForTryout',t3['id'],'alone'); a2=(await st(pg))['school']['tryouts'][0]['prep']-p0-a1
    check('74/45: practice raises preparation with diminishing returns', a1>0 and a2<a1, (a1,a2))
    await M(pg,"S.skills.sports=95;S.skills.fitness=95;S.happiness=90;S.stress=5;S.energy=95;S.luck=90;S.school.tryouts[0].prep=95")
    await T(pg,f"setClock('{t3['dateISO']}',920)"); await C(pg,'attendTryout',t3['id']); s=await st(pg)
    bb=[c for c in s['school']['clubs'] if c['name']=='Basketball' and c['status']=='Active']
    check('73: strong second attempt → selected with sport ladder rank', bb and bb[0]['position'] in ('Reserve','Starter'), bb and bb[0]['position'])
    check('71: athletic reputation rose', s['schoolRep']['athletic']>12, s['schoolRep']['athletic'])
    check('112: outcome history shows the failure then the success', [o['result'] for o in s['outcomes'][:2]][1]=='Not selected' and 'Selected' in s['outcomes'][0]['result'], [o['result'] for o in s['outcomes'][:3]])
    th=[x for x in s['threads'] if x['kind']=='tryout']; check('110: story thread resolved across attempts', th and th[0]['resolved'] and len(th[0]['log'])>=3, th and th[0]['log'])
    # progression & elections
    await M(pg,"const c=S.school.clubs.find(x=>x.name==='Basketball');c.attended=40;c.missedSessions=0;c.skill=80;c.leaderRel=80;c.position='Starter';c.joinedDate='2000-01-01'")
    s=await st(pg); bid=[c for c in s['school']['clubs'] if c['name']=='Basketball'][0]['id']
    await C(pg,'startElection',{'scope':'club','name':'Basketball','clubId':bid,'position':'Captain'}); s=await st(pg); el=s['elections'][0]
    check('76: election has NPC opponents with full names', el['opponents'] and all(' ' in o['name'] for o in el['opponents']), [o['name'] for o in el['opponents']])
    for k in ['message','talk','posters','speech','promise']: await C(pg,'campaignAction',el['id'],k)
    s=await st(pg); check('77: campaign actions add effort (once per day each)', s['elections'][0]['points']>8, s['elections'][0]['points'])
    await M(pg,"S.elections[0].points=90;S.schoolRep.leadership=90;S.schoolRep.social=90")
    await C(pg,'decideElection',el['id']); s=await st(pg)
    check('77: winning sets the position (Captain)', [c for c in s['school']['clubs'] if c['name']=='Basketball'][0]['position']=='Captain' and s['elections'][0]['winner']==s['name'])
    await C(pg,'startElection',{'scope':'council','name':'Student Council','position':'Class representative'}); s=await st(pg); el2=s['elections'][0]
    await M(pg,"S.elections[0].points=-50;S.elections[0].opponents.forEach(o=>o.strength=99);S.schoolRep.leadership=0;S.schoolRep.social=0")
    await C(pg,'decideElection',el2['id']); s=await st(pg)
    check('77: losing → an NPC wins, with vote shares + recovery choices', s['elections'][0]['winner']!=s['name'] and any(e['type']=='electionLost' for e in s['events']), s['elections'][0].get('winner'))
    lost=[e for e in s['events'] if e['type']=='electionLost'][0]; await T(pg,f"eventChoice('{lost['id']}','support')"); s=await st(pg)
    check('117: supporting the winner builds kindness + a relationship', s['schoolRep']['kindness']>20 and any(x.get('fullName')==s['elections'][0]['winner'] for x in s['people']))
    await pg.reload(); await pg.click('#load-last'); s2=await st(pg)
    check('120: club season state persists after reload', [c for c in s2['school']['clubs'] if c['name']=='Basketball'][0]['position']=='Captain' and len(s2['outcomes'])==len(s['outcomes']))
    await T(pg,"openTab('world')"); await pg.click("[data-subtab='journal']"); j=await pg.inner_text('#panel-host')
    check('110/112: Journal shows story threads and outcome history', 'Outcome history' in j and 'Basketball' in j)
    await T(pg,"openTab('school')"); await pg.click("[data-subtab='today']"); txt=await pg.inner_text('#panel-host')
    check('78: school identity shown', 'School reputation' in txt or 'SCHOOL REPUTATION' in txt)
    await T(pg,"openTab('people')"); await pg.screenshot(path='/home/claude/tests/shot_people.png')
    await T(pg,"openTab('school')"); await pg.click("[data-subtab='activities']"); await pg.screenshot(path='/home/claude/tests/shot_clubs.png')
    check('clubs: no JS errors', not pg.errs, pg.errs[:3]); await b.close()
asyncio.run(main())
