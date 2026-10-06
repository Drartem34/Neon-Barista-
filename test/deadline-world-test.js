// Тест «Дедлайну о 18:00» на сервері світу: двоє гравців здають один звіт.
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
  src += ';window.__T={get P(){return P},pl,NET,WORLD,ISLMAP,startGame,frame,setAcct,get worldReady(){return worldReady},getInteract:()=>getInteract(),get panel(){return panel},get hero(){return hero}};';
  w.eval(src);
  const reg = await post('register', { login: name, pass: 'pass-' + name });
  w.__T.setAcct({ token: reg.token, login: reg.login, admin: reg.admin });
  const T = w.__T; T.now = 1000; T.w = w;
  for (let i = 0; i < 50 && !T.worldReady; i++) await sleep(100);
  T.startGame(true); T.P.tut = -1;
  return T;
}
const tick = async (Ts, sec) => { for (let i = 0; i < sec * 20; i++) { for (const T of Ts) { T.now += 50; T.pl.hp = 9999; T.frame(T.now); } await sleep(50); } };
const at = (T, p) => { T.pl.x = p.x; T.pl.z = p.z; T.pl.y = 0; };
/* один крок за підказкою: іди до жовтої мітки, F, тримайся поруч */
async function follow(T, D, Ts) {
  const g = D.goal(); if (!g.tg) { await tick(Ts, .2); return g.id || ''; }
  at(T, g.tg); await tick(Ts, .15); at(T, g.tg);
  const it = T.getInteract(); if (!it) { await tick(Ts, .1); return g.id; }
  it.fn();
  for (let j = 0; j < 60 && D.V.act; j++) { at(T, g.id === 'boss' ? { x: D.ST.boss.x + .3, z: D.ST.boss.z + .3 } : g.tg); await tick(Ts, .1); }
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
  assert(a.ISLMAP.deadline && b.ISLMAP.deadline, 'острів-офіс є в обох');
  at(a, D.START.p); at(b, { x: D.START.p.x - 2, z: D.START.p.z }); await tick(Ts, 1);
  let it = a.getInteract(); assert(it && /аврал/.test(it.l), 'Бухгалтер на ресепшні: «Почати аврал»'); it.fn(); await tick(Ts, 1);
  assert(D.ST.on && E.ST.on && D.ST.steps.join() === E.ST.steps.join() && D.ST.steps.length === 6, `раунд почався в обох (рахує сервер): ${E.ST.steps.join(' → ')}`);
  assert(D.ST.desk.join() === E.ST.desk.join() && E.ST.desk.filter(Boolean).length === 3, 'обидва бачать тих самих колег з даними');
  // Стажер бере дані — Бухгалтер бачить папери в його руках
  {
    const g = E.goal(); assert(g.id === 'desk', 'підказка Стажеру: до колеги з 📄');
    at(b, g.tg); await tick(Ts, .3); at(b, g.tg);
    it = b.getInteract(); assert(it && /Взяти дані/.test(it.l), 'біля столу F — «Взяти дані»'); it.fn(); await tick(Ts, 1);
    assert(E.myHeld().it === 'sheets' && D.ST.held['Стажер'] && D.ST.held['Стажер'].it === 'sheets', 'у Стажера в руках 📄 — бачать обоє');
    const rp = Object.values(a.NET.players).find(p => p.name === 'Стажер'), hm = D.V.hm.get('Стажер');
    assert(rp && hm && hm.g.parent === rp.h.root, 'Бухгалтер бачить стос паперів у руках Стажера');
    assert(D.ST.desk.filter(Boolean).length === 2, 'стіл колеги спорожнів і в Бухгалтера');
  }
  // далі — разом, слухаючись підказок, поки звіт не здано
  const c0a = a.P.coins, c0b = b.P.coins; let maxSi = 0, sameSeen = 0;
  for (let k = 0; k < 160 && (D.ST.on || E.ST.on); k++) {
    if (E.ST.on) await follow(b, E, Ts); if (D.ST.on) await follow(a, D, Ts);   // після перемоги підказка веде на новий ▶ СТАРТ — не тиснемо
    if (D.ST.on && D.ST.si === E.ST.si) sameSeen++;
    maxSi = Math.max(maxSi, E.ST.si);
    if (k % 20 === 0) console.log(`  … крок ${E.ST.si}/${E.ST.steps.length} (${E.ST.steps[E.ST.si] || '—'}) · ${E.clockStr(E.ST.t)}`);
  }
  await tick(Ts, 1);
  assert(sameSeen > 5, 'прогрес чекліста однаковий в обох');
  assert(!D.ST.on && !E.ST.on && maxSi >= 5, 'звіт здано — раунд скінчився в обох');
  assert(a.P.addons.deadline.wins === 1 && b.P.addons.deadline.wins === 1 && a.P.coins > c0a + 40 && b.P.coins > c0b + 40, `перемога в обох: +${a.P.coins - c0a} / +${b.P.coins - c0b} 🪙`);
  console.log('ALL OK'); cleanup(0);
})().catch(e => { console.error(e); cleanup(1); });
