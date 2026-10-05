/* Аддон «Голосовий чат»: говори з друзями прямо в грі.
   - Голос звучить з того місця, де стоїть гравець: зліва/справа, тихіше здалеку
     (чути до 32 м), а дерева, столи й шафи між вами його приглушують.
   - Режими: «натисни й говори» (тримай V) або «мікрофон завжди ввімкнений».
   - З'єднання напряму між браузерами (WebRTC), сервер лише знайомить гравців.
   Вмикається у вкладці «🎙️ Голос» (браузер попросить доступ до мікрофона). */
const A = Addon.info({ name: 'Голосовий чат', version: '1.0', desc: 'Голосовий чат з 3D-звуком: напрямок, відстань і перешкоди.' });

const VC = { on: false, stream: null, mode: 'ptt', ptt: false, peers: new Map(), msg: '', meter: null, level: 0, badge: null };
const RANGE = 32, FULL = 5;
const ICE = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }];
const vvol = () => { const d = A.data(); return d.vol == null ? 1 : d.vol; };

/* ---------- Увімкнути / вимкнути ---------- */
async function voiceOn() {
  if (VC.on) return;
  if (!NET.on) { VC.msg = 'Голосовий чат працює лише онлайн.'; return; }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { VC.msg = 'Браузер не дає доступу до мікрофона (потрібне https-посилання або localhost).'; return; }
  initAudio();
  try { VC.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); }
  catch (e) { VC.msg = 'Мікрофон не дозволено: ' + (e && e.message || e); return; }
  VC.on = true; VC.msg = '';
  VC.mode = A.data().mode || 'ptt'; applyMic();
  if (AC) { const src = AC.createMediaStreamSource(VC.stream); VC.meter = AC.createAnalyser(); VC.meter.fftSize = 512; src.connect(VC.meter); }
  A.send('v', { k: 'hello' });
  toast(VC.mode === 'ptt' ? '🎙️ Голосовий чат увімкнено. Тримай <b>V</b>, щоб говорити.' : '🎙️ Голосовий чат увімкнено, мікрофон відкритий.');
}
function voiceOff() {
  if (!VC.on) return;
  A.send('v', { k: 'bye' });
  for (const id of [...VC.peers.keys()]) closePeer(id);
  if (VC.stream) VC.stream.getTracks().forEach(t => t.stop());
  VC.stream = null; VC.on = false; VC.meter = null;
}
function applyMic() { if (VC.stream) VC.stream.getAudioTracks().forEach(t => { t.enabled = VC.mode === 'open' || VC.ptt; }); }

/* ---------- З'єднання між гравцями ---------- */
function peer(id) {
  let p = VC.peers.get(id); if (p) return p;
  const pc = new RTCPeerConnection({ iceServers: ICE });
  p = { id, pc, state: 'з’єднання…', speaking: false };
  VC.peers.set(id, p);
  if (VC.stream) VC.stream.getTracks().forEach(t => pc.addTrack(t, VC.stream));
  pc.ontrack = e => attachAudio(p, e.streams[0] || new MediaStream([e.track]));
  pc.onconnectionstatechange = () => {
    p.state = { connected: 'на зв’язку', connecting: 'з’єднання…', failed: 'не вдалося', disconnected: 'перервано', closed: 'закрито' }[pc.connectionState] || pc.connectionState;
    if (pc.connectionState === 'failed') setTimeout(() => { if (VC.on && VC.peers.get(id) === p) { closePeer(id); if (NET.id < id) call(id); } }, 3000);
    if (panel === TAB) renderPanel();
  };
  return p;
}
function gathered(pc) {
  return new Promise(res => {
    if (pc.iceGatheringState === 'complete') return res();
    const t = setTimeout(res, 2500);
    pc.addEventListener('icegatheringstatechange', () => { if (pc.iceGatheringState === 'complete') { clearTimeout(t); res(); } });
  });
}
async function call(id) {
  const p = peer(id);
  try { await p.pc.setLocalDescription(await p.pc.createOffer()); await gathered(p.pc); A.send('v', { k: 'offer', to: id, sdp: p.pc.localDescription.sdp }); }
  catch (e) { p.state = 'помилка'; }
}
function closePeer(id) {
  const p = VC.peers.get(id); if (!p) return;
  try { p.pc.close(); } catch (e) { }
  if (p.audio) { p.audio.srcObject = null; p.audio.remove(); }
  try { if (p.g) p.g.disconnect(); } catch (e) { }
  const r = NET.players[id]; if (r && r.tag) r.tag.style.boxShadow = '';
  VC.peers.delete(id);
}
A.onNet('v', async (d, from) => {
  if (!d || (d.to != null && d.to !== NET.id)) return;
  const id = from.id;
  if (d.k === 'bye') { closePeer(id); return; }
  if (!VC.on) return;
  if (d.k === 'hello') {
    if (VC.peers.has(id)) return;
    if (NET.id < id) call(id);                         // дзвонить той, у кого менший номер
    else A.send('v', { k: 'hello', to: id });          // а більший — просто каже «я тут»
  } else if (d.k === 'offer' && typeof d.sdp === 'string') {
    if (VC.peers.has(id)) closePeer(id);
    const p = peer(id);
    try {
      await p.pc.setRemoteDescription({ type: 'offer', sdp: d.sdp });
      await p.pc.setLocalDescription(await p.pc.createAnswer()); await gathered(p.pc);
      A.send('v', { k: 'answer', to: id, sdp: p.pc.localDescription.sdp });
    } catch (e) { p.state = 'помилка'; }
  } else if (d.k === 'answer' && typeof d.sdp === 'string') {
    const p = VC.peers.get(id); if (p && p.pc.signalingState === 'have-local-offer') try { await p.pc.setRemoteDescription({ type: 'answer', sdp: d.sdp }); } catch (e) { }
  }
});

/* ---------- 3D-звук голосу ---------- */
function attachAudio(p, stream) {
  if (!AC) initAudio(); if (!AC) return;
  // Chrome не пускає звук WebRTC у WebAudio без живого <audio> — тримаємо прихований, без звуку
  if (!p.audio) { p.audio = document.createElement('audio'); p.audio.muted = true; p.audio.autoplay = true; p.audio.style.display = 'none'; document.body.appendChild(p.audio); }
  p.audio.srcObject = stream; const pr = p.audio.play && p.audio.play(); if (pr && pr.catch) pr.catch(() => { });
  const src = AC.createMediaStreamSource(stream);
  p.an = AC.createAnalyser(); p.an.fftSize = 512;
  p.lp = AC.createBiquadFilter(); p.lp.type = 'lowpass'; p.lp.frequency.value = 16000;
  p.pan = AC.createPanner(); p.pan.panningModel = 'HRTF'; p.pan.distanceModel = 'linear'; p.pan.refDistance = 1; p.pan.maxDistance = 1e4; p.pan.rolloffFactor = 0;
  p.g = AC.createGain(); p.g.gain.value = 0;
  src.connect(p.an); src.connect(p.lp); p.lp.connect(p.pan); p.pan.connect(p.g); p.g.connect(master || AC.destination);
}
function occlusion(x, z) {
  let n = 0;
  const ax = pl.x, az = pl.z, dx = x - ax, dz = z - az, L = dx * dx + dz * dz || 1;
  for (const o of STATICS) {
    if (o.h != null && o.h < 1) continue;
    const t = ((o.x - ax) * dx + (o.z - az) * dz) / L; if (t < .08 || t > .92) continue;
    if (Math.hypot(ax + dx * t - o.x, az + dz * t - o.z) < o.r * .9) n++;
  }
  return Math.max(.2, 1 - .2 * n);
}
function setListener() {
  if (!AC || !AC.listener) return;
  const L = AC.listener, f = new THREE.Vector3(); camera.getWorldDirection(f); f.y = 0; f.normalize();
  if (L.positionX) { L.positionX.value = pl.x; L.positionY.value = (pl.y || 0) + 1.6; L.positionZ.value = pl.z; L.forwardX.value = f.x; L.forwardY.value = 0; L.forwardZ.value = f.z; L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0; }
  else { L.setPosition(pl.x, (pl.y || 0) + 1.6, pl.z); L.setOrientation(f.x, 0, f.z, 0, 1, 0); }
}
const _buf = new Uint8Array(512);
function rms(an) { an.getByteTimeDomainData(_buf); let s = 0; for (let i = 0; i < _buf.length; i++) { const v = (_buf[i] - 128) / 128; s += v * v; } return Math.sqrt(s / _buf.length); }

/* оновлюємо 20 разів на секунду власним таймером — і коли відкрите меню (гра на паузі) */
function voiceTick() {
  if (window.__SIM || !VC.on) { if (VC.badge) VC.badge.style.display = 'none'; return; }
  if (!NET.on) { voiceOff(); return; }
  setListener();
  const v = vvol() * (AUD.muted ? 0 : 1);
  for (const [id, p] of VC.peers) {
    const r = NET.players[id];
    if (!r) { closePeer(id); continue; }
    if (!p.pan) continue;
    const d = dist2(pl.x, pl.z, r.x, r.z), occ = occlusion(r.x, r.z);
    const g = (d <= FULL ? 1 : Math.max(0, Math.pow(1 - (d - FULL) / (RANGE - FULL), 1.5))) * occ * v;
    p.g.gain.setTargetAtTime(g, AC.currentTime, .08);
    p.lp.frequency.setTargetAtTime(600 + 15400 * occ * occ, AC.currentTime, .1);
    if (p.pan.positionX) { p.pan.positionX.value = r.x; p.pan.positionY.value = (r.y || 0) + 1.6; p.pan.positionZ.value = r.z; } else p.pan.setPosition(r.x, (r.y || 0) + 1.6, r.z);
    const speaking = rms(p.an) > .02;
    if (speaking !== p.speaking) { p.speaking = speaking; if (r.tag) r.tag.style.boxShadow = speaking ? '0 0 0 2px #7FE08A, 0 0 12px #7FE08A' : ''; }
  }
  // мій індикатор мікрофона
  if (!VC.badge) { VC.badge = document.createElement('div'); VC.badge.style.cssText = 'position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 84px);transform:translateX(-50%);background:rgba(46,35,70,.75);color:#fff;font-size:12px;font-weight:700;padding:4px 10px;border-radius:10px;pointer-events:none;z-index:2'; document.body.appendChild(VC.badge); }
  const live = VC.mode === 'open' || VC.ptt, lvl = live && VC.meter ? rms(VC.meter) : 0;
  VC.badge.style.display = '';
  VC.badge.textContent = live ? (lvl > .02 ? '🎙️ говориш…' : '🎙️ мікрофон відкритий') : '🎙️ тримай V, щоб говорити';
  VC.badge.style.background = live ? (lvl > .02 ? 'rgba(47,154,82,.85)' : 'rgba(46,35,70,.75)') : 'rgba(46,35,70,.55)';
}
if (!window.__SIM) setInterval(() => { try { voiceTick(); } catch (e) { console.error('[voice_chat]', e); } }, 50);

/* ---------- Натисни й говори: V ---------- */
A.key('KeyV', () => { if (!VC.on) return false; VC.ptt = true; applyMic(); });
addEventListener('keyup', e => { if (e.code === 'KeyV' && VC.ptt) { VC.ptt = false; applyMic(); } });
addEventListener('blur', () => { if (VC.ptt) { VC.ptt = false; applyMic(); } });

/* ---------- Вкладка ---------- */
const TAB = A.tab('voice', '🎙️ Голос', () => {
  const peers = [...VC.peers.values()].map(p => { const r = NET.players[p.id]; return `<div class="row"><span class="ic">${p.speaking ? '🔊' : '👤'}</span><div class="tx"><b>${escapeHTML(r ? r.name : '#' + p.id)}</b><div class="need">${p.state}${r ? ' · ' + Math.round(dist2(pl.x, pl.z, r.x, r.z)) + ' м' : ''}</div></div></div>`; }).join('');
  return `<h3>🎙️ Голосовий чат</h3>
    ${VC.msg ? `<p class="note">${escapeHTML(VC.msg)}</p>` : ''}
    <div class="btns">${VC.on ? '<button class="btn alt" data-vc="off">Вимкнути</button>' : '<button class="btn" data-vc="on">🎙️ Увімкнути голосовий чат</button>'}
      <button class="btn ${VC.mode === 'ptt' ? '' : 'alt'}" data-vc="ptt">Тримай V — говори</button><button class="btn ${VC.mode === 'open' ? '' : 'alt'}" data-vc="open">Мікрофон завжди</button></div>
    <label class="slider"><span>Гучність голосів</span><input type="range" min="0" max="150" value="${Math.round(vvol() * 100)}" data-vcvol="1"><b>${Math.round(vvol() * 100)}</b></label>
    <h3 style="margin-top:12px">Хто на зв’язку</h3><div class="list">${peers || '<p class="muted">Поки нікого. Друзі теж мають увімкнути голосовий чат у цій вкладці.</p>'}</div>
    <p class="muted" style="font-size:12px;line-height:1.5;margin-top:10px">Голос 3D: чути, з якого боку гравець; що далі — то тихіше (до ${RANGE} м); дерева, столи й шафи між вами глушать звук.
      Хто говорить — у того світиться табличка з ім’ям. З’єднання йде напряму між браузерами; дуже рідко суворі роутери його не пропускають.</p>`;
}, e => {
  const b = e.target.closest('[data-vc]'); if (!b) return;
  const a = b.dataset.vc;
  if (a === 'on') voiceOn().then(() => renderPanel());
  else if (a === 'off') voiceOff();
  else { VC.mode = a; A.data().mode = a; applyMic(); }
  renderPanel();
});
$('#pbody').addEventListener('input', e => { if (e.target.dataset && e.target.dataset.vcvol) { A.data().vol = +e.target.value / 100; const b = e.target.parentElement.querySelector('b'); if (b) b.textContent = e.target.value; } });
