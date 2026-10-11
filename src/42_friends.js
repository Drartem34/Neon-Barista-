/* =====================================================================
   ДРУЗІ (👥 Друзі) — лише онлайн. Ідентичність — логін акаунта (ACCT.login), той самий, що в онлайн-світі.
   Список друзів зберігає сервер (saves/accounts.json), запити й запрошення він лише ретранслює ({t:'fr', op}).
   op: list · req (запит) · ans (відповідь) · del · inv (запросити: md — режим або '' = «до мене») · invans.
   Спливашки з кнопками зникають самі за 30 с.
   ===================================================================== */
const FR = { list: null, asked: 0, pick: null, sent: {} };
const FR_POP_T = 30000;
function frSend(op, o) { netSend(Object.assign({ t: 'fr', op }, o || {})); }
function frRefresh() { if (panel === 'friends') renderPanel(); }
function frIsFriend(n) { return !!(FR.list && FR.list.some(f => f.n.toLowerCase() === String(n).toLowerCase())); }
function frModeName(id) { const m = MODES.find(x => x.id === id); return m ? `${m.ic || '🎮'} ${m.n}` : ''; }
function frWhere(f) {
  if (!f.on) return '⚫ не в мережі';
  const md = f.md && frModeName(f.md), zn = f.zn && ISLMAP[f.zn] ? ISLMAP[f.zn].n : '';
  return '🟢 онлайн' + (md ? ' · ' + md : zn ? ' · 🏝️ ' + zn : '');
}
/* спливашка з [Прийняти] [Відмовитись]; за 30 с зникає сама (сервер теж забуває запит) */
function frPopup(html, onYes, onNo) {
  let box = $('#frpops');
  if (!box) { box = document.createElement('div'); box.id = 'frpops'; document.body.appendChild(box); }
  const d = document.createElement('div'); d.className = 'frpop';
  d.innerHTML = `<div class="frtx">${html}</div><div class="btns"><button class="btn" data-y="1">Прийняти</button><button class="btn alt" data-n="1">Відмовитись</button></div><i class="frbar"></i>`;
  let done = false;
  const fin = fn => { if (done) return; done = true; clearTimeout(tm); d.remove(); if (fn) fn(); };
  const tm = setTimeout(() => fin(null), FR_POP_T);
  d.addEventListener('click', e => { if (e.target.closest('[data-y]')) fin(onYes); else if (e.target.closest('[data-n]')) fin(onNo); });
  box.appendChild(d); sfx('waypoint');
  return d;
}
/* прийняв запрошення: у лобі режиму (go()) або до друга (телепорт) */
function frJoin(m) {
  const mode = m.md && MODES.find(x => x.id === m.md), cur = curMode();
  if (mode) {
    if (cur === mode) { toast(`🎮 Ти вже тут: ${escapeHTML(mode.n)}`); return; }
    if (cur && cur.leave && !cur.leave()) return;
    closePanel(); mode.go(); toast(`🎮 ${escapeHTML(mode.n)} — разом із <b>${escapeHTML(m.n)}</b>`); return;
  }
  const r = NET.players[m.id], x = r ? r.x : m.x, z = r ? r.z : m.z, y = r ? r.y : m.y;
  if (typeof x !== 'number' || typeof z !== 'number') { toast('🤷 Не знаю, де зараз друг'); return; }
  if (cur && cur.leave && !cur.leave()) return;
  closePanel(); const f = $('#fade'); if (f) f.style.opacity = 1; sfx('travel');
  setTimeout(() => {
    pl.x = x + 1; pl.z = z + .5; pl.y = y || 0; pl.vy = 0; pl.falling = false; pl.jump = null; pl.safe = { x: pl.x, z: pl.z };
    camPos.set(pl.x, pl.y + 20, pl.z + 18); camLook.set(pl.x, pl.y + .5, pl.z); if (f) f.style.opacity = 0;
    toast(`📍 Ти поруч із <b>${escapeHTML(m.n)}</b>`);
  }, 260);
}
function frMsg(m) {
  const n = escapeHTML(m.n || '');
  if (m.op === 'list') { FR.list = Array.isArray(m.list) ? m.list : []; frRefresh(); }
  else if (m.op === 'req') frPopup(`👥 <b>${n}</b> хоче додати тебе в друзі`, () => frSend('ans', { n: m.n, ok: true }), () => frSend('ans', { n: m.n, ok: false }));
  else if (m.op === 'sent') { FR.sent[m.n.toLowerCase()] = Date.now(); toast(`📨 Запит у друзі надіслано: <b>${n}</b>`); frRefresh(); }
  else if (m.op === 'acc') { toast(`🤝 <b>${n}</b> тепер твій друг!`); sfx('waypoint'); }
  else if (m.op === 'dec') { delete FR.sent[String(m.n).toLowerCase()]; toast(`🙅 <b>${n}</b> відхилив запит у друзі`); frRefresh(); }
  else if (m.op === 'inv') {
    const where = m.md ? (frModeName(m.md) || escapeHTML(m.md)) : '📍 до себе';
    frPopup(`🎮 <b>${n}</b> запрошує тебе в ${where}`, () => { frSend('invans', { n: m.n, ok: true }); frJoin(m); }, () => frSend('invans', { n: m.n, ok: false }));
  }
  else if (m.op === 'isent') toast(`📨 Запрошення надіслано: <b>${n}</b>`);
  else if (m.op === 'invans') toast(m.ok ? `✅ <b>${n}</b> прийняв запрошення` : `🙅 <b>${n}</b> відхилив запрошення`);
  else if (m.op === 'err') toast('👥 ' + escapeHTML(m.m || 'Помилка'));
}
function renderFriends() {
  if (!NET.on) return '<h3>👥 Друзі</h3><p class="muted">Друзі доступні в онлайні.</p>';
  if (!FR.list || Date.now() - FR.asked > 4000) { FR.asked = Date.now(); frSend('list'); }
  const cur = curMode();
  const pick = n => `<div class="frpick"><span class="muted" style="font-size:12px">Куди кличеш?</span><div class="btns small">
    <button class="btn" data-fr="inv" data-n="${escapeHTML(n)}" data-md="">📍 До мене</button>${MODES.map(m => `<button class="btn ${cur === m ? '' : 'alt'}" data-fr="inv" data-n="${escapeHTML(n)}" data-md="${m.id}">${m.ic || '🎮'} ${escapeHTML(m.n)}${cur === m ? ' (я тут)' : ''}</button>`).join('')}
    <button class="btn alt" data-fr="pick" data-n="">✕</button></div></div>`;
  const fl = (FR.list || []).slice().sort((a, b) => b.on - a.on || a.n.localeCompare(b.n)).map(f => `<div class="row"><span class="ic">${f.on ? '🧑‍🍳' : '💤'}</span><div class="tx"><b>${escapeHTML(f.n)}</b><div class="need">${frWhere(f)}</div>${FR.pick === f.n && f.on ? pick(f.n) : ''}</div>
    <div class="btns small">${f.on ? `<button class="btn" data-fr="pick" data-n="${escapeHTML(f.n)}">🎮 Запросити</button>` : ''}<button class="btn alt" data-fr="del" data-n="${escapeHTML(f.n)}" title="Прибрати з друзів">✕</button></div></div>`).join('');
  const others = Object.values(NET.players).filter(r => r.name && !frIsFriend(r.name)).map(r => {
    const sent = Date.now() - (FR.sent[r.name.toLowerCase()] || 0) < FR_POP_T;
    return `<div class="row"><span class="ic">🧑‍🍳</span><div class="tx"><b>${escapeHTML(r.name)}</b> · рів. ${r.lvl || 1}</div><div class="btns small"><button class="btn" data-fr="add" data-n="${escapeHTML(r.name)}" ${sent ? 'disabled' : ''}>${sent ? '⏳ Надіслано' : '➕ Додати'}</button></div></div>`;
  }).join('');
  return `<h3>👥 Друзі · ${(FR.list || []).filter(f => f.on).length}/${(FR.list || []).length} онлайн</h3>
    <div class="list frlist">${FR.list ? fl || '<p class="muted">Поки нікого. Додай гравців зі списку нижче або за ніком.</p>' : '<p class="muted">Завантажую…</p>'}</div>
    <h3 style="margin-top:14px">➕ Додати за ніком</h3><div class="btns"><input id="frname" maxlength="20" placeholder="Нік гравця" autocomplete="off" style="flex:1;min-width:120px;padding:8px;border-radius:10px;border:1px solid rgba(127,127,127,.4);font:inherit"><button class="btn" data-fr="addname">➕ Додати</button></div>
    <h3 style="margin-top:14px">🟢 Зараз у грі</h3><div class="list">${others || '<p class="muted">Інших гравців онлайн немає (або всі вже твої друзі).</p>'}</div>`;
}
$('#pbody').addEventListener('click', e => {
  if (panel !== 'friends') return;
  const b = e.target.closest('[data-fr]'); if (!b || b.disabled) return;
  const a = b.dataset.fr, n = b.dataset.n;
  if (a === 'add') frSend('req', { n });
  else if (a === 'addname') { const v = ($('#frname') && $('#frname').value || '').trim(); if (v) frSend('req', { n: v }); }
  else if (a === 'pick') { FR.pick = FR.pick === n ? null : n || null; renderPanel(); }
  else if (a === 'inv') { frSend('inv', { n, md: b.dataset.md || '' }); FR.pick = null; renderPanel(); }
  else if (a === 'del') frSend('del', { n });
});
$('#pbody').addEventListener('keydown', e => { if (panel === 'friends' && e.target.id === 'frname' && e.key === 'Enter') { const v = e.target.value.trim(); if (v) frSend('req', { n: v }); } });
