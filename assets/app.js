import { LESSONS, COMICS, GLOBAL_VOCAB } from "./data.js";

const LS_PROGRESS = "kzsite_progress_v1";
const LS_EMBED = "kzsite_ai_embed_url_v1";

// ---------- helpers ----------
function $(sel){ return document.querySelector(sel); }
function esc(s){ return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

function loadProgress(){
  try{ return JSON.parse(localStorage.getItem(LS_PROGRESS) || "{}"); }
  catch{ return {}; }
}
function saveProgress(p){ localStorage.setItem(LS_PROGRESS, JSON.stringify(p)); }

export function mountNav(){
  const path = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".chip").forEach(a=>{
    if (a.getAttribute("href") === path) a.classList.add("active");
  });
}

// ---------- Assistant (internal + optional embed iframe) ----------
export function mountAssistant(){
  const fab = $("#fab");
  const modal = $("#modal");
  if (!fab || !modal) return;

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

  const bot = (msg)=>{
    const m = msg.toLowerCase();

    // қысқа, нақты, бағыттау (дайын жауап емес)
    if (m.includes("не істеу") || m.includes("как")){
      return "Қадамдап істейік: 1) Мәтінді бір рет оқы. 2) «Кім/не туралы?» сұрағына жауап тап. 3) Бір дұрыс нұсқаны таңда. Қай тапсырмада тоқтап қалдың?";
    }
    if (m.includes("мағына") || m.includes("смысл")){
      return "Мағынаны табу үшін: «Бұл мәтін не туралы?» және «Автор не айтқысы келеді?» деген екі сұраққа жауап бер. Бір сөйлеммен айт.";
    }
    if (m.includes("сөздік") || m.includes("словар")){
      return "Сөздікпен жұмыс: 1) жаңа сөзді тап 2) аудармасын қара 3) сол сөзбен қысқа сөйлем құрастыр. Қандай сөз қиын болып тұр?";
    }
    if (m.includes("қате") || m.includes("ошибка")){
      return "Қате болса: 1) сұрақты қайта оқы 2) екі жауапты бірден алып таста 3) мәтіндегі дәлел сөзді тап. Қай сұрақ нөмірі?";
    }
    return "Қысқа жауап: тапсырманы бірге бөлеміз. Қай сабақ (7/8 сынып) және қай тапсырма нөмірі?";
  };

  const reply = (text)=>{
    chatOut.textContent = (chatOut.textContent ? chatOut.textContent + "\n\n" : "") + text;
  };

  fab.addEventListener("click", ()=>{
    modal.classList.add("open");
    applyEmbed();
  });
  closeBtn?.addEventListener("click", ()=> modal.classList.remove("open"));
  modal.addEventListener("click", (e)=>{ if (e.target === modal) modal.classList.remove("open"); });

  saveEmbed?.addEventListener("click", ()=>{
    localStorage.setItem(LS_EMBED, (embedInput?.value || "").trim());
    applyEmbed();
    alert("ИИ-көмекші URL сақталды.");
  });

  askBtn?.addEventListener("click", ()=>{
    const msg = (chatIn?.value || "").trim();
    if (!msg) return;
    reply(`👤 Оқушы: ${msg}\n🤖 Көмекші: ${bot(msg)}`);
    chatIn.value = "";
  });

  applyEmbed();
}

// ---------- Home stats ----------
export function mountHome(){
  const el = $("#progressLine");
  if (!el) return;
  const p = loadProgress();
  const done = Object.values(p).filter(x=>x?.done).length;
  el.textContent = `Орындалған сабақ: ${done} / ${LESSONS.length}`;
}

// ---------- Lessons list ----------
export function mountLessons(){
  const wrap = $("#lessonsBox");
  if (!wrap) return;

  const p = loadProgress();

  wrap.innerHTML = LESSONS.map(l=>{
    const status = p[l.id]?.done ? "✅ Аяқталды" : "⏳ Басталмаған/аяқталмаған";
    return `
      <div class="task">
        <h4>${esc(l.titleKZ)} <span class="ru">— ${esc(l.titleRU)}</span></h4>
        <div class="line smalltxt">Сынып: ${esc(l.grade)} • ${status}</div>
        <div class="actions">
          <a class="btn primary big" href="lesson.html?id=${encodeURIComponent(l.id)}">Сабақты ашу</a>
        </div>
      </div>
    `;
  }).join("");
}

// ---------- Lesson page ----------
function getParam(name){
  const u = new URL(location.href);
  return u.searchParams.get(name);
}

function normalizeText(s){
  // жеңілдетілген нормализация (ZPRR/ЗРР үшін)
  return String(s).trim().replace(/\s+/g, " ");
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

  // render text + vocab + tasks
  const vocabHtml = lesson.vocab.map(v=>`<div class="opt"><b class="kaz">${esc(v.kz)}</b> <span class="ru">— ${esc(v.ru)}</span></div>`).join("");

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
            <button class="btn success big" data-check="${idx}">Тексеру</button>
          </div>
          <div class="out" id="out_${idx}">Нәтиже осында шығады…</div>
        </div>
      `;
    }

    if (t.type === "build"){
      // build: either sentence from words OR fill one word
      const chips = t.wordsKZ.map(w=>`<button class="btn big" type="button" data-word="${esc(w)}">${esc(w)}</button>`).join("");
      return `
        <div class="task" data-type="build" data-index="${idx}">
          <h4>${esc(t.titleKZ)} <span class="ru">— ${esc(t.titleRU)}</span></h4>
          <div class="ru">${esc(t.promptRU)}</div>
          <div class="smalltxt">${esc(t.promptKZ)}</div>
          <hr class="sep">
          <div class="smalltxt">Сөздерді басып таңдаңыз:</div>
          <div class="actions" style="gap:8px">${chips}</div>
          <hr class="sep">
          <div class="smalltxt">Сіздің жауабыңыз:</div>
          <input class="input" id="build_${idx}" placeholder="Мұнда жиналады..." />
          <div class="actions">
            <button class="btn" data-clear="${idx}">Тазалау</button>
            <button class="btn success big" data-check="${idx}">Тексеру</button>
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
      <p class="smalltxt">Кеңес: мәтінді 2 рет оқыңыз. Бірінші рет — жалпы, екінші рет — деталь үшін.</p>
    </div>

    <div class="grid">
      <div class="card">
        <h3>Сөздік <span class="ru">/ Словарь</span></h3>
        ${vocabHtml}
        <p class="footer">Кеңес: 1 жаңа сөзді таңдап, өзіңіз сөйлем құрастырыңыз.</p>
      </div>

      <div class="card">
        <h3>Қысқа ереже <span class="ru">/ Правило</span></h3>
        <p class="ru">1) «Не туралы?» — тақырып. 2) «Негізгі ой?» — бір сөйлем.</p>
        <p class="smalltxt">Дайын жауап көшірмейсіз: таңдау және құрастыру арқылы орындайсыз.</p>
        <div class="actions">
          <a class="btn primary big" href="vocabulary.html">Сөздік бөлімі</a>
          <a class="btn big" href="comics.html">Комикстер</a>
        </div>
      </div>
    </div>

    <div class="card full">
      <h3>Тапсырмалар <span class="ru">/ Задания</span></h3>
      ${tasksHtml}
      <hr class="sep">
      <div class="actions">
        <button class="btn success big" id="finishLesson">Сабақты аяқтау</button>
        <a class="btn big" href="lessons.html">Сабақтар тізімі</a>
      </div>
      <div class="smalltxt" id="saveInfo"></div>
    </div>
  `;

  // interactions
  wrap.addEventListener("click", (e)=>{
    const checkIdx = e.target?.getAttribute?.("data-check");
    const clearIdx = e.target?.getAttribute?.("data-clear");
    const word = e.target?.getAttribute?.("data-word");

    if (word){
      // append word into build input
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
        if (!picked){ out.textContent = "Жауап таңдаңыз."; return; }
        const opt = t.options[Number(picked.value)];
        out.innerHTML = opt.correct
          ? `✅ <span class="good">Дұрыс!</span> Жарайсыз.`
          : `❌ <span class="bad">Қате.</span> Мәтіндегі дәлел сөзді қайта қарап көріңіз.`;
        return;
      }

      if (t.type === "build"){
        const val = normalizeText($(`#build_${checkIdx}`)?.value || "");
        const ans = normalizeText(t.answerKZ);
        const ok = val === ans || val === t.answerKZ; // жеңіл
        out.innerHTML = ok
          ? `✅ <span class="good">Дұрыс!</span>`
          : `❌ <span class="bad">Әлі дәл емес.</span> Кеңес: сөздердің ретін тексеріңіз.`;
        return;
      }
    }
  });

  $("#finishLesson").addEventListener("click", ()=>{
    const p = loadProgress();
    p[lesson.id] = { done:true, at: new Date().toISOString() };
    saveProgress(p);
    $("#saveInfo").textContent = "✅ Сабақ аяқталды және сақталды.";
  });
}

// ---------- Vocabulary page ----------
export function mountVocabulary(){
  const wrap = $("#vocabBox");
  if (!wrap) return;

  // combine lesson vocabs + global
  const all = [];
  for (const l of LESSONS){
    for (const v of l.vocab) all.push(v);
  }
  for (const v of GLOBAL_VOCAB) all.push(v);

  // uniq
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
      <div class="smalltxt">Кеңес: 1 сөз жазыңыз.</div>
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
      <div class="opt">
        <b class="kaz">${esc(v.kz)}</b>
        <span class="ru">— ${esc(v.ru)}</span>
      </div>
    `).join("") || `<p class="ru">Ештеңе табылмады.</p>`;
  };

  render("");
  $("#q").addEventListener("input", (e)=> render(e.target.value));
}

// ---------- Comics page ----------
export function mountComics(){
  const wrap = $("#comicsBox");
  if (!wrap) return;

  wrap.innerHTML = COMICS.map(c=>`
    <div class="task">
      <h4>${esc(c.title)}</h4>
      <div class="actions">
        <a class="btn primary big" href="${esc(c.url)}" target="_blank" rel="noopener">Ашу / Открыть</a>
      </div>
      <div class="smalltxt">Комикс бойынша тапсырма: «Не болды? 2 сөйлеммен айт».</div>
    </div>
  `).join("");
}
