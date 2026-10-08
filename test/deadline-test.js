// Тест режиму «Дедлайн о 18:00» v3 у грі без сервера: три поверхи хмарочоса, голосування, звіт-«гаряча картопля», вантуз,
// саботажник і нарада, літачки й агресія колег, пожежа серверної, вогнегасник, кулер-пастка, Румба, молотов.
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
src += ';window.__T={get paused(){return paused},get running(){return running},get P(){return P},pl,MON,PROPS,BODIES,ADDONS,ISLMAP,STATICS,startGame,frame,openPanel,closePanel,get panel(){return panel},getInteract:()=>getInteract(),terrainAt:(x,z)=>terrainAt(x,z),funSpeedMul:()=>funSpeedMul(),get MODEBAR(){return MODEBAR},keydown:c=>dispatchEvent(new KeyboardEvent("keydown",{code:c})),mount:b=>mount(b),dismount:p=>dismount(p)};';
w.eval(src);
const T = w.__T; let now = 1000;
const F = w.__deadline;
let calmZ = true;
// без випадкового хаосу, зажовувань і вибухів — тест передбачуваний; зомбі сидять на нараді
const calm = () => { if (!F) return; F.AU.chaosT = 999; F.AU.jamP = 0; F.AU.boomP = 0; F.AU.excel = 0; F.AU.sbT = 999; if (calmZ) for (const z of F.ST.zom) z.stun = 99; };
const step = s => { for (let i = 0; i < s * 60; i++) { now += 16.7; calm(); T.frame(now); if (i % 3 === 0) IV.forEach(f => f()); } };
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); process.exit(1); } console.log('ok -', m); };
const body = () => w.document.querySelector('#pbody');
const at = p => { T.pl.x = p.x; T.pl.z = p.z; T.pl.y = 0; };
const lob = () => w.document.getElementById('mlobby');
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
  const pts = { START: F.START.p, SEND: F.SEND.p, PRINTER: F.PRINTER.p, COFFEE: F.COFFEE.p, ...Object.fromEntries(['staple', 'stamp', 'number', 'scan'].map(s => [s, F.STEPS[s].at.p])), tube0: F.TUBE[0].p, tube1: F.TUBE[1].p, stA: F.STAIRS.a, stB: F.STAIRS.b, ...Object.fromEntries(F.DESKS.map(d => ['desk' + d.i, d.p])) };
  const bad = Object.entries(pts).filter(([, p]) => F.blocked(p.x, p.z, .3) || !F.reachable(p.x, p.z)).map(([k]) => k);
  assert(!bad.length, `${Lx.n}: усі ${Object.keys(pts).length} робочих точок вільні й досяжні${bad.length ? ' ✗ ' + bad.join(',') : ''}`);
  assert(Lx.zwp.length > 15 && F.navPath(F.START.p.x, F.START.p.z, F.PRINTER.p.x, F.PRINTER.p.z).length > 3, `${Lx.n}: зомбі мають ${Lx.zwp.length} точок блукання і шлях від ресепшну до принтера`);
});
F.useVar(0);
T.startGame(true); T.P.tut = -1; T.pl.hp = 9999; step(.3);
T.keydown('Escape'); step(.05); body().querySelector('[data-mode="deadline"]').click(); step(.5);
assert(Math.hypot(T.pl.x - F.START.p.x, T.pl.z - F.START.p.z) < 1.5 && F.L.n === 'Поверх 42 · Опенспейс', 'Esc → «Дедлайн о 18:00» переносить у хол поверху 42');
assert(F.goal().id === 'start' && w.document.getElementById('dl-intro'), 'до старту: інструкція й підказка про лобі');
assert(lob() && lob().querySelectorAll('[data-lv]').length === 3 && /Поверх 57 · Банк/.test(lob().textContent) && lob().querySelector('.rdy'), '🗳️ вхід у режим — відкрилось вікно лобі: 3 картки поверхів і «Я готовий»');
assert([...lob().querySelectorAll('.map')].every((e, i) => e.innerHTML.includes(`addons/deadline/map${i + 1}.jpg`)), 'у картках — картинки addons/deadline/map1..3.jpg');
assert(!F.LAY.some(q => q.pads || q.v.pads) && F.L.lifts.length === 3 && !('PADS' in F), 'панелей голосування на підлозі більше немає');
w.document.querySelector('#dl-intro button').click(); assert(!w.document.getElementById('dl-intro') && T.P.addons.deadline.intro2 === 1, 'інструкцію закрив — більше не показується');
step(.1); assert(/Я готовий/.test(w.document.getElementById('deadline-goal').textContent) && /Поверх 42/.test(w.document.getElementById('deadline-hud').textContent), 'у HUD назва поверху й рядок «👉 що робити зараз»');
assert(!barOn(), 'у холі до старту — звичайний хотбар');
// стіни офісу й скляний фасад тримають
at({ x: F.L.x - 10, z: F.L.z - 1.5 }); step(.1); for (let k = 0; k < 20; k++) { T.pl.z -= .12; step(.02); }
assert(T.pl.z > F.L.z - 3 - .2, 'стіна коридору не пускає крізь себе');
at({ x: F.L.x + 18.5, z: F.L.z }); step(.1); for (let k = 0; k < 30; k++) { T.pl.x += .15; step(.02); }
assert(T.pl.x < F.L.x + 20 && T.terrainAt(T.pl.x, T.pl.z) === 'land', 'скло фасаду не дає випасти з хмарочоса');
// назва кімнати ховається, поки стоїш у ній (інші — видно), і повертається, коли виходиш
{
  const RL = F.V.rl, of = (vi, n) => RL.filter(e => e.vi === vi && e.n === n);
  assert(F.LAY.every((q, i) => RL.some(e => e.vi === i)), `таблички кімнат зареєстровані на всіх поверхах (${RL.length})`);
  const kit = of(0, 'КУХНЯ'), srv = of(0, 'СЕРВЕРНА');
  assert(kit.length && srv.length && kit.concat(srv).every(e => e.m.visible && e.m.material.opacity > .5), 'спершу видно «КУХНЯ» і «СЕРВЕРНА»');
  at({ x: F.L.x + 9, z: F.L.z + 5 }); step(.06);
  assert(F.V.inRoom && F.V.inRoom.n === 'КУХНЯ' && kit.every(e => e.m.material.opacity > 0 && e.m.material.opacity < e.o), 'зайшов на кухню — табличка гасне плавно');
  step(.3);
  assert(kit.every(e => !e.m.visible && e.m.material.opacity < .01) && srv.every(e => e.m.visible && e.m.material.opacity === e.o), 'на кухні «КУХНЯ» сховано, «СЕРВЕРНА» видно');
  at({ x: F.L.x, z: F.L.z - 8 }); step(.35);
  assert(kit.every(e => e.m.visible && Math.abs(e.m.material.opacity - e.o) < 1e-6) && srv.every(e => !e.m.visible), 'перейшов у серверну — «КУХНЯ» знову видно, «СЕРВЕРНА» сховано');
  at(F.START.p); step(.35);
  assert(RL.filter(e => e.vi === 0 && e.n !== 'РЕСЕПШН').every(e => e.m.visible), 'на ресепшні видно всі інші таблички');
}

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
// «Сховати» — вікно зникає, підказка веде до стійки «🗳️ ЛОБІ», там F відкриває його знову
lob().querySelector('.hide').click(); step(.1);
assert(!lob() && F.V.lobHide && /F/.test(w.document.getElementById('deadline-goal').textContent) && F.goal().tg, '«Сховати» — лобі закрилось, підказка: F біля стійки «🗳️ ЛОБІ»');
at(F.START.p); step(.1);
let it = T.getInteract(); assert(it && /Лобі/.test(it.l) && /Поверх 42/.test(it.l), 'на ресепшні F — «🗳️ Лобі · Поверх 42»'); it.fn(); step(.1);
assert(lob() && !F.V.lobHide, 'F біля стійки — вікно лобі знову відкрите');
assert(/Ти/.test(lob().querySelector('.who').textContent) && /⏳/.test(lob().querySelector('.who').textContent), 'у списку гравців — «⏳ Ти»');
lob().querySelector('.rdy').click(); step(.2);
assert(F.ST.on && F.ST.vi === 0 && F.ST.steps[0] === 'data' && F.ST.steps[1] === 'print' && F.ST.steps[F.ST.steps.length - 1] === 'send' && F.ST.steps.length === 6, `раунд почався: ${F.ST.steps.join(' → ')}`);
assert(!lob(), 'раунд почався — вікно лобі закрилось');
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
// ---------- Голосування у вікні лобі: картка 63 → раунд на стартапі ----------
{
  step(.1); assert(lob(), 'після раунду вікно лобі відкрилось знову');
  lob().querySelector('[data-lv="0"]').click(); step(.2);
  assert(F.ST.vo.join() === '1,0,0' && F.ST.nx === 0 && lob().querySelector('[data-lv="0"]').classList.contains('mine'), '🗳️ клік по картці 42 — голос (лічильник 1, картка позначена)');
  F.lobbyDef().onVote(2); step(.2);
  assert(F.ST.vo.join() === '0,0,1' && F.ST.nx === 2 && /🗳️ 1/.test(lob().querySelector('[data-lv="2"]').textContent), '🗳️ передумав — голос за стартап (рахує автор раунду)');
  at(F.START.p); step(.1); it = T.getInteract(); assert(it && /Поверх 63/.test(it.l), 'стійка лобі показує, що раунд буде на 63-му');
  lob().querySelector('.rdy').click(); step(.3);
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
  assert(!lob(), 'поки відкрита вкладка — вікно лобі не заважає');
  F.lobbyDef().onHide(); step(.05);   // сховане вікно відкриває кнопка у вкладці
  T.openPanel(Object.keys(T.ADDONS.tabs).find(k => /deadline/.test(k))); step(.05);
  body().querySelector('[data-dl="lobby"]').click(); step(.1);
  assert(!T.panel && lob() && !F.V.lobHide, 'кнопка «🗳️ Лобі» у вкладці відкриває вікно лобі');
  lob().querySelector('[data-lv="1"]').click(); step(.1);
  assert(F.ST.nx === 1, '🗳️ голос за банк у вікні лобі');
  lob().querySelector('.rdy').click(); step(.3);
  assert(F.ST.on && F.ST.vi === 1 && F.L.n === 'Поверх 57 · Банк' && Math.hypot(T.pl.x - F.START.p.x, T.pl.z - F.START.p.z) < 1.5, 'раунд у банку');
  seen.length = 0; drive(25, () => F.ST.si >= 3);
  assert(F.ST.si >= 2 && seen.includes('desk@data'), 'у банку підказки ведуть до кас і принтера бек-офісу');
  F.ST.t = F.ST.dur - 1; step(.5); assert(/17:59:5/.test(w.document.getElementById('deadline-hud').textContent), 'годинник показує 17:59:5x');
  const c0 = T.P.coins; step(1.5);
  assert(!F.ST.on && d.rounds === 3 && d.wins === 2 && T.P.coins > c0, `18:00 — дедлайн зірвано (+${T.P.coins - c0} 🪙 утішних)`);
  step(.1); assert(F.goal().id === 'start' && !barOn() && lob(), 'після поразки — знову лобі, хотбар звичайний');
}
// ---------- v3: саботажник, ✈️ літачки й 😤 агресія колег, 🔥 пожежа серверної, 🧯 вогнегасник, 🚰 кулер-пастка, 🤖 Румба, 🍾 молотов ----------
{
  lob().querySelector('[data-lv="0"]').click(); step(.1); lob().querySelector('.rdy').click(); step(.3);
  assert(F.ST.on && F.ST.vi === 0, 'v3: новий раунд на 42-му');
  const ms = w.document.getElementById('modebar');
  assert(ms.querySelectorAll('[data-ms]').length === 7 && ['🪠', '📘', '☕', '✈️', '🧯', '🍾', '🚨'].every(ic => ms.textContent.includes(ic)), 'набір режиму: 🪠 📘 ☕ ✈️ 🧯 🍾 🚨 (7 слотів)');
  assert(F.ST.sk === 'n' && /^npc:\d$/.test(F.AU.sab) && F.ST.sh && !JSON.stringify(F.ST.sh).includes(F.AU.sab) && !F.V.sab, `офлайн саботажник — колега-NPC (${F.NAMES[+F.AU.sab.slice(4)]}); у стані лише хеш`);
  const rc = w.document.getElementById('dl-role'); assert(rc && rc.dataset.role === 'crew' && /сумлінний/.test(rc.textContent), 'картка ролі: «👔 Ти — сумлінний працівник»');
  for (const z of F.ST.zom) { z.x = F.L.x + 17.5; z.z = F.L.z; }   // зомбі — в кінець коридору, щоб не заважали
  // ✈️ літачок у колегу → шкала агресії → 😤 «зайобуючий»
  const D4 = F.DESKS[4], cp = F.colPos(4);
  for (let n = 0; n < 3; n++) { at({ x: cp.x + 2.5, z: cp.z }); T.pl.face = -Math.PI / 2; step(.05); w.document.querySelector('#modebar [data-ms="3"]').click(); step(.7);
    if (n === 0) { assert(F.ST.ag[4] >= 39 && F.V.pp === 5 && F.ST.lit.length >= 1, `✈️ літачок влучив у ${F.NAMES[4]}: агресія ${Math.round(F.ST.ag[4])}%, папірець на підлозі`); assert(w.document.querySelector('.dl-ag'), 'над колегою — шкала агресії'); } }
  const P0 = F.pestOf(4);
  assert(P0 && P0.want >= 1 && P0.want <= 3 && F.V.pp === 3, `третій літачок — ${F.NAMES[4]} став «зайобуючим» (хоче ${P0 && F.CUPS[P0.want].ic})`);
  step(.05); assert(F.V.cols[4].h.root.visible === false && [...w.document.querySelectorAll('.dl-agw')].some(e => e.textContent.includes(F.CUPS[P0.want].ic)), 'стілець порожній, над «зайобуючим» — яку каву він хоче');
  // ланцюгова реакція
  F.ST.ag[3] = 90; const c3 = F.colPos(3); P0.x = c3.x + .8; P0.z = c3.z + .3; P0.stun = 0; at({ x: F.L.x + 10, z: F.L.z }); step(2);
  assert(F.pestOf(3), `ланцюгова реакція: «зайобуючий» поруч — ${F.NAMES[3]} теж закипів`);
  for (const q of F.ST.pst) q.stun = 99;
  // він чіпляється до гравця
  { const q = F.pestOf(3); q.stun = 0; q.cd = 0; at({ x: F.L.x - 6, z: F.L.z }); q.x = T.pl.x + .7; q.z = T.pl.z; step(.15);
    assert(q.cd > 3 && (F.V.stunT > 0 || F.V.slowT > 0 || Math.hypot(T.pl.kx || 0, T.pl.kz || 0) > 1), '😤 «зайобуючий» чіпляється: заговорює / загороджує / ставить підніжку');
    let stole = false; for (let n = 0; n < 25 && !stole; n++) { F.ST.held.me = { it: 'sheets', n: 2, cup: 0 }; q.cd = 0; q.stun = 0; q.x = T.pl.x + .7; q.z = T.pl.z; step(.1); stole = !F.myHeld().it && q.cn === 2; }
    assert(stole, '😤 поцупив у гравця 📄 дані');
    q.stun = 99; F.V.stunT = 0; F.V.slowT = 0; }
  // ☕ не та кава — бурчить; та — заспокоївся, дані повертаються
  {
    const q = F.pestOf(3), brew = () => { at(F.COFFEE.p); step(.05); const i = T.getInteract(); i.fn(); for (let j = 0; j < 40 && F.V.act; j++) { at(F.COFFEE.p); step(.1); } step(.1); };
    brew(); assert(F.myHeld().cup === 1, '☕ на кавоварці — еспресо');
    while (F.myHeld().cup === q.want) brew();
    const wrong = F.myHeld().cup; at({ x: F.L.x - 6, z: F.L.z }); q.x = T.pl.x + .8; q.z = T.pl.z; step(.05);
    let it3 = T.getInteract(); assert(it3 && /не те/.test(it3.l), 'біля «зайобуючого» з не тією кавою — «не те!»'); it3.fn(); step(.1);
    assert(F.pestOf(3) && !F.myHeld().cup, `${F.CUPS[wrong].ic} не та кава — розлив, а він досі злий`);
    brew(); for (let n = 0; n < 3 && F.myHeld().cup !== q.want; n++) { at(F.COFFEE.p); step(.05); const i = T.getInteract(); assert(/Перелити/.test(i.l), '🔄 F ще раз — «Перелити»'); i.fn(); for (let j = 0; j < 20 && F.V.act; j++) step(.1); step(.1); }
    assert(F.myHeld().cup === q.want, `переливали, поки не стало ${F.CUPS[q.want].n}`);
    assert(F.goal().id === 'pest', 'підказка: неси каву «зайобуючому»');
    at({ x: F.L.x - 6, z: F.L.z }); q.x = T.pl.x + .8; q.z = T.pl.z; step(.05); it3 = T.getInteract(); assert(/саме/.test(it3.l), 'F — «Пригостити — саме те!»'); it3.fn(); step(.1);
    assert(!F.pestOf(3) && F.ST.ag[3] === 0 && F.ST.floor.some(f => f.it === 'sheets'), `${F.NAMES[3]} заспокоївся, кинув поцуплені дані`);
    step(.05); assert(F.V.cols[3].h.root.visible, 'і повернувся за стіл');
  }
  // ✈️ у ПК → 🔥 пожежа серверної → 🧯 гасимо
  {
    F.AU.pcP = 1; const d2 = F.DESKS[2]; at({ x: d2.x, z: F.L.z + 2.6 }); T.pl.face = 0; step(.05); F.V.ppCd = 0; w.document.querySelector('#modebar [data-ms="3"]').click(); step(.6);
    assert(F.AU.spamT > 0 || F.ST.fire > 0, '✈️ літачок у ПК — той заспамив серверну'); step(3.2);
    assert(F.ST.fire > 0, `🔥 серверна горить (${Math.round(F.ST.fire)}%)`);
    const f0 = F.ST.fire; step(1); assert(F.ST.fire > f0, 'вогонь повільно розгоряється');
    F.ST.fire = 60; assert(F.goal().id === 'fire', 'підказка веде гасити серверну');
    T.pl.hp = 100; at(F.fireC()); step(.8); assert(T.pl.hp < 100, `у вогні пече: ${T.pl.hp} HP`); T.pl.hp = 9999;
    const C = F.fireC(); at({ x: C.x + 2.2, z: C.z + 1 }); step(.05);
    let it4 = T.getInteract(); assert(it4 && /Гасити/.test(it4.l), 'біля вогню F — «🧯 Гасити пожежу»');
    const fx0 = F.ST.fixes; for (let n = 0; n < 5 && F.ST.fire > 0; n++) { at({ x: C.x + 2.2, z: C.z + 1 }); step(.05); T.getInteract().fn(); step(.7); }
    assert(F.ST.fire === 0 && F.ST.fixes > fx0 && F.V.ext < 100, `🧯 пожежу загашено (заряд ${Math.round(F.V.ext)}%)`);
    at(F.VALVE.p); step(.05); it4 = T.getInteract(); assert(/Заправити/.test(it4.l), 'біля вентиля — «🧯 Заправити»'); it4.fn(); assert(F.V.ext === 100, 'вогнегасник заправлено');
  }
  // 🧯 відкидає зомбі; 🧯 у кріслі — реактивний ривок
  {
    calmZ = false; const z = F.ST.zom[0]; at({ x: F.L.x - 6, z: F.L.z }); z.x = T.pl.x + 2; z.z = T.pl.z; z.stun = 0; T.pl.face = Math.PI / 2; step(.02);
    w.document.querySelector('#modebar [data-ms="4"]').click(); step(.1);
    assert(z.x > T.pl.x + 3.5 && z.stun > 0, `🧯 піна відкинула зомбі на ${(z.x - T.pl.x - 2).toFixed(1)} м і оглушила`); calmZ = true;
    const ch = T.BODIES.find(b => b.kind === 'chair' && Math.hypot(b.x - F.L.x, b.z - F.L.z) < 25); assert(ch, 'на поверсі є крісла на коліщатках');
    at(ch); T.mount(ch); T.pl.face = 0; step(.05); F.V.exCd = 0; w.document.querySelector('#modebar [data-ms="4"]').click();
    assert(ch.vz < -10, `🧯 у кріслі: реактивний ривок назад (${ch.vz.toFixed(1)} м/с)`); step(.5); T.dismount(false); step(.1);
  }
  // 🚰 кулер-пастка: калюжа сповільнює зомбі; подовжувач — ⚡ електропастка оглушує всіх у ній
  {
    at(F.COOLER.p); step(.05); let it5 = T.getInteract(); assert(it5 && /Копнути кулер/.test(it5.l), 'біля кулера F — «🦶 Копнути кулер»'); it5.fn(); step(.1);
    const Pd = F.ST.pud; assert(Pd && Math.hypot(Pd.x - F.COOLER.pc.x, Pd.z - F.COOLER.pc.z) < .1, '💦 калюжа біля кулера');
    calmZ = false; const z = F.ST.zom[1]; z.x = Pd.x - 1.3; z.z = Pd.z; z.stun = 0; step(.02);
    at({ x: Pd.x + 1.1, z: Pd.z + .4 }); step(.05); it5 = T.getInteract(); assert(it5 && /подовжувач/.test(it5.l) && /стоїш у ній/.test(it5.l), 'у калюжі F — «🔌 подовжувач» (з попередженням)'); it5.fn(); step(.15);
    assert(F.ST.pud.el && z.stun >= 3 && F.V.stunT > 2 && T.funSpeedMul() < .1, '⚡ електропастка: зомбі й сам гравець оглушені');
    calmZ = true; step(6); assert(!F.ST.pud, 'пастка вигоріла — калюжі нема');
    for (const q of F.ST.zom) { q.x = F.L.x + 17.5; q.z = F.L.z; }
    at({ x: F.COOLER.o.x - 3, z: F.COOLER.o.z }); T.pl.face = Math.PI / 2; step(.05); F.V.ppCd = 0; F.V.stunT = 0; w.document.querySelector('#modebar [data-ms="3"]').click(); step(.6);
    assert(F.ST.pud, '✈️ літачок у кулер — теж калюжа'); F.ST.pud = null;
  }
  // 🤖 Румба прибирає папірці; з молотовом — у натовп зомбі
  {
    const R = F.ST.rb; assert(R && !R.dead, '🤖 Румба їздить поверхом');
    R.x = F.L.x - 2; R.z = F.L.z; R.path = null; F.ST.lit.push({ id: 9e5, x: F.L.x + .5, z: F.L.z }); step(4);
    assert(!F.ST.lit.some(l => l.id === 9e5), '🤖 Румба прибрала папірець');
    at(R); step(.05); const it6 = T.getInteract(); assert(it6 && /молотов/.test(it6.l), 'біля Румби F — «🍾 Примотати молотов»'); it6.fn(); step(.1);
    assert(R.arm === 1 && F.V.mol === 1, '🍾 молотов примотано (лишився 1)');
    const zs = F.ST.zom.slice(0, 2); zs.forEach((z, k) => { z.x = F.L.x + 10 + k * .6; z.z = F.L.z; }); step(8);
    assert(R.dead > 0 && zs.every(z => z.stun > 0) && (F.ST.burn.length || F.ST.lit.length), '🤖💥 Румба-камікадзе доїхала до зомбі й вибухнула');
  }
  // 🍾 молотов — палаюча калюжа
  {
    F.ST.burn.length = 0; calmZ = false; const z = F.ST.zom[0]; at({ x: F.L.x - 8, z: F.L.z }); z.x = T.pl.x + 5; z.z = T.pl.z; z.stun = 0; T.pl.face = Math.PI / 2; step(.02);
    w.document.querySelector('#modebar [data-ms="5"]').click(); assert(F.V.mol === 0 && F.ST.mo.length === 1, '🍾 молотов летить'); step(1.2);
    assert(F.ST.burn.length && z.stun > 0, '🔥 палаюча калюжа оглушила зомбі'); calmZ = true;
    F.ST.burn.length = 0;
  }
  // 🕵️ саботажник: гравцем (перевірка картки й дії), а потім — колега-NPC, свідки й 🚨 нарада
  {
    const sab0 = F.AU.sab, sh0 = F.ST.sh, sk0 = F.ST.sk;
    F.AU.sab = 'me'; F.ST.sk = 'p'; F.ST.sh = [F.ST.sh[0], F.hashS(F.ST.sh[0] + 'me')]; F.V.roleRid = -1; step(.1);
    assert(F.V.sab && w.document.getElementById('dl-role').dataset.role === 'sab' && /САБОТАЖНИК/.test(w.document.getElementById('dl-role').textContent), '🕵️ картка «Ти — САБОТАЖНИК» (хеш збігся з моїм іменем)');
    assert(/🕵️/.test(w.document.querySelector('#modebar [data-ms="6"]').textContent) && /саботажник/.test(w.document.getElementById('deadline-goal').textContent), 'у саботажника 7-й слот — 🕵️ Саботаж і підказка внизу');
    at(F.RACK.p); step(.05); w.document.querySelector('#modebar [data-ms="6"]').click(); for (let j = 0; j < 40 && F.V.act; j++) { at(F.RACK.p); step(.1); } step(.1);
    assert(F.ST.fire > 0 && F.V.sbcd > 10, '🕵️ саботажник тихо підпалив серверну, перезарядка');
    F.ST.fire = 0; F.AU.sab = sab0; F.ST.sh = sh0; F.ST.sk = sk0; F.V.roleRid = F.ST.rid; step(.1); F.V.wasSab = false;
    assert(!F.V.sab && /🚨/.test(w.document.querySelector('#modebar [data-ms="6"]').textContent), 'знову звичайний працівник — слот 🚨 Нарада');
    const si = +sab0.slice(4); let ok = false; for (let n = 0; n < 10 && !ok; n++) ok = F.botSabotage();
    assert(ok && F.ST.clr.length >= 2 && !F.ST.clr.includes(si), `🕵️ колега-саботажник нашкодив; свідки дали алібі: ${F.ST.clr.map(i => F.NAMES[i]).join(', ')}`);
    F.ST.fire = 0; F.ST.jam = 0; F.ST.cm = 1; F.ST.pw = 1; F.ST.rain = 0; if (F.ST.rb) F.ST.rb.arm = 0;
    w.document.querySelector('#modebar [data-ms="6"]').click(); step(.1);
    const mt = w.document.getElementById('dl-meet');
    assert(F.ST.mt && mt && mt.style.display !== 'none' && mt.querySelectorAll('[data-mv]').length === F.DESKS.length + 1 && F.V.mc === 0, '🚨 нарада: вікно з 8 колегами + «Пропустити»');
    assert(F.goal().txt.includes('Нарада'), 'підказка: голосуй');
    const zx = F.ST.zom.map(z => z.x); step(.5); assert(F.ST.zom.every((z, k) => z.x === zx[k]), 'під час наради зомбі завмерли');
    const inn = F.DESKS.map(d => d.i).find(i => i !== si && !F.pestOf(i)); const t0 = F.ST.t;
    mt.querySelector(`[data-mv="${inn}"]`).click(); step(.2);
    assert(!F.ST.mt && F.pestOf(inn) && !F.ST.sbC, `проголосували за невинного ${F.NAMES[inn]} — він образився і став 😤`);
    w.document.querySelector('#modebar [data-ms="6"]').click(); step(.1); assert(!F.ST.mt, 'вдруге нараду не скликати');
    F.AU.mc = {}; F.AU.mtCd = 0; F.V.mc = 1; w.document.querySelector('#modebar [data-ms="6"]').click(); step(.1);
    const dur0 = F.ST.dur; w.document.querySelector(`#dl-meet [data-mv="${si}"]`).click(); step(.2);
    assert(F.ST.sbC === 1 && F.ST.dur === dur0 + 20 && /спіймано/.test(w.document.getElementById('deadline-hud').textContent), `🕵️ спіймали саботажника ${F.NAMES[si]}: +20 с до дедлайну`);
    const c0 = T.P.coins; F.ST.t = F.ST.dur - .3; step(1);
    assert(!F.ST.on && T.P.addons.deadline.caught === 1 && T.P.coins - c0 >= 40 + 10, `раунд скінчився: +40 🪙 за спійманого саботажника (+${T.P.coins - c0})`);
    assert(!F.ST.pst.length && !F.ST.ag.some(Boolean) && !F.ST.burn.length, 'після раунду «зайобуючі» повернулись за столи, вогонь згас');
    step(.1); assert(!F.V.sab && !T.MODEBAR, 'після раунду — звичайний хотбар');
  }
}
// вихід ліфтом у хаб
{ const E = F.L.exit; at(E); step(.05); it = T.getInteract(); assert(it && /хаб/.test(it.l), 'біля ліфта F — «⬇️ Ліфт у хаб»'); it.fn(); step(.5); assert(F.floorOf(T.pl.x, T.pl.z) < 0 && !lob(), 'ліфт відвіз у хаб — вікно лобі закрилось'); }
console.log('ALL OK'); process.exit(0);
