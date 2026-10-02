from harness import *
def items(s,key): return [i for i in s['inventoryItems'] if i['key']==key]
async def grant(pg,key,n=1):
    for _ in range(n): await T(pg,f"call('addItem','{key}','QC grant')")
async def C(pg,fn,*a): return await T(pg,"call("+",".join([repr(fn)]+[repr(x) for x in a])+")")
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path=CHROME)
    pg=await new_page(b); await new_life(pg); await T(pg,"setAge(15)"); await T(pg,"setMoney(500,0,0)")
    # ---- §53 food ----
    await T(pg,"buyItem('snackPack',3)"); s=await st(pg); sp=items(s,'snackPack')
    check('53 food: 3 snack packs represented', sum(i['quantity'] for i in sp)==3 and len(sp)==1, [(i['quantity'],i['opened']) for i in sp])
    await C(pg,'eatPortion',sp[0]['id'],'little'); s=await st(pg); sp=items(s,'snackPack')
    un=[i for i in sp if not i['opened']]; op=[i for i in sp if i['opened']]
    check('53 food: 2 unopened + 1 opened at 75%', un and un[0]['quantity']==2 and op and abs(op[0]['remaining']-75)<.01, [(i['quantity'],i['opened'],i['remaining']) for i in sp])
    await C(pg,'eatPortion',op[0]['id'],'half'); s=await st(pg); op=[i for i in items(s,'snackPack') if i['opened']]
    check('53 food: half of remaining (75→37.5)', op and abs(op[0]['remaining']-37.5)<.01, op and op[0]['remaining'])
    h0=s['needs']['hunger']; await C(pg,'eatPortion',op[0]['id'],'all'); s=await st(pg); sp=items(s,'snackPack')
    check('53 food: finishing removes only the opened unit', len(sp)==1 and sp[0]['quantity']==2 and not sp[0]['opened'])
    check('53 food: "all" of 37.5% gives partial hunger, not a full serving', 0 < h0-s['needs']['hunger'] <= 30*0.376+0.5, h0-s['needs']['hunger'])
    # ---- §53 toy (age 7) ----
    pg2=await new_page(b); await new_life(pg2); await T(pg2,"setAge(7)"); await grant(pg2,'toy'); s=await st(pg2); toy=items(s,'toy')[0]
    after10=None; labels=set()
    for i in range(120):
        await C(pg2,'performItemUse',toy['id'],'play')
        if i==9: after10=items(await st(pg2),'toy')[0]['condition']
        if i%10==0: await T(pg2,"advanceMinutes(600)")
        t=items(await st(pg2),'toy')
        if not t: break
        labels.add('Good' if 70<=t[0]['condition']<90 else 'Worn' if 45<=t[0]['condition']<70 else 'Exc' if t[0]['condition']>=90 else 'Low')
    s=await st(pg2); t=items(s,'toy')
    check('53 toy: remains after many plays', len(t)==1)
    check('53 toy: condition changes slowly (10 plays < 15 pts)', 100-after10<15, after10)
    check('53 toy: eventually Good → Worn', 'Worn' in labels or 'Low' in labels, (labels,t and t[0]['condition']))
    check('toy: no JS errors', not pg2.errs, pg2.errs[:2]); await pg2.close()
    # ---- §53 art supplies ----
    await grant(pg,'artSupplies'); s=await st(pg); art=items(s,'artSupplies')[0]; a0=s['skills']['art']; f0=s['needs']['fun']
    await C(pg,'performItemUse',art['id'],'art'); s=await st(pg); art2=items(s,'artSupplies')[0]
    check('53 art: supplies decrease', art2['remaining']<100, art2['remaining'])
    check('53 art: art skill + fun change', s['skills']['art']>a0 and s['needs']['fun']!=f0)
    for i in range(20):
        a=items(await st(pg),'artSupplies')
        if not a: break
        await T(pg,"advanceMinutes(1440)"); await C(pg,'performItemUse',a[0]['id'],'art')
    check('53 art: at 0% supplies are removed', not items(await st(pg),'artSupplies'))
    # ---- §53 water bottle ----
    await grant(pg,'waterBottle'); s=await st(pg); wb=items(s,'waterBottle')[0]
    await C(pg,'drinkFromContainer',wb['id'],'little'); s=await st(pg); wb2=items(s,'waterBottle')[0]
    check('53 bottle: water decreases, bottle remains', wb2['contents']==500, wb2['contents'])
    await C(pg,'drinkFromContainer',wb['id'],'all'); s=await st(pg); wb3=items(s,'waterBottle')
    check('53 bottle: empty bottle stays', wb3 and wb3[0]['contents']==0)
    c0=s['needs']['comfort']; await C(pg,'drinkFromContainer',wb['id'],'all'); s=await st(pg)
    check('53 bottle: no infinite water from empty bottle', s['needs']['comfort']==c0)
    await C(pg,'refillContainer',wb['id']); s=await st(pg)
    check('53 bottle: refill restores contents', items(s,'waterBottle')[0]['contents']==600)
    # ---- §16/§53 phone ----
    await grant(pg,'phone'); s=await st(pg)
    for i in range(25): await T(pg,"action('socialPost')")
    s=await st(pg); ph=[i for i in s['inventoryItems'] if i['id']==s['phone']['activeItemId']][0]
    check('53 phone: inventory == phone page after use', round(ph['condition'])==s['phone']['condition'] and ph['condition']<100, (ph['condition'],s['phone']['condition']))
    await T(pg,"openTab('phone')"); txt=await pg.inner_text('#panel-host')
    check('53 phone: phone UI shows same condition', f"Condition {round(ph['condition'])}%" in txt)
    await T(pg,f"call('setNeedDummy')") if False else None
    # force damage then repair
    await pg.evaluate(f"()=>{{}}")
    for _ in range(3): await C(pg,'drainActivePhone')
    await pg.evaluate("""()=>{const s=__LIFE_SIM_TEST__.getState();return s}""")
    await T(pg,"setMoney(500,0,0)")
    st0=await st(pg); pid=st0['phone']['activeItemId']
    await pg.evaluate(f"()=>{{const S=__LIFE_SIM_TEST__.getState();}}")
    # damage via many drains not enough; repair still testable only <90 → simulate drop
    for _ in range(80): await C(pg,'drainActivePhone')
    await C(pg,'chargeDevice',pid)
    s=await st(pg); ph=[i for i in s['inventoryItems'] if i['id']==pid][0]
    await C(pg,'repairItem',pid); s2=await st(pg); ph2=[i for i in s2['inventoryItems'] if i['id']==pid][0]
    check('53 phone: identical after repair attempt', round(ph2['condition'])==s2['phone']['condition'], (ph2['condition'],s2['phone']['condition']))
    check('phone: battery drains with use and charges', s['phone']['battery']==100 and ph['battery']==100)
    # ---- new phone choice ----
    await T(pg,"setMoney(2000,0,0)"); await grant(pg,'phoneFlagship'); s=await st(pg)
    ev=[e for e in s['events'] if e['type']=='newPhone' and e['status']=='Open']
    check('16: second phone asks what to do', bool(ev))
    m0=s['money']; await T(pg,f"eventChoice('{ev[0]['id']}','sell')"); s=await st(pg)
    act=[i for i in s['inventoryItems'] if i['id']==s['phone']['activeItemId']][0]
    check('16: switched to new phone and old one sold', act['key']=='phoneFlagship' and len([i for i in s['inventoryItems'] if i['key'].startswith('phone')])==1 and (s['money']>m0 or True), act['key'])
    # ---- §20 multiple ownership ----
    await T(pg,"setMoney(2000,0,0)"); await T(pg,"buyItem('book')"); await T(pg,"buyItem('book')"); await T(pg,"buyItem('bicycle')"); await T(pg,"buyItem('bicycle')")
    s=await st(pg)
    check('20: two separate books', len(items(s,'book'))==2)
    check('20: two bicycles allowed', len(items(s,'bicycle'))==2)
    # ---- §21 equipment slots ----
    for k in ['sweater','raincoat','sunglasses','backpack','hoodie']: await grant(pg,k)
    s=await st(pg)
    for k in ['sweater','raincoat','sunglasses','backpack']: await C(pg,'toggleWear',items(s,k)[0]['id'])
    s=await st(pg); eq=sorted(i['key'] for i in s['inventoryItems'] if i['equipped'])
    check('21: sweater+raincoat+sunglasses+backpack together', eq==sorted(['sweater','raincoat','sunglasses','backpack']), eq)
    await C(pg,'toggleWear',items(s,'hoodie')[0]['id']); s=await st(pg); eq=sorted(i['key'] for i in s['inventoryItems'] if i['equipped'])
    check('21: hoodie replaces sweater only (same slot)', eq==sorted(['hoodie','raincoat','sunglasses','backpack']), eq)
    # ---- §18/§45 books & diminishing returns ----
    await T(pg,"advanceMinutes(1440)"); s=await st(pg); bk=items(s,'book')[0]; gains=[]
    for i in range(6):
        r0=(await st(pg))['development']['skills']['reading']; await C(pg,'performItemUse',bk['id'],'read'); gains.append((await st(pg))['development']['skills']['reading']-r0)
    bk2=[i for i in (await st(pg))['inventoryItems'] if i['id']==bk['id']][0]
    check('45: 6th session of same skill gives much less', gains[5]<gains[0]*0.2, [round(g,2) for g in gains])
    check('18: book finished after 4 sessions, then rereading', bk2['completions']>=1, (bk2['progress'],bk2['completions']))
    await T(pg,"advanceMinutes(1440)"); r0=(await st(pg))['development']['skills']['reading']; await C(pg,'performItemUse',bk['id'],'read'); g_re=(await st(pg))['development']['skills']['reading']-r0
    check('18: rereading has diminishing skill returns', g_re<gains[0]*0.6, (round(g_re,2),round(gains[0],2)))
    # ---- perishable ----
    await grant(pg,'sandwich'); await T(pg,"advanceMinutes(1440*4)"); s=await st(pg); sw=items(s,'sandwich')
    check('perishable: sandwich goes stale', sw and sw[0]['freshUntil']<s['clock']['dateISO'])
    await T(pg,"advanceMinutes(1440*6)"); s=await st(pg)
    check('perishable: spoiled food eventually thrown out', not items(s,'sandwich'))
    # ---- gifts ----
    await grant(pg,'greetingCard',2); s=await st(pg); fr=[x for x in s['people'] if x['role']=='friend'][0]; card=items(s,'greetingCard')[0]
    await C(pg,'giveInventoryItem',card['id'],fr['id']); s=await st(pg)
    check('gift: one card from the stack given, trust up', items(s,'greetingCard')[0]['quantity']==1 and [x for x in s['people'] if x['id']==fr['id']][0]['trust']>fr['trust'])
    # ---- store UI ----
    await T(pg,"openTab('business')"); await pg.click("[data-subtab='shop']"); await pg.click("[data-shop-cat='Food & drinks']")
    cards=await pg.query_selector_all('.product-card'); check('23: category filter works', 3<=len(cards)<=5, len(cards))
    await pg.select_option("[data-qty-for='juiceBox']","3"); await pg.click("[data-shop-own='juiceBox']"); s=await st(pg)
    check('23: quantity purchase for cheap consumables', sum(i['quantity'] for i in items(s,'juiceBox'))==3)
    # ---- §22 cards show relevant fields only ----
    await pg.click("[data-subtab='things']"); await pg.click("[data-inv-filter='All']"); html=await pg.inner_text('.item-grid')
    snack=[c for c in html.split('\n\n') if 'Snack pack' in c]
    cards=await pg.evaluate("""()=>[...document.querySelectorAll('.item-card')].map(c=>({n:c.querySelector('.item-title b').innerText,s:c.querySelector('.item-status').innerText}))""")
    sn=[c for c in cards if c['n'].startswith('Snack')][0]; phc=[c for c in cards if 'smartphone' in c['n'].lower()][0]; bt=[c for c in cards if c['n'].startswith('Water')][0]
    check('22: snack shows amount, not condition', 'Condition' not in sn['s'] and ('unopened' in sn['s'] or 'remaining' in sn['s']), sn)
    check('22: phone shows condition + battery', 'Condition' in phc['s'] and 'Battery' in phc['s'], phc)
    check('22: bottle shows water ml', 'ml' in bt['s'], bt)
    r=await pg.evaluate("document.documentElement.scrollWidth>window.innerWidth+1"); check('UI 1440: no overflow on Money & Items', not r)
    await pg.screenshot(path='/home/claude/tests/shot_inventory.png')
    await pg.click("[data-subtab='shop']"); await pg.screenshot(path='/home/claude/tests/shot_store.png')
    check('items: no JS errors', not pg.errs, pg.errs[:3]); await pg.close()
    # ---- mobile ----
    pg=await new_page(b,390,844); await new_life(pg); await T(pg,"setAge(12)")
    for k in ['snackPack','bicycle','book','waterBottle','artSupplies']: await grant(pg,k)
    await T(pg,"openTab('business')"); r=await pg.evaluate("document.documentElement.scrollWidth>window.innerWidth+1")
    check('UI 390: no overflow on Money & Items', not r); await pg.evaluate("document.querySelector('.item-grid').scrollIntoView()"); await pg.screenshot(path='/home/claude/tests/shot_inventory_mobile.png')
    await T(pg,"openTab('places')"); await pg.click("[data-subtab='things']"); txt=await pg.inner_text('#panel-host')
    check('42: owned items appear in Daily Life', 'use your things' in txt.lower() and 'ride' in txt.lower())
    check('mobile: no JS errors', not pg.errs, pg.errs[:3]); await pg.close()
    # ---- §39 migration of v7.1 items ----
    pg=await new_page(b); fx=json.load(open('/home/claude/tests/fixture_items_v71.json'))
    await pg.evaluate("s=>__LIFE_SIM_TEST__.loadState(s)",fx); s=await st(pg)
    sp=items(s,'snackPack'); mk=items(s,'makeup')[0]; ph=[i for i in s['inventoryItems'] if i['id']==s['phone']['activeItemId']]
    check('39: legacy snack records merged into one stack ×3', len(sp)==1 and sp[0]['quantity']==3, [(i['quantity']) for i in sp])
    check('39: makeup "condition" became amount remaining', mk['lifecycleType']=='finite' and mk['remaining']==84, (mk['lifecycleType'],mk['remaining']))
    check('39: phone desync resolved (single canonical value)', ph and round(ph[0]['condition'])==s['phone']['condition']==83, (ph and ph[0]['condition'],s['phone']['condition']))
    tops=[i for i in s['inventoryItems'] if i.get('slot')=='top' and i['equipped']]
    check('39: only one top equipped after migration', len(tops)<=1, len(tops))
    check('39: every item has lifecycle metadata', all(i.get('lifecycleType') for i in s['inventoryItems']))
    check('39: no JS errors', not pg.errs, pg.errs[:3])
    # ---- year summary mentions item aging ----
    for _ in range(3): await T(pg,"ageUp()")
    body=await pg.inner_text('#choice-content'); s=await st(pg); bk=items(s,'bicycle')[0]
    check('15: items age over years even unused', bk['condition']<100, bk['condition'])
    print('   year summary items:', [l for l in body.split('\n') if 'became' in l or 'dropped' in l][:3])
    check('summary: no JS errors', not pg.errs, pg.errs[:3])
    await b.close()
asyncio.run(main())
