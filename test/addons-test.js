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
w.matchMedia = () => ({ matches: false }); w.requestAnimationFrame = () => 0; w.console.warn = () => { }; const IV = []; w.setInterval = (f, ms) => { if (ms <= 100) IV.push(f); return 0; }; w.__NO_NET = true;
w.setTimeout = f => { f(); return 0; };
w.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: (o, k) => k in o ? o[k] : () => { }, set: (o, k, v) => { o[k] = v; return true; } });
w.__ADDON_CODE = ['progression', 'black_market', 'hover_highlight', 'speakers', 'voice_chat', 'dynamic_bg', 'super_graphics'].map(id => ({ id, src: id + '.js', code: fs.readFileSync(path.join(root, 'addons/_examples', id + '.js'), 'utf8') }));
let src = fs.readdirSync(path.join(root, 'src')).filter(f => f.endsWith('.js')).sort().map(f => fs.readFileSync(path.join(root, 'src', f), 'utf8')).join('\n');
src += ';window.__T={get P(){return P},pl,MON,ADDONS,ISLMAP,startGame,frame,openPanel,closePanel,get panel(){return panel},getInteract:()=>getInteract(),inHub:()=>inHub(),get WORKBENCH(){return WORKBENCH},spawnMonster,screenPos,input,questEvent,addItem,makeItem,renderPanel};';
w.eval(src);
(async () => {
const T = w.__T; let now = 1000;
const step = s => { for (let i = 0; i < s * 60; i++) { now += 16.7; T.frame(now); if (i % 3 === 0) IV.forEach(f => f()); } };
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); process.exit(1); } console.log('ok -', m); };
assert(T.ADDONS.list.length === 7 && T.ADDONS.list.every(a => a.ok), 'усі аддони завантажились: ' + T.ADDONS.list.map(a => a.name + (a.ok ? '' : ' ✗ ' + a.err)).join(', '));
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
  step(.4);
  assert(Math.abs(((T.pl.face - Math.atan2(T.input.ax - T.pl.x, T.input.az - T.pl.z)) + Math.PI * 3) % (Math.PI * 2) - Math.PI) < .3 && T.input.aimOk, 'персонаж дивиться туди, де курсор');
  const cur = [...w.document.body.children].find(d => d.style && d.style.borderRadius === '50%' && d.style.position === 'fixed');
  assert(cur && cur.style.display !== 'none', 'навколо курсора видно коло');
}
// колонки
{
  T.closePanel(); T.pl.x = 6.2; T.pl.z = -1.6; T.pl.y = 0; step(.2);
  const it = T.getInteract(); assert(it && /Радіо/.test(it.l), 'у «Гущі» біля радіо F — ' + (it && it.l));
  it.fn(); step(.05);
  assert(T.panel === 'ax_speakers' && body().textContent.includes('Радіо «Гущі»') && body().querySelector('#spk-url'), 'вкладка колонок з полем для посилання');
  body().querySelector('#spk-url').value = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10'; body().querySelector('[data-sp="play"]').click();
  assert(/YouTube/.test(body().textContent), 'радіо грає YouTube-посилання');
  body().querySelector('#spk-url').value = 'якась дурня'; body().querySelector('[data-sp="play"]').click();
  assert(/Не розпізнав/.test(body().textContent), 'погане посилання — підказка');
  // купити в Гущі
  T.P.coins = 1000; T.renderPanel(); body().querySelector('[data-sp="buy"]').click();
  const d = T.P.addons.speakers; assert(d.spk === 1 && T.P.coins === 700, 'колонку куплено за 300');
  // скрафтити на верстаку
  Object.assign(T.P.ing, { bolts: 6, tape: 3, monday: 1 }); T.pl.x = T.WORKBENCH.x + 1.5; T.pl.z = T.WORKBENCH.z; step(.05); T.openPanel('ax_speakers');
  const cb = body().querySelector('[data-sp="craft"]'); assert(cb && !cb.disabled, 'біля верстака можна скрафтити'); cb.click();
  assert(d.spk === 2 && T.P.ing.bolts === 0, 'колонку скрафчено з болтів, скотчу й енергії понеділка');
  // поставити й увімкнути
  T.pl.x = 2; T.pl.z = 5; T.pl.face = 0; step(.05); T.renderPanel(); body().querySelector('[data-sp="place"]').click();
  assert(d.spk === 1 && d.placed.length === 1, 'колонку поставлено: ' + body().querySelector('.note').textContent);
  body().querySelector('#spk-url').value = 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC'; body().querySelector('[data-sp="play"]').click();
  assert(d.placed[0].url.includes('spotify'), 'на колонці Spotify, збережено в прогрес');
  T.closePanel(); step(.2); const card = [...w.document.body.children].find(e => e.querySelector && e.querySelector('iframe[src*="spotify.com/embed/track"]'));
  assert(card && card.style.display !== 'none', 'поруч з колонкою показано плеєр Spotify');
  T.pl.x = 60; T.pl.z = 60; step(.2); assert(card.style.display === 'none', 'далеко від колонки плеєр ховається');
  T.pl.x = 2; T.pl.z = 6.4; step(.05); const it2 = T.getInteract(); assert(it2 && /Моя колонка/.test(it2.l), 'F біля своєї колонки'); it2.fn(); step(.05);
  body().querySelector('[data-sp="pick"]').click(); assert(d.spk === 2 && d.placed.length === 0, 'колонку забрано назад у рюкзак');
}
// голосовий чат (без мережі — лише вкладка й підказка)
{
  T.openPanel('ax_voice'); assert(body().textContent.includes('Голосовий чат') && body().querySelector('[data-vc="on"]'), 'вкладка голосового чату');
  body().querySelector('[data-vc="open"]').click(); assert(T.P.addons.voice_chat.mode === 'open', 'режим «мікрофон завжди» зберігається');
  body().querySelector('[data-vc="on"]').click(); await new Promise(r => setImmediate(r));
  assert(/лише онлайн/.test(body().textContent), 'без мережі — пояснення, що голос лише онлайн');
}
console.log('ALL OK'); process.exit(0);
})();
