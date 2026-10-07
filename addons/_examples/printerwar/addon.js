/* Аддон «Битва за принтер» v2 (PVP, «цар гори», до 4 + боти). Тепер — на високих поверхах хмарочоса в центрі міста.
   В офісі один принтер на всіх, а звіт потрібен кожному. Хто стоїть біля принтера САМ — той друкує сторінки.
   - Три поверхи: 42 · Копі-центр (скляна копі-кімната в центрі), 57 · Опенспейс-лабіринт (принтер на колесах
     їздить по жовтій колії), 63 · Серверна (ДВА принтери, працює лише один — перемикаються кожні 25 с).
   - Записатися — F біля табло. Голосувати за поверх — стань на кружечок «42 / 57 / 63» біля табло.
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
const ZONE = 2.6, GOAL = 100, DUR = 150, MAXP = 4, SWITCH = 25, RSPD = .8, SLIME_R = 4.3, SLIME_T = 18;
const COL = ['#FF6BD6', '#6BE7FF', '#FFE066', '#7FE08A'];
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
F3.push(['ups', 17.2, 2.6, 0], ['ups', 17.2, 4.4, 0], ['ups', 17.2, 6.2, 0], ['shelf', 14.5, 12.5, Math.PI, 2], ['plant', 12.7, 1, 0]);

const VDEF = [
  { n: 'Поверх 42 · Копі-центр', fl: 42, w: 34, d: 26, r: 23, night: false, walls: W1, furn: F1, logo: 'ОФІС «ГУЩА» · 42', logoAt: [-16.85, 0, Math.PI / 2],
    board: [-11, 2.5], pads: [[-13.4, 4.6], [-11.4, 4.6], [-9.4, 4.6]], prn: [[0, 0]], alarm: [7.78, 4], spots: [[-6.2, -5.3], [6.2, -5.3], [6.2, 5.3], [-6.2, 5.3]],
    bodies: [[-12, -8], [-6, -10.8], [10.3, 0], [-11, -1.8]], props: [[-6.4, -5.6], [6.4, 5.6], [-6.4, 5.6], [6.4, -5.6], [0, -5.4]],
    floors: [[-17, -13, 17, 13, '#C9CDD9'], [-17, -13, 0, -7, '#5A6BB5'], [8, -7, 17, 7, '#5A6BB5'], [0, -13, 17, -7, '#7E6FB8'], [-17, -7, -8, 7, '#E3D7C4'], [-5, 7, 5, 13, '#C4956A'], [5, 7, 17, 13, '#8C5A3C'], [-4.5, -3.5, 4.5, 3.5, '#EDEBF5']],
    tiles: [-17, 7, -5, 13, '#FFFFFF', '#DCD6EA'],
    rooms: [['💻 Опенспейс А', -17, -13, 0, -7], ['📊 Переговорна', 0, -13, 17, -7], ['🛎️ Рецепція', -17, -7, -8, 7], ['💻 Опенспейс Б', 8, -7, 17, 7], ['☕ Кухня', -17, 7, -5, 13], ['🛋️ Лаунж', -5, 7, 5, 13], ['👔 Кабінет боса', 5, 7, 17, 13]],
    tip: 'скляна копі-кімната в центрі, коридор-кільце навколо' },
  { n: 'Поверх 57 · Опенспейс-лабіринт', fl: 57, w: 36, d: 28, r: 24.5, night: false, walls: W2, furn: F2, logo: 'СТАРТАП «КАВАДЖЕТ» · 57', logoAt: [-15, -13.85, 0],
    board: [-15, -4], pads: [[-16.6, -1.9], [-15, -1.9], [-13.4, -1.9]], route: [[-9.4, -9.2], [9.4, -9.2], [9.4, 9.2], [-9.4, 9.2]], prn: [[-9.4, -9.2]], alarm: [17.78, -3], spots: [[-9.4, -4], [9.4, -4], [9.4, 4], [-9.4, 4]],
    bodies: [[-4.6, 0], [4.6, 0], [14.8, -11], [-14.6, 10.4]], props: [[-13, -12.8], [13, 12.8], [-16.8, -12.8]],
    floors: [[-18, -14, 18, 14, '#CFC9BA'], [-12, -14, 12, 14, '#4FA3A0'], [-6.9, -7.4, 6.9, 7.4, '#E9A15B'], [-2.6, -2.5, 2.6, 2.5, '#F4E7C8'], [-18, -14, -12, 0, '#DADDE3'], [12, -14, 18, 0, '#3E3A5C'], [12, 0, 18, 14, '#F2C4A0']],
    tiles: [-18, 0, -12, 14, '#FFFFFF', '#F4D6B0'],
    rooms: [['🛗 Ліфтовий хол', -18, -14, -12, 0], ['☕ Кухня-бар', -18, 0, -12, 14], ['🎙️ Подкаст-студія', 12, -14, 18, 0], ['🫘 Пуф-лаунж', 12, 0, 18, 14], ['💻 Кабінки', -6.9, -7.4, 0, -2.5], ['💻 Кабінки', 0, 2.5, 6.9, 7.4], ['☕ Кавовий острів', -2.6, -2.5, 2.6, 2.5]],
    tip: 'кабінки-лабіринт, принтер на колесах їздить жовтою колією' },
  { n: 'Поверх 63 · Серверна', fl: 63, w: 36, d: 26, r: 24, night: true, walls: W3, furn: F3, logo: 'IT-ВІДДІЛ · 63', logoAt: [-15, -12.85, 0],
    board: [-15, -5], pads: [[-16.6, -2.6], [-15, -2.6], [-13.4, -2.6]], prn: [[-4, -8.6], [5, 8.6]], alarm: [17.78, 10.5], spots: [[-9, -7.5], [9, -7.5], [9, 7.5], [-9, 7.5]],
    bodies: [[-8, -7], [8, 7.2], [0, 0], [-15, 10]], props: [[-13, -11.8], [13, 11.8], [11, 0]],
    floors: [[-18, -13, 18, 13, '#2E3350'], [-12, -13, 12, -4.5, '#3D4A7A'], [-12, 4.5, 12, 13, '#4A3D6E'], [-18, -13, -12, 0, '#C9CDD9'], [-18, 0, -12, 13, '#5A6BB5'], [12, -13, 18, 0, '#232842'], [12, 0, 18, 13, '#4E4A6E']],
    tiles: [-12, -4.5, 12, 4.5, '#8E96B0', '#7A829C'],
    rooms: [['🛗 Ліфтовий хол', -18, -13, -12, 0], ['🧑‍💻 Хелпдеск', -18, 0, -12, 13], ['📡 NOC', 12, -13, 18, 0], ['🔋 Щитова', 12, 0, 18, 13], ['🖨️ Принт-хаб «Північ»', -12, -13, 12, -4.5], ['🗄️ Серверна', -12, -4.5, 12, 4.5], ['🖨️ Принт-хаб «Південь»', -12, 4.5, 12, 13]],
    tip: 'два принтери — працює лише один, перемикаються кожні 25 с' },
];
/* у світові координати */
const VAR = VDEF.map((def, i) => {
  const cx = VXS[i], cz = VY, P = a => ({ x: cx + a[0], z: cz + a[1] });
  const D = Object.assign({}, def, { i, cx, cz });
  D.walls = def.walls.map(w => Object.assign({}, w, { x1: cx + w.x1, x2: cx + w.x2, z1: cz + w.z1, z2: cz + w.z2, doors: (w.doors || []).map(d => d + (w.z1 === w.z2 ? cx : cz)) }));
  D.board = P(def.board); D.pads = def.pads.map(P); D.prn = def.prn.map(P); D.spots = def.spots.map(P); D.alarm = P(def.alarm);
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
const ST = { ph: 'idle', t: 0, cnt: 0, ps: [], owner: '', ev: '', evT: 0, stacks: [], piles: [], sl: null, pu: null, res: [], id: 0, v: 0, nv: 0, votes: {}, ac: 0 };
const AU = { stT: 0, evIn: 20, sid: 0, scoreT: 0, puIn: 15, proj: [], bump: {}, lastAct: 0, voteSig: '' };
const BOT_NAMES = ['Бот Кент', 'Бухгалтерка Люда', 'Стажер Вітя', 'HR Олена', 'Сисадмін Гена'];
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
  return { ph: ST.ph, t: r2(ST.t), c: r2(ST.cnt), id: ST.id, o: ST.owner, ev: ST.ev, et: r2(ST.evT), res: ST.res, v: ST.v, nv: ST.nv, vo: ST.votes, ac: r2(ST.ac),
    p: ST.ps.map(p => [p.k, p.bot ? 1 : 0, p.pages, p.col, p.bot ? r2(p.x) : 0, p.bot ? r2(p.z) : 0, p.bot ? r2(p.f) : 0, r2(p.stun || 0), p.hold ? 1 : 0, p.bur || 0, r2(p.turbo || 0), r2(p.streak || 0), r2(p.blind || 0)]),
    s: ST.stacks.map(s => [s.id, r2(s.x), r2(s.z)]), pi: ST.piles.map(s => [s.id, r2(s.x), r2(s.z)]), sl: ST.sl ? ST.sl.map(r2) : 0, pu: ST.pu ? [ST.pu.id, r2(ST.pu.x), r2(ST.pu.z)] : 0 };
}
function applySnap(d) {
  Object.assign(ST, { ph: d.ph || 'idle', t: +d.t || 0, cnt: +d.c || 0, id: d.id | 0, owner: String(d.o || ''), ev: String(d.ev || ''), evT: +d.et || 0, res: Array.isArray(d.res) ? d.res.slice(0, 8) : [],
    v: clamp(d.v | 0, 0, 2), nv: clamp(d.nv | 0, 0, 2), votes: d.vo && typeof d.vo === 'object' ? d.vo : {}, ac: +d.ac || 0 });
  if (Array.isArray(d.p)) {
    const old = new Map(ST.ps.map(p => [p.k, p]));
    ST.ps = d.p.slice(0, MAXP).map(a => {
      const p = old.get(a[0]) || { k: String(a[0]) };
      Object.assign(p, { bot: !!a[1], pages: a[2] | 0, col: a[3] | 0, stun: +a[7] || 0, hold: !!a[8], bur: a[9] | 0, turbo: +a[10] || 0, streak: +a[11] || 0, blind: +a[12] || 0 });
      if (p.bot) { p.tx = +a[4]; p.tz = +a[5]; p.f = +a[6]; if (p.x == null) { p.x = p.tx; p.z = p.tz; } } return p;
    });
  }
  const xyz = a => ({ id: a[0], x: +a[1], z: +a[2] });
  if (Array.isArray(d.s)) ST.stacks = d.s.slice(0, 16).map(xyz);
  if (Array.isArray(d.pi)) ST.piles = d.pi.slice(0, 10).map(xyz);
  ST.sl = Array.isArray(d.sl) ? d.sl.map(Number) : null;
  ST.pu = Array.isArray(d.pu) ? xyz(d.pu) : null;
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
function humansHere() {   // [{k, x, z}] людей на поверхах (для голосування)
  if (SIMSIDE) return simPlayers().filter(p => !p.dead && inArena(p.x, p.z)).map(p => ({ k: p.name, x: p.x, z: p.z }));
  return running && !pl.dead && inArena(pl.x, pl.z) ? [{ k: myKey(), x: pl.x, z: pl.z }] : [];
}
function onReq(d, from) {
  const k = keyOf(from), me = ST.ps.find(p => p.k === k), fight = ST.ph === 'fight';
  if (d.k === 'join') {
    if (me || ST.ps.filter(p => !p.bot).length >= MAXP) return;
    if (ST.ph !== 'idle' && ST.ph !== 'lobby') { emit({ k: 'msg', to: k, txt: '🖨️ Битва вже йде — дочекайся наступного раунду.' }); return; }
    ST.ps = ST.ps.filter(p => !p.bot); ST.ps.push({ k, bot: false, pages: 0, col: ST.ps.length });
    if (ST.ph === 'idle') { ST.ph = 'lobby'; ST.cnt = SIMSIDE ? 10 : 4; ST.id++; ST.res = []; }
    emit({ k: 'msg', txt: `🖨️ ${SIMSIDE ? escapeHTML(k) : 'Ти'} у битві за принтер!` }); pushState();
  } else if (d.k === 'leave') { if (me) { ST.ps = ST.ps.filter(p => p !== me); if (!ST.ps.some(p => !p.bot)) reset(); pushState(); } }
  else if (d.k === 'vote') { const v = d.v | 0; if (v >= 0 && v < 3 && (ST.ph === 'idle' || ST.ph === 'lobby')) { ST.votes[k] = v; pushState(); } }
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
}
function reset() { Object.assign(ST, { ph: 'idle', ps: [], owner: '', ev: '', evT: 0, stacks: [], piles: [], sl: null, pu: null, t: 0, cnt: 0, v: ST.nv, votes: {}, ac: 0 }); AU.proj = []; }
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
  let n = 0; while (ST.ps.length < MAXP) ST.ps.push({ k: BOT_NAMES.filter(b => !ST.ps.some(p => p.k === b))[n++ % 3], bot: true, pages: 0, col: ST.ps.length, x: 0, z: 0, f: 0, vx: 0, vz: 0, stun: 0, cd: 0 });
  ST.ps.forEach((p, i) => { Object.assign(p, { pages: 0, col: i, hold: false, bur: 0, turbo: 0, streak: 0, blind: 0 }); if (p.bot) { const c = D.spots[i % 4]; Object.assign(p, { x: c.x, z: c.z, vx: 0, vz: 0, path: null, stun: 0 }); } });
  Object.assign(ST, { ph: 'fight', t: 0, owner: '', ev: '', evT: 0, stacks: [], piles: [], sl: null, pu: null, v, ac: 0 });
  Object.assign(AU, { evIn: rand(16, 22), puIn: rand(12, 18), proj: [], bump: {}, lastAct: 0 });
  emit({ k: 'go', v, spots: ST.ps.map(p => p.k) }); pushState();
}
function endFight(why) {
  ST.ph = 'end'; ST.cnt = 8; ST.owner = ''; ST.ev = ''; ST.sl = null; ST.nv = (ST.v + 1) % 3;
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
  const pr = { id: ++AU.sid, x: q.x + Math.sin(a) * .5, z: q.z + Math.cos(a) * .5, vx: Math.sin(a) * 13, vz: Math.cos(a) * 13, d: 0, by: p.k };
  AU.proj.push(pr); emit({ k: 'toss', id: pr.id, x: r2(pr.x), z: r2(pr.z), a: r2(a), by: p.k });
}
function projTick(dt) {
  const D = VAR[ST.v], N = navOf(D);
  for (let i = AU.proj.length - 1; i >= 0; i--) {
    const pr = AU.proj[i], ox = pr.x, oz = pr.z; pr.x += pr.vx * dt; pr.z += pr.vz * dt; pr.d += 13 * dt;
    let hit = null;
    for (const p of ST.ps) { if (p.k === pr.by) continue; const q = posOf(p); if (dist2(q.x, q.z, pr.x, pr.z) < .75) { hit = p; break; } }
    const [ci, cj] = cellOf(N, pr.x, pr.z), wall = N.block[ci + cj * N.nx] && D.walls.some(w => w.z1 === w.z2 ? Math.abs(pr.z - w.z1) < .45 : Math.abs(pr.x - w.x1) < .45);
    if (hit || wall || pr.d > 10 || !inArena(pr.x, pr.z)) {
      AU.proj.splice(i, 1);
      const lx = wall ? ox : pr.x, lz = wall ? oz : pr.z;
      if (hit) {
        hit.blind = 2; hit.bur = 0;
        if (hit.hold) { hit.hold = false; const q = posOf(hit); ST.stacks.push({ id: ++AU.sid, x: r2(q.x + rand(-1, 1)), z: r2(q.z + rand(-1, 1)) }); }
        if (hit.bot) { hit.stun = Math.max(hit.stun || 0, .4); hit.vx = pr.vx * .3; hit.vz = pr.vz * .3; }
      }
      addPile(lx, lz);
      emit({ k: 'land', id: pr.id, x: r2(lx), z: r2(lz), hit: hit ? hit.k : '', by: pr.by }); pushState();
    }
  }
}
function authTick(dt) {
  // голосування: хто стоїть на кружечку поверху — той за нього голосує
  if (ST.ph === 'idle' || ST.ph === 'lobby') {
    for (const h of humansHere()) for (const D of VAR) D.pads.forEach((q, i) => { if (dist2(h.x, h.z, q.x, q.z) < .8) ST.votes[h.k] = i; });
    const sig = JSON.stringify(ST.votes); if (sig !== AU.voteSig) { AU.voteSig = sig; pushState(); }
  }
  if (ST.ph === 'idle') return;
  if (SIMSIDE) {   // хто вийшов з поверхів — вибуває
    const on = new Set(simPlayers().filter(p => inArena(p.x, p.z)).map(p => p.name));
    const gone = ST.ps.filter(p => !p.bot && !on.has(p.k)); if (gone.length) { ST.ps = ST.ps.filter(p => !gone.includes(p)); if (!ST.ps.some(p => !p.bot)) { reset(); pushState(); return; } }
  }
  if (ST.ph === 'lobby') { ST.cnt -= dt; if (ST.cnt <= 0) startFight(); }
  else if (ST.ph === 'fight') {
    ST.t += dt; ST.ac = Math.max(0, ST.ac - dt);
    const P = prnPos(), D = VAR[ST.v];
    for (const p of ST.ps) { if (p.bot) botTick(p, dt, D, P); p.turbo = Math.max(0, (p.turbo || 0) - dt); if (!p.bot) p.blind = Math.max(0, (p.blind || 0) - dt); if (p.bur && !ST.piles.some(s => s.id === p.bur)) p.bur = 0; }
    projTick(dt);
    if (ST.sl) { ST.sl[3] -= dt; if (ST.sl[3] <= 0) ST.sl = null; }
    bumps();
    // серверна: перемикання принтерів
    const ai = actIdx(ST.v); if (ai !== AU.lastAct) { AU.lastAct = ai; emit({ k: 'switch', i: ai }); }
    // картридж-турбо
    if (!ST.pu && (AU.puIn -= dt) <= 0) { const f = freeSpot(D); ST.pu = { id: ++AU.sid, x: r2(f.x), z: r2(f.z) }; emit({ k: 'pu' }); }
    // хто в зоні принтера
    const inZ = ST.ps.filter(p => { const q = posOf(p); return dist2(q.x, q.z, P.x, P.z) < ZONE && !(p.stun > .3); });
    ST.owner = inZ.length === 1 ? inZ[0].k : inZ.length > 1 ? '*' : '';
    const printing = ST.owner && ST.owner !== '*' && ST.ev !== 'jam' && ST.ev !== 'boss';
    for (const p of ST.ps) {   // комбо: довго тримаєш принтер сам — бонус кожні 8 с
      if (printing && p.k === ST.owner) { const n0 = Math.floor((p.streak || 0) / 8); p.streak = (p.streak || 0) + dt; const n1 = Math.floor(p.streak / 8); if (n1 > n0) { const b = 5 * Math.min(3, n1); p.pages += b; emit({ k: 'combo', who: p.k, n: n1, b }); } }
      else p.streak = 0;
    }
    AU.scoreT -= dt;
    if (AU.scoreT <= 0) {
      AU.scoreT = .5;
      if (ST.ev === 'boss') for (const p of inZ) p.pages = Math.max(0, p.pages - 1);   // друкуєш особисте при начальнику!
      else if (ST.ev !== 'jam' && inZ.length === 1) inZ[0].pages += (ST.t > DUR - 30 ? 2 : 1) * (inZ[0].turbo > 0 ? 2 : 1);
    }
    if (ST.ev) { ST.evT -= dt; if (ST.evT <= 0) { if (ST.ev === 'jam') emit({ k: 'msg', txt: '🖨️ Принтер сам себе розжував. Друкуємо далі!' }); ST.ev = ''; } }
    else if ((AU.evIn -= dt) <= 0) { AU.evIn = rand(18, 26); startEvent(); }
    const top = ST.ps.reduce((a, b) => b.pages > a.pages ? b : a, ST.ps[0]);
    if (top && top.pages >= GOAL) endFight(`${top.k === 'me' ? 'Ти' : escapeHTML(top.k)} надрукував ${GOAL} сторінок!`);
    else if (ST.t >= DUR) endFight();
  } else if (ST.ph === 'end') { ST.cnt -= dt; if (ST.cnt <= 0) { reset(); pushState(); } }
  AU.stT -= dt; if (AU.stT <= 0) { AU.stT = ST.ph === 'fight' ? .1 : .5; pushState(); }
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
  const slick = slimeAt(b.x, b.z); let want = null;
  if (b.stun > 0) b.stun -= dt;
  else if (b.blind > 0) { if (b.wa == null || Math.random() < dt * 2) b.wa = rand(0, 6.28); want = [Math.sin(b.wa) * 2.2, Math.cos(b.wa) * 2.2]; b.f = b.wa; }   // папери в обличчя — бреде навмання
  else {
    let tx = P.x, tz = P.z;
    const sheet = b.hold ? null : ST.stacks.reduce((a, s) => !a || dist2(b.x, b.z, s.x, s.z) < dist2(b.x, b.z, a.x, a.z) ? s : a, null);
    const pu = ST.pu && dist2(b.x, b.z, ST.pu.x, ST.pu.z) < 9 ? ST.pu : null;
    if (ST.ev === 'boss') { const c = D.spots.reduce((a, q) => dist2(b.x, b.z, q.x, q.z) < dist2(b.x, b.z, a.x, a.z) ? q : a); tx = c.x; tz = c.z; }
    else if (pu) { tx = pu.x; tz = pu.z; }
    else if (sheet && dist2(b.x, b.z, sheet.x, sheet.z) < 9) { tx = sheet.x; tz = sheet.z; }
    else {
      const a = b.col * 1.57 + .8; tx = P.x + Math.sin(a) * 1.6; tz = P.z + Math.cos(a) * 1.6;
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
  }
  if (!SIMSIDE) clientTick(dt);
});
/* тонер ковзкий для гравця (рух гри вже вміє ковзати — як по сиропу), для крісел і зомбі теж */
if (typeof onSyrup === 'function') { const _os = onSyrup; onSyrup = function (x, z) { return slimeAt(x, z) || _os.apply(this, arguments); }; }

/* ======================= ДАЛІ — ЛИШЕ В ГРАВЦЯ ======================= */
const V = { bots: new Map(), floors: [], stacks: new Map(), piles: new Map(), held: new Map(), proj: [], hud: null, goalEl: null, lbl: null, tags: new Map(), music: -1, fix: null, shoveCd: 0, paperT: 0, flying: [], bar: false, faceT: 0, slime: null, pu: null, boss: null, slipT: 0 };
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
    else if (t === 'reception') {
      put(g, mesh(new THREE.BoxGeometry(.8, 1.1, 4.8), '#4E3A7C'), X, .55, Z); put(g, mesh(new THREE.BoxGeometry(1, .08, 5), '#E8DCC8'), X, 1.12, Z);
      put(g, mesh(new THREE.BoxGeometry(.06, .3, 3), bulb('#FF6BD6'), false), X + .42, .8, Z);
    }
  }
  // логотип поверху на стіні (з текстурою — тільки динамічним)
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(5, 1), new THREE.MeshBasicMaterial({ map: canvasTex(D.logo, '#FFE066', '#2E2346', 1024, 205, D.logo.length > 18 ? 84 : 110), transparent: true, depthWrite: false }));
  sign.position.set(D.cx + D.logoAt[0], 2, D.cz + D.logoAt[1]); sign.rotation.y = D.logoAt[2]; scene.add(A.dynamic(sign));
  // табло «записатися»
  const B = D.board;
  put(g, mesh(new THREE.BoxGeometry(.12, 1.6, .12), '#4E4A6E'), B.x - .9, .8, B.z); put(g, mesh(new THREE.BoxGeometry(.12, 1.6, .12), '#4E4A6E'), B.x + .9, .8, B.z);
  put(g, mesh(new THREE.BoxGeometry(2.1, 1, .1), '#2E2346'), B.x, 1.9, B.z);
  put(g, mesh(new THREE.BoxGeometry(1.9, .8, .02), bulb('#7FE08A'), false), B.x, 1.9, B.z + .06);
  // кружечки для голосування за поверх
  D.v = { pads: [], rings: [], prns: [] };
  D.pads.forEach((q, i) => {
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(.7, .7, .05, 24), new THREE.MeshBasicMaterial({ color: ['#6BB8FF', '#4FA3A0', '#7E6FB8'][i] })); disc.position.set(q.x, .04, q.z); scene.add(A.dynamic(disc));
    const num = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: canvasTex(String(VAR[i].fl), '#FFFFFF', 'rgba(0,0,0,0)', 256, 256, 150), transparent: true, depthWrite: false }));
    num.rotation.x = -Math.PI / 2; num.position.set(q.x, .08, q.z); scene.add(A.dynamic(num)); D.v.pads.push(disc);
  });
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
  V.floors[D.i] = D;
  return g;
}
function botMesh(p) {
  let v = V.bots.get(p.k); if (v) return v;
  const h = buildOffice(pick(['#AFC4B6', '#C9D6CF', '#D9C7A9']), COL[p.col % 4]); scene.add(h.root);
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
      const i = Math.max(0, (e.spots || []).indexOf(myKey())), s = D.spots[i % 4];
      pl.x = s.x; pl.z = s.z; pl.y = 0; pl.safe = { x: s.x, z: s.z }; pl.kx = pl.kz = 0; camPos.set(pl.x, 20, pl.z + 15); camLook.set(pl.x, .5, pl.z);
    }
    if (inArena(pl.x, pl.z)) { banner(`🖨️ БИТВА ЗА ПРИНТЕР! ${D.n}`); toast(`🛗 ${D.n}: ${D.tip}. Стій біля принтера сам — друкуй!`); sfx('level'); }
  }
  else if (e.k === 'shove') {
    if (e.to === myKey() && amIn() && !pl.dead) {
      const m = meP(), bur = m && m.bur, f = (+e.f || 14) * (bur ? .3 : 1);
      knockMe(+e.a || 0, f, e.slip ? 'Бац! Тонер ковзкий!' : bur ? '📄 Купа паперу тримає!' : `${e.by && e.by !== 'me' ? escapeHTML(e.by) : 'Хтось'}: «Моя черга!»`); sfx('hurt'); shake = Math.max(shake, .25);
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
  else if (e.k === 'toss') { if (here) { const m = stackMesh(); m.position.set(+e.x, 1.4, +e.z); scene.add(m); V.proj.push({ id: e.id, m, vx: Math.sin(+e.a) * 13, vz: Math.cos(+e.a) * 13, t: 0 }); sfx('swing', +e.x, +e.z); } }
  else if (e.k === 'land') {
    const i = V.proj.findIndex(p => p.id === e.id); if (i >= 0) { scene.remove(V.proj[i].m); V.proj.splice(i, 1); }
    if (!here) return;
    burst(+e.x, 1, +e.z, '#FFFFFF', 14, 4, .6, 2.5);
    if (e.hit === myKey()) { faceOverlay(); if (pl.carry && typeof releaseCarry === 'function') releaseCarry(false); V.fix = null; ftext(pl.x, 2.6, pl.z, '📄 Папери в обличчя!', 'bad'); sfx('hurt'); }
    else if (e.hit) { const p = ST.ps.find(q => q.k === e.hit); if (p) { const q = posOf(p); ftext(q.x, 2.6, q.z, pick(['📄 Пфф!', 'Мої очі!', 'Хто кинув звіт?!']), 'crit'); } if (e.by === myKey()) { toast('🎯 Влучив пачкою в обличчя!'); sfx('crit'); } }
  }
  else if (e.k === 'bury') { if (here && e.who === myKey()) { ftext(pl.x, 2.4, pl.z, '🫣 Зарився в папери — штовхати важче', 'calm'); sfx('dig'); } }
  else if (e.k === 'turbo') { if (here) { toast(`⚡ ${nameOf(e.who)} вставив картридж-турбо — друкує ×2 10 с!`); if (e.who === myKey()) sfx('legend'); } }
  else if (e.k === 'pu') { if (here) toast('⚡ На поверсі з\'явився <b>картридж-турбо</b> — хапай!'); }
  else if (e.k === 'combo') { if (here) { const p = ST.ps.find(q => q.k === e.who), q = p && posOf(p); if (q) ftext(q.x, 2.8, q.z, `🔥 КОМБО ×${e.n}! +${e.b}`, 'gold'); if (e.who === myKey()) sfx('ding'); } }
  else if (e.k === 'switch') { if (here) { banner(`🔀 Перемкнуло! Тепер працює ${e.i ? 'південний' : 'північний'} принтер!`); sfx('warn'); } }
  else if (e.k === 'end') finishMe(e);
}
function finishMe(e) {
  if (!running || !inArena(pl.x, pl.z)) return;
  const res = e.res || [], place = res.findIndex(r => r[0] === myKey()) + 1;
  if (!place) return;
  const coins = [0, 110, 60, 35, 20][place] || 10, xp = [0, 140, 90, 60, 40][place] || 30;
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
if (!SIMSIDE) addEventListener('pointerdown', e => { if (typeof cv !== 'undefined' && e.target === cv && e.button === 0 && amIn()) shove(); }, true);
// клавіші: не затираємо чужі обробники — якщо не наш випадок, віддаємо попередньому
function chainKey(code, fn) { const prev = ADDONS.keys[code]; A.key(code, () => { if (fn() !== false) return; return prev ? withAddon(prev[0], () => addonRun(prev[0], prev[1])) : false; }); }
chainKey('KeyR', () => { if (!amIn() || !running || !inArena(pl.x, pl.z)) return false; shove(); });
chainKey('KeyQ', () => { const m = meP(); if (!m || !m.hold || pl.carry || ST.ph !== 'fight' || !inArena(pl.x, pl.z)) return false; throwStack(); });
function setBar(on) {
  if (on === V.bar || typeof modeBar !== 'function') return; V.bar = on;
  modeBar(on ? { slots: [
    { id: 'throw', ic: '📄', n: 'Кинути пачку', count: () => { const m = meP(); return m && m.hold ? 1 : 0; }, use: throwStack },
    { id: 'bury', ic: '🫣', n: 'Заритися', count: () => { const m = meP(); return m && (m.bur || nearPile()) ? 1 : 0; }, use: toggleBury },
    { id: 'shove', ic: '👊', n: 'Штовхнути', use: shove },
  ] } : null);
}

/* ---------- Кожен кадр ---------- */
function clientTick(dt) {
  const t = gameTime, vh = running ? varAt(pl.x, pl.z) : -1, here = vh >= 0, D = VAR[ST.v], m = meP();
  V.shoveCd -= dt;
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
      ring.material.color.set(!active ? (warn && Math.sin(t * 10) > 0 ? '#FFE066' : '#3E3A5C') : !cur ? '#FFFFFF' : ST.ev === 'boss' ? '#FF5C7A' : ST.ev === 'jam' ? '#8E86B0' : ST.owner === '*' ? (Math.sin(t * 12) > 0 ? '#FF5C7A' : '#FFFFFF') : o ? COL[o.col % 4] : '#FFFFFF');
      ring.material.opacity = active ? .9 : .5; ring.scale.setScalar(1 + (active && o && cur ? Math.sin(t * 6) * .03 : 0));
      pm.userData.led.material.color.set(!active ? '#FF5C7A' : cur && ST.ev === 'jam' ? (Math.sin(t * 10) > 0 ? '#FF5C7A' : '#2E2346') : cur && o ? '#7FE08A' : '#FFE066');
    });
    if (F.v.alarm) F.v.alarm.material.color.set(cur && ST.ac > 0 ? '#7A3A4A' : (Math.sin(t * 3) > 0 ? '#FF2E4D' : '#C41E3A'));
    F.v.pads.forEach((pd, i) => pd.scale.setScalar(m || ST.ph === 'idle' || ST.ph === 'lobby' ? 1 + (ST.votes[myKey()] === i ? Math.sin(t * 6) * .08 + .08 : 0) : 1));
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
  for (let i = V.proj.length - 1; i >= 0; i--) { const f = V.proj[i]; f.t += dt; f.m.position.x += f.vx * dt; f.m.position.z += f.vz * dt; f.m.rotation.y += dt * 12; if (f.t > 1.2) { scene.remove(f.m); V.proj.splice(i, 1); } }
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
  hud(here); labels(vh); intro();
}
const o_printing = () => ST.ph === 'fight' && ST.owner && ST.owner !== '*' && ST.ev !== 'jam' && ST.ev !== 'boss';
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

/* ---------- F: записатися, голосувати, тривога, лагодити, заритися ---------- */
const _getInteract = getInteract;
getInteract = function () {
  if (!SIMSIDE && running && !pl.dead && inArena(pl.x, pl.z) && !pl.carry) {
    const vh = varAt(pl.x, pl.z), Dh = VAR[vh], m = meP(), fight = ST.ph === 'fight';
    if (dist2(pl.x, pl.z, Dh.board.x, Dh.board.z) < 2.4) {
      if (m) return { l: ST.ph === 'lobby' ? `🖨️ Ти в грі — старт за ${Math.ceil(ST.cnt)} с (стань на поверх, за який голосуєш)` : '🖨️ Ти в грі', fn: () => { } };
      if (ST.ph === 'idle' || ST.ph === 'lobby') return { l: `🖨️ Записатися на битву (${ST.ps.filter(p => !p.bot).length}/${MAXP})`, fn: () => { req('join'); sfx('ding'); } };
      return { l: '🖨️ Битва йде — чекай наступного раунду', fn: () => { } };
    }
    if (!fight) { const i = Dh.pads.findIndex(q => dist2(pl.x, pl.z, q.x, q.z) < 1); if (i >= 0) return { l: `🗳️ Голосую за ${VAR[i].n}`, fn: () => { req('vote', { v: i }); sfx('ding'); } }; }
    if (m && fight && vh === ST.v) {
      const P = prnPos();
      if (ST.ev === 'jam' && dist2(pl.x, pl.z, P.x, P.z) < ZONE + .4) return V.fix ? { l: `🔧 Лагоджу… ${Math.round(V.fix.t / 2 * 100)}%`, fn: () => { } } : { l: '🔧 Витягти зажований папір (2 с, +10 сторінок)', fn: () => { V.fix = { t: 0 }; sfx('dig'); } };
      if (dist2(pl.x, pl.z, Dh.alarm.x, Dh.alarm.z) < 2.2) return { l: ST.ac > 0 ? `🚨 Кнопка тривоги (${Math.ceil(ST.ac)} с)` : '🚨 Натиснути кнопку тривоги — викликати начальника!', fn: () => { req('alarm'); sfx('warn'); } };
      if (m.bur) return { l: '🫣 Вилізти з паперів', fn: toggleBury };
      if (nearPile()) return { l: '🫣 Заритися в купу паперу (штовхати важче)', fn: toggleBury };
    }
  }
  return _getInteract.apply(this, arguments);
};

/* ---------- HUD, підказки, підписи ---------- */
function goal() {   // { txt, tg } — що робити зараз і куди йти
  const m = meP(), vh = varAt(pl.x, pl.z), Dh = VAR[Math.max(0, vh)], D = VAR[ST.v], P = prnPos();
  if (!m) return ST.ph === 'fight' ? { txt: `Битва йде на поверсі ${D.fl} — дивись і чекай наступного раунду.` } : { txt: 'Стань на кружечок <b>42 / 57 / 63</b> — голос за поверх, потім <b>F</b> біля <b>зеленого табло</b> — записатися.', tg: Dh.board };
  if (ST.ph === 'lobby') return { txt: `Ти в грі! Старт за <b>${Math.ceil(ST.cnt)} с</b>. Стань на кружечок поверху, за який голосуєш.` };
  if (ST.ph !== 'fight') return { txt: 'Раунд скінчився.' };
  if (vh !== ST.v) return { txt: `Битва на поверсі ${D.fl}!` };
  if (ST.ev === 'boss') return { txt: '👔 <b>Начальник!</b> Відійди від принтера — хто там стоїть, втрачає сторінки!' };
  if (ST.ev === 'jam') return { txt: '🖨️ Зажувало! Біжи до принтера й тримай <b>F</b> 2 с — +10 сторінок.', tg: P };
  if (m.hold) return { txt: '📄 Пачка в руках — <b>1</b> / <b>Q</b>: жбурни в обличчя тому, хто друкує!', tg: (() => { const p = ST.ps.find(q => q.k === ST.owner && q.k !== myKey()); return p ? posOf(p) : null; })() };
  if (ST.pu) return { txt: '⚡ <b>Картридж-турбо</b> на підлозі — хапай: друк ×2 на 10 с!', tg: ST.pu };
  if (ST.stacks.length) { const s = ST.stacks.reduce((a, b) => dist2(pl.x, pl.z, b.x, b.z) < dist2(pl.x, pl.z, a.x, a.z) ? b : a); return { txt: '📄 Пачки паперу на підлозі — збирай (+4) і жбурляй у суперників!', tg: s }; }
  if (slimeAt(pl.x, pl.z)) return { txt: '🖤 <b>Тонерна ковзанка!</b> Не загальмуєш — розганяйся заздалегідь і таранить суперників.', tg: P };
  if (ST.owner === myKey()) return { txt: m.bur ? '🫣 Друкуєш, заритий у папери — штовхнути тебе важко!' : `🖨️ Друкуєш!${m.streak > 3 ? ` 🔥 Тримай — комбо за ${Math.ceil(8 - m.streak % 8)} с` : ''} Не підпускай нікого — <b>ЛКМ</b> штовхнути.` };
  if (ST.owner === '*') return { txt: '⚔️ Біля принтера тиснява — виштовхни всіх (<b>ЛКМ</b>, кидай крісла <b>Q</b>)!', tg: P };
  if (ST.owner) return { txt: `🖨️ Друкує ${nameOf(ST.owner)} — біжи й виштовхни (<b>ЛКМ</b>) або 🚨 натисни тривогу!`, tg: P };
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
    const left = Math.max(0, DUR - ST.t), rows = ST.ps.slice().sort((a, b) => b.pages - a.pages).map(p => `<span style="color:${COL[p.col % 4]}">${p.k === ST.owner ? '🖨️' : '●'} ${nameOf(p.k)} ${p.pages}${p.turbo > 0 ? '⚡' : ''}${p.streak >= 8 ? '🔥' : ''}${p.bur ? '🫣' : ''}${p.hold ? '📄' : ''}</span>`).join(' · ');
    const sw = VAR[ST.v].prn.length > 1 && ST.ph === 'fight' ? ` · 🔀 ${Math.ceil(SWITCH - ST.t % SWITCH)} с` : '';
    const st = m && ST.ph === 'fight' ? [m.turbo > 0 ? `⚡ турбо ${Math.ceil(m.turbo)} с` : '', m.streak >= 8 ? `🔥 комбо ×${Math.floor(m.streak / 8)}` : '', slimeAt(pl.x, pl.z) ? '🖤 ковзко!' : ''].filter(Boolean).join(' · ') : '';
    h = `🖨️ ${VAR[ST.v].n} · ${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')} · до ${GOAL} 📄${ST.t > DUR - 30 && ST.ph === 'fight' ? ' · <span style="color:#FFE066">×2!</span>' : ''}${sw}<br><span style="font-size:12px">${rows}</span>${st ? `<br><span style="font-size:12px;color:#FFE066">${st}</span>` : ''}`;
  } else {
    const cnt = [0, 0, 0]; for (const k in ST.votes) cnt[ST.votes[k]]++;
    h = `🖨️ Битва за принтер · ${VAR[vh].n}<br><span style="font-weight:600;font-size:12px">${ST.ph === 'lobby' ? `гравців ${ST.ps.length}/${MAXP} · старт за ${Math.ceil(ST.cnt)} с` : 'F біля табло — записатися'} · 🗳️ ${VAR.map((D, i) => `${D.fl}: ${cnt[i]}`).join(' · ')}</span>`;
  }
  if (V.hud.innerHTML !== h) V.hud.innerHTML = h;
  const g = goal(); V.goal = g; const gt = '👉 ' + g.txt; if (V.goalEl.innerHTML !== gt) V.goalEl.innerHTML = gt;
}
function labels(vh) {
  if (!V.lbl) {
    V.lbl = document.createElement('div'); V.lbl.style.cssText = 'position:fixed;inset:0;z-index:2;pointer-events:none'; document.body.appendChild(V.lbl);
    const pill = (bg, fg, font) => { const e = document.createElement('div'); e.style.cssText = `position:absolute;left:0;top:0;padding:4px 10px;border-radius:10px;background:${bg};color:${fg};font:${font || '800 13px system-ui,sans-serif'};white-space:nowrap`; V.lbl.appendChild(e); return e; };
    V.boardLbl = pill('#FFE066', '#2E2346'); V.boardLbl.textContent = '📋 Записатися на битву (F)';
    V.prnLbl = pill('rgba(46,35,70,.85)', '#fff'); V.prn2Lbl = pill('rgba(46,35,70,.6)', '#FF8FA3', '700 11px system-ui,sans-serif');
    V.alarmLbl = pill('rgba(196,30,58,.85)', '#fff', '700 11px system-ui,sans-serif');
    V.puLbl = pill('#FF6BD6', '#fff', '800 12px system-ui,sans-serif'); V.puLbl.textContent = '⚡ Картридж-турбо';
    V.padLbl = [0, 1, 2].map(() => pill('rgba(255,255,255,.85)', '#2E2346', '700 11px system-ui,sans-serif'));
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
  if (V.roomV !== vh) { V.roomV = vh; V.roomLbl.forEach(o => o.e.remove()); V.roomLbl = Dh.rooms.map(r => { const e = document.createElement('div'); e.style.cssText = 'position:absolute;left:0;top:0;padding:3px 9px;border-radius:10px;background:rgba(255,255,255,.75);color:#4E3A7C;font:700 11px system-ui,sans-serif;white-space:nowrap'; e.textContent = r[0]; V.lbl.insertBefore(e, V.lbl.firstChild); return { r, e }; }); }
  for (const { r, e } of V.roomLbl) at(e, Dh.cx + (r[1] + r[3]) / 2, 1.6, Dh.cz + (r[2] + r[4]) / 2);
  V.boardLbl.style.visibility = amIn() ? 'hidden' : ''; at(V.boardLbl, Dh.board.x, 2.8, Dh.board.z);
  const voting = ST.ph === 'idle' || ST.ph === 'lobby', cnt = [0, 0, 0]; for (const k in ST.votes) cnt[ST.votes[k]]++;
  V.padLbl.forEach((e, i) => { e.style.visibility = voting ? '' : 'hidden'; const t = `🗳️ ${VAR[i].fl} · ${VAR[i].n.split('· ')[1]}${cnt[i] ? ` (${cnt[i]})` : ''}${ST.votes[myKey()] === i ? ' ✔' : ''}`; if (e.textContent !== t) e.textContent = t; at(e, Dh.pads[i].x, .9 + (i % 2) * .5, Dh.pads[i].z); });
  const cur = vh === ST.v && ST.ph === 'fight', P = cur ? prnPos() : prnPos(vh);
  const pt = !cur ? '🖨️ ПРИНТЕР' : ST.ev === 'jam' ? '🖨️ ЗАЖУВАЛО — лагодь (F)' : ST.ev === 'boss' ? '👔 НЕ ПІДХОДЬ!' : ST.owner === '*' ? '⚔️ Тиснява!' : ST.owner ? `🖨️ Друкує: ${nameOf(ST.owner)}` : '🖨️ ПРИНТЕР — стань у коло сам';
  if (V.prnLbl.textContent !== pt) V.prnLbl.textContent = pt; at(V.prnLbl, P.x, 2.4, P.z);
  V.prn2Lbl.style.visibility = Dh.prn.length > 1 ? '' : 'hidden';
  if (Dh.prn.length > 1) { const off = Dh.prn[1 - actIdx(vh)], left = SWITCH - fightT(vh) % SWITCH, t2 = cur && left < 4 ? `⚠️ Вмикається за ${Math.ceil(left)} с!` : '💤 Вимкнений'; if (V.prn2Lbl.textContent !== t2) V.prn2Lbl.textContent = t2; at(V.prn2Lbl, off.x, 2.2, off.z); }
  const at2 = ST.ac > 0 && cur ? `🚨 Тривога (${Math.ceil(ST.ac)} с)` : '🚨 Кнопка тривоги (F)'; if (V.alarmLbl.textContent !== at2) V.alarmLbl.textContent = at2; at(V.alarmLbl, Dh.alarm.x - .3, 2.1, Dh.alarm.z);
  V.puLbl.style.visibility = ST.pu && cur ? '' : 'hidden'; if (ST.pu) at(V.puLbl, ST.pu.x, 1.5, ST.pu.z);
  for (const p of ST.ps) {
    if (!p.bot || ST.ph === 'idle' || ST.ph === 'lobby') continue;
    let el = V.tags.get(p.k); if (!el) { el = document.createElement('div'); el.style.cssText = `position:absolute;left:0;top:0;padding:2px 7px;border-radius:8px;background:rgba(46,35,70,.8);color:${COL[p.col % 4]};font:700 11px system-ui,sans-serif;white-space:nowrap`; V.lbl.appendChild(el); V.tags.set(p.k, el); }
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
  const d = A.data(); if ((d.intro2 && !force) || SIMSIDE || document.getElementById('pw-intro')) return;
  const el = document.createElement('div'); el.id = 'pw-intro';
  el.style.cssText = 'position:fixed;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;background:rgba(20,12,40,.55);padding:16px';
  el.innerHTML = `<div style="max-width:470px;width:100%;max-height:90vh;overflow:auto;background:#2E2346;color:#fff;border-radius:18px;padding:18px 20px;font:14px/1.5 system-ui,sans-serif;box-shadow:0 12px 40px rgba(0,0,0,.4)">
    <div style="font:800 20px system-ui;margin-bottom:8px">🖨️ Битва за принтер — як грати</div>
    <div>1. <b>🗳️ Поверх</b>: стань на кружечок <b>42 / 57 / 63</b> біля табло, потім <b>F</b> біля табло — записатися.</div>
    <div>2. <b>🖨️ Друкуй</b>: стій у колі біля принтера <b>сам</b>. Двоє — тиснява. <b>ЛКМ / R / 3</b> — штовхнути.</div>
    <div>3. <b>🖤 Тонерна ковзанка</b>: після вибуху тонера підлога чорна й слизька — не загальмуєш, усі врізаються.</div>
    <div>4. <b>📄 Пачки паперу</b> після «дощу»: підбери (+4) і жбурни (<b>1 / Q</b>) в обличчя — суперник осліпне й впустить усе.</div>
    <div>5. <b>🫣 Купи паперу</b>: <b>F / 2</b> — заритися (штовхати тебе втричі важче, боти не помічають).</div>
    <div>6. <b>⚡ Картридж-турбо</b> — друк ×2 на 10 с. <b>🚨 Кнопка тривоги</b> на стіні — викликає начальника на того, хто друкує. <b>🔥 Комбо</b>: кожні 8 с безперервного друку — бонус.</div>
    <div style="margin-top:6px;color:#BFE6FF">Поверх 57 — принтер на колесах їде колією. Поверх 63 — два принтери, працює лише зелений, перемикання кожні 25 с.</div>
    <div style="margin-top:8px;color:#FFE066">Жовта стрілка під ногами показує, куди бігти. Підказка — внизу екрана 👇</div>
    <button class="btn" style="margin-top:12px;width:100%">Зрозуміло, до принтера!</button></div>`;
  document.body.appendChild(el);
  el.querySelector('button').addEventListener('click', () => { el.remove(); d.intro2 = 1; save(); });
}

/* ---------- Музика: офісний фанк-баттл; начальник — тривога; серверна — темніше ---------- */
const PPROG = [[45, [64, 67, 72, 76]], [41, [64, 69, 72, 77]], [43, [62, 67, 71, 74]], [40, [62, 67, 71, 76]]];
const PPROG3 = [[38, [62, 65, 69, 72]], [34, [62, 65, 70, 74]], [36, [60, 64, 67, 71]], [33, [60, 64, 69, 72]]];
if (!SIMSIDE && typeof scheduleStep === 'function') {
  const _ss = scheduleStep;
  scheduleStep = function (i, t) {
    if (!running || !inArena(pl.x, pl.z) || typeof LAYER === 'undefined' || !LAYER.drums) { if (V.music >= 0) { V.music = -1; barMode = ''; } return _ss.apply(this, arguments); }
    const s = i % 16, bar = Math.floor(i / 16), lvl = ST.ph !== 'fight' ? 0 : ST.ev === 'boss' || ST.ev === 'toner' || ST.sl ? 2 : 1;
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
  setTimeout(() => { const x = D.board.x, z = D.board.z - 1.4; pl.x = x; pl.z = z; pl.y = 0; pl.falling = false; pl.jump = null; pl.safe = { x, z }; camPos.set(pl.x, 20, pl.z + 15); camLook.set(pl.x, .5, pl.z); if (f) f.style.opacity = 0; toast(`🛗 ${D.n}. Стань на кружечок — голос за поверх, F біля табло — записатися.`); }, 260);
  return true;
}
function leavePrinter() { if (amIn()) req('leave'); V.fix = null; setBar(false); return true; }
if (A.mode) A.mode({ id: 'printerwar', group: 'pvp', ic: '🖨️', n: 'Битва за принтер', sub: '3 поверхи хмарочоса · штовханина · до 4 + боти', go: () => goPrinter(), here: () => running && inArena(pl.x, pl.z), leave: leavePrinter });
A.tab('printerwar', '🖨️ Принтер', () => {
  const d = A.data(), here = inArena(pl.x, pl.z), voting = ST.ph === 'idle' || ST.ph === 'lobby';
  return `<h3>🖨️ Битва за принтер</h3>
    <p style="font-size:13px;line-height:1.5;margin:4px 0 10px">Один принтер на весь поверх. Звіт треба всім. Хто першим надрукує ${GOAL} сторінок (або найбільше за 2,5 хв) — той і молодець.</p>
    <div class="btns"><button class="btn alt" data-pw="help">❓ Як грати</button>${here ? (amIn() || ST.ph === 'fight' ? '' : '<button class="btn" data-pw="join">🖨️ Записатися</button>') : '<button class="btn" data-pw="go">🛗 На поверх</button>'}</div>
    <div class="btns" style="margin-top:8px">${VAR.map((D, i) => here && voting ? `<button class="btn${ST.votes[myKey()] === i ? '' : ' alt'}" data-pw="v${i}">🗳️ ${D.n}</button>` : !here ? `<button class="btn alt" data-pw="g${i}">🛗 ${D.n}</button>` : '').join('')}</div>
    <div class="list" style="margin-top:10px;font-size:13px;line-height:1.55">
      <div>🏢 <b>42 · Копі-центр</b> — скляна копі-кімната, коридор-кільце. <b>57 · Лабіринт</b> — кабінки, принтер на колесах їде колією. <b>63 · Серверна</b> — два принтери, працює один, перемикання кожні 25 с.</div>
      <div>🖨️ Стій у колі біля принтера <b>сам</b> — +1 сторінка кожні пів секунди (останні 30 с — ×2). Двоє в колі — ніхто не друкує.</div>
      <div>👊 <b>ЛКМ</b> / R / 3 — штовхнути. Крісла й коробки: F — підняти, Q — жбурнути.</div>
      <div>🖤 <b>Тонерна ковзанка</b>: вибух тонера заливає підлогу — ковзаєш, не гальмуєш, усі врізаються.</div>
      <div>📄 <b>Пачки паперу</b>: підбери (+4), жбурни (1 / Q) в обличчя — суперник осліпне на 2 с і впустить усе. 🫣 У купу паперу можна заритися (F / 2) — штовхати втричі важче.</div>
      <div>⚡ Картридж-турбо — друк ×2 10 с. 🚨 Кнопка тривоги — кличе начальника (хто біля принтера — мінус сторінки). 🔥 Комбо — кожні 8 с безперервного друку бонус.</div>
      <div>🏆 1 місце — 110 🪙, 2 — 60, 3 — 35, 4 — 20.</div>
    </div>
    <p class="muted" style="font-size:12px;margin-top:10px">Битв: ${d.games || 0} · перемог: ${d.wins || 0} · рекорд: ${d.best || 0} 📄</p>`;
}, e => {
  const b = e.target.closest('[data-pw]'); if (!b) return; const a = b.dataset.pw;
  if (a === 'go') goPrinter(); else if (a === 'help') { closePanel(); intro(true); }
  else if (a[0] === 'g') goPrinter(+a[1]);
  else if (a[0] === 'v') { req('vote', { v: +a[1] }); renderPanel(); }
  else { req('join'); closePanel(); }
});
if (window.__ADDON_TEST) window.__printer = { ST, AU, V, VAR, get BOARD() { return VAR[lobbyV()].board; }, get PX() { return prnPos().x; }, get PZ() { return prnPos().z; }, ZONE, GOAL, DUR, SWITCH, shove, startEvent, posOf, prnPos, slimeAt, throwStack, toggleBury, req, varAt, navOf, reachable, goPrinter, actIdx, routeAt };
