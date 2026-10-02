from harness import *
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path=CHROME); pg=await new_page(b); await new_life(pg); await T(pg,"setAge(7)")
    for i in range(6):
        s=await st(pg); avg=sum(x['score'] for x in s['school']['subjects'])/len(s['school']['subjects']) if s['school'] else 0
        await T(pg,"ageUp()"); body=await pg.inner_text('#choice-content')
        att=[l for l in body.split('\n') if l.startswith('Attendance') or 'assessments completed' in l]
        print(f"age {s['age']}->{s['age']+1} avg_before={avg:.1f} |", ' | '.join(att))
    check('balance: no errors across 6 age-ups', not pg.errs, pg.errs)
    await b.close()
asyncio.run(main())
