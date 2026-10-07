// Тест «Сховайся від боса» на сервері світу: один — бос, другий ховається; ролі, маскування й спіймання рахує сервер.
// Запуск: node test/hideboss-world-test.js
const fs = require('fs'), path = require('path'), os = require('os'), { spawn } = require('child_process');
const { JSDOM } = require('jsdom');
const THREE = require('three');
const root = path.join(__dirname, '..');
const PORT = 7812;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'barista-world-'));
for (const f of ['start.py']) fs.copyFileSync(path.join(root, f), path.join(tmpRoot, f));
for (const d of ['dist', 'src', 'server']) fs.cpSync(path.join(root, d), path.join(tmpRoot, d), { recursive: true });
fs.symlinkSync(path.join(root, 'node_modules'), path.join(tmpRoot, 'node_modules'));
fs.cpSync(path.join(root, 'addons/_examples/hideboss'), path.join(tmpRoot, 'addons/hideboss'), { recursive: true });
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
  src += ';window.__T={get MODEBAR(){return MODEBAR},get P(){return P},get hero(){return hero},pl,NET,WORLD,ISLMAP,input,startGame,frame,setAcct,attack:()=>attack(),get worldReady(){return worldReady},getInteract:()=>getInteract(),get panel(){return panel},keydown:c=>dispatchEvent(new KeyboardEvent("keydown",{code:c})),keyup:c=>dispatchEvent(new KeyboardEvent("keyup",{code:c}))};';
  w.eval(src);
  const reg = await post('register', { login: name, pass: 'pass-' + name });
  w.__T.setAcct({ token: reg.token, login: reg.login, admin: reg.admin });
  const T = w.__T; T.now = 1000; T.w = w;
  for (let i = 0; i < 50 && !T.worldReady; i++) await sleep(100);
  T.startGame(true); T.P.tut = -1;
  return T;
}
const tick = async (Ts, sec) => { for (let i = 0; i < sec * 20; i++) { for (const T of Ts) { T.now += 50; T.frame(T.now); } await sleep(50); } };
(async () => {
  let st = null;
  for (let i = 0; i < 300; i++) { try { st = await (await fetch(`http://127.0.0.1:${PORT}/status`)).json(); if (st.world) break; } catch (e) { } await sleep(200); }
  assert(st && st.world, 'сервер світу запустився');
  const a = await client('Шеф'), b = await client('Ледар');
  await tick([a, b], 1.5);
  const F = a.w.__hideboss, G = b.w.__hideboss;
  assert(a.WORLD.on && b.WORLD.on && a.ISLMAP.hideboss, 'обидва в спільному світі, офіс є');
  for (const [T, dx] of [[a, 0], [b, -1.5]]) { T.pl.x = F.SPAWN.x + dx; T.pl.z = F.SPAWN.z; T.pl.y = 0; T.pl.hp = 9999; }
  await tick([a, b], 1);
  // Шеф хоче бути босом і стартує
  F.V.pref = 'boss';
  a.pl.x = F.BOARD.x; a.pl.z = F.BOARD.z - 1.2; await tick([a, b], .3);
  let it = a.getInteract(); assert(it && /Почати раунд/.test(it.l), 'Шеф біля таблички ▶ СТАРТ'); it.fn();
  await tick([a, b], 1.2);
  assert(F.ST.on && G.ST.on && F.ST.ro.length === 2 && G.ST.ro.length === 2, 'раунд почався в обох (рахує сервер), ботів нема — двоє людей');
  assert(F.bossE().k === 'Шеф' && G.bossE().k === 'Шеф' && G.me() && !G.me().boss, 'Шеф — бос, Ледар — офісник (обидва бачать однаково)');
  assert(F.ST.v === 0 && G.ST.v === 0, 'ніхто не голосував — граємо на 42-му, де всі стоять');
  assert(F.inOffice(a.pl.x, a.pl.z) && a.w.document.getElementById('hb-blind').style.display === 'flex', 'бос — у скляному кабінеті на нараді');
  // Ледар ховається
  const h = G.hideSpots().find(s => s.f.t === 'ficus' && !G.DESKS.some(d => Math.hypot(d.x - s.x, d.z - s.z) < 2.6));
  b.pl.x = h.x; b.pl.z = h.z; await tick([a, b], .4);
  it = b.getInteract(); assert(it && /Замаскуватись/.test(it.l), 'Ледар біля фікуса: F — «Замаскуватись»'); it.fn();
  await tick([a, b], 1);
  const eA = F.ST.ro.find(e => e.k === 'Ледар');
  assert(eA && eA.p === 'ficus' && G.me().p === 'ficus', 'сервер записав маскування — бачать обоє');
  const rB = Object.values(a.NET.players).find(r => r.name === 'Ледар'), vB = F.V.ents.get('Ледар');
  assert(rB && !rB.h.root.visible && rB.tag.style.display === 'none', 'у боса герой Ледаря й табличка з іменем сховані');
  assert(vB && vB.prop && Math.hypot(vB.prop.position.x - h.x, vB.prop.position.z - h.z) < .6, 'у боса на місці Ледаря стоїть фікус');
  assert(!b.hero.root.visible && G.V.ents.get('Ледар').prop, 'Ледар сам себе теж бачить фікусом');
  assert(a.MODEBAR && a.MODEBAR.slots[2].id === 'bell' && b.MODEBAR && b.MODEBAR.slots[2].id === 'ram', 'у кожного своя панель режиму: бос 👉🔍🔔, офісник 🎭📄🛞🚬');
  // усі сховались — нарада закінчується раніше (з 10 с)
  for (let k = 0; k < 30 && F.ST.ph === 'meet'; k++) { b.pl.x = h.x; b.pl.z = h.z; await tick([a, b], .5); }
  assert(F.ST.ph === 'hunt' && G.ST.ph === 'hunt', 'нарада скінчилась — бос полює');
  await tick([a, b], .3);
  assert(a.w.document.getElementById('hb-blind').style.display === 'none', 'бос знову бачить');
  // бос промахується по справжньому предмету, потім ловить
  {
    const f = F.FURN.find(q => q.v === 0 && q.t === 'cabinet' && !F.inOffice(q.x, q.z) && Math.hypot(q.x - h.x, q.z - h.z) > 5);
    const hs = F.hideSpots().find(s => s.f === f) || { x: f.x + 1, z: f.z };
    a.pl.x = hs.x; a.pl.z = hs.z; await tick([a, b], .5);
    const t0 = G.ST.t; a.input.aimOk = true; a.input.ax = f.x; a.input.az = f.z; a.pl.atkCd = 0; a.attack(); await tick([a, b], 1);
    assert(G.ST.t > t0 + 5.5 && F.ST.t > t0 + 5.5, `вдарив шафу — мінус 5 с, бачать обоє (${t0.toFixed(1)} → ${G.ST.t.toFixed(1)})`);
  }
  let caught = false;
  for (let k = 0; k < 6 && !caught; k++) {
    b.pl.x = h.x; b.pl.z = h.z; a.pl.x = h.x + .9; a.pl.z = h.z + .1; await tick([a, b], .6);
    a.input.aimOk = true; a.input.ax = h.x; a.input.az = h.z; a.pl.atkCd = 0; a.attack(); await tick([a, b], 1);
    caught = !F.ST.on;
  }
  assert(caught && !G.ST.on, 'бос клацнув по фікусу-Ледарю — «Попався!», раунд скінчився в обох');
  await tick([a, b], .5);
  assert(a.P.addons.hideboss.bossWins === 1 && a.P.addons.hideboss.catches === 1, 'Шефу: перемога боса й спіймання в статистиці');
  assert(b.P.addons.hideboss.caught === 1 && b.P.addons.hideboss.rounds === 1, 'Ледарю: «спіймали» в статистиці');
  assert(b.hero.root.visible && Object.values(a.NET.players).find(r => r.name === 'Ледар').h.root.visible, 'після раунду Ледар знову людина');
  assert((F.ST.sc['Шеф'] || 0) >= 3 && (G.ST.sc['Шеф'] || 0) >= 3, 'табло: Шеф має очки в обох');
  assert(!a.MODEBAR && !b.MODEBAR, 'після раунду — звичайний хотбар в обох');
  // голосування: обидва стали на килимок «57»
  const P1 = F.FL[0].pads[1];
  a.pl.x = P1.x - .3; a.pl.z = P1.z; b.pl.x = P1.x + .3; b.pl.z = P1.z; await tick([a, b], 1.2);
  assert(F.ST.nv === 1 && G.ST.nv === 1 && F.ST.vt[1] === 2, 'обидва на килимку 🗳️ 57 — сервер порахував 2 голоси, наступний поверх — колл-центр');
  // наступний раунд — роль боса переходить, а ліфт везе на 57-й
  b.pl.x = F.BOARD.x; b.pl.z = F.BOARD.z - 1.2; a.pl.x = F.SPAWN.x; a.pl.z = F.SPAWN.z; await tick([a, b], .5);
  it = b.getInteract(); assert(it && /57/.test(it.l), 'табличка ▶ СТАРТ: «Почати раунд на Поверх 57»'); it.fn(); await tick([a, b], 1.2);
  assert(F.ST.on && F.bossE().k === 'Ледар' && G.bossE().k === 'Ледар', 'новий раунд: тепер бос — Ледар (по колу)');
  const F1 = F.FL[1];
  assert(F.ST.v === 1 && G.ST.v === 1 && F.floorAt(a.pl.x, a.pl.z) === 1 && F.floorAt(b.pl.x, b.pl.z) === 1 && G.inOffice(b.pl.x, b.pl.z), 'обох перевезло на 57-й: бос — у кабінеті супервайзерки, Шеф — у холі');
  // Шеф ховається кріслом і таранить боса
  const hc = F.hideSpots(1).find(s => s.f.t === 'chair' && !F.FL[1].desks.some(d => Math.hypot(d.x - s.x, d.z - s.z) < 2.6));
  a.pl.x = hc.x; a.pl.z = hc.z; await tick([a, b], .4);
  it = a.getInteract(); assert(it && /крісло/i.test(it.l) && /таранити/.test(it.l), 'Шеф біля крісла: «Замаскуватись… (🛞 можна таранити!)»'); it.fn();
  for (let k = 0; k < 30 && F.ST.ph === 'meet'; k++) { a.pl.x = hc.x; a.pl.z = hc.z; await tick([a, b], .5); }
  assert(F.ST.ph === 'hunt' && G.ST.ro.find(e => e.k === 'Шеф').p === 'chair', 'Шеф — крісло, бос вийшов з наради');
  a.pl.x = F1.x - 6; a.pl.z = F1.z - 1; b.pl.x = F1.x - 3.5; b.pl.z = F1.z - 1; await tick([a, b], .6);
  a.input.aimOk = true; a.input.ax = b.pl.x; a.input.az = b.pl.z; a.keydown('Digit3');
  for (let k = 0; k < 20 && !(G.ST.stun > 0 && F.ST.stun > 0 && a.P.addons.hideboss.trips); k++) { b.pl.x = F1.x - 3.5; b.pl.z = F1.z - 1; await tick([a, b], .1); }
  assert(F.ST.stun > .5 && G.ST.stun > .5 && a.P.addons.hideboss.trips === 1, `таран кріслом: бос лежить в обох (${G.ST.stun.toFixed(1)} с), Шефу +1 «збив боса»`);
  assert(G.goal().txt.includes('збили з ніг'), 'босу підказка: «Тебе збили з ніг!»');
  { const b0 = { x: b.pl.x, z: b.pl.z }; b.keydown('KeyW'); await tick([a, b], .4); assert(Math.hypot(b.pl.x - b0.x, b.pl.z - b0.z) < .3, 'збитий бос не може йти'); }
  console.log('ALL OK'); cleanup(0);
})().catch(e => { console.error(e); cleanup(1); });
