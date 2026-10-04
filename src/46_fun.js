/* =====================================================================
   ФАН І ТРОЛІНГ
   - візок із супермаркету й офісне крісло: слизька їзда, боулінг мобами
   - френдлі-фаєр: швабра відкидає тімейта, кава в обличчя — «ошпарений»
   - вантуз-гарпун: притягує мобів, предмети й… кента
   - калюжі сиропу (ковзко), кавоварки під тиском (вибухають), вентилятори
   - моб-баскетбол: заспокоєного до краю (25%) моба можна підняти й кинути
   - баки й кеги, які можна копати як м'яч
   - «Спешл-Матча» з «Веселим п'ятилисником» і «Ямайський спідбуст»
   ===================================================================== */

/* ---------- Дані ---------- */
Object.assign(ING, { clover: { n: 'Веселий п’ятилисник', ic: '🍀', c: '#7FE08A' } });
Object.assign(DRINK, {
  matcha:  { n: 'Спешл-Матча', ic: '🍵', calm: 15, t: 2.6, need: { clover: 1, milk: 1 }, chill: true, d: 'Монстр сідає, втикає в руки й дропає снеки. Кинеш у тімейта — зелений туман і «гумове» керування на 15 с.' },
  jamaica: { n: 'Ямайський спідбуст', ic: '🌀', calm: 0, t: 1.8, need: { clover: 1, monday: 1 }, self: 'jamaica', d: 'Сам випиваєш: бігаєш як дурний 10 с, але екран пливе.' },
});
DRINK_ORDER.push('matcha', 'jamaica');
Object.assign(BASE, {
  plunger: { n: 'Вантуз-гарпун', bn: 'Відклеєний вантуз', ic: '🪠', slot: 'hand', style: 'shot', dmg: 2, spd: .9, rng: 10, rad: .5, crit: 0, kb: 0, dur: 140, wt: .8, use: .05, fx: 'hook', d: 'Стріляє присоскою на мотузці: притягує мобів, ящики, баки й тімейтів. Можна врятувати кента… або скинути.' },
});
FX_DESC.hook = 'Притягує все, у що влучить';
PROP_T.espmachine = { n: 'Кавоварка під тиском', hp: 10, r: .55 };
BIOME_PROP_COL.espmachine = '#C9CDD9';
SHOP.push(['clover', 16]);

const FUN = { scald: 0, matcha: 0, jam: 0, chaosA: 0, chaosT: 0, lagX: 0, lagZ: 0, slipWarn: -9 };
const SYRUP = [], FANS = [], BODIES = [], HOOKS = [];

/* ---------- Будова світу (після mergeStatics — нічого тут не злипається) ---------- */
function initFun() {
  // калюжі сиропу
  const syr = [['office', 3, 2, 1.6], ['office', -5, -4, 1.3], ['park', -3, 4, 1.8], ['archive', 2, -3, 1.5], ['hub', -6.2, 5.6, 1.1], ['desert', 4, 5, 1.6]];
  for (const [id, ox, oz, r] of syr) {
    const s = ISLMAP[id]; if (!s) continue;
    const x = s.x + ox, z = s.z + oz;
    if (!onGround(x, z, r)) continue;
    const m = new THREE.Mesh(new THREE.CircleGeometry(r, 18), mat('#FFA94D', { transparent: true, opacity: .72, roughness: .15, emissive: '#7A3A00', emissiveIntensity: .15 }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, .035, z); m.receiveShadow = true; scene.add(m);
    SYRUP.push({ x, z, r, m });
  }
  // кавоварки під тиском
  for (const [id, ox, oz] of [['hub', 7.2, -1.4], ['office', 1, -6], ['office', 6, 1], ['park', 5, -2], ['archive', -4, 3], ['jungle', -5, -3], ['snow', 3, 4]]) {
    const s = ISLMAP[id]; if (!s) continue;
    const x = s.x + ox, z = s.z + oz;
    if (!onGround(x, z, 1) || STATICS.some(o => dist2(o.x, o.z, x, z) < o.r + .8)) continue;
    const p = addProp('espmachine', x, z);
    const g = p.mesh;
    put(g, mesh(new THREE.BoxGeometry(.8, .75, .6), '#C9CDD9'), 0, .38, 0);
    put(g, mesh(new THREE.BoxGeometry(.85, .1, .65), '#8E86B0'), 0, .8, 0);
    put(g, mesh(flat(new THREE.CylinderGeometry(.16, .16, .35, 8)), '#E8505B'), .22, 1.02, 0);
    put(g, mesh(new THREE.BoxGeometry(.18, .1, .04), bulb('#FF6B6B'), false), -.2, .55, .31);
    put(g, mesh(flat(new THREE.CylinderGeometry(.05, .05, .18, 6)), '#4E4A6E'), 0, .12, .33);
    p.gauge = put(g, mesh(new THREE.BoxGeometry(.05, .12, .02), '#2E2346', false), -.2, .55, .34);
  }
  // візки й крісла
  addBody('cart', 2.4, 7.2); addBody('chair', -4.6, 7);
  const of = ISLMAP.office; addBody('chair', of.x - 1, of.z + 1);
  const pk = ISLMAP.park; addBody('cart', pk.x - 2, pk.z - 1);
  // баки й кеги — «м'ячі»
  addBody('bin', -1.5, 5.2); addBody('keg', 1.2, 6.3);
  addBody('bin', of.x + 2, of.z - 1); addBody('keg', pk.x + 1, pk.z + 2);
  // вентилятори на мостах (вмикаються F — і кента здуває в безодню)
  for (const [a, b] of [['hub', 'office'], ['hub', 'park'], ['office', 'archive'], ['archive', 'tower']]) {
    const br = BR.find(r => r.A.id === a && r.B.id === b); if (br) addFan(br);
  }
}

function addFan(br) {
  const nx = -br.dz, nz = br.dx;                 // перпендикуляр до мосту
  let x = br.ax - br.dx * 1.4 + nx * (br.w / 2 + 1.1), z = br.az - br.dz * 1.4 + nz * (br.w / 2 + 1.1);
  for (let k = 0; k < 4 && !onGround(x, z, .6); k++) { x -= br.dx * .8; z -= br.dz * .8; }
  const dir = Math.atan2(-nx, -nz);              // дме через міст
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = dir; scene.add(g);
  put(g, mesh(new THREE.BoxGeometry(.9, .2, .9), '#4E4A6E'), 0, .1, 0);
  put(g, mesh(flat(new THREE.CylinderGeometry(.07, .07, 1.2, 6)), '#8E86B0'), 0, .7, 0);
  const head = new THREE.Group(); head.position.set(0, 1.45, 0); g.add(head);
  put(head, mesh(flat(new THREE.CylinderGeometry(.85, .85, .35, 14)), mat('#D9DCE8', { transparent: true, opacity: .55 })), 0, 0, 0).rotation.x = Math.PI / 2;
  const blades = new THREE.Group(); blades.position.z = .05; head.add(blades);
  for (let i = 0; i < 4; i++) { const b = mesh(new THREE.BoxGeometry(.22, .72, .04), '#8FD9C0', false); b.position.y = .36; const piv = new THREE.Group(); piv.rotation.z = i * Math.PI / 2; piv.add(b); b.rotation.y = .5; blades.add(piv); }
  const led = put(head, mesh(new THREE.SphereGeometry(.07, 6, 4), mat('#666677')), .55, .55, .2);
  addStatic(x, z, .55);
  FANS.push({ x, z, dir, br, g, blades, led, on: 0, i: FANS.length });
}

function bodyMesh(kind) {
  const g = new THREE.Group();
  if (kind === 'cart') {
    put(g, mesh(new THREE.BoxGeometry(.9, .5, 1.2), mat('#C9D4E8', { metalness: .3, roughness: .5 })), 0, .75, 0);
    put(g, mesh(new THREE.BoxGeometry(.8, .06, 1.1), '#8E86B0'), 0, .52, 0);
    put(g, mesh(new THREE.BoxGeometry(.9, .06, .06), '#E8505B'), 0, 1.05, -.62);
    for (const [a, b] of [[-.35, -.45], [.35, -.45], [-.35, .45], [.35, .45]]) put(g, mesh(flat(new THREE.CylinderGeometry(.09, .09, .06, 8)), '#2E2346'), a, .09, b).rotation.z = Math.PI / 2;
    for (const a of [-.4, .4]) put(g, mesh(new THREE.BoxGeometry(.04, .5, .04), '#8E86B0'), a, .3, 0);
  } else if (kind === 'chair') {
    put(g, mesh(new THREE.BoxGeometry(.6, .12, .6), '#6E5E96'), 0, .55, 0);
    put(g, mesh(new THREE.BoxGeometry(.6, .7, .12), '#6E5E96'), 0, .95, -.26);
    put(g, mesh(flat(new THREE.CylinderGeometry(.05, .05, .4, 6)), '#4E4A6E'), 0, .3, 0);
    for (let i = 0; i < 5; i++) { const a = i / 5 * 6.28; put(g, mesh(new THREE.BoxGeometry(.06, .05, .38), '#4E4A6E'), Math.sin(a) * .18, .1, Math.cos(a) * .18).rotation.y = a; }
  } else if (kind === 'bin') {
    put(g, mesh(flat(new THREE.CylinderGeometry(.35, .3, .85, 9)), '#7FA8C9'), 0, .43, 0);
    put(g, mesh(flat(new THREE.CylinderGeometry(.38, .38, .08, 9)), '#5E86A8'), 0, .9, 0);
  } else {
    put(g, mesh(flat(new THREE.CylinderGeometry(.32, .32, .75, 10)), mat('#B8BECC', { metalness: .4, roughness: .45 })), 0, .38, 0);
    for (const y of [.12, .64]) put(g, mesh(flat(new THREE.CylinderGeometry(.34, .34, .05, 10)), '#7E77A0'), 0, y, 0);
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
function addBody(kind, x, z) {
  if (!onGround(x, z, .8)) return null;
  const m = bodyMesh(kind); m.position.set(x, 0, z); scene.add(m);
  const b = { kind, x, z, y: 0, vx: 0, vz: 0, vy: 0, face: 0, hx: x, hz: z, m, r: kind === 'cart' ? .6 : .45, ride: kind === 'cart' || kind === 'chair', fall: false, respT: 0, hitT: new Map(), strike: [], spin: 0 };
  BODIES.push(b); return b;
}

/* ---------- Сироп ---------- */
function onSyrup(x, z) { for (const s of SYRUP) if ((x - s.x) ** 2 + (z - s.z) ** 2 < s.r * s.r) return true; return false; }

/* ---------- Ефекти на гравці ---------- */
function funSpeedMul() { return (FUN.scald > 0 ? 1.8 : 1) * (FUN.matcha > 0 ? .32 : 1) * (FUN.jam > 0 ? 1.9 : 1); }
function funInput(mx, mz, dt) {
  if (FUN.scald > 0) {
    FUN.chaosT -= dt; if (FUN.chaosT <= 0) { FUN.chaosT = rand(.25, .5); FUN.chaosA = rand(-1.6, 1.6); }
    const l = Math.hypot(mx, mz);
    if (l < .1) { const a = pl.face + FUN.chaosA * .6; mx = Math.sin(a); mz = Math.cos(a); }   // бігає сам
    else { const a = Math.atan2(mx, mz) + FUN.chaosA; mx = Math.sin(a) * l; mz = Math.cos(a) * l; }
  }
  if (FUN.matcha > 0) {                                    // «гумове» керування із затримкою
    const k = 1 - Math.exp(-dt * 1.4);
    FUN.lagX += (mx - FUN.lagX) * k; FUN.lagZ += (mz - FUN.lagZ) * k; mx = FUN.lagX; mz = FUN.lagZ;
  } else { FUN.lagX = mx; FUN.lagZ = mz; }
  return [mx, mz];
}
function setFunOverlay() {
  const o = $('#funfx'); if (!o) return;
  o.className = FUN.matcha > 0 ? 'matcha' : FUN.scald > 0 ? 'scald' : FUN.jam > 0 ? 'jam' : '';
  document.body.classList.toggle('jamwob', FUN.jam > 0);
}
function getScalded(from) {
  FUN.scald = 4; pl.buffs.speed = 0;
  bubble(pl, pick(['АЙ! ГАРЯЧЕ!', 'Хто це зробив?!', 'Ааааа, кава!']), true, 2.4);
  ftext(pl.x, 2.6, pl.z, 'Ошпарився!' + (from ? ' (' + from + ')' : ''), 'bad'); burst(pl.x, 1.6, pl.z, '#8C5A3C', 16, 3, .7, 3); sfx('hurt'); shake = .3;
  setFunOverlay();
}
function getMatcha(from) {
  FUN.matcha = 15; FUN.scald = 0;
  bubble(pl, pick(['Ого… руки…', 'Чуєш, як трава росте?', 'Все таке… зелене…']), false, 3);
  ftext(pl.x, 2.6, pl.z, 'Спешл-Матча' + (from ? ' від ' + from : '') + '…', 'calm'); burst(pl.x, 1.6, pl.z, '#7FE08A', 22, 2, 1.4, 1);
  setFunOverlay();
}
function funJamaica() {
  FUN.jam = 10; ftext(pl.x, 2.6, pl.z, 'ЯМАЙСЬКИЙ СПІДБУСТ!', 'gold'); burst(pl.x, 1.5, pl.z, '#7FE08A', 14, 3, .7, 2); setFunOverlay();
}
function knockMe(a, f, src) {
  if (pl.dead || pl.jump) return;
  if (pl.ride) { const b = pl.ride; b.vx += Math.sin(a) * f * .9; b.vz += Math.cos(a) * f * .9; return; }
  pl.kx = (pl.kx || 0) + Math.sin(a) * f; pl.kz = (pl.kz || 0) + Math.cos(a) * f;
  pl.iframes = Math.max(pl.iframes, .15);
  if (src) ftext(pl.x, 2.4, pl.z, src, 'bad');
}

/* ---------- Сітка: що прилетіло від інших гравців ---------- */
function funNetMsg(m) {
  if (m.t === 'hit') {
    const who = m.name || 'хтось';
    if (m.k === 'coffee') getScalded(who);
    else if (m.k === 'matcha') getMatcha(who);
    else if (m.k === 'shove') { knockMe(m.a || 0, Math.min(30, m.f || 10), `Бац від ${who}!`); sfx('hit'); shake = .25; }
    else if (m.k === 'pull') { knockMe(angTo(pl.x, pl.z, m.x, m.z), Math.min(30, m.f || 16), `${who} тягне вантузом!`); sfx('throw'); }
    else if (m.k === 'blast') { knockMe(angTo(m.x, m.z, pl.x, pl.z), 16, 'Вибух!'); }
    return true;
  }
  if (m.t === 'wfx') {
    if (m.k === 'fan' && FANS[m.i]) { switchFan(FANS[m.i], false); toast(`🌀 ${escapeHTML(m.name || '')} увімкнув вентилятор на мосту!`); }
    if (m.k === 'boom' && m.x != null) { const d = dist2(pl.x, pl.z, m.x, m.z); if (d < 4.5) { knockMe(angTo(m.x, m.z, pl.x, pl.z), 18 * (1 - d / 6), 'БАБАХ!'); hurtPlayer(5); } }
    return true;
  }
  return false;
}
function remotesNear(x, z, r) { return NET.on ? Object.values(NET.players).filter(p => dist2(p.x, p.z, x, z) < r) : []; }

/* ---------- Ближній бій: тімейти, візки, баки ---------- */
function funMelee(range, arc, h, kbM) {
  let any = false;
  const f = Math.min(26, (h.kb || 2) * 1.3 * kbM + 4);
  for (const r of remotesNear(pl.x, pl.z, range + 1)) {
    if (!inArc(pl.x, pl.z, pl.face, r.x, r.z, range + .4, arc)) continue;
    const a = angTo(pl.x, pl.z, r.x, r.z);
    netSend({ t: 'hit', to: r.id, k: 'shove', a, f });
    ftext(r.x, 2.4, r.z, 'Бац!', 'crit'); burst(r.x, 1.2, r.z, '#FFF3E6', 6, 3, .4, 2); any = true;
  }
  for (const b of BODIES) {
    if (b.fall || b === pl.ride || !inArc(pl.x, pl.z, pl.face, b.x, b.z, range + b.r, arc)) continue;
    const a = angTo(pl.x, pl.z, b.x, b.z), k = f * (b.ride ? .8 : 1.15);
    b.vx += Math.sin(a) * k; b.vz += Math.cos(a) * k; b.spin = 8; any = true;
    ftext(b.x, 1.6, b.z, b.ride ? 'Поїхали!' : 'Удар!', 'crit');
  }
  return any;
}

/* ---------- Їзда ---------- */
function chairRide() { return !!pl.ride; }
function mount(b) {
  pl.ride = b; b.vx = b.vz = 0; pl.x = b.x; pl.z = b.z; pl.dashT = 0; pl.pending = null;
  toast(b.kind === 'cart' ? '🛒 Візок! WASD — розганяйся, F — злізти. Тімейт може штовхнути тебе ударом.' : '🪑 Крісло на коліщатках! WASD — їдь, F — встати.');
  sfx('jump');
}
function dismount(push) {
  const b = pl.ride; if (!b) return;
  pl.ride = null; pl.y = 0; pl.vy = 0;
  if (push) { pl.kx = b.vx * .6; pl.kz = b.vz * .6; }
  hero.body.position.y = 0;
}
function updRide(dt) {
  const b = pl.ride;
  const [mx, mz] = funInput(input.mx, input.mz, dt);
  const slip = onSyrup(b.x, b.z) || terrainAt(b.x, b.z) === 'ice';
  const acc = (b.kind === 'cart' ? 11 : 9) * funSpeedMul() * (slip ? .6 : 1);
  b.vx += mx * acc * dt; b.vz += mz * acc * dt;
  const fr = Math.exp(-(slip ? .15 : .55) * dt); b.vx *= fr; b.vz *= fr;
  const sp = Math.hypot(b.vx, b.vz), max = 13;
  if (sp > max) { b.vx *= max / sp; b.vz *= max / sp; }
  if (pl.kx) { b.vx += pl.kx * .5; b.vz += pl.kz * .5; pl.kx = pl.kz = 0; }
  moveBody(b, dt);
  pl.x = b.x; pl.z = b.z; pl.y = b.kind === 'cart' ? .55 : .25; pl.moving = sp > .5; pl.vx = b.vx; pl.vz = b.vz;
  if (sp > .4) pl.face = lerpAng(pl.face, Math.atan2(b.vx, b.vz), Math.min(1, dt * (slip ? 2 : 6)));
  b.face = pl.face; b.m.rotation.y = b.face + (b.kind === 'chair' ? Math.PI : 0);
  if (b.kind === 'chair') b.m.rotation.y += Math.sin(gameTime * 3) * Math.min(.6, sp * .05);
  if (sp > 3 && Math.random() < dt * 10) burst(b.x, .1, b.z, slip ? '#FFA94D' : '#FFF3E6', 1, .6, .3, .3);
  if (b.fall) {   // вилетіли за край
    pl.ride = null; pl.falling = true; pl.vy = 3; pl.fx = b.vx * .7; pl.fz = b.vz * .7; pl.y = 0;
    ftext(pl.x, 2.4, pl.z, 'Вилетів на повороті!', 'big'); sfx('fall');
  }
  pl.walkPh += 0; pl.gliding = false;
  const isl = islandAt(pl.x, pl.z); if (isl && isl !== curZone) { curZone = isl; showZone(isl.n, isl.sub); }
}

/* ---------- Фізика візків, крісел, баків ---------- */
function moveBody(b, dt) {
  if (b.fall) return;
  const sp = Math.hypot(b.vx, b.vz);
  b.x += b.vx * dt; b.z += b.vz * dt;
  if (b !== (pl.ride || null)) { const fr = Math.exp(-(onSyrup(b.x, b.z) ? .3 : b.ride ? 1.6 : 1.1) * dt); b.vx *= fr; b.vz *= fr; }
  // перешкоди: відскок
  for (const o of STATICS) {
    if ((o.h != null && o.h < .5)) continue;
    const dx = b.x - o.x, dz = b.z - o.z, d = Math.hypot(dx, dz), min = o.r + b.r;
    if (d < min && d > 1e-4) {
      const nx = dx / d, nz = dz / d; b.x = o.x + nx * min; b.z = o.z + nz * min;
      const vn = b.vx * nx + b.vz * nz; if (vn < 0) { b.vx -= 1.6 * vn * nx; b.vz -= 1.6 * vn * nz; if (-vn > 4) { sfx('hit', b.x, b.z); shake = Math.max(shake, .1); } }
    }
  }
  if (sp > 3) {
    for (const p of PROPS) if (p.alive && dist2(b.x, b.z, p.x, p.z) < p.r + b.r) { damageProp(p, sp * 2.2, 'knock'); b.vx *= .7; b.vz *= .7; }
    const now = gameTime;
    for (const m of MON) {
      if (m.calm || m.state === 'fall' || m.carried || m.T.dummy && !b.ride) continue;
      if (dist2(b.x, b.z, m.x, m.z) > b.r + .55 || now - (b.hitT.get(m) || -9) < .8) continue;
      b.hitT.set(m, now);
      const a = angTo(b.x, b.z, m.x, m.z), f = sp * 1.5;
      applyHit(m, sp * 1.6, Math.sin(a) * f * m.mass, Math.cos(a) * f * m.mass); m.stun = Math.max(m.stun, 1.2);
      b.vx *= .82; b.vz *= .82;
      burst(m.x, 1.2, m.z, '#FFE27A', 8, 3, .5, 2); sfx('crit', m.x, m.z); shake = Math.max(shake, .2);
      if (Math.random() < .55) dropLoot(m.x, m.z, [{ k: 'coins', d: randi(1, 4) }]);
      b.strike = b.strike.filter(t => now - t < 1.6); b.strike.push(now);
      ftext(m.x, 2.4, m.z, b.strike.length >= 3 ? 'СТРАЙК! 🎳' : b.ride ? 'Кеглі!' : 'ГОЛ!', b.strike.length >= 3 ? 'big' : 'crit');
      if (b.strike.length === 3) { addXP(30, m.x, m.z); dropLoot(m.x, m.z, [{ k: 'coins', d: 15 }]); }
    }
    for (const o of BODIES) {
      if (o === b || o.fall) continue;
      const d = dist2(b.x, b.z, o.x, o.z); if (d > b.r + o.r || d < 1e-4) continue;
      const a = angTo(b.x, b.z, o.x, o.z); o.vx += Math.sin(a) * sp * .8; o.vz += Math.cos(a) * sp * .8; b.vx *= .6; b.vz *= .6; o.spin = 6;
    }
  }
  if (!onGround(b.x, b.z, .05) || isWet(terrainAt(b.x, b.z))) { b.fall = true; b.vy = 2; b.respT = 4; sfx('fall', b.x, b.z); }
}
function updBodies(dt) {
  for (const b of BODIES) {
    if (b.fall) {
      b.vy -= 25 * dt; b.y += b.vy * dt; b.x += b.vx * dt; b.z += b.vz * dt; b.m.rotation.x += dt * 4;
      b.respT -= dt;
      if (b.respT <= 0 && dist2(pl.x, pl.z, b.hx, b.hz) > 2) { b.fall = false; b.x = b.hx; b.z = b.hz; b.y = 0; b.vx = b.vz = b.vy = 0; b.m.rotation.set(0, 0, 0); burst(b.x, .5, b.z, '#FFFFFF', 10, 2, .5, 2); }
    } else if (b !== pl.ride) {
      moveBody(b, dt);
      if (b.spin > 0) { b.m.rotation.y += b.spin * dt; b.spin = Math.max(0, b.spin - dt * 8); }
    }
    b.m.position.set(b.x, b.y, b.z);
  }
}

/* ---------- Вентилятори ---------- */
function switchFan(f, broadcast) {
  f.on = 10; f.led.material = mat('#7FE08A', { emissive: '#7FE08A', emissiveIntensity: 1.2 });
  if (broadcast) netSend({ t: 'wfx', k: 'fan', i: f.i });
  sfx('whoosh', f.x, f.z);
}
function updFans(dt) {
  for (const f of FANS) {
    if (f.on <= 0) { f.blades.rotation.z += dt * .3; continue; }
    f.on -= dt; f.blades.rotation.z += dt * 30;
    if (f.on <= 0) f.led.material = mat('#666677');
    const ux = Math.sin(f.dir), uz = Math.cos(f.dir), br = f.br;
    const inWind = (x, z) => {   // ділянка мосту біля вентилятора
      const px = x - br.ax, pz = z - br.az, t = px * br.dx + pz * br.dz;
      if (t < -1.5 || t > 6.5) return false;
      const side = (x - f.x) * ux + (z - f.z) * uz; return side > -.5 && side < 9;
    };
    if (Math.random() < dt * 20) { const t = rand(-1, 6), s = rand(0, 6); burst(br.ax + br.dx * t + ux * (s - 3), rand(.4, 1.8), br.az + br.dz * t + uz * (s - 3), '#FFFFFF', 1, .3, .5, .2); }
    const F = 8.5;
    if (!pl.dead && !pl.jump && inWind(pl.x, pl.z) && pl.y < 1.5) { if (pl.ride) { pl.ride.vx += ux * F * 1.2 * dt; pl.ride.vz += uz * F * 1.2 * dt; } else { pl.x += ux * F * dt; pl.z += uz * F * dt; } if (!f.warn || gameTime - f.warn > 2) { f.warn = gameTime; ftext(pl.x, 2.4, pl.z, 'Здуває!', 'bad'); } }
    for (const m of MON) if (!m.calm && m.state !== 'fall' && !m.carried && inWind(m.x, m.z)) { m.vx += ux * 40 * dt; m.vz += uz * 40 * dt; }
    for (const b of BODIES) if (!b.fall && b !== pl.ride && inWind(b.x, b.z)) { b.vx += ux * 14 * dt; b.vz += uz * 14 * dt; }
  }
}

/* ---------- Вибух кавоварки ---------- */
function funBoom(x, z, R, net) {
  ringFX(x, z, R, '#FFE8D6', .6); burst(x, 1, z, '#8C5A3C', 26, 7, 1.2, 6); burst(x, 1.2, z, '#FFFFFF', 18, 5, 1, 4);
  sfx('boom', x, z); shake = Math.max(shake, .5);
  ftext(x, 2.2, z, 'КАВОВИЙ БАБАХ!', 'big');
  for (const m of MON) {
    if (m.calm || m.state === 'fall' || m.carried) continue;
    const d = dist2(m.x, m.z, x, z); if (d > R) continue;
    const a = angTo(x, z, m.x, m.z), f = 20 * (1 - d / (R + 1));
    applyHit(m, 14, Math.sin(a) * f, Math.cos(a) * f); m.stun = Math.max(m.stun, 1.4);
  }
  for (const b of BODIES) { const d = dist2(b.x, b.z, x, z); if (!b.fall && d < R && b !== pl.ride) { const a = angTo(x, z, b.x, b.z); b.vx += Math.sin(a) * 14; b.vz += Math.cos(a) * 14; b.spin = 10; } }
  const dp = dist2(pl.x, pl.z, x, z);
  if (dp < R) { knockMe(angTo(x, z, pl.x, pl.z), 18 * (1 - dp / (R + 1.5))); hurtPlayer(6); }
  if (net) netSend({ t: 'wfx', k: 'boom', x, z });
}

/* ---------- Вантуз-гарпун ---------- */
function fireHook(h) {
  aimFace();
  const m = new THREE.Group();
  put(m, mesh(new THREE.ConeGeometry(.22, .22, 10, 1, true), mat('#E8505B', { side: THREE.DoubleSide })), 0, 0, 0).rotation.x = -Math.PI / 2;
  put(m, mesh(flat(new THREE.CylinderGeometry(.03, .03, .5, 5)), '#C4956A'), 0, 0, -.3).rotation.x = Math.PI / 2;
  scene.add(m);
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
  const line = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: '#4E4A6E' })); line.frustumCulled = false; scene.add(line);
  HOOKS.push({ x: pl.x, z: pl.z, y: pl.y + 1.1, vx: Math.sin(pl.face) * 22, vz: Math.cos(pl.face) * 22, d: 0, max: h.rng, m, line, back: false });
  sfx('throw');
}
function hookHit(k, x, z) {
  burst(x, 1.1, z, '#E8505B', 8, 2, .4, 2); sfx('hit', x, z);
}
function updHooks(dt) {
  for (let i = HOOKS.length - 1; i >= 0; i--) {
    const k = HOOKS[i];
    if (!k.back) {
      k.x += k.vx * dt; k.z += k.vz * dt; k.d += 22 * dt;
      let hit = null;
      const mon = MON.find(m => !m.calm && m.state !== 'fall' && !m.carried && dist2(k.x, k.z, m.x, m.z) < .8);
      if (mon) { const a = angTo(mon.x, mon.z, pl.x, pl.z), f = 13 + 4 / (mon.mass || 1); mon.vx = Math.sin(a) * f / Math.max(.8, mon.mass * .7); mon.vz = Math.cos(a) * f / Math.max(.8, mon.mass * .7); mon.stun = Math.max(mon.stun, .8); applyHit(mon, 2, 0, 0); ftext(mon.x, 2.3, mon.z, 'Чвак! Сюди!', 'crit'); hit = mon; }
      if (!hit) { const b = BODIES.find(b => !b.fall && b !== pl.ride && dist2(k.x, k.z, b.x, b.z) < b.r + .4); if (b) { const a = angTo(b.x, b.z, pl.x, pl.z); b.vx = Math.sin(a) * 12; b.vz = Math.cos(a) * 12; hit = b; } }
      if (!hit) { const r = remotesNear(k.x, k.z, .9)[0]; if (r) { netSend({ t: 'hit', to: r.id, k: 'pull', x: pl.x, z: pl.z, f: 18 }); ftext(r.x, 2.4, r.z, 'Попався!', 'crit'); hit = r; } }
      if (!hit && activeBosses().some(b => dist2(k.x, k.z, b.x, b.z) < b.rad + .3)) { ftext(k.x, 2, k.z, 'Не відклеюється від CEO…', 'calm'); hit = true; }
      if (hit) hookHit(hit, k.x, k.z);
      if (hit || k.d > k.max) k.back = true;
    } else {
      const a = angTo(k.x, k.z, pl.x, pl.z), d = dist2(k.x, k.z, pl.x, pl.z);
      k.x += Math.sin(a) * Math.min(d, 30 * dt); k.z += Math.cos(a) * Math.min(d, 30 * dt);
      if (d < .5) { scene.remove(k.m); scene.remove(k.line); HOOKS.splice(i, 1); continue; }
    }
    k.m.position.set(k.x, k.y, k.z); k.m.rotation.y = Math.atan2(k.vx, k.vz);
    const p = k.line.geometry.attributes.position; p.setXYZ(0, pl.x, pl.y + 1.1, pl.z); p.setXYZ(1, k.x, k.y, k.z); p.needsUpdate = true;
  }
}

/* ---------- Моб-баскетбол ---------- */
function canCarry(m) { return !m.calm && m.state !== 'fall' && !m.T.dummy && !m.carried && m.stress <= m.max * .25 + .5 && (m.mass || 1) <= 2.3; }
function pickUp(m) {
  pl.carry = m; m.carried = true; m.state = 'chase'; m.vx = m.vz = 0;
  if (m.bar) m.bar.visible = false;
  bubble(m, pick(['Поклади мене!', 'Це не за посадовою інструкцією!', 'Агов!']), true, 2);
  toast('🏀 Тримаєш моба! ЛКМ — жбурнути.'); sfx('jump');
}
function throwCarried() {
  const m = pl.carry; pl.carry = null; if (!m) return;
  aimFace();
  m.carried = false; m.y = 0; m.x = pl.x + Math.sin(pl.face) * .9; m.z = pl.z + Math.cos(pl.face) * .9;
  m.vx = Math.sin(pl.face) * 17; m.vz = Math.cos(pl.face) * 17; m.stun = 1.6; m.thrown = 1.2;
  ftext(m.x, 2.4, m.z, 'Кидок!', 'crit'); sfx('throw'); pl.swingT = .25; pl.swingKind = 2;
}
function updCarry(dt) {
  const m = pl.carry;
  if (m) {
    if (m.dead || m.calm || pl.dead || pl.falling || pl.ride) { m.carried = false; m.y = 0; pl.carry = null; }
    else { m.x = pl.x; m.z = pl.z; m.y = pl.y + 1.9; m.face = pl.face + Math.PI / 2; m.stun = 1; m.parts.root.rotation.z = Math.sin(gameTime * 9) * .2; hero.aR.rotation.x = hero.aL.rotation.x = -2.9; }
  }
  for (const t of MON) {
    if (!(t.thrown > 0)) continue;
    t.thrown -= dt; if (t.thrown <= 0) t.parts.root.rotation.z = 0;
    else t.parts.root.rotation.z += dt * 12;
    const sp = Math.hypot(t.vx, t.vz); if (sp < 3) continue;
    for (const o of MON) {
      if (o === t || o.calm || o.state === 'fall' || o.carried || dist2(o.x, o.z, t.x, t.z) > 1.1) continue;
      const a = angTo(t.x, t.z, o.x, o.z); applyHit(o, 10, Math.sin(a) * sp * 1.1, Math.cos(a) * sp * 1.1); o.stun = Math.max(o.stun, 1.3);
      t.vx *= .5; t.vz *= .5; ftext(o.x, 2.4, o.z, 'ДАНК! 🏀', 'big'); shake = Math.max(shake, .25); sfx('crit', o.x, o.z);
    }
    for (const r of remotesNear(t.x, t.z, 1)) { if (!t.netHit) { t.netHit = 1; netSend({ t: 'hit', to: r.id, k: 'shove', a: Math.atan2(t.vx, t.vz), f: 15 }); ftext(r.x, 2.4, r.z, 'Мобом по кенту!', 'crit'); } }
  }
}

/* ---------- Матча на ворогах: сидить, втикає, дропає снеки ---------- */
function chillMonster(m) {
  if (m.calm) return;
  m.chill = 18; m.chillDrop = 2; m.stun = Math.max(m.stun, 1);
  bubble(m, pick(['Ого… мої руки…', 'Дедлайн? Який дедлайн…', 'Все буде добре, чуваче.']), false, 3);
  burst(m.x, 1.6, m.z, '#7FE08A', 16, 2, 1.2, 1);
}
function updChill(dt) {
  for (const m of MON) {
    if (!(m.chill > 0) || m.calm || m.state === 'fall') continue;
    m.chill -= dt; m.stun = Math.max(m.stun, .3); m.vx *= .9; m.vz *= .9;
    m.parts.root.position.y = -.45; m.y = 0;
    if (Math.random() < dt * 3) burst(m.x, 2.2, m.z, '#B8F0C0', 1, .3, 1.2, .2);
    m.chillDrop -= dt;
    if (m.chillDrop <= 0) { m.chillDrop = 4; dropLoot(m.x, m.z, [Math.random() < .5 ? { k: 'coins', d: randi(2, 5) } : { k: 'ing', d: pick(['milk', 'beans', 'syrup', 'chamomile', 'clover']) }]); ftext(m.x, 2.4, m.z, pick(['Тримай печеньку', 'Снікерс?', 'Хочеш хавчик?']), 'gold'); }
    if (m.chill <= 0) calmMonster(m);
  }
}

/* ---------- Кава в тімейтів ---------- */
function updCupsVsRemotes() {
  if (!NET.on) return;
  for (let i = PROJ.length - 1; i >= 0; i--) {
    const p = PROJ[i]; if (p.from !== 'player' || p.kind !== 'cup') continue;
    const r = remotesNear(p.x, p.z, p.r + .45)[0]; if (!r) continue;
    const k = DRINK[p.drink] && DRINK[p.drink].chill ? 'matcha' : 'coffee';
    netSend({ t: 'hit', to: r.id, k });
    ftext(r.x, 2.6, r.z, k === 'matcha' ? 'Матча в обличчя 🍵' : 'Гаряча кава в обличчя! ☕', 'crit');
    burst(r.x, 1.6, r.z, k === 'matcha' ? '#7FE08A' : '#8C5A3C', 14, 3, .6, 3); sfx('splash', r.x, r.z);
    scene.remove(p.m); PROJ.splice(i, 1);
  }
}

/* ---------- Взаємодія (F) ---------- */
function funInteract() {
  if (pl.ride) return { l: 'Злізти', fn: () => dismount(true) };
  if (pl.carry) return { l: 'Поставити моба', fn: () => { const m = pl.carry; pl.carry = null; m.carried = false; m.y = 0; m.x = pl.x + Math.sin(pl.face); m.z = pl.z + Math.cos(pl.face); } };
  for (const b of BODIES) if (b.ride && !b.fall && dist2(pl.x, pl.z, b.x, b.z) < 1.6 && Math.abs(pl.y) < .5) return { l: b.kind === 'cart' ? 'Сісти у візок' : 'Сісти в крісло', fn: () => mount(b) };
  for (const f of FANS) if (dist2(pl.x, pl.z, f.x, f.z) < 2) return { l: f.on > 0 ? 'Вентилятор працює…' : 'Увімкнути вентилятор (хе-хе)', fn: () => { if (f.on <= 0) switchFan(f, true); } };
  const m = MON.find(m => dist2(pl.x, pl.z, m.x, m.z) < 1.8 && canCarry(m));
  if (m) return { l: 'Підняти моба 🏀', fn: () => pickUp(m) };
  return null;
}

/* ---------- Старт / цикл ---------- */
function funOnStart() {
  P.known.matcha = 1; P.known.jamaica = 1;
  if (!P.gotPlunger) { P.gotPlunger = true; const it = makeItem('plunger', 1); addItem(it, true); toast('🪠 Тобі дістався <b>Вантуз-гарпун</b> — подивись в інвентарі (E).'); }
  if (!P.ing.clover) P.ing.clover = 1;
}
function updFun(dt) {
  if (FUN.scald > 0) { FUN.scald -= dt; if (Math.random() < dt * 8) burst(pl.x, 1.8, pl.z, '#FFFFFF', 1, .4, .6, .3); if (FUN.scald <= 0) setFunOverlay(); }
  if (FUN.matcha > 0) { FUN.matcha -= dt; if (FUN.matcha <= 0) setFunOverlay(); }
  if (FUN.jam > 0) { FUN.jam -= dt; if (FUN.jam <= 0) setFunOverlay(); }
  if (!pl.ride && onSyrup(pl.x, pl.z) && pl.grounded && gameTime - FUN.slipWarn > 5) { FUN.slipWarn = gameTime; ftext(pl.x, 2.2, pl.z, 'Сироп! Ковзко!', 'calm'); }
  updBodies(dt); updFans(dt); updHooks(dt); updCarry(dt); updChill(dt); updCupsVsRemotes();
  for (const p of PROPS) if (p.gauge && p.alive) p.gauge.rotation.z = Math.sin(gameTime * 6 + p.x) * .6;
}
/* Візок під тімейтом, який катається */
function funRemoteState(r) {
  const want = r.act === 'chair';
  if (want && !r.cart) { r.cart = bodyMesh('cart'); r.cart.position.y = -.55; r.h.root.add(r.cart); }
  if (r.cart) r.cart.visible = want;
}
