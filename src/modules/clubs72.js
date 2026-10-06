
// ---------- v7.2 PHASE 5a: clubs, tryouts, progression & elections ----------
const LADDERS={generic:['New member','Member','Experienced member','Committee member','Vice President','President'],sport:['Reserve','Starter','Vice Captain','Captain'],drama:['Ensemble','Supporting role','Lead role','Stage manager','Club President'],council:['Class representative','Secretary','Vice President','President'],newspaper:['Writer','Senior writer','Editor','Editor-in-Chief'],debate:['Novice','Varsity debater','Vice Captain','Captain'],music:['Section member','Section leader','Concertmaster','Ensemble President']};
const CLUB_INFO={
 'Art Club':{kind:'open',skills:['art','creativity'],rep:'creative',ladder:'generic',leader:'Advisor'},'Reading Club':{kind:'open',skills:['reading'],rep:'academic',ladder:'generic',leader:'Advisor'},'Nature Club':{kind:'open',skills:['knowledge'],rep:'kindness',ladder:'generic',leader:'Advisor'},'Chess Club':{kind:'open',skills:['knowledge'],rep:'academic',ladder:'generic',leader:'Advisor'},'Music Group':{kind:'open',skills:['music'],rep:'creative',ladder:'generic',leader:'Advisor'},'Sports Club':{kind:'open',skills:['sports','fitness'],rep:'athletic',ladder:'generic',leader:'Coach'},
 'Science Club':{kind:'open',skills:['knowledge'],rep:'academic',ladder:'generic',leader:'Advisor'},'Coding Club':{kind:'open',skills:['programming'],rep:'academic',ladder:'generic',leader:'Advisor'},'Photography':{kind:'open',skills:['art'],rep:'creative',ladder:'generic',leader:'Advisor'},'Volunteer Club':{kind:'open',skills:[],rep:'kindness',ladder:'generic',leader:'Advisor'},'School Newspaper':{kind:'open',skills:['writing'],rep:'creative',ladder:'newspaper',leader:'Advisor'},'Recreational League':{kind:'open',skills:['sports','fitness'],rep:'athletic',ladder:'generic',leader:'Coach'},
 'Drama':{kind:'selective',entry:'audition',skills:['creativity','writing'],rep:'creative',ladder:'drama',leader:'Director',parts:['Monologue','Stage presence','Voice','Confidence'],spots:6},
 'Debate':{kind:'selective',entry:'audition',skills:['writing','knowledge'],rep:'leadership',ladder:'debate',leader:'Coach',parts:['Argument','Research','Delivery','Composure'],spots:5},
 'Music':{kind:'selective',entry:'audition',skills:['music'],rep:'creative',ladder:'music',leader:'Conductor',parts:['Technique','Sight-reading','Musicality','Nerves'],spots:6},
 'Football':{kind:'sport',entry:'tryout',skills:['sports','fitness'],rep:'athletic',ladder:'sport',leader:'Coach',parts:['Ball control','Shooting','Fitness','Teamwork'],spots:8},
 'Basketball':{kind:'sport',entry:'tryout',skills:['sports','fitness'],rep:'athletic',ladder:'sport',leader:'Coach',parts:['Dribbling','Shooting','Fitness','Teamwork'],spots:6},
 'Swimming':{kind:'sport',entry:'tryout',skills:['fitness','sports'],rep:'athletic',ladder:'sport',leader:'Coach',parts:['Technique','Endurance','Starts','Focus'],spots:8},
 'Volleyball':{kind:'sport',entry:'tryout',skills:['sports','fitness'],rep:'athletic',ladder:'sport',leader:'Coach',parts:['Serving','Passing','Fitness','Teamwork'],spots:7},
 'Track':{kind:'sport',entry:'tryout',skills:['fitness','sports'],rep:'athletic',ladder:'sport',leader:'Coach',parts:['Speed','Endurance','Technique','Focus'],spots:10},
 'Student Council':{kind:'elected',entry:'election',skills:['writing'],rep:'leadership',ladder:'council',leader:'Advisor'}
};
function clubInfo(name){return CLUB_INFO[name]||{kind:'open',skills:[],rep:'club',ladder:'generic',leader:'Advisor'}}
function activityOptions(){return S.age<10?['Art Club','Reading Club','Music Group','Sports Club','Nature Club','Chess Club']:S.age<15?['Art Club','Science Club','Football','Basketball','Drama','Coding Club','Music','Chess Club','School Newspaper','Volunteer Club','Student Council']:['Art Club','Debate','Science Club','Football','Basketball','Swimming','Volleyball','Track','Drama','Coding Club','Music','Photography','School Newspaper','Volunteer Club','Student Council']}
function ladderFor(c){return LADDERS[clubInfo(c.name).ladder]||LADDERS.generic}
function clubSkillScore(name){const sk=clubInfo(name).skills;if(!sk.length)return 50;return sk.reduce((a,k)=>a+skillValue(k),0)/sk.length}
// ---------- Sign-up / tryout / audition ----------
function signUpForActivity(offerId){
 const o=S.school?.activityOffers?.find(x=>x.id===offerId);if(!o||o.status!=='Offered')return;const info=clubInfo(o.name);
 if(o.decisionDate<currentDate()){o.status='Expired';toast('The signup window closed.');return}
 if(info.kind==='elected'){o.status='Joined';startElection({scope:'council',name:'Student Council',position:'Class representative'});return}
 if(info.kind==='open')return decideActivity(o.id,true);
 if(S.age<13){o.status='Waiting';createPending({type:'clubApproval',title:`${info.entry==='tryout'?'Try out for':'Audition for'} ${o.name}`,resolveDate:addDays(currentDate(),1),payload:{offerId:o.id,tryout:true},status:'Waiting for caregiver',detail:'Your caregiver will decide tomorrow.'});log('Asked permission',`You ask to ${info.entry==='tryout'?'try out for':'audition for'} ${o.name}.`);return}
 scheduleTryout(o)
}
function resolveClubApproval(p){const o=S.school?.activityOffers?.find(x=>x.id===p.payload?.offerId);if(!o){p.resolved=true;p.status='Cancelled';return}if(caregiverYes(8)){p.status='Approved';if(p.payload?.tryout)scheduleTryout(o);else activateClub(o)}else{o.status='Denied';p.status='Denied';log('Club permission denied',`Your caregiver says no to ${o.name} this time.`)}p.resolved=true}
function scheduleTryout(o,{attempt=1}={}){
 const info=clubInfo(o.name),date=nextSchoolDay(addDays(currentDate(),attempt>1?28:5+Math.floor(Math.random()*4)));
 o.status='Tryout';S.school.tryouts=S.school.tryouts||[];
 const prev=S.school.tryouts.find(t=>t.club===o.name&&t.status==='Scheduled');if(prev)return prev;
 const t={id:uid('tryout'),club:o.name,offerId:o.id,entry:info.entry,dateISO:date,prep:0,attempt,status:'Scheduled',coach:teacherName(o.name).replace(/^(Ms\.|Mr\.|Mx\.)/,info.leader),prepLog:{}};
 S.school.tryouts.unshift(t);createCalendarEvent({id:`tryout-${t.id}`,type:'tryout',title:`${o.name} ${info.entry}`,dateISO:date,startMinute:930,endMinute:1020,graceMinute:945,payload:{tryoutId:t.id},location:info.kind==='sport'?'School gym / field':'School auditorium',source:'club'});
 const th=thread('tryout',`tryout-${o.name}`,`${info.entry==='tryout'?'Making the':'Getting into'} ${o.name}${info.kind==='sport'?' team':''}`);threadStep(th,attempt>1?`Attempt ${attempt} scheduled`:'Signed up',`${info.entry} on ${formatDate(date)}`);
 log(`${o.name} ${info.entry} scheduled`,`${formatDate(date)} at ${timeLabel(930)}. ${t.coach} will be watching: ${info.parts.join(', ').toLowerCase()}. Practicing beforehand will help.`);
 const f=bestNonFamily();if(f&&chance(55))f.pendingAsk={kind:'tryout',club:o.name};
 return t
}
const PREP_MODES={alone:{label:'Practice alone',minutes:60,gain:8},friend:{label:'Practice with a friend',minutes:75,gain:10,friend:true},lessons:{label:'Take a lesson',minutes:60,gain:14,cost:25},camp:{label:'Weekend camp',minutes:360,gain:24,cost:60,weekend:true}};
function practiceForTryout(tryoutId,mode){
 const t=S.school?.tryouts?.find(x=>x.id===tryoutId),m=PREP_MODES[mode];if(!t||t.status!=='Scheduled'||!m)return;if(atSchool()){toast('After school.');return}
 if(m.weekend&&!isWeekend(currentDate())){toast('Camps run on weekends.');return}
 if(m.cost){if(S.age<18){if(!caregiverYes(-5)){toast(`Your caregiver will not pay ${money(m.cost)} for that right now.`);return}}else if(!spendOwn(m.cost)){toast(`It costs ${money(m.cost)}.`);return}}
 if(S.energy<15){toast('You are too tired to practice well.');return}
 const n=t.prepLog[currentDate()]||0,mult=[1,.55,.25,.1][Math.min(3,n)];t.prepLog[currentDate()]=n+1;
 const gain=Math.round(m.gain*mult);t.prep=clamp(t.prep+gain);for(const k of clubInfo(t.club).skills)practiceSkill(k,2*mult);S.energy=clamp(S.energy-8);
 let story=mode==='friend'?(()=>{const f=bestNonFamily();if(f){f.rel=clamp(f.rel+3);rememberPerson(f,`Helped you practice for the ${t.club} ${t.entry}.`)}return `${firstName(f)||'A friend'} helps you drill the basics. It is more fun than practicing alone.`})():mode==='lessons'?'A coach breaks down your technique and fixes one habit you did not know you had.':mode==='camp'?'A long, exhausting day of drills. You leave sore and noticeably better.':rand(['You practice until the basics feel automatic.','Rep after rep. Boring, but it works.']);
 advanceTime(m.minutes);log(`${m.label} • ${t.club}`,`${story} (Preparation ${t.prep}%${mult<1?' — diminishing returns today':''})`)
}
function attendTryout(tryoutId){
 const t=S.school?.tryouts?.find(x=>x.id===tryoutId);if(!t||t.status!=='Scheduled')return;const ev=S.calendar.find(e=>e.id===`tryout-${t.id}`);
 if(t.dateISO!==currentDate()){toast(`It is on ${formatDate(t.dateISO)}.`);return}
 if(currentMinute()>ev.graceMinute){processCalendar();toast('Check-in closed.');return}
 if(currentMinute()<ev.startMinute){if(ev.startMinute-currentMinute()>120){toast(`Starts at ${timeLabel(ev.startMinute)}.`);return}advanceTime(ev.startMinute-currentMinute(),{silent:true})}
 setCalendarStatus(ev,'Attending','Checked in');advanceTime(ev.endMinute-currentMinute(),{silent:true});evaluateTryout(t);setCalendarStatus(ev,'Attended','Tried out')
}
function evaluateTryout(t,{simulated=false}={}){
 const info=clubInfo(t.club),base=clubSkillScore(t.club),fit=skillValue('fitness'),conf=clamp(50+(S.happiness-50)*.4-(S.stress-40)*.4),rivals=(S.npcs||[]).filter(n=>n.interest===t.club&&Math.abs(npcAge(n)-S.age)<=2).length;
 const comps=info.parts.map((part,i)=>{let v=base*.55+t.prep*.3+(Math.random()*20-10)+(S.luck-50)*.08;if(/Fitness|Endurance|Speed/.test(part))v=fit*.6+t.prep*.25+(S.energy-50)*.15+(Math.random()*16-8);if(/Teamwork|Composure|Nerves|Focus|Confidence|presence/.test(part))v=conf*.6+t.prep*.2+(Math.random()*20-10);return [part,clamp(Math.round(v))]});
 const score=comps.reduce((a,[,v])=>a+v,0)/comps.length,threshold=48+Math.min(12,rivals*1.5)+(S.age>=15?4:0),weak=[...comps].sort((a,b)=>a[1]-b[1])[0],strong=[...comps].sort((a,b)=>b[1]-a[1])[0];
 let result,place;
 if(score>=threshold+12){result=info.kind==='sport'?'Selected — starting lineup':'Accepted — strong audition';place=1}
 else if(score>=threshold){result=info.kind==='sport'?'Selected — reserve':'Accepted';place=0}
 else if(score>=threshold-6){result='Waitlisted';place=-1}else{result='Not selected';place=-2}
 t.status='Completed';t.result=result;t.components=Object.fromEntries(comps);
 const o=S.school.activityOffers.find(x=>x.id===t.offerId)||{name:t.club,id:uid('offer')};
 const reason=place>=0?`${t.coach} liked your ${strong[0].toLowerCase()} (${strong[1]}).`:`${t.coach} liked your ${strong[0].toLowerCase()}, but your ${weak[0].toLowerCase()} (${weak[1]}) is not strong enough yet.`;
 const th=thread('tryout',`tryout-${t.club}`,`Making the ${t.club}`);recordOutcome(info.entry==='tryout'?'Club tryout':'Audition',`${t.club}${t.attempt>1?` (attempt ${t.attempt})`:''}`,result,reason,`Scores: ${comps.map(([k,v])=>`${k} ${v}`).join(', ')}.`);
 if(place>=0){activateClub(o);const c=S.school.clubs.find(x=>x.name===t.club&&x.status==='Active');if(c){c.position=ladderFor(c)[place===1&&info.kind==='sport'?1:0];c.coachNote=reason}addRep(info.rep,8);threadStep(th,'Made it',result,{resolve:true});if(!simulated){setEmotion('Proud',`You made ${t.club}.`,70);log(`🎉 ${t.club}: ${result}`,`${reason} ${place===1?'You go straight into the starting group.':'You are in — now earn more playing time.'}`,true)}}
 else if(place===-1){threadStep(th,'Waitlisted',reason);o.status='Waitlisted';scheduleFollowUp('waitlist',{tryoutId:t.id,offerId:o.id},{days:7,minute:960});if(!simulated)log(`${t.club}: waitlisted`,`${reason} You are first on the waitlist if a spot opens.`)}
 else{threadStep(th,'Not selected',reason);o.status='Not selected';t.nextDate=nextSchoolDay(addDays(currentDate(),28));if(!simulated){setEmotion('Disappointed',`You did not make ${t.club}.`,60);log(`${t.club}: not selected`,`"${reason.replace(/^\S+ \S+ /,'')}" ${t.coach} suggests practicing and coming back for the next ${info.entry} on ${formatDate(t.nextDate)}.`)}}
 const rv=(S.npcs||[]).find(n=>n.interest===t.club&&Math.abs(npcAge(n)-S.age)<=1);if(rv&&chance(45))maybeRival(rv.id,t.club);
 const f=S.people.find(p=>p.pendingAsk?.club===t.club);if(f&&!simulated){f.pendingAsk=null;scheduleFollowUp('friendAsks',{personId:f.id,club:t.club,result,place},{days:1,minute:720})}
}
function retryTryout(tryoutId){const t=S.school?.tryouts?.find(x=>x.id===tryoutId);if(!t||t.status!=='Completed'||t.result!=='Not selected')return;t.status='Retrying';const o=S.school.activityOffers.find(x=>x.id===t.offerId)||{id:uid('offer'),name:t.club};S.school.activityOffers.includes(o)||S.school.activityOffers.unshift(o);const nt=scheduleTryout(o,{attempt:(t.attempt||1)+1});nt.prep=Math.round(t.prep*.6)}
function joinRecreational(tryoutId){const t=S.school?.tryouts?.find(x=>x.id===tryoutId);if(!t)return;if(S.school.clubs.some(c=>c.name==='Recreational League'&&c.status==='Active')){toast('You are already in the recreational league.');return}activateClub({name:'Recreational League',status:'Offered'});log('Joined the recreational league','No tryouts, no pressure — just games every week. It keeps you playing while you improve.')}
function tryoutMissed(ev){const t=S.school?.tryouts?.find(x=>x.id===ev.payload?.tryoutId);setCalendarStatus(ev,'No-show','Did not attend tryout');if(!t)return;t.status='Completed';t.result='No-show';t.nextDate=nextSchoolDay(addDays(currentDate(),28));const th=thread('tryout',`tryout-${t.club}`,`Making the ${t.club}`);threadStep(th,'Missed the tryout','You did not show up');recordOutcome('Club tryout',t.club,'No-show','You missed the tryout.');if(!SIM.skipping)log(`Missed the ${t.club} ${t.entry}`,`${t.coach} reads your name twice. You are not there. The next chance is ${formatDate(t.nextDate)}.`)}
// ---------- Progression (coach appoints lower ranks) ----------
function checkClubPromotion(c){
 const L=ladderFor(c),i=Math.max(0,L.indexOf(c.position)),info=clubInfo(c.name),elected=Math.max(1,L.length-(info.kind==='sport'?2:2));if(i>=elected-1)return;
 const need=[[8,30],[18,45],[30,58],[45,68]][i]||[60,75],ok=c.attended>=need[0]&&(c.skill||0)>=need[1]&&clubAttendanceRate(c)>=70&&(c.leaderRel||50)>=55;
 if(!ok)return;c.position=L[i+1];addRep(info.rep,3);addRep('club',2);recordOutcome('Club',c.name,`Promoted to ${c.position}`,`${c.attended} sessions, ${clubAttendanceRate(c)}% attendance, skill ${Math.round(c.skill)}.`);if(!SIM.skipping)log(`${c.name}: ${c.position}`,`${c.leader} pulls you aside after practice. "You've earned this." You are now ${c.position}.`,true)
}
// ---------- Elections ----------
function electionCandidates(scope,clubName){const pool=(S.npcs||[]).filter(n=>Math.abs(npcAge(n)-S.age)<=1&&(n.goals.includes('classPresident')||n.traits.includes('Ambitious')||n.interest===clubName));const picks=[...pool].sort(()=>Math.random()-.5).slice(0,scope==='council'?2:1);if(!picks.length)picks.push(generateHousehold({kids:1})[0]);return picks.map(n=>({id:n.id,name:n.fullName,strength:clamp(35+n.reputation*.4+(n.goals.includes('classPresident')?10:0)+Math.random()*20)}))}
function startElection({scope,name,position,clubId=null}){
 if(!electionGradeOK()){toast('School elections are open to Grade 8 and Grades 10–12.');return}
 S.elections=S.elections||[];if(S.elections.some(e=>e.status==='Campaign'&&e.name===name))return;
 const date=nextSchoolDay(addDays(currentDate(),7)),el={id:uid('elec'),scope,name,clubId,position,startDate:currentDate(),date,status:'Campaign',points:0,done:{},opponents:electionCandidates(scope,name),promise:null};
 S.elections.unshift(el);createCalendarEvent({id:`elec-${el.id}`,type:'election',title:`${name} election`,dateISO:date,startMinute:870,endMinute:900,graceMinute:900,payload:{electionId:el.id},required:false,location:'School',source:'school'});
 const th=thread('election',el.id,`Running for ${position}${scope==='club'?` of ${name}`:''}`);threadStep(th,'Campaign started',`Against ${el.opponents.map(o=>o.name).join(' and ')}`);
 scheduleFollowUp('electionResult',{electionId:el.id},{dateISO:date,minute:900});
 log(`Running for ${position}`,`You put your name forward. Election day is ${formatDate(date)}. You are up against ${el.opponents.map(o=>o.name).join(' and ')}.`,true)
}
const CAMPAIGN={message:{label:'Write a campaign message',minutes:45},talk:{label:'Talk to classmates',minutes:60},friends:{label:'Ask friends for support',minutes:30},posters:{label:'Make posters',minutes:75,cost:5},speech:{label:'Practice & give your speech',minutes:60},online:{label:'Campaign online',minutes:30,minAge:13,phone:true},promise:{label:'Promise an initiative',minutes:15}};
function campaignAction(elId,kind,arg){
 const el=S.elections?.find(x=>x.id===elId),c=CAMPAIGN[kind];if(!el||el.status!=='Campaign'||!c)return;if(atSchool()&&kind!=='talk'){toast('Not during class.');return}
 const k=`${kind}-${currentDate()}`;if(el.done[k]){toast('You already did that today.');return}if(c.phone&&!canUsePhone()){toast('You need your phone.');return}if(c.cost&&S.age>=12&&!spendOwn(c.cost)){toast(`Posters cost ${money(c.cost)}.`);return}
 const r=ensureRep();let pts=0,story;
 if(kind==='message'){const g=skillValue('writing');pts=4+g*.08;story=rand(['You write a short, clear message about what you would actually change.','Three drafts later, the message finally sounds like you.'])}
 else if(kind==='talk'){recordTraitEvidence('Social',{source:'talked to new people',system:'school social',context:'meeting people'});pts=3+r.social*.06;addRep('social',.8);story=rand(['You talk to people you have never really talked to. Most are friendlier than expected.','A few people say they will vote for you. One says "who are you?"'])}
 else if(kind==='friends'){const fs=S.people.filter(p=>!isFamilyPerson(p)&&p.rel>=55);pts=fs.length*2.5;fs.forEach(f=>rememberPerson(f,'Promised to support your campaign.'));story=fs.length?`${fs.map(firstName).slice(0,3).join(', ')} promise to spread the word.`:'You realize you do not have many close friends to ask yet.'}
 else if(kind==='posters'){pts=3+skillValue('art')*.06;practiceSkill('art',1);story='Your posters go up near the cafeteria. One gets a mustache drawn on it by lunch.'}
 else if(kind==='speech'){const q=skillValue('writing')*.4+r.leadership*.3+(S.happiness-S.stress)*.2+Math.random()*25;el.speech=Math.round(q);pts=q*.15;story=q>=55?'Your speech lands. People actually laugh at the joke and clap at the end.':q>=35?'The speech is solid, if a little stiff.':'Your mind goes blank halfway through. You recover, but everyone noticed.'}
 else if(kind==='online'){pts=4+r.social*.05;story=chance(15)?'A post gets mocked in a group chat. It spreads a bit — not in a good way.':'Your post gets shared around. Strangers like it.';if(story.includes('mocked'))pts=-2;drainActivePhone()}
 else if(kind==='promise'){el.promise=arg||rand(['longer lunch breaks','a better school trip','more club funding','a student lounge']);pts=5;story=`You promise ${el.promise}. It is popular — and now you have to deliver if you win.`}
 el.points=Math.round((el.points+pts)*10)/10;el.done[k]=true;addRep('leadership',1);advanceTime(c.minutes);const th=thread('election',el.id,el.name);threadStep(th,'Campaigning',c.label);log(`Campaign • ${c.label}`,`${story} (campaign +${Math.round(pts)})`)
}
function decideElection(el){
 if(!el||el.status!=='Campaign')return;el.status='Decided';const r=ensureRep(),friends=S.people.filter(p=>!isFamilyPerson(p)&&p.rel>=60).length;
 const me=clamp(25+r.leadership*.25+r.social*.2+r.kindness*.1-r.troublemaker*.15+el.points+friends*1.5+(el.speech||0)*.12+Math.random()*12);
 const all=[{id:'player',name:S.name,score:me},...el.opponents.map(o=>({id:o.id,name:o.name,score:o.strength+Math.random()*14}))].sort((a,b)=>b.score-a.score),tot=all.reduce((a,x)=>a+x.score,0);
 all.forEach(x=>x.share=Math.round(100*x.score/tot));const topOpp=[...el.opponents].sort((a,b)=>b.strength-a.strength)[0];if(topOpp&&chance(60))setTimeout(()=>{},0),maybeRival(topOpp.id,'the election');el.results=all;const win=all[0].id==='player',winner=all[0];el.winner=winner.name;
 const th=thread('election',el.id,el.name);const ev=S.calendar.find(e=>e.id===`elec-${el.id}`);if(ev)setCalendarStatus(ev,'Completed','Votes counted');
 const margin=all[0].share-all[1].share,why=win?(el.points>=25?'Your campaign effort clearly paid off.':friends>=3?'Your friends carried a lot of votes.':'It was close, but enough people trusted you.'):(winner.score-me>15?`${winner.name} was simply better known.`:el.speech!=null&&el.speech<35?'The speech hurt you in the end.':'It came down to a handful of votes.');
 recordOutcome('Election',`${el.position}${el.scope==='club'?` • ${el.name}`:''}`,win?'Won':`Lost to ${winner.name}`,`${why} Votes: ${all.map(x=>`${x.id==='player'?'You':x.name} ${x.share}%`).join(', ')}.`);
 if(win){addRep('leadership',15);addRep('social',4);if(el.scope==='club'){const c=S.school?.clubs?.find(x=>x.id===el.clubId);if(c){c.position=el.position;c.leaderNpc=null}}else{S.school.councilRole=el.position;if(!S.school.clubs.some(c=>c.name==='Student Council'&&c.status==='Active'))activateClub({name:'Student Council',status:'Offered'});const sc=S.school.clubs.find(c=>c.name==='Student Council'&&c.status==='Active');if(sc)sc.position=el.position}threadStep(th,'Won',`${all[0].share}% of the vote`,{resolve:true});if(!SIM.skipping){setEmotion('Proud','You won an election.',75);log(`🗳️ You won: ${el.position}`,`${margin<=5?'By a razor-thin margin, ':''}you win with ${all[0].share}% of the vote. ${why}${el.promise?` Now people expect ${el.promise}.`:''}`,true);if(el.promise)scheduleFollowUp('promiseCheck',{electionId:el.id},{days:30,minute:780})}}
 else{addRep('leadership',3);if(el.scope==='club'){const c=S.school?.clubs?.find(x=>x.id===el.clubId);if(c)c.leaderNpc=winner.name}threadStep(th,'Lost',`${winner.name} won with ${winner.share}%`,{resolve:true});if(!SIM.skipping){setEmotion('Disappointed','You lost an election.',55);queueEvent({type:'electionLost',title:`${winner.name} won the election`,text:`You got ${all.find(x=>x.id==='player').share}% of the vote. ${why} What now?`,payload:{electionId:el.id,winnerId:winner.id},priority:3,expiresDays:3,choices:[{id:'support',label:`Congratulate ${winner.name} and offer help`},{id:'elsewhere',label:'Look for leadership elsewhere'},{id:'nextYear',label:'Plan to run again next year'},{id:'sulk',label:'Keep your distance'}]})}}
}
function handleElectionLost(e,id){const el=S.elections?.find(x=>x.id===e.payload?.electionId),npc=npcById(e.payload?.winnerId);let story;
 if(id==='support'){addRep('kindness',4);addRep('leadership',2);if(npc){let p=S.people.find(x=>x.npcId===npc.id);if(!p){p=personFromNpc(npc,'friend','classmate');p.rel=45;S.people.push(p)}p.rel=clamp(p.rel+8);rememberPerson(p,'You congratulated them after the election and offered to help.',2)}story=`You shake ${npc?.fullName||'the winner'}'s hand and offer to help. People notice — and remember.`}
 else if(id==='elsewhere'){story='You start paying attention to other clubs where you could lead.';exploreSchoolActivity()}
 else if(id==='nextYear'){S.flags.runAgain=true;story='You quietly decide you will run again — better prepared.';}
 else{S.happiness=clamp(S.happiness-2);story='You keep your distance from the winner for a while. It does not make you feel better.'}
 if(el)recordOutcome('Election',el.position,'Aftermath',story);log('After the election',story);return true}
function maybeOfferElection(c){if(c.status!=='Active'||!S.school||!electionGradeOK())return;const L=ladderFor(c),i=L.indexOf(c.position);if(i<L.length-3)return;if(S.elections?.some(e=>e.clubId===c.id&&(e.status==='Campaign'||daysBetween(e.startDate,currentDate())<300)))return;if(daysBetween(c.joinedDate||currentDate(),currentDate())<45)return;
 queueEvent({type:'electionOffer',title:`${c.name} is choosing its next ${L[L.length-1]}`,text:`As ${c.position}, you are eligible to run. Campaigning takes a week and you might lose.`,payload:{clubId:c.id},priority:3,expiresDays:3,choices:[{id:'run',label:`Run for ${L[L.length-1]}`},{id:'vp',label:`Run for ${L[L.length-2]}`},{id:'pass',label:'Not this time'}]})}
function handleElectionOffer(e,id){const c=S.school?.clubs?.find(x=>x.id===e.payload?.clubId);if(!c)return true;const L=ladderFor(c);if(id==='pass'){log('Not running',`You let others run for ${c.name} leadership this year.`);return true}startElection({scope:'club',name:c.name,clubId:c.id,position:id==='run'?L[L.length-1]:L[L.length-2]});return true}
function electionHtml(){const live=(S.elections||[]).filter(e=>e.status==='Campaign');if(!live.length)return '';return live.map(el=>{const d=daysBetween(currentDate(),el.date);return `<div class="session-card is-live"><div class="session-head"><div><b>🗳️ Running for ${esc(el.position)}${el.scope==='club'?` • ${esc(el.name)}`:''}</b><small>Election ${d<=0?'today':`in ${d} day${d===1?'':'s'}`} • against ${esc(el.opponents.map(o=>o.name).join(', '))} • campaign strength ${Math.round(el.points)}</small></div></div><div class="session-actions">${Object.entries(CAMPAIGN).filter(([,c])=>S.age>=(c.minAge||0)).map(([k,c])=>`<button class="small ${el.done[`${k}-${currentDate()}`]?'ghost':''}" data-campaign="${el.id}" data-kind="${k}" ${el.done[`${k}-${currentDate()}`]?'disabled':''}>${esc(c.label)}</button>`).join('')}</div>${el.promise?`<small class="muted-text">You promised ${esc(el.promise)}.</small>`:''}</div>`}).join('')}
function tryoutsHtml(){const list=(S.school?.tryouts||[]).filter(t=>t.status==='Scheduled'||(t.status==='Completed'&&['Not selected','No-show','Waitlisted'].includes(t.result)&&daysBetween(t.dateISO,currentDate())<=40));if(!list.length)return '';return list.map(t=>{const info=clubInfo(t.club),today=t.dateISO===currentDate();if(t.status==='Scheduled')return `<div class="commitment-card"><div><b>${esc(t.club)} ${esc(info.entry)} • ${today?'today':formatDate(t.dateISO)} ${timeLabel(930)}</b><small>${esc(t.coach)} looks at: ${esc(info.parts.join(', '))}${t.attempt>1?` • attempt ${t.attempt}`:''}</small><div class="progress"><i style="width:${clamp(t.prep)}%"></i></div><small>Preparation ${t.prep}%</small></div><div class="inline-actions">${today?`<button class="small primary" data-tryout-go="${t.id}">Go to ${esc(info.entry)}</button>`:''}${Object.entries(PREP_MODES).map(([k,m])=>`<button class="small ghost" data-tryout-prep="${t.id}" data-mode="${k}">${esc(m.label)}${m.cost?` • ${money(m.cost)}`:''}</button>`).join('')}</div></div>`;
  return `<div class="commitment-card"><div><b>${esc(t.club)}: ${esc(t.result)}</b><small>${t.components?Object.entries(t.components).map(([k,v])=>`${k} ${v}`).join(' • '):''}</small><small>${t.result==='Waitlisted'?'Waiting to hear if a spot opens.':`Next ${info.entry}: ${formatDate(t.nextDate||currentDate())}`}</small></div>${t.result!=='Waitlisted'?`<div class="inline-actions"><button class="small" data-tryout-retry="${t.id}">Sign up to try again</button>${info.kind==='sport'?`<button class="small ghost" data-tryout-rec="${t.id}">Join the recreational league</button>`:''}</div>`:''}</div>`}).join('')}
function handleClubClick(b){
 const d=b.dataset;
 if(d.activitySignup){signUpForActivity(d.activitySignup);save();render();return true}
 if(d.activityInfo){const o=S.school?.activityOffers?.find(x=>x.id===d.activityInfo),i=clubInfo(o?.name);if(o)openModal(o.name,`<p>${i.kind==='open'?'Open club — anyone can sign up.':i.kind==='sport'?`Sport — requires a tryout. The coach evaluates ${i.parts.join(', ').toLowerCase()}. About ${i.spots} spots.`:i.kind==='elected'?'Student Council — you get in by winning an election.':`Selective — requires an audition: ${i.parts.join(', ').toLowerCase()}.`}</p><p class="muted-text">Relevant skills: ${i.skills.map(k=>SKILL_LABEL[k]||k).join(', ')||'none in particular'}. Your level: ${Math.round(clubSkillScore(o.name))}. Positions: ${(LADDERS[i.ladder]||LADDERS.generic).join(' → ')}.</p><div class="modal-action-grid single"><button data-close-modal="1">Close</button></div>`);return true}
 if(d.tryoutPrep){practiceForTryout(d.tryoutPrep,d.mode);save();render();return true}
 if(d.tryoutGo){attendTryout(d.tryoutGo);save();render();return true}
 if(d.tryoutRetry){retryTryout(d.tryoutRetry);save();render();return true}
 if(d.tryoutRec){joinRecreational(d.tryoutRec);save();render();return true}
 if(d.campaign){campaignAction(d.campaign,d.kind);save();render();return true}
 if(d.runCouncil){startElection({scope:'council',name:'Student Council',position:'Class representative'});save();render();return true}
 return false
}
