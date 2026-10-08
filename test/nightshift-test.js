// Тест режиму «Нічна зміна» v2 у грі без сервера: три поверхи хмарочоса, лобі-попап (голос + «Я готовий»), набір режиму, «викрадення»,
// брикання (F/Пробіл), шоти, лікувальна кава, коктейль нічного бачення, ліхтарик не світить крізь стіни.
// Запуск: node test/nightshift-test.js
const fs = require('fs'), path = require('path');
const { JSDOM } = require('jsdom');
const THREE = require('three');
const root = path.join(__dirname, '..');
const dom = new JSDOM(fs.readFileSync(path.join(root, 'src/00_shell.html'), 'utf8') + '</body></html>', { pretendToBeVisual: true, runScripts: 'outside-only', url: 'https://example.org/' });
const w = dom.window;
class FakeRenderer { constructor() { this.shadowMap = {}; } setPixelRatio() { } setSize() { } render() { } }
w.THREE = Object.assign({}, THREE, { WebGLRenderer: FakeRenderer });
w.matchMedia = () => ({ matches: false }); w.requestAnimationFrame = () => 0; w.console.warn = () => { }; w.__NO_NET = true; w.__ADDON_TEST = true;
const IV = []; w.setInterval = (f, ms) => { if (ms <= 100) IV.push(f); return 0; };
w.setTimeout = f => { f(); return 0; };
w.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: (o, k) => k in o ? o[k] : () => { }, set: (o, k, v) => { o[k] = v; return true; } });
w.__ADDON_CODE = [{ id: 'nightshift', src: 'nightshift/addon.js', code: fs.readFileSync(path.join(root, 'addons/_examples/nightshift/addon.js'), 'utf8') }];
let src = fs.readdirSync(path.join(root, 'src')).filter(f => f.endsWith('.js')).sort().map(f => fs.readFileSync(path.join(root, 'src', f), 'utf8')).join('\n');
src += ';window.__T={get paused(){return paused},get running(){return running},get P(){return P},pl,MON,ADDONS,STATICS,terrainAt,get MODEBAR(){return MODEBAR},startGame,frame,openPanel,closePanel,get panel(){return panel},getInteract:()=>getInteract(),input,keys,keydown:c=>dispatchEvent(new KeyboardEvent("keydown",{code:c}))};';
w.eval(src);
const T = w.__T; let now = 1000;
const N = w.__nightshift;
let quiet = true;
// без лякалок, ліфта, прибиральника й датчиків руху — тест передбачуваний
const calm = () => { if (quiet) { N.AU.scareT = 999; N.AU.spawnT = 999; N.AU.cleanAt = 1e9; if (N.AU.ms) N.AU.ms.fill(-50); } };
const step = s => { for (let i = 0; i < s * 60; i++) { now += 16.7; calm(); T.frame(now); if (i % 3 === 0) IV.forEach(f => f()); } };
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); process.exit(1); } console.log('ok -', m); };
const body = () => w.document.querySelector('#pbody');
const go = (p, dx = 0, dz = 0) => { T.pl.x = p.x + dx; T.pl.z = p.z + dz; N.V.lastP = null; step(.05); };
const me = () => N.ST.pl.me;
const hudTxt = () => w.document.getElementById('ns-hud').textContent;
const lb = () => w.document.getElementById('mlobby');
const card = i => lb().querySelector(`[data-lv="${i}"]`);
const startNight = (fi) => {
  if (N.floorAt(T.pl.x, T.pl.z) < 0) go(N.FL.SPAWN);
  N.V.lbHide = false; N.V.lbWait = 0; step(.1);
  assert(lb() && lb().querySelectorAll('[data-lv]').length === 3, 'у лобі відкрито попап з трьома картками поверхів');
  if (fi != null) { card(fi).click(); step(.05); }
  lb().querySelector('.rdy').click(); step(.1);
  assert(N.ST.on && (fi == null || N.ST.v === fi), '«✅ Я готовий» — ніч почалась' + (fi != null ? ` на «${N.FLOORS[fi].n}»` : ''));
  assert(!lb(), 'попап лобі закрився, коли почалась зміна'); N.AU.calm = 0;
};
const walk = (x, z, dx, dz, n) => { T.pl.x = x; T.pl.z = z; N.V.lastP = null; step(.05); for (let k = 0; k < n; k++) { T.pl.x += dx; T.pl.z += dz; step(.02); } return { x: T.pl.x, z: T.pl.z }; };

assert(T.ADDONS.list.every(a => a.ok), 'аддон завантажився: ' + T.ADDONS.list.map(a => a.name + (a.ok ? '' : ' ✗ ' + a.err)).join(', '));
assert(w.document.querySelector('#mm-nightshift .mm-subtitle').textContent === 'Не вимикай ліхтарик', 'у меню картка «НІЧНА ЗМІНА · Не вимикай ліхтарик»');
assert(N.FLOORS.length === 3 && new Set(N.FLOORS.map(f => f.n)).size === 3, 'три поверхи: ' + N.FLOORS.map(f => f.n).join(' · '));
T.startGame(true); T.P.tut = -1; T.pl.hp = 9999; step(.3);
T.keydown('Escape'); step(.05); body().querySelector('[data-mode="nightshift"]').click(); step(.5);
assert(Math.hypot(T.pl.x - N.FLOORS[0].SPAWN.x, T.pl.z - N.FLOORS[0].SPAWN.z) < .8 && N.CUR === 0, 'Esc → «Нічна зміна» переносить у хол «Поверх 42» (наступна зміна за замовчуванням)');
assert(N.goal().id === 'lobby' && w.document.getElementById('ns-intro') && lb(), 'до старту: інструкція й попап лобі відкрився сам');
assert(lb().querySelectorAll('[data-lv]').length === 3 && /addons\/nightshift\/map2\.jpg/.test(lb().innerHTML) && /Поверх 63/.test(lb().textContent) && /Я готовий/.test(lb().textContent), 'у попапі — 3 картки з картинками (map1…3.jpg), назви поверхів і «Я готовий»');
w.document.querySelector('#ns-intro button').click(); assert(!w.document.getElementById('ns-intro') && T.P.addons.nightshift.intro2 === 1, 'інструкцію закрив — більше не показується');
step(.1); assert(/Я готовий/.test(w.document.getElementById('ns-goal').textContent) && /Поверх 42/.test(hudTxt()), 'у HUD назва поверху й рядок «👉 що робити зараз»');
assert(!T.MODEBAR, 'до зміни — звичайний хотбар');

/* ---------- 0. Кожен поверх збудований: стіни-статики, вміщається в острів, усе досяжне ---------- */
N.FLOORS.forEach((f, k) => {
  go(f.SPAWN); assert(N.CUR === k, `${f.n}: стоїш у холі — таблиці поверху активні`);
  const far = Math.max(...f.WALLS.map(r => Math.max(...[[r.x0, r.z0], [r.x1, r.z0], [r.x0, r.z1], [r.x1, r.z1]].map(([x, z]) => Math.hypot(x - f.cx, z - f.cz)))));
  assert(far < f.r - .5 && [[1, 1], [1, -1], [-1, 1], [-1, -1]].every(([a, b]) => T.terrainAt(f.cx + a * f.hx, f.cz + b * f.hz) === 'land'), `${f.n}: поверх у межах острова (кут ${far.toFixed(1)} < r ${f.r})`);
  const st = T.STATICS.filter(o => Math.abs(o.x - f.cx) <= f.hx + .7 && Math.abs(o.z - f.cz) <= f.hz + .7).length;
  assert(st > 150, `${f.n}: стіни й меблі — тверді (статиків: ${st})`);
  assert(f.ROOMS.length >= 14 && f.DOORS.filter(d => d.n).length >= 10 && f.WALLS.some(q => q.glass), `${f.n}: кімнат ${f.ROOMS.length}, табличок ${f.DOORS.filter(d => d.n).length}, є скляні стіни`);
  assert(f.SVC.length >= 2 && f.COFFEE && f.SENS.length >= 2, `${f.n}: куди тягнуть — ${f.SVC.map(q => q.n).join(', ')}; кавомашина; датчики руху`);
  assert(!f.VOTE && !N.V.places[k].some(q => /^vote|^clock/.test(q.id)) && !/плит/.test(N.goal().txt), `${f.n}: плит голосування більше нема (лише попап)`);
  assert(N.roomAt(f.COFFEE.x, f.COFFEE.z) && /Кухня/.test(N.roomAt(f.COFFEE.x, f.COFFEE.z).n), `${f.n}: кавомашина — на кухні`);
  const reach = () => { const g = N.grid(), NC = N.NC, seen = new Uint8Array(g.length), s0 = N.cellOf(f.SPAWN.x, f.SPAWN.z), q = [s0]; seen[s0] = 1; for (let h = 0; h < q.length; h++) { const c = q[h], i = c % NC, j = Math.floor(c / NC); for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= NC || jj * NC >= g.length) continue; const n = jj * NC + ii; if (!g[n] && !seen[n]) { seen[n] = 1; q.push(n); } } } return p => seen[N.cellOf(p.x, p.z)] === 1; };
  let ok = reach();
  const pts = [['табельний', f.CLOCK], ['вихід', f.EXIT], ['щитова', f.ELEC], ['кавомашина', f.COFFEE], ...f.CARD_SPOTS.map(c => ['картка: ' + c.n, c]), ...f.NOTE_SPOTS.map(c => ['стікер: ' + c.n, c]), ...f.ITEMS.map((c, i) => ['предмет ' + i, c]), ...f.CABS.map((c, i) => ['схованка ' + i, c.s]), ...f.WAYS.map((c, i) => ['точка ' + i, c]), ...f.EN_SPAWN.map((c, i) => ['поява ' + i, c]), ...f.SVC.map(c => [c.n, c.p])];
  let bad = pts.filter(([, p]) => !ok(p)).map(([n]) => n); assert(!bad.length, `${f.n}: усі важливі місця досяжні з холу` + (bad.length ? ': ' + bad.join(', ') : ''));
  assert(!ok(f.BREAKERS[0]), `${f.n}: до рубильників без картки не дійти (щитова зачинена)`);
  N.ST.edoor = 1; N.ST.exit = 1; ok = reach(); assert(f.BREAKERS.every(b => ok(b)) && ok({ x: (f.ESC.x0 + f.ESC.x1) / 2, z: (f.ESC.z0 + f.ESC.z1) / 2 }), `${f.n}: щитову й вихід відчинили — рубильники й ${f.exitN} досяжні`); N.ST.edoor = 0; N.ST.exit = 0; N.grid();
  const near = (p, r) => f.FURN.concat(f.WALLS).some(q => p.x > q.x0 - r && p.x < q.x1 + r && p.z > q.z0 - r && p.z < q.z1 + r);
  const tight = pts.filter(([, p]) => near(p, .38)).map(([n]) => n); assert(!tight.length, `${f.n}: точки взаємодії не впираються в меблі` + (tight.length ? ': ' + tight.join(', ') : ''));
  const acts = [['кавомашина', f.COFFEE], ['вихід', f.EXIT], ['щитова', f.ELEC], ...f.CARD_SPOTS.map(c => [c.n, c]), ...f.NOTE_SPOTS.map(c => [c.n, c]), ...f.CABS.map((c, i) => ['схованка ' + i, c.s]), ...f.BREAKERS.map(c => [c.n, c]), ...f.SVC.map(c => [c.n, c.p])];
  const clash = acts.filter(([, p]) => f.ITEMS.some(b => Math.hypot(b.x - p.x, b.z - p.z) < 1.5)).map(([n]) => n); assert(!clash.length, `${f.n}: предмети не заступають інші дії (F)` + (clash.length ? ': ' + clash.join(', ') : ''));
  const g = N.grid(); bad = f.WAYS.filter(p => g[N.cellOf(p.x, p.z)]); assert(!bad.length, `${f.n}: точки блукання не в стінах`);
  // скляний фасад: з холу на південь / схід не вийдеш за межі хмарочоса
  let p = walk(f.SPAWN.x, f.SPAWN.z, 0, .25, 40); assert(p.z < f.cz + f.hz, `${f.n}: південна стіна не пускає з будівлі (${(p.z - f.cz).toFixed(2)} < ${f.hz})`);
  p = walk(f.cx + f.hx - 1.2, f.cz + (k === 2 ? 5.5 : k === 1 ? -4.5 : 0), .25, 0, 30); assert(p.x < f.cx + f.hx, `${f.n}: східна стіна теж (${(p.x - f.cx).toFixed(2)} < ${f.hx})`);
});
{
  const f = N.FLOORS[0], X = f.cx, Z = f.cz;
  go(f.SPAWN); for (let k = 0; k < 40; k++) { T.pl.x -= .2; step(.02); } assert(T.pl.x > f.SPAWN.x - 5.1, `${f.n}: стіна холу не пускає на захід (${(T.pl.x - X).toFixed(2)})`);
  let p = walk(X - 11, Z, 0, -.2, 30); assert(p.z > Z - 2, `стіна коридору не пускає в опенспейс (${(p.z - Z).toFixed(2)})`);
  p = walk(X - 16, Z, 0, -.2, 30); assert(p.z < Z - 4, `а через двері опенспейсу проходиш (${(p.z - Z).toFixed(2)})`);
  p = walk(X + 1.5, Z, 0, -.2, 30); assert(p.z < Z - 4, `через скляні двері в переговорну — теж (${(p.z - Z).toFixed(2)})`);
  p = walk(X + 4, Z, 0, -.2, 30); assert(p.z > Z - 2, `а крізь скло — ні (${(p.z - Z).toFixed(2)})`);
  assert(f.FURN_L.filter(q => q[0] === 'desk').length >= 24, 'опенспейс: ≥24 столи з ПК');
  assert(N.FLOORS[1].FURN_L.filter(q => q[0] === 'cdesk').length >= 20 && N.FLOORS[1].FURN_L.some(q => q[0] === 'pod'), '57: колл-центр і капсули для сну');
  assert(N.FLOORS[2].FURN_L.filter(q => q[0] === 'stack').length >= 8, '63: архів-лабіринт стелажів');
}

/* ---------- 0б. Назва кімнати, в якій стоїш, ховається; інші — видно ---------- */
{
  const f = N.FLOORS[0], rs = N.V.roomsL[0], A0 = rs[0], B0 = rs.find(q => q !== A0 && q.r.n !== A0.r.n);
  const inR = q => ({ x: f.cx + (q.r.x0 + q.r.x1) / 2, z: f.cz + (q.r.z0 + q.r.z1) / 2 });
  go(inR(A0)); step(.1);
  assert(A0.e.style.opacity === '0' && B0.e.style.opacity === '1', `зайшов у «${A0.r.n}» — її назва зникла, «${B0.r.n}» видно`);
  assert(/opacity \.2s/.test(w.document.head.innerHTML), 'зникає плавно (opacity .2 с)');
  go(inR(B0)); step(.1);
  assert(A0.e.style.opacity === '1' && B0.e.style.opacity === '0', `перейшов у «${B0.r.n}» — назва «${A0.r.n}» повернулась, а «${B0.r.n}» сховалась`);
  go(f.SPAWN); step(.1);
}

/* ---------- 1. Лобі-попап: голос за поверх, «Сховати» / F, старт на НЕ стандартному поверсі ---------- */
{
  const f = N.FLOORS[0]; go(f.SPAWN); step(.1); assert(N.ST.nx === 0 && lb() && !N.ST.vt.some(v => v), 'без голосів наступний — 42; попап відкритий');
  card(1).click(); step(.1);
  assert(N.ST.vt[1] === 1 && N.ST.nx === 1 && /mine/.test(card(1).className) && /🗳️ 1/.test(card(1).textContent), 'клік по картці «57» — голос зараховано (лічильник 1, картка підсвічена), наступний — 57');
  assert(/✅|⏳/.test(lb().querySelector('.who').textContent) && /Ти/.test(lb().querySelector('.who').textContent), 'у попапі список гравців з ⏳/✅');
  card(2).click(); step(.1); assert(N.ST.vt[2] === 1 && N.ST.vt[1] === 0 && N.ST.nx === 2, 'клік по іншій картці — голос переїхав (63)');
  lb().querySelector('.hide').click(); step(.1);
  assert(!lb() && /F/.test(w.document.getElementById('ns-goal').textContent), '«Сховати» — попап зник, підказка: F — відкрити знову');
  let it = T.getInteract(); assert(it && /Лобі/.test(it.l), 'F — «🗳️ Лобі»'); it.fn(); step(.1); assert(lb(), 'F — лобі знову відкрите');
  T.keydown('Escape'); step(.05); assert(!lb(), 'відкрив меню (Esc) — попап не заважає'); T.closePanel(); step(.1); assert(lb(), 'закрив меню — попап знову тут');
  card(1).click(); step(.1); assert(N.ST.nx === 1, 'знову 57');
  startNight(1);
  const f1 = N.FLOORS[1];
  assert(N.floorAt(T.pl.x, T.pl.z) === 1 && Math.hypot(T.pl.x - f1.SPAWN.x, T.pl.z - f1.SPAWN.z) < 1.5, 'зміна на 57-му — тебе перенесло в хол «Поверх 57»');
  assert(N.CUR === 1 && N.ST.en.length >= 3 && /Поверх 57/.test(hudTxt()) && /00:0/.test(hudTxt()), `HUD: «${N.FL.n}», годинник 00:00, зомбі: ${N.ST.en.length}`);
  assert(N.ST.en.every(e => N.floorAt(e.x, e.z) === 1), 'зомбі — на тому самому поверсі');
  assert(T.MODEBAR && T.MODEBAR.slots.map(s => s.ic).join('') === '🔦🧪🔋📻☕🍸' && w.document.getElementById('weapon').hidden, 'набір режиму замість хотбара: 🔦 🧪 🔋 📻 ☕ 🍸');
  N.ST.en.length = 0;
}
const F = N.FLOORS[1], L = (x, z) => ({ x: F.cx + x, z: F.cz + z });
/* ---------- 2. Ліхтарик, батарейки ---------- */
{
  assert(me() && me().l === 1 && me().b > 99 && me().sh === 2 && me().bs === 1, 'ліхтарик увімкнений, 100%; у кишені 2 🧪 і 1 запасна 🔋');
  const b0 = me().b; step(2); assert(me().b < b0 - 1, `батарейка сідає (${b0} → ${me().b.toFixed(1)})`);
  T.keydown('KeyL'); step(.05); assert(me().l === 0, 'L — вимкнув ліхтарик'); const b1 = me().b; step(1); assert(me().b === b1, 'вимкнений не сідає');
  T.keydown('Digit1'); step(.05); assert(me().l === 1, '1 (набір режиму) — увімкнув знову');
  me().b = 40; T.keydown('Digit3'); step(.05); assert(me().b > 99 && me().bs === 0, '3 — вставив запасну батарейку: 100%');
  N.ST.bats = [3]; N.ST.shp = [5]; go(F.ITEMS[3]);
  let it = T.getInteract(); assert(it && /батарейку/.test(it.l), 'біля 🔋 F — «Взяти батарейку»'); it.fn(); step(.05);
  assert(me().bs === 1 && !N.ST.bats.includes(3), 'батарейку взяв про запас');
  go(F.ITEMS[5]); it = T.getInteract(); assert(it && /шот/.test(it.l), 'біля 🧪 F — «Взяти неоновий шот»'); it.fn(); step(.05); assert(me().sh === 3, 'шотів: 3');
  me().b = .5; step(1); assert(me().b === 0 && me().l === 0, 'батарейка сіла — ліхтарик погас');
  me().b = 100; me().l = 1;
}
/* ---------- 3. Зомбі: на світлі завмирає, у темряві підкрадається ---------- */
{
  const P0 = L(-8, -4.5);   // північний коридор
  go(P0); T.pl.face = Math.PI / 2;
  const z = N.addEnemy(0, { x: P0.x + 5, z: P0.z }); step(.05);
  assert(z && Math.abs(z.z - P0.z) < .4, 'зомбі в коридорі перед гравцем');
  const x0 = z.x; step(1.5);
  assert(z.lit === 1 && Math.abs(z.x - x0) < .05, `на світлі зомбі завмер (${x0.toFixed(2)} → ${z.x.toFixed(2)})`);
  assert(N.litBy(z) === 'me', 'litBy: світить саме гравець');
  T.pl.face = -Math.PI / 2; step(.6);
  assert(z.lit === 0 && z.x < x0 - .5, `відвернувся — зомбі підкрадається (${x0.toFixed(2)} → ${z.x.toFixed(2)})`);
  T.pl.face = Math.PI / 2; const x1 = z.x; step(.5); assert(Math.abs(z.x - x1) < .12, 'знову посвітив — знову завмер');
  N.ST.en.length = 0;
}
/* ---------- 4. Неоновий шот: коло світла на 30 с, зомбі не заходять ---------- */
{
  const P0 = L(0, -4.5); go(P0); T.pl.face = Math.PI / 2; const sh = me().sh;
  T.keydown('Digit2'); step(.6);
  const lz = N.ST.lz[0];
  assert(lz && me().sh === sh - 1 && lz.x > P0.x + 3 && Math.abs(lz.z - P0.z) < .5 && lz.t > 29, `2 — кинув шот уперед: коло на (${(lz.x - P0.x).toFixed(1)}, ${(lz.z - P0.z).toFixed(1)}), ${lz.t.toFixed(1)} с`);
  N.ST.lz = [{ id: 99, x: P0.x, z: P0.z, t: 30 }];
  T.keydown('KeyL'); step(.05); assert(me().l === 0, 'вимкнув ліхтарик — стоїш лише в неоновому колі');
  const z = N.addEnemy(0, { x: P0.x + 6, z: P0.z }); step(4);
  const d = Math.hypot(z.x - T.pl.x, z.z - T.pl.z);
  assert(!me().d && d > 2.6, `зомбі тупцює на краю кола й не заходить (відстань ${d.toFixed(2)})`);
  const zin = N.addEnemy(0, { x: P0.x - 1.5, z: P0.z }); step(.3); const zx = zin.x; step(1);
  assert(zin.lit === 1 && !me().d && Math.abs(zin.x - zx) < .05, 'зомбі всередині кола — засвітився й завмер');
  N.ST.en.length = 0; N.ST.lz[0].t = .2; step(.4); assert(!N.ST.lz.length, 'коло згасає за 30 с');
  T.keydown('KeyL'); step(.05);
}
/* ---------- 5. «Викрадення»: зомбі хапає за ногу й тягне до вантажного ліфта ---------- */
{
  const P0 = L(8, -4.5); go(P0); T.keydown('KeyL'); step(.05); assert(me().l === 0, 'вимкнув ліхтарик');
  const z = N.addEnemy(0, { x: P0.x + 1.5, z: P0.z });
  for (let k = 0; k < 30 && !me().dr; k++) step(.1);
  assert(me().dr === z.id && me().d === 1 && z.st === 'drag' && N.ST.on, 'у темряві зомбі схопив — тягне за ногу (ти лежиш, ніч триває)');
  const to = F.SVC[z.to].p, d0 = Math.hypot(T.pl.x - to.x, T.pl.z - to.z); step(2);
  const d1 = Math.hypot(T.pl.x - to.x, T.pl.z - to.z);
  assert(d1 < d0 - 1.2 && Math.hypot(T.pl.x - z.x, T.pl.z - z.z) < 1.4, `тебе тягнуть до «${F.SVC[z.to].n}» (${d0.toFixed(1)} → ${d1.toFixed(1)} м), ти — за ним`);
  const kel = w.document.getElementById('ns-kick');
  assert(/тягнуть/.test(N.goal().txt) && /ВИРВИСЬ/.test(T.getInteract().l) && kel && kel.style.display !== 'none' && /Тисни F \/ Пробіл/.test(kel.textContent), 'тягнуть: велика шкала «Тисни F / Пробіл!», F — «Вирвись»');
  T.keydown('Space'); step(1); T.keydown('Space'); step(1);
  assert(me().dr && me().sg < .25, `рідко тиснеш (1 раз/с) — не вирвешся (${Math.round(me().sg * 100)}%)`);
  let tm = 0; for (let k = 0; k < 40 && me().dr; k++) { if (k % 2) T.keydown('Space'); else T.getInteract().fn(); step(1 / 7); tm += 1 / 7; }
  assert(!me().dr && !me().d && tm <= 3, `часто тиснеш F і Пробіл (7 разів/с) — вирвався за ${tm.toFixed(1)} с`);
  assert(z.st === 'stun' && me().g > 1 && kel.style.display === 'none', 'зомбі оглушений, у тебе кілька секунд «пільги»; шкала зникла');
  const zx = z.x; step(1); assert(z.st === 'stun' && Math.abs(z.x - zx) < .01 && !me().dr, 'оглушений зомбі стоїть і не хапає');
  step(1.3); assert(z.st === 'flee', "~2 с — оговтався й тікає");
  // знову схопили — шот під ноги: кидає здобич
  N.ST.en.length = 0; me().g = 0; me().l = 0; go(P0); const z2 = N.addEnemy(0, { x: P0.x + 1.5, z: P0.z });
  for (let k = 0; k < 30 && !me().dr; k++) step(.1);
  assert(me().dr === z2.id, 'схопили вдруге');
  N.ST.lz.push({ id: 77, x: z2.x, z: z2.z, t: 30 }); step(.7);   // кент кинув шот під ноги (сам, поки тягнуть, кидати не можеш)
  assert(z2.st === 'flee' && !me().dr && me().d === 1 && N.ST.lz.length === 1, 'кент кинув 🧪 шот під ноги — зомбі в неоновому світлі кинув здобич і тікає');
  step(5.5); assert(!me().d, 'полежав кілька секунд — оговтався сам');
  // схопили біля самого ліфта — тягне не в нього, а до наступного (≥ 5 м): є час вирватись
  { N.ST.en.length = 0; me().g = 0; me().l = 0; const q = F.SVC[0].p; go(q); const zq = N.addEnemy(0, { x: q.x + .9, z: q.z });
    for (let k = 0; k < 30 && !me().dr; k++) step(.1);
    const dTo = me().dr ? Math.hypot(F.SVC[zq.to].p.x - zq.x, F.SVC[zq.to].p.z - zq.z) : 0;
    assert(me().dr === zq.id && zq.to !== 0 && dTo >= 5, `схопили біля «${F.SVC[0].n}» — тягне до «${F.SVC[zq.to].n}» (${dTo.toFixed(1)} м), а не в той, що впритул`);
    N.ST.en.length = 0; Object.assign(me(), { d: 0, dr: 0, sg: 0, rt: 0 }); step(.1); }
  // втретє — ніхто не допоміг: дотягли до підвалу, сам — програш
  N.ST.en.length = 0; N.ST.lz = []; me().g = 0; me().l = 0; go(P0); const z3 = N.addEnemy(0, { x: P0.x + 1.5, z: P0.z });
  for (let k = 0; k < 30 && !me().dr; k++) step(.1);
  const c0 = T.P.coins;
  for (let k = 0; k < 80 && N.ST.on; k++) step(.25);
  assert(!N.ST.on && T.P.addons.nightshift.nights === 1 && !T.P.addons.nightshift.wins, 'дотягли до підвалу, нікому викликати ліфт — зміну провалено');
  assert(T.P.coins > c0 && !T.MODEBAR && !w.document.getElementById('weapon').hidden, `втішна нагорода +${T.P.coins - c0} 🪙; набір режиму прибрано (звичайний хотбар)`);
  assert(N.ST.nx === 2, 'без голосів наступний поверх — по колу (63)');
}
/* ---------- 6. Повна втеча на 57-му: схованка, картка → стікер → щитова → рубильники → пожежні сходи ---------- */
{
  startNight(1);   // (проголосував за 57 ще раз у попапі) N.ST.en.length = 0;
  const c = F.CABS[0]; go(c.s);
  let it = T.getInteract(); assert(it && /Сховатися/.test(it.l), 'біля шафи F — «Сховатися в шафі»'); it.fn(); step(.1);
  assert(me().h === 1, 'сховався в шафі');
  const z = N.addEnemy(0, { x: c.s.x, z: c.s.z + .4 }); step(1.5);
  assert(!me().d && z.st !== 'chase', 'зомбі поруч, але не бачить того, хто в шафі');
  it = T.getInteract(); assert(it && /Вийти/.test(it.l), 'F — «Вийти зі схованки»'); it.fn(); step(.05); assert(!me().h, 'вийшов');
  N.ST.en.length = 0;
  go(F.ELEC); it = T.getInteract(); assert(it && /потрібна/.test(it.l), 'щитова зачинена — потрібна картка');
  go(F.EXIT); it = T.getInteract(); assert(it && /знеструмлено/.test(it.l), 'пожежні сходи знеструмлено');
  let tries = 0;
  for (let i = 0; i < F.CARD_SPOTS.length && !N.ST.card; i++) {
    go(F.CARD_SPOTS[i]); it = T.getInteract(); assert(it && /Обшукати/.test(it.l), `F — «Обшукати: ${F.CARD_SPOTS[i].n}»`);
    it.fn(); step(1.4); tries++; assert(N.ST.cs[i] === 1, 'місце обшукано');
  }
  assert(N.ST.card === 'me', `🔑 картку знайдено з ${tries}-ї спроби`);
  assert(/стікер/.test(N.goal().txt), 'підказка веде до стікера');
  go(F.NOTE_SPOTS[N.ST.noteAt]); it = T.getInteract(); assert(it && /стікер/.test(it.l), 'F — «Прочитати стікер»'); it.fn(); step(.05);
  assert(N.ST.note && N.ST.ord && N.ST.ord.length === 3, 'порядок рубильників відомий: ' + N.ST.ord.join(','));
  go(F.ELEC); it = T.getInteract(); assert(it && /карткою/.test(it.l), 'F — «Відчинити щитову карткою»'); it.fn(); step(.3);
  assert(N.ST.edoor === 1, 'щитову відчинено');
  const wrong = [0, 1, 2].find(i => i !== N.ST.ord[0]);
  go(F.BREAKERS[wrong]); it = T.getInteract(); assert(it && /рубильник/.test(it.l), 'біля рубильника F — «Увімкнути»'); it.fn(); step(1.3);
  assert(N.ST.fz === 0 && !N.ST.power, 'не той порядок — іскри, щиток скинуло');
  for (const i of N.ST.ord) { go(F.BREAKERS[i]); T.getInteract().fn(); step(1.3); }
  assert(N.ST.power === 1, '⚡ світло повернулось');
  go(F.EXIT); it = T.getInteract(); assert(it && /ТІКАЄМО/.test(it.l), 'F — «Відчинити: пожежні сходи»'); it.fn(); step(.5);
  assert(N.ST.exit === 1, 'двері на сходи відчинено');
  const c0 = T.P.coins, w0 = T.P.addons.nightshift.wins || 0;
  go({ x: (F.ESC.x0 + F.ESC.x1) / 2, z: (F.ESC.z0 + F.ESC.z1) / 2 }); step(.3);
  assert(!N.ST.on && T.P.addons.nightshift.wins === w0 + 1 && T.P.addons.nightshift.escapes === 1 && T.P.coins > c0 + 50, `ВТЕЧА пожежними сходами: перемога, +${T.P.coins - c0} 🪙`);
  assert(T.P.addons.nightshift.floors['57'] === 1 && !T.MODEBAR, 'перемогу записано на 57-й; набір режиму прибрано');
}
/* ---------- 7. 63-й поверх (по колу): дожити до 06:00 ---------- */
{
  assert(N.ST.nx === 2, 'наступний — 63 (по колу)');
  startNight(2); const f = N.FLOORS[2];
  assert(N.floorAt(T.pl.x, T.pl.z) === 2 && /Юридична/.test(hudTxt()), 'перенесло на «Поверх 63 · Юридична фірма»');
  N.ST.en.length = 0;
  N.ST.t = N.ST.dur - 1; step(.2); assert(/05:5/.test(hudTxt()), 'годинник показує 05:5x');
  const w0 = T.P.addons.nightshift.wins; step(1.2);
  assert(!N.ST.on && T.P.addons.nightshift.wins === w0 + 1, '🌅 06:00 — дожили до ранку, перемога');
}
/* ---------- 8. Лякалки, посилка з ліфта, датчики руху й прибиральник (на 42-му) ---------- */
{
  assert(N.ST.nx === 0, 'по колу — знову 42');
  startNight(0); const f = N.FLOORS[0]; N.ST.en.length = 0;
  // ☕ лікувальна кава
  assert((me().cf | 0) === 0 && T.MODEBAR.slots[4].count() === 0, 'кави на початку нема (☕ 0)');
  go(f.COFFEE); let it = T.getInteract(); assert(it && /Зварити лікувальну каву/.test(it.l), 'на кухні біля кавомашини F — «Зварити лікувальну каву»');
  it.fn(); step(1); assert((me().cf | 0) === 0 && N.V.act && N.V.act.what === 'brew' && N.AU.brew.me > 0, 'вариться (кавомашина гуде — шум для прибиральника)');
  step(2.4); assert(me().cf === 1, "за 3 с — ☕ 1");
  T.getInteract().fn(); step(3.4); assert(me().cf === 2 && T.MODEBAR.slots[4].count() === 2, '☕ 2 — лічильник у наборі режиму');
  it = T.getInteract(); assert(it && /вдосталь/.test(it.l), 'більше двох не звариш');
  T.pl.hp = 10; go({ x: f.cx - 9, z: f.cz }); T.keydown('Digit5'); step(.1); assert(me().cf === 1 && T.pl.hp > 10, `5 — випив: здоров'я ${T.pl.hp}`);
  me().d = 1; me().l = 0; step(.5); assert(N.ST.on && /5/.test(N.goal().txt) && /кави/.test(T.getInteract().l), 'лежиш, але є ☕ — зміна триває, підказка «5 — підведись сам»');
  T.keydown('Digit5'); step(.1); assert(!me().d && me().cf === 0 && me().g > 0, 'ковтнув кави — підвівся сам');
  me().cf = 1; N.ST.pl['Кент'] = { b: 50, l: 0, d: 1, h: 0, a: 0, g: 0, dr: 0, tk: 0, sh: 0, bs: 0, sg: 0, rt: 0, cf: 0 };
  N.onReq({ k: 'coffee', who: 'Кент' }, { id: 0, name: 'me' }); assert(!N.ST.pl['Кент'].d && me().cf === 0, 'кент лежить поруч — напоїв його кавою, підвівся');
  delete N.ST.pl['Кент'];
  // 🔦 ліхтарик не світить крізь стіни (скло — пропускає)
  {
    const P1 = { x: f.cx - 11.5, z: f.cz }, Z1 = { x: f.cx - 11.5, z: f.cz - 4 };   // коридор → опенспейс за глухою стіною
    go(P1); T.pl.face = Math.PI; step(.05); me().l = 1; me().b = 100;
    assert(!N.inBeam(P1.x, P1.z, Math.PI, Z1.x, Z1.z), 'точка за глухою стіною не в промені');
    const rays = N.coneRays(P1.x, P1.z, Math.PI), mid = rays[Math.floor(rays.length / 2)];
    assert(mid.l < 2.5 && rays.every(r => r.l <= 10.6), `конус темряви обрізано стіною (центральний промінь ${mid.l.toFixed(2)} м замість 10.5)`);
    const z = N.addEnemy(0, Z1); step(.1); const v = N.V.en.get(z.id); delete v.litAt;
    assert(z.lit === 0 && N.litBy(z) === '' && (!N.outlineOf(v) || N.outlineOf(v).k !== 'lit'), 'зомбі за стіною: сервер не вважає його освітленим, контур не підсвічується');
    N.ST.en.length = 0; step(.05);
    const P2 = { x: f.cx + 4, z: f.cz }, Z2 = { x: f.cx + 4, z: f.cz - 4 };   // коридор → переговорна за склом
    go(P2); T.pl.face = Math.PI; step(.05);
    assert(N.inBeam(P2.x, P2.z, Math.PI, Z2.x, Z2.z) && N.coneRays(P2.x, P2.z, Math.PI)[12].l > 9, 'крізь скляну стіну переговорної світить');
    const z2 = N.addEnemy(0, Z2); step(.2); const v2 = N.V.en.get(z2.id);
    assert(z2.lit === 1 && N.litBy(z2) === 'me' && N.outlineOf(v2).k === 'lit', 'зомбі за склом — освітлений і завмер, контур світиться');
    N.ST.en.length = 0; step(.05);
  }
  // 🍸 коктейль нічного бачення
  {
    const ck = N.ST.cks; assert(ck.length >= 1 && ck.length <= 2 && ck.every(i => !N.ST.bats.includes(i) && !N.ST.shp.includes(i)), `на поверсі ${ck.length} 🍸 (1–2 за ніч, окремо від 🔋 і 🧪)`);
    const sl = T.MODEBAR.slots[5]; assert(sl && sl.ic === '🍸' && sl.count() === 0 && (me().nc | 0) === 0, 'у наборі режиму слот 🍸 (6), спершу 0');
    T.keydown('Digit6'); step(.05); assert(!(me().nv > 0), 'без коктейлю 6 нічого не дає');
    const i = ck[0]; go(N.ITEMS[i]); let it2 = T.getInteract(); assert(it2 && /коктейль нічного бачення/.test(it2.l), 'біля зеленого келиха F — «Взяти коктейль нічного бачення»');
    it2.fn(); step(.05); assert(me().nc === 1 && !N.ST.cks.includes(i) && sl.count() === 1, '🍸 +1 у кишені, келих зник з підлоги');
    go({ x: f.cx - 9, z: f.cz }); step(.1); assert(N.V.darkA > .8 && N.nvK() === 0, `без нічного бачення — темно (${N.V.darkA})`);
    T.keydown('Digit6'); step(.1);
    assert(me().nc === 0 && me().nv > 4 && N.nvK() > .9 && N.V.darkA < .25, `6 — випив: нічне бачення ${me().nv.toFixed(1)} с, темряву знято (${N.V.darkA.toFixed(2)})`);
    assert(/👁️/.test(hudTxt()), 'у HUD — 👁️ відлік нічного бачення');
    step(5.2); assert(!(me().nv > 0) && N.nvK() === 0 && N.V.darkA > .8, 'за 5 с нічне бачення минуло — знову темно');
  }
  quiet = false;
  it = null;
  N.AU.scareT = 0; step(.1); assert(N.AU.scareT > 5, 'лякалка спрацювала (монітор / принтер / телефон / ліфт)');
  N.ST.gift = [0, 'shot']; const sh = me().sh; go(f.SVC[0].p); it = T.getInteract(); assert(it && /посилку/.test(it.l), 'ліфт привіз посилку — F «Забрати»'); it.fn(); step(.05);
  assert(me().sh === sh + 2 && !N.ST.gift, 'у посилці 🧪🧪');
  // датчик руху в коридорі: рух — світло, зомбі під ним завмирає
  N.AU.ms.fill(0); N.ST.ms.fill(0); const zs = N.addEnemy(0, { x: f.cx - 6, z: f.cz + .5 }); go({ x: f.cx - 10, z: f.cz }); T.keydown('KeyL'); step(.05);
  for (let k = 0; k < 4; k++) { N.AU.inp.me = { a: 0, n: .75, t: N.ST.t }; step(.02); }
  assert(N.ST.ms[0] === 1 && zs.lit === 1, '💡 датчик руху ввімкнув світло в коридорі — зомбі завмер');
  N.ST.en.length = 0; T.keydown('KeyL'); step(.05);
  N.AU.cleanAt = 0; step(.1); const cl = N.ST.en.find(e => e.t === 1); assert(cl, '🧹 прибиральник виїхав на зміну');
  { const dP = q => Math.hypot(q.p.x - T.pl.x, q.p.z - T.pl.z), far = f.SVC.reduce((a, b) => dP(b) > dP(a) ? b : a);
    assert(Math.hypot(cl.x - far.p.x, cl.z - far.p.z) < 1.5, `…тим ліфтом, що далі від людей («${far.n}»), — не збиває з ніг одразу біля дверей`); }
  quiet = true; N.AU.calm = 0;
  me().g = 0;   // і-кадри після «підвівся з кавою» (2.5 с) ще не минули — інакше прибиральник тебе не «бачить» як здобич
  cl.x = f.cx + 5; cl.z = f.cz + 1; cl.st = 'patrol'; go({ x: f.cx - 3, z: f.cz + 1 });
  for (let k = 0; k < 3; k++) { N.AU.inp.me = { a: 0, n: 1, t: N.ST.t }; N.V.noise = 1; step(.02); N.AU.inp.me = { a: 0, n: 1, t: N.ST.t }; }
  assert(cl.st === 'hunt' || cl.st === 'chase', `прибиральник почув кроки (${cl.st})`);
  assert(T.MODEBAR, 'під час зміни — набір режиму');
  T.keydown('Escape'); step(.05); const b = body().querySelector('[data-mode]:not([data-mode="nightshift"])'); if (b) { b.click(); step(.6); }
  step(.2); assert(!T.MODEBAR || N.floorAt(T.pl.x, T.pl.z) >= 0, 'пішов в інший режим — звичайний хотбар');
  N.endNight(false, 'тест'); step(.1);
}
// контури ворогів: без ліхтаря далеко — не видно; поруч — «чуття небезпеки»; після ліхтаря — світиться кілька секунд
{ const NS = w.__nightshift;
  const fa = NS.V.fa || 0, bx = -Math.sin(fa), bz = -Math.cos(fa);   // позаду гравця — поза ліхтариком
  const far = { x: T.pl.x + bx * 8, z: T.pl.z + bz * 8, t: 0 }, near = { x: T.pl.x + bx * 1.5, z: T.pl.z + bz * 1.5, t: 0 };
  assert(!NS.outlineOf(far), 'зомбі далеко в темряві — контуру нема (і жодного кола довкола)');
  const s1 = NS.outlineOf(near); assert(s1 && s1.k === 'sense' && s1.a > 0 && s1.a < .5, `зомбі зовсім поруч — ледь помітна червона підсвітка «чуйки» (${s1 && s1.a.toFixed(2)})`);
  far.x = T.pl.x - bx * 6; far.z = T.pl.z - bz * 6; const g1 = NS.outlineOf(far);   // перед гравцем — у промені ліхтарика assert(g1 && g1.k === 'lit' && g1.a > .9, 'посвітив ліхтарем — контур яскраво світиться');
  far.x = T.pl.x + bx * 8; far.z = T.pl.z + bz * 8; step(NS.GLOW_T - 1); assert(NS.outlineOf(far) && NS.outlineOf(far).k === 'lit', 'контур ще світиться кілька секунд після ліхтаря');
  step(2); assert(!NS.outlineOf(far), 'через ~3 с контур згасає'); }
step(4); assert(!lb() && !w.document.getElementById('mlobby'), 'пішов з режиму — попап лобі закритий і сам не відкривається');
console.log('ALL OK'); process.exit(0);
