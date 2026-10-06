// Тест режиму «Нічна зміна» у грі без сервера.
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
src += ';window.__T={get paused(){return paused},get running(){return running},get P(){return P},pl,MON,ADDONS,startGame,frame,openPanel,closePanel,get panel(){return panel},getInteract:()=>getInteract(),input,keys,keydown:c=>dispatchEvent(new KeyboardEvent("keydown",{code:c}))};';
w.eval(src);
const T = w.__T; let now = 1000;
const N = w.__nightshift;
let quiet = true;
const calm = () => { if (quiet) { N.AU.scareT = 999; N.AU.spawnT = 999; N.AU.cleanAt = 1e9; } };   // без лякалок, ліфта й прибиральника — тест передбачуваний
const step = s => { for (let i = 0; i < s * 60; i++) { now += 16.7; calm(); T.frame(now); if (i % 3 === 0) IV.forEach(f => f()); } };
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); process.exit(1); } console.log('ok -', m); };
const body = () => w.document.querySelector('#pbody');
const go = (p, dx = 0, dz = 0) => { T.pl.x = p.x + dx; T.pl.z = p.z + dz; N.V.lastP = null; step(.05); };
const me = () => N.ST.pl.me;
const startNight = () => { go(N.CLOCK); const it = T.getInteract(); assert(it && /зміну/.test(it.l), 'біля табельного F — «почати нічну зміну»'); it.fn(); step(.1); assert(N.ST.on, 'ніч почалась'); N.AU.calm = 0; };

assert(T.ADDONS.list.every(a => a.ok), 'аддон завантажився: ' + T.ADDONS.list.map(a => a.name + (a.ok ? '' : ' ✗ ' + a.err)).join(', '));
assert(w.document.querySelector('#mm-nightshift .mm-subtitle').textContent === 'Не вимикай ліхтарик', 'у меню картка «НІЧНА ЗМІНА · Не вимикай ліхтарик»');
T.startGame(true); T.P.tut = -1; T.pl.hp = 9999; step(.3);
T.keydown('Escape'); step(.05); body().querySelector('[data-mode="nightshift"]').click(); step(.5);
assert(Math.hypot(T.pl.x - N.SPAWN.x, T.pl.z - N.SPAWN.z) < .8, 'Esc → «Нічна зміна» переносить у вестибюль офісу');
assert(N.goal().id === 'clock' && w.document.getElementById('ns-intro'), 'до старту: інструкція й підказка до табельного');
w.document.querySelector('#ns-intro button').click(); assert(!w.document.getElementById('ns-intro') && T.P.addons.nightshift.intro === 1, 'інструкцію закрив — більше не показується');
step(.1); assert(/табельн/.test(w.document.getElementById('ns-goal').textContent), 'у HUD рядок «👉 що робити зараз»');
// стіни: із вестибюля на захід — диван і стіна
{ go(N.SPAWN); for (let k = 0; k < 40; k++) { T.pl.x -= .2; step(.02); } assert(T.pl.x > N.SPAWN.x - 5.1, `стіна вестибюля не пускає на захід (${(T.pl.x - 100).toFixed(2)})`); }
// сітка шляху: усі точки блукання досяжні
{ const g = N.grid(); const bad = N.WAYS.filter(p => g[N.cellOf(p.x, p.z)]); assert(!bad.length, 'точки блукання не в стінах'); }
// план офісу: прямокутна будівля на острові, кімнати, двері, усе потрібне досяжне
{
  assert(N.ROOMS.length >= 14 && ['Опенспейс', 'Переговорна', 'Кабінет начальника', 'Кухня', 'Лаунж', 'Електрощитова', 'Архів', 'Вестибюль', 'Туалети', 'Серверна', 'Копі-центр'].every(n => N.ROOMS.some(r => r.n.includes(n))), `кімнат: ${N.ROOMS.length} (опенспейс, переговорна, кабінет, кухня, лаунж, щитова, архів, туалети…)`);
  const far = Math.max(...N.WALLS.map(r => Math.max(...[[r.x0, r.z0], [r.x1, r.z0], [r.x0, r.z1], [r.x1, r.z1]].map(([x, z]) => Math.hypot(x - 100, z - 150)))));
  assert(far < 28, `будівля вміщається на острові (найдальший кут ${far.toFixed(1)} < 28)`);
  assert(N.WALLS.some(w => w.glass) && N.DOORS.filter(d => d.n).length >= 12, `скляні стіни є, табличок на дверях: ${N.DOORS.filter(d => d.n).length}`);
  const desks = N.FURN_L.filter(f => f[0] === 'desk').length; assert(desks >= 24, `столів із ПК: ${desks}`);
  const reach = () => { const g = N.grid(), NC = 80, seen = new Uint8Array(g.length), s0 = N.cellOf(N.SPAWN.x, N.SPAWN.z), q = [s0]; seen[s0] = 1; for (let h = 0; h < q.length; h++) { const c = q[h], i = c % NC, j = Math.floor(c / NC); for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= NC || jj * NC >= g.length) continue; const n = jj * NC + ii; if (!g[n] && !seen[n]) { seen[n] = 1; q.push(n); } } } return p => seen[N.cellOf(p.x, p.z)] === 1; };
  let ok = reach();
  const pts = [['табельний', N.CLOCK], ['вихід', N.EXIT], ['щитова', N.ELEC], ...N.CARD_SPOTS.map(c => ['картка: ' + c.n, c]), ...N.NOTE_SPOTS.map(c => ['стікер: ' + c.n, c]), ...N.BAT_SPOTS.map((c, i) => ['батарейка ' + i, c]), ...N.CABS.map((c, i) => ['схованка ' + i, c.s]), ...N.WAYS.map((c, i) => ['точка ' + i, c]), ...N.EN_SPAWN.map((c, i) => ['поява ' + i, c])];
  const bad = pts.filter(([, p]) => !ok(p)).map(([n]) => n); assert(!bad.length, 'усі важливі місця досяжні з вестибюля' + (bad.length ? ': ' + bad.join(', ') : ''));
  assert(!ok({ x: N.BREAKERS[0].x, z: N.BREAKERS[0].z }), 'до рубильників без картки не дійти (щитова зачинена)');
  N.ST.edoor = 1; ok = reach(); assert(N.BREAKERS.every(b => ok(b)), 'щитову відчинили — рубильники досяжні'); N.ST.edoor = 0; N.grid();
  const near = (p, r) => N.FURN.concat(N.WALLS).some(q => p.x > q.x0 - r && p.x < q.x1 + r && p.z > q.z0 - r && p.z < q.z1 + r);
  const tight = pts.filter(([, p]) => near(p, .38)).map(([n]) => n); assert(!tight.length, 'точки взаємодії не впираються в меблі' + (tight.length ? ': ' + tight.join(', ') : ''));
  // крізь стіну не пройдеш, крізь двері — так
  const walk = (x, z, dx, dz, n) => { T.pl.x = x; T.pl.z = z; N.V.lastP = null; step(.05); for (let k = 0; k < n; k++) { T.pl.x += dx; T.pl.z += dz; step(.02); } return { x: T.pl.x, z: T.pl.z }; };
  let p = walk(100 - 11, 150, 0, -.2, 30); assert(p.z > 150 - 2, `стіна коридору не пускає в опенспейс (${(p.z - 150).toFixed(2)})`);
  p = walk(100 - 16, 150, 0, -.2, 30); assert(p.z < 150 - 4, `а через двері опенспейсу проходиш (${(p.z - 150).toFixed(2)})`);
  p = walk(100 + 1.5, 150, 0, -.2, 30); assert(p.z < 150 - 4, `через скляні двері в переговорну — теж (${(p.z - 150).toFixed(2)})`);
  p = walk(100 + 4, 150, 0, -.2, 30); assert(p.z > 150 - 2, `а крізь скло — ні (${(p.z - 150).toFixed(2)})`);
  go(N.SPAWN);
}

/* ---------- 1. Ліхтарик: розряд і батарейка ---------- */
startNight();
assert(N.ST.en.length >= 3 && /НІЧНА ЗМІНА/.test(w.document.getElementById('ns-hud').textContent) && /00:0/.test(w.document.getElementById('ns-hud').textContent), `зомбі: ${N.ST.en.length}, у HUD годинник 00:00`);
N.ST.en.length = 0;
assert(me() && me().l === 1 && me().b > 99, 'ліхтарик увімкнений, батарейка 100%');
const b0 = me().b; step(2); assert(me().b < b0 - 1, `батарейка сідає (${b0} → ${me().b.toFixed(1)})`);
T.keydown('KeyL'); step(.05); assert(me().l === 0, 'L — вимкнув ліхтарик'); const b1 = me().b; step(1); assert(me().b === b1, 'вимкнений не сідає');
T.keydown('KeyL'); step(.05); assert(me().l === 1, 'L — увімкнув знову');
me().b = 10; N.ST.bats = [3]; go(N.BAT_SPOTS[3]);
let it = T.getInteract(); assert(it && /батарейку/.test(it.l), 'біля 🔋 F — «Взяти батарейку»'); it.fn(); step(.05);
assert(me().b >= 69 && !N.ST.bats.includes(3), `батарейку взяв: ${Math.round(me().b)}%`);
me().b = .5; step(1); assert(me().b === 0 && me().l === 0, 'батарейка сіла — ліхтарик погас');
me().b = 100; me().l = 1;
/* ---------- 2. Зомбі: на світлі завмирає, у темряві підкрадається ---------- */
{
  const P0 = { x: 100 - 8, z: 150 + 1 };   // коридор
  go(P0); T.pl.face = Math.PI / 2;          // дивимось на схід (+x)
  const z = N.addEnemy(0, { x: P0.x + 5, z: P0.z }); step(.05);
  assert(z && Math.abs(z.z - P0.z) < .4, 'зомбі в коридорі перед гравцем');
  const x0 = z.x; step(1.5);
  assert(z.lit === 1 && Math.abs(z.x - x0) < .05, `на світлі зомбі завмер (${x0.toFixed(2)} → ${z.x.toFixed(2)})`);
  assert(N.litBy(z) === 'me', 'litBy: світить саме гравець');
  T.pl.face = -Math.PI / 2; step(.6);       // відвернувся
  assert(z.lit === 0 && z.x < x0 - .5, `відвернувся — зомбі підкрадається (${x0.toFixed(2)} → ${z.x.toFixed(2)})`);
  T.pl.face = Math.PI / 2; const x1 = z.x; step(.5); assert(Math.abs(z.x - x1) < .12, 'знову посвітив — знову завмер');
  // за стіною світло не допомагає
  T.keydown('KeyL'); step(.05); assert(me().l === 0, 'вимкнув ліхтарик');
  /* ---------- 3. Схопили — лежиш; один гравець — програш ---------- */
  const c0 = T.P.coins; let downed = false;
  for (let k = 0; k < 40 && N.ST.on; k++) { step(.1); if (me() && me().d) downed = true; }
  assert(!N.ST.on && T.P.addons.nightshift.nights === 1 && !T.P.addons.nightshift.wins, 'у темряві зомбі схопив — нікому підняти, зміну провалено');
  assert(T.P.coins > c0, `втішна нагорода: +${T.P.coins - c0} 🪙`);
}
/* ---------- 4. Підняти друга: логіка на прикладі двох «гравців» ---------- */
{
  startNight(); N.ST.en.length = 0;
  N.ST.pl.me.d = 1; step(.05);
  assert(N.goal().txt.includes('схопили'), 'лежиш — підказка «чекай, поки піднімуть»');
  const mx = T.input.mx; T.keys.KeyW = true; const zz = T.pl.z; step(.3); T.keys.KeyW = false;
  assert(Math.abs(T.pl.z - zz) < .05, 'лежачи не рухаєшся');
  N.ST.pl.me.d = 0; T.P.hp = 9999; step(.05);
}
/* ---------- 5. Шафа: сховався — зомбі не бачить ---------- */
{
  const c = N.CABS[0]; go(c.s);
  it = T.getInteract(); assert(it && /Сховатися/.test(it.l), 'біля шафи F — «Сховатися в шафі»'); it.fn(); step(.1);
  assert(me().h === 1, 'сховався в шафі');
  const z = N.addEnemy(0, { x: c.s.x, z: c.s.z + .4 }); step(1.5);
  assert(!me().d && z.st !== 'chase', 'зомбі поруч, але не бачить того, хто в шафі');
  it = T.getInteract(); assert(it && /Вийти/.test(it.l), 'F — «Вийти з шафи»'); it.fn(); step(.05); assert(!me().h, 'вийшов із шафи');
  N.ST.en.length = 0;
}
/* ---------- 6. Повна втеча: картка → стікер → щитова → рубильники → вихід ---------- */
{
  go(N.ELEC); it = T.getInteract(); assert(it && /потрібна/.test(it.l), 'щитова зачинена — потрібна картка');
  go(N.EXIT); it = T.getInteract(); assert(it && /знеструмлено/.test(it.l), 'вихід знеструмлено');
  // картка: обшукуємо місця
  let tries = 0;
  for (let i = 0; i < N.CARD_SPOTS.length && !N.ST.card; i++) {
    go(N.CARD_SPOTS[i]); it = T.getInteract(); assert(it && /Обшукати/.test(it.l), `F — «Обшукати: ${N.CARD_SPOTS[i].n}»`);
    it.fn(); step(1.4); tries++; assert(N.ST.cs[i] === 1, 'місце обшукано');
  }
  assert(N.ST.card === 'me', `🔑 картку знайдено з ${tries}-ї спроби`);
  // стікер
  assert(/стікер/.test(N.goal().txt), 'підказка веде до стікера');
  go(N.NOTE_SPOTS[N.ST.noteAt]); it = T.getInteract(); assert(it && /стікер/.test(it.l), 'F — «Прочитати стікер»'); it.fn(); step(.05);
  assert(N.ST.note && N.ST.ord && N.ST.ord.length === 3, 'порядок рубильників відомий: ' + N.ST.ord.join(','));
  go(N.ELEC); it = T.getInteract(); assert(it && /карткою/.test(it.l), 'F — «Відчинити щитову карткою»'); it.fn(); step(.3);
  assert(N.ST.edoor === 1, 'щитову відчинено');
  // помилка: не той рубильник — скидає
  const wrong = [0, 1, 2].find(i => i !== N.ST.ord[0]);
  go(N.BREAKERS[wrong]); it = T.getInteract(); assert(it && /рубильник/.test(it.l), 'біля рубильника F — «Увімкнути»'); it.fn(); step(1.3);
  assert(N.ST.fz === 0 && !N.ST.power, 'не той порядок — іскри, щиток скинуло');
  for (const i of N.ST.ord) { go(N.BREAKERS[i]); T.getInteract().fn(); step(1.3); }
  assert(N.ST.power === 1, '⚡ світло повернулось');
  go(N.EXIT); it = T.getInteract(); assert(it && /ТІКАЄМО/.test(it.l), 'F — «Відчинити вихідні двері»'); it.fn(); step(.5);
  assert(N.ST.exit === 1, 'вихідні двері відчинено');
  const c0 = T.P.coins, w0 = T.P.addons.nightshift.wins || 0;
  for (let k = 0; k < 30 && N.ST.on; k++) { T.pl.x = 100; T.pl.z += .2; step(.05); }
  assert(!N.ST.on && T.P.addons.nightshift.wins === w0 + 1 && T.P.addons.nightshift.escapes === 1 && T.P.coins > c0 + 50, `ВТЕЧА: перемога, +${T.P.coins - c0} 🪙`);
}
/* ---------- 7. Дожити до 06:00 ---------- */
{
  go(N.SPAWN); startNight(); N.ST.en.length = 0;
  N.ST.t = N.ST.dur - 1; step(.2); assert(/05:5/.test(w.document.getElementById('ns-hud').textContent), 'годинник показує 05:5x');
  const w0 = T.P.addons.nightshift.wins; step(1.2);
  assert(!N.ST.on && T.P.addons.nightshift.wins === w0 + 1, '🌅 06:00 — дожили до ранку, перемога');
}
/* ---------- 8. Лякалки й прибиральник ---------- */
{
  go(N.SPAWN); startNight(); quiet = false; N.ST.en.length = 0;
  N.AU.scareT = 0; step(.1); assert(N.AU.scareT > 5, 'лякалка спрацювала (монітор / принтер / телефон / ліфт)');
  N.AU.cleanAt = 0; step(.1); const cl = N.ST.en.find(e => e.t === 1); assert(cl, '🧹 прибиральник вийшов на зміну');
  quiet = true; N.AU.calm = 0;
  // чує біг
  cl.x = 100 + 5; cl.z = 150 + 1; cl.st = 'patrol'; go({ x: 100 - 3, z: 150 + 1 });
  // гравець біжить: шум 1 (сервер бере його з AU.inp)
  for (let k = 0; k < 3; k++) { N.AU.inp.me = { a: 0, n: 1, t: N.ST.t }; N.V.noise = 1; step(.02); N.AU.inp.me = { a: 0, n: 1, t: N.ST.t }; }
  assert(cl.st === 'hunt' || cl.st === 'chase', `прибиральник почув кроки (${cl.st})`);
  N.endNight(false, 'тест'); step(.1);
}
console.log('ALL OK'); process.exit(0);
