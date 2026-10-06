/* Аддон «Сховайся від боса» (ХОВАНКИ): Prop Hunt в офісі на 2–6 гравців, а наодинці — проти ботів.
   Справжній поверх офісу: коридор, опенспейс з рядами столів (монітор, клавіатура, крісло), переговорна,
   бухгалтерія, копі-центр, скляний кабінет боса, рецепція, кухня, лаунж, серверна, туалет і склад.
   Маскуватись можна під меблі цих кімнат: крісло, фікус, кулер, ксерокс, шафа, коробка, смітник, кавомашина, диван.
   Один гравець — БОС, решта — ліниві офісники.
   - Офісник: F біля меблів — маскуєшся під них (тебе не видно, на твоєму місці стоїть такий самий предмет).
     Рух у маскуванні повільний і предмет хитається — це підозріло. «Продуктивність» тане: щоб її поповнити,
     треба попрацювати за комп’ютером (F біля столу, 3 с) — і в цей час тебе видно. Впала до нуля —
     маскування блимає червоним. R — «фейковий звіт» (приманка, 1 раз за раунд).
   - Бос: 20 с «нарада» у скляному кабінеті (нічого не бачить), потім 3 хвилини полює. ЛКМ / F по
     підозрілому предмету — «Попався!». Ударив справжній предмет — мінус 5 с («Це просто фікус…»).
     Q — «Перевірка»: предмети-офісники поруч трусяться (перезарядка 12 с).
   - Спійманий офісник іде «на килим» у кабінет боса й дивиться звідти (спостерігач до кінця раунду).
   - Усі спіймані — перемога боса; вийшов час — перемагають ті, хто вцілів. Роль боса ходить по колу, є табло.
   - Сам: граєш офісником проти бота-боса (і двох ботів-офісників) або босом проти трьох ботів.
   У спільному світі ролі, маскування, спіймання й таймер рахує сервер (як у «Кавовому рейсі»).
   Картинку для картки в меню поклади поруч: addons/hideboss/hideboss-bg.jpg */
const A = Addon.info({ name: 'Сховайся від боса', version: '1.0', desc: 'Хованки в офісі (Prop Hunt) на 2–6: бос шукає офісників, що прикинулись меблями. Продуктивність, фейкові звіти, «Перевірка». Наодинці — проти ботів.' });

const SIMSIDE = !!window.__SIM;
const AUTH = () => SIMSIDE || !(typeof WORLD !== 'undefined' && WORLD.on);
const IX = 0, IZ = -120, ISL_R = 24;
const HX = 18, HZ = 13;                                       // півширина / півглибина будівлі (зовнішні стіни)
const MEET = 20, DUR = 180, PENALTY = 5, CHECK_CD = 12, CHECK_R = 7, WORK_T = 3, DRAIN = 100 / 75;
const W = (lx, lz) => ({ x: IX + lx, z: IZ + lz });
const OFF = { x0: IX + 11.5, x1: IX + 17.5, z0: IZ - 12.5, z1: IZ - 2.5 };      // скляний кабінет боса (всередині)
const BOSS_SPOT = W(13, -6.2), CARPET = W(16.6, -3.4), DOOR = W(14.5, -2);
const BOARD = W(-15.6, 4.4), ROLE = W(-12.6, 4.4), SPAWN = W(-14, 9.6);
const inIsl = (x, z) => dist2(x, z, IX, IZ) < ISL_R + 2;
const inOffice = (x, z) => x > OFF.x0 - .3 && x < OFF.x1 + .3 && z > OFF.z0 - .3 && z < OFF.z1 + .2;
const r2 = v => Math.round(v * 100) / 100;

A.island({ id: 'hideboss', n: 'Сховайся від боса', sub: 'хованки в офісі · бос шукає офісників-меблі', x: IX, z: IZ, r: ISL_R, top: '#A9C99A', rock: '#8C84C6', biome: 'hideboss', tier: 1, safe: true, noZone: true });
const _buildIsland = buildIsland;
buildIsland = function (s) {
  if (s.biome !== 'hideboss') return _buildIsland.apply(this, arguments);
  const g = _buildIsland.apply(this, arguments);   // скеля острова — і на сервері, щоб світ будувався однаково
  if (!SIMSIDE) buildFloor();
  return g;
};

/* ---------- План поверху: стіни з дверима (локальні координати від центру острова) ---------- */
// Будівля 36×26. Північний ряд: опенспейс · переговорна · бухгалтерія + копі-центр · скляний кабінет боса.
// Коридор посередині. Південний ряд: рецепція (вхід) · кухня · лаунж · серверна + туалет · склад.
const WALLS = [
  { x1: -18, z1: -13, x2: 18, z2: -13, outer: 1, tall: 1 }, { x1: -18, z1: 13, x2: 18, z2: 13, outer: 1, doors: [-14], shut: 1 },
  { x1: -18, z1: -13, x2: -18, z2: 13, outer: 1 }, { x1: 18, z1: -13, x2: 18, z2: 13, outer: 1 },
  // коридор
  { x1: -18, z1: -2, x2: 11, z2: -2, doors: [-12.5, -7.5, 1.5, 8.5] }, { x1: 11, z1: -2, x2: 18, z2: -2, doors: [14.5], glass: 1 },
  { x1: -18, z1: 1.5, x2: 18, z2: 1.5, doors: [-14, -6, 2, 8.5, 14.5] },
  // північні кімнати
  { x1: -2, z1: -13, x2: -2, z2: -2 }, { x1: 5, z1: -13, x2: 5, z2: -2 }, { x1: 11, z1: -13, x2: 11, z2: -2, glass: 1 },
  { x1: 5, z1: -7.5, x2: 11, z2: -7.5, doors: [9.5] },
  // південні кімнати
  { x1: -10, z1: 1.5, x2: -10, z2: 13, doors: [4] }, { x1: -2, z1: 1.5, x2: -2, z2: 13, doors: [4] }, { x1: 6, z1: 1.5, x2: 6, z2: 13, doors: [10.5] },
  { x1: 11, z1: 1.5, x2: 11, z2: 13 }, { x1: 6, z1: 7, x2: 11, z2: 7 },
].map(w => Object.assign({}, w, { x1: IX + w.x1, x2: IX + w.x2, z1: IZ + w.z1, z2: IZ + w.z2, doors: (w.doors || []).map(d => d + (w.z1 === w.z2 ? IX : IZ)) }));
function wallParts(w) {   // проміжки стіни між дверима
  const horiz = w.z1 === w.z2, lo = Math.min(horiz ? w.x1 : w.z1, horiz ? w.x2 : w.z2), hi = Math.max(horiz ? w.x1 : w.z1, horiz ? w.x2 : w.z2);
  const ds = (w.doors || []).slice().sort((a, b) => a - b), out = []; let a = lo;
  for (const d of ds) { out.push([a, d - .9]); a = d + .9; } out.push([a, hi]); return out;
}
// кімнати: назва, межі, підлога (для підписів і табличок на дверях)
const ROOMS = [
  { id: 'open', n: '💻 Опенспейс', x0: -18, z0: -13, x1: -2, z1: -2, fl: '#6C7BC4' },
  { id: 'meet', n: '📊 Переговорна', x0: -2, z0: -13, x1: 5, z1: -2, fl: '#8C7FC2' },
  { id: 'copy', n: '🖨️ Копі-центр', x0: 5, z0: -13, x1: 11, z1: -7.5, fl: '#D9DCE8' },
  { id: 'acc', n: '🧮 Бухгалтерія', x0: 5, z0: -7.5, x1: 11, z1: -2, fl: '#7FA6C9' },
  { id: 'boss', n: '👔 Кабінет боса', x0: 11, z0: -13, x1: 18, z1: -2, fl: '#9A6A4C' },
  { id: 'hall', n: '🚶 Коридор', x0: -18, z0: -2, x1: 18, z1: 1.5, fl: '#C9CDD9' },
  { id: 'rec', n: '🛎️ Рецепція', x0: -18, z0: 1.5, x1: -10, z1: 13, fl: '#E3D7C4' },
  { id: 'kitchen', n: '☕ Кухня', x0: -10, z0: 1.5, x1: -2, z1: 13, tiles: 1 },
  { id: 'lounge', n: '🛋️ Лаунж', x0: -2, z0: 1.5, x1: 6, z1: 13, fl: '#C4956A' },
  { id: 'server', n: '🖥️ Серверна', x0: 6, z0: 1.5, x1: 11, z1: 7, fl: '#5C6680' },
  { id: 'wc', n: '🚻 Туалет', x0: 6, z0: 7, x1: 11, z1: 13, tiles: 2 },
  { id: 'store', n: '📦 Склад', x0: 11, z0: 1.5, x1: 18, z1: 13, fl: '#B9AE98' },
];
const roomAt = (x, z) => ROOMS.find(r => r.id !== 'hall' && x > IX + r.x0 && x < IX + r.x1 && z > IZ + r.z0 && z < IZ + r.z1) || ROOMS[5];

/* ---------- Меблі: типи й розстановка (однакові на сервері й у гравців) ---------- */
// dis — під це можна замаскуватись; c — кола-зіткнення [x, z, r] у локальних координатах предмета (порожньо — на стіні)
const FT = {
  desk: { n: 'Стіл з комп’ютером', ic: '💻', h: .9, c: [[-.4, 0, .42], [.4, 0, .42]], miss: 'Це просто стіл. Комп’ютер гуде.' },
  bossdesk: { n: 'Стіл боса', ic: '🏢', h: .9, c: [[-.75, 0, .55], [0, 0, .55], [.75, 0, .55]], miss: 'Це ж мій стіл!' },
  chair: { n: 'Офісне крісло', ic: '🪑', r: .3, h: .9, dis: 1, miss: 'Просто крісло. Порожнє, як мої KPI.' },
  cooler: { n: 'Кулер', ic: '🚰', r: .35, h: 1.4, dis: 1, miss: 'Кулер. Булькає. Не офісник.' },
  ficus: { n: 'Фікус', ic: '🪴', r: .38, h: 1.5, dis: 1, miss: 'Це просто фікус…' },
  copier: { n: 'Ксерокс', ic: '🖨️', h: 1, dis: 1, c: [[-.25, 0, .4], [.25, 0, .4]], miss: 'Ксерокс зажував папір. І все.' },
  cabinet: { n: 'Шафа з документами', ic: '🗄️', r: .46, h: 1.4, dis: 1, miss: 'Шафа. Документи. Нудьга.' },
  box: { n: 'Коробка', ic: '📦', r: .4, h: .6, dis: 1, miss: 'Коробка з-під принтера. Порожня.' },
  trash: { n: 'Смітник', ic: '🗑️', r: .28, h: .6, dis: 1, miss: 'Смітник. Тут лише чиїсь мрії.' },
  coffee: { n: 'Кавомашина', ic: '☕', r: .4, h: 1.3, dis: 1, miss: 'Кавомашина. Свята річ, не чіпай.' },
  sofa: { n: 'Диван', ic: '🛋️', h: .9, dis: 1, c: [[-.62, 0, .45], [0, 0, .45], [.62, 0, .45]], miss: 'Диван. Підозріло зручний, але порожній.' },
  report: { n: 'Звіт', ic: '📄', r: .3, h: .3, miss: 'Фейковий звіт! Тебе обвели навколо пальця.' },
  // декор (тверде, але під нього не замаскуєшся)
  shelf: { n: 'Стелаж', ic: '📚', h: 1.8, c: [[-.6, 0, .33], [0, 0, .33], [.6, 0, .33]], miss: 'Стелаж. Тут лише папки за 2009 рік.' },
  counter: { n: 'Кухонна стійка', ic: '🍽️', h: 1, c: [[-1.5, 0, .4], [-.5, 0, .4], [.5, 0, .4], [1.5, 0, .4]], miss: 'Стійка. Хтось знову не помив чашку.' },
  fridge: { n: 'Холодильник', ic: '🧊', r: .45, h: 1.9, miss: 'Холодильник. Тут мій йогурт! А, ні — уже нема.' },
  mtable: { n: 'Стіл для нарад', ic: '📊', h: .9, c: [[-2.4, 0, .7], [-1.2, 0, .7], [0, 0, .7], [1.2, 0, .7], [2.4, 0, .7]], miss: 'Стіл для нарад. Пам’ятає всі мої промови.' },
  ktable: { n: 'Обідній стіл', ic: '🍽️', h: .9, c: [[-.6, 0, .55], [.6, 0, .55]], miss: 'Обідній стіл. Крихти, але не офісник.' },
  ctable: { n: 'Журнальний столик', ic: '☕', h: .5, c: [[-.35, 0, .42], [.35, 0, .42]], miss: 'Столик. На ньому журнал «Ефективний менеджмент».' },
  reception: { n: 'Стійка рецепції', ic: '🛎️', h: 1.1, c: [[-1.4, 0, .45], [-.7, 0, .45], [0, 0, .45], [.7, 0, .45], [1.4, 0, .45]], miss: 'Рецепція. Дзвоник: дзинь!' },
  vend: { n: 'Автомат зі снеками', ic: '🍫', h: 1.9, c: [[-.25, 0, .4], [.25, 0, .4]], miss: 'Автомат. Знову з’їв мою монетку.' },
  rack: { n: 'Серверна стійка', ic: '🖥️', r: .42, h: 2, miss: 'Сервер. Гуде. Блимає. Не чіпати!' },
  sink: { n: 'Умивальник', ic: '🚰', r: .32, h: 1, miss: 'Умивальник. Мий руки, бос.' },
  wc: { n: 'Кабінка', ic: '🚽', r: .42, h: 1.8, miss: 'Кабінка порожня. Фух.' },
  pingpong: { n: 'Тенісний стіл', ic: '🏓', h: .8, c: [[-.8, 0, .72], [.8, 0, .72]], miss: 'Тенісний стіл. Тимбілдинг!' },
  tv: { n: 'Телевізор', ic: '📺', h: 0, c: [] }, board: { n: 'Дошка', ic: '📝', h: 0, c: [] },
};
const FURN = [];
const loc = (f, lx, lz) => { const c = Math.cos(f.rot), s = Math.sin(f.rot); return { x: f.x + lx * c + lz * s, z: f.z - lx * s + lz * c }; };
function addF(t, lx, lz, rot) { const p = W(lx, lz); const f = { i: FURN.length, t, x: p.x, z: p.z, rot: rot || 0 }; FURN.push(f); return f; }
const PI = Math.PI, H2 = Math.PI / 2;
// стіл із ПК + крісло (rot 0 — працівник сидить з боку +z і дивиться на -z)
function deskSet(lx, lz, rot, k) {
  const d = addF('desk', lx, lz, rot), c = loc(d, .35, .9);
  addF('chair', c.x - IX, c.z - IZ, rot + PI + ((k * 37) % 7 - 3) * .08);
  return d;
}
// 💻 Опенспейс: три кластери по 2×2 столи (монітори спина до спини), два ряди
let dk = 0;
for (const cx of [-15.6, -10.6, -5.6]) for (const rz of [-10.2, -5.6]) for (const ox of [0, 1.6]) { deskSet(cx + ox, rz + .4, 0, dk++); deskSet(cx + ox, rz - .4, PI, dk++); }
[['ficus', -17.4, -12.4], ['ficus', -2.6, -12.4], ['cooler', -17.4, -7.9], ['trash', -12.3, -12.5], ['trash', -7.3, -12.5], ['cabinet', -17.3, -2.7, PI], ['cabinet', -16.4, -2.7, PI],
 ['box', -10, -2.7, .2], ['trash', -4.6, -2.6], ['ficus', -2.6, -2.6], ['cabinet', -2.65, -7.9, -H2]].forEach(a => addF(a[0], a[1], a[2], a[3] || 0));
// 📊 Переговорна: довгий стіл, крісла по боках, телевізор і дошка
addF('mtable', 1.5, -7.6, H2); addF('tv', 1.5, -12.85, 0); addF('board', -1.88, -7.6, H2);
for (const z of [-9.8, -8.4, -7, -5.6]) { addF('chair', .25, z, H2); addF('chair', 2.75, z, -H2); }
addF('chair', 1.5, -11.2, 0); addF('ficus', -1.4, -12.4); addF('ficus', 4.4, -12.4); addF('cooler', 4.4, -2.7); addF('trash', -1.4, -2.7);
// 🖨️ Копі-центр: ксерокси, шафи, коробки з папером
addF('copier', 6.6, -12.4, 0); addF('copier', 8.6, -12.4, 0); addF('box', 10.4, -12.4, .3); addF('box', 10.4, -11.5, -.2);
addF('cabinet', 5.55, -10.6, H2); addF('cabinet', 5.55, -9.7, H2); addF('trash', 10.4, -8.2); addF('shelf', 6.9, -8.1, PI);
// 🧮 Бухгалтерія: 4 столи й шафи
for (const x of [6.9, 8.5]) { deskSet(x, -4.3, 0, dk++); deskSet(x, -5.1, PI, dk++); }
addF('cabinet', 5.55, -4.6, H2); addF('cabinet', 5.55, -5.5, H2); addF('ficus', 10.4, -2.7); addF('trash', 10.5, -7);
// 👔 Кабінет боса: великий стіл, крісла, диван, стелаж, фікуси
addF('bossdesk', 14.5, -10.2, 0); addF('chair', 14.5, -11.3, 0); addF('chair', 13.8, -8.7, PI); addF('chair', 15.2, -8.7, PI);
addF('shelf', 17.55, -9.6, -H2); addF('cabinet', 17.4, -12.4); addF('ficus', 11.7, -12.4); addF('ficus', 17.4, -6.4); addF('sofa', 11.8, -5.6, H2); addF('board', 14.5, -12.88, 0);
// 🚶 Коридор
[['ficus', -17.4, -1.4], ['cooler', -10, 1], ['trash', -3.8, 1.05], ['ficus', 5.8, -1.45], ['box', 11.6, 1, .3], ['ficus', 17.4, 0], ['trash', 12.2, -1.5]].forEach(a => addF(a[0], a[1], a[2], a[3] || 0));
// 🛎️ Рецепція: стійка, крісло адміністратора, диванчики для гостей
addF('reception', -11.6, 8.6, H2); addF('chair', -10.7, 8.6, -H2); addF('sofa', -17.4, 6.4, H2); addF('sofa', -17.4, 10.4, H2); addF('ctable', -16.2, 8.4, H2);
addF('ficus', -17.4, 2.2); addF('ficus', -17.4, 12.4); addF('ficus', -11, 12.4); addF('cooler', -10.6, 2.2); addF('trash', -10.6, 5.6);
// ☕ Кухня: стійка з мийкою, холодильник, кавомашина, автомат, два столи
addF('fridge', -9.4, 12.3, PI); addF('counter', -6.4, 12.45, PI); addF('coffee', -3.6, 12.4, PI); addF('cooler', -2.6, 12.4); addF('vend', -9.4, 2.3, 0);
for (const tx of [-7.4, -4.4]) { addF('ktable', tx, 7.4, 0); for (const sx of [-.6, .6]) { addF('chair', tx + sx, 6.55, 0); addF('chair', tx + sx, 8.25, PI); } }
addF('trash', -2.6, 2.2); addF('ficus', -9.4, 5.8);
// 🛋️ Лаунж: дивани навколо столика, пінг-понг, фікуси
addF('sofa', 2, 12.3, PI); addF('sofa', -1.4, 9, H2); addF('sofa', 5.4, 7.8, -H2); addF('ctable', 2, 9.4, 0); addF('pingpong', 2, 4.6, 0);
addF('ficus', -1.4, 12.4); addF('ficus', 5.4, 12.4); addF('ficus', -1.4, 2.2); addF('box', 5.3, 2.3, .4); addF('chair', -.9, 5.2, H2);
// 🖥️ Серверна: ряд стійок
for (const x of [6.7, 7.6, 8.5, 9.4]) addF('rack', x, 6.4, PI);
deskSet(10.3, 3.8, -H2, dk++); addF('box', 6.6, 2.2, .2); addF('trash', 10.5, 2.1);
// 🚻 Туалет: кабінки, умивальники
for (const z of [8.1, 9.6, 11.1]) addF('wc', 10.4, z, -H2);
addF('sink', 6.6, 7.7, H2); addF('sink', 6.6, 8.6, H2); addF('trash', 6.6, 12.4); addF('ficus', 8.6, 12.4);
// 📦 Склад: стелажі, коробки, старі шафи й зламаний ксерокс
for (const z of [3.2, 5.6, 8, 10.4]) addF('shelf', 17.55, z, -H2);
for (const [x, z, r] of [[11.6, 12.4, .2], [12.5, 12.45, -.3], [13.4, 12.4, .5], [12, 11.5, .1], [14.6, 6.8, .3], [14.6, 7.7, -.2], [13.8, 9.6, .7], [15.4, 4, .1]]) addF('box', x, z, r);
addF('cabinet', 11.55, 3.2, H2); addF('cabinet', 11.55, 4.1, H2); addF('cabinet', 11.55, 5, H2); addF('copier', 16.3, 12.35, PI); addF('chair', 13, 8.4, 1.2); addF('ficus', 11.6, 9.4); addF('trash', 17.4, 12.4);
const DESKS = FURN.filter(f => f.t === 'desk');
const DISF = FURN.filter(f => FT[f.t].dis);
/* кола-зіткнення предмета у світових координатах */
function circles(f) { const T = FT[f.t]; return (T.c || [[0, 0, T.r]]).map(([lx, lz, r]) => Object.assign(loc(f, lx, lz), { r })); }
function fdist(f, x, z) { let d = 1e9; for (const c of circles(f)) d = Math.min(d, dist2(x, z, c.x, c.z) - c.r); return d; }
const workSpot = f => loc(f, -.45, 1.05);   // збоку від крісла, обличчям до монітора

/* ---------- Навігація ботів: сітка 0,5 м і пошук шляху (стіни й меблі — перешкоди) ---------- */
const NAV = { cell: .5, x0: IX - HX, z0: IZ - HZ, nx: HX * 4, nz: HZ * 4, block: null };
function navBuild() {
  const b = new Uint8Array(NAV.nx * NAV.nz);
  const ss = STATICS.filter(o => Math.abs(o.x - IX) < HX + 2 && Math.abs(o.z - IZ) < HZ + 2);
  for (let i = 0; i < NAV.nx; i++) for (let j = 0; j < NAV.nz; j++) {
    const x = NAV.x0 + (i + .5) * NAV.cell, z = NAV.z0 + (j + .5) * NAV.cell;
    b[i + j * NAV.nx] = ss.some(o => dist2(x, z, o.x, o.z) < o.r + .26) ? 1 : 0;
  }
  NAV.block = b;
}
const cellOf = (x, z) => [clamp(Math.floor((x - NAV.x0) / NAV.cell), 0, NAV.nx - 1), clamp(Math.floor((z - NAV.z0) / NAV.cell), 0, NAV.nz - 1)];
const navFree = (x, z) => { if (!NAV.block) navBuild(); const [i, j] = cellOf(x, z); return !NAV.block[i + j * NAV.nx]; };
function route(x, z, tx, tz) {
  if (!NAV.block) navBuild();
  if (!isFinite(x + z + tx + tz)) return [];
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
  const pts = []; for (let c = goal, n = 0; c !== start && n < 4000; c = prev[c], n++) pts.push({ x: NAV.x0 + (c % nx + .5) * NAV.cell, z: NAV.z0 + (((c / nx) | 0) + .5) * NAV.cell });
  pts.reverse(); const out = pts.filter((p, k) => k % 2 === 1 || k === pts.length - 1); if (!out.length) return [{ x: tx, z: tz }]; out[out.length - 1] = { x: tx, z: tz }; return out;
}
/* сховки для ботів: поруч із меблями, на вільній клітинці, не в кабінеті боса */
let HIDE = null;
function hideSpots() {
  if (HIDE) return HIDE;
  HIDE = [];
  for (const f of DISF) {
    if (inOffice(f.x, f.z)) continue;
    const cs = circles(f), ext = Math.max(...cs.map(c => dist2(c.x, c.z, f.x, f.z) + c.r));
    for (let k = 0; k < 12; k++) {
      const a = k / 12 * Math.PI * 2 + .4, x = f.x + Math.cos(a) * (ext + .6), z = f.z + Math.sin(a) * (ext + .6);
      if (Math.abs(x - IX) > HX - .6 || Math.abs(z - IZ) > HZ - .6 || inOffice(x, z) || !navFree(x, z)) continue;
      if (STATICS.some(o => dist2(x, z, o.x, o.z) < o.r + .42)) continue;
      HIDE.push({ x, z, f }); break;
    }
  }
  return HIDE;
}

/* ---------- Стан раунду ---------- */
// учасник: k — ключ (ім’я / 'me' / 'bot:…'), n — підпис, boss, bot, p — під що замаскований, r — поворот,
// c — спійманий, pr — продуктивність, x/z/f — позиція (для ботів), w — працює, mv — рухається, dc — звіт використано
const ST = { on: false, ph: 'meet', t: 0, rn: 0, cd: 0, ro: [], dec: [], sc: {}, bk: '' };
const AU = { clock: 0, stT: 0, bot: {}, mv: {}, ws: {}, gone: {}, bc: {}, sus: [], did: 0, click: {}, freeze: false };
const myKey = () => (NET.on && typeof WORLD !== 'undefined' && WORLD.on ? myName() : 'me');
const keyOf = from => SIMSIDE ? String(from && from.name || '') : 'me';
const ent = k => ST.ro.find(e => e.k === k);
const me = () => ent(myKey());
const bossE = () => ST.ro.find(e => e.boss);
const hiders = () => ST.ro.filter(e => !e.boss);
const alive = () => hiders().filter(e => !e.c);
function snap() {
  return { on: ST.on ? 1 : 0, ph: ST.ph, t: r2(ST.t), rn: ST.rn, cd: r2(ST.cd), bk: ST.bk,
    ro: ST.ro.map(e => [e.k, e.n, e.boss ? 1 : 0, e.bot ? 1 : 0, e.p, r2(e.r), e.c ? 1 : 0, Math.round(e.pr), r2(e.x), r2(e.z), r2(e.f), e.w ? 1 : 0, e.mv ? 1 : 0, e.dc ? 1 : 0]),
    dec: ST.dec.map(d => [d.id, r2(d.x), r2(d.z), d.t, r2(d.r)]), sc: Object.entries(ST.sc).sort((a, b) => b[1] - a[1]).slice(0, 10) };
}
function applySnap(d) {
  Object.assign(ST, { on: !!d.on, ph: d.ph === 'hunt' ? 'hunt' : 'meet', t: +d.t || 0, rn: d.rn | 0, cd: +d.cd || 0, bk: String(d.bk || '') });
  if (Array.isArray(d.ro)) ST.ro = d.ro.slice(0, 12).map(a => ({ k: String(a[0]), n: String(a[1]).slice(0, 24), boss: !!a[2], bot: !!a[3], p: FT[a[4]] ? a[4] : '', r: +a[5] || 0, c: !!a[6], pr: +a[7] || 0, x: +a[8] || 0, z: +a[9] || 0, f: +a[10] || 0, w: !!a[11], mv: !!a[12], dc: !!a[13] }));
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
function humansHere() { return SIMSIDE ? simPlayers().filter(p => !p.dead && inIsl(p.x, p.z)).map(p => p.name).filter(Boolean) : (!pl.dead && inIsl(pl.x, pl.z) ? ['me'] : []); }
function posOf(e) {
  if (e.bot) return e;
  if (!SIMSIDE) return e.k === 'me' ? pl : null;
  return simPlayers().find(p => p.name === e.k) || null;
}
const nm = k => SIMSIDE ? escapeHTML(k) : 'Ти';
function onReq(d, from) {
  const k = keyOf(from), e = ent(k);
  if (d.k === 'start') { if (!ST.on) startRound(k, d.role === 'boss' ? 'boss' : 'hider'); return; }
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
  else if (d.k === 'check' && e.boss && ST.ph === 'hunt' && p) doCheck(e, p.x, p.z);
  else if (d.k === 'catch' && e.boss && ST.ph === 'hunt' && p) {
    if (AU.clock - (AU.click[k] || -9) < .5) return; AU.click[k] = AU.clock;
    if (d.who != null) { const t = ent(String(d.who)), tp = t && posOf(t); if (t && !t.boss && !t.c && tp && dist2(p.x, p.z, tp.x, tp.z) < 3) catchE(e, t, tp); }
    else if (d.d != null) { const dc = ST.dec.find(q => q.id === (d.d | 0)); if (dc && dist2(p.x, p.z, dc.x, dc.z) < 3) miss(e, 'report', dc.x, dc.z, dc.id); }
    else if (d.f != null) { const f = FURN[d.f | 0]; if (f && fdist(f, p.x, p.z) < 2.6) miss(e, f.t, f.x, f.z); }
  }
}
function startRound(starter, role) {
  const H = humansHere(); if (!H.length) return;
  if (!H.includes(starter)) H.unshift(starter);
  ST.ro = []; ST.dec = []; AU.bot = {}; AU.mv = {}; AU.ws = {}; AU.gone = {}; AU.sus = []; AU.click = {};
  const mk = (k, n, boss, bot) => ({ k, n, boss, bot, p: '', r: 0, c: false, pr: 100, x: 0, z: 0, f: 0, w: false, mv: false, dc: false });
  let bossK = null;
  if (H.length === 1) bossK = role === 'boss' ? H[0] : 'bot:boss';
  else bossK = H.slice().sort((a, b) => (AU.bc[a] || 0) - (AU.bc[b] || 0) || (b === starter && role === 'boss') - (a === starter && role === 'boss'))[0];
  AU.bc[bossK] = (AU.bc[bossK] || 0) + 1;
  for (const h of H) ST.ro.push(mk(h, SIMSIDE ? h : 'Ти', h === bossK, false));
  if (H.length === 1) {
    if (bossK === 'bot:boss') ST.ro.push(Object.assign(mk('bot:boss', 'Бос Геннадій', true, true), { x: BOSS_SPOT.x, z: BOSS_SPOT.z, f: Math.PI }));
    const names = ['Петро з бухгалтерії', 'Оксана з HR', 'Стажер Вітя'].slice(0, bossK === 'bot:boss' ? 2 : 3);
    names.forEach((n, i) => { const s = W(-15.4 + i * 1.4, 2.9); ST.ro.push(Object.assign(mk('bot:' + i, n, false, true), { x: s.x, z: s.z })); });
  }
  for (const e of ST.ro) if (e.bot) AU.bot[e.k] = { path: [], mode: e.boss ? 'meet' : 'go', t: 0, thr: rand(18, 40), think: 0 };
  ST.on = true; ST.ph = 'meet'; ST.t = 0; ST.rn++; ST.cd = 0; ST.bk = bossK; AU.clock = 0;
  const b = bossE();
  emit({ k: 'start', rn: ST.rn, boss: b.k, bn: b.n });
  if (!b.bot) emit({ k: 'tp', who: b.k, x: BOSS_SPOT.x, z: BOSS_SPOT.z });
  pushState();
}
function checkReady() {   // усі сховались — нарада закінчується раніше (але не раніше 10 с)
  if (ST.ph === 'meet' && alive().length && alive().every(e => e.p) && ST.t < MEET - 10) ST.t = MEET - 10;
}
function catchE(b, t, tp) {
  t.c = true; t.p = ''; t.w = false;
  if (!b.bot) ST.sc[b.k] = (ST.sc[b.k] || 0) + 1;
  const n = hiders().filter(e => e.c).length;
  emit({ k: 'caught', who: t.k, wn: t.n, by: b.k, x: r2(tp.x), z: r2(tp.z), i: n });
  if (t.bot) { const s = { x: CARPET.x - (n - 1) % 3 * .8, z: CARPET.z - Math.floor((n - 1) / 3) * .8 }; t.x = s.x; t.z = s.z; t.f = 0; t.mv = false; }
  else emit({ k: 'tp', who: t.k, x: r2(CARPET.x - (n - 1) % 3 * .8), z: r2(CARPET.z - Math.floor((n - 1) / 3) * .8) });
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
  for (const k of ks) { const e = ent(k); if (e.bot && Math.random() < .35) { const s = AU.bot[k]; if (s) { s.mode = 'go'; s.spot = null; e.p = ''; } } }   // бот-офісник запанікував
  pushState();
}
function dropDecoy(e, x, z) {
  e.dc = true;
  const d = { id: ++AU.did, x: r2(x + .5), z: r2(z + .3), t: e.p || 'report', r: e.r || 0 };
  ST.dec.push(d);
  emit({ k: 'decoy', who: e.k }); pushState();
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
  const res = { k: 'end', win, why: why || '', ro: ST.ro.map(e => [e.k, e.boss ? 1 : 0, e.c ? 1 : 0, e.bot ? 1 : 0]), cc: hiders().filter(e => e.c).length, bn: b ? b.n : '' };
  ST.on = false; ST.ro = []; ST.dec = []; AU.bot = {};
  emit(res); pushState();
}
function authTick(dt) {
  if (!ST.on) return;
  AU.clock += dt; ST.t += dt;
  if (ST.cd > 0) ST.cd = Math.max(0, ST.cd - dt);
  // хто з людей пішов з офісу
  for (const e of ST.ro.slice()) {
    if (e.bot) continue;
    const p = posOf(e), here = p && !p.dead && inIsl(p.x, p.z);
    if (here) { AU.gone[e.k] = 0; const m = AU.mv[e.k] || (AU.mv[e.k] = { x: p.x, z: p.z, t: -9 }); if (dist2(p.x, p.z, m.x, m.z) > .04) { m.t = AU.clock; m.x = p.x; m.z = p.z; } e.x = p.x; e.z = p.z; continue; }
    AU.gone[e.k] = (AU.gone[e.k] || 0) + dt;
    if (AU.gone[e.k] > (SIMSIDE ? 3 : .5)) { dropOut(e, SIMSIDE ? `🚪 ${escapeHTML(e.k)} пішов з офісу.` : ''); if (!ST.on) return; }
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
  else if (ST.on) { ST.t += dt; if (ST.cd > 0) ST.cd = Math.max(0, ST.cd - dt); }
  if (!SIMSIDE) clientTick(dt);
});

/* ---------- Боти ---------- */
function walk(e, s, dt, spd) {   // іде маршрутом; true — дійшов
  if (!s.path.length) { e.mv = false; return true; }
  const t = s.path[0], d = dist2(e.x, e.z, t.x, t.z);
  if (d < .25) { s.path.shift(); return !s.path.length && (e.mv = false, true); }
  const st = Math.min(d, spd * dt), a = Math.atan2(t.x - e.x, t.z - e.z);
  const ox = e.x, oz = e.z;
  e.x += Math.sin(a) * st; e.z += Math.cos(a) * st; e.f = a; e.mv = true;
  if (s.path.length > 1 || d > 1.2) pushOutStatics(e, .35);
  e.x = clamp(e.x, IX - HX + .5, IX + HX - .5); e.z = clamp(e.z, IZ - HZ + .5, IZ + HZ - .5);
  // застряг — наступна точка маршруту
  s.stuck = dist2(ox, oz, e.x, e.z) < st * .25 ? (s.stuck || 0) + dt : 0;
  if (s.stuck > .8) { s.stuck = 0; s.path.shift(); }
  return false;
}
const goTo = (e, s, x, z) => { s.path = route(e.x, e.z, x, z); };
function say(e, txt) { emit({ k: 'say', who: e.k, txt }); }
function hiderBot(e, dt) {
  const s = AU.bot[e.k]; if (e.c) { e.mv = false; return; }
  if (s.mode === 'go') {
    if (!s.spot) {
      const taken = new Set(ST.ro.filter(q => q !== e && AU.bot[q.k] && AU.bot[q.k].spot).map(q => AU.bot[q.k].spot));
      const free = hideSpots().filter(h => !taken.has(h) && dist2(h.x, h.z, e.x, e.z) < 22);
      s.spot = pick(free.length ? free : hideSpots()); goTo(e, s, s.spot.x, s.spot.z);
    }
    if (walk(e, s, dt, 2.9)) { e.p = s.spot.f.t; e.r = s.spot.f.rot; s.mode = 'hide'; checkReady(); pushState(); }
  } else if (s.mode === 'hide') {
    if (ST.ph === 'hunt' && e.pr < s.thr) {
      if (!e.dc && Math.random() < .6) dropDecoy(e, e.x, e.z);
      const dk = DESKS.slice().sort((a, b) => dist2(a.x, a.z, e.x, e.z) - dist2(b.x, b.z, e.x, e.z))[Math.floor(Math.random() * 3)];
      const w = workSpot(dk); s.desk = dk; e.p = ''; s.mode = 'towork'; goTo(e, s, w.x, w.z); pushState();
    }
  } else if (s.mode === 'towork') {
    if (walk(e, s, dt, 3.1)) { s.mode = 'working'; s.t = WORK_T; e.w = true; e.f = Math.PI; pushState(); }
  } else if (s.mode === 'working') {
    s.t -= dt;
    if (s.t <= 0) { e.w = false; e.pr = 100; s.thr = rand(18, 40); s.mode = 'go'; s.spot = null; pushState(); }
  }
}
function bossBot(e, dt) {
  const s = AU.bot[e.k];
  if (ST.ph === 'meet') { e.x = BOSS_SPOT.x; e.z = BOSS_SPOT.z; e.f = Math.PI; e.mv = false; if ((s.t -= dt) <= 0) { s.t = rand(5, 8); say(e, pick(['Так, колеги, синергія…', 'Хто з’їв мій йогурт?', 'KPI мають рости!', 'Зараз прийду — перевірю…'])); } return; }
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
    const blink = see.filter(o => o.q.p && o.q.pr <= 0 && dist2(o.p.x, o.p.z, e.x, e.z) < 14);
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
    // «Перевірка»
    if (ST.cd <= 0 && s.mode !== 'chase' && Math.random() < .12) { doCheck(e, e.x, e.z); say(e, 'Перевірка! Хто тут не працює?'); }
  }
  const tg = s.tg; if (!tg) return;
  const done = walk(e, s, dt, s.mode === 'chase' ? 4.4 : 3.1);
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
const V = { lbl: null, glbl: null, gArrow: null, gMark: null, goal: null, hud: null, goalEl: null, blind: null, work: null, ents: new Map(), decs: new Map(), shake: {}, blbl: new Map(), door: null, music: -1, auto: false, pref: 'hider', joined: false, near: 0, lastRes: null };
const amIn = () => !!(ST.on && me());
const amBoss = () => { const e = me(); return !!(ST.on && e && e.boss); };
const amHider = () => { const e = me(); return !!(ST.on && e && !e.boss && !e.c); };
const amCaught = () => { const e = me(); return !!(ST.on && e && !e.boss && e.c); };
const myProp = () => { const e = me(); return ST.on && e && !e.boss && !e.c ? e.p : ''; };
const left = () => ST.ph === 'meet' ? Math.max(0, MEET - ST.t) : Math.max(0, DUR - ST.t);
const mmss = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

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
    case 'shelf':   // стелаж з папками
      put(g, mesh(new THREE.BoxGeometry(1.8, 1.8, .45), '#B8A68E'), 0, .9, 0);
      for (let y = 0; y < 4; y++) for (let k = 0; k < 5; k++) put(g, mesh(new THREE.BoxGeometry(.3, .32, .36), ['#E0607E', '#6BB8FF', '#FFE066', '#7FE08A', '#B07CF0', '#FFFFFF'][(y * 5 + k * 3) % 6], false), -.72 + k * .36, .25 + y * .43, .06);
      break;
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
    case 'ktable': case 'ctable': {
      const k = t === 'ktable', w = k ? 2.4 : 1.4, d = k ? 1.2 : .8, y = k ? .75 : .42;
      put(g, mesh(new THREE.BoxGeometry(w, .07, d), k ? '#E8DCC8' : '#6B4A3A'), 0, y, 0);
      for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) put(g, mesh(new THREE.BoxGeometry(.07, y, .07), '#4E4A6E'), a * (w / 2 - .1), y / 2, b * (d / 2 - .1));
      if (k) { put(g, mesh(flat(new THREE.CylinderGeometry(.06, .05, .12, 8)), '#FFFFFF'), -.5, .84, .2); put(g, mesh(flat(new THREE.CylinderGeometry(.2, .2, .03, 12)), '#FFFFFF'), .4, .8, -.1); }
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
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
}
/* ---------- Офіс: підлоги кімнат, стіни з дверима, таблички, меблі ---------- */
function floorBox(g, x0, z0, x1, z1, col, y) { const m = mesh(new THREE.BoxGeometry(x1 - x0, .02, z1 - z0), col, false, true); m.position.set((x0 + x1) / 2, y || .05, (z0 + z1) / 2); g.add(m); return m; }
function wallMeshes(g) {
  for (const w of WALLS) {
    const horiz = w.z1 === w.z2, H = w.tall ? 2.6 : w.outer ? 1.3 : 1.15;
    for (const [a, b] of wallParts(w)) {
      const len = b - a; if (len < .05) continue;
      const mx = horiz ? (a + b) / 2 : w.x1, mz = horiz ? w.z1 : (a + b) / 2, h = w.glass ? 2.2 : H;
      const m = mesh(new THREE.BoxGeometry(horiz ? len : .2, h, horiz ? .2 : len), w.glass ? mat('#BFE6FF', { transparent: true, opacity: .3 }) : w.outer ? '#D9D2EE' : '#ECE6FB', !w.glass);
      m.position.set(mx, h / 2, mz); g.add(m);
      const t = mesh(new THREE.BoxGeometry(horiz ? len : .26, .08, horiz ? .26 : len), w.glass ? '#4E4A6E' : '#9F8BE0', false); t.position.set(mx, h + .04, mz); g.add(t);
      if (!w.glass) { const sk = mesh(new THREE.BoxGeometry(horiz ? len : .24, .12, horiz ? .24 : len), '#8E86B0', false); sk.position.set(mx, .06, mz); g.add(sk); }   // плінтус
    }
    // одвірки й таблички над дверима
    for (const d of w.doors || []) {
      const H2d = (w.glass ? 2.2 : H) + .35;
      for (const s of [-1, 1]) put(g, mesh(new THREE.BoxGeometry(.24, H2d, .24), w.glass ? '#4E4A6E' : '#9F8BE0', false), horiz ? d + s * .95 : w.x1, H2d / 2, horiz ? w.z1 : d + s * .95);
      if (w.shut) {   // головний вхід зачинено: скляні двері
        put(g, mesh(new THREE.BoxGeometry(1.7, 2, .08), mat('#BFE6FF', { transparent: true, opacity: .45 }), false), d, 1, w.z1);
        const s = signPlane('ВХІД · 9:00–18:00', '#7FE08A', 2.4, .45, 'rgba(46,35,70,.9)'); s.position.set(d, 2.25, w.z1 + .14); g.add(s);
      } else if (horiz && !(w.glass && Math.abs(d - DOOR.x) < .1)) {
        // табличка кімнати, у яку ведуть двері (дивиться в коридор)
        const into = roomAt(d, w.z1 + (w.z1 < IZ ? -.6 : .6)); if (!into || into.id === 'hall') continue;
        const s = signPlane(into.n, '#FFD27A', 2, .42, 'rgba(46,35,70,.9)'); s.position.set(d, H2d + .25, w.z1 + .14); g.add(s);
      }
    }
  }
}
function buildFloor() {
  const g = new THREE.Group(); scene.add(g);
  // доріжка від входу й газон довкола
  floorBox(g, IX - HX - .6, IZ - HZ - .6, IX + HX + .6, IZ + HZ + .6, '#B9B4C8', .02);
  floorBox(g, IX - 15.2, IZ + HZ, IX - 12.8, IZ + ISL_R - 1.5, '#D6CFC0', .03);
  // підлоги кімнат: ковролін в офісах, плитка на кухні й у туалеті, паркет у боса й лаунжі
  for (const r of ROOMS) {
    const x0 = IX + r.x0, z0 = IZ + r.z0, x1 = IX + r.x1, z1 = IZ + r.z1;
    if (r.tiles) {
      const [a, b] = r.tiles === 1 ? ['#FFFFFF', '#DCD6EA'] : ['#E6F1F5', '#BFD9E2'];
      floorBox(g, x0, z0, x1, z1, a, .05);
      for (let x = x0; x < x1 - .01; x += 1) for (let z = z0; z < z1 - .01; z += 1) if ((Math.round(x - x0) + Math.round(z - z0)) % 2) floorBox(g, x, z, Math.min(x1, x + 1), Math.min(z1, z + 1), b, .056);
    } else floorBox(g, x0, z0, x1, z1, r.fl, .05);
  }
  for (let x = -16; x <= 16; x += 4) floorBox(g, IX + x - .6, IZ - .3, IX + x + .6, IZ - .2, '#FFE066', .062);   // розмітка в коридорі
  floorBox(g, CARPET.x - 2.2, CARPET.z - 1.2, CARPET.x + .6, CARPET.z + .4, '#C2335A', .065);                    // «килим» у боса
  floorBox(g, IX + 12.6, IZ - 11.8, IX + 16.4, IZ - 7.8, '#7A3A4A', .062);                                        // перський килим під столом
  floorBox(g, IX - 16.9, IZ + 7, IX - 15.5, IZ + 9.8, '#8C7FC2', .062);                                             // килимок у рецепції
  wallMeshes(g);
  // вікна в задній стіні й плакати
  for (let k = 0; k < 8; k++) put(g, mesh(new THREE.BoxGeometry(2.4, 1.1, .05), bulb('#BFE9FF'), false), IX - 15.75 + k * 4.5, 1.7, IZ - HZ + .13);
  [['KPI ↑↑↑', '#7FE08A', -10], ['ДЕДЛАЙН — ВЧОРА', '#FF6BD6', -1], ['МИ — СІМ’Я', '#FFD27A', 8]].forEach(([t, c, lx]) => { const p = signPlane(t, c, 2.6, .55, 'rgba(46,35,70,.92)'); p.position.set(IX + lx, 2.75, IZ - HZ + .14); g.add(p); });
  const neon = signPlane('ВІДДІЛ ПРОДАЖІВ', '#6BE7FF', 3.2, .5, 'rgba(46,35,70,.85)'); neon.position.set(IX - 15.75, 2.75, IZ - HZ + .14); g.add(neon);
  const clock = put(g, mesh(flat(new THREE.CylinderGeometry(.35, .35, .06, 16)), '#FFFFFF', false), IX + 3.5, 2.75, IZ - HZ + .15); clock.rotation.x = Math.PI / 2;
  // логотип на стіні рецепції
  const logo = signPlane('ТОВ «СИНЕРГІЯ»', '#FF6BD6', 3.4, .6, 'rgba(46,35,70,.9)'); logo.position.set(IX - HX + .14, 1.9, IZ + 8.4); logo.rotation.y = Math.PI / 2; g.add(logo);
  // табличка «БОС» і розсувні скляні двері кабінету
  const bs = signPlane('👔 БОС', '#FF5C7A', 1.6, .5, 'rgba(46,35,70,.9)'); bs.position.set(DOOR.x, 2.85, DOOR.z + .14); g.add(bs);
  V.door = put(scene, mesh(new THREE.BoxGeometry(1.7, 2.1, .06), mat('#BFE9FF', { transparent: true, opacity: .45 }), false), DOOR.x, 1.05, DOOR.z + .12); A.dynamic(V.door);
  // стійки старту й вибору ролі в рецепції
  for (const [p, t, c] of [[BOARD, '▶ СТАРТ', '#7FE08A'], [ROLE, '🎭 РОЛЬ', '#FFD27A']]) {
    put(g, mesh(new THREE.BoxGeometry(.08, 1.4, .08), '#4E4A6E'), p.x, .7, p.z);
    const sp = signPlane(t, c, 1.5, .5, 'rgba(46,35,70,.92)'); sp.position.set(p.x, 1.55, p.z + .05); g.add(sp);
  }
  // меблі
  for (const f of FURN) { const m = furnMesh(f.t); m.position.set(f.x, 0, f.z); m.rotation.y = f.rot; g.add(m); }
  return g;
}
/* ---------- Тверді стіни й меблі (і на сервері, і в гравців) ---------- */
A.on('world', () => {
  for (const w of WALLS) {
    const horiz = w.z1 === w.z2;
    for (const [a, b] of w.shut ? wallParts(Object.assign({}, w, { doors: [] })) : wallParts(w)) for (let t = a; t <= b + .01; t += .5) addStatic(horiz ? t : w.x1, horiz ? w.z1 : t, .3, 2.5);
  }
  for (const p of [BOARD, ROLE]) addStatic(p.x, p.z, .25, 1.4);
  for (const f of FURN) for (const c of circles(f)) addStatic(c.x, c.z, c.r, FT[f.t].h);
});

/* ---------- Події ---------- */
function onEvent(e) {
  if (SIMSIDE || !e) return;
  const here = running && inIsl(pl.x, pl.z), mine = e.who != null && e.who === myKey();
  if (e.k === 'msg') { if (here) toast(e.txt); }
  else if (e.k === 'start') {
    if (!here) return;
    V.joined = !!me() || ST.ro.some(q => q.k === myKey());
    const iBoss = e.boss === myKey();
    banner(iBoss ? '👔 Ти — БОС! Нарада 20 с… потім шукай ледарів.' : `🙈 Раунд ${e.rn}! Бос — ${escapeHTML(e.bn)}. Ховайся серед меблів (F)!`);
    sfx('ding'); V.shake = {};
  }
  else if (e.k === 'tp') { if (mine && running) { pl.x = +e.x; pl.z = +e.z; pl.y = 0; pl.vy = 0; pl.jump = null; pl.falling = false; } }
  else if (e.k === 'hunt') { if (here) { banner(amBoss() ? '🔎 Нарада скінчилась — шукай! ЛКМ по підозрілому, Q — Перевірка.' : '👔 Бос вийшов з наради! Не рухайся…'); sfx('warn'); } }
  else if (e.k === 'dis') { if (here && e.t && mine) { const p = mePos(); burst(p.x, .8, p.z, '#FFFFFF', 12, 3, .5, 2); ftext(p.x, 2.2, p.z, `${FT[e.t].ic} Я — ${FT[e.t].n.toLowerCase()}!`, 'calm'); sfx('pop'); } }
  else if (e.k === 'worked') { if (mine) { ftext(pl.x, 2.5, pl.z, '📈 Продуктивність 100%!', 'gold'); sfx('coin'); } }
  else if (e.k === 'caught') {
    if (!here) return;
    burst(+e.x, 1.2, +e.z, '#FF5C7A', 22, 5, .8, 4); ftext(+e.x, 2.6, +e.z, 'ПОПАВСЯ! 😵', 'crit'); sfx('crit', +e.x, +e.z); shake = Math.max(shake, .3);
    if (mine) { banner('😵 Попався! Іди на килим до боса — дивишся звідти до кінця раунду.'); V.work = null; }
    else if (e.by === myKey()) { banner(`🎯 Попався, ${escapeHTML(e.wn)}! Лишилось: ${alive().length}`); P.coins += 5; refreshHUD(); }
    else toast(`😵 ${escapeHTML(e.wn)} попався босові.`);
  }
  else if (e.k === 'miss') {
    if (!here) return;
    ftext(+e.x, 2.3, +e.z, FT[e.t] ? FT[e.t].miss : 'Нікого…', 'bad'); ftext(+e.x, 3, +e.z, `−${PENALTY} с ⏱`, 'bad'); sfx('hurt', +e.x, +e.z);
    burst(+e.x, 1, +e.z, '#FFD27A', 8, 3, .5, 2);
  }
  else if (e.k === 'check') {
    if (!here) return;
    ringFX(+e.x, +e.z, CHECK_R, '#FFD27A', .8); sfx('charge', +e.x, +e.z);
    for (const k of e.ks || []) V.shake[k] = gameTime + 2.5;
    for (const d of e.ds || []) V.shake['d' + d] = gameTime + 2.5;
    if ((e.ks || []).includes(myKey())) { banner('😬 Перевірка! Твій предмет труситься — бос дивиться…'); shake = Math.max(shake, .25); }
    else if (e.by === myKey()) toast(`🔎 Перевірка: трусяться ${(e.ks || []).length + (e.ds || []).length ? 'предмети поруч — дивись уважно!' : 'нічого поруч. Шукай далі.'}`);
  }
  else if (e.k === 'decoy') { if (mine) { toast('📄 Фейковий звіт лишено! Бос може на нього клюнути (−5 с йому).'); sfx('page'); } }
  else if (e.k === 'say') { const v = V.ents.get(e.who); if (v && here) bubble(v.ent, String(e.txt).slice(0, 60), /стояти|Попався/.test(e.txt), 2.6); }
  else if (e.k === 'end') finish(e);
}
function finish(e) {
  V.work = null; V.lastRes = e;
  const row = (e.ro || []).find(r => r[0] === myKey());
  if (inOffice(pl.x, pl.z) && running) { pl.x = SPAWN.x; pl.z = SPAWN.z; }
  if (!row || !running) { if (running && inIsl(pl.x, pl.z) && e.win !== 'none') toast(`🏁 Раунд скінчився: ${e.win === 'boss' ? 'бос усіх знайшов' : 'офісники вціліли'}.`); return; }
  const boss = !!row[1], caught = !!row[2], cc = e.cc | 0;
  const d = A.data(); d.rounds = (d.rounds || 0) + 1;
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
  banner(txt); toast(`Нагорода: <b>+${coins} 🪙</b> · +${xp} досвіду. Ще раунд — табличка ▶ СТАРТ (F). Роль боса переходить по колу.`);
  sfx(/🎉|👔 Усі/.test(txt) ? 'level' : 'ding'); refreshHUD(); save();
}

/* ---------- Хто де: позиції людей і ботів ---------- */
function remoteOf(k) { for (const id in NET.players) { const r = NET.players[id]; if (r.name === k) return r; } return null; }
function mePos() { return pl; }
function posC(e) {   // позиція учасника в гравця
  if (e.k === myKey()) return { x: pl.x, z: pl.z, m: pl.moving };
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
    if (e.bot) { const k = Math.min(1, dt * 10); v.ent.x = lerp(v.ent.x, e.x, k); v.ent.z = lerp(v.ent.z, e.z, k); v.f = lerpAng(v.f, e.f, k); p.x = v.ent.x; p.z = v.ent.z; }
    else { v.ent.x = p.x; v.ent.z = p.z; }
    const prop = !e.boss && !e.c ? e.p : '';
    setProp(v, prop);
    // людина: ховаємо, коли замаскована
    if (mine) { if (hero) hero.root.visible = hero.root.visible && !prop; }
    else if (p.r) { p.r.h.root.visible = p.r.h.root.visible && !prop; if (prop) p.r.tag.style.display = 'none'; }
    if (v.hum) {
      v.hum.root.visible = !prop;
      if (!prop) {
        v.hum.root.position.set(p.x, 0, p.z); v.hum.root.rotation.y = v.f;
        const sw = e.mv ? Math.sin(t * 10 + p.x) * .6 : 0;
        v.hum.l1.rotation.x = sw; v.hum.l2.rotation.x = -sw; v.hum.aL.rotation.x = -sw * .7; v.hum.aR.rotation.x = -.35 - sw * .3;
        if (e.w) { v.hum.aL.rotation.x = v.hum.aR.rotation.x = -1.3 + Math.sin(t * 22) * .15; }
        v.hum.body.position.y = e.c ? -.3 : e.mv ? Math.abs(Math.sin(t * 10)) * .06 : 0;
        if (e.c) { v.hum.aL.rotation.x = v.hum.aR.rotation.x = -.2; v.hum.body.rotation.x = .25; } else v.hum.body.rotation.x = 0;
      }
    }
    if (v.prop) {
      const sh = V.shake[e.k] > t, wob = p.m ? 1 : 0;
      v.prop.position.set(p.x, wob ? Math.abs(Math.sin(t * 13)) * .05 : 0, p.z);
      v.prop.rotation.set(sh ? Math.sin(t * 40) * .12 : 0, e.r + (sh ? Math.sin(t * 33) * .2 : 0), wob ? Math.sin(t * 14) * .08 : sh ? Math.cos(t * 37) * .1 : 0);
      if (sh && Math.random() < dt * 8) burst(p.x, .8, p.z, '#FFD27A', 1, 1.5, .3, 1);
    }
    // продуктивність на нулі: маскування блимає
    const blink = !!prop && e.pr <= 0;
    if (blink && !v.ring) { v.ring = new THREE.Group(); const rm = new THREE.Mesh(new THREE.TorusGeometry(.75, .08, 6, 24), new THREE.MeshBasicMaterial({ color: '#FF3355', transparent: true, opacity: .9, depthWrite: false })); rm.rotation.x = Math.PI / 2; v.ring.add(rm); put(v.ring, mesh(new THREE.SphereGeometry(.14, 8, 6), new THREE.MeshBasicMaterial({ color: '#FF3355' }), false), 0, 1.9, 0); scene.add(v.ring); }
    if (v.ring) { v.ring.visible = blink && Math.floor(t * 5) % 2 === 0; v.ring.position.set(p.x, .1, p.z); }
  }
  for (const k of [...V.ents.keys()]) if (!seen.has(k)) dropView(k);
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
  if (V.door) { const tx = DOOR.x + (ST.on && ST.ph === 'meet' ? 0 : 1.35); V.door.position.x = lerp(V.door.position.x, tx, Math.min(1, dt * 5)); }
}

/* ---------- Кожен кадр ---------- */
function clientTick(dt) {
  render(dt);
  if (!running) return;
  const here = inIsl(pl.x, pl.z);
  if (here && !pl.dead) {
    pl.safe = { x: SPAWN.x, z: SPAWN.z };
    // бос на нараді й спіймані — у кабінеті
    if ((amBoss() && ST.ph === 'meet') || amCaught()) { pl.x = clamp(pl.x, OFF.x0, OFF.x1); pl.z = clamp(pl.z, OFF.z0, OFF.z1); }
    updWork(dt);
    if (amHider() && myProp() && hero) hero.root.visible = false;
  }
  hud(); guide(); blindfold();
}
function updWork(dt) {
  if (!V.work) return;
  const w = V.work, e = me();
  if (!amHider() || !e) { V.work = null; return; }
  if (fdist(w.f, pl.x, pl.z) > 1.9) { V.work = null; req('work', { on: 0 }); toast('Відійшов від комп’ютера — робота не зарахована.'); return; }
  w.t += dt; pl.emote = 'sit'; pl.emoteT = .2;
  if (hero) hero.aR.rotation.x = hero.aL.rotation.x = -1.3 + Math.sin(gameTime * 22) * .15;
  if ((w.pt -= dt) <= 0) { w.pt = .5; ftext(pl.x, 2.4, pl.z, pick(['тиць-тиць ⌨️', 'Excel… 📊', 'відповів на лист ✉️', 'мітинг о 15:00 📅']), 'calm'); sfx('tick'); }
  if (w.t >= WORK_T) { V.work = null; req('work', { done: 1 }); }
}
function startWork(f) {
  if (V.work) return;
  V.work = { f, t: 0, pt: 0 }; req('work', { on: 1 }); sfx('page');
  toast('💻 Працюєш… стій поруч 3 с. Зараз тебе видно!');
}
/* засліплення боса під час наради */
function blindfold() {
  if (!V.blind) { V.blind = document.createElement('div'); V.blind.id = 'hb-blind'; V.blind.style.cssText = 'position:fixed;inset:0;z-index:1;pointer-events:none;display:none;align-items:center;justify-content:center;background:rgba(14,10,30,.94);color:#fff;font:800 22px/1.5 system-ui,sans-serif;text-align:center;padding:16px'; document.body.appendChild(V.blind); }
  const on = running && amBoss() && ST.ph === 'meet' && inIsl(pl.x, pl.z) && !panel;
  V.blind.style.display = on ? 'flex' : 'none';
  if (on) { const h = `🙈 НАРАДА<br><span style="font-size:15px;font-weight:600">«…і тому KPI мають рости». Ти нічого не бачиш ще <b>${Math.ceil(left())} с</b>.<br>Офісники ховаються серед меблів.</span>`; if (V.blind.innerHTML !== h) V.blind.innerHTML = h; }
}

/* ---------- Бос: «Попався!» і «Перевірка» ---------- */
function bossTarget() {
  const fx = pl.x + Math.sin(pl.face) * 1.1, fz = pl.z + Math.cos(pl.face) * 1.1;
  const ax = input.aimOk && dist2(input.ax, input.az, pl.x, pl.z) < 4 ? input.ax : fx, az = input.aimOk && dist2(input.ax, input.az, pl.x, pl.z) < 4 ? input.az : fz;
  let best = null, bd = 1e9;
  const consider = (o, reach, aimD) => { if (reach > 1.7) return; const s = aimD; if (s < bd) { bd = s; best = o; } };
  for (const e of alive()) { if (e.k === myKey()) continue; const p = posC(e); if (p) consider({ who: e.k, x: p.x, z: p.z }, dist2(p.x, p.z, pl.x, pl.z) - .4, dist2(p.x, p.z, ax, az) - .25); }
  for (const d of ST.dec) consider({ d: d.id, x: d.x, z: d.z }, dist2(d.x, d.z, pl.x, pl.z) - .4, dist2(d.x, d.z, ax, az));
  for (const f of FURN) { const r = fdist(f, pl.x, pl.z); if (r < 1.7) consider({ f: f.i, x: f.x, z: f.z }, r, fdist(f, ax, az) + .1); }
  return best;
}
function bossClick() {
  if (!amBoss() || ST.ph !== 'hunt') { if (amBoss()) toast('🙈 Ти ще на нараді…'); return; }
  const tg = bossTarget();
  pl.swingT = .22; pl.swingKind = 0; pl.atkCd = .45;
  if (!tg) { ftext(pl.x, 2.4, pl.z, 'Тут нікого…', 'calm'); return; }
  pl.face = Math.atan2(tg.x - pl.x, tg.z - pl.z);
  ftext(tg.x, 2.1, tg.z, '👉 Попався?!', 'crit'); sfx('whoosh', tg.x, tg.z);
  req('catch', tg.who != null ? { who: tg.who } : tg.d != null ? { d: tg.d } : { f: tg.f });
}
function bossCheck() {
  if (!amBoss() || ST.ph !== 'hunt') return;
  if (ST.cd > 0) { toast(`🔎 Перевірка перезаряджається: ${Math.ceil(ST.cd)} с`); return; }
  req('check'); bubble(pl, 'ПЕРЕВІРКА! Хто тут не працює?!', true, 2);
}
const _attack = attack;
attack = function () {
  if (!SIMSIDE && running && amIn() && inIsl(pl.x, pl.z)) { if (amBoss() && pl.atkCd <= 0 && !panel && !paused) bossClick(); return; }
  return _attack.apply(this, arguments);
};
const _useDrink = useDrink;
useDrink = function () {
  if (!SIMSIDE && running && amIn() && inIsl(pl.x, pl.z)) { if (amBoss()) bossCheck(); return; }
  return _useDrink.apply(this, arguments);
};
/* Q може забрати інший аддон (раніше чи пізніше за нас) — ланцюжком передаємо йому, коли не в раунді */
let _prevQ = ADDONS.keys.KeyQ;
const qKey = () => {
  if (running && amIn() && inIsl(pl.x, pl.z)) { if (amBoss()) bossCheck(); return; }
  if (_prevQ) return withAddon(_prevQ[0], () => addonRun(_prevQ[0], _prevQ[1]));
  return false;
};
A.key('KeyQ', qKey);
A.on('start', () => { const k = ADDONS.keys.KeyQ; if (k && k[1] !== qKey) { _prevQ = k; ADDONS.keys.KeyQ = [ADDONS.keys.KeyR[0], qKey]; } });
A.key('KeyR', () => { if (!running || !amHider() || !inIsl(pl.x, pl.z)) return false; placeDecoy(); });
function placeDecoy() {
  const e = me(); if (!e) return;
  if (e.dc) { toast('📄 Фейковий звіт уже використано в цьому раунді.'); return; }
  req('decoy');
}
/* у маскуванні — повільно, без ривків і стрибків */
const _updInput = updInput;
updInput = function () { _updInput.apply(this, arguments); if (!SIMSIDE && myProp()) { input.mx *= .35; input.mz *= .35; } if (!SIMSIDE && V.work) { input.mx = input.mz = 0; } };
const _dash = dash;
dash = function () { if (!SIMSIDE && myProp()) return; return _dash.apply(this, arguments); };
const _jumpPress = jumpPress;
jumpPress = function () { if (!SIMSIDE && myProp()) return; return _jumpPress.apply(this, arguments); };

/* ---------- F ---------- */
function nearFurn(filter, r) { let best = null, bd = r; for (const f of FURN) { if (filter && !filter(f)) continue; const d = fdist(f, pl.x, pl.z); if (d < bd) { bd = d; best = f; } } return best; }
const _getInteract = getInteract;
getInteract = function () {
  if (!SIMSIDE && running && !pl.dead && inIsl(pl.x, pl.z) && !pl.carry && !pl.ride) {
    const near = (o, r) => dist2(pl.x, pl.z, o.x, o.z) < r;
    if (amIn()) {
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
      if (f) return { l: `🎭 Замаскуватись: ${FT[f.t].ic} ${FT[f.t].n}`, fn: () => req('dis', { i: f.i }) };
      if (e.p) return { l: `🎭 Зняти маскування (${FT[e.p].ic} ${FT[e.p].n})`, fn: () => req('dis', { i: -1 }) };
      return null;
    }
    if (!ST.on && near(BOARD, 1.9)) return { l: `▶ Почати раунд «Сховайся від боса» (${V.pref === 'boss' ? 'я — 👔 бос' : 'я — 🙈 офісник'})`, fn: () => { req('start', { role: V.pref }); sfx('ding'); } };
    if (near(ROLE, 1.9)) return { l: `🎭 Хочу бути: ${V.pref === 'boss' ? '👔 БОСОМ → змінити на офісника' : '🙈 ОФІСНИКОМ → змінити на боса'} (коли граєш сам)`, fn: () => { V.pref = V.pref === 'boss' ? 'hider' : 'boss'; toast(V.pref === 'boss' ? '👔 Граєш босом проти ботів-офісників (якщо ти сам).' : '🙈 Граєш офісником проти бота-боса (якщо ти сам).'); sfx('ui'); } };
    if (ST.on && near(BOARD, 1.9)) return { l: `⏳ Раунд іде (${mmss(left())}) — чекай наступного`, fn: () => { } };
  }
  return _getInteract.apply(this, arguments);
};

/* ---------- Підказки: підписи місць, «що робити зараз» і стрілка до цілі ---------- */
const PLACES = [
  { id: 'start', p: BOARD, y: 2.3, t: () => '▶ СТАРТ (F)', on: () => !ST.on },
  { id: 'role', p: ROLE, y: 2.3, t: () => V.pref === 'boss' ? '🎭 Роль: 👔 бос' : '🎭 Роль: 🙈 офісник', on: () => !ST.on },
  // підписи кімнат (центр кімнати, над меблями)
  ...ROOMS.filter(r => r.id !== 'hall').map(r => ({ id: 'room:' + r.id, p: W((r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2), y: 2.4, room: 1, t: () => r.n })),
];
function nearestF(filter) { let b = null, bd = 1e9; for (const f of FURN) if (filter(f)) { const d = dist2(pl.x, pl.z, f.x, f.z); if (d < bd) { bd = d; b = f; } } return b; }
function goal() {
  if (!ST.on) return { id: 'start', tg: BOARD, txt: `Підійди до <b>▶ СТАРТ</b> і натисни <b>F</b>. ${Object.keys(NET.players).length ? 'Усі в офісі грають разом, бос — по черзі.' : `Сам граєш ${V.pref === 'boss' ? '<b>босом</b> проти ботів' : '<b>офісником</b> проти бота-боса'} (змінити — табличка 🎭 РОЛЬ).`}` };
  const e = me();
  if (!e) return { txt: `Раунд іде (${mmss(left())}) — ти глядач. Дочекайся наступного й натисни ▶ СТАРТ.` };
  if (e.boss) {
    if (ST.ph === 'meet') return { txt: `🙈 Нарада ще ${Math.ceil(left())} с. Потім — шукай офісників серед меблів!` };
    return { txt: `🔎 Шукай офісників: <b>ЛКМ / F</b> по підозрілому предмету — «Попався!». <b>Q</b> — Перевірка${ST.cd > 0 ? ` (${Math.ceil(ST.cd)} с)` : ''}. Промах — <b>−${PENALTY} с</b>! Лишилось: ${alive().length}` };
  }
  if (e.c) return { txt: '😵 Ти попався. Стоїш на килимі в боса — дивись, як ховаються інші.' };
  if (V.work) return { txt: `💻 Працюю ${Math.round(V.work.t / WORK_T * 100)}% — стій біля комп’ютера! Тебе видно.` };
  if (e.pr < 30 && ST.ph === 'hunt') { const d = nearestF(f => f.t === 'desk'); return { id: 'desk', tg: workSpot(d), txt: `📉 Продуктивність ${Math.round(e.pr)}%! Біжи до <b>💻 комп’ютера</b> (${roomAt(d.x, d.z).n}) і натисни F (3 с). ${e.pr <= 0 ? '<b style="color:#C2335A">Маскування блимає!</b>' : ''}` }; }
  if (!e.p) { const f = nearestF(f => FT[f.t].dis && !inOffice(f.x, f.z)); return { id: 'hide', tg: f, txt: `${ST.ph === 'meet' ? `Бос на нараді ще <b>${Math.ceil(left())} с</b>! ` : ''}${f ? `Найближче — ${FT[f.t].ic} у кімнаті «${roomAt(f.x, f.z).n}». ` : ''}Підійди до меблів і натисни <b>F</b> — замаскуйся (крісло, фікус, кулер, коробка…).` }; }
  return { txt: `Ти — ${FT[e.p].ic} <b>${FT[e.p].n.toLowerCase()}</b>. Не рухайся — рух видно! ${e.dc ? '' : '<b>R</b> — фейковий звіт (1 раз). '}Продуктивність ${Math.round(e.pr)}%.` };
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
  const show = running && !pl.dead && !panel && inIsl(pl.x, pl.z) && !(amBoss() && ST.ph === 'meet');
  V.lbl.style.display = show ? '' : 'none';
  const g = show ? goal() : { txt: '' }; V.goal = g;
  V.gArrow.visible = V.gMark.visible = !!(show && g.tg);
  if (!show) { for (const [, el] of V.blbl) el.style.display = 'none'; return; }
  const pos = (el, x, y, z) => { const q = screenPos(x, y, z); el.style.display = q.vis ? '' : 'none'; el.style.transform = `translate(${Math.round(q.x)}px,${Math.round(q.y)}px) translate(-50%,-100%)`; };
  for (const P of PLACES) {
    const on = (!P.on || P.on()) && P.id !== g.id;
    P.el.style.opacity = on ? (P.room ? .85 : dist2(pl.x, pl.z, P.p.x, P.p.z) < 8 ? 1 : .6) : 0;
    if (on) { const t = P.t(); if (P.el.textContent !== t) P.el.textContent = t; pos(P.el, P.p.x, P.y, P.p.z); }
  }
  // підписи ботів і боса (замаскованих — не видно)
  const want = new Set();
  for (const e of ST.on ? ST.ro : []) {
    if (e.k === myKey() || (!e.bot && !e.boss) || (e.p && !e.boss && !e.c)) continue;
    const p = posC(e); if (!p) continue;
    want.add(e.k);
    let el = V.blbl.get(e.k); if (!el) { el = document.createElement('div'); el.className = 'hb-lbl' + (e.boss ? ' boss' : ''); V.lbl.appendChild(el); V.blbl.set(e.k, el); }
    const t = e.boss ? `👔 ${e.bot ? e.n : 'БОС'}` : e.c ? `😵 ${e.n}` : e.w ? `💻 ${e.n}` : e.n;
    if (el.textContent !== t) el.textContent = t; pos(el, p.x, e.boss ? 2.9 : 2.5, p.z);
  }
  for (const [k, el] of V.blbl) if (!want.has(k)) { el.remove(); V.blbl.delete(k); }
  V.glbl.style.opacity = g.tg ? 1 : 0;
  if (g.tg) {
    const P = PLACES.find(q => q.id === g.id), t = '👉 ' + (P ? P.t() : g.id === 'desk' ? '💻 Попрацюй тут (F)' : g.id === 'hide' ? `${FT[g.tg.t] ? FT[g.tg.t].ic : ''} Сховайся тут (F)` : 'Сюди');
    if (V.glbl.textContent !== t) V.glbl.textContent = t; pos(V.glbl, g.tg.x, 2.6, g.tg.z);
    const d = dist2(pl.x, pl.z, g.tg.x, g.tg.z);
    V.gMark.position.set(g.tg.x, .1, g.tg.z); V.gMark.scale.setScalar(1 + Math.sin(gameTime * 5) * .12);
    V.gArrow.visible = d > 2.2; V.gArrow.position.set(pl.x, .15, pl.z); V.gArrow.rotation.y = -Math.atan2(g.tg.z - pl.z, g.tg.x - pl.x);
  }
}
/* коротка інструкція при першому вході */
function intro(force) {
  const d = A.data(); if ((d.intro && !force) || SIMSIDE || document.getElementById('hb-intro')) return;
  const el = document.createElement('div'); el.id = 'hb-intro';
  el.style.cssText = 'position:fixed;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;background:rgba(20,12,40,.55);padding:16px';
  el.innerHTML = `<div style="max-width:460px;width:100%;max-height:90vh;overflow:auto;background:#2E2346;color:#fff;border-radius:18px;padding:18px 20px;font:14px/1.5 system-ui,sans-serif;box-shadow:0 12px 40px rgba(0,0,0,.4)">
    <div style="font:800 20px system-ui;margin-bottom:8px">🙈 Сховайся від боса — як грати</div>
    <div>1. <b>▶ СТАРТ</b> (F біля таблички). Один — 👔 <b>бос</b>, решта — 🙈 <b>офісники</b>. Сам — граєш проти ботів (табличка 🎭 РОЛЬ).</div>
    <div>2. <b>Офісник</b>: F біля меблів — маскуєшся під них. Рухатись можна, але повільно, і предмет хитається — бос помітить!</div>
    <div>3. 📉 <b>Продуктивність</b> тане. Поповни: F біля 💻 комп’ютера, 3 с — у цей час тебе видно. На нулі — маскування блимає. <b>R</b> — фейковий звіт-приманка (1 раз).</div>
    <div>4. <b>Бос</b>: 20 с наради (нічого не видно), потім 3 хв полювання. <b>ЛКМ / F</b> — «Попався!», промах по справжньому предмету — −5 с. <b>Q</b> — Перевірка: замасковані поруч трусяться.</div>
    <div>5. Спійманий іде на килим у кабінет боса й дивиться звідти. Усіх спіймано — виграв бос; час вийшов — виграли ті, хто вцілів.</div>
    <div style="margin-top:8px;color:#FFE066">Жовта стрілка й мітка показують, куди йти зараз. Підказка — внизу екрана 👇</div>
    <button class="btn" style="margin-top:12px;width:100%">Зрозуміло, ховаюсь!</button></div>`;
  document.body.appendChild(el);
  el.querySelector('button').addEventListener('click', () => { el.remove(); d.intro = 1; save(); });
}

/* ---------- HUD: роль, таймер, хто лишився, продуктивність ---------- */
function hud() {
  if (!V.hud) {
    V.goalEl = document.createElement('div'); V.goalEl.id = 'hideboss-goal';
    V.goalEl.style.cssText = 'position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 150px);transform:translateX(-50%);z-index:2;pointer-events:none;background:#FFE066;color:#2E2346;border-radius:12px;padding:7px 14px;font:700 14px/1.4 system-ui,sans-serif;text-align:center;box-shadow:0 6px 18px rgba(0,0,0,.25);width:max-content;max-width:min(560px,90vw)';
    document.body.appendChild(V.goalEl);
    V.hud = document.createElement('div'); V.hud.id = 'hideboss-hud';
    V.hud.style.cssText = 'position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 64px);transform:translateX(-50%);z-index:3;pointer-events:none;background:rgba(46,35,70,.88);color:#fff;border-radius:14px;padding:7px 14px;font:700 13px/1.4 system-ui,sans-serif;text-align:center;box-shadow:0 6px 18px rgba(0,0,0,.25);max-width:94vw';
    document.body.appendChild(V.hud);
  }
  const show = running && !pl.dead && !panel && inIsl(pl.x, pl.z);
  V.hud.style.display = show ? '' : 'none'; V.goalEl.style.visibility = show ? '' : 'hidden';
  if (!show) return;
  let h;
  if (ST.on) {
    const e = me(), all = hiders().length, al = alive().length, lt = left();
    const role = !e ? '👀 глядач' : e.boss ? '👔 БОС' : e.c ? '😵 спійманий' : '🙈 офісник';
    const tm = ST.ph === 'meet' ? `🙈 нарада ${Math.ceil(lt)} с` : `⏱ <span style="color:${lt < 30 ? '#FF8A7A' : '#fff'}">${mmss(lt)}</span>`;
    let sub = '';
    if (e && !e.boss && !e.c) {
      const pr = Math.round(e.pr), col = pr > 50 ? '#7FE08A' : pr > 25 ? '#FFD27A' : '#FF5C7A';
      sub = `Продуктивність <span style="color:${col}">${'■'.repeat(Math.ceil(pr / 10))}</span><span style="opacity:.3">${'■'.repeat(10 - Math.ceil(pr / 10))}</span> ${pr}%${e.p ? ` · ${FT[e.p].ic} ${FT[e.p].n}` : ' · <span style="color:#FF8A7A">не замаскований</span>'}${e.dc ? '' : ' · R — 📄 звіт'}${V.work ? ` · 💻 ${Math.round(V.work.t / WORK_T * 100)}%` : ''}`;
    } else if (e && e.boss) sub = ST.ph === 'meet' ? 'чекаєш, поки всі сховаються…' : `ЛКМ / F — «Попався!» · Q — Перевірка ${ST.cd > 0 ? `<span style="color:#FFD27A">${Math.ceil(ST.cd)} с</span>` : '<span style="color:#7FE08A">готова</span>'} · промах −${PENALTY} с`;
    const b = bossE();
    h = `🙈 ХОВАНКИ · раунд ${ST.rn} · ${role} · ${tm} · 👥 вціліли ${al}/${all}${b && (!e || !e.boss) ? ` · 👔 ${escapeHTML(b.n)}` : ''}${sub ? `<br><span style="font-weight:600;font-size:12px">${sub}</span>` : ''}`;
  } else {
    const sc = Object.entries(ST.sc).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n, p]) => `${escapeHTML(n === 'me' ? 'Ти' : n)} ${p}`).join(' · ');
    h = `🙈 Сховайся від боса · <span style="font-weight:600">чекаємо старту — табличка ▶ СТАРТ</span>${sc ? `<br><span style="font-weight:600;font-size:12px">🏆 ${sc}</span>` : ''}`;
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
    const lvl = !ST.on ? 0 : (bossNear() || (ST.ph === 'hunt' && left() < 30)) ? 2 : 1;
    if (s === 0 && V.music !== lvl) { V.music = lvl; const m = [{ keys: .8, bass: .5, drums: .3, tension: 0, lead: .15, crackle: .1 }, { keys: .85, bass: .8, drums: .55, tension: .15, lead: .3, crackle: 0 }, { keys: .7, bass: 1, drums: .9, tension: .75, lead: .35, crackle: 0 }][lvl]; for (const k in m) if (LAYER[k]) LAYER[k].gain.setTargetAtTime(m[k], t, .4); }
    const [root, ch] = HPROG[bar % 4];
    // піцикато: короткі щипки, крадькома
    const n = SNEAK[s]; if (n && (lvl || s % 4 === 0)) pluck(t, n + (lvl === 2 ? 12 : 12) + (bar % 4 === 3 ? -1 : 0), lvl === 2 ? .09 : .07, LAYER.keys);
    if (s % 4 === 0) bassNote(t, root - (s === 8 ? 5 : 0), STEP * .6, lvl ? .4 : .28);
    if (s === 0) ch.forEach((q, k) => pluck(t + k * .015, q, .04, LAYER.keys));
    if (lvl) { if (s === 0 || s === 10) kick(t, .5); if (s === 4 || s === 12) hat(t, .05, true); else if (s % 2 === 0) hat(t, .025); }
    if (lvl === 2) { if (s % 2 === 0) pulse(t, root + 24 + (s % 8 === 6 ? 1 : 0), STEP * .8, .05); if (s === 8) snare(t, .2); hat(t + h, .02); }
    if (!lvl && s === 8 && bar % 2) marimba(t, pick(ch) + 12, .04);
  };
}

/* ---------- Режим у паузі, вкладка, картка в меню ---------- */
function goHide() { const f = $('#fade'); closePanel(); if (f) f.style.opacity = 1; sfx('travel'); setTimeout(() => { pl.x = SPAWN.x; pl.z = SPAWN.z; pl.y = 0; pl.falling = false; pl.jump = null; pl.safe = { x: SPAWN.x, z: SPAWN.z }; camPos.set(pl.x, 20, pl.z + 15); camLook.set(pl.x, .5, pl.z); if (f) f.style.opacity = 0; toast('🙈 Сховайся від боса! Жовта стрілка показує, куди йти. Старт — табличка ▶ СТАРТ (F).'); intro(); }, 260); return true; }
function leaveHide() { if (amIn()) { if (typeof confirm === 'function' && !window.__ADDON_TEST && !confirm('Раунд іде. Вийти з офісу?')) return false; req('leave'); } V.work = null; if (hero) hero.root.visible = true; return true; }
if (A.mode) A.mode({ id: 'hideboss', ic: '🙈', n: 'Сховайся від боса', sub: 'хованки в офісі: бос проти офісників-меблів', go: goHide, here: () => running && inIsl(pl.x, pl.z), leave: leaveHide });
A.tab('hideboss', '🙈 Хованки', () => {
  const d = A.data(), here = inIsl(pl.x, pl.z);
  const sc = Object.entries(ST.sc).sort((a, b) => b[1] - a[1]);
  return `<h3>🙈 Сховайся від боса · Хованки</h3>
    <p style="font-size:13px;line-height:1.5;margin:4px 0 10px">Prop Hunt в офісі на 2–6 гравців. Бос шукає ледачих офісників, що прикинулись меблями. Сам — граєш проти ботів.</p>
    <div class="btns"><button class="btn alt" data-hb="help">❓ Як грати</button>${here ? (ST.on ? '' : '<button class="btn" data-hb="hider">🙈 Раунд офісником</button><button class="btn" data-hb="boss">👔 Раунд босом</button>') : '<button class="btn" data-hb="go">🙈 В офіс</button>'}</div>
    <div class="list" style="margin-top:10px;font-size:13px;line-height:1.55">
      <div>🙈 <b>Офісник</b>: F біля меблів — маскуєшся (крісло, фікус, кулер, ксерокс, шафа, коробка, смітник, кавомашина, диван). Рух у маскуванні повільний і хитає предмет. R — фейковий звіт (1 раз).</div>
      <div>📉 <b>Продуктивність</b> тане ~75 с. F біля 💻 комп’ютера, 3 с — 100%, але тебе видно. На нулі — маскування блимає.</div>
      <div>👔 <b>Бос</b>: 20 с наради в скляному кабінеті, потім 3 хв. ЛКМ / F — «Попався!», промах по меблях — −5 с. Q — Перевірка (перезарядка ${CHECK_CD} с).</div>
      <div>😵 Спійманий — на килим у кабінет боса, дивиться до кінця раунду. Роль боса — по колу.</div>
    </div>
    ${sc.length ? `<h3 style="margin-top:12px">🏆 Табло</h3><div class="list" style="font-size:13px">${sc.map(([n, p], i) => `<div>${i + 1}. <b>${escapeHTML(n === 'me' ? 'Ти' : n)}</b> — ${p}</div>`).join('')}</div>` : ''}
    <p class="muted" style="font-size:12px;margin-top:10px">Раундів: ${d.rounds || 0} · пересидів боса: ${d.survived || 0} · спіймали тебе: ${d.caught || 0} · босом: ${d.bossRounds || 0} (перемог ${d.bossWins || 0}) · спіймав офісників: ${d.catches || 0}</p>`;
}, e => {
  const b = e.target.closest('[data-hb]'); if (!b) return;
  const a = b.dataset.hb;
  if (a === 'help') { closePanel(); intro(true); } else if (a === 'go') goHide(); else { V.pref = a; req('start', { role: a }); closePanel(); }
});
if (!SIMSIDE && typeof document !== 'undefined') {
  const box = document.querySelector('#main-menu .mm-container');
  if (box && !document.getElementById('mm-hideboss')) {
    const card = document.createElement('div'); card.className = 'mm-card'; card.id = 'mm-hideboss';
    card.innerHTML = `<div class="mm-img-wrap"><div class="mm-card-img" style="background-image:url('menu/hideboss-bg.jpg'),url('addons/hideboss/hideboss-bg.jpg'),linear-gradient(160deg,#5E6FD8,#8C6FD0 55%,#FF9C8A)"></div></div>
      <div class="mm-card-body"><h2>ХОВАНКИ</h2><div class="mm-subtitle">Сховайся від боса</div>
      <div class="mm-desc">Прикинься фікусом, поки бос шукає ледарів. Prop Hunt в офісі на 2–6 гравців або проти ботів.</div></div>`;
    const locked = [...box.children].filter(c => c.classList.contains('mm-locked')).pop();
    box.insertBefore(card, locked || null);
    card.addEventListener('click', () => {
      V.auto = true; if (running) goHide();
      const mm = document.getElementById('main-menu'); if (mm) { mm.classList.add('mm-hide'); mm.addEventListener('transitionend', () => mm.remove(), { once: true }); }
    });
  }
}
A.on('start', () => { if (V.auto && !SIMSIDE) setTimeout(goHide, 700); });
if (window.__ADDON_TEST) window.__hideboss = { NAV, navFree, ROOMS, WALLS, cellOf, ST, AU, V, FURN, FT, DESKS, BOARD, ROLE, SPAWN, OFF, CARPET, BOSS_SPOT, MEET, DUR, req, goal, intro, me, bossE, alive, hiders, bossTarget, bossClick, fdist, workSpot, hideSpots, route, endRound, inOffice };
