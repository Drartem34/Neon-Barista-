/* Аддон «Кавовий рейс» (БЕТА): кооператив на 1–4 гравці в дусі Dear Passengers.
   Літак летить 4 хвилини до «Гущі». Салон повний пасажирів-офісників, і всі чогось хочуть.
   - Пілот (F у кабіні): A/D — крен. Літак обходить грози, лише нахилившись, а нахил хитає весь салон:
     бортпровідники ковзають, кава розливається. Без пілота автопілот ледве тримає літак рівно.
   - Бортпровідники: на камбузі (F) варять ☕ каву, 🍵 чай або беруть 🥐 круасан і несуть пасажиру (F біля нього).
     Кожен пасажир хоче своє; терпіння закінчується — злиться й псує настрій усім.
   - Гроза влучила — трясе всіх, усе розлітається. Настрій салону впав до нуля — рейс зірвано.
   У спільному світі рейс один на всіх: пасажирів, погоду й літак рахує сервер. */
const A = Addon.info({ name: 'Кавовий рейс (бета)', version: '0.9', desc: 'Кооп на 1–4: один пілотує літак, інші варять і розносять каву пасажирам. Грози, турбулентність, злі пасажири.' });

const SIMSIDE = !!window.__SIM;
const AUTH = () => SIMSIDE || !(typeof WORLD !== 'undefined' && WORLD.on);
const FX = -30, FZ = 118, ISL_R = 16;
const X0 = FX - 11, X1 = FX + 11, HW = 2.6;          // салон: від хвоста (X0) до кабіни (X1), ширина 2·HW
const COCKPIT = { x: X1 - 1.3, z: FZ }, DOOR = { x: X0 + 3.2, z: FZ - HW + .6 };
const ST_COFFEE = { x: X0 + .9, z: FZ - 1.6, item: 'coffee', t: 2.2 }, ST_TEA = { x: X0 + .9, z: FZ, item: 'tea', t: 1.6 }, ST_FOOD = { x: X0 + .9, z: FZ + 1.6, item: 'food', t: .3 };
const STATIONS = [ST_COFFEE, ST_TEA, ST_FOOD];
const ITEM = { coffee: { ic: '☕', n: 'кава', c: '#8C5A3C' }, tea: { ic: '🍵', n: 'чай', c: '#7FE08A' }, food: { ic: '🥐', n: 'круасан', c: '#F2A65A' } };
const SEATS = [];
for (let r = 0; r < 6; r++) for (const s of [-1, 1]) SEATS.push({ x: X0 + 4.6 + r * 2.4, z: FZ + s * 1.75, side: s });
const inPlane = (x, z) => dist2(x, z, FX, FZ) < ISL_R + 2;
const inCabin = (x, z) => x > X0 - .5 && x < X1 + .5 && Math.abs(z - FZ) < HW + .6;

A.island({ id: 'flight', n: 'Кавовий рейс', sub: 'бета · один пілотує, інші розносять каву', x: FX, z: FZ, r: ISL_R, top: '#3E4E8C', rock: '#8C84C6', biome: 'plane', tier: 1, safe: true });
const _buildIsland = buildIsland;
buildIsland = function (s) { if (s.biome !== 'plane') return _buildIsland.apply(this, arguments); return SIMSIDE ? new THREE.Group() : buildPlane(); };

/* ---------- Стан рейсу ---------- */
const ST = { on: false, t: 0, dur: 240, roll: 0, rv: 0, py: 0, storms: [], pass: SEATS.map(() => ({ want: '', pat: 1, mood: .8, angry: 0 })), pilot: '', served: 0, mood: .8, res: null, turb: 0 };
const AU = { reqT: 4, stormT: 10, inA: 0, inT: 0, stT: 0, sid: 0 };
const myKey = () => (NET.on && typeof WORLD !== 'undefined' && WORLD.on ? myName() : 'me');
const keyOf = from => SIMSIDE ? String(from && from.name || '') : 'me';
const r2 = v => Math.round(v * 100) / 100;
function snap() { return { on: ST.on ? 1 : 0, t: r2(ST.t), dur: ST.dur, r: r2(ST.roll), rv: r2(ST.rv), py: r2(ST.py), tb: r2(ST.turb), s: ST.storms.map(s => [s.id, r2(s.d), r2(s.y)]), p: ST.pass.map(p => [p.want, r2(p.pat), r2(p.mood), p.angry ? 1 : 0]), pi: ST.pilot, sv: ST.served, m: r2(ST.mood) }; }
function applySnap(d) {
  Object.assign(ST, { on: !!d.on, t: +d.t || 0, dur: +d.dur || 240, py: +d.py || 0, turb: +d.tb || 0, pilot: String(d.pi || ''), served: d.sv | 0, mood: +d.m || 0 });
  ST.rollT = +d.r || 0; ST.rv = +d.rv || 0;
  if (Array.isArray(d.s)) ST.storms = d.s.slice(0, 8).map(a => ({ id: a[0], d: +a[1], y: +a[2] }));
  if (Array.isArray(d.p)) d.p.slice(0, SEATS.length).forEach((a, i) => Object.assign(ST.pass[i], { want: ITEM[a[0]] ? a[0] : '', pat: +a[1], mood: +a[2], angry: !!a[3] }));
}
function pushState() { if (SIMSIDE) A.send('st', snap()); }
function emit(e) { if (SIMSIDE) A.send('ev', e); else onEvent(e); }
function req(k, d) { const o = Object.assign({ k }, d || {}); if (AUTH()) onReq(o, { id: NET.id, name: myName() }); else A.send('rq', o); }
A.onNet('st', (d, from) => { if (!SIMSIDE && !AUTH() && from.id === -1 && d) applySnap(d); });
A.onNet('ev', (d, from) => { if (!SIMSIDE && !AUTH() && from.id === -1 && d) onEvent(d); });
A.onNet('rq', (d, from) => { if (SIMSIDE && d) onReq(d, from); });

/* ---------- Логіка рейсу (сервер світу або сам гравець) ---------- */
function crew() { return SIMSIDE ? simPlayers().filter(p => !p.dead && inPlane(p.x, p.z)) : (!pl.dead && inPlane(pl.x, pl.z) ? [{ name: 'me' }] : []); }
function onReq(d, from) {
  const k = keyOf(from);
  if (d.k === 'start') { if (!ST.on) startFlight(from); }
  else if (d.k === 'pilot') { if (!ST.pilot || ST.pilot === k) { ST.pilot = d.off ? '' : k; emit({ k: 'msg', txt: d.off ? `🧑‍✈️ ${SIMSIDE ? escapeHTML(k) : 'Ти'} залишив штурвал — увімкнувся автопілот (погано тримає).` : `🧑‍✈️ ${SIMSIDE ? escapeHTML(k) : 'Ти'} сів за штурвал!` }); pushState(); } }
  else if (d.k === 'in') { if (ST.pilot === k) { AU.inA = clamp(+d.a || 0, -1, 1); AU.inT = .6; } }
  else if (d.k === 'serve') {
    const i = d.seat | 0, p = ST.pass[i]; if (!p || !ST.on) return;
    if (p.want && p.want === d.item) {
      p.mood = Math.min(1, p.mood + (p.angry ? .3 : .22) + p.pat * .1); p.want = ''; p.angry = 0; p.pat = 1; ST.served++;
      emit({ k: 'served', seat: i, ok: 1, to: d.to }); pushState();
    } else { p.mood = Math.max(0, p.mood - .08); emit({ k: 'served', seat: i, ok: 0, to: d.to }); }
  }
}
function startFlight(from) {
  Object.assign(ST, { on: true, t: 0, roll: 0, rv: 0, py: 0, storms: [], served: 0, mood: .8, res: null, turb: 0 });
  for (const p of ST.pass) Object.assign(p, { want: '', pat: 1, mood: .8, angry: 0 });
  Object.assign(AU, { reqT: 3, stormT: 12, inA: 0, inT: 0, stT: 0 });
  emit({ k: 'msg', big: 1, txt: `✈️ Рейс «Кавовий» вилітає! ${from && from.name && SIMSIDE ? escapeHTML(from.name) + ' оголосив посадку. ' : ''}Хтось — за штурвал, решта — на камбуз!` });
  pushState();
}
function endFlight(win, why) {
  if (!ST.on) return;
  ST.on = false;
  const res = { k: 'end', win: win ? 1 : 0, sv: ST.served, m: r2(ST.mood), why: why || '' };
  for (const p of ST.pass) { p.want = ''; p.angry = 0; }
  ST.pilot = ''; emit(res); pushState();
}
function authTick(dt) {
  if (!ST.on) return;
  ST.t += dt;
  const c = crew();
  if (!c.length) { AU.idle = (AU.idle || 0) + dt; if (AU.idle > (SIMSIDE ? 10 : 3)) endFlight(false, 'У літаку нікого не лишилось.'); return; }
  AU.idle = 0;
  if (ST.pilot && SIMSIDE && !c.some(p => p.name === ST.pilot)) ST.pilot = '';
  // крен: турбулентність проти пілота
  ST.turb = Math.sin(ST.t * .7) * .9 + Math.sin(ST.t * 2.3 + 1) * .6 + Math.sin(ST.t * 5.1) * .35;
  const gust = Math.sin(ST.t * .13) > .6 ? 1.8 : 1;   // зони сильної турбулентності
  AU.inT -= dt;
  const input = ST.pilot ? (AU.inT > 0 ? AU.inA : 0) : clamp(-ST.roll * .55 - ST.rv * .25, -1, 1);   // автопілот слабенький
  ST.rv += (ST.turb * 1.6 * gust + input * 3.4 - ST.roll * 1.1) * dt; ST.rv *= Math.exp(-1.8 * dt);
  ST.roll = clamp(ST.roll + ST.rv * dt, -1, 1);
  ST.py = clamp(ST.py + ST.roll * .55 * dt, -1, 1);   // нахилився — літак повертає
  // грози попереду: обходь креном
  AU.stormT -= dt;
  if (AU.stormT <= 0) { AU.stormT = rand(9, 15) * (1 - Math.min(.4, ST.t / 600)); ST.storms.push({ id: ++AU.sid, d: 1, y: r2(rand(-.9, .9)) }); emit({ k: 'msg', txt: '⛈️ Попереду гроза! Пілоте — обходь креном (A/D).' }); }
  for (let i = ST.storms.length - 1; i >= 0; i--) {
    const s = ST.storms[i]; s.d -= dt / 9;
    if (s.d <= 0) { ST.storms.splice(i, 1); if (Math.abs(s.y - ST.py) < .32) { emit({ k: 'storm' }); for (const p of ST.pass) p.mood = Math.max(0, p.mood - .12); ST.rv += rand(-2.5, 2.5); } else emit({ k: 'dodge' }); }
  }
  // пасажири хочуть
  AU.reqT -= dt;
  if (AU.reqT <= 0) {
    AU.reqT = Math.max(2.2, 6.5 - ST.t / 45) / Math.sqrt(Math.max(1, c.length - (ST.pilot ? 1 : 0)));
    const free = ST.pass.map((p, i) => i).filter(i => !ST.pass[i].want);
    if (free.length) { const p = ST.pass[pick(free)]; p.want = pick(['coffee', 'coffee', 'tea', 'food']); p.pat = 1; }
  }
  const shaky = Math.abs(ST.roll) > .5 ? Math.abs(ST.roll) : 0;
  for (const p of ST.pass) {
    if (p.want) { p.pat -= dt / 32; if (p.pat <= 0 && !p.angry) { p.angry = 1; p.pat = 0; p.mood = Math.max(0, p.mood - .25); } }
    if (p.angry) p.mood = Math.max(0, p.mood - .012 * dt);
    if (shaky) p.mood = Math.max(0, p.mood - .02 * shaky * dt);
  }
  ST.mood = ST.pass.reduce((a, p) => a + p.mood, 0) / ST.pass.length;
  if (ST.mood < .15) { endFlight(false, 'Пасажири влаштували бунт — рейс зірвано.'); return; }
  if (ST.t >= ST.dur) { endFlight(true); return; }
  AU.stT -= dt; if (AU.stT <= 0) { AU.stT = .2; pushState(); }
}
A.on('tick', dt => {
  if (AUTH()) authTick(dt);
  else if (ST.on) { ST.t += dt; ST.roll = lerp(ST.roll, ST.rollT || 0, Math.min(1, dt * 8)); for (const s of ST.storms) s.d -= dt / 9; }
  if (!SIMSIDE) clientTick(dt);
});

/* ======================= ДАЛІ — ЛИШЕ В ГРАВЦЯ ======================= */
const V = { cabin: null, clouds: [], seats: [], hud: null, radar: null, held: '', heldMesh: null, brew: null, flyT: 0, pilot: false, sendT: 0, spillT: 0, auto: false, joined: false };
const amPilot = () => ST.pilot && ST.pilot === myKey();

/* ---------- Літак ---------- */
function buildPlane() {
  const g = new THREE.Group(); scene.add(g);
  const L = X1 - X0;
  // фюзеляж знизу й підлога
  put(g, mesh(flat(new THREE.CylinderGeometry(HW + .7, HW + .7, L, 14, 1)), '#EDEFF7', false, true), FX, -HW - .95, FZ).rotation.z = Math.PI / 2;   // корпус — під підлогою, щоб було видно салон
  put(g, mesh(new THREE.BoxGeometry(L, .2, HW * 2 + .4), '#3E4E8C', false, true), FX, -.1, FZ);
  put(g, mesh(new THREE.BoxGeometry(L, .6, HW * 2 + .5), '#EDEFF7', false, true), FX, -.5, FZ);
  for (let k = -5; k <= 5; k++) put(g, mesh(new THREE.BoxGeometry(.9, .01, .5), '#E8505B', false), FX + k * 1.8, .01, FZ);   // доріжка в проході
  // борти з ілюмінаторами (низькі — щоб камера бачила салон)
  for (const s of [-1, 1]) {
    put(g, mesh(new THREE.BoxGeometry(L, .9, .25), '#F7F7FB', false, true), FX, .45, FZ + s * (HW + .1));
    for (let k = 0; k < 9; k++) put(g, mesh(new THREE.BoxGeometry(.5, .32, .05), bulb('#BDEFFF'), false), X0 + 2 + k * 2.3, .55, FZ + s * (HW + .24));
    // крило й двигун
    const w = put(g, mesh(new THREE.BoxGeometry(4.5, .25, 9), '#D9DCE8', false, true), FX + 1, -.9, FZ + s * (HW + 5)); w.rotation.y = s * .25;
    put(g, mesh(flat(new THREE.CylinderGeometry(.7, .6, 2.2, 12)), '#8E86B0', false), FX + 2.3, -1.6, FZ + s * (HW + 4)).rotation.z = Math.PI / 2;
    put(g, mesh(new THREE.BoxGeometry(.3, .3, .3), bulb(s < 0 ? '#FF5C7A' : '#7FE08A'), false), FX, -.75, FZ + s * (HW + 9.3));
  }
  // хвіст і ніс
  put(g, mesh(new THREE.BoxGeometry(2.6, 3.4, .25), '#EDEFF7', false), X0 - .6, 1.2, FZ);
  put(g, mesh(new THREE.BoxGeometry(1.2, .8, .27), '#E8505B', false), X0 - .6, 2.4, FZ);
  put(g, mesh(new THREE.ConeGeometry(HW + .7, 3.4, 14), '#EDEFF7', false), X1 + 2.4, -HW - .95, FZ).rotation.z = -Math.PI / 2;
  put(g, mesh(new THREE.ConeGeometry(1.3, 1.6, 10), mat('#9FD8F5', { transparent: true, opacity: .7 }), false), X1 + 1.1, .3, FZ).rotation.z = -Math.PI / 2;   // скло кабіни
  // кабіна: крісло пілота, штурвал, приладова панель
  put(g, mesh(new THREE.BoxGeometry(.9, 1, HW * 2 - .4), '#2E2346', false), X1 + .2, .5, FZ);
  put(g, mesh(new THREE.BoxGeometry(.05, .5, HW * 2 - .8), bulb('#6BE7FF'), false), X1 - .27, .8, FZ);
  put(g, mesh(new THREE.BoxGeometry(.6, .1, .6), '#4E4A6E'), COCKPIT.x - .2, .55, COCKPIT.z);
  put(g, mesh(new THREE.BoxGeometry(.6, .8, .12), '#4E4A6E'), COCKPIT.x - .5, .85, COCKPIT.z);
  put(g, mesh(new THREE.TorusGeometry(.22, .04, 6, 16), '#FFD27A', false), COCKPIT.x + .45, .95, COCKPIT.z).rotation.y = Math.PI / 2;
  // камбуз: кавомашина, чайник, кошик круасанів
  put(g, mesh(new THREE.BoxGeometry(1, 1, HW * 2 - .3), '#B07A5A', false, true), X0 + .2, .5, FZ);
  put(g, mesh(new THREE.BoxGeometry(.6, .6, .55), '#D9DCE8'), ST_COFFEE.x - .5, 1.3, ST_COFFEE.z);
  put(g, mesh(new THREE.BoxGeometry(.2, .1, .04), bulb('#FF6B6B'), false), ST_COFFEE.x - .19, 1.4, ST_COFFEE.z);
  put(g, mesh(flat(new THREE.CylinderGeometry(.2, .26, .4, 10)), '#7FE08A'), ST_TEA.x - .5, 1.2, ST_TEA.z);
  put(g, mesh(flat(new THREE.CylinderGeometry(.32, .22, .22, 10)), '#C4956A'), ST_FOOD.x - .5, 1.11, ST_FOOD.z);
  for (let k = 0; k < 4; k++) put(g, mesh(new THREE.TorusGeometry(.08, .04, 5, 8, Math.PI), '#F2A65A', false), ST_FOOD.x - .55 + k * .05, 1.27, ST_FOOD.z - .1 + k * .07);
  // крісла з пасажирами
  for (const [i, s] of SEATS.entries()) {
    put(g, mesh(new THREE.BoxGeometry(.7, .4, .8), '#6E7FC9'), s.x, .2, s.z);
    put(g, mesh(new THREE.BoxGeometry(.18, .9, .8), '#5A6BB5'), s.x - .3, .55, s.z);
    const h = buildOffice(pick(['#AFC4B6', '#C9D6CF', '#D9C7A9', '#B9C6C9']), pick(['#8291B8', '#E0607E', '#7FB8A0', '#C08BFF', '#FFE08A']));
    h.root.position.set(s.x - .05, .05, s.z); h.root.rotation.y = Math.PI / 2; h.root.scale.setScalar(.85);
    h.l1.rotation.x = h.l2.rotation.x = -1.4; h.body.position.y = -.25;
    scene.add(A.dynamic(h.root));
    const icon = new THREE.Sprite(new THREE.SpriteMaterial({ map: iconTex(''), transparent: true, depthWrite: false })); icon.scale.set(.8, .8, 1); icon.position.set(s.x, 2.2, s.z); icon.renderOrder = 4; scene.add(A.dynamic(icon));
    const bar = new THREE.Mesh(new THREE.PlaneGeometry(.8, .1), new THREE.MeshBasicMaterial({ color: '#7FE08A', depthWrite: false })); bar.position.set(s.x, 1.7, s.z); bar.renderOrder = 4; scene.add(A.dynamic(bar));
    V.seats[i] = { h, icon, bar, want: null, ang: 0, ent: { x: s.x, z: s.z, y: 0, bh: 2 } };
  }
  // хмари, що пролітають повз
  for (let i = 0; i < 14; i++) {
    const c = new THREE.Group();
    for (let k = 0; k < 3; k++) put(c, mesh(new THREE.IcosahedronGeometry(rand(1.2, 2.4), 0), mat('#FFFFFF', { transparent: true, opacity: .85 }), false), rand(-1.5, 1.5), rand(-.5, .5), rand(-1.5, 1.5));
    c.position.set(FX + rand(-30, 30), rand(-9, -3), FZ + pick([-1, 1]) * rand(7, 22)); scene.add(A.dynamic(c)); V.clouds.push(c);
  }
  return g;
}
const ICONS = {};
function iconTex(want, angry) {
  const k = want + (angry ? '!' : ''); if (ICONS[k]) return ICONS[k];
  const c = document.createElement('canvas'); c.width = c.height = 96;
  const x = c.getContext && c.getContext('2d');
  if (x && x.fillText && want) {
    x.fillStyle = angry ? '#FF5C7A' : '#FFFFFF'; x.beginPath(); x.arc(48, 44, 38, 0, 7); x.fill();
    x.beginPath(); x.moveTo(36, 76); x.lineTo(48, 94); x.lineTo(58, 76); x.fill();
    x.font = '44px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(ITEM[want].ic, 48, 46);
  }
  return ICONS[k] = new THREE.CanvasTexture(c);
}

/* ---------- Події ---------- */
function onEvent(e) {
  if (SIMSIDE || !e) return;
  const here = running && inPlane(pl.x, pl.z);
  if (e.k === 'msg') { if (here) { if (e.big) banner(e.txt); else toast(e.txt); } }
  else if (e.k === 'served') {
    const s = SEATS[e.seat]; if (!s) return;
    if (e.ok) { burst(s.x, 1.8, s.z, '#7FE08A', 10, 3, .6, 3); ftext(s.x, 2.4, s.z, pick(['Дякую! ☺', 'О, це те, що треба!', 'Ви найкращі!', 'Ммм…']), 'calm'); sfx('coin', s.x, s.z); if (e.to === myKey()) { P.coins += 3; refreshHUD(); } }
    else { ftext(s.x, 2.4, s.z, 'Я ж не це просив!', 'bad'); sfx('hurt', s.x, s.z); }
  }
  else if (e.k === 'storm') { if (here) { banner('⚡ Влетіли в грозу! Тримайтесь!'); shake = Math.max(shake, 1); sfx('boom'); spill(true); if (!amPilot() && !pl.dead) knockMe(Math.random() * 6.28, 12, 'Трясе!'); } }
  else if (e.k === 'dodge') { if (here) ftext(pl.x, 2.8, pl.z, 'Грозу обійшли! 🌩️', 'gold'); }
  else if (e.k === 'end') finish(e);
}
function finish(e) {
  const was = V.joined || inPlane(pl.x, pl.z); V.joined = false;
  if (amPilot()) leavePilot();
  if (!was || !running) return;
  const sv = Math.max(0, e.sv | 0), m = clamp(+e.m || 0, 0, 1), win = !!e.win;
  const stars = win ? (m > .75 ? 3 : m > .5 ? 2 : 1) : 0;
  const coins = win ? 40 + sv * 4 + stars * 25 : 10 + sv * 2, xp = win ? 100 + sv * 5 : 30;
  P.coins += coins; addXP(xp);
  const d = A.data(); d.flights = (d.flights || 0) + 1; if (win) d.landed = (d.landed || 0) + 1; d.best = Math.max(d.best || 0, sv); d.stars = Math.max(d.stars || 0, stars);
  banner(win ? `🛬 Посадка в «Гущі»! ${'⭐'.repeat(stars)} Обслужено: ${sv}` : `💥 ${e.why || 'Рейс зірвано.'} Обслужено: ${sv}`);
  toast(`Нагорода: <b>+${coins} 🪙</b> · +${xp} досвіду. Ще рейс — табличка «Посадка» біля дверей (F).`);
  setHeld(''); sfx(win ? 'level' : 'hurt'); refreshHUD(); save();
}

/* ---------- Що в руках ---------- */
function setHeld(item) {
  V.held = item;
  if (V.heldMesh) { V.heldMesh.parent && V.heldMesh.parent.remove(V.heldMesh); V.heldMesh = null; }
  if (!item || !hero) return;
  const g = new THREE.Group();
  put(g, mesh(new THREE.BoxGeometry(.55, .04, .4), '#C9CDD9'), 0, 0, 0);   // тацю тримаєш перед собою
  if (item === 'food') put(g, mesh(new THREE.TorusGeometry(.12, .06, 6, 10, Math.PI), '#F2A65A'), 0, .08, 0);
  else { put(g, mesh(flat(new THREE.CylinderGeometry(.09, .07, .2, 10)), '#FFFFFF'), 0, .12, 0); put(g, mesh(flat(new THREE.CylinderGeometry(.08, .08, .02, 10)), ITEM[item].c, false), 0, .22, 0); }
  g.position.set(0, 1.18, .5); hero.root.add(g); V.heldMesh = g;
}
function spill(force) {
  if (!V.held || V.held === 'food' && !force) return;
  burst(pl.x, 1.2, pl.z, ITEM[V.held].c, 12, 3, .6, 2); ftext(pl.x, 2.6, pl.z, V.held === 'food' ? 'Круасан полетів!' : 'Розлилось! 💦', 'bad'); sfx('splash', pl.x, pl.z); setHeld('');
}

/* ---------- Кожен кадр ---------- */
function clientTick(dt) {
  const t = gameTime;
  for (const c of V.clouds) { c.position.x -= (ST.on ? 26 : 6) * dt; if (c.position.x < FX - 34) { c.position.x = FX + 34; c.position.z = FZ + pick([-1, 1]) * rand(7, 22); } }
  // пасажири: що хочуть, терпіння, злість
  for (const [i, v] of V.seats.entries()) {
    const p = ST.pass[i]; if (!v) continue;
    const want = ST.on ? p.want : '', ang = p.angry ? 1 : 0;
    if (want !== v.want || ang !== v.ang) { v.want = want; v.ang = ang; v.icon.material.map = iconTex(want, ang); v.icon.material.needsUpdate = true; }
    v.icon.visible = !!want; v.bar.visible = !!want;
    if (want) { v.icon.position.y = 2.2 + Math.sin(t * 3 + i) * .08; v.bar.scale.x = Math.max(.02, p.pat); v.bar.material.color.set(p.pat > .5 ? '#7FE08A' : p.pat > .2 ? '#FFD27A' : '#FF5C7A'); v.bar.lookAt(camera.position); }
    const hh = v.h;
    if (p.angry && ST.on) { hh.aR.rotation.x = -2.6 + Math.sin(t * 12 + i) * .4; hh.body.position.y = -.25 + Math.abs(Math.sin(t * 9 + i)) * .12; if (Math.random() < dt * .25) bubble(v.ent, pick(['Де моя кава?!', 'Я буду скаржитись!', 'Це найгірший рейс!', 'Стюардесо!!!']), true, 2); }
    else { hh.aR.rotation.x = -.3; hh.body.position.y = -.25; }
    hh.root.rotation.z = ST.roll * .12;
  }
  updBrew(dt);
  hud();
  if (!running || pl.dead) return;
  const here = inPlane(pl.x, pl.z);
  if (!here) { if (V.held) setHeld(''); return; }
  if (ST.on) V.joined = true;
  // не випасти з літака: стіни салону
  pl.x = clamp(pl.x, X0 + .8, X1 - .5); pl.z = clamp(pl.z, FZ - HW + .45, FZ + HW - .45); if (pl.y < 0) pl.y = 0;
  pl.safe = { x: FX, z: FZ };
  if (amPilot()) {
    pl.x = COCKPIT.x; pl.z = COCKPIT.z; pl.face = Math.PI / 2; pl.emote = 'sit'; pl.emoteT = 1; pl.atkCd = Math.max(pl.atkCd, .3);
    const a = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
    if (AUTH()) { AU.inA = a; AU.inT = .6; } else if ((V.sendT -= dt) <= 0) { V.sendT = .1; A.send('rq', { k: 'in', a }); }
  } else if (ST.on) {
    // крен хитає салон: ковзаєш, кава розливається
    const r = ST.roll;
    if (Math.abs(r) > .25) { pl.z += r * 3.2 * dt; pl.x += Math.sin(t * 1.3) * Math.abs(r) * .6 * dt; }
    if (V.held && Math.abs(r) > .55 && Math.random() < dt * (Math.abs(r) - .4) * 1.2) spill();
  }
  if (V.held && hero) { hero.aR.rotation.x = hero.aL.rotation.x = -1.3; }
}

/* ---------- Камбуз: варити й брати ---------- */
function startBrew(st) {
  if (V.brew) return;
  if (V.held) { toast(`Руки зайняті: ${ITEM[V.held].ic}. Віднеси пасажиру або викинь (F біля смітника в хвості).`); return; }
  V.brew = { st, t: 0 }; sfx('brew');
}
function updBrew(dt) {
  if (!V.brew) return;
  const b = V.brew; b.t += dt;
  if (dist2(pl.x, pl.z, b.st.x, b.st.z) > 1.8) { V.brew = null; toast('Відійшов — не доварилось.'); return; }
  if (b.t >= b.st.t) { V.brew = null; setHeld(b.st.item); ftext(pl.x, 2.5, pl.z, `${ITEM[b.st.item].ic} Готово — неси!`, 'gold'); sfx('ding'); }
  else if (Math.random() < dt * 6) burst(b.st.x - .4, 1.5, b.st.z, '#FFFFFF', 1, .5, .6, .6);
}
function nearSeat() {
  let best = -1, bd = 1.7;
  SEATS.forEach((s, i) => { const d = dist2(pl.x, pl.z, s.x + .2, s.z - s.side * .6); if (d < bd) { bd = d; best = i; } });
  return best;
}

/* ---------- F ---------- */
const _getInteract = getInteract;
getInteract = function () {
  if (!SIMSIDE && running && !pl.dead && inPlane(pl.x, pl.z) && !pl.carry) {
    if (amPilot()) return { l: '🧑‍✈️ Встати з-за штурвала', fn: () => leavePilot() };
    if (dist2(pl.x, pl.z, COCKPIT.x, COCKPIT.z) < 1.5) return ST.pilot && ST.pilot !== myKey() ? { l: '🧑‍✈️ Штурвал зайнятий', fn: () => { } } : { l: '🧑‍✈️ Сісти за штурвал (A/D — крен)', fn: () => { if (V.held) setHeld(''); req('pilot'); V.pilot = true; } };
    if (!ST.on && dist2(pl.x, pl.z, DOOR.x, DOOR.z) < 2) return { l: '✈️ Оголосити посадку — вилітаємо!', fn: () => { req('start'); sfx('ding'); } };
    for (const st of STATIONS) if (dist2(pl.x, pl.z, st.x, st.z) < 1.3) return { l: V.brew ? '… готую' : `${ITEM[st.item].ic} ${st.item === 'food' ? 'Взяти круасан' : st.item === 'coffee' ? 'Зварити каву (2 с)' : 'Заварити чай (1,5 с)'}`, fn: () => startBrew(st) };
    if (V.held && dist2(pl.x, pl.z, X0 + 1, FZ - HW + .6) < 1.2) return { l: '🗑️ Викинути', fn: () => setHeld('') };
    const i = nearSeat();
    if (i >= 0 && ST.on) {
      const p = ST.pass[i];
      if (V.held) return { l: p.want ? `Подати ${ITEM[V.held].ic} (просить ${ITEM[p.want].ic})` : `Подати ${ITEM[V.held].ic} (нічого не просить)`, fn: () => { req('serve', { seat: i, item: V.held, to: myKey() }); setHeld(''); } };
      if (p.want) return { l: `Пасажир хоче ${ITEM[p.want].ic} ${ITEM[p.want].n}`, fn: () => toast(`Неси ${ITEM[p.want].ic} ${ITEM[p.want].n} з камбуза (хвіст літака).`) };
    }
  }
  return _getInteract.apply(this, arguments);
};
function leavePilot() { req('pilot', { off: 1 }); V.pilot = false; pl.emoteT = 0; }

/* ---------- Камера: крен видно по всьому екрану ---------- */
if (!SIMSIDE && typeof updCamera === 'function') {
  const _updCamera = updCamera;
  updCamera = function (dt) { _updCamera.apply(this, arguments); if (running && inPlane(pl.x, pl.z) && ST.on) camera.rotateZ(-ST.roll * .2); };
}
/* пілот не ходить */
const _updInput = updInput;
updInput = function () { _updInput.apply(this, arguments); if (amPilot()) { input.mx = 0; input.mz = 0; } };

/* ---------- HUD: рейс, настрій, а пілоту — авіагоризонт і радар ---------- */
function hud() {
  if (!V.hud) {
    V.hud = document.createElement('div'); V.hud.id = 'flight-hud';
    V.hud.style.cssText = 'position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 64px);transform:translateX(-50%);z-index:2;pointer-events:none;background:rgba(46,35,70,.85);color:#fff;border-radius:14px;padding:7px 14px;font:700 13px/1.4 system-ui,sans-serif;text-align:center;box-shadow:0 6px 18px rgba(0,0,0,.25);white-space:nowrap';
    document.body.appendChild(V.hud);
    V.radar = document.createElement('canvas'); V.radar.width = 240; V.radar.height = 150;
    V.radar.style.cssText = 'position:fixed;right:16px;bottom:calc(env(safe-area-inset-bottom,0px) + 100px);z-index:2;pointer-events:none;border-radius:14px;background:rgba(46,35,70,.85);box-shadow:0 6px 18px rgba(0,0,0,.25)';
    document.body.appendChild(V.radar);
  }
  const show = running && !pl.dead && !panel && inPlane(pl.x, pl.z);
  V.hud.style.display = show ? '' : 'none'; V.radar.style.display = show && (amPilot() || ST.on) ? '' : 'none';
  if (!show) return;
  let h;
  if (ST.on) {
    const left = Math.max(0, ST.dur - ST.t), mood = Math.round(ST.mood * 100), want = ST.pass.filter(p => p.want).length, angry = ST.pass.filter(p => p.angry).length;
    const bar = n => `<span style="color:${mood > 50 ? '#7FE08A' : mood > 25 ? '#FFD27A' : '#FF5C7A'}">${'■'.repeat(Math.round(n / 10))}</span><span style="opacity:.3">${'■'.repeat(10 - Math.round(n / 10))}</span>`;
    h = `✈️ КАВОВИЙ РЕЙС · до «Гущі» ${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')} · обслужено ${ST.served}<br><span style="font-weight:600;font-size:12px">Настрій салону ${bar(mood)} · чекають ${want}${angry ? ` · <span style="color:#FF5C7A">злі ${angry}</span>` : ''} · ${ST.pilot ? `🧑‍✈️ ${escapeHTML(ST.pilot === 'me' ? 'ти' : ST.pilot)}` : '<span style="color:#FFD27A">автопілот!</span>'}${V.held ? ` · у руках ${ITEM[V.held].ic}` : ''}${V.brew ? ` · готую ${Math.round(V.brew.t / V.brew.st.t * 100)}%` : ''}</span>`;
  } else h = '✈️ Кавовий рейс (бета) · <span style="font-weight:600">табличка «Посадка» біля дверей (F) — вилітаємо. Кабіна — попереду, камбуз — у хвості.</span>';
  if (V.hud.innerHTML !== h) V.hud.innerHTML = h;
  // авіагоризонт + радар гроз
  const c = V.radar, x = c.getContext && c.getContext('2d'); if (!x || !x.fillRect) return;
  x.clearRect(0, 0, 240, 150);
  x.save(); x.beginPath(); x.arc(62, 75, 52, 0, 7); x.clip(); x.translate(62, 75); x.rotate(-ST.roll * .9);
  x.fillStyle = '#6BB8FF'; x.fillRect(-80, -80, 160, 80); x.fillStyle = '#C4956A'; x.fillRect(-80, 0, 160, 80); x.strokeStyle = '#fff'; x.lineWidth = 2; x.beginPath(); x.moveTo(-60, 0); x.lineTo(60, 0); x.stroke();
  x.restore(); x.strokeStyle = '#FFE066'; x.lineWidth = 4; x.beginPath(); x.moveTo(32, 75); x.lineTo(52, 75); x.moveTo(72, 75); x.lineTo(92, 75); x.stroke();
  x.fillStyle = Math.abs(ST.roll) > .5 ? '#FF5C7A' : '#FFFFFF'; x.font = 'bold 11px sans-serif'; x.textAlign = 'center'; x.fillText('КРЕН', 62, 142);
  // радар: літак унизу, грози зверху наближаються
  x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(128, 12, 100, 122);
  for (const s of ST.storms) { const sx = 178 + s.y * 46, sy = 18 + (1 - Math.max(0, s.d)) * 104; x.fillStyle = '#4E4A6E'; x.beginPath(); x.arc(sx, sy, 13, 0, 7); x.fill(); x.fillStyle = '#FFE066'; x.fillText('⚡', sx, sy + 4); }
  const px = 178 + ST.py * 46; x.fillStyle = '#7FE08A'; x.beginPath(); x.moveTo(px, 116); x.lineTo(px - 8, 132); x.lineTo(px + 8, 132); x.fill();
  x.fillStyle = '#fff'; x.fillText('РАДАР', 178, 146);
}

/* ---------- Режим у паузі, вкладка, картка в меню ---------- */
function goFlight() { const f = $('#fade'); closePanel(); if (f) f.style.opacity = 1; sfx('travel'); setTimeout(() => { pl.x = DOOR.x + 1; pl.z = FZ; pl.y = 0; pl.falling = false; pl.jump = null; pl.safe = { x: FX, z: FZ }; camPos.set(pl.x, 20, pl.z + 15); camLook.set(pl.x, .5, pl.z); if (f) f.style.opacity = 0; toast('✈️ Кавовий рейс (бета)! Хтось — за штурвал (кабіна попереду), решта — на камбуз (хвіст). Посадка — табличка біля дверей (F).'); }, 260); return true; }
function leaveFlight() { if (amPilot()) leavePilot(); setHeld(''); return true; }
if (A.mode) A.mode({ id: 'flight', ic: '✈️', n: 'Кавовий рейс (бета)', sub: 'кооп на 1–4: пілот і бортпровідники', go: goFlight, here: () => running && inPlane(pl.x, pl.z), leave: leaveFlight });
A.tab('flight', '✈️ Рейс', () => {
  const d = A.data(), here = inPlane(pl.x, pl.z);
  return `<h3>✈️ Кавовий рейс <span class="chip">бета</span></h3>
    <p style="font-size:13px;line-height:1.5;margin:4px 0 10px">Кооператив на 1–4 гравці. Літак летить 4 хвилини до «Гущі», салон повний пасажирів — усі чогось хочуть.</p>
    <div class="btns">${here ? (ST.on ? '' : '<button class="btn" data-fl="start">✈️ Вилітаємо!</button>') : '<button class="btn" data-fl="go">✈️ На борт</button>'}</div>
    <div class="list" style="margin-top:10px;font-size:13px;line-height:1.55">
      <div>🧑‍✈️ <b>Пілот</b> — F у кабіні. <b>A/D</b> — крен. Грози на радарі (праворуч унизу) обходиш креном, але крен хитає салон. Без пілота — слабкий автопілот.</div>
      <div>☕ <b>Бортпровідники</b> — на камбузі в хвості F: кава (2 с), чай (1,5 с), круасан. Неси пасажиру з такою ж іконкою й тисни F.</div>
      <div>😡 Терпіння закінчилось — пасажир злиться й псує настрій усім. Настрій салону на нулі — рейс зірвано.</div>
      <div>🌀 Сильний крен — усі ковзають, кава розливається. Гроза — трясе всіх.</div>
    </div>
    <p class="muted" style="font-size:12px;margin-top:10px">Рейсів: ${d.flights || 0} · успішних посадок: ${d.landed || 0} · рекорд обслуговування: ${d.best || 0} · найкраща оцінка: ${'⭐'.repeat(d.stars || 0) || '—'}</p>`;
}, e => {
  const b = e.target.closest('[data-fl]'); if (!b) return;
  if (b.dataset.fl === 'go') goFlight(); else { req('start'); closePanel(); }
});
if (!SIMSIDE && typeof document !== 'undefined') {
  const box = document.querySelector('#main-menu .mm-container');
  if (box && !document.getElementById('mm-flight')) {
    const card = document.createElement('div'); card.className = 'mm-card'; card.id = 'mm-flight';
    card.innerHTML = `<div class="mm-locked-badge" style="background:rgba(162,89,255,.9)">🧪 БЕТА</div><div class="mm-img-wrap"><div class="mm-card-img" style="background-image:url('menu/flight-bg.jpg'),url('addons/flight/flight-bg.jpg'),linear-gradient(160deg,#6BB8FF,#B07CF0 60%,#FFB3E6)"></div></div>
      <div class="mm-card-body"><h2>РЕЙС</h2><div class="mm-subtitle">Кавовий рейс</div>
      <div class="mm-desc">Один пілотує, інші розносять каву. Кооп на 4 гравці в літаку, що трясеться.</div></div>`;
    const locked = [...box.children].filter(c => c.classList.contains('mm-locked')).pop();
    box.insertBefore(card, locked || null);
    const css = document.createElement('style');
    css.textContent = '#main-menu .mm-container.mm-6.mm-6.mm-6{flex-wrap:nowrap;gap:clamp(6px,1vw,16px)}#main-menu .mm-container.mm-6.mm-6.mm-6 .mm-card{width:clamp(120px,14.5vw,220px);height:clamp(260px,30vw,400px)}#main-menu .mm-container.mm-6.mm-6.mm-6 .mm-card-body h2{font-size:clamp(1.1rem,1.9vw,1.9rem)}#main-menu .mm-container.mm-6.mm-6.mm-6 .mm-subtitle{font-size:clamp(.75rem,1vw,1rem)}@media (max-width:760px){#main-menu .mm-container.mm-6.mm-6.mm-6{flex-wrap:wrap;overflow:auto;max-height:100%}#main-menu .mm-container.mm-6.mm-6.mm-6 .mm-card{width:42vw;height:56vw}}';
    document.head.appendChild(css);
    const fit = () => box.classList.toggle('mm-6', box.querySelectorAll('.mm-card').length >= 6);
    fit(); A.on('world', fit);
    card.addEventListener('click', () => {
      V.auto = true; if (running) goFlight();
      const mm = document.getElementById('main-menu'); if (mm) { mm.classList.add('mm-hide'); mm.addEventListener('transitionend', () => mm.remove(), { once: true }); }
    });
  }
}
A.on('start', () => { if (V.auto && !SIMSIDE) setTimeout(goFlight, 700); });
if (window.__ADDON_TEST) window.__flight = { ST, AU, V, SEATS, STATIONS, COCKPIT, DOOR, setHeld, nearSeat };
