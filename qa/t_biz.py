from harness import *
async def C(pg,fn,*a): return await T(pg,"call("+",".join([json.dumps(fn)]+[json.dumps(x) for x in a])+")")
async def M(pg,code): return await pg.evaluate("c=>__LIFE_SIM_TEST__.mutate(c)",code)
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path=CHROME); pg=await new_page(b); await new_life(pg); await T(pg,"setAge(16)"); await T(pg,"setMoney(500,0,0)")
    s=await st(pg); d=s['clock']['dateISO']; await T(pg,f"setClock('{d}',1000)"); await M(pg,"S.weather.severity=0;S.weather.type='Sunny';S.location='Home'")
    await T(pg,"openTab('business')"); await pg.click("[data-subtab='selling']"); opts=await pg.evaluate("[...document.querySelectorAll('#biz-kind option')].map(o=>o.value)")
    check('U: business type is chosen from a dropdown (lemonade, cookies, cupcakes, bead jewelry, crafts, yard sale)', set(['lemonade','cookies','cupcakes','beads','crafts','yard'])<=set(opts), opts)
    for k in ['lemonade','cookies','beads']:
        await pg.select_option('#biz-kind',k); await pg.click('[data-biz-start]')
    s=await st(pg); act=[x for x in s['businesses'] if x['status']!='Retired']
    check('U: three businesses can run at once', len(act)==3, [x['kind'] for x in act])
    await C(pg,'startBusiness','crafts','home',5,10); s=await st(pg)
    check('U: a fourth is refused (max 3)', len([x for x in s['businesses'] if x['status']!='Retired'])==3)
    await C(pg,'startBusiness','lemonade','home',3,10); s=await st(pg); check('U: no duplicate business type', len([x for x in s['businesses'] if x['kind']=='lemonade'])==1)
    lem=[x for x in s['businesses'] if x['kind']=='lemonade'][0]; m0=s['money']
    await C(pg,'toggleBusiness',lem['id']); s=await st(pg); check('U: close any time', [x for x in s['businesses'] if x['id']==lem['id']][0]['status']=='Closed')
    await C(pg,'workBusiness',lem['id']); s2=await st(pg); check('U: a closed business cannot sell', s2['money']==s['money'])
    await C(pg,'toggleBusiness',lem['id']); s=await st(pg); check('U: reopen any time', [x for x in s['businesses'] if x['id']==lem['id']][0]['status']=='Open')
    rev=0
    for i in range(3):
        await T(pg,f"setClock('{d}',900)"); await M(pg,"S.weather.severity=0;S.weather.type='Hot'"); await C(pg,'workBusiness',lem['id']); s=await st(pg); rev=[x for x in s['businesses'] if x['id']==lem['id']][0]['revenue']
    check('U: working shifts sells stock and earns money', rev>0 and s['money']>m0, (rev,m0,s['money']))
    st0=[x for x in s['businesses'] if x['id']==lem['id']][0]['stock']; await C(pg,'restock',lem['id'],10); s=await st(pg)
    check('U: restocking adds stock (and costs supplies)', [x for x in s['businesses'] if x['id']==lem['id']][0]['stock']==st0+10)
    await M(pg,"S.weather.severity=2;S.weather.type='Stormy'"); r0=[x for x in s['businesses'] if x['id']==lem['id']][0]['revenue']; await T(pg,f"setClock('{d}',900)"); await C(pg,'workBusiness',lem['id']); s=await st(pg)
    check('U: severe weather stops outdoor selling', [x for x in s['businesses'] if x['id']==lem['id']][0]['revenue']==r0)
    ck=[x for x in s['businesses'] if x['kind']=='cookies'][0]; await C(pg,'retireBusiness',ck['id']); s=await st(pg)
    check('U: retiring frees a slot and records the final tally', len([x for x in s['businesses'] if x['status']!='Retired'])==2 and s['outcomes'][0]['category']=='Business')
    # yard sale with real items
    await M(pg,"S.weather.severity=0;S.weather.type='Sunny'"); await C(pg,'addItem','book','QC'); await C(pg,'addItem','boardGame','QC')
    await C(pg,'startBusiness','yard','home',0,0); s=await st(pg); y=[x for x in s['businesses'] if x['kind']=='yard'][0]
    for it in [i for i in s['inventoryItems'] if i['key'] in ('book','boardGame')]: await C(pg,'listYardItem',y['id'],it['id'])
    s=await st(pg); y=[x for x in s['businesses'] if x['kind']=='yard'][0]; check('U: yard sale lists real items from your things', len(y['listed'])==2)
    sold=False
    for i in range(6):
        await T(pg,f"setClock('{d}',900)"); await C(pg,'workBusiness',y['id']); s=await st(pg); y=[x for x in s['businesses'] if x['kind']=='yard'][0]
        if any(l['sold'] for l in y['listed']): sold=True; break
    left=[i for i in s['inventoryItems'] if i['key'] in ('book','boardGame')]
    check('U: sold yard-sale items leave your inventory and pay you', sold and len(left)<2, (sold,len(left)))
    check('U: no JS errors', not pg.errs, pg.errs[:3]); await pg.close()
    # legacy single stall migrates
    pg=await new_page(b); await new_life(pg); await T(pg,"setAge(12)")
    await M(pg,"S.stall={id:'old1',active:true,type:'Stand',product:'cookies',location:'park',items:[{name:'Cookies',price:3,stock:7,quality:70}],revenue:12,profit:12,visitors:20,dateISO:S.clock.dateISO,reputation:55};S.stallMigrated=false;S.businesses=[]")
    await T(pg,"openTab('business')"); await pg.click("[data-subtab='selling']"); s=await st(pg); bz=s.get('businesses',[])
    check('U: an old single stand becomes one of your businesses (stock, revenue kept)', bz and bz[0]['kind']=='cookies' and bz[0]['stock']==7 and bz[0]['revenue']==12 and not s['stall']['active'], bz and bz[0])
    check('U (legacy): no JS errors', not pg.errs, pg.errs[:3]); await b.close()
asyncio.run(main())
