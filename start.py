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
  python3 start.py --admin Логін   # зробити акаунт адміном (перший зареєстрований — адмін і так)
  python3 start.py --unban Логін   # розбанити акаунт з консолі

Акаунти й сейви лежать у saves/ (accounts.json + acc_<логін>.json) — прогрес
не губиться, коли тунель дає нове посилання.

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
import secrets
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
    __slots__ = ('id', 'name', 'writer', 'state', 'joined', 'msgs', 'last', 'ip', 'login')

    def __init__(self, pid, writer, ip):
        self.id, self.writer, self.ip = pid, writer, ip
        self.login = None
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
    if t != 'join' and not p.login:
        return
    if t == 'join':
        u = user_by_token(m.get('token'))
        if not u or u.get('banned'):
            await send(p, {'t': 'banned' if u else 'auth', 'm': ('Акаунт заблоковано' + (f': {u["reason"]}' if u.get('reason') else '')) if u else 'Увійди в акаунт, щоб грати онлайн'})
            p.writer.close(); return
        old = player_of(u['login'])
        if old and old is not p:
            await send(old, {'t': 'kicked', 'm': 'Твій акаунт зайшов з іншого вікна'})
            try: old.writer.close()
            except Exception: pass
        p.login = u['login']
        p.name = u['login']
        u['seen'], u['ip'] = time.time(), p.ip
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
        for k in ('a', 'i', 'zn', 'act', 'tg'):
            v = m.get(k)
            if isinstance(v, str) and len(v) < 24: s[k] = v
        if isinstance(m.get('hp'), (int, float)): s['hp'] = max(0, min(100, int(m['hp'])))
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

# ===================== АКАУНТИ =====================
# Прогрес живе на сервері під логіном і паролем — тому він не губиться,
# коли тунель видає нове посилання (у браузера інший домен → порожній localStorage).
SAVES_DIR = os.path.join(ROOT, 'saves')
os.makedirs(SAVES_DIR, exist_ok=True)
ACC_PATH = os.path.join(SAVES_DIR, 'accounts.json')
LOGIN_RE = re.compile(r'^[\w\-]{3,20}$', re.UNICODE)
PBKDF_ROUNDS = 120_000
MAX_TOKENS = 8
FAILS = {}                      # ip → [час невдалих входів]

def _load_accounts():
    try:
        with open(ACC_PATH, 'r', encoding='utf-8') as f:
            d = json.load(f)
        if isinstance(d, dict) and isinstance(d.get('users'), dict):
            return d
    except FileNotFoundError:
        pass
    except Exception as e:
        log(f'accounts.json пошкоджено: {e}')
    return {'users': {}}

ACC = _load_accounts()

def save_accounts():
    tmp = ACC_PATH + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(ACC, f, ensure_ascii=False, indent=1)
    os.replace(tmp, ACC_PATH)

def safe_filename(name):
    """Перетворює нік на безпечне ім'я файлу."""
    name = re.sub(r'[^\w\-]', '_', name.strip().lower(), flags=re.UNICODE)
    return name[:40] or '_anon'

def save_path(login):
    return os.path.join(SAVES_DIR, 'acc_' + safe_filename(login) + '.json')

def hash_pw(pw, salt):
    return hashlib.pbkdf2_hmac('sha256', pw.encode('utf-8'), bytes.fromhex(salt), PBKDF_ROUNDS).hex()

def user_of(login):
    return ACC['users'].get(str(login or '').lower())

def user_by_token(token):
    if not isinstance(token, str) or len(token) < 20:
        return None
    for u in ACC['users'].values():
        if token in u.get('tokens', []):
            return u
    return None

def new_token(u):
    t = secrets.token_urlsafe(24)
    u['tokens'] = (u.get('tokens', []) + [t])[-MAX_TOKENS:]
    return t

def too_many_fails(ip):
    now = time.time()
    FAILS[ip] = [t for t in FAILS.get(ip, []) if now - t < 300]
    return len(FAILS[ip]) >= 10

def pub_user(u, token=None):
    d = {'ok': True, 'login': u['login'], 'admin': bool(u.get('admin'))}
    if token: d['token'] = token
    return d

def player_of(login):
    for p in PLAYERS.values():
        if p.login and p.login.lower() == login.lower():
            return p
    return None

async def kick(login, msg, kind='kicked'):
    p = player_of(login)
    if p:
        await send(p, {'t': kind, 'm': msg})
        try: p.writer.close()
        except Exception: pass

def api_register(req, ip):
    login = str(req.get('login') or '').strip()
    pw = str(req.get('pass') or '')
    if not LOGIN_RE.match(login):
        return {'ok': False, 'e': 'Логін: 3–20 символів — літери, цифри, _ або -'}
    if not (4 <= len(pw) <= 64):
        return {'ok': False, 'e': 'Пароль: від 4 до 64 символів'}
    if user_of(login):
        return {'ok': False, 'e': 'Такий логін уже зайнятий'}
    salt = secrets.token_hex(16)
    u = {'login': login, 'salt': salt, 'hash': hash_pw(pw, salt), 'created': time.time(),
         'admin': not ACC['users'], 'banned': False, 'reason': '', 'ip': ip, 'seen': time.time(), 'lvl': 1}
    ACC['users'][login.lower()] = u
    # Старий сейв за ніком (до акаунтів) переходить до акаунта з таким самим ім'ям
    legacy = os.path.join(SAVES_DIR, safe_filename(login) + '.json')
    if os.path.isfile(legacy) and not os.path.isfile(save_path(login)):
        try:
            os.replace(legacy, save_path(login))
            log(f'  ↪ старий сейв «{login}» прив’язано до акаунта')
        except Exception as e:
            log(f'  міграція сейву: {e}')
    tok = new_token(u)
    save_accounts()
    log(f'  🆕 акаунт «{login}» з {ip}{" (адмін)" if u["admin"] else ""}')
    return pub_user(u, tok)

def api_login(req, ip):
    if too_many_fails(ip):
        return {'ok': False, 'e': 'Забагато спроб. Зачекай 5 хвилин.'}
    u = user_of(req.get('login'))
    pw = str(req.get('pass') or '')
    if not u or not secrets.compare_digest(hash_pw(pw, u['salt']), u['hash']):
        FAILS.setdefault(ip, []).append(time.time())
        return {'ok': False, 'e': 'Невірний логін або пароль'}
    if u.get('banned'):
        return {'ok': False, 'e': 'Акаунт заблоковано' + (f': {u["reason"]}' if u.get('reason') else ''), 'banned': True}
    u['ip'], u['seen'] = ip, time.time()
    tok = new_token(u)
    save_accounts()
    log(f'  🔑 вхід «{u["login"]}» з {ip}')
    return pub_user(u, tok)

def auth(req):
    u = user_by_token(req.get('token'))
    if not u:
        return None, {'ok': False, 'e': 'Сесія застаріла — увійди ще раз', 'auth': True}
    if u.get('banned'):
        return None, {'ok': False, 'e': 'Акаунт заблоковано' + (f': {u["reason"]}' if u.get('reason') else ''), 'banned': True, 'auth': True}
    return u, None

def delete_account(u):
    ACC['users'].pop(u['login'].lower(), None)
    try: os.remove(save_path(u['login']))
    except FileNotFoundError: pass
    save_accounts()

async def api_admin(req, me):
    act = req.get('act')
    if act == 'list':
        users = []
        for u in sorted(ACC['users'].values(), key=lambda u: -u.get('seen', 0)):
            p = player_of(u['login'])
            users.append({'login': u['login'], 'admin': bool(u.get('admin')), 'banned': bool(u.get('banned')),
                          'reason': u.get('reason', ''), 'lvl': u.get('lvl', 1), 'seen': u.get('seen', 0),
                          'created': u.get('created', 0), 'ip': u.get('ip', ''), 'online': bool(p),
                          'act': (p.state.get('act') if p else '') or '', 'zone': (p.state.get('zn') if p else '') or ''})
        return {'ok': True, 'users': users, 'online': len(PLAYERS)}
    if act == 'announce':
        text = clean_text(req.get('m'))
        if text:
            await broadcast({'t': 'sys', 'm': f'📢 {text}'})
            log(f'  📢 «{me["login"]}»: {text}')
        return {'ok': True}
    u = user_of(req.get('login'))
    if not u:
        return {'ok': False, 'e': 'Немає такого акаунта'}
    if u is me and act in ('ban', 'delete', 'unadmin'):
        return {'ok': False, 'e': 'Із собою так не можна'}
    reason = clean_text(req.get('reason'), 120)
    if act == 'ban':
        u['banned'], u['reason'], u['tokens'] = True, reason, []
        await kick(u['login'], 'Тебе заблоковано' + (f': {reason}' if reason else ''), 'banned')
    elif act == 'unban':
        u['banned'], u['reason'] = False, ''
    elif act == 'kick':
        await kick(u['login'], 'Адмін вигнав тебе з сервера' + (f': {reason}' if reason else ''))
    elif act == 'admin':
        u['admin'] = True
    elif act == 'unadmin':
        u['admin'] = False
    elif act == 'delete':
        await kick(u['login'], 'Акаунт видалено адміністратором', 'banned')
        delete_account(u)
    else:
        return {'ok': False, 'e': 'Невідома дія'}
    save_accounts()
    log(f'  🛡️ «{me["login"]}» → {act} «{u["login"]}» {reason}')
    return {'ok': True}

async def api(path, req, ip):
    """Усі /api/* — POST JSON → JSON."""
    if path == '/api/register':
        return api_register(req, ip)
    if path == '/api/login':
        return api_login(req, ip)
    u, err = auth(req)
    if err:
        return err
    if path == '/api/me':
        return pub_user(u)
    if path == '/api/logout':
        u['tokens'] = [t for t in u.get('tokens', []) if t != req.get('token')]
        save_accounts()
        return {'ok': True}
    if path == '/api/save':
        data = req.get('data')
        if not isinstance(data, dict) or not isinstance(data.get('P'), dict):
            return {'ok': False, 'e': 'bad payload'}
        with open(save_path(u['login']) + '.tmp', 'w', encoding='utf-8') as f:
            json.dump({'name': u['login'], 'data': data, 'ts': time.time()}, f, ensure_ascii=False)
        os.replace(save_path(u['login']) + '.tmp', save_path(u['login']))
        lvl = data['P'].get('lvl')
        if isinstance(lvl, int) and lvl != u.get('lvl'):
            u['lvl'] = lvl
            save_accounts()
        u['seen'] = time.time()
        return {'ok': True}
    if path == '/api/load':
        try:
            with open(save_path(u['login']), 'r', encoding='utf-8') as f:
                return {'ok': True, 'data': json.load(f).get('data')}
        except FileNotFoundError:
            return {'ok': True, 'data': None}
    if path == '/api/wipe':
        try: os.remove(save_path(u['login']))
        except FileNotFoundError: pass
        log(f'  🧹 «{u["login"]}» почав нову гру')
        return {'ok': True}
    if path == '/api/delete':
        if not secrets.compare_digest(hash_pw(str(req.get('pass') or ''), u['salt']), u['hash']):
            return {'ok': False, 'e': 'Невірний пароль'}
        await kick(u['login'], 'Акаунт видалено', 'banned')
        delete_account(u)
        log(f'  🗑️ «{u["login"]}» видалив свій акаунт')
        return {'ok': True}
    if path == '/api/admin':
        if not u.get('admin'):
            return {'ok': False, 'e': 'Тільки для адміністраторів'}
        return await api_admin(req, u)
    return {'ok': False, 'e': 'not found'}

# ===================== HTTP =====================
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

        # ---------- API: акаунти, збереження, адмінка ----------
        if path.startswith('/api/'):
            if method != 'POST':
                await respond(writer, 405, b'{"ok":false}', 'application/json'); return
            body = await read_body(reader, headers, 2 * 1024 * 1024)
            try:
                req = json.loads(body.decode('utf-8')) if body else None
                if not isinstance(req, dict): raise ValueError
            except Exception:
                await respond(writer, 400, b'{"ok":false,"e":"bad request"}', 'application/json'); return
            try:
                res = await api(path.split('?', 1)[0], req, ip)
            except Exception as e:
                log(f'API {path} помилка: {e}')
                res = {'ok': False, 'e': 'server error'}
            await respond(writer, 200, json.dumps(res, ensure_ascii=False).encode(), 'application/json; charset=utf-8'); return

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
ACT_NAMES = {'atk': 'атакує', 'brew': 'варить каву', 'fish': 'рибалить', 'dig': 'копає', 'swim': 'пливе', 'glide': 'планує',
             'boss': 'б’ється з босом', 'menu': 'у меню', 'sit': 'відпочиває', 'dead': 'вигорів', 'drink': 'частує кавою', 'chair': 'катається'}

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
            act = ACT_NAMES.get(s.get('act', ''), '')
            out.append(row(f'  #{p.id:<3} {p.name[:18]:<18} рівень {s.get("l", "?"):<3} {C.DIM}{zone:<10} {act:<14} {int(time.time() - p.joined) // 60} хв{C.RESET}'))
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
    ap.add_argument('--admin', metavar='ЛОГІН', help='видати права адміністратора акаунту й вийти')
    ap.add_argument('--unban', metavar='ЛОГІН', help='розблокувати акаунт і вийти')
    args = ap.parse_args()
    if args.admin or args.unban:
        u = user_of(args.admin or args.unban)
        if not u:
            print(f'{C.RED}Немає акаунта «{args.admin or args.unban}»{C.RESET}'); sys.exit(1)
        if args.admin: u['admin'] = True
        else: u['banned'], u['reason'] = False, ''
        save_accounts()
        print(f'{C.GREEN}Готово: «{u["login"]}» — {"адмін" if args.admin else "розблоковано"}{C.RESET}'); sys.exit(0)
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
