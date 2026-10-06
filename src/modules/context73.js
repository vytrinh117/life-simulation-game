
// =====================================================================
// v7.3 PHASE 1A — LIFE CONTEXT ENGINE
// One authoritative place for: term vs break, where you are, which household you live in,
// and whether an action is possible right now (with the reason when it is not).
// =====================================================================
function termPhase(date=currentDate()){const a=academicInfo(date);if(!a.semester)return a.phase==='summer'?'summer':'semesterBreak';const br=a.breaks.find(b=>date>=b.from&&date<=b.to);return br?'break':'term'}
function isSchoolTermActive(date=currentDate()){return termPhase(date)==='term'}
function isSchoolBreak(date=currentDate()){return termPhase(date)!=='term'}
function isSummerBreak(date=currentDate()){return termPhase(date)==='summer'}
function breakName(date=currentDate()){const a=academicInfo(date),p=termPhase(date);if(p==='summer')return 'Summer break';if(p==='semesterBreak')return 'Semester break';if(p==='break')return (a.breaks.find(b=>date>=b.from&&date<=b.to)||{}).name||'School break';return null}
function nextTermDay(date=currentDate()){return nextSchoolDay(addDays(date,1))}
// ---------- household ----------
function livesWithParents(){if(S.age<18)return true;const h=S.housing?.type||'parents';return h==='parents'}
function currentHouseholdId(){if(livesWithParents())return 'family';return S.housing?.type==='withPartner'?'partner':S.housing?.type==='dorm'?'dorm':'own'}
// ---------- location ----------
function isAtHome(){return !atSchool()&&(S.location||'Home')==='Home'}
function isAtSchool(){return atSchool()||S.location==='School'}
function teacherAvailable(){const m=currentMinute();return needsFormalSchool()&&isSchoolDay()&&m>=465&&m<=990&&isAtSchool()}
// ---------- actions ----------
const ACTION_RULES={
 teacherStudy:()=>!needsFormalSchool()?'You are not in school.':isSchoolBreak()?`${breakName()} — teachers are not at school. Classes resume ${formatDate(nextTermDay())}.`:!isSchoolDay()?'No school today.':!isAtSchool()?'Teachers are only available at school.':(currentMinute()<465||currentMinute()>990)?'Teachers are available from 7:45 AM to 4:30 PM.':null,
 exploreSchoolEvent:()=>!needsFormalSchool()?'Formal school events are not part of this life stage.':isSchoolBreak()?`${breakName()} — school events are announced when classes resume (${formatDate(nextTermDay())}).`:null,
 householdChore:()=>!livesWithParents()?'You no longer live with your parents — there are no house chores to do for them here.':!isAtHome()?'Chores happen at home.':null
};
function canPerformAction(id){const f=ACTION_RULES[id];const why=f?f():null;return {ok:!why,why}}
function requireAction(id){const r=canPerformAction(id);if(!r.ok)toast(r.why);return r.ok}
// ---------- parents' messages depend on where you live ----------
const PARENT_SOCIAL={texts:['Come over for dinner this Sunday?','How is the new place? Call me when you can 😊','Your dad says hi. Visit soon?','Saw something that reminded me of you ❤️'],opts:[['warm','Reply warmly'],['ok','"Sounds good!"'],['ignore','Ignore it']]};
function parentMessageKind(){return livesWithParents()?'parent':'parentSocial'}

CHAT_KINDS.parentSocial=PARENT_SOCIAL;
