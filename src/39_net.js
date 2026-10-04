/* =====================================================================
   МУЛЬТИПЛЕЄР (працює, коли гру відкрито через start.py)
   Інші бариста видно в реальному часі, є чат, емоції й «пригостити кавою».
   Світ (вороги, лут) у кожного свій — сервер синхронізує тільки присутність.
   ===================================================================== */
const NET = { on: false, ws: null, id: null, players: {}, sendT: 0, retry: 0, wanted: false };
function netAvailable() {
  if (window.__NO_NET || typeof WebSocket !== 'function') return false;
  return /^https?:$/.test(location.protocol) && !!location.host && !/claude\.ai|claudeusercontent|anthropic|claude\.site/.test(location.hostname);
}
function myName() { return ACCT ? ACCT.login : ''; }
function netConnect() {
  if (!netAvailable() || !ACCT) return;
  NET.wanted = true;
  const ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws');
  NET.ws = ws;
  ws.onopen = () => { NET.on = true; NET.retry = 0; ws.send(JSON.stringify({ t: 'join', token: ACCT && ACCT.token })); $('#online').hidden = false; $('#chatbtn').hidden = false; };
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
  if (netAccountMsg(m)) return;
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
  NET.players[id] = { id, name, h, tag, act: '', tg: '', hp: 100, atkPh: 0, x: 0, z: 0, y: 0, tx: 0, tz: 0, ty: 0, face: 0, tf: 0, m: 0, w: 0, g: 0, ph: 0, bh: 2.4, dead: false, item: '', apron: '', emote: null, emoteT: 0, seen: false, lvl: 1, zone: '' };
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
  if ((s.act || '') === 'atk' && r.act !== 'atk') r.atkPh = .3;
  r.act = s.act || ''; r.tg = s.tg || ''; r.hp = s.hp == null ? 100 : s.hp;
  const st = actLabel(r.act, r.tg);
  const html = `<b>${escapeHTML(r.name)}</b> · ${r.lvl}${st ? `<small>${st}</small>` : ''}<i class="nhp"><i style="width:${r.hp}%"></i></i>`;
  if (r.tagHTML !== html) { r.tag.innerHTML = html; r.tagHTML = html; r.tag.classList.toggle('fight', r.act === 'atk' || r.act === 'boss'); }
}
function updRemotes(dt) {
  const k = 1 - Math.exp(-dt * 12);
  for (const id in NET.players) {
    const r = NET.players[id], h = r.h;
    r.x = lerp(r.x, r.tx, k); r.z = lerp(r.z, r.tz, k); r.y = lerp(r.y, r.ty, k); r.face = lerpAng(r.face, r.tf, k);
    if (r.m) r.ph += dt * 10;
    if (r.act === 'atk') { r.atkPh -= dt; if (r.atkPh < -.15) r.atkPh = .3; }
    h.root.position.set(r.x, r.y, r.z); h.root.rotation.y = r.face;
    const sw = r.m ? Math.sin(r.ph) * .6 : 0;
    h.l1.rotation.x = sw; h.l2.rotation.x = -sw; h.aL.rotation.x = -sw * .7; h.aR.rotation.x = -.35 - sw * .3;
    if (r.act === 'atk' && r.atkPh > 0) { const k = Math.sin(r.atkPh / .3 * Math.PI); h.aR.rotation.x = -2.3 * k; h.aR.rotation.z = .4 * k; }
    else if (r.act === 'brew' || r.act === 'drink') h.aR.rotation.x = -1.2;
    else if (r.act === 'fish') h.aR.rotation.x = -1.6 + Math.sin(gameTime * 3) * .1;
    else if (r.act === 'dig') h.aR.rotation.x = -1.2 - Math.sin(gameTime * 18) * .8;
    h.aR.rotation.z = r.act === 'atk' && r.atkPh > 0 ? h.aR.rotation.z : 0;
    h.body.rotation.x = r.w ? .5 : r.g ? .25 : 0; h.body.rotation.y = 0;
    if (r.act === 'dead') { h.body.rotation.x = 1.2; h.body.position.y = -.5; } h.body.position.y = r.m ? Math.abs(Math.sin(r.ph)) * .06 : 0;
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
  if (panel === 'online' && (NET.listT = (NET.listT || 0) - dt) <= 0) { NET.listT = 1; renderPanel(); }
  NET.sendT -= dt;
  if (NET.sendT <= 0) {
    NET.sendT = .1;
    const it = eqItem('hand1');
    const act = myAct();
    netSend({ t: 's', x: +pl.x.toFixed(2), y: +pl.y.toFixed(2), z: +pl.z.toFixed(2), f: +pl.face.toFixed(2), m: pl.moving ? 1 : 0, w: isWet(pl.terr) && pl.y < -.3 ? 1 : 0, g: pl.gliding ? 1 : 0, a: P.cos, i: it && !it.broken ? it.b : '', zn: curZone ? curZone.id : '', l: P.lvl, act, tg: act === 'atk' && lastHitM && gameTime - lastHitT < 2 ? (lastHitM.T.n || '').slice(0, 23) : '', hp: Math.round(clamp(pl.hp / S.maxHP, 0, 1) * 100) });
  }
}
/* Що зараз робить гравець — бачать інші (над головою, у вкладці «Онлайн», в адмінці й моніторі сервера). */
function myAct() {
  if (pl.dead) return 'dead';
  if (typeof chairRide === 'function' && chairRide()) return 'chair';
  if (fishing) return 'fish';
  if (pl.dig) return 'dig';
  if (activeBosses().some(b => dist2(pl.x, pl.z, b.x, b.z) < 14)) return 'boss';
  if (gameTime - (pl.lastAtk || -9) < 1.2 || pl.charge > 0) return 'atk';
  if (panel) return 'menu';
  if (P.brew && nearBar()) return 'brew';
  if (isWet(pl.terr) && pl.y < -.3) return 'swim';
  if (pl.gliding) return 'glide';
  if (pl.emote === 'sit' && pl.emoteT > 0) return 'sit';
  return '';
}
const ACT_TXT = { atk: '⚔️ атакує', brew: '☕ варить каву', fish: '🎣 рибалить', dig: '⛏️ копає', swim: '🏊 пливе', glide: '🪂 планує', boss: '💼 б’ється з босом', menu: '📋 у меню', sit: '🪑 відпочиває', dead: '💀 вигорів', chair: '🛒 катається' };
function actLabel(act, tg) { const t = ACT_TXT[act] || ''; return t && act === 'atk' && tg ? `${t}: ${escapeHTML(tg)}` : t; }
function renderOnline() {
  if (!NET.on) return '<h3>👥 Онлайн</h3><p class="muted">Немає зв’язку з сервером.</p>';
  const me = `<div class="row" style="background:#E3F6EE"><span class="ic">☕</span><div class="tx"><b>${escapeHTML(myName())}</b> (ти) · рів. ${P.lvl}<div class="need">${actLabel(myAct()) || '🚶 гуляє'} · ${curZone ? curZone.n : ''}</div></div></div>`;
  const others = Object.values(NET.players).map(r => {
    const d = Math.round(dist2(r.x, r.z, pl.x, pl.z));
    const zn = ISLMAP[r.zone] ? ISLMAP[r.zone].n : '…';
    return `<div class="row"><span class="ic">${r.act === 'atk' || r.act === 'boss' ? '⚔️' : '🧑‍🍳'}</span><div class="tx"><b>${escapeHTML(r.name)}</b> · рів. ${r.lvl}<div class="need">${actLabel(r.act, r.tg) || '🚶 гуляє'} · ${zn} · ${d} м від тебе</div><div class="bar" style="height:6px;margin-top:4px;max-width:180px"><i style="transform:scaleX(${r.hp / 100})"></i></div></div></div>`;
  }).join('');
  return `<h3>👥 Онлайн · ${Object.keys(NET.players).length + 1}</h3><div class="list">${me}${others || '<p class="muted">Поки тільки ти. Кинь друзям посилання!</p>'}</div><p class="muted" style="font-size:12px;margin-top:10px">Enter — чат · /wave /dance /cheer /sit — емоції · біля гравця F — пригостити кавою.</p>`;
}
function refreshOnline() {
  if (panel === 'online') renderPanel();
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
