/* =====================================================================
   ДОСЛІДЖЕННЯ: день і ніч, погода, відкриття, кавові точки й мапа,
   записки, розкопки, риболовля, улюбленці, комбо, компас, щоденник
   ===================================================================== */

/* ---------- День і ніч ---------- */
const DAYLEN = 420;
let dayLight = 1, nightK = 0, skyT = 0, stormT = 0, stormCd = 40;
const SKYP = { day: ['#9FAEF0', '#F6C3CB'], dusk: ['#8C7FD6', '#FFB38A'], night: ['#1F2150', '#4A3A78'] };
const _c1 = new THREE.Color(), _c2 = new THREE.Color();
function mixHex(a, b, t) { return '#' + _c1.set(a).lerp(_c2.set(b), clamp(t, 0, 1)).getHexString(); }
function updDayNight(dt) {
  P.dayT = ((P.dayT == null ? .3 : P.dayT) + dt / DAYLEN) % 1;
  const t = P.dayT;
  const l = clamp((Math.sin((t - .25) * Math.PI * 2) + .25) / 1.25, 0, 1);
  const dusk = clamp(Math.exp(-Math.pow((t - .75) / .05, 2)) + Math.exp(-Math.pow((t - .25) / .05, 2)), 0, 1);
  dayLight = l; nightK = 1 - clamp(l * 1.7, 0, 1);
  skyT -= dt; if (skyT > 0) return; skyT = .25;
  const s1 = mixHex(mixHex(SKYP.night[0], SKYP.day[0], l), SKYP.dusk[0], dusk * .75);
  const s2 = mixHex(mixHex(SKYP.night[1], SKYP.day[1], l), SKYP.dusk[1], dusk * .75);
  const root = document.documentElement.style;
  root.setProperty('--sky1', s1); root.setProperty('--sky2', s2);
  const storm = stormT > 0 && curZone && curZone.biome === 'desert';
  scene.fog.color.set(storm ? '#E2C48E' : mixHex(s2, s1, .4));
  scene.fog.near = lerp(scene.fog.near, storm ? 14 : 60, .2); scene.fog.far = lerp(scene.fog.far, storm ? 48 : 140, .2);
  sun.intensity = .12 + .62 * l; hemi.intensity = .32 + .43 * l;
  sun.color.set(mixHex('#9FB0FF', mixHex('#FFF1DE', '#FFB38A', dusk), l));
  hemi.color.set(mixHex('#8C9BFF', '#F0E8FF', l)); hemi.groundColor.set(mixHex('#3B2E5A', '#F5BBA8', l));
  $('#clock').textContent = clockStr();
}
function isNight() { return nightK > .55; }
function clockStr() { const hh = P.dayT * 24, h = Math.floor(hh), m = Math.floor((hh - h) * 6) * 10; return (isNight() ? '🌙 ' : '☀️ ') + String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'); }

/* ---------- Погода ---------- */
const WX = [];
const WXC = { snow: '#FFFFFF', sand: '#E2C48E', dust: '#EBD3A2', leaf: '#6FC08C', firefly: '#FFF3A0', spray: '#E8FBFF' };
function wxType() {
  const b = curZone && curZone.biome;
  if (b === 'snow') return 'snow';
  if (b === 'desert') return stormT > 0 ? 'sand' : 'dust';
  if (b === 'jungle') return isNight() ? 'firefly' : 'leaf';
  if (b === 'sea') return 'spray';
  if (isNight() && curZone && (curZone.id === 'park' || curZone.id === 'hub')) return 'firefly';
  return null;
}
function wxSpawn(p, type, init) {
  p.type = type; p.m.material = type === 'firefly' ? basic(WXC[type]) : basic(WXC[type], type === 'dust' ? .5 : .85);
  p.x = camLook.x + rand(-20, 20); p.z = camLook.z + rand(-16, 14);
  p.y = type === 'snow' ? (init ? rand(0, 12) : 12) : type === 'sand' || type === 'dust' ? rand(.2, 3.5) : type === 'leaf' ? (init ? rand(1, 9) : 9) : type === 'spray' ? WATER_Y : rand(.4, 2.6);
  p.vx = type === 'sand' ? rand(10, 16) : type === 'dust' ? rand(2, 4) : rand(-.4, .4); p.vy = type === 'snow' ? -rand(1.2, 2.2) : type === 'leaf' ? -rand(.6, 1.1) : type === 'spray' ? rand(.6, 1.2) : 0;
  p.ph = Math.random() * 6; p.life = type === 'spray' ? rand(.5, 1.2) : 99;
  p.m.scale.setScalar(type === 'snow' ? .6 : type === 'sand' ? .45 : type === 'leaf' ? 1 : type === 'spray' ? .5 : .5);
  if (type === 'spray') { const t = terrainAt(p.x, p.z); if (!isWet(t) && t !== 'shallow') p.life = 0; }
}
function updWeather(dt) {
  const type = wxType();
  const want = Math.round(({ snow: 80, sand: 110, dust: 16, leaf: 26, firefly: 30, spray: 22 }[type] || 0) * PMUL);
  while (WX.length < want) { const m = new THREE.Mesh(G.part, basic('#FFFFFF')); scene.add(m); const p = { m }; wxSpawn(p, type, true); WX.push(p); }
  while (WX.length > want) scene.remove(WX.pop().m);
  for (const p of WX) {
    if (p.type !== type) wxSpawn(p, type, true);
    p.ph += dt;
    if (p.type === 'firefly') { p.x += Math.sin(p.ph * .9) * dt * .6; p.z += Math.cos(p.ph * .7) * dt * .6; p.y += Math.sin(p.ph * 1.3) * dt * .3; p.m.scale.setScalar(.35 + Math.max(0, Math.sin(p.ph * 3)) * .35); }
    else if (p.type === 'leaf') { p.x += Math.sin(p.ph * 2) * dt * 1.2; p.y += p.vy * dt; p.m.rotation.x += dt * 3; p.m.rotation.z += dt * 2; }
    else { p.x += p.vx * dt + (p.type === 'snow' ? Math.sin(p.ph) * dt * .5 : 0); p.y += p.vy * dt; }
    if (p.type === 'spray') { p.life -= dt; if (p.life <= 0) wxSpawn(p, type); }
    if (p.y < -.5 || p.y > 13 || Math.abs(p.x - camLook.x) > 24 || Math.abs(p.z - camLook.z) > 20) wxSpawn(p, type);
    p.m.position.set(p.x, p.y, p.z);
  }
  // піщана буря
  if (curZone && curZone.biome === 'desert') {
    if (stormT > 0) { stormT -= dt; if (stormT <= 0) toast('Буря вщухла.'); }
    else { stormCd -= dt; if (stormCd <= 0) { stormT = 30; stormCd = rand(70, 110); banner('🌪️ Піщана буря! Нічого не видно, а без панами йти важче.'); } }
  }
}

/* ---------- Відкриття, кавові точки, записки ---------- */
let discT = 0;
function updDiscover(dt) {
  discT -= dt; if (discT > 0) return; discT = .35;
  const isl = islandAt(pl.x, pl.z);
  if (isl && !P.disc[isl.id]) {
    P.disc[isl.id] = 1;
    if (isl.id !== 'hub') { banner(`Нова місцевість: ${isl.n}`); addXP(60, pl.x, pl.z); sfx('discover'); questEvent('biome'); }
  }
  for (const L of LANDMARKS) if (!P.disc[L.id] && dist2(pl.x, pl.z, L.x, L.z) < L.r && (L.id !== 'altar' && L.id !== 'skycafe' || pl.y > 2)) { P.disc[L.id] = 1; banner(`${L.ic} ${L.n}`); toast(L.d); addXP(40, pl.x, pl.z); sfx('discover'); addHeal(regionAt(L.x, L.z), 8, pl.x, pl.z); if (L.id === 'altar') questEvent('altar'); }
  for (const w of WAYPOINTS) if (!P.wp[w.id] && dist2(pl.x, pl.z, w.x, w.z) < 2.6) { P.wp[w.id] = 1; toast(`☕ Кавова точка «${w.n}» активована. Біля будь-якої точки натисни дію, щоб перенестися.`); sfx('waypoint'); refreshWaypoints(); }
  for (const n of NOTES) if (!P.notes[n.id] && dist2(pl.x, pl.z, n.x, n.z) < 1.3 && Math.abs(pl.y - (n.y || 0)) < 1.3) readNote(n);
}
function readNote(n) {
  P.notes[n.id] = 1; if (n.mesh) n.mesh.visible = false;
  toast(`📜 <b>${n.t}</b><br>${n.d}`); addXP(25, pl.x, pl.z); sfx('page'); addHeal(regionAt(n.x, n.z), 4);
  const got = Object.keys(P.notes).length;
  if (got === NOTES.length) { banner('Усі записки зібрано! Нагорода — легендарна знахідка.'); addItem(exploreItem(40, 4)); }
  else toast(`Записок: ${got}/${NOTES.length}. Усі — у Щоденнику (J).`);
  save();
}
function refreshWaypoints() {
  for (const w of WAYPOINTS) { if (!w.halo) continue; const on = !!P.wp[w.id]; w.halo.material = basic(on ? '#8FD9C0' : '#7E77A0', on ? .95 : .5); w.cup.material = on ? glow('#FFFFFF') : mat('#C9C2DE'); }
}
function nearWaypoint() { return WAYPOINTS.find(w => dist2(pl.x, pl.z, w.x, w.z) < 2.6 && P.wp[w.id]); }
function travelTo(id) {
  const w = WAYPOINTS.find(x => x.id === id); if (!w) return;
  closePanel();
  const f = $('#fade'); f.style.opacity = 1; sfx('travel');
  setTimeout(() => {
    let px = w.x + 1.6, pz = w.z + 1.2;
    for (const [ox, oz] of [[1.6, 1.2], [-1.6, 1.2], [1.6, -1.2], [-1.6, -1.2], [0, 2]]) { if (terrainAt(w.x + ox, w.z + oz) === 'land' && !STATICS.some(o => dist2(w.x + ox, w.z + oz, o.x, o.z) < o.r + .5)) { px = w.x + ox; pz = w.z + oz; break; } }
    pl.x = px; pl.z = pz; pl.y = 0; pl.vy = 0; pl.falling = false; pl.jump = null; pl.safe = { x: px, z: pz };
    if (petF) { petF.x = px - 1; petF.z = pz - 1; }
    camPos.set(px, 20, pz + 15); camLook.set(px, .5, pz);
    f.style.opacity = 0;
  }, 260);
}

/* ---------- Розкопки ---------- */
const DIG = [];
const DIG_REGIONS = ['sea', 'sea', 'sea', 'desert', 'desert', 'desert', 'snow', 'snow', 'jungle', 'jungle', 'park', 'secret'];
function digPoint(region) {
  for (let k = 0; k < 50; k++) {
    let x, z;
    if (region === 'sea') { const L = pick(SEA_LAND); const a = Math.random() * 6.28, r = Math.random() * (L.r - 1); x = L.x + Math.cos(a) * r; z = L.z + Math.sin(a) * r; }
    else { const s = ISLMAP[region]; const a = Math.random() * 6.28, r = 1 + Math.random() * (s.r - 2.2); x = s.x + Math.cos(a) * r; z = s.z + Math.sin(a) * r; }
    if (terrainAt(x, z) !== 'land' || inCorridor(x, z)) continue;
    if (STATICS.some(o => dist2(x, z, o.x, o.z) < o.r + .8)) continue;
    if (PROPS.some(p => dist2(x, z, p.x, p.z) < 1.2) || DIG.some(d => d.active && dist2(x, z, d.x, d.z) < 3)) continue;
    if (PADS.some(p => dist2(x, z, p.x, p.z) < 1.5) || WAYPOINTS.some(p => dist2(x, z, p.x, p.z) < 2)) continue;
    return { x, z };
  }
  return null;
}
function spawnDig(d) {
  const p = digPoint(d.region); if (!p) { d.t = 10; return; }
  d.x = p.x; d.z = p.z; d.active = true;
  if (!d.mesh) {
    const g = new THREE.Group();
    const a = mesh(new THREE.BoxGeometry(.9, .03, .16), '#9A6644', false); a.rotation.y = .78; g.add(a);
    const b = mesh(new THREE.BoxGeometry(.9, .03, .16), '#9A6644', false); b.rotation.y = -.78; g.add(b);
    const sp = mesh(new THREE.OctahedronGeometry(.12, 0), glow('#FFF3A0'), false); sp.position.y = .45; g.add(sp);
    d.mesh = g; d.sp = sp; scene.add(g);
  }
  d.mesh.position.set(d.x, .03, d.z); d.mesh.visible = true;
}
function initDig() { DIG_REGIONS.forEach(region => { const d = { region, active: false, t: 0 }; DIG.push(d); spawnDig(d); }); }
function updDig(dt) {
  for (const d of DIG) {
    if (!d.active) { d.t -= dt; if (d.t <= 0) spawnDig(d); continue; }
    d.sp.rotation.y += dt * 3; d.sp.position.y = .45 + Math.sin(gameTime * 4 + d.x) * .08;
    d.sp.scale.setScalar(.8 + (Math.sin(gameTime * 5 + d.z) > .7 ? .6 : 0) + nightK * .4);
  }
  if (pl.dig) {
    pl.dig.t -= dt;
    if (Math.floor(pl.dig.t * 6) !== pl.dig.last) { pl.dig.last = Math.floor(pl.dig.t * 6); burst(pl.dig.d.x, .2, pl.dig.d.z, '#C9A66B', 3, 2, .4, 2); }
    if (pl.dig.t <= 0) finishDig(pl.dig.d);
  }
}
function startDig(d) { pl.dig = { d, t: .9, last: -1 }; pl.lock = .9; pl.face = angTo(pl.x, pl.z, d.x, d.z); sfx('dig'); }
function finishDig(d) {
  pl.dig = null; d.active = false; d.mesh.visible = false; d.t = 50;
  burst(d.x, .4, d.z, '#C9A66B', 18, 3, .8, 4); sfx('chest');
  const loot = [{ k: 'coins', d: randi(6, 22) }, { k: 'ing', d: pick(Object.keys(ING)) }];
  const arch = S.fx.has('dig'), crab = P.pet === 'crab';
  if (Math.random() < .32 + (arch ? .18 : 0)) loot.push({ k: 'item', d: Math.random() < .5 ? exploreItem(4) : randomItem(4) });
  if (arch && Math.random() < .5) loot.push({ k: 'coins', d: randi(10, 30) });
  if (crab) { loot.push({ k: 'ing', d: pick(Object.keys(ING)) }); loot.push({ k: 'coins', d: randi(5, 15) }); }
  if (Math.random() < .07) loot.push({ k: 'case', d: Math.random() < .3 ? 'deadline' : 'intern' });
  if (Math.random() < .06) loot.push({ k: 'recipe' });
  dropLoot(d.x, d.z, loot);
  addXP(15, d.x, d.z); questEvent('dig'); addHeal(regionAt(d.x, d.z), 3, d.x, d.z); save();
}
function exploreItem(bonus = 0, minR = 1) { const it = makeItem(pick(EXPLORE_KEYS), Math.max(minR, rollRarity(bonus))); return it; }

/* ---------- Риболовля ---------- */
let fishing = null;
const JUNK = [{ n: 'Старий черевик', ic: '🥾' }, { n: 'Чашка «Найкращий працівник»', ic: '☕' }, { n: 'Загублений бейдж', ic: '📛' }, { n: 'Мокрий степлер', ic: '📎' }];
function nearFishSpot() { return FISH_SPOTS.find(f => dist2(pl.x, pl.z, f.x, f.z) < 2.2 && Math.abs(pl.y) < .6); }
function startFishing(f) {
  if (fishing) return;
  fishing = { f, phase: 'wait', t: 0, biteAt: rand(2.4, 6) * (P.pet === 'penguin' ? .5 : 1), hp: pl.hp, needle: 0, dir: 1 };
  pl.face = angTo(pl.x, pl.z, f.wx, f.wz); pl.swingT = .22;
  $('#fishui').hidden = false; $('#fbar').style.visibility = 'hidden';
  $('#fishtxt').textContent = 'Закинув вудку… чекай поклювки';
  $('#freel').textContent = IS_TOUCH ? 'Тягни!' : 'Тягни! (E / Пробіл)';
  sfx('cast');
}
function stopFishing(msg) { if (!fishing) return; fishing = null; $('#fishui').hidden = true; if (msg) ftext(pl.x, 2.4, pl.z, msg); }
function rollCatch(kind) {
  const r = Math.random();
  if (r < .1) return { type: 'junk', ...pick(JUNK), diff: 0 };
  if (r < .16) return { type: 'treasure', n: 'Скарб із дна', ic: '💎', diff: 3 };
  const pool = FISH.filter(f => f.spots.includes(kind) && (!f.night || isNight()));
  const L = S.luck || 3;
  const w = pool.map(f => [50, 30, 15, 6, 2.2, .5][f.r] * (1 + L * .04 * f.r));
  let t = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) { t -= w[i]; if (t <= 0) return { type: 'fish', fish: pool[i], n: pool[i].n, ic: pool[i].ic, diff: pool[i].r }; }
  return { type: 'fish', fish: pool[0], n: pool[0].n, ic: pool[0].ic, diff: pool[0].r };
}
function updFishing(dt) {
  const F = fishing; if (!F) return;
  const bob = F.f.bob;
  if (Math.hypot(input.mx, input.mz) > .2 || pl.hp < F.hp - .5 || pl.dead) { stopFishing('Вудку змотано'); return; }
  if (F.phase === 'wait') {
    F.t += dt; bob.position.y = WATER_Y + (F.f.kind === 'ice' ? .2 : 0) + Math.sin(gameTime * 3) * .04;
    if (F.t >= F.biteAt) {
      F.phase = 'bite'; F.c = rollCatch(F.f.kind); F.biteT = 0;
      F.speed = .75 + F.c.diff * .3; F.w = clamp(.34 - F.c.diff * .045, .13, .34); F.z0 = rand(.05, .95 - F.w);
      $('#fzone').style.left = (F.z0 * 100) + '%'; $('#fzone').style.width = (F.w * 100) + '%';
      $('#fbar').style.visibility = 'visible';
      $('#fishtxt').textContent = 'КЛЮЄ! Тягни, коли стрілка в зеленій зоні';
      sfx('bite'); burst(F.f.wx, .1, F.f.wz, '#FFFFFF', 8, 2, .5, 2);
    }
  } else if (F.phase === 'bite') {
    F.biteT += dt; bob.position.y = WATER_Y - .12 + Math.sin(gameTime * 18) * .06;
    F.needle += F.dir * F.speed * dt; if (F.needle > 1) { F.needle = 1; F.dir = -1; } if (F.needle < 0) { F.needle = 0; F.dir = 1; }
    $('#fneedle').style.left = (F.needle * 100) + '%';
    if (F.biteT > 5) { F.phase = 'done'; F.t = 0; $('#fishtxt').textContent = 'Риба зірвалася. Дія — закинути ще'; sfx('escape'); }
  } else if (F.phase === 'done') {
    F.t += dt; $('#fbar').style.visibility = 'hidden';
  }
}
function reelFish() {
  const F = fishing; if (!F) return;
  if (F.phase === 'done') { const f = F.f; fishing = null; startFishing(f); return; }
  if (F.phase === 'wait') { F.biteAt = F.t + rand(1.5, 3); $('#fishtxt').textContent = 'Зарано! Ти сполохав рибу… чекай'; sfx('escape'); return; }
  const ok = F.needle >= F.z0 && F.needle <= F.z0 + F.w;
  F.phase = 'done'; F.t = 0;
  if (!ok) { $('#fishtxt').textContent = 'Зірвалася! Дія — закинути ще'; sfx('escape'); return; }
  sfx('catch'); burst(F.f.wx, .3, F.f.wz, '#BDEFFF', 14, 3, .7, 4);
  const c = F.c;
  if (c.type === 'fish') {
    const first = !P.fishSeen[c.fish.id];
    P.fish[c.fish.id] = (P.fish[c.fish.id] || 0) + 1; P.fishSeen[c.fish.id] = (P.fishSeen[c.fish.id] || 0) + 1;
    $('#fishtxt').innerHTML = `${c.ic} <b class="t${c.fish.r}">${c.n}</b>${first ? ' — новий вид!' : ''} · Дія — ще раз`;
    if (first) { banner(`Новий вид: ${c.ic} ${c.n}`); addXP(30 + c.fish.r * 20, pl.x, pl.z); } else addXP(8 + c.fish.r * 4);
    if (c.fish.r >= 4) sfx('legend');
    questEvent('fish'); addHeal(regionAt(pl.x, pl.z), 1.5);
  } else if (c.type === 'junk') {
    $('#fishtxt').innerHTML = `${c.ic} ${c.n}… Ну, теж улов. · Дія — ще раз`;
    if (Math.random() < .5) { P.ing.tape = (P.ing.tape || 0) + 1; toast('🩹 Зате приклеєний скотч!'); } else { P.coins += 4; }
  } else {
    const unread = NOTES.filter(n => !P.notes[n.id]);
    if (unread.length && Math.random() < .35) { $('#fishtxt').innerHTML = '🍾 Пляшка з посланням! · Дія — ще раз'; readNote(pick(unread)); }
    else { $('#fishtxt').innerHTML = '💎 Скарб із дна! · Дія — ще раз'; dropLoot(pl.x, pl.z, [Math.random() < .7 ? { k: 'item', d: exploreItem(8, 2) } : { k: 'case', d: 'vacation' }]); }
  }
  refreshHUD(); save();
}

/* ---------- Улюбленці ---------- */
const PETW = {};
let petF = null;
function initPets() {
  for (const id in PETDEF) {
    if (P.pets[id]) continue;
    const d = PETDEF[id], h = buildPet(id);
    h.root.position.set(d.x, 0, d.z); scene.add(h.root);
    PETW[id] = { id, h, x: d.x, z: d.z, y: 0, bh: 1.5, dead: false, ph: Math.random() * 6 };
  }
  if (P.pet) setActivePet(P.pet, true);
}
function tamePet(id) {
  const d = PETDEF[id], w = PETW[id]; if (!w) return;
  const k = ['latte', 'flat', 'raf', 'icelatte', 'saltraf'].find(k => (P.drinks[k] || 0) > 0);
  if (!k) { bubble(w, '☕?', false, 2); toast(`${d.ic} ${d.n} хоче кави. Принеси будь-який заспокійливий напій.`); return; }
  P.drinks[k]--; P.pets[id] = 1;
  scene.remove(w.h.root); w.dead = true; delete PETW[id];
  banner(`${d.ic} ${d.n} тепер з тобою!`); toast(d.d); sfx('tame');
  burst(w.x, 1, w.z, '#FFB3C7', 20, 3, 1, 4);
  questEvent('tame'); setActivePet(id); addXP(50); save();
}
function setActivePet(id, silent) {
  if (petF) { scene.remove(petF.h.root); petF.dead = true; petF = null; }
  P.pet = id || null;
  if (id) { const h = buildPet(id); scene.add(h.root); petF = { id, h, x: pl.x - 1.2, z: pl.z - 1.2, y: 0, ph: 0, bh: 1.4, dead: false, face: 0 }; if (!silent) toast(`${PETDEF[id].ic} ${PETDEF[id].n} йде з тобою.`); }
  if (running) calcStats();
}
function updPets(dt) {
  for (const id in PETW) {
    const w = PETW[id]; w.ph += dt;
    w.h.body.position.y = Math.abs(Math.sin(w.ph * 2)) * .06;
    if (dist2(pl.x, pl.z, w.x, w.z) < 6) w.h.root.rotation.y = lerpAng(w.h.root.rotation.y, angTo(w.x, w.z, pl.x, pl.z), dt * 3);
    if (Math.random() < dt * .08 && dist2(pl.x, pl.z, w.x, w.z) < 7) bubble(w, pick(['☕?', 'Пахне кавою…', '…', 'Можна латте?']), false, 2);
  }
  const p = petF; if (!p) return;
  const bx = pl.x - Math.sin(pl.face) * 1.5 + Math.cos(pl.face) * .8, bz = pl.z - Math.cos(pl.face) * 1.5 - Math.sin(pl.face) * .8;
  const d = dist2(p.x, p.z, bx, bz);
  if (d > 20 || pl.jump) { if (!pl.jump) { p.x = bx; p.z = bz; } }
  else if (d > .4) {
    const sp = Math.min(d * 3, 9), a = angTo(p.x, p.z, bx, bz);
    p.x += Math.sin(a) * sp * dt; p.z += Math.cos(a) * sp * dt; p.face = a; p.ph += dt * 10;
  }
  const t = terrainAt(p.x, p.z);
  const gy = pl.y > .5 && dist2(p.x, p.z, pl.x, pl.z) < 3 ? pl.y : isWet(t) ? -.5 : t === 'shallow' ? -.25 : 0;
  p.y = lerp(p.y, gy, Math.min(1, dt * 8));
  p.h.root.position.set(p.x, p.y, p.z);
  p.h.root.rotation.y = lerpAng(p.h.root.rotation.y, p.face, Math.min(1, dt * 8));
  p.h.body.position.y = d > .4 ? Math.abs(Math.sin(p.ph)) * .14 : 0;
  if (p.id === 'capy') {
    for (const m of MON) if (!m.calm && m.state !== 'fall' && dist2(m.x, m.z, p.x, p.z) < 4) m.stress = Math.max(m.max * .25, m.stress - 1.5 * dt);
    for (const dr of DROPS) if (dr.age > .35 && dist2(dr.x, dr.z, pl.x, pl.z) < 4.5) { dr.x = lerp(dr.x, pl.x, dt * 6); dr.z = lerp(dr.z, pl.z, dt * 6); dr.m.position.x = dr.x; dr.m.position.z = dr.z; }
    if (Math.random() < dt * .03) bubble(p, pick(['Спокій.', '…хрум…', 'Ок.']), false, 1.8);
  }
}

/* ---------- Комбо ---------- */
function comboMul() { return 1 + Math.min(pl.combo || 0, 25) * .012; }
function addCombo() {
  pl.combo = (pl.combo || 0) + 1; pl.comboT = 1.8;
  if ([10, 25, 50, 100].includes(pl.combo)) { ftext(pl.x, 2.9, pl.z, 'Флоу ×' + pl.combo + '!', 'crit'); sfx('combo'); }
  refreshCombo();
}
function updCombo(dt) { if (pl.comboT > 0) { pl.comboT -= dt; if (pl.comboT <= 0) { pl.combo = 0; refreshCombo(); } } }
function refreshCombo() {
  const el = $('#combo');
  if ((pl.combo || 0) < 3) { el.hidden = true; return; }
  el.hidden = false; el.innerHTML = `×${pl.combo}<small>комбо · +${Math.round((comboMul() - 1) * 100)}%</small>`;
  el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
}

/* ---------- Стрілки: компас і нюх краба ---------- */
let cArrow = null, dArrow = null;
function makeArrow(c) { const g = new THREE.Group(); const m = mesh(new THREE.ConeGeometry(.2, .5, 4), glow(c), false); m.rotation.x = Math.PI / 2; m.position.z = 2.1; g.add(m); scene.add(g); g.visible = false; return g; }
function updArrows() {
  if (!cArrow) { cArrow = makeArrow('#7FE3D0'); dArrow = makeArrow('#E9C98F'); }
  cArrow.visible = false; dArrow.visible = false;
  if (pl.falling) return;
  if (S.fx.has('compass')) {
    let best = null, bd = 1e9;
    for (const L of LANDMARKS) if (!P.disc[L.id]) { const d = dist2(pl.x, pl.z, L.x, L.z); if (d < bd) { bd = d; best = L; } }
    for (const n of NOTES) if (!P.notes[n.id]) { const d = dist2(pl.x, pl.z, n.x, n.z); if (d < bd) { bd = d; best = n; } }
    if (best && bd > 2) { cArrow.visible = true; cArrow.position.set(pl.x, pl.y + .25, pl.z); cArrow.rotation.y = angTo(pl.x, pl.z, best.x, best.z); }
  }
  if (P.pet === 'crab') {
    let best = null, bd = 40;
    for (const d of DIG) if (d.active) { const dd = dist2(pl.x, pl.z, d.x, d.z); if (dd < bd) { bd = dd; best = d; } }
    if (best && bd > 1.5) { dArrow.visible = true; dArrow.position.set(pl.x, pl.y + .3, pl.z); dArrow.rotation.y = angTo(pl.x, pl.z, best.x, best.z); }
  }
}

/* ---------- Анімація маркерів ---------- */
function updMarkers(dt) {
  for (const n of NOTES) if (n.paper && n.mesh.visible) { n.paper.rotation.y += dt * 1.5; n.paper.position.y = .8 + Math.sin(gameTime * 2 + n.x) * .06; }
  for (const w of WAYPOINTS) if (w.halo) { w.halo.rotation.z += dt; w.cup.position.y = 1.75 + Math.sin(gameTime * 2 + w.x) * .08; if (P.wp[w.id] && Math.random() < dt * 2) burst(w.x, 2.1, w.z, '#FFFFFF', 1, .2, 1, 1, .6); }
  for (const f of FISH_SPOTS) if (f.bob && (!fishing || fishing.f !== f)) f.bob.position.y = WATER_Y + (f.kind === 'ice' ? .2 : 0) + Math.sin(gameTime * 2 + f.x) * .04;
}

/* ---------- Головне оновлення дослідження ---------- */
function updExplore(dt) {
  updDayNight(dt); updWeather(dt); updDiscover(dt); updDig(dt); updFishing(dt); updPets(dt); updCombo(dt); updArrows(); updMarkers(dt);
  updBiomeAnim(gameTime, dt, nightK);
}

/* ---------- Мапа ---------- */
function renderMap() {
  const w = nearWaypoint();
  const list = WAYPOINTS.map(x => `<button class="btn ${P.wp[x.id] ? '' : 'alt'}" data-act="travel" data-arg="${x.id}" ${w && P.wp[x.id] && x.id !== w.id ? '' : 'disabled'}>☕ ${P.wp[x.id] ? x.n : '???'}</button>`).join('');
  return `<h3>Мапа світу</h3><canvas id="mapcv" width="960" height="640" style="width:100%;height:auto;border-radius:16px;background:#2E2346;display:block" aria-label="Мапа світу"></canvas>
  <p class="muted" style="font-size:13px;margin:10px 0 6px">${w ? `Ти біля кавової точки «${w.n}». Куди перенестися?` : 'Щоб переноситися, підійди до активованої кавової точки ☕ і відкрий мапу.'}</p><div class="btns">${list}</div>`;
}
function drawMap() {
  const c = $('#mapcv'); if (!c) return;
  const ctx = c.getContext && c.getContext('2d'); if (!ctx) return;
  const W = c.width, H = c.height;
  const minX = -76, maxX = 84, minZ = -58, maxZ = 80;
  ctx.save();
  const s = Math.min(W / (maxX - minX), H / (maxZ - minZ)), ox = (W - (maxX - minX) * s) / 2, oz = (H - (maxZ - minZ) * s) / 2;
  const X = x => ox + (x - minX) * s, Z = z => oz + (z - minZ) * s;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#2E2346'; ctx.fillRect(0, 0, W, H);
  ctx.lineCap = 'round';
  for (const b of BR) { const vis = b.pier || (P.disc[b.A.id] || P.disc[b.B.id]); if (!vis) continue; ctx.strokeStyle = '#C4956A'; ctx.lineWidth = b.w * s * .7; ctx.beginPath(); ctx.moveTo(X(b.ax), Z(b.az)); ctx.lineTo(X(b.bx), Z(b.bz)); ctx.stroke(); }
  for (const i of ISL) {
    const known = P.disc[i.id];
    ctx.beginPath(); ctx.arc(X(i.x), Z(i.z), i.r * s, 0, Math.PI * 2);
    ctx.fillStyle = !known ? '#4A3F6E' : i.biome === 'sea' ? mixHex('#93A9B8', '#5CC1D6', healOf(i.id) / 100) : i.home ? (HOME_COLORS.find(c => c.id === P.home.color) || HOME_COLORS[0]).c : mixHex(burnedColor(i), i.top, healOf(i.id) / 100); ctx.fill();
    if (known && i.biome === 'sea') for (const L of SEA_LAND) { ctx.beginPath(); ctx.arc(X(L.x), Z(L.z), (L.r + SHALLOW_W) * s, 0, 7); ctx.fillStyle = '#8FDCE6'; ctx.fill(); ctx.beginPath(); ctx.arc(X(L.x), Z(L.z), L.r * s, 0, 7); ctx.fillStyle = L.grass ? '#A9DD95' : '#F3DFAE'; ctx.fill(); }
    if (known && i.biome === 'snow') for (const I of ICE) { ctx.beginPath(); ctx.arc(X(I.x), Z(I.z), I.r * s, 0, 7); ctx.fillStyle = '#CDEFFF'; ctx.fill(); }
    ctx.fillStyle = known ? '#2E2346' : '#9D93C4'; ctx.font = `600 ${Math.max(11, s * 3.2)}px Rubik, sans-serif`; ctx.textAlign = 'center';
    ctx.fillText(known ? i.n : '???', X(i.x), Z(i.z) - i.r * s - 6 < 12 ? Z(i.z) + i.r * s + 14 : Z(i.z) - i.r * s - 6);
  }
  ctx.font = `${Math.max(16, s * 4)}px sans-serif`; ctx.textBaseline = 'middle';
  for (const L of LANDMARKS) { const isl = islandAt(L.x, L.z); if (!isl || !P.disc[isl.id]) continue; ctx.globalAlpha = P.disc[L.id] ? 1 : .45; ctx.fillText(P.disc[L.id] ? L.ic : '❔', X(L.x), Z(L.z)); }
  ctx.globalAlpha = 1;
  for (const k of SKY) { ctx.beginPath(); ctx.arc(X(k.x), Z(k.z), Math.max(2, k.r * s), 0, 7); ctx.fillStyle = k.top ? '#C9F0D8' : '#9D93C4'; ctx.fill(); }
  for (const id in MBS) { const b = MBS[id]; if (P.disc[b.def.isl]) ctx.fillText(b.asleep ? '💤' : b.def.ic, X(b.x), Z(b.z)); }
  for (const w of WAYPOINTS) if (P.wp[w.id]) ctx.fillText('☕', X(w.x), Z(w.z));
  for (const f of FISH_SPOTS) { const isl = islandAt(f.x, f.z); if (isl && P.disc[isl.id]) ctx.fillText('🎣', X(f.x), Z(f.z)); }
  for (const id in PETW) { const w = PETW[id]; const isl = islandAt(w.x, w.z); if (isl && P.disc[isl.id]) ctx.fillText(PETDEF[id].ic, X(w.x), Z(w.z)); }
  if (BOSS.mesh && P.disc.tower) ctx.fillText(BOSS.asleep ? '💤' : '💼', X(BOSS.x), Z(BOSS.z));
  const q = curQuest(); const t = P.qstate === 'active' ? q.target : [GIVER.x, GIVER.z];
  if (t) { ctx.fillStyle = '#FFD27A'; ctx.font = `${Math.max(18, s * 4.5)}px sans-serif`; ctx.fillText('★', X(t[0]), Z(t[1])); }
  // гравець
  ctx.save(); ctx.translate(X(pl.x), Z(pl.z)); ctx.rotate(-pl.face + Math.PI);
  ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#FF6B93'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, -13); ctx.lineTo(9, 9); ctx.lineTo(0, 4); ctx.lineTo(-9, 9); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
  ctx.restore();
  ctx.fillStyle = '#FFF8F2'; ctx.font = '600 18px Rubik, sans-serif'; ctx.textAlign = 'left'; ctx.fillText(`🌱 Здоров’я світу: ${worldHeal()}%`, 16, 26);
}

/* ---------- Щоденник ---------- */
function renderJournal() {
  const isl = ISL.map(i => `<span class="chip">${P.disc[i.id] ? '✅ ' + i.n : '❔ ???'}</span>`).join('');
  const lms = LANDMARKS.map(L => `<span class="chip">${P.disc[L.id] ? L.ic + ' ' + L.n : '❔ ???'}</span>`).join('');
  const pets = Object.keys(PETDEF).map(id => { const d = PETDEF[id], got = P.pets[id];
    return `<div class="row"><span class="ic">${got ? d.ic : '❔'}</span><div class="tx"><b>${got ? d.n : '???'}</b><div class="need">${got ? d.d : 'Ще не знайдено. Пригости кавою, коли знайдеш.'}</div></div>${got ? `<button class="btn ${P.pet === id ? '' : 'alt'}" data-act="pet" data-arg="${id}">${P.pet === id ? 'Поруч' : 'Взяти з собою'}</button>` : ''}</div>`; }).join('');
  const fishes = FISH.map(f => `<div class="row" style="padding:8px 10px"><span class="ic" style="font-size:22px">${P.fishSeen[f.id] ? f.ic : '❔'}</span><div class="tx"><b class="t${f.r}">${P.fishSeen[f.id] ? f.n : '???'}</b><div class="need">${P.fishSeen[f.id] ? `спіймано ${P.fishSeen[f.id]} · у кошику ${P.fish[f.id] || 0} · ${f.p} 🪙` : `${RAR[f.r].name}${f.night ? ' · тільки вночі' : ''}`}</div></div></div>`).join('');
  const notes = NOTES.map(n => P.notes[n.id] ? `<div class="detail" style="margin-top:8px"><h4>📜 ${n.t}</h4><p style="margin:6px 0 0;font-size:13px">${n.d}</p></div>` : '').join('');
  const nGot = Object.keys(P.notes).length, fGot = FISH.filter(f => P.fishSeen[f.id]).length;
  const heal = HEAL_REGIONS.map(id => `<div class="hrow"><span>${ISLMAP[id].n}</span><div class="bar" style="background:#E2D6EE"><i style="transform:scaleX(${healOf(id) / 100});background:#8FD9C0"></i></div><b>${Math.round(healOf(id))}%</b></div>`).join('');
  const perks = HEAL_PERKS.map(p => `<span class="chip" style="${worldHeal() >= p.at ? '' : 'opacity:.5'}">${worldHeal() >= p.at ? '✅' : '🔒 ' + p.at + '%'} ${p.n}</span>`).join('');
  const bosses = Object.keys(MINIBOSS).map(id => { const d = MINIBOSS[id]; return `<span class="chip">${P.mb[id] ? d.ic + ' ' + d.n + ' ×' + P.mb[id] : '❔ ' + ISLMAP[d.isl].n}</span>`; }).join('');
  return `<h3>Зцілення світу · ${worldHeal()}%</h3><p class="muted" style="font-size:13px">Заспокоюй вигорілих (улюбленим напоєм — більше), відкривай місця, копай, рибаль і перемагай босів — регіони оживають, а в «Гущі» відкриваються сервіси.</p><div>${heal}</div><div class="chips" style="margin-top:8px">${perks}</div>
  <h3 style="margin-top:16px">Міні-боси</h3><div class="chips">${bosses}</div>
  <h3 style="margin-top:16px">Атлас · ${ISL.filter(i => P.disc[i.id]).length}/${ISL.length} місцевостей · ${LANDMARKS.filter(l => P.disc[l.id]).length}/${LANDMARKS.length} орієнтирів</h3><div class="chips">${isl}</div><div class="chips" style="margin-top:6px">${lms}</div>
  <h3 style="margin-top:16px">Улюбленці</h3><div class="list">${pets}${P.pet ? '<button class="btn alt" data-act="pet" data-arg="">Залишити улюбленця в «Гущі»</button>' : ''}</div>
  <h3 style="margin-top:16px">Риба · ${fGot}/${FISH.length}</h3><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:6px">${fishes}</div>
  <h3 style="margin-top:16px">Записки · ${nGot}/${NOTES.length}</h3>${notes || '<p class="muted">Поки жодної. Шукай світні папірці на островах.</p>'}${nGot < NOTES.length ? `<p class="muted" style="font-size:12px;margin-top:8px">Зібравши всі ${NOTES.length}, отримаєш легендарну знахідку.</p>` : ''}`;
}
function fishValue() { return FISH.reduce((a, f) => a + (P.fish[f.id] || 0) * f.p, 0); }
function fishCount() { return FISH.reduce((a, f) => a + (P.fish[f.id] || 0), 0); }
