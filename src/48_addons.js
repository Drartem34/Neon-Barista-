/* =====================================================================
   АДДОНИ
   Кинув файл у папку addons/ поруч зі start.py → перезапустив сторінку →
   нововведення в грі. Без перезбирання й без нового архіву всієї гри.
   Аддон — звичайний .js, що бачить усі змінні гри й має API `Addon`
   (див. addons/README.md). Працюють, коли гра відкрита через start.py.
   ===================================================================== */
const ADDONS = { list: [], hooks: { world: [], start: [], tick: [] }, tabs: {}, keys: {}, net: {}, dyn: [], cur: null, ready: false };

function addonRec() { return ADDONS.cur || { id: 'addon', name: 'addon', ok: true, err: '' }; }
function addonFail(rec, e) {
  rec.ok = false; rec.err = String(e && e.message || e).slice(0, 200);
  try { console.error('[addon ' + rec.id + ']', e); } catch (_) { }
  if (running) toast(`🧩 Аддон «${escapeHTML(rec.name)}» зламався: ${escapeHTML(rec.err)}`);
}
function addonRun(rec, fn, ...a) { if (!rec.ok) return; try { return fn(...a); } catch (e) { addonFail(rec, e); } }
function addonEmit(ev, ...a) { for (const [rec, fn] of ADDONS.hooks[ev]) addonRun(rec, fn, ...a); }

function makeBridge(a, b) {
  const A = ISLMAP[a], B = ISLMAP[b];
  let dx = B.x - A.x, dz = B.z - A.z; const d = Math.hypot(dx, dz); dx /= d; dz /= d;
  const ax = A.x + dx * (A.r - 1.2), az = A.z + dz * (A.r - 1.2), bx = B.x - dx * (B.r - 1.2), bz = B.z - dz * (B.r - 1.2);
  return { bridge: true, n: 'Міст', ax, az, bx, bz, dx, dz, len: Math.hypot(bx - ax, bz - az), w: 2.6, A, B };
}

/* ---------- API для аддонів ---------- */
const Addon = {
  /** Назва, опис, версія — видно в ⚙️ Налаштуваннях. */
  info(meta) { Object.assign(addonRec(), meta || {}); },
  /** Події: 'world' (світ будується — став будівлі), 'start' (гравець зайшов), 'tick' (кожен кадр, dt). */
  on(ev, fn) { if (!ADDONS.hooks[ev]) throw new Error('Невідома подія: ' + ev); ADDONS.hooks[ev].push([addonRec(), fn]); },
  /** Новий острів. def: { id, n, sub, x, z, r, top, rock, tier, spawn: [['office', 3]], safe } */
  island(def, bridgeTo) {
    if (ISLMAP[def.id]) throw new Error('Острів уже є: ' + def.id);
    const s = Object.assign({ top: '#C3E6A8', rock: '#9389C9', tier: 1 }, def);
    ISL.push(s); ISLMAP[s.id] = s;
    [].concat(bridgeTo || []).forEach(t => Addon.bridge(s.id, t));
    return s;
  },
  /** Міст між двома островами. */
  bridge(a, b) { if (!ISLMAP[a] || !ISLMAP[b]) throw new Error('Немає острова для мосту: ' + a + ' / ' + b); BR.push(makeBridge(a, b)); },
  /** Вкладка в меню: render() повертає HTML, onClick(e) — кліки всередині. */
  tab(id, title, render, onClick) {
    const rec = addonRec(), key = 'ax_' + id;
    ADDONS.tabs[key] = { rec, render, onClick };
    TABS.splice(TABS.length - 2, 0, [key, title]);
    return key;
  },
  /** Клавіша: Addon.key('KeyG', () => …). Поверни false — і гра обробить клавішу як звичайно. */
  key(code, fn) { ADDONS.keys[code] = [addonRec(), fn]; },
  /** Мережа між гравцями: Addon.send('ping', {…}); Addon.onNet('ping', (data, from) => …). */
  send(type, data) { netSend({ t: 'ax', a: addonRec().id + ':' + type, d: data }); },
  onNet(type, fn) { ADDONS.net[addonRec().id + ':' + type] = [addonRec(), fn]; },
  /** Позначити об'єкт, що рухається / змінює колір (інакше оптимізатор «заморозить» його у статиці). */
  dynamic(obj) { ADDONS.dyn.push(obj); return obj; },
  /** Сховище аддона в прогресі гравця (зберігається разом з акаунтом). */
  data() { const id = addonRec().id; P.addons = P.addons || {}; return P.addons[id] = P.addons[id] || {}; },
};
/* Addon.info(...) повертає той самий API, прив'язаний до цього аддона —
   ним зручно користуватися навіть із таймерів і подій, коли аддон уже завантажився. */
const _addonInfo = Addon.info;
Addon.info = function (meta) {
  const rec = addonRec(); _addonInfo(meta);
  const api = {};
  for (const k of Object.keys(Addon)) api[k] = (...a) => withAddon(rec, () => (k === 'info' ? _addonInfo : Addon[k])(...a));
  return api;
};
function withAddon(rec, fn) { const prev = ADDONS.cur; ADDONS.cur = rec || prev; try { return fn(); } finally { ADDONS.cur = prev; } }

/* ---------- Інтеграція з грою ---------- */
function addonTabRender(id) {
  const t = ADDONS.tabs[id]; if (!t) return null;
  return () => { const html = withAddon(t.rec, () => addonRun(t.rec, t.render)); return t.rec.ok ? (html || '') : `<p class="note">Аддон «${escapeHTML(t.rec.name)}» зламався: ${escapeHTML(t.rec.err)}</p>`; };
}
/* true — клавішу забрав аддон; якщо обробник повернув false, гра обробляє клавішу як звичайно. */
function addonKey(code) { const k = ADDONS.keys[code]; if (!k) return false; const r = withAddon(k[0], () => addonRun(k[0], k[1])); return r !== false && k[0].ok; }
function addonTick(dt) { if (ADDONS.hooks.tick.length) for (const [rec, fn] of ADDONS.hooks.tick) withAddon(rec, () => addonRun(rec, fn, dt)); }
function addonNet(m) { const h = ADDONS.net[m.a]; if (h) withAddon(h[0], () => addonRun(h[0], h[1], m.d, { id: m.from, name: m.name })); }
function addonsPanelHTML() {
  if (!ADDONS.list.length) return accountMode() ? `<h3>🧩 Аддони</h3><p class="muted" style="font-size:13px">Немає. Кинь .js у папку <b>addons/</b> поруч зі start.py і онови сторінку.</p>` : '';
  return `<h3>🧩 Аддони</h3><div class="list">${ADDONS.list.map(a => `<div class="row"><span class="ic">${a.ok ? '🧩' : '⚠️'}</span><div class="tx"><b>${escapeHTML(a.name)}</b>${a.version ? ' · v' + escapeHTML(String(a.version)) : ''}<div class="need">${a.ok ? escapeHTML(a.desc || a.src) : 'Помилка: ' + escapeHTML(a.err)}</div></div></div>`).join('')}</div>`;
}
$('#pbody').addEventListener('click', e => { const t = ADDONS.tabs[panel]; if (t && t.onClick) withAddon(t.rec, () => addonRun(t.rec, t.onClick, e)); });

/* ---------- Завантаження ---------- */
/* Прямий eval тут бачить усі змінні гри; обгортка-функція дає аддону власну область видимості. */
function runAddonCode(code, url) { const fn = eval('(function (Addon) {\n' + code + '\n})\n//# sourceURL=' + url); fn(Addon); }
function loadAddonScript(a) {
  const rec = { id: a.id, src: a.src, name: a.id, ok: true, err: '' };
  ADDONS.list.push(rec);
  const url = 'addons/' + a.src.split('/').map(encodeURIComponent).join('/') + '?v=' + a.v;
  return fetch(url, { cache: 'no-store' }).then(r => { if (!r.ok) throw new Error('файл не завантажився (' + r.status + ')'); return r.text(); })
    // Кожен аддон — у власній функції: свої змінні (const A …) не конфліктують з іншими аддонами.
    .then(code => withAddon(rec, () => runAddonCode(code, url)))
    .catch(e => addonFail(rec, e));
}
function loadAddons() {
  if (window.__ADDON_CODE) {     // сервер світу: аддони вже прочитані з диска
    for (const a of window.__ADDON_CODE) { const rec = { id: a.id, src: a.src, name: a.id, ok: true, err: '' }; ADDONS.list.push(rec); try { withAddon(rec, () => runAddonCode(a.code, 'addons/' + a.src)); } catch (e) { addonFail(rec, e); } }
    return null;
  }
  if (!netAvailable() || typeof fetch !== 'function') return null;
  const timeout = new Promise(r => setTimeout(r, 5000));
  const go = fetch('addons/index.json', { cache: 'no-store' }).then(r => r.ok ? r.json() : []).catch(() => [])
    .then(async list => { for (const a of (Array.isArray(list) ? list : [])) await loadAddonScript(a); });
  return Promise.race([go, timeout]);
}
