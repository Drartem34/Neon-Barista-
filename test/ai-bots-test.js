// Тест аддона «🧠 Розумні боти (ШІ)» з мок-провайдером: адмінська вкладка, наміри ботів «Дедлайну» (goTo, vote, say),
// чат T → бульбашка-відповідь, ліміти запитів, падіння LLM → скриптові боти, ключ ніколи не йде на сервер гри.
// Запуск: node test/ai-bots-test.js
const fs = require('fs'), path = require('path');
const { JSDOM } = require('jsdom');
const THREE = require('three');
const root = path.join(__dirname, '..');
const dom = new JSDOM(fs.readFileSync(path.join(root, 'src/00_shell.html'), 'utf8') + '</body></html>', { pretendToBeVisual: true, runScripts: 'outside-only', url: 'https://example.org/' });
const w = dom.window;
class FakeRenderer { constructor() { this.shadowMap = {}; } setPixelRatio() { } setSize() { } render() { } }
w.THREE = Object.assign({}, THREE, { WebGLRenderer: FakeRenderer });
w.matchMedia = () => ({ matches: false }); w.requestAnimationFrame = () => 0; w.console.warn = () => { }; w.__NO_NET = true; w.__ADDON_TEST = true;
const IV = []; w.setInterval = (f, ms) => { if (ms <= 100) IV.push(f); return 0; };
w.setTimeout = f => { f(); return 0; };
w.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: (o, k) => k in o ? o[k] : () => { }, set: (o, k, v) => { o[k] = v; return true; } });
w.__ADDON_CODE = [
  { id: 'deadline', src: 'deadline/addon.js', code: fs.readFileSync(path.join(root, 'addons/_examples/deadline/addon.js'), 'utf8') },
  { id: 'ai_bots', src: 'ai_bots.js', code: fs.readFileSync(path.join(root, 'addons/_examples/ai_bots.js'), 'utf8') }
];
let src = fs.readdirSync(path.join(root, 'src')).filter(f => f.endsWith('.js')).sort().map(f => fs.readFileSync(path.join(root, 'src', f), 'utf8')).join('\n');
src += ';window.__T={get P(){return P},pl,ADDONS,startGame,frame,openPanel,closePanel,get panel(){return panel},TABS,ev:s=>eval(s),keydown:c=>dispatchEvent(new KeyboardEvent("keydown",{code:c}))};';
// 🔊 озвучка: фіксуємо кожне speechSynthesis.speak; голосів лише англійський — має бути підказка й запасний голос
const SPOKEN = []; let cancels = 0;
w.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
w.speechSynthesis = { speak: u => SPOKEN.push(u), cancel: () => { cancels++; }, getVoices: () => [{ lang: 'en-US', name: 'Alex', localService: true }, { lang: 'en-GB', name: 'Google UK English', localService: false }] };
w.eval(src);
const T = w.__T; let now = 1000;
w.__deadlineFastLobby = 1;
const F = w.__deadline, G = w.__aibots, D = w.__deadlineAI;
const calm = () => { F.AU.chaosT = 999; F.AU.jamP = 0; F.AU.boomP = 0; F.AU.excel = 0; F.AU.sbT = 999; F.AU.botAI = 1; F.AU.boss = ''; if (F.AU.sec || F.AU.int) F.setRoles('', ''); for (const z of F.ST.zom) z.stun = 99; };
const step = s => { for (let i = 0; i < s * 60; i++) { now += 16.7; calm(); T.frame(now); if (i % 3 === 0) IV.forEach(f => f()); } };
const flush = () => new Promise(r => setImmediate(r));
const run = async s => { for (let i = 0; i < s * 4; i++) { step(.25); await flush(); } };
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); process.exit(1); } console.log('ok -', m); };
const at = p => { T.pl.x = p.x; T.pl.z = p.z; T.pl.y = 0; };
const lob = () => w.document.getElementById('mlobby');
const body = () => w.document.querySelector('#pbody');
const TL = []; { const box = w.document.getElementById('toasts'), _a = box.appendChild.bind(box); box.appendChild = el => { TL.push(el.textContent); return _a(el); }; }
const bot = n => F.ST.bt.find(b => b.n === n);

(async () => {
  assert(T.ADDONS.list.every(a => a.ok) && T.ADDONS.list.length === 2, 'аддони завантажились: ' + T.ADDONS.list.map(a => a.name + (a.ok ? '' : ' ✗ ' + a.err)).join(', '));
  assert(G && D && typeof D.snapshot === 'function' && typeof D.act === 'function', 'є гачок window.__deadlineAI і тест-експорт __aibots');
  T.startGame(true); T.P.tut = -1; T.pl.hp = 9999; step(.3);

  // ---------- хто бачить вкладку ----------
  assert(G.isAdmin() && G.syncTab() && T.TABS.some(t => t[0] === G.TAB), 'офлайн гравець = адмін: вкладка «🧠 Розумні боти» є в меню');
  T.ev('NET.on = true; WORLD.on = true; ACCT = { login: "vasya", admin: false };');
  assert(!G.isAdmin() && !G.syncTab() && !T.TABS.some(t => t[0] === G.TAB), 'онлайн не-адмін: вкладки нема');
  T.openPanel(G.TAB); assert(!body().querySelector('[data-aib="on"]'), 'не-адмін не бачить перемикача');
  T.closePanel();
  T.ev('ACCT = { login: "boss", admin: true };');
  assert(G.isAdmin() && G.syncTab() && T.TABS.some(t => t[0] === G.TAB), 'онлайн адмін (ACCT.admin) — вкладка з’являється');
  T.ev('NET.on = false; WORLD.on = false; ACCT = null;'); G.syncTab();

  // ---------- раунд «Дедлайну» з 4 ботами ----------
  T.keydown('Escape'); step(.05); body().querySelector('[data-mode="deadline"]').click(); step(.5);
  const intro = w.document.querySelector('#dl-intro button'); if (intro) intro.click();
  lob().querySelector('.rdy').click(); for (let i = 0; i < 80 && !F.ST.on; i++) step(.1);
  assert(F.ST.on && F.ST.bt.length === 4, 'раунд почався з 4 ботами: ' + F.ST.bt.map(b => b.n).join(', '));
  F.setRoles('', ''); step(.05);
  const names = F.ST.bt.map(b => b.n), b0 = names[0];

  // увімкнення з вкладки
  T.openPanel(G.TAB); assert(/Розумні боти/.test(body().textContent) && body().querySelector('[data-aib="on"]') && /Мок/.test(body().textContent), 'адмін бачить вкладку: перемикач, провайдер «Мок»');
  assert(body().querySelectorAll('[data-aibb]').length === 4, 'у вкладці — вибір ботів (4)');
  body().querySelector('[data-aib="on"]').click(); T.closePanel();
  assert(G.CFG.on === 1 && G.CFG.prov === 'mock', '🧠 увімкнено, провайдер — мок');
  const sb = F.ST.bt.find(b => b.n !== b0);
  const snap = D.snapshot(b0);
  assert(snap && snap.me === b0 && snap.role === 'worker' && snap.rooms.length > 3 && Array.isArray(snap.tasks) && 'timeLeft' in snap && Array.isArray(snap.events), 'знімок для ШІ: кімнати, завдання, час, роль бота');
  F.AU.sab = '🤖 ' + sb.n; F.ST.sh = [F.ST.sh[0], F.hashS(F.ST.sh[0] + '🤖 ' + sb.n)];
  assert(D.snapshot(sb.n).role === 'saboteur' && D.snapshot(sb.n).sabotageKinds && D.snapshot(b0).role === 'worker' && !D.snapshot(b0).sabotageKinds, 'прихована роль видна лише самому боту');
  F.AU.sab = '';

  // ---------- goTo ----------
  const room = snap.rooms.find(r => /КУХН/i.test(r)) || snap.rooms[1];
  w.__aibotsMock = s => s.me === b0 ? { intent: { k: 'goTo', room }, say: '' } : { intent: { k: 'idle', s: 5 }, say: '' };
  await run(1);
  assert(bot(b0).aic === 1 && bot(b0).ai && bot(b0).ai.k === 'go' && G.S.reqs >= 4, `ШІ обрав для ${b0}: goTo «${room}» (запитів ${G.S.reqs})`);
  assert(/🧠/.test(F.V.bm.get(b0).el.textContent), 'над ботом позначка 🧠');
  let ok = false; for (let i = 0; i < 25 && !ok; i++) { await run(1); const r = D.bots().find(b => b.n === b0).room; ok = r === room; }
  assert(ok, `${b0} дійшов у «${room}» звичайною ходьбою ботів`);

  // ---------- say ----------
  w.__aibotsMock = s => ({ intent: { k: 'idle', s: 3 }, say: `Я ${s.me}, і цей звіт мене переживе.` });
  for (let i = 0; i < 60 && !D.events().some(e => e.startsWith(`🤖 ${b0}: Я ${b0}`)); i++) await run(1);
  assert(D.events().some(e => e === `🤖 ${b0}: Я ${b0}, і цей звіт мене переживе.`) && G.S.chat.some(c => c.n === b0), 'say: репліка бота в чаті й стрічці подій');

  // ---------- розмова T ----------
  w.__aibotsMock = null;
  const B = bot(b0); at({ x: B.x + .8, z: B.z }); step(.1);
  assert(G.nearBot() && G.nearBot().n === b0 && w.document.getElementById('aib-talk') && w.document.getElementById('aib-talk').style.display !== 'none', 'поруч із 🧠-ботом кнопка «💬 Поговорити»');
  T.keydown('KeyT'); step(.05);
  const box = w.document.getElementById('aib-chat');
  assert(box && /Розмова з 🤖/.test(box.textContent), 'T біля бота — відкрилось вікно розмови');
  box.querySelector('.aib-in').value = 'Привіт! Де звіт?'; box.querySelector('.aib-f').dispatchEvent(new w.Event('submit', { cancelable: true }));
  step(.05);
  assert(G.S.chat.some(c => c.n === b0 && c.txt === 'Привіт! Де звіт?') && D.inbox[b0].length, 'репліка гравця пішла боту');
  await run(7);
  const rep = G.S.chat.filter(c => c.n === b0 && /^🤖/.test(c.who)).pop();
  assert(rep && /\[мок\].*Привіт/.test(rep.txt) && /\[мок\]/.test(w.document.getElementById('aib-chat').textContent), 'бот відповів у чаті: ' + (rep && rep.txt));
  assert(rep.txt.split(' ').length <= 20, 'відповідь ≤ 20 слів');
  // V без підтримки розпізнавання — тост і текст
  w.document.getElementById('aib-chat').querySelector('[data-aib="close"]').click();
  at({ x: bot(b0).x + .8, z: bot(b0).z }); step(.05); T.keydown('KeyV'); step(.05);
  assert(/не вміє розпізнавати/.test(TL.join('\n')) && w.document.getElementById('aib-chat'), 'V без SpeechRecognition — підказка й текстовий чат');
  w.document.getElementById('aib-chat').querySelector('[data-aib="close"]').click(); step(.05);
  // 🎙️ утримуй V: розпізнали фразу — вона йде боту, бот відповідає вголос
  const RECS = []; w.SpeechRecognition = class { constructor() { RECS.push(this); } start() { this.on = 1; } stop() { this.on = 0; if (this.onend) this.onend(); } };
  const c0 = cancels; at({ x: bot(b0).x + .8, z: bot(b0).z }); step(.05);
  assert(/Утримуй V/.test(w.document.getElementById('aib-talk').textContent), 'кнопка біля бота — «🎙️ Утримуй V — говори»');
  T.keydown('KeyV'); step(.02);
  const R = RECS[RECS.length - 1]; if (R) R.bot = G.S.ptt;   // найближчий 🧠-бот (поруч може стояти й інший)
  assert(R && R.on && R.lang === 'uk-UA' && !R.continuous && cancels > c0, 'V — мікрофон слухає uk-UA, боти замовкають (гравець перебиває)');
  R.onresult({ results: [[{ transcript: 'Ти бачив мою каву?' }]] }); w.dispatchEvent(new w.KeyboardEvent('keyup', { code: 'KeyV' }));
  assert(!R.on && G.S.chat.some(c => c.n === R.bot && c.txt === 'Ти бачив мою каву?'), 'відпустив V — фразу розпізнано й передано боту');
  const sp0 = SPOKEN.length; await run(7);
  const said = SPOKEN.slice(sp0).find(u => /Ти бачив мою каву/.test(u.text));
  assert(said && !/\[мок\]/.test(said.text) && said.voice && said.voice.name === 'Google UK English', 'бот відповів УГОЛОС (speechSynthesis.speak), без «[мок]» у мовленні; без укр. голосу — найкращий запасний');
  assert(TL.filter(t => /нема українського голосу/.test(t)).length === 1 && /Час і мова/.test(TL.join()), 'один раз — підказка, як встановити український голос');
  at(F.START.p); step(.1);

  // ---------- нарада: голосування ----------
  F.ST.sk = 'p'; F.AU.sab = '🤖 ' + sb.n; F.ST.mt = null; F.AU.mtCd = 0; F.startMeeting('me'); F.ST.mt.ph = 'vote'; F.ST.mt.t = 60;
  const spM = SPOKEN.length; for (let i = 0; i < 40 && names.filter(n => ('🤖 ' + n) in F.ST.mt.v).length < 4; i++) await run(1);
  const M = F.ST.mt, voted = names.filter(n => ('🤖 ' + n) in M.v);
  assert(M && voted.length >= 3 && voted.every(n => M.v['🤖 ' + n] !== M.c.indexOf('🤖 ' + n)), `нарада: ШІ-боти проголосували (${voted.length}/4) і не за себе`);
  const mt = w.document.getElementById('dl-meet');
  assert(mt && /Чат наради/.test(mt.textContent) && /Я голосую проти/.test(mt.textContent), 'у вікні наради — чат, де боти звинувачують');
  const said2 = SPOKEN.slice(spM), lines = D.events().filter(e => names.some(n => e.startsWith('🤖 ' + n + ':')));
  assert(said2.length >= voted.length && new Set(said2.map(u => u.pitch + '/' + u.rate)).size >= 2, `нарада: кожна репліка ботів озвучена (${said2.length}), у ботів різні тембри`);
  for (let i = 0; i < 30 && !D.events().some(e => /Не перекладай на мене/.test(e)); i++) await run(1);
  assert(D.events().some(e => /Не перекладай на мене/.test(e)), 'боти коротко сперечаються між собою');
  // «🎙️ Говорити на нараді» — мікрофон слухає весь час; фраза з іменем іде названому боту
  const mb = w.document.getElementById('aib-meet'); assert(mb && mb.style.display !== 'none' && /Говорити на нараді/.test(mb.textContent), 'на нараді кнопка «🎙️ Говорити на нараді»');
  mb.click(); const LR = RECS[RECS.length - 1];
  assert(G.S.live && LR.on && LR.continuous, 'режим наради: безперервне слухання');
  LR.onresult({ results: [[{ transcript: `${sb.n}, це ти підпалив серверну!` }]] }); step(.02);
  assert(G.S.chat.some(c => c.n === sb.n && /підпалив серверну/.test(c.txt)), 'фразу з іменем отримав названий бот');
  LR.onend(); assert(RECS[RECS.length - 1] !== LR && RECS[RECS.length - 1].on, 'мікрофон наради перезапускається сам');
  F.ST.mt = null; F.AU.sab = ''; F.AU.mtCd = 0; step(.1);
  assert(!G.S.live && w.document.getElementById('aib-meet').style.display === 'none', 'нарада скінчилась — мікрофон вимкнено');
  // субтитри можна вимкнути
  G.CFG.subs = 0; step(.05); assert(D.subs === false, 'субтитри вимикаються'); G.CFG.subs = 1; step(.05);

  // ---------- ліміти ----------
  Object.assign(G.S, { win: [], last: {}, reqs: 0 }); w.__aibotsMock = () => ({ intent: { k: 'idle', s: 2 }, say: '' });
  const times = {}; let maxWin = 0; const r0 = G.S.reqs;
  for (let i = 0; i < 70 * 4; i++) { const before = Object.assign({}, G.S.last); step(.25); await flush(); for (const n in G.S.last) if (G.S.last[n] !== before[n]) (times[n] = times[n] || []).push(G.S.last[n]); maxWin = Math.max(maxWin, G.S.win.length); }
  const gaps = Object.values(times).flatMap(a => a.slice(1).map((t, j) => t - a[j]));
  assert(maxWin <= 12 && G.S.reqs - r0 <= 12 + 4 + 2 && gaps.every(g => g >= 5.99), `ліміти: ≤12 запитів за хвилину (макс ${maxWin}, за 70 с — ${G.S.reqs - r0}), між запитами одного бота ≥ 6 с`);

  // ---------- LLM падає → скриптові боти ----------
  w.__aibotsMock = null; const calls = [];
  Object.assign(G.CFG, { prov: 'gemini', key: 'TESTKEY-SECRET-123', model: '' });
  w.fetch = (url, opt) => { calls.push({ url, opt }); return Promise.reject(new Error('мережа лежить')); };
  Object.assign(G.S, { win: [], last: {}, back: 0 }); const e0 = G.S.errs; await run(14);
  assert(G.S.errs > e0 && G.S.log.some(l => /за скриптом/.test(l)), `помилка LLM — лог «бот працює за скриптом» (помилок ${G.S.errs - e0})`);
  assert(calls.length && calls.every(c => /generativelanguage\.googleapis\.com\/v1beta\/models\/gemini-2\.0-flash:generateContent$/.test(c.url) && c.opt.headers['x-goog-api-key'] === 'TESTKEY-SECRET-123'), 'Gemini: ключ у заголовку x-goog-api-key, не в URL');
  await run(25);
  assert(F.ST.bt.every(b => !b.ai) && F.ST.bt.every(b => !b.aic), 'без відповідей ШІ 40 с — усі боти знову скриптові (без 🧠)');
  assert(F.ST.bt.some(b => b.job && b.job !== 'ai'), 'скриптові боти працюють: ' + F.ST.bt.map(b => b.job).join(','));
  // 429 → пауза; тайм-аут 10 с
  w.fetch = () => Promise.resolve({ ok: false, status: 429, json: () => Promise.resolve({ error: { message: 'quota' } }) });
  Object.assign(G.S, { back: 0, fails: 0, last: {}, win: [] }); await run(1);
  assert(G.S.back > G.S.t && G.S.log.some(l => /429/.test(l)), '429 — пауза перед наступними запитами');
  w.fetch = () => new Promise(() => { }); Object.assign(G.S, { back: 0, last: {}, win: [] }); const e1 = G.S.errs; await run(11);
  assert(G.S.errs > e1 && G.S.log.some(l => /тайм-аут/.test(l)), 'відповідь довше 10 с — тайм-аут, бот за скриптом');

  // ---------- ключ не йде на сервер гри ----------
  const sent = [];
  w.fetch = (url, opt) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ candidates: [{ content: { parts: [{ text: '{"intent":{"k":"goTo","room":"' + room + '"},"say":"Біжу до кави!"}' }] } }], usageMetadata: { totalTokenCount: 77 } }) });
  T.ev('NET.on = true; WORLD.on = true; ACCT = { login: "boss", admin: true };');
  T.ev('NET.ws = { readyState: 1, send: s => window.__SENT.push(s) };'); w.__SENT = sent;
  Object.assign(G.S, { back: 0, last: {}, win: [], busy: {} }); const t0 = G.S.tok;
  G.adminTick(1); await flush(); await flush();
  D.talk(b0, 'Як справи?');
  T.ev('NET.on = false; WORLD.on = false; ACCT = null; NET.ws = null;');
  assert(sent.some(s => /"rq"/.test(s) && /goTo/.test(s)) && sent.some(s => /aitalk/.test(s)), `онлайн: наміри й репліки йдуть автору раунду через канал «Дедлайну» (${sent.length} повідомлень)`);
  assert(sent.every(s => !s.includes('TESTKEY')) && !JSON.stringify(T.P).includes('TESTKEY') && G.S.tok - t0 >= 77, 'ключ ніколи не потрапляє в мережеві повідомлення грі й у збереження; токени враховано');
  assert(w.localStorage.getItem('nb_ai_bots_v1').includes('TESTKEY'), 'ключ лежить лише в localStorage адміна');

  // ---------- вимкнення ----------
  G.CFG.prov = 'mock'; T.openPanel(G.TAB); body().querySelector('[data-aib="on"]').click(); T.closePanel(); await run(1);
  assert(!G.CFG.on && F.ST.bt.every(b => !b.aic), 'вимкнули — боти одразу знову скриптові');
  console.log('ALL OK'); process.exit(0);
})().catch(e => { console.error('FAIL:', e && e.stack || e); process.exit(1); });
