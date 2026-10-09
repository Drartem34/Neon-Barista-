// Тест «Гонок на кріслах» на сервері світу: двоє гравців і боти.
// Запуск: node test/chairrace-world-test.js
const fs = require('fs'), path = require('path'), os = require('os'), { spawn } = require('child_process');
const { JSDOM } = require('jsdom');
const THREE = require('three');
const root = path.join(__dirname, '..');
const PORT = 7799;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'barista-world-'));
for (const f of ['start.py']) fs.copyFileSync(path.join(root, f), path.join(tmpRoot, f));
for (const d of ['dist', 'src', 'server']) fs.cpSync(path.join(root, d), path.join(tmpRoot, d), { recursive: true });
fs.symlinkSync(path.join(root, 'node_modules'), path.join(tmpRoot, 'node_modules'));
fs.cpSync(path.join(root, 'addons/_examples/chairrace'), path.join(tmpRoot, 'addons/chairrace'), { recursive: true });
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
  src += ';window.__T={get P(){return P},pl,NET,WORLD,MON,BODIES,PROPS,ISLMAP,input,startGame,frame,setAcct,attack,carryTarget,pickUpAny,releaseCarry,mount,dismount,useDrink,setDrink:d=>{selDrink=d},get worldReady(){return worldReady},get S(){return S},getInteract:()=>getInteract(),hurt:d=>hurtPlayer(d),get keys(){return keys},get gt(){return gameTime},get panel(){return panel},get paused(){return paused},openPanel,terrainAt:(x,z)=>terrainAt(x,z),keydown:c=>dispatchEvent(new KeyboardEvent("keydown",{code:c}))};';
  w.eval(src);
  const reg = await post('register', { login: name, pass: 'pass-' + name });
  w.__T.setAcct({ token: reg.token, login: reg.login, admin: reg.admin });
  const T = w.__T; T.now = 1000; T.w = w;
  for (let i = 0; i < 50 && !T.worldReady; i++) await sleep(100);
  T.startGame(true); T.P.tut = -1;
  return T;
}
const tick = async (Ts, sec) => { for (let i = 0; i < sec * 20; i++) { for (const T of Ts) { T.now += 50; T.frame(T.now); } await sleep(50); } };
const near = (T, x, z, r) => [...T.WORLD.proxies.values()].filter(m => Math.hypot(m.x - x, m.z - z) < r);
(async () => {
  let st = null;
  for (let i = 0; i < 300; i++) { try { st = await (await fetch(`http://127.0.0.1:${PORT}/status`)).json(); if (st.world) break; } catch (e) { } await sleep(200); }
  assert(st && st.world, 'сервер світу запустився');
  const a = await client('Гонщик'), b = await client('Суперник');
  await tick([a, b], 1.5);
  const R = a.w.__race, Q = b.w.__race;
  for (const T of [a, b]) { T.pl.x = R.START.x + 1; T.pl.z = R.START.z; T.pl.y = 0; T.pl.hp = 9999; }
  await tick([a, b], 1);
  const lob = T => T.w.document.querySelector('#mlobby');
  assert(lob(a) && lob(b) && lob(a).querySelectorAll('[data-lv]').length === 3, 'обоє в лобі — у кожного відкрився попап з 3 трасами');
  for (let i = 0; i < 20 && !(R.ST.lp.length === 2 && Q.ST.lp.length === 2); i++) await tick([a, b], .2);
  assert(/Гонщик/.test(lob(b).querySelector('.who').textContent) && /Суперник/.test(lob(a).querySelector('.who').textContent), 'у списку гравців попапа видно обох');
  // голосування кліками по картках: обоє за «Атріум»
  lob(a).querySelector('[data-lv="1"]').click(); lob(b).querySelector('[data-lv="1"]').click(); await tick([a, b], 1);
  assert(R.ST.v === 1 && Q.ST.v === 1 && R.voteCounts()[1] === 2 && /🗳️ 2/.test(lob(a).querySelector('[data-lv="1"] .vc').textContent), `голоси в попапі — сервер обрав «${R.VARS[R.ST.v].n}» (2 голоси), бачать обоє`);
  // Гонщик готовий — Суперник ще ні: лобі заповнюється (сервер), ніхто не стартує
  const info = T => lob(T).querySelector('.row span').textContent, who = T => lob(T).querySelector('.who').textContent;
  lob(a).querySelector('.rdy').click(); await tick([a, b], 1);
  assert(R.ST.ph === 'lobby' && Q.ST.lob === 'fill' && Q.ST.racers.length === 1 && /Чекаємо гравців 2\/5/.test(info(b)) && /✅ Гонщик/.test(who(b)), `Гонщик готовий — у Суперника в попапі ✅ Гонщик і «${info(b)}»`);
  assert(lob(a).querySelector('.rdy.on'), 'у Гонщика кнопка тепер «Не готовий»');
  // боти приходять по одному (сервер): перший через ~4 с
  for (let i = 0; i < 30 && !Q.ST.racers.some(r => r.bot); i++) await tick([a, b], .2);
  await tick([a, b], .3);
  assert(Q.ST.racers.filter(r => r.bot).length === 1 && /✅ 🤖 Бот Кент/.test(who(b)) && /✅ 🤖 Бот Кент/.test(who(a)) && /Бот Кент приєднався · 3\/5/.test(info(b)) && R.ST.ph === 'lobby', `бот зайшов у лобі — обоє бачать «✅ 🤖 Бот Кент», «${info(b)}»`);
  // Суперник готовий; лобі добирає ботів до 5 — і «Старт за 3…2…1»
  lob(b).querySelector('.rdy').click();
  let goSeen = false;
  for (let i = 0; i < 80 && R.ST.ph === 'lobby'; i++) { await tick([a, b], .2); if (lob(a) && /Усі на місці — старт за/.test(info(a)) && R.ST.racers.length === 5) goSeen = true; }
  assert(goSeen, 'лобі повне 5/5 (2 гравці + 3 боти), усі готові — в обох «Усі на місці — старт за 3…»');
  assert(R.ST.ph === 'count' || R.ST.ph === 'race', 'відлік минув — заїзд стартував');
  await tick([a, b], .3); assert(!lob(a) && !lob(b), 'заїзд почався — попапи в обох закрились');
  for (let i = 0; i < 40 && R.ST.ph !== 'race'; i++) await tick([a, b], .5);
  assert(R.ST.ph === 'race' && R.ST.racers.length === 5 && R.ST.racers.filter(r => r.bot).length === 3 && R.RC.on && Q.RC.on, `двоє гравців + 3 боти з лобі (${R.ST.racers.map(r => r.k).join(', ')}), поїхали`);
  assert(R.floorAt(a.pl.x, a.pl.z) === 1 && R.floorAt(b.pl.x, b.pl.z) === 1, 'обох перенесло на поверх 57 (обраний голосуванням)');
  { const mb = a.w.document.querySelector('#modebar'); assert(mb && !mb.hidden && /💣/.test(mb.textContent) && /🪠/.test(mb.textContent) && /🧯/.test(mb.textContent) && /🍾/.test(mb.textContent) && /✈️/.test(mb.textContent), 'у кріслі хотбар режиму — 💣 🪠 🧯 🍾 ✈️'); }
  const bot = R.ST.racers.find(r => r.bot), bx = bot.x, bz = bot.z;
  await tick([a, b], 1.5);
  { const qb = Q.ST.racers.find(r => r.k === bot.k); assert(Math.hypot(qb.x - bx, qb.z - bz) > 2, 'боти їздять на сервері — бачать обоє'); }
  // ставлю Гонщика на d позаду Суперника й цілюсь у нього (крісло й гравець — разом, інакше «встає»)
  const behind = async d => { Q.RC.v = 0; Q.RC.spin = 0; Q.RC.slow = 0; R.RC.spin = 0; R.RC.v = 0; R.RC.pull = null; R.RC.slow = 0;
    // точка траси на d метрів позаду (уздовж траси — щоб не винесло за скло поверху на повороті)
    { let j = R.nearIdx(Q.RC.x, Q.RC.z), s = 0; while (s < d) { j = (j - 1 + R.N) % R.N; s += R.TR[j].l; } const g = R.TR[j];
      R.RC.x = g.x; R.RC.z = g.z; R.RC.h = Math.atan2(g.dz, g.dx); R.RC.idx = j; R.RC.prev = j; } a.pl.x = R.RC.x; a.pl.z = R.RC.z; await tick([a, b], .6);
    const p = Object.values(a.NET.players).find(q => q.name === 'Суперник'); R.RC.h = Math.atan2(p.z - R.RC.z, p.x - R.RC.x); R.RC.v = 0; Q.RC.spin = 0; Q.RC.slow = 0;
    if (!(R.RC.on && Q.RC.on)) console.log('DBG', R.RC.on, Q.RC.on, R.ST.ph, R.ST.t, JSON.stringify(R.ST.racers.map(r => [r.k, r.lap, r.fin])), JSON.stringify(R.ST.res));
    assert(R.RC.on && Q.RC.on, 'обоє в кріслах'); return p; };
  // 🍾 коктейль Молотова: калюжа палає в обох, Суперник у ній обпалюється — Гонщик бачить кіптяву
  { let f = null, p = null, n0 = 0; const mine = X => p && X.ST.fires.find(q => Math.hypot(q.x - p.x, q.z - p.z) < 1.5);
    // (до 3 спроб, як і з бомбою: на трасі бувають зомбі й калюжі)
    for (let tr = 0; tr < 3 && !(f && Q.RC.nBurn > n0); tr++) {
      await tick([a, b], tr ? 1.2 : .2); await behind(7); R.RC.spin = 0; R.RC.molly = 1; Q.RC.burnCd = 0; Q.RC.v = 0; n0 = Q.RC.nBurn; p = { x: Q.RC.x, z: Q.RC.z };
      assert(R.throwMolly({ x: p.x, z: p.z }) && R.RC.molly === 0, '🍾 Гонщик кинув «молотов» під Суперника');
      for (let i = 0; i < 30 && !(mine(R) && mine(Q) && Q.RC.nBurn > n0); i++) { Q.RC.v = 0; Q.RC.x = p.x; Q.RC.z = p.z; b.pl.x = p.x; b.pl.z = p.z; await tick([a, b], .1); }
      f = mine(Q) && mine(R) ? mine(Q) : null;
      if (!f) console.log('DBG molly', JSON.stringify({ p, q: [Q.RC.x, Q.RC.z], r: [R.RC.x, R.RC.z], rf: R.ST.fires, qf: Q.ST.fires, burn: Q.RC.nBurn, n0 }));
    }
    assert(f && Q.V.fires.has(f.id) && R.V.fires.has(f.id), `🔥 сервер запалив калюжу — полум'я бачать обоє`);
    let seen = false; for (let i = 0; i < 20 && !seen; i++) { Q.RC.v = 0; await tick([a, b], .1); const qr = R.ST.racers.find(r => r.k === 'Суперник'); seen = qr && qr.burn > 0 && R.V.chairs.get('Суперник') && R.V.chairs.get('Суперник').soot.visible; }
    assert(Q.RC.nBurn > n0 && seen, '🔥 Суперник стояв у калюжі — закрутило й обпалило, у Гонщика видно кіптяву на його кріслі');
  // 🧯 реактив: Гонщик з піною в'їжджає у вогонь — гасить для всіх; Суперник бачить вогнегасник і шлейф
    R.RC.foam = 3; R.RC.spin = 0; R.RC.burnCd = 0; R.RC.v = 0; R.RC.x = f.x; R.RC.z = f.z; a.pl.x = f.x; a.pl.z = f.z;
    assert(R.toggleJet() && R.RC.jet, '🧯 Гонщик увімкнув реактивну піну');
    const d0 = R.RC.nDouse; let jetSeen = false;
    for (let i = 0; i < 25 && (mine(Q) || mine(R) || !jetSeen); i++) {
      if (mine(R)) { R.RC.x = f.x; R.RC.z = f.z; a.pl.x = f.x; a.pl.z = f.z; R.RC.v = 0; }
      R.RC.spin = 0; R.RC.foam = 3; if (!R.RC.jet) R.toggleJet(); await tick([a, b], .1);
      const rr = Q.ST.racers.find(r => r.k === 'Гонщик'); jetSeen = jetSeen || !!(rr && rr.jet === 1 && Q.V.chairs.get('Гонщик') && Q.V.chairs.get('Гонщик').ext.visible); }
    assert(jetSeen, '🧯 Суперник бачить у Гонщика вогнегасник і реактивний шлейф (прапорець jet з сервера)');
    if (mine(Q)) console.log('DBG douse', JSON.stringify({ f, rf: R.ST.fires, r: [R.RC.x, R.RC.z, R.RC.jet, R.RC.on], d: R.RC.doused }));
    assert(!mine(Q) && !mine(R) && R.RC.nDouse >= d0 + 1 && !Q.V.fires.has(f.id), '🧯 піною загасив калюжу — зникла в обох');
    if (R.RC.jet) R.toggleJet(); await tick([a, b], .3);
    assert(!Q.ST.racers.find(r => r.k === 'Гонщик').jet, 'реактив вимкнено — у Суперника шлейф зник'); }
  if (process.env.DBG) console.log('  t', R.ST.t.toFixed(1), JSON.stringify(R.ST.racers.map(r => [r.k, r.lap])));
  // ✈️ паперовий літачок: Гонщик запускає — Суперник бачить літачок і пригальмовує (сервер розсилає влучання)
  let hit = false; { let seenFx = false;
    for (let tr = 0; tr < 3 && !hit; tr++) { if (tr) await tick([a, b], 1.2); const p = await behind(4); R.RC.spin = 0; R.RC.planes = 2; const n0 = R.RC.planes;
      assert(R.throwPlane({ x: p.x, z: p.z }) && R.RC.planes === n0 - 1, '✈️ Гонщик запустив літачок у Суперника');
      for (let i = 0; i < 20 && !hit; i++) { Q.RC.v = 0; await tick([a, b], .05); if (Q.V.planes.length) seenFx = true; if (Q.RC.slow > 0 && !(Q.RC.spin > 0)) hit = true; } }
    assert(hit && seenFx, '✈️ літачок долетів: Суперник бачив його в повітрі й пригальмував'); }
  // 📎 постріл степлером по суперникові
  // (до 3 спроб: на трасі бувають зомбі-офісники й калюжі — постріл може перехопити випадкова перешкода)
  hit = false;
  for (let tr = 0; tr < 3 && !hit; tr++) { if (tr) await tick([a, b], 1.2); await behind(3); R.RC.spin = 0; R.RC.item = 'stapler'; R.useItem();
    for (let i = 0; i < 20 && !hit; i++) { await tick([a, b], .1); if (Q.RC.spin > 0) hit = true; } }
  assert(hit, '📎 степлер Гонщика закрутив Суперника');
  // 💣 бомба в Суперника (вибух рахує сервер)
  { R.RC.bombs = Math.max(R.RC.bombs, 3); const b0 = R.RC.bombs; let used = 0; hit = false;
    for (let tr = 0; tr < 3 && !hit && R.RC.bombs > 0; tr++) { await tick([a, b], 1.2); const p = await behind(7); R.RC.spin = 0; const bb = R.RC.bombs; R.throwBomb({ x: p.x, z: p.z }); used += bb - R.RC.bombs;
      for (let i = 0; i < 25 && !hit; i++) { Q.RC.v = 0; await tick([a, b], .1); if (Q.RC.spin > 0 && Q.RC.slow > 0) hit = true; } }
    assert(used >= 1 && R.RC.bombs === b0 - used && hit, '💣 бомба Гонщика вибухнула біля Суперника — закрутило й пригальмувало'); }
  // 🪠 вантуз: чіпляє Суперника, мене тягне вперед
  // (до 3 спроб: між ними може опинитись бот — тоді вантуз чіпляє його)
  { let pulled = false, moved = 0; hit = false;
    for (let tr = 0; tr < 3 && !(pulled && hit && moved > 2); tr++) {
      await tick([a, b], 1.6); await behind(6); R.RC.spin = 0; Q.RC.slow = 0; const sx = R.RC.x, sz = R.RC.z; R.RC.plCd = 0; R.shootPlunger(); pulled = false; moved = 0; hit = false;
      for (let i = 0; i < 25 && !(pulled && hit); i++) { Q.RC.v = 0; Q.RC.spin = 0; await tick([a, b], .05); if (R.RC.pull) pulled = R.RC.pull.k === 'Суперник'; if (Q.RC.slow > 0) hit = true; moved = Math.max(moved, Math.hypot(R.RC.x - sx, R.RC.z - sz)); }
      for (let i = 0; i < 8; i++) { await tick([a, b], .05); moved = Math.max(moved, Math.hypot(R.RC.x - sx, R.RC.z - sz)); } }
    assert(pulled && hit && moved > 2 && R.RC.plCd > 0, `🪠 вантуз зачепив Суперника: Гонщика смикнуло вперед на ${moved.toFixed(1)} м, Суперника пригальмувало`); }
  // обоє проходять 3 кола
  for (const [T, X] of [[a, R], [b, Q]]) { X.RC.lap = 2; const g = X.TR[X.N - 2]; X.RC.x = g.x; X.RC.z = g.z; X.RC.idx = X.N - 2; X.RC.prev = X.N - 2; X.RC.spin = 0; X.RC.h = Math.atan2(g.dz, g.dx); X.RC.v = 8; T.pl.x = g.x; T.pl.z = g.z; }
  for (let i = 0; i < 30 && (!R.RC.fin || !Q.RC.fin); i++) { for (const X of [R, Q]) { const q = X.TR[(X.RC.idx + 6) % X.N]; X.RC.h = Math.atan2(q.z - X.RC.z, q.x - X.RC.x); X.RC.v = 8; X.RC.spin = 0; } await tick([a, b], .1); }
  for (let i = 0; i < 20 && R.ST.ph !== 'end'; i++) await tick([a, b], .3);
  assert(R.ST.ph === 'end' && Q.ST.ph === 'end', 'обоє фінішували — гонка скінчилась');
  assert(R.ST.res.indexOf('Гонщик') >= 0 && a.P.addons.chairrace.races === 1 && b.P.addons.chairrace.races === 1, `результати в обох: ${R.ST.res.join(', ')}`);
  assert(!R.RC.on && a.w.document.querySelector('#modebar').hidden && b.w.document.querySelector('#modebar').hidden, 'після фінішу в обох — звичайний хотбар');
  // наступний заїзд: готовий лише Гонщик — через 20 с сервер стартує без Суперника
  for (let i = 0; i < 40 && R.ST.ph !== 'idle'; i++) await tick([a, b], .3);
  await tick([a, b], .3);
  assert(R.ST.ph === 'idle' && lob(a) && lob(b), 'після заїзду в обох знову відкрилось лобі');
  lob(a).querySelector('.rdy').click(); await tick([a, b], 1);
  assert(R.ST.ph === 'lobby' && R.ST.lob === 'fill', 'готовий лише один — лобі заповнюється ботами');
  for (let i = 0; i < 60 && R.ST.lob !== 'wait'; i++) await tick([a, b], .3);
  await tick([a, b], .6);
  assert(R.ST.lob === 'wait' && R.ST.racers.length === 4 && R.ST.cnt > 20 && /без них старт за/.test(info(b)), `лобі повне (Суперник — 5-й, не готовий): сервер чекає ${Math.ceil(R.ST.cnt)} с — «${info(b)}»`);
  for (let i = 0; i < 80 && R.ST.ph === 'lobby'; i++) await tick([a, b], .5);
  assert(R.ST.ph !== 'lobby' && R.ST.racers.some(r => r.k === 'Гонщик') && !R.ST.racers.some(r => r.k === 'Суперник') && R.ST.racers.length === 5, 'через 25 с — старт без неготового (його місце зайняв ще один бот)');
  console.log('ALL OK'); cleanup(0);
})().catch(e => { console.error(e); cleanup(1); });
