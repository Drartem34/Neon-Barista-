/* Приклад аддона: «Диско-острів».
   Щоб увімкнути — скопіюй цей файл у addons/ (без підпапки _examples) і онови сторінку гри.
   Показує все API: острів + міст, будівлі, анімацію, клавішу, вкладку меню, мережу, збереження. */
const A = Addon.info({ name: 'Диско-острів', version: '1.0', desc: 'Острів із танцполом біля Парку. G — танцювати, за танці капають монети.' });

// 1) Острів і міст до Парку вигорання (робиться ДО побудови світу)
A.island({ id: 'disco', n: 'Диско-острів', sub: 'G — танцювати · за танці капають монети', x: -20, z: 46, r: 7.5, top: '#C9B3F5', rock: '#8C84C6', safe: true }, 'park');

// 2) Будівлі: танцпол і диско-куля (те, що блимає/крутиться, — через A.dynamic)
const TILES = [];
let ball = null;
A.on('world', () => {
  const s = ISLMAP.disco;
  for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(.95, .08, .95), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ff66cc', emissiveIntensity: 1.3, flatShading: true }));
    t.position.set(s.x - 2 + i, .05, s.z - 2 + j); scene.add(A.dynamic(t)); TILES.push(t);
  }
  const pole = mesh(flat(new THREE.CylinderGeometry(.06, .06, 4.2, 6)), '#4E4A6E'); pole.position.set(s.x + 3.4, 2.1, s.z - 3); scene.add(pole);
  ball = new THREE.Mesh(new THREE.IcosahedronGeometry(.6, 1), new THREE.MeshStandardMaterial({ color: '#E8ECF7', emissive: '#B9A4FF', emissiveIntensity: .6, roughness: .3, flatShading: true }));
  ball.position.set(s.x, 4.2, s.z); scene.add(A.dynamic(ball));
  addLampGlow(scene, s.x, 4.2, s.z, '#FFB3E6', 3.5, { pool: false });   // світіння з основної гри
});

// 3) Анімація кожен кадр + монети за танці
const COLORS = ['#ff66cc', '#66ccff', '#ffd166', '#7FE08A', '#B07CF0'];
let beat = 0, dance = 0;
const onFloor = () => { const s = ISLMAP.disco; return Math.abs(pl.x - s.x) < 2.6 && Math.abs(pl.z - s.z) < 2.6; };
A.on('tick', dt => {
  beat += dt;
  if (ball) ball.rotation.y += dt * 1.5;
  if (beat > .45) { beat = 0; TILES.forEach(t => t.material.emissive.set(pick(COLORS))); }
  if (pl.emote === 'dance' && pl.emoteT > 0 && onFloor()) {
    pl.emoteT = Math.max(pl.emoteT, .5);
    dance += dt;
    if (dance > 3) { dance = 0; P.coins++; A.data().coins = (A.data().coins || 0) + 1; ftext(pl.x, 2.6, pl.z, '+1 🪙 за рухи', 'gold'); refreshHUD(); }
  }
});

// 4) Клавіша G — танцювати (тільки на танцполі)
A.key('KeyG', () => {
  if (!onFloor()) { toast('🪩 Танцювати можна на Диско-острові, біля Парку.'); return; }
  pl.emote = 'dance'; pl.emoteT = 3; netSend({ t: 'emote', e: 'dance' });
});

// 5) Вкладка в меню + мережа: запросити всіх онлайн на диско
A.tab('disco', '🪩 Диско', () => `<h3>🪩 Диско-острів</h3>
  <p>Острів на заході від Парку вигорання. Стань на танцпол і тисни <b>G</b>.</p>
  <p>Натанцював: <b>${A.data().coins || 0} 🪙</b></p>
  <div class="btns"><button class="btn" data-disco="invite">📣 Покликати всіх онлайн</button></div>`,
  e => { if (e.target.closest('[data-disco="invite"]')) { A.send('invite', { by: myName() }); toast('📣 Запрошення надіслано'); } });
A.onNet('invite', (d, from) => toast(`🪩 <b>${escapeHTML(from.name)}</b> кличе всіх на Диско-острів біля Парку!`));
