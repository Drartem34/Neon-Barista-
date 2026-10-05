/* Аддон «Прогресія світу»: що далі від «Кавової Гущі», то сильніші моби.
   Рівень моба залежить від відстані від центру світу (0, 0): Опен-спейс 2, Архів і сніг 3,
   море 4, Вежа CEO 5, джунглі й пустеля 6. Сильніші моби мають більше стресу й б'ють сильніше,
   зате дають більше досвіду й монет. Над кожним мобом видно його рівень.
   Працює і в спільному світі (сервер світу теж завантажує аддони). */
const A = Addon.info({ name: 'Прогресія світу', version: '1.1', desc: 'Що далі від «Гущі», то вищий рівень мобів: більше стресу й шкоди, але й більше досвіду й монет.' });

const MAXLVL = 10;
function zoneLevel(x, z) { return Math.max(1, Math.min(MAXLVL, 1 + Math.floor(Math.max(0, Math.hypot(x, z) - 12) / 11))); }
const LVL_COL = ['#8FD9C0', '#8FD9C0', '#B8E68F', '#FFD27A', '#FFB38A', '#FF8A7A', '#FF6B93', '#D46BF0', '#9A63E0', '#6E5CE0', '#2E2346'];

/* ---------- Підсилення моба під час появи ---------- */
const _spawnMonster = spawnMonster;
spawnMonster = function (...a) {
  const m = _spawnMonster.apply(this, a);
  if (!m || m.T.dummy || m.zlvl || (m.isl && m.isl.noZone)) return m;   // режими з власною складністю (сплав)
  const lvl = zoneLevel(m.x, m.z);
  m.zlvl = lvl;
  if (lvl > 1) {
    m.max = Math.round(m.max * (1 + .15 * (lvl - 1))); m.stress = m.max;
    m.dmg *= 1 + .08 * (lvl - 1);
    m.spd *= 1 + .02 * (lvl - 1);
  }
  if (typeof document !== 'undefined' && !window.__SIM) attachLevelTag(m);
  return m;
};

/* Бонус за заспокоєння сильного моба — досвід і монети */
const _calmMonster = calmMonster;
calmMonster = function (m) {
  _calmMonster.apply(this, arguments);
  const lvl = m.zlvl || 1;
  if (lvl > 1 && !m.T.dummy && !m.proxy) {
    addXP(Math.round(m.T.xp * (m.isl.tier || 1) * .25 * (lvl - 1)), m.x, m.z);
    dropLoot(m.x, m.z, [{ k: 'coins', d: 2 * lvl }]);
  }
};

/* ---------- Табличка рівня над мобом ---------- */
const TAG_TEX = {};
function tagTex(lvl) {
  if (TAG_TEX[lvl]) return TAG_TEX[lvl];
  const c = document.createElement('canvas'); c.width = 96; c.height = 40;
  const x = c.getContext && c.getContext('2d');
  if (x && x.fillText) {
    x.fillStyle = LVL_COL[lvl] || '#2E2346'; x.beginPath();
    if (x.roundRect) x.roundRect(2, 2, 92, 36, 14); else x.rect(2, 2, 92, 36);
    x.fill();
    x.fillStyle = lvl >= 9 ? '#FFFFFF' : '#2E2346'; x.font = 'bold 22px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('Рів. ' + lvl, 48, 21);
  }
  return TAG_TEX[lvl] = new THREE.CanvasTexture(c);
}
function attachLevelTag(m) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tagTex(m.zlvl), transparent: true, depthWrite: false }));
  s.scale.set(.72, .3, 1); s.renderOrder = 3; scene.add(s); m.lvlTag = s;
}
const _removeMonster = removeMonster;
removeMonster = function (m) { if (m.lvlTag) { scene.remove(m.lvlTag); m.lvlTag = null; } return _removeMonster.apply(this, arguments); };

/* ---------- Кожен кадр: табличка над баром + попередження про небезпеку ---------- */
let lastZone = null;
A.on('tick', () => {
  for (const m of MON) {
    const s = m.lvlTag; if (!s) continue;
    // у спільному світі рівень рахуємо з місця появи (сервер робить так само)
    const show = !m.calm && m.state !== 'fall' && !m.carried && dist2(m.x, m.z, pl.x, pl.z) < 22;
    s.visible = show;
    if (show) s.position.set(m.x, (m.bh || 2.3) + (m.wantS && m.wantS.visible ? 1.2 : .52), m.z);
  }
  if (curZone && curZone !== lastZone) {
    lastZone = curZone;
    if (curZone.spawn && !curZone.noZone) {
      const lvl = zoneLevel(curZone.x, curZone.z);
      if (lvl >= 3) toast(`⚠️ <b>${curZone.n}</b>: моби рівня ~${lvl}. ${lvl >= 6 ? 'Небезпечно! Бери найкращу зброю й багато кави.' : 'Більше досвіду й монет.'}`);
    }
  }
});
