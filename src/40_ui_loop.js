/* =====================================================================
   ГРАВЕЦЬ, КЕРУВАННЯ, ІНТЕРФЕЙС, ЗВУК, ГОЛОВНИЙ ЦИКЛ
   ===================================================================== */
let curZone = null, safeT = 0;
function updPlayer(dt) {
  if (pl.dead) return;
  pl.iframes = Math.max(0, pl.iframes - dt); pl.atkCd -= dt; pl.swingT -= dt;
  if (pl.buffs.speed > 0) pl.buffs.speed -= dt;
  if (pl.slowT > 0) pl.slowT -= dt;
  if (pl.charges < S.charges) { pl.chargeT -= dt; if (pl.chargeT <= 0) { pl.charges++; pl.chargeT = .9; } }
  const terr = terrainAt(pl.x, pl.z); pl.terr = terr;
  const wet = isWet(terr) && pl.y < -.3;
  pl.stDelay -= dt;
  if (wet && !S.fx.has('float')) { pl.st -= 7 * dt; pl.stDelay = .4; if (pl.st <= 0) { pl.st = 0; pl.hp -= 9 * dt; if (!pl.drownT || gameTime - pl.drownT > 1.6) { pl.drownT = gameTime; ftext(pl.x, 1.2, pl.z, 'Захлинаєшся! До берега!', 'bad'); } if (pl.hp <= 0) die(); } }
  else if (pl.stDelay <= 0) pl.st = Math.min(S.maxSt, pl.st + 32 * dt);

  if (pl.jump) {
    const j = pl.jump; j.t += dt; const k = Math.min(1, j.t / j.dur);
    pl.x = lerp(j.sx, j.tx, k); pl.z = lerp(j.sz, j.tz, k); pl.y = lerp(j.sy, j.th, k) + Math.sin(k * Math.PI) * j.h;
    pl.face = angTo(j.sx, j.sz, j.tx, j.tz);
    if (k >= 1) { pl.jump = null; pl.y = j.th; pl.vy = 0; if (!j.th) pl.safe = { x: pl.x, z: pl.z }; burst(pl.x, pl.y + .3, pl.z, '#FFF3E6', 14, 4, .6, 2); shake = .2; sfx('land'); }
    syncHero(dt); return;
  }
  if (pl.falling) {
    pl.vy -= 30 * dt; pl.y += pl.vy * dt; pl.x += pl.fx * dt; pl.z += pl.fz * dt;
    if (pl.y < -16) {
      pl.falling = false; pl.y = 0; pl.vy = 0; pl.x = pl.safe.x; pl.z = pl.safe.z;
      const d = Math.round(S.maxHP * .12); pl.hp -= d; pl.iframes = 1.2;
      ftext(pl.x, 2.4, pl.z, 'Ой. Тримайся землі. −' + d, 'bad');
      if (pl.hp <= 0) die();
      refreshHUD();
    }
    syncHero(dt); return;
  }
  if (FUN.held) { updHeld(dt); syncHero(dt); return; }
  if (pl.ride) { updRide(dt); syncHero(dt); return; }
  if (pl.lock > 0) { pl.lock -= dt; pl.moving = false; syncHero(dt); return; }
  if (pl.pending) { pl.pending.t -= dt; if (pl.pending.t <= 0) { const pd = pl.pending; pl.pending = null; resolveHit(pd); } }

  let [mx, mz] = funInput(input.mx, input.mz, dt); const ml = Math.hypot(mx, mz);
  if (ml > 1) { mx /= ml; mz /= ml; }
  if (fishing) { mx = mz = 0; }
  const storm = stormT > 0 && curZone && curZone.biome === 'desert' && !S.fx.has('shade');
  let spd = S.move * (pl.buffs.speed > 0 ? 1.4 : 1) * (pl.slowT > 0 ? .6 : 1) * (P.pet === 'penguin' ? 1.12 : 1) * (storm ? .85 : 1) * (pl.chargeSlow ? .55 : 1) * (pl.gliding ? 1.2 : 1) * funSpeedMul();
  if (isWet(terr)) spd *= S.fx.has('swim') ? .95 : .56; else if (terr === 'shallow') spd *= .78;
  const slide = (terr === 'ice' && !S.fx.has('grip') && P.pet !== 'penguin') || onSyrup(pl.x, pl.z);
  pl.vx = pl.vx || 0; pl.vz = pl.vz || 0;
  if (pl.dashT > 0) {
    pl.dashT -= dt;
    pl.x += pl.dx * 17 * dt; pl.z += pl.dz * 17 * dt;
    pl.vx = pl.dx * spd * 1.4; pl.vz = pl.dz * spd * 1.4;
    if (Math.random() < .6) burst(pl.x, pl.y + .3, pl.z, isWet(terr) || terr === 'shallow' ? '#BDEFFF' : '#FFF3E6', 1, .5, .3, .5);
  } else if (slide) {
    const k = Math.min(1, dt * 1.4);
    pl.vx += (mx * spd * 1.15 - pl.vx) * k; pl.vz += (mz * spd * 1.15 - pl.vz) * k;
    pl.x += pl.vx * dt; pl.z += pl.vz * dt;
    if (ml > .1) pl.face = lerpAng(pl.face, Math.atan2(mx, mz), Math.min(1, dt * 10));
    if (Math.hypot(pl.vx, pl.vz) > 3 && Math.random() < dt * 8) burst(pl.x, .1, pl.z, '#E3F4FF', 1, .6, .4, .3);
  } else {
    pl.vx = mx * spd; pl.vz = mz * spd;
    pl.x += pl.vx * dt; pl.z += pl.vz * dt;
    if (ml > .1 && !pl.pending && pl.swingT <= 0) pl.face = lerpAng(pl.face, Math.atan2(mx, mz), Math.min(1, dt * 14));
  }
  if (pl.kx) { pl.x += pl.kx * dt; pl.z += pl.kz * dt; const k = Math.exp(-8 * dt); pl.kx *= k; pl.kz *= k; if (Math.abs(pl.kx) + Math.abs(pl.kz) < .05) pl.kx = pl.kz = 0; }
  pl.moving = ml > .1 || pl.dashT > 0 || (slide && Math.hypot(pl.vx, pl.vz) > .5);
  if (pl.moving) pl.walkPh += dt * Math.max(spd, 2.5) * 1.9;
  const stepN = Math.floor(pl.walkPh / Math.PI);
  if (stepN !== pl.lastStep) {
    pl.lastStep = stepN;
    if (pl.moving && pl.dashT <= 0 && pl.y > -1.2) {
      if (isWet(terr)) { sfx('swim'); burst(pl.x, WATER_Y, pl.z, '#E8FBFF', 3, 1.5, .5, 1.2); }
      else if (terr === 'shallow') { sfx('splashstep'); burst(pl.x, WATER_Y, pl.z, '#E8FBFF', 2, 1.2, .4, 1); }
      else if (!slide) sfx('step');
    }
  }
  pushOutStatics(pl, .4);
  // край моря: течія не пускає
  if (terr === 'rim') { const s = ISLMAP.sea, a = angTo(pl.x, pl.z, s.x, s.z); pl.x += Math.sin(a) * 4 * dt; pl.z += Math.cos(a) * 4 * dt; if (!pl.rimWarn || gameTime - pl.rimWarn > 4) { pl.rimWarn = gameTime; ftext(pl.x, 1.2, pl.z, 'Течія біля водоспаду тягне назад', 'calm'); } }

  {
    const t2 = terrainAt(pl.x, pl.z);
    const ph = platH(pl.x, pl.z, pl.y);
    const gh = t2 === 'void' ? ph : Math.max(baseH(t2), ph);
    const wasGrounded = pl.grounded;
    pl.grounded = false;
    if (gh < -50) {
      // під ногами нічого: летимо (стрибок, планування) або падаємо в порожнечу
      if (pl.dashT > 0) pl.vy = Math.max(pl.vy || 0, 0);
      else {
        pl.vy = (pl.vy || 0) - 30 * dt;
        pl.gliding = input.jumpHeld && pl.vy < 0;
        if (pl.gliding) pl.vy = Math.max(pl.vy, -2.4);
        pl.y += pl.vy * dt;
      }
      if (pl.y < -2.5) { pl.falling = true; pl.gliding = false; pl.vy = -4; pl.fx = mx * spd * .6; pl.fz = mz * spd * .6; sfx('fall'); }
    } else if (pl.y > gh + .02 || (pl.vy || 0) > 0) {
      if (pl.dashT <= 0) {
        pl.vy = (pl.vy || 0) - 30 * dt;
        pl.gliding = input.jumpHeld && pl.vy < 0 && pl.y > gh + .6;
        if (pl.gliding) pl.vy = Math.max(pl.vy, -2.4);
        pl.y += pl.vy * dt;
      }
      if (pl.y <= gh) {
        if (pl.vy < -7) { if (isWet(t2) || t2 === 'shallow') { burst(pl.x, WATER_Y, pl.z, '#BDEFFF', 18, 3, .7, 4); sfx('splash'); } else { burst(pl.x, gh + .2, pl.z, '#FFF3E6', 10, 3, .5, 2); sfx('land'); } }
        pl.y = gh; pl.vy = 0; pl.grounded = true; pl.gliding = false;
      }
    } else { pl.y = gh; pl.vy = 0; pl.grounded = true; pl.gliding = false; }
    if (pl.grounded) pl.airDash = true;
    if (pl.gliding && Math.random() < dt * 10) burst(pl.x, pl.y + 2.4, pl.z, '#FFFFFF', 1, .4, .4, .2);
    safeT -= dt;
    if (safeT <= 0 && t2 === 'land' && Math.abs(pl.y) < .1 && onGround(pl.x, pl.z, 1.1)) { pl.safe = { x: pl.x, z: pl.z }; safeT = .3; }
  }
  for (const p of PADS) if (dist2(pl.x, pl.z, p.x, p.z) < .9 && pl.dashT <= 0 && Math.abs(pl.y) < .5) {
    pl.jump = { t: 0, dur: p.th ? 1 : 1.25, sx: pl.x, sz: pl.z, sy: pl.y, tx: p.tx, tz: p.tz, th: p.th || 0, h: p.th ? 3 : 8 }; pl.iframes = 1.5; sfx('jump');
    burst(p.x, .3, p.z, p.style === 'mushroom' ? '#FF7AB6' : '#8FD9C0', 16, 3, .6, 4);
  }
  const isl = islandAt(pl.x, pl.z);
  if (isl && isl !== curZone) { curZone = isl; showZone(isl.n, isl.sub); }
  syncHero(dt);
}
function syncHero(dt) {
  const h = hero; if (!h) return;
  h.root.position.set(pl.x, pl.y, pl.z);
  h.root.rotation.y = pl.face;
  const sw = pl.moving ? Math.sin(pl.walkPh) * .6 : 0;
  h.l1.rotation.x = sw; h.l2.rotation.x = -sw; h.aL.rotation.x = -sw * .7;
  updGlider();
  if (pl.emoteT > 0) { updSelfEmote(dt); return; }
  if (pl.swingT > 0) {
    const k = Math.sin((pl.swingT / (pl.swingKind === 3 ? .3 : .22)) * Math.PI);
    if (pl.swingKind === 1) { h.aR.rotation.x = -1.6 * k; h.aR.rotation.z = -1.1 * k; h.body.rotation.y = .5 * k; }
    else if (pl.swingKind === 2) { h.aR.rotation.x = -3 * k; h.aR.rotation.z = 0; h.body.rotation.y = 0; }
    else if (pl.swingKind === 3) { h.aR.rotation.x = -1.5 * k; h.aR.rotation.z = 1.4 * k; h.body.rotation.y = -1.2 * k; }
    else { h.aR.rotation.x = -2.3 * k; h.aR.rotation.z = .4 * k; h.body.rotation.y = -.4 * k; }
  } else { h.aR.rotation.z = 0; h.body.rotation.y = 0; }
  if (pl.charge > 0) { h.aR.rotation.x = -2.6; h.body.rotation.y = .5 * pl.charge; }
  else h.aR.rotation.x = lerp(h.aR.rotation.x, -.35 - sw * .3, Math.min(1, dt * 12));
  const swim = isWet(pl.terr) && pl.y < -.3;
  h.body.rotation.x = pl.dashT > 0 ? .45 : pl.jump ? -.2 : swim ? .5 : pl.gliding ? .25 : (!pl.grounded && pl.vy > 0) ? -.15 : 0;
  if (pl.dig) h.aR.rotation.x = -1.2 - Math.sin(gameTime * 18) * .8;
  if (swim) { h.aL.rotation.x = -1.5 + Math.sin(pl.walkPh) * .9; h.aR.rotation.x = -1.5 - Math.sin(pl.walkPh) * .9; }
  h.body.position.y = pl.moving ? Math.abs(Math.sin(pl.walkPh)) * .06 : 0;
  h.root.visible = !(pl.iframes > 0 && pl.dashT <= 0 && !pl.jump && Math.floor(gameTime * 18) % 2 === 0);
}

/* ---------- Маріанна, натовп, стрілка квесту ---------- */
let giver = null, marker = null, qArrow = null;
function buildGiver() {
  const h = humanoid({ skin: '#E9B894', shirt: '#FFE8D6', pants: '#4B4372' });
  put(h.body, mesh(G.apron, '#7FD6B9'), 0, .8, .37);
  put(h.body, mesh(new THREE.IcosahedronGeometry(.2, 0), '#5B3A2E'), 0, 1.78, -.12);
  put(h.body, mesh(new THREE.BoxGeometry(.56, .16, .5), '#5B3A2E'), 0, 1.66, -.03);
  h.root.position.set(GIVER.x, 0, GIVER.z); h.root.rotation.y = angTo(GIVER.x, GIVER.z, 0, 2);
  scene.add(h.root); giver = h; addStatic(GIVER.x, GIVER.z, .4);
  marker = mesh(new THREE.OctahedronGeometry(.22, 0), glow('#FFD27A'), false);
  marker.position.set(GIVER.x, 2.5, GIVER.z); scene.add(marker);
  const g = new THREE.Group();
  const c = mesh(new THREE.ConeGeometry(.24, .6, 4), glow('#FFB38A'), false); c.rotation.x = Math.PI / 2; c.position.z = 1.6; g.add(c);
  scene.add(g); qArrow = g;
}
function updGiver() {
  if (!marker) return;
  const st = P.qstate;
  marker.visible = st !== 'active';
  marker.material = st === 'done' ? glow('#8FD9C0') : glow('#FFD27A');
  marker.position.y = 2.4 + Math.sin(gameTime * 3) * .12; marker.rotation.y += .03;
  giver.head.rotation.y = Math.sin(gameTime * .7) * .3;
  const q = curQuest();
  let t = null;
  const tt = tutTarget();
  if (tt) t = tt;
  else if (tutActive()) t = null;
  else if (st !== 'active') t = [GIVER.x, GIVER.z];
  else if (q.target) t = q.target;
  if (t && dist2(pl.x, pl.z, t[0], t[1]) > (tt ? 2.4 : 6) && !pl.falling) {
    qArrow.visible = true; qArrow.position.set(pl.x, .2 + pl.y, pl.z);
    qArrow.rotation.y = angTo(pl.x, pl.z, t[0], t[1]);
  } else qArrow.visible = false;
}
function updCrowd(dt) {
  for (const c of CROWD) {
    c.h.body.position.y = Math.abs(Math.sin(gameTime * 1.5 + c.ph)) * .04;
    if (Math.random() < dt * .02 && dist2(pl.x, pl.z, c.x, c.z) < 8) bubble(c, pick(['Тут так спокійно.', 'Чуєш lo-fi? Кайф.', 'Я тепер вихідні не перевіряю пошту.', 'Дякую за каву, бариста.', 'Може, ще одну?']), false, 2.6);
  }
}

/* ---------- Взаємодія ---------- */
let interactNow = null;
function getInteract() {
  if (pl.dead || pl.falling || pl.jump) return null;
  const fi = funInteract(); if (fi) return fi;
  if (dist2(pl.x, pl.z, GIVER.x, GIVER.z) < 2.6) return { l: P.qstate === 'done' ? 'Здати квест Маріанні' : P.qstate === 'offer' ? 'Маріанна: новий квест' : 'Поговорити з Маріанною', fn: () => openPanel('quest') };
  if (fishing) return { l: fishing.phase === 'done' ? 'Закинути ще' : 'Тягнути', fn: reelFish };
  for (const c of CHESTS) if (!c.fall && chestReady(c) && dist2(pl.x, pl.z, c.x, c.z) < 2 && Math.abs(pl.y - (c.y || 0)) < 1.2) return { l: c.loot ? 'Відкрити скриню орієнтира' : 'Відкрити скриню', fn: () => openChest(c) };
  for (const id in PETW) { const w = PETW[id]; if (dist2(pl.x, pl.z, w.x, w.z) < 2.3) return { l: `Пригостити кавою: ${PETDEF[id].n}`, fn: () => tamePet(id) }; }
  const rp = NET.on && nearRemote(); if (rp) return { l: `Пригостити кавою: ${rp.name}`, fn: () => giftCoffee(rp) };
  if (onHome() && dist2(pl.x, pl.z, HOME.hammock.x, HOME.hammock.z) < 2.2) return { l: isNight() ? 'Гамак: проспати до ранку' : 'Гамак (спати можна вночі)', fn: sleepHammock };
  if (nearStash()) return { l: 'Сховок', fn: () => openPanel('stash') };
  const fs = nearFishSpot(); if (fs) return { l: `Рибалити (${fs.n})`, fn: () => startFishing(fs) };
  for (const d of DIG) if (d.active && dist2(pl.x, pl.z, d.x, d.z) < 1.5 && Math.abs(pl.y) < .5) return { l: 'Копати скарб', fn: () => startDig(d) };
  const wp = WAYPOINTS.find(w => dist2(pl.x, pl.z, w.x, w.z) < 2.4); if (wp && P.wp[wp.id]) return { l: 'Кавова точка: мапа й переміщення', fn: () => openPanel('map') };
  if (nearBar()) return { l: 'Бар: варити напої', fn: () => openPanel('drinks') };
  if (dist2(pl.x, pl.z, WORKBENCH.x, WORKBENCH.z) < 2.8) return { l: 'Верстак: крафт і ремонт', fn: () => openPanel('craft') };
  return null;
}
function updInteract() {
  const it = getInteract();
  const pr = $('#prompt');
  if (it) { pr.hidden = false; const t = (IS_TOUCH ? 'Дія — ' : 'F — ') + it.l; if (pr.textContent !== t) pr.textContent = t; }
  else pr.hidden = true;
  interactNow = it;
}
function interact() { if (paused || panel) return; if (fishing) { reelFish(); return; } if (interactNow) interactNow.fn(); }

/* ---------- Керування ---------- */
const input = { mx: 0, mz: 0, ax: 0, az: 0, aimOk: false, atk: false, jx: 0, jz: 0 };
const keys = {};
const raycaster = new THREE.Raycaster(), groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), _hit = new THREE.Vector3(), _ndc = new THREE.Vector2();
addEventListener('keydown', e => {
  if (!running) return;
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) return;
  const c = e.code;
  if (caseOpen) { e.preventDefault(); if ((c === 'Escape' || c === 'Enter' || c === 'Space') && caseAnim) { if (caseAnim.done) closeCase(); else caseAnim.t = caseAnim.dur; } return; }
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(c)) e.preventDefault();
  if (art) { e.preventDefault(); if (['KeyE', 'Space', 'Enter', 'KeyF'].includes(c) && !e.repeat) artTap(); if (c === 'Escape') skipArt(); return; }
  if (c === 'Escape') { if (panel) closePanel(); else openPanel('pause'); return; }
  if (c === 'KeyI' || (c === 'KeyE' && !fishing && !e.repeat)) { panel === 'inv' ? closePanel() : openPanel('inv'); return; }
  if (c === 'KeyK') { panel === 'skills' ? closePanel() : openPanel('skills'); return; }
  if (c === 'KeyB') { panel === 'cases' ? closePanel() : openPanel('cases'); return; }
  if (c === 'KeyC') { panel === 'drinks' || panel === 'craft' ? closePanel() : openPanel(nearBar() ? 'drinks' : 'craft'); return; }
  if (c === 'KeyH') { panel === 'home' ? closePanel() : openPanel('home'); return; }
  if (c === 'KeyM') { panel === 'map' ? closePanel() : openPanel('map'); return; }
  if (c === 'KeyJ') { panel === 'journal' ? closePanel() : openPanel('journal'); return; }
  if (panel || pl.dead) return;
  if (fishing && ['KeyF', 'Space', 'Enter'].includes(c)) { e.preventDefault(); if (!e.repeat) reelFish(); return; }
  if (c === 'Enter' && NET.on) { e.preventDefault(); openChat(); return; }
  keys[c] = true;
  if (!e.repeat && addonKey(c)) return;
  if (e.repeat) return;
  if (c === 'Space') { e.preventDefault(); jumpPress(); }
  if (c === 'ShiftLeft' || c === 'ShiftRight') dash();
  if (MODEBAR && /^Digit[1-8]$/.test(c)) { modeBarUse(+c.slice(5) - 1); return; }
  if (c === 'KeyQ' && !MODEBAR) useDrink();
  if (c === 'KeyF') interact();
  if (c === 'KeyX') swapHands();
  if (/^Digit[1-8]$/.test(c)) { const k = knownDrinks()[+c.slice(5) - 1]; if (k) { selDrink = k; refreshHUD(); } }
});
addEventListener('keyup', e => { keys[e.code] = false; if (e.code === 'Space') jumpRelease(); });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; input.atk = false; input.jumpHeld = false; pl.charge = 0; });
cv.addEventListener('pointermove', e => {
  if (e.pointerType === 'touch') return;
  _ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(_ndc, camera);
  if (raycaster.ray.intersectPlane(groundPlane, _hit)) { input.ax = _hit.x; input.az = _hit.z; input.aimOk = true; }
});
cv.addEventListener('pointerdown', e => {
  if (!running || e.pointerType === 'touch') return;
  cv.focus();
  if (e.button === 0) atkDown();
  if (e.button === 2 && !MODEBAR) useDrink();
});
addEventListener('pointerup', e => { if (e.pointerType !== 'touch' && e.button === 0) atkUp(); });
cv.addEventListener('contextmenu', e => e.preventDefault());
function updInput() {
  let x = 0, z = 0;
  if (panel) { input.mx = input.mz = 0; return; }   // меню відкрите (онлайн гра йде далі) — персонаж стоїть
  if (keys.KeyA || keys.ArrowLeft) x -= 1;
  if (keys.KeyD || keys.ArrowRight) x += 1;
  if (keys.KeyW || keys.ArrowUp) z -= 1;
  if (keys.KeyS || keys.ArrowDown) z += 1;
  x += input.jx; z += input.jz;
  input.mx = x; input.mz = z;
}
function setupTouch() {
  if (!IS_TOUCH) return;
  document.body.classList.add('touch'); $('#touch').hidden = false;
  const joy = $('#joy'), knob = $('#knob'); let jid = null;
  const move = e => {
    const r = joy.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let dx = e.clientX - cx, dy = e.clientY - cy; const d = Math.hypot(dx, dy), max = 46;
    if (d > max) { dx = dx / d * max; dy = dy / d * max; }
    knob.style.transform = `translate(${dx}px,${dy}px)`;
    input.jx = dx / max; input.jz = dy / max;
  };
  joy.addEventListener('pointerdown', e => { jid = e.pointerId; joy.setPointerCapture(jid); move(e); });
  joy.addEventListener('pointermove', e => { if (e.pointerId === jid) move(e); });
  const end = e => { if (e.pointerId === jid) { jid = null; input.jx = input.jz = 0; knob.style.transform = ''; } };
  joy.addEventListener('pointerup', end); joy.addEventListener('pointercancel', end);
  const hold = (id, on, off) => { const b = $(id); b.addEventListener('pointerdown', e => { e.preventDefault(); on(); }); if (off) { b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off); } };
  hold('#t-atk', atkDown, atkUp);
  hold('#t-jump', jumpPress, jumpRelease);
  hold('#t-dash', dash); hold('#t-drink', useDrink); hold('#t-use', interact); hold('#t-swap', swapHands);
}

/* ---------- HUD ---------- */
function refreshHUD() {
  if (!P || !running) return;
  $('#lvl').textContent = P.lvl;
  $('#coins').textContent = '🪙 ' + P.coins;
  $('#pts-dot').hidden = !P.pts; $('#sp-dot').hidden = !P.sp;
  $('#case-dot').hidden = !Object.values(P.cases || {}).some(n => n > 0);
  refreshWeapon();
  const kd = knownDrinks();
  if (!kd.includes(selDrink)) selDrink = kd[0];
  $('#drinks').innerHTML = kd.map((id, i) => `<button class="slot ${id === selDrink ? 'sel' : ''} ${P.drinks[id] ? '' : 'off'}" data-drink="${id}" title="${DRINK[id].n}"><span class="k">${i + 1}</span>${DRINK[id].ic}<span class="n">${P.drinks[id] || 0}</span></button>`).join('');
}
function refreshWeapon() {
  if (!P) return;
  const it = eqItem('hand1'), it2 = eqItem('hand2');
  const ic = it ? BASE[it.b].ic : '✊';
  const dur = it && !it.broken ? it.dur / it.maxDur : 0;
  $('#weapon').className = 'slot big ' + (it ? 'r' + it.r : '') + (it && it.broken ? ' off' : '');
  $('#weapon').innerHTML = `${ic}${it ? `<span class="dur"><i style="width:${dur * 100}%;background:${dur < .25 ? '#FF7A8A' : ''}"></i></span>` : ''}${it2 ? `<span class="sec">${BASE[it2.b].ic}</span>` : ''}`;
}
/* ---------- Набір режиму: аддон тимчасово підміняє хотбар своїми слотами (напр. лише 💣 і 🪠).
   modeBar({ slots: [{ id, ic, n, count: () => k, use: () => … }], sel }) — увімкнути; modeBar(null) — повернути звичайний.
   Поки набір увімкнено: зброя й напої сховані, 1…N — використати слот, Q і ПКМ напої не п'ють. Справжній інвентар не чіпаємо. */
/* ---------- Лобі режиму: попап з картами (картинки), голосування й «Я готовий».
   modeLobby({ title, sub, maps: [{ n, img, about }], votes: [k…], mine: i|-1, ready: bool, players: [{ n, ready, vote }],
               info: 'текст (таймер)', onVote: i => …, onReady: () => …, onHide: () => … }) — показати/оновити; modeLobby(null) — закрити.
   Аддон кличе це щокадру або при зміні стану: HTML оновлюється, лише коли щось змінилось. */
let MLOBBY = null, mLobbyHTML = '';
function modeLobby(def) {
  let el = $('#mlobby');
  if (!def) { MLOBBY = null; mLobbyHTML = ''; if (el) el.remove(); return; }
  MLOBBY = def;
  if (!el) {
    el = document.createElement('div'); el.id = 'mlobby'; document.body.appendChild(el);
    el.addEventListener('click', e => {
      const m = MLOBBY; if (!m) return;
      const v = e.target.closest('[data-lv]'); if (v) { if (m.onVote) m.onVote(+v.dataset.lv); sfx('ui'); return; }
      if (e.target.closest('.rdy')) { if (m.onReady) m.onReady(); sfx('ding'); return; }
      if (e.target.closest('.hide')) { if (m.onHide) m.onHide(); return; }
    });
  }
  const esc = escapeHTML, vs = def.votes || [];
  const h = `<div class="lb"><h3>${esc(def.title || 'Лобі')}</h3><div class="sub">${def.sub || 'Обери карту — клікни по картці. Потім «Я готовий».'}</div>
    <div class="maps">${(def.maps || []).map((m, i) => `<button class="map${def.mine === i ? ' mine' : ''}" data-lv="${i}"><div class="im" style="background-image:url('${m.img || ''}'),linear-gradient(160deg,#6BB8FF,#B07CF0)"></div><div class="tx"><b>${esc(m.n)}</b><span>${m.about || ''}</span></div><div class="vc">🗳️ ${vs[i] || 0}</div></button>`).join('')}</div>
    ${def.players && def.players.length ? `<div class="who">${def.players.map(p => `<i class="${p.ready ? 'ok' : ''}">${p.ready ? '✅' : '⏳'} ${esc(p.n)}${p.vote >= 0 && def.maps[p.vote] ? ' · ' + (p.vote + 1) : ''}</i>`).join('')}</div>` : ''}
    <div class="row"><span>${def.info || ''}</span><span><button class="hide">Сховати</button> <button class="rdy${def.ready ? ' on' : ''}">${def.ready ? '⏳ Не готовий' : '✅ Я готовий'}</button></span></div></div>`;
  if (h !== mLobbyHTML) { mLobbyHTML = h; el.innerHTML = h; }
}
let MODEBAR = null, modeBarHTML = '';
function modeBar(def) { MODEBAR = def && def.slots && def.slots.length ? Object.assign({ sel: 0 }, def) : null; modeBarHTML = ''; renderModeBar(); }
function modeBarUse(i) { const m = MODEBAR, s = m && m.slots[i]; if (!s) return false; m.sel = i; if (s.use) s.use(); renderModeBar(); return true; }
function renderModeBar() {
  const el = $('#modebar'); if (!el) return;
  const on = !!MODEBAR; el.hidden = !on; $('#weapon').hidden = on; $('#drinks').hidden = on;
  if (!on) return;
  const h = MODEBAR.slots.map((s, i) => { const n = s.count ? s.count() : null; return `<button class="slot${i === MODEBAR.sel ? ' sel' : ''}${n === 0 ? ' off' : ''}" data-ms="${i}" title="${s.n || ''}"><span class="k">${i + 1}</span>${s.ic}${n != null ? `<span class="n">${n}</span>` : ''}${s.n ? `<span class="lbl">${s.n}</span>` : ''}</button>`; }).join('');
  if (h !== modeBarHTML) { modeBarHTML = h; el.innerHTML = h; }
}
$('#modebar').addEventListener('click', e => { const b = e.target.closest('[data-ms]'); if (b) modeBarUse(+b.dataset.ms); });
function updHUDFrame() {
  if (MODEBAR) renderModeBar();
  { const q = $('#quest'), md = !!curMode(); if (q && q.hidden !== md) q.hidden = md; }   // у міні-іграх квест-картки «Гущі» не видно
  $('#hpb').style.transform = `scaleX(${clamp(pl.hp / S.maxHP, 0, 1)})`;
  $('#hpt').textContent = Math.max(0, Math.ceil(pl.hp)) + ' / ' + S.maxHP;
  $('#stb').style.transform = `scaleX(${clamp(pl.st / S.maxSt, 0, 1)})`;
  $('#xpb').style.transform = `scaleX(${clamp(P.xp / xpNeed(P.lvl), 0, 1)})`;
  const b = $('#brew');
  if (P.brew) { b.hidden = false; $('#brewb').style.transform = `scaleX(${P.brew.t / P.brew.total})`; $('#brewt').textContent = 'Вариться: ' + DRINK[P.brew.id].n; }
  else b.hidden = true;
}
$('#pbody').addEventListener('dblclick', e => { const b = e.target.closest('.it[data-act="sel"]'); if (!b) return; const it = itemByU(b.dataset.arg); if (it) { equip(it); renderPanel(); } });
$('#drinks').addEventListener('click', e => { const b = e.target.closest('[data-drink]'); if (!b) return; if (selDrink === b.dataset.drink && IS_TOUCH) useDrink(); selDrink = b.dataset.drink; refreshHUD(); });
$('#weapon').addEventListener('click', () => swapHands());
/* Головне меню: зберігаємо прогрес і повертаємось на стартовий екран */
function toMainMenu() { save(); NET.wanted = false; running = false; setTimeout(() => location.reload(), 150); }
$('#tomenu').addEventListener('click', () => { if (confirm('Вийти в головне меню? Прогрес збережено.')) toMainMenu(); });
$('#pbody').addEventListener('click', e => { if (e.target.closest('[data-menu]')) toMainMenu(); });
$('#online').addEventListener('click', () => { panel === 'online' ? closePanel() : openPanel('online'); });
document.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => { const n = b.dataset.open; panel === n ? closePanel() : openPanel(n); }));
function refreshQuest() {
  if (!P) return;
  const q = curQuest();
  let html = `<h4>${q.n}</h4>`;
  if (P.qstate === 'offer') html += `<div>Маріанна біля бару в «Гущі» має для тебе завдання.</div>`;
  else if (P.qstate === 'active') html += `<div>${q.d}</div><div class="pr">${P.qprog} / ${q.need}</div>`;
  else html += `<div>Готово! Повернись до Маріанни за нагородою.</div>`;
  $('#quest').innerHTML = html;
}
function toast(html) {
  const box = $('#toasts');
  const el = document.createElement('div'); el.className = 'toast'; el.innerHTML = html; box.appendChild(el);
  while (box.children.length > 5) box.firstChild.remove();
  setTimeout(() => el.remove(), 4600);
}
let bannerT = null;
function banner(txt) { const e = $('#event'); e.textContent = txt; e.style.opacity = 1; clearTimeout(bannerT); bannerT = setTimeout(() => e.style.opacity = 0, 3800); }
let zoneT = null;
function showZone(n, sub) { const z = $('#zone'); z.innerHTML = `${n}<small>${sub || ''}</small>`; z.style.opacity = 1; clearTimeout(zoneT); zoneT = setTimeout(() => z.style.opacity = 0, 2600); }
function refreshLook() {
  if (!hero) return;
  const c = COSM.find(c => c.id === P.cos) || COSM[0];
  hero.apron.material = mat(c.c);
  const it = eqItem('hand1');
  const key = it ? it.b + (it.broken ? '_b' : '') : 'fists';
  if (key !== heldKey) {
    if (heldMesh) hero.hand.remove(heldMesh);
    heldMesh = it ? handMesh(it.b, it.broken) : null;
    if (heldMesh) hero.hand.add(heldMesh);
    heldKey = key;
  }
}

/* ---------- Панелі ---------- */
let panel = null, selU = null, newConfirm = false;
const TABS = [['pause', '⏸️ Пауза'], ['map', '🗺️ Мапа'], ['journal', '📔 Щоденник'], ['inv', '🎒 Речі'], ['cases', '🎁 Кейси'], ['skills', '🌳 Навички'], ['drinks', '☕ Напої'], ['craft', '🛠️ Крафт'], ['work', '🔧 Майстерня'], ['shop', '🛒 Крамниця'], ['home', '🏝️ Острів'], ['stash', '📦 Сховок'], ['quest', '📜 Квест'], ['sound', '⚙️ Налаштування'], ['help', '❔ Довідка'], ['online', '👥 Онлайн'], ['admin', '🛡️ Адмін']];
function openPanel(name) {
  panel = name; paused = !NET.on || pl.dead; input.atk = false;   // онлайн світ не зупиняється, поки відкрите меню pl.charge = 0; input.jumpHeld = false;
  for (const k in keys) keys[k] = false;
  $('#panel').hidden = false; renderPanel();
}
function closePanel() { panel = null; $('#panel').hidden = true; paused = pl.dead && !NET.on; cv.focus(); }
$('#pclose').addEventListener('click', closePanel);
$('#panel').addEventListener('click', e => { if (e.target.id === 'panel') closePanel(); });
$('#ptabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) { panel = b.dataset.tab; renderPanel(); } });
const atWorkbench = () => dist2(pl.x, pl.z, WORKBENCH.x, WORKBENCH.z) < 3.5;
const inHub = () => dist2(pl.x, pl.z, 0, 0) < ISLMAP.hub.r;
function needChips(need) { return Object.keys(need).map(k => `<span class="chip" style="${(P.ing[k] || 0) < need[k] ? 'color:#C2335A' : ''}">${ING[k].ic} ${ING[k].n} ${P.ing[k] || 0}/${need[k]}</span>`).join(' '); }
function renderPanel() {
  if (!panel) return;
  $('#ptabs').innerHTML = TABS.filter(([id]) => (id !== 'admin' || (ACCT && ACCT.admin)) && (id !== 'online' || NET.on)).map(([id, n]) => {
    const sp = n.indexOf(' '), ic = n.slice(0, sp), lb = n.slice(sp + 1);
    const dot = (id === 'inv' && P.pts) || (id === 'skills' && P.sp) || (id === 'cases' && Object.values(P.cases || {}).some(n => n > 0));
    return `<button data-tab="${id}" class="${id === panel ? 'on' : ''}" title="${lb}"><span class="ti">${ic}</span><span class="tl">${lb}</span>${dot ? '<i class="td"></i>' : ''}</button>`;
  }).join('');
  const cur = TABS.find(([id]) => id === panel); $('#ptitle').textContent = cur ? cur[1] : '';
  const on = $('#ptabs .on'); if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  const body = $('#pbody');
  const f = { home: renderHomePanel, stash: renderStash, map: renderMap, journal: renderJournal, inv: renderInv, cases: renderCases, sound: renderSound, skills: renderSkills, drinks: renderDrinks, craft: renderCraft, work: renderWork, shop: renderShop, quest: renderQuestPanel, help: renderHelp, pause: renderPause, admin: renderAdmin, online: renderOnline }[panel] || addonTabRender(panel);
  body.innerHTML = f();
  if (panel === 'map') drawMap();
}
function itemStatsHTML(it) {
  const B = BASE[it.b];
  let rows = [];
  if (B.slot === 'hand') {
    const h = handStats(Object.assign({}, it, { broken: false }));
    rows = [['Шкода (стрес)', h.dmg.toFixed(1)], ['Швидкість атаки', h.spd.toFixed(2) + ' уд/с'], ['Дальність', h.rng.toFixed(1) + ' м'], ['Радіус удару', h.rad.toFixed(1) + ' м'], ['Шанс криту', Math.round(h.crit * 100) + '%'], ['Відкидання', h.kb.toFixed(1)], ['Міцність', `${it.dur} / ${it.maxDur}`], ['Вага', h.wt.toFixed(1) + ' кг'], ['Швидкість використання', Math.round(h.use * 1000) + ' мс'], ['Форма атаки', { stab: 'укол', swing: 'замах', sweep: 'широкий змах', slam: 'удар навколо', shot: 'постріл', cone: 'струмінь', steam: 'паровий вибух' }[h.style]]];
    if (B.fx) rows.push(['Ефект', FX_DESC[B.fx]]);
  } else {
    const gs = gearStats(it);
    rows = Object.keys(gs).map(k => [STAT_IC[k] + ' ' + STATN[k], '+' + gs[k]]);
  }
  const aff = it.aff.length && B.slot === 'hand' ? `<div class="muted" style="font-size:12px">Афікси: ${it.aff.map(a => { const A = HAFF.find(x => x.k === a.k); return `+${a.v}% ${A.n}`; }).join(', ')}</div>` : '';
  return `<div class="kv">${rows.map(r => `<span>${r[0]}</span><span>${r[1]}</span>`).join('')}</div>${aff}`;
}
function renderInv() {
  const view = INV.view || 'items';
  const vt = [['items', '🎒 Речі', P.inv.some(i => i.isNew)], ['res', '🧪 Ресурси', false], ['char', '👤 Персонаж', P.pts > 0]]
    .map(([k, n, dot]) => `<button class="seg ${view === k ? 'on' : ''}" data-act="iview" data-arg="${k}">${n}${dot ? ' •' : ''}</button>`).join('');
  const head = `<div class="segs">${vt}</div>`;
  if (view === 'res') return head + renderInvRes();
  if (view === 'char') return head + renderInvChar();
  return head + renderInvItems();
}
const EQ_SLOTS = [['hand1', 'Основна рука', '✋'], ['hand2', 'Друга рука', '🤚'], ['head', 'Голова', '🧢'], ['apron', 'Фартух', '🦺'], ['shoes', 'Взуття', '👟'], ['acc', 'Аксесуар', '💍'], ['gear', 'Кавове обладн.', '⚙️']];
function renderInvItems() {
  const eq = EQ_SLOTS.map(([s, n, ic]) => { const it = eqItem(s); return `<button class="eqs sm ${it ? 'r' + it.r : ''} ${it && it.u === selU ? 'selected' : ''}" data-act="sel" data-arg="${it ? it.u : ''}" title="${n}${it ? ': ' + itemName(it) : ' — порожньо'}"><span class="ic" style="${it ? '' : 'opacity:.3'}">${it ? BASE[it.b].ic : ic}</span><span class="lb">${n}</span></button>`; }).join('');
  const sorted = P.inv.filter(it => !eqSlotOf(it)).filter(invFilter).sort(invSort);
  const grid = sorted.map(it => `<button class="it r${it.r} ${it.broken ? 'broken' : ''} ${it.u === selU ? 'selected' : ''}" data-act="sel" data-arg="${it.u}" title="${itemName(it)}">${BASE[it.b].ic}${it.fav ? '<span class="fav">⭐</span>' : ''}${it.isNew ? '<span class="newd"></span>' : ''}${it.lvl ? `<span class="lv">+${it.lvl}</span>` : ''}${BASE[it.b].slot === 'hand' && !it.broken ? `<span class="durb"><i style="width:${it.dur / it.maxDur * 100}%"></i></span>` : ''}</button>`).join('');
  const sel = selU && itemByU(selU);
  let det = `<div class="detail muted idet">Натисни на річ, щоб побачити її і вдягнути.<br><br>Подвійний клік — одразу вдягнути.<br>⭐ — захищає від масових дій.</div>`;
  if (sel) {
    const B = BASE[sel.b], es = eqSlotOf(sel);
    const sell = Math.round(6 * Math.pow(sel.r + 1, 2) * (1 + sel.lvl * .3));
    let main = '';
    if (es) main = `<button class="btn big1" data-act="uneq">Зняти</button>`;
    else if (B.slot === 'hand') main = `<button class="btn big1" data-act="eq" data-arg="hand1">✋ В руку</button><button class="btn alt" data-act="eq" data-arg="hand2" title="У другу руку (X — поміняти)">🤚</button>`;
    else main = `<button class="btn big1" data-act="eq" data-arg="${B.slot}">Одягнути</button>`;
    const more = `<button class="btn alt" data-act="fav">${sel.fav ? '★ Прибрати' : '☆ Улюблене'}</button>${nearStash() && !es ? '<button class="btn alt" data-act="tostash">📦 У сховок</button>' : ''}<button class="btn alt" data-act="sell" ${inHub() && !sel.fav && !es ? '' : 'disabled'} title="${inHub() ? '' : 'Продати можна тільки в «Гущі»'}">🪙 Продати · ${sell}</button><button class="btn alt" data-act="dis" ${sel.fav || es ? 'disabled' : ''}>🔩 Розібрати</button>`;
    det = `<div class="detail idet"><div class="ihead"><span class="bigic r${sel.r}">${B.ic}</span><div><h4 class="t${sel.r}">${itemName(sel)}</h4><div class="muted" style="font-size:12px">${RAR[sel.r].name}${sel.broken ? ' · <b style="color:#C2335A">зламано</b>' : ''}${es ? ' · вдягнуто' : ''}${B.explore ? ' · знахідка' : ''}${B.bossOnly ? ' · трофей боса' : ''}</div></div></div>
      ${B.d ? `<p style="margin:8px 0 0;font-size:13px">${B.d}</p>` : ''}
      ${compareHTML(sel)}
      <div class="btns">${main}</div>
      <details class="idetails"><summary>Усі характеристики</summary>${itemStatsHTML(sel)}</details>
      <div class="btns small">${more}</div></div>`;
  }
  const fchips = [['all', 'Усе'], ['hand', '⚔️ Зброя'], ['gear', '👕 Одяг'], ['broken', '🔧 Зламане'], ['fav', '⭐']].map(([k, n]) => `<button class="fchip ${INV.filter === k ? 'on' : ''}" data-act="ifilter" data-arg="${k}">${n}</button>`).join('');
  const sortN = { rarity: 'рідкість', type: 'тип', new: 'новизна' }[INV.sort];
  return `<div class="invwrap"><div class="invmain">
    <div class="eqrow">${eq}</div>
    <div class="itool"><div class="chips">${fchips}</div><button class="fchip" data-act="isortnext" title="Змінити сортування">↕ ${sortN}</button></div>
    <div class="invgrid">${grid || '<span class="muted" style="grid-column:1/-1">Тут порожньо</span>'}</div>
    <div class="ifoot"><span class="muted">${P.inv.length}/60 речей</span><button class="btn alt" data-act="autoeq">✨ Вдягнути найкраще</button>
      <details class="bulk"><summary>Масові дії</summary><div class="btns"><button class="btn alt" data-act="bulkdis">Розібрати всі Common</button><button class="btn alt" data-act="bulksell" ${inHub() ? '' : 'disabled'}>Продати всі Common</button></div></details></div>
  </div><div class="invside">${det}</div></div>`;
}
function renderInvRes() {
  const ings = Object.keys(ING).filter(k => P.ing[k]).map(k => `<div class="res"><span class="ic">${ING[k].ic}</span><b>${P.ing[k]}</b><span>${ING[k].n}</span></div>`).join('') || '<span class="muted">Порожньо — збирай на островах і з монстрів.</span>';
  const dr = knownDrinks().map((d, i) => `<div class="res ${P.drinks[d] ? '' : 'off'}"><span class="ic">${DRINK[d].ic}</span><b>${P.drinks[d] || 0}</b><span>${DRINK[d].n}</span><small>${i + 1}</small></div>`).join('');
  return `<h3>Напої</h3><p class="muted" style="font-size:12px;margin-top:-6px">Q / ПКМ — кинути вибраний напій, 1–8 — вибрати.</p><div class="resgrid">${dr}</div>
    <h3 style="margin-top:14px">Інгредієнти</h3><div class="resgrid">${ings}</div>`;
}
function renderInvChar() {
  const stats = ST_KEYS.map(k => `<span>${STAT_IC[k]} ${STATN[k]}</span><b>${S[k]}</b>${P.pts ? `<button data-act="stat" data-arg="${k}" aria-label="Додати">+</button>` : '<span></span>'}`).join('');
  const cos = COSM.map(c => `<button class="cos ${c.id === P.cos ? 'on' : ''}" style="background:${c.c}${P.cosm.includes(c.id) ? '' : ';opacity:.2;cursor:default'}" data-act="cos" data-arg="${c.id}" title="${c.n}${P.cosm.includes(c.id) ? '' : ' (ще не знайдено)'}" aria-label="${c.n}"></button>`).join('');
  return `<div class="cols"><div><h3>Бариста · рівень ${P.lvl}</h3>
    ${P.pts ? `<p class="note">Вільних очок характеристик: <b>${P.pts}</b> — тисни «+».</p>` : ''}
    <div class="stats">${stats}</div></div>
    <div><h3>Підсумок</h3><div class="kv"><span>❤ Здоров’я</span><span>${S.maxHP}</span><span>💨 Витривалість</span><span>${S.maxSt}</span><span>🛡️ Захист</span><span>${Math.round(S.defR * 100)}%</span><span>☕ Сила напоїв</span><span>×${S.effM.toFixed(2)}</span><span>⏱️ Варіння</span><span>×${(1 / S.brewM).toFixed(2)}</span><span>🏋️ Вага в руках</span><span>${S.W.toFixed(1)} кг${S.pen ? ` (−${Math.round(S.pen * 100)}%)` : ''}</span></div>
    <h3 style="margin-top:14px">Колір фартуха</h3><div class="chips">${cos}</div></div></div>`;
}
function renderSkills() {
  const br = Object.keys(SK).map(k => {
    const b = SK[k];
    const nodes = b.nodes.map((n, i) => {
      const got = hasSk(n.id), prev = i === 0 || hasSk(b.nodes[i - 1].id), cost = n.cost || 1;
      const can = !got && prev && P.sp >= cost;
      return `<button class="node ${got ? 'got' : ''} ${!got && !prev ? 'lock' : ''}" data-act="skill" data-arg="${n.id}" ${can ? '' : 'aria-disabled="true"'}><b>${n.n}</b>${n.d}<br><span style="opacity:.7">${got ? 'вивчено' : `${cost} оч.`}</span></button>`;
    }).join('');
    return `<div class="br" style="border-top:5px solid ${b.c}"><h4>${b.n}</h4><div class="bd">${b.d}</div>${nodes}</div>`;
  }).join('');
  return `<h3>Дерево навичок · вільних очок: ${P.sp}</h3><p class="muted" style="font-size:13px">Кожен рівень дає 1 очко. Навички в гілці відкриваються по черзі зверху вниз.</p><div class="tree">${br}</div>`;
}
function renderDrinks() {
  const w = brewWhere();
  const where = w === 'bar' ? 'Ти біля бару — повна швидкість.' : w === 'port' ? 'Портативне варіння (кавове обладнання) — на 60% повільніше.' : 'Підійди до бару або вдягни кавове обладнання в спецслот, щоб варити.';
  const brewing = P.brew ? `<p class="note">Вариться «${DRINK[P.brew.id].n}»: ${Math.round(P.brew.t / P.brew.total * 100)}%. Можна закрити меню й бігати — кава вариться далі.</p>` : '';
  const rows = DRINK_ORDER.map(id => {
    const D = DRINK[id];
    if (!P.known[id]) return `<div class="row" style="opacity:.55"><span class="ic">❔</span><div class="tx"><b>Невідомий рецепт</b><div class="need">Шукай рецепти в скринях, у заспокоєних або в квестах.</div></div></div>`;
    const ok = w && !P.brew && canAfford(D.need) && !(D.barOnly && w !== 'bar');
    const t = (D.t * S.brewM * (w === 'port' ? 1.6 : 1)).toFixed(1);
    return `<div class="row"><span class="ic">${D.ic}</span><div class="tx"><b>${D.n}</b> · у тебе ${P.drinks[id] || 0}<div>${D.d}${D.calm ? ` Заспокоєння: ${Math.round(D.calm * S.effM)}.` : ''} Час: ${t} с.${D.barOnly ? ' Тільки бар.' : ''}</div><div class="need" style="margin-top:4px">${needChips(D.need)}</div></div><button class="btn" data-act="brew" data-arg="${id}" ${ok ? '' : 'disabled'}>Варити</button></div>`;
  }).join('');
  const artRow = `<div class="btns" style="margin:0 0 10px"><button class="btn ${P.artOn !== false ? '' : 'alt'}" data-act="arttoggle">Латте-арт на барі: ${P.artOn !== false ? 'увімкнено' : 'вимкнено'}</button></div><p class="muted" style="font-size:12px;margin:-4px 0 10px">Міні-гра при варінні на барі: ★★ — наступний напій сильніший на 30%, ★★★ — ще й додаткова чашка. Ворогам над головою видно, чого вони хочуть: улюблений напій заспокоює на 60% сильніше.</p>`;
  return `<h3>Напої</h3><p class="note">${where}</p>${artRow}${brewing}<div class="list">${rows}</div><p class="muted" style="font-size:12px;margin-top:10px">Кидай напій (Q / ПКМ) у монстра або подай впритул — «з рук у руки» дає +25% до сили. Інгредієнти докупиш у крамниці «Гущі».</p>`;
}
function findInputs(rec) {
  const used = new Set(), out = [];
  for (const [b, br] of rec.items) {
    const cand = P.inv.filter(it => it.b === b && !used.has(it.u) && (br === null || it.broken === br)).sort((x, y) => (!!eqSlotOf(x) - !!eqSlotOf(y)));
    if (!cand.length) return null;
    used.add(cand[0].u); out.push(cand[0]);
  }
  return out;
}
function renderCraft() {
  const near = atWorkbench();
  const rows = Object.keys(CRAFT).map(id => {
    const R = CRAFT[id], B = BASE[R.out];
    if (!P.recipes[id]) return `<div class="row" style="opacity:.55"><span class="ic">❔</span><div class="tx"><b>Рецепт ще не знайдено</b><div class="need">Підказка: ${R.d.split('+')[0]}+ …</div></div></div>`;
    const ins = findInputs(R);
    const items = R.items.map(([b, br]) => `<span class="chip" style="${P.inv.some(it => it.b === b && (br === null || it.broken === br)) ? '' : 'color:#C2335A'}">${BASE[b].ic} ${br ? (BASE[b].bn || 'Зламаний ' + BASE[b].n) : BASE[b].n}</span>`).join(' ');
    const ok = near && ins && canAfford(R.ing);
    return `<div class="row"><span class="ic">${B.ic}</span><div class="tx"><b class="t${R.r}">${B.n}</b> · ${RAR[R.r].name}+<div>${B.d}</div><div class="need" style="margin-top:4px">${items} ${needChips(R.ing)}</div></div><button class="btn" data-act="craft" data-arg="${id}" ${ok ? '' : 'disabled'}>Створити</button></div>`;
  }).join('');
  return `<h3>Крафт</h3>${near ? '' : '<p class="note">Крафт працює біля верстака в «Кавовій Гущі» (захід від бару).</p>'}<p class="muted" style="font-size:13px">Зламані речі — не сміття. Комбінуй їх з дивними інгредієнтами. Рідкість результату — не нижча за найрідкісніший компонент.</p><div class="list">${rows}</div>`;
}
function renderWork() {
  const near = atWorkbench();
  const items = P.inv.slice().sort((a, b) => b.r - a.r).map(it => {
    const B = BASE[it.b], isHand = B.slot === 'hand';
    const pm = perk('mechanic') ? .7 : 1;
    const rc = Math.round(5 * (it.r + 1) * pm), needRep = isHand && it.dur < it.maxDur;
    const L = it.lvl + 1, uc = Math.round(15 * L * (it.r + 1) * pm);
    const canRep = near && needRep && (P.ing.tape || 0) >= 1 && P.coins >= rc;
    const canUp = near && it.lvl < 5 && (P.ing.tape || 0) >= L && (P.ing.bolts || 0) >= L * 2 && P.coins >= uc;
    return `<div class="row"><span class="ic">${B.ic}</span><div class="tx"><b class="t${it.r}">${itemName(it)}</b>${isHand ? ` · міцність ${it.dur}/${it.maxDur}` : ''}<div class="need">Ремонт: 🩹1 + ${rc}🪙 · Покращення до +${L}: 🩹${L} + 🔩${L * 2} + ${uc}🪙 (+8–10% до всього)</div></div>
      <div class="btns" style="margin:0">${isHand ? `<button class="btn alt" data-act="rep" data-arg="${it.u}" ${canRep ? '' : 'disabled'}>Полагодити</button>` : ''}<button class="btn" data-act="up" data-arg="${it.u}" ${canUp ? '' : 'disabled'}>${it.lvl >= 5 ? 'Максимум' : 'Покращити'}</button></div></div>`;
  }).join('');
  return `<h3>Майстерня</h3>${near ? '' : '<p class="note">Ремонт і покращення — біля верстака в «Кавовій Гущі».</p>'}<p class="muted" style="font-size:13px">У тебе: 🩹 ${P.ing.tape || 0} скотчу · 🔩 ${P.ing.bolts || 0} болтів · 🪙 ${P.coins}. Скотч і болти падають з ящиків, принтерів і розібраних речей.</p><div class="list">${items}</div>`;
}
const SHOP = [['beans', 4], ['milk', 4], ['chamomile', 6], ['tears', 10], ['monday', 10], ['syrup', 14], ['tape', 8]];
function renderShop() {
  const ok = inHub();
  const fv = Math.round(fishValue() * (perk('fishmarket') ? 1.3 : 1)), fc = fishCount();
  return `<h3>Крамниця «Гущі»</h3>${ok ? '' : '<p class="note">Крамниця працює тільки в «Кавовій Гущі».</p>'}<p class="muted">У тебе ${P.coins} 🪙</p>${fc ? `<div class="row" style="margin-bottom:8px"><span class="ic">🐟</span><div class="tx"><b>Риба в кошику: ${fc}</b><div class="need">${FISH.filter(f => P.fish[f.id]).map(f => f.ic + '×' + P.fish[f.id]).join(' ')}</div></div><button class="btn" data-act="sellfish" ${ok ? '' : 'disabled'}>Продати · ${fv} 🪙</button></div>` : ''}<div class="list">${SHOP.map(([k, c]) => `<div class="row"><span class="ic">${ING[k].ic}</span><div class="tx"><b>${ING[k].n}</b> · у тебе ${P.ing[k] || 0}</div><button class="btn" data-act="buy" data-arg="${k}" ${ok && P.coins >= c ? '' : 'disabled'}>Купити · ${c} 🪙</button></div>`).join('')}</div>`;
}
function renderQuestPanel() {
  const q = curQuest(), near = dist2(pl.x, pl.z, GIVER.x, GIVER.z) < 3.2;
  let act = '';
  if (P.qstate === 'offer') act = `<button class="btn big" data-act="qacc" ${near ? '' : 'disabled'}>Взяти квест</button>`;
  else if (P.qstate === 'done') act = `<button class="btn big" data-act="qdone" ${near ? '' : 'disabled'}>Здати квест</button>`;
  else act = `<p class="note">Прогрес: <b>${P.qprog} / ${q.need}</b></p>`;
  const rw = q.rw, rws = [rw.xp && `${rw.xp} XP`, rw.coins && `${rw.coins} 🪙`, rw.item && 'предмет', rw.recipe && 'рецепт напою', rw.craft && 'рецепт крафту', rw.rollR != null && `річ ${RAR[rw.rollR].name}+`, rw.case && CASES[rw.case].ic + ' ' + CASES[rw.case].n].filter(Boolean).join(' · ');
  const line = P.qstate === 'offer' ? (P.quest === 0 ? '«Нарешті! Світ розвалюється, а людям ніхто навіть каву не зварить. Почнемо з простого.»' : '«Маю ще одну зміну для тебе.»') : P.qstate === 'done' ? '«Ось це я розумію — професіоналізм. Тримай.»' : '«Ти ще на зміні. Я вірю в тебе.»';
  return `<h3>Маріанна, старша бариста</h3><p><i>${line}</i></p><div class="detail"><h4>${q.n}${q.repeat ? ' (повторюваний)' : ''}</h4><p style="margin:6px 0">${q.d}</p><div class="muted" style="font-size:13px">Нагорода: ${rws}</div></div><div class="btns" style="margin-top:10px">${act}</div>${near ? '' : '<p class="muted" style="font-size:12px;margin-top:8px">Підійди до Маріанни біля бару, щоб узяти або здати квест.</p>'}
  <h3 style="margin-top:16px">Твоя зміна</h3><div class="chips"><span class="chip">Заспокоєно: ${P.calmed}</span><span class="chip">Рейдів пройдено: ${P.bossWins}</span><span class="chip">Відвідувачів у «Гущі»: ${CROWD.length}</span></div>`;
}
/* ---------- Пауза (Esc): режими й міні-ігри ---------- */
const MODES = [];   // аддони додають режими через Addon.mode({ id, ic, n, sub, go, here, leave, group }); group: 'pvp' — у кнопці PVP
const pvpModes = () => MODES.filter(m => m.group === 'pvp');
/* головне меню: запустити режим одразу після входу в гру */
let mmGo = null;
function mmLaunch(fn) {
  const mm = $('#main-menu'); if (mm) { mm.classList.add('mm-hide'); mm.addEventListener('transitionend', () => mm.remove(), { once: true }); }
  if (running) fn(); else mmGo = fn;
}
/* кнопка PVP у головному меню відкривається, щойно аддон додав PVP-режим */
function mmPvp() {
  const c = $('#mm-pvp'); if (!c || !pvpModes().length) return;
  if (c.classList.contains('mm-locked')) {
    c.classList.remove('mm-locked'); const b = c.querySelector('.mm-locked-badge'); if (b) b.remove();
    const d = document.createElement('div'); d.className = 'mm-desc'; c.querySelector('.mm-card-body').appendChild(d);
    c.addEventListener('click', () => {
      if ($('#mm-pvp-pick')) return;
      const o = document.createElement('div'); o.id = 'mm-pvp-pick';
      o.innerHTML = `<div class="pk"><h3>🥊 PVP — обери режим</h3><div class="pkl">${pvpModes().map(m => `<button class="pm" data-pm="${m.id}"><span class="ic">${m.ic || '🎮'}</span><b>${m.n}</b><span>${m.sub || ''}</span></button>`).join('')}</div><button class="x">✕ Назад</button></div>`;
      o.addEventListener('click', e => { const b = e.target.closest('[data-pm]'); if (b) { const m = MODES.find(q => q.id === b.dataset.pm); o.remove(); if (m) mmLaunch(() => m.go()); } else if (e.target === o || e.target.closest('.x')) o.remove(); });
      document.body.appendChild(o);
    });
  }
  c.querySelector('.mm-desc').textContent = pvpModes().map(m => m.n).join(' · ');
}
function curMode() { return MODES.find(m => { try { return m.here && m.here(); } catch (e) { return false; } }) || null; }
function renderPause() {
  const cur = curMode();
  const card = (id, ic, n, sub, on, locked) => `<button class="mode${on ? ' on' : ''}" data-mode="${id}" ${locked ? 'disabled' : ''}><span class="mic">${ic}</span><b>${n}</b><span class="msub">${sub}</span>${on ? '<i>ти тут</i>' : locked ? '<i>🔒 скоро</i>' : ''}</button>`;
  return `<h3>⏸️ Пауза</h3><div class="btns"><button class="btn" data-pause="go">▶ Продовжити</button></div>
    <h3 style="margin-top:14px">🎮 Режими й міні-ігри</h3>
    <div class="modes">${card('world', '🌍', 'Відкритий світ', 'острови, квести, рейди, «Гуща»', !cur)}${MODES.filter(m => m.group !== 'pvp').map(m => card(m.id, m.ic || '🎮', m.n, m.sub || '', cur === m)).join('')}${pvpModes().length ? '' : card('pvp', '🥊', 'PVP', 'Каво-махалово', false, true)}${card('event', '🎪', 'Івент', 'Рейд на Боса', false, true)}</div>
    ${pvpModes().length ? `<h3 style="margin-top:14px">🥊 PVP</h3><div class="modes">${pvpModes().map(m => card(m.id, m.ic || '🎮', m.n, m.sub || '', cur === m)).join('')}</div>` : ''}
    <p class="muted" style="font-size:12px;margin-top:8px">Інвентар, монети й прогрес — спільні для всіх режимів.</p>
    <div class="btns" style="margin-top:12px"><button class="btn alt" data-pause="help">❔ Довідка</button><button class="btn alt" data-pause="sound">⚙️ Налаштування</button><button class="btn alt" data-menu="1">🏠 Головне меню</button></div>`;
}
function goHub(msg) {
  closePanel(); const f = $('#fade'); if (f) f.style.opacity = 1; sfx('travel');
  setTimeout(() => { pl.x = 0; pl.z = 3; pl.y = 0; pl.vy = 0; pl.falling = false; pl.jump = null; pl.safe = { x: 0, z: 3 }; camPos.set(0, 20, 18); camLook.set(0, .5, 3); if (f) f.style.opacity = 0; if (msg) toast(msg); }, 260);
}
$('#pbody').addEventListener('click', e => {
  const p = e.target.closest('[data-pause]'); if (p) { const a = p.dataset.pause; if (a === 'go') closePanel(); else openPanel(a); return; }
  const b = e.target.closest('[data-mode]'); if (!b || b.disabled) return;
  const id = b.dataset.mode, cur = curMode();
  if (cur && cur.id !== id && cur.leave && !cur.leave()) return;   // режим може не відпустити (або спитати «точно?»)
  if (id === 'world') { if (!cur) { closePanel(); return; } goHub('🌍 Відкритий світ. З поверненням у «Гущу».'); return; }
  const m = MODES.find(x => x.id === id); if (!m) return;
  if (cur === m) { closePanel(); return; }
  closePanel(); m.go();
});
function renderHelp() {
  return `<h3>Як грати</h3>
  <p><b>Мета.</b> Ти не воюєш — ти обслуговуєш. Монстри — це вигорілі люди. Удари предметами збивають їм стрес (але не нижче чверті) і відкидають. Остаточно заспокоює тільки кава: кинь її або подай впритул.</p>
  <p><b>Фізика й хаос.</b> Відкинутий монстр ламає ящики, кулери й принтери. Принтер вибухає й розкидає всіх навколо, кулер робить підлогу слизькою. Монстра можна збити з острова — «полетів у відпустку».</p>
  <p><b>Ухиляння.</b> Ривок дає кадри невразливості. Ривок у момент удару — «ідеальне ухиляння»: сповільнення часу й витривалість.</p>
  <p><b>Варіння.</b> Бар у «Гущі» й на Вежі. Кава вариться у фоні, поки ти бігаєш. Кавове обладнання у спецслоті дозволяє варити будь-де.</p>
  <p><b>Предмети.</b> Шість рідкостей від Common до Mythic. Кожна річ має шкоду, швидкість, дальність, радіус, крит, відкидання, міцність, вагу. Зламані речі йдуть на крафт.</p>
  <p><b>Дослідження.</b> Світ має моря, сніг, джунглі й пустелю. Шукай орієнтири, записки, блискучі хрестики (копай скарби), рибаль на пірсі й ополонці, приручай улюбленців кавою. Унікальна зброя й броня — тільки в скринях орієнтирів, у розкопках і на дні. Кавові точки ☕ дають швидке переміщення. Вночі вороги сонні, а деяка риба клює тільки в темряві.</p>
  <p><b>Вода й лід.</b> У глибокій воді пливеш і витрачаєш витривалість, бити не можна. На льоду ковзаєш. Ворогів можна збити у воду.</p>
  <p><b>Хаос і тролінг.</b> 🛒 Візки й крісла (F — сісти) слизькі: розганяйся й збивай мобів як кеглі, але на поворотах вилітаєш у прірву. 🍯 Калюжі сиропу ковзкі. ☕ Кавоварки під тиском вибухають від удару. 🌀 Вентилятори на мостах (F) здувають усіх у безодню. 🪠 Вантуз-гарпун притягує мобів, баки й тімейтів. 🏀 F — підняти будь-що рухоме: збитого (або оглушеного) моба, бак, кег, візок, крісло, ящик, принтер, кавоварку… і навіть друга; ЛКМ або Q — жбурнути (принтер і кавоварка вибухають). Друга можна вдарити, збити з візка й таранити візком; він вирветься, якщо швидко тиснути Пробіл. Онлайн: швабра відкидає друга, кинута кава його «ошпарює», 🍵 Спешл-Матча (з 🍀) — зелений туман і гумове керування.</p>
  <p><b>Рейд.</b> CEO-психопат на Вежі. Звичайні напої діють на 30%. Звари «Гігантський раф» на барі (рецепт дає квест «Квартальний звіт»).</p>
  <div class="keys">${IS_TOUCH ? '<kbd>Джойстик</kbd><span>рух</span><kbd>Удар</kbd><span>тисни — серія, утримуй — заряджений удар</span><kbd>Стрибок</kbd><span>утримуй у повітрі — плануй</span><kbd>Ривок</kbd><span>ухиляння</span><kbd>Подати</kbd><span>напій (вибери на панелі)</span><kbd>Дія</kbd><span>взаємодія</span><kbd>⇄</kbd><span>змінити руку</span>' : '<kbd>WASD</kbd><span>рух</span><kbd>ЛКМ</kbd><span>удар; швидкі удари поспіль — серія з фінішером</span><kbd>ПКМ / Q</kbd><span>кинути напій (впритул — подати з рук у руки)</span><kbd>1–6</kbd><span>вибір напою</span><kbd>E</kbd><span>інвентар</span><kbd>F</kbd><span>взаємодія: бар, верстак, скрині, квести</span><kbd>X</kbd><span>змінити руку</span><kbd>Пробіл</kbd><span>стрибок; утримуй у повітрі — плануй</span><kbd>Shift</kbd><span>ривок</span><kbd>Утримуй ЛКМ</kbd><span>заряджений удар</span><kbd>M / J / H</kbd><span>мапа / щоденник / острів</span><kbd>I / B / K / C</kbd><span>речі / кейси / навички / крафт</span><kbd>Esc</kbd><span>закрити меню</span>'}</div>
  <div class="btns" style="margin-top:12px"><button class="btn" data-act="tut">Пройти навчання ще раз</button><button class="btn alt" data-act="reset">${newConfirm ? 'Точно? Натисни ще раз' : 'Почати гру заново'}</button></div>`;
}
$('#pbody').addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
  const a = b.dataset.act, arg = b.dataset.arg;
  const sel = selU && itemByU(selU);
  if (a === 'sel') { selU = arg || null; const it = selU && itemByU(selU); if (it && it.isNew) it.isNew = false; }
  else if (a === 'ifilter') INV.filter = arg;
  else if (a === 'isort') INV.sort = arg;
  else if (a === 'iview') { INV.view = arg; if (arg !== 'items') P.inv.forEach(i => { i.isNew = false; }); }
  else if (a === 'isortnext') { const o = ['rarity', 'type', 'new']; INV.sort = o[(o.indexOf(INV.sort) + 1) % o.length]; }
  else if (a === 'fav' && sel) sel.fav = !sel.fav;
  else if (a === 'autoeq') autoEquip();
  else if (a === 'bulkdis') bulkCommon('dis');
  else if (a === 'bulksell' && inHub()) bulkCommon('sell');
  else if (a === 'tostash' && sel && nearStash()) { if (P.stash.length >= 80) toast('Сховок повний'); else { P.inv = P.inv.filter(i => i !== sel); P.stash.push(sel); selU = null; toast(`📦 ${itemName(sel)} — у сховку`); } }
  else if (a === 'unstash' && nearStash()) { const it = P.stash.find(i => i.u === arg); if (it) { if (P.inv.length >= 60) toast('Інвентар повний'); else { P.stash = P.stash.filter(i => i !== it); P.inv.push(it); toast(`🎒 ${itemName(it)} — в інвентарі`); } } }
  else if (a === 'hslot') homeSel = +arg;
  else if (a === 'hplace' && homeSel != null) { const old = P.home.slots[homeSel]; if (old) P.decor[old] = (P.decor[old] || 0) + 1; P.home.slots[homeSel] = arg; P.decor[arg]--; renderHome(); sfx('equip'); }
  else if (a === 'hclear' && homeSel != null) { const old = P.home.slots[homeSel]; if (old) { P.decor[old] = (P.decor[old] || 0) + 1; P.home.slots[homeSel] = null; renderHome(); } }
  else if (a === 'hcolor') { P.home.color = arg; renderHome(); }
  else if (a === 'hbuy') { const pr = decorPrice(arg), D = DECOR[arg]; if (P.coins >= pr && !(D.heal && worldHeal() < D.heal)) { P.coins -= pr; P.decor[arg] = (P.decor[arg] || 0) + 1; sfx('coin'); toast(`${D.ic} ${D.n} — у запасі. Вибери місце й постав.`); } }
  else if (a === 'gfx') { GFX.q = arg; saveGfx(); applyGfx(true); }
  else if (a === 'fps') { GFX.fps = !GFX.fps; saveGfx(); }
  else if (a === 'stat' && P.pts > 0) { P.alloc[arg]++; P.pts--; calcStats(); sfx('equip'); }
  else if (a === 'eq' && sel) equip(sel, arg);
  else if (a === 'uneq' && sel) { const s = eqSlotOf(sel); if (s) { P.eq[s] = null; onGearChanged(); } }
  else if (a === 'dis' && sel) {
    const bolts = randi(1, 2) + sel.r, tape = Math.random() < .4 + sel.r * .1 ? 1 : 0;
    P.ing.bolts = (P.ing.bolts || 0) + bolts; P.ing.tape = (P.ing.tape || 0) + tape;
    toast(`Розібрано: 🔩×${bolts}${tape ? ' 🩹×1' : ''}`); removeItem(sel); selU = null; sfx('break');
  }
  else if (a === 'sell' && sel) { const c = Math.round(6 * Math.pow(sel.r + 1, 2) * (1 + sel.lvl * .3)); P.coins += c; toast(`Продано за ${c} 🪙`); removeItem(sel); selU = null; sfx('coin'); }
  else if (a === 'cos' && P.cosm.includes(arg)) { P.cos = arg; refreshLook(); }
  else if (a === 'skill') {
    const br = Object.values(SK).find(x => x.nodes.some(n => n.id === arg)), i = br.nodes.findIndex(n => n.id === arg), n = br.nodes[i], cost = n.cost || 1;
    if (!hasSk(arg) && (i === 0 || hasSk(br.nodes[i - 1].id)) && P.sp >= cost) { P.skills[arg] = 1; P.sp -= cost; calcStats(); sfx('level'); toast(`Навичка: <b>${n.n}</b>`); }
    else if (P.sp < cost && !hasSk(arg)) toast('Бракує очок навичок.');
  }
  else if (a === 'brew') { if (nearBar() && P.artOn !== false && !DRINK[arg].self && !P.brew && canAfford(DRINK[arg].need)) { startArt(arg); return; } startBrew(arg); }
  else if (a === 'arttoggle') { P.artOn = P.artOn === false; }
  else if (a === 'craft') {
    const R = CRAFT[arg], ins = findInputs(R);
    if (ins && canAfford(R.ing) && atWorkbench()) {
      ins.forEach(it => removeItem(it));
      for (const k in R.ing) P.ing[k] -= R.ing[k];
      const r = Math.max(R.r, ...ins.map(i => i.r));
      const it = makeItem(R.out, r); addItem(it, true);
      banner(`Створено: ${BASE[R.out].ic} ${BASE[R.out].n}`); burst(WORKBENCH.x, 1.2, WORKBENCH.z, RAR[r].c, 24, 4, 1, 4); sfx('legend');
      addXP(40); selU = it.u;
    }
  }
  else if (a === 'rep') { const it = itemByU(arg); const c = Math.round(5 * (it.r + 1) * (perk('mechanic') ? .7 : 1)); P.ing.tape--; P.coins -= c; it.broken = false; it.dur = it.maxDur; toast(`Полагоджено: ${itemName(it)}`); onGearChanged(); sfx('equip'); }
  else if (a === 'up') {
    const it = itemByU(arg), L = it.lvl + 1;
    P.ing.tape -= L; P.ing.bolts -= L * 2; P.coins -= Math.round(15 * L * (it.r + 1) * (perk('mechanic') ? .7 : 1)); it.lvl = L;
    if (BASE[it.b].slot === 'hand') { it.maxDur = Math.round(it.maxDur * 1.08); it.dur = it.maxDur; it.broken = false; }
    toast(`Покращено: <b>${itemName(it)}</b>`); onGearChanged(); sfx('level');
  }
  else if (a === 'buy') { const s = SHOP.find(x => x[0] === arg); if (P.coins >= s[1]) { P.coins -= s[1]; P.ing[arg] = (P.ing[arg] || 0) + 1; sfx('coin'); } }
  else if (a === 'qacc') { acceptQuest(); }
  else if (a === 'qdone') { turnInQuest(); }
  else if (a === 'travel') { travelTo(arg); return; }
  else if (a === 'pet') { setActivePet(arg || null); sfx('tame'); }
  else if (a === 'sellfish') { const v = Math.round(fishValue() * (perk('fishmarket') ? 1.3 : 1)); if (v && inHub()) { P.coins += v; P.fish = {}; toast(`Маріанна купила всю рибу для «рибного дня»: +${v} 🪙`); sfx('coin'); } }
  else if (a === 'tut') { closePanel(); tutStart(); return; }
  else if (a === 'opencase') { openCase(arg); return; }
  else if (a === 'buycase') { const C = CASES[arg]; if (C.price && P.coins >= C.price && inHub()) { P.coins -= C.price; addCase(arg, 1, true); sfx('coin'); } }
  else if (a === 'reset') { if (!newConfirm) { newConfirm = true; } else { running = false; try { localStorage.removeItem(SAVE_KEY); } catch (er) { } if (accountMode() && ACCT) api('wipe').then(() => location.reload()); else location.reload(); return; } }
  refreshHUD(); renderPanel();
});

/* ---------- Камера та анімація світу ---------- */
const camPos = new THREE.Vector3(30, 30, 40), camLook = new THREE.Vector3(10, 0, 10), _t = new THREE.Vector3();
function updCamera(dt) {
  if (!running) {
    const a = performance.now() * .00006;
    _t.set(16 + Math.sin(a) * 34, 26, 12 + Math.cos(a) * 34);
    camPos.lerp(_t, 1 - Math.exp(-dt * 2)); camLook.lerp(_t.set(16, -2, 12), 1 - Math.exp(-dt * 2));
  } else {
    const k = innerWidth < innerHeight ? 1.45 : 1;
    const y = pl.falling ? 0 : Math.max(0, pl.y) * .55;
    _t.set(pl.x, 16.5 * k + y, pl.z + 12.5 * k);
    camPos.lerp(_t, 1 - Math.exp(-dt * 6));
    camLook.lerp(_t.set(pl.x, .5 + y, pl.z - .5), 1 - Math.exp(-dt * 8));
  }
  camera.position.copy(camPos);
  if (shake > 0) { shake = Math.max(0, shake - dt); camera.position.x += (Math.random() - .5) * shake; camera.position.y += (Math.random() - .5) * shake; }
  camera.lookAt(camLook);
  sun.position.set(camLook.x + 14, 30, camLook.z + 9); sun.target.position.set(camLook.x, 0, camLook.z);
}
function updWorldAnim(dt) {
  const t = performance.now() / 1000;
  for (const d of DEBRIS) { const b = d.userData.bob; d.position.y = b.y + Math.sin(t * b.sp + b.ph) * .6; if (b.rot) d.rotation.y += b.rot * dt; }
  for (const c of CLOUDS) { c.position.x += c.userData.drift * dt; if (c.position.x > 120) c.position.x = -70; }
  for (const p of PADS) if (p.mesh && !p.style) p.mesh.position.y = .2 + Math.abs(Math.sin(t * 3)) * .06;
}

/* ---------- Головний цикл ---------- */
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const rdt = Math.min(.05, Math.max(0, (now - last) / 1000)); last = now;
  if (slowT > 0) { slowT -= rdt; timeScale = .35; if (slowT <= 0) { timeScale = 1; if ($('#vignette').className === 'slow') $('#vignette').className = ''; } }
  if (hitStopT > 0) hitStopT -= rdt;
  const dt = rdt * (hitStopT > 0 ? .04 : timeScale);
  const live = running && !paused;
  if (live) {
    gameTime += dt;
    updInput();
    updCharge(dt);
    updPlayer(dt);
    if (WORLD.on) worldTick(dt);   // спільний світ: моби, боси, візки — із сервера
    else {
      MON.slice().forEach(m => { if (!m.calm && m.state !== 'fall' && dist2(m.x, m.z, pl.x, pl.z) > 48) { if (m.bar) m.bar.visible = false; if (m.wantS) m.wantS.visible = false; return; } if (!m.calm && m.state !== 'fall' && m.bar) m.bar.visible = true; updMonster(m, dt); });
      updMinibosses(dt); updBoss(dt); updProps(dt); updSpawns(dt); updEvents(dt);
    }
    updWarn(dt); updProj(dt); updTele(dt); updNodes(dt); updChests(dt); updDrops(dt); updBrew(dt); updCrowd(dt); updGiver(); updInteract(); updDummy(dt); updTut(dt); updExplore(dt); updRemotes(dt); updFun(dt); addonTick(dt);
  }
  else if (running && pl.dead) netStateTick(rdt);   // мертвий: гра на паузі, але друзі мають бачити
  updParticles(live ? dt : 0); updFX(live ? dt : 0); updLights(rdt);
  updWorldAnim(rdt); updCamera(rdt); updOverlays(live ? rdt : 0); updCase(rdt); updArt(rdt); updFps(rdt);
  if (running) updHUDFrame();
  musicTick();
  renderer.render(scene, camera);
}

