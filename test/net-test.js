// Інтеграційний тест мультиплеєра: запускає start.py і двох гравців у jsdom.
// Запуск: node test/net-test.js
const fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const { JSDOM } = require('jsdom');
const THREE = require('three');
const root = path.join(__dirname, '..');
const PORT = 7791;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); cleanup(1); } console.log('ok -', m); };
const os = require('os');
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'barista-net-'));
fs.copyFileSync(path.join(root, 'start.py'), path.join(tmpRoot, 'start.py'));
fs.cpSync(path.join(root, 'dist'), path.join(tmpRoot, 'dist'), { recursive: true });
fs.mkdirSync(path.join(tmpRoot, 'addons'));
fs.copyFileSync(path.join(root, 'addons/_examples/disco_island.js'), path.join(tmpRoot, 'addons/disco.js'));
fs.copyFileSync(path.join(root, 'addons/_examples/chaos_weapons.js'), path.join(tmpRoot, 'addons/chaos.js'));
fs.copyFileSync(path.join(root, 'addons/_examples/admin_items.js'), path.join(tmpRoot, 'addons/admin_items.js'));
fs.writeFileSync(path.join(tmpRoot, 'addons/broken.js'), "const A = Addon.info({ name: 'Зламаний' }); throw new Error('бум');");
fs.writeFileSync(path.join(tmpRoot, 'addons/_off.js'), "window.__OFF_RAN = 1;");
const srv = spawn('python3', [path.join(tmpRoot, 'start.py'), '--no-ui', '--no-world', '--tunnel', 'none', '--port', String(PORT)], { stdio: 'ignore' });
const post = async (p, body) => (await fetch(`http://127.0.0.1:${PORT}/api/${p}`, { method: 'POST', body: JSON.stringify(body) })).json();
function cleanup(code) { try { srv.kill(); } catch (e) { } try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch (e) { } process.exit(code); }
class FakeR { constructor() { this.shadowMap = {}; this.info = { render: { calls: 0 } }; } setPixelRatio() { } setSize() { } render() { } }
async function client(name) {
  const html = await (await fetch(`http://127.0.0.1:${PORT}/`)).text();
  const shell = html.replace(/<script[\s\S]*<\/script>/g, '');
  const dom = new JSDOM(shell, { url: `http://127.0.0.1:${PORT}/`, runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  w.THREE = Object.assign({}, THREE, { WebGLRenderer: FakeR }); w.matchMedia = () => ({ matches: false }); w.requestAnimationFrame = () => 0;
  w.console.warn = () => { }; w.fetch = (u, o) => fetch(new URL(u, `http://127.0.0.1:${PORT}/`), o); w.setInterval = () => 0;
  w.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: (o, k) => k in o ? o[k] : () => { }, set: (o, k, v) => { o[k] = v; return true; } });
  let src = fs.readdirSync(path.join(root, 'src')).filter(f => f.endsWith('.js')).sort().map(f => fs.readFileSync(path.join(root, 'src', f), 'utf8')).join('\n');
  src += ';window.__T={get P(){return P},pl,NET,startGame,frame,sendChat,giftCoffee,nearRemote,setAcct,save,atk:attack,get ACCT(){return ACCT},FUN,S_maxHP:()=>S.maxHP,useDrink,input,equip,makeItem,addItem,setDrink:d=>{selDrink=d},ADDONS,ISLMAP,BR,TABS,openPanel,closePanel,get worldReady(){return worldReady},STATICS,BASE,MON,PROPS,spawnMonster,pickUp,eqItem,attack,breakProp,applyPendingGifts,renderPanel,ADM:()=>ADM,BODIES,mount,dismount,carryTarget,pickUpAny,releaseCarry};';
  w.eval(src);
  const reg = await (await fetch(`http://127.0.0.1:${PORT}/api/register`, { method: 'POST', body: JSON.stringify({ login: name, pass: 'pass-' + name }) })).json();
  if (!reg.ok) throw new Error('register ' + name + ': ' + reg.e);
  w.__T.setAcct({ token: reg.token, login: reg.login, admin: reg.admin });
  const T = w.__T; T.now = 1000; T.w = w; T.reg = reg;
  T.startGame(true);
  return T;
}
const tick = async (Ts, sec) => { for (let i = 0; i < sec * 20; i++) { for (const T of Ts) { T.now += 50; T.frame(T.now); } await sleep(50); } };
(async () => {
  for (let i = 0; i < 40; i++) { try { await fetch(`http://127.0.0.1:${PORT}/status`); break; } catch (e) { await sleep(150); } }
  const st = await (await fetch(`http://127.0.0.1:${PORT}/status`)).json();
  assert(st.players === 0, 'сервер start.py відповідає, гравців 0');
  const a = await client('Оля'), b = await client('Тарас');
  await tick([a, b], 1.5);
  assert(a.NET.on && b.NET.on, 'обидва клієнти підключилися по WebSocket');
  assert(Object.keys(a.NET.players).length === 1 && Object.keys(b.NET.players).length === 1, 'кожен бачить іншого гравця');
  const st2 = await (await fetch(`http://127.0.0.1:${PORT}/status`)).json();
  assert(st2.players === 2 && st2.names.includes('Оля') && st2.names.includes('Тарас'), 'сервер бачить імена: ' + st2.names.join(', '));
  a.pl.x = 2; a.pl.z = 2.5; await tick([a, b], 1);
  const ra = Object.values(b.NET.players)[0];
  assert(Math.hypot(ra.x - a.pl.x, ra.z - a.pl.z) < .3, `рух синхронізується (${ra.x.toFixed(2)}, ${ra.z.toFixed(2)})`);
  a.sendChat('Привіт, Тарасе!'); await tick([a, b], .6);
  assert(b.w.document.querySelector('#chatlog').textContent.includes('Привіт, Тарасе!'), 'чат дійшов');
  b.pl.x = 2.8; b.pl.z = 2.5; await tick([a, b], .6);
  a.P.drinks.latte = 3; const r = a.nearRemote(); assert(r, 'гравець поруч для частування');
  const before = b.P.drinks.latte || 0; a.giftCoffee(r); await tick([a, b], .6);
  assert((b.P.drinks.latte || 0) === before + 1, 'кава-подарунок дійшла');
  // --- аддони з папки addons/
  assert(a.worldReady && a.ISLMAP.disco && a.BR.some(r => r.B.id === 'disco' || r.A.id === 'disco'), 'аддон додав острів із мостом');
  const rec = id => a.ADDONS.list.find(x => x.id === id);
  assert(rec('disco') && rec('disco').ok && rec('disco').name === 'Диско-острів', 'робочий аддон завантажився');
  assert(rec('broken') && !rec('broken').ok && !a.w.__OFF_RAN && !rec('_off'), 'зламаний аддон ізольовано, вимкнений (_) пропущено');
  a.openPanel('ax_disco'); assert(a.w.document.querySelector('#pbody').textContent.includes('Диско-острів'), 'вкладка аддона відкривається');
  a.w.document.querySelector('[data-disco="invite"]').click(); a.closePanel(); await tick([a, b], .5);
  assert(b.w.document.querySelector('#toasts').textContent.includes('Диско'), 'аддон передає повідомлення іншим гравцям');
  // --- аддон «Хаос-зброя»
  assert(rec('chaos') && rec('chaos').ok && a.BASE.nailgun && a.BASE.espump, 'аддон «Хаос-зброя» завантажився');
  assert(a.P.inv.some(i => i.b === 'nailgun') && a.P.inv.some(i => i.b === 'espump'), 'степлер і помпу видано');
  {
    const of = a.ISLMAP.office, ax = a.pl.x, az = a.pl.z;
    a.pl.x = of.x; a.pl.z = of.z + 3; a.pl.y = 0; a.pl.face = Math.PI; a.input.aimOk = false;
    for (const o of a.MON) if (!o.calm && Math.hypot(o.x - of.x, o.z - of.z) < 14) { o.x = of.x + 9; o.z = of.z + 7; }
    a.spawnMonster('office', of, of.x, of.z); const m = a.MON[a.MON.length - 1]; m.stun = 9;
    const ng = a.P.inv.find(i => i.b === 'nailgun'); a.equip(ng, 'hand1');
    for (let k = 0; k < 6 && !(m.pinT > 0); k++) { a.pl.atkCd = 0; a.pl.pending = null; a.atk(); await tick([a], .25); }
    assert(m.pinT > 0 && m.pinMesh, 'скоба прибила офісника до підлоги');
    m.pinT = 0; await tick([a], .1);
    const em = a.PROPS.find(p => p.type === 'espmachine' && Math.hypot(p.x - of.x, p.z - of.z) < 13);
    // кидаємо з чистої лінії: 3 м від кавоварки, де немає столів на шляху
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [.7, .7], [-.7, .7], [.7, -.7], [-.7, -.7]];
    const clear = ([dx, dz]) => a.STATICS.every(o => { for (let t = .8; t <= 3.2; t += .3) if (Math.hypot(em.x + dx * t - o.x, em.z + dz * t - o.z) < o.r + .7) return false; return true; });
    const [dx, dz] = dirs.find(clear) || dirs[0];
    m.stress = m.max * .25; m.stun = 0; a.pl.x = em.x + dx * 3.2; a.pl.z = em.z + dz * 3.2; m.x = a.pl.x; m.z = a.pl.z; a.pickUp(m); await tick([a], .1);
    a.pl.face = Math.atan2(em.x - a.pl.x, em.z - a.pl.z); a.input.aimOk = true; a.input.ax = em.x; a.input.az = em.z;
    a.w.dispatchEvent(new a.w.KeyboardEvent('keydown', { code: 'KeyQ' })); a.w.dispatchEvent(new a.w.KeyboardEvent('keyup', { code: 'KeyQ' }));
    assert(!m.carried && m.thrown > 0, 'Q кидає піднятого моба');
    for (let k = 0; k < 20 && em.alive; k++) await tick([a], .05);
    assert(!em.alive, 'кинутий моб підірвав кавоварку');
    a.input.aimOk = false; a.pl.x = ax; a.pl.z = az; await tick([a, b], .3);
  }
  // --- аддон «Видача предметів» (тільки адміни)
  assert(rec('admin_items') && rec('admin_items').ok, 'аддон видачі предметів завантажився');
  a.openPanel('admin'); for (let k = 0; k < 20 && !a.ADM().users; k++) await tick([a, b], .1); a.renderPanel();
  assert(a.w.document.querySelector('#pbody').textContent.includes('Видача предметів') && a.w.document.querySelector('[data-ai="give"]'), 'у вкладці Адмін є каталог предметів');
  a.closePanel(); b.openPanel('admin');
  assert(!b.w.document.querySelector('[data-ai="give"]'), 'звичайний гравець каталогу не бачить'); b.closePanel();
  assert(!(await post('admin', { token: b.reg.token, act: 'give', login: 'Тарас', kind: 'coins', id: 'coins', n: 999 })).ok, 'не-адмін не може видати собі монети');
  const mops = b.P.inv.filter(i => i.b === 'mop' && i.r === 4).length;
  const g1 = await post('admin', { token: a.reg.token, act: 'give', login: 'Тарас', kind: 'item', id: 'mop', n: 2, r: 4 });
  await tick([a, b], .5);
  assert(g1.ok && b.P.inv.filter(i => i.b === 'mop' && i.r === 4).length === mops + 2, 'адмін видав онлайн-гравцю 2 Epic швабри');
  const c0 = b.P.coins; await post('admin', { token: a.reg.token, act: 'give', login: 'Тарас', kind: 'coins', id: 'coins', n: 500 }); await tick([a, b], .4);
  assert(b.P.coins === c0 + 500, 'видача монет онлайн');
  const off = await post('register', { login: 'Офлайн', pass: 'abcd' });
  await post('save', { token: off.token, data: { P: { lvl: 1, coins: 0 } } });
  const g2 = await post('admin', { token: a.reg.token, act: 'give', login: 'Офлайн', kind: 'ing', id: 'syrup', n: 5 });
  const offSave = await post('load', { token: off.token });
  assert(g2.ok && /офлайн/.test(g2.where) && offSave.data.P.gifts.length === 1 && offSave.data.P.gifts[0].id === 'syrup', 'офлайн-гравцю подарунок чекає в сейві');
  b.P.gifts = [{ kind: 'ing', id: 'syrup', n: 5, r: 0, by: 'Оля' }]; const s0 = b.P.ing.syrup || 0; b.applyPendingGifts();
  assert(b.P.ing.syrup === s0 + 5 && !b.P.gifts, 'накопичені подарунки видаються при вході');
  assert(!(await post('admin', { token: a.reg.token, act: 'give', login: 'Тарас', kind: 'item', id: '../x', n: 1 })).ok, 'сміттєві id відхиляються');
  // --- акаунти: сейв на сервері переживає зміну посилання (новий домен = порожній localStorage)
  a.P.coins = 4242; a.save(); await tick([a, b], .5);
  const ld = await post('load', { token: a.reg.token });
  assert(ld.ok && ld.data && ld.data.P.coins === 4242, 'прогрес збережено на сервері під акаунтом');
  const relog = await post('login', { login: 'Оля', pass: 'pass-Оля' });
  const ld2 = await post('load', { token: relog.token });
  assert(relog.ok && ld2.data.P.coins === 4242, 'вхід з іншого посилання повертає прогрес');
  assert(!(await post('login', { login: 'Оля', pass: 'wrong' })).ok, 'невірний пароль не пускає');
  assert(!(await post('register', { login: 'оля', pass: 'xxxx' })).ok, 'логін не можна зайняти двічі (регістр не важливий)');
  assert(a.reg.admin && !b.reg.admin, 'перший акаунт — адмін');
  assert(!(await post('admin', { token: b.reg.token, act: 'list' })).ok, 'звичайний гравець не має доступу до адмінки');
  const list = await post('admin', { token: a.reg.token, act: 'list' });
  assert(list.ok && list.users.filter(u => u.online).length === 2 && list.users.some(u => !u.online), 'адмін бачить список гравців онлайн');
  b.pl.atkCd = 0; b.pl.x = 0; b.pl.z = 3; b.atk(); await tick([a, b], .4);
  const rb = Object.values(a.NET.players)[0];
  assert(rb.act === 'atk', 'інші гравці бачать, що гравець атакує');
  // --- тролінг: кава в обличчя й удар шваброю
  a.pl.x = 2; a.pl.z = 2.5; b.pl.x = 4.5; b.pl.z = 2.5; b.pl.kx = b.pl.kz = 0; await tick([a, b], .5);
  a.P.drinks.latte = 3; a.setDrink('latte'); a.input.aimOk = true; a.input.ax = 4.5; a.input.az = 2.5; a.useDrink(); await tick([a, b], .6);
  assert(b.FUN.scald > 0, 'гаряча кава в тімейта — він «ошпарений»');
  b.FUN.scald = 0; b.pl.x = 2.9; b.pl.z = 2.5; await tick([a, b], .4);
  const mop = a.makeItem('mop', 2); a.addItem(mop, true); a.equip(mop, 'hand1'); a.pl.atkCd = 0; a.atk(); await tick([a, b], .15);
  const kick = Math.hypot(b.pl.kx || 0, b.pl.kz || 0); const bx = b.pl.x; await tick([a, b], .4);
  assert(kick > 3 || Math.abs(b.pl.x - bx) > .5 || b.pl.x > 3.4, 'удар шваброю відкидає тімейта');
  assert(b.pl.hp < b.S_maxHP() || b.pl.hp < 100, 'удар по другу знімає здоров’я (' + Math.round(b.pl.hp) + ')');
  // --- таран візком і збиття друга з візка
  {
    b.pl.hp = 100; b.pl.x = 2; b.pl.z = 5; b.pl.kx = b.pl.kz = 0; b.pl.ride = null;
    const cart = b.BODIES.find(o => o.kind === 'cart'); cart.fall = false; cart.held = false; cart.x = 2; cart.z = 5.2;
    b.mount(cart); await tick([a, b], .5);
    assert(Object.values(a.NET.players)[0].act === 'chair', 'друг сидить у візку');
    a.pl.x = 2; a.pl.z = 3.6; a.pl.face = 0; a.input.aimOk = true; a.input.ax = 2; a.input.az = 5.5;
    a.pl.atkCd = 0; a.pl.pending = null; a.atk(); await tick([a, b], .5);
    assert(!b.pl.ride, 'ударом збив друга з візка');
    b.pl.x = 4; b.pl.z = 1; b.pl.kx = b.pl.kz = 0; const hp0 = b.pl.hp; await tick([a, b], .4);
    const ac = a.BODIES.find(o => o.kind === 'cart'); ac.fall = false; ac.held = false; ac.x = .3; ac.z = 1; a.pl.x = .3; a.pl.z = 1; a.mount(ac);
    ac.vx = 12; ac.vz = 0; await tick([a, b], .6);
    assert(b.pl.hp < hp0 && Math.hypot(b.pl.kx || 0, b.pl.kz || 0) + Math.abs(b.pl.x - 4) > .3, 'таран візком по другу');
    a.dismount(); a.input.aimOk = false; await tick([a, b], .2);
  }
  // --- друг бачить, що я несу
  {
    const bin = a.BODIES.find(o => o.kind === 'bin'); bin.fall = false; bin.x = a.pl.x + .8; bin.z = a.pl.z; bin.vx = bin.vz = 0;
    const t = a.carryTarget(); assert(t && t[0] === 'body', 'бак можна підняти'); a.pickUpAny(t); await tick([a, b], .5);
    const ra = Object.values(b.NET.players)[0];
    assert(/^b:/.test(ra.cr) && ra.crMesh && ra.act === 'carry', 'друг бачить, що я несу (' + ra.cr + ')');
    a.releaseCarry(true); await tick([a, b], .5);
    assert(!Object.values(b.NET.players)[0].crMesh || !Object.values(b.NET.players)[0].crMesh.parent, 'після кидка в руках порожньо');
  }
  // --- підняти й жбурнути друга
  {
    b.pl.hp = 100; b.pl.x = a.pl.x + 1; b.pl.z = a.pl.z; b.pl.kx = b.pl.kz = 0; await tick([a, b], .5);
    for (const o of a.BODIES) if (Math.hypot(o.x - a.pl.x, o.z - a.pl.z) < 3) { o.x += 6; }
    const t = a.carryTarget(); assert(t && t[0] === 'player', 'друга можна підняти');
    a.pickUpAny(t); await tick([a, b], .5);
    assert(b.FUN.held && b.pl.y > 1, 'друга підняли над головою');
    a.pl.face = Math.PI / 2; a.releaseCarry(true); await tick([a, b], .3);
    assert(!b.FUN.held && Math.hypot(b.pl.kx || 0, b.pl.kz || 0) > 2, 'друга жбурнули');
    await tick([a, b], 1);
  }
  // --- вихід гравця
  a.NET.wanted = false; a.NET.ws.close(); await tick([b], 1);
  assert(Object.keys(b.NET.players).length === 0, 'вихід гравця обробляється');
  // --- бан / розбан
  assert((await post('admin', { token: a.reg.token, act: 'ban', login: 'Тарас', reason: 'тест' })).ok, 'адмін забанив гравця');
  await tick([b], .6);
  assert(!b.NET.on && !b.w.document.querySelector('#banned').hidden, 'забаненого викинуло з гри з екраном бану');
  const bl = await post('login', { login: 'Тарас', pass: 'pass-Тарас' });
  assert(!bl.ok && bl.banned, 'забанений не може увійти');
  assert((await post('admin', { token: a.reg.token, act: 'unban', login: 'Тарас' })).ok && (await post('login', { login: 'Тарас', pass: 'pass-Тарас' })).ok, 'розбан повертає доступ');
  // --- видалення акаунта
  const c = await post('register', { login: 'Тимчасовий', pass: 'abcd' });
  assert(!(await post('delete', { token: c.token, pass: 'nope' })).ok, 'видалення без правильного пароля не працює');
  assert((await post('delete', { token: c.token, pass: 'abcd' })).ok && !(await post('login', { login: 'Тимчасовий', pass: 'abcd' })).ok, 'акаунт видалено');
  const html = await (await fetch(`http://127.0.0.1:${PORT}/../start.py`)).status;
  assert(html === 404, 'вихід за межі dist/ заблоковано');
  console.log('ALL OK'); cleanup(0);
})().catch(e => { console.error(e); cleanup(1); });
