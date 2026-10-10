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
src += ';window.__T={mount:b=>mount(b),dismount:p=>dismount(p),get BODIES(){return BODIES},get ADDONS(){return ADDONS},get paused(){return paused},get running(){return running},get P(){return P},pl,MON,PROPS,BODIES,ADDONS,ISLMAP,STATICS,startGame,frame,openPanel,closePanel,get panel(){return panel},getInteract:()=>getInteract(),terrainAt:(x,z)=>terrainAt(x,z),funSpeedMul:()=>funSpeedMul(),get MODEBAR(){return MODEBAR},keydown:c=>dispatchEvent(new KeyboardEvent("keydown",{code:c})),mount:b=>mount(b),dismount:p=>dismount(p)};';
w.eval(src);
const T = w.__T; let now = 1000;
w.__deadlineFastLobby = 1;   // лобі заповнюється ботами кроками по 0,2 с (у грі — 4 с і далі кожні 2,5 с)
const F = w.__deadline;
let calmZ = true, calmB = true, keepRoles = false;
// без випадкового хаосу, зажовувань і вибухів — тест передбачуваний; зомбі сидять на нараді
const calm = () => { if (!F) return; F.AU.chaosT = 999; F.AU.jamP = 0; F.AU.boomP = 0; F.AU.excel = 0; F.AU.sbT = 999; F.AU.botAI = calmB ? 0 : 1; if (!keepRoles && (F.AU.sec || F.AU.int)) F.setRoles('', ''); if (calmZ) for (const z of F.ST.zom) z.stun = 99; };
const step = s => { for (let i = 0; i < s * 60; i++) { now += 16.7; calm(); T.frame(now); if (i % 3 === 0) IV.forEach(f => f()); } };
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); process.exit(1); } console.log('ok -', m); };
const body = () => w.document.querySelector('#pbody');
const at = p => { T.pl.x = p.x; T.pl.z = p.z; T.pl.y = 0; };
const lob = () => w.document.getElementById('mlobby');
const TL = []; { const box = w.document.getElementById('toasts'), _a = box.appendChild.bind(box); box.appendChild = el => { TL.push(el.textContent); return _a(el); }; }
const toasts = () => TL.join('\n');
const readyGo = () => { lob().querySelector('.rdy').click(); for (let i = 0; i < 40 && !F.ST.on; i++) step(.1); };
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
w.document.querySelector('#dl-intro button').click(); assert(!w.document.getElementById('dl-intro') && T.P.addons.deadline.intro5 === 1, 'інструкцію закрив — більше не показується');
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
let mgN = 0;
const drive = (maxIt, stop) => {
  for (let k = 0; k < maxIt && F.ST.on && !(stop && stop()); k++) {
    T.pl.hp = 9999; step(.05);
    const g = F.goal(); seen.push(g.id + '@' + F.cur());
    if (F.cur() === 'print' && !jamT && !F.myHeld().it) { jamT = 1; F.chaos('jam'); assert(F.goal().id === 'jam', 'принтер зажував папір — підказка веде витягати'); continue; }
    if (g.id === 'coffee' && !boomT) { boomT = 1; F.chaos('boom'); assert(!F.ST.cm && F.goal().id === 'cm', 'кавоварка вибухнула — підказка веде лагодити'); continue; }
    if (!g.tg) { step(.3); continue; }
    at(g.tg); step(.05); at(g.tg);
    const i2 = T.getInteract(); if (!i2) { step(.2); continue; }
    i2.fn(); if (F.V.mg) { mgN++; F.miniWin(); }   // 🎮 міні-гра (кабелі принтера / набір слова / щиток) — «пройдено»
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
lob().querySelector('.rdy').click(); step(.1);
assert(!F.ST.on && F.ST.fo && /Чекаємо гравців 1\/5 — боти доповнять лобі/.test(lob().textContent) && /✅ Ти/.test(lob().querySelector('.who').textContent), '«Я готовий» — раунд НЕ стартує одразу: «Чекаємо гравців 1/5 — боти доповнять лобі…»');
step(.25);
assert(!F.ST.on && F.ST.bt.length >= 1 && /✅ 🤖 Бот /.test(lob().querySelector('.who').textContent) && /🤖 Бот \S+ приєднався до лобі/.test(toasts()) && /🤖 Бот \S+ приєднався · \d\/5/.test(lob().textContent), `бот прийшов у лобі: ${F.ST.bt.map(b => b.n).join(', ')} (у списку ✅, тост, «приєднався · N/5»)`);
for (let i = 0; i < 30 && F.ST.cd < 0 && !F.ST.on; i++) step(.05);
assert(!F.ST.on && F.ST.bt.length === 4 && F.ST.cd > 0 && /Усі на місці — старт за/.test(lob().textContent) && lob().querySelectorAll('.who i').length === 5, 'лобі заповнилось: 1 людина + 4 боти, «Усі на місці — старт за …»');
const botNames = F.ST.bt.map(b => b.n).join();
assert(F.V.bm && F.V.bm.size === 4 && [...F.V.bm.values()].every(m => m.h.root.visible), 'боти стоять у холі біля стійки лобі (моделі з антенами)');
for (let i = 0; i < 20 && !F.ST.on; i++) step(.1);
assert(F.ST.on && F.ST.vi === 0 && F.ST.steps[0] === 'data' && F.ST.steps[1] === 'print' && F.ST.steps[F.ST.steps.length - 1] === 'send' && F.ST.steps.length === 6, `раунд почався: ${F.ST.steps.join(' → ')}`);
assert(!lob(), 'раунд почався — вікно лобі закрилось');
assert(F.ST.bt.map(b => b.n).join() === botNames && F.ST.bt.length === 4, `у раунді ті самі боти, що заповнили лобі: ${botNames}`);
assert(/17:53/.test(w.document.getElementById('deadline-hud').textContent) && F.ST.dur === 420 && /Чекліст/.test(w.document.getElementById('deadline-list').textContent), 'у HUD годинник 17:53 (раунд 7 хв) і чекліст');
assert(barOn() && /🪠/.test(w.document.getElementById('modebar').textContent) && /Вантуз/.test(w.document.getElementById('modebar').textContent), 'набір режиму: 🪠 Вантуз · 📘 Кинути звіт · ☕ Кава-ривок замість хотбара');
assert(F.ST.desk.filter(Boolean).length === F.ST.need && F.ST.need === 3, 'дані лежать у 3 колег');
F.ST.steps = ['data', 'print', 'staple', 'stamp', 'number', 'scan', 'sign', 'send'];
F.setRoles('', ''); step(.05);   // без таємних ролей — темп передбачуваний (ролі перевіряємо окремо)   // для повного покриття — усі 5 пунктів
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
{ F.chaos('excel'); assert(F.ST.xl && F.goal().id !== 'excel', 'колега кличе з Excel (поки звіт у руках — пріоритет звіт)'); const c0 = F.V.cof, d = F.DESKS[F.ST.xl.i]; at(d.p); step(.05); it = T.getInteract(); assert(it && /ВПР/.test(it.l), 'біля колеги F — «Допомогти з ВПР»'); it.fn(); { const inp = w.document.getElementById('dl-mg-in'); assert(F.V.mg && F.V.mg.kind === 'type' && inp && /ВПР/.test(w.document.getElementById('dl-mini').textContent), '🎮 міні-гра ПК: «⌨️ Набери слово ВПР»'); inp.value = 'впр'; inp.dispatchEvent(new w.Event('input')); } step(.2); assert(!F.V.mg && !F.ST.xl && F.V.cof === c0 + 1, '📊 набрав «ВПР» — допомогли з Excel, +1 ☕ ривок'); excelT = 1; }
drive(90, () => F.ST.rd);
assert(boomT && F.ST.cm, 'кавоварку полагодили');
assert(seen.includes('desk@data') && seen.includes('printer@data') && seen.includes('printer@print') && seen.includes('staple@staple') && seen.includes('stamp@stamp'), 'підказки вели: колеги → принтер → степлер → печатка');
assert(seen.includes('number@number') && seen.includes('scan@scan') && seen.includes('coffee@sign') && seen.includes('boss@sign') && seen.includes('send@send'), 'підказки вели: архів → сканер → кава → начальник → відправка');
// v6: чекліст закрито — раунд НЕ кінчається: «Звіт готовий — тепер знайдіть саботажника!», додаток до звіту, до 18:00
assert(F.ST.on && F.ST.rd === 1 && F.ST.rdn === 1 && /додаток до звіту/.test(toasts()), 'звіт відправлено — раунд триває: «Звіт готовий — тепер знайдіть саботажника!»');
assert(F.ST.steps.length > 8 && F.ST.steps[F.ST.steps.length - 1] === 'send' && F.cur() === 'data' && F.ST.need === 2, `додаток до звіту: ще ${F.ST.steps.length - F.ST.si} кроків (${F.ST.steps.slice(F.ST.si).join(' → ')})`);
step(1); assert(F.ST.on, 'гра йде далі після здачі звіту');
// 🧱 спринт у стіну 2 с (ривки щочверть секунди, бафф швидкості) — лишаєшся по свій бік (раніше пролітав крізь ланцюжок кружечків-статиків)
{
  const cx = F.L.x, cz = F.L.z; at({ x: F.START.p.x, z: F.START.p.z }); step(.1);
  const x0 = T.pl.x, z0 = T.pl.z; T.keydown('KeyW'); step(.15); w.dispatchEvent(new w.KeyboardEvent("keyup", { code: 'KeyW' })); step(.3);
  let mx = T.pl.x - x0, mz = T.pl.z - z0; const ml = Math.hypot(mx, mz); mx /= ml; mz /= ml;
  const segs = F.L.walls.map(s => ({ ax: cx + s[0], az: cz + s[1], bx: cx + s[2], bz: cz + s[3] })).filter(s => { const l = Math.hypot(s.bx - s.ax, s.bz - s.az); return l >= 3 && Math.abs(((s.bx - s.ax) * mx + (s.bz - s.az) * mz) / l) < .15; })
    .filter(s => { const px = (s.ax + s.bx) / 2 - mx * .75, pz = (s.az + s.bz) / 2 - mz * .75; return F.floorOf(px, pz) >= 0 && Math.abs(px - cx) < F.L.hx - 1 && Math.abs(pz - cz) < F.L.hz - 1; });
  assert(segs.length >= 2, `є стіни поперек руху (${segs.length})`);
  let thru = 0;
  for (const sg of segs.slice(0, 4)) {
    const mx0 = (sg.ax + sg.bx) / 2, mz0 = (sg.az + sg.bz) / 2;
    at({ x: mx0 - mx * .75, z: mz0 - mz * .75 }); step(.05); 
    T.keydown('KeyW'); let px = T.pl.x, pz = T.pl.z, crossed = false;
    const X = (ax, az, bx, bz, cx2, cz2, dx2, dz2) => { const d = (bx - ax) * (dz2 - cz2) - (bz - az) * (dx2 - cx2); if (Math.abs(d) < 1e-9) return false; const t = ((cx2 - ax) * (dz2 - cz2) - (cz2 - az) * (dx2 - cx2)) / d, u = ((cx2 - ax) * (bz - az) - (cz2 - az) * (bx - ax)) / d; return t > 0 && t <= 1 && u >= 0 && u <= 1; };
    if (process.env.RIDE) { const ch = T.BODIES.filter(b => b.kind === 'chair' && !b.fall).sort((p, q) => Math.hypot(p.x - T.pl.x, p.z - T.pl.z) - Math.hypot(q.x - T.pl.x, q.z - T.pl.z))[0]; ch.x = T.pl.x; ch.z = T.pl.z; T.mount(ch); }
    for (let f = 0; f < 120; f++) {   // 2 с: біг + ривок щочверть секунди; перевіряємо кожен кадр, чи не перетнули саме цю стіну
      if (f % 15 === 0) { T.pl.st = 999; T.pl.charges = 9; T.pl.buffs.speed = 9; F.V.dashT = 4; T.keydown('ShiftLeft'); w.dispatchEvent(new w.KeyboardEvent('keyup', { code: 'ShiftLeft' })); }
      const FD = +(process.env.FD || 16.7); now += FD; calm(); T.frame(now); IV.forEach(f => f()); if (X(px, pz, T.pl.x, T.pl.z, sg.ax, sg.az, sg.bx, sg.bz)) crossed = true; px = T.pl.x; pz = T.pl.z;
    }
    w.dispatchEvent(new w.KeyboardEvent('keyup', { code: 'KeyW' })); if (T.pl.ride) T.dismount(T.pl); step(.05);
    if (crossed) thru++;
  }
  assert(!thru, `спринт і ривки в стіну 2 с — гравець по свій бік (${Math.min(4, segs.length)} стін, пролетів: ${thru})`);
}
F.ST.t = F.ST.dur; step(.3);   // ⏩ 18:00
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
  readyGo();
  assert(F.ST.on && F.ST.vi === 2 && F.L.n === 'Поверх 63 · Стартап' && Math.hypot(T.pl.x - F.START.p.x, T.pl.z - F.START.p.z) < 1.5, '🛗 ліфт переніс на 63-й поверх — раунд почався там');
  assert(F.ST.need === 4 && F.ST.vo.join() === '0,0,0', 'складність зросла (даних 4), голоси скинуто');
  seen.length = 0; drive(140, () => F.ST.rd); assert(F.ST.on && F.ST.rd, 'стартап: звіт готовий, раунд триває до 18:00'); F.ST.t = F.ST.dur; step(.3);
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
  // справжній темп (без тестового гачка): перший бот через ~4 с, далі кожні 2,5 с, потім відлік 3…2…1
  w.__deadlineFastLobby = 0; lob().querySelector('.rdy').click(); step(3.5);
  assert(!F.ST.on && F.ST.fo && F.ST.bt.length === 0, 'звичайний темп: 3,5 с — ботів ще нема');
  step(1); assert(F.ST.bt.length === 1, 'на 4-й секунді прийшов перший бот');
  step(7.6); assert(F.ST.bt.length === 4 && F.ST.cd > 0 && !F.ST.on, '~11,5 с — лобі повне, іде відлік');
  step(3.2); assert(F.ST.on, 'після «старт за 3…2…1» раунд почався');
  w.__deadlineFastLobby = 1;
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
  lob().querySelector('[data-lv="0"]').click(); step(.1); readyGo();
  assert(F.ST.on && F.ST.vi === 0, 'v3: новий раунд на 42-му');
  const ms = w.document.getElementById('modebar');
  assert(ms.querySelectorAll('[data-ms]').length === 8 && ['🪠', '📘', '☕', '✈️', '🧻', '🧯', '🍾', '🚨'].every(ic => ms.textContent.includes(ic)), 'набір режиму: 🪠 📘 ☕ ✈️ 🧻 🧯 🍾 🚨 (8 слотів, клавіші 1–8)');
  assert(F.ST.sk === 'n' && /^npc:\d$/.test(F.AU.sab) && F.ST.sh && !JSON.stringify(F.ST.sh).includes(F.AU.sab) && !F.V.sab, `офлайн саботажник — колега-NPC (${F.NAMES[+F.AU.sab.slice(4)]}); у стані лише хеш`);
  const rc = w.document.getElementById('dl-role'); assert(rc && rc.dataset.role === 'crew' && /сумлінний/.test(rc.textContent), 'картка ролі: «👔 Ти — сумлінний працівник»');
  for (const z of F.ST.zom) { z.x = F.L.x + 17.5; z.z = F.L.z; }   // зомбі — в кінець коридору, щоб не заважали
  // ✈️ 📘 🧻 — де брати: видимі лотки, шафи й смітники на кожному поверсі
  assert(F.LAY.every(q => ['pp', 'bk', 'pb'].every(k => q.pk.filter(s => s.k === k).length >= 2)), 'на кожному поверсі ≥2 лотки з папером, ≥2 книжкові шафи, ≥2 смітники: ' + F.LAY.map(q => q.pk.map(s => s.k).join('')).join(' / '));
  assert(F.LAY.every((q, i) => { F.useVar(i); const ok = q.pk.every(s => !F.blocked(s.x, s.z, .4) && F.reachable(s.x, s.z)); return ok; }) && (F.useVar(0), true), 'усі місця видачі вільні й досяжні');
  assert(F.V.pp === 2 && F.V.bk === 0 && F.V.pb === 3, 'на старті: ✈️ 2 · 📘 0 · 🧻 3');
  step(.05);
  { const L_ = [...w.document.querySelectorAll('.dl-lbl')].filter(e => e.style.display !== 'none').map(e => e.textContent);
    assert(['Папір для літачків', 'Книжкова шафа', 'Смітник'].every(t => L_.some(x => x.includes(t))), 'над місцями видачі — підписи «✈️ Папір для літачків», «📘 Книжкова шафа», «🧻 Смітник»'); }
  assert(/📘 0 — книжки — у книжковій шафі.*\d+ м/.test(w.document.getElementById('deadline-goal').textContent) && /де: шафа/.test(ms.querySelector('[data-ms="1"]').textContent), 'книжок 0 — у підказці «📘 0 — книжки — у книжковій шафі ↗ N м», на слоті «де: шафа»');
  TL.length = 0; ms.querySelector('[data-ms="1"]').click(); assert(/де взяти: книжкові шафи/.test(toasts()), 'порожній слот 📘 — тост, де взяти');
  { const off = F.L.pk.filter(q => !F.pkOn(q)); assert(off.length === 3, '🎲 цього раунду 3 місця видачі «порожні» (розклад тасується)'); F.ST.s5.pka = null; }   // далі — усі місця видачі активні (як у v4)
  { const sp = F.L.pk.find(s => s.k === 'pp' && F.pkOn(s)); at(sp); step(.05); it = T.getInteract();
    assert(it && /F — скласти літачок \(\+3\)/.test(it.l), 'біля лотка з папером F — «скласти літачок (+3)»'); it.fn(); assert(F.V.pp === 5, '✈️ +3 → 5');
    it = T.getInteract(); assert(it && /порожньо/.test(it.l), 'лоток «перезаряджається» кілька секунд'); }
  { const sb = F.L.pk.find(s => s.k === 'bk' && F.pkOn(s)); at(sb); step(.05); it = T.getInteract();
    assert(it && /F — взяти книжку \(\+2\)/.test(it.l), 'біля книжкової шафи F — «взяти книжку (+2)»'); it.fn(); step(.05); assert(F.V.bk === 2 && !/📘 0/.test(w.document.getElementById('deadline-goal').textContent), '📘 +2, підказка про книжки зникла'); }
  // ✈️ літачок у колегу → шкала агресії → 😤 «зайобуючий»
  const D4 = F.DESKS[4], cp = F.colPos(4);
  for (let n = 0; n < 3; n++) { at({ x: cp.x + 2.5, z: cp.z }); T.pl.face = -Math.PI / 2; step(.05); w.document.querySelector('#modebar [data-ms="3"]').click(); step(.7);
    if (n === 0) { assert(F.ST.ag[4] >= 39 && F.V.pp === 4 && F.ST.lit.length >= 1, `✈️ літачок влучив у ${F.NAMES[4]}: агресія ${Math.round(F.ST.ag[4])}%, папірець на підлозі`); assert(w.document.querySelector('.dl-ag'), 'над колегою — шкала агресії'); } }
  const P0 = F.pestOf(4);
  assert(P0 && P0.want >= 1 && P0.want <= 3 && F.V.pp === 2, `третій літачок — ${F.NAMES[4]} став «зайобуючим» (хоче ${P0 && F.CUPS[P0.want].ic})`);
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
    w.document.querySelector('#modebar [data-ms="5"]').click(); step(.1);
    assert(z.x > T.pl.x + 3.5 && z.stun > 0, `🧯 піна відкинула зомбі на ${(z.x - T.pl.x - 2).toFixed(1)} м і оглушила`); calmZ = true;
    const ch = T.BODIES.find(b => b.kind === 'chair' && Math.hypot(b.x - F.L.x, b.z - F.L.z) < 25); assert(ch, 'на поверсі є крісла на коліщатках');
    at(ch); T.mount(ch); T.pl.face = 0; step(.05); F.V.exCd = 0; w.document.querySelector('#modebar [data-ms="5"]').click();
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
    w.document.querySelector('#modebar [data-ms="6"]').click(); assert(F.V.mol === 0 && F.ST.mo.length === 1, '🍾 молотов летить'); step(1.2);
    assert(F.ST.burn.length && z.stun > 0, '🔥 палаюча калюжа оглушила зомбі'); calmZ = true;
    F.ST.burn.length = 0;
  }
  // 🧻 «папірець у смітник» здалеку і 📘 книжка по зомбі, що жує звіт
  {
    const bin = F.L.pk.find(s => s.k === 'pb' && F.pkOn(s)); let p = null;
    for (let k = 0; k < 24 && !p; k++) { const a = k / 24 * Math.PI * 2, q = { x: bin.o.x + Math.sin(a) * 6, z: bin.o.z + Math.cos(a) * 6 }; if (!F.blocked(q.x, q.z, .4) && F.reachable(q.x, q.z)) p = q; }
    for (const z of F.ST.zom) { z.x = F.START.p.x; z.z = F.START.p.z; }   // зомбі не на лінії кидка
    at(p); T.pl.face = Math.atan2(bin.o.x - p.x, bin.o.z - p.z); step(.05);
    const c0 = T.P.coins, ms = w.document.getElementById('modebar');
    ms.querySelector('[data-ms="4"]').click();
    assert(F.ST.th.length === 1 && F.ST.th[0].w === 'pb' && F.V.pb === 2, '🧻 мʼятий папір летить дугою (клавіша 5)');
    step(.3); assert(F.V.m3.th.size === 1, 'у польоті видно папірець і мітку, куди впаде'); step(1);
    assert(!F.ST.th.length && T.P.coins > c0 && F.V.binN === 1 && T.P.addons.deadline.bins === 1, `🗑️ папірець у смітник з ~6 м: +${T.P.coins - c0} 🪙`);
    calmZ = false; const z = F.ST.zom[0]; let zp = null;
    for (let k = 0; k < 24 && !zp; k++) { const a = k / 24 * Math.PI * 2, q = { x: p.x + Math.sin(a) * 4, z: p.z + Math.cos(a) * 4 }; if (!F.blocked(q.x, q.z, .4) && F.reachable(q.x, q.z)) zp = q; }
    z.x = zp.x; z.z = zp.z; z.stun = 0; z.cd = 9; z.carry = { it: 'report', n: 1 }; T.pl.face = Math.atan2(zp.x - p.x, zp.z - p.z);
    ms.querySelector('[data-ms="1"]').click();
    assert(F.ST.th.length === 1 && F.ST.th[0].w === 'bk' && F.V.bk === 1, '📘 книжка летить у зомбі (клавіша 2, руки вільні)');
    step(1.2);
    assert(z.stun > 0 && !z.carry && F.ST.floor.some(f => f.it === 'report'), '📘 БАЦ — зомбі оглушено, звіт випав на підлогу');
    F.ST.floor.length = 0; calmZ = true;
  }
  // 🤖 боти з лобі працюють у раунді: лагодять щиток, носять дані в принтер
  {
    calmB = false; TL.length = 0;
    F.chaos('power'); F.AU.pwT = 99; at(F.START.p);
    for (let i = 0; i < 300 && !F.ST.pw; i++) step(.1);
    assert(F.ST.pw && /Світло увімкнули — 🤖 /.test(toasts()), '🤖 бот сам дійшов до щитка й увімкнув світло');
    if (F.cur() === 'data') {
      F.ST.t = Math.max(F.ST.t, 20); const fed0 = F.ST.fed;
      for (let i = 0; i < 300 && F.ST.fed === fed0; i++) step(.1);
      assert(F.ST.fed > fed0 && /🤖 \S+ поклав дані в принтер/.test(toasts()), '🤖 бот забрав дані в колеги й поклав у принтер' + (F.ST.fed > fed0 ? '' : ' ✗ ' + JSON.stringify([F.ST.fed, F.ST.desk, F.ST.t, F.ST.bt.map(b => [b.n, b.job, b.it, +b.x.toFixed(2), +b.z.toFixed(2), b.stk])])));
    }
    calmB = true;
  }
  // ---------- v5: ⚡ щиток, 📦 коробки, 🧽 калюжі, 🛡️/🧑‍🎓 ролі, 🔥 аврал, розклад раунду ----------
  {
    const S5 = F.ST.s5; assert(S5 && S5.btn.length === 3 && S5.sec && S5.doc.length === 2 && (!S5.pka || S5.pka.length < F.L.pk.length) && F.ST.bx && F.ST.mp5.length >= 1 && F.ST.shc.length >= F.DESKS.length, `🎲 розклад раунду: 3 червоні кнопки, пост охорони (${S5.sec.n}), 2 архівні шафи, коробки ${F.ST.bx.a.n} → ${F.ST.bx.b.n}, ${F.ST.mp5.length} калюж, місця видачі тасуються`);
    // ⚡ блекаут: папери стоять; наодинці — міні-гра «3 перемикачі»
    calmB = true; F.chaos('power'); step(.1);
    assert(!F.ST.pw && +w.document.getElementById('dl-dark').style.opacity > .5, '⚡ блекаут: темрява з ліхтариком');
    { const fed0 = F.ST.fed; F.ST.held.me = { it: 'sheets', n: 1, cup: 0 }; F.req('feed'); step(.05); assert(F.ST.fed === fed0 && /Темно/.test(toasts()), '⚡ у темряві папери не працюють (принтер не бере дані)'); F.ST.held = {}; }
    at(F.PANEL.p); step(.05); it = T.getInteract(); assert(it && /3 перемикачі/.test(it.l), 'біля щитка наодинці: F — «⚡ 3 перемикачі (міні-гра)»'); it.fn();
    { const M = F.V.mg; assert(M && M.kind === 'sw', 'вікно щитка з порядком перемикачів'); w.document.querySelector(`#dl-mini [data-mg="${M.seq[1]}"]`).click(); assert(F.V.mg && F.V.mg.i === 0, 'не той перемикач — усе спочатку');
      for (const a of M.seq.slice()) w.document.querySelector(`#dl-mini [data-mg="${a}"]`).click(); }
    step(.1); assert(F.ST.pw && !F.V.mg, '💡 перемикачі в правильному порядку — світло є');
    // 📦 коробки: з А в Б, з коробкою повільніше
    { const B = F.ST.bx, m0 = T.funSpeedMul(); at(B.a); step(.05); it = T.getInteract(); assert(it && /Взяти коробку/.test(it.l), '📦 у зоні А F — «Взяти коробку»'); it.fn(); step(.05);
      assert(B.cb.includes('me') && T.funSpeedMul() < m0 * .7, '📦 коробка в руках — ходиш повільніше'); assert(F.goal().id === 'box', 'підказка веде в зону Б');
      at(B.b); step(.05); it = T.getInteract(); it.fn(); step(.05); assert(B.done === 1 && !B.cb.length, '📦 1/3 — коробку поставлено в зоні Б');
      const d0 = F.ST.dur; for (let n = 0; n < 2; n++) { at(B.a); step(.05); T.getInteract().fn(); at(B.b); step(.05); T.getInteract().fn(); step(.05); }
      assert(B.done === 3 && F.ST.dur === d0 + 25, '📦 усі 3 коробки — +25 с до дедлайну'); }
    // 🧽 калюжа кави
    { const q = F.ST.mp5[0], d0 = F.ST.dur; at(q); step(.05); it = T.getInteract(); assert(it && /Помити підлогу/.test(it.l), '🧽 біля калюжі F — «Помити підлогу»'); it.fn();
      for (let j = 0; j < 40 && F.V.act; j++) { at(q); step(.1); } assert(!F.ST.mp5.includes(q) && F.ST.dur === d0 + 4, '🧽 чисто: +4 с'); }
    // 🛡️ безпековик: таємна перевірка колеги; 🧑‍🎓 стажер: ×2 довше й імунітет до першого звинувачення
    keepRoles = true; F.setRoles('me', ''); F.V.roleRid = -1; step(.1);
    assert(F.V.role === 'sec' && /БЕЗПЕКОВИК/.test(w.document.getElementById('dl-role').textContent) && /Безпековик/.test(w.document.getElementById('dl-secret').textContent), '🛡️ картка ролі «Ти ще й БЕЗПЕКОВИК» і приватна панель');
    { const i = F.DESKS.map(d => d.i).find(j => !F.pestOf(j)); at(F.colPos(i)); step(.05); it = T.getInteract(); assert(it && /Перевірити/.test(it.l), `🛡️ біля ${F.NAMES[i]} F — «Перевірити»`); TL.length = 0; it.fn(); step(.1);
      assert(/Результат бачиш лише ти/.test(toasts()) && !F.V.chk && F.AU.chkU, '🛡️ результат перевірки — лише тобі, раз за раунд'); }
    F.setRoles('', 'me'); F.ST.held = {}; F.ST.cm = 1; step(.1); { at(F.COFFEE.p); step(.05); const i2 = T.getInteract(); i2.fn(); assert(F.V.role === 'int' && F.V.act && F.V.act.need === 5, '🧑‍🎓 стажер варить каву вдвічі довше (5 с)'); F.V.act = null; }
    F.setRoles('', ''); keepRoles = false; step(.05);
    // 🔥 аврал за 2 хв до 18:00
    { const z0 = F.ST.zom.length, t0 = F.ST.t; F.ST.t = F.ST.dur - 119; step(.1);
      assert(F.ST.av && F.ST.zom.length >= Math.min(12, z0 + 2) && +w.document.getElementById('dl-avral').style.opacity > 0 && /АВРАЛ/.test(w.document.getElementById('deadline-hud').textContent), '🔥 АВРАЛ: червона рамка, більше зомбі, у HUD «🔥 АВРАЛ»');
      F.ST.t = t0; F.ST.av = 0; F.AU.av = 0; F.ST.zom.splice(z0); }
  }
  // 🕵️ саботажник: гравцем (перевірка картки й дії), а потім — колега-NPC, свідки й 🚨 нарада
  {
    const sab0 = F.AU.sab, sh0 = F.ST.sh, sk0 = F.ST.sk;
    F.AU.sab = 'me'; F.ST.sk = 'p'; F.ST.sh = [F.ST.sh[0], F.hashS(F.ST.sh[0] + 'me')]; F.V.roleRid = -1; step(.1);
    assert(F.V.sab && w.document.getElementById('dl-role').dataset.role === 'sab' && /САБОТАЖНИК/.test(w.document.getElementById('dl-role').textContent), '🕵️ картка «Ти — САБОТАЖНИК» (хеш збігся з моїм іменем)');
    assert(/🕵️/.test(w.document.querySelector('#modebar [data-ms="7"]').textContent) && /саботажник/.test(w.document.getElementById('deadline-goal').textContent), 'у саботажника 8-й слот — 🕵️ Саботаж і підказка внизу');
    at(F.RACK.p); step(.05); w.document.querySelector('#modebar [data-ms="7"]').click(); for (let j = 0; j < 40 && F.V.act; j++) { at(F.RACK.p); step(.1); } step(.1);
    assert(F.ST.fire > 0 && F.V.sbcd > 10, '🕵️ саботажник тихо підпалив серверну, перезарядка');
    // v5: саботаж лишив докази — 👣 сліди, 🪪 журнал бейджів серверної, 📹 запис камери з кольором сорочки
    assert(F.ST.cl.some(q => q.k === 'foot') && F.ST.cl.some(q => q.k === 'badge') && F.ST.cam.length && /сорочці/.test(F.ST.cam[0].txt) && F.AU.sp >= 2 && F.AU.st.me.s === 1, '🔎 після підпалу: 👣 сліди, 🪪 журнал бейджів, 📹 запис камери; очки саботажу');
    { const ft = F.ST.cl.find(q => q.k === 'foot'), n0 = ft.pts.length; at({ x: F.RACK.p.x + 3, z: F.RACK.p.z + 1 }); step(2.5); assert(ft.pts.length > n0, `👣 сліди тягнуться за саботажником (${ft.pts.length} відбитків)`); }
    // 💻 злам сервера — міні-гра зі стрілками
    F.ST.fire = 0; F.V.sbcd = 0; F.AU.sbcd = {}; F.ST.heat = 0; at(F.RACK.p); step(.05); it = T.getInteract();
    assert(it && /Зламати сервер/.test(it.l), 'саботажник біля сервера: F — «💻 Зламати сервер (міні-гра)»'); it.fn();
    { const M = F.V.mg; assert(M && M.kind === 'seq' && /Злам сервера/.test(w.document.getElementById('dl-mini').textContent), '💻 вікно зламу з послідовністю стрілок'); for (const a of M.seq.slice()) w.document.querySelector(`#dl-mini [data-mg="${a}"]`).click(); }
    step(.1); assert(!F.V.mg && F.ST.heat === 1 && F.AU.sp >= 5, '💻 сервер зламано: перегрів, +3 очки саботажу');
    // 🗂️ документи: шредер (тихо, міні-гра) — лишається паперова локшина
    { F.V.sbcd = 0; F.AU.sbcd = {}; const d = F.ST.s5.doc[1], t0 = F.ST.t; at(d); step(.05); it = T.getInteract(); assert(it && /Знищити документи/.test(it.l), '🗂️ біля архівної шафи F — «Знищити документи (🔥 чи 🗜️)»'); it.fn();
      F.miniWin('shred'); assert(F.V.mg && F.V.mg.kind === 'shred', 'обрав 🗜️ шредер — міні-гра ← →'); F.miniWin(); step(.1);
      assert(F.ST.t >= t0 + 11 && F.ST.cl.some(q => q.k === 'strip'), '🗜️ документи знищено: −12 с, лишилась паперова локшина'); }
    // 🪑 рідкісне таємне завдання: 5 м на кріслі (крісло не зливається в статику — видно під вершником)
    { F.ST.co = 1; const B = T.BODIES.find(b => b.kind === 'chair' && F.floorOf(b.x, b.z) === F.ST.vi && !b.fall);
      assert(B && T.ADDONS.dyn.includes(B.m), '🪑 модель крісла — динамічна (не зливається в статику)');
      at(B); T.mount(B); step(.05); assert(F.V.rideSit === 1, '🪑 сидиш у кріслі (поза «сидячи»)');
      for (let i = 0; i < 40 && F.ST.co !== 2; i++) { B.vx = 6 * Math.sin(i * .7); B.vz = 6 * Math.cos(i * .7); step(.1); }
      assert(F.ST.co === 2 && /Таємне завдання виконано/.test(toasts()), `🪑 накатав ${F.V.chM.toFixed(1)} м — таємне завдання виконано, +5 очок`);
      T.dismount(false); step(.05); assert(!F.V.rideSit, 'встав з крісла — звичайна поза'); }
    F.ST.fire = 0; F.AU.sab = sab0; F.ST.sh = sh0; F.ST.sk = sk0; F.V.roleRid = F.ST.rid; step(.1); F.V.wasSab = false;
    assert(!F.V.sab && /🚨/.test(w.document.querySelector('#modebar [data-ms="7"]').textContent), 'знову звичайний працівник — слот 🚨 Нарада');
    const si = +sab0.slice(4); let ok = false; for (let n = 0; n < 10 && !ok; n++) ok = F.botSabotage();
    assert(ok && F.ST.clr.length >= 2 && !F.ST.clr.includes(si), `🕵️ колега-саботажник нашкодив; свідки дали алібі: ${F.ST.clr.map(i => F.NAMES[i]).join(', ')}`);
    F.ST.fire = 0; F.ST.jam = 0; F.ST.cm = 1; F.ST.pw = 1; F.ST.rain = 0; F.ST.heat = 0; if (F.ST.rb) F.ST.rb.arm = 0;
    // 🔎 докази колеги-саботажника: F — у справу; 📹 пост охорони — записи камер
    { const n0 = F.ST.cs.length; for (const q of F.ST.cl.slice().reverse()) { for (const p of q.pts || [q]) { const pp = Array.isArray(p) ? { x: p[0], z: p[1] } : p; at(pp); step(.05); at(pp); it = T.getInteract(); if (it && /Зібрати доказ/.test(it.l)) break; } if (it && /Зібрати доказ/.test(it.l)) break; }
      assert(it && /Зібрати доказ/.test(it.l), `біля доказу F — «${it && it.l}»`); it.fn(); step(.1); assert(F.ST.cs.length === n0 + 1 && /у справу/.test(toasts()), `🗂️ у справі: ${F.ST.cs[F.ST.cs.length - 1].txt}`); }
    { at(F.ST.s5.sec); step(.05); it = T.getInteract(); assert(it && /Пост охорони/.test(it.l), '📹 пост охорони: F — переглянути записи камер'); it.fn(); step(.1); assert(F.ST.cs.some(q => /^📹/.test(q.txt)) && /Записи камер/.test(toasts()), '📹 записи камер додано у справу'); }
    w.document.querySelector('#modebar [data-ms="7"]').click(); step(.1);
    let mt = w.document.getElementById('dl-meet'); const MP = F.mpos();
    assert(F.ST.mt && F.ST.mt.ph === 'go' && (!mt || mt.style.display === 'none') && F.goal().id === 'meet' && /Негайно в переговорну/.test(F.goal().txt) && F.V.mc === 0, `🚨 збори: «Негайно в переговорну!» (${MP.n}) — стрілка туди, 20 с`);
    at(MP); step(.3);
    mt = w.document.getElementById('dl-meet');
    assert(F.ST.mt && F.ST.mt.ph === 'vote' && mt.style.display !== 'none' && mt.querySelectorAll('[data-mv]').length === F.DESKS.length + 1 && /Звільнити/.test(mt.textContent) && /Продовжити роботу/.test(mt.textContent) && /Справа/.test(mt.textContent) && mt.querySelectorAll('.dlm-bar').length === F.DESKS.length, '🚨 дійшов у переговорну — вікно: «Звільнити …» ×8 зі стовпчиками, «⏭️ Продовжити роботу», 🗂️ справа');
    assert(F.goal().txt.includes('Збори'), 'підказка: голосуй');
    const zx = F.ST.zom.map(z => z.x); step(.5); assert(F.ST.zom.every((z, k) => z.x === zx[k]), 'під час наради зомбі завмерли');
    const inn = F.DESKS.map(d => d.i).find(i => i !== si && !F.pestOf(i)); const t0 = F.ST.t;
    mt.querySelector(`[data-mv="${inn}"]`).click(); step(.2);
    assert(!F.ST.mt && F.pestOf(inn) && !F.ST.sbC, `проголосували за невинного ${F.NAMES[inn]} — він образився і став 😤`);
    w.document.querySelector('#modebar [data-ms="7"]').click(); step(.1); assert(!F.ST.mt, 'вдруге нараду не скликати');
    assert(/НЕ був/.test(w.document.getElementById('dl-verdict').textContent), '🗂️ драматичний вердикт: «Звільнено: … — НЕ був саботажником»');
    F.AU.mc = {}; F.AU.mtCd = 0; F.V.mc = 1; at({ x: MP.x + 9, z: MP.z }); w.document.querySelector('#modebar [data-ms="7"]').click(); step(.1);
    F.ST.mt.t = .05; step(.3); assert(F.ST.mt.ph === 'vote' && Math.hypot(T.pl.x - MP.x, T.pl.z - MP.z) < 3.3, '⏱️ не дійшов за 20 с — телепортувало в переговорну');
    const c0 = T.P.coins; w.document.querySelector(`#dl-meet [data-mv="${si}"]`).click(); step(.2);
    assert(/БУВ/.test(w.document.getElementById('dl-verdict').textContent), '🗂️ вердикт: «— він(вона) БУВ(ЛА) саботажником!»');
    assert(F.ST.sbC === 1 && !F.ST.on && T.P.addons.deadline.caught === 1 && T.P.coins - c0 >= 40 + 10, `🕵️ спіймали саботажника ${F.NAMES[si]} на нараді — раунд одразу виграно (+${T.P.coins - c0} 🪙, з них +40 за спійманого)`);
    assert(!F.ST.pst.length && !F.ST.ag.some(Boolean) && !F.ST.burn.length, 'після раунду «зайобуючі» повернулись за столи, вогонь згас');
    { const fe = w.document.getElementById('dl-final'); assert(fe && fe.style.display !== 'none' && /завдань/.test(fe.textContent) && /Досягнення/.test(fe.textContent) && /Саботажник/.test(fe.textContent) && /Шерлок|Пожежник|Трудоголік/.test(fe.textContent), '🏆 фінальний екран: статистика, саботажник з очками, досягнення'); fe.click(); }
    step(.1); assert(!F.V.sab && !T.MODEBAR, 'після раунду — звичайний хотбар');
  }
}
// вихід ліфтом у хаб
{ const E = F.L.exit; at(E); step(.05); it = T.getInteract(); assert(it && /хаб/.test(it.l), 'біля ліфта F — «⬇️ Ліфт у хаб»'); it.fn(); step(.5); assert(F.floorOf(T.pl.x, T.pl.z) < 0 && !lob(), 'ліфт відвіз у хаб — вікно лобі закрилось'); }
// пішов з офісу — підсумки раунду, картка ролі й міні-гра не висять над відкритим світом (і над інвентарем)
{ step(.2); const vis = id => { const e = w.document.getElementById(id); return !!e && e.style.display !== 'none'; };
  assert(!vis('dl-final') && !vis('dl-role') && !vis('dl-mini') && !w.document.getElementById('dl-intro') && !F.V.mg, 'у хабі: картки «Дедлайну» (підсумки, роль, міні-гра) сховані'); }
console.log('ALL OK'); process.exit(0);
