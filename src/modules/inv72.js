
// =====================================================================
// v7.2 PHASE 2 — ITEM LIFECYCLES, INVENTORY & STORE
// Every catalog item declares its lifecycle. Behavior comes from the
// catalog (uses/effects/consume/wear/progress), not from a giant switch.
// =====================================================================
const LIFECYCLE_LABEL={consumable:'Single-use',finite:'Limited supply',durable:'Reusable',wearable:'Wearable',device:'Device',container:'Container',progress:'Progress',perishable:'Perishable',gift:'Gift'};
const SLOT_LABEL={top:'Top',bottom:'Bottom',outerwear:'Outerwear',shoes:'Shoes',eyewear:'Eyewear',head:'Head',accessory:'Accessory',bag:'Bag'};
const SKILL_LABEL={reading:'Reading',art:'Art',creativity:'Creativity',fitness:'Fitness',sports:'Sports',cycling:'Cycling',music:'Music',programming:'Programming',writing:'Writing',knowledge:'Knowledge',imagination:'Imagination',gaming:'Gaming',style:'Style'};
function lifecycleOf(d){return d?.lifecycleType||(d?.wearable?'wearable':d?.durable===false?'finite':'durable')}
function hasCondition(lt){return ['durable','wearable','device','container'].includes(lt)}
function conditionLabel(c){c=Math.round(c);return c>=90?'Excellent':c>=70?'Good':c>=45?'Worn':c>=20?'Poor':c>=1?'Nearly broken':'Broken'}
function freshDaysLeft(it){return it.freshUntil?daysBetween(currentDate(),it.freshUntil):99}
function freshnessLabel(it){const d=freshDaysLeft(it);return d>=2?'Fresh':d>=0?'Eat soon':d>=-2?'Stale':'Spoiled'}
function isSpoiled(it){return it.lifecycleType==='perishable'&&freshDaysLeft(it)<-2}
function unitCount(key){return S.inventoryItems.filter(i=>i.key===key).reduce((a,i)=>a+(i.quantity||1),0)}
function findUsable(key){return S.inventoryItems.find(i=>i.key===key&&!i.stored&&(!hasCondition(i.lifecycleType)||i.condition>0)&&(i.lifecycleType!=='finite'||i.remaining>0))||null}
function ownsItem(key){if(D.catalog[key]?.phone)return !!S.phone.owned;return unitCount(key)>0}
function equippedIn(slot){return S.inventoryItems.find(i=>i.equipped&&i.slot===slot&&i.condition>0)||null}
function hasWeatherGear(kind){
 if(kind==='rain')return !!findUsable('umbrella')||S.inventoryItems.some(i=>i.equipped&&catalogItem(i.key)?.weather==='rain'&&i.condition>0);
 return S.inventoryItems.some(i=>i.equipped&&i.condition>0&&catalogItem(i.key)?.weather===kind)
}
function ensureSkills(){S.skills=Object.assign({art:0,creativity:0,fitness:0,sports:0,cycling:0,music:0,programming:0,writing:0,knowledge:0,imagination:0,gaming:0,style:0},S.skills||{});if(!S.practiceLog||S.practiceLog.date!==currentDate())S.practiceLog={date:currentDate(),counts:{}};return S.skills}
// Diminishing returns: repeated practice of one skill on the same day, and higher levels, both shrink gains.
function originText(source,d){
 const age=S.age,lt=lifecycleOf(d);if(['consumable','perishable'].includes(lt)&&!d.gift)return null;
 if(d.phone&&!S.inventoryItems.some(x=>catalogItem(x.key)?.phone))return `Your first phone, at age ${age}.`;
 if(/Christmas/i.test(source))return `A Christmas gift when you were ${age}.`;if(/Birthday/i.test(source))return `A present for your ${ordinal(age)} birthday.`;
 if(/^from /i.test(source))return `Given to you by ${source.slice(5)} at age ${age}.`;
 if(/caregiver/i.test(source))return `${primaryCaregiver()} bought this for you at age ${age}.`;
 if(/chores/i.test(source))return 'Earned through chores.';if(/grade/i.test(source))return 'A reward for your grades.';
 if(source==='own money'&&d.price>=50)return `Bought with your own savings at age ${age}.`;return null
}
function makeItemInstance(key,source='purchase',cond=null){
 const d=catalogItem(key),lt=lifecycleOf(d);
 const it={id:uid('item'),key,name:d.name,category:d.category,lifecycleType:lt,quantity:1,opened:false,remaining:100,condition:hasCondition(lt)?clamp(cond??d.condition??100):100,originalPrice:d.price,acquiredDate:currentDate(),acquiredAge:S.age,source,sentimental:/gift|Christmas|Birthday|^from /i.test(source)?35:8,equipped:false,stored:false,timesUsed:0,useLog:{date:null,count:0}};
 if(lt==='container'){it.capacity=d.capacity||500;it.contents=it.capacity}
 if(lt==='progress'){it.progress=0;it.completions=0}
 if(lt==='perishable')it.freshUntil=addDays(currentDate(),d.freshnessDays||3);
 if(d.battery)it.battery=100;if(d.slot)it.slot=d.slot;
 it.origin=originText(source,d);if(it.origin&&/first phone/.test(it.origin))it.sentimental=40;
 return it
}
function addItem(key,source='purchase',condition=null,{quantity=1}={}){
 const d=catalogItem(key);if(!d)return null;quantity=Math.max(1,Math.round(quantity)||1);let it=null;
 if(d.stackable&&condition==null){const fresh=lifecycleOf(d)==='perishable'?addDays(currentDate(),d.freshnessDays||3):null;it=S.inventoryItems.find(x=>x.key===key&&!x.opened&&!x.stored&&(!fresh||x.freshUntil===fresh))}
 if(it)it.quantity=(it.quantity||1)+quantity;
 else{it=makeItemInstance(key,source,condition);if(d.stackable)it.quantity=quantity;S.inventoryItems.push(it);if(!d.stackable)for(let i=1;i<quantity;i++)S.inventoryItems.push(makeItemInstance(key,source,condition))}
 if(d.phone)onPhoneAcquired(it);
 syncLegacyInventory();S.purchaseHistory.unshift({dateISO:currentDate(),minute:currentMinute(),key,source,quantity,price:source==='own money'?d.price*quantity:0});if(S.purchaseHistory.length>200)S.purchaseHistory.length=200;
 return it
}
function openOne(it){if((it.quantity||1)>1&&!it.opened){it.quantity--;const n=Object.assign(JSON.parse(JSON.stringify(it)),{id:uid('item'),quantity:1,opened:true});S.inventoryItems.push(n);return n}it.opened=true;return it}
function removeItem(id,one=false){
 const i=S.inventoryItems.findIndex(x=>x.id===id);if(i<0)return null;const it=S.inventoryItems[i];
 if(one&&(it.quantity||1)>1){it.quantity--;syncLegacyInventory();return Object.assign({},it,{quantity:1})}
 S.inventoryItems.splice(i,1);if(catalogItem(it.key)?.phone){if(S.phone.activeItemId===it.id)S.phone.activeItemId=null;syncPhoneState()}syncLegacyInventory();return it
}
function syncLegacyInventory(){S.possessions=[...new Set(S.inventoryItems.filter(i=>!catalogItem(i.key)?.phone).map(i=>i.key))];S.inventory=S.inventory||{};for(const k of ['umbrella','raincoat','sweater','sunglasses','waterBottle'])S.inventory[k]=unitCount(k)}
function itemValue(it){
 const d=catalogItem(it.key);if(!d)return 0;const lt=it.lifecycleType,q=it.quantity||1;
 let v=['consumable','perishable','gift'].includes(lt)?d.price*.45*(it.remaining/100):lt==='finite'?d.price*.55*(it.remaining/100):lt==='progress'?d.price*.5:d.price*.65*Math.pow(clamp(it.condition)/100,1.3);
 if(lt==='device')v*=Math.max(.25,1-daysBetween(it.acquiredDate,currentDate())/365*.18);
 if(hasCondition(lt)&&it.condition<=0)v=d.price*.06;
 return Math.max(0,Math.round(v*q))
}
// ---------- Canonical phone state: the inventory item is the source of truth ----------
function phoneItems(){return S.inventoryItems.filter(i=>catalogItem(i.key)?.phone)}
function activePhoneItem(){const all=phoneItems();let p=all.find(i=>i.id===S.phone.activeItemId);if(!p){p=all.filter(i=>!i.stored).sort((a,b)=>b.condition-a.condition)[0]||null;S.phone.activeItemId=p?.id||null}return p}
function syncPhoneState(){const p=activePhoneItem();S.phone.owned=!!p&&p.condition>0;S.phone.model=p?p.name:null;S.phone.price=p?p.originalPrice:600;S.phone.condition=p?Math.round(p.condition):100;S.phone.battery=p?Math.round(p.battery??100):100;if(p)p.isSpare=false;for(const o of phoneItems())if(o!==p)o.isSpare=true;ensurePhoneApps()}
function setItemCondition(it,value){if(!it)return;const before=conditionLabel(it.condition);it.condition=clamp(value);if(it.condition<=0&&it.equipped)it.equipped=false;if(catalogItem(it.key)?.phone)syncPhoneState();return before!==conditionLabel(it.condition)?conditionLabel(it.condition):null}
function canUsePhone(){if(S.age<D.ageRules.phone)return false;if(S.phone?.confiscatedUntil===currentDate())return false;const p=activePhoneItem();return !!p&&p.condition>0&&(p.battery??100)>0}
function phoneLockReason(){if(S.age<D.ageRules.phone)return `Independent phone use starts around high school (age ${D.ageRules.phone} in this simulation).`;const p=activePhoneItem();if(!p)return 'You do not own a phone yet.';if(p.condition<=0)return `Your ${p.name} is broken. Repair or replace it.`;if((p.battery??100)<=0)return 'Your phone battery is dead. Charge it first.';return ''}
function drainActivePhone(){const p=activePhoneItem();if(!p)return;p.battery=clamp((p.battery??100)-(3+Math.random()*5));p.timesUsed=(p.timesUsed||0)+1;let note=setItemCondition(p,p.condition-.12);if(chance(.4)){note=setItemCondition(p,p.condition-15);log('Cracked screen',`Your ${p.name} slips out of your hand and hits the floor. A crack runs across the corner of the screen.`)}if(p.battery<=0)toast('Your phone just died.');syncPhoneState()}
function onPhoneAcquired(it){
 const cur=phoneItems().find(i=>i.id===S.phone.activeItemId&&i!==it);
 if(!cur||cur.condition<=0||SIM.skipping){if(!cur||it.condition>=cur.condition)S.phone.activeItemId=it.id;syncPhoneState();return}
 syncPhoneState();
 queueEvent({type:'newPhone',title:`A new ${it.name}`,text:`You now have two phones: your current ${cur.name} (${Math.round(cur.condition)}%) and the new ${it.name}. What do you do with them?`,payload:{newId:it.id,oldId:cur.id},priority:3,expiresDays:3,choices:[{id:'switch',label:'Switch to the new one'},{id:'keep',label:'Keep using the current one'},{id:'sell',label:'Switch and sell the old one'},{id:'give',label:'Switch and give the old one away'}]})
}
function handlePhoneChoice(e,id){
 const nw=S.inventoryItems.find(x=>x.id===e.payload?.newId),old=S.inventoryItems.find(x=>x.id===e.payload?.oldId);if(!nw){log('New phone','The phone situation sorted itself out.');return true}
 if(id==='keep'){S.phone.activeItemId=old?.id||nw.id;syncPhoneState();log('Kept your phone',`The ${nw.name} goes in a drawer as a spare.`);return true}
 S.phone.activeItemId=nw.id;syncPhoneState();
 if(id==='sell'&&old){if(S.age<18&&!caregiverApproval(10)){log('Switched phones',`You switch to the ${nw.name}. Your caregiver wants to keep the old one as a backup.`);return true}const v=Math.max(5,Math.round(itemValue(old)*(.8+Math.random()*.3)));removeItem(old.id);S.money+=v;log('Sold the old phone',`You move everything to the ${nw.name} and sell the old ${old.name} for ${money(v)}.${old.sentimental>=40?' It was your first phone — it feels strange to see it go.':''}`);return true}
 if(id==='give'&&old){log('Switched phones',`You switch to the ${nw.name}. Now — who gets the old one?`);setTimeout(()=>openGiftPersonModal(null,old.id),0);return true}
 log('Switched phones',`You move your photos and messages to the ${nw.name}. The ${old?.name||'old phone'} becomes a spare.`);return true
}
// ---------- Aging (daily) ----------
function itemDailyTick(){
 for(const it of [...S.inventoryItems]){
  const d=catalogItem(it.key);if(!d)continue;const lt=it.lifecycleType;
  if(hasCondition(lt)&&d.agingPerYear)setItemCondition(it,it.condition-d.agingPerYear/365*(it.stored?.4:1));
  if(lt==='wearable'&&it.equipped)setItemCondition(it,it.condition-(d.wearPerDay||.2));
  if(d.battery&&!it.stored&&it.condition>0)it.battery=100;
  if(lt==='perishable'&&freshDaysLeft(it)<-6){removeItem(it.id);if(!SIM.skipping)log('Threw something out',`The ${it.name.toLowerCase()} had gone bad, so it went in the trash.`)}
 }
 const p=activePhoneItem();if(p)syncPhoneState()
}
// ---------- Using items ----------
function itemUses(it){const d=catalogItem(it.key);return (d?.uses||[]).filter(u=>(u.minAge??0)<=S.age&&(u.maxAge==null||S.age<=u.maxAge))}
function boredomFactor(it){if(it.useLog?.date!==currentDate())it.useLog={date:currentDate(),count:0};return [1,1,.8,.6,.4,.25][Math.min(5,it.useLog.count)]}
function bestPrepSubject(){if(!S.school?.subjects?.length)return null;const next=nextExam();return (next&&examSubject(next))||[...S.school.subjects].sort((a,b)=>a.prep-b.prep)[0]}
function performItemUse(itemId,useId){
 let it=S.inventoryItems.find(x=>x.id===itemId);if(!it)return;const d=catalogItem(it.key);if(!d)return;
 if(it.stored){toast('Take it out of storage first.');return}
 const use=itemUses(it).find(u=>u.id===useId);if(!use){toast(S.age<(d.minAge||0)?'That is not for your age yet.':'You cannot do that with this item right now.');return}if(use.medicine){useMedicineItem(it,d);save();render();return}
 if(hasCondition(it.lifecycleType)&&it.condition<=0){toast(`${it.name} is broken. Repair or replace it.`);return}
 if(it.lifecycleType==='finite'&&it.remaining<=0){toast(`${it.name} is used up.`);return}
 if(d.requires&&!findUsable(d.requires)){toast(`You need a working ${catalogItem(d.requires).name} for this.`);return}
 if(use.outdoor&&S.weather.type==='Stormy'){toast('It is storming outside — not now.');return}
 if(use.battery&&(it.battery??100)<use.battery){toast(`${it.name} needs charging first.`);return}
 if(S.energy<12&&(use.effects?.energy||0)<0){toast('You are too tired for that right now.');return}
 if(atSchool()&&!['book','comicBook','notebook','workbook','sketchbook'].includes(it.key)){toast('You are at school — that will have to wait.');return}
 if(d.permission&&!householdAccess(d.permission))return;
 if(it.lifecycleType==='finite'||(it.lifecycleType==='progress'&&(it.quantity||1)>1))it=openOne(it);
 let rereading=false;if(it.lifecycleType==='progress'&&it.progress>=100){it.progress=0;it.rereading=true}rereading=!!it.rereading;
 const bored=boredomFactor(it);it.useLog.count++;it.timesUsed=(it.timesUsed||0)+1;it.lastUsedDate=currentDate();
 const ef=use.effects||{},out=[];
 const needMap={fun:'fun',social:'social',comfort:'comfort',hygiene:'hygiene'};
 for(const [k,v0] of Object.entries(ef)){const v=(k==='fun'||k==='stress'&&v0<0)?v0*bored:v0;if(needMap[k])S.needs[k]=clamp(S.needs[k]+v);else if(k==='happiness')S.happiness=clamp(S.happiness+v);else if(k==='stress')S.stress=clamp(S.stress+v);else if(k==='energy')S.energy=clamp(S.energy+v);if(Math.abs(v)>=1)out.push(`${k[0].toUpperCase()+k.slice(1)} ${v>0?'+':''}${Math.round(v)}`)}
 const rereadMult=rereading?Math.pow(.5,Math.min(4,it.completions||1)):1;
 for(const [k,b] of Object.entries(use.skills||{})){const g=practiceSkill(k,b*rereadMult*(d.studyBonus?1:1));if(g>=.05)out.push(`${SKILL_LABEL[k]||k} +${g.toFixed(g<1?1:0)}`)}
 if(S.lastFarmNote){out.push(S.lastFarmNote);S.lastFarmNote=null}if(S.lastBoostNote){out.push(S.lastBoostNote);S.lastBoostNote=null}
 if(use.prep&&S.school){const sub=bestPrepSubject();if(sub){const g=Math.round(use.prep*(findUsable('deskLamp')?1.25:1)*bored);sub.prep=clamp(sub.prep+g);out.push(`${sub.name} prep +${g}`)}}
 if(use.family){S.family.closeness=clamp(S.family.closeness+use.family);S.needs.social=clamp(S.needs.social+4)}
 if(use.confidence)setEmotion('Confident',`You took time on your look with ${it.name}.`,55);
 let note='';
 if(use.consume){it.remaining=clamp(it.remaining-use.consume);out.push(`${Math.round(it.remaining)}% left`)}
 if(use.progress){const p=use.progress*(S.age<8?.7:1);it.progress=Math.min(100,(it.progress||0)+p);if(it.progress>=100){it.completions=(it.completions||0)+1;it.rereading=false;note=` You finish ${it.name.toLowerCase()==='book'?'the book':'it'}${it.completions>1?' again':''}.`}else out.push(`${Math.round(it.progress)}% through`)}
 if(use.wear&&chance(use.wear[0])){const loss=use.wear[1]+Math.random()*(use.wear[2]-use.wear[1]);const changed=setItemCondition(it,it.condition-loss);if(changed)note+=changed==='Broken'?` The ${it.name.toLowerCase()} finally breaks.`:` The ${it.name.toLowerCase()} is starting to look ${changed.toLowerCase()}.`}
 if(use.battery)it.battery=clamp((it.battery??100)-use.battery);
 advanceTime(use.minutes||30);
 const story=rand(use.text||[`You use the ${it.name.toLowerCase()} for a while.`])+(bored<.7?' It is starting to feel repetitive today.':'')+note;
 log(`${use.label} • ${it.name}`,`${story} ${out.length?'('+out.join(' • ')+')':''}`.trim());toast(`${use.label} • ${it.name}`);
 if(it.lifecycleType==='finite'&&it.remaining<=0.5){removeItem(it.id);log(`${it.name} used up`,`The last of the ${it.name.toLowerCase()} is gone.`)}
}
function eatPortion(itemId,portion){
 let it=S.inventoryItems.find(x=>x.id===itemId);if(!it)return;const d=catalogItem(it.key);if(!d||!['consumable','perishable'].includes(it.lifecycleType)||d.gift){toast('That is not food.');return}
 if(it.stored){toast('Take it out of storage first.');return}
 it=openOne(it);const rem=it.remaining,amt=portion==='little'?Math.min(25,rem):portion==='half'?rem/2:rem;if(amt<=0)return;
 const f=amt/100,spoiled=isSpoiled(it),stale=!spoiled&&freshDaysLeft(it)<0;
 if(d.drink){S.needs.comfort=clamp(S.needs.comfort+(d.comfort||10)*f);S.needs.toilet=clamp(S.needs.toilet+6*f)}
 S.needs.hunger=clamp(S.needs.hunger-(d.hunger||20)*f*(spoiled?.6:1));if(d.healthy)S.health=clamp(S.health+.8*f);if(it.key==='snackPack')S.needs.fun=clamp(S.needs.fun+4*f);if(it.key==='sandwich')S.energy=clamp(S.energy+6*f);
 it.remaining=Math.max(0,rem-amt);
 let story=d.drink?rand(portion==='all'?['You finish it in a few long sips.','You drain the carton and flatten it.']:['A few sips.','You drink some and save the rest.']):rand(portion==='little'?['You nibble a little.','Just a bite or two to take the edge off.']:portion==='half'?['You eat about half and put the rest aside.','Half now, half later.']:['You finish the whole thing.','Every last crumb.']);
 if(spoiled&&chance(60)){S.health=clamp(S.health-4);S.happiness=clamp(S.happiness-3);setEmotion('Uncomfortable','Something you ate had gone off.',55);story+=' It tasted off — your stomach complains for the next hour.'}else if(stale)story+=' It is a bit stale, but fine.';
 advanceTime(Math.max(3,Math.round(4+10*f)));
 if(it.remaining<=0.5){removeItem(it.id);story+=d.drink?' The empty carton goes in the recycling.':' You throw away the empty wrapper.'}
 log(`${d.drink?'Drank':'Ate'} ${it.name.toLowerCase()}`,`${story} (${d.drink?'Comfort':'Hunger'} ${d.drink?'+':'-'}${Math.round((d.drink?(d.comfort||10):(d.hunger||20))*f)}${it.remaining>0.5?` • ${Math.round(it.remaining)}% left`:''})`);toast(`${d.drink?'Drank':'Ate'} • ${Math.round(amt)}%`)
}
function drinkFromContainer(itemId,portion){
 const it=S.inventoryItems.find(x=>x.id===itemId);if(!it||it.lifecycleType!=='container')return;if(it.stored){toast('Take it out of storage first.');return}
 if((it.contents||0)<=0){toast(`The ${it.name.toLowerCase()} is empty. Refill it first.`);return}
 const ml=Math.round(portion==='little'?Math.min(100,it.contents):portion==='half'?it.contents/2:it.contents);
 it.contents=Math.max(0,it.contents-ml);S.needs.comfort=clamp(S.needs.comfort+ml/600*24);S.needs.toilet=clamp(S.needs.toilet+ml/600*10);it.timesUsed=(it.timesUsed||0)+1;if(chance(4))setItemCondition(it,it.condition-1);
 advanceTime(3);log('Drank water',`You drink ${ml} ml from your ${it.name.toLowerCase()}. ${it.contents>0?`${Math.round(it.contents)} ml left.`:'Now it is empty.'} (Comfort +${Math.round(ml/600*24)})`);toast(`Water • ${Math.round(it.contents)}/${it.capacity} ml`)
}
function refillContainer(itemId){
 const it=S.inventoryItems.find(x=>x.id===itemId);if(!it||it.lifecycleType!=='container')return;
 if(!['Home','School'].includes(S.location)){toast('There is no tap here to refill it.');return}
 const cap=Math.round(it.capacity*(it.condition<20?.75:1));if(it.contents>=cap){toast('It is already full.');return}
 it.contents=cap;advanceTime(2);log('Refilled your bottle',`${cap} ml of water.${it.condition<20?' It leaks a little now, so you cannot fill it all the way.':''}`);toast('Bottle refilled')
}
function cleanItem(itemId){const it=S.inventoryItems.find(x=>x.id===itemId);if(!it)return;it.lastCleaned=currentDate();setItemCondition(it,Math.min(100,it.condition+2));advanceTime(5);log(`Cleaned ${it.name.toLowerCase()}`,'Rinsed and scrubbed. It looks better cared for.')}
function chargeDevice(itemId){const it=S.inventoryItems.find(x=>x.id===itemId);if(!it||it.battery==null)return;if(it.battery>=98){toast('Already charged.');return}advanceTime(Math.round((100-it.battery)*.6));it.battery=100;if(catalogItem(it.key)?.phone)syncPhoneState();toast(`${it.name} charged`)}
function toggleWear(itemId){
 const it=S.inventoryItems.find(x=>x.id===itemId);if(!it)return;const d=catalogItem(it.key);if(!d?.slot){toast('You cannot wear that.');return}
 if(!it.equipped&&it.condition<=0){toast(`${it.name} is too worn out to wear.`);return}
 if(it.equipped){it.equipped=false;advanceTime(2);feedback(`Took off ${it.name.toLowerCase()}`,'',2);return}
 const prev=equippedIn(d.slot);if(prev)prev.equipped=false;it.equipped=true;it.stored=false;advanceTime(3);
 feedback(`Wearing ${it.name.toLowerCase()}`,`${SLOT_LABEL[d.slot]} slot${prev?` (instead of ${prev.name.toLowerCase()})`:''}.`,3)
}
function repairItem(itemId){
 const it=S.inventoryItems.find(x=>x.id===itemId);if(!it)return;const d=catalogItem(it.key);
 if(!hasCondition(it.lifecycleType)){toast('There is nothing to repair.');return}
 if(!d.repairable&&!['wearable'].includes(it.lifecycleType)){toast('This cannot really be repaired.');return}
 if(it.condition>=90){toast('It does not need repair.');return}
 const cost=Math.max(3,Math.round(d.price*.12*((100-it.condition)/50)));
 if(S.age<18){if(!caregiverApproval(cost>60?-5:6)){toast(`A caregiver does not approve the ${money(cost)} repair.`);return}}else if(!spendOwn(cost)){toast(`The repair costs ${money(cost)}.`);return}
 const before=it.condition;setItemCondition(it,Math.min(before<=0?70:95,before+45));advanceTime(it.lifecycleType==='device'?60:30);
 log(`Repaired ${it.name.toLowerCase()}`,`${it.lifecycleType==='wearable'?'Stitched and patched.':it.lifecycleType==='device'?'A repair shop fixes it up.':'Fixed up and working again.'} Condition ${Math.round(before)}% → ${Math.round(it.condition)}%${S.age<18?' (household paid)':` • ${money(cost)}`}.`);toast(`Repaired • ${Math.round(it.condition)}%`)
}
function sellItem(itemId){
 const it=S.inventoryItems.find(x=>x.id===itemId);if(!it)return;if(S.age<18&&!caregiverApproval(8)){log('Sale permission denied',`A caregiver does not agree to selling ${it.name}.`);return}
 const unit=(it.quantity||1)>1?itemValue(it)/(it.quantity):itemValue(it),value=Math.max(1,Math.round(unit*(.75+Math.random()*.35)));
 const parts=hasCondition(it.lifecycleType)&&it.condition<=0;removeItem(it.id,true);S.money+=value;advanceTime(20);
 let story=parts?`You sell the broken ${it.name.toLowerCase()} for parts.`:`You sell the ${it.name.toLowerCase()}.`;
 if(it.sentimental>=35&&it.origin){setEmotion('Wistful',`You sold ${it.name}.`,45);S.happiness=clamp(S.happiness-2);story+=` ${it.origin} Letting it go stings a little.`}
 log(`Sold ${it.name.toLowerCase()}`,`${story} You get ${money(value)}.`);toast(`Sold • ${money(value)}`)
}
function discardItem(itemId){const it=S.inventoryItems.find(x=>x.id===itemId);if(!it)return;if(!confirm(`Throw away ${it.quantity>1?'one ':''}${it.name}? This cannot be undone.`))return;removeItem(it.id,true);log(`Threw away ${it.name.toLowerCase()}`,it.sentimental>=35&&it.origin?`${it.origin} It is gone now.`:'It is no longer in your things.')}
function useInventoryItem(id,action='use'){
 const it=S.inventoryItems.find(x=>x.id===id);if(!it)return;
 if(action==='wear')return toggleWear(id);if(action==='repair')return repairItem(id);if(action==='sell')return sellItem(id);if(action==='discard')return discardItem(id);
 if(action==='store'){it.stored=!it.stored;if(it.stored)it.equipped=false;if(catalogItem(it.key)?.phone)syncPhoneState();feedback(it.stored?`Stored ${it.name.toLowerCase()}`:`Took out ${it.name.toLowerCase()}`,'',2);return}
 if(action==='charge')return chargeDevice(id);if(action==='refill')return refillContainer(id);if(action==='clean')return cleanItem(id);
 if(action==='activatePhone'){S.phone.activeItemId=it.id;it.stored=false;syncPhoneState();feedback(`Switched to ${it.name}`,'Your messages and apps move over.',10);return}
 if(action==='use'){if(catalogItem(it.key)?.phone){active='phone';return}const u=itemUses(it)[0];if(u)return performItemUse(id,u.id);if(['consumable','perishable'].includes(it.lifecycleType))return eatPortion(id,'all');if(it.lifecycleType==='container')return drinkFromContainer(id,'little');toast(`${it.name} is used automatically when relevant.`)}
}
// ---------- Gifts ----------
function openGiftPersonModal(personId,itemId=null){
 if(itemId){const it=S.inventoryItems.find(x=>x.id===itemId);if(!it)return;openModal(`Give ${it.name} to…`,`<div class="modal-action-grid">${S.people.map(p=>`<button data-gift-item="${it.id}" data-gift-person="${p.id}">${esc(p.name)}</button>`).join('')}</div>`);return}
 const p=personById(personId);if(!p)return;const items=S.inventoryItems.filter(i=>!i.stored&&i.id!==S.phone.activeItemId&&!(i.opened&&['consumable','perishable'].includes(i.lifecycleType)));
 if(!items.length){toast('You do not have a suitable item to gift.');return}
 openModal(`Give something to ${firstName(p)}`,`<div class="modal-action-grid">${items.map(i=>`<button data-gift-item="${i.id}" data-gift-person="${p.id}">${catalogItem(i.key)?.icon||''} ${esc(i.name)}${i.quantity>1?` ×${i.quantity}`:''} <small>${i.sentimental>=35?'means something to you':money(itemValue(i)/(i.quantity||1))}</small></button>`).join('')}</div>`)
}

// ---------- Migration of item records ----------
function normalizeInventory(){
 S.inventoryItems=Array.isArray(S.inventoryItems)?S.inventoryItems:[];S.phone=Object.assign({owned:false,model:null,price:600,condition:100,appsUnlocked:[],activeItemId:null},S.phone||{});ensureSkills();
 const existing=new Set(S.inventoryItems.map(i=>i.key));
 for(const k of S.possessions||[]){const key=D.catalog[k]?k:itemKeyFromLegacyName(k);if(key&&!existing.has(key)){S.inventoryItems.push(makeItemInstance(key,'Legacy possession'));existing.add(key)}}
 for(const [key,count] of Object.entries(S.inventory||{})){if(!D.catalog[key]||count<=0)continue;for(let n=S.inventoryItems.filter(i=>i.key===key).reduce((a,i)=>a+(i.quantity||1),0);n<count;n++)S.inventoryItems.push(makeItemInstance(key,'Legacy inventory'))}
 if(S.phone.owned&&!phoneItems().length){const key=S.phone.price<=300?'phoneUsed':S.phone.price>=900?'phoneFlagship':'phone';const it=makeItemInstance(key,'Existing phone',S.phone.condition??100);it.name=S.phone.model||it.name;S.inventoryItems.push(it)}
 for(const it of S.inventoryItems){
  it.id=it.id||uid('item');const d=catalogItem(it.key);if(!d){it.lifecycleType=it.lifecycleType||'durable';continue}
  const lt=it.lifecycleType||lifecycleOf(d);it.lifecycleType=lt;it.name=it.name||d.name;it.category=d.category;
  it.quantity=Math.max(1,Math.round(it.quantity||1));it.opened=!!it.opened;it.timesUsed=it.timesUsed||0;it.useLog=it.useLog||{date:null,count:0};it.acquiredDate=it.acquiredDate||currentDate();
  if(it.remaining==null)it.remaining=lt==='finite'?clamp(it.condition??100):100;
  if(!hasCondition(lt))it.condition=100;else it.condition=clamp(it.condition??100);
  if(lt==='container'){it.capacity=it.capacity||d.capacity||500;it.contents=it.contents??it.capacity}
  if(lt==='progress'){it.progress=it.progress??0;it.completions=it.completions??0}
  if(lt==='perishable'&&!it.freshUntil)it.freshUntil=addDays(currentDate(),d.freshnessDays||3);
  if(d.battery&&it.battery==null)it.battery=100;
  if(d.slot)it.slot=d.slot;else{it.slot=null;it.equipped=false}
  if(it.origin===undefined)it.origin=/gift|Christmas|Birthday/i.test(it.source||'')?`${it.source.replace(/^./,c=>c.toUpperCase())}.`:null;
  delete it.currentValue
 }
 // merge legacy duplicates of stackable, unopened items into one stack
 const stacks={};S.inventoryItems=S.inventoryItems.filter(it=>{const d=catalogItem(it.key);if(!d?.stackable||it.opened||it.stored)return true;const k=it.key+'|'+(it.freshUntil||'');if(stacks[k]){stacks[k].quantity+=it.quantity;return false}stacks[k]=it;return true});
 // one equipped item per slot
 const used=new Set();for(const it of S.inventoryItems)if(it.equipped){if(!it.slot||used.has(it.slot))it.equipped=false;else used.add(it.slot)}
 if(S.phone.activeItemId&&!phoneItems().some(i=>i.id===S.phone.activeItemId))S.phone.activeItemId=null;
 syncPhoneState();syncLegacyInventory()
}
// ---------- Weather gear in daily life ----------
function weatherAdvice(){const w=S.weather.type;if(['Rainy','Stormy'].includes(w))return hasWeatherGear('rain')?'You have rain protection ready.':'Rain gear (umbrella or raincoat) would make outdoor plans easier.';if(w==='Hot')return S.homeAmenities.ac?'A/C is available at home. Water still matters.':'Use a fan, shade and water to manage the heat.';if(['Cool','Cold','Snowy','Blizzard'].includes(w))return hasWeatherGear('cold')?'You are dressed warmly.':S.homeAmenities.fireplace?'The fireplace can warm the house. Wear something warm outside.':'Wear a sweater or hoodie before going out.';if(w==='Sunny')return hasWeatherGear('sun')?'Sunglasses or a cap help in the glare.':'Water and sun protection help outside.';return 'Weather should not block most normal plans.'}
function applyWeatherGear(p,mins){
 const w=S.weather.type;if(!p.weatherSensitive)return mins;
 if(['Rainy','Stormy','Typhoon','Hurricane'].includes(w)){if(hasWeatherGear('rain')){const u=findUsable('umbrella');if(u&&chance(25))setItemCondition(u,u.condition-2);S.needs.comfort=clamp(S.needs.comfort-3);log('Ready for the rain','Your rain gear keeps you mostly dry.');return mins}S.needs.comfort=clamp(S.needs.comfort-15);log('Weather cuts the outing short','You are not prepared for the rain and come home soaked.');return Math.round(mins*.65)}
 if(['Cool','Cold','Snowy','Blizzard'].includes(w)){if(hasWeatherGear('cold'))S.needs.comfort=clamp(S.needs.comfort+4);else{S.needs.comfort=clamp(S.needs.comfort-9);log('Underdressed','The wind cuts right through you. You wish you had worn something warmer.')}}
 if(['Sunny','Hot','Heatwave'].includes(w)){if(hasWeatherGear('sun'))S.needs.comfort=clamp(S.needs.comfort+3);else S.needs.comfort=clamp(S.needs.comfort-4)}
 return mins
}
// ---------- Purchasing ----------
function canBuyItem(key,qty=1){
 const d=catalogItem(key);if(!d)return {ok:false,reason:'Unknown item.'};
 if(S.age<d.minAge)return {ok:false,reason:`This item becomes relevant around age ${d.minAge}.`};
 if(d.maxQuantity&&unitCount(key)+qty>d.maxQuantity)return {ok:false,reason:`You already have plenty (${unitCount(key)}).`};
 const total=d.price*qty;if(availableFunds()<total)return {ok:false,reason:`You need ${money(total-availableFunds())} more.`};
 const usingManaged=S.age<13&&S.money+(S.finance.savings||0)<total&&(S.finance.parentSavings||0)>0;
 if(S.age<18&&(total>=d.permissionPrice||usingManaged))return {ok:true,needsPermission:true};
 return {ok:true,needsPermission:false}
}
function buyWithOwnMoney(key,qty=1){
 qty=Math.max(1,Math.min(10,Math.round(Number(qty)||1)));const d=catalogItem(key),check=canBuyItem(key,qty);if(!check.ok){toast(check.reason);return}
 const total=d.price*qty;
 if(check.needsPermission&&S.age<18){const score=purchaseScore(d,false);if(score<45){log('Purchase permission denied',`You ask to spend your own ${money(total)} on ${d.name}, but your caregivers say no for now.`);setEmotion('Disappointed','A purchase request was denied.',45);return}log('Purchase approved',`Your caregivers let you spend your own money on ${d.name}.`)}
 if(!spendOwn(total)){toast('Not enough money.');return}addItem(key,'own money',null,{quantity:qty});advanceTime(15);feedback(`Bought ${qty>1?qty+'× ':''}${d.name}`,`${money(total)} spent`,15)
}
