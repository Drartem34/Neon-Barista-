/* Аддон «Гонки на офісних кріслах» (PVP, до 4 гравців + боти).
   Траса крізь опенспейс: перегородки, кулери, кавові бустери й зомбі-офісники, що переходять дорогу.
   - Підійди до старту (F) — записуєшся в заїзд. Хто не встиг — дивиться. Порожні місця займають боти.
   - WASD (або джойстик) — куди їхати: крісло розвертається й розганяється в той бік.
   - Коробки «?» на трасі дають предмет, ПРОБІЛ або ЛКМ — використати:
     ☕ кава — прискорення · 📎 степлер — стріляє вперед · 📁 папка — пастка позаду · 🍵 чай — лідер п'яніє.
   - 3 кола. Нагорода — за місце. У спільному світі заїзд рахує сервер (боти теж їздять там).
   Картинку для меню поклади поруч: addons/chairrace/chairrace-bg.jpg (або menu/chairrace-bg.jpg). */
const A = Addon.info({ name: 'Гонки на офісних кріслах', version: '1.0', desc: 'PVP-режим: гонка на офісних кріслах крізь опенспейс, предмети, боти, 3 кола.' });

const SIMSIDE = !!window.__SIM;
const AUTH = () => SIMSIDE || !(typeof WORLD !== 'undefined' && WORLD.on);
const CX = 130, CZ = -70, ISL_R = 33, TW = 5.6, LAPS = 3, MAXR = 4, VMAX = 11, VBOOST = 16;
const inRace = (x, z) => Math.abs(x - CX) < 28 && Math.abs(z - CZ) < 20;

/* ---------- Траса: коридори офісного поверху (прямі + заокруглені повороти) ---------- */
// Коло: північний коридор → східний → поворот у середину поверху → південний → західний. Між коридорами — кабінети.
const LOOP = [[-22, -14], [22, -14], [22, -2], [2, -2], [2, 14], [-22, 14]], RAD = 3.2;
const TR = [];
(function buildTrack() {
  const P = LOOP.map(([x, z]) => [CX + x, CZ + z]), n = P.length, pts = [];
  const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  for (let i = 0; i < n; i++) {
    const a = P[(i - 1 + n) % n], b = P[i], c = P[(i + 1) % n];
    const la = Math.hypot(b[0] - a[0], b[1] - a[1]), lc = Math.hypot(c[0] - b[0], c[1] - b[1]);
    const t0 = lerp2(b, a, RAD / la), t1 = lerp2(b, c, RAD / lc);
    for (let k = 0; k < 7; k++) { const t = k / 7, u = 1 - t; pts.push([u * u * t0[0] + 2 * u * t * b[0] + t * t * t1[0], u * u * t0[1] + 2 * u * t * b[1] + t * t * t1[1]]); }   // заокруглення
    const e = lerp2(c, b, RAD / lc), len = Math.hypot(e[0] - t1[0], e[1] - t1[1]), m = Math.max(1, Math.round(len / .9));
    for (let k = 0; k < m; k++) pts.push(lerp2(t1, e, k / m));
  }
  const s0 = pts.reduce((bi, q, k) => Math.hypot(q[0] - (CX - 8), q[1] - (CZ - 14)) < Math.hypot(pts[bi][0] - (CX - 8), pts[bi][1] - (CZ - 14)) ? k : bi, 0);   // старт — у північному коридорі
  for (let k = 0; k < pts.length; k++) { const q = pts[(s0 + k) % pts.length]; TR.push({ x: q[0], z: q[1] }); }
  for (let i = 0; i < TR.length; i++) { const p = TR[i], q = TR[(i + 1) % TR.length], l = Math.hypot(q.x - p.x, q.z - p.z) || 1; p.dx = (q.x - p.x) / l; p.dz = (q.z - p.z) / l; p.l = l; }
})();
const N = TR.length;
const wrapI = i => ((i % N) + N) % N;
function nearIdx(x, z, hint) {
  let best = 0, bd = 1e9;
  const scan = (from, to) => { for (let k = from; k <= to; k++) { const i = wrapI(k), d = (TR[i].x - x) ** 2 + (TR[i].z - z) ** 2; if (d < bd) { bd = d; best = i; } } };
  if (hint == null) scan(0, N - 1); else { scan(hint - 10, hint + 10); if (bd > 25) scan(0, N - 1); }
  return best;
}
const ITEM_SPOTS = [Math.round(N * .12), Math.round(N * .4), Math.round(N * .63), Math.round(N * .86)];
const BOOSTS = [Math.round(N * .27), Math.round(N * .54), Math.round(N * .95)];
const ZOMBIES = [{ i: Math.round(N * .2), sp: .7 }, { i: Math.round(N * .5), sp: .55 }, { i: Math.round(N * .75), sp: .8 }];
const zombiePos = (z, t) => { const p = TR[z.i], o = Math.sin(t * z.sp + z.i) * (TW / 2 - .6); return { x: p.x - p.dz * o, z: p.z + p.dx * o }; };
const GRID = k => { const p = TR[wrapI(-3 - (k >> 1) * 2)], o = (k & 1 ? 1 : -1) * 1.2; return { x: p.x - p.dz * o, z: p.z + p.dx * o, h: Math.atan2(p.dz, p.dx) }; };
const START = (() => { const p = TR[wrapI(-9)], o = -(TW / 2 - .55); return { x: p.x - p.dz * o, z: p.z + p.dx * o }; })();   // стенд біля зовнішньої стіни коридору

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

/* ---------- Кабінети між коридорами (локальні координати) ---------- */
const OW = [
  { x1: -19, z1: 3.5, x2: -1, z2: 3.5, doors: [-14, -5], glass: 1 }, { x1: -10, z1: 3.5, x2: -10, z2: 11, doors: [7], glass: 1 },
  { x1: -1, z1: -11, x2: -1, z2: -5, doors: [-8] }, { x1: 9, z1: -11, x2: 9, z2: -5, doors: [-8] }, { x1: 15, z1: 1, x2: 15, z2: 17.4, doors: [9] },
  { x1: 26, z1: -17.5, x2: 26, z2: 17.5, col: '#D9D2EE' }, { x1: 4.95, z1: 17.5, x2: 26, z2: 17.5, col: '#D9D2EE' },
].map(w => Object.assign({}, w, { x1: CX + w.x1, x2: CX + w.x2, z1: CZ + w.z1, z2: CZ + w.z2, doors: (w.doors || []).map(d => d + (w.z1 === w.z2 ? CX : CZ)) }));
const ROOMS = [
  { n: '💻 Опенспейс', x: -10, z: -4 }, { n: '📊 Переговорна', x: -14.5, z: 9.6 }, { n: '👔 Кабінет боса', x: -5.5, z: 10.4 }, { n: '🛋️ Лаунж', x: 4, z: -10.6 },
  { n: '☕ Кухня', x: 14, z: -6 }, { n: '📦 Склад', x: 10, z: 16 }, { n: '🖥️ Серверна', x: 20.5, z: 16 },
];
const FURN = [];
for (const cx of [-15.5, -10.5, -5.5]) for (const cz of [-7.5, -1.5]) for (const dx of [-.8, .8]) FURN.push(['desk', cx + dx, cz - .45, Math.PI], ['desk', cx + dx, cz + .45, 0]);
FURN.push(['plant', -18.3, -10.3, 1], ['plant', -1.7, -10.3, 1], ['cooler', -18.4, 2.6, 0], ['plant', -1.7, 2.7, 0]);
FURN.push(['mtable', -14.5, 7.3, 0], ['tv', -18.75, 7.3, Math.PI / 2], ['board', -14.5, 10.75, Math.PI]);
for (let x = -16.8; x <= -12.2; x += 1.15) FURN.push(['chair', x, 6.3, 0], ['chair', x, 8.3, Math.PI]);
FURN.push(['boss', -5.5, 8.2, 0], ['shelf', -1.4, 7.3, -Math.PI / 2], ['plant', -9.3, 10.4, 1], ['plant', -1.6, 10.4, 1], ['sofa', -7.6, 4.35, 0]);
FURN.push(['sofa', 3, -10.3, 0], ['sofa', 3, -5.75, Math.PI], ['ctable', 3, -8, 0], ['plant', -.4, -10.4, 1], ['plant', 8.3, -10.4, 1]);
FURN.push(['counter', 14, -10.4, 0], ['fridge', 18.4, -8, -Math.PI / 2], ['ktable', 13, -7, 0], ['chair', 12.2, -7.8, 0], ['chair', 13.8, -7.8, 0], ['chair', 12.2, -6.2, Math.PI], ['chair', 13.8, -6.2, Math.PI]);
for (const z of [4.5, 8.5, 12.5]) FURN.push(['shelf', 8, z, 0]);
for (const x of [18, 21, 24]) for (const z of [5, 9.5, 14]) FURN.push(['rack', x, z, 0]);
function furnSolids() {   // [x, z, r] у світових координатах
  const out = [];
  for (const [t, x, z, rot] of FURN) {
    const c = Math.cos(rot), s = Math.sin(rot), pt = (lx, lz, r) => out.push([CX + x + lx * c + lz * s, CZ + z - lx * s + lz * c, r]);
    if (t === 'desk') { pt(-.5, 0, .45); pt(.5, 0, .45); }
    else if (t === 'mtable') for (let k = -2.5; k <= 2.5; k++) pt(k, 0, .7);
    else if (t === 'sofa') { pt(-.7, 0, .5); pt(.7, 0, .5); }
    else if (t === 'counter') for (let k = -2.5; k <= 2.5; k++) pt(k, 0, .45);
    else if (t === 'ktable') { pt(-.6, 0, .55); pt(.6, 0, .55); }
    else if (t === 'boss') { pt(-.8, 0, .6); pt(.8, 0, .6); }
    else if (t === 'shelf' || t === 'rack') { pt(-.7, 0, .4); pt(0, 0, .4); pt(.7, 0, .4); }
    else if (t === 'ctable' || t === 'fridge' || t === 'cooler' || t === 'plant') pt(0, 0, .45);
  }
  return out;
}
A.on('world', () => {
  for (let i = 0; i < N; i++) { const p = TR[i]; for (const sd of [-1, 1]) if (!wallGap(i, sd)) { const o = sd * (TW / 2 + .15); addStatic(p.x - p.dz * o, p.z + p.dx * o, .3, 1.2); } }
  wallStatics(OW);
  for (const [x, z, r] of furnSolids()) addStatic(x, z, r, 1);
  for (const [x, z] of [[12, 5.5], [12.5, 10.5], [7, 15.5]]) addProp('crate', CX + x, CZ + z);
});
// дверні прорізи в стінах коридору (у кабінети) — лише там, де за стіною кабінет
function wallGap(i, sd) {
  const p = TR[i], o = sd * (TW / 2 + 1.2), x = p.x - p.dz * o - CX, z = p.z + p.dx * o - CZ;
  if (Math.abs(x) > 25 || Math.abs(z) > 17) return false;          // зовнішня стіна будівлі
  return (i + (sd > 0 ? 0 : 11)) % 22 < 2;
}
A.island({ id: 'chairrace', n: 'Гонки на кріслах', sub: 'PVP · 3 кола крізь опенспейс', x: CX, z: CZ, r: ISL_R, top: '#D8D0EA', rock: '#8C84C6', biome: 'racetrack', tier: 1, safe: true });
const _buildIsland = buildIsland;
buildIsland = function (s) { if (s.biome !== 'racetrack') return _buildIsland.apply(this, arguments); return SIMSIDE ? new THREE.Group() : buildTrackMesh(); };

/* ---------- Стан заїзду (сервер світу або сам гравець) ---------- */
const ST = { ph: 'idle', t: 0, cnt: 0, racers: [], traps: [], boxes: ITEM_SPOTS.map(() => [0, 0, 0]), res: [], id: 0 };
const AU = { stT: 0, botId: 0 };
const BOT_NAMES = ['Бот Кент', 'Бухгалтерка Люда', 'Стажер Вітя', 'HR Олена', 'Сисадмін Гена'];
const myKey = () => (NET.on && typeof WORLD !== 'undefined' && WORLD.on ? myName() : 'me');
const keyOf = from => SIMSIDE ? String(from && from.name || '') : 'me';
const r2 = v => Math.round(v * 100) / 100;
const score = r => r.fin ? 1e6 - r.fin : r.lap * N + r.idx;
function ranking() { return ST.racers.slice().sort((a, b) => score(b) - score(a)); }
function snap() {
  return { ph: ST.ph, t: r2(ST.t), c: r2(ST.cnt), id: ST.id, r: ST.racers.map(r => [r.k, r.bot ? 1 : 0, r.lap, r.idx, r2(r.fin || 0), r.bot ? r2(r.x) : 0, r.bot ? r2(r.z) : 0, r.bot ? r2(r.h) : 0, r2(r.spin || 0), r2(r.drunk || 0)]),
    tp: ST.traps.map(t => [t.id, r2(t.x), r2(t.z)]), b: ST.boxes.map(b => b.map(v => v > 0 ? 1 : 0)), res: ST.res };
}
function applySnap(d) {
  ST.ph = d.ph || 'idle'; ST.t = +d.t || 0; ST.cnt = +d.c || 0; ST.id = d.id | 0; ST.res = Array.isArray(d.res) ? d.res.slice(0, 8) : [];
  if (Array.isArray(d.r)) {
    const old = new Map(ST.racers.map(r => [r.k, r]));
    ST.racers = d.r.slice(0, MAXR).map(a => {
      const r = old.get(a[0]) || { k: String(a[0]) };
      Object.assign(r, { bot: !!a[1], lap: a[2] | 0, idx: a[3] | 0, fin: +a[4] || 0, spin: +a[8] || 0, drunk: +a[9] || 0 });
      if (r.bot) { r.tx = +a[5]; r.tz = +a[6]; r.th = +a[7]; if (r.x == null) { r.x = r.tx; r.z = r.tz; r.h = r.th; } }
      return r;
    });
  }
  if (Array.isArray(d.tp)) ST.traps = d.tp.slice(0, 12).map(a => ({ id: a[0], x: +a[1], z: +a[2] }));
  if (Array.isArray(d.b)) d.b.slice(0, ITEM_SPOTS.length).forEach((b, i) => { ST.boxes[i] = b.map(v => v ? 1 : 0); });
}
function pushState() { if (SIMSIDE) A.send('st', snap()); }
function emit(e) { if (SIMSIDE) A.send('ev', e); else onEvent(e); }
function req(k, d) { const o = Object.assign({ k }, d || {}); if (AUTH()) onReq(o, { id: NET.id, name: myName() }); else A.send('rq', o); }
A.onNet('st', (d, from) => { if (!SIMSIDE && !AUTH() && from.id === -1 && d) applySnap(d); });
A.onNet('ev', (d, from) => { if (!SIMSIDE && !AUTH() && from.id === -1 && d) onEvent(d); });
A.onNet('rq', (d, from) => { if (SIMSIDE && d) onReq(d, from); });

function onReq(d, from) {
  const k = keyOf(from), r = ST.racers.find(q => q.k === k);
  if (d.k === 'join') {
    if (r || ST.racers.filter(q => !q.bot).length >= MAXR) return;
    if (ST.ph !== 'idle' && ST.ph !== 'lobby') { emit({ k: 'msg', to: k, txt: '🏁 Заїзд уже йде — дочекайся наступного (дивись і вболівай!).' }); return; }
    ST.racers = ST.racers.filter(q => !q.bot);
    ST.racers.push({ k, bot: false, lap: -1, idx: 0, fin: 0 });
    if (ST.ph === 'idle') { ST.ph = 'lobby'; ST.cnt = SIMSIDE ? 12 : 2; ST.id++; ST.res = []; }
    emit({ k: 'msg', txt: `🪑 ${SIMSIDE ? escapeHTML(k) : 'Ти'} на старті! ${SIMSIDE ? 'Хто ще — F біля старту.' : ''}` }); pushState();
  } else if (d.k === 'leave') {
    if (!r) return; ST.racers = ST.racers.filter(q => q !== r);
    if (!ST.racers.some(q => !q.bot)) resetRace(); pushState();
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
  else if (d.k === 'hit') { const v = ST.racers.find(q => q.k === d.to); if (v) hitRacer(v, d.how || 'spin', k); }
  else if (d.k === 'tea') { const lead = ranking().find(q => q.k !== k && !q.fin); if (lead) hitRacer(lead, 'tea', k); }
  else if (d.k === 'shot') emit({ k: 'shot', x: +d.x, z: +d.z, h: +d.h, from: k });
}
function rollItem(r) {
  const rank = r ? ranking().indexOf(r) : 0;
  return rank >= 2 ? pick(['coffee', 'coffee', 'tea', 'stapler']) : rank === 1 ? pick(['coffee', 'stapler', 'folder', 'tea']) : pick(['stapler', 'folder', 'folder', 'coffee']);
}
function hitRacer(v, how, by) {
  if (v.bot) { if (how === 'tea') v.drunk = 3; else { v.spin = 1; v.v = 2; } }
  emit({ k: 'hit', to: v.k, how, by });
}
function finish(r) {
  if (r.fin) return;
  r.fin = r2(ST.t); r.lap = LAPS;
  const place = ST.racers.filter(q => q.fin).length;
  emit({ k: 'fin', who: r.k, place, time: r.fin, bot: r.bot ? 1 : 0 });
  if (!AU.firstFin) AU.firstFin = ST.t;
}
function resetRace() { ST.ph = 'idle'; ST.racers = []; ST.traps = []; ST.cnt = 0; ST.t = 0; AU.firstFin = 0; }
function startCount() {
  let k = 0; while (ST.racers.length < MAXR) ST.racers.push({ k: BOT_NAMES.filter(n => !ST.racers.some(q => q.k === n))[k++ % 3] || 'Бот ' + ++AU.botId, bot: true, lap: -1, idx: 0, fin: 0, skill: rand(.84, .97) });
  ST.racers.forEach((r, i) => { const g = GRID(i); r.slot = i; r.lap = -1; r.idx = nearIdx(g.x, g.z);   // стоять перед лінією: перетнули — почалось коло 1
   r.fin = 0; if (r.bot) Object.assign(r, { x: g.x, z: g.z, h: g.h, v: 0, spin: 0, drunk: 0, item: '', itemT: rand(1, 3), lane: rand(-1.2, 1.2) }); });
  ST.ph = 'count'; ST.cnt = 3.5; ST.t = 0; ST.traps = []; AU.firstFin = 0;
  emit({ k: 'grid', id: ST.id, slots: ST.racers.map(r => r.k) }); pushState();
}
function endRace(why) {
  ST.ph = 'end'; ST.cnt = 8;
  ST.res = ranking().map(r => r.k);
  emit({ k: 'end', res: ST.res, why: why || '' }); pushState();
}
function authTick(dt) {
  if (ST.ph === 'idle') return;
  if (ST.racers.length && SIMSIDE) {   // хто пішов зі світу — вибуває
    const on = new Set(simPlayers().filter(p => inRace(p.x, p.z)).map(p => p.name));
    const left = ST.racers.filter(r => !r.bot && !on.has(r.k)); if (left.length) { ST.racers = ST.racers.filter(r => !left.includes(r)); if (!ST.racers.some(q => !q.bot)) { resetRace(); pushState(); return; } }
  }
  if (ST.ph === 'lobby') { ST.cnt -= dt; if (ST.cnt <= 0) startCount(); }
  else if (ST.ph === 'count') { ST.cnt -= dt; if (ST.cnt <= 0) { ST.ph = 'race'; ST.t = 0; emit({ k: 'go' }); } }
  else if (ST.ph === 'race') {
    ST.t += dt;
    for (const r of ST.racers) if (r.bot && !r.fin) botTick(r, dt);
    for (let i = 0; i < ST.boxes.length; i++) for (let s = 0; s < 3; s++) if (!ST.boxes[i][s] && (AU['box' + i + '_' + s] = (AU['box' + i + '_' + s] || 0) - dt) <= 0) ST.boxes[i][s] = 1;
    for (const t of ST.traps) t.t = (t.t || 18) - dt; ST.traps = ST.traps.filter(t => t.t > 0);
    const humans = ST.racers.filter(r => !r.bot);
    if (humans.length && humans.every(r => r.fin)) endRace();
    else if (AU.firstFin && ST.t - AU.firstFin > 40) endRace('Час вийшов — решта не доїхала.');
    else if (ST.t > 300) endRace('5 хвилин минуло.');
  } else if (ST.ph === 'end') { ST.cnt -= dt; if (ST.cnt <= 0) { resetRace(); pushState(); } }
  AU.stT -= dt; if (AU.stT <= 0) { AU.stT = ST.ph === 'race' || ST.ph === 'count' ? .1 : .5; pushState(); }
}
/* бот: їде за лінією траси, трохи зрізає, користується предметами */
function botTick(r, dt) {
  r.idx = nearIdx(r.x, r.z, r.idx);
  if (r.spin > 0) { r.spin -= dt; r.h += 11 * dt; r.v *= Math.exp(-3 * dt); }
  else {
    const look = TR[wrapI(r.idx + 4)], lx = look.x - look.dz * r.lane, lz = look.z + look.dx * r.lane;
    let tg = Math.atan2(lz - r.z, lx - r.x); if (r.drunk > 0) { r.drunk -= dt; tg += Math.sin(ST.t * 3 + r.slot) * .7; }
    let dh = tg - r.h; dh = Math.atan2(Math.sin(dh), Math.cos(dh)); r.h += clamp(dh, -3 * dt, 3 * dt);
    const lead = ranking()[0], behind = lead && lead !== r ? Math.min(1, (score(lead) - score(r)) / N) : 0;   // хто відстає — трохи швидший
    const ah = TR[wrapI(r.idx + 6)], turn = 1 - (ah.dx * TR[r.idx].dx + ah.dz * TR[r.idx].dz);   // попереду поворот — пригальмувати
    const vmax = (r.boost > 0 ? VBOOST : VMAX) * (r.skill + behind * .08) * (Math.abs(dh) > .6 || turn > .3 ? .7 : 1);
    r.v += (vmax - r.v) * Math.min(1, dt * 1.6); if (r.boost > 0) r.boost -= dt;
    if (Math.random() < dt * .3) r.lane = clamp(r.lane + rand(-.8, .8), -1.6, 1.6);
  }
  r.x += Math.cos(r.h) * r.v * dt; r.z += Math.sin(r.h) * r.v * dt;
  const p = TR[r.idx], ox = r.x - p.x, oz = r.z - p.z, lat = -ox * p.dz + oz * p.dx;
  if (Math.abs(lat) > TW / 2 - .6) { const s = Math.sign(lat) * (TW / 2 - .6); r.x = p.x - p.dz * s; r.z = p.z + p.dx * s; r.v *= .85; const th = Math.atan2(p.dz, p.dx); let d2 = th - r.h; d2 = Math.atan2(Math.sin(d2), Math.cos(d2)); r.h += d2 * .5; r.lane = -Math.sign(lat) * .5; }   // від стіни — назад на трасу
  for (const z of ZOMBIES) { const q = zombiePos(z, ST.t); if (dist2(r.x, r.z, q.x, q.z) < 1 && !(r.spin > 0)) { r.spin = .8; r.v *= .4; } }
  for (const t of ST.traps) if (dist2(r.x, r.z, t.x, t.z) < .9) { ST.traps = ST.traps.filter(q => q !== t); r.spin = 1; r.v = 2; break; }
  for (const b of BOOSTS) if (dist2(r.x, r.z, TR[b].x, TR[b].z) < 1.6) r.boost = Math.max(r.boost || 0, .7);
  // коробки з предметами
  ITEM_SPOTS.forEach((si, i) => [-1, 0, 1].forEach((o, s) => { if (ST.boxes[i][s] && !r.item) { const p = TR[si]; if (dist2(r.x, r.z, p.x - p.dz * o * 1.6, p.z + p.dx * o * 1.6) < .9) { ST.boxes[i][s] = 0; AU['box' + i + '_' + s] = 4; r.item = rollItem(r); r.itemT = rand(.5, 2.5); } } }));
  if (r.item && (r.itemT -= dt) <= 0) {
    if (r.item === 'coffee') r.boost = 1.6;
    else if (r.item === 'folder') { ST.traps.push({ id: ++AU.botId, x: r2(r.x - Math.cos(r.h) * 1.3), z: r2(r.z - Math.sin(r.h) * 1.3), t: 18 }); }
    else if (r.item === 'tea') { const lead = ranking().find(q => q !== r && !q.fin); if (lead) hitRacer(lead, 'tea', r.k); }
    else if (r.item === 'stapler') {
      emit({ k: 'shot', x: r.x, z: r.z, h: r.h, from: r.k });
      const ahead = ST.racers.filter(q => q !== r && !q.fin).map(q => ({ q, ...posOf(q) })).find(o => { const dx = o.x - r.x, dz = o.z - r.z, d = Math.hypot(dx, dz); return d < 12 && (dx * Math.cos(r.h) + dz * Math.sin(r.h)) / d > .93; });
      if (ahead && Math.random() < .6) hitRacer(ahead.q, 'spin', r.k);
    }
    r.item = '';
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
const RC = { on: false, x: 0, z: 0, h: 0, v: 0, idx: 0, lap: 0, prev: 0, fin: false, item: '', boost: 0, spin: 0, drunk: 0, ix: 0, iz: 0, progT: 0, bonkT: 0, place: 0 };
const V = { chairs: new Map(), boxes: [], traps: new Map(), zomb: [], shots: [], hud: null, goalEl: null, lbl: null, tags: new Map(), auto: false, music: -1, lastPh: '', arrow: null, chair: null, startLbl: null, intro: false };
const amIn = () => ST.racers.some(r => r.k === myKey());

/* ---------- Модель: острів, траса, перегородки, кулери, старт ---------- */
function buildTrackMesh() {
  const g = new THREE.Group(); scene.add(g);
  const disc = flat(new THREE.CylinderGeometry(ISL_R, ISL_R * .8, 1.6, 40)); put(g, mesh(disc, '#C9C0E0', false, true), CX, -.8, CZ);
  put(g, mesh(flat(new THREE.ConeGeometry(ISL_R * .8, 9, 30)), '#8C84C6', false), CX, -6.1, CZ).rotation.x = Math.PI;
  put(g, mesh(new THREE.CircleGeometry(ISL_R - .2, 40), '#E3DCF2', false, true), CX, .005, CZ).rotation.x = -Math.PI / 2;
  // підлога траси — синій офісний ковролін, обочини — смужки
  for (let i = 0; i < N; i++) {
    const p = TR[i], seg = mesh(new THREE.BoxGeometry(p.l + .12, .04, TW), i % 16 < 8 ? '#5A6BB5' : '#5464AC', false, true);
    seg.position.set(p.x + p.dx * p.l / 2, .02, p.z + p.dz * p.l / 2); seg.rotation.y = -Math.atan2(p.dz, p.dx); g.add(seg);
    if (i % 2 === 0) for (const s of [-1, 1]) { const e = mesh(new THREE.BoxGeometry(p.l * 2 + .1, .05, .18), (i >> 1) % 2 ? '#FFFFFF' : '#FF5C7A', false); e.position.set(p.x + p.dx * p.l - p.dz * s * (TW / 2 - .09), .045, p.z + p.dz * p.l + p.dx * s * (TW / 2 - .09)); e.rotation.y = -Math.atan2(p.dz, p.dx); g.add(e); }
  }
  // підлоги кабінетів
  const K = officeKit(g), F = (x0, z0, x1, z1, c) => K.floor(CX + x0, CZ + z0, CX + x1, CZ + z1, c);
  F(-26, -18, 26, 18, '#C9CDD9');
  F(-19, -11, -1, 3.5, '#6E7FC8'); F(-19, 3.5, -10, 11, '#7E6FB8'); F(-10, 3.5, -1, 11, '#8C5A3C'); F(-1, -11, 9, -5, '#C4956A'); F(5, 1, 15, 17.4, '#B8BECC'); F(15, 1, 26, 17.4, '#3E3A5C');
  K.tiles(CX + 9, CZ - 11, CX + 19, CZ - 5, '#FFFFFF', '#DCD6EA');
  // стіни коридорів (суцільні й скляні) з дверима в кабінети
  for (let i = 0; i < N; i++) {
    const p = TR[i], ang = -Math.atan2(p.dz, p.dx), glass = ((i / 9) | 0) % 3 === 1;
    for (const sd of [-1, 1]) {
      if (wallGap(i, sd)) continue;
      const o = sd * (TW / 2 + .15), w = mesh(new THREE.BoxGeometry(p.l + .06, glass ? 1.5 : 1.15, .2), glass ? mat('#BFE6FF', { transparent: true, opacity: .35 }) : '#ECE6FB', !glass);
      w.position.set(p.x + p.dx * p.l / 2 - p.dz * o, glass ? .75 : .575, p.z + p.dz * p.l / 2 + p.dx * o); w.rotation.y = ang; g.add(w);
      const t = mesh(new THREE.BoxGeometry(p.l + .06, .08, .26), '#9F8BE0', false); t.position.set(w.position.x, glass ? 1.54 : 1.19, w.position.z); t.rotation.y = ang; g.add(t);
    }
  }
  wallMeshes(g, OW);
  for (const [t, x, z, rot] of FURN) {
    const X = CX + x, Z = CZ + z;
    if (t === 'desk') K.desk(X, Z, rot);
    else if (t === 'chair') K.chair(X, Z, rot);
    else if (t === 'mtable') K.table(X, Z, 6, 1.4, '#4E3A7C');
    else if (t === 'ktable') K.table(X, Z, 2.4, 1.2, '#E8DCC8');
    else if (t === 'ctable') { const o = K.table(X, Z, 1.6, .8, '#6B4A3A'); o.scale.y = .6; }
    else if (t === 'sofa') K.sofa(X, Z, rot, 2.6, x < -1 ? '#6B4A3A' : '#8F7BD6');
    else if (t === 'plant') K.plant(X, Z, rot);
    else if (t === 'cooler') K.cooler(X, Z);
    else if (t === 'tv') K.tv(X, Z, rot);
    else if (t === 'board') K.board(X, Z, rot, 2.4);
    else if (t === 'counter') K.counter(X, Z, rot, 6);
    else if (t === 'fridge') K.fridge(X, Z, rot);
    else if (t === 'boss') K.bossDesk(X, Z, rot);
    else if (t === 'shelf') K.shelf(X, Z, rot, 2.4);
    else if (t === 'rack') { const o = new THREE.Group(); put(o, mesh(new THREE.BoxGeometry(2, 2, .8), '#2E2346'), 0, 1, 0); for (let k = 0; k < 6; k++) put(o, mesh(new THREE.BoxGeometry(.08, .05, .02), bulb(k % 3 ? '#7FE08A' : '#6BE7FF'), false), -.7 + k * .28, .4 + (k % 3) * .55, .41); o.position.set(X, 0, Z); g.add(o); }
  }
  // старт / фініш: шашечки й арка
  const s0 = TR[0], ang = -Math.atan2(s0.dz, s0.dx);
  for (let k = 0; k < 8; k++) for (let j = 0; j < 2; j++) { const o = -TW / 2 + (k + .5) * TW / 8, m = mesh(new THREE.BoxGeometry(.35, .05, TW / 8), (k + j) % 2 ? '#2E2346' : '#FFFFFF', false); m.position.set(s0.x + s0.dx * (j - .5) * .35 - s0.dz * o, .05, s0.z + s0.dz * (j - .5) * .35 + s0.dx * o); m.rotation.y = ang; g.add(m); }
  for (const s of [-1, 1]) put(g, mesh(new THREE.BoxGeometry(.3, 3.2, .3), '#4E4A6E'), s0.x - s0.dz * s * (TW / 2 + .3), 1.6, s0.z + s0.dx * s * (TW / 2 + .3));
  const bar = put(g, mesh(new THREE.BoxGeometry(.3, .5, TW + 1), bulb('#FF6BD6'), false), s0.x, 3.1, s0.z); bar.rotation.y = ang;
  // бустери: кавові стрілки на підлозі
  for (const b of BOOSTS) { const p = TR[b]; for (let k = 0; k < 3; k++) { const c = mesh(new THREE.ConeGeometry(.45, .9, 3), bulb('#FFB347'), false); const wr = new THREE.Group(); wr.add(c); c.rotation.set(Math.PI / 2, 0, -Math.PI / 2); wr.position.set(p.x + p.dx * (k - 1) * .9, .07, p.z + p.dz * (k - 1) * .9); wr.rotation.y = -Math.atan2(p.dz, p.dx); g.add(wr); } }
  // стенд «старт» (записатися)
  put(g, mesh(new THREE.BoxGeometry(1.2, 1.1, .6), '#4E3A7C'), START.x, .55, START.z);
  put(g, mesh(new THREE.BoxGeometry(1.25, .08, .65), bulb('#7FE08A'), false), START.x, 1.12, START.z);
  // коробки з предметами (оживають), пастки, зомбі — динамічні
  ITEM_SPOTS.forEach((si, i) => { const p = TR[si]; V.boxes[i] = [-1, 0, 1].map(o => { const m = mesh(new THREE.BoxGeometry(.6, .6, .6), mat('#FFE066', { emissive: '#FFB347', emissiveIntensity: .5, transparent: true, opacity: .9 }), false); m.position.set(p.x - p.dz * o * 1.6, .6, p.z + p.dx * o * 1.6); scene.add(A.dynamic(m)); const q = mesh(new THREE.BoxGeometry(.12, .3, .62), '#2E2346', false); q.position.y = .05; m.add(q); return m; }); });
  for (const z of ZOMBIES) { const h = buildOffice(pick(['#AFC4B6', '#C9D6CF']), pick(['#3E4A7C', '#5A6BB5'])); h.root.scale.setScalar(.95); scene.add(A.dynamic(h.root)); V.zomb.push({ z, h }); }
  return g;
}
function chairOf(k) {
  let c = V.chairs.get(k); if (c) return c;
  const g = new THREE.Group(); const ch = bodyMesh('chair'); g.add(ch);
  const r = ST.racers.find(q => q.k === k);
  if (r && r.bot) { const h = buildOffice(pick(['#AFC4B6', '#D9C7A9', '#C9D6CF']), pick(['#E0607E', '#7FE08A', '#6BB8FF', '#FFB347'])); h.root.position.set(0, .2, .05); h.l1.rotation.x = h.l2.rotation.x = -1.4; h.body.position.y = -.25; g.add(h.root); c = { g, h }; }
  else c = { g };
  scene.add(g); V.chairs.set(k, c); return c;
}

/* ---------- Події ---------- */
function onEvent(e) {
  if (SIMSIDE || !e) return;
  const here = running && inRace(pl.x, pl.z);
  if (e.k === 'msg') { if (here && (!e.to || e.to === myKey())) toast(e.txt); }
  else if (e.k === 'grid') { if (e.slots.includes(myKey())) seatMe(e.slots.indexOf(myKey())); }
  else if (e.k === 'go') { if (here) { banner('🏁 ПОЇХАЛИ!'); sfx('level'); } }
  else if (e.k === 'box') { if (e.to === myKey() && RC.on && !RC.item) { RC.item = e.item; sfx('pick'); ftext(pl.x, 2.6, pl.z, ICON[e.item] + ' ' + ITN[e.item], 'gold'); } }
  else if (e.k === 'hit') {
    if (e.to === myKey() && RC.on) {
      if (e.how === 'tea') { RC.drunk = 3.5; ftext(pl.x, 2.6, pl.z, `🍵 ${e.by && e.by !== 'me' ? escapeHTML(e.by) + ' напоїв тебе чаєм' : 'Чай!'} — світ пливе!`, 'bad'); }
      else { RC.spin = 1; RC.v = 2; shake = Math.max(shake, .4); sfx('hurt'); ftext(pl.x, 2.6, pl.z, 'Закрутило! 🌀', 'bad'); }
    } else if (here) { const r = ST.racers.find(q => q.k === e.to); if (r) { const p = posOf(r); burst(p.x, 1, p.z, e.how === 'tea' ? '#7FE08A' : '#FFE066', 10, 3, .5, 2); } }
  }
  else if (e.k === 'shot') { if (here && e.from !== myKey()) addShot(e.x, e.z, e.h, false); }
  else if (e.k === 'fin') {
    if (!here) return;
    if (e.who === myKey()) { RC.fin = true; banner(`🏁 Фініш! ${e.place} місце · ${fmtT(e.time)}`); sfx(e.place === 1 ? 'legend' : 'level'); }
    else toast(`🏁 ${escapeHTML(e.who === 'me' ? 'Ти' : e.who)} фінішує ${e.place}-м (${fmtT(e.time)})`);
  }
  else if (e.k === 'end') finishMe(e);
}
const ICON = { coffee: '☕', stapler: '📎', folder: '📁', tea: '🍵' }, ITN = { coffee: 'кава — прискорення', stapler: 'степлер — стріляє вперед', folder: 'папка — пастка позаду', tea: 'чай — лідер п\'яніє' };
const fmtT = t => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;
function seatMe(slot) {
  const g = GRID(slot); Object.assign(RC, { on: true, x: g.x, z: g.z, h: g.h, v: 0, idx: nearIdx(g.x, g.z), lap: -1, prev: nearIdx(g.x, g.z), fin: false, item: '', boost: 0, spin: 0, drunk: 0 });
  closePanel(); toast('🪑 Сідай зручніше: WASD — керуй, ПРОБІЛ / ЛКМ — предмет. 3 кола!');
}
function finishMe(e) {
  const was = RC.on || amIn(); RC.on = false; RC.item = '';
  if (!was || !running) return;
  const place = (e.res || []).indexOf(myKey()) + 1;
  if (place > 0) {
    const coins = [0, 120, 70, 40, 20][place] || 10, xp = [0, 150, 100, 70, 50][place] || 40;
    P.coins += coins; addXP(xp);
    const d = A.data(); d.races = (d.races || 0) + 1; if (place === 1) d.wins = (d.wins || 0) + 1; d.best = d.best && d.best < 1e5 ? d.best : 0;
    banner(place === 1 ? '🏆 ПЕРЕМОГА! Ти найшвидший офісник!' : `🏁 ${place} місце`);
    toast(`Результати: ${e.res.map((k, i) => `${i + 1}. ${escapeHTML(k === 'me' ? 'Ти' : k)}`).join(' · ')}<br>Нагорода: <b>+${coins} 🪙</b> · +${xp} досвіду${e.why ? '<br>' + e.why : ''}`);
    refreshHUD(); save();
  }
  pl.emoteT = 0;
}

/* ---------- Моє крісло: фізика й керування ---------- */
function drive(dt) {
  if (!RC.on) return;
  const canGo = ST.ph === 'race' && !RC.fin;
  let ix = canGo ? RC.ix : 0, iz = canGo ? RC.iz : 0;
  if (RC.drunk > 0) { RC.drunk -= dt; const a = Math.sin(gameTime * 2.4) * .9, c = Math.cos(a), s = Math.sin(a); [ix, iz] = [ix * c - iz * s, ix * s + iz * c]; }
  if (RC.spin > 0) { RC.spin -= dt; RC.h += 12 * dt; RC.v *= Math.exp(-3 * dt); }
  else {
    const m = Math.min(1, Math.hypot(ix, iz));
    if (m > .15) {
      let dh = Math.atan2(iz, ix) - RC.h; dh = Math.atan2(Math.sin(dh), Math.cos(dh));
      RC.h += clamp(dh, -3.4 * dt, 3.4 * dt);
      const vmax = RC.boost > 0 ? VBOOST : VMAX;
      RC.v += (Math.cos(dh) > -.2 ? 9 : -14) * m * dt; RC.v = clamp(RC.v, -3, vmax);
    } else RC.v *= Math.exp(-1.1 * dt);
    if (RC.boost > 0) { RC.boost -= dt; RC.v = Math.max(RC.v, VBOOST * .9); if (Math.random() < dt * 20) burst(RC.x - Math.cos(RC.h), .5, RC.z - Math.sin(RC.h), '#FFB347', 1, 1, .4, .5); }
  }
  RC.x += Math.cos(RC.h) * RC.v * dt; RC.z += Math.sin(RC.h) * RC.v * dt;
  // борти траси
  RC.idx = nearIdx(RC.x, RC.z, RC.idx);
  const p = TR[RC.idx], lat = -(RC.x - p.x) * p.dz + (RC.z - p.z) * p.dx, lim = TW / 2 - .6;
  if (Math.abs(lat) > lim) { const s = Math.sign(lat) * lim; RC.x = p.x - p.dz * s; RC.z = p.z + p.dx * s; RC.v *= .55; if ((RC.bonkT -= dt) <= 0) { RC.bonkT = .4; sfx('hit', RC.x, RC.z); shake = Math.max(shake, .15); } }
  // інші гонщики — штовхаємось
  for (const r of ST.racers) { if (r.k === myKey()) continue; const q = posOf(r), d = dist2(RC.x, RC.z, q.x, q.z); if (d < 1 && d > .01) { RC.x += (RC.x - q.x) / d * (1 - d) * .6; RC.z += (RC.z - q.z) / d * (1 - d) * .6; RC.v *= .92; } }
  if (canGo) {
    // зомбі-офісники переходять дорогу
    for (const z of ZOMBIES) { const q = zombiePos(z, ST.t); if (dist2(RC.x, RC.z, q.x, q.z) < 1 && !(RC.spin > 0)) { RC.spin = .8; RC.v *= .4; sfx('hurt'); ftext(RC.x, 2.6, RC.z, pick(['Обережно, я на нараду!', 'Ей! Мій звіт!', 'Дивись куди їдеш!']), 'bad'); } }
    for (const t of ST.traps) if (dist2(RC.x, RC.z, t.x, t.z) < .9 && !(RC.spin > 0)) { req('untrap', { id: t.id }); ST.traps = ST.traps.filter(q => q !== t); RC.spin = 1; RC.v = 2; sfx('hurt'); ftext(RC.x, 2.6, RC.z, '📁 Папка під колесами!', 'bad'); break; }
    for (const b of BOOSTS) if (dist2(RC.x, RC.z, TR[b].x, TR[b].z) < 1.6 && RC.boost <= 0) { RC.boost = .8; sfx('dash'); ftext(RC.x, 2.4, RC.z, '☕ Буст!', 'gold'); }
    if (!RC.item) ITEM_SPOTS.forEach((si, i) => [-1, 0, 1].forEach((o, s) => { if (!RC.item && !RC.wantBox && ST.boxes[i][s]) { const q = TR[si]; if (dist2(RC.x, RC.z, q.x - q.dz * o * 1.6, q.z + q.dx * o * 1.6) < 1) { RC.wantBox = 1; setTimeout(() => { RC.wantBox = 0; }, 300); req('box', { i, s }); } } }));
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
function addShot(x, z, h, mine) {
  const m = mesh(new THREE.BoxGeometry(.45, .14, .2), '#C9CDD9', false); m.position.set(x + Math.cos(h) * .9, .7, z + Math.sin(h) * .9); scene.add(m);
  V.shots.push({ m, h, t: 0, mine });
}
function updShots(dt) {
  for (let i = V.shots.length - 1; i >= 0; i--) {
    const s = V.shots[i]; s.t += dt; s.m.position.x += Math.cos(s.h) * 26 * dt; s.m.position.z += Math.sin(s.h) * 26 * dt; s.m.rotation.y += dt * 20;
    let hit = null;
    if (s.mine) for (const r of ST.racers) { if (r.k === myKey() || r.fin) continue; const q = posOf(r); if (dist2(q.x, q.z, s.m.position.x, s.m.position.z) < 1) { hit = r; break; } }
    if (hit) { req('hit', { to: hit.k, how: 'spin' }); burst(s.m.position.x, 1, s.m.position.z, '#FFE066', 10, 3, .5, 2); }
    if (hit || s.t > 1.2) { scene.remove(s.m); V.shots.splice(i, 1); }
  }
}

/* ---------- Кожен кадр ---------- */
function clientTick(dt) {
  const t = gameTime, here = running && inRace(pl.x, pl.z);
  if (RC.on && (!amIn() && ST.ph !== 'end' || !running)) { RC.on = false; pl.emoteT = 0; }
  if (RC.on && !pl.dead) drive(dt);
  updShots(dt);
  // крісла всіх гонщиків
  const seen = new Set();
  for (const r of ST.racers) {
    if (ST.ph === 'idle' || ST.ph === 'lobby') break;
    seen.add(r.k); const c = chairOf(r.k);
    let x, z, f;
    if (r.k === myKey() && RC.on) { x = RC.x; z = RC.z; f = pl.face; }
    else if (r.bot) { x = r.x; z = r.z; f = Math.atan2(Math.cos(r.h), Math.sin(r.h)) + (r.spin > 0 ? t * 12 : 0); }
    else { const p = Object.values(NET.players).find(q => q.name === r.k); if (!p) { c.g.visible = false; continue; } x = p.x; z = p.z; f = p.face; }
    c.g.visible = true; c.g.position.set(x, 0, z); c.g.rotation.y = f; c.g.rotation.z = r.drunk > 0 || (r.k === myKey() && RC.drunk > 0) ? Math.sin(t * 6) * .12 : 0;
  }
  for (const [k, c] of V.chairs) if (!seen.has(k)) { scene.remove(c.g); V.chairs.delete(k); }
  // коробки, пастки, зомбі
  V.boxes.forEach((row, i) => row.forEach((m, s) => { const on = !!ST.boxes[i][s]; m.visible = on; m.rotation.y = t * 1.5 + s; m.position.y = .6 + Math.sin(t * 3 + s) * .1; }));
  const tids = new Set(ST.traps.map(q => q.id));
  for (const tp of ST.traps) if (!V.traps.has(tp.id)) { const m = mesh(new THREE.BoxGeometry(.8, .06, .6), '#FFB347', false); m.position.set(tp.x, .07, tp.z); m.rotation.y = rand(0, 3); scene.add(m); V.traps.set(tp.id, m); }
  for (const [id, m] of V.traps) if (!tids.has(id)) { scene.remove(m); V.traps.delete(id); }
  for (const zz of V.zomb) { const q = zombiePos(zz.z, ST.ph === 'race' ? ST.t : t * .3), p = TR[zz.z.i]; zz.h.root.position.set(q.x, 0, q.z); const sg = Math.cos((ST.ph === 'race' ? ST.t : t * .3) * zz.z.sp + zz.z.i) > 0 ? 1 : -1; zz.h.root.rotation.y = Math.atan2(-p.dz * sg, p.dx * sg); zz.h.l1.rotation.x = Math.sin(t * 6) * .5; zz.h.l2.rotation.x = -Math.sin(t * 6) * .5; }
  if (ST.ph !== V.lastPh) { if (ST.ph === 'count' && here) banner('3… 2… 1…'); V.lastPh = ST.ph; }
  hud(); labels(here);
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
if (!SIMSIDE) addEventListener('pointerdown', e => { if (RC.on && typeof cv !== 'undefined' && e.target === cv && e.button === 0 && useItem()) e.stopPropagation(); }, true);

/* ---------- F: записатися на заїзд ---------- */
const _getInteract = getInteract;
getInteract = function () {
  if (!SIMSIDE && running && !pl.dead && inRace(pl.x, pl.z) && !RC.on && dist2(pl.x, pl.z, START.x, START.z) < 2.2) {
    if (amIn()) return { l: `🪑 Ти записаний — старт за ${Math.ceil(ST.cnt)} с`, fn: () => { } };
    if (ST.ph === 'idle' || ST.ph === 'lobby') return { l: `🏁 Записатися на заїзд (${ST.racers.filter(r => !r.bot).length}/${MAXR})`, fn: () => { req('join'); sfx('ding'); } };
    return { l: '🏁 Заїзд іде — дочекайся наступного', fn: () => { } };
  }
  return _getInteract.apply(this, arguments);
};

/* ---------- HUD, підказки, підписи ---------- */
function goal() {
  if (RC.on) {
    if (ST.ph === 'count') return 'Приготуйся! <b>WASD</b> — куди їхати, <b>ПРОБІЛ</b> — предмет.';
    if (RC.fin) return 'Ти на фініші — чекаємо інших.';
    if (RC.spin > 0) return '🌀 Закрутило! Зараз відпустить…';
    if (RC.drunk > 0) return '🍵 Тебе напоїли чаєм — керування пливе!';
    if (RC.item) return `У тебе ${ICON[RC.item]} <b>${ITN[RC.item]}</b> — тисни <b>ПРОБІЛ</b>.`;
    return 'Їдь за стрілками траси · збирай жовті коробки «?» · кавові стрілки на підлозі — буст.';
  }
  if (amIn()) return `Ти на старті! Заїзд за <b>${Math.ceil(ST.cnt)} с</b> — інші ще можуть записатися.`;
  if (ST.ph === 'race' || ST.ph === 'count') return 'Заїзд іде — дивись і чекай наступного (F біля старту).';
  return 'Підійди до <b>🏁 СТАРТ</b> (зелений стенд біля шашечок) і натисни <b>F</b> — записатися.';
}
function hud() {
  if (!V.hud) {
    V.hud = document.createElement('div'); V.hud.id = 'race-hud';
    V.hud.style.cssText = 'position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 64px);transform:translateX(-50%);z-index:2;pointer-events:none;background:rgba(46,35,70,.85);color:#fff;border-radius:14px;padding:7px 14px;font:700 13px/1.4 system-ui,sans-serif;text-align:center;box-shadow:0 6px 18px rgba(0,0,0,.25);white-space:nowrap';
    V.goalEl = document.createElement('div'); V.goalEl.id = 'race-goal';
    V.goalEl.style.cssText = 'position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 150px);transform:translateX(-50%);z-index:2;pointer-events:none;background:#FFE066;color:#2E2346;border-radius:12px;padding:7px 14px;font:700 14px/1.4 system-ui,sans-serif;text-align:center;box-shadow:0 6px 18px rgba(0,0,0,.25);width:max-content;max-width:min(560px,90vw)';
    document.body.appendChild(V.hud); document.body.appendChild(V.goalEl);
  }
  const show = running && !pl.dead && !panel && inRace(pl.x, pl.z);
  V.hud.style.display = V.goalEl.style.display = show ? '' : 'none';
  if (!show) return;
  let h;
  if (ST.ph === 'race' || ST.ph === 'count' || ST.ph === 'end') {
    const rk = ranking(), me = rk.findIndex(r => r.k === myKey());
    const list = rk.map((r, i) => `<span style="color:${r.k === myKey() ? '#FFE066' : '#fff'}">${i + 1}. ${escapeHTML(r.k === 'me' ? 'Ти' : r.k)}${r.fin ? ' 🏁' : ''}</span>`).join(' · ');
    h = `🪑 ГОНКИ НА КРІСЛАХ · ${ST.ph === 'count' ? 'старт через ' + Math.ceil(ST.cnt) : fmtT(ST.t)}${me >= 0 ? ` · <span style="color:#FFE066">місце ${me + 1}/${rk.length}</span> · коло ${Math.min(LAPS, Math.max(1, RC.lap + 1))}/${LAPS}` : ''}${RC.item ? ` · ${ICON[RC.item]}` : ''}<br><span style="font-weight:600;font-size:12px">${list}</span>`;
  } else h = `🪑 Гонки на офісних кріслах · <span style="font-weight:600">${ST.ph === 'lobby' ? `записано ${ST.racers.length}/${MAXR} · старт за ${Math.ceil(ST.cnt)} с` : 'F біля старту — записатися'}</span>`;
  if (V.hud.innerHTML !== h) V.hud.innerHTML = h;
  const gt = '👉 ' + goal(); if (V.goalEl.innerHTML !== gt) V.goalEl.innerHTML = gt;
}
function labels(here) {
  if (!V.lbl) {
    V.lbl = document.createElement('div'); V.lbl.style.cssText = 'position:fixed;inset:0;z-index:2;pointer-events:none'; document.body.appendChild(V.lbl);
    V.startLbl = document.createElement('div'); V.startLbl.style.cssText = 'position:absolute;left:0;top:0;padding:4px 10px;border-radius:10px;background:#FFE066;color:#2E2346;font:800 14px system-ui,sans-serif;white-space:nowrap'; V.startLbl.textContent = '🏁 СТАРТ — записатися (F)'; V.lbl.appendChild(V.startLbl);
    V.rooms = ROOMS.map(r => { const e = document.createElement('div'); e.style.cssText = 'position:absolute;left:0;top:0;padding:2px 8px;border-radius:9px;background:rgba(255,255,255,.75);color:#4E3A7C;font:700 11px system-ui,sans-serif;white-space:nowrap'; e.textContent = r.n; V.lbl.appendChild(e); return { r, e }; });
  }
  V.lbl.style.display = here && !panel ? '' : 'none'; if (!here) return;
  for (const { r, e } of V.rooms) { const q = screenPos(CX + r.x, 1.6, CZ + r.z); e.style.display = q.vis ? '' : 'none'; e.style.transform = `translate(${Math.round(q.x)}px,${Math.round(q.y)}px) translate(-50%,-100%)`; }
  const sp = screenPos(START.x, 2, START.z); V.startLbl.style.display = !RC.on && sp.vis ? '' : 'none'; V.startLbl.style.transform = `translate(${Math.round(sp.x)}px,${Math.round(sp.y)}px) translate(-50%,-100%)`;
  for (const r of ST.racers) {
    if (r.k === myKey() || !r.bot || ST.ph === 'idle' || ST.ph === 'lobby') continue;
    let el = V.tags.get(r.k); if (!el) { el = document.createElement('div'); el.style.cssText = 'position:absolute;left:0;top:0;padding:2px 7px;border-radius:8px;background:rgba(46,35,70,.8);color:#fff;font:700 11px system-ui,sans-serif;white-space:nowrap'; el.textContent = '🤖 ' + r.k; V.lbl.appendChild(el); V.tags.set(r.k, el); }
    const q = screenPos(r.x, 2.3, r.z); el.style.display = q.vis ? '' : 'none'; el.style.transform = `translate(${Math.round(q.x)}px,${Math.round(q.y)}px) translate(-50%,-100%)`;
  }
  for (const [k, el] of V.tags) if (!ST.racers.some(r => r.k === k && r.bot) || ST.ph === 'idle' || ST.ph === 'lobby') { el.remove(); V.tags.delete(k); }
  // стрілка-напрямок траси попереду
  if (!V.arrow) { V.arrow = new THREE.Group(); const c = mesh(new THREE.ConeGeometry(.3, .8, 3), bulb('#FFE066'), false); c.rotation.z = -Math.PI / 2; c.position.x = 1.6; V.arrow.add(c); scene.add(V.arrow); }
  V.arrow.visible = RC.on && ST.ph !== 'end';
  if (V.arrow.visible) { const q = TR[wrapI(RC.idx + 6)]; V.arrow.position.set(RC.x, .2, RC.z); V.arrow.rotation.y = -Math.atan2(q.z - RC.z, q.x - RC.x); }
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
function goRace() { const f = $('#fade'); closePanel(); if (f) f.style.opacity = 1; sfx('travel'); setTimeout(() => { pl.x = START.x + 1.2; pl.z = START.z; pl.y = 0; pl.falling = false; pl.jump = null; pl.safe = { x: START.x + 1.2, z: START.z }; camPos.set(pl.x, 20, pl.z + 15); camLook.set(pl.x, .5, pl.z); if (f) f.style.opacity = 0; toast('🪑 Гонки на кріслах! Підійди до 🏁 СТАРТ і натисни F, щоб записатися на заїзд.'); }, 260); return true; }
function leaveRace() { if (amIn()) req('leave'); RC.on = false; pl.emoteT = 0; return true; }
if (A.mode) A.mode({ id: 'chairrace', group: 'pvp', ic: '🪑', n: 'Гонки на кріслах', sub: 'до 4 гравців + боти · 3 кола · предмети', go: goRace, here: () => running && inRace(pl.x, pl.z), leave: leaveRace });
A.tab('chairrace', '🪑 Гонки', () => {
  const d = A.data(), here = inRace(pl.x, pl.z);
  return `<h3>🪑 Гонки на офісних кріслах</h3>
    <p style="font-size:13px;line-height:1.5;margin:4px 0 10px">PVP до 4 гравців (порожні місця займають боти). 3 кола крізь опенспейс — хто перший, той і отримує премію.</p>
    <div class="btns">${here ? (amIn() || ST.ph === 'race' ? '' : '<button class="btn" data-cr="join">🏁 Записатися на заїзд</button>') : '<button class="btn" data-cr="go">🪑 На трасу</button>'}</div>
    <div class="list" style="margin-top:10px;font-size:13px;line-height:1.55">
      <div>🎮 <b>WASD</b> / джойстик — у який бік їхати: крісло розвертається й розганяється туди. Від бортів відскакуєш і гальмуєш.</div>
      <div>📦 Жовті коробки «?» — предмет, <b>ПРОБІЛ</b> / ЛКМ — використати: ☕ прискорення · 📎 степлер уперед · 📁 пастка позаду · 🍵 чай лідеру.</div>
      <div>🧟 Зомбі-офісники переходять дорогу — збʼєш, закрутить. Кавові стрілки на підлозі — буст.</div>
      <div>🏆 Місце: 1 — 120 🪙, 2 — 70, 3 — 40, 4 — 20.</div>
    </div>
    <p class="muted" style="font-size:12px;margin-top:10px">Заїздів: ${d.races || 0} · перемог: ${d.wins || 0}</p>`;
}, e => {
  const b = e.target.closest('[data-cr]'); if (!b) return;
  if (b.dataset.cr === 'go') goRace(); else { req('join'); closePanel(); }
});
if (window.__ADDON_TEST) window.__race = { ST, AU, RC, TR, N, GRID, START, ITEM_SPOTS, BOOSTS, ZOMBIES, zombiePos, ranking, useItem, nearIdx, posOf };
