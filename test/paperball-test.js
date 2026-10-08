// Тест аддона «Папірець у смітник» у грі без сервера (разом з офісними режимами — щоб перевірити холи й клавіші).
// Запуск: node test/paperball-test.js
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
const MODES = ['chairrace', 'printerwar', 'deadline', 'hideboss', 'nightshift'];
// лише для тесту: дістаємо точки появи в холі з режимів, що не експортують їх самі
const EXP = { chairrace: ';window.__pbt_cr={VARS};', printerwar: ';window.__pbt_pw={VAR};' };
const read = id => fs.readFileSync(path.join(root, 'addons/_examples', id, 'addon.js'), 'utf8');
w.__ADDON_CODE = MODES.map(id => ({ id, src: id + '/addon.js', code: read(id) + (EXP[id] || '') })).concat([{ id: 'paperball', src: 'paperball/addon.js', code: read('paperball') }]);
let src = fs.readdirSync(path.join(root, 'src')).filter(f => f.endsWith('.js')).sort().map(f => fs.readFileSync(path.join(root, 'src', f), 'utf8')).join('\n');
src += ';window.__T={get running(){return running},get P(){return P},pl,MON,STATICS,PROPS,BODIES,ADDONS,ISLMAP,input,startGame,frame,openPanel,closePanel,get panel(){return panel},spawnMonster,modeBar,GIVER,NET,' +
  'keydown:c=>dispatchEvent(new KeyboardEvent("keydown",{code:c})),keyup:c=>dispatchEvent(new KeyboardEvent("keyup",{code:c}))};';
w.eval(src);
const T = w.__T; let now = 1000;
const step = s => { for (let i = 0; i < s * 60; i++) { now += 16.7; T.frame(now); if (i % 3 === 0) IV.forEach(f => f()); } };
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); process.exit(1); } console.log('ok -', m); };
const near = (a, b, e) => Math.abs(a - b) < e;
// інші режими можуть саме оновлюватись — наш аддон мусить працювати, а перевірки холів робимо для тих режимів, що завантажились
const okMode = id => T.ADDONS.list.some(a => a.id === id && a.ok);
assert(okMode('paperball'), 'аддон «Папірець» завантажився (режими: ' + T.ADDONS.list.map(a => a.id + (a.ok ? '' : ' ✗ ' + a.err)).join(', ') + ')');
const B = w.__paperball, PB = B.PB;
T.startGame(true); T.P.tut = -1; T.pl.hp = 9999; step(.3);

/* ---------- Клавіша T ні з ким не конфліктує ---------- */
{
  const k = T.ADDONS.keys[B.KEY]; assert(B.KEY === 'KeyT' && k && k[0].id === 'paperball', 'клавіша T належить аддону «Папірець»');
  const others = fs.readdirSync(path.join(root, 'addons/_examples')).filter(f => f !== 'paperball').flatMap(f => {
    const p = path.join(root, 'addons/_examples', f); const files = fs.statSync(p).isDirectory() ? fs.readdirSync(p).filter(x => x.endsWith('.js')).map(x => path.join(p, x)) : f.endsWith('.js') ? [p] : [];
    return files.filter(x => /KeyT\b/.test(fs.readFileSync(x, 'utf8'))).map(x => path.relative(root, x));
  });
  const core = fs.readdirSync(path.join(root, 'src')).filter(f => f.endsWith('.js') && /['"]KeyT['"]|keys\.KeyT/.test(fs.readFileSync(path.join(root, 'src', f), 'utf8')));
  assert(!others.length && !core.length, 'KeyT не використовує ні ядро, ні інші аддони' + (others.concat(core).length ? ': ' + others.concat(core).join(', ') : ''));
}

/* ---------- Смітники є в Гущі та в холі кожного поверху ---------- */
const hasStatic = b => T.STATICS.some(o => near(o.x, b.x, .01) && near(o.z, b.z, .01));
assert(B.HUB_BINS.length >= 3 && B.HUB_BINS.every(b => hasStatic(b) && !b.moved && Math.hypot(b.x, b.z) < T.ISLMAP.hub.r - 1 && T.PROPS.every(p => Math.hypot(p.x - b.x, p.z - b.z) > (p.r || .5) + .6)), `у «Гущі» ${B.HUB_BINS.length} смітники зі статикою, усі на острові`);
assert(B.HUB_BINS.some(b => b.ledge) && B.HUB_BINS.some(b => Math.hypot(b.x, b.z) > 9), 'у «Гущі» є смітник на ящиках і далекий');
{
  const blocked = (ax, az, bx, bz, own) => T.STATICS.some(o => { if (own(o)) return false; const vx = bx - ax, vz = bz - az, L2 = vx * vx + vz * vz; let t = ((o.x - ax) * vx + (o.z - az) * vz) / L2; t = Math.max(0, Math.min(1, t)); return Math.hypot(ax + vx * t - o.x, az + vz * t - o.z) < o.r + .1; });
  const sp = {
    chairrace: () => w.__pbt_cr.VARS.map(V => V.SPAWN), printerwar: () => w.__pbt_pw.VAR.map(D => ({ x: D.board.x, z: D.board.z - 1.4 })),
    deadline: () => w.__deadline.LAY.map((L, i) => { w.__deadline.useVar(i); return { x: w.__deadline.START.p.x - .5, z: w.__deadline.START.p.z + .4 }; }),
    hideboss: () => w.__hideboss.FL.map(F => F.spawn), nightshift: () => w.__nightshift.FLOORS.map(F => F.SPAWN),
  }, spawns = {};
  for (const m of MODES) spawns[m] = okMode(m) ? sp[m]() : null;
  assert(B.FLOOR_BINS.length === 15, '15 смітників у холах поверхів (5 режимів × 3 поверхи)');
  for (const m of MODES) for (let v = 0; v < 3; v++) {
    const b = B.FLOOR_BINS.find(o => o.mode === m && o.v === v);
    if (!spawns[m]) { assert(b && hasStatic(b), `${m} поверх ${v + 1}: смітник зі статикою є (режим зараз не завантажився — хол не перевіряю)`); continue; }
    const s = spawns[m][v], own = o => near(o.x, b.x, .01) && near(o.z, b.z, .01);
    const isl = Object.values(T.ISLMAP).find(I => Math.hypot(b.x - I.x, b.z - I.z) < I.r - 1);
    const free = T.STATICS.filter(o => !own(o)).every(o => Math.hypot(o.x - b.x, o.z - b.z) > o.r + .5) && T.PROPS.every(p => Math.hypot(p.x - b.x, p.z - b.z) > (p.r || .5) + .5) && T.BODIES.every(p => Math.hypot(p.x - b.x, p.z - b.z) > 1);
    const d = Math.hypot(b.x - s.x, b.z - s.z);
    if (process.env.PBDBG) console.log(m, v, !!hasStatic(b), isl && isl.id, free, d, blocked(s.x, s.z, b.x, b.z, own), T.STATICS.filter(o => !own(o) && Math.hypot(o.x - b.x, o.z - b.z) < o.r + .8).map(o => [o.x, o.z, o.r]));
    assert(b && hasStatic(b) && isl && free && d < B.LOBBY_R - 2 && !blocked(s.x, s.z, b.x, b.z, own),
      `${m} поверх ${v + 1}: смітник у холі${b.moved ? ' (посунуто від нових меблів)' : ''} (${d.toFixed(1)} м від точки появи, острів ${isl && isl.id}, вільне місце, видно й дійти)`);
  }
}

/* ---------- Сила кидка й тіри відстаней ---------- */
assert(B.power(0) === 0 && near(B.power(1.15), 1, 1e-6) && near(B.power(1.15 * 1.5), .5, 1e-6), 'шкала сили ходить 0 → 1 → 0');
assert(B.distOf(0) === 1.5 && B.distOf(1) === B.MAX_D, `дальність від 1,5 до ${B.MAX_D} м`);
assert([[2, 1], [3.9, 1], [4, 3], [7.9, 3], [8, 6], [11.9, 6], [12, 12], [17, 12]].every(([d, c]) => B.tier(d) === c), 'тіри: <4 м — 1🪙, 4–8 — 3🪙, 8–12 — 6🪙, >12 — 12🪙');
assert(B.reward(13, 1).snipe && !B.reward(11, 1).snipe && B.reward(5, 4).coins === 3 + 3 && B.reward(5, 20).coins === 3 + 5, 'снайпер >12 м; бонус серії +1🪙 за влучання, до +5');
{ const L = B.launch(0, 0, 1, 0, 10); const t = L.T; assert(near(L.x + L.vx * t, 10, 1e-6) && near(L.y + L.vy * t - 7 * t * t, 0, 1e-6), 'дуга падає на землю рівно на обраній відстані'); }

/* ---------- Кидки по-справжньому ---------- */
// дальність d, за якої папірець, падаючи, перетне верх смітника рівно над ним (відстань D до смітника)
function solveD(D, top) {
  let lo = D, hi = B.MAX_D + 4;
  for (let k = 0; k < 50; k++) {
    const d = (lo + hi) / 2, L = B.launch(0, 0, 1, 0, d), a = -7, bq = L.vy, c = L.y - top;
    const t = (-bq - Math.sqrt(bq * bq - 4 * a * c)) / (2 * a), x = L.vx * t;
    if (x < D) lo = d; else hi = d;
  }
  return (lo + hi) / 2;
}
const D0 = () => B.data();
function throwAt(bin, D, ang, off) {
  const x = bin.x - Math.sin(ang) * D, z = bin.z - Math.cos(ang) * D;
  T.pl.x = x; T.pl.z = z; T.pl.y = 0; step(.02);
  const d = solveD(D + (off || 0), bin.top), b = B.throwBall(T.pl.x, T.pl.z, bin.x - T.pl.x, bin.z - T.pl.z, d);
  for (let k = 0; k < 200 && !b.done; k++) step(1 / 60);
  return b;
}
const mid = B.HUB_BINS.find(b => b.id === 'mid'), far = B.HUB_BINS.find(b => b.id === 'far'), ledge = B.HUB_BINS.find(b => b.ledge);
B.data().streak = 0;
{
  const c0 = T.P.coins, x0 = T.P.xp + T.P.lvl * 1e6, h0 = D0().hits;
  const b = throwAt(mid, 3, 0, 0);
  assert(b.inBin === 'mid' && D0().hits === h0 + 1 && T.P.coins === c0 + 1 && T.P.xp + T.P.lvl * 1e6 > x0, `кидок з 3 м у смітник «Посередині»: влучив, +1🪙 і XP (${b.res && b.res.coins}🪙)`);
}
{
  const c0 = T.P.coins; const b = throwAt(mid, 6, 0, 0);
  assert(b.inBin === 'mid' && T.P.coins === c0 + 3 + 1 && D0().streak === 2, '6 м: 3🪙 + 1🪙 за серію ×2');
}
{
  const c0 = T.P.coins; const b = throwAt(far, 10, -Math.PI / 2 - .3, 0);
  assert(b.inBin === 'far' && T.P.coins === c0 + 6 + 2, '10 м у далекий кут: 6🪙 + 2🪙 серії');
}
{
  const c0 = T.P.coins, s0 = D0().snipes; const b = throwAt(far, 13.5, -Math.PI / 2 - .5, 0);
  assert(b.inBin === 'far' && T.P.coins === c0 + 12 + 3 && D0().snipes === s0 + 1 && D0().best >= 13.4, '13,5 м: «Снайпер!» 12🪙 + 3🪙 серії, рекорд відстані');
}
{
  const c0 = T.P.coins; const b = throwAt(ledge, 5, Math.PI / 2, 0);
  assert(b.inBin === 'ledge' && T.P.coins > c0, 'смітник на ящиках (вище) теж приймає папірець');
}
{
  const s0 = D0().streak, c0 = T.P.coins; const b = throwAt(mid, 6, 0, 1.6);
  assert(!b.inBin && b.done && D0().streak === 0 && s0 > 0 && T.P.coins === c0, 'перекинув — «Мимо…», серія скинулась, без монет');
}
{ const b = throwAt(mid, 6, 0, .36); if (process.env.PBDBG) console.log(b.inBin, b.bounced, b.x, b.z, b.ox, b.oz, T.pl.x, T.pl.z); assert(!b.inBin && b.bounced, `влучання в бортик — відскок, не рахується`); }
{ const b = throwAt(mid, 6, 0, -.6); assert(!b.inBin && b.bounced, 'недокинув — папірець відскочив від боку смітника'); }

/* ---------- Денний ліміт ---------- */
{
  const d = D0(); d.dayCoins = B.CAP_COINS - 2; const c0 = T.P.coins;
  throwAt(mid, 6, 0, 0); assert(T.P.coins === c0 + 2 && D0().dayCoins === B.CAP_COINS, 'денний ліміт: видали лише залишок (2🪙)');
  const c1 = T.P.coins, h1 = D0().hits; const b = throwAt(mid, 6, 0, 0);
  assert(b.inBin && D0().hits === h1 + 1 && T.P.coins === c1, 'після ліміту влучання рахуються, але без монет');
  const day = D0().day; B.PB.now = Date.now() + 86400000 * 2; assert(B.data().day !== day && B.data().dayCoins === 0, 'новий день — ліміт обнулився'); B.PB.now = 0;
}

/* ---------- Клавіша: затиснув T — заряд, відпустив — кидок у бік курсора ---------- */
{
  T.pl.x = 0; T.pl.z = 2; step(.05); T.input.ax = 0; T.input.az = 8; T.input.aimOk = true;
  const n0 = D0().throws; T.keydown('KeyT'); step(.4);
  assert(PB.charging && PB.ch > .2 && PB.ch < .5, `T затиснуто — шкала сили росте (${PB.ch.toFixed(2)})`);
  assert(w.document.getElementById('pb-charge').style.display !== 'none', 'над головою шкала сили');
  T.keyup('KeyT'); step(1 / 60);
  const b = PB.balls[PB.balls.length - 1];
  assert(!PB.charging && D0().throws === n0 + 1 && b && b.vz > 0 && Math.abs(b.vx) < .01, 'відпустив T — папірець полетів у бік курсора');
  step(1.5); T.input.aimOk = false;
}

/* ---------- Влучання в офісника: «Ей!» і агресія ---------- */
{
  let ev = null; w.addEventListener('paperball:hit', e => { ev = e.detail; });
  const n0 = D0().npc; T.pl.x = -4; T.pl.z = 2; step(.05);
  const m = T.spawnMonster('office', T.ISLMAP.hub, 1, 2); m.stun = 9;
  const b = B.throwBall(T.pl.x, T.pl.z, 1, 0, 9);
  for (let k = 0; k < 120 && !b.done; k++) { m.x = 1; m.z = 2; step(1 / 60); }
  const a = PB.ag.get('m' + T.MON.indexOf(m));
  assert(b.hitNpc && D0().npc === n0 + 1 && a && a.v > .3 && ev && ev.mon === m, 'папірець в офісника — «Ей!», шкала агресії й подія paperball:hit');
  assert(m.bub && /Ей|Хто|звіт|HR|смітник|ЗЛИЙ/.test(m.bub.el.textContent), `офісник бурчить: «${m.bub && m.bub.el.textContent}»`);
  step(.05); assert(w.document.querySelector('.pb-ag'), 'над офісником видно шкалу «😡 агресія»');
  step(7); assert(!PB.ag.has('m' + T.MON.indexOf(m)), 'за кілька секунд агресія вщухає');
  m.dead = true;
}
{
  const n0 = D0().npc; T.pl.x = T.GIVER.x - 4; T.pl.z = T.GIVER.z + .1; step(.05);
  const b = B.throwBall(T.pl.x, T.pl.z, 1, -.025, 6); for (let k = 0; k < 120 && !b.done; k++) step(1 / 60);
  assert(b.hitNpc && D0().npc === n0 + 1 && PB.ag.has('giver'), 'Маріанна теж злиться, якщо влучити в неї');
}

/* ---------- Де можна кидати ---------- */
{
  T.pl.x = 0; T.pl.z = 3; step(.05); assert(B.zone() === 'hub' && B.canThrow(), 'у «Гущі» кидати можна');
  T.pl.x = 27; T.pl.z = -2; step(.05); const n0 = PB.balls.length; T.keydown('KeyT'); step(.2); T.keyup('KeyT'); step(.02);
  assert(!B.canThrow() && !PB.charging && PB.balls.length === n0, 'на «Опен-спейсі» (не хол, не Гуща) — не кидається');
  const fb = B.FLOOR_BINS.find(b => b.mode === 'deadline' && b.v === 0);
  assert(B.zone(fb.x + 2, fb.z) === 'lobby', 'хол поверху «Дедлайну» — зона кидків');
  T.modeBar({ slots: [{ id: 'x', ic: '💣', n: 'Тест', count: () => 1, use: () => { } }] });
  assert(B.zone(fb.x + 2, fb.z) === null, 'поки йде раунд (панель режиму) — у холі не кидаємо');
  T.modeBar(null);
  T.pl.x = 0; T.pl.z = 3; step(.05);
}

/* ---------- Чужий папірець: видно, але без нагород ---------- */
{
  const c0 = T.P.coins, h0 = D0().hits, h = T.ADDONS.net['paperball:ball'];
  T.pl.x = 4; T.pl.z = 9; step(.05);
  h[1]({ x: mid.x, z: mid.z + 3, dx: 0, dz: -1, d: solveD(3, mid.top) }, { id: 7, name: 'колега' });
  const b = PB.balls[PB.balls.length - 1]; for (let k = 0; k < 120 && !b.done; k++) step(1 / 60);
  assert(b.remote && b.inBin === 'mid' && T.P.coins === c0 && D0().hits === h0, 'кидок іншого гравця видно, він влучає, але монети не тобі');
}

/* ---------- Вкладка ---------- */
T.openPanel('ax_paperball'); step(.05);
assert(/рекорд відстані/.test(w.document.querySelector('#pbody').textContent) && /Снайпер/.test(w.document.querySelector('#pbody').textContent), 'вкладка «🗞️ Папірець» зі статистикою');
T.closePanel();
console.log('Усе гаразд ✔');
process.exit(0);
