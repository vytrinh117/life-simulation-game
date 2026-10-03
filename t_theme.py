from harness import *
CONTRAST="""(pairs)=>{const L=c=>{const m=c.match(/[\\d.]+/g).map(Number);const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(m[0])+.7152*f(m[1])+.0722*f(m[2])};
 const bgOf=el=>{let e=el;while(e){const b=getComputedStyle(e).backgroundColor;const a=b.match(/[\\d.]+/g);if(a&&(a.length<4||Number(a[3])>.85))return b;e=e.parentElement}return getComputedStyle(document.body).backgroundColor};
 const out=[];for(const [sel,label] of pairs){const el=[...document.querySelectorAll(sel)].find(x=>x.offsetParent);if(!el){out.push([label,null]);continue}const fg=getComputedStyle(el).color,bg=bgOf(el);const a=L(fg),b=L(bg);out.push([label,Math.round(((Math.max(a,b)+.05)/(Math.min(a,b)+.05))*100)/100])}return out}"""
DARKSCAN="""()=>{const L=c=>{const m=c.match(/[\\d.]+/g);if(!m)return 1;const [r,g,b,a]=m.map(Number);if(m.length===4&&a<.5)return 1;if(Math.max(r,g,b)-Math.min(r,g,b)>40)return 1;const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(r)+.7152*f(g)+.0722*f(b)};const bad=[];for(const el of document.querySelectorAll('body *')){if(!el.offsetParent||el.closest('.toast,svg,kbd'))continue;const bg=getComputedStyle(el).backgroundColor;if(L(bg)<.2)bad.push(el.className||el.tagName)}return [...new Set(bad)].slice(0,8)}"""
PAIRS=[('body','Body text / page'),('.card h3','Card heading'),('.card .muted-text','Muted text on card'),('#panel-host button:not(.primary):not(.subtab)','Button text'),('.primary','Primary button'),('.subtab.active','Active sub-tab'),('.tag','Tag'),('.side-link','Nav link'),('.need-compact','Need tile'),('#event-text','Hero text')]
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path=CHROME)
    pg=await new_page(b,1366,768); await new_life(pg); await T(pg,"setAge(9)")
    t=await pg.evaluate("document.documentElement.dataset.theme"); check('55 default theme is Light', t=='light', t)
    for theme in ['light','dark','life']:
        await pg.evaluate(f"document.querySelector('[data-theme-set=\"{theme}\"]').click()"); await pg.wait_for_timeout(120)
        for tab in ['home','school','business','calendar']:
            await T(pg,f"openTab('{tab}')")
            if theme!='dark':
                dark=await pg.evaluate(DARKSCAN); check(f'55 {theme}/{tab}: no dark-only hardcoded surfaces', not dark, dark)
            cs=await pg.evaluate(CONTRAST,PAIRS); low=[(l,c) for l,c in cs if c is not None and c<4.5]
            check(f'55 {theme}/{tab}: text contrast ≥ 4.5:1', not low, low)
        await T(pg,"openTab('school')"); await pg.screenshot(path=f'/home/claude/tests/shot_theme_{theme}.png')
    await pg.evaluate("document.querySelector('[data-theme-set=\"dark\"]').click()")
    await pg.reload(); t=await pg.evaluate("document.documentElement.dataset.theme"); check('55 preference persists after reload (before load-game)', t=='dark', t)
    await pg.click('#load-last'); t=await pg.evaluate("document.documentElement.dataset.theme"); check('55 preference persists in game', t=='dark')
    st0=await st(pg); check('55 theme not stored in the simulation save', 'theme' not in json.dumps(st0.get('ui',{})) and 'dark' not in [st0.get('theme')])
    await pg.click('#theme-btn'); t=await pg.evaluate("[document.documentElement.dataset.theme,document.documentElement.dataset.themePref]"); check('55 quick toggle cycles Dark → Auto', t[1]=='auto', t)
    check('theme: no JS errors', not pg.errs, pg.errs[:3]); await pg.close()
    for scheme,exp in [('dark','dark'),('light','light')]:
        ctx=await b.new_context(color_scheme=scheme,viewport={'width':1366,'height':768}); pg=await ctx.new_page()
        await pg.goto(URL); await pg.evaluate("localStorage.setItem('lifeSim_ui',JSON.stringify({theme:'auto'}))"); await pg.reload()
        t=await pg.evaluate("document.documentElement.dataset.theme"); check(f'55 Auto follows OS {scheme}', t==exp, t); await ctx.close()
    pg=await new_page(b,1366,768); await new_life(pg)
    n=await pg.evaluate("document.querySelectorAll('#tabs .side-link svg use').length"); e=await pg.evaluate("[...document.querySelectorAll('#tabs .side-link span')].some(s=>/\\p{Extended_Pictographic}/u.test(s.textContent))")
    check('31 navigation uses the SVG icon set (no platform emoji)', n>=5 and not e, (n,e))
    n2=await pg.evaluate("document.querySelectorAll('#needs-hud svg use').length"); check('31 needs use SVG icons', n2>=5, n2)
    await b.close()
asyncio.run(main())
