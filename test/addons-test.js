// Тест аддонів-прикладів у грі без сервера: прогресія світу + чорний ринок.
// Запуск: node test/addons-test.js
const fs = require('fs'), path = require('path');
const { JSDOM } = require('jsdom');
const THREE = require('three');
const root = path.join(__dirname, '..');
const dom = new JSDOM(fs.readFileSync(path.join(root, 'src/00_shell.html'), 'utf8') + '</body></html>', { pretendToBeVisual: true, runScripts: 'outside-only', url: 'https://example.org/' });
const w = dom.window;
class FakeRenderer { constructor() { this.shadowMap = {}; } setPixelRatio() { } setSize() { } render() { } }
w.THREE = Object.assign({}, THREE, { WebGLRenderer: FakeRenderer });
w.matchMedia = () => ({ matches: false }); w.requestAnimationFrame = () => 0; w.console.warn = () => { }; w.setInterval = () => 0; w.__NO_NET = true;
w.setTimeout = f => { f(); return 0; };
w.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: (o, k) => k in o ? o[k] : () => { }, set: (o, k, v) => { o[k] = v; return true; } });
w.__ADDON_CODE = ['progression', 'black_market', 'hover_highlight'].map(id => ({ id, src: id + '.js', code: fs.readFileSync(path.join(root, 'addons/_examples', id + '.js'), 'utf8') }));
let src = fs.readdirSync(path.join(root, 'src')).filter(f => f.endsWith('.js')).sort().map(f => fs.readFileSync(path.join(root, 'src', f), 'utf8')).join('\n');
src += ';window.__T={get P(){return P},pl,MON,ADDONS,ISLMAP,startGame,frame,openPanel,closePanel,get panel(){return panel},getInteract:()=>getInteract(),spawnMonster,screenPos,questEvent,addItem,makeItem,renderPanel};';
w.eval(src);
const T = w.__T; let now = 1000;
const step = s => { for (let i = 0; i < s * 60; i++) { now += 16.7; T.frame(now); } };
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); process.exit(1); } console.log('ok -', m); };
assert(T.ADDONS.list.length === 3 && T.ADDONS.list.every(a => a.ok), 'обидва аддони завантажились: ' + T.ADDONS.list.map(a => a.name + (a.ok ? '' : ' ✗ ' + a.err)).join(', '));
T.startGame(true); T.P.tut = -1; step(.5);
// прогресія
const lv = id => { const s = T.ISLMAP[id]; const ms = T.MON.filter(m => m.isl === s && !m.T.dummy); return ms.length ? Math.max(...ms.map(m => m.zlvl || 0)) : 0; };
assert(lv('office') >= 2 && lv('desert') >= 5 && lv('desert') > lv('office'), `рівні мобів ростуть від центру (Опен-спейс ${lv('office')}, Пустеля ${lv('desert')})`);
const near1 = T.spawnMonster('office', T.ISLMAP.office, 22, 0), far1 = T.spawnMonster('office', T.ISLMAP.office, 66, 0);
assert(far1.zlvl > near1.zlvl && far1.max > near1.max && far1.dmg > near1.dmg, `той самий моб далі від центру сильніший (рів. ${near1.zlvl}: ${near1.max} → рів. ${far1.zlvl}: ${far1.max})`);
assert(T.MON.filter(m => m.lvlTag).length > 5, 'над мобами таблички з рівнем');
// чорний ринок
const s = T.ISLMAP.secret; T.pl.x = s.x - 1.9; T.pl.z = s.z - .5; T.pl.y = 0; step(.3);
const it = T.getInteract(); assert(it && /Чорний ринок/.test(it.l), 'біля торговця F — «Чорний ринок»');
it.fn(); step(.1);
const body = () => w.document.querySelector('#pbody');
assert(T.panel && body().textContent.includes('Товари') && body().textContent.includes('Контракт') && body().textContent.includes('Скупка'), 'вкладка ринку: товари, контракт, скупка');
T.P.coins = 99999; T.renderPanel();
const inv0 = T.P.inv.length; body().querySelector('[data-bm="buy"][data-i="0"]').click();
assert(T.P.inv.length === inv0 + 1 && T.P.coins < 99999, 'купівля рідкісної речі');
const junk = T.makeItem('mop', 0); T.addItem(junk, true); T.renderPanel();
const c0 = T.P.coins; body().querySelector(`[data-bm="sell"][data-u="${junk.u}"]`).click();
assert(!T.P.inv.includes(junk) && T.P.coins > c0, 'скупка речі');
// контракт: беремо «Погром» і виконуємо подіями
const d = T.P.addons.black_market; d.c = { id: 'riot', prog: 0 };
for (let i = 0; i < 8; i++) T.questEvent('break');
T.renderPanel(); const turn = body().querySelector('[data-bm="turn"]');
assert(!turn.disabled, 'контракт «Погром» виконано подіями гри');
turn.click(); assert((d.done || 0) === 1 && (!d.c || d.c.id !== 'riot'), 'контракт здано, нагорода видана');
T.renderPanel(); assert(body().textContent.includes('Прогрес'), 'новий контракт уже чекає');
// підсвітка цілі мишкою
{
  T.closePanel(); T.pl.x = T.ISLMAP.office.x - 3; T.pl.z = T.ISLMAP.office.z; T.pl.y = 0; T.pl.hp = 9999; step(2);
  const m = T.MON.filter(m => !m.calm && m.state !== 'fall').sort((a, b) => Math.hypot(a.x - T.pl.x, a.z - T.pl.z) - Math.hypot(b.x - T.pl.x, b.z - T.pl.z))[0];
  m.stun = 9; step(.2); const p = T.screenPos(m.x, 1.2, m.z);
  w.document.querySelector('#cv').dispatchEvent(new w.MouseEvent('pointermove', { clientX: p.x, clientY: p.y, bubbles: true }));
  step(.03);
  const tip = [...w.document.querySelectorAll('#fx-layer div')].find(d => d.style.display !== 'none' && /Стрес/.test(d.textContent));
  assert(tip && tip.textContent.includes(m.T.n), 'наведення мишки на ворога показує підказку: ' + (tip && tip.textContent));
}
console.log('ALL OK'); process.exit(0);
