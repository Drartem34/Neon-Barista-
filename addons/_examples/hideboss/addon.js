/* Аддон «Сховайся від боса» (ХОВАНКИ) v2: Prop Hunt на 2–6 гравців (а наодинці — проти ботів)
   на високому поверсі хмарочоса в центрі міста. Три поверхи на вибір (голосування в ліфтовому холі):
   - «Поверх 42 · Опенспейс» — класичний офіс: коридор, опенспейс, переговорна, скляний кабінет боса, кухня, лаунж.
   - «Поверх 57 · Колл-центр» — нічна зміна: великий зал з рядами кабінок, тренінг-зала, кімната сну, серверна.
   - «Поверх 63 · Юридична фірма» — архів-лабіринт зі стелажами, зала засідань, пошта з візками, зимовий сад.
   Один гравець — БОС, решта — ліниві офісники, що маскуються під меблі.
   - Офісник: F біля меблів — маскування. Рух у маскуванні повільний і хитає предмет. «Продуктивність» тане —
     поповнюй за комп’ютером (F біля столу, 3 с, тебе видно). 📄 Фейковий звіт — приманка (1 раз).
     🛞 ТАРАН (фізичний тролінг): у маскуванні крісла на коліщатках, кулера чи поштового візка розганяєшся
     й врізаєшся босові в ноги — бос падає на 2 с і не може ловити (перезарядка 14 с).
     Але якщо бос сам врізався в твій предмет — ти хитаєшся й «бздинькаєш» — видав себе!
     🚬 Перекур — ривок без маскування (перезарядка 20 с).
   - Бос: 20 с наради в скляному кабінеті (нічого не видно), потім 3 хв полювання. ЛКМ / F — «Попався!»,
     промах по справжньому предмету — −5 с. 🔍 Перевірка — замасковані поруч трусяться.
     🔔 Загальні збори (1 раз): усі офісники мають за 15 с прийти в залу нарад — хто не прийшов, отримує 🚩.
   - Спійманий іде «на килим» у кабінет боса. Усі спіймані — перемога боса; вийшов час — перемагають ті, хто вцілів.
   У спільному світі ролі, голоси, маскування, тарани й спіймання рахує сервер.
   Картинку для картки в меню поклади поруч: addons/hideboss/hideboss-bg.jpg */
const A = Addon.info({ name: 'Сховайся від боса', version: '2.0', desc: 'Хованки (Prop Hunt) на 2–6 на поверсі хмарочоса: три поверхи на вибір, тарани кріслом, загальні збори, фейкові звіти. Наодинці — проти ботів.' });

const SIMSIDE = !!window.__SIM;
const AUTH = () => SIMSIDE || !(typeof WORLD !== 'undefined' && WORLD.on);
const MEET = 20, DUR = 180, PENALTY = 5, CHECK_CD = 12, CHECK_R = 7, WORK_T = 3, DRAIN = 100 / 75;
const RAM_CD = 14, RAM_T = .55, RAM_SPD = 10, STUN = 2.2, BUMP_CD = 2.5, BELL_T = 15, FLAG_T = 10, SMOKE_CD = 20;
const PI = Math.PI, H2 = Math.PI / 2;
const r2 = v => Math.round(v * 100) / 100;

/* ---------- Три поверхи (варіанти карти): кожен — свій «острів» високо над містом ---------- */
const FL = [
  { id: 'hideboss', n: 'Поверх 42 · Опенспейс', s: 'Опенспейс', ic: '💻', x: 300, z: -720, hx: 18, hz: 13, r: 24, night: false, col: '#6BB8FF',
    bossN: 'Бос Геннадій', about: 'класика: коридор, опенспейс, переговорна, скляний кабінет боса',
    pal: { wall: '#ECE6FB', trim: '#9F8BE0', skirt: '#8E86B0', part: '#8C9BD8' } },
  { id: 'hideboss2', n: 'Поверх 57 · Колл-центр', s: 'Колл-центр', ic: '🎧', x: 440, z: -720, hx: 20, hz: 13, r: 26, night: true, col: '#4FD1C5',
    bossN: 'Супервайзерка Жанна', about: 'нічна зміна: ряди кабінок, тренінг-зала, кімната сну, серверна',
    pal: { wall: '#D6E4F0', trim: '#4FB3BF', skirt: '#3E6E86', part: '#5FA8B8' } },
  { id: 'hideboss3', n: 'Поверх 63 · Юридична фірма', s: 'Юрфірма', ic: '⚖️', x: 580, z: -720, hx: 17, hz: 14, r: 24, night: false, col: '#E0B060',
    bossN: 'Партнер Аркадій', about: 'архів-лабіринт, зала засідань, пошта з візками, зимовий сад',
    pal: { wall: '#EFE6D6', trim: '#8A6242', skirt: '#6B4A3A', part: '#A88A62' } },
];
FL.forEach((F, i) => A.island({ id: F.id, n: 'Сховайся від боса · ' + F.s, sub: F.n + ' · ' + F.about, x: F.x, z: F.z, r: F.r, top: '#9E98B8', rock: '#6E668E', biome: 'hideboss', hbv: i, tier: 1, safe: true, noZone: true }));
const floorAt = (x, z) => FL.findIndex(F => Math.abs(x - F.x) < F.hx + 1.5 && Math.abs(z - F.z) < F.hz + 1.5);
const inIsl = (x, z) => floorAt(x, z) >= 0;
const inOffF = (F, x, z) => !!F && x > F.off.x0 - .3 && x < F.off.x1 + .3 && z > F.off.z0 - .3 && z < F.off.z1 + .2;
const inOffice = (x, z) => FL.some(F => inOffF(F, x, z));
const inRoomR = (F, r, x, z, m) => { m = m || 0; return x > F.x + r.x0 + m && x < F.x + r.x1 - m && z > F.z + r.z0 + m && z < F.z + r.z1 - m; };
function roomAt(x, z) {
  const F = FL[floorAt(x, z)]; if (!F) return null;
  return F.rooms.find(r => r.id !== 'hall' && inRoomR(F, r, x, z)) || F.rooms.find(r => r.id === 'hall');
}
function wallParts(w) {   // проміжки стіни між дверима
  const horiz = w.z1 === w.z2, lo = Math.min(horiz ? w.x1 : w.z1, horiz ? w.x2 : w.z2), hi = Math.max(horiz ? w.x1 : w.z1, horiz ? w.x2 : w.z2);
  const ds = (w.doors || []).slice().sort((a, b) => a - b), out = []; let a = lo;
  for (const d of ds) { out.push([a, d - .9]); a = d + .9; } out.push([a, hi]); return out;
}

/* ---------- Меблі: типи (однакові на сервері й у гравців) ---------- */
// dis — під це можна замаскуватись; roll — на коліщатках (можна таранити боса); c — кола-зіткнення [x, z, r]
const FT = {
  desk: { n: 'Стіл з комп’ютером', ic: '💻', h: .9, c: [[-.4, 0, .42], [.4, 0, .42]], miss: 'Це просто стіл. Комп’ютер гуде.' },
  bossdesk: { n: 'Стіл боса', ic: '🏢', h: .9, c: [[-.75, 0, .55], [0, 0, .55], [.75, 0, .55]], miss: 'Це ж мій стіл!' },
  chair: { n: 'Офісне крісло', ic: '🪑', r: .3, h: .9, dis: 1, roll: 1, miss: 'Просто крісло. Порожнє, як мої KPI.' },
  cooler: { n: 'Кулер', ic: '🚰', r: .35, h: 1.4, dis: 1, roll: 1, miss: 'Кулер. Булькає. Не офісник.' },
  ficus: { n: 'Фікус', ic: '🪴', r: .38, h: 1.5, dis: 1, miss: 'Це просто фікус…' },
  copier: { n: 'Ксерокс', ic: '🖨️', h: 1, dis: 1, c: [[-.25, 0, .4], [.25, 0, .4]], miss: 'Ксерокс зажував папір. І все.' },
  cabinet: { n: 'Шафа з документами', ic: '🗄️', r: .46, h: 1.4, dis: 1, miss: 'Шафа. Документи. Нудьга.' },
  box: { n: 'Коробка', ic: '📦', r: .4, h: .6, dis: 1, miss: 'Коробка з-під принтера. Порожня.' },
  trash: { n: 'Смітник', ic: '🗑️', r: .28, h: .6, dis: 1, miss: 'Смітник. Тут лише чиїсь мрії.' },
  coffee: { n: 'Кавомашина', ic: '☕', r: .4, h: 1.3, dis: 1, miss: 'Кавомашина. Свята річ, не чіпай.' },
  sofa: { n: 'Диван', ic: '🛋️', h: .9, dis: 1, c: [[-.62, 0, .45], [0, 0, .45], [.62, 0, .45]], miss: 'Диван. Підозріло зручний, але порожній.' },
  // колл-центр
  rollup: { n: 'Рол-ап банер', ic: '🪧', r: .32, h: 1.9, dis: 1, miss: 'Банер «Дзвони — продавай!». Сам себе не продасть.' },
  gong: { n: 'Гонг продажів', ic: '🥁', r: .45, h: 1.6, dis: 1, miss: 'Гонг. Бамкає лише на закриту угоду.' },
  pouf: { n: 'Крісло-мішок', ic: '🫘', r: .45, h: .7, dis: 1, miss: 'Крісло-мішок. Ще тепле… але порожнє.' },
  // юрфірма
  globe: { n: 'Глобус-бар', ic: '🌍', r: .42, h: 1.1, dis: 1, miss: 'Глобус-бар. Порожній, як обіцянки партнерів.' },
  bust: { n: 'Бюст засновника', ic: '🗿', r: .32, h: 1.7, dis: 1, miss: 'Бюст засновника. Дивиться з осудом.' },
  armchair: { n: 'Шкіряне крісло', ic: '💺', r: .45, h: 1, dis: 1, miss: 'Шкіряне крісло. Пахне гонорарами.' },
  lamp: { n: 'Торшер', ic: '💡', r: .25, h: 1.7, dis: 1, miss: 'Торшер. Світить, але не підказує.' },
  cart: { n: 'Поштовий візок', ic: '🛒', h: 1, dis: 1, roll: 1, c: [[-.3, 0, .36], [.3, 0, .36]], miss: 'Візок з позовами. Холодний, як суддя.' },
  report: { n: 'Звіт', ic: '📄', r: .3, h: .3, miss: 'Фейковий звіт! Тебе обвели навколо пальця.' },
  // декор (тверде, але під нього не замаскуєшся)
  shelf: { n: 'Стелаж', ic: '📚', h: 1.8, c: [[-.6, 0, .33], [0, 0, .33], [.6, 0, .33]], miss: 'Стелаж. Тут лише папки за 2009 рік.' },
  archive: { n: 'Архівний стелаж', ic: '🗃️', h: 2.2, c: [[-.6, 0, .34], [0, 0, .34], [.6, 0, .34]], miss: 'Архів. Справа №1488/2007. Нічого цікавого.' },
  counter: { n: 'Кухонна стійка', ic: '🍽️', h: 1, c: [[-1.5, 0, .4], [-.5, 0, .4], [.5, 0, .4], [1.5, 0, .4]], miss: 'Стійка. Хтось знову не помив чашку.' },
  fridge: { n: 'Холодильник', ic: '🧊', r: .45, h: 1.9, miss: 'Холодильник. Тут мій йогурт! А, ні — уже нема.' },
  mtable: { n: 'Стіл для нарад', ic: '📊', h: .9, c: [[-2.4, 0, .7], [-1.2, 0, .7], [0, 0, .7], [1.2, 0, .7], [2.4, 0, .7]], miss: 'Стіл для нарад. Пам’ятає всі мої промови.' },
  ktable: { n: 'Обідній стіл', ic: '🍽️', h: .9, c: [[-.6, 0, .55], [.6, 0, .55]], miss: 'Обідній стіл. Крихти, але не офісник.' },
  ctable: { n: 'Журнальний столик', ic: '☕', h: .5, c: [[-.35, 0, .42], [.35, 0, .42]], miss: 'Столик. На ньому журнал «Ефективний менеджмент».' },
  rtable: { n: 'Читальний стіл', ic: '📖', h: .9, c: [[-.6, 0, .5], [.6, 0, .5]], miss: 'Читальний стіл. Тиша, як у суді.' },
  reception: { n: 'Стійка рецепції', ic: '🛎️', h: 1.1, c: [[-1.4, 0, .45], [-.7, 0, .45], [0, 0, .45], [.7, 0, .45], [1.4, 0, .45]], miss: 'Рецепція. Дзвоник: дзинь!' },
  vend: { n: 'Автомат зі снеками', ic: '🍫', h: 1.9, c: [[-.25, 0, .4], [.25, 0, .4]], miss: 'Автомат. Знову з’їв мою монетку.' },
  rack: { n: 'Серверна стійка', ic: '🖥️', r: .42, h: 2, miss: 'Сервер. Гуде. Блимає. Не чіпати!' },
  sink: { n: 'Умивальник', ic: '🚰', r: .32, h: 1, miss: 'Умивальник. Мий руки, бос.' },
  wc: { n: 'Кабінка', ic: '🚽', r: .42, h: 1.8, miss: 'Кабінка порожня. Фух.' },
  pingpong: { n: 'Тенісний стіл', ic: '🏓', h: .8, c: [[-.8, 0, .72], [.8, 0, .72]], miss: 'Тенісний стіл. Тимбілдинг!' },
  pod: { n: 'Капсула сну', ic: '😴', h: 1.3, c: [[-.7, 0, .5], [0, 0, .5], [.7, 0, .5]], miss: 'Капсула сну. Порожня. Заздрю.' },
  kpi: { n: 'Табло KPI', ic: '📈', h: 2.2, c: [[-.6, 0, .3], [.6, 0, .3]], miss: 'Табло KPI. Червоне. Як завжди.' },
  planter: { n: 'Клумба', ic: '🌿', h: .6, c: [[-.6, 0, .45], [.6, 0, .45]], miss: 'Клумба. Тут ростуть лише бонуси партнерів.' },
  tv: { n: 'Телевізор', ic: '📺', h: 0, c: [] }, board: { n: 'Дошка', ic: '📝', h: 0, c: [] },
};
const FURN = [];
let CV = 0;   // поверх, який зараз розставляємо
const W = (lx, lz) => ({ x: FL[CV].x + lx, z: FL[CV].z + lz });
const loc = (f, lx, lz) => { const c = Math.cos(f.rot), s = Math.sin(f.rot); return { x: f.x + lx * c + lz * s, z: f.z - lx * s + lz * c }; };
function addF(t, lx, lz, rot) { const p = W(lx, lz); const f = { i: FURN.length, v: CV, t, x: p.x, z: p.z, rot: rot || 0 }; FURN.push(f); return f; }
const addAll = list => list.forEach(a => addF(a[0], a[1], a[2], a[3] || 0));
// стіл із ПК + крісло (rot 0 — працівник сидить з боку +z і дивиться на -z)
let dk = 0;
function deskSet(lx, lz, rot) {
  const d = addF('desk', lx, lz, rot), c = loc(d, .35, .9), k = dk++;
  addF('chair', c.x - FL[CV].x, c.z - FL[CV].z, rot + PI + ((k * 37) % 7 - 3) * .08);
  return d;
}
/* поверх: стіни (локальні координати), кімнати, меблі, особливі місця */
function setFloor(i, def) {
  CV = i; const F = FL[i], hx = F.hx, hz = F.hz;
  const outer = [{ x1: -hx, z1: -hz, x2: hx, z2: -hz }, { x1: -hx, z1: hz, x2: hx, z2: hz }, { x1: -hx, z1: -hz, x2: -hx, z2: hz }, { x1: hx, z1: -hz, x2: hx, z2: hz }].map(w => Object.assign(w, { outer: 1 }));
  F.walls = outer.concat(def.walls).map(w => Object.assign({}, w, { x1: F.x + w.x1, x2: F.x + w.x2, z1: F.z + w.z1, z2: F.z + w.z2, doors: (w.doors || []).map(d => d + (w.z1 === w.z2 ? F.x : F.z)) }));
  F.rooms = def.rooms;
  def.furn();
  const o = def.off; F.off = { x0: F.x + o[0], z0: F.z + o[1], x1: F.x + o[2], z1: F.z + o[3] };
  F.bossSpot = W(...def.bossSpot); F.carpet = W(...def.carpet); F.door = W(...def.door);
  F.board = W(...def.board); F.spawn = W(...def.spawn); F.lift = def.lift;   // board — стійка «🗳️ ЛОБІ» (F — відкрити вікно лобі)
  F.meet = F.rooms.find(r => r.meet);
  F.nav = { cell: .5, x0: F.x - hx, z0: F.z - hz, nx: hx * 4, nz: hz * 4, block: null };
  F.hide = null;
}

/* ===== Поверх 42 · Опенспейс (будівля 36×26): північ — опенспейс · переговорна · копі/бухгалтерія · бос;
   коридор; південь — ліфтовий хол з рецепцією · кухня · лаунж · серверна + туалет · склад ===== */
setFloor(0, {
  walls: [
    { x1: -18, z1: -2, x2: 11, z2: -2, doors: [-12.5, -7.5, 1.5, 8.5] }, { x1: 11, z1: -2, x2: 18, z2: -2, doors: [14.5], glass: 1 },
    { x1: -18, z1: 1.5, x2: 18, z2: 1.5, doors: [-14, -6, 2, 8.5, 14.5] },
    { x1: -2, z1: -13, x2: -2, z2: -2 }, { x1: 5, z1: -13, x2: 5, z2: -2 }, { x1: 11, z1: -13, x2: 11, z2: -2, glass: 1 },
    { x1: 5, z1: -7.5, x2: 11, z2: -7.5, doors: [9.5] },
    { x1: -10, z1: 1.5, x2: -10, z2: 13, doors: [4] }, { x1: -2, z1: 1.5, x2: -2, z2: 13, doors: [4] }, { x1: 6, z1: 1.5, x2: 6, z2: 13, doors: [10.5] },
    { x1: 11, z1: 1.5, x2: 11, z2: 13 }, { x1: 6, z1: 7, x2: 11, z2: 7 },
  ],
  rooms: [
    { id: 'open', n: '💻 Опенспейс', x0: -18, z0: -13, x1: -2, z1: -2, fl: '#6C7BC4' },
    { id: 'meet', n: '📊 Переговорна', x0: -2, z0: -13, x1: 5, z1: -2, fl: '#8C7FC2', meet: 1 },
    { id: 'copy', n: '🖨️ Копі-центр', x0: 5, z0: -13, x1: 11, z1: -7.5, fl: '#D9DCE8' },
    { id: 'acc', n: '🧮 Бухгалтерія', x0: 5, z0: -7.5, x1: 11, z1: -2, fl: '#7FA6C9' },
    { id: 'boss', n: '👔 Кабінет боса', x0: 11, z0: -13, x1: 18, z1: -2, fl: '#9A6A4C' },
    { id: 'hall', n: '🚶 Коридор', x0: -18, z0: -2, x1: 18, z1: 1.5, fl: '#C9CDD9' },
    { id: 'rec', n: '🛗 Ліфтовий хол', x0: -18, z0: 1.5, x1: -10, z1: 13, fl: '#E3D7C4' },
    { id: 'kitchen', n: '☕ Кухня', x0: -10, z0: 1.5, x1: -2, z1: 13, tiles: 1 },
    { id: 'lounge', n: '🛋️ Лаунж', x0: -2, z0: 1.5, x1: 6, z1: 13, fl: '#C4956A' },
    { id: 'server', n: '🖥️ Серверна', x0: 6, z0: 1.5, x1: 11, z1: 7, fl: '#5C6680' },
    { id: 'wc', n: '🚻 Туалет', x0: 6, z0: 7, x1: 11, z1: 13, tiles: 2 },
    { id: 'store', n: '📦 Склад', x0: 11, z0: 1.5, x1: 18, z1: 13, fl: '#B9AE98' },
  ],
  off: [11.5, -12.5, 17.5, -2.5], bossSpot: [13, -6.2], carpet: [16.6, -3.4], door: [14.5, -2],
  board: [-15.6, 4.4], spawn: [-14, 9.4],
  lift: { x: -10.12, z: 11, rot: -H2 },
  furn() {
    // 💻 Опенспейс: три кластери по 2×2 столи (монітори спина до спини), два ряди
    for (const cx of [-15.6, -10.6, -5.6]) for (const rz of [-10.2, -5.6]) for (const ox of [0, 1.6]) { deskSet(cx + ox, rz + .4, 0); deskSet(cx + ox, rz - .4, PI); }
    addAll([['ficus', -17.4, -12.4], ['ficus', -2.6, -12.4], ['cooler', -17.4, -7.9], ['trash', -12.3, -12.5], ['trash', -7.3, -12.5], ['cabinet', -17.3, -2.7, PI], ['cabinet', -16.4, -2.7, PI],
      ['box', -10, -2.7, .2], ['trash', -4.6, -2.6], ['ficus', -2.6, -2.6], ['cabinet', -2.65, -7.9, -H2]]);
    // 📊 Переговорна: довгий стіл, крісла по боках, телевізор і дошка
    addF('mtable', 1.5, -7.6, H2); addF('tv', 1.5, -12.85, 0); addF('board', -1.88, -7.6, H2);
    for (const z of [-9.8, -8.4, -7, -5.6]) { addF('chair', .25, z, H2); addF('chair', 2.75, z, -H2); }
    addF('chair', 1.5, -11.2, 0); addF('ficus', -1.4, -12.4); addF('ficus', 4.4, -12.4); addF('cooler', 4.4, -2.7); addF('trash', -1.4, -2.7);
    // 🖨️ Копі-центр
    addF('copier', 6.6, -12.4, 0); addF('copier', 8.6, -12.4, 0); addF('box', 10.4, -12.4, .3); addF('box', 10.4, -11.5, -.2);
    addF('cabinet', 5.55, -10.6, H2); addF('cabinet', 5.55, -9.7, H2); addF('trash', 10.4, -8.2); addF('shelf', 6.9, -8.1, PI);
    // 🧮 Бухгалтерія
    for (const x of [6.9, 8.5]) { deskSet(x, -4.3, 0); deskSet(x, -5.1, PI); }
    addF('cabinet', 5.55, -4.6, H2); addF('cabinet', 5.55, -5.5, H2); addF('ficus', 10.4, -2.7); addF('trash', 10.5, -7);
    // 👔 Кабінет боса
    addF('bossdesk', 14.5, -10.2, 0); addF('chair', 14.5, -11.3, 0); addF('chair', 13.8, -8.7, PI); addF('chair', 15.2, -8.7, PI);
    addF('shelf', 17.55, -9.6, -H2); addF('cabinet', 17.4, -12.4); addF('ficus', 11.7, -12.4); addF('ficus', 17.4, -6.4); addF('sofa', 11.8, -5.6, H2); addF('board', 14.5, -12.88, 0);
    // 🚶 Коридор (крісло й кулер на коліщатках — ідеальні для тарана)
    addAll([['ficus', -17.4, -1.4], ['cooler', -10, 1], ['trash', -3.8, 1.05], ['ficus', 5.8, -1.45], ['box', 11.6, 1, .3], ['ficus', 17.4, 0], ['trash', 12.2, -1.5], ['chair', 4.4, 1, .5]]);
    // 🛗 Ліфтовий хол: рецепція, диванчики для гостей
    addF('reception', -11.6, 8.2, H2); addF('chair', -10.7, 8.2, -H2); addF('sofa', -17.4, 6.4, H2); addF('sofa', -17.4, 9.9, H2); addF('ctable', -16.2, 8.15, H2);
    addF('ficus', -17.4, 2.2); addF('ficus', -17.4, 12.4); addF('cooler', -10.6, 2.2); addF('trash', -10.6, 5.6);
    // ☕ Кухня
    addF('fridge', -9.4, 12.3, PI); addF('counter', -6.4, 12.45, PI); addF('coffee', -3.6, 12.4, PI); addF('cooler', -2.6, 12.4); addF('vend', -9.4, 2.3, 0);
    for (const tx of [-7.4, -4.4]) { addF('ktable', tx, 7.4, 0); for (const sx of [-.6, .6]) { addF('chair', tx + sx, 6.55, 0); addF('chair', tx + sx, 8.25, PI); } }
    addF('trash', -2.6, 2.2); addF('ficus', -9.4, 5.8);
    // 🛋️ Лаунж
    addF('sofa', 2, 12.3, PI); addF('sofa', -1.4, 9, H2); addF('sofa', 5.4, 7.8, -H2); addF('ctable', 2, 9.4, 0); addF('pingpong', 2, 4.6, 0);
    addF('ficus', -1.4, 12.4); addF('ficus', 5.4, 12.4); addF('ficus', -1.4, 2.2); addF('box', 5.3, 2.3, .4); addF('chair', -.9, 5.2, H2);
    // 🖥️ Серверна
    for (const x of [6.7, 7.6, 8.5, 9.4]) addF('rack', x, 6.4, PI);
    deskSet(10.3, 3.8, -H2); addF('box', 6.6, 2.2, .2); addF('trash', 10.5, 2.1);
    // 🚻 Туалет
    for (const z of [8.1, 9.6, 11.1]) addF('wc', 10.4, z, -H2);
    addF('sink', 6.6, 7.7, H2); addF('sink', 6.6, 8.6, H2); addF('trash', 6.6, 12.4); addF('ficus', 8.6, 12.4);
    // 📦 Склад
    for (const z of [3.2, 5.6, 8, 10.4]) addF('shelf', 17.55, z, -H2);
    for (const [x, z, r] of [[11.6, 12.4, .2], [12.5, 12.45, -.3], [13.4, 12.4, .5], [12, 11.5, .1], [14.6, 6.8, .3], [14.6, 7.7, -.2], [13.8, 9.6, .7], [15.4, 4, .1]]) addF('box', x, z, r);
    addF('cabinet', 11.55, 3.2, H2); addF('cabinet', 11.55, 4.1, H2); addF('cabinet', 11.55, 5, H2); addF('copier', 16.3, 12.35, PI); addF('chair', 13, 8.4, 1.2); addF('ficus', 11.6, 9.4); addF('trash', 17.4, 12.4);
  },
});

/* ===== Поверх 57 · Колл-центр (40×26, нічна зміна): посередині великий зал дзвінків з рядами кабінок;
   захід — тренінг-зала · ліфтовий хол · туалет; північ — супервайзери · кімната сну · копі-центр;
   схід — кабінет боса (вхід через серверну!) · серверна · склад; південь — лаунж ↔ кухня (коло) ===== */
setFloor(1, {
  walls: [
    { x1: -20, z1: -4, x2: -12, z2: -4, doors: [-16] }, { x1: -20, z1: 6, x2: -12, z2: 6, doors: [-14] },
    { x1: -12, z1: -13, x2: -12, z2: 13, doors: [-6, 1] },
    { x1: -12, z1: -8, x2: 12, z2: -8, doors: [-7, 2, 10] }, { x1: -2, z1: -13, x2: -2, z2: -8 }, { x1: 6, z1: -13, x2: 6, z2: -8 },
    { x1: -12, z1: 8, x2: 12, z2: 8, doors: [-6, 6] }, { x1: 0, z1: 8, x2: 0, z2: 13, doors: [10.5] },
    { x1: 12, z1: -13, x2: 12, z2: -4, glass: 1 }, { x1: 12, z1: -4, x2: 12, z2: 13, doors: [0, 10.5] },
    { x1: 12, z1: -4, x2: 20, z2: -4, doors: [16], glass: 1 }, { x1: 12, z1: 4, x2: 20, z2: 4, doors: [16] },
  ],
  rooms: [
    { id: 'train', n: '🎓 Тренінг-зала', x0: -20, z0: -13, x1: -12, z1: -4, fl: '#5C6AA8', meet: 1 },
    { id: 'rec', n: '🛗 Ліфтовий хол', x0: -20, z0: -4, x1: -12, z1: 6, fl: '#D9CDB8' },
    { id: 'wc', n: '🚻 Туалет', x0: -20, z0: 6, x1: -12, z1: 13, tiles: 2 },
    { id: 'sup', n: '🧑‍💼 Супервайзери', x0: -12, z0: -13, x1: -2, z1: -8, fl: '#6E7FB8' },
    { id: 'nap', n: '😴 Кімната сну', x0: -2, z0: -13, x1: 6, z1: -8, fl: '#7A6AA8' },
    { id: 'copy', n: '🖨️ Копі-центр', x0: 6, z0: -13, x1: 12, z1: -8, fl: '#C9CDE0' },
    { id: 'boss', n: '👔 Кабінет супервайзерки', x0: 12, z0: -13, x1: 20, z1: -4, fl: '#8A5A4C' },
    { id: 'server', n: '🖥️ Серверна', x0: 12, z0: -4, x1: 20, z1: 4, fl: '#4C5670' },
    { id: 'store', n: '📦 Склад', x0: 12, z0: 4, x1: 20, z1: 13, fl: '#A89E88' },
    { id: 'lounge', n: '🛋️ Лаунж', x0: -12, z0: 8, x1: 0, z1: 13, fl: '#B4856A' },
    { id: 'kitchen', n: '☕ Кухня', x0: 0, z0: 8, x1: 12, z1: 13, tiles: 1 },
    { id: 'hall', n: '📞 Зал дзвінків', x0: -12, z0: -8, x1: 12, z1: 8, fl: '#3E4C78' },
  ],
  off: [12.5, -12.5, 19.5, -4.5], bossSpot: [18, -7.6], carpet: [18.8, -5.6], door: [16, -4],
  board: [-17.4, -2.4], spawn: [-15.6, 1.6],
  lift: { x: -13.6, z: -3.88, rot: 0 },
  furn() {
    // 📞 Зал дзвінків: ряди кабінок (столи спина до спини з перегородками)
    for (const cx of [-9.4, -4, 1.4]) for (const rz of [-4.4, 2.4]) for (const ox of [0, 1.6]) { deskSet(cx + ox, rz + .4, 0); deskSet(cx + ox, rz - .4, PI); }
    // зона супервайзера: два столи, табло KPI, гонг продажів, банери
    deskSet(7.6, -4, 0); deskSet(9.2, -4, 0);
    addF('kpi', 7.2, -7.3, 0); addF('gong', 11.2, -1.6); addF('rollup', 5.8, -1.2); addF('rollup', 11.3, 6.9); addF('cooler', 11.3, 3.2);
    addAll([['cooler', -11.3, -7.3], ['ficus', -11.4, 7.3], ['pouf', -2.2, 6.6], ['pouf', -.8, 6.9], ['vend', 3.6, 7.4, PI], ['trash', 4.8, -7.4], ['trash', -6.8, 5.6], ['chair', 7.4, 5.6, 2.2], ['box', 9.2, 6.8, .3], ['ficus', 5.4, 2.2]]);
    // 🎓 Тренінг-зала: ряди крісел перед екраном, фліпчарт, банер тренера
    addF('tv', -16, -12.85, 0); addF('board', -19.4, -7.4, H2); addF('rollup', -13, -12.3);
    for (const z of [-10.6, -9, -7.4]) for (const x of [-18.6, -17.4, -16.2, -15, -13.8]) addF('chair', x, z, PI + (x * 7 % 3 - 1) * .06);
    addF('ficus', -19.4, -12.4); addF('cooler', -19.4, -4.6); addF('trash', -12.6, -4.6);
    // 🛗 Ліфтовий хол: рецепція біля скла, кулер, фікуси
    addF('reception', -18.8, .5, H2); addF('chair', -19.6, .5, H2); addF('ficus', -19.4, -3.4); addF('ficus', -12.5, -3.4); addF('cooler', -12.6, 5.4); addF('trash', -19.4, 5.4);
    // 🚻 Туалет: кабінки біля скла, умивальники
    for (const z of [8, 9.5, 11]) addF('wc', -19.4, z, H2);
    addF('sink', -12.6, 9.6, -H2); addF('sink', -12.6, 10.5, -H2); addF('trash', -12.6, 12.4); addF('ficus', -16, 12.4);
    // 🧑‍💼 Супервайзери: столи вздовж скла, шафи
    for (const x of [-10.6, -8.6, -4.6]) deskSet(x, -12, 0);
    addF('cabinet', -11.5, -9.4, H2); addF('cabinet', -11.5, -10.3, H2); addF('ficus', -2.6, -8.6); addF('trash', -5.4, -8.6); addF('chair', -8.8, -9.4, .7);
    // 😴 Кімната сну: капсули, крісла-мішки, торшер
    addF('pod', -.2, -12.3, 0); addF('pod', 3.8, -12.3, 0);
    addF('pouf', -1.2, -9.2); addF('pouf', 4.8, -9.3); addF('pouf', 1.6, -10.4); addF('lamp', 5.5, -11); addF('ficus', -1.4, -10.9);
    // 🖨️ Копі-центр
    addF('copier', 7, -12.4, 0); addF('copier', 9, -12.4, 0); addF('box', 11.3, -12.4, .3); addF('box', 11.3, -11.5, -.2); addF('shelf', 6.55, -10.5, H2); addF('trash', 11.4, -8.6);
    // 👔 Кабінет супервайзерки: скляна стіна в зал, вхід через серверну
    addF('bossdesk', 16, -10.6, 0); addF('chair', 16, -11.7, 0); addF('chair', 15.3, -9.1, PI); addF('chair', 16.7, -9.1, PI);
    addF('shelf', 19.55, -9.4, -H2); addF('cabinet', 19.4, -12.4); addF('ficus', 12.6, -12.4); addF('ficus', 12.6, -4.6); addF('sofa', 12.8, -7, H2); addF('board', 16, -12.88, 0); addF('gong', 19.3, -6.6);
    // 🖥️ Серверна: ряди стійок, прохід посередині (бос ↔ склад)
    for (const [x, z] of [[13.4, -2.8], [14.3, -2.8], [13.4, 2.8], [14.3, 2.8], [18.2, -2.8], [19.1, -2.8], [18.2, 2.8], [19.1, 2.8]]) addF('rack', x, z, x < 16 ? H2 : -H2);
    deskSet(18.8, .2, -H2); addF('box', 13.3, 1.4, .3);
    // 📦 Склад
    for (const z of [5.6, 8, 10.4]) addF('shelf', 19.55, z, -H2);
    for (const [x, z, r] of [[13, 12.4, .2], [13.9, 12.45, -.3], [14.8, 12.4, .5], [13.4, 11.5, .1], [16.4, 7.6, .3], [16.4, 8.5, -.2], [15.5, 10, .7], [13.2, 5.2, .1]]) addF('box', x, z, r);
    addF('cabinet', 12.55, 6.5, H2); addF('cabinet', 12.55, 7.4, H2); addF('copier', 17.6, 12.35, PI); addF('chair', 15, 9.2, 1.2); addF('ficus', 19.4, 12.4);
    // 🛋️ Лаунж
    addF('sofa', -6, 12.4, PI); addF('ctable', -6, 10.5, 0); addF('pouf', -8.4, 10.6); addF('pouf', -3.6, 10.6); addF('vend', -11.4, 9.6, H2);
    addF('ficus', -11.4, 12.4); addF('ficus', -.6, 12.4); addF('trash', -.6, 8.6); addF('lamp', -9.6, 12.5);
    // ☕ Кухня
    addF('counter', 6, 12.45, PI); addF('fridge', 1, 12.3, PI); addF('coffee', 9, 12.4, PI); addF('cooler', 11.4, 12.4);
    for (const tx of [3, 9]) { addF('ktable', tx, 10.2, 0); for (const sx of [-.6, .6]) { addF('chair', tx + sx, 9.35, 0); addF('chair', tx + sx, 11.05, PI); } }
    addF('trash', .6, 8.6);
  },
});

/* ===== Поверх 63 · Юридична фірма (34×28): захід — зала засідань · рецепція · пошта;
   центр — архів-лабіринт зі стелажами й читальною зоною; схід — кабінет партнера · юристи;
   коридор; південь — кав’ярня · туалет · зимовий сад ===== */
setFloor(2, {
  walls: [
    { x1: -8, z1: -14, x2: -8, z2: 14, doors: [-9, 3.5, 10] },
    { x1: -17, z1: -4, x2: -8, z2: -4, doors: [-12.5] }, { x1: -17, z1: 6, x2: -8, z2: 6, doors: [-12.5] },
    { x1: -8, z1: 2, x2: 17, z2: 2, doors: [-2, 4, 12.5] }, { x1: -8, z1: 5, x2: 17, z2: 5, doors: [-4, 5, 12.5] },
    { x1: 2, z1: 5, x2: 2, z2: 14 }, { x1: 8, z1: 5, x2: 8, z2: 14 },
    { x1: 8, z1: -14, x2: 8, z2: 2, doors: [-1.5] }, { x1: 8, z1: -5, x2: 17, z2: -5, doors: [12.5], glass: 1 },
  ],
  rooms: [
    { id: 'board', n: '🏛️ Зала засідань', x0: -17, z0: -14, x1: -8, z1: -4, fl: '#6A3A4A', meet: 1 },
    { id: 'rec', n: '🛗 Рецепція', x0: -17, z0: -4, x1: -8, z1: 6, fl: '#E3D7C4' },
    { id: 'mail', n: '📮 Пошта', x0: -17, z0: 6, x1: -8, z1: 14, fl: '#B9AE98' },
    { id: 'arch', n: '📚 Архів', x0: -8, z0: -14, x1: 8, z1: 2, fl: '#4E7A5E' },
    { id: 'boss', n: '👔 Кабінет партнера', x0: 8, z0: -14, x1: 17, z1: -5, fl: '#7A4E3A' },
    { id: 'law', n: '⚖️ Юристи', x0: 8, z0: -5, x1: 17, z1: 2, fl: '#7F96B9' },
    { id: 'cafe', n: '☕ Кав’ярня', x0: -8, z0: 5, x1: 2, z1: 14, tiles: 1 },
    { id: 'wc', n: '🚻 Туалет', x0: 2, z0: 5, x1: 8, z1: 14, tiles: 2 },
    { id: 'garden', n: '🌿 Зимовий сад', x0: 8, z0: 5, x1: 17, z1: 14, fl: '#7FAF6A' },
    { id: 'hall', n: '🚶 Коридор', x0: -8, z0: 2, x1: 17, z1: 5, fl: '#D6CCB8' },
  ],
  off: [8.5, -13.5, 16.5, -5.5], bossSpot: [14.8, -8.4], carpet: [16, -6.4], door: [12.5, -5],
  board: [-14.2, -2.6], spawn: [-12.4, 3.6],
  lift: { x: -8.12, z: -1.4, rot: -H2 },
  furn() {
    // 📚 Архів-лабіринт: ряди архівних стелажів з проходами й глухими кутами
    for (const x of [-6.8, -5, -3.2, 1.2, 3, 4.8, 6.6]) addF('archive', x, -13.5, 0);
    for (const x of [-5.8, -4, 0, 1.8, 3.6, 6.9]) addF('archive', x, -10.6, 0);
    for (const x of [-6.8, -5, -1.4, .4, 4, 5.8]) addF('archive', x, -7.6, 0);
    for (const x of [-6.8, -5, -.6, 1.2]) addF('archive', x, -4.6, PI);
    addF('box', -7.3, -9.1, .3); addF('box', 2.6, -9.1, -.2); addF('box', 7.3, -6, .5); addF('cabinet', -2.6, -12.2, 0); addF('cart', 5.2, -9, .3);
    // читальна зона: столи з лампами, глобус, бюст, шкіряні крісла
    addF('rtable', -5, -1.2, 0); addF('rtable', 1, -1.2, 0);
    for (const tx of [-5, 1]) for (const sx of [-.6, .6]) { addF('chair', tx + sx, -2.1, 0); addF('chair', tx + sx, -.3, PI); }
    addF('armchair', -7.3, -1.2, H2); addF('armchair', 2.9, -1.2, -H2); addF('globe', 6.6, -3.4); addF('bust', -7.3, -3.4); addF('lamp', -7.4, 1.2); addF('lamp', 7.3, 1.2);
    deskSet(5, -4.4, PI);
    // 🏛️ Зала засідань: довгий стіл, крісла, екран, бюст засновника
    addF('mtable', -12.5, -9, 0); addF('tv', -12.5, -13.85, 0); addF('board', -16.9, -6.2, H2);
    for (const x of [-14.7, -13.3, -11.7, -10.3]) { addF('chair', x, -10.3, 0); addF('chair', x, -7.7, PI); }
    addF('chair', -16.1, -9, H2); addF('bust', -16.3, -13.3); addF('ficus', -8.7, -13.3); addF('globe', -16.3, -4.7); addF('ficus', -8.7, -4.6); addF('lamp', -9.6, -13.3);
    // 🛗 Рецепція
    addF('reception', -15.9, 1, H2); addF('chair', -16.6, 1, H2); addF('sofa', -14.2, 5.35, PI); addF('ficus', -16.4, -3.4); addF('ficus', -8.6, -3.4); addF('cooler', -8.6, 5.4); addF('lamp', -16.4, 5.4);
    // 📮 Пошта: поштові візки, стелажі-«соти», коробки з позовами
    addF('shelf', -16.55, 8, H2); addF('shelf', -16.55, 10.4, H2); addF('cart', -13.5, 9, .2); addF('cart', -11, 11.4, -.4); addF('copier', -9.2, 13.3, PI);
    addF('box', -15.4, 13.3, .2); addF('box', -14.5, 13.35, -.3); addF('box', -10.5, 7, .4); addF('cabinet', -16.5, 12.6, H2); addF('trash', -9, 6.6);
    deskSet(-12.4, 13.1, PI);
    // 👔 Кабінет керуючого партнера
    addF('bossdesk', 12.5, -11.4, 0); addF('chair', 12.5, -12.5, 0); addF('chair', 11.8, -9.9, PI); addF('chair', 13.2, -9.9, PI);
    addF('archive', 16.55, -10, -H2); addF('bust', 16.3, -13.3); addF('ficus', 8.7, -13.3); addF('globe', 9.2, -9); addF('armchair', 9.3, -7, H2); addF('board', 12.5, -13.88, 0);
    // ⚖️ Юристи: столи, шафи з справами
    deskSet(10, -3.6, 0); deskSet(10, -.2, PI); deskSet(15.2, -3.6, 0); deskSet(15.2, -.2, PI);
    addF('cabinet', 8.55, -4.4, H2); addF('ficus', 16.4, 1.4); addF('trash', 13.6, 1.4);
    // 🚶 Коридор: візок з поштою й кулер (на коліщатках!), бюст
    addAll([['cart', -6, 2.6, H2], ['cooler', .5, 4.5], ['trash', 9.5, 2.5], ['ficus', 16.4, 3.5], ['chair', 7.2, 4.4, -.6]]);
    // ☕ Кав’ярня
    addF('counter', -3, 13.45, PI); addF('fridge', -7.4, 13.3, PI); addF('coffee', 1.4, 13.4, PI); addF('cooler', -7.4, 5.6); addF('vend', 1.4, 6.4, -H2);
    for (const [tx, tz] of [[-5, 9.4], [-.6, 9.8]]) { addF('ktable', tx, tz, 0); for (const sx of [-.6, .6]) { addF('chair', tx + sx, tz - .85, 0); addF('chair', tx + sx, tz + .85, PI); } }
    // 🚻 Туалет
    for (const z of [8.5, 10, 11.5, 13]) addF('wc', 7.4, z, -H2);
    addF('sink', 2.6, 7, H2); addF('sink', 2.6, 7.9, H2); addF('trash', 2.6, 13.3); addF('ficus', 2.6, 11);
    // 🌿 Зимовий сад: клумби, фікуси, шкіряні крісла, торшери
    addF('planter', 10.5, 13.3, 0); addF('planter', 14.5, 13.3, 0);
    addAll([['ficus', 8.6, 5.6], ['ficus', 16.4, 5.6], ['ficus', 16.4, 13.4], ['ficus', 8.6, 13.4], ['ficus', 12.5, 13.4], ['armchair', 10.3, 9.1, H2], ['armchair', 10.3, 10.9, H2],
      ['ctable', 11.4, 10, H2], ['sofa', 15.9, 10, -H2], ['lamp', 16.3, 7.6], ['lamp', 16.3, 12.3], ['pouf', 13.4, 7.4], ['cooler', 8.6, 7.6], ['ficus', 13.6, 11.2]]);
  },
});
const isDesk = f => f.t === 'desk';
FL.forEach((F, i) => { F.furn = FURN.filter(f => f.v === i); F.desks = F.furn.filter(isDesk); });
const DESKS = FURN.filter(isDesk);
/* кола-зіткнення предмета у світових координатах */
function circles(f) { const T = FT[f.t]; return (T.c || [[0, 0, T.r]]).map(([lx, lz, r]) => Object.assign(loc(f, lx, lz), { r })); }
function fdist(f, x, z) { let d = 1e9; for (const c of circles(f)) d = Math.min(d, dist2(x, z, c.x, c.z) - c.r); return d; }
const workSpot = f => loc(f, -.45, 1.05);   // збоку від крісла, обличчям до монітора
const propR = t => { const T = FT[t]; if (!T) return .35; return T.c ? Math.max(...T.c.map(c => Math.hypot(c[0], c[1]) + c[2])) * .8 : T.r; };
const canRoll = t => !!(FT[t] && FT[t].roll);

/* ---------- Навігація ботів: сітка 0,5 м на кожному поверсі ---------- */
function navBuild(F) {
  const N = F.nav, b = new Uint8Array(N.nx * N.nz);
  const ss = STATICS.filter(o => Math.abs(o.x - F.x) < F.hx + 2 && Math.abs(o.z - F.z) < F.hz + 2);
  for (let i = 0; i < N.nx; i++) for (let j = 0; j < N.nz; j++) {
    const x = N.x0 + (i + .5) * N.cell, z = N.z0 + (j + .5) * N.cell;
    b[i + j * N.nx] = ss.some(o => dist2(x, z, o.x, o.z) < o.r + .26) ? 1 : 0;
  }
  N.block = b;
}
const navOf = (x, z) => { const F = FL[floorAt(x, z)] || FL[ST.v] || FL[0]; if (!F.nav.block) navBuild(F); return F.nav; };
const cellOf = (N, x, z) => [clamp(Math.floor((x - N.x0) / N.cell), 0, N.nx - 1), clamp(Math.floor((z - N.z0) / N.cell), 0, N.nz - 1)];
const navFree = (x, z) => { const N = navOf(x, z), [i, j] = cellOf(N, x, z); return !N.block[i + j * N.nx]; };
function route(x, z, tx, tz) {
  if (!isFinite(x + z + tx + tz)) return [];
  const N = navOf(x, z), nx = N.nx;
  const [si, sj] = cellOf(N, x, z), [ti, tj] = cellOf(N, tx, tz), start = si + sj * nx, goal = ti + tj * nx;
  const prev = new Int32Array(nx * N.nz).fill(-1), q = [start]; prev[start] = start;
  for (let h = 0; h < q.length && prev[goal] < 0; h++) {   // BFS (8 сусідів) — для такої сітки досить
    const c = q[h], ci = c % nx, cj = (c / nx) | 0;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const ni = ci + di, nj = cj + dj; if (ni < 0 || nj < 0 || ni >= nx || nj >= N.nz) continue;
      const n = ni + nj * nx; if (prev[n] >= 0 || (N.block[n] && n !== goal)) continue;
      if (di && dj && (N.block[ci + di + cj * nx] || N.block[ci + (cj + dj) * nx])) continue;
      prev[n] = c; q.push(n);
    }
  }
  if (prev[goal] < 0) return [{ x: tx, z: tz }];
  const pts = []; for (let c = goal, n = 0; c !== start && n < 4000; c = prev[c], n++) pts.push({ x: N.x0 + (c % nx + .5) * N.cell, z: N.z0 + (((c / nx) | 0) + .5) * N.cell });
  pts.reverse(); const out = pts.filter((p, k) => k % 2 === 1 || k === pts.length - 1); if (!out.length) return [{ x: tx, z: tz }]; out[out.length - 1] = { x: tx, z: tz }; return out;
}
/* сховки для ботів: поруч із меблями, на вільній клітинці, не в кабінеті боса */
function hideSpots(v) {
  const F = FL[v == null ? ST.v : v] || FL[0];
  if (F.hide) return F.hide;
  F.hide = [];
  for (const f of F.furn) {
    if (!FT[f.t].dis || inOffF(F, f.x, f.z)) continue;
    const cs = circles(f), ext = Math.max(...cs.map(c => dist2(c.x, c.z, f.x, f.z) + c.r));
    for (let k = 0; k < 12; k++) {
      const a = k / 12 * Math.PI * 2 + .4, x = f.x + Math.cos(a) * (ext + .6), z = f.z + Math.sin(a) * (ext + .6);
      if (Math.abs(x - F.x) > F.hx - .6 || Math.abs(z - F.z) > F.hz - .6 || inOffF(F, x, z) || !navFree(x, z)) continue;
      if (STATICS.some(o => dist2(x, z, o.x, o.z) < o.r + .42)) continue;
      F.hide.push({ x, z, f }); break;
    }
  }
  return F.hide;
}

/* ---------- Стан раунду ---------- */
// учасник: k — ключ (ім’я / 'me' / 'bot:…'), n — підпис, boss, bot, p — під що замаскований, r — поворот,
// c — спійманий, pr — продуктивність, x/z/f — позиція (для ботів), w — працює, mv — рухається, dc — звіт використано,
// fl — 🚩 прогуляв збори (секунд лишилось), rc — перезарядка тарана
// v — поверх раунду, nv — поверх наступного раунду (за голосами), vt — голоси, stun — бос лежить, bell — збори, bu — дзвоник використано
// лобі: lb — хто в лобі [ключ, готовий, голос], ct — відлік до автостарту (онлайн, 20 с після першого «Я готовий»)
const ST = { on: false, ph: 'meet', t: 0, rn: 0, cd: 0, ro: [], dec: [], sc: {}, bk: '', v: 0, nv: 0, vt: [0, 0, 0], stun: 0, bell: 0, bu: 0, lb: [], ct: 0 };
const AU = { clock: 0, stT: 0, bot: {}, mv: {}, ws: {}, gone: {}, bc: {}, sus: [], did: 0, click: {}, freeze: false, votes: {}, vT: 0, ram: {}, bump: {}, claim: {}, ready: {}, role: {}, rdy1: '', rdyT: 0, lastB: '' };
const AUTO_T = 20;   // онлайн: через стільки секунд після першого «Я готовий» стартуємо без тих, хто мовчить
const myKey = () => (NET.on && typeof WORLD !== 'undefined' && WORLD.on ? myName() : 'me');
const keyOf = from => SIMSIDE ? String(from && from.name || '') : 'me';
const ent = k => ST.ro.find(e => e.k === k);
const me = () => ent(myKey());
const bossE = () => ST.ro.find(e => e.boss);
const hiders = () => ST.ro.filter(e => !e.boss);
const alive = () => hiders().filter(e => !e.c);
const RF = () => FL[ST.v] || FL[0];   // поверх поточного раунду
function snap() {
  return { on: ST.on ? 1 : 0, ph: ST.ph, t: r2(ST.t), rn: ST.rn, cd: r2(ST.cd), bk: ST.bk, v: ST.v, nv: ST.nv, vt: ST.vt, sn: r2(ST.stun), bl: r2(ST.bell), bu: ST.bu ? 1 : 0, lb: ST.lb, ct: r2(ST.ct),
    ro: ST.ro.map(e => [e.k, e.n, e.boss ? 1 : 0, e.bot ? 1 : 0, e.p, r2(e.r), e.c ? 1 : 0, Math.round(e.pr), r2(e.x), r2(e.z), r2(e.f), e.w ? 1 : 0, e.mv ? 1 : 0, e.dc ? 1 : 0, r2(e.fl), r2(e.rc)]),
    dec: ST.dec.map(d => [d.id, r2(d.x), r2(d.z), d.t, r2(d.r)]), sc: Object.entries(ST.sc).sort((a, b) => b[1] - a[1]).slice(0, 10) };
}
function applySnap(d) {
  const fv = v => clamp(v | 0, 0, FL.length - 1);
  Object.assign(ST, { on: !!d.on, ph: d.ph === 'hunt' ? 'hunt' : 'meet', t: +d.t || 0, rn: d.rn | 0, cd: +d.cd || 0, bk: String(d.bk || ''), v: fv(d.v), nv: fv(d.nv), stun: +d.sn || 0, bell: +d.bl || 0, bu: d.bu ? 1 : 0 });
  if (Array.isArray(d.vt)) ST.vt = FL.map((_, i) => d.vt[i] | 0);
  ST.lb = Array.isArray(d.lb) ? d.lb.slice(0, 12).map(a => [String(a[0]).slice(0, 24), a[1] ? 1 : 0, a[2] >= 0 && a[2] < FL.length ? a[2] | 0 : -1]) : []; ST.ct = +d.ct || 0;
  if (Array.isArray(d.ro)) ST.ro = d.ro.slice(0, 12).map(a => ({ k: String(a[0]), n: String(a[1]).slice(0, 24), boss: !!a[2], bot: !!a[3], p: FT[a[4]] ? a[4] : '', r: +a[5] || 0, c: !!a[6], pr: +a[7] || 0, x: +a[8] || 0, z: +a[9] || 0, f: +a[10] || 0, w: !!a[11], mv: !!a[12], dc: !!a[13], fl: +a[14] || 0, rc: +a[15] || 0 }));
  if (Array.isArray(d.dec)) ST.dec = d.dec.slice(0, 12).map(a => ({ id: a[0] | 0, x: +a[1], z: +a[2], t: FT[a[3]] ? a[3] : 'report', r: +a[4] || 0 }));
  if (Array.isArray(d.sc)) ST.sc = Object.fromEntries(d.sc.slice(0, 10).map(a => [String(a[0]).slice(0, 24), a[1] | 0]));
}
function pushState() { if (SIMSIDE) A.send('st', snap()); }
function emit(e) { if (SIMSIDE) A.send('ev', e); else onEvent(e); }
function req(k, d) { const o = Object.assign({ k }, d || {}); if (AUTH()) onReq(o, { id: NET.id, name: myName() }); else A.send('rq', o); }
A.onNet('st', (d, from) => { if (!SIMSIDE && !AUTH() && from.id === -1 && d) applySnap(d); });
A.onNet('ev', (d, from) => { if (!SIMSIDE && !AUTH() && from.id === -1 && d) onEvent(d); });
A.onNet('rq', (d, from) => { if (SIMSIDE && d) onReq(d, from); });

/* ---------- Логіка раунду (сервер світу або сам гравець) ---------- */
function humanPos(k) { return SIMSIDE ? simPlayers().find(p => p.name === k && !p.dead) || null : (k === 'me' && !pl.dead ? pl : null); }
function humansHere() { return SIMSIDE ? simPlayers().filter(p => !p.dead && inIsl(p.x, p.z)).map(p => p.name).filter(Boolean) : (!pl.dead && inIsl(pl.x, pl.z) ? ['me'] : []); }
function posOf(e) {
  if (e.bot) return e;
  if (!SIMSIDE) return e.k === 'me' ? pl : null;
  return simPlayers().find(p => p.name === e.k) || null;
}
const nm = k => SIMSIDE ? escapeHTML(k) : 'Ти';
/* лобі: голос за поверх і «Я готовий» — у вікні лобі (modeLobby); рахує сервер світу або сам гравець */
function defFloor() {   // ніхто не голосував — граємо там, де більшість людей (нічия — поточний поверх)
  const n = FL.map(() => 0); for (const k of humansHere()) { const p = humanPos(k); const v = p ? floorAt(p.x, p.z) : -1; if (v >= 0) n[v]++; }
  const mx = Math.max(...n); return mx > 0 && n[ST.v] < mx ? n.indexOf(mx) : ST.v;
}
function chooseFloor(final) {   // більшість голосів; нічия — випадково серед лідерів (у прев’ю — стабільно); без голосів — defFloor()
  const n = FL.map(() => 0), H = humansHere();
  for (const k of H) { const v = AU.votes[k]; if (v != null && n[v] != null) n[v]++; }
  const mx = Math.max(...n), def = defFloor(), top = n.map((c, i) => c === mx ? i : -1).filter(i => i >= 0);
  return { v: mx === 0 ? def : top.length === 1 ? top[0] : final ? pick(top) : top.includes(ST.nv) ? ST.nv : top[0], vt: n };
}
function voteTick(dt) {
  AU.vAcc = (AU.vAcc || 0) + dt;
  if ((AU.vT -= dt) > 0) return; AU.vT = .25;
  const el = AU.vAcc; AU.vAcc = 0;
  const H = humansHere();
  for (const k in AU.votes) if (!H.includes(k)) delete AU.votes[k];
  for (const k in AU.ready) if (!H.includes(k) || ST.on) delete AU.ready[k];
  const c = chooseFloor();
  const lb = ST.on ? [] : H.map(k => [k, AU.ready[k] ? 1 : 0, AU.votes[k] != null ? AU.votes[k] : -1]);
  // «Я готовий»: старт, коли готові всі люди в лобі; онлайн — ще й через 20 с після першого готового
  const R = H.filter(k => AU.ready[k]);
  if (!R.length) { AU.rdyT = 0; AU.rdy1 = ''; }
  else if (SIMSIDE) AU.rdyT += el;
  const ct = R.length && SIMSIDE ? Math.max(0, AUTO_T - AU.rdyT) : 0;
  const ch = c.v !== ST.nv || c.vt.some((n, i) => n !== ST.vt[i]) || JSON.stringify(lb) !== JSON.stringify(ST.lb) || Math.ceil(ct) !== Math.ceil(ST.ct);
  ST.nv = c.v; ST.vt = c.vt; ST.lb = lb; ST.ct = ct;
  if (!ST.on && R.length && (R.length === H.length || (SIMSIDE && AU.rdyT >= AUTO_T))) { const k = R.includes(AU.rdy1) ? AU.rdy1 : R[0]; startRound(k, AU.role[k] === 'boss' ? 'boss' : 'hider'); return; }
  if (ch) pushState();
}
function onReq(d, from) {
  const k = keyOf(from), e = ent(k);
  if (d.k === 'vote') { if (!ST.on && FL[d.v | 0] && humansHere().includes(k)) { AU.votes[k] = d.v | 0; AU.vT = 0; voteTick(0); emit({ k: 'voted', who: k, v: d.v | 0 }); } return; }
  if (d.k === 'ready') {   // «Я готовий» / «Не готовий»; role — ким хоче грати наодинці з ботами
    if (ST.on || !humansHere().includes(k)) return;
    AU.role[k] = d.role === 'boss' ? 'boss' : 'hider';
    if (d.on) { AU.ready[k] = 1; if (!AU.rdy1 || !AU.ready[AU.rdy1]) AU.rdy1 = k; } else delete AU.ready[k];
    AU.vT = 0; voteTick(0); return;
  }
  if (!ST.on || !e) return;
  const p = posOf(e);
  if (d.k === 'leave') { dropOut(e, SIMSIDE ? `🚪 ${escapeHTML(k)} пішов з офісу.` : ''); return; }
  if (d.k === 'dis' && !e.boss && !e.c) {
    const i = d.i | 0;
    if (i < 0) { if (e.p) { e.p = ''; emit({ k: 'dis', who: k, t: '' }); pushState(); } return; }
    const f = FURN[i]; if (!f || !FT[f.t].dis || !p || fdist(f, p.x, p.z) > 2.6) return;
    e.p = f.t; e.r = f.rot; e.w = 0; emit({ k: 'dis', who: k, t: f.t }); checkReady(); pushState();
  }
  else if (d.k === 'work' && !e.boss && !e.c) {
    if (d.on) { e.w = 1; e.p = ''; AU.ws[k] = AU.clock; pushState(); }
    else if (d.done) {
      const near = p && DESKS.some(f => fdist(f, p.x, p.z) < 2.4);
      if (e.w && near && AU.clock - (AU.ws[k] || 0) >= WORK_T - .6) { e.pr = 100; e.w = 0; emit({ k: 'worked', who: k }); pushState(); }
    } else { e.w = 0; pushState(); }
  }
  else if (d.k === 'decoy' && !e.boss && !e.c && !e.dc && p) { dropDecoy(e, p.x, p.z); }
  else if (d.k === 'ram' && !e.boss && !e.c && p) startRam(e, p, +d.a || 0);
  else if (d.k === 'ramhit' && !e.boss && !e.c && p && AU.ram[k] > AU.clock) { const b = bossE(), bp = b && posOf(b); if (bp && dist2(p.x, p.z, bp.x, bp.z) < 2.6) trip(e, bp); }
  else if (d.k === 'check' && e.boss && ST.ph === 'hunt' && ST.stun <= 0 && p) doCheck(e, p.x, p.z);
  else if (d.k === 'bell' && e.boss && ST.ph === 'hunt' && !ST.bu && ST.stun <= 0) ringBell(e);
  else if (d.k === 'bump' && e.boss && ST.ph === 'hunt' && p) { const t = ent(String(d.who)), tp = t && posOf(t); if (t && !t.boss && !t.c && t.p && tp && dist2(p.x, p.z, tp.x, tp.z) < propR(t.p) + 1.3) bump(t, tp); }
  else if (d.k === 'catch' && e.boss && ST.ph === 'hunt' && ST.stun <= 0 && p) {
    if (AU.clock - (AU.click[k] || -9) < .5) return; AU.click[k] = AU.clock;
    if (d.who != null) { const t = ent(String(d.who)), tp = t && posOf(t); if (t && !t.boss && !t.c && tp && dist2(p.x, p.z, tp.x, tp.z) < 3) catchE(e, t, tp); }
    else if (d.d != null) { const dc = ST.dec.find(q => q.id === (d.d | 0)); if (dc && dist2(p.x, p.z, dc.x, dc.z) < 3) miss(e, 'report', dc.x, dc.z, dc.id); }
    else if (d.f != null) { const f = FURN[d.f | 0]; if (f && fdist(f, p.x, p.z) < 2.6) miss(e, f.t, f.x, f.z); }
  }
}
function startRound(starter, role) {
  const H = humansHere(); if (!H.length) return;
  if (!H.includes(starter)) H.unshift(starter);
  const ch = chooseFloor(true); ST.v = ch.v; ST.nv = ch.v; AU.votes = {}; ST.vt = FL.map(() => 0); AU.ready = {}; AU.rdy1 = ''; AU.rdyT = 0; ST.lb = []; ST.ct = 0;
  const F = RF();
  ST.ro = []; ST.dec = []; AU.bot = {}; AU.mv = {}; AU.ws = {}; AU.gone = {}; AU.sus = []; AU.click = {}; AU.ram = {}; AU.bump = {}; AU.claim = {};
  const mk = (k, n, boss, bot) => ({ k, n, boss, bot, p: '', r: 0, c: false, pr: 100, x: 0, z: 0, f: 0, w: false, mv: false, dc: false, fl: 0, rc: 0 });
  // хто бос: наодинці — роль, яку обрав гравець (бот закриває другу); кілька людей — жереб серед людей,
  // але той, хто був босом минулого раунду, двічі поспіль не буде (якщо є з кого обирати)
  let bossK = null;
  if (H.length === 1) bossK = role === 'boss' ? H[0] : 'bot:boss';
  else { const c = H.filter(k => k !== AU.lastB); bossK = pick(c.length ? c : H); }
  AU.bc[bossK] = (AU.bc[bossK] || 0) + 1; AU.lastB = bossK;
  for (const h of H) ST.ro.push(mk(h, SIMSIDE ? h : 'Ти', h === bossK, false));
  if (H.length === 1) {
    if (bossK === 'bot:boss') ST.ro.push(Object.assign(mk('bot:boss', F.bossN, true, true), { x: F.bossSpot.x, z: F.bossSpot.z, f: Math.PI }));
    const names = ['Петро з бухгалтерії', 'Оксана з HR', 'Стажер Вітя'].slice(0, bossK === 'bot:boss' ? 2 : 3);
    names.forEach((n, i) => { let s = { x: F.spawn.x - 1.2 + i * 1.2, z: F.spawn.z + .8 }; if (!navFree(s.x, s.z)) s = { x: F.spawn.x, z: F.spawn.z }; ST.ro.push(Object.assign(mk('bot:' + i, n, false, true), { x: s.x, z: s.z })); });
  }
  for (const e of ST.ro) if (e.bot) AU.bot[e.k] = { path: [], mode: e.boss ? 'meet' : 'go', t: 0, thr: rand(18, 40), think: 0, rt: 0 };
  ST.on = true; ST.ph = 'meet'; ST.t = 0; ST.rn++; ST.cd = 0; ST.bk = bossK; ST.stun = 0; ST.bell = 0; ST.bu = 0; AU.clock = 0;
  const b = bossE();
  emit({ k: 'start', rn: ST.rn, boss: b.k, bn: b.n, v: ST.v, hs: ST.ro.filter(q => !q.bot).map(q => q.k) });
  // усіх — на обраний поверх: бос — у кабінет, офісники — у ліфтовий хол (хто вже тут — лишається на місці)
  let n = 0;
  for (const e of ST.ro) {
    if (e.bot) continue;
    if (e.boss) emit({ k: 'tp', who: e.k, x: F.bossSpot.x, z: F.bossSpot.z });
    else { const p = humanPos(e.k); if (!p || floorAt(p.x, p.z) !== ST.v) { emit({ k: 'tp', who: e.k, x: r2(F.spawn.x + (n % 3 - 1) * 1.1), z: r2(F.spawn.z - Math.floor(n / 3) * 1.1) }); n++; } }
  }
  pushState();
}
function checkReady() {   // усі сховались — нарада закінчується раніше (але не раніше 10 с)
  if (ST.ph === 'meet' && alive().length && alive().every(e => e.p) && ST.t < MEET - 10) ST.t = MEET - 10;
}
function catchE(b, t, tp) {
  t.c = true; t.p = ''; t.w = false; t.fl = 0;
  if (!b.bot) ST.sc[b.k] = (ST.sc[b.k] || 0) + 1;
  const n = hiders().filter(e => e.c).length, C = RF().carpet;
  emit({ k: 'caught', who: t.k, wn: t.n, by: b.k, x: r2(tp.x), z: r2(tp.z), i: n });
  const s = { x: r2(C.x - (n - 1) % 3 * .8), z: r2(C.z - Math.floor((n - 1) / 3) * .8) };
  if (t.bot) { t.x = s.x; t.z = s.z; t.f = 0; t.mv = false; delete AU.ram[t.k]; }
  else emit({ k: 'tp', who: t.k, x: s.x, z: s.z });
  pushState();
  if (!alive().length) endRound('boss');
}
function miss(b, t, x, z, decId) {
  ST.t += PENALTY;
  if (decId != null) ST.dec = ST.dec.filter(q => q.id !== decId);
  emit({ k: 'miss', t, x: r2(x), z: r2(z), by: b.k });
  pushState();
}
function doCheck(b, x, z) {
  if (ST.cd > 0) return;
  ST.cd = CHECK_CD;
  const ks = alive().filter(e => e.p).filter(e => { const p = posOf(e); return p && dist2(p.x, p.z, x, z) < CHECK_R; }).map(e => e.k);
  const ds = ST.dec.filter(d => dist2(d.x, d.z, x, z) < CHECK_R).map(d => d.id);
  emit({ k: 'check', x: r2(x), z: r2(z), ks, ds, by: b.k });
  if (bossE() && bossE().bot) for (const k of ks) if (Math.random() < .85) { const p = posOf(ent(k)); if (p) AU.sus.push({ k, x: p.x, z: p.z, until: AU.clock + 8 }); }
  for (const k of ks) { const e = ent(k); if (e.bot && Math.random() < .35) { const s = AU.bot[k]; if (s && s.mode === 'hide') { s.mode = 'go'; s.spot = null; e.p = ''; } } }   // бот-офісник запанікував
  pushState();
}
function dropDecoy(e, x, z) {
  e.dc = true;
  const d = { id: ++AU.did, x: r2(x + .5), z: r2(z + .3), t: e.p || 'report', r: e.r || 0 };
  ST.dec.push(d);
  emit({ k: 'decoy', who: e.k }); pushState();
}
/* ---------- Фізичний тролінг: таран кріслом / кулером / візком, і «бздинь», коли бос сам врізався ---------- */
function startRam(e, p, a) {
  if (ST.ph !== 'hunt' || !canRoll(e.p) || e.rc > 0 || e.w) return false;
  e.rc = RAM_CD; AU.ram[e.k] = AU.clock + RAM_T + .35;
  emit({ k: 'ram', who: e.k, a: r2(a), x: r2(p.x), z: r2(p.z), t: e.p }); pushState();
  return true;
}
function trip(e, bp) {
  delete AU.ram[e.k];
  if (ST.stun > 0) return;
  ST.stun = STUN;
  if (!e.bot) ST.sc[e.k] = (ST.sc[e.k] || 0) + 1;
  const b = bossE(); if (b && b.bot) { const s = AU.bot[b.k]; s.path = []; s.tg = null; s.mode = 'wander'; if (Math.random() < .5) AU.sus.push({ k: e.k, x: bp.x, z: bp.z, until: AU.clock + STUN + 5 }); }
  emit({ k: 'trip', who: e.k, wn: e.n, t: e.p, x: r2(bp.x), z: r2(bp.z), by: b ? b.k : '' }); pushState();
}
function bump(t, tp) {
  if (AU.clock - (AU.bump[t.k] || -9) < BUMP_CD) return;
  AU.bump[t.k] = AU.clock;
  const b = bossE(); if (b && b.bot && Math.random() < .85) AU.sus.push({ k: t.k, x: tp.x, z: tp.z, until: AU.clock + 6 });
  emit({ k: 'bump', who: t.k, t: t.p, x: r2(tp.x), z: r2(tp.z) });
}
/* ---------- 🔔 Загальні збори: усі офісники — за 15 с у залу нарад, хто не прийшов — 🚩 ---------- */
function ringBell(b) {
  ST.bu = 1; ST.bell = BELL_T;
  emit({ k: 'bell', by: b.k, room: RF().meet.n }); pushState();
}
function bellEnd() {
  const F = RF(), fl = [], ok = [];
  for (const e of alive()) {
    const p = posOf(e); if (!p) continue;
    if (inRoomR(F, F.meet, p.x, p.z, .1)) { ok.push(e.k); e.pr = Math.min(100, e.pr + 25); }
    else { fl.push(e.k); e.fl = FLAG_T; if (bossE() && bossE().bot) AU.sus.push({ k: e.k, x: p.x, z: p.z, until: AU.clock + FLAG_T }); }
  }
  emit({ k: 'bellEnd', fl, ok, room: F.meet.n }); pushState();
}
function dropOut(e, msg) {
  ST.ro = ST.ro.filter(q => q !== e);
  if (msg) emit({ k: 'msg', txt: msg });
  if (e.boss) { endRound('hiders', 'Бос пішов додому 🏠'); return; }
  if (!ST.ro.some(q => !q.bot)) { endRound('none', 'В офісі нікого не лишилось.'); return; }
  if (!alive().length) endRound(hiders().length ? 'boss' : 'none'); else pushState();
}
function endRound(win, why) {
  if (!ST.on) return;
  const b = bossE();
  if (win === 'boss' && b && !b.bot) ST.sc[b.k] = (ST.sc[b.k] || 0) + 2;
  if (win === 'hiders') for (const e of alive()) if (!e.bot) ST.sc[e.k] = (ST.sc[e.k] || 0) + 3;
  const res = { k: 'end', win, why: why || '', ro: ST.ro.map(e => [e.k, e.boss ? 1 : 0, e.c ? 1 : 0, e.bot ? 1 : 0]), cc: hiders().filter(e => e.c).length, bn: b ? b.n : '', v: ST.v };
  ST.on = false; ST.ro = []; ST.dec = []; AU.bot = {}; AU.ram = {}; ST.stun = 0; ST.bell = 0;
  emit(res); pushState();
}
function authTick(dt) {
  voteTick(dt);
  if (!ST.on) return;
  AU.clock += dt; ST.t += dt;
  if (ST.cd > 0) ST.cd = Math.max(0, ST.cd - dt);
  if (ST.stun > 0) ST.stun = Math.max(0, ST.stun - dt);
  for (const e of ST.ro) { if (e.fl > 0) e.fl = Math.max(0, e.fl - dt); if (e.rc > 0) e.rc = Math.max(0, e.rc - dt); }
  if (ST.bell > 0 && (ST.bell -= dt) <= 0) { ST.bell = 0; bellEnd(); }
  // хто з людей пішов з поверху
  for (const e of ST.ro.slice()) {
    if (e.bot) continue;
    const p = posOf(e), here = p && !p.dead && floorAt(p.x, p.z) === ST.v;
    if (here) { AU.gone[e.k] = 0; const m = AU.mv[e.k] || (AU.mv[e.k] = { x: p.x, z: p.z, t: -9 }); if (dist2(p.x, p.z, m.x, m.z) > .04) { m.t = AU.clock; m.x = p.x; m.z = p.z; } e.x = p.x; e.z = p.z; continue; }
    AU.gone[e.k] = (AU.gone[e.k] || 0) + dt;
    if (AU.gone[e.k] > (SIMSIDE ? 3 : .5)) { dropOut(e, SIMSIDE ? `🚪 ${escapeHTML(e.k)} пішов з офісу.` : ''); if (!ST.on) return; }
  }
  // таран: хто в розгоні торкнувся боса — бос падає
  const b = bossE(), bp = b && posOf(b);
  for (const k in AU.ram) {
    const e = ent(k), p = e && posOf(e);
    if (!e || e.c || AU.ram[k] < AU.clock) { delete AU.ram[k]; continue; }
    if (bp && p && dist2(p.x, p.z, bp.x, bp.z) < 1.2) trip(e, bp);
  }
  if (ST.ph === 'meet') { if (ST.t >= MEET) { ST.ph = 'hunt'; ST.t = 0; emit({ k: 'hunt' }); pushState(); } }
  else {
    for (const e of alive()) if (!e.w) e.pr = Math.max(0, e.pr - DRAIN * dt);
    if (ST.t >= DUR) { endRound('hiders'); return; }
  }
  if (!AU.freeze) for (const e of ST.ro.slice()) if (e.bot && ST.on) { try { e.boss ? bossBot(e, dt) : hiderBot(e, dt); } catch (err) { console.error('hideboss bot', err); } }
  if (!ST.on) return;
  AU.stT -= dt; if (AU.stT <= 0) { AU.stT = .2; pushState(); }
}
A.on('tick', dt => {
  if (AUTH()) authTick(dt);
  else if (ST.on) {
    ST.t += dt; if (ST.cd > 0) ST.cd = Math.max(0, ST.cd - dt); if (ST.stun > 0) ST.stun = Math.max(0, ST.stun - dt); if (ST.bell > 0) ST.bell = Math.max(0, ST.bell - dt);
    for (const e of ST.ro) { if (e.fl > 0) e.fl = Math.max(0, e.fl - dt); if (e.rc > 0) e.rc = Math.max(0, e.rc - dt); }
  }
  if (!SIMSIDE) clientTick(dt);
});

/* ---------- Боти ---------- */
// бос — фізичне тіло: замасковані офісники не пускають його крізь себе (і «бздинькають»)
function pushProps(e, r, skip) {
  for (const q of alive()) {
    if (!q.p || q.k === skip) continue;
    const p = q.bot ? q : posOf(q); if (!p) continue;
    const min = propR(q.p) + r, dx = e.x - p.x, dz = e.z - p.z, d = Math.hypot(dx, dz);
    if (d < min && d > 1e-4) { e.x = p.x + dx / d * min; e.z = p.z + dz / d * min; bump(q, p); }
  }
}
function walk(e, s, dt, spd) {   // іде маршрутом; true — дійшов
  if (!s.path.length) { e.mv = false; return true; }
  const t = s.path[0], d = dist2(e.x, e.z, t.x, t.z);
  if (d < .25) { s.path.shift(); return !s.path.length && (e.mv = false, true); }
  const st = Math.min(d, spd * dt), a = Math.atan2(t.x - e.x, t.z - e.z);
  const ox = e.x, oz = e.z, F = RF();
  e.x += Math.sin(a) * st; e.z += Math.cos(a) * st; e.f = a; e.mv = true;
  if (s.path.length > 1 || d > 1.2) pushOutStatics(e, .35);
  if (e.boss && ST.ph === 'hunt') pushProps(e, .4, s.tg && s.tg.k);
  e.x = clamp(e.x, F.x - F.hx + .5, F.x + F.hx - .5); e.z = clamp(e.z, F.z - F.hz + .5, F.z + F.hz - .5);
  // застряг — наступна точка маршруту
  s.stuck = dist2(ox, oz, e.x, e.z) < st * .25 ? (s.stuck || 0) + dt : 0;
  if (s.stuck > .8) { s.stuck = 0; s.path.shift(); }
  return false;
}
const goTo = (e, s, x, z) => { s.path = route(e.x, e.z, x, z); };
function say(e, txt) { emit({ k: 'say', who: e.k, txt }); }
function meetSpot(e) {   // місце в залі нарад: біля меблів, під які можна замаскуватись
  const F = RF(), hs = hideSpots().filter(h => inRoomR(F, F.meet, h.x, h.z, .3));
  const taken = new Set(ST.ro.filter(q => q !== e && AU.bot[q.k] && AU.bot[q.k].spot).map(q => AU.bot[q.k].spot));
  const free = hs.filter(h => !taken.has(h));
  return free.length ? pick(free) : null;
}
function hiderBot(e, dt) {
  const s = AU.bot[e.k]; if (e.c) { e.mv = false; return; }
  // 🔔 збори: більшість ботів біжить у залу нарад
  if (ST.bell > 0 && !s.bell) { s.bell = 1; if (Math.random() < .7 && s.mode !== 'ram') { const sp = meetSpot(e); if (sp && !inRoomR(RF(), RF().meet, e.x, e.z)) { s.spot = sp; e.p = ''; e.w = false; s.mode = 'go'; goTo(e, s, sp.x, sp.z); pushState(); } } }
  if (s.mode === 'go') {
    if (!s.spot) {
      const taken = new Set(ST.ro.filter(q => q !== e && AU.bot[q.k] && AU.bot[q.k].spot).map(q => AU.bot[q.k].spot));
      const free = hideSpots().filter(h => !taken.has(h) && dist2(h.x, h.z, e.x, e.z) < 22);
      s.spot = pick(free.length ? free : hideSpots()); goTo(e, s, s.spot.x, s.spot.z);
    }
    if (walk(e, s, dt, ST.bell > 0 ? 3.6 : 2.9)) { e.p = s.spot.f.t; e.r = s.spot.f.rot; s.mode = 'hide'; checkReady(); pushState(); }
  } else if (s.mode === 'hide') {
    if (ST.ph === 'hunt' && e.pr < s.thr && !(ST.bell > 0)) {
      if (!e.dc && Math.random() < .6) dropDecoy(e, e.x, e.z);
      const F = RF(), dk = F.desks.filter(d => !inOffF(F, d.x, d.z)).sort((a, b) => dist2(a.x, a.z, e.x, e.z) - dist2(b.x, b.z, e.x, e.z))[Math.floor(Math.random() * 3)];
      const w = workSpot(dk); s.desk = dk; e.p = ''; s.mode = 'towork'; goTo(e, s, w.x, w.z); pushState();
      return;
    }
    // таран: замаскований під крісло / кулер / візок, бос близько — розгін і в ноги!
    if ((s.rt -= dt) <= 0) {
      s.rt = .5;
      const b = bossE(), bp = b && posOf(b);
      if (ST.ph === 'hunt' && bp && canRoll(e.p) && e.rc <= 0 && ST.stun <= 0 && dist2(bp.x, bp.z, e.x, e.z) < 4.5 && Math.random() < .35) {
        const a = Math.atan2(bp.x - e.x, bp.z - e.z);
        if (startRam(e, e, a)) { s.mode = 'ram'; s.ram = { a, t: RAM_T }; }
      }
    }
  } else if (s.mode === 'ram') {
    const st = RAM_SPD * dt, n = Math.max(1, Math.ceil(st / .2));
    for (let i = 0; i < n; i++) { e.x += Math.sin(s.ram.a) * st / n; e.z += Math.cos(s.ram.a) * st / n; pushOutStatics(e, .35); }
    e.f = s.ram.a; e.mv = true;
    if ((s.ram.t -= dt) <= 0) { s.mode = 'hide'; e.mv = false; s.spot = null; }
  } else if (s.mode === 'towork') {
    if (walk(e, s, dt, 3.1)) { s.mode = 'working'; s.t = WORK_T; e.w = true; e.f = Math.PI; pushState(); }
  } else if (s.mode === 'working') {
    s.t -= dt;
    if (s.t <= 0) { e.w = false; e.pr = 100; s.thr = rand(18, 40); s.mode = 'go'; s.spot = null; pushState(); }
  }
}
function bossBot(e, dt) {
  const s = AU.bot[e.k], F = RF();
  if (ST.ph === 'meet') { e.x = F.bossSpot.x; e.z = F.bossSpot.z; e.f = Math.PI; e.mv = false; if ((s.t -= dt) <= 0) { s.t = rand(5, 8); say(e, pick(['Так, колеги, синергія…', 'Хто з’їв мій йогурт?', 'KPI мають рости!', 'Зараз прийду — перевірю…'])); } return; }
  if (ST.stun > 0) { e.mv = false; s.path = []; return; }   // лежить і бачить зірочки
  s.think -= dt;
  if (s.think <= 0) {
    s.think = .4;
    const pos = q => q.bot ? q : posOf(q);
    const see = alive().map(q => ({ q, p: pos(q) })).filter(o => o.p);
    AU.sus = AU.sus.filter(o => o.until > AU.clock);
    // рухається в маскуванні — помітно
    for (const o of see) if (o.q.p && dist2(o.p.x, o.p.z, e.x, e.z) < 9 && (o.q.bot ? o.q.mv : AU.clock - ((AU.mv[o.q.k] || {}).t || -9) < .6) && Math.random() < .7 && !AU.sus.some(u => u.k === o.q.k)) AU.sus.push({ k: o.q.k, x: o.p.x, z: o.p.z, until: AU.clock + 6 });
    for (const d of ST.dec) if (dist2(d.x, d.z, e.x, e.z) < 8 && !AU.sus.some(u => u.d === d.id) && Math.random() < .25) AU.sus.push({ d: d.id, x: d.x, z: d.z, until: AU.clock + 10 });
    const vis = see.filter(o => !o.q.p && dist2(o.p.x, o.p.z, e.x, e.z) < 10.5);
    const blink = see.filter(o => o.q.p && (o.q.pr <= 0 || o.q.fl > 0) && dist2(o.p.x, o.p.z, e.x, e.z) < 14);
    const near = (l, f) => l.sort((a, b) => dist2(f(a).x, f(a).z, e.x, e.z) - dist2(f(b).x, f(b).z, e.x, e.z))[0];
    let tg = null;
    if (vis.length) { const o = near(vis, o => o.p); tg = { k: o.q.k, x: o.p.x, z: o.p.z, run: 1 }; if (s.mode !== 'chase') say(e, pick(['А ну стояти!', 'Ага! Попався, ледацюго!', 'Чому не на робочому місці?!'])); s.mode = 'chase'; }
    else if (blink.length) { const o = near(blink, o => o.p); tg = { k: o.q.k, x: o.p.x, z: o.p.z }; s.mode = 'inspect'; }
    else if (AU.sus.length) { const u = near(AU.sus, u => u); const q = u.k && ent(u.k), p = q && pos(q); tg = u.d != null ? { d: u.d, x: u.x, z: u.z } : { k: u.k, x: p ? p.x : u.x, z: p ? p.z : u.z }; s.mode = 'inspect'; }
    if (tg) { s.tg = tg; if (!s.path.length || dist2(s.path[s.path.length - 1].x, s.path[s.path.length - 1].z, tg.x, tg.z) > .8) goTo(e, s, tg.x, tg.z); }
    else if (s.mode !== 'wander' || !s.path.length) {
      s.mode = 'wander';
      // обходить меблі (вільні місця біля предметів, під які можна замаскуватись)
      const hs = hideSpots().filter(h => dist2(h.x, h.z, e.x, e.z) < 12), h = pick(hs.length ? hs : hideSpots());
      s.tg = { f: h.f.i, x: h.f.x, z: h.f.z }; goTo(e, s, h.x, h.z);
    }
    // «Перевірка» і «Загальні збори»
    if (ST.cd <= 0 && s.mode !== 'chase' && Math.random() < .12) { doCheck(e, e.x, e.z); say(e, 'Перевірка! Хто тут не працює?'); }
    else if (!ST.bu && ST.t > 30 && s.mode !== 'chase' && Math.random() < .03) { ringBell(e); say(e, `🔔 Загальні збори! Усі — у «${F.meet.n.replace(/^\S+\s/, '')}»!`); }
  }
  const tg = s.tg; if (!tg) return;
  const done = walk(e, s, dt, s.mode === 'chase' ? 4.4 : 3.1);
  if (ST.stun > 0) return;
  // дійшов / наздогнав: «Попався!» або промах
  if (tg.k) {
    const q = ent(tg.k), p = q && !q.c && (q.bot ? q : posOf(q));
    if (p && dist2(p.x, p.z, e.x, e.z) < 1.35) { catchE(e, q, p); s.tg = null; s.path = []; AU.sus = AU.sus.filter(u => u.k !== tg.k); say(e, pick(['Попався! На килим!', 'Ага! Звільнений! (жартую… чи ні)', 'Працювати хто буде?!'])); return; }
    if (done) { s.tg = null; AU.sus = AU.sus.filter(u => u.k !== tg.k); s.mode = 'wander'; }
  } else if (tg.d != null) {
    if (done || dist2(tg.x, tg.z, e.x, e.z) < 1.2) { if (ST.dec.some(d => d.id === tg.d)) miss(e, 'report', tg.x, tg.z, tg.d); AU.sus = AU.sus.filter(u => u.d !== tg.d); s.tg = null; s.path = []; s.mode = 'wander'; }
  } else if (done) {
    const f = FURN[tg.f];
    if (f && Math.random() < .3) miss(e, f.t, f.x, f.z);
    else if (Math.random() < .3) say(e, pick(['Хм… ні, це просто меблі.', 'Десь тут хтось ледарює…', 'Я все бачу!']));
    s.tg = null;
  }
}

/* ======================= ДАЛІ — ЛИШЕ В ГРАВЦЯ ======================= */
const V = { lbl: null, glbl: null, gArrow: null, gMark: null, goal: null, hud: null, goalEl: null, blind: null, work: null, ram: null, ents: new Map(), decs: new Map(), shake: {}, blbl: new Map(), doors: [], stars: null, music: -1, auto: false, pref: 'hider', joined: false, lastRes: null, bar: '', bumpT: {}, smokeCd: 0, smokeT: 0 };
const amIn = () => !!(ST.on && me());
const amBoss = () => { const e = me(); return !!(ST.on && e && e.boss); };
const amHider = () => { const e = me(); return !!(ST.on && e && !e.boss && !e.c); };
const amCaught = () => { const e = me(); return !!(ST.on && e && !e.boss && e.c); };
const myProp = () => { const e = me(); return ST.on && e && !e.boss && !e.c ? e.p : ''; };
const onRound = () => floorAt(pl.x, pl.z) === ST.v;   // гравець на поверсі раунду
const myFloor = () => FL[floorAt(pl.x, pl.z)] || FL[ST.on ? ST.v : ST.nv] || FL[0];
const left = () => ST.ph === 'meet' ? Math.max(0, MEET - ST.t) : Math.max(0, DUR - ST.t);
const mmss = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const roomName = r => r ? r.n.replace(/^\S+\s/, '') : '';

/* ---------- Хмарочос у центрі міста (меші з текстурою — через A.dynamic, бо оптимізатор зливає їх в одноколірні) ---------- */
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
  const body = new THREE.Mesh(new THREE.BoxGeometry(w + .8, 88, d + .8), tw); body.position.set(cx, -44.5, cz); scene.add(A.dynamic(body));
  for (let y = -3.6; y > -88; y -= 3.6) put(g, mesh(new THREE.BoxGeometry(w + 1, .25, d + 1), '#6E668E', false), cx, y, cz);
  // скляний фасад нашого поверху: з боку камери — низький, щоб було видно всередину
  const glass = mat('#BFE6FF', { transparent: true, opacity: .22, depthWrite: false });
  const side = (x0, z0, x1, z1, h) => {
    const horiz = z0 === z1, len = horiz ? Math.abs(x1 - x0) : Math.abs(z1 - z0);
    const m = new THREE.Mesh(new THREE.BoxGeometry(horiz ? len : .08, h, horiz ? .08 : len), glass); m.position.set((x0 + x1) / 2, h / 2, (z0 + z1) / 2); g.add(m);
    for (let t = 0; t <= len + .01; t += 2) put(g, mesh(new THREE.BoxGeometry(.12, h, .12), '#4E4A6E', false), horiz ? Math.min(x0, x1) + t : x0, h / 2, horiz ? z0 : Math.min(z0, z1) + t);
    put(g, mesh(new THREE.BoxGeometry(horiz ? len : .2, .12, horiz ? .2 : len), '#4E4A6E', false), (x0 + x1) / 2, h, (z0 + z1) / 2);
  };
  const X0 = cx - w / 2 - .5, X1 = cx + w / 2 + .5, Z0 = cz - d / 2 - .5, Z1 = cz + d / 2 + .5;
  side(X0, Z0, X1, Z0, 2.8); side(X0, Z0, X0, Z1, 2.8); side(X1, Z0, X1, Z1, 2.8); side(X0, Z1, X1, Z1, front);
  // сусідні хмарочоси
  const towers = [];
  for (let k = 0; k < 26; k++) {
    const a = rnd() * 6.283, r = Math.max(w, d) / 2 + 14 + rnd() * 48, tx = cx + Math.cos(a) * r, tz = cz + Math.sin(a) * r * .8;
    const bw = 8 + rnd() * 10, bd = 8 + rnd() * 10;
    if (Math.abs(tx - cx) < w / 2 + bw / 2 + 9 && Math.abs(tz - cz) < d / 2 + bd / 2 + 9) continue;
    if (towers.some(o => Math.abs(o.x - tx) < (o.w + bw) / 2 + 2 && Math.abs(o.z - tz) < (o.d + bd) / 2 + 2)) continue;
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

/* ---------- Меблі (модельки) ---------- */
function furnMesh(t) {
  const g = new THREE.Group();
  switch (t) {
    case 'desk':
      put(g, mesh(new THREE.BoxGeometry(1.6, .07, .8), '#F2E6D8'), 0, .76, 0);
      for (const [a, b] of [[-.74, -.34], [.74, -.34], [-.74, .34], [.74, .34]]) put(g, mesh(new THREE.BoxGeometry(.06, .74, .06), '#8E86B0'), a, .37, b);
      put(g, mesh(new THREE.BoxGeometry(.4, .5, .7), '#D9D2E8'), .55, .45, 0);
      put(g, mesh(new THREE.BoxGeometry(.08, .2, .08), '#4E4A6E'), 0, .88, -.24);
      put(g, mesh(new THREE.BoxGeometry(.66, .42, .05), '#2E2346'), 0, 1.15, -.26);
      put(g, mesh(new THREE.BoxGeometry(.58, .34, .01), bulb('#7FD3F5'), false), 0, 1.15, -.23);
      put(g, mesh(new THREE.BoxGeometry(.46, .025, .15), '#4E4A6E'), -.05, .8, .1);
      put(g, mesh(flat(new THREE.CylinderGeometry(.05, .045, .1, 8)), '#FF9C8A'), -.6, .84, .15);
      put(g, mesh(new THREE.BoxGeometry(.25, .02, .32), '#FFFFFF', false), .45, .8, .12).rotation.y = .3;
      break;
    case 'bossdesk':
      put(g, mesh(new THREE.BoxGeometry(2.3, .09, 1.05), '#7A4E3A'), 0, .78, 0);
      put(g, mesh(new THREE.BoxGeometry(2.3, .72, .06), '#5E3A2A'), 0, .38, .48);
      for (const a of [-1.1, 1.1]) put(g, mesh(new THREE.BoxGeometry(.08, .74, 1), '#5E3A2A'), a, .37, 0);
      put(g, mesh(new THREE.BoxGeometry(.5, .03, .35), '#C9CDD9'), 0, .84, -.05);
      put(g, mesh(new THREE.BoxGeometry(.5, .32, .02), '#C9CDD9'), 0, 1, -.22).rotation.x = -.25;
      put(g, mesh(new THREE.BoxGeometry(.5, .12, .05), '#FFD27A'), .7, .89, .35);
      put(g, mesh(flat(new THREE.CylinderGeometry(.06, .05, .12, 8)), '#FFFFFF'), -.7, .89, .1);
      break;
    case 'chair':
      put(g, mesh(new THREE.BoxGeometry(.5, .09, .5), '#5E6FD8'), 0, .48, 0);
      put(g, mesh(new THREE.BoxGeometry(.5, .6, .08), '#4C5BC2'), 0, .82, -.23);
      put(g, mesh(flat(new THREE.CylinderGeometry(.035, .035, .4, 6)), '#4E4A6E'), 0, .26, 0);
      for (let k = 0; k < 5; k++) { const l = put(g, mesh(new THREE.BoxGeometry(.06, .04, .34), '#4E4A6E'), Math.sin(k * 1.257) * .15, .05, Math.cos(k * 1.257) * .15); l.rotation.y = k * 1.257; }
      for (const a of [-.27, .27]) put(g, mesh(new THREE.BoxGeometry(.05, .05, .32), '#4E4A6E'), a, .66, 0);
      break;
    case 'cooler':
      put(g, mesh(new THREE.BoxGeometry(.5, .95, .5), '#F2F0F7'), 0, .475, 0);
      put(g, mesh(flat(new THREE.CylinderGeometry(.22, .22, .5, 10)), mat('#7FC8F5', { transparent: true, opacity: .75 })), 0, 1.22, 0);
      put(g, mesh(flat(new THREE.CylinderGeometry(.08, .08, .08, 8)), '#5A8BD8'), 0, 1.5, 0);
      put(g, mesh(new THREE.BoxGeometry(.07, .07, .06), '#FF5C7A'), -.1, .78, .27); put(g, mesh(new THREE.BoxGeometry(.07, .07, .06), '#5A8BD8'), .1, .78, .27);
      for (const [a, b] of [[-.2, -.2], [.2, -.2], [-.2, .2], [.2, .2]]) put(g, mesh(new THREE.SphereGeometry(.05, 6, 4), '#2E2346', false), a, .04, b);   // коліщатка
      break;
    case 'ficus':
      put(g, mesh(flat(new THREE.CylinderGeometry(.27, .2, .42, 8)), '#C77B58'), 0, .21, 0);
      put(g, mesh(flat(new THREE.CylinderGeometry(.04, .06, .8, 5)), '#8C6A4E'), 0, .78, 0);
      for (const [x, y, z, r, c] of [[0, 1.45, 0, .32, '#5FB37E'], [.22, 1.15, .1, .26, '#7CCBA2'], [-.2, 1.2, -.08, .27, '#6FBF8B'], [.05, 1.0, -.2, .22, '#5FB37E'], [-.1, .95, .2, .2, '#7CCBA2']]) put(g, mesh(rough(new THREE.IcosahedronGeometry(r, 0), .2), c), x, y, z);
      break;
    case 'copier':
      put(g, mesh(new THREE.BoxGeometry(1, .78, .7), '#D9DCE8'), 0, .39, 0);
      put(g, mesh(new THREE.BoxGeometry(1.02, .12, .72), '#C1C5D6'), 0, .84, 0);
      put(g, mesh(new THREE.BoxGeometry(.8, .05, .55), '#4E4A6E'), -.05, .93, 0);
      put(g, mesh(new THREE.BoxGeometry(.32, .03, .3), '#FFFFFF'), .62, .6, 0);
      put(g, mesh(new THREE.BoxGeometry(.2, .08, .04), bulb('#7FE08A'), false), .3, .85, .37);
      put(g, mesh(new THREE.BoxGeometry(.7, .04, .02), '#7E77A0', false), 0, .5, .36);
      break;
    case 'cabinet':
      put(g, mesh(new THREE.BoxGeometry(.8, 1.4, .65), '#C9C2DE'), 0, .7, 0);
      for (let i = 0; i < 3; i++) { put(g, mesh(new THREE.BoxGeometry(.7, .38, .02), '#B7AFD0', false), 0, .28 + i * .44, .33); put(g, mesh(new THREE.BoxGeometry(.24, .04, .04), '#7E77A0', false), 0, .36 + i * .44, .35); }
      put(g, mesh(new THREE.BoxGeometry(.3, .25, .25), '#FFE08A'), -.15, 1.53, 0);
      break;
    case 'box':
      put(g, mesh(new THREE.BoxGeometry(.75, .55, .6), '#D6A87B'), 0, .275, 0);
      put(g, mesh(new THREE.BoxGeometry(.77, .02, .12), '#B8865E', false), 0, .555, 0);
      put(g, mesh(new THREE.BoxGeometry(.2, .14, .01), '#FFFFFF', false), .15, .3, .305);
      break;
    case 'trash':
      put(g, mesh(flat(new THREE.CylinderGeometry(.26, .2, .55, 9)), '#7E77A0'), 0, .275, 0);
      for (const [x, z] of [[.06, .05], [-.08, -.04], [.02, -.1]]) put(g, mesh(new THREE.IcosahedronGeometry(.08, 0), '#FFFFFF'), x, .56, z);
      break;
    case 'coffee':
      put(g, mesh(new THREE.BoxGeometry(.7, .8, .55), '#4E3A7C'), 0, .4, 0);
      put(g, mesh(new THREE.BoxGeometry(.48, .55, .42), '#2E2346'), 0, 1.08, 0);
      put(g, mesh(new THREE.BoxGeometry(.3, .08, .05), bulb('#FF6BD6'), false), 0, 1.22, .22);
      put(g, mesh(flat(new THREE.CylinderGeometry(.05, .04, .1, 8)), '#FFFFFF'), 0, .86, .12);
      break;
    case 'sofa':
      put(g, mesh(new THREE.BoxGeometry(2, .4, .85), '#8C6FD0'), 0, .3, 0);
      put(g, mesh(new THREE.BoxGeometry(2, .6, .22), '#7A5BC9'), 0, .75, -.33);
      for (const a of [-.95, .95]) put(g, mesh(new THREE.BoxGeometry(.22, .58, .85), '#7A5BC9'), a, .45, 0);
      for (const a of [-.45, .45]) put(g, mesh(new THREE.BoxGeometry(.85, .14, .62), '#A58BE0'), a, .56, .08);
      put(g, mesh(new THREE.BoxGeometry(.3, .3, .1), '#FFD27A'), -.6, .75, -.15).rotation.z = .3;
      break;
    case 'rollup':   // рол-ап банер «Дзвони — продавай!»
      put(g, mesh(new THREE.BoxGeometry(.8, .1, .25), '#4E4A6E'), 0, .05, 0);
      put(g, mesh(new THREE.BoxGeometry(.75, 1.8, .03), '#4FD1C5'), 0, 1, 0);
      put(g, mesh(new THREE.BoxGeometry(.6, .3, .01), '#FFFFFF', false), 0, 1.5, .02); put(g, mesh(new THREE.BoxGeometry(.5, .5, .01), '#FFE066', false), 0, .9, .02);
      put(g, mesh(new THREE.BoxGeometry(.3, .06, .01), '#2E2346', false), 0, .55, .02);
      break;
    case 'gong':   // гонг продажів на стійці
      for (const a of [-.4, .4]) put(g, mesh(new THREE.BoxGeometry(.07, 1.55, .07), '#6B4A3A'), a, .78, 0);
      put(g, mesh(new THREE.BoxGeometry(.9, .08, .1), '#6B4A3A'), 0, 1.55, 0);
      put(g, mesh(flat(new THREE.CylinderGeometry(.33, .33, .04, 16)), '#E0B060'), 0, 1.02, 0).rotation.x = Math.PI / 2;
      put(g, mesh(flat(new THREE.CylinderGeometry(.1, .1, .05, 10)), '#C08A3A'), 0, 1.02, .02).rotation.x = Math.PI / 2;
      put(g, mesh(new THREE.BoxGeometry(.6, .06, .3), '#4E4A6E'), 0, .03, 0);
      break;
    case 'pouf':   // крісло-мішок
      put(g, mesh(rough(new THREE.SphereGeometry(.45, 9, 6), .06), '#FF9C8A'), 0, .28, 0).scale.set(1, .62, 1);
      put(g, mesh(rough(new THREE.SphereGeometry(.3, 8, 5), .05), '#FF8A7A'), 0, .45, -.18).scale.set(1.2, .9, .7);
      break;
    case 'globe':   // глобус-бар
      put(g, mesh(flat(new THREE.CylinderGeometry(.3, .36, .1, 10)), '#6B4A3A'), 0, .05, 0);
      for (let k = 0; k < 3; k++) { const l = put(g, mesh(new THREE.BoxGeometry(.05, .5, .05), '#6B4A3A'), Math.sin(k * 2.09) * .22, .3, Math.cos(k * 2.09) * .22); l.rotation.z = Math.sin(k * 2.09) * .25; }
      put(g, mesh(new THREE.SphereGeometry(.34, 14, 10), '#6FA8C9'), 0, .8, 0);
      put(g, mesh(rough(new THREE.SphereGeometry(.345, 8, 6), .03), '#9BC97F', false), .02, .82, .01).scale.set(.9, .5, .7);
      put(g, mesh(new THREE.TorusGeometry(.38, .025, 4, 18), '#E0B060'), 0, .8, 0).rotation.y = .4;
      break;
    case 'bust':   // бюст засновника на постаменті
      put(g, mesh(new THREE.BoxGeometry(.5, 1, .5), '#E8E2D6'), 0, .5, 0);
      put(g, mesh(new THREE.BoxGeometry(.56, .06, .56), '#C9C2B6'), 0, 1.03, 0);
      put(g, mesh(new THREE.BoxGeometry(.42, .22, .28), '#D8D2C6'), 0, 1.16, 0);
      put(g, mesh(new THREE.SphereGeometry(.17, 10, 8), '#E2DCD0'), 0, 1.42, 0);
      put(g, mesh(new THREE.BoxGeometry(.12, .05, .04), '#C9C2B6', false), 0, 1.38, .16);
      put(g, mesh(new THREE.BoxGeometry(.3, .08, .01), '#E0B060', false), 0, .7, .26);
      break;
    case 'armchair':   // шкіряне крісло
      put(g, mesh(new THREE.BoxGeometry(.85, .42, .8), '#6B3A2A'), 0, .26, 0);
      put(g, mesh(new THREE.BoxGeometry(.85, .7, .2), '#5E2E22'), 0, .7, -.32);
      for (const a of [-.38, .38]) put(g, mesh(new THREE.BoxGeometry(.14, .55, .8), '#5E2E22'), a, .45, 0);
      put(g, mesh(new THREE.BoxGeometry(.6, .1, .55), '#7E4A36'), 0, .5, .06);
      break;
    case 'lamp':   // торшер
      put(g, mesh(flat(new THREE.CylinderGeometry(.2, .24, .05, 10)), '#4E4A6E'), 0, .03, 0);
      put(g, mesh(flat(new THREE.CylinderGeometry(.025, .025, 1.4, 6)), '#E0B060'), 0, .72, 0);
      put(g, mesh(flat(new THREE.CylinderGeometry(.16, .26, .3, 10)), bulb('#FFE7A0')), 0, 1.5, 0);
      break;
    case 'cart':   // поштовий візок з конвертами
      put(g, mesh(new THREE.BoxGeometry(1, .5, .55), '#7F96B9'), 0, .55, 0);
      put(g, mesh(new THREE.BoxGeometry(.9, .04, .5), '#5E7090'), 0, .3, 0);
      for (let k = 0; k < 5; k++) put(g, mesh(new THREE.BoxGeometry(.04, .3, .4), ['#FFFFFF', '#FFE08A', '#F2E6D8'][k % 3], false), -.35 + k * .17, .9, 0);
      put(g, mesh(new THREE.BoxGeometry(.05, .5, .05), '#4E4A6E'), .5, .9, -.22); put(g, mesh(new THREE.BoxGeometry(.05, .5, .05), '#4E4A6E'), .5, .9, .22); put(g, mesh(new THREE.BoxGeometry(.05, .05, .5), '#4E4A6E'), .5, 1.15, 0);
      for (const [a, b] of [[-.42, -.22], [.42, -.22], [-.42, .22], [.42, .22]]) put(g, mesh(new THREE.SphereGeometry(.07, 6, 4), '#2E2346', false), a, .07, b);
      break;
    case 'shelf': case 'archive': {   // стелаж з папками / архів з коробками
      const ar = t === 'archive', h = ar ? 2.2 : 1.8;
      put(g, mesh(new THREE.BoxGeometry(1.8, h, .45), ar ? '#7A5A3A' : '#B8A68E'), 0, h / 2, 0);
      for (let y = 0; y < (ar ? 5 : 4); y++) for (let k = 0; k < 5; k++) put(g, mesh(new THREE.BoxGeometry(.3, .32, .36), ar ? ['#E8D8B8', '#D6C29A', '#C9B88E', '#F2E6D8'][(y * 3 + k) % 4] : ['#E0607E', '#6BB8FF', '#FFE066', '#7FE08A', '#B07CF0', '#FFFFFF'][(y * 5 + k * 3) % 6], false), -.72 + k * .36, .25 + y * .43, .06);
      break;
    }
    case 'counter':   // кухонна стійка: мийка й мікрохвильовка
      put(g, mesh(new THREE.BoxGeometry(4, .9, .7), '#FFFFFF'), 0, .45, 0); put(g, mesh(new THREE.BoxGeometry(4.05, .06, .75), '#4E4A6E'), 0, .92, 0);
      for (let k = 0; k < 5; k++) put(g, mesh(new THREE.BoxGeometry(.04, .5, .02), '#C9CDD9', false), -1.6 + k * .8, .5, .36);
      put(g, mesh(new THREE.BoxGeometry(.6, .05, .4), '#8FD3FF', false), -.4, .96, 0); put(g, mesh(flat(new THREE.CylinderGeometry(.03, .03, .3, 6)), '#C9CDD9'), -.4, 1.1, -.25);
      put(g, mesh(new THREE.BoxGeometry(.6, .35, .4), '#C9CDD9'), 1.3, 1.13, 0); put(g, mesh(new THREE.BoxGeometry(.35, .22, .02), '#2E2346', false), 1.25, 1.13, .21);
      for (const x of [.4, .6, .8]) put(g, mesh(flat(new THREE.CylinderGeometry(.06, .05, .12, 8)), ['#FF6BD6', '#FFFFFF', '#FFE066'][Math.round(x * 5) % 3]), x, 1.01, .1);
      break;
    case 'fridge':
      put(g, mesh(new THREE.BoxGeometry(.8, 1.9, .7), '#E9E2FA'), 0, .95, 0); put(g, mesh(new THREE.BoxGeometry(.78, .03, .02), '#B7AFD0', false), 0, 1.3, .36);
      put(g, mesh(new THREE.BoxGeometry(.05, .4, .05), '#8E86B0'), .3, 1.55, .37); put(g, mesh(new THREE.BoxGeometry(.05, .4, .05), '#8E86B0'), .3, .9, .37);
      put(g, mesh(new THREE.BoxGeometry(.15, .15, .01), '#FFE066', false), -.15, 1.6, .36);
      break;
    case 'mtable':   // довгий стіл для нарад
      put(g, mesh(new THREE.BoxGeometry(6, .09, 1.4), '#4E3A7C'), 0, .76, 0);
      for (const x of [-2.4, 0, 2.4]) put(g, mesh(new THREE.BoxGeometry(.2, .72, .6), '#2E2346'), x, .36, 0);
      for (const x of [-2, -.6, .8, 2.2]) for (const z of [-.4, .4]) put(g, mesh(new THREE.BoxGeometry(.3, .02, .22), '#FFFFFF', false), x, .82, z);
      put(g, mesh(flat(new THREE.CylinderGeometry(.18, .2, .06, 10)), '#2E2346'), 0, .83, 0);   // спікерфон
      break;
    case 'ktable': case 'ctable': case 'rtable': {
      const k = t !== 'ctable', w = k ? 2.4 : 1.4, d = t === 'ktable' ? 1.2 : t === 'rtable' ? 1 : .8, y = k ? .75 : .42;
      put(g, mesh(new THREE.BoxGeometry(w, .07, d), t === 'ktable' ? '#E8DCC8' : '#6B4A3A'), 0, y, 0);
      for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) put(g, mesh(new THREE.BoxGeometry(.07, y, .07), '#4E4A6E'), a * (w / 2 - .1), y / 2, b * (d / 2 - .1));
      if (t === 'ktable') { put(g, mesh(flat(new THREE.CylinderGeometry(.06, .05, .12, 8)), '#FFFFFF'), -.5, .84, .2); put(g, mesh(flat(new THREE.CylinderGeometry(.2, .2, .03, 12)), '#FFFFFF'), .4, .8, -.1); }
      else if (t === 'rtable') {   // зелені «банківські» лампи й книжки
        for (const a of [-.6, .6]) { put(g, mesh(new THREE.BoxGeometry(.04, .3, .04), '#E0B060'), a, .93, 0); put(g, mesh(flat(new THREE.CylinderGeometry(.1, .16, .1, 8)), bulb('#5FBF7A')), a, 1.1, 0); }
        put(g, mesh(new THREE.BoxGeometry(.4, .08, .3), '#8C3A3A', false), 0, .82, .2); put(g, mesh(new THREE.BoxGeometry(.3, .02, .4), '#FFFFFF', false), -.2, .8, -.15);
      }
      else put(g, mesh(new THREE.BoxGeometry(.4, .03, .3), '#FF6BD6', false), .2, .47, 0);
      break;
    }
    case 'reception':   // стійка рецепції
      put(g, mesh(new THREE.BoxGeometry(3.6, 1.05, .7), '#4E3A7C'), 0, .52, 0); put(g, mesh(new THREE.BoxGeometry(3.7, .07, .9), '#E8DCC8'), 0, 1.08, .05);
      put(g, mesh(new THREE.BoxGeometry(3, .06, .02), bulb('#FF6BD6'), false), 0, .75, .36);
      put(g, mesh(new THREE.BoxGeometry(.6, .4, .05), '#2E2346'), .6, 1.35, -.15); put(g, mesh(flat(new THREE.CylinderGeometry(.08, .1, .08, 10)), '#FFD27A'), -.8, 1.15, .2);
      break;
    case 'vend':   // автомат зі снеками
      put(g, mesh(new THREE.BoxGeometry(1, 1.9, .8), '#C2335A'), 0, .95, 0); put(g, mesh(new THREE.BoxGeometry(.65, 1.2, .02), mat('#BFE6FF', { transparent: true, opacity: .6 }), false), -.12, 1.15, .41);
      for (let y = 0; y < 4; y++) for (let k = 0; k < 3; k++) put(g, mesh(new THREE.BoxGeometry(.14, .14, .1), ['#FFE066', '#7FE08A', '#6BB8FF', '#FF9C8A'][(y + k) % 4], false), -.32 + k * .2, .7 + y * .28, .3);
      put(g, mesh(new THREE.BoxGeometry(.18, .5, .03), '#2E2346', false), .36, 1.25, .41);
      break;
    case 'rack':   // серверна стійка з лампочками
      put(g, mesh(new THREE.BoxGeometry(.75, 2, .9), '#2E2346'), 0, 1, 0);
      for (let y = 0; y < 7; y++) { put(g, mesh(new THREE.BoxGeometry(.65, .2, .02), '#4E4A6E', false), 0, .3 + y * .24, .46); put(g, mesh(new THREE.BoxGeometry(.05, .05, .02), bulb(y % 3 ? '#7FE08A' : '#6BE7FF'), false), .25, .3 + y * .24, .47); }
      break;
    case 'sink':
      put(g, mesh(new THREE.BoxGeometry(.55, .8, .45), '#FFFFFF'), 0, .4, 0); put(g, mesh(new THREE.BoxGeometry(.4, .04, .3), '#8FD3FF', false), 0, .82, .03);
      put(g, mesh(new THREE.BoxGeometry(.5, .6, .03), mat('#DDF3FF', { transparent: true, opacity: .8 }), false), 0, 1.5, -.22);   // дзеркало
      break;
    case 'wc':   // кабінка з дверцятами
      put(g, mesh(new THREE.BoxGeometry(1.3, 1.7, .05), '#7FA6C9'), 0, .95, .68); put(g, mesh(new THREE.BoxGeometry(.05, 1.7, 1.35), '#7FA6C9'), -.66, .95, 0);
      put(g, mesh(new THREE.BoxGeometry(.4, .4, .55), '#FFFFFF'), 0, .2, -.3); put(g, mesh(new THREE.BoxGeometry(.4, .45, .15), '#FFFFFF'), 0, .55, -.6);
      put(g, mesh(new THREE.BoxGeometry(.05, 1.6, 1.2), '#9BBBD6'), .64, .9, 0).rotation.y = .5;   // прочинені дверцята
      break;
    case 'pingpong':
      put(g, mesh(new THREE.BoxGeometry(2.7, .06, 1.5), '#3E8E6A'), 0, .76, 0); put(g, mesh(new THREE.BoxGeometry(2.7, .01, .03), '#FFFFFF', false), 0, .8, 0);
      put(g, mesh(new THREE.BoxGeometry(.03, .16, 1.55), '#FFFFFF', false), 0, .86, 0);
      for (const [a, b] of [[-1.2, -.6], [1.2, -.6], [-1.2, .6], [1.2, .6]]) put(g, mesh(new THREE.BoxGeometry(.07, .74, .07), '#4E4A6E'), a, .37, b);
      put(g, mesh(new THREE.SphereGeometry(.05, 6, 5), '#FF9C3A'), .6, .84, .3);
      break;
    case 'pod':   // капсула сну
      put(g, mesh(new THREE.BoxGeometry(2.1, .5, 1), '#E9E2FA'), 0, .25, 0);
      put(g, mesh(new THREE.CylinderGeometry(.5, .5, 2.1, 14, 1, false, 0, Math.PI), '#D9D2EE'), 0, .5, 0).rotation.z = Math.PI / 2;
      put(g, mesh(new THREE.BoxGeometry(1.6, .12, .8), '#B7A6EA', false), .1, .55, 0);
      put(g, mesh(new THREE.BoxGeometry(.4, .14, .5), '#FFFFFF', false), -.75, .62, 0);
      put(g, mesh(new THREE.BoxGeometry(.05, .2, .2), bulb('#6BE7FF'), false), 1.06, .7, 0);
      break;
    case 'kpi':   // табло KPI на стійках
      for (const a of [-.6, .6]) put(g, mesh(new THREE.BoxGeometry(.08, 1.4, .08), '#4E4A6E'), a, .7, 0);
      put(g, mesh(new THREE.BoxGeometry(1.8, 1, .1), '#2E2346'), 0, 1.75, 0);
      put(g, mesh(new THREE.BoxGeometry(1.65, .85, .02), bulb('#203050'), false), 0, 1.75, .06);
      for (let k = 0; k < 6; k++) put(g, mesh(new THREE.BoxGeometry(.18, .1 + (k * 37 % 7) * .09, .02), bulb(k === 5 ? '#FF5C7A' : '#4FD1C5'), false), -.6 + k * .24, 1.4 + (.1 + (k * 37 % 7) * .09) / 2, .08);
      break;
    case 'planter':   // клумба
      put(g, mesh(new THREE.BoxGeometry(2.2, .5, .8), '#8A6242'), 0, .25, 0);
      for (let k = 0; k < 5; k++) put(g, mesh(rough(new THREE.IcosahedronGeometry(.28 + (k % 2) * .08, 0), .2), ['#5FB37E', '#7CCBA2', '#6FBF8B'][k % 3]), -.8 + k * .4, .65, (k % 2 - .5) * .2);
      for (const a of [-.6, .2, .7]) put(g, mesh(new THREE.SphereGeometry(.07, 6, 4), ['#FF6BD6', '#FFE066', '#FF9C8A'][Math.round(a * 3 + 3) % 3]), a, .85, .15);
      break;
    case 'tv':   // телевізор на стіні
      put(g, mesh(new THREE.BoxGeometry(2.2, 1.2, .08), '#2E2346'), 0, 1.6, 0); put(g, mesh(new THREE.BoxGeometry(2.05, 1.05, .02), bulb('#6BB8FF'), false), 0, 1.6, .05);
      put(g, mesh(new THREE.BoxGeometry(1.2, .1, .01), '#FFFFFF', false), -.2, 1.8, .065); put(g, mesh(new THREE.BoxGeometry(.25, .5, .01), '#7FE08A', false), .6, 1.45, .065);
      break;
    case 'board':   // маркерна дошка зі схемою «синергії»
      put(g, mesh(new THREE.BoxGeometry(2.2, 1.1, .05), '#FFFFFF'), 0, 1.45, 0);
      for (let k = 0; k < 4; k++) put(g, mesh(new THREE.BoxGeometry(.5 + (k * .37) % 1.2, .04, .02), ['#E0607E', '#6BB8FF', '#2E2346', '#7FE08A'][k], false), -.4 + (k % 2) * .5, 1.2 + k * .17, .03);
      put(g, mesh(new THREE.BoxGeometry(2.2, .05, .1), '#8E86B0'), 0, .88, .04);
      break;
    case 'report': default:
      for (let i = 0; i < 4; i++) put(g, mesh(new THREE.BoxGeometry(.42, .07, .3), i % 2 ? '#FFFFFF' : '#F2F0F7'), (i % 2) * .04, .04 + i * .075, -(i % 3) * .02).rotation.y = i * .12;
      put(g, mesh(new THREE.BoxGeometry(.2, .01, .08), '#FF5C7A', false), 0, .34, 0);
      break;
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
function signPlane(txt, col, w, h, bg) {
  const c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * h / w);
  const x = c.getContext && c.getContext('2d');
  if (x && x.fillText) {
    if (bg) { x.fillStyle = bg; x.fillRect(0, 0, c.width, c.height); }
    x.strokeStyle = col; x.lineWidth = 10; x.shadowColor = col; x.shadowBlur = 22; x.strokeRect(8, 8, c.width - 16, c.height - 16);
    x.font = `bold ${Math.round(c.height * .5)}px sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#FFFFFF'; x.fillText(txt, c.width / 2, c.height / 2 + 4);
  }
  return A.dynamic(new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false })));
}
/* ---------- Поверх: підлоги кімнат, стіни з дверима, таблички, ліфт, стійка лобі, меблі ---------- */
function floorBox(g, x0, z0, x1, z1, col, y) { const m = mesh(new THREE.BoxGeometry(x1 - x0, .02, z1 - z0), col, false, true); m.position.set((x0 + x1) / 2, y || .05, (z0 + z1) / 2); g.add(m); return m; }
function wallMeshes(g, F) {
  const P = F.pal;
  for (const w of F.walls) {
    if (w.outer) continue;   // зовнішні стіни — скляний фасад хмарочоса
    const horiz = w.z1 === w.z2, H = 1.15;
    for (const [a, b] of wallParts(w)) {
      const len = b - a; if (len < .05) continue;
      const mx = horiz ? (a + b) / 2 : w.x1, mz = horiz ? w.z1 : (a + b) / 2, h = w.glass ? 2.2 : H;
      const m = mesh(new THREE.BoxGeometry(horiz ? len : .2, h, horiz ? .2 : len), w.glass ? mat('#BFE6FF', { transparent: true, opacity: .3 }) : P.wall, !w.glass);
      m.position.set(mx, h / 2, mz); g.add(m);
      const t = mesh(new THREE.BoxGeometry(horiz ? len : .26, .08, horiz ? .26 : len), w.glass ? '#4E4A6E' : P.trim, false); t.position.set(mx, h + .04, mz); g.add(t);
      if (!w.glass) { const sk = mesh(new THREE.BoxGeometry(horiz ? len : .24, .12, horiz ? .24 : len), P.skirt, false); sk.position.set(mx, .06, mz); g.add(sk); }   // плінтус
    }
    // одвірки й таблички над дверима (у горизонтальних стінах — табличка кімнати за дверима)
    for (const d of w.doors || []) {
      const H2d = (w.glass ? 2.2 : H) + .35;
      for (const s of [-1, 1]) put(g, mesh(new THREE.BoxGeometry(.24, H2d, .24), w.glass ? '#4E4A6E' : P.trim, false), horiz ? d + s * .95 : w.x1, H2d / 2, horiz ? w.z1 : d + s * .95);
      if (!horiz || (w.glass && Math.abs(d - F.door.x) < .1 && Math.abs(w.z1 - F.door.z) < .1)) continue;
      const a = roomAt(d, w.z1 - .6), b = roomAt(d, w.z1 + .6), into = a && a.id !== 'hall' ? a : b;
      if (!into || into.id === 'hall') continue;
      const s = signPlane(into.n, '#FFD27A', 2, .42, 'rgba(46,35,70,.9)'); s.position.set(d, H2d + .25, w.z1 + .14); g.add(s);
    }
  }
}
function liftMesh(g, F) {   // ліфт: сталеві двері, рамка, табло з номером поверху
  const L = F.lift, o = new THREE.Group(); o.position.set(F.x + L.x, 0, F.z + L.z); o.rotation.y = L.rot; g.add(o);
  put(o, mesh(new THREE.BoxGeometry(2.1, 2.5, .16), '#6E668E', false), 0, 1.25, -.04);
  for (const s of [-1, 1]) put(o, mesh(new THREE.BoxGeometry(.78, 2.15, .05), '#C9CDD9', false), s * .4, 1.08, .05);
  put(o, mesh(new THREE.BoxGeometry(.02, 2.15, .06), '#4E4A6E', false), 0, 1.08, .06);
  put(o, mesh(new THREE.BoxGeometry(.12, .22, .04), bulb('#7FE08A'), false), 1.2, 1.2, .02);
  const s = signPlane('▲ ' + F.n.match(/\d+/)[0], '#FFD27A', .8, .3, 'rgba(46,35,70,.95)'); s.position.set(0, 2.36, .1); o.add(s);
}
function buildFloor(i) {
  const F = FL[i], P = F.pal, g = new THREE.Group(); scene.add(g);
  buildTowerFloor(g, F.x, F.z, F.hx * 2 - 1, F.hz * 2 - 1, { night: F.night, seed: 11 + i * 97 });
  floorBox(g, F.x - F.hx, F.z - F.hz, F.x + F.hx, F.z + F.hz, '#B9B4C8', .02);
  // підлоги кімнат: ковролін в офісах, плитка на кухні й у туалеті, паркет у боса
  for (const r of F.rooms) {
    const x0 = F.x + r.x0, z0 = F.z + r.z0, x1 = F.x + r.x1, z1 = F.z + r.z1;
    if (r.tiles) {
      const [a, b] = r.tiles === 1 ? ['#FFFFFF', '#DCD6EA'] : ['#E6F1F5', '#BFD9E2'];
      floorBox(g, x0, z0, x1, z1, a, .05);
      for (let x = x0; x < x1 - .01; x += 1) for (let z = z0; z < z1 - .01; z += 1) if ((Math.round(x - x0) + Math.round(z - z0)) % 2) floorBox(g, x, z, Math.min(x1, x + 1), Math.min(z1, z + 1), b, .056);
    } else floorBox(g, x0, z0, x1, z1, r.fl, .05);
  }
  const C = F.carpet, O = F.off;
  floorBox(g, C.x - 2.2, C.z - 1.2, C.x + .6, C.z + .4, '#C2335A', .065);                                   // «килим» у боса
  const bd = F.furn.find(f => f.t === 'bossdesk'); if (bd) floorBox(g, bd.x - 1.9, bd.z - 1.6, bd.x + 1.9, bd.z + 2.4, '#7A3A4A', .062);   // перський килим під столом
  wallMeshes(g, F); liftMesh(g, F);
  const sign = (t, c, w, x, y, z, ry) => { const p = signPlane(t, c, w, w * .2, 'rgba(46,35,70,.92)'); p.position.set(x, y, z); if (ry) p.rotation.y = ry; g.add(p); return p; };
  if (i === 0) {
    for (let x = -16; x <= 16; x += 4) floorBox(g, F.x + x - .6, F.z - .3, F.x + x + .6, F.z - .2, '#FFE066', .062);   // розмітка в коридорі
    floorBox(g, F.x - 16.9, F.z + 7, F.x - 15.5, F.z + 9.4, '#8C7FC2', .062);                                             // килимок у холі
    [['KPI ↑↑↑', '#7FE08A', -10], ['ДЕДЛАЙН — ВЧОРА', '#FF6BD6', -1], ['МИ — СІМ’Я', '#FFD27A', 8], ['ВІДДІЛ ПРОДАЖІВ', '#6BE7FF', -15.75]].forEach(([t, c, lx]) => sign(t, c, 2.8, F.x + lx, 2.3, F.z - F.hz + .1));
    sign('ТОВ «СИНЕРГІЯ»', '#FF6BD6', 3.4, F.x - F.hx + .1, 1.9, F.z + 8.2, Math.PI / 2);
  } else if (i === 1) {
    // кабінки: перегородки між столами, підвісні таблички ліній, світлі доріжки
    for (const cx of [-9.4, -4, 1.4]) for (const rz of [-4.4, 2.4]) {
      put(g, mesh(new THREE.BoxGeometry(3.3, 1.3, .06), P.part, false), F.x + cx + .8, .65, F.z + rz);
      for (const ex of [-.88, 2.48]) put(g, mesh(new THREE.BoxGeometry(.06, 1.1, 1.6), P.part, false), F.x + cx + ex, .55, F.z + rz);
      put(g, mesh(new THREE.BoxGeometry(3.3, .05, .1), bulb('#4FD1C5'), false), F.x + cx + .8, 1.32, F.z + rz);
    }
    [['ЛІНІЯ 1 · ХОЛОДНІ ДЗВІНКИ', -4.4], ['ЛІНІЯ 2 · «ВАМ ЗРУЧНО ГОВОРИТИ?»', 2.4]].forEach(([t, z]) => sign(t, '#4FD1C5', 5.4, F.x - 2.6, 2.4, F.z + z - 1.7));
    for (const z of [-7, -1.3, 5.2]) floorBox(g, F.x - 11.8, F.z + z - .4, F.x + 11.8, F.z + z + .4, '#4A5A8C', .058);   // доріжки між рядами
    sign('📞 ДЗВОНИ — ПРОДАВАЙ!', '#FF6BD6', 4, F.x + 8.4, 2.6, F.z + 1);
    sign('КОЛЛ-ЦЕНТР «АЛЛО-24»', '#4FD1C5', 3.6, F.x - F.hx + .1, 1.9, F.z + 1, Math.PI / 2);
    sign('НІЧНА ЗМІНА · ПЛАН 300 ДЗВІНКІВ', '#FFE066', 4.4, F.x - 2, 2.3, F.z - F.hz + .1);
  } else {
    // архів: темні проходи; зала засідань — довгий килим; сад — доріжка
    floorBox(g, F.x - 15.4, F.z - 10.2, F.x - 9.6, F.z - 7.8, '#8C3A4A', .062);
    floorBox(g, F.x + 9, F.z + 6, F.x + 16, F.z + 6.8, '#D6CFC0', .062); floorBox(g, F.x + 12.1, F.z + 6, F.x + 12.9, F.z + 12.6, '#D6CFC0', .062);
    for (let x = -6; x <= 15; x += 3) floorBox(g, F.x + x - .5, F.z + 3.45, F.x + x + .5, F.z + 3.55, '#8A6242', .062);
    sign('ПАРАГРАФ І ПАРТНЕРИ', '#E0B060', 3.6, F.x - F.hx + .1, 1.9, F.z + 1, Math.PI / 2);
    sign('ТИША! ІДЕ СУДОВЕ ЗАСІДАННЯ', '#E0B060', 4, F.x, 2.3, F.z - F.hz + .1);
  }
  // табличка «БОС» і розсувні скляні двері кабінету
  const bs = signPlane('👔 БОС', '#FF5C7A', 1.6, .5, 'rgba(46,35,70,.9)'); bs.position.set(F.door.x, 2.85, F.door.z + .14); g.add(bs);
  V.doors[i] = put(scene, mesh(new THREE.BoxGeometry(1.7, 2.1, .06), mat('#BFE9FF', { transparent: true, opacity: .45 }), false), F.door.x, 1.05, F.door.z + .12); A.dynamic(V.doors[i]);
  // стійка «🗳️ ЛОБІ»: F поруч — знову відкрити вікно лобі (голос за поверх і «Я готовий»)
  { const p = F.board; put(g, mesh(new THREE.BoxGeometry(.08, 1.4, .08), '#4E4A6E'), p.x, .7, p.z);
    const sp = signPlane('🗳️ ЛОБІ', '#7FE08A', 1.5, .5, 'rgba(46,35,70,.92)'); sp.position.set(p.x, 1.55, p.z + .05); g.add(sp); }
  for (const f of F.furn) { const m = furnMesh(f.t); m.position.set(f.x, 0, f.z); m.rotation.y = f.rot; g.add(m); }
  return g;
}
const _buildIsland = buildIsland;
buildIsland = function (s) {
  if (s.biome !== 'hideboss') return _buildIsland.apply(this, arguments);
  return SIMSIDE ? new THREE.Group() : buildFloor(s.hbv | 0);
};
/* ---------- Тверді стіни й меблі (і на сервері, і в гравців) ---------- */
A.on('world', () => {
  for (const F of FL) {
    for (const w of F.walls) { const horiz = w.z1 === w.z2; for (const [a, b] of wallParts(w)) for (let t = a; t <= b + .01; t += .5) addStatic(horiz ? t : w.x1, horiz ? w.z1 : t, .3, 2.5); }
    addStatic(F.board.x, F.board.z, .25, 1.4);
  }
  for (const f of FURN) for (const c of circles(f)) addStatic(c.x, c.z, c.r, FT[f.t].h);
});

/* ---------- Події ---------- */
function onEvent(e) {
  if (SIMSIDE || !e) return;
  const here = running && inIsl(pl.x, pl.z), hr = running && onRound(), mine = e.who != null && e.who === myKey();
  if (e.k === 'msg') { if (here) toast(e.txt); }
  else if (e.k === 'voted') { /* голоси видно у вікні лобі */ }
  else if (e.k === 'start') {
    if (!here) return;
    V.joined = !!me() || ST.ro.some(q => q.k === myKey()) || (Array.isArray(e.hs) && e.hs.includes(myKey()));
    const iBoss = e.boss === myKey(), F = FL[e.v | 0] || FL[0];
    if (V.joined) roleCard(iBoss, F, e.bn);
    banner(iBoss ? `👔 Ти — БОС! ${F.n}. Нарада 20 с… потім шукай ледарів.` : `🙈 Ти — офісник! ${F.n}. Бос — ${escapeHTML(e.bn)}. Ховайся серед меблів (F)!`);
    sfx('ding'); V.shake = {}; V.ram = null; V.work = null;
  }
  else if (e.k === 'tp') { if (mine && running) { pl.x = +e.x; pl.z = +e.z; pl.y = 0; pl.vy = 0; pl.jump = null; pl.falling = false; V.ram = null; } }
  else if (e.k === 'hunt') { if (hr) { banner(amBoss() ? '🔎 Нарада скінчилась — шукай! ЛКМ по підозрілому, 2 — Перевірка, 3 — Збори.' : '👔 Бос вийшов з наради! Не рухайся…'); sfx('warn'); } }
  else if (e.k === 'dis') { if (hr && e.t && mine) { burst(pl.x, .8, pl.z, '#FFFFFF', 12, 3, .5, 2); ftext(pl.x, 2.2, pl.z, `${FT[e.t].ic} Я — ${FT[e.t].n.toLowerCase()}!`, 'calm'); sfx('pop'); if (canRoll(e.t)) toast(`🛞 ${FT[e.t].n} на коліщатках! <b>3</b> — таран: розженись і збий боса з ніг.`); } }
  else if (e.k === 'worked') { if (mine) { ftext(pl.x, 2.5, pl.z, '📈 Продуктивність 100%!', 'gold'); sfx('coin'); } }
  else if (e.k === 'caught') {
    if (!hr) return;
    burst(+e.x, 1.2, +e.z, '#FF5C7A', 22, 5, .8, 4); ftext(+e.x, 2.6, +e.z, 'ПОПАВСЯ! 😵', 'crit'); sfx('crit', +e.x, +e.z); shake = Math.max(shake, .3);
    if (mine) { banner('😵 Попався! Іди на килим до боса — дивишся звідти до кінця раунду.'); V.work = null; V.ram = null; }
    else if (e.by === myKey()) { banner(`🎯 Попався, ${escapeHTML(e.wn)}! Лишилось: ${alive().length}`); P.coins += 5; refreshHUD(); }
    else toast(`😵 ${escapeHTML(e.wn)} попався босові.`);
  }
  else if (e.k === 'miss') {
    if (!hr) return;
    ftext(+e.x, 2.3, +e.z, FT[e.t] ? FT[e.t].miss : 'Нікого…', 'bad'); ftext(+e.x, 3, +e.z, `−${PENALTY} с ⏱`, 'bad'); sfx('hurt', +e.x, +e.z);
    burst(+e.x, 1, +e.z, '#FFD27A', 8, 3, .5, 2);
  }
  else if (e.k === 'check') {
    if (!hr) return;
    ringFX(+e.x, +e.z, CHECK_R, '#FFD27A', .8); sfx('charge', +e.x, +e.z);
    for (const k of e.ks || []) V.shake[k] = gameTime + 2.5;
    for (const d of e.ds || []) V.shake['d' + d] = gameTime + 2.5;
    if ((e.ks || []).includes(myKey())) { banner('😬 Перевірка! Твій предмет труситься — бос дивиться…'); shake = Math.max(shake, .25); }
    else if (e.by === myKey()) toast(`🔎 Перевірка: трусяться ${(e.ks || []).length + (e.ds || []).length ? 'предмети поруч — дивись уважно!' : 'нічого поруч. Шукай далі.'}`);
  }
  else if (e.k === 'decoy') { if (mine) { toast('📄 Фейковий звіт лишено! Бос може на нього клюнути (−5 с йому).'); sfx('page'); } }
  else if (e.k === 'ram') {
    if (!hr) return;
    sfx('dash', +e.x, +e.z); burst(+e.x, .3, +e.z, '#FFF3E6', 8, 2, .4, 1);
    if (mine) ftext(pl.x, 2.3, pl.z, '🛞 ТАРАН!', 'gold');
    else if (amBoss()) ftext(+e.x, 2, +e.z, `${FT[e.t] ? FT[e.t].ic : ''} Що це їде?!`, 'bad');
  }
  else if (e.k === 'trip') {
    if (!hr) return;
    burst(+e.x, 1, +e.z, '#FFE066', 18, 4, .7, 3); ftext(+e.x, 2.8, +e.z, 'БАХ! 💫', 'crit'); sfx('hit', +e.x, +e.z); shake = Math.max(shake, .35);
    if (mine) { banner(`🎳 Страйк! Бос лежить ${STUN} с — біжи працювати!`); P.coins += 10; addXP(15); const d = A.data(); d.trips = (d.trips || 0) + 1; refreshHUD(); V.ram = null; }
    else if (e.by === myKey()) { banner(`💫 ${FT[e.t] ? FT[e.t].n : 'Щось'} збило тебе з ніг! Ти не можеш ловити ${STUN} с.`); pl.lock = STUN; }
    else toast(`🎳 ${escapeHTML(e.wn)} збив боса з ніг! ${STUN} с свободи.`);
  }
  else if (e.k === 'bump') {
    if (!hr) return;
    V.shake[e.who] = gameTime + 1.8; ftext(+e.x, 2.2, +e.z, '🫨 *БЗДИНЬ*', 'bad'); sfx('staple', +e.x, +e.z); burst(+e.x, .9, +e.z, '#FFD27A', 6, 2.5, .4, 1.5);
    if (mine) { banner('😬 Бос в тебе врізався — ти захитався! Він щось підозрює…'); shake = Math.max(shake, .2); }
  }
  else if (e.k === 'bell') {
    if (!hr) return;
    sfx('level'); ringFX(pl.x, pl.z, 3, '#FFE066', .8);
    banner(amBoss() ? `🔔 Загальні збори! Хто за 15 с не прийде в «${roomName({ n: e.room })}» — отримає 🚩.` : `🔔 ЗАГАЛЬНІ ЗБОРИ! Біжи в «${roomName({ n: e.room })}» за 15 с — або 🚩 прапорець!`);
  }
  else if (e.k === 'bellEnd') {
    if (!hr) return;
    if ((e.fl || []).includes(myKey())) { banner(`🚩 Ти прогуляв збори! ${FLAG_T} с над тобою прапорець — бос бачить.`); sfx('warn'); }
    else if ((e.ok || []).includes(myKey())) { toast('👏 Ти прийшов на збори — +25% продуктивності за «залученість».'); sfx('coin'); }
    else if (amBoss()) toast(`🔔 Збори скінчились: прийшли ${(e.ok || []).length}, прогуляли 🚩 ${(e.fl || []).length}.`);
  }
  else if (e.k === 'say') { const v = V.ents.get(e.who); if (v && hr) bubble(v.ent, String(e.txt).slice(0, 70), /стояти|Попався|збори/i.test(e.txt), 2.6); }
  else if (e.k === 'end') finish(e);
}
function finish(e) {
  V.work = null; V.ram = null; V.lastRes = e; V.lobbyHide = false;   // після раунду знову відкриваємо лобі
  const row = (e.ro || []).find(r => r[0] === myKey()), F = FL[e.v | 0] || FL[0];
  if (inOffice(pl.x, pl.z) && running) { pl.x = F.spawn.x; pl.z = F.spawn.z; }
  if (!row || !running) { if (running && inIsl(pl.x, pl.z) && e.win !== 'none') toast(`🏁 Раунд скінчився: ${e.win === 'boss' ? 'бос усіх знайшов' : 'офісники вціліли'}.`); return; }
  const boss = !!row[1], caught = !!row[2], cc = e.cc | 0;
  const d = A.data(); d.rounds = (d.rounds || 0) + 1; d.floors = d.floors || {}; d.floors[e.v | 0] = (d.floors[e.v | 0] || 0) + 1;
  let coins, xp, txt;
  if (e.win === 'none') { coins = 5; xp = 10; txt = `🏁 ${e.why || 'Раунд скасовано.'}`; }
  else if (boss) {
    const win = e.win === 'boss'; coins = (win ? 70 : 20) + cc * 15; xp = win ? 120 : 40;
    d.bossRounds = (d.bossRounds || 0) + 1; if (win) d.bossWins = (d.bossWins || 0) + 1; d.catches = (d.catches || 0) + cc;
    txt = win ? `👔 Усі на килимі! Бос перемагає. Спіймано: ${cc}` : `⏱ ${e.why || 'Час вийшов'} — офісники перехитрили боса. Спіймано: ${cc}`;
  } else {
    const win = e.win === 'hiders' && !caught; coins = win ? 80 : caught ? 15 : 30; xp = win ? 120 : 35;
    if (win) d.survived = (d.survived || 0) + 1; if (caught) d.caught = (d.caught || 0) + 1;
    txt = win ? `🎉 Ти пересидів боса! ${e.why ? e.why + ' ' : ''}Офісники перемагають.` : caught ? `😵 Бос ${escapeHTML(e.bn)} переміг. Наступного разу ховайся краще!` : `👔 Бос ${escapeHTML(e.bn)} переміг.`;
  }
  P.coins += coins; addXP(xp);
  banner(txt); toast(`Нагорода: <b>+${coins} 🪙</b> · +${xp} досвіду. Ще раунд — у вікні лобі: голос за поверх і ✅ «Я готовий». Боса обирає жереб (двічі поспіль — ні).`);
  sfx(/🎉|👔 Усі/.test(txt) ? 'level' : 'ding'); refreshHUD(); save();
}

/* ---------- Хто де: позиції людей і ботів ---------- */
function remoteOf(k) { for (const id in NET.players) { const r = NET.players[id]; if (r.name === k) return r; } return null; }
function posC(e) {   // позиція учасника в гравця
  if (e.k === myKey()) return { x: pl.x, z: pl.z, m: pl.moving || !!V.ram };
  if (e.bot) { const v = V.ents.get(e.k); return v ? { x: v.ent.x, z: v.ent.z, m: e.mv } : { x: e.x, z: e.z, m: e.mv }; }
  const r = remoteOf(e.k); return r ? { x: r.x, z: r.z, m: !!r.m, r } : null;
}
function entView(e) {
  let v = V.ents.get(e.k);
  if (!v) {
    v = { prop: null, pt: '', hum: null, ring: null, ent: { x: e.x, z: e.z, y: 0, bh: 2.3 }, f: e.f };
    if (e.bot) {
      v.hum = e.boss ? buildOffice('#E9B894', '#2E2346') : buildOffice(pick(['#AFC4B6', '#C9D6CF', '#D9C7A9']), pick(['#5A6BB5', '#7FB8A8', '#E0A0C0']));
      if (e.boss) { v.hum.tie.material = mat('#FF5C7A'); v.hum.root.scale.setScalar(1.12); put(v.hum.body, mesh(new THREE.BoxGeometry(.56, .1, .56), '#2E2346'), 0, 1.8, -.02); }
      scene.add(v.hum.root);
    }
    V.ents.set(e.k, v);
  }
  return v;
}
function dropView(k) {
  const v = V.ents.get(k); if (!v) return;
  if (v.prop) scene.remove(v.prop); if (v.hum) scene.remove(v.hum.root); if (v.ring) scene.remove(v.ring);
  if (v.ent.bub) { v.ent.bub.el.remove(); v.ent.bub = null; }
  V.ents.delete(k);
  const r = remoteOf(k); if (r) r.h.root.visible = true;
}
function setProp(v, t) {
  if (v.pt === t) return;
  if (v.prop) { scene.remove(v.prop); v.prop = null; }
  v.pt = t; if (t) { v.prop = furnMesh(t); scene.add(v.prop); }
}
function render(dt) {
  const t = gameTime, seen = new Set();
  for (const e of ST.on ? ST.ro : []) {
    seen.add(e.k);
    const v = entView(e), mine = e.k === myKey();
    const p = posC(e); if (!p) continue;
    if (e.bot) { const k = Math.min(1, dt * (AU.bot[e.k] && AU.bot[e.k].mode === 'ram' ? 30 : 10)); v.ent.x = lerp(v.ent.x, e.x, k); v.ent.z = lerp(v.ent.z, e.z, k); v.f = lerpAng(v.f, e.f, k); p.x = v.ent.x; p.z = v.ent.z; }
    else { v.ent.x = p.x; v.ent.z = p.z; }
    const prop = !e.boss && !e.c ? e.p : '';
    setProp(v, prop);
    // людина: ховаємо, коли замаскована
    if (mine) { if (hero) hero.root.visible = hero.root.visible && !prop; }
    else if (p.r) { p.r.h.root.visible = p.r.h.root.visible && !prop; if (prop) p.r.tag.style.display = 'none'; }
    if (v.hum) {
      v.hum.root.visible = !prop;
      if (!prop) {
        const down = e.boss && ST.stun > 0;   // бос лежить після тарана
        v.hum.root.position.set(p.x, down ? .25 : 0, p.z); v.hum.root.rotation.set(down ? -1.35 : 0, v.f, 0);
        const sw = e.mv ? Math.sin(t * 10 + p.x) * .6 : 0;
        v.hum.l1.rotation.x = sw; v.hum.l2.rotation.x = -sw; v.hum.aL.rotation.x = -sw * .7; v.hum.aR.rotation.x = -.35 - sw * .3;
        if (e.w) { v.hum.aL.rotation.x = v.hum.aR.rotation.x = -1.3 + Math.sin(t * 22) * .15; }
        v.hum.body.position.y = e.c ? -.3 : e.mv ? Math.abs(Math.sin(t * 10)) * .06 : 0;
        if (e.c) { v.hum.aL.rotation.x = v.hum.aR.rotation.x = -.2; v.hum.body.rotation.x = .25; } else v.hum.body.rotation.x = 0;
      }
    }
    if (v.prop) {
      const sh = V.shake[e.k] > t, wob = p.m ? 1 : 0, ram = e.bot ? AU.bot[e.k] && AU.bot[e.k].mode === 'ram' : mine && V.ram;
      v.prop.position.set(p.x, wob ? Math.abs(Math.sin(t * 13)) * .05 : 0, p.z);
      v.prop.rotation.set(sh ? Math.sin(t * 40) * .12 : 0, e.r + (sh ? Math.sin(t * 33) * .2 : 0) + (ram ? t * 14 : 0), wob ? Math.sin(t * 14) * .08 : sh ? Math.cos(t * 37) * .1 : 0);
      if (sh && Math.random() < dt * 8) burst(p.x, .8, p.z, '#FFD27A', 1, 1.5, .3, 1);
      if (ram && Math.random() < dt * 30) burst(p.x, .15, p.z, '#FFF3E6', 1, 1, .3, .6);
    }
    // продуктивність на нулі або 🚩 прогуляв збори: маскування блимає
    const blink = !!prop && (e.pr <= 0 || e.fl > 0);
    if (blink && !v.ring) { v.ring = new THREE.Group(); const rm = new THREE.Mesh(new THREE.TorusGeometry(.75, .08, 6, 24), new THREE.MeshBasicMaterial({ color: '#FF3355', transparent: true, opacity: .9, depthWrite: false })); rm.rotation.x = Math.PI / 2; v.ring.add(rm); put(v.ring, mesh(new THREE.SphereGeometry(.14, 8, 6), new THREE.MeshBasicMaterial({ color: '#FF3355' }), false), 0, 1.9, 0); put(v.ring, mesh(new THREE.BoxGeometry(.04, .7, .04), new THREE.MeshBasicMaterial({ color: '#FFFFFF' }), false), .3, 2.3, 0); v.ring.flag = put(v.ring, mesh(new THREE.BoxGeometry(.4, .25, .02), new THREE.MeshBasicMaterial({ color: '#FF3355' }), false), .5, 2.55, 0); scene.add(v.ring); }
    if (v.ring) { v.ring.visible = blink && Math.floor(t * 5) % 2 === 0; v.ring.position.set(p.x, .1, p.z); v.ring.flag.visible = e.fl > 0; }
  }
  for (const k of [...V.ents.keys()]) if (!seen.has(k)) dropView(k);
  // зірочки над босом, що лежить
  const b = ST.on && ST.stun > 0 && bossE(), bp = b && posC(b);
  if (bp && !V.stars) { V.stars = new THREE.Group(); for (let k = 0; k < 5; k++) put(V.stars, mesh(new THREE.OctahedronGeometry(.13, 0), new THREE.MeshBasicMaterial({ color: '#FFE066' }), false), Math.cos(k * 1.257) * .5, 0, Math.sin(k * 1.257) * .5); scene.add(V.stars); }
  if (V.stars) { V.stars.visible = !!bp; if (bp) { V.stars.position.set(bp.x, b.bot ? 1 : 2.3, bp.z); V.stars.rotation.y = t * 5; } }
  // фейкові звіти: трохи хитаються (підозріло!)
  const ds = new Set();
  for (const d of ST.on ? ST.dec : []) {
    ds.add(d.id);
    let m = V.decs.get(d.id); if (!m) { m = furnMesh(d.t); scene.add(m); V.decs.set(d.id, m); }
    const sh = V.shake['d' + d.id] > t;
    m.position.set(d.x, Math.abs(Math.sin(t * 6 + d.id)) * .03, d.z); m.rotation.set(0, d.r + (sh ? Math.sin(t * 33) * .2 : 0), Math.sin(t * 5 + d.id) * (sh ? .12 : .05));
  }
  for (const [id, m] of V.decs) if (!ds.has(id)) { scene.remove(m); V.decs.delete(id); }
  // двері кабінету: зачинені під час наради
  FL.forEach((F, i) => { const D = V.doors[i]; if (!D) return; const tx = F.door.x + (ST.on && ST.ph === 'meet' && ST.v === i ? 0 : 1.35); D.position.x = lerp(D.position.x, tx, Math.min(1, dt * 5)); });
}

/* ---------- Вікно лобі (core modeLobby): картки поверхів із картинками, голоси, хто готовий ---------- */
const solo = () => ST.lb.length <= 1;   // сам у лобі — граєш з ботами, роль обираєш сам
const roleTxt = () => V.pref === 'boss' ? '👔 <b>бос</b> проти ботів-офісників' : '🙈 <b>офісник</b> проти бота-боса';
const inLobby = () => running && !pl.dead && !ST.on && floorAt(pl.x, pl.z) >= 0;
function lobbyDef() {
  const k = myKey(), mine = ST.lb.find(r => r[0] === k), rdy = !!(mine && mine[1]), H = ST.lb.length, R = ST.lb.filter(r => r[1]).length;
  let info;
  if (solo()) info = `Граєш сам: ${roleTxt()} (змінити — вкладка 🙈 Хованки). Тисни «Я готовий» — і ліфт рушає!`;
  else if (ST.ct > 0) info = `🚀 Старт за <b>${Math.ceil(ST.ct)} с</b> · готові ${R}/${H}. Хто не відповість — поїде з усіма.`;
  else info = `Чекаємо, поки всі будуть готові (${R}/${H}). На старті жереб обере <b>👔 боса</b> серед вас, решта — 🙈 офісники.`;
  return {
    title: '🙈 Сховайся від боса · лобі', sub: `Обери поверх — клікни по картці. Більшість голосів — туди й поїдемо (нічия — жереб). Наступний: <b>${FL[ST.nv].ic} ${FL[ST.nv].n}</b>.`,
    maps: FL.map((F, i) => ({ n: `${F.ic} ${F.n}`, img: `addons/hideboss/map${i + 1}.jpg`, about: F.about + (F.night ? ' · 🌙 ніч' : '') })),
    votes: ST.vt, mine: mine ? mine[2] : -1, ready: rdy,
    players: ST.lb.map(r => ({ n: r[0] === 'me' ? 'Ти' : r[0], ready: !!r[1], vote: r[2] })), info,
    onVote: i => req('vote', { v: i }),
    onReady: () => { const m = ST.lb.find(r => r[0] === myKey()); req('ready', { on: !(m && m[1]), role: V.pref }); },
    onHide: () => { V.lobbyHide = true; lobbyUI(); toast('🗳️ Лобі сховано. Відкрити знову — <b>F</b> біля стійки «🗳️ ЛОБІ» або вкладка 🙈 Хованки → 🗳️ Лобі.'); },
  };
}
function lobbyUI() {
  if (typeof modeLobby !== 'function') return;
  const want = inLobby() && !V.lobbyHide && !panel && !document.getElementById('hb-intro');
  if (want) { modeLobby(lobbyDef()); V.lobbyOpen = true; }
  else if (V.lobbyOpen) { V.lobbyOpen = false; modeLobby(null); }   // закриваємо лише своє вікно
}
function openLobby() { V.lobbyHide = false; closePanel(); lobbyUI(); }

/* ---------- Кожен кадр ---------- */
function clientTick(dt) {
  render(dt);
  if (!running) { syncBar(); lobbyUI(); return; }
  const fv = floorAt(pl.x, pl.z);
  if (fv >= 0 && !pl.dead) {
    const F = FL[fv];
    pl.safe = { x: F.spawn.x, z: F.spawn.z };
    // бос на нараді й спіймані — у кабінеті
    if (onRound() && ((amBoss() && ST.ph === 'meet') || amCaught())) { const O = RF().off; pl.x = clamp(pl.x, O.x0, O.x1); pl.z = clamp(pl.z, O.z0, O.z1); }
    if (amBoss() && ST.stun > 0) { pl.lock = Math.max(pl.lock || 0, .05); pl.emote = 'sit'; pl.emoteT = .2; }
    updWork(dt); updRam(dt); bossMass(); updSmoke(dt);
    if (amHider() && myProp() && hero) hero.root.visible = false;
  }
  syncBar(); hud(); guide(); blindfold(); lobbyUI();
}
function updWork(dt) {
  if (!V.work) return;
  const w = V.work, e = me();
  if (!amHider() || !e) { V.work = null; return; }
  if (fdist(w.f, pl.x, pl.z) > 1.9) { V.work = null; req('work', { on: 0 }); toast('Відійшов від комп’ютера — робота не зарахована.'); return; }
  w.t += dt; pl.emote = 'sit'; pl.emoteT = .2;
  if (hero) hero.aR.rotation.x = hero.aL.rotation.x = -1.3 + Math.sin(gameTime * 22) * .15;
  if ((w.pt -= dt) <= 0) { w.pt = .5; ftext(pl.x, 2.4, pl.z, pick(['тиць-тиць ⌨️', 'Excel… 📊', 'відповів на лист ✉️', 'мітинг о 15:00 📅', 'алло, вам зручно говорити? 📞']), 'calm'); sfx('tick'); }
  if (w.t >= WORK_T) { V.work = null; req('work', { done: 1 }); }
}
function startWork(f) {
  if (V.work) return;
  V.work = { f, t: 0, pt: 0 }; req('work', { on: 1 }); sfx('page');
  toast('💻 Працюєш… стій поруч 3 с. Зараз тебе видно!');
}
/* 🛞 таран: розгін у бік курсора / погляду, перевіряємо, чи зачепили боса */
function startRamC() {
  const e = me(); if (!amHider() || !e) return;
  if (!e.p) { toast('🛞 Таран — лише в маскуванні: 🪑 крісло, 🚰 кулер або 🛒 візок на коліщатках.'); return; }
  if (!canRoll(e.p)) { toast(`${FT[e.p].ic} ${FT[e.p].n} не їздить! Таран — лише для 🪑 крісла, 🚰 кулера чи 🛒 візка.`); return; }
  if (ST.ph !== 'hunt') { toast('🛞 Бос ще на нараді — нема кого таранити.'); return; }
  if (e.rc > 0 || V.ram) { toast(`🛞 Коліщатка ще гарячі: ${Math.ceil(e.rc)} с`); return; }
  const a = input.aimOk && dist2(input.ax, input.az, pl.x, pl.z) > .5 ? angTo(pl.x, pl.z, input.ax, input.az) : pl.face;
  pl.face = a; V.ram = { a, t: RAM_T, hit: false };
  req('ram', { a: r2(a) }); e.rc = RAM_CD;   // перезарядку — після запиту (наодинці startRam сам перевіряє e.rc)
}
function updRam(dt) {
  if (!V.ram) return;
  const R = V.ram;
  if (!amHider()) { V.ram = null; return; }
  const st = RAM_SPD * dt * (.5 + R.t / RAM_T * .8), n = Math.max(1, Math.ceil(st / .2));
  for (let i = 0; i < n; i++) { pl.x += Math.sin(R.a) * st / n; pl.z += Math.cos(R.a) * st / n; pushOutStatics(pl, .4); }
  pl.face = R.a;
  const b = bossE(), bp = b && posC(b);
  if (!R.hit && bp && ST.stun <= 0 && dist2(pl.x, pl.z, bp.x, bp.z) < 1.3) { R.hit = true; req('ramhit'); }
  if ((R.t -= dt) <= 0) V.ram = null;
}
/* бос — фізичне тіло: крізь замасковані предмети не пройде, а врізавшись — «бздинь» */
function bossMass() {
  if (!amBoss() || ST.ph !== 'hunt' || !onRound()) return;
  for (const q of alive()) {
    if (!q.p) continue;
    const p = posC(q); if (!p) continue;
    const min = propR(q.p) + .4, dx = pl.x - p.x, dz = pl.z - p.z, d = Math.hypot(dx, dz);
    if (d < min && d > 1e-4) {
      pl.x = p.x + dx / d * min; pl.z = p.z + dz / d * min;
      if (pl.moving && gameTime - (V.bumpT[q.k] || -9) > 1) { V.bumpT[q.k] = gameTime; req('bump', { who: q.k }); }
    }
  }
}
/* 🚬 перекур: ривок без маскування */
function smokeBreak() {
  const e = me(); if (!amHider() || !e) return;
  if (V.smokeCd > gameTime) { toast(`🚬 Перекур щойно був. Ще ${Math.ceil(V.smokeCd - gameTime)} с.`); return; }
  if (V.work) return;
  if (e.p) req('dis', { i: -1 });
  V.smokeCd = gameTime + SMOKE_CD; V.smokeT = gameTime + 4; pl.buffs.speed = Math.max(pl.buffs.speed, 4);
  ftext(pl.x, 2.4, pl.z, '🚬 Я на перекур!', 'gold'); sfx('dash');
}
function updSmoke() { if (V.smokeT > gameTime && Math.random() < .5) burst(pl.x, 1.4, pl.z, '#D9D2E8', 1, .6, .6, .4); }
/* панель режиму (замість напоїв і зброї): у боса — свої інструменти, в офісника — свої */
const BAR = {
  hider: { slots: [
    { id: 'mask', ic: '🎭', n: 'Маска', use: () => maskToggle() },
    { id: 'decoy', ic: '📄', n: 'Звіт', count: () => (me() && !me().dc ? 1 : 0), use: () => placeDecoy() },
    { id: 'ram', ic: '🛞', n: 'Таран', count: () => { const e = me(); return !e || !canRoll(e.p) ? 0 : e.rc > 0 ? Math.ceil(e.rc) : null; }, use: () => startRamC() },
    { id: 'smoke', ic: '🚬', n: 'Перекур', count: () => (V.smokeCd > gameTime ? Math.ceil(V.smokeCd - gameTime) : null), use: () => smokeBreak() },
  ] },
  boss: { slots: [
    { id: 'catch', ic: '👉', n: 'Попався', use: () => bossClick() },
    { id: 'check', ic: '🔍', n: 'Перевірка', count: () => (ST.cd > 0 ? Math.ceil(ST.cd) : null), use: () => bossCheck() },
    { id: 'bell', ic: '🔔', n: 'Збори', count: () => (ST.bu ? 0 : 1), use: () => bossBell() },
  ] },
};
function syncBar() {
  const e = me(), k = !running || pl.dead || !ST.on || !e || !onRound() || e.c ? '' : e.boss ? 'boss' : 'hider';
  if (k === V.bar) return;
  V.bar = k; if (typeof modeBar === 'function') modeBar(k ? BAR[k] : null);
}
function maskToggle() {
  const e = me(); if (!amHider() || !e || V.work) return;
  const f = nearFurn(q => FT[q.t].dis && q.t !== e.p, 1.3);
  if (f) req('dis', { i: f.i });
  else if (e.p) req('dis', { i: -1 });
  else toast('🎭 Підійди ближче до меблів: 🪑 крісло, 🪴 фікус, 🚰 кулер, 📦 коробка…');
}
/* велика картка ролі на старті раунду: «Ти — БОС!» / «Ти — офісник» (4 с, клік — сховати) */
function roleCard(boss, F, bn) {
  if (typeof document === 'undefined') return;
  let el = document.getElementById('hb-role');
  if (!el) { el = document.createElement('div'); el.id = 'hb-role'; el.onclick = () => { el.style.display = 'none'; }; document.body.appendChild(el); }
  el.dataset.role = boss ? 'boss' : 'hider';
  el.style.cssText = `position:fixed;left:50%;top:38%;transform:translate(-50%,-50%);z-index:30;display:block;cursor:pointer;text-align:center;padding:18px 28px;border-radius:20px;color:#fff;font:900 34px/1.25 system-ui,sans-serif;box-shadow:0 14px 44px rgba(0,0,0,.45);border:3px solid ${boss ? '#FF5C7A' : '#7FE08A'};background:${boss ? 'rgba(120,20,50,.94)' : 'rgba(24,70,60,.94)'};max-width:92vw`;
  el.innerHTML = boss
    ? `👔 Ти — БОС!<div style="font:700 15px/1.45 system-ui,sans-serif;margin-top:6px">${escapeHTML(F.n)} · спершу нарада 20 с (нічого не бачиш),<br>потім шукай офісників, що прикинулись меблями. ЛКМ — «Попався!»</div>`
    : `🙈 Ти — офісник<div style="font:700 15px/1.45 system-ui,sans-serif;margin-top:6px">${escapeHTML(F.n)} · бос — <b>${escapeHTML(bn || '')}</b>.<br>20 с наради — біжи й маскуйся під меблі (F)!</div>`;
  clearTimeout(V.roleT); V.roleT = setTimeout(() => { el.style.display = 'none'; }, 4000);
}
/* засліплення боса під час наради */
function blindfold() {
  if (!V.blind) { V.blind = document.createElement('div'); V.blind.id = 'hb-blind'; V.blind.style.cssText = 'position:fixed;inset:0;z-index:1;pointer-events:none;display:none;flex-direction:column;align-items:center;justify-content:center;background:rgba(14,10,30,.94);color:#fff;font:800 22px/1.5 system-ui,sans-serif;text-align:center;padding:16px'; document.body.appendChild(V.blind); }
  const on = running && amBoss() && ST.ph === 'meet' && onRound() && !panel;
  V.blind.style.display = on ? 'flex' : 'none';
  if (on) { const h = `👔 Ти — БОС! 🙈 НАРАДА<br><span style="font-size:15px;font-weight:600">«…і тому KPI мають рости». Ти нічого не бачиш ще <b>${Math.ceil(left())} с</b>.<br>Офісники ховаються серед меблів на поверсі «${RF().n}».</span>`; if (V.blind.innerHTML !== h) V.blind.innerHTML = h; }
}

/* ---------- Бос: «Попався!», «Перевірка», «Збори» ---------- */
function bossTarget() {
  const fx = pl.x + Math.sin(pl.face) * 1.1, fz = pl.z + Math.cos(pl.face) * 1.1;
  const ax = input.aimOk && dist2(input.ax, input.az, pl.x, pl.z) < 4 ? input.ax : fx, az = input.aimOk && dist2(input.ax, input.az, pl.x, pl.z) < 4 ? input.az : fz;
  let best = null, bd = 1e9;
  const consider = (o, reach, aimD) => { if (reach > 1.7) return; const s = aimD; if (s < bd) { bd = s; best = o; } };
  for (const e of alive()) { if (e.k === myKey()) continue; const p = posC(e); if (p) consider({ who: e.k, x: p.x, z: p.z }, dist2(p.x, p.z, pl.x, pl.z) - .4, dist2(p.x, p.z, ax, az) - .25); }
  for (const d of ST.dec) consider({ d: d.id, x: d.x, z: d.z }, dist2(d.x, d.z, pl.x, pl.z) - .4, dist2(d.x, d.z, ax, az));
  for (const f of RF().furn) { const r = fdist(f, pl.x, pl.z); if (r < 1.7) consider({ f: f.i, x: f.x, z: f.z }, r, fdist(f, ax, az) + .1); }
  return best;
}
function bossClick() {
  if (!amBoss() || ST.ph !== 'hunt') { if (amBoss()) toast('🙈 Ти ще на нараді…'); return; }
  if (ST.stun > 0) { toast('💫 Ти ще бачиш зірочки… Встань спершу!'); return; }
  const tg = bossTarget();
  pl.swingT = .22; pl.swingKind = 0; pl.atkCd = .45;
  if (!tg) { ftext(pl.x, 2.4, pl.z, 'Тут нікого…', 'calm'); return; }
  pl.face = Math.atan2(tg.x - pl.x, tg.z - pl.z);
  ftext(tg.x, 2.1, tg.z, '👉 Попався?!', 'crit'); sfx('whoosh', tg.x, tg.z);
  req('catch', tg.who != null ? { who: tg.who } : tg.d != null ? { d: tg.d } : { f: tg.f });
}
function bossCheck() {
  if (!amBoss() || ST.ph !== 'hunt') return;
  if (ST.stun > 0) { toast('💫 Спершу встань з підлоги…'); return; }
  if (ST.cd > 0) { toast(`🔎 Перевірка перезаряджається: ${Math.ceil(ST.cd)} с`); return; }
  req('check'); bubble(pl, 'ПЕРЕВІРКА! Хто тут не працює?!', true, 2);
}
function bossBell() {
  if (!amBoss() || ST.ph !== 'hunt') return;
  if (ST.bu) { toast('🔔 Загальні збори вже були в цьому раунді.'); return; }
  if (ST.stun > 0) { toast('💫 Спершу встань з підлоги…'); return; }
  req('bell'); bubble(pl, `🔔 ЗАГАЛЬНІ ЗБОРИ! Усі в «${roomName(RF().meet)}»!`, true, 2.5);
}
const _attack = attack;
attack = function () {
  if (!SIMSIDE && running && amIn() && onRound()) { if (amBoss() && pl.atkCd <= 0 && !panel && !paused) bossClick(); return; }
  return _attack.apply(this, arguments);
};
const _useDrink = useDrink;
useDrink = function () {
  if (!SIMSIDE && running && amIn() && onRound()) { if (amBoss()) bossCheck(); return; }
  return _useDrink.apply(this, arguments);
};
/* Q може забрати інший аддон (раніше чи пізніше за нас) — ланцюжком передаємо йому, коли не в раунді */
let _prevQ = ADDONS.keys.KeyQ;
const qKey = () => {
  if (running && amIn() && onRound()) { if (amBoss()) bossCheck(); return; }
  if (_prevQ) return withAddon(_prevQ[0], () => addonRun(_prevQ[0], _prevQ[1]));
  return false;
};
A.key('KeyQ', qKey);
A.on('start', () => { const k = ADDONS.keys.KeyQ; if (k && k[1] !== qKey) { _prevQ = k; ADDONS.keys.KeyQ = [ADDONS.keys.KeyR[0], qKey]; } });
A.key('KeyR', () => { if (!running || !amHider() || !onRound()) return false; placeDecoy(); });
function placeDecoy() {
  const e = me(); if (!e || !amHider()) return;
  if (e.dc) { toast('📄 Фейковий звіт уже використано в цьому раунді.'); return; }
  req('decoy');
}
/* у маскуванні — повільно, без ривків і стрибків; у тарані — керує розгін */
const _updInput = updInput;
updInput = function () { _updInput.apply(this, arguments); if (!SIMSIDE && myProp()) { input.mx *= .35; input.mz *= .35; } if (!SIMSIDE && (V.work || V.ram)) { input.mx = input.mz = 0; } };
const _dash = dash;
dash = function () { if (!SIMSIDE && myProp()) return; return _dash.apply(this, arguments); };
const _jumpPress = jumpPress;
jumpPress = function () { if (!SIMSIDE && myProp()) return; return _jumpPress.apply(this, arguments); };

/* ---------- F ---------- */
function nearFurn(filter, r) { let best = null, bd = r; const F = FL[floorAt(pl.x, pl.z)]; for (const f of F ? F.furn : []) { if (filter && !filter(f)) continue; const d = fdist(f, pl.x, pl.z); if (d < bd) { bd = d; best = f; } } return best; }
const _getInteract = getInteract;
getInteract = function () {
  const fv = SIMSIDE ? -1 : floorAt(pl.x, pl.z);
  if (!SIMSIDE && running && !pl.dead && fv >= 0 && !pl.carry && !pl.ride) {
    const F = FL[fv], near = (o, r) => dist2(pl.x, pl.z, o.x, o.z) < r;
    if (amIn() && onRound()) {
      const e = me();
      if (e.boss) {
        if (ST.ph === 'meet') return { l: `🙈 Нарада… ще ${Math.ceil(left())} с`, fn: () => { } };
        const tg = bossTarget(); if (tg) return { l: '👉 «Попався!» — перевірити цей предмет (ЛКМ)', fn: () => bossClick() };
        return null;
      }
      if (e.c) return { l: '😵 Ти на килимі в боса — чекай кінця раунду', fn: () => { } };
      if (V.work) return { l: `💻 Працюю… ${Math.round(V.work.t / WORK_T * 100)}%`, fn: () => { } };
      const dk = nearFurn(f => f.t === 'desk', 1.15), f = nearFurn(f => FT[f.t].dis && f.t !== e.p, 1.1);
      if (dk && (!f || fdist(dk, pl.x, pl.z) < .9 || fdist(dk, pl.x, pl.z) < fdist(f, pl.x, pl.z))) return { l: `💻 Попрацювати за комп’ютером (3 с, тебе видно) · продуктивність ${Math.round(e.pr)}%`, fn: () => startWork(dk) };
      if (f) return { l: `🎭 Замаскуватись: ${FT[f.t].ic} ${FT[f.t].n}${FT[f.t].roll ? ' (🛞 можна таранити!)' : ''}`, fn: () => req('dis', { i: f.i }) };
      if (e.p) return { l: `🎭 Зняти маскування (${FT[e.p].ic} ${FT[e.p].n})`, fn: () => req('dis', { i: -1 }) };
      return null;
    }
    if (!ST.on && near(F.board, 1.9)) return { l: '🗳️ Відкрити лобі: голос за поверх і «Я готовий»', fn: () => { openLobby(); sfx('ui'); } };
    if (ST.on && near(F.board, 1.9)) return { l: `⏳ Раунд іде на «${RF().n}» (${mmss(left())}) — чекай наступного`, fn: () => { } };
  }
  return _getInteract.apply(this, arguments);
};

/* ---------- Підказки: підписи місць, «що робити зараз» і стрілка до цілі ---------- */
const PLACES = [];
FL.forEach((F, v) => {
  PLACES.push({ id: 'start:' + v, v, p: F.board, y: 2.3, t: () => '🗳️ ЛОБІ (F)', on: () => !ST.on && V.lobbyHide });
  for (const r of F.rooms) if (r.id !== 'hall' || v === 1) PLACES.push({ id: 'room:' + v + ':' + r.id, v, p: { x: F.x + (r.x0 + r.x1) / 2, z: F.z + (r.z0 + r.z1) / 2 }, y: 2.4, room: 1, rect: [F.x + Math.min(r.x0, r.x1), F.z + Math.min(r.z0, r.z1), F.x + Math.max(r.x0, r.x1), F.z + Math.max(r.z0, r.z1)], t: () => r.n });
});
function nearestF(filter) { let b = null, bd = 1e9; const F = FL[floorAt(pl.x, pl.z)]; for (const f of F ? F.furn : []) if (filter(f)) { const d = dist2(pl.x, pl.z, f.x, f.z); if (d < bd) { bd = d; b = f; } } return b; }
function goal() {
  const fv = floorAt(pl.x, pl.z), F = FL[fv] || FL[0], N = FL[ST.nv];
  if (!ST.on) {
    if (V.lobbyHide) return { id: 'start:' + fv, tg: F.board, txt: `Лобі сховане. <b>F</b> біля стійки <b>🗳️ ЛОБІ</b> (або вкладка 🙈 Хованки → 🗳️ Лобі) — голос за поверх і ✅ «Я готовий». Наступний: <b>${N.ic} ${N.n}</b>.` };
    return { id: 'lobby', txt: `Обери поверх у вікні лобі й натисни <b>✅ Я готовий</b>. ${solo() ? `Сам граєш ${roleTxt()}.` : 'Старт — коли готові всі.'}` };
  }
  const e = me();
  if (!e || !onRound()) return { txt: `Раунд іде на «${RF().n}» (${mmss(left())}) — ти глядач. Дочекайся наступного — відкриється лобі.` };
  const R = RF();
  if (e.boss) {
    if (ST.ph === 'meet') return { txt: `🙈 Нарада ще ${Math.ceil(left())} с. Потім — шукай офісників серед меблів!` };
    if (ST.stun > 0) return { txt: `💫 Тебе збили з ніг! Встанеш за ${ST.stun.toFixed(1)} с.` };
    if (ST.bell > 0) return { id: 'meet', tg: { x: R.x + (R.meet.x0 + R.meet.x1) / 2, z: R.z + (R.meet.z0 + R.meet.z1) / 2 }, txt: `🔔 Збори! Ще ${Math.ceil(ST.bell)} с — хто не в «${roomName(R.meet)}», отримає 🚩.` };
    return { txt: `🔎 <b>ЛКМ / F / 1</b> — «Попався!». <b>2 / Q</b> — Перевірка${ST.cd > 0 ? ` (${Math.ceil(ST.cd)} с)` : ''}. <b>3</b> — 🔔 Збори${ST.bu ? ' (були)' : ''}. Промах — <b>−${PENALTY} с</b>! Обережно: крісла й кулери можуть таранити. Лишилось: ${alive().length}` };
  }
  if (e.c) return { txt: '😵 Ти попався. Стоїш на килимі в боса — дивись, як ховаються інші.' };
  if (V.work) return { txt: `💻 Працюю ${Math.round(V.work.t / WORK_T * 100)}% — стій біля комп’ютера! Тебе видно.` };
  if (ST.bell > 0 && !inRoomR(R, R.meet, pl.x, pl.z, .1)) return { id: 'meet', tg: { x: R.x + (R.meet.x0 + R.meet.x1) / 2, z: R.z + (R.meet.z0 + R.meet.z1) / 2 }, txt: `🔔 <b>ЗАГАЛЬНІ ЗБОРИ!</b> Біжи в «${roomName(R.meet)}» — ще <b>${Math.ceil(ST.bell)} с</b>, інакше 🚩! (<b>4</b> — 🚬 перекур-ривок)` };
  if (ST.stun > 0 && e.pr < 70) { const d = nearestF(f => f.t === 'desk' && !inOffice(f.x, f.z)); if (d) return { id: 'desk', tg: workSpot(d), txt: `💫 Бос лежить ще ${ST.stun.toFixed(1)} с — біжи працювати за 💻!` }; }
  if (e.pr < 30 && ST.ph === 'hunt') { const d = nearestF(f => f.t === 'desk' && !inOffice(f.x, f.z)); if (d) return { id: 'desk', tg: workSpot(d), txt: `📉 Продуктивність ${Math.round(e.pr)}%! Біжи до <b>💻 комп’ютера</b> (${roomAt(d.x, d.z).n}) і натисни F (3 с). ${e.pr <= 0 ? '<b style="color:#C2335A">Маскування блимає!</b>' : ''}` }; }
  if (!e.p) { const f = nearestF(f => FT[f.t].dis && !inOffice(f.x, f.z)); return { id: 'hide', tg: f, txt: `${ST.ph === 'meet' ? `Бос на нараді ще <b>${Math.ceil(left())} с</b>! ` : ''}${f ? `Найближче — ${FT[f.t].ic} у кімнаті «${roomAt(f.x, f.z).n}». ` : ''}Підійди до меблів і натисни <b>F</b> (або <b>1</b>) — замаскуйся. 🪑 Крісло й 🚰 кулер ще й таранять!` }; }
  return { txt: `Ти — ${FT[e.p].ic} <b>${FT[e.p].n.toLowerCase()}</b>. Не рухайся — рух видно!${e.fl > 0 ? ' <b style="color:#C2335A">🚩 Над тобою прапорець!</b>' : ''} ${canRoll(e.p) ? `<b>3</b> — 🛞 таран${e.rc > 0 ? ` (${Math.ceil(e.rc)} с)` : ''}. ` : ''}${e.dc ? '' : '<b>2 / R</b> — фейковий звіт. '}Продуктивність ${Math.round(e.pr)}%.` };
}
function guide() {
  if (!V.lbl) {
    V.lbl = document.createElement('div'); V.lbl.style.cssText = 'position:fixed;inset:0;z-index:2;pointer-events:none';
    const css = document.createElement('style');
    css.textContent = `.hb-lbl{position:absolute;left:0;top:0;padding:3px 9px;border-radius:10px;background:rgba(46,35,70,.78);color:#fff;font:700 12px/1.3 system-ui,sans-serif;white-space:nowrap;transform:translate(-50%,-100%);transition:opacity .2s}
      .hb-lbl.goal{background:#FFE066;color:#2E2346;font-size:14px;box-shadow:0 0 0 3px rgba(255,224,102,.35),0 6px 16px rgba(0,0,0,.3);animation:hbB .8s ease-in-out infinite alternate}
      .hb-lbl.boss{background:#C2335A}
      .hb-lbl.room{background:rgba(255,255,255,.8);color:#4E3A7C;font-size:11px;padding:2px 8px}
      @keyframes hbB{to{margin-top:-6px}}`;
    document.head.appendChild(css); document.body.appendChild(V.lbl);
    for (const P of PLACES) { P.el = document.createElement('div'); P.el.className = 'hb-lbl' + (P.room ? ' room' : ''); V.lbl.appendChild(P.el); }
    V.glbl = document.createElement('div'); V.glbl.className = 'hb-lbl goal'; V.lbl.appendChild(V.glbl);
    V.gArrow = new THREE.Group(); const sh = mesh(new THREE.ConeGeometry(.28, .7, 3), bulb('#FFE066'), false); sh.rotation.z = -Math.PI / 2; sh.position.x = 1.25; V.gArrow.add(sh); scene.add(V.gArrow);
    V.gMark = new THREE.Mesh(new THREE.TorusGeometry(.6, .07, 6, 24), new THREE.MeshBasicMaterial({ color: '#FFE066', transparent: true, opacity: .9, depthWrite: false })); V.gMark.rotation.x = Math.PI / 2; scene.add(V.gMark);
  }
  const fv = floorAt(pl.x, pl.z);
  const show = running && !pl.dead && !panel && fv >= 0 && !(amBoss() && ST.ph === 'meet' && onRound());
  V.lbl.style.display = show ? '' : 'none';
  const g = show ? goal() : { txt: '' }; V.goal = g;
  V.gArrow.visible = V.gMark.visible = !!(show && g.tg);
  if (!show) { for (const [, el] of V.blbl) el.style.display = 'none'; return; }
  const pos = (el, x, y, z) => { const q = screenPos(x, y, z); el.style.display = q.vis ? '' : 'none'; el.style.transform = `translate(${Math.round(q.x)}px,${Math.round(q.y)}px) translate(-50%,-100%)`; };
  for (const P of PLACES) {
    const inRoom = P.rect && pl.x > P.rect[0] && pl.x < P.rect[2] && pl.z > P.rect[1] && pl.z < P.rect[3];   // назва кімнати, в якій ти стоїш, ховається
    const on = P.v === fv && (!P.on || P.on()) && P.id !== g.id && !inRoom;
    P.el.style.opacity = on ? (P.room ? .85 : dist2(pl.x, pl.z, P.p.x, P.p.z) < 8 ? 1 : .6) : 0;
    if (on) { const t = P.t(); if (P.el.textContent !== t) P.el.textContent = t; pos(P.el, P.p.x, P.y, P.p.z); } else P.el.style.display = 'none';
  }
  // підписи ботів і боса (замаскованих — не видно)
  const want = new Set();
  for (const e of ST.on && fv === ST.v ? ST.ro : []) {
    if (e.k === myKey() || (!e.bot && !e.boss) || (e.p && !e.boss && !e.c)) continue;
    const p = posC(e); if (!p) continue;
    want.add(e.k);
    let el = V.blbl.get(e.k); if (!el) { el = document.createElement('div'); el.className = 'hb-lbl' + (e.boss ? ' boss' : ''); V.lbl.appendChild(el); V.blbl.set(e.k, el); }
    const t = e.boss ? `👔 ${e.bot ? e.n : 'БОС'}${ST.stun > 0 ? ' 💫' : ''}` : e.c ? `😵 ${e.n}` : e.w ? `💻 ${e.n}` : e.n;
    if (el.textContent !== t) el.textContent = t; pos(el, p.x, e.boss ? 2.9 : 2.5, p.z);
  }
  for (const [k, el] of V.blbl) if (!want.has(k)) { el.remove(); V.blbl.delete(k); }
  V.glbl.style.opacity = g.tg ? 1 : 0;
  if (g.tg) {
    const P = PLACES.find(q => q.id === g.id), t = '👉 ' + (P ? P.t() : g.id === 'desk' ? '💻 Попрацюй тут (F)' : g.id === 'meet' ? `🔔 ${RF().meet.n}` : g.id === 'hide' ? `${FT[g.tg.t] ? FT[g.tg.t].ic : ''} Сховайся тут (F)` : 'Сюди');
    if (V.glbl.textContent !== t) V.glbl.textContent = t; pos(V.glbl, g.tg.x, 2.6, g.tg.z);
    const d = dist2(pl.x, pl.z, g.tg.x, g.tg.z);
    V.gMark.position.set(g.tg.x, .1, g.tg.z); V.gMark.scale.setScalar(1 + Math.sin(gameTime * 5) * .12);
    V.gArrow.visible = d > 2.2; V.gArrow.position.set(pl.x, .15, pl.z); V.gArrow.rotation.y = -Math.atan2(g.tg.z - pl.z, g.tg.x - pl.x);
  }
}
/* коротка інструкція при першому вході */
function intro(force) {
  const d = A.data(); if ((d.intro2 && !force) || SIMSIDE || document.getElementById('hb-intro')) return;
  const el = document.createElement('div'); el.id = 'hb-intro';
  el.style.cssText = 'position:fixed;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;background:rgba(20,12,40,.55);padding:16px';
  el.innerHTML = `<div style="max-width:480px;width:100%;max-height:90vh;overflow:auto;background:#2E2346;color:#fff;border-radius:18px;padding:18px 20px;font:14px/1.5 system-ui,sans-serif;box-shadow:0 12px 40px rgba(0,0,0,.4)">
    <div style="font:800 20px system-ui;margin-bottom:8px">🙈 Сховайся від боса — як грати</div>
    <div>1. 🏢 Три поверхи хмарочоса: ${FL.map(F => `${F.ic} <b>${F.n.split(' · ')[1]}</b>`).join(', ')}. У вікні <b>лобі</b> клікни по картці поверху — голос, потім <b>✅ Я готовий</b>. 🎲 Онлайн на старті жереб робить одного з гравців <b>👔 босом</b>, решта — 🙈 офісники. Сам — проти ботів (роль: вкладка 🙈 Хованки).</div>
    <div>2. 🙈 <b>Офісник</b>: F (або 1) біля меблів — маскуєшся. Рух у маскуванні повільний і хитає предмет — бос помітить!</div>
    <div>3. 📉 <b>Продуктивність</b> тане — F біля 💻 комп’ютера 3 с (тебе видно). 📄 <b>2 / R</b> — фейковий звіт. 🚬 <b>4</b> — перекур-ривок.</div>
    <div>4. 🛞 <b>ТАРАН</b>: у маскуванні 🪑 крісла, 🚰 кулера чи 🛒 візка натисни <b>3</b> — розженись у бік курсора й збий боса з ніг (2 с не ловить). Але якщо бос сам врізався в тебе — ти «бздинькаєш» і видаєш себе!</div>
    <div>5. 👔 <b>Бос</b>: 20 с наради, потім 3 хв. <b>ЛКМ / 1</b> — «Попався!» (промах −5 с). <b>2 / Q</b> — 🔍 Перевірка. <b>3</b> — 🔔 Загальні збори: хто за 15 с не прийде в залу нарад — отримає 🚩.</div>
    <div>6. Спійманий іде на килим у кабінет боса. Усіх спіймано — виграв бос; час вийшов — виграли ті, хто вцілів.</div>
    <div style="margin-top:8px;color:#FFE066">Жовта стрілка й мітка показують, куди йти зараз. Підказка — внизу екрана 👇</div>
    <button class="btn" style="margin-top:12px;width:100%">Зрозуміло, ховаюсь!</button></div>`;
  document.body.appendChild(el);
  el.querySelector('button').addEventListener('click', () => { el.remove(); d.intro = 1; d.intro2 = 1; save(); });
}

/* ---------- HUD: поверх, роль, таймер, хто лишився, продуктивність ---------- */
function hud() {
  if (!V.hud) {
    V.goalEl = document.createElement('div'); V.goalEl.id = 'hideboss-goal';
    V.goalEl.style.cssText = 'position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 150px);transform:translateX(-50%);z-index:2;pointer-events:none;background:#FFE066;color:#2E2346;border-radius:12px;padding:7px 14px;font:700 14px/1.4 system-ui,sans-serif;text-align:center;box-shadow:0 6px 18px rgba(0,0,0,.25);width:max-content;max-width:min(560px,90vw)';
    document.body.appendChild(V.goalEl);
    V.hud = document.createElement('div'); V.hud.id = 'hideboss-hud';
    V.hud.style.cssText = 'position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 64px);transform:translateX(-50%);z-index:3;pointer-events:none;background:rgba(46,35,70,.88);color:#fff;border-radius:14px;padding:7px 14px;font:700 13px/1.4 system-ui,sans-serif;text-align:center;box-shadow:0 6px 18px rgba(0,0,0,.25);max-width:94vw';
    document.body.appendChild(V.hud);
  }
  const fv = floorAt(pl.x, pl.z), show = running && !pl.dead && !panel && fv >= 0;
  V.hud.style.display = show ? '' : 'none'; V.goalEl.style.visibility = show ? '' : 'hidden';
  if (!show) return;
  let h;
  if (ST.on && fv === ST.v) {
    const e = me(), all = hiders().length, al = alive().length, lt = left();
    const role = !e ? '👀 глядач' : e.boss ? '👔 БОС' : e.c ? '😵 спійманий' : '🙈 офісник';
    const tm = ST.ph === 'meet' ? `🙈 нарада ${Math.ceil(lt)} с` : `⏱ <span style="color:${lt < 30 ? '#FF8A7A' : '#fff'}">${mmss(lt)}</span>`;
    let sub = '';
    if (e && !e.boss && !e.c) {
      const pr = Math.round(e.pr), col = pr > 50 ? '#7FE08A' : pr > 25 ? '#FFD27A' : '#FF5C7A';
      sub = `Продуктивність <span style="color:${col}">${'■'.repeat(Math.ceil(pr / 10))}</span><span style="opacity:.3">${'■'.repeat(10 - Math.ceil(pr / 10))}</span> ${pr}%${e.p ? ` · ${FT[e.p].ic} ${FT[e.p].n}${canRoll(e.p) ? (e.rc > 0 ? ` · 🛞 ${Math.ceil(e.rc)} с` : ' · 🛞 таран готовий') : ''}` : ' · <span style="color:#FF8A7A">не замаскований</span>'}${e.fl > 0 ? ' · <span style="color:#FF8A7A">🚩 прогульник</span>' : ''}${V.work ? ` · 💻 ${Math.round(V.work.t / WORK_T * 100)}%` : ''}`;
    } else if (e && e.boss) sub = ST.ph === 'meet' ? 'чекаєш, поки всі сховаються…' : ST.stun > 0 ? '<span style="color:#FFE066">💫 лежиш на підлозі…</span>' : `🔍 ${ST.cd > 0 ? `<span style="color:#FFD27A">${Math.ceil(ST.cd)} с</span>` : '<span style="color:#7FE08A">готова</span>'} · 🔔 ${ST.bu ? 'були' : '<span style="color:#7FE08A">готові</span>'} · промах −${PENALTY} с`;
    if (ST.bell > 0) sub += `${sub ? '<br>' : ''}<span style="color:#FFE066">🔔 ЗАГАЛЬНІ ЗБОРИ — ще ${Math.ceil(ST.bell)} с!</span>`;
    const b = bossE();
    h = `🏢 ${RF().n} · раунд ${ST.rn} · ${role} · ${tm} · 👥 вціліли ${al}/${all}${b && (!e || !e.boss) ? ` · 👔 ${escapeHTML(b.n)}${ST.stun > 0 ? ' 💫' : ''}` : ''}${sub ? `<br><span style="font-weight:600;font-size:12px">${sub}</span>` : ''}`;
  } else {
    const sc = Object.entries(ST.sc).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n, p]) => `${escapeHTML(n === 'me' ? 'Ти' : n)} ${p}`).join(' · ');
    h = `🙈 Сховайся від боса · ${FL[fv].ic} ${FL[fv].n}<br><span style="font-weight:600;font-size:12px">${ST.on ? `⏳ раунд іде на «${RF().n}»` : `наступний поверх: <b>${FL[ST.nv].ic} ${FL[ST.nv].n}</b> · 🗳️ ${FL.map((F, i) => `${F.n.match(/\d+/)[0]}: ${ST.vt[i] || 0}`).join(' · ')} · ✅ ${ST.lb.filter(r => r[1]).length}/${ST.lb.length}${ST.ct > 0 ? ` · 🚀 ${Math.ceil(ST.ct)} с` : ''}`}${sc ? ` · 🏆 ${sc}` : ''}</span>`;
  }
  const gt = V.goal && V.goal.txt ? `👉 ${V.goal.txt}` : ''; V.goalEl.style.display = gt ? '' : 'none'; if (V.goalEl.innerHTML !== gt) V.goalEl.innerHTML = gt;
  if (V.hud.innerHTML !== h) V.hud.innerHTML = h;
}

/* ---------- Музика: крадькома піцикато, тривожно, коли бос поруч ---------- */
const HPROG = [[40, [64, 67, 71]], [40, [64, 67, 70]], [45, [64, 69, 72]], [47, [63, 66, 71]]];   // Em · Em(b6) · Am · B
const SNEAK = [52, 0, 55, 56, 0, 59, 0, 58, 0, 57, 55, 0, 52, 0, 51, 0];
function bossNear() { const b = bossE(), e = me(); if (!b || !e || e.boss) return false; const p = posC(b); return !!p && dist2(p.x, p.z, pl.x, pl.z) < 7; }
if (!SIMSIDE && typeof scheduleStep === 'function') {
  const _ss = scheduleStep;
  scheduleStep = function (i, t) {
    if (!running || pl.dead || !inIsl(pl.x, pl.z) || typeof LAYER === 'undefined' || !LAYER.drums) { if (V.music >= 0) { V.music = -1; barMode = ''; } return _ss.apply(this, arguments); }
    const s = i % 16, bar = Math.floor(i / 16), h = STEP / 2;
    const lvl = !ST.on || !onRound() ? 0 : (bossNear() || ST.bell > 0 || (ST.ph === 'hunt' && left() < 30)) ? 2 : 1;
    if (s === 0 && V.music !== lvl) { V.music = lvl; const m = [{ keys: .8, bass: .5, drums: .3, tension: 0, lead: .15, crackle: .1 }, { keys: .85, bass: .8, drums: .55, tension: .15, lead: .3, crackle: 0 }, { keys: .7, bass: 1, drums: .9, tension: .75, lead: .35, crackle: 0 }][lvl]; for (const k in m) if (LAYER[k]) LAYER[k].gain.setTargetAtTime(m[k], t, .4); }
    const [root, ch] = HPROG[bar % 4];
    // піцикато: короткі щипки, крадькома
    const n = SNEAK[s]; if (n && (lvl || s % 4 === 0)) pluck(t, n + 12 + (bar % 4 === 3 ? -1 : 0), lvl === 2 ? .09 : .07, LAYER.keys);
    if (s % 4 === 0) bassNote(t, root - (s === 8 ? 5 : 0), STEP * .6, lvl ? .4 : .28);
    if (s === 0) ch.forEach((q, k) => pluck(t + k * .015, q, .04, LAYER.keys));
    if (lvl) { if (s === 0 || s === 10) kick(t, .5); if (s === 4 || s === 12) hat(t, .05, true); else if (s % 2 === 0) hat(t, .025); }
    if (lvl === 2) { if (s % 2 === 0) pulse(t, root + 24 + (s % 8 === 6 ? 1 : 0), STEP * .8, .05); if (s === 8) snare(t, .2); hat(t + h, .02); }
    if (!lvl && s === 8 && bar % 2) marimba(t, pick(ch) + 12, .04);
  };
}

/* ---------- Режим у паузі, вкладка, картка в меню ---------- */
function goHide(v) {
  const F = FL[v != null ? v : ST.on ? ST.v : ST.nv] || FL[0], f = $('#fade'); closePanel(); if (f) f.style.opacity = 1; sfx('travel');
  setTimeout(() => { pl.x = F.spawn.x; pl.z = F.spawn.z; pl.y = 0; pl.falling = false; pl.jump = null; pl.safe = { x: F.spawn.x, z: F.spawn.z }; camPos.set(pl.x, 20, pl.z + 15); camLook.set(pl.x, .5, pl.z); if (f) f.style.opacity = 0; toast(`🛗 Дзинь! ${F.ic} <b>${F.n}</b>. Обери поверх у вікні лобі й натисни ✅ «Я готовий».`); V.lobbyHide = false; intro(); }, 260);
  return true;
}
function leaveHide() { if (amIn()) { if (typeof confirm === 'function' && !window.__ADDON_TEST && !confirm('Раунд іде. Вийти з офісу?')) return false; req('leave'); } V.work = null; V.ram = null; V.lobbyHide = false; { const r = typeof document !== 'undefined' && document.getElementById('hb-role'); if (r) r.style.display = 'none'; } if (V.lobbyOpen) { V.lobbyOpen = false; modeLobby(null); } if (hero) hero.root.visible = true; if (V.bar) { V.bar = ''; if (typeof modeBar === 'function') modeBar(null); } return true; }
if (A.mode) A.mode({ id: 'hideboss', ic: '🙈', n: 'Сховайся від боса', sub: 'хованки на поверсі хмарочоса: бос проти офісників-меблів', go: () => goHide(), here: () => running && inIsl(pl.x, pl.z), leave: leaveHide });
A.tab('hideboss', '🙈 Хованки', () => {
  const d = A.data(), here = inIsl(pl.x, pl.z);
  const sc = Object.entries(ST.sc).sort((a, b) => b[1] - a[1]);
  return `<h3>🙈 Сховайся від боса · Хованки</h3>
    <p style="font-size:13px;line-height:1.5;margin:4px 0 10px">Prop Hunt на 2–6 гравців на поверсі хмарочоса. Бос шукає ледачих офісників, що прикинулись меблями. Сам — граєш проти ботів.</p>
    <div class="btns"><button class="btn alt" data-hb="help">❓ Як грати</button>${here ? (ST.on ? '' : '<button class="btn" data-hb="lobby">🗳️ Лобі</button>') : '<button class="btn" data-hb="go">🙈 В офіс</button>'}</div>
    <div class="btns" style="margin-top:6px"><span style="font-size:13px;align-self:center">🎭 Сам проти ботів граю:</span><button class="btn${V.pref === 'boss' ? ' alt' : ''}" data-hb="hider">🙈 офісником</button><button class="btn${V.pref === 'boss' ? '' : ' alt'}" data-hb="boss">👔 босом</button></div>
    <h3 style="margin-top:12px">🏢 Поверхи</h3>
    <div class="list" style="font-size:13px;line-height:1.5">${FL.map((F, i) => `<div>${F.ic} <b>${F.n}</b>${ST.nv === i && !ST.on ? ' · <b style="color:#7FE08A">наступний</b>' : ''}${ST.on && ST.v === i ? ' · <b style="color:#FFD27A">зараз граємо</b>' : ''} — ${F.about}.${!ST.on && ST.vt[i] ? ` 🗳️ ${ST.vt[i]}` : ''}</div>`).join('')}</div>
    <div class="list" style="margin-top:10px;font-size:13px;line-height:1.55">
      <div>🙈 <b>Офісник</b>: F / 1 біля меблів — маскуєшся. Рух у маскуванні повільний і хитає предмет. 📄 2 / R — фейковий звіт (1 раз). 🚬 4 — перекур-ривок (${SMOKE_CD} с).</div>
      <div>🛞 <b>Фізичний тролінг</b>: у маскуванні крісла, кулера чи поштового візка — 3: таран! Збив боса — він ${STUN} с лежить і не ловить. Але врізався бос у тебе — ти «бздинькаєш» і видаєш себе.</div>
      <div>📉 <b>Продуктивність</b> тане ~75 с. F біля 💻 комп’ютера, 3 с — 100%, але тебе видно. На нулі — маскування блимає.</div>
      <div>👔 <b>Бос</b>: 20 с наради, потім 3 хв. ЛКМ / 1 — «Попався!», промах −5 с. 🔍 2 / Q — Перевірка (${CHECK_CD} с). 🔔 3 — Загальні збори: за ${BELL_T} с усі в залу нарад, прогульникам — 🚩 на ${FLAG_T} с.</div>
      <div>😵 Спійманий — на килим у кабінет боса.</div>
      <div>🎲 <b>Хто бос?</b> Онлайн — на старті раунду жереб обирає одного з гравців (двічі поспіль той самий — ні), решта — офісники. Сам — роль обираєш тут, ботів додає гра.</div>
    </div>
    ${sc.length ? `<h3 style="margin-top:12px">🏆 Табло</h3><div class="list" style="font-size:13px">${sc.map(([n, p], i) => `<div>${i + 1}. <b>${escapeHTML(n === 'me' ? 'Ти' : n)}</b> — ${p}</div>`).join('')}</div>` : ''}
    <p class="muted" style="font-size:12px;margin-top:10px">Раундів: ${d.rounds || 0} · пересидів боса: ${d.survived || 0} · спіймали тебе: ${d.caught || 0} · збив боса тараном: ${d.trips || 0} · босом: ${d.bossRounds || 0} (перемог ${d.bossWins || 0}) · спіймав офісників: ${d.catches || 0}</p>`;
}, e => {
  const b = e.target.closest('[data-hb]'); if (!b) return;
  const a = b.dataset.hb;
  if (a === 'help') { closePanel(); intro(true); } else if (a === 'go') goHide(); else if (a === 'lobby') openLobby(); else { V.pref = a; toast(a === 'boss' ? '👔 Сам граєш <b>босом</b> проти ботів-офісників.' : '🙈 Сам граєш <b>офісником</b> проти бота-боса.'); sfx('ui'); renderPanel(); }
});
if (!SIMSIDE && typeof document !== 'undefined') {
  const box = document.querySelector('#main-menu .mm-container');
  if (box && !document.getElementById('mm-hideboss')) {
    const card = document.createElement('div'); card.className = 'mm-card'; card.id = 'mm-hideboss';
    card.innerHTML = `<div class="mm-img-wrap"><div class="mm-card-img" style="background-image:url('menu/hideboss-bg.jpg'),url('addons/hideboss/hideboss-bg.jpg'),linear-gradient(160deg,#5E6FD8,#8C6FD0 55%,#FF9C8A)"></div></div>
      <div class="mm-card-body"><h2>ХОВАНКИ</h2><div class="mm-subtitle">Сховайся від боса</div>
      <div class="mm-desc">Прикинься фікусом на 57-му поверсі, поки бос шукає ледарів. Тарань його кріслом! Prop Hunt на 2–6 гравців або проти ботів.</div></div>`;
    const locked = [...box.children].filter(c => c.classList.contains('mm-locked')).pop();
    box.insertBefore(card, locked || null);
    card.addEventListener('click', () => {
      V.auto = true; if (running) goHide();
      const mm = document.getElementById('main-menu'); if (mm) { mm.classList.add('mm-hide'); mm.addEventListener('transitionend', () => mm.remove(), { once: true }); }
    });
  }
}
A.on('start', () => { if (V.auto && !SIMSIDE) setTimeout(() => goHide(), 700); });
if (window.__ADDON_TEST) {
  const F0 = FL[0];
  window.__hideboss = { FL, ROOMS: F0.rooms, WALLS: F0.walls, navFree, cellOf, navOf, ST, AU, V, FURN, FT, DESKS, BOARD: F0.board, SPAWN: F0.spawn, OFF: F0.off, CARPET: F0.carpet, BOSS_SPOT: F0.bossSpot, MEET, DUR, STUN, RAM_CD, BELL_T, FLAG_T,
    req, goal, intro, me, bossE, alive, hiders, bossTarget, bossClick, fdist, workSpot, hideSpots, route, endRound, inOffice, floorAt, roomAt, inRoomR, propR, canRoll, startRamC, bossBell, syncBar, BAR, chooseFloor, goHide, lobbyDef, openLobby, inLobby };
}
