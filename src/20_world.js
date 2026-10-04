/* =====================================================================
   СЦЕНА, СВІТ І МОДЕЛІ (low-poly)
   ===================================================================== */
const IS_TOUCH = matchMedia('(pointer: coarse)').matches;
const DARK = matchMedia('(prefers-color-scheme: dark)').matches;
const cv = $('#cv');
const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
// тонмапінг: світлі поверхні м'яко «стискаються», а не вигорають у білу пляму
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = .85;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(DARK ? '#6A5A92' : '#D3C4EC', 60, 140);
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 400);
const hemi = new THREE.HemisphereLight(0xF0E8FF, 0xF5BBA8, DARK ? .7 : .85);
scene.add(hemi);
scene.add(new THREE.AmbientLight(0xffffff, .14));
const sun = new THREE.DirectionalLight(DARK ? 0xFFD9C2 : 0xFFF1DE, .78);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 90 });
sun.shadow.bias = -0.0008;
scene.add(sun, sun.target);

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

/* ---------- Матеріали ---------- */
const MC = {}, BC = {};
function mat(c, o) {
  const k = c + (o ? JSON.stringify(o) : '');
  if (!MC[k]) MC[k] = new THREE.MeshStandardMaterial(Object.assign({ color: c, flatShading: true, roughness: .85, metalness: 0 }, o || {}));
  return MC[k];
}
function glow(c) { return mat(c, { emissive: c, emissiveIntensity: .45 }); }
function basic(c, op) {
  const k = c + '|' + (op || 1);
  if (!BC[k]) BC[k] = new THREE.MeshBasicMaterial({ color: c, transparent: op != null, opacity: op == null ? 1 : op, depthWrite: op == null });
  return BC[k];
}
function mesh(geo, c, cast = true, recv = false) {
  const m = new THREE.Mesh(geo, typeof c === 'string' ? mat(c) : c);
  m.castShadow = cast; m.receiveShadow = recv;
  return m;
}
function put(parent, m, x, y, z) { m.position.set(x, y, z); parent.add(m); return m; }

function noise3(x, y, z) { const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453; return s - Math.floor(s); }
function rough(geo, amt, keepAboveY) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (keepAboveY != null && y >= keepAboveY - 1e-3) continue;
    const n = noise3(x, y, z), m = 1 + (n - .5) * amt;
    p.setXYZ(i, x * m, y + (noise3(z, x, y) - .5) * amt * 2, z * m);
  }
  return flat(geo);
}
function flat(geo) { const g = geo.index ? geo.toNonIndexed() : geo; g.computeVertexNormals(); return g; }

function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const wr = mulberry32(20261004);

/* ---------- Спільні геометрії ---------- */
const G = {
  leg: new THREE.BoxGeometry(.18, .5, .2),
  torso: flat(new THREE.CylinderGeometry(.34, .4, .72, 7)),
  head: new THREE.IcosahedronGeometry(.3, 0),
  arm: new THREE.BoxGeometry(.14, .5, .16),
  eye: new THREE.BoxGeometry(.07, .08, .03),
  bagEye: new THREE.BoxGeometry(.1, .04, .03),
  apron: new THREE.BoxGeometry(.56, .62, .06),
  cap: flat(new THREE.CylinderGeometry(.29, .31, .14, 7)),
  brim: new THREE.BoxGeometry(.42, .04, .24),
  tie: new THREE.BoxGeometry(.1, .42, .04),
  bag: new THREE.BoxGeometry(.42, .36, .2),
  barBg: new THREE.PlaneGeometry(1.04, .16),
  barFill: new THREE.PlaneGeometry(1, .1).translate(.5, 0, 0),
  cup: flat(new THREE.CylinderGeometry(.09, .07, .2, 7)),
  plank: new THREE.BoxGeometry(1, .16, .5),
  pick: new THREE.OctahedronGeometry(.26, 0),
  pickIng: new THREE.IcosahedronGeometry(.2, 0),
  coin: flat(new THREE.CylinderGeometry(.18, .18, .05, 8)),
  paper: new THREE.BoxGeometry(.32, .04, .4),
  part: new THREE.BoxGeometry(.14, .14, .14),
  memo: new THREE.BoxGeometry(.36, .04, .46),
  staple: new THREE.BoxGeometry(.06, .06, .3),
  caseBox: new THREE.BoxGeometry(.5, .36, .36),
};

/* ---------- Світ ---------- */
const STATICS = [];   // {x,z,r} — тверді перешкоди
const PROPS = [];     // предмети оточення, що ламаються
const NODES = [];     // точки інгредієнтів
const CHESTS = [];
const ISLMAP = {}; ISL.forEach(s => ISLMAP[s.id] = s);
const BR = BRIDGES.map(([a, b]) => {
  const A = ISLMAP[a], B = ISLMAP[b];
  let dx = B.x - A.x, dz = B.z - A.z; const d = Math.hypot(dx, dz); dx /= d; dz /= d;
  const ax = A.x + dx * (A.r - 1.2), az = A.z + dz * (A.r - 1.2);
  const bx = B.x - dx * (B.r - 1.2), bz = B.z - dz * (B.r - 1.2);
  return { bridge: true, n: 'Міст', ax, az, bx, bz, dx, dz, len: Math.hypot(bx - ax, bz - az), w: 2.6, A, B };
});

function onGround(x, z, margin = 0) {
  for (const s of ISL) if (dist2(x, z, s.x, s.z) < s.r - margin) return s;
  for (const b of BR) {
    const px = x - b.ax, pz = z - b.az, t = px * b.dx + pz * b.dz;
    if (t >= -0.2 && t <= b.len + .2) {
      const ox = px - b.dx * t, oz = pz - b.dz * t;
      if (Math.hypot(ox, oz) < b.w / 2 - margin) return b;
    }
  }
  return null;
}
function islandAt(x, z) { for (const s of ISL) if (dist2(x, z, s.x, s.z) < s.r) return s; return null; }

function inCorridor(x, z) {
  for (const b of BR) {
    if (!b.A) continue;
    for (const [isl, ex, ez] of [[b.A, b.ax, b.az], [b.B, b.bx, b.bz]]) {
      const vx = ex - isl.x, vz = ez - isl.z, L = Math.hypot(vx, vz);
      const ux = vx / L, uz = vz / L, px = x - isl.x, pz = z - isl.z;
      const t = clamp(px * ux + pz * uz, 0, L + 1);
      if (Math.hypot(px - ux * t, pz - uz * t) < 1.9) return true;
    }
  }
  return false;
}
function freeSpot(s, minR, maxR, gap) {
  for (let k = 0; k < 60; k++) {
    const a = wr() * Math.PI * 2, r = minR + wr() * (maxR - minR);
    const x = s.x + Math.cos(a) * r, z = s.z + Math.sin(a) * r;
    if (inCorridor(x, z)) continue;
    if (STATICS.some(o => dist2(x, z, o.x, o.z) < o.r + gap)) continue;
    if (PROPS.some(p => dist2(x, z, p.x, p.z) < p.r + gap)) continue;
    if (NODES.some(p => dist2(x, z, p.x, p.z) < 1.4)) continue;
    if (CHESTS.some(p => dist2(x, z, p.x, p.z) < 2)) continue;
    if (PADS.some(p => dist2(x, z, p.x, p.z) < 2.2)) continue;
    if (ICE.some(I => dist2(x, z, I.x, I.z) < I.r + .8) || PONDS.some(I => dist2(x, z, I.x, I.z) < I.r + 1)) continue;
    if ([...WAYPOINTS, ...NOTES, ...FISH_SPOTS].some(p => dist2(x, z, p.x, p.z) < 2)) continue;
    return { x, z };
  }
  return null;
}

function buildIsland(s) {
  if (s.biome === 'sea') return buildSea(s);
  const g = new THREE.Group(); g.position.set(s.x, 0, s.z); scene.add(g);
  const seg = Math.max(9, Math.round(s.r * 1.3));
  const top = flat(new THREE.CylinderGeometry(s.r, s.r * .95, .9, seg, 1).translate(0, -.45, 0));
  const tm = mesh(top, s.top, false, true); tm.material = tm.material.clone(); s.topMesh = tm; g.add(tm);
  const band = flat(new THREE.CylinderGeometry(s.r * .95, s.r * .86, 1.3, seg, 1).translate(0, -1.55, 0));
  g.add(mesh(band, '#E8B9A6', false, false));
  const h = s.r * 1.3;
  let cone = new THREE.ConeGeometry(s.r * .86, h, seg, 4);
  cone.rotateX(Math.PI); cone.translate(0, -2.2 - h / 2, 0);
  g.add(mesh(rough(cone, .32, -2.2), s.rock, false, false));
  // невеликі камінці під островом
  for (let i = 0; i < Math.ceil(s.r / 3); i++) {
    const r = .5 + wr() * 1.4;
    const rock = mesh(rough(new THREE.DodecahedronGeometry(r, 0), .3), s.rock, false);
    const a = wr() * Math.PI * 2, d = s.r * (.4 + wr() * .6);
    rock.position.set(Math.cos(a) * d, -h * (.6 + wr() * .5) - 3, Math.sin(a) * d);
    g.add(rock);
  }
  // травичка на краях
  for (let i = 0; i < s.r * 1.2; i++) {
    const a = wr() * Math.PI * 2, d = s.r * (.8 + wr() * .17);
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (inCorridor(s.x + x, s.z + z)) continue;
    const tuft = mesh(new THREE.ConeGeometry(.12 + wr() * .1, .35 + wr() * .3, 4), shade(s.top, -.12), false);
    tuft.position.set(x, .15, z); g.add(tuft);
  }
  return g;
}
function shade(hex, amt) { const c = new THREE.Color(hex); const hsl = {}; c.getHSL(hsl); c.setHSL(hsl.h, hsl.s, clamp(hsl.l + amt, 0, 1)); return '#' + c.getHexString(); }

function buildBridge(b) {
  const g = new THREE.Group(); scene.add(g);
  const yaw = Math.atan2(b.dx, b.dz), n = Math.ceil(b.len / .62);
  for (let i = 0; i < n; i++) {
    const t = (i + .5) * b.len / n;
    const p = mesh(G.plank, i % 2 ? '#D6A87B' : '#C4956A', false, true);
    p.scale.x = b.w;
    p.position.set(b.ax + b.dx * t, -.08 - Math.sin(Math.PI * t / b.len) * .12, b.az + b.dz * t);
    p.rotation.y = yaw + (noise3(i, b.ax, 3) - .5) * .08;
    g.add(p);
  }
  const px = b.dz, pz = -b.dx;
  for (const side of [-1, 1]) {
    const rope = mesh(new THREE.BoxGeometry(.06, .06, b.len), '#EBD8BE', false);
    rope.position.set((b.ax + b.bx) / 2 + px * side * b.w / 2, .55, (b.az + b.bz) / 2 + pz * side * b.w / 2);
    rope.rotation.y = yaw; g.add(rope);
    for (const [ex, ez] of [[b.ax, b.az], [b.bx, b.bz]]) {
      const post = mesh(flat(new THREE.CylinderGeometry(.09, .11, 1.1, 6)), '#A47C5B');
      post.position.set(ex + px * side * b.w / 2, .4, ez + pz * side * b.w / 2); g.add(post);
    }
  }
}

/* ---------- Декор ---------- */
const DEBRIS = [];
function addStatic(x, z, r, h = 2.5) { STATICS.push({ x, z, r, h }); }
function tree(x, z, blossom) {
  const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  const s = .8 + wr() * .5;
  put(g, mesh(flat(new THREE.CylinderGeometry(.14 * s, .2 * s, 1.2 * s, 6)), '#A3795C'), 0, .6 * s, 0);
  const col = blossom ? pick(['#F7B6C8', '#FFC9A8', '#F2A7C0']) : pick(['#7CCBA2', '#8FD3A4', '#6FBF9B']);
  put(g, mesh(rough(new THREE.IcosahedronGeometry(.95 * s, 0), .2), col), 0, 1.75 * s, 0);
  put(g, mesh(rough(new THREE.IcosahedronGeometry(.6 * s, 0), .2), shade(col, .05)), .35 * s, 2.45 * s, .1);
  addStatic(x, z, .55);
}
function desk(x, z, rot) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; scene.add(g);
  put(g, mesh(new THREE.BoxGeometry(1.6, .08, .8), '#F2E6D8'), 0, .76, 0);
  for (const [a, b] of [[-.72, -.32], [.72, -.32], [-.72, .32], [.72, .32]]) put(g, mesh(new THREE.BoxGeometry(.07, .74, .07), '#8E86B0'), a, .37, b);
  put(g, mesh(new THREE.BoxGeometry(.5, .34, .04), '#4E4A6E'), 0, 1.0, -.2);
  put(g, mesh(new THREE.BoxGeometry(.5, .3, .02), '#9FD8F5', false), 0, 1.0, -.17);
  addStatic(x, z, .9);
}
function cabinet(x, z, rot) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; scene.add(g);
  put(g, mesh(new THREE.BoxGeometry(.8, 1.7, .7), '#C9C2DE'), 0, .85, 0);
  for (let i = 0; i < 3; i++) put(g, mesh(new THREE.BoxGeometry(.3, .05, .04), '#7E77A0', false), 0, .4 + i * .5, .36);
  addStatic(x, z, .6);
}
function pillar(x, z, h) {
  const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  put(g, mesh(flat(new THREE.CylinderGeometry(.55, .65, h, 8)), '#EFE3F4'), 0, h / 2, 0);
  put(g, mesh(new THREE.BoxGeometry(1.5, .3, 1.5), '#D9CBEA'), 0, h + .15, 0);
  addStatic(x, z, .75);
}
function lamp(x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  put(g, mesh(flat(new THREE.CylinderGeometry(.05, .07, 2.4, 6)), '#4E4A6E'), 0, 1.2, 0);
  put(g, mesh(new THREE.IcosahedronGeometry(.2, 0), glow('#FFD9A0'), false), 0, 2.5, 0);
  addStatic(x, z, .25);
}
function bench(x, z, rot) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; scene.add(g);
  put(g, mesh(new THREE.BoxGeometry(1.8, .1, .5), '#D6A87B'), 0, .45, 0);
  put(g, mesh(new THREE.BoxGeometry(1.8, .4, .08), '#C4956A'), 0, .75, -.22);
  for (const a of [-.75, .75]) put(g, mesh(new THREE.BoxGeometry(.1, .45, .45), '#8E86B0'), a, .22, 0);
  addStatic(x, z, .8);
  return g;
}
function table(x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  put(g, mesh(flat(new THREE.CylinderGeometry(.6, .6, .07, 9)), '#FFF3E6'), 0, .78, 0);
  put(g, mesh(flat(new THREE.CylinderGeometry(.06, .1, .78, 6)), '#8E86B0'), 0, .39, 0);
  put(g, mesh(G.cup, '#FFFFFF'), .15, .9, .1);
  addStatic(x, z, .65);
}
function barCounter(x, z, big) {
  const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  put(g, mesh(new THREE.BoxGeometry(5, 1.05, 1.1), '#B07A5A'), 0, .52, 0);
  put(g, mesh(new THREE.BoxGeometry(5.2, .1, 1.3), '#FFF3E6'), 0, 1.1, 0);
  put(g, mesh(new THREE.BoxGeometry(5, .25, .05), '#F7C6A5', false), 0, .55, .56);
  // кавомашина
  const m = new THREE.Group(); m.position.set(-1.2, 1.15, -.1); g.add(m);
  put(m, mesh(new THREE.BoxGeometry(1, .7, .6), '#D9DCE8'), 0, .35, 0);
  put(m, mesh(new THREE.BoxGeometry(.9, .12, .5), '#8E86B0'), 0, .76, 0);
  put(m, mesh(flat(new THREE.CylinderGeometry(.05, .05, .2, 6)), '#4E4A6E'), -.2, .15, .32);
  put(m, mesh(flat(new THREE.CylinderGeometry(.05, .05, .2, 6)), '#4E4A6E'), .2, .15, .32);
  for (let i = 0; i < 4; i++) put(g, mesh(G.cup, pick(['#FFFFFF', '#FFD9C2', '#C9F0E1'])), .6 + i * .35, 1.25, .1);
  // меню-дошка
  put(g, mesh(new THREE.BoxGeometry(2.6, 1.4, .1), '#4E4A6E'), .3, 2.6, -.9);
  put(g, mesh(new THREE.BoxGeometry(2.3, .08, .02), '#FFF3E6', false), .3, 2.9, -.84);
  put(g, mesh(new THREE.BoxGeometry(1.6, .08, .02), '#FFD27A', false), .1, 2.6, -.84);
  put(g, mesh(new THREE.BoxGeometry(1.9, .08, .02), '#8FD9C0', false), .2, 2.3, -.84);
  for (const a of [-1.2, 1.8]) put(g, mesh(new THREE.BoxGeometry(.08, 2.4, .08), '#4E4A6E'), a, 1.2, -.9);
  for (const a of [-2, -.7, .7, 2]) addStatic(x + a, z, .75);
  if (big) {
    // гірлянда над баром
    for (let i = 0; i < 9; i++) put(g, mesh(new THREE.IcosahedronGeometry(.09, 0), glow(pick(['#FFD9A0', '#FFB3C7', '#B9F5DE'])), false), -2.4 + i * .6, 3.5 - Math.sin(i / 8 * Math.PI) * .3, -.4);
  }
}
function workbench(x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = .5; scene.add(g);
  put(g, mesh(new THREE.BoxGeometry(2.2, .12, 1), '#C4956A'), 0, .9, 0);
  for (const [a, b] of [[-1, -.4], [1, -.4], [-1, .4], [1, .4]]) put(g, mesh(new THREE.BoxGeometry(.12, .9, .12), '#8C6447'), a, .45, b);
  put(g, mesh(new THREE.BoxGeometry(.5, .3, .3), '#7E77A0'), -.6, 1.1, 0);
  put(g, mesh(flat(new THREE.CylinderGeometry(.15, .15, .1, 8)), '#E8D7B0'), .3, 1.01, .1);
  put(g, mesh(new THREE.BoxGeometry(.6, .05, .1), '#A7B0C2'), .5, 1.0, -.25);
  addStatic(x - .5, z + .2, .8); addStatic(x + .5, z - .2, .8);
}
function radio(x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  put(g, mesh(new THREE.BoxGeometry(.8, .5, .35), '#F7C6A5'), 0, .25, 0);
  put(g, mesh(flat(new THREE.CylinderGeometry(.14, .14, .04, 10)), '#4E4A6E'), -.2, .27, .18).rotation.x = Math.PI / 2;
  put(g, mesh(flat(new THREE.CylinderGeometry(.14, .14, .04, 10)), '#4E4A6E'), .2, .27, .18).rotation.x = Math.PI / 2;
  put(g, mesh(new THREE.BoxGeometry(.03, .5, .03), '#4E4A6E'), .3, .7, 0);
  addStatic(x, z, .5);
}
function jumpPad(p) {
  const g = new THREE.Group(); g.position.set(p.x, 0, p.z); scene.add(g);
  if (p.style === 'ladder') {
    const a = Math.atan2(p.tx - p.x, p.tz - p.z); g.rotation.y = a;
    for (const sx of [-.35, .35]) put(g, mesh(new THREE.BoxGeometry(.08, Math.min(3.2, p.th + .6), .08), '#A47C5B'), sx, Math.min(3.2, p.th + .6) / 2, .3).rotation.x = -.25;
    for (let i = 0; i < 5; i++) put(g, mesh(new THREE.BoxGeometry(.7, .06, .08), '#C4956A'), 0, .3 + i * .55, .3 - i * .13);
    p.mesh = put(g, mesh(flat(new THREE.CylinderGeometry(.55, .55, .05, 10)), glow('#FFD27A'), false), 0, .04, 0);
    return;
  }
  if (p.style === 'mushroom') {
    put(g, mesh(flat(new THREE.CylinderGeometry(.25, .35, .5, 7)), '#F3E6D6'), 0, .25, 0);
    const cap = mesh(new THREE.SphereGeometry(1, 9, 4, 0, Math.PI * 2, 0, Math.PI / 2), mat('#FF7AB6', { emissive: '#FF7AB6', emissiveIntensity: .35 }));
    cap.scale.y = .45; cap.position.y = .45; g.add(cap); p.mesh = cap;
    for (let i = 0; i < 5; i++) put(g, mesh(new THREE.SphereGeometry(.12, 5, 4), '#FFFFFF', false), Math.cos(i * 1.3) * .6, .78, Math.sin(i * 1.3) * .6);
    return;
  }
  if (p.style === 'steps') {
    for (let i = 0; i < 3; i++) put(g, mesh(new THREE.BoxGeometry(1.4 - i * .3, .25, 1.4 - i * .3), '#DDB97C', true, true), 0, .12 + i * .25, 0);
    p.mesh = put(g, mesh(flat(new THREE.CylinderGeometry(.4, .4, .05, 10)), glow('#FFD27A'), false), 0, .78, 0);
    return;
  }
  put(g, mesh(flat(new THREE.CylinderGeometry(.9, 1, .18, 10)), '#4E4A6E', false, true), 0, .09, 0);
  const top = put(g, mesh(flat(new THREE.CylinderGeometry(.7, .7, .08, 10)), glow('#8FD9C0'), false), 0, .2, 0);
  p.mesh = top;
}

/* ---------- Предмети оточення (ламаються) ---------- */
const PROP_T = {
  crate:   { n: 'Ящик', hp: 14, r: .55 },
  cooler:  { n: 'Кулер', hp: 10, r: .45 },
  printer: { n: 'Принтер', hp: 12, r: .55 },
  plant:   { n: 'Вазон', hp: 6, r: .4 },
  chairP:  { n: 'Офісне крісло', hp: 8, r: .45 },
  vending: { n: 'Кавовий автомат', hp: 24, r: .7 },
};
function propMesh(type) {
  const g = new THREE.Group();
  switch (type) {
    case 'crate':
      put(g, mesh(new THREE.BoxGeometry(.9, .9, .9), '#D6A87B'), 0, .45, 0);
      put(g, mesh(new THREE.BoxGeometry(.94, .12, .94), '#B8865E'), 0, .45, 0); break;
    case 'cooler':
      put(g, mesh(new THREE.BoxGeometry(.6, 1, .6), '#F2F0F7'), 0, .5, 0);
      put(g, mesh(flat(new THREE.CylinderGeometry(.26, .26, .55, 8)), mat('#9FD8F5', { transparent: true, opacity: .8 })), 0, 1.27, 0); break;
    case 'printer':
      put(g, mesh(new THREE.BoxGeometry(.9, .55, .7), '#D9DCE8'), 0, .28, 0);
      put(g, mesh(new THREE.BoxGeometry(.6, .05, .4), '#FFFFFF'), 0, .58, .1);
      put(g, mesh(new THREE.BoxGeometry(.12, .06, .04), glow('#FF8A7A'), false), .3, .45, .36); break;
    case 'plant':
      put(g, mesh(flat(new THREE.CylinderGeometry(.28, .2, .4, 7)), '#F7A68A'), 0, .2, 0);
      put(g, mesh(rough(new THREE.IcosahedronGeometry(.38, 0), .25), '#7CCBA2'), 0, .7, 0); break;
    case 'chairP':
      put(g, mesh(new THREE.BoxGeometry(.55, .1, .55), '#6E5E96'), 0, .5, 0);
      put(g, mesh(new THREE.BoxGeometry(.55, .6, .1), '#6E5E96'), 0, .85, -.25);
      put(g, mesh(flat(new THREE.CylinderGeometry(.05, .05, .45, 6)), '#4E4A6E'), 0, .25, 0); break;
    default: biomePropMesh(type, g); break;
    case 'vending':
      put(g, mesh(new THREE.BoxGeometry(1.1, 1.9, .8), '#E8607E'), 0, .95, 0);
      put(g, mesh(new THREE.BoxGeometry(.7, 1, .05), '#FFE8D6', false), -.1, 1.15, .41);
      put(g, mesh(new THREE.BoxGeometry(.2, .5, .05), glow('#FFD27A'), false), .38, 1.2, .41); break;
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
function addProp(type, x, z) {
  const T = PROP_T[type];
  const m = propMesh(type); m.position.set(x, 0, z); m.rotation.y = wr() * 6.28; scene.add(m);
  const p = { type, x, z, r: T.r, hp: T.hp, max: T.hp, alive: true, mesh: m, t: 0, ox: x, oz: z };
  PROPS.push(p); return p;
}

/* ---------- Точки інгредієнтів ---------- */
function addNode(ing, x, z) {
  const m = mesh(G.pickIng, glow(ING[ing].c), true); m.position.set(x, .6, z); scene.add(m);
  const base = mesh(flat(new THREE.CylinderGeometry(.35, .4, .06, 8)), basic(ING[ing].c, .35), false); base.position.set(x, .03, z); scene.add(base);
  NODES.push({ ing, x, z, mesh: m, base, active: true, t: 0 });
}

/* ---------- Скрині ---------- */
function addChest(id, x, z, tier, secret, y = 0, loot = null, recipe = null) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = wr() * 6.28; scene.add(g);
  put(g, mesh(new THREE.BoxGeometry(1, .55, .7), secret ? '#F4C04E' : '#C4956A'), 0, .28, 0);
  const lid = new THREE.Group(); lid.position.set(0, .55, -.35); g.add(lid);
  put(lid, mesh(new THREE.BoxGeometry(1.04, .22, .74), secret ? '#FFD86B' : '#D6A87B'), 0, .11, .35);
  put(g, mesh(new THREE.BoxGeometry(.18, .2, .06), glow('#FFD27A'), false), 0, .45, .37);
  const c = { id, x, z, y, tier, secret, loot, recipe, mesh: g, lid, opened: false, temp: false };
  CHESTS.push(c); if (!y) addStatic(x, z, .6, .8);
  return c;
}

/* ---------- Будуємо світ ---------- */
function buildWorld() {
  ISL.forEach(buildIsland);
  BR.forEach(buildBridge);
  // Гуща
  barCounter(BARS[0].x, BARS[0].z, true);
  workbench(WORKBENCH.x, WORKBENCH.z);
  radio(6.2, -3.2);
  PADS.forEach(jumpPad);
  [[-3.2, 4.2], [3.4, 4.6], [6.4, 1.2]].forEach(([x, z]) => table(x, z));
  bench(-1, 8, Math.PI); bench(-6.5, -6, .9);
  lamp(-4.5, -6.5); lamp(5.5, -6.8); lamp(8.2, 4.5); lamp(-8.6, 1.2);
  tree(-3, -8.6, true); tree(8.5, -2, true); tree(2, 9.4, true);
  // Опен-спейс
  const o = ISLMAP.office;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
    const x = o.x - 4 + i * 4, z = o.z - 3 + j * 5.5;
    if (!inCorridor(x, z)) desk(x, z, j ? Math.PI : 0);
  }
  cabinet(o.x + 6, o.z + 6, 0); lamp(o.x - 7, o.z + 5);
  // Парк
  const pk = ISLMAP.park;
  for (let i = 0; i < 9; i++) { const s = freeSpot(pk, 3, pk.r - 1.5, 1.4); if (s) tree(s.x, s.z, i % 3 === 0); }
  bench(pk.x - 2, pk.z + 1, .4); lamp(pk.x + 3, pk.z - 3);
  // Архів
  const ar = ISLMAP.archive;
  for (let i = 0; i < 7; i++) { const s = freeSpot(ar, 2.5, ar.r - 1.5, 1.2); if (s) cabinet(s.x, s.z, wr() * 6); }
  // Вежа CEO
  const tw = ISLMAP.tower;
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2 + .3, x = tw.x + Math.cos(a) * 10.6, z = tw.z + Math.sin(a) * 10.6;
    if (!inCorridor(x, z) && dist2(x, z, BARS[1].x, BARS[1].z) > 3.2) pillar(x, z, 3 + (i % 2) * 1.5);
  }
  barCounter(BARS[1].x, BARS[1].z, false);
  // Таємний острівець
  const sc = ISLMAP.secret;
  tree(sc.x - 2, sc.z + 1.6, true);
  addChest('secret', sc.x + .6, sc.z + 1.2, 3, true);

  // Скрині
  addChest('c_office', o.x + 7.5, o.z - 4, 1);
  addChest('c_park', pk.x - 6, pk.z + 5, 1.5);
  addChest('c_archive', ar.x + 5, ar.z + 5, 2);
  buildBiomes();

  // Предмети оточення
  const propPlan = {
    office: { printer: 3, cooler: 2, chairP: 4, crate: 2, plant: 2 },
    park: { plant: 4, cooler: 2, crate: 2, vending: 1 },
    archive: { crate: 5, printer: 2, chairP: 2 },
    tower: { printer: 2, chairP: 3, plant: 2, cooler: 1 },
    hub: { plant: 3, crate: 1 },
  };
  for (const id in propPlan) {
    const s = ISLMAP[id];
    for (const type in propPlan[id]) for (let i = 0; i < propPlan[id][type]; i++) {
      const p = freeSpot(s, id === 'hub' ? 7 : 2, s.r - 1.3, 1.1);
      if (p) addProp(type, p.x, p.z);
    }
  }
  // Інгредієнти
  const nodePlan = { office: ['tears', 'tears', 'beans', 'monday'], park: ['chamomile', 'chamomile', 'milk', 'milk', 'beans'], archive: ['syrup', 'syrup', 'tears', 'monday'], tower: ['milk', 'syrup', 'beans'], secret: ['syrup'], hub: ['beans', 'milk'] };
  for (const id in nodePlan) for (const ing of nodePlan[id]) {
    const s = ISLMAP[id]; const p = freeSpot(s, id === 'hub' ? 6 : 1.5, s.r - 1.2, 1);
    if (p) addNode(ing, p.x, p.z);
  }
  // Уламки світу, що літають довкола
  for (let i = 0; i < 48; i++) {
    const r = .4 + wr() * 2.2;
    const m = mesh(rough(new THREE.DodecahedronGeometry(r, 0), .35), pick(['#9389C9', '#A99FD8', '#E8B9A6', '#C3E6A8']), false);
    let x, z, k = 0;
    do { x = -82 + wr() * 180; z = -62 + wr() * 150; k++; } while (k < 20 && ISL.some(s => dist2(x, z, s.x, s.z) < s.r + 5));
    const y = wr() < .55 ? -6 - wr() * 18 : 3 + wr() * 9;
    m.position.set(x, y, z); m.rotation.set(wr() * 3, wr() * 3, wr() * 3);
    m.userData.bob = { y, ph: wr() * 6, sp: .2 + wr() * .5, rot: (wr() - .5) * .2 };
    scene.add(m); DEBRIS.push(m);
    // іноді на уламку — шматок офісу
    if (wr() < .25 && r > 1.2) {
      const d = mesh(new THREE.BoxGeometry(.8, .5, .4), '#F2E6D8', false); d.position.set(0, r * .8, 0); m.add(d);
    }
  }
  // Хмари внизу
  for (let i = 0; i < 18; i++) {
    const c = new THREE.Group();
    for (let j = 0; j < 4; j++) put(c, mesh(new THREE.IcosahedronGeometry(2 + wr() * 2.5, 0), basic('#FFFFFF', .55), false), j * 2.6 - 4, wr() * .8, wr() * 2);
    c.position.set(-90 + wr() * 200, -34 - wr() * 10, -70 + wr() * 160);
    c.userData.drift = .3 + wr() * .5;
    scene.add(c); CLOUDS.push(c);
  }
}
const CLOUDS = [];

/* ---------- Персонажі ---------- */
function humanoid(o) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const l1 = put(body, mesh(G.leg, o.pants), -.13, .25, 0);
  const l2 = put(body, mesh(G.leg, o.pants), .13, .25, 0);
  const torso = put(body, mesh(G.torso, o.shirt), 0, .86, 0);
  const head = put(body, mesh(G.head, o.skin), 0, 1.47, 0);
  const e1 = put(body, mesh(G.eye, '#2E2346', false), -.1, 1.5, .27);
  const e2 = put(body, mesh(G.eye, '#2E2346', false), .1, 1.5, .27);
  const aL = new THREE.Group(); aL.position.set(-.44, 1.14, 0); body.add(aL);
  const aLm = put(aL, mesh(G.arm, o.shirt), 0, -.22, 0);
  const aR = new THREE.Group(); aR.position.set(.44, 1.14, 0); body.add(aR);
  const aRm = put(aR, mesh(G.arm, o.shirt), 0, -.22, 0);
  const hand = new THREE.Group(); hand.position.set(0, -.46, .04); aR.add(hand);
  return { root, body, l1, l2, torso, head, aL, aR, aLm, aRm, hand };
}
function buildPlayer() {
  const h = humanoid({ skin: '#F3C9A8', shirt: '#EDE6F7', pants: '#4B4372' });
  h.apron = put(h.body, mesh(G.apron, '#7A4E3A'), 0, .8, .37);
  put(h.body, mesh(G.cap, '#4E4A6E'), 0, 1.72, 0);
  put(h.body, mesh(G.brim, '#4E4A6E'), 0, 1.67, .2);
  put(h.body, mesh(G.bag, '#F2A65A'), 0, 1.0, -.38);
  put(h.body, mesh(new THREE.BoxGeometry(.06, .5, .06), '#F2A65A'), -.2, 1.1, -.1).rotation.z = .5;
  scene.add(h.root);
  return h;
}
function buildOffice(skin, shirt) {
  const h = humanoid({ skin, shirt, pants: '#4E4A6E' });
  h.tie = put(h.body, mesh(G.tie, '#E0607E'), 0, .95, .37);
  put(h.body, mesh(G.bagEye, '#8E6FA8', false), -.1, 1.43, .27);
  put(h.body, mesh(G.bagEye, '#8E6FA8', false), .1, 1.43, .27);
  put(h.body, mesh(new THREE.BoxGeometry(.5, .14, .5), '#6B5A4E'), 0, 1.72, -.02);
  return h;
}
function buildDummy() {
  const h = buildOffice('#C9D6CF', '#FFE08A');
  put(h.body, mesh(new THREE.BoxGeometry(.2, .12, .03), '#FFFFFF', false), -.16, 1.05, .38);
  put(h.body, mesh(new THREE.BoxGeometry(.32, .22, .02), '#FFB3C7', false), .12, .78, .39);
  return h;
}
function buildManager() {
  const h = humanoid({ skin: '#D9C7A9', shirt: '#6E5E96', pants: '#3E3A5C' });
  h.root.scale.setScalar(1.1);
  put(h.body, mesh(new THREE.BoxGeometry(.5, .08, .04), '#2E2346', false), 0, 1.52, .29);
  put(h.body, mesh(new THREE.BoxGeometry(.48, .2, .48), '#C0A27A'), 0, 1.72, -.02);
  const clip = mesh(new THREE.BoxGeometry(.4, .5, .04), '#F2E6D8'); clip.position.set(0, .1, .1); h.hand.add(clip);
  return h;
}
function buildHound() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const torso = put(body, mesh(new THREE.BoxGeometry(.5, .42, 1.0), '#6C7BA0'), 0, .62, 0);
  const head = put(body, mesh(new THREE.BoxGeometry(.42, .38, .44), '#B7A6C9'), 0, .86, .62);
  put(body, mesh(G.eye, glow('#FF6B6B'), false), -.11, .92, .85);
  put(body, mesh(G.eye, glow('#FF6B6B'), false), .11, .92, .85);
  const clock = put(body, mesh(flat(new THREE.CylinderGeometry(.22, .22, .05, 10)), '#FFFFFF'), .27, .64, 0); clock.rotation.z = Math.PI / 2;
  const hand1 = put(body, mesh(new THREE.BoxGeometry(.02, .16, .03), '#E0607E', false), .3, .7, 0); hand1.rotation.x = .6;
  const legs = [];
  for (const [x, z] of [[-.17, .34], [.17, .34], [-.17, -.34], [.17, -.34]]) legs.push(put(body, mesh(new THREE.BoxGeometry(.13, .42, .13), '#4E4A6E'), x, .21, z));
  put(body, mesh(new THREE.BoxGeometry(.08, .08, .4), '#6C7BA0'), 0, .8, -.6).rotation.x = -.6;
  return { root, body, torso, head, legs, hound: true };
}
function buildBoss() {
  const h = humanoid({ skin: '#E6C9B0', shirt: '#3A3A5E', pants: '#2E2346' });
  h.root.scale.setScalar(2.1);
  put(h.body, mesh(G.tie, '#E8505B'), 0, .95, .37);
  put(h.body, mesh(new THREE.BoxGeometry(.56, .12, .52), '#2E2346'), 0, 1.74, -.03);
  put(h.body, mesh(new THREE.BoxGeometry(.5, .07, .04), '#2E2346', false), 0, 1.52, .29);
  const brief = mesh(new THREE.BoxGeometry(.5, .36, .14), '#5B3A2E'); brief.position.set(0, -.12, 0); h.aL.add(brief);
  h.reports = [];
  for (let i = 0; i < 4; i++) {
    const r = mesh(G.paper, glow('#FF9A5B'), false); h.root.add(r); h.reports.push(r);
  }
  return h;
}

/* ---------- Предмет у руці ---------- */
function handMesh(b, broken) {
  const g = new THREE.Group();
  const C = c => broken ? '#A49EB4' : c;
  const cyl = (rt, rb, h, c, y, seg = 7) => put(g, mesh(flat(new THREE.CylinderGeometry(rt, rb, h, seg)), C(c)), 0, y, 0);
  const box = (w, h, d, c, x, y, z) => put(g, mesh(new THREE.BoxGeometry(w, h, d), C(c)), x, y, z);
  switch (b) {
    case 'spoon': case 'kspoon':
      cyl(.025, .025, .5, b === 'kspoon' ? '#D9A066' : '#D5D9E4', .22);
      put(g, mesh(new THREE.SphereGeometry(.08, 6, 4), C(b === 'kspoon' ? '#F4C04E' : '#E4E7EF')), 0, .5, 0).scale.set(1, 1.4, .5); break;
    case 'knife': box(.07, .2, .07, '#7A4E3A', 0, .1, 0); box(.025, .36, .1, '#E4E7EF', 0, .38, 0); break;
    case 'mop': case 'apocmop':
      cyl(.035, .035, 1.6, '#C4956A', .6);
      box(.45, .14, .14, b === 'apocmop' ? '#B07CF0' : '#9FD8F5', 0, 1.42, 0);
      if (b === 'apocmop') put(g, mesh(new THREE.OctahedronGeometry(.15, 0), glow('#FFE066'), false), 0, 1.65, 0); break;
    case 'chair': case 'lounger':
      box(.5, .06, .5, b === 'lounger' ? '#7FD6B9' : '#D6A87B', 0, .5, 0);
      box(.5, .5, .06, b === 'lounger' ? '#FF9C8A' : '#D6A87B', 0, .75, -.22);
      for (const [x, z] of [[-.2, .2], [.2, .2], [-.2, -.2], [.2, -.2]]) box(.05, .5, .05, '#8C6447', x, .25, z); break;
    case 'bat': cyl(.075, .035, 1.0, '#D9A066', .45); break;
    case 'sign':
      cyl(.03, .03, 1.7, '#A7B0C2', .7);
      put(g, mesh(flat(new THREE.CylinderGeometry(.32, .32, .04, 8)), C('#E8505B')), 0, 1.5, 0).rotation.x = Math.PI / 2; break;
    case 'hammer': cyl(.04, .04, 1.1, '#8C6447', .5); box(.5, .28, .28, '#8E86B0', 0, 1.1, 0); break;
    case 'drill': box(.12, .3, .14, '#3E3A5C', 0, .1, 0); box(.16, .18, .4, '#F2B33D', 0, .3, .1); cyl(.02, .02, .3, '#D5D9E4', .3).position.z = .42; break;
    case 'extinguisher': cyl(.12, .12, .55, '#E8505B', .25); box(.05, .05, .25, '#2E2346', 0, .55, .1); break;
    case 'stapler': box(.12, .1, .34, '#4E4A6E', 0, .08, .05); break;
    case 'bigcup': cyl(.24, .18, .38, '#FFF3E6', .2, 9); box(.06, .2, .1, '#FFF3E6', .26, .2, 0); break;
    case 'machine': box(.5, .5, .4, '#C9CDD9', 0, .25, 0); box(.45, .08, .36, '#8E86B0', 0, .54, 0); break;
    case 'tumbler': put(g, mesh(flat(new THREE.CylinderGeometry(.11, .09, .38, 8)), broken ? C('#F4C04E') : mat('#F4C04E', { metalness: .55, roughness: .35, emissive: '#7A5A10', emissiveIntensity: .3 })), 0, .2, 0); break;
    default: break;
  }
  g.rotation.x = Math.PI / 2;
  if (broken) g.rotation.z = .35;
  return g;
}

/* ---------- Частинки та ефекти ---------- */
let PMUL = 1;
const PART = [];
function burst(x, y, z, color, n = 8, spd = 4, life = .7, up = 3, size = 1) {
  n = Math.max(1, Math.round(n * PMUL));
  for (let i = 0; i < n; i++) {
    if (PART.length > 320) { const o = PART.shift(); scene.remove(o.m); }
    const m = new THREE.Mesh(G.part, basic(color)); m.position.set(x, y, z);
    const s = size * (.6 + Math.random() * .8); m.scale.setScalar(s);
    const a = Math.random() * Math.PI * 2, v = spd * (.4 + Math.random() * .6);
    scene.add(m);
    PART.push({ m, vx: Math.cos(a) * v, vy: up * (.5 + Math.random()), vz: Math.sin(a) * v, life, max: life, s });
  }
}
function updParticles(dt) {
  for (let i = PART.length - 1; i >= 0; i--) {
    const p = PART[i]; p.life -= dt;
    if (p.life <= 0) { scene.remove(p.m); PART.splice(i, 1); continue; }
    p.vy -= 9 * dt;
    p.m.position.x += p.vx * dt; p.m.position.y += p.vy * dt; p.m.position.z += p.vz * dt;
    p.m.rotation.x += dt * 4; p.m.rotation.y += dt * 3;
    p.m.scale.setScalar(p.s * (p.life / p.max));
  }
}
const FX = [];
function swingFX(x, z, face, range, arcDeg, color) {
  const arc = Math.min(arcDeg, 360) * Math.PI / 180;
  const geo = new THREE.RingGeometry(Math.max(.2, range * .35), range, 24, 1, -arc / 2, arc);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .55, side: THREE.DoubleSide, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  const g = new THREE.Group(); g.add(m); g.position.set(x, .12, z); g.rotation.y = face - Math.PI / 2;
  scene.add(g); FX.push({ g, m, t: 0, life: .18 });
}
function ringFX(x, z, r, color, life = .4) {
  const geo = new THREE.RingGeometry(r * .7, r, 28);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .6, side: THREE.DoubleSide, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  const g = new THREE.Group(); g.add(m); g.position.set(x, .14, z);
  scene.add(g); FX.push({ g, m, t: 0, life, grow: true });
}
function updFX(dt) {
  for (let i = FX.length - 1; i >= 0; i--) {
    const f = FX[i]; f.t += dt;
    const k = f.t / f.life;
    f.m.material.opacity = .6 * (1 - k);
    if (f.grow) f.g.scale.setScalar(.6 + k * .6);
    if (k >= 1) { scene.remove(f.g); f.m.geometry.dispose(); f.m.material.dispose(); FX.splice(i, 1); }
  }
}

/* ---------- Плаваючий текст і репліки ---------- */
const fxLayer = $('#fx-layer');
const FT = [], BUB = [];
const _v = new THREE.Vector3();
function ftext(x, y, z, txt, cls) {
  if (FT.length > 40) { const o = FT.shift(); o.el.remove(); }
  const el = document.createElement('div'); el.className = 'ft ' + (cls || ''); el.textContent = txt;
  fxLayer.appendChild(el);
  FT.push({ el, x: x + (Math.random() - .5) * .4, y, z, t: 0, life: 1.1 });
}
function bubble(ent, txt, mad, life = 2.8) {
  if (ent.bub) { ent.bub.el.remove(); const i = BUB.indexOf(ent.bub); if (i >= 0) BUB.splice(i, 1); }
  const el = document.createElement('div'); el.className = 'bubble' + (mad ? ' mad' : ''); el.textContent = txt;
  fxLayer.appendChild(el);
  const b = { el, ent, t: 0, life }; ent.bub = b; BUB.push(b);
}
function screenPos(x, y, z) {
  _v.set(x, y, z).project(camera);
  return { x: (_v.x * .5 + .5) * innerWidth, y: (-_v.y * .5 + .5) * innerHeight, vis: _v.z < 1 };
}
function updOverlays(dt) {
  for (let i = FT.length - 1; i >= 0; i--) {
    const f = FT[i]; f.t += dt;
    if (f.t >= f.life) { f.el.remove(); FT.splice(i, 1); continue; }
    const p = screenPos(f.x, f.y + f.t * 1.3, f.z);
    f.el.style.transform = `translate(${p.x}px,${p.y}px) translate(-50%,-50%)`;
    f.el.style.opacity = String(1 - Math.max(0, f.t / f.life - .5) * 2);
  }
  for (let i = BUB.length - 1; i >= 0; i--) {
    const b = BUB[i]; b.t += dt;
    if (b.t >= b.life || b.ent.dead) { b.el.remove(); BUB.splice(i, 1); if (b.ent.bub === b) b.ent.bub = null; continue; }
    const e = b.ent;
    const p = screenPos(e.x, (e.y || 0) + (e.bh || 2.3), e.z);
    b.el.style.transform = `translate(${p.x}px,${p.y}px) translate(-10%,-100%)`;
    b.el.style.display = p.vis ? '' : 'none';
  }
}
