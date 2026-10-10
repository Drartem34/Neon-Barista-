// Тест «Дедлайну о 18:00» v3 на сервері світу: двоє гравців голосують за поверх, перекидаються звітом і здають його;
// потім утрьох — таємний саботажник, пожежа й вогнегасник, «зайобуючий» колега, нарада.
// Запуск: node test/deadline-world-test.js
const fs = require('fs'), path = require('path'), os = require('os'), { spawn } = require('child_process');
const { JSDOM } = require('jsdom');
const THREE = require('three');
const root = path.join(__dirname, '..');
const PORT = 7811;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'barista-world-'));
for (const f of ['start.py']) fs.copyFileSync(path.join(root, f), path.join(tmpRoot, f));
for (const d of ['dist', 'src', 'server']) fs.cpSync(path.join(root, d), path.join(tmpRoot, d), { recursive: true });
fs.symlinkSync(path.join(root, 'node_modules'), path.join(tmpRoot, 'node_modules'));
fs.cpSync(path.join(root, 'addons/_examples/deadline'), path.join(tmpRoot, 'addons/deadline'), { recursive: true });
const srv = spawn('python3', [path.join(tmpRoot, 'start.py'), '--no-ui', '--tunnel', 'none', '--port', String(PORT)], { stdio: 'ignore' });
function cleanup(code) { try { srv.kill(); } catch (e) { } try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch (e) { } process.exit(code); }
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); cleanup(1); } console.log('ok -', m); };
const post = async (p, body) => (await fetch(`http://127.0.0.1:${PORT}/api/${p}`, { method: 'POST', body: JSON.stringify(body) })).json();
class FakeR { constructor() { this.shadowMap = {}; this.info = { render: { calls: 0 } }; } setPixelRatio() { } setSize() { } render() { } }
async function client(name) {
  const html = await (await fetch(`http://127.0.0.1:${PORT}/`)).text();
  const dom = new JSDOM(html.replace(/<script[\s\S]*<\/script>/g, ''), { url: `http://127.0.0.1:${PORT}/`, runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  w.THREE = Object.assign({}, THREE, { WebGLRenderer: FakeR }); w.matchMedia = () => ({ matches: false }); w.requestAnimationFrame = () => 0;
  w.console.warn = () => { }; w.__ADDON_TEST = true; w.fetch = (u, o) => fetch(new URL(u, `http://127.0.0.1:${PORT}/`), o); w.setInterval = () => 0;
  w.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: (o, k) => k in o ? o[k] : () => { }, set: (o, k, v) => { o[k] = v; return true; } });
  let src = fs.readdirSync(path.join(root, 'src')).filter(f => f.endsWith('.js')).sort().map(f => fs.readFileSync(path.join(root, 'src', f), 'utf8')).join('\n');
  src += ';window.__T={mount:b=>mount(b),dismount:p=>dismount(p),get BODIES(){return BODIES},get ADDONS(){return ADDONS},get P(){return P},get MODEBAR(){return MODEBAR},pl,NET,WORLD,ISLMAP,startGame,frame,setAcct,get worldReady(){return worldReady},getInteract:()=>getInteract(),leave:()=>{const m=curMode();if(m&&m.leave)m.leave();goHub("")},get panel(){return panel},get hero(){return hero}};';
  w.eval(src);
  const reg = await post('register', { login: name, pass: 'pass-' + name });
  w.__T.setAcct({ token: reg.token, login: reg.login, admin: reg.admin });
  const T = w.__T; T.now = 1000; T.w = w;
  for (let i = 0; i < 50 && !T.worldReady; i++) await sleep(100);
  T.startGame(true); T.P.tut = -1;
  return T;
}
const tick = async (Ts, sec) => { for (let i = 0; i < sec * 20; i++) { for (const T of Ts) { T.now += 50; T.pl.hp = 9999; T.frame(T.now); } await sleep(50); } };
const lob = T => T.w.document.getElementById('mlobby');
const at = (T, p) => { T.pl.x = p.x; T.pl.z = p.z; T.pl.y = 0; };
/* один крок за підказкою: іди до жовтої мітки, F, тримайся поруч */
async function follow(T, D, Ts) {
  const g = D.goal(); if (!g.tg) { await tick(Ts, .2); return g.id || ''; }
  at(T, g.tg); await tick(Ts, .15); at(T, g.tg);
  const it = T.getInteract(); if (!it) { await tick(Ts, .1); return g.id; }
  it.fn(); if (D.V.mg) D.miniWin();   // 🎮 міні-гра ПК (кабелі / слово / щиток) — «пройдено»
  for (let j = 0; j < 60 && D.V.act; j++) { at(T, g.id === 'boss' ? { x: D.ST.boss.x + .3, z: D.ST.boss.z + .3 } : D.V.act.tg()); await tick(Ts, .1); }
  await tick(Ts, .25);
  return g.id;
}
(async () => {
  let st = null;
  for (let i = 0; i < 300; i++) { try { st = await (await fetch(`http://127.0.0.1:${PORT}/status`)).json(); if (st.world) break; } catch (e) { } await sleep(200); }
  assert(st && st.world, 'сервер світу запустився');
  const a = await client('Бухгалтер'), b = await client('Стажер');
  await tick([a, b], 1.5);
  const D = a.w.__deadline, E = b.w.__deadline, Ts = [a, b];
  assert(['deadline', 'deadline2', 'deadline3'].every(id => a.ISLMAP[id] && b.ISLMAP[id]), 'три поверхи-острови є в обох');
  // обоє в холі 42-го — у кожного вікно лобі; голосують кліком по картці «57 · Банк»
  D.useVar(0); E.useVar(0);
  at(a, D.START.p); at(b, { x: D.START.p.x - 2, z: D.START.p.z }); await tick(Ts, 1.2);
  assert(lob(a) && lob(b) && lob(a).querySelectorAll('[data-lv]').length === 3, '🗳️ обоє в лобі — у кожного відкрите вікно з 3 поверхами');
  lob(a).querySelector('[data-lv="1"]').click(); lob(b).querySelector('[data-lv="1"]').click(); await tick(Ts, 1.2);
  assert(D.ST.vo[1] === 2 && E.ST.vo[1] === 2 && D.ST.nx === 1 && E.ST.nx === 1 && /🗳️ 2/.test(lob(b).querySelector('[data-lv="1"]').textContent), '🗳️ обидва голоси за «57 · Банк» — бачать обоє (рахує сервер)');
  assert(/Бухгалтер/.test(lob(b).querySelector('.who').textContent) && /Стажер/.test(lob(a).querySelector('.who').textContent), 'у списку лобі — обидва гравці');
  lob(a).querySelector('.rdy').click(); await tick(Ts, 1.2);
  assert(!D.ST.on && !E.ST.on && E.ST.fo && /Чекаємо гравців 2\/5 — боти доповнять лобі/.test(lob(b).textContent) && /✅ Бухгалтер/.test(lob(b).querySelector('.who').textContent), 'Бухгалтер готовий — раунд НЕ стартує: «Чекаємо гравців 2/5 — боти доповнять лобі…» (бачить і Стажер)');
  for (let i = 0; i < 12 && !E.ST.bt.length; i++) await tick(Ts, .5);
  for (let i = 0; i < 10 && !(D.ST.bt.length && /✅ 🤖 Бот /.test(lob(a).querySelector('.who').textContent) && /🤖 Бот \S+ приєднався · \d\/5/.test(lob(b).textContent)); i++) await tick(Ts, .2);
  assert(D.ST.bt.length >= 1 && E.ST.bt.length >= 1 && /✅ 🤖 Бот /.test(lob(a).querySelector('.who').textContent) && /🤖 Бот \S+ приєднався · \d\/5/.test(lob(b).textContent), `🤖 бот приєднався до лобі — бачать обоє (${E.ST.bt.map(q => q.n).join(', ')})`);
  for (let i = 0; i < 30 && E.ST.bt.length < 3; i++) await tick(Ts, .5); await tick(Ts, .3);
  assert(!E.ST.on && E.ST.bt.length === 3 && lob(b).querySelectorAll('.who i').length === 5 && /чекаємо готовності людей \(1\/2\)/.test(lob(b).textContent), `лобі заповнилось до 5 (2 людини + 3 боти) — чекаємо, поки Стажер буде готовий [${E.ST.bt.length} · ${lob(b).querySelectorAll('.who i').length} · ${lob(b).textContent.slice(0,300)}]`);
  const bots0 = E.ST.bt.map(q => q.n).join();
  lob(b).querySelector('.rdy').click(); let cdSeen = 0;
  for (let i = 0; i < 40 && !(D.ST.on && E.ST.on); i++) { await tick(Ts, .2); if ([a, b].some(T => lob(T) && /Усі на місці — старт за/.test(lob(T).textContent))) cdSeen = 1; }
  assert(cdSeen, 'обоє готові — «Усі на місці — старт за 3…2…1»');
  assert(D.ST.bt.map(q => q.n).join() === bots0 && E.ST.bt.map(q => q.n).join() === bots0 && D.V.bm.size === 3, `у раунді ті самі 3 боти в обох: ${bots0}`);
  assert(D.ST.on && E.ST.on && D.ST.vi === 1 && E.ST.vi === 1 && D.ST.steps.join() === E.ST.steps.join() && D.ST.steps.length === 6, `раунд почався в обох на 57-му (рахує сервер): ${E.ST.steps.join(' → ')}`);
  assert([a, b].every(T => Math.hypot(T.pl.x - D.START.p.x, T.pl.z - D.START.p.z) < 2), '🛗 ліфт переніс обох на поверх банку');
  for (let i = 0; i < 10 && (lob(a) || lob(b)); i++) await tick(Ts, .2);
  assert(!lob(a) && !lob(b), 'раунд почався — вікно лобі закрилось в обох');
  assert(D.ST.desk.join() === E.ST.desk.join() && E.ST.desk.filter(Boolean).length === 3, 'обидва бачать тих самих касирів з даними');
  assert(a.MODEBAR && b.MODEBAR && /🪠/.test(a.w.document.getElementById('modebar').textContent), 'в обох набір режиму з 🪠 Вантузом');
  // Стажер бере дані — Бухгалтер бачить папери в його руках
  {
    const g = E.goal(); assert(g.id === 'desk', 'підказка Стажеру: до колеги з 📄');
    at(b, g.tg); await tick(Ts, .3); at(b, g.tg);
    it = b.getInteract(); assert(it && /Взяти дані/.test(it.l), 'біля каси F — «Взяти дані»' + (it && /Взяти дані/.test(it.l) ? '' : ' [' + (it && it.l) + ' · стіл ' + JSON.stringify(g.tg) + ' · гравець ' + b.pl.x.toFixed(2) + ',' + b.pl.z.toFixed(2) + ' · дані ' + E.ST.desk.join('') + ']')); it.fn(); await tick(Ts, 1);
    assert(E.myHeld().it === 'sheets' && D.ST.held['Стажер'] && D.ST.held['Стажер'].it === 'sheets', 'у Стажера в руках 📄 — бачать обоє');
    const rp = Object.values(a.NET.players).find(p => p.name === 'Стажер'), hm = D.V.hm.get('Стажер');
    assert(rp && hm && hm.g.parent === rp.h.root, 'Бухгалтер бачить стос паперів у руках Стажера');
    assert(D.ST.desk.filter(Boolean).length === 2, 'стіл колеги спорожнів і в Бухгалтера');
  }
  // далі — разом, слухаючись підказок, поки звіт не здано; щойно звіт надруковано — кидаємо його напарнику
  const c0a = a.P.coins, c0b = b.P.coins; let maxSi = 0, sameSeen = 0, thrown = 0;
  for (let k = 0; k < 200 && (D.ST.on || E.ST.on) && !(D.ST.rd && E.ST.rd); k++) {
    if (!thrown && D.ST.on) {
      const pairs = [[a, D, b, E], [b, E, a, D]], pr = pairs.find(([, X]) => X.myHeld().it === 'report');
      if (pr) {
        const [A_, X, B_, Y] = pr, p0 = X.SEND.p, p1 = { x: X.START.p.x, z: X.START.p.z };
        at(A_, p0); at(B_, p1); await tick(Ts, 1); A_.pl.face = Math.atan2(B_.pl.x - A_.pl.x, B_.pl.z - A_.pl.z);
        for (const q of D.ST.zom) if (Math.hypot(q.x - p1.x, q.z - p1.z) < 3) console.log('  (зомбі поруч з ловцем)');
        X.throwReport(); await tick(Ts, .3);
        const seenT = () => Y.ST.fly || Y.myHeld().it === 'report' || Y.ST.zom.some(q => q.carry && q.carry.it === 'report') || Y.ST.floor.some(f => f.it === 'report');
        for (let n = 0; n < 25 && !seenT(); n++) await tick(Ts, .1);   // під навантаженням знімок сервера може запізнитись
        if (!seenT()) console.log('  діагностика:', JSON.stringify({ xh: X.myHeld(), xf: X.ST.fly, yh: Y.myHeld(), held: Y.ST.held, fl: Y.ST.floor, zc: Y.ST.zom.filter(q => q.carry).map(q => [q.x, q.z, q.carry]), xp: [X.SEND.p, A_.pl.x, A_.pl.z], yp: [B_.pl.x, B_.pl.z], on: Y.ST.on, si: Y.ST.si }));
        assert(seenT(), '📘 звіт летить через хол — бачить і ловець');
        await tick(Ts, 2);
        const caught = Y.myHeld().it === 'report' && X.ST.held[Y.myKey()] && X.ST.held[Y.myKey()].it === 'report';
        const intercepted = D.ST.zom.some(q => q.carry && q.carry.it === 'report');
        assert(caught || intercepted || D.ST.floor.some(f => f.it === 'report'), caught ? '🙌 напарник спіймав звіт (бачать обоє)' : 'звіт не спіймали (перехопив зомбі / упав) — гра триває');
        thrown = 1; continue;
      }
    }
    if (E.ST.on) await follow(b, E, Ts); if (D.ST.on) await follow(a, D, Ts);   // після перемоги підказка веде на новий ▶ СТАРТ — не тиснемо
    if (D.ST.on && D.ST.si === E.ST.si) sameSeen++;
    maxSi = Math.max(maxSi, E.ST.si);
    if (k % 20 === 0) console.log(`  … крок ${E.ST.si}/${E.ST.steps.length} (${E.ST.steps[E.ST.si] || '—'}) · ${E.clockStr(E.ST.t)} · звіт ${Math.round(E.ST.rhp)}%`);
  }
  await tick(Ts, 1);
  assert(thrown, 'звіт кидали напарнику');
  assert(sameSeen > 5, 'прогрес чекліста однаковий в обох');
  assert(D.ST.on && E.ST.on && D.ST.rd && E.ST.rd && maxSi >= 5 && E.ST.si === 0 && E.ST.steps.length === 5, 'v6: звіт здано — раунд НЕ скінчився: в обох «звіт готовий» і чекліст додатка');
  // …тепер шукаємо саботажника: хто він — з хешу в знімку (так у грі перевіряє себе сам саботажник), 🚨 нарада й голос — раунд виграно
  {
    const CL = [a, b].find(T => !T.w.__deadline.V.sab), CX = CL.w.__deadline, mp = CX.mpos();
    CL.w.document.querySelector('#modebar [data-ms="7"]').click(); await tick(Ts, 1);
    for (const T of Ts) at(T, { x: mp.x + (T === a ? -.4 : .4), z: mp.z });
    for (let i = 0; i < 12 && !(D.ST.mt && D.ST.mt.ph === 'vote' && E.ST.mt && E.ST.mt.ph === 'vote'); i++) await tick(Ts, .3);
    const M = CX.ST.mt, sh = CX.ST.sh, si = M ? M.c.findIndex(k => CX.hashS(sh[0] + k) === sh[1]) : -1;
    assert(M && M.ph === 'vote' && si >= 0, '🚨 нарада після здачі звіту — голосування, саботажника знайшли (' + (M && M.n[si]) + ')');
    for (const T of Ts) { const el = T.w.document.getElementById('dl-meet'), bt = el && el.querySelector(`[data-mv="${si}"]`); if (bt && !T.w.__deadline.V.sab) bt.click(); }
    for (let i = 0; i < 30 && (D.ST.on || E.ST.on); i++) await tick(Ts, 1);
    assert(!D.ST.on && !E.ST.on && D.ST.sbC === 1, '🕵️ саботажника спіймано на нараді — раунд скінчився в обох');
  }
  // 👁️ онлайн: колегу за стіною не видно (ні модель, ні ім'я над головою), вийшов з-за стіни — видно
  {
    const L = D.L, sg = L.walls.map(q => ({ ax: L.x + q[0], az: L.z + q[1], bx: L.x + q[2], bz: L.z + q[3] })).find(q => Math.hypot(q.bx - q.ax, q.bz - q.az) >= 3 && [-1, 1].every(sd => { const l = Math.hypot(q.bx - q.ax, q.bz - q.az), nx = -(q.bz - q.az) / l, nz = (q.bx - q.ax) / l, x = (q.ax + q.bx) / 2 + nx * 1.3 * sd, z = (q.az + q.bz) / 2 + nz * 1.3 * sd; return Math.abs(x - L.x) < L.hx - 1 && Math.abs(z - L.z) < L.hz - 1; }));
    const l = Math.hypot(sg.bx - sg.ax, sg.bz - sg.az), nx = -(sg.bz - sg.az) / l, nz = (sg.bx - sg.ax) / l, cx = (sg.ax + sg.bx) / 2, cz = (sg.az + sg.bz) / 2;
    const rb = () => Object.values(a.NET.players).find(p => p.name === b.w.__deadline.myKey());
    at(a, { x: cx + nx * 1, z: cz + nz * 1 }); at(b, { x: cx - nx * 1.2, z: cz - nz * 1.2 }); await tick(Ts, 1);
    assert(rb() && !rb().h.root.visible && +rb().tag.style.opacity === 0 && rb().tag.style.opacity !== '', '👁️ колега за стіною: у Бухгалтера його не видно (модель і ім’я)');
    at(b, { x: cx + nx * 1.6, z: cz + nz * 1.6 }); await tick(Ts, 1);
    assert(rb().h.root.visible && rb().tag.style.opacity === '', '👁️ колега вийшов з-за стіни — знову видно');
  }
  assert(a.P.addons.deadline.wins === 1 && b.P.addons.deadline.wins === 1 && a.P.coins > c0a + 40 && b.P.coins > c0b + 40, `перемога в обох: +${a.P.coins - c0a} / +${b.P.coins - c0b} 🪙`);
  assert(!a.MODEBAR && !b.MODEBAR, 'після раунду в обох звичайний хотбар');
  assert(D.ST.nx === 2 && E.ST.nx === 2, 'наступний раунд без голосів — вище, на 63-й');
  for (const T of Ts) at(T, D.START.p); await tick(Ts, 1);
  assert(lob(a) && lob(b), 'після раунду обоє знову бачать вікно лобі');
  // Стажер готовий, Бухгалтер мовчить — боти доповнюють лобі, а через 25 с після заповнення стартуємо без нього
  lob(b).querySelector('.rdy').click();
  for (let i = 0; i < 30 && E.ST.bt.length < 3; i++) await tick(Ts, .5);
  await tick(Ts, 1.5);
  assert(!E.ST.on && E.ST.bt.length === 3 && E.ST.fw > 0 && /без решти старт за/.test(lob(a).textContent), `лобі повне, Бухгалтер не готовий — бачить таймер: без решти старт за ${E.ST.fw} с`);
  for (let i = 0; i < 40 && !E.ST.on; i++) await tick(Ts, 1);
  for (let i = 0; i < 10 && !(D.ST.on && E.ST.on && !lob(a) && !lob(b)); i++) await tick(Ts, .3);   // знімок і закриття вікон — з невеликою затримкою
  assert(D.ST.on && E.ST.on && D.ST.vi === 2 && E.ST.vi === 2 && !lob(a) && !lob(b), '⏳ 25 с минуло — раунд почався сам на 63-му, вікна закрились');
  // вихід з режиму — вікно лобі закривається
  b.leave(); await tick(Ts, 1);
  assert(!lob(b) && b.w.__deadline.floorOf(b.pl.x, b.pl.z) < 0, 'Стажер пішов у хаб — вікна лобі в нього немає');
  // ---------- v3 онлайн: троє гравців → один з них САБОТАЖНИК (знає лише він), пожежа, 🧯, 😤 «зайобуючий», 🚨 нарада ----------
  {
    a.leave(); for (let i = 0; i < 16 && D.ST.on; i++) await tick(Ts, 1);
    assert(!D.ST.on && !E.ST.on, 'усі пішли — раунд на 63-му скінчився сам');
    const c = await client('Кадровичка'), G = c.w.__deadline, T3 = [a, b, c], Dx = [D, E, G];
    await tick(T3, 1.5);
    for (const T of T3) at(T, D.START.p); await tick(T3, 1.5);
    assert(T3.every(T => lob(T)), 'троє в лобі 63-го — у кожного вікно лобі');
    for (const T of T3) lob(T).querySelector('.rdy').click();
    for (let i = 0; i < 30 && !Dx.every(X => X.ST.on); i++) await tick(T3, .5);
    assert(Dx.every(X => X.ST.on && X.ST.bt.length === 2), 'троє людей — у лобі доповнили лише 2 боти (усього 5)');
    assert(Dx.every(X => X.ST.on && X.ST.sk === 'p'), 'раунд утрьох: серед ГРАВЦІВ є саботажник (бачать усі)');
    await tick(T3, .5);
    const sabs = T3.filter(T => T.w.__deadline.V.sab);
    assert(sabs.length === 1, `саботажник рівно один (${sabs.length})`);
    const S = sabs[0], SX = S.w.__deadline, crewT = T3.filter(T => T !== S), Y = crewT[0], YX = Y.w.__deadline, Z = crewT[1];
    const role = T => { const r = T.w.document.getElementById('dl-role'); return r && r.style.display !== 'none' ? r.dataset.role : ''; };
    assert(role(S) === 'sab' && crewT.every(T => role(T) === 'crew'), `🤫 картку «🕵️ Ти — САБОТАЖНИК» бачить лише ${S.P.name || 'він'}; решта — «сумлінний працівник»`);
    assert(Dx.every(X => !JSON.stringify(X.ST.sh).includes(S.w.__deadline.myKey())), 'у знімку немає імені саботажника — лише хеш');
    assert(/🕵️/.test(S.w.document.querySelector('#modebar [data-ms="7"]').textContent) && crewT.every(T => /🚨/.test(T.w.document.querySelector('#modebar [data-ms="7"]').textContent)), 'у саботажника 8-й слот — 🕵️, у решти — 🚨 Нарада');
    // 🕵️ саботажник підпалює серверну — бачать усі
    at(S, SX.RACK.p); await tick(T3, .3); at(S, SX.RACK.p); S.w.document.querySelector('#modebar [data-ms="7"]').click();
    for (let j = 0; j < 40 && SX.V.act; j++) { at(S, SX.RACK.p); await tick(T3, .1); }
    await tick(T3, .6);
    assert(Dx.every(X => X.ST.fire > 0), `🔥 саботаж: серверна горить у всіх (${Dx.map(X => Math.round(X.ST.fire)).join('/')}%)`);
    assert(Dx.every(X => X.ST.cl.some(q => q.k === 'foot') && X.ST.cl.some(q => q.k === 'badge') && X.ST.camN >= 1), '🔎 докази саботажу (👣 сліди, 🪪 журнал бейджів, 📹 запис камери) — бачать усі');
    // 🎭 таємні ролі: серед двох чесних — 🛡️ безпековик (рівно один), у саботажника ролі немає
    assert(crewT.filter(T => T.w.__deadline.V.role === 'sec').length === 1 && !SX.V.role && Dx.every(X => !JSON.stringify(X.ST.rh).includes('Стажер')), `🛡️ безпековик рівно один (${crewT.map(T => T.w.__deadline.V.role || '—').join('/')}), ролі в знімку — лише хеші`);
    // 🧯 напарник гасить
    { const C = YX.fireC(); for (let n = 0; n < 6 && YX.ST.fire > 0; n++) { at(Y, { x: C.x + 2, z: C.z + 1 }); await tick(T3, .15); const it = Y.getInteract(); if (it && /Гасити/.test(it.l)) it.fn(); await tick(T3, .6); } }
    assert(Dx.every(X => X.ST.fire === 0), '🧯 напарник загасив серверну — у всіх вогонь згас');
    { const q = YX.ST.cl.find(o => o.k === 'badge'); at(Y, q); await tick(T3, .2); const it = Y.getInteract(); assert(it && /Зібрати доказ/.test(it.l), 'біля місця саботажу F — «Зібрати доказ»'); it.fn();
      for (let i = 0; i < 10 && !Dx.every(X => X.ST.cs.length); i++) await tick(T3, .2);
      assert(Dx.every(X => X.ST.cs.length >= 1 && /👣|🪪/.test(X.ST.cs[0].txt)), `🗂️ доказ у справі — бачать усі (рахує сервер): ${YX.ST.cs[0] && YX.ST.cs[0].txt}`); }
    { const SEC = crewT.find(T => T.w.__deadline.V.role === 'sec'), OT = T3.find(T => T !== SEC), SC = SEC.w.__deadline, mp = SC.mpos(), p0 = { x: mp.x - .6, z: mp.z }, p1 = { x: mp.x + .6, z: mp.z };
      at(SEC, p0); at(OT, p1); await tick(T3, .4); at(SEC, p0); at(OT, p1); const it = SEC.getInteract();
      assert(it && /Перевірити/.test(it.l), `🛡️ безпековик біля колеги: «${it && it.l}»`); it.fn(); await tick(T3, .6);
      const toastsOf = T => [...T.w.document.querySelectorAll('#toasts > *')].map(e => e.textContent).join('\n');
      assert(/Результат бачиш лише ти/.test(toastsOf(SEC)) && T3.filter(T => T !== SEC).every(T => !/Результат бачиш лише ти/.test(toastsOf(T))), '🛡️ результат перевірки бачить лише безпековик'); }
    // ⚡ блекаут: саботажник вимикає щиток — темно в усіх; двоє тримають F біля щитка разом
    { for (let i = 0; i < 40 && SX.V.sbcd > 0; i++) await tick(T3, .5);
      at(S, SX.PANEL.p); await tick(T3, .3); at(S, SX.PANEL.p); S.w.document.querySelector('#modebar [data-ms="7"]').click();
      for (let j = 0; j < 40 && SX.V.act; j++) { at(S, SX.PANEL.p); await tick(T3, .1); }
      for (let i = 0; i < 10 && !Dx.every(X => !X.ST.pw); i++) await tick(T3, .2);
      assert(Dx.every(X => !X.ST.pw) && +Y.w.document.getElementById('dl-dark').style.opacity > .5, '⚡ саботаж щитка: темно в усіх, у кожного — ліхтарик');
      const P = YX.PANEL.p, pa = { x: P.x - .5, z: P.z + .3 }, pb = { x: P.x + .5, z: P.z + .3 };
      at(Y, pa); at(Z, pb); await tick(T3, .4); at(Y, pa); at(Z, pb);
      const iy = Y.getInteract(), iz = Z.getInteract();
      if (Dx.every(X => X.ST.pw)) console.log('  (🤖 бот устиг увімкнути щиток раніше за людей)'); else {
      assert(iy && /РАЗОМ/.test(iy.l) && iz && /РАЗОМ/.test(iz.l), '⚡ удвох біля щитка: F — «Тримай автомат РАЗОМ з колегою»'); iy.fn(); iz.fn();
      for (let j = 0; j < 40 && (YX.V.act || Z.w.__deadline.V.act); j++) { at(Y, pa); at(Z, pb); await tick(T3, .1); }
      for (let i = 0; i < 10 && !Dx.every(X => X.ST.pw); i++) await tick(T3, .2);
      } assert(Dx.every(X => X.ST.pw), '💡 двоє втримали автомат — світло повернулось у всіх'); }
    // 🪑 крісло на коліщатках: інші бачать крісло під вершником і позу «сидячи»
    { const BZ = Z.BODIES, bi = BZ.findIndex(b => b.kind === 'chair' && Z.w.__deadline.floorOf(b.x, b.z) === D.ST.vi && !b.fall), B = BZ[bi];
      at(Z, B); Z.mount(B); for (let i = 0; i < 10; i++) { B.vx = 3; B.vz = 0; await tick(T3, .1); }
      const BY = Y.BODIES[bi], rp = Object.values(Y.NET.players).find(p => p.name === Z.P.name || p.name === Z.w.__deadline.myKey());
      assert(Y.ADDONS.dyn.includes(BY.m) && Math.hypot(BY.m.position.x - Z.pl.x, BY.m.position.z - Z.pl.z) < 1.2, '🪑 крісло динамічне — у колеги воно їде під вершником');
      assert(rp && rp.act === 'chair' && rp.h.body.position.y < -.3, '🪑 колега бачить вершника в позі «сидячи»');
      Z.dismount(false); await tick(T3, .3); }
    // ✈️ літачки в колегу → 😤 «зайобуючий» у всіх
    // ✈️ папір — з лотка (F); 🧻 папірець, кинутий одним, бачать усі
    { const sp = YX.L.pk.find(q => q.k === 'pp' && YX.pkOn(q)); at(Y, sp); await tick(T3, .2); const it = Y.getInteract(); assert(it && /скласти літачок/.test(it.l), 'біля лотка з папером F — «скласти літачок (+3)»'); it.fn(); assert(YX.V.pp === 5, '✈️ 2 + 3 = 5 літачків'); }
    { at(Y, YX.START.p); Y.pl.face = 0; await tick(T3, .2); Y.w.document.querySelector('#modebar [data-ms="4"]').click(); let seen = 0; for (let i = 0; i < 10 && !seen; i++) { await tick(T3, .1); seen = Dx.every(X => X.ST.th.length || X === YX); } assert(seen, '🧻 мʼятий папір у польоті бачать усі'); await tick(T3, 1.5); assert(Dx.every(X => !X.ST.th.length), '🧻 приземлився в усіх'); }
    { const cp = YX.colPos(1); for (let n = 0; n < 7 && !Dx.every(X => X.pestOf(1)); n++) { if (YX.V.pp < 1) YX.V.pp = 3; at(Y, { x: cp.x + 2.5, z: cp.z }); Y.pl.face = -Math.PI / 2; await tick(T3, .2); YX.V.ppCd = 0; Y.w.document.querySelector('#modebar [data-ms="3"]').click(); await tick(T3, .9); } }
    await tick(T3, .5);
    assert(Dx.every(X => X.pestOf(1)) && D.V.cols[1] && !D.V.cols[1].h.root.visible && Z.w.document.querySelector('.dl-agw'), `✈️×3 — ${YX.NAMES[1]} став «зайобуючим» у всіх (стілець порожній, над ним — яку каву хоче)`);
    // 🚨 нарада №1 (v6): невинного гравця звільняють — для нього раунд скінчився (підсумок, ліфтовий хол), решта грає далі
    const mt = T => T.w.document.getElementById('dl-meet');
    const FI = crewT.find(T => T.w.__deadline.V.role !== 'int'), FIX = FI.w.__deadline, OT = crewT.find(T => T !== FI), OTX = OT.w.__deadline;
    const meetAll = async (who) => {
      who.w.document.querySelector('#modebar [data-ms="7"]').click(); await tick(T3, 1);
      const mp = YX.mpos(); T3.forEach((T, i) => at(T, { x: mp.x + (i - 1) * .7, z: mp.z }));
      for (let i = 0; i < 10 && !Dx.every(X => X.ST.on && X.ST.mt && X.ST.mt.ph === 'vote' || !X.ST.on); i++) await tick(T3, .3);
    };
    {
      await meetAll(FI);
      assert(Dx.every(X => X.ST.mt && X.ST.mt.ph === 'vote') && T3.every(T => /Негайно в переговорну/.test(T.w.__deadline.goal().txt) || T.w.__deadline.ST.mt), '🚨 збори №1 скликав ' + FIX.myKey() + ' — усі в переговорній, голосування');
      assert(T3.every(T => mt(T) && mt(T).style.display !== 'none' && mt(T).querySelectorAll('.dlm-c').length === 2 && /Продовжити роботу/.test(mt(T).textContent) && /Справа/.test(mt(T).textContent)), '🚨 збори у всіх: «Звільнити …» ×2 (себе не видно), «⏭️ Продовжити роботу», 🗂️ справа');
      const fk = FIX.myKey(), fi = D.ST.mt.c.indexOf(fk);
      for (const T of [OT, S]) mt(T).querySelector(`[data-mv="${fi}"]`).click(); mt(FI).querySelector('[data-mv="-1"]').click();
      await tick(T3, 1.5);
      assert(Dx.every(X => X.ST.on && !X.ST.mt && X.ST.fd.includes(fk) && !X.ST.sbC), `📦 ${fk} звільнили (не саботажник) — раунд у решти триває`);
      const fe = FI.w.document.getElementById('dl-final');
      assert(fe && fe.style.display !== 'none' && /звільнили/.test(fe.textContent) && FIX.V.firedRid === FIX.ST.rid && Math.hypot(FI.pl.x - FIX.START.p.x, FI.pl.z - FIX.START.p.z) < 2, 'звільненому — підсумок «Тебе звільнили» і ліфтовий хол');
      const n0 = FIX.ST.fd.length; FI.w.document.querySelector('#modebar [data-ms="7"]') && FI.w.document.querySelector('#modebar [data-ms="7"]').click(); await tick(T3, .8);
      assert(Dx.every(X => !X.ST.mt && X.ST.fd.length === n0), 'звільнений більше нічого не може в раунді (нараду не скликає)');
      await tick(T3, 25.5);   // перерва між нарадами
    }
    // 🚨 нарада №2: OT скликає й голосує за саботажника, той мовчить — по таймеру саботажника спіймано, раунд виграно (v6)
    {
      await meetAll(OT);
      assert(Dx.every(X => X.ST.mt && X.ST.mt.ph === 'vote' && X.ST.mt.c.length === 2), '🚨 збори №2 — кандидатів двоє (звільненого вже нема)');
      const sk = SX.myKey(), si = D.ST.mt.c.indexOf(sk);
      mt(OT).querySelector(`[data-mv="${si}"]`).click();
      for (let i = 0; i < 30 && Dx.some(X => X.ST.on); i++) await tick(T3, 1);
      assert(Dx.every(X => !X.ST.on && X.ST.sbC === 1) && T3.every(T => !mt(T) || mt(T).style.display === 'none'), `🕵️ спіймали саботажника (${sk}) — раунд скінчився в усіх`);
      assert([OT, S].every(T => /Звільнено/.test(T.w.document.getElementById('dl-verdict').textContent) && /БУВ/.test(T.w.document.getElementById('dl-verdict').textContent)), '🗂️ драматичний вердикт: «Звільнено: … — БУВ саботажником!»');
      await tick(T3, .3);
      assert(!S.MODEBAR && !OT.MODEBAR, 'після раунду — звичайний хотбар');
    }
    c.leave(); await tick(T3, .5);
  }
  console.log('ALL OK'); cleanup(0);
})().catch(e => { console.error(e); cleanup(1); });
