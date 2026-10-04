/* =====================================================================
   БІОМИ: море з водою й водоспадами, сніг і лід, джунглі, пустеля.
   Рельєф: суходіл, мілина, глибина, лід, платформи з висотою.
   ===================================================================== */
const WATER_Y = -.15;
const ANIM = { water: [], foam: [], falls: [], beams: [], glows: [], spin: [] };
/* Об'єкти, що стають напівпрозорими, коли закривають гравця від камери */
const OCC = [];
function regOcc(g, r, top) {
  const cl = new Map();
  g.traverse(o => { if (o.isMesh) { if (!cl.has(o.material)) { const c = o.material.clone(); c.transparent = true; cl.set(o.material, c); } o.material = cl.get(o.material); } });
  OCC.push({ g, x: g.position.x, z: g.position.z, r, top, a: 1 });
}
function updOcclusion(dt) {
  for (const o of OCC) {
    const dz = o.z - pl.z, dx = Math.abs(o.x - pl.x);
    const hide = pl.y < o.top - .5 && dz > -o.r * .6 && dz < o.top / 1.32 + o.r && dx < o.r + 1;
    const ta = hide ? .28 : 1;
    if (Math.abs(o.a - ta) < .01) continue;
    o.a = lerp(o.a, ta, Math.min(1, dt * 8));
    o.g.traverse(m => { if (m.isMesh) { m.material.opacity = o.a; m.material.depthWrite = o.a > .9; } });
  }
}

/* ---------- Рельєф ---------- */
function onBridge(b, x, z, margin = 0) {
  const px = x - b.ax, pz = z - b.az, t = px * b.dx + pz * b.dz;
  if (t < -.2 || t > b.len + .2) return false;
  return Math.hypot(px - b.dx * t, pz - b.dz * t) < b.w / 2 - margin;
}
function terrainAt(x, z) {
  for (const b of BR) if (onBridge(b, x, z)) return 'land';
  const s = islandAt(x, z);
  if (!s) return 'void';
  if (s.biome === 'sea') {
    if (dist2(x, z, s.x, s.z) > s.r - 1.1) return 'rim';
    let best = 'deep';
    for (const L of SEA_LAND) { const d = dist2(x, z, L.x, L.z); if (d < L.r) return 'land'; if (d < L.r + SHALLOW_W) best = 'shallow'; }
    return best;
  }
  if (s.biome === 'snow') for (const I of ICE) if (dist2(x, z, I.x, I.z) < I.r) return 'ice';
  return 'land';
}
const isWet = t => t === 'deep' || t === 'rim';
function baseH(t) { return isWet(t) ? -.95 : t === 'shallow' ? -.4 : 0; }
function platH(x, z, y) {
  let h = -99;
  for (const p of PLATS) if (dist2(x, z, p.x, p.z) < p.r && p.h <= y + .45 && p.h > h) h = p.h;
  return h;
}
function groundH(x, z, y) { return Math.max(baseH(terrainAt(x, z)), platH(x, z, y)); }
function monsterOk(m, x, z) {
  const t = terrainAt(x, z);
  return t === 'land' || t === 'ice' || (t === 'shallow' && m.T && m.T.shallow);
}

/* ---------- Море ---------- */
function waterMat(c, op) { return new THREE.MeshStandardMaterial({ color: c, transparent: true, opacity: op, roughness: .18, metalness: .08, flatShading: true, depthWrite: false }); }
function buildSea(s) {
  const g = new THREE.Group(); g.position.set(s.x, 0, s.z); scene.add(g);
  const seg = 40;
  // чаша: стінка, дно, низ
  g.add(mesh(flat(new THREE.CylinderGeometry(s.r, s.r * .97, 2.2, seg, 1, true).translate(0, -.95, 0)), s.rock, false, false));
  const rimTop = new THREE.Mesh(new THREE.RingGeometry(s.r - 1.1, s.r, seg, 1), mat('#C9BDE8'));
  rimTop.rotation.x = -Math.PI / 2; rimTop.position.y = .12; rimTop.receiveShadow = true; g.add(rimTop);
  const bed = mesh(flat(new THREE.CylinderGeometry(s.r - .9, s.r - .9, .3, seg).translate(0, -1.75, 0)), '#D9C08C', false, true); g.add(bed);
  const deepBed = mesh(flat(new THREE.CylinderGeometry(s.r * .55, s.r * .7, .3, 20).translate(0, -1.72, 0)), '#B7A07A', false, true); deepBed.position.set(-6, 0, -4); g.add(deepBed);
  const band = flat(new THREE.CylinderGeometry(s.r * .97, s.r * .86, 1.4, seg, 1).translate(0, -2.75, 0)); g.add(mesh(band, '#E8B9A6', false));
  const h = s.r * 1.1; let cone = new THREE.ConeGeometry(s.r * .86, h, seg, 4); cone.rotateX(Math.PI); cone.translate(0, -3.45 - h / 2, 0);
  g.add(mesh(rough(cone, .3, -3.45), s.rock, false));
  // вода з хвилями (вершини анімуються)
  const wgeo = new THREE.RingGeometry(.01, s.r - .95, 44, 14);
  const water = new THREE.Mesh(wgeo, waterMat('#6FD0E2', .78));
  water.rotation.x = -Math.PI / 2; water.position.y = WATER_Y; water.receiveShadow = true; g.add(water);
  ANIM.water.push({ m: water, base: Float32Array.from(wgeo.attributes.position.array) });
  // суходіл
  for (const L of SEA_LAND) {
    const lx = L.x - s.x, lz = L.z - s.z;
    const land = mesh(flat(new THREE.CylinderGeometry(L.r, L.r + .6, 1.9, 16).translate(0, -.95, 0)), '#E8C98F', false, true);
    land.position.set(lx, 0, lz); g.add(land);
    const top = mesh(flat(new THREE.CylinderGeometry(L.r, L.r, .06, 16)), L.grass ? '#A9DD95' : '#F3DFAE', false, true);
    top.position.set(lx, -.02, lz); g.add(top);
    if (L.grass) { const sand = new THREE.Mesh(new THREE.RingGeometry(L.r - 1, L.r, 16, 1), mat('#F3DFAE')); sand.rotation.x = -Math.PI / 2; sand.position.set(lx, .02, lz); g.add(sand); }
    const foam = new THREE.Mesh(new THREE.RingGeometry(L.r + .15, L.r + .75, 24, 1), new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: .55, depthWrite: false }));
    foam.rotation.x = -Math.PI / 2; foam.position.set(lx, WATER_Y + .03, lz); g.add(foam); ANIM.foam.push(foam);
  }
  // водоспади з краю
  const bridgeA = Math.atan2(ISLMAP.hub.x - s.x, ISLMAP.hub.z - s.z);
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * Math.PI * 2 + .2;
    if (Math.abs(angDiffW(a, bridgeA)) < .45) continue;
    const fall = new THREE.Group(); fall.position.set(Math.sin(a) * (s.r + .05), 0, Math.cos(a) * (s.r + .05)); fall.rotation.y = a; g.add(fall);
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 16).translate(0, -8, 0), new THREE.MeshBasicMaterial({ color: '#BDEFFF', transparent: true, opacity: .5, side: THREE.DoubleSide, depthWrite: false }));
    sheet.position.z = .25; fall.add(sheet);
    const lip = new THREE.Mesh(new THREE.BoxGeometry(2.8, .25, 1.4), basic('#DFF8FF', .7)); lip.position.set(0, .05, -.3); fall.add(lip);
    const streaks = [];
    for (let k = 0; k < 4; k++) { const st = new THREE.Mesh(new THREE.BoxGeometry(.12, 2.5, .05), basic('#FFFFFF', .7)); st.position.set(-1 + k * .65, -k * 3, .32); fall.add(st); streaks.push(st); }
    ANIM.falls.push({ sheet, streaks, ph: Math.random() * 6 });
  }
  return g;
}
function angDiffW(a, b) { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }

/* ---------- Декор біомів ---------- */
function palm(x, z, s = 1, y = 0) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = wr() * 6.28; scene.add(g);
  let px = 0, py = 0;
  for (let i = 0; i < 5; i++) { const seg = mesh(flat(new THREE.CylinderGeometry(.13 * s, .17 * s, .7 * s, 6)), i % 2 ? '#B58A63' : '#A47C5B'); seg.position.set(px, py + .35 * s, 0); seg.rotation.z = -.08 * i; g.add(seg); px += .07 * i * s; py += .66 * s; }
  for (let i = 0; i < 6; i++) {
    const leaf = mesh(new THREE.BoxGeometry(.35 * s, .05, 1.7 * s).translate(0, 0, .85 * s), i % 2 ? '#6FC08C' : '#86CF8E');
    leaf.position.set(px, py, 0); leaf.rotation.y = i / 6 * Math.PI * 2; leaf.rotation.x = .45; g.add(leaf);
  }
  put(g, mesh(new THREE.IcosahedronGeometry(.13 * s, 0), '#7A4E3A'), px + .1, py - .15, .1);
  if (y === 0) addStatic(x, z, .35);
  regOcc(g, 1.6 * s, 3.4 * s);
}
function pine(x, z, s = 1) {
  const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  put(g, mesh(flat(new THREE.CylinderGeometry(.12 * s, .16 * s, .8 * s, 6)), '#8C6447'), 0, .4 * s, 0);
  for (let i = 0; i < 3; i++) {
    const r = (1 - i * .27) * s, y = (.9 + i * .75) * s;
    put(g, mesh(new THREE.ConeGeometry(r, 1.1 * s, 7), i === 2 ? '#7FB3A3' : '#5E9C8A'), 0, y, 0);
    put(g, mesh(new THREE.ConeGeometry(r * .55, .45 * s, 7), '#F4F7FF', false), 0, y + .4 * s, 0);
  }
  addStatic(x, z, .5); regOcc(g, 1.1 * s, 3 * s);
}
function bigTree(x, z, s = 1) {
  const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  put(g, mesh(flat(new THREE.CylinderGeometry(.3 * s, .5 * s, 4.2 * s, 7)), '#8C6447'), 0, 2.1 * s, 0);
  for (let i = 0; i < 3; i++) {
    const c = mesh(rough(new THREE.IcosahedronGeometry((1.9 - i * .4) * s, 0), .2), pick(['#5FB37A', '#6FC08C', '#4FA06C']));
    c.scale.y = .55; c.position.set((wr() - .5) * .8, (3.8 + i * .9) * s, (wr() - .5) * .8); g.add(c);
  }
  for (let i = 0; i < 3; i++) put(g, mesh(new THREE.BoxGeometry(.05, 1.6 + wr(), .05), '#4F9A68', false), (wr() - .5) * 2.4 * s, 2.8 * s, (wr() - .5) * 2.4 * s);
  addStatic(x, z, .55 * s); regOcc(g, 2 * s, 6 * s);
}
function mushroom(x, z, s = 1, glowing = true) {
  const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  put(g, mesh(flat(new THREE.CylinderGeometry(.12 * s, .16 * s, .7 * s, 6)), '#F3E6D6'), 0, .35 * s, 0);
  const cap = mesh(new THREE.SphereGeometry(.45 * s, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2), glowing ? mat('#9F8CFF', { emissive: '#9F8CFF', emissiveIntensity: .3 }) : '#E8607E');
  cap.position.y = .65 * s; g.add(cap);
  if (glowing) ANIM.glows.push(cap.material);
}
function cactus(x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = wr() * 6; scene.add(g);
  const h = 1.3 + wr() * 1.2;
  put(g, mesh(flat(new THREE.CylinderGeometry(.24, .28, h, 7)), '#6DB27C'), 0, h / 2, 0);
  const arm = mesh(flat(new THREE.CylinderGeometry(.14, .16, .7, 6)), '#7CC08A'); arm.position.set(.36, h * .55, 0); g.add(arm);
  put(g, mesh(flat(new THREE.CylinderGeometry(.14, .14, .3, 6)), '#7CC08A'), .25, h * .45, 0).rotation.z = Math.PI / 2;
  put(g, mesh(new THREE.IcosahedronGeometry(.1, 0), '#FF8FB0', false), 0, h + .05, 0);
  addStatic(x, z, .38);
}
function dune(x, z, r) {
  const m = mesh(rough(new THREE.SphereGeometry(r, 9, 5, 0, Math.PI * 2, 0, Math.PI / 2), .12), '#EDC98A', false, true);
  m.scale.y = .25; m.position.set(x, -.05, z); scene.add(m);
}
function column(x, z, h, broken) {
  const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  put(g, mesh(flat(new THREE.CylinderGeometry(.42, .5, h, 8)), '#E9D3B0'), 0, h / 2, 0);
  if (!broken) put(g, mesh(new THREE.BoxGeometry(1.2, .25, 1.2), '#DCC39A'), 0, h + .12, 0);
  else put(g, mesh(flat(new THREE.CylinderGeometry(.42, .42, 1, 8)), '#E9D3B0'), 1, .42, .4).rotation.z = Math.PI / 2;
  addStatic(x, z, .55);
}
function steppedPyramid(x, z, sizes, stepH, col, col2) {
  const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  sizes.forEach((sz, i) => put(g, mesh(new THREE.BoxGeometry(sz, stepH, sz), i % 2 ? col2 : col, true, true), 0, stepH * (i + .5), 0));
  regOcc(g, sizes[0] / 2, stepH * sizes.length);
  return g;
}
function waypointMarker(w) {
  const g = new THREE.Group(); g.position.set(w.x, 0, w.z); scene.add(g);
  put(g, mesh(flat(new THREE.CylinderGeometry(.75, .9, .35, 8)), '#9B92C8', false, true), 0, .17, 0);
  put(g, mesh(flat(new THREE.CylinderGeometry(.35, .45, 1, 6)), '#B8AEE0'), 0, .85, 0);
  const cup = mesh(G.cup, '#FFFFFF'); cup.scale.setScalar(2.2); cup.position.y = 1.75; g.add(cup);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(.5, .05, 6, 18), basic('#8FD9C0', .9)); halo.rotation.x = Math.PI / 2; halo.position.y = 1.75; g.add(halo);
  w.mesh = g; w.cup = cup; w.halo = halo;
}
function noteMarker(n) {
  const g = new THREE.Group(); g.position.set(n.x, n.y || 0, n.z); scene.add(g);
  put(g, mesh(new THREE.BoxGeometry(.08, .7, .08), '#A47C5B'), 0, .35, 0);
  const paper = mesh(G.paper, glow('#FFF3E6')); paper.position.y = .8; paper.rotation.x = -.6; g.add(paper);
  n.mesh = g; n.paper = paper;
}
function fishSpotMarker(f) {
  const g = new THREE.Group(); g.position.set(f.x, 0, f.z); scene.add(g);
  const post = put(g, mesh(new THREE.BoxGeometry(.08, .9, .08), '#A47C5B'), .7, .45, .3);
  put(g, mesh(new THREE.BoxGeometry(.6, .35, .05), '#F2E6D8'), .7, .95, .3);
  put(g, mesh(new THREE.BoxGeometry(.3, .12, .06), '#6CB4FF', false), .7, .95, .34);
  const bob = new THREE.Group(); bob.position.set(f.wx, WATER_Y + (f.kind === 'ice' ? .2 : 0), f.wz); scene.add(bob);
  put(bob, mesh(new THREE.SphereGeometry(.14, 6, 4), '#FF6B6B'), 0, .05, 0);
  put(bob, mesh(new THREE.SphereGeometry(.14, 6, 4, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), '#FFFFFF'), 0, .05, 0);
  f.bob = bob; f.post = post;
}
function pond(p, deep) {
  const w = new THREE.Mesh(new THREE.CircleGeometry(p.r, 18), waterMat(deep ? '#5CC1D6' : '#7FD6C9', .85));
  w.rotation.x = -Math.PI / 2; w.position.set(p.x, .04, p.z); scene.add(w);
  const rim = new THREE.Mesh(new THREE.RingGeometry(p.r, p.r + .45, 18, 1), mat('#C9B48A')); rim.rotation.x = -Math.PI / 2; rim.position.set(p.x, .05, p.z); scene.add(rim);
  for (let i = 0; i < 3; i++) { const lily = mesh(flat(new THREE.CylinderGeometry(.3, .3, .03, 7)), '#6FC08C', false); lily.position.set(p.x + (wr() - .5) * p.r, .07, p.z + (wr() - .5) * p.r); scene.add(lily); }
  addStatic(p.x, p.z, p.r, .5);
}

/* ---------- Будуємо біоми ---------- */
function buildBiomes() {
  // пірс як міст без островів
  const pd = { ax: PIER.ax, az: PIER.az, bx: PIER.bx, bz: PIER.bz, w: PIER.w, pier: true, n: 'Пірс' };
  let dx = pd.bx - pd.ax, dz = pd.bz - pd.az; pd.len = Math.hypot(dx, dz); pd.dx = dx / pd.len; pd.dz = dz / pd.len;
  BR.push(pd); buildBridge(pd);

  /* --- Море --- */
  const sea = ISLMAP.sea;
  palm(-30, -10.5, 1.1); palm(-22.5, -18, .9); palm(-31.5, -19.5, 1); palm(-38.5, -37, 1.2); palm(-40, -41, .9); palm(-36, -40.5, .8); palm(-58.5, -38.3, .8);
  // парасольки й шезлонги
  for (const [x, z, c] of [[-25.5, -17, '#FF9C8A'], [-29, -13.2, '#7FD6B9']]) {
    const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    put(g, mesh(new THREE.BoxGeometry(.06, 2, .06), '#F2E6D8'), 0, 1, 0);
    put(g, mesh(new THREE.ConeGeometry(1.2, .5, 8), c), 0, 2.1, 0);
    const chair = mesh(new THREE.BoxGeometry(.6, .12, 1.5), '#FFFFFF'); chair.position.set(.9, .3, .2); chair.rotation.x = -.15; g.add(chair);
    addStatic(x, z, .25);
  }
  // маяк
  const lh = new THREE.Group(); lh.position.set(-56, 0, -36); scene.add(lh);
  for (let i = 0; i < 6; i++) put(lh, mesh(flat(new THREE.CylinderGeometry(1.05 - i * .03, 1.1 - i * .03, 1, 10)), i % 2 ? '#FF8A8A' : '#FFFFFF'), 0, i + .5, 0);
  const deck = mesh(flat(new THREE.CylinderGeometry(1.8, 1.6, .2, 12)), '#4E4A6E', false, true); deck.position.y = 5.9; lh.add(deck);
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; put(lh, mesh(new THREE.BoxGeometry(.06, .7, .06), '#4E4A6E'), Math.sin(a) * 1.7, 6.35, Math.cos(a) * 1.7); }
  put(lh, mesh(flat(new THREE.CylinderGeometry(.55, .55, .9, 8)), mat('#FFF3B0', { emissive: '#FFE27A', emissiveIntensity: .7 })), 0, 6.6, -1.1);
  put(lh, mesh(new THREE.ConeGeometry(.7, .5, 8), '#FF8A8A'), 0, 7.3, -1.1);
  const beam = new THREE.Mesh(new THREE.ConeGeometry(2.5, 16, 12, 1, true).translate(0, 8, 0), new THREE.MeshBasicMaterial({ color: '#FFF3B0', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
  beam.rotation.z = Math.PI / 2; const bg = new THREE.Group(); bg.position.set(-56, 6.6, -37.1); bg.add(beam); scene.add(bg);
  ANIM.beams.push({ g: bg, m: beam });
  regOcc(lh, 2, 6.4);
  addStatic(-56, -36, 1.2, 6);
  addStatic(-56, -36, 1.75, 6);
  // корабель
  const ship = new THREE.Group(); ship.position.set(-50, 0, -12); ship.rotation.set(.08, .6, .12); scene.add(ship);
  put(ship, mesh(new THREE.BoxGeometry(2.6, 1.6, 5.4), '#8C6447'), 0, .3, 0);
  put(ship, mesh(new THREE.BoxGeometry(2.4, .1, 5), '#C4956A', true, true), 0, 1.45, 0);
  put(ship, mesh(new THREE.ConeGeometry(1.3, 1.6, 4), '#8C6447'), 0, .3, 3.3).rotation.x = Math.PI / 2;
  put(ship, mesh(new THREE.BoxGeometry(.14, 4, .14), '#A47C5B'), 0, 3.3, -.6);
  const sail = mesh(new THREE.BoxGeometry(2, 1.8, .05), '#FFF3E6'); sail.position.set(0, 3.6, -.55); sail.rotation.z = .15; ship.add(sail);
  put(ship, mesh(new THREE.BoxGeometry(1.2, .5, .05), '#E8607E', false), 0, 4.9, -.6);
  regOcc(ship, 2.8, 2);
  addStatic(-50, -12, 2.1, 1.5);
  // буї та камені
  for (const [x, z] of [[-46, -26], [-36, -28], [-58, -27], [-30, -33]]) {
    const b = mesh(flat(new THREE.CylinderGeometry(.3, .4, .7, 7)), x % 4 ? '#FF8A8A' : '#FFD27A'); b.position.set(x, WATER_Y + .1, z); scene.add(b); ANIM.spin.push({ m: b, bob: true, ph: x });
  }
  // реквізит пляжу
  [[-24, -17.8], [-30.5, -16.5]].forEach(([x, z]) => addProp('sandcastle', x, z));
  [[-23, -16.5], [-29, -18.5], [-60.6, -19.4]].forEach(([x, z]) => addProp('barrel', x, z));
  [[-53.5, -38], [-39.5, -38]].forEach(([x, z]) => addProp('barrel', x, z));

  /* --- Сніг --- */
  const sn = ISLMAP.snow;
  for (const I of ICE) {
    const ice = new THREE.Mesh(new THREE.CircleGeometry(I.r, 18), mat('#CDEFFF', { roughness: .12, metalness: .2 }));
    ice.rotation.x = -Math.PI / 2; ice.position.set(I.x, .02, I.z); ice.receiveShadow = true; scene.add(ice);
    for (let i = 0; i < 4; i++) { const cr = mesh(new THREE.BoxGeometry(.04, .01, 1 + wr() * 1.5), '#FFFFFF', false); cr.position.set(I.x + (wr() - .5) * I.r, .03, I.z + (wr() - .5) * I.r); cr.rotation.y = wr() * 3; scene.add(cr); }
  }
  const hole = new THREE.Mesh(new THREE.CircleGeometry(.75, 10), basic('#2F5D8A')); hole.rotation.x = -Math.PI / 2; hole.position.set(8, .035, -41.2); scene.add(hole);
  addStatic(8, -41.2, .7, .3);
  for (let i = 0; i < 12; i++) { const p = freeSpot(sn, 6, sn.r - 1.3, 1.4); if (p) pine(p.x, p.z, .8 + wr() * .5); }
  // фортеця HR
  const fort = [[12, -49.5, 4, .9], [16.6, -46.5, .9, 3.4], [10.2, -46.8, .9, 2.6]];
  for (const [x, z, w, d] of fort) {
    const wall = mesh(new THREE.BoxGeometry(w, 1.3, d), '#F4F7FF', true, true); wall.position.set(x, .65, z); scene.add(wall);
    for (let k = 0; k < Math.max(w, d) / .8; k++) put(scene, mesh(new THREE.BoxGeometry(.4, .35, .4), '#E3ECFF'), x + (w > d ? -w / 2 + .4 + k * .8 : 0), 1.45, z + (d > w ? -d / 2 + .4 + k * .8 : 0));
    const n = Math.ceil(Math.max(w, d) / 1); for (let k = 0; k < n; k++) addStatic(x + (w > d ? -w / 2 + .5 + k : 0), z + (d > w ? -d / 2 + .5 + k : 0), .55);
  }
  for (let i = 0; i < 5; i++) { const p = freeSpot(sn, 3, sn.r - 1.5, 1.4); if (p) addProp('snowman', p.x, p.z); }

  /* --- Джунглі --- */
  const jg = ISLMAP.jungle;
  steppedPyramid(35, 65, [8, 5.6, 3.8], 1.13, '#9AA58A', '#8C9A7E');
  addStatic(35, 65, 4.2, 3.4);
  for (const [x, z] of [[33.2, 66.8], [36.8, 63.2]]) { const t = mesh(flat(new THREE.CylinderGeometry(.08, .1, .8, 6)), '#8C6447'); t.position.set(x, 3.8, z); scene.add(t); const f = mesh(new THREE.IcosahedronGeometry(.16, 0), glow('#FFB547'), false); f.position.set(x, 4.3, z); scene.add(f); ANIM.glows.push(f.material); addLampGlow(scene, x, 4.3, z, '#FFB547', 2, { pool: false }); }
  // будиночок на дереві
  const th = new THREE.Group(); th.position.set(39, 0, 53); scene.add(th);
  put(th, mesh(flat(new THREE.CylinderGeometry(.45, .6, 3.6, 7)), '#8C6447'), 0, 1.8, 0);
  put(th, mesh(flat(new THREE.CylinderGeometry(1.9, 1.9, .2, 10)), '#C4956A', true, true), 0, 3.5, 0);
  put(th, mesh(new THREE.BoxGeometry(1.4, 1.1, 1.2), '#D6A87B'), .4, 4.15, -.5);
  put(th, mesh(new THREE.ConeGeometry(1.1, .7, 4), '#E8607E'), .4, 5.05, -.5).rotation.y = Math.PI / 4;
  for (let i = 0; i < 3; i++) { const c = mesh(rough(new THREE.IcosahedronGeometry(1.6 - i * .3, 0), .2), '#5FB37A'); c.scale.y = .5; c.position.set((wr() - .5), 6 + i * .7, (wr() - .5)); th.add(c); }
  regOcc(th, 2, 7.5);
  addStatic(39, 53, .6, 3.6);
  // гніздо капібари
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; const st = mesh(new THREE.BoxGeometry(.12, .12, 1), '#A47C5B'); st.position.set(23 + Math.cos(a) * 1.3, .1, 66 + Math.sin(a) * 1.3); st.rotation.y = -a; scene.add(st); }
  pond(PONDS[0], false);
  for (let i = 0; i < 9; i++) { const p = freeSpot(jg, 4, jg.r - 2, 1.8); if (p) bigTree(p.x, p.z, .85 + wr() * .35); }
  for (let i = 0; i < 4; i++) { const p = freeSpot(jg, 3, jg.r - 1.5, 1.2); if (p) palm(p.x, p.z, .9); }
  for (let i = 0; i < 10; i++) { const p = freeSpot(jg, 2, jg.r - 1, .8); if (p) mushroom(p.x, p.z, .6 + wr() * .7, wr() < .6); }
  for (let i = 0; i < 6; i++) { const p = freeSpot(jg, 2, jg.r - 1.3, 1.1); if (p) addProp('bush', p.x, p.z); }

  /* --- Пустеля --- */
  const ds = ISLMAP.desert;
  steppedPyramid(69, -32, [8.8, 6.6, 4.4, 3], 1.05, '#E9C98F', '#DDB97C');
  put(scene, mesh(new THREE.BoxGeometry(1, .6, .2), '#4E4A6E', false), 69, 2.2, -27.55);
  addStatic(69, -32, 4.4, 4.2);
  pond(PONDS[1], true);
  palm(54, -32.5, 1); palm(58, -37.6, .9); palm(53.5, -36, .8);
  const grass = new THREE.Mesh(new THREE.RingGeometry(2.6, 4, 18, 1), mat('#9FD49A')); grass.rotation.x = -Math.PI / 2; grass.position.set(56, .03, -35); scene.add(grass);
  [[70, -20, 3.2, false], [72.5, -21.5, 1.8, true], [68.2, -17.6, 2.6, true], [73.5, -18.6, 3.2, false]].forEach(c => column(...c));
  for (let i = 0; i < 3; i++) { const kb = mesh(new THREE.BoxGeometry(.9, .08, .35), '#4E4A6E'); kb.position.set(69 + wr() * 4, .05, -17 - wr() * 3); kb.rotation.y = wr() * 3; scene.add(kb); }
  for (let i = 0; i < 8; i++) { const p = freeSpot(ds, 3, ds.r - 1.5, 1.6); if (p) cactus(p.x, p.z); }
  for (let i = 0; i < 6; i++) { const a = wr() * 6.28, r = 6 + wr() * 7; dune(ds.x + Math.cos(a) * r, ds.z + Math.sin(a) * r, 1.6 + wr() * 1.6); }
  for (let i = 0; i < 5; i++) { const p = freeSpot(ds, 3, ds.r - 1.3, 1.2); if (p) addProp('pot', p.x, p.z); }

  // кавові точки, записки, риболовля
  WAYPOINTS.forEach(waypointMarker);
  NOTES.forEach(noteMarker);
  FISH_SPOTS.forEach(fishSpotMarker);

  // скрині орієнтирів (гарантований предмет дослідження)
  addChest('lm_lighthouse', -56, -35.2, 2.5, true, 6, ['compass', 'flippers'], 'saltraf');
  addChest('lm_ship', -50.2, -12.6, 2, false, 1.5, ['oar', 'vest'], 'saltraf');
  addChest('lm_ice', 9.6, -43.6, 2, false, 0, ['icicle', 'spikes', 'parka'], 'icelatte');
  addChest('lm_temple', 35, 65, 2.5, true, 3.4, ['machete', 'archhat'], null);
  addChest('lm_treehouse', 38.4, 52.3, 1.5, false, 3.6, ['umbrella', 'rod'], null);
  addChest('lm_pyramid', 69, -32, 3, true, 4.2, ['cactus', 'panama'], null);

  // інгредієнти нових біомів
  const plan = { sea: [['salt', -26, -19], ['salt', -37.5, -41.5], ['syrup', -59.5, -34.5], ['tears', -28.5, -9.5]], snow: [['icecube', 3, -38], ['icecube', 13, -36], ['milk', 3, -47]], jungle: [['beans', 27, 60], ['syrup', 40, 60], ['chamomile', 30, 68]], desert: [['tears', 62, -22], ['monday', 74, -28], ['syrup', 60, -38]] };
  for (const id in plan) for (const [ing, x, z] of plan[id]) addNode(ing, x, z);
}

/* ---------- Реквізит біомів ---------- */
Object.assign(PROP_T, {
  sandcastle: { n: 'Пісочний замок', hp: 6, r: .5 },
  barrel: { n: 'Бочка', hp: 12, r: .45 },
  snowman: { n: 'Сніговик', hp: 10, r: .5 },
  bush: { n: 'Кавовий кущ', hp: 7, r: .55 },
  pot: { n: 'Амфора', hp: 6, r: .4 },
});
function biomePropMesh(type, g) {
  switch (type) {
    case 'sandcastle':
      put(g, mesh(new THREE.BoxGeometry(.9, .4, .9), '#EED9A6'), 0, .2, 0);
      for (const [x, z] of [[-.35, -.35], [.35, -.35], [-.35, .35], [.35, .35]]) put(g, mesh(flat(new THREE.CylinderGeometry(.14, .16, .55, 6)), '#E3CB92'), x, .45, z);
      put(g, mesh(new THREE.BoxGeometry(.02, .3, .2), '#FF8A8A'), 0, .6, 0); break;
    case 'barrel':
      put(g, mesh(flat(new THREE.CylinderGeometry(.38, .38, .9, 9)), '#B07A5A'), 0, .45, 0);
      put(g, mesh(flat(new THREE.CylinderGeometry(.4, .4, .08, 9)), '#7E77A0'), 0, .25, 0);
      put(g, mesh(flat(new THREE.CylinderGeometry(.4, .4, .08, 9)), '#7E77A0'), 0, .68, 0); break;
    case 'snowman':
      put(g, mesh(new THREE.IcosahedronGeometry(.45, 1), '#FFFFFF'), 0, .4, 0);
      put(g, mesh(new THREE.IcosahedronGeometry(.32, 1), '#FFFFFF'), 0, .98, 0);
      put(g, mesh(new THREE.ConeGeometry(.06, .3, 5), '#FFA94D'), 0, 1, .32).rotation.x = Math.PI / 2;
      put(g, mesh(new THREE.BoxGeometry(.5, .08, .1), '#E8607E'), 0, .75, .2);
      put(g, mesh(flat(new THREE.CylinderGeometry(.2, .2, .3, 7)), '#2E2346'), 0, 1.35, 0); break;
    case 'bush':
      put(g, mesh(rough(new THREE.IcosahedronGeometry(.55, 0), .25), '#4FA06C'), 0, .5, 0);
      for (let i = 0; i < 6; i++) put(g, mesh(new THREE.IcosahedronGeometry(.08, 0), '#E8505B', false), (Math.random() - .5) * .8, .4 + Math.random() * .5, (Math.random() - .5) * .8); break;
    case 'pot':
      put(g, mesh(new THREE.SphereGeometry(.35, 7, 5), '#D9905B'), 0, .38, 0);
      put(g, mesh(flat(new THREE.CylinderGeometry(.14, .2, .3, 7)), '#D9905B'), 0, .78, 0);
      put(g, mesh(flat(new THREE.CylinderGeometry(.36, .36, .06, 7)), '#4E4A6E'), 0, .4, 0); break;
  }
}
const BIOME_PROP_COL = { sandcastle: '#EED9A6', barrel: '#B07A5A', snowman: '#FFFFFF', bush: '#4FA06C', pot: '#D9905B' };

/* ---------- Моделі нових ворогів і улюбленців ---------- */
function buildCrab(scale = 1, col = '#FF7A6B') {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body); root.scale.setScalar(scale);
  const torso = put(body, mesh(new THREE.BoxGeometry(.9, .32, .65), col), 0, .38, 0);
  const head = torso;
  for (const sx of [-1, 1]) {
    put(body, mesh(new THREE.BoxGeometry(.05, .3, .05), col), sx * .18, .66, .22);
    put(body, mesh(new THREE.SphereGeometry(.07, 5, 4), '#2E2346'), sx * .18, .82, .22);
    const claw = put(body, mesh(new THREE.BoxGeometry(.3, .22, .35), shade(col, .05)), sx * .58, .45, .45);
    claw.rotation.y = sx * .4;
  }
  const legs = [];
  for (let i = 0; i < 3; i++) for (const sx of [-1, 1]) { const l = put(body, mesh(new THREE.BoxGeometry(.5, .06, .06), shade(col, -.08)), sx * .55, .22, -.2 + i * .2); l.rotation.z = sx * .5; legs.push(l); }
  return { root, body, torso, head, legs, hound: true, crab: true };
}
function buildHR() {
  const h = humanoid({ skin: '#E6D3C3', shirt: '#9FC3E8', pants: '#4E5A8C' });
  put(h.body, mesh(new THREE.BoxGeometry(.62, .16, .5), '#E8607E'), 0, 1.22, 0);
  put(h.body, mesh(new THREE.BoxGeometry(.18, .5, .06), '#E8607E'), .15, .95, .3);
  for (const sx of [-1, 1]) put(h.body, mesh(new THREE.SphereGeometry(.13, 6, 4), '#FFFFFF'), sx * .3, 1.5, 0);
  put(h.body, mesh(new THREE.BoxGeometry(.66, .05, .05), '#FFFFFF'), 0, 1.76, 0);
  const ball = mesh(new THREE.IcosahedronGeometry(.16, 0), '#FFFFFF'); ball.position.set(0, .05, .1); h.hand.add(ball);
  return h;
}
function buildMonkey() {
  const h = humanoid({ skin: '#D9A97C', shirt: '#9A6644', pants: '#7A4E3A' });
  h.root.scale.setScalar(.82);
  put(h.body, mesh(new THREE.BoxGeometry(.5, .32, .1), '#E9C9A3', false), 0, 1.42, .24);
  for (const sx of [-1, 1]) put(h.body, mesh(new THREE.SphereGeometry(.11, 6, 4), '#9A6644'), sx * .32, 1.55, 0);
  put(h.body, mesh(G.tie, '#6CB4FF'), 0, .95, .37);
  const tail = mesh(new THREE.BoxGeometry(.06, .06, .9), '#9A6644'); tail.position.set(0, .7, -.6); tail.rotation.x = .7; h.body.add(tail);
  return h;
}
function buildMummy() {
  const h = humanoid({ skin: '#EFE6D2', shirt: '#E6DCC4', pants: '#D9CDB0' });
  h.root.scale.setScalar(1.12);
  for (let i = 0; i < 6; i++) put(h.body, mesh(new THREE.BoxGeometry(.84, .05, .84), '#CFC2A3', false), 0, .4 + i * .22, 0).rotation.y = i * .3;
  for (const e of [-.1, .1]) put(h.body, mesh(G.eye, glow('#FFB547'), false), e, 1.5, .28);
  return h;
}
function buildPenguin() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const torso = put(body, mesh(new THREE.IcosahedronGeometry(.42, 1), '#2E2346'), 0, .5, 0); torso.scale.set(1, 1.3, .9);
  put(body, mesh(new THREE.IcosahedronGeometry(.32, 1), '#FFFFFF'), 0, .45, .14).scale.set(1, 1.3, .7);
  const head = put(body, mesh(new THREE.IcosahedronGeometry(.27, 1), '#2E2346'), 0, 1.05, 0);
  put(body, mesh(new THREE.ConeGeometry(.08, .22, 5), '#FFA94D'), 0, 1.02, .3).rotation.x = Math.PI / 2;
  for (const sx of [-1, 1]) { put(body, mesh(new THREE.SphereGeometry(.05, 5, 4), '#FFFFFF', false), sx * .1, 1.1, .22); put(body, mesh(new THREE.BoxGeometry(.18, .05, .25), '#FFA94D'), sx * .14, .04, .1); }
  put(body, mesh(new THREE.BoxGeometry(.5, .08, .08), '#E8607E'), 0, .82, .15);
  return { root, body, head, torso };
}
function buildCapy() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const torso = put(body, mesh(new THREE.BoxGeometry(.6, .5, .95), '#A87A55'), 0, .48, 0);
  const head = put(body, mesh(new THREE.BoxGeometry(.48, .42, .5), '#B88A62'), 0, .66, .58);
  put(body, mesh(new THREE.BoxGeometry(.4, .2, .14), '#8C6447'), 0, .58, .84);
  for (const sx of [-1, 1]) { put(body, mesh(new THREE.BoxGeometry(.1, .12, .06), '#8C6447'), sx * .18, .92, .48); put(body, mesh(G.eye, '#2E2346', false), sx * .14, .74, .84); }
  for (const [x, z] of [[-.2, .3], [.2, .3], [-.2, -.3], [.2, -.3]]) put(body, mesh(new THREE.BoxGeometry(.14, .25, .14), '#8C6447'), x, .12, z);
  put(body, mesh(new THREE.SphereGeometry(.12, 6, 4), '#FFA94D'), 0, .94, .55);
  return { root, body, head, torso };
}
function buildPet(id) { return id === 'capy' ? buildCapy() : id === 'penguin' ? buildPenguin() : buildCrab(.6, '#FF8A6B'); }

/* ---------- Анімація біомів ---------- */
function updBiomeAnim(t, dt, night) {
  updOcclusion(dt);
  for (const w of ANIM.water) {
    const p = w.m.geometry.attributes.position, b = w.base;
    for (let i = 0; i < p.count; i++) {
      const x = b[i * 3], y = b[i * 3 + 1];
      p.array[i * 3 + 2] = Math.sin(x * .35 + t * 1.3) * .07 + Math.cos(y * .3 + t * .9) * .06;
    }
    p.needsUpdate = true;
  }
  for (const f of ANIM.foam) { const s = 1 + Math.sin(t * 1.4 + f.position.x) * .04; f.scale.set(s, s, 1); f.material.opacity = .4 + Math.sin(t * 2 + f.position.z) * .15; }
  for (const f of ANIM.falls) {
    f.sheet.material.opacity = .42 + Math.sin(t * 3 + f.ph) * .08;
    f.streaks.forEach((s, k) => { s.position.y = -((t * 6 + k * 3 + f.ph) % 14); });
  }
  for (const b of ANIM.beams) { b.g.rotation.y = t * .8; b.m.material.opacity = night * .22; }
  for (const m of ANIM.glows) m.emissiveIntensity = .3 + night * .9;
  for (const s of ANIM.spin) { if (s.bob) s.m.position.y = WATER_Y + .1 + Math.sin(t * 2 + s.ph) * .08; s.m.rotation.z = Math.sin(t * 1.5 + s.ph) * .12; }
}
