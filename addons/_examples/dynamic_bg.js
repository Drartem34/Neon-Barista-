/* Аддон «Живий фон меню»: фон головного меню плавно змінюється кожні кілька секунд
   (м'яке перетікання + легке наближення, як у трейлерах).
   Картинки: menu/main-bg.jpg, menu/main-bg-2.jpg … menu/main-bg-9.jpg — скільки є, стільки й крутиться.
   Якщо своїх фонів лише один, додаються картинки режимів (ONLINE, PVP, ІВЕНТ, СПЛАВ).
   Картку «СПЛАВ» додає аддон «Еспресо-Сплав» — тут її не дублюємо. */
const A = Addon.info({ name: 'Живий фон меню', version: '2.0', desc: 'Фон головного меню плавно змінюється між картинками.' });

const SLIDE_MS = 7000, FADE_MS = 1600;
const MAIN = ['menu/main-bg.jpg', ...Array.from({ length: 8 }, (_, i) => `menu/main-bg-${i + 2}.jpg`)];
const EXTRA = ['menu/online-bg.jpg', 'menu/rafting-bg.jpg', 'addons/rafting/rafting-bg.jpg', 'menu/pvp-bg.jpg', 'menu/event-bg.jpg'];

function setupBg() {
  const mm = document.getElementById('main-menu');
  if (!mm || mm.dataset.liveBg) return;
  mm.dataset.liveBg = '1';
  const css = document.createElement('style');
  css.textContent = `#main-menu .mm-bg{position:absolute;inset:-4%;z-index:-1;background:center/cover no-repeat;opacity:0;transition:opacity ${FADE_MS}ms ease;will-change:opacity,transform}
    #main-menu .mm-bg.on{opacity:1;animation:mmZoom ${SLIDE_MS + FADE_MS}ms linear forwards}
    @keyframes mmZoom{from{transform:scale(1)}to{transform:scale(1.07)}}
    @media (prefers-reduced-motion:reduce){#main-menu .mm-bg.on{animation:none}}`;
  document.head.appendChild(css);
  const layers = [0, 1].map(() => { const d = document.createElement('div'); d.className = 'mm-bg'; mm.insertBefore(d, mm.firstChild); return d; });
  const ok = [];
  let cur = 0, shown = -1, timer = null;
  const show = url => {
    cur ^= 1; const d = layers[cur];
    d.style.backgroundImage = `url('${url}')`;
    d.classList.remove('on'); void d.offsetWidth; d.classList.add('on');
    layers[cur ^ 1].classList.remove('on');
  };
  const next = () => {
    if (!document.body.contains(mm)) { clearInterval(timer); return; }   // меню закрили — зупиняємось
    const list = ok.filter(u => MAIN.includes(u)).length > 1 ? ok.filter(u => MAIN.includes(u)) : ok;
    if (list.length < 2) return;
    shown = (shown + 1) % list.length; show(list[shown]);
  };
  // перевіряємо, які картинки справді є, і починаємо крутити
  const tryLoad = url => new Promise(res => { const im = new Image(); im.onload = () => res(url); im.onerror = () => res(null); im.src = url; });
  Promise.all([...MAIN, ...EXTRA].map(tryLoad)).then(r => {
    for (const u of r) if (u && !ok.includes(u)) ok.push(u);
    if (!ok.length) return;
    shown = 0; show(ok.find(u => MAIN.includes(u)) || ok[0]);
    timer = setInterval(next, SLIDE_MS);
  });
}
if (!window.__SIM && typeof document !== 'undefined') setupBg();
