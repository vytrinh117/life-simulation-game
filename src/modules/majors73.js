// =====================================================================
// v7.3 B2 — Majors: declare at university, talent match (+30%) and school strength (+10%) bonuses, degree → career link
// =====================================================================
const MAJORS={
 cs:{label:'Computer Science',talents:['Programming','Math','Gaming'],skill:'programming',jobs:['developer'],aliases:['Computer Science']},
 engineering:{label:'Engineering',talents:['Math','Science'],skill:'knowledge',jobs:['developer'],aliases:['Engineering','Physics']},
 business:{label:'Business',talents:['Business','Leadership'],skill:'business',jobs:['office','sales'],aliases:['Business']},
 economics:{label:'Economics',talents:['Math','Business'],skill:'knowledge',jobs:['office','sales'],aliases:['Economics']},
 law:{label:'Law & Politics',talents:['Leadership','Writing'],skill:'knowledge',jobs:['office'],aliases:['Law & Politics','History']},
 fineArts:{label:'Fine Arts',talents:['Art','Photography'],skill:'art',jobs:['designer','creator'],aliases:['Fine Arts']},
 design:{label:'Design',talents:['Art','Fashion'],skill:'art',jobs:['designer'],aliases:['Design']},
 music:{label:'Music',talents:['Music','Dance'],skill:'music',jobs:['creator'],aliases:['Music']},
 media:{label:'Communications & Media',talents:['Writing','Acting','Photography'],skill:'writing',jobs:['creator','sales','office'],aliases:['Communications','Media']},
 literature:{label:'Literature',talents:['Writing','Languages'],skill:'writing',jobs:['teacherAide','creator'],aliases:['Literature','Philosophy']},
 education:{label:'Education',talents:['Leadership','Languages'],skill:'knowledge',jobs:['teacherAide'],aliases:['Education']},
 psychology:{label:'Psychology',talents:['Languages','Leadership'],skill:'knowledge',jobs:['teacherAide','office'],aliases:['Psychology']},
 biology:{label:'Biology',talents:['Science'],skill:'knowledge',jobs:[],aliases:['Biology','Medicine','Environmental Science','Agriculture']},
 nursing:{label:'Nursing',talents:['Science'],skill:'knowledge',jobs:[],aliases:['Nursing']},
 sports:{label:'Sports Science',talents:['Sports','Dance'],skill:'fitness',jobs:['teacherAide'],aliases:['Sports Science']},
 culinary:{label:'Culinary Arts',talents:['Cooking'],skill:'baking',jobs:[],aliases:['Culinary Arts']}
};
function majorInfo(id){return MAJORS[id]||null}
function majorBonus(id=S.uni?.major){const m=majorInfo(id);if(!m)return {mult:1,talent:null,strength:false,skill:'knowledge'};const talent=(S.talents||[]).find(t=>m.talents.includes(t))||null,school=mySchool()||UNIS.find(x=>x.name===S.uni?.school),strength=!!school?.strengths?.some(s=>m.aliases.includes(s));return {mult:1+(talent?.30:0)+(strength?.10:0),talent,strength,skill:m.skill}}
function bonusText(b){return [b.talent?`+30% (${b.talent} talent)`:'',b.strength?'+10% (a strength of this school)':''].filter(Boolean).join(' • ')}
function declareMajor(id){const u=S.uni,m=majorInfo(id);if(!u?.enrolled||!m)return;if(u.major===id){toast('That is already your major.');return}if(u.major&&(u.majorChanged||u.year>1)){toast('You can change your major only once, during your first year.');return}const old=u.major;if(old)u.majorChanged=true;u.major=id;const b=majorBonus(id);log(old?`Changed major: ${m.label}`:`Declared major: ${m.label}`,`${b.talent||b.strength?`Study bonus: ${bonusText(b)}.`:'No talent match — progress at the normal pace.'}${m.jobs.length?` Good fit for: ${m.jobs.map(j=>D.jobs.adult.find(x=>x.id===j)?.title||j).join(', ')}.`:''}`,true)}
function majorFitsJob(jobId){const m=majorInfo(S.education?.degree?.major);return !!m&&m.jobs.includes(jobId)}
function majorHtml(){const u=S.uni;if(!u?.enrolled)return '';const canChange=!u.major||(!u.majorChanged&&u.year===1);const opts=Object.entries(MAJORS).map(([k,m])=>{const b=majorBonus(k);return `<option value="${k}" ${u.major===k?'selected':''}>${b.talent?'★ ':''}${esc(m.label)}${b.strength?' (school strength)':''}</option>`}).join('');const b=majorBonus();
 return `<div class="major-box">${u.major?`<p><b>Major: ${esc(majorInfo(u.major).label)}</b>${bonusText(b)?` <small class="muted-text">• ${esc(bonusText(b))}</small>`:''}</p>`:'<p class="urgent-text">You have not declared a major yet.</p>'}${canChange?`<div class="inline-actions"><select id="major-pick" aria-label="Major">${opts}</select><button class="small" data-major-declare="1">${u.major?'Change major (once, first year only)':'Declare major'}</button></div><small class="muted-text">★ = matches one of your talents (+30% study progress). Majors listed as this school's strengths add +10%.</small>`:''}</div>`}
function majorClick(b){if(b.dataset.majorDeclare){declareMajor(document.getElementById('major-pick')?.value);save();render();return true}return false}
