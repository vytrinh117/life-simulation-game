from harness import *
async def C(pg,fn,*a): return await T(pg,"call("+",".join([json.dumps(fn)]+[json.dumps(x) for x in a])+")")
async def M(pg,code): return await pg.evaluate("c=>__LIFE_SIM_TEST__.mutate(c)",code)
async def enroll(pg,uid,year=1):
    x=await C(pg,'uniById',uid)
    await M(pg,f"const x={json.dumps({'name':x['name'],'tier':x['tier'],'tuition':x['tuition']})};S.uni={{enrolled:true,school:x.name,tier:x.tier,tuition:x.tuition,year:{year},yearKey:2028,semKey:'2028-1',gpa:3.2,semGpas:[{{gpa:3.2}}],semStudy:0,rankAward:0,tierAid:false,nextSemAid:0}};S.education.highSchoolDone=true;S.school=null")
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path=CHROME); pg=await new_page(b); await new_life(pg,dob='2008-03-10'); await T(pg,"setAge(19)")
    await M(pg,"S.talents=['Programming','Music'];S.events.forEach(e=>{if(e.status==='Open')e.status='Resolved'})"); await enroll(pg,'uni2')
    mb=await C(pg,'majorBonus','cs'); check('B2: Computer Science at a tech school with a Programming talent → +30% talent and +10% strength', mb['talent']=='Programming' and mb['strength'] and abs(mb['mult']-1.4)<1e-9, mb)
    mb=await C(pg,'majorBonus','design'); check('B2: a major with no talent match and not a school strength → no bonus', mb['mult']==1 and not mb['talent'], mb)
    mb=await C(pg,'majorBonus','music'); check('B2: a talent match at a school not known for it → +30% only', abs(mb['mult']-1.3)<1e-9 and not mb['strength'], mb)
    await T(pg,"openTab('school')"); await pg.click("[data-subtab='university']") if await pg.query_selector("[data-subtab='university']") else None; txt=await pg.inner_text('#panel-host')
    opts=await pg.evaluate("[...document.querySelectorAll('#major-pick option')].map(o=>o.textContent)")
    check('B2: the panel asks you to declare a major, marking talent matches with ★', 'not declared a major' in txt and any(o.startswith('★') and 'Computer Science' in o for o in opts), opts[:4])
    await pg.select_option('#major-pick','cs'); await pg.click('[data-major-declare]'); s=await st(pg); check('B2: declaring a major', s['uni']['major']=='cs')
    await T(pg,"setClock('2028-09-12',900)"); await M(pg,"S.uni.semStudy=0;S.farm=null"); await C(pg,'uniStudy'); d1=(await st(pg))['uni']['semStudy']
    await C(pg,'declareMajor','design'); s=await st(pg); check('B2: you can change major once in your first year', s['uni']['major']=='design' and s['uni']['majorChanged'])
    await M(pg,"S.uni.semStudy=0;S.farm=null"); await C(pg,'uniStudy'); d2=(await st(pg))['uni']['semStudy']
    check('B2: studying a talent-matched major at a school strong in it progresses ~40% faster', d1>d2*1.3, (round(d1,2),round(d2,2)))
    await C(pg,'declareMajor','cs'); s=await st(pg); check('B2: a second change is refused', s['uni']['major']=='design')
    await enroll(pg,'uni2',year=2); await M(pg,"S.uni.major='business'"); await C(pg,'declareMajor','cs'); s=await st(pg); check('B2: no changes after the first year', s['uni']['major']=='business')
    await M(pg,"S.uni.major='cs'"); await C(pg,'finishUniversity'); s=await st(pg); check('B2: the degree records the major', s['education']['degree']['major']=='cs')
    check('B2: a CS degree fits a developer job', await C(pg,'majorFitsJob','developer') and not await C(pg,'majorFitsJob','designer'))
    await C(pg,'startCareer','developer'); dev=(await st(pg))['career']['job']; await M(pg,"S.career.job=null;S.calendar=S.calendar.filter(e=>e.type!=='workDay')")
    await C(pg,'startCareer','office'); off=(await st(pg))['career']['job']
    check('B2: a matching degree starts you one level higher than a non-matching job', dev['level']==off['level']+1, (dev['title'],off['title']))
    await T(pg,"openTab('school')"); txt=await pg.inner_text('#panel-host'); check('B2: the graduated panel shows the major', 'Computer Science' in txt)
    check('B2: no JS errors', not pg.errs, pg.errs[:3]); await b.close()
asyncio.run(main())
