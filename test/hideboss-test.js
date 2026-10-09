// Тест режиму «Сховайся від боса» у грі без сервера: офісником проти бота-боса і босом проти ботів.
// Запуск: node test/hideboss-test.js
const fs = require('fs'), path = require('path');
const { JSDOM } = require('jsdom');
const THREE = require('three');
const root = path.join(__dirname, '..');
const dom = new JSDOM(fs.readFileSync(path.join(root, 'src/00_shell.html'), 'utf8') + '</body></html>', { pretendToBeVisual: true, runScripts: 'outside-only', url: 'https://example.org/' });
const w = dom.window;
class FakeRenderer { constructor() { this.shadowMap = {}; } setPixelRatio() { } setSize() { } render() { } }
w.THREE = Object.assign({}, THREE, { WebGLRenderer: FakeRenderer });
w.matchMedia = () => ({ matches: false }); w.requestAnimationFrame = () => 0; w.console.warn = () => { }; w.__NO_NET = true; w.__ADDON_TEST = true; w.__hidebossFastLobby = 1;
const IV = []; w.setInterval = (f, ms) => { if (ms <= 100) IV.push(f); return 0; };
w.setTimeout = f => { f(); return 0; };
w.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: (o, k) => k in o ? o[k] : () => { }, set: (o, k, v) => { o[k] = v; return true; } });
w.__ADDON_CODE = [{ id: 'hideboss', src: 'hideboss/addon.js', code: fs.readFileSync(path.join(root, 'addons/_examples/hideboss/addon.js'), 'utf8') }];
let src = fs.readdirSync(path.join(root, 'src')).filter(f => f.endsWith('.js')).sort().map(f => fs.readFileSync(path.join(root, 'src', f), 'utf8')).join('\n');
src += ';window.__T={get paused(){return paused},get running(){return running},get P(){return P},get hero(){return hero},get MODEBAR(){return MODEBAR},get gameTime(){return gameTime},pl,input,STATICS,ADDONS,ISLMAP,startGame,frame,openPanel,closePanel,get panel(){return panel},getInteract:()=>getInteract(),attack:()=>attack(),renderPanel,keydown:c=>dispatchEvent(new KeyboardEvent("keydown",{code:c})),keyup:c=>dispatchEvent(new KeyboardEvent("keyup",{code:c}))};';
w.eval(src);
const T = w.__T; let now = 1000;
const step = s => { for (let i = 0; i < s * 60; i++) { now += 16.7; T.frame(now); if (i % 3 === 0) IV.forEach(f => f()); } };
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); process.exit(1); } console.log('ok -', m); };
const body = () => w.document.querySelector('#pbody');
assert(T.ADDONS.list.every(a => a.ok), 'аддон завантажився: ' + T.ADDONS.list.map(a => a.name + (a.ok ? '' : ' ✗ ' + a.err)).join(', '));
assert(w.document.querySelector('#mm-hideboss .mm-subtitle').textContent === 'Сховайся від боса', 'у меню картка «ХОВАНКИ · Сховайся від боса»');
const H = w.__hideboss, ST = H.ST, F0 = H.FL[0];

/* ===== 0. Три поверхи: кожен збудований, вміщається в острів, навігація працює ===== */
assert(H.FL.length === 3 && new Set(H.FL.map(F => F.n)).size === 3, 'три поверхи: ' + H.FL.map(F => F.n).join(' · '));
for (const [v, F] of H.FL.entries()) {
  const isl = T.ISLMAP[F.id];
  assert(isl && isl.x === F.x && isl.z === F.z, `«${F.n}» — свій острів у (${F.x}, ${F.z})`);
  const corner = Math.hypot(F.hx + 1, F.hz + 1);
  assert(corner < isl.r, `поверх ${F.hx * 2}×${F.hz * 2} м вміщається в r=${isl.r} (кут ${corner.toFixed(1)})`);
  const ss = T.STATICS.filter(o => Math.abs(o.x - F.x) <= F.hx + .5 && Math.abs(o.z - F.z) <= F.hz + .5);
  assert(ss.length > 250 && F.furn.length > 60 && F.rooms.length >= 10 && F.desks.length >= 6, `«${F.n}»: стін і меблів ${ss.length}, предметів ${F.furn.length}, кімнат ${F.rooms.length}, столів ${F.desks.length}`);
  // периметр закритий: стіни-статики по всіх чотирьох краях
  const edge = (fx, fz) => ss.some(o => Math.abs(o.x - fx) < .6 && Math.abs(o.z - fz) < .6);
  assert(edge(F.x, F.z - F.hz) && edge(F.x, F.z + F.hz) && edge(F.x - F.hx, F.z) && edge(F.x + F.hx, F.z), `«${F.n}»: зовнішні стіни не випускають з хмарочоса`);
  assert([F.spawn, F.board, F.carpet, F.bossSpot].every(p => H.floorAt(p.x, p.z) === v), `«${F.n}»: хол, стійка лобі, кабінет боса — на своєму поверсі`);
  assert(!F.pads && !F.role, `«${F.n}»: килимків для голосування й таблички ролі більше нема`);
  assert(H.navFree(F.spawn.x, F.spawn.z), `«${F.n}»: ліфтовий хол вільний`);
  const M = F.meet, hs = H.hideSpots(v), ms = hs.filter(h => H.inRoomR(F, M, h.x, h.z, .3));
  assert(ms.length >= 3, `«${F.n}»: у «${M.n}» є де сховатись на зборах (${ms.length})`);
  for (const h of [ms[0], hs[hs.length - 1], hs[hs.length >> 1]]) { const rt = H.route(F.spawn.x, F.spawn.z, h.x, h.z); assert(rt.length > 3 && rt.every(p => H.floorAt(p.x, p.z) === v && H.navFree(p.x, p.z)), `«${F.n}»: від ліфта до «${H.FT[h.f.t].n}» у «${H.roomAt(h.x, h.z).n}» є маршрут (${rt.length} точок)`); }
 assert(hs.length > 40 && hs.some(h => H.canRoll(h.f.t)), `«${F.n}»: сховків для ботів ${hs.length}, є й на коліщатках`);
}
// кидалки: на кожному поверсі кілька помітних місць підбору кожного типу (поза кабінетом боса, досяжні від ліфта)
for (const [v, F] of H.FL.entries()) {
  const pk = H.picks(v), n = t => pk.filter(s => s.t === t).length;
  assert(n('pl') >= 2 && n('pp') >= 4 && n('bk') >= 2 && n('ex') >= 1, `«${F.n}»: ✈️ папір ×${n('pl')}, 🧻 макулатура ×${n('pp')}, 📘 шафи ×${n('bk')}, 🧯 вогнегасники ×${n('ex')}`);
  assert(pk.every(s => H.floorAt(s.x, s.z) === v && !H.inOffice(s.x, s.z)), `«${F.n}»: усі місця підбору на поверсі, не в кабінеті боса`);
}
T.startGame(true); T.P.tut = -1; T.pl.hp = 9999; step(.3);
T.keydown('Escape'); step(.05); body().querySelector('[data-mode="hideboss"]').click(); step(.5);
assert(Math.hypot(T.pl.x - H.SPAWN.x, T.pl.z - H.SPAWN.z) < 1, 'Esc → «Сховайся від боса» переносить в офіс');
const lob = () => w.document.getElementById('mlobby');
assert(w.document.getElementById('hb-intro') && !lob(), 'до старту: спершу інструкція (лобі під нею не відкриваємо)');
w.document.querySelector('#hb-intro button').click(); assert(!w.document.getElementById('hb-intro') && T.P.addons.hideboss.intro === 1, 'інструкцію закрив — більше не показується');
step(.1);
assert(lob() && lob().querySelectorAll('.map').length === 3 && /Сховайся від боса/.test(lob().textContent), 'вхід у режим — відкрилось вікно лобі з трьома картками поверхів');
assert([1, 2, 3].every(i => lob().innerHTML.includes(`addons/hideboss/map${i}.jpg`)), 'на картках — картинки поверхів map1…map3.jpg');
assert(/Ти/.test(lob().querySelector('.who').textContent) && /офісник/.test(lob().textContent), 'у лобі: список гравців (⏳ Ти) і роль, якою граєш сам');
assert(H.goal().id === 'lobby' && /Я готовий/.test(w.document.getElementById('hideboss-goal').textContent) && /Сховайся від боса/.test(w.document.getElementById('hideboss-goal').textContent + w.document.getElementById('hideboss-hud').textContent), 'HUD і рядок «👉 обери поверх і натисни Я готовий»');
assert(!H.FL.some(F => T.STATICS.some(o => F.role && Math.hypot(o.x - F.role.x, o.z - F.role.z) < .3)), 'табличок 🎭 РОЛЬ нема');
// «Сховати» — вікно закривається, підказка веде до стійки «🗳️ ЛОБІ», F там — знову відкриває
lob().querySelector('.hide').click(); step(.1);
assert(!lob() && H.goal().id === 'start:0' && /ЛОБІ/.test(w.document.getElementById('hideboss-goal').textContent), '«Сховати» — лобі закрите, підказка: F біля стійки 🗳️ ЛОБІ');
T.pl.x = H.BOARD.x; T.pl.z = H.BOARD.z - 1.2; step(.1);
{ const i = T.getInteract(); assert(i && /лобі/i.test(i.l), 'біля стійки F — «Відкрити лобі»'); i.fn(); step(.1); assert(lob(), 'F — лобі знову відкрите'); }
lob().querySelector('.hide').click(); step(.1); T.openPanel('ax_hideboss'); step(.05);
body().querySelector('[data-hb="lobby"]').click(); step(.1); assert(lob() && !T.panel, 'вкладка 🙈 Хованки → «🗳️ Лобі» теж відкриває вікно');
assert(H.FURN.length > 60 && ['chair', 'cooler', 'ficus', 'copier', 'cabinet', 'box', 'trash', 'coffee', 'sofa', 'desk'].every(t => H.FURN.some(f => f.t === t)), `офіс заставлений меблями (${H.FURN.length})`);
// стіни офісу не випускають
T.pl.x = F0.x + 15.5; T.pl.z = F0.z + 10.5; step(.05); for (let k = 0; k < 40; k++) { T.pl.z += .1; step(.02); } assert(T.pl.z < F0.z + 12.8, 'з поверху не вийдеш крізь скляний фасад');

const nearPk = (x, z) => H.FL.some((F, v) => H.picks(v).some(sp => Math.hypot(sp.x - x, sp.z - z) < 2.4));
const hideAt = t => { const h = H.hideSpots().find(s => s.f.t === t && !H.DESKS.some(d => Math.hypot(d.x - s.x, d.z - s.z) < 2.6) && !nearPk(s.x, s.z)); T.pl.x = h.x; T.pl.z = h.z; step(.05); return h; };
const tall = T.STATICS.filter(o => o.h >= 2.4);
const segD = (px, pz, x0, z0, x1, z1) => { const dx = x1 - x0, dz = z1 - z0, L = dx * dx + dz * dz || 1, u = Math.max(0, Math.min(1, ((px - x0) * dx + (pz - z0) * dz) / L)); return Math.hypot(px - x0 - dx * u, pz - z0 - dz * u); };
const clear = (x0, z0, x1, z1) => !tall.some(o => segD(o.x, o.z, x0, z0, x1, z1) < o.r + .12) && ST.ro.every(e => !e.bot || e.c || segD(e.x, e.z, x0, z0, x1, z1) > 1.1 || Math.hypot(e.x - x1, e.z - z1) < .5);
const standOff = (x, z, d) => { for (let k = 0; k < 36; k++) { const a = k / 36 * Math.PI * 2, px = x + Math.sin(a) * d, pz = z + Math.cos(a) * d; if (H.floorAt(px, pz) === ST.v && H.navFree(px, pz) && !H.inOffice(px, pz) && clear(px, pz, x, z)) return { x: px, z: pz }; } return null; };
const aimKey = (x, z, key) => { T.input.aimOk = true; T.input.ax = x; T.input.az = z; T.keydown(key); T.keyup(key); };
const ready = () => { step(.1); assert(lob(), 'лобі відкрите'); lob().querySelector('.rdy').click(); for (let k = 0; k < 40 && !ST.on; k++) step(.1); };

/* ===== 1. Офісником проти бота-боса ===== */
T.pl.x = H.SPAWN.x; T.pl.z = H.SPAWN.z; step(.1);
assert(/Чекаємо гравців 1\/5/.test(lob().querySelector('.row').textContent) && !ST.lf, 'у лобі: «Чекаємо гравців 1/5 — тисни Я готовий, боти доповнять»');
// лобі заповнюється ботами (тест — кроками по 0,2 с; у грі — 4 с, потім кожні 2,5 с)
{
  const toasts = () => w.document.getElementById('toasts').textContent;
  lob().querySelector('.rdy').click(); step(.05);
  assert(!ST.on && ST.lf && /Чекаємо гравців 1\/5/.test(lob().querySelector('.row').textContent), '✅ «Я готовий» — раунд не стартує одразу: «Чекаємо гравців 1/5 — 🤖 боти доповнять лобі…»');
  step(.2);
  const b1 = ST.lb.filter(r => r[3]);
  assert(b1.length >= 1 && /🤖 Бот/.test(lob().querySelector('.who').textContent) && /🤖 Бот .* приєднався/.test(H.V.lbot.txt) && /приєднався · \d\/5/.test(lob().querySelector('.row').textContent), `бот сів у лобі: «🤖 ${b1[0][0]}» ✅ у списку, тост і «приєднався · N/5»`);
  for (let k = 0; k < 20 && ST.lb.length < 5; k++) step(.1);
  assert(!ST.on && ST.lb.length === 5 && ST.lb.filter(r => r[3]).length === 4 && ST.lb.filter(r => r[3]).every(r => r[1]), 'лобі повне: я + 4 боти (✅)');
  step(.1); assert(!ST.on && ST.ct > 0 && /старт за/.test(lob().querySelector('.row').textContent), `«Усі на місці — старт за ${Math.ceil(ST.ct)}»`);
  var lobBots = ST.lb.filter(r => r[3]).map(r => r[0]);
  for (let k = 0; k < 20 && !ST.on; k++) step(.1);
  assert(ST.on && lobBots.every(n => ST.ro.some(e => e.bot && e.n === n)), 'відлік скінчився — раунд почався; у раунді ті самі боти, що сиділи в лобі: ' + lobBots.join(', '));
}
assert(ST.on && ST.ph === 'meet' && H.me() && !H.me().boss, '✅ «Я готовий» — боти доповнили лобі, «Старт за 3…2…1» — раунд почався: я — офісник, бос на нараді');
assert(!lob(), 'раунд почався — вікно лобі закрилось');
{ const r = w.document.getElementById('hb-role'); assert(r && r.style.display !== 'none' && /Ти — офісник/.test(r.textContent) && r.dataset.role === 'hider', 'на старті велика картка «🙈 Ти — офісник»'); }
let it;
assert(H.bossE().bot && H.alive().length === 4 && ST.ro.length === 5, `5 учасників: бот-бос «${H.bossE().n}» і ще три боти-офісники`);
assert(ST.v === 0, 'ніхто не голосував — граємо на поверсі, де стоїш (42)');
step(.1); assert(T.MODEBAR && T.MODEBAR.slots.map(q => q.id).join() === 'mask,decoy,ram,smoke,pl,pp,bk,ex' && !w.document.getElementById('modebar').hidden && w.document.getElementById('weapon').hidden, 'панель офісника замість напоїв: 🎭 📄 🛞 🚬 ✈️ 🧻 📘 🧯');
H.AU.freeze = true;   // боти стоять — тест передбачуваний
let spot = hideAt('ficus');
it = T.getInteract(); assert(it && /Замаскуватись/.test(it.l) && /Фікус/.test(it.l), 'біля фікуса F — «Замаскуватись: 🪴 Фікус»'); it.fn(); step(.2);
assert(H.me().p === 'ficus' && !T.hero.root.visible && H.V.ents.get('me').prop && H.V.ents.get('me').prop.visible !== false, 'замаскувався: героя не видно, на його місці фікус');
{ const x0 = T.pl.x, z0 = T.pl.z; T.keydown('KeyW'); step(.5); T.keyup('KeyW'); const d = Math.hypot(T.pl.x - x0, T.pl.z - z0); assert(d > .2 && d < 1.3, `у маскуванні ходиш повільно (${d.toFixed(2)} м за 0,5 с)`); }
T.pl.x = spot.x; T.pl.z = spot.z;
ST.t = H.MEET - .1; step(.3); assert(ST.ph === 'hunt', 'нарада скінчилась — бос полює');
{ const p0 = H.me().pr; step(2); assert(H.me().pr < p0 - 2, `продуктивність тане (${p0} → ${H.me().pr.toFixed(1)})`); }
H.me().pr = 0; step(.3);
assert(H.V.ents.get('me').ring && /комп/.test(H.goal().txt) && H.goal().tg, 'продуктивність на нулі: маскування блимає, підказка веде до 💻');
{
  const d = H.DESKS.find(q => !H.inOffice(q.x, q.z)), ws = H.workSpot(d); T.pl.x = ws.x; T.pl.z = ws.z; step(.1);
  it = T.getInteract(); assert(it && /Попрацювати/.test(it.l), 'біля столу F — «Попрацювати за комп’ютером»'); it.fn(); step(.2);
  assert(H.me().w && !H.me().p, 'працюю — маскування зняте, мене видно');
  for (let k = 0; k < 40 && H.me().pr < 100; k++) { T.pl.x = ws.x; T.pl.z = ws.z; step(.1); }
  assert(H.me().pr === 100 && !H.me().w, 'попрацював 3 с — продуктивність 100%');
}
// бот-бос помічає блимаючий предмет і ловить
spot = hideAt('box'); T.getInteract().fn(); step(.1); assert(H.me().p === 'box', 'знову сховався — тепер коробкою');
H.me().pr = 0; H.AU.freeze = false;
{ const far = H.hideSpots().filter(h => Math.hypot(h.x - T.pl.x, h.z - T.pl.z) > 14); H.alive().filter(e => e.bot).forEach((e, i) => { const h = far[i * 3]; e.x = h.x; e.z = h.z; e.p = h.f.t; H.AU.bot[e.k].mode = 'hide'; H.AU.bot[e.k].thr = -1; }); }
const mine = H.me();
{ const b = H.bossE(); b.x = T.pl.x + 3.5; b.z = T.pl.z; H.AU.bot[b.k].path = []; H.AU.bot[b.k].tg = null; H.AU.bot[b.k].think = 0; }
for (let k = 0; k < 40 && !mine.c; k++) { T.pl.x = spot.x; T.pl.z = spot.z; step(.25); }
H.AU.freeze = true;
assert(mine.c, 'бот-бос побачив блимаючу коробку — «Попався!»');
step(.2); assert(H.inOffice(T.pl.x, T.pl.z), 'спійманий стоїть на килимі в кабінеті боса');
assert(!T.MODEBAR, 'спійманому панель режиму не потрібна — звичайний хотбар');
T.pl.x = F0.x; T.pl.z = F0.z; step(.1); assert(H.inOffice(T.pl.x, T.pl.z), 'спійманий не виходить з кабінету до кінця раунду');
{ const c0 = T.P.coins; ST.t = H.DUR; step(.3); assert(!ST.on && T.P.addons.hideboss.caught === 1 && T.P.coins > c0, `раунд скінчився, мене спіймали: +${T.P.coins - c0} 🪙`); }
assert(!H.inOffice(T.pl.x, T.pl.z), 'після раунду — з кабінету на волю');

/* ===== 2. Пересидів боса: вийшов час ===== */
step(.1); assert(lob() && /Я готовий/.test(lob().querySelector('.rdy').textContent), 'після раунду лобі відкривається знову');
ready(); step(.1); H.AU.freeze = true;
assert(ST.on && ST.rn === 2 && !H.me().boss, 'новий раунд офісником');
hideAt('chair'); it = T.getInteract(); assert(it && /крісло/i.test(it.l), 'біля крісла F — «Замаскуватись: 🪑 Офісне крісло»'); it.fn(); step(.1);
T.keydown('KeyR'); step(.1); assert(ST.dec.length === 1 && H.me().dc, 'R — фейковий звіт лишився на підлозі');
T.keydown('KeyR'); step(.1); assert(ST.dec.length === 1, 'другий звіт за раунд не можна');
/* 🛞 Фізичний тролінг: кріслом у ноги босові */
ST.ph = 'hunt'; ST.t = 0;
{
  const b = H.bossE(); b.x = F0.x - 5.3; b.z = F0.z - .25; b.f = 0;
  T.pl.x = F0.x - 8; T.pl.z = F0.z - .25; step(.4);
  assert(H.me().p === 'chair' && H.canRoll('chair'), 'у маскуванні крісла на коліщатках');
  T.input.aimOk = true; T.input.ax = b.x; T.input.az = b.z;
  T.keydown('Digit3'); T.keyup('Digit3');
  for (let k = 0; k < 12 && !(ST.stun > 0); k++) { T.input.aimOk = true; T.input.ax = b.x; T.input.az = b.z; step(.05); }
  assert(ST.stun > 1 && T.P.addons.hideboss.trips === 1 && ST.sc.me >= 1, `3 — таран: бос «${b.n}» упав (${ST.stun.toFixed(1)} с)`);
  assert(H.me().rc > 10, `перезарядка тарана (${H.me().rc.toFixed(0)} с)`);
  const x1 = T.pl.x; T.keydown('Digit3'); T.keyup('Digit3'); step(.3); assert(Math.abs(T.pl.x - x1) < .2 && !H.V.ram, 'вдруге одразу не розженешся');
  step(2.5); assert(ST.stun === 0, 'бос підвівся за ~2 с');
}
ST.ph = 'hunt'; ST.t = H.DUR - .5;
{ const c0 = T.P.coins; step(1); assert(!ST.on && T.P.addons.hideboss.survived === 1 && T.P.coins >= c0 + 80, `час вийшов — я пересидів боса: +${T.P.coins - c0} 🪙`); }

/* ===== 3. Босом проти ботів-офісників ===== */
step(.1); T.openPanel('ax_hideboss'); step(.05); body().querySelector('[data-hb="boss"]').click(); assert(H.V.pref === 'boss', 'вкладка: «🎭 Сам граю 👔 босом»'); T.closePanel(); step(.1);
assert(lob() && /бос<\/b> проти ботів/.test(lob().querySelector('.row').innerHTML), 'у лобі видно обрану роль: бос проти ботів');
ready(); step(.2);
assert(ST.on && H.me().boss && H.alive().length === 4 && H.alive().every(e => e.bot), 'я — бос, проти чотирьох ботів-офісників');
{ const r = w.document.getElementById('hb-role'); assert(r && r.style.display !== 'none' && /Ти — БОС!/.test(r.textContent) && r.dataset.role === 'boss', 'на старті велика картка «👔 Ти — БОС!»'); }
step(.1); assert(T.MODEBAR && T.MODEBAR.slots.map(q => q.id).join() === 'catch,check,bell,bk', 'панель боса: 👉 🔍 🔔 📘');
assert(H.inOffice(T.pl.x, T.pl.z) && w.document.getElementById('hb-blind').style.display === 'flex', 'нарада: бос у скляному кабінеті й нічого не бачить');
T.pl.x = F0.x; T.pl.z = F0.z; step(.1); assert(H.inOffice(T.pl.x, T.pl.z), 'під час наради з кабінету не вийти');
H.AU.freeze = false;
for (let k = 0; k < 50 && ST.ph === 'meet'; k++) step(.5);
assert(ST.ph === 'hunt' && H.alive().every(e => e.p), `боти сховались (${H.alive().map(e => e.p).join(', ')}) — полювання`);
H.AU.freeze = true; step(.1);
assert(w.document.getElementById('hb-blind').style.display === 'none', 'після наради бос бачить');
const aim = (x, z) => { T.input.aimOk = true; T.input.ax = x; T.input.az = z; T.pl.atkCd = 0; T.pl.pending = null; step(.6); T.input.aimOk = true; T.input.ax = x; T.input.az = z; T.pl.atkCd = 0; T.attack(); step(.1); };
// промах по справжньому предмету
{
  const f = H.FURN.find(q => q.v === 0 && q.t === 'ficus' && !H.inOffice(q.x, q.z) && H.alive().every(e => Math.hypot(e.x - q.x, e.z - q.z) > 4) && !H.DESKS.some(d => Math.hypot(d.x - q.x, d.z - q.z) < 2.5));
  const h = H.hideSpots().find(s => s.f === f) || { x: f.x + 1, z: f.z };
  T.pl.x = h.x; T.pl.z = h.z; step(.05);
  const t0 = ST.t; aim(f.x, f.z);
  assert(ST.t >= t0 + 4.9, `вдарив справжній фікус — «Це просто фікус…» −5 с (${(ST.t - t0).toFixed(1)})`);
}
// Перевірка
T.keydown('KeyQ'); step(.1); assert(ST.cd > 10, 'Q — «Перевірка» (перезарядка)');
// бос врізався в замаскованого — той «бздинькає»
{
  const q = H.alive()[0]; q.p = q.p || 'box';
  T.keydown('KeyW');
  for (let k = 0; k < 10 && !(H.V.shake[q.k] > T.gameTime); k++) { T.pl.x = q.x - .3; T.pl.z = q.z; step(.05); }
  T.keyup('KeyW'); step(.05);
  assert(H.V.shake[q.k] > T.gameTime - 1 && Math.hypot(T.pl.x - q.x, T.pl.z - q.z) > H.propR(q.p) + .3, `бос врізався в «${q.p}» — предмет хитається й бздинькає, крізь нього не пройти`);
}
// 🔔 Загальні збори
{
  T.keydown('Digit3'); T.keyup('Digit3'); step(.1);
  assert(ST.bu === 1 && ST.bell > 14, '3 — 🔔 Загальні збори: 15 с, щоб прийти в переговорну');
  T.keydown('Digit3'); T.keyup('Digit3'); step(.1); assert(ST.bell < 15, 'другі збори за раунд не скличеш');
  step(15.2);
  const R = H.FL[ST.v], inMeet = e => H.inRoomR(R, R.meet, e.x, e.z, .1);
  assert(ST.bell === 0 && H.alive().every(e => inMeet(e) || e.fl > 0) && H.alive().some(e => e.fl > 0), `прогульники зборів отримали 🚩 (${H.alive().filter(e => e.fl > 0).length})`);
}
// 📘 бос бере книжку на шафі й жбурляє в замаскованого офісника — маскування злітає
{
  const bs = H.picks(ST.v).find(s => s.t === 'bk' && standOff(s.x, s.z, 1.15)), p = standOff(bs.x, bs.z, 1.15);
  T.pl.x = p.x; T.pl.z = p.z; step(.1);
  const it = T.getInteract(); assert(it && /взяти книжку/.test(it.l), 'бос біля 📚 шафи: F — «взяти книжку (+2)»'); it.fn(); step(.1);
  assert(H.me().inv.bk === 2 && T.MODEBAR.slots[3].count() === 2, 'у боса 📘×2 у слоті 4');
  const q = H.alive().find(e => e.p && standOff(e.x, e.z, 3.5)), s = standOff(q.x, q.z, 3.5);
  T.pl.x = s.x; T.pl.z = s.z; step(.1);
  aimKey(q.x, q.z, 'Digit4');
  for (let k = 0; k < 12 && q.p; k++) step(.05);
  assert(!q.p && q.bn > 0 && H.me().inv.bk === 1, `4 — 📘 книжкою в «${q.n}»: маскування злетіло, він оговтується`);
}
// ловимо ботів
for (const b of H.alive().slice()) {
  T.pl.x = b.x + .9; T.pl.z = b.z; step(.05);
  const was = b.p; aim(b.x, b.z);
  assert(b.c, `«Попався!» — бот ${b.n} (${was || 'без маски'}) спійманий`);
  if (!ST.on) break;
}
assert(!ST.on && T.P.addons.hideboss.bossWins === 1 && T.P.addons.hideboss.catches === 4, 'усі на килимі — бос перемагає');
assert(!T.MODEBAR && !w.document.getElementById('weapon').hidden, 'раунд скінчився — повернувся звичайний хотбар (modeBar(null))');

/* ===== 4. Голосування за поверх і раунд на «Поверх 63 · Юридична фірма» ===== */
{
  step(.2); assert(lob(), 'лобі знову відкрите');
  lob().querySelector('[data-lv="2"]').click(); step(.3);
  assert(ST.nv === 2 && ST.vt[2] === 1 && lob().querySelector('[data-lv="2"]').classList.contains('mine') && /🗳️ 1/.test(lob().querySelector('[data-lv="2"] .vc').textContent), 'клік по картці «63» — голос (1), картка підсвічена');
  H.lobbyDef().onVote(1); step(.3); assert(ST.nv === 1 && ST.vt[1] === 1 && !ST.vt[2], 'onVote(1) — голос змінився на 57');
  lob().querySelector('[data-lv="2"]').click(); step(.3); assert(ST.nv === 2 && /63/.test(lob().querySelector('.sub').textContent), 'і назад на 63 — «Наступний: Поверх 63»');
}
ready(); step(.2);
const F2 = H.FL[2];
assert(ST.on && ST.v === 2 && H.floorAt(T.pl.x, T.pl.z) === 2 && H.inOffice(T.pl.x, T.pl.z), 'ліфт привіз на 63-й: бос — у кабінеті партнера');
assert(H.bossE().k === 'me' && H.alive().every(e => H.floorAt(e.x, e.z) === 2), 'боти-офісники теж на 63-му');
step(.2); assert(/Юридична/.test(w.document.getElementById('hideboss-hud').textContent), 'у HUD — назва поверху');
H.AU.freeze = false;
for (let k = 0; k < 50 && ST.ph === 'meet'; k++) step(.5);
assert(ST.ph === 'hunt' && H.alive().every(e => e.p && H.floorAt(e.x, e.z) === 2), `на 63-му боти теж сховались (${H.alive().map(e => e.p).join(', ')})`);
H.AU.freeze = true;
{ const c0 = T.P.coins; ST.t = H.DUR - .2; step(.5); assert(!ST.on && T.P.addons.hideboss.bossRounds === 2 && T.P.addons.hideboss.floors[2] === 1 && T.P.coins > c0, 'час вийшов — раунд на 63-му зарахований'); }
assert(!H.inOffice(T.pl.x, T.pl.z) && H.floorAt(T.pl.x, T.pl.z) === 2, 'після раунду — у холі 63-го');
// Esc-меню веде в хол поверху наступного раунду
H.goHide(1); step(.2); assert(H.floorAt(T.pl.x, T.pl.z) === 1 && lob(), 'goHide(1) — ліфтом на 57-й (колл-центр), лобі відкрите');
{ const x = T.pl.x, z = T.pl.z; T.pl.x = 0; T.pl.z = 0; step(.2); assert(!lob(), 'пішов з режиму — вікно лобі закрилось'); T.pl.x = x; T.pl.z = z; step(.2); assert(lob(), 'повернувся — лобі знову'); }
lob().querySelector('.hide').click(); step(.1);
T.openPanel('ax_hideboss'); step(.05); assert(/Хованки/.test(body().textContent) && /Табло/.test(body().textContent), 'вкладка «🙈 Хованки» з табло'); T.closePanel();
// назва кімнати ховається, коли стоїш у ній
{ const H = w.__hideboss, r = H.ROOMS.find(q => q.id !== 'hall' && Math.abs(q.x1 - q.x0) > 3) || H.ROOMS[1], F = H.FL ? (H.FL[0] || H.FL) : null;
  const ox = F && F.x != null ? F.x : 0, oz = F && F.z != null ? F.z : 0;
  T.pl.x = ox + (r.x0 + r.x1) / 2; T.pl.z = oz + (r.z0 + r.z1) / 2; T.pl.y = 0; step(.3);
  const el = [...w.document.querySelectorAll('.hb-lbl.room')].find(e => e.textContent === r.n);
  const other = [...w.document.querySelectorAll('.hb-lbl.room')].find(e => e.textContent !== r.n && e.style.display !== 'none' && e.style.opacity !== '0');
  assert(el && (el.style.display === 'none' || el.style.opacity === '0') && other, `у кімнаті «${r.n}» її назва ховається, інші видно`); }

/* ===== 5. Кидалки офісника: ✈️ 🧻 📘 🧯 — підбір, політ, «шурх», книжка в боса, хмара піни, папірець у смітник ===== */
H.V.pref = 'hider'; H.goHide(0); step(.3);
lob().querySelector('[data-lv="0"]').click(); step(.2); ready(); step(.1);
assert(ST.on && ST.v === 0 && !H.me().boss && H.bossE().bot && ST.ro.length === 5, 'раунд офісником на 42-му (5 учасників)');
H.AU.freeze = true;
{
  const me = () => H.me(), toastTxt = [];
  const p0 = H.picks(0).find(s => s.t === 'pl'), sp = standOff(p0.x, p0.z, 1.15);
  T.pl.x = sp.x; T.pl.z = sp.z; step(.2);
  assert(H.V.pks && H.V.pks.length === H.FL.reduce((n, F, v) => n + H.picks(v).length, 0) && H.V.pks.some(o => o.sp === p0 && o.g.visible), 'місця підбору — 3D: кільце, стос паперу на ксероксі, вогнегасники');
  assert([...w.document.querySelectorAll('.hb-lbl.pick')].some(e => e.textContent === '✈️ Папір для літачків' && e.style.display !== 'none' && e.style.opacity !== '0'), 'над ксероксом підпис «✈️ Папір для літачків»');
  // порожній слот — тост «де взяти» і стрілка
  T.keydown('Digit5'); T.keyup('Digit5'); step(.05);
  assert(H.V.want === 'pl' && H.goal().id === 'pick' && /ксерокс/.test(H.goal().txt) && T.MODEBAR.slots[4].n.startsWith('де:'), 'слот ✈️ порожній: «де: 🖨️ ксерокс», стрілка до паперу');
  let it = T.getInteract(); assert(it && /скласти літачок \(\+3\)/.test(it.l), 'біля ксерокса F — «скласти літачок (+3)»'); it.fn(); step(.1);
  assert(me().inv.pl === 3 && T.MODEBAR.slots[4].count() === 3 && T.MODEBAR.slots[4].n === 'Літачок', '✈️×3 у слоті 5');
  it = T.getInteract(); assert(!it || !/скласти/.test(it.l), 'одразу вдруге з того самого ксерокса не можна (поповнюється)');
  for (const t of ['pp', 'bk', 'ex']) {
    const s0 = H.picks(0).find(s => s.t === t && standOff(s.x, s.z, 1.15)), q = standOff(s0.x, s0.z, 1.15);
    T.pl.x = q.x; T.pl.z = q.z; step(.1);
    it = T.getInteract(); assert(it && new RegExp(t === 'pp' ? 'нам.яти паперу' : t === 'bk' ? 'взяти книжку' : 'взяти вогнегасник').test(it.l), `біля «${H.PK[t].lbl}» F — «${it && it.l}»`); it.fn(); step(.1);
  }
  assert(me().inv.pp === 5 && me().inv.bk === 2 && me().inv.ex === 1, 'у кишенях: 🧻×5, 📘×2, 🧯×1');
  T.keydown('Digit5'); T.keyup('Digit5'); step(.1); assert(!H.V.proj.size && me().inv.pl === 3, 'під час наради не кидаємо — бос нічого не бачить');
  ST.ph = 'hunt'; ST.t = 0;
  // ✈️ у далекий куток — «шурх!»: бот-бос іде дивитись
  const B = H.bossE(), far = H.hideSpots(0).find(h => Math.hypot(h.x - T.pl.x, h.z - T.pl.z) > 14 && !H.inOffice(h.x, h.z));
  B.x = far.x; B.z = far.z;
  let tgt = null; for (let k = 0; k < 36 && !tgt; k++) { const a = k / 36 * Math.PI * 2, x = T.pl.x + Math.sin(a) * 6, z = T.pl.z + Math.cos(a) * 6; if (H.floorAt(x, z) === 0 && clear(T.pl.x, T.pl.z, x, z) && Math.hypot(x - B.x, z - B.z) > 2) tgt = { x, z }; }
  aimKey(tgt.x, tgt.z, 'Digit5'); step(.1);
  assert(H.V.proj.size === 1 && me().inv.pl === 2, '5 — ✈️ полетів (видно в польоті), літачків 2');
  step(1.2);
  assert(!H.V.proj.size && H.AU.sus.some(u => u.n && Math.hypot(u.x - tgt.x, u.z - tgt.z) < 1), '✈️ упав — «шурх!» там, куди цілився');
  H.AU.bot[B.k].think = 0; H.AU.freeze = false; step(.1); H.AU.freeze = true;
  assert(H.AU.bot[B.k].mode === 'noise' && H.AU.bot[B.k].tg && H.AU.bot[B.k].tg.n, 'бот-бос пішов на шурх');
  // ЛКМ, коли вибраний слот кидалки, — теж кидок
  T.input.aimOk = true; T.input.ax = tgt.x; T.input.az = tgt.z; T.pl.atkCd = 0; T.attack(); step(.1);
  assert(me().inv.pl === 1, 'ЛКМ із вибраним слотом ✈️ — ще один літачок');
  step(1.2);
  // 📘 у боса — 1 с зірочок
  const bs = standOff(T.pl.x, T.pl.z, 4); B.x = bs.x; B.z = bs.z; step(.4);
  aimKey(B.x, B.z, 'Digit7');
  for (let k = 0; k < 10 && !(ST.stun > 0); k++) step(.05);
  assert(ST.stun > .5 && me().inv.bk === 1, `7 — 📘 влучив у боса: зірочки (${ST.stun.toFixed(1)} с)`);
  step(1.2); assert(ST.stun === 0, 'бос підвівся');
  // 🧯 хмара піни
  B.x = far.x; B.z = far.z;
  T.keydown('Digit8'); T.keyup('Digit8'); step(.2);
  assert(ST.smk.length === 1 && H.inSmoke(T.pl.x, T.pl.z) && H.V.smk.size === 1 && me().inv.ex === 0, '8 — 🧯 хмара піни навколо мене (бос-бот тут не бачить)');
  step(7); assert(!ST.smk.length && !H.V.smk.size, 'за 6 с хмара розвіялась');
  // 🧻 у смітник здалеку — монети й досвід
  const bins = H.FL[0].furn.filter(f => f.t === 'trash' && !H.inOffice(f.x, f.z));
  let shot = null; for (const f of bins) { const q = standOff(f.x, f.z, 5.5); if (q) { shot = { f, q }; break; } }
  T.pl.x = shot.q.x; T.pl.z = shot.q.z; step(.1);
  const c0 = T.P.coins; aimKey(shot.f.x, shot.f.z, 'Digit6'); step(1.5);
  assert(T.P.addons.hideboss.bins === 1 && T.P.coins > c0 + 4 && me().inv.pp === 4, `6 — 🧻 у смітник з ${Math.hypot(shot.q.x - shot.f.x, shot.q.z - shot.f.z).toFixed(1)} м: +${T.P.coins - c0} 🪙`);
  ST.t = H.DUR; step(.3); assert(!ST.on, 'раунд скінчився');
}
console.log('ALL OK'); process.exit(0);
