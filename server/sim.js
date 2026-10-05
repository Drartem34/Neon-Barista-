/* =====================================================================
   СЕРВЕР СВІТУ (авторитетна симуляція).
   Виконується в Node (server/world.js) разом з усім кодом гри, але без графіки.
   Тут живуть моби, боси, візки, баки, ящики, снаряди, вентилятори.
   Гравці надсилають лише дії (удар, кидок, підняти, сісти у візок…),
   а сервер 10 разів на секунду розсилає кожному стан світу навколо нього.
   Досвід, лут і квести — особисті: сервер повідомляє гравцю, що він заслужив.
   ===================================================================== */
const SIM = { players: new Map(), actor: null, target: null, fx: [], nid: 0, pid: 0, snapT: 0, statT: 0, plT: 0, lvl: 1 };
const SNAP_R = 48;
const r1 = v => Math.round(v * 10) / 10, r2 = v => Math.round(v * 100) / 100;
function simOut(to, m) { window.__SIM_OUT(to, m); }

/* ---------- Гравці ---------- */
function simPlayers() { return [...SIM.players.values()].filter(p => p.x != null); }
function alivePlayers() { return simPlayers().filter(p => !p.dead); }
function nearestPlayer(x, z, maxD = 1e9, filter) {
  let best = null, bd = maxD;
  for (const p of alivePlayers()) { if (filter && !filter(p)) continue; const d = dist2(p.x, p.z, x, z); if (d < bd) { bd = d; best = p; } }
  return best;
}
function loadPl(p) {
  SIM.target = p ? p.id : null;
  if (!p) { pl.x = 9999; pl.z = 9999; pl.y = 0; pl.dead = true; pl.falling = false; pl.jump = null; pl.iframes = 0; pl.dashT = 0; return; }
  pl.x = p.x; pl.z = p.z; pl.y = p.y || 0; pl.face = p.face || 0; pl.dead = !!p.dead; pl.falling = false; pl.jump = null; pl.iframes = 0; pl.dashT = 0;
}
const park = () => loadPl(null);

/* ---------- Ефекти: усе, що «показується», збираємо й розсилаємо ---------- */
function fx(e) { SIM.fx.push(e); }
function entRef(ent) {
  if (!ent) return null;
  if (ent === BOSS) return 'B';
  if (ent.isMini) return 'b' + ent.id;
  if (ent.nid != null && MON.includes(ent)) return 'm' + ent.nid;
  return null;
}
ftext = (x, y, z, txt, cls) => fx(['t', r1(x), r1(y), r1(z), String(txt), cls || '']);
burst = (x, y, z, color, n = 8, spd = 4, life = .7, up = 3, size = 1) => fx(['b', r1(x), r1(y), r1(z), color, n | 0, spd, life, up, size]);
ringFX = (x, z, r, color, life = .4) => fx(['r', r1(x), r1(z), r1(r), color, life]);
bubble = (ent, txt, mad, life = 2.8) => { const id = entRef(ent); if (id) fx(['u', id, String(txt), mad ? 1 : 0, life]); };
sfx = (name, x, z) => fx(['s', name, x == null ? null : r1(x), z == null ? null : r1(z)]);
swingFX = (x, z, face, range, arc, color) => fx(['w', r1(x), r1(z), r2(face), r1(range), arc, color]);
banner = txt => fx(['n', String(txt)]);
toast = html => fx(['o', String(html)]);
warnArc = m => { if (m.nid != null) fx(['a', m.nid, r2(m.la || 0)]); };
hitStop = () => { }; refreshHUD = () => { }; refreshQuest = () => { }; save = () => { }; showZone = () => { }; tutEvent = () => { }; renderPanel = () => { };
showBossBar = () => { }; checkPerfect = () => { };
const _addTele = addTele;
addTele = (x, z, r, tmax, dmg, noPaper, inner = 0) => { _addTele(x, z, r, tmax, dmg, noPaper, inner); fx(['e', r1(x), r1(z), r1(r), tmax, noPaper ? 1 : 0, inner]); };

/* ---------- Кому зарахувати (досвід, лут, квести) ---------- */
function actorsAt(x, z) {
  if (SIM.actor != null) return [].concat(SIM.actor);
  const p = x != null ? nearestPlayer(x, z, 30) : null;
  return p ? [p.id] : [];
}
function toActors(x, z, m) { for (const id of actorsAt(x, z)) simOut(id, Object.assign({ t: 'w' }, m)); }
addXP = (n, x, z) => toActors(x, z, { k: 'xp', n: Math.round(n), x: x == null ? null : r1(x), z: z == null ? null : r1(z) });
dropLoot = (x, z, list, y = 0) => toActors(x, z, { k: 'loot', x: r1(x), z: r1(z), y, list });
questEvent = ev => toActors(null, null, { k: 'quest', ev });
addHeal = (id, amt, x, z) => toActors(x, z, { k: 'heal', id, amt, x: x == null ? null : r1(x), z: z == null ? null : r1(z) });
addHubCrowd = () => toActors(null, null, { k: 'crowd' });

/* Удари по гравцях */
hurtPlayer = (dmg, src) => { if (SIM.target == null) return; simOut(SIM.target, { t: 'w', k: 'hurt', d: Math.round(dmg), x: src && src.x != null ? r1(src.x) : null, z: src && src.z != null ? r1(src.z) : null }); };
steal = m => {
  if (SIM.target == null) return;
  simOut(SIM.target, { t: 'w', k: 'steal', x: r1(m.x), z: r1(m.z) });
  (m.stolen = m.stolen || []).push(pick(['beans', 'milk', 'syrup']));
  m.state = 'flee'; m.t = 3.5;
};
remotesNear = (x, z, r) => alivePlayers().filter(p => p.id !== SIM.target && p.id !== SIM.actor && dist2(p.x, p.z, x, z) < r);
netSend = o => {
  if (o.t === 'hit' && o.to != null) simOut(o.to, { t: 'hit', from: -1, name: o.name || 'Світ', k: o.k, a: o.a, f: o.f, d: o.d, x: o.x, z: o.z });
  else if (o.t === 'wfx') simOut('*', { t: 'wfx', from: -1, name: '', k: o.k, x: o.x, z: o.z, i: o.i });
  else if (o.t === 'ax') simOut('*', { t: 'ax', from: -1, name: 'Світ', a: o.a, d: o.d });   // аддони на сервері говорять з усіма
};

/* ---------- Моби: ідентифікатори й зарахування ---------- */
const _spawnMonster = spawnMonster;
spawnMonster = (...a) => { const m = _spawnMonster(...a); if (m) m.nid = ++SIM.nid; return m; };
const _applyHit = applyHit;
applyHit = (m, ...a) => { const by = SIM.actor != null ? SIM.actor : curProjOwner; if (by != null && !Array.isArray(by)) m.lastBy = by; return _applyHit(m, ...a); };
const _applyCalm = applyCalm;
applyCalm = (m, ...a) => { const by = SIM.actor != null ? SIM.actor : curProjOwner; if (by != null && !Array.isArray(by)) m.lastBy = by; return _applyCalm(m, ...a); };
const _calmMonster = calmMonster;
calmMonster = m => {
  const prev = SIM.actor;
  SIM.actor = m.lastBy != null && SIM.players.has(m.lastBy) ? m.lastBy : (nearestPlayer(m.x, m.z, 30) || {}).id;
  if (SIM.actor == null) SIM.actor = prev;
  try { _calmMonster(m); } finally { SIM.actor = prev; }
};
const _damageProp = damageProp;
damageProp = (p, ...a) => { const by = SIM.actor != null ? SIM.actor : curProjOwner; if (by != null && !Array.isArray(by)) p.lastBy = by; return _damageProp(p, ...a); };
const _breakProp = breakProp;
breakProp = p => {
  const prev = SIM.actor;
  if (SIM.actor == null && p.lastBy != null && SIM.players.has(p.lastBy)) SIM.actor = p.lastBy;
  try { _breakProp(p); } finally { SIM.actor = prev; }
};

/* ---------- Боси: нагороди всім, хто був на арені ---------- */
bossSleep = function () {
  if (BOSS.charge && BOSS.charge.line && BOSS.charge.line.parent) scene.remove(BOSS.charge.line);
  BOSS.asleep = true; BOSS.active = false; BOSS.calm = true; BOSS.stress = 0; BOSS.sleepT = 150; BOSS.charge = null;
  TELE.slice().forEach(t => scene.remove(t.ring, t.fill, t.paper)); TELE.length = 0;
  banner('CEO заснув на квартальному звіті. Рейд пройдено!');
  bubble(BOSS, 'Хррр… синергія… хрр…', false, 5);
  burst(BOSS.x, 3, BOSS.z, '#FFD27A', 40, 6, 1.4, 6); ringFX(BOSS.x, BOSS.z, 6, '#B9F5DE', 1);
  const tw = ISLMAP.tower;
  for (const p of alivePlayers()) if (dist2(p.x, p.z, tw.x, tw.z) < tw.r + 4) simOut(p.id, { t: 'w', k: 'bossWin', lvl: BOSS.lvl });
};
const _bossInit = bossInit;
bossInit = () => { _bossInit(); fx(['o', BOSS.lvl > 1 ? 'CEO прокинувся. Новий квартал — новий рейд (сильніший).' : '']); };
for (const id in MBS) MBS[id].onCalm = () => simMbCalm(MBS[id]);
function simMbCalm(b) {
  b.asleep = true; b.active = false; b.calm = true; b.stress = 0; b.sleepT = 420; b.weak.forEach(w => scene.remove(w.m)); b.weak = [];
  if (b.charge && b.charge.g) scene.remove(b.charge.g); b.charge = null; b.leap = null;
  banner(`${b.def.ic} ${b.def.n} заспокоївся. Міні-бос пройдено!`);
  bubble(b, 'Хм… а я ж колись любив свою роботу…', false, 5);
  burst(b.x, 3, b.z, '#FFD27A', 40, 6, 1.4, 6); sfx('level');
  for (const p of alivePlayers()) if (dist2(p.x, p.z, b.hx, b.hz) < b.def.arena + 8) simOut(p.id, { t: 'w', k: 'mbWin', id: b.id, lvl: b.lvl });
}

/* ---------- Події світу ---------- */
function simEvents(dt) {
  if (EV.happy > 0) EV.happy -= dt;
  if (EV.reports > 0) EV.reports -= dt;
  EV.t -= dt; if (EV.t > 0) return;
  EV.t = rand(80, 120);
  const k = pick(['happy', 'meteor', 'reports']);
  if (k === 'happy') { EV.happy = 45; banner('☕ Щаслива година: подвійний досвід 45 секунд'); }
  if (k === 'reports') { EV.reports = 30; banner('📄 Дощ зі звітів: вороги злі й швидкі 30 секунд'); }
  if (k === 'meteor') {
    const s = ISLMAP[pick(['office', 'park', 'archive'])], spot = freeSpotRT(s); if (!spot) return;
    simOut('*', { t: 'w', k: 'meteor', x: r1(spot.x), z: r1(spot.z), tier: r1(1.5 + Math.random()), id: 'm' + Date.now() });
    banner(`☄️ Шматок світу впав зі скринею на «${s.n}»`);
  }
}

/* ---------- Що гравці тримають і на чому їдуть ---------- */
function carriedBy(id) {
  for (const m of MON) if (m.carrier === id) return ['mon', m];
  for (const b of BODIES) if (b.carrier === id) return ['body', b];
  for (const p of PROPS) if (p.carrier === id) return ['prop', p];
  return null;
}
function releaseOf(id, throwIt, face) {
  const c = carriedBy(id), p = SIM.players.get(id); if (!c || !p) return;
  const [k, o] = c; o.carrier = null;
  loadPl(p); SIM.actor = id;
  pl.carry = o; pl.carryK = k; pl.face = face != null ? face : (p.face || 0);
  input.aimOk = true; input.ax = pl.x + Math.sin(pl.face) * 5; input.az = pl.z + Math.cos(pl.face) * 5;
  releaseCarry(!!throwIt);
  if (k === 'mon' && throwIt) o.lastBy = id;
  if (k === 'prop' && throwIt) o.lastBy = id;
  pl.carry = null; input.aimOk = false; SIM.actor = null; park();
}
function updCarried() {
  for (const p of simPlayers()) {
    const c = carriedBy(p.id); if (!c) continue;
    if (p.dead) { releaseOf(p.id, false); continue; }
    const [k, o] = c, y = (p.y || 0) + 1.9;
    if (k === 'mon') { o.carried = true; o.x = p.x; o.z = p.z; o.y = y; o.vx = o.vz = 0; if (!o.calm) o.stun = 1; }
    if (k === 'body') { o.held = true; o.x = p.x; o.z = p.z; o.y = y - .3; o.vx = o.vz = 0; }
    if (k === 'prop') { o.held = true; o.alive = false; o.t = 1e9; o.x = p.x; o.z = p.z; o.mesh.position.set(p.x, y - .3, p.z); }
  }
  for (const b of BODIES) if (b.owner != null) { b.ownT -= .033; if (b.ownT <= 0 || !SIM.players.has(b.owner)) { b.owner = null; b.held = false; } }
}

/* ---------- Дії гравців ---------- */
const PROJ_KINDS = new Set(['cup', 'staple', 'banana']);
function num(v, lo, hi, d = 0) { v = +v; return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d; }
/* Поки команда «підняти» летить до сервера, оглушення могло щойно скінчитись — даємо запас 0,8 с. */
function canCarryNet(m) { return canCarry(m) || (m.state !== 'fall' && !m.T.dummy && !m.carried && !m.dead && (m.mass || 1) <= 2.3 && gameTime - (m.stunAt || -9) < .8); }
function monById(id) { return MON.find(m => m.nid === id); }
function bossByKey(k) { return k === 'ceo' ? BOSS : MBS[k]; }
function simIntent(id, m) {
  const p = SIM.players.get(id); if (!p || !m) return;
  SIM.actor = id; loadPl(p);
  try {
    if (m.k === 'mh') {
      const t = monById(m.id); if (!t || t.state === 'fall' || dist2(t.x, t.z, p.x, p.z) > 16) return;
      if (m.dmg || m.kx || m.kz) applyHit(t, num(m.dmg, 0, 300), num(m.kx, -60, 60), num(m.kz, -60, 60));
      if (m.stun) t.stun = Math.max(t.stun, num(m.stun, 0, 4));
      if (m.slow) t.slow = Math.max(t.slow || 0, num(m.slow, 0, 6));
      if (m.freeze) freezeM(t, num(m.freeze, 0, 4));
      if (m.calm) applyCalm(t, num(m.calm, 0, 2000), false, !!m.handed, typeof m.drink === 'string' ? m.drink : undefined);
      if (m.chill) chillMonster(t);
      if (m.pin) { t.pinT = Math.max(t.pinT || 0, num(m.pin, 0, 4)); t.stun = Math.max(t.stun, t.pinT); }
    } else if (m.k === 'bh') {
      const b = bossByKey(m.b); if (!b || !b.active || b.asleep) return;
      if (m.dmg) applyHit(b, num(m.dmg, 0, 400), 0, 0, true);
      if (m.calm) applyCalm(b, num(m.calm, 0, 5000), true, !!m.handed);
    } else if (m.k === 'ph') {
      const pr = PROPS[m.i | 0]; if (pr && pr.alive) damageProp(pr, num(m.dmg, 0, 200), 'hit');
    } else if (m.k === 'bk') {
      const b = BODIES[m.i | 0]; if (!b || b.fall || b.held) return;
      b.vx += num(m.vx, -40, 40); b.vz += num(m.vz, -40, 40); b.spin = 8;
    } else if (m.k === 'proj') {
      const o = m.o || {}; if (!PROJ_KINDS.has(o.kind)) return;
      if (o.kind === 'cup' && !DRINK[o.drink]) return;
      spawnProj({ x: p.x, z: p.z, y: num(o.y, 0, 5, 1.2), vx: num(o.vx, -30, 30), vz: num(o.vz, -30, 30), life: num(o.life, 0, 3, 1), r: num(o.r, .2, 1.5, .5), from: 'player', owner: id,
        dmg: num(o.dmg, 0, 200), kb: num(o.kb, 0, 40), crit: num(o.crit, 0, 1), kind: o.kind, pierce: !!o.pierce, drink: o.drink, art: num(o.art, 0, 10, 1), nail: num(o.nail, 0, 4) });
    } else if (m.k === 'hook') {
      pl.face = num(m.face, -10, 10); input.aimOk = true; input.ax = pl.x + Math.sin(pl.face) * 5; input.az = pl.z + Math.cos(pl.face) * 5;
      fireHook({ rng: num(m.rng, 1, 14, 10) }); HOOKS[HOOKS.length - 1].owner = id; input.aimOk = false;
    } else if (m.k === 'carry') {
      if (carriedBy(id)) return;
      const ok = o => { simOut(id, { t: 'w', k: 'carryOk' }); return o; };
      if (m.kind === 'mon') { const t = monById(m.id); if (t && canCarryNet(t) && t.carrier == null && dist2(t.x, t.z, p.x, p.z) < 3.5) { ok(t).carrier = id; t.carried = true; if (!t.calm) t.state = 'chase'; t.vx = t.vz = 0; return; } }
      if (m.kind === 'body') { const b = BODIES[m.id | 0]; if (b && !b.fall && !b.held && b.carrier == null && dist2(b.x, b.z, p.x, p.z) < 3.5) { ok(b).carrier = id; b.held = true; return; } }
      if (m.kind === 'prop') { const q = PROPS[m.id | 0]; if (q && q.alive && !q.held && !q.fly && q.carrier == null && dist2(q.x, q.z, p.x, p.z) < 3.5) { ok(q).carrier = id; q.held = true; q.alive = false; q.t = 1e9; return; } }
      simOut(id, { t: 'w', k: 'carryFail' });
    } else if (m.k === 'throw' || m.k === 'drop') {
      releaseOf(id, m.k === 'throw', num(m.face, -10, 10, p.face));
    } else if (m.k === 'ride' || m.k === 'rideUpd') {
      const b = BODIES[m.i | 0]; if (!b || !b.ride || b.fall || (b.owner != null && b.owner !== id) || b.carrier != null) return;
      b.owner = id; b.ownT = .6; b.held = true;
      if (m.k === 'rideUpd') { b.x = num(m.x, -500, 500); b.z = num(m.z, -500, 500); b.vx = num(m.vx, -20, 20); b.vz = num(m.vz, -20, 20); b.face = num(m.f, -10, 10); b.m.rotation.y = b.face; }
    } else if (m.k === 'unride') {
      const b = BODIES[m.i | 0]; if (!b || b.owner !== id) return;
      b.owner = null; b.held = false; b.vx = num(m.vx, -20, 20); b.vz = num(m.vz, -20, 20);
      if (m.fall) { b.fall = true; b.vy = 2; b.respT = 4; }
    } else if (m.k === 'fan') {
      const f = FANS[m.i | 0]; if (f && f.on <= 0) switchFan(f, true);
    }
  } finally { SIM.actor = null; park(); }
}

/* ---------- Удари снарядів і вибухів по гравцях ---------- */
function projVsPlayers() {
  for (const p of PROJ) {
    if (p.life <= 0) continue;
    if (p.from === 'enemy') {
      const t = alivePlayers().find(q => dist2(q.x, q.z, p.x, p.z) < p.r && (q.y || 0) < 1.6);
      if (!t) continue;
      simOut(t.id, { t: 'w', k: 'hurt', d: Math.round(p.dmg), x: r1(p.x), z: r1(p.z), slow: p.kind === 'snow' || p.kind === 'ink' || p.kind === 'sand' ? 1 : 0 });
      p.life = 0;
    } else if (p.owner != null) {
      const t = alivePlayers().find(q => q.id !== p.owner && dist2(q.x, q.z, p.x, p.z) < p.r + .45);
      if (!t) continue;
      if (p.kind === 'cup') simOut(t.id, { t: 'hit', from: p.owner, name: (SIM.players.get(p.owner) || {}).name || '', k: DRINK[p.drink] && DRINK[p.drink].chill ? 'matcha' : 'coffee' });
      else simOut(t.id, { t: 'hit', from: p.owner, name: (SIM.players.get(p.owner) || {}).name || '', k: 'shove', a: r2(Math.atan2(p.vx, p.vz)), f: 7, d: Math.min(12, (p.dmg || 3) * .6 + 1) });
      ftext(t.x, 2.6, t.z, p.kind === 'cup' ? 'Кавою в кента! ☕' : 'Скобою!', 'crit');
      if (!p.pierce) p.life = 0;
    }
  }
}
function teleVsPlayers(dt) {
  for (const t of TELE) {
    if (t.visual || t.t + dt < t.tmax || !t.dmg) continue;
    for (const p of alivePlayers()) { const d = dist2(p.x, p.z, t.x, t.z); if (d < t.r && d >= (t.inner || 0) && (p.y || 0) < 1) simOut(p.id, { t: 'w', k: 'hurt', d: Math.round(t.dmg), x: r1(t.x), z: r1(t.z) }); }
  }
}

/* ---------- Крок симуляції ---------- */
function simTick(dt) {
  gameTime += dt;
  updDayNight(dt);
  const players = alivePlayers();
  SIM.lvl = Math.max(1, ...simPlayers().map(p => p.lvl || 1));
  P.lvl = SIM.lvl;
  updCarried();
  // моби: кожен «бачить» найближчого гравця
  for (const m of MON.slice()) {
    const t = nearestPlayer(m.x, m.z, 60);
    if (!t && m.state !== 'fall' && !m.carried && !(m.thrown > 0) && Math.hypot(m.vx, m.vz) < .05) continue;   // далеко від усіх — спить
    loadPl(t); SIM.actor = m.lastBy != null && SIM.players.has(m.lastBy) ? m.lastBy : null;
    try { updMonster(m, dt); } catch (e) { console.error('updMonster', e); }
    if (m.pinT > 0) { m.pinT -= dt; m.stun = Math.max(m.stun, .2); }
    if (m.stun > 0) m.stunAt = gameTime;
  }
  SIM.actor = null;
  // CEO
  { const tw = ISLMAP.tower; loadPl(nearestPlayer(tw.x, tw.z, tw.r + 12)); try { updBoss(dt); } catch (e) { console.error('updBoss', e); } }
  // міні-боси — кожен зі своєю ціллю
  { const all = Object.assign({}, MBS);
    for (const id in all) { for (const k in MBS) delete MBS[k]; MBS[id] = all[id]; const b = all[id]; loadPl(nearestPlayer(b.hx, b.hz, b.def.arena + 12)); try { updMinibosses(dt); } catch (e) { console.error('updMinibosses', e); } }
    for (const k in MBS) delete MBS[k]; Object.assign(MBS, all); }
  park();
  projVsPlayers(); updProj(dt); curProjOwner = null;
  teleVsPlayers(dt); updTele(dt);
  updProps(dt); updSpawns(dt); simEvents(dt);
  updChill(dt); updBodies(dt); updFans(dt);
  // гаки (вантузи) — кожен від імені власника
  { const all = HOOKS.splice(0), keep = [];
    for (const k of all) { HOOKS.length = 0; HOOKS.push(k); const o = SIM.players.get(k.owner); loadPl(o); SIM.actor = k.owner; try { updHooks(dt); } catch (e) { } if (HOOKS.length) keep.push(k); }
    HOOKS.length = 0; HOOKS.push(...keep); SIM.actor = null; park(); }
  pl.carry = null; updCarry(dt);
  addonTick(dt);
  SIM.snapT -= dt; if (SIM.snapT <= 0) { SIM.snapT = .1; sendSnapshots(); }
  SIM.statT -= dt; if (SIM.statT <= 0) { SIM.statT = 2; simOut('stats', { mon: MON.filter(m => !m.calm).length, players: SIM.players.size }); }
}

/* ---------- Знімок світу для кожного гравця ---------- */
function monFlags(m) { return (m.calm ? 1 : 0) | (m.state === 'fall' ? 2 : 0) | (m.state === 'windup' ? 4 : 0) | (m.stun > 0 ? 8 : 0) | (m.thrown > 0 ? 16 : 0) | (m.slow > 0 ? 32 : 0) | (m.chill > 0 ? 64 : 0) | (m.pinT > 0 ? 128 : 0); }
function bossSnap(b) {
  const o = { a: b.active ? 1 : 0, s: b.asleep ? 1 : 0, st: Math.round(b.stress), mx: b.max, l: b.lvl, x: r1(b.x), z: r1(b.z), y: r1(b.mesh && b.mesh.root ? b.mesh.root.position.y : (b.y || 0)), f: r2(b.mesh && b.mesh.root ? b.mesh.root.rotation.y : 0) };
  if (b.charge) o.ch = [r2(b.charge.a), r2(b.charge.t - b.charge.go)];
  if (b.weak && b.weak.length) o.w = b.weak.map(w => [r1(w.x), r1(w.z)]);
  return o;
}
let projN = 0;
function sendSnapshots() {
  const fxAll = SIM.fx.splice(0);
  const fans = FANS.map(f => f.on > 0 ? r1(f.on) : 0);
  const props = [];
  PROPS.forEach((p, i) => { if (!p.alive || p.held || p.fly || p.x !== p.ox || p.z !== p.oz) props.push([i, p.alive ? 1 : 0, r1(p.x), r1(p.z), r1(p.fly ? Math.max(0, p.fly.y - .4) : p.held ? p.mesh.position.y : 0), p.carrier == null ? -1 : p.carrier]); });
  const bodies = BODIES.map((b, i) => [i, r1(b.x), r1(b.z), r1(b.y), r2(b.m.rotation.y), b.fall ? 1 : 0, b.carrier != null ? b.carrier : b.owner != null ? b.owner : -1, r2(b.m.rotation.x)]);
  const boss = { ceo: bossSnap(BOSS) }; for (const id in MBS) boss[id] = bossSnap(MBS[id]);
  const hooks = HOOKS.map(k => { const o = SIM.players.get(k.owner); return [o ? r1(o.x) : r1(k.x), o ? r1(o.z) : r1(k.z), r1(k.x), r1(k.z), k.owner]; });
  for (const p of PROJ) if (p.nid == null) p.nid = ++projN;
  for (const p of simPlayers()) {
    const near = (x, z) => dist2(x, z, p.x, p.z) < SNAP_R;
    const M = MON.filter(m => near(m.x, m.z)).map(m => [m.nid, m.type, m.isl.id, r1(m.x), r1(m.z), r1(m.y), r2(m.face), Math.round(m.stress), m.max, monFlags(m), m.wants || '', m.carrier == null ? -1 : m.carrier, m.la != null ? r2(m.la) : 0]);
    const J = PROJ.filter(q => near(q.x, q.z)).map(q => [q.nid, q.kind, r1(q.x), r1(q.y), r1(q.z), r1(q.vx), r1(q.vz), q.owner == null ? -1 : q.owner]);
    const F = fxAll.filter(e => {
      if (e[0] === 't' || e[0] === 'b') return near(e[1], e[3]);
      if (e[0] === 'r' || e[0] === 'w' || e[0] === 'e') return near(e[1], e[2]);
      if (e[0] === 's') return e[2] == null || near(e[2], e[3]);
      return true;
    }).slice(-80);
    simOut(p.id, { t: 'ws', day: r2(P.dayT), ev: [EV.happy > 0 ? 1 : 0, EV.reports > 0 ? 1 : 0], M, J, B: bodies, P: props, S: boss, fans, H: hooks, fx: F });
  }
}

/* ---------- Вхід від start.py ---------- */
window.__SIM_IN = msg => {
  if (msg.t === 'join') { SIM.players.set(msg.id, { id: msg.id, name: msg.name || '', lvl: msg.lvl || 1 }); }
  else if (msg.t === 'leave') { releaseOf(msg.id, false); for (const b of BODIES) if (b.owner === msg.id) { b.owner = null; b.held = false; } SIM.players.delete(msg.id); }
  else if (msg.t === 'pl') {
    for (const s of msg.list || []) {
      let p = SIM.players.get(s.id); if (!p) { p = { id: s.id, name: s.name || '' }; SIM.players.set(s.id, p); }
      if (s.x == null) continue;
      p.x = s.x; p.z = s.z; p.y = s.y || 0; p.face = s.f || 0; p.dead = s.act === 'dead' || s.act === 'held'; p.lvl = s.l || p.lvl || 1; p.name = s.name || p.name;
    }
  }
  else if (msg.t === 'in') simIntent(msg.id, msg.m);
  else if (msg.t === 'ax') { try { addonNet(msg); } catch (e) { console.error('addonNet', e); } }   // повідомлення аддонів від гравців
};

/* ---------- Запуск ---------- */
window.__SIM_START = () => {
  startGame(true);
  P.tut = -1; P.known = Object.fromEntries(Object.keys(DRINK).map(k => [k, 1]));
  for (const m of MON.slice()) if (m.T.dummy) removeMonster(m);
  calcStats(); S.effM = 1; S.dmgM = 1;
  for (const m of MON) m.wants = pickWant(m.type);
  park();
};
window.__SIM_TICK = dt => simTick(dt);
