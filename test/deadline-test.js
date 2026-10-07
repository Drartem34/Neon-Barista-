// Тест режиму «Дедлайн о 18:00» v2 у грі без сервера: три поверхи хмарочоса, голосування, звіт-«гаряча картопля», вантуз.
// Запуск: node test/deadline-test.js
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
w.__ADDON_CODE = [{ id: 'deadline', src: 'deadline/addon.js', code: fs.readFileSync(path.join(root, 'addons/_examples/deadline/addon.js'), 'utf8') }];
let src = fs.readdirSync(path.join(root, 'src')).filter(f => f.endsWith('.js')).sort().map(f => fs.readFileSync(path.join(root, 'src', f), 'utf8')).join('\n');
src += ';window.__T={get paused(){return paused},get running(){return running},get P(){return P},pl,MON,PROPS,BODIES,ADDONS,ISLMAP,STATICS,startGame,frame,openPanel,closePanel,get panel(){return panel},getInteract:()=>getInteract(),terrainAt:(x,z)=>terrainAt(x,z),funSpeedMul:()=>funSpeedMul(),get MODEBAR(){return MODEBAR},keydown:c=>dispatchEvent(new KeyboardEvent("keydown",{code:c}))};';
w.eval(src);
const T = w.__T; let now = 1000;
const F = w.__deadline;
let calmZ = true;
// без випадкового хаосу, зажовувань і вибухів — тест передбачуваний; зомбі сидять на нараді
const calm = () => { if (!F) return; F.AU.chaosT = 999; F.AU.jamP = 0; F.AU.boomP = 0; F.AU.excel = 0; if (calmZ) for (const z of F.ST.zom) z.stun = 99; };
const step = s => { for (let i = 0; i < s * 60; i++) { now += 16.7; calm(); T.frame(now); if (i % 3 === 0) IV.forEach(f => f()); } };
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); process.exit(1); } console.log('ok -', m); };
const body = () => w.document.querySelector('#pbody');
const at = p => { T.pl.x = p.x; T.pl.z = p.z; T.pl.y = 0; };
const barOn = () => !!T.MODEBAR && !w.document.getElementById('modebar').hidden;
assert(T.ADDONS.list.every(a => a.ok), 'аддон завантажився: ' + T.ADDONS.list.map(a => a.name + (a.ok ? '' : ' ✗ ' + a.err)).join(', '));
assert(w.document.querySelector('#mm-deadline h2').textContent === 'ДЕДЛАЙН' && w.document.querySelector('#mm-deadline .mm-subtitle').textContent === 'О 18:00', 'у меню картка «ДЕДЛАЙН · О 18:00»');
// три поверхи: кожен — свій острів, поверх цілком у межах r, стіни й меблі тверді, усі робочі точки досяжні
assert(F.LAY.length === 3 && F.LAY.map(q => q.n).join(' | ') === 'Поверх 42 · Опенспейс | Поверх 57 · Банк | Поверх 63 · Стартап', 'три поверхи: ' + F.LAY.map(q => q.n).join(', '));
F.LAY.forEach((Lx, i) => {
  const isl = T.ISLMAP[Lx.id];
  assert(isl && isl.x === [300, 440, 580][i] && isl.z === -580, `${Lx.n}: острів на (${isl && isl.x}, ${isl && isl.z})`);
  const corners = [[-1, -1], [1, -1], [-1, 1], [1, 1]].every(([a, b]) => Math.hypot(a * (Lx.hx + .5), b * (Lx.hz + .5)) < isl.r && T.terrainAt(Lx.x + a * (Lx.hx - .5), Lx.z + b * (Lx.hz - .5)) === 'land');
  assert(corners, `${Lx.n}: поверх ${2 * Lx.hx}×${2 * Lx.hz} м разом зі склом уміщається в r=${isl.r}`);
  const st = T.STATICS.filter(o => Math.abs(o.x - Lx.x) <= Lx.hx + .5 && Math.abs(o.z - Lx.z) <= Lx.hz + .5).length;
  assert(st > 300 && Lx.walls.length > 20 && Lx.obs.length > 40, `${Lx.n}: стіни й меблі тверді (${st} статик, ${Lx.walls.length} стін)`);
  F.useVar(i);
  const pts = { START: F.START.p, SEND: F.SEND.p, PRINTER: F.PRINTER.p, COFFEE: F.COFFEE.p, ...Object.fromEntries(['staple', 'stamp', 'number', 'scan'].map(s => [s, F.STEPS[s].at.p])), tube0: F.TUBE[0].p, tube1: F.TUBE[1].p, stA: F.STAIRS.a, stB: F.STAIRS.b, ...Object.fromEntries(F.DESKS.map(d => ['desk' + d.i, d.p])), ...Object.fromEntries(F.PADS.map((p, k) => ['pad' + k, p])) };
  const bad = Object.entries(pts).filter(([, p]) => F.blocked(p.x, p.z, .3) || !F.reachable(p.x, p.z)).map(([k]) => k);
  assert(!bad.length, `${Lx.n}: усі ${Object.keys(pts).length} робочих точок вільні й досяжні${bad.length ? ' ✗ ' + bad.join(',') : ''}`);
  assert(Lx.zwp.length > 15 && F.navPath(F.START.p.x, F.START.p.z, F.PRINTER.p.x, F.PRINTER.p.z).length > 3, `${Lx.n}: зомбі мають ${Lx.zwp.length} точок блукання і шлях від ресепшну до принтера`);
});
F.useVar(0);
T.startGame(true); T.P.tut = -1; T.pl.hp = 9999; step(.3);
T.keydown('Escape'); step(.05); body().querySelector('[data-mode="deadline"]').click(); step(.5);
assert(Math.hypot(T.pl.x - F.START.p.x, T.pl.z - F.START.p.z) < 1.5 && F.L.n === 'Поверх 42 · Опенспейс', 'Esc → «Дедлайн о 18:00» переносить у хол поверху 42');
assert(F.goal().id === 'start' && w.document.getElementById('dl-intro'), 'до старту: інструкція й підказка «▶ СТАРТ»');
w.document.querySelector('#dl-intro button').click(); assert(!w.document.getElementById('dl-intro') && T.P.addons.deadline.intro2 === 1, 'інструкцію закрив — більше не показується');
step(.1); assert(/СТАРТ/.test(w.document.getElementById('deadline-goal').textContent) && /Поверх 42/.test(w.document.getElementById('deadline-hud').textContent), 'у HUD назва поверху й рядок «👉 що робити зараз»');
assert(!barOn(), 'у холі до старту — звичайний хотбар');
// стіни офісу й скляний фасад тримають
at({ x: F.L.x - 10, z: F.L.z - 1.5 }); step(.1); for (let k = 0; k < 20; k++) { T.pl.z -= .12; step(.02); }
assert(T.pl.z > F.L.z - 3 - .2, 'стіна коридору не пускає крізь себе');
at({ x: F.L.x + 18.5, z: F.L.z }); step(.1); for (let k = 0; k < 30; k++) { T.pl.x += .15; step(.02); }
assert(T.pl.x < F.L.x + 20 && T.terrainAt(T.pl.x, T.pl.z) === 'land', 'скло фасаду не дає випасти з хмарочоса');

const seen = []; let jamT = 0, boomT = 0, excelT = 0;
/* проходимо ланцюжок, слухаючись лише підказки */
const drive = (maxIt, stop) => {
  for (let k = 0; k < maxIt && F.ST.on && !(stop && stop()); k++) {
    T.pl.hp = 9999; step(.05);
    const g = F.goal(); seen.push(g.id + '@' + F.cur());
    if (F.cur() === 'print' && !jamT && !F.myHeld().it) { jamT = 1; F.chaos('jam'); assert(F.goal().id === 'jam', 'принтер зажував папір — підказка веде витягати'); continue; }
    if (g.id === 'coffee' && !boomT) { boomT = 1; F.chaos('boom'); assert(!F.ST.cm && F.goal().id === 'cm', 'кавоварка вибухнула — підказка веде лагодити'); continue; }
    if (!g.tg) { step(.3); continue; }
    at(g.tg); step(.05); at(g.tg);
    const i2 = T.getInteract(); if (!i2) { step(.2); continue; }
    i2.fn();
    for (let j = 0; j < 80 && F.V.act; j++) { const p = g.id === 'boss' ? { x: F.ST.boss.x + .3, z: F.ST.boss.z + .3 } : F.V.act.tg(); at(p); step(.1); }
    step(.15);
  }
};
// ---------- Раунд 1: поверх 42 ----------
at(F.START.p); step(.1);
let it = T.getInteract(); assert(it && /аврал/.test(it.l) && /Поверх 42/.test(it.l), 'на ресепшні F — «Почати аврал · Поверх 42»'); it.fn(); step(.2);
assert(F.ST.on && F.ST.vi === 0 && F.ST.steps[0] === 'data' && F.ST.steps[1] === 'print' && F.ST.steps[F.ST.steps.length - 1] === 'send' && F.ST.steps.length === 6, `раунд почався: ${F.ST.steps.join(' → ')}`);
assert(/17:55/.test(w.document.getElementById('deadline-hud').textContent) && /Чекліст/.test(w.document.getElementById('deadline-list').textContent), 'у HUD годинник 17:55 і чекліст');
assert(barOn() && /🪠/.test(w.document.getElementById('modebar').textContent) && /Вантуз/.test(w.document.getElementById('modebar').textContent), 'набір режиму: 🪠 Вантуз · 📘 Кинути звіт · ☕ Кава-ривок замість хотбара');
assert(F.ST.desk.filter(Boolean).length === F.ST.need && F.ST.need === 3, 'дані лежать у 3 колег');
F.ST.steps = ['data', 'print', 'staple', 'stamp', 'number', 'scan', 'sign', 'send'];   // для повного покриття — усі 5 пунктів
F.chaos('power'); assert(!F.ST.pw && F.goal().id === 'power', 'стрибок напруги: світло зникло, підказка веде до ⚡ щитка');
// ☕ кава-ривок
{ const m0 = T.funSpeedMul(); w.document.querySelector('#modebar [data-ms="2"]').click(); assert(F.V.cof === 2 && F.V.dashT > 0 && T.funSpeedMul() > m0 * 1.4, `☕ кава-ривок: швидше в ${(T.funSpeedMul() / m0).toFixed(2)} раза, лишилось 2`); }
drive(60, () => F.cur() === 'staple');
assert(F.ST.pw && F.ST.fixes >= 1, 'світло увімкнули на щитку');
assert(F.ST.fed >= 3 && F.ST.si >= 2 && jamT && !F.ST.jam, 'дані зібрано, зажований папір витягли, звіт надруковано');
assert(F.myHeld().it === 'report' && T.funSpeedMul() < .9, 'важкий звіт у руках — ходиш повільніше');
// 📘 гаряча картопля: кидаємо звіт через перегородку — падає на підлогу, підбираємо
{
  const p0 = { x: T.pl.x, z: T.pl.z }; T.pl.face = Math.atan2(F.L.x - T.pl.x, F.L.z - T.pl.z);
  w.document.querySelector('#modebar [data-ms="1"]').click(); step(.05);
  assert(F.ST.fly && !F.myHeld().it, '📘 звіт полетів дугою');
  assert(F.goal().id === 'catch', 'підказка: «Звіт летить — лови!»');
  step(2); const f = F.ST.floor.find(q => q.it === 'report');
  assert(!F.ST.fly && f && Math.hypot(f.x - p0.x, f.z - p0.z) > 4, `звіт приземлився за ${Math.hypot(f.x - p0.x, f.z - p0.z).toFixed(1)} м`);
  assert(F.goal().id === 'floor', 'підказка: підбери звіт');
  at(f); step(.05); T.getInteract().fn(); step(.1); assert(F.myHeld().it === 'report', 'звіт знову в руках');
}
// 🧟 зомбі вириває звіт і жує; 🪠 вантуз — і він випльовує
{
  calmZ = false; const z = F.ST.zom[0]; z.stun = 0; z.cd = 0; z.x = T.pl.x + .5; z.z = T.pl.z; F.ST.t = Math.max(F.ST.t, 13); step(.3);
  const ch = F.ST.zom.find(q => q.carry && q.carry.it === 'report');
  assert(!F.myHeld().it && ch, 'зомбі-офісник вирвав звіт');
  const h0 = F.ST.rhp; step(1); assert(F.ST.rhp < h0 && F.ST.pf === 0, `зомбі жує звіт: цілість ${Math.round(F.ST.rhp)}%`);
  assert(F.goal().id === 'chew' && /ЖУЮТЬ/.test(w.document.getElementById('deadline-hud').textContent), 'підказка й HUD: зомбі жує звіт — лупи вантузом');
  at({ x: ch.x - 3, z: ch.z }); T.pl.face = Math.PI / 2; step(.02); for (const q of F.ST.zom) if (q !== ch) q.stun = 99;
  w.document.querySelector('#modebar [data-ms="0"]').click(); step(.8);
  assert(!ch.carry && ch.stun > 0 && F.ST.floor.some(f => f.it === 'report'), '🪠 вантуз присмоктався — зомбі виплюнув звіт');
  calmZ = true; step(.05);
  const f = F.ST.floor.find(q => q.it === 'report'); at(f); step(.05); T.getInteract().fn(); step(.1);
  assert(F.myHeld().it === 'report' && F.ST.rhp < 100, `звіт підібрали (погризений, ${Math.round(F.ST.rhp)}%)`);
}
// з'їли звіт — передрук
{
  const si0 = F.ST.si; calmZ = false; const z = F.ST.zom[0]; z.stun = 0; z.cd = 0; z.x = T.pl.x + .5; z.z = T.pl.z; step(.3); F.ST.rhp = 3; step(.8); calmZ = true;
  assert(F.cur() === 'print' && si0 > F.ST.si && F.ST.rhp === 100 && !F.ST.zom.some(q => q.carry), '🍽️ зомбі з’їв звіт: чекліст повернувся до 🖨️ друку (дані вже в принтері)');
  drive(20, () => F.myHeld().it === 'report');
  assert(F.myHeld().it === 'report', 'звіт передрукували');
}
// 📮 пневмопошта: звіт летить трубою до іншої колби
{
  const T0 = F.TUBE[0], T1 = F.TUBE[1]; at(T0.p); step(.05); it = T.getInteract(); assert(it && /пневмопоштою/.test(it.l), 'біля колби F — «Відправити пневмопоштою»'); it.fn(); step(.1);
  assert(!F.myHeld().it && F.ST.tb.length === 1, '📮 звіт у трубі');
  step(3); const f = F.ST.floor.find(q => q.it === 'report'); assert(f && Math.hypot(f.x - T1.p.x, f.z - T1.p.z) < 2, 'звіт вилетів біля другої колби');
  at(f); step(.05); T.getInteract().fn(); step(.1);
}
// 🚪 пожежні сходи — короткий шлях
{ at(F.STAIRS.a); step(.05); it = T.getInteract(); assert(it && /Пожежні сходи/.test(it.l), 'біля дверей F — «🚪 Пожежні сходи»'); it.fn(); step(.1); assert(Math.hypot(T.pl.x - F.STAIRS.b.x, T.pl.z - F.STAIRS.b.z) < .5 && F.myHeld().it === 'report', 'сходами — в інший кінець поверху разом зі звітом'); }
// 📊 колега з Excel
{ F.chaos('excel'); assert(F.ST.xl && F.goal().id !== 'excel', 'колега кличе з Excel (поки звіт у руках — пріоритет звіт)'); const c0 = F.V.cof, d = F.DESKS[F.ST.xl.i]; at(d.p); step(.05); it = T.getInteract(); assert(it && /ВПР/.test(it.l), 'біля колеги F — «Допомогти з ВПР»'); it.fn(); for (let j = 0; j < 40 && F.V.act; j++) { at(d.p); step(.1); } assert(!F.ST.xl && F.V.cof === c0 + 1, '📊 допомогли з ВПР — +1 ☕ ривок'); excelT = 1; }
drive(90);
assert(boomT && F.ST.cm, 'кавоварку полагодили');
assert(seen.includes('desk@data') && seen.includes('printer@data') && seen.includes('printer@print') && seen.includes('staple@staple') && seen.includes('stamp@stamp'), 'підказки вели: колеги → принтер → степлер → печатка');
assert(seen.includes('number@number') && seen.includes('scan@scan') && seen.includes('coffee@sign') && seen.includes('boss@sign') && seen.includes('send@send'), 'підказки вели: архів → сканер → кава → начальник → відправка');
const d = T.P.addons.deadline;
assert(!F.ST.on && d.wins === 1 && d.rounds === 1 && d.stars >= 1 && d.floors[0] === 1, `звіт здано до 18:00 на 42-му — перемога ${'⭐'.repeat(d.stars)}`);
step(.1); assert(!barOn() && !T.MODEBAR, 'раунд скінчився — звичайний хотбар повернувся (modeBar(null))');
assert(F.ST.nx === 1 && /57/.test(w.document.getElementById('deadline-hud').textContent), 'після перемоги без голосів ліфт пропонує вищий поверх 57');
// ---------- Голосування: панель 63 → раунд на стартапі ----------
{
  at(F.PADS[2]); step(.3);
  assert(F.ST.vo[2] === 1 && F.ST.nx === 2, '🗳️ став на панель «63» — голос за стартап');
  at(F.START.p); step(.1); it = T.getInteract(); assert(it && /Поверх 63/.test(it.l), 'СТАРТ показує, що раунд буде на 63-му'); it.fn(); step(.3);
  assert(F.ST.on && F.ST.vi === 2 && F.L.n === 'Поверх 63 · Стартап' && Math.hypot(T.pl.x - F.START.p.x, T.pl.z - F.START.p.z) < 1.5, '🛗 ліфт переніс на 63-й поверх — раунд почався там');
  assert(F.ST.need === 4 && F.ST.vo.join() === '0,0,0', 'складність зросла (даних 4), голоси скинуто');
  seen.length = 0; drive(140);
  assert(!F.ST.on && d.wins === 2 && d.floors[2] === 1, 'стартап: звіт здано — підказки працюють і на іншому плані');
  assert(seen.includes('desk@data') && seen.includes('send@send'), 'на 63-му підказки вели від хотдеску до мейл-руму');
}
// ---------- Банк: голос через вкладку, поразка о 18:00 ----------
{
  T.openPanel(Object.keys(T.ADDONS.tabs).find(k => /deadline/.test(k))); step(.05);
  assert(/Звітів здано: 2|звітів здано: 2/.test(body().textContent), 'вкладка «⏰ Дедлайн» показує статистику');
  body().querySelector('[data-dl="v1"]').click(); step(.05); T.closePanel(); step(.1);
  assert(F.ST.nx === 1, '🗳️ голос за банк з вкладки');
  at(F.START.p); step(.1); T.getInteract().fn(); step(.3);
  assert(F.ST.on && F.ST.vi === 1 && F.L.n === 'Поверх 57 · Банк' && Math.hypot(T.pl.x - F.START.p.x, T.pl.z - F.START.p.z) < 1.5, 'раунд у банку');
  seen.length = 0; drive(25, () => F.ST.si >= 3);
  assert(F.ST.si >= 2 && seen.includes('desk@data'), 'у банку підказки ведуть до кас і принтера бек-офісу');
  F.ST.t = F.ST.dur - 1; step(.5); assert(/17:59:5/.test(w.document.getElementById('deadline-hud').textContent), 'годинник показує 17:59:5x');
  const c0 = T.P.coins; step(1.5);
  assert(!F.ST.on && d.rounds === 3 && d.wins === 2 && T.P.coins > c0, `18:00 — дедлайн зірвано (+${T.P.coins - c0} 🪙 утішних)`);
  assert(F.goal().id === 'start' && !barOn(), 'після поразки підказка знову веде до ▶ СТАРТ, хотбар звичайний');
}
// вихід ліфтом у хаб
{ const E = F.L.exit; at(E); step(.05); it = T.getInteract(); assert(it && /хаб/.test(it.l), 'біля ліфта F — «⬇️ Ліфт у хаб»'); it.fn(); step(.5); assert(F.floorOf(T.pl.x, T.pl.z) < 0, 'ліфт відвіз у хаб'); }
console.log('ALL OK'); process.exit(0);
