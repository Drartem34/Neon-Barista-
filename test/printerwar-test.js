// Тест PVP-режиму «Битва за принтер» у грі без сервера.
// Запуск: node test/printerwar-test.js
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
w.__ADDON_CODE = [{ id: 'printerwar', src: 'printerwar/addon.js', code: fs.readFileSync(path.join(root, 'addons/_examples/printerwar/addon.js'), 'utf8') }];
let src = fs.readdirSync(path.join(root, 'src')).filter(f => f.endsWith('.js')).sort().map(f => fs.readFileSync(path.join(root, 'src', f), 'utf8')).join('\n');
src += ';window.__T={get MODES(){return MODES},get paused(){return paused},get running(){return running},get P(){return P},pl,MON,PROPS,BODIES,ADDONS,ISLMAP,startGame,frame,openPanel,closePanel,get panel(){return panel},getInteract:()=>getInteract(),terrainAt:(x,z)=>terrainAt(x,z),nearBar:()=>nearBar(),input,renderPanel,keydown:c=>dispatchEvent(new KeyboardEvent("keydown",{code:c})),fireHook:h=>fireHook(h),releaseCarry:t=>releaseCarry(t),pickUpAny:t=>pickUpAny(t),damageProp:(p,d)=>damageProp(p,d),hurt:d=>hurtPlayer(d),dropLoot:(x,z,l)=>dropLoot(x,z,l),DROPS};';
w.eval(src);
const T = w.__T; let now = 1000;
const calm = () => { const F = w.__flight; if (F) { F.AU.stormT = 999; F.AU.failT = 999; F.ST.storms.length = 0; } };   // без випадкових гроз і поломок — тест передбачуваний
const step = s => { for (let i = 0; i < s * 60; i++) { now += 16.7; calm(); T.frame(now); if (i % 3 === 0) IV.forEach(f => f()); } };
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); process.exit(1); } console.log('ok -', m); };
const body = () => w.document.querySelector('#pbody');
const W = w.__printer;
assert(T.ADDONS.list.every(a => a.ok), 'аддон завантажився: ' + T.ADDONS.list.map(a => a.name + (a.ok ? '' : ' ✗ ' + a.err)).join(', '));
const pv = w.document.getElementById('mm-pvp'); pv.click();
assert(w.document.querySelector('#mm-pvp-pick [data-pm="printerwar"]'), 'PVP у головному меню → «Битва за принтер»');
w.document.querySelector('#mm-pvp-pick .x').click();
T.startGame(true); T.P.tut = -1; T.pl.hp = 9999; step(.3);
T.keydown('Escape'); step(.05); body().querySelector('[data-mode="printerwar"]').click(); step(.6);
let it = T.getInteract(); assert(it && /Записатися/.test(it.l), 'біля табло F — «Записатися на битву»'); it.fn(); step(.1);
assert(W.ST.ph === 'lobby', 'лобі'); step(2.5);
assert(W.ST.ph === 'fight' && W.ST.ps.length === 4 && W.ST.ps.filter(p => p.bot).length === 3, 'битва: я + 3 боти');
W.AU.evIn = 999;
T.pl.x = W.BOARD.x; T.pl.z = W.BOARD.z - 1.4;
{ let inside = false; for (let i = 0; i < 40 && !inside; i++) { step(.25); inside = W.ST.ps.some(p => p.bot && Math.hypot(p.x - W.PX, p.z - W.PZ) < W.ZONE + .3); } assert(inside, 'боти дійшли коридором і дверима до принтера'); }
const away = () => W.ST.ps.forEach((p, i) => { if (p.bot) { p.x = W.PX + 10; p.z = W.PZ + (i - 2) * 3; p.stun = 2; p.vx = p.vz = 0; } });
// стою сам — друкую
away(); T.pl.x = W.PX + 1.6; T.pl.z = W.PZ; let p0 = W.ST.ps.find(p => p.k === 'me').pages;
for (let i = 0; i < 20; i++) { away(); T.pl.x = W.PX + 1.6; T.pl.z = W.PZ; step(.1); }
const me = W.ST.ps.find(p => p.k === 'me');
assert(W.ST.owner === 'me' && me.pages >= p0 + 3, `сам біля принтера — друкую (${me.pages} 📄)`);
// бот у колі — тиснява, ніхто не друкує
{ const b = W.ST.ps.find(p => p.bot); let pg = me.pages; for (let i = 0; i < 15; i++) { b.x = W.PX - 1.6; b.z = W.PZ; b.stun = 0; b.cd = 9; T.pl.x = W.PX + 1.6; T.pl.z = W.PZ; step(.1); } assert(W.ST.owner === '*' && me.pages === pg, 'двоє в колі — «тиснява», ніхто не друкує'); 
  // штовхаю бота
  T.pl.x = b.x + 1.2; T.pl.z = b.z; T.pl.face = Math.atan2(b.x - T.pl.x, b.z - T.pl.z); b.stun = 0; const bx = b.x; W.shove(); step(.3); assert(b.stun > 0 || Math.abs(b.x - bx) > .5, 'ЛКМ штовхнув бота — відлетів'); }
// бот штовхає мене
{ const b = W.ST.ps.find(p => p.bot); away(); b.stun = 0; b.cd = 0; b.x = W.PX + 1; b.z = W.PZ + 1.2; T.pl.x = W.PX + 1; T.pl.z = W.PZ; const kx = T.pl.kx || 0, kz = T.pl.kz || 0; let pushed = false; for (let i = 0; i < 10 && !pushed; i++) { step(.05); if (Math.abs((T.pl.kx || 0) - kx) + Math.abs((T.pl.kz || 0) - kz) > 1 || Math.hypot(T.pl.x - W.PX - 1, T.pl.z - W.PZ) > .6) pushed = true; } assert(pushed, 'бот штовхнув мене від принтера'); }
// зажувало — лагоджу
W.ST.ev = ''; W.startEvent = W.startEvent; W.ST.ev = 'jam'; W.ST.evT = 12;
{ const pg = me.pages; away(); T.pl.x = W.PX + 1.6; T.pl.z = W.PZ; step(.1); it = T.getInteract(); assert(it && /зажований/.test(it.l), 'принтер зажувало — F «Витягти папір»'); it.fn(); for (let i = 0; i < 30 && W.ST.ev === 'jam'; i++) { away(); T.pl.x = W.PX + 1.6; T.pl.z = W.PZ; step(.1); } assert(W.ST.ev === '' && me.pages >= pg + 10, 'полагодив — +10 сторінок'); }
// дощ зі сторінок
W.ST.ev = ''; W.ST.sheets.length = 0; w.Math.random = (r => () => .45)(w.Math.random);
{ let k = 0; while (W.ST.ev !== 'rain' && k++ < 30) { W.ST.ev = ''; W.startEvent(); if (W.ST.ev !== 'rain') W.ST.sheets.length = 0; } }
assert(W.ST.sheets.length === 8, 'дощ зі сторінок — 8 аркушів на підлозі');
{ const s = W.ST.sheets[0], pg = me.pages; away(); T.pl.x = s.x; T.pl.z = s.z; step(.2); assert(me.pages >= pg + 4, 'підібрав аркуш — +4'); }
// начальник: біля принтера — мінус
W.ST.ev = 'boss'; W.ST.evT = 7; W.ST.sheets.length = 0;
{ const pg = me.pages; for (let i = 0; i < 15; i++) { away(); T.pl.x = W.PX + 1.6; T.pl.z = W.PZ; step(.1); } assert(me.pages < pg, `👔 начальник — біля принтера втрачаєш сторінки (${pg} → ${me.pages})`); }
W.ST.ev = '';
// кінець: набрав 100
const c0 = T.P.coins; me.pages = W.GOAL - 1;
for (let i = 0; i < 20 && W.ST.ph === 'fight'; i++) { away(); T.pl.x = W.PX + 1.6; T.pl.z = W.PZ; step(.1); }
assert(W.ST.ph === 'end' && W.ST.res[0][0] === 'me', `${W.GOAL} сторінок — перемога`);
assert(T.P.coins > c0 && T.P.addons.printerwar.wins === 1, `нагорода +${T.P.coins - c0} 🪙`);
step(9); assert(W.ST.ph === 'idle', 'принт-рум вільний для нового раунду');
console.log('ALL OK'); process.exit(0);
