/* =====================================================================
   ЗВУК: адаптивна lo-fi музика + просторові ефекти (WebAudio, без файлів)
   Шари музики: keys (електропіано), bass, drums, tension (бій), lead (бос), crackle (вініл).
   Режими: title · hub · explore · combat · boss. Меню й смерть «притоплюють» музику фільтром.
   ===================================================================== */
const AUDIO_KEY = 'barista-audio';
const AUD = { music: .7, sfx: .85, muted: false };
try { Object.assign(AUD, JSON.parse(localStorage.getItem(AUDIO_KEY) || '{}')); } catch (e) { }
function saveAudio() { try { localStorage.setItem(AUDIO_KEY, JSON.stringify(AUD)); } catch (e) { } }

let AC = null, master = null, musicBus = null, musicFilter = null, sfxBus = null, reverb = null, noiseBuf = null;
const LAYER = {};
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

function initAudio() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    const comp = AC.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 3; comp.attack.value = .01; comp.release.value = .2;
    master = AC.createGain(); master.gain.value = AUD.muted ? 0 : 1;
    master.connect(comp); comp.connect(AC.destination);
    // реверб із згенерованого імпульсу
    reverb = AC.createConvolver(); reverb.buffer = makeIR(2.4);
    const revOut = AC.createGain(); revOut.gain.value = .32; reverb.connect(revOut); revOut.connect(master);
    // музика
    musicBus = AC.createGain(); musicBus.gain.value = AUD.music * .75;
    musicFilter = AC.createBiquadFilter(); musicFilter.type = 'lowpass'; musicFilter.frequency.value = 3400; musicFilter.Q.value = .6;
    musicBus.connect(musicFilter); musicFilter.connect(master);
    const mSend = AC.createGain(); mSend.gain.value = .28; musicFilter.connect(mSend); mSend.connect(reverb);
    for (const k of ['keys', 'bass', 'drums', 'tension', 'lead', 'crackle']) { LAYER[k] = AC.createGain(); LAYER[k].gain.value = 0; LAYER[k].connect(musicBus); }
    // ефекти
    sfxBus = AC.createGain(); sfxBus.gain.value = AUD.sfx;
    sfxBus.connect(master);
    const sSend = AC.createGain(); sSend.gain.value = .16; sfxBus.connect(sSend); sSend.connect(reverb);
    // шум
    noiseBuf = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    startCrackle();
  } catch (e) { AC = null; }
}
function makeIR(sec) {
  const len = Math.floor(AC.sampleRate * sec), b = AC.createBuffer(2, len, AC.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
  return b;
}
function startCrackle() {
  const len = AC.sampleRate * 4, b = AC.createBuffer(1, len, AC.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < len; i++) {
    d[i] = (Math.random() * 2 - 1) * .012;
    if (Math.random() < .0004) { const amp = .25 + Math.random() * .5; for (let k = 0; k < 60 && i + k < len; k++) d[i + k] += (Math.random() * 2 - 1) * amp * Math.exp(-k / 8); }
  }
  const src = AC.createBufferSource(); src.buffer = b; src.loop = true;
  const hp = AC.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900;
  const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 6000;
  src.connect(hp); hp.connect(lp); lp.connect(LAYER.crackle); src.start();
}

/* ---------- Інструменти ---------- */
function env(g, t, peak, a, dur, sustainAt) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + a);
  if (sustainAt) g.gain.exponentialRampToValueAtTime(Math.max(.0002, peak * sustainAt[0]), t + sustainAt[1]);
  g.gain.exponentialRampToValueAtTime(.0001, t + dur);
}
function epiano(t, midi, dur, vel, dest) {
  const f = mtof(midi);
  const o1 = AC.createOscillator(), o2 = AC.createOscillator(), g1 = AC.createGain(), g2 = AC.createGain();
  o1.type = 'sine'; o1.frequency.value = f; o1.detune.value = (Math.random() - .5) * 14 + Math.sin(t * .7) * 8;
  o2.type = 'sine'; o2.frequency.value = f * 3.002;
  env(g1, t, vel, .006, dur, [.4, .35]);
  env(g2, t, vel * .35, .003, .28);
  o1.connect(g1); o2.connect(g2); g1.connect(dest); g2.connect(dest);
  o1.start(t); o2.start(t); o1.stop(t + dur + .05); o2.stop(t + .32);
}
function pluck(t, midi, vel, dest) {
  const o = AC.createOscillator(), g = AC.createGain(), f = AC.createBiquadFilter();
  o.type = 'triangle'; o.frequency.value = mtof(midi);
  f.type = 'lowpass'; f.frequency.setValueAtTime(3000, t); f.frequency.exponentialRampToValueAtTime(500, t + .4);
  env(g, t, vel, .004, .7);
  o.connect(f); f.connect(g); g.connect(dest); o.start(t); o.stop(t + .75);
}
function bassNote(t, midi, dur, vel) {
  const o = AC.createOscillator(), o2 = AC.createOscillator(), g = AC.createGain(), f = AC.createBiquadFilter();
  o.type = 'triangle'; o.frequency.value = mtof(midi);
  o2.type = 'sine'; o2.frequency.value = mtof(midi - 12);
  f.type = 'lowpass'; f.frequency.value = 520;
  env(g, t, vel, .012, dur, [.6, dur * .5]);
  o.connect(f); o2.connect(f); f.connect(g); g.connect(LAYER.bass);
  o.start(t); o2.start(t); o.stop(t + dur + .05); o2.stop(t + dur + .05);
}
function kick(t, vel) {
  const o = AC.createOscillator(), g = AC.createGain();
  o.frequency.setValueAtTime(125, t); o.frequency.exponentialRampToValueAtTime(42, t + .14);
  env(g, t, vel, .002, .38);
  o.connect(g); g.connect(LAYER.drums); o.start(t); o.stop(t + .4);
}
function noiseHit(t, type, freq, q, vel, dur, dest, f2) {
  const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
  s.buffer = noiseBuf; f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
  if (f2) f.frequency.exponentialRampToValueAtTime(f2, t + dur);
  env(g, t, vel, .002, dur);
  s.connect(f); f.connect(g); g.connect(dest);
  s.start(t, Math.random() * 1.5); s.stop(t + dur + .02);
}
function snare(t, vel) {
  noiseHit(t, 'bandpass', 1900, .7, vel, .2, LAYER.drums);
  const o = AC.createOscillator(), g = AC.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(210, t); o.frequency.exponentialRampToValueAtTime(150, t + .08);
  env(g, t, vel * .5, .002, .1); o.connect(g); g.connect(LAYER.drums); o.start(t); o.stop(t + .12);
}
function hat(t, vel, open) { noiseHit(t, 'highpass', 7500, .5, vel, open ? .14 : .035, LAYER.drums); }
function pulse(t, midi, dur, vel) {
  const o = AC.createOscillator(), g = AC.createGain(), f = AC.createBiquadFilter();
  o.type = 'sawtooth'; o.frequency.value = mtof(midi);
  f.type = 'lowpass'; f.frequency.setValueAtTime(1400, t); f.frequency.exponentialRampToValueAtTime(260, t + dur); f.Q.value = 4;
  env(g, t, vel, .004, dur);
  o.connect(f); f.connect(g); g.connect(LAYER.tension); o.start(t); o.stop(t + dur + .02);
}
function leadNote(t, midi, dur, vel) {
  const o = AC.createOscillator(), o2 = AC.createOscillator(), g = AC.createGain(), f = AC.createBiquadFilter();
  o.type = 'square'; o.frequency.value = mtof(midi); o2.type = 'square'; o2.frequency.value = mtof(midi) * 1.006;
  f.type = 'lowpass'; f.frequency.value = 2200;
  env(g, t, vel, .01, dur, [.7, dur * .6]);
  o.connect(f); o2.connect(f); f.connect(g); g.connect(LAYER.lead);
  o.start(t); o2.start(t); o.stop(t + dur + .05); o2.stop(t + dur + .05);
}

/* ---------- Композиція та планувальник ---------- */
const BPM = 82, STEP = 60 / BPM / 4;
const PROG = {
  calm: [[41, [57, 60, 64, 67]], [40, [55, 59, 62, 66]], [38, [57, 60, 62, 65]], [36, [55, 59, 62, 64]]],   // Fmaj9 · Em7 · Dm9 · Cmaj9
  tense: [[38, [57, 60, 62, 65]], [34, [58, 62, 65, 69]], [36, [55, 60, 64, 67]], [33, [57, 61, 64, 67]]], // Dm9 · Bbmaj7 · C · A7
  boss: [[38, [50, 53, 57, 62]], [34, [50, 53, 58, 62]], [31, [50, 55, 58, 62]], [33, [49, 52, 57, 61]]],  // Dm · Bb · Gm · A
};
const PENTA = [69, 72, 74, 76, 79, 81, 84];
const MIX = {
  title:   { keys: .9, bass: .55, drums: .25, tension: 0, lead: 0, crackle: .55 },
  hub:     { keys: .9, bass: .8, drums: .6, tension: 0, lead: 0, crackle: .5 },
  explore: { keys: .75, bass: .6, drums: .32, tension: 0, lead: 0, crackle: .35 },
  combat:  { keys: .55, bass: .95, drums: .95, tension: .65, lead: 0, crackle: .15 },
  boss:    { keys: .45, bass: 1, drums: 1, tension: .8, lead: .55, crackle: .05 },
};
let musicMode = 'title', barMode = 'title', nextT = 0, stepI = 0;
function wantMode() {
  if (!running) return 'title';
  if (BOSS.active && !BOSS.asleep) return 'boss';
  if (MON.some(m => !m.calm && !m.T.dummy && (m.state === 'chase' || m.state === 'windup' || m.state === 'lunge') && dist2(m.x, m.z, pl.x, pl.z) < 15)) return 'combat';
  if (curZone && curZone.safe) return 'hub';
  return 'explore';
}
function applyMix(mode, t) {
  const m = MIX[mode];
  for (const k in m) LAYER[k].gain.setTargetAtTime(m[k], t, mode === 'combat' || mode === 'boss' ? .4 : 1.2);
}
function scheduleStep(i, t) {
  const s = i % 16, bar = Math.floor(i / 16);
  if (s === 0) {
    const w = wantMode();
    if (w !== barMode) { barMode = w; applyMix(w, t); }
  }
  const prog = barMode === 'boss' ? PROG.boss : barMode === 'combat' ? PROG.tense : PROG.calm;
  const [root, ch] = prog[bar % 4];
  const busy = barMode === 'combat' || barMode === 'boss';
  // клавіші: акорд на «раз», синкопа на «і-два», легкий відгук
  if (s === 0) ch.forEach((n, k) => epiano(t + k * .012, n, 2.2, .055, LAYER.keys));
  if (s === 6) ch.slice(1).forEach((n, k) => epiano(t + k * .01, n, .9, .04, LAYER.keys));
  if (s === 11 && bar % 2 === 1) epiano(t, ch[3] + 12, .8, .03, LAYER.keys);
  // мелодія: інструмент і лад залежать від біому
  const biome = running && curZone ? (curZone.biome || 'base') : 'base';
  const ML = MELO[biome] || MELO.base;
  const melOn = barMode === 'hub' || barMode === 'title' || (barMode === 'explore' && biome !== 'base');
  if (melOn && (bar % 2 === 0 || biome !== 'base') && [2, 5, 9, 13].includes(s) && Math.random() < .55) ML.inst(t, pick(ML.scale) - (bar % 4 === 2 ? 2 : 0), .05);
  // атмосфера
  if (running && AC && !pl.dead) ambience(t, s, bar, biome);
  // бас
  if (s === 0) bassNote(t, root, STEP * 7, .5);
  if (s === 8) bassNote(t, root + (bar % 2 ? 7 : 0), STEP * 5, .42);
  if (s === 14 && Math.random() < .5) bassNote(t, root + 12, STEP * 1.5, .3);
  // ударні: бум-бэп
  if (s === 0 || s === 10 || (busy && s === 8)) kick(t, s === 0 ? .9 : .7);
  if (s === 4 || s === 12) snare(t, .32);
  if (s % 2 === 0) hat(t, s % 4 === 0 ? .07 : .045, s === 14 && bar % 2 === 1);
  else if (busy) hat(t, .03);
  // напруга в бою
  if (busy && s % 2 === 0) pulse(t, root + 12 + (s % 8 === 6 ? 7 : 0), STEP * 1.6, .07);
  // тема боса
  if (barMode === 'boss' && s % 2 === 0) { const arp = [ch[0], ch[1], ch[2], ch[3], ch[2], ch[1], ch[0] + 12, ch[3]]; leadNote(t, arp[(s / 2) % 8] + 12, STEP * 1.4, .05); }
}
const MELO = {
  base: { scale: PENTA, inst: (t, n, v) => pluck(t, n, v, LAYER.keys) },
  sea: { scale: [67, 69, 71, 74, 76, 79, 81], inst: (t, n, v) => steel(t, n, v) },
  snow: { scale: [76, 79, 81, 83, 86, 88, 91], inst: (t, n, v) => bell(t, n, v * .8) },
  jungle: { scale: [67, 70, 72, 74, 77, 79, 82], inst: (t, n, v) => marimba(t, n, v) },
  desert: { scale: [64, 65, 68, 69, 71, 72, 76], inst: (t, n, v) => pluck(t, n, v * 1.1, LAYER.keys) },
};
function steel(t, midi, vel) { const o = AC.createOscillator(), g = AC.createGain(), f = mtof(midi); o.type = 'triangle'; o.frequency.setValueAtTime(f * 1.03, t); o.frequency.exponentialRampToValueAtTime(f, t + .05); env(g, t, vel, .004, .7); o.connect(g); g.connect(LAYER.keys); o.start(t); o.stop(t + .75); tone(t, LAYER.keys, 'sine', f * 2.01, f * 2.01, .25, vel * .3); }
function bell(t, midi, vel) { const f = mtof(midi); tone(t, LAYER.keys, 'sine', f, f, 1.6, vel); tone(t, LAYER.keys, 'sine', f * 2.76, f * 2.76, .5, vel * .25); }
function marimba(t, midi, vel) { const f = mtof(midi); tone(t, LAYER.keys, 'sine', f, f, .35, vel * 1.2); tone(t, LAYER.keys, 'sine', f * 4, f * 4, .06, vel * .4); }
function ambience(t, s, bar, biome) {
  const night = typeof nightK !== 'undefined' && nightK > .55;
  if (biome === 'sea' && s === 0 && bar % 2 === 0) { const g = AC.createGain(); g.gain.value = .9; g.connect(sfxBus); const n = AC.createBufferSource(), f = AC.createBiquadFilter(), e = AC.createGain(); n.buffer = noiseBuf; n.loop = true; f.type = 'lowpass'; f.frequency.setValueAtTime(300, t); f.frequency.linearRampToValueAtTime(1000, t + 1.6); f.frequency.linearRampToValueAtTime(280, t + 3.6); e.gain.setValueAtTime(.0001, t); e.gain.linearRampToValueAtTime(.12, t + 1.5); e.gain.linearRampToValueAtTime(.0001, t + 3.8); n.connect(f); f.connect(e); e.connect(g); n.start(t); n.stop(t + 3.9); }
  if ((biome === 'snow' || biome === 'desert') && s === 0) { const storm = biome === 'desert' && stormT > 0; noiz(t, sfxBus, 'bandpass', 500 + Math.random() * 300, 1100, 2.6, storm ? .16 : .045, 2); }
  if (biome === 'jungle' && !night && Math.random() < .12) { const f = 2400 + Math.random() * 1400; tone(t, sfxBus, 'sine', f, f * 1.3, .07, .025); tone(t + .1, sfxBus, 'sine', f * 1.1, f * 1.4, .07, .02); }
  if (night && biome !== 'snow' && s % 4 === 0 && Math.random() < .5) { tone(t, sfxBus, 'square', 4300, 4300, .02, .008); tone(t + .05, sfxBus, 'square', 4300, 4300, .02, .008); }
}
function musicTick() {
  if (!AC || AC.state !== 'running') return;
  const now = AC.currentTime;
  if (nextT < now) nextT = now + .06;
  while (nextT < now + .3) {
    const swing = stepI % 2 === 1 ? STEP * .22 : 0;
    scheduleStep(stepI, nextT + swing);
    nextT += STEP; stepI++;
  }
  // меню та смерть «топлять» музику
  const cut = pl.dead ? 380 : (panel || caseOpen) ? 750 : 3400;
  musicFilter.frequency.setTargetAtTime(cut, now, .25);
}

/* ---------- Звукові ефекти ---------- */
function tone(t, dest, type, f1, f2, dur, vol, a = .004) {
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f1, t);
  if (f2 && f2 !== f1) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  env(g, t, vol, a, dur);
  o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + .02);
}
function noiz(t, dest, type, f1, f2, dur, vol, q = 1) {
  const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
  s.buffer = noiseBuf; f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(f1, t); if (f2 && f2 !== f1) f.frequency.exponentialRampToValueAtTime(f2, t + dur);
  env(g, t, vol, .003, dur);
  s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random() * 1.5); s.stop(t + dur + .02);
}
function arp(t, dest, notes, gap, dur, vol, type = 'sine') { notes.forEach((n, i) => tone(t + i * gap, dest, type, mtof(n), mtof(n), dur, vol, .005)); }
const SFXD = {
  step:    (t, o) => noiz(t, o, 'lowpass', 900 + Math.random() * 300, 300, .05, .07),
  hit:     (t, o) => { noiz(t, o, 'lowpass', 900, 120, .14, .55); tone(t, o, 'square', 190, 90, .07, .12); },
  crit:    (t, o) => { SFXD.hit(t, o); tone(t + .02, o, 'sine', 1568, 1568, .3, .14); tone(t + .06, o, 'sine', 2349, 2349, .3, .09); },
  whoosh:  (t, o) => noiz(t, o, 'bandpass', 700, 2600, .13, .16, 1.4),
  hurt:    (t, o) => { tone(t, o, 'sawtooth', 240, 110, .2, .16); noiz(t, o, 'lowpass', 500, 120, .18, .4); },
  dash:    (t, o) => noiz(t, o, 'bandpass', 380, 3200, .2, .32, 1.2),
  perfect: (t, o) => { tone(t, o, 'sine', 300, 1500, .3, .14, .2); arp(t + .2, o, [84, 88, 91], .05, .9, .08); },
  calm:    (t, o) => { arp(t, o, [72, 76, 79, 84], .07, .7, .13, 'triangle'); noiz(t + .05, o, 'bandpass', 900, 260, .7, .09, .8); },
  pick:    (t, o) => { tone(t, o, 'triangle', 660, 990, .09, .16); tone(t + .05, o, 'sine', 1320, 1320, .12, .08); },
  coin:    (t, o) => { tone(t, o, 'square', 1568, 1568, .05, .06); tone(t + .055, o, 'square', 2093, 2093, .12, .06); },
  break:   (t, o) => { noiz(t, o, 'lowpass', 2400, 180, .32, .5); for (let i = 0; i < 4; i++) noiz(t + .03 + Math.random() * .12, o, 'highpass', 3000, 3000, .03, .18); tone(t, o, 'sine', 140, 60, .18, .25); },
  boom:    (t, o) => { tone(t, o, 'sine', 120, 34, .7, .7); noiz(t, o, 'lowpass', 1400, 90, .7, .6); },
  level:   (t, o) => arp(t, o, [72, 76, 79, 84, 88], .08, .6, .14, 'triangle'),
  legend:  (t, o) => { arp(t, o, [72, 79, 84, 88, 91, 96], .09, 1.1, .11, 'triangle'); noiz(t, o, 'highpass', 6000, 9000, 1.2, .05); },
  equip:   (t, o) => { noiz(t, o, 'highpass', 2500, 2500, .03, .15); tone(t + .02, o, 'triangle', 523, 523, .08, .08); tone(t + .07, o, 'triangle', 784, 784, .1, .07); },
  throw:   (t, o) => noiz(t, o, 'bandpass', 500, 1900, .17, .2, 1.5),
  splash:  (t, o) => { noiz(t, o, 'bandpass', 1600, 350, .32, .35, .8); for (let i = 0; i < 4; i++) tone(t + .05 + i * .04, o, 'sine', 600 + Math.random() * 700, 1200 + Math.random() * 400, .05, .05); },
  brew:    (t, o) => { noiz(t, o, 'highpass', 2500, 4500, 1.3, .1, .5); for (let i = 0; i < 6; i++) tone(t + .2 + i * .14, o, 'sine', 180 + Math.random() * 140, 320 + Math.random() * 160, .07, .05); },
  ding:    (t, o) => { tone(t, o, 'sine', 1318, 1318, 1.1, .12); tone(t, o, 'sine', 2637, 2637, .4, .04); tone(t + .13, o, 'sine', 1760, 1760, 1.2, .1); },
  aggro:   (t, o) => { tone(t, o, 'sawtooth', 150, 105, .28, .09); noiz(t, o, 'lowpass', 600, 300, .25, .12); },
  fall:    (t, o) => tone(t, o, 'sine', 700, 140, .75, .12),
  jump:    (t, o) => { tone(t, o, 'sine', 240, 900, .32, .16); tone(t + .04, o, 'triangle', 480, 1200, .2, .06); },
  land:    (t, o) => { noiz(t, o, 'lowpass', 380, 120, .16, .45); tone(t, o, 'sine', 95, 50, .14, .25); },
  chest:   (t, o) => { tone(t, o, 'sawtooth', 110, 170, .28, .05); arp(t + .2, o, [79, 83, 86, 91], .06, .6, .1, 'triangle'); },
  drink:   (t, o) => { tone(t, o, 'sine', 320, 180, .08, .14); tone(t + .12, o, 'sine', 300, 170, .08, .12); },
  staple:  (t, o) => { noiz(t, o, 'highpass', 4200, 4200, .03, .2); tone(t, o, 'square', 1800, 1100, .03, .05); },
  memo:    (t, o) => noiz(t, o, 'bandpass', 2200, 1400, .12, .12, 2),
  warn:    (t, o) => { tone(t, o, 'sawtooth', 440, 440, .18, .06); tone(t + .2, o, 'sawtooth', 415, 415, .22, .06); },
  charge:  (t, o) => { tone(t, o, 'sawtooth', 70, 140, .7, .12); noiz(t, o, 'bandpass', 300, 1500, .7, .15); },
  ui:      (t, o) => tone(t, o, 'sine', 880, 880, .05, .05),
  tick:    (t, o) => { noiz(t, o, 'highpass', 5000, 5000, .012, .12); tone(t, o, 'square', 2600 + Math.random() * 200, 2600, .014, .03); },
  splashstep: (t, o) => noiz(t, o, 'bandpass', 1400 + Math.random() * 600, 500, .12, .12, .9),
  swim:    (t, o) => { noiz(t, o, 'bandpass', 900, 300, .35, .14, .7); tone(t + .1, o, 'sine', 500 + Math.random() * 300, 900, .06, .03); },
  dig:     (t, o) => { for (let i = 0; i < 3; i++) { noiz(t + i * .25, o, 'lowpass', 900, 200, .15, .35); tone(t + i * .25, o, 'triangle', 160, 90, .08, .1); } },
  cast:    (t, o) => { noiz(t, o, 'bandpass', 2500, 900, .25, .12, 2); tone(t + .35, o, 'sine', 900, 400, .1, .06); noiz(t + .4, o, 'bandpass', 1200, 400, .2, .12); },
  bite:    (t, o) => { for (let i = 0; i < 3; i++) tone(t + i * .09, o, 'square', 1200, 1200, .05, .05); noiz(t, o, 'bandpass', 1400, 500, .2, .16); },
  catch:   (t, o) => { noiz(t, o, 'bandpass', 1600, 400, .4, .25, .8); arp(t + .15, o, [76, 79, 84, 88], .07, .5, .11, 'triangle'); },
  escape:  (t, o) => { tone(t, o, 'triangle', 600, 200, .3, .1); noiz(t, o, 'bandpass', 1000, 300, .25, .1); },
  freeze:  (t, o) => { tone(t, o, 'sine', 2400, 1800, .25, .07); noiz(t, o, 'highpass', 5000, 8000, .3, .12); },
  steal:   (t, o) => { arp(t, o, [79, 74, 70], .05, .15, .08, 'square'); },
  parry:   (t, o) => { tone(t, o, 'square', 1800, 2400, .06, .1); tone(t, o, 'sine', 2600, 2600, .4, .1); noiz(t, o, 'highpass', 4000, 4000, .05, .2); },
  combo:   (t, o) => arp(t, o, [79, 83, 86, 91], .04, .3, .09, 'square'),
  discover:(t, o) => { arp(t, o, [67, 74, 79, 83, 86], .1, 1.2, .1, 'triangle'); arp(t + .05, o, [55, 62], .2, 1.4, .08, 'sine'); },
  travel:  (t, o) => { tone(t, o, 'sine', 300, 1200, .4, .12, .2); noiz(t, o, 'bandpass', 400, 4000, .5, .15); },
  tame:    (t, o) => arp(t, o, [72, 76, 79, 84, 88, 91], .07, .7, .1, 'sine'),
  page:    (t, o) => { noiz(t, o, 'bandpass', 3000, 1500, .18, .12, 1.5); arp(t + .12, o, [79, 84], .1, .5, .07, 'triangle'); },
  waypoint:(t, o) => { arp(t, o, [72, 79, 84], .12, 1, .1, 'sine'); noiz(t, o, 'highpass', 3000, 6000, .9, .05); },
  hop:     (t, o) => { tone(t, o, 'sine', 320, 620, .14, .1); noiz(t, o, 'bandpass', 900, 1600, .08, .06); },
  charged: (t, o) => arp(t, o, [84, 91], .05, .35, .1, 'square'),
  finisher:(t, o) => { tone(t, o, 'sine', 140, 50, .3, .45); noiz(t, o, 'lowpass', 1600, 150, .3, .5); tone(t + .02, o, 'square', 880, 440, .12, .06); },
  pour:    (t, o) => { noiz(t, o, 'bandpass', 700, 1400, .9, .08, 1.5); for (let i = 0; i < 5; i++) tone(t + i * .12, o, 'sine', 500 + i * 60, 700 + i * 60, .06, .03); },
  reveal0: (t, o) => arp(t, o, [72, 76], .1, .5, .1, 'triangle'),
  reveal1: (t, o) => arp(t, o, [72, 76, 79], .09, .6, .11, 'triangle'),
  reveal2: (t, o) => arp(t, o, [72, 76, 79, 84], .08, .7, .12, 'triangle'),
  reveal3: (t, o) => { arp(t, o, [72, 76, 79, 83, 86], .08, .9, .12, 'triangle'); noiz(t, o, 'highpass', 7000, 9000, .8, .04); },
  reveal4: (t, o) => { arp(t, o, [67, 72, 76, 79, 84, 88, 91], .07, 1.2, .12, 'triangle'); tone(t, o, 'sine', 65, 65, 1.2, .25); noiz(t, o, 'highpass', 6000, 9000, 1.4, .06); },
  reveal5: (t, o) => { arp(t, o, [64, 68, 71, 76, 80, 83, 88, 92, 95], .06, 1.5, .11, 'triangle'); arp(t + .1, o, [76, 83, 88, 95], .12, 1.6, .06, 'sine'); tone(t, o, 'sine', 55, 55, 1.6, .3); noiz(t, o, 'highpass', 5000, 10000, 2, .07); },
};
const sfxLimit = {};
function sfx(name, x, z) {
  if (!AC || AUD.muted || AC.state !== 'running') return;
  const fn = SFXD[name]; if (!fn) return;
  const t = AC.currentTime;
  if (sfxLimit[name] && t - sfxLimit[name] < .03) return; sfxLimit[name] = t;
  let vol = 1, pan = 0;
  if (x != null && running) {
    const d = dist2(x, z, pl.x, pl.z); vol = clamp(1.15 - d / 20, 0, 1); if (vol <= .02) return;
    pan = clamp((x - pl.x) / 12, -.85, .85);
  }
  const g = AC.createGain(); g.gain.value = vol;
  if (AC.createStereoPanner) { const p = AC.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(sfxBus); }
  else g.connect(sfxBus);
  fn(t, g);
}
function setAudio(k, v) {
  AUD[k] = v; saveAudio();
  if (!AC) return;
  if (k === 'music') musicBus.gain.setTargetAtTime(v * .75, AC.currentTime, .1);
  if (k === 'sfx') sfxBus.gain.setTargetAtTime(v, AC.currentTime, .1);
  if (k === 'muted') master.gain.setTargetAtTime(v ? 0 : 1, AC.currentTime, .1);
}
function refreshMuteBtn() { $('#mute').textContent = AUD.muted ? '🔇' : '🔊'; }
$('#mute').addEventListener('click', () => { initAudio(); setAudio('muted', !AUD.muted); refreshMuteBtn(); if (panel === 'sound') renderPanel(); });
refreshMuteBtn();
// музика на титулці стартує з першим дотиком/кліком
addEventListener('pointerdown', () => initAudio(), { once: true });
addEventListener('keydown', () => initAudio(), { once: true });
