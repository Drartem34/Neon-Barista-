/* Аддон «Еспресо-Сплав» (Рафтинг-Запара): новий режим на 5 хвилин.
   Два плоти пливуть бурхливою річкою поруч. На вашому — кухня (бар, кавомашини, баки),
   на сусідньому — хвилі зомбі-офісників, які стрибають до вас на абордаж.
   - Вари каву на плоту й закидай нею зомбі (як завжди).
   - Вантуз-гарпун витягує з річки ящики й бочки… і зомбі з чужого плота прямо у воду.
   - З бочок — кавовий порох: на столі збирається бомба (G — кинути). 3–4 вибухи — і їхній пліт іде на дно.
   - Важкі баки на плоту можна схопити (F) і жбурнути (Q/ЛКМ) на сусідній пліт — кеглі!
   - Пороги: пліт б'ється об каміння, усіх відкидає. Змило за борт — пливи назад (пробіл — підстрибнути).
   Інвентар той самий, що й у відкритому світі; нагороди — туди ж.
   У спільному світі (сервер світу) сплав один на всіх: хвилі, пліт і лут рахує сервер.
   Картинку для картки в меню поклади поруч: addons/rafting/rafting-bg.jpg */
const A = Addon.info({ name: 'Еспресо-Сплав', version: '1.0', desc: 'Режим «Рафтинг-Запара»: 5 хвилин на плоту, хвилі зомбі з сусіднього плота, лут у річці, бомби й баки-снаряди.' });

const SIMSIDE = !!window.__SIM;
const AUTH = () => SIMSIDE || !(typeof WORLD !== 'undefined' && WORLD.on);   // хто рахує сплав: сервер світу або сам гравець
const IMG = 'addons/rafting/rafting-bg.jpg';

/* ---------- Геометрія ---------- */
const RX = -112, RZ = 84, ISL_R = 26, WATER_W = 15, RIVER_L = 26, FLOW = 3.2;
const OUR = { x0: RX - 9, x1: RX - 1.5, z0: RZ - 5.5, z1: RZ + 5.5 };   // наш пліт
const EN = { x0: RX + 1.5, x1: RX + 8.5, z0: RZ - 5, z1: RZ + 5 };      // пліт зомбі
const SPAWN = { x: RX - 5.2, z: RZ + 1.6 };
const BAR = { x: RX - 5.2, z: RZ - 4.2 }, BELL = { x: RX - 2.6, z: RZ + 4.4 }, TABLE = { x: RX - 7.6, z: RZ + 4.2 };
const MACH = [[RX - 8.2, RZ - 1.6], [RX - 2.3, RZ - 1.6]];
const BINS = [['bin', RX - 3.2, RZ + 1.2], ['bin', RX - 7.2, RZ + 1.2], ['keg', RX - 5.2, RZ + 2.9]];
const inRect = (r, x, z, m = 0) => x > r.x0 + m && x < r.x1 - m && z > r.z0 + m && z < r.z1 - m;
const inRiver = (x, z) => dist2(x, z, RX, RZ) < ISL_R + 2;

/* ---------- Нові ресурси ---------- */
Object.assign(ING, {
  powder: { n: 'Кавовий порох', ic: '🧨', c: '#E8505B' },
  cbomb: { n: 'Кавова бомба', ic: '💣', c: '#4E4A6E' },
});
const BOMB_NEED = { powder: 2, tape: 1 };

/* ---------- Острів-річка ---------- */
A.island({ id: 'river', n: 'Еспресо-Сплав', sub: 'бурхлива річка · два плоти · 5 хвилин м’ясорубки', x: RX, z: RZ, r: ISL_R, top: '#6FD0E2', rock: '#7F8FC8', biome: 'river', tier: 1.5, noZone: true });
let DRY = false;   // кинутий бак летить над водою
const _terrainAt = terrainAt;
terrainAt = function (x, z) {
  if (dist2(x, z, RX, RZ) < ISL_R) {
    if (DRY || inRect(OUR, x, z) || (ST.enemy && inRect(EN, x, z))) return 'land';
    return 'deep';
  }
  return _terrainAt.apply(this, arguments);
};
const _buildIsland = buildIsland;
buildIsland = function (s) { if (s.biome !== 'river') return _buildIsland.apply(this, arguments); return SIMSIDE ? new THREE.Group() : buildRiver(); };
const _moveBody = moveBody;
moveBody = function (b, dt) {
  if (!(b.thrownT > 0)) return _moveBody.apply(this, arguments);
  b.thrownT -= dt; DRY = true;
  try { _moveBody.apply(this, arguments); } finally { DRY = false; }
  b.y = b.thrownT > 0 ? Math.sin(Math.PI * (1 - b.thrownT / 1.2)) * 1.8 : 0;
};
const _nearBar = nearBar;
nearBar = function () { if (dist2(pl.x, pl.z, BAR.x, BAR.z) < 3.3 && !kitchenOk()) return false; return _nearBar.apply(this, arguments); };
const RAFT_PROPS = [];
const kitchenOk = () => RAFT_PROPS.some(p => p.alive);
if (!BARS.some(b => b.x === BAR.x && b.z === BAR.z)) BARS.push({ x: BAR.x, z: BAR.z });

/* ---------- Стан сплаву ---------- */
const ST = { on: false, t: 0, dur: 300, wave: 0, next: 0, hp: 4, max: 4, enemy: true, arr: 0, sunk: 0, crates: [], seq: 0, res: null };
const AU = { jumpT: 3, crateT: 2, rapT: 50, idle: 0, stT: 0, pend: 0, rapGo: -1 };   // лише в того, хто рахує
const myId = () => (NET.on && typeof WORLD !== 'undefined' && WORLD.on ? NET.id : 'me');
function snap() { return { on: ST.on ? 1 : 0, t: Math.round(ST.t * 10) / 10, dur: ST.dur, w: ST.wave, nx: Math.round(ST.next), hp: ST.hp, mx: ST.max, en: ST.enemy ? 1 : 0, arr: Math.round(ST.arr * 10) / 10, sk: ST.sunk, cr: ST.crates.map(c => [c.id, c.x, c.z0, c.t0, c.k]) }; }
function applySnap(d) {
  const was = ST.on;
  Object.assign(ST, { on: !!d.on, t: +d.t || 0, dur: +d.dur || 300, wave: d.w | 0, next: +d.nx || 0, hp: d.hp | 0, max: d.mx | 0 || 4, enemy: !!d.en, arr: +d.arr || 0, sunk: d.sk | 0 });
  if (Array.isArray(d.cr)) ST.crates = d.cr.slice(0, 40).map(a => ({ id: a[0], x: +a[1], z0: +a[2], t0: +a[3], k: a[4] === 'barrel' ? 'barrel' : 'box' }));
  if (ST.on && !was) joinedRun();
}
function pushState() { if (SIMSIDE) A.send('st', snap()); }
function emit(e) { if (SIMSIDE) A.send('ev', e); else onEvent(e); }
function req(k, d) { const o = Object.assign({ k }, d || {}); if (AUTH()) onReq(o, { id: myId(), name: myName() }); else A.send('rq', o); }
A.onNet('st', (d, from) => { if (!SIMSIDE && !AUTH() && from.id === -1 && d) applySnap(d); });
A.onNet('ev', (d, from) => { if (!SIMSIDE && !AUTH() && from.id === -1 && d) onEvent(d); });
A.onNet('rq', (d, from) => { if (SIMSIDE && d) onReq(d, from); });

/* ---------- Хто на сплаві ---------- */
function participants() {
  if (SIMSIDE) return simPlayers().filter(p => !p.dead && inRiver(p.x, p.z));
  return !pl.dead && inRiver(pl.x, pl.z) ? [{ id: myId(), x: pl.x, z: pl.z }] : [];
}
const riverMon = () => MON.filter(m => m.isl && m.isl.id === 'river');
const hostile = () => riverMon().filter(m => !m.calm && m.state !== 'fall');

/* ---------- Логіка сплаву (сервер світу або сам гравець) ---------- */
function onReq(d, from) {
  if (d.k === 'start') { if (!ST.on) startRun(from); }
  else if (d.k === 'grab') grabCrate(+d.id, from);
  else if (d.k === 'bomb') bombAt(+d.x, +d.z, from);
}
function startRun(from) {
  for (const m of riverMon()) removeMonster(m);
  Object.assign(ST, { on: true, t: 0, wave: 0, next: 7, hp: 4, max: 4, enemy: true, arr: 0, sunk: 0, crates: [], res: null });
  Object.assign(AU, { jumpT: 4, crateT: 1, rapT: rand(40, 55), idle: 0, stT: 0, pend: 0, rapGo: -1 });
  for (const p of RAFT_PROPS) if (!p.alive) { p.alive = true; p.hp = p.max; if (p.mesh) p.mesh.visible = true; }
  emit({ k: 'msg', big: 1, txt: `🛶 Сплав почався! ${from && from.name ? escapeHTML(from.name) + ' відчалив. ' : ''}Перша хвиля — за 7 секунд.` });
  pushState(); if (!SIMSIDE) joinedRun();
}
function endRun(win) {
  if (!ST.on) return;
  ST.on = false;
  const res = { k: 'end', win: win ? 1 : 0, w: ST.wave, sk: ST.sunk, t: Math.round(ST.t) };
  for (const m of hostile()) sinkMon(m);
  ST.crates = []; ST.enemy = true; ST.arr = 2.5; ST.hp = ST.max = 4;
  emit(res); pushState();
}
function spawnWave() {
  ST.wave++;
  const n = participants().length || 1;
  const cnt = Math.min(14, Math.round((3 + ST.wave * 1.3) * (1 + .5 * (n - 1))));
  if (!ST.enemy) { ST.enemy = true; ST.hp = ST.max = 3 + Math.floor(ST.wave / 3); ST.arr = 3; AU.pend = cnt; emit({ k: 'msg', txt: `🌊 Хвиля ${ST.wave}: підпливає новий пліт зомбі!` }); }
  else { spawnZombies(cnt); emit({ k: 'msg', txt: `🌊 Хвиля ${ST.wave}! Зомбі: ${cnt}` }); }
  pushState();
}
function spawnZombies(cnt) {
  const w = ST.wave;
  for (let i = 0; i < cnt; i++) {
    const r = Math.random(), type = w >= 4 && r < .2 ? 'hound' : w >= 2 && r < .45 ? 'manager' : 'office';
    let x = 0, z = 0;
    for (let k = 0; k < 20; k++) { x = rand(EN.x0 + 1, EN.x1 - 1); z = rand(EN.z0 + 1, EN.z1 - 1); if (!MON.some(o => dist2(o.x, o.z, x, z) < .9)) break; }
    const m = spawnMonster(type, ISLMAP.river, x, z); if (!m) continue;
    m.rv = 1; m.state = 'chase';
    m.max = Math.round(m.max * (1 + .18 * (w - 1))); m.stress = m.max; m.dmg *= 1 + .1 * (w - 1);
    burst(x, 1, z, '#BDEFFF', 8, 3, .6, 3);
  }
}
function sinkMon(m) {
  if (m.state === 'fall') return;
  if (m.calm) { removeMonster(m); return; }
  m.state = 'fall'; m.vy = -1; m.vx = m.vz = 0; m.rj = null; if (m.bar) m.bar.visible = false;
  burst(m.x, 0, m.z, '#BDEFFF', 14, 3, .7, 3); ftext(m.x, 2, m.z, 'Поплив у відпустку…', 'big');
  addXP(Math.round(m.T.xp * .5), m.x, m.z);
}
function sinkEnemy() {
  ST.enemy = false; ST.sunk++;
  for (const m of riverMon()) if (inRect(EN, m.x, m.z, -.3) && !m.rj) sinkMon(m);
  if (ST.next > 8) ST.next = 8;
  emit({ k: 'sink' });
  emit({ k: 'msg', big: 1, txt: '💥 Пліт зомбі пішов на дно! Наступна хвиля — за 8 секунд.' });
  pushState();
}
function bombAt(x, z, from) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return;
  const R = 3.3, prev = SIMSIDE ? SIM.actor : null;
  if (SIMSIDE && from) SIM.actor = from.id;
  try {
    for (const m of MON.slice()) {
      if (m.calm || m.state === 'fall' || m.carried) continue;
      const d = dist2(m.x, m.z, x, z); if (d > R) continue;
      const a = angTo(x, z, m.x, m.z), f = 22 * (1 - d / (R + 1));
      applyHit(m, 24, Math.sin(a) * f, Math.cos(a) * f); m.stun = Math.max(m.stun, 1.5); m.rj = null;
    }
    for (const p of PROPS) if (p.alive && dist2(p.x, p.z, x, z) < R * .7) damageProp(p, 12, 'boom');
  } finally { if (SIMSIDE) SIM.actor = prev; }
  if (ST.on && ST.enemy && ST.arr <= 0 && inRect(EN, x, z, -.6)) {
    ST.hp--; emit({ k: 'hit', hp: ST.hp });
    if (ST.hp <= 0) sinkEnemy(); else pushState();
  }
}
function grabCrate(id, from) {
  const i = ST.crates.findIndex(c => c.id === id); if (i < 0) return;
  const c = ST.crates[i]; ST.crates.splice(i, 1);
  const it = {}; let coins = 0;
  if (c.k === 'barrel') { it.powder = randi(1, 2); if (Math.random() < .5) it.tape = 1; if (Math.random() < .4) it.bolts = 1; }
  else { it.beans = randi(1, 3); it.milk = randi(1, 2); if (Math.random() < .45) it.syrup = 1; if (Math.random() < .25) it.tears = 1; if (Math.random() < .2) coins = 10; if (Math.random() < .25) it.powder = 1; }
  emit({ k: 'got', id, to: from.id, it, c: coins, x: Math.round(crateZX(c).x * 10) / 10, z: Math.round(crateZX(c).z * 10) / 10 });
  pushState();
}
const crateZX = c => ({ x: c.x, z: c.z0 + FLOW * (ST.t - c.t0) });
if (window.__ADDON_TEST) window.__raft = { ST, crateZX };   // для автотестів

function authTick(dt) {
  if (!ST.on) { if (ST.arr > 0) ST.arr = Math.max(0, ST.arr - dt); return; }
  ST.t += dt;
  const ps = participants();
  if (!ps.length) { AU.idle += dt; if (AU.idle > (SIMSIDE ? 10 : 4)) { emit({ k: 'msg', txt: '🛶 На плоту нікого не лишилось — сплав завершено.' }); endRun(false); } return; }
  AU.idle = 0;
  if (ST.t >= ST.dur) { endRun(true); return; }
  // прибуття нового плота
  if (ST.arr > 0) { ST.arr -= dt; if (ST.arr <= 0) { ST.arr = 0; if (AU.pend) { spawnZombies(AU.pend); AU.pend = 0; } pushState(); } }
  // хвилі
  ST.next -= dt;
  if (ST.next <= 0) { spawnWave(); ST.next = Math.max(30, 45 - ST.wave * 2); }
  else if (ST.wave > 0 && ST.enemy && ST.arr <= 0 && ST.next > 7 && !hostile().length) { ST.next = 6; emit({ k: 'msg', txt: '✅ Хвилю відбито! Наступна — за 6 секунд.' }); pushState(); }
  // стрибки на абордаж
  AU.jumpT -= dt;
  if (AU.jumpT <= 0) {
    AU.jumpT = rand(2.2, 4) / (1 + ST.wave * .12) / Math.sqrt(ps.length);
    const c = hostile().filter(m => inRect(EN, m.x, m.z) && !m.rj && !(m.stun > 0) && m.state === 'chase' && m.x < EN.x0 + 2.6).sort((a, b) => a.x - b.x)[0];
    if (c) {
      const tz = clamp(c.z + rand(-2, 2), OUR.z0 + 1, OUR.z1 - 1), tx = rand(OUR.x1 - 3.2, OUR.x1 - .8);
      c.rj = { sx: c.x, sz: c.z, tx, tz, t: 0 }; c.stun = .95; c.face = angTo(c.x, c.z, tx, tz);
      bubble(c, pick(['НА АБОРДАЖ!', 'Ваша кухня — наша кухня!', 'Тімбілдинг на воді!', 'Я по ваш капучино!']), true, 1.6);
    }
  }
  for (const m of riverMon()) {
    if (m.rj) {
      const j = m.rj; j.t += dt / .85; m.stun = Math.max(m.stun, .1);
      const k = Math.min(1, j.t);
      m.x = lerp(j.sx, j.tx, k); m.z = lerp(j.sz, j.tz, k); m.y = Math.sin(Math.PI * k) * 2.4; m.vx = m.vz = 0;
      if (k >= 1) { m.rj = null; m.y = 0; m.stun = 0; m.state = 'chase'; burst(m.x, .3, m.z, '#D6A87B', 8, 3, .5, 2); ftext(m.x, 2.3, m.z, 'Абордаж!', 'bad'); }
      continue;
    }
    // на нашому плоту зомбі б'ють кавомашини, якщо поруч нема бариста
    if (!m.calm && m.state !== 'fall' && inRect(OUR, m.x, m.z) && !(m.stun > 0)) {
      const near = ps.some(p => dist2(p.x, p.z, m.x, m.z) < 3.2);
      const mc = RAFT_PROPS.filter(p => p.alive).sort((a, b) => dist2(a.x, a.z, m.x, m.z) - dist2(b.x, b.z, m.x, m.z))[0];
      if (!near && mc) {
        const d = dist2(m.x, m.z, mc.x, mc.z);
        if (d > 1.25) { const a = angTo(m.x, m.z, mc.x, mc.z); m.face = a; moveTry(m, Math.sin(a) * m.spd * .8 * dt, Math.cos(a) * m.spd * .8 * dt); m.walk += dt * 6; }
        else { m.kitT = (m.kitT || 1) - dt; if (m.kitT <= 0) { m.kitT = 1.4; damageProp(mc, 3.5, 'hit'); if (Math.random() < .5) bubble(m, pick(['Ваша кава — відстій!', 'Де тут кнопка «капучино»?!', 'Ламаю, бо можу!']), true, 1.6); } }
      }
    }
  }
  for (const p of RAFT_PROPS) if (!p.alive && p.t > 25) p.t = 25;   // кавомашини на плоту лагодяться швидше
  // ящики й бочки в річці
  AU.crateT -= dt;
  if (AU.crateT <= 0) {
    AU.crateT = rand(2.4, 4);
    const lane = Math.random() < .55 ? RX + rand(-.5, .5) : Math.random() < .5 ? RX - rand(10.5, 12.5) : RX + rand(10.5, 12.5);
    ST.crates.push({ id: ++ST.seq, x: Math.round(lane * 10) / 10, z0: RZ - RIVER_L + 1, t0: Math.round(ST.t * 10) / 10, k: Math.random() < .45 ? 'barrel' : 'box' });
    if (ST.crates.length > 24) ST.crates.shift();
    pushState();
  }
  ST.crates = ST.crates.filter(c => crateZX(c).z < RZ + RIVER_L - 1);
  // пороги
  AU.rapT -= dt;
  if (AU.rapT <= 0) { AU.rapT = rand(45, 60); AU.rapGo = 2.6; emit({ k: 'rap', in: 2.6, a: Math.round(rand(0, 6.28) * 100) / 100 }); }
  if (AU.rapGo > 0) {
    AU.rapGo -= dt;
    if (AU.rapGo <= 0) for (const m of hostile()) if (!m.rj) { const a = Math.random() * 6.28; m.vx += Math.sin(a) * 9; m.vz += Math.cos(a) * 9; m.stun = Math.max(m.stun, .8); }
  }
  AU.stT -= dt; if (AU.stT <= 0) { AU.stT = 1; pushState(); }
}
A.on('tick', dt => { if (AUTH()) authTick(dt); else if (ST.on) { ST.t += dt; ST.next = Math.max(0, ST.next - dt); if (ST.arr > 0) ST.arr = Math.max(0, ST.arr - dt); } if (!SIMSIDE) clientTick(dt); });

/* ---------- Будова: кухня, баки, кавомашини (і на сервері, і в гравців) ---------- */
A.on('world', () => {
  barCounter(BAR.x, BAR.z, false);
  addStatic(TABLE.x, TABLE.z, .8); addStatic(BELL.x, BELL.z, .45);
  for (const [x, z] of MACH) { const p = addProp('espmachine', x, z); RAFT_PROPS.push(p); if (!SIMSIDE) espMesh(p); }
  for (const [k, x, z] of BINS) addBody(k, x, z);
  if (!SIMSIDE) buildDecks();
});
function espMesh(p) {
  const g = p.mesh;
  put(g, mesh(new THREE.BoxGeometry(.8, .75, .6), '#C9CDD9'), 0, .38, 0);
  put(g, mesh(new THREE.BoxGeometry(.85, .1, .65), '#8E86B0'), 0, .8, 0);
  put(g, mesh(flat(new THREE.CylinderGeometry(.16, .16, .35, 8)), '#E8505B'), .22, 1.02, 0);
  put(g, mesh(new THREE.BoxGeometry(.18, .1, .04), bulb('#FF6B6B'), false), -.2, .55, .31);
}

/* ======================= ДАЛІ — ЛИШЕ В ГРАВЦЯ ======================= */
const V = { water: null, tex: null, shore: [], en: null, crates: new Map(), rocks: [], hud: null, wetT: 0, grabT: 0, craft: null, bombs: [], card: null, auto: false, joined: false, hitT: 0, rap: null };

/* ---------- Річка ---------- */
function buildRiver() {
  const g = new THREE.Group(); g.position.set(RX, 0, RZ); scene.add(g);
  // русло й берегові скелі (острів плаває в небі, як усі)
  g.add(mesh(new THREE.BoxGeometry(WATER_W * 2 + 12, 1.6, RIVER_L * 2).translate(0, -1.9, 0), '#4E6FA8', false, true));
  let cone = new THREE.ConeGeometry(WATER_W + 4, 22, 10, 4); cone.rotateX(Math.PI); cone.translate(0, -2.7 - 11, 0); cone.scale(1, 1, 1.7);
  g.add(mesh(rough(cone, .4, -2.7), '#7F8FC8', false, false));
  for (const s of [-1, 1]) {
    g.add(mesh(new THREE.BoxGeometry(6, 1.9, RIVER_L * 2).translate(s * (WATER_W + 3), -.55, 0), '#C3E6A8', false, true));
    g.add(mesh(new THREE.BoxGeometry(.6, .5, RIVER_L * 2).translate(s * (WATER_W + .2), -.6, 0), '#E8C98F', false, true));
  }
  // вода з течією (текстура їде)
  const c = document.createElement('canvas'); c.width = 64; c.height = 256;
  const x = c.getContext && c.getContext('2d');
  if (x && x.fillRect) {
    x.fillStyle = '#4FB8D6'; x.fillRect(0, 0, 64, 256);
    for (let i = 0; i < 26; i++) { x.fillStyle = `rgba(255,255,255,${.12 + Math.random() * .25})`; x.fillRect(Math.random() * 60, Math.random() * 256, 2 + Math.random() * 4, 14 + Math.random() * 30); }
  }
  const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(5, 4); V.tex = tex;
  const water = new THREE.Mesh(new THREE.PlaneGeometry(WATER_W * 2, RIVER_L * 2), new THREE.MeshStandardMaterial({ map: tex, color: '#9FE6F5', transparent: true, opacity: .9, roughness: .2, metalness: .05, depthWrite: false }));
  water.rotation.x = -Math.PI / 2; water.position.y = -.35; g.add(A.dynamic(water)); V.water = water;
  // водоспад униз за течією й каскад угорі
  const fall = new THREE.Mesh(new THREE.PlaneGeometry(WATER_W * 2, 18).translate(0, -9, 0), new THREE.MeshBasicMaterial({ color: '#BDEFFF', transparent: true, opacity: .55, side: THREE.DoubleSide, depthWrite: false }));
  fall.position.set(0, -.3, RIVER_L); g.add(A.dynamic(fall));
  g.add(mesh(rough(new THREE.BoxGeometry(WATER_W * 2 + 12, 5, 3, 6, 2, 2), .4).translate(0, 1.2, -RIVER_L - 1.2), '#8F9BD0', false, true));
  const casc = new THREE.Mesh(new THREE.PlaneGeometry(WATER_W * 1.6, 3.6), new THREE.MeshBasicMaterial({ color: '#DFF8FF', transparent: true, opacity: .6, depthWrite: false }));
  casc.position.set(0, 1.5, -RIVER_L + .35); g.add(A.dynamic(casc));
  // береги: дерева, ліхтарі й камені, що «пропливають» повз
  for (let i = 0; i < 16; i++) {
    const s = i % 2 ? 1 : -1, o = new THREE.Group();
    const kind = i % 5;
    if (kind === 4) { put(o, mesh(flat(new THREE.CylinderGeometry(.06, .06, 2.6, 6)), '#4E4A6E'), 0, 1.3, 0); put(o, mesh(new THREE.IcosahedronGeometry(.18, 0), bulb(pick(['#FF6BD6', '#6BE7FF', '#B07CF0'])), false), 0, 2.7, 0); }
    else if (kind === 3) put(o, mesh(rough(new THREE.DodecahedronGeometry(.9, 0), .3), '#9389C9'), 0, .4, 0);
    else { put(o, mesh(flat(new THREE.CylinderGeometry(.14, .2, 1.3, 6)), '#A3795C'), 0, .65, 0); put(o, mesh(new THREE.ConeGeometry(.9, 1.8, 7), pick(['#86CF8E', '#FFB3E6', '#9AD9B0'])), 0, 2, 0); }
    o.position.set(s * (WATER_W + 1.6 + Math.random() * 3.5), .4, -RIVER_L + i * (RIVER_L * 2 / 16)); g.add(A.dynamic(o)); V.shore.push(o);
  }
  return g;
}
function deck(r, cols, dark) {
  const g = new THREE.Group(), w = r.x1 - r.x0, l = r.z1 - r.z0, n = Math.round(w / .62);
  for (let i = 0; i < n; i++) put(g, mesh(new THREE.BoxGeometry(w / n - .05, .3, l), cols[i % 2], false, true), -w / 2 + (i + .5) * w / n, -.15, 0);
  for (const z of [-l / 2 + .6, 0, l / 2 - .6]) put(g, mesh(new THREE.BoxGeometry(w + .3, .2, .35), dark, false), 0, -.32, z);
  for (const xx of [-w / 2 + .5, w / 2 - .5]) put(g, mesh(flat(new THREE.CylinderGeometry(.35, .35, l + .4, 8)), dark, false), xx, -.5, 0).rotation.x = Math.PI / 2;
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) put(g, mesh(flat(new THREE.CylinderGeometry(.08, .1, .9, 6)), dark), a * (w / 2 - .15), .45, b * (l / 2 - .15));
  return g;
}
function buildDecks() {
  // наш пліт
  const our = deck(OUR, ['#D6A87B', '#C4956A'], '#8C6447'); our.position.set((OUR.x0 + OUR.x1) / 2, 0, (OUR.z0 + OUR.z1) / 2); scene.add(our);
  // щогла з неоновою гірляндою й вітрилом-чашкою
  const mx = OUR.x0 + .7, mz = RZ;
  put(our, mesh(flat(new THREE.CylinderGeometry(.1, .12, 5, 6)), '#8C6447'), mx - our.position.x, 2.5, 0);
  const sail = put(our, mesh(new THREE.BoxGeometry(.06, 2.2, 3.2), mat('#FFF3E6', { side: THREE.DoubleSide })), mx - our.position.x + .1, 3.4, 0);
  put(our, mesh(new THREE.BoxGeometry(.08, .9, .9), '#8C5A3C', false), mx - our.position.x + .15, 3.4, 0); void sail;
  for (let i = 0; i < 8; i++) { const c = pick(['#FF6BD6', '#6BE7FF', '#FFD27A', '#B07CF0']), t = i / 7; put(our, mesh(new THREE.IcosahedronGeometry(.09, 0), bulb(c), false), mx - our.position.x + t * 6.3, 4.8 - Math.sin(t * Math.PI) * .9 - t * 2, -4.9 + 0 * mz); }
  addLampGlow(scene, mx, 4.9, mz, '#FF6BD6', 3, { pool: false });
  // дзвін «відчалити»
  const bell = new THREE.Group(); bell.position.set(BELL.x, 0, BELL.z); scene.add(bell);
  put(bell, mesh(flat(new THREE.CylinderGeometry(.06, .06, 1.6, 6)), '#4E4A6E'), 0, .8, 0);
  put(bell, mesh(new THREE.BoxGeometry(.7, .06, .06), '#4E4A6E'), 0, 1.6, 0);
  put(bell, mesh(new THREE.ConeGeometry(.24, .34, 10, 1, true), mat('#FFD27A', { metalness: .5, roughness: .3, side: THREE.DoubleSide })), 0, 1.38, 0);
  // стіл для бомб
  const tb = new THREE.Group(); tb.position.set(TABLE.x, 0, TABLE.z); scene.add(tb);
  put(tb, mesh(new THREE.BoxGeometry(1.5, .1, .9), '#7E77A0'), 0, .85, 0);
  for (const [a, b] of [[-.65, -.35], [.65, -.35], [-.65, .35], [.65, .35]]) put(tb, mesh(new THREE.BoxGeometry(.1, .85, .1), '#4E4A6E'), a, .42, b);
  put(tb, mesh(new THREE.SphereGeometry(.22, 8, 6), '#2E2346'), -.3, 1.1, 0);
  put(tb, mesh(flat(new THREE.CylinderGeometry(.2, .2, .4, 8)), '#E8505B'), .35, 1.1, 0);
  // пліт зомбі (рухається: припливає, тоне)
  const en = new THREE.Group(); scene.add(A.dynamic(en)); V.en = en;
  const ed = deck(EN, ['#9C93B8', '#8A82A8'], '#5E5880'); en.add(ed);
  put(en, mesh(new THREE.BoxGeometry(1.6, .8, .8), '#C2B8C9'), 1.5, .4, -2.8);
  put(en, mesh(new THREE.BoxGeometry(1.8, 1, .08), '#4E4A6E'), -1.5, 1.6, 3.6);
  put(en, mesh(new THREE.BoxGeometry(1.4, .12, .02), '#FF8A7A', false), -1.5, 1.75, 3.65);
  put(en, mesh(flat(new THREE.CylinderGeometry(.06, .06, 1.6, 6)), '#4E4A6E'), -1.5, .8, 3.6);
  en.position.set((EN.x0 + EN.x1) / 2, 0, (EN.z0 + EN.z1) / 2); en.userData.home = en.position.clone();
}

/* ---------- Ящики, бочки, скелі ---------- */
function crateMesh(k) {
  const g = new THREE.Group();
  if (k === 'barrel') {
    put(g, mesh(flat(new THREE.CylinderGeometry(.36, .36, .8, 10)), '#C2335A'), 0, .2, 0);
    for (const y of [-.05, .45]) put(g, mesh(flat(new THREE.CylinderGeometry(.38, .38, .06, 10)), '#4E4A6E'), 0, y, 0);
    put(g, mesh(new THREE.BoxGeometry(.3, .3, .02), bulb('#FFD27A'), false), 0, .25, .37);
  } else {
    put(g, mesh(new THREE.BoxGeometry(.8, .7, .8), '#D6A87B'), 0, .15, 0);
    put(g, mesh(new THREE.BoxGeometry(.84, .08, .84), bulb('#6BE7FF'), false), 0, .52, 0);
  }
  scene.add(g); return g;
}
function syncCrates() {
  const seen = new Set();
  for (const c of ST.crates) {
    seen.add(c.id);
    let v = V.crates.get(c.id); if (!v) { v = { m: crateMesh(c.k) }; V.crates.set(c.id, v); }
    const p = crateZX(c); v.x = p.x; v.z = p.z;
    v.m.position.set(p.x, -.35 + Math.sin(gameTime * 3 + c.id) * .08, p.z); v.m.rotation.y = gameTime * .6 + c.id;
  }
  for (const [id, v] of V.crates) if (!seen.has(id) && !v.fly) { scene.remove(v.m); V.crates.delete(id); }
}

/* ---------- Події від того, хто рахує ---------- */
function onEvent(e) {
  if (SIMSIDE || !e) return;
  const here = running && inRiver(pl.x, pl.z);
  if (e.k === 'msg') { if (here) { if (e.big) banner(e.txt); else toast(e.txt); } }
  else if (e.k === 'hit') { if (here) { ftext((EN.x0 + EN.x1) / 2, 2.5, RZ, `Пліт тріщить! ${'🟫'.repeat(Math.max(0, e.hp))}`, 'crit'); } V.hitT = .5; }
  else if (e.k === 'sink') { if (V.en) { burst((EN.x0 + EN.x1) / 2, .5, RZ, '#8A82A8', 30, 6, 1.2, 5); if (here) { sfx('boom', RX + 5, RZ); shake = Math.max(shake, .5); } } }
  else if (e.k === 'got') {
    const v = V.crates.get(e.id); ST.crates = ST.crates.filter(c => c.id !== e.id);
    if (v) { const who = e.to === myId() ? pl : NET.players[e.to]; v.fly = { t: 0, sx: v.m.position.x, sz: v.m.position.z, who }; }
    if (e.to === myId()) {
      const parts = [];
      for (const k in e.it || {}) { if (!ING[k]) continue; const n = Math.max(0, Math.min(5, e.it[k] | 0)); P.ing[k] = (P.ing[k] || 0) + n; parts.push(`${ING[k].ic}×${n}`); }
      if (e.c) { P.coins += Math.min(50, e.c | 0); parts.push(`🪙${e.c}`); }
      ftext(pl.x, 2.6, pl.z, 'Улов: ' + parts.join(' '), 'gold'); sfx('pick'); refreshHUD(); save();
    }
  }
  else if (e.k === 'rap') { V.rap = { t: +e.in || 2.5, a: +e.a || 0 }; if (here) { banner('⚠️ ПОРОГИ! Тримайся за пліт!'); sfx('warn'); } spawnRocks(); }
  else if (e.k === 'end') finishRun(e);
}
function spawnRocks() {
  for (let i = 0; i < 4; i++) {
    const m = mesh(rough(new THREE.DodecahedronGeometry(rand(.8, 1.4), 0), .35), '#7E77A0');
    const lane = [RX - .2, RX - 11, RX + 11, RX + rand(-12, 12)][i];
    m.position.set(lane, -.2, RZ - RIVER_L - i * 3); scene.add(m); V.rocks.push(m);
  }
}
function joinedRun() { if (inRiver(pl.x, pl.z)) V.joined = true; }
function finishRun(e) {
  const was = V.joined || inRiver(pl.x, pl.z); V.joined = false;
  if (!was || !running) return;
  const w = Math.max(0, e.w | 0), sk = Math.max(0, e.sk | 0), win = !!e.win;
  const coins = 25 * w + 40 * sk + (win ? 60 : 0), xp = 40 * w + 30 * sk + (win ? 80 : 0);
  P.coins += coins; addXP(xp);
  const d = A.data(); d.runs = (d.runs || 0) + 1; if (win) d.wins = (d.wins || 0) + 1; d.best = Math.max(d.best || 0, w); d.sunk = (d.sunk || 0) + sk;
  if (win && w >= 6) addCase(w >= 9 ? 'vacation' : 'deadline');
  banner(win ? `🏁 Сплав пройдено! Хвиль: ${w}, потоплено плотів: ${sk}` : `🛶 Сплав завершено. Хвиль: ${w}, потоплено плотів: ${sk}`);
  toast(`Нагорода: <b>+${coins} 🪙</b> · <b>+${xp} досвіду</b>${win && w >= 6 ? ' · кейс 🎁' : ''}. Ще раз — дзвін 🔔 на плоту.`);
  sfx('level'); refreshHUD(); save();
}

/* ---------- Гравець: вода, лут, бомби, HUD ---------- */
function clientTick(dt) {
  const t = gameTime;
  if (V.tex) V.tex.offset.y -= dt * (ST.on ? FLOW : .7) / 13;
  const flow = (ST.on ? FLOW : .6) * dt;
  for (const o of V.shore) { o.position.z += flow; if (o.position.z > RIVER_L) o.position.z -= RIVER_L * 2; }
  for (let i = V.rocks.length - 1; i >= 0; i--) { const r = V.rocks[i]; r.position.z += FLOW * 3 * dt; r.rotation.y += dt; if (r.position.z > RZ + RIVER_L) { scene.remove(r); V.rocks.splice(i, 1); } }
  // пліт зомбі: припливає, трясеться від влучань, тоне
  if (V.en) {
    const h = V.en.userData.home;
    if (!ST.enemy) { V.en.position.y = Math.max(-3, V.en.position.y - dt * 1.5); V.en.rotation.z = Math.min(.35, V.en.rotation.z + dt * .2); V.en.visible = V.en.position.y > -2.9; }
    else {
      V.en.visible = true; V.en.rotation.z = 0;
      V.en.position.y = Math.sin(t * 1.3) * .05;
      V.en.position.z = h.z - (ST.arr > 0 ? ST.arr / 3 * 28 : 0);
      V.hitT = Math.max(0, V.hitT - dt); V.en.position.x = h.x + (V.hitT > 0 ? Math.sin(t * 60) * .12 : 0);
    }
  }
  syncCrates();
  for (const [id, v] of V.crates) {
    if (!v.fly) continue;
    v.fly.t += dt * 2.2; const w = v.fly.who || pl, k = Math.min(1, v.fly.t);
    v.m.position.set(lerp(v.fly.sx, w.x, k), Math.sin(k * Math.PI) * 2.2, lerp(v.fly.sz, w.z, k)); v.m.scale.setScalar(1 - k * .7);
    if (k >= 1) { scene.remove(v.m); V.crates.delete(id); }
  }
  updBombs(dt);
  if (!running || pl.dead) { hud(false); return; }
  const here = inRiver(pl.x, pl.z);
  hud(here);
  if (!here) { V.wetT = 0; return; }
  if (ST.on) V.joined = true;
  // змило за борт: течія несе, через кілька секунд — рятують на пліт
  if (isWet(pl.terr) && !pl.jump && pl.y < .2) {
    V.wetT += dt; pl.z += (ST.on ? FLOW * .7 : .8) * dt;
    if (V.wetT > 7 || pl.z > RZ + RIVER_L - 3 || Math.abs(pl.x - RX) > WATER_W - 1) {
      V.wetT = 0; place(SPAWN.x, SPAWN.z); hurtPlayer(10); toast('🛟 Тебе змило за борт! Кенти витягли на пліт (−здоров’я).');
    }
  } else V.wetT = 0;
  // ящики поруч — хапаєш руками (навіть коли пливеш)
  V.grabT -= dt;
  if (V.grabT <= 0) for (const c of ST.crates) { const p = crateZX(c); if (dist2(p.x, p.z, pl.x, pl.z) < 1.5) { V.grabT = .4; req('grab', { id: c.id }); break; } }
  // збираю бомбу
  if (V.craft) {
    V.craft.t += dt;
    if (dist2(pl.x, pl.z, TABLE.x, TABLE.z) > 2.6) { V.craft = null; toast('Відійшов від столу — бомбу не дозібрано.'); }
    else if (V.craft.t >= 2.2) {
      V.craft = null;
      if (canAfford(BOMB_NEED)) { for (const k in BOMB_NEED) P.ing[k] -= BOMB_NEED[k]; P.ing.cbomb = (P.ing.cbomb || 0) + 1; toast(`💣 Бомба готова! Усього: <b>${P.ing.cbomb}</b>. <b>G</b> — кинути туди, де курсор.`); sfx('equip'); save(); }
    } else if (Math.random() < dt * 6) burst(TABLE.x, 1.2, TABLE.z, '#FFD27A', 2, 1.5, .4, 1);
  }
  // пороги: удар об камінь
  if (V.rap) {
    V.rap.t -= dt;
    if (V.rap.t <= 0) {
      V.rap = null; shake = Math.max(shake, .7); sfx('boom', pl.x, pl.z);
      if (inRect(OUR, pl.x, pl.z) && pl.y < .5) knockMe(Math.random() * 6.28, 13, 'Пліт вдарився об камінь!');
      burst(RX - 1, .2, RZ - 5, '#FFFFFF', 30, 6, 1, 4);
    }
  }
}
function hud(show) {
  if (!V.hud) {
    V.hud = document.createElement('div'); V.hud.id = 'raft-hud';
    V.hud.style.cssText = 'position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 64px);transform:translateX(-50%);z-index:2;pointer-events:none;background:rgba(46,35,70,.82);color:#fff;border-radius:14px;padding:7px 14px;font:700 13px/1.35 system-ui,sans-serif;text-align:center;box-shadow:0 6px 18px rgba(0,0,0,.25);white-space:nowrap';
    document.body.appendChild(V.hud);
  }
  V.hud.style.display = show ? '' : 'none'; if (!show) return;
  let html;
  if (ST.on) {
    const left = Math.max(0, ST.dur - ST.t), mm = Math.floor(left / 60), ss = String(Math.floor(left % 60)).padStart(2, '0');
    const hp = ST.enemy ? (ST.arr > 0 ? 'припливає…' : '<span style="color:#FF8A7A">' + '■'.repeat(Math.max(0, ST.hp)) + '</span><span style="opacity:.35">' + '■'.repeat(Math.max(0, ST.max - ST.hp)) + '</span>') : 'на дні 💥';
    html = `🛶 ЕСПРЕСО-СПЛАВ · ⏱ ${mm}:${ss} · 🌊 Хвиля ${ST.wave}${ST.next > 0 ? ` (наступна ${Math.ceil(ST.next)} с)` : ''}<br><span style="font-weight:600;font-size:12px">Пліт зомбі: ${hp} · 💣 ${P.ing.cbomb || 0} · 🧨 ${P.ing.powder || 0}${V.craft ? ' · збираю бомбу…' : ''}${!kitchenOk() ? ' · <span style="color:#FF8A7A">кавомашини розбиті!</span>' : ''}</span>`;
  } else html = `🛶 Еспресо-Сплав · <span style="font-weight:600">ударь у дзвін 🔔 на плоту (F), щоб відчалити</span>`;
  if (V.hud.innerHTML !== html) V.hud.innerHTML = html;
}

/* ---------- Бомби: G — кинути туди, де курсор ---------- */
function throwBomb() {
  if (!running || pl.dead || paused) return;
  if (!(P.ing.cbomb > 0)) { toast(`💣 Бомб нема. Збери на столі на плоту: ${needChips(BOMB_NEED)}`); return; }
  aimFace();
  let tx = pl.x + Math.sin(pl.face) * 7, tz = pl.z + Math.cos(pl.face) * 7;
  if (input.aimOk && input.ax != null) { tx = input.ax; tz = input.az; }
  const d = dist2(pl.x, pl.z, tx, tz), D = clamp(d, 2, 11);
  if (d > .01) { tx = pl.x + (tx - pl.x) / d * D; tz = pl.z + (tz - pl.z) / d * D; }
  P.ing.cbomb--; refreshHUD();
  const b = { sx: pl.x, sz: pl.z, sy: (pl.y || 0) + 1.6, tx: Math.round(tx * 10) / 10, tz: Math.round(tz * 10) / 10, t: 0, T: .45 + D * .05, mine: true };
  launchBomb(b); A.send('bfx', { sx: Math.round(b.sx * 10) / 10, sz: Math.round(b.sz * 10) / 10, tx: b.tx, tz: b.tz, T: b.T });
  pl.swingT = .25; pl.swingKind = 2; sfx('throw'); save();
}
function launchBomb(b) {
  b.m = new THREE.Group();
  put(b.m, mesh(new THREE.SphereGeometry(.24, 8, 6), '#2E2346'), 0, 0, 0);
  put(b.m, mesh(flat(new THREE.CylinderGeometry(.03, .03, .2, 5)), '#E8D7B0'), 0, .26, 0);
  b.spark = put(b.m, mesh(new THREE.SphereGeometry(.07, 6, 4), bulb('#FFD27A'), false), 0, .38, 0);
  scene.add(b.m); V.bombs.push(b);
}
A.onNet('bfx', d => { if (SIMSIDE || !d) return; const b = { sx: +d.sx, sz: +d.sz, sy: 1.6, tx: +d.tx, tz: +d.tz, t: 0, T: clamp(+d.T || .8, .3, 1.5) }; if ([b.sx, b.sz, b.tx, b.tz].every(Number.isFinite)) launchBomb(b); });
function updBombs(dt) {
  for (let i = V.bombs.length - 1; i >= 0; i--) {
    const b = V.bombs[i]; b.t += dt; const k = Math.min(1, b.t / b.T);
    b.m.position.set(lerp(b.sx, b.tx, k), lerp(b.sy, .3, k) + Math.sin(k * Math.PI) * 3, lerp(b.sz, b.tz, k)); b.m.rotation.x += dt * 8;
    b.spark.visible = Math.sin(gameTime * 40) > 0;
    if (k < 1) continue;
    scene.remove(b.m); V.bombs.splice(i, 1);
    const x = b.tx, z = b.tz;
    ringFX(x, z, 3.3, '#FFE8D6', .6); burst(x, 1, z, '#8C5A3C', 26, 7, 1.2, 6); burst(x, 1.2, z, '#FFD27A', 18, 5, 1, 4);
    if (!isWet(terrainAt(x, z))) burst(x, .4, z, '#D6A87B', 10, 4, .8, 3); else burst(x, 0, z, '#BDEFFF', 20, 5, 1, 5);
    sfx('boom', x, z); ftext(x, 2.4, z, 'КАВОВА БОМБА!', 'big');
    const dp = dist2(pl.x, pl.z, x, z);
    if (dp < 3.3 && running) { shake = Math.max(shake, .5); knockMe(angTo(x, z, pl.x, pl.z), 18 * (1 - dp / 4.5), 'БАБАХ!'); hurtPlayer(6); }
    else if (dp < 14) shake = Math.max(shake, .25);
    if (b.mine) req('bomb', { x, z });
  }
}
A.key('KeyG', () => { if (!running) return false; throwBomb(); });

/* ---------- Взаємодія (F) ---------- */
const _getInteract = getInteract;
getInteract = function () {
  if (!SIMSIDE && running && !pl.dead && !pl.ride && !pl.carry && inRiver(pl.x, pl.z)) {
    if (dist2(pl.x, pl.z, BELL.x, BELL.z) < 2) return ST.on ? { l: `🔔 Сплав іде: хвиля ${ST.wave}`, fn: () => openPanel(TAB) } : { l: '🔔 Відчалити! (5 хвилин)', fn: () => { req('start'); sfx('ding'); } };
    if (dist2(pl.x, pl.z, TABLE.x, TABLE.z) < 2.1) return { l: `💣 Зібрати бомбу (2 🧨 + 1 🩹, є ${P.ing.powder || 0} 🧨)`, fn: () => startCraft() };
    if (dist2(pl.x, pl.z, BAR.x, BAR.z) < 3.3 && !kitchenOk()) return { l: '☕ Кавомашини розбиті — скоро полагодяться', fn: () => toast('Зомбі розтрощили кавомашини! Вони полагодяться за ~25 с. Поки — бий, кидай баки й бомби.') };
  }
  return _getInteract.apply(this, arguments);
};
function startCraft() {
  if (V.craft) return;
  if (!canAfford(BOMB_NEED)) { toast(`Бракує: ${needChips(BOMB_NEED)}. Порох 🧨 — у бочках, що пливуть річкою (вантуз їх притягне).`); return; }
  V.craft = { t: 0 }; toast('🛠️ Збираю бомбу… (2 с, не відходь від столу)'); sfx('brew');
}

/* ---------- Вантуз: притягує ящики й бочки з річки ---------- */
const _fireHook = fireHook;
fireHook = function (h) {
  const r = _fireHook.apply(this, arguments);
  if (!SIMSIDE && running && inRiver(pl.x, pl.z) && ST.crates.length) {
    const dx = Math.sin(pl.face), dz = Math.cos(pl.face), rng = (h && h.rng) || 10;
    let best = null, bt = 1e9;
    for (const c of ST.crates) { const p = crateZX(c), px = p.x - pl.x, pz = p.z - pl.z, t = px * dx + pz * dz; if (t < 0 || t > rng + 1) continue; if (Math.abs(px * dz - pz * dx) < 1.3 && t < bt) { bt = t; best = c; } }
    if (best) { ftext(crateZX(best).x, 1.2, crateZX(best).z, 'Чвак! Улов!', 'crit'); req('grab', { id: best.id }); }
  }
  return r;
};

/* ---------- Переходи ---------- */
function place(x, z) { pl.x = x; pl.z = z; pl.y = 0; pl.vy = 0; pl.falling = false; pl.jump = null; pl.safe = { x, z }; if (typeof camPos !== 'undefined') { camPos.set(x, 20, z + 15); camLook.set(x, .5, z); } }
function goTo(x, z, msg) {
  closePanel(); const f = $('#fade'); if (f) f.style.opacity = 1; sfx('travel');
  setTimeout(() => { place(x, z); if (f) f.style.opacity = 0; if (msg) toast(msg); }, 260);
}
const goRaft = () => goTo(SPAWN.x, SPAWN.z, '🛶 Ти на плоту «Еспресо-Сплаву». Дзвін 🔔 (F) — відчалити. Бар — варити каву, стіл — бомби, баки — кидати (F, потім Q).');

/* ---------- Вкладка ---------- */
const TAB = A.tab('rafting', '🛶 Сплав', () => {
  const d = A.data(), here = inRiver(pl.x, pl.z);
  const left = Math.max(0, ST.dur - ST.t);
  const status = ST.on ? `<p class="note">🌊 Сплав іде: хвиля <b>${ST.wave}</b>, лишилось <b>${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}</b>, потоплено плотів: <b>${ST.sunk}</b></p>` : '';
  return `<h3>🛶 Еспресо-Сплав · Рафтинг-Запара</h3>
    ${status}
    <p style="font-size:13px;line-height:1.5;margin:4px 0 10px">5 хвилин, два плоти поруч на бурхливій річці. Зомбі підпливають хвилями й стрибають до тебе на кухню.
      Відбивайся кавою, тягни вантузом лут з води (або зомбі — у воду), збирай бомби й топи їхній пліт: 3–4 вибухи — і хвиля пройдена достроково.</p>
    <div class="btns">${here ? (ST.on ? '' : '<button class="btn" data-rf="start">🔔 Відчалити</button>') + '<button class="btn alt" data-rf="hub">🏠 Назад у «Гущу»</button>' : '<button class="btn" data-rf="go">🛶 На пліт</button>'}
      <button class="btn alt" data-rf="craft" ${here && dist2(pl.x, pl.z, TABLE.x, TABLE.z) < 2.6 ? '' : 'disabled'} title="Біля столу на плоту">💣 Зібрати бомбу · ${needChips(BOMB_NEED)}</button></div>
    <div class="list" style="margin-top:10px;font-size:13px;line-height:1.55">
      <div>☕ <b>Кава</b> — вари на барі плоту, кидай ПКМ / Q. Зомбі розбили кавомашини — бар не працює ~25 с.</div>
      <div>🪠 <b>Вантуз-гарпун</b> — притягує ящики (інгредієнти) й бочки (порох 🧨), а зомбі з чужого плота — прямо в річку.</div>
      <div>💣 <b>Бомба</b> — ${needChips(BOMB_NEED)} на столі (2 с). <b>G</b> — кинути туди, де курсор. Обережно: б'є й своїх!</div>
      <div>🗑️ <b>Баки й кег</b> — F підняти, Q / ЛКМ жбурнути на сусідній пліт: збиває зомбі як кеглі.</div>
      <div>🪨 <b>Пороги</b> — пліт б'ється об каміння, усіх відкидає. Змило — пливи до плота й підстрибни (пробіл).</div>
    </div>
    <p class="muted" style="font-size:12px;margin-top:10px">Твій рекорд: ${d.best || 0} хвиль · сплавів: ${d.runs || 0} · пройдено: ${d.wins || 0} · потоплено плотів: ${d.sunk || 0}.
      Нагорода: монети й досвід за хвилі й потоплені плоти, за 6+ хвиль — кейс. Інвентар — той самий, що у відкритому світі.</p>`;
}, e => {
  const b = e.target.closest('[data-rf]'); if (!b || b.disabled) return;
  const a = b.dataset.rf;
  if (a === 'go') goRaft();
  else if (a === 'hub') goTo(0, 3, 'З поверненням у «Гущу».');
  else if (a === 'start') { req('start'); closePanel(); }
  else if (a === 'craft') { startCraft(); closePanel(); }
});

/* ---------- Картка в головному меню ---------- */
A.on('start', () => { if (V.auto && !SIMSIDE) setTimeout(goRaft, 700); });
if (!SIMSIDE && typeof document !== 'undefined') {
  const box = document.querySelector('#main-menu .mm-container');
  if (box && !document.getElementById('mm-rafting')) {
    const card = document.createElement('div'); card.className = 'mm-card'; card.id = 'mm-rafting';
    card.innerHTML = `<div class="mm-img-wrap"><div class="mm-card-img" style="background-image:url('${IMG}');background-color:#2c2c54"></div></div>
      <div class="mm-card-body"><h2>СПЛАВ</h2><div class="mm-subtitle">Рафтинг-Запара</div>
      <div class="mm-desc">5 хвилин, два плоти. Вари каву, крафти бомби, відбивай хвилі зомбі на воді! Інвентар спільний з основою.</div></div>`;
    const locked = [...box.children].filter(c => c.classList.contains('mm-locked')).pop();
    box.insertBefore(card, locked || null);
    // 4 картки в ряд: трохи вужчі
    const css = document.createElement('style');
    css.textContent = '#main-menu .mm-container.mm-4{flex-wrap:nowrap;gap:clamp(10px,1.6vw,24px)}#main-menu .mm-container.mm-4 .mm-card{width:clamp(170px,21vw,280px);height:clamp(300px,36vw,440px)}#main-menu .mm-container.mm-4 .mm-card-body h2{font-size:clamp(1.4rem,2.6vw,2.4rem)}@media (max-width:700px){#main-menu .mm-container.mm-4{flex-wrap:wrap;overflow:auto;max-height:100%}#main-menu .mm-container.mm-4 .mm-card{width:42vw;height:56vw}}';
    document.head.appendChild(css); box.classList.add('mm-4');
    card.addEventListener('click', () => {
      V.auto = true;
      if (running) { goRaft(); }
      const mm = document.getElementById('main-menu'); if (mm) { mm.classList.add('mm-hide'); mm.addEventListener('transitionend', () => mm.remove(), { once: true }); }
    });
  }
}
