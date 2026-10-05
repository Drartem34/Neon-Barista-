/* Аддон «Видача предметів» — тільки для адмінів.
   У вкладці 🛡️ Адмін з'являється каталог: зброя й одяг (з вибором рідкості), інгредієнти,
   напої, кейси, монети. Видати можна собі або будь-якому гравцю: онлайн — одразу,
   офлайн — отримає при наступному вході. Право видавати перевіряє сервер. */
const A = Addon.info({ name: 'Видача предметів', version: '1.0', desc: 'Адмінам: каталог предметів у вкладці 🛡️ Адмін — видати собі чи будь-якому гравцю.' });

const AI = { cat: 'hand', q: '', r: 2, n: 1, to: '', msg: '' };
const CATS = [['hand', '⚔️ Зброя'], ['gear', '👕 Одяг'], ['ing', '🧪 Інгредієнти'], ['drink', '☕ Напої'], ['case', '🎁 Кейси'], ['coins', '🪙 Монети']];
const supported = () => typeof applyGift === 'function';

function catalog() {
  const q = AI.q.trim().toLowerCase(), hit = n => !q || n.toLowerCase().includes(q);
  if (AI.cat === 'hand' || AI.cat === 'gear')
    return Object.keys(BASE).filter(k => k !== 'fists' && (BASE[k].slot === 'hand') === (AI.cat === 'hand') && hit(BASE[k].n))
      .map(k => ({ kind: 'item', id: k, ic: BASE[k].ic, n: BASE[k].n, tag: BASE[k].explore ? 'знахідка' : BASE[k].bossOnly ? 'боса' : BASE[k].craftOnly ? 'крафт' : '' }));
  if (AI.cat === 'ing') return Object.keys(ING).filter(k => hit(ING[k].n)).map(k => ({ kind: 'ing', id: k, ic: ING[k].ic, n: ING[k].n }));
  if (AI.cat === 'drink') return Object.keys(DRINK).filter(k => hit(DRINK[k].n)).map(k => ({ kind: 'drink', id: k, ic: DRINK[k].ic, n: DRINK[k].n }));
  if (AI.cat === 'case') return Object.keys(CASES).filter(k => hit(CASES[k].n)).map(k => ({ kind: 'case', id: k, ic: CASES[k].ic, n: CASES[k].n }));
  return [100, 500, 1000, 5000].map(v => ({ kind: 'coins', id: 'coins', ic: '🪙', n: v + ' монет', amount: v }));
}

function giveHTML() {
  if (!ACCT || !ACCT.admin) return '';
  if (!supported()) return `<h3 style="margin-top:18px">🎁 Видача предметів</h3><p class="note">Для видачі потрібна новіша версія гри (start.py + dist). Онови гру — і тут з'явиться каталог.</p>`;
  if (!AI.to) AI.to = ACCT.login;
  const users = (ADM.users || []).filter(u => !u.banned);
  if (!users.some(u => u.login === AI.to)) users.unshift({ login: AI.to, online: true });
  const opts = users.map(u => `<option value="${escapeHTML(u.login)}" ${u.login === AI.to ? 'selected' : ''}>${u.login === ACCT.login ? '🫵 Собі' : (u.online ? '🟢 ' : '⚪ ') + escapeHTML(u.login)}</option>`).join('');
  const cats = CATS.map(([k, n]) => `<button class="fchip ${AI.cat === k ? 'on' : ''}" data-ai="cat" data-v="${k}">${n}</button>`).join('');
  const isItem = AI.cat === 'hand' || AI.cat === 'gear';
  const rar = isItem ? `<div class="chips" style="margin:6px 0">${RAR.map((r, i) => `<button class="fchip r${i} ${AI.r === i ? 'on' : ''}" data-ai="rar" data-v="${i}" style="border:2px solid">${r.name}</button>`).join('')}</div>` : '';
  const cnt = AI.cat === 'coins' ? '' : `<label class="muted" style="font-size:13px;display:flex;align-items:center;gap:6px;flex:none">Кількість <input id="ai-n" class="ainp" type="number" min="1" max="${isItem ? 20 : 999}" value="${AI.n}" style="width:76px"></label>`;
  const grid = catalog().map(c => `<button class="res" data-ai="give" data-kind="${c.kind}" data-id="${c.id}" data-amt="${c.amount || ''}" title="Видати: ${escapeHTML(c.n)}" style="cursor:pointer;border:0;color:var(--ink)"><span class="ic">${c.ic}</span><span>${escapeHTML(c.n)}</span>${c.tag ? `<small style="position:static;opacity:.6">${c.tag}</small>` : ''}</button>`).join('') || '<span class="muted">Нічого не знайдено</span>';
  return `<h3 style="margin-top:18px">🎁 Видача предметів</h3>
    <div class="arow"><select id="ai-to" class="ainp" style="flex:1">${opts}</select>${cnt}</div>
    <div class="arow"><input id="ai-q" class="ainp" placeholder="Пошук предмета" value="${escapeHTML(AI.q)}"></div>
    <div class="chips">${cats}</div>${rar}
    ${AI.msg ? `<p class="note" style="margin:8px 0">${AI.msg}</p>` : ''}
    <div class="resgrid" style="margin-top:8px">${grid}</div>
    <p class="muted" style="font-size:12px;margin-top:8px">Клік по предмету — видати. Онлайн-гравцю приходить одразу, офлайн — при наступному вході.</p>`;
}

/* Вбудовуємося у вкладку 🛡️ Адмін */
const _renderAdmin = renderAdmin;
renderAdmin = function () { return _renderAdmin() + (ADM.users ? giveHTML() : ''); };

function give(kind, id, amount) {
  const n = kind === 'coins' ? amount : clamp(AI.n | 0, 1, kind === 'item' ? 20 : 999);
  const r = kind === 'item' ? AI.r : 0;
  const what = kind === 'coins' ? `🪙 ${n}` : `${({ item: BASE, ing: ING, drink: DRINK, case: CASES })[kind][id].ic} ${({ item: BASE, ing: ING, drink: DRINK, case: CASES })[kind][id].n} ×${n}`;
  AI.msg = '…';
  api('admin', { act: 'give', login: AI.to, kind, id, n, r }).then(res => {
    AI.msg = res.ok ? `✅ ${escapeHTML(AI.to === ACCT.login ? 'Тобі' : AI.to)}: ${escapeHTML(what)} (${escapeHTML(res.where)})` : '⚠️ ' + escapeHTML(res.e || 'Помилка');
    if (panel === 'admin') renderPanel();
  });
}

$('#pbody').addEventListener('click', e => {
  if (panel !== 'admin') return;
  const b = e.target.closest('[data-ai]'); if (!b) return;
  const a = b.dataset.ai;
  if (a === 'cat') { AI.cat = b.dataset.v; AI.msg = ''; }
  else if (a === 'rar') AI.r = +b.dataset.v;
  else if (a === 'give') { give(b.dataset.kind, b.dataset.id, +b.dataset.amt || 0); return; }
  renderPanel();
});
$('#pbody').addEventListener('change', e => {
  if (panel !== 'admin') return;
  if (e.target.id === 'ai-to') AI.to = e.target.value;
  if (e.target.id === 'ai-n') AI.n = clamp(+e.target.value || 1, 1, 999);
});
$('#pbody').addEventListener('input', e => {
  if (panel !== 'admin' || e.target.id !== 'ai-q') return;
  AI.q = e.target.value; const pos = e.target.selectionStart; renderPanel();
  const i = $('#ai-q'); if (i) { i.focus(); i.setSelectionRange(pos, pos); }
});
