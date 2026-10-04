/* =====================================================================
   МУЛЬТИПЛЕЄР (працює, коли гру відкрито через start.py)
   Інші бариста видно в реальному часі, є чат, емоції й «пригостити кавою».
   Світ (вороги, лут) у кожного свій — сервер синхронізує тільки присутність.
   ===================================================================== */
const NET = { on: false, ws: null, id: null, players: {}, sendT: 0, retry: 0, wanted: false };
const NAME_KEY = 'barista-name';
function netAvailable() {
  if (window.__NO_NET || typeof WebSocket !== 'function') return false;
  return /^https?:$/.test(location.protocol) && !!location.host && !/claude\.ai|claudeusercontent|anthropic|claude\.site/.test(location.hostname);
}
function myName() { try { return localStorage.getItem(NAME_KEY) || ''; } catch (e) { return ''; } }
function setupNetTitle() {
  if (!netAvailable()) return;
  const box = $('#netbox'); box.hidden = false;
  const inp = $('#netname'); inp.value = myName() || ('Бариста-' + Math.floor(100 + Math.random() * 900));
  inp.addEventListener('change', () => { try { localStorage.setItem(NAME_KEY, inp.value.trim().slice(0, 20)); } catch (e) { } });
  if (typeof fetch === 'function') fetch('/status').then(r => r.json()).then(j => { $('#netcount').textContent = j.players ? `Зараз у грі: ${j.players} (${j.names.slice(0, 5).join(', ')})` : 'Поки ніхто не грає — будь першим.'; }).catch(() => { });
}
function netConnect() {
  if (!netAvailable()) return;
  NET.wanted = true;
  const name = ($('#netname').value || myName() || 'Бариста').trim().slice(0, 20);
  try { localStorage.setItem(NAME_KEY, name); } catch (e) { }
  const ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws');
  NET.ws = ws;
  ws.onopen = () => { NET.on = true; NET.retry = 0; ws.send(JSON.stringify({ t: 'join', name })); $('#online').hidden = false; $('#chatbtn').hidden = false; };
  ws.onmessage = ev => { let m; try { m = JSON.parse(ev.data); } catch (e) { return; } netMsg(m); };
  ws.onclose = () => {
    const was = NET.on; NET.on = false; NET.ws = null;
    for (const id in NET.players) dropRemote(id);
    refreshOnline();
    if (was) toast('🔌 Зв’язок із сервером втрачено. Перепідключаюся…');
    if (NET.wanted) setTimeout(netConnect, Math.min(15000, 2000 * (++NET.retry)));
  };
}
function netSend(o) { if (NET.on && NET.ws && NET.ws.readyState === 1) NET.ws.send(JSON.stringify(o)); }
function netMsg(m) {
  if (m.t === 'hello') { NET.id = m.id; m.players.forEach(p => { addRemote(p.id, p.name); if (p.s) applyState(p.id, p.s, true); }); toast(`👥 Ти в мережі як <b>${escapeHTML(myName())}</b>. Онлайн: ${m.players.length + 1}. Enter — чат.`); refreshOnline(); }
  else if (m.t === 'join') { addRemote(m.id, m.name); toast(`👋 <b>${escapeHTML(m.name)}</b> зайшов у гру`); sfx('waypoint'); refreshOnline(); }
  else if (m.t === 'leave') { const r = NET.players[m.id]; if (r) toast(`🚪 ${escapeHTML(r.name)} вийшов`); dropRemote(m.id); refreshOnline(); }
  else if (m.t === 'states') { for (const id in m.p) if (+id !== NET.id) applyState(+id, m.p[id]); }
  else if (m.t === 'chat') {
    const ent = m.id === NET.id ? pl : NET.players[m.id];
    if (ent) bubble(ent, m.m, false, 5);
    chatLine(m.name, m.m, m.id === NET.id);
    if (m.id !== NET.id) sfx('ui');
  }
  else if (m.t === 'emote') { const r = NET.players[m.id]; if (r) { r.emote = m.e; r.emoteT = 2.5; } }
  else if (m.t === 'gift') {
    const D = DRINK[m.d]; if (!D) return;
    P.drinks[m.d] = (P.drinks[m.d] || 0) + 1; addXP(10);
    banner(`☕ ${m.name} пригостив тебе: ${D.ic} ${D.n}`); sfx('tame'); refreshHUD();
    const r = NET.players[m.from]; if (r) bubble(r, 'Тримай, це тобі ☕', false, 3);
  }
  else if (m.t === 'sys') toast('🛈 ' + escapeHTML(m.m));
}
function escapeHTML(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function addRemote(id, name) {
  if (NET.players[id] || id === NET.id) return;
  const h = buildPlayer();
  const tag = document.createElement('div'); tag.className = 'nametag'; tag.textContent = name; fxLayer.appendChild(tag);
  NET.players[id] = { id, name, h, tag, x: 0, z: 0, y: 0, tx: 0, tz: 0, ty: 0, face: 0, tf: 0, m: 0, w: 0, g: 0, ph: 0, bh: 2.4, dead: false, item: '', apron: '', emote: null, emoteT: 0, seen: false, lvl: 1, zone: '' };
}
function dropRemote(id) {
  const r = NET.players[id]; if (!r) return;
  scene.remove(r.h.root); r.tag.remove(); r.dead = true; delete NET.players[id];
}
function applyState(id, s, snap) {
  const r = NET.players[id]; if (!r) return;
  if (s.x == null) return;
  r.tx = s.x; r.tz = s.z; r.ty = s.y || 0; r.tf = s.f || 0; r.m = s.m; r.w = s.w; r.g = s.g; r.lvl = s.l || 1; r.zone = s.zn || '';
  if (!r.seen || snap) { r.x = r.tx; r.z = r.tz; r.y = r.ty; r.face = r.tf; r.seen = true; }
  if (s.a && s.a !== r.apron) { r.apron = s.a; const c = COSM.find(c => c.id === s.a); if (c) r.h.apron.material = mat(c.c); }
  if ((s.i || '') !== r.item) {
    r.item = s.i || '';
    if (r.held) r.h.hand.remove(r.held);
    r.held = r.item && BASE[r.item] ? handMesh(r.item, false) : null;
    if (r.held) r.h.hand.add(r.held);
  }
  if (s.e && s.e !== r.lastE) { r.lastE = s.e; }
  r.tag.textContent = `${r.name} · ${r.lvl}`;
}
function updRemotes(dt) {
  const k = 1 - Math.exp(-dt * 12);
  for (const id in NET.players) {
    const r = NET.players[id], h = r.h;
    r.x = lerp(r.x, r.tx, k); r.z = lerp(r.z, r.tz, k); r.y = lerp(r.y, r.ty, k); r.face = lerpAng(r.face, r.tf, k);
    if (r.m) r.ph += dt * 10;
    h.root.position.set(r.x, r.y, r.z); h.root.rotation.y = r.face;
    const sw = r.m ? Math.sin(r.ph) * .6 : 0;
    h.l1.rotation.x = sw; h.l2.rotation.x = -sw; h.aL.rotation.x = -sw * .7; h.aR.rotation.x = -.35 - sw * .3;
    h.body.rotation.x = r.w ? .5 : r.g ? .25 : 0; h.body.rotation.y = 0; h.body.position.y = r.m ? Math.abs(Math.sin(r.ph)) * .06 : 0;
    if (r.emoteT > 0) {
      r.emoteT -= dt;
      if (r.emote === 'wave') { h.aR.rotation.x = -2.8; h.aR.rotation.z = Math.sin(gameTime * 14) * .5; }
      if (r.emote === 'dance') { h.body.rotation.y = Math.sin(gameTime * 8) * .8; h.body.position.y = Math.abs(Math.sin(gameTime * 8)) * .25; }
      if (r.emote === 'cheer') { h.aR.rotation.x = h.aL.rotation.x = -3; h.body.position.y = Math.abs(Math.sin(gameTime * 10)) * .3; }
      if (r.emote === 'sit') { h.body.position.y = -.4; h.l1.rotation.x = h.l2.rotation.x = -1.4; }
      if (r.emoteT <= 0) { r.emote = null; h.aR.rotation.z = 0; }
    }
    const far = dist2(r.x, r.z, pl.x, pl.z) > 55;
    h.root.visible = !far;
    const p = screenPos(r.x, r.y + 2.35, r.z);
    r.tag.style.display = far || !p.vis || paused ? 'none' : '';
    r.tag.style.transform = `translate(${p.x}px,${p.y}px) translate(-50%,-100%)`;
  }
  if (!NET.on) return;
  NET.sendT -= dt;
  if (NET.sendT <= 0) {
    NET.sendT = .1;
    const it = eqItem('hand1');
    netSend({ t: 's', x: +pl.x.toFixed(2), y: +pl.y.toFixed(2), z: +pl.z.toFixed(2), f: +pl.face.toFixed(2), m: pl.moving ? 1 : 0, w: isWet(pl.terr) && pl.y < -.3 ? 1 : 0, g: pl.gliding ? 1 : 0, a: P.cos, i: it && !it.broken ? it.b : '', zn: curZone ? curZone.id : '', l: P.lvl });
  }
}
function refreshOnline() {
  const n = Object.keys(NET.players).length + (NET.on ? 1 : 0);
  $('#online').textContent = NET.on ? `👥 ${n}` : '👥 офлайн';
}
function nearRemote() {
  let best = null, bd = 2.3;
  for (const id in NET.players) { const r = NET.players[id]; const d = dist2(r.x, r.z, pl.x, pl.z); if (d < bd && Math.abs(r.y - pl.y) < 1.2) { bd = d; best = r; } }
  return best;
}
function giftCoffee(r) {
  const k = ['latte', 'flat', 'raf', 'icelatte', 'saltraf', 'coldbrew', 'espresso'].find(k => (P.drinks[k] || 0) > 0);
  if (!k) { toast('Немає напою, щоб пригостити — звари щось на барі.'); return; }
  P.drinks[k]--; netSend({ t: 'gift', to: r.id, d: k });
  toast(`☕ Ти пригостив ${escapeHTML(r.name)}: ${DRINK[k].ic} ${DRINK[k].n}`); addXP(10); sfx('drink');
  bubble(pl, 'Тримай ☕', false, 2); refreshHUD();
}
/* ---------- Чат ---------- */
function openChat() {
  if (!NET.on) return;
  const box = $('#chatbox'); box.hidden = false; const i = $('#chatin'); i.value = ''; i.focus();
  for (const k in keys) keys[k] = false;
}
function closeChat() { $('#chatbox').hidden = true; $('#chatin').blur(); cv.focus(); }
function chatLine(name, text, mine) {
  const log = $('#chatlog');
  const el = document.createElement('div'); el.className = 'cl' + (mine ? ' me' : '');
  el.innerHTML = `<b>${escapeHTML(name)}:</b> ${escapeHTML(text)}`;
  log.appendChild(el); while (log.children.length > 7) log.firstChild.remove();
  setTimeout(() => el.classList.add('old'), 9000);
}
const EMOTES = { '/wave': 'wave', '/махати': 'wave', '/dance': 'dance', '/танець': 'dance', '/cheer': 'cheer', '/ура': 'cheer', '/sit': 'sit', '/сісти': 'sit' };
function sendChat(text) {
  text = text.trim(); if (!text) return;
  if (text === '/help' || text === '/допомога') { chatLine('Підказка', 'емоції: /wave /dance /cheer /sit (або /махати /танець /ура /сісти). Біля гравця — дія: пригостити кавою.', true); return; }
  if (EMOTES[text]) { const e = EMOTES[text]; netSend({ t: 'emote', e }); pl.emote = e; pl.emoteT = 2.5; return; }
  netSend({ t: 'chat', m: text.slice(0, 200) });
}
$('#chatin').addEventListener('keydown', e => {
  e.stopPropagation();
  if (e.key === 'Enter') { sendChat($('#chatin').value); closeChat(); }
  if (e.key === 'Escape') closeChat();
});
$('#chatbtn').addEventListener('click', () => { $('#chatbox').hidden ? openChat() : closeChat(); });
function updSelfEmote(dt) {
  if (!(pl.emoteT > 0) || !hero) return;
  pl.emoteT -= dt;
  const h = hero;
  if (pl.emote === 'wave') { h.aR.rotation.x = -2.8; h.aR.rotation.z = Math.sin(gameTime * 14) * .5; }
  if (pl.emote === 'dance') { h.body.rotation.y = Math.sin(gameTime * 8) * .8; h.body.position.y = Math.abs(Math.sin(gameTime * 8)) * .25; }
  if (pl.emote === 'cheer') { h.aR.rotation.x = h.aL.rotation.x = -3; h.body.position.y = Math.abs(Math.sin(gameTime * 10)) * .3; }
  if (pl.emote === 'sit') { h.body.position.y = -.4; h.l1.rotation.x = h.l2.rotation.x = -1.4; }
  if (pl.moving) pl.emoteT = 0;
}
