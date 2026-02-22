const FALLBACK_PEOPLE = [
  {
    "id": "adam",
    "name": "אדם לרנר"
  },
  {
    "id": "osher",
    "name": "אושר קריספל"
  },
  {
    "id": "eliyahu",
    "name": "אליהו דבקרוב"
  },
  {
    "id": "binyahu",
    "name": "בניהו שמואליאן"
  },
  {
    "id": "harel",
    "name": "הראל רחימי"
  },
  {
    "id": "yaniv",
    "name": "יניב לוריה"
  },
  {
    "id": "liad",
    "name": "ליעד לביא"
  },
  {
    "id": "noya",
    "name": "נויה קלדרון"
  },
  {
    "id": "ido",
    "name": "עידו גרשום"
  },
  {
    "id": "idan",
    "name": "עידן זוראל"
  },
  {
    "id": "sharel",
    "name": "שראל אלסיט"
  },
  {
    "id": "michal",
    "name": "מיכל פיגרין"
  }
];

function qs(name){
  const u = new URL(location.href);
  return u.searchParams.get(name);
}

async function loadPeople(){
  try{
    const r = await fetch("/assets/people.json", { cache:"no-store" });
    if(!r.ok) throw new Error("people.json");
    const j = await r.json();
    if(Array.isArray(j) && j.length) return j;
    throw new Error("empty");
  }catch(e){
    return FALLBACK_PEOPLE;
  }
}

async function apiListPeople(){
  try{
    const r = await fetch("/.netlify/functions/data", { cache:"no-store" });
    if(!r.ok) throw new Error("api");
    const j = await r.json();
    if(j && j.ok && Array.isArray(j.people) && j.people.length) return j.people;
  }catch(e){}
  return null;
}

async function cloudGet(personId, week, doc){
  const url = `/.netlify/functions/data?personId=${encodeURIComponent(personId)}&week=${encodeURIComponent(week)}&doc=${encodeURIComponent(doc)}`;
  const res = await fetch(url, { cache:"no-store" });
  if(!res.ok) return null;
  const j = await res.json();
  return j && j.ok ? (j.data || null) : null;
}

async function cloudSet(personId, week, doc, payload){
  const url = `/.netlify/functions/data?personId=${encodeURIComponent(personId)}&week=${encodeURIComponent(week)}&doc=${encodeURIComponent(doc)}`;
  const res = await fetch(url, {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify(payload)
  });
  if(!res.ok){
    const t = await res.text().catch(()=> "");
    throw new Error(t || "שגיאה בשמירה בענן");
  }
  const j = await res.json().catch(()=> ({ok:true}));
  if(j && j.ok === false) throw new Error(j.error || "שגיאה");
  return true;
}

function storageKey(personId, week, doc){
  return `mentor_local_${personId}_${week}_${doc}`;
}

function el(tag, attrs={}, children=[]){
  const e = document.createElement(tag);
  for(const [k,v] of Object.entries(attrs)){
    if(k==="class") e.className=v;
    else if(k.startsWith("on")) e.addEventListener(k.substring(2), v);
    else e.setAttribute(k,v);
  }
  for(const c of children){
    if(typeof c==="string") e.appendChild(document.createTextNode(c));
    else if(c) e.appendChild(c);
  }
  return e;
}

function renderStaffCard(p){
  return el("a", { class:"card person-card", href:`/person.html?personId=${encodeURIComponent(p.id)}` }, [
    el("div", {class:"name"}, [p.name]),
    el("div", {class:"badge"}, ["לחץ לפתיחה"])
  ]);
}

async function renderStaff(){
  const grid = document.getElementById("staffGrid");
  if(!grid) return;

  const apiPeople = await apiListPeople();
  const list = apiPeople || await loadPeople();

  grid.innerHTML = "";
  list.forEach(p => grid.appendChild(renderStaffCard(p)));
}

function buildWeekCard(person, week){
  return el("div", {class:"week"}, [
    el("h3", {}, [`שבוע ${week}`]),
    el("div", {class:"btnrow"}, [
      el("button", {class:"btn secondary", type:"button", onclick:()=>openDoc(person, week, "obs")}, ["דף תצפית + המשך"]),
      el("button", {class:"btn secondary", type:"button", onclick:()=>openDoc(person, week, "ref")}, ["דף רפלקציה"]),
      el("div", {class:"small"}, ["המסמכים נשמרים בענן משותף"])
    ])
  ]);
}

function getPersonNameById(people, id){
  const p = people.find(x=>x.id===id);
  return p ? p.name : "צוער/ת";
}

async function renderPersonFolder(){
  const grid = document.getElementById("weekGrid");
  if(!grid) return;

  const personId = qs("personId");
  if(!personId){
    location.href="/staff.html";
    return;
  }

  const apiPeople = await apiListPeople();
  const list = apiPeople || await loadPeople();
  const name = getPersonNameById(list, personId);

  const title = document.getElementById("personTitle");
  const sub = document.getElementById("personSubtitle");
  if(title) title.textContent = name;
  if(sub) sub.textContent = "בחרו שבוע ומסמך";

  grid.innerHTML="";
  for(let w=1; w<=8; w++){
    grid.appendChild(buildWeekCard({id:personId, name}, w));
  }
}

const modalBackdrop = ()=>document.getElementById("modalBackdrop");
const docForm = ()=>document.getElementById("docForm");
const saveState = ()=>document.getElementById("saveState");
let CURRENT = null;

function openModal(){ modalBackdrop().classList.add("open"); }
function closeModal(){ modalBackdrop().classList.remove("open"); }

function setModalTitle(t){
  const elT = document.getElementById("modalTitle");
  if(elT) elT.textContent = t;
}

function row3(title, sub, a, b){
  return el("tr", {}, [
    el("td", {}, [el("div", {}, [title]), el("div", {class:"small"}, [sub])]),
    el("td", {}, [el("textarea", {name:a})]),
    el("td", {}, [el("textarea", {name:b})]),
  ]);
}

function buildObsForm(){
  const f = docForm();
  f.innerHTML = "";
  f.appendChild(el("fieldset", {}, [
    el("legend", {}, ["פרטי תצפית"]),
    el("label", {}, ["תאריך התצפית"]),
    el("input", {name:"date", type:"date"}),
    el("label", {}, ["שם החונך הנצפה"]),
    el("input", {name:"mentor", type:"text"}),
    el("label", {}, ["שם הנחנך"]),
    el("input", {name:"mentee", type:"text"}),
  ]));

  f.appendChild(el("fieldset", {}, [
    el("legend", {}, ["קריטריונים להתבוננות"]),
    el("table", {class:"table"}, [
      el("thead", {}, [el("tr", {}, [
        el("th", {}, ["קריטריון"]),
        el("th", {}, ["מה ראיתי?"]),
        el("th", {}, ["דוגמאות ספציפיות"])
      ])]),
      el("tbody", {}, [
        row3("פתיחת המפגש", "פתיחה, שיחת ביניים", "open_seen", "open_ex"),
        row3("הקשבה ותקשורת", "הקשבה פעילה, שאלות, הבהרות", "listen_seen", "listen_ex"),
        row3("הבניית התהליך", "מבנה, סדר, בהירות", "structure_seen", "structure_ex"),
      ])
    ])
  ]));

  f.appendChild(el("fieldset", {}, [
    el("legend", {}, ["המשך תצפית"]),
    el("label", {}, ["תארו את המפגש במילים שלכם"]),
    el("textarea", {name:"free_desc"}),
    el("label", {}, ["נקודות מפתח שלמדתי"]),
    el("textarea", {name:"key_points"}),
    el("label", {}, ["שאלות שעלו"]),
    el("textarea", {name:"questions"}),
    el("label", {}, ["לשמר"]),
    el("textarea", {name:"keep"}),
    el("label", {}, ["לשפר"]),
    el("textarea", {name:"improve"}),
    el("label", {}, ["יעדים לשבוע הבא"]),
    el("textarea", {name:"next_goals"}),
  ]));
}

function buildRefForm(){
  const f = docForm();
  f.innerHTML = "";
  f.appendChild(el("fieldset", {}, [
    el("legend", {}, ["פרטי רפלקציה"]),
    el("label", {}, ["שם הנחנך"]),
    el("input", {name:"name", type:"text"}),
    el("label", {}, ["תאריך"]),
    el("input", {name:"date", type:"date"}),
    el("label", {}, ["שבוע בתהליך"]),
    el("input", {name:"weeknum", type:"number", min:"1", max:"8"}),
  ]));

  const questions = [
    ["q1","איך אני מרגיש/ה בתהליך החניכה עד כה?"],
    ["q2","מה היו הרגעים המשמעותיים ביותר עבורי?"],
    ["q3","באילו תחומים אני מרגיש/ה שהתקדמתי?"],
    ["q4","מה מאתגר אותי במיוחד?"],
    ["q5","איזה סוג תמיכה אני צריך/ה מהחונך שלי?"],
    ["q6","איך אני לומד/ת הכי טוב?"],
    ["q7","מה הייתי רוצה לשנות או לשפר בתהליך?"],
    ["q8","מהן המטרות שלי לשבועות הקרובים?"],
    ["q9","נושאים שהייתי רוצה לדון בהם בשיחת המשוב:"],
  ];
  const fs = el("fieldset", {}, [el("legend", {}, ["שאלות"])]);
  questions.forEach(([k, label])=>{
    fs.appendChild(el("label", {}, [label]));
    fs.appendChild(el("textarea", {name:k}));
  });
  f.appendChild(fs);
}

function formToObject(form){
  const data = {};
  form.querySelectorAll("input, textarea").forEach(elm=>{
    data[elm.name] = elm.value;
  });
  return data;
}

function objectToForm(form, obj){
  form.querySelectorAll("input, textarea").forEach(elm=>{
    elm.value = obj && obj[elm.name] !== undefined ? obj[elm.name] : "";
  });
}

async function loadSaved(){
  if(!CURRENT) return;
  const {person, week, doc} = CURRENT;

  const cloud = await cloudGet(person.id, week, doc);
  if(cloud && cloud.data){
    objectToForm(docForm(), cloud.data);
    saveState().textContent = "נטען מהענן ✅";
    return;
  }

  const local = localStorage.getItem(storageKey(person.id, week, doc));
  if(local){
    try{
      const j = JSON.parse(local);
      if(j && j.data) objectToForm(docForm(), j.data);
      saveState().textContent = "נטען מגיבוי בדפדפן ✅";
      return;
    }catch(e){}
  }
  saveState().textContent = "אין גרסה שמורה";
}

async function save(){
  if(!CURRENT) return;
  const {person, week, doc} = CURRENT;
  const data = formToObject(docForm());
  const payload = { savedAt: new Date().toISOString(), data };
  try{
    await cloudSet(person.id, week, doc, payload);
    saveState().textContent = "נשמר בענן ✅";
  }catch(e){
    localStorage.setItem(storageKey(person.id, week, doc), JSON.stringify(payload));
    saveState().textContent = "נשמר בדפדפן (גיבוי) ✅";
  }
}

function openDoc(person, week, doc){
  CURRENT = {person, week:String(week), doc};
  if(doc === "obs"){
    setModalTitle(`דף תצפית – שבוע ${week}`);
    buildObsForm();
  } else {
    setModalTitle(`דף רפלקציה – שבוע ${week}`);
    buildRefForm();
  }
  openModal();
  loadSaved();
}

function exportPDF(){
  const backdrop = modalBackdrop();
  if(!backdrop.classList.contains("open")){
    alert("פתח מסמך ואז לחץ ייצוא PDF.");
    return;
  }
  if(typeof html2pdf === "undefined"){
    alert("ספריית PDF לא נטענה. נסה רענון.");
    return;
  }

  const title = document.getElementById("modalTitle").textContent.trim();
  const form = docForm();

  const wrapper = document.createElement("div");
  wrapper.style.direction = "rtl";
  wrapper.style.fontFamily = "Heebo, Arial, sans-serif";

  const h = document.createElement("h2");
  h.textContent = title;
  h.style.margin = "0 0 10px 0";
  wrapper.appendChild(h);

  const clone = form.cloneNode(true);
  clone.querySelectorAll("textarea").forEach(t=>{
    const div = document.createElement("div");
    div.style.whiteSpace="pre-wrap";
    div.style.border="1px solid #e5e7eb";
    div.style.borderRadius="10px";
    div.style.padding="10px";
    div.style.margin="6px 0 14px";
    div.textContent = t.value || "";
    t.replaceWith(div);
  });
  clone.querySelectorAll("input").forEach(i=>{
    const div = document.createElement("div");
    div.style.border="1px solid #e5e7eb";
    div.style.borderRadius="10px";
    div.style.padding="8px 10px";
    div.style.margin="6px 0 14px";
    div.textContent = i.value || "";
    i.replaceWith(div);
  });
  wrapper.appendChild(clone);

  const pid = qs("personId") || "person";
  const safe = s => String(s).replace(/[\\/:*?"<>|]/g, "_");
  const filename = safe(`${pid}-${title}`) + ".pdf";

  html2pdf().set({
    margin: 10,
    filename,
    image: { type:"jpeg", quality:0.98 },
    html2canvas: { scale: 2, useCORS:true, scrollY:0 },
    jsPDF: { unit:"mm", format:"a4", orientation:"portrait" }
  }).from(wrapper).save();
}

function wireModalButtons(){
  const closeBtn = document.getElementById("closeBtn");
  const saveBtn = document.getElementById("saveBtn");
  const reloadBtn = document.getElementById("reloadBtn");
  const pdfBtn = document.getElementById("pdfBtn");
  if(closeBtn) closeBtn.addEventListener("click", closeModal);
  if(saveBtn) saveBtn.addEventListener("click", save);
  if(reloadBtn) reloadBtn.addEventListener("click", loadSaved);
  if(pdfBtn) pdfBtn.addEventListener("click", exportPDF);

  const bd = modalBackdrop();
  if(bd){
    bd.addEventListener("click", (e)=>{
      if(e.target === bd) closeModal();
    });
  }
}

document.addEventListener("DOMContentLoaded", async ()=>{
  await renderStaff();
  await renderPersonFolder();
  wireModalButtons();
});