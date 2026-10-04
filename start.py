#!/usr/bin/env python3
"""
Бариста Кінця Світу — сервер для гри з друзями.

Що робить:
  • роздає гру (dist/index.html) по HTTP;
  • тримає WebSocket /ws: гравці бачать одне одного, пишуть у чат, махають і частують кавою;
  • піднімає публічний тунель, щоб друзі підключилися з будь-якої мережі
    (cloudflared → ngrok → ssh localhost.run — що знайдеться першим);
  • показує живий монітор у терміналі.

Запуск:
  python3 start.py                 # порт 7777, тунель автоматично
  python3 start.py --port 8088     # інший порт
  python3 start.py --tunnel none   # тільки локальна мережа
  python3 start.py --tunnel ngrok  # примусово ngrok (cloudflared / ssh — так само)

Потрібен лише Python 3.8+. psutil — за бажанням (для CPU/RAM у моніторі).
Клавіші в моніторі: [T] тунель увімк/вимк · [Q] вихід.
"""
import argparse
import asyncio
import base64
import datetime
import hashlib
import json
import mimetypes
import os
import re
import shutil
import socket
import struct
import subprocess
import sys
import threading
import time
import traceback

try:
    import psutil
except ImportError:
    psutil = None

# ===================== НАЛАШТУВАННЯ =====================
DEFAULT_PORT = 7777            # змінено з 5000, щоб не заважати іншим серверам
MAX_PLAYERS = 32
TICK = 0.1                     # як часто сервер розсилає стан гравців (с)
ROOT = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(ROOT, 'dist')
WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'

# ===================== КОЛЬОРИ =====================
if os.name == 'nt':
    os.system('')  # вмикає ANSI-кольори у Windows 10+

class C:
    GREEN = '\033[92m'; RED = '\033[91m'; CYAN = '\033[96m'; YELLOW = '\033[93m'
    MAG = '\033[95m'; DIM = '\033[2m'; RESET = '\033[0m'

def vlen(s):
    return len(re.sub(r'\033\[[0-9;]*m', '', s))

# ===================== ЛОГ =====================
os.makedirs(os.path.join(ROOT, 'logs'), exist_ok=True)
LOG_PATH = os.path.join(ROOT, 'logs', datetime.datetime.now().strftime('server_%Y%m%d_%H%M%S.txt'))
_log = open(LOG_PATH, 'a', encoding='utf-8')

def log(msg):
    _log.write(f'[{datetime.datetime.now():%H:%M:%S}] {msg}\n')
    _log.flush()

def excepthook(t, v, tb):
    if issubclass(t, KeyboardInterrupt):
        return
    log('КРИТИЧНА ПОМИЛКА:\n' + ''.join(traceback.format_exception(t, v, tb)))
    print(f'\n{C.RED}[!] Сервер впав. Лог: {LOG_PATH}{C.RESET}')
sys.excepthook = excepthook

def local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('10.255.255.255', 1))
        return s.getsockname()[0]
    except Exception:
        return '127.0.0.1'
    finally:
        s.close()

# ===================== ТУНЕЛЬ =====================
class Tunnel:
    """Запускає один із тунелів і витягує публічне посилання з його виводу."""
    PATTERNS = {
        'cloudflared': re.compile(r'https://[a-z0-9-]+\.trycloudflare\.com'),
        'ngrok': re.compile(r'url=(https://[^\s"]+)'),
        'ssh': re.compile(r'https://[a-z0-9.-]+\.(?:lhr\.life|localhost\.run)'),
        'serveo': re.compile(r'(https://[a-z0-9.-]+\.serveo\.net)'),
    }

    def __init__(self, port, mode):
        self.port, self.mode = port, mode
        self.proc = None
        self.kind = ''
        self.url = ''
        self.status = 'OFFLINE'

    def available(self):
        found = []
        if shutil.which('cloudflared'): found.append('cloudflared')
        if shutil.which('ngrok'): found.append('ngrok')
        if shutil.which('ssh'): 
            found.append('ssh')
            found.append('serveo')
        return found

    def command(self, kind):
        p = str(self.port)
        if kind == 'cloudflared':
            return ['cloudflared', 'tunnel', '--no-autoupdate', '--url', f'http://localhost:{p}']
        if kind == 'ngrok':
            return ['ngrok', 'http', p, '--log', 'stdout', '--log-format', 'logfmt']
        if kind == 'serveo':
            return ['ssh', '-o', 'StrictHostKeyChecking=no', '-o', 'ServerAliveInterval=30', '-o', 'ExitOnForwardFailure=yes',
                    '-R', f'80:localhost:{p}', 'serveo.net']
        return ['ssh', '-o', 'StrictHostKeyChecking=no', '-o', 'ServerAliveInterval=30', '-o', 'ExitOnForwardFailure=yes',
                '-R', f'80:localhost:{p}', 'nokey@localhost.run']

    def start(self):
        if self.proc and self.proc.poll() is None:
            return
        if self.mode == 'none':
            self.status = 'ВИМКНЕНО (--tunnel none)'
            return
        options = self.available() if self.mode == 'auto' else [self.mode]
        options = [o for o in options if shutil.which(o if o not in ('ssh', 'serveo') else 'ssh')]
        if not options:
            self.status = 'НЕМАЄ (встанови cloudflared або ngrok)'
            log('Тунель: не знайдено cloudflared / ngrok / ssh')
            return
        self.kind = options[0]
        self.url = ''
        self.status = f'ЗАПУСК ({self.kind})…'
        log(f'Тунель: запуск {self.kind}: {" ".join(self.command(self.kind))}')
        try:
            self.proc = subprocess.Popen(self.command(self.kind), stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                         stdin=subprocess.DEVNULL, text=True, bufsize=1)
        except Exception as e:
            self.status = f'ПОМИЛКА: {e}'
            log(f'Тунель: помилка {e}')
            return
        threading.Thread(target=self._read, daemon=True).start()

    def _read(self):
        pat = self.PATTERNS[self.kind]
        proc = self.proc
        for line in proc.stdout:
            _log.write(f'[{self.kind}] {line}')
            if not self.url:
                m = pat.search(line)
                if m:
                    self.url = m.group(1) if m.groups() else m.group(0)
                    self.status = f'ONLINE ({self.kind})'
                    log(f'Тунель: {self.url}')
        _log.flush()
        if proc is self.proc:
            self.status = 'ЗУПИНЕНО' if self.status.startswith('ONLINE') else f'ПОМИЛКА ({self.kind}) — дивись лог'
            self.url = ''

    def stop(self):
        if self.proc and self.proc.poll() is None:
            try:
                self.proc.terminate()
                self.proc.wait(timeout=3)
            except Exception:
                try: self.proc.kill()
                except Exception: pass
        self.proc = None
        self.url = ''
        self.status = 'OFFLINE'

    def toggle(self):
        if self.proc and self.proc.poll() is None:
            self.stop()
        else:
            if self.mode == 'none':
                self.mode = 'auto'
            self.start()

# ===================== ГРАВЦІ =====================
class Player:
    __slots__ = ('id', 'name', 'writer', 'state', 'joined', 'msgs', 'last', 'ip')

    def __init__(self, pid, writer, ip):
        self.id, self.writer, self.ip = pid, writer, ip
        self.name = f'Бариста-{pid}'
        self.state = {}
        self.joined = time.time()
        self.msgs = []
        self.last = time.time()

PLAYERS = {}
_next_id = 1
STATS = {'http': 0, 'ws_in': 0, 'ws_out': 0, 'chat': 0}

def clean_name(s):
    s = re.sub(r'[\x00-\x1f<>&"\'`]', '', str(s or '')).strip()
    return s[:20] or None

def clean_text(s, n=200):
    return re.sub(r'[\x00-\x1f]', ' ', str(s or ''))[:n].strip()

# ===================== WEBSOCKET (стандарт RFC 6455, без сторонніх бібліотек) =====================
def ws_frame(data: bytes, opcode=1):
    head = bytearray([0x80 | opcode])
    n = len(data)
    if n < 126:
        head.append(n)
    elif n < 65536:
        head.append(126); head += struct.pack('>H', n)
    else:
        head.append(127); head += struct.pack('>Q', n)
    return bytes(head) + data

async def ws_recv(reader):
    """Повертає (opcode, payload). Збирає фрагментовані повідомлення."""
    buf, first_op = b'', None
    while True:
        h = await reader.readexactly(2)
        fin, op = h[0] & 0x80, h[0] & 0x0F
        masked, n = h[1] & 0x80, h[1] & 0x7F
        if n == 126:
            n = struct.unpack('>H', await reader.readexactly(2))[0]
        elif n == 127:
            n = struct.unpack('>Q', await reader.readexactly(8))[0]
        if n > 64 * 1024:
            raise ValueError('завелике повідомлення')
        mask = await reader.readexactly(4) if masked else b''
        data = await reader.readexactly(n)
        if masked:
            data = bytes(b ^ mask[i & 3] for i, b in enumerate(data))
        if op >= 8:                      # керуючі кадри
            return op, data
        if first_op is None:
            first_op = op
        buf += data
        if fin:
            return first_op, buf

async def send(p: Player, obj):
    try:
        raw = json.dumps(obj, ensure_ascii=False, separators=(',', ':')).encode()
        p.writer.write(ws_frame(raw))
        STATS['ws_out'] += 1
        if p.writer.transport.get_write_buffer_size() > 512 * 1024:
            raise ConnectionError('клієнт не встигає читати')
    except Exception:
        try: p.writer.close()
        except Exception: pass

async def broadcast(obj, skip=None):
    for p in list(PLAYERS.values()):
        if p is not skip:
            await send(p, obj)

async def ws_session(reader, writer, headers, ip):
    global _next_id
    key = headers.get('sec-websocket-key', '')
    accept = base64.b64encode(hashlib.sha1((key + WS_GUID).encode()).digest()).decode()
    writer.write(('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n'
                  f'Sec-WebSocket-Accept: {accept}\r\n\r\n').encode())
    await writer.drain()
    if len(PLAYERS) >= MAX_PLAYERS:
        writer.write(ws_frame(json.dumps({'t': 'sys', 'm': 'Сервер заповнений'}).encode()))
        writer.close()
        return
    pid = _next_id; _next_id += 1
    p = Player(pid, writer, ip)
    PLAYERS[pid] = p
    log(f'+ гравець #{pid} з {ip}')
    try:
        while True:
            op, data = await asyncio.wait_for(ws_recv(reader), timeout=60)
            if op == 8:          # close
                break
            if op == 9:          # ping → pong
                writer.write(ws_frame(data, 10)); continue
            if op != 1:
                continue
            STATS['ws_in'] += 1
            p.last = time.time()
            try:
                msg = json.loads(data.decode('utf-8'))
            except Exception:
                continue
            await handle_msg(p, msg)
    except (asyncio.IncompleteReadError, ConnectionError, asyncio.TimeoutError, ValueError, OSError):
        pass
    finally:
        PLAYERS.pop(pid, None)
        log(f'- гравець #{pid} «{p.name}» вийшов')
        await broadcast({'t': 'leave', 'id': pid})
        try: writer.close()
        except Exception: pass

async def handle_msg(p: Player, m):
    t = m.get('t')
    if t == 'join':
        p.name = clean_name(m.get('name')) or p.name
        await send(p, {'t': 'hello', 'id': p.id, 'players': [{'id': o.id, 'name': o.name, 's': o.state} for o in PLAYERS.values() if o is not p]})
        await broadcast({'t': 'join', 'id': p.id, 'name': p.name}, skip=p)
        log(f'  #{p.id} назвався «{p.name}»')
    elif t == 's':
        s = {}
        for k in ('x', 'y', 'z', 'f'):
            v = m.get(k)
            if isinstance(v, (int, float)) and abs(v) < 1e4:
                s[k] = round(float(v), 2)
        for k in ('m', 'w', 'g', 'e'):
            if k in m: s[k] = m[k] if isinstance(m[k], (int, bool)) or (isinstance(m[k], str) and len(m[k]) < 12) else 0
        for k in ('a', 'i', 'zn'):
            v = m.get(k)
            if isinstance(v, str) and len(v) < 24: s[k] = v
        if isinstance(m.get('l'), int): s['l'] = m['l']
        p.state = s
    elif t == 'chat':
        now = time.time()
        p.msgs = [x for x in p.msgs if now - x < 10]
        if len(p.msgs) >= 6:
            await send(p, {'t': 'sys', 'm': 'Не так швидко — зачекай кілька секунд.'}); return
        p.msgs.append(now)
        text = clean_text(m.get('m'))
        if text:
            STATS['chat'] += 1
            log(f'  чат «{p.name}»: {text}')
            await broadcast({'t': 'chat', 'id': p.id, 'name': p.name, 'm': text})
    elif t == 'emote':
        e = m.get('e')
        if e in ('wave', 'dance', 'cheer', 'sit'):
            await broadcast({'t': 'emote', 'id': p.id, 'e': e}, skip=p)
    elif t == 'gift':
        to = PLAYERS.get(m.get('to'))
        d = m.get('d')
        if to and isinstance(d, str) and re.fullmatch(r'[a-z]{2,12}', d):
            await send(to, {'t': 'gift', 'from': p.id, 'name': p.name, 'd': d})
            log(f'  «{p.name}» пригостив «{to.name}»: {d}')

async def ticker():
    while True:
        await asyncio.sleep(TICK)
        if len(PLAYERS) > 1:
            snap = {str(p.id): p.state for p in PLAYERS.values() if p.state}
            await broadcast({'t': 'states', 'p': snap})

# ===================== HTTP =====================
SAVES_DIR = os.path.join(ROOT, 'saves')
os.makedirs(SAVES_DIR, exist_ok=True)

def safe_filename(name):
    """Перетворює нік на безпечне ім'я файлу."""
    name = re.sub(r'[^\w\-]', '_', name.strip().lower(), flags=re.UNICODE)
    return name[:40] or '_anon'

def resolve_static(path):
    path = path.split('?', 1)[0].split('#', 1)[0]
    if path in ('', '/'):
        path = '/index.html'
    full = os.path.normpath(os.path.join(STATIC_DIR, path.lstrip('/')))
    if not full.startswith(os.path.normpath(STATIC_DIR) + os.sep) or not os.path.isfile(full):
        return None
    return full

async def read_body(reader, headers, max_size=512*1024):
    """Читає тіло HTTP запиту до max_size байт."""
    cl = int(headers.get('content-length', 0))
    if cl <= 0 or cl > max_size:
        return None
    return await asyncio.wait_for(reader.readexactly(cl), timeout=10)

async def handle_conn(reader, writer):
    ip = (writer.get_extra_info('peername') or ('?',))[0]
    try:
        raw = await asyncio.wait_for(reader.readuntil(b'\r\n\r\n'), timeout=15)
    except Exception:
        writer.close(); return
    try:
        lines = raw.decode('latin-1').split('\r\n')
        method, path, _ = lines[0].split(' ', 2)
        headers = {}
        for ln in lines[1:]:
            if ':' in ln:
                k, v = ln.split(':', 1)
                headers[k.strip().lower()] = v.strip()
        ip = headers.get('cf-connecting-ip') or headers.get('x-forwarded-for', ip).split(',')[0].strip()
        if path.startswith('/ws') and 'websocket' in headers.get('upgrade', '').lower():
            await ws_session(reader, writer, headers, ip)
            return
        STATS['http'] += 1

        # ---------- API: збереження прогресу ----------
        if path == '/api/save' and method == 'POST':
            body = await read_body(reader, headers)
            if not body:
                await respond(writer, 400, b'{"ok":false,"e":"bad request"}', 'application/json'); return
            try:
                req = json.loads(body.decode('utf-8'))
                name = clean_name(req.get('name'))
                data = req.get('data')
                if not name or len(name) < 2 or not isinstance(data, dict):
                    raise ValueError('invalid')
            except Exception:
                await respond(writer, 400, b'{"ok":false,"e":"bad payload"}', 'application/json'); return
            fpath = os.path.join(SAVES_DIR, safe_filename(name) + '.json')
            try:
                with open(fpath, 'w', encoding='utf-8') as f:
                    json.dump({'name': name, 'data': data, 'ts': time.time()}, f, ensure_ascii=False)
                log(f'  💾 save «{name}» → {os.path.basename(fpath)}')
            except Exception as e:
                log(f'  save error: {e}')
                await respond(writer, 500, b'{"ok":false,"e":"write error"}', 'application/json'); return
            await respond(writer, 200, b'{"ok":true}', 'application/json'); return

        if path == '/api/load' and method == 'POST':
            body = await read_body(reader, headers)
            if not body:
                await respond(writer, 400, b'{"ok":false}', 'application/json'); return
            try:
                req = json.loads(body.decode('utf-8'))
                name = clean_name(req.get('name'))
                if not name or len(name) < 2:
                    raise ValueError('invalid')
            except Exception:
                await respond(writer, 400, b'{"ok":false}', 'application/json'); return
            fpath = os.path.join(SAVES_DIR, safe_filename(name) + '.json')
            if not os.path.isfile(fpath):
                await respond(writer, 200, b'{"ok":false}', 'application/json'); return
            try:
                with open(fpath, 'r', encoding='utf-8') as f:
                    save = json.load(f)
                resp = json.dumps({'ok': True, 'data': save.get('data', {})}, ensure_ascii=False).encode()
                log(f'  📂 load «{name}» ← {os.path.basename(fpath)}')
                await respond(writer, 200, resp, 'application/json'); return
            except Exception as e:
                log(f'  load error: {e}')
                await respond(writer, 200, b'{"ok":false}', 'application/json'); return

        if method not in ('GET', 'HEAD'):
            await respond(writer, 405, b'Method Not Allowed', 'text/plain; charset=utf-8'); return
        if path.startswith('/status'):
            body = json.dumps({'players': len(PLAYERS), 'names': [p.name for p in PLAYERS.values()]}, ensure_ascii=False).encode()
            await respond(writer, 200, body, 'application/json; charset=utf-8'); return
        full = resolve_static(path)
        if not full:
            await respond(writer, 404, 'Не знайдено'.encode(), 'text/plain; charset=utf-8'); return
        with open(full, 'rb') as f:
            body = f.read()
        ctype = mimetypes.guess_type(full)[0] or 'application/octet-stream'
        if ctype.startswith('text/') or ctype in ('application/javascript', 'application/json'):
            ctype += '; charset=utf-8'
        await respond(writer, 200, body if method == 'GET' else b'', ctype, len(body))
    except Exception as e:
        log(f'HTTP помилка: {e}')
        try: writer.close()
        except Exception: pass

async def respond(writer, code, body, ctype, length=None):
    reason = {200: 'OK', 404: 'Not Found', 405: 'Method Not Allowed'}.get(code, 'OK')
    head = (f'HTTP/1.1 {code} {reason}\r\nContent-Type: {ctype}\r\nContent-Length: {length if length is not None else len(body)}\r\n'
            'Cache-Control: no-cache\r\nConnection: close\r\n\r\n')
    writer.write(head.encode() + body)
    try:
        await writer.drain()
    finally:
        writer.close()

# ===================== МОНІТОР У ТЕРМІНАЛІ =====================
class Monitor:
    def __init__(self, port, tunnel):
        self.port, self.tunnel = port, tunnel
        self.lines = 0
        self.started = time.time()
        self.proc = psutil.Process(os.getpid()) if psutil else None
        if self.proc: self.proc.cpu_percent(None)

    def draw(self):
        W = 90
        bar = lambda l, r, ch='─': f'{C.CYAN}{l}{ch * (W - 2)}{r}{C.RESET}'
        def row(text):
            pad = ' ' * max(1, W - 2 - vlen(text))
            return f'{C.CYAN}│{C.RESET}{text}{pad}{C.CYAN}│{C.RESET}'
        up = int(time.time() - self.started)
        out = [bar('┌', '┐'),
               row(f' {C.YELLOW}☕ Бариста Кінця Світу — сервер{C.RESET}   {C.DIM}працює {up // 3600:02d}:{up % 3600 // 60:02d}:{up % 60:02d}{C.RESET}'),
               row(f' Цей комп’ютер:    {C.GREEN}http://localhost:{self.port}{C.RESET}'),
               row(f' Локальна мережа:  {C.GREEN}http://{local_ip()}:{self.port}{C.RESET}')]
        t = self.tunnel
        tc = C.GREEN if t.status.startswith('ONLINE') else (C.YELLOW if 'ЗАПУСК' in t.status else C.RED)
        out.append(row(f' Тунель:           {tc}{t.status}{C.RESET}'))
        if t.url:
            out.append(row(f' Посилання друзям: {C.MAG}{t.url} {C.RESET}'))
        out.append(bar('├', '┤'))
        out.append(row(f' {C.YELLOW}Гравці онлайн: {len(PLAYERS)}/{MAX_PLAYERS}{C.RESET}'))
        shown = sorted(PLAYERS.values(), key=lambda p: p.id)[:10]
        if not shown:
            out.append(row(f' {C.DIM}Поки нікого. Надішли друзям посилання вище.{C.RESET}'))
        for p in shown:
            s = p.state
            zone = s.get('zn', '…')
            out.append(row(f'  #{p.id:<3} {p.name[:18]:<18} рівень {s.get("l", "?"):<3} {C.DIM}{zone:<10} {int(time.time() - p.joined) // 60} хв{C.RESET}'))
        if len(PLAYERS) > 10:
            out.append(row(f'  … і ще {len(PLAYERS) - 10}'))
        out.append(bar('├', '┤'))
        res = ''
        if self.proc:
            try:
                res = f'CPU {self.proc.cpu_percent(None):.0f}% · RAM {self.proc.memory_info().rss / 1048576:.0f} MB · '
            except Exception:
                res = ''
        out.append(row(f' {res}HTTP {STATS["http"]} · WS ↓{STATS["ws_in"]} ↑{STATS["ws_out"]} · чат {STATS["chat"]}'))
        out.append(row(f' {C.CYAN}[T]{C.RESET} тунель увімк/вимк   {C.CYAN}[Q]{C.RESET} вихід   {C.DIM}лог: logs/{os.path.basename(LOG_PATH)}{C.RESET}'))
        out.append(bar('└', '┘'))
        text = '\n'.join(out)
        if self.lines:
            sys.stdout.write(f'\033[{self.lines}A\033[J')
        sys.stdout.write(text + '\n')
        sys.stdout.flush()
        self.lines = len(out)

# ===================== КЛАВІАТУРА =====================
def key_reader(cb):
    """Читає окремі клавіші без Enter (Linux/macOS — termios, Windows — msvcrt)."""
    if os.name == 'nt':
        import msvcrt
        while True:
            if msvcrt.kbhit():
                cb(msvcrt.getwch())
            time.sleep(.05)
    if not sys.stdin.isatty():
        return
    import termios, tty, select
    fd = sys.stdin.fileno()
    old = termios.tcgetattr(fd)
    try:
        tty.setcbreak(fd)
        while True:
            if select.select([sys.stdin], [], [], .3)[0]:
                cb(sys.stdin.read(1))
    finally:
        termios.tcsetattr(fd, termios.TCSADRAIN, old)

# ===================== ГОЛОВНЕ =====================
async def main(args):
    if not os.path.isfile(os.path.join(STATIC_DIR, 'index.html')):
        print(f'{C.RED}[!] Не знайдено dist/index.html. Збери гру: bash build.sh (або npm run build){C.RESET}')
        sys.exit(1)
    try:
        server = await asyncio.start_server(handle_conn, host=args.host, port=args.port, reuse_address=True)
    except OSError as e:
        print(f'{C.RED}[!] Порт {args.port} зайнятий ({e}). Спробуй: python3 start.py --port {args.port + 1}{C.RESET}')
        sys.exit(1)
    log(f'Сервер слухає {args.host}:{args.port}')
    tunnel = Tunnel(args.port, args.tunnel)
    tunnel.start()
    loop = asyncio.get_running_loop()
    stop = asyncio.Event()

    def on_key(ch):
        ch = ch.lower()
        if ch in ('t', 'е'):
            tunnel.toggle()
        elif ch in ('q', 'й', '\x03'):
            loop.call_soon_threadsafe(stop.set)
    if not args.no_ui:
        threading.Thread(target=key_reader, args=(on_key,), daemon=True).start()

    asyncio.create_task(ticker())
    mon = Monitor(args.port, tunnel)

    async def ui():
        while True:
            if not args.no_ui:
                mon.draw()
            await asyncio.sleep(.5)
    ui_task = asyncio.create_task(ui())
    print(f'{C.CYAN}Сервер запущено. Відкрий гру: http://localhost:{args.port}{C.RESET}\n')
    try:
        async with server:
            await stop.wait()
    finally:
        ui_task.cancel()
        tunnel.stop()
        log('Сервер зупинено')
        print(f'\n{C.YELLOW}Сервер зупинено. До зустрічі в «Кавовій Гущі»!{C.RESET}')

if __name__ == '__main__':
    ap = argparse.ArgumentParser(description='Сервер «Бариста Кінця Світу»: гра + мультиплеєр + тунель')
    ap.add_argument('--port', type=int, default=int(os.environ.get('PORT', DEFAULT_PORT)), help=f'порт (за замовчуванням {DEFAULT_PORT})')
    ap.add_argument('--host', default='0.0.0.0', help='адреса прослуховування (0.0.0.0 — уся мережа)')
    ap.add_argument('--tunnel', default='auto', choices=['auto', 'cloudflared', 'ngrok', 'ssh', 'serveo', 'none'], help='який тунель піднімати')
    ap.add_argument('--no-ui', action='store_true', help='без живого монітора (для запуску у фоні)')
    args = ap.parse_args()
    if not args.no_ui:
        os.system('cls' if os.name == 'nt' else 'clear')
        print(fr"""{C.CYAN}
   ___           _    _          _  __
  | _ ) __ _ _ _(_)__| |_ __ _  | |/ /
  | _ \/ _` | '_| (_-<  _/ _` | | ' <   Кінця Світу
  |___/\__,_|_| |_/__/\__\__,_| |_|\_\  сервер для друзів
{C.RESET}""")
    try:
        asyncio.run(main(args))
    except KeyboardInterrupt:
        print(f'\n{C.YELLOW}Сервер зупинено.{C.RESET}')
