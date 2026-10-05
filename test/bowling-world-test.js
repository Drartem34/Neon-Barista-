// Тест «Офісного боулінгу» по мережі: двоє гравців грають один проти одного.
// Запуск: node test/bowling-world-test.js
const fs = require('fs'), path = require('path'), os = require('os'), { spawn } = require('child_process');
const { JSDOM } = require('jsdom');
const THREE = require('three');
const root = path.join(__dirname, '..');
const PORT = 7797;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'barista-world-'));
for (const f of ['start.py']) fs.copyFileSync(path.join(root, f), path.join(tmpRoot, f));
for (const d of ['dist', 'src', 'server']) fs.cpSync(path.join(root, d), path.join(tmpRoot, d), { recursive: true });
fs.symlinkSync(path.join(root, 'node_modules'), path.join(tmpRoot, 'node_modules'));
fs.cpSync(path.join(root, 'addons/_examples/bowling'), path.join(tmpRoot, 'addons/bowling'), { recursive: true });
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
  src += ';window.__T={get P(){return P},pl,NET,WORLD,MON,BODIES,PROPS,ISLMAP,input,startGame,frame,setAcct,attack,carryTarget,pickUpAny,releaseCarry,mount,dismount,useDrink,setDrink:d=>{selDrink=d},get worldReady(){return worldReady},get S(){return S},getInteract:()=>getInteract(),hurt:d=>hurtPlayer(d),get gt(){return gameTime},get panel(){return panel},get paused(){return paused},openPanel,terrainAt:(x,z)=>terrainAt(x,z),keydown:c=>dispatchEvent(new KeyboardEvent("keydown",{code:c}))};';
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
  assert(st && st.world, 'сервер запустився');
  const a = await client('Друг'), b = await client('Кент');
  await tick([a, b], 1.5);
  const IX = 118, IZ = 64, SX = IX - 13.5;
  a.pl.x = SX - .5; a.pl.z = IZ - 2.6; b.pl.x = SX - .5; b.pl.z = IZ + 2.6; await tick([a, b], .5);
  let it = a.getInteract(); assert(it && /Сісти/.test(it.l), 'Друг біля доріжки 1'); it.fn(); await tick([a, b], 1);
  assert(b.w.__bowl.LN[0].owner === 'net', 'Кент бачить, що Друг сів на доріжку 1');
  it = b.getInteract(); assert(it && /Сісти/.test(it.l), 'Кент біля доріжки 2'); it.fn(); await tick([a, b], 1);
  const A = a.w.__bowl, B = b.w.__bowl;
  assert(A.M.on && B.M.on && A.M.sides[1].kind === 'net' && B.M.sides[1].kind === 'net' && A.M.id === B.M.id, 'партія Друг проти Кента почалась в обох');
  // обоє кидають
  for (const [T, Bw] of [[a, A], [b, B]]) { const L = Bw.LN[Bw.BW.lane]; L.t = 0; Bw.chargeStart(); Bw.BW.charge = Math.PI / 3.2; Bw.chargeRelease(); }
  let moved = false;
  for (let i = 0; i < 30; i++) { await tick([a, b], .2); if (B.LN[0].cx > SX + 5) moved = true; }
  assert(moved, 'Кент бачить, як крісло Друга їде доріжкою');
  await tick([a, b], 3);
  assert(A.M.sides[0].rolls.length === 1 && B.M.sides[1].rolls.length === 1 && B.M.sides[1].rolls[0] === A.M.sides[0].rolls[0], `рахунок Друга (${A.M.sides[0].rolls[0]}) бачить і Кент`);
  assert(B.LN[0].pins.filter(p => p.down || p.gone).length >= 1 || A.M.sides[0].rolls[0] === 0, 'збиті кеглі Друга видно в Кента');
  // Кент здається — Друг перемагає
  b.w.confirm = () => true; it = b.getInteract(); it.fn(); await tick([a, b], 1.5);
  assert(!A.M.on && a.P.addons.bowling && a.P.addons.bowling.games === 1, 'Кент встав — партія закінчилась, Другу зарахували');
  console.log('ALL OK'); cleanup(0);
})().catch(e => { console.error(e); cleanup(1); });
