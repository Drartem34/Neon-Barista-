/* Аддон «Підсвітка цілі й прицілювання мишкою».
   - Наведи мишку на ворога: його обведе кольоровим контуром, поруч з'явиться підказка
     (хто це, рівень, стрес, улюблений напій). Працює для мобів, CEO та міні-босів.
   - Навколо курсора напівпрозоре коло — його добре видно; над ворогом воно червоніє.
   - Персонаж завжди дивиться на курсор і б'є / стріляє / кидає каву туди
     (якщо курсор над ворогом — точно в нього).
   На телефоні (без мишки) вимкнено. */
const A = Addon.info({ name: 'Підсвітка цілі', version: '1.2', desc: 'Контур і підказка для ворога під курсором, коло навколо курсора, персонаж дивиться й б’є туди, де мишка.' });

const HL = { mx: -1, my: -1, target: null, ring: null, tip: null, cur: null, t: 0 };
const _aimRay = new THREE.Raycaster(), _aimPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), _aimHit = new THREE.Vector3(), _aimNdc = new THREE.Vector2();

A.on('start', () => {
  if (IS_TOUCH || window.__SIM) return;
  HL.ring = true;   // готово (обводка створюється на льоту)
  // підказка
  const tip = document.createElement('div');
  tip.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;background:rgba(46,35,70,.88);color:#fff;padding:6px 10px;border-radius:10px;font-size:12px;line-height:1.35;white-space:nowrap;box-shadow:0 4px 14px rgba(0,0,0,.25);display:none;border:2px solid #FF8A7A';
  fxLayer.appendChild(tip); HL.tip = tip;
  // коло навколо курсора
  const cur = document.createElement('div');
  cur.style.cssText = 'position:fixed;left:0;top:0;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;pointer-events:none;z-index:3;border:2px solid rgba(255,255,255,.6);background:radial-gradient(circle,rgba(255,255,255,.22) 0 35%,rgba(255,255,255,.06) 70%,transparent 72%);box-shadow:0 0 12px rgba(255,255,255,.25);display:none;transition:border-color .12s,background .12s,width .12s,height .12s,margin .12s';
  document.body.appendChild(cur); HL.cur = cur;
  cv.addEventListener('pointermove', e => { if (e.pointerType !== 'touch') { HL.mx = e.clientX; HL.my = e.clientY; } });
  cv.addEventListener('pointerleave', () => { HL.mx = HL.my = -1; });
});

/* ---------- Обводка по контуру моделі ----------
   Кожна частина моделі отримує трохи збільшену копію, у якої видно лише внутрішні грані
   («вивернута оболонка») — виходить кольоровий контур саме по формі ворога. */
const OUTLINE_MAT = new THREE.MeshBasicMaterial({ color: '#FF8A7A', side: THREE.BackSide });
function rootOf(e) { return e === BOSS ? BOSS.mesh && BOSS.mesh.root : e.isMini ? e.mesh && e.mesh.root : e.parts && e.parts.root; }
function outline(e) {
  const root = rootOf(e); if (!root) return;
  const list = [];
  root.traverse(o => { if (o.isMesh && !o.userData.outline && o.geometry && o.visible) list.push(o); });
  e._outl = list.map(o => {
    const h = new THREE.Mesh(o.geometry, OUTLINE_MAT);
    h.userData.outline = true; h.renderOrder = -1;
    o.geometry.computeBoundingSphere && !o.geometry.boundingSphere && o.geometry.computeBoundingSphere();
    const r = (o.geometry.boundingSphere && o.geometry.boundingSphere.radius) || .3;
    h.scale.setScalar(1 + Math.min(.9, .085 / Math.max(.05, r)));   // однакова товщина контуру для великих і малих частин
    o.add(h); return h;
  });
}
function unOutline(e) { if (e && e._outl) { e._outl.forEach(h => h.parent && h.parent.remove(h)); e._outl = null; } }
const _removeMonsterHL = removeMonster;
removeMonster = function (m) { if (m === HL.target) { unOutline(m); HL.target = null; } return _removeMonsterHL.apply(this, arguments); };

/* Відстань від точки до відрізка на екрані (від ніг до голови цілі) */
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l));
  return Math.hypot(px - ax - dx * t, py - ay - dy * t);
}
function candidates() {
  const out = [];
  for (const m of MON) if (!m.calm && m.state !== 'fall' && !m.dead) out.push({ e: m, x: m.x, z: m.z, y: m.y || 0, h: m.bh || 2.3, r: 1 });
  if (BOSS.mesh && !BOSS.asleep && BOSS.x != null) out.push({ e: BOSS, x: BOSS.x, z: BOSS.z, y: 0, h: 4.6, r: 1.8, boss: true });
  for (const id in MBS) { const b = MBS[id]; if (!b.asleep && b.x != null) out.push({ e: b, x: b.x, z: b.z, y: b.y || 0, h: b.bh || 4, r: b.rad || 1.6, boss: true }); }
  return out;
}
function pickTarget() {
  if (HL.mx < 0 || paused) return null;
  let best = null, bd = 34;
  for (const c of candidates()) {
    if (dist2(c.x, c.z, pl.x, pl.z) > 30) continue;
    const a = screenPos(c.x, c.y + .1, c.z), b = screenPos(c.x, c.y + c.h, c.z);
    if (!a.vis) continue;
    const d = segDist(HL.mx, HL.my, a.x, a.y, b.x, b.y) / (c.boss ? 1.8 : 1);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}
function tipHTML(c) {
  const e = c.e;
  if (e === BOSS) return `<b>💼 CEO-психопат</b>${e.lvl > 1 ? ' · квартал ' + e.lvl : ''}<br>Стрес: ${Math.round(e.stress)} / ${e.max}<br><span style="opacity:.8">Бере тільки 🪣 Гігантський раф</span>`;
  if (e.isMini) return `<b>${e.def.ic} ${e.def.n}</b>${e.lvl > 1 ? ' · рівень ' + e.lvl : ''}<br>Стрес: ${Math.round(e.stress)} / ${e.max}<br><span style="opacity:.8">Любить: ${DRINK[e.def.fav].ic} ${DRINK[e.def.fav].n}</span>`;
  const floor = e.max * .25, low = e.stress <= floor + .5;
  const want = e.wants && DRINK[e.wants] ? `<br><span style="opacity:.8">Хоче: ${DRINK[e.wants].ic} ${DRINK[e.wants].n}</span>` : '';
  return `<b>${e.T.n}</b>${e.zlvl ? ' · рів. ' + e.zlvl : ''}<br>Стрес: ${Math.round(e.stress)} / ${e.max}${low ? ' · <span style="color:#8FD9C0">готовий до кави ☕</span>' : ''}${want}`;
}
/* Точка під курсором на висоті грудей персонажа — туди він дивиться й б'є */
function cursorWorld() {
  _aimNdc.set(HL.mx / innerWidth * 2 - 1, -(HL.my / innerHeight) * 2 + 1);
  _aimRay.setFromCamera(_aimNdc, camera);
  _aimPlane.constant = -((pl.y || 0) + 1);
  return _aimRay.ray.intersectPlane(_aimPlane, _aimHit) ? _aimHit : null;
}
function canTurn() { return !pl.dead && !pl.ride && !pl.jump && !pl.falling && !fishing && !(pl.emoteT > 0) && !(typeof FUN !== 'undefined' && FUN.held); }
A.on('tick', dt => {
  if (!HL.ring) return;
  HL.t += dt;
  const c = pickTarget();
  // курсор
  const onScreen = HL.mx >= 0 && !paused;
  HL.cur.style.display = onScreen ? '' : 'none';
  if (onScreen) {
    HL.cur.style.transform = `translate(${HL.mx}px,${HL.my}px)`;
    const col = c ? (c.boss ? '255,92,122' : c.e.stress <= c.e.max * .25 + .5 ? '143,217,192' : '255,138,122') : '255,255,255';
    HL.cur.style.borderColor = `rgba(${col},.85)`;
    HL.cur.style.background = `radial-gradient(circle,rgba(${col},.28) 0 35%,rgba(${col},.08) 70%,transparent 72%)`;
  }
  // прицілювання: персонаж дивиться на курсор, атаки летять туди
  if (onScreen) {
    const p = c ? { x: c.x, z: c.z } : cursorWorld();
    if (p) {
      input.ax = p.x; input.az = p.z; input.aimOk = true;
      if (canTurn() && dist2(pl.x, pl.z, p.x, p.z) > .3) {
        pl.face = lerpAng(pl.face, angTo(pl.x, pl.z, p.x, p.z), Math.min(1, dt * 18));
        if (hero) hero.root.rotation.y = pl.face;
      }
    }
  }
  const e = c ? c.e : null;
  if (e !== HL.target) { unOutline(HL.target); if (e) outline(e); HL.target = e; }
  HL.tip.style.display = c ? '' : 'none';
  if (!c) return;
  const low = !c.boss && c.e.stress <= c.e.max * .25 + .5;
  const col = c.boss ? '#FF5C7A' : low ? '#8FD9C0' : '#FF8A7A';
  OUTLINE_MAT.color.set(col);
  OUTLINE_MAT.color.offsetHSL(0, 0, Math.sin(HL.t * 7) * .06);
  HL.tip.style.borderColor = col;
  const html = tipHTML(c); if (HL.tip.innerHTML !== html) HL.tip.innerHTML = html;
  const p = screenPos(c.x, c.y + c.h + .5, c.z);
  HL.tip.style.transform = `translate(${Math.round(p.x)}px,${Math.round(p.y)}px) translate(-50%,-100%)`;
});
