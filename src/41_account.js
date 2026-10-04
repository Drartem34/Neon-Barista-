/* =====================================================================
   АКАУНТИ (логін + пароль на сервері start.py)
   Прогрес зберігається на сервері під акаунтом, тому не губиться, коли
   тунель видає нове посилання (новий домен = порожній localStorage).
   Тут же: видалення акаунта, адмін-панель (бан / розбан / кік / права).
   ===================================================================== */
const ACCT_KEY = 'barista-acct';
let ACCT = null;   // { token, login, admin }
try { ACCT = JSON.parse(localStorage.getItem(ACCT_KEY) || 'null'); } catch (e) { ACCT = null; }
function setAcct(a) { ACCT = a; try { a ? localStorage.setItem(ACCT_KEY, JSON.stringify(a)) : localStorage.removeItem(ACCT_KEY); } catch (e) { } }
function api(path, body) {
  return fetch('/api/' + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ token: ACCT && ACCT.token }, body || {})) })
    .then(r => r.json()).catch(() => ({ ok: false, e: 'Сервер недоступний' }));
}
function accountMode() { return netAvailable(); }

/* ---------- Збереження на сервер ---------- */
let syncBusy = false, syncFails = 0;
function serverSave(data) {
  if (!accountMode() || !ACCT || syncBusy) return;
  syncBusy = true;
  api('save', { data }).then(r => {
    if (r.ok) syncFails = 0;
    else if (r.auth) { setAcct(null); if (running) toast('🔒 ' + escapeHTML(r.e || 'Сесія завершилась') + '. Прогрес лишився в браузері — увійди знову.'); }
    else if (++syncFails === 3 && running) toast('⚠️ Не вдається зберегти прогрес на сервері.');
  }).finally(() => { syncBusy = false; });
}
/* Після входу: серверний сейв — головний. Якщо на сервері порожньо, а в браузері
   є сейв цього ж акаунта (або «нічий», зроблений до акаунтів) — він піде на сервер. */
function adoptServerSave(data) {
  const local = loadSave();
  if (data && data.P) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (e) { } }
  else if (local && local.owner && local.owner !== ACCT.login) { try { localStorage.removeItem(SAVE_KEY); } catch (e) { } }
}

/* ---------- Титульний екран ---------- */
function setupAccountUI() {
  if (!accountMode()) return;
  $('#netbox').hidden = false;
  if (typeof fetch === 'function') fetch('/status').then(r => r.json()).then(j => { $('#netcount').textContent = j.players ? `Зараз у грі: ${j.players} (${j.names.slice(0, 5).join(', ')})` : 'Поки ніхто не грає — будь першим.'; }).catch(() => { });
  const err = t => { $('#acc-err').textContent = t || ''; };
  const go = path => {
    const login = $('#acc-login').value.trim(), pass = $('#acc-pass').value;
    if (!login || !pass) { err('Введи логін і пароль'); return; }
    err('…');
    api(path, { login, pass }).then(r => {
      if (!r.ok) { err(r.e || 'Помилка'); return; }
      $('#acc-pass').value = ''; err('');
      setAcct({ token: r.token, login: r.login, admin: r.admin });
      afterLogin();
    });
  };
  $('#acc-in').addEventListener('click', () => go('login'));
  $('#acc-reg').addEventListener('click', () => go('register'));
  $('#acc-pass').addEventListener('keydown', e => { if (e.key === 'Enter') go('login'); });
  $('#acc-logout').addEventListener('click', () => { api('logout'); setAcct(null); refreshAccountUI(); });
  $('#acc-del').addEventListener('click', () => { $('#acc-delbox').hidden = !$('#acc-delbox').hidden; });
  $('#acc-delgo').addEventListener('click', () => deleteAccount($('#acc-delpass').value, t => { $('#acc-delerr').textContent = t; }));
  if (ACCT) api('me').then(r => { if (r.ok) { setAcct(Object.assign(ACCT, { login: r.login, admin: r.admin })); afterLogin(); } else { if (r.auth) setAcct(null); refreshAccountUI(r.banned ? r.e : ''); } });
  refreshAccountUI();
}
function afterLogin() {
  api('load').then(r => {
    if (r.ok) adoptServerSave(r.data);
    refreshAccountUI();
  });
}
function refreshAccountUI(msg) {
  if (!accountMode()) { refreshTitleButtons(); return; }
  const inn = !!ACCT;
  $('#acc-form').hidden = inn; $('#acc-box').hidden = !inn;
  if (msg) $('#acc-err').textContent = msg;
  if (inn) { $('#acc-name').textContent = ACCT.login; $('#acc-adm').hidden = !ACCT.admin; $('#acc-delbox').hidden = true; }
  const nick = $('.mm-nickname'), av = $('.mm-avatar');
  if (nick) nick.textContent = inn ? ACCT.login : 'Гість';
  if (av) av.textContent = inn ? ACCT.login[0].toUpperCase() : '?';
  refreshTitleButtons();
}
function deleteAccount(pass, onErr) {
  if (!pass) { onErr('Введи пароль, щоб підтвердити'); return; }
  api('delete', { pass }).then(r => {
    if (!r.ok) { onErr(r.e || 'Помилка'); return; }
    NET.wanted = false; running = false;
    setAcct(null); try { localStorage.removeItem(SAVE_KEY); } catch (e) { }
    location.reload();
  });
}

/* ---------- Мережеві події акаунта ---------- */
function netAccountMsg(m) {
  if (m.t === 'banned' || m.t === 'kicked' || m.t === 'auth') {
    NET.wanted = false;
    if (m.t === 'banned') { setAcct(null); running = false; paused = true; $('#banmsg').textContent = m.m || ''; $('#banned').hidden = false; }
    else toast('🚪 ' + escapeHTML(m.m || 'Тебе відключено від сервера'));
    return true;
  }
  return false;
}

/* ---------- Панель «Акаунт» у налаштуваннях ---------- */
function accountPanelHTML() {
  if (!accountMode()) return '';
  if (!ACCT) return `<h3>Акаунт</h3><p class="note">Ти не в акаунті — прогрес зберігається лише в цьому браузері. Вийди в головне меню й увійди, щоб він не загубився при зміні посилання.</p>`;
  return `<h3>Акаунт</h3><p class="muted" style="font-size:13px">Ти граєш як <b>${escapeHTML(ACCT.login)}</b>${ACCT.admin ? ' · 🛡️ адмін' : ''}. Прогрес зберігається на сервері — заходь з будь-якого посилання чи пристрою.</p>
  <div class="btns"><button class="btn alt" data-acc="logout">Вийти з акаунта</button><button class="btn alt" data-acc="del">Видалити акаунт…</button></div>
  <div id="pdel" hidden class="detail"><p style="font-size:13px;margin:0 0 6px">Акаунт і весь прогрес буде видалено <b>назавжди</b>.</p><input id="pdelpass" type="password" placeholder="Пароль" class="ainp"><div class="btns"><button class="btn" data-acc="delgo" style="background:#C2335A">Так, видалити</button></div><div id="pdelerr" class="aerr"></div></div>`;
}
$('#pbody').addEventListener('click', e => {
  const b = e.target.closest('[data-acc]'); if (!b) return;
  const a = b.dataset.acc;
  if (a === 'logout') { save(); api('logout').then(() => { setAcct(null); NET.wanted = false; location.reload(); }); }
  else if (a === 'del') $('#pdel').hidden = !$('#pdel').hidden;
  else if (a === 'delgo') deleteAccount($('#pdelpass').value, t => { $('#pdelerr').textContent = t; });
});

/* ---------- Адмін-панель ---------- */
const ADM = { users: null, q: '', err: '' };
const ACT_UA = { atk: '⚔️ атакує', brew: '☕ варить', fish: '🎣 рибалить', dig: '⛏️ копає', swim: '🏊 пливе', glide: '🪂 планує', boss: '💼 б’ється з босом', menu: '📋 у меню', sit: '🪑 відпочиває', dead: '💀 вигорів', drink: '🥤 частує', chair: '🛒 катається', '': '🚶 гуляє' };
function renderAdmin() {
  if (!ACCT || !ACCT.admin) return '<p class="muted">Тільки для адміністраторів.</p>';
  if (!ADM.users) { loadAdmin(); return '<h3>🛡️ Адмін-панель</h3><p class="muted">Завантаження…</p>'; }
  const q = ADM.q.toLowerCase();
  const rows = ADM.users.filter(u => !q || u.login.toLowerCase().includes(q)).map(u => {
    const ago = u.online ? '<b style="color:#2F9A52">● онлайн</b>' : 'був ' + timeAgo(u.seen);
    const doing = u.online ? ` · ${ACT_UA[u.act] || ACT_UA['']}${u.zone && ISLMAP[u.zone] ? ' · ' + ISLMAP[u.zone].n : ''}` : '';
    const me = u.login === ACCT.login;
    const L = escapeHTML(u.login);
    return `<div class="row" style="${u.banned ? 'background:#FFE1E5' : ''}"><span class="ic">${u.banned ? '⛔' : u.admin ? '🛡️' : '☕'}</span><div class="tx"><b>${L}</b> · рів. ${u.lvl}${me ? ' · це ти' : ''}<div class="need">${ago}${doing} · IP ${escapeHTML(u.ip || '?')}</div>${u.banned ? `<div class="need" style="color:#C2335A">Бан${u.reason ? ': ' + escapeHTML(u.reason) : ''}</div>` : ''}</div>
      <div class="btns" style="margin:0;justify-content:flex-end">${me ? '' : u.banned ? `<button class="btn" data-adm="unban" data-login="${L}">Розбанити</button>` : `<button class="btn" data-adm="ban" data-login="${L}" style="background:#C2335A">Бан</button>`}
      ${u.online && !me ? `<button class="btn alt" data-adm="kick" data-login="${L}">Кік</button>` : ''}
      ${me ? '' : `<button class="btn alt" data-adm="${u.admin ? 'unadmin' : 'admin'}" data-login="${L}">${u.admin ? 'Зняти адміна' : 'Зробити адміном'}</button><button class="btn alt" data-adm="delete" data-login="${L}">🗑️</button>`}</div></div>`;
  }).join('');
  const on = ADM.users.filter(u => u.online).length, ban = ADM.users.filter(u => u.banned).length;
  return `<h3>🛡️ Адмін-панель</h3>
  <div class="chips" style="margin-bottom:10px"><span class="chip">Акаунтів: ${ADM.users.length}</span><span class="chip">Онлайн: ${on}</span><span class="chip">У бані: ${ban}</span><button class="fchip" data-adm="refresh">⟳ Оновити</button></div>
  <div class="arow"><input id="adm-reason" class="ainp" maxlength="120" placeholder="Причина (для бану й кіку)"><input id="adm-q" class="ainp" placeholder="Пошук гравця" value="${escapeHTML(ADM.q)}"></div>
  <div class="arow"><input id="adm-msg" class="ainp" maxlength="200" placeholder="Оголошення всім гравцям"><button class="btn" data-adm="announce">📢 Надіслати</button></div>
  ${ADM.err ? `<p class="note">${escapeHTML(ADM.err)}</p>` : ''}
  <div class="list">${rows || '<span class="muted">Нікого не знайдено</span>'}</div>`;
}
function timeAgo(t) {
  const s = Date.now() / 1000 - (t || 0);
  if (s < 90) return 'щойно'; if (s < 3600) return Math.round(s / 60) + ' хв тому';
  if (s < 86400) return Math.round(s / 3600) + ' год тому'; return Math.round(s / 86400) + ' дн тому';
}
function loadAdmin() {
  api('admin', { act: 'list' }).then(r => {
    if (r.ok) { ADM.users = r.users; ADM.err = ''; } else { ADM.users = ADM.users || []; ADM.err = r.e || 'Помилка'; }
    if (panel === 'admin') renderPanel();
  });
}
const ADM_CONFIRM = { ban: 'Забанити', delete: 'ВИДАЛИТИ акаунт і прогрес', unadmin: 'Зняти права адміна з' };
$('#pbody').addEventListener('click', e => {
  const b = e.target.closest('[data-adm]'); if (!b) return;
  const act = b.dataset.adm, login = b.dataset.login;
  if (act === 'refresh') { loadAdmin(); return; }
  if (act === 'announce') { const m = $('#adm-msg').value.trim(); if (m) api('admin', { act, m }).then(() => toast('📢 Надіслано')); return; }
  if (ADM_CONFIRM[act] && !confirm(`${ADM_CONFIRM[act]} «${login}»?`)) return;
  api('admin', { act, login, reason: ($('#adm-reason') || {}).value || '' }).then(r => { ADM.err = r.ok ? '' : (r.e || 'Помилка'); loadAdmin(); });
});
$('#pbody').addEventListener('input', e => { if (e.target.id === 'adm-q') { ADM.q = e.target.value; const pos = e.target.selectionStart; renderPanel(); const i = $('#adm-q'); i.focus(); i.setSelectionRange(pos, pos); } });
