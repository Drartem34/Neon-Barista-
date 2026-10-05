#!/usr/bin/env node
/* Сервер світу «Бариста Кінця Світу».
   Запускається автоматично з start.py (потрібен Node.js і `npm install` один раз).
   Завантажує той самий код гри (src/*.js) без графіки + server/sim.js і рахує спільний світ.
   Протокол зі start.py — JSON-рядки:
     stdin:  {t:'join'|'leave'|'pl'|'in', ...}
     stdout: {to: <id гравця> | '*' | 'stats', m: {...}} */
const fs = require('fs'), path = require('path'), readline = require('readline');
const { JSDOM, VirtualConsole } = require('jsdom');
const THREE = require('three');
const ROOT = path.join(__dirname, '..');
const TPS = 30;

const vc = new VirtualConsole();
vc.on('error', (...a) => process.stderr.write('[world] ' + a.join(' ') + '\n'));
vc.on('warn', () => { });
vc.on('log', (...a) => process.stderr.write('[world] ' + a.join(' ') + '\n'));
vc.on('jsdomError', e => process.stderr.write('[world] ' + (e && e.message) + '\n'));

const shell = fs.readFileSync(path.join(ROOT, 'src/00_shell.html'), 'utf8') + '</body></html>';
const dom = new JSDOM(shell, { pretendToBeVisual: true, runScripts: 'outside-only', url: 'http://localhost/', virtualConsole: vc });
const w = dom.window;
class FakeRenderer { constructor() { this.shadowMap = {}; this.info = { render: { calls: 0 } }; } setPixelRatio() { } setSize() { } render() { } }
w.THREE = Object.assign({}, THREE, { WebGLRenderer: FakeRenderer });
w.matchMedia = () => ({ matches: false });
w.requestAnimationFrame = () => 0;
w.__NO_NET = true; w.__SIM = true;
w.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: (o, k) => k in o ? o[k] : () => { }, set: (o, k, v) => { o[k] = v; return true; } });

// аддони — ті самі, що й у гравців (острови, предмети мають збігатися)
const AD = path.join(ROOT, 'addons'), addons = [];
if (fs.existsSync(AD)) for (const name of fs.readdirSync(AD).sort()) {
  if (name[0] === '_' || name[0] === '.') continue;
  const f = path.join(AD, name);
  if (name.endsWith('.js') && fs.statSync(f).isFile()) addons.push({ id: name.slice(0, -3), src: name, code: fs.readFileSync(f, 'utf8') });
  else if (fs.statSync(f).isDirectory() && fs.existsSync(path.join(f, 'addon.js'))) addons.push({ id: name, src: name + '/addon.js', code: fs.readFileSync(path.join(f, 'addon.js'), 'utf8') });
}
w.__ADDON_CODE = addons;

process.stdout.on('error', () => process.exit(0));
const out = (to, m) => { process.stdout.write(JSON.stringify({ to, m }) + '\n'); };
w.__SIM_OUT = out;

let src = fs.readdirSync(path.join(ROOT, 'src')).filter(f => f.endsWith('.js')).sort().map(f => fs.readFileSync(path.join(ROOT, 'src', f), 'utf8')).join('\n');
src += '\n' + fs.readFileSync(path.join(__dirname, 'sim.js'), 'utf8');
w.eval(src);
w.__SIM_START();
process.stderr.write(`[world] світ запущено: аддонів ${addons.length}\n`);
out('ready', { ok: true });

const rl = readline.createInterface({ input: process.stdin });
rl.on('line', line => { let m; try { m = JSON.parse(line); } catch (e) { return; } try { w.__SIM_IN(m); } catch (e) { process.stderr.write('[world] input: ' + e.stack + '\n'); } });
rl.on('close', () => process.exit(0));

let last = Date.now();
setInterval(() => {
  const now = Date.now(), dt = Math.min(.1, (now - last) / 1000); last = now;
  try { w.__SIM_TICK(dt); } catch (e) { process.stderr.write('[world] tick: ' + e.stack + '\n'); }
}, 1000 / TPS);
