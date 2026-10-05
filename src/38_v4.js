/* =====================================================================
   v4 СИСТЕМИ
   ===================================================================== */

/* ---------- Графіка й оптимізація ---------- */
const GFX_KEY = 'barista-gfx';
const GFX = { q: IS_TOUCH ? 'medium' : 'high', fps: false, exp: .85 };
try { Object.assign(GFX, JSON.parse(localStorage.getItem(GFX_KEY) || '{}')); } catch (e) { }
const PMULS = { high: 1, medium: .65, low: .35 };
function applyGfx(runtime) {
  const q = GFX.q;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q === 'high' ? 2 : q === 'medium' ? 1.5 : 1));
  const shadows = q !== 'low';
  const sz = q === 'high' ? 2048 : 1024;
  if (renderer.shadowMap.enabled !== shadows || sun.shadow.mapSize.x !== sz) {
    renderer.shadowMap.enabled = shadows; sun.castShadow = shadows;
    renderer.shadowMap.type = q === 'high' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    sun.shadow.mapSize.set(sz, sz);
    if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
    if (runtime) scene.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.needsUpdate = true); });
  }
  PMUL = PMULS[q];
  renderer.toneMappingExposure = GFX.exp;
  if (LAMP_LIGHTS.length) applyLampQuality();
  camera.far = q === 'low' ? 170 : 400; camera.updateProjectionMatrix();
  resize();
}
function saveGfx() { try { localStorage.setItem(GFX_KEY, JSON.stringify(GFX)); } catch (e) { } }
let mergeStats = { before: 0, after: 0 };
/* Злиття геометрії: звичайні пласкі матеріали запікаються у кольори вершин і зливаються в один меш
   на клітинку 48×48 — замість тисяч викликів малювання лишаються десятки */
const VC_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .85, metalness: 0 });
function isPlainMat(m) { return m && m.isMeshStandardMaterial && !m.map && m.metalness === 0 && m.emissive.getHex() === 0 && Math.abs(m.roughness - .85) < .01 && m.side === THREE.FrontSide; }
function bakeMerge(list, relFn, withColor) {
  let total = 0;
  const geos = list.map(o => { let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry; if (!g.attributes.normal) { g = g.clone(); g.computeVertexNormals(); } total += g.attributes.position.count; return [o, g]; });
  const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), col = withColor ? new Float32Array(total * 3) : null;
  const v = new THREE.Vector3(), n = new THREE.Vector3(), nm = new THREE.Matrix3();
  let off = 0;
  for (const [o, g] of geos) {
    const M = relFn(o); nm.getNormalMatrix(M);
    const pa = g.attributes.position, na = g.attributes.normal, c = o.material.color;
    for (let i = 0; i < pa.count; i++) {
      v.fromBufferAttribute(pa, i).applyMatrix4(M); n.fromBufferAttribute(na, i).applyMatrix3(nm).normalize();
      const j = off * 3; pos[j] = v.x; pos[j + 1] = v.y; pos[j + 2] = v.z; nor[j] = n.x; nor[j + 1] = n.y; nor[j + 2] = n.z;
      if (col) { col[j] = c.r; col[j + 1] = c.g; col[j + 2] = c.b; }
      off++;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  if (col) geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeBoundingSphere();
  return geo;
}
function mergeStatics() {
  const dyn = new Set();
  const add = o => { if (o) dyn.add(o); };
  PROPS.forEach(p => add(p.mesh)); CHESTS.forEach(c => add(c.mesh)); NODES.forEach(n => { add(n.mesh); add(n.base); });
  WAYPOINTS.forEach(w => add(w.mesh)); NOTES.forEach(n => add(n.mesh)); FISH_SPOTS.forEach(f => add(f.bob));
  PADS.forEach(p => add(p.mesh)); OCC.forEach(o => add(o.g)); ANIM.water.forEach(w => add(w.m)); ANIM.foam.forEach(add);
  ANIM.falls.forEach(f => add(f.sheet.parent)); ANIM.beams.forEach(b => add(b.g)); ANIM.spin.forEach(s => add(s.m));
  DEBRIS.forEach(add); CLOUDS.forEach(add); ADDONS.dyn.forEach(add); ISL.forEach(s => add(s.topMesh)); HOME_DYN.forEach(add);
  const isDyn = o => { for (let p = o; p; p = p.parent) if (dyn.has(p)) return true; return false; };
  scene.updateMatrixWorld(true);
  const buckets = new Map(), victims = [], wp = new THREE.Vector3();
  scene.traverse(o => {
    if (!o.isMesh) return;
    mergeStats.before++;
    if (isDyn(o) || Array.isArray(o.material) || o.material.transparent) return;
    o.getWorldPosition(wp);
    const plain = isPlainMat(o.material);
    const key = (plain ? 'VC' : o.material.uuid) + '|' + o.castShadow + '|' + o.receiveShadow + '|' + Math.floor(wp.x / 48) + '|' + Math.floor(wp.z / 48);
    if (!buckets.has(key)) buckets.set(key, { mat: plain ? VC_MAT : o.material, plain, cast: o.castShadow, recv: o.receiveShadow, list: [] });
    buckets.get(key).list.push(o); victims.push(o);
  });
  for (const b of buckets.values()) {
    const geo = bakeMerge(b.list, o => o.matrixWorld, b.plain);
    const m = new THREE.Mesh(geo, b.mat); m.castShadow = b.cast; m.receiveShadow = b.recv; m.matrixAutoUpdate = false; m.updateMatrix();
    scene.add(m);
  }
  victims.forEach(o => o.parent && o.parent.remove(o));
  OCC.forEach(o => mergeGroup(o.g, true)); PROPS.forEach(p => mergeGroup(p.mesh)); CLOUDS.forEach(c => mergeGroup(c));
  let after = 0; scene.traverse(o => { if (o.isMesh) after++; }); mergeStats.after = after;
}
function mergeGroup(g, fading) {
  g.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(g.matrixWorld).invert();
  const groups = new Map(), old = [];
  let vcMat = null;
  g.traverse(o => {
    if (!o.isMesh) return;
    const m = o.material, plain = fading ? (m.isMeshStandardMaterial && !m.map && m.metalness === 0 && m.emissive.getHex() === 0) : isPlainMat(m);
    const k = (plain ? 'VC' : m.uuid) + '|' + o.castShadow;
    if (!groups.has(k)) groups.set(k, { mat: m, plain, cast: o.castShadow, recv: o.receiveShadow, list: [] });
    groups.get(k).list.push(o); old.push(o);
  });
  if (old.length < 2) return;
  const rel = new THREE.Matrix4();
  for (const b of groups.values()) {
    if (b.list.length < 2 && !b.plain) continue;
    const geo = bakeMerge(b.list, o => rel.multiplyMatrices(inv, o.matrixWorld), b.plain);
    let mat = b.mat;
    if (b.plain) { if (fading) { vcMat = vcMat || new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .85, metalness: 0, transparent: true }); mat = vcMat; } else mat = VC_MAT; }
    const m = new THREE.Mesh(geo, mat); m.castShadow = b.cast; m.receiveShadow = b.recv; g.add(m);
    b.list.forEach(o => o.parent && o.parent.remove(o));
  }
}
let fpsAcc = 0, fpsN = 0, fpsShow = 0;
function updFps(rdt) {
  if (!GFX.fps) { $('#fps').hidden = true; return; }
  fpsAcc += rdt; fpsN++;
  if (fpsAcc > .5) { fpsShow = Math.round(fpsN / fpsAcc); fpsAcc = 0; fpsN = 0; const e = $('#fps'); e.hidden = false; e.textContent = fpsShow + ' FPS · ' + renderer.info.render.calls + ' викл.'; }
}

/* ---------- Бій: зарядка, серії, відчуття удару ---------- */
let hitStopT = 0, chargeRing = null;
const WARN = [];
function hitStop(t) { hitStopT = Math.max(hitStopT, t); }
function atkDown() {
  if (!running || paused || panel) return;
  input.atk = true; input.atkHold = 0;
  attack();
}
function atkUp() {
  if (!input.atk) return;
  input.atk = false;
  if (pl.charge >= 1) chargedAttack();
  pl.charge = 0; if (chargeRing) chargeRing.visible = false;
}
function updCharge(dt) {
  if (!chargeRing) {
    chargeRing = new THREE.Mesh(new THREE.RingGeometry(.8, 1, 28), new THREE.MeshBasicMaterial({ color: '#FFE27A', transparent: true, opacity: .8, side: THREE.DoubleSide, depthWrite: false }));
    chargeRing.rotation.x = -Math.PI / 2; scene.add(chargeRing); chargeRing.visible = false;
  }
  if (!input.atk || pl.dead || isWet(pl.terr) || fishing) { pl.charge = 0; chargeRing.visible = false; return; }
  input.atkHold += dt;
  if (input.atkHold > .28) {
    const was = pl.charge || 0;
    pl.charge = Math.min(1, was + dt / .65);
    if (was < 1 && pl.charge >= 1) { sfx('charged'); burst(pl.x, 1, pl.z, '#FFE27A', 8, 2, .4, 2); }
    chargeRing.visible = true; chargeRing.position.set(pl.x, pl.y + .1, pl.z);
    const s = .6 + pl.charge * .9; chargeRing.scale.set(s, s, 1);
    chargeRing.material.color.set(pl.charge >= 1 ? '#FFE27A' : '#FFFFFF'); chargeRing.material.opacity = .4 + pl.charge * .5;
    pl.chargeSlow = true;
  } else pl.chargeSlow = false;
}
function chargedAttack() {
  if (pl.dead || paused || panel || pl.jump || pl.falling || isWet(pl.terr)) return;
  const it = eqItem('hand1'), h = handStats(it);
  const cost = (2 + h.wt * 1.4) * 1.6;
  if (pl.st < cost) { ftext(pl.x, 2.3, pl.z, 'Видихся…', 'bad'); return; }
  pl.st -= cost; pl.stDelay = .7; pl.atkCd = Math.max(.35, 1 / h.spd);
  aimFace();
  pl.pending = { t: .06, h, it, charged: true };
  pl.swingT = .3; pl.swingKind = 3;
  sfx('whoosh');
}
function warnArc(m) {
  if (m.T.ranged) return;
  const dash = m.T.dash, life = m.T.wind;
  let geo;
  if (dash) geo = new THREE.PlaneGeometry(1.2, 7).translate(0, 3.5, 0);
  else geo = new THREE.RingGeometry(.3, m.T.rng + .35, 18, 1, -.6, 1.2);
  const mesh_ = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: '#FF5C7A', transparent: true, opacity: .05, side: THREE.DoubleSide, depthWrite: false }));
  mesh_.rotation.x = -Math.PI / 2;
  const g = new THREE.Group(); g.add(mesh_); g.position.set(m.x, .13, m.z);
  g.rotation.y = dash ? m.la : m.la - Math.PI / 2;
  scene.add(g); WARN.push({ g, m: mesh_, t: 0, life, owner: m });
}
function updWarn(dt) {
  for (let i = WARN.length - 1; i >= 0; i--) {
    const w = WARN[i]; w.t += dt;
    const k = w.t / w.life;
    w.m.material.opacity = .08 + Math.min(1, k) * .4;
    if (w.owner && !w.owner.dead) w.g.position.set(w.owner.x, .13, w.owner.z);
    if (k >= 1 || !w.owner || w.owner.calm || w.owner.state !== 'windup') { scene.remove(w.g); w.m.geometry.dispose(); w.m.material.dispose(); WARN.splice(i, 1); }
  }
}
function flashMonster(m) { m.hitT = .14; }
function updMonsterFlash(m, dt) {
  const p = m.parts; if (!p || !p.torso) return;
  if (m.hitT > 0) {
    m.hitT -= dt;
    if (!p.torso.userData.orig) p.torso.userData.orig = p.torso.material;
    p.torso.material = FLASH_MAT;
    const k = m.hitT / .14; p.body.scale.set(1 + .18 * k, 1 - .16 * k, 1 + .18 * k);
    if (m.hitT <= 0) { if (p.torso.material === FLASH_MAT) p.torso.material = p.torso.userData.orig; p.torso.userData.orig = null; p.body.scale.set(1, 1, 1); }
  }
}
const FLASH_MAT = new THREE.MeshBasicMaterial({ color: '#FFFFFF' });

/* ---------- Замовлення: улюблений напій ---------- */
const WANT_TEX = {};
function wantSprite(id) {
  if (!WANT_TEX[id]) {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext && c.getContext('2d');
    if (x) { x.fillStyle = '#FFF8F2'; x.beginPath(); x.arc(32, 30, 26, 0, 7); x.fill(); x.beginPath(); x.moveTo(24, 52); x.lineTo(32, 63); x.lineTo(40, 52); x.fill(); x.font = '30px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(DRINK[id].ic, 32, 31); }
    WANT_TEX[id] = new THREE.CanvasTexture(c);
  }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: WANT_TEX[id], transparent: true, depthWrite: false }));
  s.scale.set(.62, .62, 1); return s;
}
function pickWant(type) {
  const known = ['latte', 'flat', 'raf', 'icelatte', 'saltraf'].filter(d => P.known[d]);
  const pref = (WANTS[type] || ['latte']).filter(d => P.known[d]);
  const pool = pref.length ? pref : known.length ? known : ['latte'];
  return pick(pool);
}
function attachWant(m) {
  if (m.T.dummy && !P.known.latte) return;
  m.wants = pickWant(m.type);
  m.wantS = wantSprite(m.wants); scene.add(m.wantS);
}
function updWant(m) {
  if (!m.wantS) return;
  const show = !m.calm && m.state !== 'fall' && dist2(m.x, m.z, pl.x, pl.z) < 13;
  m.wantS.visible = show;
  if (show) m.wantS.position.set(m.x, m.bh + .75 + Math.sin(gameTime * 3 + m.walk) * .05, m.z);
}
function wantMul(m, drinkId) {
  if (!drinkId || !m.wants) return 1;
  if (drinkId === m.wants) { m.gotWant = true; ftext(m.x, 3, m.z, 'Саме те, що треба! ⭐', 'gold'); return 1.6; }
  if (!m.wrongShown) { m.wrongShown = true; ftext(m.x, 3, m.z, 'Не те… хотів ' + DRINK[m.wants].ic, 'bad'); }
  return .85;
}

/* ---------- Латте-арт ---------- */
let art = null;
function startArt(id) {
  art = { id, ang: 0, speed: 3.2, hits: 0, tries: 0, targets: [], t: 0, done: false };
  for (let i = 0; i < 3; i++) art.targets.push({ a: Math.random() * Math.PI * 2, w: [.62, .5, .4][i] });
  $('#artui').hidden = false; renderArt(); sfx('pour');
}
function renderArt() {
  if (!art) return;
  const t = art.targets[art.tries];
  const stars = '★'.repeat(art.hits) + '☆'.repeat(3 - art.hits);
  $('#arttxt').innerHTML = art.done ? `${DRINK[art.id].ic} <b>${['Ну, кава є кава', 'Непогано', 'Гарне серце', 'Шедевр!'][art.hits]}</b> ${stars}` : `Малюй серце: тисни, коли стрілка в рожевій зоні · ${stars}`;
  const tg = $('#arttarget');
  if (t && !art.done) { tg.style.display = ''; tg.style.background = `conic-gradient(from ${t.a - t.w / 2}rad, #FF9AB6 0 ${t.w}rad, transparent ${t.w}rad)`; } else tg.style.display = 'none';
  $('#artheart').style.opacity = art.hits / 3;
  $('#artgo').textContent = art.done ? 'Варити' : (IS_TOUCH ? 'Лити!' : 'Лити! (F / Пробіл)');
}
function updArt(rdt) {
  if (!art || art.done) return;
  art.ang = (art.ang + art.speed * rdt) % (Math.PI * 2);
  $('#artneedle').style.transform = `rotate(${art.ang}rad)`;
}
function artTap() {
  if (!art) return;
  if (art.done) { finishArt(); return; }
  const t = art.targets[art.tries];
  const ok = Math.abs(angDiff(art.ang, t.a)) < t.w / 2;
  if (ok) { art.hits++; sfx('pick'); } else sfx('escape');
  art.tries++; art.speed += 1.1;
  if (art.tries >= 3) { art.done = true; sfx(art.hits === 3 ? 'legend' : 'ding'); }
  renderArt();
}
function finishArt() {
  const a = art; art = null; $('#artui').hidden = true;
  startBrew(a.id, a.hits);
}
function skipArt() { if (!art) return; const id = art.id; art = null; $('#artui').hidden = true; startBrew(id, -1); }

/* ---------- Стрибок і планування ---------- */
let glider = null;
function jumpPress() {
  if (!running || paused || panel || pl.dead || pl.falling || pl.jump || fishing || pl.lock > 0) return;
  input.jumpHeld = true;
  if (pl.grounded && !isWet(pl.terr)) {
    pl.vy = 9.2; pl.y += .05; pl.grounded = false; pl.airDash = true;
    sfx('hop'); burst(pl.x, pl.y + .1, pl.z, '#FFF3E6', 5, 1.5, .4, 1);
  } else if (isWet(pl.terr) && pl.y < -.3) {
    pl.vy = 6; pl.y += .05; sfx('swim');
  }
}
function jumpRelease() { input.jumpHeld = false; }
function updGlider(dt) {
  if (!hero) return;
  if (!glider) {
    glider = new THREE.Group();
    const cone = mesh(new THREE.ConeGeometry(1.1, .6, 10, 1, true), mat('#FFF3E6', { side: THREE.DoubleSide }), false);
    cone.position.y = .3; glider.add(cone);
    for (const sx of [-.7, .7]) put(glider, mesh(new THREE.BoxGeometry(.03, 1, .03), '#A47C5B', false), sx, -.35, 0).rotation.z = sx > 0 ? .5 : -.5;
    glider.position.y = 2.6; hero.root.add(glider);
  }
  glider.visible = !!pl.gliding;
  if (pl.gliding) glider.rotation.z = Math.sin(gameTime * 4) * .08;
}

/* ---------- Зцілення світу ---------- */
function worldHeal() { return Math.round(HEAL_REGIONS.reduce((a, id) => a + healOf(id), 0) / HEAL_REGIONS.length); }
function perk(id) { const p = HEAL_PERKS.find(x => x.id === id); return p && worldHeal() >= p.at; }
function addHeal(id, amt, x, z) {
  if (!HEAL_REGIONS.includes(id) || amt <= 0) return;
  const before = healOf(id), beforeW = worldHeal();
  P.heal[id] = clamp(before + amt, 0, 100);
  const after = healOf(id);
  if (Math.floor(after) === Math.floor(before)) return;
  if (x != null && after - before >= 1) ftext(x, 3.2, z, `🌱 +${Math.round(after - before)}% регіону`, 'calm');
  applyHealVisual(id);
  if (before < 100 && after >= 100) {
    const s = ISLMAP[id];
    banner(`🌸 ${s.n} зцілено! Тут знову можна дихати.`); sfx('discover'); questEvent('healed');
    burst(pl.x, 2, pl.z, '#FFB3C7', 40, 6, 1.4, 6);
    dropLoot(pl.x, pl.z, [{ k: 'case', d: 'deadline' }, { k: 'coins', d: 150 }, { k: 'item', d: randomItem(12) }], pl.y > .5 ? pl.y : 0);
    addXP(250);
  }
  const w = worldHeal();
  for (const p of HEAL_PERKS) if (beforeW < p.at && w >= p.at) {
    banner(`Світ зцілено на ${p.at}%: ${p.n}!`); toast(`🏪 <b>${p.n}</b> — ${p.d}`); sfx('legend');
    if (p.id === 'festival' && !P.festival) { P.festival = true; addItem(exploreItem(60, 5)); banner('🎉 Свято Зцілення! Світ здоровий. Дякуємо, бариста.'); }
  }
  refreshHubHealth(); save();
}
function regionAt(x, z) { const s = islandAt(x, z); return s ? s.id : null; }
const HUB_HEAL_DECO = [];
function refreshHubHealth() {
  const w = worldHeal();
  const want = Math.floor(w / 10);
  const spots = [[-5.4, 6.4], [6.8, -1], [-8.2, -1.4], [2.2, 7.6], [-2, -9.2], [8.6, 2.6], [-9.6, 2.6], [4.6, -9]];
  while (HUB_HEAL_DECO.length < Math.min(want, spots.length)) {
    const [x, z] = spots[HUB_HEAL_DECO.length];
    const m = decorMesh(HUB_HEAL_DECO.length % 2 ? 'lantern' : 'flowerbed'); m.position.set(x, 0, z); scene.add(m); HUB_HEAL_DECO.push(m);
  }
}

/* ---------- Міні-боси ---------- */
const MBS = {};
function buildMiniModel(id) {
  if (id === 'kraken') {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const head = put(body, mesh(new THREE.IcosahedronGeometry(1.9, 1), '#B07CF0'), 0, 1.4, 0); head.scale.set(1, 1.15, 1);
    const torso = head;
    for (const sx of [-.7, .7]) { put(body, mesh(new THREE.SphereGeometry(.42, 8, 6), '#FFFFFF', false), sx, 1.9, 1.5); put(body, mesh(new THREE.SphereGeometry(.2, 6, 4), '#2E2346', false), sx, 1.9, 1.85); }
    put(body, mesh(new THREE.BoxGeometry(1.6, .12, .1), '#2E2346', false), 0, 2.6, 1.6).rotation.z = .2;
    const tents = [];
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const t = mesh(flat(new THREE.CylinderGeometry(.18, .38, 3.2, 6).translate(0, -1.6, 0)), '#9A63E0'); t.position.set(Math.cos(a) * 1.5, .6, Math.sin(a) * 1.5); t.rotation.z = Math.cos(a) * 1.2; t.rotation.x = -Math.sin(a) * 1.2; body.add(t); tents.push(t); }
    return { root, body, head, torso, tents };
  }
  let h;
  if (id === 'queen') { h = humanoid({ skin: '#EAF4FF', shirt: '#9FC3E8', pants: '#6E8CC8' }); for (let i = 0; i < 5; i++) put(h.body, mesh(new THREE.ConeGeometry(.07, .35, 4), glow('#BDE7FF'), false), -.24 + i * .12, 1.88, 0); put(h.body, mesh(new THREE.BoxGeometry(.9, 1.1, .06), '#CDEFFF'), 0, .9, -.4); }
  else if (id === 'monkeyking') { h = buildMonkey(); for (let i = 0; i < 5; i++) put(h.body, mesh(new THREE.ConeGeometry(.07, .3, 4), mat('#F4C04E', { metalness: .5, roughness: .3 }), false), -.24 + i * .12, 1.86, 0); put(h.body, mesh(new THREE.BoxGeometry(.9, 1, .06), '#E8505B'), 0, .9, -.4); }
  else { h = buildMummy(); put(h.body, mesh(new THREE.BoxGeometry(.7, .5, .55), mat('#F4C04E', { metalness: .4, roughness: .4 })), 0, 1.75, -.05); for (let i = 0; i < 3; i++) put(h.body, mesh(new THREE.BoxGeometry(.72, .05, .57), '#3B5BA8', false), 0, 1.6 + i * .15, -.05); const st = mesh(new THREE.BoxGeometry(.08, 1.8, .08), mat('#F4C04E', { metalness: .4 })); st.position.y = .3; h.hand.add(st); }
  h.root.scale.multiplyScalar(2.1);
  return h;
}
function initMinibosses() {
  for (const id in MINIBOSS) {
    const d = MINIBOSS[id], lvl = (P.mb[id] || 0) + 1;
    const b = { id, def: d, isMini: true, x: d.x, z: d.z, hx: d.x, hz: d.z, y: d.water ? -.6 : 0, lvl, max: Math.round(d.stress * (1 + .3 * (lvl - 1))), active: false, asleep: false, calm: false, cd: 2.5, atkI: 0, offT: 0, sleepT: 0, weak: [], rad: d.water ? 2.6 : 1.4, bh: d.water ? 4.4 : 4.6, mass: 99, dead: false, face: 0 };
    b.stress = b.max;
    b.mesh = buildMiniModel(id); b.mesh.root.position.set(b.x, b.y, b.z); scene.add(b.mesh.root);
    b.onCalm = () => minibossCalm(b);
    MBS[id] = b;
  }
}
function activeBosses() {
  const out = [];
  if (BOSS.mesh && BOSS.active && !BOSS.asleep) out.push(BOSS);
  for (const id in MBS) { const b = MBS[id]; if (b.active && !b.asleep) out.push(b); }
  return out;
}
function bossDrinkMul(b, D, id) {
  if (b === BOSS) return D.boss ? 1 : .3;
  if (id === b.def.fav) { ftext(b.x, 5.2, b.z, 'Улюблений напій! ⭐', 'gold'); return 1.6; }
  return D.boss ? 1.2 : .5;
}
function showBossBar(name, frac) { $('#bossbar').hidden = false; $('#bossname').textContent = name; $('#bossb').style.transform = `scaleX(${Math.max(0, frac)})`; }
function minibossCalm(b) {
  b.asleep = true; b.active = false; b.calm = true; b.stress = 0; b.sleepT = 420; b.weak.forEach(w => scene.remove(w.m)); b.weak = [];
  if (b.charge && b.charge.g) scene.remove(b.charge.g); b.charge = null; b.leap = null;
  $('#bossbar').hidden = true;
  banner(`${b.def.ic} ${b.def.n} заспокоївся. Міні-бос пройдено!`);
  bubble(b, 'Хм… а я ж колись любив свою роботу…', false, 5);
  burst(b.x, 3, b.z, '#FFD27A', 40, 6, 1.4, 6); sfx('level');
  P.mb[b.id] = (P.mb[b.id] || 0) + 1;
  const r = Math.random() < .12 ? 5 : Math.max(3, rollRarity(20));
  const lx = b.def.water ? -32 : b.x, lz = b.def.water ? -18 : b.z + 2.5;
  dropLoot(lx, lz, [{ k: 'item', d: makeItem(b.def.drop, r) }, { k: 'case', d: 'vacation' }, { k: 'coins', d: 120 * b.lvl }, { k: 'item', d: exploreItem(10, 2) }]);
  addXP(260 * b.lvl, b.x, b.z); addHeal(b.def.isl, 40, b.x, b.z);
  questEvent('miniboss'); save();
}
function mbAttack(b, kind) {
  const d = b.def;
  const isl = ISLMAP[d.isl];
  const inArena = (x, z) => dist2(x, z, b.hx, b.hz) < d.arena + 2;
  if (kind === 'slam') {
    for (let i = 0; i < 4; i++) { const a = Math.random() * 6.28, r = i ? 1.5 + Math.random() * 3.5 : 0; const x = pl.x + Math.cos(a) * r, z = pl.z + Math.sin(a) * r; addTele(x, z, 2.1, 1.15 + i * .12, 16, true); }
    sfx('warn', b.x, b.z);
  } else if (kind === 'ink' || kind === 'banana') {
    const a0 = angTo(b.x, b.z, pl.x, pl.z), n = kind === 'ink' ? 5 : 3;
    for (let i = 0; i < n; i++) { const a = a0 + (i - (n - 1) / 2) * .22; spawnProj({ x: b.x, z: b.z, y: 1.6, vx: Math.sin(a) * 9, vz: Math.cos(a) * 9, life: 2.4, r: .6, from: 'enemy', dmg: 11, kind: kind === 'ink' ? 'ink' : 'banana' }); }
    sfx('throw', b.x, b.z);
  } else if (kind === 'tentacle') {
    for (let i = 0; i < 2; i++) {
      const a = Math.random() * 6.28, r = .5 + Math.random() * 2; const x = pl.x + Math.cos(a) * r, z = pl.z + Math.sin(a) * r;
      addTele(x, z, 1.6, 1, 18, true);
      setTimeout(() => { if (!b.active) return; const m = mesh(flat(new THREE.CylinderGeometry(.25, .55, 3, 7).translate(0, 1.5, 0)), '#9A63E0'); m.position.set(x, -.3, z); scene.add(m); b.weak.push({ x, z, t: 3, m }); }, 1000);
    }
    sfx('warn', b.x, b.z);
  } else if (kind === 'wave') {
    [[0, 2.6, .9], [3.2, 5.8, 1.5], [6.4, 9, 2.1]].forEach(([i, o, t]) => addTele(b.x, b.z, o, t, 16, true, i));
    sfx('warn', b.x, b.z);
  } else if (kind === 'snowring' || kind === 'tornado') {
    const waves = kind === 'tornado' ? 3 : 1;
    for (let w = 0; w < waves; w++) setTimeout(() => { if (!b.active) return; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 + w * .26; spawnProj({ x: b.x, z: b.z, y: 1.4, vx: Math.sin(a) * 7, vz: Math.cos(a) * 7, life: 2.6, r: .55, from: 'enemy', dmg: 10, kind: kind === 'tornado' ? 'sand' : 'snow' }); } sfx('memo', b.x, b.z); }, w * 420);
  } else if (kind === 'summon') {
    const type = { kraken: 'crab', queen: 'hr', monkeyking: 'monkey', pharaoh: 'mummy' }[b.id];
    const near = MON.filter(m => m.type === type && !m.calm && dist2(m.x, m.z, b.x, b.z) < d.arena).length;
    for (let i = 0; i < Math.max(0, 2 - Math.floor(near / 2)); i++) { const a = Math.random() * 6.28; const x = b.x + Math.cos(a) * 3, z = b.z + Math.sin(a) * 3; if (monsterOk({ T: MT[type] }, x, z)) { const m = spawnMonster(type, isl, x, z); if (m) { m.state = 'chase'; burst(x, 1, z, '#FFFFFF', 10, 3, .6, 3); } } }
    bubble(b, 'Підкріплення!', true, 1.5);
  } else if (kind === 'charge') {
    const a = angTo(b.x, b.z, pl.x, pl.z);
    const line = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 12).translate(0, 6, 0), new THREE.MeshBasicMaterial({ color: '#FF5C7A', transparent: true, opacity: .3, side: THREE.DoubleSide, depthWrite: false }));
    line.rotation.x = -Math.PI / 2; const g = new THREE.Group(); g.add(line); g.position.set(b.x, .13, b.z); g.rotation.y = a; scene.add(g);
    b.charge = { a, t: 1.4, go: .7, g, hit: false }; sfx('charge', b.x, b.z);
  } else if (kind === 'leap') {
    const tx = pl.x, tz = pl.z;
    if (!inArena(tx, tz)) return;
    addTele(tx, tz, 3, 1, 20, true);
    b.leap = { sx: b.x, sz: b.z, tx, tz, t: 0 }; sfx('hop', b.x, b.z);
  }
}
function updMinibosses(dt) {
  let shown = false;
  for (const id in MBS) {
    const b = MBS[id], d = b.def, h = b.mesh;
    const dp = dist2(pl.x, pl.z, b.hx, b.hz);
    if (b.asleep) {
      h.body.rotation.x = d.water ? .3 : .45; h.root.position.set(b.x, b.y - (d.water ? .4 : .2), b.z);
      if (Math.random() < dt * 1.2) ftext(b.x, 4, b.z, 'z', 'calm');
      b.sleepT -= dt;
      if (b.sleepT <= 0 && dp > 25) { b.lvl++; b.max = Math.round(d.stress * (1 + .3 * (b.lvl - 1))); b.stress = b.max; b.asleep = false; b.calm = false; h.body.rotation.x = 0; }
      continue;
    }
    if (d.water && h.tents) h.tents.forEach((t, i) => { t.rotation.y = Math.sin(gameTime * 1.5 + i) * .3; });
    h.body.position.y = Math.sin(gameTime * 2) * .08;
    if (!b.active) {
      if (dp < d.arena && Math.abs(pl.y) < 3 && !pl.dead) { b.active = true; b.offT = 0; b.cd = 2; bubble(b, pick(d.lines), true, 3); banner(`${d.ic} Міні-бос: ${d.n}. Улюблений напій — ${DRINK[d.fav].ic} ${DRINK[d.fav].n}`); sfx('aggro'); }
      h.root.position.set(b.x, b.y, b.z); continue;
    }
    if (dp > d.arena + 8 || pl.dead) { b.offT += dt; if (b.offT > 4) { b.active = false; b.stress = Math.min(b.max, b.stress + b.max * .5); $('#bossbar').hidden = true; continue; } } else b.offT = 0;
    shown = true; showBossBar(`${d.ic} ${d.n}${b.lvl > 1 ? ' · рівень ' + b.lvl : ''}`, b.stress / b.max);
    if (Math.random() < dt * .07) bubble(b, pick(d.lines), true, 2.4);
    // слабкі місця (щупальця)
    for (let i = b.weak.length - 1; i >= 0; i--) { const w = b.weak[i]; w.t -= dt; w.m.rotation.z = Math.sin(gameTime * 6 + i) * .15; if (w.t <= 0) { scene.remove(w.m); b.weak.splice(i, 1); } }
    const phase2 = b.stress < b.max * .5;
    if (b.leap) {
      const L = b.leap; L.t += dt; const k = Math.min(1, L.t / 1);
      b.x = lerp(L.sx, L.tx, k); b.z = lerp(L.sz, L.tz, k); h.root.position.set(b.x, Math.sin(k * Math.PI) * 5, b.z);
      if (k >= 1) { b.leap = null; shake = .5; burst(b.x, .5, b.z, '#C9A66B', 24, 5, .8, 4); }
      continue;
    }
    if (b.charge) {
      const c = b.charge; c.t -= dt;
      if (c.t > c.go) { h.root.rotation.y = c.a; c.g.children[0].material.opacity = .25 + Math.sin(gameTime * 30) * .15; }
      else {
        if (c.g.parent) scene.remove(c.g);
        const nx = b.x + Math.sin(c.a) * 17 * dt, nz = b.z + Math.cos(c.a) * 17 * dt;
        if (dist2(nx, nz, b.hx, b.hz) < d.arena) { b.x = nx; b.z = nz; } else c.t = 0;
        if (!c.hit && dist2(b.x, b.z, pl.x, pl.z) < 2 && pl.y < 1) { c.hit = true; if (pl.dashT > 0) checkPerfect(b.x, b.z, 3); hurtPlayer(20, b); }
        for (const p of PROPS) if (p.alive && dist2(b.x, b.z, p.x, p.z) < 1.8) damageProp(p, 40, 'boss');
      }
      if (c.t <= 0) { if (c.g.parent) scene.remove(c.g); b.charge = null; }
    } else if (!d.water) {
      const a = angTo(b.x, b.z, pl.x, pl.z); h.root.rotation.y = lerpAng(h.root.rotation.y, a, dt * 4); b.face = a;
      if (dist2(b.x, b.z, pl.x, pl.z) > 4.5) { const nx = b.x + Math.sin(a) * 1.8 * dt, nz = b.z + Math.cos(a) * 1.8 * dt; if (dist2(nx, nz, b.hx, b.hz) < d.arena - 2) { b.x = nx; b.z = nz; } }
      if (h.l1) { const sw = Math.sin(gameTime * 4) * .4; h.l1.rotation.x = sw; h.l2.rotation.x = -sw; }
    } else h.root.rotation.y = lerpAng(h.root.rotation.y, angTo(b.x, b.z, pl.x, pl.z), dt * 2);
    h.root.position.set(b.x, b.y, b.z);
    if (!b.charge) { b.cd -= dt; if (b.cd <= 0) { mbAttack(b, d.attacks[b.atkI++ % d.attacks.length]); b.cd = phase2 ? 1.9 : 2.7; } }
    if (!d.water && dist2(b.x, b.z, pl.x, pl.z) < 1.9) { const a = angTo(b.x, b.z, pl.x, pl.z); pl.x = b.x + Math.sin(a) * 1.9; pl.z = b.z + Math.cos(a) * 1.9; }
  }
  if (!shown && !(BOSS.active && !BOSS.asleep)) $('#bossbar').hidden = true;
}
function hitWeakPoints(range, arc, dmg) {
  let hit = false;
  for (const id in MBS) { const b = MBS[id]; if (!b.active) continue;
    for (const w of b.weak) if (inArc(pl.x, pl.z, pl.face, w.x, w.z, range + .6, arc)) {
      const real = applyHit(b, dmg * 1.6, 0, 0, true); ftext(w.x, 2.4, w.z, 'Щупальце! −' + Math.round(real || 0), 'crit'); burst(w.x, 1.4, w.z, '#C9A2FF', 10, 3, .5, 3); hit = true; w.t = Math.min(w.t, .3);
    }
  }
  return hit;
}

/* ---------- Твій острів: сон, сховок, декор ---------- */
function onHome() { return dist2(pl.x, pl.z, ISLMAP.home.x, ISLMAP.home.z) < ISLMAP.home.r + .3; }
function sleepHammock() {
  if (!isNight()) { toast('Ще рано спати. Гамак чекає ночі 🌙'); return; }
  const f = $('#fade'); f.style.opacity = 1; sfx('tame');
  setTimeout(() => { P.dayT = .29; pl.hp = S.maxHP; pl.st = S.maxSt; skyT = 0; f.style.opacity = 0; banner('☀️ Ти виспався. Новий день, нова зміна.'); save(); }, 450);
}
function decorPrice(id) { return Math.round(DECOR[id].price * (perk('flowers') ? .8 : 1)); }
function renderHomePanel() {
  const slots = HOME.slots.map((_, i) => { const id = P.home.slots[i]; return `<button class="eqs ${i === homeSel ? 'r2' : ''}" data-act="hslot" data-arg="${i}"><span class="ic">${id ? DECOR[id].ic : '➕'}</span><span class="lb">${id ? DECOR[id].n : 'Місце ' + (i + 1)}</span></button>`; }).join('');
  const owned = Object.keys(DECOR).filter(k => P.decor[k] > 0);
  const place = homeSel != null ? `<div class="detail"><h4>Місце ${homeSel + 1}</h4>${owned.length ? `<div class="chips" style="margin-top:6px">${owned.map(k => `<button class="btn alt" data-act="hplace" data-arg="${k}">${DECOR[k].ic} ${DECOR[k].n} ×${P.decor[k]}</button>`).join('')}</div>` : '<p class="muted" style="margin:6px 0 0">Немає декору в запасі — купи нижче.</p>'}${P.home.slots[homeSel] ? '<div class="btns"><button class="btn alt" data-act="hclear">Прибрати в запас</button></div>' : ''}</div>` : '';
  const colors = HOME_COLORS.map(c => `<button class="cos ${P.home.color === c.id ? 'on' : ''}" style="background:${c.c}" data-act="hcolor" data-arg="${c.id}" title="${c.n}" aria-label="${c.n}"></button>`).join('');
  const shop = Object.keys(DECOR).filter(k => !DECOR[k].reward).map(k => { const D = DECOR[k], pr = decorPrice(k), lock = D.heal && worldHeal() < D.heal;
    return `<div class="row" style="padding:8px 10px"><span class="ic" style="font-size:24px">${D.ic}</span><div class="tx"><b>${D.n}</b>${P.decor[k] ? ` · у запасі ${P.decor[k]}` : ''}${lock ? `<div class="need">Відкриється, коли світ зцілиться на ${D.heal}%</div>` : ''}</div><button class="btn" data-act="hbuy" data-arg="${k}" ${!lock && P.coins >= pr ? '' : 'disabled'}>${pr} 🪙</button></div>`; }).join('');
  return `<h3>Твій острів</h3><p class="muted" style="font-size:13px">На острові є кавовий візок (варити каву), гамак (уночі — проспати до ранку й відновитися) і сховок для речей. Острів — безпечна зона. ${onHome() ? '' : 'Міст на острів — на південному сході «Гущі».'}</p>
  <h3>Земля</h3><div class="chips">${colors}</div>
  <h3 style="margin-top:14px">Декор · вибери місце</h3><div class="eqgrid" style="grid-template-columns:repeat(5,1fr)">${slots}</div>${place}
  <h3 style="margin-top:14px">Каталог «Затишок»${perk('flowers') ? ' · знижка 20% від Квіткового кіоску' : ''}</h3><div class="list">${shop}</div>`;
}
let homeSel = null;
function nearStash() { return dist2(pl.x, pl.z, HOME.stash.x, HOME.stash.z) < 2.4; }
function renderStash() {
  const near = nearStash();
  const list = P.stash.map(it => `<button class="it r${it.r} ${it.broken ? 'broken' : ''}" data-act="unstash" data-arg="${it.u}" title="${itemName(it)}" ${near ? '' : 'disabled'}>${BASE[it.b].ic}${it.lvl ? `<span class="lv">+${it.lvl}</span>` : ''}</button>`).join('');
  return `<h3>Сховок · ${P.stash.length}/80</h3><p class="muted" style="font-size:13px">${near ? 'Натисни на річ, щоб забрати її в інвентар. Покласти речі в сховок — кнопкою «У сховок» у вкладці «Речі».' : 'Сховок стоїть на твоєму острові. Підійди до нього, щоб перекладати речі.'}</p><div class="invgrid">${list || '<span class="muted">Порожньо</span>'}</div>`;
}

/* ---------- Інвентар: фільтри, сортування, порівняння ---------- */
const INV = { filter: 'all', sort: 'rarity' };
function invFilter(it) {
  const B = BASE[it.b];
  if (INV.filter === 'hand') return B.slot === 'hand';
  if (INV.filter === 'gear') return B.slot !== 'hand';
  if (INV.filter === 'broken') return it.broken;
  if (INV.filter === 'new') return it.isNew;
  if (INV.filter === 'fav') return it.fav;
  return true;
}
function invSort(a, b) {
  const eq = (!!eqSlotOf(b) - !!eqSlotOf(a)); if (eq) return eq;
  if (INV.sort === 'type') return BASE[a.b].slot.localeCompare(BASE[b.b].slot) || b.r - a.r;
  if (INV.sort === 'new') return (b.t || 0) - (a.t || 0);
  return b.r - a.r || b.lvl - a.lvl;
}
function itemScore(it) {
  const B = BASE[it.b];
  if (B.slot === 'hand') { if (it.broken) return -1; const h = handStats(it); return h.dmg * h.spd * (1 + h.crit) + h.kb * .3 + (B.fx ? 4 : 0); }
  const gs = gearStats(it); return Object.values(gs).reduce((a, b) => a + b, 0) + (B.fx ? 2 : 0);
}
function compareHTML(it) {
  const B = BASE[it.b];
  const other = B.slot === 'hand' ? eqItem('hand1') : eqItem(B.slot);
  if (!other || other === it) return '';
  const rows = [];
  if (B.slot === 'hand') {
    const a = handStats(Object.assign({}, it, { broken: false })), o = handStats(other);
    [['Шкода', 'dmg', 1], ['Швидкість', 'spd', 2], ['Дальність', 'rng', 1], ['Відкидання', 'kb', 1], ['Вага', 'wt', 1, true]].forEach(([n, k, f, inv]) => { const d = a[k] - o[k]; if (Math.abs(d) > .01) rows.push(`<span>${n}</span><span style="color:${(d > 0) !== !!inv ? '#2F9A52' : '#C2335A'}">${d > 0 ? '▲ +' : '▼ '}${d.toFixed(f)}</span>`); });
  } else {
    const a = gearStats(it), o = gearStats(other);
    ST_KEYS.forEach(k => { const d = (a[k] || 0) - (o[k] || 0); if (d) rows.push(`<span>${STATN[k]}</span><span style="color:${d > 0 ? '#2F9A52' : '#C2335A'}">${d > 0 ? '▲ +' : '▼ '}${d}</span>`); });
  }
  return rows.length ? `<div class="muted" style="font-size:12px;margin-top:8px">Порівняно з вдягнутим «${itemName(other)}»:</div><div class="kv">${rows.join('')}</div>` : '';
}
function autoEquip() {
  const best = {};
  for (const it of P.inv) {
    const B = BASE[it.b]; if (B.slot === 'hand' || it.broken) continue;
    if (!best[B.slot] || itemScore(it) > itemScore(best[B.slot])) best[B.slot] = it;
  }
  const hands = P.inv.filter(it => BASE[it.b].slot === 'hand' && !it.broken).sort((a, b) => itemScore(b) - itemScore(a));
  let n = 0;
  for (const s in best) if (P.eq[s] !== best[s].u) { P.eq[s] = best[s].u; n++; }
  if (hands[0] && P.eq.hand1 !== hands[0].u) { if (P.eq.hand2 === hands[0].u) P.eq.hand2 = P.eq.hand1; P.eq.hand1 = hands[0].u; n++; }
  onGearChanged(); toast(n ? `Вдягнуто найкраще: ${n} змін` : 'Ти вже в найкращому');
}
function bulkCommon(mode) {
  const list = P.inv.filter(it => it.r === 0 && !it.fav && !eqSlotOf(it));
  if (!list.length) { toast('Немає звичайних речей без ⭐'); return; }
  let bolts = 0, coins = 0;
  list.forEach(it => { if (mode === 'sell') coins += 6; else bolts += randi(1, 2); });
  P.inv = P.inv.filter(it => !list.includes(it));
  if (mode === 'sell') { P.coins += coins; toast(`Продано ${list.length} речей: +${coins} 🪙`); } else { P.ing.bolts = (P.ing.bolts || 0) + bolts; toast(`Розібрано ${list.length} речей: 🔩×${bolts}`); }
  onGearChanged(); sfx(mode === 'sell' ? 'coin' : 'break');
}
