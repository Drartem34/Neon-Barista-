// Тест бета-режиму «Кавовий рейс» у грі без сервера.
// Запуск: node test/flight-test.js
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
w.__ADDON_CODE = [{ id: 'flight', src: 'flight/addon.js', code: fs.readFileSync(path.join(root, 'addons/_examples/flight/addon.js'), 'utf8') }];
let src = fs.readdirSync(path.join(root, 'src')).filter(f => f.endsWith('.js')).sort().map(f => fs.readFileSync(path.join(root, 'src', f), 'utf8')).join('\n');
src += ';window.__T={get paused(){return paused},get running(){return running},get P(){return P},pl,MON,PROPS,BODIES,ADDONS,ISLMAP,startGame,frame,openPanel,closePanel,get panel(){return panel},getInteract:()=>getInteract(),terrainAt:(x,z)=>terrainAt(x,z),nearBar:()=>nearBar(),input,renderPanel,keydown:c=>dispatchEvent(new KeyboardEvent("keydown",{code:c})),fireHook:h=>fireHook(h),releaseCarry:t=>releaseCarry(t),pickUpAny:t=>pickUpAny(t),damageProp:(p,d)=>damageProp(p,d),hurt:d=>hurtPlayer(d),dropLoot:(x,z,l)=>dropLoot(x,z,l),DROPS};';
w.eval(src);
const T = w.__T; let now = 1000;
const step = s => { for (let i = 0; i < s * 60; i++) { now += 16.7; T.frame(now); if (i % 3 === 0) IV.forEach(f => f()); } };
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); process.exit(1); } console.log('ok -', m); };
const body = () => w.document.querySelector('#pbody');
assert(T.ADDONS.list.every(a => a.ok), 'аддон завантажився: ' + T.ADDONS.list.map(a => a.name + (a.ok ? '' : ' ✗ ' + a.err)).join(', '));
assert(w.document.querySelector('#mm-flight .mm-subtitle').textContent === 'Кавовий рейс', 'у меню картка «РЕЙС» (бета)');
const F = w.__flight;
T.startGame(true); T.P.tut = -1; T.pl.hp = 9999; step(.3);
T.keydown('Escape'); step(.05); body().querySelector('[data-mode="flight"]').click(); step(.5);
assert(Math.abs(T.pl.x - (F.DOOR.x + 1)) < .6, 'Esc → «Кавовий рейс» переносить на борт');
// посадка
T.pl.x = F.DOOR.x; T.pl.z = F.DOOR.z + .5; step(.1);
let it = T.getInteract(); assert(it && /посадку/.test(it.l), 'біля дверей F — «Оголосити посадку»'); it.fn(); step(.2);
assert(F.ST.on, 'рейс вилетів');
// стіни салону не випускають
T.pl.x = -30; T.pl.z = 118 + 4.5; step(.1); assert(Math.abs(T.pl.z - 118) < 2.6, 'з літака не випадеш (стіни салону)');
// пілот
T.pl.x = F.COCKPIT.x - .3; T.pl.z = F.COCKPIT.z; step(.1);
it = T.getInteract(); assert(it && /штурвал/.test(it.l), 'у кабіні F — «Сісти за штурвал»'); it.fn(); step(.3);
assert(F.ST.pilot === 'me', 'ти пілот');
// крен від A/D
w.dispatchEvent(new w.KeyboardEvent('keydown', { code: 'KeyD' })); step(1.2); const r1 = F.ST.roll; w.dispatchEvent(new w.KeyboardEvent('keyup', { code: 'KeyD' }));
w.dispatchEvent(new w.KeyboardEvent('keydown', { code: 'KeyA' })); step(1.2); const r2 = F.ST.roll; w.dispatchEvent(new w.KeyboardEvent('keyup', { code: 'KeyA' }));
assert(r1 > r2 + .3, `A/D керують креном (${r1.toFixed(2)} → ${r2.toFixed(2)})`);
T.getInteract().fn(); step(.2); assert(!F.ST.pilot, 'встав з-за штурвала — автопілот');
// пасажири хочуть — несемо
let served = 0;
for (let k = 0; k < 40 && served < 3; k++) {
  step(.5); T.pl.hp = 9999;
  const i = F.ST.pass.findIndex(p => p.want); if (i < 0) continue;
  const want = F.ST.pass[i].want, st = F.STATIONS.find(s => s.item === want);
  T.pl.x = st.x + .6; T.pl.z = st.z; F.ST.roll = 0; step(.05);
  T.getInteract().fn(); for (let j = 0; j < 30 && F.V.held !== want; j++) { T.pl.x = st.x + .6; T.pl.z = st.z; F.ST.roll = 0; F.ST.rv = 0; step(.1); }
  if (F.V.held !== want) continue;
  const s = F.SEATS[i]; T.pl.x = s.x + .2; T.pl.z = s.z - s.side * .6; F.ST.roll = 0; step(.05);
  const before = F.ST.served; it = T.getInteract(); if (it && /Подати/.test(it.l)) { it.fn(); step(.1); if (F.ST.served > before) served++; }
}
assert(served >= 3, `рознесли замовлення пасажирам: ${served}`);
// злі пасажири: терпіння закінчується
for (const p of F.ST.pass) { p.want = 'coffee'; p.pat = .01; }
step(1); assert(F.ST.pass.some(p => p.angry), 'кому не принесли — злиться');
// сильний крен розливає каву
F.setHeld('coffee'); let spilled = false;
for (let k = 0; k < 40 && !spilled; k++) { F.ST.roll = .95; F.ST.rv = 0; T.pl.x = 118; T.pl.x = -30; T.pl.z = 118; step(.1); if (!F.V.held) spilled = true; }
assert(spilled, 'сильний крен — кава розлилась');
// кінець рейсу: посадка
for (const p of F.ST.pass) { p.want = ''; p.angry = 0; p.mood = .9; }
F.ST.t = F.ST.dur - .5; const c0 = T.P.coins; step(1.5);
assert(!F.ST.on && T.P.coins > c0 && T.P.addons.flight.landed === 1, `посадка в «Гущі»: +${T.P.coins - c0} 🪙`);
console.log('ALL OK'); process.exit(0);
