// Тест «Нічної зміни» на сервері світу: двоє в темному офісі — спільні зомбі, одного схопили, другий піднімає, втеча для обох.
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
  src += ';window.__T={get P(){return P},pl,NET,WORLD,input,startGame,frame,setAcct,get worldReady(){return worldReady},getInteract:()=>getInteract(),get keys(){return keys},get panel(){return panel},keydown:c=>dispatchEvent(new KeyboardEvent("keydown",{code:c}))};';
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
  for (const T of AB) { tp(T, F.SPAWN, T === a ? -1 : 1); T.pl.hp = 9999; }
  await tick(AB, 1);
  tp(a, F.CLOCK); await tick(AB, .4);
  let it = a.getInteract(); assert(it && /зміну/.test(it.l), 'Ліхтар біля табельного'); it.fn(); await tick(AB, 1);
  assert(F.ST.on && G.ST.on && F.ST.en.length >= 4, `ніч почалась в обох (рахує сервер), зомбі: ${F.ST.en.length}`);
  // спільні вороги
  await tick(AB, 1.5);
  {
    const ids = F.ST.en.map(e => e.id).join(','), ids2 = G.ST.en.map(e => e.id).join(',');
    const maxD = Math.max(...F.ST.en.map(e => { const q = G.ST.en.find(o => o.id === e.id); return q ? Math.hypot(q.x - e.x, q.z - e.z) : 99; }));
    assert(ids === ids2 && maxD < 1.2, `обоє бачать тих самих зомбі в тих самих місцях (розбіжність ${maxD.toFixed(2)})`);
    const p0 = F.ST.en.map(e => [e.x, e.z]); await tick(AB, 2);
    assert(F.ST.en.some((e, i) => Math.hypot(e.x - p0[i][0], e.z - p0[i][1]) > .3), 'зомбі бродять (сервер рухає)');
  }
  // Батарейка ховається, Ліхтар вимикає ліхтарик і йде до зомбі
  const cab = G.CABS[2]; tp(b, cab.s); await tick(AB, .4);
  it = b.getInteract(); assert(it && /Сховатися/.test(it.l), 'Батарейка біля схованки (кабінка в туалеті)'); it.fn(); await tick(AB, .6);
  assert(F.ST.pl[b.name] && F.ST.pl[b.name].h === 3, 'Ліхтар бачить: Батарейка сховалась');
  for (let k = 0; k < 60 && F.ST.t < 10.5; k++) await tick(AB, .25);   // перші 10 с зомбі «прокидаються»
  a.keydown('KeyL'); await tick(AB, .5); assert(G.ST.pl[a.name].l === 0, 'Ліхтар вимкнув ліхтарик (бачить і Батарейка)');
  let downed = false;
  for (let k = 0; k < 60 && !downed; k++) {
    const z = F.ST.en.filter(e => !e.t).reduce((p, q) => Math.hypot(q.x - a.pl.x, q.z - a.pl.z) < Math.hypot(p.x - a.pl.x, p.z - a.pl.z) ? q : p);
    if (Math.hypot(z.x - a.pl.x, z.z - a.pl.z) > 1.2) tp(a, z, .3, .3);
    await tick(AB, .25); downed = !!(G.ST.pl[a.name] && G.ST.pl[a.name].d);
  }
  assert(downed && F.ST.pl[a.name].d === 1 && F.ST.on, 'у темряві зомбі схопив Ліхтаря — лежить (бачать обоє), ніч триває');
  // Батарейка виходить із шафи й піднімає
  it = b.getInteract(); assert(it && /Вийти/.test(it.l), 'Батарейка виходить із шафи'); it.fn(); await tick(AB, .3);
  guards = [b]; tp(b, a.pl, .6, 0); await tick(AB, .5);
  it = b.getInteract(); assert(it && /Підняти/.test(it.l), 'біля друга F — «Підняти Ліхтар»'); it.fn();
  for (let k = 0; k < 20 && F.ST.pl[a.name].d; k++) { tp(b, a.pl, .6, 0); await tick(AB, .25); }
  assert(!F.ST.pl[a.name].d && !G.ST.pl[a.name].d, 'Батарейка підняла Ліхтаря — бачать обоє');
  assert(F.ST.pl[a.name].l === 1, 'піднятому ліхтарик вмикається сам');
  // Батарейка тікає, Ліхтар прикриває ліхтариком: картка → стікер → щитова → рубильники → вихід
  guards = [b, a];
  const tpB = async p => {   // Батарейка — до точки, Ліхтар поруч; якщо когось схопили — інший піднімає
    for (let r = 0; r < 4; r++) {
      const down = [a, b].find(T => G.ST.pl[T.name] && G.ST.pl[T.name].d); if (!down) break;
      const up = down === a ? b : a; console.log('  (рятуємо ' + down.name + ')');
      tp(up, down.pl, .6, 0); await tick(AB, .4); const r2 = up.getInteract(); if (r2 && /Підняти/.test(r2.l)) r2.fn();
      for (let k = 0; k < 16 && G.ST.pl[down.name].d; k++) { tp(up, down.pl, .6, 0); await tick(AB, .25); }
    }
    tp(b, p); tp(a, p, .7, .3);
  };
  for (let i = 0; i < G.CARD_SPOTS.length && !G.ST.card; i++) {
    await tpB(G.CARD_SPOTS[i]); await tick(AB, .4);
    it = b.getInteract(); if (!it || !/Обшукати/.test(it.l)) { console.log('  (не обшукав ' + i + ': ' + (it && it.l) + ')'); continue; } it.fn();
    for (let k = 0; k < 8 && !G.ST.cs[i]; k++) { tp(b, G.CARD_SPOTS[i]); await tick(AB, .25); }
  }
  assert(G.ST.card === b.name && F.ST.card === b.name, '🔑 Батарейка знайшла картку — бачать обоє' + (G.ST.card ? '' : ' ' + JSON.stringify({ cs: G.ST.cs, me: G.ST.pl[b.name], card: G.ST.card, on: G.ST.on, en: G.ST.en.map(e => [e.st, e.lit, Math.round(Math.hypot(e.x - b.pl.x, e.z - b.pl.z))]) })));
  await tpB(G.NOTE_SPOTS[G.ST.noteAt]); await tick(AB, .4); it = b.getInteract(); assert(it && /стікер/.test(it.l), 'біля стікера'); it.fn(); await tick(AB, .6);
  assert(G.ST.ord && F.ST.ord && G.ST.ord.join() === F.ST.ord.join(), 'порядок рубильників знають обоє: ' + (G.ST.ord || []).join(','));
  await tpB(G.ELEC); await tick(AB, .4); it = b.getInteract(); assert(it && /карткою/.test(it.l), 'біля щитової з карткою'); it.fn(); await tick(AB, .6);
  assert(F.ST.edoor === 1, 'щитову відчинено');
  for (const i of G.ST.ord) { await tpB(G.BREAKERS[i]); await tick(AB, .4); b.getInteract().fn(); for (let k = 0; k < 6; k++) { tp(b, G.BREAKERS[i]); await tick(AB, .25); } }
  assert(F.ST.power === 1 && G.ST.power === 1, '⚡ світло повернулось в обох');
  await tpB(G.EXIT); await tick(AB, .4); it = b.getInteract(); assert(it && /ТІКАЄМО/.test(it.l), 'біля виходу'); it.fn(); await tick(AB, .6);
  assert(F.ST.exit === 1, 'вихідні двері відчинено');
  const ca = a.P.coins, cb = b.P.coins;
  for (let k = 0; k < 40 && G.ST.on; k++) { b.pl.x = G.EXIT.x; b.pl.z += .25; await tick(AB, .1); }
  await tick(AB, .5);
  assert(!F.ST.on && !G.ST.on, 'Батарейка вибігла — ніч закінчилась для обох');
  assert(a.P.addons.nightshift.wins === 1 && b.P.addons.nightshift.wins === 1 && a.P.addons.nightshift.escapes === 1 && a.P.coins > ca && b.P.coins > cb, `ВТЕЧА зарахована обом: +${a.P.coins - ca} / +${b.P.coins - cb} 🪙`);
  console.log('ALL OK'); cleanup(0);
})().catch(e => { console.error(e); cleanup(1); });
