/* Аддон «Хаос-зброя»: будівельний степлер, пожежна помпа з еспресо, моб-баскетбол 2.0.
   Встановлення: поклади цей файл у addons/ і онови сторінку гри. */
const A = Addon.info({ name: 'Хаос-зброя', version: '1.0', desc: 'Будівельний степлер прибиває дрібних ворогів до підлоги, пожежна помпа з еспресо змиває всіх за край, кинутий моб — живий снаряд (Q або ЛКМ).' });

/* ---------- 1. Нова зброя (падає з ворогів, скринь і кейсів як звичайний лут) ---------- */
Object.assign(BASE, {
  nailgun: { n: 'Будівельний степлер', bn: 'Заклинений будівельний степлер', ic: '📌', slot: 'hand', style: 'shot', dmg: 4, spd: 4.2, rng: 11, rad: .4, crit: .2, kb: 1, dur: 260, wt: 1.6, use: .02, fx: 'nail',
    d: 'Черга скоб. Дрібних ворогів прибиває до підлоги на 2.5 с, великих — сповільнює.' },
  espump: { n: 'Пожежна помпа з еспресо', bn: 'Пробита помпа', ic: '🚒', slot: 'hand', style: 'cone', dmg: 3, spd: 3, rng: 5.2, rad: 1.6, crit: 0, kb: 19, dur: 160, wt: 4.5, use: .03, fx: 'espump',
    d: 'Струмінь гарячого еспресо під тиском: шалене відкидання (мобів і тімейтів — за край), трохи заспокоює.' },
});
FX_DESC.nail = 'Прибиває дрібних ворогів до підлоги';
FX_DESC.espump = 'Струмінь еспресо: відкидання і трохи спокою';

/* Стартовий набір — один раз на акаунт */
A.on('start', () => {
  const d = A.data();
  if (d.given) return;
  d.given = 1;
  addItem(makeItem('nailgun', 1), true); addItem(makeItem('espump', 1), true);
  toast('📌🚒 Аддон «Хаос-зброя»: у тебе <b>Будівельний степлер</b> і <b>Пожежна помпа з еспресо</b> — дивись інвентар (E).');
});

/* ---------- 2. Степлер: прибивання до підлоги ----------
   Скоби з будь-якого степлера (і звичайного 📎, і будівельного 📌) мітимо при пострілі,
   а коли скоба зникла, влучивши, — прибиваємо найближчого ворога. */
const NAILS = new Set(), PINNED = new Set();
const _spawnProj = spawnProj;
spawnProj = function (o) {
  const it = eqItem('hand1');
  if (o.from === 'player' && o.kind === 'staple' && it && !it.broken && (it.b === 'nailgun' || it.b === 'stapler')) { o.nail = it.b === 'nailgun' ? 2.5 : 1.4; NAILS.add(o); }
  return _spawnProj(o);
};
function pin(m, t) {
  const small = (m.mass || 1) <= 1.3;
  if (!small) { if (!(m.slow > 0)) ftext(m.x, 2.4, m.z, 'Скоба застрягла!', 'calm'); m.slow = Math.max(m.slow || 0, 2); return; }
  const fresh = !(m.pinT > 0);
  m.pinT = Math.max(m.pinT || 0, t); m.vx = m.vz = 0;
  if (!m.pinMesh) {
    const g = new THREE.Group();
    for (const a of [-.25, .25]) { const s = mesh(new THREE.BoxGeometry(.5, .06, .08), '#D5D9E4', false); s.position.set(a, .06, 0); s.rotation.y = a * 3; g.add(s); }
    scene.add(g); m.pinMesh = g;
  }
  PINNED.add(m);
  if (fresh) ftext(m.x, 2.4, m.z, 'ПРИБИТО! 📌', 'crit');
  burst(m.x, .2, m.z, '#D5D9E4', 8, 2, .4, 2);
}
function updNails(dt) {
  for (const o of NAILS) {
    if (PROJ.includes(o)) continue;
    NAILS.delete(o);
    if (o.life <= 0) continue;                       // долетіла без влучання
    let best = null, bd = 1.2;
    for (const m of MON) { if (m.calm || m.state === 'fall' || m.carried) continue; const d = dist2(m.x, m.z, o.x, o.z); if (d < bd) { bd = d; best = m; } }
    if (best) pin(best, o.nail);
  }
  for (const m of PINNED) {
    if (m.calm || m.dead || m.state === 'fall' || m.carried) { if (m.pinMesh) { scene.remove(m.pinMesh); m.pinMesh = null; } PINNED.delete(m); continue; }
    m.pinT -= dt; m.stun = Math.max(m.stun, .2); m.vx *= .2; m.vz *= .2;
    m.pinMesh.position.set(m.x, 0, m.z);
    if (Math.random() < dt * 2) bubble(m, pick(['Я прибитий до роботи!', 'Відпусти, в мене нарада!', 'Це скоба чи дедлайн?!']), true, 1.4);
    if (m.pinT <= 0) { scene.remove(m.pinMesh); m.pinMesh = null; PINNED.delete(m); ftext(m.x, 2.2, m.z, 'Відірвався', 'bad'); }
  }
}

/* ---------- 3. Пожежна помпа: струмінь еспресо ---------- */
let jetT = 0;
function updPump(dt) {
  const it = eqItem('hand1');
  if (!it || it.b !== 'espump' || it.broken) return;
  if (pl.swingT > 0 || pl.pending) jetT = .25;
  if (jetT <= 0) return;
  jetT -= dt;
  for (let i = 0; i < 4; i++) {
    const d = rand(.6, 5.2), a = pl.face + rand(-.35, .35);
    burst(pl.x + Math.sin(a) * d, 1 + rand(-.2, .3) - d * .08, pl.z + Math.cos(a) * d, pick(['#8C5A3C', '#C99A6E', '#FFF3E6']), 1, 1.2, .35, .2);
  }
  // помпа трохи заспокоює гарячим еспресо і змиває калюжами по дорозі
  for (const m of MON) {
    if (m.calm || m.state === 'fall' || m.carried) continue;
    if (inArc(pl.x, pl.z, pl.face, m.x, m.z, 5.4, 55)) { m.stress = Math.max(m.max * .25, m.stress - 6 * dt); m.slow = Math.max(m.slow || 0, .5); }
  }
}

/* ---------- 4. Моб-баскетбол 2.0: кинутий моб — снаряд ----------
   Q (або ЛКМ), поки тримаєш моба, — кидок. Кинутий моб ламає ящики, підриває кавоварки,
   збиває баки й візки; влучив у кавоварку — СЛЕМ-ДАНК і монети. */
const KEY_PASS = /!== false/.test(String(addonKey));   // нові версії гри пропускають клавішу, якщо обробник повернув false
A.key('KeyQ', () => {
  if (pl.carry && !paused) { throwCarried(); pl.atkCd = .4; return; }
  if (KEY_PASS) return false;                       // без моба Q — звичайний напій (гра зробить сама)
  if (!paused && !pl.dead && !panel) useDrink();    // старіша версія гри: кидаємо напій самі
});
function updThrown(dt) {
  for (const t of MON) {
    if (!(t.thrown > 0)) continue;
    const sp = Math.hypot(t.vx, t.vz); if (sp < 3) continue;
    const glide = Math.exp(3.6 * dt); t.vx *= glide; t.vz *= glide;   // летить далеко, як снаряд (гра гальмує ×e^-5, лишається ×e^-1.4)
    for (const p of PROPS) {
      if (!p.alive || dist2(p.x, p.z, t.x, t.z) > p.r + .55) continue;
      const boom = p.type === 'espmachine';
      damageProp(p, boom ? 99 : sp * 3, 'knock');
      if (boom) { ftext(t.x, 3, t.z, 'СЛЕМ-ДАНК У КАВОВАРКУ! 🏀💥', 'big'); dropLoot(t.x, t.z, [{ k: 'coins', d: 12 }]); addXP(25, t.x, t.z); }
      t.vx *= .5; t.vz *= .5;
    }
    for (const b of BODIES) {
      if (b.fall || b === pl.ride || dist2(b.x, b.z, t.x, t.z) > b.r + .6) continue;
      const a = angTo(t.x, t.z, b.x, b.z); b.vx += Math.sin(a) * sp; b.vz += Math.cos(a) * sp; b.spin = 8;
      ftext(b.x, 1.8, b.z, 'Бдзинь!', 'crit'); t.vx *= .6; t.vz *= .6;
    }
    if (Math.random() < .5) burst(t.x, 1, t.z, '#FFF3E6', 1, .5, .3, .3);   // слід польоту
  }
}

A.on('tick', dt => { updNails(dt); updPump(dt); updThrown(dt); });
