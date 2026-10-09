/* Аддон «Дедлайн о 18:00» v2: кооператив до 5 учасників (люди + 🤖 боти, що доповнюють лобі) на високих поверхах хмарочоса в центрі міста.
   П'ятниця, 17:53. Квартальний звіт мав бути вчора, а здати його треба до 18:00 — за 7 хвилин.
   - Три поверхи (кожен — свій острів-хмарочос): «Поверх 42 · Опенспейс», «Поверх 57 · Банк» (сховище, операційний зал,
     кільцева галерея), «Поверх 63 · Стартап» (атріум зі скляним мостом, мішки-крісла, мейл-рум, гірка). У ліфтовому холі
     гравці у вікні лобі голосують за поверх (картки з картинками) і тиснуть «Я готовий»; без голосів після перемоги ліфт везе вище.
   - Ланцюжок завдань (порядок і варіанти щораунду інші):
     📄 дані від колег → 🖨️ принтер → 3 з 5: 📎 степлер · 🔏 печатка · 🗂️ реєстраційний номер · 📠 скан · ✍️ підпис начальника
     (без ☕ кави не підписує!) → 📤 лоток «Відправка».
   - Звіт — «гаряча картопля»: важкий (з ним ходиш повільніше), його можна КИНУТИ напарнику дугою через перегородки.
     Зомбі, що перехопив звіт у повітрі (чи вирвав з рук), ЖУЄ його — цілість падає; на 0 — передруковуй.
     🪠 Вантуз по зомбі — і він випльовує звіт.
   - Свій набір (modeBar, клавіші 1–8): 🪠 Вантуз · 📑 Кинути звіт / 📘 Книжка · ☕ Кава-ривок · ✈️ Літачок · 🧻 Мʼятий папір ·
     🧯 Вогнегасник · 🍾 Молотов · 🚨 Нарада (🕵️ Саботаж). Метальне береш F на поверсі: ✈️ лотки з папером, 📘 книжкові шафи, 🧻 смітники.
   - Лобі заповнюється до 5 учасників: після першого «Я готовий» по одному приходять 🤖 боти, що працюють і в раунді.
   - Свої ідеї: 📮 пневмопошта між кімнатами (папери летять трубою), 🚪 пожежні сходи / 🛝 гірка — короткий шлях,
     📊 колега з Excel просить допомоги (допоможеш — +1 ривок, ні — він стає зомбі), 💯 бонус за бездоганний звіт.
   - Хаос: принтер зажовує папір, кавоварка вибухає, гасне світло, сервер перегрівається, спринклери, раптова нарада.
   У спільному світі все рахує сервер: завдання, хаос, зомбі, політ звіту, голосування.
   Картинку для картки в меню поклади поруч: addons/deadline/deadline-bg.jpg */

const A = Addon.info({ name: 'Дедлайн о 18:00', version: '5.0', desc: 'Кооп до 5 (люди + боти) на трьох поверхах хмарочоса: здай квартальний звіт до 18:00 — дані, принтер, печатки, кава начальнику, звіт-«гаряча картопля», вантуз проти зомбі, пневмопошта й хаос.' });

const SIMSIDE = !!window.__SIM;
const AUTH = () => SIMSIDE || !(typeof WORLD !== 'undefined' && WORLD.on);
const ISL_R = 28, DH = 1.1, CZ = 2;
/* поточний поверх: усі ці змінні перемикає useVar() */
let OX = 0, OZ = 0, HX = 20, HZ = 14, L = null;
let WALLS = [], ROOMS = [], DESKS = [], OBS = [], ZWP = [], BPATH = [], CHAIRS = [], LIFTS = [], TUBE = [], STAIRS = null, NAV = null, RN = {}, NAMES = [];
let START, SEND, PRINTER, STAPLER, COFFEE, VALVE, PANEL, ARCHIVE, RACK, SCANNER, STAMP, BOSS_DESK, CLOCK, COOLER;
const LAY = [];
const W = (x, z) => ({ x: OX + x, z: OZ + z });
const inOffice = (x, z) => dist2(x, z, OX, OZ) < ISL_R + 2;
const floorOf = (x, z) => { for (let i = 0; i < LAY.length; i++) if (dist2(x, z, LAY[i].x, LAY[i].z) < ISL_R + 2) return i; return -1; };
const st = (ox, oz, px, pz, r) => ({ o: W(ox, oz), p: W(px, pz), r, l: { x: ox, z: oz }, pl: { x: px, z: pz } });
const V = { lbl: null, glbl: null, gArrow: null, gMark: null, goal: null, hud: null, list: null, goalEl: null, act: null, joined: false, auto: false, dark: null, music: -1,
  hm: new Map(), zm: new Map(), fm: new Map(), cols: [], boss: null, clock: null, clockK: 1, prLight: null, srvLight: null, fan: null, recep: null, acc: null, built: [],
  plg: [], plCd: 0, cof: 3, dashT: 0, rid: -1, barOn: false, flyM: null, caps: [], tpT: 0, chewT: 0, sendT: 0, vote: -1, rl: [], inRoom: null, lobHide: false, lobOpen: false, lobRid: -1 };

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
const ITEM = { sheets: { ic: '📄', n: 'дані' }, report: { ic: '📑', n: 'звіт' } };
const GRACE = 12;                                                                // с на початку раунду без зомбі-атак
const CHEW = 7;                                                                  // % цілості звіту за секунду, поки зомбі жує
const FIXT = { jam: 2.5, cm: 3, heat: 3, power: 2, rain: 2, excel: 3 };
const CHAOS = { jam: '🖨️ Принтер зажував папір!', boom: '💥 Кавоварка вибухнула!', power: '⚡ Стрибок напруги — світло вимкнулось!', heat: '🔥 Сервер перегрівся!', rain: '💦 Спрацювали спринклери — папери летять!', meeting: '🧟 Раптова нарада! Коридори забиті зомбі-офісниками!', excel: '📊 Колега не може зробити ВПР в Excel — кличе на допомогу!' };
const PLACES = [
  { id: 'start', f: () => START.p, y: 2.2, t: '🗳️ Лобі (F)', on: () => !ST.on },
  { id: 'send', f: () => SEND.p, y: 2.2, t: '📤 Відправка' },
  { id: 'printer', f: () => PRINTER.p, y: 2.2, t: '🖨️ Принтер' }, { id: 'staple', f: () => STAPLER.p, y: 1.9, t: '📎 Степлер' },
  { id: 'coffee', f: () => COFFEE.p, y: 2.3, t: '☕ Кавоварка' }, { id: 'rain', f: () => VALVE.p, y: 2, t: '🚿 Вентиль спринклерів' },
  { id: 'power', f: () => PANEL.p, y: 2.1, t: '⚡ Щиток' }, { id: 'number', f: () => ARCHIVE.p, y: 2.4, t: () => RN.archT },
  { id: 'heat', f: () => RACK.p, y: 2.7, t: '🌀 Сервер' }, { id: 'scan', f: () => SCANNER.p, y: 1.9, t: '📠 Сканер' }, { id: 'stamp', f: () => STAMP.p, y: 1.9, t: '🔏 Печатка' },
  { id: 'tube0', f: () => TUBE[0].p, y: 2.9, t: '📮 Пневмопошта' }, { id: 'tube1', f: () => TUBE[1].p, y: 2.9, t: '📮 Пневмопошта' },
  { id: 'stairs0', f: () => STAIRS.a, y: 2.7, t: () => STAIRS.ic + ' ' + STAIRS.n }, { id: 'stairs1', f: () => STAIRS.b, y: 2.7, t: () => STAIRS.ic + ' ' + STAIRS.n },
  { id: 'exit', f: () => L.exit, y: 2.6, t: '⬇️ Ліфт у хаб', on: () => !ST.on },
  { id: 'cooler', f: () => COOLER.p, y: 2, t: '🚰 Кулер', on: () => ST.on },
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
  CHAIRS = L.chairs; LIFTS = L.lifts; TUBE = L.tube; STAIRS = L.stairs; NAV = L.nav; RN = L.rn; NAMES = L.names;
  ({ START, SEND, PRINTER, STAPLER, COFFEE, VALVE, PANEL, ARCHIVE, RACK, SCANNER, STAMP, BOSS_DESK, CLOCK, COOLER } = L.s);
  nameSteps();
  if (!SIMSIDE) for (const k of VKEYS) V[k] = L.v[k];
}
function begin(d) {
  const Lx = Object.assign({ vi: LAY.length, walls: [], rooms: [], desks: [], obs: [], zwp: [], bpath: [], chairs: [], lifts: [], tube: [], stairs: null, nav: null, s: {}, names: [], racks: [],
    v: { cols: [], boss: null, clock: null, clockK: 1, prLight: null, srvLight: null, fan: null, recep: null, acc: null } }, d);
  LAY.push(Lx); OX = Lx.x; OZ = Lx.z; HX = Lx.hx; HZ = Lx.hz; WALLS = Lx.walls; OBS = Lx.obs;
  return Lx;
}
/* дописати поверх: тверді меблі з опису декору, точки блукання зомбі (лише досяжні), сітка навігації */
function seal(Lx, deco) {
  useVar(Lx.vi);
  Lx.deco = deco;
  const K = makeKit(null);
  if (deco) deco(K, Lx);
  decoCommon(K, Lx); decoExtra(K, Lx);
  Lx.nav = { cell: .5, x0: OX - HX, z0: OZ - HZ, nx: Math.round(2 * HX / .5), nz: Math.round(2 * HZ / .5), block: null };
  useVar(Lx.vi); navBuild();
  // які клітинки досяжні від стійки «ЛОБІ» (у шахти атріуму чи в стіни зомбі не підуть)
  const nx = NAV.nx, reach = new Uint8Array(nx * NAV.nz), [si, sj] = cellOf(START.p.x, START.p.z), q = [si + sj * nx]; reach[q[0]] = 1;
  for (let h = 0; h < q.length; h++) { const c = q[h], ci = c % nx, cj = (c / nx) | 0; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ni = ci + di, nj = cj + dj; if (ni < 0 || nj < 0 || ni >= nx || nj >= NAV.nz) continue; const n = ni + nj * nx; if (reach[n] || NAV.block[n]) continue; reach[n] = 1; q.push(n); } }
  Lx.reach = reach;
  const ok = p => { const [i, j] = cellOf(p.x, p.z); return reach[i + j * nx]; };
  if (!Lx.zwp.length) for (let x = -HX + 2; x <= HX - 2; x += 3) for (let z = -HZ + 2; z <= HZ - 2; z += 3) if (!blocked(OX + x, OZ + z, .6)) Lx.zwp.push(W(x, z));
  Lx.zwp = Lx.zwp.filter(ok);
  useVar(Lx.vi);
  Lx.pk = mkPickups(Lx);
}
/* ---------- Звідки брати «метальне»: ✈️ лотки з папером, 📘 книжкові шафи, 🧻 смітники — по кілька на кожному поверсі ----------
   Місце вибирається само: вільна досяжна точка за 1,7–4,4 м від «якоря» (принтер, кухня, архів, столи…), не на робочих точках,
   предмет стоїть спиною до найближчої стіни/меблів, гравець бере його F поруч. Однаково на сервері й у гравців. */
function mkPickups(Lx) {
  const S = Lx.s, D = Lx.desks, rr = v => Math.round(v * 100) / 100;
  const keyP = [S.START, S.SEND, S.PRINTER, S.STAPLER, S.COFFEE, S.VALVE, S.PANEL, S.ARCHIVE, S.RACK, S.SCANNER, S.STAMP, S.COOLER].filter(Boolean).map(o => o.p)
    .concat(D.map(d => d.p), Lx.tube.map(t => t.p), Lx.stairs ? [Lx.stairs.a, Lx.stairs.b] : [], [Lx.exit], Lx.lifts);
  const out = [];
  const free = (x, z) => Math.abs(x - OX) < HX - 1 && Math.abs(z - OZ) < HZ - 1 && !blocked(x, z, .5) && reachable(x, z) && keyP.every(p => dist2(p.x, p.z, x, z) > 1.5) && out.every(q => dist2(q.x, q.z, x, z) > 3);
  const find = a => { for (const d of [1.7, 2.3, 2.9, 3.6, 4.4]) for (let k = 0; k < 16; k++) { const t = k / 16 * Math.PI * 2 + d, x = a.x + Math.sin(t) * d, z = a.z + Math.cos(t) * d; if (free(x, z)) return { x, z }; } return null; };
  const mid = D[Math.floor(D.length / 2)], last = D[D.length - 1];
  const plan = [['pp', S.PRINTER.p], ['pb', S.COFFEE.p], ['bk', S.ARCHIVE.p], ['pp', D[0] && D[0].p], ['pb', mid && mid.p], ['bk', S.BOSS_DESK], ['pp', S.SCANNER.p], ['pb', S.START.p], ['bk', S.STAMP.p], ['pb', last && last.p]];
  for (const [k, a] of plan) {
    if (!a) continue; const p = find(a); if (!p) continue;
    // спиною до найближчої перешкоди — стоїть під стіною, а не посеред кімнати
    let best = 9, t0 = 0;
    for (let j = 0; j < 4; j++) { const t = j * Math.PI / 2; let d = 0; while (d < 2 && !blocked(p.x + Math.sin(t) * (d + .1), p.z + Math.cos(t) * (d + .1), .05)) d += .1; if (d < best) { best = d; t0 = t; } }
    const sh = best < 2 ? clamp(best - (k === 'bk' ? .22 : .3), 0, 1.2) : 0;
    out.push({ id: out.length, k, x: rr(p.x), z: rr(p.z), o: { x: rr(p.x + Math.sin(t0) * sh), z: rr(p.z + Math.cos(t0) * sh) }, ry: t0 + Math.PI });
  }
  return out;
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
    COOLER: Object.assign(st(4.3, 5.6, 3.3, 5.6, .3), { pc: W(3, 5.6) }),                                    // кулер на ресепшні
  };
  Lx.lifts = [W(-2, 12.9), W(0, 12.9), W(2, 12.9)]; Lx.exit = W(3.9, 12.9);
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
    COOLER: Object.assign(st(21.6, -1.3, 20.5, -1.3, .3), { pc: W(19.6, -1) }),                               // кулер у кімнаті персоналу
  };
  Lx.racks = [[15, 12.9], [18.5, 12.9], [15, 9.4]];
  Lx.lifts = [W(3, 13.1), W(5.5, 13.1), W(8, 13.1)]; Lx.exit = W(10.6, 13.1);
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
  // хол: пост охорони (ЛОБІ), «Інкасація» (Відправка), рослини
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
    COOLER: Object.assign(st(12.6, -5.5, 13.7, -5.5, .3), { pc: W(14.2, -4.8) }),                              // кулер у бариста-барі
  };
  Lx.racks = [[-10, -12.9], [-6.5, -12.9], [-10, -9.6]];
  Lx.lifts = [W(-9, 13), W(-6.5, 13), W(-4, 13)]; Lx.exit = W(-1.6, 13);
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
    K.box(0, .07, z0 + 1.55, 8, .02, 3.1, '#120E26');
    for (let k = 0; k < 7; k++) K.glow(-3.3 + k * 1.1, .085, z0 + .5 + (k % 3) * .9, .5, .01, .25, k % 2 ? '#FFD27A' : '#6BE7FF');
  }
  K.box(0, .07, 0, 8, .02, 2.8, '#BFE6FF');
  for (const x of [-3, -1, 1, 3]) K.box(x, .085, 0, .05, .02, 2.8, '#8E86B0');
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
      roomLbl(txt, n);
      if (y < 2.4 && !ry) for (const sx of [-w / 2 + .15, w / 2 - .15]) K.box(x + sx, y - .4, z - .02, .05, .5, .05, '#4E4A6E');
      return n;
    },
    floorTxt(txt, col, x, z, w) {
      if (!g) return; const c = document.createElement('canvas'); c.width = 512; c.height = 96; const x2 = c.getContext && c.getContext('2d');
      if (x2 && x2.fillText) { x2.font = 'bold 60px sans-serif'; { const mw = x2.measureText ? (x2.measureText(txt) || {}).width : 0; if (mw > 490) x2.font = `bold ${Math.floor(60 * 490 / mw)}px sans-serif`; } x2.textAlign = 'center'; x2.textBaseline = 'middle'; x2.lineWidth = 10; x2.strokeStyle = 'rgba(46,35,70,.55)'; x2.strokeText(txt, 256, 50); x2.fillStyle = col; x2.fillText(txt, 256, 50); }
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 96 / 512), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, opacity: .85, depthWrite: false }));
      m.rotation.x = -Math.PI / 2; m.position.set(OX + x, .075, OZ + z); m.renderOrder = 1; scene.add(A.dynamic(m));
      roomLbl(txt, m);
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
  // 🗳️ ЛОБІ — стійка ресепшну / пост охорони
  { const q = K.st(START, 2.8, .8); K.GB(q, 0, .52, 0, 2.8, 1.04, .8, wood); K.GB(q, 0, 1.07, .1, 3, .06, 1, '#FFFFFF'); K.GB(q, 0, .5, .41, 2.8, .6, .02, acc); K.GB(q, -.6, 1.3, -.2, .7, .42, .05, '#2E2346'); K.GC(q, .8, 1.15, .25, .08, .18, .14, '#FFD27A'); K.ob(START.l.x - Math.sin(K.ang(START)) * .8, START.l.z - Math.cos(K.ang(START)) * .8, .3);
    if (g) { const p = K.fr(START, 0, -.85); V.recep = K.person(p.x, p.z, K.ang(START), '#F0D2B6', bank ? '#2E2346' : '#FF8AD8'); K.dyn(neonSign('🗳️ ЛОБІ', '#7FE08A', 1.5, .4), START, 0, 1.55, .45); } }
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

/* маршрут пневмопошти від колби i до іншої: дві прямі під стелею */
function tubePath(i) { const a = TUBE[i].o, b = TUBE[1 - i].o; return [a, { x: b.x, z: a.z }, b]; }
function alongPath(pts, s) {
  const seg = []; let tot = 0; for (let k = 0; k < pts.length - 1; k++) { const l = dist2(pts[k].x, pts[k].z, pts[k + 1].x, pts[k + 1].z); seg.push(l); tot += l; }
  let d = clamp(s, 0, 1) * tot; for (let k = 0; k < seg.length; k++) { if (d <= seg[k] || k === seg.length - 1) { const t = seg[k] ? clamp(d / seg[k], 0, 1) : 0; return { x: lerp(pts[k].x, pts[k + 1].x, t), z: lerp(pts[k].z, pts[k + 1].z, t), a: Math.atan2(pts[k + 1].z - pts[k].z, pts[k + 1].x - pts[k].x) }; } d -= seg[k]; }
  return { x: pts[0].x, z: pts[0].z, a: 0 };
}
/* ---------- Спільне для всіх поверхів: ліфти холу, пневмопошта, пожежні сходи/гірка ---------- */
function decoCommon(K, Lx) {
  const g = K.g;
  for (const T of TUBE) K.ob(T.l.x, T.l.z, .35);
  if (!g) return;
  // ліфти холу — просто декор (голосування тепер у вікні лобі)
  const lift = (x, txt, col) => {
    const z = HZ - .2; K.box(x, .65, z, 1.9, 1.3, .12, '#C9CDD9'); K.box(x - .45, .62, z - .07, .86, 1.2, .03, '#9F98B8'); K.box(x + .45, .62, z - .07, .86, 1.2, .03, '#9F98B8');
    K.glow(x, 1.4, z - .08, .5, .14, .02, col); K.sign(txt, col, x, z - .2, 1.9, 1.75);
  };
  LIFTS.forEach((p, k) => lift(p.x - OX, k === 1 ? '🛗 ЛІФТИ' : '🛗', '#BFE6FF'));
  lift(Lx.exit.x - OX, '⬇️ ХАБ', '#FFFFFF');
  // пневмопошта: дві колби й труба під стелею між ними
  const pipe = mat('#BFE6FF', { transparent: true, opacity: .45, depthWrite: false });
  for (const T of TUBE) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(.2, .2, 2.4, 10), pipe); m.position.set(T.o.x, 1.3, T.o.z); g.add(m);
    K.box(T.l.x, .45, T.l.z, .6, .9, .5, '#4E4A6E'); K.glow(T.l.x, .95, T.l.z, .4, .08, .45, '#FFB35C');
  }
  // труба йде під стелею вздовж стін «літерою Г»
  const tp = tubePath(0), cu = mat('#E0A060');
  for (let k = 0; k < tp.length - 1; k++) {
    const a = tp[k], b = tp[k + 1], len = dist2(a.x, a.z, b.x, b.z) + .25; if (len < .3) continue;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(.1, .1, len, 8), cu); m.position.set((a.x + b.x) / 2, 2.5, (a.z + b.z) / 2); m.rotation.z = Math.PI / 2; m.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x); g.add(m);
  }
  for (const T of TUBE) put(g, mesh(flat(new THREE.CylinderGeometry(.1, .1, .1, 8)), '#E0A060', false), T.o.x, 2.5, T.o.z);
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
const ST = { on: false, t: 0, dur: 420, lv: 0, steps: [], si: 0, need: 3, fed: 0, desk: [], held: {}, floor: [], zom: [], boss: { x: BPATH[0].x, z: BPATH[0].z, f: 0, i: 0, dir: 1, wait: 6, at: 'desk' },
  coffee: 0, jam: 0, pw: 1, heat: 0, cm: 1, rain: 0, fixes: 0, vi: 0, vo: [0, 0, 0], nx: 0, rhp: 100, fly: null, tb: [], xl: null, rid: 0, pf: 1, lp: [], bt: [], cd: -1, fo: 0, fw: -1, lj: '' };
const AU = { chaosT: 25, jamP: .45, boomP: .3, jammed: 0, boomed: 0, pwT: 0, rainT: 0, dropT: 0, idle: 0, stT: 0, fid: 0, zid: 0, wins: 0, away: {}, votes: {}, ready: {}, won: 0, vsig: '', excel: 1, fillT: 0, fullT: 0, bi: 0, botAI: 1 };
/* лобі заповнюється до 5 учасників: люди (у пріоритеті) + 🤖 боти, що приходять по одному */
const TEAM = 5, LEFT_OUT = 25;                                                   // онлайн: хто не готовий 25 с після заповнення — стартуємо без нього
const BOTN = ['Кент', 'Віта', 'Толік', 'Оксана', 'Стас', 'Люда', 'Гена', 'Ірина', 'Петро', 'Зоя'];
const fastLobby = () => !SIMSIDE && typeof window !== 'undefined' && !!window.__deadlineFastLobby;   // тестовий гачок: кроки по 0,2 с
const FILL1 = () => fastLobby() ? .2 : 4, FILLN = () => fastLobby() ? .2 : 2.5, CDN = () => fastLobby() ? .4 : 3;
const TUBE_T = 2.6;
const DUR = 420, T0 = 17 * 3600 + 53 * 60;                                   // раунд 7 хв: з 17:53:00 до 18:00
const myKey = () => (NET.on && typeof WORLD !== 'undefined' && WORLD.on ? myName() : 'me');
const keyOf = from => SIMSIDE ? String(from && from.name || '') : 'me';
const r2 = v => Math.round(v * 100) / 100;
const cur = () => ST.steps[ST.si] || '';
const heldOf = k => ST.held[k] || { it: '', n: 0, cup: 0 };
const myHeld = () => heldOf(myKey());
function setHeld(k, it, n, cup) { if (!it && !cup) delete ST.held[k]; else ST.held[k] = { it: it || '', n: it ? Math.max(1, n | 0) : 0, cup: clamp(cup | 0, 0, 3) }; }   // cup: 0 — нема, 1 ☕ еспресо · 2 🥛 лате · 3 🧋 раф
function snap() {
  const F = ST.fly;
  return { on: ST.on ? 1 : 0, t: r2(ST.t), dur: ST.dur, lv: ST.lv, st: ST.steps, si: ST.si, nd: ST.need, fd: ST.fed, dk: ST.desk, vi: ST.vi, vo: ST.vo, nx: ST.nx, rh: Math.round(ST.rhp), rid: ST.rid, pf: ST.pf, lp: ST.lp, cd: ST.cd < 0 ? -1 : r2(ST.cd), fw: ST.fw < 0 ? -1 : Math.ceil(ST.fw), fo: ST.fo, lj: ST.lj, bt: ST.bt.map(b => [b.n, r2(b.x), r2(b.z), r2(b.f), b.it, b.ic || '', b.c | 0, b.mv ? 1 : 0]),
    h: Object.entries(ST.held).map(([k, v]) => [k, v.it, v.n, v.cup]), f: ST.floor.map(f => [f.id, f.it, f.n, r2(f.x), r2(f.z)]),
    z: ST.zom.map(z => [z.id, r2(z.x), r2(z.z), r2(z.f), z.stun > 0 ? 1 : 0, z.carry ? z.carry.it : '', z.carry ? z.carry.n : 0]),
    fl: F ? [F.id, r2(F.x0), r2(F.z0), r2(F.x1), r2(F.z1), r2(F.T), r2(F.t), F.by] : 0, tb: ST.tb.map(c => [c.id, c.it, c.to, r2(c.t)]), xl: ST.xl ? [ST.xl.i, r2(ST.xl.t)] : 0,
    b: [r2(ST.boss.x), r2(ST.boss.z), r2(ST.boss.f), ST.boss.at], cf: ST.coffee, jm: ST.jam, pw: ST.pw, ht: ST.heat, cm: ST.cm, rn: ST.rain, fx: ST.fixes, ...snap3() };
}
function applySnap(d) {
  const vi = clamp(d.vi | 0, 0, LAY.length - 1);
  if (vi !== ST.vi || L !== LAY[vi]) { ST.vi = vi; useVar(vi); }
  Object.assign(ST, { on: !!d.on, t: +d.t || 0, dur: +d.dur || 420, lv: d.lv | 0, si: d.si | 0, need: d.nd | 0, fed: d.fd | 0, coffee: d.cf ? 1 : 0, jam: d.jm ? 1 : 0, pw: d.pw ? 1 : 0, heat: d.ht ? 1 : 0, cm: d.cm ? 1 : 0, rain: d.rn ? 1 : 0, fixes: d.fx | 0,
    nx: clamp(d.nx | 0, 0, LAY.length - 1), rhp: d.rh == null ? 100 : clamp(+d.rh, 0, 100), rid: d.rid | 0, pf: d.pf ? 1 : 0 });
  if (Array.isArray(d.vo)) ST.vo = [0, 1, 2].map(i => d.vo[i] | 0);
  if (Array.isArray(d.lp)) ST.lp = d.lp.slice(0, 16).filter(Array.isArray).map(a => [String(a[0]), a[1] ? 1 : 0, a[2] >= 0 && a[2] < LAY.length ? a[2] | 0 : -1]);
  ST.cd = d.cd == null || d.cd < 0 ? -1 : +d.cd; ST.fw = d.fw == null || d.fw < 0 ? -1 : +d.fw; ST.fo = d.fo ? 1 : 0; ST.lj = String(d.lj || '');
  if (Array.isArray(d.bt)) { const old = new Map(ST.bt.map(b => [b.n, b])); ST.bt = d.bt.slice(0, TEAM).map(a => { const b = old.get(String(a[0])) || { n: String(a[0]), x: +a[1], z: +a[2] }; return Object.assign(b, { tx: +a[1], tz: +a[2], f: +a[3], it: a[4] === 'sheets' ? 'sheets' : '', ic: String(a[5] || ''), c: a[6] | 0, mv: a[7] ? 1 : 0 }); }); }
  if (Array.isArray(d.st)) ST.steps = d.st.filter(s => STEPS[s]).slice(0, 10);
  if (Array.isArray(d.dk)) ST.desk = DESKS.map((_, i) => d.dk[i] ? 1 : 0);
  if (Array.isArray(d.h)) { ST.held = {}; for (const a of d.h.slice(0, 16)) if (a && (ITEM[a[1]] || a[3])) ST.held[String(a[0])] = { it: ITEM[a[1]] ? a[1] : '', n: a[2] | 0, cup: clamp(a[3] | 0, 0, 3) }; }
  if (Array.isArray(d.f)) ST.floor = d.f.slice(0, 20).filter(a => ITEM[a[1]]).map(a => ({ id: a[0], it: a[1], n: a[2] | 0, x: +a[3], z: +a[4] }));
  if (Array.isArray(d.z)) {
    const old = new Map(ST.zom.map(z => [z.id, z]));
    ST.zom = d.z.slice(0, 12).map(a => { const z = old.get(a[0]) || { id: a[0], x: +a[1], z: +a[2] }; return Object.assign(z, { tx: +a[1], tz: +a[2], f: +a[3], stun: a[4] ? 1 : 0, carry: ITEM[a[5]] ? { it: a[5], n: a[6] | 0 } : null }); });
  }
  if (Array.isArray(d.fl)) { const a = d.fl, o = ST.fly && ST.fly.id === a[0] ? ST.fly : {}; ST.fly = Object.assign(o, { id: a[0], x0: +a[1], z0: +a[2], x1: +a[3], z1: +a[4], T: Math.max(.2, +a[5]), t: Math.max(o.t || 0, +a[6]), by: String(a[7] || '') }); } else ST.fly = null;
  if (Array.isArray(d.tb)) ST.tb = d.tb.slice(0, 6).filter(a => ITEM[a[1]]).map(a => ({ id: a[0], it: a[1], to: a[2] ? 1 : 0, t: +a[3] }));
  ST.xl = Array.isArray(d.xl) && DESKS[d.xl[0] | 0] ? { i: d.xl[0] | 0, t: +d.xl[1] } : null;
  if (Array.isArray(d.b)) Object.assign(ST.boss, { tx: +d.b[0], tz: +d.b[1], f: +d.b[2], at: String(d.b[3] || '') });
  applySnap3(d);
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
/* лобі: голоси за поверх і «Я готовий» — з вікна лобі (рахує сервер світу або сам гравець) */
function countVotes() {
  const c = crew(), cnt = [0, 0, 0];
  for (const k in AU.votes) if (!SIMSIDE || c.some(p => p.name === k)) cnt[AU.votes[k]]++;
  ST.vo = cnt; ST.nx = pickVar();
  ST.lp = c.map(p => [p.name, AU.ready[p.name] ? 1 : 0, AU.votes[p.name] != null ? AU.votes[p.name] : -1]);
}
// найбільше голосів; нічия — жереб при старті (у прев'ю — поточний поверх або перший з рівних); без голосів — ротація
function pickVar(roll) {
  const cnt = ST.vo, best = Math.max(...cnt);
  if (best > 0) { const tied = [0, 1, 2].filter(i => cnt[i] === best); return roll ? pick(tied) : tied.includes(ST.vi) ? ST.vi : tied[0]; }
  return AU.won ? (ST.vi + 1) % LAY.length : ST.vi;      // ніхто не голосував: після перемоги ліфт везе вище, інакше — той самий поверх
}
/* лобі: після першого «Я готовий» боти доповнюють команду до 5; старт — коли всі 5 на місці й усі люди готові (відлік 3…2…1) */
function botSpot(i) { const a = (i + .5) / TEAM * Math.PI * 2; return freeSpot(START.p.x + Math.sin(a) * 1.7, START.p.z + 1.2 + Math.cos(a) * 1.1); }
function addBot() {
  const used = new Set(ST.bt.map(b => b.n)), free = BOTN.filter(n => !used.has(n)), n = pick(free.length ? free : BOTN), p = botSpot(ST.bt.length);
  ST.bt.push({ n, x: p.x, z: p.z, f: Math.PI, c: AU.bi++ % 5, it: '', ic: '', job: '', jt: 0, wt: 0, cd: 0, wp: 0, mv: 0 });
  ST.lj = n; emit({ k: 'botj', n, cnt: crew().length + ST.bt.length }); pushState();
}
function lobbyCheck(dt) {
  if (ST.on) return;
  const c = crew(), H = c.length, rd = c.filter(p => AU.ready[p.name]).length;
  if (!H) { if (ST.bt.length || ST.fo) { ST.bt = []; ST.fo = 0; ST.lj = ''; } ST.cd = ST.fw = -1; AU.fullT = 0; return; }
  if (!ST.fo && rd) { ST.fo = 1; AU.fillT = FILL1(); }
  if (!ST.fo) { ST.cd = ST.fw = -1; return; }
  // людям — пріоритет: прийшов гравець, а місць нема — бот поступається
  while (H + ST.bt.length > TEAM && ST.bt.length) { const b = ST.bt.pop(); emit({ k: 'botl', n: b.n }); }
  if (H + ST.bt.length < TEAM) { AU.fullT = 0; if ((AU.fillT -= dt) <= 0) { addBot(); AU.fillT = FILLN(); } }
  else AU.fullT += dt;
  const N = H + ST.bt.length, full = N >= TEAM, all = rd === H;
  ST.fw = full && !all && SIMSIDE ? Math.max(0, LEFT_OUT - AU.fullT) : -1;
  if (!(full && N >= 2 && rd && (all || (SIMSIDE && AU.fullT >= LEFT_OUT)))) { ST.cd = -1; return; }
  if (ST.cd < 0) { ST.cd = CDN(); pushState(); }
  if ((ST.cd -= dt) <= 0) { ST.cd = -1; startRound(); }
}
function switchVar(v) {
  ST.vi = v; useVar(v);
  Object.assign(ST, { zom: [], floor: [], held: {}, fly: null, tb: [], xl: null });
  Object.assign(ST.boss, { x: BPATH[0].x, z: BPATH[0].z, i: 0, dir: 1, wait: 8, at: 'desk' });
  emit({ k: 'go', v });
}
function onReq(d, from) {
  const k = keyOf(from), who = SIMSIDE ? escapeHTML(k) : 'Ти', h = heldOf(k);
  // 🪑 крісло на коліщатках: ядро сервера обрізає координати тіл до ±500, а наші поверхи далі — тож позицію крісла пересилаємо самі
  if (d.k === 'chairpos') { const i = d.i | 0, x = +d.x, z = +d.z; if (isFinite(x) && isFinite(z) && floorOf(x, z) >= 0) emit({ k: 'chairpos', who: k, i, x: r2(x), z: r2(z), f: r2(+d.f || 0) }); return; }
  if (d.k === 'ready') { if (!ST.on) { if (d.on) AU.ready[k] = 1; else delete AU.ready[k]; countVotes(); emit({ k: 'ready', who: k, on: d.on ? 1 : 0 }); lobbyCheck(0); if (!ST.on) pushState(); } return; }
  if (d.k === 'vote') { const v = d.v | 0; if (!ST.on && v >= 0 && v < LAY.length && AU.votes[k] !== v) { AU.votes[k] = v; countVotes(); emit({ k: 'voted', who: k, v }); pushState(); } return; }
  if (d.k === 'drop') { if (h.it) { const p = posOf(k); toFloor(h.it, h.n, p.x, p.z); } setHeld(k, '', 0, 0); pushState(); return; }
  if (!ST.on) return;
  if (onReq3(d, k, h, who)) return;
  if (d.k === 'take') {
    const i = d.i | 0; if (!ST.desk[i] || (h.it && h.it !== 'sheets') || pestOf(i)) return;
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
    if ((!AU.jammed || (ST.av && Math.random() < .5)) && Math.random() < AU.jamP) { AU.jammed = 1; chaos('jam'); pushState(); return; }
    ST.rhp = 100; setHeld(k, 'report', 1, h.cup); advance(k); pushState();
  }
  else if (d.k === 'pick') {
    const i = ST.floor.findIndex(f => f.id === d.id); if (i < 0) return;
    const f = ST.floor[i]; if (h.it && !(h.it === 'sheets' && f.it === 'sheets')) return;
    ST.floor.splice(i, 1); setHeld(k, f.it, (h.it ? h.n : 0) + f.n, h.cup); emit({ k: 'pick', it: f.it, who: k }); pushState();
  }
  else if (d.k === 'brew') {
    if (!ST.cm) return;
    if (h.cup) { setHeld(k, h.it, h.n, h.cup % 3 + 1); emit({ k: 'brewed', who: k, c: h.cup % 3 + 1, re: 1 }); pushState(); return; }   // 🔄 перелити в інший напій
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
    if (w === 'scan' && (ST.heat || !ST.pw || ST.fire > 0)) return;
    advance(k); pushState();
  }
  else if (d.k === 'fix') {
    const w = String(d.w || ''); let ok = 0;
    if (w === 'jam' && ST.jam) { ST.jam = 0; ok = 1; } else if (w === 'cm' && !ST.cm) { ST.cm = 1; ok = 1; } else if (w === 'heat' && ST.heat) { ST.heat = 0; ok = 1; }
    else if (w === 'power' && !ST.pw) { ST.pw = 1; ok = 1; } else if (w === 'rain' && ST.rain) { ST.rain = 0; ok = 1; } else if (w === 'excel' && ST.xl) { ST.xl = null; ok = 1; }
    if (ok) { ST.fixes++; stat(k, 't'); emit({ k: 'fixed', w, who: k }); pushState(); }
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
    // 📑 «гаряча картопля»: звіт летить дугою над перегородками туди, куди цілився
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
  const done = cur(); ST.si++; stat(k, 't');
  emit({ k: 'step', done, next: cur(), who: k });
}
function startRound() {
  countVotes(); const v = pickVar(true); if (v !== ST.vi || L !== LAY[v]) switchVar(v);
  const lv = SIMSIDE ? AU.wins : (A.data().wins | 0);
  const need = Math.min(5, 3 + lv), subs = shuffle(SUBS.slice()).slice(0, lv >= 3 ? 4 : 3);
  const desks = shuffle(DESKS.map(d => d.i)).slice(0, need);
  Object.assign(ST, { on: true, t: 0, dur: DUR, lv, steps: ['data', 'print', ...subs, 'send'], si: 0, need, fed: 0, desk: DESKS.map(d => desks.includes(d.i) ? 1 : 0), held: {}, floor: [], zom: [],
    coffee: 0, jam: 0, pw: 1, heat: 0, cm: 1, rain: 0, fixes: 0, rhp: 100, fly: null, tb: [], xl: null, pf: 1, rid: ST.rid + 1, vo: [0, 0, 0] });
  Object.assign(ST.boss, { x: BPATH[0].x, z: BPATH[0].z, i: 0, dir: 1, wait: 8, at: 'desk' });
  for (let i = 0; i < Math.min(5, 2 + lv); i++) spawnZombie();
  start3();
  Object.assign(AU, { chaosT: rand(30, 42), jammed: 0, boomed: 0, pwT: 0, rainT: 0, dropT: 0, idle: 0, away: {}, votes: {}, ready: {}, fullT: 0, won: 0 }); ST.lp = []; Object.assign(ST, { cd: -1, fw: -1, fo: 0, lj: '' });
  ST.bt.forEach((b, i) => { const p = botSpot(i); Object.assign(b, { x: p.x, z: p.z, it: '', ic: '', job: '', jt: 0, wt: 0, cd: 2 + i * .7, path: null, mv: 0 }); });   // боти з лобі — у команді раунду
  emit({ k: 'msg', big: 1, txt: `⏰ 17:53 · ${L.n}! Квартальний звіт — до 18:00!` });
  pushState();
}
function endRound(win, why, by) {
  if (!ST.on) return;
  ST.on = false;
  const res = Object.assign({ k: 'end', win: win ? 1 : 0, left: r2(Math.max(0, ST.dur - ST.t)), fx: ST.fixes, done: ST.si, tot: ST.steps.length, why: why || '', by: by || '', pf: win && ST.pf ? 1 : 0, v: ST.vi }, end3(win));
  if (win && SIMSIDE) AU.wins++;
  AU.won = win ? 1 : 0;
  for (const z of ST.zom) z.carry = null;
  Object.assign(ST, { held: {}, floor: [], jam: 0, pw: 1, heat: 0, cm: 1, rain: 0, fly: null, tb: [], xl: null, rhp: 100 });
  ST.zom.splice(2); AU.ready = {}; AU.fullT = 0; Object.assign(ST, { bt: [], cd: -1, fw: -1, fo: 0, lj: '' }); countVotes();   // боти пішли додому — нове лобі заповниться заново
  emit(res); pushState();
}
function chaos(w) {
  if (w === 'jam') { if (ST.jam) return; ST.jam = 1; }
  else if (w === 'boom') { if (!ST.cm) return; ST.cm = 0; }
  else if (w === 'power') { if (!ST.pw) return; ST.pw = 0; AU.pwT = 90; AU.pwH = {}; }   // ⚡ щиток сам не увімкнеться (90 с — аварійний генератор)
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
  const s = Math.min(d, 1.5 * (ST.av ? 1.9 : 1) * dt);   // 🔥 аврал — начальник бігає B.x += (t.x - B.x) / d * s; B.z += (t.z - B.z) / d * s; B.f = Math.atan2(t.x - B.x, t.z - B.z);
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
  if (Math.abs(nx - z.x) > 1e-3 && !blocked(nx, z.z, .3)) { z.x = nx; return ''; }   // ковзання вздовж стіни (лише якщо справді зрушив)
  if (Math.abs(nz - z.z) > 1e-3 && !blocked(z.x, nz, .3)) { z.z = nz; return ''; }
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
    spd *= slowAt(z.x, z.z);                                                       // калюжа біля кулера
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
/* ---------- 🤖 Боти в раунді: носять дані в принтер, лагодять поломки, гасять серверну, проганяють зомбі від людей ---------- */
const BOT_SPD = 2.5, BOTFIX = { power: 3, jam: 3.5, cm: 4, heat: 4, rain: 3, excel: 3.5 };
const botWho = b => '🤖 ' + b.n;
function botJob(b, c) {
  const taken = j => ST.bt.some(o => o !== b && o.job === j), d2 = p => dist2(b.x, b.z, p.x, p.z);
  if (b.it === 'sheets') return { j: 'feed', p: PRINTER.p, ic: '📄' };
  const fx = [[ST.fire > 0, 'fire', RACK.p, '🧯'], [!ST.pw, 'power', PANEL.p, '🔧'], [ST.jam, 'jam', PRINTER.p, '🔧'], [!ST.cm, 'cm', COFFEE.p, '🔧'], [ST.heat, 'heat', RACK.p, '🔧'], [ST.rain, 'rain', VALVE.p, '🔧'], [!!ST.xl, 'excel', ST.xl && DESKS[ST.xl.i] ? DESKS[ST.xl.i].p : null, '📊']];
  for (const [on, j, p, ic] of fx) if (on && p && !taken(j)) return { j, p, ic };
  if (cur() === 'data' && ST.t > 15) {   // перші 15 с дані збирають люди — боти «розігріваються»
    const d = DESKS.filter(q => ST.desk[q.i] && !pestOf(q.i) && !taken('desk' + q.i)).sort((a, e) => d2(a.p) - d2(e.p))[0];
    if (d) return { j: 'desk' + d.i, p: d.p, i: d.i, ic: '📄' };
  }
  const z = ST.zom.filter(q => q.stun <= 0 && !(q.carry && q.carry.it === 'report') && c.some(p => dist2(p.x, p.z, q.x, q.z) < 5) && !taken('zom' + q.id)).sort((a, e) => d2(a) - d2(e))[0];
  if (z) return { j: 'zom' + z.id, p: z, z, ic: '🗣️' };
  return { j: 'walk', p: null, ic: '' };
}
function updBots(dt, c) {
  for (const b of ST.bt) {
    b.mv = 0;
    if (b.cd > 0) { b.cd -= dt; continue; }
    if (!b.J || ((b.jt -= dt) <= 0 && b.wt <= 0)) { b.J = botJob(b, c); b.job = b.J.j; b.jt = 1; b.ic = b.J.ic; }
    const J = b.J, j = J.j;
    let tg = J.p;
    if (!tg) { if (!ZWP[b.wp] || dist2(b.x, b.z, ZWP[b.wp].x, ZWP[b.wp].z) < .6) { const h = c.length ? pick(c) : START.p, near = ZWP.filter(q => dist2(q.x, q.z, h.x, h.z) < 8); b.wp = ZWP.indexOf(pick(near.length ? near : ZWP)); } tg = ZWP[b.wp] || START.p; }
    const reach = j === 'fire' ? fireR() + 1 : j.startsWith('zom') ? 1.1 : j === 'walk' ? .5 : .9;
    if (dist2(b.x, b.z, tg.x, tg.z) > reach) { b.wt = 0; const r = zMove(b, tg.x, tg.z, BOT_SPD * slowAt(b.x, b.z), dt); b.mv = 1; if (j === 'walk' && (r === 'stuck' || r === 'here')) b.wp = -1; continue; }
    b.wt += dt; if (J.p) b.f = Math.atan2(tg.x - b.x, tg.z - b.z);
    if (j === 'fire') {
      if (b.wt < 1.2) continue; b.wt = 0; ST.fire = Math.max(0, ST.fire - 22);
      emit({ k: 'botfoam', n: b.n, x: r2(b.x), z: r2(b.z), a: r2(b.f) });
      if (ST.fire <= 0) { ST.fixes++; emit({ k: 'fixed', w: 'fire', who: botWho(b) }); b.J = null; }
      pushState(); continue;
    }
    if (BOTFIX[j]) {
      if (b.wt < BOTFIX[j]) continue; b.wt = 0; b.J = null; let ok = 0;
      if (j === 'jam' && ST.jam) { ST.jam = 0; ok = 1; } else if (j === 'cm' && !ST.cm) { ST.cm = 1; ok = 1; } else if (j === 'heat' && ST.heat) { ST.heat = 0; ok = 1; }
      else if (j === 'power' && !ST.pw) { ST.pw = 1; ok = 1; } else if (j === 'rain' && ST.rain) { ST.rain = 0; ok = 1; } else if (j === 'excel' && ST.xl) { ST.xl = null; ok = 1; }
      if (ok) { ST.fixes++; emit({ k: 'fixed', w: j, who: botWho(b) }); pushState(); }
      continue;
    }
    if (j.startsWith('desk')) {
      if (b.wt < .8) continue; b.wt = 0; b.J = null;
      if (ST.desk[J.i] && !pestOf(J.i)) { ST.desk[J.i] = 0; b.it = 'sheets'; emit({ k: 'take', i: J.i, who: botWho(b) }); pushState(); }
      continue;
    }
    if (j === 'feed') {
      if (b.wt < .5) continue; b.wt = 0; b.J = null; b.it = '';
      ST.fed++; emit({ k: 'msg', txt: `📥 ${botWho(b)} поклав дані в принтер: ${Math.min(ST.fed, ST.need)}/${ST.need}` });
      if (cur() === 'data' && ST.fed >= ST.need) advance(botWho(b));
      pushState(); continue;
    }
    if (J.z) {
      const z = J.z; b.J = null; if (z.stun > 0 || !ST.zom.includes(z)) continue;
      z.stun = 5; z.cd = 3; if (z.carry) { toFloor(z.carry.it, z.carry.n, z.x, z.z); z.carry = null; }
      emit({ k: 'shoo', id: z.id, x: r2(z.x), z: r2(z.z), who: botWho(b) }); pushState(); continue;
    }
    if (b.wt > 1.5) { b.wt = 0; b.J = null; }
  }
}
function authTick(dt) {
  const c = crew();
  if (!ST.on && !ST.zom.length) { spawnZombie(); spawnZombie(); }
  if ((c.length || ST.on) && !ST.mt) { updBoss(dt, c); updZombies(dt, c); }
  if (!ST.on) {
    // лобі: голоси, «готові», таймер старту
    countVotes(); lobbyCheck(dt); if (ST.on) return;
    const sig = ST.vo.join() + ST.nx + JSON.stringify(ST.lp) + ST.bt.map(b => b.n).join() + ST.fo + (ST.cd < 0 ? -1 : Math.ceil(ST.cd * 5)) + (ST.fw < 0 ? -1 : Math.ceil(ST.fw)); if (sig !== AU.vsig) { AU.vsig = sig; pushState(); }
    if (SIMSIDE && c.length && (AU.stT -= dt) <= 0) { AU.stT = .3; pushState(); } return;
  }
  ST.t += dt;
  if (!c.length) { AU.idle += dt; if (AU.idle > (SIMSIDE ? 10 : 3)) endRound(false, 'На поверсі нікого не лишилось.'); return; }
  AU.idle = 0;
  if (auth3(dt, c)) { AU.stT -= dt; if (AU.stT <= 0) { AU.stT = .2; pushState(); } return; }   // 🚨 нарада: усе завмерло, годинник іде
  if (AU.botAI) updBots(dt, c);
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
    AU.chaosT = rand(28, 45) * Math.max(.55, 1 - ST.lv * .12) * (ST.av ? .5 : 1);
    const s = cur(), pool = ['power', 'rain', 'meeting', 'boom', 'heat', 'jam'];
    if (ST.av) pool.push('jam', 'jam', 'meeting');
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
    for (const b of ST.bt) if (b.tx != null) { b.x = lerp(b.x, b.tx, k); b.z = lerp(b.z, b.tz, k); }
  }
  if (!SIMSIDE) clientTick(dt);
});

/* ======================= v3: саботажник, літачки й агресія колег, кулер-пастка, Румба, вогнегасник, молотов =======================
   Усе рахує автор раунду (сервер світу або сам гравець), гравцям — знімок і події. */
const CUPS = [null, { ic: '☕', n: 'еспресо' }, { ic: '🥛', n: 'лате' }, { ic: '🧋', n: 'раф' }];
const AGR = { plane: 40, ball: 20, book: 35, foam: 25, burn: 35, pest: 7, decay: 1.2 };              // скільки агресії дає кожна образа (шкала 0…100)
const MAXPEST = 4, SAB_CD = 18, MEET_T = 20, PP_N = 2, PB_N = 3, MOL_N = 2, BIN_CAP = 8;
const SABW = { fire: '🔥 підпал серверної', jam: '🖨️ зажований принтер', boom: '☕ зламана кавоварка', power: '⚡ вимкнений щиток', rain: '🚿 відкриті спринклери', steal: '📄 переховані дані', litter: '🗑️ розкидане сміття', mine: '🤖 замінована Румба' };
Object.assign(ST, { ag: [], pst: [], fire: 0, pud: null, rb: null, lit: [], pp: [], mo: [], th: [], burn: [], mt: null, sbC: 0, sk: '', sh: null, clr: [] });
Object.assign(AU, { sab: '', salt: '', sbT: 40, sbcd: {}, mc: {}, mtCd: 0, spamT: 0, fireMax: 0, pcP: .35, sabP2: .25 });
const hashS = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0; return h.toString(36); };
const pestOf = i => ST.pst.find(q => q.i === i);
const colPos = i => ({ x: DESKS[i].x, z: DESKS[i].z + .72 });
const fireC = () => RACK.p;
const fireR = () => 1.2 + ST.fire / 100 * 2.8;
function dock() {
  if (L.dock) return L.dock;
  const s = START.p, c = ZWP.filter(p => dist2(p.x, p.z, s.x, s.z) > 3).sort((a, b) => dist2(a.x, a.z, s.x, s.z) - dist2(b.x, b.z, s.x, s.z))[0] || ZWP[0];
  return (L.dock = { x: c.x, z: c.z });
}
// тільки стіни (літачок летить над столами); поручні атріуму — низькі
function wallHit(x, z) {
  if (Math.abs(x - OX) > HX - .2 || Math.abs(z - OZ) > HZ - .2) return true;
  for (const s of WALLS) if (s[4] !== 'r' && segD(x, z, s) < .2) return true;
  return false;
}
// відкинути зомбі / «зайобуючого» в напрямку a (не крізь стіни)
function shove(o, a, d) { for (let s = 0; s < d; s += .25) { const nx = o.x + Math.sin(a) * .25, nz = o.z + Math.cos(a) * .25; if (blocked(nx, nz, .3)) break; o.x = nx; o.z = nz; } o.path = null; }
// калюжа: зомбі ковзають повільніше
function slowAt(x, z) { const P = ST.pud; return P && dist2(x, z, P.x, P.z) < P.r ? .45 : 1; }
function addLit(x, z) { if (ST.lit.length >= 24) ST.lit.shift(); const p = freeSpot(x, z); ST.lit.push({ id: ++AU.fid, x: r2(p.x), z: r2(p.z) }); }
const coneHit = (p, a, x, z, len, w) => { const dd = dist2(p.x, p.z, x, z); if (dd > len) return false; if (dd < .9) return true; return Math.abs(((Math.atan2(x - p.x, z - p.z) - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < w; };

/* ---------- Початок і кінець раунду ---------- */
function start3() {
  const hum = crew().map(p => p.name);
  let sab = '';
  // онлайн від 3 людей — завжди хтось із гравців; удвох — зрідка; інакше — колега-NPC
  if (SIMSIDE && (hum.length >= 3 || (hum.length === 2 && Math.random() < AU.sabP2))) sab = pick(hum);
  if (!sab && DESKS.length) sab = 'npc:' + pick(DESKS).i;
  Object.assign(AU, { sab, salt: Math.random().toString(36).slice(2, 10), sbT: rand(40, 60), sbcd: {}, mc: {}, mtCd: 0, spamT: 0, fireMax: 0 });
  // хто саботажник — лише хеш із «сіллю»: гравець перевіряє своє ім'я, у знімку імені немає
  Object.assign(ST, { ag: DESKS.map(() => 0), pst: [], fire: 0, pud: null, lit: [], pp: [], mo: [], th: [], burn: [], mt: null, sbC: 0, sk: sab.startsWith('npc:') ? 'n' : 'p', sh: [AU.salt, hashS(AU.salt + sab)], clr: [] });
  const d = dock(); ST.rb = { x: d.x, z: d.z, f: 0, arm: 0, t: 0, dead: 0, wp: 0 };
  start5();
  emit({ k: 'msg', txt: ST.sk === 'p' ? '🕵️ Серед <b>гравців</b> — САБОТАЖНИК! Підозрюєш когось — 🚨 нарада (клавіша 8).' : '🕵️ Серед <b>колег</b> — САБОТАЖНИК! Стеж за підказками свідків і клич 🚨 нараду (клавіша 8).' });
}
function sabName(k) { return !k ? '' : k.startsWith('npc:') ? NAMES[+k.slice(4)] || 'колега' : k; }
function end3(win) {
  const r = Object.assign({ sab: sabName(AU.sab), sk: ST.sk, sc: ST.sbC, sw: !win && !ST.sbC && AU.sab ? 1 : 0 }, end5());
  for (const q of ST.pst) if (q.own) ST.desk[q.i] = 1;
  Object.assign(ST, { ag: DESKS.map(() => 0), pst: [], fire: 0, pud: null, lit: [], pp: [], mo: [], th: [], burn: [], mt: null });
  if (ST.rb) Object.assign(ST.rb, { arm: 0, dead: 0 });
  AU.sab = ''; AU.spamT = 0;
  return r;
}
/* ---------- Знімок для гравців ---------- */
function snap3() {
  const R = ST.rb, M = ST.mt, P = ST.pud;
  return { ag: ST.ag.map(v => Math.round(v)), ps: ST.pst.map(q => [q.id, q.i, r2(q.x), r2(q.z), r2(q.f), q.want, q.stun > 0 ? 1 : 0, q.cn || q.own ? 'sheets' : '', q.own ? 1 : 0]),
    fi: Math.round(ST.fire), pu: P ? [r2(P.x), r2(P.z), r2(P.r), P.el > 0 ? 1 : 0, P.id] : 0,
    rb: R ? [r2(R.x), r2(R.z), r2(R.f), R.arm, R.dead > 0 ? 1 : 0] : 0, li: ST.lit.map(q => [q.id, q.x, q.z]),
    pp: ST.pp.map(q => [q.id, r2(q.x), r2(q.z), r2(q.a), r2(q.y)]), mo: ST.mo.map(q => [q.id, r2(q.x0), r2(q.z0), r2(q.x1), r2(q.z1), r2(q.T), r2(q.t)]), th: ST.th.map(q => [q.id, q.w, q.x0, q.z0, q.x1, q.z1, r2(q.T), r2(q.t)]),
    bu: ST.burn.map(q => [q.id, q.x, q.z, q.r, r2(q.t)]),
    mt: M ? [Math.ceil(M.t), M.c, M.n, M.cnt, M.who, M.skip, M.ph === 'go' ? 1 : 0] : 0, sb: [ST.sbC, ST.sk, ST.clr], sh: ST.on && ST.sh ? ST.sh : 0, ...snap5() };
}
function applySnap3(d) {
  if (Array.isArray(d.ag)) ST.ag = DESKS.map((_, i) => clamp(+d.ag[i] || 0, 0, 100));
  if (Array.isArray(d.ps)) {
    const old = new Map(ST.pst.map(q => [q.id, q]));
    ST.pst = d.ps.slice(0, 8).filter(a => DESKS[a[1] | 0]).map(a => { const q = old.get(a[0]) || { id: a[0], x: +a[2], z: +a[3] }; return Object.assign(q, { i: a[1] | 0, tx: +a[2], tz: +a[3], f: +a[4], want: clamp(a[5] | 0, 1, 3), stun: a[6] ? 1 : 0, carry: a[7] === 'sheets' ? 'sheets' : '', own: a[8] ? 1 : 0 }); });
  }
  ST.fire = clamp(+d.fi || 0, 0, 100);
  ST.pud = Array.isArray(d.pu) ? { x: +d.pu[0], z: +d.pu[1], r: +d.pu[2], el: d.pu[3] ? 1 : 0, id: d.pu[4] | 0 } : null;
  if (Array.isArray(d.rb)) { const R = ST.rb || {}; Object.assign(R, { tx: +d.rb[0], tz: +d.rb[1], f: +d.rb[2], arm: d.rb[3] | 0, dead: d.rb[4] ? 1 : 0 }); if (R.x == null || R.dead) { R.x = R.tx; R.z = R.tz; } ST.rb = R; } else ST.rb = null;
  if (Array.isArray(d.li)) ST.lit = d.li.slice(0, 30).map(a => ({ id: a[0], x: +a[1], z: +a[2] }));
  if (Array.isArray(d.pp)) { const old = new Map(ST.pp.map(q => [q.id, q])); ST.pp = d.pp.slice(0, 12).map(a => Object.assign(old.get(a[0]) || { id: a[0], x: +a[1], z: +a[2] }, { tx: +a[1], tz: +a[2], a: +a[3], y: +a[4] })); }
  if (Array.isArray(d.mo)) ST.mo = d.mo.slice(0, 6).map(a => { const o = ST.mo.find(q => q.id === a[0]) || {}; return Object.assign(o, { id: a[0], x0: +a[1], z0: +a[2], x1: +a[3], z1: +a[4], T: Math.max(.2, +a[5]), t: Math.max(o.t || 0, +a[6]) }); });
  if (Array.isArray(d.th)) ST.th = d.th.slice(0, 10).map(a => { const o = ST.th.find(q => q.id === a[0]) || {}; return Object.assign(o, { id: a[0], w: a[1] === 'bk' ? 'bk' : 'pb', x0: +a[2], z0: +a[3], x1: +a[4], z1: +a[5], T: Math.max(.2, +a[6]), t: Math.max(o.t || 0, +a[7]) }); });
  if (Array.isArray(d.bu)) ST.burn = d.bu.slice(0, 8).map(a => ({ id: a[0], x: +a[1], z: +a[2], r: +a[3], t: +a[4] }));
  ST.mt = Array.isArray(d.mt) ? { t: +d.mt[0], c: (d.mt[1] || []).map(String), n: (d.mt[2] || []).map(String), cnt: (d.mt[3] || []).map(v => v | 0), who: (d.mt[4] || []).map(String), skip: d.mt[5] | 0, ph: d.mt[6] ? 'go' : 'vote', v: {} } : null;
  if (Array.isArray(d.sb)) { ST.sbC = d.sb[0] ? 1 : 0; ST.sk = String(d.sb[1] || ''); ST.clr = Array.isArray(d.sb[2]) ? d.sb[2].map(v => v | 0) : []; }
  ST.sh = Array.isArray(d.sh) ? [String(d.sh[0]), String(d.sh[1])] : null;
  applySnap5(d);
}

/* ---------- Запити гравців (v3) ---------- */
function onReq3(d, k, h, who) {
  const p = posOf(k), nr = (o, r) => dist2(p.x, p.z, o.x, o.z) < r;
  if (d.k === 'mvote') {
    const M = ST.mt, i = d.i | 0; if (!M || M.ph === 'go' || k in M.v || (i !== -1 && !M.c[i])) return true;
    M.v[k] = i; stat(k, 'v'); const vs = Object.values(M.v); M.cnt = M.c.map((_, j) => vs.filter(v => v === j).length); M.who = Object.keys(M.v); M.skip = vs.filter(v => v < 0).length;
    pushState(); return true;
  }
  if (ST.mt) return ['meet', 'sab', 'plane', 'toss', 'molo', 'foam', 'arm', 'kick', 'zap', 'serve', 'clue', 'cam', 'mop', 'box', 'chk'].includes(d.k);   // під час наради — лише голосування
  if (onReq5(d, k, h)) return true;
  if (d.k === 'meet') {
    if (AU.mc[k] || AU.mtCd > 0 || (AU.sab === k && !ST.sbC)) return true;
    AU.mc[k] = 1; startMeeting(k); return true;
  }
  if (d.k === 'plane') {
    // ✈️ паперовий літачок: летить рівно 13 м, над столами, стіни зупиняють
    if (ST.pp.length >= 6) return true; const a = +d.a || 0;
    ST.pp.push({ id: ++AU.fid, x: p.x + Math.sin(a) * .5, z: p.z + Math.cos(a) * .5, a, y: 1.4, d: 0, by: k }); emit({ k: 'plane', who: k }); pushState(); return true;
  }
  if (d.k === 'toss') {
    // 🧻 мʼятий папір / 📘 книжка: дуга до точки (над перегородками); там — смітник, зомбі, колега чи просто підлога
    if (ST.th.length >= 10) return true; const w = d.w === 'bk' ? 'bk' : 'pb', mx = w === 'pb' ? 11 : 9;
    const tx = isFinite(+d.x) ? +d.x : p.x, tz = isFinite(+d.z) ? +d.z : p.z, dd = clamp(dist2(p.x, p.z, tx, tz), .8, mx), a = Math.atan2(tx - p.x, tz - p.z);
    const x1 = clamp(p.x + Math.sin(a) * dd, OX - HX + .5, OX + HX - .5), z1 = clamp(p.z + Math.cos(a) * dd, OZ - HZ + .5, OZ + HZ - .5);
    ST.th.push({ id: ++AU.fid, w, x0: r2(p.x), z0: r2(p.z), x1: r2(x1), z1: r2(z1), T: clamp(dd / 10, .35, 1.1), t: 0, by: k, d: r2(dd) });
    emit({ k: 'toss', w, who: k }); pushState(); return true;
  }
  if (d.k === 'molo') {
    // 🍾 молотов: дуга до точки, там — палаюча калюжа
    if (ST.mo.length >= 3) return true;
    const tx = isFinite(+d.x) ? +d.x : p.x, tz = isFinite(+d.z) ? +d.z : p.z, dd = clamp(dist2(p.x, p.z, tx, tz), 1.5, 10), a = Math.atan2(tx - p.x, tz - p.z);
    const x1 = clamp(p.x + Math.sin(a) * dd, OX - HX + .8, OX + HX - .8), z1 = clamp(p.z + Math.cos(a) * dd, OZ - HZ + .8, OZ + HZ - .8);
    ST.mo.push({ id: ++AU.fid, x0: p.x, z0: p.z, x1, z1, T: clamp(dd / 9, .4, 1.2), t: 0, by: k }); emit({ k: 'molo', who: k }); pushState(); return true;
  }
  if (d.k === 'foam') {
    // 🧯 струмінь піни: гасить серверну й палаючі калюжі, відкидає зомбі та «зайобуючих», колегам — піна в обличчя
    const a = +d.a || 0;
    if (ST.fire > 0) { const C = fireC(); if (nr(C, fireR() + .6) || coneHit(p, a, C.x, C.z, 5.5 + fireR(), .7)) { ST.fire -= 40; if (ST.fire <= 0) { ST.fire = 0; ST.fixes++; stat(k, 'f'); emit({ k: 'fixed', w: 'fire', who: k }); } } }
    for (const z of ST.zom) if (coneHit(p, a, z.x, z.z, 5.5, .55)) { z.stun = Math.max(z.stun, 2.5); z.cd = 3; shove(z, a, 2.5); if (z.carry) { toFloor(z.carry.it, z.carry.n, z.x, z.z); z.carry = null; } }
    for (const q of ST.pst) if (coneHit(p, a, q.x, q.z, 5.5, .55)) { stunPest(q, 2.5); shove(q, a, 2.5); }
    ST.burn = ST.burn.filter(b => !coneHit(p, a, b.x, b.z, 5.5 + b.r, .6));
    for (const dk of DESKS) if (!pestOf(dk.i)) { const cp = colPos(dk.i); if (coneHit(p, a, cp.x, cp.z, 4.5, .4)) anger(dk.i, AGR.foam); }
    emit({ k: 'foam', who: k, x: r2(p.x), z: r2(p.z), a: r2(a) }); pushState(); return true;
  }
  if (d.k === 'kick') { if (nr(COOLER.p, 2.5)) spill(k); return true; }
  if (d.k === 'zap') {
    // ⚡ подовжувач у калюжу: 5 с усіх у ній трусить (зомбі, «зайобуючих», гравців — у них самих)
    const P = ST.pud; if (!P || P.el > 0 || !nr(P, P.r + 2.2)) return true;
    P.el = 5; P.t = Math.max(P.t, 6); P.id = ++AU.fid;
    for (const z of ST.zom) if (dist2(z.x, z.z, P.x, P.z) < P.r) { z.stun = Math.max(z.stun, 4); z.cd = 3; if (z.carry) { toFloor(z.carry.it, z.carry.n, z.x, z.z); z.carry = null; } }
    for (const q of ST.pst) if (dist2(q.x, q.z, P.x, P.z) < P.r) stunPest(q, 4);
    emit({ k: 'zap', who: k, id: P.id }); pushState(); return true;
  }
  if (d.k === 'arm') {
    const R = ST.rb; if (!R || R.dead > 0 || R.arm || !nr(R, 2.2)) return true;
    R.arm = 1; R.t = 25; emit({ k: 'arm', who: k }); pushState(); return true;
  }
  if (d.k === 'serve') {
    // ☕ пригостити «зайобуючого»: та сама кава — заспокоївся; не та — розлив і бурчить
    const q = ST.pst.find(o => o.id === d.id); if (!q || !h.cup || !nr(q, 2.5)) return true;
    const ok = h.cup === q.want; setHeld(k, h.it, h.n, 0);
    if (ok) calmPest(q, k); else { q.cd = 2; emit({ k: 'wrong', id: q.id, i: q.i, who: k, want: q.want, got: h.cup }); }
    pushState(); return true;
  }
  if (d.k === 'sab') {
    // 🕵️ саботаж гравця-саботажника (сервер перевіряє, що це справді він і що він поруч)
    if (k !== AU.sab || ST.sbC || (AU.sbcd[k] || 0) > 0) return true;
    const w = String(d.w || ''), spot = { fire: RACK.p, jam: PRINTER.p, boom: COFFEE.p, power: PANEL.p, rain: VALVE.p, hack: RACK.p }[w];
    if (spot && !nr(spot, 2.5)) return true;
    if ((w === 'burn' || w === 'shred') && !(ST.s5 && ST.s5.doc.some(q => nr(q, 2.6)))) return true;
    if (w === 'steal' && !(DESKS[d.i | 0] && nr(DESKS[d.i | 0].p, 2.5))) return true;
    if (w === 'mine' && !(ST.rb && nr(ST.rb, 2.5))) return true;
    if (!sabDo(w, w === 'steal' ? { i: d.i | 0 } : w === 'litter' ? p : null)) return true;
    AU.sbcd[k] = SAB_CD; const rm = roomAt(p.x, p.z); AU.sp += SABP[w] || 1; stat(k, 's'); clue5(k, w, { x: p.x, z: p.z });
    if (w === 'burn') emit({ k: 'alarm', room: rm ? rm.n : '', x: r2(p.x), z: r2(p.z) });
    emit({ k: 'sabo', w, room: rm ? rm.n : '', hu: 1, q: w === 'shred' ? 1 : 0 }); pushState(); return true;
  }
  return false;
}

/* ---------- 😤 Агресія колег і «зайобуючі» ---------- */
function turnPest(i, why) {
  if (pestOf(i) || !DESKS[i]) return;
  if (ST.pst.length >= MAXPEST) { ST.ag[i] = 95; return; }
  const cp = colPos(i), sp = freeSpot(cp.x, cp.z + .7);
  const q = { id: ++AU.zid, i, x: sp.x, z: sp.z, f: 0, want: 1 + Math.floor(Math.random() * 3), cd: 3, stun: 0, cn: 0, own: 0, wp: Math.floor(Math.random() * ZWP.length) };
  if (ST.desk[i]) { ST.desk[i] = 0; q.own = 1; }                                     // його дані йдуть разом з ним
  ST.pst.push(q); ST.ag[i] = 100;
  emit({ k: 'pest', i, id: q.id, want: q.want, why: why || '' });
}
function anger(i, v) { ST.ag[i] = Math.min(100, (ST.ag[i] || 0) + v); if (ST.ag[i] >= 100) turnPest(i); }
function stunPest(q, t) { q.stun = Math.max(q.stun, t); q.cd = Math.max(q.cd, 2); if (q.cn) { toFloor('sheets', q.cn, q.x, q.z); q.cn = 0; } }
function calmPest(q, by) {
  const n = ST.pst.indexOf(q); if (n < 0) return; ST.pst.splice(n, 1); ST.ag[q.i] = 0;
  if (q.own) ST.desk[q.i] = 1;
  if (q.cn) toFloor('sheets', q.cn, q.x, q.z);
  ST.fixes++; emit({ k: 'calm', i: q.i, id: q.id, who: by, x: r2(q.x), z: r2(q.z), c: q.want });
}
function updPests(dt, c) {
  for (const q of ST.pst) {
    if (q.stun > 0) { q.stun -= dt; continue; }
    q.cd -= dt;
    let tg = null, bd = 7; for (const p of c) { const d = dist2(p.x, p.z, q.x, q.z); if (d < bd) { bd = d; tg = p; } }
    const w = ZWP[q.wp] || ZWP[0], r = zMove(q, tg ? tg.x : w.x, tg ? tg.z : w.z, (tg ? 1.5 : 1.1) * slowAt(q.x, q.z), dt);
    if (r === 'stuck' || (!tg && r === 'here')) q.wp = Math.floor(Math.random() * ZWP.length);
    if (tg && bd < 1.05 && q.cd <= 0) pester(q, tg);
  }
  // ланцюгова реакція: поруч із «зайобуючим» колеги закипають; самі по собі — повільно остигають
  for (let i = 0; i < ST.ag.length; i++) {
    if (pestOf(i)) continue; const cp = colPos(i); let up = 0;
    for (const q of ST.pst) if (q.stun <= 0 && dist2(q.x, q.z, cp.x, cp.z) < 4) up += AGR.pest;
    ST.ag[i] = clamp(ST.ag[i] + (up || -AGR.decay) * dt, 0, 100);
    if (ST.ag[i] >= 100) turnPest(i, 'chain');
  }
}
function pester(q, p) {
  q.cd = 5;
  const h = heldOf(p.name); let w = pick(['talk', 'block', 'trip']), st = '';
  if ((h.it === 'sheets' || h.cup) && Math.random() < .6) {
    w = 'steal';
    if (h.it === 'sheets') { st = 'sheets'; q.cn += h.n; setHeld(p.name, '', 0, h.cup); }
    else { st = 'cup'; const c = h.cup; setHeld(p.name, h.it, h.n, 0); if (c === q.want) { emit({ k: 'pester', to: p.name, w, st, id: q.id, a: 0 }); calmPest(q, p.name); pushState(); return; } }
  }
  emit({ k: 'pester', to: p.name, w, st, id: q.id, i: q.i, a: r2(Math.atan2(p.x - q.x, p.z - q.z)) }); pushState();
}

/* ---------- 🔥 Пожежа в серверній ---------- */
function startFire(v, txt) { const was = ST.fire > 0; ST.fire = Math.max(ST.fire, v); if (!was) emit({ k: 'fire', txt: txt || '' }); }
function updFire(dt) {
  if (ST.fire <= 0) return;
  ST.fire = Math.min(100, ST.fire + (ST.rain ? -8 : 2.5) * dt);                       // повільно розгоряється; спринклери гасять
  if (ST.fire <= 0) { ST.fire = 0; emit({ k: 'msg', txt: '💦 Спринклери загасили серверну!' }); return; }
  if (ST.fire >= 100 && !AU.fireMax) { AU.fireMax = 1; chaos('power'); }             // проводка згоріла
  const C = fireC(), R = fireR();
  for (const z of ST.zom) if (z.stun <= 0 && dist2(z.x, z.z, C.x, C.z) < R) { z.stun = 2; shove(z, Math.atan2(z.x - C.x, z.z - C.z), 1.5); }
  for (const q of ST.pst) if (q.stun <= 0 && dist2(q.x, q.z, C.x, C.z) < R) { stunPest(q, 2); shove(q, Math.atan2(q.x - C.x, q.z - C.z), 1.5); }
}

/* ---------- ✈️ Літачки ---------- */
function updPlanes(dt) {
  for (let i = ST.pp.length - 1; i >= 0; i--) {
    const q = ST.pp[i]; let end = '';
    for (let s = 0; s < 4 && !end; s++) {
      const stp = 9 * dt / 4; q.x += Math.sin(q.a) * stp; q.z += Math.cos(q.a) * stp; q.d += stp; q.y = 1.4 - Math.max(0, q.d - 8) * .22;
      end = wallHit(q.x, q.z) ? 'wall' : q.y < .3 ? 'land' : planeHit(q);
    }
    if (end) { ST.pp.splice(i, 1); addLit(q.x - Math.sin(q.a) * .4, q.z - Math.cos(q.a) * .4); pushState(); }
  }
}
function planeHit(q) {
  if (dist2(q.x, q.z, COOLER.o.x, COOLER.o.z) < .5) { spill(q.by); return 'cooler'; }
  for (const z of ST.pst) if (z.stun <= 0 && dist2(q.x, q.z, z.x, z.z) < .55) { z.cd = Math.max(z.cd, 1.5); emit({ k: 'phit', w: 'pest', id: z.id, x: r2(q.x), z: r2(q.z), by: q.by }); return 'pest'; }
  for (const z of ST.zom) if (dist2(q.x, q.z, z.x, z.z) < .55) { z.stun = Math.max(z.stun, 1); emit({ k: 'phit', w: 'zom', x: r2(q.x), z: r2(q.z), by: q.by }); return 'zom'; }
  for (const dk of DESKS) {
    if (pestOf(dk.i)) continue;
    const cp = colPos(dk.i);
    if (dist2(q.x, q.z, cp.x, cp.z) < .55) { emit({ k: 'phit', w: 'col', i: dk.i, x: r2(q.x), z: r2(q.z), by: q.by }); anger(dk.i, AGR.plane); return 'col'; }
    if (dist2(q.x, q.z, dk.x, dk.z - .15) < .5) {
      // влучив у ПК: з шансом він «заспамить» серверну — за 3 с там пожежа
      const sp = ST.fire <= 0 && AU.spamT <= 0 && Math.random() < AU.pcP; if (sp) AU.spamT = 3;
      emit({ k: 'phit', w: 'pc', i: dk.i, sp: sp ? 1 : 0, x: r2(q.x), z: r2(q.z), by: q.by }); return 'pc';
    }
  }
  return '';
}

/* ---------- 🧻 Мʼятий папір і 📘 книжки: приземлення ---------- */
function updToss(dt) {
  for (let i = ST.th.length - 1; i >= 0; i--) {
    const q = ST.th[i]; q.t += dt; if (q.t < q.T) continue; ST.th.splice(i, 1);
    const x = q.x1, z = q.z1, R = q.w === 'bk' ? .85 : .7, ex = {}; let hit = '';
    // «папірець у смітник»: що далі кидок — то більша нагорода
    if (q.w === 'pb') { const b = (L.pk || []).find(s => s.k === 'pb' && dist2(s.o.x, s.o.z, x, z) < .65); if (b) { hit = 'bin'; ex.d = q.d; ex.x = b.o.x; ex.z = b.o.z; } }
    if (!hit) for (const o of ST.zom) if (dist2(o.x, o.z, x, z) < R) {
      hit = 'zom'; o.stun = Math.max(o.stun, q.w === 'bk' ? 3 : 1);
      if (q.w === 'bk') { o.cd = 3; if (o.carry) { toFloor(o.carry.it, o.carry.n, o.x, o.z); ex.sp = o.carry.it; o.carry = null; } }   // книжкою по голові — і звіт випльовує
      break;
    }
    if (!hit) for (const o of ST.pst) if (dist2(o.x, o.z, x, z) < R) { hit = 'pest'; if (q.w === 'bk') stunPest(o, 2.5); else o.cd = Math.max(o.cd, 1.5); break; }
    if (!hit) for (const dk of DESKS) { if (pestOf(dk.i)) continue; const cp = colPos(dk.i); if (dist2(cp.x, cp.z, x, z) < R) { hit = 'col'; ex.i = dk.i; anger(dk.i, q.w === 'bk' ? AGR.book : AGR.ball); break; } }
    if (!hit && q.w === 'pb') addLit(x, z);                                            // промах — папірець на підлозі (Румба прибере)
    emit(Object.assign({ k: 'thit', w: q.w, hit, who: q.by, x: r2(x), z: r2(z) }, ex)); pushState();
  }
}

/* ---------- 🍾 Молотов і палаючі калюжі ---------- */
function ignite(x, z, r, t, by) {
  ST.burn.push({ id: ++AU.fid, x: r2(x), z: r2(z), r, t });
  for (const dk of DESKS) if (!pestOf(dk.i)) { const cp = colPos(dk.i); if (dist2(cp.x, cp.z, x, z) < r + 1.2) anger(dk.i, AGR.burn); }
  const C = fireC(); if (dist2(x, z, C.x, C.z) < r + 1.5) startFire(40, '🔥 Вогонь перекинувся на серверну!');
  emit({ k: 'ignite', x: r2(x), z: r2(z), r, by: by || '' });
}
function updMolo(dt) {
  for (let i = ST.mo.length - 1; i >= 0; i--) { const q = ST.mo[i]; q.t += dt; if (q.t < q.T) continue; ST.mo.splice(i, 1); ignite(q.x1, q.z1, 2.2, 6, q.by); pushState(); }
  for (let i = ST.burn.length - 1; i >= 0; i--) {
    const b = ST.burn[i]; if ((b.t -= dt) <= 0) { ST.burn.splice(i, 1); continue; }
    for (const z of ST.zom) if (dist2(z.x, z.z, b.x, b.z) < b.r) { if (z.stun <= 0) { z.stun = 3; z.cd = 3; if (z.carry && z.carry.it !== 'report') { toFloor(z.carry.it, z.carry.n, z.x, z.z); z.carry = null; } } shove(z, Math.atan2(z.x - b.x, z.z - b.z), 3 * dt); }
    for (const q of ST.pst) if (dist2(q.x, q.z, b.x, b.z) < b.r) { if (q.stun <= 0) stunPest(q, 3); shove(q, Math.atan2(q.x - b.x, q.z - b.z), 3 * dt); }
    ST.lit = ST.lit.filter(l => dist2(l.x, l.z, b.x, b.z) > b.r);
  }
}

/* ---------- 🚰 Кулер-пастка ---------- */
function spill(by) {
  if (ST.pud && ST.pud.t > 5) return false;
  ST.pud = { id: ++AU.fid, x: COOLER.pc.x, z: COOLER.pc.z, r: 2, t: 30, el: 0 };
  emit({ k: 'spill', who: by || '' }); pushState(); return true;
}
function updPud(dt) {
  const P = ST.pud; if (!P) return;
  P.t -= dt;
  if (P.el > 0) {
    for (const z of ST.zom) if (dist2(z.x, z.z, P.x, P.z) < P.r) z.stun = Math.max(z.stun, .6);
    for (const q of ST.pst) if (dist2(q.x, q.z, P.x, P.z) < P.r) q.stun = Math.max(q.stun, .6);
    if ((P.el -= dt) <= 0) { ST.pud = null; emit({ k: 'msg', txt: '⚡ Калюжа вигоріла — тепер просто мокрий слід.' }); return; }
  }
  if (P.t <= 0) ST.pud = null;
  // крісло на коліщатках, що на швидкості врізалось у кулер, — теж калюжа
  if (!ST.pud && typeof BODIES !== 'undefined') for (const b of BODIES) if (b.kind === 'chair' && Math.hypot(b.vx || 0, b.vz || 0) > 2.5 && dist2(b.x, b.z, COOLER.o.x, COOLER.o.z) < 1.1) { spill('chair'); break; }
}

/* ---------- 🤖 Робот-пилосос «Румба» ---------- */
function updRoomba(dt, c) {
  const R = ST.rb; if (!R) return;
  if (R.dead > 0) { if ((R.dead -= dt) <= 0) { const d = dock(); Object.assign(R, { x: d.x, z: d.z, dead: 0, arm: 0, path: null }); emit({ k: 'msg', txt: '🤖 З док-станції виїхала нова Румба.' }); } return; }
  let tx = null, tz = null, spd = 1.1;
  if (R.arm) {
    // камікадзе: молотов — у найбільший натовп зомбі; міна саботажника — до гравця біля принтера
    spd = 2.3; R.t -= dt;
    const T = rbTarget(R, c);
    if (T) { tx = T.x; tz = T.z; if (dist2(R.x, R.z, tx, tz) < 1.1) { rbBoom(R); return; } }
    if (R.t <= 0) { rbBoom(R); return; }
  } else {
    let best = null, bd = 9; for (const q of ST.lit) { const d = dist2(q.x, q.z, R.x, R.z); if (d < bd) { bd = d; best = q; } }
    if (best) { tx = best.x; tz = best.z; if (bd < .45) { ST.lit.splice(ST.lit.indexOf(best), 1); emit({ k: 'clean', x: best.x, z: best.z }); } }
  }
  if (tx == null) { const w = ZWP[R.wp] || ZWP[0]; tx = w.x; tz = w.z; }
  const r = zMove(R, tx, tz, spd, dt); if (r === 'stuck' || r === 'here') R.wp = Math.floor(Math.random() * ZWP.length);
}
function rbTarget(R, c) {
  if (R.arm === 2) return c.slice().sort((a, b) => dist2(a.x, a.z, PRINTER.p.x, PRINTER.p.z) - dist2(b.x, b.z, PRINTER.p.x, PRINTER.p.z))[0] || null;
  const mobs = ST.zom.concat(ST.pst); let best = null, bn = -1e9;
  for (const z of mobs) { const n = mobs.filter(o => dist2(o.x, o.z, z.x, z.z) < 4).length - dist2(z.x, z.z, R.x, R.z) * .02; if (n > bn) { bn = n; best = z; } }
  return best;
}
function rbBoom(R) {
  const x = R.x, z = R.z, kind = R.arm; R.dead = 10; R.arm = 0;
  for (const o of ST.zom) if (dist2(o.x, o.z, x, z) < 4) { o.stun = 5; o.cd = 4; if (o.carry) { toFloor(o.carry.it, o.carry.n, o.x, o.z); o.carry = null; } shove(o, Math.atan2(o.x - x, o.z - z), 2.5); }
  for (const q of ST.pst) if (dist2(q.x, q.z, x, z) < 4) { stunPest(q, 5); shove(q, Math.atan2(q.x - x, q.z - z), 2.5); }
  emit({ k: 'rboom', x: r2(x), z: r2(z), kind });
  if (kind === 1) ignite(x, z, 2.6, 6, '');
  if (kind === 2 && dist2(x, z, PRINTER.p.x, PRINTER.p.z) < 5) chaos('jam');
  for (let k = 0; k < 4; k++) addLit(x + rand(-1.5, 1.5), z + rand(-1.5, 1.5));
  pushState();
}

/* ---------- 🕵️ Саботаж і 🚨 нарада ---------- */
function sabDo(w, o) {
  if (w === 'fire') { if (ST.fire > 0) return false; startFire(30, ''); }
  else if (w === 'jam') { if (ST.jam) return false; chaos('jam'); }
  else if (w === 'boom') { if (!ST.cm) return false; chaos('boom'); }
  else if (w === 'power') { if (!ST.pw) return false; chaos('power'); }
  else if (w === 'rain') { if (ST.rain) return false; chaos('rain'); }
  else if (w === 'steal') {
    // перекласти чиїсь дані в чужу шухляду (дані не зникають — їх просто треба шукати деінде)
    const s = o && o.i != null ? DESKS[o.i] : pick(DESKS.filter(d => ST.desk[d.i] && !pestOf(d.i)));
    const emp = DESKS.filter(d => !ST.desk[d.i] && !pestOf(d.i) && (!s || d.i !== s.i));
    if (!s || !ST.desk[s.i] || pestOf(s.i) || !emp.length) return false;
    ST.desk[s.i] = 0; ST.desk[pick(emp).i] = 1;
  }
  else if (w === 'litter') { const p = o || pick(ZWP); for (let k = 0; k < 5; k++) addLit(p.x + rand(-1.6, 1.6), p.z + rand(-1.6, 1.6)); }
  else if (w === 'mine') { const R = ST.rb; if (!R || R.dead > 0 || R.arm) return false; R.arm = 2; R.t = 25; }
  else if (w === 'hack') { ST.heat = 1; if (cur() === 'data' && ST.fed > 0) ST.fed--; else ST.rhp = Math.max(10, ST.rhp - 25); }   // 💻 злам: сервер гріється, частина даних «зникла»
  else if (w === 'burn' || w === 'shred') ST.t = Math.min(ST.dur - 5, ST.t + (w === 'burn' ? 15 : 12));                // 🗂️ документи доведеться відновлювати
  else return false;
  return true;
}
// колега-саботажник (офлайн і коли серед гравців шкідника немає)
function botSabotage() {
  const pool = ['litter'];
  if (ST.fire <= 0) pool.push('fire', 'fire'); if (!ST.jam) pool.push('jam'); if (ST.cm) pool.push('boom'); if (ST.pw) pool.push('power');
  if (cur() === 'data') pool.push('steal', 'steal'); if (ST.rb && !ST.rb.arm && !ST.rb.dead) pool.push('mine');
  pool.push('hack'); if (ST.s5 && ST.s5.doc.length) pool.push('burn', 'shred');
  const w = pick(pool), at = { fire: RACK.p, jam: PRINTER.p, boom: COFFEE.p, power: PANEL.p, rain: VALVE.p, mine: ST.rb, hack: RACK.p, burn: ST.s5 && ST.s5.doc[0], shred: ST.s5 && ST.s5.doc[ST.s5.doc.length - 1] }[w] || pick(ZWP);
  if (!sabDo(w, w === 'litter' ? at : null)) return false;
  AU.sp += SABP[w] || 1; clue5(AU.sab, w, at); if (w === 'burn') { const r = roomAt(at.x, at.z); emit({ k: 'alarm', room: r ? r.n : '', x: r2(at.x), z: r2(at.z) }); }
  // свідки: двоє колег отримують алібі — коло підозрюваних звужується
  const si = +AU.sab.slice(4), pool2 = shuffle(DESKS.map(d => d.i).filter(i => i !== si && !ST.clr.includes(i))).slice(0, 2);
  ST.clr.push(...pool2);
  const rm = roomAt(at.x, at.z);
  emit({ k: 'sabo', w, room: rm ? rm.n : '', cl: pool2.map(i => NAMES[i]) }); pushState();
  return true;
}
function startMeeting(by) {
  const npc = ST.sk !== 'p', c = npc ? DESKS.map(d => 'npc:' + d.i) : crew().map(p => p.name), n = npc ? DESKS.map(d => NAMES[d.i]) : c.slice();
  ST.mt = { ph: 'go', t: GO_T, c, n, v: {}, cnt: c.map(() => 0), who: [], skip: 0, by };   // спершу — 20 с дійти до переговорної
  emit({ k: 'meet', who: by }); pushState();
}
function endMeeting() {
  const M = ST.mt; ST.mt = null; AU.mtCd = 25;
  const best = Math.max(0, ...M.cnt), tied = M.cnt.filter(v => v === best).length;
  const out = best > 0 && tied === 1 && best > M.skip ? M.cnt.indexOf(best) : -1;
  if (out < 0) { emit({ k: 'mres', out: '', nm: '' }); pushState(); return; }
  const key = M.c[out], nm = M.n[out], ok = key === AU.sab ? 1 : 0;
  if (key === AU.int && !AU.intOk) { AU.intOk = 1; emit({ k: 'mres', out: key, nm, ok: 0, imm: 1 }); pushState(); return; }   // 🧑‍🎓 стажеру пробачають перше звинувачення
  if (ok) { ST.sbC = 1; ST.dur += 20; }                                            // спіймали: +20 с до дедлайну, саботаж вимкнено
  else if (key.startsWith('npc:')) { const i = +key.slice(4); ST.ag[i] = 100; turnPest(i, 'fired'); }   // образили невинного колегу
  else ST.t = Math.min(ST.dur - 5, ST.t + 20);                                       // невинного гравця — нарада з'їла 20 с
  emit({ k: 'mres', out: key, nm, ok }); pushState();
}

/* ---------- Кадр автора раунду (v3). true — триває нарада, решта світу завмерла ---------- */
function auth3(dt, c) {
  if (ST.mt) {
    const M = ST.mt; M.t -= dt;
    if (M.ph === 'go') { const mp = mpos(); if (M.t <= 0 || c.every(p => dist2(p.x, p.z, mp.x, mp.z) < 3.2)) { M.ph = 'vote'; M.t = MEET_T; pushState(); } return true; }
    if (M.t <= 0 || c.every(p => p.name in M.v)) endMeeting(); return !!ST.mt;
  }
  auth5(dt, c);
  AU.mtCd = Math.max(0, AU.mtCd - dt);
  for (const k in AU.sbcd) AU.sbcd[k] -= dt;
  if (AU.sab.startsWith('npc:') && !ST.sbC && ST.t > 20 && (AU.sbT -= dt) <= 0) { AU.sbT = rand(45, 65); botSabotage(); }
  if (AU.spamT > 0 && (AU.spamT -= dt) <= 0) startFire(35, '🖥️ Комп’ютер заспамив серверну запитами — СЕРВЕРНА ГОРИТЬ!');
  updFire(dt); updPests(dt, c); updPlanes(dt); updToss(dt); updMolo(dt); updPud(dt); updRoomba(dt, c);
  return false;
}

/* ---------- Фізичний світ (і на сервері, і в гравців, у тому самому порядку): стіни, меблі, крісла всіх трьох поверхів ---------- */
A.on('world', () => {
  for (const Lx of LAY) {
    for (const s of Lx.walls) {
      const len = Math.hypot(s[2] - s[0], s[3] - s[1]), n = Math.max(1, Math.round(len / .6));
      for (let k = 0; k <= n; k++) addStatic(Lx.x + lerp(s[0], s[2], k / n), Lx.z + lerp(s[1], s[3], k / n), .32, 2.5);
    }
    for (const o of Lx.obs) addStatic(o.x, o.z, o.r, 1.3);
    // крісла рухаються — їх модель не можна зливати в статику (інакше під вершником крісла не видно)
    for (const [x, z] of Lx.chairs) { const b = addBody('chair', Lx.x + x, Lx.z + z); if (b && b.m) A.dynamic(b.m); }
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
  /* --- РЕСЕПШН: стійка (ЛОБІ), лоток «Відправка», диван для гостей --- */
  rug(0, 10.5, 6, 5, '#D9CFF0');
  B(START.l.x, .52, START.l.z, 2.8, 1.04, .8, '#7A5BC9', true, true); B(START.l.x, 1.07, START.l.z + .1, 3, .06, 1, '#FFFFFF'); B(START.l.x, .5, START.l.z + .41, 2.8, .6, .02, '#B07CF0');
  monitor(START.l.x - .6, START.l.z - .2, -1);
  { const h = buildOffice('#F0D2B6', '#FF8AD8'); h.root.position.set(START.o.x, 0, START.o.z - .85); scene.add(A.dynamic(h.root)); V.recep = h; }
  C(START.l.x + .8, 1.15, START.l.z + .25, .08, .18, .14, '#FFD27A');                                   // дзвоник
  const ss = neonSign('🗳️ ЛОБІ', '#7FE08A', 1.5, .4); ss.position.set(START.o.x, 1.55, START.o.z + .45); scene.add(A.dynamic(ss));
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
  decoCommon(K, Lx); decoExtra(K, Lx); drawPickups(K, Lx);
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
  if (onEvent5(e, here, nm) || onEvent3(e, here, nm)) return;
  if (e.k === 'msg') { if (here) { if (e.big) banner(e.txt); else toast(e.txt); } }
  else if (e.k === 'go') {
    // ліфт: раунд починається на іншому поверсі — переносимо туди всіх, хто був на будь-якому поверсі «Дедлайну»
    const was = running && (floorOf(pl.x, pl.z) >= 0 || V.joined);
    ST.vi = clamp(e.v | 0, 0, LAY.length - 1); useVar(ST.vi);
    if (was) { V.act = null; toLobby(`🛗 Ліфт везе на ${L.n}!`); }
  }
  else if (e.k === 'voted') { if (isMe(e.who)) toast(`🗳️ Твій голос: <b>${LAY[e.v].n}</b>. Тепер — «✅ Я готовий».`); else if (here) toast(`🗳️ ${nm} голосує за ${LAY[e.v].n}`); }
  else if (e.k === 'botj') { if (here) { toast(`🤖 Бот ${escapeHTML(e.n)} приєднався до лобі · ${e.cnt | 0}/${TEAM}`); sfx('ui'); } }
  else if (e.k === 'botl') { if (here) toast(`🤖 Бот ${escapeHTML(e.n)} поступився місцем живому гравцю`); }
  else if (e.k === 'botfoam') { if (here) { foamFX(+e.x, +e.z, +e.a); sfx('splash', +e.x, +e.z); } }
  else if (e.k === 'ready') { if (here && !isMe(e.who) && e.on) toast(`✅ ${nm} готовий до аврала`); }
  else if (e.k === 'take') { const d = DESKS[e.i]; if (d && here) { ftext(d.x, 2.4, d.z, '📄 +1', 'gold'); if (V.cols[e.i]) bubble(V.cols[e.i].ent, pick(['Ось мої цифри!', 'Тримай, тільки не загуби', 'Я це вчора мав здати…', 'Удачі з принтером!']), false, 2); sfx('page', d.x, d.z); } }
  else if (e.k === 'pick') { if (me) sfx('pick'); }
  else if (e.k === 'brewed') { if (me) { const C = CUPS[e.c || 1]; ftext(pl.x, 2.5, pl.z, e.re ? `🔄 Тепер це ${C.ic} ${C.n}` : '☕ Еспресо! (F ще раз — перелити в 🥛 лате / 🧋 раф)', 'gold'); sfx('pour'); } }
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
    toast(`🔧 ${{ fire: 'Пожежу в серверній загасили 🧯', jam: 'Папір із принтера витягли', cm: 'Кавоварку полагодили', heat: 'Сервер охолодили', power: 'Світло увімкнули', rain: 'Спринклери вимкнули', excel: 'ВПР запрацював — колега врятований' }[e.w] || 'Полагоджено'}${e.who && e.who !== 'me' && !isMe(e.who) ? ' — ' + nm : ''}!`); sfx('equip');
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
  else if (e.k === 'throw') { if (here) { sfx('throw'); if (!isMe(e.who)) toast(`📑 ${nm} кидає звіт — лови!`); } }
  else if (e.k === 'catch') { if (here) { if (isMe(e.who)) { ftext(pl.x, 2.6, pl.z, 'Спіймав! 📑', 'gold'); sfx('catch'); } else toast(`📑 ${nm} ловить звіт!`); } }
  else if (e.k === 'land') { if (here) { toast('📑 Звіт упав на підлогу — швидше підбери, поки не з’їли!'); sfx('land', +e.x, +e.z); } }
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
  const stars = win ? (left >= 126 ? 3 : left >= 56 ? 2 : 1) : 0;
  let coins = win ? 50 + stars * 25 + Math.min(10, fx) * 5 + (pf ? 30 : 0) : 10 + (e.done | 0) * 3, xp = win ? 120 + stars * 20 : 30;
  const sab = V.wasSab; V.wasSab = false;
  if (sab) { coins = e.sw ? 160 : 15; xp = e.sw ? 160 : 30; } else if (e.sc) coins += 40;   // 🕵️ саботажник: своя нагорода; команда, що його спіймала, — +40
  P.coins += coins; addXP(xp);
  const d = A.data(); d.rounds = (d.rounds || 0) + 1; if (win) { d.wins = (d.wins || 0) + 1; d.best = Math.max(d.best || 0, Math.round(left)); } d.stars = Math.max(d.stars || 0, stars); d.fixes = (d.fixes || 0) + fx;
  if (pf) d.perfect = (d.perfect || 0) + 1;
  if (sab && e.sw) d.sabWins = (d.sabWins || 0) + 1; if (!sab && e.sc) d.caught = (d.caught || 0) + 1;
  d.floors = d.floors || {}; if (win) d.floors[e.v | 0] = 1;
  const mm = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  banner(win ? `📤 Звіт здано о ${clockStr(ST.dur - left)}! ${'⭐'.repeat(stars)}${pf ? ' 💯' : ''} Запас: ${mm(left)}` : `🕕 ${e.why || '18:00 — дедлайн зірвано.'}`);
  toast(`${win ? '🎉 Квартальний звіт прийнято!' : '😩 Начальник незадоволений.'}${pf ? ' 💯 <b>Бездоганний звіт</b> — ні укусу, ні плями: +30 🪙!' : ''} Нагорода: <b>+${coins} 🪙</b> · +${xp} досвіду. Наступний раунд — у вікні лобі: обери поверх і тисни «✅ Я готовий».`);
  if (e.sab) setTimeout(() => toast(sab ? (e.sw ? `🕵️ <b>Саботаж удався!</b> Ніхто тебе не викрив — +${coins} 🪙.` : e.sc ? '🕵️ Тебе викрили на нараді… +15 🪙 утішних.' : '🕵️ Команда все одно встигла. Наступного разу — хитріше!')
    : `🕵️ Саботажником ${e.sk === 'n' ? 'був(ла) колега' : 'був(ла)'} <b>${escapeHTML(e.sab)}</b>${e.sc ? ' — і ви його викрили! +40 🪙' : e.sw ? ' — і саботаж удався 😈' : ''}.`), 1800);
  finalScreen(e);
  sfx(win ? (pf ? 'perfect' : 'level') : 'hurt'); refreshHUD(); save();
}
const clockStr = t => { const s = T0 + Math.floor(Math.max(0, t)); return `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };

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
/* ---------- 📑 Кинути звіт: напарнику, на якого дивишся (або вперед на 7 м) ---------- */
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
  if (!running || pl.dead || myHeld().it !== 'report') { toast('📑 Кидати можна лише надрукований звіт, коли він у тебе в руках.'); return; }
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
  funSpeedMul = function () { const m = _fsm.apply(this, arguments); if (!running || !inOffice(pl.x, pl.z)) return m; return m * (myHeld().it === 'report' ? .78 : 1) * (V.dashT > 0 ? 1.55 : 1) * (V.stunT > 0 ? .06 : 1) * (V.slowT > 0 ? .45 : 1) * (carrying(myKey()) ? .6 : 1); };
}
function setBar() {
  const on = running && !pl.dead && ST.on && inOffice(pl.x, pl.z), key = on ? (V.sab && !ST.sbC ? 'S' : 'T') : false;
  if (key === V.barOn || typeof modeBar !== 'function') return; V.barOn = key;
  modeBar(on ? { slots: [
    { id: 'plg', ic: '🪠', n: 'Вантуз', use: () => firePlunger() },
    // 📑 звіт у руках — кидаєш його напарнику; руки вільні — кидаєш 📘 книжку
    { id: 'bk', get ic() { return myHeld().it === 'report' ? '📑' : '📘'; }, get n() { return myHeld().it === 'report' ? 'Кинути звіт' : V.bk > 0 ? 'Книжка' : 'Книжка · де: шафа'; },
      count: () => myHeld().it === 'report' ? (ST.fly ? 0 : 1) : V.bk, use: () => myHeld().it === 'report' ? throwReport() : toss('bk') },
    { id: 'cof', ic: '☕', n: 'Кава-ривок', count: () => V.cof, use: coffeeDash },
    { id: 'pp', ic: '✈️', get n() { return V.pp > 0 ? 'Літачок' : 'Літачок · де: лоток паперу'; }, count: () => V.pp, use: throwPlane },
    { id: 'pb', ic: '🧻', get n() { return V.pb > 0 ? 'Мʼятий папір' : 'Папір · де: смітник'; }, count: () => V.pb, use: () => toss('pb') },
    { id: 'ext', ic: '🧯', n: 'Вогнегасник', count: () => Math.max(0, Math.round(V.ext)), use: () => spray() },
    { id: 'mol', ic: '🍾', n: 'Молотов', count: () => V.mol, use: throwMolotov },
    key === 'S' ? { id: 'sab', ic: '🕵️', n: 'Саботаж', count: () => V.sbcd > 0 ? 0 : 1, use: sabotage } : { id: 'meet', ic: '🚨', n: 'Нарада', count: () => V.mc, use: callMeeting },
  ] } : null);
}
function toLobby(msg) {
  pl.x = START.p.x - .5; pl.z = START.p.z + .4; pl.y = 0; pl.vy = 0; pl.falling = false; pl.jump = null; pl.safe = { x: pl.x, z: pl.z };
  camPos.set(pl.x, 20, pl.z + 15); camLook.set(pl.x, .5, pl.z); if (msg) toast(msg);
}

/* ---------- Назви кімнат ховаються, поки ти всередині цієї кімнати (плавно, ~0,2 с) ---------- */
// V.rl: { vi, n, m, o } — табличка/напис на підлозі, що належить кімнаті з назвою n на поверсі vi
function roomLbl(txt, m) { if (L && L.rooms.some(r => r.n === txt)) V.rl.push({ vi: L.vi, n: txt, m, o: m.material.opacity, k: 1 }); }
function roomAt(x, z) {
  const f = floorOf(x, z); if (f < 0) return null; const Q = LAY[f], lx = x - Q.x, lz = z - Q.z;
  const r = Q.rooms.find(r => lx > r.x0 && lx < r.x1 && lz > r.z0 && lz < r.z1); return r ? { vi: f, n: r.n } : null;
}
function roomLabels(dt) {
  const here = running && !pl.dead ? roomAt(pl.x, pl.z) : null; V.inRoom = here;
  // згасання за справжнім часом (кадр гри може бути обрізаний), але не повільніше за ігровий dt
  const nowR = performance.now(), real = V.rlT ? Math.min(.25, (nowR - V.rlT) / 1000) : 0; V.rlT = nowR; dt = Math.max(dt, real);
  for (const e of V.rl) {
    const tg = here && e.vi === here.vi && e.n === here.n ? 0 : 1;
    e.k = tg > e.k ? Math.min(tg, e.k + dt / .2) : Math.max(tg, e.k - dt / .2);
    e.m.material.opacity = e.o * e.k; e.m.visible = e.k > .01;
  }
}

/* ---------- Лобі: вікно з картами поверхів, голос і «✅ Я готовий» (ядро modeLobby) ---------- */
const ABOUT = ['Класика: коридор, опенспейс, переговорна, кабінет начальника, кухня й копіцентр.', 'Сховище, операційний зал з касами, кільцева галерея та бек-офіс.', 'Атріум зі скляним мостом, мейл-рум, бариста-бар, серверна й гірка 🛝.'];
const nmLb = k => k === 'me' || isMe(k) ? 'Ти' : String(k);
function lobbyMe() { const k = myKey(), e = ST.lp.find(a => a[0] === k || (k !== 'me' && isMe(a[0]))); return e || null; }
function lobbyInfo() {
  const H = ST.lp.length, rd = ST.lp.filter(a => a[1]).length, N = H + ST.bt.length;
  if (ST.cd >= 0) return `🚀 Усі на місці — старт за <b>${Math.max(1, Math.ceil(ST.cd))}</b>…`;
  if (!ST.fo) return `Чекаємо гравців ${N}/${TEAM} — натисни «✅ Я готовий», і 🤖 боти доповнять лобі…`;
  if (N < TEAM) return ST.lj ? `🤖 Бот ${escapeHTML(ST.lj)} приєднався · ${N}/${TEAM} — боти доповнюють лобі…` : `Чекаємо гравців ${N}/${TEAM} — боти доповнять лобі…`;
  return `Усі ${N}/${TEAM} на місці — чекаємо готовності людей (${rd}/${H})${ST.fw >= 0 ? ` · без решти старт за <b>${Math.ceil(ST.fw)} с</b>` : ''}`;
}
function lobbyDef() {
  const me = lobbyMe(), nx = LAY[ST.nx];
  const mine = me && me[2] >= 0 ? me[2] : V.vote, ready = !!(me && me[1]);
  const tie = ST.vo.some(Boolean) && ST.vo.filter(v => v === Math.max(...ST.vo)).length > 1;
  return { title: '⏰ Дедлайн о 18:00 · лобі', sub: `Обери поверх — клікни по картці. У раунді ${TEAM} учасників: люди + 🤖 боти, що доповнюють лобі. Ліфт везе на поверх з найбільшою кількістю голосів. Зараз: <b>${nx.n}</b>${tie ? ' (нічия — жереб)' : ''}.`,
    maps: LAY.map((q, i) => ({ n: q.n, img: `addons/deadline/map${i + 1}.jpg`, about: ABOUT[i] || '' })), votes: ST.vo, mine, ready,
    players: ST.lp.map(a => ({ n: nmLb(a[0]), ready: !!a[1], vote: a[2] })).concat(ST.bt.map(b => ({ n: '🤖 Бот ' + b.n, ready: true, vote: -1 }))), info: lobbyInfo(),
    onVote: i => { if (ST.on || i < 0 || i >= LAY.length) return; V.vote = i; req('vote', { v: i }); },
    onReady: () => { if (!ST.on) req('ready', { on: !(lobbyMe() || [])[1] }); },
    onHide: () => { V.lobHide = true; closeLobby(); toast('🗳️ Лобі сховано. Відкрити знову — <b>F</b> біля стійки «🗳️ ЛОБІ» або кнопка у вкладці ⏰.'); } };
}
function closeLobby() { if (V.lobOpen && typeof modeLobby === 'function') modeLobby(null); V.lobOpen = false; }
function openLobby() { V.lobHide = false; lobby(); }
// відкрилась панель (Esc, вкладка, інвентар) — вікно лобі ховаємо одразу: офлайн гра на паузі й кадри не йдуть
if (!SIMSIDE && typeof openPanel === 'function') { const _op = openPanel; openPanel = function () { closeLobby(); return _op.apply(this, arguments); }; }
// щокадру: поки ти в лобі (поверх «Дедлайну», раунд не йде) і вікно не сховане — показуємо/оновлюємо (ядро саме порівнює HTML)
function lobby() {
  if (typeof modeLobby !== 'function') return;
  if (ST.rid !== V.lobRid) { V.lobRid = ST.rid; V.lobHide = false; }   // новий раунд — після нього вікно знову відкриється
  const show = running && !pl.dead && !panel && !ST.on && inOffice(pl.x, pl.z) && !V.lobHide;
  if (show) { modeLobby(lobbyDef()); V.lobOpen = true; } else closeLobby();
}

/* ---------- Кожен кадр ---------- */
function clientTick(dt) {
  const t = gameTime;
  syncHeld();
  // новий раунд — нові ривки
  if (ST.rid !== V.rid) { V.rid = ST.rid; V.cof = 3; V.dashT = 0; }
  if (V.dashT > 0) { V.dashT -= dt; if (Math.random() < dt * 20) burst(pl.x, .3, pl.z, '#C4956A', 1, 1, .4, .5); }
  if (V.plCd > 0) V.plCd -= dt;
  client3(dt); setBar(); updPlg(dt); roomLabels(dt);
  // колеги з даними махають, над головою 📄; колега з Excel кличе на допомогу
  for (const [i, c] of V.cols.entries()) {
    if (!c) continue; const has = ST.on && ST.desk[i], xl = ST.on && ST.xl && ST.xl.i === i, gone = ST.on && !!pestOf(i);
    if (c.h.root.visible === gone) c.h.root.visible = !gone;   // 😤 колега зараз ходить і зайобує — стілець порожній
    c.icon.visible = !!(has || xl);
    if (xl && c.icon.material.map !== iconTex('📊')) c.icon.material.map = iconTex('📊'); else if (!xl && has && c.icon.material.map !== iconTex('📄')) c.icon.material.map = iconTex('📄');
    if (has || xl) { c.icon.position.y = 2.25 + Math.sin(t * (xl ? 8 : 3) + i) * .08; c.h.aR.rotation.x = -2.4 + Math.sin(t * (xl ? 12 : 6) + i) * .4; } else c.h.aR.rotation.x = -1.1 + Math.sin(t * 9 + i) * .08;
  }
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
  ST.tb.forEach((q, i) => { if (!AUTH()) q.t -= dt; const P2 = alongPath(tubePath(1 - q.to), 1 - q.t / TUBE_T), m = V.caps[i]; m.position.set(P2.x, 2.5, P2.z); m.rotation.y = -P2.a; });
  // годинник
  if (V.clock) {
    const s = T0 + (ST.on ? ST.t : 0), sec = s % 60, min = (s / 60) % 60, hr = (s / 3600) % 12;
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
  hud(); darkness(); guide(); lobby();
  if (!running || pl.dead) return;
  const here = inOffice(pl.x, pl.z), fl = floorOf(pl.x, pl.z);
  // на «чужому» поверсі (раунд іде на іншому) — ліфт сам відвезе до команди
  if (fl >= 0 && !here) { if ((V.tpT += dt) > 1.2) { V.tpT = 0; toLobby(`🛗 Команда на ${L.n} — ліфт везе тебе туди.`); } return; }
  V.tpT = 0;
  if (!here) { V.act = null; V.vote = -1; if (myHeld().it || myHeld().cup) { if ((V.sendT -= dt) <= 0) { V.sendT = 1; req('drop'); } } return; }
  if (ST.on) V.joined = true;
  if (ST.on) V.vote = -1;
  pl.safe = { x: START.p.x, z: START.p.z - 1 };
}
function darkness() {
  // ⚡ блекаут: темрява, у кожного (і в ботів) — промінь ліхтарика туди, куди дивиться
  if (!V.dark) { V.dark = document.createElement('canvas'); V.dark.id = 'dl-dark'; V.dark.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:1;pointer-events:none;transition:opacity .4s;opacity:0'; document.body.appendChild(V.dark); }
  const on = running && ST.on && !ST.pw && inOffice(pl.x, pl.z) && !panel;
  V.dark.style.opacity = on ? (Math.random() < .03 ? .7 : 1) : 0; if (!on) return;
  const c = V.dark, W_ = innerWidth | 0, H_ = innerHeight | 0; if (c.width !== W_ || c.height !== H_) { c.width = W_; c.height = H_; }
  const g = c.getContext && c.getContext('2d'); if (!g || !g.fillRect) return;
  g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, W_, H_); g.fillStyle = 'rgba(10,6,25,.9)'; g.fillRect(0, 0, W_, H_);
  g.globalCompositeOperation = 'destination-out';
  const L5 = [{ x: pl.x, z: pl.z, f: pl.face }, ...ST.bt.map(b => ({ x: b.x, z: b.z, f: b.f || 0 }))];
  for (const id in NET.players) { const r = NET.players[id]; if (r && inOffice(r.x, r.z)) L5.push({ x: r.x, z: r.z, f: r.face || 0 }); }
  const grad = (x, y, r0, r1) => { const gr = g.createRadialGradient(x, y, r0, x, y, r1); if (gr) { gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(.7, 'rgba(0,0,0,.85)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; } return gr; };
  for (const q of L5) {
    const p = screenPos(q.x, 1, q.z), e = screenPos(q.x + Math.sin(q.f) * 7, 1, q.z + Math.cos(q.f) * 7); if (!p.vis) continue;
    if (grad(p.x, p.y, 0, 60)) { g.beginPath(); g.arc(p.x, p.y, 60, 0, 7); g.fill(); }
    const a = Math.atan2(e.y - p.y, e.x - p.x), len = Math.max(80, Math.hypot(e.x - p.x, e.y - p.y));
    if (grad(p.x, p.y, 10, len)) { g.beginPath(); g.moveTo(p.x, p.y); g.arc(p.x, p.y, len, a - .42, a + .42); g.closePath(); g.fill(); }
  }
}

/* ---------- Дії «тримай поруч» ---------- */
function startAct(kind, need, tg, ic, l, ok) {
  if (V.act) return;
  V.act = { kind, need: need * (V.role === 'int' ? 2 : 1), t: 0, tg, ic, l, ok, pt: 0 }; sfx('dig');   // 🧑‍🎓 стажер — удвічі довше
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
function actRepour() { startAct(() => req('brew'), 1, P_(COFFEE), '🔄', 'Переливаю', () => !ST.cm ? '💥 Кавоварка зламалась!' : !myHeld().cup ? 'Кави в руках уже нема.' : ''); }
function actSub(w) {
  const S = STEPS[w];
  if (w === 'number') { mini('type', () => req('sub', { w }), { w: 'Q' + (1000 + (ST.rid * 7919) % 9000), at: S.at.p }); return; }   // ⌨️ набрати реєстраційний номер
  startAct(() => req('sub', { w }), S.t, w === 'sign' ? bossPos : P_(S.at), S.ic, S.act, () => myHeld().it !== 'report' ? 'Звіт уже не в тебе!' : cur() !== w ? 'Вже не треба.' : w === 'scan' && ST.heat ? '🔥 Сервер перегрівся — спершу полагодь вентилятор.' : w === 'scan' && ST.fire > 0 ? '🔥 Серверна горить — спершу загаси 🧯!' : w === 'scan' && !ST.pw ? '⚡ Нема світла.' : '');
}
const FIXL = { jam: ['🔧', 'Витягую зім’ятий папір'], cm: ['🔧', 'Лагоджу кавоварку'], heat: ['🌀', 'Лагоджу вентилятор'], power: ['⚡', 'Вмикаю автомати'], rain: ['🚿', 'Закручую вентиль'], excel: ['📊', 'Пояснюю колезі ВПР'] };
const fixAt = w => w === 'excel' ? (ST.xl ? DESKS[ST.xl.i].p : START.p) : { jam: PRINTER, cm: COFFEE, heat: RACK, power: PANEL, rain: VALVE }[w].p;
const active = w => w === 'jam' ? ST.jam : w === 'cm' ? !ST.cm : w === 'heat' ? ST.heat : w === 'power' ? !ST.pw : w === 'excel' ? !!ST.xl : ST.rain;
function actFix(w) { startAct(() => req('fix', { w }), FIXT[w], () => fixAt(w), FIXL[w][0], FIXL[w][1], () => active(w) ? '' : 'Уже полагодили!'); }

/* ---------- Підказки: підписи місць, «що робити зараз» і стрілка до цілі ---------- */
function goal() {
  const k = myKey(), h = myHeld(), s = cur(), near = o => dist2(pl.x, pl.z, o.x, o.z);
  const nearest = arr => arr.reduce((a, b) => !a || near(b) < near(a) ? b : a, null);
  if (ST.on) { const g5 = goal5(h); if (g5) return g5; }
  if (ST.on && ST.mt) return { txt: '🚨 <b>Збори!</b> Голосуй у вікні: «Звільнити …» чи «⏭️ Продовжити роботу». Справа 🗂️ — там же.' };
  if (!ST.on) {
    const nx = LAY[ST.nx];
    return V.lobHide ? { id: 'start', tg: START.p, txt: `Лобі сховано — натисни <b>F</b> біля стійки «🗳️ ЛОБІ» (${RN.atStart}) або «🗳️ Лобі» у вкладці ⏰. Поверх раунду: <b>${nx.n}</b>.` }
      : { id: 'start', txt: `🗳️ У вікні лобі обери поверх і натисни <b>«✅ Я готовий»</b>. Поверх раунду: <b>${nx.n}</b>.` };
  }
  if (V.act) return { txt: `${V.act.ic} ${V.act.l}… ${Math.min(100, Math.round(V.act.t / V.act.need * 100))}% — стій поруч!` };
  const signLater = ST.steps.indexOf('sign') >= ST.si && ST.steps.includes('sign') && !ST.coffee;
  // звіт у повітрі — лови
  if (ST.fly && !h.it) return { id: 'catch', tg: { x: ST.fly.x1, z: ST.fly.z1 }, txt: '📑 Звіт летить! Стань під нього — зловиш автоматично.' };
  // зомбі жує звіт — вантузом його!
  const chew = nearest(ST.zom.filter(z => z.carry && z.carry.it === 'report' && z.stun <= 0));
  if (chew) return { id: 'chew', tg: { x: chew.x, z: chew.z }, txt: `🧟 Зомбі <b>жує звіт</b> (цілість ${Math.round(ST.rhp)}%)! Лупи вантузом 🪠 — клавіша <b>1</b> або <b>F</b> поруч.` };
  { const g3 = goal3(h, s); if (g3) return g3; }
  // хтось украв дані
  const thief = nearest(ST.zom.filter(z => z.carry && z.stun <= 0 && s === 'data'));
  if (thief && (!h.it || h.it === 'sheets')) return { id: 'thief', tg: { x: thief.x, z: thief.z }, txt: `🧟 Зомбі-офісник поцупив ${ITEM[thief.carry.it].ic} <b>${ITEM[thief.carry.it].n}</b>! Наздожени й натисни <b>F</b> — «Це можна було листом!» (або 🪠 вантузом здалеку).` };
  // папери на підлозі
  const fl = nearest(ST.floor.filter(f => (f.it === 'report' && !h.it) || (f.it === 'sheets' && s === 'data' && (!h.it || h.it === 'sheets'))));
  if (fl) return { id: 'floor', tg: fl, txt: `${ITEM[fl.it].ic} <b>${ITEM[fl.it].n}</b> на підлозі — підбери (F), поки зомбі не схопили.` };
  if (!ST.pw) return { id: 'power', tg: PANEL.p, txt: `⚡ <b>Нема світла!</b> Біжи до щитка (${RN.atPanel}) — удвох тримайте F або наодинці перемкни 3 автомати (міні-гра). Поки темно, папери не працюють!` };
  if (ST.jam && s === 'print' && h.it !== 'report') return { id: 'jam', tg: PRINTER.p, txt: '🖨️ <b>Принтер зажував папір.</b> Підійди й тримай F, щоб витягнути.' };
  if (s === 'data' && !DESKS.some(q => ST.desk[q.i] && !pestOf(q.i)) && ST.pst.some(q => q.own)) { const q = ST.pst.find(o => o.own); return { id: 'pestc', tg: COFFEE.p, txt: `😤 Дані в <b>${NAMES[q.i]}</b>, а він(вона) зайобує всіх. Звари каву й переливай (F), поки не стане ${CUPS[q.want].ic} <b>${CUPS[q.want].n}</b>, — і пригости.` }; }
  if (ST.heat && s === 'scan') return { id: 'heat', tg: RACK.p, txt: `🔥 <b>Сервер перегрівся</b> — сканер не працює. Полагодь вентилятор ${RN.atRack} (F).` };
  if (h.cup && signLater) return { id: 'boss', tg: bossPos(), txt: '☕ Неси каву <b>начальнику</b> (F поруч з ним).' };
  if (h.it === 'report') {
    if (s === 'send') return { id: 'send', tg: SEND.p, txt: `📤 Звіт готовий! Неси його в лоток <b>«Відправка»</b> (${RN.atSend}) і натисни F.` };
    if (s === 'sign') {
      if (!ST.coffee && !h.cup) return ST.cm ? { id: 'coffee', tg: COFFEE.p, txt: `✍️ Начальник без кави не підписує. Звари <b>☕ каву</b> ${RN.atCoffee} (звіт можна не випускати з рук).` } : { id: 'cm', tg: COFFEE.p, txt: '💥 Кавоварка зламана — полагодь її (F), а тоді звари каву начальнику.' };
      return { id: 'boss', tg: bossPos(), txt: '✍️ Підійди до <b>начальника</b> з звітом і тримай F — підпише.' };
    }
    const S = STEPS[s]; if (S && S.at) return { id: s, tg: S.at.p, txt: `${S.ic} Неси звіт: <b>${S.n}</b> — F і тримайся поруч. Важкий? Кинь напарнику (📑, клавіша 2).` };
  }
  if (h.it === 'sheets') {
    if (s === 'data') { const d = nearest(DESKS.filter(q => ST.desk[q.i] && !pestOf(q.i))); if (d && h.n + ST.fed < ST.need) return { id: 'desk', tg: d.p, txt: `📄 У руках ${h.n}. Ще дані в колеги з 📄 над головою — F біля столу. Або неси вже в 🖨️ принтер.` }; }
    return { id: 'printer', tg: PRINTER.p, txt: `📥 Неси дані (${h.n} 📄) в <b>принтер</b> ${RN.atPrint} і натисни F. Далеко? Є 📮 пневмопошта.` };
  }
  if (s === 'data') {
    const d = nearest(DESKS.filter(q => ST.desk[q.i] && !pestOf(q.i)));
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
  if (holder) { const z = nearest(ST.zom.filter(q => q.stun <= 0 && !q.carry)); return z && near(z) < 6 ? { id: 'zombie', tg: { x: z.x, z: z.z }, txt: '🧟 Звіт у колеги. Відганяй зомбі-офісників (F поруч або 🪠 вантузом), щоб не вкрали!' } : { txt: `📑 Звіт несе ${escapeHTML(holder)} — прикривай: 🪠 вантуз по зомбі, лагодь поломки, лови звіт, якщо кине.` }; }
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
  const txt = P => typeof P.t === 'function' ? P.t() : P.t;
  for (const P of PLACES) {
    const p = P.f(), on = (!P.on || P.on()) && P.id !== g.id && (ST.pw || dist2(pl.x, pl.z, p.x, p.z) < 5);
    P.el.style.opacity = on ? (dist2(pl.x, pl.z, p.x, p.z) < 7 ? 1 : .55) : 0;
    if (on) { const t = txt(P); if (P.el.textContent !== t) P.el.textContent = t; pos(P.el, p.x, P.y, p.z); }
  }
  V.glbl.style.opacity = g.tg ? 1 : 0;
  if (g.tg) {
    const P = PLACES.find(q => q.id === g.id), t = '👉 ' + (P ? txt(P) : { desk: '📄 Дані тут (F)', boss: '👔 Начальник', thief: '🧟 Злодій! (F)', chew: '🧟 Жує звіт! 🪠', catch: '📑 Лови тут!', floor: '📄 Підібрати (F)', zombie: '🧟 Прожени (F)', cm: '🔧 Кавоварка', jam: '🔧 Принтер', printer: '🖨️ Принтер', excel: '📊 Допомогти з Excel (F)', fire: '🔥 Гаси пожежу! 🧯', refill: '🧯 Заправити', pest: '😤 Пригостити кавою (F)', pestc: '☕ Кавоварка' }[g.id] || 'Сюди');
    if (V.glbl.textContent !== t) V.glbl.textContent = t; pos(V.glbl, g.tg.x, 3, g.tg.z);
    const d = dist2(pl.x, pl.z, g.tg.x, g.tg.z);
    V.gMark.position.set(g.tg.x, .08, g.tg.z); V.gMark.scale.setScalar(1 + Math.sin(gameTime * 5) * .12);
    V.gArrow.visible = d > 2.2; V.gArrow.position.set(pl.x, .15, pl.z); V.gArrow.rotation.y = -Math.atan2(g.tg.z - pl.z, g.tg.x - pl.x);
  }
}
/* коротка інструкція при першому вході */
function intro(force) {
  const d = A.data(); if ((d.intro5 && !force) || SIMSIDE || document.getElementById('dl-intro')) return;
  const el = document.createElement('div'); el.id = 'dl-intro';
  el.style.cssText = 'position:fixed;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;background:rgba(20,12,40,.55);padding:16px;overflow:auto';
  el.innerHTML = `<div style="max-width:500px;width:100%;background:#2E2346;color:#fff;border-radius:18px;padding:18px 20px;font:14px/1.5 system-ui,sans-serif;box-shadow:0 12px 40px rgba(0,0,0,.4)">
    <div style="font:800 20px system-ui;margin-bottom:4px">⏰ Дедлайн о 18:00 — як грати</div>
    <div style="color:#FFE066;margin-bottom:6px">🏙️ ${L.n} · хмарочос у центрі міста</div>
    <div>1. 🗳️ <b>Лобі</b> — вікно з картами поверхів (42 · Опенспейс, 57 · Банк, 63 · Стартап): клікни картку, щоб проголосувати, і тисни <b>«✅ Я готовий»</b>. У раунді <b>5 учасників</b>: якщо людей менше — у лобі по одному приходять 🤖 боти (вони теж працюють: носять дані, лагодять, гасять). Усі на місці й готові — «старт за 3…2…1», годинник іде з 17:53 (7 хвилин). Сховав вікно — F біля стійки «🗳️ ЛОБІ».</div>
    <div>2. 📄 Збери дані в колег (📄 над головою) → 🖨️ <b>принтер</b> → друкуй (F, тримайся поруч).</div>
    <div>3. Зі звітом пройди пункти чекліста праворуч: 📎 🔏 🗂️ 📠 ✍️ (начальнику спершу ☕ каву!) → 📤 «Відправка».</div>
    <div>4. 📑 <b>Звіт — гаряча картопля</b>: важкий (ходиш повільніше), його можна <b>кинути</b> напарнику через перегородки (клавіша <b>2</b>).</div>
    <div>5. 🧟 Зомбі хапають звіт і <b>ЖУЮТЬ</b> його (цілість падає; 0 — передруковуй). <b>🪠 Вантуз</b> (клавіша <b>1</b>) — і зомбі випльовує звіт.</div>
    <div>6. ☕ <b>Кава-ривок</b> (клавіша <b>3</b>, 3 на раунд) · 📮 <b>пневмопошта</b> між кімнатами · 🚪 пожежні сходи / 🛝 гірка — короткий шлях · 📊 колега з Excel кличе — допоможи, бо стане зомбі · 💯 бездоганний звіт без укусів — бонус.</div>
    <div>7. 🕵️ <b>Саботажник</b>: серед вас (або серед колег-NPC) — шкідник. Він тихо палить сервер, жує принтер, мінує Румбу. Підозрюєш — <b>🚨 Нарада</b> (клавіша <b>8</b>), голосуй. Спіймали — +20 с і +40 🪙; помилились — колега ображається. Якщо саботажник — ти, тобі прийде секретна картка 🤫.</div>
    <div>8. ✈️ <b>Літачок</b> (4; папір — у лотках біля принтера/сканера/столів, світло-блакитне коло, F +3): у колегу — його агресія росте (шкала над головою); у ПК — може заспамити серверну і спричинити 🔥 пожежу; у кулер — калюжа. Злий колега стає <b>😤 зайобуючим</b>: чіпляється, краде папери, заводить інших. Заспокой — <b>кавою, яку він хоче</b> (іконка над головою; на кавоварці F ще раз — перелити в 🥛/🧋).</div>
    <div>9. 🧯 <b>Вогнегасник</b> (6): гасить пожежу, відкидає зомбі; у кріслі на коліщатках — реактивний ривок назад! 🍾 <b>Молотов</b> (7): палаюча калюжа. 🚰 Копни <b>кулер</b> — слизька калюжа, кинь у неї подовжувач — ⚡ електропастка. 🤖 <b>Румба</b> прибирає сміття; примотай до неї молотов (F) — і вона поїде в натовп зомбі.</div>
    <div>10. 🧻 <b>Мʼятий папір</b> (5) — біля 🗑️ смітників (зелене коло, F +5): кидай дугою туди, де курсор. Влучив у смітник — «папірець у смітник»: що далі, то більше 🪙 і XP (до 8 нагород за раунд). 📘 <b>Книжка</b> (2, коли руки вільні) — з 📚 книжкових шаф (помаранчеве коло, F +2): оглушує зомбі, і той випльовує звіт; у колегу — агресія. Кидати: клавіша слота або ЛКМ, коли слот вибрано. Коли чогось 0 — підказка внизу покаже, де взяти.</div>
    <div style="margin-top:6px;color:#6BE7FF"><b>Нове — «детектив»:</b></div>
    <div>11. 🔎 <b>Докази</b>: кожен саботаж лишає сліди на ~90 с — 👣 кавові сліди, 🪪 журнал бейджів (серверна/сховище/кабінети), ⚱️ попіл, 🗜️ локшина з шредера. F — у 🗂️ <b>справу</b>. 📹 Записи камер (кімната, час, розмитий колір сорочки 👕 — кольорове коло під ногами) — на 📹 посту охорони.</div>
    <div>12. 🚨 <b>Збори</b>: клавіша 8 або червона кнопка 🚨 у кімнатах → усім «Негайно в переговорну!» (20 с, далі — телепорт). Там справа, голос «Звільнити …» чи «⏭️ Продовжити роботу» й живі стовпчики голосів.</div>
    <div>13. ⚡ <b>Щиток</b>: блекаут — темрява й ліхтарики, папери не працюють, поки двоє не потримають F біля щитка (або один — міні-гра «3 перемикачі»). 🔥 <b>АВРАЛ</b> останні 2 хв: начальник бігає, зомбі більше, принтер жує частіше.</div>
    <div>14. Таємні ролі: 🛡️ <b>безпековик</b> (раз за раунд таємно перевіряє колегу F) і 🧑‍🎓 <b>стажер</b> (×2 довше, першу нараду пробачать). Побічні справи: 📦 коробки з зони А в 🎯 Б (+25 с), 🧽 калюжі кави (F, +4 с; G — мити будь-де, стирає й сліди!), міні-ігри на ПК (кабелі принтера, набір слова). ☕ Біля кавоварки часом пліткують про саботажника. Фінал — статистика й досягнення.</div>
    <div style="margin-top:8px;color:#FFE066">Жовта стрілка й мітка завжди показують, куди йти зараз. Підказка — внизу екрана 👇</div>
    <button class="btn" style="margin-top:12px;width:100%">Зрозуміло, працюємо!</button></div>`;
  document.body.appendChild(el);
  el.querySelector('button').addEventListener('click', () => { el.remove(); d.intro5 = 1; d.intro2 = 1; d.intro = 1; save(); });
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
      if (near(START.p, 1.6)) return { l: `🗳️ Лобі: голос за поверх і «Я готовий» · ${LAY[ST.nx].n}`, fn: () => { openLobby(); sfx('ui'); } };
      if (near(L.exit, 1.3)) return { l: '⬇️ Ліфт у хаб', fn: () => { leaveDeadline(); goHub('⬇️ Ліфт приїхав у «Гущу». Дедлайн почекає… до 18:00.'); } };
      { const r = pkInteract(); if (r) return r; }
    }
    else {
      // доказ — пріоритетно, але не тоді, коли тут саме треба лагодити поломку
      const urgent = (ST.jam && near(PRINTER.p, 1.4)) || (!ST.pw && near(PANEL.p, 1.3)) || (ST.heat && near(RACK.p, 1.4)) || (!ST.cm && near(COFFEE.p, 1.4)) || (ST.rain && near(VALVE.p, 1.3));
      { const r = interact3(true, near, h) || interact5s(near) || interact5a(near) || (urgent ? null : clueAct()); if (r) return r; }
      if (ST.xl && near(DESKS[ST.xl.i].p, 1.4)) return { l: `📊 Допомогти ${NAMES[ST.xl.i]} з ВПР (набери формулу)`, fn: () => mini('type', () => req('fix', { w: 'excel' }), { w: 'ВПР', at: DESKS[ST.xl.i].p }) };
      if (near(PRINTER.p, 1.4)) {
        if (ST.jam) return { l: '🔧 Витягнути папір і переставити драйвер (міні-гра: кабелі)', fn: () => mini('cable', () => req('fix', { w: 'jam' }), { at: PRINTER.p }) };
        if (h.it === 'sheets') return { l: `📥 Покласти дані в принтер (${h.n} 📄)`, fn: () => req('feed') };
        if (s === 'print' && !h.it) return ST.pw ? { l: '🖨️ Друкувати звіт (тримайся поруч 4 с)', fn: actPrint } : { l: '⚡ Нема світла — принтер мертвий', fn: () => { } };
        return { l: `🖨️ Принтер: даних ${Math.min(ST.fed, ST.need)}/${ST.need}`, fn: () => { } };
      }
      for (const d of DESKS) if (ST.desk[d.i] && !pestOf(d.i) && near(d.p, 1.3)) return h.it && h.it !== 'sheets' ? { l: 'Руки зайняті звітом', fn: () => { } } : { l: `📄 Взяти дані — ${NAMES[d.i]}`, fn: () => req('take', { i: d.i }) };
      if (near(COFFEE.p, 1.4)) return !ST.cm ? { l: '🔧 Полагодити кавоварку (3 с)', fn: () => actFix('cm') } : h.cup ? { l: `🔄 Перелити: ${CUPS[h.cup].ic} → ${CUPS[h.cup % 3 + 1].ic} ${CUPS[h.cup % 3 + 1].n} (1 с)`, fn: actRepour } : { l: '☕ Зварити каву (2,5 с) — начальнику чи колезі', fn: actBrew };
      if (near(VALVE.p, 1.3) && ST.rain) return { l: '🚿 Закрутити вентиль спринклерів (2 с)', fn: () => actFix('rain') };
      if (near(PANEL.p, 1.3) && !ST.pw) return Object.values(NET.players || {}).some(r => r && dist2(r.x, r.z, PANEL.p.x, PANEL.p.z) < 3) ? { l: '⚡ Тримай автомат РАЗОМ з колегою (2 с)', fn: () => actFix('power') } : { l: '⚡ Щиток: 3 перемикачі (міні-гра; удвох — просто тримайте F)', fn: () => mini('sw', () => req('fix', { w: 'power', mg: 1 }), { at: PANEL.p }) };
      if (near(RACK.p, 1.4) && ST.heat) return { l: '🌀 Полагодити вентилятор сервера (3 с)', fn: () => actFix('heat') };
      if (near(bossPos(), 1.7)) {
        if (h.cup && !ST.coffee) return { l: '☕ Віддати каву начальнику', fn: () => req('give') };
        if (h.it === 'report' && s === 'sign') return ST.coffee ? { l: '✍️ Попросити підпис (1,5 с)', fn: () => actSub('sign') } : { l: '👔 «Спершу кава!»', fn: () => bubble(V.boss.ent, 'Без кави не підписую!', true, 2) };
        return { l: '👔 Начальник', fn: () => bubble(V.boss.ent, pick(['Звіт до шостої!', 'Я в тебе вірю. Трохи.', 'А де кава?']), false, 2) };
      }
      for (const w of ['staple', 'stamp', 'number', 'scan']) {
        const S = STEPS[w];
        if (!near(S.at.p, 1.4)) continue;
        if (h.it === 'report' && s === w) return w === 'scan' && ST.fire > 0 ? { l: '🔥 Серверна горить — сканер не працює. Гаси 🧯!', fn: () => { } } : w === 'scan' && ST.heat ? { l: '🔥 Сервер перегрівся — сканер не працює', fn: () => { } } : w === 'scan' && !ST.pw ? { l: '⚡ Нема світла', fn: () => { } } : { l: `${S.ic} ${S.act} (${String(S.t).replace('.', ',')} с)`, fn: () => actSub(w) };
        return { l: `${S.ic} ${S.n.replace(/ \(.*\)/, '')}${ST.steps.includes(w) ? '' : ' — сьогодні не треба'}`, fn: () => { } };
      }
      if (near(SEND.p, 1.5)) return h.it === 'report' && s === 'send' ? { l: '📤 Здати квартальний звіт!', fn: () => { req('send'); sfx('coin'); } } : { l: `📤 Відправка: ${s === 'send' ? 'потрібен звіт у руках' : 'звіт ще не готовий'}`, fn: () => { } };
      { const r = pkInteract() || interact5b(near, h) || interact3(false, near, h); if (r) return r; }
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
    const chaos = [ST.jam ? '🖨️ принтер зажований' : '', !ST.cm ? '💥 кавоварка' : '', !ST.pw ? '⚡ нема світла' : '', ST.heat ? '🔥 сервер' : '', ST.rain ? '💦 спринклери' : '', ST.xl ? '📊 колега з Excel' : '', ST.zom.length > 4 ? '🧟 нарада' : '', ...hud3()].filter(Boolean).join(' · ');
    const rep = ST.si > ST.steps.indexOf('print') && ST.si < ST.steps.length, rc = ST.rhp > 60 ? '#7FE08A' : ST.rhp > 30 ? '#FFD27A' : '#FF5C7A';
    const chew = ST.zom.some(z => z.carry && z.carry.it === 'report');
    const bar = rep ? `<br><span style="font-size:12px">📑 цілість звіту <span style="display:inline-block;width:90px;height:8px;border-radius:4px;background:#4E4A6E;vertical-align:middle"><span style="display:block;width:${Math.round(ST.rhp)}%;height:100%;border-radius:4px;background:${rc}"></span></span> ${Math.round(ST.rhp)}%${chew ? ' · <span style="color:#FF5C7A">🧟 ЖУЮТЬ!</span>' : ST.fly ? ' · 🪂 летить' : ''}${ST.pf ? ' 💯' : ''}</span>` : '';
    h = `${fl} · <span style="font-size:17px;color:${col}">⏰ ${clockStr(ST.t)}</span> · до 18:00: <span style="color:${col}">${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}</span>${mh.it || mh.cup ? ` · у руках ${mh.it ? ITEM[mh.it].ic + (mh.n > 1 ? '×' + mh.n : '') : ''}${mh.cup ? '☕' : ''}` : ''}${V.dashT > 0 ? ' · ☕💨' : ''}${V.act ? ` · ${V.act.ic} ${Math.round(V.act.t / V.act.need * 100)}%` : ''}${bar}${chaos ? `<br><span style="font-size:12px;color:#FF8A7A">${chaos}</span>` : ''}`;
    const rows = ST.steps.map((id, i) => { const S = STEPS[id], done = i < ST.si, now = i === ST.si; return `<div style="${done ? 'opacity:.6;text-decoration:line-through' : now ? 'color:#FFE066' : 'opacity:.85'}">${done ? '✅' : now ? '▶' : '⬜'} ${S.ic} ${S.n}${id === 'data' ? ` <b>${Math.min(ST.fed, ST.need)}/${ST.need}</b>` : ''}${id === 'sign' && ST.coffee ? ' ☕✔' : ''}</div>`; }).join('');
    const lv = `<div style="font:800 13px system-ui;margin-bottom:3px">📋 Чекліст звіту${ST.lv ? ` · рівень ${ST.lv + 1}` : ''}</div>`;
    if (V.list.innerHTML !== lv + rows) V.list.innerHTML = lv + rows;
  } else {
    const nx = LAY[ST.nx], vo = ST.vo.some(Boolean) ? ' · 🗳️ ' + LAY.map((q, i) => `${q.fl}: ${ST.vo[i]}`).join(' · ') : '';
    h = `${fl} · ⏰ 17:53 · <span style="font-weight:600">звіт ще не почато</span><br><span style="font-size:12px">🛗 наступний раунд: <b style="color:${nx.pc}">${nx.n}</b>${vo}</span>`;
  }
  const ph = pkHint(), gt = V.goal && V.goal.txt ? `👉 ${V.goal.txt}${ph ? `<br><span style="font-size:12px;color:#3E2F7A">${ph}</span>` : ''}${ST.on && V.sab && !ST.sbC ? `<br><span style="font-size:12px;color:#7A1F3D">🕵️ Ти — саботажник: клавіша <b>8</b> біля сервера, принтера, кавоварки, щитка, вентиля, столу з даними чи Румби${V.sbcd > 0 ? ` (перезарядка ${Math.ceil(V.sbcd)} с)` : ''}. І роби вигляд, що працюєш!</span>` : ''}` : ''; V.goalEl.style.display = gt ? '' : 'none'; if (V.goalEl.innerHTML !== gt) V.goalEl.innerHTML = gt;
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
    const lvl = !ST.on ? 0 : left < AVRAL || ST.av ? 2 : 1;   // 🔥 аврал — швидший, тривожніший джаз
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
    if (lvl === 2) hat(t, .025, false);
    if (lvl === 2 && s % 2 === 0) pulse(t, root + 24 + (s % 8 === 6 ? 6 : 0), STEP * .9, .05);
  };
}

/* ---------- Режим у паузі, вкладка, картка в меню ---------- */
function goDeadline() {
  const f = $('#fade'); closePanel(); if (f) f.style.opacity = 1; sfx('travel');
  V.lobHide = false;
  setTimeout(() => { toLobby(`⏰ ${L.n}! Обери поверх у вікні лобі й тисни «✅ Я готовий».`); if (f) f.style.opacity = 0; intro(); }, 260);
  return true;
}
function leaveDeadline() { V.act = null; V.lobHide = false; closeLobby(); if (myHeld().it || myHeld().cup) req('drop'); V.barOn = false; if (typeof modeBar === 'function') modeBar(null); return true; }
if (A.mode) A.mode({ id: 'deadline', ic: '⏰', n: 'Дедлайн о 18:00', sub: 'кооп до 5 (з ботами): три поверхи хмарочоса, звіт до 18:00', go: goDeadline, here: () => running && floorOf(pl.x, pl.z) >= 0, leave: leaveDeadline });
A.tab('deadline', '⏰ Дедлайн', () => {
  const d = A.data(), here = floorOf(pl.x, pl.z) >= 0, fl = d.floors || {};
  return `<h3>⏰ Дедлайн о 18:00</h3>
    <p style="font-size:13px;line-height:1.5;margin:4px 0 10px">Кооператив до 5 учасників (люди + 🤖 боти) на високих поверхах хмарочоса в центрі міста. 17:53, п’ятниця. Квартальний звіт треба здати до 18:00 — а принтер жує папір, кавоварка вибухає, а зомбі-офісники на нараді гризуть звіти.</p>
    <div class="btns"><button class="btn alt" data-dl="help">❓ Як грати</button>${here ? (ST.on ? '' : '<button class="btn" data-dl="lobby">🗳️ Лобі</button>') : '<button class="btn" data-dl="go">🛗 На поверх</button>'}</div>
    <div class="list" style="margin-top:10px;font-size:13px;line-height:1.55">
      <div>🏙️ <b>Поверхи</b>: 42 · Опенспейс (класичний офіс з коридором) · 57 · Банк (сховище, операційний зал, кільцева галерея) · 63 · Стартап (атріум зі скляним мостом, мейл-рум, бариста-бар, гірка). Поверх обирають голосуванням у вікні 🗳️ Лобі; раунд стартує, коли всі готові (онлайн — щонайпізніше за 20 с після першого «готового»).</div>
      <div>📄 <b>Дані</b> — у колег з 📄 над головою (F біля столу). Неси в 🖨️ принтер, друкуй (тримайся поруч 4 с).</div>
      <div>📋 <b>Чекліст</b> щораунду інший: 3 з 5 — 📎 степлер, 🔏 печатка, 🗂️ реєстраційний номер, 📠 скан, ✍️ підпис начальника (спершу ☕ кава!). Потім 📤 «Відправка».</div>
      <div>📑 <b>Звіт — гаряча картопля</b>: важкий (повільніше ходиш), кидай напарнику дугою через перегородки (клавіша 2). Зомбі перехоплюють і <b>жують</b> звіт — 0% цілості = передрук.</div>
      <div>🪠 <b>Вантуз</b> (клавіша 1): присмоктується до зомбі — той випльовує звіт. ☕ <b>Кава-ривок</b> (3): 3 ривки на раунд.</div>
      <div>📮 Пневмопошта між кімнатами · 🚪 пожежні сходи / 🛝 гірка — короткий шлях · 📊 колега з Excel кличе на допомогу (не допоможеш — стане зомбі; допоможеш — +1 ривок) · 💯 бездоганний звіт без укусів — +30 🪙.</div>
      <div>💥 <b>Хаос</b>: принтер, кавоварка, світло (щиток), сервер (вентилятор), спринклери (вентиль). F і тримайся поруч.</div>
      <div>🕵️ <b>Саботажник</b>: онлайн від 3 гравців — один з вас (рідше й при двох), інакше — хтось із колег-NPC. Лише він бачить картку «🕵️ Ти — САБОТАЖНИК» і замість наради має клавішу 8 «Саботаж» (сервер, принтер, кавоварка, щиток, вентиль, дані на столах, міна в Румбу, сміття). 🚨 <b>Нарада</b> (8, раз за раунд): голосування; спіймали — +20 с до дедлайну й +40 🪙, помилились — ображений колега стає 😤 або годинник біжить на 20 с. Свідки після саботажу колеги-NPC дають алібі двом невинним. Не спіймали і зірвали дедлайн — саботажник виграє.</div>
      <div>🔎 <b>Детектив</b>: саботаж лишає 👣 сліди, 🪪 журнал бейджів, ⚱️ попіл / 🗜️ локшину (F — у 🗂️ справу), 📹 камери з кольором сорочки 👕 — на посту охорони. 🚨 <b>Збори</b> (8 або червона кнопка): усі біжать у переговорну, голосують «Звільнити …» / «⏭️ Продовжити роботу». Ролі: 🛡️ безпековик (таємна перевірка), 🧑‍🎓 стажер (повільний, але першу нараду пробачать). Саботажнику: 💻 злам сервера й 🗂️ документи (🔥 / 🗜️) — міні-ігри, очки саботажу; зрідка — 🪑 таємне «5 м на кріслі».</div>
      <div>⚡ <b>Щиток</b>: блекаут — ліхтарики, папери стоять, поки двоє не потримають F (чи 3 перемикачі наодинці). 🔥 <b>АВРАЛ</b> останні 2 хв. 📦 Коробки А → 🎯 Б (+25 с), 🧽 калюжі (F, +4 с; G — мити, стирає й сліди). ☕ Плітки біля кавоварки, 📢 голос начальника. Розклад точок щораунду інший.</div>
      <div>✈️ <b>Літачок</b> (4; на старті 2, ще — F біля лотків з папером, +3) · 😤 <b>агресія колег</b>: влучив у колегу — шкала над головою росте; повна — колега стає «зайобуючим» зомбі: ходить за людьми, відволікає, ставить підніжки, краде папери й каву та заводить сусідів (ланцюгова реакція!). Заспокоює лише кава, яку він хоче (☕ еспресо · 🥛 лате · 🧋 раф — на кавоварці F ще раз переливає). Літачок у ПК може заспамити серверну → 🔥 пожежа.</div>
      <div>🧯 <b>Вогнегасник</b> (6): гасить серверну, відкидає зомбі й «зайобуючих»; сидиш у кріслі на коліщатках — реактивний ривок у протилежний бік. Заправка — біля 🚿 вентиля (F). 🍾 <b>Молотов</b> (7, 2 на раунд): палаюча калюжа на 6 с. 🚰 <b>Кулер</b>: копни (F) чи влуч літачком/кріслом — калюжа; F «подовжувач» — ⚡ електропастка, що оглушує всіх у ній. 🤖 <b>Румба</b> прибирає папірці; F з молотовом — примотати, і вона везе його в натовп зомбі.</div>
      <div>🧻 <b>Мʼятий папір</b> (5; F біля 🗑️ смітників, +5) і 📘 <b>книжка</b> (2, коли руки вільні; F біля 📚 шаф, +2) летять дугою туди, де курсор (клавіша або ЛКМ на вибраному слоті). Папірець у смітник здалеку — 🪙 і XP (що далі, то більше, до 8 нагород за раунд). Книжка оглушає зомбі (звіт випльовує) і злить колег.</div>
      <div>🤖 <b>Боти</b>: у раунді 5 учасників — після першого «✅ Я готовий» лобі доповнюють боти (Кент, Віта, Толік…). У раунді вони носять дані в принтер, лагодять поломки, гасять серверну й проганяють зомбі від людей.</div>
      <div>⭐ Зірки — за запас часу. Кожна перемога підвищує складність, а ліфт без голосів везе на наступний поверх.</div>
    </div>
    <p class="muted" style="font-size:12px;margin-top:10px">Раундів: ${d.rounds || 0} · звітів здано: ${d.wins || 0} · бездоганних: ${d.perfect || 0} · поверхи підкорено: ${LAY.map((q, i) => fl[i] ? q.fl + '✅' : q.fl + '⬜').join(' ')} · найбільший запас: ${d.best ? Math.floor(d.best / 60) + ':' + String(d.best % 60).padStart(2, '0') : '—'} · найкраща оцінка: ${'⭐'.repeat(d.stars || 0) || '—'} · хаосу приборкано: ${d.fixes || 0}</p>`;
}, e => {
  const b = e.target.closest('[data-dl]'); if (!b) return; const a = b.dataset.dl;
  if (a === 'help') { closePanel(); intro(true); } else if (a === 'go') goDeadline(); else if (a === 'lobby') { closePanel(); openLobby(); }
});
if (!SIMSIDE && typeof document !== 'undefined') {
  const box = document.querySelector('#main-menu .mm-container');
  if (box && !document.getElementById('mm-deadline')) {
    const card = document.createElement('div'); card.className = 'mm-card'; card.id = 'mm-deadline';
    card.innerHTML = `<div class="mm-img-wrap"><div class="mm-card-img" style="background-image:url('menu/deadline-bg.jpg'),url('addons/deadline/deadline-bg.jpg'),linear-gradient(160deg,#FF8A7A,#B07CF0 55%,#2E2346)"></div></div>
      <div class="mm-card-body"><h2>ДЕДЛАЙН</h2><div class="mm-subtitle">О 18:00</div>
      <div class="mm-desc">Квартальний звіт за 7 хвилин на 42-му, 57-му чи 63-му поверсі: принтер, печатки, кава начальнику, звіт-«гаряча картопля» і вантуз проти зомбі. Кооп до 5: боти доповнюють команду.</div></div>`;
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
/* ======================= v3 у гравця: набір, ефекти, моделі, шкали агресії, нарада, картка ролі ======================= */
Object.assign(V, { pp: PP_N, bk: 0, pb: PB_N, binN: 0, tsCd: 0, pkCd: {}, pkEl: new Map(), pkAnim: [], pkHi: '', mol: MOL_N, ext: 100, mc: 1, sab: false, wasSab: false, sbcd: 0, stunT: 0, slowT: 0, ppCd: 0, exCd: 0, rid3: -1, roleRid: -1, roleT: 0, zapId: 0, hurtT: 0, slipT: 0, litT: 0,
  m3: { ps: new Map(), pp: new Map(), th: new Map(), li: new Map(), bu: new Map(), mo: new Map(), rb: null, pud: null, fire: null }, agEl: new Map(), agBox: null, mtEl: null, mtSig: '' });
/* кулер (на 57-му й 63-му — новий; на 42-му вже стоїть) і док-станція Румби */
function decoExtra(K, Lx) {
  if (Lx.vi !== 0) { const c = COOLER.l; K.cyl(c.x, .5, c.z, .22, .22, 1, '#E8E3F0', 10, .3); K.cyl(c.x, 1.2, c.z, .18, .2, .45, '#8FD9FF', 10); K.box(c.x, 1.03, c.z, .26, .06, .26, '#4E4A6E'); }
  if (!K.g) return;
  const d = dock(); K.box(d.x - OX, .03, d.z - OZ, .9, .04, .9, '#4E4A6E'); K.glow(d.x - OX, .06, d.z - OZ - .38, .5, .02, .06, '#7FE08A');
}
const can3 = () => running && !pl.dead && ST.on && inOffice(pl.x, pl.z) && !ST.mt;
const angTo = (o, b = pl.face) => Math.abs(((Math.atan2(o.x - pl.x, o.z - pl.z) - b + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
// куди цілимось: на курсор миші (якщо він на підлозі), інакше — куди дивишся
const aimBase = () => typeof input !== 'undefined' && input.aimOk && dist2(pl.x, pl.z, input.ax, input.az) > 1 ? Math.atan2(input.ax - pl.x, input.az - pl.z) : pl.face;
function aimAt(list, cone, maxD, base) {
  let best = null, bs = 1e9;
  for (const o of list) { const d = dist2(pl.x, pl.z, o.x, o.z), da = angTo(o, base); if (d > maxD || d < .4 || da > cone) continue; if (d + da * 6 < bs) { bs = d + da * 6; best = o; } }
  return best;
}
/* ✈️ літачок: летить туди, куди дивишся (легке самонаведення на колегу, ПК, кулер чи зомбі) */
function throwPlane() {
  if (!can3() || V.ppCd > 0) return;
  if (V.pp <= 0) { emptyToast('pp'); return; }
  const b0 = aimBase(), tg = aimAt([...DESKS.filter(d => !pestOf(d.i)).map(d => colPos(d.i)), ...DESKS.map(d => ({ x: d.x, z: d.z - .15 })), ...ST.pst, ...ST.zom, COOLER.o], .3, 12, b0);
  const a = tg ? Math.atan2(tg.x - pl.x, tg.z - pl.z) : b0; pl.face = a;
  V.pp--; V.ppCd = .5; req('plane', { a: r2(a) }); sfx('throw');
}
/* 🧯 вогнегасник: струмінь піни (−15% заряду); у кріслі на коліщатках — реактивний ривок у протилежний бік */
function foamFX(x, z, a) { for (let k = 1; k <= 6; k++) burst(x + Math.sin(a) * k * .8, 1.1 - k * .1, z + Math.cos(a) * k * .8, '#F4F8FF', 3, 1.4 + k * .3, .5, 1); }
function spray(a) {
  if (!can3() || V.exCd > 0) return;
  if (V.ext < 15) { toast('🧯 Вогнегасник порожній — заправ біля 🚿 вентиля (F).'); return; }
  const chair = !!(pl.ride && pl.ride.kind === 'chair');
  if (a == null) {
    const C = fireC(), t = chair ? null : ST.fire > 0 && dist2(pl.x, pl.z, C.x, C.z) < fireR() + 5 ? C : aimAt([...ST.zom.filter(z => z.stun <= 0), ...ST.pst], .6, 5.5);
    a = t ? Math.atan2(t.x - pl.x, t.z - pl.z) : pl.face;
  }
  if (!chair) pl.face = a;
  V.ext -= 15; V.exCd = .6; req('foam', { a: r2(a) }); sfx('splash'); foamFX(pl.x, pl.z, a);
  if (chair) { knockMe(a + Math.PI, 22); ftext(pl.x, 2.6, pl.z, '🧯💨 Реактивне крісло!', 'gold'); shake = Math.max(shake, .25); }
}
/* 🍾 молотов: у найгустіший натовп попереду (або на 7 м уперед) */
function throwMolotov() {
  if (!can3()) return;
  if (V.mol <= 0) { toast('🍾 Молотови скінчились (2 на раунд).'); return; }
  const mobs = [...ST.zom, ...ST.pst]; let best = null, bn = -1e9;
  for (const z of mobs) { const d = dist2(pl.x, pl.z, z.x, z.z), da = angTo(z); if (d > 10 || d < 1.5 || da > 1) continue; const n = mobs.filter(o => dist2(o.x, o.z, z.x, z.z) < 2.5).length - da; if (n > bn) { bn = n; best = z; } }
  const a = best ? Math.atan2(best.x - pl.x, best.z - pl.z) : pl.face;
  pl.face = a; V.mol--; req('molo', { x: r2(best ? best.x : pl.x + Math.sin(a) * 7), z: r2(best ? best.z : pl.z + Math.cos(a) * 7) }); sfx('throw');
}
function callMeeting() {
  if (!can3()) return;
  if (V.mc <= 0) { toast('🚨 Нараду можна скликати лише раз за раунд.'); return; }
  req('meet');
}
/* 🕵️ саботаж (лише саботажник): найближча ціль у межах 2,2 м, 2,5 с «тихої роботи» */
function sabTarget() {
  const T = [];
  if (ST.fire <= 0) T.push({ w: 'fire', p: RACK.p, l: 'Тихенько підпалюю серверну' });
  if (!ST.jam) T.push({ w: 'jam', p: PRINTER.p, l: 'Запихаю скріпку в принтер' });
  if (ST.cm) T.push({ w: 'boom', p: COFFEE.p, l: 'Відкручую клапан кавоварки' });
  if (ST.pw) T.push({ w: 'power', p: PANEL.p, l: 'Вимикаю автомати' });
  if (!ST.rain) T.push({ w: 'rain', p: VALVE.p, l: 'Відкриваю спринклери' });
  for (const d of DESKS) if (ST.desk[d.i] && !pestOf(d.i)) T.push({ w: 'steal', i: d.i, p: d.p, l: `Перекладаю дані ${NAMES[d.i]} у чужу шухляду` });
  if (ST.rb && !ST.rb.arm && !ST.rb.dead) T.push({ w: 'mine', p: ST.rb, l: 'Примотую міну до Румби' });
  return T.filter(t => dist2(pl.x, pl.z, t.p.x, t.p.z) < 2.2).sort((a, b) => dist2(pl.x, pl.z, a.p.x, a.p.z) - dist2(pl.x, pl.z, b.p.x, b.p.z))[0] || null;
}
function sabotage() {
  if (!can3() || !V.sab || ST.sbC || V.act) return;
  if (V.sbcd > 0) { toast(`🕵️ Не так часто — це підозріло! Ще ${Math.ceil(V.sbcd)} с.`); return; }
  const t = sabTarget();
  if (!t) { req('sab', { w: 'litter' }); return; }                                   // поруч нічого — хоч сміття розкидати
  startAct(() => req('sab', { w: t.w, i: t.i }), 2.5, () => t.w === 'mine' && ST.rb ? ST.rb : t.p, '🕵️', t.l, () => '');
}
/* F (v3): first — термінове (пожежа, правильна кава «зайобуючому»), інакше — після робочих точок */
function interact3(first, near, h) {
  if (first) {
    if (ST.mt) return { l: '🚨 Нарада — голосуй у вікні наради', fn: () => { } };
    if (ST.fire > 0 && near(fireC(), fireR() + 3)) return V.ext >= 15 ? { l: '🧯 Гасити пожежу в серверній', fn: () => spray(Math.atan2(fireC().x - pl.x, fireC().z - pl.z)) } : { l: '🧯 Вогнегасник порожній — заправ біля 🚿 вентиля', fn: () => { } };
    for (const q of ST.pst) if (near(q, 1.8) && h.cup && h.cup === q.want) return { l: `${CUPS[h.cup].ic} Пригостити ${NAMES[q.i]} — саме ${CUPS[q.want].n}!`, fn: () => req('serve', { id: q.id }) };
    return null;
  }
  for (const q of ST.pst) if (near(q, 1.8)) return h.cup ? { l: `${CUPS[h.cup].ic} Пригостити ${NAMES[q.i]} (хоче ${CUPS[q.want].ic} — не те!)`, fn: () => req('serve', { id: q.id }) } : { l: `😤 ${NAMES[q.i]} хоче ${CUPS[q.want].ic} ${CUPS[q.want].n} — звари на кавоварці`, fn: () => { } };
  if (ST.rb && !ST.rb.dead && near(ST.rb, 1.6)) return ST.rb.arm ? { l: '🤖💣 Румба вже заряджена — тікай!', fn: () => { } } : V.mol > 0 ? { l: '🍾 Примотати молотов скотчем до Румби', fn: () => req('arm') } : { l: '🤖 Румба прибирає папірці', fn: () => { } };
  if (near(COOLER.p, 1.3) && !ST.pud) return { l: '🦶 Копнути кулер (слизька калюжа)', fn: () => { req('kick'); sfx('hit'); } };
  if (ST.pud && !ST.pud.el && near(ST.pud, ST.pud.r + 1.6)) return { l: `🔌 Кинути подовжувач у калюжу — ⚡ електропастка${near(ST.pud, ST.pud.r) ? ' (ти стоїш у ній! 😬)' : ''}`, fn: () => req('zap') };
  if (near(VALVE.p, 1.3) && V.ext < 100) return { l: `🧯 Заправити вогнегасник (${Math.round(V.ext)}%)`, fn: () => { V.ext = 100; sfx('pour'); ftext(pl.x, 2.5, pl.z, '🧯 100%', 'gold'); } };
  return null;
}
/* «що робити зараз» (v3) */
function goal3(h, s) {
  if (ST.fire > 0 && (s === 'scan' || ST.fire > 50)) return V.ext >= 15 ? { id: 'fire', tg: fireC(), txt: `🔥 <b>Серверна горить</b> (${Math.round(ST.fire)}%)${s === 'scan' ? ' — сканер не працює' : ''}! Гаси 🧯 вогнегасником: клавіша <b>6</b> або F поруч.` }
    : { id: 'refill', tg: VALVE.p, txt: '🧯 Вогнегасник порожній — заправ біля 🚿 вентиля (F), а тоді гаси серверну!' };
  if (h.cup) { const q = ST.pst.filter(o => o.want === h.cup).sort((a, b) => dist2(pl.x, pl.z, a.x, a.z) - dist2(pl.x, pl.z, b.x, b.z))[0]; if (q) return { id: 'pest', tg: q, txt: `${CUPS[h.cup].ic} Пригости <b>${NAMES[q.i]}</b> — він(вона) хоче саме ${CUPS[q.want].n} (F поруч).` }; }
  return null;
}
function hud3() { return [ST.fire > 0 ? `🔥 серверна ${Math.round(ST.fire)}%` : '', ST.pst.length ? `😤 зайобуючих: ${ST.pst.length}` : '', ST.pud ? (ST.pud.el ? '⚡ електропастка' : '💦 калюжа') : '', ST.rb && ST.rb.arm ? '🤖💣 Румба заряджена' : '', ST.mt ? '🚨 збори' : '', ST.sbC ? '🕵️ саботажника спіймано' : '', ST.av ? '🔥 АВРАЛ' : '', ST.cs.length ? `🗂️ у справі: ${ST.cs.length}` : '', ST.cl.length ? `🔎 доказів на підлозі: ${ST.cl.length}` : '', ST.bx && ST.bx.done < ST.bx.need ? `📦 ${ST.bx.done}/${ST.bx.need}` : '', ST.mp5.length ? `🧽 калюж: ${ST.mp5.length}` : '']; }

/* ---------- Події v3 ---------- */
const PEST_TALK = { talk: ['А ти бачив мій мем у загальному чаті?', 'Слухай, а в мене відпустка в серпні…', 'Давай швиденько обговоримо KPI?', 'Хто знову забрав мою чашку?!'], block: ['Маєш хвилинку? Одну!', 'Стоп! А ти підписав мою службову?'], trip: ['Ой, вибач, нога сама!', 'Обережно, тут слизько 😈'], steal: ['Це я позичу!', 'О, папірці! Мої тепер.'] };
function pestEnt(id, i) { const m = V.m3.ps.get(id); return m ? m.ent : V.cols[i] ? V.cols[i].ent : null; }
function onEvent3(e, here, nm) {
  const k = e.k, me = isMe(e.who);
  if (k === 'toss') { if (here && !me) sfx('throw'); return true; }
  if (k === 'thit') { if (here) tossHit(e, me); return true; }
  if (k === 'pest') {
    if (here) { banner(`😤 ${NAMES[e.i]} ${e.why === 'fired' ? 'образився(лась) після наради' : e.why === 'chain' ? 'заразився(лась) від колеги' : 'дійшов(ла) до точки кипіння'} — тепер ЗАЙОБУЄ всіх! Заспокоїть ${CUPS[e.want].ic} ${CUPS[e.want].n}.`); sfx('warn'); }
  } else if (k === 'pester') {
    const en = pestEnt(e.id, e.i); if (here && en) bubble(en, pick(PEST_TALK[e.w] || PEST_TALK.talk), true, 2);
    if (isMe(e.to) && running && !pl.dead) {
      if (e.w === 'talk') { V.stunT = 1.6; ftext(pl.x, 2.6, pl.z, '🗣️ Тебе заговорили…', 'bad'); }
      else if (e.w === 'block') { knockMe(+e.a || 0, 8, 'Загородив дорогу!'); V.slowT = 2; }
      else if (e.w === 'trip') { knockMe(+e.a || 0, 14, 'Підніжка! 🦶'); shake = Math.max(shake, .3); }
      else if (e.w === 'steal') toast(e.st === 'sheets' ? '😤 «Зайобуючий» колега поцупив твої 📄 дані! Пригости його кавою чи збий з ніг 🧯 — і він їх кине.' : '😤 Колега випив твою каву! Звари ще.');
      sfx('hurt');
    }
  } else if (k === 'calm') {
    if (here) { toast(`☕ ${NAMES[e.i]} заспокоївся(лась)${e.who && !me ? ' — дякуючи ' + nm : ''}! «Саме ${CUPS[e.c || 1].n}… дякую, я вже за столом.»`); sfx('drink', e.x, e.z); burst(+e.x, 1.6, +e.z, '#7FE08A', 10, 2, .6, 2); }
  } else if (k === 'wrong') {
    const en = pestEnt(e.id, e.i); if (here && en) bubble(en, `Я ж хотів ${CUPS[e.want].ic} ${CUPS[e.want].n}!`, true, 2.2);
    if (me) toast(`😤 Не та кава! ${NAMES[e.i]} хоче ${CUPS[e.want].ic} <b>${CUPS[e.want].n}</b>. На кавоварці F ще раз — перелити.`);
  } else if (k === 'phit') {
    if (!here) return true;
    if (e.w === 'col') { ftext(+e.x, 2.5, +e.z, '😠 +агресія', 'bad'); if (V.cols[e.i]) bubble(V.cols[e.i].ent, pick(['Хто кинув?!', 'Ще раз — і я за себе не ручаюсь!', 'Я працюю, взагалі-то!']), true, 1.8); }
    else if (e.w === 'pc') { if (e.sp) { banner('🖥️ Літачок влучив у ПК — той заспамив серверну! Зараз задимить…'); sfx('warn'); } else ftext(+e.x, 2.3, +e.z, '🖥️ Бемц!', 'gold'); }
    else if (e.w === 'pest') ftext(+e.x, 2.6, +e.z, '😤 Ще й літачком?!', 'bad');
    else ftext(+e.x, 2.6, +e.z, '✈️ Влучив!', 'gold');
    sfx('hit', +e.x, +e.z);
  } else if (k === 'plane' || k === 'molo') { if (here && !me) sfx('throw'); }
  else if (k === 'ignite') { if (here) { burst(+e.x, .5, +e.z, '#FF8A3C', 22, 3, .8, 3); sfx('boom', +e.x, +e.z); } }
  else if (k === 'fire') { if (here) { banner(e.txt || '🔥 СЕРВЕРНА ГОРИТЬ! Гаси 🧯 вогнегасником (клавіша 6).'); sfx('warn'); } }
  else if (k === 'foam') {
    if (here && !me) { foamFX(+e.x, +e.z, +e.a); sfx('splash', +e.x, +e.z); if (running && !pl.dead && dist2(pl.x, pl.z, +e.x, +e.z) > .6 && coneHit({ x: +e.x, z: +e.z }, +e.a, pl.x, pl.z, 5, .5)) knockMe(+e.a, 12, '🧯 Піною в обличчя!'); }
  } else if (k === 'spill') { if (here) { banner('💦 Кулер перекинуто — калюжа! Слизько… Кинь подовжувач (F) — буде ⚡ пастка.'); burst(COOLER.pc.x, .4, COOLER.pc.z, '#8FD9FF', 16, 3, .6, 2); sfx('splash', COOLER.pc.x, COOLER.pc.z); } }
  else if (k === 'zap') { if (here) { banner('⚡ ЕЛЕКТРОПАСТКА! Усіх у калюжі трусить!'); sfx('boom'); shake = Math.max(shake, .4); } }
  else if (k === 'arm') { if (me) V.mol = Math.max(0, V.mol - 1); if (here) toast(`🍾 ${nm} ${me ? 'примотав' : 'примотує'} молотов до Румби — вона їде в натовп зомбі!`); }
  else if (k === 'rboom') {
    if (!here) return true;
    if (typeof boomFX === 'function') boomFX(+e.x, +e.z, 3, .4); sfx('boom', +e.x, +e.z); shake = Math.max(shake, .5);
    toast(e.kind === 2 ? '💣 Замінована Румба вибухнула! Хтось її підготував…' : '🤖💥 Румба-камікадзе рознесла натовп зомбі!');
    const d = dist2(pl.x, pl.z, +e.x, +e.z); if (running && !pl.dead && d < 4) { knockMe(Math.atan2(pl.x - e.x, pl.z - e.z), 16, 'БАБАХ! 🤖'); pl.hp = Math.max(1, pl.hp - (e.kind === 2 ? 8 : 4)); }
  }
  else if (k === 'clean') { if (here) burst(+e.x, .2, +e.z, '#FFFFFF', 3, 1, .3, 1); }
  else if (k === 'meet') { V.act = null; if (me) V.mc = 0; if (V.mg) miniDone(false, 1); if (here) { banner(`🚨 Негайно в переговорну! Збори скликав(ла) ${nm} — 20 с, щоб дійти.`); sfx('warn'); } }
  else if (k === 'mres') {
    if (here) verdict(e);
    if (here && !e.imm) banner(!e.out ? '🤷 Нарада нічого не вирішила — працюємо далі.' : e.ok ? `🕵️ Спіймали! ${escapeHTML(e.nm)} — САБОТАЖНИК! +20 с до дедлайну` : `😬 ${escapeHTML(e.nm)} — не саботажник! ${String(e.out).startsWith('npc:') ? 'Колега образився(лась) і став(ла) 😤' : 'Нарада з’їла 20 с'}`);
    if (here) sfx(e.ok ? 'level' : 'hurt');
  }
  else if (k === 'sabo') {
    if (here && !e.q) { banner(`🕵️ Саботаж: ${SABW[e.w] || '?'}${e.room ? ' · ' + e.room : ''}!`); if (e.cl && e.cl.length) toast(`👀 Свідки кажуть: це точно не ${e.cl.map(escapeHTML).join(' і не ')} — вони були на перекурі.`); }
    if (e.hu && V.sab) { V.sbcd = SAB_CD; toast('🕵️ Готово. Тепер — роби вигляд, що працюєш…'); }
  }
  else return false;
  return true;
}

/* ---------- Картка ролі (лише своя) ---------- */
function roleCard(sab) {
  if (SIMSIDE || typeof document === 'undefined') return;
  let el = document.getElementById('dl-role');
  if (!el) { el = document.createElement('div'); el.id = 'dl-role'; el.style.cssText = 'position:fixed;left:50%;top:16%;transform:translateX(-50%);z-index:30;width:max-content;max-width:min(440px,92vw);border-radius:16px;padding:14px 18px;font:14px/1.45 system-ui,sans-serif;color:#fff;box-shadow:0 12px 36px rgba(0,0,0,.45);cursor:pointer;text-align:center'; el.addEventListener('click', () => { el.style.display = 'none'; }); document.body.appendChild(el); }
  el.dataset.role = sab ? 'sab' : 'crew'; el.dataset.extra = V.role || '';
  el.style.background = sab ? 'linear-gradient(160deg,#7A1F3D,#2E2346)' : 'linear-gradient(160deg,#2F8F7A,#2E2346)';
  el.innerHTML = sab ? `<div style="font:900 22px system-ui">🕵️ Ти — САБОТАЖНИК</div><div>Тихо зривай дедлайн: клавіша <b>8</b> біля сервера 🔥, принтера 🖨️, кавоварки ☕, щитка ⚡, вентиля 🚿, столу з даними 📄 чи Румби 💣 (2,5 с, перезарядка ${SAB_CD} с). Біля сервера F — 💻 злам (міні-гра), біля архівних шаф 🗂️ — знищити документи (🔥 швидко й гучно чи 🗜️ тихо). Кожен саботаж лишає 👣 сліди, 📹 камери й 🪪 бейджі — 🧽 мийка (G) стирає сліди. Не попадись на зборах!</div><div style="opacity:.7;font-size:12px;margin-top:6px">🤫 цю картку бачиш лише ти · клікни, щоб сховати</div>`
    : `<div style="font:900 20px system-ui">👔 Ти — сумлінний працівник</div><div>Серед ${ST.sk === 'p' ? '<b>гравців</b>' : '<b>колег</b>'} ховається 🕵️ саботажник. Збирай 🔎 докази (F) у 🗂️ справу й скликай 🚨 <b>збори</b> (клавіша 8 або червона кнопка, раз за раунд).</div>${V.role === 'sec' ? '<div style="margin-top:6px;color:#6BE7FF"><b>🛡️ Ти ще й БЕЗПЕКОВИК:</b> раз за раунд F біля колеги — таємна перевірка (результат бачиш лише ти).</div>' : V.role === 'int' ? '<div style="margin-top:6px;color:#FFD27A"><b>🧑‍🎓 Ти СТАЖЕР:</b> завдання робиш удвічі довше, зате перше звинувачення на зборах тобі пробачать.</div>' : ''}<div style="opacity:.7;font-size:12px;margin-top:6px">клікни, щоб сховати</div>`;
  el.style.display = ''; V.roleT = 6;
}

/* ---------- Вікно наради ---------- */
function meetUI() {
  const M = ST.mt, show = !!(running && !pl.dead && ST.on && M && M.ph !== 'go' && inOffice(pl.x, pl.z) && !panel);
  if (!show) { if (V.mtEl && V.mtEl.style.display !== 'none') { V.mtEl.style.display = 'none'; V.mtSig = ''; } return; }
  if (!V.mtEl) {
    V.mtEl = document.createElement('div'); V.mtEl.id = 'dl-meet';
    V.mtEl.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:35;width:min(520px,92vw);max-height:84vh;overflow:auto;background:#2E2346;color:#fff;border-radius:18px;padding:16px 18px;font:14px/1.45 system-ui,sans-serif;box-shadow:0 14px 44px rgba(0,0,0,.5);text-align:center;border:3px solid #FF5C7A';
    V.mtEl.addEventListener('click', ev => { const b = ev.target.closest('[data-mv]'); if (b && !b.disabled) { req('mvote', { i: +b.dataset.mv }); sfx('ui'); } });
    document.body.appendChild(V.mtEl);
  }
  const k = myKey(), voted = M.who.some(w => w === k || isMe(w)), npc = ST.sk !== 'p', tot = Math.max(1, M.who.length);
  const bs = 'border:0;border-radius:10px;padding:6px 10px;font:700 12px system-ui;cursor:pointer;';
  // кожен підозрюваний: кнопка «Звільнити» + живий стовпчик голосів
  const rows = M.c.map((c, i) => c === k || isMe(c) ? '' : `<div style="display:flex;align-items:center;gap:6px;margin:3px 0"><button class="dlm-c" data-mv="${i}" ${voted ? 'disabled' : ''} style="${bs}min-width:150px;text-align:left;background:${npc && ST.clr.includes(+c.slice(4)) ? '#4E6B5E' : '#FFE066'};color:#2E2346">${npc && ST.clr.includes(+c.slice(4)) ? '✅' : '🗂️'} Звільнити ${escapeHTML(M.n[i])}</button><div style="flex:1;height:12px;border-radius:6px;background:#4E4A6E"><div class="dlm-bar" style="height:12px;border-radius:6px;width:${Math.round((M.cnt[i] || 0) / tot * 100)}%;background:#FF5C7A"></div></div><b style="width:22px">${M.cnt[i] || 0}</b></div>`).join('');
  const clr = npc && ST.clr.length ? `<div style="font-size:12px;color:#7FE08A;margin-bottom:6px">👀 Алібі від свідків: ${ST.clr.map(i => escapeHTML(NAMES[i] || '')).join(', ')}</div>` : '';
  const cs = `<div style="text-align:left;background:#3A2E5A;border-radius:10px;padding:6px 9px;margin:6px 0;font-size:12px"><b>🗂️ Справа</b> (${ST.cs.length})<br>${ST.cs.length ? ST.cs.slice(-8).map(q => '• ' + escapeHTML(q.txt)).join('<br>') : 'порожньо — збирайте 🔎 докази F, дивіться 📹 камери на посту охорони'}</div>`;
  const shc = ST.shc.length ? `<div style="font-size:11px;opacity:.85">👕 ${M.c.map(c => { const e = ST.shc.find(a => a[0] === c); return e ? `${escapeHTML(M.n[M.c.indexOf(c)])} ${SHIRT[e[1]][0]}` : ''; }).filter(Boolean).join(' · ')}</div>` : '';
  const h = `<div style="font:900 21px system-ui">🚨 ЗБОРИ · кого звільнити?</div><div style="opacity:.8;margin:2px 0 6px">${npc ? 'Підозрювані — колеги-NPC' : 'Підозрювані — гравці'} · залишилось ${Math.max(0, Math.ceil(M.t))} с · проголосували ${M.who.length} · «продовжити»: ${M.skip}</div>${clr}${cs}${shc}
    <div style="margin-top:6px">${rows}</div>
    <div style="margin-top:8px"><button class="dlm-skip" data-mv="-1" ${voted ? 'disabled' : ''} style="${bs}background:#8E86B0;color:#fff">⏭️ Продовжити роботу</button></div>
    <div style="font-size:12px;opacity:.8;margin-top:8px">${voted ? '✅ Твій голос враховано — чекаємо інших…' : 'Звільните саботажника — +20 с до дедлайну й +40 🪙. Помилитесь — невинний ображається (стажеру пробачать раз).'}</div>`;
  if (h !== V.mtSig) { V.mtSig = h; V.mtEl.innerHTML = h; }
  V.mtEl.style.display = '';
}

/* ---------- Шкали агресії над колегами й «що хоче» над «зайобуючими» ---------- */
function agBars() {
  if (!V.agBox) {
    V.agBox = document.createElement('div'); V.agBox.style.cssText = 'position:fixed;inset:0;z-index:2;pointer-events:none';
    const css = document.createElement('style');
    css.textContent = `.dl-ag{position:absolute;left:0;top:0;width:52px;height:8px;border-radius:5px;background:rgba(46,35,70,.8);overflow:hidden;box-shadow:0 0 0 2px rgba(255,255,255,.5)}.dl-ag i{display:block;height:100%}
      .dl-agw{position:absolute;left:0;top:0;padding:2px 8px;border-radius:10px;background:#C2335A;color:#fff;font:800 13px/1.3 system-ui,sans-serif;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,.3)}`;
    document.head.appendChild(css); document.body.appendChild(V.agBox);
  }
  const show = running && !pl.dead && !panel && ST.on && inOffice(pl.x, pl.z);
  V.agBox.style.display = show ? '' : 'none'; if (!show) return;
  const seen = new Set();
  const put1 = (key, cls, x, y, z, html) => {
    let el = V.agEl.get(key); if (!el) { el = document.createElement('div'); el.className = cls; V.agBox.appendChild(el); V.agEl.set(key, el); }
    seen.add(key); if (el._h !== html) { el._h = html; el.innerHTML = html; }
    const q = screenPos(x, y, z); el.style.display = q.vis ? '' : 'none'; el.style.transform = `translate(${Math.round(q.x)}px,${Math.round(q.y)}px) translate(-50%,-100%)`;
  };
  for (const d of DESKS) { const a = ST.ag[d.i] || 0; if (a < 3 || pestOf(d.i)) continue; const cp = colPos(d.i); put1('c' + d.i, 'dl-ag', cp.x, 2.7, cp.z, `<i style="width:${Math.round(a)}%;background:${a > 70 ? '#FF5C7A' : a > 40 ? '#FFB35C' : '#FFE066'}"></i>`); }
  for (const q of ST.pst) put1('p' + q.id, 'dl-agw', q.x, 2.8, q.z, `😤 хоче ${CUPS[q.want].ic}${q.stun > 0 ? ' 💫' : ''}${q.carry ? ' · 📄' : ''}`);
  for (const [k, el] of V.agEl) if (!seen.has(k)) { el.remove(); V.agEl.delete(k); }
}

/* ---------- Моделі v3 ---------- */
const basicM = (c, o) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false });
function syncMap(map, list, make, upd) {
  const seen = new Set();
  for (const o of list) { seen.add(o.id); let m = map.get(o.id); if (!m) { m = make(o); map.set(o.id, m); } upd(m, o); }
  for (const [id, m] of map) if (!seen.has(id)) { scene.remove(m.root || m); map.delete(id); }
}
function render3(dt, t) {
  const M3 = V.m3;
  // 😤 «зайобуючі»: червоні від злості колеги, що ходять за людьми
  syncMap(M3.ps, ST.pst, q => { const h = buildOffice('#E8957E', pick(['#C2335A', '#7A5BC9', '#E07A3C'])); scene.add(h.root); h.root.position.set(q.x, 0, q.z); return { root: h.root, h, ent: { x: q.x, z: q.z, y: 0, bh: 2.3 } }; }, (m, q) => {
    const h = m.h; m.ent.x = q.x; m.ent.z = q.z; h.root.position.x = q.x; h.root.position.z = q.z; h.root.rotation.y = lerpAng(h.root.rotation.y, q.f || 0, Math.min(1, dt * 6));
    if (q.stun > 0) { h.body.position.y = lerp(h.body.position.y, -.45, Math.min(1, dt * 6)); h.l1.rotation.x = h.l2.rotation.x = -1.4; }
    else { h.body.position.y = lerp(h.body.position.y, 0, Math.min(1, dt * 6)); const sw = Math.sin(t * 7 + q.id) * .55; h.l1.rotation.x = sw; h.l2.rotation.x = -sw; h.aR.rotation.x = -2.6 + Math.sin(t * 10 + q.id) * .5; h.aL.rotation.x = -.4; }
  });
  // ✈️ літачки
  syncMap(M3.pp, ST.pp, () => { const g = new THREE.Group(); const w = put(g, mesh(new THREE.ConeGeometry(.2, .55, 3), '#FFFFFF', false), 0, 0, 0); w.rotation.x = Math.PI / 2; w.scale.y = 1; w.scale.x = 1.4; put(g, mesh(new THREE.BoxGeometry(.02, .08, .4), '#DDE6FF', false), 0, -.05, -.05); scene.add(g); return g; },
    (m, q) => { m.position.set(q.x, q.y, q.z); m.rotation.y = q.a; m.rotation.z = Math.sin(t * 9 + q.id) * .25; });
  // 🗑️ папірці на підлозі
  syncMap(M3.li, ST.lit, q => { const m = mesh(new THREE.IcosahedronGeometry(.11, 0), '#F4F0E8', false); m.position.set(q.x, .1, q.z); m.rotation.set(q.id, q.id * 2, 0); scene.add(m); return m; }, (m, q) => { m.position.x = q.x; m.position.z = q.z; });
  // 🔥 палаючі калюжі
  syncMap(M3.bu, ST.burn, q => { const g = new THREE.Group(); const d = new THREE.Mesh(new THREE.CircleGeometry(1, 24), basicM('#FF6A2C', .55)); d.rotation.x = -Math.PI / 2; d.position.y = .07; g.add(d); for (let k = 0; k < 5; k++) { const f = new THREE.Mesh(new THREE.ConeGeometry(.22, .8, 6), basicM(k % 2 ? '#FFD27A' : '#FF8A3C', .85)); f.position.set(Math.sin(k * 1.3) * .5, .4, Math.cos(k * 1.3) * .5); g.add(f); } g.position.set(q.x, 0, q.z); scene.add(g); return g; },
    (m, q) => { m.scale.set(q.r, 1, q.r); m.children.forEach((c, k) => { if (k) c.scale.y = .7 + Math.abs(Math.sin(t * 9 + k)) * .6; }); if (Math.random() < dt * 8) burst(q.x + rand(-q.r, q.r) * .6, .5, q.z + rand(-q.r, q.r) * .6, pick(['#FF8A3C', '#857C99']), 1, 1, .7, 2); });
  // 🧻 / 📘 у польоті: дуга, слід і мітка, куди впаде
  syncMap(M3.th, ST.th, q => {
    const root = new THREE.Group(), o = q.w === 'bk' ? new THREE.Group() : mesh(new THREE.IcosahedronGeometry(.13, 0), '#F4F0E8', false);
    if (q.w === 'bk') { put(o, mesh(new THREE.BoxGeometry(.3, .07, .22), pick(['#C2335A', '#5CC8FF', '#7FE08A']), false), 0, 0, 0); put(o, mesh(new THREE.BoxGeometry(.28, .06, .2), '#FFFFFF', false), .015, 0, 0); }
    const ring = new THREE.Mesh(new THREE.RingGeometry(.35, .5, 20), basicM(q.w === 'bk' ? '#FFB35C' : '#FFFFFF', .7)); ring.rotation.x = -Math.PI / 2; ring.position.set(q.x1, .08, q.z1);
    root.add(o); root.add(ring); scene.add(root); return { root, o, ring };
  }, (m, q) => {
    const s = clamp(q.t / q.T, 0, 1), y = 1.3 + 1.8 * 4 * s * (1 - s) - s * 1.1;
    m.o.position.set(lerp(q.x0, q.x1, s), y, lerp(q.z0, q.z1, s)); m.o.rotation.x += dt * 10; m.o.rotation.z += dt * 7; m.ring.scale.setScalar(1 + Math.sin(t * 12) * .15);
    if (Math.random() < dt * 25) burst(m.o.position.x, m.o.position.y, m.o.position.z, '#FFFFFF', 1, .3, .25, 0);
  });
  // 🍾 молотов у польоті
  syncMap(M3.mo, ST.mo, () => { const g = new THREE.Group(); put(g, mesh(flat(new THREE.CylinderGeometry(.07, .09, .3, 8)), '#3E8F5A', false), 0, 0, 0); put(g, mesh(new THREE.BoxGeometry(.05, .12, .05), '#FFD27A', false), 0, .2, 0); scene.add(g); return g; },
    (m, q) => { if (!AUTH()) q.t += 0; const s = clamp(q.t / q.T, 0, 1); m.position.set(lerp(q.x0, q.x1, s), 1.2 + 2.2 * 4 * s * (1 - s) - s, lerp(q.z0, q.z1, s)); m.rotation.x += dt * 12; if (Math.random() < dt * 20) burst(m.position.x, m.position.y + .2, m.position.z, '#FF8A3C', 1, .5, .3, 0); });
  // 🤖 Румба
  if (!M3.rb) {
    const g = new THREE.Group(); put(g, mesh(flat(new THREE.CylinderGeometry(.34, .36, .12, 16)), '#3E3A5C', false), 0, .08, 0); put(g, mesh(flat(new THREE.CylinderGeometry(.26, .26, .03, 16)), '#9F98B8', false), 0, .155, 0);
    put(g, mesh(new THREE.BoxGeometry(.12, .03, .05), bulb('#7FE08A'), false), 0, .17, .24);
    const bomb = new THREE.Group(); put(bomb, mesh(new THREE.SphereGeometry(.15, 10, 8), '#2E2346', false), 0, .3, 0); put(bomb, mesh(new THREE.BoxGeometry(.03, .12, .03), '#FFD27A', false), .06, .45, 0); g.add(bomb);
    const bot = new THREE.Group(); put(bot, mesh(flat(new THREE.CylinderGeometry(.07, .09, .3, 8)), '#3E8F5A', false), 0, .32, 0); put(bot, mesh(new THREE.BoxGeometry(.42, .03, .1), '#C9CDD9', false), 0, .25, 0); g.add(bot);
    g.userData = { bomb, bot }; scene.add(g); M3.rb = g;
  }
  { const R = ST.rb, g = M3.rb; g.visible = !!(R && !R.dead); if (g.visible) { g.position.set(R.x, 0, R.z); g.rotation.y = lerpAng(g.rotation.y, R.f || 0, Math.min(1, dt * 6)); g.userData.bomb.visible = R.arm === 2; g.userData.bot.visible = R.arm === 1; if (R.arm && Math.random() < dt * 14) burst(R.x, .5, R.z, '#FFD27A', 1, 1, .3, 1); } }
  // 💦 калюжа / ⚡ електропастка
  if (!M3.pud) { M3.pud = new THREE.Mesh(new THREE.CircleGeometry(1, 28), basicM('#8FD9FF', .5)); M3.pud.rotation.x = -Math.PI / 2; scene.add(M3.pud); }
  { const P = ST.pud, m = M3.pud; m.visible = !!P; if (P) { m.position.set(P.x, .075, P.z); m.scale.setScalar(P.r); m.material.color.set(P.el ? (Math.sin(t * 30) > 0 ? '#FFE066' : '#6BE7FF') : '#8FD9FF'); m.material.opacity = P.el ? .75 : .5; if (P.el && Math.random() < dt * 30) burst(P.x + rand(-P.r, P.r) * .7, .2, P.z + rand(-P.r, P.r) * .7, '#FFE066', 1, 2, .2, 1); } }
  // 🔥 пожежа в серверній
  if (!M3.fire) { const g = new THREE.Group(); const d = new THREE.Mesh(new THREE.CircleGeometry(1, 24), basicM('#FF5C3C', .45)); d.rotation.x = -Math.PI / 2; d.position.y = .08; g.add(d); for (let k = 0; k < 7; k++) { const f = new THREE.Mesh(new THREE.ConeGeometry(.3, 1.2, 6), basicM(k % 2 ? '#FFD27A' : '#FF6A2C', .85)); f.position.set(Math.sin(k * .9) * .55, .6, Math.cos(k * .9) * .55); g.add(f); } scene.add(g); M3.fire = g; }
  { const g = M3.fire; g.visible = ST.on && ST.fire > 0; if (g.visible) { const C = fireC(), R = fireR(); g.position.set(C.x, 0, C.z); g.scale.set(R, 1, R); g.children.forEach((c, k) => { if (k) c.scale.y = .6 + Math.abs(Math.sin(t * 8 + k)) * .9 * (.5 + ST.fire / 100); }); if (Math.random() < dt * 14) burst(C.x + rand(-R, R) * .6, 1, C.z + rand(-R, R) * .6, pick(['#FF8A3C', '#4E4A6E', '#857C99']), 1, 1, 1.2, 3); } }
}

/* ---------- 🤖 Боти-колеги: модель з антеною, ім'я над головою, папери в руках ---------- */
const BOTC = ['#5CC8FF', '#7FE08A', '#FFB35C', '#C9A0FF', '#FF8FB1'];
function renderBots(dt, t) {
  if (!V.bm) V.bm = new Map();
  const vis = running && !panel && inOffice(pl.x, pl.z), seen = new Set();
  for (const b of ST.bt) {
    seen.add(b.n); let m = V.bm.get(b.n);
    if (!m) {
      const h = humanoid({ skin: '#D9DEE8', shirt: BOTC[b.c % BOTC.length], pants: '#3E3A5C' });
      put(h.body, mesh(flat(new THREE.CylinderGeometry(.025, .025, .32, 6)), '#9F98B8', false), 0, 1.86, 0);
      put(h.body, mesh(new THREE.SphereGeometry(.07, 8, 6), bulb('#FF5C7A'), false), 0, 2.04, 0);
      put(h.body, mesh(new THREE.BoxGeometry(.42, .1, .06), bulb('#6BE7FF'), false), 0, 1.52, .26);   // «візор» замість очей
      h.root.position.set(b.x, 0, b.z); scene.add(h.root);
      const el = document.createElement('div'); el.className = 'dl-lbl'; el.style.background = 'rgba(30,60,90,.82)';
      m = { h, el, ent: { x: b.x, z: b.z, y: 0, bh: 2.3 }, it: '', cm: null }; V.bm.set(b.n, m);
    }
    const h = m.h; h.root.visible = vis; m.ent.x = b.x; m.ent.z = b.z;
    h.root.position.set(b.x, 0, b.z); h.root.rotation.y = lerpAng(h.root.rotation.y, b.f || 0, Math.min(1, dt * 8));
    const sw = b.mv ? Math.sin(t * 9 + b.c) * .55 : 0; h.l1.rotation.x = sw; h.l2.rotation.x = -sw;
    h.aR.rotation.x = b.it ? -1.2 : b.ic && !b.mv ? -1.6 + Math.sin(t * 10) * .3 : -sw * .6; h.aL.rotation.x = b.it ? -1.2 : sw * .6;
    if (m.it !== b.it) { m.it = b.it; if (m.cm) { h.root.remove(m.cm); m.cm = null; } if (b.it) { m.cm = itemMesh(b.it, 1, 0, 100); m.cm.position.set(0, 1.05, .45); h.root.add(m.cm); } }
    if (V.lbl && !m.el.parentNode) V.lbl.appendChild(m.el);
    const q = vis ? screenPos(b.x, 2.45, b.z) : null, txt = `🤖 ${b.n}${ST.on && b.ic ? ' ' + b.ic : ''}`;
    m.el.style.display = q && q.vis ? '' : 'none';
    if (q && q.vis) { if (m.el.textContent !== txt) m.el.textContent = txt; m.el.style.transform = `translate(${Math.round(q.x)}px,${Math.round(q.y)}px) translate(-50%,-100%)`; }
  }
  for (const [n, m] of V.bm) if (!seen.has(n)) { scene.remove(m.h.root); m.el.remove(); V.bm.delete(n); }
}

/* ---------- Метальне: ✈️ лотки з папером, 📘 книжкові шафи, 🧻 смітники (видно здалеку, F — узяти) ---------- */
const PKI = {
  pp: { ic: '✈️', lbl: '✈️ Папір для літачків', f: 'F — скласти літачок (+3)', add: 3, max: 9, hint: 'візьми папір у лотку', where: 'лотки з папером біля принтера, сканера й столів (світло-блакитне коло)', col: '#6BE7FF' },
  bk: { ic: '📘', lbl: '📘 Книжкова шафа', f: 'F — взяти книжку (+2)', add: 2, max: 4, hint: 'книжки — у книжковій шафі', where: 'книжкові шафи біля архіву, кабінету начальника й печатки (помаранчеве коло)', col: '#FFB35C' },
  pb: { ic: '🧻', lbl: '🧻 Смітник · мʼятий папір', f: "F — нам'яти паперу (+5)", add: 5, max: 15, hint: 'мʼятий папір — біля смітника', where: 'смітники на кухні, біля столів і в холі (зелене коло)', col: '#7FE08A' },
};
const PK_CD = 8;   // с, поки та сама шафа/лоток «перезаряджається» для тебе
function emptyToast(k) { const I = PKI[k]; toast(`${I.ic} <b>0</b> — де взяти: ${I.where}. Підійди й натисни <b>F</b>.`); }
function drawPickups(K, Lx) {
  const g = K.g; if (!g || !Lx.pk) return;
  for (const s of Lx.pk) {
    const I = PKI[s.k], q = K.grp(s.o.x - OX, s.o.z - OZ, s.ry);
    const ring = put(g, mesh(new THREE.RingGeometry(.62, .78, 28), bulb(I.col), false), s.o.x, .07, s.o.z); ring.rotation.x = -Math.PI / 2;
    if (s.k === 'pp') {
      // тумба з лотком і стосами білого паперу
      K.GB(q, 0, .36, 0, .62, .72, .42, '#C9CDD9'); K.GB(q, 0, .73, 0, .66, .03, .46, '#9F98B8'); K.GB(q, 0, .5, .215, .5, .05, .02, '#4E4A6E');
      for (let i = 0; i < 7; i++) K.GB(q, -.14, .76 + i * .028, 0, .27, .022, .2, i % 2 ? '#FFFFFF' : '#EEF2FA');
      for (let i = 0; i < 4; i++) K.GB(q, .16, .76 + i * .028, .02, .27, .022, .2, i % 2 ? '#FFFFFF' : '#EEF2FA');
      const pl_ = new THREE.Group(); const w = put(pl_, mesh(new THREE.ConeGeometry(.16, .46, 3), '#FFFFFF', false), 0, 0, 0); w.rotation.x = Math.PI / 2; w.scale.x = 1.5;
      pl_.position.set(s.o.x, 1.45, s.o.z); scene.add(A.dynamic(pl_)); V.pkAnim.push({ m: pl_, y: 1.45, k: s.id });
    } else if (s.k === 'bk') {
      // книжкова шафа з кольоровими корінцями
      const BK = ['#C2335A', '#5CC8FF', '#FFD27A', '#7FE08A', '#B07CF0', '#E07A3C', '#3E8F5A'];
      K.GB(q, 0, .82, 0, 1.05, 1.64, .36, '#8C6A4E');
      for (let r = 0; r < 4; r++) { K.GB(q, 0, .14 + r * .4, .02, .95, .03, .34, '#6E5240'); for (let b = 0; b < 6; b++) K.GB(q, -.4 + b * .16, .29 + r * .4, .17, .11, .26 + ((b + r) % 3) * .03, .04, BK[(b * 3 + r) % BK.length]); }
      K.GB(q, .25, 1.68, 0, .3, .06, .22, '#C2335A'); K.GB(q, .25, 1.73, 0, .28, .05, .2, '#5CC8FF');
    } else {
      // смітник, переповнений мʼятим папером, і купка поруч
      K.GC(q, 0, .3, 0, .24, .19, .6, '#7A8299', 12); K.GC(q, 0, .61, 0, .25, .25, .03, '#5A6278', 12);
      for (let i = 0; i < 6; i++) put(q, mesh(new THREE.IcosahedronGeometry(.09 + (i % 3) * .015, 0), i % 2 ? '#FFFFFF' : '#F4F0E8', false), Math.sin(i * 2.1) * .12, .66 + (i % 2) * .07, Math.cos(i * 2.1) * .12);
      for (let i = 0; i < 4; i++) put(q, mesh(new THREE.IcosahedronGeometry(.1, 0), '#F4F0E8', false), .38 + Math.sin(i * 1.7) * .1, .09, .1 + Math.cos(i * 1.7) * .12);
    }
  }
}
const pkNear = (r = 1.4) => (L.pk || []).filter(s => pkOn(s) && dist2(pl.x, pl.z, s.o.x, s.o.z) < r && dist2(pl.x, pl.z, s.x, s.z) < r + .4).sort((a, b) => dist2(pl.x, pl.z, a.o.x, a.o.z) - dist2(pl.x, pl.z, b.o.x, b.o.z))[0] || null;
function pkInteract() {
  const s = pkNear(); if (!s) return null; const I = PKI[s.k];
  if (!ST.on) return { l: `${I.lbl} — бери під час раунду`, fn: () => { } };
  const cd = V.pkCd[L.vi + ':' + s.id] || 0;
  if (V[s.k] >= I.max) return { l: `${I.ic} У тебе вже повно (${V[s.k]}/${I.max})`, fn: () => { } };
  if (cd > 0) return { l: `${I.ic} Тут порожньо — ще ${Math.ceil(cd)} с`, fn: () => { } };
  return { l: `${I.f} · у тебе ${V[s.k]}`, fn: () => pickUp(s) };
}
function pickUp(s) {
  const I = PKI[s.k]; V[s.k] = Math.min(I.max, V[s.k] + I.add); V.pkCd[L.vi + ':' + s.id] = PK_CD;
  ftext(pl.x, 2.6, pl.z, `${I.ic} +${I.add} (${V[s.k]})`, 'gold'); sfx('pick'); burst(s.o.x, 1, s.o.z, '#FFFFFF', 6, 2, .4, 1.5);
  if (!V['tip' + s.k]) { V['tip' + s.k] = 1; toast(`${I.ic} <b>Як кидати:</b> клавіша <b>${{ pp: 4, bk: 2, pb: 5 }[s.k]}</b> (або вибери слот і клікни ЛКМ) — летить туди, куди курсор.${s.k === 'pb' ? ' Влучиш у 🗑️ смітник здалеку — більше 🪙!' : s.k === 'bk' ? ' Книжка оглушає зомбі (і він випускає звіт).' : ' У колегу — його агресія росте, у ПК — може спалахнути серверна.'}`); }
}
/* 🧻 / 📘 кинути дугою: самонаведення на смітник, зомбі чи колегу біля курсора, інакше — у точку курсора */
function toss(w) {
  if (!can3() || V.tsCd > 0) return;
  if (V[w] <= 0) { emptyToast(w); return; }
  const base = aimBase(), mx = w === 'pb' ? 11 : 9;
  const bins = w === 'pb' ? (L.pk || []).filter(q => q.k === 'pb').map(q => q.o) : [];
  const tg = aimAt([...bins, ...ST.zom, ...ST.pst, ...DESKS.filter(d => !pestOf(d.i)).map(d => colPos(d.i))], .3, mx, base);
  const cur_ = typeof input !== 'undefined' && input.aimOk ? dist2(pl.x, pl.z, input.ax, input.az) : 0;
  let x, z; if (tg) { x = tg.x; z = tg.z; } else if (cur_ > 1 && cur_ <= mx) { x = input.ax; z = input.az; } else { x = pl.x + Math.sin(base) * mx * .65; z = pl.z + Math.cos(base) * mx * .65; }
  pl.face = Math.atan2(x - pl.x, z - pl.z); V[w]--; V.tsCd = .45; req('toss', { w, x: r2(x), z: r2(z) }); sfx('throw');
}
function tossHit(e, me) {
  const x = +e.x, z = +e.z; burst(x, .6, z, e.w === 'bk' ? '#FFB35C' : '#FFFFFF', e.hit ? 10 : 4, 2.5, .5, 2); sfx(e.hit ? 'hit' : 'land', x, z);
  if (e.hit === 'bin') {
    let txt = `🗑️ У смітник! ${Math.round(+e.d || 0)} м`;
    if (me) {
      const d = +e.d || 0, coins = 2 + Math.floor(d / 2), xp = 4 + Math.round(d * 2), D = A.data();
      if (V.binN < BIN_CAP) { V.binN++; P.coins += coins; addXP(xp); D.bins = (D.bins || 0) + 1; D.binBest = Math.max(D.binBest || 0, Math.round(d * 10) / 10); txt += ` · +${coins} 🪙 +${xp} XP`; refreshHUD(); }
      else txt += ' · ліміт нагород на раунд';
    }
    ftext(x, 1.6, z, txt, 'gold');
  } else if (e.hit === 'zom') ftext(x, 2.4, z, e.w === 'bk' ? (e.sp === 'report' ? '📘 БАЦ! Звіт випльовано!' : '📘 БАЦ! Оглушено') : '🧻 Пац!', 'gold');
  else if (e.hit === 'col') { ftext(x, 2.4, z, e.w === 'bk' ? '📘 Ай! 😤😤' : '🧻 Гей! 😤', 'bad'); if (V.cols[e.i]) bubble(V.cols[e.i].ent, pick(['Хто кинув?!', 'Я все бачу!', 'Ще раз — і я зайобу!', 'Ну дякую…']), true, 2); }
  else if (e.hit === 'pest') ftext(x, 2.4, z, e.w === 'bk' ? '📘 Оглушено!' : '🧻 Відволікся!', 'gold');
}
/* підписи над місцями видачі (видно з усього поверху) */
function pkLabels(t) {
  for (const a of V.pkAnim) { a.m.position.y = a.y + Math.sin(t * 2.5 + a.k) * .12; a.m.rotation.y = t * 1.5 + a.k; }
  if (!V.lbl) return;
  const show = running && !pl.dead && !panel && inOffice(pl.x, pl.z), list = show && L.pk ? L.pk.filter(pkOn) : [], seen = new Set();
  for (const s of list) {
    const id = L.vi + ':' + s.id; seen.add(id); let el = V.pkEl.get(id);
    if (!el) { el = document.createElement('div'); el.className = 'dl-lbl'; el.style.background = 'rgba(46,35,70,.86)'; el.style.border = `2px solid ${PKI[s.k].col}`; V.lbl.appendChild(el); V.pkEl.set(id, el); }
    const d = dist2(pl.x, pl.z, s.o.x, s.o.z), q = screenPos(s.o.x, s.k === 'bk' ? 2.2 : 1.85, s.o.z), hi = V.pkHi === id;
    el.style.display = q.vis ? '' : 'none'; el.style.opacity = d < 8 || hi ? 1 : .7;
    el.style.background = hi ? '#FFE066' : 'rgba(46,35,70,.86)'; el.style.color = hi ? '#2E2346' : '#fff';
    const txt = (hi ? '👉 ' : '') + PKI[s.k].lbl + (ST.on && d < 2.2 ? ` · ${PKI[s.k].f}` : '');
    if (el.textContent !== txt) el.textContent = txt;
    if (q.vis) el.style.transform = `translate(${Math.round(q.x)}px,${Math.round(q.y)}px) translate(-50%,-100%)`;
  }
  for (const [id, el] of V.pkEl) if (!seen.has(id)) el.style.display = 'none';
}
/* рядок у підказці: чого 0 і де найближче взяти (зі стрілкою й відстанню) */
function pkHint() {
  V.pkHi = '';
  if (!ST.on || !L.pk || ST.mt || pl.dead) return '';
  for (const k of ['pp', 'pb', 'bk']) {
    if (V[k] > 0) continue;
    const s = L.pk.filter(q => q.k === k && pkOn(q)).sort((a, b) => dist2(pl.x, pl.z, a.o.x, a.o.z) - dist2(pl.x, pl.z, b.o.x, b.o.z))[0]; if (!s) continue;
    const dx = s.o.x - pl.x, dz = s.o.z - pl.z, d = Math.hypot(dx, dz), ar = '↑↗→↘↓↙←↖'[Math.round(((Math.atan2(dx, -dz) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4)) % 8];
    const rm = roomAt(s.o.x, s.o.z); V.pkHi = L.vi + ':' + s.id;
    return `${PKI[k].ic} 0 — ${PKI[k].hint}${rm ? ` (${rm.n.toLowerCase()})` : ''} <b>${d < 1.6 ? 'тут, F' : ar + ' ' + Math.round(d) + ' м'}</b>`;
  }
  return '';
}
// ЛКМ, коли вибрано метальний слот, — кидок (а не удар)
if (!SIMSIDE && typeof atkDown === 'function') {
  const _ad = atkDown;
  atkDown = function () {
    if (typeof MODEBAR !== 'undefined' && MODEBAR && V.barOn && can3() && !panel) { const sl = MODEBAR.slots[MODEBAR.sel]; if (sl && ['pp', 'bk', 'pb', 'mol'].includes(sl.id)) { sl.use(); return; } }
    return _ad.apply(this, arguments);
  };
}

/* ---------- Кадр гравця (v3) ---------- */
function client3(dt) {
  if (ST.rid !== V.rid3) { V.rid3 = ST.rid; Object.assign(V, { pp: PP_N, bk: 0, pb: PB_N, binN: 0, pkCd: {}, mol: MOL_N, ext: 100, mc: 1, sbcd: 0, stunT: 0, slowT: 0, wasSab: false }); }
  V.sab = !!(ST.on && ST.sh && hashS(ST.sh[0] + myKey()) === ST.sh[1]); if (V.sab) V.wasSab = true;
  if (ST.on && ST.sh && V.roleRid !== ST.rid && running && !pl.dead && inOffice(pl.x, pl.z)) { V.roleRid = ST.rid; V.role = !V.sab && ST.rh ? (hashS(ST.sh[0] + 'sec' + myKey()) === ST.rh[0] ? 'sec' : hashS(ST.sh[0] + 'int' + myKey()) === ST.rh[1] ? 'int' : '') : ''; roleCard(V.sab); }
  if (V.roleT > 0 && ((V.roleT -= dt) <= 0 || !ST.on)) { V.roleT = 0; const r = document.getElementById('dl-role'); if (r) r.style.display = 'none'; }
  for (const k of ['stunT', 'slowT', 'ppCd', 'tsCd', 'exCd', 'sbcd', 'hurtT', 'litT']) if (V[k] > 0) V[k] -= dt;
  client5(dt);
  for (const k in V.pkCd) if (V.pkCd[k] > 0) V.pkCd[k] -= dt;
  if (!AUTH()) {
    const k = Math.min(1, dt * 8);
    for (const q of ST.pst) if (q.tx != null) { q.x = lerp(q.x, q.tx, k); q.z = lerp(q.z, q.tz, k); }
    for (const q of ST.pp) if (q.tx != null) { q.tx += Math.sin(q.a) * 9 * dt; q.tz += Math.cos(q.a) * 9 * dt; q.x = lerp(q.x, q.tx, k); q.z = lerp(q.z, q.tz, k); }
    for (const q of ST.mo) q.t += dt;
    for (const q of ST.th) q.t += dt;
    if (ST.rb && ST.rb.tx != null) { ST.rb.x = lerp(ST.rb.x, ST.rb.tx, k); ST.rb.z = lerp(ST.rb.z, ST.rb.tz, k); }
  }
  render3(dt, gameTime); renderBots(dt, gameTime); pkLabels(gameTime); agBars(); meetUI();
  if (!running || pl.dead || !ST.on || !inOffice(pl.x, pl.z)) return;
  // що діє на мене: вогонь, палаючі калюжі, калюжа (слизько / ⚡), папірці під ногами
  const hurt = (d, src, o) => { V.hurtT = .7; pl.hp = Math.max(1, pl.hp - d); ftext(pl.x, 2.5, pl.z, `${src} −${d}`, 'bad'); knockMe(Math.atan2(pl.x - o.x, pl.z - o.z), 6); sfx('hurt'); };
  if (V.hurtT <= 0 && ST.fire > 0 && dist2(pl.x, pl.z, fireC().x, fireC().z) < fireR()) hurt(4, '🔥 Гаряче!', fireC());
  if (V.hurtT <= 0) for (const b of ST.burn) if (dist2(pl.x, pl.z, b.x, b.z) < b.r) { hurt(3, '🔥 Пече!', b); break; }
  const P = ST.pud;
  if (P && dist2(pl.x, pl.z, P.x, P.z) < P.r) {
    if (P.el && V.zapId !== P.id) { V.zapId = P.id; V.stunT = 3; V.act = null; ftext(pl.x, 2.7, pl.z, '⚡ БЗЗЗ! Оглушило!', 'bad'); burst(pl.x, 1.2, pl.z, '#FFE066', 14, 3, .4, 2); shake = Math.max(shake, .35); sfx('hurt'); }
    else if (!P.el && pl.moving && (V.slipT -= dt) <= 0) { V.slipT = 1.2; knockMe(pl.face + rand(-.9, .9), 7, 'Слизько! 💦'); }
  }
  if (V.litT <= 0 && pl.moving) for (const l of ST.lit) if (dist2(pl.x, pl.z, l.x, l.z) < .35) { V.litT = 2.5; knockMe(pl.face, 5, 'Посковзнувся на папірці!'); break; }
  if (V.stunT > 0 && Math.random() < dt * 6) burst(pl.x, 2.3, pl.z, '#FFE066', 1, 1, .4, 0);
}

/* ======================= v5 «ДЕТЕКТИВ»: докази й 🗂️ справа, 🔥 аврал, ⚡ щиток, ролі, нарада в переговорній, нові завдання й міні-ігри =======================
   Як і v3: усе рахує автор раунду (сервер світу або сам гравець), гравцям — знімок і події. */
const CLUE_T = 90, GO_T = 20, AVRAL = 120, BOX_N = 3, MOP_MAX = 3;
const SHIRT = [['🟥', 'червона', '#E0484E'], ['🟦', 'синя', '#4F7CE0'], ['🟩', 'зелена', '#4FB866'], ['🟨', 'жовта', '#E8C440'], ['🟪', 'фіолетова', '#9A5CE0'], ['🟧', 'помаранчева', '#E8883A']];
const MEETN = ['ПЕРЕГОВОРНА', 'КІМНАТА ПЕРСОНАЛУ', 'ЧИЛ-ЗОНА'];                  // куди кличуть на збори (по поверхах)
const LOCKR = /СЕРВЕРН|СХОВИЩ|МЕЙЛ|КАБІНЕТ/;                                          // двері з зчитувачем бейджів
const SABP = { fire: 2, jam: 1, boom: 1, power: 2, rain: 1, steal: 2, litter: 1, mine: 2, hack: 3, burn: 2, shred: 3, chair: 5 };   // очки саботажу
Object.assign(SABW, { hack: '💻 зламаний сервер', burn: '🔥 спалені документи', shred: '🗜️ знищені документи' });
const CLUEI = { foot: { ic: '👣', n: 'кавові сліди' }, badge: { ic: '🪪', n: 'журнал бейджів' }, ash: { ic: '⚱️', n: 'попіл від документів' }, strip: { ic: '🗜️', n: 'паперова локшина' } };
const BOSSV = ['Колеги, нагадую: звіт — до 18:00. Хто не встигне — працює в суботу.', 'Я чую, хтось шкодить. Я все бачу. Ну, камери все бачать.', 'Хто випив мою каву?! Неважливо. ЗВІТ!', 'АВРАЛ! Дві хвилини! Біжимо, а не ходимо!'];
const WORDS = ['ЗВІТ', 'КАВА', 'ВПР', 'ДЕДЛАЙН', 'ПЕЧАТКА', 'КВАРТАЛ', 'ПРИНТЕР'];
Object.assign(ST, { cl: [], cam: [], cs: [], s5: null, mp5: [], bx: null, rh: null, co: 0, av: 0, shc: [] });
Object.assign(AU, { st: {}, sp: 0, sec: '', int: '', trail: null, badge: {}, pwH: {}, mopT: 45, av: 0, bv: 0, chkU: 0, intOk: 0, camSeen: {}, bdT: 0 });
Object.assign(V, { role: '', mg: null, m5: { cl: new Map(), mp: new Map(), lay: null, laySig: '', sh: new Map(), box: new Map() }, chM: 0, chSent: 0, rideSit: 0, mtIn: 0, avR: -1, chkR: -1, finEl: null });
const stat = (k, f, n = 1) => { if (!k) return; const s = AU.st[k] || (AU.st[k] = { t: 0, f: 0, c: 0, s: 0, v: 0, m: 0, b: 0 }); s[f] += n; };
const pkOn = s => !ST.on || !ST.s5 || !Array.isArray(ST.s5.pka) || ST.s5.pka.includes(s.id);
const mpos = () => ST.s5 && ST.s5.mp ? ST.s5.mp : START.p;
const shirtOf = k => { const e = ST.shc.find(a => a[0] === k); return e ? e[1] : 0; };
const carrying = k => !!(ST.bx && ST.bx.cb.includes(k));

/* ---------- Кандидатні місця (центри кімнат) — з них щораунду тасуються нові точки ---------- */
function cands() {
  if (L.c5) return L.c5;
  const out = [];
  for (const r of L.rooms) {
    const p = freeSpot(OX + (r.x0 + r.x1) / 2, OZ + (r.z0 + r.z1) / 2);
    if (p.x === SEND.p.x && p.z === SEND.p.z) continue;
    out.push({ x: r2(p.x), z: r2(p.z), n: r.n });
  }
  return (L.c5 = out);
}
// точка біля центру кімнати, але не впритул до робочих місць, місць видачі й уже розставленого
let PLACED = [];
function offs(c, dx, dz) {
  const key = [...(L.pk || []).map(q => q.o), ...[START, SEND, PRINTER, STAPLER, COFFEE, VALVE, PANEL, ARCHIVE, RACK, SCANNER, STAMP, COOLER].filter(Boolean).map(o => o.p), ...DESKS.map(d => d.p), ...TUBE.map(t => t.p), ...PLACED];
  let best = null;
  for (let k = 0; k < 30; k++) {
    const a = k * 2.4, d = k * .22, p = freeSpot(c.x + dx + Math.cos(a) * d, c.z + dz + Math.sin(a) * d), m = Math.min(9, ...key.map(q => dist2(q.x, q.z, p.x, p.z)));
    if (!best || m > best.m) best = { p, m }; if (m > 2.2) break;
  }
  const o = { x: r2(best.p.x), z: r2(best.p.z), n: c.n }; PLACED.push(o); return o;
}

/* ---------- Початок раунду v5: розклад, ролі, кольори сорочок ---------- */
function start5() {
  PLACED = [];
  const C = shuffle(cands().slice()), mr = cands().find(c => MEETN.includes(c.n)) || { x: START.p.x, z: START.p.z, n: 'ХОЛ' };
  const rest = C.filter(c => c !== mr), a = rest[0] || mr;
  const b = rest.slice(1).sort((p, q) => dist2(q.x, q.z, a.x, a.z) - dist2(p.x, p.z, a.x, a.z))[0] || mr;
  const R = rest.filter(c => c !== a && c !== b), at = i => R[i % Math.max(1, R.length)] || mr;
  // місця видачі: щораунду ~3 «порожні», але кожного виду лишається хоч одне
  let pka = null;
  if (L.pk) { const sh = shuffle(L.pk.slice()), one = ['pp', 'pb', 'bk'].map(k => sh.find(q => q.k === k)).filter(Boolean); pka = [...one, ...sh.filter(q => !one.includes(q))].slice(0, Math.max(3, L.pk.length - 3)).map(q => q.id); }
  ST.s5 = { mp: offs(mr, 0, 0), btn: [offs(mr, 1.2, .8), offs(at(0), -1, 1), offs(at(1), 1, -1)], sec: offs(at(2), .8, .8), doc: [{ x: ARCHIVE.p.x, z: ARCHIVE.p.z, n: (roomAt(ARCHIVE.p.x, ARCHIVE.p.z) || {}).n || '' }, offs(at(3), -.9, -.9)], pka };
  ST.bx = { a: offs(a, -.8, 0), b: offs(b, .8, 0), need: BOX_N, done: 0, cb: [] };
  ST.mp5 = [offs(at(4), 1.3, 0), offs(at(5), 0, 1.3)].map(p => ({ id: ++AU.fid, x: p.x, z: p.z }));
  Object.assign(ST, { cl: [], cam: [], cs: [], av: 0, co: 0 });
  Object.assign(AU, { st: {}, sp: 0, trail: null, badge: {}, pwH: {}, mopT: 45, av: 0, bv: 0, chkU: 0, intOk: 0, camSeen: {} });
  // 👕 кольори сорочок: у кожного гравця й колеги-NPC свій (повторюються — камера лише звужує коло)
  const hum = crew().map(p => p.name);
  ST.shc = [...hum, ...DESKS.map(d => 'npc:' + d.i)].map((k, i) => [k, (i + (Math.random() * 6 | 0)) % SHIRT.length]);
  // 🛡️ безпековик і 🧑‍🎓 стажер — таємні, як і саботажник
  const pool = shuffle(hum.filter(k => k !== AU.sab)); let sec = '', int = '';
  if (SIMSIDE) { if (pool.length >= 2) sec = pool[0]; if (pool[1] && Math.random() < .6) int = pool[1]; }
  else if (pool[0]) { const r = Math.random(); if (r < .4) sec = pool[0]; else if (r < .7) int = pool[0]; }
  setRoles(sec, int);
  // 🪑 рідкісне таємне завдання саботажника (~10% раундів): накатати 5 м на кріслі
  if (AU.sab && !AU.sab.startsWith('npc:') && Math.random() < .1) ST.co = 1;
}
function setRoles(sec, int) { AU.sec = sec || ''; AU.int = int || ''; ST.rh = [hashS(AU.salt + 'sec' + AU.sec), hashS(AU.salt + 'int' + AU.int)]; }
function end5() {
  const ps = Object.entries(AU.st).map(([k, s]) => [k, s.t, s.f, s.c, s.s, s.v, s.m, s.b]);
  Object.assign(ST, { cl: [], cam: [], mp5: [], bx: null, av: 0 }); AU.trail = null;
  return { ps, sp: AU.sp, co: ST.co };
}
function snap5() {
  const B = ST.bx;
  return { cl: ST.cl.map(q => [q.id, q.k, r2(q.x), r2(q.z), q.k === 'foot' ? q.pts : 0]), cm: ST.cam.length, cs: ST.cs.map(q => [q.id, q.txt]), s5: ST.on ? ST.s5 : 0, mq: ST.mp5.map(q => [q.id, q.x, q.z]),
    bx: B ? [B.a, B.b, B.need, B.done, B.cb] : 0, rh: ST.on && ST.rh ? ST.rh : 0, co: ST.co, av: ST.av, shc: ST.on ? ST.shc : [] };
}
function applySnap5(d) {
  const P = o => o && isFinite(+o.x) && isFinite(+o.z) ? { x: +o.x, z: +o.z, n: String(o.n || '') } : null;
  if (Array.isArray(d.cl)) ST.cl = d.cl.slice(0, 30).filter(a => CLUEI[a[1]]).map(a => ({ id: a[0], k: a[1], x: +a[2], z: +a[3], pts: Array.isArray(a[4]) ? a[4].slice(0, 12).map(p => [+p[0], +p[1]]) : null }));
  ST.camN = d.cm | 0;
  if (Array.isArray(d.cs)) ST.cs = d.cs.slice(0, 16).map(a => ({ id: a[0], txt: String(a[1] || '') }));
  ST.s5 = d.s5 && typeof d.s5 === 'object' ? { mp: P(d.s5.mp), btn: (d.s5.btn || []).map(P).filter(Boolean), sec: P(d.s5.sec), doc: (d.s5.doc || []).map(P).filter(Boolean), pka: Array.isArray(d.s5.pka) ? d.s5.pka.map(v => v | 0) : null } : null;
  if (Array.isArray(d.mq)) ST.mp5 = d.mq.slice(0, 6).map(a => ({ id: a[0], x: +a[1], z: +a[2] }));
  ST.bx = Array.isArray(d.bx) ? { a: P(d.bx[0]), b: P(d.bx[1]), need: d.bx[2] | 0, done: d.bx[3] | 0, cb: (d.bx[4] || []).map(String) } : null;
  ST.rh = Array.isArray(d.rh) ? [String(d.rh[0]), String(d.rh[1])] : null; ST.co = d.co | 0; ST.av = d.av ? 1 : 0;
  ST.shc = Array.isArray(d.shc) ? d.shc.slice(0, 24).map(a => [String(a[0]), clamp(a[1] | 0, 0, SHIRT.length - 1)]) : [];
}

/* ---------- 🔎 Докази: кожен саботаж лишає слід на ~90 с ---------- */
function addClue(k, at, txt, pts) { ST.cl.push({ id: ++AU.fid, k, x: r2(at.x), z: r2(at.z), t: CLUE_T, txt, pts }); if (ST.cl.length > 24) ST.cl.shift(); return ST.cl[ST.cl.length - 1]; }
function clue5(k, w, at) {
  if (!k || !at) return;
  const rm = roomAt(at.x, at.z), rn = rm ? rm.n : 'КОРИДОР', tm = clockStr(ST.t).slice(0, 5), sc = shirtOf(k);
  // 👣 кавові сліди: у колеги-NPC ведуть до його столу; у гравця — туди, куди він піде далі
  if (k.startsWith('npc:')) {
    const d = DESKS[+k.slice(4)], pts = [];
    if (d) for (let i = 1; i <= 6; i++) pts.push([r2(lerp(at.x, d.p.x, i / 6)), r2(lerp(at.z, d.p.z, i / 6))]);
    addClue('foot', at, '', pts);
  } else { const c = addClue('foot', at, '', [[r2(at.x), r2(at.z)]]); AU.trail = { k, id: c.id, n: 6, t: .8 }; }
  // 📹 запис камери (дивитись — на посту охорони): кімната, час і розмитий колір сорочки
  const alt = (sc + 1 + (Math.random() * (SHIRT.length - 1) | 0)) % SHIRT.length, cs = Math.random() < .5 ? [sc] : Math.random() < .5 ? [sc, alt] : [alt, sc];
  ST.cam.push({ id: ++AU.fid, txt: `📹 Камера · ${rn} · ${tm}: ${SABW[w] || 'саботаж'}; розмитий силует у сорочці ${cs.map(i => SHIRT[i][0] + ' ' + SHIRT[i][1]).join(' або ')}` });
  if (ST.cam.length > 4) ST.cam.shift();
  // 🪪 журнал бейджів: хто заходив у цю кімнату за останні 60 с
  if (LOCKR.test(rn)) {
    const log = AU.badge[rn] || {}, who = Object.keys(log).filter(n => ST.t - log[n] < 60).map(sabName);
    if (k.startsWith('npc:') && !who.includes(sabName(k))) who.push(sabName(k));
    if (Math.random() < .7) { const dec = pick(NAMES.filter(n => !who.includes(n))); if (dec) who.push(dec); }
    addClue('badge', at, `🪪 Журнал бейджів «${rn}» (${tm}, за 60 с): ${shuffle(who).join(', ') || 'порожньо'}`);
  }
  if (w === 'burn') addClue('ash', at, `⚱️ Попіл і запах диму · ${rn} · ${tm} — хтось палив документи`);
  if (w === 'shred') addClue('strip', at, `🗜️ Паперова локшина з шредера · ${rn} · ${tm} — хтось тихо нищив документи`);
}
function footTxt(q) {
  const a = q.pts[0] || [q.x, q.z], b = q.pts[q.pts.length - 1] || a, ra = roomAt(a[0], a[1]), rb = roomAt(b[0], b[1]);
  const near = DESKS.filter(d => dist2(d.p.x, d.p.z, b[0], b[1]) < 1.6).map(d => NAMES[d.i]);
  return `👣 Кавові сліди: від «${ra ? ra.n : 'коридору'}» до «${rb ? rb.n : 'коридору'}»${near.length ? ` — обриваються біля столу ${near.join(', ')}` : ''}`;
}
const clueNear = (q, p, r) => q.pts ? q.pts.some(t => dist2(t[0], t[1], p.x, p.z) < r) : dist2(q.x, q.z, p.x, p.z) < r;

/* ---------- Запити v5 (true — оброблено) ---------- */
function onReq5(d, k, h) {
  const p = posOf(k), nr = (o, r) => o && dist2(p.x, p.z, o.x, o.z) < r;
  // ⚡ блекаут: робота з паперами стоїть, поки щиток не увімкнуть
  if (!ST.pw && ['feed', 'print', 'sub', 'send'].includes(d.k)) { emit({ k: 'dark', to: k }); return true; }
  if (d.k === 'fix' && d.w === 'power' && !ST.pw && !d.mg) {
    // тримати автомат треба ВДВОХ (або одному — міні-гра «3 перемикачі»)
    AU.pwH[k] = ST.t; const hs = Object.keys(AU.pwH).filter(q => ST.t - AU.pwH[q] < 3.5 && nr(posOf(q), 9) && dist2(posOf(q).x, posOf(q).z, PANEL.p.x, PANEL.p.z) < 3.2);
    if (hs.length >= 2) { AU.pwH = {}; return false; }
    emit({ k: 'pwhold', who: k }); return true;
  }
  if (d.k === 'brew' && ST.cm && !h.cup && AU.sab && Math.random() < .35) {
    // ☕ кавова пауза: біля кавоварки пліткують (70% — правда)
    const sc = shirtOf(AU.sab), c = Math.random() < .7 ? sc : (sc + 1 + (Math.random() * 5 | 0)) % SHIRT.length;
    emit({ k: 'rumor', to: k, txt: `☕ Кавова пауза: «Кажуть, біля місця саботажу крутився хтось у ${SHIRT[c][0]} ${SHIRT[c][1]} сорочці… але це неточно»` });
  }
  if (d.k === 'clue') {
    const i = ST.cl.findIndex(q => q.id === d.id); if (i < 0) return true; const q = ST.cl[i];
    if (!clueNear(q, p, 2.6)) return true;
    ST.cl.splice(i, 1); ST.cs.push({ id: q.id, txt: q.k === 'foot' ? footTxt(q) : q.txt }); if (ST.cs.length > 14) ST.cs.shift();
    stat(k, 'c'); emit({ k: 'clue', who: k, txt: ST.cs[ST.cs.length - 1].txt }); pushState(); return true;
  }
  if (d.k === 'cam') {
    if (!ST.s5 || !nr(ST.s5.sec, 2.6)) return true; let n = 0;
    for (const c of ST.cam) if (!AU.camSeen[c.id]) { AU.camSeen[c.id] = 1; ST.cs.push({ id: c.id, txt: c.txt }); n++; }
    if (ST.cs.length > 14) ST.cs.splice(0, ST.cs.length - 14);
    if (n) { stat(k, 'c', n); emit({ k: 'clue', who: k, txt: `📹 ${n} запис(и) камер — у справі` }); pushState(); }
    return true;
  }
  if (d.k === 'mop') {
    // 🧽 мити підлогу: калюжі кави — і будь-які сліди поруч (так, саботажник теж уміє мити…)
    const r = 1.7, n0 = ST.mp5.length, c0 = ST.cl.length;
    ST.mp5 = ST.mp5.filter(q => !nr(q, r)); ST.cl = ST.cl.filter(q => q.k === 'badge' || !clueNear(q, p, r));
    const n = n0 - ST.mp5.length, c = c0 - ST.cl.length; if (!n && !c) return true;
    stat(k, 'm'); if (n) { stat(k, 't'); ST.dur += 4 * n; }
    emit({ k: 'mop', who: k, n, c, x: r2(p.x), z: r2(p.z) }); pushState(); return true;
  }
  if (d.k === 'box') {
    // 📦 перенести коробки із зони А в зону Б (з коробкою ходиш повільніше)
    const B = ST.bx; if (!B || B.done >= B.need) return true;
    if (B.cb.includes(k)) {
      if (!nr(B.b, 2.4)) return true;
      B.cb = B.cb.filter(q => q !== k); B.done++; stat(k, 'b'); stat(k, 't');
      if (B.done >= B.need) { ST.dur += 25; emit({ k: 'boxes', who: k }); } else emit({ k: 'box', who: k, n: B.done });
    } else { if (!nr(B.a, 2.4) || h.it || B.done + B.cb.length >= B.need) return true; B.cb.push(k); emit({ k: 'boxup', who: k }); }
    pushState(); return true;
  }
  if (d.k === 'chk') {
    // 🛡️ безпековик: раз за раунд перевіряє одного колегу (результат бачить лише він)
    const c = String(d.c || ''); if (k !== AU.sec || AU.chkU || !c || c === k) return true;
    const o = c.startsWith('npc:') ? (DESKS[+c.slice(4)] ? colPos(+c.slice(4)) : null) : crew().find(q => q.name === c);
    if (!o || !nr(o, 2.6)) return true;
    AU.chkU = 1; emit({ k: 'chk', to: k, nm: sabName(c), r: c === AU.sab ? 1 : 0 }); return true;
  }
  if (d.k === 'sab' && d.w === 'chair') {
    if (k !== AU.sab || ST.co !== 1 || ST.sbC) return true;
    ST.co = 2; AU.sp += SABP.chair; stat(k, 's'); emit({ k: 'chairok', to: k }); pushState(); return true;
  }
  return false;
}
/* ---------- Кадр автора v5 (поза нарадою) ---------- */
function auth5(dt, c) {
  const left = ST.dur - ST.t;
  // 📢 голос начальника
  const bt = [60, 200];
  if (AU.bv < bt.length && ST.t >= bt[AU.bv]) emit({ k: 'bossv', i: AU.bv++ });
  // 🔥 АВРАЛ: останні 2 хвилини
  if (!AU.av && left <= AVRAL) {
    AU.av = ST.av = 1; AU.jammed = 0; AU.chaosT = Math.min(AU.chaosT, 10);
    for (let i = 0; i < 2 && ST.zom.length < 12; i++) spawnZombie();
    emit({ k: 'avral' }); emit({ k: 'bossv', i: 3 }); pushState();
  }
  // 👣 сліди живого саботажника тягнуться за ним ще кілька секунд
  const T = AU.trail;
  if (T && (T.t -= dt) <= 0) {
    T.t = .8; const q = ST.cl.find(o => o.id === T.id), p = posOf(T.k);
    if (!q || --T.n <= 0) AU.trail = null; else { const l = q.pts[q.pts.length - 1]; if (dist2(l[0], l[1], p.x, p.z) > .7) { q.pts.push([r2(p.x), r2(p.z)]); pushState(); } }
  }
  for (let i = ST.cl.length - 1; i >= 0; i--) if ((ST.cl[i].t -= dt) <= 0) ST.cl.splice(i, 1);
  // 🪪 зчитувачі бейджів: хто де був (люди й боти)
  if ((AU.bdT -= dt) <= 0) {
    AU.bdT = .5;
    for (const q of [...c.map(p => ({ n: p.name, x: p.x, z: p.z })), ...ST.bt.map(b => ({ n: botWho(b), x: b.x, z: b.z }))]) { const rm = roomAt(q.x, q.z); if (rm && LOCKR.test(rm.n)) (AU.badge[rm.n] || (AU.badge[rm.n] = {}))[q.n] = ST.t; }
  }
  // 🧽 нові калюжі кави
  if ((AU.mopT -= dt) <= 0) { AU.mopT = 45; if (ST.mp5.length < MOP_MAX && cands().length) { const p = offs(pick(cands()), rand(-1.5, 1.5), rand(-1.5, 1.5)); ST.mp5.push({ id: ++AU.fid, x: p.x, z: p.z }); emit({ k: 'puddle', room: p.n }); pushState(); } }
}

/* ======================= Клієнт v5 ======================= */
function client5(dt) {
  V.role = !V.sab && ST.on && ST.sh && ST.rh ? (hashS(ST.sh[0] + 'sec' + myKey()) === ST.rh[0] ? 'sec' : hashS(ST.sh[0] + 'int' + myKey()) === ST.rh[1] ? 'int' : '') : '';
  if (ST.rid !== V.chkR) { V.chkR = ST.rid; Object.assign(V, { chM: 0, chSent: 0, chk: 1 }); }
  chairPose();
  // 🪑 своє крісло — шлемо позицію; чужі — ставимо туди, де їх везе вершник
  if (WORLD.on && !AUTH() && pl.ride && pl.ride.kind === 'chair' && inOffice(pl.x, pl.z) && (V.cpT = (V.cpT || 0) - dt) <= 0) { V.cpT = .1; A.send('rq', { k: 'chairpos', i: BODIES.indexOf(pl.ride), x: r2(pl.x), z: r2(pl.z), f: r2(pl.face) }); }
  if (V.cp) for (const i in V.cp) { const c = V.cp[i], b = BODIES[i]; if (!b || gameTime - c.t > .8 || b === pl.ride) { delete V.cp[i]; continue; } b.x = c.x; b.z = c.z;   /* ядро тягне до обрізаних ±500 координат — ставимо точно */ b.tx = c.x; b.tz = c.z; b.ty = 0; b.try = c.f + Math.PI; b.m.position.set(b.x, 0, b.z); b.m.rotation.set(0, c.f + Math.PI, 0); }
  render5(dt); secretCard(); avralFX();
  if (V.mg) { V.mg.t -= dt; const el = document.getElementById('dl-mg-t'); if (el) el.textContent = Math.max(0, Math.ceil(V.mg.t)) + ' с'; if (V.mg.t <= 0 || !running || pl.dead || (V.mg.at && dist2(pl.x, pl.z, V.mg.at.x, V.mg.at.z) > 3)) miniDone(false); }
  // 🚨 збори: на етапі голосування всіх, хто не дійшов, переносить у переговорну
  const M = ST.mt;
  if (!M || M.ph === 'go') V.mtIn = 0;
  else if (!V.mtIn && running && !pl.dead && inOffice(pl.x, pl.z)) { V.mtIn = 1; const mp = mpos(); if (dist2(pl.x, pl.z, mp.x, mp.z) > 3.2) { if (pl.ride) dismount(false); const p = freeSpot(mp.x + rand(-1, 1), mp.z + rand(-1, 1)); pl.x = p.x; pl.z = p.z; pl.y = 0; camPos.set(pl.x, 20, pl.z + 15); camLook.set(pl.x, .5, pl.z); toast('🚨 Не встиг — тебе телепортувало на збори.'); } }
  // 🪑 таємне завдання: рахуємо метри на кріслі
  if (V.sab && ST.co === 1 && pl.ride && pl.ride.kind === 'chair') {
    const lp = V.chLp; if (lp) V.chM += Math.min(1, dist2(lp.x, lp.z, pl.x, pl.z)); V.chLp = { x: pl.x, z: pl.z };
    if (V.chM >= 5 && !V.chSent) { V.chSent = 1; req('sab', { w: 'chair' }); }
  } else V.chLp = null;
}
/* 🪑 крісло на коліщатках: сидячи (свій герой — тут; інші бачать «chair» у стані гравця) */
function chairPose() {
  if (typeof hero !== 'undefined' && hero) {
    const sit = !!(pl.ride && pl.ride.kind === 'chair');
    if (sit) { hero.body.position.y = -.4; hero.l1.rotation.x = hero.l2.rotation.x = -1.4; V.rideSit = 1; }
    else if (V.rideSit) { V.rideSit = 0; hero.body.position.y = 0; hero.l1.rotation.x = hero.l2.rotation.x = 0; }
  }
  if (typeof NET !== 'undefined' && NET.players) for (const id in NET.players) { const r = NET.players[id]; if (r && r.h && r.act === 'chair' && inOffice(r.x, r.z)) { r.h.body.position.y = -.4; r.h.l1.rotation.x = r.h.l2.rotation.x = -1.4; } }
}
/* ---------- Моделі v5: докази, калюжі, коробки, червоні кнопки, пост охорони, кольори сорочок ---------- */
function render5(dt) {
  const M5 = V.m5, here = running && inOffice(pl.x, pl.z);
  syncMap(M5.cl, here ? ST.cl : [], q => {
    const g = new THREE.Group();
    if (q.k === 'foot') g.userData.n = 0;
    else if (q.k === 'badge') { put(g, mesh(new THREE.BoxGeometry(.3, .45, .08), '#2E2346', false), 0, 1.1, 0); const s = sprite('🪪', .7); s.position.y = 1.9; g.add(s); }
    else if (q.k === 'ash') { const m = put(g, mesh(new THREE.CircleGeometry(.55, 16), '#3A3440', false), 0, .04, 0); m.rotation.x = -Math.PI / 2; const s = sprite('⚱️', .6); s.position.y = 1.2; g.add(s); }
    else { for (let i = 0; i < 9; i++) put(g, mesh(new THREE.BoxGeometry(.04, .01, .5), '#FFFFFF', false), Math.sin(i * 2.3) * .4, .03, Math.cos(i * 1.7) * .3).rotation.y = i; const s = sprite('🗜️', .6); s.position.y = 1.2; g.add(s); }
    g.position.set(q.k === 'foot' ? 0 : q.x, 0, q.k === 'foot' ? 0 : q.z); scene.add(g); return g;
  }, (g, q) => {
    if (q.k !== 'foot' || !q.pts || g.userData.n === q.pts.length) return;
    while (g.children.length) g.remove(g.children[0]);
    q.pts.forEach((t, i) => { const n = q.pts[i + 1] || t, a = Math.atan2(n[0] - t[0], n[1] - t[1]); for (const s of [-1, 1]) { const m = put(g, mesh(new THREE.CircleGeometry(.09, 8), '#6B4226', false), t[0] + Math.cos(a) * s * .12, .035, t[1] - Math.sin(a) * s * .12); m.rotation.x = -Math.PI / 2; m.scale.y = 1.7; } });
    g.userData.n = q.pts.length;
  });
  syncMap(M5.mp, here ? ST.mp5 : [], q => { const g = new THREE.Group(), m = put(g, mesh(new THREE.CircleGeometry(.7, 18), mat('#7A5233', { transparent: true, opacity: .75 }), false), 0, .03, 0); m.rotation.x = -Math.PI / 2; m.scale.x = 1.3; const s = sprite('🧽', .55); s.position.y = .9; g.add(s); g.position.set(q.x, 0, q.z); scene.add(g); return g; }, () => { });
  // розклад раунду: зони коробок, червоні кнопки, пост охорони, архівні шафи
  const S5 = ST.on ? ST.s5 : null, sig = S5 && here ? ST.rid + ':' + ST.vi : '';
  if (sig !== M5.laySig) {
    M5.laySig = sig; if (M5.lay) { scene.remove(M5.lay); M5.lay = null; }
    if (sig) {
      const g = new THREE.Group(), lbl = (txt, x, z, y, s) => { const sp = sprite(txt, s || .8); sp.position.set(x, y, z); g.add(sp); };
      for (const b of S5.btn) { put(g, mesh(new THREE.CylinderGeometry(.28, .34, .9, 12), '#4E4A6E', false), b.x, .45, b.z); put(g, mesh(new THREE.SphereGeometry(.22, 12, 8), mat('#FF2E4D', { emissive: '#FF2E4D', emissiveIntensity: .7 }), false), b.x, .95, b.z); lbl('🚨', b.x, b.z, 1.8); }
      if (S5.sec) { put(g, mesh(new THREE.BoxGeometry(1, .75, .6), '#5A6278', false), S5.sec.x, .375, S5.sec.z); put(g, mesh(new THREE.BoxGeometry(.7, .45, .06), mat('#6BE7FF', { emissive: '#6BE7FF', emissiveIntensity: .6 }), false), S5.sec.x, 1.05, S5.sec.z); lbl('📹', S5.sec.x, S5.sec.z, 1.9); }
      S5.doc.forEach((d, i) => { if (i) put(g, mesh(new THREE.BoxGeometry(.6, 1.2, .5), '#8C8FA8', false), d.x, .6, d.z); lbl('🗂️', d.x, d.z, i ? 1.7 : 2.2, .6); });
      scene.add(g); M5.lay = g;
    }
  }
  // 📦 зони А і Б + стос коробок, що лишились
  const B = here && ST.on ? ST.bx : null, bsig = B ? `${ST.rid}:${B.done}:${B.cb.length}` : '';
  if (bsig !== M5.bsig) {
    M5.bsig = bsig; if (M5.bz) { scene.remove(M5.bz); M5.bz = null; }
    if (B && B.a && B.b) {
      const g = new THREE.Group();
      for (const [p, t, c] of [[B.a, '📦', '#FFB35C'], [B.b, '🎯', '#7FE08A']]) { const r = put(g, mesh(new THREE.RingGeometry(.9, 1.1, 28), bulb(c), false), p.x, .05, p.z); r.rotation.x = -Math.PI / 2; const s = sprite(t, .8); s.position.set(p.x, 1.6, p.z); g.add(s); }
      for (let i = 0; i < B.need - B.done - B.cb.length; i++) put(g, mesh(new THREE.BoxGeometry(.5, .4, .5), '#C9955E', false), B.a.x + (i % 2) * .55 - .27, .2 + Math.floor(i / 2) * .41, B.a.z);
      for (let i = 0; i < B.done; i++) put(g, mesh(new THREE.BoxGeometry(.5, .4, .5), '#C9955E', false), B.b.x + (i % 2) * .55 - .27, .2 + Math.floor(i / 2) * .41, B.b.z);
      scene.add(g); M5.bz = g;
    }
  }
  // коробка в руках
  const want = new Map(); if (B) for (const k of B.cb) { const hh = rootOf(k), root = hh && (hh.root || hh); if (root) want.set(k, root); }
  for (const [k, o] of M5.box) if (want.get(k) !== o.root) { if (o.m.parent) o.m.parent.remove(o.m); M5.box.delete(k); }
  for (const [k, root] of want) if (!M5.box.has(k)) { const m = mesh(new THREE.BoxGeometry(.55, .42, .5), '#C9955E', false); m.position.set(0, 1.25, .45); root.add(m); M5.box.set(k, { m, root }); }
  // 👕 кольорове коло під ногами — колір сорочки (камери бачать саме його)
  const sh = new Map();
  if (here && ST.on) for (const [k, ci] of ST.shc) {
    let root = null;
    if (k.startsWith('npc:')) { const c = V.cols[+k.slice(4)]; root = c && c.h.root.visible ? c.h.root : null; } else { const hh = rootOf(k); root = hh && (hh.root || hh); }
    if (root) sh.set(k, { root, ci });
  }
  for (const [k, o] of M5.sh) { const n = sh.get(k); if (!n || n.root !== o.root || n.ci !== o.ci) { if (o.m.parent) o.m.parent.remove(o.m); M5.sh.delete(k); } }
  for (const [k, n] of sh) if (!M5.sh.has(k)) { const m = mesh(new THREE.RingGeometry(.42, .58, 20), bulb(SHIRT[n.ci][2]), false); m.rotation.x = -Math.PI / 2; m.position.y = .06; n.root.add(m); M5.sh.set(k, { m, root: n.root, ci: n.ci }); }
}
/* ---------- 🔥 Аврал: червона рамка, що пульсує ---------- */
function avralFX() {
  if (!V.avEl) { V.avEl = document.createElement('div'); V.avEl.id = 'dl-avral'; V.avEl.style.cssText = 'position:fixed;inset:0;z-index:1;pointer-events:none;box-shadow:inset 0 0 70px 12px rgba(255,46,77,.55);opacity:0'; document.body.appendChild(V.avEl); }
  const on = running && ST.on && ST.av && inOffice(pl.x, pl.z) && !panel;
  V.avEl.style.opacity = on ? (.45 + Math.abs(Math.sin(gameTime * 4)) * .55).toFixed(2) : 0;
}
/* ---------- Приватна картка: роль і 🪑 таємне завдання ---------- */
function secretCard() {
  let el = document.getElementById('dl-secret');
  const show = running && !pl.dead && ST.on && inOffice(pl.x, pl.z) && !panel && ((V.sab && !ST.sbC) || V.role);
  if (!show) { if (el) el.style.display = 'none'; return; }
  if (!el) { el = document.createElement('div'); el.id = 'dl-secret'; el.style.cssText = 'position:fixed;left:12px;top:calc(env(safe-area-inset-top,0px) + 150px);z-index:2;pointer-events:none;background:rgba(46,35,70,.9);color:#fff;border-radius:12px;padding:7px 11px;font:600 12px/1.4 system-ui,sans-serif;max-width:210px'; document.body.appendChild(el); }
  let h = V.sab ? `🕵️ <b>Саботажник</b> · очки: див. фінал` : V.role === 'sec' ? `🛡️ <b>Безпековик</b> · ${V.chk ? 'перевірка: F біля колеги' : 'перевірку використано'}` : `🧑‍🎓 <b>Стажер</b> · завдання ×2 довше, першу нараду пробачать`;
  if (V.sab && ST.co) { const k = ST.co === 2 ? 1 : clamp(V.chM / 5, 0, 1); h += `<br>🪑 Таємне: накатай 5 м на кріслі<div style="height:7px;border-radius:4px;background:#4E4A6E;margin-top:3px"><div id="dl-chbar" style="height:7px;border-radius:4px;width:${Math.round(k * 100)}%;background:${ST.co === 2 ? '#7FE08A' : '#FFB35C'}"></div></div>${ST.co === 2 ? '✅ виконано (+5)' : `${Math.min(5, V.chM).toFixed(1)} / 5 м`}`; }
  if (el.innerHTML !== h) el.innerHTML = h; el.style.display = '';
}

/* ---------- 🎮 Міні-ігри (маленькі вікна ~10 с): кабелі, набір слова, злам, перемикачі, шредер ---------- */
const MGT = { cable: ['🖨️ Драйвер принтера', 'Зʼєднай кабелі за кольором: тисни гнізда в показаному порядку'], type: ['⌨️ Набери слово', 'Набери показане слово й натисни Enter'], seq: ['💻 Злам сервера', 'Натискай стрілки (або кнопки) у показаному порядку'],
  sw: ['⚡ Щиток', 'Перемкни 3 автомати в показаному порядку'], shred: ['🗜️ Шредер', 'Тисни ← і → по черзі, поки папір не стане локшиною'], docs: ['🗂️ Знищити документи', 'Як позбутись доказів?'] };
function mini(kind, win, opt) {
  if (V.mg || SIMSIDE || typeof document === 'undefined') return;
  const o = opt || {}, C = shuffle([0, 1, 2, 3, 4, 5]).slice(0, 3), AR = ['↑', '↓', '←', '→'];
  V.mg = { kind, win, t: kind === 'docs' ? 15 : 12, at: o.at || { x: pl.x, z: pl.z }, i: 0, seq: kind === 'cable' ? shuffle(C.slice()) : kind === 'seq' ? Array.from({ length: 5 }, () => pick(AR)) : kind === 'sw' ? shuffle(['А', 'Б', 'В']) : kind === 'shred' ? Array.from({ length: 10 }, (_, i) => i % 2 ? '→' : '←') : [], word: o.w || pick(WORDS), C };
  V.act = null; drawMini();
}
function drawMini() {
  const M = V.mg; if (!M) return;
  let el = document.getElementById('dl-mini');
  if (!el) {
    el = document.createElement('div'); el.id = 'dl-mini';
    el.style.cssText = 'position:fixed;left:50%;top:44%;transform:translate(-50%,-50%);z-index:36;width:min(380px,92vw);background:#2E2346;color:#fff;border-radius:16px;padding:14px 16px;font:14px/1.4 system-ui,sans-serif;box-shadow:0 14px 40px rgba(0,0,0,.5);text-align:center;border:3px solid #6BE7FF';
    el.addEventListener('click', ev => { const b = ev.target.closest('[data-mg]'); if (b) miniKey(b.dataset.mg); });
    document.body.appendChild(el);
  }
  const bs = 'border:0;border-radius:10px;padding:9px 13px;margin:3px;font:800 16px system-ui;cursor:pointer;';
  let body = '';
  if (M.kind === 'cable') body = `<div>Наступний кабель: <b style="font-size:22px">${M.seq[M.i] != null ? SHIRT[M.seq[M.i]][0] : '✅'}</b> (${M.i}/3)</div><div>${M.C.map(c => `<button data-mg="c${c}" style="${bs}background:${SHIRT[c][2]};color:#fff">🔌</button>`).join('')}</div>`;
  else if (M.kind === 'type') body = `<div style="font:900 26px monospace;letter-spacing:3px;margin:4px 0">${escapeHTML(M.word)}</div><input id="dl-mg-in" autocomplete="off" style="font:700 18px monospace;width:80%;padding:6px;border-radius:8px;border:0;text-align:center;text-transform:uppercase">`;
  else if (M.kind === 'seq' || M.kind === 'shred') body = `<div style="font:900 24px monospace;margin:4px 0">${M.seq.map((a, i) => `<span style="opacity:${i < M.i ? .3 : 1};color:${i === M.i ? '#FFE066' : '#fff'}">${a}</span>`).join(' ')}</div><div>${['←', '↑', '↓', '→'].map(a => `<button data-mg="${a}" style="${bs}background:#FFE066;color:#2E2346">${a}</button>`).join('')}</div>`;
  else if (M.kind === 'sw') body = `<div>Порядок: <b>${M.seq.map((a, i) => i < M.i ? '✅' : a).join(' → ')}</b></div><div>${['А', 'Б', 'В'].map(a => `<button data-mg="${a}" style="${bs}background:${M.seq.indexOf(a) < M.i ? '#7FE08A' : '#8E86B0'};color:#2E2346">🎚️ ${a}</button>`).join('')}</div>`;
  else if (M.kind === 'docs') body = `<div><button data-mg="burn" style="${bs}background:#FF8A3C;color:#2E2346">🔥 Спалити — швидко, але дим, попіл і пожежна тривога</button><button data-mg="shred" style="${bs}background:#C9CDD9;color:#2E2346">🗜️ Шредер — тихо, але довше (міні-гра), лишається локшина</button></div>`;
  el.innerHTML = `<div style="font:900 18px system-ui">${MGT[M.kind][0]} <span id="dl-mg-t" style="float:right;font-size:14px;opacity:.8">${Math.ceil(M.t)} с</span></div><div style="opacity:.8;font-size:12px;margin-bottom:6px">${MGT[M.kind][1]}</div>${body}<div style="margin-top:8px"><button data-mg="x" style="${bs}font-size:12px;background:#4E4A6E;color:#fff">✖ Закрити</button></div>`;
  el.style.display = '';
  const inp = document.getElementById('dl-mg-in');
  if (inp) { inp.addEventListener('keydown', ev => { ev.stopPropagation(); if (ev.key === 'Enter') miniKey('enter'); }); inp.addEventListener('keyup', ev => ev.stopPropagation()); inp.addEventListener('input', () => { if (inp.value.trim().toUpperCase() === M.word.toUpperCase()) miniKey('enter'); }); try { inp.focus(); } catch (e) { } }
}
function miniKey(k) {
  const M = V.mg; if (!M) return;
  if (k === 'x') { miniDone(false, 1); return; }
  if (M.kind === 'docs') { if (k === 'burn' || k === 'shred') miniDone(true, 0, k); return; }
  if (M.kind === 'type') { const inp = document.getElementById('dl-mg-in'); if (k === 'enter') { if (inp && inp.value.trim().toUpperCase() === M.word.toUpperCase()) miniDone(true); else { M.t -= 2; toast('❌ Не те слово!'); } } return; }
  const want = M.kind === 'cable' ? 'c' + M.seq[M.i] : M.seq[M.i];
  if (k === want) { M.i++; sfx('tick'); if (M.i >= M.seq.length) { miniDone(true); return; } }
  else { M.t -= 1.5; sfx('hurt'); if (M.kind === 'sw') M.i = 0; }
  drawMini();
}
function miniDone(ok, quiet, arg) {
  const M = V.mg; V.mg = null; const el = document.getElementById('dl-mini'); if (el) el.style.display = 'none';
  if (!M) return;
  if (ok) { sfx('level'); M.win(arg); } else if (!quiet) toast('❌ Не встиг — спробуй ще раз (F).');
}
if (!SIMSIDE && typeof document !== 'undefined') document.addEventListener('keydown', ev => {
  const M = V.mg; if (!M || M.kind === 'type') return;
  const k = { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Escape: 'x' }[ev.key]; if (!k) return;
  ev.preventDefault(); ev.stopPropagation(); miniKey(k);
}, true);

/* ---------- F (v5): докази, пост охорони, кнопки зборів, коробки, швабра, безпековик, саботажні міні-ігри ---------- */
function interact5(near, h) { return interact5s(near) || interact5a(near) || clueAct() || interact5b(near, h); }
/* 🔎 докази — F кладе їх у справу */
function clueAct() {
  if (!ST.on || ST.mt) return null;
  const cl = ST.cl.find(q => clueNear(q, pl, 1.3));
  return cl ? { l: `🔎 Зібрати доказ: ${CLUEI[cl.k].ic} ${CLUEI[cl.k].n} → у 🗂️ справу`, fn: () => { req('clue', { id: cl.id }); sfx('pick'); } } : null;
}
function interact5a(near) {
  if (!ST.on || ST.mt) return null;
  const S5 = ST.s5, k = myKey();
  if (S5) for (const b of S5.btn) if (near(b, 1.4)) return V.sab ? { l: '🚨 Червона кнопка зборів (саботажнику краще не світитись)', fn: () => { } } : V.mc > 0 ? { l: '🚨 Скликати збори!', fn: callMeeting } : { l: '🚨 Збори вже скликав(ла) цього раунду', fn: () => { } };
  if (S5 && S5.sec && near(S5.sec, 1.5)) return { l: `📹 Пост охорони: переглянути записи камер${ST.camN ? ` (${ST.camN})` : ''}`, fn: () => { req('cam'); camView(); } };
  return null;
}
/* 🕵️ саботажник: злам сервера й документи — через міні-ігри (пріоритетніше за робочі точки) */
function interact5s(near) {
  if (!ST.on || ST.mt) return null;
  const S5 = ST.s5;
  if (V.sab && !ST.sbC) {
    if (near(RACK.p, 1.6)) return V.sbcd > 0 ? { l: `💻 Злам сервера — зачекай ${Math.ceil(V.sbcd)} с`, fn: () => { } } : { l: '💻 Зламати сервер (міні-гра)', fn: () => mini('seq', () => req('sab', { w: 'hack' }), { at: RACK.p }) };
    if (S5) for (const d of S5.doc) if (near(d, 1.6)) return V.sbcd > 0 ? { l: `🗂️ Документи — зачекай ${Math.ceil(V.sbcd)} с`, fn: () => { } } : { l: '🗂️ Знищити документи (🔥 чи 🗜️)', fn: () => mini('docs', ch => ch === 'burn' ? startAct(() => req('sab', { w: 'burn' }), 1, () => d, '🔥', 'Підпалюю папки', () => '') : mini('shred', () => req('sab', { w: 'shred' }), { at: d }), { at: d }) };
  }
  return null;
}
function interact5b(near, h) {
  if (!ST.on || ST.mt) return null;
  const k = myKey();
  { const r = clueAct(); if (r) return r; }
  // 🛡️ безпековик перевіряє колегу
  if (V.role === 'sec' && V.chk) {
    if (ST.sk === 'n') { for (const d of DESKS) if (!pestOf(d.i) && near(colPos(d.i), 1.5)) return { l: `🛡️ Перевірити ${NAMES[d.i]} (раз за раунд)`, fn: () => { V.chk = 0; req('chk', { c: 'npc:' + d.i }); } }; }
    else for (const id in NET.players) { const r = NET.players[id]; if (r && r.name && near(r, 1.8)) return { l: `🛡️ Перевірити ${escapeHTML(r.name)} (раз за раунд)`, fn: () => { V.chk = 0; req('chk', { c: r.name }); } }; }
  }
  // 📦 коробки
  const B = ST.bx;
  if (B && B.done < B.need) {
    if (carrying(k) && near(B.b, 1.6)) return { l: '📦 Поставити коробку в зоні Б', fn: () => req('box') };
    if (!carrying(k) && near(B.a, 1.6)) return h.it ? { l: '📦 Руки зайняті — спершу віддай папери', fn: () => { } } : { l: `📦 Взяти коробку (${B.done}/${B.need} перенесено)`, fn: () => req('box') };
  }
  // 🧽 калюжі
  const pu = ST.mp5.find(q => near(q, 1.4));
  if (pu) return { l: '🧽 Помити підлогу (2 с)', fn: () => startAct(() => req('mop'), 2, () => pu, '🧽', 'Мию підлогу', () => '') };
  return null;
}
/* швабра на сліди (окремо, щоб F по слідах збирав доказ, а клавіша G — мила) */
function mopHere() { if (!can3() || V.act) return; startAct(() => req('mop'), 2, () => ({ x: pl.x, z: pl.z }), '🧽', 'Мию підлогу', () => ''); }
if (!SIMSIDE) A.key('KeyG', () => { if (running && !panel && ST.on && inOffice(pl.x, pl.z)) { mopHere(); return true; } return false; });
/* 📹 вікно записів камер (те, що вже в справі) */
function camView() {
  const rec = ST.cs.filter(q => q.txt.startsWith('📹'));
  toast(rec.length ? `📹 <b>Записи камер:</b><br>${rec.slice(-4).map(q => escapeHTML(q.txt)).join('<br>')}` : '📹 Камери поки нічого підозрілого не записали.');
}
function goal5(h) {
  const M = ST.mt;
  if (M && M.ph === 'go') { const mp = mpos(), d = dist2(pl.x, pl.z, mp.x, mp.z); return { id: 'meet', tg: mp, txt: `🚨 <b>Негайно в переговорну!</b> (${escapeHTML(mp.n || '')}) ${d < 3.2 ? '— ти на місці, чекаємо інших' : '— біжи за стрілкою'} · ${Math.max(0, Math.ceil(M.t))} с` }; }
  if (carrying(myKey()) && ST.bx) return { id: 'box', tg: ST.bx.b, txt: '📦 Неси коробку в зону <b>🎯 Б</b> (F там). З коробкою ходиш повільніше.' };
  return null;
}

/* ---------- Фінальний екран: статистика й досягнення ---------- */
function finalScreen(e) {
  if (SIMSIDE || typeof document === 'undefined' || !Array.isArray(e.ps)) return;
  const nm = k => !k || k === 'me' || isMe(k) ? 'Ти' : String(k), rows = e.ps.map(a => ({ k: String(a[0]), t: a[1] | 0, f: a[2] | 0, c: a[3] | 0, s: a[4] | 0, v: a[5] | 0, m: a[6] | 0, b: a[7] | 0 }));
  const best = (f, min) => { const r = rows.slice().sort((a, b) => b[f] - a[f])[0]; return r && r[f] >= min ? r : null; };
  const ach = [];
  const add = (r, ic, n, why) => { if (r) ach.push({ k: r.k, txt: `${ic} <b>${n}</b> — ${escapeHTML(nm(r.k))} (${why})` }); };
  add(best('c', 2), '🔎', 'Офісний Шерлок', 'найбільше доказів');
  add(best('f', 1), '🧯', 'Пожежник місяця', 'гасив серверну');
  add(best('m', 1), '🧽', 'Прибиральник року', 'мив підлогу');
  add(best('t', 3), '💼', 'Трудоголік', 'найбільше завдань');
  add(best('b', 2), '📦', 'Вантажник кварталу', 'коробки');
  if (e.sab && !e.sc && (+e.sp || 0) >= 3) ach.push({ k: e.sk === 'p' ? e.sab : '', txt: `🕶️ <b>Тихий диверсант</b> — ${escapeHTML(e.sab)} (${e.sp | 0} очок саботажу, не викрили)` });
  if (e.co === 2) ach.push({ k: e.sab, txt: `🪑 <b>Крісло-гонщик</b> — ${escapeHTML(e.sab)} (таємне завдання)` });
  const mine = ach.filter(a => a.k && (a.k === 'me' || isMe(a.k))).length;
  if (mine) { P.coins += mine * 10; const D = A.data(); D.ach = (D.ach || 0) + mine; }
  let el = document.getElementById('dl-final');
  if (!el) { el = document.createElement('div'); el.id = 'dl-final'; el.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:37;width:min(560px,94vw);max-height:86vh;overflow:auto;background:#2E2346;color:#fff;border-radius:18px;padding:14px 16px;font:13px/1.45 system-ui,sans-serif;box-shadow:0 14px 44px rgba(0,0,0,.55);text-align:center;border:3px solid #FFE066;cursor:pointer'; el.addEventListener('click', () => { el.style.display = 'none'; }); document.body.appendChild(el); }
  const td = 'padding:3px 6px;border-bottom:1px solid #4E4A6E';
  el.innerHTML = `<div style="font:900 21px system-ui">${e.win ? '📤 Звіт здано!' : '🕕 Дедлайн зірвано'} · підсумки зміни</div>
    <table style="width:100%;border-collapse:collapse;margin:8px 0;font-size:12px"><tr style="color:#FFE066"><th style="${td};text-align:left">Хто</th><th style="${td}">✅ завдань</th><th style="${td}">🧯 пожеж</th><th style="${td}">🔎 доказів</th><th style="${td}">🕵️ саботажу</th><th style="${td}">🗳️ голосів</th></tr>
    ${rows.map(r => `<tr><td style="${td};text-align:left">${escapeHTML(nm(r.k))}</td><td style="${td}">${r.t}</td><td style="${td}">${r.f}</td><td style="${td}">${r.c}</td><td style="${td}">${r.s}</td><td style="${td}">${r.v}</td></tr>`).join('') || `<tr><td colspan="6" style="${td}">—</td></tr>`}</table>
    ${e.sab ? `<div>🕵️ Саботажник: <b>${escapeHTML(e.sab)}</b> · очки саботажу: <b>${e.sp | 0}</b>${e.sc ? ' · викрили ✅' : ''}</div>` : ''}
    <div style="margin-top:8px;font:800 14px system-ui">🏆 Досягнення</div><div>${ach.map(a => a.txt).join('<br>') || 'Цього разу без нагород — наступного разу вийде!'}</div>
    ${mine ? `<div style="color:#7FE08A;margin-top:4px">Твої досягнення: +${mine * 10} 🪙</div>` : ''}<div style="opacity:.7;font-size:11px;margin-top:8px">клікни, щоб закрити</div>`;
  el.style.display = ''; V.finEl = el;
}
/* 🚨 драматичний вердикт наради */
function verdict(e) {
  if (SIMSIDE || typeof document === 'undefined') return;
  let el = document.getElementById('dl-verdict');
  if (!el) { el = document.createElement('div'); el.id = 'dl-verdict'; el.style.cssText = 'position:fixed;inset:0;z-index:38;display:flex;align-items:center;justify-content:center;flex-direction:column;pointer-events:none;background:rgba(10,6,25,.82);color:#fff;font:900 30px system-ui,sans-serif;text-align:center;transition:opacity .5s'; document.body.appendChild(el); }
  el.innerHTML = !e.out ? '<div>⏭️ Продовжуємо роботу</div><div style="font-size:16px;opacity:.8">ніхто нікого не звільнив</div>'
    : e.imm ? `<div>🧑‍🎓 ${escapeHTML(e.nm)} — стажер</div><div style="font-size:16px;opacity:.8">перше попередження — його пробачили (не звільнено)</div>`
    : `<div>🗂️ Звільнено: ${escapeHTML(e.nm)}</div><div style="font-size:22px;color:${e.ok ? '#7FE08A' : '#FF5C7A'}">${e.ok ? '— він(вона) БУВ(ЛА) саботажником! 🕵️' : '— він(вона) НЕ був(ла) саботажником… 😬'}</div>`;
  el.style.opacity = 1; el.style.display = 'flex'; clearTimeout(V.vdT); V.vdT = setTimeout(() => { el.style.opacity = 0; el.style.display = 'none'; }, 3500);
}
/* ---------- Події v5 ---------- */
function onEvent5(e, here, nm) {
  const k = e.k, me = isMe(e.who) || isMe(e.to);
  if (k === 'clue') { if (here) toast(`🗂️ ${me ? 'Ти додав(ла)' : nm + ' додає'} у справу: ${escapeHTML(e.txt)}`); if (me) sfx('coin'); }
  else if (k === 'mop') { if (here) { burst(+e.x, .3, +e.z, '#8FD9FF', 10, 2, .5, 1); if (me) toast(`🧽 Чисто!${e.n ? ` +${4 * e.n} с до дедлайну — начальник любить чистоту.` : ''}${e.c ? ' (Ой, і сліди теж змив…)' : ''}`); } }
  else if (k === 'puddle') { if (here) toast(`☕ Хтось розлив каву${e.room ? ' · ' + escapeHTML(e.room) : ''} — 🧽 помий (F), +4 с.`); }
  else if (k === 'boxup') { if (me) toast('📦 Коробка в руках — неси в зону 🎯 Б. Важко, повільно…'); }
  else if (k === 'box') { if (here) toast(`📦 ${nm}: коробка ${e.n}/${BOX_N} на місці.`); }
  else if (k === 'boxes') { if (here) { banner('📦 Усі коробки перенесено — склад щасливий: +25 с до дедлайну!'); sfx('level'); } }
  else if (k === 'chk') { if (me) { banner(e.r ? `🛡️ Перевірка: ${e.nm} — САБОТАЖНИК!` : `🛡️ Перевірка: ${e.nm} — чистий(а).`); toast(`🛡️ Результат бачиш лише ти: <b>${escapeHTML(e.nm)}</b> ${e.r ? '— 🕵️ саботажник! Скликай збори.' : '— не саботажник.'}`); } }
  else if (k === 'chairok') { if (me) { toast('🪑 Таємне завдання виконано: +5 очок саботажу. Ніхто нічого не помітив… 😈'); sfx('coin'); } }
  else if (k === 'chairpos') { if (!isMe(e.who) && typeof BODIES !== 'undefined' && BODIES[e.i | 0] && BODIES[e.i | 0].kind === 'chair') (V.cp || (V.cp = {}))[e.i | 0] = { x: +e.x, z: +e.z, f: +e.f, t: gameTime }; }
  else if (k === 'rumor') { if (me) toast(escapeHTML(e.txt)); }
  else if (k === 'dark') { if (me) toast('⚡ Темно — з паперами нічого не зробиш. Спершу щиток!'); }
  else if (k === 'pwhold') { if (me) toast('⚡ Ти тримаєш автомат… потрібен ще один колега поруч (або міні-гра «3 перемикачі» наодинці).'); }
  else if (k === 'avral') { if (here) { banner('🔥 АВРАЛ! 2 хвилини до 18:00 — начальник бігає, зомбі лізуть, принтер жує!'); sfx('warn'); shake = Math.max(shake, .3); } }
  else if (k === 'bossv') { if (here) { banner(`📢 Начальник: «${BOSSV[e.i | 0] || BOSSV[0]}»`); if (V.boss) bubble(V.boss.ent, '📢', false, 2.5); } }
  else if (k === 'alarm') { if (here) { banner(`🚨 Пожежна тривога: ${e.room || 'офіс'} — хтось палить документи!`); sfx('warn'); burst(+e.x, 1.5, +e.z, '#857C99', 24, 2, 1.6, 3); } }
  else return false;
  return true;
}

if (window.__ADDON_TEST) window.__deadline = { ST, AU, V, LAY, get L() { return L; }, get DESKS() { return DESKS; }, get START() { return START; }, get SEND() { return SEND; }, get PRINTER() { return PRINTER; }, get COFFEE() { return COFFEE; }, get TUBE() { return TUBE; }, get STAIRS() { return STAIRS; }, get LIFTS() { return LIFTS; }, get OBS() { return OBS; }, get WALLS() { return WALLS; },
  STEPS, goal, intro, chaos, req, myHeld, myKey, blocked, navPath, clockStr, cur, useVar, floorOf, inOffice, firePlunger, throwReport, coffeeDash, reachable, roomAt, roomLabels, lobbyDef, openLobby,
  get COOLER() { return COOLER; }, get RACK() { return RACK; }, get VALVE() { return VALVE; }, get NAMES() { return NAMES; }, CUPS, hashS, pestOf, colPos, fireC, fireR, dock, throwPlane, spray, throwMolotov, callMeeting, sabotage, sabTarget, turnPest, startFire, botSabotage, startMeeting, endMeeting, onReq };
if (window.__ADDON_TEST) Object.assign(window.__deadline, { mini, miniKey, miniWin: arg => { if (V.mg) miniDone(true, 0, arg); }, mpos, cands, setRoles, clue5, stat, finalScreen, interact5, chairPose, pkOn, CLUEI, SHIRT });
if (window.__ADDON_TEST) Object.defineProperties(window.__deadline, { PANEL: { get: () => PANEL }, ARCHIVE: { get: () => ARCHIVE } });
