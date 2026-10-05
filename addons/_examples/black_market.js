/* Аддон «Чорний ринок»: тіньовий торговець Кіт-Робуста на Таємному острівці
   (батут на західному краю «Гущі»). Підійди й натисни F.
   - Товари: рідкісний лут, знахідки дослідника, кейси, п'ятилисник. Асортимент оновлюється кожні 10 хв.
   - Скупка: бере речі (навіть зламані) дорожче, ніж Маріанна.
   - Контракти: унікальні завдання з нагородами, яких більше ніде нема. */
const A = Addon.info({ name: 'Чорний ринок', version: '1.0', desc: 'Тіньовий торговець на Таємному острівці: рідкісний лут, скупка речей і унікальні контракти.' });

const NPC = { x: 0, z: 0, y: 0, bh: 2.3, dead: false, h: null, name: 'Кіт-Робуста' };
const NEAR = 2.6;
const WINDOW = 10 * 60 * 1000;

/* ---------- Торговець ---------- */
A.on('world', () => {
  const s = ISLMAP.secret;
  NPC.x = s.x - 1.9; NPC.z = s.z - 1.6;
  const h = humanoid({ skin: '#C9A27E', shirt: '#2E2346', pants: '#1E1830' });
  put(h.body, mesh(new THREE.BoxGeometry(.62, .5, .58), '#1E1830'), 0, 1.62, -.04);                 // каптур
  put(h.body, mesh(new THREE.BoxGeometry(.5, .08, .06), bulb('#B07CF0'), false), 0, 1.52, .28);       // окуляри, що світяться
  put(h.body, mesh(new THREE.BoxGeometry(.7, .9, .08), '#3B2E5A'), 0, .95, -.3);                      // плащ
  const lamp = new THREE.Group(); lamp.position.set(0, -.5, .1); h.hand.add(lamp);
  put(lamp, mesh(new THREE.BoxGeometry(.18, .24, .18), bulb('#B07CF0'), false), 0, 0, 0);
  addLampGlow(lamp, 0, 0, 0, '#B07CF0', 1.6, { pool: false, light: false });
  h.aR.rotation.x = -.5;
  // прилавок із ящиків
  const stall = new THREE.Group(); stall.position.set(NPC.x + 1.1, 0, NPC.z + .2); scene.add(stall);
  put(stall, mesh(new THREE.BoxGeometry(1.2, .7, .7), '#5B4A7A'), 0, .35, 0);
  put(stall, mesh(new THREE.BoxGeometry(1.3, .06, .8), '#B07CF0', false), 0, .72, 0);
  put(stall, mesh(new THREE.OctahedronGeometry(.16, 0), bulb('#FFD27A'), false), -.3, .9, 0);
  put(stall, mesh(new THREE.OctahedronGeometry(.13, 0), bulb('#FF6B93'), false), .25, .88, .1);
  h.root.position.set(NPC.x, 0, NPC.z); h.root.rotation.y = angTo(NPC.x, NPC.z, s.x, s.z);
  scene.add(A.dynamic(h.root)); NPC.h = h;
  addStatic(NPC.x, NPC.z, .45); addStatic(NPC.x + 1.1, NPC.z + .2, .7);
});
const LINES = ['Псст… кави не треба? У мене є дещо цікавіше.', 'Нічого не бачив, нічого не продавав.', 'Кіт-Робуста завжди при товарі.', 'Маріанні ні слова.'];
let talkT = 0;
A.on('tick', dt => {
  if (!NPC.h) return;
  NPC.h.body.position.y = Math.sin(gameTime * 1.6) * .03;
  NPC.h.head.rotation.y = Math.sin(gameTime * .6) * .4;
  talkT -= dt;
  if (talkT <= 0 && dist2(pl.x, pl.z, NPC.x, NPC.z) < 6) { talkT = 9; bubble(NPC, pick(LINES), false, 3); }
});
const nearNPC = () => NPC.h && dist2(pl.x, pl.z, NPC.x, NPC.z) < NEAR && Math.abs(pl.y) < 1;

/* F біля торговця */
const _getInteract = getInteract;
getInteract = function () {
  if (!pl.dead && !pl.ride && !pl.carry && nearNPC()) return { l: '🕶️ Чорний ринок', fn: () => openPanel(TAB) };
  return _getInteract.apply(this, arguments);
};

/* ---------- Асортимент (свій для кожного гравця, оновлюється кожні 10 хв) ---------- */
function stock() {
  const d = A.data(), win = Math.floor(Date.now() / WINDOW);
  if (!d.stock || d.stock.win !== win) {
    const goods = [];
    for (let i = 0; i < 3; i++) { const it = randomItem(30); it.r = Math.max(it.r, 3 + (Math.random() < .25 ? 1 : 0)); goods.push({ k: 'item', d: it, p: priceOf(it) * 3 }); }
    { const it = exploreItem(25, 3); goods.push({ k: 'item', d: it, p: priceOf(it) * 4 }); }
    goods.push({ k: 'case', d: pick(['deadline', 'vacation']), p: 260 });
    goods.push({ k: 'ing', d: 'clover', n: 3, p: 70 });
    goods.push({ k: 'mystery', p: 150 });
    d.stock = { win, goods };
  }
  return d.stock;
}
function priceOf(it) { return Math.round(6 * Math.pow(it.r + 1, 2) * (1 + (it.lvl || 0) * .3)); }
function sellPrice(it) { return Math.round(priceOf(it) * (it.broken ? .7 : 1.5)); }
function minsLeft() { return Math.ceil((WINDOW - Date.now() % WINDOW) / 60000); }

/* ---------- Контракти ---------- */
const CONTRACTS = {
  purge:  { n: 'Тиха зачистка', d: 'Заспокой 6 вигорілих далеко від «Гущі» (40+ м від центру).', ev: 'calmFar', need: 6, rw: { coins: 180, item: 4 } },
  riot:   { n: 'Погром', d: 'Розбий 8 предметів оточення: ящики, принтери, кавоварки.', ev: 'break', need: 8, rw: { coins: 120, case: 'deadline' } },
  fish:   { n: 'Рибний бізнес', d: 'Злови 3 риби — Кіт-Робуста їх перепродасть.', ev: 'fish', need: 3, rw: { coins: 150, ing: { clover: 2 } } },
  digger: { n: 'Археологія тіней', d: 'Розкопай 2 скарби в піску, снігу чи джунглях.', ev: 'dig', need: 2, rw: { explore: 1 } },
  smug:   { n: 'Контрабанда', d: 'Принеси 3 🍀 п’ятилисники і 2 🍯 сиропи відпустки.', deliver: { clover: 3, syrup: 2 }, rw: { coins: 220, item: 3 } },
  boss:   { n: 'Компромат', d: 'Заспокой будь-якого міні-боса. Кіт-Робуста любить чужі секрети.', ev: 'miniboss', need: 1, rw: { coins: 400, item: 5 } },
};
function contract() {
  const d = A.data();
  if (!d.c || !CONTRACTS[d.c.id]) { const ids = Object.keys(CONTRACTS).filter(k => k !== (d.lastC || '')); d.c = { id: pick(ids), prog: 0 }; }
  return d.c;
}
const _questEvent = questEvent;
questEvent = function (ev) {
  _questEvent.apply(this, arguments);
  if (!P || window.__SIM) return;
  const c = contract(), C = CONTRACTS[c.id];
  const e = ev === 'calm' && Math.hypot(pl.x, pl.z) > 40 ? 'calmFar' : ev;
  if (C.ev && C.ev === e && c.prog < C.need) {
    c.prog++;
    if (c.prog >= C.need) { banner(`🕶️ Контракт «${C.n}» виконано — повертайся до Кота-Робусти`); sfx('level'); }
    else ftext(pl.x, 2.6, pl.z, `🕶️ ${C.n}: ${c.prog}/${C.need}`, 'gold');
  }
};
function contractReady(c) {
  const C = CONTRACTS[c.id];
  if (C.deliver) return Object.keys(C.deliver).every(k => (P.ing[k] || 0) >= C.deliver[k]);
  return c.prog >= C.need;
}
function giveReward(rw, x, z) {
  const loot = [];
  if (rw.coins) loot.push({ k: 'coins', d: rw.coins });
  if (rw.item) { const it = randomItem(30); it.r = Math.max(it.r, rw.item); loot.push({ k: 'item', d: it }); }
  if (rw.explore) loot.push({ k: 'item', d: exploreItem(30, 3) });
  if (rw.case) loot.push({ k: 'case', d: rw.case });
  if (rw.ing) for (const k in rw.ing) for (let i = 0; i < rw.ing[k]; i++) loot.push({ k: 'ing', d: k });
  dropLoot(x, z, loot);
}

/* ---------- Вкладка «Чорний ринок» ---------- */
const MSG = { t: '' };
const TAB = A.tab('market', '🕶️ Чорний ринок', () => {
  const here = nearNPC();
  const head = `<h3>🕶️ Чорний ринок · ${escapeHTML(NPC.name)}</h3>
    ${here ? '' : '<p class="note">Торговець ховається на <b>Таємному острівці</b> — батут на західному краю «Гущі». Купувати, продавати й здавати контракти можна тільки поруч із ним.</p>'}
    ${MSG.t ? `<p class="note">${MSG.t}</p>` : ''}`;
  const st = stock();
  const goods = st.goods.map((g, i) => {
    const sold = g.sold;
    let ic, name, sub;
    if (g.k === 'item') { const B = BASE[g.d.b]; ic = B.ic; name = `<span class="t${g.d.r}">${itemName(g.d)}</span>`; sub = `${RAR[g.d.r].name}${B.explore ? ' · знахідка' : ''}`; }
    else if (g.k === 'case') { ic = CASES[g.d].ic; name = CASES[g.d].n; sub = 'кейс'; }
    else if (g.k === 'ing') { ic = ING[g.d].ic; name = `${ING[g.d].n} ×${g.n}`; sub = 'інгредієнт'; }
    else { ic = '🎲'; name = 'Мішок-сюрприз'; sub = 'що завгодно: від шкарпетки до Mythic'; }
    return `<div class="row" style="${sold ? 'opacity:.45' : ''}"><span class="ic">${ic}</span><div class="tx"><b>${name}</b><div class="need">${sub}</div></div>
      <button class="btn" data-bm="buy" data-i="${i}" ${here && !sold && P.coins >= g.p ? '' : 'disabled'}>${sold ? 'Продано' : g.p + ' 🪙'}</button></div>`;
  }).join('');
  const c = contract(), C = CONTRACTS[c.id], ready = contractReady(c);
  const prog = C.deliver ? Object.keys(C.deliver).map(k => `${ING[k].ic} ${Math.min(P.ing[k] || 0, C.deliver[k])}/${C.deliver[k]}`).join(' · ') : `${c.prog} / ${C.need}`;
  const rw = [C.rw.coins ? C.rw.coins + ' 🪙' : '', C.rw.item ? RAR[C.rw.item].name + '+ річ' : '', C.rw.explore ? 'знахідка дослідника' : '', C.rw.case ? 'кейс' : '', C.rw.ing ? Object.keys(C.rw.ing).map(k => ING[k].ic + '×' + C.rw.ing[k]).join(' ') : ''].filter(Boolean).join(' · ');
  const sellable = P.inv.filter(it => !eqSlotOf(it) && !it.fav).sort((a, b) => b.r - a.r);
  const sell = sellable.length ? `<div class="invgrid">${sellable.map(it => `<button class="it r${it.r} ${it.broken ? 'broken' : ''}" data-bm="sell" data-u="${it.u}" title="${itemName(it)} — ${sellPrice(it)} 🪙" ${here ? '' : 'disabled'}>${BASE[it.b].ic}<span class="lv" style="font-size:9px">${sellPrice(it)}</span></button>`).join('')}</div>` : '<p class="muted">Нема що продати (вдягнуте й ⭐ не продаються).</p>';
  return head + `
    <h3 style="margin-top:6px">Товари <span class="muted" style="font-size:12px;font-weight:400">· новий асортимент через ${minsLeft()} хв</span></h3><div class="list">${goods}</div>
    <h3 style="margin-top:16px">Контракт</h3>
    <div class="row"><span class="ic">📜</span><div class="tx"><b>${C.n}</b><div>${C.d}</div><div class="need">Прогрес: ${prog} · Нагорода: ${rw}</div></div>
      <div class="btns" style="margin:0;flex-direction:column"><button class="btn" data-bm="turn" ${here && ready ? '' : 'disabled'}>Здати</button><button class="btn alt" data-bm="skip" ${here ? '' : 'disabled'} title="Взяти інший контракт">Інший · 30 🪙</button></div></div>
    <h3 style="margin-top:16px">Скупка <span class="muted" style="font-size:12px;font-weight:400">· ×1.5 до ціни Маріанни, зламане — теж беремо</span></h3>${sell}`;
}, e => {
  const b = e.target.closest('[data-bm]'); if (!b || b.disabled || !nearNPC()) return;
  const a = b.dataset.bm;
  if (a === 'buy') {
    const g = stock().goods[+b.dataset.i]; if (!g || g.sold || P.coins < g.p) return;
    P.coins -= g.p; g.sold = 1;
    if (g.k === 'item') addItem(g.d);
    else if (g.k === 'case') addCase(g.d, 1);
    else if (g.k === 'ing') P.ing[g.d] = (P.ing[g.d] || 0) + g.n;
    else { const it = randomItem(20 + Math.random() * 40); if (Math.random() < .08) it.r = 5; addItem(it); }
    MSG.t = '🤝 Угода. Ти мене не бачив.'; sfx('coin');
  } else if (a === 'sell') {
    const it = P.inv.find(i => i.u === b.dataset.u); if (!it || eqSlotOf(it) || it.fav) return;
    const p = sellPrice(it); P.coins += p; removeItem(it); MSG.t = `Продано: ${itemName(it)} · +${p} 🪙`; sfx('coin');
  } else if (a === 'turn') {
    const d = A.data(), c = contract(), C = CONTRACTS[c.id]; if (!contractReady(c)) return;
    if (C.deliver) for (const k in C.deliver) P.ing[k] -= C.deliver[k];
    giveReward(C.rw, pl.x, pl.z); addXP(150, pl.x, pl.z);
    d.done = (d.done || 0) + 1; d.lastC = c.id; d.c = null;
    MSG.t = `📜 Контракт «${C.n}» закрито. Нагорода біля тебе. Наступний уже чекає.`; sfx('legend');
  } else if (a === 'skip') {
    if (P.coins < 30) return; P.coins -= 30; const d = A.data(); d.lastC = contract().id; d.c = null; MSG.t = 'Добре, є інша робота…';
  }
  refreshHUD(); save(); renderPanel();
});
