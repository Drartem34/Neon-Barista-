/* =====================================================================
   СВІТЛО ЛАМП: емісія, що розгоряється вночі, м'які ореоли навколо
   лампочок, теплі плями світла на землі й кілька справжніх точкових
   джерел, що «переїжджають» до найближчих до гравця ламп.
   Усе тут прозоре або не-«пласке», тож mergeStatics() його не злипає.
   ===================================================================== */
const GLOW_MATS = [];          // { m, base } — усі емісивні матеріали
const LIGHT_SRC = [];          // { halo, pool, c, size, light, ph }
const LAMP_LIGHTS = [];        // пул PointLight
let lampT = 0;
const _lw = new THREE.Vector3();

function radialTex(stops) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d');
  const g = x && x.createRadialGradient ? x.createRadialGradient(32, 32, 0, 32, 32, 32) : null;
  if (g) { stops.forEach(([o, col]) => g.addColorStop(o, col)); x.fillStyle = g; x.fillRect(0, 0, 64, 64); }
  return new THREE.CanvasTexture(c);
}
let HALO_TEX = null, POOL_TEX = null;
function lightTextures() {
  if (!HALO_TEX) {
    HALO_TEX = radialTex([[0, 'rgba(255,255,255,1)'], [.18, 'rgba(255,255,255,.75)'], [.45, 'rgba(255,255,255,.22)'], [1, 'rgba(255,255,255,0)']]);
    POOL_TEX = radialTex([[0, 'rgba(255,255,255,.9)'], [.5, 'rgba(255,255,255,.35)'], [1, 'rgba(255,255,255,0)']]);
  }
}
/* Емісивний матеріал, що світиться сильніше вночі. base — денна інтенсивність. */
function regGlow(m, base) { if (!m._glow) { m._glow = 1; GLOW_MATS.push({ m, base }); } return m; }
function bulb(c) { return regGlow(mat(c, { emissive: c, emissiveIntensity: 1 }), 1); }

/* Додає світіння до лампочки: ореол (sprite), пляму на землі й джерело світла.
   parent — група або сцена; x,y,z — локальні координати лампочки в parent. */
function addLampGlow(parent, x, y, z, c, size = 2, opt = {}) {
  lightTextures();
  const sm = new THREE.SpriteMaterial({ map: HALO_TEX, color: c, transparent: true, opacity: .3, blending: THREE.AdditiveBlending, depthWrite: false, fog: true });
  const halo = new THREE.Sprite(sm); halo.position.set(x, y, z); halo.scale.setScalar(size); halo.renderOrder = 2;
  parent.add(halo);
  let pool = null;
  if (opt.pool !== false) {
    const pm = new THREE.MeshBasicMaterial({ map: POOL_TEX, color: c, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    pool = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), pm); pool.rotation.x = -Math.PI / 2;
    const r = opt.poolR || size * 2.2; pool.scale.set(r, r, 1);
    pool.position.set(x, (opt.groundY || 0) + .04, z); pool.renderOrder = 1;
    parent.add(pool);
  }
  const src = { halo, pool, c: new THREE.Color(c), size, light: opt.light !== false, ph: Math.random() * 6 };
  LIGHT_SRC.push(src);
  return src;
}
function inScene(o) { for (let p = o; p; p = p.parent) if (p === scene) return o.visible !== false; return false; }

function initLampLights() {
  for (let i = 0; i < 6; i++) {
    const L = new THREE.PointLight(0xFFD9A0, 0, 11, 2); L.castShadow = false;
    scene.add(L); LAMP_LIGHTS.push(L);
  }
  applyLampQuality();
}
function applyLampQuality() {
  const n = GFX.q === 'high' ? 6 : GFX.q === 'medium' ? 3 : 0;
  LAMP_LIGHTS.forEach((L, i) => { L.visible = i < n; });
}

function updLights(dt) {
  const k = nightK, t = gameTime;
  for (const g of GLOW_MATS) if (!ANIM.glows.includes(g.m)) g.m.emissiveIntensity = g.base * (.85 + k * 1.9);
  for (const s of LIGHT_SRC) {
    const fl = 1 + Math.sin(t * 7 + s.ph) * .04 + Math.sin(t * 13.3 + s.ph * 2) * .03;   // ледь помітне мерехтіння
    s.halo.material.opacity = (.22 + k * .7) * fl;
    s.halo.scale.setScalar(s.size * (1 + k * .45) * fl);
    if (s.pool) s.pool.material.opacity = k * .5 * fl;
  }
  // точкові джерела — до найближчих до гравця ламп (раз на півсекунди)
  lampT -= dt;
  const active = LAMP_LIGHTS.filter(L => L.visible);
  if (lampT <= 0 && active.length) {
    lampT = .5;
    const near = [];
    for (const s of LIGHT_SRC) {
      if (!s.light || !inScene(s.halo)) continue;
      s.halo.getWorldPosition(_lw);
      const d = (_lw.x - pl.x) ** 2 + (_lw.z - pl.z) ** 2;
      if (d < 40 * 40) near.push([d, _lw.x, _lw.y, _lw.z, s]);
    }
    near.sort((a, b) => a[0] - b[0]);
    active.forEach((L, i) => { const n = near[i]; L.userData.src = n ? n[4] : null; if (n) { L.position.set(n[1], n[2] - .1, n[3]); L.color.copy(n[4].c); } });
  }
  for (const L of active) { const s = L.userData.src; L.intensity = s ? k * 1.7 * (1 + Math.sin(t * 7 + s.ph) * .05) : 0; }
}
