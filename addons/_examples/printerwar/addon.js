/* Аддон «Битва за принтер» v2 (PVP, «цар гори», 5 учасників: люди + боти). Тепер — на високих поверхах хмарочоса в центрі міста.
   В офісі один принтер на всіх, а звіт потрібен кожному. Хто стоїть біля принтера САМ — той друкує сторінки.
   - Три поверхи: 42 · Копі-центр (скляна копі-кімната в центрі), 57 · Опенспейс-лабіринт (принтер на колесах
     їздить по жовтій колії), 63 · Серверна (ДВА принтери, працює лише один — перемикаються кожні 25 с).
   - Лобі — вікно з картками поверхів: клік по картці — голос, «✅ Я готовий». Після першого «готовий» боти по одному
     доповнюють лобі до 5 учасників; повне лобі + всі люди готові → «старт за 3…2…1» (онлайн: неготових 25 с — без них).
   - Снаряди треба ЗНАЙТИ: ✈️ лотки з папером, 📘 книжкові шафи, 🧻 смітники (F — набрати). Папірець у смітник — 🪙/XP.
   - Стій у зоні принтера сам: +сторінки. Двоє й більше — «ділимо принтер», ніхто не друкує.
   - ЛКМ / R — штовхнути. Крісла й коробки: F підняти, Q кинути.
   - Події: зажувало (F — бонус), ВИБУХ ТОНЕРА (чорна ковзанка навколо принтера), дощ зі сторінок (пачки паперу —
     можна жбурнути в обличчя суперникові, а купи паперу — щоб у них заритися), «Начальник іде!».
   - Свої ідеї: ⚡ картридж-турбо (×2 друк 10 с), 🚨 кнопка тривоги (викликає начальника), 🔥 комбо за довге утримання.
   - 2,5 хвилини або 100 сторінок. У спільному світі все рахує сервер.
   Картинку для меню поклади поруч: addons/printerwar/printerwar-bg.jpg (або menu/printerwar-bg.jpg). */
const A = Addon.info({ name: 'Битва за принтер', version: '2.0', desc: 'PVP «цар гори» на поверхах хмарочоса: три поверхи, тонерна ковзанка, бої пачками паперу, картридж-турбо, кнопка тривоги, боти-офісники.' });

const SIMSIDE = !!window.__SIM;
const AUTH = () => SIMSIDE || !(typeof WORLD !== 'undefined' && WORLD.on);
const ZONE = 2.6, GOAL = 100, DUR = 150, MAXP = 5, AUTOGO = 25, SWITCH = 25, RSPD = .8, SLIME_R = 4.3, SLIME_T = 18;
const COL = ['#FF6BD6', '#6BE7FF', '#FFE066', '#7FE08A', '#FFA552'];
const NC = COL.length;
const VY = -440, VXS = [300, 440, 580];

/* ---------- Три поверхи (локальні координати від центру поверху) ---------- */
// стіна: відрізок уздовж осі; doors — центри прорізів (1,8 м); glass — скло; part — низька перегородка кабінок
const W1 = [
  { x1: -17, z1: -13, x2: 17, z2: -13, col: '#D9D2EE' }, { x1: -17, z1: 13, x2: 17, z2: 13, col: '#D9D2EE' }, { x1: -17, z1: -13, x2: -17, z2: 13, col: '#D9D2EE' }, { x1: 17, z1: -13, x2: 17, z2: 13, col: '#D9D2EE' },
  { x1: -4.5, z1: -3.5, x2: -4.5, z2: 3.5, doors: [0], glass: 1 }, { x1: 4.5, z1: -3.5, x2: 4.5, z2: 3.5, doors: [0], glass: 1 },
  { x1: -4.5, z1: -3.5, x2: 4.5, z2: -3.5, doors: [0], glass: 1 }, { x1: -4.5, z1: 3.5, x2: 4.5, z2: 3.5, doors: [0], glass: 1 },
  { x1: -17, z1: -7, x2: 17, z2: -7, doors: [-12, -4, 4, 10] }, { x1: -17, z1: 7, x2: 17, z2: 7, doors: [-12, -6.5, 0, 6.5, 10] },
  { x1: -8, z1: -7, x2: -8, z2: 7, doors: [0] }, { x1: 8, z1: -7, x2: 8, z2: 7, doors: [0] },
  { x1: 0, z1: -13, x2: 0, z2: -7, doors: [-10], glass: 1 }, { x1: -5, z1: 7, x2: -5, z2: 13, doors: [10] }, { x1: 5, z1: 7, x2: 5, z2: 13, doors: [10], glass: 1 },
];
const F1 = [];
for (const z of [-12.2, -9.3]) for (const x of [-15.4, -13.8, -10.2, -8.6, -7, -2.6]) F1.push(['desk', x, z, 0]);
for (const x of [15.9, 13.2]) for (const z of [-5.4, -3.8, -2.2, 2.2, 3.8, 5.4]) F1.push(['desk', x, z, -Math.PI / 2]);
F1.push(['mtable', 8.5, -10, 0], ['tv', 16.8, -10, -Math.PI / 2], ['board', 3, -12.85, 0], ['plant', 1, -12.2, 0], ['plant', 16.2, -7.8, 0]);
for (let x = 5.7; x <= 11.4; x += 1.4) F1.push(['chair', x, -11.25, 0], ['chair', x, -8.75, Math.PI]);
F1.push(['reception', -14.6, 0, 0], ['sofa', -12.5, -6.3, 0], ['sofa', -12.5, 6.3, Math.PI], ['plant', -16.2, -6.2, 1], ['plant', -16.2, 6.2, 1], ['cooler', -8.7, -4.5, 0]);
F1.push(['counter', -11, 12.45, Math.PI], ['fridge', -16.45, 8.2, Math.PI / 2], ['ktable', -10.5, 9.6, 0], ['chair', -11.4, 8.8, 0], ['chair', -9.6, 8.8, 0], ['chair', -11.4, 10.4, Math.PI], ['chair', -9.6, 10.4, Math.PI]);
F1.push(['sofa', -1, 12.3, Math.PI], ['sofa', -4.2, 10.3, Math.PI / 2], ['ctable', -1, 10.4, 0], ['plant', 4.3, 12.3, 1], ['tv', -1, 7.25, 0]);
F1.push(['boss', 12.5, 11.1, 0], ['shelf', 16.6, 9.6, -Math.PI / 2], ['plant', 16.2, 12.3, 1], ['plant', 5.8, 12.3, 1], ['sofa', 8, 12.3, Math.PI, '#6B4A3A']);
F1.push(['rack', -16.4, -4.2, Math.PI / 2], ['rack', -16.4, -3.4, Math.PI / 2]);   // серверна шафа в кутку рецепції
// ✈️ лотки з папером (літачки), 📘 книжкові шафи, 🧻 смітники з мʼятим папером — видимі точки, де брати «снаряди»
F1.push(['tray', -3.7, 2.7, 0], ['tray', -.8, -7.9, 0], ['tray', 9.1, -6.2, 0], ['books', 13.6, -12.6, 0], ['books', -16.6, 3.6, Math.PI / 2], ['bin', -5.7, 7.8, 0], ['bin', -4.8, -12.4, 0], ['bin', 7.4, -3.4, 0]);
F1.push(['pshelf', -3.7, -2.7, Math.PI / 2], ['pshelf', 3.7, -2.7, -Math.PI / 2], ['cooler', 3.8, 2.8, 0], ['plant', -7.4, -6.4, 0], ['plant', 7.4, -6.4, 0], ['plant', -7.4, 6.4, 0], ['plant', 7.4, 6.4, 0]);

const W2 = [
  { x1: -18, z1: -14, x2: 18, z2: -14, col: '#D8EFE9' }, { x1: -18, z1: 14, x2: 18, z2: 14, col: '#D8EFE9' }, { x1: -18, z1: -14, x2: -18, z2: 14, col: '#D8EFE9' }, { x1: 18, z1: -14, x2: 18, z2: 14, col: '#D8EFE9' },
  { x1: -12, z1: -14, x2: -12, z2: 14, doors: [-8, 8], col: '#E6F4F1' }, { x1: 12, z1: -14, x2: 12, z2: 14, doors: [-8, 8], glass: 1 },
  { x1: -18, z1: 0, x2: -12, z2: 0, doors: [-15], col: '#E6F4F1' }, { x1: 12, z1: 0, x2: 18, z2: 0, doors: [15], col: '#E6F4F1' },
  // кабінки-лабіринт: низькі помаранчеві перегородки
  { x1: -6.9, z1: -7.4, x2: 6.9, z2: -7.4, doors: [-4.8, 1.1], part: 1 }, { x1: -6.9, z1: 7.4, x2: 6.9, z2: 7.4, doors: [-1.1, 4.8], part: 1 },
  { x1: -6.9, z1: -7.4, x2: -6.9, z2: 7.4, doors: [-5, 5], part: 1 }, { x1: 6.9, z1: -7.4, x2: 6.9, z2: 7.4, doors: [-5, 5], part: 1 },
  { x1: 0, z1: -7.4, x2: 0, z2: -2.5, part: 1 }, { x1: 0, z1: 2.5, x2: 0, z2: 7.4, part: 1 },
  { x1: -6.9, z1: -2.5, x2: -2.6, z2: -2.5, part: 1 }, { x1: 2.6, z1: -2.5, x2: 6.9, z2: -2.5, part: 1 },
  { x1: -6.9, z1: 2.5, x2: -2.6, z2: 2.5, part: 1 }, { x1: 2.6, z1: 2.5, x2: 6.9, z2: 2.5, part: 1 },
];
const F2 = [];
for (let k = 0; k < 12; k++) { if (k !== 5 && k !== 6) F2.push(['desk', -10.2 + k * 1.8, -13.1, 0]); F2.push(['desk', -10.2 + k * 1.8 + .6, 13.1, Math.PI]); }
F2.push(['plant', -.3, -13.3, 1], ['plant', 1.5, -13.3, 1], ['shelf', .6, -13.6, 0, 1.2]);
F2.push(['desk', -3, -6.6, 0], ['desk', -1.4, -6.6, 0], ['desk', 3, -6.6, 0], ['desk', 4.6, -6.6, 0], ['desk', -3, 6.6, Math.PI], ['desk', -4.6, 6.6, Math.PI], ['desk', 3, 6.6, Math.PI], ['desk', 1.4, 6.6, Math.PI]);
F2.push(['island', 0, 0, 0], ['chair', -.8, 1, Math.PI], ['chair', .8, 1, Math.PI], ['beanbag', -5.6, -1.2, 0], ['beanbag', -5.6, 1.2, 0], ['plant', -6.3, 0, 0], ['board', 6.75, 0, -Math.PI / 2, 2.4], ['chair', 5, -.8, Math.PI / 2], ['chair', 5, .8, Math.PI / 2]);
F2.push(['lift', -17.9, -11, Math.PI / 2], ['lift', -17.9, -7.5, Math.PI / 2], ['sofa', -15, -13.3, 0, '#4FA3A0'], ['plant', -12.7, -13.3, 1]);
F2.push(['counter', -17.4, 7, Math.PI / 2], ['fridge', -17.4, 11.8, Math.PI / 2], ['ktable', -14.6, 7.2, 0], ['chair', -15.5, 6.4, 0], ['chair', -13.7, 6.4, 0], ['chair', -15.5, 8, Math.PI], ['chair', -13.7, 8, Math.PI], ['plant', -12.7, 13.3, 1], ['cooler', -17.4, 2.5, 0]);
F2.push(['ktable', 15, -8.5, 0], ['chair', 14.1, -9.3, 0], ['chair', 15.9, -9.3, 0], ['chair', 14.1, -7.7, Math.PI], ['chair', 15.9, -7.7, Math.PI], ['tv', 17.85, -8.5, -Math.PI / 2], ['shelf', 15, -13.6, 0, 2], ['mic', 14.4, -8.5, 0], ['mic', 15.6, -8.5, 0]);
F2.push(['rack', -17.3, -3.4, Math.PI / 2], ['rack', -17.3, -2.6, Math.PI / 2]);   // серверна шафа біля ліфтів
F2.push(['tray', -11.4, -3, 0], ['tray', 11.4, 3, 0], ['tray', -6.2, -6.7, 0], ['books', -17.5, -5.2, Math.PI / 2], ['books', 17.5, -5.6, -Math.PI / 2], ['bin', -12.6, 3.5, 0], ['bin', 11.3, -12.4, 0], ['bin', -11.3, 12.4, 0]);
F2.push(['beanbag', 14, 4, 0], ['beanbag', 16.3, 4, 0], ['beanbag', 14, 10, 0], ['beanbag', 16.3, 10, 0], ['ctable', 15.2, 7, 0], ['sofa', 15, 13.3, Math.PI, '#F2A65A'], ['plant', 17.3, 1, 0], ['plant', 12.7, 13.3, 1]);

const W3 = [
  { x1: -18, z1: -13, x2: 18, z2: -13, col: '#B9C2DE' }, { x1: -18, z1: 13, x2: 18, z2: 13, col: '#B9C2DE' }, { x1: -18, z1: -13, x2: -18, z2: 13, col: '#B9C2DE' }, { x1: 18, z1: -13, x2: 18, z2: 13, col: '#B9C2DE' },
  { x1: -12, z1: -13, x2: -12, z2: 13, doors: [-6, 6], col: '#C9D3EA' }, { x1: 12, z1: -13, x2: 12, z2: 13, doors: [-6, 6], col: '#C9D3EA' },
  { x1: -18, z1: 0, x2: -12, z2: 0, doors: [-15], col: '#C9D3EA' }, { x1: 12, z1: 0, x2: 18, z2: 0, doors: [15], col: '#C9D3EA' },
  { x1: -12, z1: -4.5, x2: 12, z2: -4.5, doors: [-9, -1, 8], glass: 1 }, { x1: -12, z1: 4.5, x2: 12, z2: 4.5, doors: [-8, 1, 9], glass: 1 },
];
const F3 = [];
for (let k = 0; k < 12; k++) F3.push(['desk', -10.4 + k * 1.8, -12.1, 0]);
for (let x = -9.6; x <= -3.1; x += .8) F3.push(['rack', x, -1.9, 0], ['rack', -x, -1.9, 0]);
for (let x = -6.4; x <= 6.41; x += .8) F3.push(['rack', x, 1.9, Math.PI]);
F3.push(['plant', -11.3, -5.2, 0], ['plant', 11.3, -5.2, 0], ['plant', -11.3, 5.3, 0], ['plant', 11.3, 12.3, 1]);
F3.push(['beanbag', -9, 10.5, 0], ['beanbag', -7, 11.6, 0], ['beanbag', -10.6, 12, 0], ['beanbag', -5, 10.9, 0], ['sofa', -1.5, 12.4, Math.PI, '#8F7BD6'], ['ctable', -1.5, 10.6, 0], ['tv', -1.5, 4.75, 0]);
F3.push(['lift', -17.9, -10.5, Math.PI / 2], ['lift', -17.9, -6.5, Math.PI / 2], ['sofa', -15, -12.4, 0, '#5A6BB5'], ['plant', -12.7, -12.3, 1]);
F3.push(['reception', -14.6, 6.5, 0], ['shelf', -17.6, 10, Math.PI / 2], ['desk', -16.6, 3, Math.PI / 2], ['plant', -12.7, 12.3, 1], ['plant', -17.3, 12.3, 0]);
F3.push(['tv', 17.85, -10, -Math.PI / 2, 2.4], ['tv', 17.85, -7.2, -Math.PI / 2, 2.4], ['tv', 17.85, -4.4, -Math.PI / 2, 2.4], ['desk', 15.4, -10, -Math.PI / 2], ['desk', 15.4, -7.2, -Math.PI / 2], ['desk', 15.4, -4.4, -Math.PI / 2]);
F3.push(['cooler', -11.3, 8.6, 0], ['cmach', -12.7, 2, 0]);
F3.push(['tray', -1.2, -10.5, 0], ['tray', 8, 10.5, 0], ['tray', -17.3, 1, 0], ['books', 11.4, -10.2, -Math.PI / 2], ['books', 11.4, 8.4, -Math.PI / 2], ['bin', -12.6, -.7, 0], ['bin', 12.6, -12.4, 0], ['bin', -4, 5.3, 0]);
F3.push(['ups', 17.2, 2.6, 0], ['ups', 17.2, 4.4, 0], ['ups', 17.2, 6.2, 0], ['shelf', 14.5, 12.5, Math.PI, 2], ['plant', 12.7, 1, 0]);

const VDEF = [
  { n: 'Поверх 42 · Копі-центр', fl: 42, w: 34, d: 26, r: 23, night: false, walls: W1, furn: F1, logo: 'ОФІС «ГУЩА» · 42', logoAt: [-16.85, 0, Math.PI / 2],
    board: [-11, 2.5], prn: [[0, 0]], srv: [-15.3, -3.8], rb: [-11, 4.5], alarm: [7.78, 4], spots: [[-6.2, -5.3], [6.2, -5.3], [6.2, 5.3], [-6.2, 5.3], [0, 5.3]],
    bodies: [[-12, -8], [-6, -10.8], [10.3, 0], [-11, -1.8]], props: [[-6.4, -5.6], [6.4, 5.6], [-6.4, 5.6], [6.4, -5.6], [0, -5.4]],
    floors: [[-17, -13, 17, 13, '#C9CDD9'], [-17, -13, 0, -7, '#5A6BB5'], [8, -7, 17, 7, '#5A6BB5'], [0, -13, 17, -7, '#7E6FB8'], [-17, -7, -8, 7, '#E3D7C4'], [-5, 7, 5, 13, '#C4956A'], [5, 7, 17, 13, '#8C5A3C'], [-4.5, -3.5, 4.5, 3.5, '#EDEBF5']],
    tiles: [-17, 7, -5, 13, '#FFFFFF', '#DCD6EA'],
    rooms: [['💻 Опенспейс А', -17, -13, 0, -7], ['📊 Переговорна', 0, -13, 17, -7], ['🛎️ Рецепція', -17, -7, -8, 7], ['💻 Опенспейс Б', 8, -7, 17, 7], ['☕ Кухня', -17, 7, -5, 13], ['🛋️ Лаунж', -5, 7, 5, 13], ['👔 Кабінет боса', 5, 7, 17, 13]],
    tip: 'скляна копі-кімната в центрі, коридор-кільце навколо' },
  { n: 'Поверх 57 · Опенспейс-лабіринт', fl: 57, w: 36, d: 28, r: 24.5, night: false, walls: W2, furn: F2, logo: 'СТАРТАП «КАВАДЖЕТ» · 57', logoAt: [-15, -13.85, 0],
    board: [-15, -4], srv: [-16.2, -3], rb: [-14.5, 2.5], route: [[-9.4, -9.2], [9.4, -9.2], [9.4, 9.2], [-9.4, 9.2]], prn: [[-9.4, -9.2]], alarm: [17.78, -3], spots: [[-9.4, -4], [9.4, -4], [9.4, 4], [-9.4, 4], [0, -10.5]],
    bodies: [[-4.6, 0], [4.6, 0], [14.8, -11], [-14.6, 10.4]], props: [[-13, -12.8], [13, 12.8], [-16.8, -12.8]],
    floors: [[-18, -14, 18, 14, '#CFC9BA'], [-12, -14, 12, 14, '#4FA3A0'], [-6.9, -7.4, 6.9, 7.4, '#E9A15B'], [-2.6, -2.5, 2.6, 2.5, '#F4E7C8'], [-18, -14, -12, 0, '#DADDE3'], [12, -14, 18, 0, '#3E3A5C'], [12, 0, 18, 14, '#F2C4A0']],
    tiles: [-18, 0, -12, 14, '#FFFFFF', '#F4D6B0'],
    rooms: [['🛗 Ліфтовий хол', -18, -14, -12, 0], ['☕ Кухня-бар', -18, 0, -12, 14], ['🎙️ Подкаст-студія', 12, -14, 18, 0], ['🫘 Пуф-лаунж', 12, 0, 18, 14], ['💻 Кабінки', -6.9, -7.4, 0, -2.5], ['💻 Кабінки', 0, 2.5, 6.9, 7.4], ['☕ Кавовий острів', -2.6, -2.5, 2.6, 2.5]],
    tip: 'кабінки-лабіринт, принтер на колесах їздить жовтою колією' },
  { n: 'Поверх 63 · Серверна', fl: 63, w: 36, d: 26, r: 24, night: true, walls: W3, furn: F3, logo: 'IT-ВІДДІЛ · 63', logoAt: [-15, -12.85, 0],
    board: [-15, -5], prn: [[-4, -8.6], [5, 8.6]], srv: [-6, 0], rb: [-15, -2], alarm: [17.78, 10.5], spots: [[-9, -7.5], [9, -7.5], [9, 7.5], [-9, 7.5], [0, 10.5]],
    bodies: [[-8, -7], [8, 7.2], [0, 0], [-15, 10]], props: [[-13, -11.8], [13, 11.8], [11, 0]],
    floors: [[-18, -13, 18, 13, '#2E3350'], [-12, -13, 12, -4.5, '#3D4A7A'], [-12, 4.5, 12, 13, '#4A3D6E'], [-18, -13, -12, 0, '#C9CDD9'], [-18, 0, -12, 13, '#5A6BB5'], [12, -13, 18, 0, '#232842'], [12, 0, 18, 13, '#4E4A6E']],
    tiles: [-12, -4.5, 12, 4.5, '#8E96B0', '#7A829C'],
    rooms: [['🛗 Ліфтовий хол', -18, -13, -12, 0], ['🧑‍💻 Хелпдеск', -18, 0, -12, 13], ['📡 NOC', 12, -13, 18, 0], ['🔋 Щитова', 12, 0, 18, 13], ['🖨️ Принт-хаб «Північ»', -12, -13, 12, -4.5], ['🗄️ Серверна', -12, -4.5, 12, 4.5], ['🖨️ Принт-хаб «Південь»', -12, 4.5, 12, 13]],
    tip: 'два принтери — працює лише один, перемикаються кожні 25 с' },
];
/* точки, де брати «снаряди»: тип меблів → предмет (pl — ✈️ літачки, bk — 📘 книжки, cr — 🧻 мʼятий папір) */
const PICK = { tray: 'pl', books: 'bk', bin: 'cr' };
const ITEM = { pl: { ic: '✈️', n: 'Паперовий літачок', add: 3, max: 6, src: 'лоток з папером біля принтера', sh: 'лоток', lbl: '✈️ Папір для літачків', f: 'F — скласти літачок (+3)' },
  bk: { ic: '📘', n: 'Книжка', add: 2, max: 4, src: 'книжкова шафа', sh: 'шафа', lbl: '📘 Книжкова шафа', f: 'F — взяти книжку (+2)' },
  cr: { ic: '🧻', n: 'Мʼятий папір', add: 5, max: 10, src: 'смітник з папером', sh: 'смітник', lbl: '🧻 Смітник · мʼятий папір', f: 'F — нам\'яти паперу (+5)' } };
/* у світові координати */
const VAR = VDEF.map((def, i) => {
  const cx = VXS[i], cz = VY, P = a => ({ x: cx + a[0], z: cz + a[1] });
  const D = Object.assign({}, def, { i, cx, cz });
  D.walls = def.walls.map(w => Object.assign({}, w, { x1: cx + w.x1, x2: cx + w.x2, z1: cz + w.z1, z2: cz + w.z2, doors: (w.doors || []).map(d => d + (w.z1 === w.z2 ? cx : cz)) }));
  D.board = P(def.board); D.prn = def.prn.map(P); D.srv = P(def.srv); D.rbDock = P(def.rb);
  // ПК (столи), кулери, кавомашини — цілі для літачків, калюж і кави
  const FP = t => def.furn.filter(f => t.includes(f[0])).map(f => P([f[1], f[2]]));
  D.pcs = FP(['desk']); D.picks = def.furn.filter(f => PICK[f[0]]).map(f => Object.assign(P([f[1], f[2]]), { k: PICK[f[0]], rot: f[3] || 0 })); D.bins = D.picks.filter(p => p.k === 'cr'); D.coolers = FP(['cooler']); D.cof = FP(['counter', 'island', 'cmach']); D.spots = def.spots.map(P); D.alarm = P(def.alarm);
  if (def.route) { D.route = def.route.map(P); D.rlen = D.route.reduce((s, p, k) => s + dist2(p.x, p.z, D.route[(k + 1) % D.route.length].x, D.route[(k + 1) % D.route.length].z), 0); }
  D.solids = furnSolids(D);
  A.island({ id: i ? 'printerwar' + (i + 1) : 'printerwar', n: '🖨️ ' + def.n, sub: 'Битва за принтер · PVP · ' + def.tip, x: cx, z: cz, r: def.r, top: '#CFC6E6', rock: '#8C84C6', biome: 'printroom', pv: i, tier: 1, safe: true });
  return D;
});
const varAt = (x, z) => { for (const D of VAR) if (Math.abs(x - D.cx) < D.w / 2 + .3 && Math.abs(z - D.cz) < D.d / 2 + .3) return D.i; return -1; };
const inArena = (x, z) => varAt(x, z) >= 0;
const _buildIsland = buildIsland;
buildIsland = function (s) { if (s.biome !== 'printroom') return _buildIsland.apply(this, arguments); return SIMSIDE ? new THREE.Group() : buildFloor(VAR[s.pv | 0]); };

function furnSolids(D) {   // [x, z, r] у світових координатах
  const out = [];
  for (const [t, x, z, rot] of D.furn) {
    const c = Math.cos(rot), s = Math.sin(rot), pt = (lx, lz, r) => out.push([D.cx + x + lx * c + lz * s, D.cz + z - lx * s + lz * c, r]);
    if (t === 'desk') { pt(-.5, 0, .45); pt(.5, 0, .45); }
    else if (t === 'mtable') for (let k = -3; k <= 3; k++) pt(k, 0, .75);
    else if (t === 'sofa') { pt(-.7, 0, .5); pt(.7, 0, .5); }
    else if (t === 'reception') for (let k = -2; k <= 2; k++) pt(0, k, .6);
    else if (t === 'counter') for (let k = -1.5; k <= 1.5; k++) pt(k, 0, .45);
    else if (t === 'island') for (let k = -1; k <= 1; k++) pt(k, 0, .5);
    else if (t === 'ktable') { pt(-.6, 0, .55); pt(.6, 0, .55); }
    else if (t === 'boss') { pt(-.8, 0, .6); pt(.8, 0, .6); }
    else if (t === 'ctable' || t === 'fridge' || t === 'cooler' || t === 'plant' || t === 'beanbag' || t === 'rack') pt(0, 0, t === 'rack' ? .5 : .45);
    else if (t === 'ups') pt(0, 0, .6);
    else if (t === 'cmach') pt(0, 0, .4);
    else if (t === 'tray') pt(0, 0, .4);
    else if (t === 'bin') pt(0, 0, .3);
    else if (t === 'books') { pt(-.45, 0, .35); pt(.45, 0, .35); }
    else if (t === 'shelf' || t === 'pshelf') { pt(-.5, 0, .35); pt(.5, 0, .35); }
  }
  return out;
}
function wallParts(w) {   // проміжки стіни між дверима
  const horiz = w.z1 === w.z2, lo = Math.min(horiz ? w.x1 : w.z1, horiz ? w.x2 : w.z2), hi = Math.max(horiz ? w.x1 : w.z1, horiz ? w.x2 : w.z2);
  const ds = (w.doors || []).slice().sort((a, b) => a - b), out = []; let a = lo;
  for (const d of ds) { out.push([a, d - .9]); a = d + .9; } out.push([a, hi]); return out;
}
function wallStatics(W) {
  for (const w of W) for (const [a, b] of wallParts(w)) { const horiz = w.z1 === w.z2; for (let t = a; t <= b + .01; t += .55) addStatic(horiz ? t : w.x1, horiz ? w.z1 : t, .3, 1.2); }
}
A.on('world', () => {
  for (const D of VAR) {
    wallStatics(D.walls);
    for (const [x, z, r] of D.solids) addStatic(x, z, r, 1);
    if (!D.route) for (const p of D.prn) addStatic(p.x, p.z, .9, 1.6);   // нерухомі принтери
    for (const [x, z] of D.bodies) addBody('chair', D.cx + x, D.cz + z);
    for (const [x, z] of D.props) addProp('crate', D.cx + x, D.cz + z);
  }
});

/* ---------- Навігація ботів: сітка 0,5 м на кожен поверх (стіни й меблі — перешкоди) ---------- */
function navOf(D) {
  if (D.nav) return D.nav;
  const N = D.nav = { cell: .5, x0: D.cx - D.w / 2, z0: D.cz - D.d / 2, nx: Math.round(D.w / .5), nz: Math.round(D.d / .5) };
  const b = N.block = new Uint8Array(N.nx * N.nz);
  for (let i = 0; i < N.nx; i++) for (let j = 0; j < N.nz; j++) {
    const x = N.x0 + (i + .5) * N.cell, z = N.z0 + (j + .5) * N.cell;
    let bad = D.solids.some(([sx, sz, r]) => dist2(x, z, sx, sz) < r + .35) || (!D.route && D.prn.some(p => dist2(x, z, p.x, p.z) < 1.3));
    if (!bad) for (const w of D.walls) { const horiz = w.z1 === w.z2; for (const [a, c] of wallParts(w)) { if (horiz ? (Math.abs(z - w.z1) < .5 && x > a - .4 && x < c + .4) : (Math.abs(x - w.x1) < .5 && z > a - .4 && z < c + .4)) { bad = true; break; } } if (bad) break; }
    b[i + j * N.nx] = bad ? 1 : 0;
  }
  return N;
}
const cellOf = (N, x, z) => [clamp(Math.floor((x - N.x0) / N.cell), 0, N.nx - 1), clamp(Math.floor((z - N.z0) / N.cell), 0, N.nz - 1)];
function navBFS(N, x, z, tx, tz) {
  const [si, sj] = cellOf(N, x, z), [ti, tj] = cellOf(N, tx, tz), nx = N.nx, start = si + sj * nx, goal = ti + tj * nx;
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
  return { prev, start, goal };
}
function navPath(D, x, z, tx, tz) {
  const N = navOf(D), { prev, start, goal } = navBFS(N, x, z, tx, tz), nx = N.nx;
  if (prev[goal] < 0) return [{ x: tx, z: tz }];
  const pts = []; for (let c = goal; c !== start; c = prev[c]) pts.push({ x: N.x0 + (c % nx + .5) * N.cell, z: N.z0 + (((c / nx) | 0) + .5) * N.cell });
  pts.reverse(); const out = pts.filter((p, k) => k % 3 === 2 || k === pts.length - 1); if (!out.length) return [{ x: tx, z: tz }]; out[out.length - 1] = { x: tx, z: tz }; return out;
}
const reachable = (D, x, z, tx, tz) => { const r = navBFS(navOf(D), x, z, tx, tz); return r.prev[r.goal] >= 0; };
function solidPush(e, r, D) {   // вибштовхнути з меблів, стін і принтерів (для ботів)
  for (const [x, z, sr] of D.solids) { const dx = e.x - x, dz = e.z - z, d = Math.hypot(dx, dz), m = sr + r; if (d < m && d > .01) { e.x = x + dx / d * m; e.z = z + dz / d * m; } }
  for (const w of D.walls) { const horiz = w.z1 === w.z2; for (const [a, c] of wallParts(w)) { if (horiz) { if (e.x > a - .1 && e.x < c + .1 && Math.abs(e.z - w.z1) < r + .1) e.z = w.z1 + Math.sign(e.z - w.z1 || 1) * (r + .1); } else if (e.z > a - .1 && e.z < c + .1 && Math.abs(e.x - w.x1) < r + .1) e.x = w.x1 + Math.sign(e.x - w.x1 || 1) * (r + .1); } }
  for (const p of prnAll(D.i)) { const dx = e.x - p.x, dz = e.z - p.z, d = Math.hypot(dx, dz); if (d < 1.3 && d > .01) { e.x = p.x + dx / d * 1.3; e.z = p.z + dz / d * 1.3; } }
  e.x = clamp(e.x, D.cx - D.w / 2 + .4, D.cx + D.w / 2 - .4); e.z = clamp(e.z, D.cz - D.d / 2 + .4, D.cz + D.d / 2 - .4);
}
function freeSpot(D) { const N = navOf(D); for (let k = 0; k < 300; k++) { const i = (Math.random() * N.nx) | 0, j = (Math.random() * N.nz) | 0; const x = N.x0 + (i + .5) * N.cell, z = N.z0 + (j + .5) * N.cell; if (!N.block[i + j * N.nx] && reachable(D, D.spots[0].x, D.spots[0].z, x, z)) return { x, z }; } return D.spots[0]; }

/* ---------- Стан раунду ---------- */
const ST = { ph: 'idle', t: 0, cnt: 0, ps: [], owner: '', ev: '', evT: 0, stacks: [], piles: [], sl: null, pu: null, res: [], id: 0, v: 0, nv: 0, votes: {}, ready: {}, ac: 0, npc: [], rb: null, sf: null, mf: [], wp: [], fill: 0, go: 0, lb: '' };
const AU = { stT: 0, evIn: 20, sid: 0, scoreT: 0, puIn: 15, proj: [], bump: {}, lastAct: 0, pcChance: .35, fireIn: 0, rbIn: 0, cool: {}, refill: {}, fillIn: 0, take: {}, binN: {} };
const BOT_NAMES = ['Бот Кент', 'Бот Віта', 'Бот Люда', 'Бот Гена', 'Бот Олена'];
/* лобі заповнюється: перший бот через 4 с після першого «Я готовий», далі кожні 2,5 с; потім відлік 3…2…1.
   Тест може пришвидшити: window.__printerwarFastLobby = 1 (кроки по 0,2 с) */
const FAST = () => !!(typeof window !== 'undefined' && window.__printerwarFastLobby);
const FILL1 = () => FAST() ? .2 : 4, FILLN = () => FAST() ? .2 : 2.5, GO_T = () => FAST() ? .6 : 3;
const myKey = () => (NET.on && typeof WORLD !== 'undefined' && WORLD.on ? myName() : 'me');
const keyOf = from => SIMSIDE ? String(from && from.name || '') : 'me';
const r2 = v => Math.round(v * 100) / 100;
const fightT = vi => (ST.ph === 'fight' || ST.ph === 'end') && ST.v === vi ? ST.t : 0;
function routeAt(D, t) {   // точка на колії через t секунд
  let s = (t * RSPD) % D.rlen; const R = D.route;
  for (let k = 0; k < R.length; k++) { const a = R[k], b = R[(k + 1) % R.length], l = dist2(a.x, a.z, b.x, b.z); if (s <= l) { const q = s / l; return { x: a.x + (b.x - a.x) * q, z: a.z + (b.z - a.z) * q, a: Math.atan2(b.x - a.x, b.z - a.z) }; } s -= l; }
  return { x: R[0].x, z: R[0].z, a: 0 };
}
const actIdx = vi => VAR[vi].prn.length > 1 ? Math.floor(fightT(vi) / SWITCH) % 2 : 0;
function prnPos(vi = ST.v) { const D = VAR[vi]; return D.route ? routeAt(D, fightT(vi)) : D.prn[actIdx(vi)]; }
function prnAll(vi) { const D = VAR[vi]; return D.route ? [routeAt(D, fightT(vi))] : D.prn; }
function slimeAt(x, z) { const s = ST.sl; return !!(s && ST.ph === 'fight' && s[3] > 0 && dist2(x, z, s[0], s[1]) < s[2]); }

function snap() {
  return { ph: ST.ph, t: r2(ST.t), c: r2(ST.cnt), id: ST.id, o: ST.owner, ev: ST.ev, et: r2(ST.evT), res: ST.res, v: ST.v, nv: ST.nv, vo: ST.votes, rd: ST.ready, ac: r2(ST.ac), fl: ST.fill ? 1 : 0, go: r2(ST.go), lb: ST.lb,
    p: ST.ps.map(p => [p.k, p.bot ? 1 : 0, p.pages, p.col, p.bot ? r2(p.x) : 0, p.bot ? r2(p.z) : 0, p.bot ? r2(p.f) : 0, r2(p.stun || 0), p.hold ? 1 : 0, p.bur || 0, r2(p.turbo || 0), r2(p.streak || 0), r2(p.blind || 0), p.pl | 0, p.cf || [0, 0, 0], p.mo | 0, p.bo | 0, Math.round(p.fo || 0), p.wi | 0, p.bk | 0, p.cr | 0]),
    s: ST.stacks.map(s => [s.id, r2(s.x), r2(s.z)]), pi: ST.piles.map(s => [s.id, r2(s.x), r2(s.z)]), sl: ST.sl ? ST.sl.map(r2) : 0, pu: ST.pu ? [ST.pu.id, r2(ST.pu.x), r2(ST.pu.z)] : 0,
    n: ST.npc.map(n => [n.id, r2(n.x), r2(n.z), r2(n.f || 0), Math.round(n.ag), n.zom ? 1 : 0, n.want | 0, r2(n.stun || 0), n.tgt || '']),
    rb: ST.rb ? [r2(ST.rb.x), r2(ST.rb.z), r2(ST.rb.f || 0), ST.rb.arm || '', ST.rb.by || '', r2(ST.rb.fuse || 0)] : 0,
    sf: ST.sf ? [r2(ST.sf.x), r2(ST.sf.z), r2(ST.sf.r), Math.round(ST.sf.hp)] : 0,
    mf: ST.mf.map(f => [f.id, r2(f.x), r2(f.z), r2(f.r), r2(f.t)]), wp: ST.wp.map(f => [f.id, r2(f.x), r2(f.z), r2(f.r), r2(f.t), r2(f.el || 0)]) };
}
function applySnap(d) {
  Object.assign(ST, { ph: d.ph || 'idle', t: +d.t || 0, cnt: +d.c || 0, id: d.id | 0, owner: String(d.o || ''), ev: String(d.ev || ''), evT: +d.et || 0, res: Array.isArray(d.res) ? d.res.slice(0, 8) : [],
    v: clamp(d.v | 0, 0, 2), nv: clamp(d.nv | 0, 0, 2), votes: d.vo && typeof d.vo === 'object' ? d.vo : {}, ready: d.rd && typeof d.rd === 'object' ? d.rd : {}, ac: +d.ac || 0, fill: d.fl ? 1 : 0, go: +d.go || 0, lb: String(d.lb || '') });
  if (Array.isArray(d.p)) {
    const old = new Map(ST.ps.map(p => [p.k, p]));
    ST.ps = d.p.slice(0, MAXP).map(a => {
      const p = old.get(a[0]) || { k: String(a[0]) };
      Object.assign(p, { bot: !!a[1], pages: a[2] | 0, col: a[3] | 0, stun: +a[7] || 0, hold: !!a[8], bur: a[9] | 0, turbo: +a[10] || 0, streak: +a[11] || 0, blind: +a[12] || 0,
        pl: a[13] | 0, cf: Array.isArray(a[14]) ? a[14].slice(0, 3).map(v => v | 0) : [0, 0, 0], mo: a[15] | 0, bo: a[16] | 0, fo: +a[17] || 0, wi: a[18] | 0, bk: a[19] | 0, cr: a[20] | 0 });
      if (p.bot) { p.tx = +a[4]; p.tz = +a[5]; p.f = +a[6]; if (p.x == null) { p.x = p.tx; p.z = p.tz; } } return p;
    });
  }
  const xyz = a => ({ id: a[0], x: +a[1], z: +a[2] });
  if (Array.isArray(d.s)) ST.stacks = d.s.slice(0, 16).map(xyz);
  if (Array.isArray(d.pi)) ST.piles = d.pi.slice(0, 10).map(xyz);
  ST.sl = Array.isArray(d.sl) ? d.sl.map(Number) : null;
  ST.pu = Array.isArray(d.pu) ? xyz(d.pu) : null;
  if (Array.isArray(d.n)) {   // офісні колеги (зомбі-«зайобуючі»): плавно доїжджають до позиції з сервера
    const old = new Map(ST.npc.map(n => [n.id, n]));
    ST.npc = d.n.slice(0, 12).map(a => { const n = old.get(a[0]) || { id: a[0], x: +a[1], z: +a[2] }; Object.assign(n, { tx: +a[1], tz: +a[2], f: +a[3] || 0, ag: +a[4] || 0, zom: !!a[5], want: clamp(a[6] | 0, 0, 2), stun: +a[7] || 0, tgt: String(a[8] || '') }); return n; });
  }
  if (Array.isArray(d.rb)) { const r = ST.rb || { x: +d.rb[0], z: +d.rb[1] }; Object.assign(r, { tx: +d.rb[0], tz: +d.rb[1], f: +d.rb[2] || 0, arm: String(d.rb[3] || ''), by: String(d.rb[4] || ''), fuse: +d.rb[5] || 0 }); ST.rb = r; } else ST.rb = null;
  ST.sf = Array.isArray(d.sf) ? { x: +d.sf[0], z: +d.sf[1], r: +d.sf[2], hp: +d.sf[3] } : null;
  ST.mf = Array.isArray(d.mf) ? d.mf.slice(0, 12).map(a => ({ id: a[0], x: +a[1], z: +a[2], r: +a[3], t: +a[4] })) : [];
  ST.wp = Array.isArray(d.wp) ? d.wp.slice(0, 8).map(a => ({ id: a[0], x: +a[1], z: +a[2], r: +a[3], t: +a[4], el: +a[5] || 0 })) : [];
}
function pushState() { if (SIMSIDE) A.send('st', snap()); }
function emit(e) { if (SIMSIDE) A.send('ev', e); else onEvent(e); }
function req(k, d) { const o = Object.assign({ k }, d || {}); if (AUTH()) onReq(o, { id: NET.id, name: myName() }); else A.send('rq', o); }
A.onNet('st', (d, from) => { if (!SIMSIDE && !AUTH() && from.id === -1 && d) applySnap(d); });
A.onNet('ev', (d, from) => { if (!SIMSIDE && !AUTH() && from.id === -1 && d) onEvent(d); });
A.onNet('rq', (d, from) => { if (SIMSIDE && d) onReq(d, from); });

function posOf(p) {
  if (p.bot) return { x: p.x, z: p.z };
  if (SIMSIDE) { const q = simPlayers().find(s => s.name === p.k && !s.dead); return q ? { x: q.x, z: q.z } : { x: 1e4, z: 1e4 }; }
  if (p.k === myKey()) return pl.dead ? { x: 1e4, z: 1e4 } : { x: pl.x, z: pl.z };
  const q = Object.values(NET.players).find(s => s.name === p.k); return q ? { x: q.x, z: q.z } : { x: 1e4, z: 1e4 };
}
function onReq(d, from) {
  const k = keyOf(from), me = ST.ps.find(p => p.k === k), fight = ST.ph === 'fight';
  if (d.k === 'join') {
    if (me || ST.ps.filter(p => !p.bot).length >= MAXP) return;
    if (ST.ph !== 'idle' && ST.ph !== 'lobby') { emit({ k: 'msg', to: k, txt: '🖨️ Битва вже йде — дочекайся наступного раунду.' }); return; }
    if (ST.ph === 'idle') { ST.ps = []; ST.ph = 'lobby'; ST.cnt = 0; ST.go = 0; ST.fill = 0; ST.lb = ''; ST.id++; ST.res = []; ST.ready = {}; }   // лобі чекає, поки всі натиснуть «Я готовий»
    if (ST.ps.length >= MAXP) {   // лобі повне ботами — людина займає місце бота
      const b = ST.ps.slice().reverse().find(p => p.bot); ST.ps = ST.ps.filter(p => p !== b); delete ST.ready[b.k];
      emit({ k: 'msg', txt: `🤖 ${escapeHTML(b.k)} поступився місцем живій людині.` });
    }
    ST.ps.push({ k, bot: false, pages: 0, col: freeCol(), jt: AU.now || 0 });   // jt — коли записався (ліфт ще везе — не викидати)
    emit({ k: 'msg', txt: `🖨️ ${SIMSIDE ? escapeHTML(k) : 'Ти'} у лобі битви за принтер!` }); lobbyCheck(); pushState();
  } else if (d.k === 'leave') { if (me) { ST.ps = ST.ps.filter(p => p !== me); delete ST.ready[k]; delete ST.votes[k]; if (!ST.ps.some(p => !p.bot)) reset(); else lobbyCheck(); pushState(); } }
  else if (d.k === 'vote') { const v = d.v | 0; if (me && v >= 0 && v < 3 && ST.ph === 'lobby') { ST.votes[k] = v; pushState(); } }
  else if (d.k === 'ready' && me && ST.ph === 'lobby') {   // «Я готовий» — перемикач
    if (ST.ready[k]) delete ST.ready[k]; else { ST.ready[k] = 1; if (!ST.fill) { ST.fill = 1; AU.fillIn = FILL1(); } }   // перший «готовий» — боти почнуть доповнювати лобі
    lobbyCheck(); pushState();
  }
  else if (d.k === 'shove' && me && fight) {   // гравець штовхнув бота
    const b = ST.ps.find(p => p.bot && p.k === d.to); if (!b) return;
    const a = +d.a || 0, f = slimeAt(b.x, b.z) ? 12 : 9; b.vx = Math.sin(a) * f; b.vz = Math.cos(a) * f; b.stun = .7; emit({ k: 'bonk', who: b.k, by: k });
  } else if (d.k === 'sheet' && me && fight && !me.hold) {   // підняв пачку паперу
    const i = ST.stacks.findIndex(s => s.id === d.id); if (i < 0) return;
    ST.stacks.splice(i, 1); me.pages += 4; me.hold = true; emit({ k: 'sheet', who: k, id: d.id }); pushState();
  } else if (d.k === 'throw' && me && fight && me.hold) { const q = posOf(me); throwFrom(me, q, +d.a || 0); pushState(); }
  else if (d.k === 'bury' && me && fight) {
    if (!d.on) { if (me.bur) { me.bur = 0; pushState(); } return; }
    const q = posOf(me), pile = ST.piles.find(s => dist2(q.x, q.z, s.x, s.z) < 1.3);
    if (pile && !ST.ps.some(p => p.bur === pile.id)) { me.bur = pile.id; emit({ k: 'bury', who: k }); pushState(); }
  } else if (d.k === 'pu' && me && fight && ST.pu && ST.pu.id === d.id) { ST.pu = null; AU.puIn = rand(22, 30); me.turbo = 10; emit({ k: 'turbo', who: k }); pushState(); }
  else if (d.k === 'alarm' && me && fight) {
    const D = VAR[ST.v], q = posOf(me);
    if (dist2(q.x, q.z, D.alarm.x, D.alarm.z) > 2.6) return;
    if (ST.ev || ST.ac > 0) { emit({ k: 'msg', to: k, txt: ST.ev ? '🚨 Зараз і так весело — спершу хай скінчиться подія.' : `🚨 Кнопка перезаряджається: ${Math.ceil(ST.ac)} с` }); return; }
    ST.ac = 35; startEvent('boss', k); pushState();
  } else if (d.k === 'fix' && me && ST.ev === 'jam') { ST.ev = ''; ST.evT = 0; me.pages += 10; emit({ k: 'fixed', who: k }); pushState(); }
  else if (me && fight && Object.prototype.hasOwnProperty.call(CHAOS, d.k)) CHAOS[d.k](me, d, k);   // літачки, кава, вогнегасник, Молотов, Румба…
}
function reset() { Object.assign(ST, { ph: 'idle', ready: {}, ps: [], owner: '', ev: '', evT: 0, stacks: [], piles: [], sl: null, pu: null, t: 0, cnt: 0, v: ST.nv, votes: {}, ac: 0, npc: [], rb: null, sf: null, mf: [], wp: [], fill: 0, go: 0, lb: '' }); AU.proj = []; AU.fireIn = 0; AU.fillIn = 0; }
/* лобі: раунд — це 5 учасників (люди + боти). Після першого «Я готовий» боти по одному доповнюють лобі.
   Старт: є ≥2 учасники, лобі повне (5) і всі люди готові → відлік 3…2…1. Онлайн: хто 25 с після заповнення не готовий — граємо без нього. */
const freeCol = () => { for (let c = 0; c < NC; c++) if (!ST.ps.some(p => p.col === c)) return c; return ST.ps.length % NC; };
function lobbyCheck() {
  if (ST.ph !== 'lobby') return;
  const hs = ST.ps.filter(p => !p.bot), rd = hs.filter(p => ST.ready[p.k]).length, full = ST.ps.length >= MAXP;
  if (rd && !ST.fill) { ST.fill = 1; AU.fillIn = FILL1(); }
  const all = hs.length > 0 && rd === hs.length;
  if (full && ST.ps.length >= 2 && (all || (ST.cnt < 0 && rd > 0))) { if (ST.go <= 0) { ST.go = GO_T(); emit({ k: 'msg', txt: '🖨️ Усі на місці — старт за 3…' }); } }
  else ST.go = 0;
  if (!full || all || !rd) ST.cnt = 0; else if (ST.cnt === 0) ST.cnt = AUTOGO;   // повне лобі, хтось не готовий — 25 с і стартуємо без нього
}
function addBot() {
  const k = BOT_NAMES.find(b => !ST.ps.some(p => p.k === b)) || 'Бот №' + (ST.ps.length + 1);
  ST.ps.push({ k, bot: true, pages: 0, col: freeCol(), x: 0, z: 0, f: 0, vx: 0, vz: 0, stun: 0, cd: 0 }); ST.ready[k] = 1; ST.lb = k;
  emit({ k: 'msg', txt: `🤖 ${escapeHTML(k)} приєднався до лобі · ${ST.ps.length}/${MAXP}` });
}
function lobbyTick(dt) {
  if (ST.fill && ST.ps.length < MAXP && (AU.fillIn -= dt) <= 0) { AU.fillIn = FILLN(); addBot(); pushState(); }
  lobbyCheck(); if (ST.ph !== 'lobby') return;
  if (ST.cnt > 0) { ST.cnt -= dt; if (ST.cnt <= 0) { ST.cnt = -1; emit({ k: 'msg', txt: '⏰ Час вийшов — стартуємо з тими, хто готовий!' }); lobbyCheck(); } }
  if (ST.go > 0) { const s0 = Math.ceil(ST.go); ST.go -= dt; if (ST.go <= 0) { ST.go = 0; startFight(); return; } if (Math.ceil(ST.go) !== s0) pushState(); }
}
function pickVariant() {
  const humans = ST.ps.filter(p => !p.bot), cnt = [0, 0, 0];
  for (const p of humans) if (ST.votes[p.k] != null) cnt[ST.votes[p.k]]++;
  const best = Math.max(...cnt);
  if (best > 0) { const tied = [0, 1, 2].filter(i => cnt[i] === best); return tied.length === 1 ? tied[0] : pick(tied); }
  // ніхто не голосував — той поверх, де стоїть більшість записаних (туди їх привело меню); інакше «наступний»
  const at = [0, 0, 0]; for (const p of humans) { const q = posOf(p), v = varAt(q.x, q.z); if (v >= 0) at[v]++; }
  const m = Math.max(...at); return m > 0 ? at.indexOf(m) : ST.v;
}
function startFight() {
  const v = pickVariant(), D = VAR[v];
  // хто так і не натиснув «Я готовий» — дивиться цей раунд збоку; вільні місця — боти
  const late = ST.ps.filter(p => !p.bot && !ST.ready[p.k]); if (late.length && late.length < ST.ps.filter(p => !p.bot).length) { ST.ps = ST.ps.filter(p => !late.includes(p)); for (const p of late) emit({ k: 'msg', to: p.k, txt: '⏳ Ти не натиснув «Я готовий» — цей раунд без тебе. Наступного разу!' }); }
  while (ST.ps.length < MAXP) addBot();
  ST.ps.forEach((p, i) => { Object.assign(p, { pages: 0, col: i % NC, hold: false, bur: 0, turbo: 0, streak: 0, blind: 0 }, KIT()); if (p.bot) { const c = D.spots[i % D.spots.length]; Object.assign(p, { x: c.x, z: c.z, vx: 0, vz: 0, path: null, stun: 0 }); } });
  Object.assign(ST, { ph: 'fight', ready: {}, go: 0, cnt: 0, fill: 0, t: 0, owner: '', ev: '', evT: 0, stacks: [], piles: [], sl: null, pu: null, v, ac: 0 });
  Object.assign(AU, { evIn: rand(16, 22), puIn: rand(12, 18), proj: [], bump: {}, lastAct: 0, fireIn: 0, rbIn: 0, cool: {}, refill: {}, take: {}, binN: {} });
  // офісні колеги (нейтральні, поки не розізлиш) і Румба на док-станції
  Object.assign(ST, { npc: [], rb: { x: D.rbDock.x, z: D.rbDock.z, f: 0, arm: '', by: '' }, sf: null, mf: [], wp: [] });
  for (let i = 0; i < NPC_N; i++) { const f = freeSpot(D); ST.npc.push({ id: ++AU.sid, x: f.x, z: f.z, f: 0, ag: 0, zom: 0, want: 0, stun: 0, tgt: '', by: '', wait: rand(0, 2) }); }
  emit({ k: 'go', v, spots: ST.ps.map(p => p.k) }); pushState();
}
function endFight(why) {
  ST.ph = 'end'; ST.cnt = 8; ST.owner = ''; ST.ev = ''; ST.sl = null; Object.assign(ST, { npc: [], rb: null, sf: null, mf: [], wp: [] }); AU.proj = []; ST.nv = (ST.v + 1) % 3;
  ST.res = ST.ps.slice().sort((a, b) => b.pages - a.pages).map(p => [p.k, p.pages]);
  emit({ k: 'end', res: ST.res, why: why || '', v: ST.v }); pushState();
}
function addPile(x, z) {
  const D = VAR[ST.v]; x = clamp(x, D.cx - D.w / 2 + .8, D.cx + D.w / 2 - .8); z = clamp(z, D.cz - D.d / 2 + .8, D.cz + D.d / 2 - .8);
  ST.piles.push({ id: ++AU.sid, x: r2(x), z: r2(z) });
  while (ST.piles.length > 8) { const o = ST.piles.shift(); for (const p of ST.ps) if (p.bur === o.id) p.bur = 0; }
}
function startEvent(force, by) {
  const e = force || pick(['jam', 'toner', 'rain', 'boss', 'jam', 'rain', 'toner']), D = VAR[ST.v], P = prnPos();
  ST.ev = e; ST.evT = { jam: 12, toner: .5, rain: 9, boss: 7 }[e];
  if (e === 'rain') {   // пачки паперу по всьому поверху + дві купи біля принтера (в них можна заритися)
    for (let i = 0; i < 6; i++) { const p = freeSpot(D); ST.stacks.push({ id: ++AU.sid, x: r2(p.x), z: r2(p.z) }); }
    for (let i = 0; i < 2; i++) { const a = rand(0, 6.28), N = navOf(D); let x = P.x + Math.sin(a) * 1.9, z = P.z + Math.cos(a) * 1.9; const [ci, cj] = cellOf(N, x, z); if (N.block[ci + cj * N.nx]) { const f = freeSpot(D); x = f.x; z = f.z; } addPile(x, z); }
  }
  if (e === 'toner') {   // вибух: всіх відкидає, підлога навколо — чорна ковзанка
    ST.sl = [r2(P.x), r2(P.z), SLIME_R, SLIME_T];
    for (const p of ST.ps) if (p.bot) { const d = dist2(p.x, p.z, P.x, P.z); if (d < 5) { const a = Math.atan2(p.x - P.x, p.z - P.z); p.vx = Math.sin(a) * 12; p.vz = Math.cos(a) * 12; p.stun = 1; } }
  }
  emit({ k: 'event', e, x: r2(P.x), z: r2(P.z), by: by || '' });
}
/* пачка паперу летить; влучила в обличчя — суперник осліп на 2 с і впустив усе; де впала — купа паперу */
function throwFrom(p, q, a) {
  p.hold = false; p.bur = 0;
  const pr = { id: ++AU.sid, kind: 'stack', x: q.x + Math.sin(a) * .5, z: q.z + Math.cos(a) * .5, vx: Math.sin(a) * 13, vz: Math.cos(a) * 13, d: 0, max: 10, by: p.k };
  AU.proj.push(pr); emit({ k: 'toss', id: pr.id, kind: 'stack', x: r2(pr.x), z: r2(pr.z), a: r2(a), by: p.k, sp: 13 });
}
function projTick(dt) {   // пачки, літачки, дроти й Молотови в польоті
  const D = VAR[ST.v], N = navOf(D);
  for (let i = AU.proj.length - 1; i >= 0; i--) {
    const pr = AU.proj[i], ox = pr.x, oz = pr.z, sp = Math.hypot(pr.vx, pr.vz); pr.x += pr.vx * dt; pr.z += pr.vz * dt; pr.d += sp * dt;
    let hit = null, npc = null, pc = null, cool = -1;
    for (const p of ST.ps) { if (p.k === pr.by) continue; const q = posOf(p); if (dist2(q.x, q.z, pr.x, pr.z) < .75) { hit = p; break; } }
    if (!hit) npc = ST.npc.find(n => dist2(n.x, n.z, pr.x, pr.z) < .7) || null;
    if (!hit && !npc && pr.d > 1) { cool = pr.kind === 'paper' ? -1 : D.coolers.findIndex(c => dist2(c.x, c.z, pr.x, pr.z) < .65); if (cool < 0 && pr.kind === 'plane') pc = D.pcs.find(c => dist2(c.x, c.z, pr.x, pr.z) < .7) || null; }
    const bin = !hit && !npc && pr.kind === 'paper' && pr.d > 1.2 ? D.bins.find(b => segD(b.x, b.z, ox, oz, pr.x, pr.z) < .6) || null : null;
    const [ci, cj] = cellOf(N, pr.x, pr.z), wall = N.block[ci + cj * N.nx] && D.walls.some(w => w.z1 === w.z2 ? Math.abs(pr.z - w.z1) < .45 : Math.abs(pr.x - w.x1) < .45);
    if (hit || npc || pc || bin || cool >= 0 || wall || pr.d > (pr.max || 10) || !inArena(pr.x, pr.z)) {
      AU.proj.splice(i, 1);
      const lx = wall ? ox : pr.x, lz = wall ? oz : pr.z;
      if (pr.kind === 'stack') {   // пачка в обличчя — суперник осліп на 2 с і впустив усе; де впала — купа паперу
        if (hit) {
          hit.blind = 2; hit.bur = 0;
          if (hit.hold) { hit.hold = false; const q = posOf(hit); ST.stacks.push({ id: ++AU.sid, x: r2(q.x + rand(-1, 1)), z: r2(q.z + rand(-1, 1)) }); }
          if (hit.bot) { hit.stun = Math.max(hit.stun || 0, .4); hit.vx = pr.vx * .3; hit.vz = pr.vz * .3; }
        }
        addPile(lx, lz);
      } else if (hit && (pr.kind === 'plane' || pr.kind === 'book' || pr.kind === 'paper')) {   // літачок у вухо, книжкою — відчутно, папірцем — образливо
        const st = { plane: .5, book: 1.2, paper: .3 }[pr.kind], kb = { plane: .25, book: .5, paper: .1 }[pr.kind];
        if (hit.bot) { hit.stun = Math.max(hit.stun || 0, st); hit.vx = pr.vx * kb; hit.vz = pr.vz * kb; if (pr.kind === 'book') { hit.hold = false; hit.bur = 0; } }
        else emit({ k: 'shove', to: hit.k, a: r2(Math.atan2(pr.vx, pr.vz)), by: pr.by, f: { plane: 5, book: 10, paper: 3 }[pr.kind], [pr.kind]: 1 });
      }
      if (npc) rile(npc, { stack: 60, plane: 40, book: 45, paper: 20 }[pr.kind] || 25, pr.by);
      if (bin) {   // «папірець у смітник»: чим далі кидав — тим більше 🪙 і досвіду (кілька влучань за раунд)
        const thr = ST.ps.find(p => p.k === pr.by), d = dist2(pr.ox, pr.oz, bin.x, bin.z), n = AU.binN[pr.by] = (AU.binN[pr.by] || 0) + 1, paid = n <= BIN_CAP;
        if (thr && paid) thr.pages += 1;
        emit({ k: 'bin', by: pr.by, x: r2(bin.x), z: r2(bin.z), d: r2(d), c: paid ? 2 + Math.round(d * 1.5) : 0, xp: paid ? 4 + Math.round(d * 3) : 0, n });
      }
      if (cool >= 0) spill(cool, pr.by);
      if (pc) pcHit(pc, pr.by);
      if (pr.kind === 'wire') { const w = ST.wp.find(w => inR(lx, lz, w, .4)); if (w) electrify(w, pr.by); }
      if (pr.kind === 'molo') addFire(lx, lz, pr.by);
      emit({ k: 'land', id: pr.id, kind: pr.kind || 'stack', x: r2(lx), z: r2(lz), hit: hit ? hit.k : '', npc: npc ? npc.id : 0, pc: pc ? 1 : 0, bin: bin ? 1 : 0, by: pr.by }); pushState();
    }
  }
}
function authTick(dt) {
  if (ST.ph === 'idle') return;
  if (SIMSIDE) {   // хто вийшов з поверхів — вибуває
    const on = new Set(simPlayers().filter(p => inArena(p.x, p.z)).map(p => p.name));
    AU.now = (AU.now || 0) + dt; const gone = ST.ps.filter(p => !p.bot && !on.has(p.k) && AU.now - (p.jt || 0) > 3); if (gone.length) { ST.ps = ST.ps.filter(p => !gone.includes(p)); for (const p of gone) { delete ST.ready[p.k]; delete ST.votes[p.k]; } if (!ST.ps.some(p => !p.bot)) { reset(); pushState(); return; } lobbyCheck(); }
  }
  if (ST.ph === 'lobby' && !SIMSIDE && running && !inArena(pl.x, pl.z)) { reset(); return; }   // офлайн: пішов з поверху — лобі розпускається
  if (ST.ph === 'lobby') lobbyTick(dt);
  else if (ST.ph === 'fight') {
    ST.t += dt; ST.ac = Math.max(0, ST.ac - dt);
    const P = prnPos(), D = VAR[ST.v];
    for (const p of ST.ps) { if (p.bot) botTick(p, dt, D, P); p.turbo = Math.max(0, (p.turbo || 0) - dt); if (!p.bot) p.blind = Math.max(0, (p.blind || 0) - dt); if (p.bur && !ST.piles.some(s => s.id === p.bur)) p.bur = 0; }
    projTick(dt); chaosTick(dt, D, P);
    if (ST.sl) { ST.sl[3] -= dt; if (ST.sl[3] <= 0) ST.sl = null; }
    bumps();
    // серверна: перемикання принтерів
    const ai = actIdx(ST.v); if (ai !== AU.lastAct) { AU.lastAct = ai; emit({ k: 'switch', i: ai }); }
    // картридж-турбо
    if (!ST.pu && (AU.puIn -= dt) <= 0) { const f = freeSpot(D); ST.pu = { id: ++AU.sid, x: r2(f.x), z: r2(f.z) }; emit({ k: 'pu' }); }
    // хто в зоні принтера
    const inZ = ST.ps.filter(p => { const q = posOf(p); return dist2(q.x, q.z, P.x, P.z) < ZONE && !(p.stun > .3); });
    const zin = ST.npc.filter(n => n.zom && dist2(n.x, n.z, P.x, P.z) < ZONE).length;   // зомбі-колега в колі теж «чекає на принтер»
    ST.owner = inZ.length === 1 && !zin ? inZ[0].k : inZ.length + zin > 1 ? '*' : '';
    const printing = ST.owner && ST.owner !== '*' && ST.ev !== 'jam' && ST.ev !== 'boss' && !ST.sf;   // серверна горить — друк стоїть
    for (const p of ST.ps) {   // комбо: довго тримаєш принтер сам — бонус кожні 8 с
      if (printing && p.k === ST.owner) { const n0 = Math.floor((p.streak || 0) / 8); p.streak = (p.streak || 0) + dt; const n1 = Math.floor(p.streak / 8); if (n1 > n0) { const b = 5 * Math.min(3, n1); p.pages += b; emit({ k: 'combo', who: p.k, n: n1, b }); } }
      else p.streak = 0;
    }
    AU.scoreT -= dt;
    if (AU.scoreT <= 0) {
      AU.scoreT = .5;
      if (ST.ev === 'boss') for (const p of inZ) p.pages = Math.max(0, p.pages - 1);   // друкуєш особисте при начальнику!
      else if (ST.ev !== 'jam' && !ST.sf && inZ.length === 1 && !zin) inZ[0].pages += (ST.t > DUR - 30 ? 2 : 1) * (inZ[0].turbo > 0 ? 2 : 1);
    }
    if (ST.ev) { ST.evT -= dt; if (ST.evT <= 0) { if (ST.ev === 'jam') emit({ k: 'msg', txt: '🖨️ Принтер сам себе розжував. Друкуємо далі!' }); ST.ev = ''; } }
    else if ((AU.evIn -= dt) <= 0) { AU.evIn = rand(18, 26); startEvent(); }
    const top = ST.ps.reduce((a, b) => b.pages > a.pages ? b : a, ST.ps[0]);
    if (top && top.pages >= GOAL) endFight(`${top.k === 'me' ? 'Ти' : escapeHTML(top.k)} надрукував ${GOAL} сторінок!`);
    else if (ST.t >= DUR) endFight();
  } else if (ST.ph === 'end') { ST.cnt -= dt; if (ST.cnt <= 0) { reset(); pushState(); } }
  AU.stT -= dt; if (AU.stT <= 0) { AU.stT = ST.ph === 'fight' ? .1 : .5; pushState(); }
}
/* ======================= ХАОС: літачки, колеги-«зайобуючі», кулер, Румба, вогнегасник, Молотов (рахує авторитет) ======================= */
const COFFEE = [['☕', 'Еспресо'], ['🥛', 'Лате'], ['🧋', 'Раф']];
const PLANE_MAX = 3, PLANE_REGEN = 8, FOAM_SHOT = 20, NPC_N = 3;
const BIN_CAP = 6;   // скільки влучань у смітник за раунд дають 🪙/XP
const KIT = () => ({ pl: 2, bk: 0, cr: 0, plT: 0, cf: [1, 1, 1], mo: 2, bo: 1, fo: 100, foT: 0, wi: 0 });
const inR = (x, z, o, pad = 0) => dist2(x, z, o.x, o.z) < o.r + pad;
const wetAt = (x, z) => ST.ph === 'fight' && ST.wp.some(w => inR(x, z, w));
const zapAt = (x, z) => ST.ph === 'fight' && ST.wp.some(w => w.el > 0 && inR(x, z, w));
const fireAt = (x, z) => ST.ph !== 'fight' ? null : ST.sf && inR(x, z, ST.sf) ? ST.sf : ST.mf.find(f => inR(x, z, f)) || null;
const leaderBut = ex => ST.ps.filter(p => p.k !== ex).sort((a, b) => b.pages - a.pages)[0] || null;
const segD = (px, pz, ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, l = dx * dx + dz * dz, t = l ? clamp(((px - ax) * dx + (pz - az) * dz) / l, 0, 1) : 0; return Math.hypot(px - ax - dx * t, pz - az - dz * t); };
const FLY = { plane: [11, 13], book: [12, 9], paper: [10, 12], wire: [10, 9], molo: [10, 9] };   // [швидкість, дальність]
function launch(p, q, a, kind) {   // літачок / книжка / мʼятий папір / дріт / Молотов
  const [sp, max] = FLY[kind] || [10, 9];
  const pr = { id: ++AU.sid, kind, x: q.x + Math.sin(a) * .5, z: q.z + Math.cos(a) * .5, ox: q.x, oz: q.z, vx: Math.sin(a) * sp, vz: Math.cos(a) * sp, d: 0, max, by: p.k };
  AU.proj.push(pr); emit({ k: 'toss', id: pr.id, kind, x: r2(pr.x), z: r2(pr.z), a: r2(a), by: p.k, sp, max });
}
/* ПК після літачка: X% — починає спамити серверну → пожежа; ПК у калюжі — коротке замикання */
function pcHit(pc, by) {
  const w = ST.wp.find(w => inR(pc.x, pc.z, w, .9));
  if (w) { electrify(w, by); return; }
  if (ST.sf || AU.fireIn > 0) return;
  if (Math.random() < AU.pcChance) { AU.fireIn = 2.5; AU.fireBy = by; emit({ k: 'pcspam', x: r2(pc.x), z: r2(pc.z), by }); }
  else emit({ k: 'msg', to: by, txt: '💻 Літачок влучив у ПК… той лише пискнув. Спробуй ще!' });
}
function startServerFire() { const D = VAR[ST.v]; ST.sf = { x: D.srv.x, z: D.srv.z, r: 1.3, hp: 100, t: 45 }; emit({ k: 'fire', x: r2(D.srv.x), z: r2(D.srv.z), by: AU.fireBy || '' }); pushState(); }
function spill(i, by) {   // кулер перекинуто — велика ковзка калюжа
  const c = VAR[ST.v].coolers[i]; if (!c || (AU.cool[i] || 0) > ST.t) return false;
  AU.cool[i] = ST.t + 30;
  ST.wp.push({ id: ++AU.sid, x: r2(c.x), z: r2(c.z), r: 2.4, t: 25, el: 0 }); while (ST.wp.length > 4) ST.wp.shift();
  emit({ k: 'puddle', x: r2(c.x), z: r2(c.z), by: by || '' }); pushState(); return true;
}
function electrify(w, by) { if (w.el > 0) return; w.el = 4; w.t = Math.min(w.t, 4.5); emit({ k: 'zap', x: r2(w.x), z: r2(w.z), by: by || '' }); pushState(); }
function addFire(x, z, by) { ST.mf.push({ id: ++AU.sid, x: r2(x), z: r2(z), r: 1.9, t: 6, by: by || '' }); while (ST.mf.length > 6) ST.mf.shift(); }
/* шкала агресії колеги: повна — «зайобуючий» зомбі йде діставати лідера (того, хто розізлив, не чіпає) */
function rile(n, amt, by) {
  if (n.zom) { n.zt = Math.max(n.zt, 20); return; }
  n.ag = Math.min(100, n.ag + amt); n.hitT = ST.t; if (by) n.by = by;
  if (amt >= 5) emit({ k: 'rile', id: n.id, ag: Math.round(n.ag), by: by || '' });
  if (n.ag >= 100) zombify(n);
}
function zombify(n) {
  Object.assign(n, { zom: 1, zt: 40, want: (Math.random() * 3) | 0, ag: 100, path: null, pcd: 1, rt: 4 });
  const t = leaderBut(n.by); n.tgt = t ? t.k : '';
  emit({ k: 'zombie', id: n.id, by: n.by || '', tgt: n.tgt, want: n.want });
}
function calmNpc(n, by, kind) { Object.assign(n, { zom: 0, ag: 0, tgt: '', stun: 1.5, path: null, wx: null, wait: 1 }); emit({ k: 'calm', id: n.id, by: by || '', kind: kind == null ? -1 : kind }); }
function serve(p, n) {   // кава: зомбі — лише та, яку хоче; просто сердитий колега — будь-яка
  const c = p.cf || (p.cf = [0, 0, 0]);
  if (n.zom) {
    if (!c[n.want]) { emit({ k: 'msg', to: p.k, txt: `🧟 Колега хоче <b>${COFFEE[n.want].join(' ')}</b>, а в тебе такої нема. Кавомашина — на кухні (F).` }); return false; }
    c[n.want]--; p.pages += 3; calmNpc(n, p.k, n.want); pushState(); return true;
  }
  const k = c.findIndex(v => v > 0); if (n.ag <= 0 || k < 0) return false;
  c[k]--; n.ag = 0; emit({ k: 'calm', id: n.id, by: p.k, kind: k, soft: 1 }); pushState(); return true;
}
/* вогнегасник: конус піни — гасить пожежі, відкидає суперників і зомбі */
function doSpray(p, q, a) {
  if ((p.fo || 0) < FOAM_SHOT) return false;
  p.fo -= FOAM_SHOT; p.foT = 1.2;
  const R = 4.6, fx = Math.sin(a), fz = Math.cos(a);
  const inCone = (x, z, pad = 0) => { const dx = x - q.x, dz = z - q.z, d = Math.hypot(dx, dz); return d < R + pad && (d < .6 + pad || (dx * fx + dz * fz) / d > .62); };
  for (const o of ST.ps) {
    if (o === p) continue; const oq = posOf(o); if (!inCone(oq.x, oq.z)) continue; const an = Math.atan2(oq.x - q.x, oq.z - q.z);
    if (o.bot) { o.vx = Math.sin(an) * 9; o.vz = Math.cos(an) * 9; o.stun = Math.max(o.stun || 0, .8); } else emit({ k: 'shove', to: o.k, a: r2(an), by: p.k, f: 9, foam: 1 });
  }
  for (const n of ST.npc) if (inCone(n.x, n.z)) { const an = Math.atan2(n.x - q.x, n.z - q.z); n.vx = Math.sin(an) * 6; n.vz = Math.cos(an) * 6; if (n.zom) n.stun = Math.max(n.stun || 0, 2); else rile(n, 25, p.k); }
  ST.mf = ST.mf.filter(f => !inCone(f.x, f.z, f.r));
  if (ST.sf && inCone(ST.sf.x, ST.sf.z, ST.sf.r)) { ST.sf.hp -= 34; if (ST.sf.hp <= 0) { ST.sf = null; p.pages += 8; emit({ k: 'fireout', who: p.k }); } }
  emit({ k: 'spray', by: p.k, x: r2(q.x), z: r2(q.z), a: r2(a) }); pushState(); return true;
}
const CHAOS = {
  plane(me, d) { if (me.hold || (me.pl | 0) <= 0) return; me.pl--; launch(me, posOf(me), +d.a || 0, 'plane'); pushState(); },
  book(me, d) { if ((me.bk | 0) <= 0) return; me.bk--; launch(me, posOf(me), +d.a || 0, 'book'); pushState(); },
  paper(me, d) { if ((me.cr | 0) <= 0) return; me.cr--; launch(me, posOf(me), +d.a || 0, 'paper'); pushState(); },
  take(me, d) {   // F біля лотка / шафи / смітника — набрати «снарядів»
    const D = VAR[ST.v], i = d.i | 0, s = D.picks[i], q = posOf(me); if (!s || dist2(q.x, q.z, s.x, s.z) > 2.4) return;
    const it = ITEM[s.k], key = me.k + '|' + i;
    if ((me[s.k] | 0) >= it.max) { emit({ k: 'msg', to: me.k, txt: `${it.ic} Більше не влізе в кишені (макс. ${it.max}) — спершу покидай!` }); return; }
    if ((AU.take[key] || 0) > ST.t) { emit({ k: 'msg', to: me.k, txt: `${it.ic} Тут поки порожньо — зазирни за ${Math.ceil(AU.take[key] - ST.t)} с або знайди інше місце.` }); return; }
    AU.take[key] = ST.t + 6; me[s.k] = Math.min(it.max, (me[s.k] | 0) + it.add); emit({ k: 'take', who: me.k, it: s.k, n: me[s.k] }); pushState();
  },
  wire(me, d) { if (!me.wi || me.hold) return; me.wi = 0; launch(me, posOf(me), +d.a || 0, 'wire'); pushState(); },
  molo(me, d) { if ((me.mo | 0) <= 0) return; me.mo--; launch(me, posOf(me), +d.a || 0, 'molo'); pushState(); },
  wireget(me) { const q = posOf(me); if (me.wi || !VAR[ST.v].pcs.some(c => dist2(q.x, q.z, c.x, c.z) < 1.7)) return; me.wi = 1; emit({ k: 'wire', who: me.k }); pushState(); },
  cooler(me, d) {   // F біля кулера; ch — у кулер врізалось крісло (своє, з розгону, або кинуте — тоді далі)
    const q = posOf(me), c = VAR[ST.v].coolers[d.i | 0]; if (!c || dist2(q.x, q.z, c.x, c.z) > (d.ch ? 14 : 2.2)) return;
    if (spill(d.i | 0, me.k)) { if (d.ch) emit({ k: 'msg', to: me.k, txt: '🪑💥 Крісло врізалось у кулер — калюжа!' }); } else if (!d.ch) emit({ k: 'msg', to: me.k, txt: '🚰 Кулер порожній — чекай нову бутль.' });
  },
  spray(me, d) { doSpray(me, posOf(me), +d.a || 0); },
  coffee(me, d) { const q = posOf(me), n = ST.npc.find(n => n.id === d.id); if (n && dist2(q.x, q.z, n.x, n.z) < 2.8) serve(me, n); },
  refill(me) {
    const q = posOf(me); if (!VAR[ST.v].cof.some(c => dist2(q.x, q.z, c.x, c.z) < 3)) return;
    if ((AU.refill[me.k] || 0) > ST.t) { emit({ k: 'msg', to: me.k, txt: `☕ Кавомашина гріється: ${Math.ceil(AU.refill[me.k] - ST.t)} с` }); return; }
    AU.refill[me.k] = ST.t + 12; me.cf = (me.cf || [0, 0, 0]).map(v => Math.max(v, 1)); emit({ k: 'refill', who: me.k }); pushState();
  },
  arm(me) {
    const q = posOf(me), r = ST.rb; if (!r || r.arm || dist2(q.x, q.z, r.x, r.z) > 1.9) return;
    const kind = me.bo > 0 ? 'b' : me.mo > 0 ? 'm' : ''; if (!kind) return; if (kind === 'b') me.bo--; else me.mo--;
    Object.assign(r, { arm: kind, by: me.k, fuse: 14, rt: 0, path: null }); emit({ k: 'armed', by: me.k, m: kind === 'm' ? 1 : 0 }); pushState();
  },
};
/* рух по навігаційній сітці (колеги, Румба) */
function walkTo(e, D, tx, tz, sp, dt, stop) {
  if (!e.path || !e.goal || dist2(e.goal.x, e.goal.z, tx, tz) > 1 || (e.repath -= dt) <= 0) { e.path = navPath(D, e.x, e.z, tx, tz); e.goal = { x: tx, z: tz }; e.repath = 1.2; }
  while (e.path.length > 1 && dist2(e.x, e.z, e.path[0].x, e.path[0].z) < .45) e.path.shift();
  const wp = e.path[0], dw = dist2(e.x, e.z, wp.x, wp.z);
  if (dw > .12 && dist2(e.x, e.z, tx, tz) > stop) { e.f = Math.atan2(wp.x - e.x, wp.z - e.z); const s = Math.min(dw, sp * (wetAt(e.x, e.z) ? .7 : 1) * dt); e.x += Math.sin(e.f) * s; e.z += Math.cos(e.f) * s; }
}
function npcTick(n, dt, D) {
  n.stun = Math.max(0, (n.stun || 0) - dt); n.pcd = (n.pcd || 0) - dt;
  if (zapAt(n.x, n.z)) n.stun = Math.max(n.stun, .5);
  if (fireAt(n.x, n.z)) {   // вогонь: зомбі падає й «охолоняє», звичайний колега — закипає
    if (n.zom) { n.stun = Math.max(n.stun, .4); n.burn = (n.burn || 0) + dt; if (n.burn > 2) { n.burn = 0; calmNpc(n, '', -1); n.ag = 50; } } else rile(n, 30 * dt, '');
  }
  let tx = null, tz = null, sp = 1.3;
  if (n.zom) {
    if ((n.zt -= dt) <= 0) { calmNpc(n, '', -1); return; }
    if ((n.rt -= dt) <= 0) { n.rt = 4; const t = leaderBut(n.by); if (t) n.tgt = t.k; }
    const t = ST.ps.find(p => p.k === n.tgt), q = t && posOf(t);
    if (q && q.x < 1e3) {
      tx = q.x; tz = q.z; sp = 2.9;
      if (dist2(n.x, n.z, q.x, q.z) < 1.25 && n.pcd <= 0 && !n.stun) {   // «А можна тебе на хвилинку?» — збиває й цупить 2 сторінки
        n.pcd = 2.2; t.pages = Math.max(0, t.pages - 2); const a = Math.atan2(q.x - n.x, q.z - n.z);
        if (t.bot) { t.stun = Math.max(t.stun || 0, .9); t.vx = Math.sin(a) * 4; t.vz = Math.cos(a) * 4; }
        emit({ k: 'pester', id: n.id, to: t.k, a: r2(a) });
      }
    }
    // ланцюгова реакція: колеги поруч теж закипають
    for (const o of ST.npc) if (o !== n && !o.zom && dist2(o.x, o.z, n.x, n.z) < 2.6) { o.ag = Math.min(100, o.ag + 9 * dt); o.hitT = ST.t; if (!o.by) o.by = n.by; if (o.ag >= 100) zombify(o); }
  } else {
    if (n.ag > 0 && ST.t - (n.hitT || 0) > 4) n.ag = Math.max(0, n.ag - 3 * dt);
    if (n.wx != null && dist2(n.x, n.z, n.wx, n.wz) < .5) { n.wx = null; n.wait = rand(2, 5); }
    if (n.wx == null) { if ((n.wait = (n.wait || 0) - dt) <= 0) { const f = freeSpot(D); n.wx = f.x; n.wz = f.z; n.path = null; } }
    else { tx = n.wx; tz = n.wz; }
  }
  if (tx != null && !n.stun) walkTo(n, D, tx, tz, sp, dt, n.zom ? .9 : .2);
  if (n.vx || n.vz) { n.x += (n.vx || 0) * dt; n.z += (n.vz || 0) * dt; const k = Math.exp(-5 * dt); n.vx *= k; n.vz *= k; if (Math.hypot(n.vx, n.vz) < .05) n.vx = n.vz = 0; }
  solidPush(n, .35, D);
}
/* Румба: прибирає купи паперу; з бомбою/Молотовим — їде до суперника біля принтера (або до зомбі) і вибухає */
function rbTarget(r, P) {
  const riv = ST.ps.filter(p => p.k !== r.by).map(p => ({ p, q: posOf(p) })).filter(o => o.q.x < 1e3);
  const atP = riv.filter(o => dist2(o.q.x, o.q.z, P.x, P.z) < ZONE + 1).sort((a, b) => b.p.pages - a.p.pages)[0];
  if (atP) return atP.q;
  const z = ST.npc.filter(n => n.zom).sort((a, b) => dist2(r.x, r.z, a.x, a.z) - dist2(r.x, r.z, b.x, b.z))[0];
  if (z) return z;
  const top = riv.sort((a, b) => b.p.pages - a.p.pages)[0]; return top ? top.q : null;
}
function rbBoom(r) {
  const R = 3.2, x = r.x, z = r.z, hit = [];
  for (const p of ST.ps) {
    const q = posOf(p); if (dist2(q.x, q.z, x, z) > R) continue; const a = Math.atan2(q.x - x, q.z - z);
    p.pages = Math.max(0, p.pages - 5); hit.push(p.k);
    if (p.bot) { p.vx = Math.sin(a) * 14; p.vz = Math.cos(a) * 14; p.stun = 1.6; p.hold = false; p.bur = 0; } else emit({ k: 'shove', to: p.k, a: r2(a), by: r.by, f: 18, boom: 1 });
  }
  for (const n of ST.npc) if (dist2(n.x, n.z, x, z) < R) { const a = Math.atan2(n.x - x, n.z - z); n.vx = Math.sin(a) * 8; n.vz = Math.cos(a) * 8; if (n.zom) { calmNpc(n, r.by, -1); n.ag = 40; } else rile(n, 50, r.by); n.stun = 3; }
  if (r.arm === 'm') addFire(x, z, r.by);
  ST.rb = null; AU.rbIn = 12;
  emit({ k: 'rbboom', x: r2(x), z: r2(z), by: r.by, hit, m: r.arm === 'm' ? 1 : 0 }); pushState();
}
function rbTick(dt, D, P) {
  if (!ST.rb) { if ((AU.rbIn -= dt) <= 0) ST.rb = { x: D.rbDock.x, z: D.rbDock.z, f: 0, arm: '', by: '' }; return; }
  const r = ST.rb; let tx = null, tz = null, sp = 1.6;
  if (r.arm) {
    r.fuse -= dt; sp = 3.4;
    if ((r.rt -= dt) <= 0) { r.rt = .8; r.tgt = rbTarget(r, P); }
    if (r.tgt) { tx = r.tgt.x; tz = r.tgt.z; }
    if ((r.tgt && dist2(r.x, r.z, r.tgt.x, r.tgt.z) < 1.1) || r.fuse <= 0) { rbBoom(r); return; }
  } else {
    const pile = ST.piles.filter(s => !ST.ps.some(p => p.bur === s.id) && dist2(r.x, r.z, s.x, s.z) < 6).sort((a, b) => dist2(r.x, r.z, a.x, a.z) - dist2(r.x, r.z, b.x, b.z))[0];
    if (pile) { tx = pile.x; tz = pile.z; if (dist2(r.x, r.z, pile.x, pile.z) < .6) { ST.piles = ST.piles.filter(s => s !== pile); emit({ k: 'clean', x: pile.x, z: pile.z }); } }
    else { if (r.wx == null || dist2(r.x, r.z, r.wx, r.wz) < .6 || (r.wt -= dt) <= 0) { const f = freeSpot(D); r.wx = f.x; r.wz = f.z; r.wt = 12; } tx = r.wx; tz = r.wz; }
  }
  if (tx != null && !zapAt(r.x, r.z)) walkTo(r, D, tx, tz, sp, dt, .1);
  solidPush(r, .3, D);
}
/* пожежі, калюжі, поповнення літачків і піни; боти в огні тікають, під струмом — завмирають */
function chaosTick(dt, D, P) {
  if (AU.fireIn > 0 && (AU.fireIn -= dt) <= 0) { AU.fireIn = 0; if (!ST.sf) startServerFire(); }
  if (ST.sf) { const f = ST.sf; f.r = Math.min(3.6, f.r + .05 * dt); f.hp = Math.min(100, f.hp + 2 * dt); if ((f.t -= dt) <= 0) { ST.sf = null; emit({ k: 'fireout', who: '' }); } }
  for (const f of ST.mf) f.t -= dt; ST.mf = ST.mf.filter(f => f.t > 0);
  for (const w of ST.wp) { w.t -= dt; if (w.el > 0) w.el = Math.max(0, w.el - dt); } ST.wp = ST.wp.filter(w => w.t > 0);
  for (const p of ST.ps) {
    if (p.bot && (p.pl | 0) < PLANE_MAX) { p.plT = (p.plT || 0) + dt; if (p.plT >= PLANE_REGEN) { p.plT = 0; p.pl = (p.pl | 0) + 1; } } else p.plT = 0;
    if ((p.foT = (p.foT || 0) - dt) <= 0) p.fo = Math.min(100, (p.fo || 0) + 6 * dt);
    if (!p.bot) continue;
    if (zapAt(p.x, p.z)) p.stun = Math.max(p.stun || 0, .6);
    const f = fireAt(p.x, p.z); if (f) { const a = Math.atan2(p.x - f.x, p.z - f.z); p.vx = Math.sin(a) * 5; p.vz = Math.cos(a) * 5; p.stun = Math.max(p.stun || 0, .3); }
  }
  for (const n of ST.npc) npcTick(n, dt, D);
  rbTick(dt, D, P);
}
/* на ковзанці всі врізаються одне в одного */
function bumps() {
  const L = ST.ps.map(p => ({ p, q: posOf(p) }));
  for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
    const a = L[i], b = L[j], d = dist2(a.q.x, a.q.z, b.q.x, b.q.z);
    if (d > .85 || !(slimeAt(a.q.x, a.q.z) || slimeAt(b.q.x, b.q.z))) continue;
    const key = a.p.k + '|' + b.p.k; if ((AU.bump[key] || 0) > ST.t) continue; AU.bump[key] = ST.t + .7;
    const ang = Math.atan2(b.q.x - a.q.x, b.q.z - a.q.z);
    for (const [e, an] of [[a.p, ang + Math.PI], [b.p, ang]]) {
      if (e.bot) { e.vx = (e.vx || 0) + Math.sin(an) * 6; e.vz = (e.vz || 0) + Math.cos(an) * 6; e.stun = Math.max(e.stun || 0, .35); }
      else emit({ k: 'shove', to: e.k, a: r2(an), by: (e === a.p ? b.p : a.p).k, f: 7, slip: 1 });
    }
  }
}
/* бот: біжить до принтера, штовхає, лагодить, тікає від начальника, збирає пачки й жбурляє їх, ловить картридж */
function botTick(b, dt, D, P) {
  b.cd -= dt; b.tcd = (b.tcd || 0) - dt; b.blind = Math.max(0, (b.blind || 0) - dt);
  const slick = slimeAt(b.x, b.z) || wetAt(b.x, b.z); let want = null;
  const fireman = ST.sf && (b.fo || 0) >= FOAM_SHOT && ST.ps.filter(p => p.bot).sort((u, v) => dist2(u.x, u.z, ST.sf.x, ST.sf.z) - dist2(v.x, v.z, ST.sf.x, ST.sf.z))[0] === b;
  if (b.stun > 0) b.stun -= dt;
  else if (b.blind > 0) { if (b.wa == null || Math.random() < dt * 2) b.wa = rand(0, 6.28); want = [Math.sin(b.wa) * 2.2, Math.cos(b.wa) * 2.2]; b.f = b.wa; }   // папери в обличчя — бреде навмання
  else {
    let tx = P.x, tz = P.z;
    const sheet = b.hold ? null : ST.stacks.reduce((a, s) => !a || dist2(b.x, b.z, s.x, s.z) < dist2(b.x, b.z, a.x, a.z) ? s : a, null);
    const pu = ST.pu && dist2(b.x, b.z, ST.pu.x, ST.pu.z) < 9 ? ST.pu : null;
    if (fireman) { const a = Math.atan2(b.x - ST.sf.x, b.z - ST.sf.z), rr = ST.sf.r + 1.4; tx = ST.sf.x + Math.sin(a) * rr; tz = ST.sf.z + Math.cos(a) * rr; }   // найближчий бот біжить гасити серверну
    else if (ST.ev === 'boss') { const c = D.spots.reduce((a, q) => dist2(b.x, b.z, q.x, q.z) < dist2(b.x, b.z, a.x, a.z) ? q : a); tx = c.x; tz = c.z; }
    else if (pu) { tx = pu.x; tz = pu.z; }
    else if (sheet && dist2(b.x, b.z, sheet.x, sheet.z) < 9) { tx = sheet.x; tz = sheet.z; }
    else {
      const a = b.col * 1.2566 + .8; tx = P.x + Math.sin(a) * 1.6; tz = P.z + Math.cos(a) * 1.6;
      const rival = ST.ps.filter(p => p !== b && !(p.stun > .3)).map(p => ({ p, q: posOf(p) })).filter(o => dist2(o.q.x, o.q.z, P.x, P.z) < ZONE + .4 && (!o.p.bur || dist2(b.x, b.z, o.q.x, o.q.z) < 1.3)).sort((u, v) => dist2(b.x, b.z, u.q.x, u.q.z) - dist2(b.x, b.z, v.q.x, v.q.z))[0];
      if (rival && dist2(b.x, b.z, P.x, P.z) < ZONE + 2.5) { tx = rival.q.x; tz = rival.q.z; }   // у колі хтось інший — іду штовхати
    }
    // шлях через двері: перераховуємо, коли ціль змінилась або раз на 1,5 с
    if (!b.path || !b.goal || dist2(b.goal.x, b.goal.z, tx, tz) > 1 || (b.repath -= dt) <= 0) { b.path = navPath(D, b.x, b.z, tx, tz); b.goal = { x: tx, z: tz }; b.repath = 1.5; }
    while (b.path.length > 1 && dist2(b.x, b.z, b.path[0].x, b.path[0].z) < .45) b.path.shift();
    const wp = b.path[0], d = dist2(b.x, b.z, tx, tz), dw = dist2(b.x, b.z, wp.x, wp.z), sp = 4.6;
    if (dw > .2 && d > .3) { b.f = Math.atan2(wp.x - b.x, wp.z - b.z); want = [Math.sin(b.f) * sp * Math.min(1, dw * 2), Math.cos(b.f) * sp * Math.min(1, dw * 2)]; } else want = [0, 0];
    if (sheet && dist2(b.x, b.z, sheet.x, sheet.z) < .8) { ST.stacks = ST.stacks.filter(s => s !== sheet); b.pages += 4; b.hold = true; }
    if (pu && dist2(b.x, b.z, pu.x, pu.z) < .9) { ST.pu = null; AU.puIn = rand(22, 30); b.turbo = 10; emit({ k: 'turbo', who: b.k }); }
    if (ST.ev === 'jam' && dist2(b.x, b.z, P.x, P.z) < 2.2 && Math.random() < dt * .25) { ST.ev = ''; b.pages += 10; emit({ k: 'fixed', who: b.k }); }
    // з пачкою в руках — жбурнути в того, хто друкує (або в найближчого)
    if (b.hold && b.tcd <= 0) {
      const t = ST.ps.filter(p => p !== b && !p.blind).map(p => ({ p, q: posOf(p) })).filter(o => dist2(b.x, b.z, o.q.x, o.q.z) < 7).sort((u, v) => (v.p.k === ST.owner) - (u.p.k === ST.owner) || dist2(b.x, b.z, u.q.x, u.q.z) - dist2(b.x, b.z, v.q.x, v.q.z))[0];
      if (t && dist2(b.x, b.z, t.q.x, t.q.z) > 1.2) { const a = Math.atan2(t.q.x - b.x, t.q.z - b.z); b.f = a; b.tcd = rand(1.5, 2.5); throwFrom(b, b, a); }
    }
    if (fireman && dist2(b.x, b.z, ST.sf.x, ST.sf.z) < ST.sf.r + 3 && (b.scd = (b.scd || 0) - dt) <= 0) { b.scd = .9; const a = Math.atan2(ST.sf.x - b.x, ST.sf.z - b.z); b.f = a; doSpray(b, b, a); }
    // літачок: відстаю — злю колегу біля лідера (хай іде діставати); інакше — у вухо тому, хто друкує
    if (!b.hold && (b.pl | 0) > 0 && (b.pcd = (b.pcd == null ? rand(3, 6) : b.pcd) - dt) <= 0) {
      b.pcd = rand(4, 7);
      const lead = leaderBut(b.k), o = ST.ps.find(p => p.k === ST.owner && p !== b);
      const t = lead && lead.pages > b.pages + 5 ? ST.npc.find(n => !n.zom && dist2(b.x, b.z, n.x, n.z) < 9 && dist2(b.x, b.z, n.x, n.z) > 1.5) || (o && posOf(o)) : o && posOf(o);
      if (t && dist2(b.x, b.z, t.x, t.z) < 10 && dist2(b.x, b.z, t.x, t.z) > 1.2) { const a = Math.atan2(t.x - b.x, t.z - b.z); b.f = a; b.pl--; launch(b, b, a, 'plane'); }
    }
    { const pz = ST.npc.find(n => n.zom && n.tgt === b.k && dist2(n.x, n.z, b.x, b.z) < 2); if (pz && b.cf && b.cf[pz.want] > 0 && Math.random() < dt * .7) serve(b, pz); }   // бот пригощає зомбі кавою
    // штовхнути найближчого суперника в зоні
    if (b.cd <= 0) for (const p of ST.ps) {
      if (p === b) continue; const q = posOf(p), dd = dist2(b.x, b.z, q.x, q.z);
      if (dd < 1.5 && dist2(q.x, q.z, P.x, P.z) < ZONE + 1) {
        const a = Math.atan2(q.x - b.x, q.z - b.z); b.cd = rand(1.1, 1.8); b.f = a;
        if (p.bot) { p.vx = Math.sin(a) * 8; p.vz = Math.cos(a) * 8; p.stun = .6; }
        emit({ k: 'shove', to: p.k, a: r2(a), by: b.k });
        break;
      }
    }
  }
  // рух через швидкість: на тонері — ковзає, не загальмуєш
  b.vx = b.vx || 0; b.vz = b.vz || 0;
  if (want) { const k = Math.min(1, dt * (slick ? 1.4 : 14)); b.vx += (want[0] - b.vx) * k; b.vz += (want[1] - b.vz) * k; }
  else { const k = Math.exp(-(slick ? .5 : 4) * dt); b.vx *= k; b.vz *= k; }
  b.x += b.vx * dt; b.z += b.vz * dt;
  solidPush(b, .35, D);   // стіни й меблі
}
A.on('tick', dt => {
  if (AUTH()) authTick(dt);
  else if (ST.ph === 'fight') {
    ST.t += dt; if (ST.sl) ST.sl[3] -= dt;
    for (const p of ST.ps) if (p.bot && p.tx != null) { p.x = lerp(p.x, p.tx, Math.min(1, dt * 10)); p.z = lerp(p.z, p.tz, Math.min(1, dt * 10)); }
    for (const n of ST.rb ? ST.npc.concat([ST.rb]) : ST.npc) if (n.tx != null) { n.x = lerp(n.x, n.tx, Math.min(1, dt * 10)); n.z = lerp(n.z, n.tz, Math.min(1, dt * 10)); }
  }
  if (!SIMSIDE) clientTick(dt);
});
/* тонер ковзкий для гравця (рух гри вже вміє ковзати — як по сиропу), для крісел і зомбі теж */
if (typeof onSyrup === 'function') { const _os = onSyrup; onSyrup = function (x, z) { return slimeAt(x, z) || wetAt(x, z) || _os.apply(this, arguments); }; }   // + калюжа з кулера

/* ======================= ДАЛІ — ЛИШЕ В ГРАВЦЯ ======================= */
const V = { bots: new Map(), floors: [], stacks: new Map(), piles: new Map(), held: new Map(), proj: [], hud: null, goalEl: null, lbl: null, tags: new Map(), music: -1, fix: null, shoveCd: 0, paperT: 0, flying: [], bar: false, faceT: 0, slime: null, pu: null, boss: null, slipT: 0, npc: new Map(), rbM: null, fires: new Map(), wps: new Map(), stunT: 0, burnT: 0, wetT: 0 };
const amIn = () => ST.ps.some(p => p.k === myKey());
const meP = () => ST.ps.find(p => p.k === myKey());
const nameOf = k => k === 'me' ? 'Ти' : escapeHTML(k);

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
    tv(x, z, rot, w = 2) { const o = new THREE.Group(); put(o, mesh(new THREE.BoxGeometry(w, 1.1, .08), '#2E2346'), 0, 1.5, 0); put(o, mesh(new THREE.BoxGeometry(w - .15, .95, .02), bulb(pick(['#6BB8FF', '#7FE08A', '#6BE7FF'])), false), 0, 1.5, .05); return at(o, x, z, rot); },
    board(x, z, rot, w = 2) { const o = new THREE.Group(); put(o, mesh(new THREE.BoxGeometry(w, 1.1, .06), '#FFFFFF'), 0, 1.4, 0); for (let k = 0; k < 4; k++) put(o, mesh(new THREE.BoxGeometry(rand(.4, w - .4), .04, .02), pick(['#E0607E', '#6BB8FF', '#2E2346']), false), rand(-.3, .3), 1.2 + k * .15, .04); return at(o, x, z, rot); },
    bossDesk(x, z, rot) {
      const o = new THREE.Group();
      put(o, mesh(new THREE.BoxGeometry(2.6, .1, 1.1), '#6B4A3A'), 0, .78, 0); put(o, mesh(new THREE.BoxGeometry(2.5, .72, 1), '#7E5A46'), 0, .38, 0);
      put(o, mesh(new THREE.BoxGeometry(.8, .5, .05), '#2E2346'), .5, 1.1, -.3); put(o, mesh(new THREE.BoxGeometry(.72, .42, .02), bulb('#7FE08A'), false), .5, 1.1, -.27);
      put(o, mesh(new THREE.BoxGeometry(.3, .25, .2), '#FFE066'), -.8, .95, -.2);   // кубок «Найкращий бос»
      const ch = new THREE.Group(); put(ch, mesh(new THREE.BoxGeometry(.8, .15, .75), '#2E2346'), 0, .55, 0); put(ch, mesh(new THREE.BoxGeometry(.8, 1.1, .15), '#2E2346'), 0, 1.1, -.32); put(ch, mesh(flat(new THREE.CylinderGeometry(.06, .06, .45, 6)), '#4E4A6E'), 0, .27, 0); ch.position.set(0, 0, .9); ch.rotation.y = Math.PI; o.add(ch);
      return at(o, x, z, rot);
    },
    // серверна стійка з мерехтливими діодами
    rack(x, z, rot) {
      const o = new THREE.Group(); put(o, mesh(new THREE.BoxGeometry(.76, 2, 1), '#262B42'), 0, 1, 0); put(o, mesh(new THREE.BoxGeometry(.66, 1.8, .02), '#3A4166', false), 0, 1, .51);
      for (let y = 0; y < 6; y++) put(o, mesh(new THREE.BoxGeometry(.5, .04, .02), bulb(pick(['#7FE08A', '#6BE7FF', '#7FE08A', '#FFE066'])), false), rand(-.05, .05), .35 + y * .27, .53);
      return at(o, x, z, rot);
    },
    beanbag(x, z) { const o = new THREE.Group(); const m = put(o, mesh(new THREE.SphereGeometry(.55, 10, 8), pick(['#F2A65A', '#FF6BD6', '#6BE7FF', '#7FE08A', '#B07CF0'])), 0, .3, 0); m.scale.set(1, .6, 1); return at(o, x, z, 0); },
    lift(x, z, rot) {   // двері ліфта на стіні
      const o = new THREE.Group(); put(o, mesh(new THREE.BoxGeometry(2, 2.5, .1), '#8E86B0', false), 0, 1.25, 0);
      for (const s of [-1, 1]) put(o, mesh(new THREE.BoxGeometry(.78, 2.2, .06), '#D9DDE8', false), s * .4, 1.1, .06);
      put(o, mesh(new THREE.BoxGeometry(.5, .16, .04), bulb('#FF5C7A'), false), 0, 2.38, .07);
      return at(o, x, z, rot);
    },
    ups(x, z) { const o = new THREE.Group(); put(o, mesh(new THREE.BoxGeometry(1, 1.8, .9), '#3E3A5C'), 0, .9, 0); for (let y = 0; y < 3; y++) put(o, mesh(new THREE.BoxGeometry(.04, .3, .6), bulb('#7FE08A'), false), -.52, .6 + y * .4, 0); return at(o, x, z, 0); },
    mic(x, z) { const o = new THREE.Group(); put(o, mesh(flat(new THREE.CylinderGeometry(.02, .02, .4, 5)), '#2E2346', false), 0, 1, 0); put(o, mesh(new THREE.SphereGeometry(.08, 8, 6), '#4E4A6E', false), 0, 1.22, 0); return at(o, x, z, 0); },
    // підлога кімнати
    floor(x0, z0, x1, z1, col, y = .012) { const m = mesh(new THREE.BoxGeometry(x1 - x0, .02, z1 - z0), col, false, true); m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); g.add(m); return m; },
    tiles(x0, z0, x1, z1, a, b) { K.floor(x0, z0, x1, z1, a); for (let x = x0; x < x1 - .01; x += 1) for (let z = z0; z < z1 - .01; z += 1) if ((Math.floor(x - x0) + Math.floor(z - z0)) % 2) K.floor(x, z, Math.min(x1, x + 1), Math.min(z1, z + 1), b, .018); },
  };
  return K;
}
/* стіни: відрізки з дверними прорізами; glass — скляна перегородка, part — низька перегородка кабінок */
function wallMeshes(g, W, H = 1.15) {
  for (const w of W) for (const [a, b] of wallParts(w)) {
    const horiz = w.z1 === w.z2, len = b - a; if (len < .05) continue;
    const mx = horiz ? (a + b) / 2 : w.x1, mz = horiz ? w.z1 : (a + b) / 2, h = w.part ? .95 : w.glass ? H + .4 : H;
    const m = mesh(new THREE.BoxGeometry(horiz ? len : (w.part ? .12 : .2), h, horiz ? (w.part ? .12 : .2) : len), w.glass ? mat('#BFE6FF', { transparent: true, opacity: .35 }) : (w.part ? '#F2A65A' : w.col || '#ECE6FB'), !w.glass);
    m.position.set(mx, h / 2, mz); g.add(m);
    const t = mesh(new THREE.BoxGeometry(horiz ? len : .26, .08, horiz ? .26 : len), w.glass ? '#8E86B0' : w.part ? '#4FA3A0' : '#9F8BE0', false); t.position.set(mx, h + .04, mz); g.add(t);
  }
  for (const w of W) for (const d of w.doors || []) { const horiz = w.z1 === w.z2, h = w.part ? 1.05 : H + .5; for (const s of [-1, 1]) { const px = horiz ? d + s * .95 : w.x1, pz = horiz ? w.z1 : d + s * .95; put(g, mesh(new THREE.BoxGeometry(.24, h, .24), w.part ? '#4FA3A0' : '#9F8BE0', false), px, h / 2, pz); } }
}
function canvasTex(txt, fg = '#FFE066', bg = '#2E2346', w = 1024, h = 205, font = 120) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext && c.getContext('2d');
  if (x && x.fillText) { x.fillStyle = bg; x.fillRect(0, 0, w, h); x.font = `bold ${font}px sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = fg; x.fillText(txt, w / 2, h / 2 + 4); }
  return new THREE.CanvasTexture(c);
}
/* ---------- Хмарочос у центрі міста (з scratchpad/city.js; меші з текстурою — через A.dynamic) ---------- */
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

/* ---------- Модель поверху ---------- */
function printerModel(wheels) {
  const g = new THREE.Group();
  put(g, mesh(new THREE.BoxGeometry(1.7, 1.2, 1.4), '#EDEBF5'), 0, .6 + (wheels ? .18 : 0), 0);
  put(g, mesh(new THREE.BoxGeometry(1.75, .25, 1.45), '#4E4A6E'), 0, 1.3 + (wheels ? .18 : 0), 0);
  put(g, mesh(new THREE.BoxGeometry(1.2, .06, .8), '#FFFFFF', false), 0, 1.46 + (wheels ? .18 : 0), -.1);
  put(g, mesh(new THREE.BoxGeometry(1.1, .08, .5), '#8E86B0', false), 0, .9 + (wheels ? .18 : 0), .85);
  put(g, mesh(new THREE.BoxGeometry(.4, .25, .05), '#2E2346', false), .5, 1.1 + (wheels ? .18 : 0), .71);
  if (wheels) {   // колеса й помаранчева мигалка «обережно, їду»
    for (const [x, z] of [[-.7, -.55], [.7, -.55], [-.7, .55], [.7, .55]]) put(g, mesh(flat(new THREE.CylinderGeometry(.16, .16, .12, 10)), '#2E2346', false), x, .16, z).rotation.z = Math.PI / 2;
    g.userData.beacon = put(g, new THREE.Mesh(new THREE.SphereGeometry(.14, 8, 6), new THREE.MeshBasicMaterial({ color: '#F2A65A' })), -.6, 1.75, -.4);
  }
  g.userData.led = put(g, new THREE.Mesh(new THREE.SphereGeometry(.12, 10, 8), new THREE.MeshBasicMaterial({ color: '#7FE08A' })), -.55, 1.15 + (wheels ? .18 : 0), .72);
  return g;
}
function buildFloor(D) {
  const g = new THREE.Group(); scene.add(g);
  buildTowerFloor(g, D.cx, D.cz, D.w, D.d, { night: D.night, seed: 4200 + D.i * 77 });
  const K = officeKit(g), F = (x0, z0, x1, z1, c) => K.floor(D.cx + x0, D.cz + z0, D.cx + x1, D.cz + z1, c);
  for (const f of D.floors) F(...f);
  if (D.tiles) { const [x0, z0, x1, z1, a, b] = D.tiles; K.tiles(D.cx + x0, D.cz + z0, D.cx + x1, D.cz + z1, a, b); }
  if (D.i === 0) for (let x = -7.5; x <= 7.5; x += 3) F(x - .5, -.15, x + .5, .15, '#FFE066');   // розмітка в коридорі
  if (D.route) for (let k = 0; k < D.route.length; k++) {   // жовта колія принтера на колесах
    const a = D.route[k], b = D.route[(k + 1) % D.route.length], l = dist2(a.x, a.z, b.x, b.z);
    for (let s = .4; s < l; s += 1.2) { const x = a.x + (b.x - a.x) * s / l, z = a.z + (b.z - a.z) * s / l, hz = Math.abs(b.x - a.x) > .1; const m = mesh(new THREE.BoxGeometry(hz ? .7 : .14, .02, hz ? .14 : .7), '#FFE066', false); m.position.set(x, .03, z); g.add(m); }
  }
  wallMeshes(g, D.walls);
  for (const [t, x, z, rot, a5] of D.furn) {
    const X = D.cx + x, Z = D.cz + z;
    if (t === 'desk') K.desk(X, Z, rot);
    else if (t === 'chair') K.chair(X, Z, rot);
    else if (t === 'mtable') K.table(X, Z, 7, 1.6, '#4E3A7C');
    else if (t === 'ktable') K.table(X, Z, 2.4, 1.2, '#E8DCC8');
    else if (t === 'ctable') { const o = K.table(X, Z, 1.6, .8, '#6B4A3A'); o.scale.y = .6; }
    else if (t === 'sofa') K.sofa(X, Z, rot, 2.6, a5 || '#8F7BD6');
    else if (t === 'plant') K.plant(X, Z, rot);
    else if (t === 'cooler') K.cooler(X, Z);
    else if (t === 'tv') K.tv(X, Z, rot, a5 || 2);
    else if (t === 'board') K.board(X, Z, rot, a5 || 2.4);
    else if (t === 'counter') K.counter(X, Z, rot, 5);
    else if (t === 'island') K.counter(X, Z, rot, 2.8);
    else if (t === 'fridge') K.fridge(X, Z, rot);
    else if (t === 'boss') K.bossDesk(X, Z, rot);
    else if (t === 'shelf') K.shelf(X, Z, rot, a5 || 2);
    else if (t === 'pshelf') { const o = K.shelf(X, Z, rot, 1.4); o.scale.y = .7; }
    else if (t === 'rack') K.rack(X, Z, rot);
    else if (t === 'beanbag') K.beanbag(X, Z);
    else if (t === 'lift') K.lift(X, Z, rot);
    else if (t === 'ups') K.ups(X, Z);
    else if (t === 'mic') K.mic(X, Z);
    else if (PICK[t]) pickModel(g, PICK[t], X, Z, rot);
    else if (t === 'reception') {
      put(g, mesh(new THREE.BoxGeometry(.8, 1.1, 4.8), '#4E3A7C'), X, .55, Z); put(g, mesh(new THREE.BoxGeometry(1, .08, 5), '#E8DCC8'), X, 1.12, Z);
      put(g, mesh(new THREE.BoxGeometry(.06, .3, 3), bulb('#FF6BD6'), false), X + .42, .8, Z);
    }
  }
  // логотип поверху на стіні (з текстурою — тільки динамічним)
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(5, 1), new THREE.MeshBasicMaterial({ map: canvasTex(D.logo, '#FFE066', '#2E2346', 1024, 205, D.logo.length > 18 ? 84 : 110), transparent: true, depthWrite: false }));
  sign.position.set(D.cx + D.logoAt[0], 2, D.cz + D.logoAt[1]); sign.rotation.y = D.logoAt[2]; scene.add(A.dynamic(sign));
  // стенд лобі (F — відкрити вікно лобі з голосуванням)
  const B = D.board;
  put(g, mesh(new THREE.BoxGeometry(.12, 1.6, .12), '#4E4A6E'), B.x - .9, .8, B.z); put(g, mesh(new THREE.BoxGeometry(.12, 1.6, .12), '#4E4A6E'), B.x + .9, .8, B.z);
  put(g, mesh(new THREE.BoxGeometry(2.1, 1, .1), '#2E2346'), B.x, 1.9, B.z);
  put(g, mesh(new THREE.BoxGeometry(1.9, .8, .02), bulb('#7FE08A'), false), B.x, 1.9, B.z + .06);
  D.v = { rings: [], prns: [] };
  // кнопка тривоги на стіні
  put(g, mesh(new THREE.BoxGeometry(.12, .6, .5), '#FFE066', false), D.alarm.x + .08, 1.3, D.alarm.z);
  D.v.alarm = new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, .14, 12), new THREE.MeshBasicMaterial({ color: '#FF2E4D' })); D.v.alarm.rotation.z = Math.PI / 2; D.v.alarm.position.set(D.alarm.x - .02, 1.3, D.alarm.z); scene.add(A.dynamic(D.v.alarm));
  // принтери, зони (динамічні — рухаються й міняють колір)
  for (const p of D.prn) {
    put(g, mesh(flat(new THREE.CylinderGeometry(ZONE, ZONE, .06, 32)), D.route ? '#FFF3C4' : '#E9E2FA', false, true), p.x, .03, p.z).visible = !D.route;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(ZONE, .09, 6, 48), new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: .9, depthWrite: false })); ring.rotation.x = Math.PI / 2; ring.position.set(p.x, .1, p.z); scene.add(A.dynamic(ring));
    const m = printerModel(!!D.route); m.position.set(p.x, 0, p.z); scene.add(A.dynamic(m));
    D.v.rings.push(ring); D.v.prns.push(m);
  }
  // плаваючі значки над лотками / шафами / смітниками — видно здалеку (динамічні: крутяться)
  D.v.picks = D.picks.map(s => { const m = pickIcon(s.k); m.position.set(s.x, s.k === 'bk' ? 2.25 : 1.7, s.z); scene.add(A.dynamic(m)); return m; });
  V.floors[D.i] = D;
  return g;
}
/* ---------- Звідки брати «снаряди»: лоток з папером, книжкова шафа, смітник ---------- */
const PICK_COL = { pl: '#6BB8FF', bk: '#FFA552', cr: '#7FE08A' };
function pickModel(g, k, X, Z, rot) {
  const o = new THREE.Group(); o.position.set(X, 0, Z); o.rotation.y = rot || 0; g.add(o);
  const ring = put(o, mesh(new THREE.TorusGeometry(k === 'bk' ? 1.05 : .78, .05, 6, 28), PICK_COL[k], false), 0, .04, k === 'bk' ? .25 : 0); ring.rotation.x = Math.PI / 2;
  if (k === 'pl') {   // тумба з пачками паперу А4
    put(o, mesh(new THREE.BoxGeometry(.72, .72, .52), '#C9CDD9'), 0, .36, 0); put(o, mesh(new THREE.BoxGeometry(.6, .05, .02), '#8E86B0', false), 0, .55, .27);
    for (let y = 0; y < 4; y++) { const r = put(o, mesh(new THREE.BoxGeometry(.44, .09, .32), '#FFFFFF', false), rand(-.04, .04), .77 + y * .1, rand(-.03, .03)); r.rotation.y = rand(-.2, .2); put(o, mesh(new THREE.BoxGeometry(.45, .03, .1), y % 2 ? '#6BB8FF' : '#FFE066', false), r.position.x, r.position.y + .01, r.position.z); }
    for (let s = 0; s < 3; s++) { const a = put(o, mesh(new THREE.BoxGeometry(.3, .01, .22), '#FFFFFF', false), rand(-.6, .6), .02, rand(-.5, .5)); a.rotation.y = rand(0, 3); }   // аркуші на підлозі
  } else if (k === 'bk') {   // шафа з кольоровими корінцями
    put(o, mesh(new THREE.BoxGeometry(1.6, 1.75, .42), '#8C5A3C'), 0, .875, 0);
    for (let y = 0; y < 4; y++) {
      put(o, mesh(new THREE.BoxGeometry(1.5, .04, .36), '#6B4A3A', false), 0, .12 + y * .42, .05);
      let x = -.7; while (x < .66) { const w = rand(.07, .13), h = rand(.26, .36); put(o, mesh(new THREE.BoxGeometry(w, h, .3), pick(['#E0607E', '#6BB8FF', '#FFE066', '#7FE08A', '#B07CF0', '#F2A65A', '#2E2346']), false), x + w / 2, .14 + y * .42 + h / 2, .07); x += w + .015; }
    }
  } else {   // смітник, повний мʼятого паперу, і папірці навколо
    put(o, mesh(flat(new THREE.CylinderGeometry(.3, .24, .6, 12)), '#4E7FC4'), 0, .3, 0); put(o, mesh(flat(new THREE.TorusGeometry(.29, .035, 6, 16)), '#2E2346', false), 0, .6, 0).rotation.x = Math.PI / 2;
    for (let i = 0; i < 6; i++) put(o, mesh(flat(new THREE.IcosahedronGeometry(.1, 0)), '#F4F1FA', false), rand(-.15, .15), .62 + rand(0, .1), rand(-.15, .15));
    for (let i = 0; i < 5; i++) { const a = rand(0, 6.28), d = rand(.45, .7); put(o, mesh(flat(new THREE.IcosahedronGeometry(.09, 0)), '#FFFFFF', false), Math.sin(a) * d, .08, Math.cos(a) * d); }
  }
  return o;
}
function pickIcon(k) {   // те, що даєш: літачок / книжка / папірець
  if (k === 'pl') return projMesh('plane');
  const o = new THREE.Group();
  if (k === 'bk') { put(o, mesh(new THREE.BoxGeometry(.42, .1, .32), '#3E7BD6', false), 0, 0, 0); put(o, mesh(new THREE.BoxGeometry(.38, .08, .3), '#FFFFFF', false), .03, 0, 0); }
  else put(o, mesh(flat(new THREE.IcosahedronGeometry(.17, 0)), '#F4F1FA', false), 0, 0, 0);
  return o;
}
function botMesh(p) {
  let v = V.bots.get(p.k); if (v) return v;
  const h = buildOffice(pick(['#AFC4B6', '#C9D6CF', '#D9C7A9']), COL[p.col % NC]); scene.add(h.root);
  v = { h }; V.bots.set(p.k, v); return v;
}
function stackMesh() { const o = new THREE.Group(); put(o, mesh(new THREE.BoxGeometry(.5, .22, .66), '#FFFFFF', false), 0, .11, 0); put(o, mesh(new THREE.BoxGeometry(.52, .08, .2), '#6BB8FF', false), 0, .12, 0); return o; }
function pileMesh() {
  const o = new THREE.Group();
  put(o, mesh(new THREE.SphereGeometry(.75, 8, 6), '#F4F1FA', false), 0, 0, 0).scale.set(1, .45, 1);
  for (let k = 0; k < 9; k++) { const s = put(o, mesh(new THREE.BoxGeometry(.42, .02, .58), '#FFFFFF', false), rand(-.6, .6), rand(.1, .4), rand(-.6, .6)); s.rotation.set(rand(-.5, .5), rand(0, 3), rand(-.5, .5)); }
  return o;
}

/* ---------- Події ---------- */
function onEvent(e) {
  if (SIMSIDE || !e) return;
  const here = running && inArena(pl.x, pl.z);
  if (e.k === 'msg') { if (here && (!e.to || e.to === myKey())) toast(e.txt); }
  else if (e.k === 'go') {
    const D = VAR[e.v | 0];
    if (amIn() && running && !pl.dead && varAt(pl.x, pl.z) !== D.i) {   // голосування переможе інший поверх — ліфтом туди
      const i = Math.max(0, (e.spots || []).indexOf(myKey())), s = D.spots[i % D.spots.length];
      pl.x = s.x; pl.z = s.z; pl.y = 0; pl.safe = { x: s.x, z: s.z }; pl.kx = pl.kz = 0; camPos.set(pl.x, 20, pl.z + 15); camLook.set(pl.x, .5, pl.z);
    }
    if (inArena(pl.x, pl.z)) { banner(`🖨️ БИТВА ЗА ПРИНТЕР! ${D.n}`); toast(`🛗 ${D.n}: ${D.tip}. Стій біля принтера сам — друкуй!`); sfx('level'); }
  }
  else if (e.k === 'shove') {
    if (e.to === myKey() && amIn() && !pl.dead) {
      const m = meP(), bur = m && m.bur, f = (+e.f || 14) * (bur ? .3 : 1);
      knockMe(+e.a || 0, f, e.plane ? '✈️ Літачок у вухо!' : e.book ? '📘 Книжкою по голові!' : e.paper ? '🧻 Папірцем у лоб!' : e.foam ? '🧯 Піною в обличчя!' : e.boom ? '💥 Румба-камікадзе! −5 📄' : e.slip ? 'Бац! Тонер ковзкий!' : bur ? '📄 Купа паперу тримає!' : `${e.by && e.by !== 'me' ? escapeHTML(e.by) : 'Хтось'}: «Моя черга!»`); sfx('hurt'); shake = Math.max(shake, .25);
    } else if (here) { const p = ST.ps.find(q => q.k === e.by); if (p) { const q = posOf(p); burst(q.x, 1.2, q.z, '#FFF3E6', 6, 3, .4, 2); sfx('hit', q.x, q.z); } }
  }
  else if (e.k === 'bonk') { if (here) { const p = ST.ps.find(q => q.k === e.who); if (p) { ftext(p.x, 2.4, p.z, pick(['Ай!', 'Це був мій принтер!', 'Я на HR поскаржусь!']), 'crit'); burst(p.x, 1.2, p.z, '#FFF3E6', 8, 3, .4, 2); } } }
  else if (e.k === 'event') {
    if (!here) return;
    if (e.e === 'jam') { banner('🖨️ Принтер зажувало папір! Хто полагодить (F) — +10 сторінок!'); sfx('warn'); }
    else if (e.e === 'toner') {
      banner('💥 ВИБУХ ТОНЕРА! Підлога — чорна ковзанка!'); if (typeof boomFX === 'function') boomFX(+e.x, +e.z, 3.5, .8); burst(+e.x, .5, +e.z, '#1A1726', 30, 6, .8, 3); shake = Math.max(shake, .8);
      const d = dist2(pl.x, pl.z, +e.x, +e.z), m = meP(); if (d < 5 && amIn()) knockMe(Math.atan2(pl.x - e.x, pl.z - e.z), m && m.bur ? 7 : 22, 'Тонером в обличчя!');
    }
    else if (e.e === 'rain') { banner('📄 Дощ зі сторінок! Пачки — жбурляй у суперників, у купи — зарийся!'); sfx('page'); }
    else if (e.e === 'boss') { banner(e.by ? `🚨 ${nameOf(e.by)} натиснув тривогу — НАЧАЛЬНИК ІДЕ!` : '👔 НАЧАЛЬНИК ІДЕ! Відійди від принтера — інакше мінус сторінки!'); sfx('aggro'); }
  }
  else if (e.k === 'fixed') { if (here) { toast(`🔧 ${nameOf(e.who)} полагодив принтер (+10 сторінок)!`); sfx('equip'); } if (V.fix) V.fix = null; }
  else if (e.k === 'sheet') { if (here && e.who === myKey()) { ftext(pl.x, 2.4, pl.z, '+4 📄 Пачка в руках — кидай (1 / Q)!', 'gold'); sfx('pick'); } }
  else if (e.k === 'toss') { if (here) { const m = projMesh(e.kind), sp = +e.sp || 13; m.position.set(+e.x, 1.4, +e.z); m.rotation.y = +e.a || 0; scene.add(m); V.proj.push({ id: e.id, m, kind: e.kind || 'stack', vx: Math.sin(+e.a) * sp, vz: Math.cos(+e.a) * sp, t: 0, sp, max: +e.max || 10 }); sfx('throw', +e.x, +e.z); } }
  else if (e.k === 'land') {
    const i = V.proj.findIndex(p => p.id === e.id); if (i >= 0) { scene.remove(V.proj[i].m); V.proj.splice(i, 1); }
    if (!here) return;
    const kind = e.kind || 'stack';
    if (e.npc) { const n = ST.npc.find(q => q.id === e.npc); if (n) ftext(n.x, 2.5, n.z, pick(['Ей!', 'Це що, літачок?!', 'Я на HR поскаржусь!', 'У мене дедлайн!']), 'crit'); }
    if (kind === 'molo') { if (typeof boomFX === 'function') boomFX(+e.x, +e.z, 1.6, .4); burst(+e.x, .4, +e.z, '#FF9A3C', 18, 4, .7, 3); return; }
    if (kind === 'wire') { burst(+e.x, .3, +e.z, '#FFF3A0', 10, 3, .3, 2); sfx('hit', +e.x, +e.z); return; }
    if (kind === 'book') { burst(+e.x, 1, +e.z, '#3E7BD6', 10, 3, .5, 2); burst(+e.x, 1.2, +e.z, '#FFFFFF', 6, 3, .4, 2); sfx('hit', +e.x, +e.z); if (e.hit) { const p = ST.ps.find(q => q.k === e.hit), q = p && (p.k === myKey() ? pl : posOf(p)); if (q) ftext(q.x, 2.6, q.z, '📘 БУМ!', 'crit'); } return; }
    if (kind === 'paper') { burst(+e.x, .9, +e.z, '#FFFFFF', e.bin ? 4 : 8, 2, .4, 1.5); if (e.hit) { const p = ST.ps.find(q => q.k === e.hit), q = p && (p.k === myKey() ? pl : posOf(p)); if (q) ftext(q.x, 2.6, q.z, pick(['🧻 Пфф!', 'Ей, це мій звіт!', 'Папірцем?!']), 'crit'); } return; }
    if (kind === 'plane') { burst(+e.x, 1.2, +e.z, '#FFFFFF', 5, 2, .4, 1.5); if (e.pc) { burst(+e.x, 1.2, +e.z, '#6BB8FF', 8, 2, .5, 2); sfx('hit', +e.x, +e.z); } return; }
    burst(+e.x, 1, +e.z, '#FFFFFF', 14, 4, .6, 2.5);
    if (e.hit === myKey()) { faceOverlay(); if (pl.carry && typeof releaseCarry === 'function') releaseCarry(false); V.fix = null; ftext(pl.x, 2.6, pl.z, '📄 Папери в обличчя!', 'bad'); sfx('hurt'); }
    else if (e.hit) { const p = ST.ps.find(q => q.k === e.hit); if (p) { const q = posOf(p); ftext(q.x, 2.6, q.z, pick(['📄 Пфф!', 'Мої очі!', 'Хто кинув звіт?!']), 'crit'); } if (e.by === myKey()) { toast('🎯 Влучив пачкою в обличчя!'); sfx('crit'); } }
  }
  else if (e.k === 'bury') { if (here && e.who === myKey()) { ftext(pl.x, 2.4, pl.z, '🫣 Зарився в папери — штовхати важче', 'calm'); sfx('dig'); } }
  else if (e.k === 'turbo') { if (here) { toast(`⚡ ${nameOf(e.who)} вставив картридж-турбо — друкує ×2 10 с!`); if (e.who === myKey()) sfx('legend'); } }
  else if (e.k === 'pu') { if (here) toast('⚡ На поверсі з\'явився <b>картридж-турбо</b> — хапай!'); }
  else if (e.k === 'combo') { if (here) { const p = ST.ps.find(q => q.k === e.who), q = p && posOf(p); if (q) ftext(q.x, 2.8, q.z, `🔥 КОМБО ×${e.n}! +${e.b}`, 'gold'); if (e.who === myKey()) sfx('ding'); } }
  else if (e.k === 'switch') { if (here) { banner(`🔀 Перемкнуло! Тепер працює ${e.i ? 'південний' : 'північний'} принтер!`); sfx('warn'); } }
  else if (e.k === 'pcspam') { if (here) { banner('💻 ПК почав спамити серверну! Зараз загориться…'); burst(+e.x, 1.3, +e.z, '#6BB8FF', 16, 3, .8, 3); sfx('warn'); if (e.by === myKey()) toast('😈 Саботаж вдався: серверна от-от загориться — друк стане для всіх!'); } }
  else if (e.k === 'fire') { if (here) { banner('🔥 СЕРВЕРНА ГОРИТЬ! Принтер стоїть — гаси 🧯 вогнегасником (4)!'); sfx('aggro'); shake = Math.max(shake, .4); } }
  else if (e.k === 'fireout') { if (here) { toast(e.who ? `🧯 ${nameOf(e.who)} загасив серверну (+8 📄)! Друкуємо далі.` : '🔥 Серверна вигоріла сама. Друкуємо далі.'); sfx(e.who === myKey() ? 'legend' : 'ding'); } }
  else if (e.k === 'puddle') { if (here) { toast(`💦 ${e.by ? nameOf(e.by) + ' перекинув' : 'Перекинуто'} кулер — велика калюжа, ковзко! Кинь у неї 🔌 дріт — буде струм.`); burst(+e.x, .4, +e.z, '#8FD3FF', 20, 4, .7, 2); sfx('splash', +e.x, +e.z); } }
  else if (e.k === 'zap') { if (here) { banner('⚡ КАЛЮЖА ПІД НАПРУГОЮ! Хто в ній — завмирає!'); burst(+e.x, .4, +e.z, '#FFF3A0', 30, 6, .5, 3); sfx('charge', +e.x, +e.z); shake = Math.max(shake, .3); } }
  else if (e.k === 'rile') { if (here) { const n = ST.npc.find(q => q.id === e.id); if (n) burst(n.x, 2, n.z, '#FF5C7A', 4, 1.5, .4, 1.5); } }
  else if (e.k === 'zombie') { if (here) { const n = ST.npc.find(q => q.id === e.id); banner(`🧟 Колега озвірів! Іде діставати: ${e.tgt ? nameOf(e.tgt) : 'всіх'}`); if (n) ftext(n.x, 2.8, n.z, `ЗАЙОБУЮЧИЙ! Хоче ${COFFEE[e.want | 0].join(' ')}`, 'bad'); sfx('aggro'); if (e.tgt === myKey()) toast(`🧟 Зомбі-колега йде до ТЕБЕ! Пригости його <b>${COFFEE[e.want | 0].join(' ')}</b> (6).`); } }
  else if (e.k === 'calm') { if (here) { const n = ST.npc.find(q => q.id === e.id); if (n) { ftext(n.x, 2.6, n.z, e.by ? (e.kind >= 0 ? `${COFFEE[e.kind][0]} Дякую, колего!` : '😵 Охолонув…') : '😮‍💨 Видихнув…', 'calm'); burst(n.x, 1.6, n.z, '#C4956A', 8, 2, .6, 2); } if (e.by === myKey() && e.kind >= 0) { sfx('drink'); if (!e.soft) toast('☕ Колегу заспокоєно кавою (+3 📄)'); } } }
  else if (e.k === 'pester') {
    if (!here) return; const n = ST.npc.find(q => q.id === e.id);
    if (e.to === myKey() && amIn() && !pl.dead) { knockMe(+e.a || 0, 6, pick(['🧟 «А можна тебе на хвилинку?» −2 📄', '🧟 «Ти бачив мій степлер?» −2 📄', '🧟 «Глянь мою презентацію!» −2 📄'])); sfx('hurt'); }
    else if (n) ftext(n.x, 2.6, n.z, pick(['А можна на хвилинку?', 'Де мій степлер?!', 'Ти читав мій лист?']), 'crit');
  }
  else if (e.k === 'spray') {
    if (!here) return; const a = +e.a || 0;
    for (let k = 1; k <= 8; k++) { const d = k * .55, s = rand(-.35, .35) * d * .5; burst(+e.x + Math.sin(a) * d + Math.cos(a) * s, 1, +e.z + Math.cos(a) * d - Math.sin(a) * s, '#FFFFFF', 3, 1.5, .6, 1, 1.4); }
    if (e.by !== myKey()) sfx('splash', +e.x, +e.z);
  }
  else if (e.k === 'wire') { if (here && e.who === myKey()) { ftext(pl.x, 2.4, pl.z, '🔌 Дріт у руках — кинь у калюжу (1 / Q)!', 'gold'); sfx('pick'); } }
  else if (e.k === 'refill') { if (here && e.who === myKey()) { ftext(pl.x, 2.4, pl.z, '☕🥛🧋 Набрав кави для колег', 'calm'); sfx('brew'); } }
  else if (e.k === 'armed') { if (here) { banner(`💣 ${nameOf(e.by)} прикрутив ${e.m ? 'Молотов' : 'бомбу'} до Румби — вона їде до суперника біля принтера!`); sfx('charge'); } }
  else if (e.k === 'rbboom') { if (here) { if (typeof boomFX === 'function') boomFX(+e.x, +e.z, 3.2, .5); toast(`💥 Румба-камікадзе вибухнула!${(e.hit || []).length ? ' Постраждали: ' + e.hit.map(nameOf).join(', ') + ' (−5 📄)' : ''}`); } }
  else if (e.k === 'take') { if (here && e.who === myKey()) { const it = ITEM[e.it]; if (it) ftext(pl.x, 2.4, pl.z, `+${it.add} ${it.ic} (${e.n | 0})`, 'gold'); sfx('pick'); V.want = null; } }
  else if (e.k === 'bin') {
    if (!here) return; burst(+e.x, 1, +e.z, '#7FE08A', 12, 3, .5, 2);
    if (e.by === myKey()) {
      const far = +e.d >= 8; ftext(+e.x, 2.2, +e.z, far ? `🎯 СНАЙПЕР! ${(+e.d).toFixed(1)} м` : `🧻 У смітник! ${(+e.d).toFixed(1)} м`, 'gold');
      if (e.c > 0) { P.coins += e.c | 0; addXP(e.xp | 0); toast(`🧻 Папірець у смітник з ${(+e.d).toFixed(1)} м: <b>+${e.c} 🪙</b> · +${e.xp} досвіду · +1 📄 (${e.n}/${BIN_CAP})`); const d = A.data(); d.bins = (d.bins || 0) + 1; d.binBest = Math.max(d.binBest || 0, +e.d); refreshHUD(); }
      else toast(`🧻 Влучив! Але ліміт нагород за смітник у цьому раунді (${BIN_CAP}) вичерпано — тепер лише для слави.`);
      sfx(far ? 'crit' : 'ding');
    } else ftext(+e.x, 2.2, +e.z, '🧻 У смітник!', 'calm');
  }
  else if (e.k === 'clean') { if (here) burst(+e.x, .3, +e.z, '#FFFFFF', 6, 1.5, .4, 1); }
  else if (e.k === 'end') finishMe(e);
}
function finishMe(e) {
  if (!running || !inArena(pl.x, pl.z)) return;
  const res = e.res || [], place = res.findIndex(r => r[0] === myKey()) + 1;
  if (!place) return;
  const coins = [0, 110, 60, 35, 20, 12][place] || 10, xp = [0, 140, 90, 60, 40, 30][place] || 30;
  P.coins += coins; addXP(xp);
  const d = A.data(); d.games = (d.games || 0) + 1; if (place === 1) d.wins = (d.wins || 0) + 1; d.best = Math.max(d.best || 0, res[place - 1][1] | 0);
  d.floors = d.floors || {}; d.floors[e.v | 0] = (d.floors[e.v | 0] || 0) + 1;
  banner(place === 1 ? '🏆 ПРИНТЕР ТВІЙ! Звіт здано першим!' : `🖨️ ${place} місце`);
  toast(`Результати: ${res.map((r, i) => `${i + 1}. ${nameOf(r[0])} — ${r[1]} 📄`).join(' · ')}${e.why ? '<br>' + e.why : ''}<br>Нагорода: <b>+${coins} 🪙</b> · +${xp} досвіду<br>Наступний поверх у меню: ${VAR[ST.nv].n}`);
  sfx(place === 1 ? 'legend' : 'level'); refreshHUD(); save();
}
/* папери в обличчя: екран закритий аркушами ~2 с */
function faceOverlay() {
  let el = document.getElementById('pw-face');
  if (!el) {
    el = document.createElement('div'); el.id = 'pw-face'; el.style.cssText = 'position:fixed;inset:0;z-index:5;pointer-events:none;overflow:hidden;transition:opacity .5s';
    for (let k = 0; k < 9; k++) {
      const s = document.createElement('div');
      s.style.cssText = `position:absolute;left:${rand(-10, 70)}%;top:${rand(-15, 60)}%;width:${rand(34, 52)}vmin;height:${rand(46, 66)}vmin;background:#FFFFFF repeating-linear-gradient(180deg,transparent 0 14px,#D9D2EE 14px 16px);box-shadow:0 6px 24px rgba(0,0,0,.25);transform:rotate(${rand(-35, 35)}deg);border-radius:4px`;
      el.appendChild(s);
    }
    const t = document.createElement('div'); t.textContent = '📄 ПАПЕРИ В ОБЛИЧЧЯ!'; t.style.cssText = 'position:absolute;left:50%;top:44%;transform:translate(-50%,-50%) rotate(-6deg);font:900 34px system-ui,sans-serif;color:#2E2346;background:#FFE066;padding:8px 18px;border-radius:12px'; el.appendChild(t);
    document.body.appendChild(el);
  }
  el.style.opacity = 1; el.style.display = ''; V.faceT = 2;
}

/* ---------- Штовханина, пачки, закопування, тривога ---------- */
function shove() {
  if (!amIn() || ST.ph !== 'fight' || pl.dead || V.shoveCd > 0) return false;
  V.shoveCd = .6;
  const fx = Math.sin(pl.face), fz = Math.cos(pl.face);
  let any = false;
  for (const p of ST.ps) {
    if (!p.bot) continue; const dx = p.x - pl.x, dz = p.z - pl.z, d = Math.hypot(dx, dz);
    if (d < 1.9 && (dx * fx + dz * fz) / (d || 1) > .2) { const a = Math.atan2(dx, dz); req('shove', { to: p.k, a: r2(a) }); any = true; }
  }
  if (any) { sfx('hit', pl.x, pl.z); shake = Math.max(shake, .15); }
  return any;
}
function throwStack() {
  const m = meP(); if (!m || ST.ph !== 'fight' || pl.dead) return false;
  if (!m.hold) { toast('📄 Немає пачки — підбирай пачки паперу після «дощу зі сторінок».'); return false; }
  // авто-приціл: найближчий суперник у секторі перед тобою
  let a = pl.face, best = 99;
  for (const p of ST.ps) { if (p.k === myKey()) continue; const q = posOf(p), dx = q.x - pl.x, dz = q.z - pl.z, d = Math.hypot(dx, dz); if (d < 9 && d > .3 && (dx * Math.sin(pl.face) + dz * Math.cos(pl.face)) / d > .8 && d < best) { best = d; a = Math.atan2(dx, dz); } }
  pl.face = a; pl.swingT = .25; pl.swingKind = 2; req('throw', { a: r2(a) }); return true;
}
const nearPile = () => ST.piles.find(s => dist2(pl.x, pl.z, s.x, s.z) < 1.2);
function toggleBury() {
  const m = meP(); if (!m || ST.ph !== 'fight') return;
  if (m.bur) { req('bury', { on: 0 }); return; }
  const p = nearPile(); if (!p) { toast('🫣 Підійди до купи паперу (вона лишається там, куди впала пачка).'); return; }
  pl.x = p.x; pl.z = p.z; req('bury', { on: 1 });
}
/* ЛКМ: суперник поруч попереду — штовхнути; інакше — кинути те, що вибране на панелі (✈️ 📘 🧻 🍾) туди, куди дивишся (курсор) */
const shoveTarget = () => { const fx = Math.sin(pl.face), fz = Math.cos(pl.face); return ST.ps.some(p => { if (p.k === myKey()) return false; const q = posOf(p), dx = q.x - pl.x, dz = q.z - pl.z, d = Math.hypot(dx, dz); return d < 1.9 && (dx * fx + dz * fz) / (d || 1) > .2; }); };
function lmb() {
  if (!amIn() || ST.ph !== 'fight' || pl.dead || !inArena(pl.x, pl.z)) return false;
  const sel = typeof MODEBAR !== 'undefined' && MODEBAR ? MODEBAR.sel : 0, s = MODEBAR && MODEBAR.slots[sel];
  if (shoveTarget() || !s || !['throw', 'book', 'paper', 'molo'].includes(s.id)) return shove();
  if (V.lmbCd > 0) return false; V.lmbCd = .35; s.use(); return true;
}
if (!SIMSIDE) addEventListener('pointerdown', e => { if (typeof cv !== 'undefined' && e.target === cv && e.button === 0 && amIn()) lmb(); }, true);
// клавіші: не затираємо чужі обробники — якщо не наш випадок, віддаємо попередньому
function chainKey(code, fn) { const prev = ADDONS.keys[code]; A.key(code, () => { if (fn() !== false) return; return prev ? withAddon(prev[0], () => addonRun(prev[0], prev[1])) : false; }); }
chainKey('KeyR', () => { if (!amIn() || !running || !inArena(pl.x, pl.z)) return false; shove(); });
chainKey('KeyQ', () => { const m = meP(); if (!m || !(m.hold || m.wi) || pl.carry || ST.ph !== 'fight' || !inArena(pl.x, pl.z)) return false; throwAny(); });
function setBar(on) {
  if (on === V.bar || typeof modeBar !== 'function') return; V.bar = on;
  const cnt = k => () => { const m = meP(); return m ? m[k] | 0 : 0; }, nm = (k, n) => () => { const m = meP(); return m && !(m[k] | 0) ? `де: ${ITEM[k].sh}` : n; };
  modeBar(on ? { slots: [
    { id: 'throw', get ic() { const m = meP(); return m && m.hold ? '📄' : m && m.wi ? '🔌' : '✈️'; }, get n() { const m = meP(); return m && m.hold ? 'Кинути пачку' : m && m.wi ? 'Кинути дріт' : nm('pl', 'Літачок')(); },
      count: () => { const m = meP(); return !m ? 0 : m.hold || m.wi ? 1 : m.pl | 0; }, use: throwAny },
    { id: 'book', ic: '📘', get n() { return nm('bk', 'Книжка')(); }, count: cnt('bk'), use: throwBook },
    { id: 'paper', ic: '🧻', get n() { return nm('cr', 'Мʼятий папір')(); }, count: cnt('cr'), use: throwPaper },
    { id: 'foam', ic: '🧯', n: 'Вогнегасник', count: () => { const m = meP(); return m ? Math.floor((m.fo || 0) / FOAM_SHOT) : 0; }, use: sprayFoam },
    { id: 'molo', ic: '🍾', n: 'Молотов', count: cnt('mo'), use: throwMolo },
    { id: 'coffee', ic: '☕', n: 'Кава колезі', count: () => { const m = meP(); return m && m.cf ? m.cf.reduce((a, b) => a + b, 0) : 0; }, use: giveCoffee },
    { id: 'bomb', ic: '💣', n: 'Бомба на Румбу', count: cnt('bo'), use: armRoomba },
  ] } : null);
}

/* ---------- Кожен кадр ---------- */
function clientTick(dt) {
  const t = gameTime, vh = running ? varAt(pl.x, pl.z) : -1, here = vh >= 0, D = VAR[ST.v], m = meP();
  V.shoveCd -= dt; V.lmbCd = (V.lmbCd || 0) - dt; if (V.want && (V.want.t -= dt) <= 0) V.want = null;
  setBar(!!(here && m && ST.ph === 'fight' && !pl.dead));
  // боти
  const seen = new Set();
  for (const p of ST.ps) {
    if (!p.bot || ST.ph === 'idle' || ST.ph === 'lobby') continue;
    seen.add(p.k); const v = botMesh(p), h = v.h, mv = p.lx != null ? Math.hypot(p.x - p.lx, p.z - p.lz) / Math.max(dt, .001) : 0;
    h.root.position.set(p.x, 0, p.z); h.root.rotation.y = p.f || 0; p.lx = p.x; p.lz = p.z;
    const w = Math.min(1, mv / 3), dizzy = p.stun > 0 || p.blind > 0; h.l1.rotation.x = Math.sin(t * 12) * .7 * w; h.l2.rotation.x = -Math.sin(t * 12) * .7 * w;
    h.aR.rotation.x = dizzy ? -2.8 : -Math.sin(t * 12) * .5 * w; h.aL.rotation.x = dizzy ? -2.8 : Math.sin(t * 12) * .5 * w;
    if (p.blind > 0 && Math.random() < dt * 4) burst(p.x, 1.9, p.z, '#FFFFFF', 1, .8, .3, .6);
  }
  for (const [k, v] of V.bots) if (!seen.has(k)) { scene.remove(v.h.root); V.bots.delete(k); }
  // принтери й зони на всіх поверхах (колір власника, червоне — сперечаються)
  const o = ST.ps.find(p => p.k === ST.owner);
  for (const F of V.floors) {
    if (!F || !F.v) continue; const cur = F.i === ST.v && ST.ph === 'fight', ai = actIdx(F.i);
    F.v.prns.forEach((pm, k) => {
      const pos = F.route ? routeAt(F, fightT(F.i)) : F.prn[k], active = k === ai, ring = F.v.rings[k];
      if (F.route) { pm.position.set(pos.x, 0, pos.z); pm.rotation.y = pos.a + Math.PI / 2; ring.position.set(pos.x, .1, pos.z); if (pm.userData.beacon) pm.userData.beacon.material.color.set(Math.sin(t * 8) > 0 ? '#F2A65A' : '#FFE066'); }
      const warn = F.prn.length > 1 && cur && (fightT(F.i) % SWITCH) > SWITCH - 3;
      ring.material.color.set(!active ? (warn && Math.sin(t * 10) > 0 ? '#FFE066' : '#3E3A5C') : !cur ? '#FFFFFF' : ST.ev === 'boss' ? '#FF5C7A' : ST.ev === 'jam' ? '#8E86B0' : ST.owner === '*' ? (Math.sin(t * 12) > 0 ? '#FF5C7A' : '#FFFFFF') : o ? COL[o.col % NC] : '#FFFFFF');
      ring.material.opacity = active ? .9 : .5; ring.scale.setScalar(1 + (active && o && cur ? Math.sin(t * 6) * .03 : 0));
      pm.userData.led.material.color.set(!active ? '#FF5C7A' : cur && ST.ev === 'jam' ? (Math.sin(t * 10) > 0 ? '#FF5C7A' : '#2E2346') : cur && o ? '#7FE08A' : '#FFE066');
    });
    if (F.v.picks && F.i === vh) F.v.picks.forEach((m, k) => { m.rotation.y = t * 1.6 + k; m.position.y = (F.picks[k].k === 'bk' ? 2.25 : 1.7) + Math.sin(t * 2.5 + k) * .12; });
    if (F.v.alarm) F.v.alarm.material.color.set(cur && ST.ac > 0 ? '#7A3A4A' : (Math.sin(t * 3) > 0 ? '#FF2E4D' : '#C41E3A'));
  }
  // рухомий принтер (поверх 57) — твердий і для гравця
  if (vh >= 0 && VAR[vh].route && !pl.dead) { const P = prnPos(vh), dx = pl.x - P.x, dz = pl.z - P.z, d = Math.hypot(dx, dz); if (d < 1.15 && d > .01) { pl.x = P.x + dx / d * 1.15; pl.z = P.z + dz / d * 1.15; } }
  // принтер «плює» сторінками, коли хтось друкує
  const P = prnPos();
  if (o_printing() && (V.paperT -= dt) <= 0) { V.paperT = o && o.turbo > 0 ? .17 : .35; const pm = mesh(new THREE.BoxGeometry(.4, .01, .55), '#FFFFFF', false); pm.position.set(P.x, 1, P.z + .9); scene.add(pm); V.flying.push({ m: pm, vx: rand(-1, 1), vz: rand(1.5, 3), vy: 2.5, t: 0 }); }
  for (let i = V.flying.length - 1; i >= 0; i--) { const f = V.flying[i]; f.t += dt; f.vy -= 6 * dt; f.m.position.x += f.vx * dt; f.m.position.z += f.vz * dt; f.m.position.y = Math.max(.02, f.m.position.y + f.vy * dt); f.m.rotation.y += dt * 3; if (f.t > 1.6) { scene.remove(f.m); V.flying.splice(i, 1); } }
  // пачки паперу на підлозі, купи, пачки в руках, пачки в польоті
  const ids = new Set(ST.stacks.map(s => s.id));
  for (const s of ST.stacks) if (!V.stacks.has(s.id)) { const sm = stackMesh(); sm.position.set(s.x, 0, s.z); scene.add(sm); V.stacks.set(s.id, sm); }
  for (const [id, sm] of V.stacks) { if (!ids.has(id)) { scene.remove(sm); V.stacks.delete(id); } else { sm.rotation.y = t * 1.5 + id; sm.position.y = .05 + Math.abs(Math.sin(t * 3 + id)) * .15; } }
  const pids = new Set(ST.piles.map(s => s.id));
  for (const s of ST.piles) if (!V.piles.has(s.id)) { const pm = pileMesh(); pm.position.set(s.x, 0, s.z); scene.add(pm); V.piles.set(s.id, pm); }
  for (const [id, pm] of V.piles) { if (!pids.has(id)) { scene.remove(pm); V.piles.delete(id); } else { const bur = ST.ps.some(p => p.bur === id); pm.scale.set(bur ? 1.15 : 1, lerp(pm.scale.y, bur ? 2.6 : 1, Math.min(1, dt * 8)), bur ? 1.15 : 1); } }
  const holders = new Set();
  for (const p of ST.ps) if (p.hold && ST.ph === 'fight') {
    holders.add(p.k); let hm = V.held.get(p.k); if (!hm) { hm = stackMesh(); scene.add(hm); V.held.set(p.k, hm); }
    const q = p.k === myKey() ? pl : posOf(p); hm.position.set(q.x, 2.35, q.z); hm.rotation.y = t * 2;
  }
  for (const [k, hm] of V.held) if (!holders.has(k)) { scene.remove(hm); V.held.delete(k); }
  for (let i = V.proj.length - 1; i >= 0; i--) {   // снаряди летять дугою (видно, куди кинув)
    const f = V.proj[i]; f.t += dt; f.m.position.x += f.vx * dt; f.m.position.z += f.vz * dt; const q = Math.min(1, f.t * f.sp / f.max);
    if (f.kind === 'stack') f.m.rotation.y += dt * 12; else if (f.kind === 'plane') { f.m.position.y = 1.4 + Math.sin(q * Math.PI) * .5 + Math.sin(f.t * 9) * .12; } else { f.m.position.y = 1.3 + Math.sin(q * Math.PI) * 1.1 - q * .6; f.m.rotation.x += dt * 14; f.m.rotation.z += dt * 6; }
    if ((f.trT = (f.trT || 0) - dt) <= 0 && f.kind !== 'stack') { f.trT = .05; burst(f.m.position.x, f.m.position.y, f.m.position.z, f.kind === 'book' ? '#6BB8FF' : f.kind === 'molo' ? '#FFB347' : '#FFFFFF', 1, .3, .25, .4); }
    if (f.t > f.max / f.sp + .3) { scene.remove(f.m); V.proj.splice(i, 1); }
  }
  // тонерна ковзанка (чорна пляма)
  updSlime(dt);
  // картридж-турбо
  if (ST.pu && ST.ph === 'fight') {
    if (!V.pu) { V.pu = new THREE.Group(); put(V.pu, mesh(new THREE.BoxGeometry(.7, .3, .3), '#2E2346', false), 0, 0, 0); put(V.pu, mesh(new THREE.BoxGeometry(.72, .08, .32), bulb('#FF6BD6'), false), 0, .05, 0); scene.add(V.pu); }
    V.pu.visible = true; V.pu.position.set(ST.pu.x, .7 + Math.sin(t * 4) * .15, ST.pu.z); V.pu.rotation.y = t * 2;
  } else if (V.pu) V.pu.visible = false;
  // начальник іде до принтера
  updBoss(dt, P);
  // папери в обличчя — гасимо
  if (V.faceT > 0) { V.faceT -= dt; const el = document.getElementById('pw-face'); if (el && V.faceT < .6) el.style.opacity = Math.max(0, V.faceT / .6); if (el && V.faceT <= 0) el.style.display = 'none'; }
  if (here && m && ST.ph === 'fight' && !pl.dead) {
    if (!m.hold) for (const s of ST.stacks) if (dist2(pl.x, pl.z, s.x, s.z) < .9 && !s.req) { s.req = 1; req('sheet', { id: s.id }); break; }
    if (ST.pu && dist2(pl.x, pl.z, ST.pu.x, ST.pu.z) < 1 && !ST.pu.req) { ST.pu.req = 1; req('pu', { id: ST.pu.id }); }
    if (m.bur) { if (Math.hypot(input.mx, input.mz) > .3 || pl.dashT > 0) req('bury', { on: 0 }); }
    if (slimeAt(pl.x, pl.z)) { if (typeof FUN !== 'undefined') FUN.slipWarn = gameTime; if ((V.slipT -= dt) <= 0) { V.slipT = 4; ftext(pl.x, 2.2, pl.z, '🖤 Тонер! Ковзко — не загальмуєш!', 'calm'); } if (Math.random() < dt * 6) burst(pl.x, .1, pl.z, '#2A2540', 1, .6, .3, .4); }
  }
  updFix(dt, P);
  updChaos(dt, here, m);
  lobbyUI(here, dt);
  hud(here); labels(vh); intro();
}
const o_printing = () => ST.ph === 'fight' && ST.owner && ST.owner !== '*' && ST.ev !== 'jam' && ST.ev !== 'boss' && !ST.sf;
function updSlime(dt) {
  const s = ST.sl && ST.ph === 'fight' && ST.sl[3] > 0 ? ST.sl : null;
  if (!s) { if (V.slime) V.slime.visible = false; return; }
  if (!V.slime) {
    V.slime = new THREE.Group(); V.slimeMat = new THREE.MeshBasicMaterial({ color: '#141120', transparent: true, opacity: .9, depthWrite: false }); V.shineMat = new THREE.MeshBasicMaterial({ color: '#4A4466', transparent: true, opacity: .6, depthWrite: false });
    const blob = (x, z, r, m) => { const c = new THREE.Mesh(new THREE.CircleGeometry(r, 20), m); c.rotation.x = -Math.PI / 2; c.position.set(x, .045, z); V.slime.add(c); };
    blob(0, 0, .82, V.slimeMat); for (let k = 0; k < 9; k++) { const a = k / 9 * 6.28 + rand(-.2, .2), d = rand(.55, .85); blob(Math.sin(a) * d, Math.cos(a) * d, rand(.15, .3), V.slimeMat); }
    for (let k = 0; k < 6; k++) { const a = rand(0, 6.28), d = rand(.1, .6); const c = new THREE.Mesh(new THREE.CircleGeometry(rand(.04, .1), 10), V.shineMat); c.rotation.x = -Math.PI / 2; c.position.set(Math.sin(a) * d, .05, Math.cos(a) * d); V.slime.add(c); }
    scene.add(V.slime);
  }
  V.slime.visible = true; V.slime.position.set(s[0], 0, s[1]); V.slime.scale.set(s[2], 1, s[2]);
  V.slimeMat.opacity = .9 * Math.min(1, s[3] / 3); V.shineMat.opacity = .6 * Math.min(1, s[3] / 3);
}
function updBoss(dt, P) {
  const on = ST.ph === 'fight' && ST.ev === 'boss' && running && varAt(pl.x, pl.z) === ST.v;
  if (!on) { if (V.boss) { scene.remove(V.boss.root); V.boss = null; } return; }
  if (!V.boss) { V.boss = buildOffice('#E8C9A8', '#2E2346'); const a = VAR[ST.v].alarm; V.boss.root.position.set(a.x - 1, 0, a.z); scene.add(V.boss.root); ftext(a.x - 1, 2.6, a.z, '👔 Хто тут друкує особисте?!', 'bad'); }
  const r = V.boss.root, dx = P.x - r.position.x, dz = P.z - r.position.z, d = Math.hypot(dx, dz);
  if (d > 3.2) { r.position.x += dx / d * 3 * dt; r.position.z += dz / d * 3 * dt; solidPush(r.position, .35, VAR[ST.v]); r.position.y = 0; }
  r.rotation.y = Math.atan2(dx, dz); const w = d > 3.2 ? 1 : 0; V.boss.l1.rotation.x = Math.sin(gameTime * 9) * .6 * w; V.boss.l2.rotation.x = -Math.sin(gameTime * 9) * .6 * w;
}
function updFix(dt, P) {
  if (!V.fix) return;
  if (ST.ev !== 'jam' || dist2(pl.x, pl.z, P.x, P.z) > ZONE + .6) { V.fix = null; return; }
  V.fix.t += dt; if (Math.random() < dt * 6) burst(P.x, 1.4, P.z, '#FFE066', 2, 2, .4, 1);
  if (V.fix.t >= 2) { V.fix = null; req('fix'); }
}

/* ---------- Хаос у гравця: меші колег, Румби, вогню, калюж, літачків; локальні опіки й струм ---------- */
function projMesh(kind) {
  const o = new THREE.Group();
  if (kind === 'plane') {   // паперовий літачок
    const w = put(o, mesh(new THREE.ConeGeometry(.22, .6, 3), '#FFFFFF', false), 0, 0, 0); w.rotation.x = Math.PI / 2; w.scale.set(1.6, 1, .25);
    put(o, mesh(new THREE.BoxGeometry(.03, .1, .45), '#D9D2EE', false), 0, -.05, -.05);
  } else if (kind === 'molo') {   // пляшка з ганчіркою, що горить
    put(o, mesh(flat(new THREE.CylinderGeometry(.1, .12, .36, 8)), '#5FAF63', false), 0, 0, 0);
    put(o, new THREE.Mesh(new THREE.SphereGeometry(.09, 6, 5), new THREE.MeshBasicMaterial({ color: '#FFB347' })), 0, .26, 0);
  } else if (kind === 'book') return pickIcon('bk');
  else if (kind === 'paper') return pickIcon('cr');
  else if (kind === 'wire') { const c = put(o, mesh(flat(new THREE.CylinderGeometry(.03, .03, .8, 5)), '#2E2346', false), 0, 0, 0); c.rotation.x = Math.PI / 2; put(o, mesh(new THREE.BoxGeometry(.16, .1, .12), '#F2A65A', false), 0, 0, .4); }
  else return stackMesh();
  return o;
}
function npcMesh(n) {
  let v = V.npc.get(n.id); if (v) return v;
  const h = buildOffice(pick(['#E8C9A8', '#D9B48F', '#F3D2B6']), pick(['#9AA3B5', '#B5A89A', '#A3B59A'])); scene.add(h.root);
  h.head.material = h.head.material.clone(); v = { h, skin: h.head.material.color.clone() };
  v.aura = new THREE.Mesh(new THREE.TorusGeometry(.55, .06, 6, 20), new THREE.MeshBasicMaterial({ color: '#B07CF0', transparent: true, opacity: .8, depthWrite: false })); v.aura.rotation.x = Math.PI / 2; v.aura.position.y = .08; h.root.add(v.aura);
  const e = document.createElement('div'); e.style.cssText = 'position:absolute;left:0;top:0;padding:2px 6px;border-radius:8px;background:rgba(46,35,70,.78);color:#fff;font:700 11px system-ui,sans-serif;white-space:nowrap;text-align:center';
  e.innerHTML = '<div class="t"></div><div style="width:52px;height:5px;margin:2px auto 0;background:rgba(255,255,255,.25);border-radius:3px;overflow:hidden"><i style="display:block;height:100%;width:0"></i></div>';
  if (V.lbl) V.lbl.appendChild(e); v.lbl = e; v.t = e.querySelector('.t'); v.bar = e.querySelector('i');
  V.npc.set(n.id, v); return v;
}
function roombaMesh() {
  const o = new THREE.Group();
  put(o, mesh(flat(new THREE.CylinderGeometry(.4, .42, .14, 18)), '#3E3A5C'), 0, .08, 0);
  put(o, mesh(flat(new THREE.CylinderGeometry(.3, .3, .03, 18)), '#8E86B0', false), 0, .16, 0);
  put(o, mesh(new THREE.BoxGeometry(.5, .08, .06), '#2E2346', false), 0, .1, .38);
  o.userData.led = put(o, new THREE.Mesh(new THREE.SphereGeometry(.05, 6, 5), new THREE.MeshBasicMaterial({ color: '#7FE08A' })), 0, .19, .18);
  const bomb = new THREE.Group(); for (const x of [-.09, 0, .09]) put(bomb, mesh(flat(new THREE.CylinderGeometry(.05, .05, .3, 6)), '#E0607E', false), x, .3, -.05).rotation.z = Math.PI / 2;
  put(bomb, mesh(new THREE.BoxGeometry(.3, .03, .14), '#C9CDD9', false), 0, .3, -.05); o.add(bomb); o.userData.bomb = bomb;
  const bot = new THREE.Group(); put(bot, mesh(flat(new THREE.CylinderGeometry(.08, .1, .32, 8)), '#5FAF63', false), 0, .34, 0); o.add(bot); o.userData.bottle = bot;
  return o;
}
function fireMesh(n) {
  const o = new THREE.Group(), fl = [];
  const glow = new THREE.Mesh(new THREE.CircleGeometry(1, 24), new THREE.MeshBasicMaterial({ color: '#FF7A2E', transparent: true, opacity: .45, depthWrite: false })); glow.rotation.x = -Math.PI / 2; glow.position.y = .05; o.add(glow);
  for (let k = 0; k < n; k++) {
    const a = k / n * 6.28 + rand(-.3, .3), d = k < 3 ? rand(0, .3) : rand(.35, .9);
    const c = new THREE.Mesh(new THREE.ConeGeometry(.16, .9, 5), new THREE.MeshBasicMaterial({ color: pick(['#FF9A3C', '#FFD27A', '#FF5C3C']), transparent: true, opacity: .9, depthWrite: false }));
    c.position.set(Math.sin(a) * d, .45, Math.cos(a) * d); o.add(c); fl.push(c);
  }
  o.userData.fl = fl; o.userData.glow = glow; scene.add(o); return o;
}
function syncMap(map, list, make, upd) {   // список зі стану → меші (додати нові, прибрати зниклі)
  const ids = new Set();
  for (const it of list) { ids.add(it.id); let m = map.get(it.id); if (!m) { m = make(it); map.set(it.id, m); } upd(m, it); }
  for (const [id, m] of map) if (!ids.has(id)) { scene.remove(m); map.delete(id); }
}
function updChaos(dt, here, me) {
  const t = gameTime, fight = ST.ph === 'fight';
  // колеги
  const seen = new Set();
  for (const n of fight ? ST.npc : []) {
    seen.add(n.id); const v = npcMesh(n), h = v.h, mv = n.lx != null ? Math.hypot(n.x - n.lx, n.z - n.lz) / Math.max(dt, .001) : 0; n.lx = n.x; n.lz = n.z;
    h.root.position.set(n.x, 0, n.z); h.root.rotation.y = n.f || 0;
    const w = Math.min(1, mv / 2); h.l1.rotation.x = Math.sin(t * 10) * .6 * w; h.l2.rotation.x = -Math.sin(t * 10) * .6 * w;
    h.aR.rotation.x = n.zom ? -1.5 + Math.sin(t * 6) * .2 : -Math.sin(t * 10) * .4 * w; h.aL.rotation.x = n.zom ? -1.5 - Math.sin(t * 6) * .2 : Math.sin(t * 10) * .4 * w;
    h.head.material.color.copy(v.skin).lerp(new THREE.Color('#8FCF7A'), n.zom ? .75 : n.ag / 100 * .25);
    v.aura.visible = n.zom; if (n.zom) { v.aura.scale.setScalar(1 + Math.sin(t * 6) * .12); v.aura.material.opacity = .5 + Math.sin(t * 6) * .3; }
    if (n.stun > 0 && Math.random() < dt * 5) burst(n.x, 1.9, n.z, '#FFE066', 1, .8, .3, .6);
    const tx = n.zom ? `🧟 Зайобуючий · хоче ${COFFEE[n.want][0]}` : n.ag > 60 ? '😤 Колега' : n.ag > 0 ? '😠 Колега' : '😐 Колега';
    if (v.t.textContent !== tx) v.t.textContent = tx;
    v.bar.style.width = Math.round(n.ag) + '%'; v.bar.style.background = n.zom ? '#B07CF0' : n.ag > 60 ? '#FF5C7A' : '#FFE066';
    if (V.lbl && v.lbl.parentNode !== V.lbl) V.lbl.appendChild(v.lbl);
    const show = here && !panel && !pl.dead, q = show && screenPos(n.x, 2.3, n.z);
    v.lbl.style.display = q && q.vis ? '' : 'none'; if (q) v.lbl.style.transform = `translate(${Math.round(q.x)}px,${Math.round(q.y)}px) translate(-50%,-100%)`;
  }
  for (const [id, v] of V.npc) if (!seen.has(id)) { scene.remove(v.h.root); v.lbl.remove(); V.npc.delete(id); }
  // Румба
  const r = fight ? ST.rb : null;
  if (r) {
    if (!V.rbM) { V.rbM = roombaMesh(); scene.add(V.rbM); }
    V.rbM.visible = true; V.rbM.position.set(r.x, 0, r.z); V.rbM.rotation.y = r.f || 0;
    V.rbM.userData.bomb.visible = r.arm === 'b'; V.rbM.userData.bottle.visible = r.arm === 'm';
    V.rbM.userData.led.material.color.set(r.arm ? (Math.sin(t * (r.fuse < 4 ? 30 : 12)) > 0 ? '#FF2E4D' : '#2E2346') : '#7FE08A');
    if (r.arm === 'm' && Math.random() < dt * 10) burst(r.x, .55, r.z, '#FFB347', 1, .6, .3, 1);
  } else if (V.rbM) V.rbM.visible = false;
  // вогонь: серверна й калюжі Молотова
  const fires = fight ? ST.mf.slice() : []; if (fight && ST.sf) fires.push({ id: 'sf', x: ST.sf.x, z: ST.sf.z, r: ST.sf.r, t: 9, srv: 1 });
  syncMap(V.fires, fires, f => fireMesh(f.srv ? 14 : 8), (m, f) => {
    m.position.set(f.x, 0, f.z); m.scale.set(f.r, f.srv ? 1.4 : 1, f.r); const fade = Math.min(1, f.t / 1.5);
    m.userData.fl.forEach((c, k) => { c.scale.y = (.7 + Math.abs(Math.sin(t * 9 + k * 1.7)) * .6) * fade; c.material.opacity = .9 * fade; }); m.userData.glow.material.opacity = .45 * fade;
    if (Math.random() < dt * (f.srv ? 14 : 6)) burst(f.x + rand(-f.r, f.r) * .6, .8, f.z + rand(-f.r, f.r) * .6, pick(['#FFB347', '#FF5C3C', '#5A5470']), 1, 1, .7, 2.5);
  });
  // крісло з розгону (або кинуте) врізалось у кулер — перекинуло його
  if (fight && here && me && (V.chT = (V.chT || 0) - dt) <= 0) for (const b of BODIES) {
    if (b.fall || Math.hypot(b.vx || 0, b.vz || 0) < 4.5) continue;
    const ci = VAR[ST.v].coolers.findIndex(c => dist2(c.x, c.z, b.x, b.z) < (b.r || .5) + 1.05);
    if (ci >= 0 && (b === pl.ride || dist2(pl.x, pl.z, b.x, b.z) < 12)) { V.chT = 1.5; req('cooler', { i: ci, ch: 1 }); sfx('splash', b.x, b.z); break; }
  }
  // калюжі з кулера (під струмом — жовті з іскрами)
  syncMap(V.wps, fight ? ST.wp : [], () => { const m = new THREE.Mesh(new THREE.CircleGeometry(1, 28), new THREE.MeshBasicMaterial({ color: '#7FC8FF', transparent: true, opacity: .55, depthWrite: false })); m.rotation.x = -Math.PI / 2; scene.add(m); return m; }, (m, w) => {
    m.position.set(w.x, .05, w.z); m.scale.setScalar(w.r); m.material.color.set(w.el > 0 ? (Math.sin(t * 40) > 0 ? '#FFC400' : '#3FA8FF') : '#5FB4F5'); m.material.opacity = (w.el > 0 ? .85 : .7) * Math.min(1, w.t / 2);
    if (w.el > 0 && Math.random() < dt * 25) burst(w.x + rand(-w.r, w.r) * .7, .2, w.z + rand(-w.r, w.r) * .7, '#FFF3A0', 2, 3, .2, 2);
  });
  if (!here || !me || !fight || pl.dead) { V.stunT = 0; return; }
  // я в огні — легкі опіки (не смертельні) і відкидає назовні
  const f = fireAt(pl.x, pl.z);
  V.burnT -= dt;
  if (f && V.burnT <= 0) { V.burnT = .7; pl.hp = Math.max(1, pl.hp - 3); ftext(pl.x, 2.4, pl.z, '🔥 −3', 'bad'); knockMe(Math.atan2(pl.x - f.x, pl.z - f.z), 6); sfx('hurt'); }
  // я в калюжі під струмом — завмер на 2,5 с
  if (zapAt(pl.x, pl.z) && V.stunT <= 0 && !V.zapped) { V.stunT = 2.5; V.zapped = 1; V.pin = { x: pl.x, z: pl.z }; ftext(pl.x, 2.6, pl.z, '⚡ Б-З-З-З! Струмить!', 'bad'); sfx('hurt'); shake = Math.max(shake, .4); }
  if (!zapAt(pl.x, pl.z) && V.stunT <= 0) V.zapped = 0;
  if (V.stunT > 0) { V.stunT -= dt; if (V.pin) { pl.x = V.pin.x + Math.sin(t * 50) * .04; pl.z = V.pin.z; pl.kx = pl.kz = 0; } if (Math.random() < dt * 20) burst(pl.x, 1.2, pl.z, '#FFF3A0', 1, 2, .2, 1); }
  if (wetAt(pl.x, pl.z) && (V.wetT -= dt) <= 0) { V.wetT = 5; ftext(pl.x, 2.2, pl.z, '💦 Калюжа! Ковзко', 'calm'); }
}
/* ---------- Дії гравця: літачок / дріт, вогнегасник, Молотов, кава, бомба на Румбу ---------- */
function aimAt(range, cos, extra) {   // авто-приціл у секторі перед собою: суперники, колеги (+ extra)
  let a = pl.face, best = 99; const fx = Math.sin(pl.face), fz = Math.cos(pl.face);
  const pts = ST.ps.filter(p => p.k !== myKey()).map(posOf).concat(ST.npc, extra || []);
  for (const q of pts) { const dx = q.x - pl.x, dz = q.z - pl.z, d = Math.hypot(dx, dz); if (d < range && d > .3 && (dx * fx + dz * fz) / d > cos && d < best) { best = d; a = Math.atan2(dx, dz); } }
  return a;
}
function throwAny() {
  const m = meP(); if (!m || ST.ph !== 'fight' || pl.dead) return false;
  if (m.hold) return throwStack();
  if (m.wi) { const a = aimAt(9, .85, ST.wp); pl.face = a; pl.swingT = .25; pl.swingKind = 2; req('wire', { a: r2(a) }); sfx('throw'); return true; }
  return throwKind('pl', 'plane');
}
function throwMolo() {
  const m = meP(); if (!m || ST.ph !== 'fight' || pl.dead) return false;
  if ((m.mo | 0) <= 0) { toast('🍾 Молотови скінчились.'); return false; }
  const a = aimAt(9, .85); pl.face = a; pl.swingT = .25; pl.swingKind = 2; req('molo', { a: r2(a) }); sfx('throw'); return true;
}
function sprayFoam() {
  const m = meP(); if (!m || ST.ph !== 'fight' || pl.dead) return false;
  if ((m.fo || 0) < FOAM_SHOT) { toast('🧯 Піна закінчилась — вогнегасник сам набирає тиск (кілька секунд).'); return false; }
  let a = pl.face;
  if (pl.ride) {   // крісло + вогнегасник назад = реактивний ранець (WALL-E)
    knockMe(a + Math.PI, 16); ftext(pl.x, 2.4, pl.z, '🧯💨 РЕАКТИВНЕ КРІСЛО!', 'gold');
  } else {
    const fires = ST.mf.concat(ST.sf ? [ST.sf] : []); a = aimAt(5.5, .6, fires);
    pl.face = a; knockMe(a + Math.PI, 2.5);
  }
  req('spray', { a: r2(a) }); sfx('splash'); return true;
}
const zombieNear = () => ST.npc.filter(n => (n.zom || n.ag > 0) && dist2(pl.x, pl.z, n.x, n.z) < 2.4).sort((a, b) => b.zom - a.zom || dist2(pl.x, pl.z, a.x, a.z) - dist2(pl.x, pl.z, b.x, b.z))[0];
function giveCoffee() {
  const m = meP(); if (!m || ST.ph !== 'fight' || pl.dead) return false;
  const n = zombieNear(); if (!n) { toast('☕ Підійди до сердитого колеги чи зомбі-«зайобуючого» — над ним видно, яку каву він хоче.'); return false; }
  if (n.zom && !(m.cf || [])[n.want]) { toast(`☕ Він хоче <b>${COFFEE[n.want].join(' ')}</b> — набери на кухні (F біля кавомашини).`); return false; }
  req('coffee', { id: n.id }); sfx('pour'); return true;
}
function armRoomba() {
  const m = meP(); if (!m || ST.ph !== 'fight' || pl.dead) return false;
  const r = ST.rb; if (!r || dist2(pl.x, pl.z, r.x, r.z) > 1.8) { toast('💣 Підійди до робота-пилососа <b>Румби</b> й прикрути бомбу (або Молотов).'); return false; }
  if (r.arm) { toast('💣 Румба вже заряджена — тікай!'); return false; }
  if (!m.bo && !m.mo) { toast('💣 Нема ні бомби, ні Молотова.'); return false; }
  req('arm'); sfx('equip'); return true;
}
const nearPick = () => { const D = VAR[ST.v]; let b = -1, bd = 2.1; D.picks.forEach((s, i) => { const d = dist2(pl.x, pl.z, s.x, s.z); if (d < bd) { bd = d; b = i; } }); return b; };
const nearestPick = k => { const D = VAR[ST.v]; return D.picks.filter(s => s.k === k).sort((a, b) => dist2(pl.x, pl.z, a.x, a.z) - dist2(pl.x, pl.z, b.x, b.z))[0] || null; };
/* порожній слот: підказка, де взяти, і жовта стрілка до найближчого місця на 8 с */
function wantItem(k) { const it = ITEM[k]; V.want = { k, t: 8 }; toast(`${it.ic} ${it.n}: 0. Де взяти: <b>${it.src}</b> — жовта стрілка покаже, F — набрати.`); sfx('warn'); return false; }
function throwKind(k, kind) {
  const m = meP(); if (!m || ST.ph !== 'fight' || pl.dead) return false;
  if ((m[k] | 0) <= 0) return wantItem(k);
  const a = aimAt(12, .88, kind === 'paper' ? VAR[ST.v].bins : null); pl.face = a; pl.swingT = .25; pl.swingKind = 2; req(kind, { a: r2(a) }); sfx('throw'); return true;
}
const throwBook = () => throwKind('bk', 'book'), throwPaper = () => throwKind('cr', 'paper');
const nearDesk = () => VAR[ST.v].pcs.find(c => dist2(pl.x, pl.z, c.x, c.z) < 1.5);
const nearCooler = () => VAR[ST.v].coolers.findIndex(c => dist2(pl.x, pl.z, c.x, c.z) < 1.9);
const nearCof = () => VAR[ST.v].cof.some(c => dist2(pl.x, pl.z, c.x, c.z) < 2.7);

/* ---------- Лобі: вікно з картками поверхів (core modeLobby), голос кліком, «Я готовий» ---------- */
/* що зараз відбувається в лобі (рядок info у вікні й у підказці) */
function lobbyInfo() {
  const hs = ST.ps.filter(p => !p.bot), rd = hs.filter(p => ST.ready[p.k]).length, n = ST.ps.length;
  if (ST.go > 0) return `🚀 Усі на місці — старт за ${Math.ceil(ST.go)}`;
  if (!ST.fill) return `⏳ Чекаємо гравців ${n}/${MAXP} — тисни «✅ Я готовий», і боти доповнять лобі…`;
  if (n < MAXP) return ST.lb && ST.ps.some(p => p.k === ST.lb) ? `🤖 ${escapeHTML(ST.lb)} приєднався · ${n}/${MAXP}` : `⏳ Чекаємо гравців ${n}/${MAXP} — боти доповнять лобі…`;
  return `👥 ${n}/${MAXP} на місці · ✅ готові ${rd}/${hs.length}${ST.cnt > 0 ? ` · без неготових стартуємо за ${Math.ceil(ST.cnt)} с` : ''}`;
}
function lobbyDef() {
  const hs = ST.ps.filter(p => !p.bot), votes = [0, 0, 0];
  for (const p of hs) if (ST.votes[p.k] != null) votes[ST.votes[p.k]]++;
  return {
    title: '🖨️ Битва за принтер — лобі',
    sub: `Клікни по поверху — це твій голос (перемагає поверх із найбільшою кількістю голосів). Потім «✅ Я готовий» — у раунді ${MAXP} учасників, вільні місця займуть боти.`,
    maps: VAR.map((D, i) => ({ n: D.n, img: `addons/printerwar/map${i + 1}.jpg`, about: D.tip })),
    votes, mine: ST.votes[myKey()] != null ? ST.votes[myKey()] : -1, ready: !!ST.ready[myKey()],
    players: ST.ps.map(p => ({ n: p.bot ? '🤖 ' + p.k : p.k === 'me' ? 'Ти' : p.k + (p.k === myKey() ? ' (ти)' : ''), ready: p.bot || !!ST.ready[p.k], vote: !p.bot && ST.votes[p.k] != null ? ST.votes[p.k] : -1 })),
    info: lobbyInfo(),
    onVote: i => req('vote', { v: i }),
    onReady: () => req('ready'),
    onHide: () => { V.lobbyHide = true; lobbyClose(); toast('🗳️ Лобі сховано — <b>F</b> біля стенда «Лобі» або вкладка 🖨️ Принтер, щоб відкрити знову.'); },
  };
}
function lobbyClose() { if (V.lobbyOn && typeof modeLobby === 'function') modeLobby(null); V.lobbyOn = false; }
function openLobby() { V.lobbyHide = false; if (!amIn() && (ST.ph === 'idle' || ST.ph === 'lobby')) req('join'); sfx('ui'); }
function lobbyUI(here, dt) {
  V.joinT = (V.joinT || 0) - dt;
  const open = here && !pl.dead && (ST.ph === 'idle' || ST.ph === 'lobby');
  // зайшов у режим — одразу в лобі (і після кожного раунду теж)
  if (open && !amIn() && V.joinT <= 0 && ST.ps.filter(p => !p.bot).length < MAXP) { V.joinT = 1.5; req('join'); }
  if (amIn() && ST.id !== V.lobbyId) { V.lobbyId = ST.id; V.lobbyHide = false; }   // нове лобі — вікно знову відкрите
  const show = open && running && amIn() && ST.ph === 'lobby' && !V.lobbyHide && !panel && typeof modeLobby === 'function';
  if (show) { modeLobby(lobbyDef()); V.lobbyOn = true; } else lobbyClose();
}

/* ---------- F: лобі, тривога, лагодити, заритися ---------- */
const _getInteract = getInteract;
getInteract = function () {
  if (!SIMSIDE && running && !pl.dead && inArena(pl.x, pl.z) && !pl.carry) {
    const vh = varAt(pl.x, pl.z), Dh = VAR[vh], m = meP(), fight = ST.ph === 'fight';
    if (dist2(pl.x, pl.z, Dh.board.x, Dh.board.z) < 2.4 && !fight) return { l: '🗳️ Лобі — голосування й «Я готовий»', fn: openLobby };
    if (m && fight && vh === ST.v) {
      const P = prnPos();
      if (ST.ev === 'jam' && dist2(pl.x, pl.z, P.x, P.z) < ZONE + .4) return V.fix ? { l: `🔧 Лагоджу… ${Math.round(V.fix.t / 2 * 100)}%`, fn: () => { } } : { l: '🔧 Витягти зажований папір (2 с, +10 сторінок)', fn: () => { V.fix = { t: 0 }; sfx('dig'); } };
      if (dist2(pl.x, pl.z, Dh.alarm.x, Dh.alarm.z) < 2.2) return { l: ST.ac > 0 ? `🚨 Кнопка тривоги (${Math.ceil(ST.ac)} с)` : '🚨 Натиснути кнопку тривоги — викликати начальника!', fn: () => { req('alarm'); sfx('warn'); } };
      const n = zombieNear(); if (n && n.zom) return { l: `☕ Пригостити колегу кавою (хоче ${COFFEE[n.want].join(' ')})`, fn: giveCoffee };
      if (ST.rb && !ST.rb.arm && dist2(pl.x, pl.z, ST.rb.x, ST.rb.z) < 1.8 && (m.bo || m.mo)) return { l: `💣 Прикрутити ${m.bo ? 'бомбу' : 'Молотов'} до Румби — поїде до суперника біля принтера`, fn: armRoomba };
      { const i = nearPick(); if (i >= 0) { const s = Dh.picks[i], it = ITEM[s.k]; return { l: `${it.f.replace(/^F — /, '')} · у тебе ${m[s.k] | 0}/${it.max}`, fn: () => { req('take', { i }); sfx('dig'); } }; } }
      if (m.bur) return { l: '🫣 Вилізти з паперів', fn: toggleBury };
      if (nearPile()) return { l: '🫣 Заритися в купу паперу (штовхати важче)', fn: toggleBury };
      { const ci = nearCooler(); if (ci >= 0) return { l: '💦 Перекинути кулер — ковзка калюжа', fn: () => { req('cooler', { i: ci }); sfx('splash'); } }; }
      if (nearCof()) return { l: '☕ Набрати кави для колег (еспресо, лате, раф)', fn: () => req('refill') };
      if (!m.wi && !m.hold && nearDesk()) return { l: '🔌 Висмикнути дріт з ПК (кинеш у калюжу — струм!)', fn: () => { req('wireget'); sfx('dig'); } };
    }
  }
  return _getInteract.apply(this, arguments);
};

/* ---------- HUD, підказки, підписи ---------- */
function goal() {   // { txt, tg } — що робити зараз і куди йти
  const m = meP(), vh = varAt(pl.x, pl.z), Dh = VAR[Math.max(0, vh)], D = VAR[ST.v], P = prnPos();
  if (!m) return ST.ph === 'fight' ? { txt: `Битва йде на поверсі ${D.fl} — дивись і чекай наступного раунду.` } : { txt: ST.ps.filter(p => !p.bot).length >= MAXP ? `Лобі повне (${MAXP}/${MAXP}) — дочекайся наступного раунду.` : '🗳️ Підійди до <b>стенда «Лобі»</b> й натисни <b>F</b>.', tg: Dh.board };
  if (ST.ph === 'lobby') return V.lobbyHide ? { txt: `🗳️ Лобі сховано — <b>F</b> біля стенда «Лобі» (або вкладка 🖨️ Принтер), щоб голосувати й натиснути «Я готовий». ${lobbyInfo()}`, tg: Dh.board }
    : { txt: ST.ready[myKey()] ? `✅ Ти готовий. ${lobbyInfo()}` : `🗳️ Обери поверх у вікні лобі й тисни <b>«✅ Я готовий»</b>. ${lobbyInfo()}` };
  if (ST.ph !== 'fight') return { txt: 'Раунд скінчився.' };
  if (vh !== ST.v) return { txt: `Битва на поверсі ${D.fl}!` };
  { const z = ST.npc.find(n => n.zom && n.tgt === myKey()); if (z) return { txt: `🧟 До тебе чіпляється зомбі-колега (цупить сторінки)! Пригости <b>${COFFEE[z.want].join(' ')}</b> — <b>6</b> / <b>F</b>${(m.cf || [])[z.want] ? '' : ' (спершу набери на кухні)'}, або піною 🧯 <b>4</b>.`, tg: z }; }
  if (ST.sf) return { txt: `🔥 <b>Серверна горить</b> — друк стоїть у всіх! Біжи з 🧯 вогнегасником (<b>4</b>) і гаси — +8 📄. ${Math.round(ST.sf.hp)}%`, tg: ST.sf };
  if (ST.rb && ST.rb.arm) return { txt: ST.rb.by === myKey() ? '💣 Твоя Румба-камікадзе їде до суперника — тримайся подалі!' : '💣 <b>Румба з бомбою</b> їде сюди — тікай або зустрінь її піною!', tg: ST.rb };
  if (ST.ev === 'boss') return { txt: '👔 <b>Начальник!</b> Відійди від принтера — хто там стоїть, втрачає сторінки!' };
  if (ST.ev === 'jam') return { txt: '🖨️ Зажувало! Біжи до принтера й тримай <b>F</b> 2 с — +10 сторінок.', tg: P };
  if (m.hold) return { txt: '📄 Пачка в руках — <b>1</b> / <b>Q</b>: жбурни в обличчя тому, хто друкує!', tg: (() => { const p = ST.ps.find(q => q.k === ST.owner && q.k !== myKey()); return p ? posOf(p) : null; })() };
  if (ST.pu) return { txt: '⚡ <b>Картридж-турбо</b> на підлозі — хапай: друк ×2 на 10 с!', tg: ST.pu };
  if (ST.stacks.length) { const s = ST.stacks.reduce((a, b) => dist2(pl.x, pl.z, b.x, b.z) < dist2(pl.x, pl.z, a.x, a.z) ? b : a); return { txt: '📄 Пачки паперу на підлозі — збирай (+4) і жбурляй у суперників!', tg: s }; }
  if (slimeAt(pl.x, pl.z)) return { txt: '🖤 <b>Тонерна ковзанка!</b> Не загальмуєш — розганяйся заздалегідь і таранить суперників.', tg: P };
  if (ST.owner === myKey()) return { txt: m.bur ? '🫣 Друкуєш, заритий у папери — штовхнути тебе важко!' : `🖨️ Друкуєш!${m.streak > 3 ? ` 🔥 Тримай — комбо за ${Math.ceil(8 - m.streak % 8)} с` : ''} Не підпускай нікого — <b>ЛКМ</b> штовхнути.` };
  if (ST.owner === '*') return { txt: '⚔️ Біля принтера тиснява — виштовхни всіх (<b>ЛКМ</b>, кидай крісла <b>Q</b>)!', tg: P };
  if (V.want) { const s = nearestPick(V.want.k), it = ITEM[V.want.k]; if (s) return { txt: `${it.ic} 0 — візьми: <b>${it.src}</b> → підійди й натисни <b>F</b> (${it.lbl}).`, tg: s }; }
  if (ST.owner && ST.owner !== myKey() && !(m.pl | 0) && !(m.bk | 0) && !(m.cr | 0)) { const s = nearestPick('pl'); if (s) return { txt: `✈️ 0 — візьми папір біля принтера → <b>F</b> біля лотка «✈️ Папір для літачків» (+3), потім кидай (<b>1</b> / <b>ЛКМ</b>) у того, хто друкує! Книжки — 📘 у шафах, папірці — 🧻 у смітниках.`, tg: s }; }
  if (ST.owner) { return { txt: `🖨️ Друкує ${nameOf(ST.owner)} — виштовхни (<b>ЛКМ</b>), ✈️ розізли колегу біля нього (<b>1</b>) — зомбі піде діставати лідера, 💣 Румба (<b>7</b>) або 🚨 тривога!`, tg: P }; }
  return { txt: D.prn.length > 1 ? '🖨️ Принтер вільний — біжи до <b>ЗЕЛЕНОГО</b> (другий вимкнений)!' : D.route ? '🖨️ Принтер їде колією — наздожени й стань у коло!' : '🖨️ Принтер вільний — біжи в коло біля нього!', tg: P };
}
function hud(here) {
  if (!V.hud) {
    V.hud = document.createElement('div'); V.hud.id = 'printer-hud';
    V.hud.style.cssText = 'position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 64px);transform:translateX(-50%);z-index:2;pointer-events:none;background:rgba(46,35,70,.85);color:#fff;border-radius:14px;padding:7px 14px;font:700 13px/1.4 system-ui,sans-serif;text-align:center;box-shadow:0 6px 18px rgba(0,0,0,.25);white-space:nowrap;max-width:96vw;overflow:hidden';
    V.goalEl = document.createElement('div'); V.goalEl.id = 'printer-goal';
    V.goalEl.style.cssText = 'position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 150px);transform:translateX(-50%);z-index:2;pointer-events:none;background:#FFE066;color:#2E2346;border-radius:12px;padding:7px 14px;font:700 14px/1.4 system-ui,sans-serif;text-align:center;box-shadow:0 6px 18px rgba(0,0,0,.25);width:max-content;max-width:min(560px,90vw)';
    document.body.appendChild(V.hud); document.body.appendChild(V.goalEl);
  }
  const show = here && !pl.dead && !panel;
  V.hud.style.display = V.goalEl.style.display = show ? '' : 'none';
  if (!show) { V.goal = null; return; }
  let h; const m = meP(), vh = varAt(pl.x, pl.z);
  if (ST.ph === 'fight' || ST.ph === 'end') {
    const left = Math.max(0, DUR - ST.t), rows = ST.ps.slice().sort((a, b) => b.pages - a.pages).map(p => `<span style="color:${COL[p.col % NC]}">${p.k === ST.owner ? '🖨️' : '●'} ${nameOf(p.k)} ${p.pages}${p.turbo > 0 ? '⚡' : ''}${p.streak >= 8 ? '🔥' : ''}${p.bur ? '🫣' : ''}${p.hold ? '📄' : ''}</span>`).join(' · ');
    const sw = VAR[ST.v].prn.length > 1 && ST.ph === 'fight' ? ` · 🔀 ${Math.ceil(SWITCH - ST.t % SWITCH)} с` : '';
    const st = m && ST.ph === 'fight' ? [m.turbo > 0 ? `⚡ турбо ${Math.ceil(m.turbo)} с` : '', m.streak >= 8 ? `🔥 комбо ×${Math.floor(m.streak / 8)}` : '', slimeAt(pl.x, pl.z) || wetAt(pl.x, pl.z) ? '🖤 ковзко!' : '', V.stunT > 0 ? '⚡ струмить!' : '', ST.sf ? '🔥 СЕРВЕРНА ГОРИТЬ — друк стоїть' : '', ST.npc.some(n => n.zom) ? `🧟 ×${ST.npc.filter(n => n.zom).length}` : ''].filter(Boolean).join(' · ') : '';
    h = `🖨️ ${VAR[ST.v].n} · ${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')} · до ${GOAL} 📄${ST.t > DUR - 30 && ST.ph === 'fight' ? ' · <span style="color:#FFE066">×2!</span>' : ''}${sw}<br><span style="font-size:12px">${rows}</span>${st ? `<br><span style="font-size:12px;color:#FFE066">${st}</span>` : ''}`;
  } else {
    const cnt = [0, 0, 0]; for (const k in ST.votes) cnt[ST.votes[k]]++;
    h = `🖨️ Битва за принтер · ${VAR[vh].n}<br><span style="font-weight:600;font-size:12px">${ST.ph === 'lobby' ? `лобі ${ST.ps.length}/${MAXP} (🤖 ${ST.ps.filter(p => p.bot).length})${ST.go > 0 ? ` · старт за ${Math.ceil(ST.go)}` : ''}` : 'F біля стенда — лобі'} · 🗳️ ${VAR.map((D, i) => `${D.fl}: ${cnt[i]}`).join(' · ')}</span>`;
  }
  if (V.hud.innerHTML !== h) V.hud.innerHTML = h;
  const g = goal(); V.goal = g; const gt = '👉 ' + g.txt; if (V.goalEl.innerHTML !== gt) V.goalEl.innerHTML = gt;
}
function labels(vh) {
  if (!V.lbl) {
    V.lbl = document.createElement('div'); V.lbl.style.cssText = 'position:fixed;inset:0;z-index:2;pointer-events:none'; document.body.appendChild(V.lbl);
    const pill = (bg, fg, font) => { const e = document.createElement('div'); e.style.cssText = `position:absolute;left:0;top:0;padding:4px 10px;border-radius:10px;background:${bg};color:${fg};font:${font || '800 13px system-ui,sans-serif'};white-space:nowrap`; V.lbl.appendChild(e); return e; };
    V.boardLbl = pill('#FFE066', '#2E2346'); V.boardLbl.textContent = '🗳️ Лобі (F)';
    V.prnLbl = pill('rgba(46,35,70,.85)', '#fff'); V.prn2Lbl = pill('rgba(46,35,70,.6)', '#FF8FA3', '700 11px system-ui,sans-serif');
    V.alarmLbl = pill('rgba(196,30,58,.85)', '#fff', '700 11px system-ui,sans-serif');
    V.puLbl = pill('#FF6BD6', '#fff', '800 12px system-ui,sans-serif'); V.puLbl.textContent = '⚡ Картридж-турбо';
    V.srvLbl = pill('rgba(46,35,70,.75)', '#BFE6FF', '700 11px system-ui,sans-serif'); V.rbLbl = pill('rgba(46,35,70,.75)', '#7FE08A', '700 11px system-ui,sans-serif');
    V.roomLbl = [];
    V.glbl = pill('#FFE066', '#2E2346', '800 14px system-ui,sans-serif'); V.glbl.style.boxShadow = '0 0 0 3px rgba(255,224,102,.35),0 6px 16px rgba(0,0,0,.3)';
    V.gArrow = new THREE.Group(); const sh = mesh(new THREE.ConeGeometry(.28, .7, 3), bulb('#FFE066'), false); sh.rotation.z = -Math.PI / 2; sh.position.x = 1.25; V.gArrow.add(sh); scene.add(V.gArrow);
    V.gMark = new THREE.Mesh(new THREE.TorusGeometry(.6, .07, 6, 24), new THREE.MeshBasicMaterial({ color: '#FFE066', transparent: true, opacity: .9, depthWrite: false })); V.gMark.rotation.x = Math.PI / 2; scene.add(V.gMark);
  }
  const show = vh >= 0 && !panel && !pl.dead;
  V.lbl.style.display = show ? '' : 'none';
  const g = show && V.goal; V.gArrow.visible = V.gMark.visible = !!(g && g.tg);
  if (!show) return;
  const Dh = VAR[vh], at = (el, x, y, z) => { const q = screenPos(x, y, z); el.style.display = q.vis ? '' : 'none'; el.style.transform = `translate(${Math.round(q.x)}px,${Math.round(q.y)}px) translate(-50%,-100%)`; };
  // кімнати поверху
  if (V.roomV !== vh) { V.roomV = vh; V.roomLbl.forEach(o => o.e.remove()); V.roomLbl = Dh.rooms.map(r => { const e = document.createElement('div'); e.style.cssText = 'position:absolute;left:0;top:0;padding:3px 9px;border-radius:10px;background:rgba(255,255,255,.75);color:#4E3A7C;font:700 11px system-ui,sans-serif;white-space:nowrap;transition:opacity .2s'; e.textContent = r[0]; V.lbl.insertBefore(e, V.lbl.firstChild); return { r, e }; }); }
  for (const { r, e } of V.roomLbl) {   // назва кімнати, в якій ти стоїш, ховається
    const lx = pl.x - Dh.cx, lz = pl.z - Dh.cz, inside = lx > Math.min(r[1], r[3]) && lx < Math.max(r[1], r[3]) && lz > Math.min(r[2], r[4]) && lz < Math.max(r[2], r[4]);
    e.style.opacity = inside ? 0 : 1; at(e, Dh.cx + (r[1] + r[3]) / 2, 1.6, Dh.cz + (r[2] + r[4]) / 2);
  }
  // лотки з папером, книжкові шафи, смітники — підписи видно здалеку (у бою: скільки в тебе і що робити)
  if (V.pickV !== vh) { V.pickV = vh; (V.pickLbl || []).forEach(o => o.e.remove()); V.pickLbl = Dh.picks.map(sp => { const e = document.createElement('div'); e.style.cssText = `position:absolute;left:0;top:0;padding:3px 8px;border-radius:9px;background:rgba(46,35,70,.82);color:#fff;border:2px solid ${PICK_COL[sp.k]};font:800 11px system-ui,sans-serif;white-space:nowrap`; V.lbl.appendChild(e); return { sp, e }; }); }
  { const m = meP(), fightHere = m && ST.ph === 'fight' && vh === ST.v;
    for (const { sp, e } of V.pickLbl) { const it = ITEM[sp.k], near = fightHere && dist2(pl.x, pl.z, sp.x, sp.z) < 2.1, t = near ? it.f : fightHere && !(m[sp.k] | 0) ? `${it.lbl} · у тебе 0 — бери!` : it.lbl; if (e.textContent !== t) e.textContent = t; e.style.background = near ? PICK_COL[sp.k] : 'rgba(46,35,70,.82)'; e.style.color = near ? '#2E2346' : '#fff'; at(e, sp.x, sp.k === 'bk' ? 2.75 : 2.15, sp.z); } }
  V.boardLbl.style.visibility = ST.ph === 'fight' || ST.ph === 'end' || (V.lobbyOn && amIn()) ? 'hidden' : ''; at(V.boardLbl, Dh.board.x, 2.8, Dh.board.z);
  const cur = vh === ST.v && ST.ph === 'fight', P = cur ? prnPos() : prnPos(vh);
  const pt = !cur ? '🖨️ ПРИНТЕР' : ST.ev === 'jam' ? '🖨️ ЗАЖУВАЛО — лагодь (F)' : ST.ev === 'boss' ? '👔 НЕ ПІДХОДЬ!' : ST.owner === '*' ? '⚔️ Тиснява!' : ST.owner ? `🖨️ Друкує: ${nameOf(ST.owner)}` : '🖨️ ПРИНТЕР — стань у коло сам';
  if (V.prnLbl.textContent !== pt) V.prnLbl.textContent = pt; at(V.prnLbl, P.x, 2.4, P.z);
  V.prn2Lbl.style.visibility = Dh.prn.length > 1 ? '' : 'hidden';
  if (Dh.prn.length > 1) { const off = Dh.prn[1 - actIdx(vh)], left = SWITCH - fightT(vh) % SWITCH, t2 = cur && left < 4 ? `⚠️ Вмикається за ${Math.ceil(left)} с!` : '💤 Вимкнений'; if (V.prn2Lbl.textContent !== t2) V.prn2Lbl.textContent = t2; at(V.prn2Lbl, off.x, 2.2, off.z); }
  const at2 = ST.ac > 0 && cur ? `🚨 Тривога (${Math.ceil(ST.ac)} с)` : '🚨 Кнопка тривоги (F)'; if (V.alarmLbl.textContent !== at2) V.alarmLbl.textContent = at2; at(V.alarmLbl, Dh.alarm.x - .3, 2.1, Dh.alarm.z);
  V.puLbl.style.visibility = ST.pu && cur ? '' : 'hidden'; if (ST.pu) at(V.puLbl, ST.pu.x, 1.5, ST.pu.z);
  { const sf = cur && ST.sf, st = sf ? `🔥 СЕРВЕРНА ГОРИТЬ ${Math.round(ST.sf.hp)}% — гаси 🧯` : '🗄️ Сервер'; if (V.srvLbl.textContent !== st) V.srvLbl.textContent = st; V.srvLbl.style.background = sf ? 'rgba(255,92,60,.9)' : 'rgba(46,35,70,.75)'; V.srvLbl.style.color = sf ? '#fff' : '#BFE6FF'; at(V.srvLbl, Dh.srv.x, sf ? 3 : 2.3, Dh.srv.z); }
  V.rbLbl.style.visibility = cur && ST.rb ? '' : 'hidden';
  if (cur && ST.rb) { const r = ST.rb, rt = r.arm ? `💣 Румба-камікадзе ${Math.ceil(r.fuse)} с${r.by ? ' · від ' + nameOf(r.by) : ''}` : '🤖 Румба (F з бомбою)'; if (V.rbLbl.textContent !== rt) V.rbLbl.textContent = rt; V.rbLbl.style.color = r.arm ? '#FF8FA3' : '#7FE08A'; at(V.rbLbl, r.x, 1, r.z); }
  for (const p of ST.ps) {
    if (!p.bot || ST.ph === 'idle' || ST.ph === 'lobby') continue;
    let el = V.tags.get(p.k); if (!el) { el = document.createElement('div'); el.style.cssText = `position:absolute;left:0;top:0;padding:2px 7px;border-radius:8px;background:rgba(46,35,70,.8);color:${COL[p.col % NC]};font:700 11px system-ui,sans-serif;white-space:nowrap`; V.lbl.appendChild(el); V.tags.set(p.k, el); }
    const t = `🤖 ${p.k} · ${p.pages}${p.blind > 0 ? ' 📄😵' : ''}${p.turbo > 0 ? ' ⚡' : ''}`; if (el.textContent !== t) el.textContent = t; at(el, p.x, 2.5, p.z);
  }
  for (const [k, el] of V.tags) if (!ST.ps.some(p => p.k === k && p.bot) || ST.ph === 'idle' || ST.ph === 'lobby') { el.remove(); V.tags.delete(k); }
  // жовта стрілка й мітка до цілі
  V.glbl.style.display = g && g.tg ? '' : 'none';
  if (g && g.tg) {
    const d = dist2(pl.x, pl.z, g.tg.x, g.tg.z);
    V.gMark.position.set(g.tg.x, .08, g.tg.z); V.gMark.scale.setScalar(1 + Math.sin(gameTime * 5) * .12);
    V.gArrow.visible = d > 2.2; V.gArrow.position.set(pl.x, .15, pl.z); V.gArrow.rotation.y = -Math.atan2(g.tg.z - pl.z, g.tg.x - pl.x);
    V.glbl.textContent = '👉 Сюди'; V.glbl.style.display = d > 3 ? '' : 'none'; at(V.glbl, g.tg.x, 3.2, g.tg.z);
  }
}
/* коротка інструкція при першому вході */
function intro(force) {
  if (!force && (!running || !inArena(pl.x, pl.z) || panel)) return;
  const d = A.data(); if ((d.intro3 && !force) || SIMSIDE || document.getElementById('pw-intro')) return;
  const el = document.createElement('div'); el.id = 'pw-intro';
  el.style.cssText = 'position:fixed;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;background:rgba(20,12,40,.55);padding:16px';
  el.innerHTML = `<div style="max-width:470px;width:100%;max-height:90vh;overflow:auto;background:#2E2346;color:#fff;border-radius:18px;padding:18px 20px;font:14px/1.5 system-ui,sans-serif;box-shadow:0 12px 40px rgba(0,0,0,.4)">
    <div style="font:800 20px system-ui;margin-bottom:8px">🖨️ Битва за принтер — як грати</div>
    <div>1. <b>🗳️ Лобі</b>: у вікні лобі клікни по картці поверху — голос, потім <b>«✅ Я готовий»</b>. У раунді ${MAXP} учасників: вільні місця по одному займають 🤖 боти, тоді «старт за 3…2…1». Сховав вікно — <b>F</b> біля стенда «Лобі».</div>
    <div>2. <b>🖨️ Друкуй</b>: стій у колі біля принтера <b>сам</b>. Двоє — тиснява. <b>ЛКМ / R</b> — штовхнути (коли поруч нікого — ЛКМ кидає вибране на панелі).</div>
    <div>3. <b>🖤 Тонерна ковзанка</b>: після вибуху тонера підлога чорна й слизька — не загальмуєш, усі врізаються.</div>
    <div>4. <b>📄 Пачки паперу</b> після «дощу»: підбери (+4) і жбурни (<b>1 / Q</b>) в обличчя — суперник осліпне й впустить усе.</div>
    <div>5. <b>🫣 Купи паперу</b>: <b>F</b> — заритися (штовхати тебе втричі важче, боти не помічають).</div>
    <div>6. <b>⚡ Картридж-турбо</b> — друк ×2 на 10 с. <b>🚨 Кнопка тривоги</b> на стіні — викликає начальника на того, хто друкує. <b>🔥 Комбо</b>: кожні 8 с безперервного друку — бонус.</div>
    <div>7. <b>Звідки снаряди</b> (кольорові кола й підписи на підлозі): <b>✈️ лоток з папером</b> біля принтера — F, скласти літачки (+3); <b>📘 книжкова шафа</b> — F, взяти книжки (+2); <b>🧻 смітник</b> — F, намʼяти паперу (+5). Кидаєш клавішею слота (<b>1</b> ✈️, <b>2</b> 📘, <b>3</b> 🧻) або <b>ЛКМ</b> туди, куди дивиться курсор — летить дугою. Книжка збиває з ніг, папірець у смітник здалеку — 🪙 і досвід (чим далі, тим більше).</div>
    <div>8. <b>✈️ Літачок</b>: влучиш у ПК — може заспамити серверну → <b>🔥 пожежа</b>, принтер стоїть, поки не загасять <b>🧯</b> (4). У колегу — шкала злості росте; повна — <b>🧟 «зайобуючий»</b> іде діставати лідера (і злить сусідів). Заспокоїти — <b>☕ кава</b> (6), та, яку він хоче.</div>
    <div>9. <b>💦 Кулер</b> (F, літачком чи кріслом з розгону) — калюжа; <b>🔌 дріт</b> з ПК (F біля столу) у калюжу — <b>⚡ струм</b>, усі в ній завмирають. <b>🍾 Молотов</b> (5) — палаюча калюжа. <b>💣 Румба</b> (7 / F біля неї) — їде до суперника біля принтера й вибухає. Крісло + 🧯 назад — реактивний політ!</div>
    <div style="margin-top:6px;color:#BFE6FF">Поверх 57 — принтер на колесах їде колією. Поверх 63 — два принтери, працює лише зелений, перемикання кожні 25 с.</div>
    <div style="margin-top:8px;color:#FFE066">Жовта стрілка під ногами показує, куди бігти. Підказка — внизу екрана 👇</div>
    <button class="btn" style="margin-top:12px;width:100%">Зрозуміло, до принтера!</button></div>`;
  document.body.appendChild(el);
  el.querySelector('button').addEventListener('click', () => { el.remove(); d.intro3 = 1; save(); });
}

/* ---------- Музика: офісний фанк-баттл; начальник — тривога; серверна — темніше ---------- */
const PPROG = [[45, [64, 67, 72, 76]], [41, [64, 69, 72, 77]], [43, [62, 67, 71, 74]], [40, [62, 67, 71, 76]]];
const PPROG3 = [[38, [62, 65, 69, 72]], [34, [62, 65, 70, 74]], [36, [60, 64, 67, 71]], [33, [60, 64, 69, 72]]];
if (!SIMSIDE && typeof scheduleStep === 'function') {
  const _ss = scheduleStep;
  scheduleStep = function (i, t) {
    if (!running || !inArena(pl.x, pl.z) || typeof LAYER === 'undefined' || !LAYER.drums) { if (V.music >= 0) { V.music = -1; barMode = ''; } return _ss.apply(this, arguments); }
    const s = i % 16, bar = Math.floor(i / 16), lvl = ST.ph !== 'fight' ? 0 : ST.ev === 'boss' || ST.ev === 'toner' || ST.sl || ST.sf || ST.npc.some(n => n.zom) ? 2 : 1;
    if (s === 0 && V.music !== lvl) { V.music = lvl; const m = [{ keys: .8, bass: .6, drums: .4, tension: 0, lead: .2, crackle: .1 }, { keys: .7, bass: 1, drums: 1, tension: .15, lead: .45, crackle: 0 }, { keys: .5, bass: 1, drums: 1, tension: .8, lead: .3, crackle: 0 }][lvl]; for (const k in m) if (LAYER[k]) LAYER[k].gain.setTargetAtTime(m[k], t, .5); }
    const [root, ch] = (varAt(pl.x, pl.z) === 2 ? PPROG3 : PPROG)[bar % 4];
    if (s === 0 || s === 8) ch.forEach((n, k) => epiano(t + k * .015, n, 1, .04, LAYER.keys));
    if ([0, 3, 7, 10, 12].includes(s)) bassNote(t, root + (s === 7 ? 7 : 0), STEP, lvl ? .45 : .28);
    if (lvl) { if (s % 4 === 0) kick(t, .8); if (s === 4 || s === 12) snare(t, .35); hat(t, s % 2 ? .03 : .055); }
    else if (s % 8 === 0) kick(t, .45);
    if ([2, 6, 11, 14].includes(s) && Math.random() < (lvl ? .55 : .3)) marimba(t, pick([72, 74, 76, 79, 81]), .045);
    if (lvl === 2 && s % 2 === 0) pulse(t, root + 25, STEP * .8, .055);
  };
}

/* ---------- Режим (у кнопці PVP), вкладка ---------- */
const lobbyV = () => ST.ph === 'fight' || ST.ph === 'lobby' ? ST.v : ST.ph === 'end' ? ST.nv : ST.v;
function goPrinter(vi) {
  const D = VAR[vi == null ? lobbyV() : vi], f = $('#fade'); closePanel(); if (f) f.style.opacity = 1; sfx('travel');
  setTimeout(() => { const x = D.board.x, z = D.board.z - 1.4; pl.x = x; pl.z = z; pl.y = 0; pl.falling = false; pl.jump = null; pl.safe = { x, z }; camPos.set(pl.x, 20, pl.z + 15); camLook.set(pl.x, .5, pl.z); if (f) f.style.opacity = 0; V.lobbyHide = false; if (!amIn() && (ST.ph === 'idle' || ST.ph === 'lobby')) req('join'); toast(`🛗 ${D.n}. Обери поверх у вікні лобі й тисни «Я готовий».`); }, 260);
  return true;
}
function leavePrinter() { if (amIn()) req('leave'); V.joinT = 2; V.fix = null; setBar(false); lobbyClose(); return true; }
if (A.mode) A.mode({ id: 'printerwar', group: 'pvp', ic: '🖨️', n: 'Битва за принтер', sub: '3 поверхи хмарочоса · штовханина · 5 учасників (люди + боти)', go: () => goPrinter(), here: () => running && inArena(pl.x, pl.z), leave: leavePrinter });
A.tab('printerwar', '🖨️ Принтер', () => {
  const d = A.data(), here = inArena(pl.x, pl.z);
  return `<h3>🖨️ Битва за принтер</h3>
    <p style="font-size:13px;line-height:1.5;margin:4px 0 10px">Один принтер на весь поверх. Звіт треба всім. Хто першим надрукує ${GOAL} сторінок (або найбільше за 2,5 хв) — той і молодець.</p>
    <div class="btns"><button class="btn alt" data-pw="help">❓ Як грати</button>${here ? (ST.ph === 'fight' || ST.ph === 'end' ? '' : '<button class="btn" data-pw="lobby">🗳️ Лобі</button>') : '<button class="btn" data-pw="go">🛗 На поверх</button>'}</div>
    <div class="btns" style="margin-top:8px">${here ? '' : VAR.map((D, i) => `<button class="btn alt" data-pw="g${i}">🛗 ${D.n}</button>`).join('')}</div>
    <div class="list" style="margin-top:10px;font-size:13px;line-height:1.55">
      <div>🏢 <b>42 · Копі-центр</b> — скляна копі-кімната, коридор-кільце. <b>57 · Лабіринт</b> — кабінки, принтер на колесах їде колією. <b>63 · Серверна</b> — два принтери, працює один, перемикання кожні 25 с.</div>
      <div>🖨️ Стій у колі біля принтера <b>сам</b> — +1 сторінка кожні пів секунди (останні 30 с — ×2). Двоє в колі — ніхто не друкує.</div>
      <div>👥 Раунд — ${MAXP} учасників: після першого «✅ Я готовий» вільні місця по одному займають 🤖 боти (людина, що прийде пізніше, займе місце бота), потім «старт за 3…2…1».</div>
      <div>👊 <b>ЛКМ</b> / R — штовхнути. Крісла й коробки: F — підняти, Q — жбурнути.</div>
      <div>🖤 <b>Тонерна ковзанка</b>: вибух тонера заливає підлогу — ковзаєш, не гальмуєш, усі врізаються.</div>
      <div>📄 <b>Пачки паперу</b>: підбери (+4), жбурни (1 / Q) в обличчя — суперник осліпне на 2 с і впустить усе. 🫣 У купу паперу можна заритися (F) — штовхати втричі важче.</div>
      <div>⚡ Картридж-турбо — друк ×2 10 с. 🚨 Кнопка тривоги — кличе начальника (хто біля принтера — мінус сторінки). 🔥 Комбо — кожні 8 с безперервного друку бонус.</div>
      <div>🗂️ <b>Звідки снаряди</b>: на кожному поверсі — кольорові кола з підписами. <b>✈️ Лоток з папером</b> (біля принтерів і в опенспейсах): F — скласти літачки (+3, до 6). <b>📘 Книжкова шафа</b>: F — книжки (+2, до 4) — книжкою збиваєш суперника з ніг (він впускає пачку). <b>🧻 Смітник</b>: F — мʼятий папір (+5, до 10) — кинь папірець у будь-який смітник: чим далі, тим більше 🪙 і досвіду (${BIN_CAP} нагород за раунд, +1 📄). Порожній слот підкаже, куди йти, а жовта стрілка покаже.</div>
      <div>🎯 Кидати: клавіша слота (<b>1</b> ✈️ · <b>2</b> 📘 · <b>3</b> 🧻 · <b>5</b> 🍾) або <b>ЛКМ</b>, коли вибрано слот і поруч нема кого штовхнути — летить дугою туди, куди дивиться курсор (з автоприцілом).</div>
      <div>✈️ <b>Паперовий літачок</b> (1, на старті 2 шт): у ПК — шанс, що той заспамить серверну й вона <b>🔥 загориться</b> — друк стоїть у всіх, доки не загасять. Гасиш — +8 📄.</div>
      <div>😠 <b>Колеги-офісники</b>: літачок / пачка / піна наповнюють шкалу злості над головою. Повна — <b>🧟 «зайобуючий»</b>: іде до лідера, цупить сторінки, стоїть у колі принтера й заводить сусідів (ланцюгова реакція). Заспокоїти — <b>☕ кава</b> (6) того сорту, що над ним; набрати — F біля кавомашини на кухні.</div>
      <div>💦 <b>Кулер-пастка</b>: F, літачком чи кріслом з розгону — ковзка калюжа; 🔌 дріт з ПК (F біля столу) у калюжу — <b>⚡ струм</b>, усі в ній завмирають.</div>
      <div>🧯 <b>Вогнегасник</b> (4): гасить пожежі, відкидає суперників і зомбі. Сидиш у кріслі й пшикаєш назад — <b>реактивне крісло</b>! 🍾 <b>Молотов</b> (5) — палаюча калюжа на 6 с. 💣 <b>Румба-камікадзе</b> (7 / F біля пилососа) — їде до суперника біля принтера (або до зомбі) і вибухає: −5 📄.</div>
      <div>🏆 1 місце — 110 🪙, 2 — 60, 3 — 35, 4 — 20, 5 — 12.</div>
    </div>
    <p class="muted" style="font-size:12px;margin-top:10px">Битв: ${d.games || 0} · перемог: ${d.wins || 0} · рекорд: ${d.best || 0} 📄 · у смітник: ${d.bins || 0} (найдальше ${(d.binBest || 0).toFixed(1)} м)</p>`;
}, e => {
  const b = e.target.closest('[data-pw]'); if (!b) return; const a = b.dataset.pw;
  if (a === 'go') goPrinter(); else if (a === 'help') { closePanel(); intro(true); }
  else if (a[0] === 'g') goPrinter(+a[1]);
  else if (a === 'lobby') { closePanel(); openLobby(); }
});
if (window.__ADDON_TEST) window.__printer = { ST, AU, V, VAR, COFFEE, rile, spill, electrify, doSpray, wetAt, zapAt, fireAt, throwAny, throwMolo, sprayFoam, giveCoffee, armRoomba, startServerFire, launch, get BOARD() { return VAR[lobbyV()].board; }, get PX() { return prnPos().x; }, get PZ() { return prnPos().z; }, ZONE, GOAL, DUR, SWITCH, shove, startEvent, posOf, prnPos, slimeAt, throwStack, toggleBury, req, varAt, navOf, reachable, goPrinter, actIdx, routeAt, onEvent, lobbyDef, openLobby, lobbyCheck, lmb, throwKind, ITEM, BIN_CAP };
