from harness import *
import json as J
async def C(pg,fn,*a): return await T(pg,"call("+",".join([json.dumps(fn)]+[json.dumps(x) for x in a])+")")
async def M(pg,code): return await pg.evaluate("c=>__LIFE_SIM_TEST__.mutate(c)",code)
FAM=('parent','grandparent','older sibling','younger sibling','sibling','aunt','uncle')
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path=CHROME); errs=[]; lives=[]
    for i in range(30):
        pg=await new_page(b); await new_life(pg); s=await st(pg)
        if not s: errs.append('new life failed'); await pg.close(); continue
        fam=[x for x in s['people'] if x['role'] in FAM]
        info=[]
        for x in fam: info.append((x['role'],x.get('residence'),x.get('gender'),x.get('firstName'),x.get('surname'),x.get('branch'),await C(pg,'nameGender',x.get('firstName') or '')))
        cg=await pg.evaluate("()=>{const c=__LIFE_SIM_TEST__.call('householdCaregiver');return c&&{role:c.role,res:c.residence}}")
        lives.append((info,cg,s.get('familyName'))); errs+=pg.errs
        if i<29: await pg.close()
    gp_home=[any(r=='grandparent' and res=='home' for r,res,*_ in L) for L,_,_ in lives]
    check('2B: grandparents live at home in only some families (not every household)', 0<sum(gp_home)<len(lives)*0.6, f'{sum(gp_home)}/{len(lives)}')
    check('2B: grandparents still exist in the family tree when they live elsewhere', any(any(r=='grandparent' and res=='elsewhere' for r,res,*_ in L) for L,_,_ in lives))
    sib=[sum(1 for r,*_ in L if r in ('older sibling','younger sibling')) for L,_,_ in lives]
    check('2B: varied sibling counts (0, 1 and 2+ all occur)', 0 in sib and 1 in sib and any(n>=2 for n in sib), sorted(sib))
    g=[gd for L,_,_ in lives for r,res,gd,*_ in L if r in ('older sibling','younger sibling')]
    check('2B: brothers and sisters both occur', 'Female' in g and 'Male' in g, g[:8])
    bad=[(fn,gd,ng) for L,_,_ in lives for r,res,gd,fn,sur,br,ng in L if r in ('older sibling','younger sibling') and ng and gd and ng!=gd]
    check('2B: siblings\' first names match their gender', not bad, bad[:3])
    check('2B: aunts and uncles never live in the household', not any(r in ('aunt','uncle') and res=='home' for L,_,_ in lives for r,res,*_ in L))
    mat=[(sur,fam) for L,_,fam in lives for r,res,gd,fn,sur,br,ng in L if br=='maternal' and sur]
    check("2B: Mom's-side relatives carry the maternal family name", mat and all(s_!=f_ for s_,f_ in mat), mat[:4])
    check('2B: the caregiver is always someone who lives with you', all(c and c['res']=='home' for _,c,_ in lives), [c for _,c,_ in lives if not c or c['res']!='home'][:3])
    # persistence
    s=await st(pg); sibs=[(x['id'],x.get('fullName'),x.get('gender'),x.get('age')) for x in s['people'] if x['role'] in ('older sibling','younger sibling')]
    await pg.evaluate("s=>__LIFE_SIM_TEST__.loadState(s)",s); s2=await st(pg)
    check('2B: sibling identities persist across save/reload (not regenerated)', sibs==[(x['id'],x.get('fullName'),x.get('gender'),x.get('age')) for x in s2['people'] if x['role'] in ('older sibling','younger sibling')])
    await T(pg,"setAge(8)")
    await M(pg,"S.people=S.people.filter(p=>!['older sibling','younger sibling'].includes(p.role));S.people.push(Object.assign({id:'sibA',name:'Older sister',firstName:'Emma',fullName:'Emma Test',role:'older sibling',age:S.age+4,gender:'Female',residence:'home',rel:60,trust:60,history:[]}),Object.assign({id:'sibB',name:'Younger brother',firstName:'Liam',fullName:'Liam Test',role:'younger sibling',age:Math.max(0,S.age-2),gender:'Male',residence:'home',rel:60,trust:60,history:[]}))")
    await T(pg,"openTab('family')"); txt=await pg.inner_html('#panel-host')
    check('2B UI: Family shows a Household and a Family tree, with siblings labelled by type and age', 'HOUSEHOLD' in txt.upper() and 'FAMILY TREE' in txt.upper() and 'Older sister' in txt and 'Younger brother' in txt, {k:(k in txt or k.upper() in txt.upper()) for k in ['Household','Family tree','Older sister','Younger brother','Emma Test','Liam Test']})
    errs+=pg.errs; await pg.close()
    # old save keeps its family (Jordan: grandmother at home, older sibling)
    pg=await new_page(b); fx=J.load(open('/home/claude/tests/fixture_jordan.json')); await pg.evaluate("s=>__LIFE_SIM_TEST__.loadState(s)",fx); s=await st(pg)
    gm=[x for x in s['people'] if x['role']=='grandparent']; os_=[x for x in fx['people'] if x['role']=='older sibling']
    check('2B migration: an old save keeps its grandmother living at home', gm and all(x.get('residence')=='home' for x in gm), [x.get('residence') for x in gm])
    check('2B migration: old family members are all kept (nobody removed)', {x['id'] for x in fx['people']}<= {x['id'] for x in s['people']})
    if os_: check('2B migration: an old older sibling gets a gender once', all(x.get('gender') for x in s['people'] if x['id'] in {o['id'] for o in os_}))
    errs+=pg.errs; check('2B: no JS errors', not errs, errs[:3]); await b.close()
asyncio.run(main())
