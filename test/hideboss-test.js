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
src += ';window.__T={get paused(){return paused},get running(){return running},get P(){return P},get hero(){return hero},pl,input,STATICS,ADDONS,ISLMAP,startGame,frame,openPanel,closePanel,get panel(){return panel},getInteract:()=>getInteract(),attack:()=>attack(),renderPanel,keydown:c=>dispatchEvent(new KeyboardEvent("keydown",{code:c})),keyup:c=>dispatchEvent(new KeyboardEvent("keyup",{code:c}))};';
w.eval(src);
const T = w.__T; let now = 1000;
const step = s => { for (let i = 0; i < s * 60; i++) { now += 16.7; T.frame(now); if (i % 3 === 0) IV.forEach(f => f()); } };
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); process.exit(1); } console.log('ok -', m); };
const body = () => w.document.querySelector('#pbody');
assert(T.ADDONS.list.every(a => a.ok), 'аддон завантажився: ' + T.ADDONS.list.map(a => a.name + (a.ok ? '' : ' ✗ ' + a.err)).join(', '));
assert(w.document.querySelector('#mm-hideboss .mm-subtitle').textContent === 'Сховайся від боса', 'у меню картка «ХОВАНКИ · Сховайся від боса»');
const H = w.__hideboss, ST = H.ST;
T.startGame(true); T.P.tut = -1; T.pl.hp = 9999; step(.3);
T.keydown('Escape'); step(.05); body().querySelector('[data-mode="hideboss"]').click(); step(.5);
assert(Math.hypot(T.pl.x - H.SPAWN.x, T.pl.z - H.SPAWN.z) < 1, 'Esc → «Сховайся від боса» переносить в офіс');
assert(H.goal().id === 'start' && w.document.getElementById('hb-intro'), 'до старту: інструкція й підказка «▶ СТАРТ»');
w.document.querySelector('#hb-intro button').click(); assert(!w.document.getElementById('hb-intro') && T.P.addons.hideboss.intro === 1, 'інструкцію закрив — більше не показується');
step(.1); assert(/СТАРТ/.test(w.document.getElementById('hideboss-goal').textContent) && /Сховайся від боса/.test(w.document.getElementById('hideboss-hud').textContent), 'HUD і рядок «👉 що робити зараз»');
assert(H.FURN.length > 60 && ['chair', 'cooler', 'ficus', 'copier', 'cabinet', 'box', 'trash', 'coffee', 'sofa', 'desk'].every(t => H.FURN.some(f => f.t === t)), `офіс заставлений меблями (${H.FURN.length})`);
// стіни офісу не випускають
T.pl.x = 0; T.pl.z = -120 + 9.3; step(.05); for (let k = 0; k < 30; k++) { T.pl.z += .1; step(.02); } assert(T.pl.z < -120 + 11.2, 'з офісу не вийдеш крізь стіну');

const hideAt = t => { const h = H.hideSpots().find(s => s.f.t === t && !H.DESKS.some(d => Math.hypot(d.x - s.x, d.z - s.z) < 2.6)); T.pl.x = h.x; T.pl.z = h.z; step(.05); return h; };
const toBoard = () => { T.pl.x = H.BOARD.x; T.pl.z = H.BOARD.z - 1.2; step(.1); };

/* ===== 1. Офісником проти бота-боса ===== */
toBoard();
let it = T.getInteract(); assert(it && /Почати раунд/.test(it.l) && /офісник/.test(it.l), 'біля таблички F — «Почати раунд (я — офісник)»'); it.fn(); step(.2);
assert(ST.on && ST.ph === 'meet' && H.me() && !H.me().boss, 'раунд почався: я — офісник, бос на нараді');
assert(H.bossE().bot && H.alive().length === 3, `бот-бос «${H.bossE().n}» і ще два боти-офісники`);
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
T.pl.x = 0; T.pl.z = -120; step(.1); assert(H.inOffice(T.pl.x, T.pl.z), 'спійманий не виходить з кабінету до кінця раунду');
{ const c0 = T.P.coins; ST.t = H.DUR; step(.3); assert(!ST.on && T.P.addons.hideboss.caught === 1 && T.P.coins > c0, `раунд скінчився, мене спіймали: +${T.P.coins - c0} 🪙`); }
assert(!H.inOffice(T.pl.x, T.pl.z), 'після раунду — з кабінету на волю');

/* ===== 2. Пересидів боса: вийшов час ===== */
toBoard(); T.getInteract().fn(); step(.2); H.AU.freeze = true;
assert(ST.on && ST.rn === 2 && !H.me().boss, 'новий раунд офісником');
hideAt('chair'); it = T.getInteract(); assert(it && /крісло/i.test(it.l), 'біля крісла F — «Замаскуватись: 🪑 Офісне крісло»'); it.fn(); step(.1);
T.keydown('KeyR'); step(.1); assert(ST.dec.length === 1 && H.me().dc, 'R — фейковий звіт лишився на підлозі');
T.keydown('KeyR'); step(.1); assert(ST.dec.length === 1, 'другий звіт за раунд не можна');
ST.ph = 'hunt'; ST.t = H.DUR - .5;
{ const c0 = T.P.coins; step(1); assert(!ST.on && T.P.addons.hideboss.survived === 1 && T.P.coins >= c0 + 80, `час вийшов — я пересидів боса: +${T.P.coins - c0} 🪙`); }

/* ===== 3. Босом проти ботів-офісників ===== */
T.pl.x = H.ROLE.x; T.pl.z = H.ROLE.z - 1.2; step(.1);
it = T.getInteract(); assert(it && /Хочу бути/.test(it.l), 'табличка 🎭 РОЛЬ — вибір ролі'); it.fn(); assert(H.V.pref === 'boss', 'тепер я хочу бути босом');
toBoard(); it = T.getInteract(); assert(/бос/.test(it.l), 'F — «Почати раунд (я — бос)»'); it.fn(); step(.3);
assert(ST.on && H.me().boss && H.alive().length === 3 && H.alive().every(e => e.bot), 'я — бос, проти трьох ботів-офісників');
assert(H.inOffice(T.pl.x, T.pl.z) && w.document.getElementById('hb-blind').style.display === 'flex', 'нарада: бос у скляному кабінеті й нічого не бачить');
T.pl.x = 0; T.pl.z = -120; step(.1); assert(H.inOffice(T.pl.x, T.pl.z), 'під час наради з кабінету не вийти');
H.AU.freeze = false;
for (let k = 0; k < 50 && ST.ph === 'meet'; k++) step(.5);
assert(ST.ph === 'hunt' && H.alive().every(e => e.p), `боти сховались (${H.alive().map(e => e.p).join(', ')}) — полювання`);
H.AU.freeze = true; step(.1);
assert(w.document.getElementById('hb-blind').style.display === 'none', 'після наради бос бачить');
const aim = (x, z) => { T.input.aimOk = true; T.input.ax = x; T.input.az = z; T.pl.atkCd = 0; T.pl.pending = null; step(.6); T.input.aimOk = true; T.input.ax = x; T.input.az = z; T.pl.atkCd = 0; T.attack(); step(.1); };
// промах по справжньому предмету
{
  const f = H.FURN.find(q => q.t === 'ficus' && !H.inOffice(q.x, q.z) && H.alive().every(e => Math.hypot(e.x - q.x, e.z - q.z) > 4) && !H.DESKS.some(d => Math.hypot(d.x - q.x, d.z - q.z) < 2.5));
  const h = H.hideSpots().find(s => s.f === f) || { x: f.x + 1, z: f.z };
  T.pl.x = h.x; T.pl.z = h.z; step(.05);
  const t0 = ST.t; aim(f.x, f.z);
  assert(ST.t >= t0 + 4.9, `вдарив справжній фікус — «Це просто фікус…» −5 с (${(ST.t - t0).toFixed(1)})`);
}
// Перевірка
T.keydown('KeyQ'); step(.1); assert(ST.cd > 10, 'Q — «Перевірка» (перезарядка)');
// ловимо ботів
for (const b of H.alive().slice()) {
  T.pl.x = b.x + .9; T.pl.z = b.z; step(.05);
  const was = b.p; aim(b.x, b.z);
  assert(b.c, `«Попався!» — бот ${b.n} (${was || 'без маски'}) спійманий`);
  if (!ST.on) break;
}
assert(!ST.on && T.P.addons.hideboss.bossWins === 1 && T.P.addons.hideboss.catches === 3, 'усі на килимі — бос перемагає');
T.openPanel('ax_hideboss'); step(.05); assert(/Хованки/.test(body().textContent) && /Табло/.test(body().textContent), 'вкладка «🙈 Хованки» з табло'); T.closePanel();
console.log('ALL OK'); process.exit(0);
