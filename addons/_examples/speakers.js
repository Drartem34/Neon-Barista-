/* Аддон «Колонки»: своя музика з YouTube, Spotify або прямого посилання на аудіо.
   - Колонку можна вибити (рідко падає з луту), купити в «Гущі» або скрафтити на верстаку.
   - Радіо в «Гущі» — спільна колонка: будь-хто може ввімкнути свій трек.
   - Звук 3D: гучність залежить від відстані, а предмети між тобою й колонкою
     (дерева, столи, шафи) глушать звук. Для прямих аудіо-посилань і для голосу
     є ще й напрямок (зліва/справа). YouTube і Spotify — лише гучність (обмеження їхніх плеєрів).
   - Інші гравці чують твою колонку, коли вони поруч.
   Керування: F біля колонки або радіо, вкладка «🔊 Колонки». */
const A = Addon.info({ name: 'Колонки', version: '1.0', desc: 'Колонки з твоєю музикою (YouTube, Spotify, mp3) і 3D-звуком: відстань і перешкоди.' });

const HUB_RADIO = { x: 6.2, z: -3.2 };
const RANGE = 42, FULL = 4;
const SPK = new Map();            // id → { id, owner, name, x, z, url, t0, pub, last, mesh, play }
const SEL = { id: null, msg: '' };
const myId = () => (NET.on ? NET.id : 'me');

/* ---------- Посилання → що грати ---------- */
function parseUrl(u) {
  u = String(u || '').trim(); if (!u) return null;
  let m = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|live\/|embed\/)|youtu\.be\/|music\.youtube\.com\/watch\?(?:.*&)?v=)([\w-]{11})/);
  if (m) return { kind: 'yt', id: m[1] };
  m = u.match(/open\.spotify\.com\/(?:intl-\w+\/)?(track|album|playlist|episode|show)\/(\w+)/);
  if (m) return { kind: 'sp', type: m[1], id: m[2] };
  if (/^https?:\/\/\S+\.(mp3|ogg|wav|m4a|aac|opus|flac)(\?\S*)?$/i.test(u) || /^https?:\/\/\S+\/(stream|live|radio)\S*$/i.test(u)) return { kind: 'au', src: u };
  return null;
}
const KIND_N = { yt: 'YouTube', sp: 'Spotify', au: 'аудіо' };

/* ---------- 3D-звук: відстань + перешкоди ---------- */
function occlusion(x, z) {
  let n = 0;
  const ax = pl.x, az = pl.z, dx = x - ax, dz = z - az, L = dx * dx + dz * dz || 1;
  for (const o of STATICS) {
    if (o.h != null && o.h < 1) continue;
    const t = ((o.x - ax) * dx + (o.z - az) * dz) / L; if (t < .08 || t > .92) continue;
    if (Math.hypot(ax + dx * t - o.x, az + dz * t - o.z) < o.r * .9) n++;
  }
  for (const p of PROPS) {
    if (!p.alive) continue;
    const t = ((p.x - ax) * dx + (p.z - az) * dz) / L; if (t < .1 || t > .9) continue;
    if (Math.hypot(ax + dx * t - p.x, az + dz * t - p.z) < p.r) n += .5;
  }
  return Math.max(.18, 1 - .2 * n);
}
function distGain(d) { return d <= FULL ? 1 : Math.max(0, Math.pow(1 - (d - FULL) / (RANGE - FULL), 1.7)); }
function setListener() {
  if (!AC || !AC.listener) return;
  const L = AC.listener, f = new THREE.Vector3(); camera.getWorldDirection(f); f.y = 0; f.normalize();
  if (L.positionX) { L.positionX.value = pl.x; L.positionY.value = (pl.y || 0) + 1.6; L.positionZ.value = pl.z; L.forwardX.value = f.x; L.forwardY.value = 0; L.forwardZ.value = f.z; L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0; }
  else { L.setPosition(pl.x, (pl.y || 0) + 1.6, pl.z); L.setOrientation(f.x, 0, f.z, 0, 1, 0); }
}
const vol = () => { const d = A.data(); return d.vol == null ? .8 : d.vol; };

/* ---------- Плеєри ---------- */
let ytReady = null;
function loadYT() {
  if (ytReady) return ytReady;
  ytReady = new Promise(res => {
    if (window.YT && window.YT.Player) return res();
    const prev = window.onYouTubeIframeAPIReady; window.onYouTubeIframeAPIReady = () => { if (prev) prev(); res(); };
    const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; document.head.appendChild(s);
  });
  return ytReady;
}
let hidden = null;
function hiddenBox() { if (!hidden) { hidden = document.createElement('div'); hidden.style.cssText = 'position:fixed;left:-10000px;top:0;width:320px;height:180px;overflow:hidden;pointer-events:none'; document.body.appendChild(hidden); } return hidden; }
let spCard = null;
function spotifyCard() {
  if (!spCard) {
    spCard = document.createElement('div');
    spCard.style.cssText = 'position:fixed;left:12px;bottom:calc(env(safe-area-inset-bottom,0px) + 150px);width:300px;z-index:3;border-radius:14px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,.3);display:none;background:#2E2346';
    spCard.innerHTML = '<div style="color:#fff;font-size:12px;padding:5px 9px">🔊 Spotify поруч — натисни ▶ (гучність регулюй у плеєрі)</div><iframe allow="autoplay; encrypted-media" style="width:100%;height:80px;border:0" loading="lazy"></iframe>';
    document.body.appendChild(spCard);
  }
  return spCard;
}
function offset(s) { return Math.max(0, (Date.now() - (s.t0 || Date.now())) / 1000); }
function startPlay(s) {
  const src = parseUrl(s.url); if (!src) return;
  const p = { src, ok: false };
  if (src.kind === 'yt') {
    const el = document.createElement('div'); hiddenBox().appendChild(el); p.el = el;
    loadYT().then(() => {
      if (s.play !== p) return;
      p.yt = new YT.Player(el, { width: 320, height: 180, videoId: src.id, playerVars: { autoplay: 1, controls: 0, start: Math.floor(offset(s)), playsinline: 1 },
        events: { onReady: e => { p.ok = true; e.target.setVolume(0); e.target.playVideo(); }, onStateChange: e => { if (e.data === 0) e.target.seekTo(0); } } });
    });
  } else if (src.kind === 'au' && AC) {
    const a = new Audio(); a.crossOrigin = 'anonymous'; a.loop = true; a.src = src.src; p.audio = a;
    const graph = () => {
      try {
        p.node = AC.createMediaElementSource(a);
        p.lp = AC.createBiquadFilter(); p.lp.type = 'lowpass'; p.lp.frequency.value = 18000;
        p.pan = AC.createPanner(); p.pan.panningModel = 'HRTF'; p.pan.distanceModel = 'linear'; p.pan.refDistance = 1; p.pan.maxDistance = 1e4; p.pan.rolloffFactor = 0;
        p.g = AC.createGain(); p.g.gain.value = 0;
        p.node.connect(p.lp); p.lp.connect(p.pan); p.pan.connect(p.g); p.g.connect(master || AC.destination);
      } catch (e) { p.node = null; }
    };
    a.addEventListener('error', () => { if (a.crossOrigin && !p.retried) { p.retried = true; a.removeAttribute('crossorigin'); p.noGraph = true; a.src = src.src; a.play().catch(() => { }); } }, { once: false });
    graph();
    a.addEventListener('loadedmetadata', () => { if (a.duration && isFinite(a.duration)) a.currentTime = offset(s) % a.duration; });
    a.play().then(() => { p.ok = true; }).catch(() => { p.ok = false; SEL.msg = 'Браузер не дав увімкнути звук — клацни будь-де в грі'; });
  } else if (src.kind === 'sp') p.ok = true;
  s.play = p;
}
function stopPlay(s) {
  const p = s.play; if (!p) return; s.play = null;
  try { if (p.yt && p.yt.destroy) p.yt.destroy(); } catch (e) { }
  if (p.el) p.el.remove();
  if (p.audio) { p.audio.pause(); p.audio.src = ''; }
  try { if (p.g) p.g.disconnect(); } catch (e) { }
}

/* ---------- Модель колонки ---------- */
function speakerMesh() {
  const g = new THREE.Group();
  put(g, mesh(new THREE.BoxGeometry(.7, 1.1, .6), '#2E2346'), 0, .55, 0);
  for (const [y, r] of [[.78, .2], [.36, .14]]) { const c = put(g, mesh(flat(new THREE.CylinderGeometry(r, r, .05, 14)), '#4E4A6E', false), 0, y, .31); c.rotation.x = Math.PI / 2; }
  g.userData.led = put(g, mesh(new THREE.BoxGeometry(.4, .05, .02), mat('#555566'), false), 0, 1.0, .31);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
function radioMesh() {   // радіо «Гущі»: колонка на ніжках з антеною
  const g = speakerMesh(); g.children.forEach(c => { c.position.y += .45; });
  for (const x of [-.25, .25]) put(g, mesh(new THREE.CylinderGeometry(.05, .05, .45, 6), '#A3795C'), x, .22, 0);
  const ant = put(g, mesh(new THREE.CylinderGeometry(.02, .02, .8, 5), '#A7B0C2'), .22, 1.95, 0); ant.rotation.z = -.3;
  put(g, mesh(new THREE.SphereGeometry(.06, 8, 6), bulb('#FF6B93'), false), .34, 2.33, 0);
  return g;
}
function ensureMesh(s) {
  if (s.mesh) return;
  s.mesh = s.id === 'hub' ? radioMesh() : speakerMesh(); s.mesh.position.set(s.x, 0, s.z); s.mesh.rotation.y = s.id === 'hub' ? Math.PI : 0; scene.add(s.mesh);
}
function dropSpeaker(id) {
  const s = SPK.get(id); if (!s) return;
  stopPlay(s); if (s.mesh) scene.remove(s.mesh); SPK.delete(id);
}

/* ---------- Мережа ---------- */
function announce(s) { if (NET.on) A.send('spk', { id: s.id, x: r1s(s.x), z: r1s(s.z), url: s.url || '', t0: s.t0 || 0, pub: !!s.pub, name: myName() }); }
const r1s = v => Math.round(v * 10) / 10;
A.onNet('spk', (d, from) => {
  if (!d || typeof d.id !== 'string') return;
  let s = SPK.get(d.id);
  if (!s) { s = { id: d.id }; SPK.set(d.id, s); }
  const urlChanged = s.url !== d.url || s.t0 !== d.t0;
  Object.assign(s, { owner: from.id, name: d.name || from.name, x: +d.x || 0, z: +d.z || 0, url: String(d.url || '').slice(0, 300), t0: +d.t0 || 0, pub: !!d.pub, last: Date.now() });
  if (s.id === 'hub') { s.x = HUB_RADIO.x; s.z = HUB_RADIO.z; }
  ensureMesh(s); if (s.mesh) s.mesh.position.set(s.x, 0, s.z);
  if (urlChanged) stopPlay(s);
});
A.onNet('spkdel', d => { if (d && typeof d.id === 'string' && !mine(SPK.get(d.id))) dropSpeaker(d.id); });
const mine = s => s && s.id !== 'hub' && (s.owner === myId() || s.owner === 'me' || (NET.on && s.owner === NET.id));

/* ---------- Мої колонки: розставити, налаштувати, забрати ---------- */
function myPlaced() { const d = A.data(); return d.placed = d.placed || []; }
function placeHere() {
  const d = A.data();
  if (!(d.spk > 0)) { SEL.msg = 'Нема колонки: вибий, купи або скрафти.'; return; }
  if (myPlaced().length >= 3) { SEL.msg = 'Максимум 3 колонки. Забери одну.'; return; }
  if (!onGround(pl.x, pl.z, .5) || pl.y > .5) { SEL.msg = 'Став колонку на землю.'; return; }
  const x = pl.x + Math.sin(pl.face) * 1.2, z = pl.z + Math.cos(pl.face) * 1.2;
  const id = 'k' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  d.spk--; myPlaced().push({ id, x, z, url: '', t0: 0 });
  const s = { id, owner: myId(), name: myName(), x, z, url: '', t0: 0, last: Date.now() };
  SPK.set(id, s); ensureMesh(s); announce(s); SEL.id = id; SEL.msg = '🔊 Колонку поставлено. Встав посилання й натисни «Грати».'; sfx('equip'); save();
}
function pickUp(id) {
  const s = SPK.get(id); if (!s || !mine(s)) return;
  const d = A.data(); d.placed = myPlaced().filter(p => p.id !== id); d.spk = (d.spk || 0) + 1;
  dropSpeaker(id); if (NET.on) A.send('spkdel', { id }); SEL.id = null; SEL.msg = 'Колонку забрано.'; save();
}
function setTrack(id, url) {
  const s = SPK.get(id); if (!s) return;
  if (url && !parseUrl(url)) { SEL.msg = '⚠️ Не розпізнав посилання. Підходять YouTube, Spotify або пряме посилання на mp3/ogg.'; return; }
  s.url = url; s.t0 = Date.now(); stopPlay(s);
  if (s.id === 'hub') { s.owner = myId(); s.pub = true; s.name = myName(); s.last = Date.now(); }
  else { const p = myPlaced().find(p => p.id === id); if (p) { p.url = url; p.t0 = s.t0; } }
  announce(s); SEL.msg = url ? '▶ Грає!' : '⏹ Тиша.'; save();
}
function nearestSpeaker(r = 2.4) {
  let best = null, bd = r;
  for (const s of SPK.values()) { const d = dist2(pl.x, pl.z, s.x, s.z); if (d < bd) { bd = d; best = s; } }
  return best;
}

/* ---------- Як дістати колонку ---------- */
const CRAFT_NEED = { bolts: 6, tape: 3, monday: 1 };
const PRICE = 300;
const _dropLoot = dropLoot;
dropLoot = function (x, z, list) {
  if (!window.__SIM && P && list && list.length && Math.random() < .035) {
    const d = A.data(); d.spk = (d.spk || 0) + 1;
    banner('🔊 Ти знайшов колонку! Вкладка «Колонки» — постав і ввімкни свою музику.'); sfx('legend');
  }
  return _dropLoot.apply(this, arguments);
};

/* ---------- Старт: відновлюємо свої колонки, вмикаємо радіо ---------- */
A.on('start', () => {
  if (window.__SIM) return;
  const hub = { id: 'hub', x: HUB_RADIO.x, z: HUB_RADIO.z, url: '', t0: 0, pub: true, last: Date.now() }; SPK.set('hub', hub); ensureMesh(hub);
  for (const p of myPlaced()) { const s = { id: p.id, owner: myId(), name: myName(), x: p.x, z: p.z, url: p.url || '', t0: p.t0 || 0, last: Date.now() }; SPK.set(p.id, s); ensureMesh(s); }
});

/* ---------- F біля колонки / радіо ---------- */
const _getInteract = getInteract;
getInteract = function () {
  if (!window.__SIM && !pl.dead && !pl.ride && !pl.carry) {
    const s = nearestSpeaker();
    if (s) return { l: s.id === 'hub' ? '📻 Радіо «Гущі»: увімкнути свою музику' : mine(s) ? '🔊 Моя колонка' : `🔊 Колонка ${s.name || ''}`, fn: () => { SEL.id = s.id; openPanel(TAB); } };
  }
  return _getInteract.apply(this, arguments);
};

/* ---------- Кожен кадр: гучність, напрям, перешкоди ---------- */
let annT = 0;
function speakerTick(dt) {
  if (!running || !SPK.size) return;
  setListener();
  const now = Date.now(), v = vol() * (AUD.muted ? 0 : 1);
  annT -= dt;
  if (annT <= 0) {   // «я тут» для інших кожні 4 с
    annT = 4;
    for (const p of myPlaced()) { const s = SPK.get(p.id); if (s) { s.owner = myId(); announce(s); } }
    const hub = SPK.get('hub'); if (hub && hub.url && hub.owner === myId()) announce(hub);
  }
  let spNear = null;
  for (const s of [...SPK.values()]) {
    if (!mine(s) && s.owner != null && s.owner !== 'me' && s.owner !== myId() && now - (s.last || 0) > 13000) { if (s.id === 'hub') { stopPlay(s); s.url = ''; } else dropSpeaker(s.id); continue; }
    const d = dist2(pl.x, pl.z, s.x, s.z);
    const playing = !!s.url;
    if (s.mesh) { const k = playing ? 1 + Math.sin(gameTime * 9) * .04 : 1; s.mesh.scale.set(k, 1, k); if (s.mesh.userData.led) s.mesh.userData.led.material = playing ? bulb('#7FE08A') : mat('#555566'); }
    if (playing && !paused && Math.random() < dt * 1.5 && d < 30) burst(s.x, 1.4, s.z, pick(['#B07CF0', '#FFB3E6', '#8FD9C0']), 1, .5, 1.2, 1.2);
    if (playing && d < RANGE && !s.play) startPlay(s);
    if ((!playing || d > RANGE + 10) && s.play) stopPlay(s);
    const p = s.play; if (!p) continue;
    const occ = occlusion(s.x, s.z), g = distGain(d) * occ * v;
    if (p.yt && p.ok && p.yt.setVolume) p.yt.setVolume(Math.round(g * 100));
    if (p.audio) {
      if (p.g && !p.noGraph) {
        p.g.gain.setTargetAtTime(g, AC.currentTime, .1);
        p.lp.frequency.setTargetAtTime(500 + 17500 * occ * occ, AC.currentTime, .1);
        if (p.pan.positionX) { p.pan.positionX.value = s.x; p.pan.positionY.value = 1; p.pan.positionZ.value = s.z; } else p.pan.setPosition(s.x, 1, s.z);
      } else p.audio.volume = Math.min(1, g);
    }
    if (p.src.kind === 'sp' && d < 18 && (!spNear || d < spNear.d)) spNear = { s, d };
  }
  // Spotify не дає керувати гучністю — показуємо плеєр, коли ти поруч з колонкою
  const card = spotifyCard();
  if (spNear) {
    const src = parseUrl(spNear.s.url), url = `https://open.spotify.com/embed/${src.type}/${src.id}`;
    const fr = card.querySelector('iframe'); if (fr.getAttribute('src') !== url) fr.setAttribute('src', url);
    card.style.display = '';
  } else if (card.style.display !== 'none') { card.style.display = 'none'; card.querySelector('iframe').removeAttribute('src'); }
}
/* власний таймер, щоб музика вмикалась і коли відкрите меню (гра на паузі) */
if (!window.__SIM) setInterval(() => { try { speakerTick(.05); } catch (e) { console.error('[speakers]', e); } }, 50);

/* ---------- Вкладка ---------- */
const TAB = A.tab('speakers', '🔊 Колонки', () => {
  const d = A.data(), s = SEL.id && SPK.get(SEL.id), near = s && dist2(pl.x, pl.z, s.x, s.z) < 3;
  const canEdit = s && near && (s.id === 'hub' || mine(s));
  const now = s && s.url ? `${KIND_N[(parseUrl(s.url) || {}).kind] || ''}: <span class="muted">${escapeHTML(s.url.slice(0, 60))}</span>` : 'тиша';
  const sel = s ? `<div class="detail"><h4>${s.id === 'hub' ? '📻 Радіо «Гущі» (спільне)' : mine(s) ? '🔊 Моя колонка' : '🔊 Колонка ' + escapeHTML(s.name || '')}</h4>
      <p style="font-size:13px;margin:4px 0 8px">Зараз: ${now}${s.id === 'hub' && s.name && s.url ? ' · увімкнув ' + escapeHTML(s.name) : ''}</p>
      ${canEdit ? `<div class="arow"><input id="spk-url" class="ainp" placeholder="Посилання: YouTube, Spotify або mp3" value="${escapeHTML(s.url || '')}"><button class="btn" data-sp="play">▶ Грати</button></div>
      <div class="btns"><button class="btn alt" data-sp="stop">⏹ Стоп</button>${mine(s) ? '<button class="btn alt" data-sp="pick">🎒 Забрати колонку</button>' : ''}</div>`
      : `<p class="muted" style="font-size:12px">${near ? 'Це чужа колонка — тільки слухати.' : 'Підійди до колонки ближче, щоб керувати.'}</p>`}</div>` : '';
  const have = d.spk || 0, placed = myPlaced().length;
  const craftOk = Object.keys(CRAFT_NEED).every(k => (P.ing[k] || 0) >= CRAFT_NEED[k]);
  const atBench = dist2(pl.x, pl.z, WORKBENCH.x, WORKBENCH.z) < 3.5;
  return `<h3>🔊 Колонки</h3>
    ${SEL.msg ? `<p class="note">${SEL.msg}</p>` : ''}
    ${sel}
    <h3 style="margin-top:14px">Мої колонки · у рюкзаку ${have} · стоїть ${placed}/3</h3>
    <div class="btns"><button class="btn" data-sp="place" ${have > 0 ? '' : 'disabled'}>📍 Поставити тут</button>
      <button class="btn alt" data-sp="buy" ${inHub() && P.coins >= PRICE ? '' : 'disabled'} title="Тільки в «Гущі»">🪙 Купити · ${PRICE}</button>
      <button class="btn alt" data-sp="craft" ${craftOk && atBench ? '' : 'disabled'} title="На верстаку">🛠️ Скрафтити · ${needChips(CRAFT_NEED)}</button></div>
    <p class="muted" style="font-size:12px">Колонку також можна вибити: зрідка падає з монстрів і скринь. Купити — тільки в «Гущі», скрафтити — на верстаку.</p>
    <label class="slider"><span>Гучність колонок</span><input type="range" min="0" max="100" value="${Math.round(vol() * 100)}" data-spvol="1"><b>${Math.round(vol() * 100)}</b></label>
    <p class="muted" style="font-size:12px;line-height:1.5">Звук 3D: що далі колонка — то тихіше (чути до ${RANGE} м), дерева, столи й шафи між вами глушать звук.
      Пряме посилання на mp3/ogg звучить ще й з потрібного боку. YouTube — тільки гучність. Spotify не дає грі керувати звуком,
      тому поруч із колонкою з'являється маленький плеєр Spotify — натисни в ньому ▶. Без входу в Spotify грає 30-секундне прев'ю.</p>`;
}, e => {
  const b = e.target.closest('[data-sp]'); if (!b || b.disabled) return;
  const a = b.dataset.sp, d = A.data();
  if (a === 'place') placeHere();
  else if (a === 'play') setTrack(SEL.id, ($('#spk-url') || {}).value || '');
  else if (a === 'stop') setTrack(SEL.id, '');
  else if (a === 'pick') pickUp(SEL.id);
  else if (a === 'buy' && inHub() && P.coins >= PRICE) { P.coins -= PRICE; d.spk = (d.spk || 0) + 1; SEL.msg = '🔊 Колонку куплено.'; sfx('coin'); refreshHUD(); save(); }
  else if (a === 'craft') { if (!Object.keys(CRAFT_NEED).every(k => (P.ing[k] || 0) >= CRAFT_NEED[k])) return; for (const k in CRAFT_NEED) P.ing[k] -= CRAFT_NEED[k]; d.spk = (d.spk || 0) + 1; SEL.msg = '🛠️ Колонку зібрано.'; sfx('legend'); save(); }
  initAudio(); renderPanel();
});
$('#pbody').addEventListener('input', e => { if (e.target.dataset && e.target.dataset.spvol) { A.data().vol = +e.target.value / 100; const b = e.target.parentElement.querySelector('b'); if (b) b.textContent = e.target.value; } });
