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
w.matchMedia = () => ({ matches: false }); w.requestAnimationFrame = () => 0; w.console.warn = () => { }; w.__NO_NET = true; w.__ADDON_TEST = true;
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
  assert([F.spawn, F.board, ...F.pads, F.carpet, F.bossSpot].every(p => H.floorAt(p.x, p.z) === v), `«${F.n}»: старт, голосування, кабінет боса — на своєму поверсі`);
  assert([F.spawn, ...F.pads].every(p => H.navFree(p.x, p.z)), `«${F.n}»: ліфтовий хол і килимки вільні`);
  const M = F.meet, hs = H.hideSpots(v), ms = hs.filter(h => H.inRoomR(F, M, h.x, h.z, .3));
  assert(ms.length >= 3, `«${F.n}»: у «${M.n}» є де сховатись на зборах (${ms.length})`);
  for (const h of [ms[0], hs[hs.length - 1], hs[hs.length >> 1]]) { const rt = H.route(F.spawn.x, F.spawn.z, h.x, h.z); assert(rt.length > 3 && rt.every(p => H.floorAt(p.x, p.z) === v && H.navFree(p.x, p.z)), `«${F.n}»: від ліфта до «${H.FT[h.f.t].n}» у «${H.roomAt(h.x, h.z).n}» є маршрут (${rt.length} точок)`); }
 assert(hs.length > 40 && hs.some(h => H.canRoll(h.f.t)), `«${F.n}»: сховків для ботів ${hs.length}, є й на коліщатках`);
}
T.startGame(true); T.P.tut = -1; T.pl.hp = 9999; step(.3);
T.keydown('Escape'); step(.05); body().querySelector('[data-mode="hideboss"]').click(); step(.5);
assert(Math.hypot(T.pl.x - H.SPAWN.x, T.pl.z - H.SPAWN.z) < 1, 'Esc → «Сховайся від боса» переносить в офіс');
assert(H.goal().id === 'start:0' && w.document.getElementById('hb-intro'), 'до старту: інструкція й підказка «▶ СТАРТ»');
w.document.querySelector('#hb-intro button').click(); assert(!w.document.getElementById('hb-intro') && T.P.addons.hideboss.intro === 1, 'інструкцію закрив — більше не показується');
step(.1); assert(/СТАРТ/.test(w.document.getElementById('hideboss-goal').textContent) && /Сховайся від боса/.test(w.document.getElementById('hideboss-hud').textContent), 'HUD і рядок «👉 що робити зараз»');
assert(H.FURN.length > 60 && ['chair', 'cooler', 'ficus', 'copier', 'cabinet', 'box', 'trash', 'coffee', 'sofa', 'desk'].every(t => H.FURN.some(f => f.t === t)), `офіс заставлений меблями (${H.FURN.length})`);
// стіни офісу не випускають
T.pl.x = F0.x + 15.5; T.pl.z = F0.z + 10.5; step(.05); for (let k = 0; k < 40; k++) { T.pl.z += .1; step(.02); } assert(T.pl.z < F0.z + 12.8, 'з поверху не вийдеш крізь скляний фасад');

const hideAt = t => { const h = H.hideSpots().find(s => s.f.t === t && !H.DESKS.some(d => Math.hypot(d.x - s.x, d.z - s.z) < 2.6)); T.pl.x = h.x; T.pl.z = h.z; step(.05); return h; };
const toBoard = () => { T.pl.x = H.BOARD.x; T.pl.z = H.BOARD.z - 1.2; step(.1); };

/* ===== 1. Офісником проти бота-боса ===== */
toBoard();
let it = T.getInteract(); assert(it && /Почати раунд/.test(it.l) && /офісник/.test(it.l), 'біля таблички F — «Почати раунд (я — офісник)»'); it.fn(); step(.2);
assert(ST.on && ST.ph === 'meet' && H.me() && !H.me().boss, 'раунд почався: я — офісник, бос на нараді');
assert(H.bossE().bot && H.alive().length === 3, `бот-бос «${H.bossE().n}» і ще два боти-офісники`);
assert(ST.v === 0, 'ніхто не голосував — граємо на поверсі, де стоїш (42)');
step(.1); assert(T.MODEBAR && T.MODEBAR.slots.map(q => q.id).join() === 'mask,decoy,ram,smoke' && !w.document.getElementById('modebar').hidden && w.document.getElementById('weapon').hidden, 'панель офісника замість напоїв: 🎭 📄 🛞 🚬');
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
toBoard(); T.getInteract().fn(); step(.2); H.AU.freeze = true;
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
T.pl.x = H.ROLE.x; T.pl.z = H.ROLE.z - 1.2; step(.1);
it = T.getInteract(); assert(it && /Хочу бути/.test(it.l), 'табличка 🎭 РОЛЬ — вибір ролі'); it.fn(); assert(H.V.pref === 'boss', 'тепер я хочу бути босом');
toBoard(); it = T.getInteract(); assert(/бос/.test(it.l), 'F — «Почати раунд (я — бос)»'); it.fn(); step(.3);
assert(ST.on && H.me().boss && H.alive().length === 3 && H.alive().every(e => e.bot), 'я — бос, проти трьох ботів-офісників');
step(.1); assert(T.MODEBAR && T.MODEBAR.slots.map(q => q.id).join() === 'catch,check,bell', 'панель боса: 👉 🔍 🔔');
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
// ловимо ботів
for (const b of H.alive().slice()) {
  T.pl.x = b.x + .9; T.pl.z = b.z; step(.05);
  const was = b.p; aim(b.x, b.z);
  assert(b.c, `«Попався!» — бот ${b.n} (${was || 'без маски'}) спійманий`);
  if (!ST.on) break;
}
assert(!ST.on && T.P.addons.hideboss.bossWins === 1 && T.P.addons.hideboss.catches === 3, 'усі на килимі — бос перемагає');
assert(!T.MODEBAR && !w.document.getElementById('weapon').hidden, 'раунд скінчився — повернувся звичайний хотбар (modeBar(null))');

/* ===== 4. Голосування за поверх і раунд на «Поверх 63 · Юридична фірма» ===== */
{
  const pd = F0.pads[2]; T.pl.x = pd.x; T.pl.z = pd.z; step(.6);
  it = T.getInteract(); assert(it && /Голосувати/.test(it.l) && /63/.test(it.l), 'на килимку 🗳️ — «Голосувати за Поверх 63»');
  assert(ST.nv === 2 && ST.vt[2] === 1, 'став на килимок — голос за 63-й поверх');
  T.pl.x = F0.pads[1].x; T.pl.z = F0.pads[1].z; step(.6); assert(ST.nv === 1 && ST.vt[1] === 1 && !ST.vt[2], 'перейшов на інший килимок — голос змінився (57)');
  T.pl.x = pd.x; T.pl.z = pd.z; step(.6); assert(ST.nv === 2, 'і назад на 63');
}
toBoard(); it = T.getInteract(); assert(/63/.test(it.l), 'табличка ▶ СТАРТ: «Почати раунд на Поверх 63»'); it.fn(); step(.3);
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
H.goHide(1); step(.2); assert(H.floorAt(T.pl.x, T.pl.z) === 1, 'goHide(1) — ліфтом на 57-й (колл-центр)');
T.openPanel('ax_hideboss'); step(.05); assert(/Хованки/.test(body().textContent) && /Табло/.test(body().textContent), 'вкладка «🙈 Хованки» з табло'); T.closePanel();
// назва кімнати ховається, коли стоїш у ній
{ const H = w.__hideboss, r = H.ROOMS.find(q => q.id !== 'hall' && Math.abs(q.x1 - q.x0) > 3) || H.ROOMS[1], F = H.FL ? (H.FL[0] || H.FL) : null;
  const ox = F && F.x != null ? F.x : 0, oz = F && F.z != null ? F.z : 0;
  T.pl.x = ox + (r.x0 + r.x1) / 2; T.pl.z = oz + (r.z0 + r.z1) / 2; T.pl.y = 0; step(.3);
  const el = [...w.document.querySelectorAll('.hb-lbl.room')].find(e => e.textContent === r.n);
  const other = [...w.document.querySelectorAll('.hb-lbl.room')].find(e => e.textContent !== r.n && e.style.display !== 'none' && e.style.opacity !== '0');
  assert(el && (el.style.display === 'none' || el.style.opacity === '0') && other, `у кімнаті «${r.n}» її назва ховається, інші видно`); }
console.log('ALL OK'); process.exit(0);
