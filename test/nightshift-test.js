// Тест режиму «Нічна зміна» v2 у грі без сервера: три поверхи хмарочоса, голосування, набір режиму, «викрадення», шоти.
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
const startNight = (fi) => {
  const f = N.FLOORS[N.floorAt(T.pl.x, T.pl.z)] || N.FL; go(f.CLOCK);
  const it = T.getInteract(); assert(it && /зміну/.test(it.l), 'біля табельного F — «почати нічну зміну»'); it.fn(); step(.1);
  assert(N.ST.on && (fi == null || N.ST.v === fi), 'ніч почалась' + (fi != null ? ` на «${N.FLOORS[fi].n}»` : '')); N.AU.calm = 0;
};
const walk = (x, z, dx, dz, n) => { T.pl.x = x; T.pl.z = z; N.V.lastP = null; step(.05); for (let k = 0; k < n; k++) { T.pl.x += dx; T.pl.z += dz; step(.02); } return { x: T.pl.x, z: T.pl.z }; };

assert(T.ADDONS.list.every(a => a.ok), 'аддон завантажився: ' + T.ADDONS.list.map(a => a.name + (a.ok ? '' : ' ✗ ' + a.err)).join(', '));
assert(w.document.querySelector('#mm-nightshift .mm-subtitle').textContent === 'Не вимикай ліхтарик', 'у меню картка «НІЧНА ЗМІНА · Не вимикай ліхтарик»');
assert(N.FLOORS.length === 3 && new Set(N.FLOORS.map(f => f.n)).size === 3, 'три поверхи: ' + N.FLOORS.map(f => f.n).join(' · '));
T.startGame(true); T.P.tut = -1; T.pl.hp = 9999; step(.3);
T.keydown('Escape'); step(.05); body().querySelector('[data-mode="nightshift"]').click(); step(.5);
assert(Math.hypot(T.pl.x - N.FLOORS[0].SPAWN.x, T.pl.z - N.FLOORS[0].SPAWN.z) < .8 && N.CUR === 0, 'Esc → «Нічна зміна» переносить у хол «Поверх 42» (наступна зміна за замовчуванням)');
assert(N.goal().id === 'clock' && w.document.getElementById('ns-intro'), 'до старту: інструкція й підказка до табельного');
w.document.querySelector('#ns-intro button').click(); assert(!w.document.getElementById('ns-intro') && T.P.addons.nightshift.intro2 === 1, 'інструкцію закрив — більше не показується');
step(.1); assert(/табельн/.test(w.document.getElementById('ns-goal').textContent) && /Поверх 42/.test(hudTxt()), 'у HUD назва поверху й рядок «👉 що робити зараз»');
assert(!T.MODEBAR, 'до зміни — звичайний хотбар');

/* ---------- 0. Кожен поверх збудований: стіни-статики, вміщається в острів, усе досяжне ---------- */
N.FLOORS.forEach((f, k) => {
  go(f.SPAWN); assert(N.CUR === k, `${f.n}: стоїш у холі — таблиці поверху активні`);
  const far = Math.max(...f.WALLS.map(r => Math.max(...[[r.x0, r.z0], [r.x1, r.z0], [r.x0, r.z1], [r.x1, r.z1]].map(([x, z]) => Math.hypot(x - f.cx, z - f.cz)))));
  assert(far < f.r - .5 && [[1, 1], [1, -1], [-1, 1], [-1, -1]].every(([a, b]) => T.terrainAt(f.cx + a * f.hx, f.cz + b * f.hz) === 'land'), `${f.n}: поверх у межах острова (кут ${far.toFixed(1)} < r ${f.r})`);
  const st = T.STATICS.filter(o => Math.abs(o.x - f.cx) <= f.hx + .7 && Math.abs(o.z - f.cz) <= f.hz + .7).length;
  assert(st > 150, `${f.n}: стіни й меблі — тверді (статиків: ${st})`);
  assert(f.ROOMS.length >= 14 && f.DOORS.filter(d => d.n).length >= 10 && f.WALLS.some(q => q.glass), `${f.n}: кімнат ${f.ROOMS.length}, табличок ${f.DOORS.filter(d => d.n).length}, є скляні стіни`);
  assert(f.SVC.length >= 2 && f.VOTE.length === 3 && f.SENS.length >= 2, `${f.n}: куди тягнуть — ${f.SVC.map(q => q.n).join(', ')}; 3 плити голосування; датчики руху`);
  const reach = () => { const g = N.grid(), NC = N.NC, seen = new Uint8Array(g.length), s0 = N.cellOf(f.SPAWN.x, f.SPAWN.z), q = [s0]; seen[s0] = 1; for (let h = 0; h < q.length; h++) { const c = q[h], i = c % NC, j = Math.floor(c / NC); for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= NC || jj * NC >= g.length) continue; const n = jj * NC + ii; if (!g[n] && !seen[n]) { seen[n] = 1; q.push(n); } } } return p => seen[N.cellOf(p.x, p.z)] === 1; };
  let ok = reach();
  const pts = [['табельний', f.CLOCK], ['вихід', f.EXIT], ['щитова', f.ELEC], ...f.VOTE.map((c, i) => ['плита ' + i, c]), ...f.CARD_SPOTS.map(c => ['картка: ' + c.n, c]), ...f.NOTE_SPOTS.map(c => ['стікер: ' + c.n, c]), ...f.ITEMS.map((c, i) => ['предмет ' + i, c]), ...f.CABS.map((c, i) => ['схованка ' + i, c.s]), ...f.WAYS.map((c, i) => ['точка ' + i, c]), ...f.EN_SPAWN.map((c, i) => ['поява ' + i, c]), ...f.SVC.map(c => [c.n, c.p])];
  let bad = pts.filter(([, p]) => !ok(p)).map(([n]) => n); assert(!bad.length, `${f.n}: усі важливі місця досяжні з холу` + (bad.length ? ': ' + bad.join(', ') : ''));
  assert(!ok(f.BREAKERS[0]), `${f.n}: до рубильників без картки не дійти (щитова зачинена)`);
  N.ST.edoor = 1; N.ST.exit = 1; ok = reach(); assert(f.BREAKERS.every(b => ok(b)) && ok({ x: (f.ESC.x0 + f.ESC.x1) / 2, z: (f.ESC.z0 + f.ESC.z1) / 2 }), `${f.n}: щитову й вихід відчинили — рубильники й ${f.exitN} досяжні`); N.ST.edoor = 0; N.ST.exit = 0; N.grid();
  const near = (p, r) => f.FURN.concat(f.WALLS).some(q => p.x > q.x0 - r && p.x < q.x1 + r && p.z > q.z0 - r && p.z < q.z1 + r);
  const tight = pts.filter(([, p]) => near(p, .38)).map(([n]) => n); assert(!tight.length, `${f.n}: точки взаємодії не впираються в меблі` + (tight.length ? ': ' + tight.join(', ') : ''));
  const acts = [['табельний', f.CLOCK], ['вихід', f.EXIT], ['щитова', f.ELEC], ...f.CARD_SPOTS.map(c => [c.n, c]), ...f.NOTE_SPOTS.map(c => [c.n, c]), ...f.CABS.map((c, i) => ['схованка ' + i, c.s]), ...f.BREAKERS.map(c => [c.n, c]), ...f.SVC.map(c => [c.n, c.p])];
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

/* ---------- 1. Голосування за поверх і старт на НЕ стандартному поверсі ---------- */
{
  for (const k in N.AU.votes) delete N.AU.votes[k]; N.tally(); N.V.myVote = -1;   // (у тесті стін ми наступали на плити)
  const f = N.FLOORS[0]; go(f.SPAWN); assert(N.ST.nx === 0, 'без голосів наступний — 42');
  go(f.VOTE[1]); step(.1); assert(N.ST.vt[1] === 1 && N.ST.nx === 1, 'став на плиту 57 — голос зараховано, наступний — 57');
  let it = (go(f.VOTE[2]), T.getInteract()); assert(it && /Голосувати/.test(it.l), 'на плиті F — «Голосувати»'); step(.1);
  assert(N.ST.vt[2] === 1 && N.ST.vt[1] === 0 && N.ST.nx === 2, 'перейшов на іншу плиту — голос переїхав (63)');
  go(f.VOTE[1]); step(.1); assert(N.ST.nx === 1, 'повернувся — знову 57');
  startNight(1);
  const f1 = N.FLOORS[1];
  assert(N.floorAt(T.pl.x, T.pl.z) === 1 && Math.hypot(T.pl.x - f1.SPAWN.x, T.pl.z - f1.SPAWN.z) < 1.5, 'зміна на 57-му — тебе перенесло в хол «Поверх 57»');
  assert(N.CUR === 1 && N.ST.en.length >= 3 && /Поверх 57/.test(hudTxt()) && /00:0/.test(hudTxt()), `HUD: «${N.FL.n}», годинник 00:00, зомбі: ${N.ST.en.length}`);
  assert(N.ST.en.every(e => N.floorAt(e.x, e.z) === 1), 'зомбі — на тому самому поверсі');
  assert(T.MODEBAR && T.MODEBAR.slots.map(s => s.ic).join('') === '🔦🧪🔋📻' && w.document.getElementById('weapon').hidden, 'набір режиму замість хотбара: 🔦 🧪 🔋 📻');
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
  assert(/тягнуть/.test(N.goal().txt) && /БРИКАЙСЯ/.test(T.getInteract().l), 'підказка «тебе тягнуть», F — «Брикайся»');
  for (let k = 0; k < 14 && me().dr; k++) { T.getInteract().fn(); step(.03); }
  assert(!me().dr && !me().d && z.st === 'flee', 'відбрикався — зомбі відпустив і тікає');
  // знову схопили — шот під ноги: кидає здобич
  N.ST.en.length = 0; me().g = 0; me().l = 0; go(P0); const z2 = N.addEnemy(0, { x: P0.x + 1.5, z: P0.z });
  for (let k = 0; k < 30 && !me().dr; k++) step(.1);
  assert(me().dr === z2.id, 'схопили вдруге');
  N.ST.lz.push({ id: 77, x: z2.x, z: z2.z, t: 30 }); step(.7);   // кент кинув шот під ноги (сам, поки тягнуть, кидати не можеш)
  assert(z2.st === 'flee' && !me().dr && me().d === 1 && N.ST.lz.length === 1, 'кент кинув 🧪 шот під ноги — зомбі в неоновому світлі кинув здобич і тікає');
  step(5.5); assert(!me().d, 'полежав кілька секунд — оговтався сам');
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
  go(F.SPAWN); go(F.VOTE[1]); step(.1); assert(N.ST.nx === 1, 'проголосував за 57 ще раз');
  startNight(1); N.ST.en.length = 0;
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
  startNight(0); const f = N.FLOORS[0]; quiet = false; N.ST.en.length = 0;
  N.AU.scareT = 0; step(.1); assert(N.AU.scareT > 5, 'лякалка спрацювала (монітор / принтер / телефон / ліфт)');
  N.ST.gift = [0, 'shot']; const sh = me().sh; go(f.SVC[0].p); let it = T.getInteract(); assert(it && /посилку/.test(it.l), 'ліфт привіз посилку — F «Забрати»'); it.fn(); step(.05);
  assert(me().sh === sh + 2 && !N.ST.gift, 'у посилці 🧪🧪');
  // датчик руху в коридорі: рух — світло, зомбі під ним завмирає
  N.AU.ms.fill(0); N.ST.ms.fill(0); const zs = N.addEnemy(0, { x: f.cx - 6, z: f.cz + .5 }); go({ x: f.cx - 10, z: f.cz }); T.keydown('KeyL'); step(.05);
  for (let k = 0; k < 4; k++) { N.AU.inp.me = { a: 0, n: .75, t: N.ST.t }; step(.02); }
  assert(N.ST.ms[0] === 1 && zs.lit === 1, '💡 датчик руху ввімкнув світло в коридорі — зомбі завмер');
  N.ST.en.length = 0; T.keydown('KeyL'); step(.05);
  N.AU.cleanAt = 0; step(.1); const cl = N.ST.en.find(e => e.t === 1); assert(cl, '🧹 прибиральник виїхав на зміну');
  quiet = true; N.AU.calm = 0;
  cl.x = f.cx + 5; cl.z = f.cz + 1; cl.st = 'patrol'; go({ x: f.cx - 3, z: f.cz + 1 });
  for (let k = 0; k < 3; k++) { N.AU.inp.me = { a: 0, n: 1, t: N.ST.t }; N.V.noise = 1; step(.02); N.AU.inp.me = { a: 0, n: 1, t: N.ST.t }; }
  assert(cl.st === 'hunt' || cl.st === 'chase', `прибиральник почув кроки (${cl.st})`);
  assert(T.MODEBAR, 'під час зміни — набір режиму');
  T.keydown('Escape'); step(.05); const b = body().querySelector('[data-mode]:not([data-mode="nightshift"])'); if (b) { b.click(); step(.6); }
  step(.2); assert(!T.MODEBAR || N.floorAt(T.pl.x, T.pl.z) >= 0, 'пішов в інший режим — звичайний хотбар');
  N.endNight(false, 'тест'); step(.1);
}
console.log('ALL OK'); process.exit(0);
