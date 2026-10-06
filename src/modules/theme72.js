// ---------- v7.2 PHASE 4: themes & icons ----------
// Light (default) / Dark / Auto (follows the OS) / Life (warm, colorful). Stored in the UI prefs, not in the save.
const THEMES=['light','dark','auto','life'],THEME_LABEL={light:'Light',dark:'Dark',auto:'Auto',life:'Life'};
const darkQuery=window.matchMedia?matchMedia('(prefers-color-scheme: dark)'):null;
function resolvedTheme(t=UI.theme){if(t==='auto')return darkQuery&&darkQuery.matches?'dark':'light';return ['light','dark','life'].includes(t)?t:'light'}
function applyTheme(){if(!THEMES.includes(UI.theme))UI.theme='light';const root=document.documentElement;root.classList.add('no-trans');requestAnimationFrame(()=>requestAnimationFrame(()=>root.classList.remove('no-trans')));document.documentElement.setAttribute('data-theme',resolvedTheme());document.documentElement.setAttribute('data-theme-pref',UI.theme);const b=$('theme-btn');if(b){const s=b.querySelector('span');if(s)s.textContent=THEME_LABEL[UI.theme];b.setAttribute('aria-label',`Appearance: ${THEME_LABEL[UI.theme]}`)}document.querySelectorAll('[data-theme-set]').forEach(x=>{x.classList.toggle('active',x.dataset.themeSet===UI.theme);x.setAttribute('aria-pressed',x.dataset.themeSet===UI.theme)})}
function setTheme(t){UI.theme=THEMES.includes(t)?t:'light';saveUI();applyTheme()}
function cycleTheme(){setTheme(THEMES[(THEMES.indexOf(UI.theme)+1)%THEMES.length]);toast(`Appearance: ${THEME_LABEL[UI.theme]}${UI.theme==='auto'?` (${resolvedTheme()})`:''}`)}
if(darkQuery){const f=()=>{if(UI.theme==='auto')applyTheme()};darkQuery.addEventListener?darkQuery.addEventListener('change',f):darkQuery.addListener(f)}
const NAV_ICON={home:'home',places:'compass',people:'users',development:'sprout',school:'book',business:'wallet',phone:'phone',family:'family',career:'briefcase',health:'health',calendar:'calendar',world:'globe'};
const NEED_ICON={hunger:'utensils',hygiene:'droplet',toilet:'bath',fun:'smile',social:'users',comfort:'sofa',sleep:'moon'};
function icon(n){return `<svg class="ico" aria-hidden="true"><use href="#ico-${n}"/></svg>`}
function needIcon(k){return icon(NEED_ICON[k]||'dot')}
document.addEventListener('click',e=>{const b=e.target.closest('#theme-btn,[data-theme-set]');if(!b)return;if(b.id==='theme-btn')cycleTheme();else setTheme(b.dataset.themeSet)});
if(!localStorage.getItem(UI_KEY)||UI.theme==null)UI.theme=UI.theme||'light';
applyTheme();
