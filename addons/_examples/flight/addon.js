/* Аддон «Кавовий рейс» (Espresso Flight): кооператив на 1–4 гравці в дусі Dear Passengers.
   Літак летить 4 хвилини до «Гущі». Салон повний пасажирів-офісників, і всі чогось хочуть.
   - Пілот (F у кабіні): A/D — крен. Грози обходиш креном, але крен хитає весь салон.
     Встав із-за штурвала — 25 с тримає сильний автопілот, далі — слабкий. Пілот теж може бігати по салону.
   - Бортпровідники: камбуз (☕ кава, 🍵 чай, 🥐 круасан) → пасажиру з такою ж іконкою.
   - Поломки: блискавка пробиває фюзеляж (пробоїна всмоктує людей і каву), ламає двигуни (літак
     тягне вбік, двигун горить), вимикає світло (темрява). Ремонт — F і тримай поруч:
     пробоїна — на місці, двигун — на крилі (через двері!), світло — щиток у вантажному відсіку.
   - Двері (F) відчиняються — можна вийти на крило. На крилі вітер: не встоїш — здує!
   - Двері COCKPIT у перегородці кабіни пілота; двері EXIT біля кабіни: на землі — трап на двір, у польоті — парашут.
   - Вантажний відсік у хвості: коробки й офісні крісла (F підняти / сісти), ящик з бомбами (💣, G — кинути
     з аддоном «Еспресо-Сплав»), щиток.
   - Друзі бачать, що в тебе на таці. Своя музика рейсу.
   У спільному світі рейс один на всіх: пасажирів, погоду, поломки й двері рахує сервер.
   Картинку для картки в меню поклади поруч: addons/flight/flight-bg.jpg */
const A = Addon.info({ name: 'Кавовий рейс', version: '1.1', desc: 'Кооп на 1–4 у літаку: пілот, бортпровідники, поломки й ремонт, двері в кабіну, на крила й назовні, вантажний відсік, музика.' });

const SIMSIDE = !!window.__SIM;
const AUTH = () => SIMSIDE || !(typeof WORLD !== 'undefined' && WORLD.on);
const FX = -30, FZ = 118, ISL_R = 20, HW = 2.6;
const X0 = FX - 15, X1 = FX + 10.5, PART_X = FX - 11;            // хвіст … кабіна; перегородка вантажного відсіку
const COCKPIT = { x: X1 - 1.3, z: FZ };
const DOORS = [{ x: FX + .4, side: -1 }, { x: FX + .4, side: 1 }];
const CK_X = FX + 6.6, CK_W = .55;                                // перегородка кабіни пілота і двері в ній
const EXIT = { x: FX + 5.7, side: 1 };                             // вихідні двері з трапом (правий борт, біля кабіни)
const BOARD = { x: FX - 8.6, z: FZ - HW + .7 };                   // табличка «Посадка» біля камбуза
const ST_COFFEE = { x: FX - 10.2, z: FZ - 1.9, item: 'coffee', t: 2.2 }, ST_TEA = { x: FX - 10.2, z: FZ + 1.9, item: 'tea', t: 1.6 }, ST_FOOD = { x: FX - 8.6, z: FZ + 2.05, item: 'food', t: .3 };
const STATIONS = [ST_COFFEE, ST_TEA, ST_FOOD], TRASH = { x: FX - 9.4, z: FZ - 2.05 };
const FUSE = { x: X0 + .7, z: FZ - 1.9 }, BOMBS = { x: X0 + .7, z: FZ + 1.9 };
const ENGINES = [{ side: -1, x: FX + 1.8, z: FZ - (HW + 4.2) }, { side: 1, x: FX + 1.8, z: FZ + (HW + 4.2) }];   // перед крилом; ремонт — стоячи на крилі
const engFix = i => ({ x: FX - .3, z: ENGINES[i].z });
const ITEM = { coffee: { ic: '☕', n: 'кава', c: '#8C5A3C' }, tea: { ic: '🍵', n: 'чай', c: '#7FE08A' }, food: { ic: '🥐', n: 'круасан', c: '#F2A65A' } };
const SEATS = [];
for (let r = 0; r < 6; r++) for (const s of [-1, 1]) SEATS.push({ x: FX - 7 + r * 2.3, z: FZ + s * 1.75, side: s });
const SPAN = 9;
const wingX = s => [lerp(FX - 3.2, FX - 4.6, s / SPAN), lerp(FX + 2.6, FX - 2, s / SPAN)];   // крило стрілоподібне
const inPlane = (x, z) => dist2(x, z, FX, FZ) < ISL_R + 2;

A.island({ id: 'flight', n: 'Кавовий рейс', sub: 'один пілотує, інші розносять каву', x: FX, z: FZ, r: ISL_R, top: '#5B3E9A', rock: '#8C84C6', biome: 'plane', tier: 1, safe: true });
const _buildIsland = buildIsland;
buildIsland = function (s) { if (s.biome !== 'plane') return _buildIsland.apply(this, arguments); return SIMSIDE ? new THREE.Group() : buildPlane(); };

/* ---------- Стан рейсу ---------- */
const ST = { on: false, t: 0, dur: 240, roll: 0, rv: 0, py: 0, storms: [], pass: SEATS.map(() => ({ want: '', pat: 1, mood: .8, angry: 0 })), pilot: '', served: 0, mood: .8, turb: 0,
  holes: [], eng: [1, 1], lights: 1, doors: [0, 0], ap: 0, cdoor: 0, exit: 0 };
const AU = { reqT: 4, stormT: 10, inA: 0, inT: 0, stT: 0, sid: 0, hid: 0, failT: 50 };
const myKey = () => (NET.on && typeof WORLD !== 'undefined' && WORLD.on ? myName() : 'me');
const keyOf = from => SIMSIDE ? String(from && from.name || '') : 'me';
const r2 = v => Math.round(v * 100) / 100;
function snap() {
  return { on: ST.on ? 1 : 0, t: r2(ST.t), dur: ST.dur, r: r2(ST.roll), rv: r2(ST.rv), py: r2(ST.py), tb: r2(ST.turb), s: ST.storms.map(s => [s.id, r2(s.d), r2(s.y)]),
    p: ST.pass.map(p => [p.want, r2(p.pat), r2(p.mood), p.angry ? 1 : 0]), pi: ST.pilot, sv: ST.served, m: r2(ST.mood),
    h: ST.holes.map(h => [h.id, r2(h.x), h.side]), e: ST.eng, li: ST.lights, dr: ST.doors, ap: r2(ST.ap), cd: ST.cdoor, ex: ST.exit };
}
function applySnap(d) {
  Object.assign(ST, { on: !!d.on, t: +d.t || 0, dur: +d.dur || 240, py: +d.py || 0, turb: +d.tb || 0, pilot: String(d.pi || ''), served: d.sv | 0, mood: +d.m || 0, ap: +d.ap || 0 });
  ST.rollT = +d.r || 0; ST.rv = +d.rv || 0;
  if (Array.isArray(d.s)) ST.storms = d.s.slice(0, 8).map(a => ({ id: a[0], d: +a[1], y: +a[2] }));
  if (Array.isArray(d.p)) d.p.slice(0, SEATS.length).forEach((a, i) => Object.assign(ST.pass[i], { want: ITEM[a[0]] ? a[0] : '', pat: +a[1], mood: +a[2], angry: !!a[3] }));
  if (Array.isArray(d.h)) ST.holes = d.h.slice(0, 4).map(a => ({ id: a[0], x: +a[1], side: a[2] < 0 ? -1 : 1 }));
  if (Array.isArray(d.e)) ST.eng = [d.e[0] ? 1 : 0, d.e[1] ? 1 : 0];
  ST.lights = d.li ? 1 : 0;
  if (Array.isArray(d.dr)) ST.doors = [d.dr[0] ? 1 : 0, d.dr[1] ? 1 : 0];
  ST.cdoor = d.cd ? 1 : 0; ST.exit = d.ex ? 1 : 0;
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
  const k = keyOf(from), who = SIMSIDE ? escapeHTML(k) : 'Ти';
  if (d.k === 'start') { if (!ST.on) startFlight(from); }
  else if (d.k === 'pilot') {
    if (d.off) { if (ST.pilot === k) { ST.pilot = ''; ST.ap = 25; emit({ k: 'msg', txt: `🧑‍✈️ ${who} встав із-за штурвала — автопілот тримає 25 с.` }); pushState(); } }
    else if (!ST.pilot) { ST.pilot = k; ST.ap = 0; emit({ k: 'msg', txt: `🧑‍✈️ ${who} за штурвалом!` }); pushState(); }
  }
  else if (d.k === 'in') { if (ST.pilot === k) { AU.inA = clamp(+d.a || 0, -1, 1); AU.inT = .6; } }
  else if (d.k === 'cdoor') { ST.cdoor = ST.cdoor ? 0 : 1; emit({ k: 'door', cd: 1, open: ST.cdoor }); pushState(); }
  else if (d.k === 'exit') { ST.exit = ST.exit ? 0 : 1; emit({ k: 'door', ex: 1, open: ST.exit }); pushState(); }
  else if (d.k === 'door') { const i = d.i ? 1 : 0; ST.doors[i] = ST.doors[i] ? 0 : 1; emit({ k: 'door', i, open: ST.doors[i] }); pushState(); }
  else if (d.k === 'fix') {
    if (d.what === 'hole') { const i = ST.holes.findIndex(h => h.id === d.id); if (i >= 0) { ST.holes.splice(i, 1); emit({ k: 'fixed', what: 'hole', who: k }); } }
    else if (d.what === 'engine') { const i = d.i ? 1 : 0; if (!ST.eng[i]) { ST.eng[i] = 1; emit({ k: 'fixed', what: 'engine', i, who: k }); } }
    else if (d.what === 'power') { if (!ST.lights) { ST.lights = 1; emit({ k: 'fixed', what: 'power', who: k }); } }
    pushState();
  }
  else if (d.k === 'serve') {
    const i = d.seat | 0, p = ST.pass[i]; if (!p || !ST.on) return;
    if (p.want && p.want === d.item) {
      p.mood = Math.min(1, p.mood + (p.angry ? .3 : .22) + p.pat * .1); p.want = ''; p.angry = 0; p.pat = 1; ST.served++;
      emit({ k: 'served', seat: i, ok: 1, to: d.to }); pushState();
    } else { p.mood = Math.max(0, p.mood - .08); emit({ k: 'served', seat: i, ok: 0, to: d.to }); }
  }
}
function startFlight(from) {
  Object.assign(ST, { on: true, t: 0, roll: 0, rv: 0, py: 0, storms: [], served: 0, mood: .8, turb: 0, holes: [], eng: [1, 1], lights: 1, doors: [0, 0], ap: 0, exit: 0 });
  for (const p of ST.pass) Object.assign(p, { want: '', pat: 1, mood: .8, angry: 0 });
  Object.assign(AU, { reqT: 3, stormT: 12, inA: 0, inT: 0, stT: 0, failT: rand(40, 60) });
  emit({ k: 'msg', big: 1, txt: `✈️ Рейс «Еспресо» вилітає! ${from && from.name && SIMSIDE ? escapeHTML(from.name) + ' оголосив посадку. ' : ''}Хтось — за штурвал, решта — на камбуз!` });
  pushState();
}
function endFlight(win, why) {
  if (!ST.on) return;
  ST.on = false;
  const res = { k: 'end', win: win ? 1 : 0, sv: ST.served, m: r2(ST.mood), why: why || '' };
  for (const p of ST.pass) { p.want = ''; p.angry = 0; }
  Object.assign(ST, { pilot: '', holes: [], eng: [1, 1], lights: 1, doors: [0, 0], ap: 0 });
  emit(res); pushState();
}
function damage(kind) {
  if (kind === 'hole') { if (ST.holes.length >= 3) kind = 'power'; else { const h = { id: ++AU.hid, x: r2(rand(FX - 7, FX + 4.6)), side: pick([-1, 1]) }; ST.holes.push(h); emit({ k: 'dmg', what: 'hole', x: h.x, side: h.side }); return; } }
  if (kind === 'engine') { const ok = [0, 1].filter(i => ST.eng[i]); if (!ok.length) kind = 'power'; else { const i = pick(ok); ST.eng[i] = 0; emit({ k: 'dmg', what: 'engine', i }); return; } }
  if (kind === 'power' && ST.lights) { ST.lights = 0; emit({ k: 'dmg', what: 'power' }); }
}
function authTick(dt) {
  if (!ST.on) return;
  ST.t += dt;
  const c = crew();
  if (!c.length) { AU.idle = (AU.idle || 0) + dt; if (AU.idle > (SIMSIDE ? 10 : 3)) endFlight(false, 'У літаку нікого не лишилось.'); return; }
  AU.idle = 0;
  if (ST.pilot && SIMSIDE && !c.some(p => p.name === ST.pilot)) { ST.pilot = ''; ST.ap = 15; }
  // крен: турбулентність, пілот / автопілот, зламані двигуни тягнуть убік
  ST.turb = Math.sin(ST.t * .7) * .9 + Math.sin(ST.t * 2.3 + 1) * .6 + Math.sin(ST.t * 5.1) * .35;
  const gust = Math.sin(ST.t * .13) > .6 ? 1.8 : 1;
  AU.inT -= dt; if (ST.ap > 0) ST.ap = Math.max(0, ST.ap - dt);
  if (ST.ap > 0 && ST.ap - dt <= 0) emit({ k: 'msg', txt: '⚠️ Автопілот слабшає — пілоте, до штурвала!' });
  const input = ST.pilot ? (AU.inT > 0 ? AU.inA : 0) : ST.ap > 0 ? clamp(-ST.roll * 1.8 - ST.rv * .7, -1, 1) : clamp(-ST.roll * .55 - ST.rv * .25, -1, 1);
  const engPull = (ST.eng[0] ? 0 : -1) + (ST.eng[1] ? 0 : 1);   // зламаний двигун — тягне на свій бік
  ST.rv += (ST.turb * 1.6 * gust + input * 3.4 - ST.roll * 1.1 + engPull * 1.3) * dt; ST.rv *= Math.exp(-1.8 * dt);
  ST.roll = clamp(ST.roll + ST.rv * dt, -1, 1);
  ST.py = clamp(ST.py + ST.roll * .55 * dt, -1, 1);
  // грози
  AU.stormT -= dt;
  if (AU.stormT <= 0) { AU.stormT = rand(10, 16) * (1 - Math.min(.4, ST.t / 600)); ST.storms.push({ id: ++AU.sid, d: 1, y: r2(rand(-.9, .9)) }); emit({ k: 'msg', txt: '⛈️ Попереду гроза! Пілоте — обходь креном (A/D).' }); }
  for (let i = ST.storms.length - 1; i >= 0; i--) {
    const s = ST.storms[i]; s.d -= dt / 9;
    if (s.d <= 0) {
      ST.storms.splice(i, 1);
      if (Math.abs(s.y - ST.py) < .32) { emit({ k: 'storm' }); for (const p of ST.pass) p.mood = Math.max(0, p.mood - .1); ST.rv += rand(-2.5, 2.5); damage(pick(['hole', 'engine', 'power'])); if (Math.random() < .45) damage(pick(['hole', 'engine', 'power'])); }
      else emit({ k: 'dodge' });
    }
  }
  // поломки самі по собі
  AU.failT -= dt;
  if (AU.failT <= 0) { AU.failT = rand(45, 70); damage(pick(['engine', 'power'])); }
  // пасажири хочуть
  AU.reqT -= dt;
  if (AU.reqT <= 0) {
    AU.reqT = Math.max(2.4, 6.5 - ST.t / 45) / Math.sqrt(Math.max(1, c.length - (ST.pilot ? 1 : 0)));
    const free = ST.pass.map((p, i) => i).filter(i => !ST.pass[i].want);
    if (free.length) { const p = ST.pass[pick(free)]; p.want = pick(['coffee', 'coffee', 'tea', 'food']); p.pat = 1; }
  }
  const shaky = Math.abs(ST.roll) > .5 ? Math.abs(ST.roll) : 0;
  const trouble = ST.holes.length * .01 + (2 - ST.eng[0] - ST.eng[1]) * .006 + (ST.lights ? 0 : .008) + (ST.doors[0] + ST.doors[1] + ST.exit) * .005;
  for (const p of ST.pass) {
    if (p.want) { p.pat -= dt / (ST.lights ? 32 : 26); if (p.pat <= 0 && !p.angry) { p.angry = 1; p.pat = 0; p.mood = Math.max(0, p.mood - .25); } }
    if (p.angry) p.mood = Math.max(0, p.mood - .012 * dt);
    if (shaky) p.mood = Math.max(0, p.mood - .02 * shaky * dt);
    p.mood = Math.max(0, p.mood - trouble * dt);
  }
  ST.mood = ST.pass.reduce((a, p) => a + p.mood, 0) / ST.pass.length;
  if (ST.mood < .15) { endFlight(false, 'Пасажири влаштували бунт — рейс зірвано.'); return; }
  if (ST.t >= ST.dur) { endFlight(true); return; }
  AU.stT -= dt; if (AU.stT <= 0) { AU.stT = .2; pushState(); }
}
A.on('tick', dt => {
  if (AUTH()) authTick(dt);
  else if (ST.on) { ST.t += dt; ST.roll = lerp(ST.roll, ST.rollT || 0, Math.min(1, dt * 8)); for (const s of ST.storms) s.d -= dt / 9; if (ST.ap > 0) ST.ap = Math.max(0, ST.ap - dt); }
  if (!SIMSIDE) clientTick(dt);
});

/* ---------- Фізичний світ літака (і на сервері, і в гравців): стіни, крісла, вантаж ---------- */
A.on('world', () => {
  for (let x = X0 + .2; x < X1; x += .7) for (const s of [-1, 1]) if (!DOORS.some(d => d.side === s && Math.abs(x - d.x) < .9) && !(s === EXIT.side && Math.abs(x - EXIT.x) < .9)) addStatic(x, FZ + s * (HW + .2), .35, 1.2);
  for (let z = FZ - HW; z <= FZ + HW; z += .6) if (Math.abs(z - FZ) > CK_W + .35) addStatic(CK_X, z, .3, 1.2);
  for (let z = FZ - HW; z <= FZ + HW; z += .6) if (Math.abs(z - FZ) > .95) addStatic(PART_X, z, .3, 1.2);
  for (const s of SEATS) addStatic(s.x, s.z, .38, 1);
  addStatic(COCKPIT.x + .9, FZ, .5, 1);
  for (const [x, z] of [[X0 + 2.1, FZ - 1.1], [X0 + 2.8, FZ + .3], [X0 + 1.7, FZ + .9]]) addProp('crate', x, z);
  for (const z of [FZ - 1.9, FZ + 1.9]) addBody('chair', X0 + 3.2, z);
});

/* ======================= ДАЛІ — ЛИШЕ В ГРАВЦЯ ======================= */
const V = { cdoor: null, exitM: null, stair: null, out: false, clouds: [], seats: [], hud: null, radar: null, held: '', heldMesh: null, brew: null, fix: null, sendT: 0, auto: false, joined: false, last: null, lastW: '', holes: new Map(), doorM: [], engM: [], dark: null, bombs: 0, heldSendT: 0, remote: new Map(), wind: 0, music: -1 };
const amPilot = () => ST.pilot && ST.pilot === myKey();
const HULL = '#C9B8F0', HULL2 = '#9F8BE0', INNER = '#ECE6FB';

/* ---------- Модель літака ---------- */
function neonPlane(txt, col, w, h) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = Math.round(1024 * h / w);
  const x = c.getContext && c.getContext('2d');
  if (x && x.fillText) { x.strokeStyle = col; x.lineWidth = 12; x.shadowColor = col; x.shadowBlur = 30; x.strokeRect(14, 14, c.width - 28, c.height - 28); x.font = `bold ${Math.round(c.height * .55)}px sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#E8FFFF'; x.fillText(txt, c.width / 2, c.height / 2 + 6); }
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
}
function buildPlane() {
  const g = new THREE.Group(); scene.add(g);
  const L = X1 - X0, CX = (X0 + X1) / 2;
  // корпус: нижня половина під підлогою (зверху — розріз, видно салон)
  const hull = new THREE.CylinderGeometry(HW + .55, HW + .55, L, 20, 1, false, Math.PI / 2, Math.PI); hull.rotateZ(Math.PI / 2);
  put(g, mesh(flat(hull), HULL, false, true), CX, .1, FZ);
  put(g, mesh(new THREE.BoxGeometry(L, .16, HW * 2 + .2), '#5B3E9A', false, true), CX, -.08, FZ);                 // фіолетовий килим
  put(g, mesh(new THREE.BoxGeometry(L - 4, .01, .7), '#7A5BC9', false), CX + 1, .005, FZ);                         // прохід
  for (const s of [-1, 1]) {
    const gaps = [...DOORS.filter(d => d.side === s).map(d => d.x), ...(EXIT.side === s ? [EXIT.x] : [])].sort((p, q) => p - q);   // низькі борти з отворами під двері
    let x0 = X0; for (const gx of [...gaps, X1 + .65]) { const x1 = gx - .65; if (x1 > x0) put(g, mesh(new THREE.BoxGeometry(x1 - x0, 1.25, .22), INNER, false, true), (x0 + x1) / 2, .62, FZ + s * (HW + .2)); x0 = gx + .65; }
    for (const gx of gaps) put(g, mesh(new THREE.BoxGeometry(1.3, .14, .22), INNER, false, true), gx, 1.18, FZ + s * (HW + .2));
    put(g, mesh(new THREE.BoxGeometry(L, .14, .5), HULL2, false), CX, 1.28, FZ + s * (HW + .3));                // окантовка розрізу
    for (let k = 0; k < 10; k++) { const wx = X0 + 1.5 + k * 2.4; if (DOORS.some(d => Math.abs(wx - d.x) < 1.2) || s === EXIT.side && Math.abs(wx - EXIT.x) < 1.2 || Math.abs(wx - CK_X) < .5) continue; put(g, mesh(new THREE.BoxGeometry(.55, .4, .05), bulb('#FFB3E6'), false), wx, .8, FZ + s * (HW + .08)); }
  }
  // неон «ESPRESSO FLIGHT» на дальньому борті
  const sign = neonPlane('ESPRESSO FLIGHT', '#6BE7FF', 7, 1); sign.position.set(FX - 1.5, 1.95, FZ - HW - .05); g.add(sign);
  for (const sx of [-3.2, 3.2]) put(g, mesh(new THREE.BoxGeometry(.06, .7, .06), '#4E4A6E'), FX - 1.5 + sx, 1.45, FZ - HW - .1);
  // ніс із вікнами кабіни
  const nose = new THREE.SphereGeometry(HW + .55, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2); nose.rotateZ(-Math.PI / 2); nose.scale(1.7, 1, 1);
  put(g, mesh(flat(nose), HULL, false, true), X1, .1, FZ);
  for (const s of [-1, 0, 1]) { const w = put(g, mesh(new THREE.BoxGeometry(.7, .32, .62), '#3E3A7C', false), X1 + 2.3, 1.55 - Math.abs(s) * .12, FZ + s * .75); w.rotation.z = -.55; }
  put(g, mesh(new THREE.BoxGeometry(.3, 1.3, HW * 2 - .3), '#2E2346', false), X1 + .05, .65, FZ);                 // приладова панель
  put(g, mesh(new THREE.BoxGeometry(.05, .5, HW * 2 - .9), bulb('#6BE7FF'), false), X1 - .12, 1, FZ);
  put(g, mesh(new THREE.BoxGeometry(.7, .12, .7), '#4E4A6E'), COCKPIT.x - .1, .55, COCKPIT.z);
  put(g, mesh(new THREE.BoxGeometry(.12, .9, .7), '#4E4A6E'), COCKPIT.x - .45, .95, COCKPIT.z);
  put(g, mesh(new THREE.TorusGeometry(.24, .05, 6, 16), '#FFD27A', false), COCKPIT.x + .55, .95, COCKPIT.z).rotation.y = Math.PI / 2;
  // хвіст: звуження, кіль і стабілізатори
  const tail = new THREE.CylinderGeometry(HW + .55, .5, 5, 16, 1, false, Math.PI / 2, Math.PI); tail.rotateZ(Math.PI / 2);
  put(g, mesh(flat(tail), HULL, false, true), X0 - 2.5, .1, FZ);
  const fin = put(g, mesh(new THREE.BoxGeometry(3.4, 4, .3), HULL2, false), X0 - 2.6, 2.6, FZ); fin.rotation.z = .35;
  put(g, mesh(new THREE.BoxGeometry(1.4, .9, .32), bulb('#6BE7FF'), false), X0 - 2.3, 3.2, FZ);
  for (const s of [-1, 1]) { const st = put(g, mesh(new THREE.BoxGeometry(2.2, .18, 3.6), HULL2, false), X0 - 3.2, .4, FZ + s * 3); st.rotation.y = s * -.4; }
  // крила (по них можна ходити) і двигуни
  for (const s of [-1, 1]) {
    const sh = new THREE.Shape(); const [a0, b0] = wingX(0), [a1, b1] = wingX(SPAN);
    sh.moveTo(a0 - FX, 0); sh.lineTo(b0 - FX, 0); sh.lineTo(b1 - FX, SPAN); sh.lineTo(a1 - FX, SPAN); sh.closePath();
    const wg = new THREE.ExtrudeGeometry(sh, { depth: .22, bevelEnabled: false }); wg.rotateX(Math.PI / 2); if (s < 0) wg.scale(1, 1, -1);
    put(g, mesh(wg, HULL, false, true), FX, 0, FZ + s * HW);
    put(g, mesh(new THREE.BoxGeometry(.6, .06, .25), bulb(s < 0 ? '#FF5C7A' : '#7FE08A'), false), (a1 + b1) / 2, .04, FZ + s * (HW + SPAN - .1));
    for (let k = 1; k < 8; k++) put(g, mesh(new THREE.BoxGeometry(.5, .01, .06), '#E9E2FA', false), lerp(a0, a1, k / SPAN) + .4, .005, FZ + s * (HW + k));   // доріжка на крилі
  }
  for (const e of ENGINES) {
    const eg = new THREE.Group(); eg.position.set(e.x, -.1, e.z); scene.add(A.dynamic(eg));
    put(eg, mesh(flat(new THREE.CylinderGeometry(.8, .7, 2.6, 16)), HULL2, false), 0, 0, 0).rotation.z = Math.PI / 2;
    put(eg, mesh(new THREE.TorusGeometry(.78, .08, 6, 18), bulb('#6BE7FF'), false), 1.3, 0, 0).rotation.y = Math.PI / 2;
    put(eg, mesh(flat(new THREE.CylinderGeometry(.62, .62, .1, 14)), '#2E2346', false), 1.32, 0, 0).rotation.z = Math.PI / 2;
    const fan = put(eg, mesh(new THREE.BoxGeometry(.06, 1.1, .16), '#8E86B0', false), 1.25, 0, 0);
    const fire = put(eg, mesh(new THREE.ConeGeometry(.5, 1.6, 8), mat('#FF8A3C', { emissive: '#FF6B2C', emissiveIntensity: 1.2, transparent: true, opacity: .9 }), false), -1.8, .1, 0); fire.rotation.z = Math.PI / 2; fire.visible = false;
    V.engM.push({ g: eg, fan, fire });
  }
  // двері (зсуваються вбік)
  for (const d of DOORS) { const m = put(g, mesh(new THREE.BoxGeometry(1.3, 1.2, .16), '#B7A6EA', false), d.x, .62, FZ + d.side * (HW + .22)); scene.remove(m); scene.add(A.dynamic(m)); V.doorM.push({ m, x: d.x }); put(g, mesh(new THREE.BoxGeometry(.12, .12, .05), bulb('#FFD27A'), false), d.x + .55, 1, FZ + d.side * (HW + .05)); }
  // перегородка кабіни пілота з дверима (зсуваються вбік) і табличкою
  for (const s of [-1, 1]) put(g, mesh(new THREE.BoxGeometry(.18, 1.25, HW - CK_W), INNER, false, true), CK_X, .62, FZ + s * (HW + CK_W) / 2);
  put(g, mesh(new THREE.BoxGeometry(.2, .14, CK_W * 2 + .1), HULL2, false), CK_X, 1.3, FZ);
  V.cdoor = put(g, mesh(new THREE.BoxGeometry(.1, 1.18, CK_W * 2), '#8F7BD6', false), CK_X, .6, FZ); scene.remove(V.cdoor); scene.add(A.dynamic(V.cdoor));
  put(V.cdoor, mesh(new THREE.BoxGeometry(.04, .2, .5), bulb('#6BE7FF'), false), -.06, .3, 0);
  const ck = neonPlane('COCKPIT', '#6BE7FF', 1.8, .5); ck.position.set(CK_X, 1.62, FZ + .1); g.add(ck);
  // вихідні двері з трапом
  V.exitM = put(g, mesh(new THREE.BoxGeometry(1.3, 1.2, .16), '#B7A6EA', false), EXIT.x, .62, FZ + EXIT.side * (HW + .22)); scene.remove(V.exitM); scene.add(A.dynamic(V.exitM));
  put(V.exitM, mesh(new THREE.BoxGeometry(.5, .16, .04), bulb('#7FE08A'), false), 0, .38, EXIT.side * .1);
  const ex = neonPlane('EXIT', '#7FE08A', .9, .32); ex.position.set(EXIT.x, 1.55, FZ + EXIT.side * (HW + .42)); ex.rotation.y = EXIT.side < 0 ? Math.PI : 0; g.add(ex);
  V.stair = new THREE.Group(); V.stair.position.set(EXIT.x, 0, FZ + EXIT.side * (HW + .3)); scene.add(A.dynamic(V.stair));
  for (let k = 0; k < 7; k++) put(V.stair, mesh(new THREE.BoxGeometry(1.1, .1, .5), k % 2 ? '#E9E2FA' : '#FFD27A', false), 0, -k * .45, EXIT.side * (.25 + k * .45));
  for (const sx of [-.6, .6]) { const r = put(V.stair, mesh(new THREE.BoxGeometry(.06, .06, 4.2), '#4E4A6E', false), sx, -.85, EXIT.side * 1.6); r.rotation.x = EXIT.side * -.78; }
  V.stair.scale.y = .01; V.stair.visible = false;
  // камбуз: неоновий кавовий візок
  put(g, mesh(new THREE.BoxGeometry(1, 1, 1.4), '#4E3A7C', false, true), ST_COFFEE.x - .5, .5, ST_COFFEE.z + .2);
  put(g, mesh(new THREE.BoxGeometry(1.02, .04, 1.42), bulb('#6BE7FF'), false), ST_COFFEE.x - .5, 1.02, ST_COFFEE.z + .2);
  put(g, mesh(new THREE.BoxGeometry(.6, .6, .7), '#E8E3F0'), ST_COFFEE.x - .55, 1.33, ST_COFFEE.z + .2);
  put(g, mesh(new THREE.BoxGeometry(.25, .08, .04), bulb('#FF6BD6'), false), ST_COFFEE.x - .24, 1.4, ST_COFFEE.z + .2);
  put(g, mesh(new THREE.BoxGeometry(1, 1, 1.2), '#4E3A7C', false, true), ST_TEA.x - .5, .5, ST_TEA.z - .1);
  put(g, mesh(new THREE.BoxGeometry(1.02, .04, 1.22), bulb('#6BE7FF'), false), ST_TEA.x - .5, 1.02, ST_TEA.z - .1);
  put(g, mesh(flat(new THREE.CylinderGeometry(.2, .26, .42, 10)), '#7FE08A'), ST_TEA.x - .5, 1.25, ST_TEA.z);
  put(g, mesh(new THREE.BoxGeometry(1.2, .9, .6), '#4E3A7C', false, true), ST_FOOD.x, .45, ST_FOOD.z + .3);
  put(g, mesh(flat(new THREE.CylinderGeometry(.32, .22, .2, 10)), '#C4956A'), ST_FOOD.x, 1, ST_FOOD.z + .2);
  for (let k = 0; k < 4; k++) put(g, mesh(new THREE.TorusGeometry(.08, .04, 5, 8, Math.PI), '#F2A65A', false), ST_FOOD.x - .1 + k * .06, 1.15, ST_FOOD.z + .1 + k * .05);
  put(g, mesh(flat(new THREE.CylinderGeometry(.25, .2, .6, 10)), '#7E77A0'), TRASH.x, .3, TRASH.z);
  // табличка посадки
  put(g, mesh(new THREE.BoxGeometry(.06, 1.3, .06), '#4E4A6E'), BOARD.x, .65, BOARD.z);
  const bs = neonPlane('BOARDING', '#FFD27A', 1.4, .45); bs.position.set(BOARD.x, 1.45, BOARD.z + .05); g.add(bs);
  // вантажний відсік: перегородка, полиці, ящик бомб, щиток
  for (const s of [-1, 1]) put(g, mesh(new THREE.BoxGeometry(.2, 1.25, HW - .95), INNER, false, true), PART_X, .62, FZ + s * (HW + .95) / 2);
  put(g, mesh(new THREE.BoxGeometry(.6, .9, .9), '#C2335A'), BOMBS.x - .2, .45, BOMBS.z);
  put(g, mesh(new THREE.BoxGeometry(.4, .4, .02), bulb('#FFD27A'), false), BOMBS.x + .11, .6, BOMBS.z);
  put(g, mesh(new THREE.BoxGeometry(.3, 1, .8), '#8E86B0'), FUSE.x - .3, .9, FUSE.z);
  put(g, mesh(new THREE.BoxGeometry(.05, .3, .3), bulb('#FFE066'), false), FUSE.x - .13, 1, FUSE.z);
  // крісла з пасажирами
  for (const [i, s] of SEATS.entries()) {
    put(g, mesh(new THREE.BoxGeometry(.75, .42, .85), '#5E6FD8'), s.x, .21, s.z);
    put(g, mesh(new THREE.BoxGeometry(.2, 1.05, .85), '#4C5BC2'), s.x - .33, .62, s.z);
    put(g, mesh(new THREE.BoxGeometry(.22, .22, .5), '#E9E2FA'), s.x - .33, 1.2, s.z);
    const h = buildOffice(pick(['#AFC4B6', '#C9D6CF', '#D9C7A9', '#B9C6C9']), pick(['#3E4A7C', '#2E2346', '#4E4A6E', '#5A6BB5']));
    h.root.position.set(s.x - .05, .05, s.z); h.root.rotation.y = Math.PI / 2; h.root.scale.setScalar(.85);
    h.l1.rotation.x = h.l2.rotation.x = -1.4; h.body.position.y = -.25;
    scene.add(A.dynamic(h.root));
    const icon = new THREE.Sprite(new THREE.SpriteMaterial({ map: iconTex(''), transparent: true, depthWrite: false })); icon.scale.set(.8, .8, 1); icon.position.set(s.x, 2.2, s.z); icon.renderOrder = 4; scene.add(A.dynamic(icon));
    const bar = new THREE.Mesh(new THREE.PlaneGeometry(.8, .1), new THREE.MeshBasicMaterial({ color: '#7FE08A', depthWrite: false })); bar.position.set(s.x, 1.7, s.z); bar.renderOrder = 4; scene.add(A.dynamic(bar));
    V.seats[i] = { h, icon, bar, want: null, ang: 0, ent: { x: s.x, z: s.z, y: 0, bh: 2 } };
  }
  // пастельні хмари, що пролітають повз
  for (let i = 0; i < 16; i++) {
    const c = new THREE.Group(), col = pick(['#FFFFFF', '#FFD9F2', '#D9F2FF', '#E9DCFF']);
    for (let k = 0; k < 3; k++) put(c, mesh(new THREE.IcosahedronGeometry(rand(1.4, 2.8), 1), mat(col, { transparent: true, opacity: .85 }), false), rand(-1.8, 1.8), rand(-.6, .6), rand(-1.8, 1.8));
    c.position.set(FX + rand(-34, 34), rand(-10, -3), FZ + pick([-1, 1]) * rand(9, 26)); scene.add(A.dynamic(c)); V.clouds.push(c);
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
  else if (e.k === 'dmg') {
    if (!here) return;
    if (e.what === 'hole') { const z = FZ + (e.side < 0 ? -1 : 1) * (HW + .1); if (typeof boomFX === 'function') boomFX(+e.x, z, 1.8, .9); banner('💥 Блискавка пробила фюзеляж! Латай пробоїну (F поруч)!'); }
    else if (e.what === 'engine') { const en = ENGINES[e.i ? 1 : 0]; if (typeof boomFX === 'function') boomFX(en.x, en.z, 2.4, 0); banner(`🔥 ${e.i ? 'Правий' : 'Лівий'} двигун горить! Ремонт — на крилі (вийди через двері).`); }
    else { banner('🌑 Зникло світло! Щиток — у вантажному відсіку (хвіст).'); sfx('warn'); }
  }
  else if (e.k === 'fixed') { if (here) { toast(`🔧 ${e.what === 'hole' ? 'Пробоїну залатано' : e.what === 'engine' ? 'Двигун полагоджено' : 'Світло повернулось'}${e.who && e.who !== 'me' ? ` — ${escapeHTML(e.who)}` : ''}!`); sfx('equip'); } }
  else if (e.k === 'door') { if (here) sfx('whoosh'); }
  else if (e.k === 'end') finish(e);
}
function finish(e) {
  const was = V.joined || inPlane(pl.x, pl.z); V.joined = false; V.bombs = 0;
  if (amPilot()) leavePilot();
  if (!was || !running) return;
  const sv = Math.max(0, e.sv | 0), m = clamp(+e.m || 0, 0, 1), win = !!e.win;
  const stars = win ? (m > .75 ? 3 : m > .5 ? 2 : 1) : 0;
  const coins = win ? 40 + sv * 4 + stars * 25 : 10 + sv * 2, xp = win ? 100 + sv * 5 : 30;
  P.coins += coins; addXP(xp);
  const d = A.data(); d.flights = (d.flights || 0) + 1; if (win) d.landed = (d.landed || 0) + 1; d.best = Math.max(d.best || 0, sv); d.stars = Math.max(d.stars || 0, stars);
  banner(win ? `🛬 Посадка в «Гущі»! ${'⭐'.repeat(stars)} Обслужено: ${sv}` : `💥 ${e.why || 'Рейс зірвано.'} Обслужено: ${sv}`);
  toast(`Нагорода: <b>+${coins} 🪙</b> · +${xp} досвіду. Ще рейс — табличка BOARDING біля камбуза (F).`);
  setHeld(''); sfx(win ? 'level' : 'hurt'); refreshHUD(); save();
}

/* ---------- Таця в руках (видно й друзям) ---------- */
function trayMesh(item) {
  const g = new THREE.Group();
  put(g, mesh(new THREE.BoxGeometry(.55, .04, .4), '#C9CDD9'), 0, 0, 0);
  if (item === 'food') put(g, mesh(new THREE.TorusGeometry(.12, .06, 6, 10, Math.PI), '#F2A65A'), 0, .08, 0);
  else { put(g, mesh(flat(new THREE.CylinderGeometry(.09, .07, .2, 10)), '#FFFFFF'), 0, .12, 0); put(g, mesh(flat(new THREE.CylinderGeometry(.08, .08, .02, 10)), ITEM[item].c, false), 0, .22, 0); }
  g.position.set(0, 1.18, .5); return g;
}
function setHeld(item) {
  V.held = item;
  if (V.heldMesh) { V.heldMesh.parent && V.heldMesh.parent.remove(V.heldMesh); V.heldMesh = null; }
  if (item && hero) { V.heldMesh = trayMesh(item); hero.root.add(V.heldMesh); }
  if (NET.on && !SIMSIDE) A.send('held', { item: item || '' });
}
A.onNet('held', (d, from) => {
  if (SIMSIDE || !d) return;
  const r = NET.players[from.id]; if (!r || !r.h) return;
  const old = V.remote.get(from.id); if (old && old.parent) old.parent.remove(old);
  V.remote.delete(from.id);
  if (ITEM[d.item]) { const m = trayMesh(d.item); r.h.root.add(m); V.remote.set(from.id, m); }
});
function spill(force) {
  if (!V.held || V.held === 'food' && !force) return;
  burst(pl.x, 1.2, pl.z, ITEM[V.held].c, 12, 3, .6, 2); ftext(pl.x, 2.6, pl.z, V.held === 'food' ? 'Круасан полетів!' : 'Розлилось! 💦', 'bad'); sfx('splash', pl.x, pl.z); setHeld('');
}

/* ---------- Де можна стояти: салон, відчинені двері, крила ---------- */
function where(x, z) {
  const dz = z - FZ, adz = Math.abs(dz), side = dz < 0 ? -1 : 1;
  if (x > X0 + .35 && x < X1 - .25 && adz < HW - .25) {
    if (Math.abs(x - CK_X) < .3 && (!ST.cdoor || adz > CK_W - .15)) return '';   // перегородка кабіни: пройти лише у відчинені двері
    return 'cabin';
  }
  if (ST.exit && side === EXIT.side && Math.abs(x - EXIT.x) < .6 && adz < HW + 1.2) return 'exit';
  for (const [i, d] of DOORS.entries()) if (ST.doors[i] && side === d.side && Math.abs(x - d.x) < .6 && adz < HW + .75) return 'door';
  const s = adz - HW;
  if (s > .45 && s < SPAN - .3) { const [a, b] = wingX(s); if (x > a + .2 && x < b - .2) return 'wing'; }
  return '';
}
function rescue(msg) { pl.x = FX - 4; pl.z = FZ; pl.y = 0; pl.vy = 0; pl.falling = false; V.last = { x: pl.x, z: pl.z }; V.lastW = 'cabin'; hurtPlayer(12); toast(msg); shake = Math.max(shake, .5); }

/* ---------- Кожен кадр ---------- */
function clientTick(dt) {
  const t = gameTime;
  for (const c of V.clouds) { c.position.x -= (ST.on ? 26 : 6) * dt; if (c.position.x < FX - 36) { c.position.x = FX + 36; c.position.z = FZ + pick([-1, 1]) * rand(9, 26); } }
  // двері, двигуни, пробоїни
  if (V.cdoor) { V.cdoor.position.z = lerp(V.cdoor.position.z, FZ + (ST.cdoor ? CK_W * 2 - .05 : 0), Math.min(1, dt * 6)); }
  if (V.exitM) V.exitM.position.x = lerp(V.exitM.position.x, EXIT.x + (ST.exit ? -1.25 : 0), Math.min(1, dt * 6));
  if (V.stair) { const tgt = ST.exit && !ST.on ? 1 : .01; V.stair.scale.y = lerp(V.stair.scale.y, tgt, Math.min(1, dt * 4)); V.stair.visible = V.stair.scale.y > .05; }
  V.doorM.forEach((d, i) => { const tx = d.x + (ST.doors[i] ? 1.25 : 0); d.m.position.x = lerp(d.m.position.x, tx, Math.min(1, dt * 6)); });
  V.engM.forEach((e, i) => {
    const ok = ST.eng[i]; e.fan.rotation.x += dt * (ok ? (ST.on ? 30 : 4) : .5); e.fire.visible = !ok;
    if (!ok) { e.fire.scale.set(1, .8 + Math.random() * .5, 1); if (Math.random() < dt * 12) burst(ENGINES[i].x - 2, .2, ENGINES[i].z, pick(['#4E4A6E', '#857C99', '#FF8A3C']), 2, 2, 1.2, 2); }
  });
  const seen = new Set();
  for (const h of ST.holes) {
    seen.add(h.id);
    if (!V.holes.has(h.id)) {
      const g = new THREE.Group(); g.position.set(h.x, .8, FZ + h.side * (HW + .12)); scene.add(g);
      put(g, mesh(new THREE.CircleGeometry(.55, 7), new THREE.MeshBasicMaterial({ color: '#1A1030', side: THREE.DoubleSide }), false), 0, 0, -h.side * .13).rotation.y = 0;
      for (let k = 0; k < 6; k++) { const sp = put(g, mesh(new THREE.ConeGeometry(.12, .4, 3), HULL2, false), Math.cos(k) * .55, Math.sin(k) * .45, -h.side * .14); sp.rotation.z = k; }
      V.holes.set(h.id, g);
    }
    if (ST.on && Math.random() < dt * 25) burst(h.x + rand(-2.5, 2.5), rand(.4, 1.4), FZ + h.side * rand(0, HW), '#FFFFFF', 1, 3, .4, .3);
  }
  for (const [id, g] of V.holes) if (!seen.has(id)) { scene.remove(g); V.holes.delete(id); }
  // пасажири
  for (const [i, v] of V.seats.entries()) {
    const p = ST.pass[i]; if (!v) continue;
    const want = ST.on ? p.want : '', ang = p.angry ? 1 : 0;
    if (want !== v.want || ang !== v.ang) { v.want = want; v.ang = ang; v.icon.material.map = iconTex(want, ang); v.icon.material.needsUpdate = true; }
    v.icon.visible = !!want; v.bar.visible = !!want;
    if (want) { v.icon.position.y = 2.2 + Math.sin(t * 3 + i) * .08; v.bar.scale.x = Math.max(.02, p.pat); v.bar.material.color.set(p.pat > .5 ? '#7FE08A' : p.pat > .2 ? '#FFD27A' : '#FF5C7A'); v.bar.lookAt(camera.position); }
    const hh = v.h;
    if (p.angry && ST.on) { hh.aR.rotation.x = -2.6 + Math.sin(t * 12 + i) * .4; hh.body.position.y = -.25 + Math.abs(Math.sin(t * 9 + i)) * .12; if (Math.random() < dt * .25) bubble(v.ent, pick(['Де моя кава?!', 'Я буду скаржитись!', 'Це найгірший рейс!', 'Стюардесо!!!', 'Хто вимкнув світло?!']), true, 2); }
    else { hh.aR.rotation.x = -.3; hh.body.position.y = -.25; }
    hh.root.rotation.z = ST.roll * .12;
  }
  // таці друзів: руки вперед
  for (const [id] of V.remote) { const r = NET.players[id]; if (!r) { V.remote.delete(id); continue; } r.h.aR.rotation.x = r.h.aL.rotation.x = -1.3; }
  updBrew(dt); updFix(dt);
  hud(); darkness();
  if (!running || pl.dead) return;
  const here = inPlane(pl.x, pl.z);
  if (!here) { if (V.held) setHeld(''); V.last = null; return; }
  if (ST.on) V.joined = true;
  if (V.held && (V.heldSendT -= dt) <= 0) { V.heldSendT = 3; if (NET.on) A.send('held', { item: V.held }); }
  pl.safe = { x: FX - 4, z: FZ };
  if (amPilot()) {
    pl.x = COCKPIT.x; pl.z = COCKPIT.z; pl.face = Math.PI / 2; pl.emote = 'sit'; pl.emoteT = 1; pl.atkCd = Math.max(pl.atkCd, .3);
    const a = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
    if (AUTH()) { AU.inA = a; AU.inT = .6; } else if ((V.sendT -= dt) <= 0) { V.sendT = .1; A.send('rq', { k: 'in', a }); }
  } else if (ST.on) {
    const r = ST.roll, w = where(pl.x, pl.z);
    // крен хитає: ковзаєш, кава розливається
    if (Math.abs(r) > .25) { pl.z += r * (w === 'wing' ? 4.5 : 3.2) * dt; pl.x += Math.sin(t * 1.3) * Math.abs(r) * .6 * dt; }
    if (V.held && Math.abs(r) > .55 && Math.random() < dt * (Math.abs(r) - .4) * 1.2) spill();
    // на крилі зустрічний вітер зносить до хвоста
    if (w === 'wing') { pl.x -= 1.7 * dt; if ((V.wind -= dt) <= 0) { V.wind = 1.2; burst(pl.x + 2, 1.2, pl.z, '#FFFFFF', 3, 6, .3, .2); } }
    // пробоїни всмоктують
    for (const h of ST.holes) {
      const hz = FZ + h.side * HW, d = dist2(pl.x, pl.z, h.x, hz);
      if (d < 6 && d > .4) { const k = 2.6 * (1 - d / 6); pl.x += (h.x - pl.x) / d * k * dt; pl.z += (hz - pl.z) / d * k * dt; if (V.held && d < 2.4 && Math.random() < dt * .8) spill(true); }
    }
    // відчинені двері в польоті теж тягнуть
    [...DOORS.map((dd, i) => ST.doors[i] && dd), ST.exit && EXIT].forEach(dd => { if (!dd) return; const hz = FZ + dd.side * HW, d = dist2(pl.x, pl.z, dd.x, hz); if (d < 4 && d > .3) { pl.z += (hz - pl.z) / d * 1.2 * (1 - d / 4) * dt; } });
  }
  // стіни, двері й краї крил
  const w = where(pl.x, pl.z);
  if (w === 'exit' && Math.abs(pl.z - FZ) > HW + .9) { goOut(); return; }
  if (w) { V.last = { x: pl.x, z: pl.z }; V.lastW = w; if (pl.y < 0) pl.y = 0; }
  else if (V.lastW === 'wing') rescue('🌬️ Тебе здуло з крила! Добре, що був страховий трос… (−здоров’я)');
  else if (V.last) { pl.x = V.last.x; pl.z = V.last.z; }
  else { pl.x = FX - 4; pl.z = FZ; }
  if (V.held && hero) { hero.aR.rotation.x = hero.aL.rotation.x = -1.3; }
}
/* темрява, коли зникло світло: видно лише навколо себе */
function darkness() {
  if (!V.dark) { V.dark = document.createElement('div'); V.dark.style.cssText = 'position:fixed;inset:0;z-index:1;pointer-events:none;transition:opacity .4s'; document.body.appendChild(V.dark); }
  const on = running && ST.on && !ST.lights && inPlane(pl.x, pl.z) && !panel;
  V.dark.style.opacity = on ? (Math.random() < .03 ? .6 : 1) : 0;
  if (on) { const p = screenPos(pl.x, 1, pl.z); V.dark.style.background = `radial-gradient(circle at ${Math.round(p.x)}px ${Math.round(p.y)}px, rgba(10,6,25,0) 0, rgba(10,6,25,.15) 90px, rgba(10,6,25,.9) 240px)`; }
}

/* ---------- Камбуз і ремонт: тримай поруч ---------- */
function startBrew(st) {
  if (V.brew || V.fix) return;
  if (V.held) { toast(`Руки зайняті: ${ITEM[V.held].ic}. Віднеси пасажиру або викинь у смітник біля камбуза.`); return; }
  V.brew = { st, t: 0 }; sfx('brew');
}
function updBrew(dt) {
  if (!V.brew) return;
  const b = V.brew; b.t += dt;
  if (dist2(pl.x, pl.z, b.st.x, b.st.z) > 1.8) { V.brew = null; toast('Відійшов — не доварилось.'); return; }
  if (b.t >= b.st.t) { V.brew = null; setHeld(b.st.item); ftext(pl.x, 2.5, pl.z, `${ITEM[b.st.item].ic} Готово — неси!`, 'gold'); sfx('ding'); }
  else if (Math.random() < dt * 6) burst(b.st.x - .4, 1.5, b.st.z, '#FFFFFF', 1, .5, .6, .6);
}
function fixTarget(f) { if (f.what === 'hole') { const h = ST.holes.find(h => h.id === f.id); return h && { x: h.x, z: FZ + h.side * (HW - .4) }; } if (f.what === 'engine') return !ST.eng[f.i] && engFix(f.i); return !ST.lights && FUSE; }
function startFix(f) { if (V.fix || V.brew) return; if (V.held) setHeld(''); V.fix = Object.assign({ t: 0, pt: 0 }, f); sfx('dig'); }
function updFix(dt) {
  if (!V.fix) return;
  const f = V.fix, tg = fixTarget(f);
  if (!tg) { V.fix = null; return; }
  if (dist2(pl.x, pl.z, tg.x, tg.z) > 2) { V.fix = null; toast('Відійшов — ремонт перервано.'); return; }
  f.t += dt; f.pt -= dt;
  if (f.pt <= 0) { f.pt = .5; ftext(pl.x, 2.5, pl.z, `🔧 ${Math.round(f.t / f.need * 100)}%`, 'calm'); burst(tg.x, 1, tg.z, '#FFE066', 4, 3, .4, 2); sfx('hit', tg.x, tg.z); }
  if (f.t >= f.need) { req('fix', { what: f.what, id: f.id, i: f.i }); V.fix = null; }
}
function nearSeat() {
  let best = -1, bd = 1.7;
  SEATS.forEach((s, i) => { const d = dist2(pl.x, pl.z, s.x + .2, s.z - s.side * .6); if (d < bd) { bd = d; best = i; } });
  return best;
}

/* ---------- F ---------- */
const _getInteract = getInteract;
getInteract = function () {
  if (!SIMSIDE && running && !pl.dead && inPlane(pl.x, pl.z) && !pl.carry && !pl.ride) {
    const near = (o, r) => dist2(pl.x, pl.z, o.x, o.z) < r;
    if (amPilot()) return { l: '🧑‍✈️ Встати (автопілот 25 с)', fn: () => leavePilot() };
    if (V.fix) return { l: `🔧 Ремонтую… ${Math.round(V.fix.t / V.fix.need * 100)}%`, fn: () => { } };
    // ремонт
    for (const h of ST.holes) if (near({ x: h.x, z: FZ + h.side * (HW - .4) }, 1.5)) return { l: '🔧 Залатати пробоїну (тримайся поруч 3 с)', fn: () => startFix({ what: 'hole', id: h.id, need: 3 }) };
    for (const [i, e] of ENGINES.entries()) if (!ST.eng[i] && near(engFix(i), 1.7)) return { l: '🔧 Полагодити двигун (4 с)', fn: () => startFix({ what: 'engine', i, need: 4 }) };
    if (near(FUSE, 1.4)) return ST.lights ? { l: '⚡ Щиток (світло є)', fn: () => { } } : { l: '⚡ Увімкнути світло на щитку (2,5 с)', fn: () => startFix({ what: 'power', need: 2.5 }) };
    if (near(COCKPIT, 1.5)) return ST.pilot && ST.pilot !== myKey() ? { l: '🧑‍✈️ Штурвал зайнятий', fn: () => { } } : { l: '🧑‍✈️ Сісти за штурвал (A/D — крен)', fn: () => { if (V.held) setHeld(''); req('pilot'); } };
    if (near({ x: CK_X - .75, z: FZ }, 1) || near({ x: CK_X + .75, z: FZ }, 1)) return { l: ST.cdoor ? '🚪 Зачинити двері кабіни' : '🚪 Відчинити двері в кабіну пілота', fn: () => req('cdoor') };
    if (near({ x: EXIT.x, z: FZ + EXIT.side * (HW - .35) }, 1.2) || near({ x: EXIT.x, z: FZ + EXIT.side * (HW + .9) }, 1.1)) return { l: ST.exit ? '🚪 Зачинити вихідні двері' : ST.on ? '🪂 Відчинити вихідні двері (вийти — стрибок із парашутом)' : '🚪 Відчинити вихідні двері (трап — вийти на двір)', fn: () => req('exit') };
    for (const [i, d] of DOORS.entries()) if (near({ x: d.x, z: FZ + d.side * (HW - .35) }, 1.2) || near({ x: d.x, z: FZ + d.side * (HW + .9) }, 1.1)) return { l: ST.doors[i] ? '🚪 Зачинити двері' : `🚪 Відчинити двері (вихід на ${d.side < 0 ? 'ліве' : 'праве'} крило)`, fn: () => req('door', { i }) };
    if (!ST.on && near(BOARD, 1.8)) return { l: '✈️ Оголосити посадку — вилітаємо!', fn: () => { req('start'); sfx('ding'); } };
    if (near(BOMBS, 1.4)) return { l: `💣 Взяти бомбу з ящика (${3 - V.bombs} лишилось на рейс)`, fn: () => takeBomb() };
    for (const st of STATIONS) if (near(st, 1.3)) return { l: V.brew ? '… готую' : `${ITEM[st.item].ic} ${st.item === 'food' ? 'Взяти круасан' : st.item === 'coffee' ? 'Зварити каву (2 с)' : 'Заварити чай (1,5 с)'}`, fn: () => startBrew(st) };
    if (V.held && near(TRASH, 1.2)) return { l: '🗑️ Викинути', fn: () => setHeld('') };
    const i = nearSeat();
    if (i >= 0 && ST.on) {
      const p = ST.pass[i];
      if (V.held) return { l: p.want ? `Подати ${ITEM[V.held].ic} (просить ${ITEM[p.want].ic})` : `Подати ${ITEM[V.held].ic} (нічого не просить)`, fn: () => { req('serve', { seat: i, item: V.held, to: myKey() }); setHeld(''); } };
      if (p.want) return { l: `Пасажир хоче ${ITEM[p.want].ic} ${ITEM[p.want].n}`, fn: () => toast(`Неси ${ITEM[p.want].ic} ${ITEM[p.want].n} з камбуза (біля вантажного відсіку).`) };
    }
  }
  return _getInteract.apply(this, arguments);
};
function takeBomb() {
  if (V.bombs >= 3) { toast('💣 Ящик для тебе порожній на цей рейс.'); return; }
  if (!ING.cbomb) ING.cbomb = { n: 'Кавова бомба', ic: '💣', c: '#4E4A6E' };
  V.bombs++; P.ing.cbomb = (P.ing.cbomb || 0) + 1; refreshHUD(); save();
  toast(`💣 +1 бомба (усього ${P.ing.cbomb}). Кидати — G (аддон «Еспресо-Сплав»).`); sfx('equip');
}
function leavePilot() { req('pilot', { off: 1 }); pl.emoteT = 0; }

/* ---------- Камера: крен видно по всьому екрану ---------- */
if (!SIMSIDE && typeof updCamera === 'function') {
  const _updCamera = updCamera;
  updCamera = function (dt) { _updCamera.apply(this, arguments); if (running && inPlane(pl.x, pl.z) && ST.on) camera.rotateZ(-ST.roll * .2); };
}
const _updInput = updInput;
updInput = function () { _updInput.apply(this, arguments); if (amPilot()) { input.mx = 0; input.mz = 0; } };

/* ---------- HUD: рейс, поломки, а пілоту — авіагоризонт і радар ---------- */
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
    const dmg = [ST.holes.length ? `🕳️ пробоїн ${ST.holes.length}` : '', !ST.eng[0] ? '🔥 лівий двигун' : '', !ST.eng[1] ? '🔥 правий двигун' : '', !ST.lights ? '🌑 світло' : '', ST.doors[0] || ST.doors[1] || ST.exit ? '🚪 двері відчинені' : ''].filter(Boolean).join(' · ');
    const pilot = ST.pilot ? `🧑‍✈️ ${escapeHTML(ST.pilot === 'me' ? 'ти' : ST.pilot)}` : ST.ap > 0 ? `🤖 автопілот ${Math.ceil(ST.ap)} с` : '<span style="color:#FFD27A">слабкий автопілот!</span>';
    h = `✈️ ESPRESSO FLIGHT · до «Гущі» ${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')} · обслужено ${ST.served} · ${pilot}<br><span style="font-weight:600;font-size:12px">Настрій ${bar(mood)} · чекають ${want}${angry ? ` · <span style="color:#FF5C7A">злі ${angry}</span>` : ''}${V.held ? ` · у руках ${ITEM[V.held].ic}` : ''}${V.brew ? ` · готую ${Math.round(V.brew.t / V.brew.st.t * 100)}%` : ''}${V.fix ? ` · 🔧 ${Math.round(V.fix.t / V.fix.need * 100)}%` : ''}</span>${dmg ? `<br><span style="font-size:12px;color:#FF8A7A">${dmg}</span>` : ''}`;
  } else h = '✈️ Espresso Flight · <span style="font-weight:600">BOARDING біля камбуза (F) — вилітаємо. Кабіна попереду, вантажний відсік у хвості.</span>';
  if (V.hud.innerHTML !== h) V.hud.innerHTML = h;
  const c = V.radar, x = c.getContext && c.getContext('2d'); if (!x || !x.fillRect) return;
  x.clearRect(0, 0, 240, 150);
  x.save(); x.beginPath(); x.arc(62, 75, 52, 0, 7); x.clip(); x.translate(62, 75); x.rotate(-ST.roll * .9);
  x.fillStyle = '#6BB8FF'; x.fillRect(-80, -80, 160, 80); x.fillStyle = '#C4956A'; x.fillRect(-80, 0, 160, 80); x.strokeStyle = '#fff'; x.lineWidth = 2; x.beginPath(); x.moveTo(-60, 0); x.lineTo(60, 0); x.stroke();
  x.restore(); x.strokeStyle = '#FFE066'; x.lineWidth = 4; x.beginPath(); x.moveTo(32, 75); x.lineTo(52, 75); x.moveTo(72, 75); x.lineTo(92, 75); x.stroke();
  x.fillStyle = Math.abs(ST.roll) > .5 ? '#FF5C7A' : '#FFFFFF'; x.font = 'bold 11px sans-serif'; x.textAlign = 'center'; x.fillText('КРЕН', 62, 142);
  x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(128, 12, 100, 122);
  for (const s of ST.storms) { const sx = 178 + s.y * 46, sy = 18 + (1 - Math.max(0, s.d)) * 104; x.fillStyle = '#4E4A6E'; x.beginPath(); x.arc(sx, sy, 13, 0, 7); x.fill(); x.fillStyle = '#FFE066'; x.fillText('⚡', sx, sy + 4); }
  const px = 178 + ST.py * 46; x.fillStyle = '#7FE08A'; x.beginPath(); x.moveTo(px, 116); x.lineTo(px - 8, 132); x.lineTo(px + 8, 132); x.fill();
  x.fillStyle = '#fff'; x.fillText('РАДАР', 178, 146);
}

/* ---------- Музика рейсу: легка й пригодницька, тривожніша, коли щось ламається ---------- */
const FPROG = [[38, [62, 66, 69, 73]], [43, [62, 67, 71, 74]], [40, [64, 67, 71, 74]], [45, [64, 69, 73, 76]]];   // Dmaj7 · G · Em7 · A
const FPROG_T = [[38, [62, 65, 69, 74]], [34, [62, 65, 70, 74]], [36, [60, 64, 67, 72]], [33, [61, 64, 69, 73]]]; // Dm · Bb · C · A
const FMEL = [74, 76, 78, 81, 83, 86];
if (!SIMSIDE && typeof scheduleStep === 'function') {
  const _ss = scheduleStep;
  scheduleStep = function (i, t) {
    if (!running || pl.dead || !inPlane(pl.x, pl.z) || typeof LAYER === 'undefined' || !LAYER.drums) { if (V.music >= 0) { V.music = -1; barMode = ''; } return _ss.apply(this, arguments); }
    const s = i % 16, bar = Math.floor(i / 16), h = STEP / 2;
    const bad = ST.on && (ST.holes.length || !ST.eng[0] || !ST.eng[1] || !ST.lights || ST.storms.some(q => q.d < .4)), lvl = !ST.on ? 0 : bad ? 2 : 1;
    if (s === 0 && V.music !== lvl) { V.music = lvl; const m = [{ keys: .85, bass: .6, drums: .35, tension: 0, lead: .2, crackle: .1 }, { keys: .75, bass: .85, drums: .8, tension: .15, lead: .45, crackle: 0 }, { keys: .6, bass: 1, drums: 1, tension: .7, lead: .4, crackle: 0 }][lvl]; for (const k in m) if (LAYER[k]) LAYER[k].gain.setTargetAtTime(m[k], t, .6); }
    const [root, ch] = (lvl === 2 ? FPROG_T : FPROG)[bar % 4];
    if (s === 0) ch.forEach((n, k) => epiano(t + k * .02, n, lvl ? 1.6 : 3, .045, LAYER.keys));
    if (s % 2 === 0) bassNote(t, root + (s % 8 === 4 ? 7 : 0), STEP * 1.4, lvl ? .42 : .3);
    if (lvl) { if (s % 4 === 0) kick(t, .75); if (s === 4 || s === 12) snare(t, .3); hat(t, s % 2 ? .035 : .055); if (lvl === 2) hat(t + h, .025); }
    else if (s === 0) kick(t, .45);
    if ([0, 3, 6, 10, 12].includes(s) && Math.random() < (lvl ? .55 : .35)) (lvl === 2 ? marimba : steel)(t, pick(FMEL) - (lvl === 2 ? 1 : 0), .045);
    if (lvl === 1 && bar % 4 === 0 && s === 8) leadNote(t, ch[3] + 12, STEP * 6, .035);
    if (lvl === 2 && s % 2 === 0) pulse(t, root + 24 + (s % 8 === 6 ? 6 : 0), STEP * .9, .055);
  };
}

/* ---------- Режим у паузі, вкладка, картка в меню ---------- */
function goFlight() { const f = $('#fade'); closePanel(); if (f) f.style.opacity = 1; sfx('travel'); setTimeout(() => { pl.x = BOARD.x + .5; pl.z = FZ; pl.y = 0; pl.falling = false; pl.jump = null; pl.safe = { x: FX - 4, z: FZ }; V.last = { x: pl.x, z: pl.z }; V.lastW = 'cabin'; camPos.set(pl.x, 20, pl.z + 15); camLook.set(pl.x, .5, pl.z); if (f) f.style.opacity = 0; toast('✈️ Espresso Flight! Хтось — за штурвал (кабіна попереду), решта — на камбуз. Посадка — табличка BOARDING (F).'); }, 260); return true; }
function goOut() {
  if (V.out) return; V.out = true; V.last = null; V.joined = false;
  const fly = ST.on; leaveFlight();
  if (fly) { burst(pl.x, 1, pl.z, '#FFFFFF', 16, 6, .6, 1.5); sfx('whoosh'); }
  goHub(fly ? '🪂 Ти вистрибнув із парашутом і м’яко приземлився в «Гущі». Рейс летить далі без тебе.' : '🚪 Ти спустився трапом і вийшов на двір. Повернутись — ✈️ у меню (Esc).');
  setTimeout(() => { V.out = false; }, 600);
}
function leaveFlight() { if (amPilot()) leavePilot(); setHeld(''); V.fix = null; V.brew = null; return true; }
if (A.mode) A.mode({ id: 'flight', ic: '✈️', n: 'Кавовий рейс', sub: 'кооп на 1–4: пілот, бортпровідники, поломки', go: goFlight, here: () => running && inPlane(pl.x, pl.z), leave: leaveFlight });
A.tab('flight', '✈️ Рейс', () => {
  const d = A.data(), here = inPlane(pl.x, pl.z);
  return `<h3>✈️ Кавовий рейс · Espresso Flight</h3>
    <p style="font-size:13px;line-height:1.5;margin:4px 0 10px">Кооператив на 1–4 гравці. Літак летить 4 хвилини до «Гущі», салон повний пасажирів — усі чогось хочуть, а літак розвалюється.</p>
    <div class="btns">${here ? (ST.on ? '' : '<button class="btn" data-fl="start">✈️ Вилітаємо!</button>') : '<button class="btn" data-fl="go">✈️ На борт</button>'}</div>
    <div class="list" style="margin-top:10px;font-size:13px;line-height:1.55">
      <div>🧑‍✈️ <b>Пілот</b> — F у кабіні, <b>A/D</b> — крен. Грози на радарі обходиш креном (але крен хитає салон). Встав — автопілот тримає 25 с, потім слабне.</div>
      <div>☕ <b>Камбуз</b> (біля вантажного відсіку): кава 2 с, чай 1,5 с, круасан. Неси пасажиру з такою ж іконкою. Друзі бачать, що в тебе на таці.</div>
      <div>🔧 <b>Поломки</b>: пробоїна (всмоктує людей і каву — латай на місці), двигун горить (тягне вбік — ремонт на крилі), світло (щиток у хвості). F і тримайся поруч.</div>
      <div>🚪 <b>Двері</b> — F: бічні ведуть на крила (там вітер — зазіваєшся, здує!), двері з табличкою COCKPIT — до пілота, EXIT біля кабіни — назовні: на землі трапом на двір, у польоті — стрибок із парашутом.</div>
      <div>📦 <b>Вантажний відсік</b>: коробки й офісні крісла (F — підняти / сісти, Q — жбурнути), ящик бомб 💣 (до 3 за рейс).</div>
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
    card.innerHTML = `<div class="mm-img-wrap"><div class="mm-card-img" style="background-image:url('menu/flight-bg.jpg'),url('addons/flight/flight-bg.jpg'),linear-gradient(160deg,#6BB8FF,#B07CF0 60%,#FFB3E6)"></div></div>
      <div class="mm-card-body"><h2>РЕЙС</h2><div class="mm-subtitle">Espresso Flight</div>
      <div class="mm-desc">Один пілотує, інші розносять каву й латають літак. Кооп на 4 гравці.</div></div>`;
    const locked = [...box.children].filter(c => c.classList.contains('mm-locked')).pop();
    box.insertBefore(card, locked || null);
    card.addEventListener('click', () => {
      V.auto = true; if (running) goFlight();
      const mm = document.getElementById('main-menu'); if (mm) { mm.classList.add('mm-hide'); mm.addEventListener('transitionend', () => mm.remove(), { once: true }); }
    });
  }
}
A.on('start', () => { if (V.auto && !SIMSIDE) setTimeout(goFlight, 700); });
if (window.__ADDON_TEST) window.__flight = { ST, AU, V, SEATS, STATIONS, COCKPIT, CK_X, EXIT, goOut, BOARD, DOORS, ENGINES, engFix, FUSE, BOMBS, setHeld, nearSeat, damage, where };
