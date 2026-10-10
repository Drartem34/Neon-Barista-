/* Аддон «Еспресо-Сплав» (Рафтинг-Запара): новий режим на 5 хвилин.
   Два плоти пливуть бурхливою річкою поруч. На вашому — кухня (бар, кавомашини, баки),
   на сусідньому — хвилі зомбі-офісників, які стрибають до вас на абордаж.
   - Вари каву на плоту й закидай нею зомбі (як завжди).
   - Вантуз-гарпун витягує з річки ящики й бочки… і зомбі з чужого плота прямо у воду.
   - З бочок — кавовий порох: на столі збирається бомба (G — кинути). 3–4 вибухи — і їхній пліт іде на дно.
   - 🍾 Коктейль Молотова: ящик з пляшками на плоту (🧨 + 🍯) або улов з бочки. V — кинути: на плоту зомбі
     кілька секунд горить пожежа (щоразу −1 міцність плота), зомбі тікають на інший край або стрибають у воду.
   - Важкі баки на плоту можна схопити (F) і жбурнути (Q/ЛКМ) на сусідній пліт — кеглі!
   - Пороги: пліт б'ється об каміння, усіх відкидає. Змило за борт — пливи назад (пробіл — підстрибнути).
     Вода крижана — у ній тане здоров'я.
   - Хаос: землетрус, річка розходиться на два рукави (а потім плоти стикаються), гроза, лут-потоп.
   - Пліт зомбі гойдається: то відпливає, то підпливає. Відбив хвилю — порожній пліт відпливає, новий припливає.
   Інвентар той самий, що й у відкритому світі; нагороди — туди ж.
   У спільному світі (сервер світу) сплав один на всіх: хвилі, пліт і лут рахує сервер.
   Картинку для картки в меню поклади поруч: addons/rafting/rafting-bg.jpg */
const A = Addon.info({ name: 'Еспресо-Сплав', version: '1.5', desc: 'Режим «Рафтинг-Запара»: 5 хвилин на плоту, хвилі зомбі з сусіднього плота, лут у річці, бомби, баки й коробки-снаряди, хаос-події й своя музика.' });

const SIMSIDE = !!window.__SIM;
const AUTH = () => SIMSIDE || !(typeof WORLD !== 'undefined' && WORLD.on);   // хто рахує сплав: сервер світу або сам гравець
const IMG = 'addons/rafting/rafting-bg.jpg';

/* ---------- Геометрія ---------- */
const RX = -112, RZ = 84, ISL_R = 26, WATER_W = 15, RIVER_L = 26, FLOW = 3.2;
const OUR = { x0: RX - 9, x1: RX - 1.5, z0: RZ - 5.5, z1: RZ + 5.5 };   // наш пліт
const EN = { x0: RX + 1.5, x1: RX + 8.5, z0: RZ - 5, z1: RZ + 5 };      // пліт зомбі
const SPAWN = { x: RX - 5.2, z: RZ + 1.6 };
const BAR = { x: RX - 5.2, z: RZ - 4.2 }, BELL = { x: RX - 2.6, z: RZ + 4.5 }, TABLE = { x: RX - 7.9, z: RZ + 4.4 };
const MACH = [[RX - 8.2, RZ - 1.6], [RX - 2.3, RZ - 1.6]];
const BINS = [['bin', RX - 3.3, RZ + 1.4], ['bin', RX - 7, RZ + .8], ['keg', RX - 4.6, RZ + 3.1]];
const BOXES = [[RX - 8.3, RZ + 1.9], [RX - 2.3, RZ + .1], [RX - 5.6, RZ - 1.4], [RX - 6.2, RZ + 2.5]];   // коробки, які можна піднімати й жбурляти
const inRect = (r, x, z, m = 0) => x > r.x0 + m && x < r.x1 - m && z > r.z0 + m && z < r.z1 - m;
const inRiver = (x, z) => dist2(x, z, RX, RZ) < ISL_R + 2;
/* Пліт зомбі гойдається на воді: то відпливає, то підпливає. Під час «розходження річки» —
   відпливає далеко, а потім плоти стикаються. Зсув — функція часу сплаву, тож однаковий у всіх. */
const ease = k => k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k);
function enOff(t = ST.t) {
  if (!ST.on) return 0;
  let o = 1.1 * Math.sin(t * .33);
  if (ST.sp != null) {
    const u = t - ST.sp;
    if (u >= 0 && u < 3) o += 4.6 * ease(u / 3);
    else if (u >= 3 && u < 14) o += 4.6;
    else if (u >= 14 && u < 16) o = lerp(o + 4.6, -2.7, ease((u - 14) / 2));
    else if (u >= 16 && u < 19) o = lerp(-2.7, o, ease((u - 16) / 3));
  }
  return Math.max(-2.7, o);
}
/* Пліт зомбі припливає згори (разом із зомбі) і відпливає вниз за течією */
const enZ = () => ST.arr > 0 ? -(ST.arr / 3) * 28 : ST.lv > 0 ? (1 - ST.lv / 3) * 30 : 0;
const enR = (o = enOff(), zo = enZ()) => ({ x0: EN.x0 + o, x1: EN.x1 + o, z0: EN.z0 + zo, z1: EN.z1 + zo });
const enLand = () => ST.enemy && !(ST.arr > 0) && !(ST.lv > 0);   // пліт на місці: можна стрибати, бомбити
const MAX_BOARD = 2;   // скільки зомбі одночасно можуть бути на нашому плоту (+1 за кожного ще гравця)

/* ---------- Нові ресурси ---------- */
Object.assign(ING, {
  powder: { n: 'Кавовий порох', ic: '🧨', c: '#E8505B' },
  cbomb: { n: 'Кавова бомба', ic: '💣', c: '#4E4A6E' },
});
const BOMB_NEED = { powder: 2, tape: 1 };
ING.molly = { n: 'Коктейль Молотова', ic: '🍾', c: '#5FAF6A' };
const MOLLY_NEED = { powder: 1, syrup: 1 };
const SHELF = { x: RX - 5.4, z: RZ + 4.95 };   // ящик з пляшками: тут збирається «молотов»
const FIRE_T = 6, FIRE_R = 2, FIRE_DMG = 2.5;   // пожежа на плоту: скільки горить, радіус, раз на скільки секунд −1 міцність

/* ---------- Острів-річка ---------- */
A.island({ id: 'river', n: 'Еспресо-Сплав', sub: 'бурхлива річка · два плоти · 5 хвилин м’ясорубки', x: RX, z: RZ, r: ISL_R, top: '#6FD0E2', rock: '#7F8FC8', biome: 'river', tier: 1.5, noZone: true });
let DRY = false;   // кинутий бак летить над водою
const _terrainAt = terrainAt;
terrainAt = function (x, z) {
  if (dist2(x, z, RX, RZ) < ISL_R) {
    if (DRY || inRect(OUR, x, z) || (ST.enemy && inRect(enR(), x, z))) return 'land';
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
const RAFT_BOXES = [];
/* зомбі в польоті (абордаж) не піднімеш */
const _canCarry = canCarry;
canCarry = function (m) { return !m.rj && _canCarry.apply(this, arguments); };
if (!BARS.some(b => b.x === BAR.x && b.z === BAR.z)) BARS.push({ x: BAR.x, z: BAR.z });

/* ---------- Стан сплаву ---------- */
const ST = { on: false, t: 0, dur: 300, wave: 0, next: 0, hp: 4, max: 4, enemy: true, arr: 0, lv: 0, sunk: 0, crates: [], seq: 0, res: null, sp: null, roster: [], fires: [] };
const AU = { jumpT: 3, crateT: 2, rapT: 50, idle: 0, stT: 0, pend: 0, rapGo: -1, chaosT: 30, last: '', quake: 0, storm: [], prevOff: 0, prevZ: 0, spHit: false };   // лише в того, хто рахує
const myId = () => (NET.on && typeof WORLD !== 'undefined' && WORLD.on ? NET.id : 'me');
function snap() { return { on: ST.on ? 1 : 0, t: Math.round(ST.t * 10) / 10, dur: ST.dur, w: ST.wave, nx: Math.round(ST.next), hp: ST.hp, mx: ST.max, en: ST.enemy ? 1 : 0, arr: Math.round(ST.arr * 10) / 10, lv: Math.round(ST.lv * 10) / 10, sp: ST.sp, ro: ST.roster, sk: ST.sunk, cr: ST.crates.map(c => [c.id, c.x, c.z0, c.t0, c.k]), fi: ST.fires.map(f => [f.id, r1c(f.ox), r1c(f.oz), r1c(f.t)]) }; }
function applySnap(d) {
  const was = ST.on;
  Object.assign(ST, { on: !!d.on, t: +d.t || 0, dur: +d.dur || 300, wave: d.w | 0, next: +d.nx || 0, hp: d.hp | 0, max: d.mx | 0 || 4, enemy: !!d.en, arr: +d.arr || 0, lv: +d.lv || 0, sp: d.sp == null ? null : +d.sp, sunk: d.sk | 0 });
  ST.roster = Array.isArray(d.ro) ? d.ro.slice(0, 40).map(String) : [];
  if (Array.isArray(d.cr)) ST.crates = d.cr.slice(0, 40).map(a => ({ id: a[0], x: +a[1], z0: +a[2], t0: +a[3], k: a[4] === 'barrel' ? 'barrel' : 'box' }));
  if (Array.isArray(d.fi)) ST.fires = d.fi.slice(0, 8).map(a => ({ id: a[0], ox: +a[1], oz: +a[2], t: +a[3] }));
  if (ST.on && !was) joinedRun();
}
function pushState() { if (SIMSIDE) A.send('st', snap()); }
function emit(e) { if (SIMSIDE) A.send('ev', e); else onEvent(e); }
function req(k, d) { const o = Object.assign({ k }, d || {}); if (AUTH()) onReq(o, { id: myId(), name: myName() }); else A.send('rq', o); }
A.onNet('st', (d, from) => { if (!SIMSIDE && !AUTH() && from.id === -1 && d) applySnap(d); });
A.onNet('ev', (d, from) => { if (!SIMSIDE && !AUTH() && from.id === -1 && d) onEvent(d); });
A.onNet('rq', (d, from) => { if (SIMSIDE && d) onReq(d, from); });

/* ---------- Хто на сплаві ---------- */
/* Склад сплаву фіксується на старті: хто був на плоту. Новенькі не заходять, поки сплав іде;
   учасники виходять лише кнопкою «Покинути сплав», а після смерті повертаються на пліт.
   Ключ гравця — логін (у спільному світі; переживає перепідключення) або 'me' (гра сама собі сервер). */
const keyOf = from => SIMSIDE ? String(from && from.name || '') : 'me';
const myKey = () => (NET.on && typeof WORLD !== 'undefined' && WORLD.on ? myName() : 'me');
const inRun = () => ST.on && ST.roster.includes(myKey());
function rosterOnline() {   // учасники, що зараз у грі
  if (SIMSIDE) return simPlayers().filter(p => ST.roster.includes(p.name));
  return ST.roster.includes('me') ? [{ id: myId(), name: 'me', x: pl.x, z: pl.z, dead: pl.dead }] : [];
}
function participants() {
  if (!ST.on) return SIMSIDE ? simPlayers().filter(p => !p.dead && inRiver(p.x, p.z)) : (!pl.dead && inRiver(pl.x, pl.z) ? [{ id: myId(), x: pl.x, z: pl.z }] : []);
  return rosterOnline().filter(p => !p.dead && inRiver(p.x, p.z));
}
const riverMon = () => MON.filter(m => m.isl && m.isl.id === 'river');
const hostile = () => riverMon().filter(m => !m.calm && m.state !== 'fall');

/* ---------- Логіка сплаву (сервер світу або сам гравець) ---------- */
function onReq(d, from) {
  if (d.k === 'start') { if (!ST.on) startRun(from); }
  else if (d.k === 'leave') { const k = keyOf(from), i = ST.roster.indexOf(k); if (ST.on && i >= 0) { ST.roster.splice(i, 1); emit({ k: 'msg', txt: SIMSIDE ? `🚪 ${escapeHTML(k)} покинув сплав.` : '🚪 Ти покинув сплав.' }); if (!ST.roster.length) endRun(false); else pushState(); } }
  else if (d.k === 'grab') grabCrate(+d.id, from);
  else if (d.k === 'bomb') bombAt(+d.x, +d.z, from);
  else if (d.k === 'molly') mollyAt(+d.x, +d.z, from);
}
function startRun(from) {
  for (const m of riverMon()) removeMonster(m);
  ST.roster = SIMSIDE ? [...new Set([keyOf(from), ...simPlayers().filter(p => !p.dead && inRiver(p.x, p.z)).map(p => p.name)])].filter(Boolean) : ['me'];
  Object.assign(ST, { on: true, t: 0, wave: 0, next: 7, hp: 4, max: 4, enemy: true, arr: 0, lv: 0, sunk: 0, crates: [], res: null, sp: null, fires: [] });
  Object.assign(AU, { jumpT: 4, crateT: 1, rapT: rand(40, 55), idle: 0, stT: 0, pend: 0, rapGo: -1, chaosT: rand(28, 38), last: '', quake: 0, storm: [], prevOff: 0, prevZ: 0, spHit: false });
  ST.lv = 2.5;   // порожній пліт відпливає — перша хвиля припливе вже із зомбі
  for (const p of RAFT_PROPS) if (!p.alive) { p.alive = true; p.hp = p.max; if (p.mesh) p.mesh.visible = true; }
  emit({ k: 'msg', big: 1, txt: `🛶 Сплав почався! ${from && from.name ? escapeHTML(from.name) + ' відчалив. ' : ''}Перша хвиля — за 7 секунд.` });
  pushState(); if (!SIMSIDE) joinedRun();
}
function endRun(win) {
  if (!ST.on) return;
  ST.on = false;
  const res = { k: 'end', win: win ? 1 : 0, w: ST.wave, sk: ST.sunk, t: Math.round(ST.t), ro: ST.roster.slice() };
  ST.roster = [];
  for (const m of hostile()) sinkMon(m);
  ST.crates = []; ST.fires = []; ST.enemy = true; ST.arr = 2.5; ST.lv = 0; ST.sp = null; ST.hp = ST.max = 4; AU.storm = []; AU.quake = 0;
  emit(res); pushState();
}
function endLeave() {   // пліт відплив: прибираємо всіх, хто на ньому лишився (заспокоєних)
  const er = enR();
  for (const m of riverMon()) if (inRect(er, m.x, m.z, -1.5)) removeMonster(m);
  ST.lv = 0; ST.enemy = false; ST.fires = []; pushState();
}
function spawnWave() {
  ST.wave++;
  const n = participants().length || 1;
  const cnt = Math.min(14, Math.round((3 + ST.wave * 1.3) * (1 + .5 * (n - 1))));
  if (!ST.enemy || ST.lv > 0) {   // новий пліт припливає згори — уже із зомбі
    if (ST.lv > 0) endLeave();
    ST.enemy = true; ST.hp = ST.max = 3 + Math.floor(ST.wave / 3); ST.arr = 3; AU.prevZ = enZ();
    spawnZombies(cnt); for (const m of hostile()) m.stun = Math.max(m.stun, .5);
    emit({ k: 'msg', txt: `🌊 Хвиля ${ST.wave}: пливе пліт із зомбі (${cnt})!` });
  }
  else { spawnZombies(cnt); emit({ k: 'msg', txt: `🌊 Хвиля ${ST.wave}! Зомбі: ${cnt}` }); }
  pushState();
}
function spawnZombies(cnt) {
  const w = ST.wave;
  for (let i = 0; i < cnt; i++) {
    const r = Math.random(), type = w >= 4 && r < .2 ? 'hound' : w >= 2 && r < .45 ? 'manager' : 'office';
    let x = 0, z = 0;
    const er = enR();
    for (let k = 0; k < 20; k++) { x = rand(er.x0 + 1, er.x1 - 1); z = rand(er.z0 + 1, er.z1 - 1); if (!MON.some(o => dist2(o.x, o.z, x, z) < .9)) break; }
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
  ST.enemy = false; ST.sunk++; ST.fires = [];
  const er = enR();
  for (const m of riverMon()) if (inRect(er, m.x, m.z, -1.2) && !inRect(OUR, m.x, m.z, -.3) && !m.rj) sinkMon(m);   // і тих, кого вибухом відкинуло на край
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
  if (ST.on && enLand() && inRect(enR(), x, z, -.6)) {
    ST.hp--; emit({ k: 'hit', hp: ST.hp });
    if (ST.hp <= 0) sinkEnemy(); else pushState();
  }
}
/* 🍾 Коктейль Молотова: де розбився — там пожежа. На плоту зомбі горить FIRE_T с, щоразу −1 міцність;
   зомбі в полум'ї тікають на інший край плота, а ті, кому зовсім гаряче, — стрибають у воду. */
function mollyAt(x, z, from) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return;
  const prev = SIMSIDE ? SIM.actor : null;
  if (SIMSIDE && from) SIM.actor = from.id;
  try { for (const m of MON.slice()) if (!m.calm && m.state !== 'fall' && !m.carried && !m.rj && dist2(m.x, m.z, x, z) < FIRE_R) { applyHit(m, 6, 0, 0); m.stun = Math.max(m.stun, .6); } }
  finally { if (SIMSIDE) SIM.actor = prev; }
  const er = enR();
  if (ST.on && enLand() && inRect(er, x, z, -.4)) {
    if (ST.fires.length >= 4) ST.fires.shift();
    const f = { id: ++ST.seq, ox: r1c(clamp(x, er.x0 + .6, er.x1 - .6) - er.x0), oz: r1c(clamp(z, er.z0 + .6, er.z1 - .6) - er.z0), t: FIRE_T, dmg: FIRE_DMG, burnT: .5 };
    ST.fires.push(f); emit({ k: 'fire', id: f.id, ox: f.ox, oz: f.oz, by: from && from.name || '' });
    scare(f, true); pushState();
  } else emit({ k: 'fizz', x: r1c(x), z: r1c(z), wet: isWet(terrainAt(x, z)) ? 1 : 0 });
}
const fireXZ = (f, er = enR()) => ({ x: er.x0 + f.ox, z: er.z0 + f.oz });
// зомбі поруч з вогнем: у самому полум'ї — стрибок у воду, поруч — тікають на дальній край плота
function scare(f, first) {
  const er = enR(), p = fireXZ(f, er), mid = (er.z0 + er.z1) / 2;
  for (const m of riverMon()) {
    if (m.calm || m.state === 'fall' || m.carried || m.rj || m.flee || !inRect(er, m.x, m.z, -.4)) continue;
    const d = dist2(m.x, m.z, p.x, p.z); if (d > FIRE_R + .8) continue;
    if (first && d < 1) { bubble(m, pick(['ГАРЯЧЕ! Я в басейн!', 'Мої штани горять!', 'Звільняюсь за власним!']), true, 1.4); sinkMon(m); continue; }
    const tz = p.z < mid ? er.z1 - .9 : er.z0 + .9, tx = clamp(m.x + rand(-1, 1), er.x0 + .9, er.x1 - .9);
    m.flee = { ox: tx - er.x0, oz: tz - er.z0, t: 3 };
    if (Math.random() < .7) bubble(m, pick(['ГОРИМО!', 'Де вогнегасник?!', 'Це не тімбілдинг, це пожежа!', 'Евакуація! Без паніки! ААА!']), true, 1.4);
  }
}
function fireTick(dt) {
  if (!ST.fires.length && !riverMon().some(m => m.flee)) return;
  if (!ST.enemy || ST.lv > 0 || ST.arr > 0) { if (ST.fires.length) { ST.fires = []; pushState(); } }
  for (const f of ST.fires.slice()) {
    f.t -= dt; f.dmg -= dt; f.burnT -= dt;
    if (f.dmg <= 0 && f.t > -.01) {   // вогонь їсть пліт
      f.dmg = FIRE_DMG; ST.hp--; emit({ k: 'hit', hp: ST.hp, fire: 1 });
      if (ST.hp <= 0) { sinkEnemy(); return; }
      pushState();
    }
    if (f.burnT <= 0) {   // хто стоїть у полум'ї — обпікається й тікає
      f.burnT = .5; const p = fireXZ(f);
      for (const m of riverMon()) if (!m.calm && m.state !== 'fall' && !m.rj && !m.carried && dist2(m.x, m.z, p.x, p.z) < FIRE_R) { applyHit(m, 3, 0, 0); }
      scare(f, false);
    }
    if (f.t <= 0) { ST.fires = ST.fires.filter(q => q !== f); emit({ k: 'fireout', id: f.id }); pushState(); }
  }
  // тікають від вогню (по плоту, разом з його рухом)
  const er = enR();
  for (const m of riverMon()) {
    if (!m.flee) continue;
    const fl = m.flee; fl.t -= dt;
    if (m.state === 'fall' || m.rj || m.carried || fl.t <= 0 || !inRect(er, m.x, m.z, -.6)) { m.flee = null; continue; }
    const tx = er.x0 + fl.ox, tz = er.z0 + fl.oz, d = dist2(m.x, m.z, tx, tz);
    if (d < .3) { m.flee = null; continue; }
    const v = Math.min(d, 4.2 * dt); m.x += (tx - m.x) / d * v; m.z += (tz - m.z) / d * v; m.vx = m.vz = 0;
    m.face = angTo(m.x, m.z, tx, tz); m.walk = (m.walk || 0) + dt * 10; m.stun = Math.max(m.stun, .12);
  }
}
function grabCrate(id, from) {
  const i = ST.crates.findIndex(c => c.id === id); if (i < 0) return;
  const c = ST.crates[i]; ST.crates.splice(i, 1);
  const it = {}; let coins = 0;
  if (c.k === 'barrel') { it.powder = randi(1, 2); if (Math.random() < .5) it.tape = 1; if (Math.random() < .4) it.bolts = 1; if (Math.random() < .2) it.molly = 1; }
  else { it.beans = randi(1, 3); it.milk = randi(1, 2); if (Math.random() < .45) it.syrup = 1; if (Math.random() < .25) it.tears = 1; if (Math.random() < .2) coins = 10; if (Math.random() < .25) it.powder = 1; }
  emit({ k: 'got', id, to: from.id, it, c: coins, x: Math.round(crateZX(c).x * 10) / 10, z: Math.round(crateZX(c).z * 10) / 10 });
  pushState();
}
const crateZX = c => ({ x: c.x, z: c.z0 + FLOW * (ST.t - c.t0) });
if (window.__ADDON_TEST) window.__raft = { ST, crateZX, enOff: () => enOff(), chaos: e => startChaos(e), AU, enR: () => enR(), enLand: () => enLand(), spawnZombies: n => spawnZombies(n), mollyAt: (x, z) => mollyAt(x, z, { id: myId(), name: myName() }), SHELF, FIRE_T, FIRE_R, FIRE_DMG, get V() { return V; } };   // для автотестів

function authTick(dt) {
  if (!ST.on) { if (ST.arr > 0) ST.arr = Math.max(0, ST.arr - dt); return; }
  ST.t += dt;
  const ps = participants();
  // усі учасники вигоріли одночасно — сплав провалено
  const on = rosterOnline();
  if (on.length && on.every(p => p.dead)) { AU.wipe = (AU.wipe || 0) + dt; if (AU.wipe > 1.2) { emit({ k: 'msg', big: 1, txt: '💀 Усі вигоріли — сплав провалено.' }); endRun(false); return; } } else AU.wipe = 0;
  if (!ps.length) { AU.idle += dt; if (AU.idle > (SIMSIDE ? (on.length ? 25 : 10) : 4)) { emit({ k: 'msg', txt: '🛶 На плоту нікого не лишилось — сплав завершено.' }); endRun(false); } return; }
  AU.idle = 0;
  if (ST.t >= ST.dur) { endRun(true); return; }
  // прибуття нового плота
  if (ST.arr > 0) { ST.arr -= dt; if (ST.arr <= 0) { ST.arr = 0; pushState(); } }
  // хвилі
  ST.next -= dt;
  if (ST.next <= 0) { spawnWave(); ST.next = Math.max(30, 45 - ST.wave * 2); }
  else if (ST.wave > 0 && enLand() && !hostile().length) {
    // хвилю відбито: порожній пліт відпливає, новий припливе з наступною хвилею
    ST.lv = 3; ST.next = Math.min(ST.next, 7);
    emit({ k: 'msg', txt: '✅ Хвилю відбито! Порожній пліт відпливає — новий уже на підході.' }); pushState();
  }
  if (ST.lv > 0) { ST.lv -= dt; if (ST.lv <= 0) endLeave(); }
  // пліт гойдається, припливає й відпливає: зомбі на ньому їдуть разом із ним
  { const o = enOff(), zo = enZ(), dx = o - AU.prevOff, dz = zo - AU.prevZ, er = enR(AU.prevOff, AU.prevZ);
    if (ST.enemy && (Math.abs(dx) > 1e-5 || Math.abs(dz) > 1e-5)) for (const m of riverMon()) if (!m.rj && m.state !== 'fall' && !m.carried && inRect(er, m.x, m.z, -.4)) { m.x += dx; m.z += dz; }
    AU.prevOff = o; AU.prevZ = zo; }
  // стрибки на абордаж
  AU.jumpT -= dt;
  if (AU.jumpT <= 0) {
    AU.jumpT = AU.burst > 0 ? (AU.burst--, .6) : rand(3.5, 6.5) / (1 + ST.wave * .06);
    const er = enR(), gap = er.x0 - OUR.x1;
    // на абордаж — лише пара зомбі одночасно, решта б'ється зі свого плота
    const aboard = hostile().filter(m => m.rj || inRect(OUR, m.x, m.z, -.3)).length;
    const c = gap < 4.6 && enLand() && aboard < MAX_BOARD + ps.length - 1 ? hostile().filter(m => inRect(er, m.x, m.z) && !m.rj && !(m.stun > 0) && m.state === 'chase' && m.x < er.x0 + 2.6).sort((a, b) => a.x - b.x)[0] : null;
    if (c) {
      const tz = clamp(c.z + rand(-2, 2), OUR.z0 + 1, OUR.z1 - 1), tx = rand(OUR.x1 - 3.2, OUR.x1 - .8);
      c.rj = { sx: c.x, sz: c.z, tx, tz, t: 0 }; c.stun = .95; c.face = angTo(c.x, c.z, tx, tz);
      bubble(c, pick(['НА АБОРДАЖ!', 'Ваша кухня — наша кухня!', 'Тімбілдинг на воді!', 'Я по ваш капучино!']), true, 1.6);
    }
  }
  for (const m of riverMon()) {
    // збили посеред стрибка (бомба, блискавка) — падає: у воду або на пліт
    if (!m.rj && m.y > .05 && !m.carried && m.state !== 'fall') { if (isWet(terrainAt(m.x, m.z))) { sinkMon(m); continue; } m.y = 0; }
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
  // хаос-події
  AU.chaosT -= dt;
  if (AU.chaosT <= 0 && ST.t < ST.dur - 15) { AU.chaosT = rand(32, 46); startChaos(); }
  if (AU.quake > 0) {
    AU.quake -= dt; AU.qT = (AU.qT || 0) - dt;
    if (AU.qT <= 0) { AU.qT = .5; for (const m of hostile()) if (!m.rj && Math.random() < .35) { const a = Math.random() * 6.28; m.vx += Math.sin(a) * 6; m.vz += Math.cos(a) * 6; m.stun = Math.max(m.stun, .6); } }
  }
  if (ST.sp != null) {
    const u = ST.t - ST.sp;
    if (u >= 15.6 && !AU.spHit) { AU.spHit = true; emit({ k: 'chaos', e: 'clash' }); for (const m of hostile()) m.stun = Math.max(m.stun, .8); AU.jumpT = 1; AU.burst = 1; }
    if (u > 19.5) { ST.sp = null; AU.spHit = false; pushState(); }
  }
  fireTick(dt);
  for (let i = AU.storm.length - 1; i >= 0; i--) { const q = AU.storm[i]; q.t -= dt; if (q.t <= 0) { AU.storm.splice(i, 1); strike(q.en ? enR().x0 + q.x : q.x, q.z); } }
  AU.stT -= dt; if (AU.stT <= 0) { AU.stT = 1; pushState(); }
}
const r1c = v => Math.round(v * 10) / 10;
function startChaos(force) {
  const e = force || pick(['quake', 'split', 'storm', 'flood'].filter(k => k !== AU.last && !(k === 'split' && (!enLand() || ST.sp != null))));
  AU.last = e;
  if (e === 'quake') { AU.quake = 4.5; emit({ k: 'chaos', e, d: 4.5 }); }
  else if (e === 'split') { ST.sp = r1c(ST.t); AU.spHit = false; pushState(); emit({ k: 'chaos', e }); }
  else if (e === 'storm') {
    const er = enR();
    for (let i = 0; i < 9; i++) {
      const en = enLand() && Math.random() < .55, r = en ? er : OUR;
      AU.storm.push({ en, x: r1c(en ? rand(.8, r.x1 - r.x0 - .8) : rand(r.x0 + .8, r.x1 - .8)), z: r1c(rand(r.z0 + .8, r.z1 - .8)), t: r1c(1.4 + i * .65) });
    }
    emit({ k: 'chaos', e, s: AU.storm.map(q => [q.en ? 1 : 0, q.x, q.z, q.t]) });
  } else {
    for (let i = 0; i < 9; i++) ST.crates.push({ id: ++ST.seq, x: r1c(pick([RX + rand(-.6, .6), RX - rand(10, 13), RX + rand(10, 13), RX + rand(-13, 13)])), z0: r1c(RZ - RIVER_L + 1 - i * 2.2), t0: r1c(ST.t), k: Math.random() < .5 ? 'barrel' : 'box' });
    pushState(); emit({ k: 'chaos', e });
  }
}
function strike(x, z) {
  for (const m of MON.slice()) if (!m.calm && m.state !== 'fall' && dist2(m.x, m.z, x, z) < 1.9) { applyHit(m, 30, 0, 0); m.stun = Math.max(m.stun, 1.6); m.rj = null; }
  for (const p of PROPS) if (p.alive && dist2(p.x, p.z, x, z) < 1.3) damageProp(p, 15, 'boom');
}
A.on('tick', dt => { if (AUTH()) authTick(dt); else if (ST.on) { ST.t += dt; ST.next = Math.max(0, ST.next - dt); if (ST.arr > 0) ST.arr = Math.max(0, ST.arr - dt); } if (!SIMSIDE) clientTick(dt); });

/* ---------- Будова: кухня, баки, кавомашини (і на сервері, і в гравців) ---------- */
A.on('world', () => {
  barCounter(BAR.x, BAR.z, false);
  addStatic(TABLE.x, TABLE.z, .8); addStatic(BELL.x, BELL.z, .45);
  for (const [x, z] of MACH) { const p = addProp('espmachine', x, z); RAFT_PROPS.push(p); if (!SIMSIDE) espMesh(p); }
  for (const [k, x, z] of BINS) addBody(k, x, z);
  for (const [x, z] of BOXES) RAFT_BOXES.push(addProp('crate', x, z));
  if (!SIMSIDE) { buildDecks(); buildZones(); }
});
/* коробки на плоту відновлюються швидко: кидай скільки влізе */
A.on('tick', () => { for (const p of RAFT_BOXES) if (!p.alive && !p.held && !p.fly && p.t > 8) p.t = 8; });
function espMesh(p) {
  const g = p.mesh;
  put(g, mesh(new THREE.BoxGeometry(.8, .75, .6), '#C9CDD9'), 0, .38, 0);
  put(g, mesh(new THREE.BoxGeometry(.85, .1, .65), '#8E86B0'), 0, .8, 0);
  put(g, mesh(flat(new THREE.CylinderGeometry(.16, .16, .35, 8)), '#E8505B'), .22, 1.02, 0);
  put(g, mesh(new THREE.BoxGeometry(.18, .1, .04), bulb('#FF6B6B'), false), -.2, .55, .31);
}

/* ======================= ДАЛІ — ЛИШЕ В ГРАВЦЯ ======================= */
const V = { furnW: -1, furn: null, prevZ: 0, water: null, tex: null, shore: [], en: null, crates: new Map(), rocks: [], hud: null, wetT: 0, grabT: 0, craft: null, bombs: [], card: null, auto: false, joined: false, hitT: 0, rap: null, gone: 'sink', zones: [], quake: 0, qT: 0, storm: [], spit: null, prevOff: null, coldT: 0 };

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
  // ящик з пляшками: тут збирається 🍾 коктейль Молотова
  const sh = new THREE.Group(); sh.position.set(SHELF.x, 0, SHELF.z); scene.add(sh);
  put(sh, mesh(new THREE.BoxGeometry(1.1, .55, .6), '#A3795C'), 0, .28, 0);
  put(sh, mesh(new THREE.BoxGeometry(1.14, .06, .64), '#8C6447'), 0, .56, 0);
  for (let i = 0; i < 4; i++) { const bx = -.36 + i * .24; put(sh, mesh(flat(new THREE.CylinderGeometry(.07, .08, .32, 7)), '#5FAF6A'), bx, .75, 0); put(sh, mesh(new THREE.BoxGeometry(.08, .1, .08), '#E8D7B0'), bx, .95, 0); }
  // пліт зомбі (рухається: припливає, тоне)
  const en = new THREE.Group(); scene.add(A.dynamic(en)); V.en = en;
  const ed = deck(EN, ['#9C93B8', '#8A82A8'], '#5E5880'); en.add(ed);
  en.position.set((EN.x0 + EN.x1) / 2, 0, (EN.z0 + EN.z1) / 2); en.userData.home = en.position.clone(); furnish(0);
  // мілина, що виринає, коли річка розходиться на два рукави
  const spit = new THREE.Group(); scene.add(A.dynamic(spit)); V.spit = spit;
  put(spit, mesh(new THREE.BoxGeometry(2.2, .8, RIVER_L * 1.6), '#E8C98F', false, true), 0, 0, 0);
  for (let i = 0; i < 9; i++) put(spit, mesh(rough(new THREE.DodecahedronGeometry(rand(.4, .8), 0), .3), '#9389C9'), rand(-.6, .6), .4, rand(-18, 18));
  for (let i = 0; i < 4; i++) { put(spit, mesh(flat(new THREE.CylinderGeometry(.08, .12, 1.2, 5)), '#A3795C'), rand(-.4, .4), .9, rand(-16, 16)); }
  spit.position.set(RX, -2.6, RZ); spit.visible = false;
}
/* ---------- Зони на плоту: де кава, де бомби, де старт ---------- */
function labelTex(txt, col) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 72;
  const x = c.getContext && c.getContext('2d');
  if (x && x.fillText) {
    x.fillStyle = 'rgba(46,35,70,.85)'; x.beginPath(); if (x.roundRect) x.roundRect(4, 6, 248, 60, 26); else x.rect(4, 6, 248, 60); x.fill();
    x.strokeStyle = col; x.lineWidth = 5; x.stroke();
    x.fillStyle = '#FFFFFF'; x.font = 'bold 30px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, 128, 37);
  }
  return new THREE.CanvasTexture(c);
}
function buildZones() {
  const mk = (id, x, z, w, d, col, txt, y, alt) => {
    const g = new THREE.Group(); g.position.set(x, .03, z); scene.add(A.dynamic(g));
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .3, depthWrite: false }));
    floor.rotation.x = -Math.PI / 2; g.add(floor);
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(w, d)), new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: .9 }));
    edge.rotation.x = -Math.PI / 2; edge.position.y = .01; g.add(edge);
    V.zones.push({ id, floor, edge, col, ph: Math.random() * 6 });
  };
  // підсвічена підлога біля бару й столу для бомб (без написів)
  mk('bar', BAR.x, BAR.z + 1.55, 5.4, 2.2, '#FFFFFF');
  mk('bomb', TABLE.x + .25, TABLE.z - .15, 2.3, 1.7, '#FFFFFF');
  mk('molly', SHELF.x, SHELF.z - .55, 1.8, 1.1, '#9FE6A8');
}
/* ---------- Меблі на плоту зомбі: щоразу інший «офіс на воді» (однаковий в усіх гравців) ---------- */
function seeded(n) { let a = (n * 2654435761) >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const FURN = {
  desk: (g, r) => { put(g, mesh(new THREE.BoxGeometry(1.6, .08, .8), r() < .5 ? '#C9B79C' : '#E8E3F0'), 0, .75, 0); for (const [a, b] of [[-.7, -.3], [.7, -.3], [-.7, .3], [.7, .3]]) put(g, mesh(new THREE.BoxGeometry(.07, .75, .07), '#4E4A6E'), a, .37, b); put(g, mesh(new THREE.BoxGeometry(.5, .35, .05), '#2E2346'), 0, 1, -.2); put(g, mesh(new THREE.BoxGeometry(.45, .28, .02), bulb(r() < .5 ? '#6BE7FF' : '#FF8A7A'), false), 0, 1.01, -.17); },
  chair: g => { put(g, mesh(new THREE.BoxGeometry(.55, .1, .55), '#6E5E96'), 0, .5, 0); put(g, mesh(new THREE.BoxGeometry(.55, .6, .1), '#6E5E96'), 0, .85, -.24); put(g, mesh(flat(new THREE.CylinderGeometry(.05, .05, .45, 6)), '#4E4A6E'), 0, .25, 0); },
  cooler: g => { put(g, mesh(new THREE.BoxGeometry(.45, 1, .45), '#E8ECF7'), 0, .5, 0); put(g, mesh(flat(new THREE.CylinderGeometry(.2, .2, .5, 10)), mat('#9FD8F5', { transparent: true, opacity: .8 })), 0, 1.25, 0); },
  printer: g => { put(g, mesh(new THREE.BoxGeometry(.8, .5, .6), '#D9DCE8'), 0, .25, 0); put(g, mesh(new THREE.BoxGeometry(.6, .05, .4), '#FFFFFF'), 0, .53, .1); },
  cabinet: (g, r) => { put(g, mesh(new THREE.BoxGeometry(.7, 1.5, .6), r() < .5 ? '#8E86B0' : '#A7B0C2'), 0, .75, 0); for (const y of [.4, .8, 1.2]) put(g, mesh(new THREE.BoxGeometry(.3, .05, .02), '#4E4A6E', false), 0, y, .31); },
  plant: g => { put(g, mesh(flat(new THREE.CylinderGeometry(.22, .17, .4, 8)), '#C4956A'), 0, .2, 0); put(g, mesh(new THREE.IcosahedronGeometry(.4, 0), '#7CCBA2'), 0, .7, 0); },
  sofa: g => { put(g, mesh(new THREE.BoxGeometry(1.8, .4, .8), '#B07CF0'), 0, .3, 0); put(g, mesh(new THREE.BoxGeometry(1.8, .6, .2), '#9A63E0'), 0, .7, -.3); for (const s of [-1, 1]) put(g, mesh(new THREE.BoxGeometry(.2, .5, .8), '#9A63E0'), s * .85, .45, 0); },
  board: g => { put(g, mesh(new THREE.BoxGeometry(1.4, .9, .06), '#FFFFFF'), 0, 1.3, 0); put(g, mesh(new THREE.BoxGeometry(1, .06, .02), '#FF8A7A', false), 0, 1.45, .04); put(g, mesh(new THREE.BoxGeometry(.7, .06, .02), '#6BE7FF', false), -.1, 1.25, .04); for (const s of [-.6, .6]) put(g, mesh(new THREE.BoxGeometry(.05, 1.3, .05), '#4E4A6E'), s, .65, 0); },
  boxes: g => { put(g, mesh(new THREE.BoxGeometry(.6, .5, .6), '#D6A87B'), 0, .25, 0); put(g, mesh(new THREE.BoxGeometry(.5, .4, .5), '#C4956A'), .1, .7, -.05).rotation.y = .4; },
  lamp: g => { put(g, mesh(flat(new THREE.CylinderGeometry(.04, .04, 1.8, 6)), '#4E4A6E'), 0, .9, 0); put(g, mesh(new THREE.ConeGeometry(.3, .3, 8, 1, true), mat('#FFD27A', { side: THREE.DoubleSide, emissive: '#FFB547', emissiveIntensity: .6 })), 0, 1.85, 0); },
  vending: g => { put(g, mesh(new THREE.BoxGeometry(.8, 1.7, .6), '#E8607E'), 0, .85, 0); put(g, mesh(new THREE.BoxGeometry(.55, .9, .02), bulb('#FFE066'), false), -.05, 1.1, .31); },
};
function furnish(w) {
  if (!V.en) return;
  if (V.furn) V.en.remove(V.furn);
  const r = seeded(w * 31 + 7), g = new THREE.Group(), keys = Object.keys(FURN), W = EN.x1 - EN.x0, L = EN.z1 - EN.z0, used = [];
  const n = 4 + Math.floor(r() * 4);
  for (let i = 0; i < n; i++) {
    let x = 0, z = 0;
    for (let k = 0; k < 12; k++) { x = (r() - .5) * (W - 1.6); z = (r() - .5) * (L - 1.6); if (!used.some(u => Math.hypot(u[0] - x, u[1] - z) < 1.7)) break; }
    used.push([x, z]);
    const f = new THREE.Group(); f.position.set(x, 0, z); f.rotation.y = Math.floor(r() * 4) * Math.PI / 2 + (r() - .5) * .4;
    FURN[keys[Math.floor(r() * keys.length)]](f, r); g.add(f);
  }
  V.en.add(g); V.furn = g; V.furnW = w;
}
function updZones(t) {
  for (const z of V.zones) {
    const broken = z.id === 'bar' && !kitchenOk();
    z.floor.material.color.set(broken ? '#FF8A7A' : z.col); z.edge.material.color.set(broken ? '#FF8A7A' : z.col);
    z.floor.material.opacity = .2 + Math.sin(t * 3 + z.ph) * .06;
  }
}
/* ---------- Гроза: блискавки б'ють у червоні кола ---------- */
function updStorm(dt) {
  for (let i = V.storm.length - 1; i >= 0; i--) {
    const q = V.storm[i]; q.t -= dt;
    const x = q.en ? enR().x0 + q.x : q.x;
    q.ring.position.set(x, .06, q.z); q.ring.material.color.set(q.t < .5 ? '#FF5C7A' : '#FFE066'); q.ring.scale.setScalar(1 + Math.sin(gameTime * 14) * .05);
    if (q.t > 0) continue;
    scene.remove(q.ring); V.storm.splice(i, 1);
    const bolt = new THREE.Mesh(new THREE.BoxGeometry(.18, 16, .18).translate(0, 8, 0), new THREE.MeshBasicMaterial({ color: '#FFFFE0', transparent: true, opacity: .95 }));
    bolt.position.set(x, 0, q.z); bolt.rotation.z = rand(-.08, .08); scene.add(bolt); setTimeout(() => scene.remove(bolt), 160);
    burst(x, .5, q.z, '#FFF6A0', 18, 6, .6, 4); ringFX(x, q.z, 1.8, '#FFF6A0', .4); sfx('boom', x, q.z);
    const d = dist2(pl.x, pl.z, x, q.z);
    if (running && !pl.dead && d < 1.7 && pl.y < 1.2) { hurtPlayer(14); knockMe(angTo(x, q.z, pl.x, pl.z), 10, '⚡ Блискавка!'); }
    else if (d < 12) shake = Math.max(shake, .3);
  }
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
  else if (e.k === 'hit') { if (here) { ftext((EN.x0 + EN.x1) / 2, 2.5, RZ, e.fire ? `🔥 Пліт горить! ${'🟫'.repeat(Math.max(0, e.hp))}` : `Пліт тріщить! ${'🟫'.repeat(Math.max(0, e.hp))}`, 'crit'); } V.hitT = .5; }
  else if (e.k === 'fire') {   // 🍾 пляшка розбилась на плоту зомбі — пожежа
    if (!AUTH() && !ST.fires.some(f => f.id === e.id)) ST.fires.push({ id: e.id, ox: +e.ox, oz: +e.oz, t: FIRE_T });
    if (!here) return; const p = { x: enR().x0 + +e.ox, z: enR().z0 + +e.oz };
    sfx('break', p.x, p.z); sfx('boom', p.x, p.z); burst(p.x, .6, p.z, '#FF7A2E', 26, 5, .8, 4); burst(p.x, .4, p.z, '#FFE066', 12, 3, .5, 2);
    ftext(p.x, 2.8, p.z, '🔥 ПОЖЕЖА НА ПЛОТУ!', 'big'); if (dist2(pl.x, pl.z, p.x, p.z) < 12) shake = Math.max(shake, .3);
  }
  else if (e.k === 'fireout') { const f = ST.fires.find(q => q.id === e.id); if (here && f) { const p = { x: enR().x0 + f.ox, z: enR().z0 + f.oz }; burst(p.x, 1, p.z, '#8C8C99', 12, 1.5, 1.4, 2.5); } ST.fires = ST.fires.filter(q => q.id !== e.id); }
  else if (e.k === 'fizz') { if (here) { burst(+e.x, .3, +e.z, e.wet ? '#FFFFFF' : '#FF7A2E', 14, 3, .7, 2.5); sfx(e.wet ? 'splash' : 'break', +e.x, +e.z); ftext(+e.x, 2.2, +e.z, e.wet ? 'Пшшш… «молотов» у воді' : '🍾 Дзинь! Тут нема чому горіти', 'calm'); } }
  else if (e.k === 'sink') { V.gone = 'sink'; if (V.en) { burst((EN.x0 + EN.x1) / 2, .5, RZ, '#8A82A8', 30, 6, 1.2, 5); if (here) { sfx('boom', RX + 5, RZ); shake = Math.max(shake, .5); } } }
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
  else if (e.k === 'chaos') onChaos(e, here);
  else if (e.k === 'end') finishRun(e);
}
function onChaos(e, here) {
  if (e.e === 'quake') { V.quake = Math.min(6, +e.d || 4.5); if (here) { banner('🌋 ЗЕМЛЕТРУС! Скелі сиплються в річку!'); sfx('boom', pl.x, pl.z); } }
  else if (e.e === 'split') { if (here) { banner('↔️ Річка розходиться на два рукави! Зомбі не дострибнуть — кидай каву й бомби.'); sfx('whoosh'); } }
  else if (e.e === 'clash') { if (here) { banner('💥 СТИКУВАННЯ! Плоти врізались — тримайся!'); sfx('boom', pl.x, pl.z); shake = Math.max(shake, .9); if (pl.y < .5 && !isWet(pl.terr)) knockMe(Math.random() * 6.28, 11, 'Бам! Плоти зіткнулись!'); } V.hitT = .8; }
  else if (e.e === 'storm') {
    if (here) { banner('⛈️ ГРОЗА над річкою! Тікай з червоних кіл!'); sfx('warn'); }
    for (const q of (e.s || []).slice(0, 12)) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(1.25, 1.6, 20), new THREE.MeshBasicMaterial({ color: '#FFE066', transparent: true, opacity: .8, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2; scene.add(ring);
      V.storm.push({ en: !!q[0], x: +q[1], z: +q[2], t: +q[3], ring });
    }
  }
  else if (e.e === 'flood') { if (here) { banner('📦 ЛУТ-ПОТІП! Річка несе купу ящиків — вантуз у руки!'); sfx('legend'); } }
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
  const was = Array.isArray(e.ro) ? e.ro.map(String).includes(myKey()) : (V.joined || inRiver(pl.x, pl.z)); V.joined = false;
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
  for (let i = V.rocks.length - 1; i >= 0; i--) { const r = V.rocks[i]; if (r.userData.drop) { r.userData.vy -= 25 * dt; r.position.y += r.userData.vy * dt; if (r.position.y < -.3) { burst(r.position.x, 0, r.position.z, '#BDEFFF', 10, 3, .6, 3); r.userData.drop = false; } continue; } r.position.z += FLOW * 3 * dt; r.rotation.y += dt; if (r.position.z > RZ + RIVER_L) { scene.remove(r); V.rocks.splice(i, 1); } }
  // пліт зомбі: припливає, трясеться від влучань, тоне
  if (V.en) {
    const h = V.en.userData.home;
    if (ST.lv > 0) V.gone = 'leave'; else if (ST.arr > 0) V.gone = 'sink';
    if (ST.enemy) {   // на місці, припливає згори або відпливає вниз — разом із зомбі
      if (ST.arr > 0 && V.furnW !== ST.wave) furnish(ST.wave);
      V.en.visible = true; V.en.rotation.z = 0; V.en.rotation.y = Math.sin(t * .5) * .03;
      V.en.position.y = Math.sin(t * 1.3) * .05;
      V.en.position.z = h.z + enZ();
      V.hitT = Math.max(0, V.hitT - dt); V.en.position.x = h.x + enOff() + (V.hitT > 0 ? Math.sin(t * 60) * .12 : 0);
    } else if (V.gone === 'sink') { V.en.position.y = Math.max(-3, V.en.position.y - dt * 1.5); V.en.rotation.z = Math.min(.35, V.en.rotation.z + dt * .2); V.en.visible = V.en.position.y > -2.9; }
    else V.en.visible = false;
  }
  syncCrates();
  for (const [id, v] of V.crates) {
    if (!v.fly) continue;
    v.fly.t += dt * 2.2; const w = v.fly.who || pl, k = Math.min(1, v.fly.t);
    v.m.position.set(lerp(v.fly.sx, w.x, k), Math.sin(k * Math.PI) * 2.2, lerp(v.fly.sz, w.z, k)); v.m.scale.setScalar(1 - k * .7);
    if (k >= 1) { scene.remove(v.m); V.crates.delete(id); }
  }
  updBombs(dt); updFires(dt, t);
  updZones(t); updPile(t);
  updStorm(dt);
  if (V.spit) { const on = ST.sp != null && ST.t - ST.sp < 15.2; V.spit.position.y = lerp(V.spit.position.y, on ? -.25 : -2.6, Math.min(1, dt * 1.5)); V.spit.position.x = (OUR.x1 + enR().x0) / 2; V.spit.visible = V.spit.position.y > -2.5; }
  if (!running || pl.dead) { hud(false); return; }
  const here = inRiver(pl.x, pl.z);
  hud(here && !panel);
  if (!here) { V.wetT = 0; return; }
  // сплав іде, а ти не з цієї команди — назад у «Гущу»
  if (ST.on && !inRun() && !V.kickT) { V.kickT = 1; goTo(0, 3, `🛶 Тут іде чужий сплав. Лишилось ${mmss(Math.max(0, ST.dur - ST.t))} — потім можна відчалити разом.`); }
  if (!ST.on || inRun()) V.kickT = 0;
  if (inRun()) V.joined = true;
  // стою на плоту зомбі — їду разом із ним
  { const o = enOff(), zo = enZ(); if (V.prevOff != null && ST.enemy && pl.y > -.4 && inRect(enR(V.prevOff, V.prevZ), pl.x, pl.z, -.3)) { pl.x += o - V.prevOff; pl.z += zo - V.prevZ; } V.prevOff = o; V.prevZ = zo; }
  // те, що впало у воду (монети, інгредієнти з зомбі), течія прибиває до нашого плота
  for (const d of DROPS) {
    if (!inRiver(d.x, d.z) || !isWet(terrainAt(d.x, d.z))) continue;
    const tx = clamp(d.x, OUR.x0 + .8, OUR.x1 - .8), tz = clamp(d.z, OUR.z0 + .8, OUR.z1 - .8), dd = dist2(d.x, d.z, tx, tz) || 1, v = Math.min(dd, 2.4 * dt);
    d.x += (tx - d.x) / dd * v; d.z += (tz - d.z) / dd * v; d.y = -.6;
    d.m.position.x = d.x; d.m.position.z = d.z; if (d.ring) { d.ring.position.x = d.x; d.ring.position.z = d.z; }
    if (!isWet(terrainAt(d.x, d.z))) d.y = 0;
  }
  // землетрус
  if (V.quake > 0) {
    V.quake -= dt; shake = Math.max(shake, .45); V.qT -= dt;
    if (V.qT <= 0) {
      V.qT = .6;
      if (!isWet(pl.terr) && pl.y < .5 && Math.random() < .5) knockMe(Math.random() * 6.28, 6, Math.random() < .3 ? 'Земля тікає з-під ніг!' : null);
      const m = mesh(rough(new THREE.DodecahedronGeometry(rand(.4, .9), 0), .3), '#8F9BD0'); m.position.set(RX + pick([-1, 1]) * rand(12, 15), 6, RZ + rand(-18, 18)); m.userData.vy = 0; scene.add(m); V.rocks.push(m); m.userData.drop = true;
    }
  }
  // змило за борт: течія несе, через кілька секунд — рятують на пліт
  if (isWet(pl.terr) && !pl.jump && pl.y < .2) {
    V.wetT += dt; pl.z += (ST.on ? FLOW * .7 : .8) * dt;
    // вода крижана: тане здоров'я
    pl.hp -= 3.5 * dt; V.coldT -= dt;
    if (V.coldT <= 0) { V.coldT = 1.4; ftext(pl.x, 1.6, pl.z, pick(['🥶 Крижана вода!', '🥶 Бррр!', '🥶 Холодно!']), 'calm'); refreshHUD(); }
    if (pl.hp <= 0) { pl.hp = 0; die(); return; }
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
    const ml = V.craft.what === 'molly', need = ml ? MOLLY_NEED : BOMB_NEED;
    if (!inRect(OUR, pl.x, pl.z, -.5)) { for (const k in need) P.ing[k] = (P.ing[k] || 0) + need[k]; V.craft = null; toast(`Зійшов з плота — ${ml ? '«молотов»' : 'бомбу'} не дозібрано (інгредієнти повернуто).`); refreshHUD(); }
    else if (ml && V.craft.t >= CRAFT_T) {
      V.craft = null; P.ing.molly = (P.ing.molly || 0) + 1;
      ftext(pl.x, 2.7, pl.z, `+1 🍾 (усього ${P.ing.molly}) · V — кинути`, 'gold');
      toast(`🍾 Коктейль Молотова готовий! Усього: <b>${P.ing.molly}</b>. <b>V</b> — кинути на пліт зомбі: пожежа з'їдає міцність, а зомбі тікають від вогню.`); sfx('legend'); refreshHUD(); save();
    }
    else if (V.craft.t >= CRAFT_T) {
      V.craft = null; P.ing.cbomb = (P.ing.cbomb || 0) + 1;
      ftext(pl.x, 2.7, pl.z, `+1 💣 (усього ${P.ing.cbomb}) · G — кинути`, 'gold');
      toast(`💣 Бомба готова! Усього: <b>${P.ing.cbomb}</b> (лежать на столі й видно в інвентарі → ресурси). <b>G</b> — кинути туди, де курсор.`); sfx('legend'); refreshHUD(); save();
    } else {
      V.craft.pt -= dt; if (V.craft.pt <= 0) { V.craft.pt = .5; ftext(pl.x, 2.5, pl.z, `🛠️ ${Math.round(V.craft.t / CRAFT_T * 100)}%`, 'calm'); }
      if (Math.random() < dt * 8) { const at = ml ? SHELF : TABLE; burst(at.x, 1.2, at.z, ml ? '#9FE6A8' : '#FFD27A', 2, 1.5, .4, 1); }
    }
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
    html = `🛶 ЕСПРЕСО-СПЛАВ · ⏱ ${mm}:${ss} · 🌊 Хвиля ${ST.wave}${ST.next > 0 ? ` (наступна ${Math.ceil(ST.next)} с)` : ''}<br><span style="font-weight:600;font-size:12px">Пліт зомбі: ${hp} · <b style="color:#FFD27A">💣 ${P.ing.cbomb || 0}</b>${P.ing.cbomb ? ' (G)' : ''} · <b style="color:#9FE6A8">🍾 ${P.ing.molly || 0}</b>${P.ing.molly ? ' (V)' : ''}${ST.fires.length ? ' · 🔥 пліт горить!' : ''} · 🧨 ${P.ing.powder || 0}/2${V.craft ? ` · 🛠️ ${Math.round(V.craft.t / CRAFT_T * 100)}%` : ''}${!kitchenOk() ? ' · <span style="color:#FF8A7A">кавомашини розбиті!</span>' : ''}${inRun() && ST.roster.length > 1 ? ` · 👥 ${ST.roster.length}` : ''}</span>`;
  } else html = `🛶 Еспресо-Сплав · <span style="font-weight:600">ударь у дзвін 🔔 на плоту (F), щоб відчалити</span>`;
  if (V.hud.innerHTML !== html) V.hud.innerHTML = html;
}

/* ---------- Бомби: G — кинути туди, де курсор ---------- */
function throwBomb() {
  if (!running || pl.dead || paused || panel) return;
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
  if (b.kind === 'molly') {   // 🍾 пляшка з ганчіркою, що горить
    put(b.m, mesh(flat(new THREE.CylinderGeometry(.11, .14, .4, 8)), mat('#5FAF6A', { transparent: true, opacity: .85 }), false), 0, 0, 0);
    put(b.m, mesh(new THREE.BoxGeometry(.12, .12, .12), '#E8D7B0', false), 0, .26, 0);
    b.spark = put(b.m, mesh(new THREE.ConeGeometry(.1, .3, 6), bulb('#FF7A2E'), false), 0, .45, 0);
    scene.add(b.m); V.bombs.push(b); return;
  }
  put(b.m, mesh(new THREE.SphereGeometry(.24, 8, 6), '#2E2346'), 0, 0, 0);
  put(b.m, mesh(flat(new THREE.CylinderGeometry(.03, .03, .2, 5)), '#E8D7B0'), 0, .26, 0);
  b.spark = put(b.m, mesh(new THREE.SphereGeometry(.07, 6, 4), bulb('#FFD27A'), false), 0, .38, 0);
  scene.add(b.m); V.bombs.push(b);
}
A.onNet('bfx', d => { if (SIMSIDE || !d) return; const b = { sx: +d.sx, sz: +d.sz, sy: 1.6, tx: +d.tx, tz: +d.tz, t: 0, T: clamp(+d.T || .8, .3, 1.5), kind: d.kind === 'molly' ? 'molly' : '' }; if ([b.sx, b.sz, b.tx, b.tz].every(Number.isFinite)) launchBomb(b); });
function updBombs(dt) {
  for (let i = V.bombs.length - 1; i >= 0; i--) {
    const b = V.bombs[i]; b.t += dt; const k = Math.min(1, b.t / b.T);
    b.m.position.set(lerp(b.sx, b.tx, k), lerp(b.sy, .3, k) + Math.sin(k * Math.PI) * 3, lerp(b.sz, b.tz, k)); b.m.rotation.x += dt * 8;
    b.spark.visible = Math.sin(gameTime * 40) > 0;
    if (k < 1) continue;
    scene.remove(b.m); V.bombs.splice(i, 1);
    const x = b.tx, z = b.tz;
    if (b.kind === 'molly') { if (b.mine) req('molly', { x, z }); continue; }   // спалах покаже подія 'fire' / 'fizz'
    const wet = isWet(terrainAt(x, z));
    if (typeof boomFX === 'function') boomFX(x, z, 3.3, wet ? .1 : .6, wet); else { ringFX(x, z, 3.3, '#FFE8D6', .6); burst(x, 1, z, '#8C5A3C', 26, 7, 1.2, 6); sfx('boom', x, z); }
    if (!wet) burst(x, .4, z, '#D6A87B', 12, 5, .9, 4);
    ftext(x, 2.6, z, 'КАВОВА БОМБА!', 'big');
    const dp = dist2(pl.x, pl.z, x, z);
    if (dp < 3.3 && running) { shake = Math.max(shake, .5); knockMe(angTo(x, z, pl.x, pl.z), 18 * (1 - dp / 4.5), 'БАБАХ!'); hurtPlayer(6); }
    else if (dp < 14) shake = Math.max(shake, .25);
    if (b.mine) req('bomb', { x, z });
  }
}
A.key('KeyG', () => { if (!running || !inRiver(pl.x, pl.z)) return false; throwBomb(); });   // поза річкою G — іншим аддонам (швабра «Дедлайну», танець на диско)

/* ---------- Взаємодія (F) ---------- */
const _getInteract = getInteract;
getInteract = function () {
  if (!SIMSIDE && running && !pl.dead && !pl.ride && !pl.carry && inRiver(pl.x, pl.z)) {
    // якщо поруч є що підняти й воно ближче за дзвін / стіл — спершу підняти
    const ct = carryTarget(), cd = ct ? dist2(pl.x, pl.z, ct[1].x, ct[1].z) : 99;
    const near = (o, r) => { const d = dist2(pl.x, pl.z, o.x, o.z); return d < r && d < cd; };
    if (near(BELL, 2)) return ST.on ? { l: `🔔 Сплав іде: хвиля ${ST.wave}`, fn: () => openPanel(TAB) } : { l: '🔔 Відчалити! (5 хвилин)', fn: () => { req('start'); sfx('ding'); } };
    if (near(TABLE, 2.1)) return { l: `💣 Зібрати бомбу (2 🧨 + 1 🩹, є ${P.ing.powder || 0} 🧨)`, fn: () => startCraft() };
    if (near(SHELF, 1.6)) return { l: `🍾 Зібрати коктейль Молотова (1 🧨 + 1 🍯, є ${P.ing.powder || 0} 🧨 · ${P.ing.syrup || 0} 🍯)`, fn: () => startMolly() };
    if (dist2(pl.x, pl.z, BAR.x, BAR.z) < 3.3 && !kitchenOk()) return { l: '☕ Кавомашини розбиті — скоро полагодяться', fn: () => toast('Зомбі розтрощили кавомашини! Вони полагодяться за ~25 с. Поки — бий, кидай баки й бомби.') };
  }
  return _getInteract.apply(this, arguments);
};
const CRAFT_T = 1.5;
function startCraft() {
  if (V.craft) { toast(V.craft.what === 'molly' ? '🛠️ Уже збираю «молотов»…' : '🛠️ Уже збираю бомбу…'); return; }
  if (!inRect(OUR, pl.x, pl.z, -.3)) { toast('Бомби збираються на твоєму плоту.'); return; }
  if (!canAfford(BOMB_NEED)) { toast(`Бракує: ${needChips(BOMB_NEED)}. Порох 🧨 — у червоних бочках, що пливуть річкою (вантуз їх притягне).`); return; }
  for (const k in BOMB_NEED) P.ing[k] -= BOMB_NEED[k];   // інгредієнти беремо одразу — бомба точно буде
  V.craft = { t: 0, pt: 0 }; toast('🛠️ Збираю бомбу… (1,5 с, не стрибай з плота)'); sfx('brew'); refreshHUD();
}
/* 🍾 Коктейль Молотова: пляшка + 🧨 порох + 🍯 сироп (горить як напалм) — біля ящика з пляшками */
function startMolly() {
  if (V.craft) { toast('🛠️ Руки зайняті — уже щось збираю…'); return; }
  if (!inRect(OUR, pl.x, pl.z, -.3)) { toast('«Молотови» збираються на твоєму плоту, біля ящика з пляшками.'); return; }
  if (!canAfford(MOLLY_NEED)) { toast(`Бракує: ${needChips(MOLLY_NEED)}. Порох 🧨 — у червоних бочках, сироп 🍯 — у ящиках з річки (вантуз притягне). Іноді готовий 🍾 пливе просто в бочці.`); return; }
  for (const k in MOLLY_NEED) P.ing[k] -= MOLLY_NEED[k];
  V.craft = { t: 0, pt: 0, what: 'molly' }; toast('🛠️ Збираю коктейль Молотова… (1,5 с, не стрибай з плота)'); sfx('pour'); refreshHUD();
}
/* V — кинути «молотов» туди, де курсор: летить пляшка з палаючою ганчіркою */
function throwMolly() {
  if (!running || pl.dead || paused || panel) return false;
  if (!(P.ing.molly > 0)) { toast(`🍾 «Молотовів» нема. Збери біля ящика з пляшками на плоту: ${needChips(MOLLY_NEED)}`); return false; }
  aimFace();
  let tx = pl.x + Math.sin(pl.face) * 7, tz = pl.z + Math.cos(pl.face) * 7;
  if (input.aimOk && input.ax != null) { tx = input.ax; tz = input.az; }
  const d = dist2(pl.x, pl.z, tx, tz), D = clamp(d, 2, 11);
  if (d > .01) { tx = pl.x + (tx - pl.x) / d * D; tz = pl.z + (tz - pl.z) / d * D; }
  P.ing.molly--; refreshHUD();
  const b = { sx: pl.x, sz: pl.z, sy: (pl.y || 0) + 1.6, tx: Math.round(tx * 10) / 10, tz: Math.round(tz * 10) / 10, t: 0, T: .45 + D * .05, mine: true, kind: 'molly' };
  launchBomb(b); A.send('bfx', { sx: Math.round(b.sx * 10) / 10, sz: Math.round(b.sz * 10) / 10, tx: b.tx, tz: b.tz, T: b.T, kind: 'molly' });
  pl.swingT = .25; pl.swingKind = 2; sfx('throw'); save(); return true;
}
A.key('KeyV', () => { if (!running || !inRiver(pl.x, pl.z)) return false; throwMolly(); });
/* Пожежі на плоту зомбі: обвуглена пляма й язики полум'я (діти плота — тонуть разом із ним) */
function updFires(dt, t) {
  if (!V.fires) V.fires = new Map();
  const ids = new Set();
  for (const f of ST.fires) {
    ids.add(f.id); if (!AUTH()) f.t = Math.max(0, f.t - dt);
    let o = V.fires.get(f.id);
    if (!o && V.en) {
      o = { g: new THREE.Group(), fl: [] };
      const sp = mesh(new THREE.CylinderGeometry(FIRE_R * .9, FIRE_R * .9, .03, 18), mat('#2A1E1A', { transparent: true, opacity: .75 }), false); sp.position.y = .2; o.g.add(sp);
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, rr = i ? FIRE_R * rand(.3, .65) : 0, fl = mesh(new THREE.ConeGeometry(.3, 1.1, 6), bulb(i % 2 ? '#FFB347' : '#FF5A2E'), false); fl.position.set(Math.cos(a) * rr, .7, Math.sin(a) * rr); o.g.add(fl); o.fl.push(fl); }
      V.en.add(o.g); V.fires.set(f.id, o);
    }
    if (!o) continue;
    o.g.position.set(f.ox - (EN.x1 - EN.x0) / 2, 0, f.oz - (EN.z1 - EN.z0) / 2);
    const k = clamp(f.t / 1.2, 0, 1);   // догорає — меншає
    o.fl.forEach((fl, i) => { const sc = (.75 + Math.sin(t * 13 + i * 2.1) * .25) * (.3 + k * .7); fl.scale.set(sc, sc * (1.1 + Math.sin(t * 9 + i) * .3), sc); });
    if (Math.random() < dt * 7 && running && inRiver(pl.x, pl.z)) { const p = { x: enR().x0 + f.ox, z: enR().z0 + f.oz }; burst(p.x + rand(-1, 1), 1.2, p.z + rand(-1, 1), Math.random() < .5 ? '#FFB347' : '#5A5560', 1, .8, .9, 2.4, .9); }
  }
  for (const [id, o] of V.fires) if (!ids.has(id)) { if (o.g.parent) o.g.parent.remove(o.g); V.fires.delete(id); }
}
/* Готові бомби лежать купкою на столі — видно, скільки їх */
function updPile(t) {
  if (!V.pile) { V.pile = new THREE.Group(); V.pile.position.set(TABLE.x - .2, .92, TABLE.z); scene.add(V.pile); }
  const n = Math.min(6, P && P.ing ? P.ing.cbomb || 0 : 0);
  while (V.pile.children.length < n) {
    const i = V.pile.children.length, b = new THREE.Group();
    put(b, mesh(new THREE.SphereGeometry(.16, 8, 6), '#2E2346'), 0, 0, 0);
    put(b, mesh(flat(new THREE.CylinderGeometry(.025, .025, .14, 5)), '#E8D7B0'), 0, .17, 0);
    b.userData.spark = put(b, mesh(new THREE.SphereGeometry(.05, 6, 4), bulb('#FFD27A'), false), 0, .26, 0);
    b.position.set((i % 3) * .34 - .34, Math.floor(i / 3) * .28, (i % 2) * .12 - .06); V.pile.add(b);
  }
  while (V.pile.children.length > n) V.pile.remove(V.pile.children[V.pile.children.length - 1]);
  for (const b of V.pile.children) b.userData.spark.visible = Math.sin(t * 20 + b.position.x * 9) > 0;
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
const mmss = sec => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
function goRaft() {
  if (ST.on && !inRun()) { toast(`🛶 Сплав уже йде — новенькі не заходять. Лишилось ${mmss(Math.max(0, ST.dur - ST.t))}, потім можна буде відчалити разом.`); return false; }
  goTo(SPAWN.x, SPAWN.z, '🛶 Ти на плоту «Еспресо-Сплаву». Дзвін 🔔 (F) — відчалити. Бар — варити каву, стіл — бомби (G), ящик з пляшками — 🍾 «молотови» (V), баки — кидати (F, потім Q).');
  return true;
}
/* Покинути сплав можна лише кнопкою (вкладка «Сплав» або Esc → інший режим). */
function leaveRun(where) {
  if (inRun()) { req('leave'); V.left = true; }
  if (where !== false) goTo(0, 3, '🚪 Ти покинув сплав. З поверненням у «Гущу».');
}
function askLeave() {
  if (!inRun()) return true;
  const ok = typeof confirm !== 'function' || confirm('Покинути сплав? Повернутись до цього сплаву вже не вийде, і нагороди за нього не буде.');
  if (ok) leaveRun(false);
  return ok;
}
/* Смерть на сплаві: відроджуєшся на плоту (не в «Гущі»). Якщо вигоріли всі — сплав провалено. */
let deathHTML = null;
const _die = die;
die = function () {
  const r = _die.apply(this, arguments);
  if (!SIMSIDE && (inRun() || (inRiver(pl.x, pl.z) && ST.on))) {
    V.diedRun = true;
    const card = $('#death .card');
    if (card) {
      if (deathHTML == null) deathHTML = card.innerHTML;
      const solo = AUTH();
      card.querySelector('h1').textContent = solo ? 'Ти вигорів. Сплав провалено.' : 'Ти вигорів на сплаві.';
      card.querySelector('p').textContent = solo ? 'Повернешся на пліт — можна відчалити ще раз. Монети не губляться.' : 'Кенти ще тримаються! Повертайся на пліт. Якщо вигорять усі — сплав провалено.';
      const b = card.querySelector('#b-respawn'); b.textContent = 'Повернутись на пліт';
      if (!solo) { b.disabled = true; let n = 4; b.textContent = `Повернутись на пліт (${n})`; const iv = setInterval(() => { n--; if (n <= 0 || !V.diedRun) { clearInterval(iv); b.disabled = false; b.textContent = 'Повернутись на пліт'; } else b.textContent = `Повернутись на пліт (${n})`; }, 1000); }
    }
    if (AUTH() && ST.on) { emit({ k: 'msg', big: 1, txt: '💀 Ти вигорів — сплав провалено.' }); endRun(false); }
  }
  return r;
};
if (!SIMSIDE && typeof document !== 'undefined') document.addEventListener('click', e => {
  if (!V.diedRun || !e.target.closest || !e.target.closest('#b-respawn')) return;
  e.stopPropagation(); e.preventDefault();
  if (e.target.closest('#b-respawn').disabled) return;
  V.diedRun = false;
  const card = $('#death .card'); if (card && deathHTML != null) card.innerHTML = deathHTML;
  $('#death').hidden = true;
  place(SPAWN.x, SPAWN.z); pl.hp = S.maxHP; pl.st = S.maxSt; pl.dead = false; pl.iframes = 3; paused = false;
  burst(pl.x, 1, pl.z, '#8FD9C0', 16, 4, .8, 4); refreshHUD(); save();
}, true);

/* ---------- Вкладка ---------- */
const TAB = A.tab('rafting', '🛶 Сплав', () => {
  const d = A.data(), here = inRiver(pl.x, pl.z);
  const left = Math.max(0, ST.dur - ST.t);
  const status = ST.on ? `<p class="note">🌊 Сплав іде: хвиля <b>${ST.wave}</b>, лишилось <b>${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}</b>, потоплено плотів: <b>${ST.sunk}</b></p>` : '';
  return `<h3>🛶 Еспресо-Сплав · Рафтинг-Запара</h3>
    ${status}
    <p style="font-size:13px;line-height:1.5;margin:4px 0 10px">5 хвилин, два плоти поруч на бурхливій річці. Зомбі підпливають хвилями й стрибають до тебе на кухню.
      Відбивайся кавою, тягни вантузом лут з води (або зомбі — у воду), збирай бомби й топи їхній пліт: 3–4 вибухи — і хвиля пройдена достроково.</p>
    <div class="btns">${inRun() ? '<button class="btn alt" data-rf="leave" style="background:#FFE1E1">🚪 Покинути сплав</button>' : here ? (ST.on ? '' : '<button class="btn" data-rf="start">🔔 Відчалити</button>') + '<button class="btn alt" data-rf="hub">🏠 Назад у «Гущу»</button>' : ST.on ? `<button class="btn" disabled>🛶 Сплав іде (${mmss(Math.max(0, ST.dur - ST.t))}) — зачекай</button>` : '<button class="btn" data-rf="go">🛶 На пліт</button>'}
      <button class="btn alt" data-rf="craft" ${here && inRect(OUR, pl.x, pl.z, -.3) ? '' : 'disabled'} title="На своєму плоту">💣 Зібрати бомбу · ${needChips(BOMB_NEED)}</button>
      <button class="btn alt" data-rf="molly" ${here && inRect(OUR, pl.x, pl.z, -.3) ? '' : 'disabled'} title="На своєму плоту">🍾 Зібрати «молотов» · ${needChips(MOLLY_NEED)}</button></div>
    <div class="list" style="margin-top:10px;font-size:13px;line-height:1.55">
      <div>☕ <b>Кава</b> — вари на барі плоту, кидай ПКМ / Q. Зомбі розбили кавомашини — бар не працює ~25 с.</div>
      <div>🪠 <b>Вантуз-гарпун</b> — притягує ящики (інгредієнти) й бочки (порох 🧨), а зомбі з чужого плота — прямо в річку.</div>
      <div>💣 <b>Бомба</b> — ${needChips(BOMB_NEED)} на столі (2 с). <b>G</b> — кинути туди, де курсор. Обережно: б'є й своїх!</div>
      <div>🍾 <b>Коктейль Молотова</b> — ${needChips(MOLLY_NEED)} біля ящика з пляшками (1,5 с) або готовий з бочки в річці. <b>V</b> — кинути в курсор. На плоту зомбі ${FIRE_T} с горить пожежа: кожні ${FIRE_DMG} с −1 міцність плота, зомбі тікають на інший край, а кому гаряче — стрибають у воду. Розбився у воді — пшшш, і все.</div>
      <div>🗑️ <b>Баки й кег</b> — F підняти, Q / ЛКМ жбурнути на сусідній пліт: збиває зомбі як кеглі.</div>
      <div>📦 <b>Коробки</b> — теж F і Q: розбиваються об зомбі, а на плоту швидко з'являються знову.</div>
      <div>🪨 <b>Пороги</b> — пліт б'ється об каміння, усіх відкидає. Змило — пливи до плота й підстрибни (пробіл). Вода крижана — тане здоров'я 🥶.</div>
      <div>🌀 <b>Хаос</b> — землетрус, річка розходиться на два рукави (а потім плоти стикаються!), гроза з блискавками, лут-потоп.</div>
      <div>🎮 Перейти в інший режим — <b>Esc</b> → «Режими й міні-ігри».</div>
    </div>
    <p class="muted" style="font-size:12px;margin-top:10px">Твій рекорд: ${d.best || 0} хвиль · сплавів: ${d.runs || 0} · пройдено: ${d.wins || 0} · потоплено плотів: ${d.sunk || 0}.
      Нагорода: монети й досвід за хвилі й потоплені плоти, за 6+ хвиль — кейс. Інвентар — той самий, що у відкритому світі.</p>`;
}, e => {
  const b = e.target.closest('[data-rf]'); if (!b || b.disabled) return;
  const a = b.dataset.rf;
  if (a === 'go') goRaft();
  else if (a === 'hub') goTo(0, 3, 'З поверненням у «Гущу».');
  else if (a === 'leave') { if (askLeave()) goTo(0, 3, '🚪 Ти покинув сплав. З поверненням у «Гущу».'); }
  else if (a === 'start') { req('start'); closePanel(); }
  else if (a === 'craft') { startCraft(); closePanel(); }
  else if (a === 'molly') { startMolly(); closePanel(); }
});

/* ---------- Режим у меню паузи (Esc) ---------- */
if (A.mode) A.mode({ id: 'rafting', ic: '🛶', n: 'Еспресо-Сплав', sub: '5 хв на плоту проти хвиль зомбі', go: () => goRaft(), here: () => running && inRiver(pl.x, pl.z), leave: () => askLeave() });

/* ---------- Музика сплаву: небезпечна пригода ----------
   Ре мінор, бойові тамтами, героїчна тема й тривожне остинато. Чотири рівні:
   0 — тиха річка перед відчалюванням, 1 — сплав (пригода), 2 — зомбі поруч (небезпека),
   3 — м'ясорубка (хаос, багато зомбі, останні 30 с): вище темп, дисонанси, наростання. */
const RPROG = [[38, [62, 65, 69, 74]], [34, [62, 65, 70, 74]], [41, [60, 65, 69, 72]], [36, [60, 64, 67, 72]]];   // Dm · Bb · F · C — пригода
const RPROG_T = [[38, [62, 65, 69, 74]], [34, [62, 65, 70, 74]], [31, [62, 67, 70, 74]], [33, [61, 64, 69, 73]]]; // Dm · Bb · Gm · A — небезпека
const THEME = [   // героїчна тема на 2 такти: [крок, нота, тривалість у кроках]
  [[0, 74, 3], [3, 69, 1], [4, 72, 2], [6, 74, 2], [8, 77, 3], [11, 76, 1], [12, 74, 4]],
  [[0, 72, 2], [2, 70, 2], [4, 69, 4], [8, 65, 2], [10, 67, 2], [12, 69, 4]],
];
const RMEL = [62, 65, 67, 69, 72, 74, 77];
const RMIX = [
  { keys: .8, bass: .75, drums: .45, tension: .15, lead: 0, crackle: 0 },
  { keys: .65, bass: .9, drums: .9, tension: .35, lead: .55, crackle: 0 },
  { keys: .55, bass: 1, drums: 1, tension: .7, lead: .5, crackle: 0 },
  { keys: .5, bass: 1, drums: 1, tension: .9, lead: .65, crackle: 0 },
];
let rLvl = -1;
function raftLevel() {
  if (!ST.on) return 0;
  const h = MON.filter(m => !m.calm && m.state !== 'fall' && inRiver(m.x, m.z) && dist2(m.x, m.z, pl.x, pl.z) < 14).length;
  if (V.quake > 0 || V.storm.length || ST.dur - ST.t < 30 || h >= 6 || (ST.sp != null && ST.t - ST.sp > 13 && ST.t - ST.sp < 18)) return 3;
  return h > 0 ? 2 : 1;
}
const tom = (t, f, v) => { tone(t, LAYER.drums, 'sine', f * 2.4, f, .38, v, .002); noiz(t, LAYER.drums, 'lowpass', 1200, 250, .07, v * .35); };
if (!SIMSIDE && typeof scheduleStep === 'function') {
  const _scheduleStep = scheduleStep;
  scheduleStep = function (i, t) {
    if (!running || pl.dead || !inRiver(pl.x, pl.z) || typeof LAYER === 'undefined' || !LAYER.drums) { if (rLvl >= 0) { rLvl = -1; barMode = ''; } return _scheduleStep.apply(this, arguments); }
    raftStep(i, t);
  };
}
function raftStep(i, t) {
  const s = i % 16, bar = Math.floor(i / 16), h = STEP / 2;
  if (s === 0) { const l = raftLevel(); if (l !== rLvl) { rLvl = l; const m = RMIX[l]; for (const k in m) if (LAYER[k]) LAYER[k].gain.setTargetAtTime(m[k], t, .5); } }
  const L = Math.max(0, rLvl), prog = L >= 2 ? RPROG_T : RPROG, [root, ch] = prog[bar % 4];
  if (L === 0) {   // тиха, але тривожна річка: гул, рідкі тамтами, краплі мелодії
    if (s === 0) { ch.forEach((n, k) => epiano(t + k * .03, n - 12, 3.4, .04, LAYER.keys)); bassNote(t, root, STEP * 14, .38); }
    if (s === 0 || s === 10) tom(t, 70, s ? .25 : .4);
    if ([4, 7, 12].includes(s) && Math.random() < .5) steel(t, pick(RMEL), .04);
    if (s % 8 === 4) hat(t, .03);
    return;
  }
  // бойові тамтами «галопом»
  const T1 = [0, 3, 6, 8, 11, 14], T2 = [0, 2, 3, 6, 8, 10, 11, 13, 14];
  if ((L >= 3 ? T2 : T1).includes(s)) tom(t, s % 8 === 0 ? 62 : s % 3 === 0 ? 82 : 98, s % 8 === 0 ? .55 : .35);
  if (s === 0 || s === 8 || (L >= 2 && s === 10)) kick(t, .85);
  if (s === 4 || s === 12) snare(t, L >= 2 ? .45 : .36);
  if (L >= 2 && (s === 7 || s === 15)) snare(t + h, .14);
  if (s % 2 === 0) hat(t, s % 4 ? .045 : .07, L >= 3 && s === 14); if (L >= 2) hat(t + h, .03);
  if (s === 0 && bar % 4 === 0) noiz(t, LAYER.drums, 'highpass', 6000, 3000, 1.2, L >= 2 ? .12 : .07);   // тарілка на початку фрази
  // бас: тривожне остинато
  if (s % 2 === 0) bassNote(t, root + (s % 8 === 6 ? 12 : 0), STEP * 1.6, L >= 2 ? .5 : .42);
  // акорди-стаби, як у пригодницькому кіно
  if (s === 0) ch.forEach((n, k) => epiano(t + k * .006, n, L >= 2 ? .7 : 1.4, .05, LAYER.keys));
  if (s === 10 && L >= 2) ch.forEach((n, k) => epiano(t + k * .006, n + (L >= 3 && k === 0 ? 1 : 0), .4, .04, LAYER.keys));   // на рівні 3 — дисонанс
  // струнне остинато (напруга)
  if (s % (L >= 2 ? 1 : 2) === 0) pulse(t, root + 24 + [0, 7, 12, 7][s % 4], STEP * .9, L >= 3 ? .07 : .05);
  // героїчна тема (на «пригоді» — завжди, у бою — через фразу)
  if (L === 1 || bar % 4 < 2) { const ph = THEME[bar % 2]; for (const [st, n, du] of ph) if (st === s) leadNote(t, n + (L >= 2 && prog === RPROG_T && bar % 4 === 1 && st > 7 ? 1 : 0), STEP * du * .95, .05); }
  else if (L >= 2 && s % 2 === 0) leadNote(t, ch[(s / 2) % 4] + 12, STEP * .9, .04);   // у бою — висхідні арпеджіо
  // наростання перед новою фразою
  if (L >= 3 && bar % 2 === 1 && s >= 12) { snare(t, .12 + (s - 12) * .07); if (s === 12) noiz(t, LAYER.drums, 'bandpass', 800, 5000, STEP * 4, .1, 2); }
}

/* ---------- Картка в головному меню ---------- */
A.on('start', () => { if (V.auto && !SIMSIDE) setTimeout(goRaft, 700); });
if (!SIMSIDE && typeof document !== 'undefined') {
  const box = document.querySelector('#main-menu .mm-container');
  if (box && !document.getElementById('mm-rafting')) {
    const card = document.createElement('div'); card.className = 'mm-card'; card.id = 'mm-rafting';
    card.innerHTML = `<div class="mm-img-wrap"><div class="mm-card-img" style="background-image:url('menu/rafting-bg.jpg'),url('${IMG}');background-color:#2c2c54"></div></div>
      <div class="mm-card-body"><h2>СПЛАВ</h2><div class="mm-subtitle">Рафтинг-Запара</div>
      <div class="mm-desc">5 хвилин, два плоти. Вари каву, крафти бомби, відбивай хвилі зомбі на воді! Інвентар спільний з основою.</div></div>`;
    const locked = [...box.children].filter(c => c.classList.contains('mm-locked')).pop();
    box.insertBefore(card, locked || null);
    // 4 картки в ряд: трохи вужчі
    // розмір карток і перенос рядків — у ядрі (максимум 3 в ряд)
    card.addEventListener('click', () => {
      V.auto = true;
      if (running) goRaft();
      const mm = document.getElementById('main-menu'); if (mm) { mm.classList.add('mm-hide'); mm.addEventListener('transitionend', () => mm.remove(), { once: true }); }
    });
  }
}
