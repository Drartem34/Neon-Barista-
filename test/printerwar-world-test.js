// Тест «Битви за принтер» v2 на сервері світу: двоє гравців, голосування за поверх, боти, кнопка тривоги.
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
  const a = await client('Друкар'), b = await client('Конкурент');
  await tick([a, b], 1.5);
  const W = a.w.__printer, Q = b.w.__printer;
  for (const T of [a, b]) { T.pl.x = W.BOARD.x; T.pl.z = W.BOARD.z - 1.3; T.pl.y = 0; T.pl.hp = 9999; }
  await tick([a, b], 1);
  for (const T of [a, b]) { const it = T.getInteract(); assert(it && /Записатися/.test(it.l), 'F — записатися'); it.fn(); await tick([a, b], .5); }
  assert(W.ST.ph === 'lobby' && Q.ST.ps.length === 2, 'обоє в лобі (рахує сервер)');
  // Друкар голосує за поверх 63 (кружечок на поверсі 42)
  { const pd = W.VAR[0].pads[2]; a.pl.x = pd.x; a.pl.z = pd.z; }
  for (let i = 0; i < 10 && Q.ST.votes['Друкар'] !== 2; i++) await tick([a, b], .3);
  assert(Q.ST.votes['Друкар'] === 2, 'голос Друкаря за поверх 63 бачить і Конкурент');
  for (let i = 0; i < 30 && W.ST.ph !== 'fight'; i++) await tick([a, b], .5);
  assert(W.ST.ph === 'fight' && Q.ST.ps.length === 4 && W.ST.v === 2 && Q.ST.v === 2, 'битва на поверсі 63: 2 гравці + 2 боти');
  await tick([a, b], .3);
  assert(W.varAt(a.pl.x, a.pl.z) === 2 && Q.varAt(b.pl.x, b.pl.z) === 2, 'ліфт: обох перенесло на поверх 63');
  const bot = W.ST.ps.find(p => p.bot), bx = bot.x, bz = bot.z;
  await tick([a, b], 1.5);
  assert(Math.hypot(bot.x - bx, bot.z - bz) > 1, 'боти біжать до принтера — бачать обоє');
  // Друкар у колі біля активного принтера
  let owned = false, pushed = false;
  for (let i = 0; i < 120 && !pushed; i++) { if (!pushed) { a.pl.x = W.PX + 1.6; a.pl.z = W.PZ; } await tick([a, b], .1); if (Q.ST.owner === 'Друкар' || Q.ST.owner === '*') owned = true; if (Math.hypot(a.pl.x - W.PX - 1.6, a.pl.z - W.PZ) > .8) pushed = true; }
  assert(owned, `Конкурент бачить, хто біля принтера (${Q.ST.owner})`);
  const pa = W.ST.ps.find(p => p.k === 'Друкар'), pb = Q.ST.ps.find(p => p.k === 'Друкар');
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
  // обоє йдуть — арена звільняється
  for (const T of [a, b]) { T.pl.x = 0; T.pl.z = 3; }
  for (let i = 0; i < 20 && W.ST.ph !== 'idle'; i++) await tick([a, b], .3);
  assert(W.ST.ph === 'idle' && Q.ST.ph === 'idle', 'всі пішли — битва скинулась');
  console.log('ALL OK'); cleanup(0);
})().catch(e => { console.error(e); cleanup(1); });
