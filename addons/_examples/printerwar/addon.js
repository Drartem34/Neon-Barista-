/* Аддон «Битва за принтер» (PVP, «цар гори», до 4 + боти).
   В офісі один принтер на всіх, а звіт потрібен кожному. Хто стоїть біля принтера САМ — той друкує сторінки.
   - Записатися — F біля табло. Порожні місця займають боти-офісники.
   - Стій у зоні принтера сам: +сторінки. Двоє й більше — «ділимо принтер», ніхто не друкує.
   - ЛКМ — штовхнути (гравців і ботів), крісла й коробки можна жбурляти (F підняти, Q кинути).
   - Події: принтер зажувало (лагодь — F, бонус), вибух тонера, дощ зі сторінок, «Начальник іде!» (тікай від принтера).
   - 2,5 хвилини або 100 сторінок. У спільному світі все рахує сервер.
   Картинку для меню поклади поруч: addons/printerwar/printerwar-bg.jpg (або menu/printerwar-bg.jpg). */
const A = Addon.info({ name: 'Битва за принтер', version: '1.0', desc: 'PVP «цар гори»: один принтер на всіх, штовханина, події, боти-офісники.' });

const SIMSIDE = !!window.__SIM;
const AUTH = () => SIMSIDE || !(typeof WORLD !== 'undefined' && WORLD.on);
const PX = 60, PZ = -110, ISL_R = 22, ZONE = 2.6, GOAL = 100, DUR = 150, MAXP = 4;
const BOARD = { x: PX - 11, z: PZ + 2.5 };                        // табло в рецепції
const inArena = (x, z) => Math.abs(x - PX) < 19 && Math.abs(z - PZ) < 15;
const COL = ['#FF6BD6', '#6BE7FF', '#FFE066', '#7FE08A'];

A.island({ id: 'printerwar', n: 'Битва за принтер', sub: 'PVP · стій біля принтера сам — друкуй звіт', x: PX, z: PZ, r: ISL_R, top: '#CFC6E6', rock: '#8C84C6', biome: 'printroom', tier: 1, safe: true });
const _buildIsland = buildIsland;
buildIsland = function (s) { if (s.biome !== 'printroom') return _buildIsland.apply(this, arguments); return SIMSIDE ? new THREE.Group() : buildRoom(); };

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
        put(o, mesh(new THREE.BoxGeometry(.1, .03, .14), '#4E4A6E', false), .38, .8, .1);
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
      for (let k = 0; k < Math.round(len / .8); k++) put(o, mesh(new THREE.BoxGeometry(.65, .12, .6), '#FFFFFF', false), -len / 2 + .5 + k * .75, .47, .05).material = mat(col === '#8F7BD6' ? '#B7A6EA' : '#F2E6D8');
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
    // підлога кімнати
    floor(x0, z0, x1, z1, col, y = .012) { const m = mesh(new THREE.BoxGeometry(x1 - x0, .02, z1 - z0), col, false, true); m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); g.add(m); return m; },
    tiles(x0, z0, x1, z1, a, b) { K.floor(x0, z0, x1, z1, a); for (let x = x0; x < x1 - .01; x += 1) for (let z = z0; z < z1 - .01; z += 1) if ((Math.floor(x - x0) + Math.floor(z - z0)) % 2) K.floor(x, z, Math.min(x1, x + 1), Math.min(z1, z + 1), b, .018); },
  };
  return K;
}
/* стіни: відрізки вздовж осей з дверними прорізами; glass — скляна перегородка */
function wallMeshes(g, W, H = 1.15) {
  for (const w of W) for (const [a, b] of wallParts(w)) {
    const horiz = w.z1 === w.z2, len = b - a; if (len < .05) continue;
    const mx = horiz ? (a + b) / 2 : w.x1, mz = horiz ? w.z1 : (a + b) / 2;
    const m = mesh(new THREE.BoxGeometry(horiz ? len : .2, w.glass ? H + .4 : H, horiz ? .2 : len), w.glass ? mat('#BFE6FF', { transparent: true, opacity: .35 }) : (w.col || '#ECE6FB'), !w.glass);
    m.position.set(mx, (w.glass ? H + .4 : H) / 2, mz); g.add(m);
    const t = mesh(new THREE.BoxGeometry(horiz ? len : .26, .08, horiz ? .26 : len), w.glass ? '#8E86B0' : '#9F8BE0', false); t.position.set(mx, w.glass ? H + .44 : H + .04, mz); g.add(t);
  }
  for (const w of W) for (const d of w.doors || []) { const horiz = w.z1 === w.z2; for (const s of [-1, 1]) { const px = horiz ? d + s * .95 : w.x1, pz = horiz ? w.z1 : d + s * .95; put(g, mesh(new THREE.BoxGeometry(.24, H + .5, .24), '#9F8BE0', false), px, (H + .5) / 2, pz); } }
}
function wallParts(w) {   // проміжки стіни між дверима
  const horiz = w.z1 === w.z2, lo = Math.min(horiz ? w.x1 : w.z1, horiz ? w.x2 : w.z2), hi = Math.max(horiz ? w.x1 : w.z1, horiz ? w.x2 : w.z2);
  const ds = (w.doors || []).slice().sort((a, b) => a - b), out = []; let a = lo;
  for (const d of ds) { out.push([a, d - .9]); a = d + .9; } out.push([a, hi]); return out;
}
function wallStatics(W) {
  for (const w of W) for (const [a, b] of wallParts(w)) { const horiz = w.z1 === w.z2; for (let t = a; t <= b + .01; t += .55) addStatic(horiz ? t : w.x1, horiz ? w.z1 : t, .3, 1.2); }
}

/* ---------- План офісу: стіни з дверима (локальні координати від центру), кімнати й меблі ---------- */
// Будівля 34×26: у центрі скляна копі-кімната з принтером, навколо коридор-кільце, по периметру кімнати.
const L = (x, z) => ({ x: PX + x, z: PZ + z });
const WALLS = [
  { x1: -17, z1: -13, x2: 17, z2: -13, col: '#D9D2EE' }, { x1: -17, z1: 13, x2: 17, z2: 13, col: '#D9D2EE' }, { x1: -17, z1: -13, x2: -17, z2: 13, col: '#D9D2EE' }, { x1: 17, z1: -13, x2: 17, z2: 13, col: '#D9D2EE' },
  { x1: -4.5, z1: -3.5, x2: -4.5, z2: 3.5, doors: [0], glass: 1 }, { x1: 4.5, z1: -3.5, x2: 4.5, z2: 3.5, doors: [0], glass: 1 },
  { x1: -4.5, z1: -3.5, x2: 4.5, z2: -3.5, doors: [0], glass: 1 }, { x1: -4.5, z1: 3.5, x2: 4.5, z2: 3.5, doors: [0], glass: 1 },
  { x1: -17, z1: -7, x2: 17, z2: -7, doors: [-12, -4, 4, 10] }, { x1: -17, z1: 7, x2: 17, z2: 7, doors: [-12, -6.5, 0, 6.5, 10] },
  { x1: -8, z1: -7, x2: -8, z2: 7, doors: [0] }, { x1: 8, z1: -7, x2: 8, z2: 7, doors: [0] },
  { x1: 0, z1: -13, x2: 0, z2: -7, doors: [-10], glass: 1 }, { x1: -5, z1: 7, x2: -5, z2: 13, doors: [10] }, { x1: 5, z1: 7, x2: 5, z2: 13, doors: [10], glass: 1 },
].map(w => Object.assign({}, w, { x1: PX + w.x1, x2: PX + w.x2, z1: PZ + w.z1, z2: PZ + w.z2, doors: (w.doors || []).map(d => d + (w.z1 === w.z2 ? PX : PZ)) }));
const ROOMS = [
  { n: '🖨️ Копі-центр', x0: -4.5, z0: -3.5, x1: 4.5, z1: 3.5 }, { n: '💻 Опенспейс А', x0: -17, z0: -13, x1: 0, z1: -7 }, { n: '📊 Переговорна', x0: 0, z0: -13, x1: 17, z1: -7 },
  { n: '🛎️ Рецепція', x0: -17, z0: -7, x1: -8, z1: 7 }, { n: '💻 Опенспейс Б', x0: 8, z0: -7, x1: 17, z1: 7 },
  { n: '☕ Кухня', x0: -17, z0: 7, x1: -5, z1: 13 }, { n: '🛋️ Лаунж', x0: -5, z0: 7, x1: 5, z1: 13 }, { n: '👔 Кабінет боса', x0: 5, z0: 7, x1: 17, z1: 13 },
];
// меблі: [тип, x, z, rot]; тверді точки рахуються з цього ж списку
const FURN = [];
for (const z of [-12.2, -9.3]) for (const x of [-15.4, -13.8, -10.2, -8.6, -7, -2.6]) FURN.push(['desk', x, z, 0]);
for (const x of [15.9, 13.2]) for (const z of [-5.4, -3.8, -2.2, 2.2, 3.8, 5.4]) FURN.push(['desk', x, z, -Math.PI / 2]);
FURN.push(['mtable', 8.5, -10, 0], ['tv', 16.8, -10, -Math.PI / 2], ['board', 3, -12.85, 0], ['plant', 1, -12.2, 0], ['plant', 16.2, -7.8, 0]);
for (let x = 5.7; x <= 11.4; x += 1.4) FURN.push(['chair', x, -11.25, 0], ['chair', x, -8.75, Math.PI]);
FURN.push(['reception', -14.6, 0, 0], ['sofa', -12.5, -6.3, 0], ['sofa', -12.5, 6.3, Math.PI], ['plant', -16.2, -6.2, 1], ['plant', -16.2, 6.2, 1], ['cooler', -8.7, -4.5, 0]);
FURN.push(['counter', -11, 12.45, Math.PI], ['fridge', -16.45, 8.2, Math.PI / 2], ['ktable', -10.5, 9.6, 0], ['chair', -11.4, 8.8, 0], ['chair', -9.6, 8.8, 0], ['chair', -11.4, 10.4, Math.PI], ['chair', -9.6, 10.4, Math.PI]);
FURN.push(['sofa', -1, 12.3, Math.PI], ['sofa', -4.2, 10.3, Math.PI / 2], ['ctable', -1, 10.4, 0], ['plant', 4.3, 12.3, 1], ['tv', -1, 7.25, 0]);
FURN.push(['boss', 12.5, 11.1, 0], ['shelf', 16.6, 9.6, -Math.PI / 2], ['plant', 16.2, 12.3, 1], ['plant', 5.8, 12.3, 1], ['sofa', 8, 12.3, Math.PI]);
FURN.push(['pshelf', -3.7, -2.7, Math.PI / 2], ['pshelf', 3.7, -2.7, -Math.PI / 2], ['cooler', 3.8, 2.8, 0], ['plant', -7.4, -6.4, 0], ['plant', 7.4, -6.4, 0], ['plant', -7.4, 6.4, 0], ['plant', 7.4, 6.4, 0]);
function furnSolids() {   // [x, z, r] у світових координатах
  const out = [];
  for (const [t, x, z, rot] of FURN) {
    const c = Math.cos(rot), s = Math.sin(rot), pt = (lx, lz, r) => out.push([PX + x + lx * c + lz * s, PZ + z - lx * s + lz * c, r]);
    if (t === 'desk') { pt(-.5, 0, .45); pt(.5, 0, .45); }
    else if (t === 'mtable') for (let k = -3; k <= 3; k++) pt(k, 0, .75);
    else if (t === 'sofa') { pt(-.7, 0, .5); pt(.7, 0, .5); }
    else if (t === 'reception') for (let k = -2; k <= 2; k++) pt(0, k, .6);
    else if (t === 'counter') for (let k = -1.5; k <= 1.5; k++) pt(k, 0, .45);
    else if (t === 'ktable') { pt(-.6, 0, .55); pt(.6, 0, .55); }
    else if (t === 'boss') { pt(-.8, 0, .6); pt(.8, 0, .6); }
    else if (t === 'ctable' || t === 'fridge' || t === 'cooler' || t === 'plant') pt(0, 0, .45);
    else if (t === 'shelf' || t === 'pshelf') { pt(-.5, 0, .35); pt(.5, 0, .35); }
  }
  return out;
}
const SOLIDS = furnSolids();
A.on('world', () => {
  wallStatics(WALLS);
  for (const [x, z, r] of SOLIDS) addStatic(x, z, r, 1);
  addStatic(PX, PZ, .9, 1.6);   // сам принтер
  for (const [x, z] of [[-12, -8], [-6, -10.8], [10.3, 0], [-11, -1.8]]) addBody('chair', PX + x, PZ + z);
  for (const [x, z] of [[-6.4, -5.6], [6.4, 5.6], [-6.4, 5.6], [6.4, -5.6], [0, -5.4]]) addProp('crate', PX + x, PZ + z);
});

/* ---------- Навігація ботів: сітка 0,5 м і пошук шляху (стіни й меблі — перешкоди) ---------- */
const NAV = { cell: .5, x0: PX - 17, z0: PZ - 13, nx: 68, nz: 52, block: null };
function navBuild() {
  const b = new Uint8Array(NAV.nx * NAV.nz);
  for (let i = 0; i < NAV.nx; i++) for (let j = 0; j < NAV.nz; j++) {
    const x = NAV.x0 + (i + .5) * NAV.cell, z = NAV.z0 + (j + .5) * NAV.cell;
    let bad = SOLIDS.some(([sx, sz, r]) => dist2(x, z, sx, sz) < r + .35) || dist2(x, z, PX, PZ) < 1.3;
    if (!bad) for (const w of WALLS) { const horiz = w.z1 === w.z2; for (const [a, c] of wallParts(w)) { if (horiz ? (Math.abs(z - w.z1) < .5 && x > a - .4 && x < c + .4) : (Math.abs(x - w.x1) < .5 && z > a - .4 && z < c + .4)) { bad = true; break; } } if (bad) break; }
    b[i + j * NAV.nx] = bad ? 1 : 0;
  }
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
  pts.reverse(); const out = pts.filter((p, k) => k % 3 === 2 || k === pts.length - 1); if (!out.length) return [{ x: tx, z: tz }]; out[out.length - 1] = { x: tx, z: tz }; return out;
}
function solidPush(e, r) {   // вибштовхнути з меблів і стін (для ботів)
  for (const [x, z, sr] of SOLIDS) { const dx = e.x - x, dz = e.z - z, d = Math.hypot(dx, dz), m = sr + r; if (d < m && d > .01) { e.x = x + dx / d * m; e.z = z + dz / d * m; } }
  for (const w of WALLS) { const horiz = w.z1 === w.z2; for (const [a, c] of wallParts(w)) { if (horiz) { if (e.x > a - .1 && e.x < c + .1 && Math.abs(e.z - w.z1) < r + .1) e.z = w.z1 + Math.sign(e.z - w.z1 || 1) * (r + .1); } else if (e.z > a - .1 && e.z < c + .1 && Math.abs(e.x - w.x1) < r + .1) e.x = w.x1 + Math.sign(e.x - w.x1 || 1) * (r + .1); } }
  const dx = e.x - PX, dz = e.z - PZ, d = Math.hypot(dx, dz); if (d < 1.3 && d > .01) { e.x = PX + dx / d * 1.3; e.z = PZ + dz / d * 1.3; }
  e.x = clamp(e.x, PX - 16.6, PX + 16.6); e.z = clamp(e.z, PZ - 12.6, PZ + 12.6);
}
function freeSpot() { if (!NAV.block) navBuild(); for (let k = 0; k < 200; k++) { const i = (Math.random() * NAV.nx) | 0, j = (Math.random() * NAV.nz) | 0; if (!NAV.block[i + j * NAV.nx]) return { x: NAV.x0 + (i + .5) * NAV.cell, z: NAV.z0 + (j + .5) * NAV.cell }; } return L(0, -5); }

/* ---------- Стан раунду ---------- */
const ST = { ph: 'idle', t: 0, cnt: 0, ps: [], owner: '', ev: '', evT: 0, sheets: [], res: [], id: 0, fixer: '' };
const AU = { stT: 0, evIn: 20, sid: 0, scoreT: 0, botN: 0 };
const BOT_NAMES = ['Бот Кент', 'Бухгалтерка Люда', 'Стажер Вітя', 'HR Олена', 'Сисадмін Гена'];
const myKey = () => (NET.on && typeof WORLD !== 'undefined' && WORLD.on ? myName() : 'me');
const keyOf = from => SIMSIDE ? String(from && from.name || '') : 'me';
const r2 = v => Math.round(v * 100) / 100;
function snap() {
  return { ph: ST.ph, t: r2(ST.t), c: r2(ST.cnt), id: ST.id, o: ST.owner, ev: ST.ev, et: r2(ST.evT), fx: ST.fixer, res: ST.res,
    p: ST.ps.map(p => [p.k, p.bot ? 1 : 0, p.pages, p.col, p.bot ? r2(p.x) : 0, p.bot ? r2(p.z) : 0, p.bot ? r2(p.f) : 0, r2(p.stun || 0)]), s: ST.sheets.map(s => [s.id, r2(s.x), r2(s.z)]) };
}
function applySnap(d) {
  Object.assign(ST, { ph: d.ph || 'idle', t: +d.t || 0, cnt: +d.c || 0, id: d.id | 0, owner: String(d.o || ''), ev: String(d.ev || ''), evT: +d.et || 0, fixer: String(d.fx || ''), res: Array.isArray(d.res) ? d.res.slice(0, 8) : [] });
  if (Array.isArray(d.p)) {
    const old = new Map(ST.ps.map(p => [p.k, p]));
    ST.ps = d.p.slice(0, MAXP).map(a => { const p = old.get(a[0]) || { k: String(a[0]) }; Object.assign(p, { bot: !!a[1], pages: a[2] | 0, col: a[3] | 0, stun: +a[7] || 0 }); if (p.bot) { p.tx = +a[4]; p.tz = +a[5]; p.f = +a[6]; if (p.x == null) { p.x = p.tx; p.z = p.tz; } } return p; });
  }
  if (Array.isArray(d.s)) ST.sheets = d.s.slice(0, 16).map(a => ({ id: a[0], x: +a[1], z: +a[2] }));
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
  const k = keyOf(from), me = ST.ps.find(p => p.k === k);
  if (d.k === 'join') {
    if (me || ST.ps.filter(p => !p.bot).length >= MAXP) return;
    if (ST.ph !== 'idle' && ST.ph !== 'lobby') { emit({ k: 'msg', to: k, txt: '🖨️ Битва вже йде — дочекайся наступного раунду.' }); return; }
    ST.ps = ST.ps.filter(p => !p.bot); ST.ps.push({ k, bot: false, pages: 0, col: ST.ps.length });
    if (ST.ph === 'idle') { ST.ph = 'lobby'; ST.cnt = SIMSIDE ? 10 : 2; ST.id++; ST.res = []; }
    emit({ k: 'msg', txt: `🖨️ ${SIMSIDE ? escapeHTML(k) : 'Ти'} у битві за принтер!` }); pushState();
  } else if (d.k === 'leave') { if (me) { ST.ps = ST.ps.filter(p => p !== me); if (!ST.ps.some(p => !p.bot)) reset(); pushState(); } }
  else if (d.k === 'shove' && me && ST.ph === 'fight') {   // гравець штовхнув бота
    const b = ST.ps.find(p => p.bot && p.k === d.to); if (!b) return;
    const a = +d.a || 0; b.vx = Math.sin(a) * 9; b.vz = Math.cos(a) * 9; b.stun = .7; emit({ k: 'bonk', who: b.k, by: k });
  } else if (d.k === 'sheet' && me && ST.ph === 'fight') {
    const i = ST.sheets.findIndex(s => s.id === d.id); if (i < 0) return;
    ST.sheets.splice(i, 1); me.pages += 4; emit({ k: 'sheet', who: k, id: d.id }); pushState();
  } else if (d.k === 'fix' && me && ST.ev === 'jam') { ST.ev = ''; ST.evT = 0; me.pages += 10; emit({ k: 'fixed', who: k }); pushState(); }
}
function reset() { Object.assign(ST, { ph: 'idle', ps: [], owner: '', ev: '', evT: 0, sheets: [], t: 0, cnt: 0 }); }
function startFight() {
  let n = 0; while (ST.ps.length < MAXP) ST.ps.push({ k: BOT_NAMES.filter(b => !ST.ps.some(p => p.k === b))[n++ % 3], bot: true, pages: 0, col: ST.ps.length, x: 0, z: 0, f: 0, vx: 0, vz: 0, stun: 0, cd: 0, plan: 0 });
  ST.ps.forEach((p, i) => { p.pages = 0; p.col = i; if (p.bot) { const c = [L(-6.2, -5.3), L(6.2, -5.3), L(6.2, 5.3), L(-6.2, 5.3)][i % 4]; p.x = c.x; p.z = c.z; p.path = null; } });
  Object.assign(ST, { ph: 'fight', t: 0, owner: '', ev: '', evT: 0, sheets: [] }); AU.evIn = rand(16, 22);
  emit({ k: 'go', spots: ST.ps.map(p => p.k) }); pushState();
}
function endFight(why) {
  ST.ph = 'end'; ST.cnt = 8; ST.owner = ''; ST.ev = '';
  ST.res = ST.ps.slice().sort((a, b) => b.pages - a.pages).map(p => [p.k, p.pages]);
  emit({ k: 'end', res: ST.res, why: why || '' }); pushState();
}
function startEvent() {
  const e = pick(['jam', 'toner', 'rain', 'boss', 'jam', 'rain']);
  ST.ev = e; ST.evT = { jam: 12, toner: .5, rain: 9, boss: 7 }[e];
  if (e === 'rain') for (let i = 0; i < 8; i++) { const p = freeSpot(); ST.sheets.push({ id: ++AU.sid, x: r2(p.x), z: r2(p.z) }); }
  if (e === 'toner') for (const p of ST.ps) if (p.bot) { const d = dist2(p.x, p.z, PX, PZ); if (d < 5) { const a = Math.atan2(p.x - PX, p.z - PZ); p.vx = Math.sin(a) * 12; p.vz = Math.cos(a) * 12; p.stun = 1; } }
  emit({ k: 'event', e });
}
function authTick(dt) {
  if (ST.ph === 'idle') return;
  if (SIMSIDE) {   // хто вийшов зі світу — вибуває
    const on = new Set(simPlayers().filter(p => inArena(p.x, p.z)).map(p => p.name));
    const gone = ST.ps.filter(p => !p.bot && !on.has(p.k)); if (gone.length) { ST.ps = ST.ps.filter(p => !gone.includes(p)); if (!ST.ps.some(p => !p.bot)) { reset(); pushState(); return; } }
  }
  if (ST.ph === 'lobby') { ST.cnt -= dt; if (ST.cnt <= 0) startFight(); }
  else if (ST.ph === 'fight') {
    ST.t += dt;
    for (const p of ST.ps) if (p.bot) botTick(p, dt);
    // хто в зоні принтера
    const inZ = ST.ps.filter(p => { const q = posOf(p); return dist2(q.x, q.z, PX, PZ) < ZONE && !(p.stun > .3); });
    ST.owner = inZ.length === 1 ? inZ[0].k : inZ.length > 1 ? '*' : '';
    AU.scoreT -= dt;
    if (AU.scoreT <= 0) {
      AU.scoreT = .5;
      if (ST.ev === 'boss') for (const p of inZ) p.pages = Math.max(0, p.pages - 1);   // друкуєш особисте при начальнику!
      else if (ST.ev !== 'jam' && inZ.length === 1) inZ[0].pages += ST.t > DUR - 30 ? 2 : 1;
    }
    if (ST.ev) { ST.evT -= dt; if (ST.evT <= 0) { if (ST.ev === 'jam') emit({ k: 'msg', txt: '🖨️ Принтер сам себе розжував. Друкуємо далі!' }); ST.ev = ''; } }
    else if ((AU.evIn -= dt) <= 0) { AU.evIn = rand(18, 26); startEvent(); }
    const top = ST.ps.reduce((a, b) => b.pages > a.pages ? b : a, ST.ps[0]);
    if (top && top.pages >= GOAL) endFight(`${top.k === 'me' ? 'Ти' : escapeHTML(top.k)} надрукував ${GOAL} сторінок!`);
    else if (ST.t >= DUR) endFight();
  } else if (ST.ph === 'end') { ST.cnt -= dt; if (ST.cnt <= 0) { reset(); pushState(); } }
  AU.stT -= dt; if (AU.stT <= 0) { AU.stT = ST.ph === 'fight' ? .1 : .5; pushState(); }
}
/* бот: біжить до принтера, штовхає того, хто там стоїть, лагодить, тікає від начальника, збирає сторінки */
function botTick(b, dt) {
  b.cd -= dt;
  if (b.stun > 0) { b.stun -= dt; b.x += b.vx * dt; b.z += b.vz * dt; b.vx *= Math.exp(-4 * dt); b.vz *= Math.exp(-4 * dt); }
  else {
    let tx = PX, tz = PZ;
    const sheet = ST.sheets.reduce((a, s) => !a || dist2(b.x, b.z, s.x, s.z) < dist2(b.x, b.z, a.x, a.z) ? s : a, null);
    if (ST.ev === 'boss') { const c = [L(-6.2, -5.3), L(6.2, -5.3), L(6.2, 5.3), L(-6.2, 5.3)].reduce((a, q) => dist2(b.x, b.z, q.x, q.z) < dist2(b.x, b.z, a.x, a.z) ? q : a); tx = c.x; tz = c.z; }
    else if (sheet && dist2(b.x, b.z, sheet.x, sheet.z) < 9) { tx = sheet.x; tz = sheet.z; }
    else {
      const a = b.col * 1.57 + .8; tx = PX + Math.sin(a) * 1.6; tz = PZ + Math.cos(a) * 1.6;
      const rival = ST.ps.filter(p => p !== b && !(p.stun > .3)).map(p => posOf(p)).filter(q => dist2(q.x, q.z, PX, PZ) < ZONE + .4).sort((u, v) => dist2(b.x, b.z, u.x, u.z) - dist2(b.x, b.z, v.x, v.z))[0];
      if (rival && dist2(b.x, b.z, PX, PZ) < ZONE + 2.5) { tx = rival.x; tz = rival.z; }   // у колі хтось інший — іду штовхати
    }
    // шлях через двері: перераховуємо, коли ціль змінилась або раз на 1,5 с
    if (!b.path || !b.goal || dist2(b.goal.x, b.goal.z, tx, tz) > 1 || (b.repath -= dt) <= 0) { b.path = navPath(b.x, b.z, tx, tz); b.goal = { x: tx, z: tz }; b.repath = 1.5; }
    while (b.path.length > 1 && dist2(b.x, b.z, b.path[0].x, b.path[0].z) < .45) b.path.shift();
    const wp = b.path[0], d = dist2(b.x, b.z, tx, tz), dw = dist2(b.x, b.z, wp.x, wp.z), sp = 4.6;
    if (dw > .2 && d > .3) { b.f = Math.atan2(wp.x - b.x, wp.z - b.z); b.x += Math.sin(b.f) * sp * Math.min(1, dw * 2) * dt; b.z += Math.cos(b.f) * sp * Math.min(1, dw * 2) * dt; }
    if (sheet && dist2(b.x, b.z, sheet.x, sheet.z) < .8) { ST.sheets = ST.sheets.filter(s => s !== sheet); b.pages += 4; }
    if (ST.ev === 'jam' && d < 2.2 && Math.random() < dt * .25) { ST.ev = ''; b.pages += 10; emit({ k: 'fixed', who: b.k }); }
    // штовхнути найближчого суперника в зоні
    if (b.cd <= 0) for (const p of ST.ps) {
      if (p === b) continue; const q = posOf(p), dd = dist2(b.x, b.z, q.x, q.z);
      if (dd < 1.5 && dist2(q.x, q.z, PX, PZ) < ZONE + 1) {
        const a = Math.atan2(q.x - b.x, q.z - b.z); b.cd = rand(1.1, 1.8); b.f = a;
        if (p.bot) { p.vx = Math.sin(a) * 8; p.vz = Math.cos(a) * 8; p.stun = .6; }
        emit({ k: 'shove', to: p.k, a: r2(a), by: b.k });
        break;
      }
    }
  }
  solidPush(b, .35);   // стіни й меблі
}
A.on('tick', dt => {
  if (AUTH()) authTick(dt);
  else if (ST.ph === 'fight') { ST.t += dt; for (const p of ST.ps) if (p.bot && p.tx != null) { p.x = lerp(p.x, p.tx, Math.min(1, dt * 10)); p.z = lerp(p.z, p.tz, Math.min(1, dt * 10)); } }
  if (!SIMSIDE) clientTick(dt);
});

/* ======================= ДАЛІ — ЛИШЕ В ГРАВЦЯ ======================= */
const V = { bots: new Map(), ring: null, prn: null, led: null, sheets: new Map(), hud: null, goalEl: null, lbl: null, tags: new Map(), music: -1, fix: null, shoveCd: 0, paperT: 0, boardLbl: null, prnLbl: null, flying: [] };
const amIn = () => ST.ps.some(p => p.k === myKey());
const nameOf = k => k === 'me' ? 'Ти' : escapeHTML(k);

/* ---------- Модель: принт-рум ---------- */
function buildRoom() {
  const g = new THREE.Group(); scene.add(g);
  put(g, mesh(flat(new THREE.CylinderGeometry(ISL_R, ISL_R * .8, 1.6, 36)), '#C9C0E0', false, true), PX, -.8, PZ);
  put(g, mesh(flat(new THREE.ConeGeometry(ISL_R * .8, 7, 28)), '#8C84C6', false), PX, -5.1, PZ).rotation.x = Math.PI;
  // підлоги: коридор, кімнати (ковролін, плитка на кухні, паркет у боса й лаунжі)
  const K = officeKit(g), F = (x0, z0, x1, z1, c) => K.floor(PX + x0, PZ + z0, PX + x1, PZ + z1, c);
  F(-17, -13, 17, 13, '#C9CDD9');
  F(-17, -13, 0, -7, '#5A6BB5'); F(8, -7, 17, 7, '#5A6BB5'); F(0, -13, 17, -7, '#7E6FB8'); F(-17, -7, -8, 7, '#E3D7C4'); F(-5, 7, 5, 13, '#C4956A'); F(5, 7, 17, 13, '#8C5A3C'); F(-4.5, -3.5, 4.5, 3.5, '#EDEBF5');
  K.tiles(PX - 17, PZ + 7, PX - 5, PZ + 13, '#FFFFFF', '#DCD6EA');
  for (let x = -7.5; x <= 7.5; x += 3) F(x - .5, -.15, x + .5, .15, '#FFE066');   // розмітка в коридорі
  wallMeshes(g, WALLS);
  // меблі за планом
  for (const [t, x, z, rot] of FURN) {
    const X = PX + x, Z = PZ + z;
    if (t === 'desk') K.desk(X, Z, rot);
    else if (t === 'chair') K.chair(X, Z, rot);
    else if (t === 'mtable') K.table(X, Z, 7, 1.6, '#4E3A7C');
    else if (t === 'ktable') K.table(X, Z, 2.4, 1.2, '#E8DCC8');
    else if (t === 'ctable') { const o = K.table(X, Z, 1.6, .8, '#6B4A3A'); o.scale.y = .6; }
    else if (t === 'sofa') K.sofa(X, Z, rot, 2.6, x > 5 ? '#6B4A3A' : '#8F7BD6');
    else if (t === 'plant') K.plant(X, Z, rot);
    else if (t === 'cooler') K.cooler(X, Z);
    else if (t === 'tv') K.tv(X, Z, rot);
    else if (t === 'board') K.board(X, Z, rot, 2.4);
    else if (t === 'counter') K.counter(X, Z, rot, 5);
    else if (t === 'fridge') K.fridge(X, Z, rot);
    else if (t === 'boss') K.bossDesk(X, Z, rot);
    else if (t === 'shelf') K.shelf(X, Z, rot, 2);
    else if (t === 'pshelf') { const o = K.shelf(X, Z, rot, 1.4); o.scale.y = .7; }
    else if (t === 'reception') {
      put(g, mesh(new THREE.BoxGeometry(.8, 1.1, 4.8), '#4E3A7C'), X, .55, Z); put(g, mesh(new THREE.BoxGeometry(1, .08, 5), '#E8DCC8'), X, 1.12, Z);
      put(g, mesh(new THREE.BoxGeometry(.06, .3, 3), bulb('#FF6BD6'), false), X + .42, .8, Z);
    }
  }
  // логотип на стіні рецепції
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(5, 1), new THREE.MeshBasicMaterial({ map: logoTex('ОФІС «ГУЩА»'), transparent: true, depthWrite: false })); sign.position.set(PX - 16.85, 2, PZ); sign.rotation.y = Math.PI / 2; g.add(sign);
  // зона принтера й постамент
  put(g, mesh(flat(new THREE.CylinderGeometry(ZONE, ZONE, .06, 32)), '#E9E2FA', false, true), PX, .03, PZ);
  // великий принтер
  put(g, mesh(new THREE.BoxGeometry(1.7, 1.2, 1.4), '#EDEBF5'), PX, .6, PZ);
  put(g, mesh(new THREE.BoxGeometry(1.75, .25, 1.45), '#4E4A6E'), PX, 1.3, PZ);
  put(g, mesh(new THREE.BoxGeometry(1.2, .06, .8), '#FFFFFF', false), PX, 1.46, PZ - .1);
  put(g, mesh(new THREE.BoxGeometry(1.1, .08, .5), '#8E86B0', false), PX, .9, PZ + .85);
  put(g, mesh(new THREE.BoxGeometry(.4, .25, .05), '#2E2346', false), PX + .5, 1.1, PZ + .71);
  // табло записатися
  put(g, mesh(new THREE.BoxGeometry(.12, 1.6, .12), '#4E4A6E'), BOARD.x - .9, .8, BOARD.z); put(g, mesh(new THREE.BoxGeometry(.12, 1.6, .12), '#4E4A6E'), BOARD.x + .9, .8, BOARD.z);
  put(g, mesh(new THREE.BoxGeometry(2.1, 1, .1), '#2E2346'), BOARD.x, 1.9, BOARD.z);
  put(g, mesh(new THREE.BoxGeometry(1.9, .8, .02), bulb('#7FE08A'), false), BOARD.x, 1.9, BOARD.z + .06);
  // кольорове кільце-зона (динамічне), лампа принтера
  V.ring = new THREE.Mesh(new THREE.TorusGeometry(ZONE, .09, 6, 48), new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: .9, depthWrite: false })); V.ring.rotation.x = Math.PI / 2; V.ring.position.set(PX, .1, PZ); scene.add(A.dynamic(V.ring));
  V.led = new THREE.Mesh(new THREE.SphereGeometry(.12, 10, 8), new THREE.MeshBasicMaterial({ color: '#7FE08A' })); V.led.position.set(PX - .55, 1.15, PZ + .72); scene.add(A.dynamic(V.led));
  V.prn = new THREE.Group(); V.prn.position.set(PX, 0, PZ); scene.add(A.dynamic(V.prn));
  return g;
}
function logoTex(txt) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 205; const x = c.getContext && c.getContext('2d');
  if (x && x.fillText) { x.fillStyle = '#2E2346'; x.fillRect(0, 0, 1024, 205); x.font = 'bold 120px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#FFE066'; x.fillText(txt, 512, 108); }
  return new THREE.CanvasTexture(c);
}
function botMesh(p) {
  let v = V.bots.get(p.k); if (v) return v;
  const h = buildOffice(pick(['#AFC4B6', '#C9D6CF', '#D9C7A9']), COL[p.col % 4]); scene.add(h.root);
  v = { h }; V.bots.set(p.k, v); return v;
}

/* ---------- Події ---------- */
function onEvent(e) {
  if (SIMSIDE || !e) return;
  const here = running && inArena(pl.x, pl.z);
  if (e.k === 'msg') { if (here && (!e.to || e.to === myKey())) toast(e.txt); }
  else if (e.k === 'go') { if (here) { banner('🖨️ БИТВА ЗА ПРИНТЕР! Стій біля нього сам — друкуй!'); sfx('level'); } }
  else if (e.k === 'shove') {
    if (e.to === myKey() && amIn() && !pl.dead) { knockMe(+e.a || 0, 14, `${e.by && e.by !== 'me' ? escapeHTML(e.by) : 'Хтось'}: «Моя черга!»`); sfx('hurt'); shake = Math.max(shake, .25); }
    else if (here) { const p = ST.ps.find(q => q.k === e.by); if (p) { const q = posOf(p); burst(q.x, 1.2, q.z, '#FFF3E6', 6, 3, .4, 2); sfx('hit', q.x, q.z); } }
  }
  else if (e.k === 'bonk') { if (here) { const p = ST.ps.find(q => q.k === e.who); if (p) { ftext(p.x, 2.4, p.z, pick(['Ай!', 'Це був мій принтер!', 'Я на HR поскаржусь!']), 'crit'); burst(p.x, 1.2, p.z, '#FFF3E6', 8, 3, .4, 2); } } }
  else if (e.k === 'event') {
    if (!here) return;
    if (e.e === 'jam') { banner('🖨️ Принтер зажувало папір! Хто полагодить (F) — +10 сторінок!'); sfx('warn'); }
    else if (e.e === 'toner') { banner('💥 ВИБУХ ТОНЕРА!'); if (typeof boomFX === 'function') boomFX(PX, PZ, 3.5, .8); shake = Math.max(shake, .8); const d = dist2(pl.x, pl.z, PX, PZ); if (d < 5 && amIn()) knockMe(Math.atan2(pl.x - PX, pl.z - PZ), 22, 'Тонером в обличчя!'); }
    else if (e.e === 'rain') { banner('📄 Дощ зі сторінок! Збирай — +4 за кожну!'); sfx('page'); }
    else if (e.e === 'boss') { banner('👔 НАЧАЛЬНИК ІДЕ! Відійди від принтера — інакше мінус сторінки!'); sfx('aggro'); }
  }
  else if (e.k === 'fixed') { if (here) { toast(`🔧 ${nameOf(e.who)} полагодив принтер (+10 сторінок)!`); sfx('equip'); } if (V.fix) V.fix = null; }
  else if (e.k === 'sheet') { if (here && e.who === myKey()) { ftext(pl.x, 2.4, pl.z, '+4 📄', 'gold'); sfx('pick'); } }
  else if (e.k === 'end') finishMe(e);
}
function finishMe(e) {
  if (!running || !inArena(pl.x, pl.z)) return;
  const res = e.res || [], place = res.findIndex(r => r[0] === myKey()) + 1;
  if (!place) return;
  const coins = [0, 110, 60, 35, 20][place] || 10, xp = [0, 140, 90, 60, 40][place] || 30;
  P.coins += coins; addXP(xp);
  const d = A.data(); d.games = (d.games || 0) + 1; if (place === 1) d.wins = (d.wins || 0) + 1; d.best = Math.max(d.best || 0, res[place - 1][1] | 0);
  banner(place === 1 ? '🏆 ПРИНТЕР ТВІЙ! Звіт здано першим!' : `🖨️ ${place} місце`);
  toast(`Результати: ${res.map((r, i) => `${i + 1}. ${nameOf(r[0])} — ${r[1]} 📄`).join(' · ')}${e.why ? '<br>' + e.why : ''}<br>Нагорода: <b>+${coins} 🪙</b> · +${xp} досвіду`);
  sfx(place === 1 ? 'legend' : 'level'); refreshHUD(); save();
}

/* ---------- Штовханина: ЛКМ штовхає ботів (гравців штовхає звичайний удар гри) ---------- */
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
if (!SIMSIDE) addEventListener('pointerdown', e => { if (typeof cv !== 'undefined' && e.target === cv && e.button === 0 && amIn()) shove(); }, true);
A.key('KeyR', () => { if (!amIn()) return false; shove(); });

/* ---------- Кожен кадр ---------- */
function clientTick(dt) {
  const t = gameTime, here = running && inArena(pl.x, pl.z);
  V.shoveCd -= dt;
  // боти
  const seen = new Set();
  for (const p of ST.ps) {
    if (!p.bot || ST.ph === 'idle' || ST.ph === 'lobby') continue;
    seen.add(p.k); const v = botMesh(p), h = v.h, mv = p.lx != null ? Math.hypot(p.x - p.lx, p.z - p.lz) / Math.max(dt, .001) : 0;
    h.root.position.set(p.x, 0, p.z); h.root.rotation.y = p.f || 0; p.lx = p.x; p.lz = p.z;
    const w = Math.min(1, mv / 3); h.l1.rotation.x = Math.sin(t * 12) * .7 * w; h.l2.rotation.x = -Math.sin(t * 12) * .7 * w;
    h.aR.rotation.x = p.stun > 0 ? -2.8 : -Math.sin(t * 12) * .5 * w; h.aL.rotation.x = p.stun > 0 ? -2.8 : Math.sin(t * 12) * .5 * w;
  }
  for (const [k, v] of V.bots) if (!seen.has(k)) { scene.remove(v.h.root); V.bots.delete(k); }
  // кільце зони: колір власника, червоне — сперечаються
  if (V.ring) {
    const o = ST.ps.find(p => p.k === ST.owner);
    V.ring.material.color.set(ST.ev === 'boss' ? '#FF5C7A' : ST.ev === 'jam' ? '#8E86B0' : ST.owner === '*' ? (Math.sin(t * 12) > 0 ? '#FF5C7A' : '#FFFFFF') : o ? COL[o.col % 4] : '#FFFFFF');
    V.ring.scale.setScalar(1 + (o ? Math.sin(t * 6) * .03 : 0));
    V.led.material.color.set(ST.ev === 'jam' ? (Math.sin(t * 10) > 0 ? '#FF5C7A' : '#2E2346') : o ? '#7FE08A' : '#FFE066');
  }
  // принтер «плює» сторінками, коли хтось друкує
  if (o_printing() && (V.paperT -= dt) <= 0) { V.paperT = .35; const m = mesh(new THREE.BoxGeometry(.4, .01, .55), '#FFFFFF', false); m.position.set(PX, 1, PZ + .9); scene.add(m); V.flying.push({ m, vx: rand(-1, 1), vz: rand(1.5, 3), vy: 2.5, t: 0 }); }
  for (let i = V.flying.length - 1; i >= 0; i--) { const f = V.flying[i]; f.t += dt; f.vy -= 6 * dt; f.m.position.x += f.vx * dt; f.m.position.z += f.vz * dt; f.m.position.y = Math.max(.02, f.m.position.y + f.vy * dt); f.m.rotation.y += dt * 3; if (f.t > 1.6) { scene.remove(f.m); V.flying.splice(i, 1); } }
  // сторінки на підлозі
  const ids = new Set(ST.sheets.map(s => s.id));
  for (const s of ST.sheets) if (!V.sheets.has(s.id)) { const m = mesh(new THREE.BoxGeometry(.5, .02, .65), bulb('#FFFFFF'), false); m.position.set(s.x, .3, s.z); scene.add(m); V.sheets.set(s.id, m); }
  for (const [id, m] of V.sheets) { if (!ids.has(id)) { scene.remove(m); V.sheets.delete(id); } else { m.rotation.y = t * 2 + id; m.position.y = .35 + Math.sin(t * 3 + id) * .1; } }
  if (here && amIn() && ST.ph === 'fight' && !pl.dead) for (const s of ST.sheets) if (dist2(pl.x, pl.z, s.x, s.z) < .9 && !s.req) { s.req = 1; req('sheet', { id: s.id }); }
  updFix(dt);
  hud(here); labels(here);
}
const o_printing = () => ST.ph === 'fight' && ST.owner && ST.owner !== '*' && ST.ev !== 'jam' && ST.ev !== 'boss';
function updFix(dt) {
  if (!V.fix) return;
  if (ST.ev !== 'jam' || dist2(pl.x, pl.z, PX, PZ) > ZONE + .6) { V.fix = null; return; }
  V.fix.t += dt; if (Math.random() < dt * 6) burst(PX, 1.4, PZ, '#FFE066', 2, 2, .4, 1);
  if (V.fix.t >= 2) { V.fix = null; req('fix'); }
}

/* ---------- F: записатися, лагодити ---------- */
const _getInteract = getInteract;
getInteract = function () {
  if (!SIMSIDE && running && !pl.dead && inArena(pl.x, pl.z) && !pl.carry) {
    if (dist2(pl.x, pl.z, BOARD.x, BOARD.z) < 2.4) {
      if (amIn()) return { l: ST.ph === 'lobby' ? `🖨️ Ти в грі — старт за ${Math.ceil(ST.cnt)} с` : '🖨️ Ти в грі', fn: () => { } };
      if (ST.ph === 'idle' || ST.ph === 'lobby') return { l: `🖨️ Записатися на битву (${ST.ps.filter(p => !p.bot).length}/${MAXP})`, fn: () => { req('join'); sfx('ding'); } };
      return { l: '🖨️ Битва йде — чекай наступного раунду', fn: () => { } };
    }
    if (amIn() && ST.ev === 'jam' && dist2(pl.x, pl.z, PX, PZ) < ZONE + .4) return V.fix ? { l: `🔧 Лагоджу… ${Math.round(V.fix.t / 2 * 100)}%`, fn: () => { } } : { l: '🔧 Витягти зажований папір (2 с, +10 сторінок)', fn: () => { V.fix = { t: 0 }; sfx('dig'); } };
  }
  return _getInteract.apply(this, arguments);
};

/* ---------- HUD, підказки, підписи ---------- */
function goal() {
  const myP = ST.ps.find(p => p.k === myKey());
  if (!myP) return ST.ph === 'fight' ? 'Битва йде — дивись і чекай наступного раунду.' : 'Підійди до <b>зеленого табло</b> і натисни <b>F</b> — записатися на битву.';
  if (ST.ph === 'lobby') return `Ти в грі! Старт за <b>${Math.ceil(ST.cnt)} с</b>.`;
  if (ST.ph !== 'fight') return 'Раунд скінчився.';
  if (ST.ev === 'boss') return '👔 <b>Начальник!</b> Відійди від принтера — хто там стоїть, втрачає сторінки!';
  if (ST.ev === 'jam') return '🖨️ Зажувало! Біжи до принтера й тримай <b>F</b> 2 с — +10 сторінок.';
  if (ST.sheets.length) return '📄 Сторінки на підлозі — збирай, +4 за кожну!';
  if (ST.owner === myKey()) return '🖨️ Друкуєш! Не підпускай нікого — <b>ЛКМ</b> штовхнути.';
  if (ST.owner === '*') return '⚔️ Біля принтера тиснява — виштовхни всіх (<b>ЛКМ</b>, кидай крісла <b>Q</b>)!';
  if (ST.owner) return `🖨️ Друкує ${nameOf(ST.owner)} — біжи й виштовхни (<b>ЛКМ</b>)!`;
  return '🖨️ Принтер вільний — біжи в коло біля нього!';
}
function hud(here) {
  if (!V.hud) {
    V.hud = document.createElement('div'); V.hud.id = 'printer-hud';
    V.hud.style.cssText = 'position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 64px);transform:translateX(-50%);z-index:2;pointer-events:none;background:rgba(46,35,70,.85);color:#fff;border-radius:14px;padding:7px 14px;font:700 13px/1.4 system-ui,sans-serif;text-align:center;box-shadow:0 6px 18px rgba(0,0,0,.25);white-space:nowrap';
    V.goalEl = document.createElement('div'); V.goalEl.id = 'printer-goal';
    V.goalEl.style.cssText = 'position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 150px);transform:translateX(-50%);z-index:2;pointer-events:none;background:#FFE066;color:#2E2346;border-radius:12px;padding:7px 14px;font:700 14px/1.4 system-ui,sans-serif;text-align:center;box-shadow:0 6px 18px rgba(0,0,0,.25);width:max-content;max-width:min(560px,90vw)';
    document.body.appendChild(V.hud); document.body.appendChild(V.goalEl);
  }
  const show = here && !pl.dead && !panel;
  V.hud.style.display = V.goalEl.style.display = show ? '' : 'none';
  if (!show) return;
  let h;
  if (ST.ph === 'fight' || ST.ph === 'end') {
    const left = Math.max(0, DUR - ST.t), rows = ST.ps.slice().sort((a, b) => b.pages - a.pages).map(p => `<span style="color:${COL[p.col % 4]}">${p.k === ST.owner ? '🖨️' : '●'} ${nameOf(p.k)} ${p.pages}</span>`).join(' · ');
    h = `🖨️ БИТВА ЗА ПРИНТЕР · ${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')} · до ${GOAL} 📄${ST.t > DUR - 30 && ST.ph === 'fight' ? ' · <span style="color:#FFE066">×2!</span>' : ''}<br><span style="font-size:12px">${rows}</span>`;
  } else h = `🖨️ Битва за принтер · <span style="font-weight:600">${ST.ph === 'lobby' ? `гравців ${ST.ps.length}/${MAXP} · старт за ${Math.ceil(ST.cnt)} с` : 'F біля табло — записатися'}</span>`;
  if (V.hud.innerHTML !== h) V.hud.innerHTML = h;
  const gt = '👉 ' + goal(); if (V.goalEl.innerHTML !== gt) V.goalEl.innerHTML = gt;
}
function labels(here) {
  if (!V.lbl) {
    V.lbl = document.createElement('div'); V.lbl.style.cssText = 'position:fixed;inset:0;z-index:2;pointer-events:none'; document.body.appendChild(V.lbl);
    const pill = (bg, fg) => { const e = document.createElement('div'); e.style.cssText = `position:absolute;left:0;top:0;padding:4px 10px;border-radius:10px;background:${bg};color:${fg};font:800 13px system-ui,sans-serif;white-space:nowrap`; V.lbl.appendChild(e); return e; };
    V.boardLbl = pill('#FFE066', '#2E2346'); V.boardLbl.textContent = '📋 Записатися на битву (F)';
    V.prnLbl = pill('rgba(46,35,70,.85)', '#fff');
    V.rooms = ROOMS.slice(1).map(r => { const e = pill('rgba(255,255,255,.75)', '#4E3A7C'); e.style.font = '700 11px system-ui,sans-serif'; e.textContent = r.n; return { r, e }; });
  }
  V.lbl.style.display = here && !panel ? '' : 'none'; if (!here) return;
  const at = (el, x, y, z) => { const q = screenPos(x, y, z); el.style.display = q.vis ? '' : 'none'; el.style.transform = `translate(${Math.round(q.x)}px,${Math.round(q.y)}px) translate(-50%,-100%)`; };
  for (const { r, e } of V.rooms) at(e, PX + (r.x0 + r.x1) / 2, 1.6, PZ + (r.z0 + r.z1) / 2);
  V.boardLbl.style.visibility = amIn() ? 'hidden' : ''; at(V.boardLbl, BOARD.x, 2.8, BOARD.z);
  const pt = ST.ev === 'jam' ? '🖨️ ЗАЖУВАЛО — лагодь (F)' : ST.ev === 'boss' ? '👔 НЕ ПІДХОДЬ!' : ST.owner === '*' ? '⚔️ Тиснява!' : ST.owner ? `🖨️ Друкує: ${nameOf(ST.owner)}` : '🖨️ ПРИНТЕР — стань у коло сам';
  if (V.prnLbl.textContent !== pt) V.prnLbl.textContent = pt; at(V.prnLbl, PX, 2.4, PZ);
  for (const p of ST.ps) {
    if (!p.bot || ST.ph === 'idle' || ST.ph === 'lobby') continue;
    let el = V.tags.get(p.k); if (!el) { el = document.createElement('div'); el.style.cssText = `position:absolute;left:0;top:0;padding:2px 7px;border-radius:8px;background:rgba(46,35,70,.8);color:${COL[p.col % 4]};font:700 11px system-ui,sans-serif;white-space:nowrap`; V.lbl.appendChild(el); V.tags.set(p.k, el); }
    const t = `🤖 ${p.k} · ${p.pages}`; if (el.textContent !== t) el.textContent = t; at(el, p.x, 2.5, p.z);
  }
  for (const [k, el] of V.tags) if (!ST.ps.some(p => p.k === k && p.bot) || ST.ph === 'idle' || ST.ph === 'lobby') { el.remove(); V.tags.delete(k); }
}

/* ---------- Музика: офісний фанк-баттл; начальник — тривога ---------- */
const PPROG = [[45, [64, 67, 72, 76]], [41, [64, 69, 72, 77]], [43, [62, 67, 71, 74]], [40, [62, 67, 71, 76]]];
if (!SIMSIDE && typeof scheduleStep === 'function') {
  const _ss = scheduleStep;
  scheduleStep = function (i, t) {
    if (!running || !inArena(pl.x, pl.z) || typeof LAYER === 'undefined' || !LAYER.drums) { if (V.music >= 0) { V.music = -1; barMode = ''; } return _ss.apply(this, arguments); }
    const s = i % 16, bar = Math.floor(i / 16), lvl = ST.ph !== 'fight' ? 0 : ST.ev === 'boss' || ST.ev === 'toner' ? 2 : 1;
    if (s === 0 && V.music !== lvl) { V.music = lvl; const m = [{ keys: .8, bass: .6, drums: .4, tension: 0, lead: .2, crackle: .1 }, { keys: .7, bass: 1, drums: 1, tension: .15, lead: .45, crackle: 0 }, { keys: .5, bass: 1, drums: 1, tension: .8, lead: .3, crackle: 0 }][lvl]; for (const k in m) if (LAYER[k]) LAYER[k].gain.setTargetAtTime(m[k], t, .5); }
    const [root, ch] = PPROG[bar % 4];
    if (s === 0 || s === 8) ch.forEach((n, k) => epiano(t + k * .015, n, 1, .04, LAYER.keys));
    if ([0, 3, 7, 10, 12].includes(s)) bassNote(t, root + (s === 7 ? 7 : 0), STEP, lvl ? .45 : .28);
    if (lvl) { if (s % 4 === 0) kick(t, .8); if (s === 4 || s === 12) snare(t, .35); hat(t, s % 2 ? .03 : .055); }
    else if (s % 8 === 0) kick(t, .45);
    if ([2, 6, 11, 14].includes(s) && Math.random() < (lvl ? .55 : .3)) marimba(t, pick([72, 74, 76, 79, 81]), .045);
    if (lvl === 2 && s % 2 === 0) pulse(t, root + 25, STEP * .8, .055);
  };
}

/* ---------- Режим (у кнопці PVP), вкладка ---------- */
function goPrinter() { const f = $('#fade'); closePanel(); if (f) f.style.opacity = 1; sfx('travel'); setTimeout(() => { pl.x = BOARD.x; pl.z = BOARD.z - 1.4; pl.y = 0; pl.falling = false; pl.jump = null; pl.safe = { x: BOARD.x, z: BOARD.z - 1.4 }; camPos.set(pl.x, 20, pl.z + 15); camLook.set(pl.x, .5, pl.z); if (f) f.style.opacity = 0; toast('🖨️ Битва за принтер! F біля табло — записатися. Стій біля принтера сам — друкуй.'); }, 260); return true; }
function leavePrinter() { if (amIn()) req('leave'); V.fix = null; return true; }
if (A.mode) A.mode({ id: 'printerwar', group: 'pvp', ic: '🖨️', n: 'Битва за принтер', sub: 'цар гори · штовханина · до 4 + боти', go: goPrinter, here: () => running && inArena(pl.x, pl.z), leave: leavePrinter });
A.tab('printerwar', '🖨️ Принтер', () => {
  const d = A.data(), here = inArena(pl.x, pl.z);
  return `<h3>🖨️ Битва за принтер</h3>
    <p style="font-size:13px;line-height:1.5;margin:4px 0 10px">Один принтер на весь офіс. Звіт треба всім. Хто першим надрукує ${GOAL} сторінок (або найбільше за 2,5 хв) — той і молодець.</p>
    <div class="btns">${here ? (amIn() || ST.ph === 'fight' ? '' : '<button class="btn" data-pw="join">🖨️ Записатися</button>') : '<button class="btn" data-pw="go">🖨️ У принт-рум</button>'}</div>
    <div class="list" style="margin-top:10px;font-size:13px;line-height:1.55">
      <div>🖨️ Стій у колі біля принтера <b>сам</b> — +1 сторінка кожні пів секунди (останні 30 с — ×2). Двоє в колі — ніхто не друкує.</div>
      <div>👊 <b>ЛКМ</b> / R — штовхнути. Крісла й коробки: F — підняти, Q — жбурнути в суперника.</div>
      <div>⚡ Події: зажувало (F 2 с — +10), вибух тонера, дощ зі сторінок (+4 за кожну), «Начальник іде!» — хто біля принтера, втрачає сторінки.</div>
      <div>🏆 1 місце — 110 🪙, 2 — 60, 3 — 35, 4 — 20.</div>
    </div>
    <p class="muted" style="font-size:12px;margin-top:10px">Битв: ${d.games || 0} · перемог: ${d.wins || 0} · рекорд: ${d.best || 0} 📄</p>`;
}, e => {
  const b = e.target.closest('[data-pw]'); if (!b) return;
  if (b.dataset.pw === 'go') goPrinter(); else { req('join'); closePanel(); }
});
if (window.__ADDON_TEST) window.__printer = { ST, AU, V, BOARD, PX, PZ, ZONE, GOAL, DUR, shove, startEvent, posOf };
