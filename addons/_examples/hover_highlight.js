/* Аддон «Підсвітка цілі»: наведи мишку на ворога — під ним засвітиться кільце,
   а поруч з'явиться підказка: хто це, рівень, стрес і улюблений напій.
   Працює для звичайних мобів, CEO та міні-босів. На телефоні (без мишки) вимкнено. */
const A = Addon.info({ name: 'Підсвітка цілі', version: '1.0', desc: 'Наведи мишку на ворога — кільце під ним і підказка: рівень, стрес, улюблений напій.' });

const HL = { mx: -1, my: -1, target: null, ring: null, tip: null, t: 0 };

A.on('start', () => {
  if (IS_TOUCH || window.__SIM) return;
  // кільце під ціллю
  const ring = new THREE.Mesh(new THREE.RingGeometry(.62, .82, 32), new THREE.MeshBasicMaterial({ color: '#FF8A7A', transparent: true, opacity: .9, side: THREE.DoubleSide, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.renderOrder = 4; ring.visible = false; scene.add(ring); HL.ring = ring;
  const inner = new THREE.Mesh(new THREE.CircleGeometry(.62, 32), new THREE.MeshBasicMaterial({ color: '#FF8A7A', transparent: true, opacity: .22, depthWrite: false }));
  ring.add(inner); inner.position.z = .001;
  // підказка
  const tip = document.createElement('div');
  tip.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;background:rgba(46,35,70,.88);color:#fff;padding:6px 10px;border-radius:10px;font-size:12px;line-height:1.35;white-space:nowrap;box-shadow:0 4px 14px rgba(0,0,0,.25);display:none;border:2px solid #FF8A7A';
  fxLayer.appendChild(tip); HL.tip = tip;
  cv.addEventListener('pointermove', e => { if (e.pointerType !== 'touch') { HL.mx = e.clientX; HL.my = e.clientY; } });
  cv.addEventListener('pointerleave', () => { HL.mx = HL.my = -1; });
});

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
A.on('tick', dt => {
  if (!HL.ring) return;
  HL.t += dt;
  const c = pickTarget();
  HL.target = c ? c.e : null;
  HL.ring.visible = !!c; HL.tip.style.display = c ? '' : 'none';
  if (!c) return;
  const low = !c.boss && c.e.stress <= c.e.max * .25 + .5;
  const col = c.boss ? '#FF5C7A' : low ? '#8FD9C0' : '#FF8A7A';
  HL.ring.material.color.set(col); HL.ring.children[0].material.color.set(col);
  HL.ring.position.set(c.x, (c.y > -1 ? Math.max(0, c.y) : 0) + .06, c.z);
  HL.ring.scale.setScalar(c.r * (1 + Math.sin(HL.t * 6) * .06));
  HL.ring.rotation.z += dt * .8;
  HL.tip.style.borderColor = col;
  const html = tipHTML(c); if (HL.tip.innerHTML !== html) HL.tip.innerHTML = html;
  const p = screenPos(c.x, c.y + c.h + .5, c.z);
  HL.tip.style.transform = `translate(${Math.round(p.x)}px,${Math.round(p.y)}px) translate(-50%,-100%)`;
});
