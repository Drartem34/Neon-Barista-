// Тест PVP-режиму «Гонки на офісних кріслах» у грі без сервера.
// Запуск: node test/chairrace-test.js
const fs = require('fs'), path = require('path');
const { JSDOM } = require('jsdom');
const THREE = require('three');
const root = path.join(__dirname, '..');
const dom = new JSDOM(fs.readFileSync(path.join(root, 'src/00_shell.html'), 'utf8') + '</body></html>', { pretendToBeVisual: true, runScripts: 'outside-only', url: 'https://example.org/' });
const w = dom.window;
class FakeRenderer { constructor() { this.shadowMap = {}; } setPixelRatio() { } setSize() { } render() { } }
w.THREE = Object.assign({}, THREE, { WebGLRenderer: FakeRenderer });
w.matchMedia = () => ({ matches: false }); w.requestAnimationFrame = () => 0; w.console.warn = () => { }; w.__NO_NET = true; w.__ADDON_TEST = true;
const IV = []; w.setInterval = (f, ms) => { if (ms <= 100) IV.push(f); return 0; };
w.setTimeout = f => { f(); return 0; };
w.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: (o, k) => k in o ? o[k] : () => { }, set: (o, k, v) => { o[k] = v; return true; } });
w.__ADDON_CODE = [{ id: 'chairrace', src: 'chairrace/addon.js', code: fs.readFileSync(path.join(root, 'addons/_examples/chairrace/addon.js'), 'utf8') }];
let src = fs.readdirSync(path.join(root, 'src')).filter(f => f.endsWith('.js')).sort().map(f => fs.readFileSync(path.join(root, 'src', f), 'utf8')).join('\n');
src += ';window.__T={get MODES(){return MODES},get paused(){return paused},get running(){return running},get P(){return P},pl,MON,PROPS,BODIES,ADDONS,ISLMAP,startGame,frame,openPanel,closePanel,get panel(){return panel},getInteract:()=>getInteract(),terrainAt:(x,z)=>terrainAt(x,z),nearBar:()=>nearBar(),input,renderPanel,keydown:c=>dispatchEvent(new KeyboardEvent("keydown",{code:c})),fireHook:h=>fireHook(h),releaseCarry:t=>releaseCarry(t),pickUpAny:t=>pickUpAny(t),damageProp:(p,d)=>damageProp(p,d),hurt:d=>hurtPlayer(d),dropLoot:(x,z,l)=>dropLoot(x,z,l),DROPS};';
w.eval(src);
const T = w.__T; let now = 1000;
const calm = () => { const F = w.__flight; if (F) { F.AU.stormT = 999; F.AU.failT = 999; F.ST.storms.length = 0; } };   // без випадкових гроз і поломок — тест передбачуваний
const step = s => { for (let i = 0; i < s * 60; i++) { now += 16.7; calm(); T.frame(now); if (i % 3 === 0) IV.forEach(f => f()); } };
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); process.exit(1); } console.log('ok -', m); };
const body = () => w.document.querySelector('#pbody');
const R = w.__race;
assert(T.ADDONS.list.every(a => a.ok), 'аддон завантажився: ' + T.ADDONS.list.map(a => a.name + (a.ok ? '' : ' ✗ ' + a.err)).join(', '));
const pv = w.document.getElementById('mm-pvp');
assert(pv && !pv.classList.contains('mm-locked') && /Гонки/.test(pv.textContent), 'кнопка PVP у головному меню відкрита й показує «Гонки на кріслах»');
pv.click(); assert(w.document.querySelector('#mm-pvp-pick [data-pm="chairrace"]'), 'PVP → вибір режиму: є «Гонки на кріслах»');
w.document.querySelector('#mm-pvp-pick .x').click();
T.startGame(true); T.P.tut = -1; T.pl.hp = 9999; step(.3);
T.keydown('Escape'); step(.05);
assert(/🥊 PVP/.test(body().textContent) && body().querySelector('[data-mode="chairrace"]'), 'у меню паузи розділ PVP з гонками');
body().querySelector('[data-mode="chairrace"]').click(); step(.6);
assert(Math.hypot(T.pl.x - R.START.x, T.pl.z - R.START.z) < 2.2, 'переніс до старту траси');
let it = T.getInteract(); assert(it && /Записатися/.test(it.l), 'біля старту F — «Записатися на заїзд»'); it.fn(); step(.1);
assert(R.ST.ph === 'lobby' && R.ST.racers.length === 1, 'записався — лобі');
step(2.5); assert(R.ST.ph === 'count' && R.ST.racers.length === 4 && R.RC.on, 'боти зайняли місця, відлік, я в кріслі');
step(4); assert(R.ST.ph === 'race', 'ПОЇХАЛИ!');
// автопілот у тесті: тримаємо джойстик у бік траси попереду
const drive = s => { for (let i = 0; i < s * 20; i++) { const q = R.TR[(R.RC.idx + 7) % R.N], dx = q.x - R.RC.x, dz = q.z - R.RC.z, d = Math.hypot(dx, dz) || 1; T.input.jx = dx / d; T.input.jz = dz / d; step(.05); } T.input.jx = T.input.jz = 0; };
const x0 = R.RC.x, z0 = R.RC.z; drive(1.5);
assert(Math.hypot(R.RC.x - x0, R.RC.z - z0) > 6 && R.RC.lap === 0, `крісло їде (коло ${R.RC.lap + 1})`);
// стіна траси не випускає
{ const p = R.TR[R.RC.idx]; const sx = R.RC.x, sz = R.RC.z; R.RC.x += -p.dz * 6; R.RC.z += p.dx * 6; step(.05); const q = R.TR[R.RC.idx]; const lat = Math.abs(-(R.RC.x - q.x) * q.dz + (R.RC.z - q.z) * q.dx); assert(lat < 2.8, 'борти траси не випускають з траси'); }
// предмети
R.RC.item = 'coffee'; R.useItem(); assert(R.RC.boost > 1 && !R.RC.item, '☕ кава — прискорення');
R.RC.item = 'folder'; R.useItem(); step(.1); assert(R.ST.traps.length >= 1, '📁 папка — пастка на трасі');
{ const tp = R.ST.traps[R.ST.traps.length - 1]; R.RC.spin = 0; R.RC.x = tp.x; R.RC.z = tp.z; step(.1); assert(R.RC.spin > 0, 'наїхав на пастку — закрутило'); R.RC.spin = 0; }
{ const bot = R.ST.racers.find(r => r.bot); const p = R.TR[R.RC.idx]; R.RC.x = p.x; R.RC.z = p.z; R.RC.h = Math.atan2(p.dz, p.dx); bot.v = 0; R.RC.item = 'stapler'; R.RC.spin = 0; bot.x = R.RC.x + Math.cos(R.RC.h) * 4; bot.z = R.RC.z + Math.sin(R.RC.h) * 4; bot.spin = 0; R.useItem(); step(.3); assert(bot.spin > 0, '📎 степлер влучив у бота — закрутило'); }
R.RC.item = 'tea'; R.useItem(); step(.05); assert(R.ST.racers.some(r => r.bot && r.drunk > 0), '🍵 чай — лідер-бот п\'яніє');
// коробка з предметом
{ R.RC.item = ''; const p = R.TR[R.ITEM_SPOTS[1]]; R.RC.x = p.x; R.RC.z = p.z; R.RC.idx = R.ITEM_SPOTS[1]; R.RC.prev = R.RC.idx; step(.2); assert(R.RC.item, `коробка «?» дала предмет: ${R.RC.item}`); }
// проходимо 3 кола — фініш
{ const g = R.TR[R.N - 2]; R.RC.x = g.x; R.RC.z = g.z; R.RC.idx = R.N - 2; R.RC.prev = R.N - 2; R.RC.lap = 0; R.RC.spin = 0; }
let guard = 0; const c0 = T.P.coins;
while (R.ST.ph === 'race' && guard++ < 200) { R.RC.spin = 0; R.RC.drunk = 0; drive(1); if (R.RC.lap < 3 && guard % 3 === 0) { const g = R.TR[R.N - 3]; R.RC.x = g.x; R.RC.z = g.z; R.RC.idx = R.N - 3; R.RC.prev = R.N - 3; } }
assert(R.RC.fin || R.ST.ph !== 'race', `3 кола — фініш (коло ${R.RC.lap})`);
step(.5); assert(R.ST.ph === 'end' && R.ST.res[0], 'гонка скінчилась — є результати');
assert(T.P.coins > c0 && T.P.addons.chairrace.races === 1, `нагорода за місце: +${T.P.coins - c0} 🪙 (${R.ST.res.indexOf('me') + 1} місце)`);
assert(!R.RC.on, 'після фінішу встаєш з крісла');
step(9); assert(R.ST.ph === 'idle', 'траса знову вільна для нового заїзду');
console.log('ALL OK'); process.exit(0);
