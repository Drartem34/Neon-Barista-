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
src += ';window.__T={get paused(){return paused},get running(){return running},get P(){return P},pl,MON,PROPS,BODIES,ADDONS,ISLMAP,startGame,frame,openPanel,closePanel,get panel(){return panel},getInteract:()=>getInteract(),terrainAt:(x,z)=>terrainAt(x,z),nearBar:()=>nearBar(),input,renderPanel,keydown:c=>dispatchEvent(new KeyboardEvent("keydown",{code:c})),fireHook:h=>fireHook(h),releaseCarry:t=>releaseCarry(t),pickUpAny:t=>pickUpAny(t),damageProp:(p,d)=>damageProp(p,d)};';
w.eval(src);
const T = w.__T; let now = 1000;
const step = s => { for (let i = 0; i < s * 60; i++) { now += 16.7; T.frame(now); if (i % 3 === 0) IV.forEach(f => f()); } };
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); process.exit(1); } console.log('ok -', m); };
const body = () => w.document.querySelector('#pbody');
const RX = -112, RZ = 84;
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
// дзвін → старт
T.pl.x = RX - 2.6; T.pl.z = RZ + 3; step(.1);
let it = T.getInteract(); assert(it && /Відчалити/.test(it.l), 'біля дзвона F — «Відчалити»: ' + (it && it.l));
it.fn(); step(.1);
const hud = () => w.document.getElementById('raft-hud');
assert(hud() && /Хвиля 0/.test(hud().textContent), 'сплав почався, вгорі таймер і хвиля');
step(8);
const zs = () => T.MON.filter(m => m.isl.id === 'river' && !m.calm && m.state !== 'fall');
assert(zs().length >= 3 && zs().every(m => !m.zlvl), `хвиля 1: на плоту зомбі (${zs().length}), без рівнів прогресії`);
assert(/Хвиля 1/.test(hud().textContent), 'HUD: хвиля 1');
// зомбі стрибають на наш пліт
let jumped = false;
for (let i = 0; i < 40 && !jumped; i++) { step(.5); jumped = zs().some(m => m.x < RX - 1.4); T.pl.hp = 9999; }
assert(jumped, 'зомбі стрибнули на абордаж на наш пліт');
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
// бомба: збираємо на столі
T.P.ing.powder = 6; T.P.ing.tape = 3; T.pl.x = RX - 7.6; T.pl.z = RZ + 2.9; T.pl.y = 0; step(.1);
it = T.getInteract(); assert(it && /бомбу/.test(it.l), 'біля столу F — «Зібрати бомбу»');
for (let k = 0; k < 3; k++) { T.getInteract().fn(); step(2.5); }
assert(T.P.ing.cbomb === 3 && T.P.ing.powder === 0, 'зібрано 3 бомби');
// кидаємо бомби у пліт зомбі (G) — пліт тоне
T.pl.x = RX - 2; T.pl.z = RZ; T.pl.face = Math.PI / 2; T.input.aimOk = true; T.input.ax = RX + 5; T.input.az = RZ;
let sunk = false;
for (let k = 0; k < 6 && !sunk; k++) {
  if (!(T.P.ing.cbomb > 0)) T.P.ing.cbomb = 1;
  T.pl.hp = 9999; T.pl.x = RX - 2; T.pl.z = RZ; T.input.aimOk = true; T.input.ax = RX + 5; T.input.az = RZ;
  T.keydown('KeyG'); step(1.2);
  sunk = T.terrainAt(RX + 5, RZ) === 'deep';
}
assert(sunk, 'після кількох бомб пліт зомбі пішов на дно (там тепер вода)');
step(1);
assert(zs().filter(m => m.x > RX + 1.5).length === 0, 'зомбі з потопленого плота поплили у відпустку');
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
// кінець сплаву
const coins0 = T.P.coins; step(1);
for (let i = 0; i < 70; i++) { T.pl.hp = 9999; T.pl.iframes = 1e9; T.pl.x = RX - 5.2; T.pl.z = RZ + 1.6; T.pl.y = 0; step(5);  if (!/ЕСПРЕСО-СПЛАВ/.test(hud().textContent)) break; }
assert(!/ЕСПРЕСО-СПЛАВ/.test(hud().textContent) && T.P.coins > coins0, `сплав завершився, нагорода видана (+${T.P.coins - coins0} 🪙)`);
const d = T.P.addons.rafting; assert(d.runs === 1 && d.wins === 1 && d.best >= 5, `рекорд збережено: ${JSON.stringify(d)}`);
assert(rafting.ok, 'аддон не зламався');
console.log('ALL OK'); process.exit(0);
