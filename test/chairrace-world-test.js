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
  // Гонщик готовий — Суперник ще ні: лобі з таймером, ніхто не стартує
  lob(a).querySelector('.rdy').click(); await tick([a, b], 1);
  assert(R.ST.ph === 'lobby' && Q.ST.racers.length === 1 && /Старт за/.test(lob(b).textContent) && /✅/.test(lob(b).querySelector('.who').textContent), 'Гонщик готовий — у Суперника в попапі ✅ і «Старт за … с»');
  assert(lob(a).querySelector('.rdy.on'), 'у Гонщика кнопка тепер «Не готовий»');
  // Суперник готовий — усі готові: старт одразу, попапи закриваються
  lob(b).querySelector('.rdy').click();
  for (let i = 0; i < 10 && R.ST.ph === 'lobby'; i++) await tick([a, b], .2);
  assert(R.ST.ph === 'count' || R.ST.ph === 'race', 'усі готові — заїзд стартував, не чекаючи 20 с');
  await tick([a, b], .3); assert(!lob(a) && !lob(b), 'заїзд почався — попапи в обох закрились');
  for (let i = 0; i < 40 && R.ST.ph !== 'race'; i++) await tick([a, b], .5);
  assert(R.ST.ph === 'race' && R.ST.racers.length === 4 && R.RC.on && Q.RC.on, 'двоє гравців + 2 боти, поїхали');
  assert(R.floorAt(a.pl.x, a.pl.z) === 1 && R.floorAt(b.pl.x, b.pl.z) === 1, 'обох перенесло на поверх 57 (обраний голосуванням)');
  { const mb = a.w.document.querySelector('#modebar'); assert(mb && !mb.hidden && /💣/.test(mb.textContent) && /🪠/.test(mb.textContent), 'у кріслі хотбар — лише 💣 і 🪠'); }
  const bot = R.ST.racers.find(r => r.bot), bx = bot.x;
  await tick([a, b], 1.5);
  assert(Math.abs(Q.ST.racers.find(r => r.k === bot.k).x - bx) > 2, 'боти їздять на сервері — бачать обоє');
  // ставлю Гонщика на d позаду Суперника й цілюсь у нього (крісло й гравець — разом, інакше «встає»)
  // Суперника ставлю на пряму ділянку траси (на повороті постріл міг упертися в стіну — тест «плавав»)
  const sIdx = (() => { let best = 0, bs = 9; for (let i = 0; i < Q.N; i++) { const p = Q.TR[(i - 12 + Q.N) % Q.N], c = Q.TR[i], n = Q.TR[(i + 6) % Q.N];
    const t = Math.abs(Math.atan2(Math.sin(Math.atan2(n.z - c.z, n.x - c.x) - Math.atan2(c.z - p.z, c.x - p.x)), Math.cos(Math.atan2(n.z - c.z, n.x - c.x) - Math.atan2(c.z - p.z, c.x - p.x)))) + Math.abs(Math.hypot(n.x - p.x, n.z - p.z) - Math.hypot(c.x - p.x, c.z - p.z) - Math.hypot(n.x - c.x, n.z - c.z));
    if (t < bs) { bs = t; best = i; } } return best; })();
  const behind = async d => { { const g = Q.TR[sIdx]; Q.RC.x = g.x; Q.RC.z = g.z; Q.RC.idx = sIdx; Q.RC.prev = sIdx; Q.RC.h = Math.atan2(g.dz, g.dx); b.pl.x = g.x; b.pl.z = g.z; }
    Q.RC.v = 0; Q.RC.spin = 0; Q.RC.slow = 0; R.RC.spin = 0; R.RC.v = 0; R.RC.pull = null; R.RC.slow = 0;
    R.RC.x = Q.RC.x - Math.cos(Q.RC.h) * d; R.RC.z = Q.RC.z - Math.sin(Q.RC.h) * d; R.RC.h = Q.RC.h; a.pl.x = R.RC.x; a.pl.z = R.RC.z; await tick([a, b], .6);
    const p = Object.values(a.NET.players).find(q => q.name === 'Суперник'); R.RC.h = Math.atan2(p.z - R.RC.z, p.x - R.RC.x); R.RC.v = 0; Q.RC.spin = 0; Q.RC.slow = 0;
    assert(R.RC.on && Q.RC.on, 'обоє в кріслах'); return p; };
  // 📎 постріл степлером по суперникові
  await behind(3); R.RC.item = 'stapler'; R.useItem(); let hit = false;
  for (let i = 0; i < 20 && !hit; i++) { await tick([a, b], .1); if (Q.RC.spin > 0) hit = true; }
  assert(hit, '📎 степлер Гонщика закрутив Суперника');
  // 💣 бомба в Суперника (вибух рахує сервер)
  { await tick([a, b], 1.2); const p = await behind(7); const b0 = R.RC.bombs; R.throwBomb({ x: p.x, z: p.z }); hit = false;
    for (let i = 0; i < 25 && !hit; i++) { Q.RC.v = 0; await tick([a, b], .1); if (Q.RC.spin > 0 && Q.RC.slow > 0) hit = true; }
    assert(R.RC.bombs === b0 - 1 && hit, '💣 бомба Гонщика вибухнула біля Суперника — закрутило й пригальмувало'); }
  // 🪠 вантуз: чіпляє Суперника, мене тягне вперед
  { await tick([a, b], 1.6); await behind(6); const sx = R.RC.x, sz = R.RC.z; R.RC.plCd = 0; R.shootPlunger(); let pulled = false, moved = 0; hit = false;
    for (let i = 0; i < 25 && !(pulled && hit); i++) { Q.RC.v = 0; Q.RC.spin = 0; await tick([a, b], .05); if (R.RC.pull) pulled = true; if (Q.RC.slow > 0) hit = true; moved = Math.max(moved, Math.hypot(R.RC.x - sx, R.RC.z - sz)); }
    for (let i = 0; i < 8; i++) { await tick([a, b], .05); moved = Math.max(moved, Math.hypot(R.RC.x - sx, R.RC.z - sz)); }
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
  assert(R.ST.ph === 'lobby' && R.ST.cnt > 15, `готовий лише один — сервер чекає (${Math.ceil(R.ST.cnt)} с)`);
  for (let i = 0; i < 60 && R.ST.ph === 'lobby'; i++) await tick([a, b], .5);
  assert(R.ST.ph !== 'lobby' && R.ST.racers.some(r => r.k === 'Гонщик') && !R.ST.racers.some(r => r.k === 'Суперник'), 'через 20 с — автостарт з тими, хто готовий');
  console.log('ALL OK'); cleanup(0);
})().catch(e => { console.error(e); cleanup(1); });
