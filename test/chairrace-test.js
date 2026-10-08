// Тест PVP-режиму «Гонки на офісних кріслах» у грі без сервера.
// Запуск: node test/chairrace-test.js
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
w.__ADDON_CODE = [{ id: 'chairrace', src: 'chairrace/addon.js', code: fs.readFileSync(path.join(root, 'addons/_examples/chairrace/addon.js'), 'utf8') }];
let src = fs.readdirSync(path.join(root, 'src')).filter(f => f.endsWith('.js')).sort().map(f => fs.readFileSync(path.join(root, 'src', f), 'utf8')).join('\n');
src += ';window.__T={get MODES(){return MODES},get paused(){return paused},get running(){return running},get P(){return P},pl,MON,PROPS,BODIES,ADDONS,ISLMAP,startGame,frame,openPanel,closePanel,get panel(){return panel},getInteract:()=>getInteract(),terrainAt:(x,z)=>terrainAt(x,z),nearBar:()=>nearBar(),input,renderPanel,keydown:c=>dispatchEvent(new KeyboardEvent("keydown",{code:c})),fireHook:h=>fireHook(h),releaseCarry:t=>releaseCarry(t),pickUpAny:t=>pickUpAny(t),damageProp:(p,d)=>damageProp(p,d),hurt:d=>hurtPlayer(d),dropLoot:(x,z,l)=>dropLoot(x,z,l),DROPS};';
src += ';window.__T.STATICS=STATICS;';
w.eval(src);
const T = w.__T; let now = 1000;
const step = s => { for (let i = 0; i < s * 60; i++) { now += 16.7; T.frame(now); if (i % 3 === 0) IV.forEach(f => f()); } };
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); process.exit(1); } console.log('ok -', m); };
const body = () => w.document.querySelector('#pbody');
const $ = s => w.document.querySelector(s);
const R = w.__race;
assert(T.ADDONS.list.every(a => a.ok), 'аддон завантажився: ' + T.ADDONS.list.map(a => a.name + (a.ok ? '' : ' ✗ ' + a.err)).join(', '));
const pv = w.document.getElementById('mm-pvp');
assert(pv && !pv.classList.contains('mm-locked') && /Гонки/.test(pv.textContent), 'кнопка PVP у головному меню відкрита й показує «Гонки на кріслах»');
pv.click(); assert(w.document.querySelector('#mm-pvp-pick [data-pm="chairrace"]'), 'PVP → вибір режиму: є «Гонки на кріслах»');
w.document.querySelector('#mm-pvp-pick .x').click();
T.startGame(true); T.P.tut = -1; T.pl.hp = 9999; step(.3);
// три поверхи збудовані: острів, фасад, стіни, меблі, траса — все в межах r
R.VARS.forEach((V, i) => {
  const isl = T.ISLMAP[V.id], F = V.F;
  const corners = [[F.x0, F.z0], [F.x1, F.z0], [F.x0, F.z1], [F.x1, F.z1]];
  const st = T.STATICS.filter(o => o.x > F.x0 - 1 && o.x < F.x1 + 1 && o.z > F.z0 - 1 && o.z < F.z1 + 1).length;
  const trIn = V.TR.every(p => p.x > V.BB.x0 && p.x < V.BB.x1 && p.z > V.BB.z0 && p.z < V.BB.z1);
  assert(isl && Math.hypot(isl.x - [300, 440, 580][i], isl.z + 300) < .1 && corners.every(([x, z]) => Math.hypot(x - isl.x, z - isl.z) < isl.r - .5) && corners.every(([x, z]) => T.terrainAt(x, z) === 'land'),
    `«${V.n}»: острів на (${isl.x}, ${isl.z}), поверх ${(F.x1 - F.x0).toFixed(0)}×${(F.z1 - F.z0).toFixed(0)} вміщується в r=${isl.r}`);
  assert(st > 250 && V.WALLS.length > 100 && trIn && V.N > 100 && R.V.vis[i] && R.V.vis[i].boxes.length === 4, `«${V.n}»: ${st} твердих перешкод, ${V.WALLS.length} шматків стін, траса ${V.N} точок у межах поверху, модель зібрана`);
});
{ const V2 = R.VARS[1], c = { x: V2.cx, z: V2.cz }; assert(!T.STATICS.some(o => Math.hypot(o.x - c.x, o.z - c.z) < 2.8), '«Атріум»: на перехресті вісімки стін нема — проїзд в обидва боки'); }
{ const V3 = R.VARS[2], S = V3.SC; assert(S && !T.STATICS.some(o => o.x > S.x0 + .3 && o.x < S.x1 - .3 && o.z > S.z0 && o.z < S.z1), '«Колл-центр»: прохід пожежних дверей вільний від стін і меблів'); }
T.keydown('Escape'); step(.05);
assert(/🥊 PVP/.test(body().textContent) && body().querySelector('[data-mode="chairrace"]'), 'у меню паузи розділ PVP з гонками');
body().querySelector('[data-mode="chairrace"]').click(); step(.6);
assert(Math.hypot(T.pl.x - R.START.x, T.pl.z - R.START.z) < 2.2 && R.floorAt(T.pl.x, T.pl.z) === 0, 'переніс у ліфтовий хол поверху 42 до старту');
assert($('#mlobby') && $('#mlobby [data-lv]'), 'одразу після входу відкрився попап лобі');
assert($('#cr-intro'), 'картка «як грати» з’явилась'); $('#cr-intro button').click(); assert(!$('#cr-intro'), 'картку закрито');
// таблички кімнат: тієї, де стоїш, — плавно зникає; решта видно; виходиш — повертається
{ const sx = T.pl.x, sz = T.pl.z, L = R.V.rooms[0], os = L.find(o => /Опенспейс/.test(o.r.n)), others = L.filter(o => o !== os), V0 = R.VARS[0];
  const vis = o => o.e.style.display !== 'none' && +o.e.style.opacity > .95;
  assert(L.every(o => o.r.b) && R.VARS.every(V => V.rooms.every(r => R.inRoom(V, r, V.cx + (r.b[0] + r.b[2]) / 2, V.cz + (r.b[1] + r.b[3]) / 2))), 'у кожної кімнати є прямокутник');
  assert(os && vis(os), 'у ліфтовому холі табличка «Опенспейс» видна');
  T.pl.x = V0.cx - 13; T.pl.z = V0.cz - 4.5; step(.05); const mid = +os.e.style.opacity;
  step(.3); assert(R.inRoom(V0, os.r, T.pl.x, T.pl.z) && mid > 0 && mid < 1 && +os.e.style.opacity === 0 && os.e.style.display === 'none', `зайшов в опенспейс — табличка плавно зникла (${mid} → 0)`);
  assert(others.filter(o => !R.inRoom(V0, o.r, T.pl.x, T.pl.z)).every(o => +o.e.style.opacity > .95), 'таблички інших кімнат лишились');
  T.pl.x = sx; T.pl.z = sz; step(.4); assert(vis(os), 'вийшов — табличка повернулась'); }
// стіна лобі (скло) не пускає на трасу пішки
{ const sx = T.pl.x, sz = T.pl.z; T.input.jx = 0; T.input.jz = 1; step(2); T.input.jz = 0; assert(T.pl.z < R.VARS[0].BB.z0 - .2, 'скляна стіна лобі не пускає на трасу пішки'); T.pl.x = sx; T.pl.z = sz; step(.1); }
// лобі-попап: відкрився сам при вході; майданчиків голосування на підлозі більше нема
const lob = () => $('#mlobby');
assert(lob() && lob().querySelectorAll('[data-lv]').length === 3 && /Я готовий/.test(lob().textContent), 'увійшов у режим — відкрився попап лобі з 3 картками трас і «Я готовий»');
assert([...lob().querySelectorAll('.map .im')].every((e, i) => e.getAttribute('style').includes(`addons/chairrace/map${i + 1}.jpg`)), 'у карток картинки addons/chairrace/map1..3.jpg');
assert(R.VARS.every(V => !V.PADS) && !/майданчик/.test(w.document.body.innerHTML), 'жодних 🗳️ майданчиків / табличок голосування на поверсі');
// нічия на старті — жереб серед лідерів; без голосів — ротація
{ R.ST.votes = { a: 0, b: 2 }; const seen = new Set(); for (let i = 0; i < 60; i++) seen.add(R.pickVar(true)); assert(seen.size === 2 && seen.has(0) && seen.has(2), 'нічия 1:1 — випадково одна з двох лідерів'); R.ST.votes = {}; assert(R.pickVar(true) === R.ST.def, 'без голосів — траса за ротацією'); }
// голос кліком по картці №3
lob().querySelector('[data-lv="2"]').click(); step(.1);
assert(R.ST.v === 2 && R.ST.votes.me === 2 && R.VV === R.VARS[2] && lob().querySelector('[data-lv="2"]').classList.contains('mine') && /🗳️ 1/.test(lob().querySelector('[data-lv="2"] .vc').textContent), 'клік по картці «Колл-центр» — голос зараховано, лічильник 1, картка підсвічена');
// «Сховати» — попап зник, підказка й F у холі відкривають знову
lob().querySelector('.hide').click(); step(.2);
assert(!lob() && /F/.test($('#race-goal').textContent) && /Лобі сховано/.test($('#race-goal').textContent), '«Сховати» — попап закрито, внизу підказка «F — відкрити лобі»');
let it = T.getInteract(); assert(it && /Відкрити лобі/.test(it.l), 'F у ліфтовому холі — «Відкрити лобі»'); it.fn(); step(.1);
assert(lob(), 'F — попап знову відкрито');
lob().querySelector('.hide').click(); step(.1); T.openPanel('ax_chairrace'); step(.05);
{ const btn = body().querySelector('[data-cr="lobby"]'); assert(btn, 'у вкладці «🪑 Гонки» є кнопка «🗳️ Лобі»'); btn.click(); step(.1); assert(lob() && !T.panel, 'кнопка «🗳️ Лобі» відкрила попап'); }
R.AU.noBotArms = true;   // у тесті боти не кидаються бомбами (передбачуваність)
// «Я готовий» — офлайн старт одразу, боти займають місця, попап закривається
lob().querySelector('.rdy').click(); step(.1);
assert(R.ST.ph === 'count' && R.ST.racers.length === 4 && R.RC.on, '«Я готовий» — одразу відлік, боти зайняли місця, я в кріслі');
assert(!lob(), 'заїзд почався — попап закрито');
assert(R.floorAt(T.pl.x, T.pl.z) === 2 && R.ST.v === 2, 'гра перенесла на поверх 63 (не трасу за замовчуванням)');
const mb = $('#modebar');
assert(mb && !mb.hidden && /💣/.test(mb.textContent) && /🪠/.test(mb.textContent) && /🧯/.test(mb.textContent) && /🍾/.test(mb.textContent) && $('#weapon').hidden && $('#drinks').hidden, 'хотбар режиму: 💣 Бомба, 🪠 Вантуз, 🧯 Вогнегасник, 🍾 Молотов (звичайна зброя й напої сховані)');
assert(R.RC.foam === R.FOAM_START && R.RC.molly === 1, `на старті ${R.FOAM_START} с піни у вогнегаснику й 1 коктейль Молотова`);
assert(R.RC.bombs === 2, 'на старті 2 бомби');
step(4); assert(R.ST.ph === 'race', 'ПОЇХАЛИ!');
// автопілот у тесті: тримаємо джойстик у бік траси попереду
const drive = s => { for (let i = 0; i < s * 20; i++) { const q = R.TR[(R.RC.idx + 7) % R.N], dx = q.x - R.RC.x, dz = q.z - R.RC.z, d = Math.hypot(dx, dz) || 1; T.input.jx = dx / d; T.input.jz = dz / d; step(.05); } T.input.jx = T.input.jz = 0; };
const x0 = R.RC.x, z0 = R.RC.z; drive(1.5);
assert(Math.hypot(R.RC.x - x0, R.RC.z - z0) > 6 && R.RC.lap === 0, `крісло їде (коло ${R.RC.lap + 1})`);
// стіна траси не випускає
{ const p = R.TR[R.RC.idx]; R.RC.x += -p.dz * 6; R.RC.z += p.dx * 6; T.pl.x = R.RC.x; T.pl.z = R.RC.z; step(.05); const q = R.TR[R.RC.idx]; const lat = Math.abs(-(R.RC.x - q.x) * q.dz + (R.RC.z - q.z) * q.dx); assert(lat < 2.8 || R.RC.sc, 'борти траси не випускають з траси'); }
const put = (i, o = 0) => { const p = R.TR[i % R.N]; R.RC.x = p.x - p.dz * o; R.RC.z = p.z + p.dx * o; R.RC.idx = i % R.N; R.RC.prev = R.RC.idx; R.RC.h = Math.atan2(p.dz, p.dx); R.RC.spin = 0; R.RC.slip = 0; R.RC.slow = 0; R.RC.pull = null; T.pl.x = R.RC.x; T.pl.z = R.RC.z; return p; };
const far = () => R.ST.racers.filter(r => r.bot).forEach((b, k) => { const q = R.TR[(R.RC.idx + R.N / 2 + k * 6) % R.N | 0]; b.x = q.x; b.z = q.z; b.idx = (R.RC.idx + R.N / 2 + k * 6) % R.N | 0; b.prevIdx = b.idx; b.v = 0; });
// предмети
put(R.N * .3 | 0); far();
R.RC.item = 'coffee'; R.useItem(); assert(R.RC.boost > 1 && !R.RC.item, '☕ кава — прискорення');
R.RC.item = 'folder'; R.useItem(); step(.1); assert(R.ST.traps.length >= 1, '📁 папка — пастка на трасі');
{ const tp = R.ST.traps[R.ST.traps.length - 1]; R.RC.spin = 0; R.RC.x = tp.x; R.RC.z = tp.z; T.pl.x = tp.x; T.pl.z = tp.z; step(.1); assert(R.RC.spin > 0, 'наїхав на пастку — закрутило'); R.RC.spin = 0; }
{ const bot = R.ST.racers.find(r => r.bot); const p = put(R.N * .3 | 0); far(); bot.v = 0; R.RC.item = 'stapler'; bot.x = R.RC.x + p.dx * 4; bot.z = R.RC.z + p.dz * 4; bot.spin = 0; R.useItem(); step(.3); assert(bot.spin > 0, '📎 степлер влучив у бота — закрутило'); }
R.RC.item = 'tea'; R.useItem(); step(.05); assert(R.ST.racers.some(r => r.bot && r.drunk > 0), '🍵 чай — лідер-бот п\'яніє');
// 💣 бомба: клавіша 1 — дугою вперед; вибух крутить і гальмує бота
{ const bot = R.ST.racers.filter(r => r.bot)[1]; const p = put(R.N * .3 | 0); far(); R.RC.v = 0; bot.x = R.RC.x + p.dx * 8; bot.z = R.RC.z + p.dz * 8; bot.spin = 0; bot.slow = 0; bot.v = 0; bot.idx = R.nearIdx(bot.x, bot.z); bot.prevIdx = bot.idx;
  const bx = bot.x, bz = bot.z; T.keydown('Digit1'); assert(R.RC.bombs === 1, '1 — кинув бомбу (лишилась 1)');
  for (let i = 0; i < 30; i++) { bot.x = bx; bot.z = bz; bot.v = 0; step(.05); if (bot.spin > 0) break; }
  assert(bot.spin > 0 && bot.slow > 0, `💥 бомба влучила: бота закрутило й пригальмувало`); }
// 🪠 вантуз: клавіша 2 — чіпляє бота попереду, мене тягне вперед, його гальмує
{ const bot = R.ST.racers.filter(r => r.bot)[2]; const p = put(R.N * .3 | 0); far(); R.RC.v = 2; bot.x = R.RC.x + p.dx * 8; bot.z = R.RC.z + p.dz * 8; bot.spin = 0; bot.slow = 0; bot.v = 6; bot.h = R.RC.h; bot.idx = R.nearIdx(bot.x, bot.z); bot.prevIdx = bot.idx;
  const sx = R.RC.x, sz = R.RC.z; T.keydown('Digit2'); let pulled = false;
  for (let i = 0; i < 12; i++) { step(.05); if (R.RC.pull) pulled = true; }
  assert(pulled && bot.slow > 0 && Math.hypot(R.RC.x - sx, R.RC.z - sz) > 4 && R.RC.plCd > 0, '🪠 вантуз зачепив бота: мене смикнуло вперед, бота пригальмувало, перезарядка');
  T.keydown('Digit2'); assert(R.V.plungers.length === 0, 'на перезарядці вантуз не стріляє'); }
// 🧯 вогнегасник-реактив: 3 — тяга вперед, піна витрачається, білий шлейф; скінчилась — вимикається
{ const p = put(R.N * .3 | 0); far(); R.RC.v = 3; R.RC.boost = 0; const sx = R.RC.x, sz = R.RC.z;
  T.keydown('Digit3'); assert(R.RC.jet && R.ST.racers.find(r => r.k === 'me').jet === 1, '3 — увімкнув 🧯 реактивну піну (сервер/автор бачить прапорець jet)');
  T.input.jx = p.dx; T.input.jz = p.dz; step(.4); T.input.jx = T.input.jz = 0;
  const c = R.V.chairs.get('me');
  assert(R.RC.v > R.VBOOST + 3 && R.RC.foam < R.FOAM_START - .3 && c && c.ext.visible, `🧯 тяга: швидкість ${R.RC.v.toFixed(1)} > кави-бусту ${R.VBOOST}, піна ${R.RC.foam.toFixed(1)} с, вогнегасник на кріслі видно`);
  assert(/🧯/.test($('#race-goal').textContent), 'підказка внизу розповідає про реактивну піну');
  T.keydown('Digit3'); assert(!R.RC.jet && R.ST.racers.find(r => r.k === 'me').jet === 0, '3 ще раз — вимкнув, піну зекономив');
  put(R.N * .3 | 0); far(); const f0 = R.RC.foam; T.keydown('Digit3'); for (let i = 0; i < 80 && R.RC.jet; i++) { put(R.N * .3 | 0); step(.05); }
  assert(!R.RC.jet && R.RC.foam === 0 && f0 > 0, 'піна скінчилась — реактив вимкнувся сам');
  T.keydown('Digit3'); assert(!R.RC.jet, 'без піни 3 не вмикає реактив'); }
// 🍾 коктейль Молотова: 4 — пляшка дугою, на трасі палає калюжа; бот у ній крутиться й обпалюється
{ const bot = R.ST.racers.filter(r => r.bot)[1]; const p = put(R.N * .3 | 0); far(); R.RC.v = 0; R.ST.fires.length = 0; bot.x = R.RC.x + p.dx * 7; bot.z = R.RC.z + p.dz * 7; bot.spin = 0; bot.slow = 0; bot.burn = 0; bot.burnCd = 0; bot.v = 0; bot.idx = R.nearIdx(bot.x, bot.z); bot.prevIdx = bot.idx;
  const bx = bot.x, bz = bot.z; T.keydown('Digit4'); assert(R.RC.molly === 0 && R.V.bombs.length === 1, '4 — кинув коктейль Молотова (пляшка летить)');
  for (let i = 0; i < 30 && !R.ST.fires.length; i++) { bot.x = bx; bot.z = bz; bot.v = 0; step(.05); }
  const f = R.ST.fires[0]; assert(f && Math.hypot(f.x - bx, f.z - bz) < 1 && R.V.fires.size === 1, `🔥 пляшка розбилась — на трасі палає калюжа (${R.ST.fires.length}), видно полум'я`);
  for (let i = 0; i < 10 && !(bot.burn > 0); i++) { bot.x = bx; bot.z = bz; bot.v = 0; step(.05); }
  assert(bot.burn > 0 && bot.spin > 0 && bot.slow > 0, '🔥 бот у калюжі: закрутило, пригальмувало, сідушку обпалило');
  // я в'їжджаю у вогонь
  const n0 = R.RC.nBurn; R.RC.x = f.x; R.RC.z = f.z; T.pl.x = f.x; T.pl.z = f.z; R.RC.spin = 0; R.RC.burnCd = 0; step(.05);
  assert(R.RC.nBurn === n0 + 1 && R.RC.burn > 0 && R.RC.spin > 0 && R.RC.slow > 0 && R.ST.racers.find(r => r.k === 'me').burn > 0, '🔥 я в\'їхав у калюжу — крутить, гальмує, сідушка в кіптяві (видно іншим)');
  assert(R.V.chairs.get('me').soot.visible, 'кіптява на моєму кріслі видно');
  T.keydown('Digit4'); assert(R.V.bombs.length === 0, 'пляшок нема — 4 нічого не кидає');
  step(R.FIRE_T + .3); assert(!R.ST.fires.length && R.V.fires.size === 0, `калюжа догоріла за ${R.FIRE_T} с і зникла`); }
// 🧯 піна гасить вогонь: їду з реактивом крізь калюжу — вона згасає, мене не обпалює
{ const p = put(R.N * .35 | 0); far(); R.RC.foam = 3; R.RC.burn = 0; R.RC.burnCd = 0; const f = R.igniteAt(R.RC.x + p.dx * 3, R.RC.z + p.dz * 3, 'Бот Кент'); const n0 = R.RC.nBurn, d0 = R.RC.nDouse;
  T.keydown('Digit3'); for (let i = 0; i < 20 && R.ST.fires.length; i++) { T.input.jx = p.dx; T.input.jz = p.dz; step(.05); } T.input.jx = T.input.jz = 0;
  assert(!R.ST.fires.some(q => q.id === f.id) && R.RC.nDouse === d0 + 1 && R.RC.nBurn === n0, '🧯 проїхав з піною крізь вогонь — загасив, сідушка ціла');
  if (R.RC.jet) T.keydown('Digit3'); }
// коробки «?» дають піну й пляшки
{ R.RC.item = ''; R.AU.forceItem = 'ext'; R.ST.boxes[1] = [1, 1, 1]; const f0 = R.RC.foam; put(R.ITEM_SPOTS[1]); far(); step(.2); assert(R.RC.foam > f0, `коробка «?» — 🧯 +піна (${f0.toFixed(1)} → ${R.RC.foam.toFixed(1)})`);
  R.AU.forceItem = 'molly'; R.ST.boxes[1] = [1, 1, 1]; const m0 = R.RC.molly; put(R.ITEM_SPOTS[1]); far(); step(.2); assert(R.RC.molly === m0 + 1, '🍾 коробка «?» — ще один коктейль Молотова');
  R.AU.forceItem = null; }
// коробка з предметом
{ R.RC.item = ''; const b0 = R.RC.bombs, f0 = R.RC.foam, m0 = R.RC.molly; R.ST.boxes[1] = [1, 1, 1]; put(R.ITEM_SPOTS[1]); far(); step(.2); assert(R.RC.item || R.RC.bombs > b0 || R.RC.foam > f0 || R.RC.molly > m0, `коробка «?» дала: ${R.RC.item || (R.RC.bombs > b0 ? '💣 бомбу' : R.RC.foam > f0 ? '🧯 піну' : '🍾 пляшку')}`); }
// 💦 калюжа — ковзає
{ const q = R.VV.PUD[1]; put(R.nearIdx(q.x, q.z)); far(); R.RC.x = q.x; R.RC.z = q.z; T.pl.x = q.x; T.pl.z = q.z; step(.05); assert(R.RC.slip > 0, '💦 калюжа прибиральниці — крісло ковзає'); }
// 💨 дрифт-буст: накопичений дрифт на прямій перетворюється на прискорення
{ put(R.N * .3 | 0); far(); R.RC.boost = 0; R.RC.v = 10; R.RC.drift = .8; R.RC.driftIdle = 0; const n0 = R.RC.nDrift; drive(.3); assert(R.RC.nDrift === n0 + 1 && R.RC.drift === 0, '💨 дрифт → супер-буст на виході з повороту'); }
// 🌬️ слипстрім: їду позаду бота — тяга
{ const bot = R.ST.racers.filter(r => r.bot)[0]; const n0 = R.RC.nDraft; let ok = false;
  for (let i = 0; i < 40 && !ok; i++) { const p = put(R.N * .3 | 0, 0); if (i === 0) far(); R.RC.v = 10; R.RC.boost = 0; bot.x = R.RC.x + p.dx * 3.5; bot.z = R.RC.z + p.dz * 3.5; bot.v = 0; bot.spin = 0; T.input.jx = p.dx; T.input.jz = p.dz; step(.05); ok = R.RC.nDraft > n0; }
  T.input.jx = T.input.jz = 0; assert(ok, '🌬️ позаду суперника — слипстрім-буст'); }
// 🚒 пожежні двері-зріз: відчинено — проїжджаю з першого рядку в другий, зачинено — борт
{ const S = R.VV.SC, cl = R.VV.ZOMB.find(z => z.mop && z.ax === 1); cl.x += 100; far();
  const tryCut = open => { const p = put(S.ia); R.RC.x = (S.x0 + S.x1) / 2; T.pl.x = R.RC.x; R.RC.h = Math.PI / 2; R.RC.v = 7; R.ST.t = open ? 18.2 : 23; for (let i = 0; i < 26; i++) { T.input.jx = 0; T.input.jz = 1; step(.05); if (open) R.ST.t = 18.2; else R.ST.t = 23; } T.input.jz = 0; return R.RC.z; };
  const zOpen = tryCut(true); assert(Math.abs(zOpen - S.bz) < 2.2 && Math.abs(R.RC.idx - S.ib) < 8, `відчинені пожежні двері — зріз у другий ряд (idx ${R.RC.idx} ≈ ${S.ib})`);
  const zShut = tryCut(false); assert(Math.abs(zShut - R.TR[S.ia].z) < 2.4, 'зачинені двері — крісло лишається в коридорі'); cl.x -= 100; }
// проходимо 3 кола — фініш
put(R.N - 2); R.RC.lap = 0;
let guard = 0; const c0 = T.P.coins;
while (R.ST.ph === 'race' && guard++ < 200) { R.RC.spin = 0; R.RC.drunk = 0; R.RC.slip = 0; drive(1); if (R.RC.lap < 3 && guard % 3 === 0) { put(R.N - 3); } }
assert(R.RC.fin || R.ST.ph !== 'race', `3 кола — фініш (коло ${R.RC.lap})`);
step(.5); assert(R.ST.ph === 'end' && R.ST.res[0], 'гонка скінчилась — є результати');
assert(T.P.coins > c0 && T.P.addons.chairrace.races === 1, `нагорода за місце: +${T.P.coins - c0} 🪙 (${R.ST.res.indexOf('me') + 1} місце)`);
assert(!R.RC.on && $('#modebar').hidden && !$('#weapon').hidden, 'після фінішу встаєш з крісла — звичайний хотбар повернувся');
step(9); assert(R.ST.ph === 'idle' && R.ST.v === 0 && !Object.keys(R.ST.votes).length, 'траса вільна; наступна за замовчуванням — інший поверх (ротація), голоси скинуто');
// вихід через меню режиму посеред заїзду — хотбар відновлюється
{ assert(lob() && R.floorAt(T.pl.x, T.pl.z) >= 0, 'після заїзду лобі відкрилось знову'); lob().querySelector('.rdy').click(); step(7); assert(R.RC.on && !$('#modebar').hidden && R.floorAt(T.pl.x, T.pl.z) === 0, 'новий заїзд на поверсі 42 (ротація) — знову в кріслі');
  R.RC.x = R.RC.x; T.pl.x += 30; step(.1); assert(!R.RC.on && $('#modebar').hidden && R.ST.ph === 'idle', 'перенесло деінде — встав з крісла, хотбар відновлено, заїзд скасовано'); }
// попап закривається, коли йдеш з режиму
T.keydown('Escape'); step(.05); body().querySelector('[data-mode="chairrace"]').click(); step(.6);
assert(lob(), 'знову в лобі — попап відкрився'); T.pl.x += 200; step(.1); assert(!lob(), 'пішов з режиму — попап закрився');
console.log('ALL OK'); process.exit(0);
