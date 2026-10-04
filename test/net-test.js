// Інтеграційний тест мультиплеєра: запускає start.py і двох гравців у jsdom.
// Запуск: node test/net-test.js
const fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const { JSDOM } = require('jsdom');
const THREE = require('three');
const root = path.join(__dirname, '..');
const PORT = 7791;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); cleanup(1); } console.log('ok -', m); };
const srv = spawn('python3', [path.join(root, 'start.py'), '--no-ui', '--tunnel', 'none', '--port', String(PORT)], { stdio: 'ignore' });
function cleanup(code) { try { srv.kill(); } catch (e) { } process.exit(code); }
class FakeR { constructor() { this.shadowMap = {}; this.info = { render: { calls: 0 } }; } setPixelRatio() { } setSize() { } render() { } }
async function client(name) {
  const html = await (await fetch(`http://127.0.0.1:${PORT}/`)).text();
  const shell = html.replace(/<script[\s\S]*<\/script>/g, '');
  const dom = new JSDOM(shell, { url: `http://127.0.0.1:${PORT}/`, runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  w.THREE = Object.assign({}, THREE, { WebGLRenderer: FakeR }); w.matchMedia = () => ({ matches: false }); w.requestAnimationFrame = () => 0;
  w.console.warn = () => { }; w.fetch = fetch; w.setInterval = () => 0;
  w.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: (o, k) => k in o ? o[k] : () => { }, set: (o, k, v) => { o[k] = v; return true; } });
  let src = fs.readdirSync(path.join(root, 'src')).filter(f => f.endsWith('.js')).sort().map(f => fs.readFileSync(path.join(root, 'src', f), 'utf8')).join('\n');
  src += ';window.__T={get P(){return P},pl,NET,startGame,frame,sendChat,giftCoffee,nearRemote};';
  w.eval(src);
  w.document.querySelector('#netname').value = name;
  const T = w.__T; T.now = 1000; T.w = w;
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
  a.NET.wanted = false; a.NET.ws.close(); await tick([b], 1);
  assert(Object.keys(b.NET.players).length === 0, 'вихід гравця обробляється');
  const html = await (await fetch(`http://127.0.0.1:${PORT}/../start.py`)).status;
  assert(html === 404, 'вихід за межі dist/ заблоковано');
  console.log('ALL OK'); cleanup(0);
})().catch(e => { console.error(e); cleanup(1); });
