// Тест PVP-режиму «Битва за принтер» v2 у грі без сервера: три поверхи, лобі-вікно (голос + «Я готовий»), ковзанка, пачки, турбо, тривога.
// Запуск: node test/printerwar-test.js
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
w.setTimeout = (f, ms) => { if (ms === 4600) return 0; f(); return 0; };   // тости лишаються на екрані (видно в перевірках)
w.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: (o, k) => k in o ? o[k] : () => { }, set: (o, k, v) => { o[k] = v; return true; } });
w.__ADDON_CODE = [{ id: 'printerwar', src: 'printerwar/addon.js', code: fs.readFileSync(path.join(root, 'addons/_examples/printerwar/addon.js'), 'utf8') }];
let src = fs.readdirSync(path.join(root, 'src')).filter(f => f.endsWith('.js')).sort().map(f => fs.readFileSync(path.join(root, 'src', f), 'utf8')).join('\n');
src += ';window.__T={get MLOBBY(){return MLOBBY},get MODES(){return MODES},get paused(){return paused},get running(){return running},get P(){return P},get STATICS(){return STATICS},get MODEBAR(){return MODEBAR},onSyrup:(x,z)=>onSyrup(x,z),islandAt:(x,z)=>islandAt(x,z),pl,MON,PROPS,BODIES,ADDONS,ISLMAP,startGame,frame,openPanel,closePanel,get panel(){return panel},getInteract:()=>getInteract(),terrainAt:(x,z)=>terrainAt(x,z),input,renderPanel,keydown:c=>dispatchEvent(new KeyboardEvent("keydown",{code:c})),keyup:c=>dispatchEvent(new KeyboardEvent("keyup",{code:c})),releaseCarry:t=>releaseCarry(t),mount:b=>mount(b),dismount:f=>dismount(f)};';
w.eval(src);
const T = w.__T; let now = 1000;
const step = s => { for (let i = 0; i < s * 60; i++) { now += 16.7; T.frame(now); if (i % 3 === 0) IV.forEach(f => f()); } };
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); process.exit(1); } console.log('ok -', m); };
const body = () => w.document.querySelector('#pbody');
const W = w.__printer;
const toasts = () => w.document.getElementById('toasts').textContent;
assert(T.ADDONS.list.every(a => a.ok), 'аддон завантажився: ' + T.ADDONS.list.map(a => a.name + (a.ok ? '' : ' ✗ ' + a.err)).join(', '));
const pv = w.document.getElementById('mm-pvp'); pv.click();
assert(w.document.querySelector('#mm-pvp-pick [data-pm="printerwar"]'), 'PVP у головному меню → «Битва за принтер»');
w.document.querySelector('#mm-pvp-pick .x').click();
T.startGame(true); T.P.tut = -1; T.pl.hp = 9999; T.P.addons = T.P.addons || {}; T.P.addons.printerwar = { intro3: 1 }; step(.3);

// --- три поверхи збудовані: острови, тверді стіни, підлога в межах r, навігація зв'язна
for (const D of W.VAR) {
  const isl = T.ISLMAP[D.i ? 'printerwar' + (D.i + 1) : 'printerwar'];
  const st = T.STATICS.filter(s => Math.abs(s.x - D.cx) <= D.w / 2 + .1 && Math.abs(s.z - D.cz) <= D.d / 2 + .1).length;
  const fits = [[-1, -1], [1, -1], [-1, 1], [1, 1]].every(([a, b]) => Math.hypot(a * (D.w / 2 + .6), b * (D.d / 2 + .6)) < isl.r);
  assert(isl && isl.x === D.cx && st > 200 && fits && T.terrainAt(D.cx + D.w / 2 - .5, D.cz + D.d / 2 - .5) === 'land', `${D.n}: острів (${D.cx}, ${D.cz}), ${st} твердих точок, поверх у межах r=${isl.r}`);
  const targets = [...D.spots, D.srv, D.rbDock, D.alarm.x ? { x: D.alarm.x - 1, z: D.alarm.z } : null, ...(D.route ? D.route : D.prn.map(p => ({ x: p.x + 1.6, z: p.z })))];
  const bad = targets.filter(p => !W.reachable(D, D.board.x, D.board.z - 1.4, p.x, p.z));
  assert(!bad.length, `${D.n}: від стенда лобі можна дійти до кнопки тривоги, принтера, серверної, Румби${bad.length ? ' ✗ ' + JSON.stringify(bad) : ''}`);
  const near = c => [0, 1, 2, 3, 4, 5, 6, 7].some(k => { const x = c.x + Math.sin(k * .785) * 1.4, z = c.z + Math.cos(k * .785) * 1.4, N = W.navOf(D), i = Math.floor((x - N.x0) / N.cell), j = Math.floor((z - N.z0) / N.cell); return !N.block[i + j * N.nx] && W.reachable(D, D.board.x, D.board.z - 1.4, x, z); });
  assert(D.cof.length && D.coolers.length && D.pcs.length > 10 && D.cof.every(near) && D.coolers.every(near), `${D.n}: кавомашин ${D.cof.length}, кулерів ${D.coolers.length}, ПК ${D.pcs.length} — до всіх можна підійти`);
}
for (const D of W.VAR) {   // ✈️ лотки, 📘 шафи, 🧻 смітники — по кілька на кожному поверсі, до всіх можна підійти
  const c = k => D.picks.filter(p => p.k === k).length, N = W.navOf(D);
  const near = s => [0, 1, 2, 3, 4, 5, 6, 7].some(k => { const x = s.x + Math.sin(k * .785) * 1.1, z = s.z + Math.cos(k * .785) * 1.1, i = Math.floor((x - N.x0) / N.cell), j = Math.floor((z - N.z0) / N.cell); return !N.block[i + j * N.nx] && W.reachable(D, D.board.x, D.board.z - 1.4, x, z) && Math.hypot(x - s.x, z - s.z) < 2; });
  assert(c('pl') >= 3 && c('bk') >= 2 && c('cr') >= 3 && D.picks.every(near) && D.bins.length === c('cr'), `${D.n}: ✈️ лотків ${c('pl')}, 📘 шаф ${c('bk')}, 🧻 смітників ${c('cr')} — до всіх можна підійти`);
  assert(D.v && D.v.picks && D.v.picks.length === D.picks.length && D.v.picks.every(m => m.parent), `${D.n}: над кожним — плаваючий значок (видно здалеку)`);
}
assert(new Set(W.VAR.map(D => D.n)).size === 3 && W.VAR[1].route && W.VAR[2].prn.length === 2, 'три різні поверхи: 42 (статичний), 57 (принтер на колесах), 63 (два принтери)');

// --- раунд 1 (поверх 42) — без голосування: поверх, де стоїш
const pop = () => w.document.getElementById('mlobby');
assert(!W.VAR.some(D => D.pads), 'кружечків для голосування на підлозі більше немає');
T.keydown('Escape'); step(.05); body().querySelector('[data-mode="printerwar"]').click(); step(.6);
assert(W.varAt(T.pl.x, T.pl.z) === 0, 'Esc → «Битва за принтер» → ліфтовий хол поверху 42');
assert(W.ST.ph === 'lobby' && W.ST.ps.some(p => p.k === 'me') && pop() && T.MLOBBY && pop().querySelectorAll('[data-lv]').length === 3, 'увійшов у режим — я в лобі, відкрилось вікно лобі з трьома картками поверхів');
assert([...pop().querySelectorAll('.map .im')].every((e, i) => e.getAttribute('style').includes(`addons/printerwar/map${i + 1}.jpg`)), 'картки з картинками addons/printerwar/map1..3.jpg');
step(2); assert(W.ST.ph === 'lobby', 'без «Я готовий» раунд не стартує');
// «Сховати» → F біля стенда відкриває знову
pop().querySelector('.hide').click(); step(.2); assert(!pop() && W.ST.ph === 'lobby', '«Сховати» — вікно закрилось, лобі лишилось');
assert(/Лобі/.test(w.document.getElementById('printer-goal').innerHTML), 'жовта підказка: як відкрити лобі знову');
let it = T.getInteract(); assert(it && /Лобі/.test(it.l), 'біля стенда F — «Лобі»'); it.fn(); step(.1); assert(pop(), 'F — вікно лобі знову відкрите');
// --- лобі заповнюється ботами (справжній час): перший через 4 с, далі кожні 2,5 с, потім «старт за 3…2…1»
assert(/Чекаємо гравців 1\/5/.test(T.MLOBBY.info), `до «Я готовий»: «${T.MLOBBY.info}»`);
pop().querySelector('.rdy').click(); step(.1);
assert(W.ST.ph === 'lobby' && W.ST.fill && W.ST.ps.length === 1 && /боти доповнять/.test(T.MLOBBY.info), `натиснув «Я готовий» — НЕ одразу в бій: лобі заповнюється («${T.MLOBBY.info}»)`);
step(3.5); assert(W.ST.ph === 'lobby' && W.ST.ps.length === 1, 'через 3,5 с ще жодного бота');
step(.7); { const b = W.ST.ps[1];
  assert(W.ST.ps.length === 2 && b && b.bot && b.k === 'Бот Кент' && W.ST.ready[b.k], '~4 с — у лобі приєднався 🤖 Бот Кент (✅ готовий)');
  assert([...pop().querySelectorAll('.who i')].some(e => /🤖 Бот Кент/.test(e.textContent) && /✅/.test(e.textContent)), 'у списку гравців вікна — «✅ 🤖 Бот Кент»');
  assert(/🤖 Бот Кент приєднався до лобі/.test(toasts()) && /Бот Кент приєднався · 2\/5/.test(T.MLOBBY.info), `тост «🤖 Бот Кент приєднався до лобі», info «${T.MLOBBY.info}»`); }
step(2.6); assert(W.ST.ps.length === 3 && W.ST.ph === 'lobby', 'ще 2,5 с — третій учасник');
step(5.1); assert(W.ST.ps.length === 5 && W.ST.ph === 'lobby' && W.ST.go > 0 && /старт за 3/.test(T.MLOBBY.info), `лобі повне 5/5 — «${T.MLOBBY.info}»`);
const lobbyBots = W.ST.ps.filter(p => p.bot).map(p => p.k).join();
step(1.5); assert(W.ST.ph === 'lobby' && /старт за [12]/.test(T.MLOBBY.info), `відлік: «${T.MLOBBY.info}»`);
step(1.7);
assert(W.ST.ph === 'fight' && W.ST.v === 0 && W.ST.ps.length === 5 && W.ST.ps.filter(p => p.bot).length === 4, 'битва на поверсі 42: я + 4 боти (разом 5)');
assert(W.ST.ps.filter(p => p.bot).map(p => p.k).join() === lobbyBots, `у раунді ті самі боти, що були в лобі (${lobbyBots})`);
w.__printerwarFastLobby = 1;   // далі лобі заповнюється швидко (кроки по 0,2 с)
assert(!pop() && !T.MLOBBY, 'раунд почався — вікно лобі закрилось');
assert(T.MODEBAR && T.MODEBAR.slots.length === 7 && !w.document.querySelector('#modebar').hidden && /✈️/.test(w.document.querySelector('#modebar').textContent), 'панель режиму (7): ✈️ літачок / 🫣 / 👊 / 🧯 / 🍾 / ☕ / 💣');
assert(W.ST.npc.length === 3 && W.ST.npc.every(n => !n.zom && n.ag === 0 && W.varAt(n.x, n.z) === 0) && W.ST.rb, 'на поверсі троє нейтральних колег і Румба на док-станції');
// тихий режим для детермінованих перевірок: боти без літачків, колеги стоять у холі, Румба спить, ПК не горять
const quiet = () => { W.AU.evIn = 999; W.AU.puIn = 999; W.AU.pcChance = 0; W.ST.rb = null; W.AU.rbIn = 999; const D = W.VAR[W.ST.v];
  W.ST.npc.forEach((n, i) => { n.x = D.board.x - 1 + i; n.z = D.board.z - 1.4; n.wx = null; n.wait = 999; n.ag = 0; n.zom = 0; });
  W.ST.ps.forEach(p => { if (p.bot) { p.pl = 0; p.plT = -1e4; } }); };
quiet();
T.pl.x = W.BOARD.x; T.pl.z = W.BOARD.z - 1.4;
{ let inside = false; for (let i = 0; i < 40 && !inside; i++) { step(.25); inside = W.ST.ps.some(p => p.bot && Math.hypot(p.x - W.PX, p.z - W.PZ) < W.ZONE + .3); } assert(inside, 'боти дійшли коридором і дверима до принтера'); }
const away = () => W.ST.ps.forEach((p, i) => { if (p.bot) { const D = W.VAR[W.ST.v]; p.x = D.spots[i % 4].x; p.z = D.spots[i % 4].z; p.stun = 2; p.vx = p.vz = 0; p.hold = false; p.blind = 0; p.pl = 0; p.plT = -1e4; } });
const atPrn = () => { T.pl.x = W.PX + 1.6; T.pl.z = W.PZ; T.pl.kx = T.pl.kz = 0; };
// стою сам — друкую
away(); atPrn(); let p0 = W.ST.ps.find(p => p.k === 'me').pages;
for (let i = 0; i < 20; i++) { away(); atPrn(); step(.1); }
let me = W.ST.ps.find(p => p.k === 'me');
assert(W.ST.owner === 'me' && me.pages >= p0 + 3, `сам біля принтера — друкую (${me.pages} 📄)`);
// комбо: 8 с без перерви — бонус
{ const pg = me.pages; me.streak = 0; for (let i = 0; i < 90; i++) { away(); atPrn(); step(.1); } assert(me.pages >= pg + 16 + 5, `🔥 комбо за 8 с безперервного друку (${pg} → ${me.pages})`); }
// бот у колі — тиснява, ніхто не друкує
{ const b = W.ST.ps.find(p => p.bot); let pg = me.pages; for (let i = 0; i < 15; i++) { b.x = W.PX - 1.6; b.z = W.PZ; b.stun = 0; b.cd = 9; b.vx = b.vz = 0; atPrn(); step(.1); } assert(W.ST.owner === '*' && me.pages === pg, 'двоє в колі — «тиснява», ніхто не друкує');
  T.pl.x = b.x + 1.2; T.pl.z = b.z; T.pl.face = Math.atan2(b.x - T.pl.x, b.z - T.pl.z); b.stun = 0; const bx = b.x; W.shove(); step(.3); assert(b.stun > 0 || Math.abs(b.x - bx) > .5, 'ЛКМ штовхнув бота — відлетів'); }
// бот штовхає мене
{ const b = W.ST.ps.find(p => p.bot); away(); b.stun = 0; b.cd = 0; b.x = W.PX + 1; b.z = W.PZ + 1.2; T.pl.x = W.PX + 1; T.pl.z = W.PZ; const kx = T.pl.kx || 0, kz = T.pl.kz || 0; let pushed = false; for (let i = 0; i < 10 && !pushed; i++) { step(.05); if (Math.abs((T.pl.kx || 0) - kx) + Math.abs((T.pl.kz || 0) - kz) > 1 || Math.hypot(T.pl.x - W.PX - 1, T.pl.z - W.PZ) > .6) pushed = true; } assert(pushed, 'бот штовхнув мене від принтера'); }
// зажувало — лагоджу
W.ST.ev = 'jam'; W.ST.evT = 12;
{ const pg = me.pages; away(); atPrn(); step(.1); it = T.getInteract(); assert(it && /зажований/.test(it.l), 'принтер зажувало — F «Витягти папір»'); it.fn(); for (let i = 0; i < 30 && W.ST.ev === 'jam'; i++) { away(); atPrn(); step(.1); } assert(W.ST.ev === '' && me.pages >= pg + 10, 'полагодив — +10 сторінок'); }

// --- дощ зі сторінок: пачки й купи
W.ST.ev = ''; W.ST.stacks.length = 0; W.ST.piles.length = 0; W.startEvent('rain');
assert(W.ST.stacks.length === 6 && W.ST.piles.length === 2, 'дощ зі сторінок — 6 пачок паперу й 2 купи біля принтера');
{ const s = W.ST.stacks[0], pg = me.pages; away(); T.pl.x = s.x; T.pl.z = s.z; step(.2); assert(me.pages >= pg + 4 && me.hold, 'підібрав пачку — +4 і пачка в руках'); }
{ // жбурнув пачку в обличчя боту
  const b = W.ST.ps.find(p => p.bot); away(); W.ST.stacks.length = 0; W.ST.ev = ''; const D = W.VAR[0]; T.pl.x = D.cx - 12.5; T.pl.z = D.cz; b.x = D.cx - 9.5; b.z = D.cz; b.stun = 5; b.hold = true; T.pl.face = Math.PI / 2; const piles = W.ST.piles.length;
  T.keydown('Digit1'); step(.05); T.keyup('Digit1'); step(.5);
  assert(!me.hold && b.blind > 0 && !b.hold && W.ST.stacks.length === 1, 'пачка в обличчя: бот осліп і впустив свою пачку');
  assert(W.ST.piles.length === piles + 1, 'де впала пачка — купа паперу');
  const blindX = b.x; b.stun = 0; step(.5); assert(Math.hypot(b.x - blindX, b.z - D.cz) > .1 || b.blind > 0, 'осліплений бот бреде навмання');
}
{ // заритися в купу біля принтера
  W.ST.stacks.length = 0; const pile = W.ST.piles[0]; away(); T.pl.x = pile.x + .3; T.pl.z = pile.z; step(.1);
  it = T.getInteract(); assert(it && /Заритися/.test(it.l), 'біля купи паперу F — «Заритися»'); it.fn(); step(.1);
  assert(me.bur === pile.id, '🫣 зарився в папери');
  // штовханина бота слабшає втричі
  const b = W.ST.ps.find(p => p.bot); away(); T.pl.kx = T.pl.kz = 0; W.ST.ps.forEach(p => { if (p.bot) p.stun = 9; });
  w.__printer.req('bury', { on: 1 }); const k0 = Math.hypot(T.pl.kx || 0, T.pl.kz || 0);
  b.stun = 0; b.cd = 0; b.x = T.pl.x + 1; b.z = T.pl.z; let maxK = 0; for (let i = 0; i < 20; i++) { b.x = T.pl.x + 1; b.z = T.pl.z; b.stun = 0; step(.02); maxK = Math.max(maxK, Math.hypot(T.pl.kx || 0, T.pl.kz || 0)); if (maxK > 0) break; }
  assert(maxK === 0 || maxK < 6, `заритого штовхати важче (поштовх ${maxK.toFixed(1)} замість 14)`);
  T.input.jx = 1; step(.2); T.input.jx = 0; step(.1); assert(!me.bur, 'рушив — виліз із паперів');
}

// --- тонерна ковзанка
{ away(); W.ST.ev = ''; W.startEvent('toner'); step(.1);
  assert(W.ST.sl && W.slimeAt(W.PX + 2, W.PZ) && W.V.slime && W.V.slime.visible, '💥 вибух тонера — чорна пляма навколо принтера (декаль)');
  T.pl.x = W.PX + 2.4; T.pl.z = W.PZ; T.pl.kx = T.pl.kz = 0; T.pl.vx = T.pl.vz = 0; step(.05);
  assert(T.onSyrup(T.pl.x, T.pl.z), 'на тонері рух гравця ковзкий');
  T.input.jx = 1; step(.15); T.input.jx = 0; const v0 = Math.hypot(T.pl.vx, T.pl.vz), x0 = T.pl.x; step(.25);
  assert(T.pl.x - x0 > .2 && v0 < 3, `розігнатись важко (${v0.toFixed(2)} м/с), а загальмувати — ще важче (проїхав ${(T.pl.x - x0).toFixed(2)} м без кнопок)`);
  // бот на ковзанці не може зупинитись
  const b = W.ST.ps.find(p => p.bot); b.x = W.PX - 2.4; b.z = W.PZ + 1; b.stun = 0; b.blind = 0; b.vx = 4; b.vz = 0; W.AU.bump = {};
  step(.1); assert(Math.abs(b.vx) > .5, 'бот на тонері ковзає з інерцією');
  // врізались одне в одного
  b.x = T.pl.x + .5; b.z = T.pl.z; b.stun = 0; b.vx = b.vz = 0; T.pl.kx = T.pl.kz = 0; W.AU.bump = {}; step(.05);
  assert(Math.hypot(T.pl.kx || 0, T.pl.kz || 0) > 1 || Math.hypot(b.vx, b.vz) > 1, 'на ковзанці врізались одне в одного — обох відкинуло');
  W.ST.sl[3] = .05; step(.2); assert(!W.ST.sl && !W.V.slime.visible, 'ковзанка висохла');
}

// --- картридж-турбо
{ away(); W.ST.ev = ''; W.AU.puIn = 0; step(.05); assert(W.ST.pu, '⚡ з\'явився картридж-турбо'); T.pl.x = W.ST.pu.x; T.pl.z = W.ST.pu.z; step(.1); assert(me.turbo > 9 && !W.ST.pu, 'підібрав картридж — турбо 10 с');
  W.AU.puIn = 999; const pg = me.pages; for (let i = 0; i < 20; i++) { away(); atPrn(); step(.1); } assert(me.pages >= pg + 7, `турбо: друк ×2 (${pg} → ${me.pages})`); }

// --- кнопка тривоги
{ away(); W.ST.ev = ''; const D = W.VAR[0]; T.pl.x = D.alarm.x - 1; T.pl.z = D.alarm.z; step(.1); it = T.getInteract(); assert(it && /тривоги/.test(it.l), 'біля червоної кнопки F — «Натиснути кнопку тривоги»'); it.fn(); step(.1);
  assert(W.ST.ev === 'boss' && W.ST.ac > 30, '🚨 тривога — НАЧАЛЬНИК ІДЕ, кнопка на перезарядці');
  const pg = me.pages; for (let i = 0; i < 15; i++) { away(); atPrn(); step(.1); } assert(me.pages < pg && W.V.boss, `👔 начальник прийшов — біля принтера втрачаєш сторінки (${pg} → ${me.pages})`); }
// ======================= ХАОС: літачок → ПК → пожежа; колеги-зомбі; кулер-пастка; Молотов; вогнегасник; Румба =======================
W.ST.ev = ''; W.AU.evIn = 999; W.ST.ac = 99; me.pages = 10;
const D0 = W.VAR[0], L = (x, z) => ({ x: D0.cx + x, z: D0.cz + z });
const putMe = (p, face) => { T.pl.x = p.x; T.pl.z = p.z; T.pl.kx = T.pl.kz = 0; T.pl.vx = T.pl.vz = 0; if (face != null) T.pl.face = face; };
{ // #1 паперовий літачок у ПК → ПК спамить серверну → пожежа, друк стоїть, гасимо вогнегасником
  away(); W.AU.pcChance = 1; me.pl = 3; putMe(L(10.5, -2.2), Math.PI / 2); step(.05);
  T.keydown('Digit1'); step(.05); T.keyup('Digit1'); step(.6);
  assert(me.pl === 2 && W.AU.fireIn > 0, '✈️ літачок (1) влучив у ПК — ПК почав спамити серверну');
  step(2.5); assert(W.ST.sf && W.ST.sf.hp > 90 && W.V.fires.has('sf'), '🔥 серверна загорілась (вогонь видно)');
  const pg = me.pages; for (let i = 0; i < 15; i++) { away(); atPrn(); step(.1); } assert(W.ST.owner === 'me' && me.pages === pg, 'поки серверна горить — принтер не друкує');
  const r0 = W.ST.sf.r; step(1); assert(W.ST.sf.r > r0, `вогонь повільно розростається (${r0.toFixed(2)} → ${W.ST.sf.r.toFixed(2)})`);
  const sf = W.ST.sf; putMe({ x: sf.x, z: sf.z }); const hp0 = T.pl.hp; step(.3); assert(T.pl.hp < hp0, 'у вогні — легкі опіки');
  assert(/Серверна горить/.test(w.document.getElementById('printer-goal').innerHTML), 'підказка: гаси серверну вогнегасником');
  me.fo = 100; const pg2 = me.pages; putMe({ x: sf.x + sf.r + 1.3, z: sf.z }, -Math.PI / 2);
  for (let i = 0; i < 4 && W.ST.sf; i++) { away(); putMe({ x: sf.x + sf.r + 1.3, z: sf.z }, -Math.PI / 2); W.sprayFoam(); step(.1); }
  assert(!W.ST.sf && me.pages >= pg2 + 8 && me.fo < 50, `🧯 загасив серверну (+8 📄), піна витрачена (${Math.round(me.fo)}%)`);
  step(.2); assert(!W.V.fires.has('sf'), 'вогонь зник');
  const pg3 = me.pages; for (let i = 0; i < 10; i++) { away(); atPrn(); step(.1); } assert(me.pages > pg3, 'друк відновився');
  W.AU.pcChance = 0;
}
{ // #2 шкала агресії → «зайобуючий» зомбі йде до лідера; ланцюг; кава
  away(); const [n, o] = W.ST.npc, b = W.ST.ps.find(p => p.bot); b.pages = 30; me.pages = 10;
  n.x = D0.cx - 10; n.z = D0.cz + 3; n.wait = 999; n.wx = null; me.pl = 3; putMe(L(-13, 3), Math.PI / 2);
  W.throwAny(); step(.5);
  assert(n.ag >= 35 && !n.zom, `літачок у колегу — шкала злості ${Math.round(n.ag)}%, ще не зомбі`);
  assert(W.V.npc.get(n.id) && /Колега/.test(W.V.npc.get(n.id).t.textContent) && parseInt(W.V.npc.get(n.id).bar.style.width) >= 35, 'над колегою — шкала агресії');
  W.rile(n, 70, 'me'); step(.05);
  assert(n.zom && n.tgt === b.k, `шкала повна — 🧟 «зайобуючий» іде діставати лідера (${n.tgt}), а не того, хто розізлив`);
  assert(/хоче/.test(W.V.npc.get(n.id).t.textContent), 'над зомбі видно, яку каву він хоче');
  // доганяє лідера й цупить сторінки
  b.x = D0.cx - 6; b.z = D0.cz + 3; b.stun = 99; b.vx = b.vz = 0; const bp = b.pages; let ok = false;
  for (let i = 0; i < 40 && !ok; i++) { b.x = D0.cx - 6; b.z = D0.cz + 3; b.stun = 99; step(.1); ok = b.pages < bp; }
  assert(ok, `зомбі дістав лідера: «А можна на хвилинку?» (${bp} → ${b.pages} 📄)`);
  // ланцюгова реакція
  o.x = n.x + 1.2; o.z = n.z; o.ag = 0; o.wait = 999; o.wx = null; step(1); assert(o.ag > 5, `колега поруч із зомбі теж закипає (${Math.round(o.ag)}%)`);
  // зомбі в колі принтера — ніхто не друкує
  n.x = W.PX - 1.2; n.z = W.PZ; n.stun = 3; const pg = me.pages; for (let i = 0; i < 10; i++) { away(); atPrn(); n.x = W.PX - 1.2; n.z = W.PZ; n.stun = 3; step(.1); }
  assert(W.ST.owner === '*' && me.pages === pg, 'зомбі-колега в колі принтера — «тиснява», друку нема');
  // кава: не тієї — не допомагає; та, що хоче — заспокоює (+3)
  putMe({ x: n.x + 1, z: n.z }); n.stun = 5; me.cf = [0, 0, 0]; me.cf[(n.want + 1) % 3] = 1; W.giveCoffee(); step(.1); assert(n.zom, 'не та кава — зомбі не заспокоївся');
  me.cf[n.want] = 1; const pc = me.pages; const it = T.getInteract(); assert(it && /кавою/.test(it.l), 'F біля зомбі — «Пригостити кавою»'); it.fn(); step(.1);
  assert(!n.zom && n.ag === 0 && me.pages >= pc + 3 && me.cf[n.want] === 0, '☕ правильна кава — колега заспокоївся (+3 📄)');
  // зомбі на мене (лідер — я): підказка
  me.pages = 60; b.pages = 5; o.x = D0.cx - 10; o.z = D0.cz + 3; W.rile(o, 100, b.k); step(.1);
  assert(o.zom && o.tgt === 'me' && /зомбі-колега/.test(w.document.getElementById('printer-goal').innerHTML), 'на лідера (мене) нацькували зомбі — підказка «пригости кавою»');
  // кавомашина: набрати кави
  putMe(L(-11, 11.6)); step(.1); let it2 = T.getInteract(); assert(it2 && /Набрати кави/.test(it2.l), 'F біля кавомашини на кухні — «Набрати кави»'); me.cf = [0, 0, 0]; it2.fn(); step(.1); assert(me.cf.join() === '1,1,1', 'набрав еспресо, лате й раф');
  o.zt = .05; step(.2); assert(!o.zom, 'зомбі з часом сам видихається');
}
{ // #4 кулер-пастка: калюжа ковзка; дріт із ПК у калюжу — струм, усі завмирають
  away(); W.ST.wp.length = 0; const c = D0.coolers[0]; putMe({ x: c.x + 1.2, z: c.z }); step(.05);
  let it = T.getInteract(); assert(it && /кулер/.test(it.l), 'біля кулера F — «Перекинути кулер»'); it.fn(); step(.1);
  assert(W.ST.wp.length === 1 && W.wetAt(c.x + 1, c.z) && T.onSyrup(c.x + 1, c.z) && W.V.wps.size === 1, '💦 калюжа — ковзко (і видно)');
  putMe(L(12.1, -2.2)); step(.05); it = T.getInteract(); assert(it && /дріт/.test(it.l), 'біля ПК F — «Висмикнути дріт»'); it.fn(); step(.1); assert(me.wi === 1 && T.MODEBAR.slots[0].ic === '🔌', 'дріт у руках (слот 1 — 🔌)');
  putMe({ x: c.x - 3.3, z: c.z }, Math.PI / 2); W.throwAny(); step(.6);
  assert(W.ST.wp[0] && W.ST.wp[0].el > 0 && W.zapAt(c.x - 1, c.z), '⚡ дріт у калюжі — калюжа під напругою');
  const b = W.ST.ps.find(p => p.bot); b.x = c.x - 1.2; b.z = c.z + .5; b.stun = 0; step(.1); assert(b.stun > .3, 'бот у калюжі під струмом — завмер');
  putMe({ x: c.x - 1.2, z: c.z - .5 }); step(.1); assert(W.V.stunT > 0, 'я в калюжі під струмом — завмер');
  const x0 = T.pl.x; T.input.jx = 1; step(.4); T.input.jx = 0; assert(Math.abs(T.pl.x - x0) < .15, 'під струмом не рушиш з місця');
  step(5); assert(!W.ST.wp.length, 'струм розрядився — калюжа зникла');
  // крісло з розгону в кулер — теж калюжа
  W.AU.cool = {}; const ch = T.BODIES.filter(q => q.kind === 'chair' && W.varAt(q.x, q.z) === 0).sort((u, v) => Math.hypot(u.x - c.x, u.z - c.z) - Math.hypot(v.x - c.x, v.z - c.z))[0];
  putMe({ x: c.x - 4, z: c.z }); let spilt = false;
  for (let i = 0; i < 10 && !spilt; i++) { ch.x = c.x - 1.8; ch.z = c.z; ch.vx = 9; ch.vz = 0; step(.05); spilt = W.ST.wp.length > 0; }
  assert(spilt, '🪑 крісло з розгону врізалось у кулер — калюжа'); W.ST.wp.length = 0;
}
{ // #7 Молотов: палаюча калюжа; #6 вогнегасник гасить і відкидає; реактивне крісло
  away(); const b = W.ST.ps.find(p => p.bot); me.mo = 2; putMe(L(-13, 3), Math.PI / 2); b.x = D0.cx - 9.5; b.z = D0.cz + 3; b.stun = 9; b.vx = b.vz = 0;
  T.keydown('Digit5'); step(.05); T.keyup('Digit5'); step(.5);
  assert(me.mo === 1 && W.ST.mf.length === 1 && W.fireAt(D0.cx - 9.6, D0.cz + 3) && W.V.fires.size >= 1, '🍾 Молотов — палаюча калюжа');
  step(.1); assert(Math.hypot(b.vx, b.vz) > 1, 'бота в огні відкидає');
  const f = W.ST.mf[0]; putMe({ x: f.x, z: f.z }); const hp0 = T.pl.hp; step(.2); assert(T.pl.hp < hp0, 'у палаючій калюжі — легкі опіки');
  me.fo = 100; putMe({ x: f.x + 3, z: f.z }, -Math.PI / 2); b.x = f.x + 1.5; b.z = f.z; b.stun = 0; b.vx = b.vz = 0; b.cd = 9; W.sprayFoam(); step(.05);
  assert(!W.ST.mf.length && Math.hypot(b.vx, b.vz) > 3 && b.stun > .3, '🧯 піна загасила калюжу й відкинула бота');
  const ch = T.BODIES.find(q => q.kind === 'chair' && W.varAt(q.x, q.z) === 0);
  me.fo = 100; T.mount(ch); assert(T.pl.ride === ch, 'сів у крісло'); T.pl.face = 0; ch.vx = ch.vz = 0; W.sprayFoam();
  assert(ch.vz < -8, `крісло + вогнегасник назад = реактивний поштовх (${ch.vz.toFixed(1)} м/с)`); T.dismount(false); step(.3);
}
{ // #5 Румба-камікадзе: прибирає купи; з бомбою їде до суперника біля принтера й вибухає
  away(); W.AU.rbIn = 0; step(.1); const r = W.ST.rb; assert(r && W.V.rbM && W.V.rbM.visible, '🤖 Румба виїхала з док-станції');
  W.ST.piles.length = 0; W.ST.piles.push({ id: 99999, x: r.x + 1.5, z: r.z }); step(3); assert(!W.ST.piles.some(p => p.id === 99999), 'Румба прибрала купу паперу');
  me.bo = 1; putMe({ x: r.x + .8, z: r.z }); step(.05); const it = T.getInteract(); assert(it && /Румби/.test(it.l), 'біля Румби F — «Прикрутити бомбу»'); it.fn(); step(.1);
  assert(W.ST.rb.arm === 'b' && W.ST.rb.by === 'me' && me.bo === 0, '💣 бомбу прикручено');
  const b = W.ST.ps.find(p => p.bot); b.pages = 40; let boom = false;
  for (let i = 0; i < 80 && !boom; i++) { away(); b.x = W.PX + 1.5; b.z = W.PZ; b.stun = 99; putMe(L(-13, 3)); step(.25); boom = !W.ST.rb; }
  assert(boom && b.pages === 35, `Румба доїхала до суперника біля принтера й вибухнула: −5 📄 (${b.pages})`);
  W.ST.rb = null; W.AU.rbIn = 999;
}
W.ST.npc.forEach(n => { n.zom = 0; n.ag = 0; n.x = D0.board.x; n.z = D0.board.z - 1.4; n.wait = 999; n.wx = null; });
W.ST.ev = '';
{ // ======= снаряди треба знайти: ✈️ лоток з папером, 📘 книжкова шафа, 🧻 смітник; кидок дугою; папірець у смітник =======
  away(); W.ST.npc.forEach(n => { n.x = D0.cx - 16; n.z = D0.cz - 12 + n.id % 3; });
  me.pl = 0; me.bk = 0; me.cr = 0; step(.05);
  const bar = () => T.MODEBAR.slots, lbl = i => w.document.querySelectorAll('#modebar .slot')[i];
  assert(bar().map(s => s.ic).join('') === '✈️📘🧻🧯🍾☕💣' && bar().length <= 8, 'панель: 1 ✈️ · 2 📘 · 3 🧻 · 4 🧯 · 5 🍾 · 6 ☕ · 7 💣');
  assert(/де: лоток/.test(lbl(0).textContent) && /де: шафа/.test(lbl(1).getAttribute('title')) && /де: смітник/.test(lbl(2).textContent), 'порожній слот підказує, де взяти');
  const lbls = [...W.V.pickLbl.map(o => o.e.textContent)].join('|'); assert(/✈️ Папір для літачків/.test(lbls) && /📘 Книжкова шафа/.test(lbls) && /🧻 Смітник/.test(lbls), 'над лотками, шафами й смітниками — підписи');
  putMe(L(-13, 3), Math.PI / 2); T.keydown('Digit2'); step(.05); T.keyup('Digit2'); step(.1);
  assert(W.V.want && W.V.want.k === 'bk' && /Книжка/.test(toasts()) && /книжкова шафа/.test(toasts()), '2 без книжок — тост «де взяти: книжкова шафа»');
  const g = W.V.goal; assert(g && g.tg && D0.picks.some(p => p.k === 'bk' && p.x === g.tg.x && p.z === g.tg.z) && W.V.gArrow.visible && /📘 0/.test(w.document.getElementById('printer-goal').innerHTML), 'жовта стрілка й підказка «📘 0 — візьми: книжкова шафа» до найближчої шафи');
  // ✈️ лоток: F — +3
  const tray = D0.picks.find(p => p.k === 'pl'); putMe({ x: tray.x + 1, z: tray.z }); step(.05);
  let it = T.getInteract(); assert(it && /^скласти літачок \(\+3\)/.test(it.l), `біля лотка F — «${it && it.l}»`); it.fn(); step(.1);
  assert(me.pl === 3 && !/де:/.test(lbl(0).textContent), '✈️ склав 3 літачки');
  it = T.getInteract(); it.fn(); step(.1); assert(me.pl === 3, 'лоток спорожнів — треба зачекати або йти до іншого');
  // 📘 шафа: F — +2; книжка в бота — збиває з ніг
  const bs = D0.picks.find(p => p.k === 'bk'); putMe({ x: bs.x + Math.sin(bs.rot) * 1, z: bs.z + Math.cos(bs.rot) * 1 }); step(.05);
  it = T.getInteract(); assert(it && /взяти книжку \(\+2\)/.test(it.l), 'біля шафи F — «взяти книжку (+2)»'); it.fn(); step(.1); assert(me.bk === 2 && !W.V.want, '📘 взяв 2 книжки (стрілка «де взяти» зникла)');
  const b = W.ST.ps.find(p => p.bot); putMe(L(-13, 3), Math.PI / 2); b.x = D0.cx - 9; b.z = D0.cz + 3; b.stun = 0; b.cd = 99; b.vx = b.vz = 0; b.hold = true;
  T.keydown('Digit2'); step(.05); T.keyup('Digit2');
  let peak = 0; for (let i = 0; i < 12; i++) { step(.03); for (const f of W.V.proj) peak = Math.max(peak, f.m.position.y); }
  step(.3); assert(me.bk === 1 && b.stun > .3 && !b.hold, '📘 книжка в бота — збила з ніг, впустив пачку');
  assert(peak > 1.6, `снаряд летить дугою (висота ${peak.toFixed(2)} м)`);
  // 🧻 смітник: F — +5; папірець у смітник здалеку — 🪙 і досвід
  const bin = D0.bins.find(p => Math.hypot(p.x - (D0.cx + 7.4), p.z - (D0.cz - 3.4)) < .1); putMe({ x: bin.x - 1, z: bin.z }); step(.05);
  it = T.getInteract(); assert(it && /нам'яти паперу \(\+5\)/.test(it.l), 'біля смітника F — «нам\'яти паперу (+5)»'); it.fn(); step(.1); assert(me.cr === 5, '🧻 намʼяв 5 папірців');
  const c0 = T.P.coins, pg0 = me.pages; putMe({ x: bin.x - 1.2, z: bin.z + 6 }, Math.atan2(1.2, -6)); W.ST.ps.forEach(p => { if (p.bot) { p.x = D0.cx - 16; p.z = D0.cz - 10; } });
  T.keydown('Digit3'); step(.05); T.keyup('Digit3'); step(1);
  assert(me.cr === 4 && T.P.coins >= c0 + 2 + 9 && me.pages === pg0 + 1 && /смітник з 6/.test(toasts()), `🧻 папірець у смітник з 6 м: +${T.P.coins - c0} 🪙, +1 📄`);
  // ЛКМ: поруч нікого — кидає вибране (слот 3 🧻)
  T.MODEBAR.sel = 2; const cr0 = me.cr; W.V.lmbCd = 0; putMe({ x: bin.x, z: bin.z + 3 }, Math.PI); w.__printer.lmb(); step(.6); assert(me.cr === cr0 - 1, 'ЛКМ із вибраним 🧻 — кинув папірець туди, куди дивлюсь');
  // папірець у колегу — злість росте
  const n = W.ST.npc[0]; n.x = D0.cx - 9; n.z = D0.cz + 3; n.ag = 0; n.stun = 9; putMe(L(-13, 3), Math.PI / 2); W.throwKind('cr', 'paper'); step(.6);
  assert(n.ag >= 15, `🧻 папірцем у колегу — шкала злості ${Math.round(n.ag)}%`);
  n.x = D0.cx - 16;
}
// кінець: набрав 100
const c0 = T.P.coins; me.pages = W.GOAL - 1;
for (let i = 0; i < 20 && W.ST.ph === 'fight'; i++) { away(); atPrn(); step(.1); }
assert(W.ST.ph === 'end' && W.ST.res[0][0] === 'me', `${W.GOAL} сторінок — перемога`);
assert(T.P.coins > c0 && T.P.addons.printerwar.wins === 1, `нагорода +${T.P.coins - c0} 🪙`);
step(.1); assert(!T.MODEBAR && w.document.querySelector('#modebar').hidden, 'раунд скінчився — звичайна панель предметів повернулась');
step(9); assert(W.ST.ph !== 'fight' && W.ST.v === 1, 'принт-рум вільний; наступний поверх у меню — 57');

// --- голосування у вікні лобі: клік по картці «63» на поверсі 42 → раунд на поверсі 63, мене везе ліфт
{ step(.3); assert(W.ST.ph === 'lobby' && pop(), 'після раунду — нове лобі, вікно відкрилось знову');
  pop().querySelector('[data-lv="2"]').click(); step(.1);
  assert(W.ST.votes.me === 2 && W.lobbyDef().votes.join() === '0,0,1' && /mine/.test(pop().querySelector('[data-lv="2"]').className) && /🗳️ 1/.test(pop().querySelector('[data-lv="2"]').textContent), '🗳️ клік по картці «63» — голос, лічильник 1');
  T.MLOBBY.onVote(0); step(.1); assert(W.lobbyDef().votes.join() === '1,0,0', 'передумав — голос перейшов на 42');
  T.MLOBBY.onVote(2); step(.1); T.MLOBBY.onReady(); step(2.2); me = W.ST.ps.find(p => p.k === 'me'); assert(W.ST.ph === 'fight' && W.ST.v === 2 && W.varAt(T.pl.x, T.pl.z) === 2, 'голосування: раунд на поверсі 63, мене перенесло туди');
  quiet();
  const A0 = W.prnPos(); assert(W.actIdx(2) === 0 && A0 === W.VAR[2].prn[0], 'поверх 63: працює північний принтер');
  let pg = me.pages; for (let i = 0; i < 15; i++) { away(); atPrn(); step(.1); } assert(me.pages > pg, 'друкую на північному');
  W.ST.t = W.SWITCH - .1; step(.2); const B0 = W.prnPos(); assert(W.actIdx(2) === 1 && B0 === W.VAR[2].prn[1], '🔀 через 25 с перемкнуло на південний принтер');
  pg = me.pages; T.pl.x = A0.x + 1.6; T.pl.z = A0.z; away(); step(.6); assert(me.pages === pg, 'вимкнений принтер не друкує');
  for (let i = 0; i < 15; i++) { away(); atPrn(); step(.1); } assert(me.pages > pg, 'на південному — друкую');
  { // серверна поверху 63 горить — найближчий бот біжить гасити
    W.startServerFire(); const sf = W.ST.sf, D2 = W.VAR[2]; assert(sf && Math.hypot(sf.x - D2.srv.x, sf.z - D2.srv.z) < .1 && W.varAt(sf.x, sf.z) === 2, '🔥 серверна поверху 63 загорілась');
    W.ST.ps.forEach(p => { if (p.bot) { p.stun = 0; p.fo = 100; } }); T.pl.x = D2.board.x; T.pl.z = D2.board.z - 1.4;
    let out = false; for (let i = 0; i < 60 && !out; i++) { step(.25); out = !W.ST.sf; }
    assert(out, '🧯 бот-офісник прибіг і загасив серверну'); }
  W.req('leave'); step(.1); assert(W.ST.ph !== 'fight', 'вийшов — раунд скинувся');
}
// --- поверх 57: принтер на колесах їде колією, зона їде з ним
{ W.goPrinter(1); step(.5); assert(W.varAt(T.pl.x, T.pl.z) === 1 && W.ST.ph === 'lobby' && pop(), 'меню: поверх 57, вікно лобі'); T.MLOBBY.onReady(); step(2.2); me = W.ST.ps.find(p => p.k === 'me');
  assert(W.ST.ph === 'fight' && W.ST.v === 1, 'раунд на поверсі 57 (без голосів — поверх, де стоїш)');
  quiet();
  const a = W.prnPos(); step(2); const b = W.prnPos(); assert(Math.hypot(b.x - a.x, b.z - a.z) > 1, `принтер на колесах їде (${Math.hypot(b.x - a.x, b.z - a.z).toFixed(1)} м за 2 с)`);
  const pg = me.pages; for (let i = 0; i < 20; i++) { away(); atPrn(); step(.1); } assert(me.pages > pg && W.ST.owner === 'me', 'біжу поруч — друкую на ходу');
  const pm = W.V.floors[1].v.prns[0].position; assert(Math.hypot(pm.x - W.PX, pm.z - W.PZ) < .2, 'модель принтера там, де зона');
  W.req('leave'); step(.1);
}
// назва кімнати ховається, коли стоїш у ній
{ const D = W.VAR.find(d => Math.abs(T.pl.x - d.cx) < d.w / 2 && Math.abs(T.pl.z - d.cz) < d.d / 2) || W.VAR[0], r = D.rooms[1];
  T.pl.x = D.cx + (r[1] + r[3]) / 2; T.pl.z = D.cz + (r[2] + r[4]) / 2; T.pl.y = 0; step(.2);
  const lb = W.V.roomLbl.find(o => o.r === r), other = W.V.roomLbl.find(o => o.r !== r);
  assert(lb && lb.e.style.opacity === '0' && other.e.style.opacity === '1', `у кімнаті «${r[0]}» її назва ховається, інші видно`); }
// вийшов з режиму (Esc → Відкритий світ) — вікно лобі закрилось, лобі розпустилось
{ W.openLobby(); step(.3); assert(W.ST.ph === 'lobby' && pop(), 'вкладка/стенд — лобі відкрите');
  T.keydown('Escape'); step(.05); body().querySelector('[data-mode="world"]').click(); step(.3);
  assert(!pop() && !T.MLOBBY && W.ST.ph === 'idle' && W.varAt(T.pl.x, T.pl.z) < 0, 'вийшов з режиму — вікно лобі закрилось, лобі порожнє'); }
console.log('ALL OK'); process.exit(0);
