import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # project root (this file lives in tools/)
import re
p=ROOT+'/style.css'
s=open(ROOT+'/style.css').read()
# 1) strip the old :root block (rebuilt below)
a=s.index(':root{');b=s.index('}',a)+1;s=s[b:]
HEX={
 '#0b0d12':'var(--bg)','#11151c':'var(--panel)','#151a22':'var(--card)','#191f29':'var(--card2)','#2a3240':'var(--line)',
 '#1b212c':'var(--control)','#232b38':'var(--control-hover)','#202633':'var(--secondary)','#1a2029':'var(--surface-raised)',
 '#12171e':'var(--surface)','#12171f':'var(--surface-modal)','#131820':'var(--surface)','#10151c':'var(--surface-sunken)','#10141a':'var(--surface-sunken)',
 '#0f1319':'var(--surface-sunken)','#0e1218':'var(--input)','#202733':'var(--toast)','#282f3a':'var(--track)','#293241':'var(--line)',
 '#3c475a':'var(--line-strong)','#364052':'var(--line-strong)','#46536a':'var(--line-strong)','#25192d':'var(--accent-tint)',
 '#dfe4ec':'var(--text-2)','#cbd2dd':'var(--text-2)','#dce3ec':'var(--text-2)','#c9d1dc':'var(--text-2)','#dbe7e6':'var(--text-2)','#ffd7dc':'var(--text)',
 '#20172a':'var(--on-accent)','#e2baff':'var(--accent-hover)','#0b1214':'var(--on-accent)','#20131a':'var(--on-accent)',
 '#9be7b5':'var(--good)','#7fe3a4':'var(--good)','#ffd58a':'var(--warn)',
}
RGB={'217,168,255':'--accent','156,239,225':'--accent2','255,154,167':'--bad','255,213,138':'--warn','155,231,181':'--good','255,179,209':'--tone-holiday','255,255,255':'--text','169,200,255':'--info'}
def rgba(m):
    rgb=m.group(1).replace(' ',''); a=float(m.group(2))
    if rgb=='3,5,8': return 'var(--backdrop)'
    if rgb=='0,0,0': return m.group(0)
    v=RGB.get(rgb)
    if not v: raise SystemExit('unmapped rgba '+m.group(0))
    return f'color-mix(in srgb,var({v}) {round(a*100,1):g}%,transparent)'
# keep the category tone + dot definitions out of the generic hex map (rebuilt as tokens below)
s=re.sub(r'\.tone-food\{[^\n]*\n','',s,count=1)
s=re.sub(r'\.dot-school\{[^\n]*\n','',s,count=1)
s=re.sub(r'rgba\(\s*([0-9]+\s*,\s*[0-9]+\s*,\s*[0-9]+)\s*,\s*([0-9.]+)\s*\)',rgba,s)
for k,v in HEX.items(): s=re.sub(re.escape(k)+r'\b',v,s,flags=re.I)
left=sorted(set(re.findall(r'#[0-9a-fA-F]{3,6}\b',s)))
TONES=['food','books','toys','arts','school','clothes','beauty','sports','tech','gifts','weather','home','transport','misc']
DOTS={'school':'--tone-school','exam':'--bad','homework':'--warn','club':'--accent','competition':'--tone-food','social':'--good','holiday':'--tone-holiday','birthday':'--tone-gifts','decision':'--info','other':'--tone-misc'}
dark={'bg':'#0b0d12','panel':'#11151c','card':'#151a22','card2':'#191f29','surface':'#12171e','surface-modal':'#12171f','surface-raised':'#1a2029','surface-sunken':'#0f1319','input':'#0e1218','control':'#1b212c','control-hover':'#232b38','secondary':'#202633','toast':'#202733','track':'#282f3a','line':'#2a3240','line-strong':'#3c475a','text':'#f7f8fb','text-2':'#dce3ec','muted':'#aeb7c7','soft':'#7f8a9e','accent':'#d9a8ff','accent-hover':'#e2baff','accent-tint':'#25192d','accent2':'#9cefe1','on-accent':'#1b1326','good':'#9ce6ba','warn':'#ffd38b','bad':'#ff9aa7','info':'#a9c8ff','backdrop':'rgba(3,5,8,.72)','shadow':'0 16px 48px rgba(0,0,0,.24)','shadow-card':'none','glow':'rgba(217,168,255,.08)'}
dark_t={'food':'#f4b26b','books':'#9fb7ff','toys':'#ffb3d1','arts':'#d9a8ff','school':'#8fd3ff','clothes':'#a7e3c4','beauty':'#ffb0a8','sports':'#9ce6ba','tech':'#9cefe1','gifts':'#ffd38b','weather':'#a9c8ff','home':'#e4c9a0','transport':'#c3cad6','misc':'#aeb7c7','holiday':'#ffb3d1'}
light={'bg':'#f6f2ec','panel':'#fffdf9','card':'#ffffff','card2':'#fbf8f3','surface':'#ffffff','surface-modal':'#fffdf9','surface-raised':'#fbf8f3','surface-sunken':'#f3eee6','input':'#ffffff','control':'#f4efe7','control-hover':'#ece5da','secondary':'#efe9df','toast':'#1f2430','track':'#e9e2d6','line':'#e5ddd1','line-strong':'#cfc5b6','text':'#1d2230','text-2':'#3a4152','muted':'#5c6372','soft':'#7b8190','accent':'#7a4bd0','accent-hover':'#6a3cc0','accent-tint':'#efe6fb','accent2':'#0d8576','on-accent':'#ffffff','good':'#1d7f47','warn':'#9a5c00','bad':'#c0364a','info':'#2c64c4','backdrop':'rgba(30,24,16,.42)','shadow':'0 18px 50px rgba(60,40,10,.14)','shadow-card':'0 1px 2px rgba(60,40,10,.05),0 4px 14px rgba(60,40,10,.05)','glow':'rgba(122,75,208,.07)'}
light_t={'food':'#b9620e','books':'#3a5fc4','toys':'#bf3f78','arts':'#7f45c9','school':'#1b77ad','clothes':'#25805b','beauty':'#b8544a','sports':'#2b8550','tech':'#0f7f73','gifts':'#9a6b00','weather':'#3a66b8','home':'#8c6230','transport':'#5a6273','misc':'#6a707c','holiday':'#c2457a'}
life={**light,**{'bg':'#fff5e8','panel':'#fffaf2','card':'#ffffff','surface-sunken':'#fdf0df','control':'#fdeedd','control-hover':'#f9e2c8','line':'#f0dcc3','line-strong':'#e2c5a2','accent':'#c2336d','accent-hover':'#a92a5e','accent-tint':'#fde4ee','accent2':'#0f8a7a','glow':'rgba(214,69,127,.10)'}}
life_t={**light_t,**{'food':'#d0640a','toys':'#d6457f','arts':'#8b3fd9','school':'#0f7fc2','holiday':'#d6457f'}}
def block(sel,base,tones,scheme):
    v=';'.join(f'--{k}:{val}' for k,val in base.items())+';'+';'.join(f'--tone-{k}:{val}' for k,val in tones.items())
    return f'{sel}{{{v};color-scheme:{scheme}}}\n'
root=(':root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}\n'
 +block(':root,:root[data-theme="light"]',light,light_t,'light')
 +block(':root[data-theme="dark"]',dark,dark_t,'dark')
 +block(':root[data-theme="life"]',life,life_t,'light'))
tones=''.join(f'.tone-{t}{{--tone:var(--tone-{t})}}' for t in TONES)+'\n'+''.join(f'.dot-{k}{{background:var({v})}}' for k,v in DOTS.items())+'\n'
s=root+s.replace('radial-gradient(circle at 15% -10%,color-mix(in srgb,var(--accent) 8%,transparent),transparent 34rem)','radial-gradient(circle at 15% -10%,var(--glow),transparent 34rem)')+'\n/* theme tokens for categories & calendar dots */\n'+tones
s+='''/* v7.2 phase 4: elevation & polish shared by all themes */
.card,.panel,.item-card,.product-card,.subject-card,.person-card{box-shadow:var(--shadow-card)}
.subtab,.filter-chip{box-shadow:none}
.primary,.subtab.active kbd,.subtab-badge{color:var(--on-accent)}
.toast{color:#f7f8fb}
:root[data-theme="light"] .toast,:root[data-theme="life"] .toast{border-color:transparent}
.ico{width:18px;height:18px;flex:0 0 auto;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;vertical-align:-3px}
.side-link .ico{width:19px;height:19px;color:var(--muted)}.side-link.active .ico{color:var(--accent)}
.need-compact .ico{width:15px;height:15px;color:var(--muted)}
.top-actions .ico{width:16px;height:16px}
.theme-btn{display:inline-flex;align-items:center;gap:6px}
.theme-row{display:flex;gap:6px;flex-wrap:wrap}.theme-row button.active{border-color:var(--accent);color:var(--accent)}
@media(prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important;scroll-behavior:auto!important}}
:root.no-trans *,:root.no-trans *::before,:root.no-trans *::after{transition:none!important}
.timeline-entry>span{display:block}.timeline-entry>b{display:block}
.person-goals{display:block;font-size:11px;color:var(--accent2);margin-top:2px}
.person-card .inline-actions{margin-top:6px}
.plan-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px;margin-top:8px}
.plan-type{border:1px solid var(--line);border-radius:12px;padding:9px 10px;display:grid;gap:4px;background:var(--surface)}
.plan-type small{color:var(--muted);font-size:11px}
.identity-row{margin-bottom:8px}
.progress.dangerbar i{background:var(--bad)}


.memory-list p{margin:0}.memory-list small{display:block;color:var(--muted);font-size:11px;margin-bottom:2px}
.place-pick{display:grid;grid-template-columns:1fr 1fr auto;gap:6px}
.place-pick select:disabled{opacity:.55}
.zodiac-view{display:flex;align-items:baseline;gap:10px;min-height:42px;padding:9px 12px;border:1px solid var(--line);border-radius:10px;background:var(--surface-sunken)}
.zodiac-view span{font-weight:800}.zodiac-view small{color:var(--muted);font-size:11px}
.creator-note{margin:0 0 10px}
.choices h3 .small{margin-left:6px;vertical-align:middle}
.star{font-style:normal;color:var(--warn)}
.skill-line.lvl b{min-width:44px;text-align:right}
.trait-row{display:grid;gap:1px;padding:6px 0;border-bottom:1px solid var(--line)}.trait-row:last-of-type{border-bottom:0}.trait-row small{color:var(--muted);font-size:11px}
.mood-big{display:flex;align-items:baseline;gap:8px;margin:0 0 6px}.mood-big b{font-size:28px}.mood-big small{color:var(--muted)}
.study-menu summary small{font-weight:600;color:var(--muted);margin-left:4px}
.wx-now{display:flex;gap:10px;align-items:center;margin:4px 0 8px}.wx-icon{font-size:26px}.wx-now b{display:block;font-size:13px}.wx-now small{color:var(--muted);font-size:11px}
.wx-row{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-bottom:6px}
.wx-day{display:grid;justify-items:center;gap:1px;padding:5px 2px;border:1px solid var(--line);border-radius:9px;font-size:11px}.wx-day small{color:var(--soft);font-size:9px}.wx-day.severe{border-color:var(--bad);background:color-mix(in srgb,var(--bad) 8%,transparent)}
.ff-btn{display:inline-flex;align-items:center;gap:5px}
.ff-list{display:grid;gap:6px;margin-top:8px}.ff-opt{display:flex;justify-content:space-between;align-items:center;gap:10px;text-align:left;padding:10px 12px}.ff-opt small{color:var(--muted);font-weight:500}
.stayhome{margin-top:10px;padding:9px 11px;border:1px dashed var(--line-strong);border-radius:12px}.stayhome small{color:var(--muted);font-size:11px;display:block;margin-bottom:5px}
@media(max-width:760px){.ff-btn span{display:none}}
.day-pick{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:6px}.day-pick button{display:grid;gap:2px;text-align:left;padding:8px 10px}.day-pick small{color:var(--muted);font-size:10.5px;font-weight:500}
.time-chips{display:flex;flex-wrap:wrap;gap:5px;margin:6px 0}.time-chips .active{background:var(--accent);color:var(--on-accent);border-color:var(--accent)}.time-chips .shared{border-color:var(--good)}
.tier-tag{color:var(--accent);font-weight:800}
.chat-row{display:grid;grid-template-columns:1fr auto;gap:2px 8px;width:100%;text-align:left;padding:9px 11px;margin-bottom:5px}.chat-row small{grid-column:1;color:var(--muted);font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.chat-row em{grid-row:1/3;grid-column:2;align-self:center}
.chat-thread{display:flex;flex-direction:column;gap:6px;max-height:44vh;overflow:auto;padding:4px 2px;margin-bottom:8px}
.bubble{max-width:78%;padding:7px 11px;border-radius:14px;font-size:13px;line-height:1.35}.bubble small{display:block;font-size:9.5px;opacity:.65;margin-top:2px}
.bubble.them{align-self:flex-start;background:var(--surface-sunken);border:1px solid var(--line)}.bubble.me{align-self:flex-end;background:var(--accent);color:var(--on-accent)}
.chat-replies{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:8px}.chat-custom input{width:100%;margin-bottom:5px}.intent-row{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:3px}.prog-list{display:grid;gap:6px;margin:6px 0}.prog-opt{display:grid;gap:2px;text-align:left;padding:9px 11px}.prog-opt small{color:var(--muted);font-weight:500;font-size:11px}
.admirer-row{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--line)}.admirer-row span{display:flex;gap:5px}
.wrapped-tag{color:var(--accent);font-weight:700;font-size:11px}.person-cols{display:grid;grid-template-columns:1.5fr 1fr;gap:14px;margin-top:6px}@media(max-width:700px){.person-cols{grid-template-columns:1fr}}
.ph-list{max-height:300px;overflow:auto;padding-right:4px}.ph-row,.pm-row{padding:5px 0;border-bottom:1px solid var(--line);font-size:12.5px}.ph-row small,.pm-row small{display:block;color:var(--muted);font-size:10.5px}
.pm-list{max-height:300px;overflow:auto}.pm-row{font-size:12px}.person-family{margin:2px 0 6px;font-size:12px}
.love-line{display:grid;gap:4px;margin:6px 0}.love-line small{color:var(--muted);font-size:11px}
.love-ladder{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px}.ladder-step{font-size:10.5px;padding:3px 7px;border-radius:999px;border:1px solid var(--line);color:var(--muted)}.ladder-step.done{color:var(--text-2);border-color:var(--line-strong)}.ladder-step.on{background:var(--accent);color:var(--on-accent);border-color:var(--accent);font-weight:700}.biz-card{border:1px solid var(--line);border-radius:12px;padding:10px 12px;margin:8px 0;display:grid;gap:5px}.biz-card.closed{opacity:.75}.biz-head{display:flex;justify-content:space-between;align-items:center}.biz-card small{font-size:11.5px}.uni-list{display:grid;gap:4px;margin:8px 0}.uni-row{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--line)}.uni-row small{display:block;color:var(--muted);font-size:11px}.uni-row span:last-child{display:flex;gap:5px;align-items:center;flex-wrap:wrap;justify-content:flex-end}.invite-meta{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:4px 12px;margin:6px 0 8px;padding:8px 10px;border:1px solid var(--line);border-radius:10px;background:var(--surface-sunken)}.invite-meta div{display:grid;gap:1px}.invite-meta span{font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}.invite-meta b{font-size:12.5px}
.group-block{padding:6px 0;border-bottom:1px solid var(--line)}.group-block:last-child{border-bottom:0}.fac-list{display:flex;flex-wrap:wrap;gap:5px;margin:4px 0}.fac{font-size:11.5px;padding:3px 8px;border-radius:999px;border:1px solid var(--line)}.fac.yes{background:var(--accent-tint);border-color:var(--accent)}.fac.no{color:var(--soft);text-decoration:line-through;opacity:.7}.major-box{margin:8px 0;padding:8px 10px;border:1px dashed var(--line-strong);border-radius:10px}.major-box select{max-width:280px}.id-line{margin:2px 0 6px;font-size:12px;color:var(--text-2)}.house-rules-mini .row{font-size:12px}.house-rules-mini h3{margin-bottom:4px}
/* single authoritative person-modal stat tiles (Phase 3A; replaces 4 overlapping rules) */.modal-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin:12px 0}.modal-stats>div,.modal-stats>div.row,.modal-stats>div.row:last-child{box-sizing:border-box;min-width:0;border:1px solid var(--line);border-radius:9px;padding:8px;overflow:hidden}@media(max-width:600px){.modal-stats{grid-template-columns:repeat(2,minmax(0,1fr))}}
/* HOTFIX P1.3 — Profile (selected A2 layout). Uses existing tokens; only the pink badge and metric accents add theme-aware variables */:root{--rel-badge-bg:#fbe4ea;--rel-badge-fg:#a3244a;--m-close:#e0647f;--m-trust:var(--good);--m-fun:#e2a33c;--m-respect:var(--info);--m-rely:#8a7ccc;--m-conflict:var(--bad)}[data-theme="dark"]{--rel-badge-bg:#3b2029;--rel-badge-fg:#f2a9bc;--m-close:#e5809a;--m-fun:#e6b25a;--m-rely:#a497dc}.modal:has(.pf){width:min(920px,94vw);max-width:min(920px,94vw)}.modal:has(.pf) #choice-title{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}.pf{display:flex;flex-direction:column;gap:12px}.pf-head{padding:2px 44px 4px 4px}.pf-title{display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px}.pf-head .pf-title h2.pc-ident{font-size:29px;line-height:1.15;margin:0}.pf-head .pf-title .pc-age{font-size:21px}.pf-head .rel-badge.descriptor{color:var(--rel-badge-fg)}.rel-badge{display:inline-flex;align-items:center;padding:4px 13px;border-radius:999px;background:var(--rel-badge-bg);color:var(--rel-badge-fg);font-weight:700;font-size:14px;line-height:1.2;white-space:nowrap}.pf-line{margin:5px 0 0;font-size:15px;overflow-wrap:anywhere}.pf-parents{display:flex;align-items:center;gap:8px}.pf-sec{border:1px solid var(--line);border-radius:14px;background:var(--surface-sunken);padding:12px 12px 12px}.pf-h{margin:0 2px 10px;font-size:12.5px;letter-spacing:.09em;text-transform:uppercase;color:var(--text-2);font-weight:700}.pf-grid{display:grid;gap:10px}.pf-3{grid-template-columns:repeat(3,minmax(0,1fr))}.pf-2{grid-template-columns:repeat(2,minmax(0,1fr))}.pf-2.pf-odd>:last-child{grid-column:1/-1}.pf-tile{display:flex;align-items:center;gap:12px;min-width:0;padding:10px 14px;border:1px solid var(--line);border-radius:12px;background:var(--surface-raised)}.pf-tile .ico,.pf-strip>.ico,.pf-metric>.ico{width:22px;height:22px;color:var(--text-2);flex:0 0 auto}.pf-tile>div{min-width:0}.pf-tile small,.pf-metric small{display:block;font-size:12.5px;color:var(--muted);line-height:1.3}.pf-tile b{display:block;font-size:15px;line-height:1.3;overflow-wrap:anywhere}.pf-wide{margin-top:10px}.pf-note{display:block;font-size:12px;margin-top:2px}.pf-strip{display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;padding:12px 14px;border:1px solid var(--line);border-radius:14px;background:var(--surface-raised)}.pf-strip-label{font-size:12.5px;letter-spacing:.09em;text-transform:uppercase;font-weight:700;color:var(--text-2)}.pf-strip-val{flex:1 1 220px;min-width:0;font-weight:600;overflow-wrap:anywhere}.pf-ask{display:inline-flex;align-items:center;gap:8px;margin-left:auto;border-radius:10px}.pf-ask .ico{width:17px;height:17px}.pf-metric{display:flex;align-items:center;gap:12px;min-width:0;padding:10px 14px;border:1px solid var(--line);border-radius:12px;background:var(--surface-raised)}.pf-metric-body{flex:1;min-width:0}.pf-metric-row{display:flex;align-items:center;gap:10px}.pf-metric-row b{font-size:17px;min-width:2ch}.pf-bar{flex:1;height:7px;border-radius:99px;background:var(--line);overflow:hidden}.pf-bar em{display:block;height:100%;border-radius:99px;background:var(--m-c,var(--accent))}.m-close{--m-c:var(--m-close)}.m-close>.ico{color:var(--m-close)}.m-trust{--m-c:var(--m-trust)}.m-trust>.ico{color:var(--m-trust)}.m-fun{--m-c:var(--m-fun)}.m-fun>.ico{color:var(--m-fun)}.m-respect{--m-c:var(--m-respect)}.m-respect>.ico{color:var(--m-respect)}.m-rely{--m-c:var(--m-rely)}.m-rely>.ico{color:var(--m-rely)}.m-conflict{--m-c:var(--m-conflict)}.m-conflict>.ico{color:var(--m-conflict)}@media(max-width:900px){.pf-3{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:600px){.pf-3,.pf-2{grid-template-columns:1fr}.pf-2.pf-odd>:last-child{grid-column:auto}.pf-head .pf-title h2.pc-ident{font-size:22px}.pf-ask{margin-left:0}}
/* HOTFIX P1.2 — People hub filters + compact family overview */.people-filters{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 12px}.people-filters em{font-style:normal;opacity:.75;margin-left:2px}.people-hub .card{box-shadow:none;border:1px solid var(--line);margin:10px 0}.family-overview{margin:4px 0 12px}.fam-dyn{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin:6px 0 10px}.fam-dyn>div{border:1px solid var(--line);border-radius:10px;padding:6px 8px;display:flex;flex-direction:column;gap:2px}.fam-dyn small{color:var(--muted);font-size:11.5px}.fam-events{margin-top:10px}@media(max-width:760px){.fam-dyn{grid-template-columns:repeat(2,minmax(0,1fr))}}
/* HOTFIX P1.1 — People cards get their own grid; cards align to the top so taller neighbours never stretch them */.people-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px;align-items:start;margin:12px 0}.people-grid>.person-card{height:auto;align-self:start}.pc-ident{margin:0;font-size:14.5px;font-weight:700;line-height:1.3}.pc-name{text-transform:none;letter-spacing:normal}.pc-age{font-weight:500;color:var(--muted)}.pc-sep{color:var(--line-strong);font-weight:400}.rel-tag{color:var(--accent);font-weight:700}.profile-head h2.pc-ident{font-size:19px}.profile-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:2px 20px;margin:8px 0 12px}.profile-grid .span2{grid-column:1/-1}.profile-grid .span2 h4{margin:4px 0 2px}.profile-grid .span2 p{margin:0 0 6px}.metrics-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}@media(max-width:640px){.profile-grid{grid-template-columns:1fr}.metrics-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
.person-card.compact{padding:12px 14px;display:grid;gap:3px}.pc-head{display:flex;justify-content:space-between;align-items:center}.pc-head h3{margin:0;font-size:14px}.pc-mood{font-size:18px}.pc-line{margin:0;font-size:12.5px}.profile .relationship-bars{margin:8px 0}.relationship-bars label{border:1px solid var(--line);border-radius:10px;padding:6px 8px}.relationship-bars label.conflict{border-color:var(--line)}
.profile-head{margin-bottom:10px}.profile-head h2{margin:0;font-size:20px}.profile-head .descriptor{margin:2px 0;font-weight:700;color:var(--accent)}.avail{font-size:11.5px;color:var(--muted)}
.on-mind{margin:6px 0 10px;padding:8px 10px;border:1px dashed var(--line-strong);border-radius:10px;font-size:12.5px}.on-mind .inline-actions{margin-top:6px}
.fam-row{display:flex;justify-content:space-between;gap:8px;padding:4px 0;border-bottom:1px solid var(--line)}.fam-row small{color:var(--muted)}.linklike{background:none;border:0;padding:0;color:var(--text);font-weight:600;cursor:pointer;text-align:left}.linklike:hover{text-decoration:underline}
.ff-btn.ff-paused{border-color:var(--accent);box-shadow:0 0 0 2px var(--accent-tint)}.ff-cont{font-weight:700;margin-left:4px}.ff-resume{padding:8px 10px;border:1px solid var(--accent);border-radius:10px;margin-bottom:8px}.routine-box{margin:6px 0 10px}.routine-box summary{cursor:pointer;font-size:12.5px;color:var(--text-2)}.routine-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:6px;margin-top:6px}.routine-grid label{display:grid;gap:2px;font-size:11px}.summary-lead{font-weight:600}
'''
open(p,'w').write(s)
print('remaining literal hex outside tokens:',[h for h in left])
