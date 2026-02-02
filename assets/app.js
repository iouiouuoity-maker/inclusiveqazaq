import { LESSONS, COMICS, GLOBAL_VOCAB } from "./data.js";

const LS_PROGRESS = "kzsite_progress_v1";
const LS_EMBED = "kzsite_ai_embed_url_v1";

function $(sel){ return document.querySelector(sel); }
function esc(s){ return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

function loadProgress(){
  try{ return JSON.parse(localStorage.getItem(LS_PROGRESS) || "{}"); }
  catch{ return {}; }
}
function saveProgress(p){ localStorage.setItem(LS_PROGRESS, JSON.stringify(p)); }

function normalizeText(s){
  return String(s).trim().replace(/\s+/g, " ");
}

export function mountNav(){
  const path = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".chip").forEach(a=>{
    if (a.getAttribute("href") === path) a.classList.add("active");
  });
}

/* -------- Assistant shared (modal) -------- */
function simpleCoach(msg){
  const m = msg.toLowerCase();

  if (m.includes("не") && (m.includes("туралы") || m.includes("о чем"))){
    return "Қадам: 1) «Кім/не?» 2) «Не істеді?» 3) «Қайда/қашан?» Бір сөйлеммен айт.";
  }
  if (m.includes("негізгі") || m.includes("главн")){
    return "Негізгі ой: мәтіннің ең маңызды 1 сөйлемі. «Автор не айтқысы келді?» деп ойла.";
  }
  if (m.includes("сөз") || m.includes("словар")){
    return "Сөздік: 1) сөзді тап 2) аудармасын айт 3) сол сөзбен 1 қысқа сөйлем құрастыр.";
  }
  if (m.includes("қате") || m.includes("ошиб")){
    return "Қате болса: 1) сұрақты қайта оқы 2) екі нұсқаны алып таста 3) мәтіндегі дәлел сөзді тап.";
  }
  return "Қай сабақ (7/8) және қай тапсырма нөмірі? (1,2,3...)";
}

function bindAssistantUI({modalMode}){
  const fab = modalMode ? $("#fab") : null;
  const modal = modalMode ? $("#modal") : null;

  const closeBtn = $("#closeModal");
  const embedInput = $("#embedUrl");
  const saveEmbed = $("#saveEmbed");
  const frame = $("#embedFrame");
  const chatIn = $("#chatIn");
  const chatOut = $("#chatOut");
  const askBtn = $("#askBtn");

  const applyEmbed = ()=>{
    const url = (localStorage.getItem(LS_EMBED) || "").trim();
    if (embedInput) embedInput.value = url;
    if (frame){
      if (url){
        frame.src = url;
        frame.style.display = "block";
      } else {
        frame.removeAttribute("src");
        frame.style.display = "none";
      }
    }
  };

  const append = (text)=>{
    if (!chatOut) return;
    const prev = chatOut.textContent || "";
    chatOut.textContent = prev ? (prev + "\n\n" + text) : text;
  };

  const ask = ()=>{
    const msg = (chatIn?.value || "").trim();
    if (!msg) return;
    append(`👤 Оқушы: ${msg}\n🤖 Көмекші: ${simpleCoach(msg)}`);
    chatIn.value = "";
  };

  askBtn?.addEventListener("click", ask);

  saveEmbed?.addEventListener("click", ()=>{
    localStorage.setItem(LS_EMBED, (embedInput?.value || "").trim());
    applyEmbed();
    alert("ИИ URL сақталды.");
  });

  if (modalMode && fab && modal){
    fab.addEventListener("click", ()=>{
      modal.classList.add("open");
      applyEmbed();
    });
    closeBtn?.addEventListener("click", ()=> modal.classList.remove("open"));
    modal.addEventListener("click", (e)=>{ if (e.target === modal) modal.classList.remove("open"); });
  } else {
    // standalone assistant page
    applyEmbed();
  }
}

export function mountAssistant(){ bindAssistantUI({modalMode:true}); }
export function mountAssistantStandalone(){ bindAssistantUI({modalMode:false}); }

/* -------- Home -------- */
export function mountHome(){
  const el = $("#progressLine");
  if (!el) return;
  const p = loadProgress();
  const done = Object.values(p).filter(x=>x?.done).length;
  el.textContent = `Орындалған сабақ: ${done} / ${LESSONS.length}`;
}

/* -------- Lessons list -------- */
export function mountLessons(){
  const wrap = $("#lessonsBox");
  if (!wrap) return;

  const p = loadProgress();

  wrap.innerHTML = LESSONS.map(l=>{
    const status = p[l.id]?.done ? "✅ Аяқталды" : "⏳ Аяқталмаған";
    return `
      <div class="task">
        <h4>${esc(l.titleKZ)} <span class="ru">— ${esc(l.titleRU)}</span></h4>
        <div class="ru">Сынып: ${esc(l.grade)} • ${status}</div>
        <div class="actions">
          <a class="btn primary big" href="lesson.html?id=${encodeURIComponent(l.id)}">Ашу</a>
        </div>
      </div>
    `;
  }).join("");
}

/* -------- Lesson page -------- */
function getParam(name){
  const u = new URL(location.href);
  return u.searchParams.get(name);
}

export function mountLesson(){
  const id = getParam("id");
  const lesson = LESSONS.find(x=>x.id===id);
  const wrap = $("#lessonBox");
  if (!wrap) return;

  if (!lesson){
    wrap.innerHTML = `<p class="ru">Сабақ табылмады.</p>`;
    return;
  }

  $("#lessonTitle").innerHTML = `${esc(lesson.titleKZ)} <span class="ru">— ${esc(lesson.titleRU)}</span>`;
  $("#lessonGoal").textContent = lesson.goalRU;

  const vocabHtml = lesson.vocab.map(v=>`
    <div class="opt"><b class="kaz">${esc(v.kz)}</b> <span class="ru">— ${esc(v.ru)}</span></div>
  `).join("");

  const tasksHtml = lesson.tasks.map((t, idx)=>{
    if (t.type === "mcq"){
      return `
        <div class="task" data-type="mcq" data-index="${idx}">
          <h4>${esc(t.titleKZ)} <span class="ru">— ${esc(t.titleRU)}</span></h4>
          <div class="ru">${esc(t.promptRU)}</div>
          <div class="smalltxt">${esc(t.promptKZ)}</div>
          ${t.options.map((o,i)=>`
            <label class="opt">
              <input type="radio" name="q_${idx}" value="${i}">
              <span><b class="kaz">${esc(o.kz)}</b> <span class="ru">— ${esc(o.ru)}</span></span>
            </label>
          `).join("")}
          <div class="actions">
            <button class="btn success big" type="button" data-check="${idx}">Тексеру</button>
          </div>
          <div class="out" id="out_${idx}">Нәтиже осында шығады…</div>
        </div>
      `;
    }

    if (t.type === "build"){
      const chips = t.wordsKZ.map(w=>`<button class="btn big" type="button" data-word="${esc(w)}">${esc(w)}</button>`).join("");
      return `
        <div class="task" data-type="build" data-index="${idx}">
          <h4>${esc(t.titleKZ)} <span class="ru">— ${esc(t.titleRU)}</span></h4>
          <div class="ru">${esc(t.promptRU)}</div>
          <div class="smalltxt">${esc(t.promptKZ)}</div>
          <hr class="sep">
          <div class="smalltxt">Сөздерді басып таңда:</div>
          <div class="actions" style="gap:8px">${chips}</div>
          <hr class="sep">
          <div class="smalltxt">Жауап:</div>
          <input class="input" id="build_${idx}" placeholder="Мұнда жиналады..." />
          <div class="actions">
            <button class="btn" type="button" data-clear="${idx}">Тазалау</button>
            <button class="btn success big" type="button" data-check="${idx}">Тексеру</button>
          </div>
          <div class="out" id="out_${idx}">Нәтиже осында шығады…</div>
        </div>
      `;
    }

    return "";
  }).join("");

  wrap.innerHTML = `
    <div class="card full">
      <h3>Мәтін <span class="ru">/ Текст</span></h3>
      <p class="kaz" style="font-size:18px">${esc(lesson.textKZ)}</p>
      <p class="smalltxt">Кеңес: мәтінді 2 рет оқы.</p>
    </div>

    <div class="grid">
      <div class="card">
        <h3>Сөздік <span class="ru">/ Словарь</span></h3>
        ${vocabHtml}
      </div>

      <div class="card">
        <h3>Кеңес <span class="ru">/ Подсказка</span></h3>
        <p class="ru">1) «Не туралы?» 2) «Негізгі ой?»</p>
        <p class="smalltxt">Дайын жауап көшірмей: таңдау/құрастыру.</p>
        <div class="actions">
          <a class="btn primary big" href="vocabulary.html">Сөздік</a>
          <a class="btn big" href="comics.html">Комикс</a>
        </div>
      </div>
    </div>

    <div class="card full">
      <h3>Тапсырмалар <span class="ru">/ Задания</span></h3>
      ${tasksHtml}
      <hr class="sep">
      <div class="actions">
        <button class="btn success big" type="button" id="finishLesson">Сабақты аяқтау</button>
        <a class="btn big" href="lessons.html">Тізім</a>
      </div>
      <div class="smalltxt" id="saveInfo"></div>
    </div>
  `;

  wrap.addEventListener("click", (e)=>{
    const checkIdx = e.target?.getAttribute?.("data-check");
    const clearIdx = e.target?.getAttribute?.("data-clear");
    const word = e.target?.getAttribute?.("data-word");

    if (word){
      const parent = e.target.closest(".task");
      const idx = parent?.getAttribute("data-index");
      const input = $(`#build_${idx}`);
      if (input){
        const curr = input.value.trim();
        input.value = curr ? (curr + " " + word) : word;
      }
      return;
    }

    if (clearIdx != null){
      const input = $(`#build_${clearIdx}`);
      if (input) input.value = "";
      $(`#out_${clearIdx}`).textContent = "Тазаланды.";
      return;
    }

    if (checkIdx != null){
      const t = lesson.tasks[Number(checkIdx)];
      const out = $(`#out_${checkIdx}`);

      if (t.type === "mcq"){
        const picked = document.querySelector(`input[name="q_${checkIdx}"]:checked`);
        if (!picked){ out.textContent = "Жауап таңда."; return; }
        const opt = t.options[Number(picked.value)];
        out.textContent = opt.correct ? "✅ Дұрыс!" : "❌ Қате. Мәтіндегі дәлел сөзді тап.";
        return;
      }

      if (t.type === "build"){
        const val = normalizeText($(`#build_${checkIdx}`)?.value || "");
        const ans = normalizeText(t.answerKZ);
        const ok = val === ans;
        out.textContent = ok ? "✅ Дұрыс!" : "❌ Әлі дәл емес. Сөздердің ретін тексер.";
        return;
      }
    }
  });

  $("#finishLesson").addEventListener("click", ()=>{
    const p = loadProgress();
    p[lesson.id] = { done:true, at: new Date().toISOString() };
    saveProgress(p);
    $("#saveInfo").textContent = "✅ Сақталды.";
  });
}

/* -------- Vocabulary -------- */
export function mountVocabulary(){
  const wrap = $("#vocabBox");
  if (!wrap) return;

  const all = [];
  for (const l of LESSONS) for (const v of l.vocab) all.push(v);
  for (const v of GLOBAL_VOCAB) all.push(v);

  const seen = new Set();
  const uniq = all.filter(v=>{
    const key = v.kz + "|" + v.ru;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  wrap.innerHTML = `
    <div class="task">
      <h4>Іздеу <span class="ru">/ Поиск</span></h4>
      <input class="input" id="q" placeholder="Мысалы: еңбекқор / кружок ..." />
      <div class="smalltxt">1 сөз жаз.</div>
    </div>
    <div id="list"></div>
  `;

  const list = $("#list");
  const render = (q)=>{
    const s = q.trim().toLowerCase();
    const items = uniq.filter(v=>{
      if (!s) return true;
      return v.kz.toLowerCase().includes(s) || v.ru.toLowerCase().includes(s);
    });
    list.innerHTML = items.map(v=>`
      <div class="opt"><b class="kaz">${esc(v.kz)}</b> <span class="ru">— ${esc(v.ru)}</span></div>
    `).join("") || `<p class="ru">Табылмады.</p>`;
  };

  render("");
  $("#q").addEventListener("input", (e)=> render(e.target.value));
}

/* -------- Comics -------- */
export function mountComics(){
  const wrap = $("#comicsBox");
  if (!wrap) return;

  wrap.innerHTML = COMICS.map(c=>`
    <div class="task">
      <h4>${esc(c.title)}</h4>
      <div class="actions">
        <a class="btn primary big" href="${esc(c.url)}" target="_blank" rel="noopener">Ашу</a>
      </div>
      <div class="smalltxt">Тапсырма: «Кім? Не болды? 2 сөйлеммен айт».</div>
    </div>
  `).join("");
}
