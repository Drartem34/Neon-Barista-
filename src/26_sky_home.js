/* =====================================================================
   НЕБЕСНІ КАМЕНІ, ТВІЙ ОСТРІВ, ВІЗУАЛ ЗЦІЛЕННЯ
   ===================================================================== */
const HOME_DYN = [];

function buildSky() {
  SKY.forEach((s, i) => {
    const g = new THREE.Group(); g.position.set(s.x, s.h, s.z); scene.add(g);
    const top = mesh(flat(new THREE.CylinderGeometry(s.r, s.r * .92, .35, Math.max(8, Math.round(s.r * 6))).translate(0, -.17, 0)), s.top ? '#C9F0D8' : pick(['#C3E6A8', '#B8E6C9', '#D2E9B0']), false, true);
    g.add(top);
    let cone = new THREE.ConeGeometry(s.r * .9, s.r * 1.7 + .6, 8, 3); cone.rotateX(Math.PI); cone.translate(0, -.35 - (s.r * 1.7 + .6) / 2, 0);
    g.add(mesh(rough(cone, .3, -.35), pick(['#9389C9', '#A99FD8', '#8C84C6']), false));
    if (i % 3 === 1) put(g, mesh(new THREE.OctahedronGeometry(.18, 0), glow('#B9F5DE'), false), s.r * .5, -.9, 0);
    for (let k = 0; k < Math.round(s.r * 3); k++) { const a = wr() * 6.28, d = s.r * (.55 + wr() * .4); put(g, mesh(new THREE.ConeGeometry(.08, .25, 4), '#8FCB9E', false), Math.cos(a) * d, .1, Math.sin(a) * d); }
    if (islandAt(s.x, s.z)) addStatic(s.x, s.z, s.r * .85, s.h);
  });
  // вівтар
  const alt = SKY.find(s => s.id === 'altar');
  for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + .4; const c = mesh(flat(new THREE.CylinderGeometry(.18, .22, 1.8, 7)), '#F4F0FF'); c.position.set(alt.x + Math.cos(a) * 2, alt.h + .9, alt.z + Math.sin(a) * 2); scene.add(c); }
  const halo = new THREE.Mesh(new THREE.TorusGeometry(1.2, .06, 6, 24), basic('#FFE8A8', .9)); halo.rotation.x = Math.PI / 2; halo.position.set(alt.x, alt.h + 2.2, alt.z); scene.add(halo); ANIM.spin.push({ m: halo, ph: 0 });
  addChest('lm_altar', alt.x + .6, alt.z - .6, 2.5, true, alt.h, ['parka', 'panama', 'compass', 'umbrella'], null);
  // небесна кав'ярня
  const cafe = SKY.find(s => s.id === 'skycafe');
  const ct = new THREE.Group(); ct.position.set(cafe.x - .8, cafe.h, cafe.z - .6); scene.add(ct);
  put(ct, mesh(flat(new THREE.CylinderGeometry(.5, .5, .06, 9)), '#FFF3E6'), 0, .78, 0); put(ct, mesh(flat(new THREE.CylinderGeometry(.05, .08, .78, 6)), '#8E86B0'), 0, .39, 0);
  put(ct, mesh(G.cup, '#FFFFFF'), .1, .9, .1);
  put(ct, mesh(new THREE.BoxGeometry(.06, 2, .06), '#F2E6D8'), .9, 1, .4); put(ct, mesh(new THREE.ConeGeometry(1, .4, 8), '#FFB3C7'), .9, 2.1, .4);
  addChest('lm_skycafe', cafe.x + .7, cafe.z + .5, 3, true, cafe.h, ['vest', 'archhat', 'spikes', 'machete'], null);
  const sea = SKY.find(s => s.id === 'seastone');
  addChest('lm_seastone', sea.x, sea.z, 2, false, sea.h, ['oar', 'rod', 'flippers'], null);
}

/* ---------- Твій острів ---------- */
let homeDecorG = null;
function buildHomeBase() {
  const h = ISLMAP.home;
  // кавовий візок
  const cart = new THREE.Group(); cart.position.set(HOME.bar.x, 0, HOME.bar.z); scene.add(cart);
  put(cart, mesh(new THREE.BoxGeometry(2.2, .9, 1), '#F7C6A5'), 0, .75, 0);
  put(cart, mesh(new THREE.BoxGeometry(2.4, .1, 1.2), '#FFF3E6'), 0, 1.25, 0);
  for (const sx of [-.8, .8]) put(cart, mesh(flat(new THREE.CylinderGeometry(.3, .3, .12, 10)), '#4E4A6E'), sx, .3, .55).rotation.x = Math.PI / 2;
  put(cart, mesh(new THREE.BoxGeometry(.6, .5, .45), '#D9DCE8'), -.5, 1.55, -.1);
  put(cart, mesh(new THREE.BoxGeometry(.06, 1.6, .06), '#F2E6D8'), .7, 2, -.3);
  put(cart, mesh(new THREE.ConeGeometry(1.2, .45, 8), '#7FD6B9'), .7, 2.85, -.3);
  for (const a of [-.7, .7]) addStatic(HOME.bar.x + a, HOME.bar.z, .7);
  // гамак
  const hm = new THREE.Group(); hm.position.set(HOME.hammock.x, 0, HOME.hammock.z); hm.rotation.y = .9; scene.add(hm);
  for (const sx of [-1.2, 1.2]) put(hm, mesh(flat(new THREE.CylinderGeometry(.08, .1, 1.6, 6)), '#A47C5B'), sx, .8, 0);
  const cloth = mesh(new THREE.BoxGeometry(2.2, .06, .7), '#FF9C8A'); cloth.position.y = .65; hm.add(cloth);
  addStatic(HOME.hammock.x, HOME.hammock.z, .7, 1);
  // сховок
  const st = new THREE.Group(); st.position.set(HOME.stash.x, 0, HOME.stash.z); st.rotation.y = -.6; scene.add(st);
  put(st, mesh(new THREE.BoxGeometry(1.1, .6, .75), '#8C6447'), 0, .3, 0);
  put(st, mesh(new THREE.BoxGeometry(1.14, .22, .79), '#A47C5B'), 0, .7, 0);
  put(st, mesh(new THREE.BoxGeometry(1.16, .08, .1), '#FFD27A', false), 0, .45, .38);
  addStatic(HOME.stash.x, HOME.stash.z, .6, .8);
  // табличка
  const sg = new THREE.Group(); sg.position.set(h.x - 3.6, 0, h.z - 3.2); sg.rotation.y = .8; scene.add(sg);
  put(sg, mesh(new THREE.BoxGeometry(.08, 1.2, .08), '#A47C5B'), 0, .6, 0); put(sg, mesh(new THREE.BoxGeometry(1, .5, .06), '#FFF3E6'), 0, 1.1, 0);
  put(sg, mesh(new THREE.BoxGeometry(.6, .08, .02), '#7FD6B9', false), 0, 1.15, .04);
  [cart, hm, st, sg].forEach(o => HOME_DYN.push(o));
}
function decorMesh(id) {
  const g = new THREE.Group();
  switch (id) {
    case 'flowerbed': put(g, mesh(flat(new THREE.CylinderGeometry(.75, .8, .25, 9)), '#A47C5B'), 0, .12, 0); for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28; put(g, mesh(new THREE.IcosahedronGeometry(.14, 0), pick(['#FF9AB6', '#FFD27A', '#B9A4FF', '#FFFFFF'])), Math.cos(a) * .45, .42, Math.sin(a) * .45); } break;
    case 'lantern': put(g, mesh(flat(new THREE.CylinderGeometry(.05, .07, 1.8, 6)), '#4E4A6E'), 0, .9, 0); put(g, mesh(new THREE.BoxGeometry(.35, .45, .35), glow('#FFB38A')), 0, 1.95, 0); break;
    case 'bench': put(g, mesh(new THREE.BoxGeometry(1.6, .1, .5), '#D6A87B'), 0, .45, 0); put(g, mesh(new THREE.BoxGeometry(1.6, .4, .08), '#C4956A'), 0, .75, -.22); break;
    case 'palm': { const t = new THREE.Group(); g.add(t); for (let i = 0; i < 4; i++) put(t, mesh(flat(new THREE.CylinderGeometry(.12, .15, .7, 6)), '#A47C5B'), i * .06, .35 + i * .66, 0); for (let i = 0; i < 6; i++) { const l = mesh(new THREE.BoxGeometry(.3, .05, 1.5).translate(0, 0, .75), '#6FC08C'); l.position.set(.2, 2.7, 0); l.rotation.y = i; l.rotation.x = .45; t.add(l); } break; }
    case 'pine': for (let i = 0; i < 3; i++) put(g, mesh(new THREE.ConeGeometry(1 - i * .27, 1.1, 7), '#5E9C8A'), 0, .9 + i * .75, 0); put(g, mesh(flat(new THREE.CylinderGeometry(.12, .16, .8, 6)), '#8C6447'), 0, .4, 0); break;
    case 'blossom': put(g, mesh(flat(new THREE.CylinderGeometry(.14, .2, 1.3, 6)), '#A3795C'), 0, .65, 0); put(g, mesh(rough(new THREE.IcosahedronGeometry(1, 0), .2), '#F7B6C8'), 0, 1.9, 0); break;
    case 'table': put(g, mesh(flat(new THREE.CylinderGeometry(.55, .55, .07, 9)), '#FFF3E6'), 0, .78, 0); put(g, mesh(flat(new THREE.CylinderGeometry(.06, .1, .78, 6)), '#8E86B0'), 0, .39, 0); put(g, mesh(G.cup, '#FFFFFF'), .12, .9, .1); break;
    case 'mushroom': put(g, mesh(flat(new THREE.CylinderGeometry(.15, .2, .8, 6)), '#F3E6D6'), 0, .4, 0); put(g, mesh(new THREE.SphereGeometry(.6, 7, 4, 0, 6.29, 0, Math.PI / 2), mat('#9F8CFF', { emissive: '#9F8CFF', emissiveIntensity: .6 })), 0, .75, 0); break;
    case 'snowman': put(g, mesh(new THREE.IcosahedronGeometry(.45, 1), '#FFFFFF'), 0, .4, 0); put(g, mesh(new THREE.IcosahedronGeometry(.32, 1), '#FFFFFF'), 0, .98, 0); put(g, mesh(new THREE.ConeGeometry(.06, .3, 5), '#FFA94D'), 0, 1, .32).rotation.x = Math.PI / 2; break;
    case 'statue': put(g, mesh(new THREE.BoxGeometry(1, .5, 1), '#C9C2DE'), 0, .25, 0); { const c = buildCapy(); c.root.scale.setScalar(1.3); c.root.position.y = .5; c.root.traverse(o => { if (o.isMesh) o.material = mat('#D9D3EE'); }); g.add(c.root); } break;
    case 'fountain': put(g, mesh(flat(new THREE.CylinderGeometry(1, 1.1, .45, 12)), '#C9C2DE'), 0, .22, 0); put(g, mesh(flat(new THREE.CylinderGeometry(.85, .85, .05, 12)), mat('#7A4E3A', { emissive: '#3B2418', emissiveIntensity: .3 })), 0, .42, 0); put(g, mesh(flat(new THREE.CylinderGeometry(.15, .2, 1.2, 8)), '#D9D3EE'), 0, .9, 0); put(g, mesh(G.cup, '#FFFFFF'), 0, 1.6, 0).scale.setScalar(2.4); break;
    case 'tree': put(g, mesh(flat(new THREE.CylinderGeometry(.22, .32, 2, 7)), '#A3795C'), 0, 1, 0); put(g, mesh(rough(new THREE.IcosahedronGeometry(1.4, 0), .2), glow('#FFC9DD')), 0, 2.6, 0); put(g, mesh(rough(new THREE.IcosahedronGeometry(.9, 0), .2), glow('#FFE0EC')), .5, 3.4, .2); break;
  }
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
  return g;
}
function renderHome() {
  const h = ISLMAP.home;
  const col = (HOME_COLORS.find(c => c.id === P.home.color) || HOME_COLORS[0]).c;
  if (h.topMesh) h.topMesh.material.color.set(col);
  if (homeDecorG) scene.remove(homeDecorG);
  homeDecorG = new THREE.Group(); scene.add(homeDecorG);
  STATICS.splice(0, STATICS.length, ...STATICS.filter(o => !o.home));
  P.home.slots.forEach((id, i) => {
    if (!id || !DECOR[id]) return;
    const [x, z] = HOME.slots[i];
    const m = decorMesh(id); m.position.set(x, 0, z); m.rotation.y = i * 1.3; homeDecorG.add(m);
    if (!['flowerbed', 'table'].includes(id)) STATICS.push({ x, z, r: id === 'fountain' ? 1.1 : .5, h: 2.5, home: true });
  });
}

/* ---------- Зцілення: колір землі, квіти, Дерево Спокою ---------- */
const HEAL_FX = {};
function burnedColor(s) { return mixHex(s.top, '#A49DB8', .62); }
function healOf(id) { const s = ISLMAP[id]; if (!s || !HEAL_REGIONS.includes(id)) return 100; return clamp(P.heal[id] || 0, 0, 100); }
function applyHealVisual(id, silent) {
  const s = ISLMAP[id], h = healOf(id) / 100;
  if (s.biome === 'sea') { const w = ANIM.water[0]; if (w) w.m.material.color.set(mixHex('#93A9B8', '#5FD3E6', h)); }
  else if (s.topMesh) s.topMesh.material.color.set(mixHex(burnedColor(s), shade(s.top, .03), h));
  const fx = HEAL_FX[id] || (HEAL_FX[id] = { flowers: 0, tree: null, rng: mulberry32(id.length * 977 + id.charCodeAt(0) * 31) });
  const want = h < .3 ? 0 : Math.floor((h - .2) * 12);
  while (fx.flowers < want) { addHealFlower(s, fx); fx.flowers++; if (!silent) burst(pl.x, 1, pl.z, '#FFB3C7', 4, 2, .6, 2); }
  if (h >= 1 && !fx.tree) {
    fx.tree = decorMesh('tree');
    let p = null;
    for (let k = 0; k < 40 && !p; k++) { const a = fx.rng() * 6.28, r = 2 + fx.rng() * (s.r - 4); const x = s.biome === 'sea' ? SEA_LAND[0].x + Math.cos(a) * 3 : s.x + Math.cos(a) * r, z = s.biome === 'sea' ? SEA_LAND[0].z + Math.sin(a) * 3 : s.z + Math.sin(a) * r; if (terrainAt(x, z) === 'land' && !STATICS.some(o => dist2(x, z, o.x, o.z) < o.r + 1.4) && !inCorridor(x, z)) p = { x, z }; }
    if (p) { fx.tree.position.set(p.x, 0, p.z); scene.add(fx.tree); addStatic(p.x, p.z, .5); }
  }
}
function addHealFlower(s, fx) {
  for (let k = 0; k < 20; k++) {
    let x, z;
    if (s.biome === 'sea') { const L = SEA_LAND[Math.floor(fx.rng() * SEA_LAND.length)]; const a = fx.rng() * 6.28, r = fx.rng() * (L.r - .8); x = L.x + Math.cos(a) * r; z = L.z + Math.sin(a) * r; }
    else { const a = fx.rng() * 6.28, r = 1 + fx.rng() * (s.r - 2); x = s.x + Math.cos(a) * r; z = s.z + Math.sin(a) * r; }
    if (terrainAt(x, z) !== 'land' || STATICS.some(o => dist2(x, z, o.x, o.z) < o.r + .3)) continue;
    const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    const cols = s.biome === 'snow' ? ['#B9E8FF', '#FFFFFF', '#D2C6F2'] : s.biome === 'desert' ? ['#FF9AB6', '#FFD27A', '#FF8A5B'] : ['#FF9AB6', '#FFD27A', '#B9A4FF', '#FFFFFF', '#8FD9C0'];
    for (let i = 0; i < 3; i++) {
      const ox = (fx.rng() - .5) * .6, oz = (fx.rng() - .5) * .6;
      put(g, mesh(new THREE.BoxGeometry(.03, .3, .03), '#6FC08C', false), ox, .15, oz);
      put(g, mesh(new THREE.IcosahedronGeometry(.09, 0), cols[Math.floor(fx.rng() * cols.length)], false), ox, .33, oz);
    }
    return;
  }
}
