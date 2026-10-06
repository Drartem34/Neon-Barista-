// Тест режиму «Дедлайн о 18:00» у грі без сервера.
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
src += ';window.__T={get paused(){return paused},get running(){return running},get P(){return P},pl,MON,PROPS,BODIES,ADDONS,ISLMAP,STATICS,startGame,frame,openPanel,closePanel,get panel(){return panel},getInteract:()=>getInteract(),terrainAt:(x,z)=>terrainAt(x,z),keydown:c=>dispatchEvent(new KeyboardEvent("keydown",{code:c}))};';
w.eval(src);
const T = w.__T; let now = 1000;
const F = w.__deadline;
let calmZ = true;
// без випадкового хаосу, зажовувань і вибухів — тест передбачуваний; зомбі сидять на нараді
const calm = () => { if (!F) return; F.AU.chaosT = 999; F.AU.jamP = 0; F.AU.boomP = 0; if (calmZ) for (const z of F.ST.zom) z.stun = 99; };
const step = s => { for (let i = 0; i < s * 60; i++) { now += 16.7; calm(); T.frame(now); if (i % 3 === 0) IV.forEach(f => f()); } };
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); process.exit(1); } console.log('ok -', m); };
const body = () => w.document.querySelector('#pbody');
const at = p => { T.pl.x = p.x; T.pl.z = p.z; T.pl.y = 0; };
assert(T.ADDONS.list.every(a => a.ok), 'аддон завантажився: ' + T.ADDONS.list.map(a => a.name + (a.ok ? '' : ' ✗ ' + a.err)).join(', '));
assert(w.document.querySelector('#mm-deadline h2').textContent === 'ДЕДЛАЙН' && w.document.querySelector('#mm-deadline .mm-subtitle').textContent === 'О 18:00', 'у меню картка «ДЕДЛАЙН · О 18:00»');
assert(T.ISLMAP.deadline && T.terrainAt(-120, -80) === 'land', 'острів-офіс на мапі');
T.startGame(true); T.P.tut = -1; T.pl.hp = 9999; step(.3);
T.keydown('Escape'); step(.05); body().querySelector('[data-mode="deadline"]').click(); step(.5);
assert(Math.hypot(T.pl.x - F.START.p.x, T.pl.z - F.START.p.z) < 1.5, 'Esc → «Дедлайн о 18:00» переносить на ресепшн офісу');
assert(F.goal().id === 'start' && w.document.getElementById('dl-intro'), 'до старту: інструкція й підказка «▶ СТАРТ»');
w.document.querySelector('#dl-intro button').click(); assert(!w.document.getElementById('dl-intro') && T.P.addons.deadline.intro === 1, 'інструкцію закрив — більше не показується');
step(.1); assert(/СТАРТ/.test(w.document.getElementById('deadline-goal').textContent), 'у HUD рядок «👉 що робити зараз»');
// стіни офісу тримають
at({ x: -120 - 10, z: -80 - 1.5 }); step(.1); for (let k = 0; k < 20; k++) { T.pl.z -= .12; step(.02); }
assert(T.pl.z > -80 - 3 - .2, 'стіна коридору не пускає крізь себе');
// старт
at(F.START.p); step(.1);
let it = T.getInteract(); assert(it && /аврал/.test(it.l), 'на ресепшні F — «Почати аврал»'); it.fn(); step(.2);
assert(F.ST.on && F.ST.steps[0] === 'data' && F.ST.steps[1] === 'print' && F.ST.steps[F.ST.steps.length - 1] === 'send' && F.ST.steps.length === 6, `раунд почався: ${F.ST.steps.join(' → ')}`);
assert(/17:55/.test(w.document.getElementById('deadline-hud').textContent) && /Чекліст/.test(w.document.getElementById('deadline-list').textContent), 'у HUD годинник 17:55 і чекліст');
assert(F.ST.desk.filter(Boolean).length === F.ST.need && F.ST.need === 3, 'дані лежать у 3 колег');
// для повного покриття — усі 5 пунктів
F.ST.steps = ['data', 'print', 'staple', 'stamp', 'number', 'scan', 'sign', 'send'];
// хаос: стрибок напруги — підказка веде до щитка
F.chaos('power'); assert(!F.ST.pw && F.goal().id === 'power', 'стрибок напруги: світло зникло, підказка веде до ⚡ щитка');
// проходимо ланцюжок, слухаючись лише підказки
const seen = []; let jamT = 0, boomT = 0, stealT = 0;
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
    for (let j = 0; j < 80 && F.V.act; j++) { const p = g.id === 'boss' ? { x: F.ST.boss.x + .3, z: F.ST.boss.z + .3 } : g.tg; at(p); step(.1); }
    step(.1);
  }
};
drive(60, () => F.cur() === 'number');
assert(F.ST.pw && F.ST.fixes >= 1, 'світло увімкнули на щитку');
assert(F.ST.fed >= 3 && F.ST.si >= 2, 'дані зібрано й покладено в принтер, звіт надруковано');
assert(jamT && !F.ST.jam, 'зажований папір витягли');
assert(seen.includes('desk@data') && seen.includes('printer@data') && seen.includes('printer@print') && seen.includes('staple@staple') && seen.includes('stamp@stamp'), 'підказки вели: колеги → принтер → степлер → печатка');
// зомбі краде звіт
{
  assert(F.myHeld().it === 'report', 'звіт у руках');
  calmZ = false; const z = F.ST.zom[0]; z.stun = 0; z.cd = 0; z.x = T.pl.x + .5; z.z = T.pl.z; step(.3);
  assert(!F.myHeld().it && F.ST.zom.some(q => q.carry && q.carry.it === 'report'), 'зомбі-офісник поцупив звіт');
  const g = F.goal(); assert(g.id === 'thief', 'підказка: наздожени злодія');
  const th = F.ST.zom.find(q => q.carry); at(th); step(.02); at(th);
  it = T.getInteract(); assert(it && /листом/.test(it.l), 'біля зомбі F — «Це можна було листом!»'); it.fn(); step(.1);
  assert(!th.carry && th.stun > 0 && F.ST.floor.some(f => f.it === 'report'), 'зомбі сів на нараду, звіт упав на підлогу');
  calmZ = true; step(.05);
  assert(F.goal().id === 'floor', 'підказка: підбери звіт');
  const f = F.ST.floor.find(q => q.it === 'report'); at(f); step(.05); T.getInteract().fn(); step(.1);
  assert(F.myHeld().it === 'report', 'звіт знову в руках');
}
drive(80);
assert(boomT && F.ST.cm, 'кавоварку полагодили');
assert(seen.includes('number@number') && seen.includes('scan@scan') && seen.includes('coffee@sign') && seen.includes('boss@sign') && seen.includes('send@send'), 'підказки вели: архів → сканер → кава → начальник → відправка');
const d = T.P.addons.deadline;
assert(!F.ST.on && d.wins === 1 && d.rounds === 1 && d.stars >= 2, `звіт здано до 18:00 — перемога ${'⭐'.repeat(d.stars)}`);
// поразка: годинник пробив 18:00
{
  at(F.START.p); step(.1); it = T.getInteract(); assert(it && /аврал/.test(it.l), 'новий раунд — знову ▶ СТАРТ'); it.fn(); step(.2);
  assert(F.ST.on && F.ST.need === 4 && F.ST.si === 0, 'складність зросла: даних уже 4');
  F.ST.t = F.ST.dur - 1; step(.5); assert(/17:59:5/.test(w.document.getElementById('deadline-hud').textContent), 'годинник показує 17:59:5x');
  const c0 = T.P.coins; step(1.5);
  assert(!F.ST.on && d.rounds === 2 && d.wins === 1 && T.P.coins > c0, `18:00 — дедлайн зірвано (+${T.P.coins - c0} 🪙 утішних)`);
  assert(F.goal().id === 'start', 'після поразки підказка знову веде до ▶ СТАРТ');
}
// вкладка
T.openPanel(Object.keys(T.ADDONS.tabs).find(k => /deadline/.test(k))); step(.05);
assert(/Звітів здано: 1|звітів здано: 1/.test(body().textContent), 'вкладка «⏰ Дедлайн» показує статистику');
console.log('ALL OK'); process.exit(0);
