from harness import *
FIELDS="""()=>{const c=id=>document.getElementById(id).value;const act=sel=>[...document.querySelectorAll(sel)].filter(x=>x.classList.contains('active')||x.classList.contains('selected')||x.getAttribute('aria-pressed')==='true').map(x=>x.textContent).join('|');return {name:c('c-name'),dob:c('c-dob'),country:c('c-country'),city:c('c-city'),gender:c('c-gender'),attraction:c('c-attraction'),wealth:c('c-wealth'),home:c('c-home'),p:act('#personality [data-chip]'),t:act('#talents [data-chip]'),zodiac:document.getElementById('c-zodiac-view').textContent}}"""
YEAR=__import__('datetime').date.today().year
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path=CHROME)
    pg=await b.new_page(); pg.errs=[]; pg.on('pageerror',lambda e:pg.errs.append(str(e)))
    await pg.goto('file:///home/claude/proj/index.html')   # real player mode (no qa flag)
    await pg.click('#random-all'); base=await pg.evaluate(FIELDS)
    check('A3: Surprise me fills every field', all(base[k] for k in ['name','dob','country','city','gender','attraction','wealth','home']), base)
    keys={'name':['name'],'dob':['dob','zodiac'],'place':['country','city'],'gender':['gender'],'attraction':['attraction'],'wealth':['wealth'],'home':['home']}
    for key,own in keys.items():
        changed=False
        for _ in range(6):
            before=await pg.evaluate(FIELDS); await pg.click(f"[data-random='{key}']"); after=await pg.evaluate(FIELDS)
            others={k:v for k,v in after.items() if k not in own}; ob={k:v for k,v in before.items() if k not in own}
            if others!=ob: break
            if any(after[k]!=before[k] for k in own): changed=True; break
        check(f'A1: Random [{key}] changes only its own field', others==ob and changed, [k for k in others if others[k]!=ob[k]])
    for key in ['personality','talents']:
        before=await pg.evaluate(FIELDS); await pg.click(f"[data-random='{key}']"); after=await pg.evaluate(FIELDS)
        check(f'A1: Random [{key}] leaves other fields alone', {k:v for k,v in after.items() if k not in ('p','t')}=={k:v for k,v in before.items() if k not in ('p','t')})
    check('A2: no Random button and no manual list for horoscope', await pg.evaluate("!document.querySelector('[data-random=zodiac]')&&document.getElementById('c-zodiac').type==='hidden'"))
    await pg.fill('#c-dob',f'{YEAR}-07-23'); z=await pg.inner_text('#c-zodiac-view'); check('A2: horoscope follows the birth date (Jul 23 → Leo)', z=='Leo', z)
    mn,mx=await pg.evaluate("[document.getElementById('c-dob').min,document.getElementById('c-dob').max]")
    check(f'A5: birth date limited to {YEAR}', mn==f'{YEAR}-01-01' and mx==f'{YEAR}-12-31', (mn,mx))
    yrs=set()
    for _ in range(8): await pg.click("[data-random='dob']"); yrs.add((await pg.input_value('#c-dob'))[:4])
    check('A5: random birth dates stay in the current year', yrs=={str(YEAR)}, yrs)
    # dependent location dropdowns
    await pg.select_option('#c-country',''); dis=await pg.evaluate("document.getElementById('c-city').disabled"); check('A4: city is disabled until a country is chosen', dis)
    await pg.select_option('#c-country','Vietnam'); opts=await pg.evaluate("[...document.getElementById('c-city').options].map(o=>o.value).filter(Boolean)")
    check('A4: choosing a country fills its cities', 'Hanoi' in opts and 'Tokyo' not in opts, opts[:4])
    await pg.select_option('#c-city','Hanoi'); check('A4: place stored as "City, Country"', await pg.input_value('#c-place')=='Hanoi, Vietnam')
    check('A4: no free-text birthplace input', await pg.evaluate("!document.querySelector('input#c-place:not([type=hidden])')"))
    # fill the rest keeps typed values
    await pg.fill('#c-name','Linh Test'); await pg.select_option('#c-gender',''); await pg.select_option('#c-wealth','')
    await pg.click('#fill-rest'); f=await pg.evaluate(FIELDS)
    check('A3: Fill the rest keeps what you typed and fills empties', f['name']=='Linh Test' and f['city']=='Hanoi' and f['gender'] and f['wealth'], (f['name'],f['city'],f['gender'],f['wealth']))
    await pg.fill('#c-dob','2005-03-10'); await pg.click('#begin'); s=await st(pg)
    check(f'A5: a life typed with 2005 still begins in {YEAR}', s['dob'].startswith(str(YEAR)) and s['clock']['dateISO'].startswith(str(YEAR)), s['dob'])
    for dob,z in [(f'{YEAR}-07-22','Cancer'),(f'{YEAR}-07-23','Leo'),(f'{YEAR}-01-20','Aquarius'),(f'{YEAR}-12-22','Capricorn'),(f'{YEAR}-03-21','Aries'),(f'{YEAR}-10-31','Scorpio')]:
        await pg.evaluate("v=>{const i=document.getElementById('c-dob');i.value=v;i.dispatchEvent(new Event('input'))}",dob); got=await pg.inner_text('#c-zodiac-view')
        check(f'A2: zodiac correct on {dob[5:]} → {z}', got==z, got)
    check('A4: Hanoi gives the Vietnamese calendar profile', s['calendarProfile']['region']=='VN', s['calendarProfile'])
    check('creator: no JS errors', not pg.errs, pg.errs[:2]); await pg.close()
    # phone at 13 + legacy message reply
    pg=await new_page(b); await new_life(pg); await T(pg,"setAge(13)"); await T(pg,"call('addItem','phone','QC')")
    check('X: own phone usable from age 13', (await st(pg))['phone']['owned'])
    await T(pg,"openTab('phone')"); txt=await pg.inner_text('#panel-host'); check('X: phone apps open at 13 (no age lock message)', 'starts around high school' not in txt, txt[:120])
    s=await st(pg); f=[x for x in s['people'] if x['role']=='friend'][0]
    await pg.evaluate("c=>__LIFE_SIM_TEST__.mutate(c)",f"S.messages.unshift({{id:'legacy1',from:'{f['firstName']} • {f.get('roleLabel') or 'classmate'}',text:'Want to hang out?',dateISO:S.clock.dateISO,minute:600,read:false}});S.chatsMigrated=false")
    await T(pg,"reconcile()"); s=await st(pg); m=[x for x in s['messages'] if x['id']=='legacy1'][0]
    check('X: legacy message linked to the right person by ID', m.get('fromId')==f['id'], m)
    r0=f['rel']; await pg.evaluate("c=>__LIFE_SIM_TEST__.mutate(c)","S.permissions.dailyAccess={dateISO:S.clock.dateISO,phone:true,tv:false,sharedDevice:false,stove:false}")
    await T(pg,"openTab('phone')"); await pg.click("#panel-host button:has-text('Messages')"); await pg.click(f"[data-chat-open='{f['id']}']"); await pg.click("#choice-content [data-chat-reply='warm']"); await T(pg,"call('closeChoiceModal')")
    s=await st(pg); r1=[x for x in s['people'] if x['id']==f['id']][0]['rel']
    check('X: replying to an old message now affects that friend', r1>r0, (r0,r1))
    # person modal layout
    await T(pg,"openTab('people')"); await pg.click(f"[data-person-open='{f['id']}']")
    tops=await pg.evaluate("[...document.querySelectorAll('#choice-content .modal-stats > *')].map(e=>Math.round(e.getBoundingClientRect().top))")
    check('Layout: Closeness/Trust/Fun/Conflict tiles on one row', len(set(tops))==1 and len(tops)==4, tops)
    blk=await pg.evaluate("[...document.querySelectorAll('#choice-content .memory-list small')].every(s=>getComputedStyle(s).display==='block')")
    check('Layout: memory date sits on its own line (no "age 6Hang out")', blk)
    await pg.screenshot(path='/home/claude/tests/shot_person_modal.png')
    check('phone/layout: no JS errors', not pg.errs, pg.errs[:2]); await b.close()
asyncio.run(main())
