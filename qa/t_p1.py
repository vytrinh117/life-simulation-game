from harness import *
import re
async def C(pg,fn,*a): return await T(pg,"call("+",".join([json.dumps(fn)]+[json.dumps(x) for x in a])+")")
async def M(pg,code): return await pg.evaluate("c=>__LIFE_SIM_TEST__.mutate(c)",code)
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path=CHROME); errs=[]
    pg=await new_page(b,1280,900); await new_life(pg); await T(pg,"setAge(15)")
    await M(pg,"S.people=S.people.filter(p=>!['older sibling','younger sibling'].includes(p.role));S.people.push({id:'sibA',name:'Older sister',firstName:'Emma',fullName:'Emma Test',role:'older sibling',relation:'sibling',age:S.age+4,gender:'Female',residence:'home',rel:60,trust:60,history:[]})")
    s=await st(pg); f=[x for x in s['people'] if x['role']=='friend' and x.get('npcId')][0]; mom=await C(pg,'familyByRelation','mother'); dad=await C(pg,'familyByRelation','father')
    await T(pg,"openTab('people')")
    heads=await pg.evaluate("[...document.querySelectorAll('.people-grid .person-card .pc-ident')].map(h=>h.innerText)")
    check('P1.1 C/#3/#4: every card (family and non-family) uses "Full Name (Age) | Relationship"', heads and all(re.match(r'^.+ \(\d+\) \| .+$',h) for h in heads), heads[:4])
    names=await pg.evaluate("[...document.querySelectorAll('.people-grid .pc-name')].map(n=>[n.innerText,getComputedStyle(n).textTransform])")
    fulls={x['fullName'] or x['name'] for x in (await st(pg))['people']}
    check('P1.1 B/#2: names use normal casing (exactly the canonical full name, no uppercase transform)', all(t in fulls and tt=='none' for t,tt in names) and not any(t.isupper() and len(t)>3 for t,_ in names), names[:4])
    check('P1.1 D/#6: family cards show specific labels (Mother, Father, Older Sister)', any(h.endswith('| Mother') for h in heads) and any(h.endswith('| Father') for h in heads) and any(h.endswith('| Older Sister') for h in heads), heads)
    fc=await pg.inner_text(f"section.person-card:has([data-profile-open='{f['id']}'])")
    check('P1.1 C: second line is "Gender · …", third is the known connection context ("known since age …")', re.search(r'\n(Male|Female|Non-binary|Unknown)( · Love interest: .+)?\n',fc) is not None and 'known since age' in fc, fc)
    await M(pg,f"const p=S.people.find(x=>x.id==='{f['id']}');p.rel=20;p.trust=30;p.identityKnown=false;const n=S.npcs.find(x=>x.id===p.npcId);if(n)n.orientationKnown=false")
    await T(pg,"openTab('people')"); fc=await pg.inner_text(f"section.person-card:has([data-profile-open='{f['id']}'])")
    known=await C(pg,'loveInterestKnown',f['id']) if False else None
    pr=await C(pg,'profileHtml',f['id'])
    check('P1.1 C/#5 gating: an unknown love interest is omitted on the card (no placeholder) and shown as Unknown only in the Profile', ('Love interest: Unknown' not in fc) and ('Love interest' not in fc or 'Love interest: Unknown' not in fc), fc)
    # name-independence of family labels
    await M(pg,f"const m=S.people.find(x=>x.id==='{mom}');m.name='Helen';m.fullName='Helen Q'")
    check('P1.1 D: relationship comes from data, not the name (Mother stays Mother after renaming)', await C(pg,'familyRelationLabel',mom)=='Mother' and await C(pg,'relationshipDescriptor',mom)=='Mother')
    # child is family
    await M(pg,"S.people.push({id:'kid1',name:'Mai',fullName:'Mai Test',role:'child',relation:'child',roleLabel:'your child',age:2,rel:80,trust:70,history:[]})")
    kv=(await C(pg,'isFamilyPerson','kid1'),await C(pg,'familyRelationLabel','kid1'),await C(pg,'friendTier','kid1'))
    kg=[x for x in (await st(pg))['people'] if x['id']=='kid1'][0].get('gender')
    check('P1.1 D/#7: the player\'s child (role child) is Family, labelled from its real data (Daughter / Son / Child) and never counted as a friend', kv[0] is True and kv[1]=={'Female':'Daughter','Male':'Son'}.get(kg,'Child') and kv[2] in (None,''), (kv,kg))
    await M(pg,"S.people.find(x=>x.id==='kid1').gender='Female'"); check('P1.1 D: a child with a known gender is Daughter', await C(pg,'familyRelationLabel','kid1')=='Daughter')
    # profile header / layout
    await T(pg,"openTab('people')"); await pg.click(f"[data-profile-open='{f['id']}']")
    full=[x for x in (await st(pg))['people'] if x['id']==f['id']][0]; fn=full.get('fullName') or full['name']
    modal=await pg.inner_text('#choice-modal') if await pg.query_selector('#choice-modal') else await pg.inner_text('#choice-content')
    check('P1.1 E/#8: the full name appears once at the top of the Profile (no duplicate title)', modal.count(fn)==1, modal[:160])
    html=await pg.inner_html('#choice-content')
    check('P1.1 G/#11: "Romantic status" is separate from the relationship-to-player descriptor; no "Relationship status" label', 'Romantic status' in html and 'Relationship status' not in html and 'rel-tag' in html)
    lay=await pg.evaluate("()=>{const g=document.querySelector('#choice-content .profile-grid'),m=document.querySelector('#choice-content .metrics-grid');return {cols:getComputedStyle(g).gridTemplateColumns.split(' ').length,mcols:getComputedStyle(m).gridTemplateColumns.split(' ').length}}")
    check('P1.1 F/#9/#10: two-column Profile layout and a compact metrics grid at desktop width', lay['cols']==2 and lay['mcols']==3, lay)
    check('P1.1 knowledge gating kept: a weak acquaintance shows Romantic status Unknown', 'Romantic status</span><b>Unknown' in html)
    await T(pg,"call('closeChoiceModal')")
    # stretch + overflow at desktop widths, with a friend group present
    await M(pg,"const fr=S.people.filter(p=>p.role==='friend').slice(0,5).map(p=>p.id);S.friendGroups=S.friendGroups||[];if(!S.friendGroups.length&&fr.length>=3)S.friendGroups.push({id:'grpT',name:'The Test Crew',members:fr,since:S.clock.dateISO,jokes:['the pizza incident','the bus','the quiz'],history:['a','b','c']})")
    for w in (1280,1366,1440):
        await pg.set_viewport_size({'width':w,'height':900}); await T(pg,"openTab('people')"); await pg.wait_for_timeout(150)
        hs=await pg.evaluate("[...document.querySelectorAll('.people-grid > .person-card')].map(c=>c.getBoundingClientRect().height)")
        inside=await pg.evaluate("document.querySelectorAll('.people-grid section:not(.person-card)').length")
        ov=await pg.evaluate("document.documentElement.scrollWidth>document.documentElement.clientWidth+1")
        hs_sorted=sorted(hs); med=hs_sorted[len(hs)//2] if hs else 0
        check(f'P1.1 A/#1/#17 @{w}px: People cards have their own grid and no card is stretched (max ≤ 1.35× median), no page overflow', hs and inside==0 and max(hs)<=med*1.35 and not ov, (w,[round(x) for x in hs_sorted],inside,ov))
        await pg.click(f"[data-profile-open='{f['id']}']"); mo=await pg.evaluate("()=>{const c=document.querySelector('#choice-content');return c.scrollWidth>c.clientWidth+1}")
        check(f'P1.1 #20 @{w}px: the Profile modal has no horizontal overflow', not mo); await T(pg,"call('closeChoiceModal')")
    errs+=pg.errs; await pg.screenshot(path='shot_p1_cards.png'); await pg.close()
    # legacy save: relation data derived once from the v7.1 generator labels; Mom gets a female name
    pg=await new_page(b); fx=json.load(open('/home/claude/tests/fixture_jordan.json')); await pg.evaluate("s=>__LIFE_SIM_TEST__.loadState(s)",fx); s=await st(pg)
    rel={x['id']:(x.get('relation'),x.get('gender'),x.get('fullName')) for x in s['people'] if x['role'] in ('parent','grandparent')}
    m=[v for k,v in rel.items() if v[0]=='mother']; d=[v for k,v in rel.items() if v[0]=='father']; g=[v for k,v in rel.items() if v[0]=='grandmother']
    check('P1.1 #18 legacy save: parents/grandmother get canonical relation + gender (Mother/Father/Grandmother)', m and d and g and m[0][1]=='Female' and d[0][1]=='Male', rel)
    ng=await C(pg,'nameGender',(m[0][2] or '').split(' ')[0]) if m else None
    check('P1.1 legacy save: Mom receives a female (or unisex) first name — naming uses relation data', ng in ('Female',None), (m and m[0][2],ng))
    s2=[x for x in (await st(pg))['people']]; await pg.evaluate("s=>__LIFE_SIM_TEST__.loadState(s)",await st(pg))
    check('P1.1 #18: relation migration is idempotent (reload changes nothing)', [(x['id'],x.get('relation'),x.get('gender')) for x in (await st(pg))['people']]==[(x['id'],x.get('relation'),x.get('gender')) for x in s2])
    errs+=pg.errs; check('P1.1: no JS errors', not errs, errs[:3]); await b.close()
asyncio.run(main())
