/* Аддон «Дедлайн о 18:00» v2: кооператив на 1–4 гравці на високих поверхах хмарочоса в центрі міста.
   П'ятниця, 17:55. Квартальний звіт мав бути вчора, а здати його треба до 18:00 — за 5 хвилин.
   - Три поверхи (кожен — свій острів-хмарочос): «Поверх 42 · Опенспейс», «Поверх 57 · Банк» (сховище, операційний зал,
     кільцева галерея), «Поверх 63 · Стартап» (атріум зі скляним мостом, мішки-крісла, мейл-рум, гірка). У ліфтовому холі
     гравці голосують, ставши на панель ліфта; без голосів після перемоги ліфт везе на наступний поверх.
   - Ланцюжок завдань (порядок і варіанти щораунду інші):
     📄 дані від колег → 🖨️ принтер → 3 з 5: 📎 степлер · 🔏 печатка · 🗂️ реєстраційний номер · 📠 скан · ✍️ підпис начальника
     (без ☕ кави не підписує!) → 📤 лоток «Відправка».
   - Звіт — «гаряча картопля»: важкий (з ним ходиш повільніше), його можна КИНУТИ напарнику дугою через перегородки.
     Зомбі, що перехопив звіт у повітрі (чи вирвав з рук), ЖУЄ його — цілість падає; на 0 — передруковуй.
     🪠 Вантуз по зомбі — і він випльовує звіт.
   - Свій набір (modeBar): 🪠 Вантуз · 📘 Кинути звіт · ☕ Кава-ривок (3 на раунд).
   - Свої ідеї: 📮 пневмопошта між кімнатами (папери летять трубою), 🚪 пожежні сходи / 🛝 гірка — короткий шлях,
     📊 колега з Excel просить допомоги (допоможеш — +1 ривок, ні — він стає зомбі), 💯 бонус за бездоганний звіт.
   - Хаос: принтер зажовує папір, кавоварка вибухає, гасне світло, сервер перегрівається, спринклери, раптова нарада.
   У спільному світі все рахує сервер: завдання, хаос, зомбі, політ звіту, голосування.
   Картинку для картки в меню поклади поруч: addons/deadline/deadline-bg.jpg */

const A = Addon.info({ name: 'Дедлайн о 18:00', version: '2.0', desc: 'Кооп на 1–4 на трьох поверхах хмарочоса: здай квартальний звіт до 18:00 — дані, принтер, печатки, кава начальнику, звіт-«гаряча картопля», вантуз проти зомбі, пневмопошта й хаос.' });

const SIMSIDE = !!window.__SIM;
const AUTH = () => SIMSIDE || !(typeof WORLD !== 'undefined' && WORLD.on);
const ISL_R = 28, DH = 1.1, CZ = 2;
/* поточний поверх: усі ці змінні перемикає useVar() */
let OX = 0, OZ = 0, HX = 20, HZ = 14, L = null;
let WALLS = [], ROOMS = [], DESKS = [], OBS = [], ZWP = [], BPATH = [], CHAIRS = [], PADS = [], TUBE = [], STAIRS = null, NAV = null, RN = {}, NAMES = [];
let START, SEND, PRINTER, STAPLER, COFFEE, VALVE, PANEL, ARCHIVE, RACK, SCANNER, STAMP, BOSS_DESK, CLOCK;
const LAY = [];
const W = (x, z) => ({ x: OX + x, z: OZ + z });
const inOffice = (x, z) => dist2(x, z, OX, OZ) < ISL_R + 2;
const floorOf = (x, z) => { for (let i = 0; i < LAY.length; i++) if (dist2(x, z, LAY[i].x, LAY[i].z) < ISL_R + 2) return i; return -1; };
const st = (ox, oz, px, pz, r) => ({ o: W(ox, oz), p: W(px, pz), r, l: { x: ox, z: oz }, pl: { x: px, z: pz } });
const V = { lbl: null, glbl: null, gArrow: null, gMark: null, goal: null, hud: null, list: null, goalEl: null, act: null, joined: false, auto: false, dark: null, music: -1,
  hm: new Map(), zm: new Map(), fm: new Map(), cols: [], boss: null, clock: null, clockK: 1, prLight: null, srvLight: null, fan: null, recep: null, acc: null, built: [],
  plg: [], plCd: 0, cof: 3, dashT: 0, rid: -1, barOn: false, flyM: null, caps: [], tpT: 0, chewT: 0, padEl: [], sendT: 0, vote: -1 };

/* ---------- Стіни й тверді меблі (для поверху, що зараз будується) ---------- */
function wall(ax, az, bx, bz, doors, kind) {
  const hor = az === bz, a = hor ? ax : az, b = hor ? bx : bz;
  const cuts = doors.map(d => typeof d === 'number' ? [d - DH, d + DH] : d).sort((p, q) => p[0] - q[0]);
  let s = a;
  for (const [c0, c1] of cuts) { if (c0 > s) WALLS.push(hor ? [s, az, c0, az, kind] : [ax, s, ax, c0, kind]); s = c1; }
  if (b > s) WALLS.push(hor ? [s, az, b, az, kind] : [ax, s, ax, b, kind]);
}
const ob = (x, z, r) => OBS.push({ x: OX + x, z: OZ + z, r });
function obBox(x, z, w, d) { const r = Math.min(w, d) / 2, l = Math.max(w, d), n = Math.max(1, Math.ceil((l - 2 * r) / r) + 1); for (let k = 0; k < n; k++) { const t = n === 1 ? 0 : (k / (n - 1) - .5) * (l - 2 * r); ob(w >= d ? x + t : x, w >= d ? z : z + t, r); } }

/* ---------- Кроки чекліста (назви кімнат — з поточного поверху) ---------- */
const STEPS = {
  data: { ic: '📄', n: '' }, print: { ic: '🖨️', n: '' },
  staple: { ic: '📎', n: '', t: 1.5, act: 'Скріплюю' }, stamp: { ic: '🔏', n: '', t: 2, act: 'Ставлю печатку' },
  number: { ic: '🗂️', n: '', t: 2, act: 'Шукаю реєстраційний номер' }, scan: { ic: '📠', n: '', t: 3, act: 'Сканую' },
  sign: { ic: '✍️', n: 'Підпис начальника (спершу ☕ кава!)', t: 1.5, act: 'Начальник підписує' }, send: { ic: '📤', n: '' },
};
const SUBS = ['staple', 'stamp', 'number', 'scan', 'sign'];
const ITEM = { sheets: { ic: '📄', n: 'дані' }, report: { ic: '📘', n: 'звіт' } };
const GRACE = 12;                                                                // с на початку раунду без зомбі-атак
const CHEW = 7;                                                                  // % цілості звіту за секунду, поки зомбі жує
const FIXT = { jam: 2.5, cm: 3, heat: 3, power: 2, rain: 2, excel: 3 };
const CHAOS = { jam: '🖨️ Принтер зажував папір!', boom: '💥 Кавоварка вибухнула!', power: '⚡ Стрибок напруги — світло вимкнулось!', heat: '🔥 Сервер перегрівся!', rain: '💦 Спрацювали спринклери — папери летять!', meeting: '🧟 Раптова нарада! Коридори забиті зомбі-офісниками!', excel: '📊 Колега не може зробити ВПР в Excel — кличе на допомогу!' };
const PLACES = [
  { id: 'start', f: () => START.p, y: 2.2, t: '▶ СТАРТ (F)', on: () => !ST.on },
  { id: 'send', f: () => SEND.p, y: 2.2, t: '📤 Відправка' },
  { id: 'printer', f: () => PRINTER.p, y: 2.2, t: '🖨️ Принтер' }, { id: 'staple', f: () => STAPLER.p, y: 1.9, t: '📎 Степлер' },
  { id: 'coffee', f: () => COFFEE.p, y: 2.3, t: '☕ Кавоварка' }, { id: 'rain', f: () => VALVE.p, y: 2, t: '🚿 Вентиль спринклерів' },
  { id: 'power', f: () => PANEL.p, y: 2.1, t: '⚡ Щиток' }, { id: 'number', f: () => ARCHIVE.p, y: 2.4, t: () => RN.archT },
  { id: 'heat', f: () => RACK.p, y: 2.7, t: '🌀 Сервер' }, { id: 'scan', f: () => SCANNER.p, y: 1.9, t: '📠 Сканер' }, { id: 'stamp', f: () => STAMP.p, y: 1.9, t: '🔏 Печатка' },
  { id: 'tube0', f: () => TUBE[0].p, y: 2.9, t: '📮 Пневмопошта' }, { id: 'tube1', f: () => TUBE[1].p, y: 2.9, t: '📮 Пневмопошта' },
  { id: 'stairs0', f: () => STAIRS.a, y: 2.7, t: () => STAIRS.ic + ' ' + STAIRS.n }, { id: 'stairs1', f: () => STAIRS.b, y: 2.7, t: () => STAIRS.ic + ' ' + STAIRS.n },
  { id: 'exit', f: () => L.exit, y: 2.6, t: '⬇️ Ліфт у хаб', on: () => !ST.on },
];
function nameSteps() {
  STEPS.data.n = `Зібрати дані (${RN.data})`; STEPS.print.n = `Надрукувати звіт (${RN.print})`; STEPS.staple.n = `Скріпити степлером (${RN.print})`;
  STEPS.stamp.n = `Поставити печатку (${RN.stamp})`; STEPS.number.n = `Реєстраційний номер (${RN.number})`; STEPS.scan.n = `Скан-копія (${RN.scan})`; STEPS.send.n = `Здати у «Відправку» (${RN.send})`;
  STEPS.staple.at = STAPLER; STEPS.stamp.at = STAMP; STEPS.number.at = ARCHIVE; STEPS.scan.at = SCANNER;
}
/* перемкнути логіку на поверх i (сервер — коли починається раунд там; гравець — зі знімка сервера) */
const VKEYS = ['cols', 'boss', 'clock', 'clockK', 'prLight', 'srvLight', 'fan', 'recep', 'acc'];
function useVar(i) {
  L = LAY[i] || LAY[0];
  OX = L.x; OZ = L.z; HX = L.hx; HZ = L.hz; WALLS = L.walls; ROOMS = L.rooms; DESKS = L.desks; OBS = L.obs; ZWP = L.zwp; BPATH = L.bpath;
  CHAIRS = L.chairs; PADS = L.pads; TUBE = L.tube; STAIRS = L.stairs; NAV = L.nav; RN = L.rn; NAMES = L.names;
  ({ START, SEND, PRINTER, STAPLER, COFFEE, VALVE, PANEL, ARCHIVE, RACK, SCANNER, STAMP, BOSS_DESK, CLOCK } = L.s);
  nameSteps();
  if (!SIMSIDE) for (const k of VKEYS) V[k] = L.v[k];
}
function begin(d) {
  const Lx = Object.assign({ vi: LAY.length, walls: [], rooms: [], desks: [], obs: [], zwp: [], bpath: [], chairs: [], pads: [], tube: [], stairs: null, nav: null, s: {}, names: [], racks: [],
    v: { cols: [], boss: null, clock: null, clockK: 1, prLight: null, srvLight: null, fan: null, recep: null, acc: null, pads: [] } }, d);
  LAY.push(Lx); OX = Lx.x; OZ = Lx.z; HX = Lx.hx; HZ = Lx.hz; WALLS = Lx.walls; OBS = Lx.obs;
  return Lx;
}
/* дописати поверх: тверді меблі з опису декору, точки блукання зомбі (лише досяжні), сітка навігації */
function seal(Lx, deco) {
  useVar(Lx.vi);
  Lx.deco = deco;
  const K = makeKit(null);
  if (deco) deco(K, Lx);
  decoCommon(K, Lx);
  Lx.nav = { cell: .5, x0: OX - HX, z0: OZ - HZ, nx: Math.round(2 * HX / .5), nz: Math.round(2 * HZ / .5), block: null };
  useVar(Lx.vi); navBuild();
  // які клітинки досяжні від стійки «СТАРТ» (у шахти атріуму чи в стіни зомбі не підуть)
  const nx = NAV.nx, reach = new Uint8Array(nx * NAV.nz), [si, sj] = cellOf(START.p.x, START.p.z), q = [si + sj * nx]; reach[q[0]] = 1;
  for (let h = 0; h < q.length; h++) { const c = q[h], ci = c % nx, cj = (c / nx) | 0; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ni = ci + di, nj = cj + dj; if (ni < 0 || nj < 0 || ni >= nx || nj >= NAV.nz) continue; const n = ni + nj * nx; if (reach[n] || NAV.block[n]) continue; reach[n] = 1; q.push(n); } }
  Lx.reach = reach;
  const ok = p => { const [i, j] = cellOf(p.x, p.z); return reach[i + j * nx]; };
  if (!Lx.zwp.length) for (let x = -HX + 2; x <= HX - 2; x += 3) for (let z = -HZ + 2; z <= HZ - 2; z += 3) if (!blocked(OX + x, OZ + z, .6)) Lx.zwp.push(W(x, z));
  Lx.zwp = Lx.zwp.filter(ok);
  useVar(Lx.vi);
}

/* ======================= ПОВЕРХ 42 · ОПЕНСПЕЙС (класичний офіс, перший варіант) =======================
   Північ (z<−2): кабінет начальника · переговорна · серверна · бухгалтерія · копіцентр.
   Коридор z −2…2 через усю будівлю. Південь: опенспейс · ресепшн з ліфтами · кухня/WC · зона відпочинку/склад. */
function mkV1() {
  const Lx = begin({ id: 'deadline', n: 'Поверх 42 · Опенспейс', fl: '42', short: 'Опенспейс', x: 300, z: -580, hx: 20, hz: 14, night: false, pc: '#5CC8FF',
    pal: { o: '#E3DBF5', i: '#F6F2FF', otop: '#6E5FA8', top: '#9F8BE0', base: '#C9C3DC' },
    names: ['Олег з продажів', 'Світлана-маркетологиня', 'Ігор-аналітик', 'Оксана з HR', 'Тарас-логіст', 'Марта-юристка', 'Влад-девелопер', 'Ліда-дизайнерка'],
    rn: { data: 'колеги в опенспейсі', print: 'копіцентр', stamp: 'бухгалтерія', number: 'архів начальника', scan: 'серверна', send: 'ресепшн', archT: '🗂️ Архів',
      atStart: 'на ресепшні', atSend: 'на ресепшні', atPrint: 'у копіцентрі', atCoffee: 'на кухні', atPanel: 'в кінці коридору', atRack: 'у серверній' } });
  const HX = 20, HZ = 14;
  wall(-HX, -HZ, HX, -HZ, [], 'o'); wall(-HX, -HZ, -HX, HZ, [], 'o'); wall(HX, -HZ, HX, HZ, [], 'o'); wall(-HX, HZ, HX, HZ, [], 'o');   // вхід — лише ліфтом
  wall(-HX, -CZ, -3, -CZ, [-15.5, -7], 'g'); wall(-3, -CZ, HX, -CZ, [0, 7.5, 16], 'i');                        // коридор, північ: скло в кабінет і переговорну
  for (const x of [-11, -3, 3, 12]) wall(x, -HZ, x, -CZ, [], 'i');
  wall(-HX, CZ, -5, CZ, [-16.25, -9.25], 'i'); wall(5, CZ, HX, CZ, [8.75, 16.25], 'i');                          // коридор, південь (ресепшн відкритий)
  wall(-5, CZ, -5, HZ, [6.7], 'i'); wall(5, CZ, 5, HZ, [11], 'i'); wall(5, 8, HX, 8, [11.4], 'i'); wall(12.5, CZ, 12.5, HZ, [11], 'i');
  Lx.rooms = [
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
  /* опенспейс: 4 колонки × 3 ряди столів; за 8 сидять колеги, 4 — порожні */
  const DCOL = [-18, -14.5, -11, -7.5], DROW = [4.6, 8.2, 11.8], DEMPTY = [1, 6, 8, 11];
  const ALL = []; for (const z of DROW) for (const x of DCOL) ALL.push({ lx: x, lz: z });
  Lx.alldesk = ALL;
  Lx.desks = ALL.filter((_, k) => !DEMPTY.includes(k)).map((d, i) => ({ i, lx: d.lx, lz: d.lz, x: OX + d.lx, z: OZ + d.lz, p: W(d.lx + 1.15, d.lz + .8) }));
  Lx.s = {
    START: st(-1.8, 8.2, -1.8, 9.6, .7), SEND: st(2.2, 8.2, 2.2, 9.6, .6),                                        // ресепшн
    PRINTER: st(16, -12.9, 16, -11.3, .75), STAPLER: st(19.2, -7, 17.9, -7, .55),                                  // копіцентр
    COFFEE: st(8.2, 7.5, 8.2, 6.1, .55), VALVE: st(5.35, 3.4, 6.4, 3.4, .35),                                       // кухня
    PANEL: st(19.75, 0, 18.7, 0, .35),                                                                              // кінець коридору
    ARCHIVE: st(-19.4, -7, -18.1, -7, .6), RACK: st(-1.5, -12.9, -1.5, -11.3, .75), SCANNER: st(2.45, -5.6, 1.2, -5.6, .5), STAMP: st(7.5, -9.6, 7.5, -8.2, .55),
    BOSS_DESK: W(-15.5, -10.3), CLOCK: W(-4, -CZ),
  };
  Lx.pads = [W(-2, 12.9), W(0, 12.9), W(2, 12.9)]; Lx.exit = W(3.9, 12.9);
  Lx.tube = [st(-5.55, 3.6, -6.5, 3.6, .35), st(12.6, -3.6, 13.6, -3.6, .35)];                                     // опенспейс ↔ копіцентр
  Lx.stairs = { a: W(-19, -12.4), b: W(18.6, 12.4), da: [-19, -13.7, 0], db: [18.9, 13.7, Math.PI], ic: '🚪', n: 'Пожежні сходи', kind: 'stairs' };
  Lx.bpath = [W(-15.5, -11.6), W(-13.1, -11.6), W(-13.1, -4.6), W(-15.5, -3.6), W(-15.5, 0), W(-7, 0), W(-7, -4.7)];   // крісло начальника … голова столу в переговорній
  Lx.zwp = [[-18, 0], [-14, 0], [-10, 0], [-6, 0], [-2, 0], [2, 0], [6, 0], [10, 0], [14, 0], [17.5, 0], [0, 4.5], [-3.6, 5], [3.6, 5], [0, 11.5], [-3, 11.4], [3, 11.2],
    [-16.25, 6.7], [-12.75, 6.7], [-9.25, 6.7], [-6, 6.7], [-16.25, 10.3], [-12.75, 10.3], [-9.25, 10.3], [-6, 10.3]].map(([x, z]) => W(x, z));
  /* тверді меблі: прямокутник = ряд кіл */
  const S = Lx.s, l = k => S[k].l;
  for (const d of ALL) { obBox(d.lx, d.lz, 1.6, .8); ob(d.lx, d.lz + .75, .32); }
  obBox(l('START').x, l('START').z, 2.8, .8); obBox(l('SEND').x, l('SEND').z, 1.2, .7);
  obBox(l('PRINTER').x, l('PRINTER').z, 1.4, 1.2); obBox(13.5, -12.9, 1.1, 1.1); obBox(12.85, -7, .6, 3); obBox(l('STAPLER').x, l('STAPLER').z, .9, 1.6); obBox(18.9, -12.9, 1, 1);
  obBox(7.8, 7.55, 4.8, .8); ob(11.9, 2.75, .5); ob(10.4, 4.6, .7); ob(l('VALVE').x, l('VALVE').z, .3); ob(l('PANEL').x, l('PANEL').z, .3);
  obBox(-15.5, -10.3, 2.6, 1.1); ob(-15.5, -12.5, .35); obBox(l('ARCHIVE').x, l('ARCHIVE').z, .8, 2); obBox(-17.2, -13.55, 3, .6); obBox(-11.55, -7.5, .8, 2.4);
  obBox(-7, -9.2, 1.8, 6); for (const z of [-11.2, -9.7, -8.2, -6.7]) { ob(-8.35, z, .28); ob(-5.65, z, .28); }
  for (const [x, z] of [[-1.5, -12.9], [1.5, -12.9], [-1.5, -9.4], [1.5, -9.4]]) obBox(x, z, 1.4, 1); obBox(l('SCANNER').x, l('SCANNER').z, .9, 1.4); obBox(-2.6, -5.5, .5, 1.4);
  obBox(l('STAMP').x, l('STAMP').z, 1.8, .9); ob(7.5, -10.4, .3); obBox(4.9, -12.3, 1.6, .8); obBox(10.1, -12.3, 1.6, .8); obBox(11.55, -5.5, .7, 3); obBox(3.7, -13.3, .8, .8);
  obBox(7.8, 13.4, 3.6, .9); ob(7.8, 11.6, .5); obBox(7.5, 8.4, 2, .4); ob(6, 9.5, .45); ob(11.6, 13.2, .45);
  obBox(16.4, 7.2, 7, 1.4); obBox(12.85, 4.3, .5, 2.6);
  obBox(19.6, 11, .6, 5); obBox(16, 13.6, 5, .6); ob(14.2, 9.3, .45);
  obBox(-4.4, 11.5, .8, 2.4); ob(4.3, 5.6, .3); ob(l('START').x, l('START').z - .8, .3);
  Lx.chairs = [[-3.4, 4.2], [6.9, 5.4], [6.6, 10.6]];   // крісла на коліщатках (можна кататись)
  seal(Lx, null);
}

/* ======================= ПОВЕРХ 57 · БАНК «КРЕДИТ ДОВІРИ» =======================
   У центрі — сталеве СХОВИЩЕ, навколо нього кільцева ГАЛЕРЕЯ (можна оббігати зомбі по колу).
   Захід — великий ОПЕРАЦІЙНИЙ ЗАЛ з касами. Північ — кабінет керуючого й бек-офіс. Схід — кредитний відділ,
   кімната персоналу, серверна (тупик). Південь — VIP-лаунж і хол з ліфтами. */
function mkV2() {
  const Lx = begin({ id: 'deadline2', n: 'Поверх 57 · Банк', fl: '57', short: 'Банк', x: 440, z: -580, hx: 22, hz: 14, night: false, pc: '#FFD27A',
    pal: { o: '#EDE3CF', i: '#F7F0E2', otop: '#7A5A2E', top: '#C9A35E', base: '#D8D0C0' },
    names: ['Касирка Галина', 'Касир Петро', 'Оператор Ірина', 'Касир Богдан', 'Касирка Леся', 'Операціоніст Назар', 'Касирка Віра', 'Стажер Кирило'],
    rn: { data: 'каси в операційному залі', print: 'бек-офіс', stamp: 'кредитний відділ', number: 'депозитарій у сховищі', scan: 'серверна', send: 'хол', archT: '🗂️ Депозитарій',
      atStart: 'на посту охорони в холі', atSend: 'у холі біля ліфтів', atPrint: 'у бек-офісі', atCoffee: 'у кімнаті персоналу', atPanel: 'у галереї біля кредитного відділу', atRack: 'у серверній' } });
  wall(-22, -14, 22, -14, [], 'o'); wall(-22, -14, -22, 14, [], 'o'); wall(22, -14, 22, 14, [], 'o'); wall(-22, 14, 22, 14, [], 'o');
  wall(-12, -14, -12, 14, [-4, 4, 11], 'i');                         // операційний зал ↔ галерея / VIP
  wall(12, -14, 12, 14, [-5, 2, 11], 'i');                           // галерея ↔ кредитний / персонал; хол ↔ серверна
  wall(-12, -8, 0, -8, [-6], 'g'); wall(0, -8, 12, -8, [6], 'i'); wall(0, -14, 0, -8, [], 'i');
  wall(-12, 8, 12, 8, [-7, [.5, 9.5]], 'i'); wall(-2, 8, -2, 14, [], 'i');
  wall(12, -2, 22, -2, [], 'i'); wall(12, 6, 22, 6, [], 'i');
  wall(-6, -3.5, 6, -3.5, [], 'v'); wall(-6, -3.5, -6, 3.5, [], 'v'); wall(6, -3.5, 6, 3.5, [], 'v'); wall(-6, 3.5, 6, 3.5, [0], 'v');   // сховище
  Lx.rooms = [
    { id: 'hall', n: 'ОПЕРАЦІЙНИЙ ЗАЛ', c: '#FFD27A', x0: -22, z0: -14, x1: -12, z1: 14, fl: '#E9DFC9', sg: [-17, -13.7], ft: [-17, -2.6, 3.6] },
    { id: 'gal', n: 'ГАЛЕРЕЯ', c: '#FFE7A0', x0: -12, z0: -8, x1: 12, z1: 8, fl: '#D9CFBE', sg: false, ft: [-9, 6.8, 2.6] },
    { id: 'vault', n: 'СХОВИЩЕ', c: '#FFD27A', x0: -6, z0: -3.5, x1: 6, z1: 3.5, fl: '#8E8A9A', sg: [3.2, 3.65], ft: [0, 2.5, 2.6] },
    { id: 'boss', n: 'КАБІНЕТ КЕРУЮЧОГО', c: '#FF6BD6', x0: -12, z0: -14, x1: 0, z1: -8, fl: '#B88A64', sg: [-9, -13.7] },
    { id: 'back', n: 'БЕК-ОФІС', c: '#B07CF0', x0: 0, z0: -14, x1: 12, z1: -8, fl: '#CFC9E2', sg: [4.2, -13.7] },
    { id: 'credit', n: 'КРЕДИТНИЙ ВІДДІЛ', c: '#7FE08A', x0: 12, z0: -14, x1: 22, z1: -2, fl: '#9DBFA9', sg: [17, -13.7] },
    { id: 'staff', n: 'КІМНАТА ПЕРСОНАЛУ', c: '#FFB35C', x0: 12, z0: -2, x1: 22, z1: 6, fl: '#F4F0E8', sg: [17, 5.75], ft: [17, 4.9, 3.6] },
    { id: 'srv', n: 'СЕРВЕРНА', c: '#6BE7FF', x0: 12, z0: 6, x1: 22, z1: 14, fl: '#4A5066', sg: [15.5, 6.3] },
    { id: 'vip', n: 'VIP-ЛАУНЖ', c: '#FF8AD8', x0: -12, z0: 8, x1: -2, z1: 14, fl: '#6B3A5A', sg: [-4, 8.3] },
    { id: 'lobby', n: 'ХОЛ · ЛІФТИ', c: '#FFD27A', x0: -2, z0: 8, x1: 12, z1: 14, fl: '#EFEAF7', sg: false, ft: [5.5, 9, 3] },
  ];
  const D = [[-19.5, -11], [-15.5, -11], [-19.5, -7], [-15.5, -7], [-19.5, 6], [-15.5, 6], [-19.5, 10], [-15.5, 10]];
  Lx.desks = D.map(([x, z], i) => ({ i, lx: x, lz: z, x: OX + x, z: OZ + z, p: W(x + 1.15, z + .8) }));
  Lx.s = {
    START: st(3.5, 10.4, 3.5, 11.8, .7), SEND: st(8.5, 10.4, 8.5, 11.8, .6),
    PRINTER: st(8, -12.9, 8, -11.3, .75), STAPLER: st(11.3, -10.2, 10.1, -10.2, .55),
    COFFEE: st(17, -1.25, 17, .15, .55), VALVE: st(21.65, 1, 20.6, 1, .35), PANEL: st(11.75, -7.1, 10.7, -7.1, .35),
    ARCHIVE: st(0, -2.75, 0, -1.4, .6), RACK: st(18.5, 12.9, 18.5, 11.3, .75), SCANNER: st(21.4, 8, 20.2, 8, .5), STAMP: st(17, -9, 17, -7.6, .55),
    BOSS_DESK: W(-6, -11.2), CLOCK: W(-3, 3.5),
  };
  Lx.racks = [[15, 12.9], [18.5, 12.9], [15, 9.4]];
  Lx.pads = [W(3, 13.1), W(5.5, 13.1), W(8, 13.1)]; Lx.exit = W(10.6, 13.1);
  Lx.tube = [st(1, -12.9, 1, -11.7, .35), st(-21.4, 0, -20.3, 0, .35)];                                          // бек-офіс ↔ операційний зал
  Lx.stairs = { a: W(-20.4, -12.6), b: W(20.5, 4.6), da: [-20.4, -13.75, 0], db: [20.5, 5.75, Math.PI], ic: '🚪', n: 'Пожежні сходи', kind: 'stairs' };
  Lx.bpath = [W(-6, -12.6), W(-3.6, -12.6), W(-3.6, -9.3), W(-6, -9.3), W(-6, -6), W(-9, -6), W(-9, 5.6), W(0, 5.6)];   // керуючий: кабінет → перевірити сховище
  Lx.chairs = [[-9.5, -10.6], [4.5, -9.5]];
  seal(Lx, decoV2);
}

/* декор банку (локальні координати; K у режимі «лише тверді меблі» на сервері й у режимі «меші» в гравця) */
function decoV2(K) {
  decoStations(K, 'bank');
  // операційний зал: черга зі стовпчиками, лавка, термінал електронної черги, логотип
  K.tiles(-22, -14, -12, 14, '#E9DFC9', '#DCCFB2', 2);
  for (const z of [-2.2, 2.2]) { for (const x of [-20, -18.5, -17, -15.5]) { K.cyl(x, .5, z, .05, .08, 1, '#C9A35E', 8); } K.box(-17.75, .85, z, 4.5, .06, .04, '#C2335A'); }
  K.box(-17.75, .25, 0, 3.4, .45, .6, '#7A5A2E', true); K.box(-17.75, .5, -.25, 3.4, .5, .1, '#7A5A2E');
  K.box(-12.6, .75, -.9, .5, 1.5, .5, '#4E4A6E', true); K.glow(-12.86, 1.2, -.9, .02, .4, .3, '#6BE7FF');
  K.sign('🏦 КРЕДИТ ДОВІРИ', '#FFD27A', -17, -13.6, 4.2, 2.1);
  K.plant(-21.2, -4.2); K.plant(-21.2, 4.2); K.plant(-12.8, 13.2, 1.2); K.plant(-21.2, 13.2);
  // галерея навколо сховища: колони, лавки, рослини
  K.tiles(-12, -8, 12, 8, '#D9CFBE', '#CFC3AE', 2);
  for (const [x, z] of [[-11.2, -7.2], [11.2, 7.2], [-11.2, 7.2]]) K.cyl(x, 1.2, z, .4, .45, 2.4, '#F0E6D2', 12, .45);
  K.box(0, .25, -4.3, 3, .45, .6, '#7A5A2E', true); K.plant(-9, -4.5, 1.1); K.plant(9, -4.5, 1.1); K.plant(-9, 4.6, 1.1);
  // сховище: сталеві стіни, кругові двері, злитки, візки з грошима; депозитарій — архів
  for (const sx of [-1, 1]) {
    K.box(sx * 4.3, .3, -1.5, 1.6, .6, 1.2, '#6E668E', true);
    for (let k = 0; k < 6; k++) K.box(sx * 4.3 - .5 + (k % 3) * .5, .66 + Math.floor(k / 3) * .14, -1.75 + (k % 2) * .5, .42, .12, .2, '#FFD27A');
    K.box(sx * 4.3, .45, 1.9, .9, .9, .6, '#3E6B4E', true); for (let k = 0; k < 4; k++) K.box(sx * 4.3 - .25 + (k % 2) * .5, .95, 1.75 + (k > 1 ? .3 : 0), .4, .1, .25, '#7FE08A');
  }
  { const q = K.grp(2.45, 4.15, -.5); K.GB(q, 0, 1.15, 0, 2.2, 2.2, .35, '#9F98B8'); K.GB(q, 0, 1.15, .2, 1.6, 1.6, .1, '#C9CDD9'); for (let k = 0; k < 3; k++) { const s = K.GB(q, 0, 1.15, .3, 1.2, .1, .1, '#4E4A6E'); if (s) s.rotation.z = k * Math.PI / 3; } }
  K.obBox(2.45, 4.15, 2.2, .5);
  K.sign('СХОВИЩЕ', '#FFD27A', 0, 3.7, 2.2);
  // кабінет керуючого
  K.rug(-6, -10.6, 5, 3.4, '#6B2A3A');
  K.shelf(-11.55, -11, 3, .6, 1.8, Math.PI / 2, ['#7A5A2E', '#C9A35E', '#3E4A7C']);
  K.box(-1, .45, -13.3, .8, .9, .8, '#5E6478', true); K.cyl(-1, .55, -12.88, .12, .12, .04, '#FFD27A', 8);
  K.sofa(-1, -11, 2.2, -Math.PI / 2, '#3A2A2A'); K.plant(-11.2, -8.8); K.plant(-.8, -8.8, .9);
  K.box(-6, 1.6, -13.92, 2, 1.1, .05, '#C9A35E'); K.box(-6, 1.6, -13.88, 1.8, .9, .03, '#3E6B8E');   // картина «Курс гривні»
  // бек-офіс: столи операціоністів, шредер, коробки з папером
  for (const x of [3.3]) { K.table(x, -10.2, 1.6, .8, '#EDE8F5', '#9F98B8'); K.monitor(x, -10.35, 1, true, 2); K.keyboard(x, -10); }
  K.box(5.6, .3, -13.4, .6, .6, .5, '#C4956A', true); K.box(6.2, .3, -13.4, .5, .6, .5, '#C4956A', true); K.box(5.9, .8, -13.4, .5, .4, .5, '#A97A50');
  K.box(10.6, .45, -13.4, .5, .9, .4, '#4E4A6E', true); K.box(10.6, .91, -13.4, .4, .03, .08, '#2E2346');
  K.plant(11.3, -8.7, .8);
  // кредитний відділ: печатка, кредитні інспектори, шафи
  for (const x of [14.5, 19.5]) { K.table(x, -12.6, 1.6, .8, '#C9B8F0', '#8C84B0'); K.monitor(x, -12.75, 1, true, x > 16 ? 3 : 1); K.keyboard(x, -12.4); K.chair(x, -13.3, 0, '#2F8F7A'); K.person(x, -13.3, 0, '#E6C9B0', '#2F8F7A', true); }
  K.box(21.55, .65, -5.2, .7, 1.3, 2.6, '#9F98B8', true); for (let j = 0; j < 4; j++) K.box(21.18, .25 + j * .3, -5.2, .02, .22, 2.3, '#C9C3DC');
  K.sign('КРЕДИТ 0%*', '#7FE08A', 17, -2.25, 2.6, 1.85);
  K.plant(12.8, -13.2); K.plant(12.8, -2.8, .8);
  // кімната персоналу: холодильник, круглий стіл, шафки
  K.tiles(12, -2, 22, 6, '#F4F0E8', '#E2D8C6', 1);
  K.box(13, .95, -1.25, .8, 1.9, .7, '#F4F0FF', true);
  K.cyl(16, .74, 3, .75, .75, .06, '#FFB3C7', 16, .75); K.cyl(16, .37, 3, .08, .12, .74, '#9F98B8', 8);
  for (const a of [0, 2.1, 4.2]) K.cyl(16 + Math.sin(a) * 1.05, .45, 3 + Math.cos(a) * 1.05, .22, .2, .06, '#C9A35E', 10);
  K.box(14.6, .95, 5.6, 3.6, 1.9, .5, '#8E86B0', true); for (let k = 0; k < 6; k++) K.box(13.1 + k * .6, 1.1, 5.33, .04, 1.6, .02, '#6E668E');
  // серверна
  K.box(21.5, 1.6, 12.6, .5, .7, 1.4, '#E8E3F0', true);
  // VIP-лаунж: шкіряні дивани, акваріум, барний візок
  K.rug(-7, 11, 7, 4.6, '#8C2F4A');
  K.sofa(-6.4, 13.2, 2.6, Math.PI, '#3A2A2A'); K.sofa(-10.2, 13.2, 2, Math.PI, '#3A2A2A');
  K.cyl(-7, .4, 11, .55, .55, .06, '#C9A35E', 14, .55); K.cyl(-7, .2, 11, .08, .1, .4, '#4E4A6E', 6);
  K.box(-3, .5, 13.5, 1.6, 1, .5, '#2E2346', true); K.glow(-3, .65, 13.24, 1.4, .6, .02, '#6BE7FF');
  K.box(-3, .4, 9, .8, .8, .5, '#8C6A4E', true); K.cyl(-3.2, .95, 9, .06, .06, .3, '#7FE08A', 6); K.cyl(-2.9, .95, 9.1, .06, .06, .3, '#FF8AD8', 6);
  K.plant(-11.2, 8.8, 1.1);
  // хол: пост охорони (СТАРТ), «Інкасація» (Відправка), рослини
  K.plant(-1.3, 9, 1.1); K.plant(11.3, 8.7, .9);
}

/* ======================= ПОВЕРХ 63 · СТАРТАП «СИНЕРГІЯ» =======================
   У центрі — АТРІУМ: дві шахти вниз і СКЛЯНИЙ МІСТ між ними. Захід — хотдеск з мішками-кріслами. Північ — мейл-рум,
   серверна, фінвідділ, скляний кабінет CEO з гіркою. Схід — бариста-бар. Південь — ресепшн з ліфтами, принт-зона, чил-зона. */
function mkV3() {
  const Lx = begin({ id: 'deadline3', n: 'Поверх 63 · Стартап', fl: '63', short: 'Стартап', x: 580, z: -580, hx: 22, hz: 14, night: true, pc: '#FF6BD6',
    pal: { o: '#4E4A6E', i: '#E9E4F7', otop: '#6BE7FF', top: '#FF6BD6', base: '#8E86B0' },
    names: ['Сеньйор Макс', 'Джуніорка Даша', 'Тімлід Артем', 'Продакт Соломія', 'Девопс Ярік', 'Дизайнерка Майя', 'Тестер Остап', 'SMM-ниця Кіра'],
    rn: { data: 'колеги на мішках у хотдеску', print: 'принт-зона', stamp: 'фінвідділ', number: 'сейф з NDA у CEO', scan: 'серверна', send: 'мейл-рум', archT: '🗂️ Сейф NDA',
      atStart: 'на ресепшні', atSend: 'у мейл-румі', atPrint: 'у принт-зоні', atCoffee: 'у бариста-барі', atPanel: 'в атріумі біля бару', atRack: 'у серверній' } });
  wall(-22, -14, 22, -14, [], 'o'); wall(-22, -14, -22, 14, [], 'o'); wall(22, -14, 22, 14, [], 'o'); wall(-22, 14, 22, 14, [], 'o');
  wall(-22, -7, 6, -7, [-17, -7.5, 1.5], 'i'); wall(6, -7, 22, -7, [9], 'g');
  wall(-12, -14, -12, -7, [], 'i'); wall(-3, -14, -3, -7, [], 'i'); wall(6, -14, 6, -7, [], 'g');
  wall(-12, -7, -12, 14, [[-4.5, 4.5], 10.5], 'i');
  wall(12, -7, 12, 7, [[-3, 3]], 'i');
  wall(-12, 7, 22, 7, [[-9, -2], 6, 17], 'i'); wall(0, 7, 0, 14, [10.5], 'i'); wall(12, 7, 12, 14, [10.5], 'i');
  // атріум: дві шахти, поручні, скляний міст z −1,4…1,4
  wall(-4, -4.5, 4, -4.5, [], 'r'); wall(-4, 4.5, 4, 4.5, [], 'r'); wall(-4, -4.5, -4, -1.4, [], 'r'); wall(-4, 1.4, -4, 4.5, [], 'r');
  wall(4, -4.5, 4, -1.4, [], 'r'); wall(4, 1.4, 4, 4.5, [], 'r'); wall(-4, -1.4, 4, -1.4, [], 'r'); wall(-4, 1.4, 4, 1.4, [], 'r');
  Lx.rooms = [
    { id: 'mail', n: 'МЕЙЛ-РУМ', c: '#FFB35C', x0: -22, z0: -14, x1: -12, z1: -7, fl: '#C9B48E', sg: [-15, -13.7] },
    { id: 'srv', n: 'СЕРВЕРНА', c: '#6BE7FF', x0: -12, z0: -14, x1: -3, z1: -7, fl: '#363B4E', sg: [-8.2, -13.7] },
    { id: 'fin', n: 'ФІНВІДДІЛ', c: '#7FE08A', x0: -3, z0: -14, x1: 6, z1: -7, fl: '#9DBFA9', sg: [1.5, -13.7] },
    { id: 'ceo', n: 'КАБІНЕТ CEO', c: '#FF6BD6', x0: 6, z0: -14, x1: 22, z1: -7, fl: '#6E5A8E', sg: [17.5, -13.7] },
    { id: 'open', n: 'ХОТДЕСК', c: '#5CC8FF', x0: -22, z0: -7, x1: -12, z1: 14, fl: '#6E7FB8', sg: [-17, -6.7], ft: [-17, -5.6, 3] },
    { id: 'atr', n: 'АТРІУМ', c: '#B07CF0', x0: -12, z0: -7, x1: 12, z1: 7, fl: '#C9C2DE', sg: false, ft: [-8, -6.2, 2.6] },
    { id: 'bar', n: 'БАРИСТА-БАР', c: '#FFD27A', x0: 12, z0: -7, x1: 22, z1: 7, fl: '#8C5A3C', sg: [17, 6.7], ft: [17, 5.6, 3.4] },
    { id: 'recep', n: 'РЕСЕПШН', c: '#FFD27A', x0: -12, z0: 7, x1: 0, z1: 14, fl: '#EFEAF7', sg: false, ft: [-3.5, 8.2, 2.6] },
    { id: 'print', n: 'ПРИНТ-ЗОНА', c: '#B07CF0', x0: 0, z0: 7, x1: 12, z1: 14, fl: '#CFC9E2', sg: [3, 7.3], ft: [3, 8.3, 3] },
    { id: 'chill', n: 'ЧИЛ-ЗОНА', c: '#FF8A7A', x0: 12, z0: 7, x1: 22, z1: 14, fl: '#7FB8A8', sg: [14.2, 7.3], ft: [19.5, 8.3, 2.8] },
  ];
  const D = [[-19.5, -2.5], [-15.5, -2.5], [-19.5, 1.5], [-15.5, 1.5], [-19.5, 5.5], [-15.5, 5.5], [-19.5, 9.5], [-15.5, 9.5]];
  Lx.desks = D.map(([x, z], i) => ({ i, lx: x, lz: z, x: OX + x, z: OZ + z, p: W(x + 1.15, z + .8) }));
  Lx.s = {
    START: st(-6.5, 9.6, -6.5, 11, .7), SEND: st(-17, -12.6, -17, -11.2, .6),
    PRINTER: st(6, 13, 6, 11.4, .75), STAPLER: st(11.3, 8.3, 10.1, 8.3, .55),
    COFFEE: st(17, -6.25, 17, -4.85, .55), VALVE: st(21.65, 4, 20.6, 4, .35), PANEL: st(11.75, 5.3, 10.7, 5.3, .35),
    ARCHIVE: st(21.4, -10, 20.2, -10, .6), RACK: st(-6.5, -12.9, -6.5, -11.3, .75), SCANNER: st(-3.6, -10.5, -4.8, -10.5, .5), STAMP: st(1.5, -11, 1.5, -9.6, .55),
    BOSS_DESK: W(14, -11.3), CLOCK: W(-1, -7),
  };
  Lx.racks = [[-10, -12.9], [-6.5, -12.9], [-10, -9.6]];
  Lx.pads = [W(-9, 13), W(-6.5, 13), W(-4, 13)]; Lx.exit = W(-1.6, 13);
  Lx.tube = [st(-21.4, -5.2, -20.3, -5.2, .35), st(1, 13.1, 1, 11.9, .35)];                                       // хотдеск ↔ принт-зона
  Lx.stairs = { a: W(8.4, -12.4), b: W(20.4, 12.3), da: [8.4, -13.4, 0], db: [20.4, 13.4, Math.PI], ic: '🛝', n: 'Гірка', kind: 'slide' };
  Lx.bpath = [W(14, -12.6), W(16.4, -12.6), W(16.4, -9.3), W(9, -9.3), W(9, -5.6), W(6, -5.6), W(6, 0), W(1.2, 0)];   // CEO: кабінет → стендап на скляному мосту
  Lx.chairs = [[-1.3, -11.9], [13.6, 10.2]];
  seal(Lx, decoV3);
}
/* декор стартапу */
function decoV3(K) {
  decoStations(K, 'startup');
  // атріум: дві шахти вниз (видно вогні нижніх поверхів), скляний міст, рослини
  for (const z0 of [-4.5, 1.4]) {
    K.box(0, .02, z0 + 1.55, 8, .02, 3.1, '#120E26');
    for (let k = 0; k < 7; k++) K.glow(-3.3 + k * 1.1, .03, z0 + .5 + (k % 3) * .9, .5, .01, .25, k % 2 ? '#FFD27A' : '#6BE7FF');
  }
  K.box(0, .045, 0, 8, .02, 2.8, '#BFE6FF');
  for (const x of [-3, -1, 1, 3]) K.box(x, .06, 0, .05, .02, 2.8, '#8E86B0');
  for (const [x, z] of [[-11, 6.2], [11, -6.2], [-11, -6.2]]) K.plant(x, z, 1.3);
  K.sign('SYNERGY · ХМАРА ВСЕ ЗБЕРЕЖЕ', '#FF6BD6', -7, -6.75, 5.4, 2.1);
  // хотдеск: мішки-крісла й «стіна ідей»
  for (const [x, z, c] of [[-13.4, -5.6, '#FF6BD6'], [-13.4, 12.8, '#6BE7FF'], [-21, 12.8, '#FFD27A'], [-13.3, 3.8, '#7FE08A']]) { K.bag(x, z, c); }
  { const q = K.grp(-21.85, 4, Math.PI / 2); K.GB(q, 0, 1.3, 0, 4, 1.2, .05, '#FFFFFF'); for (let k = 0; k < 12; k++) K.GB(q, -1.7 + (k % 6) * .65, 1.05 + Math.floor(k / 6) * .45, .04, .4, .3, .02, ['#FFE066', '#FF8AD8', '#7FE08A', '#6BE7FF'][k % 4]); }
  // мейл-рум: стелаж з посилками, візок, сортувальні комірки
  K.box(-21.5, .9, -10.5, .6, 1.8, 4, '#8C6A4E', true);
  for (let k = 0; k < 9; k++) K.box(-21.4, .3 + (k % 3) * .55, -12 + Math.floor(k / 3) * 1.4, .45, .4, .9, ['#C4956A', '#A97A50', '#E8D2B0'][k % 3]);
  K.box(-14, .5, -9, .8, .5, 1.2, '#9F98B8', true); K.box(-14, .85, -9, .7, .3, 1, '#C4956A');
  K.plant(-12.8, -13.2);
  // серверна
  K.box(-11.5, 1.6, -7.8, 1.4, .7, .5, '#E8E3F0', true);
  // фінвідділ: два бухгалтери, шафи
  K.table(4.3, -12.8, 1.6, .8, '#C9B8F0', '#8C84B0'); K.monitor(4.3, -12.95, 1, true, 2); K.keyboard(4.3, -12.6); K.chair(4.3, -13.45, 0, '#2F8F7A'); K.person(4.3, -13.45, 0, '#F3C9A8', '#2F8F7A', true);
  K.box(-2.4, .65, -12.5, .7, 1.3, 2.4, '#9F98B8', true);
  K.plant(5.3, -7.8, .8);
  // кабінет CEO: диван, телевізор з графіком «тільки вгору», гонг, сейф з NDA (архів), вхід на гірку
  K.rug(14, -10.5, 6, 4, '#4A3A6E');
  K.sofa(10.6, -12.9, 2.4, 0, '#2E2346'); K.box(10.6, .25, -11.6, 1.2, .4, .6, '#FFFFFF', true);
  K.box(18.6, .3, -13.6, 2.2, .6, .5, '#4E4A6E', true); K.box(18.6, 1.4, -13.65, 2.4, 1.2, .08, '#2E2346'); K.glow(18.6, 1.4, -13.6, 2.2, 1.05, .01, '#7FE08A');
  for (let k = 0; k < 5; k++) K.box(17.8 + k * .4, 1.05 + k * .1, -13.55, .22, .2 + k * .2, .01, '#2E8F5A');
  K.cyl(21.2, 1, -7.9, .5, .5, .08, '#FFD27A', 16); K.box(21.2, .5, -7.9, .08, 1, .08, '#4E4A6E'); K.ob(21.2, -7.9, .4);
  K.plant(6.8, -7.8, 1.1); K.plant(21.2, -13.2, 1.1);
  // бариста-бар: високі столики й табурети, неон
  K.tiles(12, -7, 22, 7, '#8C5A3C', '#7A4E34', 1);
  for (const [x, z] of [[15.5, 1.5], [19, 1.5], [15.5, -2.5]]) { K.cyl(x, 1.05, z, .45, .45, .05, '#FFFFFF', 12, .45); K.cyl(x, .52, z, .05, .1, 1.05, '#4E4A6E', 6); for (const a of [.6, 3.7]) K.cyl(x + Math.sin(a) * .7, .7, z + Math.cos(a) * .7, .18, .18, .06, '#FFD27A', 8); }
  K.sign('☕ BARISTA', '#FFD27A', 17, 6.75, 2.6);
  K.plant(12.8, 6.2); K.plant(21.2, -6.2, .9);
  // ресепшн: диван для кандидатів, рослини
  K.plant(-11.2, 8.3, 1.1); K.plant(-11.3, 13.2); K.plant(-.8, 8.2, .9);
  // принт-зона: другий копір, коробки
  K.box(3.4, .5, 13.2, 1.1, 1, 1, '#D9D2F0', true); K.box(3.4, 1.05, 13.2, 1, .1, .9, '#4E4A6E');
  K.box(9, .3, 13.4, .6, .6, .5, '#C4956A', true); K.box(9.6, .3, 13.4, .5, .6, .5, '#C4956A', true);
  // чил-зона: пінг-понг, мішки, ігрова приставка, вихід гірки
  K.rug(16.5, 10.5, 8, 5, '#5FA894');
  K.box(16.5, .74, 10.8, 2.7, .06, 1.5, '#2F8F7A', true); K.box(16.5, .9, 10.8, .04, .25, 1.6, '#FFFFFF'); for (const sx of [-1, 1]) for (const sz of [-1, 1]) K.box(16.5 + sx * 1.2, .37, 10.8 + sz * .6, .06, .74, .06, '#4E4A6E');
  K.bag(13.5, 13.1, '#FF8A7A'); K.bag(14.8, 13.2, '#B07CF0');
  K.box(12.6, 1.1, 8.6, .08, .9, 1.6, '#2E2346'); K.glow(12.65, 1.1, 8.6, .01, .8, 1.5, '#FF6BD6');
}

/* ---------- Набір меблів: без групи (сервер і перший прохід) лише записує тверді перешкоди, з групою — ще й будує меші ---------- */
function makeKit(g) {
  const K = {
    g,
    ob(x, z, r) { if (!g) ob(x, z, r); },
    obBox(x, z, w, d) { if (!g) obBox(x, z, w, d); },
    box(x, y, z, w, h, d, c, solid) { if (solid) K.obBox(x, z, w, d); return g ? put(g, mesh(new THREE.BoxGeometry(w, h, d), c, false, true), OX + x, y, OZ + z) : null; },
    cyl(x, y, z, rt, rb, h, c, seg = 10, sr) { if (sr) K.ob(x, z, sr); return g ? put(g, mesh(flat(new THREE.CylinderGeometry(rt, rb, h, seg)), c, false), OX + x, y, OZ + z) : null; },
    glow(x, y, z, w, h, d, c) { return g ? put(g, mesh(new THREE.BoxGeometry(w, h, d), bulb(c), false), OX + x, y, OZ + z) : null; },
    grp(x, z, ry) { if (!g) return null; const q = new THREE.Group(); q.position.set(OX + x, 0, OZ + z); q.rotation.y = ry || 0; g.add(q); return q; },
    GB(q, x, y, z, w, h, d, c) { return q ? put(q, mesh(new THREE.BoxGeometry(w, h, d), c, false), x, y, z) : null; },
    GC(q, x, y, z, rt, rb, h, c, seg = 10) { return q ? put(q, mesh(flat(new THREE.CylinderGeometry(rt, rb, h, seg)), c, false), x, y, z) : null; },
    plant(x, z, s = 1, solid = true) {
      if (solid) K.ob(x, z, .3 * s); if (!g) return;
      K.cyl(x, .25 * s, z, .26 * s, .2 * s, .5 * s, '#C4956A', 8); put(g, mesh(new THREE.IcosahedronGeometry(.45 * s, 0), '#5FBF7A', false), OX + x, .85 * s, OZ + z); put(g, mesh(new THREE.IcosahedronGeometry(.3 * s, 0), '#7FD99A', false), OX + x + .15 * s, 1.15 * s, OZ + z - .1);
    },
    table(x, z, w, d, top = '#E8E3F0', leg = '#9F98B8', h = .74, solid = true) {
      if (solid) K.obBox(x, z, w, d); if (!g) return;
      K.box(x, h, z, w, .06, d, top); for (const sx of [-1, 1]) for (const sz of [-1, 1]) K.box(x + sx * (w / 2 - .08), h / 2, z + sz * (d / 2 - .08), .06, h, .06, leg);
    },
    // офісне крісло: ry=0 — сидить обличчям до +z
    chair(x, z, ry, col = '#3E4A7C', big) {
      const q = K.grp(x, z, ry); if (!q) return null; const k = big ? 1.25 : 1;
      K.GB(q, 0, .46, 0, .5 * k, .09, .48 * k, col); K.GB(q, 0, .8 * k, -.24 * k, .48 * k, .6 * k, .08, col);
      if (big) for (const sx of [-.33, .33]) K.GB(q, sx, .62, 0, .08, .08, .5, col);
      K.GB(q, 0, .24, 0, .05, .4, .05, '#4E4A6E');
      for (let a = 0; a < 5; a++) { const l = K.GB(q, 0, .05, 0, .05, .04, .5, '#4E4A6E'); l.rotation.y = a / 5 * Math.PI * 2; }
      return q;
    },
    monitor(x, z, dir, on = true, k = 0) {
      if (!g) return; const SCR = ['#6BE7FF', '#B07CF0', '#7FE08A', '#FFD27A', '#FF8AD8'];
      K.box(x, .79, z, .24, .03, .16, '#2E2346'); K.box(x, .93, z, .05, .26, .05, '#2E2346'); K.box(x, 1.12, z, .74, .44, .05, '#2E2346');
      put(g, mesh(new THREE.BoxGeometry(.66, .36, .01), on ? bulb(SCR[k % SCR.length]) : '#1C1830', false), OX + x, 1.12, OZ + z + dir * .03);
    },
    keyboard(x, z) { K.box(x, .785, z, .5, .025, .17, '#4E4A6E'); K.box(x + .38, .785, z, .08, .03, .12, '#4E4A6E'); },
    sofa(x, z, w, ry, col, solid = true) {
      if (solid) { const s = Math.abs(Math.sin(ry || 0)) > .7; K.obBox(x, z, s ? .85 : w, s ? w : .85); }
      const q = K.grp(x, z, ry); if (!q) return; const dk = shade(col, -.1);
      K.GB(q, 0, .22, 0, w, .3, .85, dk); K.GB(q, 0, .45, .05, w - .3, .16, .7, col); K.GB(q, 0, .7, -.34, w, .55, .2, col); for (const sx of [-1, 1]) K.GB(q, sx * (w / 2 - .1), .5, 0, .2, .4, .85, dk);
    },
    shelf(x, z, w, d, h, ry, books, solid = true) {
      if (solid) { const s = Math.abs(Math.sin(ry || 0)) > .7; K.obBox(x, z, s ? d : w, s ? w : d); }
      const q = K.grp(x, z, ry); if (!q) return; K.GB(q, 0, h / 2, 0, w, h, d, '#8C6A4E');
      for (let r = 0; r < 3; r++) for (let k = 0; k < Math.floor(w / .3); k++) if ((k * 7 + r * 3) % 5) K.GB(q, -w / 2 + .2 + k * .3, .3 + r * (h / 3), d / 2 + .01, .2, h / 3 - .15, .04, books[(k + r) % books.length]);
    },
    rug(x, z, w, d, c) { K.box(x, .06, z, w, .012, d, c); },
    tiles(x0, z0, x1, z1, a, b, s = 1) { if (!g) return; for (let i = 0; x0 + i * s < x1 - .01; i++) for (let j = 0; z0 + j * s < z1 - .01; j++) if ((i + j) % 2) K.box(x0 + i * s + s / 2, .058, z0 + j * s + s / 2, s - .02, .012, s - .02, b); },
    bag(x, z, c) { K.ob(x, z, .45); if (!g) return; const m = put(g, mesh(new THREE.IcosahedronGeometry(.5, 1), c, false), OX + x, .3, OZ + z); m.scale.set(1, .62, 1); },
    // неонова табличка (з текстурою — тому окремо від статики)
    sign(txt, col, x, z, w, y = 1.85, ry = 0) {
      if (!g) return null; w = w || Math.max(1.6, txt.length * .19 + .5);
      const n = neonSign(txt, col, w, .48); n.position.set(OX + x, y, OZ + z); n.rotation.y = ry; scene.add(A.dynamic(n));
      if (y < 2.4 && !ry) for (const sx of [-w / 2 + .15, w / 2 - .15]) K.box(x + sx, y - .4, z - .02, .05, .5, .05, '#4E4A6E');
      return n;
    },
    floorTxt(txt, col, x, z, w) {
      if (!g) return; const c = document.createElement('canvas'); c.width = 512; c.height = 96; const x2 = c.getContext && c.getContext('2d');
      if (x2 && x2.fillText) { x2.font = 'bold 60px sans-serif'; x2.textAlign = 'center'; x2.textBaseline = 'middle'; x2.lineWidth = 10; x2.strokeStyle = 'rgba(46,35,70,.55)'; x2.strokeText(txt, 256, 50); x2.fillStyle = col; x2.fillText(txt, 256, 50); }
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 96 / 512), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, opacity: .85, depthWrite: false }));
      m.rotation.x = -Math.PI / 2; m.position.set(OX + x, .075, OZ + z); m.renderOrder = 1; scene.add(A.dynamic(m));
    },
    person(x, z, ry, skin, shirt, seated) {
      if (!g) return null; const h = buildOffice(skin, shirt);
      h.root.position.set(OX + x, seated ? .12 : 0, OZ + z); h.root.rotation.y = ry || 0;
      if (seated) { h.l1.rotation.x = h.l2.rotation.x = -1.4; h.body.position.y = -.3; h.aR.rotation.x = h.aL.rotation.x = -1.1; }
      scene.add(A.dynamic(h.root)); return h;
    },
    // станція: група в точці об'єкта, повернута «лицем» (+z) до місця, де стоїть гравець; fr — точка в цій системі
    ang: s => Math.atan2(s.pl.x - s.l.x, s.pl.z - s.l.z),
    fr(s, dx, dz) { const a = K.ang(s); return { x: s.l.x + Math.cos(a) * dx + Math.sin(a) * dz, z: s.l.z - Math.sin(a) * dx + Math.cos(a) * dz }; },
    st(s, w, d) { const a = K.ang(s), sw = Math.abs(Math.sin(a)) > .7; K.obBox(s.l.x, s.l.z, sw ? d : w, sw ? w : d); return K.grp(s.l.x, s.l.z, a); },
    dyn(m, s, dx, y, dz) { const p = K.fr(s, dx, dz); m.position.set(OX + p.x, y, OZ + p.z); m.rotation.y = K.ang(s); scene.add(A.dynamic(m)); return m; },
  };
  return K;
}

/* ---------- Робочі точки поверху (для банку й стартапу; поверх 42 будується своїм кодом) ---------- */
function decoStations(K, style) {
  const bank = style === 'bank', g = K.g, wood = bank ? '#7A5A2E' : '#2E2346', acc = bank ? '#C9A35E' : '#FF6BD6';
  // ▶ СТАРТ — стійка ресепшну / пост охорони
  { const q = K.st(START, 2.8, .8); K.GB(q, 0, .52, 0, 2.8, 1.04, .8, wood); K.GB(q, 0, 1.07, .1, 3, .06, 1, '#FFFFFF'); K.GB(q, 0, .5, .41, 2.8, .6, .02, acc); K.GB(q, -.6, 1.3, -.2, .7, .42, .05, '#2E2346'); K.GC(q, .8, 1.15, .25, .08, .18, .14, '#FFD27A'); K.ob(START.l.x - Math.sin(K.ang(START)) * .8, START.l.z - Math.cos(K.ang(START)) * .8, .3);
    if (g) { const p = K.fr(START, 0, -.85); V.recep = K.person(p.x, p.z, K.ang(START), '#F0D2B6', bank ? '#2E2346' : '#FF8AD8'); K.dyn(neonSign('▶ СТАРТ', '#7FE08A', 1.5, .4), START, 0, 1.55, .45); } }
  // 📤 Відправка
  { const q = K.st(SEND, 1.2, .7); K.GB(q, 0, .5, 0, 1.2, 1, .7, bank ? '#5B4A2E' : '#5B3E9A'); for (let k = 0; k < 3; k++) { K.GB(q, 0, 1.06 + k * .16, 0, .7, .03, .5, '#FFD27A'); for (const sx of [-.33, .33]) K.GB(q, sx, 1.1 + k * .16, 0, .03, .1, .5, '#FFD27A'); }
    if (g) K.dyn(neonSign(bank ? '📤 ІНКАСАЦІЯ' : '📤 ВІДПРАВКА', '#FFD27A', 1.9, .4), SEND, 0, 1.75, .4); }
  // 🖨️ принтер
  { const q = K.st(PRINTER, 1.4, 1.2); K.GB(q, 0, .55, 0, 1.4, 1.1, 1.2, '#E8E3F0'); K.GB(q, 0, 1.18, 0, 1.3, .16, 1.1, '#4E4A6E'); K.GB(q, 0, .85, .75, .9, .05, .4, '#FFFFFF'); for (let k = 0; k < 3; k++) K.GB(q, 0, .25 + k * .25, .61, 1.2, .02, .02, '#9F98B8');
    if (g) V.prLight = K.dyn(new THREE.Mesh(new THREE.BoxGeometry(.3, .14, .06), new THREE.MeshStandardMaterial({ color: '#7FE08A', emissive: '#7FE08A', emissiveIntensity: 1 })), PRINTER, .45, 1, .62); }
  // 📎 степлер
  { const q = K.st(STAPLER, 1.6, .9); K.GB(q, 0, .74, 0, 1.6, .06, .9, '#D9D2F0'); for (const sx of [-.7, .7]) K.GB(q, sx, .37, 0, .06, .74, .8, '#9F98B8'); K.GB(q, 0, .82, 0, .32, .1, .1, '#E8505B'); K.GB(q, .45, .8, 0, .4, .06, .3, '#FFFFFF'); }
  // ☕ кавоварка на стільниці
  { const q = K.st(COFFEE, 2.4, .8); K.GB(q, 0, .45, 0, 2.4, .9, .8, bank ? '#E8E3F0' : '#3E2A22'); K.GB(q, 0, .92, 0, 2.5, .05, .85, bank ? '#FFFFFF' : '#C9A35E'); K.GB(q, 0, 1.35, -.05, .65, .8, .6, '#2E2346'); K.GB(q, 0, 1.5, .26, .4, .2, .05, '#FF6BD6'); K.GC(q, 0, 1.02, .35, .07, .05, .12, '#FFFFFF', 8); K.GB(q, -.85, 1.12, 0, .55, .35, .4, '#C9CDD9'); }
  // 🚿 вентиль спринклерів
  { const q = K.st(VALVE, .4, .4); K.GC(q, 0, .75, 0, .06, .06, 1.5, '#C2335A', 6); if (q) put(q, mesh(new THREE.TorusGeometry(.2, .05, 6, 12), '#E8505B', false), 0, 1.2, .12); }
  // ⚡ щиток
  { const q = K.st(PANEL, .7, .3); K.GB(q, 0, .9, 0, .8, 1, .25, '#8E86B0'); if (q) put(q, mesh(new THREE.BoxGeometry(.3, .3, .05), bulb('#FFE066'), false), 0, 1, .14); }
  // 🗂️ архів: депозитні скриньки в сховищі / сейф з NDA
  { const q = K.st(ARCHIVE, 2, .8); K.GB(q, 0, .8, 0, 2, 1.6, .8, bank ? '#9F98B8' : '#2E2346');
    for (let r = 0; r < 4; r++) for (let k = 0; k < (bank ? 6 : 2); k++) K.GB(q, bank ? -.8 + k * .32 : -.45 + k * .9, .3 + r * .36, .41, bank ? .26 : .8, .28, .03, bank ? '#C9A35E' : '#4E4A6E');
    if (!bank && g) K.dyn(neonSign('NDA', '#FF6BD6', .9, .3), ARCHIVE, 0, 1.75, .42); }
  // 🌀 стійки серверної; та, що з вентилятором, — RACK
  for (const [x, z] of L.racks) {
    K.box(x, .9, z, 1.4, 1.8, 1, '#2E2346', true);
    if (g) for (let k = 0; k < 10; k++) put(g, mesh(new THREE.BoxGeometry(.1, .05, .02), bulb(k % 3 ? '#7FE08A' : '#6BE7FF'), false), OX + x - .45 + (k % 5) * .22, .45 + Math.floor(k / 5) * .7, OZ + z + .51);
  }
  if (g) {
    V.fan = new THREE.Mesh(new THREE.BoxGeometry(.1, .6, .02), mat('#8E86B0')); V.fan.position.set(RACK.o.x, 1.35, RACK.o.z + .53); scene.add(A.dynamic(V.fan));
    put(g, mesh(new THREE.TorusGeometry(.34, .04, 6, 16), '#6BE7FF', false), RACK.o.x, 1.35, RACK.o.z + .52);
    V.srvLight = new THREE.Mesh(new THREE.BoxGeometry(1.42, .08, 1.02), new THREE.MeshStandardMaterial({ color: '#6BE7FF', emissive: '#6BE7FF', emissiveIntensity: 1 })); V.srvLight.position.set(RACK.o.x, 1.84, RACK.o.z); scene.add(A.dynamic(V.srvLight));
  }
  // 📠 сканер
  { const q = K.st(SCANNER, 1.4, .9); K.GB(q, 0, .74, 0, 1.4, .06, .9, '#D9D2F0'); for (const sx of [-.62, .62]) K.GB(q, sx, .37, 0, .06, .74, .8, '#9F98B8'); K.GB(q, 0, .88, 0, .8, .18, .6, '#4E4A6E'); if (q) put(q, mesh(new THREE.BoxGeometry(.7, .02, .5), bulb('#6BE7FF'), false), 0, .98, 0); }
  // 🔏 печатка: головна бухгалтерка за столом
  { const q = K.st(STAMP, 1.8, .9); K.GB(q, 0, .74, 0, 1.8, .06, .9, '#C9B8F0'); for (const sx of [-.82, .82]) K.GB(q, sx, .37, 0, .06, .74, .8, '#8C84B0'); K.GC(q, -.1, .9, .1, .1, .12, .2, '#C2335A'); K.GB(q, .35, .79, .1, .3, .03, .22, '#3E3A5C'); K.GB(q, -.55, .79, 0, .3, .02, .4, '#FFFFFF'); K.GB(q, -.5, 1.05, -.3, .66, .4, .05, '#2E2346');
    const c = K.fr(STAMP, 0, -.85); K.ob(c.x, c.z, .3);
    if (g) { K.chair(c.x, c.z, K.ang(STAMP), '#2F8F7A'); V.acc = K.person(c.x, c.z, K.ang(STAMP), '#E6C9B0', '#2F8F7A', true); } }
  // 👔 стіл начальника + шкіряне крісло
  { const bx = BOSS_DESK.x - OX, bz = BOSS_DESK.z - OZ; K.table(bx, bz, 2.6, 1.1, '#6B4A3A', '#4A3328'); K.box(bx, .42, bz + .52, 2.5, .62, .05, '#5A3D30'); K.monitor(bx - .9, bz - .2, -1); K.box(bx, .86, bz + .45, .6, .12, .05, '#FFD27A'); K.ob(bx, bz - 1.2, .35);
    if (g) { K.chair(bx, bz - 1.2, 0, '#3A2A2A', true); K.chair(bx - .7, bz + 1.5, Math.PI, '#7A5BC9'); K.chair(bx + .7, bz + 1.5, Math.PI, '#7A5BC9'); } }
  // столи колег з даними: каси в банку, хотдеск у стартапі
  for (const d of L.desks) {
    K.table(d.lx, d.lz, 1.6, .8, bank ? '#E9DFC9' : '#FFFFFF', bank ? '#7A5A2E' : '#9F98B8'); K.ob(d.lx, d.lz + .75, .32);
    if (!g) continue;
    if (bank) { K.box(d.lx, 1.15, d.lz - .42, 1.6, .8, .04, '#BFE6FF'); K.box(d.lx, .5, d.lz - .42, 1.6, .9, .06, '#7A5A2E'); K.box(d.lx - .55, .8, d.lz - .1, .3, .1, .2, '#7FE08A'); }
    else { K.box(d.lx + .2, .8, d.lz - .05, .44, .03, .3, '#C9CDD9'); K.box(d.lx + .2, .95, d.lz - .2, .44, .3, .02, '#2E2346'); K.cyl(d.lx - .5, .83, d.lz, .05, .04, .12, '#FFFFFF', 8); }
    if (bank) K.monitor(d.lx, d.lz - .15, 1, true, d.i);
    K.chair(d.lx, d.lz + .78, Math.PI, bank ? '#7A5A2E' : '#5CC8FF');
    const h = K.person(d.lx, d.lz + .72, Math.PI, pick(['#F3C9A8', '#E6C9B0', '#D9C7A9', '#F0D2B6']), bank ? pick(['#2E2346', '#3E4A7C', '#7A5A2E', '#C2335A']) : pick(['#FF6BD6', '#6BE7FF', '#7FE08A', '#FFD27A', '#B07CF0']), true);
    const icon = sprite('📄', .8); icon.position.set(d.x, 2.25, d.z + .72); icon.visible = false; scene.add(A.dynamic(icon));
    V.cols[d.i] = { h, icon, ent: { x: d.x, z: d.z + .72, y: 0, bh: 2 } };
  }
}

/* ---------- Спільне для всіх поверхів: ліфти з панелями голосування, пневмопошта, пожежні сходи/гірка ---------- */
function decoCommon(K, Lx) {
  const g = K.g;
  for (const T of TUBE) K.ob(T.l.x, T.l.z, .35);
  if (!g) return;
  // ліфти на стіні за панелями (низькі, щоб не закривати огляд)
  const lift = (x, txt, col) => {
    const z = HZ - .2; K.box(x, .65, z, 1.9, 1.3, .12, '#C9CDD9'); K.box(x - .45, .62, z - .07, .86, 1.2, .03, '#9F98B8'); K.box(x + .45, .62, z - .07, .86, 1.2, .03, '#9F98B8');
    K.glow(x, 1.4, z - .08, .5, .14, .02, col); K.sign(txt, col, x, z - .2, 1.9, 1.75);
  };
  PADS.forEach((p, k) => {
    const lx = p.x - OX; lift(lx, `🛗 ${LAY[k].fl}`, LAY[k].pc);
    const q = new THREE.Group(); q.position.set(p.x, 0, p.z); scene.add(A.dynamic(q));
    put(q, mesh(flat(new THREE.CylinderGeometry(.78, .78, .05, 24)), '#2E2346', false), 0, .07, 0);
    put(q, mesh(new THREE.TorusGeometry(.72, .07, 6, 28), bulb(LAY[k].pc), false), 0, .1, 0).rotation.x = Math.PI / 2;
    Lx.v.pads[k] = q; K.floorTxt(LAY[k].fl, LAY[k].pc, lx, p.z - OZ + .05, 1.1);
  });
  lift(Lx.exit.x - OX, '⬇️ ХАБ', '#FFFFFF');
  // пневмопошта: дві колби й труба під стелею між ними
  const pipe = mat('#BFE6FF', { transparent: true, opacity: .45, depthWrite: false });
  for (const T of TUBE) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(.2, .2, 2.4, 10), pipe); m.position.set(T.o.x, 1.3, T.o.z); g.add(m);
    K.box(T.l.x, .45, T.l.z, .6, .9, .5, '#4E4A6E'); K.glow(T.l.x, .95, T.l.z, .4, .08, .45, '#FFB35C');
  }
  { const a = TUBE[0].o, b = TUBE[1].o, len = dist2(a.x, a.z, b.x, b.z), m = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, len, 8), pipe);
    m.position.set((a.x + b.x) / 2, 2.5, (a.z + b.z) / 2); m.rotation.z = Math.PI / 2; m.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x); g.add(m); }
  // пожежні сходи / гірка
  for (const [x, z, ry] of [STAIRS.da, STAIRS.db]) {
    const q = K.grp(x, z, ry);
    if (STAIRS.kind === 'slide') { K.GC(q, 0, .9, 0, .75, .75, 1.8, '#FFD27A', 14); K.GC(q, 0, .9, .02, .6, .6, 1.82, '#2E2346', 14); }
    else { K.GB(q, 0, .7, 0, 1.4, 1.4, .1, '#C2335A'); K.GB(q, 0, .7, .06, 1.2, 1.25, .03, '#E8505B'); K.GB(q, .4, .7, .09, .2, .05, .05, '#C9CDD9'); }
    const n = neonSign(STAIRS.kind === 'slide' ? '🛝 ГІРКА' : '🚪 EXIT', STAIRS.kind === 'slide' ? '#FFD27A' : '#7FE08A', 1.4, .36); n.position.set(OX + x, 1.75, OZ + z); n.rotation.y = ry; n.position.x += Math.sin(ry) * .1; n.position.z += Math.cos(ry) * .1; scene.add(A.dynamic(n));
  }
}

/* ---------- Геометрія: стіни й меблі поточного поверху (для зомбі, начальника й предметів) ---------- */
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
  for (let k = 0; k < 40; k++) { const a = k * 2.4, d = k * .12, nx = x + Math.cos(a) * d, nz = z + Math.sin(a) * d; if (!blocked(nx, nz, .3) && reachable(nx, nz)) return { x: nx, z: nz }; }
  return { x: SEND.p.x, z: SEND.p.z };
}
/* ---------- Навігація зомбі: сітка 0,5 м по поверху й пошук шляху крізь двері (BFS) ---------- */
function navBuild() {
  const b = new Uint8Array(NAV.nx * NAV.nz);
  for (let i = 0; i < NAV.nx; i++) for (let j = 0; j < NAV.nz; j++) b[i + j * NAV.nx] = blocked(NAV.x0 + (i + .5) * NAV.cell, NAV.z0 + (j + .5) * NAV.cell, .3) ? 1 : 0;
  NAV.block = b;
}
const cellOf = (x, z) => [clamp(Math.floor((x - NAV.x0) / NAV.cell), 0, NAV.nx - 1), clamp(Math.floor((z - NAV.z0) / NAV.cell), 0, NAV.nz - 1)];
function reachable(x, z) { if (!L || !L.reach) return true; const [i, j] = cellOf(x, z); return !!L.reach[i + j * NAV.nx]; }
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

/* ---------- Три поверхи: острови, логіка, фізика ---------- */
mkV1(); mkV2(); mkV3(); useVar(0);
LAY.forEach((Lx, i) => A.island({ id: Lx.id, n: '⏰ Дедлайн · ' + Lx.n, sub: 'кооп · квартальний звіт до 18:00 · ' + Lx.short, x: Lx.x, z: Lx.z, r: ISL_R, top: '#C9C3DC', rock: '#6E668E', biome: 'officeday', dlv: i, tier: 1, safe: true }));
const _buildIsland = buildIsland;
buildIsland = function (s) { if (s.biome !== 'officeday' || s.dlv == null) return _buildIsland.apply(this, arguments); return SIMSIDE ? new THREE.Group() : buildVariant(s.dlv); };

/* ---------- Стан раунду ---------- */
const ST = { on: false, t: 0, dur: 300, lv: 0, steps: [], si: 0, need: 3, fed: 0, desk: [], held: {}, floor: [], zom: [], boss: { x: BPATH[0].x, z: BPATH[0].z, f: 0, i: 0, dir: 1, wait: 6, at: 'desk' },
  coffee: 0, jam: 0, pw: 1, heat: 0, cm: 1, rain: 0, fixes: 0, vi: 0, vo: [0, 0, 0], nx: 0, rhp: 100, fly: null, tb: [], xl: null, rid: 0, pf: 1 };
const AU = { chaosT: 25, jamP: .45, boomP: .3, jammed: 0, boomed: 0, pwT: 0, rainT: 0, dropT: 0, idle: 0, stT: 0, fid: 0, zid: 0, wins: 0, away: {}, votes: {}, won: 0, vsig: '', excel: 1 };
const TUBE_T = 2.6;
const myKey = () => (NET.on && typeof WORLD !== 'undefined' && WORLD.on ? myName() : 'me');
const keyOf = from => SIMSIDE ? String(from && from.name || '') : 'me';
const r2 = v => Math.round(v * 100) / 100;
const cur = () => ST.steps[ST.si] || '';
const heldOf = k => ST.held[k] || { it: '', n: 0, cup: 0 };
const myHeld = () => heldOf(myKey());
function setHeld(k, it, n, cup) { if (!it && !cup) delete ST.held[k]; else ST.held[k] = { it: it || '', n: it ? Math.max(1, n | 0) : 0, cup: cup ? 1 : 0 }; }
function snap() {
  const F = ST.fly;
  return { on: ST.on ? 1 : 0, t: r2(ST.t), dur: ST.dur, lv: ST.lv, st: ST.steps, si: ST.si, nd: ST.need, fd: ST.fed, dk: ST.desk, vi: ST.vi, vo: ST.vo, nx: ST.nx, rh: Math.round(ST.rhp), rid: ST.rid, pf: ST.pf,
    h: Object.entries(ST.held).map(([k, v]) => [k, v.it, v.n, v.cup]), f: ST.floor.map(f => [f.id, f.it, f.n, r2(f.x), r2(f.z)]),
    z: ST.zom.map(z => [z.id, r2(z.x), r2(z.z), r2(z.f), z.stun > 0 ? 1 : 0, z.carry ? z.carry.it : '', z.carry ? z.carry.n : 0]),
    fl: F ? [F.id, r2(F.x0), r2(F.z0), r2(F.x1), r2(F.z1), r2(F.T), r2(F.t), F.by] : 0, tb: ST.tb.map(c => [c.id, c.it, c.to, r2(c.t)]), xl: ST.xl ? [ST.xl.i, r2(ST.xl.t)] : 0,
    b: [r2(ST.boss.x), r2(ST.boss.z), r2(ST.boss.f), ST.boss.at], cf: ST.coffee, jm: ST.jam, pw: ST.pw, ht: ST.heat, cm: ST.cm, rn: ST.rain, fx: ST.fixes };
}
function applySnap(d) {
  const vi = clamp(d.vi | 0, 0, LAY.length - 1);
  if (vi !== ST.vi || L !== LAY[vi]) { ST.vi = vi; useVar(vi); }
  Object.assign(ST, { on: !!d.on, t: +d.t || 0, dur: +d.dur || 300, lv: d.lv | 0, si: d.si | 0, need: d.nd | 0, fed: d.fd | 0, coffee: d.cf ? 1 : 0, jam: d.jm ? 1 : 0, pw: d.pw ? 1 : 0, heat: d.ht ? 1 : 0, cm: d.cm ? 1 : 0, rain: d.rn ? 1 : 0, fixes: d.fx | 0,
    nx: clamp(d.nx | 0, 0, LAY.length - 1), rhp: d.rh == null ? 100 : clamp(+d.rh, 0, 100), rid: d.rid | 0, pf: d.pf ? 1 : 0 });
  if (Array.isArray(d.vo)) ST.vo = [0, 1, 2].map(i => d.vo[i] | 0);
  if (Array.isArray(d.st)) ST.steps = d.st.filter(s => STEPS[s]).slice(0, 10);
  if (Array.isArray(d.dk)) ST.desk = DESKS.map((_, i) => d.dk[i] ? 1 : 0);
  if (Array.isArray(d.h)) { ST.held = {}; for (const a of d.h.slice(0, 16)) if (a && (ITEM[a[1]] || a[3])) ST.held[String(a[0])] = { it: ITEM[a[1]] ? a[1] : '', n: a[2] | 0, cup: a[3] ? 1 : 0 }; }
  if (Array.isArray(d.f)) ST.floor = d.f.slice(0, 20).filter(a => ITEM[a[1]]).map(a => ({ id: a[0], it: a[1], n: a[2] | 0, x: +a[3], z: +a[4] }));
  if (Array.isArray(d.z)) {
    const old = new Map(ST.zom.map(z => [z.id, z]));
    ST.zom = d.z.slice(0, 12).map(a => { const z = old.get(a[0]) || { id: a[0], x: +a[1], z: +a[2] }; return Object.assign(z, { tx: +a[1], tz: +a[2], f: +a[3], stun: a[4] ? 1 : 0, carry: ITEM[a[5]] ? { it: a[5], n: a[6] | 0 } : null }); });
  }
  if (Array.isArray(d.fl)) { const a = d.fl, o = ST.fly && ST.fly.id === a[0] ? ST.fly : {}; ST.fly = Object.assign(o, { id: a[0], x0: +a[1], z0: +a[2], x1: +a[3], z1: +a[4], T: Math.max(.2, +a[5]), t: Math.max(o.t || 0, +a[6]), by: String(a[7] || '') }); } else ST.fly = null;
  if (Array.isArray(d.tb)) ST.tb = d.tb.slice(0, 6).filter(a => ITEM[a[1]]).map(a => ({ id: a[0], it: a[1], to: a[2] ? 1 : 0, t: +a[3] }));
  ST.xl = Array.isArray(d.xl) && DESKS[d.xl[0] | 0] ? { i: d.xl[0] | 0, t: +d.xl[1] } : null;
  if (Array.isArray(d.b)) Object.assign(ST.boss, { tx: +d.b[0], tz: +d.b[1], f: +d.b[2], at: String(d.b[3] || '') });
}
function pushState() { if (SIMSIDE) A.send('st', snap()); }
function emit(e) { if (SIMSIDE) A.send('ev', e); else onEvent(e); }
function req(k, d) { const o = Object.assign({ k }, d || {}); if (AUTH()) onReq(o, { id: NET.id, name: myName() }); else A.send('rq', o); }
A.onNet('st', (d, from) => { if (!SIMSIDE && !AUTH() && from.id === -1 && d) applySnap(d); });
A.onNet('ev', (d, from) => { if (!SIMSIDE && !AUTH() && from.id === -1 && d) onEvent(d); });
A.onNet('rq', (d, from) => { if (SIMSIDE && d) onReq(d, from); });

/* ---------- Логіка раунду (сервер світу або сам гравець) ---------- */
function crew() {
  return SIMSIDE ? simPlayers().filter(p => !p.dead && inOffice(p.x, p.z)).map(p => ({ name: p.name, x: p.x, z: p.z }))
    : (running && !pl.dead && inOffice(pl.x, pl.z) ? [{ name: 'me', x: pl.x, z: pl.z }] : []);
}
function posOf(k) { const p = crew().find(c => c.name === k); return p || { x: START.p.x, z: START.p.z }; }
function toFloor(it, n, x, z) {
  if (!ITEM[it] || n <= 0) return;
  const p = freeSpot(x, z);
  const same = it === 'sheets' && ST.floor.find(f => f.it === 'sheets' && dist2(f.x, f.z, p.x, p.z) < .8);
  if (same) same.n += n; else ST.floor.push({ id: ++AU.fid, it, n, x: r2(p.x), z: r2(p.z) });
}
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function spawnZombie(life, at) {
  const free = ZWP.filter(p => dist2(p.x, p.z, START.p.x, START.p.z) > 6 && !ST.zom.some(z => dist2(z.x, z.z, p.x, p.z) < 1.5));
  const p = at || pick(free.length ? free : ZWP);
  ST.zom.push({ id: ++AU.zid, x: p.x, z: p.z, f: 0, stun: 0, cd: 2, wp: Math.floor(Math.random() * ZWP.length), carry: null, life: life || 0 });
}
/* голоси за поверх: хто стоїть на панелі ліфта (або натиснув F) — той голос і тримається до старту */
function countVotes() {
  const c = crew(), cnt = [0, 0, 0];
  for (const k in AU.votes) if (!SIMSIDE || c.some(p => p.name === k)) cnt[AU.votes[k]]++;
  ST.vo = cnt; ST.nx = pickVar();
}
function pickVar() {
  const cnt = ST.vo, best = Math.max(...cnt);
  if (best > 0) { const tied = [0, 1, 2].filter(i => cnt[i] === best); return tied.includes(ST.vi) ? ST.vi : tied[0]; }
  return AU.won ? (ST.vi + 1) % LAY.length : ST.vi;      // ніхто не голосував: після перемоги ліфт везе вище, інакше — той самий поверх
}
function switchVar(v) {
  ST.vi = v; useVar(v);
  Object.assign(ST, { zom: [], floor: [], held: {}, fly: null, tb: [], xl: null });
  Object.assign(ST.boss, { x: BPATH[0].x, z: BPATH[0].z, i: 0, dir: 1, wait: 8, at: 'desk' });
  emit({ k: 'go', v });
}
function onReq(d, from) {
  const k = keyOf(from), who = SIMSIDE ? escapeHTML(k) : 'Ти', h = heldOf(k);
  if (d.k === 'start') { if (!ST.on) startRound(from); return; }
  if (d.k === 'vote') { const v = d.v | 0; if (!ST.on && v >= 0 && v < LAY.length && AU.votes[k] !== v) { AU.votes[k] = v; countVotes(); emit({ k: 'voted', who: k, v }); pushState(); } return; }
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
    ST.rhp = 100; setHeld(k, 'report', 1, h.cup); advance(k); pushState();
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
    else if (w === 'power' && !ST.pw) { ST.pw = 1; ok = 1; } else if (w === 'rain' && ST.rain) { ST.rain = 0; ok = 1; } else if (w === 'excel' && ST.xl) { ST.xl = null; ok = 1; }
    if (ok) { ST.fixes++; emit({ k: 'fixed', w, who: k }); pushState(); }
  }
  else if (d.k === 'shoo') {
    const z = ST.zom.find(q => q.id === d.id); if (!z || z.stun > 0 || (z.carry && z.carry.it === 'report')) return;   // звіт жує — тут лише вантуз
    z.stun = 6; z.cd = 3; ST.fixes++;
    if (z.carry) { toFloor(z.carry.it, z.carry.n, z.x, z.z); z.carry = null; }
    emit({ k: 'shoo', id: z.id, x: r2(z.x), z: r2(z.z), who: k }); pushState();
  }
  else if (d.k === 'plunge') {
    // 🪠 вантуз влучив: зомбі присмоктало, він сідає й випльовує звіт / папери
    const z = ST.zom.find(q => q.id === d.id), p = posOf(k); if (!z || dist2(p.x, p.z, z.x, z.z) > 13) return;
    const had = z.carry ? z.carry.it : '';
    if (z.carry) { toFloor(z.carry.it, z.carry.n, z.x + Math.sin(z.f || 0) * .8, z.z + Math.cos(z.f || 0) * .8); z.carry = null; }
    z.stun = had ? 5 : 3.5; z.cd = 3; ST.fixes++;
    emit({ k: 'plunge', id: z.id, x0: r2(p.x), z0: r2(p.z), x: r2(z.x), z: r2(z.z), who: k, sp: had }); pushState();
  }
  else if (d.k === 'throw') {
    // 📘 «гаряча картопля»: звіт летить дугою над перегородками туди, куди цілився
    if (h.it !== 'report' || ST.fly) return;
    const p = posOf(k), tx = +d.x || p.x, tz = +d.z || p.z, dd = Math.min(14, dist2(p.x, p.z, tx, tz)), a = Math.atan2(tx - p.x, tz - p.z);
    const x1 = clamp(p.x + Math.sin(a) * dd, OX - HX + .8, OX + HX - .8), z1 = clamp(p.z + Math.cos(a) * dd, OZ - HZ + .8, OZ + HZ - .8);
    ST.fly = { id: ++AU.fid, x0: p.x, z0: p.z, x1, z1, x: p.x, z: p.z, y: 1.2, t: 0, T: clamp(dd / 9, .45, 1.5), by: k, to: String(d.to || '') };
    setHeld(k, '', 0, h.cup); emit({ k: 'throw', who: k }); pushState();
  }
  else if (d.k === 'tube') {
    // 📮 пневмопошта: папери летять трубою в іншу кімнату (зомбі не перехоплять)
    const i = d.i ? 1 : 0, T = TUBE[i], p = posOf(k); if (!h.it || dist2(p.x, p.z, T.p.x, T.p.z) > 2.5 || ST.tb.length >= 4) return;
    ST.tb.push({ id: ++AU.fid, it: h.it, n: h.n, to: 1 - i, t: TUBE_T }); setHeld(k, '', 0, h.cup); emit({ k: 'tube', who: k, i, it: ST.tb[ST.tb.length - 1].it }); pushState();
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
  countVotes(); const v = ST.nx; if (v !== ST.vi || L !== LAY[v]) switchVar(v);
  const lv = SIMSIDE ? AU.wins : (A.data().wins | 0);
  const need = Math.min(5, 3 + lv), subs = shuffle(SUBS.slice()).slice(0, lv >= 3 ? 4 : 3);
  const desks = shuffle(DESKS.map(d => d.i)).slice(0, need);
  Object.assign(ST, { on: true, t: 0, lv, steps: ['data', 'print', ...subs, 'send'], si: 0, need, fed: 0, desk: DESKS.map(d => desks.includes(d.i) ? 1 : 0), held: {}, floor: [], zom: [],
    coffee: 0, jam: 0, pw: 1, heat: 0, cm: 1, rain: 0, fixes: 0, rhp: 100, fly: null, tb: [], xl: null, pf: 1, rid: ST.rid + 1, vo: [0, 0, 0] });
  Object.assign(ST.boss, { x: BPATH[0].x, z: BPATH[0].z, i: 0, dir: 1, wait: 8, at: 'desk' });
  for (let i = 0; i < Math.min(5, 2 + lv); i++) spawnZombie();
  Object.assign(AU, { chaosT: rand(22, 30), jammed: 0, boomed: 0, pwT: 0, rainT: 0, dropT: 0, idle: 0, away: {}, votes: {}, won: 0 });
  emit({ k: 'msg', big: 1, txt: `⏰ 17:55 · ${L.n}! Квартальний звіт — до 18:00!${from && from.name && SIMSIDE ? ' ' + escapeHTML(from.name) + ' б’є на сполох.' : ''}` });
  pushState();
}
function endRound(win, why, by) {
  if (!ST.on) return;
  ST.on = false;
  const res = { k: 'end', win: win ? 1 : 0, left: r2(Math.max(0, ST.dur - ST.t)), fx: ST.fixes, done: ST.si, tot: ST.steps.length, why: why || '', by: by || '', pf: win && ST.pf ? 1 : 0, v: ST.vi };
  if (win && SIMSIDE) AU.wins++;
  AU.won = win ? 1 : 0;
  for (const z of ST.zom) z.carry = null;
  Object.assign(ST, { held: {}, floor: [], jam: 0, pw: 1, heat: 0, cm: 1, rain: 0, fly: null, tb: [], xl: null, rhp: 100 });
  ST.zom.splice(2); countVotes();
  emit(res); pushState();
}
function chaos(w) {
  if (w === 'jam') { if (ST.jam) return; ST.jam = 1; }
  else if (w === 'boom') { if (!ST.cm) return; ST.cm = 0; }
  else if (w === 'power') { if (!ST.pw) return; ST.pw = 0; AU.pwT = 15; }
  else if (w === 'heat') { if (ST.heat) return; ST.heat = 1; }
  else if (w === 'rain') { if (ST.rain) return; ST.rain = 1; AU.rainT = 14; AU.dropT = 1.5; }
  else if (w === 'meeting') { for (let i = 0; i < 3; i++) spawnZombie(35); }
  else if (w === 'excel') { if (ST.xl || !DESKS.length) return; ST.xl = { i: pick(DESKS).i, t: 25 }; }
  else return;
  emit({ k: 'chaos', w, i: ST.xl ? ST.xl.i : -1 });
}
/* начальник ходить між своїм столом і місцем наради; якщо хтось поруч — зупиняється поговорити */
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
function farWp(x, z) { let far = 0, fd = 0; ZWP.forEach((q, i) => { const d = dist2(q.x, q.z, x, z); if (d > fd) { fd = d; far = i; } }); return far; }
function updZombies(dt, c) {
  for (let i = ST.zom.length - 1; i >= 0; i--) {
    const z = ST.zom[i];
    if (z.life > 0 && (z.life -= dt) <= 0) { if (z.carry) toFloor(z.carry.it, z.carry.n, z.x, z.z); ST.zom.splice(i, 1); continue; }
    if (z.stun > 0) { z.stun -= dt; continue; }
    z.cd -= dt;
    const chew = z.carry && z.carry.it === 'report';
    if (chew && ST.on) {
      // жує звіт: цілість падає; на нулі звіт з'їдено — передруковуй (печатки й підписи теж наново)
      ST.rhp -= CHEW * dt; ST.pf = 0;
      if (ST.rhp <= 0) { z.carry = null; ST.rhp = 100; const pi = ST.steps.indexOf('print'); if (pi >= 0 && ST.si > pi) ST.si = pi; emit({ k: 'eaten', id: z.id, x: r2(z.x), z: r2(z.z) }); pushState(); continue; }
    }
    let tg = null, spd = 1.1;
    if (ST.on && !z.carry && ST.t > GRACE) {   // перші секунди зомбі ще досиджують нараду
      let bd = 1e9;
      for (const p of c) { const h = heldOf(p.name), paper = !!h.it, d = dist2(p.x, p.z, z.x, z.z); if (d < (paper ? 6.5 : 3) && d < bd) { bd = d; tg = p; spd = paper ? (h.it === 'report' ? 1.9 : 1.8) : 1.3; } }
      // звіт, що лежить на підлозі чи летить низько, — теж здобич
      const fr = ST.floor.find(f => f.it === 'report' && dist2(f.x, f.z, z.x, z.z) < 5);
      if (fr && !tg) { tg = fr; spd = 1.6; }
      if (fr && dist2(fr.x, fr.z, z.x, z.z) < .8) { ST.floor.splice(ST.floor.indexOf(fr), 1); z.carry = { it: 'report', n: 1 }; z.wp = farWp(z.x, z.z); emit({ k: 'grab', id: z.id, x: r2(z.x), z: r2(z.z) }); pushState(); continue; }
    }
    if (z.carry) spd = chew ? .75 : 1.9;
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
  if (h.it) { z.carry = { it: h.it, n: h.n }; stolen = h.it; z.wp = farWp(p.x, p.z); if (h.it === 'report') ST.pf = 0; }
  const spilled = h.cup ? 1 : 0;
  setHeld(p.name, '', 0, 0);
  emit({ k: 'bump', to: p.name, a: r2(a), st: stolen, sp: spilled, id: z.id }); pushState();
}
/* політ звіту: дуга над перегородками; низько над підлогою його ловить напарник або перехоплює зомбі */
const flyY = F => { const s = clamp(F.t / F.T, 0, 1), dd = dist2(F.x0, F.z0, F.x1, F.z1); return 1.2 + (1.6 + dd * .14) * 4 * s * (1 - s) - .9 * s; };
function updFly(dt, c) {
  const F = ST.fly; if (!F) return;
  F.t += dt; const s = clamp(F.t / F.T, 0, 1); F.x = lerp(F.x0, F.x1, s); F.z = lerp(F.z0, F.z1, s); F.y = flyY(F);
  if (F.y < 2.3 && s > .15) {
    const z = ST.zom.find(q => q.stun <= 0 && !q.carry && dist2(q.x, q.z, F.x, F.z) < 1.1);
    if (z) { z.carry = { it: 'report', n: 1 }; z.wp = farWp(z.x, z.z); ST.fly = null; ST.pf = 0; emit({ k: 'intercept', id: z.id, x: r2(z.x), z: r2(z.z), by: F.by }); pushState(); return; }
    const p = c.find(q => q.name !== F.by && !heldOf(q.name).it && dist2(q.x, q.z, F.x, F.z) < 1.2);
    if (p) { ST.fly = null; setHeld(p.name, 'report', 1, heldOf(p.name).cup); emit({ k: 'catch', who: p.name, by: F.by }); pushState(); return; }
  }
  if (s >= 1) {
    const p = c.filter(q => !heldOf(q.name).it && dist2(q.x, q.z, F.x1, F.z1) < 2.2).sort((a, b) => (b.name === F.to) - (a.name === F.to) || dist2(a.x, a.z, F.x1, F.z1) - dist2(b.x, b.z, F.x1, F.z1))[0];
    ST.fly = null;
    if (p) { setHeld(p.name, 'report', 1, heldOf(p.name).cup); emit({ k: 'catch', who: p.name, by: F.by }); }
    else { toFloor('report', 1, F.x1, F.z1); emit({ k: 'land', x: r2(F.x1), z: r2(F.z1) }); }
    pushState();
  }
}
function authTick(dt) {
  const c = crew();
  if (!ST.on && !ST.zom.length) { spawnZombie(); spawnZombie(); }
  if (c.length || ST.on) { updBoss(dt, c); updZombies(dt, c); }
  if (!ST.on) {
    // голосування на панелях ліфтів
    for (const p of c) PADS.forEach((q, i) => { if (dist2(p.x, p.z, q.x, q.z) < .9 && AU.votes[p.name] !== i) { AU.votes[p.name] = i; emit({ k: 'voted', who: p.name, v: i }); } });
    countVotes(); const sig = ST.vo.join() + ST.nx; if (sig !== AU.vsig) { AU.vsig = sig; pushState(); }
    if (SIMSIDE && c.length && (AU.stT -= dt) <= 0) { AU.stT = .3; pushState(); } return;
  }
  ST.t += dt;
  if (!c.length) { AU.idle += dt; if (AU.idle > (SIMSIDE ? 10 : 3)) endRound(false, 'На поверсі нікого не лишилось.'); return; }
  AU.idle = 0;
  updFly(dt, c);
  for (let i = ST.tb.length - 1; i >= 0; i--) { const q = ST.tb[i]; if ((q.t -= dt) > 0) continue; ST.tb.splice(i, 1); const T = TUBE[q.to]; toFloor(q.it, q.n, T.p.x, T.p.z); emit({ k: 'tubeout', to: q.to, it: q.it }); pushState(); }
  if (ST.xl && (ST.xl.t -= dt) <= 0) { const d = DESKS[ST.xl.i]; ST.xl = null; spawnZombie(45, freeSpot(d.p.x, d.p.z)); emit({ k: 'msg', txt: `🧟 ${NAMES[d.i]} так і не зробив ВПР — і став зомбі-офісником!` }); pushState(); }
  // хто вийшов з поверху — його папери лишаються на підлозі біля «Відправки»
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
    if (AU.excel && !ST.xl) pool.push('excel', 'excel');
    chaos(pick(pool));
  }
  if (ST.t >= ST.dur) { endRound(false, 'Годинник пробив 18:00 — звіт не здано.'); return; }
  AU.stT -= dt; if (AU.stT <= 0) { AU.stT = ST.fly ? .1 : .2; pushState(); }
}
A.on('tick', dt => {
  if (AUTH()) authTick(dt);
  else {
    if (ST.on) ST.t += dt;
    if (ST.fly) ST.fly.t += dt;
    const k = Math.min(1, dt * 8);
    for (const z of ST.zom) if (z.tx != null) { z.x = lerp(z.x, z.tx, k); z.z = lerp(z.z, z.tz, k); }
    if (ST.boss.tx != null) { ST.boss.x = lerp(ST.boss.x, ST.boss.tx, k); ST.boss.z = lerp(ST.boss.z, ST.boss.tz, k); }
  }
  if (!SIMSIDE) clientTick(dt);
});

/* ---------- Фізичний світ (і на сервері, і в гравців, у тому самому порядку): стіни, меблі, крісла всіх трьох поверхів ---------- */
A.on('world', () => {
  for (const Lx of LAY) {
    for (const s of Lx.walls) {
      const len = Math.hypot(s[2] - s[0], s[3] - s[1]), n = Math.max(1, Math.round(len / .6));
      for (let k = 0; k <= n; k++) addStatic(Lx.x + lerp(s[0], s[2], k / n), Lx.z + lerp(s[1], s[3], k / n), .32, 2.5);
    }
    for (const o of Lx.obs) addStatic(o.x, o.z, o.r, 1.3);
    for (const [x, z] of Lx.chairs) addBody('chair', Lx.x + x, Lx.z + z);
  }
});

/* ======================= ДАЛІ — ЛИШЕ В ГРАВЦЯ ======================= */
/* ---------- Поверх 42: модель офісу з першої версії (тепер — у хмарочосі) ---------- */
function buildV1(g, K) {
  const B = (x, y, z, w, h, d, c) => K.box(x, y, z, w, h, d, c), C = (x, y, z, rt, rb, h, c, seg) => K.cyl(x, y, z, rt, rb, h, c, seg), grp = K.grp, GB = K.GB;
  const plant = (x, z, s) => K.plant(x, z, s, false), chair = K.chair, monitor = K.monitor, keyboard = K.keyboard, rug = K.rug;
  const table = (x, z, w, d, top, leg, h) => K.table(x, z, w, d, top, leg, h, false), sofa = (x, z, w, ry, col) => K.sofa(x, z, w, ry, col, false), shelf = (x, z, w, d, h, ry, b) => K.shelf(x, z, w, d, h, ry, b, false);
  const ALLDESK = L.alldesk, sign = (txt, col, x, z, w) => K.sign(txt, col, x, z, w), floorTxt = K.floorTxt;
  B(0, .045, 0, 2 * HX - 1.5, .012, 1.4, '#9F98C8', false, true);              // килимова доріжка коридором
  for (let i = 0; i < 7; i++) for (let j = 0; j < 6; j++) if ((i + j) % 2) B(5.5 + i, .058, 2.5 + j, 1, .012, 1, '#D8CFC0');    // кухня: шахова плитка
  for (let x = 13; x < HX; x += .8) B(x, .058, 5, .02, .012, 5.9, '#B4CFDC'); for (let z = 2.4; z < 8; z += .8) B(16.25, .058, z, 7.4, .012, .02, '#B4CFDC'); // WC: плитка
  for (let x = -2.4; x < 3; x += .6) B(x, .058, -8, .02, .012, 11.8, '#363B4E'); for (let z = -13.4; z < -2; z += .6) B(0, .058, z, 5.8, .012, .02, '#363B4E'); // серверна: фальшпідлога
  // таблички над дверима
  for (const r of ROOMS) if (r.dx != null) sign(r.n, r.c, r.dx, r.dz + .15, r.w);
  sign('ОПЕНСПЕЙС', '#5CC8FF', -9.25, CZ + .15); sign('ЗОНА ВІДПОЧИНКУ', '#FF8A7A', 5, 11); sign('СКЛАД', '#B8B2C8', 12.5, 11); 
  // назви кімнат, намальовані на підлозі біля входу (видно згори)
  for (const r of ROOMS) if (r.dx != null) floorTxt(r.n, r.c, r.dx, r.dz < 0 ? r.dz - 1.05 : r.dz + .95, Math.min(3.6, r.x1 - r.x0 - .6));
  floorTxt('РЕСЕПШН', '#FFD27A', 0, 4.2, 3.4); floorTxt('ЗОНА ВІДПОЧИНКУ', '#FF8A7A', 9.4, 9.3, 3.6); floorTxt('СКЛАД', '#B8B2C8', 16.8, 8.9, 2.4);
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
    const icon = sprite('📄', .8); icon.position.set(d.x, 2.25, d.z + .72); icon.visible = false; scene.add(A.dynamic(icon));
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
  const ss = neonSign('▶ СТАРТ', '#7FE08A', 1.5, .4); ss.position.set(START.o.x, 1.55, START.o.z + .45); scene.add(A.dynamic(ss));
  B(SEND.l.x, .5, SEND.l.z, 1.2, 1, .7, '#5B3E9A', true, true);
  for (let k = 0; k < 3; k++) { B(SEND.l.x, 1.06 + k * .16, SEND.l.z, .7, .03, .5, '#FFD27A'); for (const sx of [-.33, .33]) B(SEND.l.x + sx, 1.1 + k * .16, SEND.l.z, .03, .1, .5, '#FFD27A'); }
  const out = neonSign('📤 ВІДПРАВКА', '#FFD27A', 1.8, .4); out.position.set(SEND.o.x, 1.75, SEND.o.z + .4); scene.add(A.dynamic(out));
  sofa(-4.4, 11.5, 2.4, Math.PI / 2, '#B07CF0'); table(-3.3, 11.5, .7, 1.2, '#FFFFFF', '#9F98B8', .4);
  plant(-4.3, 13.3); plant(4.3, 2.7, .9);
  C(4.3, .5, 5.6, .22, .22, 1, '#E8E3F0'); C(4.3, 1.2, 5.6, .18, .2, .45, '#8FD9FF');                       // кулер
  /* --- КОРИДОР: годинник, щиток, вогнегасник --- */
  B(PANEL.l.x, .9, PANEL.l.z, .25, 1, .8, '#8E86B0'); put(g, mesh(new THREE.BoxGeometry(.05, .3, .3), bulb('#FFE066'), false), PANEL.o.x - .14, 1, PANEL.o.z);
  C(-19.6, .35, 1.4, .12, .12, .7, '#E8505B'); plant(-19.3, -1.3, .8); plant(11, 1.3, .8);
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
}

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
function sprite(txt, s) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: iconTex(txt), transparent: true, depthWrite: false })); sp.scale.set(s, s, 1); sp.renderOrder = 4; return sp; }

/* ---------- Модель поверху: хмарочос із містом навколо, підлоги, стіни, меблі ---------- */
function buildVariant(i) {
  const prev = ST.vi; useVar(i); const Lx = L;
  for (const k of VKEYS) V[k] = k === 'cols' ? [] : k === 'clockK' ? 1 : null;
  const g = new THREE.Group(); scene.add(g);
  buildTowerFloor(g, OX, OZ, 2 * HX, 2 * HZ, { night: Lx.night, seed: 4200 + i * 131 });
  drawShell(g, Lx);
  const K = makeKit(g);
  if (Lx.deco) { Lx.deco(K, Lx); for (const r of Lx.rooms) { if (r.sg) K.sign(r.n, r.c, r.sg[0], r.sg[1]); if (r.ft) K.floorTxt(r.n, r.c, r.ft[0], r.ft[1], r.ft[2]); } }
  else buildV1(g, K);
  decoCommon(K, Lx);
  makeClock(K);
  V.boss = buildManager(); V.boss.ent = { x: BPATH[0].x, z: BPATH[0].z, y: 0, bh: 2.6 }; V.boss.root.position.set(BPATH[0].x, 0, BPATH[0].z); scene.add(A.dynamic(V.boss.root));
  for (const k of VKEYS) Lx.v[k] = V[k];
  useVar(prev);
  return g;
}
function drawShell(g, Lx) {
  const P = Lx.pal, B = (x, y, z, w, h, d, c, cast, recv) => put(g, mesh(new THREE.BoxGeometry(w, h, d), c, !!cast, !!recv), Lx.x + x, y, Lx.z + z);
  B(0, .02, 0, 2 * Lx.hx, .04, 2 * Lx.hz, P.base, false, true);
  for (const r of Lx.rooms) B((r.x0 + r.x1) / 2, .035, (r.z0 + r.z1) / 2, r.x1 - r.x0 - .1, .04, r.z1 - r.z0 - .1, r.fl, false, true);
  // стіни-розрізи (низькі, щоб камера бачила кімнати); скло, сталь сховища, поручні атріуму; зовні — підвіконня біля скляного фасаду
  const GLASS = new THREE.MeshStandardMaterial({ color: '#BFE8FF', transparent: true, opacity: .3, roughness: .1, metalness: .2, depthWrite: false });
  for (const [x0, z0, x1, z1, k] of Lx.walls) {
    const len = Math.hypot(x1 - x0, z1 - z0), hor = z0 === z1, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, L2 = len + .2, W2 = (t, l) => [hor ? l : t, hor ? t : l];
    if (k === 'g' || k === 'r') {
      const gh = k === 'g' ? 1 : .8, gy = k === 'g' ? .9 : .5;
      { const [w, d] = W2(.2, L2); B(cx, k === 'g' ? .2 : .05, cz, w, k === 'g' ? .4 : .1, d, k === 'g' ? P.top : '#8E86B0'); }
      { const [w, d] = W2(.06, L2); put(g, new THREE.Mesh(new THREE.BoxGeometry(w, gh, d), GLASS), Lx.x + cx, gy, Lx.z + cz); }
      { const [w, d] = W2(.12, L2); B(cx, gy + gh / 2 + .02, cz, w, .06, d, '#4E4A6E'); }
      for (let t = 0; t <= len; t += 2) B(hor ? x0 + t : cx, gy, hor ? cz : z0 + t, .07, gh + .05, .07, '#4E4A6E');
    } else if (k === 'o') {
      const [w, d] = W2(.3, L2); B(cx, .3, cz, w, .6, d, P.o, false, true);
      const [w2, d2] = W2(.36, L2 + .04); B(cx, .63, cz, w2, .06, d2, P.otop);
    } else if (k === 'v') {
      const [w, d] = W2(.5, L2); B(cx, .7, cz, w, 1.4, d, '#8E8A9A', true, true);
      const [w2, d2] = W2(.56, L2 + .04); B(cx, 1.43, cz, w2, .08, d2, '#5E6478');
      for (let t = .3; t < len; t += .6) B(hor ? x0 + t : cx, 1.1, hor ? cz : z0 + t, hor ? .06 : .52, .06, hor ? .52 : .06, '#C9CDD9');
    } else {
      const H = 1.1, [w, d] = W2(.2, L2); B(cx, H / 2, cz, w, H, d, P.i, true, true);
      const [w2, d2] = W2(.26, L2 + .04); B(cx, H + .04, cz, w2, .08, d2, P.top);
      const [w3, d3] = W2(.24, L2); B(cx, .06, cz, w3, .12, d3, shade(P.i, -.3));
    }
  }
}
/* великий настінний годинник, що цокає до 18:00 */
function makeClock(K) {
  const c = new THREE.Group(); c.position.set(CLOCK.x, 2.2, CLOCK.z + .14); c.scale.setScalar(.72); V.clockK = .72; scene.add(A.dynamic(c));
  put(c, mesh(flat(new THREE.CylinderGeometry(1.15, 1.15, .14, 28)), '#FFFFFF', false), 0, 0, 0).rotation.x = Math.PI / 2;
  put(c, mesh(new THREE.TorusGeometry(1.15, .09, 6, 28), '#2E2346', false), 0, 0, .02);
  for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; put(c, mesh(new THREE.BoxGeometry(k % 3 ? .05 : .1, k % 3 ? .14 : .24, .03), '#2E2346', false), Math.sin(a) * .95, Math.cos(a) * .95, .08).rotation.z = -a; }
  const hand = (len, w, col, z) => { const p = new THREE.Group(); p.position.z = z; c.add(p); put(p, mesh(new THREE.BoxGeometry(w, len, .03), col, false), 0, len / 2 - .08, 0); return p; };
  V.clock = { g: c, h: hand(.55, .09, '#2E2346', .1), m: hand(.85, .06, '#2E2346', .12), s: hand(.9, .025, '#E8505B', .14) };
  put(c, mesh(flat(new THREE.CylinderGeometry(.07, .07, .05, 10)), '#E8505B', false), 0, 0, .16).rotation.x = Math.PI / 2;
  K.box(CLOCK.x - OX, 1.25, CLOCK.z - OZ, .12, .5, .12, '#4E4A6E');
}

/* ---------- Хмарочос у центрі міста (меші з текстурою — через A.dynamic, бо оптимізатор зливає їх в одноколірні): наш поверх високо над вулицями, навколо — інші вежі ----------
   buildTowerFloor(g, cx, cz, w, d, opt) — плита поверху, скляний фасад з імпостами, вежа вниз до вулиць,
   сусідні хмарочоси з вікнами, дахи з кондиціонерами й гелімайданчиками, вулиці далеко внизу.
   opt: { night: bool — вікна світяться сильніше; seed: число; front: висота скла з боку камери (+z), за замовч. 1.1 } */
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
function buildTowerFloor(g, cx, cz, w, d, opt = {}) {
  const rnd = cityRng(opt.seed || Math.round(cx * 7 + cz * 13)), night = !!opt.night, front = opt.front == null ? 1.1 : opt.front;
  // плита перекриття й вежа під нами (скло з поясами поверхів)
  put(g, mesh(new THREE.BoxGeometry(w + 1.2, .5, d + 1.2), '#8E86B0', false, true), cx, -.26, cz);
  const tw = new THREE.MeshBasicMaterial({ map: windowTex(night, 1).clone() }); tw.map.needsUpdate = true; tw.map.repeat.set(w / 16, 88 / 3.6 / 16);
  const body = new THREE.Mesh(new THREE.BoxGeometry(w + .8, 88, d + .8), tw); body.position.set(cx, -44.5, cz); scene.add(A.dynamic(body));   // з текстурою — не зливати з рештою
  for (let y = -3.6; y > -88; y -= 3.6) put(g, mesh(new THREE.BoxGeometry(w + 1, .25, d + 1), '#6E668E', false), cx, y, cz);
  // скляний фасад нашого поверху: від підлоги майже до стелі, з боку камери — низький, щоб було видно всередину
  const glass = mat('#BFE6FF', { transparent: true, opacity: .22, depthWrite: false });
  const side = (x0, z0, x1, z1, h) => {
    const horiz = z0 === z1, len = horiz ? Math.abs(x1 - x0) : Math.abs(z1 - z0);
    const m = new THREE.Mesh(new THREE.BoxGeometry(horiz ? len : .08, h, horiz ? .08 : len), glass); m.position.set((x0 + x1) / 2, h / 2, (z0 + z1) / 2); g.add(m);
    for (let t = 0; t <= len + .01; t += 2) put(g, mesh(new THREE.BoxGeometry(.12, h, .12), '#4E4A6E', false), horiz ? Math.min(x0, x1) + t : x0, h / 2, horiz ? z0 : Math.min(z0, z1) + t);
    put(g, mesh(new THREE.BoxGeometry(horiz ? len : .2, .12, horiz ? .2 : len), '#4E4A6E', false), (x0 + x1) / 2, h, (z0 + z1) / 2);
  };
  const X0 = cx - w / 2 - .5, X1 = cx + w / 2 + .5, Z0 = cz - d / 2 - .5, Z1 = cz + d / 2 + .5;
  side(X0, Z0, X1, Z0, 2.8); side(X0, Z0, X0, Z1, 2.8); side(X1, Z0, X1, Z1, 2.8); side(X0, Z1, X1, Z1, front);
  // сусідні хмарочоси (дахи нижче й вище за нас), не ближче ніж 10 м від нашого фасаду
  const towers = [];
  for (let k = 0; k < 26; k++) {
    const a = rnd() * 6.283, r = Math.max(w, d) / 2 + 14 + rnd() * 48, tx = cx + Math.cos(a) * r, tz = cz + Math.sin(a) * r * .8;
    const bw = 8 + rnd() * 10, bd = 8 + rnd() * 10;
    if (Math.abs(tx - cx) < w / 2 + bw / 2 + 9 && Math.abs(tz - cz) < d / 2 + bd / 2 + 9) continue;
    if (towers.some(o => Math.abs(o.x - tx) < (o.w + bw) / 2 + 2 && Math.abs(o.z - tz) < (o.d + bd) / 2 + 2)) continue;
    const top = -34 + rnd() * (tz > cz + d / 2 ? 28 : 62);   // ті, що між нами й камерою, — нижчі
    towers.push({ x: tx, z: tz, w: bw, d: bd });
    const far = clamp((Math.hypot(tx - cx, tz - cz) - 25) / 70, 0, .75);   // далекі вежі тонуть у серпанку (туман гри для них надто густий)
    const m = new THREE.MeshBasicMaterial({ map: windowTex(night, k).clone(), fog: false, color: new THREE.Color('#FFFFFF').lerp(new THREE.Color(night ? '#3A3060' : '#D9CCF2'), far) }); m.map.needsUpdate = true; m.map.repeat.set(bw / 16, (top + 92) / 3.6 / 16);
    const b = new THREE.Mesh(new THREE.BoxGeometry(bw, top + 92, bd), m); b.position.set(tx, (top - 92) / 2, tz); scene.add(A.dynamic(b));
    { const roof = new THREE.Mesh(new THREE.BoxGeometry(bw + .4, .5, bd + .4), new THREE.MeshBasicMaterial({ color: new THREE.Color('#6E668E').lerp(new THREE.Color(night ? '#3A3060' : '#D9CCF2'), far), fog: false })); roof.position.set(tx, top + .25, tz); scene.add(A.dynamic(roof)); }
    const kind = rnd();
    if (kind < .3) { put(g, mesh(new THREE.CylinderGeometry(bw * .3, bw * .3, .1, 20), '#3E3A5C', false), tx, top + .55, tz); put(g, mesh(new THREE.TorusGeometry(bw * .22, .12, 4, 20), bulb('#FFE066'), false), tx, top + .6, tz).rotation.x = Math.PI / 2; }   // гелімайданчик
    else if (kind < .7) for (let q = 0; q < 3; q++) put(g, mesh(new THREE.BoxGeometry(1.4, .9, 1.4), '#C9CDD9', false), tx + (rnd() - .5) * bw * .6, top + .95, tz + (rnd() - .5) * bd * .6);   // кондиціонери
    else { put(g, mesh(new THREE.CylinderGeometry(.12, .12, 7, 5), '#C9CDD9', false), tx, top + 4, tz); put(g, mesh(new THREE.SphereGeometry(.3, 8, 6), bulb('#FF5C7A'), false), tx, top + 7.6, tz); }   // антена
  }
  // вулиці далеко внизу
  put(g, mesh(new THREE.BoxGeometry(260, .5, 260), '#3E3A5C', false), cx, -92, cz);
  for (let k = -5; k <= 5; k++) { put(g, mesh(new THREE.BoxGeometry(260, .1, 3), '#2E2346', false), cx, -91.7, cz + k * 24); put(g, mesh(new THREE.BoxGeometry(3, .1, 260), '#2E2346', false), cx + k * 24, -91.7, cz); }
  return { x0: X0, x1: X1, z0: Z0, z1: Z1 };
}

/* ---------- Предмети в руках (видно й друзям) ---------- */
function itemMesh(it, n, cup, hp) {
  const g = new THREE.Group();
  if (it === 'sheets') for (let k = 0; k < Math.min(6, n); k++) { const p = put(g, mesh(new THREE.BoxGeometry(.42, .02, .3), '#FFFFFF', false), 0, k * .03, 0); p.rotation.y = (k % 2 ? .12 : -.1); }
  if (it === 'report') {
    // товста тека квартального звіту: важка, з кільцями й закладками; погризена — з «укусами»
    put(g, mesh(new THREE.BoxGeometry(.52, .2, .38), '#3E6BD8', false), 0, .06, 0); put(g, mesh(new THREE.BoxGeometry(.48, .16, .36), '#FFFFFF', false), .03, .06, 0);
    for (const z of [-.1, .1]) put(g, mesh(new THREE.TorusGeometry(.05, .015, 4, 8), '#C9CDD9', false), -.25, .12, z);
    for (let k = 0; k < 3; k++) put(g, mesh(new THREE.BoxGeometry(.05, .04, .06), ['#FFD27A', '#FF6BD6', '#7FE08A'][k], false), .27, .1, -.12 + k * .12);
    if (hp != null && hp < 75) put(g, mesh(new THREE.BoxGeometry(.16, .22, .14), '#2E2346', false), .22, .07, .14).rotation.y = .5;
    if (hp != null && hp < 40) put(g, mesh(new THREE.BoxGeometry(.14, .22, .16), '#2E2346', false), -.18, .07, -.14).rotation.y = -.4;
  }
  if (cup) { put(g, mesh(flat(new THREE.CylinderGeometry(.08, .06, .18, 10)), '#FFFFFF', false), .38, .05, -.05); put(g, mesh(flat(new THREE.CylinderGeometry(.07, .07, .02, 10)), '#8C5A3C', false), .38, .15, -.05); }
  g.position.set(0, 1.12, .48); return g;
}
function rootOf(k) {
  if (k === myKey()) return hero || null;
  for (const id in NET.players) { const r = NET.players[id]; if (r && r.name === k && r.h) return r.h; }
  return null;
}
const hpB = () => Math.ceil(ST.rhp / 25);
function syncHeld() {
  const seen = new Set();
  for (const [k, h] of Object.entries(ST.held)) {
    const hh = rootOf(k), root = hh && (hh.root || hh); if (!root) continue;
    seen.add(k);
    const sig = h.it + h.n + '|' + h.cup + (h.it === 'report' ? hpB() : ''), o = V.hm.get(k);
    if (!o || o.sig !== sig || o.root !== root) { if (o && o.g.parent) o.g.parent.remove(o.g); const g = itemMesh(h.it, h.n, h.cup, ST.rhp); root.add(g); V.hm.set(k, { g, sig, root }); }
    if (hh.aR) { hh.aR.rotation.x = -1.3; if (h.it) hh.aL.rotation.x = -1.3; }
  }
  for (const [k, o] of V.hm) if (!seen.has(k)) { if (o.g.parent) o.g.parent.remove(o.g); V.hm.delete(k); }
}

/* ---------- Події ---------- */
const isMe = k => k === myKey();
const nmOf = k => k && k !== 'me' && !isMe(k) ? escapeHTML(k) : 'Ти';
function onEvent(e) {
  if (SIMSIDE || !e) return;
  const here = running && inOffice(pl.x, pl.z), me = isMe(e.who) || isMe(e.to), nm = nmOf(e.who);
  if (e.k === 'msg') { if (here) { if (e.big) banner(e.txt); else toast(e.txt); } }
  else if (e.k === 'go') {
    // ліфт: раунд починається на іншому поверсі — переносимо туди всіх, хто був на будь-якому поверсі «Дедлайну»
    const was = running && (floorOf(pl.x, pl.z) >= 0 || V.joined);
    ST.vi = clamp(e.v | 0, 0, LAY.length - 1); useVar(ST.vi);
    if (was) { V.act = null; toLobby(`🛗 Ліфт везе на ${L.n}!`); }
  }
  else if (e.k === 'voted') { if (isMe(e.who)) { toast(`🗳️ Твій голос: <b>${LAY[e.v].n}</b>. Старт — ▶ СТАРТ (F).`); sfx('ui'); } else if (here) toast(`🗳️ ${nm} голосує за ${LAY[e.v].n}`); }
  else if (e.k === 'take') { const d = DESKS[e.i]; if (d && here) { ftext(d.x, 2.4, d.z, '📄 +1', 'gold'); if (V.cols[e.i]) bubble(V.cols[e.i].ent, pick(['Ось мої цифри!', 'Тримай, тільки не загуби', 'Я це вчора мав здати…', 'Удачі з принтером!']), false, 2); sfx('page', d.x, d.z); } }
  else if (e.k === 'pick') { if (me) sfx('pick'); }
  else if (e.k === 'brewed') { if (me) { ftext(pl.x, 2.5, pl.z, '☕ Кава для начальника!', 'gold'); sfx('pour'); } }
  else if (e.k === 'coffee') { if (here) { bubble(V.boss.ent, 'О, кава! Тепер можна й підписати.', false, 2.6); sfx('drink'); } }
  else if (e.k === 'step') {
    if (!here) return;
    const S = STEPS[e.done], N = STEPS[e.next];
    toast(`✅ ${S ? S.ic + ' ' + S.n : ''}${e.who && e.who !== 'me' && !isMe(e.who) ? ' — ' + escapeHTML(e.who) : ''}${N ? `<br>Далі: ${N.ic} <b>${N.n}</b>` : ''}`); sfx('ding');
    if (e.done === 'print') burst(PRINTER.o.x, 1.3, PRINTER.o.z, '#FFFFFF', 14, 2, .8, 2);
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
    if (e.w === 'excel' && V.cols[e.i]) bubble(V.cols[e.i].ent, pick(['Хто знає, як працює ВПР?!', 'Excel завис! Допоможіть!', 'Де тут зведена таблиця?!']), true, 3);
  }
  else if (e.k === 'fixed') {
    if (!here) return;
    toast(`🔧 ${{ jam: 'Папір із принтера витягли', cm: 'Кавоварку полагодили', heat: 'Сервер охолодили', power: 'Світло увімкнули', rain: 'Спринклери вимкнули', excel: 'ВПР запрацював — колега врятований' }[e.w] || 'Полагоджено'}${e.who && e.who !== 'me' && !isMe(e.who) ? ' — ' + nm : ''}!`); sfx('equip');
    if (e.w === 'excel' && isMe(e.who)) { V.cof++; ftext(pl.x, 2.6, pl.z, '+1 ☕ ривок — колега пригостив!', 'gold'); }
  }
  else if (e.k === 'bump') {
    if (isMe(e.to) && running && !pl.dead) {
      knockMe(+e.a || 0, 11, pick(['Ой! Нарада!', 'Штовхнули!', 'Обережно!']));
      shake = Math.max(shake, .35); sfx('hurt');
      if (e.st === 'report') banner('🧟 Зомбі вирвав звіт і ЖУЄ його! Лупи вантузом 🪠 (клавіша 1 або F поруч)!');
      else if (e.st) toast(`🧟 Зомбі-офісник поцупив у тебе ${ITEM[e.st] ? ITEM[e.st].ic + ' ' + ITEM[e.st].n : 'папери'}! Наздожени його й натисни <b>F</b>.`);
      if (e.sp) { ftext(pl.x, 2.6, pl.z, 'Кава розлилась! 💦', 'bad'); burst(pl.x, 1.2, pl.z, '#8C5A3C', 10, 3, .6, 2); }
    } else if (here && e.st) toast(`🧟 Зомбі вкрав ${ITEM[e.st].ic} у ${escapeHTML(e.to)}!`);
    const v = V.zm.get(e.id); if (v && here) bubble(v.ent, pick(['Це обговоримо на нараді!', 'Синергія!', 'Давайте синхронізуємось!', 'Мммозок… тобто KPI!']), true, 2);
  }
  else if (e.k === 'shoo') { if (here) { ftext(+e.x, 2.6, +e.z, 'Це можна було листом!', 'gold'); const v = V.zm.get(e.id); if (v) bubble(v.ent, 'Ой… піду на нараду…', false, 2); sfx('hit', +e.x, +e.z); } }
  else if (e.k === 'plunge') {
    if (!here) return;
    if (!isMe(e.who)) shootPlg(+e.x0, +e.z0, +e.x, +e.z, -1, false);
    ftext(+e.x, 2.7, +e.z, e.sp === 'report' ? 'Тьфу! Звіт виплюнуто! 🪠' : 'ЧВАК! 🪠', 'gold'); sfx('splash', +e.x, +e.z);
    const v = V.zm.get(e.id); if (v) bubble(v.ent, e.sp ? 'Тьху… несмачний квартал…' : 'Ой! Присмоктало!', false, 2);
    if (e.sp === 'report') toast(`🪠 ${nm} вантузом змусив зомбі виплюнути звіт! Підбери (F).`);
  }
  else if (e.k === 'throw') { if (here) { sfx('throw'); if (!isMe(e.who)) toast(`📘 ${nm} кидає звіт — лови!`); } }
  else if (e.k === 'catch') { if (here) { if (isMe(e.who)) { ftext(pl.x, 2.6, pl.z, 'Спіймав! 📘', 'gold'); sfx('catch'); } else toast(`📘 ${nm} ловить звіт!`); } }
  else if (e.k === 'land') { if (here) { toast('📘 Звіт упав на підлогу — швидше підбери, поки не з’їли!'); sfx('land', +e.x, +e.z); } }
  else if (e.k === 'intercept' || e.k === 'grab') { if (here) { banner('🧟 Зомбі схопив звіт і ЖУЄ його! Лупи вантузом 🪠!'); sfx('bite', +e.x, +e.z); const v = V.zm.get(e.id); if (v) bubble(v.ent, 'Ням! Квартальний!', true, 2); } }
  else if (e.k === 'eaten') { if (here) { banner('🍽️ Зомбі з’їв звіт! Друкуй заново 🖨️ (дані вже в принтері)'); burst(+e.x, 1.4, +e.z, '#FFFFFF', 20, 4, .9, 3); sfx('break', +e.x, +e.z); } }
  else if (e.k === 'tube') { if (here) { sfx('whoosh'); if (isMe(e.who)) toast(`📮 Відправлено пневмопоштою — заберіть біля іншої колби за ${TUBE_T} с.`); } }
  else if (e.k === 'tubeout') { if (here) { const T = TUBE[e.to]; burst(T.p.x, 1.4, T.p.z, '#FFB35C', 8, 2, .6, 2); sfx('pick', T.p.x, T.p.z); toast(`📮 Пневмопошта: ${ITEM[e.it] ? ITEM[e.it].ic + ' ' + ITEM[e.it].n : 'посилка'} прибули!`); } }
  else if (e.k === 'fly') { if (isMe(e.to)) { ftext(pl.x, 2.6, pl.z, 'Папірець полетів! 📄💨', 'bad'); burst(pl.x, 1.6, pl.z, '#FFFFFF', 8, 3, .8, 2); } }
  else if (e.k === 'end') finish(e);
}
function finish(e) {
  const was = V.joined || inOffice(pl.x, pl.z); V.joined = false; V.act = null;
  if (!was || !running) return;
  const win = !!e.win, left = Math.max(0, +e.left || 0), fx = Math.max(0, e.fx | 0), pf = win && e.pf;
  const stars = win ? (left >= 90 ? 3 : left >= 40 ? 2 : 1) : 0;
  const coins = win ? 50 + stars * 25 + Math.min(10, fx) * 5 + (pf ? 30 : 0) : 10 + (e.done | 0) * 3, xp = win ? 120 + stars * 20 : 30;
  P.coins += coins; addXP(xp);
  const d = A.data(); d.rounds = (d.rounds || 0) + 1; if (win) { d.wins = (d.wins || 0) + 1; d.best = Math.max(d.best || 0, Math.round(left)); } d.stars = Math.max(d.stars || 0, stars); d.fixes = (d.fixes || 0) + fx;
  if (pf) d.perfect = (d.perfect || 0) + 1;
  d.floors = d.floors || {}; if (win) d.floors[e.v | 0] = 1;
  const mm = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  banner(win ? `📤 Звіт здано о ${clockStr(ST.dur - left)}! ${'⭐'.repeat(stars)}${pf ? ' 💯' : ''} Запас: ${mm(left)}` : `🕕 ${e.why || '18:00 — дедлайн зірвано.'}`);
  toast(`${win ? '🎉 Квартальний звіт прийнято!' : '😩 Начальник незадоволений.'}${pf ? ' 💯 <b>Бездоганний звіт</b> — ні укусу, ні плями: +30 🪙!' : ''} Нагорода: <b>+${coins} 🪙</b> · +${xp} досвіду. Наступний поверх — голосуй на панелях 🛗 біля ліфтів, старт — <b>▶ СТАРТ</b> (F).`);
  sfx(win ? (pf ? 'perfect' : 'level') : 'hurt'); refreshHUD(); save();
}
const clockStr = t => { const s = 17 * 3600 + 55 * 60 + Math.floor(Math.max(0, t)); return `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };

/* ---------- 🪠 Вантуз: летить на мотузці до зомбі, присмоктується — той випльовує звіт ---------- */
function plgMesh() {
  const g = new THREE.Group();
  put(g, mesh(flat(new THREE.CylinderGeometry(.04, .04, .7, 6)), '#C4956A', false), 0, 0, -.35).rotation.x = Math.PI / 2;
  put(g, mesh(new THREE.SphereGeometry(.2, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), '#E8505B', false), 0, 0, .05).rotation.x = Math.PI / 2;
  return g;
}
function shootPlg(x0, z0, x1, z1, id, mine) {
  const m = plgMesh(); scene.add(m);
  const rope = new THREE.Mesh(new THREE.BoxGeometry(.03, .03, 1), mat('#FFE7A0')); scene.add(rope);
  V.plg.push({ m, rope, x0, z0, x1, z1, t: 0, T: clamp(dist2(x0, z0, x1, z1) / 16, .12, .6), id, mine, back: 0 });
}
function plgTarget() {
  let best = null, bs = 1e9;
  for (const z of ST.zom) {
    if (z.stun > 0) continue;
    const d = dist2(pl.x, pl.z, z.x, z.z); if (d > 10) continue;
    const da = Math.abs(((Math.atan2(z.x - pl.x, z.z - pl.z) - pl.face + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    const s = d + da * 6 - (z.carry ? 3 : 0); if ((da < .7 || d < 2.6) && s < bs) { bs = s; best = z; }
  }
  return best;
}
function firePlunger(tz) {
  if (!running || pl.dead || !inOffice(pl.x, pl.z) || V.plCd > 0) return;
  V.plCd = .8;
  const z = tz || plgTarget(), a = z ? Math.atan2(z.x - pl.x, z.z - pl.z) : pl.face; pl.face = a;
  const tx = z ? z.x : pl.x + Math.sin(a) * 8, tzz = z ? z.z : pl.z + Math.cos(a) * 8;
  shootPlg(pl.x, pl.z, tx, tzz, z ? z.id : -1, true); sfx('throw');
}
function updPlg(dt) {
  for (let i = V.plg.length - 1; i >= 0; i--) {
    const P_ = V.plg[i]; P_.t += dt;
    let s = clamp(P_.t / P_.T, 0, 1);
    if (P_.back) s = 1 - clamp((P_.t - P_.T - .25) / P_.T, 0, 1);
    const z = P_.id >= 0 && ST.zom.find(q => q.id === P_.id);
    if (z && !P_.back) { P_.x1 = z.x; P_.z1 = z.z; }   // самонаведення на ціль
    const x = lerp(P_.x0, P_.x1, s), zz = lerp(P_.z0, P_.z1, s), y = 1.1 + Math.sin(s * Math.PI) * .4;
    P_.m.position.set(x, y, zz); P_.m.rotation.y = Math.atan2(P_.x1 - P_.x0, P_.z1 - P_.z0);
    const sx = P_.mine ? pl.x : P_.x0, sz = P_.mine ? pl.z : P_.z0, l = Math.max(.05, dist2(sx, sz, x, zz));
    P_.rope.position.set((sx + x) / 2, (1.1 + y) / 2, (sz + zz) / 2); P_.rope.scale.z = l; P_.rope.rotation.y = Math.atan2(x - sx, zz - sz);
    if (!P_.back && P_.t >= P_.T) {
      P_.back = 1;
      if (P_.mine && z) req('plunge', { id: z.id });
      burst(x, y, zz, '#E8505B', 5, 2, .4, 1);
    }
    if (P_.back && P_.t > P_.T * 2 + .25) { scene.remove(P_.m); scene.remove(P_.rope); V.plg.splice(i, 1); }
  }
}
/* ---------- 📘 Кинути звіт: напарнику, на якого дивишся (або вперед на 7 м) ---------- */
function throwTarget() {
  let best = null, bs = 1e9;
  for (const id in NET.players) {
    const r = NET.players[id]; if (!r || !r.name || r.x == null || !inOffice(r.x, r.z)) continue;
    const d = dist2(pl.x, pl.z, r.x, r.z); if (d > 14 || d < 1) continue;
    const da = Math.abs(((Math.atan2(r.x - pl.x, r.z - pl.z) - pl.face + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    const s = d + da * 8; if (da < 1.2 && s < bs) { bs = s; best = r; }
  }
  return best;
}
function throwReport() {
  if (!running || pl.dead || myHeld().it !== 'report') { toast('📘 Кидати можна лише надрукований звіт, коли він у тебе в руках.'); return; }
  if (ST.fly) return;
  const r = throwTarget();
  if (r) { pl.face = Math.atan2(r.x - pl.x, r.z - pl.z); req('throw', { x: r2(r.x), z: r2(r.z), to: r.name }); }
  else req('throw', { x: r2(pl.x + Math.sin(pl.face) * 7), z: r2(pl.z + Math.cos(pl.face) * 7) });
}
/* ---------- ☕ Кава-ривок: 4 с бігаєш утричі бадьоріше (3 на раунд, +1 за допомогу колезі з Excel) ---------- */
function coffeeDash() {
  if (!running || pl.dead || !inOffice(pl.x, pl.z)) return;
  if (V.cof <= 0) { toast('☕ Кава-ривки скінчились. Допоможи колезі з Excel — пригостить ще.'); return; }
  if (V.dashT > 0) return;
  V.cof--; V.dashT = 4; sfx('dash'); ftext(pl.x, 2.6, pl.z, '☕ Ривок!', 'gold'); burst(pl.x, .6, pl.z, '#8C5A3C', 8, 3, .5, 1);
}
// важкий звіт сповільнює, ривок пришвидшує
if (!SIMSIDE && typeof funSpeedMul === 'function') {
  const _fsm = funSpeedMul;
  funSpeedMul = function () { const m = _fsm.apply(this, arguments); if (!running || !inOffice(pl.x, pl.z)) return m; return m * (myHeld().it === 'report' ? .78 : 1) * (V.dashT > 0 ? 1.55 : 1); };
}
function setBar() {
  const on = running && !pl.dead && ST.on && inOffice(pl.x, pl.z);
  if (on === V.barOn || typeof modeBar !== 'function') return; V.barOn = on;
  modeBar(on ? { slots: [
    { id: 'plg', ic: '🪠', n: 'Вантуз', use: () => firePlunger() },
    { id: 'thr', ic: '📘', n: 'Кинути звіт', count: () => myHeld().it === 'report' && !ST.fly ? 1 : 0, use: throwReport },
    { id: 'cof', ic: '☕', n: 'Кава-ривок', count: () => V.cof, use: coffeeDash },
  ] } : null);
}
function toLobby(msg) {
  pl.x = START.p.x - .5; pl.z = START.p.z + .4; pl.y = 0; pl.vy = 0; pl.falling = false; pl.jump = null; pl.safe = { x: pl.x, z: pl.z };
  camPos.set(pl.x, 20, pl.z + 15); camLook.set(pl.x, .5, pl.z); if (msg) toast(msg);
}

/* ---------- Кожен кадр ---------- */
function clientTick(dt) {
  const t = gameTime;
  syncHeld();
  // новий раунд — нові ривки
  if (ST.rid !== V.rid) { V.rid = ST.rid; V.cof = 3; V.dashT = 0; }
  if (V.dashT > 0) { V.dashT -= dt; if (Math.random() < dt * 20) burst(pl.x, .3, pl.z, '#C4956A', 1, 1, .4, .5); }
  if (V.plCd > 0) V.plCd -= dt;
  setBar(); updPlg(dt);
  // колеги з даними махають, над головою 📄; колега з Excel кличе на допомогу
  for (const [i, c] of V.cols.entries()) {
    if (!c) continue; const has = ST.on && ST.desk[i], xl = ST.on && ST.xl && ST.xl.i === i;
    c.icon.visible = !!(has || xl);
    if (xl && c.icon.material.map !== iconTex('📊')) c.icon.material.map = iconTex('📊'); else if (!xl && has && c.icon.material.map !== iconTex('📄')) c.icon.material.map = iconTex('📄');
    if (has || xl) { c.icon.position.y = 2.25 + Math.sin(t * (xl ? 8 : 3) + i) * .08; c.h.aR.rotation.x = -2.4 + Math.sin(t * (xl ? 12 : 6) + i) * .4; } else c.h.aR.rotation.x = -1.1 + Math.sin(t * 9 + i) * .08;
  }
  // панелі голосування біля ліфтів
  for (const [k, q] of (L.v.pads || []).entries()) if (q) { const mine = !ST.on && V.vote === k; q.scale.setScalar(ST.on ? .85 : 1 + (mine ? .08 + Math.sin(t * 6) * .06 : 0) + ST.vo[k] * .05); q.rotation.y += dt * (ST.vo[k] ? 1.5 : .3); }
  // начальник
  if (V.boss) {
    const B = ST.boss, h = V.boss, mv = B.at === 'walk';
    h.root.position.set(B.x, 0, B.z); h.root.rotation.y = lerpAng(h.root.rotation.y, B.f, Math.min(1, dt * 8));
    const sw = mv ? Math.sin(t * 8) * .5 : 0; h.l1.rotation.x = sw; h.l2.rotation.x = -sw;
    V.boss.ent.x = B.x; V.boss.ent.z = B.z;
    if (ST.on && ST.steps.includes('sign') && ST.steps.indexOf('sign') >= ST.si && !ST.coffee && Math.random() < dt * .12 && inOffice(pl.x, pl.z)) bubble(V.boss.ent, pick(['Хто бачив мою каву?!', 'Без кави нічого не підписую!', 'Звіт до шостої! І кави!']), true, 2.2);
    if (B.at === 'meeting' && Math.random() < dt * .08 && inOffice(pl.x, pl.z)) bubble(V.boss.ent, pick(['Я на нараді!', 'Синергія, колеги!', 'Хто записує?']), false, 2);
  }
  // зомбі-офісники (той, що жує звіт, — гризе теку й сиплеться папірцями)
  const seen = new Set();
  for (const z of ST.zom) {
    seen.add(z.id);
    let v = V.zm.get(z.id);
    if (!v) { const h = buildOffice(pick(['#9FC29A', '#A8C2A2', '#B5CFA0']), pick(['#8291B8', '#7C8AA8', '#8C84A8', '#6E5E96'])); scene.add(h.root); v = { h, ent: { x: z.x, z: z.z, y: 0, bh: 2.3 }, carry: '', cm: null }; V.zm.set(z.id, v); h.root.position.set(z.x, 0, z.z); }
    const h = v.h; v.ent.x = z.x; v.ent.z = z.z;
    h.root.position.x = z.x; h.root.position.z = z.z; h.root.rotation.y = lerpAng(h.root.rotation.y, z.f || 0, Math.min(1, dt * 6));
    const chew = z.carry && z.carry.it === 'report';
    if (z.stun > 0) { h.body.position.y = lerp(h.body.position.y, -.45, Math.min(1, dt * 6)); h.l1.rotation.x = h.l2.rotation.x = -1.4; h.aR.rotation.x = h.aL.rotation.x = -.3; }
    else if (chew) { h.body.position.y = lerp(h.body.position.y, 0, Math.min(1, dt * 6)); const sw = Math.sin(t * 4 + z.id) * .3; h.l1.rotation.x = sw; h.l2.rotation.x = -sw; h.aR.rotation.x = h.aL.rotation.x = -2.2 + Math.sin(t * 14) * .15; if (Math.random() < dt * 6) burst(z.x, 1.6, z.z, '#FFFFFF', 1, 1.5, .6, 1.5); }
    else { h.body.position.y = lerp(h.body.position.y, 0, Math.min(1, dt * 6)); const sw = Math.sin(t * 6 + z.id) * .5; h.l1.rotation.x = sw; h.l2.rotation.x = -sw; h.aR.rotation.x = h.aL.rotation.x = -1.45 + Math.sin(t * 3 + z.id) * .1; }
    const cs = z.carry ? z.carry.it + z.carry.n + (chew ? hpB() : '') : '';
    if (cs !== v.carry) { v.carry = cs; if (v.cm) { h.root.remove(v.cm); v.cm = null; } if (z.carry) { v.cm = itemMesh(z.carry.it, z.carry.n, 0, ST.rhp); if (chew) v.cm.position.set(0, 1.55, .32); h.root.add(v.cm); } }
    if (v.cm && chew) v.cm.rotation.z = Math.sin(t * 14) * .15;
  }
  for (const [id, v] of V.zm) if (!seen.has(id)) { scene.remove(v.h.root); V.zm.delete(id); }
  if (ST.on && ST.zom.some(z => z.carry && z.carry.it === 'report') && inOffice(pl.x, pl.z) && (V.chewT -= dt) <= 0) { V.chewT = .45; sfx('bite'); }
  // папери на підлозі
  const fs = new Set();
  for (const f of ST.floor) {
    fs.add(f.id); let m = V.fm.get(f.id);
    if (!m) { m = itemMesh(f.it, f.n, 0, ST.rhp); m.position.set(f.x, .1, f.z); scene.add(m); V.fm.set(f.id, m); }
    m.position.set(f.x, .12 + Math.abs(Math.sin(t * 3 + f.id)) * .12, f.z); m.rotation.y += dt;
  }
  for (const [id, m] of V.fm) if (!fs.has(id)) { scene.remove(m); V.fm.delete(id); }
  // звіт у польоті
  if (ST.fly) {
    const F = ST.fly; if (!V.flyM) { V.flyM = itemMesh('report', 1, 0, ST.rhp); scene.add(V.flyM); }
    const s = clamp(F.t / F.T, 0, 1); V.flyM.position.set(lerp(F.x0, F.x1, s), flyY(F) - .1, lerp(F.z0, F.z1, s)); V.flyM.rotation.y += dt * 9; V.flyM.rotation.x = Math.sin(t * 9) * .4;
    if (Math.random() < dt * 20) burst(V.flyM.position.x, V.flyM.position.y, V.flyM.position.z, '#FFE066', 1, .5, .3, 0);
  } else if (V.flyM) { scene.remove(V.flyM); V.flyM = null; }
  // капсули пневмопошти під стелею
  while (V.caps.length < ST.tb.length) { const m = new THREE.Group(); put(m, mesh(flat(new THREE.CylinderGeometry(.13, .13, .45, 8)), '#FFB35C', false), 0, 0, 0).rotation.z = Math.PI / 2; scene.add(m); V.caps.push(m); }
  while (V.caps.length > ST.tb.length) scene.remove(V.caps.pop());
  ST.tb.forEach((q, i) => { if (!AUTH()) q.t -= dt; const a = TUBE[1 - q.to].o, b = TUBE[q.to].o, s = clamp(1 - q.t / TUBE_T, 0, 1), m = V.caps[i]; m.position.set(lerp(a.x, b.x, s), 2.5, lerp(a.z, b.z, s)); m.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x); });
  // годинник
  if (V.clock) {
    const s = 17 * 3600 + 55 * 60 + (ST.on ? ST.t : 0), sec = s % 60, min = (s / 60) % 60, hr = (s / 3600) % 12;
    V.clock.s.rotation.z = -sec / 60 * Math.PI * 2; V.clock.m.rotation.z = -min / 60 * Math.PI * 2; V.clock.h.rotation.z = -hr / 12 * Math.PI * 2;
    const left = ST.dur - ST.t; V.clock.g.scale.setScalar(V.clockK * (ST.on && left < 30 ? 1 + Math.abs(Math.sin(t * 6)) * .06 : 1));
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
  const here = inOffice(pl.x, pl.z), fl = floorOf(pl.x, pl.z);
  // на «чужому» поверсі (раунд іде на іншому) — ліфт сам відвезе до команди
  if (fl >= 0 && !here) { if ((V.tpT += dt) > 1.2) { V.tpT = 0; toLobby(`🛗 Команда на ${L.n} — ліфт везе тебе туди.`); } return; }
  V.tpT = 0;
  if (!here) { V.act = null; V.vote = -1; if (myHeld().it || myHeld().cup) { if ((V.sendT -= dt) <= 0) { V.sendT = 1; req('drop'); } } return; }
  if (ST.on) V.joined = true;
  if (!ST.on) { const k = PADS.findIndex(q => dist2(pl.x, pl.z, q.x, q.z) < .9); if (k >= 0 && V.vote !== k) { V.vote = k; if (!AUTH()) req('vote', { v: k }); } }
  else V.vote = -1;
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
const FIXL = { jam: ['🔧', 'Витягую зім’ятий папір'], cm: ['🔧', 'Лагоджу кавоварку'], heat: ['🌀', 'Лагоджу вентилятор'], power: ['⚡', 'Вмикаю автомати'], rain: ['🚿', 'Закручую вентиль'], excel: ['📊', 'Пояснюю колезі ВПР'] };
const fixAt = w => w === 'excel' ? (ST.xl ? DESKS[ST.xl.i].p : START.p) : { jam: PRINTER, cm: COFFEE, heat: RACK, power: PANEL, rain: VALVE }[w].p;
const active = w => w === 'jam' ? ST.jam : w === 'cm' ? !ST.cm : w === 'heat' ? ST.heat : w === 'power' ? !ST.pw : w === 'excel' ? !!ST.xl : ST.rain;
function actFix(w) { startAct(() => req('fix', { w }), FIXT[w], () => fixAt(w), FIXL[w][0], FIXL[w][1], () => active(w) ? '' : 'Уже полагодили!'); }

/* ---------- Підказки: підписи місць, «що робити зараз» і стрілка до цілі ---------- */
function goal() {
  const k = myKey(), h = myHeld(), s = cur(), near = o => dist2(pl.x, pl.z, o.x, o.z);
  const nearest = arr => arr.reduce((a, b) => !a || near(b) < near(a) ? b : a, null);
  if (!ST.on) {
    const nx = LAY[ST.nx];
    return { id: 'start', tg: START.p, txt: `Підійди до <b>▶ СТАРТ</b> (${RN.atStart}) і натисни <b>F</b>. Поверх наступного раунду: <b>${nx.n}</b> — голосуй, ставши на панель 🛗 біля ліфтів.` };
  }
  if (V.act) return { txt: `${V.act.ic} ${V.act.l}… ${Math.min(100, Math.round(V.act.t / V.act.need * 100))}% — стій поруч!` };
  const signLater = ST.steps.indexOf('sign') >= ST.si && ST.steps.includes('sign') && !ST.coffee;
  // звіт у повітрі — лови
  if (ST.fly && !h.it) return { id: 'catch', tg: { x: ST.fly.x1, z: ST.fly.z1 }, txt: '📘 Звіт летить! Стань під нього — зловиш автоматично.' };
  // зомбі жує звіт — вантузом його!
  const chew = nearest(ST.zom.filter(z => z.carry && z.carry.it === 'report' && z.stun <= 0));
  if (chew) return { id: 'chew', tg: { x: chew.x, z: chew.z }, txt: `🧟 Зомбі <b>жує звіт</b> (цілість ${Math.round(ST.rhp)}%)! Лупи вантузом 🪠 — клавіша <b>1</b> або <b>F</b> поруч.` };
  // хтось украв дані
  const thief = nearest(ST.zom.filter(z => z.carry && z.stun <= 0 && s === 'data'));
  if (thief && (!h.it || h.it === 'sheets')) return { id: 'thief', tg: { x: thief.x, z: thief.z }, txt: `🧟 Зомбі-офісник поцупив ${ITEM[thief.carry.it].ic} <b>${ITEM[thief.carry.it].n}</b>! Наздожени й натисни <b>F</b> — «Це можна було листом!» (або 🪠 вантузом здалеку).` };
  // папери на підлозі
  const fl = nearest(ST.floor.filter(f => (f.it === 'report' && !h.it) || (f.it === 'sheets' && s === 'data' && (!h.it || h.it === 'sheets'))));
  if (fl) return { id: 'floor', tg: fl, txt: `${ITEM[fl.it].ic} <b>${ITEM[fl.it].n}</b> на підлозі — підбери (F), поки зомбі не схопили.` };
  if (!ST.pw && (s === 'print' || s === 'scan' || !h.it)) return { id: 'power', tg: PANEL.p, txt: `⚡ <b>Нема світла!</b> Біжи до щитка (${RN.atPanel}) і тримай F (або чекай, поки напруга сама стабілізується).` };
  if (ST.jam && s === 'print' && h.it !== 'report') return { id: 'jam', tg: PRINTER.p, txt: '🖨️ <b>Принтер зажував папір.</b> Підійди й тримай F, щоб витягнути.' };
  if (ST.heat && s === 'scan') return { id: 'heat', tg: RACK.p, txt: `🔥 <b>Сервер перегрівся</b> — сканер не працює. Полагодь вентилятор ${RN.atRack} (F).` };
  if (h.cup && signLater) return { id: 'boss', tg: bossPos(), txt: '☕ Неси каву <b>начальнику</b> (F поруч з ним).' };
  if (h.it === 'report') {
    if (s === 'send') return { id: 'send', tg: SEND.p, txt: `📤 Звіт готовий! Неси його в лоток <b>«Відправка»</b> (${RN.atSend}) і натисни F.` };
    if (s === 'sign') {
      if (!ST.coffee && !h.cup) return ST.cm ? { id: 'coffee', tg: COFFEE.p, txt: `✍️ Начальник без кави не підписує. Звари <b>☕ каву</b> ${RN.atCoffee} (звіт можна не випускати з рук).` } : { id: 'cm', tg: COFFEE.p, txt: '💥 Кавоварка зламана — полагодь її (F), а тоді звари каву начальнику.' };
      return { id: 'boss', tg: bossPos(), txt: '✍️ Підійди до <b>начальника</b> з звітом і тримай F — підпише.' };
    }
    const S = STEPS[s]; if (S && S.at) return { id: s, tg: S.at.p, txt: `${S.ic} Неси звіт: <b>${S.n}</b> — F і тримайся поруч. Важкий? Кинь напарнику (📘, клавіша 2).` };
  }
  if (h.it === 'sheets') {
    if (s === 'data') { const d = nearest(DESKS.filter(q => ST.desk[q.i])); if (d && h.n + ST.fed < ST.need) return { id: 'desk', tg: d.p, txt: `📄 У руках ${h.n}. Ще дані в колеги з 📄 над головою — F біля столу. Або неси вже в 🖨️ принтер.` }; }
    return { id: 'printer', tg: PRINTER.p, txt: `📥 Неси дані (${h.n} 📄) в <b>принтер</b> ${RN.atPrint} і натисни F. Далеко? Є 📮 пневмопошта.` };
  }
  if (s === 'data') {
    const d = nearest(DESKS.filter(q => ST.desk[q.i]));
    if (d) return { id: 'desk', tg: d.p, txt: `📄 Збери дані: колега з 📄 над головою (${NAMES[d.i]}) — підійди до столу й натисни F. У принтері ${ST.fed}/${ST.need}.` };
  }
  if (s === 'print' && !ST.jam) return { id: 'printer', tg: PRINTER.p, txt: `🖨️ Дані в принтері! Натисни F біля <b>принтера</b> (${RN.atPrint}) й тримайся поруч 4 с — друкується звіт.` };
  // допомога команді, поки звіт у когось іншого
  if (signLater && !h.cup && !Object.values(ST.held).some(q => q.cup)) return ST.cm ? { id: 'coffee', tg: COFFEE.p, txt: `☕ Начальник без кави не підпише звіт. Звари каву ${RN.atCoffee} (F) і віднеси йому.` } : { id: 'cm', tg: COFFEE.p, txt: '💥 Кавоварка зламана — полагодь (F): начальнику потрібна кава.' };
  if (ST.jam) return { id: 'jam', tg: PRINTER.p, txt: '🖨️ Принтер зажований — витягни папір (F).' };
  if (ST.heat) return { id: 'heat', tg: RACK.p, txt: `🔥 Сервер перегрівся — полагодь вентилятор ${RN.atRack} (F).` };
  if (!ST.cm) return { id: 'cm', tg: COFFEE.p, txt: '💥 Кавоварка зламана — полагодь її (F).' };
  if (ST.rain) return { id: 'rain', tg: VALVE.p, txt: '💦 Спринклери ллють! Закрути <b>вентиль</b> (F) — папери розлітаються.' };
  if (ST.xl) return { id: 'excel', tg: DESKS[ST.xl.i].p, txt: `📊 ${NAMES[ST.xl.i]} не може зробити ВПР — допоможи (F, 3 с), інакше за ${Math.ceil(ST.xl.t)} с стане зомбі. Нагорода: +1 ☕ ривок.` };
  const holder = Object.keys(ST.held).find(q => ST.held[q].it === 'report' && q !== k);
  if (holder) { const z = nearest(ST.zom.filter(q => q.stun <= 0 && !q.carry)); return z && near(z) < 6 ? { id: 'zombie', tg: { x: z.x, z: z.z }, txt: '🧟 Звіт у колеги. Відганяй зомбі-офісників (F поруч або 🪠 вантузом), щоб не вкрали!' } : { txt: `📘 Звіт несе ${escapeHTML(holder)} — прикривай: 🪠 вантуз по зомбі, лагодь поломки, лови звіт, якщо кине.` }; }
  if (s === 'data') return { id: 'printer', tg: PRINTER.p, txt: `📄 Дані в дорозі — чекай біля принтера (${ST.fed}/${ST.need}).` };
  return { txt: 'Стеж за хаосом і зомбі — і поспішай, 18:00 близько!' };
}
function guide() {
  if (!V.lbl) {
    V.lbl = document.createElement('div'); V.lbl.style.cssText = 'position:fixed;inset:0;z-index:2;pointer-events:none';
    const css = document.createElement('style');
    css.textContent = `.dl-lbl{position:absolute;left:0;top:0;padding:3px 9px;border-radius:10px;background:rgba(46,35,70,.78);color:#fff;font:700 12px/1.3 system-ui,sans-serif;white-space:nowrap;transform:translate(-50%,-100%);transition:opacity .2s}
      .dl-lbl.goal{background:#FFE066;color:#2E2346;font-size:14px;box-shadow:0 0 0 3px rgba(255,224,102,.35),0 6px 16px rgba(0,0,0,.3);animation:dlB .8s ease-in-out infinite alternate}
      .dl-lbl.pad{background:rgba(46,35,70,.9);border:2px solid #FFE066}
      @keyframes dlB{to{margin-top:-6px}}`;
    document.head.appendChild(css); document.body.appendChild(V.lbl);
    for (const P of PLACES) { P.el = document.createElement('div'); P.el.className = 'dl-lbl'; V.lbl.appendChild(P.el); }
    V.padEl = [0, 1, 2].map(() => { const e = document.createElement('div'); e.className = 'dl-lbl pad'; V.lbl.appendChild(e); return e; });
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
  const txt = P => typeof P.t === 'function' ? P.t() : P.t;
  for (const P of PLACES) {
    const p = P.f(), on = (!P.on || P.on()) && P.id !== g.id && (ST.pw || dist2(pl.x, pl.z, p.x, p.z) < 5);
    P.el.style.opacity = on ? (dist2(pl.x, pl.z, p.x, p.z) < 7 ? 1 : .55) : 0;
    if (on) { const t = txt(P); if (P.el.textContent !== t) P.el.textContent = t; pos(P.el, p.x, P.y, p.z); }
  }
  V.padEl.forEach((e, k) => {
    const p = PADS[k]; e.style.opacity = ST.on ? 0 : 1; if (ST.on) return;
    const t = `🛗 ${LAY[k].n}${ST.vo[k] ? ' · 🗳️' + ST.vo[k] : ''}${ST.nx === k ? ' ◀' : ''}`; if (e.textContent !== t) e.textContent = t;
    pos(e, p.x, 1.2 + (k % 2) * .7, p.z);
  });
  V.glbl.style.opacity = g.tg ? 1 : 0;
  if (g.tg) {
    const P = PLACES.find(q => q.id === g.id), t = '👉 ' + (P ? txt(P) : { desk: '📄 Дані тут (F)', boss: '👔 Начальник', thief: '🧟 Злодій! (F)', chew: '🧟 Жує звіт! 🪠', catch: '📘 Лови тут!', floor: '📄 Підібрати (F)', zombie: '🧟 Прожени (F)', cm: '🔧 Кавоварка', jam: '🔧 Принтер', printer: '🖨️ Принтер', excel: '📊 Допомогти з Excel (F)' }[g.id] || 'Сюди');
    if (V.glbl.textContent !== t) V.glbl.textContent = t; pos(V.glbl, g.tg.x, 3, g.tg.z);
    const d = dist2(pl.x, pl.z, g.tg.x, g.tg.z);
    V.gMark.position.set(g.tg.x, .08, g.tg.z); V.gMark.scale.setScalar(1 + Math.sin(gameTime * 5) * .12);
    V.gArrow.visible = d > 2.2; V.gArrow.position.set(pl.x, .15, pl.z); V.gArrow.rotation.y = -Math.atan2(g.tg.z - pl.z, g.tg.x - pl.x);
  }
}
/* коротка інструкція при першому вході */
function intro(force) {
  const d = A.data(); if ((d.intro2 && !force) || SIMSIDE || document.getElementById('dl-intro')) return;
  const el = document.createElement('div'); el.id = 'dl-intro';
  el.style.cssText = 'position:fixed;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;background:rgba(20,12,40,.55);padding:16px;overflow:auto';
  el.innerHTML = `<div style="max-width:500px;width:100%;background:#2E2346;color:#fff;border-radius:18px;padding:18px 20px;font:14px/1.5 system-ui,sans-serif;box-shadow:0 12px 40px rgba(0,0,0,.4)">
    <div style="font:800 20px system-ui;margin-bottom:4px">⏰ Дедлайн о 18:00 — як грати</div>
    <div style="color:#FFE066;margin-bottom:6px">🏙️ ${L.n} · хмарочос у центрі міста</div>
    <div>1. 🛗 Біля ліфтів — панелі поверхів: стань на панель, щоб проголосувати (42 · Опенспейс, 57 · Банк, 63 · Стартап). <b>▶ СТАРТ</b> (F) — годинник іде з 17:55.</div>
    <div>2. 📄 Збери дані в колег (📄 над головою) → 🖨️ <b>принтер</b> → друкуй (F, тримайся поруч).</div>
    <div>3. Зі звітом пройди пункти чекліста праворуч: 📎 🔏 🗂️ 📠 ✍️ (начальнику спершу ☕ каву!) → 📤 «Відправка».</div>
    <div>4. 📘 <b>Звіт — гаряча картопля</b>: важкий (ходиш повільніше), його можна <b>кинути</b> напарнику через перегородки (клавіша <b>2</b>).</div>
    <div>5. 🧟 Зомбі хапають звіт і <b>ЖУЮТЬ</b> його (цілість падає; 0 — передруковуй). <b>🪠 Вантуз</b> (клавіша <b>1</b>) — і зомбі випльовує звіт.</div>
    <div>6. ☕ <b>Кава-ривок</b> (клавіша <b>3</b>, 3 на раунд) · 📮 <b>пневмопошта</b> між кімнатами · 🚪 пожежні сходи / 🛝 гірка — короткий шлях · 📊 колега з Excel кличе — допоможи, бо стане зомбі · 💯 бездоганний звіт без укусів — бонус.</div>
    <div style="margin-top:8px;color:#FFE066">Жовта стрілка й мітка завжди показують, куди йти зараз. Підказка — внизу екрана 👇</div>
    <button class="btn" style="margin-top:12px;width:100%">Зрозуміло, працюємо!</button></div>`;
  document.body.appendChild(el);
  el.querySelector('button').addEventListener('click', () => { el.remove(); d.intro2 = 1; d.intro = 1; save(); });
}

/* ---------- F ---------- */
const _getInteract = getInteract;
getInteract = function () {
  if (!SIMSIDE && running && !pl.dead && inOffice(pl.x, pl.z) && !pl.carry && !pl.ride) {
    const near = (o, r) => dist2(pl.x, pl.z, o.x, o.z) < r, h = myHeld(), s = cur();
    if (V.act) return { l: `${V.act.ic} ${V.act.l}… ${Math.min(100, Math.round(V.act.t / V.act.need * 100))}%`, fn: () => { } };
    if (ST.on) for (const z of ST.zom) if (z.stun <= 0 && near(z, 1.9)) {
      if (z.carry && z.carry.it === 'report') return { l: '🪠 Вантузом його — хай виплюне звіт!', fn: () => firePlunger(z) };
      return { l: z.carry ? `🧟 Відібрати ${ITEM[z.carry.it].ic}: «Це можна було листом!»` : '🗣️ «Це можна було листом!» (прогнати зомбі)', fn: () => req('shoo', { id: z.id }) };
    }
    for (const f of ST.floor) if (near(f, 1.3) && (!h.it || (h.it === 'sheets' && f.it === 'sheets'))) return { l: `Підняти ${ITEM[f.it].ic} ${ITEM[f.it].n}${f.n > 1 ? ' ×' + f.n : ''}`, fn: () => req('pick', { id: f.id }) };
    if (!ST.on) {
      if (near(START.p, 1.6)) return { l: `⏰ Почати аврал (17:55 → 18:00) · ${LAY[ST.nx].n}`, fn: () => { req('start'); sfx('ding'); } };
      for (let k = 0; k < PADS.length; k++) if (near(PADS[k], 1.1)) return { l: `🗳️ Голосую за ${LAY[k].n}`, fn: () => { req('vote', { v: k }); V.vote = k; } };
      if (near(L.exit, 1.3)) return { l: '⬇️ Ліфт у хаб', fn: () => { leaveDeadline(); goHub('⬇️ Ліфт приїхав у «Гущу». Дедлайн почекає… до 18:00.'); } };
    }
    else {
      if (ST.xl && near(DESKS[ST.xl.i].p, 1.4)) return { l: `📊 Допомогти ${NAMES[ST.xl.i]} з ВПР (3 с)`, fn: () => actFix('excel') };
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
    // пневмопошта й короткий шлях — пневмопошта — під час аврала, короткий шлях — завжди
    for (let i = 0; i < 2; i++) if (ST.on && near(TUBE[i].p, 1.3)) return h.it ? { l: `📮 Відправити ${ITEM[h.it].ic} пневмопоштою (${TUBE_T} с)`, fn: () => req('tube', { i }) } : { l: '📮 Пневмопошта: поклади сюди папери чи звіт — вилетять в іншій колбі', fn: () => { } };
    for (const [a, b] of [[STAIRS.a, STAIRS.b], [STAIRS.b, STAIRS.a]]) if (near(a, 1.3)) return { l: `${STAIRS.ic} ${STAIRS.n}: короткий шлях`, fn: () => shortcut(b) };
  }
  return _getInteract.apply(this, arguments);
};
/* 🚪 пожежні сходи / 🛝 гірка: миттєво в інший кінець поверху (з тим, що в руках) */
function shortcut(b) {
  const f = $('#fade'); if (f) f.style.opacity = 1; sfx(STAIRS.kind === 'slide' ? 'whoosh' : 'travel');
  setTimeout(() => { pl.x = b.x; pl.z = b.z; pl.y = 0; pl.vy = 0; pl.safe = { x: b.x, z: b.z }; camPos.set(pl.x, 20, pl.z + 15); camLook.set(pl.x, .5, pl.z); if (f) f.style.opacity = 0; ftext(pl.x, 2.5, pl.z, STAIRS.kind === 'slide' ? 'Вжу-у-ух! 🛝' : 'Сходами швидше! 🚪', 'gold'); }, 220);
}

/* ---------- HUD: поверх, годинник, чекліст, цілість звіту, хаос ---------- */
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
  const fl = `<span style="color:${L.pc}">🏙️ ${L.n}</span>`;
  if (ST.on) {
    const left = Math.max(0, ST.dur - ST.t), col = left < 30 ? '#FF5C7A' : left < 90 ? '#FFD27A' : '#7FE08A', mh = myHeld();
    const chaos = [ST.jam ? '🖨️ принтер зажований' : '', !ST.cm ? '💥 кавоварка' : '', !ST.pw ? '⚡ нема світла' : '', ST.heat ? '🔥 сервер' : '', ST.rain ? '💦 спринклери' : '', ST.xl ? '📊 колега з Excel' : '', ST.zom.length > 4 ? '🧟 нарада' : ''].filter(Boolean).join(' · ');
    const rep = ST.si > ST.steps.indexOf('print') && ST.si < ST.steps.length, rc = ST.rhp > 60 ? '#7FE08A' : ST.rhp > 30 ? '#FFD27A' : '#FF5C7A';
    const chew = ST.zom.some(z => z.carry && z.carry.it === 'report');
    const bar = rep ? `<br><span style="font-size:12px">📘 цілість звіту <span style="display:inline-block;width:90px;height:8px;border-radius:4px;background:#4E4A6E;vertical-align:middle"><span style="display:block;width:${Math.round(ST.rhp)}%;height:100%;border-radius:4px;background:${rc}"></span></span> ${Math.round(ST.rhp)}%${chew ? ' · <span style="color:#FF5C7A">🧟 ЖУЮТЬ!</span>' : ST.fly ? ' · 🪂 летить' : ''}${ST.pf ? ' 💯' : ''}</span>` : '';
    h = `${fl} · <span style="font-size:17px;color:${col}">⏰ ${clockStr(ST.t)}</span> · до 18:00: <span style="color:${col}">${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}</span>${mh.it || mh.cup ? ` · у руках ${mh.it ? ITEM[mh.it].ic + (mh.n > 1 ? '×' + mh.n : '') : ''}${mh.cup ? '☕' : ''}` : ''}${V.dashT > 0 ? ' · ☕💨' : ''}${V.act ? ` · ${V.act.ic} ${Math.round(V.act.t / V.act.need * 100)}%` : ''}${bar}${chaos ? `<br><span style="font-size:12px;color:#FF8A7A">${chaos}</span>` : ''}`;
    const rows = ST.steps.map((id, i) => { const S = STEPS[id], done = i < ST.si, now = i === ST.si; return `<div style="${done ? 'opacity:.6;text-decoration:line-through' : now ? 'color:#FFE066' : 'opacity:.85'}">${done ? '✅' : now ? '▶' : '⬜'} ${S.ic} ${S.n}${id === 'data' ? ` <b>${Math.min(ST.fed, ST.need)}/${ST.need}</b>` : ''}${id === 'sign' && ST.coffee ? ' ☕✔' : ''}</div>`; }).join('');
    const lv = `<div style="font:800 13px system-ui;margin-bottom:3px">📋 Чекліст звіту${ST.lv ? ` · рівень ${ST.lv + 1}` : ''}</div>`;
    if (V.list.innerHTML !== lv + rows) V.list.innerHTML = lv + rows;
  } else {
    const nx = LAY[ST.nx], vo = ST.vo.some(Boolean) ? ' · 🗳️ ' + LAY.map((q, i) => `${q.fl}: ${ST.vo[i]}`).join(' · ') : '';
    h = `${fl} · ⏰ 17:55 · <span style="font-weight:600">звіт ще не почато</span><br><span style="font-size:12px">🛗 наступний раунд: <b style="color:${nx.pc}">${nx.n}</b>${vo}</span>`;
  }
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
  setTimeout(() => { toLobby(`⏰ ${L.n}! Жовта стрілка показує, куди йти. Голосуй за поверх на панелях 🛗, старт — ▶ СТАРТ (F).`); if (f) f.style.opacity = 0; intro(); }, 260);
  return true;
}
function leaveDeadline() { V.act = null; if (myHeld().it || myHeld().cup) req('drop'); V.barOn = false; if (typeof modeBar === 'function') modeBar(null); return true; }
if (A.mode) A.mode({ id: 'deadline', ic: '⏰', n: 'Дедлайн о 18:00', sub: 'кооп на 1–4: три поверхи хмарочоса, звіт до 18:00', go: goDeadline, here: () => running && floorOf(pl.x, pl.z) >= 0, leave: leaveDeadline });
A.tab('deadline', '⏰ Дедлайн', () => {
  const d = A.data(), here = floorOf(pl.x, pl.z) >= 0, fl = d.floors || {};
  return `<h3>⏰ Дедлайн о 18:00</h3>
    <p style="font-size:13px;line-height:1.5;margin:4px 0 10px">Кооператив на 1–4 гравці на високих поверхах хмарочоса в центрі міста. 17:55, п’ятниця. Квартальний звіт треба здати до 18:00 — а принтер жує папір, кавоварка вибухає, а зомбі-офісники на нараді гризуть звіти.</p>
    <div class="btns"><button class="btn alt" data-dl="help">❓ Як грати</button>${here ? (ST.on ? '' : '<button class="btn" data-dl="start">⏰ Почати аврал</button>') : '<button class="btn" data-dl="go">🛗 На поверх</button>'}</div>
    ${here && !ST.on ? `<div class="btns" style="margin-top:8px">${LAY.map((q, i) => `<button class="btn${ST.nx === i ? '' : ' alt'}" data-dl="v${i}">🗳️ ${q.n}${ST.vo[i] ? ' · ' + ST.vo[i] : ''}</button>`).join('')}</div>` : ''}
    <div class="list" style="margin-top:10px;font-size:13px;line-height:1.55">
      <div>🏙️ <b>Поверхи</b>: 42 · Опенспейс (класичний офіс з коридором) · 57 · Банк (сховище, операційний зал, кільцева галерея) · 63 · Стартап (атріум зі скляним мостом, мейл-рум, бариста-бар, гірка). Голосуй на панелях 🛗 біля ліфтів.</div>
      <div>📄 <b>Дані</b> — у колег з 📄 над головою (F біля столу). Неси в 🖨️ принтер, друкуй (тримайся поруч 4 с).</div>
      <div>📋 <b>Чекліст</b> щораунду інший: 3 з 5 — 📎 степлер, 🔏 печатка, 🗂️ реєстраційний номер, 📠 скан, ✍️ підпис начальника (спершу ☕ кава!). Потім 📤 «Відправка».</div>
      <div>📘 <b>Звіт — гаряча картопля</b>: важкий (повільніше ходиш), кидай напарнику дугою через перегородки (клавіша 2). Зомбі перехоплюють і <b>жують</b> звіт — 0% цілості = передрук.</div>
      <div>🪠 <b>Вантуз</b> (клавіша 1): присмоктується до зомбі — той випльовує звіт. ☕ <b>Кава-ривок</b> (3): 3 ривки на раунд.</div>
      <div>📮 Пневмопошта між кімнатами · 🚪 пожежні сходи / 🛝 гірка — короткий шлях · 📊 колега з Excel кличе на допомогу (не допоможеш — стане зомбі; допоможеш — +1 ривок) · 💯 бездоганний звіт без укусів — +30 🪙.</div>
      <div>💥 <b>Хаос</b>: принтер, кавоварка, світло (щиток), сервер (вентилятор), спринклери (вентиль). F і тримайся поруч.</div>
      <div>⭐ Зірки — за запас часу. Кожна перемога підвищує складність, а ліфт без голосів везе на наступний поверх.</div>
    </div>
    <p class="muted" style="font-size:12px;margin-top:10px">Раундів: ${d.rounds || 0} · звітів здано: ${d.wins || 0} · бездоганних: ${d.perfect || 0} · поверхи підкорено: ${LAY.map((q, i) => fl[i] ? q.fl + '✅' : q.fl + '⬜').join(' ')} · найбільший запас: ${d.best ? Math.floor(d.best / 60) + ':' + String(d.best % 60).padStart(2, '0') : '—'} · найкраща оцінка: ${'⭐'.repeat(d.stars || 0) || '—'} · хаосу приборкано: ${d.fixes || 0}</p>`;
}, e => {
  const b = e.target.closest('[data-dl]'); if (!b) return; const a = b.dataset.dl;
  if (a === 'help') { closePanel(); intro(true); } else if (a === 'go') goDeadline(); else if (a[0] === 'v') { req('vote', { v: +a[1] }); V.vote = +a[1]; renderPanel(); } else { req('start'); closePanel(); }
});
if (!SIMSIDE && typeof document !== 'undefined') {
  const box = document.querySelector('#main-menu .mm-container');
  if (box && !document.getElementById('mm-deadline')) {
    const card = document.createElement('div'); card.className = 'mm-card'; card.id = 'mm-deadline';
    card.innerHTML = `<div class="mm-img-wrap"><div class="mm-card-img" style="background-image:url('menu/deadline-bg.jpg'),url('addons/deadline/deadline-bg.jpg'),linear-gradient(160deg,#FF8A7A,#B07CF0 55%,#2E2346)"></div></div>
      <div class="mm-card-body"><h2>ДЕДЛАЙН</h2><div class="mm-subtitle">О 18:00</div>
      <div class="mm-desc">Квартальний звіт за 5 хвилин на 42-му, 57-му чи 63-му поверсі: принтер, печатки, кава начальнику, звіт-«гаряча картопля» і вантуз проти зомбі. Кооп на 4.</div></div>`;
    const locked = [...box.children].filter(c => c.classList.contains('mm-locked')).pop();
    box.insertBefore(card, locked || null);
    card.addEventListener('click', () => {
      if (typeof mmLaunch === 'function') { mmLaunch(goDeadline); return; }   // ядро саме перенесе після входу в гру
      V.auto = true; if (running) goDeadline();
      const mm = document.getElementById('main-menu'); if (mm) { mm.classList.add('mm-hide'); mm.addEventListener('transitionend', () => mm.remove(), { once: true }); }
    });
  }
}
A.on('start', () => { if (V.auto && !SIMSIDE) setTimeout(goDeadline, 700); });
if (window.__ADDON_TEST) window.__deadline = { ST, AU, V, LAY, get L() { return L; }, get DESKS() { return DESKS; }, get START() { return START; }, get SEND() { return SEND; }, get PRINTER() { return PRINTER; }, get COFFEE() { return COFFEE; }, get TUBE() { return TUBE; }, get STAIRS() { return STAIRS; }, get PADS() { return PADS; }, get OBS() { return OBS; }, get WALLS() { return WALLS; },
  STEPS, goal, intro, chaos, req, myHeld, myKey, blocked, navPath, clockStr, cur, useVar, floorOf, inOffice, firePlunger, throwReport, coffeeDash, reachable };
