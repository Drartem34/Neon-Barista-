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
// перший кидок: затиснути й відпустити
const L = B.LN[B.BW.lane]; L.t = 0;
T.keydown('Space'); step(.45); w.dispatchEvent(new w.KeyboardEvent('keyup', { code: 'Space' })); step(.05);
assert(L.state === 'roll' && L.vx > 5, `поїхав доріжкою (швидкість ${L.vx.toFixed(1)})`);
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
