// Тест «Сховайся від боса» на сервері світу: один — бос, другий ховається; ролі, маскування й спіймання рахує сервер.
// Запуск: node test/hideboss-world-test.js
const fs = require('fs'), path = require('path'), os = require('os'), { spawn } = require('child_process');
const { JSDOM } = require('jsdom');
const THREE = require('three');
const root = path.join(__dirname, '..');
const PORT = 7812;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'barista-world-'));
for (const f of ['start.py']) fs.copyFileSync(path.join(root, f), path.join(tmpRoot, f));
for (const d of ['dist', 'src', 'server']) fs.cpSync(path.join(root, d), path.join(tmpRoot, d), { recursive: true });
fs.symlinkSync(path.join(root, 'node_modules'), path.join(tmpRoot, 'node_modules'));
fs.cpSync(path.join(root, 'addons/_examples/hideboss'), path.join(tmpRoot, 'addons/hideboss'), { recursive: true });
const srv = spawn('python3', [path.join(tmpRoot, 'start.py'), '--no-ui', '--tunnel', 'none', '--port', String(PORT)], { stdio: 'ignore' });
function cleanup(code) { try { srv.kill(); } catch (e) { } try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch (e) { } process.exit(code); }
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); cleanup(1); } console.log('ok -', m); };
const post = async (p, body) => (await fetch(`http://127.0.0.1:${PORT}/api/${p}`, { method: 'POST', body: JSON.stringify(body) })).json();
class FakeR { constructor() { this.shadowMap = {}; this.info = { render: { calls: 0 } }; } setPixelRatio() { } setSize() { } render() { } }
async function client(name) {
  const html = await (await fetch(`http://127.0.0.1:${PORT}/`)).text();
  const dom = new JSDOM(html.replace(/<script[\s\S]*<\/script>/g, ''), { url: `http://127.0.0.1:${PORT}/`, runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  w.THREE = Object.assign({}, THREE, { WebGLRenderer: FakeR }); w.matchMedia = () => ({ matches: false }); w.requestAnimationFrame = () => 0;
  w.console.warn = () => { }; w.__ADDON_TEST = true; w.fetch = (u, o) => fetch(new URL(u, `http://127.0.0.1:${PORT}/`), o); w.setInterval = () => 0;
  w.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: (o, k) => k in o ? o[k] : () => { }, set: (o, k, v) => { o[k] = v; return true; } });
  let src = fs.readdirSync(path.join(root, 'src')).filter(f => f.endsWith('.js')).sort().map(f => fs.readFileSync(path.join(root, 'src', f), 'utf8')).join('\n');
  src += ';window.__T={get MODEBAR(){return MODEBAR},get P(){return P},get hero(){return hero},pl,NET,WORLD,ISLMAP,input,startGame,frame,setAcct,attack:()=>attack(),get worldReady(){return worldReady},getInteract:()=>getInteract(),get panel(){return panel},keydown:c=>dispatchEvent(new KeyboardEvent("keydown",{code:c})),keyup:c=>dispatchEvent(new KeyboardEvent("keyup",{code:c}))};';
  w.eval(src);
  const reg = await post('register', { login: name, pass: 'pass-' + name });
  w.__T.setAcct({ token: reg.token, login: reg.login, admin: reg.admin });
  const T = w.__T; T.now = 1000; T.w = w;
  for (let i = 0; i < 50 && !T.worldReady; i++) await sleep(100);
  T.startGame(true); T.P.tut = -1;
  return T;
}
const tick = async (Ts, sec) => { for (let i = 0; i < sec * 20; i++) { for (const T of Ts) { T.now += 50; T.frame(T.now); } await sleep(50); } };
(async () => {
  let st = null;
  for (let i = 0; i < 300; i++) { try { st = await (await fetch(`http://127.0.0.1:${PORT}/status`)).json(); if (st.world) break; } catch (e) { } await sleep(200); }
  assert(st && st.world, 'сервер світу запустився');
  let a = await client('Шеф'), b = await client('Ледар');
  await tick([a, b], 1.5);
  let F = a.w.__hideboss, G = b.w.__hideboss;
  assert(a.WORLD.on && b.WORLD.on && a.ISLMAP.hideboss, 'обидва в спільному світі, офіс є');
  for (const [T, dx] of [[a, 0], [b, -1.5]]) { T.pl.x = F.SPAWN.x + dx; T.pl.z = F.SPAWN.z; T.pl.y = 0; T.pl.hp = 9999; }
  await tick([a, b], 1);
  const lob = T => T.w.document.getElementById('mlobby');
  assert(lob(a) && lob(b) && lob(a).querySelectorAll('.map').length === 3, 'обидва в холі — в обох відкрите вікно лобі з трьома поверхами');
  assert(/Шеф/.test(lob(b).querySelector('.who').textContent) && /Ледар/.test(lob(a).querySelector('.who').textContent), 'у лобі видно обох гравців');
  // обидва голосують за 42-й кліком по картці; Шеф першим тисне «Я готовий» (його «хочу босом» онлайн нічого не важить)
  lob(a).querySelector('[data-lv="0"]').click(); lob(b).querySelector('[data-lv="0"]').click(); await tick([a, b], .8);
  assert(F.ST.vt[0] === 2 && G.ST.vt[0] === 2 && /🗳️ 2/.test(lob(b).querySelector('[data-lv="0"] .vc').textContent), 'сервер порахував 2 голоси за 42-й — видно в обох');
  lob(a).querySelector('.rdy').click(); await tick([a, b], 1.2);
  assert(!F.ST.on && /⏳ Не готовий/.test(lob(a).querySelector('.rdy').textContent) && /✅ Шеф/.test(lob(b).querySelector('.who').textContent), 'Шеф готовий — Ледар бачить ✅, раунд ще чекає');
  assert(G.ST.lf && /Чекаємо гравців 2\/5/.test(lob(b).querySelector('.row').textContent), 'лобі заповнюється: «Чекаємо гравців 2/5 — 🤖 боти доповнять лобі…»');
  G.lobbyDef().onReady();
  let sawBot = false, sawGo = false;
  for (let k = 0; k < 40 && !F.ST.on; k++) {
    await tick([a, b], .5);
    if (!F.ST.on && lob(a) && lob(b) && /🤖 Бот/.test(lob(a).querySelector('.who').textContent) && /🤖 Бот/.test(lob(b).querySelector('.who').textContent)) sawBot = true;
    if (!F.ST.on && lob(b) && /старт за/.test(lob(b).querySelector('.row').textContent)) sawGo = true;
  }
  assert(sawBot, 'сервер садить ботів у лобі — обидва бачать «🤖 Бот …» у списку');
  assert(sawGo, 'лобі повне (5/5), усі готові — «Усі на місці — старт за 3…»');
  await tick([a, b], .6);
  assert(F.ST.on && G.ST.on && F.ST.ro.length === 5 && G.ST.ro.length === 5 && F.ST.ro.filter(e => e.bot).length === 3, 'раунд почався в обох: 2 людини + 3 боти (рахує сервер)');
  assert(!lob(a) && !lob(b), 'раунд почався — вікно лобі закрилось в обох');
  // хто бос — жереб серед людей (не бот!); далі в тесті a — бос, b — офісник
  { const bk = F.bossE().k; assert(G.bossE().k === bk && (bk === 'Шеф' || bk === 'Ледар') && !F.bossE().bot, `жереб: бос — людина (${bk}), обидва бачать однаково`); if (bk === 'Ледар') { [a, b] = [b, a]; [F, G] = [G, F]; } }
  const BN = F.me().k, HN = G.me().k;
  assert(F.me().boss && G.me() && !G.me().boss && F.ST.ro.filter(e => e.bot).every(e => !e.boss), `${BN} — бос, ${HN} і 3 боти — офісники`);
  { const ra = a.w.document.getElementById('hb-role'), rb = b.w.document.getElementById('hb-role');
    assert(ra && ra.style.display !== 'none' && /Ти — БОС!/.test(ra.textContent) && rb && rb.style.display !== 'none' && /Ти — офісник/.test(rb.textContent), 'на старті велика картка: «Ти — БОС!» у боса, «Ти — офісник» в офісника'); }
  let it;
  assert(F.ST.v === 0 && G.ST.v === 0, 'граємо на 42-му, за який голосували');
  assert(F.inOffice(a.pl.x, a.pl.z) && a.w.document.getElementById('hb-blind').style.display === 'flex', 'бос — у скляному кабінеті на нараді');
  // Ледар ховається
  const nearPk = (v, x, z) => G.picks(v).some(sp => Math.hypot(sp.x - x, sp.z - z) < 2.4);
  const h = G.hideSpots().find(s => s.f.t === 'ficus' && !G.DESKS.some(d => Math.hypot(d.x - s.x, d.z - s.z) < 2.6) && !nearPk(0, s.x, s.z));
  b.pl.x = h.x; b.pl.z = h.z; await tick([a, b], .4);
  it = b.getInteract(); assert(it && /Замаскуватись/.test(it.l), `${HN} біля фікуса: F — «Замаскуватись»`); it.fn();
  await tick([a, b], 1);
  const eA = F.ST.ro.find(e => e.k === HN);
  assert(eA && eA.p === 'ficus' && G.me().p === 'ficus', 'сервер записав маскування — бачать обоє');
  const rB = Object.values(a.NET.players).find(r => r.name === HN), vB = F.V.ents.get(HN);
  assert(rB && !rB.h.root.visible && rB.tag.style.display === 'none', `у боса герой ${HN} й табличка з іменем сховані`);
  assert(vB && vB.prop && Math.hypot(vB.prop.position.x - h.x, vB.prop.position.z - h.z) < .6, `у боса на місці ${HN} стоїть фікус`);
  assert(!b.hero.root.visible && G.V.ents.get(HN).prop, `${HN} сам себе теж бачить фікусом`);
  assert(a.MODEBAR && a.MODEBAR.slots.map(q => q.id).join() === 'catch,check,bell,bk' && b.MODEBAR && b.MODEBAR.slots.map(q => q.id).join() === 'mask,decoy,ram,smoke,pl,pp,bk,ex', 'у кожного своя панель режиму: бос 👉🔍🔔📘, офісник 🎭📄🛞🚬✈️🧻📘🧯');
  // усі сховались — нарада закінчується раніше (з 10 с)
  for (let k = 0; k < 30 && F.ST.ph === 'meet'; k++) { b.pl.x = h.x; b.pl.z = h.z; await tick([a, b], .5); }
  assert(F.ST.ph === 'hunt' && G.ST.ph === 'hunt', 'нарада скінчилась — бос полює');
  await tick([a, b], .3);
  assert(a.w.document.getElementById('hb-blind').style.display === 'none', 'бос знову бачить');
  // бос промахується по справжньому предмету, потім ловить
  {
    // шафа подалі від усіх (боти теж ховаються й можуть таранити)
    const far = q => F.ST.ro.every(e => e.k === F.me().k || Math.hypot(e.x - q.x, e.z - q.z) > 5);
    let t0 = 0, ok = false;
    for (let k = 0; k < 4 && !ok; k++) {
      const f = F.FURN.find(q => q.v === 0 && q.t === 'cabinet' && !F.inOffice(q.x, q.z) && Math.hypot(q.x - h.x, q.z - h.z) > 5 && far(q) && F.hideSpots().some(s => s.f === q)) || F.FURN.find(q => q.v === 0 && q.t === 'cabinet' && !F.inOffice(q.x, q.z) && far(q));
      const hs = F.hideSpots().find(s => s.f === f) || { x: f.x + 1, z: f.z };
      a.pl.x = hs.x; a.pl.z = hs.z; await tick([a, b], .5);
      for (let j = 0; j < 10 && F.ST.stun > 0; j++) await tick([a, b], .3);
      t0 = G.ST.t; a.input.aimOk = true; a.input.ax = f.x; a.input.az = f.z; a.pl.atkCd = 0; a.attack(); await tick([a, b], 1);
      ok = G.ST.t > t0 + 5.5 && F.ST.t > t0 + 5.5;
    }
    assert(ok, `вдарив шафу — мінус 5 с, бачать обоє (${t0.toFixed(1)} → ${G.ST.t.toFixed(1)})`);
  }
  // кидалки онлайн: офісник бере ✈️ біля ксерокса й кидає — сервер рахує, бос бачить політ і чує «шурх»
  {
    const sp = G.picks(0).find(q => q.t === 'pl'), ang = [0, 1, 2, 3, 4, 5, 6, 7].map(k => k / 8 * Math.PI * 2);
    let st = null; for (const t of ang) { const x = sp.x + Math.sin(t) * 1.15, z = sp.z + Math.cos(t) * 1.15; if (G.floorAt(x, z) === 0 && G.navFree(x, z)) { st = { x, z }; break; } }
    b.pl.x = st.x; b.pl.z = st.z; await tick([a, b], .4);
    it = b.getInteract(); assert(it && /скласти літачок/.test(it.l), `${HN} біля ксерокса: «${it && it.l}»`); it.fn(); await tick([a, b], .8);
    assert(G.me().inv.pl === 3 && F.ST.ro.find(e => e.k === HN).inv.pl === 3, 'сервер видав ✈️×3 — видно в обох');
    let tx = null; for (const R of [5, 4, 3]) for (let j = 0; j < 24 && !tx; j++) { const t = j / 24 * Math.PI * 2, x = st.x + Math.sin(t) * R, z = st.z + Math.cos(t) * R; let ok = G.floorAt(x, z) === 0; for (let u = .1; u <= 1 && ok; u += .1) if (G.tallAt(st.x + (x - st.x) * u, st.z + (z - st.z) * u)) ok = false; if (ok) tx = { x, z }; }
    b.input.aimOk = true; b.input.ax = tx.x; b.input.az = tx.z; b.keydown('Digit5'); b.keyup('Digit5');
    let flew = false; for (let k = 0; k < 12; k++) { await tick([a, b], .1); if (F.V.proj.size) flew = true; }
    assert(flew && G.me().inv.pl === 2, `${HN} кинув ✈️ — ${BN} бачить літачок у польоті`);
    await tick([a, b], 1);
    if (!(F.V.noise && F.goal().id === 'noise')) console.log('  [шурх]', JSON.stringify({ noise: F.V.noise, tx, goal: F.goal(), gt: a.gameTime }));
    assert(F.V.noise && Math.hypot(F.V.noise.x - tx.x, F.V.noise.z - tx.z) < 1.2 && F.goal().id === 'noise', `${BN} (бос) чує «🔊 шурх!» і бачить, де`);
  }
  let caught = false;
  for (let k = 0; k < 6 && !caught; k++) {
    b.pl.x = h.x; b.pl.z = h.z; a.pl.x = h.x + .9; a.pl.z = h.z + .1; await tick([a, b], .6);
    a.input.aimOk = true; a.input.ax = h.x; a.input.az = h.z; a.pl.atkCd = 0; a.attack(); await tick([a, b], 1);
    caught = !!(F.ST.ro.find(e => e.k === HN) || {}).c;
  }
  assert(caught && G.me().c && F.ST.on, `бос клацнув по фікусу (${HN}) — «Попався!», але раунд іде: ще є боти`);
  // бос ловить ботів (позиції ботів рахує сервер)
  for (let k = 0; k < 60 && F.ST.on; k++) {
    const q = F.alive()[0]; if (!q) break;
    const v = F.V.ents.get(q.k), x = v ? v.ent.x : q.x, z = v ? v.ent.z : q.z;
    a.pl.x = x + .8; a.pl.z = z; await tick([a, b], .3);
    const v2 = F.V.ents.get(q.k);
    a.input.aimOk = true; a.input.ax = v2 ? v2.ent.x : q.x; a.input.az = v2 ? v2.ent.z : q.z; a.pl.atkCd = 0; a.attack(); await tick([a, b], .7);
  }
  assert(!F.ST.on && !G.ST.on, 'усі на килимі (і люди, і боти) — раунд скінчився в обох');
  await tick([a, b], .5);
  assert(a.P.addons.hideboss.bossWins === 1 && a.P.addons.hideboss.catches === 4, `${BN}: перемога боса й 4 спіймання в статистиці`);
  assert(b.P.addons.hideboss.caught === 1 && b.P.addons.hideboss.rounds === 1, `${HN}: «спіймали» в статистиці`);
  assert(b.hero.root.visible && Object.values(a.NET.players).find(r => r.name === HN).h.root.visible, `після раунду ${HN} знову людина`);
  assert((F.ST.sc[BN] || 0) >= 3 && (G.ST.sc[BN] || 0) >= 3, `табло: ${BN} має очки в обох`);
  assert(!a.MODEBAR && !b.MODEBAR, 'після раунду — звичайний хотбар в обох');
  // голосування в лобі: обидва за «57»; готовий лише офісник — боти доповнюють, а бос мовчить: іде відлік «без мовчунів»
  b.pl.x = F.SPAWN.x - 1; b.pl.z = F.SPAWN.z; a.pl.x = F.SPAWN.x; a.pl.z = F.SPAWN.z; await tick([a, b], .6);
  assert(lob(a) && lob(b), 'після раунду лобі знову відкрите в обох');
  lob(a).querySelector('[data-lv="1"]').click(); G.lobbyDef().onVote(1); await tick([a, b], .8);
  assert(F.ST.nv === 1 && G.ST.nv === 1 && F.ST.vt[1] === 2 && lob(a).querySelector('[data-lv="1"]').classList.contains('mine'), 'обидва голосують за 57 у вікні лобі — сервер порахував 2 голоси, наступний поверх — колл-центр');
  lob(b).querySelector('.rdy').click();
  for (let k = 0; k < 40 && !(F.ST.ax > 0 && F.ST.ax < 21.5); k++) await tick([a, b], .5);
  await tick([a, b], .3);
  console.log('  [лобі Шефа/Ледаря]', lob(a) && lob(a).querySelector('.row').textContent, '| lb', JSON.stringify(F.ST.lb), 'ax', F.ST.ax);
  assert(!F.ST.on && F.ST.lb.length === 5 && F.ST.ax > 15 && /стартуємо за/.test(lob(a).querySelector('.row').textContent), `${HN} готовий, лобі заповнили боти, ${BN} мовчить — «Усі на місці… без мовчунів стартуємо за ${Math.ceil(F.ST.ax)} с»`);
  lob(a).querySelector('.rdy').click();
  for (let k = 0; k < 20 && !F.ST.on; k++) await tick([a, b], .5);
  await tick([a, b], .5);
  assert(F.ST.on && F.bossE().k === HN && G.bossE().k === HN && F.ST.ro.length === 5, `${BN} теж готовий — старт; новий раунд: тепер бос — ${HN} (жереб, але не двічі поспіль)`);
  assert(!lob(a) && !lob(b), 'старт — вікно лобі закрилось в обох');
  assert(/Ти — БОС!/.test(b.w.document.getElementById('hb-role').textContent) && /Ти — офісник/.test(a.w.document.getElementById('hb-role').textContent), `картки ролей помінялись: ${HN} — «Ти — БОС!», ${BN} — «Ти — офісник»`);
  const F1 = F.FL[1];
  assert(F.ST.v === 1 && G.ST.v === 1 && F.floorAt(a.pl.x, a.pl.z) === 1 && F.floorAt(b.pl.x, b.pl.z) === 1 && G.inOffice(b.pl.x, b.pl.z), `обох перевезло на 57-й: бос — у кабінеті супервайзерки, ${BN} — у холі`);
  // Шеф ховається кріслом і таранить боса
  const hc = F.hideSpots(1).find(s => s.f.t === 'chair' && !F.FL[1].desks.some(d => Math.hypot(d.x - s.x, d.z - s.z) < 2.6) && !F.picks(1).some(sp => Math.hypot(sp.x - s.x, sp.z - s.z) < 2.4));
  a.pl.x = hc.x; a.pl.z = hc.z; await tick([a, b], .4);
  it = a.getInteract(); assert(it && /крісло/i.test(it.l) && /таранити/.test(it.l), `${BN} біля крісла: «Замаскуватись… (🛞 можна таранити!)»`); it.fn();
  for (let k = 0; k < 30 && F.ST.ph === 'meet'; k++) { a.pl.x = hc.x; a.pl.z = hc.z; await tick([a, b], .5); }
  assert(F.ST.ph === 'hunt' && G.ST.ro.find(e => e.k === BN).p === 'chair', `${BN} — крісло, бос вийшов з наради`);
  a.pl.x = F1.x - 6; a.pl.z = F1.z - 1; b.pl.x = F1.x - 3.5; b.pl.z = F1.z - 1; await tick([a, b], .6);
  a.input.aimOk = true; a.input.ax = b.pl.x; a.input.az = b.pl.z; a.keydown('Digit3');
  for (let k = 0; k < 20 && !(G.ST.stun > 0 && F.ST.stun > 0 && a.P.addons.hideboss.trips); k++) { b.pl.x = F1.x - 3.5; b.pl.z = F1.z - 1; await tick([a, b], .1); }
  if (!(F.ST.stun > .5 && G.ST.stun > .5)) console.log('  [таран]', JSON.stringify({ a: [a.pl.x - F1.x, a.pl.z - F1.z], b: [b.pl.x - F1.x, b.pl.z - F1.z], ram: F.V.ram, me: F.me(), sv: F.ST.ro.map(e => [e.k, e.x - F1.x, e.z - F1.z, e.p]) }));
  assert(F.ST.stun > .5 && G.ST.stun > .5 && a.P.addons.hideboss.trips === 1, `таран кріслом: бос лежить в обох (${G.ST.stun.toFixed(1)} с), ${BN}: +1 «збив боса»`);
  assert(G.goal().txt.includes('збили з ніг'), 'босу підказка: «Тебе збили з ніг!»');
  { const b0 = { x: b.pl.x, z: b.pl.z }; b.keydown('KeyW'); await tick([a, b], .4); assert(Math.hypot(b.pl.x - b0.x, b.pl.z - b0.z) < .3, 'збитий бос не може йти'); }
  // бос іде з поверху — раунд скінчився; далі готовий лише Шеф: Ледаря не чекаємо довше 25 с після заповнення лобі
  for (let k = 0; k < 12 && F.ST.on; k++) { b.pl.x = 0; b.pl.z = 0; await tick([a, b], .5); }
  assert(!F.ST.on && !G.ST.on, 'бос пішов з офісу — раунд скінчився');
  a.pl.x = F.SPAWN.x; a.pl.z = F.SPAWN.z; b.pl.x = F.SPAWN.x - 1; b.pl.z = F.SPAWN.z; await tick([a, b], 1);
  lob(a).querySelector('.rdy').click();
  let sawAx = false;
  for (let k = 0; k < 90 && !F.ST.on; k++) { b.pl.x = F.SPAWN.x - 1; b.pl.z = F.SPAWN.z; await tick([a, b], .5); if (lob(b) && /стартуємо за/.test(lob(b).querySelector('.row').textContent)) sawAx = true; }
  await tick([a, b], .5);
  assert(sawAx && F.ST.on && F.ST.ro.length === 5 && F.me() && !G.me() && F.ST.ro.filter(e => e.bot).length === 4, `${HN} мовчав 25 с після заповнення лобі — старт без нього: ${BN} + 4 боти`);
  assert(!lob(b) && /глядач/.test(G.goal().txt), `${HN} — глядач до наступного раунду, лобі в нього закрилось`);
  console.log('ALL OK'); cleanup(0);
})().catch(e => { console.error(e); cleanup(1); });
