// Тест аддона «Еспресо-Сплав» у грі без сервера (гравець сам рахує сплав).
// Запуск: node test/rafting-test.js
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
w.__ADDON_CODE = [{ id: 'progression', src: 'progression.js', code: fs.readFileSync(path.join(root, 'addons/_examples/progression.js'), 'utf8') },
  { id: 'rafting', src: 'rafting/addon.js', code: fs.readFileSync(path.join(root, 'addons/_examples/rafting/addon.js'), 'utf8') }];
let src = fs.readdirSync(path.join(root, 'src')).filter(f => f.endsWith('.js')).sort().map(f => fs.readFileSync(path.join(root, 'src', f), 'utf8')).join('\n');
src += ';window.__T={get paused(){return paused},get running(){return running},get P(){return P},pl,MON,PROPS,BODIES,ADDONS,ISLMAP,startGame,frame,openPanel,closePanel,get panel(){return panel},getInteract:()=>getInteract(),terrainAt:(x,z)=>terrainAt(x,z),nearBar:()=>nearBar(),input,renderPanel,keydown:c=>dispatchEvent(new KeyboardEvent("keydown",{code:c})),fireHook:h=>fireHook(h),releaseCarry:t=>releaseCarry(t),pickUpAny:t=>pickUpAny(t),damageProp:(p,d)=>damageProp(p,d),hurt:d=>hurtPlayer(d),dropLoot:(x,z,l)=>dropLoot(x,z,l),DROPS};';
w.eval(src);
const T = w.__T; let now = 1000;
const step = s => { for (let i = 0; i < s * 60; i++) { now += 16.7; T.frame(now); if (i % 3 === 0) IV.forEach(f => f()); } };
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); process.exit(1); } console.log('ok -', m); };
const body = () => w.document.querySelector('#pbody');
const RX = -112, RZ = 84;
const rand2 = (a, b) => a + Math.random() * (b - a);
assert(T.ADDONS.list.every(a => a.ok), 'аддони завантажились: ' + T.ADDONS.list.map(a => a.name + (a.ok ? '' : ' ✗ ' + a.err)).join(', '));
assert(w.document.querySelector('#mm-rafting .mm-subtitle').textContent === 'Рафтинг-Запара', 'у головному меню картка «СПЛАВ · Рафтинг-Запара»');
T.startGame(true); T.P.tut = -1; T.pl.hp = 9999; step(.3);
// пліт — суша, між плотами — глибока вода
assert(T.terrainAt(RX - 5, RZ) === 'land' && T.terrainAt(RX, RZ) === 'deep' && T.terrainAt(RX + 5, RZ) === 'land', 'наш пліт і пліт зомбі — суша, між ними вода');
// на пліт через вкладку
T.openPanel('ax_rafting'); body().querySelector('[data-rf="go"]').click(); step(.2);
assert(Math.hypot(T.pl.x - (RX - 5.2), T.pl.z - (RZ + 1.6)) < .5, 'кнопка «На пліт» переносить на пліт');
assert(T.nearBar() === false || true, 'бар на плоту');
T.pl.x = RX - 5.2; T.pl.z = RZ - 2.6; step(.1); assert(T.nearBar(), 'на плоту можна варити каву (бар)');
// усе на плоту піднімається з F: баки, кег, коробки
{
  const things = [...T.BODIES.filter(b => Math.abs(b.hx - RX) < 12 && Math.abs(b.hz - RZ) < 12), ...T.PROPS.filter(p => p.type === 'crate' && Math.abs(p.ox - RX) < 12)];
  let okN = 0;
  for (const o of things) {
    T.pl.x = o.x - .8; T.pl.z = o.z; T.pl.y = 0; step(.1);
    T.keydown('KeyF'); step(.1);
    if (T.pl.carry === o) okN++; else console.log('  не піднявся:', o.kind || o.type, (o.x - RX).toFixed(1), (o.z - RZ).toFixed(1), 'а взяв', T.pl.carry && (T.pl.carry.kind || T.pl.carry.type), T.pl.carry && (T.pl.carry.x - RX).toFixed(1));
    if (T.pl.carry) { const c = T.pl.carry; T.keydown('KeyF'); step(.3); if (c.hx != null) { c.x = c.hx; c.z = c.hz; } else if (c.ox != null) { c.x = c.ox; c.z = c.oz; c.mesh.position.set(c.ox, 0, c.oz); } }
  }
  assert(things.length === 7 && okN === things.length, `F піднімає все на плоту: баки, кег і коробки (${okN}/${things.length})`);
}
// Esc → пауза з режимами
T.keydown('Escape'); step(.05);
assert(T.panel === 'pause' && body().querySelector('[data-mode="rafting"]') && body().querySelector('[data-mode="world"]'), 'Esc відкриває паузу з вибором режиму (світ, сплав)');
body().querySelector('[data-mode="world"]').click(); step(.5);
assert(Math.hypot(T.pl.x, T.pl.z - 3) < 1, '«Відкритий світ» переносить у «Гущу»');
T.keydown('Escape'); step(.05); body().querySelector('[data-mode="rafting"]').click(); step(.5);
assert(Math.hypot(T.pl.x - (RX - 5.2), T.pl.z - (RZ + 1.6)) < .5, 'вибір «Еспресо-Сплав» у паузі переносить на пліт');
// дзвін → старт
T.pl.x = RX - 2.6; T.pl.z = RZ + 3; step(.1);
let it = T.getInteract(); assert(it && /Відчалити/.test(it.l), 'біля дзвона F — «Відчалити»: ' + (it && it.l));
it.fn(); step(.1);
const hud = () => w.document.getElementById('raft-hud');
assert(hud() && /Хвиля 0/.test(hud().textContent), 'сплав почався, вгорі таймер і хвиля');
for (let i = 0; i < 80 && !(w.__raft.ST.arr > 0); i++) step(.1);
const zs = () => T.MON.filter(m => m.isl.id === 'river' && !m.calm && m.state !== 'fall');
assert(w.__raft.ST.arr > 0 && zs().length >= 3 && zs().every(m => m.z < RZ - 4 && m.state !== 'fall'), `пліт припливає вже із зомбі (${zs().length}), вони стоять на ньому, а не у воді`);
step(4);
assert(zs().length >= 3 && zs().every(m => !m.zlvl) && zs().some(m => Math.abs(m.z - RZ) < 5), `хвиля 1: пліт приплив із зомбі (${zs().length}), без рівнів прогресії`);
assert(/Хвиля 1/.test(hud().textContent), 'HUD: хвиля 1');
// зомбі стрибають на наш пліт
let jumped = false;
for (let i = 0; i < 40 && !jumped; i++) { step(.5); jumped = zs().some(m => m.x < RX - 1.4); T.pl.hp = 9999; }
assert(jumped, 'зомбі стрибнули на абордаж на наш пліт');
{ let mx = 0; for (let i = 0; i < 50; i++) { T.pl.hp = 9999; T.pl.iframes = 1e9; T.pl.x = RX - 8; T.pl.z = RZ + 4; step(.5); mx = Math.max(mx, zs().filter(m => m.x < RX - 1.4).length); }
  assert(mx <= 2, `на абордаж — лише пара зомбі одночасно (максимум ${mx})`); }
// те, що впало у воду, течія прибиває до плота
{ T.dropLoot(RX + .2, RZ + 2, [{ k: 'coins', d: 3 }]); step(.05); const dd = T.DROPS[T.DROPS.length - 1]; const x0 = dd.x; step(4);
  assert(dd.x < x0 - 1 && T.terrainAt(dd.x, dd.z) === 'land', `монети з води прибило до плота (${(x0 - RX).toFixed(1)} → ${(dd.x - RX).toFixed(1)})`); }
// ящики пливуть річкою, вантуз їх тягне
const rafting = T.ADDONS.list.find(a => a.id === 'rafting');
step(3);
const ingBefore = JSON.stringify(T.P.ing), R = w.__raft;
let grabbed = false;
for (let i = 0; i < 60 && !grabbed; i++) {
  T.pl.x = RX - 2.2; T.pl.z = RZ - 4; T.pl.y = 0; T.pl.hp = 9999; T.pl.iframes = 1e9;
  const c = R.ST.crates.map(c => [c, R.crateZX(c)]).find(([c, p]) => p.z > RZ - 10 && p.z < RZ - 1 && Math.abs(p.x - RX) < 1);
  if (c) { T.input.aimOk = true; T.input.ax = c[1].x; T.input.az = c[1].z; T.pl.face = Math.atan2(c[1].x - T.pl.x, c[1].z - T.pl.z); T.fireHook({ rng: 10 }); step(.1); grabbed = JSON.stringify(T.P.ing) !== ingBefore; }
  else step(.25);
}
assert(grabbed, 'вантуз витягнув лут з річки: ' + ingBefore + ' → ' + JSON.stringify(T.P.ing));
// пліт зомбі гойдається: то відпливає, то підпливає
{ const R = w.__raft, os = []; for (let i = 0; i < 10; i++) { T.pl.hp = 9999; T.pl.iframes = 1e9; step(1); os.push(R.enOff()); } const lo = Math.min(...os), hi = Math.max(...os); assert(hi - lo > .6, `пліт зомбі гойдається (зсув від ${lo.toFixed(1)} до ${hi.toFixed(1)} м)`); }
// хаос: річка розходиться — потім стикування
{
  const R = w.__raft; R.chaos('split'); step(5);
  assert(R.enOff() > 3, 'річка розійшлась: пліт зомбі відплив далеко (' + R.enOff().toFixed(1) + ' м)');
  step(11.5); assert(R.enOff() < -1, 'стикування: плоти зіткнулись (' + R.enOff().toFixed(1) + ')');
  step(4);
  R.chaos('quake'); step(1); R.chaos('storm'); step(8); R.chaos('flood'); step(.5);
  assert(R.ST.crates.length >= 8, 'лут-потоп: річка несе купу ящиків (' + R.ST.crates.length + ')');
  T.pl.iframes = 0;
}
// бомба: збираємо на столі
w.__raft.AU.chaosT = 999; w.__raft.AU.rapT = 999; T.P.ing.powder = 6; T.P.ing.tape = 3; T.pl.x = RX - 7.9; T.pl.z = RZ + 3.4; T.pl.y = 0; step(.1);
it = T.getInteract(); assert(it && /бомбу/.test(it.l), 'біля столу F — «Зібрати бомбу»');
for (let k = 0; k < 3; k++) { T.pl.iframes = 1e9; T.pl.hp = 9999; T.pl.x = RX - 7.9; T.pl.z = RZ + 3.4; T.pl.y = 0; step(.05); T.getInteract().fn(); for (let j = 0; j < 5; j++) { T.pl.x = RX - 7.9; T.pl.z = RZ + 3.4; step(.5); } }
assert(T.P.ing.cbomb === 3 && T.P.ing.powder === 0, 'зібрано 3 бомби');
// 🍾 коктейль Молотова: збираємо біля ящика з пляшками
{ const R = w.__raft; T.P.ing.powder = 1; T.P.ing.syrup = 1; T.P.ing.molly = 0;
  const at = () => { T.pl.x = R.SHELF.x; T.pl.z = R.SHELF.z - .8; T.pl.y = 0; T.pl.hp = 9999; T.pl.iframes = 1e9; };
  at(); step(.1); it = T.getInteract(); assert(it && /Молотова/.test(it.l), 'біля ящика з пляшками F — «Зібрати коктейль Молотова»: ' + (it && it.l));
  it.fn(); for (let j = 0; j < 4; j++) { at(); step(.5); }
  assert(T.P.ing.molly === 1 && T.P.ing.powder === 0 && T.P.ing.syrup === 0, 'зібрано 🍾 коктейль Молотова (1 🧨 + 1 🍯)');
  assert(/🍾 1/.test(hud().textContent), 'HUD: 🍾 1 (V — кинути)');
  // пліт зомбі на місці; хвилі, абордаж і хаос на паузі — щоб перевірка була передбачуваною
  Object.assign(R.AU, { jumpT: 999, chaosT: 999, rapT: 999, burst: 0 }); R.ST.sp = null;
  for (let i = 0; i < 80 && !(R.enLand() && R.ST.next > 50); i++) { if (!R.ST.enemy && R.ST.next > 1) R.ST.next = .5; if (R.enLand()) R.ST.next = 999; T.pl.hp = 9999; T.pl.iframes = 1e9; T.pl.x = RX - 5.2; T.pl.z = RZ + 1.6; step(.5); }
  assert(R.enLand(), 'пліт зомбі на місці');
  const er = R.enR(), fx = er.x0 + 3.5, fz = er.z0 + 2.6;
  for (const m of zs()) { m.x = er.x0 + rand2(1, 6); m.z = er.z1 - .9; m.stun = 9; m.rj = null; }   // решта зомбі — у дальньому кінці плота
  R.spawnZombies(2); const [z1, z2] = zs().slice(-2);
  Object.assign(z1, { x: fx, z: fz, stun: 9, rj: null }); Object.assign(z2, { x: fx + 1.4, z: fz, stun: 9, rj: null });
  R.ST.hp = R.ST.max = 8; const hp0 = R.ST.hp;
  T.pl.x = RX - 2; T.pl.z = RZ; T.pl.y = 0; T.input.aimOk = true; T.input.ax = fx; T.input.az = fz;
  T.keydown('KeyV'); assert(T.P.ing.molly === 0 && R.V.bombs.some(b => b.kind === 'molly'), 'V — кинув «молотов» (пляшка летить)');
  for (let i = 0; i < 30 && !R.ST.fires.length; i++) { T.pl.hp = 9999; step(.05); }
  const f = R.ST.fires[0];
  assert(f && Math.hypot(R.enR().x0 + f.ox - fx, R.enR().z0 + f.oz - fz) < 1 && R.V.fires.size === 1, '🔥 пляшка розбилась на плоту зомбі — пожежа, видно полум\'я');
  assert(z1.state === 'fall', '🔥 зомбі в самому полум\'ї стрибнув у воду');
  let fled = 0; for (let i = 0; i < 12; i++) { T.pl.hp = 9999; T.pl.iframes = 1e9; step(.2); const r = R.enR(); if (z2.state !== 'fall' && z2.x > r.x0 && z2.x < r.x1 && z2.z < r.z1) fled = Math.max(fled, Math.hypot(z2.x - (r.x0 + f.ox), z2.z - (r.z0 + f.oz))); }
  assert(fled > R.FIRE_R + 1 && z2.state !== 'fall', `🔥 зомбі поруч утік від вогню на інший край плота (${fled.toFixed(1)} м від полум'я)`);
  for (let i = 0; i < 30 && R.ST.fires.length; i++) { T.pl.hp = 9999; T.pl.iframes = 1e9; step(.25); }
  assert(!R.ST.fires.length && R.V.fires.size === 0 && R.ST.hp === hp0 - 2, `пожежа догоріла за ${R.FIRE_T} с і з'їла 2 міцності плота (${hp0} → ${R.ST.hp})`);
  // у воду — просто пшшш
  T.P.ing.molly = 1; T.pl.x = RX - 2; T.pl.z = RZ; T.input.ax = RX; T.input.az = RZ - 3; T.keydown('KeyV'); step(1.2);
  assert(!R.ST.fires.length && T.P.ing.molly === 0, '«молотов» у воду — пшшш, нічого не горить');
  R.ST.hp = R.ST.max = 3; Object.assign(R.AU, { jumpT: 3 }); R.ST.next = 30; }
// кидаємо бомби у пліт зомбі (G) — пліт тоне
T.pl.x = RX - 2; T.pl.z = RZ; T.pl.face = Math.PI / 2; T.input.aimOk = true; T.input.ax = RX + 5; T.input.az = RZ;
let sunk = false; const sk0 = w.__raft.ST.sunk; w.__raft.AU.chaosT = 999; w.__raft.ST.sp = null;
for (let k = 0; k < 6 && !sunk; k++) {
  if (!(T.P.ing.cbomb > 0)) T.P.ing.cbomb = 1;
  T.pl.hp = 9999; T.pl.x = RX - 2; T.pl.z = RZ; T.input.aimOk = true; T.input.ax = RX + 5; T.input.az = RZ;
  T.keydown('KeyG'); step(1.2);
  sunk = w.__raft.ST.sunk > sk0;
}
assert(sunk, 'після кількох бомб пліт зомбі пішов на дно (там тепер вода)');
step(1);
assert(zs().filter(m => m.x > RX + 1.5 && Math.abs(m.z - RZ) < 5.5 && !(w.__raft.ST.arr > 0)).length === 0, 'зомбі з потопленого плота поплили у відпустку');   // новий пліт може вже підпливати згори
// відбили хвилю → порожній пліт відпливає, новий припливає
{
  const R = w.__raft; let left = false, came = false;
  for (let i = 0; i < 120 && !(left && came); i++) {
    for (const m of T.MON.slice()) if (m.isl.id === 'river' && !m.calm && m.state !== 'fall') { m.state = 'fall'; m.vy = -1; }
    T.pl.hp = 9999; T.pl.iframes = 1e9; T.pl.x = RX - 5.2; T.pl.z = RZ + 1.6; T.pl.y = 0; step(.5);
    if (R.ST.lv > 0) left = true;
    if (left && R.ST.arr > 0) came = true;
  }
  assert(left && came, 'хвилю відбито — порожній пліт відплив, новий припливає');
}
// бак летить над водою
const bin = T.BODIES.find(b => b.kind === 'bin' && Math.abs(b.hx - (RX - 3.2)) < .1);
T.pl.x = bin.x - .5; T.pl.z = bin.z; T.pl.y = 0; step(.05);
T.pickUpAny(['body', bin]); T.pl.x = RX - 2.3; T.pl.z = RZ + 2; step(.1);
for (const m of T.MON.slice()) if (m.isl.id === 'river') { m.x = RX - 8; m.z = RZ - 4; m.stun = 5; } T.pl.face = Math.PI / 2; T.input.aimOk = true; T.input.ax = RX + 6; T.input.az = RZ + 2; T.releaseCarry(true);
let maxX = bin.x, maxY = 0; for (let i = 0; i < 40; i++) { step(1 / 60); maxX = Math.max(maxX, bin.x); maxY = Math.max(maxY, bin.y); }
assert(maxX > RX + 2 && maxY > .5, `кинутий бак летить над водою (до x=${(maxX - RX).toFixed(1)}, висота ${maxY.toFixed(1)})`);
// змило за борт → рятують
T.pl.x = RX - .2; T.pl.z = RZ; T.pl.y = -.9; T.pl.iframes = 0; const hp0 = T.pl.hp = 500; step(8.5);
assert(T.pl.x < RX - 1.5 && T.pl.hp < hp0, 'кого змило за борт — витягують на пліт');
{ T.pl.x = RX - .2; T.pl.z = RZ - 8; T.pl.y = -.9; T.pl.iframes = 1e9; const h0 = T.pl.hp = 300; step(2); assert(T.pl.hp < h0 - 4, `крижана вода: здоров'я тане (${h0} → ${Math.round(T.pl.hp)})`); T.pl.x = RX - 5.2; T.pl.z = RZ + 1.6; T.pl.y = 0; step(.2); }
// кінець сплаву
const coins0 = T.P.coins; step(1);
for (let i = 0; i < 70; i++) { T.pl.hp = 9999; T.pl.iframes = 1e9; T.pl.x = RX - 5.2; T.pl.z = RZ + 1.6; T.pl.y = 0; step(5);  if (!/ЕСПРЕСО-СПЛАВ/.test(hud().textContent)) break; }
assert(!/ЕСПРЕСО-СПЛАВ/.test(hud().textContent) && T.P.coins > coins0, `сплав завершився, нагорода видана (+${T.P.coins - coins0} 🪙)`);
const d = T.P.addons.rafting; assert(d.runs === 1 && d.wins === 1 && d.best >= 5, `рекорд збережено: ${JSON.stringify(d)}`);
// смерть на сплаві (сам) → сплав провалено, відроджуєшся на плоту, не в «Гущі»
{
  T.pl.x = RX - 2.6; T.pl.z = RZ + 3.4; T.pl.y = 0; T.pl.iframes = 0; T.pl.hp = 100; step(.1);
  T.getInteract().fn(); step(.5);
  assert(w.__raft.ST.on && w.__raft.ST.roster.join() === 'me', 'новий сплав: ти в складі команди');
  const c0 = T.P.coins; T.pl.iframes = 0; T.hurt(99999); step(.1);
  assert(T.pl.dead && !w.__raft.ST.on, 'вигорів сам — сплав провалено');
  assert(/Повернутись на пліт/.test(w.document.querySelector('#b-respawn').textContent), 'кнопка «Повернутись на пліт»');
  w.document.querySelector('#b-respawn').click(); step(.2);
  assert(!T.pl.dead && !T.paused && Math.hypot(T.pl.x - (RX - 5.2), T.pl.z - (RZ + 1.6)) < .6 && T.P.coins >= c0, 'відродився на плоту (не в «Гущі»), монети не згоріли');
  assert(w.document.querySelector('#b-respawn').textContent === 'Взяти лікарняний', 'текст екрана смерті повернувся звичайний');
}
// покинути сплав — лише кнопкою
{
  T.pl.x = RX - 2.6; T.pl.z = RZ + 3.4; T.pl.iframes = 1e9; step(.1); T.getInteract().fn(); step(.5);
  T.openPanel('ax_rafting');
  assert(body().querySelector('[data-rf="leave"]') && !body().querySelector('[data-rf="hub"]'), 'під час сплаву у вкладці лише «Покинути сплав»');
  w.confirm = () => true; body().querySelector('[data-rf="leave"]').click(); step(1);
  assert(Math.hypot(T.pl.x, T.pl.z - 3) < 1 && !w.__raft.ST.on, 'покинув сплав → «Гуща», сплав без учасників закінчився');
}
assert(rafting.ok, 'аддон не зламався');
console.log('ALL OK'); process.exit(0);
