/* =====================================================================
   ІГРОВА ЛОГІКА
   ===================================================================== */
const SAVE_KEY = 'barista-eow-v1';
let P = null;          // постійний стан гравця (зберігається)
let S = {};            // похідні характеристики
const pl = { x: 0, z: 3, y: 0, vy: 0, face: Math.PI, hp: 100, st: 100, stDelay: 0, iframes: 0, dashT: 0, dx: 0, dz: 1, charges: 1, chargeT: 0, atkCd: 0, pending: null, hitCount: 0, falling: false, jump: null, safe: { x: 0, z: 3 }, buffs: { speed: 0 }, walkPh: 0, swingT: 0, moving: false, bh: 2.3, dead: false };
const MON = [], PROJ = [], TELE = [], DROPS = [];
let hero = null, heldMesh = null, heldKey = '';
let running = false, paused = false, timeScale = 1, slowT = 0, shake = 0, gameTime = 0;
let selDrink = 'latte';
let lastHitM = null, lastHitT = -9;   // кого востаннє вдарили (для статусу в онлайні)
const EV = { t: 70, happy: 0, reports: 0 };
const BOSS = { rad: 1.4, lvl: 1, active: false, asleep: false, stress: 0, max: 0, x: 58, z: 16, face: 0, cd: 2.5, atkI: 0, charge: null, sleepT: 0, mesh: null, wakeLine: 0, dead: false, bh: 4.6, y: 0, offT: 0 };

/* ---------- Новий гравець / збереження ---------- */
function newPlayer() {
  const p = {
    v: 1, lvl: 1, xp: 0, coins: 25, pts: 0, sp: 0,
    alloc: { hp: 0, stam: 0, str: 0, spd: 0, def: 0, luck: 0, brew: 0, eff: 0 },
    skills: {}, inv: [], eq: { hand1: null, hand2: null, head: null, apron: null, shoes: null, acc: null, gear: null },
    ing: { beans: 4, milk: 4, chamomile: 1 }, drinks: { latte: 2, coldbrew: 1 },
    known: { latte: 1, espresso: 1, coldbrew: 1 }, recipes: {}, cosm: ['brown'], cos: 'brown',
    quest: 0, qstate: 'offer', qprog: 0, chests: {}, bossWins: 0, brew: null, calmed: 0, hubCrowd: 0,
    cases: {}, tut: 0, tutCaseGiven: false,
    heal: {}, mb: {}, home: { color: 'mint', slots: [null, null, null, null, null, null, null, null, null, null] }, decor: { flowerbed: 1, lantern: 1 }, stash: [], art: {}, artOn: true, festival: false,
    disc: { hub: 1, home: 1 }, wp: { hub: 1 }, notes: {}, fish: {}, fishSeen: {}, pets: {}, pet: null, dayT: .32,
  };
  P = p;
  const spoon = makeItem('spoon', 0); p.inv.push(spoon); p.eq.hand1 = spoon.u;
  const cap = makeItem('cap', 0); p.inv.push(cap); p.eq.head = cap.u;
  return p;
}
function save() {
  if (!P) return;
  const data = { P, boss: BOSS.lvl, owner: ACCT ? ACCT.login : undefined };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (e) { }
  serverSave(data);   // акаунт на сервері (fire-and-forget, не блокує гру)
}
function loadSave() { try { const s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } }

/* ---------- Предмети ---------- */
function rollRarity(bonus = 0) {
  const L = (S.luck || 3) + bonus;
  const w = RAR.map((r, i) => r.w * (1 + L * .06 * i));
  let t = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < w.length; i++) { t -= w[i]; if (t <= 0) return i; }
  return 0;
}
function makeItem(b, r) {
  const B = BASE[b];
  if (r == null) r = rollRarity();
  if (B.minR != null) r = Math.max(r, B.minR);
  const it = { u: uid(), b, r, lvl: 0, aff: [], broken: false };
  const pool = B.slot === 'hand' ? HAFF : GAFF, used = new Set();
  for (let i = 0; i < RAR[r].aff; i++) {
    let a = pick(pool), g = 0;
    while (used.has(a.k) && g++ < 12) a = pick(pool);
    used.add(a.k);
    it.aff.push({ k: a.k, v: Math.max(1, Math.round(rand(a.r[0], a.r[1]) * (1 + r * .15))) });
  }
  if (B.slot === 'hand') {
    let md = B.dur * (1 + .15 * r);
    const da = it.aff.find(a => a.k === 'dur'); if (da) md *= 1 + da.v / 100;
    it.maxDur = Math.round(md); it.dur = it.maxDur;
  }
  return it;
}
function randomItem(bonus = 0) {
  const r = rollRarity(bonus);
  const pool = Object.keys(BASE).filter(k => k !== 'fists' && !BASE[k].craftOnly && !BASE[k].bossOnly && !BASE[k].explore && (BASE[k].minR || 0) <= r);
  return makeItem(pick(pool), r);
}
function itemName(it) {
  const B = BASE[it.b];
  return (it.broken ? (B.bn || 'Зламаний ' + B.n.toLowerCase()) : B.n) + (it.lvl ? ' +' + it.lvl : '');
}
function handStats(it) {
  if (!it || it.broken) return Object.assign({ b: 'fists' }, BASE.fists);
  const B = BASE[it.b], R = RAR[it.r].m * (1 + .08 * it.lvl);
  const s = { b: it.b, dmg: B.dmg * R, spd: B.spd, rng: B.rng, rad: B.rad, crit: B.crit, kb: B.kb * (1 + (R - 1) * .5), wt: B.wt, use: B.use, style: B.style, fx: B.fx };
  for (const a of it.aff) {
    if (a.k === 'dmg') s.dmg *= 1 + a.v / 100;
    if (a.k === 'spd') s.spd *= 1 + a.v / 100;
    if (a.k === 'crit') s.crit += a.v / 100;
    if (a.k === 'kb') s.kb *= 1 + a.v / 100;
    if (a.k === 'wt') s.wt *= 1 - a.v / 100;
    if (a.k === 'rng') { s.rng *= 1 + a.v / 100; s.rad *= 1 + a.v / 200; }
  }
  return s;
}
function gearStats(it) {
  const B = BASE[it.b], m = RAR[it.r].m * (1 + .1 * it.lvl), out = {};
  for (const k in B.st) out[k] = Math.max(1, Math.round(B.st[k] * m));
  for (const a of it.aff) out[a.k] = (out[a.k] || 0) + a.v;
  return out;
}
function itemByU(u) { return P.inv.find(i => i.u === u) || null; }
function eqItem(slot) { const u = P.eq[slot]; return u ? itemByU(u) : null; }
function eqSlotOf(it) { for (const k in P.eq) if (P.eq[k] === it.u) return k; return null; }
function addItem(it, silent) {
  if (P.inv.length >= 60) { toast('Інвентар повний — розбери або продай щось.'); return false; }
  it.isNew = true; it.t = Date.now(); P.inv.push(it);
  if (!silent) toast(`<b class="t${it.r}">${BASE[it.b].ic} ${itemName(it)}</b> · ${RAR[it.r].ua}`);
  if (it.r >= 4) { banner(`${RAR[it.r].name}! ${BASE[it.b].ic} ${itemName(it)}`); sfx('legend'); }
  return true;
}
function removeItem(it) { const s = eqSlotOf(it); if (s) P.eq[s] = null; P.inv = P.inv.filter(i => i !== it); onGearChanged(); }
function equip(it, slot) {
  const B = BASE[it.b];
  if (!slot) slot = B.slot === 'hand' ? 'hand1' : B.slot;
  if (B.slot === 'hand' ? !(slot === 'hand1' || slot === 'hand2') : slot !== B.slot) return;
  for (const k in P.eq) if (P.eq[k] === it.u) P.eq[k] = null;
  P.eq[slot] = it.u; onGearChanged(); sfx('equip');
}
function onGearChanged() { calcStats(); refreshLook(); refreshHUD(); }

/* ---------- Характеристики ---------- */
function hasSk(id) { return !!P.skills[id]; }
function calcStats() {
  const s = { hp: 5, stam: 5, str: 5, spd: 5, def: 2, luck: 3, brew: 5, eff: 5 };
  ST_KEYS.forEach(k => s[k] += P.alloc[k] || 0);
  const fx = new Set();
  ['head', 'apron', 'shoes', 'acc', 'gear'].forEach(sl => {
    const it = eqItem(sl); if (!it) return;
    const gs = gearStats(it); for (const k in gs) s[k] += gs[k];
    if (BASE[it.b].fx) fx.add(BASE[it.b].fx);
  });
  if (hasSk('s1')) s.luck += 4;
  let W = 0;
  ['hand1', 'hand2'].forEach(sl => { const it = eqItem(sl); if (it && !it.broken) W += handStats(it).wt; });
  const pen = Math.min(.45, Math.max(0, W - 4) * .035 * (hasSk('r3') ? .4 : 1));
  S = Object.assign({}, s, {
    fx, W, pen,
    maxHP: Math.round(50 + 10 * s.hp), maxSt: Math.round(50 + 10 * s.stam),
    dmgM: (1 + (s.str - 5) * .06) * (hasSk('r1') ? 1.15 : 1),
    move: 5.4 * (1 + (s.spd - 5) * .035) * (hasSk('c1') ? 1.1 : 1) * (1 - pen),
    defR: s.def / (s.def + 25),
    brewM: (1 / (1 + (s.brew - 5) * .08)) * (hasSk('b2') ? .75 : 1),
    effM: (1 + (s.eff - 5) * .07) * (hasSk('b1') ? 1.2 : 1),
    charges: hasSk('c2') ? 2 : 1,
    dashMul: (hasSk('c4') ? 1.6 : 1) * (fx.has('slide') ? 1.25 : 1),
  });
  const h1 = eqItem('hand1'); S.goldenTips = !!(h1 && !h1.broken && BASE[h1.b].fx === 'golden');
  pl.hp = Math.min(pl.hp, S.maxHP); pl.st = Math.min(pl.st, S.maxSt);
  pl.charges = Math.min(pl.charges, S.charges);
}
const xpNeed = l => Math.round(60 * Math.pow(l, 1.5));
function addXP(n, x, z) {
  n = Math.round(n * (EV.happy > 0 ? 2 : 1) * (perk('stage') ? 1.1 : 1));
  P.xp += n;
  if (x != null) ftext(x, 2.2, z, '+' + n + ' XP', 'gold');
  while (P.xp >= xpNeed(P.lvl)) {
    P.xp -= xpNeed(P.lvl); P.lvl++; P.pts += 2; P.sp += 1;
    calcStats(); pl.hp = S.maxHP; pl.st = S.maxSt;
    banner(`Рівень ${P.lvl}! +2 очки характеристик, +1 очко навичок`);
    burst(pl.x, 1, pl.z, '#FFD27A', 24, 5, 1, 5); ringFX(pl.x, pl.z, 3, '#FFD27A', .7); sfx('level');
    save();
  }
  refreshHUD();
}

/* ---------- Лут ---------- */
function rollLoot(src, tier = 1, T) {
  const out = [], L = S.luck;
  if (src === 'calm') {
    out.push({ k: 'coins', d: Math.round(randi(3, 8) * tier * (S.goldenTips ? 2 : 1)) });
    if (Math.random() < .5) out.push({ k: 'ing', d: pick(T.drop) });
    if (Math.random() < .1 + L * .006) out.push({ k: 'item', d: randomItem(0) });
    if (Math.random() < .03 + L * .002) out.push({ k: 'recipe' });
    if (Math.random() < .015) out.push({ k: 'cosm' });
    if (Math.random() < .04 + L * .002) out.push({ k: 'case', d: 'intern' });
  } else if (src === 'chest') {
    const bonus = tier * 3 + (hasSk('s4') ? 8 : 0);
    out.push({ k: 'coins', d: Math.round(randi(15, 40) * tier) });
    for (let i = 0; i < 2; i++) out.push({ k: 'ing', d: pick(Object.keys(ING)) });
    out.push({ k: 'item', d: randomItem(bonus) });
    if (Math.random() < .45) out.push({ k: 'item', d: randomItem(bonus) });
    if (Math.random() < .25) out.push({ k: 'recipe' });
    if (Math.random() < .15) out.push({ k: 'cosm' });
    if (Math.random() < .4) out.push({ k: 'case', d: tier >= 3 ? 'vacation' : tier >= 1.8 ? 'deadline' : 'intern' });
  } else if (src === 'prop') {
    const mul = hasSk('s3') ? 2 : 1;
    const t = T;
    if (t === 'crate') { if (Math.random() < .5) out.push({ k: 'ing', d: 'tape', n: mul }); if (Math.random() < .6) out.push({ k: 'ing', d: 'bolts', n: mul }); out.push({ k: 'coins', d: randi(1, 4) * mul }); if (Math.random() < .06 + L * .004) out.push({ k: 'item', d: randomItem(0) }); if (Math.random() < .015) out.push({ k: 'case', d: 'intern' }); }
    if (t === 'vending') { out.push({ k: 'ing', d: 'beans', n: 2 * mul }); out.push({ k: 'ing', d: 'milk', n: mul }); out.push({ k: 'coins', d: randi(4, 10) }); }
    if (t === 'plant' && Math.random() < .55) out.push({ k: 'ing', d: 'chamomile', n: mul });
    if (t === 'printer') { if (Math.random() < .5) out.push({ k: 'ing', d: 'bolts', n: mul }); if (Math.random() < .15) out.push({ k: 'item', d: makeItem('stapler') }); }
    if (t === 'cooler' && Math.random() < .3) out.push({ k: 'item', d: makeItem(Math.random() < .5 ? 'bigcup' : 'extinguisher') });
    if (t === 'sandcastle') { out.push({ k: 'coins', d: randi(2, 6) }); if (Math.random() < .35) out.push({ k: 'ing', d: 'salt', n: mul }); if (Math.random() < .05) out.push({ k: 'item', d: exploreItem(0) }); }
    if (t === 'barrel') { if (Math.random() < .5) out.push({ k: 'ing', d: 'syrup', n: mul }); out.push({ k: 'coins', d: randi(2, 8) }); if (Math.random() < .06) out.push({ k: 'item', d: randomItem(2) }); }
    if (t === 'snowman') { out.push({ k: 'ing', d: Math.random() < .6 ? 'icecube' : 'milk', n: mul }); if (Math.random() < .05) out.push({ k: 'item', d: exploreItem(0) }); }
    if (t === 'bush') { out.push({ k: 'ing', d: 'beans', n: 2 * mul }); if (Math.random() < .3) out.push({ k: 'ing', d: 'chamomile' }); }
    if (t === 'pot') { out.push({ k: 'coins', d: randi(3, 12) * mul }); if (Math.random() < .07) out.push({ k: 'item', d: exploreItem(2) }); if (Math.random() < .04) out.push({ k: 'case', d: 'intern' }); }
    if (t === 'chairP' && Math.random() < .3) { const c = makeItem('chair'); if (Math.random() < .5) { c.broken = true; c.dur = 0; } out.push({ k: 'item', d: c }); }
  }
  return out;
}
function dropLoot(x, z, list, y = 0) {
  list.forEach((l, i) => {
    const a = i / Math.max(1, list.length) * Math.PI * 2 + Math.random(), d = y > 0 ? .3 + Math.random() * .4 : .6 + Math.random() * .8;
    let px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
    if (!y && !onGround(px, pz, .3)) { px = x; pz = z; }
    spawnPickup(l, px, pz, y);
  });
}
function spawnPickup(l, x, z, y = 0) {
  let m;
  if (l.k === 'item') m = mesh(G.pick, glow(RAR[l.d.r].c));
  else if (l.k === 'ing') m = mesh(G.pickIng, glow(ING[l.d].c));
  else if (l.k === 'coins') m = mesh(G.coin, mat('#FFD27A', { emissive: '#FFB547', emissiveIntensity: .35, metalness: .3, roughness: .5 }));
  else if (l.k === 'recipe') m = mesh(G.paper, glow('#FFF3E6'));
  else if (l.k === 'case') m = mesh(G.caseBox, glow(CASES[l.d].c));
  else m = mesh(G.pick, glow('#FF9AD0'));
  m.position.set(x, y + .6, z); scene.add(m);
  const ring = (l.k === 'item' && l.d.r >= 2) || l.k === 'case' ? mesh(flat(new THREE.CylinderGeometry(.5, .5, .04, 12)), basic(l.k === 'case' ? CASES[l.d].c : RAR[l.d.r].c, .4), false) : null;
  if (ring) { ring.position.set(x, y + .03, z); scene.add(ring); }
  DROPS.push({ l, x, z, y, m, ring, t: Math.random() * 6, age: 0 });
}
function collect(l) {
  if (l.k === 'item') return addItem(l.d);
  if (l.k === 'ing') {
    const n = l.n || 1; P.ing[l.d] = (P.ing[l.d] || 0) + n;
    toast(`${ING[l.d].ic} ${ING[l.d].n}${n > 1 ? ' ×' + n : ''}`);
    for (let i = 0; i < n; i++) questEvent('ing:' + l.d);
    tutEvent('pick');
    return true;
  }
  if (l.k === 'coins') { P.coins += l.d; ftext(pl.x, 2, pl.z, '+' + l.d + ' 🪙', 'gold'); sfx('coin'); return true; }
  if (l.k === 'recipe') { learnRandomRecipe(); return true; }
  if (l.k === 'case') { addCase(l.d); sfx('chest'); return true; }
  if (l.k === 'cosm') {
    const miss = COSM.filter(c => !P.cosm.includes(c.id));
    if (!miss.length) { P.coins += 25; toast('Косметика вже вся є — +25 🪙'); return true; }
    const c = pick(miss); P.cosm.push(c.id); toast(`🎨 Новий колір фартуха: <b>${c.n}</b>`); return true;
  }
  return true;
}
function learnRandomRecipe() {
  const pool = [...['flat', 'raf'].filter(d => !P.known[d]).map(d => ['d', d]), ...Object.keys(CRAFT).filter(c => !P.recipes[c]).map(c => ['c', c])];
  if (!pool.length) { P.coins += 30; toast('📜 Рецепт уже відомий — продано за 30 🪙'); return; }
  const [t, id] = pick(pool); learn(t, id);
}
function learn(t, id) {
  if (t === 'd') { P.known[id] = 1; toast(`📜 Новий рецепт напою: <b>${DRINK[id].ic} ${DRINK[id].n}</b>`); }
  else { P.recipes[id] = 1; toast(`📜 Новий рецепт крафту: <b>${BASE[CRAFT[id].out].ic} ${BASE[CRAFT[id].out].n}</b>`); }
  sfx('coin'); refreshHUD();
}
function updDrops(dt) {
  for (let i = DROPS.length - 1; i >= 0; i--) {
    const d = DROPS[i]; d.t += dt; d.age += dt;
    d.m.position.y = d.y + .55 + Math.sin(d.t * 3) * .12; d.m.rotation.y += dt * 2;
    const dd = dist2(pl.x, pl.z, d.x, d.z);
    const magnet = d.l.k === 'coins' ? 2.6 : 1.4;
    if (d.age > .35 && dd < magnet && !pl.falling && Math.abs(pl.y - d.y) < 1.5) {
      if (collect(d.l)) { scene.remove(d.m); if (d.ring) scene.remove(d.ring); DROPS.splice(i, 1); sfx('pick'); refreshHUD(); }
    }
  }
}

/* ---------- Квести ---------- */
function curQuest() { return QUESTS[Math.min(P.quest, QUESTS.length - 1)]; }
/* Скільки вже зроблено ДО квесту: відкриті острови, приручені улюбленці тощо.
   null — квест рахує лише нові дії (риба, удари, варіння). */
function questDoneBefore(q) {
  const ev = q.ev;
  if (ev === 'biome') return ISL.filter(i => P.disc[i.id] && i.id !== 'hub' && i.id !== 'home').length;
  if (ev === 'altar') return P.disc.altar ? 1 : 0;
  if (ev === 'secret') return P.chests && P.chests.secret ? 1 : 0;
  if (ev === 'tame') return Object.keys(P.pets || {}).filter(k => P.pets[k]).length;
  if (ev === 'miniboss') return Object.keys(P.mb || {}).filter(k => P.mb[k] > 0).length;
  if (ev === 'healed') return HEAL_REGIONS.filter(id => (P.heal[id] || 0) >= 100).length;
  if (ev === 'boss') return P.bossWins > 0 ? 1 : 0;
  if (ev.startsWith('ing:')) return P.ing[ev.slice(4)] || 0;
  return null;
}
function questComplete(q) { P.qstate = 'done'; banner(`Квест виконано: «${q.n}». Повернись до Маріанни.`); sfx('level'); }
/* Підтягує прогрес активного квесту до того, що гравець уже зробив раніше. */
function syncQuest(silent) {
  if (!P || P.qstate !== 'active') return;
  const q = curQuest(), have = questDoneBefore(q);
  if (have != null && have > P.qprog) P.qprog = Math.min(q.need, have);
  if (P.qprog >= q.need) { P.qprog = q.need; if (silent) P.qstate = 'done'; else questComplete(q); }
}
function questEvent(ev) {
  if (ev === 'calm') P.calmed++;
  if (P.qstate !== 'active') return;
  const q = curQuest();
  if (q.ev === ev) {
    P.qprog++;
    syncQuest();
    refreshQuest();
  }
}
function acceptQuest() {
  const q = curQuest(); P.qstate = 'active'; P.qprog = 0;
  if (q.onAccept && q.onAccept.recipe) learn('d', q.onAccept.recipe);
  toast(`Новий квест: <b>${q.n}</b>`);
  const before = questDoneBefore(q);
  if (before) toast(`Зараховано вже зроблене: <b>${Math.min(before, q.need)} / ${q.need}</b>`);
  syncQuest(); refreshQuest(); save();
}
function turnInQuest() {
  const q = curQuest(), r = q.rw;
  if (r.xp) addXP(r.xp);
  if (r.coins) { P.coins += r.coins; toast(`+${r.coins} 🪙`); }
  if (r.item) addItem(makeItem(r.item[0], r.item[1]));
  if (r.recipe) learn('d', r.recipe);
  if (r.craft) learn('c', r.craft);
  if (r.broken) { const it = makeItem(r.broken, 0); it.broken = true; it.dur = 0; addItem(it); }
  if (r.ing) for (const k in r.ing) P.ing[k] = (P.ing[k] || 0) + r.ing[k];
  if (r.case) addCase(r.case);
  if (r.decor) { P.decor[r.decor] = (P.decor[r.decor] || 0) + 1; toast(`${DECOR[r.decor].ic} <b>${DECOR[r.decor].n}</b> — постав на своєму острові (меню 🏝️)`); }
  if (r.rollR != null) { const it = randomItem(10); it.r = Math.max(it.r, r.rollR); addItem(it); }
  if (!q.repeat) P.quest++;
  P.qstate = 'offer'; P.qprog = 0;
  refreshQuest(); refreshHUD(); save();
}

/* ---------- Вороги ---------- */
function spawnMonster(type, isl, x, z) {
  if (x == null) {
    let ok = false;
    for (let k = 0; k < 60 && !ok; k++) {
      if (isl.biome === 'sea') { const L = pick(SEA_LAND.filter(l => l.id !== 'lighthouse')); const a = Math.random() * 6.28, d = Math.random() * (L.r + 1); x = L.x + Math.cos(a) * d; z = L.z + Math.sin(a) * d; }
      else { const a = Math.random() * Math.PI * 2, d = Math.random() * (isl.r - 2); x = isl.x + Math.cos(a) * d; z = isl.z + Math.sin(a) * d; }
      ok = onGround(x, z, 1) && monsterOk({ T: MT[type] }, x, z) && dist2(x, z, pl.x, pl.z) > 9 && !STATICS.some(o => dist2(x, z, o.x, o.z) < o.r + .6);
    }
    if (!ok) return null;
  }
  const T = MT[type];
  const parts = type === 'crab' ? buildCrab() : type === 'hr' ? buildHR() : type === 'monkey' ? buildMonkey() : type === 'mummy' ? buildMummy() : type === 'dummy' ? buildDummy() : type === 'hound' ? buildHound() : type === 'manager' ? buildManager() : buildOffice(pick(['#AFC4B6', '#B9C6C9', '#C2B8C9']), pick(['#8291B8', '#7C8AA8', '#8C84A8']));
  parts.root.position.set(x, 0, z); scene.add(parts.root);
  const bar = new THREE.Group(); const bg = new THREE.Mesh(G.barBg, basic('#2E2346', .75)); const fill = new THREE.Mesh(G.barFill, basic('#FF8A7A')); fill.position.set(-.5, 0, .01); bar.add(bg, fill); scene.add(bar);
  const mult = (isl.tier || 1) * (1 + .06 * (P.lvl - 1));
  const m = { type, T, isl, x, z, y: 0, vx: 0, vz: 0, vy: 0, face: Math.random() * 6, max: Math.round(T.stress * mult), dmg: T.dmg * (1 + ((isl.tier || 1) - 1) * .5), spd: T.spd, state: 'wander', t: 0, cd: rand(.5, T.cd), stun: 0, slow: 0, calm: false, calmT: 0, parts, bar, fill, tx: x, tz: z, wanderT: 0, lunge: 0, mass: T.mass, bh: type === 'manager' ? 2.6 : 2.3, walk: Math.random() * 6, dead: false };
  m.stress = m.max;
  attachWant(m);
  MON.push(m); return m;
}
function removeMonster(m) {
  m.dead = true; scene.remove(m.parts.root); scene.remove(m.bar); if (m.wantS) scene.remove(m.wantS);
  const i = MON.indexOf(m); if (i >= 0) MON.splice(i, 1);
}
function applyHit(m, dmg, kx, kz, isBoss) {
  if (m.calm) return;
  const floor = m.max * .25;
  const before = m.stress;
  if (m.stress > floor) m.stress = Math.max(floor, m.stress - dmg);
  const real = before - m.stress;
  lastHitM = m; lastHitT = gameTime;
  if (isBoss) return real;
  m.lastHit = gameTime; flashMonster(m);
  m.vx += kx / m.mass; m.vz += kz / m.mass;
  m.stun = Math.max(m.stun, .25 + dmg * .02);
  if (m.state === 'windup' && dmg > 8) { m.state = 'chase'; m.cd = m.T.cd * .6; }
  if (m.state === 'wander') m.state = 'chase';
  return real;
}
function applyCalm(m, amt, isBoss, handed, drinkId) {
  if (m.calm) return;
  let a = amt * S.effM * (handed ? 1.25 : 1) * (isBoss ? 1 : wantMul(m, drinkId));
  m.stress -= a;
  ftext(m.x, isBoss ? 4.5 : 2.4, m.z, '−' + Math.round(a) + ' стресу', 'calm');
  burst(m.x, isBoss ? 3 : 1.6, m.z, '#C2F7E3', 6, 2, .6, 2);
  if (isBoss) { if (m.stress <= 0) (m.onCalm ? m.onCalm() : bossSleep()); return; }
  if (m.stress <= 0) calmMonster(m);
}
function calmMonster(m) {
  m.calm = true; m.stress = 0; m.state = 'calm'; m.calmT = 0; m.vx = m.vz = 0;
  m.bar.visible = false;
  const p = m.parts;
  if (!p.hound) {
    p.torso.material = mat('#BFE8D5'); p.aLm.material = p.aRm.material = mat('#BFE8D5');
    p.head.material = mat('#F0CBAA');
    const cup = mesh(G.cup, '#FFFFFF'); cup.rotation.x = -Math.PI / 2; cup.position.set(0, .05, .1); p.hand.add(cup);
  } else {
    p.torso.material = mat('#BFE8D5'); p.head.material = mat('#F0CBAA');
  }
  bubble(m, pick(LINES_CALM), false, 3.2);
  if (m.stolen && m.stolen.length) { m.stolen.forEach(k => P.ing[k] = (P.ing[k] || 0) + 2); toast(`Мавпа повернула вкрадене з відсотками: ${m.stolen.map(k => ING[k].ic).join(' ')} ×2`); m.stolen = null; }
  burst(m.x, 1.8, m.z, '#FFB3C7', 14, 3, .9, 4);
  ringFX(m.x, m.z, 2, '#B9F5DE', .6);
  addXP(m.T.xp * (m.isl.tier || 1) * (m.gotWant ? 1.3 : 1), m.x, m.z);
  const loot = rollLoot('calm', m.isl.tier || 1, m.T);
  if (m.gotWant) { loot.push({ k: 'coins', d: randi(4, 10) }); ftext(m.x, 3.4, m.z, 'Задоволений клієнт! Чайові ⭐', 'gold'); }
  dropLoot(m.x, m.z, loot);
  if (m.wantS) { scene.remove(m.wantS); m.wantS = null; }
  if (!m.T.dummy) addHeal(regionAt(m.x, m.z) || m.isl.id, (m.gotWant ? 9 : 6) * (m.T.xp >= 40 ? 1.4 : 1), m.x, m.z);
  questEvent('calm'); sfx('calm', m.x, m.z);
  if (m.T.dummy) tutEvent('calmDummy');
}

function moveTry(e, dx, dz, avoidHub) {
  const nx = e.x + dx, nz = e.z + dz;
  const ok = (x, z) => onGround(x, z, .7) && (!e.T || monsterOk(e, x, z)) && !(avoidHub && dist2(x, z, 0, 0) < ISLMAP.hub.r + .8);
  if (ok(nx, nz)) { e.x = nx; e.z = nz; return true; }
  if (ok(nx, e.z)) { e.x = nx; return true; }
  if (ok(e.x, nz)) { e.z = nz; return true; }
  return false;
}
function pushOutStatics(e, r) {
  for (const o of STATICS) {
    if ((e.y || 0) >= (o.h == null ? 2.5 : o.h) - .05) continue;
    const dx = e.x - o.x, dz = e.z - o.z, d = Math.hypot(dx, dz), min = o.r + r;
    if (d < min && d > 1e-4) { e.x = o.x + dx / d * min; e.z = o.z + dz / d * min; }
  }
  for (const p of PROPS) {
    if (!p.alive) continue;
    const dx = e.x - p.x, dz = e.z - p.z, d = Math.hypot(dx, dz), min = p.r + r;
    if (d < min && d > 1e-4) { e.x = p.x + dx / d * min; e.z = p.z + dz / d * min; }
  }
}
function angTo(ax, az, bx, bz) { return Math.atan2(bx - ax, bz - az); }
function angDiff(a, b) { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }
function playerInSafe() { return dist2(pl.x, pl.z, 0, 0) < ISLMAP.hub.r + .3 || dist2(pl.x, pl.z, ISLMAP.home.x, ISLMAP.home.z) < ISLMAP.home.r + .3; }

function updMonster(m, dt) {
  const p = m.parts;
  if (m.carried) { syncMonster(m, dt); return; }
  if (m.state === 'fall') {
    m.vy -= 25 * dt; m.y += m.vy * dt; m.x += m.vx * dt; m.z += m.vz * dt;
    p.root.rotation.x += dt * 3;
    if (m.y < -30) removeMonster(m);
    syncMonster(m, dt); return;
  }
  // фізика відкидання
  const sp = Math.hypot(m.vx, m.vz);
  if (sp > .05) {
    m.x += m.vx * dt; m.z += m.vz * dt;
    if (sp > 4) {
      for (const pr of PROPS) {
        if (pr.alive && dist2(m.x, m.z, pr.x, pr.z) < pr.r + .5) {
          damageProp(pr, sp * 1.6, 'knock');
          m.stun = Math.max(m.stun, 1.1); m.vx *= -.3; m.vz *= -.3;
          ftext(m.x, 2, m.z, 'Бам!', 'crit'); shake = Math.max(shake, .15);
          applyHit(m, sp * .8, 0, 0);
          break;
        }
      }
      for (const o of STATICS) {
        if (dist2(m.x, m.z, o.x, o.z) < o.r + .45) { m.stun = Math.max(m.stun, .9); m.vx *= -.35; m.vz *= -.35; applyHit(m, sp * .5, 0, 0); break; }
      }
      if (hasSk('x1')) {
        for (const o of MON) {
          if (o === m || o.calm || o.state === 'fall') continue;
          if (dist2(m.x, m.z, o.x, o.z) < 1.1) {
            o.vx += m.vx * .7; o.vz += m.vz * .7; o.stun = Math.max(o.stun, .8); applyHit(o, sp, 0, 0);
            m.vx *= .4; m.vz *= .4; ftext(o.x, 2, o.z, 'Рикошет!', 'crit');
          }
        }
      }
    }
    const k = Math.exp(-(onSyrup(m.x, m.z) ? 1.3 : 5) * dt); m.vx *= k; m.vz *= k;
    const sink = onGround(m.x, m.z, .1) && !m.T.dummy && isWet(terrainAt(m.x, m.z)) || (terrainAt(m.x, m.z) === 'shallow' && !m.T.shallow && !m.T.dummy && false);
    if (!onGround(m.x, m.z, .1) || sink) {
      m.state = 'fall'; m.vy = sink ? -1 : 3; if (sink) burst(m.x, 0, m.z, '#BDEFFF', 16, 3, .7, 3);
      if (!m.calm) { ftext(m.x, 2, m.z, sink ? 'Поплив у відпустку…' : 'Полетів у відпустку…', 'big'); addXP(Math.round(m.T.xp * .3), m.x, m.z); }
      if (m.bar) m.bar.visible = false;
      sfx('fall', m.x, m.z); return;
    }
    if (!m.calm && !m.T.dummy && dist2(m.x, m.z, 0, 0) < ISLMAP.hub.r + .6) { const a = angTo(0, 0, m.x, m.z); m.x = Math.sin(a) * (ISLMAP.hub.r + .6); m.z = Math.cos(a) * (ISLMAP.hub.r + .6); m.vx = m.vz = 0; }
  }
  pushOutStatics(m, .4);
  for (const o of MON) {
    if (o === m || o.state === 'fall') continue;
    const dx = m.x - o.x, dz = m.z - o.z, d = Math.hypot(dx, dz);
    if (d < .8 && d > 1e-4) { m.x += dx / d * (.8 - d) * .5; m.z += dz / d * (.8 - d) * .5; }
  }

  if (m.calm) {
    m.calmT += dt;
    if (m.calmT > 22) {
      m.parts.root.scale.multiplyScalar(1 - dt * 2);
      if (m.parts.root.scale.x < .1) { removeMonster(m); if (!m.T.dummy) addHubCrowd(); }
    } else if (m.calmT > 1.5) {
      m.wanderT -= dt;
      if (m.wanderT <= 0) { m.wanderT = rand(2, 4); m.tx = m.x + rand(-2, 2); m.tz = m.z + rand(-2, 2); }
      const d = dist2(m.x, m.z, m.tx, m.tz);
      if (d > .3) { const a = angTo(m.x, m.z, m.tx, m.tz); m.face = a; moveTry(m, Math.sin(a) * .8 * dt, Math.cos(a) * .8 * dt); m.walk += dt * 5; }
    }
    syncMonster(m, dt); return;
  }

  // аура навушників
  if (S.fx.has('aura') && dist2(m.x, m.z, pl.x, pl.z) < 4) { m.stress = Math.max(m.max * .25, m.stress - 2 * dt); }

  if (m.slow > 0) m.slow -= dt;
  if (m.stun > 0) { m.stun -= dt; m.walk += dt * 2; syncMonster(m, dt); return; }
  if (m.T.dummy) {
    m.face = lerpAng(m.face, angTo(m.x, m.z, pl.x, pl.z), Math.min(1, dt * 3));
    if (gameTime - (m.lastHit || -99) > 6 && m.stress < m.max) m.stress = Math.min(m.max, m.stress + 8 * dt);
    if (Math.random() < dt * .06 && dist2(m.x, m.z, pl.x, pl.z) < 7) bubble(m, pick(['Мені ніхто нічого не пояснив!', 'Це мій перший день…', 'Де тут кавоварка?!', 'Я вже тричі переробив звіт!']), true, 2.2);
    syncMonster(m, dt); return;
  }

  const d = dist2(m.x, m.z, pl.x, pl.z);
  const safe = playerInSafe() || pl.falling || pl.dead;
  const spd = m.spd * (m.slow > 0 ? .45 : 1) * (EV.reports > 0 ? 1.3 : 1);
  m.cd -= dt;

  if (m.state === 'wander') {
    m.wanderT -= dt;
    if (m.wanderT <= 0) { m.wanderT = rand(2, 5); for (let k = 0; k < 6; k++) { const a = Math.random() * 6.28, r = Math.random() * (m.isl.r - 2); m.tx = m.isl.x + Math.cos(a) * r; m.tz = m.isl.z + Math.sin(a) * r; if (monsterOk(m, m.tx, m.tz)) break; } if (m.isl.biome === 'sea') { m.tx = m.x + rand(-3, 3); m.tz = m.z + rand(-3, 3); } }
    if (dist2(m.x, m.z, m.tx, m.tz) > .5) { const a = angTo(m.x, m.z, m.tx, m.tz); m.face = a; moveTry(m, Math.sin(a) * spd * .4 * dt, Math.cos(a) * spd * .4 * dt, true); m.walk += dt * 4; }
    if (!safe && d < (isNight() ? 6.5 : 9.5) && pl.y < 1) { m.state = 'chase'; if (Math.random() < .35) bubble(m, pick(m.T.lines || LINES_MAD), true); sfx('aggro', m.x, m.z); }
  } else if (m.state === 'chase') {
    if (safe || d > 18 || dist2(m.x, m.z, m.isl.x, m.isl.z) > m.isl.r + 9) { m.state = 'wander'; m.wanderT = 0; }
    else {
      const a = angTo(m.x, m.z, pl.x, pl.z); m.face = a;
      if (m.T.ranged) {
        let dir = 0;
        if (d < 5) dir = -1; else if (d > 8) dir = 1;
        const side = Math.sin(gameTime * .7 + m.walk) > 0 ? 1 : -1;
        const mx = Math.sin(a) * dir + Math.cos(a) * side * .5, mz = Math.cos(a) * dir - Math.sin(a) * side * .5;
        moveTry(m, mx * spd * dt, mz * spd * dt, true); m.walk += dt * 5;
        if (m.cd <= 0 && d < 11) { m.state = 'windup'; m.t = m.T.wind; m.lx = pl.x; m.lz = pl.z; }
      } else if (m.T.dash) {
        if (d > 6 || m.cd > 0) { moveTry(m, Math.sin(a) * spd * dt, Math.cos(a) * spd * dt, true); m.walk += dt * 7; }
        if (d < 7 && m.cd <= 0) { m.state = 'windup'; m.t = m.T.wind; m.la = a; warnArc(m); }
      } else {
        if (d > m.T.rng * .85) { moveTry(m, Math.sin(a) * spd * dt, Math.cos(a) * spd * dt, true); m.walk += dt * 6; }
        else if (m.cd <= 0) { m.state = 'windup'; m.t = m.T.wind; m.la = a; if (!m.T.slam) warnArc(m); }
      }
    }
  } else if (m.state === 'windup') {
    m.t -= dt;
    if (m.T.ranged) m.face = angTo(m.x, m.z, pl.x, pl.z);
    else m.face = m.la;
    if (m.t <= 0) monsterAttack(m);
  } else if (m.state === 'lunge') {
    m.t -= dt;
    const ls = 13;
    const okMove = moveTry(m, Math.sin(m.la) * ls * dt, Math.cos(m.la) * ls * dt, true);
    if (!m.hitDone && dist2(m.x, m.z, pl.x, pl.z) < 1.1 && pl.y < 1) { m.hitDone = true; hurtPlayer(m.dmg, m); }
    if (m.t <= 0 || !okMove) { m.state = 'recover'; m.t = .7; m.cd = m.T.cd; }
  } else if (m.state === 'flee') {
    m.t -= dt; const a = angTo(pl.x, pl.z, m.x, m.z); m.face = a;
    moveTry(m, Math.sin(a) * spd * 1.1 * dt, Math.cos(a) * spd * 1.1 * dt, true); m.walk += dt * 8;
    if (m.t <= 0) m.state = 'chase';
  } else if (m.state === 'recover') {
    m.t -= dt; if (m.t <= 0) m.state = 'chase';
  }
  syncMonster(m, dt);
}
function monsterAttack(m) {
  m.cd = m.T.cd;
  if (m.T.ranged) {
    const a = angTo(m.x, m.z, pl.x, pl.z);
    spawnProj({ x: m.x, z: m.z, y: 1.3, vx: Math.sin(a) * 8, vz: Math.cos(a) * 8, life: 2, r: .5, from: 'enemy', dmg: m.dmg, kind: m.T.proj || 'memo' });
    m.state = 'chase'; sfx('memo', m.x, m.z); return;
  }
  if (m.T.slam) { addTele(m.x, m.z, 2.7, .9, m.dmg, true); m.state = 'recover'; m.t = 1.3; bubble(m, pick(m.T.lines), true, 1.4); return; }
  if (m.T.dash) { m.state = 'lunge'; m.t = .38; m.hitDone = false; checkPerfect(m.x, m.z, 3); return; }
  // ближній удар
  const d = dist2(m.x, m.z, pl.x, pl.z), ad = Math.abs(angDiff(angTo(m.x, m.z, pl.x, pl.z), m.la));
  checkPerfect(m.x, m.z, m.T.rng + 1);
  if (d < m.T.rng + .35 && ad < 1.2 && pl.y < 1 && pl.iframes <= 0) { hurtPlayer(m.dmg, m); if (m.T.thief) steal(m); }
  swingFX(m.x, m.z, m.la, m.T.rng + .2, 100, '#FF8A9A');
  m.state = 'recover'; m.t = .5;
}
function syncMonster(m, dt) {
  const p = m.parts;
  updWant(m);
  p.root.position.set(m.x, m.y, m.z);
  p.root.rotation.y = lerpAng(p.root.rotation.y, m.face, Math.min(1, dt * 10));
  const sw = Math.sin(m.walk) * .55;
  if (p.hound) { p.legs[0].rotation.x = sw; p.legs[3].rotation.x = sw; p.legs[1].rotation.x = -sw; p.legs[2].rotation.x = -sw; }
  else { p.l1.rotation.x = sw; p.l2.rotation.x = -sw; p.aL.rotation.x = -sw * .6; }
  if (!p.hound && !m.calm) { p.body.rotation.x = .18; p.aR.rotation.x = m.state === 'windup' ? -2.2 : -sw * .6; }
  if (m.calm) { p.body.rotation.x = 0; if (!p.hound) p.aR.rotation.x = -1.1; p.body.position.y = Math.abs(Math.sin(gameTime * 2 + m.walk)) * .05; }
  // спалах перед атакою
  const flash = m.state === 'windup' && Math.floor(m.t * 14) % 2 === 0;
  p.body.scale.setScalar(flash ? 1.08 : 1);
  if (m.stun > 0 && !m.calm) p.body.rotation.z = Math.sin(gameTime * 20) * .15; else p.body.rotation.z = 0;
  updMonsterFlash(m, dt);
  if (m.bar && m.bar.visible) {
    m.bar.position.set(m.x, m.bh + .2, m.z); m.bar.quaternion.copy(camera.quaternion);
    m.fill.scale.x = Math.max(.001, m.stress / m.max);
    m.fill.material = m.stress <= m.max * .25 + .01 ? basic('#8FD9C0') : basic('#FF8A7A');
  }
}
function lerpAng(a, b, t) { return a + angDiff(b, a) * t; }

let spawnTick = 0;
function updSpawns(dt) {
  spawnTick -= dt; if (spawnTick > 0) return; spawnTick = 6;
  for (const s of ISL) {
    if (!s.spawn) continue;
    for (const [type, cnt] of s.spawn) {
      const n = MON.filter(m => m.isl === s && m.type === type && !m.calm && m.state !== 'fall').length;
      const hv = healOf(s.id); const eff = hv >= 100 ? Math.max(1, Math.round(cnt * .35)) : Math.max(1, Math.round(cnt * (1 - .45 * hv / 100)));
      if (n < eff && dist2(pl.x, pl.z, s.x, s.z) > 6) { spawnMonster(type, s); break; }
    }
  }
}
const HUB_SPOTS = [[-3.2, 5.2], [-2.2, 3.4], [3.4, 5.7], [4.4, 3.9], [6.4, 2.3], [7.4, .4], [-1, 9], [.2, 9], [-6, -5.2], [-7, -6.6]];
const CROWD = [];
function addHubCrowd(silent) {
  if (CROWD.length >= HUB_SPOTS.length) return;
  const [x, z] = HUB_SPOTS[CROWD.length];
  const h = buildOffice('#F0CBAA', pick(['#BFE8D5', '#FFD9C2', '#D9CCF5', '#FFE8A8']));
  h.root.position.set(x, 0, z); h.root.rotation.y = angTo(x, z, 0, 0) + rand(-.6, .6);
  const cup = mesh(G.cup, '#FFFFFF'); cup.rotation.x = -Math.PI / 2; cup.position.set(0, .05, .1); h.hand.add(cup); h.aR.rotation.x = -1.1;
  scene.add(h.root);
  CROWD.push({ h, x, z, ph: Math.random() * 6, bh: 2.3, y: 0, dead: false });
  if (!silent) { P.hubCrowd = Math.max(P.hubCrowd, CROWD.length); }
}

/* ---------- Предмети оточення ---------- */
function damageProp(p, dmg, how) {
  if (!p.alive) return;
  p.hp -= dmg * (hasSk('x2') ? 2 : 1);
  p.mesh.rotation.z = (Math.random() - .5) * .2;
  if (p.hp <= 0) breakProp(p);
}
function breakProp(p) {
  p.alive = false; p.mesh.visible = false; p.t = 45;
  const col = { crate: '#D6A87B', cooler: '#9FD8F5', printer: '#FFFFFF', plant: '#7CCBA2', chairP: '#6E5E96', vending: '#E8607E' }[p.type] || BIOME_PROP_COL[p.type] || '#FFFFFF';
  burst(p.x, .6, p.z, col, 14, 4, .8, 4);
  sfx('break', p.x, p.z); shake = Math.max(shake, .2);
  questEvent('break');
  const big = hasSk('x3') ? 1.5 : 1;
  if (p.type === 'printer') {
    const R = 3.2 * big; ringFX(p.x, p.z, R, '#FFE8D6', .5); burst(p.x, 1, p.z, '#FFFFFF', 20, 6, 1.2, 5); sfx('boom', p.x, p.z);
    for (const m of MON) {
      if (m.calm || m.state === 'fall') continue;
      const d = dist2(m.x, m.z, p.x, p.z);
      if (d < R) { const a = angTo(p.x, p.z, m.x, m.z); applyHit(m, 15, Math.sin(a) * 12, Math.cos(a) * 12); m.stun = Math.max(m.stun, 1.2); }
    }
    for (const o of PROPS) if (o !== p && o.alive && dist2(o.x, o.z, p.x, p.z) < R * .8) setTimeout(() => damageProp(o, 10, 'boom'), 120);
    if (dist2(pl.x, pl.z, p.x, p.z) < 2) hurtPlayer(8);
    ftext(p.x, 1.8, p.z, 'БАБАХ! Звіт розлетівся', 'crit');
  }
  if (p.type === 'espmachine') funBoom(p.x, p.z, 4.2, true);
  if (p.type === 'cooler') {
    const R = 3 * big; ringFX(p.x, p.z, R, '#9FD8F5', .7); burst(p.x, .5, p.z, '#9FD8F5', 18, 4, 1, 2); sfx('splash', p.x, p.z);
    for (const m of MON) if (!m.calm && dist2(m.x, m.z, p.x, p.z) < R) { m.slow = 3; m.stun = Math.max(m.stun, .4); }
    ftext(p.x, 1.6, p.z, 'Хлюп! Підлога мокра', 'calm');
  }
  if (hasSk('x4')) for (const m of MON) if (!m.calm && dist2(m.x, m.z, p.x, p.z) < 5) applyCalm(m, 20);
  dropLoot(p.x, p.z, rollLoot('prop', 1, p.type));
}
function updProps(dt) {
  for (const p of PROPS) {
    if (p.alive) { p.mesh.rotation.z *= .85; continue; }
    p.t -= dt;
    if (p.t <= 0 && dist2(pl.x, pl.z, p.x, p.z) > 4) { p.alive = true; p.hp = p.max; p.mesh.visible = true; }
  }
}

/* ---------- Інгредієнти й скрині ---------- */
function updNodes(dt) {
  for (const n of NODES) {
    if (!n.active) { n.t -= dt; if (n.t <= 0) { n.active = true; n.mesh.visible = true; } continue; }
    n.mesh.position.y = .6 + Math.sin(gameTime * 2.5 + n.x) * .12; n.mesh.rotation.y += dt;
    if (dist2(pl.x, pl.z, n.x, n.z) < 1.2 && !pl.falling) {
      n.active = false; n.mesh.visible = false; n.t = 28;
      collect({ k: 'ing', d: n.ing }); sfx('pick'); burst(n.x, .6, n.z, ING[n.ing].c, 8, 2, .6, 2);
    }
  }
}
function chestReady(c) { if (c.temp) return !c.opened; const t = P.chests[c.id]; return !t || Date.now() - t > 5 * 60 * 1000; }
function openChest(c) {
  if (!chestReady(c)) return;
  c.opened = true; if (!c.temp) P.chests[c.id] = Date.now();
  c.lid.rotation.x = -1.9;
  burst(c.x, 1, c.z, '#FFD27A', 22, 4, 1, 5); sfx('chest');
  const loot = rollLoot('chest', c.tier);
  if (c.loot) loot.push({ k: 'item', d: makeItem(pick(c.loot), Math.max(2, rollRarity(6))) });
  if (c.recipe && !P.known[c.recipe]) learn('d', c.recipe);
  dropLoot(c.x, c.z, loot, c.y || 0);
  if (c.id === 'secret') questEvent('secret');
  addXP(15 * c.tier, c.x, c.z); save();
}
function updChests(dt) {
  for (const c of CHESTS) {
    if (c.fall) { c.fy -= dt * 30; c.mesh.position.y = Math.max(0, c.fy); if (c.fy <= 0) { c.fall = false; burst(c.x, .5, c.z, '#E8B9A6', 24, 6, 1, 4); shake = .4; sfx('break'); } }
    if (!c.temp) { const ready = chestReady(c); c.lid.rotation.x = ready ? 0 : -1.9; c.opened = !ready; }
    else if (c.opened) {
      c.rem = (c.rem == null ? 10 : c.rem) - dt;
      if (c.rem <= 0) {
        scene.remove(c.mesh); CHESTS.splice(CHESTS.indexOf(c), 1);
        const si = STATICS.findIndex(o => o.x === c.x && o.z === c.z); if (si >= 0) STATICS.splice(si, 1);
      }
    }
  }
}

/* ---------- Гравець ---------- */
function hurtPlayer(dmg, src) {
  if (pl.iframes > 0 || pl.dead || pl.jump) return;
  const real = Math.round(dmg * (1 - S.defR));
  pl.hp -= real; pl.iframes = .5; if (pl.combo) { pl.combo = 0; refreshCombo(); }
  ftext(pl.x, 2.3, pl.z, '−' + real, 'bad');
  $('#vignette').className = 'hit'; setTimeout(() => { if ($('#vignette').className === 'hit') $('#vignette').className = ''; }, 220);
  shake = Math.max(shake, .3); sfx('hurt');
  if (src && src.x != null) { const a = angTo(src.x, src.z, pl.x, pl.z); pl.kx = Math.sin(a) * 5; pl.kz = Math.cos(a) * 5; }
  if (pl.hp <= 0) die();
  refreshHUD();
}
function checkPerfect(x, z, r) {
  if (pl.dashT > 0 && dist2(pl.x, pl.z, x, z) < r) {
    slowT = hasSk('c3') ? 1.2 : .6;
    pl.st = Math.min(S.maxSt, pl.st + (hasSk('c3') ? 45 : 15));
    ftext(pl.x, 2.5, pl.z, 'Ідеальне ухиляння! Контрудар готовий', 'calm'); sfx('perfect'); pl.counterT = 1.4;
    $('#vignette').className = 'slow';
  }
}
function die() {
  pl.dead = true; paused = true;
  $('#death').hidden = false;
}
function respawn() {
  $('#death').hidden = true;
  P.coins = Math.floor(P.coins * .9);
  pl.x = 0; pl.z = 3; pl.y = 0; pl.vy = 0; pl.falling = false; pl.jump = null;
  pl.hp = S.maxHP; pl.st = S.maxSt; pl.dead = false; pl.iframes = 1.5; paused = false;
  refreshHUD(); save();
}
function dash() {
  if (pl.dead || pl.jump || pl.falling || paused) return;
  if (pl.charges <= 0 || pl.st < 18) { if (pl.st < 18) ftext(pl.x, 2.3, pl.z, 'Видихся…', 'bad'); return; }
  pl.st -= 18; pl.stDelay = .5; pl.charges--; pl.chargeT = .9;
  pl.dashT = .19 * S.dashMul; pl.iframes = Math.max(pl.iframes, .32 * Math.max(1, S.dashMul * .8));
  const mx = input.mx, mz = input.mz;
  if (Math.hypot(mx, mz) > .1) { const l = Math.hypot(mx, mz); pl.dx = mx / l; pl.dz = mz / l; }
  else { pl.dx = Math.sin(pl.face); pl.dz = Math.cos(pl.face); }
  pl.face = Math.atan2(pl.dx, pl.dz);
  burst(pl.x, .4, pl.z, '#FFF3E6', 8, 2, .4, 1); sfx('dash'); tutEvent('dash');
}
function aimFace() {
  if (!IS_TOUCH && input.aimOk) { pl.face = angTo(pl.x, pl.z, input.ax, input.az); return; }
  // авто-приціл: найближчий ворог попереду
  let best = null, bd = 9;
  for (const m of MON) {
    if (m.calm || m.state === 'fall') continue;
    const d = dist2(pl.x, pl.z, m.x, m.z);
    if (d < bd) { bd = d; best = m; }
  }
  for (const b of activeBosses()) { const d = dist2(pl.x, pl.z, b.x, b.z) - b.rad; if (d < bd) { bd = d; best = b; } }
  if (best) pl.face = angTo(pl.x, pl.z, best.x, best.z);
}
function attack() {
  if (pl.dead || paused || pl.atkCd > 0 || pl.pending || pl.jump || pl.falling) return;
  if (isWet(pl.terr)) { if (!pl.wetWarn || gameTime - pl.wetWarn > 2) { ftext(pl.x, 1.4, pl.z, 'У воді не помахаєш — кидай каву!', 'bad'); pl.wetWarn = gameTime; } return; }
  if (fishing || pl.dig) return;
  if (pl.carry) { throwCarried(); pl.atkCd = .4; return; }
  const it = eqItem('hand1'), h = handStats(it);
  const cost = 2 + h.wt * 1.4;
  if (pl.st < cost) { ftext(pl.x, 2.3, pl.z, 'Видихся…', 'bad'); pl.atkCd = .3; return; }
  pl.st -= cost; pl.stDelay = .6;
  pl.atkCd = 1 / h.spd;
  pl.chain = gameTime - (pl.lastAtk || -9) < 1 / h.spd + .45 ? ((pl.chain || 0) + 1) % 3 : 0; pl.lastAtk = gameTime;
  aimFace();
  pl.pending = { t: h.use, h, it, fin: pl.chain === 2 };
  pl.swingT = .22; pl.swingKind = pl.chain;
  if (h.style !== 'shot' && h.style !== 'cone') { const nx = pl.x + Math.sin(pl.face) * .3, nz = pl.z + Math.cos(pl.face) * .3; if (onGround(nx, nz, .5) && Math.abs(groundH(nx, nz, pl.y) - pl.y) < .1) { pl.x = nx; pl.z = nz; } }
}
function inArc(px, pz, face, tx, tz, range, arcDeg) {
  const d = dist2(px, pz, tx, tz);
  if (d > range) return false;
  if (arcDeg >= 360 || d < .5) return true;
  return Math.abs(angDiff(angTo(px, pz, tx, tz), face)) <= arcDeg * Math.PI / 360;
}
const ARC = { stab: 50, swing: 110, sweep: 160, slam: 360, steam: 360, cone: 50 };
function resolveHit(pd) {
  const h = pd.h, it = pd.it;
  let hitAny = false, anyCrit = false;
  pl.hitCount++;
  const big = pd.charged ? 2.2 : pd.fin ? 1.4 : 1;
  const kbM = (hasSk('r2') ? 1.35 : 1) * (pd.charged ? 2 : pd.fin ? 1.5 : 1);
  const counter = pl.counterT > 0; if (counter) pl.counterT = 0;
  if (h.fx === 'hook') { fireHook(h); wear(it, 1); return; }
  if (h.style === 'shot') {
    const n = pd.charged ? 3 : 1;
    for (let k = 0; k < n; k++) { const a = pl.face + (k - (n - 1) / 2) * .18; spawnProj({ x: pl.x, z: pl.z, y: 1.1, vx: Math.sin(a) * 18, vz: Math.cos(a) * 18, life: h.rng / 18, r: .45, from: 'player', dmg: h.dmg * S.dmgM * big, kb: h.kb * kbM, crit: counter ? 1 : h.crit, kind: h.fx === 'pierce' ? 'banana' : 'staple', pierce: h.fx === 'pierce' }); }
    wear(it, 1); sfx('staple'); return;
  }
  const arc = Math.min(360, (ARC[h.style] || 90) + (pd.charged ? 90 : pd.fin ? 25 : 0));
  const range = ((h.style === 'slam' || h.style === 'steam') ? h.rad + .6 : h.rng + .3) * (pd.charged ? 1.25 : 1);
  if (pd.charged) { ringFX(pl.x, pl.z, range, '#FFE27A', .45); shake = Math.max(shake, .35); }
  if (h.style === 'cone') burst(pl.x + Math.sin(pl.face) * 1.5, .9, pl.z + Math.cos(pl.face) * 1.5, '#FFFFFF', 4, 3, .4, 1);
  else if (arc >= 360) { ringFX(pl.x, pl.z, range, h.fx === 'steam' ? '#FFFFFF' : '#FFE8D6', .35); if (h.fx === 'steam') burst(pl.x, 1, pl.z, '#FFFFFF', 20, 5, .8, 3); }
  else swingFX(pl.x, pl.z, pl.face, range, arc, pd.charged ? '#FFE27A' : pd.fin ? '#FFD9C2' : '#FFF3E6');
  const targets = MON.filter(m => !m.calm && m.state !== 'fall');
  const hitOne = (m, isBoss) => {
    if (!inArc(pl.x, pl.z, pl.face, m.x, m.z, range + (isBoss ? 1 : 0), arc)) return;
    hitAny = true;
    const crit = counter || Math.random() < h.crit + S.luck * .004;
    let dmg = h.dmg * S.dmgM * (crit ? 2 : 1) * comboMul() * big; if (crit) anyCrit = true;
    if (h.fx === 'thorns' && m.stun > 0 && !isBoss) dmg *= 1.5;
    const a = angTo(pl.x, pl.z, m.x, m.z);
    const kb = h.kb * kbM * (isBoss ? .05 : 1) * (h.fx === 'pull' ? -.75 : 1);
    const real = applyHit(m, dmg, Math.sin(a) * kb, Math.cos(a) * kb, isBoss);
    if (h.fx === 'freeze' && !isBoss) freezeM(m, 1);
    if (h.fx === 'sand' && !isBoss) { m.slow = 3; burst(m.x, .6, m.z, '#E2C48E', 6, 2, .5, 1); }
    if (pd.charged && !isBoss) m.stun = Math.max(m.stun, 1.2);
    ftext(m.x, isBoss ? 4.4 : 2.1, m.z, (counter ? 'КОНТР −' : crit ? 'КРИТ −' : '−') + Math.round(real || 0), crit || (real || 0) >= 15 ? 'crit' : '');
    if (real === 0 && !isBoss) ftext(m.x, 2.6, m.z, 'Тільки кава!', 'calm');
    if (h.fx === 'foam') { m.slow = 1.5; }
    if (h.fx === 'steam') applyCalm(m, 14, isBoss);
    if (h.fx === 'splash') applyCalm(m, 8, isBoss);
    if (h.fx === 'spin') applyCalm(m, 6, isBoss);
    if (h.fx === 'golden') pl.st = Math.min(S.maxSt, pl.st + 5);
    burst(m.x, 1.2, m.z, crit ? '#FFE27A' : '#FFF3E6', crit ? 10 : 5, 3, .4, 2);
  };
  targets.forEach(m => hitOne(m, false));
  activeBosses().forEach(b => hitOne(b, true));
  if (hitWeakPoints(range, arc, h.dmg * S.dmgM * big)) hitAny = true;
  for (const p of PROPS) if (p.alive && inArc(pl.x, pl.z, pl.face, p.x, p.z, range + p.r, arc)) { damageProp(p, h.dmg * S.dmgM, 'hit'); hitAny = true; }
  if (funMelee(range, arc, h, kbM)) hitAny = true;
  if (hitAny) {
    addCombo(); hitStop(pd.charged ? .11 : pd.fin || anyCrit ? .07 : .035);
    if (pd.fin || pd.charged) sfx('finisher');
    wear(it, h.fx === 'drill' ? 2 : 1); sfx(anyCrit ? 'crit' : 'hit'); shake = Math.max(shake, .08 + h.kb * .006);
    if (hasSk('r4') && pl.hitCount % 5 === 0) shockwave(3, 9, 'Ударна хвиля!');
    if (h.fx === 'monday' && Math.random() < .25) shockwave(3.6, 13, 'ПОНЕДІЛОК!');
    if (h.fx === 'espresso' && pl.hitCount % 12 === 0) { pl.buffs.speed = 3; ftext(pl.x, 2.5, pl.z, 'Еспресо-ривок!', 'gold'); }
  } else sfx('whoosh');
}
function shockwave(R, kb, label) {
  ringFX(pl.x, pl.z, R, '#FFE066', .5); ftext(pl.x, 2.6, pl.z, label, 'crit'); shake = .35;
  for (const m of MON) {
    if (m.calm || m.state === 'fall') continue;
    const d = dist2(pl.x, pl.z, m.x, m.z);
    if (d < R) { const a = angTo(pl.x, pl.z, m.x, m.z); applyHit(m, 6, Math.sin(a) * kb, Math.cos(a) * kb); m.stun = Math.max(m.stun, 1); }
  }
  for (const p of PROPS) if (p.alive && dist2(pl.x, pl.z, p.x, p.z) < R) damageProp(p, 8, 'wave');
}
function wear(it, n) {
  if (!it || it.broken) return;
  if (hasSk('s2') && Math.random() < .4) return;
  it.dur -= n;
  if (it.dur <= 0) {
    it.dur = 0; it.broken = true;
    toast(`💥 <b>${BASE[it.b].n}</b> зламалася! Тепер це «${itemName(it)}» — можна полагодити на верстаку або пустити на крафт.`);
    sfx('break'); onGearChanged();
  }
  refreshWeapon();
}
function swapHands() {
  const a = P.eq.hand1; P.eq.hand1 = P.eq.hand2; P.eq.hand2 = a;
  onGearChanged(); sfx('equip');
  const it = eqItem('hand1'); ftext(pl.x, 2.4, pl.z, it ? BASE[it.b].ic + ' ' + itemName(it) : '✊ Кулаки');
}

/* ---------- Напої ---------- */
function knownDrinks() { return DRINK_ORDER.filter(d => P.known[d]); }
function useDrink() {
  if (pl.dead || paused || pl.jump || pl.falling) return;
  const id = selDrink, D = DRINK[id];
  if (!P.drinks[id]) {
    const alt = knownDrinks().find(d => P.drinks[d] && !DRINK[d].self);
    if (alt && !D.self) { selDrink = alt; refreshHUD(); return useDrink(); }
    ftext(pl.x, 2.4, pl.z, 'Нема «' + D.n + '». Звари на барі!', 'bad'); return;
  }
  if (D.self) {
    P.drinks[id]--;
    if (D.self === 'speed') { pl.buffs.speed = 8; ftext(pl.x, 2.4, pl.z, '+40% швидкості', 'gold'); }
    if (D.self === 'jamaica') funJamaica();
    if (D.self === 'heal') { const h = Math.round(45 * S.effM); pl.hp = Math.min(S.maxHP, pl.hp + h); ftext(pl.x, 2.4, pl.z, '+' + h + ' ❤', 'calm'); }
    burst(pl.x, 1.5, pl.z, '#C2F7E3', 10, 2, .6, 2); sfx('drink'); refreshHUD(); return;
  }
  // з рук у руки
  let near = null, nd = 1.9;
  for (const m of MON) { if (m.calm || m.state === 'fall') continue; const d = dist2(pl.x, pl.z, m.x, m.z); if (d < nd) { nd = d; near = m; } }
  const nearBoss = activeBosses().find(b => dist2(pl.x, pl.z, b.x, b.z) < 2 + b.rad);
  P.drinks[id]--;
  const artM = useArt(id);
  if (nearBoss) {
    pl.face = angTo(pl.x, pl.z, nearBoss.x, nearBoss.z);
    const mul = bossDrinkMul(nearBoss, D, id);
    applyCalm(nearBoss, D.calm * mul * artM, true, true);
    ftext(nearBoss.x, 5, nearBoss.z, mul >= 1 ? 'П’є! З рук у руки!' : nearBoss === BOSS ? 'Йому мало. Тільки раф!' : 'Не той напій…', mul >= 1 ? 'big' : 'bad');
  } else if (near) {
    pl.face = angTo(pl.x, pl.z, near.x, near.z);
    ftext(near.x, 2.8, near.z, 'З рук у руки!', 'gold');
    applyCalm(near, D.calm * artM, false, true, id); if (D.freeze) freezeM(near, 2); if (D.chill) chillMonster(near);
    if (D.aoe || hasSk('b4')) splash(near.x, near.z, D, near);
  } else {
    aimFace();
    spawnProj({ x: pl.x, z: pl.z, y: 1.2, vx: Math.sin(pl.face) * 15, vz: Math.cos(pl.face) * 15, life: .75, r: .7, from: 'player', kind: 'cup', drink: id, art: artM });
  }
  pl.swingT = .2; sfx('throw'); refreshHUD();
}
function splash(x, z, D, except) {
  const R = (D.aoe || 2.5) * (hasSk('x3') ? 1.5 : 1);
  ringFX(x, z, R, '#C2F7E3', .5); burst(x, .6, z, '#FFE8D6', 12, 4, .6, 2);
  const did = Object.keys(DRINK).find(k => DRINK[k] === D);
  for (const m of MON) if (m !== except && !m.calm && m.state !== 'fall' && dist2(x, z, m.x, m.z) < R) applyCalm(m, D.calm * .6, false, false, did);
  for (const b of activeBosses()) if (dist2(x, z, b.x, b.z) < R + b.rad) applyCalm(b, D.calm * .6 * bossDrinkMul(b, D, did), true);
}
function nearBar() { return BARS.some(b => dist2(pl.x, pl.z, b.x, b.z) < 3.3); }
function brewWhere() { if (nearBar()) return 'bar'; if (eqItem('gear')) return 'port'; return null; }
function canAfford(need) { for (const k in need) if ((P.ing[k] || 0) < need[k]) return false; return true; }
function startBrew(id, q = -1) {
  const D = DRINK[id];
  if (P.brew) { toast('Щось уже вариться — дочекайся.'); return; }
  const w = brewWhere();
  if (!w) { toast('Варити можна біля бару або з кавовим обладнанням у спецслоті.'); return; }
  if (D.barOnly && w !== 'bar') { toast(`«${D.n}» вариться тільки на барі.`); return; }
  if (!canAfford(D.need)) { toast('Бракує інгредієнтів.'); return; }
  for (const k in D.need) P.ing[k] -= D.need[k];
  const total = D.t * S.brewM * (w === 'port' ? 1.6 : 1);
  P.brew = { id, t: 0, total, q };
  sfx('brew'); refreshHUD(); renderPanel();
}
function updBrew(dt) {
  if (!P.brew) return;
  P.brew.t += dt;
  if (P.brew.t >= P.brew.total) {
    const id = P.brew.id, q = P.brew.q; let n = 1;
    if (q >= 2) { P.art[id] = (P.art[id] || 0) + (q === 3 ? 2 : 1); }
    if (q === 3) n++;
    if (hasSk('b3') && Math.random() < .25) n++;
    if (S.fx.has('double') && Math.random() < .2) n++;
    P.drinks[id] = (P.drinks[id] || 0) + n;
    P.brew = null;
    toast(`${DRINK[id].ic} Готово: <b>${DRINK[id].n}</b>${n > 1 ? ' ×' + n : ''}${q >= 2 ? ` · латте-арт ${'★'.repeat(q)}: наступні ${q === 3 ? 2 : 1} напої сильніші на 30%` : ''}`);
    if (!DRINK[selDrink] || !P.drinks[selDrink]) selDrink = id;
    questEvent('brew:' + id); tutEvent('brew'); sfx('ding'); refreshHUD(); renderPanel();
  }
}

/* ---------- Снаряди й телеграфи ---------- */
function spawnProj(o) {
  let m;
  if (o.kind === 'memo') m = mesh(G.memo, glow('#FFE8D6'));
  else if (o.kind === 'cup') m = mesh(G.cup, '#FFFFFF');
  else if (o.kind === 'staple') m = mesh(G.staple, '#D5D9E4');
  else if (o.kind === 'report') m = mesh(G.paper, glow('#FF9A5B'));
  else if (o.kind === 'snow') m = mesh(new THREE.IcosahedronGeometry(.2, 0), '#FFFFFF');
  else if (o.kind === 'ink') m = mesh(new THREE.IcosahedronGeometry(.28, 0), glow('#6A3FB0'));
  else if (o.kind === 'banana') m = mesh(new THREE.TorusGeometry(.2, .07, 5, 8, Math.PI), '#FFE066');
  else if (o.kind === 'sand') m = mesh(new THREE.OctahedronGeometry(.24, 0), '#E2C48E');
  m.position.set(o.x, o.y, o.z); scene.add(m);
  o.m = m; PROJ.push(o);
}
function updProj(dt) {
  for (let i = PROJ.length - 1; i >= 0; i--) {
    const p = PROJ[i]; p.life -= dt;
    p.x += p.vx * dt; p.z += p.vz * dt;
    p.m.position.set(p.x, p.y, p.z); p.m.rotation.y += dt * 9;
    let done = p.life <= 0;
    if (p.from === 'enemy') {
      if (!done && dist2(p.x, p.z, pl.x, pl.z) < p.r + .4 && canParry(p)) {
        p.from = 'player'; p.kind = 'staple'; p.vx *= -1.4; p.vz *= -1.4; p.dmg = 10; p.kb = 7; p.crit = .2; p.life = 1.4;
        ftext(pl.x, 2.4, pl.z, 'Парирував!', 'crit'); sfx('parry'); burst(p.x, 1.2, p.z, '#FFE27A', 8, 3, .4, 2); continue;
      }
      if (!done && dist2(p.x, p.z, pl.x, pl.z) < p.r && pl.y < 1.6) {
        if (pl.dashT > 0) checkPerfect(p.x, p.z, 2);
        else { hurtPlayer(p.dmg, p); done = true; if (p.kind === 'snow' || p.kind === 'ink' || p.kind === 'sand') { pl.slowT = 2.2; ftext(pl.x, 2.8, pl.z, 'Холодний лист! Ти сповільнений', 'calm'); sfx('freeze'); } }
      }
    } else {
      const hitM = MON.find(m => !m.calm && m.state !== 'fall' && dist2(p.x, p.z, m.x, m.z) < p.r + .3);
      const hitB = activeBosses().find(b => dist2(p.x, p.z, b.x, b.z) < p.r + b.rad);
      if (p.kind === 'cup') {
        const D = DRINK[p.drink];
        if (hitB) { const mul = bossDrinkMul(hitB, D, p.drink); applyCalm(hitB, D.calm * mul * (p.art || 1), true); if (mul < 1) ftext(hitB.x, 5, hitB.z, hitB === BOSS ? 'Тільки гігантський раф!' : 'Не той напій…', 'bad'); done = true; }
        else if (hitM) { applyCalm(hitM, D.calm * (p.art || 1), false, false, p.drink); if (D.freeze) freezeM(hitM, 2); if (D.chill) chillMonster(hitM); if (D.aoe || hasSk('b4')) splash(hitM.x, hitM.z, D, hitM); done = true; }
        else if (done) { burst(p.x, .3, p.z, '#FFE8D6', 8, 2, .5, 1); if (D.aoe || hasSk('b4')) splash(p.x, p.z, D, null); }
        if (done) sfx('splash', p.x, p.z);
      } else if (p.kind === 'staple') {
        const crit = Math.random() < (p.crit || 0);
        const hm = p.pierce ? MON.find(m => !m.calm && m.state !== 'fall' && dist2(p.x, p.z, m.x, m.z) < p.r + .3 && !(p.hitSet || (p.hitSet = new Set())).has(m)) : hitM;
        if (hm) { const a = Math.atan2(p.vx, p.vz); const r = applyHit(hm, p.dmg * (crit ? 2 : 1), Math.sin(a) * p.kb, Math.cos(a) * p.kb); ftext(hm.x, 2.1, hm.z, (crit ? 'КРИТ −' : '−') + Math.round(r || 0), crit ? 'crit' : ''); addCombo(); if (p.pierce) p.hitSet.add(hm); else done = true; }
        else if (hitB && !(p.hitSet && p.hitSet.has(hitB))) { applyHit(hitB, p.dmg, 0, 0, true); if (p.pierce) (p.hitSet || (p.hitSet = new Set())).add(hitB); else done = true; }
        else { const pr = PROPS.find(q => q.alive && dist2(p.x, p.z, q.x, q.z) < q.r + .2); if (pr) { damageProp(pr, p.dmg, 'shot'); done = true; } }
      }
    }
    if (done) { scene.remove(p.m); PROJ.splice(i, 1); }
  }
}
function addTele(x, z, r, tmax, dmg, noPaper, inner = 0) {
  const ring = new THREE.Mesh(new THREE.RingGeometry(r * .92, r, 30), new THREE.MeshBasicMaterial({ color: '#FF5C7A', transparent: true, opacity: .8, side: THREE.DoubleSide, depthWrite: false }));
  const fill = new THREE.Mesh(inner ? new THREE.RingGeometry(inner, r, 30) : new THREE.CircleGeometry(r, 30), new THREE.MeshBasicMaterial({ color: '#FF8A5B', transparent: true, opacity: .35, side: THREE.DoubleSide, depthWrite: false }));
  ring.rotation.x = fill.rotation.x = -Math.PI / 2;
  ring.position.set(x, .13, z); fill.position.set(x, .12, z); fill.scale.setScalar(.01);
  scene.add(ring, fill);
  let paper = null; if (!noPaper) { paper = mesh(G.paper, glow('#FF9A5B')); paper.position.set(x, 12, z); scene.add(paper); }
  TELE.push({ x, z, r, inner, t: 0, tmax, dmg, ring, fill, paper });
}
function updTele(dt) {
  for (let i = TELE.length - 1; i >= 0; i--) {
    const t = TELE[i]; t.t += dt;
    const k = t.t / t.tmax;
    if (t.inner) t.fill.material.opacity = .15 + k * .35; else t.fill.scale.setScalar(Math.max(.01, k));
    if (t.paper) { t.paper.position.y = 12 * (1 - k) + .3; t.paper.rotation.y += dt * 8; }
    if (k >= 1) {
      burst(t.x, .5, t.z, '#FF9A5B', 16, 5, .7, 4); ringFX(t.x, t.z, t.r, '#FF9A5B', .4);
      const dpl = dist2(pl.x, pl.z, t.x, t.z);
      if (dpl < t.r && dpl >= (t.inner || 0) && pl.y < 1) { if (pl.dashT > 0) checkPerfect(t.x, t.z, t.r + 1); hurtPlayer(t.dmg, t); }
      for (const m of MON) if (!m.calm && m.state !== 'fall' && dist2(m.x, m.z, t.x, t.z) < t.r) { const a = angTo(t.x, t.z, m.x, m.z); applyHit(m, 5, Math.sin(a) * 9, Math.cos(a) * 9); }
      for (const p of PROPS) if (p.alive && dist2(p.x, p.z, t.x, t.z) < t.r + p.r) damageProp(p, 20, 'boom');
      sfx('boom', t.x, t.z); shake = Math.max(shake, .25);
      scene.remove(t.ring, t.fill); if (t.paper) scene.remove(t.paper); t.ring.geometry.dispose(); t.fill.geometry.dispose(); t.ring.material.dispose(); t.fill.material.dispose();
      TELE.splice(i, 1);
    }
  }
}

/* ---------- Бос: CEO-психопат ---------- */
function bossInit() {
  BOSS.max = Math.round(700 * (1 + .25 * (BOSS.lvl - 1)));
  BOSS.stress = BOSS.max; BOSS.calm = false; BOSS.asleep = false; BOSS.active = false;
  BOSS.x = ISLMAP.tower.x; BOSS.z = ISLMAP.tower.z; BOSS.mass = 99; BOSS.cd = 2.5; BOSS.charge = null;
  if (!BOSS.mesh) { BOSS.mesh = buildBoss(); scene.add(BOSS.mesh.root); }
  BOSS.mesh.body.rotation.x = 0; BOSS.mesh.body.position.y = 0;
  $('#bosslvl').textContent = BOSS.lvl > 1 ? '· квартал ' + BOSS.lvl : '';
}
function bossSleep() {
  if (BOSS.charge && BOSS.charge.line.parent) scene.remove(BOSS.charge.line);
  BOSS.asleep = true; BOSS.active = false; BOSS.calm = true; BOSS.stress = 0; BOSS.sleepT = 150; BOSS.charge = null;
  TELE.slice().forEach(t => { scene.remove(t.ring, t.fill, t.paper); }); TELE.length = 0;
  $('#bossbar').hidden = true;
  banner('CEO заснув на квартальному звіті. Рейд пройдено!');
  bubble(BOSS, 'Хррр… синергія… хрр…', false, 5);
  burst(BOSS.x, 3, BOSS.z, '#FFD27A', 40, 6, 1.4, 6); ringFX(BOSS.x, BOSS.z, 6, '#B9F5DE', 1);
  const loot = [{ k: 'coins', d: 120 * BOSS.lvl }, { k: 'ing', d: 'syrup', n: 2 }];
  if (!P.bossWins) loot.push({ k: 'item', d: makeItem('tumbler', 4) });
  else loot.push({ k: 'item', d: (() => { const it = Math.random() < .3 ? makeItem('tumbler', rollRarity(20) >= 5 ? 5 : 4) : randomItem(25); it.r = Math.max(it.r, 3); return it; })() });
  loot.push({ k: 'item', d: randomItem(15) });
  if (Math.random() < .5) loot.push({ k: 'cosm' });
  loot.push({ k: 'case', d: 'ceo' });
  if (Math.random() < .5) loot.push({ k: 'case', d: 'vacation' });
  dropLoot(BOSS.x, BOSS.z + 2.5, loot);
  P.bossWins++; addXP(300 * BOSS.lvl, BOSS.x, BOSS.z); addHeal('tower', 45, BOSS.x, BOSS.z);
  questEvent('boss'); sfx('level'); save();
}
function updBoss(dt) {
  const b = BOSS, h = b.mesh; if (!h) return;
  h.root.position.set(b.x, 0, b.z);
  h.reports.forEach((r, i) => { const a = gameTime * 1.5 + i * Math.PI / 2; r.position.set(Math.cos(a) * .9, 1.2 + Math.sin(gameTime * 3 + i) * .15, Math.sin(a) * .9); r.rotation.y = -a; r.visible = !b.asleep; });
  if (b.asleep) {
    h.body.rotation.x = .5; h.body.position.y = -.25;
    b.sleepT -= dt;
    if (Math.random() < dt * 1.5) ftext(b.x, 4.2, b.z, 'z', 'calm');
    if (b.sleepT <= 0 && dist2(pl.x, pl.z, b.x, b.z) > 14) { b.lvl++; bossInit(); toast('CEO прокинувся. Новий квартал — новий рейд (сильніший).'); }
    return;
  }
  h.body.rotation.x = 0; h.body.position.y = 0;
  const tw = ISLMAP.tower, onTower = dist2(pl.x, pl.z, tw.x, tw.z) < tw.r + .5 && !pl.dead;
  if (!b.active) {
    if (onTower) { b.active = true; b.offT = 0; $('#bossbar').hidden = false; $('#bossname').textContent = '💼 CEO-психопат'; bubble(b, pick(LINES_BOSS), true, 3); sfx('aggro'); banner('Рейд: CEO-психопат. Гігантський раф — єдиний шанс.'); }
    h.root.rotation.y = lerpAng(h.root.rotation.y, angTo(b.x, b.z, pl.x, pl.z), dt * 2);
    return;
  }
  if (!onTower) {
    b.offT += dt;
    if (b.offT > 4) { b.active = false; b.stress = Math.min(b.max, b.stress + b.max * .5); $('#bossbar').hidden = true; }
  } else b.offT = 0;
  if (Math.random() < dt * .08) bubble(b, pick(LINES_BOSS), true, 2.5);
  const phase2 = b.stress < b.max * .5;
  const d = dist2(b.x, b.z, pl.x, pl.z);
  const a = angTo(b.x, b.z, pl.x, pl.z);
  if (b.charge) {
    const c = b.charge; c.t -= dt;
    if (c.t > c.go) { h.root.rotation.y = c.a; c.line.material.opacity = .25 + Math.sin(gameTime * 30) * .15; }
    else {
      if (c.line.parent) scene.remove(c.line);
      const sp = 19;
      const nx = b.x + Math.sin(c.a) * sp * dt, nz = b.z + Math.cos(c.a) * sp * dt;
      if (dist2(nx, nz, tw.x, tw.z) < tw.r - 1.5) { b.x = nx; b.z = nz; } else c.t = 0;
      if (!c.hit && dist2(b.x, b.z, pl.x, pl.z) < 1.9) { c.hit = true; if (pl.dashT > 0) checkPerfect(b.x, b.z, 3); hurtPlayer(22, b); }
      for (const p of PROPS) if (p.alive && dist2(b.x, b.z, p.x, p.z) < 1.8) damageProp(p, 50, 'boss');
      for (const m of MON) if (!m.calm && dist2(b.x, b.z, m.x, m.z) < 1.8) { m.vx += Math.sin(c.a) * 14; m.vz += Math.cos(c.a) * 14; }
    }
    if (c.t <= 0) { b.charge = null; if (c.line.parent) scene.remove(c.line); }
  } else {
    h.root.rotation.y = lerpAng(h.root.rotation.y, a, dt * 4);
    if (d > 5) { const nx = b.x + Math.sin(a) * 1.6 * dt, nz = b.z + Math.cos(a) * 1.6 * dt; if (dist2(nx, nz, tw.x, tw.z) < tw.r - 2) { b.x = nx; b.z = nz; } }
    const sw = Math.sin(gameTime * 4) * .4; h.l1.rotation.x = sw; h.l2.rotation.x = -sw;
    b.cd -= dt;
    if (b.cd <= 0) {
      const kind = b.atkI++ % 3;
      if (kind === 0) {
        const n = phase2 ? 8 : 5;
        addTele(pl.x, pl.z, 2.2, 1.3, 18);
        for (let i = 1; i < n; i++) { const aa = Math.random() * 6.28, rr = 2 + Math.random() * 5; const x = pl.x + Math.cos(aa) * rr, z = pl.z + Math.sin(aa) * rr; if (dist2(x, z, tw.x, tw.z) < tw.r) addTele(x, z, 2.2, 1.3 + Math.random() * .4, 18); }
        bubble(b, 'Палаючі звіти!', true, 1.5); sfx('warn', b.x, b.z);
      } else if (kind === 1) {
        const rings = phase2 ? 2 : 1;
        for (let r = 0; r < rings; r++) for (let i = 0; i < 14; i++) {
          const aa = i / 14 * Math.PI * 2 + r * .22;
          setTimeout(() => { if (b.active) spawnProj({ x: b.x, z: b.z, y: 1.4, vx: Math.sin(aa) * 7, vz: Math.cos(aa) * 7, life: 2.6, r: .55, from: 'enemy', dmg: 10, kind: 'memo' }); }, r * 450);
        }
        bubble(b, 'Розсилка всім!', true, 1.5); sfx('memo', b.x, b.z);
      } else {
        const line = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 14).translate(0, 7, 0), new THREE.MeshBasicMaterial({ color: '#FF5C7A', transparent: true, opacity: .3, side: THREE.DoubleSide, depthWrite: false }));
        line.rotation.x = -Math.PI / 2; const g = new THREE.Group(); g.add(line); g.position.set(b.x, .12, b.z); g.rotation.y = a; scene.add(g);
        b.charge = { a, t: 1.6, go: .7, line: g, hit: false };
        g.material = line.material;
        bubble(b, 'На нараду. Негайно.', true, 1.5); sfx('charge', b.x, b.z);
      }
      b.cd = phase2 ? 1.9 : 2.7;
    }
    if (d < 1.8) { pl.x = b.x + Math.sin(a) * 1.8; pl.z = b.z + Math.cos(a) * 1.8; }
  }
  $('#bossb').style.transform = `scaleX(${Math.max(0, b.stress / b.max)})`;
}

/* ---------- Події ---------- */
function updEvents(dt) {
  if (EV.happy > 0) { EV.happy -= dt; if (EV.happy <= 0) toast('Щаслива година скінчилася.'); }
  if (EV.reports > 0) { EV.reports -= dt; if (Math.random() < dt * 6) burst(pl.x + rand(-8, 8), 9, pl.z + rand(-8, 8), '#FFFFFF', 1, .5, 2.5, 0, 2); }
  EV.t -= dt;
  if (EV.t > 0) return;
  EV.t = rand(80, 120);
  const k = pick(['happy', 'meteor', 'reports']);
  if (k === 'happy') { EV.happy = 45; banner('☕ Щаслива година: подвійний досвід 45 секунд'); }
  if (k === 'reports') { EV.reports = 30; banner('📄 Дощ зі звітів: вороги злі й швидкі 30 секунд'); }
  if (k === 'meteor') {
    const s = ISLMAP[pick(['office', 'park', 'archive'])];
    const spot = freeSpotRT(s);
    if (!spot) return;
    const c = addChest('m' + Date.now(), spot.x, spot.z, 1.5 + Math.random(), false);
    c.temp = true; c.fall = true; c.fy = 40; c.mesh.position.y = 40;
    banner(`☄️ Шматок світу впав зі скринею на «${s.n}»`);
  }
}
function freeSpotRT(s) {
  for (let k = 0; k < 30; k++) {
    const a = Math.random() * 6.28, r = 2 + Math.random() * (s.r - 3.5);
    const x = s.x + Math.cos(a) * r, z = s.z + Math.sin(a) * r;
    if (!STATICS.some(o => dist2(x, z, o.x, o.z) < o.r + 1) && !PROPS.some(p => dist2(x, z, p.x, p.z) < 1.4)) return { x, z };
  }
  return null;
}

/* ---------- Допоміжне для нових механік ---------- */
function freezeM(m, sec) {
  if (!m || m.calm) return;
  m.stun = Math.max(m.stun, sec); m.vx *= .2; m.vz *= .2;
  burst(m.x, 1.2, m.z, '#BDE7FF', 10, 2, .6, 2); ftext(m.x, 2.6, m.z, 'Замерз!', 'calm'); sfx('freeze', m.x, m.z);
}
function steal(m) {
  const keys = Object.keys(P.ing).filter(k => P.ing[k] > 0);
  if (!keys.length) return;
  const k = pick(keys); P.ing[k]--; (m.stolen = m.stolen || []).push(k);
  ftext(m.x, 2.6, m.z, 'Вкрав ' + ING[k].ic + '!', 'bad'); sfx('steal', m.x, m.z);
  m.state = 'flee'; m.t = 3.5;
}
function canParry(p) {
  const h = eqItem('hand1');
  if (!h || h.broken || BASE[h.b].fx !== 'parry' || pl.swingT < -.18) return false;
  return Math.abs(angDiff(angTo(pl.x, pl.z, p.x, p.z), pl.face)) < 1.3;
}

function useArt(id) {
  if (!P.art[id] || DRINK[id].self) return 1;
  P.art[id]--; ftext(pl.x, 2.9, pl.z, 'Латте-арт! ♥', 'gold'); burst(pl.x, 1.6, pl.z, '#FFB3C7', 8, 2, .6, 2);
  return 1.3;
}
