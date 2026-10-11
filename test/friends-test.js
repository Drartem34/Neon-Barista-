// Тест друзів: start.py + двоє гравців у jsdom.
// Запит у друзі → відмова / прийняття → обидва бачать одне одного (і це збережено на сервері);
// запрошення «до мене» → телепорт; запрошення в режим → mode.go(); відмова → тост у запрошувача; вихід → «не в мережі».
// Запуск: node test/friends-test.js
const fs = require('fs'), path = require('path'), os = require('os'), { spawn } = require('child_process');
const { JSDOM } = require('jsdom');
const THREE = require('three');
const root = path.join(__dirname, '..');
const PORT = 7863;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'barista-friends-'));
fs.copyFileSync(path.join(root, 'start.py'), path.join(tmpRoot, 'start.py'));
for (const d of ['dist', 'src', 'server']) fs.cpSync(path.join(root, d), path.join(tmpRoot, d), { recursive: true });
fs.symlinkSync(path.join(root, 'node_modules'), path.join(tmpRoot, 'node_modules'));
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
  w.console.warn = () => { }; w.fetch = (u, o) => fetch(new URL(u, `http://127.0.0.1:${PORT}/`), o); w.setInterval = () => 0;
  w.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: (o, k) => k in o ? o[k] : () => { }, set: (o, k, v) => { o[k] = v; return true; } });
  let src = fs.readdirSync(path.join(root, 'src')).filter(f => f.endsWith('.js')).sort().map(f => fs.readFileSync(path.join(root, 'src', f), 'utf8')).join('\n');
  src += ';window.__T={get P(){return P},pl,NET,FR,MODES,startGame,frame,setAcct,openPanel,closePanel,renderFriends,get panel(){return panel},get worldReady(){return worldReady}};';
  w.eval(src);
  const reg = await post('register', { login: name, pass: 'pass-' + name });
  w.__T.setAcct({ token: reg.token, login: reg.login, admin: reg.admin });
  const T = w.__T; T.now = 1000; T.w = w; T.doc = w.document;
  for (let i = 0; i < 50 && !T.worldReady; i++) await sleep(100);
  T.startGame(true); T.P.tut = -1;
  return T;
}
const tick = async (Ts, sec) => { for (let i = 0; i < sec * 20; i++) { for (const T of Ts) { T.now += 50; T.frame(T.now); } await sleep(50); } };
const until = async (Ts, cond, sec = 4) => { for (let i = 0; i < sec * 10 && !cond(); i++) await tick(Ts, .1); return cond(); };
const pops = T => [...T.doc.querySelectorAll('#frpops .frpop')];
const toasts = T => T.doc.querySelector('#toasts') ? T.doc.querySelector('#toasts').textContent : '';
const body = T => T.doc.querySelector('#pbody');
(async () => {
  let st = null;
  for (let i = 0; i < 150; i++) { try { st = await (await fetch(`http://127.0.0.1:${PORT}/status`)).json(); if (st) break; } catch (e) { } await sleep(200); }
  assert(st, 'сервер запустився');
  const a = await client('Ліна'), b = await client('Богдан');
  assert(await until([a, b], () => a.NET.on && b.NET.on && Object.keys(a.NET.players).length && Object.keys(b.NET.players).length), 'обидва онлайн і бачать одне одного');
  // офлайн-повідомлення
  a.NET.on = false; const off = a.renderFriends(); a.NET.on = true;
  assert(/Друзі доступні в онлайні/.test(off), 'без мережі вкладка каже «Друзі доступні в онлайні»');
  // запит → відмова
  a.openPanel('friends'); await until([a, b], () => a.FR.list);
  assert(a.FR.list && a.FR.list.length === 0, 'вкладка «👥 Друзі» відкрилась, друзів поки нема');
  let add = body(a).querySelector('[data-fr="add"][data-n="Богдан"]');
  assert(add && /Додати/.test(add.textContent), 'Богдан у списку «Зараз у грі» з кнопкою «➕ Додати»');
  add.click();
  assert(await until([a, b], () => pops(b).length), 'Богдан отримав спливашку');
  assert(/Ліна.*хоче додати тебе в друзі/.test(pops(b)[0].textContent), 'текст «Ліна хоче додати тебе в друзі»');
  pops(b)[0].querySelector('[data-n]').click();
  assert(await until([a, b], () => /відхилив запит/.test(toasts(a))), 'відмова → Ліна бачить тост «відхилив запит»');
  // запит за ніком → прийняти
  body(a).querySelector('#frname').value = 'богдан';
  body(a).querySelector('[data-fr="addname"]').click();
  assert(await until([a, b], () => pops(b).length), 'запит за ніком (без урахування регістру) дійшов');
  pops(b)[0].querySelector('[data-y]').click();
  assert(await until([a, b], () => a.FR.list && a.FR.list.some(f => f.n === 'Богдан' && f.on)), 'Ліна бачить Богдана в друзях (онлайн)');
  b.openPanel('friends');
  assert(await until([a, b], () => b.FR.list && b.FR.list.some(f => f.n === 'Ліна' && f.on)), 'Богдан бачить Ліну в друзях (онлайн)');
  const acc = JSON.parse(fs.readFileSync(path.join(tmpRoot, 'saves', 'accounts.json'), 'utf8'));
  assert(acc.users['ліна'].friends.includes('богдан') && acc.users['богдан'].friends.includes('ліна'), 'дружба збережена на сервері (saves/accounts.json)');
  await tick([a, b], .3);
  assert(/Богдан/.test(body(a).querySelector('.frlist').textContent) && body(a).querySelector('[data-fr="pick"][data-n="Богдан"]'), 'у списку друзів є «🎮 Запросити»');
  // запрошення «до мене» → телепорт
  a.pl.x = 6; a.pl.z = -4; b.pl.x = -8; b.pl.z = 9;
  await tick([a, b], .3);
  body(a).querySelector('[data-fr="pick"][data-n="Богдан"]').click();
  const me = body(a).querySelector('[data-fr="inv"][data-md=""]');
  assert(me && /До мене/.test(me.textContent), 'вибір: «📍 До мене» і режими');
  me.click();
  assert(await until([a, b], () => pops(b).length), 'Богдан отримав запрошення');
  assert(/Ліна.*запрошує тебе/.test(pops(b)[0].textContent), 'текст «Ліна запрошує тебе …»');
  pops(b)[0].querySelector('[data-y]').click();
  await sleep(400); await tick([a, b], .3);
  assert(Math.hypot(b.pl.x - a.pl.x, b.pl.z - a.pl.z) < 3, `прийняв → Богдан телепортувався до Ліни (${b.pl.x.toFixed(1)},${b.pl.z.toFixed(1)})`);
  assert(await until([a, b], () => /прийняв запрошення/.test(toasts(a))), 'Ліна бачить «прийняв запрошення»');
  // запрошення в режим → mode.go() (лобі)
  let went = 0;
  for (const T of [a, b]) T.MODES.push({ id: 'tmode', ic: '🧪', n: 'Тест-режим', go() { if (T === b) went++; }, here: () => false });
  a.openPanel('friends'); await tick([a, b], .2);
  body(a).querySelector('[data-fr="pick"][data-n="Богдан"]').click();
  body(a).querySelector('[data-fr="inv"][data-md="tmode"]').click();
  assert(await until([a, b], () => pops(b).length && /Тест-режим/.test(pops(b)[0].textContent)), 'запрошення в режим: «запрошує тебе в 🧪 Тест-режим»');
  pops(b)[0].querySelector('[data-y]').click();
  assert(went === 1, 'прийняв → Богдан пішов у лобі режиму (mode.go())');
  // відмова на запрошення
  await tick([a, b], .5);
  a.openPanel('friends'); await tick([a, b], .2);
  body(a).querySelector('[data-fr="pick"][data-n="Богдан"]').click();
  body(a).querySelector('[data-fr="inv"][data-md=""]').click();
  assert(await until([a, b], () => pops(b).length), 'третє запрошення дійшло');
  const bx = b.pl.x;
  pops(b)[0].querySelector('[data-n]').click();
  assert(await until([a, b], () => /відхилив запрошення/.test(toasts(a))), 'відмова → Ліна бачить тост «відхилив запрошення»');
  assert(b.pl.x === bx, 'після відмови Богдан нікуди не перемістився');
  // ліміт запрошень
  for (let i = 0; i < 4; i++) a.NET.ws.send(JSON.stringify({ t: 'fr', op: 'inv', n: 'Богдан', md: '' }));
  assert(await until([a, b], () => /Не так швидко/.test(toasts(a))), 'запрошення обмежені за частотою');
  // вихід → «не в мережі»
  b.NET.wanted = false; b.NET.ws.close();
  assert(await until([a], () => a.FR.list && a.FR.list.some(f => f.n === 'Богдан' && !f.on), 6), 'Богдан вийшов → у Ліни він «не в мережі»');
  assert(/не в мережі/.test(body(a).textContent), 'у вкладці видно статус «не в мережі»');
  console.log('ALL OK'); cleanup(0);
})().catch(e => { console.error(e); cleanup(1); });
