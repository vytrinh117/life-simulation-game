from harness import *
import datetime as dt
async def C(pg,fn,*a): return await T(pg,"call("+",".join([json.dumps(fn)]+[json.dumps(x) for x in a])+")")
async def M(pg,code): return await pg.evaluate("c=>__LIFE_SIM_TEST__.mutate(c)",code)
async def go(pg,d,m=600):
    prev=(dt.date.fromisoformat(d)-dt.timedelta(days=1)).isoformat(); await T(pg,f"setClock('{prev}',1435)"); await T(pg,f"advanceMinutes({5+m})")
async def senior(b,avg=99):
    pg=await new_page(b); await new_life(pg,dob='2010-03-10'); await T(pg,"setAge(17)"); await T(pg,"setMoney(3000,0,0)"); await go(pg,'2027-09-20')
    await M(pg,f"S.school.subjects.forEach(x=>x.score={avg});S.events.forEach(e=>{{if(e.status==='Open')e.status='Resolved'}})"); return pg
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path=CHROME)
    # ---------- class rank with ties ----------
    pg=await senior(b,99); cr=await C(pg,'classRank'); s=await st(pg)
    yr=2027; peers=[n for n in s['npcs'] if abs((yr-n['birthYear'])-17)<=1]
    check('V3: rank 1 with the highest average → Valedictorian', cr['rank']==1 and (await C(pg,'honorsTitle',cr)) in ('Valedictorian','Co-Valedictorian'), cr)
    check('V3: rank 1 earns the top class-rank award ($15,000/yr)', (await C(pg,'rankAward',cr))['amount']==15000)
    top=sorted([round(await pg.evaluate("id=>{let h=0;for(const ch of id)h=(h*31+ch.charCodeAt(0))>>>0;return 60+(h%3900)/100}",n['id']),1) for n in peers],reverse=True)
    for target,(exp_rank,exp_amt) in [(0,(2,12000)),(1,(3,10000))]:
        g=top[target]; await M(pg,f"S.school.subjects.forEach(x=>x.score={g})"); cr=await C(pg,'classRank')
        check(f'V3: tying the #{target+1} classmate → rank {target+1} (tied); competition ranking', cr['rank']==target+1 and cr['tied'], cr)
    await M(pg,f"S.school.subjects.forEach(x=>x.score={top[0]})"); cr=await C(pg,'classRank')
    check('V3: tied for #1 → Co-Valedictorian, still the top award', (await C(pg,'honorsTitle',cr))=='Co-Valedictorian' and (await C(pg,'rankAward',cr))['amount']==15000, cr)
    mid=lambda i:round((top[i-1]+top[i])/2,2)
    if top[0]-top[1]>=0.2:
        await M(pg,f"S.school.subjects.forEach(x=>x.score={mid(1)})"); cr=await C(pg,'classRank'); check('V3: rank 2 → $12,000 & Salutatorian', cr['rank']==2 and (await C(pg,'rankAward',cr))['amount']==12000 and (await C(pg,'honorsTitle',cr)) in ('Salutatorian','Co-Salutatorian'), cr)
    if top[1]-top[2]>=0.2:
        await M(pg,f"S.school.subjects.forEach(x=>x.score={mid(2)})"); cr=await C(pg,'classRank'); check('V3: rank 3 → $10,000', cr['rank']==3 and (await C(pg,'rankAward',cr))['amount']==10000, cr)
    sch=[g for g in top][4] if len(top)>5 else top[-1]
    await M(pg,f"S.school.subjects.forEach(x=>x.score={top[4]+0.2 if len(top)>4 else 80})"); cr=await C(pg,'classRank'); ra=await C(pg,'rankAward',cr)
    check('V3: outside the top 3 but top 10 in school → $5,000 (unchanged)', ra['amount']==(5000 if cr['school']<=10 else 0) and cr['rank']>3, (cr,ra))
    # ---------- senior competitive scholarship ----------
    await M(pg,"S.school.subjects.forEach(x=>x.score=99)"); tl=await C(pg,'seniorTimeline')
    await C(pg,'applyScholarship'); s=await st(pg); check('V3: the senior scholarship can only be applied for mid-semester 2', not s['uniApps'].get('schApplied'))
    await go(pg,(dt.date.fromisoformat(tl['loanFrom'])-dt.timedelta(days=5)).isoformat(),1000)
    e0=(await st(pg))['uniApps'].get('schEssay',0)
    for i in range(3): await C(pg,'writeScholarshipEssay'); await T(pg,"advanceMinutes(600)")
    s=await st(pg); check('V3: the scholarship essay is separate and improves with work', s['uniApps']['schEssay']>e0 and s['uniApps']['essay']==0)
    await go(pg,(dt.date.fromisoformat(tl['loanFrom'])+dt.timedelta(days=2)).isoformat(),1000); await C(pg,'applyScholarship')
    await M(pg,"S.awards=[{name:'Honor Roll'},{name:'Kindness Award'},{name:'Athlete of the Year'}];S.uniApps.schEssay=95")
    for i in [3,6,9,11]: await C(pg,'addToList',f'uni{i}')
    s=await st(pg); check('V3: application sent mid-semester 2', bool(s['uniApps'].get('schApplied')))
    await go(pg,(dt.date.fromisoformat(tl['decisions'])-dt.timedelta(days=1)).isoformat(),1000); await M(pg,"S.school.subjects.forEach(x=>x.score=99);S.uniApps.schEssay=95;S.uniApps.schApplied.essay=95")
    await T(pg,"advanceMinutes(1500)"); s=await st(pg); sc=s['uniApps'].get('scholarship')
    check('V3: scholarship results arrive even without any university application', sc is not None)
    check('V3: results arrive with the decisions — an outstanding valedictorian gets a full (100%) scholarship', sc and sc['pct']==100, sc)
    check('V3: the result states a reason', sc and len(sc['why'])>10)
    pr=await C(pg,'scholarshipProfile'); check('V3: honors (valedictorian) count in the profile', pr['parts']['honors']>=10, pr['parts'])
    await pg.close()
    tiers=set()
    for avg,essay in [(99,95),(95,70),(90,50),(85,40),(72,5)]:
        pg=await senior(b,avg); tl=await C(pg,'seniorTimeline'); await go(pg,(dt.date.fromisoformat(tl['loanFrom'])+dt.timedelta(days=2)).isoformat(),1000)
        await M(pg,f"S.uniApps.schEssay={essay};S.awards={'[{name:1},{name:2},{name:3}]' if avg==99 else '[]'};S.school.subjects.forEach(x=>x.score={avg})"); await C(pg,'applyScholarship'); await C(pg,'scholarshipDecision'); s=await st(pg); tiers.add(s['uniApps']['scholarship']['pct']); await pg.close()
    check('V3: tiers 100 / 75 / 50 / 25 / none follow the strength of the profile', len(tiers)>=4 and 100 in tiers and 0 in tiers, tiers)
    # ---------- stacking & university semesters ----------
    pg=await senior(b,99); await M(pg,"S.uniApps.scholarship={pct:100,why:'test'};S.uni={enrolled:true,school:'Riverside State University',tier:'state',tuition:12000,year:1,yearKey:2028,semKey:'2028-1',gpa:0,semGpas:[],semStudy:0,rankAward:15000,tierAid:false,nextSemAid:0}")
    a=await C(pg,'aidFor','uni8'); f=await C(pg,'funding','uni8')
    check('V3: a full scholarship covers all tuition; other awards become a living stipend (≤ $3,000)', f['scholarship']==12000 and f['parents']==0 and f['gap']==0 and a['stipend']==3000, (a,f))
    await M(pg,"S.uniApps.scholarship={pct:50,why:'t'};S.uni.rankAward=0;S.uni.nextSemAid=0;S.wealth='Middle class'"); f=await C(pg,'funding','uni5')
    check('V3: order = scholarships → parents → loan → you (50% of $28k → parents cover half the rest)', f['scholarship']==14000 and f['parents']==7000, f)
    await M(pg,"S.uni.semStudy=12"); await C(pg,'closeUniSemester'); s=await st(pg)
    check('V3: semester GPA recorded, cumulative GPA computed', len(s['uni']['semGpas'])==1 and s['uni']['gpa']==s['uni']['semGpas'][0]['gpa'])
    check('V3: a 2-week scholarship window opens after the semester', s['uni']['awardWindow']['to']>s['clock']['dateISO'])
    await M(pg,"S.uni.lastSemGpa=3.9;S.wealth='Struggling'"); await C(pg,'applyUniAward','dean'); await C(pg,'applyUniAward','need'); s=await st(pg)
    check('V3: applying schedules results 2 weeks later', len([f for f in s['followUps'] if f['type']=='uniAward'])==2)
    await M(pg,"S.followUps.filter(f=>f.type==='uniAward').forEach(f=>{f.payload.odds=100;f.dateISO=S.clock.dateISO;f.minute=0;if(f.at){f.at.dateISO=S.clock.dateISO;f.at.minute=0}})"); await T(pg,"advanceMinutes(5)"); s=await st(pg)
    check("V3: Dean's List + need grant awarded → applied to next semester", s['uni'].get('nextSemAid')==4000, s['uni'].get('nextSemAid'))
    await M(pg,"S.uniApps.scholarship={pct:100,why:'t'};S.uni.gpa=2.6;S.uni.semGpas=[{gpa:2.6}]"); await C(pg,'renewScholarship'); s=await st(pg)
    check('V3: GPA below 3.0 → the scholarship drops one tier (100 → 75), not lost at once', s['uniApps']['scholarship']['pct']==75)
    await T(pg,"openTab('school')"); await pg.click("[data-subtab='university']"); txt=await pg.inner_text('#panel-host'); check('V3: University panel shows class year, semester GPAs and scholarship buttons', 'Freshman' in txt and 'Semesters' in txt and "Dean's List" in txt)
    check('V3: no JS errors', not pg.errs, pg.errs[:3]); await b.close()
asyncio.run(main())
