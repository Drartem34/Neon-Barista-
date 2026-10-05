// Тест бета-режиму «Кавовий рейс» у грі без сервера.
// Запуск: node test/flight-test.js
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
w.__ADDON_CODE = [{ id: 'flight', src: 'flight/addon.js', code: fs.readFileSync(path.join(root, 'addons/_examples/flight/addon.js'), 'utf8') }];
let src = fs.readdirSync(path.join(root, 'src')).filter(f => f.endsWith('.js')).sort().map(f => fs.readFileSync(path.join(root, 'src', f), 'utf8')).join('\n');
src += ';window.__T={get paused(){return paused},get running(){return running},get P(){return P},pl,MON,PROPS,BODIES,ADDONS,ISLMAP,startGame,frame,openPanel,closePanel,get panel(){return panel},getInteract:()=>getInteract(),terrainAt:(x,z)=>terrainAt(x,z),nearBar:()=>nearBar(),input,renderPanel,keydown:c=>dispatchEvent(new KeyboardEvent("keydown",{code:c})),fireHook:h=>fireHook(h),releaseCarry:t=>releaseCarry(t),pickUpAny:t=>pickUpAny(t),damageProp:(p,d)=>damageProp(p,d),hurt:d=>hurtPlayer(d),dropLoot:(x,z,l)=>dropLoot(x,z,l),DROPS};';
w.eval(src);
const T = w.__T; let now = 1000;
const calm = () => { const F = w.__flight; if (F) { F.AU.stormT = 999; F.AU.failT = 999; F.ST.storms.length = 0; } };   // без випадкових гроз і поломок — тест передбачуваний
const step = s => { for (let i = 0; i < s * 60; i++) { now += 16.7; calm(); T.frame(now); if (i % 3 === 0) IV.forEach(f => f()); } };
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); process.exit(1); } console.log('ok -', m); };
const body = () => w.document.querySelector('#pbody');
assert(T.ADDONS.list.every(a => a.ok), 'аддон завантажився: ' + T.ADDONS.list.map(a => a.name + (a.ok ? '' : ' ✗ ' + a.err)).join(', '));
assert(w.document.querySelector('#mm-flight .mm-subtitle').textContent === 'Espresso Flight', 'у меню картка «РЕЙС · Espresso Flight»');
const F = w.__flight;
T.startGame(true); T.P.tut = -1; T.pl.hp = 9999; step(.3);
T.keydown('Escape'); step(.05); body().querySelector('[data-mode="flight"]').click(); step(.5);
assert(Math.abs(T.pl.x - (F.BOARD.x + .5)) < .6, 'Esc → «Кавовий рейс» переносить на борт');
// підказки
assert(F.goal().id === 'start' && w.document.getElementById('fl-intro'), 'до вильоту: інструкція й підказка «▶ СТАРТ»');
w.document.querySelector('#fl-intro button').click(); assert(!w.document.getElementById('fl-intro') && T.P.addons.flight.intro === 1, 'інструкцію закрив — більше не показується');
step(.1); assert(/СТАРТ/.test(w.document.getElementById('flight-goal').textContent), 'у HUD рядок «👉 що робити зараз»');
// посадка
T.pl.x = F.BOARD.x + .3; T.pl.z = F.BOARD.z + .6; step(.1);
let it = T.getInteract(); assert(it && /посадку/.test(it.l), 'біля дверей F — «Оголосити посадку»'); it.fn(); step(.2);
assert(F.ST.on, 'рейс вилетів');
{ const p0 = F.ST.pass[0], ap = F.ST.t; F.ST.t = 30; F.ST.pass.forEach(p => p.want = ''); p0.want = 'tea'; p0.pat = .2;
  assert(F.goal().id === 'tea', 'пасажир хоче чай — підказка веде до «🍵 Чай»');
  F.setHeld('tea'); assert(F.goal().id === 'seat', 'з чаєм у руках — веде до пасажира'); F.setHeld('');
  F.damage('hole'); assert(F.goal().id === 'hole', 'пробоїна — підказка веде латати'); F.ST.holes.length = 0; p0.want = ''; F.ST.t = ap; }
// стіни салону не випускають
T.pl.x = -30 + 6; T.pl.z = 118; step(.1); T.pl.z = 118 + 4.5; step(.1); assert(Math.abs(T.pl.z - 118) < 2.6, 'з літака не випадеш (стіни салону)');
// пілот
T.pl.x = F.COCKPIT.x - .3; T.pl.z = F.COCKPIT.z; step(.1);
it = T.getInteract(); assert(it && /штурвал/.test(it.l), 'у кабіні F — «Сісти за штурвал»'); it.fn(); step(.3);
assert(F.ST.pilot === 'me', 'ти пілот');
// крен від A/D
w.dispatchEvent(new w.KeyboardEvent('keydown', { code: 'KeyD' })); step(1.2); const r1 = F.ST.roll; w.dispatchEvent(new w.KeyboardEvent('keyup', { code: 'KeyD' }));
w.dispatchEvent(new w.KeyboardEvent('keydown', { code: 'KeyA' })); step(1.2); const r2 = F.ST.roll; w.dispatchEvent(new w.KeyboardEvent('keyup', { code: 'KeyA' }));
assert(r1 > r2 + .3, `A/D керують креном (${r1.toFixed(2)} → ${r2.toFixed(2)})`);
T.getInteract().fn(); step(.2); assert(!F.ST.pilot && F.ST.ap > 20, `встав з-за штурвала — сильний автопілот ${Math.round(F.ST.ap)} с, пілот ходить по салону`);
// двері кабіни пілота: зачинені — не пройдеш, відчинені — проходиш
{
  const walk = () => { T.pl.x = F.CK_X - .9; T.pl.z = 118; F.ST.roll = 0; step(.05); for (let k = 0; k < 20; k++) { T.pl.x += .1; T.pl.z = 118; F.ST.roll = 0; step(.02); } return T.pl.x; };
  if (F.ST.cdoor) { T.pl.x = F.CK_X - .75; T.pl.z = 118; step(.05); T.getInteract().fn(); step(.1); }
  assert(walk() < F.CK_X, 'зачинені двері кабіни не пускають до пілота');
  T.pl.x = F.CK_X - .75; T.pl.z = 118; step(.05); it = T.getInteract(); assert(it && /кабіну пілота/.test(it.l), 'F — «Відчинити двері в кабіну пілота»'); it.fn(); step(.3);
  assert(F.ST.cdoor === 1 && walk() > F.CK_X + .5, 'через відчинені двері зайшов у кабіну');
}
// пасажири хочуть — несемо
let served = 0;
for (let k = 0; k < 40 && served < 3; k++) {
  step(.5); T.pl.hp = 9999;
  const i = F.ST.pass.findIndex(p => p.want); if (i < 0) continue;
  const want = F.ST.pass[i].want, st = F.STATIONS.find(s => s.item === want);
  T.pl.x = st.x + .6; T.pl.z = st.z; F.ST.roll = 0; step(.05);
  T.getInteract().fn(); for (let j = 0; j < 30 && F.V.held !== want; j++) { T.pl.x = st.x + .6; T.pl.z = st.z; F.ST.roll = 0; F.ST.rv = 0; step(.1); }
  if (F.V.held !== want) continue;
  const s = F.SEATS[i]; T.pl.x = s.x + .2; T.pl.z = s.z - s.side * .6; F.ST.roll = 0; step(.05);
  const before = F.ST.served; it = T.getInteract(); if (it && /Подати/.test(it.l)) { it.fn(); step(.1); if (F.ST.served > before) served++; }
}
assert(served >= 3, `рознесли замовлення пасажирам: ${served}`);
// двері й крило
{
  const D = F.DOORS[1]; T.pl.x = D.x; T.pl.z = 118 + 2.6 - .4; F.ST.roll = 0; step(.1);
  let it2 = T.getInteract(); assert(it2 && /Відчинити двері/.test(it2.l), 'біля дверей F — «Відчинити двері»'); it2.fn(); step(.3);
  assert(F.ST.doors[1] === 1, 'двері відчинено');
  T.pl.z = 118 + 2.6 + .3; step(.05); T.pl.z = 118 + 2.6 + 1.5; T.pl.x = -30 + .5; step(.05);
  assert(F.where(T.pl.x, T.pl.z) === 'wing', 'вийшов на крило');
  const hp0 = T.pl.hp = 300; T.pl.iframes = 0; let blown = false;
  for (let k = 0; k < 60 && !blown; k++) { step(.2); if (F.where(T.pl.x, T.pl.z) === 'cabin' && T.pl.hp < hp0) blown = true; }
  assert(blown, 'на крилі зустрічний вітер — здуло, рятують у салон');
  T.pl.x = D.x; T.pl.z = 118 + 2.6 - .4; step(.1); T.getInteract().fn(); step(.3); assert(F.ST.doors[1] === 0, 'двері зачинено');
}
// поломки: пробоїна всмоктує, латаємо
{
  F.damage('hole'); step(.2); const h = F.ST.holes[0]; assert(h, 'блискавка пробила фюзеляж');
  const hz = 118 + h.side * 2.6; T.pl.x = h.x + 3; T.pl.z = 118; F.ST.roll = 0; step(.05); const d0 = Math.hypot(T.pl.x - h.x, T.pl.z - hz); step(1); F.ST.roll = 0;
  assert(Math.hypot(T.pl.x - h.x, T.pl.z - hz) < d0 - .3, 'пробоїна всмоктує до себе');
  T.pl.x = h.x; T.pl.z = 118 + h.side * .9; step(.05);
  let it3 = T.getInteract(); assert(it3 && /пробоїну/.test(it3.l), 'біля пробоїни F — «Залатати»'); it3.fn();
  for (let k = 0; k < 40 && F.ST.holes.length; k++) { T.pl.x = h.x; T.pl.z = 118 + h.side * .9; F.ST.roll = 0; step(.1); }
  assert(!F.ST.holes.length, 'пробоїну залатано');
}
// двигун: ремонт на крилі
{
  F.ST.eng = [1, 1]; F.damage('engine'); const i = F.ST.eng.indexOf(0); assert(i >= 0, 'двигун загорівся');
  const E = F.ENGINES[i], D = F.DOORS[i];
  T.pl.x = D.x; T.pl.z = 118 + D.side * 2.2; step(.05); T.getInteract().fn(); step(.3);
  T.pl.z = 118 + D.side * 2.9; step(.05); T.pl.z = 118 + D.side * 3.6; step(.05);
  for (let k = 0; k < 60 && !F.ST.eng[i]; k++) {
    T.pl.x = F.engFix(i).x; T.pl.z = E.z; F.ST.roll = 0; step(.05);
    const it4 = T.getInteract(); if (k === 0) assert(it4 && /двигун/.test(it4.l), 'на крилі біля двигуна F — «Полагодити»'); if (it4 && /Полагодити/.test(it4.l)) it4.fn();
    step(.1);
  }
  assert(F.ST.eng[i] === 1, 'двигун полагоджено');
  T.pl.x = D.x; T.pl.z = 118 + D.side * 3.2; step(.05); T.pl.z = 118 + D.side * 2.2; step(.05);
  if (F.ST.doors[i]) { T.getInteract().fn(); step(.2); }
}
// світло: щиток у вантажному відсіку
{
  F.damage('power'); assert(!F.ST.lights, 'зникло світло');
  T.pl.x = F.FUSE.x + .6; T.pl.z = F.FUSE.z; step(.05); T.getInteract().fn();
  for (let k = 0; k < 40 && !F.ST.lights; k++) { T.pl.x = F.FUSE.x + .6; T.pl.z = F.FUSE.z; F.ST.roll = 0; step(.1); }
  assert(F.ST.lights === 1, 'світло увімкнули на щитку');
  T.pl.x = F.BOMBS.x + .6; T.pl.z = F.BOMBS.z; step(.05); const b0 = T.P.ing.cbomb || 0; T.getInteract().fn(); step(.05);
  assert((T.P.ing.cbomb || 0) === b0 + 1, 'з вантажного відсіку взяв бомбу');
  assert(T.BODIES.filter(b => b.kind === 'chair' && Math.abs(b.hx - (-30 - 15 + 3.2)) < .1).length === 2 && T.PROPS.filter(p => p.type === 'crate' && Math.abs(p.ox - (-30 - 13)) < 2.5).length === 3, 'у вантажному відсіку 2 офісні крісла й 3 коробки');
}
// злі пасажири: терпіння закінчується
for (const p of F.ST.pass) { p.want = 'coffee'; p.pat = .01; }
step(1); assert(F.ST.pass.some(p => p.angry), 'кому не принесли — злиться');
// сильний крен розливає каву
F.setHeld('coffee'); let spilled = false;
for (const p of F.ST.pass) { p.want = ''; p.angry = 0; p.mood = .9; }
for (let k = 0; k < 80 && !spilled; k++) { F.ST.mood = .9; F.ST.roll = .95; F.ST.rv = 0; T.pl.x = 118; T.pl.x = -30; T.pl.z = 118; step(.1); if (!F.V.held) spilled = true; }
assert(spilled, 'сильний крен — кава розлилась');
// кінець рейсу: посадка
for (const p of F.ST.pass) { p.want = ''; p.angry = 0; p.mood = .9; }
F.ST.t = F.ST.dur - .5; const c0 = T.P.coins; step(1.5);
assert(!F.ST.on && T.P.coins > c0 && T.P.addons.flight.landed === 1, `посадка в «Гущі»: +${T.P.coins - c0} 🪙`);
// вихідні двері: на землі — трапом на двір, у польоті — парашут
{
  const out = () => { T.pl.x = F.EXIT.x; T.pl.z = 118 + F.EXIT.side * (2.6 - .4); step(.05); for (let k = 0; k < 30 && Math.abs(T.pl.z - 118) < 10; k++) { T.pl.z += F.EXIT.side * .1; step(.02); } step(.4); return Math.hypot(T.pl.x, T.pl.z - 3) < 1; };
  assert(!out(), 'зачинені вихідні двері не випускають');
  T.pl.x = F.EXIT.x; T.pl.z = 118 + F.EXIT.side * (2.6 - .4); step(.05); it = T.getInteract(); assert(it && /трап/.test(it.l), 'на землі F — «Відчинити вихідні двері (трап)»'); it.fn(); step(.3);
  assert(F.ST.exit === 1 && out(), 'спустився трапом — вийшов на двір («Гуща»)');
  T.keydown('Escape'); step(.05); body().querySelector('[data-mode="flight"]').click(); step(.5);
  T.pl.x = F.BOARD.x + .3; T.pl.z = F.BOARD.z + .6; step(.1); T.getInteract().fn(); step(.2); assert(F.ST.on && !F.ST.exit, 'новий рейс — вихідні двері зачинені');
  T.pl.x = F.EXIT.x; T.pl.z = 118 + F.EXIT.side * (2.6 - .4); step(.05); it = T.getInteract(); assert(it && /парашут/.test(it.l), 'у польоті F — «… стрибок із парашутом»'); it.fn(); step(.3);
  assert(out() && !F.V.joined, 'у польоті вистрибнув із парашутом у «Гущу»');
}
console.log('ALL OK'); process.exit(0);
