from harness import *
import datetime as dt
async def C(pg,fn,*a): return await T(pg,"call("+",".join([json.dumps(fn)]+[json.dumps(x) for x in a])+")")
async def M(pg,code): return await pg.evaluate("c=>__LIFE_SIM_TEST__.mutate(c)",code)
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path=CHROME); pg=await new_page(b); await new_life(pg); await T(pg,"setAge(15)")
    g={n:await C(pg,'nameGender',n) for n in ['Linh','Tuấn','Minh','Olivia','Liam','Seoyeon','Haruto','Léa','Ploy']}
    check('P3: names map to the right gender (Linh/Olivia/Seoyeon/Léa/Ploy female; Tuấn/Liam/Haruto male; Minh unisex)', g['Linh']==g['Olivia']==g['Seoyeon']==g['Léa']==g['Ploy']=='Female' and g['Tuấn']==g['Liam']==g['Haruto']=='Male' and g['Minh'] is None, g)
    s=await st(pg); ids={x['name']:await C(pg,'personIdentity',x['id']) for x in s['people']}
    check('P3: Mom is female and Dad is male', ids.get('Mom',{}).get('gender')=='Female' and ids.get('Dad',{}).get('gender')=='Male', {k:v for k,v in ids.items() if k in ('Mom','Dad')})
    check('P3: every person has a gender and a love interest', all(v.get('gender') and v.get('orientation') for v in ids.values()))
    s=await st(pg); ok=True
    for n in s['npcs']:
        if n.get('gender') and n['gender']!='Non-binary':
            exp=await C(pg,'nameGender',n['firstName'])
            if exp and exp!=n['gender']: ok=False
    check('P3: NPC genders match their names (unisex names may be either)', ok)
    ors=[n.get('orientation') for n in s['npcs'] if n.get('orientation')]; yr=int(s['clock']['dateISO'][:4])
    straight=sum(1 for n in s['npcs'] if n.get('gender') in ('Male','Female') and n.get('orientation')==('Women' if n['gender']=='Male' else 'Men'))
    check('P3: love interests are varied but mostly opposite-gender (realistic spread)', straight>=len(s['npcs'])*0.55 and len(set(ors))>=3, (straight,len(s['npcs']),set(ors)))
    check('P3: "Not sure yet" only for younger teens (under 16 when assigned)', all((yr-n['birthYear'])<16 for n in s['npcs'] if n.get('orientation')=='Not sure yet'), [yr-n['birthYear'] for n in s['npcs'] if n.get('orientation')=='Not sure yet'])
    f=[x for x in s['people'] if x['role']=='friend' and x.get('npcId')][0]
    await M(pg,f"const p=S.people.find(x=>x.id==='{f['id']}');p.rel=40;p.trust=30;p.loveKnown=false;p.age=15;const n=S.npcs.find(x=>x.id===p.npcId);n.birthYear={yr-15}")
    line=await C(pg,'identityLine',f['id']); check('P3: card line shows age, gender and "Interested in: Unknown" before you know them well', line.startswith('15 • ') and 'Interested in: Unknown' in line, line)
    await T(pg,"openTab('people')"); txt=await pg.inner_text('#panel-host'); pr=await C(pg,'profileHtml',f['id'])
    check('P3 (moved by 3A): the compact card shows age • gender; love interest lives in the Profile', '15 • ' in txt and 'Love interest' in pr)
    await pg.evaluate("()=>{window.__r=Math.random;Math.random=()=>0.99}"); await C(pg,'askLoveLife',f['id']); await pg.evaluate("()=>{Math.random=window.__r}"); line=await C(pg,'identityLine',f['id']); check('P3: asking with low trust → "that\'s kind of personal" (still Unknown)', 'Unknown' in line)
    await M(pg,f"S.people.find(x=>x.id==='{f['id']}').trust=90;S.farm=null"); await pg.evaluate("()=>{window.__r=Math.random;Math.random=()=>0.01}"); await C(pg,'askLoveLife',f['id']); await pg.evaluate("()=>{Math.random=window.__r}"); line=await C(pg,'identityLine',f['id']); check('P3: asking with high trust → they tell you', 'Unknown' not in line, line)
    await M(pg,f"const p=S.people.find(x=>x.id==='{f['id']}');p.loveKnown=false;p.rel=58"); await M(pg,f"S.people.find(x=>x.id==='{f['id']}').rel=62"); await C(pg,'identityTick'); line=await C(pg,'identityLine',f['id'])
    check('P3: becoming a Good Friend reveals it naturally', 'Unknown' not in line, line)
    await T(pg,"openTab('people')"); await pg.click(f"[data-person-open='{f['id']}']"); txt=await pg.inner_text('#choice-content'); check('P3: the person window shows the identity line', 'Interested in:' in txt)
    await T(pg,"call('closeChoiceModal')")
    # mismatch: player female; NPC into women only
    await M(pg,f"S.gender='Girl';const p=S.people.find(x=>x.id==='{f['id']}');const n=S.npcs.find(x=>x.id===p.npcId);n.gender='Male';n.orientation='Men';p.romanceInit=false;p.romanceOpen=undefined;p.orientationMismatch=false;p.rel=90;p.trust=90;p.romanceStage='none';p.love=null;p.datingNpc=null;S.romance.partnerId=null")
    check('P3: the NPC is not interested in the player\'s gender', not await C(pg,'npcInterestedInPlayer',f['id']))
    await pg.evaluate("id=>{const b=document.createElement('button');b.dataset.romance='admire';b.dataset.personId=id;document.getElementById('panel-host').appendChild(b);b.click()}",f['id'])
    s=await st(pg); pp=[x for x in s['people'] if x['id']==f['id']][0]
    check('P3: confessing to someone not into your gender → kind "not like that", at most a one-sided crush, their love interest becomes known', 'not like that' in s['log'][0]['text'] and (pp.get('love') or {}).get('stage','noticing') in ('noticing','crushOne') and pp.get('loveKnown'), (s['log'][0]['text'][:80],pp.get('love')))
    await M(pg,f"const n=S.npcs.find(x=>x.id===S.people.find(y=>y.id==='{f['id']}').npcId);n.orientation='Women';const p=S.people.find(x=>x.id==='{f['id']}');p.romanceInit=false;p.romanceOpen=undefined;p.orientationMismatch=false")
    check('P3: an NPC into women is interested in a female player', await C(pg,'npcInterestedInPlayer',f['id']))
    # under 13 hidden
    await pg.close(); pg=await new_page(b); await new_life(pg); await T(pg,"setAge(10)"); s=await st(pg); f=[x for x in s['people'] if x['role']=='friend'][0]
    line=await C(pg,'identityLine',f['id']); check('P3: under 13 — age and gender only, no love interest', 'Interested' not in line and ' • ' in line, line)
    await T(pg,"openTab('people')"); txt=await pg.inner_text('#panel-host'); check('P3: no love-interest info anywhere on a child\'s people cards', 'Interested in' not in txt)
    await pg.close()
    # NPC couples must be mutually compatible
    pg=await new_page(b); await new_life(pg); await T(pg,"setAge(15)"); s=await st(pg); yr=int(s['clock']['dateISO'][:4])
    peers=[n for n in s['npcs'] if abs(yr-n['birthYear']-15)<=1][:2]
    await M(pg,f"const a=S.npcs.find(x=>x.id==='{peers[0]['id']}'),b=S.npcs.find(x=>x.id==='{peers[1]['id']}');a.gender='Male';a.orientation='Women';b.gender='Male';b.orientation='Women';a.birthYear=b.birthYear={yr-15};S.npcCouples=[]")
    await C(pg,'makeNpcCouple',peers[0]['id'],peers[1]['id']); s=await st(pg); check('P3: two NPCs who are not into each other\'s gender do not become a couple', not s.get('npcCouples'))
    await M(pg,f"S.npcs.find(x=>x.id==='{peers[1]['id']}').gender='Female';S.npcs.find(x=>x.id==='{peers[1]['id']}').orientation='Men'")
    await C(pg,'makeNpcCouple',peers[0]['id'],peers[1]['id']); s=await st(pg); check('P3: compatible NPCs can', len(s.get('npcCouples',[]))==1)
    check('P3: no JS errors', not pg.errs, pg.errs[:3]); await b.close()
asyncio.run(main())
