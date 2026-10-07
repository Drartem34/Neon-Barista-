// Тест PVP-режиму «Битва за принтер» v2 у грі без сервера: три поверхи, голосування, ковзанка, пачки, турбо, тривога.
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
w.setTimeout = f => { f(); return 0; };
w.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: (o, k) => k in o ? o[k] : () => { }, set: (o, k, v) => { o[k] = v; return true; } });
w.__ADDON_CODE = [{ id: 'printerwar', src: 'printerwar/addon.js', code: fs.readFileSync(path.join(root, 'addons/_examples/printerwar/addon.js'), 'utf8') }];
let src = fs.readdirSync(path.join(root, 'src')).filter(f => f.endsWith('.js')).sort().map(f => fs.readFileSync(path.join(root, 'src', f), 'utf8')).join('\n');
src += ';window.__T={get MODES(){return MODES},get paused(){return paused},get running(){return running},get P(){return P},get STATICS(){return STATICS},get MODEBAR(){return MODEBAR},onSyrup:(x,z)=>onSyrup(x,z),islandAt:(x,z)=>islandAt(x,z),pl,MON,PROPS,BODIES,ADDONS,ISLMAP,startGame,frame,openPanel,closePanel,get panel(){return panel},getInteract:()=>getInteract(),terrainAt:(x,z)=>terrainAt(x,z),input,renderPanel,keydown:c=>dispatchEvent(new KeyboardEvent("keydown",{code:c})),keyup:c=>dispatchEvent(new KeyboardEvent("keyup",{code:c})),releaseCarry:t=>releaseCarry(t)};';
w.eval(src);
const T = w.__T; let now = 1000;
const step = s => { for (let i = 0; i < s * 60; i++) { now += 16.7; T.frame(now); if (i % 3 === 0) IV.forEach(f => f()); } };
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); process.exit(1); } console.log('ok -', m); };
const body = () => w.document.querySelector('#pbody');
const W = w.__printer;
assert(T.ADDONS.list.every(a => a.ok), 'аддон завантажився: ' + T.ADDONS.list.map(a => a.name + (a.ok ? '' : ' ✗ ' + a.err)).join(', '));
const pv = w.document.getElementById('mm-pvp'); pv.click();
assert(w.document.querySelector('#mm-pvp-pick [data-pm="printerwar"]'), 'PVP у головному меню → «Битва за принтер»');
w.document.querySelector('#mm-pvp-pick .x').click();
T.startGame(true); T.P.tut = -1; T.pl.hp = 9999; T.P.addons = T.P.addons || {}; T.P.addons.printerwar = { intro2: 1 }; step(.3);

// --- три поверхи збудовані: острови, тверді стіни, підлога в межах r, навігація зв'язна
for (const D of W.VAR) {
  const isl = T.ISLMAP[D.i ? 'printerwar' + (D.i + 1) : 'printerwar'];
  const st = T.STATICS.filter(s => Math.abs(s.x - D.cx) <= D.w / 2 + .1 && Math.abs(s.z - D.cz) <= D.d / 2 + .1).length;
  const fits = [[-1, -1], [1, -1], [-1, 1], [1, 1]].every(([a, b]) => Math.hypot(a * (D.w / 2 + .6), b * (D.d / 2 + .6)) < isl.r);
  assert(isl && isl.x === D.cx && st > 200 && fits && T.terrainAt(D.cx + D.w / 2 - .5, D.cz + D.d / 2 - .5) === 'land', `${D.n}: острів (${D.cx}, ${D.cz}), ${st} твердих точок, поверх у межах r=${isl.r}`);
  const targets = [...D.pads, ...D.spots, D.alarm.x ? { x: D.alarm.x - 1, z: D.alarm.z } : null, ...(D.route ? D.route : D.prn.map(p => ({ x: p.x + 1.6, z: p.z })))];
  const bad = targets.filter(p => !W.reachable(D, D.board.x, D.board.z - 1.4, p.x, p.z));
  assert(!bad.length, `${D.n}: від табло можна дійти до кружечків, кнопки тривоги й принтера${bad.length ? ' ✗ ' + JSON.stringify(bad) : ''}`);
}
assert(new Set(W.VAR.map(D => D.n)).size === 3 && W.VAR[1].route && W.VAR[2].prn.length === 2, 'три різні поверхи: 42 (статичний), 57 (принтер на колесах), 63 (два принтери)');

// --- раунд 1 (поверх 42) — без голосування: поверх, де стоїш
T.keydown('Escape'); step(.05); body().querySelector('[data-mode="printerwar"]').click(); step(.6);
assert(W.varAt(T.pl.x, T.pl.z) === 0, 'Esc → «Битва за принтер» → ліфтовий хол поверху 42');
let it = T.getInteract(); assert(it && /Записатися/.test(it.l), 'біля табло F — «Записатися на битву»'); it.fn(); step(.1);
assert(W.ST.ph === 'lobby', 'лобі'); step(4.5);
assert(W.ST.ph === 'fight' && W.ST.v === 0 && W.ST.ps.length === 4 && W.ST.ps.filter(p => p.bot).length === 3, 'битва на поверсі 42: я + 3 боти');
assert(T.MODEBAR && T.MODEBAR.slots.length === 3 && !w.document.querySelector('#modebar').hidden, 'панель режиму: 📄 кинути / 🫣 заритися / 👊 штовхнути');
W.AU.evIn = 999; W.AU.puIn = 999;
T.pl.x = W.BOARD.x; T.pl.z = W.BOARD.z - 1.4;
{ let inside = false; for (let i = 0; i < 40 && !inside; i++) { step(.25); inside = W.ST.ps.some(p => p.bot && Math.hypot(p.x - W.PX, p.z - W.PZ) < W.ZONE + .3); } assert(inside, 'боти дійшли коридором і дверима до принтера'); }
const away = () => W.ST.ps.forEach((p, i) => { if (p.bot) { const D = W.VAR[W.ST.v]; p.x = D.spots[i % 4].x; p.z = D.spots[i % 4].z; p.stun = 2; p.vx = p.vz = 0; p.hold = false; p.blind = 0; } });
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
W.ST.ev = '';
// кінець: набрав 100
const c0 = T.P.coins; me.pages = W.GOAL - 1;
for (let i = 0; i < 20 && W.ST.ph === 'fight'; i++) { away(); atPrn(); step(.1); }
assert(W.ST.ph === 'end' && W.ST.res[0][0] === 'me', `${W.GOAL} сторінок — перемога`);
assert(T.P.coins > c0 && T.P.addons.printerwar.wins === 1, `нагорода +${T.P.coins - c0} 🪙`);
step(.1); assert(!T.MODEBAR && w.document.querySelector('#modebar').hidden, 'раунд скінчився — звичайна панель предметів повернулась');
step(9); assert(W.ST.ph === 'idle' && W.ST.v === 1, 'принт-рум вільний; наступний поверх у меню — 57');

// --- голосування: стаю на кружечок «63» на поверсі 42 → раунд на поверсі 63, мене везе ліфт
{ const D = W.VAR[0]; T.pl.x = D.board.x; T.pl.z = D.board.z - 1.4; step(.1); T.getInteract().fn(); step(.1);
  T.pl.x = D.pads[2].x; T.pl.z = D.pads[2].z; step(.3); assert(W.ST.votes.me === 2, '🗳️ став на кружечок «63» — голос за поверх 63');
  step(4.5); me = W.ST.ps.find(p => p.k === 'me'); assert(W.ST.ph === 'fight' && W.ST.v === 2 && W.varAt(T.pl.x, T.pl.z) === 2, 'голосування: раунд на поверсі 63, мене перенесло туди');
  W.AU.evIn = 999; W.AU.puIn = 999;
  const A0 = W.prnPos(); assert(W.actIdx(2) === 0 && A0 === W.VAR[2].prn[0], 'поверх 63: працює північний принтер');
  let pg = me.pages; for (let i = 0; i < 15; i++) { away(); atPrn(); step(.1); } assert(me.pages > pg, 'друкую на північному');
  W.ST.t = W.SWITCH - .1; step(.2); const B0 = W.prnPos(); assert(W.actIdx(2) === 1 && B0 === W.VAR[2].prn[1], '🔀 через 25 с перемкнуло на південний принтер');
  pg = me.pages; T.pl.x = A0.x + 1.6; T.pl.z = A0.z; away(); step(.6); assert(me.pages === pg, 'вимкнений принтер не друкує');
  for (let i = 0; i < 15; i++) { away(); atPrn(); step(.1); } assert(me.pages > pg, 'на південному — друкую');
  W.req('leave'); step(.1); assert(W.ST.ph === 'idle', 'вийшов — раунд скинувся');
}
// --- поверх 57: принтер на колесах їде колією, зона їде з ним
{ W.goPrinter(1); step(.5); assert(W.varAt(T.pl.x, T.pl.z) === 1, 'меню: поверх 57'); T.getInteract().fn(); step(5); me = W.ST.ps.find(p => p.k === 'me');
  assert(W.ST.ph === 'fight' && W.ST.v === 1, 'раунд на поверсі 57 (без голосів — поверх, де стоїш)');
  W.AU.evIn = 999; W.AU.puIn = 999;
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
console.log('ALL OK'); process.exit(0);
