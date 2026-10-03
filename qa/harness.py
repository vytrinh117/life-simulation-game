import json, asyncio, datetime
from playwright.async_api import async_playwright
URL='file:///home/claude/proj/index.html?qa=1'
CHROME='/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
RESULTS=[]
def check(name,cond,detail=''):
    RESULTS.append((name,bool(cond),detail)); print(('PASS ' if cond else 'FAIL ')+name+(' — '+str(detail) if detail else ''))
async def new_page(b,w=1440,h=900):
    pg=await b.new_page(viewport={'width':w,'height':h}); pg.errs=[]
    pg.on('pageerror',lambda e:pg.errs.append(str(e)))
    pg.on('console',lambda m:pg.errs.append('console:'+m.text) if m.type=='error' else None)
    await pg.goto(URL); return pg
async def new_life(pg,name='QC',dob='2005-03-10'):
    await pg.fill('#c-name',name); await pg.fill('#c-dob',dob)
    await pg.evaluate("()=>{const p=document.getElementById('c-place');if(!p.value)p.value='New York City, USA'}")
    await pg.click('#begin')
async def st(pg): return await pg.evaluate("__LIFE_SIM_TEST__.getState()")
async def T(pg,expr): return await pg.evaluate("__LIFE_SIM_TEST__."+expr)
def days(a,b): return (datetime.date.fromisoformat(b)-datetime.date.fromisoformat(a)).days
