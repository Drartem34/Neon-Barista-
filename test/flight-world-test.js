// Тест «Кавового рейсу» на сервері світу: один пілотує, другий розносить каву.
// Запуск: node test/flight-world-test.js
const fs = require('fs'), path = require('path'), os = require('os'), { spawn } = require('child_process');
const { JSDOM } = require('jsdom');
const THREE = require('three');
const root = path.join(__dirname, '..');
const PORT = 7798;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'barista-world-'));
for (const f of ['start.py']) fs.copyFileSync(path.join(root, f), path.join(tmpRoot, f));
for (const d of ['dist', 'src', 'server']) fs.cpSync(path.join(root, d), path.join(tmpRoot, d), { recursive: true });
fs.symlinkSync(path.join(root, 'node_modules'), path.join(tmpRoot, 'node_modules'));
fs.cpSync(path.join(root, 'addons/_examples/flight'), path.join(tmpRoot, 'addons/flight'), { recursive: true });
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
  const a = await client('Пілот'), b = await client('Стюард');
  await tick([a, b], 1.5);
  const F = a.w.__flight, G = b.w.__flight;
  for (const T of [a, b]) { T.pl.x = F.DOOR.x + 1; T.pl.z = 118; T.pl.y = 0; T.pl.hp = 9999; }
  await tick([a, b], 1);
  a.pl.x = F.DOOR.x; a.pl.z = F.DOOR.z + .5; await tick([a, b], .3);
  let it = a.getInteract(); assert(it && /посадку/.test(it.l), 'Пілот біля дверей'); it.fn(); await tick([a, b], 1);
  assert(F.ST.on && G.ST.on, 'рейс вилетів в обох (рахує сервер)');
  a.pl.x = F.COCKPIT.x - .3; a.pl.z = F.COCKPIT.z; await tick([a, b], .3);
  it = a.getInteract(); it.fn(); await tick([a, b], 1);
  assert(G.ST.pilot === 'Пілот', 'Стюард бачить, хто за штурвалом');
  a.keys.KeyD = true; await tick([a, b], 1.2); const r1 = G.ST.roll; a.keys.KeyD = false; a.keys.KeyA = true; await tick([a, b], 1.4); const r2 = G.ST.roll; a.keys.KeyA = false;
  assert(r1 > r2 + .25, `крен від штурвала Пілота бачить і Стюард (${r1.toFixed(2)} → ${r2.toFixed(2)})`);
  // Стюард розносить
  let served = 0;
  for (let k = 0; k < 40 && served < 2; k++) {
    await tick([a, b], .5); b.pl.hp = 9999; a.pl.hp = 9999;
    const i = G.ST.pass.findIndex(p => p.want); if (i < 0) continue;
    const want = G.ST.pass[i].want, s0 = G.STATIONS.find(s => s.item === want);
    b.pl.x = s0.x + .6; b.pl.z = s0.z; await tick([a, b], .1);
    const f = b.getInteract(); if (!f || !/Зварити|Заварити|Взяти/.test(f.l)) continue; f.fn();
    for (let j = 0; j < 30 && G.V.held !== want; j++) { b.pl.x = s0.x + .6; b.pl.z = s0.z; await tick([a, b], .1); }
    if (G.V.held !== want) continue;
    const s = G.SEATS[i]; b.pl.x = s.x + .2; b.pl.z = s.z - s.side * .6; await tick([a, b], .15);
    const before = F.ST.served; it = b.getInteract(); if (it && /Подати/.test(it.l)) { it.fn(); await tick([a, b], .8); if (F.ST.served > before) served++; }
  }
  assert(served >= 2 && G.ST.served === F.ST.served, `Стюард обслужив пасажирів — бачать обоє (${F.ST.served})`);
  console.log('ALL OK'); cleanup(0);
})().catch(e => { console.error(e); cleanup(1); });
