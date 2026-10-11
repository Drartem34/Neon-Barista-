/* 🧠 Розумні боти (ШІ) — тестова функція для адміна.
   Ботів-колег «Дедлайну о 18:00» веде справжня мовна модель (LLM): вона обирає, ЩО робити (йти в кімнату, робити завдання,
   саботувати, скликати нараду, голосувати, йти за кимось), і говорить — текстом і голосом.
   - Безкоштовно: Google Gemini (безкоштовний ключ з aistudio.google.com) або будь-який OpenAI-сумісний сервер
     (Groq, OpenRouter :free, локальна Ollama). Без ключа — вбудований «мок» (детерміновані фейкові відповіді, для тестів).
   - Ключ живе ЛИШЕ в localStorage цього браузера: не йде на сервер гри, іншим гравцям і в лог.
   - LLM викликає браузер адміна; наміри йдуть автору раунду через канал запитів «Дедлайну» (window.__deadlineAI) — він перевіряє
     й виконує їх звичайним кодом ботів. Помилка/ліміт — бот просто працює за скриптом.
   - Розмова: T біля 🧠-бота — чат; V (утримуй) — голосом (Web Speech API, uk-UA). Відповіді — бульбашки, чат і 🔊 голос.
   Клавіші T і V беруться лише поруч із 🧠-ботом на поверсі «Дедлайну» — інакше вони дістаються папірцю, рації й голосовому чату. */
const A = Addon.info({ name: '🧠 Розумні боти (ШІ)', version: '1.0', desc: 'Адмін-тест: боти «Дедлайну о 18:00» думають і говорять через безкоштовну LLM (Gemini / Groq / OpenRouter / Ollama), чат T і голос V.' });

const SIMSIDE = !!window.__SIM;
const LS = 'nb_ai_bots_v1';
const PER_BOT = 6, PER_MIN = 12, TIMEOUT = 10, MAXW = 20;                      // ≤1 запит на бота за 6 с, ≤12 на хвилину, 10 с на відповідь
const PROV = {
  mock: { n: '🧪 Мок (без ключа, фейкові відповіді)' },
  gemini: { n: 'Google Gemini (безкоштовно)', model: 'gemini-2.0-flash' },
  openai: { n: 'OpenAI-сумісний (Groq / OpenRouter / Ollama)', model: 'llama-3.1-8b-instant', url: 'https://api.groq.com/openai/v1' }
};
const PRESETS = [['Groq', 'https://api.groq.com/openai/v1', 'llama-3.1-8b-instant'], ['OpenRouter', 'https://openrouter.ai/api/v1', 'meta-llama/llama-3.3-70b-instruct:free'], ['Ollama', 'http://localhost:11434/v1', 'llama3.2']];
const INTENTS = ['goTo', 'doTask', 'sabotage', 'callMeeting', 'vote', 'say', 'follow', 'idle'];
const TEMPER = ['буркотливий бухгалтер, усе міряє в гривнях і нервах', 'бадьорий стажер-оптиміст, вірить у KPI', 'параноїдальний айтішник, у всьому бачить вірус', 'саркастична менеджерка, говорить пасивною агресією', 'сонний кавоман, без кави не думає', 'пафосний «коуч з продуктивності»', 'тиха HR-ка, усе записує в блокнотик'];

/* ---------- Налаштування: лише localStorage (ключ ніколи не йде в A.data() — той зберігається на сервері) ---------- */
function load() { try { return Object.assign({ on: 0, prov: 'mock', model: '', key: '', url: '', voice: 1, pick: 'all' }, JSON.parse(localStorage.getItem(LS) || '{}')); } catch (e) { return { on: 0, prov: 'mock', model: '', key: '', url: '', voice: 1, pick: 'all' }; } }
const CFG = load();
function save() { try { localStorage.setItem(LS, JSON.stringify(CFG)); } catch (e) { } }
const S = { t: 0, last: {}, win: [], back: 0, fails: 0, busy: {}, want: {}, ctl: {}, ctlT: 0, reqs: 0, tok: 0, errs: 0, log: [], chat: [], open: '', keys: 0, rec: null, ptt: '', seq: 0 };
const D = () => window.__deadlineAI;
const isAdmin = () => !!((typeof ACCT !== 'undefined' && ACCT && ACCT.admin) || !(NET.on && typeof WORLD !== 'undefined' && WORLD.on));
const hash = s => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
const words = t => String(t || '').replace(/\s+/g, ' ').trim().split(' ').slice(0, MAXW).join(' ').slice(0, 140);
const pickOn = n => CFG.pick === 'all' || (Array.isArray(CFG.pick) && CFG.pick.includes(n));
function log(s) { S.log.unshift(s); if (S.log.length > 14) S.log.pop(); if (!SIMSIDE && panel === TAB) renderPanel(); }

/* ---------- Персонажі ---------- */
const persona = n => ({ temper: TEMPER[hash(n) % TEMPER.length], pitch: .8 + (hash(n + 'p') % 6) / 10, rate: .9 + (hash(n + 'r') % 4) / 10 });
function sysPrompt(n, snap) {
  const P = persona(n), sab = snap.role === 'saboteur';
  return `Ти — ${n}, бот-колега в офісній грі «Дедлайн о 18:00» (зомбі-офісники, квартальний звіт треба здати до 18:00, начальник хоче кави). Характер: ${P.temper}.
Твоя прихована роль: ${sab ? 'САБОТАЖНИК — тихо шкодь (sabotage з sabotageKinds), на нарадах бреши й переводь підозру на інших, ніколи не зізнавайся' : 'сумлінний працівник — допомагай здати звіт, рятуй офіс від хаосу, шукай саботажника'}. Нікому не розкривай свою роль.
Відповідай ЛИШЕ JSON без пояснень: {"intent":{"k":"goTo|doTask|sabotage|callMeeting|vote|follow|idle", "room"|"id"|"kind"|"name"|"s": значення},"say":"репліка або порожньо"}.
Правила: say — до 20 слів, українською, в характері, з офісним гумором. Якщо в chat є слова до тебе — обовʼязково дай відповідь у say. Нарада (meeting.phase="голосування", voted=false) — intent vote з name з candidates або "skip", і say з аргументом. doTask — лише id зі списку tasks; goTo — лише кімнати з rooms; follow — імʼя з people.`;
}

/* ---------- Мок-провайдер: детерміновані «думки» з самого знімка ---------- */
function mockReply(snap, fresh) {
  if (window.__aibotsMock) return window.__aibotsMock(snap, fresh);
  const M = snap.meeting, ch = snap.chat[snap.chat.length - 1], n = snap.me;
  if (M && M.phase === 'голосування' && !M.voted) { const c = M.candidates.find(x => x !== '🤖 ' + n && x !== n); return { intent: { k: 'vote', name: c || 'skip' }, say: c ? `[мок] Я голосую проти ${c}. Підозріло тихий.` : '[мок] Пропускаю, всі хороші.' }; }
  if (ch && fresh) return { intent: { k: 'idle', s: 3 }, say: `[мок] ${ch.who}, чую тебе: «${String(ch.txt).slice(0, 40)}». Кава є?` };
  if (snap.tasks.length) return { intent: { k: 'doTask', id: snap.tasks[0].id }, say: '' };
  return { intent: { k: 'goTo', room: snap.rooms[hash(n + S.reqs) % Math.max(1, snap.rooms.length)] || '' }, say: '' };
}

/* ---------- Виклик LLM (Gemini / OpenAI-сумісний / мок) ---------- */
function llm(sys, user, snap, fresh) {
  const p = CFG.prov in PROV ? CFG.prov : 'mock', model = CFG.model || PROV[p].model;
  if (p === 'mock') return Promise.resolve({ text: JSON.stringify(mockReply(snap, fresh)), tok: 0 });
  if (!CFG.key && p === 'gemini') return Promise.reject(new Error('немає ключа'));
  if (typeof fetch !== 'function') return Promise.reject(new Error('fetch недоступний'));
  const ac = typeof AbortController === 'function' ? new AbortController() : null, opt = { method: 'POST', signal: ac ? ac.signal : undefined };
  const done = r => r.json().catch(() => ({})).then(j => { if (!r.ok) { const e = new Error('HTTP ' + r.status + (j && j.error && j.error.message ? ': ' + String(j.error.message).slice(0, 80) : '')); e.status = r.status; throw e; } return j; });
  let pr;
  if (p === 'gemini') {
    // ключ — у заголовку, не в URL (щоб не потрапив у журнали проксі)
    pr = fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, Object.assign(opt, {
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': CFG.key },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: sys }] }, contents: [{ role: 'user', parts: [{ text: user }] }], generationConfig: { temperature: .8, maxOutputTokens: 200, responseMimeType: 'application/json' } })
    })).then(done).then(j => ({ text: (((j.candidates || [])[0] || {}).content || { parts: [] }).parts.map(q => q.text || '').join(''), tok: (j.usageMetadata || {}).totalTokenCount || 0 }));
  } else {
    const base = String(CFG.url || PROV.openai.url).replace(/\/+$/, ''), h = { 'Content-Type': 'application/json' }; if (CFG.key) h.Authorization = 'Bearer ' + CFG.key;
    pr = fetch(base + '/chat/completions', Object.assign(opt, { headers: h, body: JSON.stringify({ model, temperature: .8, max_tokens: 200, messages: [{ role: 'system', content: sys }, { role: 'user', content: user }] }) }))
      .then(done).then(j => ({ text: ((((j.choices || [])[0] || {}).message) || {}).content || '', tok: (j.usage || {}).total_tokens || 0 }));
  }
  pr.abort = () => ac && ac.abort();
  return pr;
}
function parseReply(txt) {
  const m = String(txt || '').match(/\{[\s\S]*\}/); if (!m) throw new Error('не JSON');
  const o = JSON.parse(m[0]), I = o.intent && typeof o.intent === 'object' ? o.intent : null;
  return { intent: I && INTENTS.includes(I.k) && I.k !== 'say' ? I : null, say: words(o.say || (I && I.k === 'say' ? I.text : '')) };
}

/* ---------- Ліміти: ≤1 запит на бота за 6 с, ≤12 за хвилину, пауза після 429 ---------- */
// 3 запити з 12 тримаємо про запас для відповідей гравцям, щоб розмова не чекала хвилину
function canAsk(n) { S.win = S.win.filter(t => S.t - t < 60); return S.t >= S.back && !S.busy[n] && S.t - (S.last[n] == null ? -1e9 : S.last[n]) >= PER_BOT && S.win.length < (S.want[n] ? PER_MIN : PER_MIN - 3); }
function decide(n) {
  const d = D(), snap = d && d.snapshot(n); if (!snap) return false;
  const sys = sysPrompt(n, snap), user = 'Стан гри (JSON): ' + JSON.stringify(snap) + '\nЩо робиш далі? Лише JSON.';
  const fresh = !!S.want[n]; S.last[n] = S.t; S.win.push(S.t); S.reqs++; S.want[n] = 0;
  const id = ++S.seq, pr = llm(sys, user, snap, fresh); S.busy[n] = { id, t: S.t, pr };
  pr.then(r => {
    if (!S.busy[n] || S.busy[n].id !== id) return; delete S.busy[n];
    S.tok += r.tok || Math.round((sys.length + user.length + String(r.text).length) / 4); S.fails = 0;
    const R = parseReply(r.text); if (!CFG.on) return;
    if (R.intent) d.act(n, R.intent);
    if (R.say) d.act(n, { k: 'say', text: R.say });
    log(`🤖 ${n} → ${R.intent ? R.intent.k + ' ' + (R.intent.room || R.intent.id || R.intent.name || R.intent.kind || '') : '—'}${R.say ? ' · «' + R.say + '»' : ''}`);
  }).catch(e => fail(n, id, e));
  return true;
}
function fail(n, id, e) {
  if (!S.busy[n] || S.busy[n].id !== id) return; delete S.busy[n];
  S.errs++; S.fails++;
  if (e && e.status === 429) { S.back = S.t + Math.min(60, 5 * Math.pow(2, S.fails)); log(`⏳ Ліміт провайдера (429) — пауза ${Math.round(S.back - S.t)} с, боти працюють за скриптом`); }
  else log(`⚠️ ${n}: ${String(e && e.message || e).slice(0, 80)} — бот працює за скриптом`);
}

/* ---------- Цикл адміна: хто з ботів під ШІ, коли питати модель ---------- */
function adminTick(dt) {
  const d = D(); S.t += dt;
  for (const n in S.busy) if (S.t - S.busy[n].t > TIMEOUT) { const b = S.busy[n]; try { b.pr.abort(); } catch (e) { } fail(n, b.id, new Error('тайм-аут 10 с')); }
  const want = CFG.on && isAdmin() && d && d.active(), bots = d ? d.bots() : [];
  for (const b of bots) {
    const on = want && pickOn(b.n);
    if (!!S.ctl[b.n] !== on || (on && S.t - S.ctlT > 20)) { d.act(b.n, { k: 'ctl', on: on ? 1 : 0 }); S.ctl[b.n] = on; }
  }
  if (want && S.t - S.ctlT > 20) S.ctlT = S.t;
  if (!want) return;
  // спершу ті, кому щойно щось сказали; далі — по черзі
  const q = bots.filter(b => pickOn(b.n)).sort((a, b) => (S.want[b.n] | 0) - (S.want[a.n] | 0) || (S.last[a.n] || -1e9) - (S.last[b.n] || -1e9));
  for (const b of q) if (canAsk(b.n)) decide(b.n);
}

/* ---------- Розмова: чат T, голос V, озвучка відповідей ---------- */
function nearBot(r) {
  const d = D(); if (!d || !d.active() || typeof pl === 'undefined') return null;
  let best = null, bd = r || 3; for (const b of d.bots()) { const q = Math.hypot(b.x - pl.x, b.z - pl.z); if (b.ai && q < bd) { bd = q; best = b; } } return best;
}
function say(n, txt) { const t = words(txt); if (!t) return; const d = D(); if (d) d.talk(n, t); }
function chatUI() {
  let el = document.getElementById('aib-chat');
  if (!S.open) { if (el) el.remove(); return; }
  if (!el) {
    el = document.createElement('div'); el.id = 'aib-chat';
    el.style.cssText = 'position:fixed;left:50%;bottom:118px;transform:translateX(-50%);z-index:40;width:min(380px,92vw);background:#2E2346;color:#fff;border-radius:16px;padding:10px 12px;font:13px/1.4 system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.45)';
    el.innerHTML = `<div style="display:flex;align-items:center;gap:6px"><b class="aib-h" style="flex:1"></b><button data-aib="voice" class="aib-v" style="border:0;border-radius:8px;padding:3px 7px;cursor:pointer"></button><button data-aib="close" style="border:0;border-radius:8px;padding:3px 8px;cursor:pointer">✕</button></div>
      <div class="aib-log" style="max-height:150px;overflow:auto;margin:6px 0;background:#3A2E5A;border-radius:10px;padding:5px 8px;min-height:34px"></div>
      <form class="aib-f" style="display:flex;gap:6px"><input class="aib-in" maxlength="140" placeholder="Скажи щось колезі…" style="flex:1;border:0;border-radius:8px;padding:6px 8px;font:13px system-ui"><button data-aib="mic" type="button" title="Голосом (або утримуй V)" style="border:0;border-radius:8px;padding:4px 8px;cursor:pointer">🎙️</button><button style="border:0;border-radius:8px;padding:4px 10px;cursor:pointer;background:#FFE066;font-weight:700">➤</button></form>`;
    el.addEventListener('click', e => { const b = e.target.closest('[data-aib]'); if (!b) return; const a = b.dataset.aib; if (a === 'close') { S.open = ''; chatUI(); } else if (a === 'voice') { CFG.voice = CFG.voice ? 0 : 1; save(); chatUI(); } else if (a === 'mic') listen(S.open); });
    el.querySelector('.aib-f').addEventListener('submit', e => { e.preventDefault(); const i = el.querySelector('.aib-in'); say(S.open, i.value); i.value = ''; });
    el.querySelector('.aib-in').addEventListener('keydown', e => { if (e.key === 'Escape') { S.open = ''; chatUI(); } });
    document.body.appendChild(el);
    const i = el.querySelector('.aib-in'); if (i.focus) i.focus();
  }
  el.querySelector('.aib-h').textContent = `💬 Розмова з 🤖 ${S.open} 🧠`;
  el.querySelector('.aib-v').textContent = CFG.voice ? '🔊' : '🔇';
  const L = S.chat.filter(c => c.n === S.open).slice(-8), lg = el.querySelector('.aib-log');
  const h = L.length ? L.map(c => `<div><b>${escapeHTML(c.who)}:</b> ${escapeHTML(c.txt)}</div>`).join('') : '<span style="opacity:.7">Спитай про звіт, каву чи хто тут саботажник…</span>';
  if (lg.innerHTML !== h) { lg.innerHTML = h; lg.scrollTop = 1e6; }
}
function talkBtn() {
  let el = document.getElementById('aib-talk'); const b = !S.open && !panel && nearBot();
  if (!b) { if (el) el.style.display = 'none'; return; }
  if (!el) { el = document.createElement('button'); el.id = 'aib-talk'; el.style.cssText = 'position:fixed;right:14px;bottom:170px;z-index:30;border:0;border-radius:12px;padding:7px 12px;font:700 13px system-ui;background:#FFE066;color:#2E2346;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.3)'; el.addEventListener('click', () => { const q = nearBot(); if (q) { S.open = q.n; chatUI(); } }); document.body.appendChild(el); }
  el.textContent = `💬 Поговорити з ${b.n} (T · V — голосом)`; el.style.display = '';
}
// 🎙️ розпізнавання мови: uk-UA → ru-RU → en-US; нема підтримки — підказка й текстовий чат
function listen(n) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { toast('🎙️ Браузер не вміє розпізнавати мову — напиши текстом (T).'); S.open = n; chatUI(); return false; }
  if (S.rec) return true;
  const go = langs => {
    const r = new SR(); S.rec = r; r.lang = langs[0]; r.interimResults = false; r.maxAlternatives = 1;
    r.onresult = e => { const t = e.results && e.results[0] && e.results[0][0] && e.results[0][0].transcript; if (t) say(n, t); };
    r.onerror = e => { S.rec = null; if (e && e.error === 'language-not-supported' && langs.length > 1) go(langs.slice(1)); else if (e && e.error !== 'aborted' && e.error !== 'no-speech') toast('🎙️ Мікрофон: ' + (e.error || 'помилка')); };
    r.onend = () => { if (S.rec === r) S.rec = null; };
    try { r.start(); toast(`🎙️ Слухаю (${langs[0]})… відпусти V — і ${n} відповість`); } catch (e) { S.rec = null; }
  };
  go(['uk-UA', 'ru-RU', 'en-US']); return true;
}
function speak(n, txt, x, z) {
  if (!CFG.voice || typeof speechSynthesis === 'undefined' || typeof SpeechSynthesisUtterance === 'undefined') return;
  if (typeof pl === 'undefined' || Math.hypot(pl.x - x, pl.z - z) > 12) return;            // чути лише тим, хто поруч
  const u = new SpeechSynthesisUtterance(String(txt).replace(/\[мок\]\s*/, '')), P = persona(n), vs = speechSynthesis.getVoices ? speechSynthesis.getVoices() : [];
  const v = vs.find(q => /^uk/i.test(q.lang)) || vs.find(q => /^ru/i.test(q.lang)); if (v) u.voice = v; u.lang = v ? v.lang : 'uk-UA'; u.pitch = P.pitch; u.rate = P.rate;
  try { speechSynthesis.speak(u); } catch (e) { }
}
function onLine(e) {
  if (e.k === 'aihear') { S.chat.push({ n: e.n, who: e.who === 'me' ? 'Ти' : String(e.who), txt: String(e.txt) }); if (CFG.on && isAdmin()) S.want[e.n] = 1; }
  else { S.chat.push({ n: e.n, who: '🤖 ' + e.n, txt: String(e.txt) }); const b = D() && D().bots().find(q => q.n === e.n); if (b) speak(e.n, e.txt, b.x, b.z); }
  if (S.chat.length > 40) S.chat.shift(); if (S.open) chatUI();
}

/* ---------- Клавіші: реєструємо після всіх аддонів, щоб T/V біля 🧠-бота були нашими, а деінде — ні ---------- */
function bindKeys() {
  if (S.keys) return; S.keys = 1;
  A.key('KeyT', () => { if (panel) return false; const b = nearBot(); if (!b) return false; S.open = b.n; chatUI(); return true; });
  A.key('KeyV', () => { if (panel) return false; const b = nearBot(); if (!b) return false; S.ptt = b.n; listen(b.n); return true; });
  addEventListener('keyup', e => { if (e.code === 'KeyV' && S.ptt) { S.ptt = ''; if (S.rec) try { S.rec.stop(); } catch (er) { } } });
}

/* ---------- Вкладка адміна ---------- */
const TAB = A.tab('aibots', '🧠 Розумні боти', () => {
  if (!isAdmin()) return '<p class="muted">Тільки для адміністраторів.</p>';
  const p = CFG.prov in PROV ? CFG.prov : 'mock', d = D(), bots = d ? d.bots() : [], inp = 'style="width:100%;box-sizing:border-box;border:1px solid #ccc;border-radius:8px;padding:5px 7px;font:13px system-ui"';
  S.win = S.win.filter(t => S.t - t < 60);
  return `<h3>🧠 Розумні боти (ШІ) · тест</h3>
  <p class="muted" style="font-size:13px">Ботів «Дедлайну о 18:00» веде мовна модель: вона обирає дії й говорить. Ключ зберігається лише в цьому браузері й іде тільки до обраного провайдера.</p>
  <div class="row"><span class="ic">🧠</span><div class="tx"><b>Розумні боти</b><div class="need">${CFG.on ? 'увімкнено — LLM керує ботами' : 'вимкнено — звичайні скриптові боти'}</div></div><button class="btn${CFG.on ? '' : ' alt'}" data-aib="on">${CFG.on ? 'Вимкнути' : 'Увімкнути'}</button></div>
  <div class="row"><span class="ic">🔊</span><div class="tx"><b>Голос ботів</b><div class="need">озвучка відповідей (speechSynthesis), чути поруч із ботом</div></div><button class="btn${CFG.voice ? '' : ' alt'}" data-aib="voice">${CFG.voice ? 'Увімк.' : 'Вимк.'}</button></div>
  <p style="margin:8px 0 3px"><b>Провайдер</b></p><select data-aibf="prov" ${inp}>${Object.keys(PROV).map(k => `<option value="${k}"${k === p ? ' selected' : ''}>${PROV[k].n}</option>`).join('')}</select>
  ${p === 'mock' ? '<p class="muted" style="font-size:12px">🧪 Мок: відповіді фейкові (позначені «[мок]») — для тестів і перевірки без ключа.</p>' : `
  ${p === 'openai' ? `<p style="margin:6px 0 3px"><b>URL</b> <span class="muted" style="font-size:12px">${PRESETS.map(q => `<a href="#" data-aibp="${escapeHTML(q[0])}">${q[0]}</a>`).join(' · ')}</span></p><input data-aibf="url" value="${escapeHTML(CFG.url || PROV.openai.url)}" ${inp}>` : ''}
  <p style="margin:6px 0 3px"><b>Модель</b></p><input data-aibf="model" value="${escapeHTML(CFG.model || PROV[p].model)}" ${inp}>
  <p style="margin:6px 0 3px"><b>Ключ API</b> <span class="muted" style="font-size:12px">${p === 'gemini' ? 'безкоштовно: aistudio.google.com → Get API key' : 'Groq: console.groq.com/keys · OpenRouter: openrouter.ai/keys · Ollama — без ключа'}</span></p>
  <input data-aibf="key" type="password" autocomplete="off" value="${CFG.key ? '••••••••' : ''}" placeholder="встав ключ" ${inp}>`}
  <div style="margin:8px 0"><button class="btn alt" data-aib="test">🔑 Перевірити ключ</button> <span class="aib-tr">${escapeHTML(S.tr || '')}</span></div>
  <p style="margin:8px 0 3px"><b>Які боти під ШІ</b> <button class="btn alt" data-aib="all" style="padding:2px 8px">${CFG.pick === 'all' ? '✅ усі' : 'усі'}</button></p>
  <div>${bots.length ? bots.map(b => `<label style="margin-right:10px"><input type="checkbox" data-aibb="${escapeHTML(b.n)}" ${pickOn(b.n) ? 'checked' : ''}> 🤖 ${escapeHTML(b.n)}${b.ai ? ' 🧠' : ''}</label>`).join('') : '<span class="muted">ботів зараз нема — зайди на поверх «Дедлайну»</span>'}</div>
  <p style="margin:8px 0 3px"><b>Лічильник</b>: ${S.reqs} запитів · ~${S.tok} токенів · ${S.errs} помилок · ${S.win.length}/${PER_MIN} за хвилину${S.t < S.back ? ` · ⏳ пауза ${Math.ceil(S.back - S.t)} с` : ''}</p>
  <div style="font:12px/1.45 ui-monospace,monospace;background:#F4F1FA;border-radius:10px;padding:6px 8px;max-height:200px;overflow:auto">${S.log.length ? S.log.map(escapeHTML).join('<br>') : 'рішень ще не було'}</div>
  <p class="muted" style="font-size:12px">Біля 🧠-бота: <b>T</b> — чат, утримуй <b>V</b> — сказати голосом. Ліміти: ≤1 запит на бота за ${PER_BOT} с, ≤${PER_MIN}/хв, тайм-аут ${TIMEOUT} с; помилка — бот працює за скриптом.</p>`;
}, e => {
  const pr = e.target.closest('[data-aibp]'); if (pr) { e.preventDefault(); const q = PRESETS.find(x => x[0] === pr.dataset.aibp); if (q) { CFG.url = q[1]; CFG.model = q[2]; save(); renderPanel(); } return; }
  const cb = e.target.closest('[data-aibb]'); if (cb) { const n = cb.dataset.aibb, all = (D() ? D().bots() : []).map(b => b.n); let L = CFG.pick === 'all' ? all.slice() : (CFG.pick || []).slice(); L = cb.checked ? [...new Set(L.concat(n))] : L.filter(x => x !== n); CFG.pick = L; save(); return; }
  const b = e.target.closest('[data-aib]'); if (!b) return; const a = b.dataset.aib;
  if (a === 'on') { CFG.on = CFG.on ? 0 : 1; save(); log(CFG.on ? '🧠 Увімкнено' : '⏹️ Вимкнено — боти знову скриптові'); }
  else if (a === 'voice') CFG.voice = CFG.voice ? 0 : 1;
  else if (a === 'all') CFG.pick = 'all';
  else if (a === 'test') { S.tr = '⏳ перевіряю…'; llm('Відповідай одним словом.', 'Скажи «так» у JSON {"say":"так"}', { me: 'тест', meeting: null, chat: [], events: [], tasks: [], rooms: [] }).then(r => { S.tr = '✅ працює: ' + String(r.text).slice(0, 40); renderPanel(); }).catch(er => { S.tr = '❌ ' + String(er.message || er).slice(0, 80); renderPanel(); }); }
  save(); renderPanel();
}, { menu: true });
// поля налаштувань: зберігаємо на льоту (ключ — лише сюди, у localStorage)
if (!SIMSIDE && typeof document !== 'undefined') document.addEventListener('change', e => {
  const f = e.target && e.target.dataset && e.target.dataset.aibf; if (!f) return;
  const v = String(e.target.value || '').trim();
  if (f === 'key') { if (v && !/^•+$/.test(v)) CFG.key = v; else if (!v) CFG.key = ''; }
  else if (f === 'prov') { CFG.prov = v in PROV ? v : 'mock'; CFG.model = ''; renderPanel(); }
  else CFG[f] = v;
  save();
});
// вкладку бачить лише адмін (офлайн — сам гравець)
function syncTab() {
  const i = TABS.findIndex(t => t[0] === TAB), adm = isAdmin();
  if (adm && i < 0) TABS.splice(TABS.length - 2, 0, [TAB, '🧠 Розумні боти']); else if (!adm && i >= 0) TABS.splice(i, 1);
  return adm;
}

if (!SIMSIDE) {
  A.on('tick', dt => {
    bindKeys(); syncTab();
    const d = D(); if (d && !S.lis) { S.lis = 1; d.listen(onLine); }
    adminTick(dt); talkBtn(); if (S.open) { const b = d && d.bots().find(q => q.n === S.open); if (!b || !d.active()) { S.open = ''; chatUI(); } }
  });
}
if (window.__ADDON_TEST) window.__aibots = { CFG, S, PROV, TAB, isAdmin, syncTab, decide, canAsk, adminTick, llm, parseReply, mockReply, sysPrompt, persona, nearBot, listen, say, chatUI, save };
