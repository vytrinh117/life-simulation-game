import json, asyncio
from playwright.async_api import async_playwright
ORIG='file:///path/to/v7.1/index.html'
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
        pg=await b.new_page(); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto(ORIG)
        await pg.fill('#c-name','Fixture Kid'); await pg.fill('#c-dob','2005-03-10')
        await pg.click('#begin')
        await pg.evaluate("__LIFE_SIM_TEST__.setAge(3)")
        await pg.evaluate("__LIFE_SIM_TEST__.setAge(6)")
        st=await pg.evaluate("__LIFE_SIM_TEST__.getState()")
        print('A pending', [(x['type'],x['status'],x['resolved']) for x in st['pendingDecisions']], st['school']['grade'])
        json.dump(st,open('/home/claude/tests/fixture_kinder_v71.json','w'))
        # exam fixture
        await pg.evaluate("__LIFE_SIM_TEST__.setAge(7)")
        st=await pg.evaluate("__LIFE_SIM_TEST__.getState()")
        ex=sorted(st['exams'],key=lambda e:e['dateISO'])[0]
        from datetime import date
        d=(date.fromisoformat(ex['dateISO'])-date.fromisoformat(st['clock']['dateISO'])).days
        await pg.evaluate(f"__LIFE_SIM_TEST__.advanceDays({d},true)")
        # move to 9:30 to trigger Due
        await pg.evaluate("__LIFE_SIM_TEST__.action('rest')")
        await pg.evaluate("__LIFE_SIM_TEST__.action('rest')")
        await pg.evaluate("__LIFE_SIM_TEST__.action('rest')")
        await pg.evaluate("__LIFE_SIM_TEST__.openTab('school')")
        st=await pg.evaluate("__LIFE_SIM_TEST__.getState()")
        print('before', st['clock'], st['current']['title'])
        btn=await pg.query_selector(f"[data-exam-take='{ex['id']}']")
        print('btn',bool(btn))
        if btn: await btn.click()
        st=await pg.evaluate("__LIFE_SIM_TEST__.getState()")
        e2=[e for e in st['exams'] if e['id']==ex['id']][0]
        c2=[c for c in st['calendar'] if c.get('payload',{}).get('examId')==ex['id']]
        print('after exam',e2['status'],e2['score'],[c['status'] for c in c2],'| hero:',st['current']['title'])
        json.dump(st,open('/home/claude/tests/fixture_exam_v71.json','w'))
        print('errors',errs)
        await b.close()
asyncio.run(main())
