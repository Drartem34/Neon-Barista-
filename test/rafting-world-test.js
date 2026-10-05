// Тест «Еспресо-Сплаву» у спільному світі: сплав рахує сервер, обидва гравці бачать те саме.
// Запуск: node test/rafting-world-test.js
const fs = require('fs'), path = require('path'), os = require('os'), { spawn } = require('child_process');
const { JSDOM } = require('jsdom');
const THREE = require('three');
const root = path.join(__dirname, '..');
const PORT = 7796;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'barista-world-'));
for (const f of ['start.py']) fs.copyFileSync(path.join(root, f), path.join(tmpRoot, f));
for (const d of ['dist', 'src', 'server']) fs.cpSync(path.join(root, d), path.join(tmpRoot, d), { recursive: true });
fs.symlinkSync(path.join(root, 'node_modules'), path.join(tmpRoot, 'node_modules'));
fs.cpSync(path.join(root, 'addons/_examples/rafting'), path.join(tmpRoot, 'addons/rafting'), { recursive: true });
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
  w.console.warn = () => { }; w.fetch = (u, o) => fetch(new URL(u, `http://127.0.0.1:${PORT}/`), o); w.setInterval = () => 0;
  w.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: (o, k) => k in o ? o[k] : () => { }, set: (o, k, v) => { o[k] = v; return true; } });
  let src = fs.readdirSync(path.join(root, 'src')).filter(f => f.endsWith('.js')).sort().map(f => fs.readFileSync(path.join(root, 'src', f), 'utf8')).join('\n');
  src += ';window.__T={get P(){return P},pl,NET,WORLD,MON,BODIES,PROPS,ISLMAP,input,startGame,frame,setAcct,attack,carryTarget,pickUpAny,releaseCarry,mount,dismount,useDrink,setDrink:d=>{selDrink=d},get worldReady(){return worldReady},get S(){return S},getInteract:()=>getInteract(),terrainAt:(x,z)=>terrainAt(x,z),keydown:c=>dispatchEvent(new KeyboardEvent("keydown",{code:c}))};';
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
  const a = await client('Оля'), b = await client('Тарас');
  await tick([a, b], 1.5);
  assert(a.WORLD.on && b.WORLD.on && a.ISLMAP.river, 'обидва в спільному світі, річка є');
  const RX = -112, RZ = 84;
  for (const [T, dz] of [[a, 0], [b, 2]]) { T.pl.x = RX - 4; T.pl.z = RZ + dz; T.pl.y = 0; T.pl.hp = 9999; }
  await tick([a, b], 1);
  a.pl.x = RX - 2.6; a.pl.z = RZ + 3; await tick([a, b], .2);
  const it = a.getInteract(); assert(it && /Відчалити/.test(it.l), 'Оля біля дзвона'); it.fn();
  await tick([a, b], 1.5);
  const hud = T => T.w.document.getElementById('raft-hud');
  assert(/ЕСПРЕСО-СПЛАВ/.test(hud(a).textContent) && /ЕСПРЕСО-СПЛАВ/.test(hud(b).textContent), 'сплав почався в обох (рахує сервер)');
  for (let i = 0; i < 12; i++) { for (const T of [a, b]) { T.pl.hp = 9999; T.pl.x = RX - 4; } await tick([a, b], .5); }
  const zs = T => [...T.WORLD.proxies.values()].filter(m => m.x > RX - 10 && m.x < RX + 10 && Math.abs(m.z - RZ) < 7 && !m.calm);
  assert(zs(a).length >= 3 && Math.abs(zs(a).length - zs(b).length) <= 1, `обидва бачать хвилю зомбі (${zs(a).length} / ${zs(b).length})`);
  // бомби Тараса топлять пліт для обох
  let sunk = false;
  for (let k = 0; k < 7 && !sunk; k++) {
    b.P.ing.cbomb = 1; b.pl.hp = 9999; b.pl.x = RX - 2; b.pl.z = RZ; b.input.aimOk = true; b.input.ax = RX + 5; b.input.az = RZ;
    b.keydown('KeyG'); await tick([a, b], 1.6);
    sunk = a.terrainAt(RX + 5, RZ) === 'deep' && b.terrainAt(RX + 5, RZ) === 'deep';
  }
  assert(sunk, 'бомби Тараса потопили пліт зомбі — і в Олі, і в Тараса там вода');
  console.log('ALL OK'); cleanup(0);
})().catch(e => { console.error(e); cleanup(1); });
