/* ---------- Старт ---------- */
function startGame(fresh) {
  initAudio(); if (AC && AC.state === 'suspended') AC.resume();
  const sv = fresh ? null : loadSave();
  if (sv && sv.P) {
    const def = newPlayer();
    P = Object.assign(def, sv.P);
    P.eq = Object.assign({ hand1: null, hand2: null, head: null, apron: null, shoes: null, acc: null, gear: null }, sv.P.eq);
    P.cases = Object.assign({}, sv.P.cases);
    if (sv.P.tut === undefined) { P.tut = -1; P.tutCaseGiven = true; }
    for (const k of ['disc', 'wp', 'notes', 'fish', 'fishSeen', 'pets']) P[k] = Object.assign({}, def[k], sv.P[k]);
    P.disc.hub = 1; P.wp.hub = 1; P.disc.home = 1;
    for (const k of ['heal', 'mb', 'decor', 'art']) P[k] = Object.assign({}, def[k], sv.P[k]);
    P.home = Object.assign({ color: 'mint', slots: Array(10).fill(null) }, sv.P.home); if (!Array.isArray(P.stash)) P.stash = [];
    BOSS.lvl = sv.boss || 1;
  } else { newPlayer(); try { localStorage.removeItem(SAVE_KEY); } catch (e) { } }
  syncQuest(true);   // старі збереження: квест міг «застрягнути», бо острови відкрили раніше
  calcStats(); pl.hp = S.maxHP; pl.st = S.maxSt; pl.charges = S.charges;
  hero = buildPlayer(); refreshLook();
  buildGiver(); bossInit();
  for (const s of ISL) if (s.spawn) for (const [type, cnt] of s.spawn) for (let i = 0; i < cnt; i++) spawnMonster(type, s);
  for (let i = 0; i < Math.min(P.hubCrowd || 0, HUB_SPOTS.length); i++) addHubCrowd(true);
  $('#title').hidden = true; $('#hud').hidden = false;
  running = true; setupTouch();
  refreshHUD(); refreshQuest(); cv.focus();
  spawnMonster('dummy', ISLMAP.hub, DUMMY_POS.x, DUMMY_POS.z);
  initDig(); initPets(); refreshWaypoints(); initMinibosses(); renderHome();
  HEAL_REGIONS.forEach(id => applyHealVisual(id, true)); refreshHubHealth();
  $('#artgo').addEventListener('click', () => artTap()); $('#artskip').addEventListener('click', () => skipArt());
  $('#freel').addEventListener('click', () => reelFish());
  if (tutActive()) { renderTut(); if (P.tut === 2) tutSpawnBeans(); }
  else toast(P.quest === 0 && P.qstate === 'offer' ? 'Підійди до Маріанни біля бару — стрілка під ногами покаже шлях.' : 'З поверненням на зміну.');
  netConnect();
  setInterval(save, 15000);
  addEventListener('beforeunload', save);
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
}
buildWorld();
buildSky(); buildHomeBase();
mergeStatics();
applyGfx(false);
requestAnimationFrame(frame);

/* ---------- Завантаження серверного save → localStorage ---------- */
function refreshTitleButtons() {
  if (loadSave()) { $('#b-continue').hidden = false; $('#b-new').classList.add('alt'); }
  else { $('#b-continue').hidden = true; $('#b-new').classList.remove('alt'); }
}

(function tryLoadServerSave() {
  const name = myName();
  if (!name || name.length < 2) { refreshTitleButtons(); return; }
  fetch('/api/load', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  }).then(r => r.json()).then(res => {
    if (res.ok && res.data) {
      const local = loadSave();
      const serverLvl = (res.data.P && res.data.P.lvl) || 0;
      const localLvl = (local && local.P && local.P.lvl) || 0;
      // Серверний save має пріоритет (свіжіший при зміні тунелю/домену)
      if (serverLvl >= localLvl) {
        try { localStorage.setItem(SAVE_KEY, JSON.stringify(res.data)); } catch (e) { }
      }
    }
    refreshTitleButtons();
  }).catch(() => { refreshTitleButtons(); });
})();

$('#b-continue').addEventListener('click', () => startGame(false));
$('#b-new').addEventListener('click', () => {
  if (loadSave() && !newConfirm) { newConfirm = true; $('#b-new').textContent = 'Точно? Збереження зітреться'; return; }
  startGame(true);
});
$('#b-respawn').addEventListener('click', respawn);
setupNetTitle();
if (IS_TOUCH) $('#keys-desk').hidden = true;

/* ---------- Головне меню → Екран заголовку ---------- */
$('#mm-online').addEventListener('click', () => {
  const mm = $('#main-menu');
  mm.classList.add('mm-hide');
  mm.addEventListener('transitionend', () => mm.remove(), { once: true });
});

