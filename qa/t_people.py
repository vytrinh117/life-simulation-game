from harness import *
async def C(pg,fn,*a): return await T(pg,"call("+",".join([json.dumps(fn)]+[json.dumps(x) for x in a])+")")
async def M(pg,code): return await pg.evaluate("c=>__LIFE_SIM_TEST__.mutate(c)",code)
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path=CHROME); pg=await new_page(b,1280,900); await new_life(pg); await T(pg,"setAge(16)")
    s=await st(pg); f=[x for x in s['people'] if x['role']=='friend' and x.get('npcId')][0]
    await M(pg,f"const p=S.people.find(x=>x.id==='{f['id']}');p.rel=30;p.tier='Acquaintance';p.milestones=[];p.milestonesMigrated=false;p.history=[{{dateISO:S.clock.dateISO,age:15,text:'You helped them through a really hard week.',importance:3}},{{dateISO:S.clock.dateISO,age:15,text:'You talked after school.',importance:1}}]")
    await T(pg,"openTab('people')"); card=await pg.inner_html(f"section.person-card.compact:has([data-profile-open='{f['id']}'])")
    txt=await pg.inner_text(f"section.person-card.compact:has([data-profile-open='{f['id']}'])")
    check('3A.1 (format per Hotfix P1 C): compact card — Full Name (Age) | Relationship, gender, context, closeness label, Interact/Plans/Profile', '(16) |' in txt and 'Closeness:' in txt and all(k in txt for k in ['Interact','Plans','Profile']), txt)
    check('3A.1: no numeric stat bars on the collapsed card', 'relationship-bars' not in card and 'Trust' not in txt)
    order=await pg.evaluate("[...document.querySelectorAll('section.person-card.compact [data-profile-open]')].map(b=>b.dataset.profileOpen)")
    s=await st(pg); fam={x['id'] for x in s['people'] if x['role'] in ('parent','grandparent','older sibling','younger sibling','aunt','uncle')}
    first_non=[i for i,x in enumerate(order) if x not in fam]; check('3A.1: family first, then friends by closeness', not first_non or all(o in fam for o in order[:first_non[0]]))
    await pg.click(f"[data-profile-open='{f['id']}']"); prof=await pg.inner_text('#choice-content')
    check('3A.1: profile for someone you barely know — private info is Unknown (interests, smart, health, birthday)', all(f'{k}\nUnknown' in prof or f'{k}Unknown' in prof.replace('\n','') for k in ['Interests','Smart','Health','Birthday']), prof[:300])
    check('3A.1 (header per 3A.5/H): profile shows full name, relationship descriptor, age • gender • known since, looks, where met, and all relationship stats incl. Respect/Reliability/Conflict', all(k in prof for k in ['Looks','Where met','Respect','Reliability','Conflict']) and 'known since' in prof.lower() and ' · ' in prof and ') | ' in prof, prof[:200])
    await T(pg,"call('closeChoiceModal')"); await M(pg,f"S.people.find(x=>x.id==='{f['id']}').rel=80"); pr=await C(pg,'profileHtml',f['id'])
    check('3A.1: once close, you know their interests, how smart they are, their birthday', 'Unknown' not in pr.split('Interests')[1][:120] and 'Unknown' not in pr.split('Smart')[1][:80], pr[:200])
    # milestones
    await M(pg,f"const p=S.people.find(x=>x.id==='{f['id']}');p.rel=45;p.tier='Acquaintance'"); await C(pg,'tierTick'); await C(pg,'tierTick'); s=await st(pg); ms=[m['type'] for m in [x for x in s['people'] if x['id']==f['id']][0].get('milestones',[])]
    check('3A.2 (label per 3A.5/G): becoming casual friends creates one milestone (no duplicates)', ms.count('casualFriends')==1, ms)
    await M(pg,f"const p=S.people.find(x=>x.id==='{f['id']}');p.rel=78;p.trust=70;p.conflict=0"); await C(pg,'tierTick'); s=await st(pg); ms=[m['type'] for m in [x for x in s['people'] if x['id']==f['id']][0].get('milestones',[])]
    check('3A.2 (Close Friend needs trust and low conflict since 3A.3): becoming close friends is a milestone too', 'closeFriends' in ms, ms)
    await M(pg,f"const p=S.people.find(x=>x.id==='{f['id']}');p.romanceInit=true;p.romanceOpen=true;p.orientationMismatch=false"); await C(pg,'setLoveStage',f['id'],'official'); s=await st(pg); ms=[m['type'] for m in [x for x in s['people'] if x['id']==f['id']][0].get('milestones',[])]
    check('3A.2: becoming official is a milestone', 'official' in ms, ms)
    await pg.click(f"[data-person-open='{f['id']}']"); win=await pg.inner_text('#choice-content')
    check('3A.2: the person window has a Relationship log and Milestones (renamed)', 'RELATIONSHIP LOG' in win.upper() and 'MILESTONES' in win.upper() and 'SHARED MEMORIES' not in win.upper())
    box=await pg.evaluate("()=>{const tiles=[...document.querySelectorAll('#choice-content .modal-stats>div')];const c=document.querySelector('#choice-content').getBoundingClientRect();const last=tiles[tiles.length-1].getBoundingClientRect();return {n:tiles.length,lastRight:last.right,contRight:c.right,bw:['Top','Right','Bottom','Left'].map(k=>getComputedStyle(tiles[tiles.length-1])['border'+k+'Width']).join(',')}}")
    check('3A (spec 218): the Conflict tile is fully inside the window with its border', box['n']==4 and box['lastRight']<=box['contRight']+0.5 and '0px' not in box['bw'], box)
    mcol=await pg.inner_text('#choice-content .pm-list')
    check('3A.2: milestones show only important moments — an old big moment is kept, routine talk is not', 'hard week' in mcol and 'talked after school' not in mcol, mcol[:300])
    await pg.screenshot(path='shot_people_window.png'); await T(pg,"call('closeChoiceModal')"); await T(pg,"openTab('people')"); await pg.screenshot(path='shot_people_cards.png')
    st0=await st(pg); await pg.evaluate("s=>__LIFE_SIM_TEST__.loadState(s)",st0); s=await st(pg)
    check('3A: milestones and interests persist across reload', [x for x in s['people'] if x['id']==f['id']][0]['milestones']==[x for x in st0['people'] if x['id']==f['id']][0]['milestones'])
    check('3A: no JS errors', not pg.errs, pg.errs[:3]); await b.close()
asyncio.run(main())
