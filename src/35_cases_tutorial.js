/* =====================================================================
   КЕЙСИ (рулетка), НАВЧАННЯ, МАНЕКЕН-СТАЖЕР
   Кейси відкриваються тільки за ігрові монети або випадають як лут.
   ===================================================================== */
let caseOpen = false, caseAnim = null;
const CASE_N = 46, CASE_WIN = 38, CASE_TW = 102;

function addCase(id, n = 1, silent) {
  P.cases[id] = (P.cases[id] || 0) + n;
  if (!silent) toast(`${CASES[id].ic} <b>${CASES[id].n}</b>${n > 1 ? ' ×' + n : ''} · відкрий у меню 🎁 (B)`);
  refreshHUD();
}
function caseRarity(C) {
  const L = S.luck || 3;
  const w = C.odds.map((o, i) => o * (1 + L * .01 * i));
  let t = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < w.length; i++) { t -= w[i]; if (t <= 0 && w[i] > 0) return i; }
  return C.odds.findIndex(o => o > 0);
}
function caseItem(C, r) {
  if (C.special && r >= 4 && Math.random() < .5) return makeItem(pick(C.special), r);
  const pool = Object.keys(BASE).filter(k => k !== 'fists' && !BASE[k].craftOnly && !BASE[k].bossOnly && !BASE[k].explore && (BASE[k].minR || 0) <= r);
  return makeItem(pick(pool), r);
}
function rollCasePrize(id) {
  const C = CASES[id];
  let x = Math.random() * 100;
  for (const k of ['cosm', 'recipe', 'coins', 'ings']) {
    x -= C.extra[k] || 0;
    if (x >= 0) continue;
    if (k === 'coins') { const n = randi(C.coins[0], C.coins[1]); return { kind: 'coins', n, r: n > C.coins[1] * .75 ? 2 : 1, ic: '🪙', name: n + ' монет' }; }
    if (k === 'ings') { const list = []; for (let i = 0; i < 4; i++) list.push(pick(Object.keys(ING))); return { kind: 'ings', list, r: 1, ic: '🧺', name: 'Набір інгредієнтів' }; }
    if (k === 'recipe') return { kind: 'recipe', r: 2, ic: '📜', name: 'Випадковий рецепт' };
    if (k === 'cosm') { const miss = COSM.filter(c => !P.cosm.includes(c.id)); const c = miss.length ? pick(miss) : pick(COSM); return { kind: 'cosm', id: c.id, r: 3, ic: '🎨', name: 'Фартух «' + c.n + '»', color: c.c }; }
  }
  const r = caseRarity(C), it = caseItem(C, r);
  return { kind: 'item', it, r, ic: BASE[it.b].ic, name: itemName(it) };
}
function grantPrize(p) {
  if (p.kind === 'item') {
    if (!addItem(p.it, true)) { const c = Math.round(6 * Math.pow(p.it.r + 1, 2)); P.coins += c; toast(`Інвентар повний — приз продано за ${c} 🪙`); }
  } else if (p.kind === 'coins') P.coins += p.n;
  else if (p.kind === 'ings') { p.list.forEach(k => { P.ing[k] = (P.ing[k] || 0) + 1; questEvent('ing:' + k); }); }
  else if (p.kind === 'recipe') learnRandomRecipe();
  else if (p.kind === 'cosm') { if (P.cosm.includes(p.id)) { P.coins += 40; toast('Цей фартух уже є — +40 🪙'); } else P.cosm.push(p.id); }
}
function openCase(id) {
  if (caseOpen || !P.cases[id]) return;
  P.cases[id]--; caseOpen = true;
  const prize = rollCasePrize(id);
  const tiles = [];
  for (let i = 0; i < CASE_N; i++) tiles.push(i === CASE_WIN ? prize : rollCasePrize(id));
  $('#ctitle').textContent = CASES[id].ic + ' ' + CASES[id].n;
  $('#cstrip').style.transform = 'translateX(0px)';
  $('#cstrip').innerHTML = tiles.map(p => `<div class="ctile" style="--rc:${RAR[p.r].c}">${p.ic}<span>${p.name}</span></div>`).join('');
  $('#cprize').innerHTML = '<p class="muted" style="padding-top:30px">Крутиться…</p>';
  $('#cbtns').innerHTML = '<button class="btn alt" data-c="skip">Пропустити анімацію</button>';
  $('#caseov').hidden = false;
  const wrapW = $('#cstrip').parentElement.clientWidth || 600;
  const jitter = (Math.random() - .5) * CASE_TW * .7;
  const target = CASE_WIN * CASE_TW + 48 - wrapW / 2 + jitter;
  caseAnim = { t: 0, dur: 5.6, target, last: -1, prize, id, wrapW, done: false };
  sfx('chest'); save();
}
function updCase(rdt) {
  const a = caseAnim; if (!a || a.done) return;
  a.t += rdt;
  const k = Math.min(1, a.t / a.dur), e = 1 - Math.pow(1 - k, 4);
  const x = a.target * e;
  $('#cstrip').style.transform = `translateX(${-x}px)`;
  const idx = Math.floor((x + a.wrapW / 2) / CASE_TW);
  if (idx !== a.last) { a.last = idx; sfx('tick'); }
  if (k >= 1) finishCase();
}
function finishCase() {
  const a = caseAnim; a.done = true;
  $('#cstrip').style.transform = `translateX(${-a.target}px)`;
  const win = $('#cstrip').children[CASE_WIN]; if (win) win.classList.add('win');
  const p = a.prize;
  grantPrize(p);
  sfx('reveal' + p.r);
  let body = '';
  if (p.kind === 'item') body = `<div class="pic">${p.ic}</div><h4 class="t${p.r}">${p.name}</h4><div class="muted" style="font-size:13px">${RAR[p.r].name} · ${RAR[p.r].ua}</div>${itemStatsHTML(p.it)}`;
  else if (p.kind === 'cosm') body = `<div class="pic"><span class="cos on" style="display:inline-block;width:56px;height:56px;background:${p.color}"></span></div><h4 class="t3">${p.name}</h4><div class="muted">Новий колір фартуха — вдягни в меню 🎒</div>`;
  else if (p.kind === 'ings') body = `<div class="pic">${p.ic}</div><h4>${p.name}</h4><div class="chips" style="justify-content:center;margin-top:6px">${p.list.map(k => `<span class="chip">${ING[k].ic} ${ING[k].n}</span>`).join('')}</div>`;
  else body = `<div class="pic">${p.ic}</div><h4 class="t${p.r}">${p.name}</h4>`;
  $('#cprize').innerHTML = body;
  const more = P.cases[a.id] || 0;
  $('#cbtns').innerHTML = `<button class="btn" data-c="take">Забрати</button>${more ? `<button class="btn alt" data-c="again">Відкрити ще (${more})</button>` : ''}`;
  refreshHUD(); save();
}
function closeCase() {
  caseOpen = false; caseAnim = null; $('#caseov').hidden = true;
  if (panel) renderPanel();
}
$('#cbtns').addEventListener('click', e => {
  const b = e.target.closest('[data-c]'); if (!b || !caseAnim) return;
  const c = b.dataset.c, id = caseAnim.id;
  if (c === 'skip') caseAnim.t = caseAnim.dur;
  if (c === 'take') closeCase();
  if (c === 'again') { closeCase(); openCase(id); }
});
function renderCases() {
  const hub = inHub();
  const rows = CASE_ORDER.map(id => {
    const C = CASES[id], own = P.cases[id] || 0;
    const odds = C.odds.map((o, i) => o > 0 ? `<span class="t${i}">${RAR[i].name} ${o}%</span>` : '').join('');
    const extra = Object.values(C.extra).reduce((a, b) => a + b, 0);
    const buy = C.price ? `<button class="btn alt" data-act="buycase" data-arg="${id}" ${hub && P.coins >= C.price ? '' : 'disabled'}>Купити · ${C.price} 🪙</button>` : '';
    return `<div class="casecard" style="--cc:${C.c}"><span class="ic">${C.ic}</span><div><b>${C.n}</b> <span class="own">×${own}</span><div class="muted" style="font-size:13px">${C.d}</div><div class="odds">${odds}</div><div class="muted" style="font-size:11px;margin-top:4px">Шанс предмета ${100 - extra}%, решта — косметика, рецепти, монети чи інгредієнти. Удача трохи підвищує рідкість.</div></div><div class="btns" style="margin:0;flex-direction:column">${own ? `<button class="btn" data-act="opencase" data-arg="${id}">Відкрити</button>` : ''}${buy}</div></div>`;
  }).join('');
  return `<h3>Кейси</h3><p class="muted" style="font-size:13px">Падають зі скринь, з заспокоєних, за квести й навчання, а «Золотий кейс CEO» — тільки з рейду. Купити можна в «Гущі» лише за ігрові монети. У тебе ${P.coins} 🪙.</p>${hub ? '' : '<p class="note">Купівля працює тільки в «Кавовій Гущі». Відкривати можна будь-де.</p>'}<div class="list">${rows}</div>`;
}
function renderSound() {
  const sl = (k, n) => `<label class="slider"><span>${n}</span><input type="range" min="0" max="100" value="${Math.round(AUD[k] * 100)}" data-aud="${k}"><b>${Math.round(AUD[k] * 100)}</b></label>`;
  const q = [['high', 'Висока'], ['medium', 'Середня'], ['low', 'Низька (слабкий телефон)']].map(([k, n]) => `<button class="btn ${GFX.q === k ? '' : 'alt'}" data-act="gfx" data-arg="${k}">${n}</button>`).join('');
  return `<h3>Графіка</h3><div class="btns">${q}</div><div class="btns"><button class="btn ${GFX.fps ? '' : 'alt'}" data-act="fps">${GFX.fps ? 'Сховати FPS' : 'Показувати FPS'}</button></div><label class="slider"><span>Яскравість</span><input type="range" min="50" max="130" value="${Math.round(GFX.exp * 100)}" data-exp="1"><b>${Math.round(GFX.exp * 100)}</b></label><p class="muted" style="font-size:12px;margin:6px 0 12px">Яскравість змінюється одразу — підкрути, якщо світлі об’єкти засвічені або картинка темна. Низька якість вимикає тіні, зменшує роздільність і кількість частинок. Нерухомий світ уже злито в кілька великих мешів (${mergeStats.before} → ${mergeStats.after} об’єктів).</p><h3>Звук</h3>${sl('music', 'Музика')}${sl('sfx', 'Ефекти')}<div class="btns"><button class="btn ${AUD.muted ? '' : 'alt'}" data-act="mute">${AUD.muted ? 'Увімкнути звук' : 'Вимкнути все'}</button></div>
  <p class="muted" style="font-size:13px;margin-top:12px;line-height:1.5">Музика адаптивна: у «Гущі» — спокійний lo-fi з вінілом і мелодією, на островах — тихіше, у бою вмикаються барабани й напружений бас, на рейді — тема CEO. У меню музика стає приглушеною. Звуки ворогів просторові: чути, з якого боку вони.</p>` + addonsPanelHTML() + accountPanelHTML();
}
$('#pbody').addEventListener('input', e => {
  if (e.target.dataset && e.target.dataset.exp) { GFX.exp = +e.target.value / 100; renderer.toneMappingExposure = GFX.exp; saveGfx(); const b = e.target.parentElement.querySelector('b'); if (b) b.textContent = e.target.value; return; }
  const k = e.target.dataset && e.target.dataset.aud; if (!k) return;
  const v = +e.target.value / 100; setAudio(k, v);
  const b = e.target.parentElement.querySelector('b'); if (b) b.textContent = e.target.value;
  if (k === 'sfx') sfx('ui');
});
$('#pbody').addEventListener('click', e => {
  const b = e.target.closest('[data-act="mute"]'); if (!b) return;
  initAudio(); setAudio('muted', !AUD.muted); refreshMuteBtn(); renderPanel();
});

/* ---------- Манекен-стажер ---------- */
let dummyT = 0;
function getDummy() { return MON.find(m => m.T.dummy && !m.dead); }
function updDummy(dt) {
  const d = getDummy();
  if (d && d.calm && tutActive() && (P.tut === 4 || P.tut === 5) && d.calmT > 3) { removeMonster(d); dummyT = 0; }
  if (getDummy()) return;
  dummyT -= dt;
  if (dummyT <= 0) { spawnMonster('dummy', ISLMAP.hub, DUMMY_POS.x, DUMMY_POS.z); dummyT = 12; }
}

/* ---------- Навчання ---------- */
let tutMoved = 0, tutLast = null, tutFinT = 0, tutBeans = null;
function tutActive() { return !!(P && running && P.tut >= 0); }
function tutStart() { P.tut = 0; tutMoved = 0; tutLast = null; renderTut(); }
function renderTut() {
  const el = $('#tut');
  if (!tutActive()) { el.hidden = true; return; }
  const s = TUT[P.tut];
  el.hidden = false;
  el.innerHTML = `<div class="tn"><span>Навчання ${P.tut + 1}/${TUT.length}</span><div class="dots">${TUT.map((_, i) => `<i class="${i <= P.tut ? 'on' : ''}"></i>`).join('')}</div><button data-t="skip">${P.tut === TUT.length - 1 ? 'Закрити' : 'Пропустити'}</button></div><h4>${s.n}</h4><p>${IS_TOUCH && s.dt ? s.dt : s.d}</p>`;
}
$('#tut').addEventListener('click', e => { if (e.target.closest('[data-t="skip"]')) tutFinish(); });
function tutSpawnBeans() {
  const a = pl.face + 1.7, x = pl.x + Math.sin(a) * 3.5, z = pl.z + Math.cos(a) * 3.5;
  const ok = onGround(x, z, 1) && !STATICS.some(o => dist2(x, z, o.x, o.z) < o.r + .5);
  const px = ok ? x : pl.x + 2.5, pz = ok ? z : pl.z;
  spawnPickup({ k: 'ing', d: 'beans' }, px, pz);
  tutBeans = { x: px, z: pz };
}
function tutNext() {
  P.tut++; sfx('ding');
  burst(pl.x, 1.4, pl.z, '#FFD27A', 10, 2.5, .7, 3);
  if (P.tut === 2) tutSpawnBeans();
  if (P.tut === TUT.length - 1) {
    tutFinT = 9;
    if (!P.tutCaseGiven) { P.tutCaseGiven = true; addCase('intern'); }
  }
  renderTut(); save();
}
function tutFinish() {
  if (!P.tutCaseGiven) { P.tutCaseGiven = true; addCase('intern'); }
  P.tut = -1; tutBeans = null; renderTut(); save();
  if (P.quest === 0 && P.qstate === 'offer') toast('Маріанна біля бару чекає — стрілка під ногами покаже шлях.');
}
function tutEvent(k) {
  if (!tutActive()) return;
  const s = P.tut;
  if ((s === 1 && k === 'dash') || (s === 2 && k === 'pick') || (s === 3 && k === 'brew') || ((s === 4 || s === 5) && k === 'calmDummy')) {
    if (k === 'calmDummy' && s === 4) P.tut = 5;
    tutNext();
  }
}
function tutTarget() {
  if (!tutActive()) return null;
  if (P.tut === 2 && tutBeans) return [tutBeans.x, tutBeans.z];
  if (P.tut === 3) return [BARS[0].x, BARS[0].z + 1.4];
  if (P.tut === 4 || P.tut === 5) { const d = getDummy(); return d ? [d.x, d.z] : null; }
  return null;
}
function updTut(dt) {
  if (!tutActive()) return;
  if (P.tut === 0) {
    if (tutLast) tutMoved += dist2(pl.x, pl.z, tutLast.x, tutLast.z);
    tutLast = { x: pl.x, z: pl.z };
    if (tutMoved > 5) tutNext();
  } else if (P.tut === 3 && P.brew == null && (P.drinks.latte || 0) === 0 && !canAfford(DRINK.latte.need)) {
    P.ing.beans = (P.ing.beans || 0) + 1; P.ing.milk = (P.ing.milk || 0) + 1;
  } else if (P.tut === 4) {
    const d = getDummy();
    if (d && !d.calm && d.stress <= d.max * .25 + .5) tutNext();
  } else if (P.tut === 5) {
    if (!(P.drinks.latte || P.drinks.flat || P.drinks.raf) && !P.brew && Math.random() < dt * .2) toast('Латте скінчилось — звари ще на барі.');
  } else if (P.tut === TUT.length - 1) {
    tutFinT -= dt; if (tutFinT <= 0) tutFinish();
  }
}
