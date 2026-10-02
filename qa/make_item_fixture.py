import json, asyncio
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome'); pg=await b.new_page()
    await pg.goto('file:///path/to/v7.1/index.html'); await pg.fill('#c-name','Legacy Items'); await pg.fill('#c-dob','2004-05-02'); await pg.click('#begin')
    await pg.evaluate("__LIFE_SIM_TEST__.setAge(15)")
    ids={}
    for k in ['snackPack','snackPack','snackPack','makeup','sweater','hoodie','phone','bicycle','book','waterBottle','umbrella']:
        ids.setdefault(k,[]).append(await pg.evaluate(f"__LIFE_SIM_TEST__.grantItem('{k}')"))
    await pg.evaluate("__LIFE_SIM_TEST__.openTab('business')")
    # use makeup twice (drops condition), wear sweater then hoodie (old code unequips by category)
    for _ in range(2): await pg.click(f"[data-item-action='use'][data-item-id='{ids['makeup'][0]}']")
    await pg.click(f"[data-item-action='wear'][data-item-id='{ids['sweater'][0]}']")
    st=await pg.evaluate("__LIFE_SIM_TEST__.getState()")
    # make phone condition diverge like real play: inventory item worn, S.phone stale
    for it in st['inventoryItems']:
        if it['key']=='phone': it['condition']=83
        if it['key']=='hoodie': it['equipped']=True   # two tops equipped (old category rule allowed weird states)
    st['phone']['condition']=100
    print('legacy snack instances',sum(1 for i in st['inventoryItems'] if i['key']=='snackPack'),'| makeup cond',[i['condition'] for i in st['inventoryItems'] if i['key']=='makeup'],'| phone item vs S.phone',[i['condition'] for i in st['inventoryItems'] if i['key']=='phone'],st['phone']['condition'])
    json.dump(st,open('/home/claude/tests/fixture_items_v71.json','w')); await b.close()
asyncio.run(main())
