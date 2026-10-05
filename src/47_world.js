/* =====================================================================
   СПІЛЬНИЙ СВІТ (клієнт).
   Коли сервер має «сервер світу» (server/world.js), гра не рахує мобів,
   босів, візки, баки, ящики й снаряди сама — вона показує те, що каже сервер,
   а свої дії (удар, кидок, підняти, сісти у візок…) надсилає серверу.
   Без сервера світу (або офлайн) усе працює по-старому, локально.
   ===================================================================== */
const WORLD = { on: false, proxies: new Map(), projs: new Map(), hookViz: [], rideT: 0, chargeViz: new Map(), bossShown: false };
const BOSS_KEY = b => b === BOSS ? 'ceo' : (b && b.isMini ? b.id : null);

/* ---------- Увімкнути / вимкнути ---------- */
function worldEnable() {
  if (WORLD.on) return;
  WORLD.on = true;
  if (pl.carry && pl.carryK !== 'player') { pl.carry = null; pl.carryK = null; }
  if (pl.ride) dismount(false);
  for (const m of MON.slice()) if (!m.T.dummy) removeMonster(m);
  for (const p of PROJ.splice(0)) scene.remove(p.m);
  for (const t of TELE.splice(0)) { scene.remove(t.ring, t.fill); if (t.paper) scene.remove(t.paper); }
  for (const k of HOOKS.splice(0)) { scene.remove(k.m); scene.remove(k.line); }
  for (const p of PROPS) resetProp(p);
  if (BOSS.charge && BOSS.charge.line) scene.remove(BOSS.charge.line); BOSS.charge = null;
  if (running) toast('🌍 Спільний світ: усі бачать тих самих мобів, візки й предмети.');
}
function worldDisable() {
  if (!WORLD.on) return;
  WORLD.on = false;
  for (const m of WORLD.proxies.values()) removeMonster(m);
  WORLD.proxies.clear();
  for (const v of WORLD.projs.values()) scene.remove(v.m); WORLD.projs.clear();
  WORLD.hookViz.forEach(h => { scene.remove(h.line); scene.remove(h.cup); }); WORLD.hookViz = [];
  for (const v of WORLD.chargeViz.values()) scene.remove(v); WORLD.chargeViz.clear();
  if (pl.carry && pl.carryK !== 'player') { pl.carry = null; pl.carryK = null; }
  for (const p of PROPS) resetProp(p);
  for (const b of BODIES) { b.held = false; b.fall = false; b.x = b.hx; b.z = b.hz; b.y = 0; b.vx = b.vz = 0; b.m.rotation.set(0, 0, 0); b.m.position.set(b.x, 0, b.z); }
  if (running) { for (const s of ISL) if (s.spawn) for (const [type, cnt] of s.spawn) for (let i = 0; i < cnt; i++) spawnMonster(type, s); bossInit(); for (const id in MBS) MBS[id].active = false; }
  if (running) toast('🌍 Сервер світу недоступний — світ рахується локально.');
}
function resetProp(p) {
  p.fly = null; p.held = false; p.holder = -1; p.alive = true; p.t = 0;
  p.x = p.ox; p.z = p.oz; p.mesh.visible = true; p.mesh.position.set(p.ox, 0, p.oz); p.mesh.rotation.x = p.mesh.rotation.z = 0;
}

/* ---------- Дії гравця → сервер ---------- */
function wsend(m) { netSend(Object.assign({ t: 'w' }, m)); }
function worldMonsterIntent(m, patch) { if (WORLD.on && m.proxy) wsend(Object.assign({ k: 'mh', id: m.nid }, patch)); }
const wr2 = v => Math.round(v * 100) / 100;

const _wApplyHit = applyHit;
applyHit = function (m, dmg, kx, kz, isBoss) {
  if (!WORLD.on || window.__SIM) return _wApplyHit.apply(this, arguments);
  const floor = (m.max || 0) * .25, real = !m.calm && m.stress > floor ? Math.min(dmg, m.stress - floor) : 0;
  if (isBoss) { const key = BOSS_KEY(m); if (!key) return 0; m.stress -= real; wsend({ k: 'bh', b: key, dmg: wr2(dmg) }); return real; }
  if (!m.proxy) return _wApplyHit.apply(this, arguments);   // манекен-стажер — свій, локальний
  if (m.calm) return 0;
  m.stress -= real; flashMonster(m); lastHitM = m; lastHitT = gameTime;
  m.x += (kx || 0) * .02; m.z += (kz || 0) * .02;            // миттєвий відгук; точну позицію дасть сервер
  wsend({ k: 'mh', id: m.nid, dmg: wr2(dmg), kx: wr2(kx || 0), kz: wr2(kz || 0) });
  return real;
};
const _wApplyCalm = applyCalm;
applyCalm = function (m, amt, isBoss, handed, drinkId) {
  if (!WORLD.on || window.__SIM) return _wApplyCalm.apply(this, arguments);
  if (isBoss) { const key = BOSS_KEY(m); if (key) wsend({ k: 'bh', b: key, calm: wr2(amt * S.effM), handed: !!handed }); return; }
  if (!m.proxy) return _wApplyCalm.apply(this, arguments);
  if (m.calm) return;
  wsend({ k: 'mh', id: m.nid, calm: wr2(amt * S.effM), handed: !!handed, drink: drinkId || '' });
};
const _wFreeze = freezeM;
freezeM = function (m, sec) { if (WORLD.on && m && m.proxy) { wsend({ k: 'mh', id: m.nid, freeze: sec }); return; } return _wFreeze.apply(this, arguments); };
const _wChill = chillMonster;
chillMonster = function (m) { if (WORLD.on && m && m.proxy) { wsend({ k: 'mh', id: m.nid, chill: 1 }); return; } return _wChill.apply(this, arguments); };
const _wDamageProp = damageProp;
damageProp = function (p, dmg, how) {
  if (!WORLD.on || window.__SIM) return _wDamageProp.apply(this, arguments);
  if (!p.alive) return;
  wsend({ k: 'ph', i: PROPS.indexOf(p), dmg: wr2(dmg * (hasSk('x2') ? 2 : 1)) });
  p.mesh.rotation.z = (Math.random() - .5) * .2;
};
const _wBreakProp = breakProp;
breakProp = function (p) { if (WORLD.on && !window.__SIM) return; return _wBreakProp.apply(this, arguments); };
const _wSpawnProj = spawnProj;
spawnProj = function (o) {
  if (!WORLD.on || window.__SIM || o.from !== 'player' || o.vis) return _wSpawnProj.apply(this, arguments);
  wsend({ k: 'proj', o: { kind: o.kind, y: o.y, vx: wr2(o.vx), vz: wr2(o.vz), life: o.life, r: o.r, dmg: o.dmg, kb: o.kb, crit: o.crit, pierce: !!o.pierce, drink: o.drink, art: wr2((o.art || 1) * (o.kind === 'cup' ? S.effM : 1)), nail: o.nail || 0 } });
};
const _wFireHook = fireHook;
fireHook = function (h) { if (!WORLD.on || window.__SIM) return _wFireHook.apply(this, arguments); aimFace(); wsend({ k: 'hook', face: wr2(pl.face), rng: h.rng }); sfx('throw'); };
const _wSwitchFan = switchFan;
switchFan = function (f, broadcast) { if (WORLD.on && broadcast && !window.__SIM) { wsend({ k: 'fan', i: f.i }); return; } return _wSwitchFan.apply(this, arguments); };

/* Підняти / кинути: сервер вирішує, ми одразу показуємо (передбачення) */
const _wPickUpAny = pickUpAny;
pickUpAny = function (t) {
  const [k, o] = t;
  if (!WORLD.on || k === 'player') return _wPickUpAny.apply(this, arguments);
  if (k === 'mon') return pickUp(o);
  wsend({ k: 'carry', kind: k, id: k === 'body' ? BODIES.indexOf(o) : PROPS.indexOf(o) });
  pl.carry = o; pl.carryK = k; pl.carryT = 0;
  toast('Тримаєш! ЛКМ або Q — жбурнути, F — поставити.'); sfx('jump');
};
const _wPickUp = pickUp;
pickUp = function (m) {
  if (!WORLD.on || !m.proxy) return _wPickUp.apply(this, arguments);
  wsend({ k: 'carry', kind: 'mon', id: m.nid });
  pl.carry = m; pl.carryK = 'mon'; pl.carryT = 0;
  toast('🏀 Тримаєш моба! ЛКМ або Q — жбурнути, F — поставити.'); sfx('jump');
};
const _wRelease = releaseCarry;
releaseCarry = function (throwIt) {
  if (!WORLD.on || window.__SIM || !pl.carry || pl.carryK === 'player') return _wRelease.apply(this, arguments);
  if (throwIt) { aimFace(); ftext(pl.x, 2.4, pl.z, 'Кидок!', 'crit'); sfx('throw'); pl.swingT = .25; pl.swingKind = 2; }
  wsend({ k: throwIt ? 'throw' : 'drop', face: wr2(pl.face) });
  pl.carry = null; pl.carryK = null;
};
const _wMount = mount;
mount = function (b) {
  if (!WORLD.on) return _wMount.apply(this, arguments);
  if (b.holder != null && b.holder !== -1 && b.holder !== NET.id) { toast('Хтось уже їде на цьому 🛒'); return; }
  _wMount.apply(this, arguments); wsend({ k: 'ride', i: BODIES.indexOf(b) }); WORLD.rideT = 0;
};
const _wDismount = dismount;
dismount = function (push) {
  const b = pl.ride;
  _wDismount.apply(this, arguments);
  if (WORLD.on && b) wsend({ k: 'unride', i: BODIES.indexOf(b), vx: wr2(b.vx), vz: wr2(b.vz) });
};

/* ---------- Подія від сервера саме для мене ---------- */
function worldPersonal(m) {
  if (m.k === 'hurt') {
    if (pl.dashT > 0 && m.x != null) { checkPerfect(m.x, m.z, 3); return; }
    hurtPlayer(m.d, m.x != null ? { x: m.x, z: m.z } : null);
    if (m.slow) { pl.slowT = 2.2; ftext(pl.x, 2.8, pl.z, 'Холодний лист! Ти сповільнений', 'calm'); sfx('freeze'); }
  } else if (m.k === 'steal') {
    const keys = Object.keys(P.ing).filter(k => P.ing[k] > 0);
    if (keys.length) { const k = pick(keys); P.ing[k]--; ftext(m.x, 2.6, m.z, 'Вкрав ' + ING[k].ic + '!', 'bad'); sfx('steal', m.x, m.z); }
  } else if (m.k === 'xp') addXP(m.n, m.x, m.z);
  else if (m.k === 'loot') dropLoot(m.x, m.z, m.list || [], m.y || 0);
  else if (m.k === 'quest') questEvent(m.ev);
  else if (m.k === 'heal') addHeal(m.id, m.amt, m.x, m.z);
  else if (m.k === 'crowd') addHubCrowd();
  else if (m.k === 'carryFail') { if (pl.carry) toast('Не вдалося підняти — хтось був швидшим'); pl.carry = null; pl.carryK = null; }
  else if (m.k === 'bossWin') bossReward(m.lvl);
  else if (m.k === 'mbWin') mbReward(m.id, m.lvl);
  else if (m.k === 'meteor') {
    const c = addChest(m.id, m.x, m.z, m.tier, false);
    c.temp = true; c.fall = true; c.fy = 40; c.mesh.position.y = 40;
  }
}
function bossReward(lvl) {
  const loot = [{ k: 'coins', d: 120 * lvl }, { k: 'ing', d: 'syrup', n: 2 }];
  if (!P.bossWins) loot.push({ k: 'item', d: makeItem('tumbler', 4) });
  else loot.push({ k: 'item', d: (() => { const it = Math.random() < .3 ? makeItem('tumbler', rollRarity(20) >= 5 ? 5 : 4) : randomItem(25); it.r = Math.max(it.r, 3); return it; })() });
  loot.push({ k: 'item', d: randomItem(15) });
  if (Math.random() < .5) loot.push({ k: 'cosm' });
  loot.push({ k: 'case', d: 'ceo' });
  if (Math.random() < .5) loot.push({ k: 'case', d: 'vacation' });
  dropLoot(BOSS.x, BOSS.z + 2.5, loot);
  P.bossWins++; addXP(300 * lvl, BOSS.x, BOSS.z); addHeal('tower', 45, BOSS.x, BOSS.z);
  questEvent('boss'); sfx('level'); $('#bossbar').hidden = true; save();
}
function mbReward(id, lvl) {
  const b = MBS[id]; if (!b) return;
  P.mb[id] = (P.mb[id] || 0) + 1;
  const r = Math.random() < .12 ? 5 : Math.max(3, rollRarity(20));
  const lx = b.def.water ? -32 : b.x, lz = b.def.water ? -18 : b.z + 2.5;
  dropLoot(lx, lz, [{ k: 'item', d: makeItem(b.def.drop, r) }, { k: 'case', d: 'vacation' }, { k: 'coins', d: 120 * lvl }, { k: 'item', d: exploreItem(10, 2) }]);
  addXP(260 * lvl, b.x, b.z); addHeal(b.def.isl, 40, b.x, b.z);
  questEvent('miniboss'); $('#bossbar').hidden = true; save();
}

/* ---------- Знімок світу ---------- */
function entByRef(ref) {
  if (ref === 'B') return BOSS;
  if (ref[0] === 'b') return MBS[ref.slice(1)];
  if (ref[0] === 'm') return WORLD.proxies.get(+ref.slice(1));
  return null;
}
function makeProxy(id, type, isl, x, z) {
  if (!MT[type]) return null;
  const m = spawnMonster(type, ISLMAP[isl] || ISL[0], x, z);
  if (!m) return null;
  m.proxy = true; m.nid = id; m.state = 'chase'; m.tx = x; m.tz = z; m.ty = 0; m.tf = 0;
  if (m.wantS) { scene.remove(m.wantS); m.wantS = null; } m.wants = null;
  WORLD.proxies.set(id, m);
  return m;
}
function proxyCalmVisual(m) {
  m.calm = true; m.state = 'calm'; m.stress = 0; if (m.bar) m.bar.visible = false;
  const p = m.parts;
  if (!p.hound) {
    p.torso.material = mat('#BFE8D5'); if (p.aLm) p.aLm.material = mat('#BFE8D5'); if (p.aRm) p.aRm.material = mat('#BFE8D5');
    if (p.head) p.head.material = mat('#F0CBAA');
    if (p.hand) { const cup = mesh(G.cup, '#FFFFFF'); cup.rotation.x = -Math.PI / 2; cup.position.set(0, .05, .1); p.hand.add(cup); }
  } else { p.torso.material = mat('#BFE8D5'); if (p.head) p.head.material = mat('#F0CBAA'); }
  if (m.wantS) { scene.remove(m.wantS); m.wantS = null; }
}
function worldSnapshot(s) {
  if (!WORLD.on) worldEnable();
  if (s.day != null) P.dayT = s.day;
  EV.happy = s.ev && s.ev[0] ? 1 : 0; EV.reports = s.ev && s.ev[1] ? 1 : 0;
  // моби
  const seen = new Set();
  for (const a of s.M || []) {
    const [id, type, isl, x, z, y, face, stress, max, flags, wants, carrier, la] = a;
    seen.add(id);
    let m = WORLD.proxies.get(id) || makeProxy(id, type, isl, x, z);
    if (!m) continue;
    m.tx = x; m.tz = z; m.ty = y; m.tf = face; m.max = max; m.la = la; m.carrier = carrier;
    if (!(m.hitT > 0)) m.stress = stress; else m.stress = Math.min(m.stress, stress);
    if ((wants || null) !== m.wants && !(flags & 1)) { if (m.wantS) scene.remove(m.wantS); m.wants = wants || null; m.wantS = m.wants && DRINK[m.wants] ? wantSprite(m.wants) : null; if (m.wantS) scene.add(m.wantS); }
    if (flags & 1) { if (!m.calm) proxyCalmVisual(m); }
    else m.state = flags & 2 ? 'fall' : flags & 4 ? (m.state === 'windup' ? 'windup' : (m.t = .6, 'windup')) : 'chase';
    m.stun = flags & 8 ? .3 : 0; m.thrown = flags & 16 ? 1 : 0; m.slow = flags & 32 ? 1 : 0; m.chillV = !!(flags & 64); m.pinV = !!(flags & 128);
    m.carried = carrier !== -1;
  }
  for (const [id, m] of WORLD.proxies) if (!seen.has(id)) { if (pl.carry === m) { pl.carry = null; pl.carryK = null; } removeMonster(m); WORLD.proxies.delete(id); }
  // боси
  for (const key in s.S || {}) {
    const o = s.S[key], b = key === 'ceo' ? BOSS : MBS[key]; if (!b) continue;
    const was = b.active;
    b.active = !!o.a; b.asleep = !!o.s; b.calm = b.asleep; b.stress = o.st; b.max = o.mx; b.lvl = o.l;
    b.tx = o.x; b.tz = o.z; b.ty = o.y; b.tf = o.f; b.chS = o.ch || null; b.weakS = o.w || [];
    if (b.x == null || !was && b.active) { b.x = o.x; b.z = o.z; }
    b.weak = b.weakS.map(([x, z]) => ({ x, z, t: 1 }));      // для hitWeakPoints
  }
  // візки, баки, крісла
  for (const [i, x, z, y, ry, fall, holder, rx] of s.B || []) {
    const b = BODIES[i]; if (!b || b === pl.ride) continue;
    b.tx = x; b.tz = z; b.ty = y; b.try = ry; b.trx = rx; b.fall = !!fall; b.holder = holder; b.held = holder !== -1;
  }
  // ящики, принтери, кавоварки, що не на місці
  const pm = new Map((s.P || []).map(e => [e[0], e]));
  PROPS.forEach((p, i) => {
    const e = pm.get(i);
    if (!e) { if (!p.alive || p.x !== p.ox || p.z !== p.oz || p.holder >= 0 || p.mesh.position.y) resetProp(p); return; }
    const [, alive, x, z, y, holder] = e;
    p.holder = holder; p.held = holder !== -1; p.alive = !!alive;
    p.x = x; p.z = z; p.ty = y;
    p.mesh.visible = !!alive || p.held || y > 0;
  });
  // снаряди
  const js = new Set();
  for (const [id, kind, x, y, z, vx, vz] of s.J || []) {
    js.add(id);
    let v = WORLD.projs.get(id);
    if (!v) { _wSpawnProj({ x, z, y, vx: 0, vz: 0, life: 1, r: .5, from: 'viz', kind, vis: 1 }); const p = PROJ.pop(); if (!p || !p.m) continue; v = { m: p.m }; WORLD.projs.set(id, v); }
    v.x = x; v.y = y; v.z = z; v.vx = vx; v.vz = vz;
  }
  for (const [id, v] of WORLD.projs) if (!js.has(id)) { scene.remove(v.m); WORLD.projs.delete(id); }
  // вентилятори
  (s.fans || []).forEach((on, i) => { const f = FANS[i]; if (!f) return; if (on > 0 && f.on <= 0) _wSwitchFan(f, false); f.on = on; });
  // вантузи
  const H = s.H || [];
  while (WORLD.hookViz.length < H.length) {
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    const line = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: '#4E4A6E' })); line.frustumCulled = false; scene.add(line);
    const cup = mesh(new THREE.ConeGeometry(.22, .22, 10, 1, true), mat('#E8505B', { side: THREE.DoubleSide })); cup.rotation.x = -Math.PI / 2; scene.add(cup);
    WORLD.hookViz.push({ line, cup });
  }
  WORLD.hookViz.forEach((h, i) => { const e = H[i]; h.line.visible = h.cup.visible = !!e; h.e = e; });
  // ефекти
  for (const e of s.fx || []) worldFx(e);
}
function worldFx(e) {
  try {
    const k = e[0];
    if (k === 't') ftext(e[1], e[2], e[3], e[4], e[5]);
    else if (k === 'b') burst(e[1], e[2], e[3], e[4], e[5], e[6], e[7], e[8], e[9]);
    else if (k === 'r') ringFX(e[1], e[2], e[3], e[4], e[5]);
    else if (k === 'u') { const ent = entByRef(e[1]); if (ent) bubble(ent, e[2], !!e[3], e[4]); }
    else if (k === 's') sfx(e[1], e[2] == null ? undefined : e[2], e[3] == null ? undefined : e[3]);
    else if (k === 'w') swingFX(e[1], e[2], e[3], e[4], e[5], e[6]);
    else if (k === 'n') banner(e[1]);
    else if (k === 'o') { if (e[1]) toast(e[1]); }
    else if (k === 'a') { const m = WORLD.proxies.get(e[1]); if (m) { m.la = e[2]; m.state = 'windup'; m.t = m.T.wind; warnArc(m); } }
    else if (k === 'e') { addTele(e[1], e[2], e[3], e[4], 0, !!e[5], e[6]); const t = TELE[TELE.length - 1]; if (t) t.visual = true; }
  } catch (err) { }
}

/* ---------- Кадр: плавно показуємо стан сервера ---------- */
function worldTick(dt) {
  const k = 1 - Math.exp(-dt * 12);
  for (const m of MON.slice()) {
    if (!m.proxy) { if (dist2(m.x, m.z, pl.x, pl.z) < 48) updMonster(m, dt); continue; }    // свій манекен
    const p = m.parts;
    if (pl.carry === m) { m.x = pl.x; m.z = pl.z; m.y = pl.y + 1.9; }
    else {
      const ox = m.x, oz = m.z;
      m.x = lerp(m.x, m.tx, k); m.z = lerp(m.z, m.tz, k); m.y = lerp(m.y, m.ty, k);
      const sp = Math.hypot(m.x - ox, m.z - oz) / Math.max(dt, 1e-3);
      if (sp > .3 && !m.calm) m.walk += dt * Math.min(8, sp * 2.2);
      else if (m.calm && sp > .2) m.walk += dt * 5;
    }
    m.face = m.tf;
    if (m.state === 'windup') m.t -= dt;
    if (m.state === 'fall') p.root.rotation.x += dt * 3;
    syncMonster(m, dt);
    if (m.thrown) p.root.rotation.z += dt * 12; else if (pl.carry === m || m.carried) p.root.rotation.z = Math.sin(gameTime * 9) * .2; else if (p.root.rotation.z && m.state !== 'fall') p.root.rotation.z = 0;
    if (m.chillV) p.root.position.y = m.y - .45;
    if (m.bar) m.bar.visible = !m.calm && m.state !== 'fall' && !m.carried && dist2(m.x, m.z, pl.x, pl.z) < 48;
  }
  worldBosses(dt, k);
  // візки, баки
  for (const b of BODIES) {
    if (b === pl.ride || b.tx == null) continue;
    if (pl.carry === b) { b.x = pl.x; b.z = pl.z; b.y = pl.y + 1.6; b.m.rotation.z = Math.sin(gameTime * 9) * .2; }
    else { b.x = lerp(b.x, b.tx, k); b.z = lerp(b.z, b.tz, k); b.y = lerp(b.y, b.ty, k); b.m.rotation.y = lerpAng(b.m.rotation.y, b.try, k); b.m.rotation.x = b.trx || 0; b.m.rotation.z = 0; }
    b.m.position.set(b.x, b.y, b.z);
  }
  // ящики в повітрі / в руках
  for (const p of PROPS) {
    if (pl.carry === p) { p.mesh.visible = true; p.mesh.position.set(pl.x, pl.y + 1.6, pl.z); p.mesh.rotation.z = Math.sin(gameTime * 9) * .2; continue; }
    if (p.ty == null) continue;
    const y = p.ty || 0;
    p.mesh.position.x = lerp(p.mesh.position.x, p.x, k); p.mesh.position.z = lerp(p.mesh.position.z, p.z, k); p.mesh.position.y = lerp(p.mesh.position.y, y, k);
    if (y > .5 && !p.held) p.mesh.rotation.x += dt * 9; else if (!p.held) p.mesh.rotation.x = 0;
  }
  // снаряди: між знімками летять самі
  for (const v of WORLD.projs.values()) { v.x += v.vx * dt; v.z += v.vz * dt; v.m.position.set(v.x, v.y, v.z); v.m.rotation.y += dt * 9; }
  // вантузи
  for (const h of WORLD.hookViz) {
    if (!h.e) continue;
    const [ox, oz, x, z, owner] = h.e, mine = owner === NET.id;
    const a = h.line.geometry.attributes.position;
    a.setXYZ(0, mine ? pl.x : ox, (mine ? pl.y : 0) + 1.1, mine ? pl.z : oz); a.setXYZ(1, x, 1.1, z); a.needsUpdate = true;
    h.cup.position.set(x, 1.1, z);
  }
  // свій візок: позиція йде на сервер
  if (pl.ride) {
    WORLD.rideT -= dt;
    if (WORLD.rideT <= 0) { WORLD.rideT = .08; const b = pl.ride; wsend({ k: 'rideUpd', i: BODIES.indexOf(b), x: wr2(b.x), z: wr2(b.z), vx: wr2(b.vx), vz: wr2(b.vz), f: wr2(b.face || 0) }); }
  }
  if (EV.reports > 0 && Math.random() < dt * 6) burst(pl.x + rand(-8, 8), 9, pl.z + rand(-8, 8), '#FFFFFF', 1, .5, 2.5, 0, 2);
}
function chargeLine(key, b, len) {
  let g = WORLD.chargeViz.get(key);
  const on = b.chS && b.chS[1] > 0 && b.active;
  if (on && !g) {
    const line = new THREE.Mesh(new THREE.PlaneGeometry(2.2, len).translate(0, len / 2, 0), new THREE.MeshBasicMaterial({ color: '#FF5C7A', transparent: true, opacity: .3, side: THREE.DoubleSide, depthWrite: false }));
    line.rotation.x = -Math.PI / 2; g = new THREE.Group(); g.add(line); scene.add(g); WORLD.chargeViz.set(key, g);
  }
  if (g) { g.visible = !!on; if (on) { g.position.set(b.x, .13, b.z); g.rotation.y = b.chS[0]; g.children[0].material.opacity = .25 + Math.sin(gameTime * 30) * .15; } }
}
function worldBosses(dt, k) {
  let shown = false;
  const b = BOSS, h = b.mesh;
  if (h && b.tx != null) {
    const ox = b.x; b.x = lerp(b.x, b.tx, k); b.z = lerp(b.z, b.tz, k);
    h.root.position.set(b.x, 0, b.z); h.root.rotation.y = lerpAng(h.root.rotation.y, b.tf, k);
    h.reports.forEach((r, i) => { const a = gameTime * 1.5 + i * Math.PI / 2; r.position.set(Math.cos(a) * .9, 1.2 + Math.sin(gameTime * 3 + i) * .15, Math.sin(a) * .9); r.rotation.y = -a; r.visible = !b.asleep; });
    if (b.asleep) { h.body.rotation.x = .5; h.body.position.y = -.25; }
    else { h.body.rotation.x = 0; h.body.position.y = 0; if (Math.abs(b.x - ox) > .001) { const sw = Math.sin(gameTime * 4) * .4; h.l1.rotation.x = sw; h.l2.rotation.x = -sw; } }
    chargeLine('ceo', b, 14);
    const tw = ISLMAP.tower;
    if (b.active && !b.asleep && dist2(pl.x, pl.z, tw.x, tw.z) < tw.r + 6) { showBossBar('💼 CEO-психопат' + (b.lvl > 1 ? ' · квартал ' + b.lvl : ''), b.stress / b.max); shown = true; }
  }
  for (const id in MBS) {
    const m = MBS[id], mh = m.mesh, d = m.def; if (!mh || m.tx == null) continue;
    m.x = lerp(m.x, m.tx, k); m.z = lerp(m.z, m.tz, k);
    mh.root.position.set(m.x, m.ty != null ? m.ty : m.y, m.z); mh.root.rotation.y = lerpAng(mh.root.rotation.y, m.tf, k);
    if (m.asleep) mh.body.rotation.x = d.water ? .3 : .45; else { mh.body.rotation.x = 0; mh.body.position.y = Math.sin(gameTime * 2) * .08; }
    if (d.water && mh.tents) mh.tents.forEach((t, i) => { t.rotation.y = Math.sin(gameTime * 1.5 + i) * .3; });
    if (mh.l1 && !m.asleep) { const sw = Math.sin(gameTime * 4) * .4; mh.l1.rotation.x = sw; mh.l2.rotation.x = -sw; }
    // щупальця-слабкі місця
    m.weakViz = m.weakViz || [];
    const W = m.weakS || [];
    while (m.weakViz.length < W.length) { const t = mesh(flat(new THREE.CylinderGeometry(.25, .55, 3, 7).translate(0, 1.5, 0)), '#9A63E0'); scene.add(t); m.weakViz.push(t); }
    m.weakViz.forEach((t, i) => { t.visible = i < W.length; if (t.visible) { t.position.set(W[i][0], -.3, W[i][1]); t.rotation.z = Math.sin(gameTime * 6 + i) * .15; } });
    chargeLine(id, m, 12);
    if (m.active && !m.asleep && dist2(pl.x, pl.z, m.hx, m.hz) < d.arena + 8) { showBossBar(`${d.ic} ${d.n}${m.lvl > 1 ? ' · рівень ' + m.lvl : ''}`, m.stress / m.max); shown = true; }
  }
  if (!shown) $('#bossbar').hidden = true;
}
