/* Аддон «Гонки на офісних кріслах» v2 (PVP, 5 учасників: люди + боти).
   Три траси на високих поверхах хмарочосів у центрі міста:
   «Поверх 42 · Коридори» (коло коридорами між кабінетами), «Поверх 57 · Скляний атріум» (вісімка з перехрестям),
   «Поверх 63 · Колл-центр» (довгий серпантин між рядами операторів + ризикований зріз крізь пожежні двері).
   - Лобі (ліфтовий хол): попап з картинками трас — клік по картці = голос, «✅ Я готовий» — у заїзд.
     Після першого «готовий» лобі заповнюється ботами до 5 учасників (по одному), потім «Старт за 3…2…1»
     (онлайн неготових чекаємо 25 с). «Сховати» → F у холі або вкладка відкриють знову.
   - ✈️ Паперові літачки (5): білі стоси паперу біля бортика (проїдь крізь — +3), коробки «?», лоток у холі (F — +3 на старт).
   - У кріслі хотбар порожній, крім двох штук: 💣 Бомба (1 / ЛКМ — кидок дугою вперед або в курсор) і 🪠 Вантуз (2 / ПКМ — чіпляєш суперника попереду й підтягуєшся).
   - 🧯 Вогнегасник (3): реактивна тяга піною назад (WALL-E стайл) — поки є піна; гасить вогонь, по якому їдеш.
   - 🍾 Коктейль Молотова (4): кидок дугою — на трасі кілька секунд горить калюжа; хто в неї в'їде — закрутить, пригальмує й обпалить сідушку.
   - Коробки «?» дають бомби, піну, «молотови» або предмет на ПРОБІЛ: ☕ кава · 📎 степлер · 📁 папка-пастка · 🍵 чай лідеру.
   - Свої фішки: дрифт-буст на поворотах, слипстрім за суперником, мокра підлога від прибиральниці, пожежні двері-зріз.
   - 3 кола. Нагорода — за місце. У спільному світі заїзд, боти, бомби й голосування рахує сервер.
   Картинку для меню поклади поруч: addons/chairrace/chairrace-bg.jpg (або menu/chairrace-bg.jpg). */
const A = Addon.info({ name: 'Гонки на офісних кріслах', version: '2.2', desc: 'PVP-режим: гонки на кріслах на трьох поверхах хмарочосів — бомби, вантузи, вогнегасник-реактив, коктейлі Молотова, паперові літачки, дрифт, слипстрім, 3 кола.' });

const SIMSIDE = !!window.__SIM;
const AUTH = () => SIMSIDE || !(typeof WORLD !== 'undefined' && WORLD.on);
const TW = 5.6, LAPS = 3, MAXR = 5, VMAX = 11, VBOOST = 16, LOB = 7.5, RAD = 3.2;
const BOMB_R = 2.9, HOOK_CD = 4.5, START_BOMBS = 2, MAX_BOMBS = 5;
// 🧯 вогнегасник-реактив (піна в секундах тяги) і 🍾 коктейль Молотова (палаюча калюжа)
const JET_V = 21, FOAM_START = 2.5, FOAM_BOX = 2.5, FOAM_MAX = 6, MOLLY_START = 1, MAX_MOLLY = 3, FIRE_R = 1.7, FIRE_T = 6, BURN_T = 4;
// ✈️ паперові літачки: стоси паперу біля бортика (проїхав крізь — +3), коробки «?», лоток у холі (F — на старт)
const PLANE_START = 1, PLANE_PICK = 3, PLANE_MAX = 6, PLANE_PRE = 3, PAPER_CD = 8, PLANE_SLOW = 1.8;
const inR = (R, x, z, m = 0) => x > R.x0 + m && x < R.x1 - m && z > R.z0 + m && z < R.z1 - m;
const angD = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

/* ---------- Три поверхи (локальні координати від центру; лобі — смуга на півночі, за склом) ---------- */
// rooms: {n, x, z — табличка, b: [x0,z0,x1,z1] — прямокутник кімнати}; furn: [тип, x, z, поворот]; ow: стіни кабінетів {x1,z1,x2,z2,doors,glass}; floors: [x0,z0,x1,z1,колір,(плитка)]
const VARS = [
  {
    id: 'chairrace', n: 'Поверх 42 · Коридори', sub: 'класичне коло коридорами між кабінетами', cx: 300, cz: -300,
    B: { x0: -26, x1: 26, z0: -17.2, z1: 18 }, loop: [[-22, -14], [22, -14], [22, -2], [2, -2], [2, 14], [-22, 14]], start: [-8, -14],
    pal: { base: '#C9CDD9', lobby: '#E9E2FA', track: ['#5A6BB5', '#5464AC'], kerb: ['#FFFFFF', '#FF5C7A'], wall: '#ECE6FB', top: '#9F8BE0' }, glass: i => ((i / 9) | 0) % 3 === 1,
    items: [.12, .4, .63, .86], boosts: [.27, .54, .95], zomb: [{ f: .2, sp: .7 }, { f: .5, sp: .55 }, { f: .75, sp: .8 }, { f: .345, sp: .35, mop: 1 }],
    puddles: [{ f: .33, o: .9 }, { f: .68, o: -.9 }], paper: [{ f: .07, o: 1 }, { f: .45, o: -1 }],
    ow: [
      { x1: -19, z1: 3.5, x2: -1, z2: 3.5, doors: [-14, -5], glass: 1 }, { x1: -10, z1: 3.5, x2: -10, z2: 11, doors: [7], glass: 1 },
      { x1: -1, z1: -11, x2: -1, z2: -5, doors: [-8] }, { x1: 9, z1: -11, x2: 9, z2: -5, doors: [-8] }, { x1: 15, z1: 1, x2: 15, z2: 18, doors: [9] },
    ],
    rooms: [{ n: '💻 Опенспейс', x: -10, z: -4, b: [-19, -11, -1, 3.5] }, { n: '📊 Переговорна', x: -14.5, z: 9.6, b: [-19, 3.5, -10, 11] }, { n: '👔 Кабінет боса', x: -5.5, z: 10.4, b: [-10, 3.5, -1, 11] }, { n: '🛋️ Лаунж', x: 4, z: -10.6, b: [-1, -11, 9, -5] },
      { n: '☕ Кухня', x: 14, z: -6, b: [9, -11, 19, -5] }, { n: '📦 Склад', x: 10, z: 16, b: [5, 1, 15, 18] }, { n: '🖥️ Серверна', x: 20.5, z: 16, b: [15, 1, 26, 18] }],
    floors: [[-19, -11, -1, 3.5, '#6E7FC8'], [-19, 3.5, -10, 11, '#7E6FB8'], [-10, 3.5, -1, 11, '#8C5A3C'], [-1, -11, 9, -5, '#C4956A'], [5, 1, 15, 18, '#B8BECC'], [15, 1, 26, 18, '#3E3A5C'], [9, -11, 19, -5, '#FFFFFF', '#DCD6EA']],
    crates: [[12, 5.5], [12.5, 10.5], [7, 15.5]],
    furn() {
      const f = [];
      for (const cx of [-15.5, -10.5, -5.5]) for (const cz of [-7.5, -1.5]) for (const dx of [-.8, .8]) f.push(['desk', cx + dx, cz - .45, Math.PI], ['desk', cx + dx, cz + .45, 0]);
      f.push(['plant', -18.3, -10.3, 1], ['plant', -1.7, -10.3, 1], ['cooler', -18.4, 2.6, 0], ['plant', -1.7, 2.7, 0]);
      f.push(['mtable', -14.5, 7.3, 0], ['tv', -18.75, 7.3, Math.PI / 2], ['board', -14.5, 10.75, Math.PI]);
      for (let x = -16.8; x <= -12.2; x += 1.15) f.push(['chair', x, 6.3, 0], ['chair', x, 8.3, Math.PI]);
      f.push(['boss', -5.5, 8.2, 0], ['shelf', -1.4, 7.3, -Math.PI / 2], ['plant', -9.3, 10.4, 1], ['plant', -1.6, 10.4, 1], ['sofa', -7.6, 4.35, 0]);
      f.push(['sofa', 3, -10.3, 0], ['sofa', 3, -5.75, Math.PI], ['ctable', 3, -8, 0], ['plant', -.4, -10.4, 1], ['plant', 8.3, -10.4, 1]);
      f.push(['counter', 14, -10.4, 0], ['fridge', 18.4, -8, -Math.PI / 2], ['ktable', 13, -7, 0], ['chair', 12.2, -7.8, 0], ['chair', 13.8, -7.8, 0], ['chair', 12.2, -6.2, Math.PI], ['chair', 13.8, -6.2, Math.PI]);
      for (const z of [4.5, 8.5, 12.5]) f.push(['shelf', 8, z, 0]);
      for (const x of [18, 21, 24]) for (const z of [5, 9.5, 14]) f.push(['rack', x, z, 0]);
      return f;
    },
  },
  {
    id: 'chairrace2', n: 'Поверх 57 · Скляний атріум', sub: 'вісімка зі скляними стінами й перехрестям посередині', cx: 440, cz: -300,
    B: { x0: -26, x1: 26, z0: -17.2, z1: 18 }, loop: [[20, 0], [20, -14], [0, -14], [0, 14], [-20, 14], [-20, 0]], start: [-6, 14], cross: [0, 0],
    pal: { base: '#E4EEEC', lobby: '#F2F7F6', track: ['#2F9C94', '#2A928A'], kerb: ['#FFFFFF', '#FFB347'], wall: '#E6F4F1', top: '#5FB3A8' }, glass: i => ((i / 7) | 0) % 3 !== 2,
    items: [.1, .43, .6, .72], boosts: [.18, .55, .97], zomb: [{ f: .05, sp: .6 }, { f: .5, sp: .7 }, { f: .66, sp: .55 }, { f: .29, sp: .4, mop: 1 }],
    puddles: [{ f: .27, o: .6 }, { f: .8, o: -.8 }], paper: [{ f: .36, o: 1 }, { f: .88, o: -1 }],
    ow: [{ x1: 14, z1: 3, x2: 14, z2: 18, doors: [10], glass: 1 }],
    rooms: [{ n: '🌳 Скляний атріум', x: -14, z: -14.5, b: [-26, -17.2, -3, -3] }, { n: '📚 Бібліотека', x: -10, z: 9.8, b: [-17, 3, -3, 11] }, { n: '😴 Кімната сну', x: 10, z: -10.2, b: [3, -11, 17, -3] }, { n: '🏋️ Спортзал', x: 8.5, z: 16, b: [3, 3, 14, 18] }, { n: '🎨 Креативна агенція', x: 20, z: 16.4, b: [14, 3, 26, 18] }],
    floors: [[-26, -17.2, -3, -3, '#F4F1EA', '#E8E2D6'], [-17, 3, -3, 11, '#8C5A3C'], [3, -11, 17, -3, '#7E6FB8'], [3, 3, 14, 18, '#3E3A5C'], [14, 3, 26, 18, '#FFD6A8']],
    crates: [],
    furn() {
      const f = [['fount', -14, -10, 0], ['tree', -24, -15.4, 0], ['tree', -5.2, -15.4, 0], ['tree', -24, -4.8, 0], ['tree', -5.2, -4.8, 0],
        ['sofa', -14, -13.4, 0], ['sofa', -14, -6.6, Math.PI], ['counter', -24.9, -10, Math.PI / 2], ['ktable', -20.2, -12, 0], ['ktable', -20.2, -8, 0], ['plant', -9, -16.4, 0], ['plant', -19, -16.4, 0]];
      for (const x of [-14.5, -10, -5.5]) f.push(['shelf', x, 6, 0]);
      for (const x of [-14, -11, -8, -5]) f.push(['ldesk', x, 9.6, 0]);
      f.push(['plant', -16.2, 3.8, 0], ['plant', -3.8, 3.8, 0]);
      for (const x of [5.2, 8.4, 11.6, 14.8]) f.push(['capsule', x, -9.6, 0]);
      f.push(['bean', 6, -5, 0], ['bean', 9.5, -4.6, 0], ['bean', 13, -5.2, 0], ['plant', 16.2, -4, 0]);
      for (const x of [5, 7.5, 10, 12.5]) f.push(['tread', x, 5.2, 0]);
      for (const [x, z] of [[5.5, 9.5], [8.2, 9.5], [11, 9.5], [5.5, 12.5], [8.2, 12.5], [11, 12.5]]) f.push(['ymat', x, z, 0]);
      f.push(['dumb', 13.2, 15.5, Math.PI / 2]);
      f.push(['desk', 17, 6.4, 0], ['desk', 19, 6.4, 0], ['desk', 21, 6.4, 0], ['pong', 20, 11.5, 0], ['bean', 16, 15.6, 0], ['bean', 18.6, 16.2, 0], ['bean', 23.4, 15.4, 0], ['board', 25.7, 10, -Math.PI / 2]);
      for (const z of [-15, -9, -4]) f.push(['plant', 24.6, z, 1]);
      for (const z of [4, 10, 16]) f.push(['plant', -24.6, z, 1]);
      f.push(['cooler', -24.6, 13, 0]);
      return f;
    },
  },
  {
    id: 'chairrace3', n: 'Поверх 63 · Колл-центр', sub: 'нічний серпантин між операторами й складом, пожежні двері-зріз', cx: 580, cz: -300, night: true,
    B: { x0: -27.3, x1: 27.3, z0: -18.2, z1: 18.4 }, loop: [[24, -15], [24, -5], [-14, -5], [-14, 5], [24, 5], [24, 15], [-24, 15], [-24, -15]], start: [-12, -15],
    pal: { base: '#B8BECC', lobby: '#D9D2EE', track: ['#C4683A', '#B85F34'], kerb: ['#FFFFFF', '#2E2346'], wall: '#DCD6EA', top: '#E0607E' }, glass: i => ((i / 11) | 0) % 4 === 3,
    items: [.06, .33, .55, .72], boosts: [.2, .45, .88], zomb: [{ f: .15, sp: .7 }, { f: .39, sp: .6 }, { f: .62, sp: .75 }, { f: .8, sp: .55 }, { x: 10, z: -10.2, ax: 1, az: 0, amp: 1.6, sp: .8, mop: 1 }],
    puddles: [{ x: 10, z: -9 }, { f: .5, o: .7 }, { f: .93, o: -.6 }], paper: [{ f: .1, o: 1 }, { f: .68, o: -1 }],
    sc: { x0: 7.6, x1: 12.4, z0: -15, z1: -5, a: [10, -15], b: [10, -5] },
    ow: [],
    rooms: [{ n: '☎️ Колл-центр «Алло»', x: -6, z: -10, b: [-21, -12, 21, -8] }, { n: '📈 Відділ продажів', x: 6, z: 0, b: [-11, -2, 21, 2] }, { n: '🖨️ Друкарня', x: -19, z: 0, b: [-21, -12, -17, 12] }, { n: '📦 Склад', x: 3, z: 10, b: [-21, 8, 21, 12] }, { n: '🚒 Пожежні двері', x: 10, z: -8.8, b: [7.6, -12, 12.4, -8] }],
    floors: [[-21, -12, 21, -8, '#4E3A7C'], [-11, -2, 21, 2, '#5A6BB5'], [-21, -12, -17, 12, '#C9CDD9', '#B8BECC'], [-21, 8, 21, 12, '#8E86B0'], [7.6, -12, 12.4, -8, '#FFE066']],
    crates: [[-10.5, 9.4], [-.5, 10.5], [18.6, 9.6]],
    furn() {
      const f = [];
      for (let x = -19; x < 20.5; x += 2.2) if (Math.abs(x - 10) > 3.4) f.push(['desk', x, -10.45, Math.PI], ['desk', x, -9.55, 0]);
      for (let x = -9; x < 20.5; x += 2.2) f.push(['desk', x, -.45, Math.PI], ['desk', x, .45, 0]);
      f.push(['tv', -10.7, 0, Math.PI / 2], ['gong', 20.4, 0, 0]);
      for (const z of [-10, -6, -2, 2, 6, 10]) f.push(['copier', -20.3, z, Math.PI / 2]);
      f.push(['shelf', -17.6, -4, -Math.PI / 2], ['shelf', -17.6, 4, -Math.PI / 2], ['cooler', -18, 0, 0]);
      for (const x of [-18, -13, -8, -3, 6, 11, 16]) f.push(['shelf', x, 10.6, Math.PI]);
      for (const x of [-15.5, 1.5, 13.5]) f.push(['pallet', x, 9.4, 0]);
      f.push(['fork', 8.6, 9.3, Math.PI / 2]);
      return f;
    },
  },
];

/* ---------- Підготовка поверху: траса (прямі + заокруглені повороти), предмети, стіни ---------- */
function prepare(V, vi) {
  V.vi = vi;
  const X = x => V.cx + x, Z = z => V.cz + z;
  const P = V.loop.map(([x, z]) => [X(x), Z(z)]), n = P.length, pts = [];
  const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  for (let i = 0; i < n; i++) {
    const a = P[(i - 1 + n) % n], b = P[i], c = P[(i + 1) % n];
    const la = Math.hypot(b[0] - a[0], b[1] - a[1]), lc = Math.hypot(c[0] - b[0], c[1] - b[1]);
    const t0 = lerp2(b, a, RAD / la), t1 = lerp2(b, c, RAD / lc);
    for (let k = 0; k < 7; k++) { const t = k / 7, u = 1 - t; pts.push([u * u * t0[0] + 2 * u * t * b[0] + t * t * t1[0], u * u * t0[1] + 2 * u * t * b[1] + t * t * t1[1]]); }   // заокруглення
    const e = lerp2(c, b, RAD / lc), len = Math.hypot(e[0] - t1[0], e[1] - t1[1]), m = Math.max(1, Math.round(len / .9));
    for (let k = 0; k < m; k++) pts.push(lerp2(t1, e, k / m));
  }
  const sx = X(V.start[0]), sz = Z(V.start[1]);
  const s0 = pts.reduce((bi, q, k) => Math.hypot(q[0] - sx, q[1] - sz) < Math.hypot(pts[bi][0] - sx, pts[bi][1] - sz) ? k : bi, 0);
  V.TR = [];
  for (let k = 0; k < pts.length; k++) { const q = pts[(s0 + k) % pts.length]; V.TR.push({ x: q[0], z: q[1] }); }
  for (let i = 0; i < V.TR.length; i++) { const p = V.TR[i], q = V.TR[(i + 1) % V.TR.length], l = Math.hypot(q.x - p.x, q.z - p.z) || 1; p.dx = (q.x - p.x) / l; p.dz = (q.z - p.z) / l; p.l = l; }
  V.N = V.TR.length;
  const at = f => Math.round(V.N * f) % V.N, idxOf = (x, z) => V.TR.reduce((bi, q, k) => (q.x - x) ** 2 + (q.z - z) ** 2 < (V.TR[bi].x - x) ** 2 + (V.TR[bi].z - z) ** 2 ? k : bi, 0);
  V.ITEMS = V.items.map(at); V.BOOSTS = V.boosts.map(at);
  V.ZOMB = V.zomb.map(o => { if (o.f == null) return { x: X(o.x), z: Z(o.z), ax: o.ax, az: o.az, amp: o.amp, sp: o.sp, ph: 0, mop: o.mop }; const i = at(o.f), p = V.TR[i]; return { x: p.x, z: p.z, ax: -p.dz, az: p.dx, amp: TW / 2 - .6, sp: o.sp, ph: i, mop: o.mop }; });
  V.PAPER = V.paper.map(o => { const i = at(o.f), p = V.TR[i], d = o.o * (TW / 2 - .75); return { i, x: p.x - p.dz * d, z: p.z + p.dx * d }; });
  V.PUD = V.puddles.map(o => { if (o.f == null) return { x: X(o.x), z: Z(o.z) }; const p = V.TR[at(o.f)]; return { x: p.x - p.dz * o.o, z: p.z + p.dx * o.o }; });
  V.F = { x0: X(V.B.x0), x1: X(V.B.x1), z0: Z(V.B.z0 - LOB), z1: Z(V.B.z1) };   // увесь поверх разом з лобі
  V.BB = { x0: X(V.B.x0), x1: X(V.B.x1), z0: Z(V.B.z0), z1: Z(V.B.z1) };        // частина з трасою
  const L = V.B.z0 - LOB / 2;
  V.START = { x: X(-12), z: Z(L) }; V.SPAWN = { x: X(-13.6), z: Z(L + .8) };
  V.TRAY = { x: X(12.6), z: Z(L - 2.3) };   // лоток з папером у ліфтовому холі
  if (V.sc) { const s = V.sc; V.SC = { x0: X(s.x0), x1: X(s.x1), z0: Z(s.z0), z1: Z(s.z1), ia: idxOf(X(s.a[0]), Z(s.a[1])), ib: idxOf(X(s.b[0]), Z(s.b[1])), bx: X(s.b[0]), bz: Z(s.b[1]) }; }
  V.OW = [{ x1: V.B.x0, z1: V.B.z0, x2: V.B.x1, z2: V.B.z0, glass: 1, lobby: 1 }].concat(V.ow)
    .map(w => Object.assign({}, w, { x1: X(w.x1), x2: X(w.x2), z1: Z(w.z1), z2: Z(w.z2), doors: (w.doors || []).map(d => d + (w.z1 === w.z2 ? V.cx : V.cz)) }));
  V.FURN = V.furn();
  V.r = Math.ceil(Math.max(...[[V.B.x0, V.B.z0 - LOB], [V.B.x1, V.B.z0 - LOB], [V.B.x0, V.B.z1], [V.B.x1, V.B.z1]].map(([x, z]) => Math.hypot(x, z)))) + 2;
  V.WALLS = corridorWalls(V);
}
// чи точка лежить у коридорі іншої ділянки траси (перехрестя, сусідні смуги)
function nearOther(V, i, x, z, R) {
  for (let j = 0; j < V.N; j++) { const di = Math.abs(i - j), cd = Math.min(di, V.N - di); if (cd > 12 && (V.TR[j].x - x) ** 2 + (V.TR[j].z - z) ** 2 < R * R) return true; }
  return false;
}
// дверні прорізи в стінах коридору (у кабінети) — лише там, де за стіною кабінет
function wallGap(V, i, sd) {
  const p = V.TR[i], o = sd * (TW / 2 + 1.2), x = p.x - p.dz * o, z = p.z + p.dx * o;
  if (!inR(V.BB, x, z, 1) || nearOther(V, i, x, z, TW / 2 + .2)) return false;
  return (i + (sd > 0 ? 0 : 11)) % 22 < 2;
}
function corridorWalls(V) {
  const out = [];
  for (let i = 0; i < V.N; i++) {
    const p = V.TR[i];
    for (const sd of [-1, 1]) {
      const o = sd * (TW / 2 + .15), x = p.x - p.dz * o, z = p.z + p.dx * o;
      if (!inR(V.BB, x, z, .4) || (V.SC && inR(V.SC, x, z)) || wallGap(V, i, sd) || nearOther(V, i, x, z, TW / 2 + .35)) continue;   // фасад / лобі / зріз / перехрестя — без стіни
      out.push({ i, sd, x, z });
    }
  }
  return out;
}
VARS.forEach(prepare);
let VV = VARS[0], TR = VV.TR, N = VV.N;   // поточна траса заїзду
function useVar(i) { VV = VARS[clamp(i | 0, 0, VARS.length - 1)]; TR = VV.TR; N = VV.N; }
const wrapI = i => ((i % N) + N) % N;
function nearIdx(x, z, hint) {
  let best = 0, bd = 1e9;
  const scan = (from, to) => { for (let k = from; k <= to; k++) { const i = wrapI(k), d = (TR[i].x - x) ** 2 + (TR[i].z - z) ** 2; if (d < bd) { bd = d; best = i; } } };
  if (hint == null) scan(0, N - 1); else { scan(hint - 10, hint + 10); if (bd > 25) scan(0, N - 1); }
  return best;
}
const zombiePos = (z, t) => { const o = Math.sin(t * z.sp + z.ph) * z.amp; return { x: z.x + z.ax * o, z: z.z + z.az * o }; };
const GRID = k => { const p = TR[wrapI(-3 - (k >> 1) * 2)], o = (k & 1 ? 1 : -1) * 1.2; return { x: p.x - p.dz * o, z: p.z + p.dx * o, h: Math.atan2(p.dz, p.dx) }; };
const doorOpen = t => (((t % 9) + 9) % 9) < 3.8;   // пожежні двері: 3,8 с відчинені з кожних 9
const floorAt = (x, z) => VARS.findIndex(V => inR(V.F, x, z, -1.5));
const inRace = (x, z) => floorAt(x, z) >= 0;

/* ---------- Набір офісних меблів (лише для вигляду; тверді — через addStatic у 'world') ---------- */
function officeKit(g) {
  const at = (o, x, z, rot) => { o.position.set(x, 0, z); o.rotation.y = rot || 0; g.add(o); return o; };
  const K = {
    // стіл із ПК, клавіатурою й кріслом; rot — куди дивиться той, хто сидить (0 = на -z)
    desk(x, z, rot, pc = true) {
      const o = new THREE.Group();
      put(o, mesh(new THREE.BoxGeometry(1.6, .07, .8), '#E8DCC8'), 0, .76, 0);
      for (const sx of [-.74, .74]) put(o, mesh(new THREE.BoxGeometry(.06, .74, .74), '#B8A68E'), sx, .37, 0);
      put(o, mesh(new THREE.BoxGeometry(1.5, .4, .04), '#C9BBA2'), 0, .5, -.36);
      if (pc) {
        put(o, mesh(new THREE.BoxGeometry(.72, .44, .05), '#2E2346'), 0, 1.1, -.22);
        put(o, mesh(new THREE.BoxGeometry(.64, .36, .02), bulb(pick(['#6BB8FF', '#7FE08A', '#B07CF0', '#6BE7FF'])), false), 0, 1.1, -.19);
        put(o, mesh(new THREE.BoxGeometry(.08, .16, .08), '#2E2346'), 0, .87, -.22);
        put(o, mesh(new THREE.BoxGeometry(.5, .03, .16), '#4E4A6E', false), 0, .8, .08);
        put(o, mesh(new THREE.BoxGeometry(.22, .44, .46), '#3E3A5C'), .6, .22, -.1);   // системник
      }
      if (Math.random() < .5) put(o, mesh(flat(new THREE.CylinderGeometry(.06, .05, .12, 8)), pick(['#FFFFFF', '#FF6BD6', '#FFE066'])), -.5, .85, .1);   // чашка
      if (Math.random() < .4) put(o, mesh(new THREE.BoxGeometry(.3, .06, .22), '#FFFFFF', false), -.25, .82, -.05);   // папери
      const ch = bodyMesh('chair'); ch.position.set(0, 0, .75); ch.rotation.y = Math.PI + rand(-.3, .3); o.add(ch);
      return at(o, x, z, rot);
    },
    chair(x, z, rot) { const c = bodyMesh('chair'); return at(c, x, z, rot); },
    table(x, z, w, d, col = '#C4956A') { const o = new THREE.Group(); put(o, mesh(new THREE.BoxGeometry(w, .08, d), col), 0, .75, 0); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) put(o, mesh(new THREE.BoxGeometry(.08, .72, .08), '#4E4A6E'), a * (w / 2 - .12), .36, b * (d / 2 - .12)); return at(o, x, z, 0); },
    sofa(x, z, rot, len = 2.2, col = '#8F7BD6') {
      const o = new THREE.Group();
      put(o, mesh(new THREE.BoxGeometry(len, .42, .9), col), 0, .21, 0);
      put(o, mesh(new THREE.BoxGeometry(len, .55, .25), col), 0, .55, -.35);
      for (const s of [-1, 1]) put(o, mesh(new THREE.BoxGeometry(.22, .6, .9), col), s * (len / 2 - .11), .3, 0);
      for (let k = 0; k < Math.round(len / .8); k++) put(o, mesh(new THREE.BoxGeometry(.65, .12, .6), '#F2E6D8', false), -len / 2 + .5 + k * .75, .47, .05);
      return at(o, x, z, rot);
    },
    plant(x, z, big) { const o = new THREE.Group(); put(o, mesh(flat(new THREE.CylinderGeometry(.28, .22, .45, 8)), '#C4956A'), 0, .22, 0); put(o, mesh(flat(new THREE.IcosahedronGeometry(big ? .75 : .5, 0)), '#6FBF73'), 0, big ? 1.1 : .8, 0); if (big) put(o, mesh(flat(new THREE.IcosahedronGeometry(.5, 0)), '#5FAF63'), .2, 1.65, .1); return at(o, x, z, 0); },
    cooler(x, z) { const o = new THREE.Group(); put(o, mesh(new THREE.BoxGeometry(.5, 1, .5), '#E9E2FA'), 0, .5, 0); put(o, mesh(flat(new THREE.CylinderGeometry(.22, .22, .5, 10)), mat('#8FD3FF', { transparent: true, opacity: .8 })), 0, 1.25, 0); return at(o, x, z, 0); },
    shelf(x, z, rot, w = 1.8) { const o = new THREE.Group(); put(o, mesh(new THREE.BoxGeometry(w, 1.8, .45), '#B8A68E'), 0, .9, 0); for (let y = 0; y < 4; y++) for (let k = 0; k < 5; k++) put(o, mesh(new THREE.BoxGeometry(w / 6, .32, .36), pick(['#E0607E', '#6BB8FF', '#FFE066', '#7FE08A', '#B07CF0', '#FFFFFF'])), -w / 2 + w / 10 + k * w / 5, .25 + y * .43, .05); return at(o, x, z, rot); },
    counter(x, z, rot, w = 4) {
      const o = new THREE.Group();
      put(o, mesh(new THREE.BoxGeometry(w, .9, .7), '#FFFFFF'), 0, .45, 0); put(o, mesh(new THREE.BoxGeometry(w + .05, .06, .75), '#4E4A6E'), 0, .92, 0);
      put(o, mesh(new THREE.BoxGeometry(.5, .55, .45), '#2E2346'), -w / 2 + .6, 1.22, 0); put(o, mesh(new THREE.BoxGeometry(.2, .1, .04), bulb('#FF6BD6'), false), -w / 2 + .6, 1.3, .23);   // кавомашина
      put(o, mesh(new THREE.BoxGeometry(.6, .35, .4), '#C9CDD9'), w / 2 - .7, 1.13, 0);   // мікрохвильовка
      put(o, mesh(new THREE.BoxGeometry(.6, .05, .4), '#8FD3FF', false), 0, .95, 0);       // мийка
      return at(o, x, z, rot);
    },
    fridge(x, z, rot) { const o = new THREE.Group(); put(o, mesh(new THREE.BoxGeometry(.8, 1.9, .7), '#E9E2FA'), 0, .95, 0); put(o, mesh(new THREE.BoxGeometry(.05, .5, .05), '#8E86B0'), .3, 1.2, .36); return at(o, x, z, rot); },
    tv(x, z, rot, w = 2) { const o = new THREE.Group(); put(o, mesh(new THREE.BoxGeometry(w, 1.1, .08), '#2E2346'), 0, 1.5, 0); put(o, mesh(new THREE.BoxGeometry(w - .15, .95, .02), bulb('#6BB8FF'), false), 0, 1.5, .05); return at(o, x, z, rot); },
    board(x, z, rot, w = 2) { const o = new THREE.Group(); put(o, mesh(new THREE.BoxGeometry(w, 1.1, .06), '#FFFFFF'), 0, 1.4, 0); for (let k = 0; k < 4; k++) put(o, mesh(new THREE.BoxGeometry(rand(.4, w - .4), .04, .02), pick(['#E0607E', '#6BB8FF', '#2E2346']), false), rand(-.3, .3), 1.2 + k * .15, .04); return at(o, x, z, rot); },
    bossDesk(x, z, rot) {
      const o = new THREE.Group();
      put(o, mesh(new THREE.BoxGeometry(2.6, .1, 1.1), '#6B4A3A'), 0, .78, 0); put(o, mesh(new THREE.BoxGeometry(2.5, .72, 1), '#7E5A46'), 0, .38, 0);
      put(o, mesh(new THREE.BoxGeometry(.8, .5, .05), '#2E2346'), .5, 1.1, -.3); put(o, mesh(new THREE.BoxGeometry(.72, .42, .02), bulb('#7FE08A'), false), .5, 1.1, -.27);
      put(o, mesh(new THREE.BoxGeometry(.3, .25, .2), '#FFE066'), -.8, .95, -.2);   // кубок «Найкращий бос»
      const ch = new THREE.Group(); put(ch, mesh(new THREE.BoxGeometry(.8, .15, .75), '#2E2346'), 0, .55, 0); put(ch, mesh(new THREE.BoxGeometry(.8, 1.1, .15), '#2E2346'), 0, 1.1, -.32); put(ch, mesh(flat(new THREE.CylinderGeometry(.06, .06, .45, 6)), '#4E4A6E'), 0, .27, 0); ch.position.set(0, 0, .9); ch.rotation.y = Math.PI; o.add(ch);
      return at(o, x, z, rot);
    },
    // нове для v2: атріум, кімната сну, спортзал, колл-центр, склад
    fount(x, z) { const o = new THREE.Group(); put(o, mesh(flat(new THREE.CylinderGeometry(1.6, 1.7, .5, 16)), '#DCD6EA'), 0, .25, 0); put(o, mesh(new THREE.CylinderGeometry(1.4, 1.4, .06, 16), mat('#6BE7FF', { transparent: true, opacity: .75 }), false), 0, .46, 0); put(o, mesh(flat(new THREE.CylinderGeometry(.18, .25, 1.2, 8)), '#ECE6FB'), 0, .9, 0); put(o, mesh(flat(new THREE.CylinderGeometry(.7, .3, .25, 12)), '#ECE6FB'), 0, 1.5, 0); put(o, mesh(flat(new THREE.IcosahedronGeometry(.32, 0)), mat('#BFF4FF', { transparent: true, opacity: .7 }), false), 0, 1.75, 0); return at(o, x, z, 0); },
    tree(x, z) { const o = new THREE.Group(); put(o, mesh(new THREE.BoxGeometry(1.3, .6, 1.3), '#8E86B0'), 0, .3, 0); put(o, mesh(flat(new THREE.CylinderGeometry(.14, .2, 2.2, 6)), '#A3795C'), 0, 1.6, 0); for (const [a, b, c, s] of [[0, 2.9, 0, 1.1], [.5, 2.4, .3, .8], [-.5, 2.5, -.2, .8], [.1, 3.5, -.2, .7]]) put(o, mesh(flat(new THREE.IcosahedronGeometry(s, 0)), pick(['#6FBF73', '#5FAF63', '#7FD08A'])), a, b, c); return at(o, x, z, 0); },
    capsule(x, z, rot) { const o = new THREE.Group(); put(o, mesh(new THREE.BoxGeometry(2.4, 1.3, 1.4), '#F2F0FA'), 0, .65, 0); put(o, mesh(flat(new THREE.CylinderGeometry(.42, .42, .05, 14)), '#2E2346', false), 0, .7, .71).rotation.x = Math.PI / 2; put(o, mesh(new THREE.BoxGeometry(2.2, .05, .04), bulb('#B07CF0'), false), 0, 1.25, .71); put(o, mesh(new THREE.BoxGeometry(.5, .14, .3), '#FFB3C7', false), -.7, .62, .4); return at(o, x, z, rot); },
    bean(x, z) { const m = mesh(flat(new THREE.SphereGeometry(.55, 8, 6)), pick(['#FF6BD6', '#FFB347', '#6BB8FF', '#7FE08A'])); m.scale.set(1, .55, 1); m.position.set(x, .3, z); g.add(m); return m; },
    tread(x, z, rot) { const o = new THREE.Group(); put(o, mesh(new THREE.BoxGeometry(.8, .22, 1.9), '#3E3A5C'), 0, .11, 0); put(o, mesh(new THREE.BoxGeometry(.6, .03, 1.7), '#2E2346', false), 0, .24, .05); for (const s of [-1, 1]) put(o, mesh(new THREE.BoxGeometry(.06, 1.1, .06), '#8E86B0'), s * .36, .7, -.8); put(o, mesh(new THREE.BoxGeometry(.8, .3, .1), '#4E4A6E'), 0, 1.3, -.82); put(o, mesh(new THREE.BoxGeometry(.4, .14, .02), bulb('#7FE08A'), false), 0, 1.33, -.76); return at(o, x, z, rot); },
    ymat(x, z) { const m = mesh(new THREE.BoxGeometry(.9, .03, 2), pick(['#7FE08A', '#B07CF0', '#6BE7FF', '#FF6BD6']), false, true); m.position.set(x, .03, z); g.add(m); return m; },
    dumb(x, z, rot) { const o = new THREE.Group(); put(o, mesh(new THREE.BoxGeometry(2, .6, .5), '#4E4A6E'), 0, .3, 0); for (let k = 0; k < 6; k++) put(o, mesh(flat(new THREE.CylinderGeometry(.12, .12, .34, 8)), '#2E2346'), -.8 + k * .32, .7, 0).rotation.z = Math.PI / 2; return at(o, x, z, rot); },
    pong(x, z) { const o = new THREE.Group(); put(o, mesh(new THREE.BoxGeometry(2.7, .06, 1.5), '#2F9C94'), 0, .76, 0); put(o, mesh(new THREE.BoxGeometry(2.7, .065, .03), '#FFFFFF', false), 0, .765, 0); put(o, mesh(new THREE.BoxGeometry(.04, .16, 1.6), '#FFFFFF', false), 0, .87, 0); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) put(o, mesh(new THREE.BoxGeometry(.08, .74, .08), '#4E4A6E'), a * 1.2, .37, b * .6); return at(o, x, z, 0); },
    ldesk(x, z, rot) { const o = new THREE.Group(); put(o, mesh(new THREE.BoxGeometry(1.8, .07, .9), '#6B4A3A'), 0, .76, 0); put(o, mesh(new THREE.BoxGeometry(1.7, .7, .8), '#7E5A46'), 0, .38, 0); put(o, mesh(flat(new THREE.CylinderGeometry(.04, .04, .4, 6)), '#FFE066'), .6, 1, -.2); put(o, mesh(flat(new THREE.ConeGeometry(.16, .14, 8)), bulb('#7FE08A'), false), .6, 1.22, -.2); put(o, mesh(new THREE.BoxGeometry(.4, .06, .3), '#E0607E', false), -.3, .82, 0); const ch = bodyMesh('chair'); ch.position.set(0, 0, .8); ch.rotation.y = Math.PI; o.add(ch); return at(o, x, z, rot); },
    copier(x, z, rot) { const o = new THREE.Group(); put(o, mesh(new THREE.BoxGeometry(1, 1, .75), '#E9E2FA'), 0, .5, 0); put(o, mesh(new THREE.BoxGeometry(1, .12, .75), '#8E86B0'), 0, 1.06, 0); put(o, mesh(new THREE.BoxGeometry(.3, .08, .04), bulb('#7FE08A'), false), .25, .9, .38); put(o, mesh(new THREE.BoxGeometry(.5, .04, .35), '#FFFFFF', false), -.1, 1.14, .05); return at(o, x, z, rot); },
    pallet(x, z) { const o = new THREE.Group(); put(o, mesh(new THREE.BoxGeometry(1.4, .15, 1.1), '#C4956A'), 0, .08, 0); for (const [a, b, y] of [[-.35, -.25, .38], [.35, -.25, .38], [-.35, .28, .38], [.35, .28, .38], [0, 0, .83]]) put(o, mesh(new THREE.BoxGeometry(.6, .45, .5), '#D9B98E'), a, y, b); return at(o, x, z, 0); },
    fork(x, z, rot) { const o = new THREE.Group(); put(o, mesh(new THREE.BoxGeometry(1.1, .8, 1.6), '#FFB347'), 0, .6, 0); put(o, mesh(new THREE.BoxGeometry(1, .08, 1), '#2E2346'), 0, 1.75, -.1); for (const s of [-1, 1]) { put(o, mesh(new THREE.BoxGeometry(.08, 1.6, .08), '#2E2346'), s * .45, 1.2, .4); put(o, mesh(new THREE.BoxGeometry(.12, 2.2, .12), '#4E4A6E'), s * .3, 1.1, .9); put(o, mesh(new THREE.BoxGeometry(.12, .06, 1), '#8E86B0'), s * .25, .12, 1.4); } for (const [a, b] of [[-.55, -.5], [.55, -.5], [-.55, .5], [.55, .5]]) put(o, mesh(flat(new THREE.CylinderGeometry(.25, .25, .2, 10)), '#2E2346'), a, .25, b).rotation.z = Math.PI / 2; return at(o, x, z, rot); },
    gong(x, z) { const o = new THREE.Group(); for (const s of [-1, 1]) put(o, mesh(new THREE.BoxGeometry(.08, 1.6, .08), '#6B4A3A'), 0, .8, s * .55); put(o, mesh(new THREE.BoxGeometry(.08, .08, 1.2), '#6B4A3A'), 0, 1.6, 0); put(o, mesh(flat(new THREE.CylinderGeometry(.42, .42, .05, 16)), '#FFE066'), 0, 1.05, 0).rotation.z = Math.PI / 2; return at(o, x, z, 0); },
    rack(x, z) { const o = new THREE.Group(); put(o, mesh(new THREE.BoxGeometry(2, 2, .8), '#2E2346'), 0, 1, 0); for (let k = 0; k < 6; k++) put(o, mesh(new THREE.BoxGeometry(.08, .05, .02), bulb(k % 3 ? '#7FE08A' : '#6BE7FF'), false), -.7 + k * .28, .4 + (k % 3) * .55, .41); return at(o, x, z, 0); },
    // підлога кімнати
    floor(x0, z0, x1, z1, col, y = .012) { const m = mesh(new THREE.BoxGeometry(x1 - x0, .02, z1 - z0), col, false, true); m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); g.add(m); return m; },
    tiles(x0, z0, x1, z1, a, b) { K.floor(x0, z0, x1, z1, a); for (let x = x0; x < x1 - .01; x += 1) for (let z = z0; z < z1 - .01; z += 1) if ((Math.floor(x - x0) + Math.floor(z - z0)) % 2) K.floor(x, z, Math.min(x1, x + 1), Math.min(z1, z + 1), b, .018); },
  };
  return K;
}
/* стіни: відрізки вздовж осей з дверними прорізами; glass — скляна перегородка */
function wallMeshes(g, W, pal, H = 1.15) {
  for (const w of W) for (const [a, b] of wallParts(w)) {
    const horiz = w.z1 === w.z2, len = b - a; if (len < .05) continue;
    const mx = horiz ? (a + b) / 2 : w.x1, mz = horiz ? w.z1 : (a + b) / 2;
    const m = mesh(new THREE.BoxGeometry(horiz ? len : .2, w.glass ? H + .4 : H, horiz ? .2 : len), w.glass ? mat('#BFE6FF', { transparent: true, opacity: .35 }) : (w.col || pal.wall), !w.glass);
    m.position.set(mx, (w.glass ? H + .4 : H) / 2, mz); g.add(m);
    const t = mesh(new THREE.BoxGeometry(horiz ? len : .26, .08, horiz ? .26 : len), w.glass ? '#8E86B0' : pal.top, false); t.position.set(mx, w.glass ? H + .44 : H + .04, mz); g.add(t);
  }
  for (const w of W) for (const d of w.doors || []) { const horiz = w.z1 === w.z2; for (const s of [-1, 1]) { const px = horiz ? d + s * .95 : w.x1, pz = horiz ? w.z1 : d + s * .95; put(g, mesh(new THREE.BoxGeometry(.24, H + .5, .24), pal.top, false), px, (H + .5) / 2, pz); } }
}
function wallParts(w) {   // проміжки стіни між дверима
  const horiz = w.z1 === w.z2, lo = Math.min(horiz ? w.x1 : w.z1, horiz ? w.x2 : w.z2), hi = Math.max(horiz ? w.x1 : w.z1, horiz ? w.x2 : w.z2);
  const ds = (w.doors || []).slice().sort((a, b) => a - b), out = []; let a = lo;
  for (const d of ds) { out.push([a, d - .9]); a = d + .9; } out.push([a, hi]); return out;
}
function furnSolids(V) {   // [x, z, r] у світових координатах
  const out = [];
  for (const [t, x, z, rot] of V.FURN) {
    const c = Math.cos(rot), s = Math.sin(rot), pt = (lx, lz, r) => out.push([V.cx + x + lx * c + lz * s, V.cz + z - lx * s + lz * c, r]);
    if (t === 'desk' || t === 'ldesk') { pt(-.5, 0, .45); pt(.5, 0, .45); }
    else if (t === 'mtable') for (let k = -2.5; k <= 2.5; k++) pt(k, 0, .7);
    else if (t === 'sofa' || t === 'capsule' || t === 'dumb') { pt(-.7, 0, .5); pt(.7, 0, .5); }
    else if (t === 'counter') for (let k = -2.5; k <= 2.5; k++) pt(k, 0, .45);
    else if (t === 'ktable' || t === 'pong') { pt(-.6, 0, .55); pt(.6, 0, .55); }
    else if (t === 'boss') { pt(-.8, 0, .6); pt(.8, 0, .6); }
    else if (t === 'shelf' || t === 'rack') { pt(-.7, 0, .4); pt(0, 0, .4); pt(.7, 0, .4); }
    else if (t === 'fount') pt(0, 0, 1.6);
    else if (t === 'tree' || t === 'fork') pt(0, 0, .75);
    else if (t === 'tread') { pt(0, -.5, .4); pt(0, .5, .4); }
    else if (['ctable', 'fridge', 'cooler', 'plant', 'bean', 'copier', 'pallet', 'gong'].includes(t)) pt(0, 0, .45);
  }
  return out;
}
/* тверді стіни, меблі, фасад — на сервері й у гравця однаково (усі три поверхи одразу) */
A.on('world', () => {
  for (const V of VARS) {
    let last = {};
    for (const w of V.WALLS) { const l = last[w.sd]; if (!l || dist2(l.x, l.z, w.x, w.z) >= 1.1) { addStatic(w.x, w.z, .55, 1.2); last[w.sd] = w; } }
    for (const w of V.OW) for (const [a, b] of wallParts(w)) { const horiz = w.z1 === w.z2; for (let t = a; t <= b + .01; t += 1) addStatic(horiz ? t : w.x1, horiz ? w.z1 : t, .5, 1.2); }
    for (const [x, z, r] of furnSolids(V)) addStatic(x, z, r, 1);
    const F = V.F;   // скляний фасад хмарочоса — далі не вийдеш
    for (let x = F.x0 - .3; x <= F.x1 + .31; x += 1.2) { addStatic(x, F.z0 - .3, .6, 3); addStatic(x, F.z1 + .3, .6, 3); }
    for (let z = F.z0 - .3; z <= F.z1 + .31; z += 1.2) { addStatic(F.x0 - .3, z, .6, 3); addStatic(F.x1 + .3, z, .6, 3); }
    for (const [x, z] of V.crates) addProp('crate', V.cx + x, V.cz + z);
  }
});
VARS.forEach((V, i) => A.island({ id: V.id, n: 'Гонки · ' + V.n, sub: 'PVP · ' + V.sub, x: V.cx, z: V.cz, r: V.r, top: '#D8D0EA', rock: '#8C84C6', biome: 'racetrack', crVar: i, tier: 1, safe: true }));
const _buildIsland = buildIsland;
buildIsland = function (s) { if (s.biome !== 'racetrack') return _buildIsland.apply(this, arguments); return SIMSIDE ? new THREE.Group() : buildFloorMesh(VARS[s.crVar | 0]); };

/* ---------- Стан заїзду (сервер світу або сам гравець) ---------- */
const ST = { ph: 'idle', lob: '', nb: '', t: 0, cnt: 0, racers: [], traps: [], fires: [], boxes: [0, 1, 2, 3].map(() => [1, 1, 1]), res: [], id: 0, v: 0, def: 0, votes: {}, lp: [] };
const LOBBY_WAIT = 25;   // онлайн: стільки секунд після того, як лобі заповнилось, чекаємо неготових — і стартуємо без них
// лобі заповнюється: перший бот через 4 с після першого «готовий», далі кожні 2,5 с; потім «старт за 3…2…1»
// (тест-хук window.__chairraceFastLobby = 1 — усе по 0,2 с)
const fastLobby = () => typeof window !== 'undefined' && !!window.__chairraceFastLobby;
const FILL = () => fastLobby() ? { first: .2, step: .2, go: .6 } : { first: 4, step: 2.5, go: 3 };
const AU = { stT: 0, botId: 0, bombs: [], noBotArms: false, fillT: 0, waitT: 0 };
const BOT_NAMES = ['Бот Кент', 'Бот Віта', 'Бот Люда', 'Бот Гена', 'Бот Олена'];
const mkBot = k => ({ k, bot: true, lap: -1, idx: 0, fin: 0, skill: rand(.84, .97) });
const myKey = () => (NET.on && typeof WORLD !== 'undefined' && WORLD.on ? myName() : 'me');
const keyOf = from => SIMSIDE ? String(from && from.name || '') : 'me';
const r2 = v => Math.round(v * 100) / 100;
const score = r => r.fin ? 1e6 - r.fin : r.lap * N + r.idx;
function ranking() { return ST.racers.slice().sort((a, b) => score(b) - score(a)); }
function voteCounts() { const c = VARS.map(() => 0); for (const k in ST.votes) c[ST.votes[k]] = (c[ST.votes[k]] || 0) + 1; return c; }
function pickVar(final) {   // найбільше голосів; без голосів — ротація; нічия на старті — випадково серед лідерів
  const c = voteCounts(), mx = Math.max(...c); if (!mx) return ST.def;
  const top = c.map((n, i) => n === mx ? i : -1).filter(i => i >= 0);
  if (top.length === 1) return top[0];
  if (final) return pick(top);
  return top.includes(ST.v) ? ST.v : top.includes(ST.def) ? ST.def : top[0];   // поки голосують — лідер не стрибає
}
// хто зараз у лобі (люди на поверхах гонки) і чи всі вони готові (= записані в заїзд)
function lobbyKeys() { return SIMSIDE ? simPlayers().filter(p => inRace(p.x, p.z)).map(p => String(p.name || '')) : ['me']; }
// хто з людей зараз на поверхах гонки (офлайн — я, якщо не пішов деінде)
function onFloors() { return new Set(SIMSIDE ? simPlayers().filter(p => inRace(p.x, p.z)).map(p => p.name) : typeof pl !== 'undefined' && running && !pl.dead && inRace(pl.x, pl.z) ? ['me'] : []); }
function allReady() {
  const hum = ST.racers.filter(r => !r.bot); if (!hum.length) return false;
  return lobbyKeys().every(k => hum.some(r => r.k === k));
}
function snap() {
  return { ph: ST.ph, lb: ST.lob, nb: ST.nb, t: r2(ST.t), c: r2(ST.cnt), id: ST.id, v: ST.v, df: ST.def, vo: Object.entries(ST.votes).slice(0, 16), lp: ST.lp.slice(0, 16), r: ST.racers.map(r => [r.k, r.bot ? 1 : 0, r.lap, r.idx, r2(r.fin || 0), r.bot ? r2(r.x) : 0, r.bot ? r2(r.z) : 0, r.bot ? r2(r.h) : 0, r2(r.spin || 0), r2(r.drunk || 0), r2(r.slow || 0), r2(r.burn || 0), r.jet || (r.jetT > 0) ? 1 : 0]),
    tp: ST.traps.map(t => [t.id, r2(t.x), r2(t.z)]), fi: ST.fires.map(f => [f.id, r2(f.x), r2(f.z), r2(f.t)]), b: ST.boxes.map(b => b.map(v => v > 0 ? 1 : 0)), res: ST.res };
}
function applySnap(d) {
  ST.ph = d.ph || 'idle'; ST.lob = String(d.lb || ''); ST.nb = String(d.nb || '').slice(0, 40); ST.t = +d.t || 0; ST.cnt = +d.c || 0; ST.id = d.id | 0; ST.res = Array.isArray(d.res) ? d.res.slice(0, 8) : [];
  ST.def = clamp(d.df | 0, 0, VARS.length - 1);
  ST.lp = Array.isArray(d.lp) ? d.lp.slice(0, 16).map(String) : [];
  if (Array.isArray(d.vo)) { ST.votes = {}; for (const [k, v] of d.vo.slice(0, 16)) ST.votes[String(k)] = clamp(v | 0, 0, VARS.length - 1); }
  const v = clamp(d.v | 0, 0, VARS.length - 1); if (v !== ST.v || VV !== VARS[v]) { if (!RC.on || ST.ph === 'idle' || ST.ph === 'lobby') { ST.v = v; useVar(v); } }
  if (Array.isArray(d.r)) {
    const old = new Map(ST.racers.map(r => [r.k, r]));
    ST.racers = d.r.slice(0, MAXR).map(a => {
      const r = old.get(a[0]) || { k: String(a[0]) };
      Object.assign(r, { bot: !!a[1], lap: a[2] | 0, idx: a[3] | 0, fin: +a[4] || 0, spin: +a[8] || 0, drunk: +a[9] || 0, slow: +a[10] || 0, burn: +a[11] || 0, jet: a[12] ? 1 : 0 });
      if (r.bot) { r.tx = +a[5]; r.tz = +a[6]; r.th = +a[7]; if (r.x == null) { r.x = r.tx; r.z = r.tz; r.h = r.th; } }
      return r;
    });
  }
  if (Array.isArray(d.fi)) ST.fires = d.fi.slice(0, 12).map(a => ({ id: a[0], x: +a[1], z: +a[2], t: +a[3] }));
  if (Array.isArray(d.tp)) ST.traps = d.tp.slice(0, 12).map(a => ({ id: a[0], x: +a[1], z: +a[2] }));
  if (Array.isArray(d.b)) d.b.slice(0, ST.boxes.length).forEach((b, i) => { ST.boxes[i] = b.map(v => v ? 1 : 0); });
}
function pushState() { if (SIMSIDE) A.send('st', snap()); }
function emit(e) { if (SIMSIDE) A.send('ev', e); else onEvent(e); }
function req(k, d) { const o = Object.assign({ k }, d || {}); if (AUTH()) onReq(o, { id: NET.id, name: myName() }); else A.send('rq', o); }
A.onNet('st', (d, from) => { if (!SIMSIDE && !AUTH() && from.id === -1 && d) applySnap(d); });
A.onNet('ev', (d, from) => { if (!SIMSIDE && !AUTH() && from.id === -1 && d) onEvent(d); });
A.onNet('rq', (d, from) => { if (SIMSIDE && d) onReq(d, from); });

function onReq(d, from) {
  const k = keyOf(from), r = ST.racers.find(q => q.k === k);
  if (d.k === 'ready') {   // «Я готовий» з попапа лобі: готовий = записаний у заїзд
    if (ST.ph !== 'idle' && ST.ph !== 'lobby') { emit({ k: 'msg', to: k, txt: '🏁 Заїзд уже йде — дочекайся наступного (дивись і вболівай!).' }); return; }
    if (!d.on) {   // передумав
      if (!r) return; ST.racers = ST.racers.filter(q => q !== r);
      if (!ST.racers.some(q => !q.bot)) { ST.ph = 'idle'; ST.lob = ''; ST.nb = ''; ST.cnt = 0; ST.racers = []; }   // людей нема — боти розходяться
      else if (ST.lob === 'go' && !AU.forced) { ST.lob = 'fill'; ST.cnt = 0; }
      pushState(); return;
    }
    if (r) return;
    if (ST.racers.filter(q => !q.bot).length >= MAXR) { emit({ k: 'msg', to: k, txt: '🪑 У лобі вже 5 гравців — дочекайся наступного заїзду.' }); return; }
    ST.racers.push({ k, bot: false, lap: -1, idx: 0, fin: 0 });
    { const bi = ST.racers.map(q => q.bot).lastIndexOf(true); if (ST.racers.length > MAXR && bi >= 0) { const b = ST.racers.splice(bi, 1)[0]; emit({ k: 'msg', txt: `🤖 ${escapeHTML(b.k)} поступився місцем — ${escapeHTML(k === 'me' ? 'тобі' : k)}` }); } }   // повне лобі — людина замість бота
    if (ST.ph === 'idle') { ST.ph = 'lobby'; ST.lob = 'fill'; ST.nb = ''; ST.cnt = 0; AU.fillT = FILL().first; AU.forced = 0; ST.id++; ST.res = []; }
    if (SIMSIDE) emit({ k: 'msg', txt: `✅ ${escapeHTML(k)} готовий!` });
    pushState();
  } else if (d.k === 'vote') {
    if (ST.ph !== 'idle' && ST.ph !== 'lobby') return;
    const v = clamp(d.v | 0, 0, VARS.length - 1); if (ST.votes[k] === v) return;
    ST.votes[k] = v; ST.v = pickVar(); useVar(ST.v);
    emit({ k: 'msg', to: k, txt: `🗳️ Твій голос — за «${VARS[v].n}». Зараз лідирує «${VARS[ST.v].n}».` }); pushState();
  } else if (d.k === 'leave') {
    if (!r) return; ST.racers = ST.racers.filter(q => q !== r);
    if (!ST.racers.some(q => !q.bot)) resetRace(false); pushState();
  } else if (d.k === 'prog' && r && ST.ph === 'race' && !r.fin) {
    const lap = Math.max(-1, d.lap | 0), idx = d.idx | 0;
    if (lap >= r.lap && lap <= r.lap + 1) { r.lap = lap; r.idx = wrapI(idx); }
    if (lap >= LAPS) finish(r);
  } else if (d.k === 'box') {
    const b = ST.boxes[d.i | 0], s = d.s | 0; if (!b || !b[s] || ST.ph !== 'race') return;
    b[s] = 0; AU['box' + d.i + '_' + s] = 4; emit({ k: 'box', i: d.i | 0, s, to: k, item: rollItem(r) }); pushState();
  } else if (d.k === 'trap') {
    if (ST.traps.length > 10) ST.traps.shift();
    ST.traps.push({ id: ++AU.botId, x: r2(+d.x || 0), z: r2(+d.z || 0), t: 18 }); pushState();
  } else if (d.k === 'untrap') { ST.traps = ST.traps.filter(t => t.id !== d.id); pushState(); }
  else if (d.k === 'hit') { const v = ST.racers.find(q => q.k === d.to); if (v && ['spin', 'trap'].includes(d.how)) hitRacer(v, 'spin', k); else if (v && d.how === 'plane' && ST.ph === 'race') hitRacer(v, 'plane', k); }
  else if (d.k === 'plane' && r && ST.ph === 'race') emit({ k: 'plane', x: +d.x, z: +d.z, h: +d.h, from: k });   // ✈️ літачок летить — бачать усі
  else if (d.k === 'tea') { const lead = ranking().find(q => q.k !== k && !q.fin); if (lead) hitRacer(lead, 'tea', k); }
  else if (d.k === 'shot') emit({ k: 'shot', x: +d.x, z: +d.z, h: +d.h, from: k });
  else if (d.k === 'bomb' && r && ST.ph === 'race') {
    const sx = +d.sx, sz = +d.sz, tx = +d.tx, tz = +d.tz; if (![sx, sz, tx, tz].every(Number.isFinite)) return;
    launchAuth(sx, sz, tx, tz, k);
  } else if (d.k === 'molly' && r && ST.ph === 'race') {   // 🍾 кидок «молотова» — летить дугою, де впаде — палає
    const sx = +d.sx, sz = +d.sz, tx = +d.tx, tz = +d.tz; if (![sx, sz, tx, tz].every(Number.isFinite)) return;
    launchAuth(sx, sz, tx, tz, k, 'molly');
  } else if (d.k === 'jet' && r) { r.jet = d.on ? 1 : 0; pushState(); }   // 🧯 видно іншим: піна з-за крісла
  else if (d.k === 'burnt' && r) { r.burn = BURN_T; pushState(); }        // в'їхав у вогонь — сідушка в кіптяві
  else if (d.k === 'douse') { const f = ST.fires.find(q => q.id === d.id); if (f) douse(f, k); }
  else if (d.k === 'pfx') emit({ k: 'pfx', x: +d.x, z: +d.z, h: +d.h, from: k });
  else if (d.k === 'hook' && r && ST.ph === 'race') { const v = ST.racers.find(q => q.k === d.to && q !== r && !q.fin); if (v) hitRacer(v, 'hook', k); }
}
// бомба летить дугою; вибух рахує той, хто головний (сервер / сам гравець)
function launchAuth(sx, sz, tx, tz, by, kind) {
  const D = Math.hypot(tx - sx, tz - sz), T = r2(clamp(.4 + D * .035, .45, .95));
  AU.bombs.push({ x: tx, z: tz, t: T, by, kind: kind || 'bomb' });
  emit({ k: 'bomb', sx: r2(sx), sz: r2(sz), tx: r2(tx), tz: r2(tz), T, by, kind: kind || 'bomb' });
}
// 🔥 палаюча калюжа від «молотова»: лежить FIRE_T секунд (максимум 6 одночасно)
function igniteAt(x, z, by) {
  if (ST.fires.length >= 6) ST.fires.shift();
  const f = { id: ++AU.botId, x: r2(x), z: r2(z), t: FIRE_T, by };
  ST.fires.push(f); emit({ k: 'fire', id: f.id, x: f.x, z: f.z, by }); pushState(); return f;
}
// 🧯 піна гасить калюжу
function douse(f, by) { ST.fires = ST.fires.filter(q => q !== f); emit({ k: 'douse', id: f.id, x: f.x, z: f.z, by }); pushState(); }
function rollItem(r) {
  const rank = r ? ranking().indexOf(r) : 0;
  if (AU.forceItem) return AU.forceItem;   // тести: передбачуваний вміст коробки
  return rank >= 2 ? pick(['coffee', 'coffee', 'tea', 'stapler', 'bomb', 'bomb', 'ext', 'ext', 'molly', 'plane']) : rank === 1 ? pick(['coffee', 'stapler', 'folder', 'tea', 'bomb', 'ext', 'molly', 'plane']) : pick(['stapler', 'folder', 'folder', 'coffee', 'bomb', 'molly', 'molly', 'plane', 'plane']);
}
function hitRacer(v, how, by) {
  if (v.bot) {
    if (how === 'tea') v.drunk = 3;
    else if (how === 'boom') { v.spin = 1.3; v.v = 1; v.slow = 1.5; }
    else if (how === 'hook') { v.slow = 1.3; v.v = (v.v || 0) * .35; }
    else if (how === 'plane') { v.slow = PLANE_SLOW; v.v = (v.v || 0) * .6; }
    else if (how === 'fire') { v.spin = .6; v.v = (v.v || 0) * .5; v.slow = 1.6; v.burn = BURN_T; v.burnCd = 1.2; }
    else { v.spin = 1; v.v = 2; }
  }
  emit({ k: 'hit', to: v.k, how, by });
}
function finish(r) {
  if (r.fin) return;
  r.fin = r2(ST.t); r.lap = LAPS;
  const place = ST.racers.filter(q => q.fin).length;
  emit({ k: 'fin', who: r.k, place, time: r.fin, bot: r.bot ? 1 : 0 });
  if (!AU.firstFin) AU.firstFin = ST.t;
}
function resetRace(rotate) {
  ST.ph = 'idle'; ST.lob = ''; ST.nb = ''; AU.forced = 0; ST.racers = []; ST.traps = []; ST.fires = []; ST.cnt = 0; ST.t = 0; AU.firstFin = 0; AU.bombs = [];
  if (rotate) { ST.def = (ST.v + 1) % VARS.length; ST.votes = {}; }   // наступного разу — інший поверх, якщо ніхто не голосує
  ST.v = pickVar(); useVar(ST.v);
}
function startCount() {
  ST.v = pickVar(true); useVar(ST.v);   // переможець голосування (нічия — жереб)
  ST.racers = ST.racers.slice(0, MAXR); while (ST.racers.length < MAXR) ST.racers.push(mkBot(freeBot()));   // боти з лобі їдуть самі; бракує — ще
  ST.lob = '';
  ST.racers.forEach((r, i) => { const g = GRID(i); r.slot = i; r.lap = -1; r.idx = nearIdx(g.x, g.z);   // стоять перед лінією: перетнули — почалось коло 1
   r.fin = 0; if (r.bot) Object.assign(r, { x: g.x, z: g.z, h: g.h, v: 0, spin: 0, drunk: 0, slow: 0, item: '', itemT: rand(1, 3), lane: rand(-1.2, 1.2), bombs: START_BOMBS, bombCd: rand(3, 6), hookCd: rand(4, 8), pullT: 0, planes: 0, papCd: {}, mollies: MOLLY_START, jetT: 0, burn: 0, burnCd: 0, jet: 0, sc: 0, scLap: -9, slip: 0, boost: 0, prevIdx: null }); });
  ST.ph = 'count'; ST.cnt = 3.5; ST.t = 0; ST.traps = []; ST.fires = []; AU.firstFin = 0; AU.bombs = []; ST.boxes = ST.boxes.map(() => [1, 1, 1]);
  emit({ k: 'grid', id: ST.id, v: ST.v, slots: ST.racers.map(r => r.k) }); pushState();
}
function endRace(why) {
  ST.ph = 'end'; ST.cnt = 8;
  ST.res = ranking().map(r => r.k);
  emit({ k: 'end', res: ST.res, why: why || '' }); pushState();
}
const freeBot = () => BOT_NAMES.find(n => !ST.racers.some(q => q.k === n)) || 'Бот №' + ++AU.botId;
// люди в лобі: хто на поверхах гонки + хто вже готовий (максимум 5)
function lobbyHumans() { return [...new Set(lobbyKeys().concat(ST.racers.filter(r => !r.bot).map(r => r.k)))].slice(0, MAXR); }
/* лобі заповнюється: боти приходять по одному, поки разом з людьми не буде 5; тоді — «старт за 3» */
function lobbyTick(dt) {
  const F = FILL(), hum = lobbyHumans(), ready = ST.racers.filter(r => !r.bot), want = Math.max(0, MAXR - hum.length);
  let bots = ST.racers.filter(r => r.bot);
  if (bots.length > want) {   // прийшла людина — зайвий бот іде
    const b = bots[bots.length - 1]; ST.racers = ST.racers.filter(q => q !== b); bots = bots.slice(0, -1);
    emit({ k: 'msg', txt: `🤖 ${escapeHTML(b.k)} звільнив місце для колеги` }); pushState();
  }
  if (ST.lob === 'go') {   // «Старт за 3…2…1»; хтось передумав / прийшов новенький — стоп
    if (!AU.forced && !(allReady() && bots.length >= want)) { ST.lob = 'fill'; ST.cnt = 0; pushState(); return; }
    ST.cnt -= dt; if (ST.cnt <= 0) startCount(); return;
  }
  if (bots.length < want) {   // ще є місця — приходить наступний бот
    if (ST.lob !== 'fill') { ST.lob = 'fill'; AU.fillT = Math.max(AU.fillT, F.step); }
    if ((AU.fillT -= dt) <= 0) {
      const b = mkBot(freeBot()); ST.racers.push(b); ST.nb = b.k; AU.fillT = F.step;
      emit({ k: 'msg', txt: `🤖 ${escapeHTML(b.k)} приєднався до лобі` }); pushState();
    }
    return;
  }
  // лобі повне: усі люди готові — відлік; онлайн неготових чекаємо LOBBY_WAIT с, потім стартуємо без них
  if (allReady() && ready.length + bots.length >= 2) { ST.lob = 'go'; ST.cnt = F.go; AU.forced = 0; pushState(); return; }
  if (ST.lob !== 'wait') { ST.lob = 'wait'; AU.waitT = ST.cnt = LOBBY_WAIT; pushState(); }
  AU.waitT -= dt; ST.cnt = Math.max(0, AU.waitT);
  if (AU.waitT <= 0 && ready.length) { ST.lob = 'go'; ST.cnt = F.go; AU.forced = 1; emit({ k: 'msg', txt: '⏱️ Хто не встиг натиснути «Я готовий» — дивиться збоку. Стартуємо!' }); pushState(); }
}
function authTick(dt) {
  if (SIMSIDE) { const lp = lobbyKeys().slice(0, 16); if (lp.join('\n') !== ST.lp.join('\n')) { ST.lp = lp; pushState(); } }
  if (ST.ph === 'idle') return;
  if (ST.racers.length && (SIMSIDE || ST.ph === 'lobby')) {   // хто пішов з режиму (світу) — вибуває; офлайн — лише поки лобі
    const on = onFloors();
    const left = ST.racers.filter(r => !r.bot && !on.has(r.k)); if (left.length) { ST.racers = ST.racers.filter(r => !left.includes(r)); if (!ST.racers.some(q => !q.bot)) { resetRace(false); pushState(); return; } }
  }
  if (ST.ph === 'lobby') lobbyTick(dt);
  else if (ST.ph === 'count') { ST.cnt -= dt; if (ST.cnt <= 0) { ST.ph = 'race'; ST.t = 0; emit({ k: 'go' }); } }
  else if (ST.ph === 'race') {
    ST.t += dt;
    for (const r of ST.racers) if (r.bot && !r.fin) botTick(r, dt);
    for (let i = 0; i < ST.boxes.length; i++) for (let s = 0; s < 3; s++) if (!ST.boxes[i][s] && (AU['box' + i + '_' + s] = (AU['box' + i + '_' + s] || 0) - dt) <= 0) ST.boxes[i][s] = 1;
    for (const t of ST.traps) t.t = (t.t || 18) - dt; ST.traps = ST.traps.filter(t => t.t > 0);
    // бомби: вибух крутить і гальмує всіх поруч, змітає пастки
    for (const b of AU.bombs) if ((b.t -= dt) <= 0) {
      if (b.kind === 'molly') { igniteAt(b.x, b.z, b.by); continue; }
      emit({ k: 'boom', x: r2(b.x), z: r2(b.z), by: b.by });
      for (const r of ST.racers) { if (r.fin) continue; const p = posOf(r); if (dist2(p.x, p.z, b.x, b.z) < BOMB_R) hitRacer(r, 'boom', b.by); }
      const n0 = ST.traps.length; ST.traps = ST.traps.filter(t => dist2(t.x, t.z, b.x, b.z) > BOMB_R); if (n0 !== ST.traps.length) pushState();
    }
    AU.bombs = AU.bombs.filter(b => b.t > 0);
    // 🔥 калюжі догорають; кіптява на сідушках сходить
    const nf = ST.fires.length; for (const f of ST.fires) f.t -= dt; ST.fires = ST.fires.filter(f => f.t > 0); if (nf !== ST.fires.length) pushState();
    for (const r of ST.racers) if (r.burn > 0) r.burn = Math.max(0, r.burn - dt);
    const humans = ST.racers.filter(r => !r.bot);
    if (humans.length && humans.every(r => r.fin)) endRace();
    else if (AU.firstFin && ST.t - AU.firstFin > 40) endRace('Час вийшов — решта не доїхала.');
    else if (ST.t > 300) endRace('5 хвилин минуло.');
  } else if (ST.ph === 'end') { ST.cnt -= dt; if (ST.cnt <= 0) { resetRace(true); pushState(); } }
  AU.stT -= dt; if (AU.stT <= 0) { AU.stT = ST.ph === 'race' || ST.ph === 'count' ? .1 : .5; pushState(); }
}
// хто попереду в конусі (для ботів: вантуз, бомба)
function targetAhead(r, dmin, dmax, cone) {
  let best = null;
  for (const q of ST.racers) {
    if (q === r || q.fin) continue; const p = posOf(q), dx = p.x - r.x, dz = p.z - r.z, d = Math.hypot(dx, dz);
    if (d < dmin || d > dmax || (dx * Math.cos(r.h) + dz * Math.sin(r.h)) / d < cone) continue;
    if (!best || d < best.d) best = { q, x: p.x, z: p.z, d };
  }
  return best;
}
/* бот: їде за лінією траси, трохи зрізає, користується предметами, бомбами й вантузом */
function botTick(r, dt) {
  const SC = VV.SC;
  if (r.sc) { if (!inR(SC, r.x, r.z, -.5) || Math.abs(r.z - SC.bz) < 1.2) { r.sc = 0; r.idx = SC.ib; r.prevIdx = SC.ib; } }
  else r.idx = nearIdx(r.x, r.z, r.idx);
  r.slow = Math.max(0, (r.slow || 0) - dt); r.slip = Math.max(0, (r.slip || 0) - dt); r.bombCd -= dt; r.hookCd -= dt;
  if (r.spin > 0) { r.spin -= dt; r.h += 11 * dt; r.v *= Math.exp(-3 * dt); }
  else if (r.pullT > 0) {   // вантуз: летить до цілі
    r.pullT -= dt; const q = ST.racers.find(o => o.k === r.pullK), p = q ? posOf(q) : null;
    if (p) { r.h += clamp(angD(Math.atan2(p.z - r.z, p.x - r.x), r.h), -8 * dt, 8 * dt); if (dist2(r.x, r.z, p.x, p.z) < 2.2) r.pullT = 0; }
    r.v = 19; if (r.pullT <= 0) r.boost = Math.max(r.boost || 0, .4);
  } else {
    // пожежні двері: іноді ризикує зрізати, поки відчинено
    if (SC && !r.sc && inR(SC, r.x, r.z) && r.scLap !== r.lap && Math.abs(r.idx - SC.ia) < 6) { r.scLap = r.lap; if (doorOpen(ST.t) && doorOpen(ST.t + 1.2) && Math.random() < .55) r.sc = 1; }
    let tx, tz;
    if (r.sc) { tx = SC.bx; tz = SC.bz + 1.5; }
    else { const look = TR[wrapI(r.idx + 4)]; tx = look.x - look.dz * r.lane; tz = look.z + look.dx * r.lane; }
    let tg = Math.atan2(tz - r.z, tx - r.x); if (r.drunk > 0) { r.drunk -= dt; tg += Math.sin(ST.t * 3 + r.slot) * .7; }
    const dh = angD(tg, r.h); r.h += clamp(dh, -3 * dt * (r.slip > 0 ? .2 : 1), 3 * dt * (r.slip > 0 ? .2 : 1));
    const lead = ranking()[0], behind = lead && lead !== r ? Math.min(1, (score(lead) - score(r)) / N) : 0;   // хто відстає — трохи швидший
    const ah = TR[wrapI(r.idx + 6)], turn = 1 - (ah.dx * TR[r.idx].dx + ah.dz * TR[r.idx].dz);   // попереду поворот — пригальмувати
    const vmax = (r.boost > 0 ? VBOOST : VMAX) * (r.skill + behind * .08) * (Math.abs(dh) > .6 || turn > .3 || r.sc ? .7 : 1) * (r.slow > 0 ? .55 : 1);
    r.v += (vmax - r.v) * Math.min(1, dt * 1.6); if (r.boost > 0) r.boost -= dt;
    if (r.jetT > 0) { r.jetT -= dt; r.v = Math.max(r.v, JET_V * .85); }   // 🧯 реактивна піна
    if (Math.random() < dt * .3) r.lane = clamp(r.lane + rand(-.8, .8), -1.6, 1.6);
  }
  r.x += Math.cos(r.h) * r.v * dt; r.z += Math.sin(r.h) * r.v * dt;
  if (r.sc) r.x = clamp(r.x, SC.x0 + .5, SC.x1 - .5);
  else {
    const p = TR[r.idx], ox = r.x - p.x, oz = r.z - p.z, lat = -ox * p.dz + oz * p.dx;
    if (Math.abs(lat) > TW / 2 - .6) { const s = Math.sign(lat) * (TW / 2 - .6); r.x = p.x - p.dz * s; r.z = p.z + p.dx * s; r.v *= .85; const th = Math.atan2(p.dz, p.dx); r.h += angD(th, r.h) * .5; r.lane = -Math.sign(lat) * .5; }   // від стіни — назад на трасу
  }
  for (const z of VV.ZOMB) { const q = zombiePos(z, ST.t); if (dist2(r.x, r.z, q.x, q.z) < 1 && !(r.spin > 0)) { r.spin = .8; r.v *= .4; } }
  for (const t of ST.traps) if (dist2(r.x, r.z, t.x, t.z) < .9) { ST.traps = ST.traps.filter(q => q !== t); r.spin = 1; r.v = 2; break; }
  // 🔥 калюжа «молотова»: з піною — гасить, без — закрутить і обпалить
  r.burnCd = Math.max(0, (r.burnCd || 0) - dt);
  for (const f of ST.fires) if (dist2(r.x, r.z, f.x, f.z) < FIRE_R) { if (r.jetT > 0) { douse(f, r.k); break; } if (!(r.burnCd > 0)) { hitRacer(r, 'fire', f.by); break; } }
  for (const b of VV.BOOSTS) if (dist2(r.x, r.z, TR[b].x, TR[b].z) < 1.6) r.boost = Math.max(r.boost || 0, .7);
  VV.PAPER.forEach((q, i) => { if (!(r.papCd[i] > ST.t) && dist2(r.x, r.z, q.x, q.z) < 1.6) { r.papCd[i] = ST.t + PAPER_CD; r.planes = Math.min(PLANE_MAX, (r.planes || 0) + PLANE_PICK); } });   // ✈️ стос паперу
  for (const p of VV.PUD) if (dist2(r.x, r.z, p.x, p.z) < 1.3 && !(r.slip > 0)) { r.slip = .8; r.v *= .8; r.h += rand(-.4, .4); }
  // коробки з предметами
  VV.ITEMS.forEach((si, i) => [-1, 0, 1].forEach((o, s) => { if (ST.boxes[i][s] && !r.item) { const p = TR[si]; if (dist2(r.x, r.z, p.x - p.dz * o * 1.6, p.z + p.dx * o * 1.6) < .9) { ST.boxes[i][s] = 0; AU['box' + i + '_' + s] = 4; const it = rollItem(r); if (it === 'plane') r.planes = Math.min(PLANE_MAX, (r.planes || 0) + PLANE_PICK); else if (it === 'bomb') r.bombs = Math.min(MAX_BOMBS, (r.bombs || 0) + 1); else if (it === 'molly') r.mollies = Math.min(MAX_MOLLY, (r.mollies || 0) + 1); else { r.item = it; r.itemT = rand(.5, 2.5); } } } }));
  if (r.item && (r.itemT -= dt) <= 0) {
    if (r.item === 'coffee') r.boost = 1.6;
    else if (r.item === 'ext') r.jetT = FOAM_BOX;
    else if (r.item === 'folder') { ST.traps.push({ id: ++AU.botId, x: r2(r.x - Math.cos(r.h) * 1.3), z: r2(r.z - Math.sin(r.h) * 1.3), t: 18 }); }
    else if (r.item === 'tea') { const lead = ranking().find(q => q !== r && !q.fin); if (lead) hitRacer(lead, 'tea', r.k); }
    else if (r.item === 'stapler') {
      emit({ k: 'shot', x: r.x, z: r.z, h: r.h, from: r.k });
      const ahead = targetAhead(r, 0, 12, .93);
      if (ahead && Math.random() < .6) hitRacer(ahead.q, 'spin', r.k);
    }
    r.item = '';
  }
  // 💣 і 🪠 у ботів (не перші 3 секунди)
  if (!AU.noBotArms && !(r.spin > 0) && !(r.pullT > 0) && ST.t > 3) {
    const tg = targetAhead(r, 4, 14, .9);
    if (tg && r.hookCd <= 0 && Math.random() < dt * .9) { r.hookCd = rand(6, 9); r.pullK = tg.q.k; r.pullT = .5; emit({ k: 'pfx', x: r2(r.x), z: r2(r.z), h: r2(r.h), from: r.k }); hitRacer(tg.q, 'hook', r.k); }
    else if (tg && tg.d > 6 && r.bombs > 0 && r.bombCd <= 0 && Math.random() < dt * .7) { r.bombs--; r.bombCd = rand(5, 8); launchAuth(r.x, r.z, tg.x, tg.z, r.k); }
    else if (tg && tg.d > 3 && tg.d < 11 && r.planes > 0 && r.bombCd <= 0 && Math.random() < dt * .8) { r.planes--; r.bombCd = rand(2.5, 4); emit({ k: 'plane', x: r2(r.x), z: r2(r.z), h: r2(Math.atan2(tg.z - r.z, tg.x - r.x)), from: r.k }); if (Math.random() < .7) hitRacer(tg.q, 'plane', r.k); }   // ✈️
    else if (tg && tg.d > 5 && r.mollies > 0 && r.bombCd <= 0 && Math.random() < dt * .5) { r.mollies--; r.bombCd = rand(5, 8); launchAuth(r.x, r.z, tg.x + Math.cos(r.h) * 2, tg.z + Math.sin(r.h) * 2, r.k, 'molly'); }
  }
  const lapIdx = r.idx;
  if (r.prevIdx != null && r.prevIdx > N * .8 && lapIdx < N * .2) { r.lap++; if (r.lap >= LAPS) finish(r); }
  r.prevIdx = lapIdx;
}
function posOf(r) {
  if (r.bot) return { x: r.x, z: r.z };
  if (!SIMSIDE && r.k === myKey()) return { x: RC.x, z: RC.z };
  if (SIMSIDE) { const p = simPlayers().find(q => q.name === r.k); return p ? { x: p.x, z: p.z } : { x: 0, z: 0 }; }
  const p = Object.values(NET.players).find(q => q.name === r.k); return p ? { x: p.x, z: p.z } : { x: 1e4, z: 1e4 };
}
A.on('tick', dt => {
  if (AUTH()) authTick(dt);
  else if (ST.ph === 'race') { ST.t += dt; for (const r of ST.racers) if (r.bot && r.tx != null) { r.x = lerp(r.x, r.tx, Math.min(1, dt * 10)); r.z = lerp(r.z, r.tz, Math.min(1, dt * 10)); r.h = r.th; } }
  if (!SIMSIDE) clientTick(dt);
});

/* ======================= ДАЛІ — ЛИШЕ В ГРАВЦЯ ======================= */
const RC = { on: false, x: 0, z: 0, h: 0, v: 0, idx: 0, lap: 0, prev: 0, fin: false, item: '', boost: 0, spin: 0, drunk: 0, ix: 0, iz: 0, progT: 0, bonkT: 0, place: 0,
  bombs: 0, plCd: 0, slow: 0, slip: 0, drift: 0, driftIdle: 0, draft: 0, pull: null, sc: 0, nDraft: 0, nDrift: 0,
  foam: 0, jet: false, jetSnd: 0, molly: 0, burn: 0, burnCd: 0, nBurn: 0, nDouse: 0, doused: {}, planes: 0, nPlaneHit: 0 };
const V = { chairs: new Map(), vis: [], traps: new Map(), fires: new Map(), shots: [], plungers: [], bombs: [], ropes: [], hud: null, goalEl: null, lbl: null, tags: new Map(), music: -1, lastPh: '', arrow: null, startLbl: null, barOn: false, lobHide: false, lobOn: false, planes: [], papCd: {}, prePlanes: 0, sel: 'bomb', paperVis: [] };
const amIn = () => ST.racers.some(r => r.k === myKey());

/* ---------- Хмарочос у центрі міста (з city-kit; меші з текстурою — через A.dynamic, бо оптимізатор зливає їх в одноколірні) ---------- */
function cityRng(seed) { let s = Math.abs(seed | 0) % 2147483646 || 1; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
const CITY_TEX = {};
function windowTex(night, hue) {
  const k = (night ? 'n' : 'd') + hue; if (CITY_TEX[k]) return CITY_TEX[k];
  const c = document.createElement('canvas'); c.width = 128; c.height = 256; const x = c.getContext && c.getContext('2d');
  if (x && x.fillRect) {
    x.fillStyle = night ? '#1E1838' : ['#8FA6C9', '#A49BC9', '#9FB6C2', '#B7A6CF'][hue % 4]; x.fillRect(0, 0, 128, 256);
    for (let r = 0; r < 16; r++) for (let q = 0; q < 8; q++) {
      const lit = Math.random() < (night ? .45 : .2);
      x.fillStyle = lit ? (night ? pick(['#FFE7A0', '#FFD27A', '#BFE6FF']) : '#E8F1FF') : (night ? '#2A2350' : '#6E86AE');
      x.fillRect(q * 16 + 3, r * 16 + 4, 10, 9);
    }
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return CITY_TEX[k] = t;
}
// opt.avoid — прямокутники інших поверхів-трас поруч: там веж не ставимо
function buildTowerFloor(g, cx, cz, w, d, opt = {}) {
  const rnd = cityRng(opt.seed || Math.round(cx * 7 + cz * 13)), night = !!opt.night, front = opt.front == null ? 1.1 : opt.front;
  put(g, mesh(new THREE.BoxGeometry(w + 1.2, .5, d + 1.2), '#8E86B0', false, true), cx, -.26, cz);
  const tw = new THREE.MeshBasicMaterial({ map: windowTex(night, 1).clone() }); tw.map.needsUpdate = true; tw.map.repeat.set(w / 16, 88 / 3.6 / 16);
  const body = new THREE.Mesh(new THREE.BoxGeometry(w + .8, 88, d + .8), tw); body.position.set(cx, -44.5, cz); scene.add(A.dynamic(body));
  for (let y = -3.6; y > -88; y -= 3.6) put(g, mesh(new THREE.BoxGeometry(w + 1, .25, d + 1), '#6E668E', false), cx, y, cz);
  const glass = mat('#BFE6FF', { transparent: true, opacity: .22, depthWrite: false });
  const side = (x0, z0, x1, z1, h) => {
    const horiz = z0 === z1, len = horiz ? Math.abs(x1 - x0) : Math.abs(z1 - z0);
    const m = new THREE.Mesh(new THREE.BoxGeometry(horiz ? len : .08, h, horiz ? .08 : len), glass); m.position.set((x0 + x1) / 2, h / 2, (z0 + z1) / 2); g.add(m);
    for (let t = 0; t <= len + .01; t += 2) put(g, mesh(new THREE.BoxGeometry(.12, h, .12), '#4E4A6E', false), horiz ? Math.min(x0, x1) + t : x0, h / 2, horiz ? z0 : Math.min(z0, z1) + t);
    put(g, mesh(new THREE.BoxGeometry(horiz ? len : .2, .12, horiz ? .2 : len), '#4E4A6E', false), (x0 + x1) / 2, h, (z0 + z1) / 2);
  };
  const X0 = cx - w / 2 - .5, X1 = cx + w / 2 + .5, Z0 = cz - d / 2 - .5, Z1 = cz + d / 2 + .5;
  side(X0, Z0, X1, Z0, 2.8); side(X0, Z0, X0, Z1, 2.8); side(X1, Z0, X1, Z1, 2.8); side(X0, Z1, X1, Z1, front);
  const towers = [];
  for (let k = 0; k < 26; k++) {
    const a = rnd() * 6.283, r = Math.max(w, d) / 2 + 14 + rnd() * 48, tx = cx + Math.cos(a) * r, tz = cz + Math.sin(a) * r * .8;
    const bw = 8 + rnd() * 10, bd = 8 + rnd() * 10;
    if (Math.abs(tx - cx) < w / 2 + bw / 2 + 9 && Math.abs(tz - cz) < d / 2 + bd / 2 + 9) continue;
    if (towers.some(o => Math.abs(o.x - tx) < (o.w + bw) / 2 + 2 && Math.abs(o.z - tz) < (o.d + bd) / 2 + 2)) continue;
    if ((opt.avoid || []).some(o => tx + bw / 2 > o.x0 - 8 && tx - bw / 2 < o.x1 + 8 && tz + bd / 2 > o.z0 - 8 && tz - bd / 2 < o.z1 + 8)) continue;
    const top = -34 + rnd() * (tz > cz + d / 2 ? 28 : 62);
    towers.push({ x: tx, z: tz, w: bw, d: bd });
    const far = clamp((Math.hypot(tx - cx, tz - cz) - 25) / 70, 0, .75);
    const m = new THREE.MeshBasicMaterial({ map: windowTex(night, k).clone(), fog: false, color: new THREE.Color('#FFFFFF').lerp(new THREE.Color(night ? '#3A3060' : '#D9CCF2'), far) }); m.map.needsUpdate = true; m.map.repeat.set(bw / 16, (top + 92) / 3.6 / 16);
    const b = new THREE.Mesh(new THREE.BoxGeometry(bw, top + 92, bd), m); b.position.set(tx, (top - 92) / 2, tz); scene.add(A.dynamic(b));
    { const roof = new THREE.Mesh(new THREE.BoxGeometry(bw + .4, .5, bd + .4), new THREE.MeshBasicMaterial({ color: new THREE.Color('#6E668E').lerp(new THREE.Color(night ? '#3A3060' : '#D9CCF2'), far), fog: false })); roof.position.set(tx, top + .25, tz); scene.add(A.dynamic(roof)); }
    const kind = rnd();
    if (kind < .3) { put(g, mesh(new THREE.CylinderGeometry(bw * .3, bw * .3, .1, 20), '#3E3A5C', false), tx, top + .55, tz); put(g, mesh(new THREE.TorusGeometry(bw * .22, .12, 4, 20), bulb('#FFE066'), false), tx, top + .6, tz).rotation.x = Math.PI / 2; }
    else if (kind < .7) for (let q = 0; q < 3; q++) put(g, mesh(new THREE.BoxGeometry(1.4, .9, 1.4), '#C9CDD9', false), tx + (rnd() - .5) * bw * .6, top + .95, tz + (rnd() - .5) * bd * .6);
    else { put(g, mesh(new THREE.CylinderGeometry(.12, .12, 7, 5), '#C9CDD9', false), tx, top + 4, tz); put(g, mesh(new THREE.SphereGeometry(.3, 8, 6), bulb('#FF5C7A'), false), tx, top + 7.6, tz); }
  }
  put(g, mesh(new THREE.BoxGeometry(260, .5, 260), '#3E3A5C', false), cx, -92, cz);
  for (let k = -5; k <= 5; k++) { put(g, mesh(new THREE.BoxGeometry(260, .1, 3), '#2E2346', false), cx, -91.7, cz + k * 24); put(g, mesh(new THREE.BoxGeometry(3, .1, 260), '#2E2346', false), cx + k * 24, -91.7, cz); }
  return { x0: X0, x1: X1, z0: Z0, z1: Z1 };
}

/* ---------- Модель поверху: вежа, підлоги, траса, стіни, меблі, лобі з голосуванням ---------- */
function buildFloorMesh(VR) {
  const g = new THREE.Group(); scene.add(g);
  const vi = VR.vi, pal = VR.pal, TRv = VR.TR, Nv = VR.N, F = VR.F, X = x => VR.cx + x, Z = z => VR.cz + z;
  buildTowerFloor(g, (F.x0 + F.x1) / 2, (F.z0 + F.z1) / 2, F.x1 - F.x0, F.z1 - F.z0, { night: VR.night, avoid: VARS.filter(o => o !== VR).map(o => o.F) });
  const K = officeKit(g);
  K.floor(F.x0, F.z0, F.x1, F.z1, pal.base, .006);
  K.tiles(F.x0, F.z0, F.x1, VR.BB.z0, pal.lobby, '#FFFFFF');
  for (const [x0, z0, x1, z1, c, c2] of VR.floors) c2 ? K.tiles(X(x0), Z(z0), X(x1), Z(z1), c, c2) : K.floor(X(x0), Z(z0), X(x1), Z(z1), c);
  // підлога траси — офісний ковролін, обочини — смужки
  for (let i = 0; i < Nv; i++) {
    const p = TRv[i], seg = mesh(new THREE.BoxGeometry(p.l + .12, .04, TW), i % 16 < 8 ? pal.track[0] : pal.track[1], false, true);
    seg.position.set(p.x + p.dx * p.l / 2, .022 + (i % 2) * .002, p.z + p.dz * p.l / 2); seg.rotation.y = -Math.atan2(p.dz, p.dx); g.add(seg);
    if (i % 2 === 0) for (const s of [-1, 1]) {
      const ex = p.x + p.dx * p.l - p.dz * s * (TW / 2 - .09), ez = p.z + p.dz * p.l + p.dx * s * (TW / 2 - .09);
      if (VR.cross && nearOther(VR, i, ex, ez, TW / 2 - .2)) continue;   // на перехресті обочин нема
      const e = mesh(new THREE.BoxGeometry(p.l * 2 + .1, .05, .18), (i >> 1) % 2 ? pal.kerb[0] : pal.kerb[1], false); e.position.set(ex, .047, ez); e.rotation.y = -Math.atan2(p.dz, p.dx); g.add(e);
    }
  }
  // стіни коридорів (суцільні й скляні)
  for (const w of VR.WALLS) {
    const p = TRv[w.i], ang = -Math.atan2(p.dz, p.dx), glass = VR.glass(w.i);
    const m = mesh(new THREE.BoxGeometry(p.l + .06, glass ? 1.5 : 1.15, .2), glass ? mat('#BFE6FF', { transparent: true, opacity: .35 }) : pal.wall, !glass);
    m.position.set(w.x + p.dx * p.l / 2, glass ? .75 : .575, w.z + p.dz * p.l / 2); m.rotation.y = ang; g.add(m);
    const t = mesh(new THREE.BoxGeometry(p.l + .06, .08, .26), pal.top, false); t.position.set(m.position.x, glass ? 1.54 : 1.19, m.position.z); t.rotation.y = ang; g.add(t);
  }
  wallMeshes(g, VR.OW, pal);
  for (const [t, x, z, rot] of VR.FURN) {
    const XX = X(x), ZZ = Z(z);
    if (t === 'desk') K.desk(XX, ZZ, rot);
    else if (t === 'chair') K.chair(XX, ZZ, rot);
    else if (t === 'mtable') K.table(XX, ZZ, 6, 1.4, '#4E3A7C');
    else if (t === 'ktable') K.table(XX, ZZ, 2.4, 1.2, '#E8DCC8');
    else if (t === 'ctable') { const o = K.table(XX, ZZ, 1.6, .8, '#6B4A3A'); o.scale.y = .6; }
    else if (t === 'sofa') K.sofa(XX, ZZ, rot, 2.6, vi === 1 ? '#5FB3A8' : x < -1 ? '#6B4A3A' : '#8F7BD6');
    else if (t === 'plant') K.plant(XX, ZZ, rot);
    else if (t === 'cooler') K.cooler(XX, ZZ);
    else if (t === 'tv') K.tv(XX, ZZ, rot);
    else if (t === 'board') K.board(XX, ZZ, rot, 2.4);
    else if (t === 'counter') K.counter(XX, ZZ, rot, vi === 1 ? 3.6 : 6);
    else if (t === 'fridge') K.fridge(XX, ZZ, rot);
    else if (t === 'boss') K.bossDesk(XX, ZZ, rot);
    else if (t === 'shelf') K.shelf(XX, ZZ, rot, 2.4);
    else if (K[t]) K[t](XX, ZZ, rot);
  }
  // старт / фініш: шашечки й арка
  const s0 = TRv[0], ang = -Math.atan2(s0.dz, s0.dx);
  for (let k = 0; k < 8; k++) for (let j = 0; j < 2; j++) { const o = -TW / 2 + (k + .5) * TW / 8, m = mesh(new THREE.BoxGeometry(.35, .05, TW / 8), (k + j) % 2 ? '#2E2346' : '#FFFFFF', false); m.position.set(s0.x + s0.dx * (j - .5) * .35 - s0.dz * o, .05, s0.z + s0.dz * (j - .5) * .35 + s0.dx * o); m.rotation.y = ang; g.add(m); }
  for (const s of [-1, 1]) put(g, mesh(new THREE.BoxGeometry(.3, 3.2, .3), '#4E4A6E'), s0.x - s0.dz * s * (TW / 2 + .3), 1.6, s0.z + s0.dx * s * (TW / 2 + .3));
  const bar = put(g, mesh(new THREE.BoxGeometry(.3, .5, TW + 1), bulb('#FF6BD6'), false), s0.x, 3.1, s0.z); bar.rotation.y = ang;
  // бустери: кавові стрілки на підлозі
  for (const b of VR.BOOSTS) { const p = TRv[b]; for (let k = 0; k < 3; k++) { const c = mesh(new THREE.ConeGeometry(.45, .9, 3), bulb('#FFB347'), false); const wr = new THREE.Group(); wr.add(c); c.rotation.set(Math.PI / 2, 0, -Math.PI / 2); wr.position.set(p.x + p.dx * (k - 1) * .9, .07, p.z + p.dz * (k - 1) * .9); wr.rotation.y = -Math.atan2(p.dz, p.dx); g.add(wr); } }
  // калюжі й жовті таблички «Обережно, мокра підлога»
  for (const p of VR.PUD) {
    const m = mesh(new THREE.CylinderGeometry(1.15, 1.15, .02, 18), mat('#8FD3FF', { transparent: true, opacity: .6 }), false); m.position.set(p.x, .07, p.z); m.scale.z = .75; g.add(m);
    const sg = new THREE.Group(); for (const s of [-1, 1]) { const pnl = mesh(new THREE.BoxGeometry(.5, .7, .04), '#FFE066', false); pnl.position.set(0, .33, s * .14); pnl.rotation.x = s * .38; sg.add(pnl); } put(sg, mesh(new THREE.BoxGeometry(.2, .2, .2), '#2E2346', false), 0, .55, 0).scale.set(.2, 1, 1.6);
    sg.position.set(p.x + 1.1, 0, p.z - .6); g.add(sg);
  }
  // перехрестя (атріум): жовта сітка й світлофори
  if (VR.cross) {
    const cx = X(VR.cross[0]), cz = Z(VR.cross[1]);
    for (let k = -2; k <= 2; k++) for (const r of [Math.PI / 4, -Math.PI / 4]) put(g, mesh(new THREE.BoxGeometry(TW * 1.3, .03, .14), '#FFE066', false), cx + k * .9 * Math.cos(r + Math.PI / 2), .05, cz + k * .9 * Math.sin(r + Math.PI / 2)).rotation.y = r;
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const px = cx + sx * (TW / 2 + .5), pz = cz + sz * (TW / 2 + .5);
      put(g, mesh(new THREE.BoxGeometry(.14, 2.4, .14), '#2E2346'), px, 1.2, pz);
      put(g, mesh(new THREE.BoxGeometry(.32, .9, .3), '#2E2346'), px, 2.5, pz);
      ['#FF5C7A', '#FFE066', '#7FE08A'].forEach((c, k) => put(g, mesh(new THREE.SphereGeometry(.1, 8, 6), bulb(c), false), px, 2.8 - k * .28, pz + .16 * (sz < 0 ? 1 : -1)));
    }
  }
  // лобі: ліфти, стенд СТАРТ (F — відкрити лобі), диванчики й кулер (голосування — у попапі)
  const lz = VR.START.z;
  for (const x of [-22, -18.6]) { put(g, mesh(new THREE.BoxGeometry(2, 2.6, .2), '#C9CDD9'), X(x), 1.3, F.z0 + .2); put(g, mesh(new THREE.BoxGeometry(.04, 2.4, .22), '#8E86B0', false), X(x), 1.25, F.z0 + .22); put(g, mesh(new THREE.BoxGeometry(.5, .2, .05), bulb('#FF6BD6'), false), X(x), 2.8, F.z0 + .3); }
  K.plant(X(16), lz - 2.4, 1); K.plant(X(23), lz - 2.4, 1); K.sofa(X(19.5), lz - 2.6, 0, 2.6, '#6B4A3A'); K.plant(X(-25), lz + 2.6, 0);
  K.sofa(X(-2), lz - 2.6, 0, 2.6, '#8F7BD6'); K.sofa(X(5), lz - 2.6, 0, 2.6, '#8F7BD6'); K.plant(X(1.5), lz - 2.6, 1); K.cooler(X(9.5), lz - 2.5);
  put(g, mesh(new THREE.BoxGeometry(1.2, 1.1, .6), '#4E3A7C'), VR.START.x, .55, VR.START.z);
  put(g, mesh(new THREE.BoxGeometry(1.25, .08, .65), bulb('#7FE08A'), false), VR.START.x, 1.12, VR.START.z);
  // ✈️ стоси паперу біля бортика (візок + пачки А4 + табличка) і лоток з папером біля принтера в холі
  const paperStack = (x, z, rot) => {
    const o = new THREE.Group();
    put(o, mesh(new THREE.BoxGeometry(1.1, .5, .8), '#6BB8FF'), 0, .25, 0);
    put(o, mesh(new THREE.BoxGeometry(1.3, .03, 1), '#FFFFFF', false), 0, .03, 0);
    for (let k = 0; k < 6; k++) { const sh = put(o, mesh(new THREE.BoxGeometry(.62, .09, .44), k % 2 ? '#FFFFFF' : '#F2F0FA', false), (k % 3 - 1) * .04, .55 + k * .09, (k % 2) * .03); sh.rotation.y = (k % 3 - 1) * .12; }
    put(o, mesh(new THREE.BoxGeometry(.06, 1.5, .06), '#4E4A6E', false), .48, 1, -.3);
    put(o, mesh(new THREE.BoxGeometry(.7, .42, .05), '#6BB8FF', false), .48, 1.75, -.3);
    put(o, mesh(new THREE.BoxGeometry(.5, .08, .06), '#FFFFFF', false), .48, 1.8, -.27);
    o.position.set(x, 0, z); o.rotation.y = rot; o.scale.setScalar(1.3); g.add(o); return o;
  };
  for (const q of VR.PAPER) { const p = TRv[q.i]; paperStack(q.x, q.z, -Math.atan2(p.dz, p.dx)); }
  K.copier(VR.TRAY.x - 1.2, VR.TRAY.z, 0); paperStack(VR.TRAY.x, VR.TRAY.z, 0);
  const vis = { boxes: [], zomb: [], doors: [], vi, planes: [] };
  // над кожним стосом кружляє білий літачок — видно здалеку
  for (const q of VR.PAPER.concat([VR.TRAY])) { const m = new THREE.Group(), w = mesh(new THREE.ConeGeometry(.4, .85, 3), '#FFFFFF', false); w.rotation.z = -Math.PI / 2; w.scale.set(1, 1, .18); m.add(w); m.position.set(q.x, 2.3, q.z); scene.add(A.dynamic(m)); vis.planes.push({ m, q }); }
  // коробки з предметами (оживають), зомбі, прибиральниці, пожежні двері — динамічні
  VR.ITEMS.forEach((si, i) => { const p = TRv[si]; vis.boxes[i] = [-1, 0, 1].map(o => { const m = mesh(new THREE.BoxGeometry(.6, .6, .6), mat('#FFE066', { emissive: '#FFB347', emissiveIntensity: .5, transparent: true, opacity: .9 }), false); m.position.set(p.x - p.dz * o * 1.6, .6, p.z + p.dx * o * 1.6); scene.add(A.dynamic(m)); const q = mesh(new THREE.BoxGeometry(.12, .3, .62), '#2E2346', false); q.position.y = .05; m.add(q); return m; }); });
  for (const z of VR.ZOMB) {
    const h = buildOffice(pick(['#AFC4B6', '#C9D6CF']), z.mop ? '#7FE08A' : pick(['#3E4A7C', '#5A6BB5'])); h.root.scale.setScalar(.95); scene.add(A.dynamic(h.root));
    if (z.mop) { const mop = new THREE.Group(); put(mop, mesh(flat(new THREE.CylinderGeometry(.03, .03, 1.5, 5)), '#C4956A', false), 0, -.5, .1); put(mop, mesh(new THREE.BoxGeometry(.4, .12, .2), '#E9E2FA', false), 0, -1.25, .2); (h.hand || h.aR || h.body).add(mop); }
    vis.zomb.push({ z, h });
  }
  if (VR.SC) {
    const S = VR.SC, mx = (S.x0 + S.x1) / 2;
    for (const zz of [Z(-12.05), Z(-7.95)]) for (const s of [-1, 1]) {
      const d = new THREE.Group(); put(d, mesh(new THREE.BoxGeometry(2.4, 1.6, .16), '#E0607E'), 0, .8, 0); put(d, mesh(new THREE.BoxGeometry(2.2, .14, .18), '#FFFFFF', false), 0, 1.05, 0); put(d, mesh(new THREE.BoxGeometry(2.2, .14, .18), '#FFFFFF', false), 0, .55, 0);
      d.position.set(mx + s * 1.2, 0, zz); scene.add(A.dynamic(d)); vis.doors.push({ m: d, s, mx });
    }
    for (const zz of [Z(-12.05), Z(-7.95)]) { put(g, mesh(new THREE.BoxGeometry(.24, 2, .24), '#4E4A6E'), S.x0 - .1, 1, zz); put(g, mesh(new THREE.BoxGeometry(.24, 2, .24), '#4E4A6E'), S.x1 + .1, 1, zz); put(g, mesh(new THREE.BoxGeometry(S.x1 - S.x0 + .4, .2, .24), '#4E4A6E'), mx, 2, zz); const lamp = mesh(new THREE.SphereGeometry(.14, 8, 6), mat('#7FE08A', { emissive: '#7FE08A', emissiveIntensity: 1 }), false); lamp.position.set(mx, 2.2, zz); scene.add(A.dynamic(lamp)); vis.doors.push({ lamp }); }
  }
  V.vis[vi] = vis;
  return g;
}
function chairOf(k) {
  let c = V.chairs.get(k); if (c) return c;
  const g = new THREE.Group(); const ch = bodyMesh('chair'); g.add(ch);
  const r = ST.racers.find(q => q.k === k);
  if (r && r.bot) { const h = buildOffice(pick(['#AFC4B6', '#D9C7A9', '#C9D6CF']), pick(['#E0607E', '#7FE08A', '#6BB8FF', '#FFB347'])); h.root.position.set(0, .2, .05); h.l1.rotation.x = h.l2.rotation.x = -1.4; h.body.position.y = -.25; g.add(h.root); c = { g, h }; }
  else c = { g };
  // 🧯 вогнегасник соплом назад (видно, коли реактив) і кіптява на сідушці (після вогню)
  c.ext = new THREE.Group(); put(c.ext, mesh(flat(new THREE.CylinderGeometry(.13, .13, .55, 8)), '#E0303A', false), 0, 0, 0); put(c.ext, mesh(flat(new THREE.CylinderGeometry(.05, .05, .14, 6)), '#2E2346', false), 0, .33, 0);
  const noz = put(c.ext, mesh(flat(new THREE.ConeGeometry(.08, .3, 6)), '#2E2346', false), 0, .1, -.32); noz.rotation.x = -Math.PI / 2;
  c.ext.position.set(.42, .75, -.25); c.ext.visible = false; g.add(c.ext);
  c.soot = mesh(new THREE.CylinderGeometry(.42, .42, .04, 10), mat('#1E1A22', { transparent: true, opacity: .85 }), false); c.soot.position.set(0, .62, 0); c.soot.visible = false; g.add(c.soot);
  scene.add(g); V.chairs.set(k, c); return c;
}

/* ---------- Події ---------- */
function onEvent(e) {
  if (SIMSIDE || !e) return;
  const here = running && inRace(pl.x, pl.z);
  if (e.k === 'msg') { if (here && (!e.to || e.to === myKey())) toast(e.txt); }
  else if (e.k === 'grid') {
    ST.v = clamp(e.v | 0, 0, VARS.length - 1); useVar(ST.v);
    if (e.slots.includes(myKey())) seatMe(e.slots.indexOf(myKey()));
    else if (here) toast(`🏁 Заїзд почався на «${VARS[ST.v].n}» — дивись на табло або підтягуйся до наступного.`);
  }
  else if (e.k === 'go') { if (here) { banner('🏁 ПОЇХАЛИ!'); sfx('level'); } }
  else if (e.k === 'box') {
    if (e.to === myKey() && RC.on) {
      if (e.item === 'bomb') { RC.bombs = Math.min(MAX_BOMBS, RC.bombs + 1); sfx('pick'); ftext(pl.x, 2.6, pl.z, `💣 +1 бомба (${RC.bombs})`, 'gold'); }
      else if (e.item === 'ext') { RC.foam = Math.min(FOAM_MAX, RC.foam + FOAM_BOX); sfx('pick'); ftext(pl.x, 2.6, pl.z, `🧯 +піна (${Math.ceil(RC.foam)} с тяги) — тисни 3!`, 'gold'); }
      else if (e.item === 'plane') { RC.planes = Math.min(PLANE_MAX, RC.planes + PLANE_PICK); sfx('page'); ftext(pl.x, 2.6, pl.z, `✈️ +${PLANE_PICK} паперові літачки (${RC.planes}) — тисни 5!`, 'gold'); }
      else if (e.item === 'molly') { RC.molly = Math.min(MAX_MOLLY, RC.molly + 1); sfx('pick'); ftext(pl.x, 2.6, pl.z, `🍾 +1 коктейль Молотова (${RC.molly}) — тисни 4!`, 'gold'); }
      else if (!RC.item) { RC.item = e.item; sfx('pick'); ftext(pl.x, 2.6, pl.z, ICON[e.item] + ' ' + ITN[e.item], 'gold'); }
    }
  }
  else if (e.k === 'hit') {
    if (e.how === 'hook') V.ropes.push({ a: e.by, b: e.to, t: .55 });
    const byN = e.by && e.by !== 'me' && e.by !== myKey() ? escapeHTML(e.by) : '';
    if (e.to === myKey() && RC.on) {
      if (e.how === 'tea') { RC.drunk = 3.5; ftext(pl.x, 2.6, pl.z, `🍵 ${byN ? byN + ' напоїв тебе чаєм' : 'Чай!'} — світ пливе!`, 'bad'); }
      else if (e.how === 'boom') { RC.spin = 1.3; RC.v = 1; RC.slow = 1.5; RC.pull = null; shake = Math.max(shake, .7); sfx('hurt'); ftext(pl.x, 2.6, pl.z, `💥 ${byN ? 'Бомба від ' + byN : 'Бабах'}! Крутить…`, 'bad'); }
      else if (e.how === 'fire') { burnMe(byN); }
      else if (e.how === 'plane') { RC.slow = PLANE_SLOW; RC.v *= .6; RC.boost = 0; sfx('page'); burst(RC.x, 1.2, RC.z, '#FFFFFF', 12, 3, .6, 2); ftext(pl.x, 2.6, pl.z, `✈️ ${byN ? byN + ' поцілив' : 'Літачок'} тобі в окуляри — нічого не видно!`, 'bad'); }
      else if (e.how === 'hook') { RC.slow = 1.3; RC.v *= .35; RC.boost = 0; sfx('hurt'); ftext(pl.x, 2.6, pl.z, `🪠 ${byN || 'Хтось'} зачепив тебе вантузом!`, 'bad'); }
      else { RC.spin = 1; RC.v = 2; shake = Math.max(shake, .4); sfx('hurt'); ftext(pl.x, 2.6, pl.z, 'Закрутило! 🌀', 'bad'); }
    } else if (here) { const r = ST.racers.find(q => q.k === e.to); if (r) { const p = posOf(r); burst(p.x, 1, p.z, e.how === 'tea' ? '#7FE08A' : e.how === 'hook' ? '#E0607E' : e.how === 'fire' ? '#FF7A2E' : e.how === 'plane' ? '#FFFFFF' : '#FFE066', 10, 3, .5, 2); if (e.how === 'plane') ftext(p.x, 2.4, p.z, '✈️ Влучив!', e.by === myKey() ? 'gold' : ''); } }
  }
  else if (e.k === 'shot') { if (here && e.from !== myKey()) addShot(e.x, e.z, e.h, false); }
  else if (e.k === 'plane') { if (here && e.from !== myKey()) addPlane(+e.x, +e.z, +e.h, false); }
  else if (e.k === 'pfx') { if (here && e.from !== myKey()) addPlunger(+e.x, +e.z, +e.h, false); }
  else if (e.k === 'bomb') { if (here) launchBombFx(e); }
  else if (e.k === 'fire') {   // 🍾 пляшка розбилась — калюжа спалахнула
    if (!SIMSIDE && !ST.fires.some(f => f.id === e.id) && !AUTH()) ST.fires.push({ id: e.id, x: +e.x, z: +e.z, t: FIRE_T });
    if (!here) return; sfx('break', +e.x, +e.z); sfx('boom', +e.x, +e.z); burst(+e.x, .5, +e.z, '#FF7A2E', 22, 5, .7, 3); burst(+e.x, .4, +e.z, '#FFE066', 10, 3, .5, 2);
    if (dist2(pl.x, pl.z, +e.x, +e.z) < 10) shake = Math.max(shake, .25);
  }
  else if (e.k === 'douse') {   // 🧯 калюжу загасили піною
    ST.fires = ST.fires.filter(f => f.id !== e.id);
    if (!here) return; sfx('splash', +e.x, +e.z); burst(+e.x, .5, +e.z, '#FFFFFF', 18, 3, .9, 2.5); burst(+e.x, .8, +e.z, '#8C8C99', 8, 1.5, 1.2, 2);
    if (e.by === myKey()) { RC.nDouse++; ftext(+e.x, 2.4, +e.z, '🧯 Пожежу загашено! Охорона праці аплодує.', 'gold'); }
  }
  else if (e.k === 'boom') {
    if (!here) return;
    boomFX(+e.x, +e.z, BOMB_R * .8, .4); const d = dist2(pl.x, pl.z, +e.x, +e.z); sfx('boom', +e.x, +e.z); if (d < 12) shake = Math.max(shake, .5 * (1 - d / 12) + .1);
  }
  else if (e.k === 'fin') {
    if (!here) return;
    if (e.who === myKey()) { RC.fin = true; banner(`🏁 Фініш! ${e.place} місце · ${fmtT(e.time)}`); sfx(e.place === 1 ? 'legend' : 'level'); }
    else toast(`🏁 ${escapeHTML(e.who === 'me' ? 'Ти' : e.who)} фінішує ${e.place}-м (${fmtT(e.time)})`);
  }
  else if (e.k === 'end') finishMe(e);
}
const ICON = { coffee: '☕', stapler: '📎', folder: '📁', tea: '🍵', bomb: '💣', ext: '🧯', molly: '🍾', plane: '✈️' }, ITN = { plane: 'паперові літачки', coffee: 'кава — прискорення', stapler: 'степлер — стріляє вперед', folder: 'папка — пастка позаду', tea: 'чай — лідер п\'яніє', bomb: 'бомба', ext: 'піна для вогнегасника', molly: 'коктейль Молотова' };
const fmtT = t => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;
/* хотбар режиму: бомба, вантуз, вогнегасник і «молотов» (справжній інвентар не чіпаємо) */
const BAR = { slots: [
  { id: 'bomb', ic: '💣', n: 'Бомба', count: () => RC.bombs, use: () => throwBomb() },
  { id: 'plunger', ic: '🪠', n: 'Вантуз', count: () => RC.plCd > 0 ? 0 : 1, use: () => shootPlunger() },
  { id: 'ext', ic: '🧯', n: 'Вогнегасник', count: () => Math.ceil(RC.foam), use: () => toggleJet() },
  { id: 'molly', ic: '🍾', n: 'Коктейль Молотова', count: () => RC.molly, use: () => throwMolly() },
  { id: 'plane', ic: '✈️', get n() { return RC.planes ? 'Паперовий літачок' : 'де взяти: стос паперу'; }, count: () => RC.planes, use: () => throwPlane() },
] };
BAR.slots.forEach(sl => { const u = sl.use; sl.use = () => { V.sel = sl.id; return u(); }; });   // ЛКМ кидає вибране (💣 / 🍾 / ✈️)
function setBar(on) { if (V.barOn === on) return; V.barOn = on; if (typeof modeBar === 'function') modeBar(on ? BAR : null); }
function seatMe(slot) {
  const g = GRID(slot);
  Object.assign(RC, { on: true, x: g.x, z: g.z, h: g.h, v: 0, idx: nearIdx(g.x, g.z), lap: -1, prev: nearIdx(g.x, g.z), fin: false, item: '', boost: 0, spin: 0, drunk: 0, bombs: START_BOMBS, plCd: 0, slow: 0, slip: 0, drift: 0, driftIdle: 0, draft: 0, pull: null, sc: 0, foam: FOAM_START, jet: false, molly: MOLLY_START, burn: 0, burnCd: 0, doused: {}, planes: PLANE_START + V.prePlanes });
  V.prePlanes = 0; V.papCd = {}; V.sel = 'bomb';
  pl.x = g.x; pl.z = g.z; pl.y = 0; pl.jump = null; pl.falling = false;
  if (typeof camPos !== 'undefined') { camPos.set(g.x, 15, g.z + 11); camLook.set(g.x, .3, g.z); }
  closePanel(); setBar(true);
  toast(`🪑 «${VV.n}»: WASD — керуй · <b>1</b>/ЛКМ 💣 бомба · <b>2</b>/ПКМ 🪠 вантуз · <b>3</b> 🧯 реактивна піна · <b>4</b> 🍾 «молотов» · <b>5</b> ✈️ літачок (білі стоси паперу біля бортика — +3) · ПРОБІЛ — предмет. 3 кола!`);
}
function finishMe(e) {
  const was = RC.on || amIn(); RC.on = false; RC.item = ''; RC.pull = null; RC.jet = false; setBar(false);
  if (!was || !running) return;
  const place = (e.res || []).indexOf(myKey()) + 1;
  if (place > 0) {
    const coins = [0, 120, 70, 40, 20][place] || 10, xp = [0, 150, 100, 70, 50][place] || 40;
    P.coins += coins; addXP(xp);
    const d = A.data(); d.races = (d.races || 0) + 1; if (place === 1) d.wins = (d.wins || 0) + 1;
    d.fl = d.fl || {}; d.fl[ST.v] = (d.fl[ST.v] || 0) + 1;
    banner(place === 1 ? '🏆 ПЕРЕМОГА! Ти найшвидший офісник!' : `🏁 ${place} місце`);
    toast(`«${VV.n}» — результати: ${e.res.map((k, i) => `${i + 1}. ${escapeHTML(k === 'me' ? 'Ти' : k)}`).join(' · ')}<br>Нагорода: <b>+${coins} 🪙</b> · +${xp} досвіду${e.why ? '<br>' + e.why : ''}`);
    refreshHUD(); save();
  }
  pl.emoteT = 0;
}

/* ---------- Моє крісло: фізика й керування ---------- */
function drive(dt) {
  if (!RC.on) return;
  if (dist2(pl.x, pl.z, RC.x, RC.z) > 6) { leaveRace(); return; }   // гравця кудись перенесло (інший режим) — встає з крісла
  const canGo = ST.ph === 'race' && !RC.fin;
  let ix = canGo ? RC.ix : 0, iz = canGo ? RC.iz : 0;
  if (RC.drunk > 0) { RC.drunk -= dt; const a = Math.sin(gameTime * 2.4) * .9, c = Math.cos(a), s = Math.sin(a); [ix, iz] = [ix * c - iz * s, ix * s + iz * c]; }
  RC.slow = Math.max(0, RC.slow - dt); RC.slip = Math.max(0, RC.slip - dt); RC.plCd = Math.max(0, RC.plCd - dt);
  const h0 = RC.h;
  if (RC.spin > 0) { RC.spin -= dt; RC.h += 12 * dt; RC.v *= Math.exp(-3 * dt); }
  else if (RC.pull) {   // вантуз: рогатка до цілі
    const q = ST.racers.find(o => o.k === RC.pull.k), p = q ? posOf(q) : null;
    RC.pull.t -= dt;
    if (p) { RC.h += clamp(angD(Math.atan2(p.z - RC.z, p.x - RC.x), RC.h), -9 * dt, 9 * dt); RC.v = Math.max(RC.v, 21); }
    if (!p || RC.pull.t <= 0 || dist2(RC.x, RC.z, p.x, p.z) < 2.2) { RC.pull = null; RC.boost = Math.max(RC.boost, .5); }
  } else {
    const m = Math.min(1, Math.hypot(ix, iz)), grip = RC.slip > 0 ? .15 : 1;
    if (m > .15) {
      const dh = angD(Math.atan2(iz, ix), RC.h);
      RC.h += clamp(dh, -3.4 * dt * grip, 3.4 * dt * grip);
      const vmax = RC.jet ? JET_V : (RC.boost > 0 ? VBOOST : VMAX) * (RC.slow > 0 ? .55 : 1);   // 🧯 реактив не гальмує стелею швидкості
      RC.v += (Math.cos(dh) > -.2 ? 9 : -14) * m * dt * grip; RC.v = clamp(RC.v, -3, Math.max(vmax, Math.min(RC.v, 21) - 30 * dt));
    } else RC.v *= Math.exp(-(RC.slip > 0 ? .2 : 1.1) * dt);
    if (RC.boost > 0) { RC.boost -= dt; RC.v = Math.max(RC.v, VBOOST * .9); if (Math.random() < dt * 20) burst(RC.x - Math.cos(RC.h), .5, RC.z - Math.sin(RC.h), '#FFB347', 1, 1, .4, .5); }
  }
  // 🧯 вогнегасник соплом назад: реактивна тяга, поки є піна (WALL-E одобрює)
  if (RC.jet) {
    if (!canGo || RC.spin > 0 || RC.foam <= 0) stopJet(RC.foam <= 0 ? '🧯 Піна скінчилась — шукай коробки «?»' : '');
    else {
      RC.foam = Math.max(0, RC.foam - dt); RC.drift = 0;
      if (!RC.pull) RC.v = Math.min(JET_V, Math.max(RC.v, 4) + 40 * dt);
      if ((RC.jetSnd -= dt) <= 0) { RC.jetSnd = .22; sfx('pour'); if (Math.random() < .4) sfx('whoosh'); }
      shake = Math.max(shake, .08);
    }
  }
  RC.burn = Math.max(0, RC.burn - dt); RC.burnCd = Math.max(0, RC.burnCd - dt);
  // дрифт: довго й швидко крутиш у повороті — іскри; виїхав на пряму — буст
  if (canGo) {
    const turn = Math.abs(angD(RC.h, h0)) / Math.max(dt, 1e-3);
    if (!(RC.spin > 0) && !RC.pull && RC.v > 7 && turn > 1.6) {
      RC.drift += dt; RC.driftIdle = 0;
      if (RC.drift > .35 && Math.random() < dt * 25) burst(RC.x - Math.cos(RC.h) * .6, .25, RC.z - Math.sin(RC.h) * .6, RC.drift > .75 ? '#FFB347' : '#6BB8FF', 2, 2, .25, .6, .6);
    } else if (RC.drift > 0 && (RC.driftIdle += dt) > .12) {
      if (RC.drift >= .35) RC.nDrift++;
      if (RC.drift >= .75) { RC.boost = Math.max(RC.boost, 1); sfx('charged'); ftext(RC.x, 2.4, RC.z, '🔥 Супер-дрифт!', 'gold'); }
      else if (RC.drift >= .35) { RC.boost = Math.max(RC.boost, .5); sfx('dash'); ftext(RC.x, 2.4, RC.z, '💨 Дрифт-буст!', 'gold'); }
      RC.drift = 0;
    }
  }
  RC.x += Math.cos(RC.h) * RC.v * dt; RC.z += Math.sin(RC.h) * RC.v * dt;
  // борти траси (у пожежних дверях — проїзд, поки відчинено)
  RC.idx = nearIdx(RC.x, RC.z, RC.idx);
  const p = TR[RC.idx], lat = -(RC.x - p.x) * p.dz + (RC.z - p.z) * p.dx, lim = TW / 2 - .6, SC = VV.SC;
  if (Math.abs(lat) > lim) {
    if (SC && inR(SC, RC.x, RC.z) && (RC.sc || doorOpen(ST.t)) && ST.ph === 'race') { if (!RC.sc) { RC.sc = 1; ftext(RC.x, 2.4, RC.z, '🚒 Зріз!', 'gold'); } RC.x = clamp(RC.x, SC.x0 + .6, SC.x1 - .6); }
    else { const s = Math.sign(lat) * lim; RC.x = p.x - p.dz * s; RC.z = p.z + p.dx * s; RC.v *= .55; if ((RC.bonkT -= dt) <= 0) { RC.bonkT = .4; sfx('hit', RC.x, RC.z); shake = Math.max(shake, .15); } }
  } else RC.sc = 0;
  // інші гонщики — штовхаємось
  for (const r of ST.racers) { if (r.k === myKey()) continue; const q = posOf(r), d = dist2(RC.x, RC.z, q.x, q.z); if (d < 1 && d > .01) { RC.x += (RC.x - q.x) / d * (1 - d) * .6; RC.z += (RC.z - q.z) / d * (1 - d) * .6; RC.v *= .92; } }
  if (canGo) {
    // зомбі-офісники й прибиральниці переходять дорогу
    for (const z of VV.ZOMB) { const q = zombiePos(z, ST.t); if (dist2(RC.x, RC.z, q.x, q.z) < 1 && !(RC.spin > 0)) { RC.spin = .8; RC.v *= .4; sfx('hurt'); ftext(RC.x, 2.6, RC.z, z.mop ? pick(['Я ж щойно помила!', 'По мокрому не їздять!']) : pick(['Обережно, я на нараду!', 'Ей! Мій звіт!', 'Дивись куди їдеш!']), 'bad'); } }
    for (const t of ST.traps) if (dist2(RC.x, RC.z, t.x, t.z) < .9 && !(RC.spin > 0)) { req('untrap', { id: t.id }); ST.traps = ST.traps.filter(q => q !== t); RC.spin = 1; RC.v = 2; sfx('hurt'); ftext(RC.x, 2.6, RC.z, '📁 Папка під колесами!', 'bad'); break; }
    // 🔥 палаюча калюжа: з піною — гасиш, без — крутить, гальмує, обпалює сідушку
    for (const f of ST.fires) if (dist2(RC.x, RC.z, f.x, f.z) < FIRE_R) {
      if (RC.jet) { if (!RC.doused[f.id]) { RC.doused[f.id] = 1; req('douse', { id: f.id }); } }
      else if (!(RC.burnCd > 0)) { burnMe(''); req('burnt'); }
      break;
    }
    for (const b of VV.BOOSTS) if (dist2(RC.x, RC.z, TR[b].x, TR[b].z) < 1.6 && RC.boost <= 0) { RC.boost = .8; sfx('dash'); ftext(RC.x, 2.4, RC.z, '☕ Буст!', 'gold'); }
    VV.PAPER.forEach((q, i) => {   // ✈️ стос паперу біля бортика: проїхав крізь — складаєш 3 літачки на ходу
      if (!(V.papCd[i] > 0) && dist2(RC.x, RC.z, q.x, q.z) < 1.7) {
        if (RC.planes >= PLANE_MAX) { V.papCd[i] = 1.5; ftext(q.x, 2.2, q.z, `✈️ Більше ${PLANE_MAX} не влізе`, ''); return; }
        V.papCd[i] = PAPER_CD; RC.planes = Math.min(PLANE_MAX, RC.planes + PLANE_PICK); sfx('page'); burst(q.x, .9, q.z, '#FFFFFF', 12, 2.5, .6, 2);
        ftext(q.x, 2.4, q.z, `✈️ +${PLANE_PICK} літачки (${RC.planes}) — тисни 5 або ЛКМ`, 'gold');
      }
    });
    for (const q of VV.PUD) if (dist2(RC.x, RC.z, q.x, q.z) < 1.3 && !(RC.slip > 0)) { RC.slip = .9; RC.drift = 0; sfx('splash', RC.x, RC.z); ftext(RC.x, 2.4, RC.z, '💦 Мокра підлога! Не керується…', 'bad'); burst(q.x, .3, q.z, '#8FD3FF', 8, 2, .4, 1.5); }
    if (!RC.item) VV.ITEMS.forEach((si, i) => [-1, 0, 1].forEach((o, s) => { if (!RC.item && !RC.wantBox && ST.boxes[i][s]) { const q = TR[si]; if (dist2(RC.x, RC.z, q.x - q.dz * o * 1.6, q.z + q.dx * o * 1.6) < 1) { RC.wantBox = 1; setTimeout(() => { RC.wantBox = 0; }, 300); req('box', { i, s }); } } }));
    // слипстрім: тримаєшся позаду суперника — набираєш тягу
    let behind = false;
    for (const r of ST.racers) { if (r.k === myKey() || r.fin) continue; const q = posOf(r), dx = q.x - RC.x, dz = q.z - RC.z, d = Math.hypot(dx, dz); if (d > 1.4 && d < 7 && (dx * Math.cos(RC.h) + dz * Math.sin(RC.h)) / d > .93) behind = true; }
    if (behind && RC.v > 6 && !(RC.spin > 0)) { RC.draft += dt; if (Math.random() < dt * 12) burst(RC.x + Math.cos(RC.h) * 1.2, .7, RC.z + Math.sin(RC.h) * 1.2, '#FFFFFF', 1, 1, .3, .2, .5); if (RC.draft > 1.1) { RC.draft = 0; RC.nDraft++; RC.boost = Math.max(RC.boost, .7); sfx('whoosh'); ftext(RC.x, 2.4, RC.z, '🌬️ Слипстрім!', 'gold'); } }
    else RC.draft = Math.max(0, RC.draft - dt * 2);
    // кола
    if (RC.prev > N * .8 && RC.idx < N * .2) { RC.lap++; if (RC.lap < LAPS) { banner(RC.lap === LAPS - 1 ? '🔔 Останнє коло!' : `Коло ${RC.lap + 1} / ${LAPS}`); sfx('ding'); } RC.progT = 0; }
    else if (RC.prev < N * .2 && RC.idx > N * .8) RC.lap--;   // поїхав назад через старт
    RC.prev = RC.idx;
    if ((RC.progT -= dt) <= 0) { RC.progT = .25; req('prog', { lap: RC.lap, idx: RC.idx }); }
  }
  // я сиджу в кріслі
  pl.x = RC.x; pl.z = RC.z; pl.y = 0; pl.vy = 0; pl.falling = false; pl.face = Math.atan2(Math.cos(RC.h), Math.sin(RC.h)); pl.emote = 'sit'; pl.emoteT = 1; pl.atkCd = Math.max(pl.atkCd, .3);
  if (hero) { hero.root.position.set(pl.x, .35, pl.z); hero.root.rotation.y = pl.face; }
}
function useItem() {
  if (!RC.on || !RC.item || ST.ph !== 'race' || RC.spin > 0) return false;
  const it = RC.item; RC.item = '';
  if (it === 'coffee') { RC.boost = 1.8; sfx('drink'); ftext(pl.x, 2.6, pl.z, '☕ ТУРБО-ЕСПРЕСО!', 'gold'); }
  else if (it === 'folder') { req('trap', { x: RC.x - Math.cos(RC.h) * 1.4, z: RC.z - Math.sin(RC.h) * 1.4 }); sfx('page'); }
  else if (it === 'tea') { req('tea'); sfx('throw'); ftext(pl.x, 2.6, pl.z, '🍵 Лідеру — чаю!', 'calm'); }
  else if (it === 'stapler') { addShot(RC.x, RC.z, RC.h, true); req('shot', { x: r2(RC.x), z: r2(RC.z), h: r2(RC.h) }); sfx('staple'); }
  return true;
}
/* 💣 бомба: дугою вперед (з поправкою на швидкість) або в точку під курсором */
function throwBomb(aim) {
  if (!RC.on || ST.ph !== 'race' || RC.fin) { toast('💣 Бомби — лише під час заїзду.'); return false; }
  if (RC.spin > 0) return false;
  if (RC.bombs <= 0) { ftext(pl.x, 2.6, pl.z, '💣 Бомби скінчились — збирай коробки «?»', 'bad'); return false; }
  const fx = Math.cos(RC.h), fz = Math.sin(RC.h), D = 8 + Math.max(0, RC.v) * .35;
  let tx = RC.x + fx * D, tz = RC.z + fz * D;
  if (aim) { const dx = aim.x - RC.x, dz = aim.z - RC.z, d = Math.hypot(dx, dz); if (d > 2.5) { const k = clamp(d, 4, 15) / d; tx = RC.x + dx * k; tz = RC.z + dz * k; } }
  RC.bombs--; req('bomb', { sx: r2(RC.x), sz: r2(RC.z), tx: r2(tx), tz: r2(tz) }); sfx('throw');
  return true;
}
/* 🧯 вогнегасник: 3 — увімкнути/вимкнути реактивну піну (тримає, поки є заряд) */
function toggleJet() {
  if (!RC.on || ST.ph !== 'race' || RC.fin) { toast('🧯 Вогнегасник-реактив — лише під час заїзду.'); return false; }
  if (RC.jet) { stopJet(''); return true; }
  if (RC.spin > 0) return false;
  if (RC.foam <= .05) { ftext(pl.x, 2.6, pl.z, '🧯 Піни нема — збирай коробки «?»', 'bad'); return false; }
  RC.jet = true; RC.jetSnd = 0; RC.pull = null; req('jet', { on: 1 }); sfx('whoosh'); sfx('dash');
  ftext(pl.x, 2.6, pl.z, '🧯 ПШШШ! Реактивна тяга!', 'gold'); return true;
}
function stopJet(msg) { if (!RC.jet) return; RC.jet = false; req('jet', { on: 0 }); if (msg) ftext(pl.x, 2.6, pl.z, msg, 'bad'); }
/* 🍾 коктейль Молотова: дугою вперед (або в курсор) — де впаде, кілька секунд горить калюжа */
function throwMolly(aim) {
  if (!RC.on || ST.ph !== 'race' || RC.fin) { toast('🍾 «Молотови» — лише під час заїзду.'); return false; }
  if (RC.spin > 0) return false;
  if (RC.molly <= 0) { ftext(pl.x, 2.6, pl.z, '🍾 Пляшки скінчились — збирай коробки «?»', 'bad'); return false; }
  const fx = Math.cos(RC.h), fz = Math.sin(RC.h), D = 7 + Math.max(0, RC.v) * .35;
  let tx = RC.x + fx * D, tz = RC.z + fz * D;
  if (aim) { const dx = aim.x - RC.x, dz = aim.z - RC.z, d = Math.hypot(dx, dz); if (d > 2) { const k = clamp(d, 2.5, 14) / d; tx = RC.x + dx * k; tz = RC.z + dz * k; } }
  RC.molly--; req('molly', { sx: r2(RC.x), sz: r2(RC.z), tx: r2(tx), tz: r2(tz) }); sfx('throw');
  return true;
}
/* ✈️ паперовий літачок: летить уперед (або в курсор) пологою дугою; влучив — суперник «осліп» і пригальмував */
function throwPlane(aim) {
  if (!RC.on || ST.ph !== 'race' || RC.fin) { toast('✈️ Літачки — лише під час заїзду. Папір для них — у лотку в холі (F) і в стосах біля траси.'); return false; }
  if (RC.spin > 0) return false;
  if (RC.planes <= 0) { toast('✈️ Літачків нема — проїдь крізь білий стос паперу біля бортика (табличка «✈️ Папір для літачків») або візьми коробку «?».'); ftext(pl.x, 2.6, pl.z, '✈️ 0 — шукай стос паперу', 'bad'); return false; }
  let h = RC.h; if (aim) { const dx = aim.x - RC.x, dz = aim.z - RC.z; if (Math.hypot(dx, dz) > 1.5) h = Math.atan2(dz, dx); }
  RC.planes--; addPlane(RC.x, RC.z, h, true); req('plane', { x: r2(RC.x), z: r2(RC.z), h: r2(h) }); sfx('whoosh');
  return true;
}
function addPlane(x, z, h, mine) {
  const m = new THREE.Group(), w = mesh(new THREE.ConeGeometry(.42, .9, 3), '#FFFFFF', false); w.rotation.z = -Math.PI / 2; w.scale.set(1, 1, .18); m.add(w);
  const k = mesh(new THREE.BoxGeometry(.8, .1, .04), '#DCD6EA', false); k.position.y = -.06; m.add(k);
  m.position.set(x + Math.cos(h) * .9, 1.2, z + Math.sin(h) * .9); m.rotation.y = -h; scene.add(m);
  V.planes.push({ m, h, t: 0, mine, v: 17 + (mine ? Math.max(0, RC.v) * .6 : 6) });
}
// мене обпалило калюжею
function burnMe(byN) {
  RC.spin = .6; RC.v *= .5; RC.slow = 1.6; RC.burn = BURN_T; RC.burnCd = 1.2; RC.pull = null; RC.nBurn++;
  shake = Math.max(shake, .35); sfx('hurt'); burst(RC.x, .6, RC.z, '#FF7A2E', 14, 3, .6, 2.5);
  ftext(pl.x, 2.6, pl.z, `🔥 ${byN ? byN + ' підпалив тобі сідушку' : 'Сідушка горить'}! Аааа!`, 'bad');
}
/* 🪠 вантуз: летить уперед, чіпляє першого — тебе тягне до нього, його гальмує */
function shootPlunger() {
  if (!RC.on || ST.ph !== 'race' || RC.fin || RC.spin > 0) return false;
  if (RC.plCd > 0) { ftext(pl.x, 2.6, pl.z, `🪠 Перезарядка ${RC.plCd.toFixed(1)} с`, 'bad'); return false; }
  RC.plCd = HOOK_CD; addPlunger(RC.x, RC.z, RC.h, true); req('pfx', { x: r2(RC.x), z: r2(RC.z), h: r2(RC.h) }); sfx('cast');
  return true;
}
function addShot(x, z, h, mine) {
  const m = mesh(new THREE.BoxGeometry(.45, .14, .2), '#C9CDD9', false); m.position.set(x + Math.cos(h) * .9, .7, z + Math.sin(h) * .9); scene.add(m);
  V.shots.push({ m, h, t: 0, mine });
}
function addPlunger(x, z, h, mine) {
  const m = new THREE.Group(); const cup = mesh(flat(new THREE.ConeGeometry(.22, .28, 10)), '#E0607E', false); cup.rotation.z = Math.PI / 2; cup.position.x = .2; m.add(cup);
  const st = mesh(flat(new THREE.CylinderGeometry(.04, .04, .7, 5)), '#C4956A', false); st.rotation.z = Math.PI / 2; st.position.x = -.25; m.add(st);
  m.position.set(x + Math.cos(h) * .9, .8, z + Math.sin(h) * .9); m.rotation.y = -h; scene.add(m);
  V.plungers.push({ m, h, t: 0, mine, sx: x, sz: z });
}
function launchBombFx(e) {
  const b = { sx: +e.sx, sz: +e.sz, tx: +e.tx, tz: +e.tz, T: clamp(+e.T || .7, .3, 1.2), t: 0 };
  if (![b.sx, b.sz, b.tx, b.tz].every(Number.isFinite)) return;
  if (e.kind === 'molly') {   // 🍾 пляшка з ганчіркою, що горить
    b.m = new THREE.Group(); put(b.m, mesh(flat(new THREE.CylinderGeometry(.12, .15, .42, 8)), mat('#5FAF6A', { transparent: true, opacity: .85 }), false), 0, 0, 0);
    put(b.m, mesh(flat(new THREE.CylinderGeometry(.05, .07, .16, 6)), '#5FAF6A', false), 0, .28, 0); put(b.m, mesh(new THREE.BoxGeometry(.14, .1, .14), '#E8D7B0', false), 0, .4, 0);
    b.spark = put(b.m, mesh(new THREE.ConeGeometry(.1, .3, 6), bulb('#FF7A2E'), false), 0, .58, 0); scene.add(b.m); V.bombs.push(b); return;
  }
  b.m = new THREE.Group(); put(b.m, mesh(new THREE.SphereGeometry(.26, 8, 6), '#2E2346'), 0, 0, 0); put(b.m, mesh(flat(new THREE.CylinderGeometry(.03, .03, .2, 5)), '#E8D7B0'), 0, .28, 0);
  b.spark = put(b.m, mesh(new THREE.SphereGeometry(.08, 6, 4), bulb('#FFD27A'), false), 0, .4, 0); scene.add(b.m); V.bombs.push(b);
}
function updShots(dt) {
  for (let i = V.shots.length - 1; i >= 0; i--) {
    const s = V.shots[i]; s.t += dt; s.m.position.x += Math.cos(s.h) * 26 * dt; s.m.position.z += Math.sin(s.h) * 26 * dt; s.m.rotation.y += dt * 20;
    let hit = null;
    if (s.mine) for (const r of ST.racers) { if (r.k === myKey() || r.fin) continue; const q = posOf(r); if (dist2(q.x, q.z, s.m.position.x, s.m.position.z) < 1) { hit = r; break; } }
    if (hit) { req('hit', { to: hit.k, how: 'spin' }); burst(s.m.position.x, 1, s.m.position.z, '#FFE066', 10, 3, .5, 2); }
    if (hit || s.t > 1.2) { scene.remove(s.m); V.shots.splice(i, 1); }
  }
  for (let i = V.plungers.length - 1; i >= 0; i--) {
    const s = V.plungers[i]; s.t += dt; s.m.position.x += Math.cos(s.h) * 30 * dt; s.m.position.z += Math.sin(s.h) * 30 * dt;
    let hit = null;
    if (s.mine && RC.on) for (const r of ST.racers) { if (r.k === myKey() || r.fin) continue; const q = posOf(r); if (dist2(q.x, q.z, s.m.position.x, s.m.position.z) < 1.3) { hit = r; break; } }
    if (hit) { RC.pull = { k: hit.k, t: .55 }; req('hook', { to: hit.k }); sfx('hop'); ftext(RC.x, 2.6, RC.z, '🪠 Чпок! Тягне вперед!', 'gold'); }
    if (hit || s.t > .55) { scene.remove(s.m); V.plungers.splice(i, 1); }
  }
  for (let i = V.planes.length - 1; i >= 0; i--) {   // ✈️ літачок планує, похитуючись; влучив — біла хмарка паперу
    const s = V.planes[i]; s.t += dt; s.m.position.x += Math.cos(s.h) * s.v * dt; s.m.position.z += Math.sin(s.h) * s.v * dt;
    s.m.position.y = 1.2 + Math.sin(s.t * Math.PI / 1.3) * .9 - s.t * .5; s.m.rotation.x = Math.sin(s.t * 9) * .35;
    if (Math.random() < dt * 14) burst(s.m.position.x, s.m.position.y, s.m.position.z, '#FFFFFF', 1, .3, .3, 0, .4);
    let hit = null;
    if (s.mine && RC.on) for (const r of ST.racers) { if (r.k === myKey() || r.fin) continue; const q = posOf(r); if (dist2(q.x, q.z, s.m.position.x, s.m.position.z) < 1.3) { hit = r; break; } }
    if (hit) { RC.nPlaneHit++; req('hit', { to: hit.k, how: 'plane' }); burst(s.m.position.x, 1, s.m.position.z, '#FFFFFF', 14, 3, .6, 2); sfx('page'); }
    if (hit || s.t > 1.3) { if (!hit) burst(s.m.position.x, .4, s.m.position.z, '#FFFFFF', 5, 1.5, .4, 1); scene.remove(s.m); V.planes.splice(i, 1); }
  }
  for (let i = V.bombs.length - 1; i >= 0; i--) {
    const b = V.bombs[i]; b.t += dt; const k = Math.min(1, b.t / b.T);
    b.m.position.set(lerp(b.sx, b.tx, k), lerp(1.4, .3, k) + Math.sin(k * Math.PI) * 3, lerp(b.sz, b.tz, k)); b.m.rotation.x += dt * 8; b.spark.visible = Math.sin(gameTime * 40) > 0;
    if (k >= 1) { scene.remove(b.m); V.bombs.splice(i, 1); }
  }
}
// мотузки вантуза між кріслами
function updRopes(dt) {
  if (RC.pull && !V.ropes.some(o => o.a === myKey() && o.b === RC.pull.k)) V.ropes.push({ a: myKey(), b: RC.pull.k, t: RC.pull.t });
  for (let i = V.ropes.length - 1; i >= 0; i--) {
    const o = V.ropes[i]; o.t -= dt;
    const ra = ST.racers.find(q => q.k === o.a), rb = ST.racers.find(q => q.k === o.b);
    if (o.t <= 0 || !ra || !rb) { if (o.m) scene.remove(o.m); V.ropes.splice(i, 1); continue; }
    if (!o.m) { o.m = new THREE.Group(); const l = mesh(new THREE.BoxGeometry(1, .05, .05), '#E0607E', false); l.position.x = .5; o.m.add(l); const cup = mesh(flat(new THREE.ConeGeometry(.22, .28, 10)), '#E0607E', false); cup.rotation.z = -Math.PI / 2; cup.position.x = 1; o.m.add(cup); o.l = l; o.cup = cup; scene.add(o.m); }
    const a = posOf(ra), b = posOf(rb), d = Math.hypot(b.x - a.x, b.z - a.z) || .01;
    o.m.position.set(a.x, .8, a.z); o.m.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x); o.l.scale.x = d; o.l.position.x = d / 2; o.cup.position.x = d - .2;
  }
}

/* ---------- Кожен кадр ---------- */
function clientTick(dt) {
  const t = gameTime, here = running && inRace(pl.x, pl.z), fl = floorAt(pl.x, pl.z);
  if (RC.on && ((!amIn() && ST.ph !== 'end') || !running || pl.dead)) { RC.on = false; RC.pull = null; pl.emoteT = 0; }
  if (RC.on) drive(dt);
  setBar(RC.on && running);
  updShots(dt); updRopes(dt);
  for (const k in V.papCd) V.papCd[k] -= dt;
  lobby(here);
  // крісла всіх гонщиків
  const seen = new Set();
  for (const r of ST.racers) {
    if (ST.ph === 'idle' || ST.ph === 'lobby') break;
    seen.add(r.k); const c = chairOf(r.k);
    let x, z, f;
    if (r.k === myKey() && RC.on) { x = RC.x; z = RC.z; f = pl.face; }
    else if (r.bot) { x = r.x; z = r.z; f = Math.atan2(Math.cos(r.h), Math.sin(r.h)) + (r.spin > 0 ? t * 12 : 0); }
    else { const p = Object.values(NET.players).find(q => q.name === r.k); if (!p) { c.g.visible = false; continue; } x = p.x; z = p.z; f = p.face; }
    const jet = r.k === myKey() && RC.on ? RC.jet : !!r.jet, burn = r.k === myKey() && RC.on ? RC.burn : r.burn || 0;
    c.ext.visible = jet; c.soot.visible = burn > 0;
    if (jet && Math.random() < dt * 40) { const bh = r.k === myKey() && RC.on ? RC.h : r.bot ? r.h : Math.atan2(Math.cos(f), Math.sin(f)); burst(x - Math.cos(bh) * 1.1, .6, z - Math.sin(bh) * 1.1, '#FFFFFF', 2, 2.5, .8, .4, 1.3); }   // біла піна шлейфом
    if (burn > 0 && Math.random() < dt * 8) burst(x, 1, z, burn > BURN_T - 1.5 ? '#FF7A2E' : '#5A5560', 1, .6, .9, 1.6, .9);   // кіптява й дим
    c.g.visible = true; c.g.position.set(x, 0, z); c.g.rotation.y = f; c.g.rotation.z = r.drunk > 0 || (r.k === myKey() && RC.drunk > 0) ? Math.sin(t * 6) * .12 : 0;
  }
  for (const [k, c] of V.chairs) if (!seen.has(k)) { scene.remove(c.g); V.chairs.delete(k); }
  // коробки, зомбі, двері, майданчики — на всіх поверхах (рахується лише поточна траса)
  const race = ST.ph === 'race';
  V.vis.forEach((vis, vi) => {
    if (!vis) return;
    const act = vi === ST.v && race, zt = act ? ST.t : t * .3;
    vis.boxes.forEach((row, i) => row.forEach((m, s) => { m.visible = act ? !!ST.boxes[i][s] : true; m.rotation.y = t * 1.5 + s; m.position.y = .6 + Math.sin(t * 3 + s) * .1; }));
    for (const zz of vis.zomb) { const q = zombiePos(zz.z, zt); zz.h.root.position.set(q.x, 0, q.z); const sg = Math.cos(zt * zz.z.sp + zz.z.ph) > 0 ? 1 : -1; zz.h.root.rotation.y = Math.atan2(zz.z.ax * sg, zz.z.az * sg); zz.h.l1.rotation.x = Math.sin(t * (zz.z.mop ? 3 : 6)) * .5; zz.h.l2.rotation.x = -Math.sin(t * (zz.z.mop ? 3 : 6)) * .5; if (zz.z.mop && zz.h.aR) zz.h.aR.rotation.x = -.6 + Math.sin(t * 4) * .4; }
    for (const pp of vis.planes) { const a = t * 1.6 + pp.q.x; pp.m.position.set(pp.q.x + Math.cos(a) * .6, 2.3 + Math.sin(t * 2.2) * .15, pp.q.z + Math.sin(a) * .6); pp.m.rotation.y = -a - Math.PI / 2; }
    const dt0 = act ? ST.t : t, open = doorOpen(dt0), soon = open && !doorOpen(dt0 + 1);
    for (const d of vis.doors) {
      if (d.m) { const tx = d.mx + d.s * (open ? 3.5 : 1.2); d.m.position.x = lerp(d.m.position.x, tx, Math.min(1, dt * 6)); }
      else if (d.lamp) d.lamp.material.color.set(open ? (soon && Math.sin(t * 20) > 0 ? '#FFE066' : '#7FE08A') : '#FF5C7A');
    }
  });
  const tids = new Set(ST.traps.map(q => q.id));
  for (const tp of ST.traps) if (!V.traps.has(tp.id)) { const m = mesh(new THREE.BoxGeometry(.8, .06, .6), '#FFB347', false); m.position.set(tp.x, .07, tp.z); m.rotation.y = rand(0, 3); scene.add(m); V.traps.set(tp.id, m); }
  for (const [id, m] of V.traps) if (!tids.has(id)) { scene.remove(m); V.traps.delete(id); }
  // 🔥 палаючі калюжі «молотова»: обвуглена пляма + язики полум'я, що тремтять
  const fids = new Set(ST.fires.map(q => q.id));
  for (const f of ST.fires) {
    let o = V.fires.get(f.id);
    if (!o) {
      o = { g: new THREE.Group(), fl: [] }; const sp = mesh(new THREE.CylinderGeometry(FIRE_R, FIRE_R, .03, 18), mat('#2A1E1A', { transparent: true, opacity: .8 }), false); sp.position.y = .04; o.g.add(sp);
      const glow = mesh(new THREE.CylinderGeometry(FIRE_R * .8, FIRE_R * .8, .04, 16), bulb('#FF7A2E'), false); glow.position.y = .06; o.g.add(glow); o.glow = glow;
      for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2, rr = i ? FIRE_R * .55 : 0, fl = mesh(new THREE.ConeGeometry(.28, 1, 6), bulb(i % 2 ? '#FFB347' : '#FF5A2E'), false); fl.position.set(Math.cos(a) * rr, .45, Math.sin(a) * rr); o.g.add(fl); o.fl.push(fl); }
      o.g.position.set(f.x, 0, f.z); scene.add(o.g); V.fires.set(f.id, o);
    }
    const k = clamp(f.t / 1.2, 0, 1);   // догорає — меншає
    o.fl.forEach((fl, i) => { const s = (.7 + Math.sin(t * 13 + i * 2.1) * .25) * (.35 + k * .65); fl.scale.set(s, s * (1.1 + Math.sin(t * 9 + i) * .3), s); });
    o.glow.visible = Math.sin(t * 17) > -.6;
    if (here && Math.random() < dt * 6) burst(f.x + rand(-1, 1), .9, f.z + rand(-1, 1), Math.random() < .5 ? '#FFB347' : '#5A5560', 1, .8, .8, 2.2, .8);
    if (here && f === ST.fires[0] && (V.fireSnd = (V.fireSnd || 0) - dt) <= 0) { V.fireSnd = .5; sfx('tick', f.x, f.z); }
  }
  for (const [id, o] of V.fires) if (!fids.has(id)) { scene.remove(o.g); V.fires.delete(id); }
  if (ST.ph !== V.lastPh) { if (ST.ph === 'count' && here) banner(`🪑 На старт! «${VV.n}»`); V.lastPh = ST.ph; }
  { const c = ST.ph === 'lobby' && ST.lob === 'go' ? Math.max(0, Math.ceil(ST.cnt)) : -1; if (c !== V.goC) { if (c > 0 && here) { sfx('tick'); if (amIn()) banner(`Старт за ${c}…`); } V.goC = c; } }   // лобі: «Старт за 3…2…1»
  hud(fl); labels(here, fl, dt);
}
/* ---------- Лобі-попап: картки трас з картинками, голоси, «Я готовий» ---------- */
const voting = () => ST.ph === 'idle' || ST.ph === 'lobby';
function lobbyDef() {
  const c = voteCounts(), me = myKey(), mv = ST.votes[me], online = myKey() !== 'me';
  const hum = ST.racers.filter(r => !r.bot), ready = hum.some(r => r.k === me);
  const names = online ? [...new Set([me].concat(ST.lp, hum.map(r => r.k)))] : ['me'];
  const bots = ST.ph === 'lobby' ? ST.racers.filter(r => r.bot) : [];
  const players = names.slice(0, 12).map(k => ({ n: k === me ? (online ? k + ' (ти)' : 'Ти') : k, ready: hum.some(r => r.k === k), vote: ST.votes[k] == null ? -1 : ST.votes[k] }))
    .concat(bots.map(r => ({ n: '🤖 ' + r.k, ready: true, vote: -1 })));
  const n = Math.min(MAXR, names.length + bots.length), sec = Math.max(0, Math.ceil(ST.cnt));
  const info = ST.ph !== 'lobby' ? `Чекаємо гравців ${Math.min(MAXR, names.length)}/${MAXR} — тисни «✅ Я готовий», порожні місця доповнять боти 🤖`
    : ST.lob === 'go' ? `🏁 Усі на місці — <b>старт за ${sec}</b>`
    : ST.lob === 'wait' ? `Лобі повне ${n}/${MAXR} — чекаємо, поки всі натиснуть «Я готовий» · без них старт за <b>${sec} с</b>`
    : ST.nb && bots.length ? `🤖 ${escapeHTML(ST.nb)} приєднався · <b>${n}/${MAXR}</b> — чекаємо ще…` : `Чекаємо гравців <b>${n}/${MAXR}</b> — боти доповнять лобі…`;
  return {
    title: '🪑 Гонки на кріслах — лобі', sub: `Клікни по картці — голос за трасу (зараз лідирує <b>«${escapeHTML(VARS[ST.v].n)}»</b>). Потім «✅ Я готовий». 3 кола, 💣 🪠 🧯 🍾.`,
    maps: VARS.map((VR, i) => ({ n: VR.n, img: `addons/chairrace/map${i + 1}.jpg`, about: escapeHTML(VR.sub) + (ST.v === i && c[i] ? ' · ★ лідер' : '') })),
    votes: c, mine: mv == null ? -1 : mv, ready, players, info,
    onVote: i => { req('vote', { v: i }); },
    onReady: () => { req('ready', { on: !ready }); },
    onHide: () => { V.lobHide = true; closeLobby(); toast('🗳️ Лобі сховано — <b>F</b> у ліфтовому холі або вкладка «🪑 Гонки» відкриють знову.'); },
  };
}
function closeLobby() { if (V.lobOn && typeof modeLobby === 'function') modeLobby(null); V.lobOn = false; }
function openLobby() { V.lobHide = false; if (typeof closePanel === 'function' && panel) closePanel(); }
// щокадру: у лобі (не в кріслі, йде голосування, попап не сховано, нема меню) — показуємо; інакше закриваємо
function lobby(here) {
  const show = here && running && !pl.dead && !RC.on && !panel && voting() && !V.lobHide && typeof modeLobby === 'function';
  if (show) { modeLobby(lobbyDef()); V.lobOn = true; } else closeLobby();
  if (!here) V.lobHide = false;   // пішов з режиму — наступного разу попап знову відкриється сам
}
/* камера летить за кріслом трохи попереду */
const _cT = SIMSIDE ? null : new THREE.Vector3(), _cL = SIMSIDE ? null : new THREE.Vector3();
if (!SIMSIDE && typeof updCamera === 'function') {
  const _updCamera = updCamera;
  updCamera = function (dt) {
    if (!running || !RC.on) return _updCamera.apply(this, arguments);
    const k = innerWidth < innerHeight ? 1.5 : 1, ax = RC.x + Math.cos(RC.h) * 3.5 * Math.min(1, Math.abs(RC.v) / 8), az = RC.z + Math.sin(RC.h) * 3.5 * Math.min(1, Math.abs(RC.v) / 8);
    camPos.lerp(_cT.set(ax, 15 * k, az + 11 * k), 1 - Math.exp(-dt * 4)); camLook.lerp(_cL.set(ax, .3, az), 1 - Math.exp(-dt * 6));
    camera.position.copy(camPos);
    if (shake > 0) { shake = Math.max(0, shake - dt); camera.position.x += (Math.random() - .5) * shake; camera.position.y += (Math.random() - .5) * shake; }
    camera.lookAt(camLook);
    sun.position.set(camLook.x + 14, 30, camLook.z + 9); sun.target.position.set(camLook.x, 0, camLook.z);
  };
}
const _updInput = updInput;
updInput = function () { _updInput.apply(this, arguments); if (RC.on) { RC.ix = input.mx; RC.iz = input.mz; input.mx = 0; input.mz = 0; } };
A.key('Space', () => { if (!RC.on) return false; useItem(); });
// ЛКМ — предмет (якщо є), інакше бомба в курсор; ПКМ — вантуз
function aimAt(e) {
  if (typeof raycaster === 'undefined' || typeof groundPlane === 'undefined') return null;
  const ndc = new THREE.Vector2(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), hit = new THREE.Vector3();
  raycaster.setFromCamera(ndc, camera); return raycaster.ray.intersectPlane(groundPlane, hit) ? { x: hit.x, z: hit.z } : null;
}
if (!SIMSIDE) addEventListener('pointerdown', e => {
  if (!RC.on || typeof cv === 'undefined' || e.target !== cv || e.pointerType === 'touch') return;
  if (e.button === 0) { if (!useItem()) { const a = aimAt(e); if (V.sel === 'plane') throwPlane(a); else if (V.sel === 'molly') throwMolly(a); else throwBomb(a); } e.stopPropagation(); }
  else if (e.button === 2) { shootPlunger(); e.stopPropagation(); }
}, true);

/* ---------- F у ліфтовому холі: знову відкрити сховане лобі ---------- */
const _getInteract = getInteract;
getInteract = function () {
  const fl = !SIMSIDE && running && !pl.dead && !RC.on ? floorAt(pl.x, pl.z) : -1;
  if (fl >= 0) {
    const VR = VARS[fl], inHall = pl.z < VR.BB.z0;
    if (dist2(pl.x, pl.z, VR.TRAY.x, VR.TRAY.z) < 2) return V.prePlanes >= PLANE_PRE ? { l: `✈️ Уже ${PLANE_PRE} літачки на старт — досить, бо бос помітить`, fn: () => { } }
      : { l: '✈️ F — скласти літачок (+3)', fn: () => { V.prePlanes = PLANE_PRE; sfx('page'); burst(VR.TRAY.x, 1.2, VR.TRAY.z, '#FFFFFF', 10, 2, .5, 1.5); ftext(pl.x, 2.6, pl.z, `✈️ +${PLANE_PRE} літачки на старт! У заїзді — клавіша 5 / ЛКМ`, 'gold'); } };
    if (inHall && voting() && V.lobHide) return { l: '🗳️ Відкрити лобі — голос за трасу й «Я готовий»', fn: () => { openLobby(); sfx('ui'); } };
    if (dist2(pl.x, pl.z, VR.START.x, VR.START.z) < 2.2 && !voting()) return { l: '🏁 Заїзд іде — дочекайся наступного', fn: () => { } };
  }
  return _getInteract.apply(this, arguments);
};

/* ---------- HUD, підказки, підписи ---------- */
function goal() {
  if (RC.on) {
    if (ST.ph === 'count') return 'Приготуйся! <b>WASD</b> — куди їхати · <b>1</b> 💣 · <b>2</b> 🪠 · <b>3</b> 🧯 реактив · <b>4</b> 🍾 · <b>5</b> ✈️ · <b>ПРОБІЛ</b> — предмет.';
    if (RC.fin) return 'Ти на фініші — чекаємо інших.';
    if (RC.spin > 0) return '🌀 Закрутило! Зараз відпустить…';
    if (RC.slip > 0) return '💦 Мокра підлога — крісло ковзає, кермо не слухається!';
    if (RC.drunk > 0) return '🍵 Тебе напоїли чаєм — керування пливе!';
    if (RC.slow > 0) return '🐌 Тебе пригальмували — зараз відпустить.';
    if (RC.burn > BURN_T - 1.5) return '🔥 Сідушка горить! Наступного разу — <b>3</b> 🧯 піною крізь вогонь, і він згасне.';
    if (RC.jet) return `🧯 Реактивна піна! Ще ${RC.foam.toFixed(1)} с · <b>3</b> — вимкнути (на поворотах обережно).`;
    if (RC.item) return `У тебе ${ICON[RC.item]} <b>${ITN[RC.item]}</b> — тисни <b>ПРОБІЛ</b>.`;
    if (RC.drift > .35) return RC.drift > .75 ? '🔥 Помаранчеві іскри — виїжджай на пряму, буде супер-буст!' : '💨 Іскри! Тримай поворот ще трохи…';
    const SC = VV.SC;
    if (SC && Math.abs(RC.idx - SC.ia) < 18 && RC.idx <= SC.ia + 2) return doorOpen(ST.t) ? '🚒 Пожежні двері ВІДЧИНЕНІ — праворуч є зріз через колл-центр! Ризикни.' : '🚒 Пожежні двері зачинені — чекай зеленої лампи або їдь довкола.';
    const ah = ranking()[ranking().findIndex(r => r.k === myKey()) - 1];
    const fireAhead = ST.fires.find(f => { const dx = f.x - RC.x, dz = f.z - RC.z, d = Math.hypot(dx, dz); return d < 9 && (dx * Math.cos(RC.h) + dz * Math.sin(RC.h)) / (d || 1) > .6; });
    if (fireAhead) return RC.foam > .3 ? '🔥 Попереду горить калюжа — об\'їдь або тисни <b>3</b> 🧯 і загаси її піною!' : '🔥 Попереду горить калюжа — об\'їжджай!';
    if (!RC.planes) {   // ✈️ 0 — підказуємо, де найближчий стос паперу попереду
      const pa = VV.PAPER.map((q, i) => ({ q, i, d: (q.i - RC.idx + N) % N })).filter(o => !(V.papCd[o.i] > 0)).sort((a, b) => a.d - b.d)[0];
      if (pa && pa.d < 50) return `✈️ 0 — стос паперу за ~${Math.max(1, Math.round(pa.d * .9))} м попереду біля бортика → проїдь крізь нього (+${PLANE_PICK})`;
    }
    if (ah && RC.planes > 0 && !RC.bombs && !RC.molly) return `Попереду ${escapeHTML(ah.k === 'me' ? 'суперник' : ah.k)} — <b>5</b> ✈️ запусти літачок йому в окуляри!`;
    if (ah && RC.molly > 0 && !RC.bombs) return `Попереду ${escapeHTML(ah.k === 'me' ? 'суперник' : ah.k)} — <b>4</b> 🍾 кинь «молотов» йому під колеса!`;
    if (ah && RC.bombs > 0) return `Попереду ${escapeHTML(ah.k === 'me' ? 'суперник' : ah.k)} — <b>1</b>/ЛКМ 💣 кинь бомбу, <b>2</b>/ПКМ 🪠 зачепи вантузом!`;
    return 'Їдь за стрілкою · жовті коробки «?» — бомби й предмети · білі стоси паперу — ✈️ літачки · затяжний поворот — дрифт-буст.';
  }
  if (ST.ph === 'race' || ST.ph === 'count') return `Заїзд іде на «${VARS[ST.v].n}» — дивись і чекай наступного (потім відкриється лобі).`;
  if (ST.ph === 'end') return 'Заїзд скінчився — за мить відкриється лобі наступного.';
  if (V.lobHide) return `Лобі сховано${amIn() ? ' (ти готовий ✅)' : ''} — тисни <b>F</b> у ліфтовому холі або «🗳️ Лобі» у вкладці «🪑 Гонки», щоб проголосувати й натиснути «Я готовий».`;
  if (amIn()) return ST.lob === 'go' ? `🏁 Усі на місці — старт за ${Math.max(0, Math.ceil(ST.cnt))}! Траса: «${VARS[ST.v].n}».`
    : ST.lob === 'wait' ? 'Ти готовий ✅ — лобі повне, чекаємо, поки решта натисне «Я готовий».'
    : `Ти готовий ✅ — лобі заповнюється (${Math.min(MAXR, ST.racers.length)}/${MAXR}), боти 🤖 підтягуються. Траса: «${VARS[ST.v].n}».`;
  if (!V.prePlanes) return 'Обери трасу в лобі (клік по картці) і тисни <b>✅ Я готовий</b>. Біля принтера в холі — ✈️ папір (F — літачки на старт).';
  return 'Обери трасу в лобі (клік по картці) і тисни <b>✅ Я готовий</b>.';
}
function hud(fl) {
  if (!V.hud) {
    V.hud = document.createElement('div'); V.hud.id = 'race-hud';
    V.hud.style.cssText = 'position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 64px);transform:translateX(-50%);z-index:2;pointer-events:none;background:rgba(46,35,70,.85);color:#fff;border-radius:14px;padding:7px 14px;font:700 13px/1.4 system-ui,sans-serif;text-align:center;box-shadow:0 6px 18px rgba(0,0,0,.25);white-space:nowrap;max-width:96vw;overflow:hidden';
    V.goalEl = document.createElement('div'); V.goalEl.id = 'race-goal';
    V.goalEl.style.cssText = 'position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 150px);transform:translateX(-50%);z-index:2;pointer-events:none;background:#FFE066;color:#2E2346;border-radius:12px;padding:7px 14px;font:700 14px/1.4 system-ui,sans-serif;text-align:center;box-shadow:0 6px 18px rgba(0,0,0,.25);width:max-content;max-width:min(560px,90vw)';
    document.body.appendChild(V.hud); document.body.appendChild(V.goalEl);
  }
  const show = running && !pl.dead && !panel && fl >= 0;
  V.hud.style.display = V.goalEl.style.display = show ? '' : 'none';
  if (!show) return;
  let h;
  if (ST.ph === 'race' || ST.ph === 'count' || ST.ph === 'end') {
    const rk = ranking(), me = rk.findIndex(r => r.k === myKey());
    const list = rk.map((r, i) => `<span style="color:${r.k === myKey() ? '#FFE066' : '#fff'}">${i + 1}. ${escapeHTML(r.k === 'me' ? 'Ти' : r.k)}${r.fin ? ' 🏁' : ''}</span>`).join(' · ');
    const gear = RC.on ? ` · 💣${RC.bombs} · 🪠${RC.plCd > 0 ? RC.plCd.toFixed(1) + 'с' : '✓'} · 🧯${RC.jet ? '<span style="color:#8FD3FF">' + RC.foam.toFixed(1) + '</span>' : Math.ceil(RC.foam)} · 🍾${RC.molly} · ✈️${RC.planes}${RC.item ? ' · ' + ICON[RC.item] : ''}${RC.drift > .35 ? ` · <span style="color:${RC.drift > .75 ? '#FFB347' : '#6BB8FF'}">ДРИФТ</span>` : ''}${RC.draft > .3 ? ' · 🌬️' : ''}` : '';
    h = `🪑 ${VV.n} · ${ST.ph === 'count' ? 'старт через ' + Math.ceil(ST.cnt) : fmtT(ST.t)}${me >= 0 ? ` · <span style="color:#FFE066">місце ${me + 1}/${rk.length}</span> · коло ${Math.min(LAPS, Math.max(1, RC.lap + 1))}/${LAPS}` : ''}${gear}<br><span style="font-weight:600;font-size:12px">${list}</span>`;
  } else {
    const c = voteCounts();
    h = `🪑 Гонки на кріслах · ${VARS[fl].n}<br><span style="font-weight:600;font-size:12px">${ST.ph === 'lobby' ? `у лобі ${Math.min(MAXR, ST.racers.length + (myKey() !== 'me' ? Math.max(0, ST.lp.length - ST.racers.filter(r => !r.bot).length) : 0))}/${MAXR}${ST.lob === 'go' ? ` · <span style="color:#7FE08A">старт за ${Math.max(0, Math.ceil(ST.cnt))}</span>` : ''} · ` : ''}наступна траса: <span style="color:#FFE066">«${VARS[ST.v].n}»</span> · голоси ${c.join(' / ')}</span>`;
  }
  if (V.hud.innerHTML !== h) V.hud.innerHTML = h;
  const gt = '👉 ' + goal(); if (V.goalEl.innerHTML !== gt) V.goalEl.innerHTML = gt;
}
function tagEl(css, txt) { const e = document.createElement('div'); e.style.cssText = 'position:absolute;left:0;top:0;white-space:nowrap;' + css; e.innerHTML = txt; V.lbl.appendChild(e); return e; }
function place(e, x, y, z) { const q = screenPos(x, y, z); e.style.display = q.vis ? '' : 'none'; if (q.vis) e.style.transform = `translate(${Math.round(q.x)}px,${Math.round(q.y)}px) translate(-50%,-100%)`; }
const inRoom = (VR, r, x, z) => !!r.b && x > VR.cx + r.b[0] && x < VR.cx + r.b[2] && z > VR.cz + r.b[1] && z < VR.cz + r.b[3];
function labels(here, fl, dt) {
  if (!V.lbl) {
    V.lbl = document.createElement('div'); V.lbl.style.cssText = 'position:fixed;inset:0;z-index:2;pointer-events:none'; document.body.appendChild(V.lbl);
    V.startLbl = tagEl('padding:4px 10px;border-radius:10px;background:#FFE066;color:#2E2346;font:800 14px system-ui,sans-serif', '🏁 СТАРТ');
    V.paperLbl = VARS.map(VR => VR.PAPER.map(q => ({ q, e: tagEl('padding:3px 9px;border-radius:10px;background:#FFFFFF;color:#2E2346;border:2px solid #6BB8FF;font:800 12px system-ui,sans-serif;box-shadow:0 3px 10px rgba(0,0,0,.25)', '✈️ Папір для літачків') })).concat([{ q: VR.TRAY, tray: 1, e: tagEl('padding:3px 9px;border-radius:10px;background:#FFFFFF;color:#2E2346;border:2px solid #6BB8FF;font:800 12px system-ui,sans-serif', '✈️ Папір для літачків') }]));
    V.rooms = VARS.map(VR => VR.rooms.map(r => ({ r, VR, e: tagEl('padding:2px 8px;border-radius:9px;background:rgba(255,255,255,.75);color:#4E3A7C;font:700 11px system-ui,sans-serif', r.n) })));
  }
  V.lbl.style.display = here && !panel ? '' : 'none'; if (!here) return;
  // табличка кімнати, в якій ти зараз, плавно зникає (~0.2 с), щоб не заважала; решта видно
  const fdt = Math.min(.1, dt || 0);
  V.rooms.forEach((list, vi) => list.forEach(o => {
    const { r, VR, e } = o; if (vi !== fl) { e.style.display = 'none'; return; }
    const tgt = inRoom(VR, r, pl.x, pl.z) ? 0 : 1; o.op = o.op == null ? tgt : tgt > o.op ? Math.min(tgt, o.op + fdt * 5) : Math.max(tgt, o.op - fdt * 5);
    e.style.opacity = o.op.toFixed(2); place(e, VR.cx + r.x, 1.6, VR.cz + r.z); if (o.op <= 0) e.style.display = 'none';
  }));
  V.paperLbl.forEach((list, vi) => list.forEach((o, i) => {
    if (vi !== fl || (o.tray && RC.on)) { o.e.style.display = 'none'; return; }   // у кріслі лоток з холу вже не потрібен
    const cd = o.tray ? 0 : V.papCd[i] > 0 ? Math.ceil(V.papCd[i]) : 0;
    const txt = o.tray ? (V.prePlanes ? `✈️ Папір · на старт ${V.prePlanes}/${PLANE_PRE}` : '✈️ Папір для літачків · F') : cd ? `✈️ папір · ${cd} с` : RC.on ? '✈️ Папір для літачків (+3)' : '✈️ Папір для літачків';
    if (o.e.textContent !== txt) o.e.textContent = txt; o.e.style.opacity = cd ? '.55' : '1';
    place(o.e, o.q.x, 2.9, o.q.z);
  }));
  const S = VARS[fl].START; place(V.startLbl, S.x, 2, S.z); if (RC.on) V.startLbl.style.display = 'none';
  { const st = V.lobHide && voting() ? '🗳️ F — лобі' : '🏁 СТАРТ'; if (V.startLbl.innerHTML !== st) V.startLbl.innerHTML = st; }
  for (const r of ST.racers) {
    if (r.k === myKey() || !r.bot || ST.ph === 'idle' || ST.ph === 'lobby') continue;
    let el = V.tags.get(r.k); if (!el) { el = tagEl('padding:2px 7px;border-radius:8px;background:rgba(46,35,70,.8);color:#fff;font:700 11px system-ui,sans-serif', '🤖 ' + escapeHTML(r.k)); V.tags.set(r.k, el); }
    place(el, r.x, 2.3, r.z);
  }
  for (const [k, el] of V.tags) if (!ST.racers.some(r => r.k === k && r.bot) || ST.ph === 'idle' || ST.ph === 'lobby') { el.remove(); V.tags.delete(k); }
  // стрілка-напрямок траси попереду
  if (!V.arrow) { V.arrow = new THREE.Group(); const c2 = mesh(new THREE.ConeGeometry(.3, .8, 3), bulb('#FFE066'), false); c2.rotation.z = -Math.PI / 2; c2.position.x = 1.6; V.arrow.add(c2); scene.add(V.arrow); }
  V.arrow.visible = RC.on && ST.ph !== 'end';
  if (V.arrow.visible) { const q = TR[wrapI(RC.idx + 6)]; V.arrow.position.set(RC.x, .2, RC.z); V.arrow.rotation.y = -Math.atan2(q.z - RC.z, q.x - RC.x); }
}

/* ---------- Знайомство: картка «як грати» ---------- */
function intro(force) {
  const d = A.data(); if ((d.intro4 && !force) || SIMSIDE || document.getElementById('cr-intro')) return;
  const el = document.createElement('div'); el.id = 'cr-intro';
  el.style.cssText = 'position:fixed;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;background:rgba(20,12,40,.55);padding:16px';
  el.innerHTML = `<div style="max-width:460px;width:100%;max-height:90vh;overflow:auto;background:#2E2346;color:#fff;border-radius:18px;padding:18px 20px;font:14px/1.5 system-ui,sans-serif;box-shadow:0 12px 40px rgba(0,0,0,.4)">
    <div style="font:800 20px system-ui;margin-bottom:8px">🪑 Гонки на кріслах — як грати</div>
    <div>1. <b>🗳️ Лобі</b>: у вікні з картинками клікни по трасі — «${VARS[0].n}», «${VARS[1].n}» чи «${VARS[2].n}». Більше голосів — та й буде.</div>
    <div>2. <b>✅ Я готовий</b>: у заїзді 5 учасників — порожні місця по одному займають боти 🤖 (видно в списку лобі). Лобі повне й усі готові — «Старт за 3…2…1». 3 кола. Сховав лобі — <b>F</b> у холі.</div>
    <div>3. <b>💣 Бомба</b> (1 або ЛКМ — у курсор): дугою вперед, вибух крутить і гальмує всіх поруч. На старті 2, ще — з коробок «?».</div>
    <div>4. <b>🪠 Вантуз</b> (2 або ПКМ): чіпляє суперника попереду — тебе рогаткою тягне до нього, його гальмує.</div>
    <div>5. <b>🧯 Вогнегасник</b> (3): соплом назад — реактивна піна, крісло летить як ракета, поки є заряд (білий шлейф). Ще раз 3 — вимкнути. Їдеш з піною крізь вогонь — гасиш його.</div>
    <div>6. <b>🍾 Коктейль Молотова</b> (4): кидок дугою — на трасі ${FIRE_T} с горить калюжа. Хто в'їде — закрутить, пригальмує й обпалить сідушку.</div>
    <div>7. <b>✈️ Паперовий літачок</b> (5 або ЛКМ, коли вибраний — у курсор): летить уперед, влучив — суперник «сліпне» й гальмує. Де взяти: <b>білі стоси паперу біля бортика</b> з табличкою «✈️ Папір для літачків» — проїдь крізь (+3), коробки «?», а ще до старту — лоток біля принтера в холі (<b>F</b>, +3).</div>
    <div>8. <b>Фішки</b>: 💨 затяжний поворот на швидкості — іскри, на прямій дрифт-буст · 🌬️ тримайся за кимось — слипстрім · 💦 калюжі прибиральниці ковзкі · 🚒 на «Колл-центрі» пожежні двері відчиняються — зріз!</div>
    <div style="margin-top:8px;color:#FFE066">ПРОБІЛ — предмет з коробки (☕ 📎 📁 🍵). Піну 🧯 і пляшки 🍾 теж дають коробки «?». Жовта стрілка під кріслом показує трасу.</div>
    <button class="btn" style="margin-top:12px;width:100%">Зрозуміло, по кріслах!</button></div>`;
  document.body.appendChild(el);
  el.querySelector('button').addEventListener('click', () => { el.remove(); d.intro4 = 1; save(); });
}

/* ---------- Музика: швидкий фанк, на останньому колі — ще швидше ---------- */
const RPROG = [[40, [64, 67, 71, 74]], [45, [64, 69, 72, 76]], [38, [62, 66, 69, 74]], [43, [62, 67, 71, 74]]];
if (!SIMSIDE && typeof scheduleStep === 'function') {
  const _ss = scheduleStep;
  scheduleStep = function (i, t) {
    if (!running || !inRace(pl.x, pl.z) || typeof LAYER === 'undefined' || !LAYER.drums) { if (V.music >= 0) { V.music = -1; barMode = ''; } return _ss.apply(this, arguments); }
    const s = i % 16, bar = Math.floor(i / 16), h = STEP / 2, race = ST.ph === 'race' || ST.ph === 'count', last = RC.on && RC.lap >= LAPS - 1, lvl = !race ? 0 : last ? 2 : 1;
    if (s === 0 && V.music !== lvl) { V.music = lvl; const m = [{ keys: .8, bass: .7, drums: .5, tension: 0, lead: .2, crackle: 0 }, { keys: .7, bass: 1, drums: 1, tension: .1, lead: .5, crackle: 0 }, { keys: .7, bass: 1, drums: 1, tension: .45, lead: .6, crackle: 0 }][lvl]; for (const k in m) if (LAYER[k]) LAYER[k].gain.setTargetAtTime(m[k], t, .5); }
    const [root, ch] = RPROG[bar % 4];
    if (s === 0 || (lvl && s === 10)) ch.forEach((n, k) => epiano(t + k * .015, n, 1.2, .04, LAYER.keys));
    if ([0, 3, 6, 8, 11, 14].includes(s)) bassNote(t, root + (s === 6 || s === 14 ? 12 : 0), STEP * .9, lvl ? .45 : .3);
    if (lvl) { if (s % 4 === 0) kick(t, .8); if (s === 4 || s === 12) snare(t, .35); hat(t, s % 2 ? .03 : .06); if (lvl === 2) hat(t + h, .03); }
    else if (s % 8 === 0) kick(t, .5);
    if (lvl && [2, 5, 9, 13].includes(s) && Math.random() < .6) steel(t, pick([76, 79, 81, 83, 86]), .045);
    if (lvl === 2 && s % 2 === 0) pulse(t, root + 24, STEP * .8, .05);
  };
}

/* ---------- Режим (у кнопці PVP), вкладка, вхід ---------- */
function goRace(vi) {
  const VR = VARS[vi == null ? ST.v : vi], f = $('#fade'); closePanel(); if (f) f.style.opacity = 1; sfx('travel');
  setTimeout(() => { pl.x = VR.SPAWN.x; pl.z = VR.SPAWN.z; pl.y = 0; pl.falling = false; pl.jump = null; pl.safe = { x: VR.SPAWN.x, z: VR.SPAWN.z }; camPos.set(pl.x, 20, pl.z + 15); camLook.set(pl.x, .5, pl.z); if (f) f.style.opacity = 0; V.lobHide = false; intro(); }, 260);
  return true;
}
function leaveRace() { if (amIn()) req('leave'); RC.on = false; RC.pull = null; RC.jet = false; pl.emoteT = 0; setBar(false); closeLobby(); V.lobHide = false; return true; }
if (A.mode) A.mode({ id: 'chairrace', group: 'pvp', ic: '🪑', n: 'Гонки на кріслах', sub: '3 траси-поверхи · бомби, вантузи, 🧯, 🍾 і ✈️ · 5 учасників (люди + боти)', go: () => goRace(), here: () => running && inRace(pl.x, pl.z), leave: leaveRace });
A.tab('chairrace', '🪑 Гонки', () => {
  const d = A.data(), here = inRace(pl.x, pl.z);
  return `<h3>🪑 Гонки на офісних кріслах</h3>
    <p style="font-size:13px;line-height:1.5;margin:4px 0 10px">PVP до 5 гравців (порожні місця займають боти). Три траси на поверхах хмарочосів, 3 кола — хто перший, той і отримує премію. Наступна траса: <b>«${VARS[ST.v].n}»</b>.</p>
    <div class="btns">${here ? (voting() && !RC.on ? '<button class="btn" data-cr="lobby">🗳️ Лобі</button>' : '') : '<button class="btn" data-cr="go">🪑 До лобі</button>'}<button class="btn" data-cr="help">❓ Як грати</button></div>
    <div class="list" style="margin-top:10px;font-size:13px;line-height:1.55">
      <div>🏢 <b>${VARS[0].n}</b> — ${VARS[0].sub}. <b>${VARS[1].n}</b> — ${VARS[1].sub}. <b>${VARS[2].n}</b> — ${VARS[2].sub}.</div>
      <div>🎮 <b>WASD</b> / джойстик — у який бік їхати. У кріслі хотбар — <b>💣 Бомба</b> (1 / ЛКМ у курсор), <b>🪠 Вантуз</b> (2 / ПКМ), <b>🧯 Вогнегасник</b> (3), <b>🍾 Коктейль Молотова</b> (4) і <b>✈️ Літачок</b> (5).</div>
      <div>🧯 <b>Вогнегасник-реактив</b>: тримаєш соплом назад — піна штовхає крісло вперед до ${JET_V} м/с (на старті ${FOAM_START} с піни, ще — з коробок «?»; 3 — увімк./вимк.). Піною гасиш палаючі калюжі. 🍾 <b>Молотов</b>: де впаде — ${FIRE_T} с горить калюжа, в'їхав — крутить, гальмує й обпалює сідушку.</div>
      <div>💣 Бомба летить дугою й вибухає — усіх поруч крутить і гальмує (на старті 2, ще — з коробок «?»). 🪠 Вантуз чіпляє суперника попереду: тебе тягне вперед, його гальмує (перезарядка ${HOOK_CD} с).</div>
      <div>💨 <b>Дрифт-буст</b>: затяжний поворот на швидкості — сині, потім помаранчеві іскри, на прямій — прискорення. 🌬️ <b>Слипстрім</b>: тримайся позаду суперника — отримаєш тягу.</div>
      <div>💦 Калюжі від прибиральниць ковзкі. 🚒 На «Колл-центрі» пожежні двері періодично відчиняються — зріз крізь опенспейс (зелена лампа — можна, червона — зачинено).</div>
      <div>📦 Коробки «?»: 💣, 🧯 піна, 🍾 або предмет на ПРОБІЛ — ☕ прискорення · 📎 степлер · 📁 пастка позаду · 🍵 чай лідеру. 🧟 Зомбі-офісники переходять дорогу.</div>
      <div>✈️ <b>Паперовий літачок</b> (5 / ЛКМ, коли вибраний): летить уперед або в курсор, влучив — суперник пригальмує. Папір — білі стоси біля бортика (проїдь крізь, +3), коробки «?», лоток біля принтера в холі (F, +3 на старт).</div>
      <div>👥 У заїзді завжди 5: люди + боти. Після першого «Я готовий» боти по одному заходять у лобі, потім «Старт за 3…2…1».</div>
      <div>🏆 Місце: 1 — 120 🪙, 2 — 70, 3 — 40, 4 — 20, 5 — 10.</div>
    </div>
    <p class="muted" style="font-size:12px;margin-top:10px">Заїздів: ${d.races || 0} · перемог: ${d.wins || 0}</p>`;
}, e => {
  const b = e.target.closest('[data-cr]'); if (!b) return; const a = b.dataset.cr;
  if (a === 'go') goRace(); else if (a === 'help') { closePanel(); intro(true); }
  else if (a === 'lobby') openLobby();
});
if (window.__ADDON_TEST) window.__race = {
  ST, AU, RC, V, VARS, get VV() { return VV; }, get TR() { return TR; }, get N() { return N; }, GRID: k => GRID(k), get START() { return VV.START; }, get ITEM_SPOTS() { return VV.ITEMS; }, get BOOSTS() { return VV.BOOSTS; }, get ZOMBIES() { return VV.ZOMB; }, FOAM_START, VBOOST, FIRE_T, JET_V,
  inRoom, zombiePos, ranking, throwPlane, lobbyHumans, PLANE_START, PLANE_PICK, PLANE_PRE, pickVar, voteCounts, lobbyDef, openLobby, useItem, throwBomb, shootPlunger, toggleJet, throwMolly, igniteAt, nearIdx, posOf, doorOpen, floorAt, useVar, req,
};
