// Тест «Нічної зміни» v2 на сервері світу: голосування за поверх (63-й), спільні зомбі, одного тягнуть у підвал — другий світить і зомбі кидає,
// піднімає; затягли в підвал — другий викликає ліфт і витягає; втеча для обох.
// Запуск: node test/nightshift-world-test.js
const fs = require('fs'), path = require('path'), os = require('os'), { spawn } = require('child_process');
const { JSDOM } = require('jsdom');
const THREE = require('three');
const root = path.join(__dirname, '..');
const PORT = 7813;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'barista-world-'));
for (const f of ['start.py']) fs.copyFileSync(path.join(root, f), path.join(tmpRoot, f));
for (const d of ['dist', 'src', 'server']) fs.cpSync(path.join(root, d), path.join(tmpRoot, d), { recursive: true });
fs.symlinkSync(path.join(root, 'node_modules'), path.join(tmpRoot, 'node_modules'));
fs.cpSync(path.join(root, 'addons/_examples/nightshift'), path.join(tmpRoot, 'addons/nightshift'), { recursive: true });
// тестові прапорці (і на сервері, і в гравців): лобі доповнюється ботами кожні 0,2 с; боти йдуть зі зміни через 5 с (далі — старий сценарій на двох)
{ const f = path.join(tmpRoot, 'addons/nightshift/addon.js'); fs.writeFileSync(f, 'window.__nightshiftFastLobby = 1; window.__nightshiftBotsOut = 5;\n' + fs.readFileSync(f, 'utf8')); }
const srv = spawn('python3', [path.join(tmpRoot, 'start.py'), '--no-ui', '--tunnel', 'none', '--port', String(PORT)], { stdio: 'ignore' });
function cleanup(code) { if (code && process.env.NS_LOG) try { for (const f of fs.readdirSync(path.join(tmpRoot, 'logs'))) console.error(fs.readFileSync(path.join(tmpRoot, 'logs', f), 'utf8').split('\n').filter(l => /VOTE|rror|аддон/i.test(l)).slice(-30).join('\n')); } catch (e) { } try { srv.kill(); } catch (e) { } try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch (e) { } process.exit(code); }
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
  src += ';window.__T={get P(){return P},pl,NET,WORLD,input,startGame,frame,setAcct,get worldReady(){return worldReady},getInteract:()=>getInteract(),get MODEBAR(){return MODEBAR},get keys(){return keys},get panel(){return panel},keydown:c=>dispatchEvent(new KeyboardEvent("keydown",{code:c}))};';
  w.eval(src);
  const reg = await post('register', { login: name, pass: 'pass-' + name });
  w.__T.setAcct({ token: reg.token, login: reg.login, admin: reg.admin });
  const T = w.__T; T.now = 1000; T.w = w; T.name = reg.login;
  for (let i = 0; i < 50 && !T.worldReady; i++) await sleep(100);
  T.startGame(true); T.P.tut = -1;
  return T;
}
/* «охоронець»: тримає ліхтарик на найближчому зомбі, щоб той завмер */
let guards = [];
const aim = (T, skip) => {
  const N = T.w.__nightshift; let best = null, bd = 10;
  for (const e of N.ST.en) { if (e.st === 'happy' || e === skip) continue; const d = Math.hypot(e.x - T.pl.x, e.z - T.pl.z) - (e.st === 'chase' ? 3 : 0); if (d < bd) { bd = d; best = e; } }
  if (best) T.pl.face = Math.atan2(best.x - T.pl.x, best.z - T.pl.z);
  return best;
};
const tick = async (Ts, sec) => { for (let i = 0; i < sec * 20; i++) { let tg = null; for (const T of guards) tg = aim(T, tg) || tg; for (const T of Ts) { T.now += 50; T.frame(T.now); } await sleep(50); } };
const tp = (T, p, dx = 0, dz = 0) => { T.pl.x = p.x + dx; T.pl.z = p.z + dz; T.pl.y = 0; T.w.__nightshift.V.lastP = null; };
(async () => {
  let st = null;
  for (let i = 0; i < 300; i++) { try { st = await (await fetch(`http://127.0.0.1:${PORT}/status`)).json(); if (st.world) break; } catch (e) { } await sleep(200); }
  assert(st && st.world, 'сервер світу запустився');
  const a = await client('Ліхтар'), b = await client('Батарейка');
  await tick([a, b], 1.5);
  const F = a.w.__nightshift, G = b.w.__nightshift, AB = [a, b];
  const L0 = F.FLOORS[0];
  for (const T of AB) { tp(T, L0.SPAWN, T === a ? -1 : 1); T.pl.hp = 9999; }
  await tick(AB, 1);
  // лобі-попап: голос кліком по картці, потім «✅ Я готовий» у кожного
  const lbOf = T => T.w.document.getElementById('mlobby'), cardOf = (T, i) => lbOf(T) && lbOf(T).querySelector(`[data-lv="${i}"]`), rdyOf = T => lbOf(T) && lbOf(T).querySelector('.rdy');
  assert(AB.every(T => lbOf(T) && lbOf(T).querySelectorAll('[data-lv]').length === 3), 'обом у лобі відкрився попап з трьома картками поверхів');
  for (let k = 0; k < 40 && !(F.ST.lp.length === 2 && G.ST.lp.length === 2); k++) await tick(AB, .25);   // сервер бачить обох у лобі
  assert(F.ST.lp.length === 2 && G.ST.lp.length === 2, 'у списку гравців попапу — обоє (⏳)' + (F.ST.lp.length === 2 ? '' : ' ' + JSON.stringify({ F: F.ST.lp, G: G.ST.lp, a: [a.pl.x, a.pl.z, a.running], b: [b.pl.x, b.pl.z, b.running], on: F.ST.on })));
  cardOf(a, 2).click(); cardOf(b, 2).click(); await tick(AB, 1.5);
  assert(F.ST.vt[2] === 2 && G.ST.nx === 2 && F.ST.nx === 2, `обоє клікнули «63» у попапі — сервер рахує «${F.FLOORS[2].n}» (бачать обоє)`);
  cardOf(b, 0).click(); await tick(AB, 1.5);
  assert(F.ST.vt[2] === 1 && F.ST.vt[0] === 1 && G.ST.vt[0] === 1, 'Батарейка передумала (42) — 1:1, бачать обоє');
  cardOf(b, 2).click(); await tick(AB, 1.5); assert(F.ST.vt[2] === 2 && F.ST.nx === 2, 'повернулась на 63 — знову 63');
  rdyOf(a).click(); await tick(AB, .25);
  for (let k = 0; k < 40 && G.ST.lp.length < 5; k++) await tick(AB, .25);
  const botsL = G.ST.lp.filter(q => q[3]).map(q => q[0]);
  assert(!F.ST.on && G.ST.lp.some(q => q[0] === a.name && q[2] === 1) && botsL.length === 3 && botsL.every(n => /^🤖 Бот /.test(n)) && F.ST.lp.filter(q => q[3]).map(q => q[0]).join() === botsL.join(),
    `Ліхтар готовий — лобі доповнили боти до 5 (${botsL.join(', ')}), бачать обоє; ніч ще не почалась (Батарейка не готова)`);
  assert(AB.every(T => botsL.every(n => lbOf(T).querySelector('.who').textContent.includes(n))) && /чекаємо, поки всі будуть готові/.test(lbOf(b).textContent), 'боти — у списку гравців попапу в обох; info «Усі на місці — чекаємо, поки всі будуть готові»');
  rdyOf(b).click();
  for (let k = 0; k < 40 && !(F.ST.on && G.ST.on); k++) await tick(AB, .25);
  assert(F.ST.on && G.ST.on && F.ST.v === 2 && G.ST.v === 2 && F.ST.en.length >= 4, `обоє готові — «старт за 3» — ніч почалась в обох на 63-му (рахує сервер), зомбі: ${F.ST.en.length}`);
  assert(!lbOf(a) && !lbOf(b), 'попап лобі закрився в обох');
  assert(F.ST.bo.map(q => q.k).join() === botsL.join() && G.ST.bo.map(q => q.k).join() === botsL.join(), 'у зміні ті самі 3 боти, що й у лобі (бачать обоє)');
  await tick(AB, 1);
  { const md = Math.max(...F.ST.bo.map(q => { const o = G.ST.bo.find(r => r.k === q.k); return o ? Math.hypot(o.x - q.x, o.z - q.z) : 99; }));
    assert(md < 1.2 && a.w.__nightshift.V.bots.size === 3 && b.w.__nightshift.V.bots.size === 3 && F.ST.bo.every(q => F.ST.pl[q.k] && F.ST.pl[q.k].l === 1),
      `боти-кенти з ліхтариками в обох на тих самих місцях (розбіжність ${md.toFixed(2)})`); }
  for (let k = 0; k < 40 && (F.ST.bo.length || G.ST.bo.length); k++) await tick(AB, .25);
  assert(!F.ST.bo.length && !G.ST.bo.length, '(тест) боти пішли зі зміни — далі сценарій на двох');
  let it;
  const FL = G.FLOORS[2];
  assert(AB.every(T => T.w.__nightshift.floorAt(T.pl.x, T.pl.z) === 2) && G.CUR === 2 && F.CUR === 2, 'обох перенесло на 63-й поверх');
  assert(a.MODEBAR && b.MODEBAR && a.MODEBAR.slots.length === 9, 'в обох набір режиму 🔦🧪✈️🧻📘🧯🍾☕🍸');
  // спільні вороги
  await tick(AB, 1.5);
  {
    const ids = F.ST.en.map(e => e.id).join(','), ids2 = G.ST.en.map(e => e.id).join(',');
    const maxD = Math.max(...F.ST.en.map(e => { const q = G.ST.en.find(o => o.id === e.id); return q ? Math.hypot(q.x - e.x, q.z - e.z) : 99; }));
    assert(ids === ids2 && maxD < 1.2, `обоє бачать тих самих зомбі в тих самих місцях (розбіжність ${maxD.toFixed(2)})`);
    const p0 = F.ST.en.map(e => [e.x, e.z]); await tick(AB, 2);
    assert(F.ST.en.some((e, i) => Math.hypot(e.x - p0[i][0], e.z - p0[i][1]) > .3), 'зомбі бродять (сервер рухає)');
  }
  // 🍸 коктейль нічного бачення: Батарейка бере й п'є — сервер рахує, бачать обоє
  {
    const ci = G.ST.cks[0]; assert(ci != null && F.ST.cks.join() === G.ST.cks.join(), `на поверсі ${G.ST.cks.length} 🍸 — бачать обоє`);
    if (!G.ST.pl[b.name].l) b.keydown('KeyL');   // після схованки ліхтарик вимкнений — інакше по дорозі схоплять
    guards = [a, b];
    for (let r = 0; r < 4; r++) {   // по дорозі можуть схопити — тоді вирветься (Пробіл) і спробує ще
      tp(b, G.ITEMS[ci]); tp(a, G.ITEMS[ci], 1.2, 0); await tick(AB, .4); it = b.getInteract(); if (it && /коктейль нічного бачення/.test(it.l)) break;
      console.log('  (ще раз до келиха: ' + (it && it.l) + ')'); for (let k = 0; k < 50 && G.ST.pl[b.name].dr; k++) { b.keydown('Space'); await tick(AB, .1); }
      if (G.ST.pl[b.name].dr === 0 && !G.ST.pl[b.name].l) b.keydown('KeyL');
    }
    assert(it && /коктейль нічного бачення/.test(it.l), 'Батарейка біля келиха: F — «Взяти коктейль нічного бачення»' + (it && /коктейль/.test(it.l) ? '' : ' ' + JSON.stringify({ it: it && it.l, a: G.ST.pl[a.name], b: G.ST.pl[b.name] }))); it.fn(); await tick(AB, .6);
    assert(G.ST.pl[b.name].nc === 1 && F.ST.pl[b.name].nc === 1 && !F.ST.cks.includes(ci), 'у Батарейки 🍸 1 — келих зник в обох');
    b.keydown('Digit9'); await tick(AB, .6);
    assert(G.ST.pl[b.name].nc === 0 && G.ST.pl[b.name].nv > 3 && G.nvK() > .9 && F.nvK() === 0, 'Батарейка випила: у неї нічне бачення, у Ліхтаря — ні');
    for (let k = 0; k < 30 && G.ST.pl[b.name].nv > 0; k++) await tick(AB, .25);
    assert(!(G.ST.pl[b.name].nv > 0) && G.nvK() === 0, 'за 5 с нічне бачення минуло');
  }
  // ✈️ кидалки рахує сервер: Батарейка складає літачки біля лотка з папером і кидає — бачать обоє
  {
    guards = [a, b]; const pq = G.PICK.find(q => q.t === 'paper'), pi = G.PICK.indexOf(pq);
    for (let r = 0; r < 4; r++) { tp(b, pq); tp(a, pq, 1, 0); await tick(AB, .4); it = b.getInteract(); if (it && /скласти літачок/.test(it.l)) break; for (let k = 0; k < 50 && G.ST.pl[b.name].dr; k++) { b.keydown('Space'); await tick(AB, .1); } }
    assert(it && /скласти літачок \(\+3\)/.test(it.l), 'Батарейка біля лотка з папером: «F — скласти літачок (+3)»'); it.fn(); await tick(AB, .6);
    assert(G.ST.pl[b.name].pp === 3 && F.ST.pl[b.name].pp === 3, 'у Батарейки ✈️ 3 — бачать обоє (рахує сервер)');
    b.input.aimOk = true; b.input.ax = pq.x + 5; b.input.az = pq.z; b.keydown('Digit3'); let fl = false;
    for (let k = 0; k < 10 && !fl; k++) { await tick(AB, .1); fl = a.w.__nightshift.V.fly.some(q => q.k === 'pp'); }
    await tick(AB, .4);
    assert(G.ST.pl[b.name].pp === 2 && F.ST.pl[b.name].pp === 2 && fl, 'Батарейка кинула літачок: ✈️ 2, Ліхтар бачить, як він летить');
    b.input.aimOk = false; guards = [];
  }
  // 💢 Батарейку хапають — вона сама вирветься (F / Пробіл часто-часто); сервер оглушує зомбі, бачать обоє
  {
    guards = []; if (G.ST.pl[b.name].l) b.keydown('KeyL'); await tick(AB, .3);
    let zid = 0;
    for (let k = 0; k < 80 && !zid; k++) {
      zid = G.ST.pl[b.name].dr; if (zid) break;
      const z = G.ST.en.filter(e => !e.t && e.st !== 'flee' && e.st !== 'stun' && G.SVC.every(q => Math.hypot(q.p.x - e.x, q.p.z - e.z) > 7)).reduce((p, q) => !p || Math.hypot(q.x - b.pl.x, q.z - b.pl.z) < Math.hypot(p.x - b.pl.x, p.z - b.pl.z) ? q : p, null);
      if (z && Math.hypot(z.x - b.pl.x, z.z - b.pl.z) > 1.2) tp(b, z, .3, .3);
      await tick(AB, .25);
    }
    assert(zid && F.ST.pl[b.name].dr === zid && G.ST.pl[b.name].d, 'Батарейку схопили за ногу (бачать обоє)');
    await tick(AB, .3); assert(/ВИРВИСЬ/.test(b.getInteract().l) && b.w.document.getElementById('ns-kick').style.display !== 'none', 'у Батарейки — велика шкала «Тисни F / Пробіл»');
    let tm = 0; for (let k = 0; k < 60 && G.ST.pl[b.name].dr; k++) { b.keydown(k % 2 ? 'Space' : 'KeyF'); await tick(AB, .1); tm += .1; }
    for (let k = 0; k < 10 && F.ST.pl[b.name].d; k++) await tick(AB, .1);   // стан до Ліхтаря доходить зі знімком сервера
    const z = F.ST.en.find(e => e.id === zid);
    assert(!G.ST.pl[b.name].dr && !G.ST.pl[b.name].d && !F.ST.pl[b.name].d && tm <= 4, `Батарейка натискала F/Пробіл і вирвалась сама за ${tm.toFixed(1)} с (бачать обоє)`);
    assert(z && (z.st === 'stun' || z.st === 'flee'), `той зомбі оглушений (${z && z.st})`);
    guards = [a, b]; if (!G.ST.pl[b.name].l) b.keydown('KeyL'); tp(b, a.pl, .6, 0); await tick(AB, .5);
  }
  guards = [];
  // Батарейка ховається, Ліхтар вимикає ліхтарик і йде до зомбі
  const cab = G.CABS[1]; tp(b, cab.s); await tick(AB, .4);
  it = b.getInteract(); assert(it && /Сховатися/.test(it.l), 'Батарейка біля схованки (кабінка в туалеті)'); it.fn(); await tick(AB, .6);
  assert(F.ST.pl[b.name] && F.ST.pl[b.name].h === 2, 'Ліхтар бачить: Батарейка сховалась');
  for (let k = 0; k < 60 && F.ST.t < 10.5; k++) await tick(AB, .25);   // перші 10 с зомбі «прокидаються»
  a.keydown('KeyL'); await tick(AB, .5); assert(G.ST.pl[a.name].l === 0, 'Ліхтар вимкнув ліхтарик (бачить і Батарейка)');
  const grabA = async () => {
    for (let k = 0; k < 80; k++) {
      const s = G.ST.pl[a.name]; if (s && (s.dr || s.tk)) return true;   // (міг уже й у підвалі опинитись, поки Батарейка ховалась)
      // найближчий зомбі подалі від ліфтів, щоб був час рятувати
      const z = F.ST.en.filter(e => !e.t && e.st !== 'flee' && e.st !== 'stun' && !e.lit && F.FLOORS[2].SVC.every(q => Math.hypot(q.p.x - e.x, q.p.z - e.z) > 7)).reduce((p, q) => !p || Math.hypot(q.x - a.pl.x, q.z - a.pl.z) < Math.hypot(p.x - a.pl.x, p.z - a.pl.z) ? q : p, null);
      if (z && Math.hypot(z.x - a.pl.x, z.z - a.pl.z) > 1.2) tp(a, z, .3, .3);
      await tick(AB, .25);
    }
    console.log('  (не схопили: ' + JSON.stringify({ a: G.ST.pl[a.name], ap: [a.pl.x, a.pl.z], calm: F.ST.t, en: F.ST.en.map(e => [e.st, e.lit, e.t, Math.round(Math.hypot(e.x - a.pl.x, e.z - a.pl.z) * 10) / 10]) }) + ')');
    return false;
  };
  const tpB = async p => {   // Батарейка — до точки, Ліхтар поруч; якщо когось схопили — інший рятує
    for (let r = 0; r < 4; r++) {
      const down = [a, b].find(T => G.ST.pl[T.name] && G.ST.pl[T.name].d); if (!down) break;
      const up = down === a ? b : a, s = G.ST.pl[down.name]; console.log('  (рятуємо ' + down.name + ')');
      if (s.dr) { for (let k = 0; k < 50 && G.ST.pl[down.name].dr; k++) { down.keydown('Space'); await tick(AB, .1); } if (!G.ST.pl[down.name].d) { if (!G.ST.pl[down.name].l) down.keydown('KeyL'); continue; } }   // тягнуть — вирвався сам
      if (s.tk) { const q = G.SVC[s.tk - 1].p; tp(up, q); await tick(AB, .4); const r2 = up.getInteract(); if (r2 && /Викликати/.test(r2.l)) r2.fn(); for (let k = 0; k < 24 && G.ST.pl[down.name].tk; k++) { tp(up, q); await tick(AB, .25); } continue; }
      tp(up, down.pl, .6, 0); await tick(AB, .8); const r2 = up.getInteract(); if (r2 && /Підняти/.test(r2.l)) r2.fn();
      for (let k = 0; k < 16 && G.ST.pl[down.name].d; k++) { tp(up, down.pl, .6, 0); await tick(AB, .25); }
    }
    tp(b, p); tp(a, p, .7, .3);
  };
  const doAt = async (p, re) => {   // підійти й дочекатись потрібної дії (якщо по дорозі когось схопили — врятувати й спробувати ще)
    let it2 = null; for (let r = 0; r < 4; r++) { await tpB(p); await tick(AB, .4); it2 = b.getInteract(); if (it2 && re.test(it2.l)) return it2; console.log('  (ще раз до ' + re + ': ' + (it2 && it2.l) + ')'); }
    return it2;
  };
  assert(await grabA() && F.ST.pl[a.name].d === 1 && F.ST.on, 'у темряві зомбі схопив Ліхтаря за ногу — тягне (бачать обоє), ніч триває');
  {
    const zid = G.ST.pl[a.name].dr, ze = () => G.ST.en.find(e => e.id === zid), to = FL.SVC[ze().to].p, d0 = Math.hypot(a.pl.x - to.x, a.pl.z - to.z);
    // тягне по коридорах (в обхід стін — по прямій відстань може спершу й зрости): Ліхтар рухається слідом за зомбі
    const toN = FL.SVC[ze().to].n, a0 = { x: a.pl.x, z: a.pl.z }; let mv = 0, d1 = d0; for (let k = 0; k < 16 && mv < .8 && ze(); k++) { await tick(AB, .25); mv = Math.hypot(a.pl.x - a0.x, a.pl.z - a0.z); d1 = Math.hypot(a.pl.x - to.x, a.pl.z - to.z); }
    const zz = ze();
    assert(mv >= .8 && zz && Math.hypot(a.pl.x - zz.x, a.pl.z - zz.z) < 1.6 && b.w.__nightshift.dragged().length === 1, `Ліхтаря тягнуть до «${toN}» (протягнули ${mv.toFixed(1)} м, до ліфта ${d0.toFixed(1)} → ${d1.toFixed(1)} м); Батарейка бачить «тягнуть!»`);
    // Батарейка вискакує й світить на того зомбі
    it = b.getInteract(); assert(it && /Вийти/.test(it.l), 'Батарейка виходить зі схованки'); it.fn(); await tick(AB, .3);
    const z = ze(); tp(b, { x: z.x + 2.2, z: z.z }); b.pl.face = Math.atan2(z.x - b.pl.x, z.z - b.pl.z);
    for (let k = 0; k < 24 && G.ST.pl[a.name].dr; k++) {
      if (G.ST.pl[b.name].dr) { console.log('  (Батарейку теж схопили — вириваємось)'); for (let j = 0; j < 40 && G.ST.pl[b.name].dr; j++) { b.keydown('Space'); await tick(AB, .1); } if (!G.ST.pl[b.name].l) b.keydown('KeyL'); }
      const q = ze(); if (q) { if (!G.los(b.pl.x, b.pl.z, q.x, q.z)) tp(b, a.pl); b.pl.face = Math.atan2(q.x - b.pl.x, q.z - b.pl.z); } await tick(AB, .25); }   // стоїть поруч із другом і світить на зомбі
    assert(!F.ST.pl[a.name].dr && F.ST.pl[a.name].d === 1 && !F.ST.pl[a.name].tk, 'Батарейка посвітила ліхтариком — зомбі кинув Ліхтаря (лежить, але не в підвалі)' + (F.ST.pl[a.name].dr ? ' ' + JSON.stringify({ a: G.ST.pl[a.name], b: G.ST.pl[b.name], z: ze(), bp: [b.pl.x, b.pl.z, b.pl.face], ap: [a.pl.x, a.pl.z] }) : ''));
  }
  guards = [b]; tp(b, a.pl, .6, 0); await tick(AB, .3);
  if (G.ST.pl[b.name].dr) { console.log('  (Батарейку схопили біля друга — вириваємось)'); for (let k = 0; k < 50 && G.ST.pl[b.name].dr; k++) { b.keydown('Space'); await tick(AB, .1); } tp(b, a.pl, .6, 0); await tick(AB, .3); }
  it = b.getInteract(); assert(it && /Підняти/.test(it.l), 'біля друга F — «Підняти Ліхтар»' + (it && /Підняти/.test(it.l) ? '' : ' ' + JSON.stringify({ it: it && it.l, a: G.ST.pl[a.name], b: G.ST.pl[b.name], bp: [b.pl.x, b.pl.z], ap: [a.pl.x, a.pl.z] }))); it.fn();
  for (let k = 0; k < 20 && F.ST.pl[a.name].d; k++) { tp(b, a.pl, .6, 0); await tick(AB, .25); }
  assert(!F.ST.pl[a.name].d && !G.ST.pl[a.name].d, 'Батарейка підняла Ліхтаря — бачать обоє');
  assert(F.ST.pl[a.name].l === 1, 'піднятому ліхтарик вмикається сам');
  // вдруге: Батарейка ховається, Ліхтаря дотягують до підвалу — потім вона викликає ліфт
  guards = [b, a]; it = await doAt(G.CABS[1].s, /Сховатися/); guards = [];   // по дорозі схопили / збили — врятують (tpB)
  assert(it && /Сховатися/.test(it.l), 'Батарейка знову в кабінці' + (it && /Сховатися/.test(it.l) ? '' : ' ' + JSON.stringify({ it: it && it.l, b: G.ST.pl[b.name], bp: [b.pl.x, b.pl.z], s: G.CABS[1].s }))); it.fn(); await tick(AB, .4);
  a.keydown('KeyL'); await tick(AB, .3); F.ST.pl[a.name].g = 0;
  assert(await grabA(), 'Ліхтаря знову схопили');
  for (let k = 0; k < 200 && !G.ST.pl[a.name].tk; k++) await tick(AB, .25);   // до ліфта ≥ 5 м — буває й через увесь поверх
  const tk = G.ST.pl[a.name].tk;
  assert(tk > 0 && F.ST.on && a.getInteract() && /Стукати/.test(a.getInteract().l), `Ліхтаря затягли в підвал через «${FL.SVC[tk - 1].n}» — ніч триває, він може стукати по трубах`);
  a.getInteract().fn(); await tick(AB, .3);
  it = b.getInteract(); it.fn(); await tick(AB, .3);   // вийти з кабінки
  guards = [b]; tp(b, FL.SVC[tk - 1].p); await tick(AB, .4);
  it = b.getInteract(); assert(it && /Викликати/.test(it.l), 'Батарейка біля ліфта: F — «Викликати … витягти Ліхтар»'); it.fn();
  for (let r = 0; r < 3 && G.ST.pl[a.name].tk; r++) {   // ГУЧНО — зомбі можуть схопити Батарейку посеред виклику: вирветься й викличе знову
    for (let k = 0; k < 24 && G.ST.pl[a.name].tk && !G.ST.pl[b.name].d; k++) { tp(b, FL.SVC[tk - 1].p); await tick(AB, .25); }
    if (!G.ST.pl[a.name].tk) break;
    console.log('  (Батарейку збили під час виклику ліфта)');
    for (let k = 0; k < 60 && G.ST.pl[b.name].dr; k++) { b.keydown('Space'); await tick(AB, .1); }
    for (let k = 0; k < 40 && G.ST.pl[b.name].d; k++) await tick(AB, .2);
    tp(b, FL.SVC[tk - 1].p); await tick(AB, .4); const r2 = b.getInteract(); if (r2 && /Викликати/.test(r2.l)) r2.fn();
  }
  for (let k = 0; k < 10 && F.ST.pl[a.name].d; k++) await tick(AB, .1);
  assert(!F.ST.pl[a.name].tk && !F.ST.pl[a.name].d && Math.hypot(a.pl.x - FL.SVC[tk - 1].p.x, a.pl.z - FL.SVC[tk - 1].p.z) < 2, 'ліфт приїхав — Ліхтаря витягли з підвалу, стоїть поруч');
  // Батарейка тікає, Ліхтар прикриває ліхтариком: картка → стікер → щитова → рубильники → сходи
  guards = [b, a];
  // обоє вмикають ліхтарики (після кабінки й підвалу вони вимкнені); кого встигли схопити — врятує tpB
  const lit = T => { const s = G.ST.pl[T.name]; return s.l || s.d; };
  for (let k = 0; k < 12 && !(lit(a) && lit(b) && !G.ST.pl[a.name].dr && !G.ST.pl[b.name].dr); k++) {
    for (const T of [a, b]) if (G.ST.pl[T.name].dr) { console.log('  (' + T.name + ' схопили біля ліфта — вириваємось)'); T.keydown('Space'); }   // біля ліфта — вириваємось одразу
    for (const T of [a, b]) if (!lit(T) && !T.w.__nightshift.ST.pl[T.name].l) T.keydown('KeyL');
    await tick(AB, .2);
  }
  assert(G.ST.on && lit(a) && lit(b), 'обоє знову світять ліхтариками' + (G.ST.on ? '' : ' (ніч скінчилась: ' + JSON.stringify(b.w.__nightshift.V.lastEnd) + ')'));
  for (let i = 0; i < G.CARD_SPOTS.length && !G.ST.card; i++) {
    it = await doAt(G.CARD_SPOTS[i], /Обшукати/); if (!it || !/Обшукати/.test(it.l)) { console.log('  (не обшукав ' + i + ': ' + (it && it.l) + ')'); continue; } it.fn();
    for (let k = 0; k < 8 && !G.ST.cs[i]; k++) { tp(b, G.CARD_SPOTS[i]); await tick(AB, .25); }
  }
  assert(G.ST.card === b.name && F.ST.card === b.name, '🔑 Батарейка знайшла картку — бачать обоє' + (G.ST.card ? '' : ' ' + JSON.stringify({ cs: G.ST.cs, me: G.ST.pl[b.name], card: G.ST.card, on: G.ST.on, end: b.w.__nightshift.V.lastEnd, t: F.ST.t, en: G.ST.en.map(e => [e.st, e.lit, Math.round(Math.hypot(e.x - b.pl.x, e.z - b.pl.z))]) })));
  it = await doAt(G.NOTE_SPOTS[G.ST.noteAt], /стікер/); assert(it && /стікер/.test(it.l), 'біля стікера'); it.fn(); await tick(AB, .6);
  assert(G.ST.ord && F.ST.ord && G.ST.ord.join() === F.ST.ord.join(), 'порядок рубильників знають обоє: ' + (G.ST.ord || []).join(','));
  it = await doAt(G.ELEC, /карткою/); assert(it && /карткою/.test(it.l), 'біля щитової з карткою'); it.fn(); await tick(AB, .6);
  assert(F.ST.edoor === 1, 'щитову відчинено');
  for (const i of G.ST.ord) { (await doAt(G.BREAKERS[i], /рубильник/)).fn(); for (let k = 0; k < 6; k++) { tp(b, G.BREAKERS[i]); await tick(AB, .25); } }
  assert(F.ST.power === 1 && G.ST.power === 1, '⚡ світло повернулось в обох');
  it = await doAt(G.EXIT, /ТІКАЄМО/); assert(it && /ТІКАЄМО/.test(it.l), 'біля виходу'); it.fn(); await tick(AB, .6);
  assert(F.ST.exit === 1, 'вихідні двері відчинено');
  const ca = a.P.coins, cb = b.P.coins;
  for (let k = 0; k < 20 && G.ST.on; k++) { tp(b, { x: (G.ESC.x0 + G.ESC.x1) / 2, z: (G.ESC.z0 + G.ESC.z1) / 2 }); await tick(AB, .1); }
  await tick(AB, .5);
  assert(!F.ST.on && !G.ST.on, 'Батарейка вибігла — ніч закінчилась для обох');
  assert(!a.MODEBAR && !b.MODEBAR, 'зміна скінчилась — обом повернули звичайний хотбар');
  assert(F.ST.nx === 0, 'наступний поверх — по колу (42)');
  assert(a.P.addons.nightshift.wins === 1 && b.P.addons.nightshift.wins === 1 && a.P.addons.nightshift.escapes === 1 && a.P.coins > ca && b.P.coins > cb, `ВТЕЧА зарахована обом: +${a.P.coins - ca} / +${b.P.coins - cb} 🪙`);
  console.log('ALL OK'); cleanup(0);
})().catch(e => { console.error(e); cleanup(1); });
