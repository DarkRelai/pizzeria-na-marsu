'use strict';
/* Pizzeria on Mars — screens (splash, menu, map, settings, how-to, play, victory) + main loop */
(function () {
  const A = PM.art, OUT = A.OUT, H = PM.H;
  let W = PM.W;
  const inRect = (p, r) => p && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

  /* ====================== screen base with buttons ====================== */
  class Screen {
    constructor() { this.t = 0; this.buttons = []; this.focus = -1; }
    add(b) {
      b.anchor = b.anchor || 'c';
      b.off = b.x - (b.anchor === 'c' ? W / 2 : b.anchor === 'r' ? W : 0);
      this.buttons.push(b); return b;
    }
    place() { for (const b of this.buttons) b.x = b.off + (b.anchor === 'c' ? W / 2 : b.anchor === 'r' ? W : 0); }
    label(b) { return typeof b.text === 'function' ? b.text() : PM.t(b.text); }
    navButtons(dt) {
      this.place();
      const inp = PM.input, m = inp.mouse;
      const vis = this.buttons.filter(b => !b.hidden || !b.hidden());
      if (!vis.length) return;
      // mouse hover
      let hov = -1;
      vis.forEach((b, i) => { if (inRect(m, b)) hov = i; });
      if (hov >= 0 && hov !== this.lastHover) { if (this.focus !== hov) PM.audio.sfx('select'); this.focus = hov; }
      this.lastHover = hov;
      // keyboard
      const prev = PM.input.hit('up') || PM.input.pressed.ArrowLeft && !vis[Math.max(0, this.focus)]?.slider;
      const next = PM.input.hit('down') || PM.input.pressed.ArrowRight && !vis[Math.max(0, this.focus)]?.slider;
      if (prev) { this.focus = this.focus <= 0 ? vis.length - 1 : this.focus - 1; PM.audio.sfx('select'); }
      if (next) { this.focus = (this.focus + 1) % vis.length; PM.audio.sfx('select'); }
      const f = vis[this.focus];
      if (f && f.slider) {
        if (PM.input.pressed.ArrowLeft) f.set(PM.clamp(f.get() - 0.1, 0, 1));
        if (PM.input.pressed.ArrowRight) f.set(PM.clamp(f.get() + 0.1, 0, 1));
      }
      // slider drag
      for (const b of vis) if (b.slider && m.down && inRect(m, { x: b.x - 10, y: b.y - 6, w: b.w + 20, h: b.h + 12 })) {
        b.set(PM.clamp((m.x - b.x - 20) / (b.w - 40), 0, 1));
      }
      if (inp.click) { for (const b of vis) if (!b.slider && inRect(inp.click, b)) { PM.audio.sfx('click'); b.onClick(); return; } }
      if (f && !f.slider && PM.input.hit('confirm')) { PM.audio.sfx('click'); f.onClick(); }
    }
    drawButtons(c) {
      this.place();
      const vis = this.buttons.filter(b => !b.hidden || !b.hidden());
      vis.forEach((b, i) => {
        if (b.slider) drawSlider(c, b, i === this.focus, this.label(b));
        else if (b.draw) b.draw(c, i === this.focus, b);
        else { b.label = this.label(b); A.button(c, b, i === this.focus, this.t); }
      });
    }
  }
  function drawSlider(c, b, focus, label) {
    A.text(c, label, b.x, b.y - 16, { size: 26, align: 'left', color: focus ? '#ffd8a8' : '#f2dcc8' });
    const v = b.get(), tx = b.x + 20, tw = b.w - 40, ty = b.y + b.h / 2;
    A.rr(c, b.x, b.y, b.w, b.h, b.h / 2); A.fs(c, '#2a0a18', 3, focus ? '#ffb060' : '#8a3a44');
    A.rr(c, tx - 8, ty - 7, tw * v + 16, 14, 7); c.fillStyle = A.lg(c, tx, 0, tx + tw, 0, ['#ff9a3a', '#ffd23a']); c.fill();
    A.circle(c, tx + tw * v, ty, 16); A.fs(c, '#fff3dc', 3);
    A.text(c, Math.round(v * 100) + '%', b.x + b.w + 50, ty + 2, { size: 24, color: '#f2dcc8' });
  }

  /* ====================== transitions ====================== */
  let screen = null, trans = null;
  PM.go = function (make, cx = W / 2, cy = H / 2) {
    if (trans) return;
    trans = { phase: 'out', t: 0, make, cx, cy };
  };
  function drawTransition(c, k, cx, cy) {
    if (k <= 0) return;
    const R = Math.hypot(W, H) * (1 - k);
    c.save();
    c.beginPath(); c.rect(0, 0, W, H); c.arc(cx, cy, Math.max(0, R), 0, Math.PI * 2, true);
    c.fillStyle = '#12050b'; c.fill('evenodd');
    if (R > 1) { c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.strokeStyle = '#ff8a3a'; c.lineWidth = 6; c.stroke(); }
    c.restore();
  }

  /* ====================== shared scenery ====================== */
  const menuBD = () => (PM._menuBD = PM._menuBD || A.makeBackdrop('canyon', 9));
  function drawMenuScene(c, t, withBuilding = true) {
    if (A.cover(c, 'menu', Math.sin(t * 0.07) * 18, Math.cos(t * 0.05) * 8, 1.06)) return;
    const bd = menuBD();
    c.fillStyle = A.lg(c, 0, 0, 0, H, bd.th.sky); c.fillRect(0, 0, W, H);
    A.drawStars(c, bd.stars, t);
    A.planet(c, 1010, 150, 120, bd.th.planet, t);
    c.save(); c.globalAlpha = 0.9;
    let off = (t * 8) % bd.W; c.drawImage(bd.far, -off, 0); c.drawImage(bd.far, bd.W - off, 0);
    c.globalAlpha = 1; off = (t * 18) % bd.W; c.drawImage(bd.mid, -off, 30); c.drawImage(bd.mid, bd.W - off, 30);
    c.restore();
    if (withBuilding) {
      A.plateau(c, 1000, 560, 470, 260, 4);
      A.pizzeria(c, 1000, 566, 0.95, t);
    }
    c.fillStyle = A.lg(c, 0, H * 0.6, 0, H, ['rgba(0,0,0,0)', 'rgba(40,8,16,0.6)']); c.fillRect(0, H * 0.6, W, H * 0.4);
  }
  // floating decorative slices
  const floaters = Array.from({ length: 9 }, (_, i) => ({ x: Math.random() * W, y: Math.random() * H, vx: 10 + Math.random() * 25, vy: -5 - Math.random() * 12, r: Math.random() * 6, vr: (Math.random() - 0.5) * 1.5, s: 0.6 + Math.random() * 0.7 }));
  function drawFloaters(c, dt) {
    for (const f of floaters) {
      f.x += f.vx * dt; f.y += f.vy * dt; f.r += f.vr * dt;
      if (f.x > W + 40) f.x = -40; if (f.y < -40) f.y = H + 40;
      c.save(); c.globalAlpha = 0.85; A.slice(c, f.x, f.y, f.s, f.r); c.restore();
    }
  }
  function ufo(c, t) {
    const k = (t * 0.06) % 1.6;
    if (k > 1) return;
    const x = -100 + k * (W + 200), y = 110 + Math.sin(t * 1.4) * 18;
    c.save();
    c.globalAlpha = 0.25 + 0.1 * Math.sin(t * 9);
    c.fillStyle = A.lg(c, 0, y, 0, y + 260, ['rgba(180,255,200,0.9)', 'rgba(180,255,200,0)']);
    c.beginPath(); c.moveTo(x - 14, y + 8); c.lineTo(x - 70, y + 260); c.lineTo(x + 70, y + 260); c.lineTo(x + 14, y + 8); c.fill();
    c.restore();
    if (!A.img(c, 'ufo', x, y + 20, 56)) A.drone(c, x, y, { t, face: 1, tilt: Math.sin(t * 2) * 0.1 });
  }

  /* ====================== splash ====================== */
  class Splash extends Screen {
    update(dt) {
      this.t += dt;
      if (this.t > 0.4 && (PM.input.anyPressed || PM.input.click)) { PM.audio.unlock(); PM.audio.sfx('click'); PM.go(() => new Menu()); }
    }
    draw(c) {
      drawMenuScene(c, this.t);
      c.fillStyle = 'rgba(18,5,11,0.45)'; c.fillRect(0, 0, W, H);
      const k = PM.ease.outBack(Math.min(1, this.t * 1.4));
      A.logo(c, W / 2, H / 2 - 50, 1.15 * k, this.t);
      A.text(c, PM.t('tagline'), W / 2, H / 2 + 110, { size: 28, color: '#ffe3c0', stroke: OUT, lw: 6, alpha: Math.min(1, this.t) });
      A.text(c, PM.t('tapToStart'), W / 2, H - 90, { size: 32, color: '#fff3dc', stroke: OUT, lw: 6, alpha: 0.55 + 0.45 * Math.sin(this.t * 4) });
    }
  }

  /* ====================== main menu ====================== */
  class Menu extends Screen {
    constructor() {
      super();
      PM.audio.play('menu');
      const bx = 110, bw = 340;
      this.add({ anchor: 'l', x: bx, y: 330, w: bw, h: 74, text: 'play', primary: true, size: 36, onClick: () => PM.go(() => new MapScreen()) });
      this.add({ anchor: 'l', x: bx, y: 420, w: bw, h: 62, text: 'howto', onClick: () => PM.go(() => new HowTo(this)) });
      this.add({ anchor: 'l', x: bx, y: 498, w: bw, h: 62, text: 'settings', onClick: () => PM.go(() => new Settings(() => new Menu())) });
      const langBtn = (lang, x) => this.add({
        anchor: 'r', x, y: 22, w: 74, h: 50, text: () => '', onClick: () => { PM.setLang(lang); },
        draw: (c, f, b) => {
          const x = b.x;
          const on = PM.save.data.lang === lang;
          c.save(); if (f || on) { c.shadowColor = on ? '#ffb060' : '#fff'; c.shadowBlur = 16; }
          A.flag(c, lang, x + 6, 28, 62, 38);
          c.restore();
          if (on) { A.rr(c, x + 1, 23, 72, 48, 8); c.lineWidth = 3.5; c.strokeStyle = '#ffb060'; c.stroke(); }
          A.text(c, lang.toUpperCase(), x + 37, 88, { size: 18, color: on ? '#ffd8a8' : '#c8a898' });
        }
      });
      langBtn('cs', W - 190); langBtn('en', W - 100);
      this.focus = 0;
    }
    update(dt) { this.t += dt; this.dt = dt; if (PM.input.hit('back') && this.t > 0.5) { /* stay */ } this.navButtons(dt); }
    draw(c) {
      drawMenuScene(c, this.t);
      ufo(c, this.t + 6);
      drawFloaters(c, this.dt || 0);
      c.fillStyle = A.lg(c, 0, 0, 620, 0, ['rgba(18,5,11,0.55)', 'rgba(18,5,11,0)']); c.fillRect(0, 0, 620, H);
      A.logo(c, 300, 150, 0.82, this.t);
      A.text(c, PM.t('tagline'), 280, 268, { size: 21, color: '#ffe3c0', stroke: OUT, lw: 5, maxW: 520 });
      this.drawButtons(c);
      // hero on a little rock
      const hx = 560, hy = 628;
      A.ellipse(c, hx, hy + 14, 70, 16); A.fs(c, A.lg(c, 0, hy, 0, hy + 30, ['#e2703c', '#7a2a20']), 3);
      A.hero(c, hx, hy + 2, { t: this.t, state: 'idle', face: 1 });
      A.text(c, PM.t('credits'), W / 2, H - 22, { size: 17, color: 'rgba(255,230,210,0.7)' });
      A.text(c, PM.t('language'), W - 108, 102 + 10, { size: 16, color: 'rgba(255,220,200,0.7)' });
    }
  }

  /* ====================== settings ====================== */
  class Settings extends Screen {
    constructor(back, under) {
      super();
      this.back = back; this.under = under;
      const px = W / 2 - 300;
      this.add({ slider: true, x: px + 60, y: 210, w: 400, h: 40, text: 'music', get: () => PM.save.data.music, set: v => { PM.save.data.music = v; PM.audio.applyVolumes(); PM.save.write(); } });
      this.add({ slider: true, x: px + 60, y: 310, w: 400, h: 40, text: 'sfx', get: () => PM.save.data.sfx, set: v => { const o = PM.save.data.sfx; PM.save.data.sfx = v; PM.audio.applyVolumes(); PM.save.write(); if (Math.abs(o - v) > 0.04) PM.audio.sfx('coin'); } });
      this.add({ x: px + 60, y: 390, w: 230, h: 58, size: 24, text: () => PM.t('language') + ': ' + (PM.save.data.lang === 'cs' ? 'Čeština' : 'English'), onClick: () => PM.setLang(PM.save.data.lang === 'cs' ? 'en' : 'cs') });
      this.add({ x: px + 310, y: 390, w: 230, h: 58, size: 24, text: () => PM.t('fullscreen'), onClick: () => PM.toggleFullscreen() });
      this.resetBtn = this.add({ x: px + 60, y: 466, w: 480, h: 58, size: 24, text: () => this.resetState === 1 ? PM.t('resetConfirm') : this.resetState === 2 ? PM.t('resetDone') : PM.t('reset'), onClick: () => { if (this.resetState === 1) { PM.save.resetProgress(); this.resetState = 2; } else if (!this.resetState) this.resetState = 1; } });
      this.add({ x: W / 2 - 130, y: 560, w: 260, h: 64, text: 'back', primary: true, onClick: () => this.close() });
      this.focus = 0;
    }
    close() { if (this.under) { PM.setScreen(this.under); } else PM.go(this.back); }
    update(dt) { this.t += dt; if (PM.input.hit('back')) { this.close(); return; } this.navButtons(dt); }
    draw(c) {
      if (this.under) { this.under.draw(c); c.fillStyle = 'rgba(18,5,11,0.6)'; c.fillRect(0, 0, W, H); }
      else { drawMenuScene(c, this.t); c.fillStyle = 'rgba(18,5,11,0.5)'; c.fillRect(0, 0, W, H); }
      A.panel(c, W / 2 - 300, 110, 600, 540, PM.t('settings'));
      A.gear(c, W / 2 + 250, 160, 24);
      this.drawButtons(c);
    }
  }

  /* ====================== how to play ====================== */
  class HowTo extends Screen {
    constructor() {
      super();
      this.add({ x: W / 2 - 130, y: 628, w: 260, h: 62, text: 'back', primary: true, onClick: () => PM.go(() => new Menu()) });
      this.focus = 0;
    }
    update(dt) { this.t += dt; if (PM.input.hit('back')) { PM.go(() => new Menu()); return; } this.navButtons(dt); }
    draw(c) {
      const t = this.t;
      drawMenuScene(c, t); c.fillStyle = 'rgba(18,5,11,0.55)'; c.fillRect(0, 0, W, H);
      A.text(c, PM.t('howto'), W / 2, 58, { size: 56, title: true, color: '#ffc46a', stroke: OUT, lw: 10, shadow: 'rgba(255,120,40,0.7)' });
      c.save(); c.translate(Math.round((W - 1280) / 2), 0);
      // controls panel
      A.panel(c, 60, 130, 560, 470, PM.t('controls'));
      const key = (x, y, label, w = 50) => { A.rr(c, x, y, w, 44, 9); A.fs(c, A.lg(c, 0, y, 0, y + 44, ['#fff3e4', '#d8c8b8']), 3); A.text(c, label, x + w / 2, y + 23, { size: label.length > 2 ? 18 : 24, color: '#3a1424' }); };
      const rowY = [190, 280, 370, 460];
      key(90, rowY[0], '←'); key(146, rowY[0], '→'); key(214, rowY[0], 'A'); key(270, rowY[0], 'D');
      key(90, rowY[1], 'Space', 100); key(200, rowY[1], 'W'); key(256, rowY[1], '↑');
      key(90, rowY[2], '↑'); key(146, rowY[2], '↓'); key(214, rowY[2], 'W'); key(270, rowY[2], 'S');
      key(90, rowY[3], 'Esc', 70); key(170, rowY[3], 'P');
      [PM.t('cMove'), PM.t('cJump'), PM.t('cClimb'), PM.t('cPause')].forEach((s, i) => A.text(c, s, 350, rowY[i] + 23, { size: 26, align: 'left', color: '#ffe3c0', maxW: 250 }));
      A.text(c, PM.t('touchHint'), 340, 560, { size: 19, color: 'rgba(255,220,200,0.75)', maxW: 520 });
      // goals panel
      A.panel(c, 660, 130, 560, 470, PM.t('goals'));
      const gy = [195, 260, 325, 390];
      A.slice(c, 712, gy[0], 1.1, -0.3);
      A.star(c, 712, gy[1], 17, true);
      A.alien(c, 712, gy[2] + 20, { t, face: 1, sx: 0.7, sy: 0.7 });
      A.text(c, '🏆', 712, gy[3], { size: 30 });
      ['g1', 'g2', 'g3', 'g4'].forEach((k, i) => A.text(c, PM.t(k), 750, gy[i] + 2, { size: 28, align: 'left', color: '#fff3dc', maxW: 440 }));
      c.strokeStyle = 'rgba(255,150,90,0.25)'; c.lineWidth = 2; c.beginPath(); c.moveTo(690, 430); c.lineTo(1190, 430); c.stroke();
      ['tip1', 'tip2', 'tip3'].forEach((k, i) => A.text(c, '• ' + PM.t(k), 690, 465 + i * 40, { size: 21, align: 'left', color: '#f2d0b8', maxW: 500 }));
      c.restore();
      this.drawButtons(c);
    }
  }

  /* ====================== world map ====================== */
  const PLAT = [
    { w: 210, h: 200 }, { w: 190, h: 190 }, { w: 230, h: 210 }, { w: 300, h: 240 },
    { w: 250, h: 230 }, { w: 250, h: 220 }, { w: 230, h: 200 }, { w: 300, h: 260 }
  ];
  class MapScreen extends Screen {
    constructor(focusLevel) {
      super();
      PM.audio.play('map');
      const sd = PM.save.data;
      this.sel = PM.clamp(focusLevel !== undefined ? focusLevel : (sd.current || 0), 0, sd.unlocked - 1);
      this.heroPos = { ...this.nodeXY(this.sel) }; this.heroFrom = null; this.heroT = 1;
      this.add({ anchor: 'l', x: 24, y: H - 92, w: 190, h: 66, text: 'back', icon: (c, x, y) => { c.beginPath(); c.moveTo(x - 10, y); c.lineTo(x + 6, y - 12); c.lineTo(x + 6, y + 12); c.closePath(); A.fs(c, '#fff3dc', 2); }, onClick: () => PM.go(() => new Menu()) });
      this.playBtn = this.add({ anchor: 'l', x: W / 2 + 120, y: H - 104, w: 170, h: 70, text: 'play', primary: true, size: 34, onClick: () => this.startLevel() });
      this.add({ anchor: 'r', x: W - 84, y: 18, w: 64, h: 64, text: () => '', onClick: () => PM.go(() => new Settings(() => new MapScreen(this.sel))),
        draw: (c, f) => { A.rr(c, W - 84, 18, 64, 64, 16); A.fs(c, f ? '#5a1e36' : '#3a1024', 3, f ? '#ffb060' : '#b8564a'); A.gear(c, W - 52, 50, 20); } });
      this.focus = 1;
    }
    nodeXY(i) {
      const n = PM.mapNodes[i];
      const im = PM.img.map;
      if (im) {
        const s = Math.max(W / im.width, H / im.height), w = im.width * s, h = im.height * s;
        return { x: (W - w) / 2 + n.x * w, y: (H - h) / 2 + n.y * h };
      }
      return { x: n.x * W, y: n.y * H };
    }
    select(i) {
      if (i === this.sel || i >= PM.save.data.unlocked || i < 0) return;
      this.heroFrom = { ...this.heroPos }; this.heroT = 0; this.sel = i;
      PM.audio.sfx('step');
    }
    startLevel() {
      const idx = this.sel;
      PM.save.data.current = idx; PM.save.write();
      const p = this.nodeXY(idx);
      PM.go(() => new Play(idx), p.x, p.y);
    }
    update(dt) {
      this.t += dt;
      const inp = PM.input, un = PM.save.data.unlocked;
      if (inp.hit('back')) { PM.go(() => new Menu()); return; }
      if (inp.pressed.ArrowRight || inp.pressed.KeyD) this.select(Math.min(un - 1, this.sel + 1));
      if (inp.pressed.ArrowLeft || inp.pressed.KeyA) this.select(Math.max(0, this.sel - 1));
      if (inp.pressed.Enter || inp.pressed.NumpadEnter || inp.pressed.Space) { PM.audio.sfx('click'); this.startLevel(); return; }
      if (inp.click) {
        for (let i = 0; i < 8; i++) {
          const p = this.nodeXY(i);
          if (Math.hypot(inp.click.x - p.x, (inp.click.y - p.y) * 1.6) < 46) {
            if (i >= un) { PM.audio.sfx('bump'); this.shakeNode = { i, t: 0.3 }; }
            else if (i === this.sel) { PM.audio.sfx('click'); this.startLevel(); }
            else this.select(i);
            inp.click = null; break;
          }
        }
      }
      // mouse hover only (no keyboard nav) for map buttons
      const saved = { up: inp.pressed.ArrowUp, down: inp.pressed.ArrowDown, l: inp.pressed.ArrowLeft, r: inp.pressed.ArrowRight, sp: inp.pressed.Space, en: inp.pressed.Enter, w: inp.pressed.KeyW, s: inp.pressed.KeyS };
      ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Enter', 'KeyW', 'KeyS'].forEach(k => { inp.pressed[k] = false; });
      this.navButtons(dt);
      if (this.heroT < 1) {
        this.heroT = Math.min(1, this.heroT + dt * 2.2);
        const a = this.heroFrom, b = this.nodeXY(this.sel), k = PM.ease.inOut(this.heroT);
        this.heroPos = { x: PM.lerp(a.x, b.x, k), y: PM.lerp(a.y, b.y, k) - Math.sin(k * Math.PI) * 60 };
      } else this.heroPos = this.nodeXY(this.sel);
      if (this.shakeNode) { this.shakeNode.t -= dt; if (this.shakeNode.t <= 0) this.shakeNode = null; }
    }
    drawBackground(c) {
      const t = this.t;
      if (A.cover(c, 'map')) return;
      const bd = menuBD();
      c.fillStyle = A.lg(c, 0, 0, 0, H, ['#1b0a22', '#5a1a2e', '#b8452a']); c.fillRect(0, 0, W, H);
      A.drawStars(c, bd.stars, t);
      A.planet(c, 1100, 110, 85, bd.th.planet, t);
      c.globalAlpha = 0.8; c.drawImage(bd.far, -200, -120); c.globalAlpha = 1;
      c.drawImage(bd.mid, -600, -40);
      c.fillStyle = A.lg(c, 0, 380, 0, H, ['rgba(60,10,16,0)', 'rgba(50,8,14,0.85)']); c.fillRect(0, 380, W, H - 380);
      // floating rocks
      for (let i = 0; i < 6; i++) {
        const x = (i * 233 + 80) % W, y = 80 + (i * 97) % 220 + Math.sin(t + i) * 6;
        c.save(); c.translate(x, y); c.rotate(i + t * 0.05);
        c.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2, r = 12 + (i % 3) * 6 + (k % 2) * 4; c.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.8); }
        c.closePath(); A.fs(c, '#6e2a2a', 2.5); c.restore();
      }
      // plateaus back-to-front
      const order = [...Array(8).keys()].sort((a, b) => PM.mapNodes[a].y - PM.mapNodes[b].y);
      for (const i of order) {
        const p = this.nodeXY(i), pl = PLAT[i];
        const col = i === 5 ? '#8a4a2e' : i === 6 ? '#8a3a7e' : i === 7 ? '#5a2a3e' : '#b0432c';
        A.plateau(c, p.x, p.y + 6, pl.w, pl.h, i * 13 + 2, col);
        this.drawDeco(c, i, p, t);
      }
    }
    drawDeco(c, i, p, t) {
      const x = p.x, y = p.y + 4;
      switch (i) {
        case 0: A.crate(c, x - 90, y - 34, 30); A.crate(c, x - 70, y - 26, 26); break;
        case 1: // hab dome
          c.beginPath(); c.arc(x + 58, y - 2, 30, Math.PI, 0); c.closePath(); A.fs(c, A.lg(c, 0, y - 32, 0, y, ['#9a8eb0', '#5e5272']), 3);
          A.rr(c, x + 50, y - 18, 16, 18, 3); A.fs(c, '#ffd06a', 2.5);
          A.alien(c, x - 58, y, { t, face: 1, sx: 0.7, sy: 0.7 }); break;
        case 2: // ribs + skull
          for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(x - 30 + k * 22, y + 10, 46 - k * 4, Math.PI * 1.15, Math.PI * 1.55); c.lineWidth = 9; c.strokeStyle = OUT; c.stroke(); c.lineWidth = 5; c.strokeStyle = '#ecd8b8'; c.stroke(); }
          A.ellipse(c, x - 70, y - 14, 18, 15); A.fs(c, '#ecd8b8', 3); A.circle(c, x - 76, y - 16, 4); c.fillStyle = OUT; c.fill(); A.circle(c, x - 64, y - 16, 4); c.fill(); break;
        case 3: A.pizzeria(c, x, y - 4, 0.62, t); break;
        case 4: // factory
          A.rr(c, x + 20, y - 92, 90, 92, 6); A.fs(c, A.lg(c, 0, y - 92, 0, y, ['#6a3a7a', '#3a1a4a']), 3);
          A.rr(c, x + 34, y - 70, 22, 22, 4); A.fs(c, '#ffd06a', 2.5);
          A.rr(c, x + 80, y - 126, 18, 40, 3); A.fs(c, '#5a4a6a', 3);
          c.lineWidth = 12; c.strokeStyle = OUT; c.beginPath(); c.moveTo(x + 20, y - 40); c.lineTo(x - 40, y - 40); c.lineTo(x - 40, y - 2); c.stroke();
          c.lineWidth = 7; c.strokeStyle = '#8a7ea0'; c.stroke();
          A.blob(c, x - 80, y, { t, face: 1, sx: 0.75, sy: 0.75 }); break;
        case 5: // acid pool
          A.ellipse(c, x - 40, y + 4, 60, 12); A.fs(c, A.lg(c, 0, y - 8, 0, y + 16, ['#d8ff7a', '#5ab02a']), 3);
          A.glow(c, x - 40, y, 80, 'rgba(160,255,70,0.4)');
          c.lineWidth = 14; c.strokeStyle = OUT; c.beginPath(); c.moveTo(x + 60, y - 60); c.lineTo(x + 60, y - 20); c.lineTo(x + 20, y - 20); c.stroke();
          c.lineWidth = 9; c.strokeStyle = '#6a5a7a'; c.stroke();
          A.alien(c, x + 70, y, { t: t + 2, face: -1, sx: 0.9, sy: 0.9 }); break;
        case 6: // crystals
          for (let k = 0; k < 5; k++) {
            const cx = x - 70 + k * 32, hgt = 40 + ((k * 37) % 40);
            c.beginPath(); c.moveTo(cx - 12, y); c.lineTo(cx - 9, y - hgt * 0.7); c.lineTo(cx, y - hgt); c.lineTo(cx + 9, y - hgt * 0.7); c.lineTo(cx + 12, y); c.closePath();
            A.fs(c, A.lg(c, cx - 12, y, cx + 12, y - hgt, ['#8a3ab0', '#e8a8ff']), 3);
          }
          A.glow(c, x, y - 30, 110, 'rgba(220,120,255,0.35)', 0.8 + Math.sin(t * 2) * 0.2); break;
        case 7: A.castle(c, x + 10, y - 2, 0.62, t); break;
      }
    }
    draw(c) {
      const t = this.t, sd = PM.save.data, un = sd.unlocked;
      this.drawBackground(c);
      // path
      for (let i = 0; i < 7; i++) {
        const a = this.nodeXY(i), b = this.nodeXY(i + 1);
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 + 40;
        const open = i + 1 < un;
        c.save(); c.lineCap = 'round';
        c.setLineDash([1, 17]); c.lineDashOffset = -t * 20;
        c.beginPath(); c.moveTo(a.x, a.y); c.quadraticCurveTo(mx, my, b.x, b.y);
        c.lineWidth = 12; c.strokeStyle = 'rgba(40,10,20,0.8)'; c.stroke();
        c.lineWidth = 7; c.strokeStyle = open ? '#ffd84a' : 'rgba(200,170,150,0.55)'; c.stroke();
        c.restore();
      }
      // nodes
      for (let i = 0; i < 8; i++) {
        let p = this.nodeXY(i);
        if (this.shakeNode && this.shakeNode.i === i) p = { x: p.x + Math.sin(t * 60) * 5, y: p.y };
        const open = i < un, sel = i === this.sel;
        if (open) {
          A.glow(c, p.x, p.y, sel ? 80 : 56, 'rgba(255,180,60,0.6)', 0.7 + Math.sin(t * 4 + i) * 0.3);
          A.ellipse(c, p.x, p.y + 4, 44, 22); c.fillStyle = OUT; c.fill();
          A.ellipse(c, p.x, p.y, 42, 21); A.fs(c, A.lg(c, 0, p.y - 20, 0, p.y + 20, ['#ffe07a', '#e8a020', '#b86a10']), 3);
          A.ellipse(c, p.x, p.y, 32, 14); A.fs(c, '#5a2a14', 2);
          A.text(c, '1-' + (i + 1), p.x, p.y + 1, { size: 24, color: '#fff3dc', stroke: OUT, lw: 5 });
          const st = sd.stars[i] || [];
          if (st.some(Boolean)) for (let k = 0; k < 3; k++) A.star(c, p.x - 26 + k * 26, p.y + 34 + (k === 1 ? 6 : 0), 10, !!st[k]);
        } else {
          A.ellipse(c, p.x, p.y + 4, 40, 21); c.fillStyle = OUT; c.fill();
          A.ellipse(c, p.x, p.y, 38, 19); A.fs(c, A.lg(c, 0, p.y - 19, 0, p.y + 19, ['#8a8098', '#4a4058']), 3);
          A.lock(c, p.x, p.y - 2, 1.2);
        }
      }
      // start here sign
      if (un === 1 && !(sd.stars[0] || []).some(Boolean)) {
        const p = this.nodeXY(0), b = Math.sin(t * 4) * 6;
        c.save(); c.translate(p.x + 10, p.y - 150 + b); c.rotate(-0.12);
        A.rr(c, -64, -30, 128, 52, 12); A.fs(c, '#3a1424', 3, '#e8b090');
        A.text(c, PM.t('startHere'), 0, -4, { size: 22, color: '#ffe3c0', maxW: 116 });
        c.beginPath(); c.moveTo(-8, 26); c.lineTo(8, 26); c.lineTo(0, 42); c.closePath(); A.fs(c, '#ffe3c0', 2.5);
        c.restore();
      }
      // hero
      A.hero(c, this.heroPos.x - 50, this.heroPos.y - 6, { t, state: this.heroT < 1 ? 'jump' : 'idle', face: 1, sx: 0.9, sy: 0.9 });
      // top-left logo + stats
      A.logo(c, 190, 74, 0.42, t);
      const box = (x, w) => { A.rr(c, x, 18, w, 60, 18); c.fillStyle = 'rgba(30,8,18,0.6)'; c.fill(); };
      box(W - 380, 280);
      A.slice(c, W - 346, 48, 1.15, -0.4);
      A.text(c, '× ' + PM.save.totalSlices(), W - 318, 50, { size: 30, align: 'left', color: '#fff3dc', stroke: OUT, lw: 5 });
      A.star(c, W - 210, 48, 18, true);
      A.text(c, '× ' + PM.save.totalStars(), W - 184, 50, { size: 30, align: 'left', color: '#fff3dc', stroke: OUT, lw: 5 });
      // world panel
      A.rr(c, W - 330, H - 110, 306, 88, 20); A.fs(c, 'rgba(36,10,22,0.9)', 3, '#b8564a');
      A.planet(c, W - 286, H - 66, 24, ['#ffa060', '#d8502a', '#6a1a1e'], t);
      c.save(); c.translate(W - 286, H - 66); c.rotate(-0.3); c.beginPath(); c.ellipse(0, 0, 38, 9, 0, 0, Math.PI * 2); c.strokeStyle = '#ffb060'; c.lineWidth = 3; c.stroke(); c.restore();
      A.text(c, PM.t('world'), W - 160, H - 84, { size: 26, color: '#fff3dc' });
      A.text(c, PM.t('worldName'), W - 160, H - 50, { size: 22, color: '#f2c8a8' });
      // selected level panel
      const s = this.sel, st = sd.stars[s] || [], best = sd.best[s];
      const px = W / 2 - 330;
      A.rr(c, px, H - 112, 440, 86, 20); A.fs(c, 'rgba(36,10,22,0.92)', 3, '#b8564a');
      A.text(c, '1-' + (s + 1) + '  ' + PM.levelName(s), px + 22, H - 86, { size: 26, align: 'left', color: '#ffe3c0', maxW: 300 });
      for (let k = 0; k < 3; k++) A.star(c, px + 36 + k * 34, H - 50, 13, !!st[k]);
      if (best) { A.slice(c, px + 170, H - 50, 0.8, -0.3); A.text(c, best.slices + '', px + 190, H - 48, { size: 22, align: 'left', color: '#fff3dc' }); A.text(c, PM.fmtTime(best.time), px + 250, H - 48, { size: 22, align: 'left', color: '#f2c8a8' }); }
      this.playBtn.off = px + 260; this.playBtn.y = H - 102; this.playBtn.w = 160; this.playBtn.h = 66;
      this.drawButtons(c);
    }
  }

  /* ====================== play ====================== */
  class Play extends Screen {
    constructor(idx) {
      super();
      this.idx = idx;
      this.game = new PM.Game(idx);
      PM.audio.play(PM.LEVELS[idx].music);
      this.mode = 'play';
    }
    setMode(mode) {
      this.mode = mode; this.buttons = []; this.focus = 0; this.modeT = 0;
      const cx = W / 2;
      if (mode === 'pause') {
        this.add({ x: cx - 150, y: 250, w: 300, h: 66, text: 'resume', primary: true, onClick: () => this.setMode('play') });
        this.add({ x: cx - 150, y: 330, w: 300, h: 60, text: 'restart', onClick: () => PM.go(() => new Play(this.idx)) });
        this.add({ x: cx - 150, y: 404, w: 300, h: 60, text: 'settings', onClick: () => PM.setScreen(new Settings(null, this)) });
        this.add({ x: cx - 150, y: 478, w: 300, h: 60, text: 'map', onClick: () => PM.go(() => new MapScreen(this.idx)) });
      } else if (mode === 'done') {
        const last = this.idx === PM.LEVELS.length - 1;
        this.add({ x: cx - 330, y: 560, w: 200, h: 64, text: 'map', onClick: () => PM.go(() => new MapScreen(Math.min(this.idx + 1, PM.save.data.unlocked - 1))) });
        this.add({ x: cx - 110, y: 560, w: 200, h: 64, text: 'replay', onClick: () => PM.go(() => new Play(this.idx)) });
        this.add({ x: cx + 110, y: 560, w: 220, h: 64, text: last ? () => '★ ' + PM.t('next') : 'next', primary: true, onClick: () => PM.go(() => last ? new Victory() : new Play(this.idx + 1)) });
        this.focus = 2;
        this.starShown = 0;
      } else if (mode === 'over') {
        this.add({ x: cx - 160, y: 400, w: 320, h: 68, text: 'tryAgain', primary: true, onClick: () => PM.go(() => new Play(this.idx)) });
        this.add({ x: cx - 160, y: 484, w: 320, h: 60, text: 'map', onClick: () => PM.go(() => new MapScreen(this.idx)) });
      }
    }
    update(dt) {
      this.t += dt;
      const g = this.game, inp = PM.input;
      if (this.mode === 'play') {
        if (inp.hit('pause') || (inp.click && g.pauseRect && inRect(inp.click, g.pauseRect))) { PM.audio.sfx('click'); this.setMode('pause'); return; }
        g.update(dt);
        if (g.state === 'done') this.setMode('done');
        else if (g.state === 'over' && g.stateT > 0.6) this.setMode('over');
      } else {
        this.modeT += dt;
        if (this.mode === 'pause' && (inp.hit('pause') || inp.hit('back'))) { this.setMode('play'); return; }
        if (this.mode === 'done') {
          g.updateParticles(dt);
          const st = g.result.stars;
          const show = Math.min(3, Math.floor((this.modeT - 0.3) / 0.4) + 1);
          while (this.starShown < show && this.modeT > 0.3) { if (st[this.starShown]) PM.audio.sfx('star'); this.starShown++; }
        }
        this.navButtons(dt);
      }
    }
    draw(c) {
      const g = this.game;
      g.draw(c);
      if (this.mode === 'pause') {
        c.fillStyle = 'rgba(18,5,11,0.65)'; c.fillRect(0, 0, W, H);
        A.panel(c, W / 2 - 210, 150, 420, 420, PM.t('pause'));
        A.text(c, '1-' + (this.idx + 1) + ' · ' + PM.levelName(this.idx), W / 2, 205, { size: 24, color: '#f2c8a8', maxW: 380 });
        this.drawButtons(c);
      } else if (this.mode === 'done') {
        c.fillStyle = 'rgba(18,5,11,0.6)'; c.fillRect(0, 0, W, H);
        const r = g.result, k = PM.ease.outBack(Math.min(1, this.modeT * 2.5));
        c.save(); c.translate(W / 2, H / 2); c.scale(k, k); c.translate(-W / 2, -H / 2);
        A.panel(c, W / 2 - 380, 90, 760, 560);
        A.text(c, PM.t('levelComplete'), W / 2, 140, { size: 56, title: true, color: '#ffd06a', stroke: OUT, lw: 10, shadow: 'rgba(255,140,40,0.8)' });
        for (let i = 0; i < 3; i++) {
          const shown = i < this.starShown, on = r.stars[i];
          const sk = shown ? PM.ease.outElastic(Math.min(1, (this.modeT - 0.3 - i * 0.4) * 2)) : 0;
          const x = W / 2 + (i - 1) * 120, y = 250 - (i === 1 ? 18 : 0);
          A.star(c, x, y, 46, false);
          if (shown && on) { A.glow(c, x, y, 80, 'rgba(255,210,60,0.5)'); c.save(); c.translate(x, y); c.scale(sk, sk); A.star(c, 0, 0, 46, true); c.restore(); }
        }
        const labels = [PM.t('starFinish'), PM.t('starSlices'), PM.t('starNoHit')];
        labels.forEach((s, i) => {
          const y = 340 + i * 40;
          A.text(c, (r.stars[i] ? '✔ ' : '✘ ') + s, W / 2 - 300, y, { size: 24, align: 'left', color: r.stars[i] ? '#b8f08a' : '#c8a0a0', maxW: 340 });
        });
        A.slice(c, W / 2 + 110, 340, 1, -0.3); A.text(c, r.slices + ' / ' + r.total, W / 2 + 140, 342, { size: 28, align: 'left', color: '#fff3dc' });
        A.coin(c, W / 2 + 110, 382, 12, this.t); A.text(c, '' + r.coins, W / 2 + 140, 384, { size: 28, align: 'left', color: '#fff3dc' });
        A.text(c, '⏱', W / 2 + 110, 424, { size: 24 }); A.text(c, PM.fmtTime(r.time), W / 2 + 140, 424, { size: 28, align: 'left', color: '#fff3dc' });
        A.hero(c, W / 2 + 300, 520, { t: this.t, state: 'jump', face: -1, sy: 1 + Math.sin(this.t * 8) * 0.05 });
        c.restore();
        g.drawParticles(c);
        if (k >= 0.99) this.drawButtons(c);
      } else if (this.mode === 'over') {
        c.fillStyle = 'rgba(18,5,11,0.7)'; c.fillRect(0, 0, W, H);
        const k = PM.ease.outBack(Math.min(1, this.modeT * 2.5));
        c.save(); c.translate(W / 2, 260); c.scale(k, k);
        A.text(c, PM.t('gameOver'), 0, 0, { size: 72, title: true, color: '#ff8a6a', stroke: OUT, lw: 12, shadow: 'rgba(255,60,40,0.7)' });
        for (let i = 0; i < 3; i++) A.heart(c, -60 + i * 60, 80, 2, false);
        c.restore();
        this.drawButtons(c);
      }
    }
  }

  /* ====================== victory ====================== */
  class Victory extends Screen {
    constructor() {
      super();
      PM.audio.play('map');
      this.conf = [];
      this.add({ x: W / 2 - 150, y: 600, w: 300, h: 66, text: 'map', primary: true, onClick: () => PM.go(() => new MapScreen(7)) });
      this.focus = 0;
    }
    update(dt) {
      this.t += dt;
      if (Math.random() < 0.7) this.conf.push({ x: Math.random() * W, y: -20, vx: PM.rand(-40, 40), vy: PM.rand(80, 200), r: Math.random() * 6, vr: PM.rand(-6, 6), c: ['#ffd23a', '#ff5ad0', '#5ad0ff', '#7aff6a', '#ff7a2a'][Math.floor(Math.random() * 5)] });
      for (const f of this.conf) { f.x += f.vx * dt; f.y += f.vy * dt; f.r += f.vr * dt; }
      this.conf = this.conf.filter(f => f.y < H + 20);
      if (PM.input.hit('back')) { PM.go(() => new MapScreen(7)); return; }
      this.navButtons(dt);
    }
    draw(c) {
      const t = this.t;
      drawMenuScene(c, t);
      c.fillStyle = 'rgba(18,5,11,0.35)'; c.fillRect(0, 0, W, H);
      A.logo(c, W / 2, 120, 0.7, t);
      A.text(c, PM.t('victoryTitle'), W / 2, 270, { size: 54, title: true, color: '#ffd06a', stroke: OUT, lw: 10, shadow: 'rgba(255,140,40,0.8)', maxW: 1100 });
      A.text(c, PM.t('victoryText'), W / 2, 330, { size: 28, color: '#fff3dc', stroke: OUT, lw: 6, maxW: 1100 });
      A.text(c, PM.t('thanks'), W / 2, 372, { size: 28, color: '#ffe3c0', stroke: OUT, lw: 6 });
      A.slice(c, W / 2 - 120, 440, 1.3, -0.3); A.text(c, '× ' + PM.save.totalSlices(), W / 2 - 92, 443, { size: 32, align: 'left', color: '#fff3dc', stroke: OUT, lw: 5 });
      A.star(c, W / 2 + 60, 440, 20, true); A.text(c, '× ' + PM.save.totalStars() + ' / 24', W / 2 + 88, 443, { size: 32, align: 'left', color: '#fff3dc', stroke: OUT, lw: 5 });
      const hop = Math.abs(Math.sin(t * 5)) * 30;
      A.hero(c, W * 0.24, 600 - hop, { t, state: hop > 5 ? 'jump' : 'idle', face: 1 });
      A.trophy(c, W * 0.76, 600, t);
      for (const f of this.conf) { c.save(); c.translate(f.x, f.y); c.rotate(f.r); c.fillStyle = f.c; c.fillRect(-5, -2.5, 10, 5); c.restore(); }
      this.drawButtons(c);
    }
  }

  /* ====================== main loop ====================== */
  PM.setScreen = s => { screen = s; };
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
    W = PM.W;
    PM.beginFrame();
    const c = PM.ctx;
    if (trans) {
      PM.input.pressed = {}; PM.input.click = null; PM.input.anyPressed = false; PM.input.virtPressed = {};
      trans.t += dt;
      if (trans.phase === 'out' && trans.t >= 0.32) { screen = trans.make(); trans.phase = 'in'; trans.t = 0; trans.cx = W / 2; trans.cy = H / 2; }
      else if (trans.phase === 'in' && trans.t >= 0.32) trans = null;
    }
    try {
      if (screen) { if (!trans || trans.phase === 'in') screen.update(dt); screen.draw(c); }
    } catch (e) { console.error(e); }
    if (trans) drawTransition(c, trans.phase === 'out' ? PM.ease.inOut(trans.t / 0.32) : 1 - PM.ease.inOut(trans.t / 0.32), trans.cx, trans.cy);
    PM.endFrame();
    PM.input.endFrame();
    requestAnimationFrame(frame);
  }

  /* ====================== boot ====================== */
  PM.save.load();
  PM.setLang(PM.save.data.lang);
  const fontsReady = (document.fonts && document.fonts.load)
    ? Promise.race([Promise.all([document.fonts.load('40px "Lilita One"'), document.fonts.load('800 20px "Baloo 2"', 'ěščřžýáíéůú')]), new Promise(r => setTimeout(r, 2500))]).catch(() => {})
    : Promise.resolve();
  let booted = false;
  function boot() {
    if (booted) return; booted = true;
    screen = new Splash();
    requestAnimationFrame(frame);
  }
  // simple loading screen while assets/fonts load
  (function loading() {
    if (booted) return;
    PM.beginFrame();
    const c = PM.ctx; c.fillStyle = '#1a0710'; c.fillRect(0, 0, W, H);
    A.slice(c, W / 2, H / 2, 2, performance.now() / 300);
    PM.endFrame();
    requestAnimationFrame(loading);
  })();
  fontsReady.then(() => PM.loadAssets(boot));
  // debug hooks
  PM.debug = { start: i => { trans = null; screen = new Play(i); return screen; }, map: () => { screen = new MapScreen(); }, menu: () => { screen = new Menu(); }, get screen() { return screen; }, unlockAll: () => { PM.save.data.unlocked = 8; PM.save.write(); } };
})();
