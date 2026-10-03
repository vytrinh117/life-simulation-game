from harness import *
import random
INV="""()=>{const S=__LIFE_SIM_TEST__.getState(),bad=[],today=S.clock.dateISO,now=today+'T'+String(S.clock.minute).padStart(4,'0');
 const term=['Completed','Attended','Missed','Excused','Cancelled','Expired','Resolved','Superseded','No-show','Withdrew'];
 const exOpen=e=>['Scheduled','Due','In progress'].includes(e.status);
 for(const c of S.calendar){if(c.type==='exam'){const e=S.exams.find(x=>x.id===c.payload.examId);if(e&&!exOpen(e)&&!term.includes(c.status))bad.push('exam terminal but calendar '+c.status);if(e&&exOpen(e)&&term.includes(c.status))bad.push('exam open but calendar '+c.status)}
   if(!term.includes(c.status)&&c.dateISO<today)bad.push('past calendar still '+c.status+' '+c.type+' '+c.dateISO);
   if(c.status==='Attending'&&!(c.type==='schoolDay'&&c.dateISO===today&&S.clock.minute<900&&S.location==='School'))bad.push('dangling Attending '+c.type+' '+c.dateISO+' '+S.clock.minute+' '+S.location)}
 for(const e of S.events)if(['friendInvite','schoolSocial','parentSchool'].includes(e.type)&&e.dateISO===today&&(e.minute<390||e.minute>=1290))bad.push('NPC event at night '+e.type+' '+e.minute);
 for(const e of S.exams){if(e.status==='In progress')bad.push('exam stuck in progress');if(exOpen(e)&&e.dateISO<today)bad.push('open exam in the past')}
 if(S.age>=6&&S.pendingDecisions.some(p=>p.type==='kindergarten'&&!p.resolved))bad.push('active kindergarten at '+S.age);
 for(const e of S.events)if(e.status==='Open'&&e.expiresAt&&(e.expiresAt.dateISO+'T'+String(e.expiresAt.minute).padStart(4,'0'))<now)bad.push('open event past expiry '+e.type);
 for(const n of S.notifications)if(n.sourceType==='exam'&&['Unread','Read'].includes(n.status)){const e=S.exams.find(x=>x.id===n.sourceId);if(!e||!exOpen(e))bad.push('active note for resolved exam')}
 if(S.school&&S.school.subjects)for(const s of S.school.subjects){const h=s.homework;if(h&&h.status==='Late'){const d=(Date.parse(today)-Date.parse(h.dueDate))/864e5;if(d>4)bad.push('homework late forever')}}
 const c=S.current;if(c.sourceType==='exam'){const e=S.exams.find(x=>x.id===c.sourceId);if(!e||!exOpen(e))bad.push('hero points at resolved exam')}
 if(c.sourceType==='event'){const e=S.events.find(x=>x.id===c.sourceId);if(!e||e.status!=='Open')bad.push('hero points at closed event')}
 if(S.school&&S.school.clubs)for(const cl of S.school.clubs){const live=S.calendar.filter(e=>e.type==='clubSession'&&e.payload.clubId===cl.id&&!term.includes(e.status));if(cl.status==='Active'&&live.length>1)bad.push('duplicate live club sessions');if(cl.status!=='Active'&&live.length)bad.push('session for inactive club')}
 for(const pl of S.plans||[]){if(pl.status==='Accepted'){const ev=S.calendar.find(e=>e.type==='plan'&&e.payload.planId===pl.id);if(!ev)bad.push('accepted plan without calendar');if(pl.dateISO<today)bad.push('accepted plan in the past')}}
 for(const el of S.elections||[])if(el.status==='Campaign'&&el.date<today)bad.push('election stuck in campaign');
 for(const t of (S.school&&S.school.tryouts)||[])if(t.status==='Scheduled'&&t.dateISO<today)bad.push('tryout stuck scheduled');
 const fn=S.npcs?S.npcs.map(n=>n.fullName.toLowerCase()):[];if(new Set(fn).size!==fn.length)bad.push('duplicate NPC full names');
 if(S.farm&&S.farm.date===today)for(const [k,v] of Object.entries(S.farm.c||{}))if(typeof v==='number'&&v>3)bad.push('farm counter over cap '+k);
 if(S.school&&S.school.subjects)for(const x of S.school.subjects)if(!(x.score>=0&&x.score<=100))bad.push('grade out of range '+x.name);
 if(!(S.happiness>=0&&S.happiness<=100))bad.push('mood out of range');
 const pp=S.romance&&S.romance.partnerId&&S.people.find(x=>x.id===S.romance.partnerId);if(pp){const pa=pp.age;if(S.age<18&&(pa>=18||pa<13||Math.abs(pa-S.age)>2))bad.push('SAFETY: age-inappropriate partner');if(S.age>=18&&pa<18)bad.push('SAFETY: adult with minor partner')}
 const pr=S.school&&S.school.prom;if(pr&&pr.status==='Season'&&pr.dateISO<today)bad.push('prom stuck in season');
 if(S.age>=3&&!S.neighborhood)bad.push('neighborhood missing');
 const ph=S.inventoryItems.find(i=>i.id===S.phone.activeItemId);if(ph&&Math.round(ph.condition)!==S.phone.condition)bad.push('phone desync '+ph.condition+' vs '+S.phone.condition);
 const slots={};for(const i of S.inventoryItems){if(i.equipped){if(slots[i.slot])bad.push('two items in slot '+i.slot);slots[i.slot]=1}if(!(i.quantity>=1))bad.push('bad quantity');if(i.lifecycleType==='finite'&&i.remaining<=0.5)bad.push('used-up item lingers');if(i.lifecycleType==='container'&&(i.contents<0||i.contents>i.capacity))bad.push('container out of bounds');if(!i.lifecycleType)bad.push('item without lifecycle')}
 return bad}"""
SKIP=['menu-new','pause','export','menu-export','import-btn','menu-import','clear-log','close-menu']
async def main():
  random.seed(7); total_bad=[]; steps=0
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path=CHROME)
    import sys
    AGES=[int(x) for x in sys.argv[1:]] or [3,6,8,11,14,17]
    for run,age in [(i,a) for i,a in enumerate([3,6,8,11,14,17]) if a in AGES]:
        pg=await new_page(b,1366,768); pg.on('dialog',lambda d:asyncio.ensure_future(d.dismiss()))
        await new_life(pg,dob=f'200{run}-0{run+2}-1{run}'); await T(pg,f"setAge({age})"); await T(pg,"setMoney(3000,0,0)")
        for k in ['snackPack','waterBottle','book','toy','artSupplies','bicycle','sweater','raincoat','phone','laptop','sandwich','greetingCard']: await T(pg,f"call('addItem','{k}','QC grant')")
        for i in range(140):
            steps+=1
            r=random.random()
            modal=await pg.is_visible('#choice-overlay')
            if modal:
                mb=[x for x in await pg.query_selector_all('#choice-content button') if await x.is_visible()]
                tgt=random.choice(mb) if mb and random.random()<0.85 else await pg.query_selector('#close-choice')
                try: await tgt.click(timeout=1500)
                except Exception: pass
                continue
            if r<0.06:
                try: await pg.click('#next-day',timeout=1500)
                except Exception: pass
            elif r<0.08: await T(pg,"advanceMinutes(%d)"%random.choice([45,180,600]))
            elif r<0.085 and age<16: await T(pg,"ageUp()")
            elif r<0.10:
                await pg.reload(); await pg.click('#load-last')
                if await pg.evaluate("__LIFE_SIM_TEST__.getState()") is None:
                    print('  NULL AFTER RELOAD at step',i,'errors:',pg.errs[-3:],'creator visible:',await pg.is_visible('#creator'),'saved bytes:',await pg.evaluate("(localStorage.getItem('lifeSim_v7_world')||'').length")); break
            else:
                if random.random()<0.3:
                    await T(pg,"openTab('business')")
                elif random.random()<0.25:
                    tabs=await pg.query_selector_all('#tabs [data-tab]')
                    try: await random.choice(tabs).click(timeout=1500)
                    except Exception: pass
                btns=[x for x in await pg.query_selector_all('#event-actions button, #panel-host button') if await x.is_visible() and await x.is_enabled()]
                if btns:
                    bt=random.choice(btns)
                    try: await bt.click(timeout=1500)
                    except Exception: pass
            if await pg.evaluate("__LIFE_SIM_TEST__.getState()") is None:
                print('  S NULL at step',i,'r=%.3f'%r,'url',pg.url,'creator:',await pg.is_visible('#creator'),'errs',pg.errs[-2:]); break
            if i%10==9:
                bad=await pg.evaluate(INV)
                if bad: total_bad.append((age,i,bad[:3])); print('  invariant @age',age,'step',i,bad[:3])
        s=await st(pg)
        check(f'fuzz start-age {age}: no JS errors ({s["age"]} now)', not pg.errs, pg.errs[:3])
        await pg.close()
    check(f'fuzz: invariants held over {steps} random player steps', not total_bad, total_bad[:5])
    await b.close()
asyncio.run(main())
