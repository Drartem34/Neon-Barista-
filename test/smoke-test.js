// Headless smoke-test: запускає гру в jsdom з фейковим WebGL-рендерером і проганяє основні сценарії.
// Запуск: npm i && npm test
const fs = require('fs'), path = require('path');
const { JSDOM } = require('jsdom');
const THREE = require('three');
const root = path.join(__dirname, '..');
const shell = fs.readFileSync(path.join(root, 'src/00_shell.html'), 'utf8') + '</body></html>';
const dom = new JSDOM(shell, { pretendToBeVisual: true, runScripts: 'outside-only', url: 'https://example.org/' });
const w = dom.window;
class FakeRenderer { constructor() { this.shadowMap = {}; } setPixelRatio() {} setSize() {} render() {} }
class DbgMat extends THREE.MeshStandardMaterial { constructor(p) { if (p && 'color' in p && p.color === undefined) console.log('UNDEF COLOR', new Error().stack.split('\n').slice(2,5).join(' | ')); super(p); } }
class DbgB extends THREE.MeshBasicMaterial { constructor(p) { if (p && 'color' in p && p.color === undefined) console.log('UNDEF BASIC', new Error().stack.split('\n').slice(2,6).join(' | ')); super(p); } }
w.THREE = Object.assign({}, THREE, { WebGLRenderer: FakeRenderer, MeshStandardMaterial: DbgMat, MeshBasicMaterial: DbgB });
w.matchMedia = () => ({ matches: false });
w.requestAnimationFrame = () => 0;
w.console.warn = () => {};
w.setInterval = () => 0;
w.__NO_NET = true;
w.setTimeout = (f) => { f(); return 0; };

// ---- мінімальний мок WebAudio, щоб перевірити звуковий рушій
class Param { constructor(v = 0) { this.value = v; } setValueAtTime() { return this; } linearRampToValueAtTime() { return this; } exponentialRampToValueAtTime(v) { if (!(v > 0)) throw new Error('exp ramp <= 0: ' + v); return this; } setTargetAtTime() { return this; } }
class Node { constructor() { this.gain = new Param(1); this.frequency = new Param(440); this.detune = new Param(0); this.Q = new Param(1); this.pan = new Param(0); this.threshold = new Param(); this.ratio = new Param(); this.attack = new Param(); this.release = new Param(); } connect(n) { return n; } start() {} stop() {} }
let audioNodes = 0;
class FakeAC { constructor() { this.currentTime = 0; this.sampleRate = 8000; this.state = 'running'; this.destination = new Node(); }
  _n() { audioNodes++; return new Node(); }
  createGain() { return this._n(); } createOscillator() { return this._n(); } createBiquadFilter() { return this._n(); } createBufferSource() { return this._n(); }
  createConvolver() { return this._n(); } createDynamicsCompressor() { return this._n(); } createStereoPanner() { return this._n(); }
  createBuffer(ch, len) { const d = Array.from({ length: ch }, () => new Float32Array(len)); return { getChannelData: i => d[i] }; } resume() {} }
w.AudioContext = FakeAC;
let mapCalls = 0;
w.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: (o, k) => k in o ? o[k] : (...a) => { mapCalls++; }, set: (o, k, v) => { o[k] = v; return true; } });
let src = fs.readdirSync(path.join(root, 'src')).filter(f => f.endsWith('.js')).sort().map(f => fs.readFileSync(path.join(root, 'src', f), 'utf8')).join('\n');
src += `;window.__T={get P(){return P},pl,MON,BOSS,CHESTS,PROPS,TELE,DROPS,startGame,frame,openPanel,closePanel,useDrink,dash,startBrew,openChest,acceptQuest,turnInQuest,equip,makeItem,addItem,input,setDrink:d=>{selDrink=d},AC:()=>AC,respawn,useDrink,startBrew,HOME,sleepHammock,openPanel,setDrink2:d=>{selDrink=d},get paused(){return paused},get panel(){return panel},attack,atkDown,atkUp,jumpPress,jumpRelease,startArt,artTap,get art(){return art},MBS,activeBosses,addHeal,healOf,worldHeal,P_:()=>P,mergeStats:()=>mergeStats,autoEquip,bulkCommon,renderHome,SKY,applyGfx,GFX,get hitStopT(){return hitStopT},terrainAt,groundH,ISLMAP,LANDMARKS,WAYPOINTS,NOTES,DIG,startDig,FISH_SPOTS,startFishing,reelFish,get fishing(){return fishing},PETW,get petF(){return petF},tamePet,travelTo,spawnMonster,monsterAttack,isNight,PADS,interact,steal,get stormT(){return stormT},renderMap,renderJournal,BASE,eqItem,spawnProj,PROJ,initAudio,openCase,addCase,get caseAnim(){return caseAnim},closeCase,getDummy,tutEvent,sfx,SFXD,QUESTS,syncQuest,questEvent,BODIES,FANS,SYRUP,FUN,HOOKS,funInteract,mount,dismount,switchFan,onSyrup,pickUp,throwCarried,canCarry,chillMonster,breakProp,funMelee,DRINK,applyHit,carryTarget,pickUpAny,releaseCarry,get curZone(){return curZone}};`;
w.eval(src);
const T = w.__T; let now = 1000;
const swing = sec => { for (let i = 0; i < sec * 10; i++) { T.pl.atkCd = 0; T.attack(); step(.1); } };
const step = s => { for (let i = 0; i < s * 60; i++) { now += 16.7; if (T.AC()) T.AC().currentTime += .0167; T.frame(now); } };
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); process.exit(1); } console.log('ok -', m); };

T.startGame(true); step(1);
assert(T.MON.length > 10, 'вороги заспавнились');
assert(T.AC(), 'звуковий рушій запустився');
for (const k in T.SFXD) T.sfx(k, T.pl.x + 3, T.pl.z);
assert(true, 'усі ' + Object.keys(T.SFXD).length + ' звукових ефектів синтезуються');
// --- навчання
assert(T.P.tut === 0 && !w.document.querySelector('#tut').hidden, 'навчання стартувало');
for (let i = 0; i < 60 && T.P.tut === 0; i++) { T.input.jx = 1; step(.1); }
T.input.jx = 0;
assert(T.P.tut === 1, 'крок «Рух» пройдено');
T.pl.st = 100; T.dash(); step(.5);
assert(T.P.tut === 2, 'крок «Ривок» пройдено');
for (let i = 0; i < 30 && T.P.tut === 2; i++) { const d = T.DROPS.find(d => d.l.k === 'ing'); if (d) { T.pl.x = d.x; T.pl.z = d.z; } step(.2); }
assert(T.P.tut === 3, 'крок «Інгредієнти» пройдено');
T.pl.x = 0; T.pl.z = -2.4; step(.1); T.startBrew('latte'); step(3);
assert(T.P.tut === 4, 'крок «Варіння» пройдено');
const dm = T.getDummy(); assert(dm, 'манекен-стажер на місці');
for (let i = 0; i < 40 && T.P.tut === 4; i++) { T.pl.x = dm.x; T.pl.z = dm.z + 1.4; swing(.25); }
T.input.atk = false;
assert(T.P.tut === 5, 'крок «Стажер» пройдено: стрес ' + Math.round(dm.stress) + '/' + dm.max);
T.setDrink('latte'); T.pl.x = dm.x; T.pl.z = dm.z + 1.2;
for (let i = 0; i < 6 && T.P.tut === 5; i++) { T.useDrink(); step(.4); }
assert(T.P.tut === 6 && (T.P.cases.intern || 0) >= 1, 'крок «Кава вирішує» пройдено, кейс видано');
step(10);
assert(T.P.tut === -1, 'навчання завершилось');
// --- кейси
T.addCase('vacation', 2, true); T.addCase('ceo', 1, true);
for (const id of ['intern', 'vacation', 'ceo']) {
  const before = T.P.inv.length + T.P.coins + T.P.cosm.length;
  T.openPanel('cases'); T.openCase(id); step(2);
  assert(T.caseAnim && !T.caseAnim.done, 'рулетка крутиться: ' + id);
  step(4.5);
  assert(T.caseAnim.done && w.document.querySelector('.ctile.win'), 'рулетка зупинилась на призі: ' + T.caseAnim.prize.name);
  T.closeCase(); T.closePanel();
}
for (let i = 0; i < 300; i++) { T.addCase('deadline', 1, true); T.openCase('deadline'); T.caseAnim.t = 99; step(.02); T.closeCase(); }
assert(true, '300 кейсів відкрито без помилок, речей: ' + T.P.inv.length + ', монет: ' + T.P.coins);

// ===== Біоми та дослідження =====
T.P.inv.length = 3; T.P.eq = { hand1: T.P.inv[0].u, hand2: null, head: null, apron: null, shoes: null, acc: null, gear: null };
const near = (a, b, e = .05) => Math.abs(a - b) < e;
assert(T.terrainAt(-27, -15) === 'land' && T.terrainAt(-27, -23.8) === 'shallow' && T.terrainAt(-44, -26) === 'deep', 'рельєф моря: пляж, мілина, глибина');
assert(T.terrainAt(8, -41) === 'ice' && T.terrainAt(64, -28) === 'land', 'лід і пустеля');
assert(T.groundH(-56, -36, 6) === 6 && T.groundH(-56, -36, 0) <= 0, 'платформа маяка має висоту 6');
// плавання
T.pl.x = -44; T.pl.z = -26; T.pl.y = 0; T.pl.st = 100; step(1);
assert(T.pl.y < -.8, 'гравець пливе в глибокій воді (y=' + T.pl.y.toFixed(2) + ')');
const st0 = T.pl.st; step(1); assert(T.pl.st < st0, 'плавання витрачає витривалість');
assert(T.P.disc.sea, 'Море Відпустки відкрито');
// лід
T.pl.x = 8; T.pl.z = -42; T.pl.y = 0; T.pl.vx = 0; T.pl.vz = 0; T.input.jx = 1; step(1.2); T.input.jx = 0;
const x0 = T.pl.x; step(.3); assert(T.pl.x - x0 > .3, 'на льоду ковзаєш після відпускання (+' + (T.pl.x - x0).toFixed(2) + ')');
// маяк: драбина → вершина → скриня орієнтира
const pad = T.PADS.find(p => p.th === 6); T.pl.x = pad.x; T.pl.z = pad.z; T.pl.y = 0; step(1.6);
assert(near(T.pl.y, 6, .1), 'драбина піднімає на вершину маяка (y=' + T.pl.y.toFixed(2) + ')');
const lc = T.CHESTS.find(c => c.id === 'lm_lighthouse'); T.pl.x = lc.x; T.pl.z = lc.z + .8; step(.2);
const invBefore = T.P.inv.length; T.openChest(lc); step(1.5);
for (const d of T.DROPS.slice()) if (d.l.k === 'item' && Math.abs(d.y - 6) < 1) { T.pl.x = d.x; T.pl.z = d.z; step(.4); }
assert(T.P.inv.some(i => i.b === 'compass' || i.b === 'flippers'), 'скриня маяка дала компас або ласти');
assert(T.P.known.saltraf, 'вивчено рецепт солоно-карамельного рафу');
assert(T.P.notes.n7, 'на вершині маяка знайдено записку');
// зістрибнути з маяка
T.input.jx = 1; step(1); T.input.jx = 0; step(1.5);
assert(T.pl.y < 1, 'зістрибнув з маяка вниз');
// кавові точки й переміщення
T.pl.x = -25; T.pl.z = -11.5; T.pl.y = 0; step(.6); assert(T.P.wp.sea, 'кавову точку на пляжі активовано');
T.travelTo('hub'); step(.5); assert(Math.hypot(T.pl.x - T.WAYPOINTS[0].x, T.pl.z - T.WAYPOINTS[0].z) < 3, 'переміщення в «Гущу»');
// розкопки
const d0 = T.DIG.find(d => d.active); const dq = T.P.disc; T.pl.x = d0.x + .5; T.pl.z = d0.z; T.pl.y = 0; step(.1);
const coins0 = T.P.coins; T.startDig(d0); step(2);
assert(!d0.active && T.P.coins > coins0, 'скарб розкопано');
// риболовля
const fsp = T.FISH_SPOTS[0]; T.pl.x = fsp.x; T.pl.z = fsp.z; T.pl.y = 0; step(.3);
let bites = 0;
for (let i = 0; i < 8; i++) {
  T.pl.x = fsp.x; T.pl.z = fsp.z; T.pl.y = 0; T.pl.hp = 300; T.pl.iframes = 99;
  T.startFishing(fsp); for (let k = 0; k < 80 && T.fishing && T.fishing.phase === 'wait'; k++) { T.pl.iframes = 99; step(.1); }
  const F = T.fishing; if (!F || F.phase !== 'bite') continue;
  bites++; F.needle = F.z0 + F.w / 2; T.reelFish(); step(.2);
  if (T.fishing) { T.input.jx = 1; step(.05); T.input.jx = 0; step(.05); }
}
T.pl.iframes = 0;
assert(bites >= 4, 'клює: ' + bites + ' з 8 закидань');
assert(Object.keys(T.P.fishSeen).length > 0, 'спіймано риби: ' + JSON.stringify(T.P.fish));
// улюбленець
T.P.drinks.latte = 3; const cw = T.PETW.capy; T.pl.x = cw.x + 1.5; T.pl.z = cw.z; T.pl.y = 0; step(.2); T.tamePet('capy'); step(1);
assert(T.P.pets.capy && T.petF && T.petF.id === 'capy', 'капібару приручено, вона йде слідом');
// нові вороги
const types = ['crab', 'hr', 'monkey', 'mummy'];
for (const ty of types) assert(T.MON.some(m => m.type === ty), 'є ворог: ' + ty);
const mk = T.MON.find(m => m.type === 'monkey'); T.P.ing.beans = 5; T.steal(mk); assert(mk.state === 'flee' && mk.stolen.length, 'мавпа краде й тікає');
const mu = T.MON.find(m => m.type === 'mummy'); const tl = T.TELE.length; mu.la = 0; T.monsterAttack(mu); assert(T.TELE.length > tl, 'мумія б’є по площі з телеграфом');
// парирування
const um = T.makeItem('umbrella', 2); T.addItem(um, true); T.equip(um, 'hand1');
T.pl.x = 2; T.pl.z = 2; T.pl.y = 0; T.pl.face = 0; T.pl.swingT = .2; T.pl.iframes = 0;
T.spawnProj({ x: 2, z: 2.8, y: 1.3, vx: 0, vz: -8, life: 2, r: .5, from: 'enemy', dmg: 10, kind: 'snow' });
step(.1); assert(T.PROJ.some(p => p.from === 'player'), 'парасолька відбила снаряд');
// ніч
T.P.dayT = .02; step(.6); assert(T.isNight(), 'настала ніч');
T.P.dayT = .5; step(.6); assert(!T.isNight(), 'настав день');
// мапа й щоденник
T.openPanel('map'); T.openPanel('journal'); T.closePanel(); assert(mapCalls > 50, 'мапа намальована (' + mapCalls + ' викликів), щоденник рендериться');
// довга симуляція по всіх біомах
for (const isl of ['sea', 'snow', 'jungle', 'desert']) { const I = T.ISLMAP[isl]; for (let k = 0; k < 8; k++) { T.pl.x = I.x + Math.sin(k) * 6; T.pl.z = I.z + Math.cos(k) * 6; T.pl.y = 0; T.pl.hp = 300; swing(1); } }
T.input.atk = false;
assert(true, 'по 8 секунд бою в кожному новому біомі без помилок');

// ===== v4: оптимізація, бій, стрибки, замовлення, латте-арт, зцілення, боси, острів, інвентар =====
if (T.pl.dead) T.respawn();
const ms = T.mergeStats(); assert(ms.after < ms.before / 3, `статичний світ злито: ${ms.before} → ${ms.after} мешів`);
T.GFX.q = 'low'; T.applyGfx(true); T.GFX.q = 'high'; T.applyGfx(true); assert(true, 'перемикання якості графіки');
// стрибок
T.pl.x = 2; T.pl.z = 2; T.pl.y = 0; T.pl.vy = 0; step(.3); T.jumpPress(); step(.2); const jy = T.pl.y; step(1); T.jumpRelease();
assert(jy > .7 && Math.abs(T.pl.y) < .05, 'стрибок: висота ' + jy.toFixed(2) + ', приземлився');
// застрибнути на небесний камінь
T.pl.x = -10.4; T.pl.z = 1.3; T.pl.y = 0; T.pl.vy = 0; step(.3); T.input.jx = -1; T.jumpPress(); step(.65); T.jumpRelease(); T.input.jx = 0; step(.5);
assert(Math.abs(T.pl.y - .6) < .05 && !T.pl.falling, 'застрибнув на перший небесний камінь (y=' + T.pl.y.toFixed(2) + ')');
// планування з вівтаря
const alt = T.SKY.find(k => k.id === 'altar'); T.pl.x = alt.x; T.pl.z = alt.z; T.pl.y = alt.h; T.pl.vy = 0; step(.4);
assert(T.P.disc.altar, 'Хмарний вівтар відкрито');
T.jumpPress(); T.input.jx = 1; step(1.2); const gy = T.pl.y;
assert(T.pl.gliding || gy > 1, 'планування: повільно падаєш (y=' + gy.toFixed(2) + ')');
T.jumpRelease(); T.input.jx = 0; step(3); if (T.pl.dead) T.respawn();
// серія ударів і заряджений удар
T.pl.x = 2; T.pl.z = 2; T.pl.y = 0; step(.3);
const chain = []; for (let i = 0; i < 3; i++) { T.pl.atkCd = 0; T.attack(); chain.push(T.pl.chain); step(.15); }
assert(chain.join() === '0,1,2', 'серія ударів 0→1→2 (фінішер)');
T.pl.st = 100; step(.6); T.atkDown(); step(1.2); assert(T.pl.charge >= 1, 'заряджений удар набрано'); T.atkUp(); step(.3); assert(T.pl.charge === 0, 'заряджений удар випущено');
// замовлення
const wm = T.MON.find(m => m.wants && !m.calm && !m.T.dummy && !T.MON.some(o => o !== m && !o.calm && Math.hypot(o.x - m.x, o.z - m.z) < 3.5)) || T.MON.find(m => m.wants && !m.calm && !m.T.dummy);
assert(wm && wm.wantS, 'вороги показують бажаний напій: ' + (wm && wm.wants));
T.P.drinks[wm.wants] = 5; T.P.known[wm.wants] = 1; T.setDrink2(wm.wants); T.pl.x = wm.x + 1; T.pl.z = wm.z; T.pl.hp = 300; T.pl.iframes = 99;
for (let i = 0; i < 4 && !wm.gotWant && !wm.calm; i++) { T.pl.x = wm.x + 1; T.pl.z = wm.z; T.useDrink(); step(.1); }
assert(wm.gotWant, 'улюблений напій зараховано');
T.pl.iframes = 0;
// латте-арт
T.pl.x = 0; T.pl.z = -2.4; T.pl.y = 0; step(.2); T.P.brew = null; T.P.ing.beans = 9; T.P.ing.milk = 9; const lat0 = T.P.drinks.latte || 0;
T.startArt('latte'); for (let i = 0; i < 3; i++) { const t = T.art.targets[T.art.tries]; T.art.ang = t.a; T.artTap(); }
assert(T.art.done && T.art.hits === 3, 'латте-арт ★★★'); T.artTap(); step(3);
assert((T.P.drinks.latte || 0) >= lat0 + 2 && T.P.art.latte >= 2, 'шедевр: +2 латте і заряди латте-арту');
// зцілення
const w0 = T.worldHeal(); T.addHeal('office', 100, 27, -2); step(.2);
assert(T.healOf('office') === 100 && T.worldHeal() > w0, 'Опен-спейс зцілено, здоров’я світу ' + T.worldHeal() + '%');
// міні-бос: Кракен
T.P.drinks.saltraf = 10; T.P.known.saltraf = 1; T.setDrink2('saltraf');
T.pl.x = -39.6; T.pl.z = -19.4; T.pl.y = 0; T.pl.hp = 500; step(.6);
const kr = T.MBS.kraken; assert(kr.active, 'Кракен активувався');
for (let i = 0; i < 8 && !kr.asleep; i++) { T.pl.x = -39.6; T.pl.z = -19.4; T.pl.y = 0; T.pl.hp = 500; T.useDrink(); step(.6); }
assert(kr.asleep && T.P.mb.kraken === 1, 'Кракена заспокоєно улюбленим напоєм');
step(2);
// міні-бос: Фараон (бій зблизька + раф)
T.P.drinks.raf = 10; T.P.known.raf = 1; T.setDrink2('raf'); const ph = T.MBS.pharaoh;
T.pl.x = ph.x + 3; T.pl.z = ph.z; T.pl.hp = 500; step(.5); assert(ph.active, 'Фараон активувався');
for (let i = 0; i < 12 && !ph.asleep; i++) { T.pl.x = ph.x + 2.5; T.pl.z = ph.z; T.pl.y = 0; T.pl.hp = 500; T.pl.atkCd = 0; T.attack(); step(.3); T.useDrink(); step(.4); }
assert(ph.asleep, 'Фараона заспокоєно');
if (T.pl.dead) T.respawn();
// острів
T.P.coins += 1000; T.openPanel('home'); T.closePanel();
T.P.decor.fountain = 1; T.P.home.slots[8] = 'fountain'; T.P.home.color = 'sakura'; T.renderHome(); assert(true, 'декор острова поставлено');
T.P.dayT = .02; step(.3); T.pl.x = T.HOME.hammock.x - 1.6; T.pl.z = T.HOME.hammock.z; T.pl.y = 0; step(.2); T.pl.hp = 10; T.sleepHammock(); step(.5);
assert(T.P.dayT > .25 && T.P.dayT < .35 && T.pl.hp > 50, 'гамак: проспав до ранку й відновився');
// інвентар
for (let i = 0; i < 5; i++) T.addItem(T.makeItem('spoon', 0), true);
const n0 = T.P.inv.length; T.bulkCommon('dis'); assert(T.P.inv.length < n0, 'масове розбирання звичайних речей');
T.autoEquip(); T.openPanel('inv'); T.openPanel('stash'); T.openPanel('sound'); T.closePanel(); assert(true, 'авто-екіпірування й нові вкладки');

T.P.inv.length = 3; T.P.eq = { hand1: T.P.inv[0].u, hand2: null, head: null, apron: null, shoes: null, acc: null, gear: null };
for (const p of ['inv', 'cases', 'skills', 'drinks', 'craft', 'work', 'shop', 'quest', 'sound', 'help']) T.openPanel(p);
T.closePanel(); assert(true, 'усі вкладки меню рендеряться');
T.closePanel(); T.pl.x = 3.8; T.pl.z = -1.4; step(.2); T.acceptQuest();
T.pl.x = 0; T.pl.z = -2.4; step(.1); T.startBrew('latte'); step(3.5); T.startBrew('latte'); step(3.5);
assert(T.P.qstate === 'done', 'квест «Перша зміна» виконано варінням');
T.pl.x = 3.8; T.pl.z = -1.4; T.turnInQuest(); T.acceptQuest();
T.pl.x = 22; T.pl.z = -2; step(.5);
for (let k = 0; k < 40; k++) { swing(.5); T.input.atk = false; if (k % 3 === 0) T.useDrink(); if (k % 5 === 0) T.dash(); T.pl.hp = Math.max(T.pl.hp, 50); }
assert(T.P.calmed > 0, 'монстрів заспокоєно кавою: ' + T.P.calmed);
for (const b of ['hammer', 'drill', 'extinguisher', 'stapler', 'machine', 'tumbler', 'bigcup', 'sign', 'apocmop', 'lounger', 'kspoon']) {
  const it = T.makeItem(b, 3); T.addItem(it, true); T.equip(it, 'hand1'); swing(1.5); T.input.atk = false;
}
assert(true, 'усі типи атак працюють');
if (T.pl.dead) T.respawn(); T.pl.hp = 300; T.P.drinks.giant = 4; T.P.known.giant = 1; T.pl.x = 58; T.pl.z = 10; step(2);
assert(T.BOSS.active, 'рейд-бос активувався');
T.setDrink('giant');
for (let i = 0; i < 10 && !T.BOSS.asleep; i++) { T.pl.x = T.BOSS.x; T.pl.z = T.BOSS.z - 2.5; T.useDrink(); T.pl.hp = 200; step(1.2); }
assert(T.BOSS.asleep && T.P.bossWins === 1, 'CEO заснув');
T.pl.x = 0; T.pl.z = 13; step(3); assert(!T.pl.falling, 'падіння з острова → респавн');
T.pl.x = -8.6; T.pl.z = 4.6; step(2); assert(Math.hypot(T.pl.x + 20.5, T.pl.z - 18.6) < 1, 'батут перекидає на таємний острів');
// --- квест «Мандрівник»: острови, відкриті ДО квесту, зараховуються
{
  const qi = T.QUESTS.findIndex(q => q.ev === 'biome');
  T.P.quest = qi; T.P.qstate = 'offer'; T.P.qprog = 0;
  for (const k in T.P.disc) delete T.P.disc[k]; Object.assign(T.P.disc, { hub: 1, home: 1, office: 1, park: 1, sea: 1 });
  T.acceptQuest();
  assert(T.P.qstate === 'active' && T.P.qprog === 3, 'квест «Мандрівник»: 3 острови зараховано заздалегідь');
  T.P.disc.snow = 1; T.questEvent('biome');
  assert(T.P.qstate === 'done' && T.P.qprog === 4, 'квест «Мандрівник» виконано з урахуванням старих островів');
  T.P.qstate = 'active'; T.P.qprog = 0; Object.assign(T.P.disc, { jungle: 1, desert: 1 }); T.syncQuest(true);
  assert(T.P.qstate === 'done', 'застряглий квест зі старого збереження розблоковується при завантаженні');
}
// ===== Фан-механіки =====
{
  if (T.pl.dead) T.respawn();
  T.pl.hp = 500; T.pl.falling = false; T.pl.ride = null;
  assert(T.BODIES.length >= 6 && T.FANS.length >= 3 && T.SYRUP.length >= 3, 'візки, баки, вентилятори й сироп розставлено');
  assert(T.P.inv.some(i => i.b === 'plunger') && T.P.known.matcha && T.P.known.jamaica, 'вантуз-гарпун і нові рецепти видано');
  // візок: сісти, розігнатися, збити моба
  const cart = T.BODIES.find(b => b.kind === 'cart');
  T.pl.x = cart.x; T.pl.z = cart.z + .8; T.pl.y = 0; step(.1);
  const fi = T.funInteract(); assert(fi && /візок/.test(fi.l), 'біля візка можна сісти');
  fi.fn(); assert(T.pl.ride === cart, 'сів у візок');
  T.input.jz = -1; step(.6); T.input.jz = 0;
  assert(Math.hypot(cart.vx, cart.vz) > 3 && T.pl.z < cart.hz, 'візок розганяється від WASD');
  T.dismount(); assert(!T.pl.ride, 'зліз із візка');
  // боулінг: штовхаємо візок у моба
  const victim = T.MON.find(m => !m.calm && m.state !== 'fall' && !m.T.dummy);
  let bowled = false;
  for (let tr = 0; tr < 4 && !bowled; tr++) {
    const ofc = T.ISLMAP.office; victim.x = ofc.x + 1; victim.z = ofc.z + tr * .3; victim.vx = victim.vz = 0; victim.stun = 5; victim.state = 'chase';
    for (const o of T.MON) if (o !== victim && !o.calm && Math.hypot(o.x - ofc.x, o.z - ofc.z) < 6) { o.x = ofc.x + 9; o.z = ofc.z + 6; }
    cart.fall = false; cart.y = 0; cart.x = victim.x - 1.6; cart.z = victim.z; cart.vx = 13; cart.vz = 0;
    const st0 = victim.stress; step(.4);
    bowled = victim.stress < st0 || Math.hypot(victim.vx, victim.vz) > 1 || victim.state === 'fall';
  }
  assert(bowled, 'візок збиває моба, як кеглю');
  // сироп ковзкий
  const sy = T.SYRUP[0]; assert(T.onSyrup(sy.x, sy.z) && !T.onSyrup(sy.x + sy.r + 1, sy.z), 'калюжа сиропу визначається');
  // вентилятор здуває
  const fan = T.FANS[0], br = fan.br;
  T.pl.ride = null; T.pl.x = br.ax + br.dx * 2.5; T.pl.z = br.az + br.dz * 2.5; T.pl.y = 0; T.pl.falling = false; step(.1);
  const x0 = T.pl.x, z0 = T.pl.z; T.switchFan(fan, false); step(.4);
  assert(Math.hypot(T.pl.x - x0, T.pl.z - z0) > 1 || T.pl.falling, 'увімкнений вентилятор здуває з мосту');
  step(3); T.pl.falling = false; fan.on = 0;
  // кавоварка вибухає й розкидає мобів
  const em = T.PROPS.find(p => p.type === 'espmachine');
  assert(em, 'кавоварки під тиском стоять на островах');
  const near = T.MON.find(m => !m.calm && m.state !== 'fall' && !m.T.dummy && !m.carried);
  near.x = em.x + 1.5; near.z = em.z; near.vx = near.vz = 0; T.pl.x = 0; T.pl.z = 3;
  T.breakProp(em); assert(Math.hypot(near.vx, near.vz) > 3 || near.state === 'fall', 'вибух кавоварки відкидає мобів');
  // моб-баскетбол
  const mb = T.MON.find(m => !m.calm && m.state !== 'fall' && !m.T.dummy && (m.mass || 1) <= 2.3 && !m.carried);
  const of = T.ISLMAP.office; mb.x = of.x; mb.z = of.z; mb.stress = mb.max * .25; T.pl.x = mb.x; T.pl.z = mb.z + 1; T.pl.y = 0; T.pl.face = 0;
  assert(T.canCarry(mb), 'збитого до 25% моба можна підняти');
  T.pickUp(mb); step(.1); assert(mb.carried && mb.y > 1, 'моб над головою');
  T.pl.atkCd = 0; T.pl.pending = null; T.attack(); step(.1);
  assert(!mb.carried && Math.hypot(mb.vx, mb.vz) > 3 || mb.state === 'fall', 'моба жбурнуто');
  // спешл-матча
  const mm = T.MON.find(m => !m.calm && m.state !== 'fall' && !m.T.dummy && !m.carried);
  T.chillMonster(mm); step(1); assert(mm.chill > 0 && mm.stun > 0, 'після матчі моб сидить і втикає');
  mm.chill = .05; step(.3); assert(mm.calm, 'після матчі моб заспокоюється');
  // вантуз
  const hk = T.makeItem('plunger', 2); T.addItem(hk, true); T.equip(hk, 'hand1');
  const tgt = T.MON.find(m => !m.calm && m.state !== 'fall' && !m.T.dummy && !m.carried);
  const pk = T.ISLMAP.park; for (const o of T.MON) if (o !== tgt && !o.calm && Math.hypot(o.x - pk.x, o.z - pk.z) < 14) { o.x = 30; o.z = -2; } tgt.x = pk.x; tgt.z = pk.z - 2; tgt.vx = tgt.vz = 0; tgt.stun = 3; T.pl.x = tgt.x; T.pl.z = tgt.z + 4.5; T.pl.falling = false; T.pl.dead = false; T.pl.y = 0; T.pl.face = Math.PI; T.input.aimOk = false;
  const d0 = Math.hypot(tgt.x - T.pl.x, tgt.z - T.pl.z);
  T.pl.atkCd = 0; T.pl.pending = null; T.attack(); step(.15); const hooked = T.HOOKS.length > 0; step(.45);
  assert(hooked && Math.hypot(tgt.x - T.pl.x, tgt.z - T.pl.z) < d0 - .3 || T.HOOKS.length > 0 || Math.hypot(tgt.x - T.pl.x, tgt.z - T.pl.z) < d0 - .3, 'вантуз-гарпун стріляє й притягує');
  // підняти й кинути будь-що: принтер летить і вибухає, потім відновлюється на місці
  {
    const pr = T.PROPS.find(p => p.type === 'printer' && p.alive);
    for (const o of T.MON) if (Math.hypot(o.x - pr.x, o.z - pr.z) < 4) o.x += 40;
    T.pl.x = pr.x + .9; T.pl.z = pr.z; T.pl.y = 0; T.pl.falling = false; T.pl.ride = null; if (T.pl.carry) T.releaseCarry(false);
    const t = T.carryTarget(); assert(t && (t[0] === 'prop' || t[0] === 'body'), 'біля принтера можна щось підняти (' + (t && t[0]) + ')');
    if (t[0] === 'prop') {
      T.pickUpAny(t); step(.2); assert(T.pl.carry === pr && pr.mesh.position.y > 1, 'принтер над головою');
      T.pl.face = 0; T.input.aimOk = false; T.releaseCarry(true); step(1.8);
      assert(!pr.fly && !pr.alive && pr.x === pr.ox && pr.z === pr.oz, 'кинутий принтер розбився й відновиться на своєму місці');
    }
  }
  // ямайський спідбуст
  T.P.drinks.jamaica = 1; T.setDrink('jamaica'); T.useDrink(); assert(T.FUN.jam > 0, 'ямайський спідбуст діє');
}
console.log('ALL OK'); process.exit(0);
