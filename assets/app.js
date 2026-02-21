function el(id){return document.getElementById(id)}
function qs(name){return new URLSearchParams(location.search).get(name)}

function setSaveModeLabel(text){
  const el = document.getElementById("saveMode");
  if(el) el.textContent = text;
}

function identityUser(){
  try{ return window.netlifyIdentity && window.netlifyIdentity.currentUser(); }catch{ return null; }
}
async function identityToken(){
  const u = identityUser();
  if(!u) return null;
  try{ return await u.jwt(); }catch{ return null; }
}
function initIdentityUI(){ /* לא נדרש בגרסה הזו */ }

async function cloudGet(personId, week, docKey){
  const url = `/.netlify/functions/data?personId=${encodeURIComponent(personId)}&week=${encodeURIComponent(week)}&docKey=${encodeURIComponent(docKey)}`;
  const res = await fetch(url);
  if(!res.ok) return null;
  const j = await res.json();
  return j && j.ok ? (j.data || null) : null;
}
async function cloudSet(personId, week, docKey, payload){
  const url = `/.netlify/functions/data?personId=${encodeURIComponent(personId)}&week=${encodeURIComponent(week)}&docKey=${encodeURIComponent(docKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if(!res.ok){
    const t = await res.text().catch(()=> "");
    throw new Error(t || "שגיאה בשמירה בענן");
  }
  return true;
}

function escapeHtml(s){return (s||"").replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}

const DOCS = {
  obs: {
    title: "דף תצפית + המשך",
    fields: [
      {type:"date", name:"obs_date", label:"תאריך התצפית"},
      {type:"text", name:"mentor_name", label:"שם החונך הנצפה"},
      {type:"text", name:"mentee_name", label:"שם הנחנך"},
      {type:"text", name:"activity_topic", label:"נושא/סוג הפעילות"},
      {type:"textarea", name:"obs_open_seen", label:"פתיחת המפגש – מה ראיתי?"},
      {type:"textarea", name:"obs_open_examples", label:"פתיחת המפגש – דוגמאות ספציפיות"},
      {type:"textarea", name:"obs_listen_seen", label:"הקשבה ותקשורת – מה ראיתי?"},
      {type:"textarea", name:"obs_listen_examples", label:"הקשבה ותקשורת – דוגמאות ספציפיות"},
      {type:"textarea", name:"obs_structure_seen", label:"הבניית התהליך – מה ראיתי?"},
      {type:"textarea", name:"obs_structure_examples", label:"הבניית התהליך – דוגמאות ספציפיות"},
      {type:"textarea", name:"free_desc", label:"תארו את המפגש במילים שלכם"},
      {type:"textarea", name:"key_points", label:"נקודות מפתח שלמדתי"},
      {type:"textarea", name:"questions_raised", label:"שאלות שעלו"},
      {type:"textarea", name:"keep", label:"לשמר 💚"},
      {type:"textarea", name:"improve", label:"לשפר 🔧"},
      {type:"textarea", name:"next_week_goals", label:"יעדים לשבוע הבא"},
    ]
  },
  ref: {
    title: "דף רפלקציה",
    fields: [
      {type:"text", name:"ref_name", label:"שם הנחנך"},
      {type:"date", name:"ref_date", label:"תאריך"},
      {type:"number", name:"ref_week", label:"שבוע בתהליך (1–8)", min:1, max:8},
      {type:"textarea", name:"ref_q1", label:"1. איך אני מרגיש/ה בתהליך החניכה עד כה?"},
      {type:"textarea", name:"ref_q2", label:"2. מה היו הרגעים המשמעותיים ביותר עבורי?"},
      {type:"textarea", name:"ref_q3", label:"3. באילו תחומים אני מרגיש/ה שהתקדמתי?"},
      {type:"textarea", name:"ref_q4", label:"4. מה מאתגר אותי במיוחד?"},
      {type:"textarea", name:"ref_q5", label:"5. איזה סוג תמיכה אני צריך/ה מהחונך שלי?"},
      {type:"textarea", name:"ref_q6", label:"6. איך אני לומד/ת הכי טוב?"},
      {type:"textarea", name:"ref_q7", label:"7. מה הייתי רוצה לשנות או לשפר בתהליך?"},
      {type:"textarea", name:"ref_q8", label:"8. מהן המטרות שלי לשבועות הקרובים?"},
      {type:"textarea", name:"ref_q9", label:"9. נושאים שהייתי רוצה לדון בהם בשיחת המשוב"},
    ]
  }
};

function buildFieldHTML(f){
  const id = `f_${f.name}`;
  const common = `id="${id}" name="${escapeHtml(f.name)}"`;
  const wrapClass = (f.type==="textarea") ? "field" : "field half";
  if(f.type==="textarea"){
    return `<div class="${wrapClass}">
      <label for="${id}">${escapeHtml(f.label)}</label>
      <textarea ${common} rows="5"></textarea>
    </div>`;
  }
  const attrs = [
    `type="${escapeHtml(f.type)}"`,
    common,
    (f.min!==undefined)?`min="${f.min}"`:"",
    (f.max!==undefined)?`max="${f.max}"`:""
  ].filter(Boolean).join(" ");
  return `<div class="${wrapClass}">
    <label for="${id}">${escapeHtml(f.label)}</label>
    <input ${attrs}>
  </div>`;
}

function formToObject(form){
  const fd = new FormData(form);
  const obj = {};
  for(const [k,v] of fd.entries()) obj[k]=v;
  return obj;
}
function fillForm(form, data){
  if(!data) return;
  for(const [k,v] of Object.entries(data)){
    const e = form.elements?.[k];
    if(e) e.value = v;
  }
}

function storageKey(personId, week, docKey){
  return `mentor:v1:person-${personId}:week-${week}:${docKey}`;
}

async function openDocModal(person, week, docKey){
  const modal = el("modalBackdrop");
  const title = el("modalTitle");
  const form = el("docForm");
  const saveBtn = el("saveBtn");
  const reloadBtn = el("reloadBtn");
  const closeBtn = el("closeModalBtn");
  const saveState = el("saveState");
  const doc = DOCS[docKey];

  title.textContent = `${person.name} • שבוע ${week} • ${doc.title}`;
  form.innerHTML = doc.fields.map(buildFieldHTML).join("\n");

  function show(){ modal.style.display="flex"; }
  function hide(){ modal.style.display="none"; }

  function loadSaved(){
    // קודם מנסים ענן (אם מחובר), אחרת דפדפן
    (async ()=>{
      const cloud = await cloudGet(person.id, week, docKey);
      if(cloud && cloud.data){
        fillForm(form, cloud.data);
        saveState.textContent = cloud.savedAt ? `נטען (ענן • ${new Date(cloud.savedAt).toLocaleString("he-IL")})` : "נטען (ענן)";
        return;
      }
      const raw = localStorage.getItem(storageKey(person.id, week, docKey));
      if(!raw){ saveState.textContent="אין גרסה שמורה"; return; }
      try{
        const parsed = JSON.parse(raw);
        fillForm(form, parsed.data);
        saveState.textContent = parsed.savedAt ? `נטען (דפדפן • ${new Date(parsed.savedAt).toLocaleString("he-IL")})` : "נטען";
      }catch{
        saveState.textContent="שגיאה בטעינה";
      }
    })();
  }

  async function save(){
    const data = formToObject(form);
    const payload = { savedAt: new Date().toISOString(), data };
    // אם מחובר – נשמור בענן. אם לא – נשמור בדפדפן.
    try{
      if(identityUser()){
        await cloudSet(person.id, week, docKey, payload);
        saveState.textContent="נשמר בענן ✅";
      }else{
        localStorage.setItem(storageKey(person.id, week, docKey), JSON.stringify(payload));
        saveState.textContent="נשמר בדפדפן ✅";
      }
    }catch(e){
      // נפילה לענן -> בדפדפן
      localStorage.setItem(storageKey(person.id, week, docKey), JSON.stringify(payload));
      saveState.textContent="נשמר בדפדפן ✅";
    }
  }


  loadSaved();
  saveBtn.onclick = save;
  reloadBtn.onclick = loadSaved;
  closeBtn.onclick = hide;
  modal.onclick = (ev)=>{ if(ev.target===modal) hide(); };
  show();
}

async function renderStaff(){
  const list = el("staffList");
  if(!list) return;
  const people = await fetch("/assets/people.json").then(r=>r.json());
  list.innerHTML = people.map(p=>(
    `<a class="person" href="/person.html?p=${p.id}">
      <span class="name">${escapeHtml(p.name)}</span><span class="go">כניסה</span>
    </a>`
  )).join("\n");
}

async function renderPerson(){
  const pid = qs("p");
  if(!pid){ location.href="/staff.html"; return; }
  const people = await fetch("/assets/people.json").then(r=>r.json());
  const person = people.find(x=>String(x.id)===String(pid));
  if(!person){ location.href="/staff.html"; return; }

  el("personTitle").textContent = person.name;
  el("personNav").textContent = person.name;

  const weeksEl = el("weeks");
  weeksEl.innerHTML="";
  for(let w=1; w<=8; w++){
    const div = document.createElement("div");
    div.className = "week";
    div.innerHTML = `
      <div class="week-title"><b>שבוע ${w}</b><span class="small">2 מסמכים</span></div>
      <div class="actions">
        <button class="btn secondary" type="button" data-doc="obs" data-week="${w}">דף תצפית + המשך</button>
        <button class="btn secondary" type="button" data-doc="ref" data-week="${w}">דף רפלקציה</button>
      </div>
    `;
    div.querySelectorAll("button[data-doc]").forEach(btn=>{
      btn.addEventListener("click", ()=>openDocModal(person, btn.dataset.week, btn.dataset.doc));
    });
    weeksEl.appendChild(div);
  }
}

document.addEventListener("DOMContentLoaded", async ()=>{
  initIdentityUI();
  const path = location.pathname.replace(/\/+$/,"");
  if(path.endsWith("/staff.html") || path.endsWith("/staff")){
    await renderStaff();
  }
  if(path.endsWith("/person.html") || path.endsWith("/person")){
    await renderPerson();
  }
});


// ===== ייצוא PDF למסמך הפתוח =====
function exportCurrentDocToPDF(){
  try{
    if(typeof html2pdf === "undefined"){
      alert("ספריית PDF לא נטענה. נסה רענון.");
      return;
    }
    const modal = document.querySelector(".modal");
    const card = modal && modal.querySelector(".modal-card");
    if(!card){
      alert("לא נמצא מסמך לייצוא.");
      return;
    }

    // יוצרים עותק נקי ל-PDF (בלי כפתורים/חיווי)
    const clone = card.cloneNode(true);

    // הסרת כפתורים בחלק העליון/תחתון
    clone.querySelectorAll("button").forEach(b => b.remove());

    // נוחות: כותרת מסמך בראש
    const titleEl = document.getElementById("modalTitle");
    const title = titleEl ? titleEl.textContent.trim() : "מסמך";
    const h = document.createElement("h2");
    h.textContent = title;
    h.style.cssText = "margin:0 0 10px 0; font-family:Heebo,Arial,sans-serif; text-align:right;";
    clone.prepend(h);

    // שם+שבוע בקובץ
    const pid = qs("personId") || "person";
    const week = qs("week") || "week";
    const filename = `${pid}-${week}-${title}`.replace(/[\\/:*?"<>|]/g, "_") + ".pdf";

    const opt = {
      margin: 10,
      filename,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
    };

    html2pdf().set(opt).from(clone).save();
  }catch(e){
    alert("שגיאה בייצוא PDF");
  }
}

document.addEventListener("click", function(e){
  const t = e.target;
  if(t && t.id === "pdfBtn"){
    exportCurrentDocToPDF();
  }
});
