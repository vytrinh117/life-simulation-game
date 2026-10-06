
// =====================================================================
// v7.3 CHARACTER CREATOR FIXES
// • Each Random button changes only its own field.
// • Horoscope is derived from the birth date (read-only).
// • Two modes: Surprise me (everything) / Fill the rest (empty fields only).
// • Birthplace = Country dropdown → City/State dropdown (no free text).
// • A new life is born in the real current year (device clock). The QA harness (?qa=1) may use historical dates.
// =====================================================================
const QA_MODE=/[?&]qa=1/.test(location.search);
const CURRENT_YEAR=new Date().getFullYear();
const COUNTRY_CITIES={
 'Vietnam':['Hanoi','Ho Chi Minh City','Da Nang','Hai Phong','Can Tho','Hue','Nha Trang'],
 'USA':['New York City, New York','Los Angeles, California','Chicago, Illinois','Houston, Texas','Seattle, Washington','Miami, Florida','Boston, Massachusetts'],
 'UK':['London, England','Manchester, England','Birmingham, England','Edinburgh, Scotland','Cardiff, Wales'],
 'Canada':['Vancouver, British Columbia','Toronto, Ontario','Montreal, Quebec','Calgary, Alberta'],
 'Australia':['Sydney, New South Wales','Melbourne, Victoria','Brisbane, Queensland','Perth, Western Australia'],
 'South Korea':['Seoul','Busan','Incheon','Daegu'],
 'Japan':['Tokyo','Osaka','Kyoto','Sapporo','Fukuoka'],
 'China':['Beijing','Shanghai','Guangzhou','Shenzhen'],
 'France':['Paris','Lyon','Marseille','Toulouse','Nice'],
 'Singapore':['Singapore'],
 'Thailand':['Bangkok','Chiang Mai','Phuket']
};
const CREATOR_OPTIONS={gender:['Girl','Boy','Non-binary','Other'],attraction:['Men','Women','All genders','Not sure yet','Asexual / romantic'],wealth:['Struggling','Modest','Middle class','Comfortable','Wealthy','Extremely wealthy'],home:['Warm and stable','Busy but loving','Strict','Chaotic','Quiet','Highly privileged','Unpredictable']};
function randomBirthDate(){const start=Date.UTC(CURRENT_YEAR,0,1),days=(Date.UTC(CURRENT_YEAR+1,0,1)-start)/864e5;return isoDate(new Date(start+Math.floor(Math.random()*days)*864e5))}
function placeValue(){const c=$('c-country')?.value,city=$('c-city')?.value;if(!c||!city)return '';return city===c?c:`${city}, ${c}`}
function fillCities(country,keep=null){const sel=$('c-city');if(!sel)return;const list=COUNTRY_CITIES[country]||[];sel.innerHTML=`<option value="">${country?'Choose a city…':'Choose a country first'}</option>`+list.map(c=>`<option>${esc(c)}</option>`).join('');sel.disabled=!country;if(keep&&list.includes(keep))sel.value=keep}
function syncPlace(){$('c-place').value=placeValue()}
function syncZodiac(){const v=$('c-dob').value,out=$('c-zodiac-view');if(out)out.textContent=v?zodiacFromDate(v):'Set a birth date';$('c-zodiac').value='auto'}
function randomField(key){
 if(key==='name')$('c-name').value=rand(D.names);
 else if(key==='surname'){const pool={Vietnam:'VN','South Korea':'KR',Japan:'JP',China:'CN',France:'FR',Thailand:'TH'}[$('c-country')?.value]||'EN';$('c-surname').value=rand((NAME_POOLS[pool]||NAME_POOLS.EN).last)}
 else if(key==='looks'||key==='smart'){$(`c-${key}`).value=Math.round(25+Math.random()*35+Math.random()*35)}
 else if(key==='dob'){$('c-dob').value=randomBirthDate();syncZodiac()}
 else if(key==='place'){const c=rand(Object.keys(COUNTRY_CITIES));$('c-country').value=c;fillCities(c);$('c-city').value=rand(COUNTRY_CITIES[c]);syncPlace()}
 else if(CREATOR_OPTIONS[key])$(`c-${key}`).value=rand(CREATOR_OPTIONS[key]);
 else if(key==='personality'){selectedP=[rand(D.personalities),rand(D.personalities)].filter((x,i,a)=>a.indexOf(x)===i);chips('personality',D.personalities,selectedP)}
 else if(key==='talents'){selectedT=[rand(D.talents),rand(D.talents)].filter((x,i,a)=>a.indexOf(x)===i);chips('talents',D.talents,selectedT)}
}
const CREATOR_FIELDS=['name','surname','looks','smart','dob','place','gender','attraction','wealth','home','personality','talents'];
function fieldEmpty(key){if(key==='name')return !$('c-name').value.trim();if(['surname','looks','smart'].includes(key))return !String($(`c-${key}`)?.value||'').trim();if(key==='dob')return !$('c-dob').value;if(key==='place')return !placeValue();if(key==='personality')return !selectedP.length;if(key==='talents')return !selectedT.length;return !$(`c-${key}`).value}
function randomize(){CREATOR_FIELDS.forEach(randomField);toast('Character randomized')}
function fillRest(){const empty=CREATOR_FIELDS.filter(fieldEmpty);empty.forEach(randomField);toast(empty.length?`Filled ${empty.length} empty field${empty.length===1?'':'s'}`:'Everything is already filled in')}
function setupCreator(){
 const dob=$('c-dob');if(!dob||dob.dataset.ready)return;dob.dataset.ready='1';
 if(!QA_MODE){dob.min=`${CURRENT_YEAR}-01-01`;dob.max=`${CURRENT_YEAR}-12-31`}
 const cs=$('c-country');cs.innerHTML='<option value="">Choose a country…</option>'+Object.keys(COUNTRY_CITIES).map(c=>`<option>${esc(c)}</option>`).join('');fillCities('');
 cs.addEventListener('change',()=>{fillCities(cs.value);syncPlace()});$('c-city').addEventListener('change',syncPlace);
 dob.addEventListener('change',syncZodiac);dob.addEventListener('input',syncZodiac);syncZodiac();
 const fr=$('fill-rest');if(fr)fr.addEventListener('click',fillRest);
}
function creatorDob(v){
 let dob=v||randomBirthDate();
 if(!QA_MODE&&dob.slice(0,4)!==String(CURRENT_YEAR)){dob=`${CURRENT_YEAR}${dob.slice(4)}`;if(!/^\d{4}-\d{2}-\d{2}$/.test(dob)||isNaN(parseISO(dob)))dob=randomBirthDate()}
 return dob
}
setTimeout(setupCreator,0);

// Fix: the original zodiac table returned Capricorn for every date after a sign's cutoff day (e.g. Jul 23 → Capricorn).
function zodiacFromDate(dateISO){const d=parseISO(dateISO),m=d.getUTCMonth()+1,day=d.getUTCDate();const signs=['Capricorn','Aquarius','Pisces','Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius'],cut=[19,18,20,19,20,20,22,22,22,22,21,21];return day<=cut[m-1]?signs[m-1]:signs[m%12]}
