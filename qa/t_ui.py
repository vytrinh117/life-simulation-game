from harness import *
VIEWS=[(1920,1080),(1440,900),(1366,768),(1180,820),(820,1180),(768,1024),(390,844)]
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path=CHROME)
    for (w,h) in VIEWS:
        pg=await new_page(b,w,h); await new_life(pg); await T(pg,"setAge(9)"); s=await st(pg)
        m=[e for e in s['exams'] if e['subject']=='Mathematics'][0]
        await T(pg,f"setClock('{m['dateISO']}',530)"); await T(pg,"advanceMinutes(12)"); await T(pg,"openTab('school')")
        r=await pg.evaluate("""()=>{const out={overflow:document.documentElement.scrollWidth>window.innerWidth+1,collide:0,metaTight:0,btnOverlap:0};
          for(const c of document.querySelectorAll('.subject-card')){const n=c.querySelector('.subject-name').getBoundingClientRect(),t=c.querySelector('.subject-teacher').getBoundingClientRect();
            if(!(t.top>=n.bottom-1||t.left>=n.right))out.collide++;
            const sp=[...c.querySelectorAll('.mini-meta span')].map(x=>x.getBoundingClientRect());for(let i=1;i<sp.length;i++){if(Math.abs(sp[i].top-sp[i-1].top)<2&&sp[i].left-sp[i-1].right<6)out.metaTight++}
            const bs=[...c.querySelectorAll('.subject-actions>*')].map(x=>x.getBoundingClientRect());for(let i=0;i<bs.length;i++)for(let j=i+1;j<bs.length;j++){const a=bs[i],b=bs[j];if(a.left<b.right-1&&b.left<a.right-1&&a.top<b.bottom-1&&b.top<a.bottom-1)out.btnOverlap++}}
          out.cta=!!document.querySelector('.subject-card.is-due [data-exam-take]');out.heroCta=!!document.querySelector('#event-actions [data-exam-take]');
          const hud=document.querySelector('.hud-story').getBoundingClientRect(),det=document.querySelector('#event-detail').getBoundingClientRect();out.heroDetail=det.height>20;return out}""")
        tag=f'{w}x{h}'
        check(f'UI {tag}: no horizontal overflow', not r['overflow'])
        check(f'UI {tag}: subject name/teacher do not touch', r['collide']==0, r['collide'])
        check(f'UI {tag}: Skill/Prep/Exam spaced', r['metaTight']==0, r['metaTight'])
        check(f'UI {tag}: subject buttons do not collide', r['btnOverlap']==0, r['btnOverlap'])
        check(f'UI {tag}: active assessment CTA in card + hero', r['cta'] and r['heroCta'])
        check(f'UI {tag}: hero has content (not empty space)', r['heroDetail'])
        if (w,h) in [(1366,768),(390,844),(820,1180)]:
            await pg.screenshot(path=f'/home/claude/tests/shot_school_{tag}.png',full_page=False)
            await pg.evaluate("document.querySelector('.subject-grid').scrollIntoView()"); await pg.screenshot(path=f'/home/claude/tests/shot_subjects_{tag}.png')
        check(f'UI {tag}: no JS errors', not pg.errs, pg.errs); await pg.close()
    # home + next-day modal shots
    pg=await new_page(b,1366,768); await new_life(pg); await T(pg,"setAge(9)"); s=await st(pg)
    m=[e for e in s['exams'] if e['subject']=='Mathematics'][0]
    await T(pg,f"setClock('{m['dateISO']}',420)"); await T(pg,"openTab('home')"); await pg.screenshot(path='/home/claude/tests/shot_home_morning.png')
    await pg.click('#next-day'); await pg.screenshot(path='/home/claude/tests/shot_nextday_warn.png')
    await pg.click('[data-next-day-confirm]'); await pg.screenshot(path='/home/claude/tests/shot_morning_summary.png')
    await pg.click('[data-close-modal]'); await T(pg,"ageUp()"); await pg.screenshot(path='/home/claude/tests/shot_year_summary.png')
    check('UI flows: no JS errors', not pg.errs, pg.errs)
    await b.close()
asyncio.run(main())
