/* Аддон «Нічна зміна» (Night Shift): кооперативний хорор-комедія на 1–4 гравці.
   Темний офіс уночі: опенспейс, кухня, кабінет начальника, коридор, вестибюль, архів і електрощитова.
   - У кожного 🔦 ліхтарик (L — увімкнути/вимкнути). Батарейка сідає — шукай нові 🔋 по офісу.
   - Зомбі-офісники бродять у темряві. Посвітиш на них — завмирають («поки на мене дивляться — я не рухаюсь»).
     Відвернешся — підкрадаються. Схопили — ти лежиш; друзі піднімають (F поруч, 3 с).
   - «Нічний прибиральник» полює на звук: біг гучний, крадькома (тримай Z) — тихо. Сховайся в шафі (F).
   - Мета: дожити до 06:00 (≈5,5 хв) АБО втекти раніше: знайди 🔑 картку (лежить в одному з кількох місць),
     прочитай 📝 стікер з порядком запобіжників, відчини електрощитову, увімкни три рубильники в правильному
     порядку — і біжи до вихідних дверей.
   - Лякалки: монітори самі вмикаються з «ДЕДЛАЙН», принтер друкує сам, дзвонить телефон, дзенькає ліфт.
   У спільному світі зміна одна на всіх: зомбі, прибиральника, картку, щиток і годинник рахує сервер.
   Картинку для картки в меню поклади поруч: addons/nightshift/nightshift-bg.jpg */
const A = Addon.info({ name: 'Нічна зміна', version: '1.0', desc: 'Кооп-хорор на 1–4: темний офіс, ліхтарик, зомбі, що рухаються лише в темряві, нічний прибиральник, картка, щиток і втеча до 06:00.' });

const SIMSIDE = !!window.__SIM;
const AUTH = () => SIMSIDE || !(typeof WORLD !== 'undefined' && WORLD.on);
const BX = 100, BZ = 150, ISL_R = 28, HX = 20, HZ = 16, WH = 1.3;   // центр будівлі, половини розмірів (40×32 м), висота стін (низькі — камера бачить кімнати)
const DUR = 330, LIGHT_R = 9.5, LIGHT_A = .42, DRAIN = .9;           // ніч 5,5 хв; ліхтарик: дальність, пів-кута, розряд %/с
const L = (x, z) => ({ x: BX + x, z: BZ + z });
const R = (x0, z0, x1, z1) => ({ x0: BX + Math.min(x0, x1), x1: BX + Math.max(x0, x1), z0: BZ + Math.min(z0, z1), z1: BZ + Math.max(z0, z1) });
const inB = (x, z) => Math.abs(x - BX) < HX && Math.abs(z - BZ) < HZ;
const inIsl = (x, z) => dist2(x, z, BX, BZ) < ISL_R + 1;
const wrapA = a => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };

/* ---------- План поверху (локальні координати від центру; північ = −z, вхід — на півдні) ----------
   ┌──────────────┬────────┬──────────────┐
   │              │Перего- │  Кабінет     │
   │  Опенспейс   │ворна   ├─────┬────────┤   z −16…−2
   │              │(скло)  │Копі │Приймал.│
   ├──────────────┴────────┴─────┴────────┤
   │               К О Р И Д О Р     ліфт │   z −2…2
   ├─────┬────────┬────────┬─────┬────────┤
   │Щито-│ Кухня  │        │Туа- │ Склад  │
   │ва   ├────────┤Вестибю-│лети ├───┬────┤   z 2…16
   │Архів│ Лаунж  │ль      │ IT-відділ│Сер-│
   └─────┴────────┴──EXIT──┴──────────┴вер┘ */
const WALLS = [], DOORS = [];
// стіна вздовж x (на висоті z) або вздовж z (на x); двері — центр або [центр, ширина, табличка]
function wall(horiz, at, a0, a1, doors = [], o = {}) {
  const ds = doors.map(d => Array.isArray(d) ? { c: d[0], w: d[1] || 1.8, n: d[2] || '' } : { c: d, w: 1.8, n: '' }).sort((p, q) => p.c - q.c);
  let a = a0;
  for (const d of [...ds, { c: a1, w: 0 }]) {
    const g0 = d.c - d.w / 2; if (g0 > a + .01) WALLS.push(Object.assign(horiz ? R(a, at - .15, g0, at + .15) : R(at - .15, a, at + .15, g0), o));
    a = d.c + d.w / 2;
    if (d.w) DOORS.push({ x: BX + (horiz ? d.c : at), z: BZ + (horiz ? at : d.c), h: horiz, w: d.w, n: d.n });
  }
}
const hw = (z, x0, x1, d, o) => wall(true, z, x0, x1, d, o), vw = (x, z0, z1, d, o) => wall(false, x, z0, z1, d, o);
hw(-16, -20, 20, [], { out: 1 }); hw(16, -20, 20, [[0, 3.2, '🚪 ВИХІД']], { out: 1 }); vw(-20, -16, 16, [], { out: 1 }); vw(20, -16, 16, [], { out: 1 });
hw(-2, -20, -3, [[-16, 1.8, '💻 Опенспейс'], [-7, 1.8, '💻 Опенспейс']]);
hw(-2, -3, 6, [[1.5, 1.8, '📊 Переговорна']], { glass: 1 });
hw(-2, 6, 20, [[9, 1.8, '🖨️ Копі-центр'], [16, 1.8, '📞 Приймальня']]);
hw(2, -20, 20, [[-17, 1.8, '⚡ Щитова'], [-9.5, 1.8, '☕ Кухня'], [0, 5], [8, 1.8, '🚻 WC'], [15.5, 1.8, '📦 Склад']]);
vw(-3, -16, -2); vw(6, -16, -2); vw(12, -9, -2);
hw(-9, 6, 12); hw(-9, 12, 20, [[16, 1.8, '👔 Начальник']], { glass: 1 });
vw(-14, 2, 16, [[12, 1.8, '🗄️ Архів']]); hw(8, -20, -14); hw(9, -14, -5, [[-9.5, 1.8, '🛋️ Лаунж']]);
vw(-5, 2, 16, [[10.5, 1.8, '🛋️ Лаунж']]); vw(5, 2, 16, [[10.5, 1.8, '🧑‍💻 IT']]);
hw(9, 5, 20, [[17, 1.8, '🖥️ Серверна']]); vw(11, 2, 9); vw(13, 9, 16);
const ELEC_D = R(-17.9, 1.85, -16.1, 2.15), EXIT_D = R(-1.6, 15.85, 1.6, 16.15);   // зачинені двері: щитова (картка) й вихід (струм)
const ROOMS = [
  { n: '💻 Опенспейс', x0: -20, x1: -3, z0: -16, z1: -2 }, { n: '📊 Переговорна', x0: -3, x1: 6, z0: -16, z1: -2 }, { n: '👔 Кабінет начальника', x0: 6, x1: 20, z0: -16, z1: -9 },
  { n: '🖨️ Копі-центр', x0: 6, x1: 12, z0: -9, z1: -2 }, { n: '📞 Приймальня', x0: 12, x1: 20, z0: -9, z1: -2 }, { n: '🚶 Коридор', x0: -20, x1: 20, z0: -2, z1: 2 },
  { n: '⚡ Електрощитова', x0: -20, x1: -14, z0: 2, z1: 8 }, { n: '🗄️ Архів', x0: -20, x1: -14, z0: 8, z1: 16 }, { n: '☕ Кухня', x0: -14, x1: -5, z0: 2, z1: 9 },
  { n: '🛋️ Лаунж', x0: -14, x1: -5, z0: 9, z1: 16 }, { n: '🛎️ Вестибюль', x0: -5, x1: 5, z0: 2, z1: 16 }, { n: '🚻 Туалети', x0: 5, x1: 11, z0: 2, z1: 9 },
  { n: '📦 Склад', x0: 11, x1: 20, z0: 2, z1: 9 }, { n: '🧑‍💻 IT-відділ', x0: 5, x1: 13, z0: 9, z1: 16 }, { n: '🖥️ Серверна', x0: 13, x1: 20, z0: 9, z1: 16 },
];
const roomAt = (x, z) => ROOMS.find(r => x - BX >= r.x0 && x - BX < r.x1 && z - BZ >= r.z0 && z - BZ < r.z1);
const HIDE_N = { cab: 'у шафі', wc: 'у кабінці туалету', desk: 'під столом' };
const roomN = p => { const r = p && roomAt(p.x, p.z); return r ? r.n : ''; };

/* меблі за планом: [тип, x, z, поворот, довжина]; поворот 0 — «обличчям» на +z (на південь) */
const P2 = Math.PI / 2, PI = Math.PI;
const FURN_T = { desk: [1.6, .8], bdesk: [2.6, 1.1], mtable: [7, 1.6], ktable: [1.8, 1], sofa: [2.4, .9], ctable: [1.2, .6], shelf: [1.8, .45], locker: [1, .6], counter: [4, .7],
  fridge: [.8, .7], cooler: [.5, .5], plant: [.6, .6], copier: [1.2, .9], rack: [.8, 1], recep: [4.4, .8], panel: [3.6, .4], gen: [1.6, 1.2], part: [.1, 1.8], wc: [.5, .55], crate: [.8, .8], pallet: [1.6, 1.2], sdesk: [1.6, .8] };
const FURN_SOFT = { chair: 1, tv: 1, board: 1, bean: 1, lamp: 1 };   // крізь це ходять (або воно на стіні)
const FURN_L = [];
const F = (t, x, z, rot = 0, len = 0) => FURN_L.push([t, x, z, rot, len]);
// опенспейс: два ряди «островів» по 6 столів (спина до спини), шафки, кулер
const OS_X = [-18, -16.4, -14.8, -11, -9.4, -7.8], OS_ROW = [-13, -7.5];
for (const rz of OS_ROW) for (const x of OS_X) { F('desk', x, rz + .4, 0); F('desk', x, rz - .4, PI); }
F('locker', -3.45, -14.6, -P2); F('locker', -3.45, -13.4, -P2); F('locker', -3.45, -12.2, -P2);
F('cooler', -19.45, -3, 0); F('plant', -19.4, -15.4); F('plant', -3.6, -2.6); F('plant', -12.9, -15.4); F('board', -12.9, -15.8, 0, 2.4); F('shelf', -19.6, -9.6, P2, 2.4);
// переговорна: довгий стіл, крісла, телевізор, дошка
F('mtable', 1.5, -9.5, P2, 7); for (let z = -12.4; z <= -6.6; z += 1.45) { F('chair', -.05, z, P2); F('chair', 3.05, z, -P2); } F('chair', 1.5, -13.7, 0);
F('tv', 1.5, -15.8, 0, 2.6); F('board', -2.85, -9.5, P2, 2.4); F('plant', 5.4, -15.4); F('plant', -2.4, -15.4); F('plant', 5.4, -2.6, 0);
// кабінет начальника: великий стіл, шкіряне крісло, полиця, диван, кавовий столик, шафа
F('bdesk', 14, -13, PI); F('shelf', 14, -15.6, 0, 3); F('sofa', 8.7, -12.5, -P2, 2.4); F('ctable', 7.3, -12.5, P2); F('locker', 19.45, -11.8, -P2);
F('plant', 6.7, -15.3); F('plant', 19.3, -15.3); F('plant', 11.5, -9.7); F('tv', 6.2, -12.5, P2, 1.8);
// копі-центр і приймальня
F('copier', 9, -8.2, 0); F('shelf', 6.4, -5.5, P2, 2); F('crate', 11.4, -8.4); F('plant', 11.5, -2.7);
F('sdesk', 18.2, -5.5, -P2); F('chair', 19.1, -5.5, -P2); F('sofa', 13.2, -5.5, P2, 2.4); F('cooler', 12.6, -8.5); F('plant', 19.4, -8.4);
// коридор
F('plant', -19.4, -1.4); F('plant', 19.4, 1.55); F('plant', -2.9, -1.5); F('plant', 6.1, 1.5);
// електрощитова: шафа з рубильниками й генератор
F('panel', -19.8, 5.2, P2); F('gen', -15.2, 6.9, 0);
// архів: стелажі з теками, шафа
F('shelf', -19.6, 12, P2, 6); F('shelf', -17, 12.4, P2, 5); F('shelf', -16.55, 12.4, -P2, 5); F('locker', -14.45, 15, -P2); F('crate', -15, 9);
// кухня: стільниця з кавоваркою, холодильник, стіл, кулер
F('counter', -13.5, 4.85, P2, 4.5); F('fridge', -13.45, 8.2, P2); F('ktable', -9, 5.5, 0);
for (const x of [-9.5, -8.5]) { F('chair', x, 4.45, 0); F('chair', x, 6.55, PI); } F('cooler', -5.5, 2.6); F('plant', -5.5, 8.4);
// лаунж: диван перед телевізором, столик, крісла-мішки
F('sofa', -9.5, 12.6, 0, 2.6); F('ctable', -9.5, 14, 0); F('tv', -9.5, 15.8, PI, 2.4); F('sofa', -13.4, 14.4, P2, 2); F('bean', -6.4, 13.2); F('bean', -6.6, 14.8); F('plant', -5.6, 15.4); F('plant', -13.4, 9.6); F('lamp', -12.5, 15.4);
// вестибюль: рецепція, диван для гостей, рослини
F('recep', 0, 8, 0); F('chair', 0, 7.2, PI); F('sofa', -4.4, 13.5, P2, 2.4); F('plant', -4.4, 15.4); F('plant', 4.4, 15.4); F('plant', -4.4, 2.6); F('plant', 4.4, 2.6);
// туалети: кабінки й умивальники
for (const x of [6.8, 8.6, 10.4]) F('part', x, 7.95); for (const x of [5.95, 7.7, 9.5]) F('wc', x, 8.5); F('counter', 10.5, 4.4, -P2, 2.4);
// склад: стелажі, коробки, палета, шафа прибиральника
F('shelf', 19.6, 5, -P2, 4); F('crate', 12, 3); F('crate', 12.9, 3); F('crate', 12, 8.3); F('pallet', 14, 6.2); F('locker', 11.45, 6.3, P2);
// серверна: два ряди стійок
for (let x = 14.4; x <= 18.5; x += .8) { F('rack', x, 11.6); F('rack', x, 14.2); }
// IT-відділ: острів із 6 столів
for (const x of [8, 9.6, 11.2]) { F('desk', x, 13.7, 0); F('desk', x, 12.9, PI); } F('plant', 5.6, 15.4); F('plant', 12.4, 9.6);
/* прямокутник меблів (для ходіння, навігації й «сховатися за шафою»); поворот кратний 90° */
function furnRect([t, x, z, rot, len]) {
  const d = FURN_T[t]; if (!d) return null;
  let w = len || d[0], dd = d[1]; if (Math.abs(Math.sin(rot)) > .5) [w, dd] = [dd, w];
  return R(x - w / 2, z - dd / 2, x + w / 2, z + dd / 2);
}
const FURN = FURN_L.filter(f => !FURN_SOFT[f[0]]).map(furnRect).filter(Boolean);

/* ---------- Місця ---------- */
const SPAWN = L(0, 13.5), CLOCK = L(4.3, 13.5), EXIT = L(0, 15.2), ELEC = L(-17, 1.2);
const PANEL_X = BX - 19.6;   // лицьова площина щитка
const BREAKERS = [4, 5.2, 6.4].map((z, i) => Object.assign(L(-19.05, z), { c: ['#FF5C7A', '#7FE08A', '#6BB8FF'][i], ic: ['🔴', '🟢', '🔵'][i], n: ['червоний', 'зелений', 'синій'][i] }));
const CARD_SPOTS = [
  Object.assign(L(14, -11.6), { n: 'стіл начальника', ic: '💼' }), Object.assign(L(-12.5, 8.2), { n: 'холодильник', ic: '🧊' }),
  Object.assign(L(-9.4, -5.9), { n: 'шухляда в опенспейсі', ic: '🗄️' }), Object.assign(L(-18.3, 12), { n: 'полиця в архіві', ic: '📚' }),
  Object.assign(L(0, 6.9), { n: 'стійка рецепції', ic: '🛎️' }), Object.assign(L(8, 11.6), { n: 'стіл айтішника', ic: '🧑‍💻' }),
];
const NOTE_SPOTS = [
  Object.assign(L(-16.4, -11.5), { n: 'моніторі в опенспейсі', m: L(-16.4, -12.75), y: 1.18 }), Object.assign(L(-2, -9.5), { n: 'дошці в переговорній', m: L(-2.78, -9.5), y: 1.3, r: P2 }),
  Object.assign(L(9, -7.2), { n: 'ксероксі в копі-центрі', m: L(9, -7.85), y: 1.02 }),
];
const BAT_SPOTS = [[-12.9, -10], [-5, -5], [4.5, -4], [10.8, -3.2], [17.5, -10.5], [-11.5, 3.4], [-7, 15.2], [-18.3, 9.2], [3.6, 4.2], [7.7, 5.5], [16.5, 4], [16.5, 10.2], [7, 15.3], [-19, 0], [18.8, -1.2]].map(([x, z]) => L(x, z));
// схованки: шафи, кабінка в туалеті, під столом (s — де стати, b — де сидиш)
const CABS = [
  { s: L(-4.5, -14.6), b: L(-3.45, -14.6), k: 'cab' }, { s: L(18.4, -11.8), b: L(19.45, -11.8), k: 'cab' }, { s: L(7.7, 6.6), b: L(7.7, 7.8), k: 'wc' },
  { s: L(-15.5, 15), b: L(-14.45, 15), k: 'cab' }, { s: L(12.5, 6.3), b: L(11.45, 6.3), k: 'cab' }, { s: L(11.2, 11.6), b: L(11.2, 12.9), k: 'desk' },
  { s: L(-14.8, -10.6), b: L(-14.8, -12.6), k: 'desk' },
];
const MON_DESKS = [[-16.4, -12.6, 0], [-9.4, -12.6, 0], [-14.8, -7.9, PI], [-7.8, -7.1, 0], [9.6, 13.7, 0], [-18, -7.1, 0]];
const MONITORS = MON_DESKS.map(([x, z, r]) => L(x, z - Math.cos(r) * .22));
const PRINTER = L(9, -8.2), PHONE = L(14.8, -12.8), ELEV = L(19.3, 0);
const EN_SPAWN = [L(-13, -10), L(-5.5, -9), L(4.5, -14), L(10, -11.5), L(16, 5.5), L(16.5, 12.9), L(9, -5), L(-18.3, 10)];
const WAYS = [L(-13, -10), L(-5, -10), L(-17, -5), L(4.5, -10), L(-1.5, -14), L(9, -5), L(15, -3.5), L(10, -11), L(17.5, -14), L(-15, 0), L(-5, 0), L(5, 0), L(15, 0),
  L(-11, 3.6), L(-9.5, 10.5), L(-7, 15), L(-18.3, 10), L(-3.5, 5), L(3.5, 5), L(0, 11), L(7.7, 5), L(15, 4.5), L(16.5, 10.2), L(16.5, 12.9), L(8, 10.5), L(9, 15.2)];

/* ---------- Стан ночі ---------- */
const ST = { on: false, t: 0, dur: DUR, en: [], pl: {}, card: '', cs: CARD_SPOTS.map(() => 0), note: 0, noteAt: 0, ord: null, edoor: 0, fz: 0, power: 0, exit: 0, bats: [] };
const AU = { cardAt: 0, order: [0, 1, 2], eid: 0, calm: 0, spawnT: 40, scareT: 25, cleanAt: 50, stT: 0, idle: 0, noise: [], inp: {}, sayT: 0 };
const myKey = () => (NET.on && typeof WORLD !== 'undefined' && WORLD.on ? myName() : 'me');
const keyOf = from => SIMSIDE ? String(from && from.name || '') : 'me';
const r2 = v => Math.round(v * 100) / 100;
const plS = k => ST.pl[k] || (ST.pl[k] = { b: 100, l: 1, d: 0, h: 0, a: 0, g: 0 });
function snap() {
  return { on: ST.on ? 1 : 0, t: r2(ST.t), dur: ST.dur, en: ST.en.map(e => [e.id, e.t, r2(e.x), r2(e.z), r2(e.face), (e.lit ? 1 : 0) | (e.st === 'chase' || e.st === 'hunt' ? 2 : 0) | (e.st === 'happy' ? 4 : 0) | (e.st === 'flee' ? 8 : 0)]),
    pl: Object.entries(ST.pl).map(([k, s]) => [k, Math.round(s.b), s.l ? 1 : 0, s.d ? 1 : 0, s.h | 0, r2(s.a), s.g > 0 ? 1 : 0]),
    cd: ST.card, cs: ST.cs, nt: ST.note, na: ST.noteAt, ord: ST.ord, ed: ST.edoor, fz: ST.fz, pw: ST.power, ex: ST.exit, bt: ST.bats };
}
function applySnap(d) {
  Object.assign(ST, { on: !!d.on, t: +d.t || 0, dur: +d.dur || DUR, card: String(d.cd || ''), note: d.nt ? 1 : 0, noteAt: d.na | 0, ord: Array.isArray(d.ord) ? d.ord.slice(0, 3).map(v => v | 0) : null,
    edoor: d.ed ? 1 : 0, fz: d.fz | 0, power: d.pw ? 1 : 0, exit: d.ex ? 1 : 0 });
  if (Array.isArray(d.cs)) ST.cs = CARD_SPOTS.map((_, i) => d.cs[i] ? 1 : 0);
  if (Array.isArray(d.bt)) ST.bats = d.bt.filter(i => BAT_SPOTS[i]).map(i => i | 0);
  if (Array.isArray(d.en)) ST.en = d.en.slice(0, 12).map(a => ({ id: a[0], t: a[1] ? 1 : 0, x: +a[2], z: +a[3], face: +a[4], lit: a[5] & 1 ? 1 : 0, st: a[5] & 4 ? 'happy' : a[5] & 8 ? 'flee' : a[5] & 2 ? 'chase' : 'wander' }));
  if (Array.isArray(d.pl)) { const o = {}; for (const a of d.pl.slice(0, 8)) o[String(a[0])] = { b: +a[1], l: a[2] ? 1 : 0, d: a[3] ? 1 : 0, h: a[4] | 0, a: +a[5], g: a[6] ? 1 : 0 }; ST.pl = o; }
}
function pushState() { if (SIMSIDE) A.send('st', snap()); }
function emit(e) { if (SIMSIDE) A.send('ev', e); else onEvent(e); }
function req(k, d) { const o = Object.assign({ k }, d || {}); if (AUTH()) onReq(o, { id: NET.id, name: myName() }); else A.send('rq', o); }
A.onNet('st', (d, from) => { if (!SIMSIDE && !AUTH() && from.id === -1 && d) applySnap(d); });
A.onNet('ev', (d, from) => { if (!SIMSIDE && !AUTH() && from.id === -1 && d) onEvent(d); });
A.onNet('rq', (d, from) => { if (SIMSIDE && d) onReq(d, from); });

/* ---------- Сітка для пошуку шляху й перевірка «чи видно» ---------- */
const CS = .5, NC = HX * 4, NR = HZ * 4, GX0 = BX - HX, GZ0 = BZ - HZ;
const N8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
let GRID = null, GKEY = '', SOL = [];
const FIELDS = new Map();
function solids() { grid(); return SOL; }
function grid() {
  const k = (ST.edoor ? 1 : 0) + '' + (ST.exit ? 1 : 0); if (GRID && GKEY === k) return GRID;
  GKEY = k; FIELDS.clear(); SOL = WALLS.concat(ST.edoor ? [] : [ELEC_D], ST.exit ? [] : [EXIT_D]);
  GRID = new Uint8Array(NC * NR); const rs = SOL.concat(FURN), m = .32;
  for (let j = 0; j < NR; j++) for (let i = 0; i < NC; i++) { const x = cxOf(j * NC + i), z = czOf(j * NC + i); if (rs.some(r => x > r.x0 - m && x < r.x1 + m && z > r.z0 - m && z < r.z1 + m)) GRID[j * NC + i] = 1; }
  return GRID;
}
function cellOf(x, z) { const i = Math.floor((x - GX0) / CS), j = Math.floor((z - GZ0) / CS); return i < 0 || j < 0 || i >= NC || j >= NR ? -1 : j * NC + i; }
function cxOf(c) { return GX0 + (c % NC + .5) * CS; }
function czOf(c) { return GZ0 + (Math.floor(c / NC) + .5) * CS; }
function freeNear(c) {
  const g = grid(); if (c < 0) return -1; if (!g[c]) return c;
  const seen = new Uint8Array(NC * NR), q = [c]; seen[c] = 1;
  for (let h = 0; h < q.length && h < 600; h++) { const a = q[h]; if (!g[a]) return a; const i = a % NC, j = Math.floor(a / NC); for (const [di, dj] of N8) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= NC || jj >= NR) continue; const n = jj * NC + ii; if (!seen[n]) { seen[n] = 1; q.push(n); } } }
  return -1;
}
/* поле відстаней до клітинки (хвиля), кешується до зміни дверей */
function field(tc) {
  let F = FIELDS.get(tc); if (F) return F;
  if (FIELDS.size > 60) FIELDS.clear();
  const g = grid(); F = new Int16Array(NC * NR).fill(-1); F[tc] = 0; const q = [tc];
  for (let h = 0; h < q.length; h++) { const a = q[h], i = a % NC, j = Math.floor(a / NC); for (let k = 0; k < 4; k++) { const [di, dj] = N8[k], ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= NC || jj >= NR) continue; const n = jj * NC + ii; if (g[n] || F[n] >= 0) continue; F[n] = F[a] + 1; q.push(n); } }
  FIELDS.set(tc, F); return F;
}
function segHit(x0, z0, x1, z1, r) {
  let t0 = 0, t1 = 1; const dx = x1 - x0, dz = z1 - z0;
  for (const [p, d, lo, hi] of [[x0, dx, r.x0, r.x1], [z0, dz, r.z0, r.z1]]) {
    if (Math.abs(d) < 1e-9) { if (p < lo || p > hi) return false; }
    else { let a = (lo - p) / d, b = (hi - p) / d; if (a > b) [a, b] = [b, a]; t0 = Math.max(t0, a); t1 = Math.min(t1, b); if (t0 > t1) return false; }
  }
  return true;
}
function los(x0, z0, x1, z1, furn, solid) {   // скло пропускає погляд і світло, але не пропускає тіло (solid)
  for (const r of solids()) if ((solid || !r.glass) && segHit(x0, z0, x1, z1, r)) return false;
  if (furn) for (const r of FURN) if (segHit(x0, z0, x1, z1, r)) return false;
  return true;
}
/* крок ворога до цілі: впритул і на видноті — напряму, інакше — по хвилі */
function stepTo(e, tx, tz, spd, dt) {
  let gx = tx, gz = tz;
  if (!(dist2(e.x, e.z, tx, tz) < 3 && los(e.x, e.z, tx, tz, true, true))) {
    const g = grid(); const tc = freeNear(cellOf(tx, tz)); let c = cellOf(e.x, e.z); if (tc < 0 || c < 0) return false;
    if (g[c]) { const f = freeNear(c); if (f < 0) return false; gx = cxOf(f); gz = czOf(f); }
    else {
      const F = field(tc); if (F[c] < 0) return false;
      let best = c, bd = F[c]; const i = c % NC, j = Math.floor(c / NC);
      for (const [di, dj] of N8) {
        const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= NC || jj >= NR) continue; const n = jj * NC + ii;
        if (g[n] || F[n] < 0 || (di && dj && (g[j * NC + ii] || g[jj * NC + i]))) continue;
        const v = F[n] - (di && dj ? .5 : 0); if (v < bd) { bd = v; best = n; }
      }
      if (best !== c) { gx = cxOf(best); gz = czOf(best); }
    }
  }
  const dx = gx - e.x, dz = gz - e.z, l = Math.hypot(dx, dz);
  if (l > 1e-3) { const s = Math.min(l, spd * dt); e.x += dx / l * s; e.z += dz / l * s; e.face = Math.atan2(dx, dz); }
  return true;
}

/* ---------- Логіка ночі (сервер світу або сам гравець) ---------- */
function crew() {
  if (SIMSIDE) return simPlayers().filter(p => inIsl(p.x, p.z)).map(p => ({ k: String(p.name || ''), x: p.x, z: p.z }));
  return running && inIsl(pl.x, pl.z) ? [{ k: 'me', x: pl.x, z: pl.z }] : [];
}
function posOf(k) { if (!SIMSIDE) return pl; return simPlayers().find(p => String(p.name || '') === k) || null; }
const nearK = (k, o, r) => { const p = posOf(k); return !!p && dist2(p.x, p.z, o.x, o.z) < r; };
function onReq(d, from) {
  const k = keyOf(from), who = SIMSIDE ? escapeHTML(k) : 'Ти';
  if (d.k === 'start') { if (!ST.on && nearK(k, CLOCK, 3)) startNight(k); return; }
  if (d.k === 'in') { AU.inp[k] = { a: +d.a || 0, n: clamp(+d.n || 0, 0, 2), t: ST.t }; if (ST.pl[k]) ST.pl[k].a = wrapA(+d.a || 0); return; }
  if (!ST.on) return;
  const s = plS(k);
  if (d.k === 'light') { if (s.d) return; s.l = d.on && s.b > 0 ? 1 : 0; pushState(); return; }
  if (s.d && d.k !== 'hide') return;
  if (d.k === 'hide') {
    if (d.off) { if (s.h) { s.h = 0; pushState(); } return; }
    const i = d.i | 0; if (!CABS[i] || s.h || !nearK(k, CABS[i].s, 2.5)) return;
    if (Object.values(ST.pl).some(q => q.h === i + 1)) { emit({ k: 'msg', to: k, txt: '🚪 Ця шафа зайнята — там уже хтось сидить!' }); return; }
    s.h = i + 1; emit({ k: 'hid', who: k, i }); pushState();
  }
  else if (d.k === 'revive') {
    const t = ST.pl[String(d.who || '')]; if (!t || !t.d || s.h) return;
    if (!nearK(k, posOf(String(d.who)) || { x: 1e9, z: 1e9 }, 2.6)) return;
    t.d = 0; t.g = 3; t.l = t.b > 0 ? 1 : 0; emit({ k: 'revived', who: String(d.who), by: k }); pushState();
  }
  else if (d.k === 'bat') {
    const i = d.i | 0, at = ST.bats.indexOf(i); if (at < 0 || !nearK(k, BAT_SPOTS[i], 2.2)) return;
    ST.bats.splice(at, 1); s.b = Math.min(100, s.b + 60); s.l = 1; emit({ k: 'bat', who: k, i }); pushState();
  }
  else if (d.k === 'search') {
    const i = d.i | 0; if (!CARD_SPOTS[i] || ST.cs[i] || !nearK(k, CARD_SPOTS[i], 2.4)) return;
    ST.cs[i] = 1; AU.noise.push({ x: CARD_SPOTS[i].x, z: CARD_SPOTS[i].z, r: 5 });
    if (i === AU.cardAt && !ST.card) { ST.card = k; emit({ k: 'card', who: k, i }); } else emit({ k: 'empty', who: k, i });
    pushState();
  }
  else if (d.k === 'note') { if (!ST.note && nearK(k, NOTE_SPOTS[ST.noteAt], 2.4)) { ST.note = 1; ST.ord = AU.order.slice(); emit({ k: 'note', who: k, ord: ST.ord }); pushState(); } }
  else if (d.k === 'edoor') {
    if (ST.edoor || !nearK(k, ELEC, 3)) return;
    if (ST.card !== k) { emit({ k: 'msg', to: k, txt: ST.card ? `🔒 Картка в ${escapeHTML(ST.card)} — хай відчинить.` : '🔒 Зачинено. Потрібна 🔑 картка доступу.' }); return; }
    ST.edoor = 1; emit({ k: 'edoor', who: k }); pushState();
  }
  else if (d.k === 'fuse') {
    const i = d.i | 0; if (!ST.edoor || ST.power || !BREAKERS[i] || !nearK(k, BREAKERS[i], 2.2)) return;
    if (AU.order[ST.fz] === i) { ST.fz++; if (ST.fz >= 3) { ST.power = 1; emit({ k: 'power', who: k }); } else emit({ k: 'fuse', ok: 1, i, n: ST.fz }); }
    else { ST.fz = 0; AU.noise.push({ x: BREAKERS[i].x, z: BREAKERS[i].z, r: 22 }); emit({ k: 'fuse', ok: 0, i }); }
    pushState();
  }
  else if (d.k === 'exit') { if (ST.power && !ST.exit && nearK(k, EXIT, 3)) { ST.exit = 1; emit({ k: 'exit', who: k }); pushState(); } }
}
function startNight(k) {
  const c = crew();
  Object.assign(ST, { on: true, t: 0, dur: DUR, en: [], pl: {}, card: '', cs: CARD_SPOTS.map(() => 0), note: 0, ord: null, edoor: 0, fz: 0, power: 0, exit: 0 });
  ST.noteAt = Math.floor(Math.random() * NOTE_SPOTS.length);
  ST.bats = BAT_SPOTS.map((_, i) => i).sort(() => Math.random() - .5).slice(0, 4);
  const o = [0, 1, 2]; for (let i = 2; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; }
  Object.assign(AU, { cardAt: Math.floor(Math.random() * CARD_SPOTS.length), order: o, calm: 10, spawnT: rand(35, 50), scareT: rand(14, 22), cleanAt: 60, idle: 0, noise: [], inp: {}, sayT: 0 });
  for (const p of c) plS(p.k);
  const n = Math.min(7, 3 + c.length), sp = EN_SPAWN.slice().sort(() => Math.random() - .5);
  for (let i = 0; i < n; i++) addEnemy(0, sp[i % sp.length]);
  emit({ k: 'start', who: SIMSIDE ? k : '' }); pushState();
}
function addEnemy(t, p) {
  const c = freeNear(cellOf(p.x, p.z)); if (c < 0) return null;
  const e = { id: ++AU.eid, t, x: cxOf(c), z: czOf(c), face: Math.random() * 6.28, st: 'wander', wx: 0, wz: 0, timer: 0, lit: 0, litT: 0, tg: '', sayT: 0 };
  newWay(e); ST.en.push(e); return e;
}
function newWay(e) { const w = pick(WAYS); e.wx = w.x; e.wz = w.z; e.timer = rand(6, 12); }
function endNight(win, why, by) {
  if (!ST.on) return;
  ST.on = false;
  const res = { k: 'end', win: win ? 1 : 0, how: why || '', by: by || '', t: r2(ST.t), dur: ST.dur };
  ST.en = []; for (const s of Object.values(ST.pl)) { s.d = 0; s.h = 0; }
  emit(res); pushState();
}
function down(k, e) {
  const s = plS(k); if (s.d) return;
  s.d = 1; s.l = 0; s.h = 0; e.st = 'happy'; e.timer = 8; e.tg = '';
  emit({ k: 'down', who: k, by: e.t, x: r2(e.x), z: r2(e.z) });
  const c = crew(); if (c.length && c.every(p => plS(p.k).d)) endNight(false, c.length > 1 ? 'Усіх схопили… Зміна закінчилась раніше, ніж ви.' : 'Тебе схопили, і нікому підняти. Зміна провалена.');
}
/* хто світить на ворога: ліхтарик увімкнений, ворог у конусі й на видноті */
function litBy(e) {
  for (const c of crew()) {
    const s = ST.pl[c.k]; if (!s || !s.l || s.b <= 0 || s.d || s.h) continue;
    const d = dist2(c.x, c.z, e.x, e.z); if (d > LIGHT_R) continue;
    if (d > .6 && Math.abs(wrapA(Math.atan2(e.x - c.x, e.z - c.z) - s.a)) > LIGHT_A + .3 / d) continue;
    if (!los(c.x, c.z, e.x, e.z)) continue;
    return c.k;
  }
  return '';
}
function authTick(dt) {
  if (!ST.on) return;
  ST.t += dt;
  const c = crew();
  if (!c.length) { AU.idle += dt; if (AU.idle > (SIMSIDE ? 10 : 3)) endNight(false, 'В офісі нікого не лишилось.'); return; }
  AU.idle = 0;
  if (ST.t >= ST.dur) { endNight(true, 'survive'); return; }
  for (const p of c) {
    const s = plS(p.k);
    if (s.g > 0) s.g -= dt;
    if (s.l && !s.d && !s.h) { s.b = Math.max(0, s.b - DRAIN * dt); if (s.b <= 0) { s.l = 0; emit({ k: 'msg', to: p.k, txt: '🔦 Батарейка сіла! Шукай 🔋 — вони світяться в темряві.' }); } }
    const inp = AU.inp[p.k]; if (inp && ST.t - inp.t > 1.2) inp.n = 0;
  }
  if (ST.card && !c.some(p => p.k === ST.card)) { ST.card = ''; ST.cs[AU.cardAt] = 0; emit({ k: 'msg', txt: '🔑 Картка повернулась на місце — її власник пішов.' }); }
  if (AU.calm > 0) AU.calm -= dt;
  // ліфт привозить нових зомбі, прибиральник виходить на зміну
  AU.spawnT -= dt;
  if (AU.spawnT <= 0) { AU.spawnT = rand(35, 55); if (ST.en.filter(e => !e.t).length < Math.min(8, 4 + c.length)) { addEnemy(0, L(18.3, 0)); emit({ k: 'scare', what: 'elev', spawn: 1 }); } }
  if (ST.t >= AU.cleanAt && !ST.en.some(e => e.t)) { addEnemy(1, L(16, 5.5)); emit({ k: 'msg', big: 1, txt: '🧹 Нічний прибиральник вийшов зі складу на зміну. Він чує кроки — крадься (Z) і ховайся: шафа, кабінка, під стіл!' }); }
  AU.scareT -= dt;
  if (AU.scareT <= 0) {
    AU.scareT = rand(18, 30); const what = pick(['mon', 'mon', 'printer', 'phone', 'elev']);
    if (what === 'phone') AU.noise.push({ x: PHONE.x, z: PHONE.z, r: 30 });
    if (what === 'printer') AU.noise.push({ x: PRINTER.x, z: PRINTER.z, r: 14 });
    emit({ k: 'scare', what, i: Math.floor(Math.random() * MONITORS.length) });
  }
  const noise = AU.noise.splice(0);
  const prey = c.filter(p => { const s = plS(p.k); return !s.d && !s.h && !(s.g > 0); });
  for (const e of ST.en) {
    if (!ST.on) break;
    const lk = litBy(e); e.lit = lk ? 1 : 0;
    if (e.timer > 0) e.timer -= dt;
    if (e.sayT > 0) e.sayT -= dt;
    let near = null, nd = 1e9; for (const p of prey) { const d = dist2(p.x, p.z, e.x, e.z); if (d < nd) { nd = d; near = p; } }
    if (e.t === 0) {
      // зомбі: на світлі — завмирає; довго світять — тікає
      if (e.lit) { e.litT += dt; if (e.litT > 3 && e.st !== 'flee') { e.st = 'flee'; e.timer = 4; const w = WAYS.reduce((a, b) => dist2(b.x, b.z, e.x, e.z) > dist2(a.x, a.z, e.x, e.z) ? b : a); e.wx = w.x; e.wz = w.z; } continue; }
      e.litT = Math.max(0, e.litT - dt * .5);
      if (e.st === 'happy' || e.st === 'flee') { if (e.timer <= 0) e.st = 'wander'; else { stepTo(e, e.wx, e.wz, e.st === 'flee' ? 2.6 : 1, dt); continue; } }
      if (AU.calm <= 0 && near && (nd < 4 || (nd < 9 && los(e.x, e.z, near.x, near.z)))) { e.st = 'chase'; e.tg = near.k; }
      else if (e.st === 'chase' && (!near || nd > 13)) { e.st = 'wander'; newWay(e); }
      if (e.st === 'chase' && near) {
        stepTo(e, near.x, near.z, 3, dt);
        if (dist2(near.x, near.z, e.x, e.z) < .85) down(near.k, e);
      } else { if (e.timer <= 0 || dist2(e.x, e.z, e.wx, e.wz) < .6) newWay(e); if (!stepTo(e, e.wx, e.wz, 1.1, dt)) newWay(e); }
    } else {
      // прибиральник: чує шум, бачить зблизька, світла не боїться — лише сповільнюється
      const slow = e.lit ? .6 : 1;
      if (e.lit && e.sayT <= 0) { e.sayT = 6; emit({ k: 'say', id: e.id, txt: pick(['Не світи мені в очі!', 'Хто тут топче по мокрому?!', 'Я щойно помив!']) }); }
      if (e.st === 'happy') { if (e.timer <= 0) e.st = 'patrol'; else { stepTo(e, e.wx, e.wz, 1.2, dt); continue; } }
      if (near && nd < 4.5 && los(e.x, e.z, near.x, near.z) && AU.calm <= 0) { if (e.st !== 'chase') emit({ k: 'say', id: e.id, txt: 'ОСЬ ТИ ДЕ!' }); e.st = 'chase'; e.tg = near.k; }
      if (e.st !== 'chase') {
        for (const p of prey) { const n = (AU.inp[p.k] || {}).n || 0; if (n > .05 && dist2(p.x, p.z, e.x, e.z) < n * 13) { if (e.st !== 'hunt') emit({ k: 'say', id: e.id, txt: pick(['Хто там тупотить?', 'Чую-чую…', 'Знову натоптали!']) }); e.st = 'hunt'; e.wx = p.x; e.wz = p.z; e.timer = 7; } }
        for (const q of noise) if (dist2(q.x, q.z, e.x, e.z) < q.r) { e.st = 'hunt'; e.wx = q.x; e.wz = q.z; e.timer = 9; }
      }
      if (e.st === 'chase') {
        const t = prey.find(p => p.k === e.tg);
        if (!t || dist2(t.x, t.z, e.x, e.z) > 9) { e.st = 'hunt'; e.timer = 4; if (t) { e.wx = t.x; e.wz = t.z; } }
        else { stepTo(e, t.x, t.z, 4 * slow, dt); if (dist2(t.x, t.z, e.x, e.z) < 1) down(t.k, e); }
      } else if (e.st === 'hunt') { stepTo(e, e.wx, e.wz, 3.3 * slow, dt); if (e.timer <= 0 || dist2(e.x, e.z, e.wx, e.wz) < .6) { e.st = 'patrol'; newWay(e); } }
      else { if (e.timer <= 0 || dist2(e.x, e.z, e.wx, e.wz) < .6) newWay(e); if (!stepTo(e, e.wx, e.wz, 1.6 * slow, dt)) newWay(e); }
    }
  }
  // вороги не злипаються
  for (let i = 0; i < ST.en.length; i++) for (let j = i + 1; j < ST.en.length; j++) {
    const a = ST.en[i], b = ST.en[j], d = dist2(a.x, a.z, b.x, b.z);
    if (d < .7 && d > 1e-3) { const p = (.7 - d) / 2, dx = (b.x - a.x) / d, dz = (b.z - a.z) / d; if (!a.lit) { a.x -= dx * p; a.z -= dz * p; } if (!b.lit) { b.x += dx * p; b.z += dz * p; } }
  }
  // батарейки докидає «завгосп»
  if (ST.bats.length < 2 && Math.random() < dt / 20) { const free = BAT_SPOTS.map((_, i) => i).filter(i => !ST.bats.includes(i)); if (free.length) ST.bats.push(pick(free)); }
  // втеча: хтось вибіг крізь вихідні двері
  if (ST.exit) for (const p of c) if (p.z > BZ + HZ + .6 && Math.abs(p.x - BX) < 4 && !plS(p.k).d) { endNight(true, 'escape', p.k); return; }
  AU.stT -= dt; if (AU.stT <= 0) { AU.stT = .2; pushState(); }
}
A.on('tick', dt => {
  if (AUTH()) authTick(dt);
  else if (ST.on) ST.t += dt;
  if (!SIMSIDE) clientTick(dt);
});

/* ---------- Тверді стіни й меблі для рушія (і на сервері, і в гравця; двері щитової й виходу — окремо, бо відчиняються) ---------- */
function rectStatics(r, h) {
  const w = r.x1 - r.x0, d = r.z1 - r.z0, rad = clamp(Math.min(w, d) / 2, .15, .6), along = w >= d, len = along ? w : d;
  const n = Math.max(1, Math.ceil((len - rad * 2) / (rad * 1.6)) + 1);
  for (let k = 0; k < n; k++) { const t = n === 1 ? .5 : k / (n - 1), p = rad + t * Math.max(0, len - rad * 2); addStatic(along ? r.x0 + p : (r.x0 + r.x1) / 2, along ? (r.z0 + r.z1) / 2 : r.z0 + p, rad, h); }
}
A.on('world', () => {
  for (const w of WALLS) rectStatics(w, 2.5);
  for (const f of FURN) rectStatics(f, 1);
});

/* ======================= ДАЛІ — ЛИШЕ В ГРАВЦЯ ======================= */
A.island({ id: 'nightshift', n: 'Нічна зміна', sub: 'темний офіс · не вимикай ліхтарик', x: BX, z: BZ, r: ISL_R, top: '#4F7A57', rock: '#6F6A9A', biome: 'nightoffice', tier: 1, safe: true });
const _buildIsland = buildIsland;
buildIsland = function (s) { if (s.biome !== 'nightoffice') return _buildIsland.apply(this, arguments); return SIMSIDE ? new THREE.Group() : buildOfficeNight(s); };

const V = { en: new Map(), lbl: null, glbl: null, gArrow: null, gMark: null, goal: null, hud: null, goalEl: null, dark: null, spot: null, act: null, sendT: 0, joined: false, auto: false, lastP: null, fa: 0, noise: 0,
  monT: [0, 0, 0, 0], mons: [], printT: 0, phoneT: 0, elevT: 0, printer: null, phone: null, elev: [], edoorM: null, exitM: [], bats: [], note: null, lamps: [], brk: [], cabs: [], near: 99, music: -1, seenNote: new Set(), searchedFx: [] };
const amDown = () => { const s = ST.pl[myKey()]; return !!(ST.on && s && s.d); };
const amHid = () => { const s = ST.pl[myKey()]; return !!(ST.on && s && s.h); };
const mySt = () => ST.pl[myKey()] || null;

/* ---------- Модель: парковка, будівля, кімнати з меблями ---------- */
const WALL_C = '#D9D3EA', WALL_OUT = '#A9A2C6', WALL_TOP = '#8E86B0';
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext && c.getContext('2d'); if (x && x.fillText) draw(x, w, h);
  return new THREE.CanvasTexture(c);
}
function screenTex(txt, bg, fg) { return canvasTex(256, 160, (x) => { x.fillStyle = bg; x.fillRect(0, 0, 256, 160); x.fillStyle = fg; x.font = 'bold 44px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, 128, 82); }); }
/* табличка над дверима (видно лише там, куди світиш) */
function plate(txt, w = 1.5) {
  const t = canvasTex(320, 80, (x, W, H) => { x.fillStyle = '#2E2346'; x.fillRect(0, 0, W, H); x.strokeStyle = '#FFE066'; x.lineWidth = 6; x.strokeRect(3, 3, W - 6, H - 6); x.fillStyle = '#FFFFFF'; x.font = 'bold 34px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, W / 2, H / 2 + 2); });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 4), new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide })); m.rotation.x = -.45; return m;
}
function neonSign(txt, col, w, h) {
  const t = canvasTex(512, Math.round(512 * h / w), (x, W, H) => { x.strokeStyle = col; x.lineWidth = 10; x.shadowColor = col; x.shadowBlur = 24; x.strokeRect(10, 10, W - 20, H - 20); x.font = `bold ${Math.round(H * .55)}px sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#E8FFFF'; x.fillText(txt, W / 2, H / 2 + 4); });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
}
/* набір офісних меблів: кожен предмет — група в (x, z) з поворотом rot */
function officeKit(g) {
  const at = (o, x, z, rot) => { o.position.set(x, 0, z); o.rotation.y = rot || 0; g.add(o); return o; };
  const box = (o, w, h, d, c, x, y, z, cast = true) => put(o, mesh(new THREE.BoxGeometry(w, h, d), c, cast), x, y, z);
  const K = {
    // стіл із монітором, клавіатурою, системником і кріслом; сидять із боку +z, монітор на −z
    desk(x, z, rot, o2 = {}) {
      const o = new THREE.Group();
      box(o, 1.6, .07, .8, o2.top || '#E8DCC8', 0, .76, 0);
      for (const sx of [-.74, .74]) box(o, .06, .74, .74, '#9C8C78', sx, .37, 0);
      box(o, 1.5, .4, .04, '#C9BBA2', 0, .5, -.36);
      box(o, .72, .44, .05, '#2E2346', 0, 1.1, -.22); box(o, .64, .36, .02, '#26304A', 0, 1.1, -.19, false);
      box(o, .08, .16, .08, '#2E2346', 0, .87, -.22);
      box(o, .5, .03, .16, '#4E4A6E', 0, .8, .08, false); box(o, .1, .03, .14, '#4E4A6E', .38, .8, .1, false);
      box(o, .22, .44, .46, '#3E3A5C', .6, .22, -.1);
      if (wr() < .5) put(o, mesh(flat(new THREE.CylinderGeometry(.06, .05, .12, 8)), ['#FFFFFF', '#FF6BD6', '#FFE066'][Math.floor(wr() * 3)]), -.5, .85, .1);
      if (wr() < .4) box(o, .3, .06, .22, '#FFFFFF', -.25, .82, -.05, false);
      if (o2.chair !== false) { const ch = bodyMesh('chair'); ch.position.set((wr() - .5) * .2, 0, .75); ch.rotation.y = PI + (wr() - .5) * .5; o.add(ch); }
      return at(o, x, z, rot);
    },
    chair(x, z, rot) { return at(bodyMesh('chair'), x, z, rot); },
    table(x, z, rot, w, d, col = '#C4956A', h = .75) { const o = new THREE.Group(); box(o, w, .08, d, col, 0, h, 0); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(o, .08, h - .03, .08, '#4E4A6E', a * (w / 2 - .12), (h - .03) / 2, b * (d / 2 - .12)); return at(o, x, z, rot); },
    sofa(x, z, rot, len = 2.4, col = '#8F7BD6', cush = '#B7A6EA') {
      const o = new THREE.Group();
      box(o, len, .42, .9, col, 0, .21, 0); box(o, len, .55, .25, col, 0, .55, -.33);
      for (const s of [-1, 1]) box(o, .22, .6, .9, col, s * (len / 2 - .11), .3, 0);
      const n = Math.max(1, Math.round((len - .44) / .75)); for (let k = 0; k < n; k++) box(o, (len - .5) / n - .05, .12, .6, cush, -len / 2 + .25 + (k + .5) * (len - .5) / n, .47, .05, false);
      return at(o, x, z, rot);
    },
    plant(x, z, big) { const o = new THREE.Group(); put(o, mesh(flat(new THREE.CylinderGeometry(.28, .22, .45, 8)), '#C4956A'), 0, .22, 0); put(o, mesh(flat(new THREE.IcosahedronGeometry(big ? .7 : .5, 0)), '#5FAF6B'), 0, big ? 1.05 : .8, 0); if (big) put(o, mesh(flat(new THREE.IcosahedronGeometry(.45, 0)), '#4F9F5B'), .15, 1.55, .1); return at(o, x, z, 0); },
    cooler(x, z) { const o = new THREE.Group(); box(o, .5, 1, .5, '#E9E2FA', 0, .5, 0); put(o, mesh(flat(new THREE.CylinderGeometry(.22, .22, .5, 10)), mat('#8FD3FF', { transparent: true, opacity: .8 })), 0, 1.25, 0); return at(o, x, z, 0); },
    shelf(x, z, rot, w = 1.8, h = 1.8) {
      const o = new THREE.Group(); box(o, w, h, .45, '#9C8C78', 0, h / 2, 0);
      const cols = ['#E0607E', '#6BB8FF', '#FFE066', '#7FE08A', '#B07CF0', '#F2A65A', '#FFFFFF'], n = Math.max(2, Math.round(w / .36));
      for (let y = 0; y < Math.floor(h / .45); y++) for (let k = 0; k < n; k++) if (wr() < .85) box(o, w / n - .05, .32, .36, cols[Math.floor(wr() * cols.length)], -w / 2 + (k + .5) * w / n, .25 + y * .43, .06, false);
      return at(o, x, z, rot);
    },
    locker(x, z, rot) { const o = new THREE.Group(); box(o, 1, 2, .6, '#7E77A0', 0, 1, 0); box(o, .03, 1.8, .02, '#4E4A6E', 0, 1, .31, false); for (const sx of [-.12, .12]) box(o, .05, .2, .04, '#FFD27A', sx, 1.05, .32, false); for (const sx of [-.3, .3]) for (const y of [1.7, 1.6]) box(o, .25, .02, .02, '#4E4A6E', sx, y, .31, false); return at(o, x, z, rot); },
    counter(x, z, rot, w = 4, sink = true) {
      const o = new THREE.Group();
      box(o, w, .9, .7, '#FFFFFF', 0, .45, 0); box(o, w + .05, .06, .75, '#4E4A6E', 0, .92, 0);
      for (let k = 0; k < Math.floor(w / .6); k++) box(o, .02, .7, .02, '#C9CDD9', -w / 2 + .6 * (k + 1), .45, .36, false);
      if (sink) put(o, mesh(new THREE.BoxGeometry(.6, .05, .4), '#8FD3FF', false), 0, .95, 0);
      return at(o, x, z, rot);
    },
    fridge(x, z, rot) { const o = new THREE.Group(); box(o, .8, 1.9, .7, '#E9E2FA', 0, .95, 0); box(o, .78, .02, .02, '#8E86B0', 0, 1.3, .36, false); box(o, .05, .5, .05, '#8E86B0', .3, 1.6, .37, false); box(o, .05, .4, .05, '#8E86B0', .3, .9, .37, false); return at(o, x, z, rot); },
    tv(x, z, rot, w = 2) { const o = new THREE.Group(); box(o, w, 1.1, .08, '#2E2346', 0, 1.5, 0); box(o, w - .15, .95, .02, '#1A2238', 0, 1.5, .05, false); return at(o, x, z, rot); },
    board(x, z, rot, w = 2) { const o = new THREE.Group(); box(o, w, 1.1, .06, '#FFFFFF', 0, 1.4, 0); const c = ['#E0607E', '#6BB8FF', '#2E2346']; for (let k = 0; k < 4; k++) box(o, .4 + wr() * (w - .9), .04, .02, c[k % 3], (wr() - .5) * .5, 1.2 + k * .15, .04, false); box(o, w, .05, .1, '#9C8C78', 0, .86, .05, false); return at(o, x, z, rot); },
    bossDesk(x, z, rot) {
      const o = new THREE.Group();
      box(o, 2.6, .1, 1.1, '#6B4A3A', 0, .78, 0); box(o, 2.5, .72, 1, '#7E5A46', 0, .38, 0);
      box(o, .8, .5, .05, '#2E2346', .5, 1.1, -.3); box(o, .72, .42, .02, '#26304A', .5, 1.1, -.27, false);
      box(o, .3, .25, .2, '#FFE066', -.8, .95, -.2);   // кубок «Найкращий бос»
      const ch = new THREE.Group(); box(ch, .8, .15, .75, '#2E2346', 0, .55, 0); box(ch, .8, 1.1, .15, '#2E2346', 0, 1.1, -.32); put(ch, mesh(flat(new THREE.CylinderGeometry(.06, .06, .45, 6)), '#4E4A6E'), 0, .27, 0); ch.position.set(0, 0, .9); ch.rotation.y = PI; o.add(ch);
      return at(o, x, z, rot);
    },
    floor(x0, z0, x1, z1, col, y = .012) { const m = mesh(new THREE.BoxGeometry(x1 - x0, .02, z1 - z0), col, false, true); m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); g.add(m); return m; },
    tiles(x0, z0, x1, z1, a, b, s = 1) { K.floor(x0, z0, x1, z1, a); for (let x = x0; x < x1 - .01; x += s) for (let z = z0; z < z1 - .01; z += s) if ((Math.round((x - x0) / s) + Math.round((z - z0) / s)) % 2) K.floor(x, z, Math.min(x1, x + s), Math.min(z1, z + s), b, .018); },
  };
  return K;
}
function boxAt(g, r, h, c, y = 0) { return put(g, mesh(new THREE.BoxGeometry(r.x1 - r.x0, h, r.z1 - r.z0), c, false, true), (r.x0 + r.x1) / 2, y + h / 2, (r.z0 + r.z1) / 2); }
function buildOfficeNight(s) {
  const g = new THREE.Group(); scene.add(g);
  const dyn = m => { if (m.parent) m.parent.remove(m); scene.add(A.dynamic(m)); return m; };
  // острів: газон, асфальт парковки, скеля під ним
  put(g, mesh(flat(new THREE.CylinderGeometry(ISL_R, ISL_R * .96, 1.2, 48)), '#4F7A57', false, true), BX, -.6, BZ);
  const cone = new THREE.ConeGeometry(ISL_R * .95, ISL_R * 1.1, 28, 3); cone.rotateX(PI); put(g, mesh(flat(cone), s.rock, false), BX, -1.2 - ISL_R * .55, BZ);
  const K = officeKit(g), FL = (x0, z0, x1, z1, c, y) => K.floor(BX + x0, BZ + z0, BX + x1, BZ + z1, c, y);
  FL(-21, -17, 21, 17.2, '#8C8AA0', .005);                                     // тротуар навколо будівлі
  FL(-12, 17.2, 12, 25.5, '#3A3F55', .006);                                    // парковка
  for (let k = -5; k <= 5; k++) FL(k * 2.2 - .06, 19, k * 2.2 + .06, 22, '#E9E2FA', .009);
  FL(-1.6, 16, 1.6, 17.6, '#5E5A7E', .01);                                     // ґанок
  const car = (x, z, c) => { const o = new THREE.Group(); o.position.set(BX + x, 0, BZ + z); o.rotation.y = P2; g.add(o); put(o, mesh(new THREE.BoxGeometry(3.6, .8, 1.7), c), 0, .55, 0); put(o, mesh(new THREE.BoxGeometry(2, .6, 1.5), '#2E2346'), -.2, 1.2, 0); for (const [a, b] of [[-1.2, -.85], [1.2, -.85], [-1.2, .85], [1.2, .85]]) put(o, mesh(flat(new THREE.CylinderGeometry(.35, .35, .25, 10)), '#1A1030'), a, .35, b).rotation.x = P2; };
  car(-5.5, 20.5, '#C2335A'); car(7.7, 20.5, '#3E6AB8');
  for (const x of [-11, 11]) { put(g, mesh(new THREE.BoxGeometry(.15, 3, .15), '#4E4A6E'), BX + x, 1.5, BZ + 18); put(g, mesh(new THREE.BoxGeometry(.6, .15, .3), bulb('#FFE9A8'), false), BX + x, 3, BZ + 18); }
  for (const [x, z] of [[-17, 20], [17, 20], [-23, 4], [23, -4], [-22, -12], [22, 12], [0, -21], [-12, -20], [12, -20]]) { put(g, mesh(flat(new THREE.CylinderGeometry(.15, .2, 1.2, 6)), '#7A5A44'), BX + x, .6, BZ + z); put(g, mesh(flat(new THREE.IcosahedronGeometry(1.1, 0)), '#4F9F5B'), BX + x, 1.8, BZ + z); }
  // підлоги: ковролін в офісах, плитка на кухні й у туалетах, паркет у начальника й лаунжі, бетон у технічних
  FL(-20, -16, 20, 16, '#A9ADBD');
  FL(-20, -16, -3, -2, '#4F5D9A'); FL(-3, -16, 6, -2, '#6F5FA8'); FL(6, -16, 20, -9, '#7A4E36'); FL(6, -9, 12, -2, '#BFC3D1'); FL(12, -9, 20, -2, '#B9A27E');
  FL(-20, 2, -14, 8, '#6E7280'); FL(-20, 8, -14, 16, '#8C8577'); FL(-14, 9, -5, 16, '#B98A5E'); FL(5, 9, 13, 16, '#3E6A6A'); FL(11, 2, 20, 9, '#7E7A70');
  K.tiles(BX - 14, BZ + 2, BX - 5, BZ + 9, '#F2F0F6', '#CFCADE'); K.tiles(BX - 5, BZ + 2, BX + 5, BZ + 16, '#DCD5C4', '#C8C0AE', 2); K.tiles(BX + 5, BZ + 2, BX + 11, BZ + 9, '#E4F0F6', '#BFD6E2', .75);
  K.tiles(BX + 13, BZ + 9, BX + 20, BZ + 16, '#6E7486', '#5E6372', .6);
  for (let x = -18; x <= 18; x += 4) FL(x - .5, -.06, x + .5, .06, '#8E86B0', .02);   // смуга в коридорі
  for (let x = -12.6; x <= -8.4; x += .7) FL(x, 15.3, x + .35, 15.85, '#6B4A3A', .02);  // килимок у лаунжі
  // стіни (низькі, з кантом), стовпчики дверей і таблички
  for (const w of WALLS) {
    const h = w.glass ? WH + .3 : w.out ? WH + .25 : WH, c = w.glass ? mat('#BFE6FF', { transparent: true, opacity: .35 }) : w.out ? WALL_OUT : WALL_C;
    put(g, mesh(new THREE.BoxGeometry(w.x1 - w.x0, h, w.z1 - w.z0), c, !w.glass, true), (w.x0 + w.x1) / 2, h / 2, (w.z0 + w.z1) / 2);
    put(g, mesh(new THREE.BoxGeometry(w.x1 - w.x0 + .06, .07, w.z1 - w.z0 + .06), w.glass ? '#8E86B0' : WALL_TOP, false), (w.x0 + w.x1) / 2, h + .035, (w.z0 + w.z1) / 2);
  }
  for (const d of DOORS) {
    if (d.w > 3.5) continue;
    for (const sd of [-1, 1]) put(g, mesh(new THREE.BoxGeometry(d.h ? .14 : .36, WH + .45, d.h ? .36 : .14), '#6E5E96', false), d.x + (d.h ? sd * (d.w / 2 + .07) : 0), (WH + .45) / 2, d.z + (d.h ? 0 : sd * (d.w / 2 + .07)));
    if (d.h) put(g, mesh(new THREE.BoxGeometry(d.w + .28, .12, .36), '#6E5E96', false), d.x, WH + .45, d.z);
    if (d.n) { const p = plate(d.n); p.position.set(d.x, WH + .85, d.z); g.add(p); }
  }
  // лампи на стінах: гаснуть уночі
  for (const r of ROOMS) {
    if (r.n.includes('Коридор')) { for (let x = -16; x <= 16; x += 8) { const m = put(g, mesh(new THREE.BoxGeometry(1.4, .08, .12), mat('#FFF4D6', { emissive: '#FFF4D6', emissiveIntensity: 1 }), false), BX + x, WH + .1, BZ - 2); V.lamps.push(dyn(m)); } continue; }
    const m = put(g, mesh(new THREE.BoxGeometry(Math.min(2, r.x1 - r.x0 - 1), .08, .12), mat('#FFF4D6', { emissive: '#FFF4D6', emissiveIntensity: 1 }), false), BX + (r.x0 + r.x1) / 2, WH + .1, BZ + r.z0); V.lamps.push(dyn(m));
  }
  // меблі за планом
  for (const [t, x, z, rot, len] of FURN_L) {
    const X = BX + x, Z = BZ + z;
    if (t === 'desk') {
      const mon = MON_DESKS.findIndex(d => Math.abs(d[0] - x) < .01 && Math.abs(d[1] - z) < .01), o = K.desk(X, Z, rot, { top: x > 0 ? '#D6E4E4' : '#E8DCC8' });
      if (mon >= 0) { const sc = new THREE.Mesh(new THREE.PlaneGeometry(.64, .36), new THREE.MeshBasicMaterial({ color: '#1A1030' })); sc.position.set(0, 1.1, -.175); o.add(sc); o.updateMatrixWorld(true); const wp = new THREE.Vector3(); sc.getWorldPosition(wp); o.remove(sc); sc.position.copy(wp); sc.rotation.y = rot; scene.add(A.dynamic(sc)); V.mons[mon] = sc; }
    }
    else if (t === 'sdesk') K.desk(X, Z, rot, { chair: false, top: '#C9B8A0' });
    else if (t === 'chair') K.chair(X, Z, rot);
    else if (t === 'mtable') { K.table(X, Z, rot, len, 1.6, '#4E3A7C'); const o = new THREE.Group(); o.position.set(X, 0, Z); o.rotation.y = rot; g.add(o); for (let k = 0; k < 4; k++) put(o, mesh(new THREE.BoxGeometry(.3, .02, .22), '#FFFFFF', false), -len / 2 + 1 + k * 1.7, .8, (k % 2 ? -.4 : .4)); put(o, mesh(flat(new THREE.CylinderGeometry(.25, .25, .06, 10)), '#2E2346', false), 0, .82, 0); }
    else if (t === 'ktable') K.table(X, Z, rot, 1.8, 1, '#E8DCC8');
    else if (t === 'ctable') { const o = K.table(X, Z, rot, 1.2, .6, '#6B4A3A', .42); put(o, mesh(new THREE.BoxGeometry(.3, .03, .22), '#FFE066', false), .2, .48, 0); }
    else if (t === 'sofa') { const boss = x > 6 && z < -9, lob = Math.abs(x) < 5; K.sofa(X, Z, rot, len || 2.4, boss ? '#3A2A24' : lob ? '#3E6AB8' : '#8F7BD6', boss ? '#5A4034' : lob ? '#6B8FD8' : '#B7A6EA'); }
    else if (t === 'plant') K.plant(X, Z, z < -14 || z > 15);
    else if (t === 'cooler') K.cooler(X, Z);
    else if (t === 'tv') K.tv(X, Z, rot, len || 2);
    else if (t === 'board') K.board(X, Z, rot, len || 2);
    else if (t === 'shelf') K.shelf(X, Z, rot, len || 1.8, x < -14 ? 2 : 1.6);
    else if (t === 'locker') K.locker(X, Z, rot);
    else if (t === 'counter') { const o = K.counter(X, Z, rot, len || 4, true); if (x < 0) { put(o, mesh(new THREE.BoxGeometry(.5, .55, .45), '#2E2346'), -1.4, 1.22, 0); put(o, mesh(new THREE.BoxGeometry(.2, .1, .04), bulb('#FF6BD6'), false), -1.4, 1.3, .23); put(o, mesh(new THREE.BoxGeometry(.6, .35, .4), '#C9CDD9'), 1.4, 1.13, 0); } else for (let k = -1; k <= 1; k++) put(o, mesh(new THREE.BoxGeometry(.6, .5, .03), mat('#CFE8F6', { metalness: .4, roughness: .2 }), false), k * .75, 1.5, -.33); }
    else if (t === 'fridge') K.fridge(X, Z, rot);
    else if (t === 'bdesk') K.bossDesk(X, Z, rot);
    else if (t === 'copier') { V.printer = put(g, mesh(new THREE.BoxGeometry(1.2, 1, .9), '#E8E3F0'), X, .5, Z); put(V.printer, mesh(new THREE.BoxGeometry(.8, .04, .35), '#FFFFFF', false), 0, .52, .3); put(V.printer, mesh(new THREE.BoxGeometry(.25, .06, .15), bulb('#7FE08A'), false), .4, .52, -.25); dyn(V.printer); }
    else if (t === 'crate') { put(g, mesh(new THREE.BoxGeometry(.8, .7, .8), '#C4956A'), X, .35, Z).rotation.y = rot; put(g, mesh(new THREE.BoxGeometry(.82, .08, .2), '#E8DCC8', false), X, .66, Z); }
    else if (t === 'pallet') { put(g, mesh(new THREE.BoxGeometry(1.6, .15, 1.2), '#9C7A54'), X, .08, Z); for (const [a, b, h] of [[-.4, -.3, .6], [.4, -.3, .6], [-.4, .3, .6], [.4, .3, .9], [0, 0, 1.4]]) put(g, mesh(new THREE.BoxGeometry(.7, .55, .55), '#C4956A'), X + a, .15 + h - .3, Z + b); }
    else if (t === 'rack') { const o = put(g, mesh(new THREE.BoxGeometry(.76, 2, .95), '#2A2E3E'), X, 1, Z); for (let k = 0; k < 6; k++) { const led = mesh(new THREE.BoxGeometry(.05, .04, .02), bulb(['#7FE08A', '#6BB8FF', '#FFD27A'][k % 3]), false); put(o, led, -.25 + (k % 3) * .2, -.6 + Math.floor(k / 3) * .9, .48); } for (const sd of [-1, 1]) put(o, mesh(new THREE.BoxGeometry(.6, .04, .02), '#4E4A6E', false), 0, .3 * sd, -.48 * -1); }
    else if (t === 'recep') { put(g, mesh(new THREE.BoxGeometry(4.4, 1.1, .8), '#6E5E96'), X, .55, Z); put(g, mesh(new THREE.BoxGeometry(4.5, .08, .95), '#E8DCC8'), X, 1.14, Z); put(g, mesh(new THREE.BoxGeometry(4.42, .06, .06), bulb('#6BE7FF'), false), X, .9, Z + .41); const sg = neonSign('ГУЩА', '#6BE7FF', 1.6, .45); sg.position.set(X, .55, Z + .42); g.add(sg); put(g, mesh(new THREE.BoxGeometry(.6, .38, .05), '#2E2346'), X - 1.2, 1.38, Z - .15); put(g, mesh(new THREE.BoxGeometry(.3, .2, .2), '#C2335A'), X + 1.3, 1.25, Z - .2); }
    else if (t === 'panel') { put(g, mesh(new THREE.BoxGeometry(.4, 1.8, 3.6), '#5E5A7E'), X, .9, Z); put(g, mesh(new THREE.BoxGeometry(.03, .3, .3), bulb('#FFE066'), false), X + .21, 1.65, Z - 1.4); }
    else if (t === 'gen') { put(g, mesh(new THREE.BoxGeometry(1.6, 1.1, 1.2), '#4E4A6E'), X, .55, Z); put(g, mesh(new THREE.BoxGeometry(.6, .3, .05), bulb('#FFE066'), false), X, .8, Z - .62); for (let k = -2; k <= 2; k++) put(g, mesh(new THREE.BoxGeometry(.05, .5, 1), '#3A3656', false), X + k * .25, .55, Z + .05).position.y = 1.12; }
    else if (t === 'part') { put(g, mesh(new THREE.BoxGeometry(.08, 1.5, 1.8), '#8FB8D8'), X, .85, Z); }
    else if (t === 'wc') { put(g, mesh(new THREE.BoxGeometry(.42, .42, .5), '#FFFFFF'), X, .21, Z); put(g, mesh(new THREE.BoxGeometry(.42, .5, .15), '#FFFFFF'), X, .55, Z + .25); }
    else if (t === 'bean') { const b = put(g, mesh(flat(new THREE.IcosahedronGeometry(.45, 1)), pick(['#FF6BD6', '#FFB04A', '#6BE7FF'])), X, .32, Z); b.scale.y = .65; }
    else if (t === 'lamp') { put(g, mesh(flat(new THREE.CylinderGeometry(.04, .04, 1.6, 6)), '#4E4A6E'), X, .8, Z); put(g, mesh(flat(new THREE.ConeGeometry(.3, .3, 10)), '#FFE9A8'), X, 1.7, Z); }
  }
  V.monTex = screenTex('ДЕДЛАЙН', '#3A0010', '#FF3B5C');
  // туалет: дзеркало й табличка на кабінках
  // кабінет начальника: телефон
  V.phone = dyn(put(g, mesh(new THREE.BoxGeometry(.35, .14, .25), '#C2335A'), PHONE.x, .9, PHONE.z));
  // щитова: три рубильники з лампочками
  for (const [i, b] of BREAKERS.entries()) {
    put(g, mesh(new THREE.BoxGeometry(.12, .5, .5), b.c, false), PANEL_X + .06, 1.1, b.z);
    const lv = dyn(put(g, mesh(new THREE.BoxGeometry(.3, .08, .08), '#E8E3F0', false), PANEL_X + .26, 1.2, b.z));
    const led = dyn(put(g, mesh(new THREE.BoxGeometry(.06, .08, .08), mat('#333344', { emissive: '#000000' }).clone(), false), PANEL_X + .14, 1.45, b.z));
    V.brk[i] = { lv, led };
  }
  const ec = { x: (ELEC_D.x0 + ELEC_D.x1) / 2, z: (ELEC_D.z0 + ELEC_D.z1) / 2 };
  V.edoorM = dyn(put(g, mesh(new THREE.BoxGeometry(1.8, WH + .3, .12), '#8E86B0', false), ec.x, (WH + .3) / 2, ec.z)); V.edoorX = ec.x;
  put(V.edoorM, mesh(new THREE.BoxGeometry(.5, .25, .03), bulb('#FFE066'), false), 0, .3, -.08);
  put(V.edoorM, mesh(new THREE.BoxGeometry(.12, .18, .05), bulb('#FF5C7A'), false), .6, 0, -.08);
  // вестибюль: табельний апарат на стіні, скляні вихідні двері, EXIT
  put(g, mesh(new THREE.BoxGeometry(.25, .7, .45), '#E8E3F0'), CLOCK.x + .5, 1.1, CLOCK.z);
  put(g, mesh(new THREE.BoxGeometry(.03, .2, .25), bulb('#7FE08A'), false), CLOCK.x + .36, 1.25, CLOCK.z);
  for (const s2 of [-1, 1]) { const d = dyn(put(g, mesh(new THREE.BoxGeometry(1.6, WH + .2, .1), mat('#9FE6FF', { transparent: true, opacity: .55 }), false), BX + s2 * .8, (WH + .2) / 2, BZ + HZ)); V.exitM.push({ m: d, s: s2 }); }
  const ex = neonSign('EXIT', '#7FE08A', 1.2, .4); ex.position.set(BX, WH + .9, BZ + HZ + .05); g.add(ex);
  const logo = neonSign('ГУЩА · офіс', '#FF6BD6', 4, .8); logo.position.set(BX - 6, WH + .8, BZ + HZ + .2); g.add(logo);
  // коридор: ліфт у східному торці
  put(g, mesh(new THREE.BoxGeometry(.25, WH + .9, 2.6), '#4E4A6E'), ELEV.x + .55, (WH + .9) / 2, ELEV.z);
  for (const s2 of [-1, 1]) { const d = dyn(put(g, mesh(new THREE.BoxGeometry(.06, WH + .5, .9), '#C9CDD9', false), ELEV.x + .4, (WH + .5) / 2, ELEV.z + s2 * .45)); V.elev.push({ m: d, s: s2 }); }
  put(g, mesh(new THREE.BoxGeometry(.04, .14, .14), bulb('#FFD27A'), false), ELEV.x + .4, WH + .7, ELEV.z);
  const lift = plate('🛗 Ліфт', 1); lift.position.set(ELEV.x + .3, WH + 1.15, ELEV.z); g.add(lift);
  // батарейки й стікер (видно за станом)
  for (const b of BAT_SPOTS) {
    const m = new THREE.Group(); m.position.set(b.x, .15, b.z); scene.add(A.dynamic(m));
    put(m, mesh(flat(new THREE.CylinderGeometry(.11, .11, .32, 10)), bulb('#FFE066'), false), 0, 0, 0).rotation.z = P2;
    put(m, mesh(flat(new THREE.CylinderGeometry(.115, .115, .1, 10)), '#2E2346', false), -.11, 0, 0).rotation.z = P2;
    m.visible = false; V.bats.push(m);
  }
  V.note = dyn(put(g, mesh(new THREE.BoxGeometry(.3, .3, .02), bulb('#FFE066'), false), 0, 0, 0)); V.note.visible = false;
  return g;
}
/* моделі ворогів: зомбі-офісник і прибиральник зі шваброю */
function enemyModel(t) {
  if (t) {
    const h = humanoid({ skin: '#B9C6A9', shirt: '#3E5A9A', pants: '#2E3E6E' }); h.root.scale.setScalar(1.25);
    put(h.body, mesh(new THREE.BoxGeometry(.52, .12, .52), '#2E3E6E'), 0, 1.74, 0);
    put(h.body, mesh(new THREE.BoxGeometry(.5, .05, .25), '#2E3E6E'), 0, 1.69, .25);
    const mop = new THREE.Group(); mop.position.set(0, -.3, .1); h.hand.add(mop);
    put(mop, mesh(flat(new THREE.CylinderGeometry(.03, .03, 1.7, 6)), '#C4956A'), 0, -.2, .3).rotation.x = .9;
    put(mop, mesh(new THREE.BoxGeometry(.4, .12, .2), '#E8E3F0'), 0, -.75, .95);
    put(h.body, mesh(new THREE.BoxGeometry(.4, .3, .05), '#FFE066', false), 0, .9, .3);
    for (const sx of [-.1, .1]) put(h.body, mesh(G.eye, bulb('#FF3B3B'), false), sx, 1.5, .28);
    scene.add(h.root); return h;
  }
  const h = buildOffice(pick(['#9FC79A', '#A8C2A2', '#B5CFA0', '#8FB89A']), pick(['#8291B8', '#7C8AA8', '#8C84A8', '#A88C9A']));
  for (const sx of [-.1, .1]) put(h.body, mesh(G.eye, bulb('#D8FF6B'), false), sx, 1.5, .28);
  scene.add(h.root); return h;
}

/* ---------- Події ---------- */
const nameOf = k => k === myKey() ? 'Ти' : escapeHTML(k === 'me' ? 'Ти' : k);
function onEvent(e) {
  if (SIMSIDE || !e) return;
  const here = running && inIsl(pl.x, pl.z);
  if (e.to && e.to !== myKey()) return;
  if (e.k === 'msg') { if (here) { if (e.big) banner(e.txt); else toast(e.txt); } }
  else if (e.k === 'start') {
    if (!here) return; V.joined = true; V.seenNote.clear(); V.act = null;
    if (!inB(pl.x, pl.z)) { pl.x = SPAWN.x; pl.z = SPAWN.z; V.lastP = null; }
    banner('🌙 00:00. Світло вимкнули. Не вимикай ліхтарик!'); sfx('boom'); shake = Math.max(shake, .4);
    toast(`${e.who ? escapeHTML(e.who) + ' відбив зміну. ' : ''}Доживи до 06:00 — або знайди 🔑 картку, увімкни щиток і тікай.`);
  }
  else if (e.k === 'down') {
    if (!here) return; scream(e.x, e.z);
    if (e.who === myKey()) { banner(e.by ? '🧹 Прибиральник тебе змів! Лежиш…' : '🧟 Зомбі тебе схопив! Лежиш…'); shake = Math.max(shake, 1); V.act = null; }
    else toast(`🆘 ${nameOf(e.who)} лежить! Підійди й натисни F, щоб підняти (3 с).`);
  }
  else if (e.k === 'revived') { if (here) { toast(`💪 ${nameOf(e.by)} підняв ${e.who === myKey() ? 'тебе' : nameOf(e.who)}!`); sfx('level'); } }
  else if (e.k === 'hid') { if (here && e.who === myKey()) { toast(`🫥 Ти ${HIDE_N[(CABS[e.i] || {}).k] || 'в схованці'}. Тебе не бачать і не чують. F — вийти.`); sfx('whoosh'); } }
  else if (e.k === 'bat') { if (here) { const b = BAT_SPOTS[e.i]; if (b) burst(b.x, .5, b.z, '#FFE066', 8, 2, .5, 2); if (e.who === myKey()) { ftext(pl.x, 2.4, pl.z, '🔋 +60%', 'gold'); sfx('equip'); } } }
  else if (e.k === 'card') { if (here) { const c = CARD_SPOTS[e.i]; banner(`🔑 ${nameOf(e.who)} знайшов картку доступу! (${c.ic} ${c.n})`); sfx('chest'); burst(c.x, 1.2, c.z, '#FFD27A', 16, 3, .7, 3); } }
  else if (e.k === 'empty') { if (here) { const c = CARD_SPOTS[e.i]; if (e.who === myKey()) ftext(c.x, 2.2, c.z, pick(['Пусто…', 'Лише крихти від печива', 'Тут тільки степлер', 'Чиясь заначка цукерок']), 'calm'); sfx('dig', c.x, c.z); } }
  else if (e.k === 'note') { if (here) { banner(`📝 Стікер: «Щиток вмикати так: ${ordTxt(e.ord)}. НЕ ПЛУТАТИ! — завгосп»`); sfx('page'); } }
  else if (e.k === 'edoor') { if (here) { toast(`🚪 ${nameOf(e.who)} відчинив електрощитову карткою.`); sfx('ding'); } }
  else if (e.k === 'fuse') {
    if (!here) return; const b = BREAKERS[e.i];
    if (e.ok) { toast(`${b.ic} Клац! ${e.n}/3`); sfx('equip', b.x, b.z); burst(b.x - .4, 1.3, b.z, b.c, 6, 2, .4, 1); }
    else { banner('⚡ ІСКРИ! Не той порядок — щиток скинуло. Це було ГУЧНО…'); sfx('boom', b.x, b.z); boomFXsafe(b.x - .4, b.z); if (dist2(pl.x, pl.z, b.x, b.z) < 8) shake = Math.max(shake, .6); }
  }
  else if (e.k === 'power') { if (here) { banner('💡 Світло повернулось! Вихідні двері розблоковано — біжіть до EXIT!'); sfx('level'); shake = Math.max(shake, .3); } }
  else if (e.k === 'exit') { if (here) { toast('🚪 Вихідні двері відчинені — вибігай надвір!'); sfx('whoosh'); } }
  else if (e.k === 'say') { const v = V.en.get(e.id); if (v && here) bubble(v.ent, e.txt, true, 2.4); }
  else if (e.k === 'scare') scare(e, here);
  else if (e.k === 'end') finish(e);
}
function boomFXsafe(x, z) { if (typeof boomFX === 'function') boomFX(x, z, 1.4, .6); else burst(x, 1.2, z, '#FFE066', 20, 5, .6, 3); }
const ordTxt = o => (o || []).map(i => BREAKERS[i] ? BREAKERS[i].ic : '?').join(' → ');
function scream(x, z) { nsSfx('nsGrab', x, z); burst(x, 1.4, z, '#C8FF6B', 12, 3, .6, 3); }
/* лякалки: смішно-страшно, з трясінням камери */
function scare(e, here) {
  if (!here) return;
  const near = p => dist2(pl.x, pl.z, p.x, p.z) < 11;
  if (e.what === 'mon') { const i = (e.i | 0) % MONITORS.length, m = MONITORS[i]; V.monT[i] = 3.2; nsSfx('nsStatic', m.x, m.z); if (near(m)) { shake = Math.max(shake, .35); ftext(m.x, 2.2, m.z, 'ДЕДЛАЙН ВЧОРА', 'bad'); } }
  else if (e.what === 'printer') { V.printT = 4; nsSfx('nsPrint', PRINTER.x, PRINTER.z); if (near(PRINTER)) { shake = Math.max(shake, .3); ftext(PRINTER.x, 2, PRINTER.z, 'Друкую звіт… сам 🖨️', 'bad'); } }
  else if (e.what === 'phone') { V.phoneT = 4; nsSfx('nsPhone', PHONE.x, PHONE.z); toast('📞 У кабінеті начальника дзвонить телефон… Прибиральник піде подивитись.'); if (near(PHONE)) shake = Math.max(shake, .3); }
  else if (e.what === 'elev') { V.elevT = 3.5; sfx('ding', ELEV.x, ELEV.z); if (e.spawn) toast('🛗 Дзень! Ліфт привіз ще одного «співробітника»…'); if (near(ELEV)) shake = Math.max(shake, .35); }
}
function finish(e) {
  const was = V.joined || inIsl(pl.x, pl.z); V.joined = false; V.act = null;
  if (!was || !running) return;
  const win = !!e.win, esc = e.how === 'escape', mins = Math.floor((+e.t || 0) / (+e.dur || DUR) * 360 / 60);
  const coins = win ? (esc ? 90 : 70) : 10 + mins * 4, xp = win ? (esc ? 180 : 150) : 30 + mins * 8;
  P.coins += coins; addXP(xp);
  const d = A.data(); d.nights = (d.nights || 0) + 1; if (win) d.wins = (d.wins || 0) + 1; if (esc) d.escapes = (d.escapes || 0) + 1;
  d.best = Math.max(d.best || 0, win && !esc ? 360 : Math.round((+e.t || 0) / (+e.dur || DUR) * 360));
  banner(win ? (esc ? `🏃 ВТЕЧА! ${e.by ? nameOf(e.by) + ' вибіг перший. ' : ''}Нічна зміна закінчилась раніше — для всіх.` : '🌅 06:00! Зомбі розійшлись по домівках. Ви дожили до ранку!') : `💀 ${e.how || 'Зміну провалено.'}`);
  toast(`Нагорода: <b>+${coins} 🪙</b> · +${xp} досвіду. Ще ніч — табельний апарат у вестибюлі (F).`);
  sfx(win ? 'level' : 'hurt'); refreshHUD(); save();
}

/* ---------- Кожен кадр ---------- */
function clientTick(dt) {
  const t = gameTime, here = running && inIsl(pl.x, pl.z);
  // декорації за станом
  for (let i = 0; i < V.mons.length; i++) { if (V.monT[i] > 0) V.monT[i] -= dt; const m = V.mons[i]; if (!m) continue; const on = V.monT[i] > 0 && Math.random() > .08; const want = on ? V.monTex : null; if (m.material.map !== want) { m.material.map = want; m.material.color.set(on ? '#FFFFFF' : ST.on && !ST.power ? '#1A1030' : '#3E5A9A'); m.material.needsUpdate = true; } else if (!on) m.material.color.set(ST.on && !ST.power ? '#1A1030' : '#3E5A9A'); }
  if (V.printT > 0) { V.printT -= dt; if (V.printer) { V.printer.position.y = .4 + Math.abs(Math.sin(t * 30)) * .03; if (Math.random() < dt * 6) burst(PRINTER.x, 1, PRINTER.z + .6, '#FFFFFF', 1, 1.5, 1, 1.5, 1.6); } }
  if (V.phoneT > 0) { V.phoneT -= dt; if (V.phone) V.phone.rotation.z = Math.sin(t * 50) * .15; } else if (V.phone) V.phone.rotation.z = 0;
  if (V.elevT > 0) V.elevT -= dt;
  for (const d of V.elev) d.m.position.z = lerp(d.m.position.z, ELEV.z + d.s * (V.elevT > 0 ? 1.2 : .45), Math.min(1, dt * 5));
  for (const d of V.exitM) d.m.position.x = lerp(d.m.position.x, BX + d.s * (ST.exit ? 2.3 : .8), Math.min(1, dt * 5));
  if (V.edoorM) V.edoorM.position.x = lerp(V.edoorM.position.x, V.edoorX + (ST.edoor ? -1.7 : 0), Math.min(1, dt * 5));
  for (const [i, b] of V.brk.entries()) { const on = ST.power || (ST.ord && ST.fz > ST.ord.indexOf(i)); b.lv.rotation.z = lerp(b.lv.rotation.z, on ? .9 : -.6, Math.min(1, dt * 8)); b.led.material.emissive.set(on ? BREAKERS[i].c : '#000000'); }
  const lampsOn = !ST.on || ST.power; for (const m of V.lamps) m.visible = lampsOn || Math.random() < .002;
  V.bats.forEach((m, i) => { m.visible = ST.on && ST.bats.includes(i); if (m.visible) { m.rotation.y += dt * 2; m.position.y = .2 + Math.sin(t * 3 + i) * .05; } });
  if (V.note) { const n = NOTE_SPOTS[ST.noteAt]; V.note.visible = ST.on && !ST.note; if (n) { V.note.position.set(n.m.x, n.y, n.m.z); V.note.rotation.y = n.r || 0; } }
  updEnemies(dt);
  // друзі: лежать / сховались
  if (NET.on) for (const id in NET.players) { const r = NET.players[id], s = ST.on && ST.pl[r.name]; r.h.root.visible = !(s && s.h); if (s && s.d) { r.h.body.rotation.x = 1.4; r.h.body.position.y = -.55; } }
  updAct(dt);
  hud(); darkness(); guide(); updSpot(here);
  if (!here || pl.dead) { V.lastP = null; return; }
  if (ST.on) V.joined = true;
  pl.safe = { x: SPAWN.x, z: SPAWN.z };
  const s = mySt();
  // ліхтарик дивиться туди, куди мишка (або куди йдеш)
  if (!IS_TOUCH && input.aimOk && !amDown() && !amHid()) { V.fa = angTo(pl.x, pl.z, input.ax, input.az); pl.face = V.fa; } else V.fa = pl.face;
  V.noise = amDown() || amHid() ? 0 : pl.dashT > 0 ? 1.5 : pl.moving ? (keys.KeyZ ? .1 : .75) : 0;
  if (ST.on) { if (AUTH()) { AU.inp[myKey()] = { a: V.fa, n: V.noise, t: ST.t }; if (s) s.a = wrapA(V.fa); } else if ((V.sendT -= dt) <= 0) { V.sendT = .1; A.send('rq', { k: 'in', a: r2(V.fa), n: V.noise }); } }
  // лежиш або в шафі
  if (amHid()) { const c = CABS[s.h - 1]; pl.x = c.b.x; pl.z = c.b.z; if (hero) hero.root.visible = false; V.lastP = null; return; }
  if (hero) { hero.root.visible = true; if (V.wasDown && !amDown()) hero.body.position.y = 0; }
  V.wasDown = amDown();
  if (amDown()) { pl.dashT = 0; if (hero) { hero.body.rotation.x = 1.4; hero.body.position.y = -.55; } if (Math.random() < dt * .3) ftext(pl.x, 2, pl.z, pick(['Допоможіть!', 'Кенти, сюди!', 'Я ще живий!']), 'bad'); }
  // стіни й меблі
  if (V.lastP && dist2(V.lastP.x, V.lastP.z, pl.x, pl.z) < 2 && !los(V.lastP.x, V.lastP.z, pl.x, pl.z, false, true)) { pl.x = V.lastP.x; pl.z = V.lastP.z; }
  pushOut(pl, .35);
  V.lastP = { x: pl.x, z: pl.z };
  if (hero) hero.root.position.set(pl.x, pl.y, pl.z);
}
function pushOut(o, r) {
  const one = q => {
    if (o.x < q.x0 - r || o.x > q.x1 + r || o.z < q.z0 - r || o.z > q.z1 + r) return;
    const nx = clamp(o.x, q.x0, q.x1), nz = clamp(o.z, q.z0, q.z1), dx = o.x - nx, dz = o.z - nz, d = Math.hypot(dx, dz);
    if (d > 1e-4) { if (d < r) { o.x = nx + dx / d * r; o.z = nz + dz / d * r; } return; }
    const a = o.x - q.x0, b = q.x1 - o.x, c = o.z - q.z0, e = q.z1 - o.z, m = Math.min(a, b, c, e);
    if (m === a) o.x = q.x0 - r; else if (m === b) o.x = q.x1 + r; else if (m === c) o.z = q.z0 - r; else o.z = q.z1 + r;
  };
  for (const q of solids()) one(q);
  for (const q of FURN) one(q);
}
/* вороги: плавно до позиції з сервера; на світлі — завмерли й тремтять */
function updEnemies(dt) {
  const seen = new Set(), k = 1 - Math.exp(-dt * 8);
  let nearD = 99;
  for (const e of ST.en) {
    seen.add(e.id);
    let v = V.en.get(e.id);
    if (!v) { v = { id: e.id, h: enemyModel(e.t), x: e.x, z: e.z, f: e.face, ph: Math.random() * 6, t: e.t, ent: { x: e.x, z: e.z, y: 0, bh: e.t ? 2.6 : 2.1 } }; V.en.set(e.id, v); }
    const mv = Math.hypot(e.x - v.x, e.z - v.z) > .02 && !e.lit;
    v.x = AUTH() ? e.x : lerp(v.x, e.x, k); v.z = AUTH() ? e.z : lerp(v.z, e.z, k); v.f = lerpAng(v.f, e.face, k);
    v.ent.x = v.x; v.ent.z = v.z;
    const h = v.h; h.root.position.set(v.x + (e.lit ? (Math.random() - .5) * .04 : 0), 0, v.z); h.root.rotation.y = v.f;
    if (mv) v.ph += dt * (e.st === 'chase' ? 9 : 5);
    const sw = mv ? Math.sin(v.ph) * .5 : 0;
    h.l1.rotation.x = sw; h.l2.rotation.x = -sw;
    if (e.t) { h.aR.rotation.x = -.6 + Math.sin(v.ph * .5) * .4; h.aL.rotation.x = -.4; }
    else { h.aL.rotation.x = h.aR.rotation.x = e.lit ? -.2 : -1.45 + Math.sin(v.ph) * .1; h.body.rotation.z = e.lit ? 0 : Math.sin(v.ph * .5) * .08; }
    h.head.rotation.x = e.st === 'happy' ? -.3 : 0;
    if (running && !e.lit && Math.random() < dt * .04 && dist2(v.x, v.z, pl.x, pl.z) < 8) bubble(v.ent, e.t ? pick(['Тут мокро!', 'Хто наслідив?', 'Шкряб-шкряб…']) : pick(['Мооозок… ой, тобто звіт…', 'Дееедлайн…', 'Ще одна нарада…', 'Кааави…', 'Ееексель…']), false, 2);
    if (running) nearD = Math.min(nearD, dist2(v.x, v.z, pl.x, pl.z) - (e.st === 'chase' ? 2 : 0));
  }
  for (const [id, v] of V.en) if (!seen.has(id)) { scene.remove(v.h.root); if (v.ent.bub) { v.ent.bub.el.remove(); } V.en.delete(id); }
  V.near = nearD;
}
/* ліхтарик у 3D: справжній прожектор із рук */
function updSpot(here) {
  const s = mySt(), on = here && ST.on && s && s.l && s.b > 0 && !s.d && !s.h;
  if (!V.spot) { if (!on) return; V.spot = new THREE.SpotLight('#FFF0C8', 0, 12, .5, .55, 1.2); V.spot.castShadow = false; scene.add(A.dynamic(V.spot)); scene.add(A.dynamic(V.spot.target)); }
  V.spot.intensity = on ? (s.b < 15 && Math.random() < .15 ? .3 : 2.2) : 0;
  if (on) { V.spot.position.set(pl.x + Math.sin(V.fa) * .3, 1.4, pl.z + Math.cos(V.fa) * .3); V.spot.target.position.set(pl.x + Math.sin(V.fa) * 6, 0, pl.z + Math.cos(V.fa) * 6); V.spot.target.updateMatrixWorld(); }
}

/* ---------- Темрява: лише ліхтарики й маленьке коло навколо себе ---------- */
function darkness() {
  if (!V.dark) { V.dark = document.createElement('canvas'); V.dark.id = 'ns-dark'; V.dark.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:1;pointer-events:none;transition:opacity .5s'; document.body.appendChild(V.dark); }
  const on = running && ST.on && inIsl(pl.x, pl.z) && !panel;
  V.dark.style.opacity = on ? 1 : 0; V.dark.style.display = on ? '' : 'none';
  if (!on) return;
  const c = V.dark, S = .5, W = Math.max(2, Math.round(innerWidth * S)), H = Math.max(2, Math.round(innerHeight * S));
  if (c.width !== W) c.width = W; if (c.height !== H) c.height = H;
  const x = c.getContext && c.getContext('2d'); if (!x || !x.fillRect) return;
  const sp = (wx, wz, y = .4) => { const p = screenPos(wx, y, wz); return { x: p.x * S, y: p.y * S }; };
  const grad = (cx, cy, r, stops) => { const g = x.createRadialGradient && x.createRadialGradient(cx, cy, 0, cx, cy, Math.max(1, r)); if (g && g.addColorStop) { for (const [o, a] of stops) g.addColorStop(o, `rgba(0,0,0,${a})`); return g; } return 'rgba(0,0,0,1)'; };
  x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, W, H);
  x.fillStyle = ST.power ? 'rgba(10,8,26,.42)' : `rgba(5,3,14,${amDown() ? .97 : .94})`; x.fillRect(0, 0, W, H);
  x.globalCompositeOperation = 'destination-out';
  const hole = (wx, wz, r, a) => { const p = sp(wx, wz), q = sp(wx + r, wz), rr = Math.hypot(q.x - p.x, q.y - p.y); x.fillStyle = grad(p.x, p.y, rr, [[0, a], [.55, a * .7], [1, 0]]); x.beginPath(); x.arc(p.x, p.y, rr, 0, 7); x.fill(); };
  const cone = (wx, wz, a, bat) => {
    const p = sp(wx, wz), flick = bat < 15 && Math.random() < .2 ? .35 : 1, rr = LIGHT_R + 1;
    x.beginPath(); x.moveTo(p.x, p.y);
    for (let k = 0; k <= 10; k++) { const aa = a - LIGHT_A - .08 + (LIGHT_A + .08) * 2 * k / 10, q = sp(wx + Math.sin(aa) * rr, wz + Math.cos(aa) * rr); x.lineTo(q.x, q.y); }
    x.closePath(); const f = sp(wx + Math.sin(a) * rr, wz + Math.cos(a) * rr);
    x.fillStyle = grad(p.x, p.y, Math.hypot(f.x - p.x, f.y - p.y), [[0, .98 * flick], [.6, .85 * flick], [1, 0]]); x.fill();
  };
  // я
  hole(pl.x, pl.z, amHid() ? .8 : 1.9, .9);
  const me = mySt(); if (me && me.l && me.b > 0 && !me.d && !me.h) cone(pl.x, pl.z, V.fa, me.b);
  // друзі
  if (NET.on) for (const id in NET.players) { const r = NET.players[id], s = ST.pl[r.name]; if (!s || s.h || !inIsl(r.x, r.z)) continue; hole(r.x, r.z, 1.3, .6); if (s.l && s.b > 0 && !s.d) cone(r.x, r.z, s.a, s.b); }
  // батарейки ледь світяться, монітори з «ДЕДЛАЙН», телефон
  for (const i of ST.bats) { const b = BAT_SPOTS[i]; if (b) hole(b.x, b.z, .5, .5); }
  for (let i = 0; i < MONITORS.length; i++) if (V.monT[i] > 0) hole(MONITORS[i].x, MONITORS[i].z, 1.6, .85);
  if (V.printT > 0) hole(PRINTER.x, PRINTER.z, 1.2, .6);
  if (V.phoneT > 0) hole(PHONE.x, PHONE.z, 1, .6);
  if (V.elevT > 0) hole(ELEV.x - .5, ELEV.z, 1.6, .7);
  if (!ST.note) { const n = NOTE_SPOTS[ST.noteAt]; if (n) hole(n.m.x, n.m.z, .45, .45); }
  // очі в темряві
  x.globalCompositeOperation = 'source-over';
  for (const [, v] of V.en) {
    const d = dist2(v.x, v.z, pl.x, pl.z); if (d > 15) continue;
    const e = ST.en.find(q => q.id === v.id); const p = sp(v.x + Math.sin(v.f) * .25, v.z + Math.cos(v.f) * .25, v.t ? 1.9 : 1.5), side = 2.4;
    x.fillStyle = v.t ? 'rgba(255,50,50,.95)' : `rgba(210,255,110,${e && e.lit ? .3 : .85})`;
    for (const sx of [-side, side]) { x.beginPath(); x.arc(p.x + sx, p.y, v.t ? 2.2 : 1.6, 0, 7); x.fill(); }
  }
}

/* ---------- Тримай F поруч: обшук, рубильник, підняти друга ---------- */
function startAct(a) { if (V.act || amDown() || amHid()) return; V.act = Object.assign({ t: 0, pt: 0 }, a); sfx('dig'); }
function actTarget(a) {
  if (a.what === 'search') return !ST.cs[a.i] && CARD_SPOTS[a.i];
  if (a.what === 'fuse') return ST.edoor && !ST.power && BREAKERS[a.i];
  if (a.what === 'revive') { const s = ST.pl[a.who]; if (!s || !s.d) return null; if (a.who === 'me') return pl; const r = Object.values(NET.players).find(q => q.name === a.who); return r ? { x: r.x, z: r.z } : null; }
  return null;
}
function updAct(dt) {
  const a = V.act; if (!a) return;
  const tg = actTarget(a);
  if (!tg || !ST.on || amDown()) { V.act = null; return; }
  if (dist2(pl.x, pl.z, tg.x, tg.z) > 2) { V.act = null; toast('Відійшов — перервано.'); return; }
  a.t += dt; a.pt -= dt;
  if (a.pt <= 0) { a.pt = .45; ftext(pl.x, 2.5, pl.z, `${a.what === 'revive' ? '💪' : a.what === 'fuse' ? '⚡' : '🔍'} ${Math.round(a.t / a.need * 100)}%`, 'calm'); }
  if (a.t >= a.need) { V.act = null; if (a.what === 'search') req('search', { i: a.i }); else if (a.what === 'fuse') req('fuse', { i: a.i }); else req('revive', { who: a.who }); }
}
function downedMates() {
  const out = [];
  if (!ST.on || !NET.on) return out;
  for (const id in NET.players) { const r = NET.players[id], s = ST.pl[r.name]; if (s && s.d && inIsl(r.x, r.z)) out.push({ k: r.name, x: r.x, z: r.z }); }
  return out;
}

/* ---------- F ---------- */
const _getInteract = getInteract;
getInteract = function () {
  if (!SIMSIDE && running && !pl.dead && inIsl(pl.x, pl.z) && !pl.carry && !pl.ride) {
    const near = (o, r) => dist2(pl.x, pl.z, o.x, o.z) < r;
    if (amHid()) return { l: '🚪 Вийти з шафи', fn: () => { const s = mySt(), c = CABS[s.h - 1]; req('hide', { off: 1 }); if (c) { pl.x = c.s.x; pl.z = c.s.z; V.lastP = null; } } };
    if (amDown()) return { l: '🆘 Ти лежиш — чекай, поки піднімуть', fn: () => { } };
    if (V.act) return { l: `${V.act.what === 'revive' ? '💪 Піднімаю' : V.act.what === 'fuse' ? '⚡ Вмикаю' : '🔍 Шукаю'}… ${Math.round(V.act.t / V.act.need * 100)}%`, fn: () => { } };
    if (!ST.on) { if (near(CLOCK, 1.6)) return { l: '🌙 Відбити картку — почати нічну зміну', fn: () => { req('start'); sfx('ding'); } }; }
    else {
      for (const m of downedMates()) if (near(m, 1.8)) return { l: `💪 Підняти ${escapeHTML(m.k)} (тримайся поруч 3 с)`, fn: () => startAct({ what: 'revive', who: m.k, need: 3 }) };
      for (const i of ST.bats) if (near(BAT_SPOTS[i], 1.3)) return { l: '🔋 Взяти батарейку (+60%)', fn: () => req('bat', { i }) };
      if (!ST.note && near(NOTE_SPOTS[ST.noteAt], 1.4)) return { l: '📝 Прочитати стікер на ' + NOTE_SPOTS[ST.noteAt].n, fn: () => req('note') };
      for (const [i, c] of CARD_SPOTS.entries()) if (!ST.cs[i] && !ST.card && near(c, 1.3)) return { l: `🔍 Обшукати: ${c.ic} ${c.n} (1,2 с)`, fn: () => startAct({ what: 'search', i, need: 1.2 }) };
      if (!ST.edoor && near(ELEC, 1.6)) return ST.card === myKey() ? { l: '🔑 Відчинити електрощитову карткою', fn: () => req('edoor') } : { l: ST.card ? `🔒 Щитова — картка в ${escapeHTML(ST.card)}` : '🔒 Щитова зачинена — потрібна 🔑 картка', fn: () => req('edoor') };
      if (ST.edoor && !ST.power) for (const [i, b] of BREAKERS.entries()) if (near(b, 1)) return { l: `${b.ic} Увімкнути ${b.n} рубильник (1 с)`, fn: () => startAct({ what: 'fuse', i, need: 1 }) };
      if (!ST.exit && near(EXIT, 1.8)) return ST.power ? { l: '🚪 Відчинити вихідні двері — ТІКАЄМО!', fn: () => req('exit') } : { l: '🔒 Вихід знеструмлено — спершу щиток ⚡', fn: () => toast('Двері на електрозамку. Увімкни щиток в електрощитовій (потрібна 🔑 картка й порядок зі 📝 стікера).') };
      for (const [i, c] of CABS.entries()) if (near(c.s, 1.2)) return { l: c.k === 'desk' ? '🫥 Сховатися під столом' : c.k === 'wc' ? '🚽 Сховатися в кабінці' : '🫥 Сховатися в шафі', fn: () => req('hide', { i }) };
    }
  }
  return _getInteract.apply(this, arguments);
};
const _updInput = updInput;
updInput = function () {
  _updInput.apply(this, arguments);
  if (running && ST.on && inIsl(pl.x, pl.z)) {
    if (amDown() || amHid()) { input.mx = 0; input.mz = 0; }
    else if (keys.KeyZ) { input.mx *= .42; input.mz *= .42; }
  }
};
A.key('KeyL', () => { if (!running || !ST.on || !inIsl(pl.x, pl.z)) return false; const s = mySt(); if (!s || s.d) return; if (!s.l && s.b <= 0) { toast('🔦 Батарейка сіла — шукай 🔋.'); return; } req('light', { on: s.l ? 0 : 1 }); sfx('ui'); });

/* ---------- Підказки: підписи (лише поруч або в промені), «що робити» і стрілка ---------- */
const PLACES = [
  { id: 'clock', p: CLOCK, y: 2.2, t: '🌙 Табельний — почати зміну (F)', on: () => !ST.on, always: 1 },
  { id: 'exit', p: EXIT, y: 2.3, t: () => ST.power ? '🚪 EXIT — тікай!' : '🚪 Вихід (знеструмлено)' },
  { id: 'elec', p: ELEC, y: 2.2, t: () => ST.edoor ? '⚡ Електрощитова' : '🔒 Електрощитова' },
  ...BREAKERS.map((b, i) => ({ id: 'brk' + i, p: b, y: 2, t: `${b.ic} Рубильник`, on: () => ST.on && ST.edoor && !ST.power })),
  ...CARD_SPOTS.map((c, i) => ({ id: 'card' + i, p: c, y: 2, t: () => ST.cs[i] ? `${c.ic} порожньо` : `${c.ic} ${c.n}`, on: () => ST.on && !ST.card })),
  ...CABS.map((c, i) => ({ id: 'cab' + i, p: c.s, y: 2.4, t: c.k === 'desk' ? '🫥 Під стіл' : c.k === 'wc' ? '🚽 Кабінка' : '🫥 Шафа', on: () => ST.on })),
  ...BAT_SPOTS.map((b, i) => ({ id: 'bat' + i, p: b, y: 1, t: '🔋', on: () => ST.on && ST.bats.includes(i) })),
  { id: 'note', p: { get x() { return NOTE_SPOTS[ST.noteAt].x; }, get z() { return NOTE_SPOTS[ST.noteAt].z; } }, y: 1.9, t: '📝 Стікер', on: () => ST.on && !ST.note },
];
function goal() {
  const d = o => dist2(pl.x, pl.z, o.x, o.z), s = mySt();
  if (!ST.on) return { id: 'clock', tg: CLOCK, txt: 'Підійди до <b>🌙 табельного апарата</b> (🛎️ вестибюль, права стіна біля входу) і натисни <b>F</b> — починається нічна зміна.' };
  if (amHid()) return { txt: `🫥 Ти ${HIDE_N[(CABS[mySt().h - 1] || {}).k] || 'в схованці'}: тебе не бачать і не чують. <b>F</b> — вийти, коли стихне.` };
  if (amDown()) return { txt: '🆘 Тебе схопили! Лежиш і кличеш кентів — хай підійдуть і потримають <b>F</b> поруч.' };
  if (V.act) return { txt: `${V.act.what === 'revive' ? '💪 Піднімаю друга' : V.act.what === 'fuse' ? '⚡ Вмикаю рубильник' : '🔍 Обшукую'} ${Math.round(V.act.t / V.act.need * 100)}% — не відходь!` };
  const mates = downedMates(); if (mates.length) { const m = mates.reduce((a, b) => d(a) < d(b) ? a : b); return { id: 'mate', tg: m, txt: `🆘 <b>${escapeHTML(m.k)}</b> лежить! Біжи, натисни <b>F</b> поруч і тримайся 3 с.` }; }
  if (s && s.b < 25 && ST.bats.length) { const i = ST.bats.reduce((a, b) => d(BAT_SPOTS[a]) < d(BAT_SPOTS[b]) ? a : b); return { id: 'bat' + i, tg: BAT_SPOTS[i], txt: `🔦 Батарейка ${Math.round(s.b)}%! Біжи по <b>🔋</b> (F).` }; }
  if (ST.power) return ST.exit ? { id: 'exit', tg: { x: BX, z: BZ + 13.5 }, txt: '🏃 Двері відчинені — <b>вибігай надвір!</b>' } : { id: 'exit', tg: EXIT, txt: '💡 Світло є! Біжи до <b>🚪 EXIT</b> (🛎️ вестибюль, південь) й натисни <b>F</b>.' };
  if (!ST.card) {
    let best = -1; CARD_SPOTS.forEach((c, i) => { if (!ST.cs[i] && (best < 0 || d(c) < d(CARD_SPOTS[best]))) best = i; });
    if (best >= 0) return { id: 'card' + best, tg: CARD_SPOTS[best], txt: `🔑 Шукай <b>картку доступу</b>: обшукай ${CARD_SPOTS[best].ic} ${CARD_SPOTS[best].n} — ${roomN(CARD_SPOTS[best])} (<b>F</b>). Світи на зомбі — вони завмирають. Або просто доживи до 06:00.` };
  }
  if (!ST.note) {
    const n = NOTE_SPOTS[ST.noteAt]; if (d(n) < 5) V.seenNote.add(ST.noteAt);
    const cand = NOTE_SPOTS.map((q, i) => i).filter(i => !V.seenNote.has(i) || i === ST.noteAt);
    for (const i of cand) if (i !== ST.noteAt && d(NOTE_SPOTS[i]) < 2.5) V.seenNote.add(i);
    const i = cand.reduce((a, b) => d(NOTE_SPOTS[a]) < d(NOTE_SPOTS[b]) ? a : b);
    return { id: i === ST.noteAt && V.seenNote.has(i) ? 'note' : 'notec', tg: NOTE_SPOTS[i], txt: `📝 Знайди <b>жовтий стікер</b> з порядком рубильників — подивись на ${NOTE_SPOTS[i].n}.` };
  }
  if (!ST.edoor) return ST.card === myKey() ? { id: 'elec', tg: ELEC, txt: '🔑 Картка в тебе! Відчини <b>електрощитову</b> (⚡ коридор, західний край) — F біля дверей.' } : { id: 'elec', tg: ELEC, txt: `🔑 Картка в <b>${escapeHTML(ST.card)}</b> — прикривай ліхтариком, поки відчиняє щитову.` };
  if (ST.ord) { const i = ST.ord[ST.fz]; return { id: 'brk' + i, tg: BREAKERS[i], txt: `⚡ Рубильники по черзі: ${ordTxt(ST.ord)}. Зараз — <b>${BREAKERS[i].ic} ${BREAKERS[i].n}</b> (F, 1 с).` }; }
  return { id: 'brk0', tg: BREAKERS[0], txt: '⚡ Порядку не знаєш — можна вгадувати, але помилка ГУЧНА.' };
}
function guide() {
  if (!V.lbl) {
    V.lbl = document.createElement('div'); V.lbl.style.cssText = 'position:fixed;inset:0;z-index:2;pointer-events:none';
    const css = document.createElement('style');
    css.textContent = `.ns-lbl{position:absolute;left:0;top:0;padding:3px 9px;border-radius:10px;background:rgba(26,16,48,.82);color:#E9E2FA;font:700 12px/1.3 system-ui,sans-serif;white-space:nowrap;transform:translate(-50%,-100%);transition:opacity .2s}
      .ns-lbl.goal{background:#FFE066;color:#2E2346;font-size:14px;box-shadow:0 0 0 3px rgba(255,224,102,.35),0 6px 16px rgba(0,0,0,.4);animation:nsB .8s ease-in-out infinite alternate}
      .ns-lbl.room{background:rgba(233,226,250,.8);color:#2E2346;font:800 11px/1.2 system-ui,sans-serif;padding:2px 8px;border-radius:7px}
      @keyframes nsB{to{margin-top:-6px}}`;
    document.head.appendChild(css); document.body.appendChild(V.lbl);
    V.rooms = ROOMS.filter(r => !/Коридор/.test(r.n)).map(r => { const e = document.createElement('div'); e.className = 'ns-lbl room'; e.textContent = r.n; V.lbl.appendChild(e); return { r, e, c: L((r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2) }; });
    for (const P of PLACES) { P.el = document.createElement('div'); P.el.className = 'ns-lbl'; V.lbl.appendChild(P.el); }
    V.glbl = document.createElement('div'); V.glbl.className = 'ns-lbl goal'; V.lbl.appendChild(V.glbl);
    V.gArrow = new THREE.Group(); const sh = mesh(new THREE.ConeGeometry(.28, .7, 3), bulb('#FFE066'), false); sh.rotation.z = -Math.PI / 2; sh.position.x = 1.25; V.gArrow.add(sh); scene.add(V.gArrow);
    V.gMark = new THREE.Mesh(new THREE.TorusGeometry(.6, .07, 6, 24), new THREE.MeshBasicMaterial({ color: '#FFE066', transparent: true, opacity: .9, depthWrite: false })); V.gMark.rotation.x = Math.PI / 2; scene.add(V.gMark);
  }
  const show = running && !pl.dead && !panel && inIsl(pl.x, pl.z);
  V.lbl.style.display = show ? '' : 'none';
  const g = show ? goal() : { txt: '' }; V.goal = g;
  V.gArrow.visible = V.gMark.visible = !!(show && g.tg);
  if (!show) return;
  const pos = (el, x, y, z) => { const q = screenPos(x, y, z); el.style.display = q.vis ? '' : 'none'; el.style.transform = `translate(${Math.round(q.x)}px,${Math.round(q.y)}px) translate(-50%,-100%)`; };
  const s = mySt(), lightOn = s && s.l && s.b > 0 && !s.d && !s.h;
  const seen = o => { const dd = dist2(pl.x, pl.z, o.x, o.z); if (!ST.on || ST.power || dd < 4) return true; return lightOn && dd < LIGHT_R && Math.abs(wrapA(Math.atan2(o.x - pl.x, o.z - pl.z) - V.fa)) < LIGHT_A + .2 && los(pl.x, pl.z, o.x, o.z); };
  // назви кімнат: видно при світлі, у самій кімнаті або коли туди світиш
  const myRoom = roomAt(pl.x, pl.z);
  for (const q of V.rooms) { const on = !ST.on || ST.power || q.r === myRoom || seen(q.c); q.e.style.opacity = on ? 1 : 0; if (on) pos(q.e, q.c.x, 1.5, q.c.z); }
  for (const P of PLACES) {
    const on = (!P.on || P.on()) && P.id !== g.id && (P.always || seen(P.p));
    P.el.style.opacity = on ? 1 : 0;
    if (on) { const t = typeof P.t === 'function' ? P.t() : P.t; if (P.el.textContent !== t) P.el.textContent = t; pos(P.el, P.p.x, P.y, P.p.z); }
  }
  V.glbl.style.opacity = g.tg ? 1 : 0;
  if (g.tg) {
    const P = PLACES.find(q => q.id === g.id), t = '👉 ' + (P ? (typeof P.t === 'function' ? P.t() : P.t) : g.id === 'mate' ? '🆘 Підніми!' : g.id === 'notec' ? '📝 Може, тут?' : 'Сюди');
    if (V.glbl.textContent !== t) V.glbl.textContent = t; pos(V.glbl, g.tg.x, 2.8, g.tg.z);
    const d = dist2(pl.x, pl.z, g.tg.x, g.tg.z);
    V.gMark.position.set(g.tg.x, .1, g.tg.z); V.gMark.scale.setScalar(1 + Math.sin(gameTime * 5) * .12);
    V.gArrow.visible = d > 2.2; V.gArrow.position.set(pl.x, .15, pl.z); V.gArrow.rotation.y = -Math.atan2(g.tg.z - pl.z, g.tg.x - pl.x);
  }
}
/* коротка інструкція при першому вході */
function intro(force) {
  const d = A.data(); if ((d.intro && !force) || SIMSIDE || document.getElementById('ns-intro')) return;
  const el = document.createElement('div'); el.id = 'ns-intro';
  el.style.cssText = 'position:fixed;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;background:rgba(5,3,14,.7);padding:16px';
  el.innerHTML = `<div style="max-width:460px;width:100%;background:#1A1030;color:#E9E2FA;border-radius:18px;padding:18px 20px;font:14px/1.5 system-ui,sans-serif;box-shadow:0 12px 40px rgba(0,0,0,.6);border:1px solid #4E4A6E">
    <div style="font:800 20px system-ui;margin-bottom:8px">🔦 Нічна зміна — як вижити</div>
    <div>1. <b>🌙 Старт</b>: табельний апарат у вестибюлі — <b>F</b>. Світло гасне, годинник іде від 00:00 до 06:00.</div>
    <div>2. <b>🔦 Ліхтарик</b> світить туди, куди мишка. <b>L</b> — увімкнути/вимкнути. Батарейка сідає — бери 🔋.</div>
    <div>3. <b>🧟 Зомбі-офісники</b> рухаються лише в темряві: посвітиш — завмирають. Відвернувся — підкрадаються.</div>
    <div>4. <b>🧹 Прибиральник</b> полює на звук: біг гучний, <b>Z</b> — крастися тихо. Шафа (<b>F</b>) — сховатися.</div>
    <div>5. <b>🆘</b> Схопили — лежиш. Друзі піднімають (<b>F</b> поруч, 3 с). Схопили всіх — програш.</div>
    <div>6. <b>🏃 Втеча</b>: 🔑 картка → 📝 стікер з порядком → ⚡ рубильники в щитовій → 🚪 EXIT. Або просто доживи до ранку.</div>
    <div style="margin-top:8px;color:#FFE066">Жовта стрілка під ногами й жовта панель унизу підкажуть, що робити зараз.</div>
    <button class="btn" style="margin-top:12px;width:100%">Зрозуміло. Не вимикаю ліхтарик!</button></div>`;
  document.body.appendChild(el);
  el.querySelector('button').addEventListener('click', () => { el.remove(); d.intro = 1; save(); });
}

/* ---------- HUD: годинник, батарейка, шум, чекліст ---------- */
function clockTxt(t) { const m = Math.floor(clamp(t / (ST.dur || DUR), 0, 1) * 360); return `0${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`; }
function hud() {
  if (!V.hud) {
    V.goalEl = document.createElement('div'); V.goalEl.id = 'ns-goal';
    V.goalEl.style.cssText = 'position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 150px);transform:translateX(-50%);z-index:3;pointer-events:none;background:#FFE066;color:#2E2346;border-radius:12px;padding:7px 14px;font:700 14px/1.4 system-ui,sans-serif;text-align:center;box-shadow:0 6px 18px rgba(0,0,0,.4);width:max-content;max-width:min(560px,90vw)';
    document.body.appendChild(V.goalEl);
    V.hud = document.createElement('div'); V.hud.id = 'ns-hud';
    V.hud.style.cssText = 'position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 64px);transform:translateX(-50%);z-index:3;pointer-events:none;background:rgba(26,16,48,.9);color:#E9E2FA;border-radius:14px;padding:7px 14px;font:700 13px/1.45 system-ui,sans-serif;text-align:center;box-shadow:0 6px 18px rgba(0,0,0,.4);max-width:94vw';
    document.body.appendChild(V.hud);
  }
  const show = running && !pl.dead && !panel && inIsl(pl.x, pl.z);
  V.hud.style.display = show ? '' : 'none'; V.goalEl.style.visibility = show ? '' : 'hidden';
  if (!show) return;
  let h;
  if (ST.on) {
    const s = mySt() || { b: 100, l: 0 }, b = Math.round(s.b), bc = b > 50 ? '#7FE08A' : b > 20 ? '#FFD27A' : '#FF5C7A';
    const bar = `<span style="color:${bc}">${'▮'.repeat(Math.ceil(b / 20))}</span><span style="opacity:.3">${'▮'.repeat(5 - Math.ceil(b / 20))}</span>`;
    const nz = V.noise > 1 ? '<span style="color:#FF5C7A">🔊 ГУЧНО</span>' : V.noise > .3 ? '<span style="color:#FFD27A">👣 кроки</span>' : '<span style="color:#7FE08A">🤫 тихо</span>';
    const ck = (ok, txt) => `<span style="opacity:${ok ? .55 : 1}">${ok ? '☑' : '☐'} ${txt}</span>`;
    const team = Object.entries(ST.pl).filter(([k, q]) => q.d || q.h).map(([k, q]) => q.d ? `<span style="color:#FF5C7A">🆘 ${k === myKey() ? 'ти' : escapeHTML(k)}</span>` : `🫥 ${k === myKey() ? 'ти' : escapeHTML(k)} у шафі`).join(' · ');
    const cl = ST.en.some(e => e.t);
    h = `🌙 НІЧНА ЗМІНА · 🕐 <b style="font-size:15px">${clockTxt(ST.t)}</b> / 06:00 · 🔦 ${s.l && s.b > 0 ? '' : '<span style="color:#FF8A7A">вимк.</span> '}${bar} ${b}% · ${nz}<br>
      <span style="font-weight:600;font-size:12px">${ck(ST.card, '🔑 картка' + (ST.card ? ` (${ST.card === myKey() ? 'у тебе' : escapeHTML(ST.card)})` : ''))} · ${ck(ST.note, '📝 стікер' + (ST.ord ? ': ' + ordTxt(ST.ord) : ''))} · ${ck(ST.edoor, '🚪 щитова')} · ${ck(ST.power, `⚡ щиток ${ST.fz}/3`)} · ${ck(ST.exit, '🏃 вихід')}</span>
      <br><span style="font-weight:600;font-size:12px;opacity:.85">🧟 ${ST.en.filter(e => !e.t).length}${cl ? ' · 🧹 прибиральник на зміні' : ''}${team ? ' · ' + team : ''}</span>`;
  } else h = '🌙 Нічна зміна · <span style="font-weight:600">офіс ще світиться — відбий картку на табельному (F), щоб почати</span>';
  const gt = V.goal && V.goal.txt ? `👉 ${V.goal.txt}` : ''; V.goalEl.style.display = gt ? '' : 'none'; if (V.goalEl.innerHTML !== gt) V.goalEl.innerHTML = gt;
  if (V.hud.innerHTML !== h) V.hud.innerHTML = h;
}

/* ---------- Звуки: дзвінок, принтер, шум монітора, «хап!» ---------- */
if (!SIMSIDE && typeof SFXD !== 'undefined') {
  SFXD.nsPhone = (t, o) => { for (let k = 0; k < 6; k++) { tone(t + k * .32, o, 'square', 1250, 1250, .14, .05); tone(t + k * .32 + .02, o, 'square', 980, 980, .12, .04); } };
  SFXD.nsPrint = (t, o) => { for (let k = 0; k < 8; k++) noiz(t + k * .14, o, 'bandpass', 1800 + (k % 2) * 600, 900, .1, .1, 2); tone(t, o, 'sawtooth', 70, 60, 1.2, .03); };
  SFXD.nsStatic = (t, o) => { noiz(t, o, 'highpass', 2500, 7000, .7, .1); tone(t, o, 'sawtooth', 55, 50, .7, .05); tone(t + .1, o, 'square', 1760, 1760, .08, .04); };
  SFXD.nsGrab = (t, o) => { tone(t, o, 'sawtooth', 820, 180, .45, .1); noiz(t, o, 'lowpass', 1200, 200, .4, .3); tone(t + .05, o, 'square', 140, 60, .3, .08); };
}
function nsSfx(n, x, z) { if (typeof SFXD !== 'undefined' && SFXD[n]) sfx(n, x, z); }

/* ---------- Музика: гул, серцебиття ближче до зомбі, дзвіночки «музичної скриньки» ---------- */
const NROOT = [33, 34, 33, 31];
if (!SIMSIDE && typeof scheduleStep === 'function') {
  const _ss = scheduleStep;
  scheduleStep = function (i, t) {
    if (!running || pl.dead || !inIsl(pl.x, pl.z) || typeof LAYER === 'undefined' || !LAYER.drums) { if (V.music >= 0) { V.music = -1; barMode = ''; } return _ss.apply(this, arguments); }
    const s = i % 16, bar = Math.floor(i / 16);
    const chased = ST.on && (V.near < 5 || ST.en.some(e => e.st === 'chase' && dist2(e.x, e.z, pl.x, pl.z) < 9));
    const lvl = !ST.on ? 0 : ST.power ? 1 : chased ? 3 : 2;
    if (s === 0 && V.music !== lvl) { V.music = lvl; const m = [{ keys: .55, bass: .5, drums: .2, tension: 0, lead: 0, crackle: .3 }, { keys: .6, bass: .8, drums: .7, tension: .3, lead: .3, crackle: .1 }, { keys: .4, bass: .9, drums: .7, tension: .35, lead: 0, crackle: .4 }, { keys: .35, bass: 1, drums: 1, tension: .85, lead: 0, crackle: .2 }][lvl]; for (const k in m) if (LAYER[k]) LAYER[k].gain.setTargetAtTime(m[k], t, .5); }
    const root = NROOT[bar % 4];
    if (lvl === 0) { if (s === 0) [57, 60, 64].forEach((n, k) => epiano(t + k * .03, n + (bar % 2 ? -2 : 0), 3, .03, LAYER.keys)); if (s === 0 || s === 8) bassNote(t, 41 - (bar % 2) * 2, STEP * 7, .2); return; }
    if (s === 0) bassNote(t, root, STEP * 15, lvl === 3 ? .5 : .38);                          // гул
    if (s === 8 && bar % 2) bassNote(t, root + 1, STEP * 7, .25);                              // мала секунда — моторошно
    // серцебиття: що ближче ворог, то частіше
    const ev = V.near < 4 ? 2 : V.near < 8 ? 4 : V.near < 14 ? 8 : 16;
    if (s % ev === 0) { kick(t, lvl === 3 ? .8 : .55); kick(t + .13, lvl === 3 ? .5 : .35); }
    if (s === 0 && bar % 2 === 0) [57, 58, 64].forEach((n, k) => epiano(t + k * .05, n, 2.6, .022, LAYER.keys));
    if ([3, 11].includes(s) && Math.random() < .22) steel(t, pick([81, 82, 85, 88, 89]), .03);
    if (lvl === 3 && s % 2 === 0) pulse(t, root + 24 + (s % 8 === 6 ? 1 : 0), STEP * .9, .05);
    if (lvl === 3 && s % 4 === 2) hat(t, .03);
    if (lvl === 1) { if (s === 4 || s === 12) snare(t, .2); if (s % 2 === 0) hat(t, .03); if (bar % 2 === 0 && s === 8) leadNote(t, 69, STEP * 6, .03); }
  };
}

/* ---------- Режим у паузі, вкладка, картка в меню ---------- */
function goNight() {
  const f = $('#fade'); closePanel(); if (f) f.style.opacity = 1; sfx('travel');
  setTimeout(() => { pl.x = SPAWN.x; pl.z = SPAWN.z; pl.y = 0; pl.falling = false; pl.jump = null; pl.safe = { x: SPAWN.x, z: SPAWN.z }; V.lastP = null; camPos.set(pl.x, 20, pl.z + 15); camLook.set(pl.x, .5, pl.z); if (f) f.style.opacity = 0;
    toast(ST.on ? '🌙 Ніч уже йде — тримайся кентів і не вимикай ліхтарик!' : '🌙 Офіс «Гущі», 23:59. Відбий картку на табельному (F), щоб почати нічну зміну.'); intro(); }, 260);
  return true;
}
function leaveNight() { if (amHid()) req('hide', { off: 1 }); V.act = null; if (hero) hero.root.visible = true; return true; }
if (A.mode) A.mode({ id: 'nightshift', ic: '🔦', n: 'Нічна зміна', sub: 'кооп-хорор на 1–4: ліхтарик, зомбі, прибиральник', go: goNight, here: () => running && inIsl(pl.x, pl.z), leave: leaveNight });
A.tab('nightshift', '🔦 Нічна зміна', () => {
  const d = A.data(), here = inIsl(pl.x, pl.z);
  return `<h3>🔦 Нічна зміна · Не вимикай ліхтарик</h3>
    <p style="font-size:13px;line-height:1.5;margin:4px 0 10px">Кооп-хорор на 1–4 гравці. Офіс уночі, світла нема, а зомбі-офісники ще не закінчили квартальний звіт. Доживи до 06:00 — або втечи раніше.</p>
    <div class="btns"><button class="btn alt" data-ns="help">❓ Як грати</button>${here ? '' : '<button class="btn" data-ns="go">🔦 В офіс</button>'}</div>
    <div class="list" style="margin-top:10px;font-size:13px;line-height:1.55">
      <div>🔦 <b>Ліхтарик</b> світить за мишкою, <b>L</b> — вимк./увімк. Сідає ~2 хв; 🔋 батарейки світяться в темряві (+60%).</div>
      <div>🧟 <b>Зомбі-офісники</b> рухаються лише в темряві. На світлі — завмирають; довго світиш — тікають.</div>
      <div>🧹 <b>Нічний прибиральник</b> чує кроки й ривки. <b>Z</b> — крастися. Шафа (<b>F</b>) — сховатися, тебе не знайдуть.</div>
      <div>🆘 <b>Схопили</b> — лежиш, друзі піднімають (<b>F</b> поруч, 3 с). Усіх схопили — зміну провалено.</div>
      <div>🏃 <b>Втеча</b>: 🔑 картка (в одному з 6 місць) → 📝 стікер з порядком → 🚪 щитова → ⚡ три рубильники → 🚪 EXIT.</div>
      <div>👻 Монітори з «ДЕДЛАЙН», принтер, що друкує сам, дзвінок у кабінеті, ліфт — це просто офіс уночі. Мабуть.</div>
    </div>
    <p class="muted" style="font-size:12px;margin-top:10px">Змін: ${d.nights || 0} · вижили: ${d.wins || 0} · втеч: ${d.escapes || 0} · найпізніше: ${clockTxt((d.best || 0) / 360 * DUR)}</p>`;
}, e => {
  const b = e.target.closest('[data-ns]'); if (!b) return;
  if (b.dataset.ns === 'help') { closePanel(); intro(true); } else goNight();
});
if (!SIMSIDE && typeof document !== 'undefined') {
  const box = document.querySelector('#main-menu .mm-container');
  if (box && !document.getElementById('mm-nightshift')) {
    const card = document.createElement('div'); card.className = 'mm-card'; card.id = 'mm-nightshift';
    card.innerHTML = `<div class="mm-img-wrap"><div class="mm-card-img" style="background-image:url('menu/nightshift-bg.jpg'),url('addons/nightshift/nightshift-bg.jpg'),radial-gradient(circle at 30% 60%,rgba(255,240,180,.85) 0,rgba(255,240,180,.25) 18%,transparent 34%),linear-gradient(160deg,#1A1030,#2E2346 55%,#0B0716)"></div></div>
      <div class="mm-card-body"><h2>НІЧНА ЗМІНА</h2><div class="mm-subtitle">Не вимикай ліхтарик</div>
      <div class="mm-desc">Темний офіс, зомбі-офісники й нічний прибиральник. Доживи до 06:00 разом із кентами.</div></div>`;
    const locked = [...box.children].filter(c => c.classList.contains('mm-locked')).pop();
    box.insertBefore(card, locked || null);
    card.addEventListener('click', () => {
      V.auto = true; if (running) goNight();
      const mm = document.getElementById('main-menu'); if (mm) { mm.classList.add('mm-hide'); mm.addEventListener('transitionend', () => mm.remove(), { once: true }); }
    });
  }
}
A.on('start', () => { if (V.auto && !SIMSIDE) setTimeout(goNight, 700); });
if (window.__ADDON_TEST) window.__nightshift = { ST, AU, V, SPAWN, CLOCK, EXIT, ELEC, BREAKERS, CARD_SPOTS, NOTE_SPOTS, BAT_SPOTS, CABS, WAYS, EN_SPAWN, goal, intro, req, onReq, litBy, los, inB, grid, cellOf, freeNear, addEnemy, startNight, endNight, myKey, solids, FURN, FURN_L, WALLS, DOORS, ROOMS, roomAt, MONITORS };
