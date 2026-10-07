// Тест «Нічної зміни» v2 на сервері світу: голосування за поверх (63-й), спільні зомбі, одного тягнуть у підвал — другий світить і зомбі кидає,
// піднімає; затягли в підвал — другий викликає ліфт і витягає; втеча для обох.
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
function cleanup(code) { if (code && process.env.NS_LOG) try { for (const f of fs.readdirSync(path.join(tmpRoot, 'logs'))) console.error(fs.readFileSync(path.join(tmpRoot, 'logs', f), 'utf8').split('\n').filter(l => /VOTE|rror|аддон/i.test(l)).slice(-30).join('\n')); } catch (e) { } try { srv.kill(); } catch (e) { } try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch (e) { } process.exit(code); }
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
  src += ';window.__T={get P(){return P},pl,NET,WORLD,input,startGame,frame,setAcct,get worldReady(){return worldReady},getInteract:()=>getInteract(),get MODEBAR(){return MODEBAR},get keys(){return keys},get panel(){return panel},keydown:c=>dispatchEvent(new KeyboardEvent("keydown",{code:c}))};';
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
  const L0 = F.FLOORS[0];
  for (const T of AB) { tp(T, L0.SPAWN, T === a ? -1 : 1); T.pl.hp = 9999; }
  await tick(AB, 1);
  // голосування: обоє стають на плиту «63»
  tp(a, L0.VOTE[2]); tp(b, L0.VOTE[2], .3, 0); await tick(AB, 2.5);
  assert(F.ST.vt[2] === 2 && G.ST.nx === 2 && F.ST.nx === 2, `обоє проголосували за 63 — сервер обрав «${F.FLOORS[2].n}» (бачать обоє)`);
  tp(b, L0.VOTE[0]); await tick(AB, 2.5);
  assert(F.ST.vt[2] === 1 && F.ST.vt[0] === 1 && F.ST.nx === 0, 'Батарейка передумала (42) — нічия, тоді перший по черзі (42)');
  tp(b, L0.VOTE[2]); await tick(AB, 2.5); assert(F.ST.nx === 2, 'повернулась на 63 — знову 63');
  tp(a, L0.CLOCK); await tick(AB, .4);
  let it = a.getInteract(); assert(it && /зміну/.test(it.l) && /63/.test(it.l), 'Ліхтар біля табельного: «почати нічну зміну (Поверх 63…)»'); it.fn(); await tick(AB, 1);
  assert(F.ST.on && G.ST.on && F.ST.v === 2 && G.ST.v === 2 && F.ST.en.length >= 4, `ніч почалась в обох на 63-му (рахує сервер), зомбі: ${F.ST.en.length}`);
  const FL = G.FLOORS[2];
  assert(AB.every(T => T.w.__nightshift.floorAt(T.pl.x, T.pl.z) === 2) && G.CUR === 2 && F.CUR === 2, 'обох перенесло на 63-й поверх');
  assert(a.MODEBAR && b.MODEBAR && a.MODEBAR.slots.length === 4, 'в обох набір режиму 🔦🧪🔋📻');
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
  const cab = G.CABS[1]; tp(b, cab.s); await tick(AB, .4);
  it = b.getInteract(); assert(it && /Сховатися/.test(it.l), 'Батарейка біля схованки (кабінка в туалеті)'); it.fn(); await tick(AB, .6);
  assert(F.ST.pl[b.name] && F.ST.pl[b.name].h === 2, 'Ліхтар бачить: Батарейка сховалась');
  for (let k = 0; k < 60 && F.ST.t < 10.5; k++) await tick(AB, .25);   // перші 10 с зомбі «прокидаються»
  a.keydown('KeyL'); await tick(AB, .5); assert(G.ST.pl[a.name].l === 0, 'Ліхтар вимкнув ліхтарик (бачить і Батарейка)');
  const grabA = async () => {
    for (let k = 0; k < 80; k++) {
      const s = G.ST.pl[a.name]; if (s && s.dr) return true;
      const z = F.ST.en.filter(e => !e.t && e.st !== 'flee' && F.FLOORS[2].SVC.every(q => Math.hypot(q.p.x - e.x, q.p.z - e.z) > 7))   // подалі від ліфтів, щоб було час рятувати.reduce((p, q) => !p || Math.hypot(q.x - a.pl.x, q.z - a.pl.z) < Math.hypot(p.x - a.pl.x, p.z - a.pl.z) ? q : p, null);
      if (z && Math.hypot(z.x - a.pl.x, z.z - a.pl.z) > 1.2) tp(a, z, .3, .3);
      await tick(AB, .25);
    }
    return false;
  };
  assert(await grabA() && F.ST.pl[a.name].d === 1 && F.ST.on, 'у темряві зомбі схопив Ліхтаря за ногу — тягне (бачать обоє), ніч триває');
  {
    const zid = G.ST.pl[a.name].dr, ze = () => G.ST.en.find(e => e.id === zid), to = FL.SVC[ze().to].p, d0 = Math.hypot(a.pl.x - to.x, a.pl.z - to.z);
    const toN = FL.SVC[ze().to].n; let d1 = d0; for (let k = 0; k < 16 && d1 > d0 - .8 && ze(); k++) { await tick(AB, .25); d1 = Math.hypot(a.pl.x - to.x, a.pl.z - to.z); }
    assert(d1 < d0 - .8 && ze() && b.w.__nightshift.dragged().length === 1, `Ліхтаря тягнуть до «${toN}» (${d0.toFixed(1)} → ${d1.toFixed(1)} м); Батарейка бачить «тягнуть!»`);
    // Батарейка вискакує й світить на того зомбі
    it = b.getInteract(); assert(it && /Вийти/.test(it.l), 'Батарейка виходить зі схованки'); it.fn(); await tick(AB, .3);
    const z = ze(); tp(b, { x: z.x + 2.2, z: z.z }); b.pl.face = Math.atan2(z.x - b.pl.x, z.z - b.pl.z);
    for (let k = 0; k < 24 && G.ST.pl[a.name].dr; k++) { const q = ze(); if (q) { if (!G.los(b.pl.x, b.pl.z, q.x, q.z)) tp(b, a.pl); b.pl.face = Math.atan2(q.x - b.pl.x, q.z - b.pl.z); } await tick(AB, .25); }   // стоїть поруч із другом і світить на зомбі
    assert(!F.ST.pl[a.name].dr && F.ST.pl[a.name].d === 1 && !F.ST.pl[a.name].tk, 'Батарейка посвітила ліхтариком — зомбі кинув Ліхтаря (лежить, але не в підвалі)');
  }
  guards = [b]; tp(b, a.pl, .6, 0); await tick(AB, .3);
  it = b.getInteract(); assert(it && /Підняти/.test(it.l), 'біля друга F — «Підняти Ліхтар»'); it.fn();
  for (let k = 0; k < 20 && F.ST.pl[a.name].d; k++) { tp(b, a.pl, .6, 0); await tick(AB, .25); }
  assert(!F.ST.pl[a.name].d && !G.ST.pl[a.name].d, 'Батарейка підняла Ліхтаря — бачать обоє');
  assert(F.ST.pl[a.name].l === 1, 'піднятому ліхтарик вмикається сам');
  // вдруге: Батарейка ховається, Ліхтаря дотягують до підвалу — потім вона викликає ліфт
  guards = []; tp(b, G.CABS[1].s); await tick(AB, .4); it = b.getInteract(); assert(it && /Сховатися/.test(it.l), 'Батарейка знову в кабінці'); it.fn(); await tick(AB, .4);
  a.keydown('KeyL'); await tick(AB, .3); F.ST.pl[a.name].g = 0;
  assert(await grabA(), 'Ліхтаря знову схопили');
  for (let k = 0; k < 120 && !G.ST.pl[a.name].tk; k++) await tick(AB, .25);
  const tk = G.ST.pl[a.name].tk;
  assert(tk > 0 && F.ST.on && a.getInteract() && /Стукати/.test(a.getInteract().l), `Ліхтаря затягли в підвал через «${FL.SVC[tk - 1].n}» — ніч триває, він може стукати по трубах`);
  a.getInteract().fn(); await tick(AB, .3);
  it = b.getInteract(); it.fn(); await tick(AB, .3);   // вийти з кабінки
  guards = [b]; tp(b, FL.SVC[tk - 1].p); await tick(AB, .4);
  it = b.getInteract(); assert(it && /Викликати/.test(it.l), 'Батарейка біля ліфта: F — «Викликати … витягти Ліхтар»'); it.fn();
  for (let k = 0; k < 24 && G.ST.pl[a.name].tk; k++) { tp(b, FL.SVC[tk - 1].p); await tick(AB, .25); }
  assert(!F.ST.pl[a.name].tk && !F.ST.pl[a.name].d && Math.hypot(a.pl.x - FL.SVC[tk - 1].p.x, a.pl.z - FL.SVC[tk - 1].p.z) < 2, 'ліфт приїхав — Ліхтаря витягли з підвалу, стоїть поруч');
  // Батарейка тікає, Ліхтар прикриває ліхтариком: картка → стікер → щитова → рубильники → сходи
  guards = [b, a];
  const tpB = async p => {   // Батарейка — до точки, Ліхтар поруч; якщо когось схопили — інший рятує
    for (let r = 0; r < 4; r++) {
      const down = [a, b].find(T => G.ST.pl[T.name] && G.ST.pl[T.name].d); if (!down) break;
      const up = down === a ? b : a, s = G.ST.pl[down.name]; console.log('  (рятуємо ' + down.name + ')');
      if (s.tk) { const q = G.SVC[s.tk - 1].p; tp(up, q); await tick(AB, .4); const r2 = up.getInteract(); if (r2 && /Викликати/.test(r2.l)) r2.fn(); for (let k = 0; k < 24 && G.ST.pl[down.name].tk; k++) { tp(up, q); await tick(AB, .25); } continue; }
      tp(up, down.pl, .6, 0); await tick(AB, .8); const r2 = up.getInteract(); if (r2 && /Підняти/.test(r2.l)) r2.fn();
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
  for (let k = 0; k < 20 && G.ST.on; k++) { tp(b, { x: (G.ESC.x0 + G.ESC.x1) / 2, z: (G.ESC.z0 + G.ESC.z1) / 2 }); await tick(AB, .1); }
  await tick(AB, .5);
  assert(!F.ST.on && !G.ST.on, 'Батарейка вибігла — ніч закінчилась для обох');
  assert(!a.MODEBAR && !b.MODEBAR, 'зміна скінчилась — обом повернули звичайний хотбар');
  assert(F.ST.nx === 0, 'наступний поверх — по колу (42)');
  assert(a.P.addons.nightshift.wins === 1 && b.P.addons.nightshift.wins === 1 && a.P.addons.nightshift.escapes === 1 && a.P.coins > ca && b.P.coins > cb, `ВТЕЧА зарахована обом: +${a.P.coins - ca} / +${b.P.coins - cb} 🪙`);
  console.log('ALL OK'); cleanup(0);
})().catch(e => { console.error(e); cleanup(1); });
