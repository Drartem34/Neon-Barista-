/* Аддон «Офісний боулінг»: новий режим.
   Сідаєш в офісне крісло (або візок із супермаркету), п'єш «Веселковий чай» — і летиш доріжкою
   в десятьох зомбі-офісників, що стоять трикутником, як кеглі. Вони розлітаються, як ганчір'яні ляльки.
   - Пробіл або ЛКМ: затисни — набираєш силу (шкала гойдається), відпусти — поїхав.
     Напрямок гойдається сам (це чай), A/D трохи підрулюють уже в дорозі.
   - 5 фреймів, правила справжнього боулінгу: страйк, спер, бонусні кидки в останньому фреймі.
   - Дві доріжки: грай проти друга (сідайте обоє) або проти бота Кента, якщо нікого нема.
   - Хто більше набрав — той і переміг: монети, досвід, рекорд.
   Картинку для картки в меню поклади поруч: addons/bowling/bowling-bg.jpg (або menu/bowling-bg.jpg). */
const A = Addon.info({ name: 'Офісний боулінг', version: '1.0', desc: 'Режим «Боулінг»: крісло, «Веселковий чай» і зомбі-кеглі з ганчір\'яною фізикою. Проти друга або бота.' });

const SIMSIDE = !!window.__SIM;
const IX = 118, IZ = 64, ISL_R = 19;
const LANES_Z = [IZ - 2.6, IZ + 2.6], START_X = IX - 13.5, HEAD_X = IX + 7.6, END_X = IX + 11.2, LANE_HW = 1.25, GUT_HW = 1.75;
const PIN_R = .3, CHAIR_R = .45, FRAMES = 5;
const inBowl = (x, z) => dist2(x, z, IX, IZ) < ISL_R + 2;

A.island({ id: 'bowling', n: 'Офісний боулінг', sub: 'крісло, чай і зомбі-кеглі · вибий страйк', x: IX, z: IZ, r: ISL_R, top: '#D9D2E8', rock: '#8C84C6', tier: 1, safe: true });

/* ======================= ДАЛІ — ЛИШЕ В ГРАВЦЯ ======================= */
const BW = { seated: false, lane: -1, kind: 'chair', aimT: 0, charge: -1, aura: null, hud: null, board: null, boardKey: '', sendT: 0, filterT: 0, music: -1 };
const LN = [0, 1].map(i => ({ i, z: LANES_Z[i], pins: [], chair: null, cx: START_X, cz: LANES_Z[i], vx: 0, vz: 0, state: 'idle', t: 0,
  owner: null, ownerId: null, name: '', side: null, arrow: null, kind: 'chair', remoteT: 0 }));
// одна партія: два гравці (або гравець і бот), у кожного свої кидки
const M = { on: false, id: 0, sides: [], waitT: 0, endT: 0 };
const newSide = (lane, kind, name, id) => ({ lane, kind, name, id, rolls: [], frame: 0, ball: 0, done: false });
const myKey = () => (NET.on ? NET.id : 'me');

/* ---------- Рахунок (правила боулінгу на 5 фреймів) ---------- */
function scoreOf(rolls) {
  const out = []; let i = 0, total = 0;
  for (let f = 0; f < FRAMES; f++) {
    if (i >= rolls.length) break;
    const last = f === FRAMES - 1;
    if (!last && rolls[i] === 10) { if (rolls[i + 2] == null) break; total += 10 + rolls[i + 1] + rolls[i + 2]; i += 1; }
    else if (!last && rolls[i] + (rolls[i + 1] ?? 0) === 10 && rolls[i + 1] != null) { if (rolls[i + 2] == null) break; total += 10 + rolls[i + 2]; i += 2; }
    else if (!last) { if (rolls[i + 1] == null) break; total += rolls[i] + rolls[i + 1]; i += 2; }
    else { const need = rolls[i] === 10 || rolls[i] + (rolls[i + 1] ?? 0) >= 10 ? 3 : 2; if (rolls.length - i < need) break; total += rolls.slice(i, i + need).reduce((a, b) => a + b, 0); i += need; }
    out.push(total);
  }
  return out;
}
const totalOf = s => { const sc = scoreOf(s.rolls); return sc.length ? sc[sc.length - 1] : 0; };
function frameMarks(rolls) {   // «X», «/», «-» по фреймах — для табло
  const fr = []; let i = 0;
  for (let f = 0; f < FRAMES && i < rolls.length; f++) {
    const last = f === FRAMES - 1, m = [];
    if (!last) {
      if (rolls[i] === 10) { m.push('X'); i++; }
      else { m.push(rolls[i] || '-'); if (rolls[i + 1] != null) m.push(rolls[i] + rolls[i + 1] === 10 ? '/' : rolls[i + 1] || '-'); i += 2; }
    } else { let prev = 0; for (let k = 0; k < 3 && i < rolls.length; k++, i++) { const r = rolls[i]; m.push(r === 10 && (prev === 0 || prev === 10) ? 'X' : prev + r === 10 && prev ? '/' : r || '-'); prev = (prev + r) % 10 === 0 && prev + r > 0 ? 0 : prev + r; } }
    fr.push(m.join(' '));
  }
  return fr;
}

/* ---------- Кеглі-зомбі з ганчір'яною фізикою ---------- */
function pinSpots(z) { const s = []; for (let r = 0; r < 4; r++) for (let j = 0; j <= r; j++) s.push([HEAD_X + r * .72, z + (j - r / 2) * .74]); return s; }
function pinMesh() {
  const h = buildOffice(pick(['#AFC4B6', '#B9C6C9', '#A8C2A2']), pick(['#8291B8', '#7C8AA8', '#8C84A8']));
  h.root.scale.setScalar(.72); h.root.rotation.order = 'YXZ'; scene.add(A.dynamic(h.root)); return h;   // dynamic: інакше оптимізатор «зліпить» кеглю в нерухомий світ
}
function setPins(L, all) {
  const spots = pinSpots(L.z);
  if (!L.pins.length) for (const [x, z] of spots) L.pins.push({ x, z, hx: x, hz: z, vx: 0, vz: 0, y: 0, vy: 0, tilt: 0, tv: 0, dir: -Math.PI / 2, down: false, gone: false, m: SIMSIDE ? null : pinMesh() });
  L.pins.forEach((p, k) => {
    if (!all && (p.down || p.gone)) { p.gone = true; p.cleared = true; if (p.m) p.m.root.visible = false; return; }
    if (all) Object.assign(p, { x: spots[k][0], z: spots[k][1], vx: 0, vz: 0, y: 2.5, vy: 0, tilt: 0, tv: 0, dir: -Math.PI / 2, down: false, gone: false, cleared: false });
    if (p.m) p.m.root.visible = !p.gone;
  });
}
function hitPin(p, vx, vz, f) {
  const sp = Math.hypot(vx, vz) * f;
  if (sp < .4) return;
  const j = rand(-.35, .35) * Math.hypot(vx, vz);   // трохи випадковості: ідеальний кидок — ще не гарантований страйк
  p.vx += vx * f + j * Math.sign(p.z - (p.hz || p.z) || rand(-1, 1)) * .3; p.vz += vz * f + j; p.vy = Math.max(p.vy, Math.min(5, sp * .35));
  p.dir = Math.atan2(vx, vz); p.tv = Math.max(p.tv, Math.min(10, sp * 1.05));
  if (!p.hitT) { p.hitT = 1; if (!SIMSIDE && Math.random() < .5) ftext(p.x, 2, p.z, pick(['АЙ!', 'Мій KPI!', 'Ой-йой!', 'Я ж на нараді!', 'Лікарняний!']), 'crit'); }
}
function simPins(L, dt) {
  let moving = 0;
  for (const p of L.pins) {
    if (p.gone) continue;
    const sp = Math.hypot(p.vx, p.vz);
    if (sp > .05 || p.y > 0 || p.tv || (p.tilt > 0 && p.tilt < Math.PI / 2) || p.vy) {
      moving++;
      p.x += p.vx * dt; p.z += p.vz * dt;
      p.vy -= 22 * dt; p.y += p.vy * dt;
      const onLane = Math.abs(p.z - L.z) < GUT_HW + .3 && p.x < END_X + .5 && p.x > START_X - 1;
      if (p.y <= 0 && onLane) { p.y = 0; p.vy = p.vy < -3 ? -p.vy * .3 : 0; }
      if (!onLane && p.y < -12) { p.gone = true; p.down = true; if (p.m) p.m.root.visible = false; }
      const fr = Math.exp(-(p.y > .05 ? .3 : 2.6) * dt); p.vx *= fr; p.vz *= fr;
      // хитається: слабкий поштовх — гойднувся й устояв, сильний — гепнувся
      if (p.tv || p.tilt) {
        p.tilt += p.tv * dt; p.tv -= (p.tilt < .85 ? 10 : -7) * dt;
        if (p.tilt <= 0) { p.tilt = 0; p.tv = 0; }
        if (p.tilt >= Math.PI / 2) { p.tilt = Math.PI / 2; p.tv = 0; }
      }
      if (p.x > END_X) { p.x = END_X; p.vx *= -.3; }
      if (p.tilt > .85 || dist2(p.x, p.z, p.hx, p.hz) > 1.1) p.down = true;
    }
    // ланцюгова реакція
    if (sp > 1.2) for (const q of L.pins) if (q !== p && !q.gone && dist2(p.x, p.z, q.x, q.z) < PIN_R * 2.2) {
      const a = Math.atan2(q.x - p.x, q.z - p.z) + rand(-.4, .4); hitPin(q, Math.sin(a) * sp, Math.cos(a) * sp, rand(.4, .68)); p.vx *= .7; p.vz *= .7;
    }
  }
  return moving;
}
function drawPins(L, t) {
  for (const p of L.pins) {
    if (!p.m) continue;
    p.m.root.visible = !p.gone;
    if (p.gone) continue;
    if (p.y > .05 && !p.down && p.tilt === 0 && p.vy <= 0) p.y = Math.max(0, p.y - 0);   // кеглі «падають згори» при новому фреймі
    p.m.root.position.set(p.x, p.y, p.z);
    p.m.root.rotation.y = p.dir; p.m.root.rotation.x = p.tilt;
    const fly = p.tilt > 0 && p.tilt < Math.PI / 2 - .05 || Math.hypot(p.vx, p.vz) > .5;
    p.m.aL.rotation.x = fly ? Math.sin(t * 22 + p.hx) * 1.4 : -.3; p.m.aR.rotation.x = fly ? Math.cos(t * 19 + p.hz) * 1.4 : -.3;
    p.m.aL.rotation.z = fly ? .6 : 0; p.m.aR.rotation.z = fly ? -.6 : 0;
    p.m.l1.rotation.x = fly ? Math.sin(t * 17) * .8 : 0; p.m.l2.rotation.x = fly ? -Math.sin(t * 17) * .8 : 0;
    if (!p.down && !fly) p.m.body.rotation.z = Math.sin(t * 2 + p.hx * 3) * .05;   // похитуються, як зомбі
  }
}

/* ---------- Крісло на доріжці ---------- */
function laneChair(L, kind) {
  if (L.chair && L.kind === kind) return;
  if (L.chair) scene.remove(L.chair);
  L.kind = kind; L.chair = bodyMesh(kind === 'cart' ? 'cart' : 'chair'); scene.add(A.dynamic(L.chair));
}
function simChair(L, dt, steer) {
  L.cx += L.vx * dt; L.cz += L.vz * dt;
  L.vz += steer * 2.4 * dt + Math.sin(gameTime * 2.3 + L.i) * .55 * dt;   // чай трохи «несе»
  const fr = Math.exp(-.22 * dt); L.vx *= fr; L.vz *= fr;
  const off = L.cz - L.z;
  if (Math.abs(off) > LANE_HW + .05) { L.gutter = true; L.cz = L.z + Math.sign(off) * (GUT_HW - .2); L.vz = 0; }
  if (L.cx > END_X - .3) { L.cx = END_X - .3; L.vx = -L.vx * .15; }
  if (!L.gutter) for (const p of L.pins) if (!p.gone && !p.chairHit && dist2(L.cx, L.cz, p.x, p.z) < CHAIR_R + PIN_R) {
    p.chairHit = 1; hitPin(p, L.vx, L.vz + (p.z - L.cz) * 3, 1.1); L.vx *= .72; L.vz += (L.cz - p.z) * 2.5 + rand(-1.2, 1.2);   // крісло відскакує — не просікає всіх наскрізь
    if (!SIMSIDE) { burst(p.x, 1.2, p.z, '#FFE27A', 6, 3, .4, 2); sfx('crit', p.x, p.z); shake = Math.max(shake, .15); }
  }
}

/* ---------- Кидок: прицілювання, сила, поїхали ---------- */
const aimAngle = t => .17 * Math.sin(t * 1.6) + .07 * Math.sin(t * 4.7);
const power = t => .5 - .5 * Math.cos(t * 3.2);
function launch(L, ang, pw) {
  const sp = 7 + 9 * pw; L.vx = Math.cos(ang) * sp; L.vz = Math.sin(ang) * sp;
  L.state = 'roll'; L.t = 0; L.gutter = false; L.hitAny = false;
  for (const p of L.pins) { p.hitT = 0; p.chairHit = 0; }
  if (!SIMSIDE) sfx('whoosh', L.cx, L.cz);
}
function laneRollDone(L) {   // кидок закінчився: рахуємо збиті кеглі
  const s = L.side; if (!s) return;
  const already = L.pins.filter(p => p.cleared).length, downNow = L.pins.filter(p => !p.cleared && (p.down || p.gone)).length;   // ті, що вилетіли за доріжку, теж збиті
  const standingBefore = 10 - already, knocked = Math.min(standingBefore, downNow);
  s.rolls.push(knocked);
  const last = s.frame === FRAMES - 1;
  let reset = false, msg = '';
  if (!last) {
    if (s.ball === 0 && knocked === 10) { msg = 'СТРАЙК! 🎳'; s.frame++; s.ball = 0; reset = true; }
    else if (s.ball === 0) { s.ball = 1; }
    else { if (standingBefore === knocked) msg = 'СПЕР! ✨'; s.frame++; s.ball = 0; reset = true; }
  } else {
    const fr = s.rolls.slice(s.rolls.length - s.ball - 1);
    if (knocked === standingBefore && knocked > 0) { msg = standingBefore === 10 ? 'СТРАЙК! 🎳' : 'СПЕР! ✨'; reset = true; }
    s.ball++;
    const sum2 = fr[0] + (fr[1] || 0);
    if (s.ball >= 3 || (s.ball === 2 && sum2 < 10)) { s.done = true; s.frame = FRAMES; }
  }
  if (s.frame >= FRAMES) s.done = true;
  if (!SIMSIDE) {
    if (msg) { ftext(HEAD_X + 1, 2.8, L.z, msg, 'big'); if (L.owner === 'me') banner(msg); sfx(msg.startsWith('С') && msg.includes('Т') ? 'legend' : 'level'); confetti(HEAD_X + 1, L.z); }
    else ftext(HEAD_X + 1, 2.4, L.z, knocked ? `${knocked} ${knocked === 1 ? 'зомбі' : 'зомбі'}` : 'Мимо…', knocked ? 'crit' : 'bad');
  }
  setPins(L, reset);
  L.cx = START_X; L.cz = L.z; L.vx = L.vz = 0; L.state = s.done ? 'done' : 'aim'; L.t = 0;
  if (L.owner === 'me') { A.send('bw', { k: 'roll', lane: L.i, mid: M.id, rolls: s.rolls }); netLane(L, true); }
  checkEnd();
}
function confetti(x, z) { for (const c of ['#FF6BD6', '#6BE7FF', '#FFE066', '#7FE08A', '#B07CF0']) burst(x, 2.5, z, c, 10, 6, 1.4, 6); }

/* ---------- Бот Кент ---------- */
function botTick(L, dt) {
  if (L.state === 'aim') {
    L.t += dt; if (L.t < 1.6) return;
    const skill = .75; L.botAng = aimAngle(L.t) * (1 - skill) + rand(-.04, .04); launch(L, L.botAng, clamp(rand(.55, 1) * skill + .2, 0, 1));
  }
}

/* ---------- Матч ---------- */
function startMatch(myLane, opp) {
  M.on = true; M.id = opp && opp.mid || Math.floor(Math.random() * 1e9); M.endT = 0;
  const me = newSide(myLane, 'me', myName() || 'Ти', myKey());
  const other = 1 - myLane;
  const os = opp ? newSide(other, 'net', opp.name, opp.id) : newSide(other, 'bot', 'Бот Кент', 'bot');
  M.sides = [me, os];
  for (const s of M.sides) { const L = LN[s.lane]; L.side = s; L.owner = s.kind; L.name = s.name; L.state = 'aim'; L.t = 0; L.cx = START_X; L.cz = L.z; setPins(L, true); laneChair(L, s.kind === 'bot' ? 'cart' : L.kind); }
  banner(`🎳 Боулінг: ${escapeHTML(me.name)} проти ${escapeHTML(os.name)}! Вибий страйк.`); sfx('ding');
}
function checkEnd() {
  if (!M.on || !M.sides.every(s => s.done)) return;
  M.on = false;
  const [me, op] = M.sides, a = totalOf(me), b = totalOf(op);
  const strikes = me.rolls.filter((r, i) => r === 10).length;
  const win = a > b, draw = a === b;
  const coins = (win ? 80 : draw ? 40 : 20) + strikes * 10, xp = win ? 120 : 50;
  P.coins += coins; addXP(xp);
  const d = A.data(); d.games = (d.games || 0) + 1; if (win) d.wins = (d.wins || 0) + 1; d.best = Math.max(d.best || 0, a); d.strikes = (d.strikes || 0) + strikes;
  banner(win ? `🏆 Перемога! ${a} : ${b}` : draw ? `🤝 Нічия ${a} : ${b}` : `😵 ${escapeHTML(op.name)} переміг ${b} : ${a}`);
  toast(`Нагорода: <b>+${coins} 🪙</b> · +${xp} досвіду${strikes ? ` · страйків: ${strikes}` : ''}. Ще партія — сядь у крісло знову.`);
  sfx(win ? 'level' : 'ding'); refreshHUD(); save();
  if (win) confetti(START_X, LN[me.lane].z);
  setTimeout(() => standUp(true), 2500);
}

/* ---------- Сісти / встати ---------- */
function sitDown(i) {
  const L = LN[i];
  if (L.owner && L.owner !== 'me' && L.owner !== 'free') { toast('Ця доріжка зайнята.'); return; }
  BW.seated = true; BW.lane = i; L.owner = 'me'; L.ownerId = myKey(); L.name = myName() || 'Ти'; L.state = 'wait'; L.cx = START_X; L.cz = L.z;
  laneChair(L, BW.kind); setPins(L, true);
  pl.x = START_X; pl.z = L.z; pl.y = 0; pl.face = Math.PI / 2;
  const o = LN[1 - i];
  A.send('bw', { k: 'claim', lane: i, name: L.name, kind: BW.kind });
  if (o.owner === 'net' && o.state === 'wait' && !M.on) { const mid = Math.floor(Math.random() * 1e9); A.send('bw', { k: 'start', lane: i, vs: o.ownerId, mid }); startMatch(i, { id: o.ownerId, name: o.name, mid }); }
  else { M.waitT = NET.on ? 8 : .5; toast(NET.on ? '🍵 Випив «Веселковий чай». Чекаю суперника 8 с — нехай друг сідає на сусідню доріжку. Інакше гратимеш із ботом Кентом.' : '🍵 Випив «Веселковий чай». Граєш проти бота Кента!'); }
  sfx('drink');
}
function standUp(quiet) {
  if (!BW.seated) return;
  const L = LN[BW.lane];
  if (M.on && !quiet) { const op = M.sides[1]; banner(`🏳️ Ти здався — ${escapeHTML(op.name)} перемагає.`); M.on = false; A.send('bw', { k: 'quit', lane: BW.lane, mid: M.id }); }
  A.send('bw', { k: 'free', lane: BW.lane });
  BW.seated = false; L.owner = null; L.side = null; L.state = 'idle'; L.cx = START_X; L.cz = L.z;
  const o = LN[1 - BW.lane]; if (o.owner === 'bot') { o.owner = null; o.side = null; o.state = 'idle'; setPins(o, true); }
  pl.x = START_X - 1.6; pl.z = L.z; pl.emoteT = 0; BW.lane = -1; BW.charge = -1;
  if (typeof cv !== 'undefined') cv.style.filter = '';
}

/* ---------- Мережа: доріжки друзів ---------- */
function netLane(L, force) {
  if (!NET.on) return;
  A.send('bw', { k: 'st', lane: L.i, c: [r2(L.cx), r2(L.cz), L.kind === 'cart' ? 1 : 0], s: L.state, p: L.pins.map(p => [r2(p.x), r2(p.z), r2(p.y), r2(p.tilt), r2(p.dir), p.gone ? 2 : p.down ? 1 : 0]) });
}
const r2 = v => Math.round(v * 100) / 100;
A.onNet('bw', (d, from) => {
  if (SIMSIDE || !d || !(d.lane === 0 || d.lane === 1)) return;
  const L = LN[d.lane];
  if (L.owner === 'me') return;                                  // мою доріжку рахую я сам
  if (L.owner === 'bot' && M.on && d.k !== 'free') return;         // тут зараз грає мій бот
  if (d.k === 'claim') {
    if (L.owner === 'bot' && M.on) return;   // у мене тут уже грає бот — друг побачить, коли звільниться
    L.owner = 'net'; L.ownerId = from.id; L.name = String(d.name || from.name).slice(0, 20); L.state = 'wait'; laneChair(L, d.kind === 'cart' ? 'cart' : 'chair');
    if (BW.seated && LN[BW.lane].state === 'wait' && !M.on) toast(`🎳 <b>${escapeHTML(L.name)}</b> сів на сусідню доріжку!`);
  } else if (d.k === 'start') {
    if (BW.seated && d.vs === myKey() && !M.on) { L.owner = 'net'; L.ownerId = from.id; L.name = from.name; startMatch(BW.lane, { id: from.id, name: from.name, mid: d.mid }); }
  } else if (d.k === 'free') { L.owner = null; L.state = 'idle'; L.side = null; L.cx = START_X; L.cz = L.z; setPins(L, true); }
  else if (d.k === 'st' && L.owner === 'net') {
    L.remoteT = 1; L.state = d.s || L.state;
    if (Array.isArray(d.c)) { L.cx = +d.c[0]; L.cz = +d.c[1]; laneChair(L, d.c[2] ? 'cart' : 'chair'); }
    if (Array.isArray(d.p)) d.p.slice(0, 10).forEach((q, k) => { const p = L.pins[k]; if (!p) return; p.x = +q[0]; p.z = +q[1]; p.y = +q[2]; p.tilt = +q[3]; p.dir = +q[4]; p.down = q[5] >= 1; p.gone = q[5] === 2; p.vx = p.vz = p.vy = p.tv = 0; });
  } else if (d.k === 'roll' && M.on && d.mid === M.id) {
    const s = M.sides.find(x => x.lane === d.lane && x.kind === 'net');
    if (s && Array.isArray(d.rolls)) { s.rolls = d.rolls.slice(0, 21).map(v => clamp(v | 0, 0, 10)); s.done = scoreOf(s.rolls).length >= FRAMES; checkEnd(); }
  } else if (d.k === 'quit' && M.on && d.mid === M.id) {
    banner(`🏳️ ${escapeHTML(L.name)} вийшов — перемога твоя!`); const s = M.sides[1]; s.done = true; M.sides[0].done = true;
    s.rolls = s.rolls.length ? s.rolls : [0]; checkEnd();
  }
});

/* ---------- Будова: доріжки, неон, табло ---------- */
A.on('world', () => {
  if (SIMSIDE) return;
  const g = new THREE.Group(); scene.add(g);
  const len = END_X - START_X + 3;
  for (const z of LANES_Z) {
    put(g, mesh(new THREE.BoxGeometry(len, .12, LANE_HW * 2), '#E3C08F', false, true), (START_X + END_X) / 2, .06, z);
    for (let k = 0; k < 9; k++) put(g, mesh(new THREE.BoxGeometry(len, .005, .03), '#C9A576', false), (START_X + END_X) / 2, .125, z - LANE_HW + .25 + k * .25);
    for (const s of [-1, 1]) {
      put(g, mesh(new THREE.BoxGeometry(len, .05, GUT_HW - LANE_HW), '#4E4A6E', false, true), (START_X + END_X) / 2, .03, z + s * (LANE_HW + (GUT_HW - LANE_HW) / 2));
      put(g, mesh(new THREE.BoxGeometry(len, .06, .06), bulb(s < 0 ? '#FF6BD6' : '#6BE7FF'), false), (START_X + END_X) / 2, .14, z + s * GUT_HW);
    }
    for (let k = 0; k < 5; k++) put(g, mesh(new THREE.ConeGeometry(.12, .3, 3), '#FF8A5B', false), START_X + 3 + k * .01, .13, z + (k - 2) * .4).rotation.set(-Math.PI / 2, 0, Math.PI / 2);   // стрілки-орієнтири
    put(g, mesh(new THREE.BoxGeometry(.4, 1.6, GUT_HW * 2 + .4), '#3E3A5C'), END_X + .4, .8, z);   // задня стінка
  }
  // START на підлозі
  const st = labelPlane('START', '#8FD9C0', 3.2, .9); st.rotation.x = -Math.PI / 2; st.rotation.z = Math.PI / 2; st.position.set(START_X - 1.6, .13, IZ); g.add(st);
  // неон «БОУЛІНГ» над кеглями
  const sign = labelPlane('БОУЛІНГ', '#6BE7FF', 6, 1.5, true); sign.position.set(END_X + .6, 4.4, IZ); sign.rotation.y = -Math.PI / 2; scene.add(A.dynamic(sign));
  for (const s of [-1, 1]) put(g, mesh(flat(new THREE.CylinderGeometry(.08, .08, 4.4, 6)), '#4E4A6E'), END_X + .7, 2.2, IZ + s * 2.9);
  addLampGlow(scene, END_X, 4.4, IZ, '#6BE7FF', 4, { pool: false });
  // табло
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; BW.boardCv = c;
  BW.board = new THREE.Mesh(new THREE.PlaneGeometry(4, 2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c) }));
  BW.board.position.set(START_X + 4, 2.4, IZ + 6.2); BW.board.rotation.y = Math.PI; scene.add(A.dynamic(BW.board));
  put(g, mesh(new THREE.BoxGeometry(4.3, 2.3, .1), '#2E2346'), START_X + 4, 2.4, IZ + 6.28);
  for (const s of [-1, 1]) put(g, mesh(new THREE.BoxGeometry(.1, 2.4, .1), '#4E4A6E'), START_X + 4 + s * 1.9, 1.2, IZ + 6.3);
  // офісний антураж: столи з паперами
  for (const [x, z] of [[START_X + 1, IZ + 4.8], [START_X + 7, IZ - 5], [START_X + 12, IZ + 5.2], [END_X - 2, IZ - 5.4]]) {
    if (!onGround(x, z, 1)) continue; table(x, z);
    for (let k = 0; k < 3; k++) put(scene, mesh(new THREE.BoxGeometry(.4, .25, .3), '#FFFFFF'), x + rand(-.8, .8), .9 + k * .26, z + rand(-.3, .3));
  }
  for (const L of LN) { setPins(L, true); laneChair(L, 'chair'); }
});
function labelPlane(txt, col, w, h, neon) {
  const c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * h / w);
  const x = c.getContext && c.getContext('2d');
  if (x && x.fillText) {
    if (neon) { x.fillStyle = 'rgba(46,35,70,.9)'; x.fillRect(0, 0, c.width, c.height); x.strokeStyle = col; x.lineWidth = 10; x.strokeRect(8, 8, c.width - 16, c.height - 16); }
    x.font = `bold ${Math.round(c.height * .62)}px sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.shadowColor = col; x.shadowBlur = neon ? 24 : 0; x.fillStyle = neon ? '#FFFFFF' : col; x.fillText(txt, c.width / 2, c.height / 2 + 4);
  }
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
}
function drawBoard() {
  if (!BW.board) return;
  const rows = [0, 1].map(i => { const L = LN[i], s = L.side; return [L.name || (L.owner ? '…' : '—'), s ? frameMarks(s.rolls) : [], s ? totalOf(s) : '']; });
  const key = JSON.stringify(rows); if (key === BW.boardKey) return; BW.boardKey = key;
  const c = BW.boardCv, x = c.getContext && c.getContext('2d'); if (!x || !x.fillText) return;
  x.fillStyle = '#2E2346'; x.fillRect(0, 0, 512, 256);
  x.font = 'bold 26px sans-serif'; x.textBaseline = 'middle';
  rows.forEach(([n, fr, tot], r) => {
    const y = 70 + r * 100;
    x.fillStyle = r ? '#6BE7FF' : '#FF6BD6'; x.textAlign = 'left'; x.fillText(String(n).slice(0, 10), 16, y);
    for (let f = 0; f < FRAMES; f++) { x.strokeStyle = 'rgba(255,255,255,.35)'; x.strokeRect(170 + f * 52, y - 24, 48, 48); x.fillStyle = '#FFFFFF'; x.textAlign = 'center'; x.font = 'bold 18px sans-serif'; x.fillText(fr[f] || '', 194 + f * 52, y); }
    x.font = 'bold 34px sans-serif'; x.fillStyle = '#FFE066'; x.fillText(String(tot), 470, y); x.font = 'bold 26px sans-serif';
  });
  BW.board.material.map.needsUpdate = true;
}

/* ---------- Кожен кадр ---------- */
A.on('tick', dt => {
  if (SIMSIDE) return;
  const t = gameTime;
  // мої й ботові доріжки рахуються тут; доріжки друзів приходять мережею
  for (const L of LN) {
    if (L.owner === 'me' || L.owner === 'bot' || !L.owner) {
      if (L.state === 'roll' || L.state === 'settle') {
        L.t += dt;
        if (L.state === 'roll') {
          const steer = L.owner === 'me' ? ((keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0)) : 0;
          simChair(L, dt, steer);
          if (Math.hypot(L.vx, L.vz) < .6 || L.cx >= END_X - .35 || L.t > 6) { L.state = 'settle'; L.t = 0; }
        }
        const mv = simPins(L, dt);
        if (L.state === 'settle' && (L.t > 2.2 || (mv === 0 && L.t > .8))) laneRollDone(L);
      } else simPins(L, dt);
      if (L.owner === 'bot') botTick(L, dt);
    }
    if (L.chair) { L.chair.position.set(L.cx, 0, L.cz); L.chair.rotation.y = Math.PI / 2 + (L.state === 'roll' ? Math.sin(t * 9) * .15 : 0); L.chair.visible = !!L.owner; }
    drawPins(L, t);
    if (L.owner === 'net' && (L.remoteT -= dt) < -20) { L.owner = null; L.state = 'idle'; }
  }
  if (BW.seated) {
    const L = LN[BW.lane];
    // сиджу в кріслі: камера й персонаж їдуть разом із ним
    pl.x = L.cx; pl.z = L.cz; pl.y = 0; pl.face = Math.PI / 2; pl.atkCd = Math.max(pl.atkCd, .3);
    pl.emote = 'sit'; pl.emoteT = 1;
    if (hero) { hero.root.position.set(pl.x, .35, pl.z); hero.root.rotation.y = pl.face; }
    if (L.state === 'wait' && !M.on) { M.waitT -= dt; if (M.waitT <= 0) startMatch(BW.lane, null); }
    if (L.state === 'aim') { L.t += dt; BW.aimT = L.t; }
    // прицільна стрілка й шкала сили
    if (!BW.arrow) { BW.arrow = new THREE.Group(); const sh = mesh(new THREE.BoxGeometry(3, .04, .12), bulb('#FFE066'), false); sh.position.x = 1.5; BW.arrow.add(sh); const hd = mesh(new THREE.ConeGeometry(.22, .5, 3), bulb('#FFE066'), false); hd.rotation.z = -Math.PI / 2; hd.position.x = 3.2; BW.arrow.add(hd); scene.add(BW.arrow); }
    BW.arrow.visible = L.state === 'aim'; BW.arrow.position.set(L.cx + .5, .2, L.cz); BW.arrow.rotation.y = -aimAngle(L.t);
    if (BW.charge >= 0) { BW.charge += dt; BW.arrow.scale.x = .4 + power(BW.charge) * 1.2; } else BW.arrow.scale.x = 1;
    // «Веселковий чай»: веселкова аура й трохи психоделіки
    if (!BW.aura) { BW.aura = new THREE.Mesh(new THREE.TorusGeometry(.95, .09, 8, 40), new THREE.MeshBasicMaterial({ color: '#FF6BD6', transparent: true, opacity: .85, depthWrite: false })); scene.add(BW.aura); }
    BW.aura.visible = true; BW.aura.position.set(pl.x, 1.4, pl.z); BW.aura.rotation.set(Math.PI / 2 + Math.sin(t * 2) * .2, 0, t * 2);
    BW.aura.material.color.setHSL((t * .6) % 1, .9, .65); BW.aura.scale.setScalar(1 + Math.sin(t * 6) * .08);
    if (Math.random() < dt * 10) burst(pl.x + rand(-.6, .6), 1.4 + rand(0, .6), pl.z + rand(-.6, .6), `hsl(${Math.floor(Math.random() * 360)},90%,70%)`, 1, .5, .6, .4);
    if (typeof cv !== 'undefined') cv.style.filter = `hue-rotate(${Math.round(Math.sin(t * .8) * 28)}deg) saturate(1.3)`;
    if (L.owner === 'me' && (BW.sendT -= dt) <= 0) { BW.sendT = L.state === 'roll' || L.state === 'settle' ? .1 : 1; netLane(L); }
  } else {
    if (BW.aura) BW.aura.visible = false; if (BW.arrow) BW.arrow.visible = false;
  }
  drawBoard(); hud();
  if (!BW.seated && typeof cv !== 'undefined' && cv.style.filter && !inBowl(pl.x, pl.z)) cv.style.filter = '';
});
/* камера: поки сидиш у кріслі — видно всю доріжку й кеглі, під час кидка — летить за кріслом */
const _cT = SIMSIDE ? null : new THREE.Vector3(), _cL = SIMSIDE ? null : new THREE.Vector3();
if (!SIMSIDE && typeof updCamera === 'function') {
  const _updCamera = updCamera;
  updCamera = function (dt) {
    if (!running || !BW.seated) return _updCamera.apply(this, arguments);
    const L = LN[BW.lane], rolling = L.state === 'roll' || L.state === 'settle';
    const fx = rolling ? clamp(L.cx + 6, START_X + 9, HEAD_X) : (START_X + HEAD_X) / 2 + 1.5, k = innerWidth < innerHeight ? 1.7 : 1;
    camPos.lerp(_cT.set(fx, 19.5 * k, IZ + 17 * k), 1 - Math.exp(-dt * 2.5)); camLook.lerp(_cL.set(fx, .3, IZ - .5), 1 - Math.exp(-dt * 3));
    camera.position.copy(camPos);
    if (shake > 0) { shake = Math.max(0, shake - dt); camera.position.x += (Math.random() - .5) * shake; camera.position.y += (Math.random() - .5) * shake; }
    camera.lookAt(camLook);
    sun.position.set(camLook.x + 14, 30, camLook.z + 9); sun.target.position.set(camLook.x, 0, camLook.z);
  };
}
/* персонаж не ходить, поки сидить у кріслі */
const _updInput = updInput;
updInput = function () { _updInput.apply(this, arguments); if (BW.seated) { input.mx = 0; input.mz = 0; } };

/* ---------- Керування: пробіл / ЛКМ — затиснути й відпустити ---------- */
function chargeStart() { const L = BW.seated && LN[BW.lane]; if (!L || L.state !== 'aim' || BW.charge >= 0) return false; BW.charge = 0; sfx('charge'); return true; }
function chargeRelease() {
  const L = BW.seated && LN[BW.lane]; if (!L || BW.charge < 0) return;
  const pw = power(BW.charge); BW.charge = -1;
  if (L.state === 'aim') { launch(L, aimAngle(L.t), pw); ftext(pl.x, 2.6, pl.z, pw > .85 ? 'НА ПОВНУ! 🍵' : pw < .25 ? 'Ледь-ледь…' : 'Поїхали!', 'crit'); }
}
A.key('Space', () => { if (!BW.seated) return false; chargeStart(); });
if (!SIMSIDE) {
  addEventListener('keyup', e => { if (e.code === 'Space') chargeRelease(); });
  addEventListener('pointerdown', e => { if (BW.seated && typeof cv !== 'undefined' && e.target === cv && e.button === 0) { if (chargeStart()) { e.stopPropagation(); } } }, true);
  addEventListener('pointerup', e => { if (BW.seated && BW.charge >= 0) chargeRelease(); }, true);
}

/* ---------- F: сісти / встати ---------- */
const _getInteract = getInteract;
getInteract = function () {
  if (!SIMSIDE && running && !pl.dead && inBowl(pl.x, pl.z)) {
    if (BW.seated) return { l: M.on ? '🏳️ Встати (здатися)' : '🪑 Встати з крісла', fn: () => standUp() };
    for (const L of LN) if (dist2(pl.x, pl.z, START_X, L.z) < 2.2 && !pl.carry) {
      if (L.owner === 'net') return { l: `Доріжка зайнята: ${L.name}`, fn: () => { } };
      return { l: `🍵 Сісти в ${BW.kind === 'cart' ? 'візок' : 'крісло'} й випити «Веселковий чай» (доріжка ${L.i + 1})`, fn: () => sitDown(L.i) };
    }
  }
  return _getInteract.apply(this, arguments);
};

/* ---------- HUD ---------- */
function hud() {
  if (!BW.hud) { BW.hud = document.createElement('div'); BW.hud.id = 'bowl-hud'; BW.hud.style.cssText = 'position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 64px);transform:translateX(-50%);z-index:2;pointer-events:none;background:rgba(46,35,70,.85);color:#fff;border-radius:14px;padding:7px 14px;font:700 13px/1.4 system-ui,sans-serif;text-align:center;box-shadow:0 6px 18px rgba(0,0,0,.25);white-space:nowrap'; document.body.appendChild(BW.hud); }
  const show = running && !pl.dead && !panel && inBowl(pl.x, pl.z);
  BW.hud.style.display = show ? '' : 'none'; if (!show) return;
  let h;
  if (BW.seated) {
    const L = LN[BW.lane], s = L.side;
    const sc = M.sides.map(x => `${x.lane === BW.lane ? '🟣' : '🔵'} ${escapeHTML(x.name)} <b style="color:#FFE066">${totalOf(x)}</b>`).join(' &nbsp;·&nbsp; ');
    const what = L.state === 'wait' ? `чекаю суперника… ${Math.max(0, Math.ceil(M.waitT))}` : L.state === 'aim' ? (BW.charge >= 0 ? `сила: ${'▮'.repeat(Math.round(power(BW.charge) * 10))}${'▯'.repeat(10 - Math.round(power(BW.charge) * 10))}` : 'затисни ПРОБІЛ або ЛКМ — сила, відпусти — поїхали') : L.state === 'roll' ? 'A/D — підрулити!' : L.state === 'done' ? 'чекаємо суперника…' : '…';
    h = `🎳 ${s ? `Фрейм ${Math.min(FRAMES, s.frame + 1)}/${FRAMES}${s.frame === FRAMES - 1 ? ` · кидок ${s.ball + 1}` : s.ball ? ' · другий кидок' : ''}` : 'Боулінг'} &nbsp; ${sc}<br><span style="font-weight:600;font-size:12px">${what} · F — встати</span>`;
  } else h = `🎳 Офісний боулінг · <span style="font-weight:600">підійди до старту доріжки й натисни F — сідай у крісло</span>`;
  if (BW.hud.innerHTML !== h) BW.hud.innerHTML = h;
}

/* ---------- Музика: фанк-диско для боулінгу ---------- */
const BPROG = [[45, [64, 67, 69, 72]], [43, [62, 65, 67, 71]], [41, [60, 64, 65, 69]], [43, [62, 65, 67, 71]]];   // Am7 · G7 · Fmaj7 · G7
if (!SIMSIDE && typeof scheduleStep === 'function') {
  const _ss = scheduleStep;
  scheduleStep = function (i, t) {
    if (!running || pl.dead || !inBowl(pl.x, pl.z) || typeof LAYER === 'undefined' || !LAYER.drums) { if (BW.music >= 0) { BW.music = -1; barMode = ''; } return _ss.apply(this, arguments); }
    const s = i % 16, bar = Math.floor(i / 16), [root, ch] = BPROG[bar % 4], h = STEP / 2, hot = M.on;
    if (s === 0 && BW.music !== (hot ? 1 : 0)) { BW.music = hot ? 1 : 0; const m = { keys: .8, bass: 1, drums: hot ? 1 : .75, tension: hot ? .3 : 0, lead: hot ? .4 : .2, crackle: .15 }; for (const k in m) if (LAYER[k]) LAYER[k].gain.setTargetAtTime(m[k], t, .5); }
    if (s % 4 === 0) kick(t, .85);
    if (s === 4 || s === 12) snare(t, .35);
    if (s % 4 === 2) hat(t, .06, true); else hat(t, .035);
    if (hot) hat(t + h, .025);
    const bl = [0, 12, 0, 12, 7, 12, 10, 12];
    if (s % 2 === 0) bassNote(t, root + bl[(s / 2) % 8], STEP * 1.2, .45);
    if (s === 2 || s === 7 || s === 10) ch.forEach((n, k) => epiano(t + k * .006, n, .35, .045, LAYER.keys));
    if (hot && [0, 3, 6, 10, 13].includes(s) && Math.random() < .7) leadNote(t, pick(ch) + 12, STEP * 1.2, .035);
    if (!hot && [5, 11].includes(s) && Math.random() < .5) marimba(t, pick(ch) + 12, .05);
  };
}

/* ---------- Вкладка, режим у паузі, картка в меню ---------- */
function goBowl() { const f = $('#fade'); closePanel(); if (f) f.style.opacity = 1; sfx('travel'); setTimeout(() => { pl.x = START_X - 2; pl.z = IZ; pl.y = 0; pl.falling = false; pl.jump = null; pl.safe = { x: pl.x, z: pl.z }; camPos.set(pl.x, 20, pl.z + 15); camLook.set(pl.x, .5, pl.z); if (f) f.style.opacity = 0; toast('🎳 Офісний боулінг! Підійди до старту доріжки й натисни F. Друг може сісти на сусідню.'); }, 260); return true; }
function leaveBowl() { if (BW.seated) { if (M.on && typeof confirm === 'function' && !confirm('Партія ще йде. Здатися й вийти?')) return false; standUp(); } return true; }
if (A.mode) A.mode({ id: 'bowling', ic: '🎳', n: 'Офісний боулінг', sub: 'крісло, «Веселковий чай» і зомбі-кеглі', go: goBowl, here: () => running && inBowl(pl.x, pl.z), leave: leaveBowl });
const TAB = A.tab('bowling', '🎳 Боулінг', () => {
  const d = A.data(), here = inBowl(pl.x, pl.z);
  return `<h3>🎳 Офісний боулінг</h3>
    <p style="font-size:13px;line-height:1.5;margin:4px 0 10px">Сідаєш у крісло, п'єш «Веселковий чай» і летиш доріжкою в десятьох зомбі-офісників. Вибий страйк і переможи друга (або бота Кента).</p>
    <div class="btns">${here ? '' : '<button class="btn" data-bw="go">🎳 До доріжок</button>'}
      <button class="btn ${BW.kind === 'chair' ? '' : 'alt'}" data-bw="chair">🪑 Офісне крісло</button><button class="btn ${BW.kind === 'cart' ? '' : 'alt'}" data-bw="cart">🛒 Візок</button></div>
    <div class="list" style="margin-top:10px;font-size:13px;line-height:1.55">
      <div>🪑 <b>F</b> біля старту доріжки — сісти. Чекаєш 8 с на суперника (друг сідає на сусідню доріжку), інакше — бот Кент.</div>
      <div>🍵 <b>Пробіл / ЛКМ</b>: затисни — шкала сили гойдається, відпусти — поїхав. Напрямок гойдається сам — це чай!</div>
      <div>↔️ <b>A / D</b> — трохи підрулити вже в дорозі. Вилетів у жолоб — мимо.</div>
      <div>🎳 5 фреймів за правилами боулінгу: страйк (усі 10 з першого) — +10 і два наступні кидки, спер — +наступний кидок.</div>
    </div>
    <p class="muted" style="font-size:12px;margin-top:10px">Ігор: ${d.games || 0} · перемог: ${d.wins || 0} · рекорд: ${d.best || 0} · страйків: ${d.strikes || 0}. Перемога — 80 🪙, нічия — 40, поразка — 20, кожен страйк +10.</p>`;
}, e => {
  const b = e.target.closest('[data-bw]'); if (!b) return;
  const a = b.dataset.bw;
  if (a === 'go') goBowl(); else { BW.kind = a; if (BW.seated) laneChair(LN[BW.lane], a); renderPanel(); }
});
if (!SIMSIDE && typeof document !== 'undefined') {
  const box = document.querySelector('#main-menu .mm-container');
  if (box && !document.getElementById('mm-bowling')) {
    const card = document.createElement('div'); card.className = 'mm-card'; card.id = 'mm-bowling';
    card.innerHTML = `<div class="mm-img-wrap"><div class="mm-card-img" style="background-image:url('menu/bowling-bg.jpg'),url('addons/bowling/bowling-bg.jpg');background-color:#3a2c5c"></div></div>
      <div class="mm-card-body"><h2>БОУЛІНГ</h2><div class="mm-subtitle">Офісний страйк</div>
      <div class="mm-desc">Крісло, «Веселковий чай» і зомбі-кеглі. Вибий страйк і переможи друга!</div></div>`;
    const locked = [...box.children].filter(c => c.classList.contains('mm-locked')).pop();
    box.insertBefore(card, locked || null);
    const css = document.createElement('style');
    css.textContent = '#main-menu .mm-container.mm-5.mm-5{flex-wrap:nowrap;gap:clamp(8px,1.2vw,20px)}#main-menu .mm-container.mm-5.mm-5 .mm-card{width:clamp(140px,17vw,250px);height:clamp(280px,32vw,420px)}#main-menu .mm-container.mm-5.mm-5 .mm-card-body h2{font-size:clamp(1.2rem,2.2vw,2.1rem)}@media (max-width:760px){#main-menu .mm-container.mm-5.mm-5{flex-wrap:wrap;overflow:auto;max-height:100%}#main-menu .mm-container.mm-5.mm-5 .mm-card{width:42vw;height:56vw}}';
    document.head.appendChild(css);
    const fit = () => { const n = box.querySelectorAll('.mm-card').length; box.classList.toggle('mm-5', n >= 5); };
    fit(); A.on('world', fit);   // інші аддони теж можуть додати картки
    card.addEventListener('click', () => {
      BW.auto = true; if (running) goBowl();
      const mm = document.getElementById('main-menu'); if (mm) { mm.classList.add('mm-hide'); mm.addEventListener('transitionend', () => mm.remove(), { once: true }); }
    });
  }
}
A.on('start', () => { if (BW.auto && !SIMSIDE) setTimeout(goBowl, 700); });
if (window.__ADDON_TEST) window.__bowl = { BW, LN, M, scoreOf, frameMarks, sitDown, standUp, chargeStart, chargeRelease };
