/* Аддон «Дедлайн о 18:00»: кооператив на 1–4 гравці в офісі зомбі-офісників.
   П'ятниця, 17:55. Квартальний звіт мав бути вчора, а здати його треба до 18:00 — за 5 хвилин.
   - Ланцюжок завдань (порядок і варіанти щораунду інші):
     📄 зібрати дані з робочих столів колег → 🖨️ покласти в принтер і надрукувати (тримай поруч) →
     3 випадкові з 5: 📎 степлер у копіцентрі · 🔏 печатка в бухгалтерії · 🗂️ номер з архіву в кабінеті начальника ·
     📠 скан у серверній · ✍️ підпис начальника (без ☕ кави з кухні не підписує!) → 📤 лоток «Відправка» на ресепшені.
   - Хаос: принтер зажовує папір, кавоварка вибухає, стрибок напруги вимикає світло, сервер перегрівається,
     спрацьовують спринклери (папірці розлітаються), раптова «нарада» — і коридори забиті зомбі.
   - Зомбі-офісники на нараді блукають коридорами, штовхаються й крадуть папери. F поруч — «Це можна було листом!» (зомбі сідає).
   - Друзі бачать, що в тебе в руках (папери, звіт, кава). Великий настінний годинник і музика, що цокає дедалі швидше.
   Перемога — звіт здано до 18:00 (зірки за запас часу), поразка — пробило 18:00.
   У спільному світі офіс один на всіх: завдання, хаос, зомбі й начальника рахує сервер.
   Картинку для картки в меню поклади поруч: addons/deadline/deadline-bg.jpg */
const A = Addon.info({ name: 'Дедлайн о 18:00', version: '1.0', desc: 'Кооп на 1–4 в офісі: здай квартальний звіт до 18:00 — дані, принтер, підписи, печатки, кава начальнику, хаос і зомбі на нараді.' });

const SIMSIDE = !!window.__SIM;
const AUTH = () => SIMSIDE || !(typeof WORLD !== 'undefined' && WORLD.on);
const OX = -120, OZ = -80, ISL_R = 28;
const HX = 20, HZ = 14, CZ = 2, DH = 1.1;                          // будівля x −20…20, z −14…14; коридор z −2…2; дверний проріз 2,2 м
const W = (x, z) => ({ x: OX + x, z: OZ + z });
const inOffice = (x, z) => dist2(x, z, OX, OZ) < ISL_R + 2;

/* ---------- План офісу (локальні координати від центру острова) ----------
   Північ (z<−2): кабінет начальника · переговорна · серверна · бухгалтерія · копіцентр.
   Коридор z −2…2 через усю будівлю. Південь: опенспейс · ресепшн (вхід) · кухня/WC · зона відпочинку/склад. */
const WALLS = [];
function wall(ax, az, bx, bz, doors, kind) {
  const hor = az === bz, a = hor ? ax : az, b = hor ? bx : bz;
  const cuts = doors.map(d => typeof d === 'number' ? [d - DH, d + DH] : d).sort((p, q) => p[0] - q[0]);
  let s = a;
  for (const [c0, c1] of cuts) { if (c0 > s) WALLS.push(hor ? [s, az, c0, az, kind] : [ax, s, ax, c0, kind]); s = c1; }
  if (b > s) WALLS.push(hor ? [s, az, b, az, kind] : [ax, s, ax, b, kind]);
}
wall(-HX, -HZ, HX, -HZ, [], 'o'); wall(-HX, -HZ, -HX, HZ, [], 'o'); wall(HX, -HZ, HX, HZ, [], 'o'); wall(-HX, HZ, HX, HZ, [[-1.6, 1.6]], 'o');   // вхід — з півдня
wall(-HX, -CZ, -3, -CZ, [-15.5, -7], 'g'); wall(-3, -CZ, HX, -CZ, [0, 7.5, 16], 'i');                        // коридор, північ: скло в кабінет і переговорну
for (const x of [-11, -3, 3, 12]) wall(x, -HZ, x, -CZ, [], 'i');
wall(-HX, CZ, -5, CZ, [-16.25, -9.25], 'i'); wall(5, CZ, HX, CZ, [8.75, 16.25], 'i');                          // коридор, південь (ресепшн відкритий)
wall(-5, CZ, -5, HZ, [6.7], 'i'); wall(5, CZ, 5, HZ, [11], 'i'); wall(5, 8, HX, 8, [11.4], 'i'); wall(12.5, CZ, 12.5, HZ, [11], 'i');
const ROOMS = [
  { id: 'boss', n: 'КАБІНЕТ НАЧАЛЬНИКА', c: '#FF6BD6', x0: -HX, z0: -HZ, x1: -11, z1: -CZ, fl: '#B88A64', dx: -15.5, dz: -CZ },
  { id: 'meet', n: 'ПЕРЕГОВОРНА', c: '#FFB35C', x0: -11, z0: -HZ, x1: -3, z1: -CZ, fl: '#4F7F86', dx: -7, dz: -CZ },
  { id: 'srv', n: 'СЕРВЕРНА', c: '#6BE7FF', x0: -3, z0: -HZ, x1: 3, z1: -CZ, fl: '#4A5066', dx: 0, dz: -CZ },
  { id: 'acc', n: 'БУХГАЛТЕРІЯ', c: '#7FE08A', x0: 3, z0: -HZ, x1: 12, z1: -CZ, fl: '#9DBFA9', dx: 7.5, dz: -CZ },
  { id: 'copy', n: 'КОПІЦЕНТР', c: '#B07CF0', x0: 12, z0: -HZ, x1: HX, z1: -CZ, fl: '#CFC9E2', dx: 16, dz: -CZ },
  { id: 'open', n: 'ОПЕНСПЕЙС', c: '#5CC8FF', x0: -HX, z0: CZ, x1: -5, z1: HZ, fl: '#7F95C4', dx: -12.75, dz: CZ },
  { id: 'lobby', n: 'РЕСЕПШН', c: '#FFD27A', x0: -5, z0: CZ, x1: 5, z1: HZ, fl: '#EFEAF7' },
  { id: 'kitchen', n: 'КУХНЯ', c: '#FFD27A', x0: 5, z0: CZ, x1: 12.5, z1: 8, fl: '#F4F0E8', dx: 8.75, dz: CZ },
  { id: 'wc', n: 'WC', c: '#8FD9FF', x0: 12.5, z0: CZ, x1: HX, z1: 8, fl: '#D3E9F3', dx: 16.25, dz: CZ, w: 1.2 },
  { id: 'lounge', n: 'ЗОНА ВІДПОЧИНКУ', c: '#FF8A7A', x0: 5, z0: 8, x1: 12.5, z1: HZ, fl: '#D9A57E' },
  { id: 'store', n: 'СКЛАД', c: '#B8B2C8', x0: 12.5, z0: 8, x1: HX, z1: HZ, fl: '#A7A2B5' },
];
const roomAt = (x, z) => { const lx = x - OX, lz = z - OZ; return ROOMS.find(r => lx >= r.x0 && lx <= r.x1 && lz >= r.z0 && lz <= r.z1) || null; };
/* опенспейс: 4 колонки × 3 ряди столів; за 8 сидять колеги, 4 — порожні */
const DCOL = [-18, -14.5, -11, -7.5], DROW = [4.6, 8.2, 11.8], DEMPTY = [1, 6, 8, 11];
const ALLDESK = []; for (const z of DROW) for (const x of DCOL) ALLDESK.push({ lx: x, lz: z });
const DESKS = ALLDESK.filter((_, k) => !DEMPTY.includes(k)).map((d, i) => ({ i, x: OX + d.lx, z: OZ + d.lz, p: W(d.lx + 1.15, d.lz + .8) }));
const NAMES = ['Олег з продажів', 'Світлана-маркетологиня', 'Ігор-аналітик', 'Оксана з HR', 'Тарас-логіст', 'Марта-юристка', 'Влад-девелопер', 'Ліда-дизайнерка'];
const st = (ox, oz, px, pz, r) => ({ o: W(ox, oz), p: W(px, pz), r, l: { x: ox, z: oz } });
const START = st(-1.8, 8.2, -1.8, 9.6, .7), SEND = st(2.2, 8.2, 2.2, 9.6, .6);                                 // ресепшн
const PRINTER = st(16, -12.9, 16, -11.3, .75), STAPLER = st(19.2, -7, 17.9, -7, .55);                          // копіцентр
const COFFEE = st(8.2, 7.5, 8.2, 6.1, .55), VALVE = st(5.35, 3.4, 6.4, 3.4, .35);                               // кухня
const PANEL = st(19.75, 0, 18.7, 0, .35);                                                                       // кінець коридору
const ARCHIVE = st(-19.4, -7, -18.1, -7, .6), RACK = st(-1.5, -12.9, -1.5, -11.3, .75), SCANNER = st(2.45, -5.6, 1.2, -5.6, .5), STAMP = st(7.5, -9.6, 7.5, -8.2, .55);
const BOSS_DESK = W(-15.5, -10.3), CLOCK = W(-4, -CZ);
const BPATH = [W(-15.5, -11.6), W(-13.1, -11.6), W(-13.1, -4.6), W(-15.5, -3.6), W(-15.5, 0), W(-7, 0), W(-7, -4.7)];   // крісло начальника … голова столу в переговорній
const ZWP = [[-18, 0], [-14, 0], [-10, 0], [-6, 0], [-2, 0], [2, 0], [6, 0], [10, 0], [14, 0], [17.5, 0], [0, 4.5], [-3.6, 5], [3.6, 5], [0, 11.5], [-3, 12.4], [3, 12.2],
  [-16.25, 6.7], [-12.75, 6.7], [-9.25, 6.7], [-6, 6.7], [-16.25, 10.3], [-12.75, 10.3], [-9.25, 10.3], [-6, 10.3]].map(([x, z]) => W(x, z));
/* тверді меблі (і на сервері, і в гравця — у тому самому порядку): прямокутник = ряд кіл */
const OBS = [];
const ob = (x, z, r) => OBS.push({ x: OX + x, z: OZ + z, r });
function obBox(x, z, w, d) { const r = Math.min(w, d) / 2, l = Math.max(w, d), n = Math.max(1, Math.ceil((l - 2 * r) / r) + 1); for (let k = 0; k < n; k++) { const t = n === 1 ? 0 : (k / (n - 1) - .5) * (l - 2 * r); ob(w >= d ? x + t : x, w >= d ? z : z + t, r); } }
for (const d of ALLDESK) { obBox(d.lx, d.lz, 1.6, .8); ob(d.lx, d.lz + .75, .32); }
obBox(START.l.x, START.l.z, 2.8, .8); obBox(SEND.l.x, SEND.l.z, 1.2, .7);
obBox(PRINTER.l.x, PRINTER.l.z, 1.4, 1.2); obBox(13.5, -12.9, 1.1, 1.1); obBox(12.85, -7, .6, 3); obBox(STAPLER.l.x, STAPLER.l.z, .9, 1.6); obBox(18.9, -12.9, 1, 1);
obBox(7.8, 7.55, 4.8, .8); ob(11.9, 2.75, .5); ob(10.4, 4.6, .7); ob(VALVE.l.x, VALVE.l.z, .3); ob(PANEL.l.x, PANEL.l.z, .3);
obBox(BOSS_DESK.x - OX, BOSS_DESK.z - OZ, 2.6, 1.1); ob(-15.5, -12.5, .35); obBox(ARCHIVE.l.x, ARCHIVE.l.z, .8, 2); obBox(-17.2, -13.55, 3, .6); obBox(-11.55, -7.5, .8, 2.4);
obBox(-7, -9.2, 1.8, 6); for (const z of [-11.2, -9.7, -8.2, -6.7]) { ob(-8.35, z, .28); ob(-5.65, z, .28); }
for (const [x, z] of [[-1.5, -12.9], [1.5, -12.9], [-1.5, -9.4], [1.5, -9.4]]) obBox(x, z, 1.4, 1); obBox(SCANNER.l.x, SCANNER.l.z, .9, 1.4); obBox(-2.6, -5.5, .5, 1.4);
obBox(STAMP.l.x, STAMP.l.z, 1.8, .9); ob(7.5, -10.4, .3); obBox(4.9, -12.3, 1.6, .8); obBox(10.1, -12.3, 1.6, .8); obBox(11.55, -5.5, .7, 3); obBox(3.7, -13.3, .8, .8);
obBox(7.8, 13.4, 3.6, .9); ob(7.8, 11.6, .5); obBox(7.5, 8.4, 2, .4); ob(6, 9.5, .45); ob(11.6, 13.2, .45);
obBox(16.4, 7.2, 7, 1.4); obBox(12.85, 4.3, .5, 2.6);
obBox(19.6, 11, .6, 5); obBox(16, 13.6, 5, .6); ob(14.2, 9.3, .45);
obBox(-4.4, 11.5, .8, 2.4); ob(4.3, 5.6, .3); ob(START.l.x, START.l.z - .8, .3);
const CHAIRS = [[-3.4, 4.2], [6.9, 5.4], [6.6, 10.6], [-6.3, 3.4]];   // крісла на коліщатках (можна кататись)

const STEPS = {
  data: { ic: '📄', n: 'Зібрати дані з робочих столів колег' },
  print: { ic: '🖨️', n: 'Надрукувати звіт (копіцентр)' },
  staple: { ic: '📎', n: 'Скріпити степлером (копіцентр)', at: STAPLER, t: 1.5, act: 'Скріплюю' },
  stamp: { ic: '🔏', n: 'Поставити печатку (бухгалтерія)', at: STAMP, t: 2, act: 'Ставлю печатку' },
  number: { ic: '🗂️', n: 'Реєстраційний номер з архіву (кабінет начальника)', at: ARCHIVE, t: 2, act: 'Шукаю номер в архіві' },
  scan: { ic: '📠', n: 'Скан-копія в серверній', at: SCANNER, t: 3, act: 'Сканую' },
  sign: { ic: '✍️', n: 'Підпис начальника (спершу ☕ кава!)', t: 1.5, act: 'Начальник підписує' },
  send: { ic: '📤', n: 'Здати у лоток «Відправка» (ресепшн)' },
};
const SUBS = ['staple', 'stamp', 'number', 'scan', 'sign'];
const ITEM = { sheets: { ic: '📄', n: 'дані' }, report: { ic: '📘', n: 'звіт' } };
const GRACE = 12;                                                                // с на початку раунду без зомбі-атак
const FIXT = { jam: 2.5, cm: 3, heat: 3, power: 2, rain: 2 };
const CHAOS = { jam: '🖨️ Принтер зажував папір!', boom: '💥 Кавоварка вибухнула!', power: '⚡ Стрибок напруги — світло вимкнулось!', heat: '🔥 Сервер перегрівся!', rain: '💦 Спрацювали спринклери — папери летять!', meeting: '🧟 Раптова нарада! Коридори забиті зомбі-офісниками!' };

A.island({ id: 'deadline', n: 'Дедлайн о 18:00', sub: 'офіс · квартальний звіт до 18:00', x: OX, z: OZ, r: ISL_R, top: '#A8D8C0', rock: '#9389C9', biome: 'officeday', tier: 1, safe: true });
const _buildIsland = buildIsland;
buildIsland = function (s) { if (s.biome !== 'officeday') return _buildIsland.apply(this, arguments); return SIMSIDE ? new THREE.Group() : buildLevel(s); };

/* ---------- Стан раунду ---------- */
const ST = { on: false, t: 0, dur: 300, lv: 0, steps: [], si: 0, need: 3, fed: 0, desk: DESKS.map(() => 0), held: {}, floor: [], zom: [], boss: { x: BPATH[0].x, z: BPATH[0].z, f: 0, i: 0, dir: 1, wait: 6, at: 'desk' },
  coffee: 0, jam: 0, pw: 1, heat: 0, cm: 1, rain: 0, fixes: 0 };
const AU = { chaosT: 25, jamP: .45, boomP: .3, jammed: 0, boomed: 0, pwT: 0, rainT: 0, dropT: 0, idle: 0, stT: 0, fid: 0, zid: 0, wins: 0, away: {} };
const myKey = () => (NET.on && typeof WORLD !== 'undefined' && WORLD.on ? myName() : 'me');
const keyOf = from => SIMSIDE ? String(from && from.name || '') : 'me';
const r2 = v => Math.round(v * 100) / 100;
const cur = () => ST.steps[ST.si] || '';
const heldOf = k => ST.held[k] || { it: '', n: 0, cup: 0 };
const myHeld = () => heldOf(myKey());
function setHeld(k, it, n, cup) { if (!it && !cup) delete ST.held[k]; else ST.held[k] = { it: it || '', n: it ? Math.max(1, n | 0) : 0, cup: cup ? 1 : 0 }; }
function snap() {
  return { on: ST.on ? 1 : 0, t: r2(ST.t), dur: ST.dur, lv: ST.lv, st: ST.steps, si: ST.si, nd: ST.need, fd: ST.fed, dk: ST.desk,
    h: Object.entries(ST.held).map(([k, v]) => [k, v.it, v.n, v.cup]), f: ST.floor.map(f => [f.id, f.it, f.n, r2(f.x), r2(f.z)]),
    z: ST.zom.map(z => [z.id, r2(z.x), r2(z.z), r2(z.f), z.stun > 0 ? 1 : 0, z.carry ? z.carry.it : '', z.carry ? z.carry.n : 0]),
    b: [r2(ST.boss.x), r2(ST.boss.z), r2(ST.boss.f), ST.boss.at], cf: ST.coffee, jm: ST.jam, pw: ST.pw, ht: ST.heat, cm: ST.cm, rn: ST.rain, fx: ST.fixes };
}
function applySnap(d) {
  Object.assign(ST, { on: !!d.on, t: +d.t || 0, dur: +d.dur || 300, lv: d.lv | 0, si: d.si | 0, need: d.nd | 0, fed: d.fd | 0, coffee: d.cf ? 1 : 0, jam: d.jm ? 1 : 0, pw: d.pw ? 1 : 0, heat: d.ht ? 1 : 0, cm: d.cm ? 1 : 0, rain: d.rn ? 1 : 0, fixes: d.fx | 0 });
  if (Array.isArray(d.st)) ST.steps = d.st.filter(s => STEPS[s]).slice(0, 10);
  if (Array.isArray(d.dk)) ST.desk = DESKS.map((_, i) => d.dk[i] ? 1 : 0);
  if (Array.isArray(d.h)) { ST.held = {}; for (const a of d.h.slice(0, 16)) if (a && (ITEM[a[1]] || a[3])) ST.held[String(a[0])] = { it: ITEM[a[1]] ? a[1] : '', n: a[2] | 0, cup: a[3] ? 1 : 0 }; }
  if (Array.isArray(d.f)) ST.floor = d.f.slice(0, 20).filter(a => ITEM[a[1]]).map(a => ({ id: a[0], it: a[1], n: a[2] | 0, x: +a[3], z: +a[4] }));
  if (Array.isArray(d.z)) {
    const old = new Map(ST.zom.map(z => [z.id, z]));
    ST.zom = d.z.slice(0, 10).map(a => { const z = old.get(a[0]) || { id: a[0], x: +a[1], z: +a[2] }; return Object.assign(z, { tx: +a[1], tz: +a[2], f: +a[3], stun: a[4] ? 1 : 0, carry: ITEM[a[5]] ? { it: a[5], n: a[6] | 0 } : null }); });
  }
  if (Array.isArray(d.b)) Object.assign(ST.boss, { tx: +d.b[0], tz: +d.b[1], f: +d.b[2], at: String(d.b[3] || '') });
}
function pushState() { if (SIMSIDE) A.send('st', snap()); }
function emit(e) { if (SIMSIDE) A.send('ev', e); else onEvent(e); }
function req(k, d) { const o = Object.assign({ k }, d || {}); if (AUTH()) onReq(o, { id: NET.id, name: myName() }); else A.send('rq', o); }
A.onNet('st', (d, from) => { if (!SIMSIDE && !AUTH() && from.id === -1 && d) applySnap(d); });
A.onNet('ev', (d, from) => { if (!SIMSIDE && !AUTH() && from.id === -1 && d) onEvent(d); });
A.onNet('rq', (d, from) => { if (SIMSIDE && d) onReq(d, from); });

/* ---------- Геометрія: стіни й меблі (для зомбі та начальника) ---------- */
function segD(px, pz, s) {
  const ax = OX + s[0], az = OZ + s[1], bx = OX + s[2], bz = OZ + s[3], dx = bx - ax, dz = bz - az, l = dx * dx + dz * dz;
  const t = l ? clamp(((px - ax) * dx + (pz - az) * dz) / l, 0, 1) : 0;
  return Math.hypot(px - ax - dx * t, pz - az - dz * t);
}
function blocked(x, z, r = .35) {
  if (Math.abs(x - OX) > HX - r || Math.abs(z - OZ) > HZ - r) return true;
  for (const s of WALLS) if (segD(x, z, s) < r + .12) return true;
  for (const o of OBS) if (dist2(x, z, o.x, o.z) < o.r + r) return true;
  return false;
}
function freeSpot(x, z) {
  x = clamp(x, OX - HX + .8, OX + HX - .8); z = clamp(z, OZ - HZ + .8, OZ + HZ - .8);
  for (let k = 0; k < 24; k++) { const a = k * 2.4, d = k * .12, nx = x + Math.cos(a) * d, nz = z + Math.sin(a) * d; if (!blocked(nx, nz, .3)) return { x: nx, z: nz }; }
  return { x: OX, z: OZ + 8 };
}

/* ---------- Логіка раунду (сервер світу або сам гравець) ---------- */
function crew() {
  return SIMSIDE ? simPlayers().filter(p => !p.dead && inOffice(p.x, p.z)).map(p => ({ name: p.name, x: p.x, z: p.z }))
    : (running && !pl.dead && inOffice(pl.x, pl.z) ? [{ name: 'me', x: pl.x, z: pl.z }] : []);
}
function posOf(k) { const p = crew().find(c => c.name === k); return p || { x: OX, z: OZ + 8 }; }
function toFloor(it, n, x, z) {
  if (!ITEM[it] || n <= 0) return;
  const p = freeSpot(x, z);
  const same = it === 'sheets' && ST.floor.find(f => f.it === 'sheets' && dist2(f.x, f.z, p.x, p.z) < .8);
  if (same) same.n += n; else ST.floor.push({ id: ++AU.fid, it, n, x: r2(p.x), z: r2(p.z) });
}
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function spawnZombie(life) {
  const free = ZWP.filter(p => dist2(p.x, p.z, START.p.x, START.p.z) > 6 && !ST.zom.some(z => dist2(z.x, z.z, p.x, p.z) < 1.5));
  const p = pick(free.length ? free : ZWP);
  ST.zom.push({ id: ++AU.zid, x: p.x, z: p.z, f: 0, stun: 0, cd: 2, wp: Math.floor(Math.random() * ZWP.length), carry: null, life: life || 0 });
}
function onReq(d, from) {
  const k = keyOf(from), who = SIMSIDE ? escapeHTML(k) : 'Ти', h = heldOf(k);
  if (d.k === 'start') { if (!ST.on) startRound(from); return; }
  if (d.k === 'drop') { if (h.it) { const p = posOf(k); toFloor(h.it, h.n, p.x, p.z); } setHeld(k, '', 0, 0); pushState(); return; }
  if (!ST.on) return;
  if (d.k === 'take') {
    const i = d.i | 0; if (!ST.desk[i] || (h.it && h.it !== 'sheets')) return;
    ST.desk[i] = 0; setHeld(k, 'sheets', h.n + 1, h.cup); emit({ k: 'take', i, who: k }); pushState();
  }
  else if (d.k === 'feed') {
    if (h.it !== 'sheets') return;
    ST.fed += h.n; setHeld(k, '', 0, h.cup);
    emit({ k: 'msg', txt: `📥 ${who} поклав дані в принтер: ${Math.min(ST.fed, ST.need)}/${ST.need}` });
    if (cur() === 'data' && ST.fed >= ST.need) advance(k);
    pushState();
  }
  else if (d.k === 'print') {
    if (cur() !== 'print' || ST.jam || !ST.pw || h.it) return;
    if (!AU.jammed && Math.random() < AU.jamP) { AU.jammed = 1; chaos('jam'); pushState(); return; }
    setHeld(k, 'report', 1, h.cup); advance(k); pushState();
  }
  else if (d.k === 'pick') {
    const i = ST.floor.findIndex(f => f.id === d.id); if (i < 0) return;
    const f = ST.floor[i]; if (h.it && !(h.it === 'sheets' && f.it === 'sheets')) return;
    ST.floor.splice(i, 1); setHeld(k, f.it, (h.it ? h.n : 0) + f.n, h.cup); emit({ k: 'pick', it: f.it, who: k }); pushState();
  }
  else if (d.k === 'brew') {
    if (!ST.cm || h.cup) return;
    if (!AU.boomed && Math.random() < AU.boomP) { AU.boomed = 1; chaos('boom'); pushState(); return; }
    setHeld(k, h.it, h.n, 1); emit({ k: 'brewed', who: k }); pushState();
  }
  else if (d.k === 'give') {
    if (!h.cup || ST.coffee) return;
    ST.coffee = 1; setHeld(k, h.it, h.n, 0); emit({ k: 'coffee', who: k }); pushState();
  }
  else if (d.k === 'sub') {
    const w = String(d.w || ''); if (cur() !== w || h.it !== 'report' || !STEPS[w].t) return;
    if (w === 'sign' && !ST.coffee) return;
    if (w === 'scan' && (ST.heat || !ST.pw)) return;
    advance(k); pushState();
  }
  else if (d.k === 'fix') {
    const w = String(d.w || ''); let ok = 0;
    if (w === 'jam' && ST.jam) { ST.jam = 0; ok = 1; } else if (w === 'cm' && !ST.cm) { ST.cm = 1; ok = 1; } else if (w === 'heat' && ST.heat) { ST.heat = 0; ok = 1; }
    else if (w === 'power' && !ST.pw) { ST.pw = 1; ok = 1; } else if (w === 'rain' && ST.rain) { ST.rain = 0; ok = 1; }
    if (ok) { ST.fixes++; emit({ k: 'fixed', w, who: k }); pushState(); }
  }
  else if (d.k === 'shoo') {
    const z = ST.zom.find(q => q.id === d.id); if (!z || z.stun > 0) return;
    z.stun = 6; z.cd = 3; ST.fixes++;
    if (z.carry) { toFloor(z.carry.it, z.carry.n, z.x, z.z); z.carry = null; }
    emit({ k: 'shoo', id: z.id, x: r2(z.x), z: r2(z.z), who: k }); pushState();
  }
  else if (d.k === 'send') {
    if (cur() !== 'send' || h.it !== 'report') return;
    setHeld(k, '', 0, h.cup); ST.si++; endRound(true, '', k);
  }
}
function advance(k) {
  const done = cur(); ST.si++;
  emit({ k: 'step', done, next: cur(), who: k });
}
function startRound(from) {
  const lv = SIMSIDE ? AU.wins : (A.data().wins | 0);
  const need = Math.min(5, 3 + lv), subs = shuffle(SUBS.slice()).slice(0, lv >= 3 ? 4 : 3);
  const desks = shuffle(DESKS.map(d => d.i)).slice(0, need);
  Object.assign(ST, { on: true, t: 0, lv, steps: ['data', 'print', ...subs, 'send'], si: 0, need, fed: 0, desk: DESKS.map(d => desks.includes(d.i) ? 1 : 0), held: {}, floor: [], zom: [],
    coffee: 0, jam: 0, pw: 1, heat: 0, cm: 1, rain: 0, fixes: 0 });
  Object.assign(ST.boss, { x: BPATH[0].x, z: BPATH[0].z, i: 0, dir: 1, wait: 8, at: 'desk' });
  for (let i = 0; i < Math.min(5, 2 + lv); i++) spawnZombie();
  Object.assign(AU, { chaosT: rand(22, 30), jammed: 0, boomed: 0, pwT: 0, rainT: 0, dropT: 0, idle: 0, away: {} });
  emit({ k: 'msg', big: 1, txt: `⏰ 17:55! Квартальний звіт — до 18:00!${from && from.name && SIMSIDE ? ' ' + escapeHTML(from.name) + ' б’є на сполох.' : ''}` });
  pushState();
}
function endRound(win, why, by) {
  if (!ST.on) return;
  ST.on = false;
  const res = { k: 'end', win: win ? 1 : 0, left: r2(Math.max(0, ST.dur - ST.t)), fx: ST.fixes, done: ST.si, tot: ST.steps.length, why: why || '', by: by || '' };
  if (win && SIMSIDE) AU.wins++;
  for (const z of ST.zom) z.carry = null;
  Object.assign(ST, { held: {}, floor: [], jam: 0, pw: 1, heat: 0, cm: 1, rain: 0 });
  ST.zom.splice(2);
  emit(res); pushState();
}
function chaos(w) {
  if (w === 'jam') { if (ST.jam) return; ST.jam = 1; }
  else if (w === 'boom') { if (!ST.cm) return; ST.cm = 0; }
  else if (w === 'power') { if (!ST.pw) return; ST.pw = 0; AU.pwT = 15; }
  else if (w === 'heat') { if (ST.heat) return; ST.heat = 1; }
  else if (w === 'rain') { if (ST.rain) return; ST.rain = 1; AU.rainT = 14; AU.dropT = 1.5; }
  else if (w === 'meeting') { for (let i = 0; i < 3; i++) spawnZombie(35); }
  else return;
  emit({ k: 'chaos', w });
}
/* начальник ходить між своїм столом і переговорною; якщо хтось поруч — зупиняється поговорити */
function updBoss(dt, c) {
  const B = ST.boss, near = c.find(p => dist2(p.x, p.z, B.x, B.z) < 1.8);
  if (near) { B.f = Math.atan2(near.x - B.x, near.z - B.z); return; }
  if (B.wait > 0) { B.wait -= dt; B.at = B.i === 0 ? 'desk' : B.i === BPATH.length - 1 ? 'meeting' : 'walk'; return; }
  B.at = 'walk';
  const t = BPATH[B.i], d = dist2(B.x, B.z, t.x, t.z);
  if (d < .15) {
    if (B.i === 0 || B.i === BPATH.length - 1) { B.wait = rand(9, 14); B.dir = B.i === 0 ? 1 : -1; }
    B.i = clamp(B.i + B.dir, 0, BPATH.length - 1); return;
  }
  const s = Math.min(d, 1.5 * dt); B.x += (t.x - B.x) / d * s; B.z += (t.z - B.z) / d * s; B.f = Math.atan2(t.x - B.x, t.z - B.z);
}
/* ---------- Навігація зомбі: сітка 0,5 м по будівлі й пошук шляху крізь двері (BFS) ---------- */
const NAV = { cell: .5, x0: OX - HX, z0: OZ - HZ, nx: Math.round(2 * HX / .5), nz: Math.round(2 * HZ / .5), block: null };
function navBuild() {
  const b = new Uint8Array(NAV.nx * NAV.nz);
  for (let i = 0; i < NAV.nx; i++) for (let j = 0; j < NAV.nz; j++) b[i + j * NAV.nx] = blocked(NAV.x0 + (i + .5) * NAV.cell, NAV.z0 + (j + .5) * NAV.cell, .3) ? 1 : 0;
  NAV.block = b;
}
const cellOf = (x, z) => [clamp(Math.floor((x - NAV.x0) / NAV.cell), 0, NAV.nx - 1), clamp(Math.floor((z - NAV.z0) / NAV.cell), 0, NAV.nz - 1)];
function navPath(x, z, tx, tz) {
  if (!NAV.block) navBuild();
  const [si, sj] = cellOf(x, z), [ti, tj] = cellOf(tx, tz), nx = NAV.nx, start = si + sj * nx, goal = ti + tj * nx;
  const prev = new Int32Array(nx * NAV.nz).fill(-1), q = [start]; prev[start] = start;
  for (let h = 0; h < q.length && prev[goal] < 0; h++) {   // BFS (8 сусідів) — для такої сітки досить
    const c = q[h], ci = c % nx, cj = (c / nx) | 0;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const ni = ci + di, nj = cj + dj; if (ni < 0 || nj < 0 || ni >= nx || nj >= NAV.nz) continue;
      const n = ni + nj * nx; if (prev[n] >= 0 || (NAV.block[n] && n !== goal)) continue;
      if (di && dj && (NAV.block[ci + di + cj * nx] || NAV.block[ci + (cj + dj) * nx])) continue;
      prev[n] = c; q.push(n);
    }
  }
  if (prev[goal] < 0) return [{ x: tx, z: tz }];
  const pts = []; for (let c = goal; c !== start; c = prev[c]) pts.push({ x: NAV.x0 + (c % nx + .5) * NAV.cell, z: NAV.z0 + (((c / nx) | 0) + .5) * NAV.cell });
  pts.reverse(); const out = pts.filter((p, k) => k % 2 === 1 || k === pts.length - 1); if (!out.length) return [{ x: tx, z: tz }]; out[out.length - 1] = { x: tx, z: tz }; return out;
}
/* крок зомбі шляхом по сітці; якщо щось заважає — ковзає вздовж перешкоди */
function zMove(z, tx, tz, spd, dt) {
  const d = dist2(z.x, z.z, tx, tz); if (d < .25) return 'here';
  if (!z.path || !z.goal || dist2(z.goal.x, z.goal.z, tx, tz) > 1 || (z.repath -= dt) <= 0) { z.path = navPath(z.x, z.z, tx, tz); z.goal = { x: tx, z: tz }; z.repath = 1.2 + Math.random() * .4; }
  while (z.path.length > 1 && dist2(z.x, z.z, z.path[0].x, z.path[0].z) < .4) z.path.shift();
  const w = z.path[0], dw = dist2(z.x, z.z, w.x, w.z); if (dw < .02) return '';
  const s = Math.min(dw, spd * dt), nx = z.x + (w.x - z.x) / dw * s, nz = z.z + (w.z - z.z) / dw * s;
  z.f = Math.atan2(w.x - z.x, w.z - z.z);
  if (!blocked(nx, nz, .3)) { z.x = nx; z.z = nz; z.stk = 0; return ''; }
  if (!blocked(nx, z.z, .3)) { z.x = nx; return ''; }
  if (!blocked(z.x, nz, .3)) { z.z = nz; return ''; }
  // застряг — трохи підштовхнути до центру клітинки шляху й перерахувати
  z.repath = 0; if ((z.stk = (z.stk || 0) + dt) > 1.5) { z.stk = 0; z.x = lerp(z.x, w.x, .5); z.z = lerp(z.z, w.z, .5); return 'stuck'; }
  return '';
}
function updZombies(dt, c) {
  for (let i = ST.zom.length - 1; i >= 0; i--) {
    const z = ST.zom[i];
    if (z.life > 0 && (z.life -= dt) <= 0) { if (z.carry) toFloor(z.carry.it, z.carry.n, z.x, z.z); ST.zom.splice(i, 1); continue; }
    if (z.stun > 0) { z.stun -= dt; continue; }
    z.cd -= dt;
    let tg = null, spd = 1.1;
    if (ST.on && !z.carry && ST.t > GRACE) {   // перші секунди зомбі ще досиджують нараду
      let bd = 1e9;
      for (const p of c) { const h = heldOf(p.name), paper = !!h.it, d = dist2(p.x, p.z, z.x, z.z); if (d < (paper ? 6.5 : 3) && d < bd) { bd = d; tg = p; spd = paper ? 1.8 : 1.3; } }
    }
    if (z.carry) spd = 1.9;
    const w = ZWP[z.wp] || ZWP[0];
    const r = zMove(z, tg ? tg.x : w.x, tg ? tg.z : w.z, spd, dt);
    if (r === 'stuck' || (!tg && r === 'here')) z.wp = Math.floor(Math.random() * ZWP.length);
    if (!ST.on || z.carry || z.cd > 0 || ST.t < GRACE) continue;
    for (const p of c) if (dist2(p.x, p.z, z.x, z.z) < .95) { bump(z, p); break; }
  }
}
function bump(z, p) {
  z.cd = 3;
  const h = heldOf(p.name), a = Math.atan2(p.x - z.x, p.z - z.z);
  let stolen = '';
  if (h.it) { z.carry = { it: h.it, n: h.n }; stolen = h.it; let far = 0, fd = 0; ZWP.forEach((q, i) => { const d = dist2(q.x, q.z, p.x, p.z); if (d > fd) { fd = d; far = i; } }); z.wp = far; }
  const spilled = h.cup ? 1 : 0;
  setHeld(p.name, '', 0, 0);
  emit({ k: 'bump', to: p.name, a: r2(a), st: stolen, sp: spilled, id: z.id }); pushState();
}
function authTick(dt) {
  const c = crew();
  if (!ST.on && !ST.zom.length) { spawnZombie(); spawnZombie(); }
  if (c.length || ST.on) { updBoss(dt, c); updZombies(dt, c); }
  if (!ST.on) { if (SIMSIDE && c.length && (AU.stT -= dt) <= 0) { AU.stT = .3; pushState(); } return; }
  ST.t += dt;
  if (!c.length) { AU.idle += dt; if (AU.idle > (SIMSIDE ? 10 : 3)) endRound(false, 'В офісі нікого не лишилось.'); return; }
  AU.idle = 0;
  // хто вийшов з офісу — його папери лишаються на підлозі біля ресепшну
  if (SIMSIDE) for (const k of Object.keys(ST.held)) { if (c.some(p => p.name === k)) { AU.away[k] = 0; continue; } if ((AU.away[k] = (AU.away[k] || 0) + dt) > 4) { const h = ST.held[k]; if (h.it) toFloor(h.it, h.n, SEND.p.x, SEND.p.z - 1); delete ST.held[k]; } }
  if (!ST.pw && (AU.pwT -= dt) <= 0) { ST.pw = 1; emit({ k: 'msg', txt: '💡 Напруга стабілізувалась — світло повернулось.' }); }
  if (ST.rain) {
    if ((AU.rainT -= dt) <= 0) { ST.rain = 0; emit({ k: 'msg', txt: '💦 Спринклери вимкнулись самі. Мокро, але живі.' }); }
    else if ((AU.dropT -= dt) <= 0) { AU.dropT = 3; for (const p of c) { const h = heldOf(p.name); if (h.it === 'sheets') { setHeld(p.name, h.n > 1 ? 'sheets' : '', h.n - 1, h.cup); toFloor('sheets', 1, p.x + rand(-2.5, 2.5), p.z + rand(-2.5, 2.5)); emit({ k: 'fly', to: p.name }); } } }
  }
  AU.chaosT -= dt;
  if (AU.chaosT <= 0) {
    AU.chaosT = rand(20, 32) * Math.max(.55, 1 - ST.lv * .12);
    const s = cur(), pool = ['power', 'rain', 'meeting', 'boom', 'heat', 'jam'];
    if (s === 'print' || s === 'data') pool.push('jam', 'jam'); if (s === 'scan') pool.push('heat', 'heat'); if (ST.steps.includes('sign') && !ST.coffee) pool.push('boom');
    chaos(pick(pool));
  }
  if (ST.t >= ST.dur) { endRound(false, 'Годинник пробив 18:00 — звіт не здано.'); return; }
  AU.stT -= dt; if (AU.stT <= 0) { AU.stT = .2; pushState(); }
}
A.on('tick', dt => {
  if (AUTH()) authTick(dt);
  else {
    if (ST.on) ST.t += dt;
    const k = Math.min(1, dt * 8);
    for (const z of ST.zom) if (z.tx != null) { z.x = lerp(z.x, z.tx, k); z.z = lerp(z.z, z.tz, k); }
    if (ST.boss.tx != null) { ST.boss.x = lerp(ST.boss.x, ST.boss.tx, k); ST.boss.z = lerp(ST.boss.z, ST.boss.tz, k); }
  }
  if (!SIMSIDE) clientTick(dt);
});

/* ---------- Фізичний світ офісу (і на сервері, і в гравців): стіни, меблі, крісла ---------- */
A.on('world', () => {
  for (const s of WALLS) {
    const len = Math.hypot(s[2] - s[0], s[3] - s[1]), n = Math.max(1, Math.round(len / .6));
    for (let k = 0; k <= n; k++) addStatic(OX + lerp(s[0], s[2], k / n), OZ + lerp(s[1], s[3], k / n), .32, 2.5);
  }
  for (const o of OBS) addStatic(o.x, o.z, o.r, 1.3);
  for (const [x, z] of CHAIRS) addBody('chair', OX + x, OZ + z);
});

/* ======================= ДАЛІ — ЛИШЕ В ГРАВЦЯ ======================= */
const V = { lbl: null, glbl: null, gArrow: null, gMark: null, goal: null, hud: null, list: null, goalEl: null, act: null, joined: false, auto: false, dark: null, music: -1,
  hm: new Map(), zm: new Map(), fm: new Map(), cols: [], boss: null, clock: null, prLight: null, srvLight: null, cmSmoke: null, tickT: 0, lastSec: -1, sendT: 0 };

function neonSign(txt, col, w, h) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = Math.round(1024 * h / w);
  const x = c.getContext && c.getContext('2d');
  if (x && x.fillText) { x.fillStyle = 'rgba(30,20,50,.82)'; x.fillRect(10, 10, c.width - 20, c.height - 20); x.strokeStyle = col; x.lineWidth = 12; x.shadowColor = col; x.shadowBlur = 30; x.strokeRect(14, 14, c.width - 28, c.height - 28); x.font = `bold ${Math.round(c.height * .5)}px sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#FFFFFF'; x.fillText(txt, c.width / 2, c.height / 2 + 6); }
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
}
const ICONS = {};
function iconTex(txt) {
  if (ICONS[txt]) return ICONS[txt];
  const c = document.createElement('canvas'); c.width = c.height = 96;
  const x = c.getContext && c.getContext('2d');
  if (x && x.fillText && txt) { x.fillStyle = '#FFFFFF'; x.beginPath(); x.arc(48, 44, 38, 0, 7); x.fill(); x.beginPath(); x.moveTo(36, 76); x.lineTo(48, 94); x.lineTo(58, 76); x.fill(); x.font = '44px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, 48, 46); }
  return ICONS[txt] = new THREE.CanvasTexture(c);
}
const sprite = (txt, s) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: iconTex(txt), transparent: true, depthWrite: false })); sp.scale.set(s, s, 1); sp.renderOrder = 4; return sp; };

/* ---------- Модель офісу ---------- */
function buildLevel(s) {
  const g = new THREE.Group(); scene.add(g);
  // острів: газон, обрив і скеля
  const top = flat(new THREE.CylinderGeometry(s.r, s.r * .95, .9, 32, 1).translate(0, -.45, 0));
  put(g, mesh(top, s.top, false, true), OX, 0, OZ);
  put(g, mesh(flat(new THREE.CylinderGeometry(s.r * .95, s.r * .86, 1.3, 32, 1).translate(0, -1.55, 0)), '#E8B9A6', false), OX, 0, OZ);
  const cone = new THREE.ConeGeometry(s.r * .86, s.r * 1.2, 32, 2); cone.rotateX(Math.PI); cone.translate(0, -2.2 - s.r * .6, 0);
  put(g, mesh(flat(cone), s.rock, false), OX, 0, OZ);
  // помічники (локальні координати)
  const B = (x, y, z, w, h, d, c, cast = false, recv = false) => put(g, mesh(new THREE.BoxGeometry(w, h, d), c, cast, recv), OX + x, y, OZ + z);
  const C = (x, y, z, rt, rb, h, c, seg = 10) => put(g, mesh(flat(new THREE.CylinderGeometry(rt, rb, h, seg)), c, false), OX + x, y, OZ + z);
  const grp = (x, z, ry) => { const q = new THREE.Group(); q.position.set(OX + x, 0, OZ + z); q.rotation.y = ry || 0; g.add(q); return q; };
  const GB = (q, x, y, z, w, h, d, c) => put(q, mesh(new THREE.BoxGeometry(w, h, d), c, false), x, y, z);
  const plant = (x, z, sc = 1) => { C(x, .25 * sc, z, .26 * sc, .2 * sc, .5 * sc, '#C4956A', 8); put(g, mesh(new THREE.IcosahedronGeometry(.45 * sc, 0), '#5FBF7A', false), OX + x, .85 * sc, OZ + z); put(g, mesh(new THREE.IcosahedronGeometry(.3 * sc, 0), '#7FD99A', false), OX + x + .15 * sc, 1.15 * sc, OZ + z - .1); };
  // офісне крісло: ry=0 — сидить обличчям до +z
  const chair = (x, z, ry, col = '#3E4A7C', big) => {
    const q = grp(x, z, ry), k = big ? 1.25 : 1;
    GB(q, 0, .46, 0, .5 * k, .09, .48 * k, col); GB(q, 0, .8 * k, -.24 * k, .48 * k, .6 * k, .08, col);
    if (big) for (const sx of [-.33, .33]) GB(q, sx, .62, 0, .08, .08, .5, col);
    GB(q, 0, .24, 0, .05, .4, .05, '#4E4A6E');
    for (let a = 0; a < 5; a++) { const l = GB(q, 0, .05, 0, .05, .04, .5, '#4E4A6E'); l.rotation.y = a / 5 * Math.PI * 2; }
    return q;
  };
  const table = (x, z, w, d, top = '#E8E3F0', leg = '#9F98B8', h = .74) => { B(x, h, z, w, .06, d, top, true, true); for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(x + sx * (w / 2 - .08), h / 2, z + sz * (d / 2 - .08), .06, h, .06, leg); };
  const SCR = ['#6BE7FF', '#B07CF0', '#7FE08A', '#FFD27A', '#FF8AD8'];
  const monitor = (x, z, dir, on = true, k = 0) => {
    B(x, .79, z, .24, .03, .16, '#2E2346'); B(x, .93, z, .05, .26, .05, '#2E2346'); B(x, 1.12, z, .74, .44, .05, '#2E2346');
    put(g, mesh(new THREE.BoxGeometry(.66, .36, .01), on ? bulb(SCR[k % SCR.length]) : '#1C1830', false), OX + x, 1.12, OZ + z + dir * .03);
  };
  const keyboard = (x, z) => { B(x, .785, z, .5, .025, .17, '#4E4A6E'); B(x + .38, .785, z, .08, .03, .12, '#4E4A6E'); };
  const sofa = (x, z, w, ry, col) => { const q = grp(x, z, ry); GB(q, 0, .22, 0, w, .3, .85, shade(col, -.1)); GB(q, 0, .45, .05, w - .3, .16, .7, col); GB(q, 0, .7, -.34, w, .55, .2, col); for (const sx of [-1, 1]) GB(q, sx * (w / 2 - .1), .5, 0, .2, .4, .85, shade(col, -.1)); return q; };
  const shelf = (x, z, w, d, h, ry, books) => {
    const q = grp(x, z, ry); GB(q, 0, h / 2, 0, w, h, d, '#8C6A4E');
    for (let r = 0; r < 3; r++) for (let k = 0; k < Math.floor(w / .3); k++) if ((k * 7 + r * 3) % 5) GB(q, -w / 2 + .2 + k * .3, .3 + r * (h / 3), d / 2 + .01, .2, h / 3 - .15, .04, books[(k + r) % books.length]);
    return q;
  };
  const rug = (x, z, w, d, c) => B(x, .06, z, w, .012, d, c, false, true);
  // доріжка до входу, кущі й лавка надворі
  B(0, .03, HZ + 5, 3.2, .05, 10, '#D9D2E8', false, true);
  for (const [x, z] of [[-4, 16.5], [4, 16.5], [-22, -4], [-22, 6], [22, -4], [22, 6], [-10, -17], [10, -17], [-12, 17.5], [12, 17.5]]) { put(g, mesh(new THREE.IcosahedronGeometry(.8, 0), '#5FBF7A', false), OX + x, .55, OZ + z); put(g, mesh(new THREE.IcosahedronGeometry(.55, 0), '#7FD99A', false), OX + x + .4, .85, OZ + z + .2); }
  table(6.5, 17, 2, .5, '#C4956A', '#6E5E96', .45);
  // підлоги: база-коридор + кожна кімната свого кольору
  B(0, .02, 0, 2 * HX, .04, 2 * HZ, '#C9C3DC', false, true);
  B(0, .045, 0, 2 * HX - 1.5, .012, 1.4, '#9F98C8', false, true);              // килимова доріжка коридором
  for (const r of ROOMS) B((r.x0 + r.x1) / 2, .035, (r.z0 + r.z1) / 2, r.x1 - r.x0 - .1, .04, r.z1 - r.z0 - .1, r.fl, false, true);
  for (let i = 0; i < 7; i++) for (let j = 0; j < 6; j++) if ((i + j) % 2) B(5.5 + i, .058, 2.5 + j, 1, .012, 1, '#D8CFC0');    // кухня: шахова плитка
  for (let x = 13; x < HX; x += .8) B(x, .058, 5, .02, .012, 5.9, '#B4CFDC'); for (let z = 2.4; z < 8; z += .8) B(16.25, .058, z, 7.4, .012, .02, '#B4CFDC'); // WC: плитка
  for (let x = -2.4; x < 3; x += .6) B(x, .058, -8, .02, .012, 11.8, '#363B4E'); for (let z = -13.4; z < -2; z += .6) B(0, .058, z, 5.8, .012, .02, '#363B4E'); // серверна: фальшпідлога
  // стіни-розрізи (низькі, щоб камера бачила кімнати); скло — в кабінет начальника й переговорну
  const GLASS = new THREE.MeshStandardMaterial({ color: '#BFE8FF', transparent: true, opacity: .3, roughness: .1, metalness: .2, depthWrite: false });
  for (const [x0, z0, x1, z1, k] of WALLS) {
    const len = Math.hypot(x1 - x0, z1 - z0), hor = z0 === z1, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, L = len + .2;
    if (k === 'g') {
      B(cx, .2, cz, hor ? L : .2, .4, hor ? .2 : L, '#7A6BB0', false, true);
      put(g, new THREE.Mesh(new THREE.BoxGeometry(hor ? L : .06, 1, hor ? .06 : L), GLASS), OX + cx, .9, OZ + cz);
      B(cx, 1.42, cz, hor ? L : .12, .06, hor ? .12 : L, '#4E4A6E');
      for (let t = 0; t <= len; t += 2) B(hor ? x0 + t : cx, .9, hor ? cz : z0 + t, .07, 1.05, .07, '#4E4A6E');
    } else {
      const H = k === 'o' ? 1.3 : 1.1;
      B(cx, H / 2, cz, hor ? L : .2, H, hor ? .2 : L, k === 'o' ? '#E3DBF5' : '#F6F2FF', true, true);
      B(cx, H + .04, cz, hor ? L + .04 : .26, .08, hor ? .26 : L + .04, k === 'o' ? '#6E5FA8' : '#9F8BE0');
      B(cx, .06, cz, hor ? L : .24, .12, hor ? .24 : L, '#8C84B0');               // плінтус
    }
  }
  // таблички над дверима
  const sign = (txt, col, x, z, w) => { w = w || Math.max(1.6, txt.length * .19 + .5); const n = neonSign(txt, col, w, .48); n.position.set(OX + x, 1.85, OZ + z); g.add(n); for (const sx of [-w / 2 + .15, w / 2 - .15]) B(x + sx, 1.45, z - .02, .05, .5, .05, '#4E4A6E'); };
  for (const r of ROOMS) if (r.dx != null) sign(r.n, r.c, r.dx, r.dz + .15, r.w);
  sign('ОПЕНСПЕЙС', '#5CC8FF', -9.25, CZ + .15); sign('ЗОНА ВІДПОЧИНКУ', '#FF8A7A', 5, 11); sign('СКЛАД', '#B8B2C8', 12.5, 11); 
  const big = neonSign('ДЕДЛАЙН · 18:00', '#FF5C7A', 6, 1); big.position.set(OX, 2.6, OZ + HZ + .15); g.add(big);
  for (const sx of [-2.8, 2.8]) B(sx, 2, HZ + .15, .08, 1.4, .08, '#4E4A6E');

  /* --- ОПЕНСПЕЙС: ряди столів, монітор + клавіатура + крісло на кожному --- */
  rug(-12.5, 8.2, 14, 11, '#7489BC');
  ALLDESK.forEach((a, k) => {
    const d = DESKS.find(q => q.x === OX + a.lx && q.z === OZ + a.lz);
    table(a.lx, a.lz, 1.6, .8, '#EDE8F5', '#9F98B8');
    B(a.lx, 1.0, a.lz - .42, 1.6, .5, .05, '#7FB8A8');                            // низька перегородка
    monitor(a.lx, a.lz - .15, 1, !!d, k); keyboard(a.lx, a.lz + .15);
    B(a.lx + .55, .8, a.lz + .1, .3, .02, .22, '#FFFFFF');                         // папери
    if (!d) { chair(a.lx + .2, a.lz + .85, Math.PI + .4, '#5E6FD8'); C(a.lx - .5, .83, a.lz, .05, .04, .12, '#FFFFFF', 8); return; }
    chair(a.lx, a.lz + .78, Math.PI, '#5E6FD8');
    const h = buildOffice(pick(['#F3C9A8', '#E6C9B0', '#D9C7A9', '#F0D2B6']), pick(['#5A6BB5', '#C2335A', '#3E4A7C', '#7A5BC9', '#2F8F7A', '#E07A3C']));
    h.root.position.set(d.x, .12, d.z + .72); h.root.rotation.y = Math.PI;
    h.l1.rotation.x = h.l2.rotation.x = -1.4; h.body.position.y = -.3; h.aR.rotation.x = h.aL.rotation.x = -1.1;
    scene.add(A.dynamic(h.root));
    const icon = sprite('📄', .8); icon.position.set(d.x, 2.25, d.z + .72); scene.add(A.dynamic(icon));
    V.cols[d.i] = { h, icon, ent: { x: d.x, z: d.z + .72, y: 0, bh: 2 } };
  });
  plant(-19.2, 2.8); plant(-19.2, 13.2); plant(-5.8, 13.2, 1.2);
  { const q = grp(-19.75, 8.2, Math.PI / 2); GB(q, 0, 1.3, 0, 3, 1.1, .05, '#FFFFFF'); for (let k = 0; k < 6; k++) GB(q, -1.1 + k * .45, 1.3 + (k % 2) * .25, .04, .3, .22, .02, ['#FFE066', '#FF8AD8', '#7FE08A'][k % 3]); }   // дошка зі стікерами
  /* --- РЕСЕПШН: стійка (СТАРТ), лоток «Відправка», диван для гостей --- */
  rug(0, 10.5, 6, 5, '#D9CFF0');
  B(START.l.x, .52, START.l.z, 2.8, 1.04, .8, '#7A5BC9', true, true); B(START.l.x, 1.07, START.l.z + .1, 3, .06, 1, '#FFFFFF'); B(START.l.x, .5, START.l.z + .41, 2.8, .6, .02, '#B07CF0');
  monitor(START.l.x - .6, START.l.z - .2, -1);
  { const h = buildOffice('#F0D2B6', '#FF8AD8'); h.root.position.set(START.o.x, 0, START.o.z - .85); scene.add(A.dynamic(h.root)); V.recep = h; }
  C(START.l.x + .8, 1.15, START.l.z + .25, .08, .18, .14, '#FFD27A');                                   // дзвоник
  const ss = neonSign('▶ СТАРТ', '#7FE08A', 1.5, .4); ss.position.set(START.o.x, 1.55, START.o.z + .45); g.add(ss);
  B(SEND.l.x, .5, SEND.l.z, 1.2, 1, .7, '#5B3E9A', true, true);
  for (let k = 0; k < 3; k++) { B(SEND.l.x, 1.06 + k * .16, SEND.l.z, .7, .03, .5, '#FFD27A'); for (const sx of [-.33, .33]) B(SEND.l.x + sx, 1.1 + k * .16, SEND.l.z, .03, .1, .5, '#FFD27A'); }
  const out = neonSign('📤 ВІДПРАВКА', '#FFD27A', 1.8, .4); out.position.set(SEND.o.x, 1.75, SEND.o.z + .4); g.add(out);
  sofa(-4.4, 11.5, 2.4, Math.PI / 2, '#B07CF0'); table(-3.3, 11.5, .7, 1.2, '#FFFFFF', '#9F98B8', .4);
  plant(-4.3, 13.3); plant(4.3, 13.3); plant(4.3, 2.7, .9);
  C(4.3, .5, 5.6, .22, .22, 1, '#E8E3F0'); C(4.3, 1.2, 5.6, .18, .2, .45, '#8FD9FF');                       // кулер
  /* --- КОРИДОР: годинник, щиток, вогнегасник --- */
  B(PANEL.l.x, .9, PANEL.l.z, .25, 1, .8, '#8E86B0'); put(g, mesh(new THREE.BoxGeometry(.05, .3, .3), bulb('#FFE066'), false), PANEL.o.x - .14, 1, PANEL.o.z);
  C(-19.6, .35, 1.4, .12, .12, .7, '#E8505B'); plant(-19.3, -1.3, .8); plant(11, 1.3, .8);
  {
    const c = new THREE.Group(); c.position.set(CLOCK.x, 2.45, CLOCK.z + .14); scene.add(A.dynamic(c));
    put(c, mesh(flat(new THREE.CylinderGeometry(1.15, 1.15, .14, 28)), '#FFFFFF', false), 0, 0, 0).rotation.x = Math.PI / 2;
    put(c, mesh(new THREE.TorusGeometry(1.15, .09, 6, 28), '#2E2346', false), 0, 0, .02);
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; put(c, mesh(new THREE.BoxGeometry(k % 3 ? .05 : .1, k % 3 ? .14 : .24, .03), '#2E2346', false), Math.sin(a) * .95, Math.cos(a) * .95, .08).rotation.z = -a; }
    const hand = (len, w, col, z) => { const p = new THREE.Group(); p.position.z = z; c.add(p); put(p, mesh(new THREE.BoxGeometry(w, len, .03), col, false), 0, len / 2 - .08, 0); return p; };
    V.clock = { g: c, h: hand(.55, .09, '#2E2346', .1), m: hand(.85, .06, '#2E2346', .12), s: hand(.9, .025, '#E8505B', .14) };
    put(c, mesh(flat(new THREE.CylinderGeometry(.07, .07, .05, 10)), '#E8505B', false), 0, 0, .16).rotation.x = Math.PI / 2;
    B(CLOCK.x - OX, 1.25, CLOCK.z - OZ, .12, .5, .12, '#4E4A6E');
  }
  /* --- КАБІНЕТ НАЧАЛЬНИКА: великий стіл, шкіряне крісло, архів, книги, диван --- */
  rug(-15.5, -9.6, 4.6, 3.4, '#8C2F4A');
  table(BOSS_DESK.x - OX, BOSS_DESK.z - OZ, 2.6, 1.1, '#6B4A3A', '#4A3328');
  B(-15.5, .42, -9.78, 2.5, .62, .05, '#5A3D30');
  monitor(-16.4, -10.5, -1); B(-14.7, .8, -10.2, .4, .03, .3, '#2E2346');
  B(-15.5, .86, -9.85, .6, .12, .05, '#FFD27A');                                       // табличка «Начальник»
  chair(-15.5, -12.5, 0, '#3A2A2A', true);
  chair(-16.2, -8.8, Math.PI, '#7A5BC9'); chair(-14.8, -8.8, Math.PI, '#7A5BC9');
  shelf(-17.2, -13.55, 3, .6, 1.8, 0, ['#C2335A', '#3E6BD8', '#FFD27A', '#2F8F7A']);
  B(ARCHIVE.l.x, .8, ARCHIVE.l.z, .8, 1.6, 2, '#8C6A4E', true, true);
  for (let k = 0; k < 4; k++) for (const dz of [-.5, .5]) { B(ARCHIVE.l.x + .41, .25 + k * .38, ARCHIVE.l.z + dz, .03, .3, .85, '#C4A27A'); B(ARCHIVE.l.x + .44, .3 + k * .38, ARCHIVE.l.z + dz, .03, .04, .2, '#4E4A6E'); }
  sofa(-11.55, -7.5, 2.4, -Math.PI / 2, '#3A2A2A');
  plant(-12, -13.2, 1.2); plant(-19.3, -3, 1); plant(-19.3, -12.8, 1);
  /* --- ПЕРЕГОВОРНА: довгий стіл, крісла, телевізор, дошка --- */
  table(-7, -9.2, 1.8, 6, '#F4F0FF', '#9F98B8');
  for (const z of [-11.2, -9.7, -8.2, -6.7]) { chair(-8.35, z, Math.PI / 2, '#FFB35C'); chair(-5.65, z, -Math.PI / 2, '#FFB35C'); }
  chair(-7, -12.65, 0, '#FFB35C');
  for (const [x, z] of [[-7.4, -10.5], [-6.6, -8.9], [-7.3, -7.4]]) B(x, .8, z, .36, .025, .26, '#4E4A6E');
  for (const z of [-11, -9.4, -7.9]) C(-7.1, .86, z, .05, .05, .2, '#8FD9FF', 6);
  B(-7, .3, -13.6, 2.2, .6, .5, '#4E4A6E'); B(-7, 1.3, -13.62, 2.4, 1.2, .08, '#2E2346');
  put(g, mesh(new THREE.BoxGeometry(2.2, 1.05, .01), bulb('#6BE7FF'), false), OX - 7, 1.3, OZ - 13.57);
  for (let k = 0; k < 5; k++) B(-7.8 + k * .4, 1.05 + (k * 37 % 5) * .1, -13.55, .22, .2 + (k * 37 % 5) * .2, .01, '#FF5C7A');   // графік продажів (падає)
  { const q = grp(-10.4, -9.2, Math.PI / 2); GB(q, 0, 1.15, 0, 2.2, 1.1, .05, '#FFFFFF'); GB(q, 0, 1.15, -.04, 2.3, 1.2, .03, '#9F98B8'); for (let k = 0; k < 4; k++) GB(q, -.6 + k * .4, 1.3 - k * .1, .03, .3, .03, .01, '#3E6BD8'); for (const sx of [-1, 1]) GB(q, sx * 1, .3, 0, .05, .6, .05, '#9F98B8'); }
  plant(-10.4, -13.2); plant(-3.6, -13.2);
  /* --- СЕРВЕРНА: стійки, кондиціонер, сканер --- */
  const racks = [[-1.5, -12.9], [1.5, -12.9], [-1.5, -9.4], [1.5, -9.4]];
  for (const [x, z] of racks) {
    B(x, .9, z, 1.4, 1.8, 1, '#2E2346', true, true);
    for (let k = 0; k < 10; k++) put(g, mesh(new THREE.BoxGeometry(.1, .05, .02), bulb(k % 3 ? '#7FE08A' : '#6BE7FF'), false), OX + x - .45 + (k % 5) * .22, .45 + Math.floor(k / 5) * .7, OZ + z + .51);
  }
  V.fan = new THREE.Mesh(new THREE.BoxGeometry(.1, .6, .02), mat('#8E86B0')); V.fan.position.set(RACK.o.x, 1.35, RACK.o.z + .53); scene.add(A.dynamic(V.fan));
  put(g, mesh(new THREE.TorusGeometry(.34, .04, 6, 16), '#6BE7FF', false), RACK.o.x, 1.35, RACK.o.z + .52);
  V.srvLight = new THREE.Mesh(new THREE.BoxGeometry(1.42, .08, 1.02), new THREE.MeshStandardMaterial({ color: '#6BE7FF', emissive: '#6BE7FF', emissiveIntensity: 1 })); V.srvLight.position.set(RACK.o.x, 1.84, RACK.o.z); scene.add(A.dynamic(V.srvLight));
  B(-2.6, .8, -5.5, .5, 1.6, 1.4, '#E8E3F0', true); for (let k = 0; k < 5; k++) B(-2.33, .6 + k * .2, -5.5, .02, .04, 1.2, '#9F98B8');
  for (const x of [-1.5, 1.5]) B(x, 1.95, -11.15, .3, .05, 2.6, '#4E4A6E');            // кабельні лотки
  table(SCANNER.l.x, SCANNER.l.z, .9, 1.4, '#D9D2F0');
  B(SCANNER.l.x, .88, SCANNER.l.z, .6, .18, .8, '#4E4A6E'); put(g, mesh(new THREE.BoxGeometry(.5, .02, .7), bulb('#6BE7FF'), false), SCANNER.o.x, .98, SCANNER.o.z);
  /* --- БУХГАЛТЕРІЯ: головна бухгалтерка з печаткою, столи, шафи, сейф --- */
  rug(7.5, -9.3, 4, 3, '#7FA88E');
  table(STAMP.l.x, STAMP.l.z, 1.8, .9, '#C9B8F0', '#8C84B0');
  C(STAMP.l.x - .1, .9, STAMP.l.z + .1, .1, .12, .2, '#C2335A'); B(STAMP.l.x + .35, .79, STAMP.l.z + .1, .3, .03, .22, '#3E3A5C'); B(STAMP.l.x - .55, .79, STAMP.l.z, .3, .02, .4, '#FFFFFF');
  B(STAMP.l.x + .6, .8, STAMP.l.z - .2, .2, .04, .26, '#2E2346');                         // калькулятор
  monitor(STAMP.l.x - .55, STAMP.l.z - .3, -1);
  chair(STAMP.l.x, STAMP.l.z - .85, 0, '#2F8F7A');
  { const h = buildOffice('#E6C9B0', '#2F8F7A'); h.root.position.set(STAMP.o.x, .12, STAMP.o.z - .8); h.l1.rotation.x = h.l2.rotation.x = -1.4; h.body.position.y = -.3; scene.add(A.dynamic(h.root)); V.acc = h; }
  for (const x of [4.9, 10.1]) {
    table(x, -12.3, 1.6, .8, '#C9B8F0', '#8C84B0'); monitor(x, -12.45, 1, true, x > 6 ? 2 : 3); keyboard(x, -12.1); chair(x, -11.5, Math.PI, '#2F8F7A');
    const h = buildOffice(pick(['#F3C9A8', '#D9C7A9']), pick(['#2F8F7A', '#5A6BB5'])); h.root.position.set(OX + x, .12, OZ - 11.55); h.root.rotation.y = Math.PI; h.l1.rotation.x = h.l2.rotation.x = -1.4; h.body.position.y = -.3; h.aR.rotation.x = h.aL.rotation.x = -1.1; scene.add(A.dynamic(h.root));
  }
  B(11.55, .65, -5.5, .7, 1.3, 3, '#9F98B8', true, true); for (let k = 0; k < 3; k++) for (let j = 0; j < 4; j++) B(11.19, .25 + j * .3, -6.5 + k, .02, .22, .8, '#C9C3DC');
  B(3.7, .45, -13.3, .8, .9, .8, '#5E6478', true); C(3.7, .55, -12.88, .12, .12, .04, '#FFD27A', 8).rotation.x = Math.PI / 2;
  plant(11.4, -13.2); plant(3.6, -2.7, .8);
  /* --- КОПІЦЕНТР: великий принтер, ще один, папір, степлер --- */
  B(PRINTER.l.x, .55, PRINTER.l.z, 1.4, 1.1, 1.2, '#E8E3F0', true, true); B(PRINTER.l.x, 1.18, PRINTER.l.z, 1.3, .16, 1.1, '#4E4A6E');
  B(PRINTER.l.x, .85, PRINTER.l.z + .75, .9, .05, .4, '#FFFFFF'); for (let k = 0; k < 3; k++) B(PRINTER.l.x, .25 + k * .25, PRINTER.l.z + .61, 1.2, .02, .02, '#9F98B8');
  V.prLight = new THREE.Mesh(new THREE.BoxGeometry(.3, .14, .06), new THREE.MeshStandardMaterial({ color: '#7FE08A', emissive: '#7FE08A', emissiveIntensity: 1 })); V.prLight.position.set(PRINTER.o.x + .45, 1.0, PRINTER.o.z + .62); scene.add(A.dynamic(V.prLight));
  B(13.5, .5, -12.9, 1.1, 1, 1.1, '#D9D2F0', true); B(13.5, 1.05, -12.9, 1, .1, 1, '#4E4A6E');
  shelf(12.85, -7, 3, .6, 1.6, Math.PI / 2, ['#FFFFFF', '#F4F0FF', '#FFE066']);
  table(STAPLER.l.x, STAPLER.l.z, .9, 1.6, '#D9D2F0'); B(STAPLER.l.x, .82, STAPLER.l.z, .1, .1, .32, '#E8505B'); B(STAPLER.l.x, .8, STAPLER.l.z + .45, .3, .06, .4, '#FFFFFF');
  for (let k = 0; k < 6; k++) B(18.6 + (k % 2) * .55, .25 + Math.floor(k / 2) * .48, -12.9, .5, .46, .7, '#C4956A');
  C(19.3, .35, -3, .25, .22, .7, '#3E6BD8', 8);
  /* --- КУХНЯ: стільниця, кавоварка, мийка, холодильник, стіл; вентиль спринклерів --- */
  B(7.8, .45, 7.55, 4.8, .9, .8, '#E8E3F0', true, true); B(7.8, .92, 7.55, 4.9, .05, .85, '#FFFFFF');
  for (let k = 0; k < 6; k++) B(5.8 + k * .8, .45, 7.14, .7, .7, .02, '#D6D1E6');
  B(6, .95, 7.55, .6, .02, .45, '#9FB4C9'); C(6, 1.1, 7.85, .03, .03, .3, '#9F98B8', 6);
  B(COFFEE.l.x, 1.35, COFFEE.l.z, .65, .8, .6, '#2E2346'); put(g, mesh(new THREE.BoxGeometry(.4, .2, .05), bulb('#FF6BD6'), false), COFFEE.o.x, 1.5, COFFEE.o.z - .31);
  C(COFFEE.l.x, 1.02, COFFEE.l.z - .35, .07, .05, .12, '#FFFFFF', 8);
  B(9.6, 1.12, 7.6, .7, .38, .45, '#4E4A6E');                                              // мікрохвильовка
  B(11.9, .95, 2.75, .9, 1.9, .9, '#F4F0FF', true, true); B(11.43, 1.2, 2.75, .03, .5, .06, '#9F98B8'); B(11.44, .95, 2.75, .02, .02, .85, '#C9C3DC');
  C(10.4, .74, 4.6, .75, .75, .06, '#FFB3C7', 16); C(10.4, .37, 4.6, .08, .12, .74, '#9F98B8', 8);
  for (const a of [0, 2.1, 4.2]) C(10.4 + Math.sin(a) * 1.05, .45, 4.6 + Math.cos(a) * 1.05, .22, .2, .06, '#7A5BC9', 10);
  C(VALVE.l.x, .75, VALVE.l.z, .06, .06, 1.5, '#C2335A', 6); put(g, mesh(new THREE.TorusGeometry(.2, .05, 6, 12), '#E8505B', false), VALVE.o.x + .12, 1.2, VALVE.o.z).rotation.y = Math.PI / 2;
  C(5.5, .3, 6.6, .2, .18, .6, '#5E6478', 8);
  /* --- ЗОНА ВІДПОЧИНКУ: диван, крісло, кавовий столик, ТБ, пуф --- */
  rug(7.8, 11.4, 5, 4, '#F0C9A0');
  sofa(7.8, 13.4, 3.6, Math.PI, '#5CC8FF'); sofa(11.6, 13.2, 1, Math.PI, '#FF8A7A');
  C(7.8, .4, 11.6, .55, .55, .06, '#FFFFFF', 14); C(7.8, .2, 11.6, .08, .1, .4, '#9F98B8', 6); C(7.6, .48, 11.5, .06, .05, .1, '#FFFFFF', 8);
  B(7.5, .25, 8.4, 2, .5, .4, '#4E4A6E'); B(7.5, 1, 8.42, 1.8, .95, .06, '#2E2346'); put(g, mesh(new THREE.BoxGeometry(1.65, .82, .01), bulb('#B07CF0'), false), OX + 7.5, 1, OZ + 8.46);
  put(g, mesh(new THREE.IcosahedronGeometry(.48, 1), '#FFD27A', false), OX + 6, .35, OZ + 9.5).scale.y = .7;
  plant(5.6, 13.3, 1.1); plant(12, 9.4, .9);
  /* --- WC: кабінки, раковини --- */
  for (const x of [12.95, 15.3, 17.65, 19.95]) B(x, .7, 7.2, .06, 1.3, 1.4, '#B8D8E6');
  for (const x of [14.1, 16.45, 18.8]) { B(x, .7, 6.5, 1.9, 1.2, .05, '#8FC3D9'); C(x, .25, 7.5, .22, .18, .5, '#FFFFFF', 10); B(x, .6, 7.85, .45, .4, .15, '#FFFFFF'); }
  B(12.85, .42, 4.3, .5, .84, 2.6, '#E8E3F0', true); for (const z of [3.5, 5.1]) { C(12.9, .87, z, .18, .14, .06, '#FFFFFF', 10); C(12.7, .98, z, .02, .02, .2, '#9F98B8', 6); }
  B(12.62, 1.35, 4.3, .03, .7, 2.2, '#DDF3FF');
  /* --- СКЛАД: стелажі, коробки, відро зі шваброю --- */
  shelf(19.6, 11, 5, .6, 1.8, -Math.PI / 2, ['#C4956A', '#A97A50', '#FFFFFF']);
  shelf(16, 13.6, 5, .6, 1.8, Math.PI, ['#C4956A', '#E8E3F0', '#A97A50']);
  for (let k = 0; k < 5; k++) B(14.2 + (k % 2) * .5 - .25, .22 + Math.floor(k / 2) * .42, 9.3 + (k % 3) * .1, .5, .42, .5, '#C4956A');
  C(17, .2, 9.6, .25, .2, .4, '#FFD27A', 8); C(17.1, .9, 9.6, .025, .025, 1.4, '#9F98B8', 4);
  // начальник
  V.boss = buildManager(); V.boss.ent = { x: ST.boss.x, z: ST.boss.z, y: 0, bh: 2.6 }; scene.add(A.dynamic(V.boss.root));
  return g;
}

/* ---------- Предмети в руках (видно й друзям) ---------- */
function itemMesh(it, n, cup) {
  const g = new THREE.Group();
  if (it === 'sheets') for (let k = 0; k < Math.min(6, n); k++) { const p = put(g, mesh(new THREE.BoxGeometry(.42, .02, .3), '#FFFFFF', false), 0, k * .03, 0); p.rotation.y = (k % 2 ? .12 : -.1); }
  if (it === 'report') { put(g, mesh(new THREE.BoxGeometry(.46, .08, .34), '#3E6BD8', false), 0, .02, 0); put(g, mesh(new THREE.BoxGeometry(.3, .01, .12), '#FFFFFF', false), 0, .065, 0); }
  if (cup) { put(g, mesh(flat(new THREE.CylinderGeometry(.08, .06, .18, 10)), '#FFFFFF', false), .38, .05, -.05); put(g, mesh(flat(new THREE.CylinderGeometry(.07, .07, .02, 10)), '#8C5A3C', false), .38, .15, -.05); }
  g.position.set(0, 1.12, .48); return g;
}
function rootOf(k) {
  if (k === myKey()) return hero || null;
  for (const id in NET.players) { const r = NET.players[id]; if (r && r.name === k && r.h) return r.h; }
  return null;
}
function syncHeld() {
  const seen = new Set();
  for (const [k, h] of Object.entries(ST.held)) {
    const hh = rootOf(k), root = hh && (hh.root || hh); if (!root) continue;
    seen.add(k);
    const sig = h.it + h.n + '|' + h.cup, o = V.hm.get(k);
    if (!o || o.sig !== sig || o.root !== root) { if (o && o.g.parent) o.g.parent.remove(o.g); const g = itemMesh(h.it, h.n, h.cup); root.add(g); V.hm.set(k, { g, sig, root }); }
    if (hh.aR) { hh.aR.rotation.x = -1.3; if (h.it) hh.aL.rotation.x = -1.3; }
  }
  for (const [k, o] of V.hm) if (!seen.has(k)) { if (o.g.parent) o.g.parent.remove(o.g); V.hm.delete(k); }
}

/* ---------- Події ---------- */
function onEvent(e) {
  if (SIMSIDE || !e) return;
  const here = running && inOffice(pl.x, pl.z), me = e.who === myKey() || e.to === myKey(), nm = e.who && e.who !== 'me' ? escapeHTML(e.who) : 'Ти';
  if (e.k === 'msg') { if (here) { if (e.big) banner(e.txt); else toast(e.txt); } }
  else if (e.k === 'take') { const d = DESKS[e.i]; if (d && here) { ftext(d.x, 2.4, d.z, '📄 +1', 'gold'); bubble(V.cols[e.i].ent, pick(['Ось мої цифри!', 'Тримай, тільки не загуби', 'Я це вчора мав здати…', 'Удачі з принтером!']), false, 2); sfx('page', d.x, d.z); } }
  else if (e.k === 'pick') { if (me) sfx('pick'); }
  else if (e.k === 'brewed') { if (me) { ftext(pl.x, 2.5, pl.z, '☕ Кава для начальника!', 'gold'); sfx('pour'); } }
  else if (e.k === 'coffee') { if (here) { bubble(V.boss.ent, 'О, кава! Тепер можна й підписати.', false, 2.6); sfx('drink'); } }
  else if (e.k === 'step') {
    if (!here) return;
    const S = STEPS[e.done], N = STEPS[e.next];
    toast(`✅ ${S ? S.ic + ' ' + S.n : ''}${e.who && e.who !== 'me' && e.who !== myKey() ? ' — ' + escapeHTML(e.who) : ''}${N ? `<br>Далі: ${N.ic} <b>${N.n}</b>` : ''}`); sfx('ding');
    if (e.done === 'print') { burst(PRINTER.o.x - .7, 1.1, PRINTER.o.z, '#FFFFFF', 14, 2, .8, 2); }
    if (e.done === 'sign') bubble(V.boss.ent, 'Підписав. А тепер — бігом!', false, 2.4);
    if (e.done === 'stamp') { burst(STAMP.o.x, 1, STAMP.o.z, '#C2335A', 10, 2, .5, 2); sfx('staple'); }
    if (e.done === 'staple') sfx('staple');
  }
  else if (e.k === 'chaos') {
    if (!here) return;
    banner(CHAOS[e.w] || '⚠️'); sfx('warn');
    if (e.w === 'boom') {
      if (typeof boomFX === 'function') boomFX(COFFEE.o.x, COFFEE.o.z, 2.6, 1.2); else burst(COFFEE.o.x, 1.2, COFFEE.o.z, '#8C5A3C', 20, 5, .8, 4);
      sfx('boom'); shake = Math.max(shake, .6);
      const d = dist2(pl.x, pl.z, COFFEE.o.x, COFFEE.o.z); if (d < 3.5) knockMe(Math.atan2(pl.x - COFFEE.o.x, pl.z - COFFEE.o.z), 14, 'Бабах! Кава всюди!');
    }
    if (e.w === 'jam') burst(PRINTER.o.x, 1.4, PRINTER.o.z, '#FFFFFF', 12, 3, .7, 3);
    if (e.w === 'meeting') bubble(V.boss.ent, 'Усі на нараду! Терміново!', true, 3);
  }
  else if (e.k === 'fixed') { if (here) { toast(`🔧 ${{ jam: 'Папір із принтера витягли', cm: 'Кавоварку полагодили', heat: 'Сервер охолодили', power: 'Світло увімкнули', rain: 'Спринклери вимкнули' }[e.w] || 'Полагоджено'}${e.who && e.who !== 'me' && e.who !== myKey() ? ' — ' + nm : ''}!`); sfx('equip'); } }
  else if (e.k === 'bump') {
    if (e.to === myKey() && running && !pl.dead) {
      knockMe(+e.a || 0, 11, pick(['Ой! Нарада!', 'Штовхнули!', 'Обережно!']));
      shake = Math.max(shake, .35); sfx('hurt');
      if (e.st) toast(`🧟 Зомбі-офісник поцупив у тебе ${ITEM[e.st] ? ITEM[e.st].ic + ' ' + ITEM[e.st].n : 'папери'}! Наздожени його й натисни <b>F</b>.`);
      if (e.sp) { ftext(pl.x, 2.6, pl.z, 'Кава розлилась! 💦', 'bad'); burst(pl.x, 1.2, pl.z, '#8C5A3C', 10, 3, .6, 2); }
    } else if (here && e.st) toast(`🧟 Зомбі вкрав ${ITEM[e.st].ic} у ${escapeHTML(e.to)}!`);
    const z = ST.zom.find(q => q.id === e.id), v = z && V.zm.get(z.id); if (v && here) bubble(v.ent, pick(['Це обговоримо на нараді!', 'Синергія!', 'Давайте синхронізуємось!', 'Мммозок… тобто KPI!']), true, 2);
  }
  else if (e.k === 'shoo') { if (here) { ftext(+e.x, 2.6, +e.z, 'Це можна було листом!', 'gold'); const v = V.zm.get(e.id); if (v) bubble(v.ent, 'Ой… піду на нараду…', false, 2); sfx('hit', +e.x, +e.z); } }
  else if (e.k === 'fly') { if (e.to === myKey()) { ftext(pl.x, 2.6, pl.z, 'Папірець полетів! 📄💨', 'bad'); burst(pl.x, 1.6, pl.z, '#FFFFFF', 8, 3, .8, 2); } }
  else if (e.k === 'end') finish(e);
}
function finish(e) {
  const was = V.joined || inOffice(pl.x, pl.z); V.joined = false; V.act = null;
  if (!was || !running) return;
  const win = !!e.win, left = Math.max(0, +e.left || 0), fx = Math.max(0, e.fx | 0);
  const stars = win ? (left >= 90 ? 3 : left >= 40 ? 2 : 1) : 0;
  const coins = win ? 50 + stars * 25 + Math.min(10, fx) * 5 : 10 + (e.done | 0) * 3, xp = win ? 120 + stars * 20 : 30;
  P.coins += coins; addXP(xp);
  const d = A.data(); d.rounds = (d.rounds || 0) + 1; if (win) { d.wins = (d.wins || 0) + 1; d.best = Math.max(d.best || 0, Math.round(left)); } d.stars = Math.max(d.stars || 0, stars); d.fixes = (d.fixes || 0) + fx;
  const mm = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  banner(win ? `📤 Звіт здано о ${clockStr(ST.dur - left)}! ${'⭐'.repeat(stars)} Запас: ${mm(left)}` : `🕕 ${e.why || '18:00 — дедлайн зірвано.'}`);
  toast(`${win ? '🎉 Квартальний звіт прийнято!' : '😩 Начальник незадоволений.'} Нагорода: <b>+${coins} 🪙</b> · +${xp} досвіду. Ще раунд — <b>▶ СТАРТ</b> на ресепшні (F).`);
  sfx(win ? 'level' : 'hurt'); refreshHUD(); save();
}
const clockStr = t => { const s = 17 * 3600 + 55 * 60 + Math.floor(Math.max(0, t)); return `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };

/* ---------- Кожен кадр ---------- */
function clientTick(dt) {
  const t = gameTime;
  syncHeld();
  // колеги з даними махають, над головою 📄
  for (const [i, c] of V.cols.entries()) { if (!c) continue; const has = ST.on && ST.desk[i]; c.icon.visible = !!has; if (has) { c.icon.position.y = 2.25 + Math.sin(t * 3 + i) * .08; c.h.aR.rotation.x = -2.4 + Math.sin(t * 6 + i) * .4; } else c.h.aR.rotation.x = -1.1 + Math.sin(t * 9 + i) * .08; }
  // начальник
  if (V.boss) {
    const B = ST.boss, h = V.boss, mv = B.at === 'walk';
    h.root.position.set(B.x, 0, B.z); h.root.rotation.y = lerpAng(h.root.rotation.y, B.f, Math.min(1, dt * 8));
    const sw = mv ? Math.sin(t * 8) * .5 : 0; h.l1.rotation.x = sw; h.l2.rotation.x = -sw;
    V.boss.ent.x = B.x; V.boss.ent.z = B.z;
    if (ST.on && ST.steps.includes('sign') && ST.steps.indexOf('sign') >= ST.si && !ST.coffee && Math.random() < dt * .12 && inOffice(pl.x, pl.z)) bubble(V.boss.ent, pick(['Хто бачив мою каву?!', 'Без кави нічого не підписую!', 'Звіт до шостої! І кави!']), true, 2.2);
    if (B.at === 'meeting' && Math.random() < dt * .08 && inOffice(pl.x, pl.z)) bubble(V.boss.ent, pick(['Я на нараді!', 'Синергія, колеги!', 'Хто записує?']), false, 2);
  }
  // зомбі-офісники
  const seen = new Set();
  for (const z of ST.zom) {
    seen.add(z.id);
    let v = V.zm.get(z.id);
    if (!v) { const h = buildOffice(pick(['#9FC29A', '#A8C2A2', '#B5CFA0']), pick(['#8291B8', '#7C8AA8', '#8C84A8', '#6E5E96'])); scene.add(h.root); v = { h, ent: { x: z.x, z: z.z, y: 0, bh: 2.3 }, carry: '', cm: null }; V.zm.set(z.id, v); h.root.position.set(z.x, 0, z.z); }
    const h = v.h; v.ent.x = z.x; v.ent.z = z.z;
    h.root.position.x = z.x; h.root.position.z = z.z; h.root.rotation.y = lerpAng(h.root.rotation.y, z.f || 0, Math.min(1, dt * 6));
    if (z.stun > 0) { h.body.position.y = lerp(h.body.position.y, -.45, Math.min(1, dt * 6)); h.l1.rotation.x = h.l2.rotation.x = -1.4; h.aR.rotation.x = h.aL.rotation.x = -.3; }
    else { h.body.position.y = lerp(h.body.position.y, 0, Math.min(1, dt * 6)); const sw = Math.sin(t * 6 + z.id) * .5; h.l1.rotation.x = sw; h.l2.rotation.x = -sw; h.aR.rotation.x = h.aL.rotation.x = -1.45 + Math.sin(t * 3 + z.id) * .1; }
    const cs = z.carry ? z.carry.it + z.carry.n : '';
    if (cs !== v.carry) { v.carry = cs; if (v.cm) { h.root.remove(v.cm); v.cm = null; } if (z.carry) { v.cm = itemMesh(z.carry.it, z.carry.n, 0); h.root.add(v.cm); } }
  }
  for (const [id, v] of V.zm) if (!seen.has(id)) { scene.remove(v.h.root); V.zm.delete(id); }
  // папери на підлозі
  const fs = new Set();
  for (const f of ST.floor) {
    fs.add(f.id); let m = V.fm.get(f.id);
    if (!m) { m = itemMesh(f.it, f.n, 0); m.position.set(f.x, .1, f.z); scene.add(m); V.fm.set(f.id, m); }
    m.position.set(f.x, .12 + Math.abs(Math.sin(t * 3 + f.id)) * .12, f.z); m.rotation.y += dt;
  }
  for (const [id, m] of V.fm) if (!fs.has(id)) { scene.remove(m); V.fm.delete(id); }
  // годинник
  if (V.clock) {
    const s = 17 * 3600 + 55 * 60 + (ST.on ? ST.t : 0), sec = s % 60, min = (s / 60) % 60, hr = (s / 3600) % 12;
    V.clock.s.rotation.z = -sec / 60 * Math.PI * 2; V.clock.m.rotation.z = -min / 60 * Math.PI * 2; V.clock.h.rotation.z = -hr / 12 * Math.PI * 2;
    const left = ST.dur - ST.t; V.clock.g.scale.setScalar(ST.on && left < 30 ? 1 + Math.abs(Math.sin(t * 6)) * .06 : 1);
  }
  // принтер, сервер, кавоварка, спринклери
  if (V.prLight) { V.prLight.material.color.set(ST.jam ? '#FF5C7A' : '#7FE08A'); V.prLight.material.emissive.set(ST.jam ? (Math.sin(t * 12) > 0 ? '#FF5C7A' : '#400010') : '#7FE08A'); if (ST.jam && Math.random() < dt * 6) burst(PRINTER.o.x, 1.4, PRINTER.o.z, pick(['#FFFFFF', '#857C99']), 1, 1, .8, 1.5); }
  if (V.srvLight) { V.srvLight.material.color.set(ST.heat ? '#FF5C3C' : '#6BE7FF'); V.srvLight.material.emissive.set(ST.heat ? '#FF5C3C' : '#6BE7FF'); if (ST.heat && Math.random() < dt * 8) burst(RACK.o.x, 2.3, RACK.o.z, pick(['#FF8A3C', '#857C99']), 1, 1, 1, 2); }
  if (V.fan) V.fan.rotation.z += dt * (ST.heat ? 1 : 18);
  if (!ST.cm && Math.random() < dt * 8) burst(COFFEE.o.x, 1.8, COFFEE.o.z, pick(['#4E4A6E', '#857C99', '#FF8A3C']), 1, 1, 1.2, 2);
  if (ST.rain && inOffice(pl.x, pl.z) && Math.random() < dt * 40) { burst(pl.x + rand(-8, 8), 3.2, pl.z + rand(-6, 6), '#8FD9FF', 2, .6, .6, -2); if (Math.random() < .12) burst(pl.x + rand(-6, 6), 1.5, pl.z + rand(-5, 5), '#FFFFFF', 1, 3, 1, 2, 1.6); }
  updAct(dt);
  hud(); darkness(); guide();
  if (!running || pl.dead) return;
  const here = inOffice(pl.x, pl.z);
  if (!here) { V.act = null; if (myHeld().it || myHeld().cup) { if ((V.sendT -= dt) <= 0) { V.sendT = 1; req('drop'); } } return; }
  if (ST.on) V.joined = true;
  pl.safe = { x: START.p.x, z: START.p.z - 1 };
}
function darkness() {
  if (!V.dark) { V.dark = document.createElement('div'); V.dark.style.cssText = 'position:fixed;inset:0;z-index:1;pointer-events:none;transition:opacity .4s'; document.body.appendChild(V.dark); }
  const on = running && ST.on && !ST.pw && inOffice(pl.x, pl.z) && !panel;
  V.dark.style.opacity = on ? (Math.random() < .03 ? .6 : 1) : 0;
  if (on) { const p = screenPos(pl.x, 1, pl.z); V.dark.style.background = `radial-gradient(circle at ${Math.round(p.x)}px ${Math.round(p.y)}px, rgba(10,6,25,0) 0, rgba(10,6,25,.15) 110px, rgba(10,6,25,.88) 280px)`; }
}

/* ---------- Дії «тримай поруч» ---------- */
function startAct(kind, need, tg, ic, l, ok) {
  if (V.act) return;
  V.act = { kind, need, t: 0, tg, ic, l, ok, pt: 0 }; sfx('dig');
}
function updAct(dt) {
  const a = V.act; if (!a) return;
  if (!running || pl.dead) { V.act = null; return; }
  const p = a.tg();
  if (dist2(pl.x, pl.z, p.x, p.z) > 2.2) { V.act = null; toast('Відійшов — не доробив.'); return; }
  const bad = a.ok(); if (bad) { V.act = null; toast(bad); return; }
  a.t += dt; a.pt -= dt;
  if (a.pt <= 0) { a.pt = .5; ftext(pl.x, 2.5, pl.z, `${a.ic} ${Math.min(100, Math.round(a.t / a.need * 100))}%`, 'calm'); burst(p.x, 1.1, p.z, '#FFE066', 3, 2, .4, 2); sfx('tick', p.x, p.z); }
  if (a.t >= a.need) { V.act = null; a.kind(); }
}
const P_ = s => () => s.p;
const bossPos = () => ({ x: ST.boss.x, z: ST.boss.z });
function actPrint() { startAct(() => req('print'), 4, P_(PRINTER), '🖨️', 'Друкую звіт', () => ST.jam ? '🖨️ Принтер зажував папір! Витягни його (F).' : !ST.pw ? '⚡ Нема світла — принтер не працює.' : cur() !== 'print' ? 'Вже не треба.' : ''); }
function actBrew() { startAct(() => req('brew'), 2.5, P_(COFFEE), '☕', 'Варю каву', () => !ST.cm ? '💥 Кавоварка зламалась!' : ''); }
function actSub(w) {
  const S = STEPS[w];
  startAct(() => req('sub', { w }), S.t, w === 'sign' ? bossPos : P_(S.at), S.ic, S.act, () => myHeld().it !== 'report' ? 'Звіт уже не в тебе!' : cur() !== w ? 'Вже не треба.' : w === 'scan' && ST.heat ? '🔥 Сервер перегрівся — спершу полагодь вентилятор.' : w === 'scan' && !ST.pw ? '⚡ Нема світла.' : '');
}
const FIXAT = { jam: PRINTER, cm: COFFEE, heat: RACK, power: PANEL, rain: VALVE };
const FIXL = { jam: ['🔧', 'Витягую зім’ятий папір'], cm: ['🔧', 'Лагоджу кавоварку'], heat: ['🌀', 'Лагоджу вентилятор'], power: ['⚡', 'Вмикаю автомати'], rain: ['🚿', 'Закручую вентиль'] };
const active = w => w === 'jam' ? ST.jam : w === 'cm' ? !ST.cm : w === 'heat' ? ST.heat : w === 'power' ? !ST.pw : ST.rain;
function actFix(w) { startAct(() => req('fix', { w }), FIXT[w], P_(FIXAT[w]), FIXL[w][0], FIXL[w][1], () => active(w) ? '' : 'Уже полагодили!'); }

/* ---------- Підказки: підписи місць, «що робити зараз» і стрілка до цілі ---------- */
const PLACES = [
  { id: 'start', p: START.p, y: 2.2, t: '▶ СТАРТ (F)', on: () => !ST.on },
  { id: 'send', p: SEND.p, y: 2.2, t: '📤 Відправка' },
  { id: 'printer', p: PRINTER.p, y: 2.2, t: '🖨️ Принтер' }, { id: 'staple', p: STAPLER.p, y: 1.9, t: '📎 Степлер' },
  { id: 'coffee', p: COFFEE.p, y: 2.3, t: '☕ Кавоварка' }, { id: 'rain', p: VALVE.p, y: 2, t: '🚿 Вентиль спринклерів' },
  { id: 'power', p: PANEL.p, y: 2.1, t: '⚡ Щиток' }, { id: 'number', p: ARCHIVE.p, y: 2.4, t: '🗂️ Архів' },
  { id: 'heat', p: RACK.p, y: 2.7, t: '🌀 Сервер' }, { id: 'scan', p: SCANNER.p, y: 1.9, t: '📠 Сканер' }, { id: 'stamp', p: STAMP.p, y: 1.9, t: '🔏 Печатка' },
];
function goal() {
  const k = myKey(), h = myHeld(), s = cur(), near = o => dist2(pl.x, pl.z, o.x, o.z);
  const nearest = arr => arr.reduce((a, b) => !a || near(b) < near(a) ? b : a, null);
  if (!ST.on) return { id: 'start', tg: START.p, txt: 'Підійди до <b>▶ СТАРТ</b> на ресепшні й натисни <b>F</b> — годинник почне відлік до 18:00.' };
  if (V.act) return { txt: `${V.act.ic} ${V.act.l}… ${Math.min(100, Math.round(V.act.t / V.act.need * 100))}% — стій поруч!` };
  const signLater = ST.steps.indexOf('sign') >= ST.si && ST.steps.includes('sign') && !ST.coffee;
  // хтось украв звіт / дані
  const thief = nearest(ST.zom.filter(z => z.carry && z.stun <= 0 && (z.carry.it === 'report' || s === 'data')));
  if (thief && (!h.it || h.it === 'sheets')) return { id: 'thief', tg: { x: thief.x, z: thief.z }, txt: `🧟 Зомбі-офісник поцупив ${ITEM[thief.carry.it].ic} <b>${ITEM[thief.carry.it].n}</b>! Наздожени й натисни <b>F</b> — «Це можна було листом!»` };
  // папери на підлозі
  const fl = nearest(ST.floor.filter(f => (f.it === 'report' && !h.it) || (f.it === 'sheets' && s === 'data' && (!h.it || h.it === 'sheets'))));
  if (fl) return { id: 'floor', tg: fl, txt: `${ITEM[fl.it].ic} <b>${ITEM[fl.it].n}</b> на підлозі — підбери (F).` };
  if (!ST.pw && (s === 'print' || s === 'scan' || !h.it)) return { id: 'power', tg: PANEL.p, txt: '⚡ <b>Нема світла!</b> Біжи до щитка в кінці коридору й тримай F (або чекай, поки напруга сама стабілізується).' };
  if (ST.jam && s === 'print' && h.it !== 'report') return { id: 'jam', tg: PRINTER.p, txt: '🖨️ <b>Принтер зажував папір.</b> Підійди й тримай F, щоб витягнути.' };
  if (ST.heat && s === 'scan') return { id: 'heat', tg: RACK.p, txt: '🔥 <b>Сервер перегрівся</b> — сканер не працює. Полагодь вентилятор у серверній (F).' };
  if (h.cup && signLater) return { id: 'boss', tg: bossPos(), txt: '☕ Неси каву <b>начальнику</b> (F поруч з ним).' };
  if (h.it === 'report') {
    if (s === 'send') return { id: 'send', tg: SEND.p, txt: '📤 Звіт готовий! Неси його в лоток <b>«Відправка»</b> на ресепшні й натисни F.' };
    if (s === 'sign') {
      if (!ST.coffee && !h.cup) return ST.cm ? { id: 'coffee', tg: COFFEE.p, txt: '✍️ Начальник без кави не підписує. Звари <b>☕ каву</b> на кухні (звіт можна не випускати з рук).' } : { id: 'cm', tg: COFFEE.p, txt: '💥 Кавоварка зламана — полагодь її (F), а тоді звари каву начальнику.' };
      return { id: 'boss', tg: bossPos(), txt: '✍️ Підійди до <b>начальника</b> з звітом і тримай F — підпише.' };
    }
    const S = STEPS[s]; if (S && S.at) return { id: s, tg: S.at.p, txt: `${S.ic} Неси звіт: <b>${S.n}</b> — F і тримайся поруч.` };
  }
  if (h.it === 'sheets') {
    if (s === 'data') { const d = nearest(DESKS.filter(q => ST.desk[q.i])); if (d && h.n + ST.fed < ST.need) return { id: 'desk', tg: d.p, txt: `📄 У руках ${h.n}. Ще дані в колеги з 📄 над головою — F біля столу. Або неси вже в 🖨️ принтер.` }; }
    return { id: 'printer', tg: PRINTER.p, txt: `📥 Неси дані (${h.n} 📄) в <b>принтер</b> у копіцентрі й натисни F.` };
  }
  if (s === 'data') {
    const d = nearest(DESKS.filter(q => ST.desk[q.i]));
    if (d) return { id: 'desk', tg: d.p, txt: `📄 Збери дані: колега з 📄 над головою (${NAMES[d.i]}) — підійди до столу й натисни F. У принтері ${ST.fed}/${ST.need}.` };
  }
  if (s === 'print' && !ST.jam) return { id: 'printer', tg: PRINTER.p, txt: '🖨️ Дані в принтері! Натисни F біля <b>принтера</b> й тримайся поруч 4 с — друкується звіт.' };
  // допомога команді, поки звіт у когось іншого
  if (signLater && !h.cup && !Object.values(ST.held).some(q => q.cup)) return ST.cm ? { id: 'coffee', tg: COFFEE.p, txt: '☕ Начальник без кави не підпише звіт. Звари каву на кухні (F) і віднеси йому.' } : { id: 'cm', tg: COFFEE.p, txt: '💥 Кавоварка зламана — полагодь (F): начальнику потрібна кава.' };
  if (ST.jam) return { id: 'jam', tg: PRINTER.p, txt: '🖨️ Принтер зажований — витягни папір (F).' };
  if (ST.heat) return { id: 'heat', tg: RACK.p, txt: '🔥 Сервер перегрівся — полагодь вентилятор у серверній (F).' };
  if (!ST.cm) return { id: 'cm', tg: COFFEE.p, txt: '💥 Кавоварка зламана — полагодь її (F).' };
  if (ST.rain) return { id: 'rain', tg: VALVE.p, txt: '💦 Спринклери ллють! Закрути <b>вентиль</b> на кухні (F) — папери розлітаються.' };
  const holder = Object.keys(ST.held).find(q => ST.held[q].it === 'report' && q !== k);
  if (holder) { const z = nearest(ST.zom.filter(q => q.stun <= 0 && !q.carry)); return z && near(z) < 6 ? { id: 'zombie', tg: { x: z.x, z: z.z }, txt: '🧟 Звіт у колеги. Відганяй зомбі-офісників (F поруч), щоб не вкрали!' } : { txt: `📘 Звіт несе ${escapeHTML(holder)} — прикривай: відганяй зомбі (F) і лагодь поломки.` }; }
  if (s === 'data') return { id: 'printer', tg: PRINTER.p, txt: `📄 Дані в дорозі — чекай біля принтера (${ST.fed}/${ST.need}).` };
  return { txt: 'Стеж за хаосом і зомбі — і поспішай, 18:00 близько!' };
}
function guide() {
  if (!V.lbl) {
    V.lbl = document.createElement('div'); V.lbl.style.cssText = 'position:fixed;inset:0;z-index:2;pointer-events:none';
    const css = document.createElement('style');
    css.textContent = `.dl-lbl{position:absolute;left:0;top:0;padding:3px 9px;border-radius:10px;background:rgba(46,35,70,.78);color:#fff;font:700 12px/1.3 system-ui,sans-serif;white-space:nowrap;transform:translate(-50%,-100%);transition:opacity .2s}
      .dl-lbl.goal{background:#FFE066;color:#2E2346;font-size:14px;box-shadow:0 0 0 3px rgba(255,224,102,.35),0 6px 16px rgba(0,0,0,.3);animation:dlB .8s ease-in-out infinite alternate}
      @keyframes dlB{to{margin-top:-6px}}`;
    document.head.appendChild(css); document.body.appendChild(V.lbl);
    for (const P of PLACES) { P.el = document.createElement('div'); P.el.className = 'dl-lbl'; V.lbl.appendChild(P.el); }
    V.glbl = document.createElement('div'); V.glbl.className = 'dl-lbl goal'; V.lbl.appendChild(V.glbl);
    V.gArrow = new THREE.Group(); const sh = mesh(new THREE.ConeGeometry(.28, .7, 3), bulb('#FFE066'), false); sh.rotation.z = -Math.PI / 2; sh.position.x = 1.25; V.gArrow.add(sh); scene.add(V.gArrow);
    V.gMark = new THREE.Mesh(new THREE.TorusGeometry(.6, .07, 6, 24), new THREE.MeshBasicMaterial({ color: '#FFE066', transparent: true, opacity: .9, depthWrite: false })); V.gMark.rotation.x = Math.PI / 2; scene.add(V.gMark);
  }
  const show = running && !pl.dead && !panel && inOffice(pl.x, pl.z);
  V.lbl.style.display = show ? '' : 'none';
  const g = show ? goal() : { txt: '' }; V.goal = g;
  V.gArrow.visible = V.gMark.visible = !!(show && g.tg);
  if (!show) return;
  const pos = (el, x, y, z) => { const q = screenPos(x, y, z); el.style.display = q.vis ? '' : 'none'; el.style.transform = `translate(${Math.round(q.x)}px,${Math.round(q.y)}px) translate(-50%,-100%)`; };
  for (const P of PLACES) {
    const on = (!P.on || P.on()) && P.id !== g.id && (ST.pw || dist2(pl.x, pl.z, P.p.x, P.p.z) < 5);
    P.el.style.opacity = on ? (dist2(pl.x, pl.z, P.p.x, P.p.z) < 7 ? 1 : .55) : 0;
    if (on) { if (P.el.textContent !== P.t) P.el.textContent = P.t; pos(P.el, P.p.x, P.y, P.p.z); }
  }
  V.glbl.style.opacity = g.tg ? 1 : 0;
  if (g.tg) {
    const P = PLACES.find(q => q.id === g.id), t = '👉 ' + (P ? P.t : { desk: '📄 Дані тут (F)', boss: '👔 Начальник', thief: '🧟 Злодій! (F)', floor: '📄 Підібрати (F)', zombie: '🧟 Прожени (F)', cm: '🔧 Кавоварка', jam: '🔧 Принтер', printer: '🖨️ Принтер' }[g.id] || 'Сюди');
    if (V.glbl.textContent !== t) V.glbl.textContent = t; pos(V.glbl, g.tg.x, 3, g.tg.z);
    const d = dist2(pl.x, pl.z, g.tg.x, g.tg.z);
    V.gMark.position.set(g.tg.x, .08, g.tg.z); V.gMark.scale.setScalar(1 + Math.sin(gameTime * 5) * .12);
    V.gArrow.visible = d > 2.2; V.gArrow.position.set(pl.x, .15, pl.z); V.gArrow.rotation.y = -Math.atan2(g.tg.z - pl.z, g.tg.x - pl.x);
  }
}
/* коротка інструкція при першому вході */
function intro(force) {
  const d = A.data(); if ((d.intro && !force) || SIMSIDE || document.getElementById('dl-intro')) return;
  const el = document.createElement('div'); el.id = 'dl-intro';
  el.style.cssText = 'position:fixed;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;background:rgba(20,12,40,.55);padding:16px';
  el.innerHTML = `<div style="max-width:460px;width:100%;background:#2E2346;color:#fff;border-radius:18px;padding:18px 20px;font:14px/1.5 system-ui,sans-serif;box-shadow:0 12px 40px rgba(0,0,0,.4)">
    <div style="font:800 20px system-ui;margin-bottom:8px">⏰ Дедлайн о 18:00 — як грати</div>
    <div>1. <b>▶ СТАРТ</b> на ресепшні (F) — годинник іде з 17:55. До 18:00 треба здати <b>квартальний звіт</b>.</div>
    <div>2. 📄 Збери дані в колег (📄 над головою) → неси в 🖨️ <b>принтер</b> → друкуй (F, тримайся поруч).</div>
    <div>3. Зі звітом пройди пункти зі списку праворуч: 📎 степлер, 🔏 печатка, 🗂️ архів, 📠 скан, ✍️ підпис начальника (йому спершу ☕ каву!).</div>
    <div>4. 📤 Здай звіт у лоток «Відправка». Хаос (принтер, кавоварка, світло, сервер, спринклери) лагодь, тримаючи F поруч.</div>
    <div>5. 🧟 Зомбі-офісники крадуть папери — F поруч: «Це можна було листом!»</div>
    <div style="margin-top:8px;color:#FFE066">Жовта стрілка й мітка завжди показують, куди йти зараз. Підказка — внизу екрана 👇</div>
    <button class="btn" style="margin-top:12px;width:100%">Зрозуміло, працюємо!</button></div>`;
  document.body.appendChild(el);
  el.querySelector('button').addEventListener('click', () => { el.remove(); d.intro = 1; save(); });
}

/* ---------- F ---------- */
const _getInteract = getInteract;
getInteract = function () {
  if (!SIMSIDE && running && !pl.dead && inOffice(pl.x, pl.z) && !pl.carry && !pl.ride) {
    const near = (o, r) => dist2(pl.x, pl.z, o.x, o.z) < r, h = myHeld(), s = cur();
    if (V.act) return { l: `${V.act.ic} ${V.act.l}… ${Math.min(100, Math.round(V.act.t / V.act.need * 100))}%`, fn: () => { } };
    if (ST.on) for (const z of ST.zom) if (z.stun <= 0 && near(z, 1.7)) return { l: z.carry ? `🧟 Відібрати ${ITEM[z.carry.it].ic}: «Це можна було листом!»` : '🗣️ «Це можна було листом!» (прогнати зомбі)', fn: () => req('shoo', { id: z.id }) };
    for (const f of ST.floor) if (near(f, 1.3) && (!h.it || (h.it === 'sheets' && f.it === 'sheets'))) return { l: `Підняти ${ITEM[f.it].ic} ${ITEM[f.it].n}${f.n > 1 ? ' ×' + f.n : ''}`, fn: () => req('pick', { id: f.id }) };
    if (!ST.on) { if (near(START.p, 1.6)) return { l: '⏰ Почати аврал (17:55 → 18:00)', fn: () => { req('start'); sfx('ding'); } }; }
    else {
      if (near(PRINTER.p, 1.4)) {
        if (ST.jam) return { l: '🔧 Витягнути зім’ятий папір (2,5 с)', fn: () => actFix('jam') };
        if (h.it === 'sheets') return { l: `📥 Покласти дані в принтер (${h.n} 📄)`, fn: () => req('feed') };
        if (s === 'print' && !h.it) return ST.pw ? { l: '🖨️ Друкувати звіт (тримайся поруч 4 с)', fn: actPrint } : { l: '⚡ Нема світла — принтер мертвий', fn: () => { } };
        return { l: `🖨️ Принтер: даних ${Math.min(ST.fed, ST.need)}/${ST.need}`, fn: () => { } };
      }
      for (const d of DESKS) if (ST.desk[d.i] && near(d.p, 1.3)) return h.it && h.it !== 'sheets' ? { l: 'Руки зайняті звітом', fn: () => { } } : { l: `📄 Взяти дані — ${NAMES[d.i]}`, fn: () => req('take', { i: d.i }) };
      if (near(COFFEE.p, 1.4)) return !ST.cm ? { l: '🔧 Полагодити кавоварку (3 с)', fn: () => actFix('cm') } : h.cup ? { l: '☕ Кава вже в руці', fn: () => { } } : { l: '☕ Зварити каву начальнику (2,5 с)', fn: actBrew };
      if (near(VALVE.p, 1.3) && ST.rain) return { l: '🚿 Закрутити вентиль спринклерів (2 с)', fn: () => actFix('rain') };
      if (near(PANEL.p, 1.3) && !ST.pw) return { l: '⚡ Увімкнути автомати на щитку (2 с)', fn: () => actFix('power') };
      if (near(RACK.p, 1.4) && ST.heat) return { l: '🌀 Полагодити вентилятор сервера (3 с)', fn: () => actFix('heat') };
      if (near(bossPos(), 1.7)) {
        if (h.cup && !ST.coffee) return { l: '☕ Віддати каву начальнику', fn: () => req('give') };
        if (h.it === 'report' && s === 'sign') return ST.coffee ? { l: '✍️ Попросити підпис (1,5 с)', fn: () => actSub('sign') } : { l: '👔 «Спершу кава!»', fn: () => bubble(V.boss.ent, 'Без кави не підписую!', true, 2) };
        return { l: '👔 Начальник', fn: () => bubble(V.boss.ent, pick(['Звіт до шостої!', 'Я в тебе вірю. Трохи.', 'А де кава?']), false, 2) };
      }
      for (const w of ['staple', 'stamp', 'number', 'scan']) {
        const S = STEPS[w];
        if (!near(S.at.p, 1.4)) continue;
        if (h.it === 'report' && s === w) return w === 'scan' && ST.heat ? { l: '🔥 Сервер перегрівся — сканер не працює', fn: () => { } } : w === 'scan' && !ST.pw ? { l: '⚡ Нема світла', fn: () => { } } : { l: `${S.ic} ${S.act} (${String(S.t).replace('.', ',')} с)`, fn: () => actSub(w) };
        return { l: `${S.ic} ${S.n.replace(/ \(.*\)/, '')}${ST.steps.includes(w) ? '' : ' — сьогодні не треба'}`, fn: () => { } };
      }
      if (near(SEND.p, 1.5)) return h.it === 'report' && s === 'send' ? { l: '📤 Здати квартальний звіт!', fn: () => { req('send'); sfx('coin'); } } : { l: `📤 Відправка: ${s === 'send' ? 'потрібен звіт у руках' : 'звіт ще не готовий'}`, fn: () => { } };
    }
  }
  return _getInteract.apply(this, arguments);
};

/* ---------- HUD: годинник, чекліст, хаос ---------- */
function hud() {
  if (!V.hud) {
    V.goalEl = document.createElement('div'); V.goalEl.id = 'deadline-goal';
    V.goalEl.style.cssText = 'position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 150px);transform:translateX(-50%);z-index:2;pointer-events:none;background:#FFE066;color:#2E2346;border-radius:12px;padding:7px 14px;font:700 14px/1.4 system-ui,sans-serif;text-align:center;box-shadow:0 6px 18px rgba(0,0,0,.25);width:max-content;max-width:min(560px,90vw)';
    document.body.appendChild(V.goalEl);
    V.hud = document.createElement('div'); V.hud.id = 'deadline-hud';
    V.hud.style.cssText = 'position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 64px);transform:translateX(-50%);z-index:2;pointer-events:none;background:rgba(46,35,70,.88);color:#fff;border-radius:14px;padding:7px 14px;font:700 13px/1.4 system-ui,sans-serif;text-align:center;box-shadow:0 6px 18px rgba(0,0,0,.25);max-width:92vw';
    document.body.appendChild(V.hud);
    V.list = document.createElement('div'); V.list.id = 'deadline-list';
    V.list.style.cssText = 'position:fixed;right:12px;top:calc(env(safe-area-inset-top,0px) + 150px);z-index:2;pointer-events:none;background:rgba(46,35,70,.88);color:#fff;border-radius:14px;padding:8px 12px;font:600 12px/1.55 system-ui,sans-serif;box-shadow:0 6px 18px rgba(0,0,0,.25);max-width:min(270px,44vw)';
    document.body.appendChild(V.list);
  }
  const show = running && !pl.dead && !panel && inOffice(pl.x, pl.z);
  V.hud.style.display = show ? '' : 'none'; V.goalEl.style.visibility = show ? '' : 'hidden'; V.list.style.display = show && ST.on ? '' : 'none';
  if (!show) return;
  let h;
  if (ST.on) {
    const left = Math.max(0, ST.dur - ST.t), col = left < 30 ? '#FF5C7A' : left < 90 ? '#FFD27A' : '#7FE08A', mh = myHeld();
    const chaos = [ST.jam ? '🖨️ принтер зажований' : '', !ST.cm ? '💥 кавоварка' : '', !ST.pw ? '⚡ нема світла' : '', ST.heat ? '🔥 сервер' : '', ST.rain ? '💦 спринклери' : '', ST.zom.length > 4 ? '🧟 нарада' : ''].filter(Boolean).join(' · ');
    h = `<span style="font-size:17px;color:${col}">⏰ ${clockStr(ST.t)}</span> · 📊 Квартальний звіт · до 18:00: <span style="color:${col}">${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}</span>${mh.it || mh.cup ? ` · у руках ${mh.it ? ITEM[mh.it].ic + (mh.n > 1 ? '×' + mh.n : '') : ''}${mh.cup ? '☕' : ''}` : ''}${V.act ? ` · ${V.act.ic} ${Math.round(V.act.t / V.act.need * 100)}%` : ''}${chaos ? `<br><span style="font-size:12px;color:#FF8A7A">${chaos}</span>` : ''}`;
    const rows = ST.steps.map((id, i) => { const S = STEPS[id], done = i < ST.si, now = i === ST.si; return `<div style="${done ? 'opacity:.6;text-decoration:line-through' : now ? 'color:#FFE066' : 'opacity:.85'}">${done ? '✅' : now ? '▶' : '⬜'} ${S.ic} ${S.n}${id === 'data' ? ` <b>${Math.min(ST.fed, ST.need)}/${ST.need}</b>` : ''}${id === 'sign' && ST.coffee ? ' ☕✔' : ''}</div>`; }).join('');
    const lv = `<div style="font:800 13px system-ui;margin-bottom:3px">📋 Чекліст звіту${ST.lv ? ` · рівень ${ST.lv + 1}` : ''}</div>`;
    if (V.list.innerHTML !== lv + rows) V.list.innerHTML = lv + rows;
  } else h = '⏰ 17:55 · <span style="font-weight:600">офіс «Дедлайн» — квартальний звіт ще не почато</span>';
  const gt = V.goal && V.goal.txt ? `👉 ${V.goal.txt}` : ''; V.goalEl.style.display = gt ? '' : 'none'; if (V.goalEl.innerHTML !== gt) V.goalEl.innerHTML = gt;
  if (V.hud.innerHTML !== h) V.hud.innerHTML = h;
}

/* ---------- Музика: тривожний офісний джаз і цокання, що пришвидшується до 18:00 ---------- */
const JPROG = [[43, [65, 70, 74, 77]], [36, [64, 67, 70, 74]], [41, [64, 69, 72, 76]], [38, [66, 69, 72, 75]]];   // Gm7 · C7 · Fmaj7 · D7
const JPROG_T = [[38, [62, 65, 69, 72]], [43, [62, 67, 70, 74]], [45, [61, 64, 67, 70]], [38, [62, 66, 69, 72]]]; // Dm7 · Gm · A7(b9) · D7
const JWALK = [[43, 45, 46, 47], [48, 46, 45, 43], [41, 43, 45, 48], [50, 48, 46, 44]];
const JMEL = [70, 72, 74, 77, 79, 82];
if (!SIMSIDE && typeof scheduleStep === 'function') {
  const _ss = scheduleStep;
  scheduleStep = function (i, t) {
    if (!running || pl.dead || !inOffice(pl.x, pl.z) || typeof LAYER === 'undefined' || !LAYER.drums) { if (V.music >= 0) { V.music = -1; barMode = ''; } return _ss.apply(this, arguments); }
    const s = i % 16, bar = Math.floor(i / 16), left = ST.dur - ST.t;
    const lvl = !ST.on ? 0 : left < 60 ? 2 : 1;
    if (s === 0 && V.music !== lvl) { V.music = lvl; const m = [{ keys: .8, bass: .6, drums: .35, tension: 0, lead: .2, crackle: .15 }, { keys: .7, bass: .9, drums: .8, tension: .2, lead: .4, crackle: 0 }, { keys: .55, bass: 1, drums: 1, tension: .8, lead: .4, crackle: 0 }][lvl]; for (const k in m) if (LAYER[k]) LAYER[k].gain.setTargetAtTime(m[k], t, .6); }
    const [root, ch] = (lvl === 2 ? JPROG_T : JPROG)[bar % 4];
    if (s === 0 || (lvl && s === 6)) ch.forEach((n, k) => epiano(t + k * .015, n, lvl ? 1.2 : 2.6, .04, LAYER.keys));   // «чарльстон»
    if (s % 4 === 0) bassNote(t, lvl === 2 ? root + (s % 8 ? 7 : 0) : JWALK[bar % 4][s / 4], STEP * 3, lvl ? .42 : .3);
    if (lvl) { if (s === 0 || s === 8) kick(t, .6); if (s === 4 || s === 12) snare(t, .22); if (s % 4 === 0 || s % 4 === 3) hat(t, s % 4 ? .03 : .05, s === 14); }
    // годинник: цок-цок, що прискорюється
    const tickEvery = !ST.on ? 8 : left < 15 ? 1 : left < 60 ? 2 : 4;
    if (s % tickEvery === 0 && typeof tone === 'function') tone(t, LAYER.drums, 'square', (s / tickEvery) % 2 ? 1500 : 2100, 0, .018, ST.on ? .05 : .025);
    if ([2, 7, 10, 14].includes(s) && Math.random() < (lvl ? .45 : .3)) (lvl === 2 ? marimba : steel)(t, pick(JMEL) - (lvl === 2 ? 3 : 0), .04);
    if (lvl === 1 && bar % 4 === 2 && s === 8) leadNote(t, ch[3] + 12, STEP * 6, .03);
    if (lvl === 2 && s % 2 === 0) pulse(t, root + 24 + (s % 8 === 6 ? 6 : 0), STEP * .9, .05);
  };
}

/* ---------- Режим у паузі, вкладка, картка в меню ---------- */
function goDeadline() {
  const f = $('#fade'); closePanel(); if (f) f.style.opacity = 1; sfx('travel');
  setTimeout(() => { pl.x = START.p.x - .5; pl.z = START.p.z + .2; pl.y = 0; pl.vy = 0; pl.falling = false; pl.jump = null; pl.safe = { x: pl.x, z: pl.z }; camPos.set(pl.x, 20, pl.z + 15); camLook.set(pl.x, .5, pl.z); if (f) f.style.opacity = 0; toast('⏰ Офіс «Дедлайн»! Жовта стрілка показує, куди йти. Старт — ▶ СТАРТ на ресепшні (F).'); intro(); }, 260);
  return true;
}
function leaveDeadline() { V.act = null; if (myHeld().it || myHeld().cup) req('drop'); return true; }
if (A.mode) A.mode({ id: 'deadline', ic: '⏰', n: 'Дедлайн о 18:00', sub: 'кооп на 1–4: здай квартальний звіт до 18:00', go: goDeadline, here: () => running && inOffice(pl.x, pl.z), leave: leaveDeadline });
A.tab('deadline', '⏰ Дедлайн', () => {
  const d = A.data(), here = inOffice(pl.x, pl.z);
  return `<h3>⏰ Дедлайн о 18:00</h3>
    <p style="font-size:13px;line-height:1.5;margin:4px 0 10px">Кооператив на 1–4 гравці. 17:55, п’ятниця. Квартальний звіт треба здати до 18:00 — а принтер жує папір, кавоварка вибухає, а коридори забиті зомбі-офісниками на нараді.</p>
    <div class="btns"><button class="btn alt" data-dl="help">❓ Як грати</button>${here ? (ST.on ? '' : '<button class="btn" data-dl="start">⏰ Почати аврал</button>') : '<button class="btn" data-dl="go">⏰ В офіс</button>'}</div>
    <div class="list" style="margin-top:10px;font-size:13px;line-height:1.55">
      <div>📄 <b>Дані</b> — у колег з 📄 над головою (F біля столу). Неси в 🖨️ принтер у копіцентрі, друкуй (тримайся поруч 4 с).</div>
      <div>📋 <b>Чекліст</b> щораунду інший: 3 з 5 — 📎 степлер, 🔏 печатка, 🗂️ архів, 📠 скан, ✍️ підпис начальника (спершу ☕ кава з кухні!). Потім 📤 «Відправка».</div>
      <div>💥 <b>Хаос</b>: принтер зажовує, кавоварка вибухає, світло гасне (щиток у коридорі), сервер гріється (вентилятор у серверній), спринклери (вентиль на кухні). F і тримайся поруч.</div>
      <div>🧟 <b>Зомбі-офісники</b> штовхаються й крадуть папери. F поруч — «Це можна було листом!»</div>
      <div>⭐ Зірки — за запас часу. Кожна перемога підвищує складність.</div>
    </div>
    <p class="muted" style="font-size:12px;margin-top:10px">Раундів: ${d.rounds || 0} · звітів здано: ${d.wins || 0} · найбільший запас: ${d.best ? Math.floor(d.best / 60) + ':' + String(d.best % 60).padStart(2, '0') : '—'} · найкраща оцінка: ${'⭐'.repeat(d.stars || 0) || '—'} · хаосу приборкано: ${d.fixes || 0}</p>`;
}, e => {
  const b = e.target.closest('[data-dl]'); if (!b) return;
  if (b.dataset.dl === 'help') { closePanel(); intro(true); } else if (b.dataset.dl === 'go') goDeadline(); else { req('start'); closePanel(); }
});
if (!SIMSIDE && typeof document !== 'undefined') {
  const box = document.querySelector('#main-menu .mm-container');
  if (box && !document.getElementById('mm-deadline')) {
    const card = document.createElement('div'); card.className = 'mm-card'; card.id = 'mm-deadline';
    card.innerHTML = `<div class="mm-img-wrap"><div class="mm-card-img" style="background-image:url('menu/deadline-bg.jpg'),url('addons/deadline/deadline-bg.jpg'),linear-gradient(160deg,#FF8A7A,#B07CF0 55%,#2E2346)"></div></div>
      <div class="mm-card-body"><h2>ДЕДЛАЙН</h2><div class="mm-subtitle">О 18:00</div>
      <div class="mm-desc">Квартальний звіт за 5 хвилин: принтер, печатки, кава начальнику й зомбі на нараді. Кооп на 4 гравці.</div></div>`;
    const locked = [...box.children].filter(c => c.classList.contains('mm-locked')).pop();
    box.insertBefore(card, locked || null);
    card.addEventListener('click', () => {
      V.auto = true; if (running) goDeadline();
      const mm = document.getElementById('main-menu'); if (mm) { mm.classList.add('mm-hide'); mm.addEventListener('transitionend', () => mm.remove(), { once: true }); }
    });
  }
}
A.on('start', () => { if (V.auto && !SIMSIDE) setTimeout(goDeadline, 700); });
if (window.__ADDON_TEST) window.__deadline = { ST, AU, V, DESKS, START, SEND, PRINTER, STAPLER, COFFEE, VALVE, PANEL, ARCHIVE, RACK, SCANNER, STAMP, STEPS, goal, intro, chaos, req, myHeld, myKey, blocked, navPath, clockStr, cur };
