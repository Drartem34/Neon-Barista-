/* Аддон «Папірець у смітник»: офісний баскетбол зім'ятими звітами.
   - Затисни T (на телефоні — кнопка 🗞️) — заряджаєш кидок, відпусти — папірець летить дугою туди, куди дивиться курсор
     (на телефоні — до найближчого смітника, або вперед). Сила = скільки тримав (шкала ходить туди-сюди).
   - Смітники: 4 у «Кавовій Гущі» (біля бару, на ящиках, посередині, у далекому куті) і по одному в холі (лобі) кожного
     з 15 поверхів офісних режимів (Гонки, Принтер, Дедлайн, Хованки, Нічна зміна).
   - Кидати можна лише в «Гущі» та в холі поверху, поки не йде раунд режиму (коли ввімкнена панель режиму — ні).
   - Влучив — монети й досвід за відстань: <4 м — 1🪙, 4–8 — 3🪙, 8–12 — 6🪙, >12 — 12🪙 і «Снайпер!». Серія влучань
     дає бонус. Денний ліміт: 150🪙 і 400 XP — далі тільки для слави.
   - Влучив в офісника (зомбі-офісника, Маріанну, іншого гравця) — «Ей!» і шкала агресії над головою (косметика: злиться
     кілька секунд). Режими можуть слухати подію window 'paperball:hit' і робити свою агресію.
   - Інші гравці бачать твої папірці (легка розсилка A.send), рахунок — локальний, у A.data().
   Клавіша T вільна: ні ядро, ні інші аддони її не використовують (перевірено тестом). */
const A = Addon.info({ name: 'Папірець у смітник', version: '1.0', desc: 'T — зім\'яти й кинути папірець у смітник. Чим далі — тим більше 🪙 і XP. Смітники в «Гущі» та в холах поверхів.' });

const SIMSIDE = !!window.__SIM;
const KEY = 'KeyT';
const HUB = { x: 0, z: 0, r: 11 };
const LOBBY_R = 7;                               // радіус «холу» навколо смітника на поверсі
const G_ACC = 14, Y0 = 1.45, MAX_D = 18, MIN_D = 1.5;
const BIN_IN = .29, BIN_RIM = .42, BIN_H = .78, LEDGE_H = 1.3;
const CAP_COINS = 150, CAP_XP = 400, CD = .45, CHARGE_T = 1.15;
const OFFICE_MON = ['office', 'manager', 'hr'];

/* ---------- Смітники ---------- */
// Гуща: місця вільні від бару, верстака, Маріанни, батута, точки, рослин і ящиків (перевірено по STATICS/PROPS)
const HUB_BINS = [
  { id: 'bar', n: 'Біля бару', x: -3.5, z: -3.0, c: '#E07A5F' },
  { id: 'mid', n: 'Посередині', x: 0, z: 6.2, c: '#9389C9' },
  { id: 'ledge', n: 'На ящиках', x: 5.6, z: 2.9, c: '#4FB89A', ledge: 1 },
  { id: 'far', n: 'Далекий кут', x: 8.0, z: -5.5, c: '#E8B23A' },
];
// Холи поверхів: точка поруч із місцем, куди режим ставить гравця (go()/лобі), біля стіни, без меблів і прохідна
const FLOOR_BINS = [
  ['chairrace', 0, 289.6, -318.5], ['chairrace', 1, 429.6, -318.5], ['chairrace', 2, 565.2, -324.5],
  ['printerwar', 0, 290.8, -442.1], ['printerwar', 1, 427, -448.4], ['printerwar', 2, 563.2, -449.6],
  ['deadline', 0, 300.7, -572], ['deadline', 1, 446.6, -567.2], ['deadline', 2, 569.6, -567.6],
  ['hideboss', 0, 288.6, -708.2], ['hideboss', 1, 422.8, -715.2], ['hideboss', 2, 570.8, -718],
  ['nightshift', 0, 303.4, -845.3], ['nightshift', 1, 437.5, -847], ['nightshift', 2, 592.9, -850.8],
].map(([m, v, x, z]) => ({ id: m + v, mode: m, v, x, z, c: '#6E7B91', lobby: 1 }));
const MODE_N = { chairrace: '🪑 Гонки', printerwar: '🖨️ Принтер', deadline: '⏰ Дедлайн', hideboss: '🙈 Хованки', nightshift: '🔦 Нічна зміна' };
FLOOR_BINS.forEach(b => { b.n = `${MODE_N[b.mode]} · хол поверху ${b.v + 1}`; });
const BINS = HUB_BINS.concat(FLOOR_BINS);
BINS.forEach(b => { b.top = (b.ledge ? LEDGE_H : 0) + BIN_H; });

/* ---------- Нагороди ---------- */
function tier(d) { return d < 4 ? 1 : d < 8 ? 3 : d < 12 ? 6 : 12; }
function reward(d, streak) {
  const coins = tier(d) + Math.min(5, Math.max(0, streak - 1));   // серія: +1🪙 за кожне влучання поспіль (до +5)
  return { coins, xp: 2 + tier(d) * 4, snipe: d >= 12 };
}
function today() { const t = PB.now ? new Date(PB.now) : new Date(); return t.getFullYear() + '-' + (t.getMonth() + 1) + '-' + t.getDate(); }
function data() {
  const d = A.data();
  for (const k of ['throws', 'hits', 'best', 'streak', 'bestStreak', 'snipes', 'coins', 'dayCoins', 'dayXP', 'npc']) if (typeof d[k] !== 'number') d[k] = 0;
  if (d.day !== today()) { d.day = today(); d.dayCoins = 0; d.dayXP = 0; }
  return d;
}
// Влучання: монети/XP з урахуванням денного ліміту. Повертає, що реально видали.
function score(dist, bin) {
  const d = data(); d.hits++; d.streak++; d.bestStreak = Math.max(d.bestStreak, d.streak); d.best = Math.max(d.best, Math.round(dist * 10) / 10);
  const r = reward(dist, d.streak); if (r.snipe) d.snipes++;
  const coins = Math.max(0, Math.min(r.coins, CAP_COINS - d.dayCoins)), xp = Math.max(0, Math.min(r.xp, CAP_XP - d.dayXP));
  d.dayCoins += coins; d.dayXP += xp; d.coins += coins;
  if (coins) P.coins += coins;
  if (!SIMSIDE) {
    const x = bin.x, z = bin.z;
    if (xp) addXP(xp, x, z);
    ftext(x, bin.top + 1.4, z, coins ? `+${coins} 🪙 · ${dist.toFixed(1)} м` : `${dist.toFixed(1)} м`, 'gold');
    if (r.snipe) { ftext(x, bin.top + 2.1, z, '🎯 Снайпер!', 'gold'); if (typeof banner === 'function') banner(`🎯 Снайпер! ${dist.toFixed(1)} м — прямо в смітник`); }
    if (d.streak >= 3) ftext(x, bin.top + 1.8, z, `🔥 Серія ×${d.streak}`, 'gold');
    if (!coins && !xp && !d.capSaid) { d.capSaid = today(); toast('🗞️ Ліміт папірцевих премій на сьогодні вичерпано — далі тільки для слави. Завтра знову!'); }
    if (typeof sfx === 'function') { sfx('ding', x, z); if (coins) sfx('coin'); }
    if (typeof burst === 'function') burst(x, bin.top + .2, z, '#FFF6DA', 10, 3, .6, 3);
    if (typeof ringFX === 'function') ringFX(x, z, 1.2, '#FFD27A', .5);
    if (typeof refreshHUD === 'function') refreshHUD();
  }
  return { coins, xp, snipe: r.snipe, streak: d.streak };
}
function missed() { const d = data(); d.streak = 0; }

/* ---------- Де можна кидати ---------- */
// Гуща — завжди; хол поверху — лише поки не йде раунд (режими вмикають modeBar на час раунду).
function zone(x = pl.x, z = pl.z) {
  if (dist2(x, z, HUB.x, HUB.z) < HUB.r + .3) return 'hub';
  const mb = typeof MODEBAR !== 'undefined' && MODEBAR;
  if (!mb && FLOOR_BINS.some(b => dist2(x, z, b.x, b.z) < LOBBY_R)) return 'lobby';
  return null;
}
function canThrow() { return running && !pl.dead && !panel && !paused && !!zone(); }

/* ---------- Світ: смітники (статика на сервері й клієнті, меші — тільки клієнт) ---------- */
// Режими, що вантажаться після нас (за абеткою — printerwar, rafting…), ставлять меблі пізніше, тож смітники ставимо
// окремим обробником у самому кінці 'world' (addonEmit обходить і щойно доданий обробник). Однаково на сервері й клієнті.
let placed = false;
A.on('world', () => { A.on('world', placeBins); });
function placeBins() {
  if (placed) return; placed = true;
  for (const b of BINS) {
    fit(b);
    if (b.ledge) addStatic(b.x, b.z, .62, LEDGE_H + BIN_H); else addStatic(b.x, b.z, .34, BIN_H);
    if (!SIMSIDE && typeof scene !== 'undefined') scene.add(binMesh(b));
  }
}
// Якщо режим тим часом поставив меблі на наше місце — посуваємо смітник до найближчого вільного (детерміновано).
function clearAt(x, z, own) {
  let c = Infinity;
  for (const o of STATICS) c = Math.min(c, Math.hypot(x - o.x, z - o.z) - o.r);
  if (typeof PROPS !== 'undefined') for (const p of PROPS) c = Math.min(c, Math.hypot(x - p.x, z - p.z) - (p.r || .5) - .2);
  if (typeof BODIES !== 'undefined') for (const p of BODIES) c = Math.min(c, Math.hypot(x - p.x, z - p.z) - .7);
  return c - own;
}
function lineFree(ax, az, bx, bz) {
  const vx = bx - ax, vz = bz - az, L2 = vx * vx + vz * vz || 1;
  return !STATICS.some(o => { let t = ((o.x - ax) * vx + (o.z - az) * vz) / L2; t = Math.max(0, Math.min(1, t)); return Math.hypot(ax + vx * t - o.x, az + vz * t - o.z) < o.r + .05; });
}
function fit(b) {
  const own = b.ledge ? .62 : .34; b.x0 = b.x; b.z0 = b.z;
  if (clearAt(b.x, b.z, own) >= .2) return;
  for (let r = .25; r <= 2.5; r += .25) for (let k = 0; k < 16; k++) {
    const a = k / 16 * Math.PI * 2, x = b.x0 + Math.cos(a) * r, z = b.z0 + Math.sin(a) * r;
    if (clearAt(x, z, own) >= .2 && lineFree(b.x0, b.z0, x, z)) { b.x = Math.round(x * 100) / 100; b.z = Math.round(z * 100) / 100; b.moved = 1; return; }
  }
}
function binMesh(b) {
  const g = new THREE.Group(); g.position.set(b.x, 0, b.z); g.userData.pbBin = b.id;
  let y = 0;
  if (b.ledge) {   // ящики-«виступ»
    put(g, mesh(new THREE.BoxGeometry(1.15, .68, 1.05), '#B98A5E'), 0, .34, 0);
    const c2 = put(g, mesh(new THREE.BoxGeometry(.95, .62, .9), '#C99A6A'), .03, .99, -.02); c2.rotation.y = .18;
    put(g, mesh(new THREE.BoxGeometry(1.17, .06, .3), '#8E6A48'), 0, .52, .38);
    y = LEDGE_H;
  }
  put(g, mesh(new THREE.CylinderGeometry(.3, .23, BIN_H, 12), b.c), 0, y + BIN_H / 2, 0);
  const rim = put(g, mesh(new THREE.TorusGeometry(.29, .035, 6, 16), '#E9EEF6'), 0, y + BIN_H, 0); rim.rotation.x = Math.PI / 2;
  put(g, mesh(new THREE.CircleGeometry(.27, 12), '#2E2346', false), 0, y + BIN_H - .01, 0).rotation.x = -Math.PI / 2;
  for (const [px, pz, s] of [[-.08, .05, 1], [.1, -.06, .8]]) put(g, mesh(new THREE.IcosahedronGeometry(.09 * s, 0), '#F4F1E8'), px, y + BIN_H - .02, pz);
  put(g, mesh(new THREE.BoxGeometry(.2, .2, .02), '#FFFFFF', false), 0, y + BIN_H * .55, .29);   // табличка «папір»
  put(g, mesh(new THREE.BoxGeometry(.12, .03, .021), '#4FB89A', false), 0, y + BIN_H * .55 + .03, .3);
  return g;
}

/* ---------- Папірці ---------- */
const PB = { balls: [], litter: [], charging: false, ch: 0, chT: 0, cd: 0, sid: 0, ag: new Map(), touch: false, now: 0, said: 0 };
let ballGeo = null;
function power(t) { const k = (t / CHARGE_T) % 2; return k <= 1 ? k : 2 - k; }        // шкала ходить 0→1→0…
function distOf(p) { return MIN_D + p * (MAX_D - MIN_D); }
// Початкова швидкість, щоб упасти на землю на відстані d у напрямку (dx,dz)
function launch(x, z, dx, dz, d) {
  const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
  const T = .55 + d * .042, vh = d / T, vy = (0 - Y0 + .5 * G_ACC * T * T) / T;
  return { x, y: Y0, z, vx: dx * vh, vy, vz: dz * vh, T };
}
function aimDir() {
  if (PB.touch || !input.aimOk) {   // телефон / без курсора — до найближчого смітника в зоні кидка, інакше вперед
    const b = nearestBin(MAX_D + 1); if (b) return { dx: b.x - pl.x, dz: b.z - pl.z };
    return { dx: Math.sin(pl.face), dz: Math.cos(pl.face) };
  }
  return { dx: input.ax - pl.x, dz: input.az - pl.z };
}
function nearestBin(r) { let best = null, bd = r; for (const b of BINS) { const d = dist2(pl.x, pl.z, b.x, b.z); if (d < bd) { bd = d; best = b; } } return best; }

function startCharge() {
  if (!canThrow()) { if (!SIMSIDE && gameTime - PB.said > 4) { PB.said = gameTime; toast('🗞️ Папірці кидаємо лише в «Кавовій Гущі» та в холі поверху, поки не почався раунд.'); } return false; }
  if (PB.cd > 0 || PB.charging) return true;
  PB.charging = true; PB.chT = 0; PB.ch = 0; if (typeof sfx === 'function') sfx('charge');
  return true;
}
function release() {
  if (!PB.charging) return null;
  PB.charging = false; arcShow(false);
  if (!canThrow()) return null;
  const a = aimDir(), d = distOf(PB.ch);
  return throwBall(pl.x, pl.z, a.dx, a.dz, d);
}
function throwBall(x, z, dx, dz, d, remote) {
  const L = launch(x, z, dx, dz, d);
  const b = Object.assign(L, { id: ++PB.sid, ox: x, oz: z, remote: !!remote, t: 0, done: false, bounced: false, hitNpc: false, mesh: null, trail: [] });
  if (!SIMSIDE && typeof scene !== 'undefined') {
    if (!ballGeo) ballGeo = new THREE.IcosahedronGeometry(.13, 0);
    b.mesh = A.dynamic(mesh(ballGeo, '#F4F1E8')); b.mesh.position.set(b.x, b.y, b.z); scene.add(b.mesh);
  }
  PB.balls.push(b);
  if (!remote) {
    PB.cd = CD; data().throws++;
    pl.face = Math.atan2(dx, dz); pl.swingT = .25;
    if (typeof sfx === 'function') sfx('throw');
    if (typeof NET !== 'undefined' && NET.on && !SIMSIDE) A.send('ball', { x: r2(x), z: r2(z), dx: r2(dx), dz: r2(dz), d: r2(d) });
  }
  return b;
}
const r2 = v => Math.round(v * 100) / 100;
A.onNet('ball', (m, from) => {
  if (SIMSIDE || !m || from.id === -1 || (typeof NET !== 'undefined' && from.id === NET.id)) return;
  const d = Math.min(MAX_D, Math.max(MIN_D, +m.d || 0));
  if (isFinite(m.x) && isFinite(m.z) && isFinite(m.dx) && isFinite(m.dz)) throwBall(+m.x, +m.z, +m.dx, +m.dz, d, true);
});

/* ---------- Влучання в людей (косметична агресія) ---------- */
// Цілі: зомбі-офісники (MON), Маріанна біля бару, інші гравці. Повертає {key, ent, x, z, h, n}
function npcTargets() {
  const out = [];
  if (typeof MON !== 'undefined') for (const m of MON) if (!m.dead && OFFICE_MON.includes(m.type)) out.push({ key: 'm' + MON.indexOf(m), ent: m, x: m.x, z: m.z, h: m.bh || 2.3, n: 'офісник', mon: m });
  if (typeof GIVER !== 'undefined') out.push({ key: 'giver', ent: GIVER, x: GIVER.x, z: GIVER.z, h: 1.9, n: 'Маріанна' });
  if (typeof NET !== 'undefined' && NET.on) for (const id in NET.players) { const r = NET.players[id]; if (r && isFinite(r.x)) out.push({ key: 'p' + id, ent: r, x: r.x, z: r.z, h: 1.9, n: r.name || 'колега' }); }
  return out;
}
const GRUMBLE = ['Ей!', 'Ей! Я ж працюю!', 'Хто кинув?!', 'Це був мій звіт?!', 'Ну все, пишу в HR!', 'Ей! В смітник цілься!'];
function hitNpc(t, ball) {
  const d = data(); d.npc++;
  const a = PB.ag.get(t.key) || { t, v: 0, life: 0, el: null };
  a.t = t; a.v = Math.min(1, a.v + .35); a.life = 4.5; PB.ag.set(t.key, a);
  if (t.mon) { const m = t.mon; if (!m.calm && m.state === 'wander') m.state = 'chase'; m.face = Math.atan2(ball.ox - m.x, ball.oz - m.z); }
  if (!SIMSIDE) {
    const txt = a.v >= 1 ? '😡 ВСЕ! Я ЗЛИЙ!' : GRUMBLE[(Math.random() * GRUMBLE.length) | 0];
    bubble(t.ent, txt, true, 2.2);
    if (typeof sfx === 'function') sfx('aggro', t.x, t.z);
  }
  try { window.dispatchEvent(new CustomEvent('paperball:hit', { detail: { key: t.key, x: t.x, z: t.z, aggro: a.v, mon: t.mon || null, remote: ball.remote } })); } catch (e) { }
  return a;
}
// Удар м'ячика по гравцю від чужого кидка
function hitMe() { if (!SIMSIDE) { bubble(pl, 'Ей!', true, 1.6); if (typeof sfx === 'function') sfx('hit'); } }

/* ---------- Політ ---------- */
function stepBall(b, dt) {
  const px = b.x, py = b.y, pz = b.z;
  b.t += dt; b.x += b.vx * dt; b.y += b.vy * dt - .5 * G_ACC * dt * dt; b.z += b.vz * dt; b.vy -= G_ACC * dt;   // точна парабола
  // смітники: падаючи, папірець перетинає площину верху смітника
  if (!b.bounced) for (const bin of BINS) {
    if (Math.abs(bin.x - b.x) > 3 || Math.abs(bin.z - b.z) > 3) continue;
    if (py >= bin.top && b.y < bin.top && b.vy < 0) {
      const k = (py - bin.top) / (py - b.y), cx = px + (b.x - px) * k, cz = pz + (b.z - pz) * k, r = Math.hypot(cx - bin.x, cz - bin.z);
      if (r < BIN_IN) { inBin(b, bin); return; }
      if (r < BIN_RIM) { bounce(b, cx - bin.x, cz - bin.z, .5); if (!b.remote && !SIMSIDE) ftext(bin.x, bin.top + .8, bin.z, 'Об бортик!', ''); return; }
    }
    const sideR = bin.ledge && b.y < LEDGE_H ? .62 : .33;
    if (b.y < bin.top && Math.hypot(b.x - bin.x, b.z - bin.z) < sideR) { bounce(b, b.x - bin.x, b.z - bin.z, .35); return; }
  }
  // люди
  if (!b.bounced && !b.hitNpc) {
    for (const t of npcTargets()) if (b.y < t.h && b.y > .2 && Math.hypot(b.x - t.x, b.z - t.z) < .5) { b.hitNpc = true; hitNpc(t, b); bounce(b, b.x - t.x, b.z - t.z, .3); return; }
    if (b.remote && b.y < 2 && b.y > .2 && Math.hypot(b.x - pl.x, b.z - pl.z) < .5) { b.hitNpc = true; hitMe(); bounce(b, b.x - pl.x, b.z - pl.z, .3); return; }
  }
  if (b.y <= .13) { b.y = .13; land(b); }
}
function bounce(b, nx, nz, k) {
  const L = Math.hypot(nx, nz) || 1; b.bounced = true;
  b.vx = nx / L * 2 * k + b.vx * -.15; b.vz = nz / L * 2 * k + b.vz * -.15; b.vy = Math.abs(b.vy) * .25 + 1;
}
function land(b) {
  b.done = true; b.vx = b.vy = b.vz = 0;
  if (!b.remote) { missed(); if (!SIMSIDE) ftext(b.x, 1, b.z, 'Мимо…', ''); }
  if (b.mesh) { PB.litter.push({ m: b.mesh, t: 8 }); b.mesh.position.set(b.x, .13, b.z); b.mesh = null; while (PB.litter.length > 20) dropLitter(PB.litter.shift()); }
}
function inBin(b, bin) {
  b.done = true; b.inBin = bin.id;
  if (b.mesh) { scene.remove(b.mesh); b.mesh = null; }
  if (b.remote) { if (typeof burst === 'function') burst(bin.x, bin.top + .2, bin.z, '#FFF6DA', 6, 2, .5, 2); return; }
  b.res = score(Math.hypot(bin.x - b.ox, bin.z - b.oz), bin);
}
function dropLitter(l) { if (l.m && l.m.parent) l.m.parent.remove(l.m); }

/* ---------- Дуга-підказка, шкала сили, кнопка, агресія (HTML) ---------- */
let arc = null, arcPos = null;
const ARC_N = 28, ARC_SHOW = .55;   // показуємо лише першу частину дуги — точку падіння вгадуй сам
function arcShow(on) { if (arc) arc.visible = !!on; }
function arcUpdate() {
  if (SIMSIDE || typeof scene === 'undefined') return;
  if (!arc) {
    arcPos = new Float32Array(ARC_N * 3);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(arcPos, 3));
    arc = A.dynamic(new THREE.Points(g, new THREE.PointsMaterial({ color: '#FFD27A', size: .22, transparent: true, opacity: .9, depthWrite: false })));
    arc.frustumCulled = false; scene.add(arc);
  }
  const a = aimDir(), L = launch(pl.x, pl.z, a.dx, a.dz, distOf(PB.ch));
  for (let i = 0; i < ARC_N; i++) {
    const t = L.T * ARC_SHOW * (i + 1) / ARC_N;
    arcPos[i * 3] = L.x + L.vx * t; arcPos[i * 3 + 1] = L.y + L.vy * t - .5 * G_ACC * t * t; arcPos[i * 3 + 2] = L.z + L.vz * t;
  }
  arc.geometry.attributes.position.needsUpdate = true; arc.visible = true;
}
function css() {
  if (SIMSIDE || document.getElementById('pb-css')) return;
  const s = document.createElement('style'); s.id = 'pb-css';
  s.textContent = `#pb-charge{position:fixed;z-index:30;pointer-events:none;transform:translate(-50%,-100%);font:700 11px system-ui,sans-serif;color:#2E2346;text-align:center}
#pb-charge .bar{width:84px;height:9px;border-radius:6px;background:rgba(46,35,70,.55);overflow:hidden;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.25)}
#pb-charge .fill{height:100%;background:linear-gradient(90deg,#7FD6B9,#FFD27A,#FF7A6B)}
#pb-charge .lbl{margin-bottom:3px;background:#FFF6DA;border-radius:8px;padding:1px 6px;display:inline-block}
#pb-btn{position:fixed;right:18px;bottom:210px;z-index:30;width:58px;height:58px;border-radius:50%;border:3px solid #fff;background:#FFD27A;font-size:26px;box-shadow:0 3px 10px rgba(0,0,0,.3);touch-action:none;user-select:none}
.pb-ag{position:fixed;z-index:29;pointer-events:none;transform:translate(-50%,-100%);font:700 10px system-ui,sans-serif;color:#fff;text-align:center;text-shadow:0 1px 2px #000}
.pb-ag .bar{width:46px;height:6px;border-radius:4px;background:rgba(46,35,70,.6);overflow:hidden;border:1px solid #fff;margin-top:1px}
.pb-ag .fill{height:100%;background:#FF5C5C}`;
  document.head.appendChild(s);
}
function el(id, html) { let e = document.getElementById(id); if (!e) { e = document.createElement('div'); e.id = id; e.innerHTML = html || ''; document.body.appendChild(e); } return e; }
function hudCharge() {
  const e = document.getElementById('pb-charge');
  if (!PB.charging) { if (e) e.style.display = 'none'; return; }
  const c = el('pb-charge', '<div class="lbl"></div><div class="bar"><div class="fill"></div></div>'); c.style.display = '';
  const p = screenPos(pl.x, 2.75, pl.z), d = distOf(PB.ch); c.style.left = p.x + 'px'; c.style.top = p.y + 'px';
  c.querySelector('.fill').style.width = Math.round(PB.ch * 100) + '%';
  const t = `🗞️ ~${d.toFixed(0)} м`; const l = c.querySelector('.lbl'); if (l.textContent !== t) l.textContent = t;
}
function hudButton() {
  if (!IS_TOUCH) return;
  const b = el('pb-btn'); if (!b.dataset.on) {
    b.dataset.on = 1; b.textContent = '🗞️'; b.title = 'Кинути папірець';
    b.addEventListener('pointerdown', e => { e.preventDefault(); PB.touch = true; startCharge(); });
    b.addEventListener('pointerup', e => { e.preventDefault(); release(); });
    b.addEventListener('pointercancel', () => { PB.charging = false; arcShow(false); });
  }
  b.style.display = canThrow() ? '' : 'none';
}
function hudAggro(dt) {
  for (const [k, a] of PB.ag) {
    a.life -= dt;
    if (a.t.mon && a.t.mon.dead) a.life = 0;
    if (a.life <= 0) { a.v = Math.max(0, a.v - dt * .5); if (a.v <= 0) { if (a.el) a.el.remove(); PB.ag.delete(k); continue; } }
    if (SIMSIDE) continue;
    const ent = a.t.ent, x = ent.x != null ? ent.x : a.t.x, z = ent.z != null ? ent.z : a.t.z;
    if (!a.el) { a.el = document.createElement('div'); a.el.className = 'pb-ag'; a.el.innerHTML = '😡 агресія<div class="bar"><div class="fill"></div></div>'; document.body.appendChild(a.el); }
    const p = screenPos(x, 1.95, z);   // на рівні голови, під реплікою a.el.style.display = p.vis ? '' : 'none';
    a.el.style.left = p.x + 'px'; a.el.style.top = p.y + 'px'; a.el.querySelector('.fill').style.width = Math.round(a.v * 100) + '%';
    // косметика: злий офісник дивиться на тебе й підстрибує
    if (a.t.mon && a.life > 0) { const m = a.t.mon; m.face = Math.atan2(pl.x - m.x, pl.z - m.z); }
  }
}

/* ---------- Клавіша T ---------- */
A.key(KEY, () => startCharge());
if (!SIMSIDE && typeof addEventListener === 'function') {
  addEventListener('keyup', e => { if (e.code === KEY && PB.charging) release(); });
  addEventListener('blur', () => { PB.charging = false; arcShow(false); });
}

/* ---------- Кадр ---------- */
A.on('tick', dt => {
  if (SIMSIDE) return;
  PB.cd = Math.max(0, PB.cd - dt);
  if (PB.charging) {
    if (!canThrow()) { PB.charging = false; arcShow(false); }
    else { PB.chT += dt; PB.ch = power(PB.chT); arcUpdate(); }
  }
  for (let i = PB.balls.length - 1; i >= 0; i--) {
    const b = PB.balls[i];
    if (!b.done) { const n = Math.ceil(dt / .02); for (let k = 0; k < n && !b.done; k++) stepBall(b, dt / n); }
    if (b.mesh) { b.mesh.position.set(b.x, b.y, b.z); b.mesh.rotation.x += dt * 9; b.mesh.rotation.y += dt * 6; }
    if (b.done || b.t > 6) { if (!b.done) land(b); PB.balls.splice(i, 1); }
  }
  for (let i = PB.litter.length - 1; i >= 0; i--) { const l = PB.litter[i]; l.t -= dt; if (l.t <= 0) { dropLitter(l); PB.litter.splice(i, 1); } }
  css(); hudCharge(); hudButton(); hudAggro(dt);
  // перша підказка біля смітника
  if (running && !panel) { const d = A.data(); if (!d.hint && zone() && nearestBin(6)) { d.hint = 1; toast(`🗞️ Смітник поруч! ${IS_TOUCH ? 'Затисни кнопку 🗞️' : 'Затисни <b>T</b>, цілься курсором'} — відпусти, щоб кинути папірець. Чим далі — тим більше 🪙.`); } }
});

/* ---------- Вкладка зі статистикою ---------- */
A.tab('paperball', '🗞️ Папірець', () => {
  const d = data(), acc = d.throws ? Math.round(d.hits / d.throws * 100) : 0;
  return `<h3>🗞️ Папірець у смітник</h3>
    <p style="font-size:13px;line-height:1.5;margin:4px 0 10px">Офісний баскетбол. ${IS_TOUCH ? 'Затисни кнопку 🗞️' : 'Затисни <b>T</b> і цілься курсором'}: шкала сили ходить туди-сюди — відпусти в потрібний момент. Кидати можна в «Кавовій Гущі» й у холі будь-якого поверху (поки не почався раунд).</p>
    <div class="list" style="font-size:13px;line-height:1.6">
      <div>🎯 Влучань: <b>${d.hits}</b> з ${d.throws} (${acc}%) · 🏆 рекорд відстані: <b>${d.best.toFixed(1)} м</b></div>
      <div>🔥 Серія зараз: <b>${d.streak}</b> · найкраща: <b>${d.bestStreak}</b> · 🎯 «Снайпер!»: ${d.snipes}</div>
      <div>🪙 Сьогодні: ${d.dayCoins}/${CAP_COINS} · XP ${d.dayXP}/${CAP_XP} · усього заробив: ${d.coins} 🪙</div>
      <div>😡 Влучив в офісників: ${d.npc} (вони пам'ятають)</div>
      <div style="margin-top:6px">Ціна влучання: &lt;4 м — 1🪙 · 4–8 м — 3🪙 · 8–12 м — 6🪙 · &gt;12 м — 12🪙 + «Снайпер!». Серія: +1🪙 за кожне влучання поспіль (до +5).</div>
      <div>Смітники в «Гущі»: ${HUB_BINS.map(b => b.n).join(', ')}. Ще по одному — у холі кожного з 15 поверхів офісних режимів.</div>
    </div>`;
});

if (window.__ADDON_TEST) window.__paperball = { PB, BINS, HUB_BINS, FLOOR_BINS, KEY, tier, reward, score, missed, zone, canThrow, data, launch, throwBall, stepBall, release, startCharge, power, distOf, npcTargets, hitNpc, CAP_COINS, CAP_XP, MAX_D, LOBBY_R, BIN_IN, today };
