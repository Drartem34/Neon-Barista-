// Тест аддона «Офісний боулінг» у грі без сервера (проти бота Кента).
// Запуск: node test/bowling-test.js
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
w.__ADDON_CODE = [{ id: 'bowling', src: 'bowling/addon.js', code: fs.readFileSync(path.join(root, 'addons/_examples/bowling/addon.js'), 'utf8') }];
let src = fs.readdirSync(path.join(root, 'src')).filter(f => f.endsWith('.js')).sort().map(f => fs.readFileSync(path.join(root, 'src', f), 'utf8')).join('\n');
src += ';window.__T={get paused(){return paused},get running(){return running},get P(){return P},pl,MON,PROPS,BODIES,ADDONS,ISLMAP,startGame,frame,openPanel,closePanel,get panel(){return panel},getInteract:()=>getInteract(),terrainAt:(x,z)=>terrainAt(x,z),nearBar:()=>nearBar(),input,renderPanel,keydown:c=>dispatchEvent(new KeyboardEvent("keydown",{code:c})),fireHook:h=>fireHook(h),releaseCarry:t=>releaseCarry(t),pickUpAny:t=>pickUpAny(t),damageProp:(p,d)=>damageProp(p,d),hurt:d=>hurtPlayer(d),dropLoot:(x,z,l)=>dropLoot(x,z,l),DROPS};';
w.eval(src);
const T = w.__T; let now = 1000;
const step = s => { for (let i = 0; i < s * 60; i++) { now += 16.7; T.frame(now); if (i % 3 === 0) IV.forEach(f => f()); } };
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); process.exit(1); } console.log('ok -', m); };
const body = () => w.document.querySelector('#pbody');
assert(T.ADDONS.list.every(a => a.ok), 'аддон завантажився: ' + T.ADDONS.list.map(a => a.name + (a.ok ? '' : ' ✗ ' + a.err)).join(', '));
assert(w.document.querySelector('#mm-bowling .mm-subtitle').textContent === 'Офісний страйк', 'у головному меню картка «БОУЛІНГ»');
const B = w.__bowl;
// правила рахунку
assert(B.scoreOf([10, 10, 10, 10, 10, 10, 10]).pop() === 150, 'ідеальна гра на 5 фреймів = 150');
assert(B.scoreOf([3, 4, 5, 5, 2, 0, 10, 1, 1, 0, 0]).pop() === 7 + 12 + 2 + 12 + 2 + 0, 'спер і страйк рахуються з бонусами');
assert(B.scoreOf([9, 1, 9, 1, 9, 1, 9, 1, 9, 1, 9]).pop() === 19 * 4 + 19, 'спер в останньому фреймі дає бонусний кидок');
T.startGame(true); T.P.tut = -1; step(.3);
// Esc → «Офісний боулінг»
T.keydown('Escape'); step(.05);
assert(body().querySelector('[data-mode="bowling"]'), 'режим «Офісний боулінг» є в меню паузи');
body().querySelector('[data-mode="bowling"]').click(); step(.5);
assert(Math.hypot(T.pl.x - (118 - 15.5), T.pl.z - 64) < .6, 'переніс до доріжок');
// сісти в крісло
T.pl.x = 118 - 13.5 - .5; T.pl.z = 64 - 2.6; step(.1);
const it = T.getInteract(); assert(it && /Сісти/.test(it.l), 'біля старту F — «Сісти в крісло»: ' + (it && it.l));
it.fn(); step(1);
assert(B.BW.seated && B.M.on && B.M.sides[1].kind === 'bot', 'сів у крісло, офлайн — гра проти бота Кента');
assert(w.document.getElementById('bowl-hud').textContent.includes('Бот Кент'), 'HUD: рахунок проти бота');
// перший кидок: розгін на WASD (п'яно) до лінії фолу
const L = B.LN[B.BW.lane]; L.t = 0; const x0 = L.cx;
T.keydown('KeyW'); step(.4); w.dispatchEvent(new w.KeyboardEvent('keyup', { code: 'KeyW' })); step(.3);
assert(L.state === 'aim' && Math.abs(L.cz - L.z) > .05, `W зсуває крісло вбік по доріжці (${(L.cz - L.z).toFixed(2)}) — ще не поїхав`);
T.keydown('KeyD'); let gd = 0; while (L.state === 'aim' && gd++ < 60) step(.05); w.dispatchEvent(new w.KeyboardEvent('keyup', { code: 'KeyD' }));
assert(L.state === 'roll' && L.cx > x0 && L.vx > 7, `D — розігнався, перетнув лінію фолу й поїхав (швидкість ${L.vx.toFixed(1)})`);
{ const B0 = B.BW; B0.lag.length = 0; B0.inv = 0; B0.lurch = 0; B0.hicT = 99; const ix = B0.ix; B0.ix = 0; B0.iz = 1; const v = []; for (let k = 0; k < 15; k++) v.push(B.drunk(1 / 60)); B0.iz = 0; B0.ix = ix;
  assert(v[0][1] === 0 && Math.abs(v[14][1]) > .3, 'п\'яне керування: натиснув — крісло слухається із запізненням'); B0.inv = 1; B0.lag = Array(14).fill([0, 1]); B0.lurch = 0; const sgn = Math.sign(B.drunk(1 / 60)[1]); B0.inv = 0; B0.lag = Array(14).fill([0, 1]); assert(sgn === -Math.sign(B.drunk(1 / 60)[1]), 'гикавка міняє ліво й право'); B0.lag.length = 0; }
let guard = 0; while (L.state !== 'aim' && L.state !== 'done' && guard++ < 600) step(.05);
const me = B.M.sides[0];
assert(me.rolls.length === 1, `кидок пораховано: збито ${me.rolls[0]}`);
// граємо до кінця: прямо по центру на повну
for (let k = 0; k < 40 && !me.done; k++) {
  let g = 0; while (L.state !== 'aim' && !me.done && g++ < 400) step(.05);
  if (me.done) break;
  L.t = 0; B.chargeStart(); B.BW.charge = Math.PI / 3.2; B.chargeRelease();
  g = 0; while (L.state === 'roll' || L.state === 'settle') { step(.05); if (g++ > 400) break; }
}
assert(me.done && B.scoreOf(me.rolls).length === 5, `зіграно 5 фреймів: ${me.rolls.join(',')} = ${B.scoreOf(me.rolls).pop()}`);
const strikes = me.rolls.filter(r => r === 10).length;
assert(me.rolls.some(r => r >= 7), 'прямий сильний кидок валить більшість зомбі-кеглів');
const c0 = T.P.coins; let g2 = 0; while (B.M.on && g2++ < 2000) step(.1);
assert(!B.M.on && T.P.coins > c0 && T.P.addons.bowling.games === 1, `партія закінчилась: бот ${B.scoreOf(B.M.sides[1].rolls).pop()}, нагорода +${T.P.coins - c0} 🪙, страйків ${strikes}`);
step(3); assert(!B.BW.seated, 'після партії встаєш із крісла');
console.log('ALL OK'); process.exit(0);
