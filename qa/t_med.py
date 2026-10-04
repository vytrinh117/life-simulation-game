from harness import *
async def C(pg,fn,*a): return await T(pg,"call("+",".join([json.dumps(fn)]+[json.dumps(x) for x in a])+")")
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path=CHROME); pg=await new_page(b); await new_life(pg); await T(pg,"setAge(14)")
    r=await C(pg,'applyMedicine','coldRelief'); check('2A.3a: not sick → "You don\'t need this right now" (no benefit)', not r['ok'] and "don't need" in r['why'])
    await C(pg,'startIllness','cold',{'severity':'mild','symptoms':['Cough','Runny nose']})
    r=await C(pg,'applyMedicine','stomachRelief'); check('2A.3a: wrong medicine → no benefit', not r['ok'] and not await C(pg,'reliefActive'))
    r=await C(pg,'applyMedicine','coldRelief'); s=await st(pg)
    check('2A.3a: suitable medicine eases symptoms (relief active) but does NOT end the illness', r['ok'] and await C(pg,'reliefActive') and s['healthState'].get('condition'))
    r2=await C(pg,'applyMedicine','coldRelief'); check('2A.3a: no repeat dosing while the last one works (no spam)', not r2['ok'])
    f=await C(pg,'concentration'); check('2A.3a: relief improves focus a little while sick', f>0)
    await C(pg,'recoverIllness'); await T(pg,"setAge(8)"); await C(pg,'startIllness','fever',{'severity':'mild','symptoms':['Fever','Fatigue']})
    r=await C(pg,'applyMedicine','feverPain','self'); check('2A.3a: an 8-year-old cannot self-medicate (ask a parent)', not r['ok'] and 'parent' in r['why'].lower(), r)
    r=await C(pg,'applyMedicine','feverPain','caregiver'); check('2A.3a: a caregiver can give a suitable medicine', r['ok'], r)
    check('2A.3a: no JS errors', not pg.errs, pg.errs[:3]); await b.close()
asyncio.run(main())
