// Тест «Битви за принтер» v2 на сервері світу: двоє гравців, лобі-вікно (голос + «Я готовий»), боти, кнопка тривоги.
// Запуск: node test/printerwar-world-test.js
const fs = require('fs'), path = require('path'), os = require('os'), { spawn } = require('child_process');
const { JSDOM } = require('jsdom');
const THREE = require('three');
const root = path.join(__dirname, '..');
const PORT = 7800;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'barista-world-'));
for (const f of ['start.py']) fs.copyFileSync(path.join(root, f), path.join(tmpRoot, f));
for (const d of ['dist', 'src', 'server']) fs.cpSync(path.join(root, d), path.join(tmpRoot, d), { recursive: true });
fs.symlinkSync(path.join(root, 'node_modules'), path.join(tmpRoot, 'node_modules'));
fs.cpSync(path.join(root, 'addons/_examples/printerwar'), path.join(tmpRoot, 'addons/printerwar'), { recursive: true });
const srv = spawn('python3', [path.join(tmpRoot, 'start.py'), '--no-ui', '--tunnel', 'none', '--port', String(PORT)], { stdio: 'ignore' });
function cleanup(code) { try { srv.kill(); } catch (e) { } try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch (e) { } process.exit(code); }
const T0 = Date.now();
// телепорт гравця в тесті — не за межі поверху 63 (інакше сервер вважає, що гравець пішов з раунду)
let cx = x => x, cz = z => z;
const pk = (X, k) => { const m = X.ST.ps.find(p => p.k === k); if (!m) console.log('DBG немає', k, ((Date.now() - T0) / 1000).toFixed(1) + 's', X.ST.ph, X.ST.t, JSON.stringify(X.ST.ps.map(p => [p.k, p.pages]))); return m; };
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); cleanup(1); } console.log('ok -', m, process.env.PWT ? ((Date.now() - T0) / 1000).toFixed(1) + 's' : ''); };
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
  src += ';window.__T={get MLOBBY(){return MLOBBY},get P(){return P},pl,NET,WORLD,MON,BODIES,PROPS,ISLMAP,input,startGame,frame,setAcct,attack,carryTarget,pickUpAny,releaseCarry,mount,dismount,useDrink,setDrink:d=>{selDrink=d},get worldReady(){return worldReady},get S(){return S},getInteract:()=>getInteract(),hurt:d=>hurtPlayer(d),get keys(){return keys},get gt(){return gameTime},get panel(){return panel},get paused(){return paused},openPanel,terrainAt:(x,z)=>terrainAt(x,z),keydown:c=>dispatchEvent(new KeyboardEvent("keydown",{code:c}))};';
  w.eval(src);
  const reg = await post('register', { login: name, pass: 'pass-' + name });
  w.__T.setAcct({ token: reg.token, login: reg.login, admin: reg.admin });
  const T = w.__T; T.now = 1000; T.w = w;
  for (let i = 0; i < 50 && !T.worldReady; i++) await sleep(100);
  T.startGame(true); T.P.tut = -1;
  return T;
}
const tick = async (Ts, sec) => { for (let i = 0; i < sec * 20; i++) { for (const T of Ts) { T.now += 50; T.frame(T.now); } await sleep(50); } };
/* ✈️ літачки скінчились — збігати до лотка з папером (F на сервері) */
async function refill(Ts, T, X, who) {
  const me = X.ST.ps.find(p => p.k === who); if (!me || me.pl > 0) return false;
  const D = X.VAR[X.ST.v], N = X.navOf(D), tr = D.picks.map((p, i) => [p, i]).filter(([p]) => p.k === 'pl'), [s, i] = tr[(T.ri = (T.ri || 0) + 1) % tr.length];
  for (let k = 0; k < 8; k++) { const x = s.x + Math.sin(k * .785) * 1.1, z = s.z + Math.cos(k * .785) * 1.1, ci = Math.floor((x - N.x0) / N.cell), cj = Math.floor((z - N.z0) / N.cell); if (!N.block[ci + cj * N.nx]) { T.pl.x = x; T.pl.z = z; break; } }
  await tick(Ts, .3); X.req('take', { i }); await tick(Ts, .3); return true;
}
const near = (T, x, z, r) => [...T.WORLD.proxies.values()].filter(m => Math.hypot(m.x - x, m.z - z) < r);
(async () => {
  let st = null;
  for (let i = 0; i < 300; i++) { try { st = await (await fetch(`http://127.0.0.1:${PORT}/status`)).json(); if (st.world) break; } catch (e) { } await sleep(200); }
  assert(st && st.world, 'сервер світу запустився');
  const a = await client('Друкар'), b = await client('Конкурент');
  await tick([a, b], 1.5);
  const W = a.w.__printer, Q = b.w.__printer;
  // обоє заходять у режим (як з Esc-меню) — сервер записує в лобі, у кожного відкривається вікно
  for (const T of [a, b]) { T.pl.hp = 9999; T.w.__printer.goPrinter(0); }
  for (let i = 0; i < 20 && !(W.ST.ph === 'lobby' && Q.ST.ps.length === 2 && a.MLOBBY && b.MLOBBY); i++) await tick([a, b], .3);
  assert(W.ST.ph === 'lobby' && Q.ST.ps.length === 2, 'обоє в лобі (рахує сервер)');
  assert(a.MLOBBY && b.MLOBBY && a.w.document.getElementById('mlobby') && b.w.document.querySelectorAll('#mlobby [data-lv]').length === 3, 'в обох відкрилось вікно лобі з трьома поверхами');
  // голосують кліком по картках: Друкар — 63, Конкурент — 63 (через onVote)
  a.w.document.querySelector('#mlobby [data-lv="2"]').click(); b.MLOBBY.onVote(2);
  for (let i = 0; i < 15 && !(Q.ST.votes['Друкар'] === 2 && W.ST.votes['Конкурент'] === 2); i++) await tick([a, b], .3);
  assert(Q.ST.votes['Друкар'] === 2 && W.ST.votes['Конкурент'] === 2, 'голоси обох за поверх 63 бачать обидва');
  await tick([a, b], .3);
  assert(b.MLOBBY.votes.join() === '0,0,2' && b.MLOBBY.players.length === 2, `вікно лобі: лічильник голосів ${b.MLOBBY.votes} і список гравців`);
  // Друкар «Я готовий» → лобі заповнюється ботами (по одному); Конкурент ще думає
  a.MLOBBY.onReady();
  for (let i = 0; i < 15 && !(Q.ST.ready['Друкар'] && Q.ST.fill); i++) await tick([a, b], .3);
  assert(W.ST.ph === 'lobby' && Q.ST.ready['Друкар'] && Q.ST.fill && Q.ST.ps.length === 2 && /боти доповнять/.test(b.MLOBBY.info), `Друкар готовий — не старт, а заповнення: «${b.MLOBBY.info}»`);
  { let seen3 = false; for (let i = 0; i < 60 && Q.ST.ps.length < 5; i++) { await tick([a, b], .3); if (Q.ST.ps.length === 3 && /приєднався · 3\/5/.test(b.MLOBBY ? b.MLOBBY.info : '')) seen3 = true; }
    await tick([a, b], .4);
    assert(seen3 && W.ST.ps.length === 5 && Q.ST.ps.filter(p => p.bot).length === 3 && b.MLOBBY.players.filter(p => /🤖 Бот/.test(p.n) && p.ready).length === 3 && W.ST.ph === 'lobby', `🤖 боти по одному доповнили лобі до 5 — обоє бачать у списку (${b.MLOBBY.players.map(p => p.n).join(', ')})`);
    assert(/готові 1\/2/.test(b.MLOBBY.info) && /стартуємо за 2\d с/.test(b.MLOBBY.info), `лобі повне, Конкурент не готовий — чекаємо (25 с): «${b.MLOBBY.info}»`); }
  const lobbyBots = Q.ST.ps.filter(p => p.bot).map(p => p.k).join();
  // ховає й відкриває вікно знову
  b.MLOBBY.onHide(); await tick([a, b], .3); assert(!b.MLOBBY && !b.w.document.getElementById('mlobby'), '«Сховати» — вікно Конкурента закрилось');
  { const Bd = Q.VAR[0].board; b.pl.x = Bd.x; b.pl.z = Bd.z - 1.3; await tick([a, b], .3); const it = b.getInteract(); assert(it && /Лобі/.test(it.l), 'F біля стенда — «Лобі»'); it.fn(); await tick([a, b], .3); assert(b.MLOBBY, 'вікно знову відкрите'); }
  b.w.document.querySelector('#mlobby .rdy').click();
  { let cd = false; for (let i = 0; i < 30 && !(W.ST.ph === 'fight' && Q.ST.ph === 'fight'); i++) { await tick([a, b], .3); if (a.MLOBBY && /старт за [123]/.test(a.MLOBBY.info)) cd = true; }
    assert(cd, '«Усі на місці — старт за 3…2…1» у вікні Друкаря'); }
  assert(W.ST.ph === 'fight' && Q.ST.ps.length === 5 && W.ST.v === 2 && Q.ST.v === 2, 'всі готові — битва на поверсі 63: 2 гравці + 3 боти');
  { const D = Q.VAR[2], m = .9; cx = x => Math.max(D.cx - D.w / 2 + m, Math.min(D.cx + D.w / 2 - m, x)); cz = z => Math.max(D.cz - D.d / 2 + m, Math.min(D.cz + D.d / 2 - m, z)); }
  assert(Q.ST.ps.filter(p => p.bot).map(p => p.k).join() === lobbyBots, `у раунді ті самі боти, що були в лобі (${lobbyBots})`);
  await tick([a, b], .3);
  assert(!a.MLOBBY && !b.MLOBBY && !a.w.document.getElementById('mlobby') && !b.w.document.getElementById('mlobby'), 'раунд почався — вікно лобі закрилось в обох');
  assert(W.varAt(a.pl.x, a.pl.z) === 2 && Q.varAt(b.pl.x, b.pl.z) === 2, 'ліфт: обох перенесло на поверх 63');
  const bot = W.ST.ps.find(p => p.bot), bx = bot.x, bz = bot.z;
  await tick([a, b], 1.5);
  assert(Math.hypot(bot.x - bx, bot.z - bz) > 1, 'боти біжать до принтера — бачать обоє');
  // Друкар у колі біля активного принтера
  let owned = false, pushed = false;
  for (let i = 0; i < 120 && !pushed; i++) { if (!pushed) { a.pl.x = W.PX + 1.6; a.pl.z = W.PZ; } await tick([a, b], .1); if (Q.ST.owner === 'Друкар' || Q.ST.owner === '*') owned = true; if (Math.hypot(a.pl.x - W.PX - 1.6, a.pl.z - W.PZ) > .8) pushed = true; }
  assert(owned, `Конкурент бачить, хто біля принтера (${Q.ST.owner})`);
  const pa = pk(W, 'Друкар'), pb = pk(Q, 'Друкар');
  assert(pa && pb && Math.abs(pa.pages - pb.pages) <= 2, `сторінки однакові в обох (${pa.pages} / ${pb.pages})`);
  assert(pushed, 'бот-офісник виштовхнув Друкаря з кола');
  // Конкурент тисне кнопку тривоги — начальник для всіх
  { const al = Q.VAR[2].alarm; b.pl.x = al.x - 1; b.pl.z = al.z; await tick([a, b], .6); let pressed = false;
    for (let i = 0; i < 80 && !(W.ST.ev === 'boss' && Q.ST.ev === 'boss'); i++) {   // якщо саме йде інша подія — чекаємо й тиснемо знову
      b.pl.x = al.x - 1; b.pl.z = al.z;
      if (!Q.ST.ev && Q.ST.ac <= 0) { const it = b.getInteract(); if (it && /тривог/.test(it.l)) { it.fn(); pressed = true; } }
      await tick([a, b], .3);
    }
    assert(pressed && W.ST.ev === 'boss' && Q.ST.ev === 'boss' && W.ST.ac > 20, '🚨 Конкурент натиснув тривогу через сервер — «Начальник іде!» в обох'); }
  { // ✈️ 📘 🧻 снаряди беруться на сервері: лоток, шафа, смітник
    const me = () => pk(Q, 'Конкурент'), D = Q.VAR[2];
    for (const k of ['bk', 'cr']) { const i = D.picks.findIndex(p => p.k === k), s = D.picks[i], N = Q.navOf(D);
      for (let j = 0; j < 8; j++) { const x = s.x + Math.sin(j * .785) * 1.1, z = s.z + Math.cos(j * .785) * 1.1, ci = Math.floor((x - N.x0) / N.cell), cj = Math.floor((z - N.z0) / N.cell); if (!N.block[ci + cj * N.nx]) { b.pl.x = x; b.pl.z = z; break; } }
      await tick([a, b], .4); const it = b.getInteract(); assert(it && /\(\+[25]\)/.test(it.l), `біля «${Q.ITEM[k].lbl}» F — «${it && it.l}»`); it.fn(); }
    for (let i = 0; i < 15 && !(me().bk === 2 && me().cr === 5 && pk(W, 'Конкурент').cr === 5); i++) await tick([a, b], .2);
    assert(me().bk === 2 && me().cr === 5 && pk(W, 'Конкурент').bk === 2, '📘 +2 книжки й 🧻 +5 папірців через сервер — бачать обоє');
    const bot = W.ST.ps.find(p => p.bot); b.pl.x = bot.x - 3; b.pl.z = bot.z; await tick([a, b], .2); Q.req('book', { a: Math.atan2(bot.x - b.pl.x, bot.z - b.pl.z) });
    let ok = false; for (let i = 0; i < 15 && !ok; i++) { await tick([a, b], .1); ok = me().bk === 1; }
    assert(ok, '📘 Конкурент кинув книжку через сервер'); }
  // --- хаос через сервер: кулер-калюжа, колеги-зомбі + кава, Румба з бомбою, вогнегасник
  { const D = Q.VAR[2], c = D.coolers[0]; a.pl.x = c.x + 1.2; a.pl.z = c.z; await tick([a, b], .4); W.req('cooler', { i: 0 });
    for (let i = 0; i < 15 && !(W.ST.wp.length && Q.ST.wp.length); i++) await tick([a, b], .2);
    assert(W.ST.wp.length === 1 && Q.ST.wp.length === 1 && Q.wetAt(c.x + 1, c.z), '💦 Друкар перекинув кулер — калюжу бачать обоє');
    // 🔌 дріт з ПК у калюжу — струм для всіх
    const pc = D.pcs.slice().sort((u, v) => Math.hypot(u.x - c.x, u.z - c.z) - Math.hypot(v.x - c.x, v.z - c.z))[0];
    a.pl.x = pc.x + 1; a.pl.z = pc.z; await tick([a, b], .4); W.req('wireget');
    for (let i = 0; i < 15 && !(pk(Q, 'Друкар').wi); i++) await tick([a, b], .2);
    assert(pk(Q, 'Друкар').wi === 1, '🔌 Друкар висмикнув дріт з ПК (бачить і Конкурент)');
    a.pl.x = c.x - 3.3; a.pl.z = c.z; await tick([a, b], .4); W.req('wire', { a: Math.PI / 2 });
    for (let i = 0; i < 15 && !(Q.ST.wp[0] && Q.ST.wp[0].el > 0); i++) await tick([a, b], .1);
    assert(W.ST.wp[0] && Q.ST.wp[0] && Q.ST.wp[0].el > 0 && Q.zapAt(c.x - 1, c.z), '⚡ калюжа під напругою — в обох'); }
  { // 🍾 Молотов Конкурента — палаюча калюжа в обох
    const D = Q.VAR[2]; b.pl.x = D.cx - 3; b.pl.z = D.cz + 4.5; await tick([a, b], .4); Q.req('molo', { a: Math.PI / 2 });
    for (let i = 0; i < 15 && !(W.ST.mf.length && Q.ST.mf.length); i++) await tick([a, b], .2);
    assert(W.ST.mf.length >= 1 && Q.ST.mf.length >= 1 && pk(Q, 'Конкурент').mo === 1, '🍾 Молотов Конкурента — палаюча калюжа бачать обоє'); }
  { let sawZ = false, served = false; const cf = () => { const m = pk(Q, 'Конкурент'); if (!m) console.log('DBG no Конкурент', Q.ST.ph, Q.ST.t, W.ST.ph, JSON.stringify(Q.ST.ps.map(p => [p.k, p.pages]))); return ((m && m.cf) || []).reduce((s, v) => s + v, 0); };
    const cf0 = cf();
    for (let i = 0; i < 160 && !served; i++) {
      const zA = W.ST.npc.find(n => n.zom), zB = zA && Q.ST.npc.find(n => n.id === zA.id && n.zom);
      if (zA && zB) { sawZ = true; b.pl.x = cx(zB.x + .6); b.pl.z = cz(zB.z); Q.req('coffee', { id: zB.id }); }
      else if (!zA && i % 3 === 0) {   // Друкар пуляє літачки в колегу, поки той не озвіріє
        const n = W.ST.npc[0]; for (const [T, X, who, dx] of [[a, W, 'Друкар', -2.2], [b, Q, 'Конкурент', 2.2]]) { const me = X.ST.ps.find(p => p.k === who); if (me && me.pl <= 0) { await refill([a, b], T, X, who); continue; } if (n && me && me.pl > 0) { T.pl.x = cx(n.x + dx); T.pl.z = cz(n.z); await tick([a, b], .1); X.req('plane', { a: Math.atan2(n.x - T.pl.x, n.z - T.pl.z) }); } }
      }
      await tick([a, b], .25); served = cf() < cf0;
    }
    assert(sawZ, '🧟 колега озвірів — «зайобуючого» бачать обидва');
    assert(served, '☕ Конкурент пригостив зомбі кавою через сервер (кава витрачена)'); }
  { let armed = false, sawArm = false;
    for (let i = 0; i < 60 && !armed; i++) { const r = W.ST.rb; if (r && !r.arm) { a.pl.x = cx(r.x + .7); a.pl.z = cz(r.z); await tick([a, b], .1); W.req('arm'); } await tick([a, b], .25); if (Q.ST.rb && Q.ST.rb.arm === 'b' && Q.ST.rb.by === 'Друкар') sawArm = true; armed = pk(Q, 'Друкар').bo === 0; }
    for (let i = 0; i < 4 && !sawArm; i++) { await tick([a, b], .1); if (Q.ST.rb && Q.ST.rb.arm === 'b') sawArm = true; }
    assert(armed && pk(W, 'Друкар').bo === 0, `💣 Друкар прикрутив бомбу до Румби через сервер (Конкурент ${sawArm ? 'бачив Румбу-камікадзе' : 'бачить, що бомбу витрачено — Румба вибухнула миттєво'})`);
    let gone = false; for (let i = 0; i < 80 && !gone; i++) { await tick([a, b], .25); gone = !(Q.ST.rb && Q.ST.rb.arm) && !(W.ST.rb && W.ST.rb.arm); }
    assert(gone, '💥 Румба вибухнула (у обох)'); }
  { const fo = () => pk(Q, 'Конкурент').fo, f0 = fo(); await tick([a, b], 2); const f1 = fo(); Q.req('spray', { a: 0 });
    let ok = false; for (let i = 0; i < 15 && !ok; i++) { await tick([a, b], .2); const f = pk(W, 'Конкурент').fo; ok = f < f1 - 10; }
    assert(ok, `🧯 Конкурент пшикнув вогнегасником — заряд піни зменшився й у Друкаря (${Math.round(f0)}%)`); }
  { // ✈️ літачки в ПК → шанс, що ПК заспамить серверну → 🔥 пожежа (друк стоїть), гасимо 🧯
    const D = Q.VAR[2], pc = D.pcs.slice().sort((u, v) => Math.hypot(u.x - D.cx + 16.6, u.z - D.cz - 3) - Math.hypot(v.x - D.cx + 16.6, v.z - D.cz - 3))[0];
    let fire = false, n = 0;
    for (let i = 0; i < 160 && !fire; i++) {
      for (const [T, X, who] of [[a, W, 'Друкар'], [b, Q, 'Конкурент']]) {
        const me = X.ST.ps.find(p => p.k === who); T.pl.x = pc.x + 2.6; T.pl.z = pc.z + (T === a ? .15 : -.15);
        if (me && me.pl <= 0 && !X.ST.sf) { await refill([a, b], T, X, who); continue; }
        if (me && me.pl > 0 && i % 4 === 0 && !X.ST.sf) { X.req('plane', { a: -Math.PI / 2 }); n++; }
      }
      await tick([a, b], .25); fire = !!(W.ST.sf && Q.ST.sf);
    }
    assert(fire, `🔥 після ${n} літачків у ПК серверна загорілась — бачать обоє`);
    const sf = Q.ST.sf; let out = false;
    for (let i = 0; i < 120 && !out; i++) { b.pl.x = sf.x + sf.r + 1.2; b.pl.z = sf.z; if (i % 3 === 0) Q.req('spray', { a: -Math.PI / 2 }); await tick([a, b], .25); out = !W.ST.sf && !Q.ST.sf; }
    assert(out, '🧯 серверну загасили — друк іде далі (в обох)'); }
  // обоє йдуть — арена звільняється
  for (const T of [a, b]) { T.pl.x = 0; T.pl.z = 3; }
  for (let i = 0; i < 20 && W.ST.ph !== 'idle'; i++) await tick([a, b], .3);
  assert(W.ST.ph === 'idle' && Q.ST.ph === 'idle', 'всі пішли — битва скинулась');
  console.log('ALL OK'); cleanup(0);
})().catch(e => { console.error(e); cleanup(1); });
