/* Аддон «Супер графіка»: новий пункт «✨ Шейдери» в ⚙️ Налаштуваннях → Графіка.
   - Супер: світіння яскравих речей (bloom — ліхтарі, неон, вибухи, лампочки), кольорокорекція
     (соковитіші кольори, теплі світлі й прохолодні тіні), м'яка віньєтка, легка різкість.
   - Ультра: усе те саме + тіні 4096 (чіткіші й м'якші), вища роздільність, кінематографічна
     хроматична аберація по краях і ледь помітне плівкове зерно.
   Налаштування зберігається в браузері (на кожному пристрої своє). На слабкому телефоні краще «Вимкнено». */
const A = Addon.info({ name: 'Супер графіка', version: '1.0', desc: 'Пункт «✨ Шейдери» в налаштуваннях графіки: світіння, кольорокорекція, віньєтка, ультра-тіні.' });

const SG_KEY = 'barista-supergfx';
const SG = { mode: 'off', rt: null, a: null, b: null, w: 0, h: 0, t: 0, quad: null, qs: null, qc: null };
try { SG.mode = localStorage.getItem(SG_KEY) || 'off'; } catch (e) { }
const SG_OK = !window.__SIM && typeof renderer !== 'undefined' && typeof renderer.getDrawingBufferSize === 'function' && typeof renderer.getContext === 'function';

/* ---------- Шейдери ---------- */
const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }';
const mBright = new THREE.ShaderMaterial({
  uniforms: { tDiffuse: { value: null }, thr: { value: .8 } }, vertexShader: VS, depthTest: false, depthWrite: false,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float thr; varying vec2 vUv;
    void main(){ vec4 t = texture2D(tDiffuse, vUv); float l = dot(t.rgb, vec3(.299,.587,.114)); float k = smoothstep(thr, thr + .25, l); gl_FragColor = vec4(min(t.rgb, vec3(.9)) * k * k * t.a, 1.); }`,
});
const mBlur = new THREE.ShaderMaterial({
  uniforms: { tDiffuse: { value: null }, dir: { value: new THREE.Vector2() } }, vertexShader: VS, depthTest: false, depthWrite: false,
  fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 dir; varying vec2 vUv;
    void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb * .2270270270;
      c += texture2D(tDiffuse, vUv + dir * 1.3846153846).rgb * .3162162162; c += texture2D(tDiffuse, vUv - dir * 1.3846153846).rgb * .3162162162;
      c += texture2D(tDiffuse, vUv + dir * 3.2307692308).rgb * .0702702703; c += texture2D(tDiffuse, vUv - dir * 3.2307692308).rgb * .0702702703;
      gl_FragColor = vec4(c, 1.); }`,
});
const mFinal = new THREE.ShaderMaterial({
  uniforms: { tScene: { value: null }, tBloom: { value: null }, bloom: { value: .9 }, vign: { value: .32 }, sat: { value: 1.14 }, contrast: { value: 1.07 },
    ca: { value: 0 }, grain: { value: 0 }, sharp: { value: .12 }, time: { value: 0 }, px: { value: new THREE.Vector2() } },
  vertexShader: VS, depthTest: false, depthWrite: false, transparent: false,
  fragmentShader: `uniform sampler2D tScene, tBloom; uniform float bloom, vign, sat, contrast, ca, grain, sharp, time; uniform vec2 px; varying vec2 vUv;
    void main(){
      vec2 uv = vUv, d = uv - .5;
      vec4 s = texture2D(tScene, uv);
      if (ca > 0.) { s.r = texture2D(tScene, uv + d * ca).r; s.b = texture2D(tScene, uv - d * ca).b; }
      if (sharp > 0.) { vec3 n = texture2D(tScene, uv + vec2(px.x, 0.)).rgb + texture2D(tScene, uv - vec2(px.x, 0.)).rgb + texture2D(tScene, uv + vec2(0., px.y)).rgb + texture2D(tScene, uv - vec2(0., px.y)).rgb; s.rgb += (s.rgb * 4. - n) * sharp; }
      vec3 b = texture2D(tBloom, uv).rgb * bloom;
      vec3 c = s.a > .001 ? s.rgb / s.a : vec3(0.);
      float l = dot(c, vec3(.299, .587, .114));
      c = mix(vec3(l), c, sat);
      c = (c - .5) * contrast + .5;
      c += mix(vec3(-.012, .004, .03), vec3(.035, .016, -.02), smoothstep(.15, .85, l)) * .8;   // прохолодні тіні, теплі світлі
      float a = s.a;
      b = b / (1. + b);                                                                           // м'яке обмеження, щоб не пересвічувало
      vec3 col = c * a + b;                                                                       // світіння лягає й на небо
      a = clamp(max(a, dot(b, vec3(.4))), 0., 1.);
      col += (fract(sin(dot(uv * (time + 1.), vec2(12.9898, 78.233))) * 43758.5453) - .5) * grain * a;
      float vg = (1. - smoothstep(.95, .3, length(d * vec2(1.15, 1.)))) * vign;                    // віньєтка (і над небом теж)
      gl_FragColor = vec4(clamp(col, 0., 1.) * (1. - vg), a + (1. - a) * vg);
    }`,
});

/* ---------- Пост-обробка поверх звичайного рендеру ---------- */
function sgEnsure() {
  const v = renderer.getDrawingBufferSize(new THREE.Vector2()), w = Math.max(2, v.x | 0), h = Math.max(2, v.y | 0);
  if (SG.rt && SG.w === w && SG.h === h) return;
  [SG.rt, SG.a, SG.b].forEach(r => r && r.dispose());
  const o = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat };
  const MS = renderer.capabilities && renderer.capabilities.isWebGL2 && THREE.WebGLMultisampleRenderTarget;   // WebGL2: згладжування й у пост-обробці
  SG.rt = new (MS ? THREE.WebGLMultisampleRenderTarget : THREE.WebGLRenderTarget)(w, h, Object.assign({ depthBuffer: true, stencilBuffer: false }, o));
  if (MS) SG.rt.samples = 4;
  SG.a = new THREE.WebGLRenderTarget(w >> 2, h >> 2, Object.assign({ depthBuffer: false }, o));
  SG.b = new THREE.WebGLRenderTarget(w >> 2, h >> 2, Object.assign({ depthBuffer: false }, o));
  SG.w = w; SG.h = h;
  if (!SG.quad) { SG.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mFinal); SG.quad.frustumCulled = false; SG.qs = new THREE.Scene(); SG.qs.add(SG.quad); SG.qc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1); }
}
if (SG_OK) {
  const _render = renderer.render.bind(renderer);
  const pass = (m, out) => { SG.quad.material = m; renderer.setRenderTarget(out); _render(SG.qs, SG.qc); };
  renderer.render = function (s, c) {
    if (SG.mode === 'off' || s !== scene || renderer.getRenderTarget() !== null) return _render(s, c);
    try {
      sgEnsure();
      renderer.setRenderTarget(SG.rt); renderer.clear(); _render(s, c);
      mBright.uniforms.tDiffuse.value = SG.rt.texture; pass(mBright, SG.a);
      const iw = 1 / SG.a.width, ih = 1 / SG.a.height;
      for (let i = 1; i <= 2; i++) {
        mBlur.uniforms.tDiffuse.value = SG.a.texture; mBlur.uniforms.dir.value.set(iw * i, 0); pass(mBlur, SG.b);
        mBlur.uniforms.tDiffuse.value = SG.b.texture; mBlur.uniforms.dir.value.set(0, ih * i); pass(mBlur, SG.a);
      }
      const u = mFinal.uniforms, ultra = SG.mode === 'ultra';
      u.tScene.value = SG.rt.texture; u.tBloom.value = SG.a.texture; u.time.value = (SG.t += .016) % 100;
      u.px.value.set(1 / SG.w, 1 / SG.h); u.ca.value = ultra ? .0022 : 0; u.grain.value = ultra ? .025 : 0; u.bloom.value = ultra ? .6 : .5;
      pass(mFinal, null);
    } catch (e) { console.error('[super_graphics]', e); SG.mode = 'off'; renderer.setRenderTarget(null); _render(s, c); }
  };
}

/* ---------- Ультра: чіткіші тіні й вища роздільність ---------- */
function applyMode(first) {
  if (!SG_OK) return;
  try { localStorage.setItem(SG_KEY, SG.mode); } catch (e) { }
  if (SG.mode === 'ultra') {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.5));
    renderer.shadowMap.enabled = true; sun.castShadow = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    if (sun.shadow.mapSize.x !== 4096) { sun.shadow.mapSize.set(4096, 4096); sun.shadow.radius = 2.5; if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
    resize();
  } else if (!first && typeof applyGfx === 'function') {
    if (sun.shadow.mapSize.x === 4096) { sun.shadow.mapSize.set(1, 1); }   // змусити applyGfx перебудувати тіні під свою якість
    applyGfx(true);
  }
}
A.on('world', () => applyMode(true));

/* ---------- Пункт у налаштуваннях ---------- */
const _renderSound = renderSound;
renderSound = function () {
  const html = _renderSound.apply(this, arguments);
  if (!SG_OK) return html;
  const btn = (k, n) => `<button class="btn ${SG.mode === k ? '' : 'alt'}" data-sg="${k}">${n}</button>`;
  const box = `<h3>✨ Шейдери</h3><div class="btns">${btn('off', 'Вимкнено')}${btn('on', 'Супер графіка')}${btn('ultra', 'Ультра')}</div>
    <p class="muted" style="font-size:12px;margin:6px 0 12px">Супер: світяться ліхтарі, неон і вибухи, соковитіші кольори, віньєтка, різкість. Ультра: ще й тіні 4096, вища роздільність, кіно-ефекти по краях. Якщо гальмує — постав «Вимкнено» або «Супер».</p>`;
  return html.includes('<h3>Звук</h3>') ? html.replace('<h3>Звук</h3>', box + '<h3>Звук</h3>') : html + box;
};
if (SG_OK) $('#pbody').addEventListener('click', e => {
  const b = e.target.closest('[data-sg]'); if (!b) return;
  SG.mode = b.dataset.sg; applyMode(false); renderPanel();
  toast(SG.mode === 'off' ? 'Шейдери вимкнено.' : SG.mode === 'ultra' ? '✨ Ультра-графіка увімкнена.' : '✨ Супер-графіка увімкнена.');
});
