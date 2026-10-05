// Тест спільного світу: start.py + сервер світу (Node) + двоє гравців у jsdom.
// Обидва мають бачити тих самих мобів, їхнє здоров'я, візки, баки й кинуті предмети.
// Запуск: node test/world-test.js
const fs = require('fs'), path = require('path'), os = require('os'), { spawn } = require('child_process');
const { JSDOM } = require('jsdom');
const THREE = require('three');
const root = path.join(__dirname, '..');
const PORT = 7795;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'barista-world-'));
for (const f of ['start.py']) fs.copyFileSync(path.join(root, f), path.join(tmpRoot, f));
for (const d of ['dist', 'src', 'server']) fs.cpSync(path.join(root, d), path.join(tmpRoot, d), { recursive: true });
fs.symlinkSync(path.join(root, 'node_modules'), path.join(tmpRoot, 'node_modules'));
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
  src += ';window.__T={get P(){return P},pl,NET,WORLD,MON,BODIES,PROPS,ISLMAP,input,startGame,frame,setAcct,attack,carryTarget,pickUpAny,releaseCarry,mount,dismount,useDrink,setDrink:d=>{selDrink=d},get worldReady(){return worldReady},get S(){return S}};';
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
  assert(st && st.world, 'сервер світу запустився (Node)');
  const a = await client('Оля'), b = await client('Тарас');
  await tick([a, b], 1.5);
  assert(a.NET.on && b.NET.on && a.WORLD.on && b.WORLD.on, 'обидва в спільному світі');
  const of = a.ISLMAP.office;
  a.pl.x = of.x - 3; a.pl.z = of.z; b.pl.x = of.x - 3; b.pl.z = of.z + 2;
  await tick([a, b], 1.5);
  const ma = near(a, of.x, of.z, 14), mb = near(b, of.x, of.z, 14);
  assert(ma.length >= 3 && ma.length === mb.length, `обидва бачать тих самих мобів на Опен-спейсі (${ma.length} / ${mb.length})`);
  const same = ma.every(m => { const o = b.WORLD.proxies.get(m.nid); return o && Math.hypot(o.x - m.x, o.z - m.z) < 1.5; });
  assert(same, 'моби в однакових місцях в обох гравців');
  // удар одного — здоров'я падає в обох
  const t = ma.sort((p, q) => Math.hypot(p.x - a.pl.x, p.z - a.pl.z) - Math.hypot(q.x - a.pl.x, q.z - a.pl.z))[0];
  const s0 = b.WORLD.proxies.get(t.nid).stress;
  for (let i = 0; i < 6; i++) { a.pl.x = t.x; a.pl.z = t.z + 1.2; a.input.aimOk = true; a.input.ax = t.x; a.input.az = t.z; a.pl.atkCd = 0; a.pl.pending = null; a.pl.st = 100; a.attack(); await tick([a, b], .3); }
  const tb = b.WORLD.proxies.get(t.nid);
  assert(tb && tb.stress < s0, `удар Олі знизив стрес моба й Тарас це бачить (${s0} → ${tb && tb.stress})`);
  // моби нападають на гравців
  const hp0 = b.pl.hp; b.pl.x = t.x + .8; b.pl.z = t.z; await tick([a, b], 4);
  assert(b.pl.hp < hp0 || a.pl.hp < 100, 'моби з сервера б’ють гравців');
  a.pl.hp = b.pl.hp = 200;
  // бак: підняв — інший бачить над головою, кинув — летить
  const bi = a.BODIES.findIndex(o => o.kind === 'bin');
  const bin = a.BODIES[bi];
  a.pl.x = bin.x + .7; a.pl.z = bin.z; b.pl.x = bin.x + 3; b.pl.z = bin.z + 2; await tick([a, b], .5);
  const tg = a.carryTarget(); assert(tg && tg[0] === 'body', 'біля бака можна його підняти');
  a.pickUpAny(tg); await tick([a, b], .8);
  const binB = b.BODIES[a.BODIES.indexOf(tg[1])];
  assert(binB.y > 1 && Math.hypot(binB.x - a.pl.x, binB.z - a.pl.z) < 1.5, 'Тарас бачить бак над головою Олі');
  a.input.aimOk = true; a.input.ax = a.pl.x + 5; a.input.az = a.pl.z; a.releaseCarry(true);
  const bx0 = binB.x; await tick([a, b], .8);
  assert(Math.abs(binB.x - bx0) > 1.5, `кинутий бак летить і в Тараса (${bx0.toFixed(1)} → ${binB.x.toFixed(1)})`);
  // візок вилітає за край — бачать усі
  const ci = a.BODIES.findIndex(o => o.kind === 'cart');
  const cart = a.BODIES[ci], hub = a.ISLMAP.hub;
  a.pl.x = cart.x; a.pl.z = cart.z; a.pl.y = 0; await tick([a, b], .3);
  a.mount(cart); cart.x = hub.x; cart.z = hub.z + hub.r - 2; a.pl.x = cart.x; a.pl.z = cart.z; cart.vx = 0; cart.vz = 13;
  b.pl.x = hub.x; b.pl.z = hub.z + 4; b.pl.y = 0;
  await tick([a, b], .1);
  assert(a.pl.ride === cart && Math.hypot(cart.m.position.x - a.pl.x, cart.m.position.z - a.pl.z) < .5, 'модель візка їде разом із гравцем на його екрані');
  await tick([a, b], 2.4);
  const cartB = b.BODIES[ci];
  assert(cartB.fall || cartB.y < -1 || cartB.z > hub.z + hub.r, `візок з Олею полетів у прірву — Тарас бачить (fall=${cartB.fall}, y=${cartB.y && cartB.y.toFixed(1)})`);
  a.pl.falling = false; a.pl.x = 0; a.pl.z = 3; a.pl.y = 0; await tick([a, b], 1);
  // кинутий зомбі
  a.pl.x = of.x - 3; a.pl.z = of.z; b.pl.x = of.x - 3; b.pl.z = of.z + 3; await tick([a, b], 1);
  const z = near(a, a.pl.x, a.pl.z, 12).filter(m => !m.calm)[0];
  assert(z, 'є зомбі поруч');
  for (let i = 0; i < 24; i++) { a.pl.x = z.x; a.pl.z = z.z + 1.2; a.input.ax = z.x; a.input.az = z.z; a.pl.atkCd = 0; a.pl.pending = null; a.pl.st = 100; a.pl.hp = 200; a.attack(); await tick([a, b], .3); if (z.stress <= z.max * .26) break; }
  a.pl.x = z.x + .8; a.pl.z = z.z; await tick([a, b], .3);
  assert(z.stress <= z.max * .25 + .5, 'зомбі збитий до 25%'); const zt = ['mon', z];
  a.pickUpAny(zt); await tick([a, b], .8);
  const zb = b.WORLD.proxies.get(zt[1].nid);
  assert(zb && zb.carried && zb.y > 1, 'Тарас бачить зомбі над головою Олі');
  a.input.ax = a.pl.x - 5; a.input.az = a.pl.z; a.releaseCarry(true);
  const zx0 = zb.x; for (let i = 0; i < 6 && !(Math.abs(zb.x - zx0) > 1.5 || zb.state === 'fall'); i++) await tick([a, b], .25);
  assert(Math.abs(zb.x - zx0) > 1.5 || zb.state === 'fall', 'кинутого зомбі бачать усі');
  // кава: заспокоює спільного моба, досвід — тому, хто кинув
  {
    a.pl.x = of.x - 3; a.pl.z = of.z; await tick([a, b], .5);
    const m = near(a, a.pl.x, a.pl.z, 12).filter(m => !m.calm && !m.carried && m.state !== 'fall')[0];
    assert(m, 'є кого пригостити');
    const xp0 = a.P.xp + a.P.lvl * 1e6, bxp0 = b.P.xp + b.P.lvl * 1e6;
    a.P.drinks.flat = 20; a.P.known.flat = 1; a.setDrink('flat');
    for (let i = 0; i < 12 && !(b.WORLD.proxies.get(m.nid) || { calm: 1 }).calm; i++) { a.pl.x = m.x; a.pl.z = m.z + 1.4; a.input.aimOk = true; a.input.ax = m.x; a.input.az = m.z; a.pl.hp = 200; a.useDrink(); await tick([a, b], .5); }
    const mb = b.WORLD.proxies.get(m.nid);
    assert(!mb || mb.calm, 'кава Олі заспокоїла моба — Тарас бачить спокійного');
    await tick([a, b], .5);
    assert(a.P.xp + a.P.lvl * 1e6 > xp0 && b.P.xp + b.P.lvl * 1e6 === bxp0, 'досвід за заспокоєння отримала Оля, а не Тарас');
  }
  // ящик: розбив один — розбитий в обох
  {
    const pi = a.PROPS.findIndex(p => p.type === 'crate' && p.alive && Math.hypot(p.x - of.x, p.z - of.z) < 14);
    const pr = a.PROPS[pi];
    for (let i = 0; i < 10 && b.PROPS[pi].alive; i++) { a.pl.x = pr.x; a.pl.z = pr.z + 1.3; a.input.ax = pr.x; a.input.az = pr.z; a.pl.atkCd = 0; a.pl.pending = null; a.pl.st = 100; a.pl.hp = 200; a.attack(); await tick([a, b], .35); }
    assert(!b.PROPS[pi].alive, 'ящик, розбитий Олею, розбитий і в Тараса');
  }
  console.log('ALL OK'); cleanup(0);
})().catch(e => { console.error(e); cleanup(1); });
