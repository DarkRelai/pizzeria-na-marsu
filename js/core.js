'use strict';
/* Pizzeria on Mars — core: utils, save, i18n, input, canvas, assets */
const PM = window.PM = {};
PM.W = 1280;
PM.H = 720;
PM.TILE = 48;

/* ---------- utils ---------- */
PM.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
PM.lerp = (a, b, t) => a + (b - a) * t;
PM.rand = (a, b) => a + Math.random() * (b - a);
PM.hash = (x, y) => {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
PM.seeded = seed => {
  let s = (seed >>> 0) || 1;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
};
PM.ease = {
  outBack(t) { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  outCubic: t => 1 - Math.pow(1 - t, 3),
  inOut: t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  outElastic(t) { if (t <= 0 || t >= 1) return PM.clamp(t, 0, 1); return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1; }
};
PM.fmtTime = s => { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

/* ---------- save ---------- */
PM.save = {
  key: 'pizzamars.save.v1',
  data: { lang: null, music: 0.55, sfx: 0.8, unlocked: 1, stars: {}, best: {}, current: 0 },
  load() {
    try {
      const s = localStorage.getItem(this.key);
      if (s) Object.assign(this.data, JSON.parse(s));
    } catch (e) { /* storage unavailable */ }
    if (!this.data.lang) {
      const nl = (navigator.language || 'en').toLowerCase();
      this.data.lang = (nl.startsWith('cs') || nl.startsWith('sk')) ? 'cs' : 'en';
    }
  },
  write() { try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) { /* ignore */ } },
  resetProgress() { this.data.unlocked = 1; this.data.stars = {}; this.data.best = {}; this.data.current = 0; this.write(); },
  totalStars() { let n = 0; for (const k in this.data.stars) n += (this.data.stars[k] || []).filter(Boolean).length; return n; },
  totalSlices() { let n = 0; for (const k in this.data.best) n += (this.data.best[k] && this.data.best[k].slices) || 0; return n; }
};

/* ---------- i18n ---------- */
PM.STR = {
  en: {
    title1: 'Pizzeria', title2: 'on Mars',
    tagline: 'A platformer full of pizza, space monsters and Martian adventures!',
    play: 'Play', settings: 'Settings', howto: 'How to Play', language: 'Language', back: 'Back',
    music: 'Music', sfx: 'Sound effects', fullscreen: 'Fullscreen', on: 'On', off: 'Off',
    reset: 'Reset progress', resetConfirm: 'Click again to confirm', resetDone: 'Progress reset!',
    world: 'World 1', worldName: 'The Red Planet', startHere: 'Start Here!', locked: 'Locked',
    pause: 'Paused', resume: 'Resume', restart: 'Restart', map: 'Map',
    levelComplete: 'Pizza Delivered!', next: 'Next', replay: 'Replay',
    gameOver: 'Out of Hearts!', tryAgain: 'Try Again',
    slices: 'Slices', coins: 'Coins', time: 'Time',
    starFinish: 'Deliver the pizza', starSlices: 'Collect all slices', starNoHit: "Don't get hurt",
    boss: 'Robo-Chef', bossIntro: 'The Robo-Chef wants your recipe!',
    bossHint: 'Jump on his head!', bossDefeated: 'Robo-Chef defeated!',
    victoryTitle: 'Martian pizza is saved!',
    victoryText: 'The Robo-Chef is defeated and the pizzeria is open again.',
    thanks: 'Thanks for playing!',
    credits: 'HTML5 canvas game · all music and sound made in code',
    controls: 'Controls', goals: 'Goals & Challenges',
    cMove: 'Move', cJump: 'Jump', cClimb: 'Climb ladders', cPause: 'Pause',
    g1: 'Collect pizza!', g2: 'Reach the pizzeria!', g3: 'Jump on enemies!', g4: 'Get the best score!',
    tip1: 'Hit crates and pizza boxes from below.',
    tip2: 'Watch out for lasers, spikes and acid.',
    tip3: 'Yellow pads bounce you sky-high.',
    tapToStart: 'Click or press any key',
    checkpoint: 'Checkpoint!', speed: 'Speed!', heal: '+1 heart',
    getReady: 'Get ready!', go: 'Go!',
    stars: 'Stars', best: 'Best', total: 'Total',
    touchHint: 'Touch buttons appear on phones',
    levels: ['Landing Zone', 'Dusty Canyon', 'Bone Ridge', 'Pizzeria Plaza', 'Pipe Works', 'Acid Falls', 'Crystal Caverns', "Robo-Chef's Castle"]
  },
  cs: {
    title1: 'Pizzerie', title2: 'na Marsu',
    tagline: 'Platformer plný pizzy, vesmírných příšer a marsovských dobrodružství!',
    play: 'Hrát', settings: 'Nastavení', howto: 'Jak hrát', language: 'Jazyk', back: 'Zpět',
    music: 'Hudba', sfx: 'Zvukové efekty', fullscreen: 'Celá obrazovka', on: 'Zapnuto', off: 'Vypnuto',
    reset: 'Smazat postup', resetConfirm: 'Klikni znovu pro potvrzení', resetDone: 'Postup smazán!',
    world: 'Svět 1', worldName: 'Rudá planeta', startHere: 'Začni tady!', locked: 'Zamčeno',
    pause: 'Pauza', resume: 'Pokračovat', restart: 'Znovu', map: 'Mapa',
    levelComplete: 'Pizza doručena!', next: 'Další', replay: 'Znovu',
    gameOver: 'Došla srdíčka!', tryAgain: 'Zkusit znovu',
    slices: 'Kousky', coins: 'Mince', time: 'Čas',
    starFinish: 'Doruč pizzu', starSlices: 'Sesbírej všechny kousky', starNoHit: 'Nenech se zranit',
    boss: 'Robokuchař', bossIntro: 'Robokuchař chce tvůj recept!',
    bossHint: 'Skoč mu na hlavu!', bossDefeated: 'Robokuchař poražen!',
    victoryTitle: 'Marsovská pizza je zachráněna!',
    victoryText: 'Robokuchař je poražen a pizzerie má zase otevřeno.',
    thanks: 'Díky za hraní!',
    credits: 'Hra v HTML5 canvas · hudba a zvuky vytvořené kódem',
    controls: 'Ovládání', goals: 'Cíle a výzvy',
    cMove: 'Pohyb', cJump: 'Skok', cClimb: 'Lezení po žebříku', cPause: 'Pauza',
    g1: 'Sbírej pizzu!', g2: 'Dojdi do pizzerie!', g3: 'Skákej na nepřátele!', g4: 'Získej nejlepší skóre!',
    tip1: 'Bedny a krabice s pizzou rozbiješ zespodu.',
    tip2: 'Pozor na lasery, píky a kyselinu.',
    tip3: 'Žluté odrazové plošiny tě vystřelí vysoko.',
    tapToStart: 'Klikni nebo stiskni klávesu',
    checkpoint: 'Kontrolní bod!', speed: 'Rychlost!', heal: '+1 srdce',
    getReady: 'Připrav se!', go: 'Jedeme!',
    stars: 'Hvězdy', best: 'Nejlepší', total: 'Celkem',
    touchHint: 'Na telefonu se objeví dotyková tlačítka',
    levels: ['Přistávací zóna', 'Prašný kaňon', 'Kostěný hřbet', 'Náměstí pizzerie', 'Potrubní továrna', 'Kyselinové vodopády', 'Krystalové jeskyně', 'Hrad Robokuchaře']
  }
};
PM.t = function (k) {
  const L = PM.STR[PM.save.data.lang] || PM.STR.en;
  return L[k] !== undefined ? L[k] : (PM.STR.en[k] !== undefined ? PM.STR.en[k] : k);
};
PM.levelName = i => PM.t('levels')[i] || '';
PM.setLang = lang => { PM.save.data.lang = lang; PM.save.write(); document.documentElement.lang = lang; document.title = PM.t('title1') + ' ' + PM.t('title2'); };

/* ---------- fonts ---------- */
PM.FONT_TITLE = '"Lilita One", "Arial Black", "Trebuchet MS", sans-serif';
PM.FONT = '"Baloo 2", "Trebuchet MS", "Segoe UI", sans-serif';
PM.font = (size, weight = 800, title = false) => `${title ? '' : weight + ' '}${size}px ${title ? PM.FONT_TITLE : PM.FONT}`;

/* ---------- canvas / view ---------- */
PM.canvas = document.getElementById('game');
PM.ctx = PM.canvas.getContext('2d');
PM.view = { scale: 1, ox: 0, oy: 0, dpr: 1, px: 1 };
PM.resize = function () {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth, h = window.innerHeight;
  // fill the screen: keep 720 logical px of height, widen the view on wide screens
  PM.W = Math.round(PM.clamp(PM.H * w / Math.max(1, h), 1280, 2200));
  const scale = Math.min(w / PM.W, h / PM.H);
  PM.canvas.width = Math.round(w * dpr);
  PM.canvas.height = Math.round(h * dpr);
  PM.view = { scale, dpr, ox: (w - PM.W * scale) / 2, oy: (h - PM.H * scale) / 2, px: scale * dpr };
  PM.dirtyChunks = true;
};
window.addEventListener('resize', () => PM.resize());
PM.resize();
PM.beginFrame = function () {
  const c = PM.ctx, v = PM.view;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.fillStyle = '#12050b';
  c.fillRect(0, 0, PM.canvas.width, PM.canvas.height);
  c.setTransform(v.px, 0, 0, v.px, v.ox * v.dpr, v.oy * v.dpr);
  c.save();
  c.beginPath();
  c.rect(0, 0, PM.W, PM.H);
  c.clip();
};
PM.endFrame = function () { PM.ctx.restore(); };

/* ---------- input ---------- */
const KEYMAP = {
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  jump: ['Space', 'KeyZ', 'KeyK', 'KeyJ', 'ArrowUp', 'KeyW'],
  pause: ['Escape', 'KeyP'],
  confirm: ['Enter', 'NumpadEnter', 'Space'],
  back: ['Escape', 'Backspace']
};
PM.input = {
  keys: {}, pressed: {}, virt: {}, virtPressed: {}, jumpQueued: false,
  mouse: { x: -1, y: -1, down: false },
  click: null, anyPressed: false, usingTouch: false, pointers: {},
  down(a) { if (this.virt[a]) return true; const ks = KEYMAP[a]; for (let i = 0; i < ks.length; i++) if (this.keys[ks[i]]) return true; return false; },
  hit(a) {
    if (this.virtPressed[a]) return true;
    if (a === 'jump' && this.jumpQueued) return true;
    const ks = KEYMAP[a]; for (let i = 0; i < ks.length; i++) if (this.pressed[ks[i]]) return true;
    return false;
  },
  endFrame() { this.pressed = {}; this.virtPressed = {}; this.jumpQueued = false; this.click = null; this.anyPressed = false; }
};
const KEY_ALIASES = {
  ' ': 'Space', Spacebar: 'Space',
  ArrowLeft: 'ArrowLeft', ArrowRight: 'ArrowRight', ArrowUp: 'ArrowUp', ArrowDown: 'ArrowDown',
  a: 'KeyA', A: 'KeyA', d: 'KeyD', D: 'KeyD',
  w: 'KeyW', W: 'KeyW', s: 'KeyS', S: 'KeyS',
  z: 'KeyZ', Z: 'KeyZ', j: 'KeyJ', J: 'KeyJ', k: 'KeyK', K: 'KeyK',
  p: 'KeyP', P: 'KeyP', Escape: 'Escape', Enter: 'Enter', Backspace: 'Backspace'
};
const normaliseKeyCode = e => e.code || KEY_ALIASES[e.key] || e.key;
window.addEventListener('keydown', e => {
  const code = normaliseKeyCode(e);
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Backspace'].includes(code)) e.preventDefault();
  if (!e.repeat) {
    PM.input.pressed[code] = true;
    if (KEYMAP.jump.includes(code)) PM.input.jumpQueued = true;
    PM.input.anyPressed = true;
  }
  PM.input.keys[code] = true;
  if (document.activeElement !== PM.canvas) PM.canvas.focus({ preventScroll: true });
  PM.audio && PM.audio.unlock();
});
window.addEventListener('keyup', e => { PM.input.keys[normaliseKeyCode(e)] = false; });
const clearInput = () => { PM.input.keys = {}; PM.input.virt = {}; PM.input.pressed = {}; PM.input.jumpQueued = false; };
window.addEventListener('blur', clearInput);
document.addEventListener('visibilitychange', () => { if (document.hidden) clearInput(); });
PM.toLogical = function (cx, cy) {
  const v = PM.view;
  return { x: (cx - v.ox) / v.scale, y: (cy - v.oy) / v.scale };
};
PM.canvas.addEventListener('pointerdown', e => {
  PM.canvas.focus();
  const p = PM.toLogical(e.clientX, e.clientY);
  if (e.pointerType === 'touch') PM.input.usingTouch = true;
  PM.input.mouse.x = p.x; PM.input.mouse.y = p.y; PM.input.mouse.down = true;
  PM.input.pointers[e.pointerId] = { x: p.x, y: p.y, touch: e.pointerType === 'touch' };
  PM.input.anyPressed = true;
  PM.audio && PM.audio.unlock();
  try { PM.canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
});
PM.canvas.addEventListener('pointermove', e => {
  const p = PM.toLogical(e.clientX, e.clientY);
  PM.input.mouse.x = p.x; PM.input.mouse.y = p.y;
  if (PM.input.pointers[e.pointerId]) { PM.input.pointers[e.pointerId].x = p.x; PM.input.pointers[e.pointerId].y = p.y; }
});
const endPointer = e => {
  const p = PM.toLogical(e.clientX, e.clientY);
  if (PM.input.pointers[e.pointerId] && e.type === 'pointerup') PM.input.click = { x: p.x, y: p.y };
  delete PM.input.pointers[e.pointerId];
  PM.input.mouse.down = Object.keys(PM.input.pointers).length > 0;
};
PM.canvas.addEventListener('pointerup', endPointer);
PM.canvas.addEventListener('pointercancel', endPointer);
PM.canvas.addEventListener('contextmenu', e => e.preventDefault());

PM.toggleFullscreen = function () {
  try {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
    else document.exitFullscreen && document.exitFullscreen();
  } catch (e) { /* ignore */ }
};

/* ---------- assets (generated art, optional) ---------- */
PM.img = {};
PM.DEFAULT_NODES = [
  { x: 0.115, y: 0.62 }, { x: 0.275, y: 0.50 }, { x: 0.345, y: 0.355 }, { x: 0.515, y: 0.385 },
  { x: 0.69, y: 0.455 }, { x: 0.46, y: 0.705 }, { x: 0.675, y: 0.79 }, { x: 0.885, y: 0.64 }
];
PM.mapNodes = PM.DEFAULT_NODES;
PM.loadAssets = function (done) {
  const m = window.PIZZA_ASSETS;
  if (m && Array.isArray(m.mapNodes) && m.mapNodes.length >= 8 && m.mapNodes.every(n => n && isFinite(n.x) && isFinite(n.y))) {
    PM.mapNodes = m.mapNodes.slice(0, 8).map(n => ({ x: PM.clamp(+n.x, 0.03, 0.97), y: PM.clamp(+n.y, 0.08, 0.95) }));
  }
  const list = (m && m.images) ? Object.entries(m.images) : [];
  if (!list.length) { done(); return; }
  let left = list.length, finished = false;
  const fin = () => { if (!finished) { finished = true; done(); } };
  list.forEach(([key, src]) => {
    const im = new Image();
    im.onload = () => { PM.img[key] = im; if (--left === 0) fin(); };
    im.onerror = () => { if (--left === 0) fin(); };
    im.src = src;
  });
  setTimeout(fin, 10000);
};
