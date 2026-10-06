
// ---------- v7.2 Inventory & store UI ----------
let shopCat='All',invFilter='All';
const CAT_TONE={'Food & drinks':'food','Books':'books','Toys & games':'toys','Arts & crafts':'arts','School supplies':'school','Clothes':'clothes','Beauty & care':'beauty','Sports':'sports','Electronics':'tech','Gifts':'gifts','Weather & outdoors':'weather','Furniture':'home','Transport':'transport'};
function itemIcon(key){return catalogItem(key)?.icon||'📦'}
function progressLabel(it){const p=Math.round(it.progress||0),t=catalogItem(it.key)?.progressType;if(p>=100)return it.completions>1?`Finished ×${it.completions}`:'Finished';if(p===0&&!it.completions)return t==='reading'?'Unread':'Not started';return `${it.rereading?(t==='reading'?'Rereading':'Replaying')+' • ':''}${p}%`}
function itemStatus(it){
 const d=catalogItem(it.key)||{},lt=it.lifecycleType;
 if(lt==='consumable')return it.opened?{label:`${Math.round(it.remaining)}% remaining`,meter:it.remaining}:{label:it.quantity>1?`${it.quantity} unopened`:'Unopened • 100%',meter:100};
 if(lt==='perishable')return {label:`${freshnessLabel(it)} • ${it.opened?Math.round(it.remaining)+'% remaining':it.quantity>1?it.quantity+' items':'whole'}${freshDaysLeft(it)>=0?` • ${freshDaysLeft(it)}d left`:''}`,meter:it.remaining,tone:isSpoiled(it)?'bad':freshDaysLeft(it)<0?'warn':''};
 if(lt==='finite'){const left=Math.max(0,Math.round((it.remaining/100)*(d.units||100)));return {label:`${Math.round(it.remaining)}% remaining${d.unitLabel?` • ≈${left} ${d.unitLabel} left`:''}${it.quantity>1?` • +${it.quantity-1} unopened`:''}`,meter:it.remaining,tone:it.remaining<20?'warn':''}}
 if(lt==='progress')return {label:progressLabel(it)+(it.quantity>1?` • ×${it.quantity}`:''),meter:it.progress||0};
 if(lt==='gift')return {label:it.quantity>1?`Ready to give • ×${it.quantity}`:'Ready to give'};
 if(lt==='container')return {label:`${conditionLabel(it.condition)} • Condition ${Math.round(it.condition)}% • Water ${Math.round(it.contents)} / ${it.capacity} ml`,meter:100*it.contents/it.capacity};
 const parts=[`${conditionLabel(it.condition)} • Condition ${Math.round(it.condition)}%`];if(it.battery!=null)parts.push(`Battery ${Math.round(it.battery)}%`);
 return {label:parts.join(' • '),meter:it.condition,tone:it.condition<20?'bad':it.condition<45?'warn':''}
}
function effectChips(keyOrD){const d=typeof keyOrD==='string'?catalogItem(keyOrD):keyOrD;return (d?.effectLabels||[]).slice(0,4).map(e=>`<span class="fx-chip">${esc(e)}</span>`).join('')}
function productTypeLabel(d){const lt=lifecycleOf(d);return lt==='consumable'?(d.drink?'1 drink':'1 serving • eat in portions'):lt==='perishable'?`Fresh for ${d.freshnessDays} days`:lt==='finite'?`${d.units} ${d.unitLabel}`:lt==='wearable'?`Wearable • ${SLOT_LABEL[d.slot]||'clothing'}`:lt==='device'?`Device${d.battery?' • battery':''}`:lt==='container'?`${d.capacity} ml • refillable`:lt==='progress'?({reading:'Read at your own pace',story:'Long story game',exercises:'Practice workbook',pieces:'500 pieces'})[d.progressType]||'Progress':lt==='gift'?'Give to someone':'Reusable'}
function itemCardActions(it){
 const d=catalogItem(it.key)||{},lt=it.lifecycleType,b=[],more=[];const btn=(attrs,label,cls='small')=>`<button class="${cls}" ${attrs}>${esc(label)}</button>`;
 if(it.stored)b.push(btn(`data-item-action="store" data-item-id="${it.id}"`,'Take out'));
 else{
  if(['consumable','perishable'].includes(lt)&&!d.gift){b.push(btn(`data-item-portion="little" data-item-id="${it.id}"`,d.drink?'Sip':'Eat a little'),btn(`data-item-portion="half" data-item-id="${it.id}"`,d.drink?'Drink half':'Eat half'),btn(`data-item-portion="all" data-item-id="${it.id}"`,d.drink?'Finish':'Eat all'))}
  if(lt==='container'){b.push(btn(`data-container="little" data-item-id="${it.id}"`,'Drink a little'),btn(`data-container="half" data-item-id="${it.id}"`,'Drink half'),btn(`data-container="all" data-item-id="${it.id}"`,'Finish water'),btn(`data-item-action="refill" data-item-id="${it.id}"`,'Refill','small ghost'));more.push(btn(`data-item-action="clean" data-item-id="${it.id}"`,'Clean','small ghost'))}
  for(const u of itemUses(it).slice(0,4))b.push(btn(`data-item-use="${u.id}" data-item-id="${it.id}"`,u.id==='read'&&it.progress>=100?'Reread':u.label));
  if(d.phone){if(it.id===S.phone.activeItemId)b.push(btn(`data-tab-jump="phone"`,'Open phone'));else b.push(btn(`data-item-action="activatePhone" data-item-id="${it.id}"`,'Switch to this phone'))}
  if(d.slot)b.push(btn(`data-item-action="wear" data-item-id="${it.id}"`,it.equipped?'Take off':'Wear'));
  if(it.battery!=null&&it.battery<98)more.push(btn(`data-item-action="charge" data-item-id="${it.id}"`,'Charge','small ghost'));
  if(hasCondition(lt)&&it.condition<90&&(d.repairable||lt==='wearable'))(it.condition<45?b:more).push(btn(`data-item-action="repair" data-item-id="${it.id}"`,it.condition<=0?'Repair':'Repair','small ghost'));
  more.push(btn(`data-item-action="gift" data-item-id="${it.id}"`,'Gift','small ghost'));if(!['finite','container','device'].includes(lt)||lt==='device'&&false)more.push(btn(`data-wrap="${it.id}" data-paper="${findUsable('heartWrap')?'heart':'gift'}"`,it.wrapped?'Unwrap':'🎀 Wrap as gift','small ghost'));
  more.push(btn(`data-item-action="store" data-item-id="${it.id}"`,'Store','small ghost'));
 }
 more.push(btn(`data-item-action="sell" data-item-id="${it.id}"`,hasCondition(lt)&&it.condition<=0?'Sell for parts':`Sell (~${money(itemValue(it)/(it.quantity||1))})`,'small ghost'),btn(`data-item-action="discard" data-item-id="${it.id}"`,'Discard','small ghost'));
 return `<div class="item-actions">${b.join('')}<details class="more-menu"><summary>More</summary><div>${more.join('')}</div></details></div>`
}
function inventoryCard(it){
 const d=catalogItem(it.key)||{},st=itemStatus(it),tone=CAT_TONE[it.category]||'misc';
 const fx=['consumable','perishable','gift'].includes(it.lifecycleType)?'':effectChips(d);
 return `<article class="item-card tone-${tone} ${it.stored?'is-stored':''} ${it.equipped?'is-equipped':''}"><div class="item-icon" aria-hidden="true">${itemIcon(it.key)}</div><div class="item-body"><div class="item-title"><b>${esc(it.name)}${it.quantity>1&&!['finite','progress'].includes(it.lifecycleType)?` ×${it.quantity}`:''}</b>${it.equipped?'<span class="tag ok">Wearing</span>':''}${d.phone&&it.id===S.phone.activeItemId?'<span class="tag ok">In use</span>':d.phone?'<span class="tag">Spare</span>':''}${it.stored?'<span class="tag">Stored</span>':''}</div><small class="item-sub">${esc(it.category)} · ${esc(LIFECYCLE_LABEL[it.lifecycleType]||'Item')}${it.slot?` · ${SLOT_LABEL[it.slot]}`:''}</small><div class="item-status ${st.tone||''}">${esc(st.label)}</div>${st.meter!=null?`<div class="item-meter ${st.tone||''}"><i style="width:${clamp(st.meter)}%"></i></div>`:''}${fx?`<div class="fx-row">${fx}</div>`:''}${it.origin?`<p class="item-origin">${esc(it.origin)}</p>`:''}<small class="item-sub">Since ${formatDate(it.acquiredDate)}${it.timesUsed?` · used ${it.timesUsed}×`:''}</small>${itemCardActions(it)}</div></article>`
}
function inventoryHtml(){
 const items=S.inventoryItems;if(!items.length)return '<p class="muted-text">You do not own any personal items yet.</p>';
 const groups=['All','Wearing',...new Set(items.map(i=>i.category))];if(!groups.includes(invFilter))invFilter='All';
 const shown=items.filter(i=>invFilter==='All'||(invFilter==='Wearing'?i.equipped:i.category===invFilter)).sort((a,b)=>(a.stored-b.stored)||a.category.localeCompare(b.category)||a.name.localeCompare(b.name));
 const worn=Object.keys(SLOT_LABEL).map(s=>{const e=equippedIn(s);return e?`<span class="slot-chip"><em>${SLOT_LABEL[s]}</em> ${itemIcon(e.key)} ${esc(e.name)}</span>`:''}).filter(Boolean).join('');
 return `${worn?`<div class="slot-row">${worn}</div>`:''}<div class="filter-row">${groups.map(g=>`<button class="filter-chip ${invFilter===g?'active':''}" data-inv-filter="${esc(g)}">${esc(g)}</button>`).join('')}</div><div class="item-grid">${shown.map(inventoryCard).join('')||'<p class="muted-text">Nothing here.</p>'}</div>`
}
function storeHtml(){
 const seasonOpen=d=>!d.seasonal||unitCount(Object.keys(D.catalog).find(k=>D.catalog[k]===d))>0||upcomingHolidays(8).some(x=>d.seasonal.includes(x.h.id)&&daysBetween(currentDate(),x.dateISO)<=21),visible=Object.entries(D.catalog).filter(([,d])=>!d.shopHidden&&S.age>=Math.max(0,d.minAge-3)&&seasonOpen(d)),cats=['All',...new Set(visible.map(([,d])=>d.category))];if(!cats.includes(shopCat))shopCat='All';
 const list=visible.filter(([,d])=>shopCat==='All'||d.category===shopCat);
 return `<div class="filter-row">${cats.map(c=>`<button class="filter-chip ${shopCat===c?'active':''}" data-shop-cat="${esc(c)}">${esc(c)}</button>`).join('')}</div><div class="product-grid">${list.map(([key,d])=>{
  const owned=unitCount(key),relevant=S.age>=d.minAge,tone=CAT_TONE[d.category]||'misc',qty=d.stackable&&d.price<=20;
  const perm=S.age<18&&d.price>=d.permissionPrice?'<small class="perm-note">Needs caregiver OK</small>':'';
  return `<article class="product-card tone-${tone} ${relevant?'':'is-later'}"><div class="product-art" aria-hidden="true">${d.icon||'📦'}</div><div class="product-body"><div class="product-head"><b>${esc(d.name)}</b><strong>${money(d.price)}</strong></div><p>${esc(d.description)}</p><div class="fx-row">${effectChips(d)}</div>${d.seasonal?'<small class="perm-note">Seasonal • optional</small>':''}<small class="product-type">${esc(productTypeLabel(d))}${owned?` · <b>Owned ×${owned}</b>`:''}</small>${!relevant?`<small class="perm-note">More relevant around age ${d.minAge}</small>`:d.phone&&S.age<D.ageRules.phone?'<small class="perm-note">Can own now • independent use later</small>':perm}${relevant?`<div class="product-actions">${qty?`<select class="qty-select" data-qty-for="${key}" aria-label="Quantity">${[1,2,3,4,5].map(n=>`<option>${n}</option>`).join('')}</select>`:''}<button class="small primary" data-shop-own="${key}">${S.age<18?'Buy with my money':'Buy'}</button>${S.age<18?`<button class="small" data-shop-parent="${key}">Ask caregiver</button><button class="small ghost" data-shop-birthday="${key}">Birthday wish</button>${S.traditions.christmas?`<button class="small ghost" data-shop-christmas="${key}">Christmas wish</button>`:''}`:''}</div>`:''}</div></article>`}).join('')}</div>`
}
function businessPanel(){
 const openReq=S.giftRequests.filter(r=>!r.resolved),pending=pendingOpen().filter(p=>/purchase/i.test(p.type)||p.type==='conditionalPurchase');
 const chores=S.age>=5?D.chores.filter(c=>S.age>=c.minAge).map(c=>`<button class="action compact" data-chore="${c.id}"><strong>${esc(c.name)}</strong><small>${c.minutes} min • allowance may be ${money(c.pay[0])}–${money(c.pay[1])}</small></button>`).join(''):'';
 const sellable=S.inventoryItems.filter(i=>!i.stored&&i.id!==S.phone.activeItemId),st=S.stall;
 return `<div class="dashboard"><section class="card"><h3>Money</h3>${statRow('Cash',money(S.money))}${statRow('Savings',money(S.finance.savings))}${S.age<13?statRow('Parent-managed savings',money(S.finance.parentSavings)):''}${statRow('Things you own',`${S.inventoryItems.reduce((a,i)=>a+(i.quantity||1),0)} items • worth ~${money(S.inventoryItems.reduce((a,i)=>a+itemValue(i),0))}`)}${statRow('Responsibility',Math.round(S.family.responsibility||0)+'%')}<div class="inline-actions"><button data-act="saveMoney" data-arg="25">Save $25</button>${S.age>=18?'<button data-act="invest">Invest $50</button>':''}</div></section><section class="card"><h3>Pending requests</h3>${openReq.length?openReq.slice(0,5).map(r=>`<div class="row"><span><b>${esc(r.item||catalogItem(r.itemKey)?.name)}</b><br><small>${esc(r.status||'Waiting')} • ${esc(r.occasion)}</small></span><button class="small ghost" data-gift-askagain="${r.id}">Ask again</button></div>`).join(''):'<p class="muted-text">No birthday/holiday wishes pending.</p>'}${pending.map(p=>`<div class="row"><span><b>${esc(p.title)}</b><br><small>${esc(p.detail||p.status)}</small></span>${statusTag(p.status)}</div>`).join('')}</section><section class="card wide"><div class="section-heading"><div><h3>Your things</h3><p class="muted-text">Each item shows what matters for it: portions left, supplies left, condition, battery, or progress.</p></div></div>${inventoryHtml()}</section><section class="card wide"><div class="section-heading"><div><h3>Shop</h3><p class="muted-text">${S.age<18?'Your own money still needs a caregiver OK for bigger purchases. You can also ask them, or save a wish for a birthday or holiday.':'Everything here has a real use in daily life.'}</p></div></div>${storeHtml()}</section>${S.age>=5?`<section class="card wide"><h3>Chores & allowance</h3><div class="action-grid">${chores}</div></section>`:''}<section class="card wide"><h3>Small business</h3>${businessesHtml()}</section></div>`
}
function yourThingsHtml(){
 const seen=new Set(),btns=[];
 for(const it of S.inventoryItems){if(it.stored||seen.has(it.key))continue;const d=catalogItem(it.key);if(!d)continue;
  if(hasCondition(it.lifecycleType)&&it.condition<=0)continue;
  if(['consumable','perishable'].includes(it.lifecycleType)&&!d.gift){seen.add(it.key);btns.push(`<button class="action" data-item-portion="all" data-item-id="${it.id}"><strong>${d.icon} ${d.drink?'Drink':'Eat'} ${esc(it.name.toLowerCase())}</strong><small>${esc(itemStatus(it).label)}</small></button>`);continue}
  if(it.lifecycleType==='container'){seen.add(it.key);btns.push(`<button class="action" data-container="little" data-item-id="${it.id}"><strong>${d.icon} Drink from bottle</strong><small>${Math.round(it.contents)} / ${it.capacity} ml</small></button>`);continue}
  const u=itemUses(it)[0];if(!u)continue;seen.add(it.key);btns.push(`<button class="action" data-item-use="${u.id}" data-item-id="${it.id}"><strong>${d.icon} ${esc(u.id==='read'&&it.progress>=100?'Reread':u.label)} • ${esc(it.name.toLowerCase())}</strong><small>${esc(itemStatus(it).label)}</small></button>`)}
 return btns.length?`<div class="action-section"><h3>Use your things</h3><p class="muted-text">Owned items open up better versions of everyday activities. Repeating the same thing in one day gives smaller gains.</p><div class="action-grid">${btns.slice(0,10).join('')}</div></div>`:''
}
function handleInventoryClick(b){
 const d=b.dataset;
 if(d.invFilter){invFilter=d.invFilter;render();return true}
 if(d.shopCat){shopCat=d.shopCat;render();return true}
 if(d.itemUse){performItemUse(d.itemId,d.itemUse);save();render();return true}
 if(d.itemPortion){eatPortion(d.itemId,d.itemPortion);save();render();return true}
 if(d.container){drinkFromContainer(d.itemId,d.container);save();render();return true}
 if(d.shopOwn){const sel=document.querySelector(`[data-qty-for="${d.shopOwn}"]`);buyWithOwnMoney(d.shopOwn,sel?Number(sel.value):1);save();render();return true}
 return false
}
